import { clsx } from 'clsx';

type SkeletonVariant = 'text' | 'card' | 'avatar' | 'goal-card';

interface SkeletonProps {
  variant?: SkeletonVariant;
  /** Number of text line rows (only for variant='text'). Default 3. */
  lines?: number;
  /** Custom className for the outermost element */
  className?: string;
  /** Used for avatar size override */
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const shimmerBase =
  'bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:1000px_100%] animate-shimmer';

function Shimmer({ className }: { className: string }) {
  return <div className={clsx(shimmerBase, 'rounded-lg', className)} />;
}

const avatarSizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-11 h-11',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

function TextSkeleton({ lines = 3 }: { lines?: number }) {
  const widths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-2/3'];
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer
          key={i}
          className={clsx(
            'h-3.5',
            i === lines - 1 ? widths[2] : widths[i % widths.length]
          )}
        />
      ))}
    </div>
  );
}

function AvatarSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return (
    <div
      className={clsx(
        shimmerBase,
        'rounded-full shrink-0',
        avatarSizeClasses[size]
      )}
    />
  );
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 w-full">
      {/* Avatar + header row */}
      <div className="flex items-center gap-3 mb-4">
        <div className={clsx(shimmerBase, 'rounded-full w-11 h-11 shrink-0')} />
        <div className="flex-1 flex flex-col gap-2">
          <Shimmer className="h-3.5 w-32" />
          <Shimmer className="h-3 w-24" />
        </div>
      </div>
      {/* Content lines */}
      <div className="flex flex-col gap-2.5 mb-4">
        <Shimmer className="h-3.5 w-full" />
        <Shimmer className="h-3.5 w-5/6" />
        <Shimmer className="h-3.5 w-4/6" />
      </div>
      {/* Action row */}
      <div className="flex gap-3 mt-4 pt-3 border-t border-gray-50">
        <Shimmer className="h-8 flex-1 rounded-xl" />
        <Shimmer className="h-8 flex-1 rounded-xl" />
      </div>
    </div>
  );
}

function GoalCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 w-full">
      {/* Category badge */}
      <div className="flex items-center justify-between mb-3">
        <Shimmer className="h-6 w-24 rounded-full" />
        <Shimmer className="h-6 w-6 rounded-full" />
      </div>
      {/* Title */}
      <Shimmer className="h-5 w-3/4 mb-2" />
      {/* Description */}
      <div className="flex flex-col gap-2 mb-4">
        <Shimmer className="h-3.5 w-full" />
        <Shimmer className="h-3.5 w-5/6" />
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-8 w-24 rounded-xl" />
      </div>
    </div>
  );
}

export default function Skeleton({
  variant = 'text',
  lines = 3,
  size = 'md',
  className,
}: SkeletonProps) {
  switch (variant) {
    case 'avatar':
      return (
        <div className={className}>
          <AvatarSkeleton size={size} />
        </div>
      );
    case 'card':
      return (
        <div className={clsx('w-full', className)}>
          <CardSkeleton />
        </div>
      );
    case 'goal-card':
      return (
        <div className={clsx('w-full', className)}>
          <GoalCardSkeleton />
        </div>
      );
    case 'text':
    default:
      return (
        <div className={clsx('w-full', className)}>
          <TextSkeleton lines={lines} />
        </div>
      );
  }
}

/** Convenience: render N skeleton cards stacked */
export function SkeletonList({
  count = 3,
  variant = 'card',
}: {
  count?: number;
  variant?: Extract<SkeletonVariant, 'card' | 'goal-card'>;
}) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant={variant} />
      ))}
    </div>
  );
}
