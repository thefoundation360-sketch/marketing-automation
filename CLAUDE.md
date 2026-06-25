# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a **multi-branch monorepo**: each feature branch contains a fully self-contained project. The `main` branch holds only this documentation. All real code lives on named `claude/` branches.

| Branch | Project | Stack |
|---|---|---|
| `claude/bucket-list-app-complete-jjt6l4` | DreamMatch (SaaS matching app) | React 18, TypeScript, Vite, Supabase, Stripe |
| `claude/friendly-ptolemy-oPMpI` | NicheWire (autonomous newsletter service) | Python, Claude API, Resend, Stripe, SQLite |
| `claude/credit-report-disputes-imw1os` | Credit Dispute Letter Generator | Python, ReportLab |
| `claude/backcountry-brotherhood-posts-fp817a` | Facebook Content Generator | Python, HTML/JS |
| `claude/fit-tape-ep-marketing-60qcf0` | Fit Tape EP Marketing Campaign | Markdown strategy docs |
| `claude/automation-sales-6-day-093vwp` | B2B Automation Sales Playbook | Markdown docs, HTML CRM |

Always confirm which branch you're on before modifying files. Work on a project by checking out its branch directly.

---

## Project: DreamMatch (Bucket List Matching App)

**Branch:** `claude/bucket-list-app-complete-jjt6l4`

### Commands

```bash
npm install          # install dependencies
npm run dev          # start Vite dev server
npm run build        # tsc && vite build (runs type-check first)
npm run lint         # ESLint — zero warnings allowed (--max-warnings 0)
npm run preview      # preview production build locally
```

No test framework is configured; lint and TypeScript compilation serve as correctness gates.

### Architecture

**Frontend-only SaaS** — all backend logic runs in Supabase (PostgreSQL + RLS policies + Edge Functions) and Stripe. There is no custom server.

```
src/
├── App.tsx               # root router (react-router-dom v6)
├── context/AuthContext   # Supabase session → React context
├── store/useAppStore.ts  # Zustand global state
├── pages/
│   ├── app/              # authenticated app pages (BucketList, Discover, Matches, Conversation…)
│   ├── auth/             # AuthPage, OnboardingPage, ResetPasswordPage
│   └── static/           # LandingPage, PricingPage, TermsPage, PrivacyPage
├── components/
│   ├── shared/           # Layout, Modal, Badge, Avatar, LoadingSkeleton, EmptyState
│   ├── bucketlist/       # goal-specific modals
│   └── matching/         # ProfileCard, MatchPercentBadge
├── lib/
│   ├── supabase.ts       # typed Supabase client
│   ├── stripe.ts         # Stripe.js loader
│   ├── notifications.ts  # react-hot-toast wrappers
│   └── pdfExport.ts      # goal export utility
└── types/                # shared TypeScript interfaces
```

**Database:** `supabase/migrations/001_initial_schema.sql` defines all tables (profiles, goals, matches, messages). Row-level security is enforced at the DB layer — never bypass it by using the service key on the client side.

**Payments:** Stripe webhooks are handled by a Supabase Edge Function (`supabase/functions/`). Stripe price IDs are referenced only via `VITE_STRIPE_*` env vars.

**State flow:** Supabase auth session → `AuthContext` → Zustand store → page components. Avoid lifting server state into Zustand; prefer fetching directly from Supabase in page components.

### Environment Variables

Copy `.env.example` to `.env.local`. Required at minimum for local dev:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_STRIPE_PUBLIC_KEY
```

### CI/CD

- `.github/workflows/deploy.yml` — production deploy to Vercel on push to `main`
- `.github/workflows/preview.yml` — preview deploys for PRs

---

## Project: NicheWire (Autonomous Newsletter Service)

**Branch:** `claude/friendly-ptolemy-oPMpI`

### Commands

```bash
pip install -r requirements.txt      # install Python dependencies

# CLI entry points (all via main.py)
python main.py prospect              # scrape Yelp & score new business prospects
python main.py outreach              # send cold email sequences via Resend
python main.py generate-newsletters  # generate newsletter content using Claude API
python main.py deliver               # deliver newsletters to active clients
python main.py onboard               # handle new client onboarding
python main.py monitor               # run health checks & send alerts

python webhook_server.py             # local Stripe webhook server (deploy to Railway)
```

### Architecture

**Fully autonomous multi-agent system** that runs on a schedule via GitHub Actions. No human intervention is needed after setup.

```
agents/
├── base_agent.py          # shared Claude client, structured logging
├── prospecting_agent.py   # Yelp scraping + lead scoring (saves to SQLite)
├── outreach_agent.py      # multi-step cold email sequences
├── content_agent.py       # newsletter generation via Claude Sonnet
├── delivery_agent.py      # email delivery via Resend API
├── onboarding_agent.py    # Stripe checkout + client record creation
├── billing_agent.py       # Stripe webhook event processing
└── monitoring_agent.py    # health checks, alert emails to owner
core/
├── config.py              # loads all env vars; single source of truth for config
└── database.py            # SQLite wrapper (tables: clients, prospects, newsletters, outreach_log)
main.py                    # Click CLI — one command per agent
webhook_server.py          # FastAPI app for Stripe webhooks (hosted on Railway)
```

**Execution schedule (GitHub Actions):**
- Daily 8 AM UTC — `prospect` + `outreach`
- Monday 6 AM UTC — `generate-newsletters` + `deliver`
- Every 6 hours — `monitor`

**All secrets are GitHub Actions Secrets** — see `.env.example` for the full list (`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, etc.).

**State persistence:** `state.db` (SQLite) is committed to the repo as base64. The agents read/write this file; Railway and GitHub Actions both access it via the checked-out repo. Avoid introducing a separate DB — the SQLite-in-git pattern is intentional for zero-infrastructure operation.

**Content generation:** `content_agent.py` calls the Claude API (claude-sonnet model). Prompts are constructed from client niche + prospect data stored in SQLite. Adjust prompts in the agent file, not in `config.py`.

---

## Project: Credit Dispute Letter Generator

**Branch:** `claude/credit-report-disputes-imw1os`

### Commands

```bash
./run.sh                                          # interactive launcher (recommended)
python credit_repair/generate_letters.py          # PDF letter generator (interactive CLI)
python credit_repair/cfpb_filer.py                # CFPB complaint automation
python credit_repair/score_tracker.py             # credit score tracker
```

### Architecture

Standalone Python CLI tool. No external APIs or databases.

- `dispute_letters/` — Markdown templates for Equifax, Experian, TransUnion, CFPB, and debt validation
- `credit_repair/generate_letters.py` — uses `questionary` for interactive prompts + `ReportLab` to produce PDFs into `generated_letters/`
- `run.sh` — shell menu wrapping the Python scripts

---

## Project: Backcountry Brotherhood Content Generator

**Branch:** `claude/backcountry-brotherhood-posts-fp817a`

### Commands

```bash
python generate_posts.py    # regenerate the 30-day content calendar (CSV + JSON output)
# Then open index.html in a browser to use the operations hub UI
```

### Architecture

- `generate_posts.py` — outputs `backcountry_brotherhood_30_days.csv` and `.json`
- `index.html` — master hub linking to sub-tools
- `affiliate-manager.html` — manage affiliate links for gear mentioned in posts
- `content-calendar.html` — visual calendar viewer
- Target audience: Baby Boomer men (60–75) interested in hunting/fishing

---

## Project: Fit Tape EP Marketing

**Branch:** `claude/fit-tape-ep-marketing-60qcf0`

Documentation-only project. All files are Markdown in `fit-tape-campaign/`. Edit the markdown files directly — no build step.

---

## Project: Automation Sales Playbook

**Branch:** `claude/automation-sales-6-day-093vwp`

Documentation-only project with one interactive HTML tool.

- Markdown files contain the sales scripts, market research, and 6-day closing plan
- `crm-dashboard.html` — open directly in a browser; client-side only, no server needed
