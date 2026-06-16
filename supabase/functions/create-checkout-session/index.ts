import Stripe from 'https://esm.sh/stripe@14.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { price_id, user_id, success_url, cancel_url } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user_id)
      .single()

    let customerId = profile?.stripe_customer_id

    if (!customerId) {
      const { data: { user } } = await supabase.auth.admin.getUserById(user_id)
      const customer = await stripe.customers.create({
        email: user?.email,
        name: profile?.full_name,
        metadata: { supabase_user_id: user_id },
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user_id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: price_id, quantity: 1 }],
      mode: 'subscription',
      success_url,
      cancel_url,
      subscription_data: {
        trial_period_days: price_id.includes('premium') ? 7 : undefined,
        metadata: { supabase_user_id: user_id },
      },
      allow_promotion_codes: true,
    })

    return new Response(JSON.stringify({ session_id: session.id }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
