import sqlite3
import json
import uuid
from datetime import datetime
from contextlib import contextmanager
from typing import Optional


SCHEMA = """
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    business_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    niche TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    preferences TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now')),
    last_newsletter_at TEXT
);

CREATE TABLE IF NOT EXISTS prospects (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    owner_name TEXT,
    email TEXT UNIQUE,
    website TEXT,
    niche TEXT NOT NULL,
    city TEXT,
    stage TEXT DEFAULT 'new',
    score INTEGER DEFAULT 0,
    outreach_count INTEGER DEFAULT 0,
    last_outreach_at TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS newsletters (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES clients(id),
    subject TEXT NOT NULL,
    content_html TEXT NOT NULL,
    content_text TEXT,
    sent_at TEXT,
    resend_message_id TEXT,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS outreach_emails (
    id TEXT PRIMARY KEY,
    prospect_id TEXT REFERENCES prospects(id),
    step INTEGER DEFAULT 1,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    sent_at TEXT,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    agent TEXT NOT NULL,
    status TEXT DEFAULT 'running',
    result TEXT,
    error TEXT,
    started_at TEXT DEFAULT (datetime('now')),
    finished_at TEXT
);

CREATE TABLE IF NOT EXISTS system_logs (
    id TEXT PRIMARY KEY,
    agent TEXT NOT NULL,
    level TEXT DEFAULT 'info',
    message TEXT NOT NULL,
    data TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
"""


class Database:
    def __init__(self, path: str):
        self.path = path
        self._init()

    def _init(self):
        with self._conn() as conn:
            conn.executescript(SCHEMA)

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def new_id(self) -> str:
        return str(uuid.uuid4())

    # --- Clients ---

    def create_client(self, name: str, business_name: str, email: str,
                      niche: str, preferences: dict) -> str:
        cid = self.new_id()
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO clients (id, name, business_name, email, niche, preferences) VALUES (?,?,?,?,?,?)",
                (cid, name, business_name, email, niche, json.dumps(preferences))
            )
        return cid

    def get_active_clients(self) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM clients WHERE status = 'active'"
            ).fetchall()
        return [dict(r) for r in rows]

    def get_client_by_email(self, email: str) -> Optional[dict]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM clients WHERE email = ?", (email,)
            ).fetchone()
        return dict(row) if row else None

    def update_client_stripe(self, client_id: str, customer_id: str, subscription_id: str):
        with self._conn() as conn:
            conn.execute(
                "UPDATE clients SET stripe_customer_id=?, stripe_subscription_id=?, status='active' WHERE id=?",
                (customer_id, subscription_id, client_id)
            )

    def update_client_status(self, client_id: str, status: str):
        with self._conn() as conn:
            conn.execute("UPDATE clients SET status=? WHERE id=?", (status, client_id))

    def mark_newsletter_sent(self, client_id: str):
        with self._conn() as conn:
            conn.execute(
                "UPDATE clients SET last_newsletter_at=datetime('now') WHERE id=?",
                (client_id,)
            )

    # --- Prospects ---

    def create_prospect(self, business_name: str, email: Optional[str],
                        owner_name: Optional[str], website: Optional[str],
                        niche: str, city: str, score: int, notes: str = "") -> str:
        pid = self.new_id()
        with self._conn() as conn:
            conn.execute(
                """INSERT OR IGNORE INTO prospects
                   (id, business_name, email, owner_name, website, niche, city, score, notes)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (pid, business_name, email, owner_name, website, niche, city, score, notes)
            )
        return pid

    def get_prospects_for_outreach(self, limit: int = 20) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                """SELECT * FROM prospects
                   WHERE stage = 'new' AND email IS NOT NULL AND score >= 60
                   ORDER BY score DESC LIMIT ?""",
                (limit,)
            ).fetchall()
        return [dict(r) for r in rows]

    def get_prospects_for_followup(self) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                """SELECT * FROM prospects
                   WHERE stage = 'contacted' AND outreach_count < 3
                   AND (last_outreach_at IS NULL OR
                        datetime(last_outreach_at) < datetime('now', '-3 days'))""",
            ).fetchall()
        return [dict(r) for r in rows]

    def update_prospect_stage(self, prospect_id: str, stage: str):
        with self._conn() as conn:
            conn.execute(
                "UPDATE prospects SET stage=? WHERE id=?", (stage, prospect_id)
            )

    def mark_prospect_contacted(self, prospect_id: str):
        with self._conn() as conn:
            conn.execute(
                """UPDATE prospects SET
                   stage='contacted', outreach_count=outreach_count+1,
                   last_outreach_at=datetime('now')
                   WHERE id=?""",
                (prospect_id,)
            )

    def get_prospect_count_by_stage(self) -> dict:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT stage, COUNT(*) as n FROM prospects GROUP BY stage"
            ).fetchall()
        return {r["stage"]: r["n"] for r in rows}

    # --- Newsletters ---

    def create_newsletter(self, client_id: str, subject: str,
                          content_html: str, content_text: str) -> str:
        nid = self.new_id()
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO newsletters (id, client_id, subject, content_html, content_text) VALUES (?,?,?,?,?)",
                (nid, client_id, subject, content_html, content_text)
            )
        return nid

    def mark_newsletter_delivered(self, newsletter_id: str, resend_id: str):
        with self._conn() as conn:
            conn.execute(
                "UPDATE newsletters SET status='sent', sent_at=datetime('now'), resend_message_id=? WHERE id=?",
                (resend_id, newsletter_id)
            )

    def mark_newsletter_failed(self, newsletter_id: str, error: str):
        with self._conn() as conn:
            conn.execute(
                "UPDATE newsletters SET status='failed' WHERE id=?",
                (newsletter_id,)
            )

    def get_unsent_newsletters(self) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM newsletters WHERE status = 'draft'"
            ).fetchall()
        return [dict(r) for r in rows]

    def get_newsletter_stats(self) -> dict:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT COUNT(*) as total, SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as sent FROM newsletters"
            ).fetchone()
        return dict(row) if row else {}

    # --- Outreach emails ---

    def create_outreach_email(self, prospect_id: str, step: int,
                              subject: str, content: str) -> str:
        eid = self.new_id()
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO outreach_emails (id, prospect_id, step, subject, content) VALUES (?,?,?,?,?)",
                (eid, prospect_id, step, subject, content)
            )
        return eid

    def mark_outreach_sent(self, email_id: str):
        with self._conn() as conn:
            conn.execute(
                "UPDATE outreach_emails SET status='sent', sent_at=datetime('now') WHERE id=?",
                (email_id,)
            )

    # --- Agent runs ---

    def start_run(self, agent: str) -> str:
        rid = self.new_id()
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO agent_runs (id, agent) VALUES (?,?)", (rid, agent)
            )
        return rid

    def finish_run(self, run_id: str, result: dict):
        with self._conn() as conn:
            conn.execute(
                "UPDATE agent_runs SET status='success', result=?, finished_at=datetime('now') WHERE id=?",
                (json.dumps(result), run_id)
            )

    def fail_run(self, run_id: str, error: str):
        with self._conn() as conn:
            conn.execute(
                "UPDATE agent_runs SET status='failed', error=?, finished_at=datetime('now') WHERE id=?",
                (error, run_id)
            )

    def get_last_run(self, agent: str) -> Optional[dict]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM agent_runs WHERE agent=? ORDER BY started_at DESC LIMIT 1",
                (agent,)
            ).fetchone()
        return dict(row) if row else None

    def get_run_stats(self) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                """SELECT agent, status, COUNT(*) as n, MAX(finished_at) as last_run
                   FROM agent_runs GROUP BY agent, status"""
            ).fetchall()
        return [dict(r) for r in rows]

    # --- Logs ---

    def log(self, agent: str, level: str, message: str, data: dict = None):
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO system_logs (id, agent, level, message, data) VALUES (?,?,?,?,?)",
                (self.new_id(), agent, level, message, json.dumps(data or {}))
            )

    def get_recent_errors(self, hours: int = 24) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                """SELECT * FROM system_logs WHERE level='error'
                   AND datetime(created_at) > datetime('now', ? || ' hours')
                   ORDER BY created_at DESC""",
                (f"-{hours}",)
            ).fetchall()
        return [dict(r) for r in rows]
