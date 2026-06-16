import { useRef } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { Heart, X, Star, MapPin, CheckCircle } from 'lucide-react'
import { cn, GOAL_CATEGORY_ICONS, getInitials } from '@/lib/utils'
import MatchPercentBadge from './MatchPercentBadge'
import type { DiscoverProfile } from '@/types'

interface ProfileCardProps {
  profile: DiscoverProfile
  onLike: () => void
  onPass: () => void
  onSuperLike: () => void
  isActive: boolean
  style?: React.CSSProperties
}

// Deterministic warm gradient from name
function getCardGradient(name: string): string {
  const gradients = [
    'from-orange-400 via-rose-400 to-pink-500',
    'from-amber-400 via-orange-500 to-red-400',
    'from-rose-400 via-pink-500 to-purple-400',
    'from-orange-300 via-amber-400 to-yellow-500',
    'from-red-400 via-orange-400 to-amber-400',
    'from-yellow-400 via-orange-400 to-rose-400',
    'from-pink-400 via-rose-500 to-orange-400',
    'from-amber-300 via-yellow-400 to-orange-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

const SWIPE_THRESHOLD = 80

export default function ProfileCard({
  profile,
  onLike,
  onPass,
  onSuperLike,
  isActive,
  style,
}: ProfileCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // Rotate card slightly as it's dragged
  const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18])

  // Opacity for Like/Pass overlays
  const likeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])

  const cardGradient = getCardGradient(profile.full_name)
  const initials = getInitials(profile.full_name)
  const sharedGoalsToShow = profile.shared_goals.slice(0, 3)
  const interestsToShow = profile.interests.slice(0, 4)

  function handleDragEnd() {
    const xVal = x.get()
    if (xVal > SWIPE_THRESHOLD) {
      onLike()
    } else if (xVal < -SWIPE_THRESHOLD) {
      onPass()
    }
  }

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        'absolute inset-0 w-full select-none',
        isActive ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
      )}
      style={{ x, y, rotate, ...style }}
      drag={isActive}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: isActive ? 1.02 : 1 }}
    >
      {/* Card */}
      <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl">
        {/* Background — photo or gradient */}
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div
            className={cn(
              'absolute inset-0 bg-gradient-to-br flex items-center justify-center',
              cardGradient
            )}
          >
            <span className="text-white/30 font-bold text-[120px] leading-none select-none">
              {initials}
            </span>
          </div>
        )}

        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* LIKE stamp overlay */}
        <AnimatePresence>
          <motion.div
            className="absolute top-12 left-6 z-20 border-4 border-emerald-400 rounded-xl px-4 py-2 rotate-[-15deg]"
            style={{ opacity: likeOpacity }}
          >
            <span className="text-emerald-400 font-black text-3xl tracking-widest uppercase">
              Like
            </span>
          </motion.div>
        </AnimatePresence>

        {/* PASS stamp overlay */}
        <AnimatePresence>
          <motion.div
            className="absolute top-12 right-6 z-20 border-4 border-rose-400 rounded-xl px-4 py-2 rotate-[15deg]"
            style={{ opacity: passOpacity }}
          >
            <span className="text-rose-400 font-black text-3xl tracking-widest uppercase">
              Pass
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Top: Match % badge */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <MatchPercentBadge percentage={profile.match_percentage} size="md" />
        </div>

        {/* Content at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          {/* Name, age, verified */}
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-white font-bold text-2xl leading-tight">
              {profile.full_name}
              {profile.age ? `, ${profile.age}` : ''}
            </h2>
            {profile.is_verified && (
              <CheckCircle size={20} className="text-primary-400 flex-shrink-0" strokeWidth={2.5} />
            )}
          </div>

          {/* Location */}
          {profile.location && (
            <div className="flex items-center gap-1 mb-3">
              <MapPin size={13} className="text-white/70" />
              <span className="text-white/70 text-sm">{profile.location}</span>
            </div>
          )}

          {/* Shared dreams */}
          {sharedGoalsToShow.length > 0 && (
            <div className="mb-3 bg-white/15 backdrop-blur-sm rounded-2xl px-3.5 py-2.5">
              <p className="text-white/80 text-[11px] font-semibold uppercase tracking-wider mb-1.5">
                You both want to...
              </p>
              <div className="flex flex-col gap-1">
                {sharedGoalsToShow.map(goal => (
                  <div key={goal.id} className="flex items-center gap-1.5">
                    <span className="text-sm leading-none" aria-hidden>
                      {GOAL_CATEGORY_ICONS[goal.category]}
                    </span>
                    <span className="text-white text-sm font-medium leading-snug line-clamp-1">
                      {goal.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bio excerpt */}
          {profile.bio && (
            <p className="text-white/80 text-sm leading-snug line-clamp-2 mb-3">
              {profile.bio}
            </p>
          )}

          {/* Interest chips */}
          {interestsToShow.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {interestsToShow.map(interest => (
                <span
                  key={interest}
                  className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium"
                >
                  {interest}
                </span>
              ))}
              {profile.interests.length > 4 && (
                <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                  +{profile.interests.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          {isActive && (
            <div className="flex items-center justify-center gap-5 mt-5">
              {/* Pass */}
              <button
                onClick={onPass}
                className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Pass"
              >
                <X size={24} className="text-gray-500" strokeWidth={2.5} />
              </button>

              {/* Super Like */}
              <button
                onClick={onSuperLike}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Super Like"
              >
                <Star size={18} className="text-white fill-white" strokeWidth={2} />
              </button>

              {/* Like */}
              <button
                onClick={onLike}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Like"
              >
                <Heart size={24} className="text-white fill-white" strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
