import { loadStripe } from '@stripe/stripe-js';

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

export const stripePromise = loadStripe(stripePublishableKey);

export const STRIPE_PRICES = {
  premium_monthly: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY_PRICE_ID || 'price_premium_monthly',
  premium_annual: import.meta.env.VITE_STRIPE_PREMIUM_ANNUAL_PRICE_ID || 'price_premium_annual',
  elite_monthly: import.meta.env.VITE_STRIPE_ELITE_MONTHLY_PRICE_ID || 'price_elite_monthly',
  business_monthly: import.meta.env.VITE_STRIPE_BUSINESS_MONTHLY_PRICE_ID || 'price_business_monthly',
};

export const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price_monthly: 0,
    price_annual: 0,
    color: 'from-gray-400 to-gray-600',
    badge_color: 'bg-gray-100 text-gray-800',
    features: [
      '5 swipes per day',
      '3 active bucket list goals',
      'See match percentage',
      '10 messages per day',
      'Basic matching',
    ],
    limitations: [
      'No full match breakdown',
      'Limited messaging',
      'No "who liked you"',
    ],
    cta: 'Get Started Free',
    stripe_price_monthly: null,
    stripe_price_annual: null,
  },
  {
    id: 'premium',
    name: 'Premium',
    price_monthly: 9.99,
    price_annual: 59.99,
    color: 'from-orange-400 to-orange-600',
    badge_color: 'bg-orange-100 text-orange-800',
    popular: true,
    trial_days: 7,
    features: [
      'Unlimited swipes',
      'Unlimited bucket list goals',
      'Full match breakdown',
      'Unlimited messaging',
      'See who liked you',
      'Priority placement in discovery',
      'Accountability partner matching',
      'Export bucket list as PDF',
    ],
    cta: 'Start 7-Day Free Trial',
    stripe_price_monthly: STRIPE_PRICES.premium_monthly,
    stripe_price_annual: STRIPE_PRICES.premium_annual,
  },
  {
    id: 'elite',
    name: 'Elite',
    price_monthly: 24.99,
    price_annual: null,
    color: 'from-purple-500 to-purple-700',
    badge_color: 'bg-purple-100 text-purple-800',
    features: [
      'Everything in Premium',
      'Monthly 1:1 goal coaching',
      'Verified profile badge',
      'Featured in discovery',
      'Early access to new features',
      'Custom group creation',
    ],
    cta: 'Go Elite',
    stripe_price_monthly: STRIPE_PRICES.elite_monthly,
    stripe_price_annual: null,
  },
  {
    id: 'business',
    name: 'Business',
    price_monthly: 99,
    price_annual: null,
    color: 'from-slate-600 to-slate-800',
    badge_color: 'bg-slate-100 text-slate-800',
    features: [
      'Brand profile',
      'Sponsor a goal category',
      'Post community challenges',
      'Analytics dashboard',
      'Promoted placement in feed',
      'Collect participant emails',
    ],
    cta: 'Go Business',
    stripe_price_monthly: STRIPE_PRICES.business_monthly,
    stripe_price_annual: null,
  },
] as const;

export type PlanId = typeof PRICING_PLANS[number]['id'];

// In a real app these would call Supabase Edge Functions
// which invoke Stripe's server-side API
export const createCheckoutSession = async (_priceId: string, _userId: string): Promise<string | null> => {
  // TODO: Call Supabase Edge Function: /functions/v1/create-checkout-session
  // Returns a Stripe Checkout URL
  console.log('createCheckoutSession: implement via Supabase Edge Function');
  return null;
};

export const createPortalSession = async (_customerId: string): Promise<string | null> => {
  // TODO: Call Supabase Edge Function: /functions/v1/create-portal-session
  console.log('createPortalSession: implement via Supabase Edge Function');
  return null;
};
