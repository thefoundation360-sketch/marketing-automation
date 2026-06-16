import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, Zap, X, Star } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useAppStore } from '@/store/useAppStore'
import { cn, GOAL_CATEGORIES, TIER_LIMITS } from '@/lib/utils'
import ProfileCard from '@/components/matching/ProfileCard'
import Modal from '@/components/shared/Modal'
import type { GoalCategory } from '@/types'

// ── Filter Modal ──────────────────────────────────────────────────────────────

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
}

function FilterModal({ isOpen, onClose }: FilterModalProps) {
  const { filters, setFilters } = useAppStore()
  const [localFilters, setLocalFilters] = useState(filters)

  // Sync when opened
  useEffect(() => {
    if (isOpen) setLocalFilters(filters)
  }, [isOpen, filters])

  function toggleCategory(cat: GoalCategory) {
    setLocalFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }))
  }

  function handleApply() {
    setFilters(localFilters)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Filter Profiles" size="lg">
      <div className="px-5 py-4 space-y-6">
        {/* Distance */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-warm-800">Max Distance</label>
            <span className="text-sm font-bold text-primary-500">{localFilters.maxDistance} mi</span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={localFilters.maxDistance}
            onChange={e => setLocalFilters(prev => ({ ...prev, maxDistance: Number(e.target.value) }))}
            className="w-full accent-orange-500"
          />
          <div className="flex justify-between text-xs text-warm-400 mt-1">
            <span>5 mi</span>
            <span>100 mi</span>
          </div>
        </div>

        {/* Age range */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-warm-800">Age Range</label>
            <span className="text-sm font-bold text-primary-500">
              {localFilters.ageMin}–{localFilters.ageMax}
            </span>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-xs text-warm-500 mb-1 block">Min age: {localFilters.ageMin}</span>
              <input
                type="range"
                min={18}
                max={localFilters.ageMax - 1}
                step={1}
                value={localFilters.ageMin}
                onChange={e => setLocalFilters(prev => ({ ...prev, ageMin: Number(e.target.value) }))}
                className="w-full accent-orange-500"
              />
            </div>
            <div>
              <span className="text-xs text-warm-500 mb-1 block">Max age: {localFilters.ageMax}</span>
              <input
                type="range"
                min={localFilters.ageMin + 1}
                max={65}
                step={1}
                value={localFilters.ageMax}
                onChange={e => setLocalFilters(prev => ({ ...prev, ageMax: Number(e.target.value) }))}
                className="w-full accent-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="text-sm font-semibold text-warm-800 mb-3 block">
            Dream Categories
          </label>
          <div className="grid grid-cols-2 gap-2">
            {GOAL_CATEGORIES.map(cat => {
              const active = localFilters.categories.includes(cat)
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all',
                    active
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'bg-warm-50 border-warm-200 text-warm-700'
                  )}
                >
                  <span aria-hidden className="text-base leading-none">
                    {({ Travel: '✈️', Adventure: '🧗', Food: '🍜', Creative: '🎨', Wellness: '🧘', Philanthropy: '❤️', Career: '🚀', Relationships: '👥' } as Record<string, string>)[cat]}
                  </span>
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        <button
          onClick={handleApply}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary-500 to-orange-400 text-white font-semibold text-base shadow-orange active:scale-[0.98] transition-transform"
        >
          Apply Filters
        </button>
      </div>
    </Modal>
  )
}

// ── Upgrade Prompt Modal ──────────────────────────────────────────────────────

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
}

function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="px-6 py-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center mx-auto mb-4">
          <Zap size={32} className="text-white fill-white" />
        </div>
        <h3 className="text-xl font-bold text-warm-900 mb-2">You're on fire!</h3>
        <p className="text-warm-600 text-sm mb-1">
          You've used all <strong>5 free swipes</strong> for today.
        </p>
        <p className="text-warm-500 text-sm mb-6">
          Upgrade to Premium for unlimited swipes and exclusive features.
        </p>
        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary-500 to-orange-400 text-white font-semibold shadow-orange active:scale-[0.98] transition-transform"
          >
            Upgrade to Premium
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-warm-500 text-sm font-medium"
          >
            Come back tomorrow
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── No More Profiles State ────────────────────────────────────────────────────

function EmptyDiscover({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <div className="w-20 h-20 rounded-full bg-warm-100 flex items-center justify-center mb-4">
        <Star size={36} className="text-primary-400" />
      </div>
      <h3 className="text-xl font-bold text-warm-900 mb-2">You've seen everyone!</h3>
      <p className="text-warm-500 text-sm mb-6">
        Check back later for new dreamers, or expand your filters to see more profiles.
      </p>
      <button
        onClick={onReset}
        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary-500 to-orange-400 text-white font-semibold shadow-orange active:scale-[0.98] transition-transform"
      >
        Reload profiles
      </button>
    </div>
  )
}

// ── Discover Page ─────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const { profile } = useAuth()
  const {
    discoverProfiles,
    currentIndex,
    isLoadingProfiles,
    loadProfiles,
    likeProfile,
    passProfile,
    resetDiscover,
  } = useAppStore()

  const [showFilters, setShowFilters] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [swipesToday, setSwipesToday] = useState(profile?.swipes_today ?? 0)
  const [exitDir, setExitDir] = useState<'left' | 'right' | null>(null)

  const isFree = profile?.subscription_tier === 'free'
  const swipeLimit = TIER_LIMITS[profile?.subscription_tier ?? 'free'].swipes
  const swipesLeft = isFree ? Math.max(0, swipeLimit - swipesToday) : Infinity

  useEffect(() => {
    if (profile?.id) {
      loadProfiles(profile.id)
    }
  }, [profile?.id, loadProfiles])

  const currentProfile = discoverProfiles[currentIndex] ?? null
  const nextProfile = discoverProfiles[currentIndex + 1] ?? null

  function checkSwipeLimit(): boolean {
    if (isFree && swipesToday >= swipeLimit) {
      setShowUpgrade(true)
      return false
    }
    return true
  }

  const handleLike = useCallback(() => {
    if (!checkSwipeLimit() || !currentProfile || !profile) return
    setExitDir('right')
    setSwipesToday(n => n + 1)
    setTimeout(() => {
      likeProfile(currentProfile.id, profile.id)
      setExitDir(null)
    }, 300)
  }, [currentProfile, profile, swipesToday, swipeLimit, isFree, likeProfile])

  const handlePass = useCallback(() => {
    if (!checkSwipeLimit() || !currentProfile || !profile) return
    setExitDir('left')
    setSwipesToday(n => n + 1)
    setTimeout(() => {
      passProfile(currentProfile.id, profile.id)
      setExitDir(null)
    }, 300)
  }, [currentProfile, profile, swipesToday, swipeLimit, isFree, passProfile])

  const handleSuperLike = useCallback(() => {
    if (!profile) return
    if (profile.subscription_tier === 'free') {
      setShowUpgrade(true)
      return
    }
    handleLike()
  }, [profile, handleLike])

  const noMoreProfiles = !isLoadingProfiles && currentIndex >= discoverProfiles.length

  return (
    <div className="flex flex-col h-full bg-[#FFFBF7]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-safe-top pt-4 pb-3 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Discover</h1>
          {isFree && swipesLeft !== Infinity && (
            <p className="text-xs text-warm-500 mt-0.5">
              {swipesLeft > 0 ? `${swipesLeft} swipe${swipesLeft !== 1 ? 's' : ''} left today` : 'No swipes left today'}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowFilters(true)}
          className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center active:bg-warm-200 transition-colors"
          aria-label="Open filters"
        >
          <SlidersHorizontal size={18} className="text-warm-700" />
        </button>
      </div>

      {/* Card area */}
      <div className="flex-1 px-4 pb-4 min-h-0">
        {isLoadingProfiles ? (
          <div className="w-full h-full rounded-3xl bg-warm-100 animate-pulse" />
        ) : noMoreProfiles ? (
          <EmptyDiscover onReset={resetDiscover} />
        ) : (
          <div className="relative w-full h-full">
            {/* Next card (stack effect) */}
            {nextProfile && (
              <div
                className="absolute inset-0 scale-[0.95] origin-bottom"
                style={{ zIndex: 0 }}
              >
                <ProfileCard
                  profile={nextProfile}
                  onLike={() => {}}
                  onPass={() => {}}
                  onSuperLike={() => {}}
                  isActive={false}
                />
              </div>
            )}

            {/* Current card */}
            <AnimatePresence>
              {currentProfile && (
                <motion.div
                  key={currentProfile.id}
                  className="absolute inset-0"
                  style={{ zIndex: 1 }}
                  initial={{ opacity: 1, x: 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{
                    x: exitDir === 'right' ? 500 : exitDir === 'left' ? -500 : 0,
                    opacity: 0,
                    transition: { duration: 0.3 },
                  }}
                >
                  <ProfileCard
                    profile={currentProfile}
                    onLike={handleLike}
                    onPass={handlePass}
                    onSuperLike={handleSuperLike}
                    isActive
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Free swipe counter bar */}
      {isFree && !noMoreProfiles && (
        <div className="px-5 pb-safe-bottom pb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-warm-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-orange-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(0, (swipesLeft / swipeLimit) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-warm-500 font-medium w-16 text-right">
              {swipesLeft === Infinity ? '∞' : swipesLeft} / {swipeLimit}
            </span>
          </div>
        </div>
      )}

      <FilterModal isOpen={showFilters} onClose={() => setShowFilters(false)} />
      <UpgradeModal isOpen={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  )
}
