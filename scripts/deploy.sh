#!/usr/bin/env bash
# DreamMatch — Full deployment script
# Deploys to Vercel + Supabase in one shot
# Usage: bash scripts/deploy.sh

set -e

ORANGE='\033[0;33m'; GREEN='\033[0;32m'; RED='\033[0;31m'
BOLD='\033[1m'; NC='\033[0m'
TICK="${GREEN}✓${NC}"; FAIL="${RED}✗${NC}"

echo ""
echo -e "${ORANGE}${BOLD}🔥 DreamMatch — Full Deploy${NC}"
echo -e "${ORANGE}==============================${NC}"
echo ""

# ── Validate .env ─────────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
  echo -e "${RED}No .env file found. Run: cp .env.example .env${NC}"
  exit 1
fi
source .env

check_var() {
  if [ -z "${!1}" ] || [[ "${!1}" == *"..."* ]]; then
    echo -e "${FAIL} Missing env var: $1"
    MISSING=true
  else
    echo -e "${TICK} $1"
  fi
}

echo -e "${BOLD}Checking environment variables...${NC}"
MISSING=false
check_var VITE_SUPABASE_URL
check_var VITE_SUPABASE_ANON_KEY
check_var VITE_STRIPE_PUBLISHABLE_KEY
check_var VITE_STRIPE_PREMIUM_MONTHLY
check_var VITE_APP_URL

if [ "$MISSING" = true ]; then
  echo ""
  echo -e "${RED}Please fill in all required values in .env${NC}"
  exit 1
fi
echo ""

# ── Build ─────────────────────────────────────────────────────────────────────
echo -e "${BOLD}Building app...${NC}"
export VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY VITE_STRIPE_PUBLISHABLE_KEY
export VITE_STRIPE_PREMIUM_MONTHLY VITE_STRIPE_PREMIUM_ANNUAL
export VITE_STRIPE_ELITE_MONTHLY VITE_STRIPE_ELITE_ANNUAL
export VITE_STRIPE_BUSINESS_MONTHLY VITE_ONESIGNAL_APP_ID VITE_APP_URL
npm run build
echo -e "${TICK} Build successful"
echo ""

# ── Supabase Migrations ───────────────────────────────────────────────────────
echo -e "${BOLD}Deploying Supabase...${NC}"

if [ -z "$SUPABASE_PROJECT_REF" ]; then
  echo -e "${ORANGE}  SUPABASE_PROJECT_REF not set in .env — skipping migrations${NC}"
  echo "  To deploy: supabase link --project-ref YOUR_PROJECT_REF && supabase db push"
else
  echo "  Linking Supabase project..."
  supabase link --project-ref "$SUPABASE_PROJECT_REF"

  echo "  Running migrations..."
  supabase db push --password "$SUPABASE_DB_PASSWORD"
  echo -e "${TICK} Migrations applied"

  echo "  Deploying Edge Functions..."
  supabase functions deploy create-checkout-session --no-verify-jwt
  supabase functions deploy create-portal-session --no-verify-jwt
  supabase functions deploy stripe-webhook --no-verify-jwt
  echo -e "${TICK} Edge Functions deployed"

  if [ -n "$STRIPE_SECRET_KEY" ] && [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
    echo "  Setting Edge Function secrets..."
    supabase secrets set \
      STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
      STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"
    echo -e "${TICK} Secrets set"
  else
    echo -e "${ORANGE}  STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET not set — skipping secrets${NC}"
  fi
fi
echo ""

# ── Vercel Deploy ─────────────────────────────────────────────────────────────
echo -e "${BOLD}Deploying to Vercel...${NC}"

if ! vercel whoami &>/dev/null; then
  echo "  Logging into Vercel..."
  vercel login
fi

echo "  Deploying (production)..."
DEPLOY_URL=$(vercel --prod --yes \
  --env VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --env VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY" \
  --env VITE_STRIPE_PUBLISHABLE_KEY="$VITE_STRIPE_PUBLISHABLE_KEY" \
  --env VITE_STRIPE_PREMIUM_MONTHLY="$VITE_STRIPE_PREMIUM_MONTHLY" \
  --env VITE_STRIPE_PREMIUM_ANNUAL="${VITE_STRIPE_PREMIUM_ANNUAL:-}" \
  --env VITE_STRIPE_ELITE_MONTHLY="${VITE_STRIPE_ELITE_MONTHLY:-}" \
  --env VITE_STRIPE_ELITE_ANNUAL="${VITE_STRIPE_ELITE_ANNUAL:-}" \
  --env VITE_STRIPE_BUSINESS_MONTHLY="${VITE_STRIPE_BUSINESS_MONTHLY:-}" \
  --env VITE_ONESIGNAL_APP_ID="${VITE_ONESIGNAL_APP_ID:-}" \
  --env VITE_APP_URL="$VITE_APP_URL" \
  2>&1 | grep "https://" | tail -1)

echo ""
echo -e "${GREEN}${BOLD}🎉 Deployed!${NC}"
echo ""
echo -e "  ${BOLD}Live URL:${NC} ${DEPLOY_URL}"
echo ""
echo -e "${BOLD}Post-deploy checklist:${NC}"
echo "  □ Update VITE_APP_URL in .env to the live URL"
echo "  □ Add the live URL to Supabase allowed redirect URLs"
echo "  □ Verify Stripe webhook is hitting the correct Supabase URL"
echo "  □ Test sign up, onboarding, and a swipe"
echo "  □ Test Stripe checkout with card 4242 4242 4242 4242"
echo "  □ Make yourself admin: UPDATE profiles SET is_admin=true WHERE id='YOUR_ID';"
echo ""
