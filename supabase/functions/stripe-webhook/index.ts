import Stripe from 'https://esm.sh/stripe@14.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
})
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

const TIER_MAP: Record<string, string> = {
  price_premium_monthly: 'premium',
  price_premium_annual: 'premium',
  price_elite_monthly: 'elite',
  price_elite_annual: 'elite',
  price_business_monthly: 'business',
  price_business_annual: 'business',
}

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('No signature', { status: 400 })

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        if (userId) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          const priceId = subscription.items.data[0].price.id
          const tier = TIER_MAP[priceId] || 'premium'
          await supabase.from('profiles').update({
            subscription_tier: tier,
            stripe_subscription_id: subscription.id,
            stripe_subscription_status: subscription.status,
          }).eq('id', userId)
        }
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const priceId = sub.items.data[0].price.id
        const tier = TIER_MAP[priceId] || 'premium'
        await supabase.from('profiles').update({
          subscription_tier: sub.status === 'active' ? tier : 'free',
          stripe_subscription_status: sub.status,
        }).eq('stripe_subscription_id', sub.id)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabase.from('profiles').update({
          subscription_tier: 'free',
          stripe_subscription_id: null,
          stripe_subscription_status: 'cancelled',
        }).eq('stripe_subscription_id', sub.id)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await supabase.from('profiles').update({
          stripe_subscription_status: 'past_due',
        }).eq('stripe_customer_id', invoice.customer)
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return new Response('Handler error', { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
