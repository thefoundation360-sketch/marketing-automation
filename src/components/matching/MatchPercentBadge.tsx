import { cn } from '@/lib/utils'

interface MatchPercentBadgeProps {
  percentage: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: {
    pill: 'px-2 py-0.5 text-[11px] gap-1',
    dot: 'w-1.5 h-1.5',
  },
  md: {
    pill: 'px-3 py-1 text-xs gap-1.5',
    dot: 'w-2 h-2',
  },
  lg: {
    pill: 'px-4 py-1.5 text-sm gap-2',
    dot: 'w-2.5 h-2.5',
  },
}

function getMatchColor(percentage: number): string {
  if (percentage >= 80) return 'from-orange-500 to-amber-400'
  if (percentage >= 60) return 'from-orange-400 to-yellow-400'
  if (percentage >= 40) return 'from-yellow-400 to-amber-300'
  return 'from-gray-400 to-gray-300'
}

export default function MatchPercentBadge({
  percentage,
  size = 'md',
  className,
}: MatchPercentBadgeProps) {
  const sizeClasses = SIZE_CLASSES[size]
  const gradientClasses = getMatchColor(percentage)

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold text-white bg-gradient-to-r shadow-sm',
        gradientClasses,
        sizeClasses.pill,
        className
      )}
      aria-label={`${percentage}% match`}
    >
      <span
        className={cn(
          'rounded-full bg-white/40 flex-shrink-0',
          sizeClasses.dot
        )}
      />
      {percentage}% Match
    </span>
  )
}
