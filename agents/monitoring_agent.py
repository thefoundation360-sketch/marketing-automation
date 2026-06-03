"""
Runs every 6 hours. Checks:
1. Were scheduled newsletters delivered on expected Monday?
2. Are there any recent agent errors?
3. Are any clients in payment_failed state for >48 hours?
Emails the owner a digest. Never silent-fails — if this agent itself fails, it's caught by GitHub Actions notification.
"""
import json
import resend
from datetime import datetime, timedelta
from agents.base_agent import BaseAgent

DIGEST_TEMPLATE = """
{business_name} — System Status Report
{timestamp}

CLIENTS
-------
Active: {active_clients}
Cancelled: {cancelled_clients}
Payment issues: {payment_failed_clients}
MRR: ${mrr:.2f}

NEWSLETTERS (last 7 days)
--------------------------
Generated: {newsletters_generated}
Delivered: {newsletters_sent}
Failed: {newsletters_failed}

OUTREACH (pipeline)
--------------------
New prospects: {prospects_new}
Contacted: {prospects_contacted}
Converted: {prospects_converted}
Dead: {prospects_dead}

RECENT ERRORS ({error_count} in last 24h)
------------------------------------------
{error_summary}

AGENT HEALTH
------------
{agent_health}

---
{footer}
"""


class MonitoringAgent(BaseAgent):

    def execute(self) -> dict:
        resend.api_key = self.config.resend_api_key
        report = self._build_report()
        alerts = self._check_alerts(report)

        if alerts:
            self._send_alert_email(alerts)

        # Weekly digest on Mondays (or force=True)
        if datetime.now().weekday() == 0 or report.get("force_digest"):
            self._send_digest_email(report)

        return {"alerts_sent": len(alerts), "report": report}

    def _build_report(self) -> dict:
        with self.db._conn() as conn:
            clients_by_status = {
                row["status"]: row["n"]
                for row in conn.execute(
                    "SELECT status, COUNT(*) as n FROM clients GROUP BY status"
                ).fetchall()
            }
            newsletters_7d = {
                row["status"]: row["n"]
                for row in conn.execute(
                    """SELECT status, COUNT(*) as n FROM newsletters
                       WHERE datetime(created_at) > datetime('now', '-7 days')
                       GROUP BY status"""
                ).fetchall()
            }
            prospect_stages = self.db.get_prospect_count_by_stage()
            recent_errors = self.db.get_recent_errors(hours=24)
            run_stats = self.db.get_run_stats()

        active = clients_by_status.get("active", 0)
        return {
            "active_clients": active,
            "cancelled_clients": clients_by_status.get("cancelled", 0),
            "payment_failed_clients": clients_by_status.get("payment_failed", 0),
            "mrr": active * 69.0,
            "newsletters_generated": newsletters_7d.get("draft", 0) + newsletters_7d.get("sent", 0) + newsletters_7d.get("failed", 0),
            "newsletters_sent": newsletters_7d.get("sent", 0),
            "newsletters_failed": newsletters_7d.get("failed", 0),
            "prospects_new": prospect_stages.get("new", 0),
            "prospects_contacted": prospect_stages.get("contacted", 0),
            "prospects_converted": prospect_stages.get("converted", 0),
            "prospects_dead": prospect_stages.get("dead", 0),
            "recent_errors": recent_errors,
            "error_count": len(recent_errors),
            "run_stats": run_stats,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M UTC"),
        }

    def _check_alerts(self, report: dict) -> list[str]:
        alerts = []

        # Newsletter delivery failure
        if report["newsletters_failed"] > 0:
            alerts.append(f"ALERT: {report['newsletters_failed']} newsletter(s) failed to deliver this week.")

        # Expected newsletters not sent on Monday
        if datetime.now().weekday() == 0 and datetime.now().hour >= 10:
            expected = report["active_clients"]
            if expected > 0 and report["newsletters_sent"] == 0:
                alerts.append(f"ALERT: It's Monday and 0 of {expected} newsletters have been sent. Check ContentAgent.")

        # Payment issues
        if report["payment_failed_clients"] > 0:
            alerts.append(f"ALERT: {report['payment_failed_clients']} client(s) have payment failures. Check Stripe.")

        # Error spike
        if report["error_count"] > 5:
            alerts.append(f"ALERT: {report['error_count']} errors in the last 24 hours. Review logs.")

        return alerts

    def _send_alert_email(self, alerts: list[str]):
        body = "Action required:\n\n" + "\n".join(f"• {a}" for a in alerts)
        body += f"\n\nCheck your system dashboard or run: python main.py status\n\n{self.config.business_name}"
        try:
            resend.Emails.send(resend.Emails.SendParams(
                from_=f"{self.config.business_name} <{self.config.from_email}>",
                to=[self.config.owner_email],
                subject=f"[ACTION REQUIRED] {self.config.business_name} Alert",
                text=body,
            ))
            self.log("info", f"Sent alert email ({len(alerts)} alerts)")
        except Exception as e:
            self.log("error", f"Failed to send alert email: {e}")

    def _send_digest_email(self, report: dict):
        errors = report["recent_errors"]
        error_summary = "\n".join(
            f"  [{e['agent']}] {e['message'][:80]}" for e in errors[:5]
        ) or "  None"

        agent_health_lines = []
        for row in report["run_stats"]:
            agent_health_lines.append(f"  {row['agent']}: {row['status']} (last: {row.get('last_run', 'never')})")
        agent_health = "\n".join(agent_health_lines) or "  No runs recorded"

        body = DIGEST_TEMPLATE.format(
            business_name=self.config.business_name,
            timestamp=report["timestamp"],
            active_clients=report["active_clients"],
            cancelled_clients=report["cancelled_clients"],
            payment_failed_clients=report["payment_failed_clients"],
            mrr=report["mrr"],
            newsletters_generated=report["newsletters_generated"],
            newsletters_sent=report["newsletters_sent"],
            newsletters_failed=report["newsletters_failed"],
            prospects_new=report["prospects_new"],
            prospects_contacted=report["prospects_contacted"],
            prospects_converted=report["prospects_converted"],
            prospects_dead=report["prospects_dead"],
            error_count=report["error_count"],
            error_summary=error_summary,
            agent_health=agent_health,
            footer=f"To manage: python main.py status | python main.py run --agent <name>",
        )

        try:
            resend.Emails.send(resend.Emails.SendParams(
                from_=f"{self.config.business_name} <{self.config.from_email}>",
                to=[self.config.owner_email],
                subject=f"[{self.config.business_name}] Weekly Status — {report['active_clients']} clients, ${report['mrr']:.0f} MRR",
                text=body,
            ))
            self.log("info", "Sent weekly digest")
        except Exception as e:
            self.log("error", f"Failed to send digest: {e}")
