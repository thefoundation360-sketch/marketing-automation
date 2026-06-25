import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createConnectedAccount, createAccountLink } from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_account_id, email')
    .eq('id', user.id)
    .single()

  let accountId = profile?.stripe_account_id

  if (!accountId) {
    const account = await createConnectedAccount(profile!.email)
    accountId = account.id
    await supabase
      .from('profiles')
      .update({ stripe_account_id: accountId })
      .eq('id', user.id)
  }

  const link = await createAccountLink(accountId, process.env.NEXT_PUBLIC_APP_URL!)

  return NextResponse.json({ url: link.url })
}
