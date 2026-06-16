import { CheckCircle } from 'lucide-react'
import { cn, GOAL_CATEGORY_COLORS, GOAL_CATEGORY_ICONS } from '@/lib/utils'
import type { GoalCategory, SubscriptionTier } from '@/types'

// ─── TierBadge ────────────────────────────────────────────────────────────────

interface TierBadgeProps {
  tier: SubscriptionTier
  className?: string
}

const TIER_STYLES: Record<SubscriptionTier, { label: string; classes: string }> = {
  free: {
    label: 'Free',
    classes: 'bg-warm-100 text-warm-600 border border-warm-200',
  },
  premium: {
    label: 'Premium',
    classes: 'bg-orange-100 text-orange-700 border border-orange-200',
  },
  elite: {
    label: 'Elite',
    classes: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 shadow-sm',
  },
  business: {
    label: 'Business',
    classes: 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white border-0 shadow-sm',
  },
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  const { label, classes } = TIER_STYLES[tier]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide leading-none',
        classes,
        className
      )}
    >
      {label}
    </span>
  )
}

// ─── CategoryBadge ────────────────────────────────────────────────────────────

interface CategoryBadgeProps {
  category: GoalCategory
  className?: string
  showEmoji?: boolean
}

export function CategoryBadge({
  category,
  className,
  showEmoji = true,
}: CategoryBadgeProps) {
  const colorClasses = GOAL_CATEGORY_COLORS[category]
  const emoji = GOAL_CATEGORY_ICONS[category]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium leading-none',
        colorClasses,
        className
      )}
    >
      {showEmoji && (
        <span className="text-[12px] leading-none" aria-hidden>
          {emoji}
        </span>
      )}
      {category}
    </span>
  )
}

// ─── VerifiedBadge ────────────────────────────────────────────────────────────

interface VerifiedBadgeProps {
  className?: string
  size?: number
}

export function VerifiedBadge({ className, size = 16 }: VerifiedBadgeProps) {
  return (
    <span
      aria-label="Verified"
      className={cn('inline-flex items-center justify-center', className)}
    >
      <CheckCircle
        size={size}
        className="text-primary-500"
        strokeWidth={2.5}
      />
    </span>
  )
}
