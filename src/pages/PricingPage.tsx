import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Shield,
  Zap,
  Star,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PRICING_PLANS, createCheckoutSession } from '../lib/stripe';
import { useAuth } from '../contexts/AuthContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type BillingCycle = 'monthly' | 'annual';

// ---------------------------------------------------------------------------
// Comparison table data
// ---------------------------------------------------------------------------
const COMPARISON_FEATURES = [
  { label: 'Daily Swipes', free: '5/day', premium: 'Unlimited', elite: 'Unlimited', business: 'Unlimited' },
  { label: 'Active Goals', free: '3', premium: 'Unlimited', elite: 'Unlimited', business: 'Unlimited' },
  { label: 'Daily Messages', free: '10/day', premium: 'Unlimited', elite: 'Unlimited', business: 'Unlimited' },
  { label: 'Match Percentage', free: true, premium: true, elite: true, business: true },
  { label: 'Full Match Breakdown', free: false, premium: true, elite: true, business: true },
  { label: 'See Who Liked You', free: false, premium: true, elite: true, business: true },
  { label: 'Priority Placement', free: false, premium: true, elite: true, business: true },
  { label: 'Accountability Partner', free: false, premium: true, elite: true, business: true },
  { label: 'Export Bucket List PDF', free: false, premium: true, elite: true, business: true },
  { label: 'Goal Coaching (1:1 Monthly)', free: false, premium: false, elite: true, business: false },
  { label: 'Verified Badge', free: false, premium: false, elite: true, business: false },
  { label: 'Featured in Discovery', free: false, premium: false, elite: true, business: true },
  { label: 'Custom Group Creation', free: false, premium: false, elite: true, business: true },
  { label: 'Brand / Business Profile', free: false, premium: false, elite: false, business: true },
  { label: 'Sponsor Goal Categories', free: false, premium: false, elite: false, business: true },
  { label: 'Analytics Dashboard', free: false, premium: false, elite: false, business: true },
  { label: 'Community Challenges', free: false, premium: false, elite: false, business: true },
  { label: 'Collect Participant Emails', free: false, premium: false, elite: false, business: true },
];

// ---------------------------------------------------------------------------
// FAQ data
// ---------------------------------------------------------------------------
const FAQS = [
  {
    q: 'What is the 7-day free trial?',
    a: 'New Premium subscribers get a full 7 days free — no charge until the trial ends. You can cancel anytime during the trial and you will never be billed.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Absolutely. You can upgrade or downgrade at any time. When you upgrade, you are charged the prorated difference immediately. When you downgrade, the change takes effect at the end of your current billing period.',
  },
  {
    q: 'How does annual billing save money?',
    a: 'Choosing annual billing for Premium gives you 12 months of access for the price of 10 — effectively 2 months free compared to paying month-to-month.',
  },
  {
    q: 'Is my payment information secure?',
    a: 'Yes. All payments are processed by Stripe, a PCI DSS Level 1 certified payment processor. DreamLink never stores your card details.',
  },
  {
    q: 'What happens when I cancel?',
    a: 'When you cancel, your plan stays active until the end of your current billing period. After that, your account reverts to the Free tier and you keep all your goals and matches — you just lose access to paid features.',
  },
];

// ---------------------------------------------------------------------------
// Helper: tier color → gradient & badge colour map keyed by plan id
// ---------------------------------------------------------------------------
const PLAN_STYLES: Record<string, { gradient: string; ring: string; badgeBg: string; badgeText: string }> = {
  free:     { gradient: 'from-gray-400 to-gray-600',      ring: 'ring-gray-300',    badgeBg: 'bg-gray-100',    badgeText: 'text-gray-700' },
  premium:  { gradient: 'from-orange-400 to-orange-600',  ring: 'ring-orange-400',  badgeBg: 'bg-orange-100',  badgeText: 'text-orange-700' },
  elite:    { gradient: 'from-purple-500 to-purple-700',  ring: 'ring-purple-400',  badgeBg: 'bg-purple-100',  badgeText: 'text-purple-700' },
  business: { gradient: 'from-slate-600 to-slate-800',    ring: 'ring-slate-400',   badgeBg: 'bg-slate-100',   badgeText: 'text-slate-700' },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FeatureCheck({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm font-medium text-gray-700">{value}</span>;
  }
  return value ? (
    <Check className="w-5 h-5 text-orange-500 mx-auto" />
  ) : (
    <X className="w-4 h-4 text-gray-300 mx-auto" />
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-orange-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 group"
      >
        <span className="font-semibold text-gray-800 group-hover:text-orange-600 transition-colors">{q}</span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-orange-400 shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-gray-600 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function PricingPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [billing, setBilling] = useState<BillingCycle>('monthly');
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const currentTier = profile?.subscription_tier ?? null;

  async function handleUpgrade(plan: typeof PRICING_PLANS[number]) {
    // Free plan — just sign up
    if (plan.id === 'free') {
      navigate('/auth');
      return;
    }

    if (!user) {
      navigate('/auth');
      return;
    }

    const priceId =
      billing === 'annual' && plan.stripe_price_annual
        ? plan.stripe_price_annual
        : plan.stripe_price_monthly;

    if (!priceId) return;

    setLoadingPlanId(plan.id);
    toast('Redirecting to secure checkout...', { icon: '🔒' });

    try {
      const url = await createCheckoutSession(priceId, user.id);
      if (url) {
        window.location.href = url;
      } else {
        toast.error('Checkout not yet available — please try again later.');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoadingPlanId(false as unknown as string | null);
      setLoadingPlanId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50">
      {/* Nav bar strip */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-orange-500 hover:text-orange-600 font-semibold transition-colors">
            <ArrowLeft className="w-4 h-4" />
            DreamLink
          </Link>
          {user ? (
            <Link to="/discover" className="text-sm text-gray-500 hover:text-orange-500 transition-colors">
              Back to App
            </Link>
          ) : (
            <Link to="/auth" className="text-sm text-gray-500 hover:text-orange-500 transition-colors">
              Log in
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            Simple, transparent pricing
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Match with people who share your bucket list dreams. Start free, upgrade when you are ready to go deeper.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm font-medium ${billing === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>
            Monthly
          </span>
          <button
            onClick={() => setBilling(b => b === 'monthly' ? 'annual' : 'monthly')}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 ${
              billing === 'annual' ? 'bg-orange-500' : 'bg-gray-200'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
                billing === 'annual' ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-sm font-medium flex items-center gap-2 ${billing === 'annual' ? 'text-gray-900' : 'text-gray-400'}`}>
            Annual
            <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
              2 months free
            </span>
          </span>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-20">
          {PRICING_PLANS.map((plan, idx) => {
            const styles = PLAN_STYLES[plan.id];
            const isPopular = 'popular' in plan && plan.popular;
            const isCurrent = currentTier === plan.id;
            const isLoading = loadingPlanId === plan.id;

            const monthlyPrice = plan.price_monthly;
            const annualPrice = 'price_annual' in plan ? plan.price_annual : null;
            const displayPrice =
              billing === 'annual' && annualPrice !== null && annualPrice !== undefined
                ? annualPrice
                : monthlyPrice;
            const hasAnnual =
              billing === 'annual' &&
              annualPrice !== null &&
              annualPrice !== undefined &&
              (plan.stripe_price_annual !== null || plan.id === 'free');

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className={`relative flex flex-col rounded-2xl bg-white shadow-md border-2 transition-shadow hover:shadow-xl ${
                  isPopular
                    ? `border-orange-400 ring-4 ring-orange-100`
                    : 'border-gray-100'
                } ${isCurrent ? `ring-4 ${styles.ring} ring-opacity-50` : ''}`}
              >
                {/* Most Popular banner */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-orange-500 text-white text-xs font-bold px-4 py-1 rounded-full shadow whitespace-nowrap flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Card header gradient */}
                <div className={`bg-gradient-to-br ${styles.gradient} rounded-t-2xl p-6 text-white`}>
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-xl font-bold">{plan.name}</h2>
                    {'trial_days' in plan && plan.trial_days && (
                      <span className="bg-white/20 text-white text-xs font-semibold px-2 py-1 rounded-full">
                        7-day free trial
                      </span>
                    )}
                  </div>
                  <div className="flex items-end gap-1">
                    {displayPrice === 0 ? (
                      <span className="text-4xl font-extrabold">Free</span>
                    ) : (
                      <>
                        <span className="text-4xl font-extrabold">${displayPrice}</span>
                        <span className="text-white/70 mb-1 text-sm">
                          /{hasAnnual ? 'year' : 'month'}
                        </span>
                      </>
                    )}
                  </div>
                  {hasAnnual && displayPrice !== 0 && (
                    <p className="text-white/70 text-xs mt-1">
                      (${(displayPrice / 12).toFixed(2)}/mo)
                    </p>
                  )}
                </div>

                {/* Features */}
                <div className="flex-1 p-6 space-y-3">
                  {'features' in plan && (plan.features as readonly string[]).map((f) => (
                    <div key={f} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{f}</span>
                    </div>
                  ))}
                  {'limitations' in plan && (plan.limitations as readonly string[]).map((l) => (
                    <div key={l} className="flex items-start gap-2.5">
                      <X className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-400">{l}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="p-6 pt-0">
                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-xl text-center text-sm font-semibold bg-gray-100 text-gray-500 border border-gray-200">
                      Current Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan)}
                      disabled={isLoading}
                      className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2
                        disabled:opacity-70 disabled:cursor-not-allowed
                        ${isPopular
                          ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg'
                          : 'bg-gray-900 hover:bg-gray-800 text-white'
                        }`}
                    >
                      {isLoading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Redirecting...
                        </>
                      ) : (
                        <>
                          {plan.cta}
                          {!isLoading && <ExternalLink className="w-3.5 h-3.5" />}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Comparison table */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-20"
        >
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Full Feature Comparison
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-orange-100 shadow-sm">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-orange-50">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500 w-1/3">
                    Feature
                  </th>
                  {PRICING_PLANS.map((plan) => {
                    const styles = PLAN_STYLES[plan.id];
                    return (
                      <th key={plan.id} className="px-4 py-4 text-center">
                        <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${styles.badgeBg} ${styles.badgeText}`}>
                          {plan.name}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((row, i) => (
                  <tr
                    key={row.label}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-orange-50/40'}
                  >
                    <td className="px-6 py-3 text-sm text-gray-700 font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-center"><FeatureCheck value={row.free} /></td>
                    <td className="px-4 py-3 text-center"><FeatureCheck value={row.premium} /></td>
                    <td className="px-4 py-3 text-center"><FeatureCheck value={row.elite} /></td>
                    <td className="px-4 py-3 text-center"><FeatureCheck value={row.business} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* FAQ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 max-w-2xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="bg-white rounded-2xl shadow-sm border border-orange-100 px-6">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </motion.section>

        {/* Trust / guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-gray-500">
              <Shield className="w-5 h-5 text-orange-400" />
              <span className="font-semibold text-gray-700">Cancel anytime. No questions asked.</span>
              <Shield className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-orange-300" />
                Instant access
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-orange-300" />
                Stripe-secured payments
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-orange-300" />
                Keep your data if you downgrade
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer links */}
      <footer className="border-t border-orange-100 py-8 mt-4">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-gray-400">
          <Link to="/terms" className="hover:text-orange-500 transition-colors">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-orange-500 transition-colors">Privacy Policy</Link>
          <Link to="/contact" className="hover:text-orange-500 transition-colors">Contact Support</Link>
        </div>
      </footer>
    </div>
  );
}
