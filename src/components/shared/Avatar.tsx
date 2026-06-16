import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  url?: string | null
  name: string
  size?: AvatarSize
  showBadge?: boolean
  className?: string
}

const SIZE_CLASSES: Record<AvatarSize, string> = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-24 h-24 text-xl',
}

const BADGE_CLASSES: Record<AvatarSize, string> = {
  xs: 'w-3 h-3 -bottom-0.5 -right-0.5',
  sm: 'w-4 h-4 -bottom-0.5 -right-0.5',
  md: 'w-5 h-5 bottom-0 right-0',
  lg: 'w-5 h-5 bottom-0 right-0',
  xl: 'w-7 h-7 bottom-0.5 right-0.5',
}

// Deterministic warm gradient from name initials
function getGradient(name: string): string {
  const gradients = [
    'from-orange-400 to-rose-400',
    'from-amber-400 to-orange-500',
    'from-rose-400 to-pink-500',
    'from-orange-300 to-amber-500',
    'from-red-400 to-orange-400',
    'from-yellow-400 to-orange-400',
    'from-pink-400 to-rose-500',
    'from-amber-300 to-yellow-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

export default function Avatar({
  url,
  name,
  size = 'md',
  showBadge = false,
  className,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const initials = getInitials(name)
  const gradient = getGradient(name)
  const showImage = Boolean(url) && !imgError

  return (
    <div className={cn('relative flex-shrink-0 inline-flex', className)}>
      {showImage ? (
        <img
          src={url!}
          alt={name}
          onError={() => setImgError(true)}
          className={cn(
            'rounded-full object-cover ring-2 ring-white select-none',
            SIZE_CLASSES[size]
          )}
          draggable={false}
        />
      ) : (
        <div
          aria-label={name}
          className={cn(
            'rounded-full flex items-center justify-center bg-gradient-to-br ring-2 ring-white select-none',
            SIZE_CLASSES[size],
            gradient
          )}
        >
          <span className="font-semibold text-white leading-none tracking-wide">
            {initials}
          </span>
        </div>
      )}

      {showBadge && (
        <span
          className={cn(
            'absolute flex items-center justify-center bg-white rounded-full shadow-sm',
            BADGE_CLASSES[size]
          )}
          aria-label="Verified"
        >
          <CheckCircle
            className="text-primary-500 w-full h-full"
            strokeWidth={2.5}
          />
        </span>
      )}
    </div>
  )
}
