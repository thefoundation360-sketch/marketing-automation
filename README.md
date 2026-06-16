# 🔥 DreamMatch

> **Find your people. Chase your dreams.**

A full-stack bucket list matching app connecting people based on shared life goals.

## Quick Start

```bash
npm install
cp .env.example .env   # fill in credentials
npm run dev            # http://localhost:5173
```

## Setup

See full instructions: `bash scripts/setup.sh`

### 1. Supabase
1. Create project at [supabase.com](https://supabase.com)
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL Editor
3. Optionally run `supabase/seed.sql` for sample data
4. Copy Project URL + anon key to `.env`

### 2. Stripe
Create products in the Stripe dashboard and copy price IDs to `.env`:
- Premium: $9.99/mo, $59.99/yr
- Elite: $24.99/mo, $199.99/yr
- Business: $99/mo

Set up webhook at `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_failed`

### 3. Edge Functions
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase functions deploy create-checkout-session
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook
```

### 4. Deploy to Vercel
1. Push to GitHub
2. Import at [vercel.com/new](https://vercel.com/new)
3. Add all `VITE_` env vars from your `.env`
4. Deploy!

### Make yourself admin
```sql
UPDATE profiles SET is_admin = true WHERE id = 'YOUR_USER_ID';
```
Then access the admin dashboard at `/admin`.

## Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite + Framer Motion
- **Backend**: Supabase (Auth, PostgreSQL, Realtime, Storage, Edge Functions)
- **Payments**: Stripe Checkout + Billing Portal
- **Push Notifications**: OneSignal
- **Hosting**: Vercel

## Tiers
| | Free | Premium ($9.99/mo) | Elite ($24.99/mo) | Business ($99/mo) |
|---|---|---|---|---|
| Swipes/day | 5 | ∞ | ∞ | ∞ |
| Goals | 3 | ∞ | ∞ | ∞ |
| Messages/day | 10 | ∞ | ∞ | ∞ |
| See who liked you | ✗ | ✓ | ✓ | ✓ |
| Goal coaching | ✗ | ✗ | ✓ | ✓ |
| Brand profile | ✗ | ✗ | ✗ | ✓ |