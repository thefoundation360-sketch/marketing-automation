import { cn } from '@/lib/utils'

// ─── Primitive ────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-orange-50',
        className
      )}
    />
  )
}

// ─── CardSkeleton ─────────────────────────────────────────────────────────────

/**
 * Tall profile-card skeleton — avatar circle at top, then 3 lines of text.
 */
export function CardSkeleton() {
  return (
    <div className="w-full rounded-2xl overflow-hidden bg-white border border-warm-100 shadow-sm">
      {/* Photo area */}
      <Skeleton className="w-full aspect-[3/4] rounded-none" />
      {/* Content area */}
      <div className="p-4 space-y-3">
        {/* Avatar + name row */}
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        {/* Text line 1 */}
        <Skeleton className="h-3 w-full" />
        {/* Text line 2 */}
        <Skeleton className="h-3 w-4/5" />
        {/* Text line 3 */}
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  )
}

// ─── ListItemSkeleton ─────────────────────────────────────────────────────────

/**
 * Horizontal row skeleton — small avatar circle + 2 lines of text.
 */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <Skeleton className="w-14 h-3 rounded-full flex-shrink-0" />
    </div>
  )
}

// ─── TextSkeleton ─────────────────────────────────────────────────────────────

interface TextSkeletonProps {
  /** Number of text lines to render (default: 3) */
  lines?: number
}

/**
 * Text-only skeleton — renders configurable number of animated lines.
 */
export function TextSkeleton({ lines = 3 }: TextSkeletonProps) {
  const widths = ['w-full', 'w-5/6', 'w-4/5', 'w-3/4', 'w-2/3', 'w-1/2']

  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', widths[i % widths.length])}
        />
      ))}
    </div>
  )
}

// ─── FullPageSkeleton ─────────────────────────────────────────────────────────

/**
 * Full-page loading placeholder — header bar + multiple card/list skeletons.
 */
export function FullPageSkeleton() {
  return (
    <div className="flex flex-col gap-0 animate-fade-in">
      {/* Top header bar */}
      <div className="sticky top-0 bg-[#FFFBF7] px-4 pt-12 pb-4 z-10 border-b border-warm-100">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="w-9 h-9 rounded-full" />
        </div>
      </div>

      {/* Card + list mix */}
      <div className="px-4 pt-4 space-y-4">
        <CardSkeleton />

        <div className="bg-white rounded-2xl border border-warm-100 shadow-sm divide-y divide-warm-100 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-warm-100 shadow-sm p-4">
          <Skeleton className="h-5 w-40 mb-4" />
          <TextSkeleton lines={4} />
        </div>
      </div>
    </div>
  )
}
