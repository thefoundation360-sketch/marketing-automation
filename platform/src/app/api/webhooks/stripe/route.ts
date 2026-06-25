import { NextRequest, NextResponse } from 'next/server'
import { stripe, calculateFees } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent
    const contentId = intent.metadata.content_id

    if (!contentId) return NextResponse.json({ received: true })

    const { data: content } = await supabase
      .from('content')
      .select('id, creator_id, price_cents')
      .eq('id', contentId)
      .single()

    if (!content) return NextResponse.json({ received: true })

    const { platformFeeCents, creatorEarningsCents } = calculateFees(content.price_cents)

    await Promise.all([
      supabase.from('transactions').insert({
        content_id: contentId,
        creator_id: content.creator_id,
        stripe_payment_intent_id: intent.id,
        type: 'download_purchase',
        amount_cents: content.price_cents,
        creator_earnings_cents: creatorEarningsCents,
        platform_fee_cents: platformFeeCents,
        status: 'completed',
      }),
      supabase
        .from('content')
        .update({
          download_count: supabase.rpc('increment', { row_id: contentId, col: 'download_count' }),
          revenue_total_cents: supabase.rpc('increment_by', {
            row_id: contentId,
            col: 'revenue_total_cents',
            amount: creatorEarningsCents,
          }),
        })
        .eq('id', contentId),
      supabase
        .from('profiles')
        .update({
          payout_pending_cents: supabase.rpc('increment_by', {
            row_id: content.creator_id,
            col: 'payout_pending_cents',
            amount: creatorEarningsCents,
          }),
        })
        .eq('id', content.creator_id),
    ])
  }

  return NextResponse.json({ received: true })
}
