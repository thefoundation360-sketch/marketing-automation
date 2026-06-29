# Sync Master CRM — Foundation Mecca

Business CRM and client management system for the **Sync Master** sync-music
coaching business, under the **Foundation Mecca** brand.

## Tech stack

| Concern   | Tool                                  |
| --------- | ------------------------------------- |
| Framework | Next.js 14 (App Router) + TypeScript  |
| Styling   | Tailwind CSS                          |
| Database  | Supabase (Postgres)                   |
| Auth      | Supabase Auth / NextAuth secret       |
| Email     | Resend                                |
| SMS       | Twilio                                |
| Payments  | Stripe                                |
| Hosting   | Railway                               |

## Project structure

```
app/                     Next.js App Router (layout, landing page, globals)
lib/supabase/            Browser + server Supabase client helpers
lib/types/database.ts    TypeScript types mirroring the DB schema
supabase/migrations/     SQL schema migrations
railway.json             Railway deploy configuration
nixpacks.toml            Railway/Nixpacks build configuration
.env.example             Environment variable template
```

## Database schema

Five tables defined in `supabase/migrations/0001_init.sql`:

- **leads** — `id, name, email, phone, instagram_handle, interest_tag
  (beat_pack / studio / roadmap), pipeline_stage, notes, created_at, updated_at`
- **clients** — `id, lead_id, program_enrolled (chapter_1..4 / bundle),
  payment_status, start_date, current_module, modules_unlocked,
  next_unlock_date, created_at`
- **sequences** — `id, lead_id, sequence_type, day_number, status
  (pending / sent / failed), scheduled_at, sent_at`
- **bookings** — `id, client_id, session_type, session_date, format
  (remote / in_person), deposit_paid, confirmed, reminder_sent_48hr,
  reminder_sent_2hr, completed, upsell_sent`
- **messages** — `id, recipient_id, type (email / sms), subject, body, status,
  sent_at`

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local   # then fill in the values

# 3. Apply the database schema
#    Supabase CLI:
supabase db push
#    …or paste supabase/migrations/0001_init.sql into the Supabase SQL editor.

# 4. Run the dev server
npm run dev
```

## Environment variables

See `.env.example`. Required keys: Supabase URL + anon key (+ service role),
Resend API key, Twilio SID / auth token / phone number, Stripe secret +
webhook secret, and a NextAuth secret.

## Deployment (Railway)

`railway.json` and `nixpacks.toml` configure the build (`npm ci && npm run
build`) and start (`npm run start`) commands. Set every variable from
`.env.example` in the Railway project's **Variables** tab before deploying.

---

> Status: project scaffold and database schema only. Application features are
> not yet implemented.
