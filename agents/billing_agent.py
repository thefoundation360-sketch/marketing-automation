"""
Handles Stripe webhook events:
- checkout.session.completed → activate client
- customer.subscription.deleted → pause client
- invoice.payment_failed → flag client, notify owner
Runs as a webhook endpoint (see webhook_server.py), not on a cron.
"""
import stripe
import json
from agents.base_agent import BaseAgent


class BillingAgent(BaseAgent):

    def execute(self) -> dict:
        return {"status": "webhook-driven", "message": "Call handle_event() from webhook server"}

    def handle_event(self, payload: bytes, sig_header: str) -> dict:
        stripe.api_key = self.config.stripe_secret_key
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, self.config.stripe_webhook_secret
            )
        except stripe.error.SignatureVerificationError as e:
            self.log("error", f"Invalid Stripe signature: {e}")
            raise

        event_type = event["type"]
        self.log("info", f"Stripe event: {event_type}")

        if event_type == "checkout.session.completed":
            self._handle_checkout_completed(event["data"]["object"])
        elif event_type == "customer.subscription.deleted":
            self._handle_subscription_deleted(event["data"]["object"])
        elif event_type == "invoice.payment_failed":
            self._handle_payment_failed(event["data"]["object"])
        elif event_type == "customer.subscription.updated":
            self._handle_subscription_updated(event["data"]["object"])

        return {"handled": event_type}

    def _handle_checkout_completed(self, session: dict):
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")
        client_email = session.get("customer_email") or session.get("customer_details", {}).get("email")

        if not client_email:
            # Try to get from Stripe customer
            try:
                customer = stripe.Customer.retrieve(customer_id)
                client_email = customer.get("email")
            except Exception:
                pass

        if client_email:
            client = self.db.get_client_by_email(client_email)
            if client:
                self.db.update_client_stripe(client["id"], customer_id, subscription_id)
                self.log("info", f"Activated client {client_email} (sub={subscription_id})")
            else:
                self.log("error", f"No client found for email {client_email} from Stripe checkout")
        else:
            self.log("error", f"No email on checkout session {session.get('id')}")

    def _handle_subscription_deleted(self, subscription: dict):
        customer_id = subscription.get("customer")
        with self.db._conn() as conn:
            row = conn.execute(
                "SELECT * FROM clients WHERE stripe_customer_id=?", (customer_id,)
            ).fetchone()
        if row:
            client = dict(row)
            self.db.update_client_status(client["id"], "cancelled")
            self.log("info", f"Cancelled client {client['email']}")
            self._notify_owner_churn(client["email"], client["business_name"])

    def _handle_payment_failed(self, invoice: dict):
        customer_id = invoice.get("customer")
        with self.db._conn() as conn:
            row = conn.execute(
                "SELECT * FROM clients WHERE stripe_customer_id=?", (customer_id,)
            ).fetchone()
        if row:
            client = dict(row)
            self.db.update_client_status(client["id"], "payment_failed")
            self.log("error", f"Payment failed for {client['email']}")
            self._notify_owner_payment_failure(client["email"], client["business_name"])

    def _handle_subscription_updated(self, subscription: dict):
        status = subscription.get("status")
        customer_id = subscription.get("customer")
        with self.db._conn() as conn:
            row = conn.execute(
                "SELECT id FROM clients WHERE stripe_customer_id=?", (customer_id,)
            ).fetchone()
        if row:
            if status == "active":
                self.db.update_client_status(row["id"], "active")
            elif status in ("past_due", "unpaid"):
                self.db.update_client_status(row["id"], "payment_failed")

    def _notify_owner_churn(self, client_email: str, biz_name: str):
        import resend
        resend.api_key = self.config.resend_api_key
        try:
            resend.Emails.send(resend.Emails.SendParams(
                from_=f"{self.config.business_name} <{self.config.from_email}>",
                to=[self.config.owner_email],
                subject=f"[{self.config.business_name}] Client Cancelled: {biz_name}",
                text=f"{biz_name} ({client_email}) just cancelled their subscription.\n\nConsider reaching out to understand why.",
            ))
        except Exception as e:
            self.log("error", f"Owner churn notification failed: {e}")

    def _notify_owner_payment_failure(self, client_email: str, biz_name: str):
        import resend
        resend.api_key = self.config.resend_api_key
        try:
            resend.Emails.send(resend.Emails.SendParams(
                from_=f"{self.config.business_name} <{self.config.from_email}>",
                to=[self.config.owner_email],
                subject=f"[{self.config.business_name}] Payment Failed: {biz_name}",
                text=f"Payment failed for {biz_name} ({client_email}).\n\nStripe will retry automatically. Check Stripe dashboard if this persists.",
            ))
        except Exception as e:
            self.log("error", f"Owner payment failure notification failed: {e}")
