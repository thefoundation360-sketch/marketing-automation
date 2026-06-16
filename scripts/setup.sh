#!/usr/bin/env bash
# DreamMatch — One-command setup script
# Usage: bash scripts/setup.sh

set -e

ORANGE='\033[0;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${ORANGE}${BOLD}🔥 DreamMatch Setup Script${NC}"
echo -e "${ORANGE}================================${NC}"
echo ""

# ── 1. Check prerequisites ────────────────────────────────────────────────────

echo -e "${BOLD}Checking prerequisites...${NC}"

check_cmd() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}✗ $1 not found. Please install it first.${NC}"
    echo "  $2"
    exit 1
  fi
  echo -e "${GREEN}✓ $1${NC}"
}

check_cmd node "https://nodejs.org"
check_cmd npm "https://nodejs.org"
check_cmd git "https://git-scm.com"

# Check for supabase CLI (optional)
if command -v supabase &>/dev/null; then
  echo -e "${GREEN}✓ supabase CLI${NC}"
  HAS_SUPABASE=true
else
  echo -e "${ORANGE}⚠ supabase CLI not found (optional for local dev)${NC}"
  echo "  Install: npm install -g supabase"
  HAS_SUPABASE=false
fi

echo ""

# ── 2. Install dependencies ───────────────────────────────────────────────────

echo -e "${BOLD}Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# ── 3. Environment setup ──────────────────────────────────────────────────────

echo -e "${BOLD}Setting up environment...${NC}"

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "${GREEN}✓ Created .env from .env.example${NC}"
  echo -e "${ORANGE}  → Edit .env with your credentials before continuing${NC}"
else
  echo -e "${GREEN}✓ .env already exists${NC}"
fi

echo ""

# ── 4. Supabase setup ─────────────────────────────────────────────────────────

echo -e "${BOLD}Supabase setup...${NC}"

if [ "$HAS_SUPABASE" = true ]; then
  read -p "Do you want to start a local Supabase instance? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting local Supabase..."
    supabase start
    echo ""
    echo -e "${GREEN}✓ Supabase running locally${NC}"
    echo ""
    echo "Local Supabase URLs:"
    supabase status | grep -E "API|Studio|Anon key"
    echo ""
    read -p "Apply database migrations? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      supabase db push
      echo -e "${GREEN}✓ Migrations applied${NC}"
    fi
    read -p "Seed with sample data? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      supabase db seed
      echo -e "${GREEN}✓ Seed data inserted${NC}"
    fi
  fi
else
  echo "Manual Supabase setup required:"
  echo "  1. Create project at https://supabase.com"
  echo "  2. Run supabase/migrations/001_initial_schema.sql in the SQL editor"
  echo "  3. Optionally run supabase/seed.sql for sample data"
  echo "  4. Copy your URL + anon key to .env"
fi

echo ""

# ── 5. Stripe setup ───────────────────────────────────────────────────────────

echo -e "${BOLD}Stripe configuration...${NC}"
echo "You need to create Stripe products manually:"
echo ""
echo "  1. Go to https://dashboard.stripe.com/products"
echo "  2. Create these products:"
echo ""
echo "     ${BOLD}Premium${NC}"
echo "     - Monthly: \$9.99/month  → copy price ID to VITE_STRIPE_PREMIUM_MONTHLY"
echo "     - Annual:  \$59.99/year  → copy price ID to VITE_STRIPE_PREMIUM_ANNUAL"
echo ""
echo "     ${BOLD}Elite${NC}"
echo "     - Monthly: \$24.99/month → copy price ID to VITE_STRIPE_ELITE_MONTHLY"
echo "     - Annual:  \$199.99/year → copy price ID to VITE_STRIPE_ELITE_ANNUAL"
echo ""
echo "     ${BOLD}Business${NC}"
echo "     - Monthly: \$99/month    → copy price ID to VITE_STRIPE_BUSINESS_MONTHLY"
echo ""
echo "  3. Set up webhook at https://dashboard.stripe.com/webhooks"
echo "     Endpoint: https://your-project.supabase.co/functions/v1/stripe-webhook"
echo "     Events: customer.subscription.*, checkout.session.completed, invoice.payment_failed"
echo ""

# ── 6. Build ──────────────────────────────────────────────────────────────────

echo -e "${BOLD}Build test...${NC}"
if npm run build &>/dev/null; then
  echo -e "${GREEN}✓ Build successful${NC}"
  rm -rf dist
else
  echo -e "${RED}✗ Build failed — check your .env values${NC}"
  exit 1
fi

echo ""

# ── 7. Next steps ─────────────────────────────────────────────────────────────

echo -e "${ORANGE}${BOLD}🎉 Setup complete!${NC}"
echo ""
echo -e "${BOLD}Next steps:${NC}"
echo ""
echo "  1. Edit .env with your real credentials"
echo "  2. Run: npm run dev"
echo "  3. Deploy to Vercel:"
echo "     - Push to GitHub"
echo "     - Import at https://vercel.com/new"
echo "     - Add all .env variables in Vercel settings"
echo "     - Deploy!"
echo ""
echo "  4. Deploy Supabase Edge Functions:"
echo "     supabase functions deploy create-checkout-session"
echo "     supabase functions deploy create-portal-session"
echo "     supabase functions deploy stripe-webhook"
echo ""
echo "  5. Set Edge Function secrets in Supabase dashboard:"
echo "     STRIPE_SECRET_KEY=sk_live_..."
echo "     STRIPE_WEBHOOK_SECRET=whsec_..."
echo ""
echo -e "${ORANGE}Docs: https://supabase.com/docs | https://stripe.com/docs${NC}"
echo ""
