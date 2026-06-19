#!/usr/bin/env bash
# Sets all required GitHub Actions secrets from your .env file
# Requires: gh CLI authenticated + GITHUB_REPO set
# Usage: GITHUB_REPO=owner/repo bash scripts/set-github-secrets.sh

set -e

if [ ! -f ".env" ]; then
  echo "No .env file. Run: cp .env.example .env"
  exit 1
fi

if [ -z "$GITHUB_REPO" ]; then
  echo "Set GITHUB_REPO=owner/repo before running"
  exit 1
fi

if ! command -v gh &>/dev/null; then
  echo "gh CLI not found: https://cli.github.com"
  exit 1
fi

source .env

set_secret() {
  local key="$1"
  local val="${!1}"
  if [ -n "$val" ] && [[ "$val" != *"..."* ]]; then
    echo "$val" | gh secret set "$key" --repo "$GITHUB_REPO"
    echo "✓ $key"
  else
    echo "⚠ skipped $key (not set)"
  fi
}

echo "Setting GitHub Actions secrets for $GITHUB_REPO..."
echo ""

# Supabase
set_secret VITE_SUPABASE_URL
set_secret VITE_SUPABASE_ANON_KEY
set_secret SUPABASE_PROJECT_REF
set_secret SUPABASE_DB_PASSWORD
set_secret SUPABASE_ACCESS_TOKEN

# Stripe (frontend)
set_secret VITE_STRIPE_PUBLISHABLE_KEY
set_secret VITE_STRIPE_PREMIUM_MONTHLY
set_secret VITE_STRIPE_PREMIUM_ANNUAL
set_secret VITE_STRIPE_ELITE_MONTHLY
set_secret VITE_STRIPE_ELITE_ANNUAL
set_secret VITE_STRIPE_BUSINESS_MONTHLY
set_secret VITE_STRIPE_BUSINESS_ANNUAL

# Stripe (server)
set_secret STRIPE_SECRET_KEY
set_secret STRIPE_WEBHOOK_SECRET

# OneSignal
set_secret VITE_ONESIGNAL_APP_ID

# App
set_secret VITE_APP_URL

# Vercel
set_secret VERCEL_TOKEN
set_secret VERCEL_ORG_ID
set_secret VERCEL_PROJECT_ID

echo ""
echo "Done! All secrets set on $GITHUB_REPO"
echo "Push to main to trigger the first automated deploy."
