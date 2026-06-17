import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Zap, Sparkles, Lock } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { SubscriptionTier } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
  currentTier?: SubscriptionTier;
}

const PREMIUM_BENEFITS = [
  { icon: '∞', label: 'Unlimited daily swipes' },
  { icon: '∞', label: 'Unlimited active goals' },
  { icon: '💬', label: 'Unlimited messaging' },
  { icon: '👀', label: 'See who liked you' },
  { icon: '📊', label: 'Full match breakdown' },
  { icon: '🚀', label: 'Priority placement in Discover' },
  { icon: '✅', label: 'Verified profile badge' },
  { icon: '👥', label: 'Create & join exclusive groups' },
];

const TIER_LABEL: Record<SubscriptionTier, string> = {
  free: 'Free',
  premium: 'Premium',
  elite: 'Elite',
  business: 'Business',
};

export default function UpgradeModal({
  isOpen,
  onClose,
  feature,
  currentTier = 'free',
}: UpgradeModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate('/pricing');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pt-2 pb-8">
        {/* Hero gradient banner */}
        <div className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 p-5 text-white shadow-lg shadow-orange-200">
          {/* Decorative circles */}
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-full bg-white/10" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">DreamLink Premium</span>
            </div>

            {feature ? (
              <>
                <div className="flex items-start gap-2 mb-1">
                  <Lock className="w-4 h-4 mt-0.5 text-white/80 shrink-0" />
                  <p className="text-sm text-white/90 leading-snug">
                    <span className="font-semibold text-white">{feature}</span> is a Premium feature.
                  </p>
                </div>
                <p className="text-xs text-white/70 mt-1">
                  You're on the {TIER_LABEL[currentTier]} plan. Upgrade to unlock this and more.
                </p>
              </>
            ) : (
              <p className="text-sm text-white/90 leading-snug">
                Unlock the full DreamLink experience and connect with people who share your biggest dreams.
              </p>
            )}
          </div>
        </div>

        {/* Price callout */}
        <div className="flex items-baseline gap-1.5 mb-5">
          <span className="text-3xl font-extrabold text-gray-900">$9.99</span>
          <span className="text-base text-gray-400 font-medium">/ month</span>
          <span className="ml-auto text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
            Save 40% yearly
          </span>
        </div>

        {/* Benefits list */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Everything included
          </p>
          <ul className="space-y-2.5">
            {PREMIUM_BENEFITS.map(({ icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-orange-50 flex items-center justify-center text-sm shrink-0">
                  {icon}
                </span>
                <span className="text-sm text-gray-700 font-medium">{label}</span>
                <CheckCircle2 className="w-4 h-4 text-orange-400 ml-auto shrink-0" />
              </li>
            ))}
          </ul>
        </div>

        {/* Trust line */}
        <p className="text-center text-xs text-gray-400 mb-4">
          Cancel anytime · Secure payment via Stripe · No hidden fees
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            icon={<Zap className="w-5 h-5" />}
            onClick={handleUpgrade}
          >
            Upgrade Now
          </Button>
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={onClose}
            className="text-gray-400"
          >
            Maybe later
          </Button>
        </div>
      </div>
    </Modal>
  );
}
