"""
Handles new client intake: creates client record, sends Stripe payment link,
captures preferences via a structured welcome email with simple reply instructions.
Triggered manually (CLI) or via webhook when a prospect marks themselves as interested.
"""
import stripe
import resend
from agents.base_agent import BaseAgent

WELCOME_TEMPLATE = """Hi {name},

Welcome to {business_name}! I'm excited to start sending you weekly newsletters for {client_business}.

To complete setup, please subscribe here:
{payment_link}

Once you're subscribed, I'll need a few quick details to personalize your newsletters.
Just reply to this email with answers to these 5 questions:

1. What's the main goal of your newsletter? (e.g., retain existing clients, attract new ones, position as an expert)
2. Who are your ideal clients/customers? (age range, interests, why they choose you)
3. Any topics you NEVER want in your newsletter? (politics, competitors, etc.)
4. Your brand tone: Friendly & casual / Professional & formal / Motivational & energetic
5. Any upcoming events, promotions, or news to include in the first issue?

That's it! Your first newsletter goes out next Monday.

Best,
{sender_name}
{business_name}
"""

ONBOARDING_SYSTEM = """You extract structured onboarding information from a client's reply email.
Return JSON with: goal, target_audience, avoid_topics, tone, upcoming_news.
If a field is not mentioned, use a sensible default."""


class OnboardingAgent(BaseAgent):

    def execute(self) -> dict:
        # This agent is primarily called via CLI with explicit args, not on a cron
        return {"status": "ready", "message": "Use onboard_client() directly"}

    def onboard_client(self, name: str, business_name: str, email: str,
                       niche: str = None) -> dict:
        """
        Creates a pending client and sends payment link + onboarding email.
        Call this when a prospect replies positively.
        """
        stripe.api_key = self.config.stripe_secret_key
        resend.api_key = self.config.resend_api_key
        niche = niche or self.config.target_niche

        # Create Stripe customer
        customer = stripe.Customer.create(
            name=name,
            email=email,
            metadata={"business_name": business_name, "niche": niche},
        )

        # Create payment link for subscription
        payment_link = stripe.PaymentLink.create(
            line_items=[{"price": self.config.stripe_price_id, "quantity": 1}],
            after_completion={"type": "hosted_confirmation",
                              "hosted_confirmation": {"custom_message": f"Welcome to {self.config.business_name}! Check your email for next steps."}},
            metadata={"customer_id": customer.id, "client_email": email},
        )

        # Create pending client record
        default_prefs = {
            "goal": "retain clients",
            "target_audience": f"clients of a {niche} business",
            "avoid_topics": "politics, religion",
            "tone": "friendly and professional",
            "upcoming_news": "",
        }
        client_id = self.db.create_client(name, business_name, email, niche, default_prefs)

        # Send welcome email with payment link
        body = WELCOME_TEMPLATE.format(
            name=name,
            business_name=self.config.business_name,
            client_business=business_name,
            payment_link=payment_link.url,
            sender_name=self.config.outreach_from_name,
        )

        params = resend.Emails.SendParams(
            from_=f"{self.config.business_name} <{self.config.from_email}>",
            to=[email],
            subject=f"Welcome to {self.config.business_name} — Complete Your Setup",
            text=body,
        )
        resend.Emails.send(params)

        # Mark prospect as converted if they were in the system
        existing = self.db.get_prospect_count_by_stage()
        self.log("info", f"Onboarded {name} at {business_name} ({email})")

        return {
            "client_id": client_id,
            "stripe_customer_id": customer.id,
            "payment_link": payment_link.url,
        }

    def update_preferences_from_reply(self, client_id: str, reply_text: str) -> dict:
        """Parse a client's onboarding reply and update their preferences."""
        import json
        raw = self.call_haiku(
            ONBOARDING_SYSTEM,
            f"Extract preferences from this reply:\n\n{reply_text}",
            max_tokens=400,
        )
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0 and end > start:
            prefs = json.loads(raw[start:end])
            with self.db._conn() as conn:
                conn.execute(
                    "UPDATE clients SET preferences=? WHERE id=?",
                    (json.dumps(prefs), client_id)
                )
            self.log("info", f"Updated preferences for client {client_id}")
            return prefs
        return {}
