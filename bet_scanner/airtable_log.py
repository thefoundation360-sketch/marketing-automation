#!/usr/bin/env python3
"""Airtable bet log: creates the table, logs alerts, settles results, computes profit.

What runs automatically on every scan (once Airtable is configured):
  1. New alerts are added as rows.
  2. Open rows get "Latest Price" updated until tip-off (the closing price, roughly).
  3. Finished games are settled Win/Loss from Polymarket's own resolution.
  4. "Paper Profit" (if you had bet the suggested stake) and "Profit" (what you actually
     bet) are filled in.

The only thing you ever type in Airtable: tick "Placed?" and enter "Stake Placed"
(and "Price Got" if it differs from the alert price) when you actually bet.

One-time setup:
    python airtable_log.py --setup     # creates the "Bets" table with every field
"""

import argparse
import json
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

API = "https://api.airtable.com/v0"
GAMMA_BASE = "https://gamma-api.polymarket.com"

SPORT_LABELS = {
    "basketball_nba": "NBA",
    "americanfootball_nfl": "NFL",
    "icehockey_nhl": "NHL",
    "basketball_ncaab": "NCAAB",
    "americanfootball_ncaaf": "NCAAF",
    "baseball_mlb": "MLB",
}

# Wait this long after the scheduled start before checking whether a market resolved.
SETTLE_AFTER = timedelta(hours=3)


def table_fields(tz_name):
    """Airtable field definitions for the Bets table. First field is the primary field."""
    pct = {"type": "percent", "options": {"precision": 1}}
    money = {"type": "currency", "options": {"precision": 2, "symbol": "$"}}
    when = {
        "type": "dateTime",
        "options": {
            "dateFormat": {"name": "us"},
            "timeFormat": {"name": "12hour"},
            "timeZone": tz_name,
        },
    }
    return [
        {"name": "Pick", "type": "singleLineText"},
        {"name": "Game", "type": "singleLineText"},
        {"name": "Sport", "type": "singleSelect",
         "options": {"choices": [{"name": n} for n in SPORT_LABELS.values()]}},
        {"name": "Start", **when},
        {"name": "Found At", **when},
        {"name": "Alert Price", **pct},
        {"name": "Max Price", **pct},
        {"name": "Fair Prob", **pct},
        {"name": "Edge", **pct},
        {"name": "Books Used", "type": "number", "options": {"precision": 0}},
        {"name": "Suggested Stake", **money},
        {"name": "Latest Price", **pct},
        {"name": "Placed?", "type": "checkbox", "options": {"icon": "check", "color": "greenBright"}},
        {"name": "Stake Placed", **money},
        {"name": "Price Got", **pct},
        {"name": "Result", "type": "singleSelect",
         "options": {"choices": [{"name": "Win"}, {"name": "Loss"}, {"name": "Void"}]}},
        {"name": "Paper Profit", **money},
        {"name": "Profit", **money},
        {"name": "Market Key", "type": "singleLineText"},
        {"name": "Polymarket Link", "type": "url"},
    ]


class AirtableError(RuntimeError):
    pass


class Airtable:
    def __init__(self, token, base_id, table_name="Bets", session=None):
        if not token or not base_id:
            raise AirtableError("Airtable token and base_id are required in config.json.")
        self.base_id = base_id
        self.table = table_name
        self.http = session or requests.Session()
        self.headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    def _req(self, method, url, **kw):
        for attempt in range(4):
            resp = self.http.request(method, url, headers=self.headers, timeout=30, **kw)
            if resp.status_code == 429:  # Airtable allows 5 requests/second per base
                time.sleep(1 + attempt)
                continue
            if resp.status_code == 401:
                raise AirtableError("Airtable rejected the token. Re-check airtable.token.")
            if resp.status_code == 403:
                raise AirtableError(
                    "Airtable token lacks access. It needs scopes data.records:read, "
                    "data.records:write, schema.bases:read, schema.bases:write AND access to this base."
                )
            if resp.status_code == 404:
                raise AirtableError("Airtable base not found. Re-check airtable.base_id (starts with 'app').")
            if resp.status_code >= 400:
                raise AirtableError(f"Airtable error {resp.status_code}: {resp.text[:300]}")
            return resp.json()
        raise AirtableError("Airtable kept rate-limiting; try again in a minute.")

    # ----- schema -----
    def ensure_table(self, tz_name="America/Chicago"):
        """Create the table if it's missing, and add any missing fields. Returns a summary string."""
        meta = self._req("GET", f"{API}/meta/bases/{self.base_id}/tables")
        existing = next((t for t in meta.get("tables", []) if t["name"] == self.table), None)
        wanted = table_fields(tz_name)
        if existing is None:
            self._req("POST", f"{API}/meta/bases/{self.base_id}/tables",
                      json={"name": self.table, "fields": wanted})
            return f"Created table '{self.table}' with {len(wanted)} fields."
        have = {f["name"] for f in existing.get("fields", [])}
        added = []
        for field in wanted:
            if field["name"] not in have:
                self._req("POST", f"{API}/meta/bases/{self.base_id}/tables/{existing['id']}/fields",
                          json=field)
                added.append(field["name"])
        if added:
            return f"Table '{self.table}' existed; added fields: {', '.join(added)}."
        return f"Table '{self.table}' already set up."

    # ----- records -----
    @property
    def _records_url(self):
        return f"{API}/{self.base_id}/{requests.utils.quote(self.table)}"

    def create(self, fields):
        return self._req("POST", self._records_url, json={"records": [{"fields": fields}], "typecast": True})

    def update_many(self, updates):
        """updates: list of (record_id, fields). Sent in batches of 10 (Airtable's limit)."""
        for i in range(0, len(updates), 10):
            chunk = [{"id": rid, "fields": f} for rid, f in updates[i:i + 10]]
            self._req("PATCH", self._records_url, json={"records": chunk, "typecast": True})

    def list_open(self):
        """Rows with no Result yet."""
        out, offset = [], None
        while True:
            params = {"filterByFormula": "NOT({Result})", "pageSize": 100}
            if offset:
                params["offset"] = offset
            data = self._req("GET", self._records_url, params=params)
            out.extend(data.get("records", []))
            offset = data.get("offset")
            if not offset:
                return out

    def list_needing_profit(self):
        """Settled rows where the user has entered a stake but Profit is still empty."""
        out, offset = [], None
        formula = "AND({Result}, {Stake Placed}, {Profit}=BLANK())"
        while True:
            params = {"filterByFormula": formula, "pageSize": 100}
            if offset:
                params["offset"] = offset
            data = self._req("GET", self._records_url, params=params)
            out.extend(data.get("records", []))
            offset = data.get("offset")
            if not offset:
                return out


# ---------- pure helpers (tested offline) ----------

def opp_to_fields(opp, found_at):
    return {
        "Pick": opp["pick"],
        "Game": opp["game"],
        "Sport": SPORT_LABELS.get(opp["sport"], opp["sport"]),
        "Start": opp["start"].astimezone(timezone.utc).isoformat(),
        "Found At": found_at.astimezone(timezone.utc).isoformat(),
        "Alert Price": opp["poly_price"],
        "Max Price": opp["max_price"],
        "Fair Prob": opp["fair_prob"],
        "Edge": opp["edge"],
        "Books Used": opp["books_used"],
        "Suggested Stake": opp["stake"],
        "Latest Price": opp["poly_price"],
        "Market Key": opp["key"],
        "Polymarket Link": f"https://polymarket.com/event/{opp['slug']}" if opp.get("slug") else None,
    }


def profit(stake, price, result):
    """Profit on a prediction-market bet: shares = stake / price, each pays $1 on a win."""
    if not stake or result not in ("Win", "Loss", "Void"):
        return None
    if result == "Void":
        return 0.0
    if result == "Loss":
        return round(-float(stake), 2)
    if not price or not 0 < float(price) < 1:
        return None
    return round(float(stake) * (1 / float(price) - 1), 2)


def resolution_from_market(market, outcome_index):
    """Return 'Win'/'Loss' once Polymarket has resolved the market, else None."""
    if not market or not market.get("closed"):
        return None
    prices = market.get("outcomePrices")
    if isinstance(prices, str):
        try:
            prices = json.loads(prices)
        except ValueError:
            return None
    try:
        values = [float(p) for p in prices]
    except (TypeError, ValueError):
        return None
    if len(values) != 2 or outcome_index not in (0, 1):
        return None
    if values[outcome_index] >= 0.99:
        return "Win"
    if values[outcome_index] <= 0.01:
        return "Loss"
    if abs(values[0] - 0.5) < 0.01 and abs(values[1] - 0.5) < 0.01:
        return "Void"  # Polymarket resolves cancelled games 50/50
    return None


def _parse_dt(value):
    if not value:
        return None
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def plan_open_updates(records, price_lookup, market_fetcher, now=None):
    """Decide updates for open rows. Returns list of (record_id, fields).

    price_lookup: {market_key: current buy price} from this scan.
    market_fetcher: function(market_id) -> Gamma market dict (or None), used to settle.
    """
    now = now or datetime.now(timezone.utc)
    updates = []
    for rec in records:
        f = rec.get("fields", {})
        key = f.get("Market Key") or ""
        start = _parse_dt(f.get("Start"))
        if not key or ":" not in key or not start:
            continue
        market_id, idx = key.rsplit(":", 1)
        if start > now:
            price = price_lookup.get(key)
            if price is not None and price != f.get("Latest Price"):
                updates.append((rec["id"], {"Latest Price": price}))
            continue
        if now - start < SETTLE_AFTER:
            continue
        result = resolution_from_market(market_fetcher(market_id), int(idx))
        if not result:
            continue
        fields = {"Result": result,
                  "Paper Profit": profit(f.get("Suggested Stake"), f.get("Alert Price"), result)}
        if f.get("Stake Placed"):
            fields["Profit"] = profit(f["Stake Placed"], f.get("Price Got") or f.get("Alert Price"), result)
        updates.append((rec["id"], {k: v for k, v in fields.items() if v is not None}))
    return updates


def plan_profit_updates(records):
    """For rows settled before the user typed in their stake."""
    updates = []
    for rec in records:
        f = rec.get("fields", {})
        p = profit(f.get("Stake Placed"), f.get("Price Got") or f.get("Alert Price"), f.get("Result"))
        if p is not None:
            updates.append((rec["id"], {"Profit": p}))
    return updates


def fetch_gamma_market(market_id, session=None):
    http = session or requests
    try:
        resp = http.get(f"{GAMMA_BASE}/markets/{market_id}", timeout=30)
        if resp.status_code != 200:
            return None
        return resp.json()
    except requests.RequestException:
        return None


# ---------- entry points used by scanner.py ----------

def client_from_config(cfg):
    at = cfg.get("airtable") or {}
    if not at.get("token") or not at.get("base_id"):
        return None
    return Airtable(at["token"], at["base_id"], at.get("table_name", "Bets"))


def sync(client, price_lookup):
    """Update open rows, settle finished games, fill profits. Returns a short summary."""
    open_updates = plan_open_updates(client.list_open(), price_lookup, fetch_gamma_market)
    profit_updates = plan_profit_updates(client.list_needing_profit())
    client.update_many(open_updates + profit_updates)
    settled = sum(1 for _, f in open_updates if "Result" in f)
    return f"Airtable: {settled} settled, {len(open_updates) - settled} prices updated, {len(profit_updates)} profits filled"


def main():
    sys.path.insert(0, str(Path(__file__).parent))
    from scanner import load_config  # noqa: E402  (avoid circular import at module load)

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--setup", action="store_true", help="create/repair the Bets table")
    parser.add_argument("--sync", action="store_true", help="settle results and fill profits now")
    args = parser.parse_args()
    cfg = load_config(require_odds_key=False)
    client = client_from_config(cfg)
    if client is None:
        sys.exit("Add airtable.token and airtable.base_id to config.json first (see README.md).")
    try:
        if args.setup or not args.sync:
            print(client.ensure_table(cfg.get("timezone", "America/Chicago")))
        if args.sync:
            print(sync(client, {}))
    except AirtableError as e:
        sys.exit(f"Airtable problem: {e}")


if __name__ == "__main__":
    main()
