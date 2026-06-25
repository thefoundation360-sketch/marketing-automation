'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { User, CreditCard, Link2, CheckCircle2, Loader2, ExternalLink } from 'lucide-react'
import type { Profile } from '@/types'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function StripeStatusBanner() {
  const params = useSearchParams()
  const status = params.get('stripe')
  if (!status) return null
  return (
    <div className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
      status === 'success'
        ? 'bg-emerald-950/50 border border-emerald-800 text-emerald-300'
        : 'bg-amber-950/50 border border-amber-800 text-amber-300'
    }`}>
      {status === 'success'
        ? <><CheckCircle2 className="h-4 w-4" /> Stripe account connected successfully. Payouts are enabled.</>
        : <><Loader2 className="h-4 w-4" /> Stripe setup incomplete. Please try again.</>
      }
    </div>
  )
}

export default function SettingsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [form, setForm] = useState({ full_name: '', bio: '' })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data as Profile)
        setForm({ full_name: data.full_name, bio: data.bio ?? '' })
      }
    }
    load()
  }, [])

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('profiles').update(form).eq('id', user!.id)
    setProfile(p => p ? { ...p, ...form } : p)
    setSaving(false)
  }

  async function handleConnectStripe() {
    setConnectingStripe(true)
    const res = await fetch('/api/payments/connect-stripe', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
    else setConnectingStripe(false)
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">Manage your account, payouts, and integrations</p>
      </div>

      <Suspense>
        <StripeStatusBanner />
      </Suspense>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-5">
        <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
          <User className="h-4 w-4 text-violet-400" />
          Profile
        </h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-300 block mb-1.5">Display Name</label>
            <Input
              value={form.full_name}
              onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              placeholder="Your Name"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300 block mb-1.5">Bio</label>
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Tell buyers about yourself..."
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-300 block mb-1.5">Email</label>
            <Input value={profile?.email ?? ''} disabled className="opacity-50" />
          </div>
          <Button type="submit" disabled={saving} size="sm">
            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
            Save Profile
          </Button>
        </form>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-violet-400" />
          Payouts
        </h2>
        <p className="text-sm text-zinc-400">
          Connect your Stripe account to receive payments. You keep <strong className="text-zinc-200">80%</strong> of every sale, paid directly to your bank.
        </p>

        {profile?.payout_enabled ? (
          <div className="flex items-center gap-3">
            <Badge variant="success">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Stripe Connected
            </Badge>
            <span className="text-xs text-zinc-500">Payouts active · {profile.revenue_share_percent}% revenue share</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-300">
              Your account isn't connected to Stripe yet. You can upload and publish content, but buyers won't be able to purchase until you set up payouts.
            </div>
            <Button onClick={handleConnectStripe} disabled={connectingStripe}>
              {connectingStripe
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <ExternalLink className="h-4 w-4 mr-2" />
              }
              {connectingStripe ? 'Redirecting...' : 'Connect Stripe Account'}
            </Button>
          </div>
        )}

        {(profile?.payout_pending_cents ?? 0) > 0 && (
          <div className="pt-2 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">Pending payout</p>
            <p className="text-xl font-bold text-emerald-400">
              ${((profile?.payout_pending_cents ?? 0) / 100).toFixed(2)}
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">Transferred automatically by Stripe</p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
          <Link2 className="h-4 w-4 text-violet-400" />
          Social Connections
        </h2>
        <p className="text-sm text-zinc-400">
          Connect your social accounts to enable automatic posting from the Scheduler.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(['Instagram', 'TikTok', 'YouTube', 'Twitter / X', 'Facebook', 'LinkedIn'] as const).map(platform => (
            <div
              key={platform}
              className="flex items-center justify-between rounded-lg border border-zinc-700 px-3 py-2.5"
            >
              <span className="text-sm text-zinc-300">{platform}</span>
              <Button variant="outline" size="sm" className="text-xs h-7">
                Connect
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-600">OAuth integration — coming in Phase 2. Manual posting available now.</p>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h2 className="font-semibold text-zinc-100">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-300">Delete Account</p>
            <p className="text-xs text-zinc-500">Permanently delete your account and all content</p>
          </div>
          <Button variant="destructive" size="sm">Delete Account</Button>
        </div>
      </section>
    </div>
  )
}
