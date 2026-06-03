# NicheWire — Autonomous B2B Newsletter Service

Generates and delivers weekly AI-written newsletters for small businesses. Runs on ~$19/month. Makes money autonomously.

## Architecture

```
GitHub Actions (scheduler)
    └── ProspectingAgent   → finds leads via Yelp/web
    └── OutreachAgent      → 3-step cold email sequence
    └── ContentAgent       → weekly newsletter per client (Claude Sonnet)
    └── DeliveryAgent      → sends via Resend
    └── MonitoringAgent    → alerts on failures, weekly digest

Railway (webhook server, $5/mo)
    └── BillingAgent       → handles Stripe events

SQLite (state.db, committed as base64)
    └── clients, prospects, newsletters, outreach, logs
```

## Cost Breakdown

| Service       | Cost    | Notes                          |
|---------------|---------|--------------------------------|
| Anthropic API | ~$12/mo | Haiku for ops, Sonnet for content |
| Resend        | $0      | Free tier: 3,000 emails/month  |
| Railway       | $5/mo   | Stripe webhook endpoint only   |
| Domain        | ~$2/mo  | 2 domains amortized            |
| Stripe        | 2.9%+30¢| Per transaction only           |
| **Total**     | **~$19/mo** |                            |

## Setup (one-time, ~4 hours)

### 1. Register domains & configure email
```
newsletter.yourdomain.com  → for client newsletters (SPF/DKIM/DMARC)
outreach.yourdomain.com    → for cold outreach (separate reputation)
```

### 2. Create accounts
- [Resend](https://resend.com) — verify both domains
- [Stripe](https://stripe.com) — create product at $69/month, get price ID
- [Railway](https://railway.app) — deploy webhook server

### 3. Set GitHub Secrets
Go to Settings → Secrets → Actions and add:

```
ANTHROPIC_API_KEY
RESEND_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID
FROM_EMAIL
OUTREACH_FROM_EMAIL
OUTREACH_FROM_NAME
BUSINESS_NAME
OWNER_EMAIL
TARGET_NICHE          (e.g., "independent fitness studios")
TARGET_CITY           (e.g., "Austin")
TARGET_STATE          (e.g., "TX")
```

### 4. Deploy webhook server to Railway
```bash
# In Railway dashboard: New Project → Deploy from GitHub → select this repo
# Set the same env vars from above in Railway environment settings
# Copy the Railway URL → paste as Stripe webhook endpoint
# Add Stripe webhook events: checkout.session.completed, customer.subscription.deleted,
#   invoice.payment_failed, customer.subscription.updated
```

### 5. Get your first client manually
```bash
python main.py onboard \
  --name "Jane Smith" \
  --business "FitLife Studio" \
  --email jane@fitlifestudio.com
```

This sends Jane a welcome email with her Stripe payment link. When she pays, the BillingAgent activates her. She gets her first newsletter next Monday at 6 AM UTC.

## Daily Usage

**Check status:**
```bash
python main.py status
```

**Preview next newsletter for a client:**
```bash
python main.py preview --client-id <id>
```

**Run an agent manually:**
```bash
python main.py run --agent prospect   # find leads
python main.py run --agent outreach   # send emails
python main.py run --agent content    # generate newsletters
python main.py run --agent delivery   # send newsletters
python main.py run --agent monitor    # check health
python main.py run --agent all        # full pipeline
```

**Add a prospect manually:**
```bash
python main.py add-prospect \
  --name "Crossfit ATX" \
  --email owner@crossfitatx.com \
  --owner "Mike" \
  --score 85
```

## How the Autonomous Loop Works

1. **Monday 6 AM UTC**: GitHub Actions runs `weekly_newsletters.yml`
   - ContentAgent generates 1 newsletter per active client
   - DeliveryAgent sends all drafts via Resend

2. **Daily 8 AM UTC (Mon–Sat)**: GitHub Actions runs `daily_operations.yml`
   - ProspectingAgent finds 10–20 new scored prospects
   - OutreachAgent sends up to 20 cold emails (respects daily limit)

3. **Every 6 hours**: GitHub Actions runs `monitoring.yml`
   - MonitoringAgent checks for failures, payment issues
   - Emails you if anything needs attention

4. **Real-time**: Railway webhook server handles Stripe events
   - Subscription created → client activated
   - Payment failed → you're notified
   - Cancellation → client paused

## Revenue Model

- Price: $69/month per client
- Fixed costs: $19/month
- Break-even: 1 client
- Target month 1: 3–5 clients ($207–$345)
- Target month 3: 10+ clients ($690+)

## What You Actually Need to Do

**Once (setup):** ~4 hours total as detailed above.

**Weekly (~10 minutes):**
- Monday: Skim monitoring digest email
- Wednesday: Approve outreach batch (or set `MAX_OUTREACH_PER_DAY` to auto-approve)
- Friday: Check Stripe dashboard

**When you get an alert email:** Follow the instructions in the alert. Usually takes 5 minutes.

## File Structure

```
├── agents/
│   ├── base_agent.py          # Shared Claude client, logging, run tracking
│   ├── prospecting_agent.py   # Yelp scraping + Claude scoring
│   ├── outreach_agent.py      # 3-step cold email sequences
│   ├── onboarding_agent.py    # Stripe link + welcome email
│   ├── content_agent.py       # Weekly newsletter generation (THE PRODUCT)
│   ├── delivery_agent.py      # Resend email delivery
│   ├── billing_agent.py       # Stripe webhook handler
│   └── monitoring_agent.py    # Health checks + owner alerts
├── core/
│   ├── config.py              # Environment config
│   └── database.py            # SQLite operations
├── .github/workflows/
│   ├── daily_operations.yml   # Prospect + outreach (8 AM daily)
│   ├── weekly_newsletters.yml # Generate + send (Monday 6 AM)
│   └── monitoring.yml         # Health check (every 6h)
├── main.py                    # CLI interface
├── webhook_server.py          # Railway-hosted Stripe endpoint
└── railway.json               # Railway deployment config
```
