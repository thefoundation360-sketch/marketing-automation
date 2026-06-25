import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { contentId } = await req.json()

  const { data: content } = await supabase
    .from('content')
    .select(`
      id, title, price_cents,
      profiles:creator_id (stripe_account_id)
    `)
    .eq('id', contentId)
    .single()

  if (!content) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 })
  }

  if (content.price_cents === 0) {
    return NextResponse.json({ error: 'Content is free — use download endpoint' }, { status: 400 })
  }

  const creatorAccount = (content.profiles as { stripe_account_id?: string })?.stripe_account_id
  if (!creatorAccount) {
    return NextResponse.json({ error: 'Creator payout not configured' }, { status: 400 })
  }

  const { data: buyer } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
  const session = await createCheckoutSession(
    content.id,
    content.title,
    content.price_cents,
    creatorAccount,
    buyer!.email,
    `${baseUrl}/marketplace/${content.id}?purchase=success`,
    `${baseUrl}/marketplace/${content.id}?purchase=cancelled`
  )

  return NextResponse.json({ url: session.url })
}
