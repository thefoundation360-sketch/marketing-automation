"""
Sends personalized cold email sequences to scored prospects.
Step 1 (day 0): Value-forward intro with sample newsletter excerpt
Step 2 (day 4): Light follow-up if no reply
Step 3 (day 9): Final breakup email
Respects MAX_OUTREACH_PER_DAY limit to protect sender reputation.
"""
import resend
from agents.base_agent import BaseAgent

OUTREACH_SYSTEM = """You write concise, human cold emails for a small business owner selling AI newsletter services.
Rules:
- Max 5 sentences. No bullet points.
- Sound like a real person, not a marketer. No "I hope this email finds you well."
- Mention one specific, realistic detail about their business type.
- End with a single soft CTA: either reply to get a free sample, or click a link.
- No subject line in the body. Sign off with the sender's first name only.
"""

FOLLOWUP_SYSTEM = """You write very short (2-3 sentence) follow-up emails. Casual, not pushy.
Reference the previous email briefly. Give them an easy out (it's fine if not interested).
"""

BREAKUP_SYSTEM = """You write a 2-sentence final "breakup" email. Closing the loop.
Warm, no guilt-trip, leaves door open. Mention you'll stop reaching out."""


class OutreachAgent(BaseAgent):

    def execute(self) -> dict:
        resend.api_key = self.config.resend_api_key
        daily_limit = self.config.max_outreach_per_day
        sent_today = 0
        results = {"step1_sent": 0, "step2_sent": 0, "step3_sent": 0, "errors": 0}

        # Step 1: New prospects
        new_prospects = self.db.get_prospects_for_outreach(limit=daily_limit)
        for prospect in new_prospects:
            if sent_today >= daily_limit:
                break
            if self._send_step1(prospect):
                results["step1_sent"] += 1
                sent_today += 1
            else:
                results["errors"] += 1

        # Steps 2 & 3: Follow-ups (only if budget remains)
        remaining = daily_limit - sent_today
        if remaining > 0:
            followups = self.db.get_prospects_for_followup()
            for prospect in followups[:remaining]:
                step = prospect["outreach_count"] + 1
                sent = False
                if step == 2:
                    sent = self._send_step2(prospect)
                    if sent:
                        results["step2_sent"] += 1
                elif step == 3:
                    sent = self._send_step3(prospect)
                    if sent:
                        results["step3_sent"] += 1
                        self.db.update_prospect_stage(prospect["id"], "dead")
                if sent:
                    sent_today += 1
                else:
                    results["errors"] += 1

        return results

    def _send_step1(self, prospect: dict) -> bool:
        niche = self.config.target_niche
        owner = prospect.get("owner_name") or "there"
        biz = prospect["business_name"]

        prompt = f"""Write a cold email to {owner} at {biz}, a {niche} business.
You're offering a done-for-you weekly email newsletter for their clients at $69/month.
Sender name: {self.config.outreach_from_name}
Include offer: free sample newsletter if they reply."""

        try:
            body = self.call_haiku(OUTREACH_SYSTEM, prompt, max_tokens=300)
            subject = self._generate_subject(biz, niche, step=1)
            return self._send_email(prospect, subject, body, step=1)
        except Exception as e:
            self.log("error", f"Step 1 generation failed for {biz}: {e}")
            return False

    def _send_step2(self, prospect: dict) -> bool:
        biz = prospect["business_name"]
        prompt = f"""Write a follow-up to {biz} ({self.config.target_niche}).
They haven't replied to an email about a weekly newsletter service at $69/month.
Keep it very short. Mention you attached/included a sample."""
        try:
            body = self.call_haiku(FOLLOWUP_SYSTEM, prompt, max_tokens=150)
            subject = f"Re: {biz} newsletter"
            return self._send_email(prospect, subject, body, step=2)
        except Exception as e:
            self.log("error", f"Step 2 failed for {biz}: {e}")
            return False

    def _send_step3(self, prospect: dict) -> bool:
        biz = prospect["business_name"]
        prompt = f"""Write a final breakup email to {biz} about the newsletter service. 2 sentences max."""
        try:
            body = self.call_haiku(BREAKUP_SYSTEM, prompt, max_tokens=100)
            subject = f"Closing the loop — {biz}"
            return self._send_email(prospect, subject, body, step=3)
        except Exception as e:
            self.log("error", f"Step 3 failed for {biz}: {e}")
            return False

    def _generate_subject(self, biz_name: str, niche: str, step: int) -> str:
        prompt = f"Write one email subject line (max 8 words) for a cold email to a {niche} business named {biz_name}. No quotes, no explanation."
        try:
            return self.call_haiku("Write only the subject line, nothing else.", prompt, max_tokens=30).strip()
        except Exception:
            return f"Weekly newsletter for {biz_name}?"

    def _send_email(self, prospect: dict, subject: str, body: str, step: int) -> bool:
        if not prospect.get("email"):
            return False
        try:
            email_id = self.db.create_outreach_email(
                prospect["id"], step, subject, body
            )
            params = resend.Emails.SendParams(
                from_=f"{self.config.outreach_from_name} <{self.config.outreach_from_email}>",
                to=[prospect["email"]],
                subject=subject,
                text=body,
            )
            r = resend.Emails.send(params)
            self.db.mark_outreach_sent(email_id)
            self.db.mark_prospect_contacted(prospect["id"])
            self.log("info", f"Sent step {step} to {prospect['email']}")
            return True
        except Exception as e:
            self.log("error", f"Email send failed to {prospect.get('email')}: {e}")
            return False
