"""
Sends generated (status='draft') newsletters to their respective clients via Resend.
Runs after ContentAgent. Updates newsletter status and client's last_newsletter_at.
"""
import json
import resend
from agents.base_agent import BaseAgent


class DeliveryAgent(BaseAgent):

    def execute(self) -> dict:
        resend.api_key = self.config.resend_api_key
        newsletters = self.db.get_unsent_newsletters()
        self.log("info", f"Sending {len(newsletters)} newsletters")

        results = {"sent": 0, "failed": 0}
        for newsletter in newsletters:
            client = self._get_client(newsletter["client_id"])
            if not client or client["status"] != "active":
                self.log("info", f"Skipping newsletter for inactive/missing client {newsletter['client_id']}")
                continue

            success = self._send_newsletter(newsletter, client)
            if success:
                results["sent"] += 1
            else:
                results["failed"] += 1

        return results

    def _get_client(self, client_id: str) -> dict | None:
        with self.db._conn() as conn:
            row = conn.execute("SELECT * FROM clients WHERE id=?", (client_id,)).fetchone()
        return dict(row) if row else None

    def _send_newsletter(self, newsletter: dict, client: dict) -> bool:
        try:
            params = resend.Emails.SendParams(
                from_=f"{self.config.business_name} <{self.config.from_email}>",
                to=[client["email"]],
                subject=newsletter["subject"],
                html=newsletter["content_html"],
                text=newsletter.get("content_text", ""),
                tags=[
                    {"name": "type", "value": "newsletter"},
                    {"name": "client_id", "value": client["id"]},
                ],
            )
            r = resend.Emails.send(params)
            resend_id = r.get("id", "") if isinstance(r, dict) else getattr(r, "id", "")
            self.db.mark_newsletter_delivered(newsletter["id"], resend_id)
            self.db.mark_newsletter_sent(client["id"])
            self.log("info", f"Sent newsletter to {client['email']} (resend_id={resend_id})")
            return True
        except Exception as e:
            self.db.mark_newsletter_failed(newsletter["id"], str(e))
            self.log("error", f"Failed to send to {client['email']}: {e}")
            return False
