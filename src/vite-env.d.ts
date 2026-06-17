/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID: string;
  readonly VITE_STRIPE_PREMIUM_ANNUAL_PRICE_ID: string;
  readonly VITE_STRIPE_ELITE_MONTHLY_PRICE_ID: string;
  readonly VITE_STRIPE_BUSINESS_MONTHLY_PRICE_ID: string;
  readonly VITE_ONESIGNAL_APP_ID: string;
  readonly VITE_APP_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
