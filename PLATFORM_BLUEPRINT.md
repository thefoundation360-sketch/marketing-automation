# Vyral — Platform Blueprint
### A superior alternative to goVyro / Vyro, built for independent creators

---

## 1. goVyro Research Summary

**What goVyro (Vyro) actually is:**
Vyro is a video clipping platform co-created with MrBeast. Clippers (users) earn money by cutting short-form highlight clips from long-form creator content. Revenue comes from platform ad sales, split between the platform and individual clippers based on views generated.

**What works about Vyro:**
- Simple onboarding for clippers — no technical skills needed
- Passive income concept is compelling (clip once, earn while views accumulate)
- Association with MrBeast drives massive initial user acquisition
- Short-form video is the highest-engagement content format in 2025

**Identified Gaps (5 critical):**

| # | Gap | Why it limits creators |
|---|-----|------------------------|
| 1 | **Ad-share only revenue** | Earnings depend on platform ad rates you don't control. A 30% CPM dip cuts your income by 30%. |
| 2 | **Video clipping only** | Musicians, designers, photographers, educators — completely excluded from the platform. |
| 3 | **Content gatekeeper** | You can only clip content MrBeast (or approved creators) uploads. Your creativity is capped by someone else's output schedule. |
| 4 | **No distribution tools** | No scheduler, no cross-posting. Clippers must manually share to every platform. |
| 5 | **Zero catalog ownership** | Your clips live on Vyro's infrastructure. No export, no migration path, no direct fan relationship. |

---

## 2. Platform Design: Vyral

**Core proposition:** Upload any digital asset → organize it → schedule it to social → sell it directly. Keep 80%.

### Feature Set

#### Phase 1 — MVP (Built in this repo)
- [x] Multi-format content upload (audio, video, image, template, preset, ebook)
- [x] Content library with status management (draft → published → archived)
- [x] Marketplace for content discovery and purchase
- [x] Stripe Connect direct payment (creator gets 80%, platform gets 20%)
- [x] Cross-platform post scheduler (UI + cron dispatch endpoint)
- [x] AI metadata generation (title, description, tags via Claude Haiku)
- [x] Supabase Auth (email/password, expandable to OAuth)
- [x] Row-level security (creators only see/edit their own content)
- [x] Creator dashboard with revenue/download analytics

#### Phase 2 — Growth (Post-MVP)
- [ ] OAuth for social platforms (Instagram, TikTok, YouTube, Twitter/X)
- [ ] Real social API posting (Meta Graph, TikTok Content API, YouTube Data API v3)
- [ ] Subscription tiers for buyers (monthly access pass)
- [ ] Affiliate/referral system (creator refers buyer → creator earns 10% of first purchase)
- [ ] Content preview player (in-browser audio/video preview before purchase)
- [ ] Bulk upload + CSV tag import
- [ ] Creator public profile pages (`/c/username`)
- [ ] Download portal (buyers access all their purchases)
- [ ] Automated payout scheduling (Stripe payouts on the 1st and 15th)
- [ ] Content bundles (sell 10 tracks as a pack at a discount)

#### Phase 3 — Scale
- [ ] White-label option (creators sell from their own domain)
- [ ] API for third-party integrations
- [ ] Agency accounts (manage multiple creator profiles)
- [ ] AI clip generation from long-form video (closing the Vyro gap with AI)

---

## 3. Technology Stack

### Chosen Stack

| Layer | Tool | Why | Cost |
|-------|------|-----|------|
| **Framework** | Next.js 14 (App Router) | SSR + API routes in one project. Vercel-native. No separate backend. | Free |
| **Database** | Supabase (PostgreSQL) | Auth + DB + Storage + RLS in one service. 500MB free tier. | $0 → $25/mo |
| **File Storage** | Supabase Storage | Native with Supabase. 1GB free. For scale, swap to Cloudflare R2. | $0 → $0.015/GB |
| **Payments** | Stripe Connect Express | Only credible option for marketplace payouts. PCI handled. | 2.9% + 30¢ per transaction |
| **AI** | Claude Haiku (Anthropic) | Cheapest fast inference for metadata generation. $0.00025/1K tokens. | Pay-per-use |
| **Deployment** | Vercel | Zero-config Next.js. Free hobby tier. Built-in cron jobs. | $0 → $20/mo |
| **Scheduling** | Vercel Cron + `/api/schedule/dispatch` | Runs every 5 min. No external queue needed at MVP scale. | Included in Vercel Pro |

### Why Not No-Code (Bubble, FlutterFlow, WeWeb)?

| Concern | No-code reality |
|---------|----------------|
| Stripe Connect marketplace | Bubble can't do complex connected account flows cleanly |
| File upload to custom storage | Limited, usually requires external plugins |
| Custom RLS / auth logic | Opaque, hard to debug |
| Cost at scale | Bubble: $119/mo minimum for production |
| Code you can own | No — locked to platform |

**Verdict:** Next.js + Supabase gives 90% of no-code speed with 100% ownership and zero platform lock-in.

### Hosting Cost Projections

| Stage | Vercel | Supabase | Stripe fees | Anthropic | Total |
|-------|--------|----------|-------------|-----------|-------|
| Pre-launch (dev) | $0 | $0 | $0 | ~$1 | **~$1/mo** |
| 0–100 creators | $0 | $0 | 2.9%+30¢ per sale | ~$5 | **~$5/mo + fees** |
| 100–500 creators | $20 (Pro) | $25 (Pro) | 2.9%+30¢ per sale | ~$20 | **~$65/mo + fees** |
| 500+ creators | $20 | $25 | negotiable | ~$50 | **~$95/mo + fees** |

At $65/mo overhead and 20% platform fee: you break even at **~$325/mo in GMV**. That's 33 sales of a $10 product.

---

## 4. Agent Integration

### Current: Built-in AI (Claude Haiku)
- **Endpoint:** `POST /api/content/generate-metadata`
- **What it does:** Given filename + content type, returns description, tags, suggested price
- **Cost:** ~$0.001 per generation (Haiku pricing)

### Phase 2: Social Posting Automation
The `/api/schedule/dispatch` route already has the correct structure. Platform implementations needed:

| Platform | API | Auth flow | Key endpoint |
|----------|-----|-----------|-------------|
| Instagram | Meta Graph API v21 | OAuth 2.0 → long-lived token | `POST /me/media` → `POST /me/media_publish` |
| TikTok | TikTok Content Posting API | OAuth 2.0 PKCE | `POST /v2/post/publish/video/init` |
| YouTube | YouTube Data API v3 | Google OAuth 2.0 | `PUT /upload/youtube/v3/videos` |
| Twitter/X | Twitter API v2 | OAuth 2.0 | `POST /2/tweets` |

### Recommended Open-Source Agents for Phase 2
- **n8n** (self-hosted on Railway, ~$5/mo): Drag-and-drop workflow for social OAuth token refresh
- **Trigger.dev**: TypeScript-native background jobs with retries — cleaner than cron for posting
- **Bull (Redis queue)**: If posting volume exceeds what cron can handle, add a Redis job queue

---

## 5. Revenue Model — Technical Implementation

### How a Sale Works (Step-by-Step)

```
Buyer clicks "Purchase" on /marketplace/[id]
    ↓
POST /api/payments/checkout
    ↓
Stripe Checkout Session created with:
  - application_fee_amount = 20% of price
  - transfer_data.destination = creator's Stripe Express account
    ↓
Buyer completes payment on Stripe-hosted page
    ↓
Stripe fires payment_intent.succeeded webhook
    ↓
POST /api/webhooks/stripe receives event
    ↓
Supabase:
  - INSERT transaction record
  - UPDATE content.download_count++
  - UPDATE content.revenue_total_cents += 80% of price
  - UPDATE profiles.payout_pending_cents += 80% of price
    ↓
Buyer receives download link (secure signed URL from Supabase Storage)
```

### Creator Payout Flow
1. Creator connects Stripe Express account at `/settings` (Stripe onboarding link)
2. Stripe automatically transfers 80% to creator's bank on each sale (via `transfer_data`)
3. No manual payout needed — Stripe handles it
4. Creator sees pending → paid history in dashboard

### Platform Fee Collection
- Stripe `application_fee_amount` deposits the 20% directly to your Stripe platform account
- No reconciliation needed — automatic per-transaction

---

## 6. Setup Instructions (Start Today)

### Step 1: Supabase Setup (~15 min)
```bash
# 1. Create project at supabase.com (free tier)
# 2. Copy Project URL and anon key to .env.local
# 3. Run schema:
# Supabase Dashboard → SQL Editor → paste contents of supabase/schema.sql → Run
```

### Step 2: Stripe Setup (~20 min)
```bash
# 1. Create Stripe account at stripe.com
# 2. Enable Stripe Connect (Dashboard → Connect → Get started)
# 3. Set Express as connected account type
# 4. Copy Secret key and Publishable key to .env.local
# 5. Set webhook endpoint: stripe.com/webhooks → Add endpoint
#    URL: https://your-app.vercel.app/api/webhooks/stripe
#    Events: payment_intent.succeeded
# 6. Copy webhook signing secret to .env.local
```

### Step 3: Anthropic API (~5 min)
```bash
# 1. console.anthropic.com → API keys → Create key
# 2. Add to .env.local as ANTHROPIC_API_KEY
```

### Step 4: Local Development
```bash
cd platform
cp .env.example .env.local
# Fill in all values
npm run dev
# App runs at http://localhost:3000
```

### Step 5: Deploy to Vercel (~10 min)
```bash
# 1. Push this repo to GitHub
# 2. vercel.com → Import project → Select repo
# 3. Add all env vars from .env.local in Vercel project settings
# 4. Deploy
# 5. Update NEXT_PUBLIC_APP_URL to your Vercel URL
# 6. Update Stripe webhook URL to https://your-app.vercel.app/api/webhooks/stripe
```

### Step 6: Enable Vercel Cron (scheduling)
```bash
# vercel.json is already configured for cron every 5 min
# Requires Vercel Pro ($20/mo) for cron jobs
# Free alternative: use an external cron service (cron-job.org)
#   → POST https://your-app.vercel.app/api/schedule/dispatch
#   → Header: Authorization: Bearer YOUR_CRON_SECRET
```

---

## 7. Project File Structure

```
platform/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/
│   │   │   └── layout.tsx              # Sidebar + auth guard
│   │   ├── dashboard/page.tsx          # Creator overview
│   │   ├── content/
│   │   │   ├── page.tsx                # Content library table
│   │   │   └── upload/page.tsx         # 3-step upload wizard
│   │   ├── schedule/page.tsx           # Scheduler UI
│   │   ├── marketplace/page.tsx        # Public marketplace
│   │   └── api/
│   │       ├── content/generate-metadata/route.ts  # Claude Haiku
│   │       ├── payments/checkout/route.ts           # Stripe Checkout
│   │       ├── schedule/dispatch/route.ts           # Cron dispatcher
│   │       └── webhooks/stripe/route.ts             # Payment webhook
│   ├── components/
│   │   ├── ui/                         # button, card, badge, input
│   │   └── layout/                     # sidebar, stat-card
│   ├── lib/
│   │   ├── supabase/                   # client, server, middleware
│   │   ├── stripe.ts                   # Stripe helpers + fee calc
│   │   └── utils.ts                    # cn(), formatCents(), etc.
│   ├── types/index.ts                  # Full TypeScript definitions
│   └── middleware.ts                   # Auth redirect middleware
├── supabase/
│   └── schema.sql                      # Complete DB schema with RLS
├── vercel.json                         # Cron job config
└── .env.example                        # All required env vars
```

---

## 8. MVP Launch Timeline

| Week | Milestone |
|------|-----------|
| **Week 1** | Supabase + Stripe + Vercel setup. Schema deployed. Auth working. |
| **Week 2** | Upload flow, content library, marketplace live. First test purchase end-to-end. |
| **Week 3** | Scheduler UI live. Social OAuth for 1-2 platforms (Instagram + TikTok first). |
| **Week 4** | Polish, bug fixes, landing page live. Invite first 5–10 beta creators. |
| **Month 2** | YouTube + Twitter social posting. Analytics page. Payout dashboard. |
| **Month 3** | 50+ creators, public launch. |

**Estimated time to working MVP: 2–3 weeks** for a developer working part-time.

---

## 9. Pre-Built Components to Accelerate Development

| Need | Source |
|------|--------|
| More UI components | shadcn/ui (`npx shadcn@latest add [component]`) |
| Charts for analytics | Recharts (`npm install recharts`) |
| File upload with progress | Uppy.io (drop-in, works with Supabase) |
| Date/calendar picker | React Day Picker |
| Social OAuth flows | NextAuth.js (add as providers) |
| Background jobs (Phase 2) | Trigger.dev or Inngest |
| Email (welcome, receipts) | Resend + react-email |

---

*Blueprint generated: 2025-06-25 | Platform: Vyral | Stack: Next.js + Supabase + Stripe + Claude*
