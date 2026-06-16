import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Large emoji displayed at the center top */
  icon: string
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-8 py-12',
        className
      )}
    >
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-5 shadow-inner">
        <span className="text-4xl leading-none select-none" role="img" aria-hidden>
          {icon}
        </span>
      </div>

      {/* Text */}
      <h3 className="text-lg font-semibold text-warm-800 mb-2 leading-snug">
        {title}
      </h3>
      <p className="text-sm text-warm-500 leading-relaxed max-w-xs">
        {description}
      </p>

      {/* Optional CTA */}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-6 px-6 py-3 bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white text-sm font-semibold rounded-full shadow-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
