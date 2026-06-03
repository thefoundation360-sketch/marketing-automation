import os
from dataclasses import dataclass, field
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Config:
    anthropic_api_key: str
    resend_api_key: str
    from_email: str
    outreach_from_email: str
    outreach_from_name: str
    stripe_secret_key: str
    stripe_webhook_secret: str
    stripe_price_id: str
    business_name: str
    owner_email: str
    target_niche: str
    target_city: str
    target_state: str
    newsletter_subject_prefix: str
    max_outreach_per_day: int
    prospect_score_threshold: int
    database_path: str

    @classmethod
    def from_env(cls) -> "Config":
        return cls(
            anthropic_api_key=os.environ["ANTHROPIC_API_KEY"],
            resend_api_key=os.environ["RESEND_API_KEY"],
            from_email=os.environ.get("FROM_EMAIL", "newsletters@example.com"),
            outreach_from_email=os.environ.get("OUTREACH_FROM_EMAIL", "hello@outreach.example.com"),
            outreach_from_name=os.environ.get("OUTREACH_FROM_NAME", "Alex"),
            stripe_secret_key=os.environ.get("STRIPE_SECRET_KEY", ""),
            stripe_webhook_secret=os.environ.get("STRIPE_WEBHOOK_SECRET", ""),
            stripe_price_id=os.environ.get("STRIPE_PRICE_ID", ""),
            business_name=os.environ.get("BUSINESS_NAME", "NicheWire"),
            owner_email=os.environ["OWNER_EMAIL"],
            target_niche=os.environ.get("TARGET_NICHE", "independent fitness studios"),
            target_city=os.environ.get("TARGET_CITY", "Austin"),
            target_state=os.environ.get("TARGET_STATE", "TX"),
            newsletter_subject_prefix=os.environ.get("NEWSLETTER_SUBJECT_PREFIX", "[NicheWire]"),
            max_outreach_per_day=int(os.environ.get("MAX_OUTREACH_PER_DAY", "20")),
            prospect_score_threshold=int(os.environ.get("PROSPECT_SCORE_THRESHOLD", "60")),
            database_path=os.environ.get("DATABASE_PATH", "./state.db"),
        )
