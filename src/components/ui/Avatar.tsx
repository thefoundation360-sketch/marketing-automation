import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: AvatarSize;
  verified?: boolean;
  online?: boolean;
  className?: string;
  onClick?: () => void;
}

const sizeConfig: Record<
  AvatarSize,
  {
    container: string;
    img: string;
    initials: string;
    onlineDot: string;
    verifiedBadge: string;
    verifiedIcon: string;
  }
> = {
  sm: {
    container: 'w-8 h-8',
    img: 'w-8 h-8',
    initials: 'text-xs',
    onlineDot: 'w-2 h-2 border border-white',
    verifiedBadge: 'w-4 h-4',
    verifiedIcon: 'w-3 h-3',
  },
  md: {
    container: 'w-11 h-11',
    img: 'w-11 h-11',
    initials: 'text-sm',
    onlineDot: 'w-2.5 h-2.5 border border-white',
    verifiedBadge: 'w-5 h-5',
    verifiedIcon: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'w-16 h-16',
    img: 'w-16 h-16',
    initials: 'text-xl',
    onlineDot: 'w-3 h-3 border-[1.5px] border-white',
    verifiedBadge: 'w-6 h-6',
    verifiedIcon: 'w-4 h-4',
  },
  xl: {
    container: 'w-24 h-24',
    img: 'w-24 h-24',
    initials: 'text-3xl',
    onlineDot: 'w-4 h-4 border-2 border-white',
    verifiedBadge: 'w-8 h-8',
    verifiedIcon: 'w-5 h-5',
  },
};

// Deterministic color bucket from name
function getInitialsColor(name: string): string {
  const colors = [
    'bg-orange-400',
    'bg-amber-400',
    'bg-rose-400',
    'bg-pink-400',
    'bg-violet-400',
    'bg-indigo-400',
    'bg-teal-400',
    'bg-emerald-400',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Avatar({
  src,
  name,
  size = 'md',
  verified = false,
  online = false,
  className,
  onClick,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const cfg = sizeConfig[size];

  const showImage = src && !imgError;
  const initials = name ? getInitials(name) : '?';
  const bgColor = name ? getInitialsColor(name) : 'bg-gray-300';

  const Wrapper = onClick ? 'button' : 'div';
  const wrapperProps = onClick
    ? {
        onClick,
        type: 'button' as const,
        className: clsx(
          'relative inline-flex shrink-0 rounded-full cursor-pointer',
          cfg.container,
          className
        ),
      }
    : {
        className: clsx(
          'relative inline-flex shrink-0 rounded-full',
          cfg.container,
          className
        ),
      };

  return (
    <Wrapper {...wrapperProps}>
      {showImage ? (
        <img
          src={src}
          alt={name ?? 'User avatar'}
          onError={() => setImgError(true)}
          className={clsx(
            'rounded-full object-cover shrink-0',
            cfg.img
          )}
          draggable={false}
        />
      ) : (
        <span
          className={clsx(
            'flex items-center justify-center rounded-full font-bold text-white select-none',
            cfg.img,
            bgColor
          )}
          aria-label={name ?? 'User'}
        >
          <span className={cfg.initials}>{initials}</span>
        </span>
      )}

      {/* Online dot — bottom-right */}
      {online && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full bg-green-400 shrink-0',
            cfg.onlineDot
          )}
          aria-label="Online"
        />
      )}

      {/* Verified badge — top-right (overrides online dot position if both present) */}
      {verified && (
        <span
          className={clsx(
            'absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full bg-orange-500',
            cfg.verifiedBadge
          )}
          aria-label="Verified"
        >
          <CheckCircle2 className={clsx('text-white', cfg.verifiedIcon)} strokeWidth={2.5} />
        </span>
      )}
    </Wrapper>
  );
}


