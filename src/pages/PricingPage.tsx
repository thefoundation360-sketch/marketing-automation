import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Flame, Check, ChevronDown, ChevronUp, Zap, Star, Crown, Building2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { PRICING_PLANS, redirectToCheckout } from '@/lib/stripe'
import { cn } from '@/lib/utils'
import type { SubscriptionTier } from '@/types'

// ── FAQ Data ───────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Can I switch plans anytime?',
    a: 'Yes! Upgrades take effect immediately and you get prorated credit for any unused days on your current plan. Downgrades take effect at the end of your current billing cycle.',
  },
  {
    q: 'How does the free trial work?',
    a: "Premium includes a 7-day free trial — no charge until the trial ends. Cancel anytime before the 7th day and you'll never be billed.",
  },
  {
    q: 'Is my payment secure?',
    a: 'Absolutely. All payments are processed by Stripe, a PCI-compliant payment provider trusted by millions of businesses worldwide. We never store your card details.',
  },
  {
    q: 'What happens when I hit free limits?',
    a: "We show a friendly upgrade prompt — you'll never lose access to your existing data or matches. Your goals, messages, and connections stay safe forever.",
  },
  {
    q: 'Do you offer refunds?',
    a: "Contact our support team within 7 days of a charge and we'll make it right. Email us at support@dreammatch.app and we typically respond within a few hours.",
  },
]

// ── Free plan definition ───────────────────────────────────────────────────────

const FREE_FEATURES = [
  '5 swipes per day',
  '3 active bucket list goals',
  'See match % (not full breakdown)',
  'Basic messaging (10/day)',
  'View matches',
]

const PREMIUM_EXTRA_FEATURES = [
  'Unlimited swipes',
  'Unlimited goals',
  'Full match breakdown',
  'Unlimited messaging',
  'See who liked you',
  'Priority discovery placement',
  'Accountability partner matching',
  'Export bucket list PDF',
]

const ELITE_EXTRA_FEATURES = [
  'Everything in Premium',
  '1:1 monthly goal coaching',
  'Verified profile badge ✓',
  'Featured in discovery',
  'Early access to new features',
  'Custom group creation',
]

const BUSINESS_FEATURES = [
  'Brand profile page',
  'Sponsor a goal category',
  'Post challenges to community',
  'Analytics dashboard',
  'Promoted placement in feed',
  'Collect emails from participants',
]

// ── FAQ Item ───────────────────────────────────────────────────────────────────

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-warm-200 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white active:bg-warm-50 transition-colors gap-3"
      >
        <span className="font-semibold text-warm-900 text-sm leading-snug">{question}</span>
        {open
          ? <ChevronUp size={16} className="text-warm-400 flex-shrink-0" />
          : <ChevronDown size={16} className="text-warm-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-4 bg-white border-t border-warm-100">
          <p className="text-sm text-warm-600 leading-relaxed pt-3">{answer}</p>
        </div>
      )}
    </div>
  )
}

// ── Feature check row ──────────────────────────────────────────────────────────

function Feature({ text, highlighted }: { text: string; highlighted: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-warm-700 leading-snug">
      <span className={cn(
        'mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0',
        highlighted ? 'bg-orange-500' : 'bg-warm-200',
      )}>
        <Check size={9} className={highlighted ? 'text-white' : 'text-warm-500'} strokeWidth={3} />
      </span>
      {text}
    </li>
  )
}

// ── Free Card ──────────────────────────────────────────────────────────────────

interface FreeCardProps {
  isCurrent: boolean
  onCta: () => void
}

function FreeCard({ isCurrent, onCta }: FreeCardProps) {
  return (
    <div className="relative bg-white rounded-3xl border-2 border-warm-200 shadow-sm flex flex-col">
      <div className="p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-warm-100 flex items-center justify-center flex-shrink-0">
            <Star size={18} className="text-warm-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-warm-500 uppercase tracking-wide">Free Forever</p>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-warm-900">Free</h3>
              {isCurrent && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 uppercase tracking-wide">
                  Current
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="mb-5">
          <div className="flex items-end gap-1">
            <span className="text-4xl font-extrabold text-warm-900">$0</span>
            <span className="text-sm text-warm-400 mb-1.5 font-medium">/month</span>
          </div>
          <p className="text-xs text-warm-400 mt-0.5">No credit card required</p>
        </div>

        {/* Features */}
        <ul className="space-y-2.5 mb-6 flex-1">
          {FREE_FEATURES.map(f => <Feature key={f} text={f} highlighted={false} />)}
        </ul>

        {/* CTA */}
        <button
          type="button"
          onClick={onCta}
          disabled={isCurrent}
          className={cn(
            'w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]',
            isCurrent
              ? 'bg-green-50 text-green-700 border-2 border-green-200 cursor-default'
              : 'bg-warm-900 text-white hover:bg-warm-800',
          )}
        >
          {isCurrent ? '✓ Current Plan' : 'Get Started Free'}
        </button>
      </div>
    </div>
  )
}

// ── Premium Card ───────────────────────────────────────────────────────────────

interface PremiumCardProps {
  isAnnual: boolean
  isCurrent: boolean
  loading: boolean
  onCta: () => void
}

function PremiumCard({ isAnnual, isCurrent, loading, onCta }: PremiumCardProps) {
  const plan = PRICING_PLANS.find(p => p.id === 'premium')!
  const monthlyEquiv = isAnnual ? plan.price_annual / 12 : plan.price_monthly
  const savePercent = Math.round((1 - plan.price_annual / 12 / plan.price_monthly) * 100)

  return (
    <div className="relative bg-white rounded-3xl border-2 border-orange-500 shadow-xl shadow-orange-100 flex flex-col">
      {/* Popular badge */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-400 rounded-t-[22px] px-4 py-2 text-center">
        <span className="text-white text-xs font-bold uppercase tracking-wider">Most Popular</span>
      </div>

      <div className="p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center flex-shrink-0">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-orange-500 uppercase tracking-wide">Premium</p>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-warm-900">Premium</h3>
              {isCurrent && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 uppercase tracking-wide">
                  Current
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Trial badge */}
        <div className="mb-4">
          <span className="inline-block text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full">
            7-day free trial
          </span>
        </div>

        {/* Price */}
        <div className="mb-5">
          <div className="flex items-end gap-1.5">
            {isAnnual && (
              <span className="text-lg text-warm-400 line-through font-medium mb-0.5">
                ${plan.price_monthly.toFixed(2)}
              </span>
            )}
            <span className="text-4xl font-extrabold text-warm-900">${monthlyEquiv.toFixed(2)}</span>
            <span className="text-sm text-warm-400 mb-1.5 font-medium">/mo</span>
          </div>
          {isAnnual && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-warm-400">Billed ${plan.price_annual.toFixed(2)}/year</p>
              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                Save {savePercent}%
              </span>
            </div>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-2.5 mb-6 flex-1">
          {[...FREE_FEATURES, ...PREMIUM_EXTRA_FEATURES].map(f => (
            <Feature key={f} text={f} highlighted />
          ))}
        </ul>

        {/* CTA */}
        <button
          type="button"
          onClick={onCta}
          disabled={isCurrent || loading}
          className={cn(
            'w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]',
            isCurrent
              ? 'bg-green-50 text-green-700 border-2 border-green-200 cursor-default'
              : 'bg-gradient-to-r from-orange-500 to-amber-400 text-white shadow-md shadow-orange-200 hover:shadow-lg',
            loading && 'opacity-60',
          )}
        >
          {loading ? 'Loading…' : isCurrent ? '✓ Current Plan' : 'Start Free Trial'}
        </button>
      </div>
    </div>
  )
}

// ── Elite Card ─────────────────────────────────────────────────────────────────

interface EliteCardProps {
  isAnnual: boolean
  isCurrent: boolean
  loading: boolean
  onCta: () => void
}

function EliteCard({ isAnnual, isCurrent, loading, onCta }: EliteCardProps) {
  const plan = PRICING_PLANS.find(p => p.id === 'elite')!
  const monthlyEquiv = isAnnual ? plan.price_annual / 12 : plan.price_monthly
  const savePercent = Math.round((1 - plan.price_annual / 12 / plan.price_monthly) * 100)

  return (
    <div className="relative bg-white rounded-3xl border-2 border-warm-200 shadow-sm flex flex-col">
      <div className="p-6 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
            <Crown size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Elite</p>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-warm-900">Elite</h3>
              {isCurrent && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 uppercase tracking-wide">
                  Current
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="mb-5">
          <div className="flex items-end gap-1.5">
            {isAnnual && (
              <span className="text-lg text-warm-400 line-through font-medium mb-0.5">
                ${plan.price_monthly.toFixed(2)}
              </span>
            )}
            <span className="text-4xl font-extrabold text-warm-900">${monthlyEquiv.toFixed(2)}</span>
            <span className="text-sm text-warm-400 mb-1.5 font-medium">/mo</span>
          </div>
          {isAnnual && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-warm-400">Billed ${plan.price_annual.toFixed(2)}/year</p>
              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                Save {savePercent}%
              </span>
            </div>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-2.5 mb-6 flex-1">
          {[...FREE_FEATURES, ...PREMIUM_EXTRA_FEATURES, ...ELITE_EXTRA_FEATURES].map(f => (
            <Feature key={f} text={f} highlighted={false} />
          ))}
        </ul>

        {/* CTA */}
        <button
          type="button"
          onClick={onCta}
          disabled={isCurrent || loading}
          className={cn(
            'w-full py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.98]',
            isCurrent
              ? 'bg-green-50 text-green-700 border-2 border-green-200 cursor-default'
              : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm hover:shadow-md',
            loading && 'opacity-60',
          )}
        >
          {loading ? 'Loading…' : isCurrent ? '✓ Current Plan' : 'Go Elite'}
        </button>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [isAnnual, setIsAnnual] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionTier | null>(null)

  const currentTier = profile?.subscription_tier ?? null

  const premiumPlan = PRICING_PLANS.find(p => p.id === 'premium')!
  const elitePlan = PRICING_PLANS.find(p => p.id === 'elite')!
  const businessPlan = PRICING_PLANS.find(p => p.id === 'business')!

  async function handlePaidPlan(tier: 'premium' | 'elite' | 'business') {
    if (!user) {
      navigate('/auth', { state: { redirectTo: '/pricing' } })
      return
    }
    const plan = PRICING_PLANS.find(p => p.id === tier)!
    const priceId = isAnnual ? plan.stripe_price_id_annual : plan.stripe_price_id_monthly
    setLoadingPlan(tier)
    try {
      await redirectToCheckout(priceId, user.id)
    } catch (err) {
      console.error('Checkout error', err)
      toast.error('Failed to start checkout. Please try again.')
    } finally {
      setLoadingPlan(null)
    }
  }

  function handleFree() {
    if (user) {
      navigate('/app')
    } else {
      navigate('/auth')
    }
  }

  return (
    <div className="min-h-screen bg-[#FFFBF7]">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-[#FFFBF7]/90 backdrop-blur-sm border-b border-warm-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-warm-900 font-extrabold text-xl">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-sm">
              <Flame size={18} className="text-white" />
            </div>
            DreamMatch
          </Link>

          {/* Sign In */}
          {!user && (
            <Link
              to="/auth"
              className="text-sm font-semibold text-warm-700 hover:text-orange-600 transition-colors"
            >
              Sign In
            </Link>
          )}
          {user && (
            <Link
              to="/app"
              className="text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors"
            >
              Go to App →
            </Link>
          )}
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 pt-16 pb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-warm-900 leading-tight mb-4">
          Choose Your Dream Plan
        </h1>
        <p className="text-lg text-warm-500 max-w-xl mx-auto leading-relaxed">
          Start free. Upgrade when you're ready to chase more dreams.
        </p>

        {/* Current plan badge */}
        {profile && currentTier && (
          <div className="mt-5 inline-flex items-center gap-2 bg-white border border-warm-200 rounded-full px-4 py-2 text-sm shadow-sm">
            <span className="text-warm-500">Current plan:</span>
            <span className="font-bold text-orange-600 capitalize">{currentTier}</span>
          </div>
        )}
      </section>

      {/* ── Billing toggle ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 pb-10">
        <span className={cn('text-sm font-semibold transition-colors', !isAnnual ? 'text-warm-900' : 'text-warm-400')}>
          Monthly
        </span>
        <button
          type="button"
          onClick={() => setIsAnnual(a => !a)}
          aria-label="Toggle annual billing"
          className={cn(
            'relative w-14 h-7 rounded-full transition-colors focus:outline-none',
            isAnnual ? 'bg-orange-500' : 'bg-warm-300',
          )}
        >
          <span className={cn(
            'absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform',
            isAnnual ? 'translate-x-8' : 'translate-x-1',
          )} />
        </button>
        <span className={cn('text-sm font-semibold transition-colors', isAnnual ? 'text-warm-900' : 'text-warm-400')}>
          Annual
        </span>
        {isAnnual && (
          <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">
            Save 40%
          </span>
        )}
      </div>

      {/* ── Pricing cards grid ───────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <FreeCard
            isCurrent={currentTier === 'free'}
            onCta={handleFree}
          />
          <PremiumCard
            isAnnual={isAnnual}
            isCurrent={currentTier === 'premium'}
            loading={loadingPlan === 'premium'}
            onCta={() => {
              if (currentTier === 'premium') return
              handlePaidPlan('premium')
            }}
          />
          <EliteCard
            isAnnual={isAnnual}
            isCurrent={currentTier === 'elite'}
            loading={loadingPlan === 'elite'}
            onCta={() => {
              if (currentTier === 'elite') return
              handlePaidPlan('elite')
            }}
          />
        </div>

        {/* ── Business card (full width, dark) ──────────────────────────────── */}
        <div className="mt-6 bg-gradient-to-br from-warm-900 to-slate-800 rounded-3xl p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Left info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Building2 size={22} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">Business / Brand</p>
                  <h3 className="text-xl font-bold">Business</h3>
                </div>
              </div>
              <p className="text-white/60 text-sm mb-4 leading-relaxed">
                For teams, brands, and sponsors looking to reach goal-driven communities.
              </p>
              <div className="flex items-end gap-1.5 mb-2">
                <span className="text-4xl font-extrabold">$99</span>
                <span className="text-sm text-white/60 mb-1.5">/month</span>
              </div>
            </div>

            {/* Right features */}
            <div className="flex-1">
              <ul className="space-y-2.5 mb-6">
                {BUSINESS_FEATURES.map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/80">
                    <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Check size={9} className="text-white" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="mailto:business@dreammatch.app"
                className="block w-full py-3.5 rounded-2xl bg-white text-warm-900 font-bold text-sm text-center hover:bg-warm-100 active:scale-[0.98] transition-all"
              >
                Contact Us →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-5 pb-16">
        <h2 className="text-2xl font-extrabold text-warm-900 text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-3">
          {FAQS.map(faq => (
            <FaqItem key={faq.q} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-warm-100 bg-white">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-warm-400">
          <div className="flex items-center gap-2 font-bold text-warm-700">
            <Flame size={16} className="text-orange-500" />
            DreamMatch
          </div>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="hover:text-orange-500 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-orange-500 transition-colors">Privacy</Link>
            <a href="mailto:support@dreammatch.app" className="hover:text-orange-500 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
