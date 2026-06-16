import { loadStripe } from '@stripe/stripe-js'
import { supabase } from './supabase'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')

export const PRICING_PLANS = [
  {
    id: 'premium' as const,
    name: 'Premium',
    price_monthly: 9.99,
    price_annual: 59.99,
    stripe_price_id_monthly: import.meta.env.VITE_STRIPE_PREMIUM_MONTHLY || 'price_premium_monthly',
    stripe_price_id_annual: import.meta.env.VITE_STRIPE_PREMIUM_ANNUAL || 'price_premium_annual',
    highlighted: true,
    features: [
      'Unlimited swipes',
      'Unlimited bucket list goals',
      'Full match breakdown',
      'Unlimited messaging',
      'See who liked you',
      'Priority placement in discovery',
      'Goal accountability partner matching',
      'Export bucket list as PDF',
    ],
  },
  {
    id: 'elite' as const,
    name: 'Elite',
    price_monthly: 24.99,
    price_annual: 199.99,
    stripe_price_id_monthly: import.meta.env.VITE_STRIPE_ELITE_MONTHLY || 'price_elite_monthly',
    stripe_price_id_annual: import.meta.env.VITE_STRIPE_ELITE_ANNUAL || 'price_elite_annual',
    highlighted: false,
    features: [
      'Everything in Premium',
      '1:1 goal coaching session monthly',
      'Verified profile badge',
      'Featured in discovery',
      'Early access to new features',
      'Custom group creation',
    ],
  },
  {
    id: 'business' as const,
    name: 'Business',
    price_monthly: 99,
    price_annual: 799,
    stripe_price_id_monthly: import.meta.env.VITE_STRIPE_BUSINESS_MONTHLY || 'price_business_monthly',
    stripe_price_id_annual: import.meta.env.VITE_STRIPE_BUSINESS_ANNUAL || 'price_business_annual',
    highlighted: false,
    features: [
      'Brand profile',
      'Sponsor a goal category',
      'Post challenges to community',
      'Analytics dashboard',
      'Promoted placement in feed',
      'Collect emails from participants',
    ],
  },
]

export async function redirectToCheckout(priceId: string, userId: string) {
  const stripe = await stripePromise
  if (!stripe) throw new Error('Stripe not loaded')

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { price_id: priceId, user_id: userId, success_url: `${window.location.origin}/app/settings?upgraded=true`, cancel_url: `${window.location.origin}/pricing` },
  })

  if (error) throw error

  const result = await stripe.redirectToCheckout({ sessionId: data.session_id })
  if (result.error) throw result.error
}

export async function redirectToPortal(userId: string) {
  const { data, error } = await supabase.functions.invoke('create-portal-session', {
    body: { user_id: userId, return_url: `${window.location.origin}/app/settings` },
  })
  if (error) throw error
  window.location.href = data.url
}
