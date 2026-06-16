import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Edit2,
  Heart,
  MessageCircle,
  MapPin,
  ChevronRight,
  MoreHorizontal,
  Flag,
  CheckCircle,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn, GOAL_CATEGORY_ICONS, GOAL_CATEGORY_COLORS, getInitials } from '@/lib/utils'
import { TierBadge, VerifiedBadge, CategoryBadge } from '@/components/shared/Badge'
import MatchPercentBadge from '@/components/matching/MatchPercentBadge'
import Modal from '@/components/shared/Modal'
import type { Profile, BucketGoal, GoalCategory } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────────

interface GroupedGoals {
  category: GoalCategory
  goals: BucketGoal[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function groupGoalsByCategory(goals: BucketGoal[]): GroupedGoals[] {
  const map = new Map<GoalCategory, BucketGoal[]>()
  for (const goal of goals) {
    const arr = map.get(goal.category) ?? []
    arr.push(goal)
    map.set(goal.category, arr)
  }
  return Array.from(map.entries()).map(([category, goals]) => ({ category, goals }))
}

// ── Goal Item ─────────────────────────────────────────────────────────────────

function GoalItem({ goal }: { goal: BucketGoal }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        className={cn(
          'w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-base',
          goal.status === 'completed' ? 'bg-emerald-100' : 'bg-warm-100'
        )}
        aria-hidden
      >
        {GOAL_CATEGORY_ICONS[goal.category]}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium leading-tight',
            goal.status === 'completed'
              ? 'text-warm-400 line-through decoration-warm-300'
              : 'text-warm-900'
          )}
        >
          {goal.title}
        </p>
        {goal.status === 'completed' && goal.completed_at && (
          <p className="text-[11px] text-emerald-500 mt-0.5">
            Completed {new Date(goal.completed_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>
      {goal.status === 'completed' ? (
        <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
      ) : (
        goal.is_public ? null : (
          <Lock size={13} className="text-warm-300 flex-shrink-0" />
        )
      )}
    </div>
  )
}

// ── Report Modal ──────────────────────────────────────────────────────────────

function ReportModal({
  isOpen,
  onClose,
  targetName,
}: {
  isOpen: boolean
  onClose: () => void
  targetName: string
}) {
  const [reason, setReason] = useState('')
  const reasons = ['Inappropriate content', 'Spam or fake profile', 'Harassment', 'Other']

  async function handleSubmit() {
    // In production: insert into reports table
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Report ${targetName}`} size="md">
      <div className="px-5 py-4 space-y-3">
        <p className="text-sm text-warm-600">Why are you reporting this profile?</p>
        {reasons.map(r => (
          <button
            key={r}
            onClick={() => setReason(r)}
            className={cn(
              'flex items-center justify-between w-full px-4 py-3 rounded-xl border text-sm font-medium transition-all',
              reason === r
                ? 'border-primary-400 bg-primary-50 text-primary-700'
                : 'border-warm-200 bg-warm-50 text-warm-700'
            )}
          >
            {r}
            {reason === r && <CheckCircle size={16} className="text-primary-500" />}
          </button>
        ))}
        <button
          onClick={handleSubmit}
          disabled={!reason}
          className="w-full mt-2 py-3.5 rounded-2xl bg-rose-500 text-white font-semibold disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          Submit Report
        </button>
      </div>
    </Modal>
  )
}

// ── Profile Page ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>()
  const navigate = useNavigate()
  const { profile: currentUser } = useAuth()

  const isOwnProfile = !userId || userId === currentUser?.id
  const targetId = isOwnProfile ? currentUser?.id : userId

  const [viewedProfile, setViewedProfile] = useState<Profile | null>(
    isOwnProfile ? (currentUser ?? null) : null
  )
  const [goals, setGoals] = useState<BucketGoal[]>([])
  const [sharedGoals, setSharedGoals] = useState<BucketGoal[]>([])
  const [matchPct, setMatchPct] = useState<number | null>(null)
  const [loading, setLoading] = useState(!isOwnProfile)
  const [showOverflow, setShowOverflow] = useState(false)
  const [showReport, setShowReport] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!targetId) return
    setLoading(true)
    try {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single()

      if (p) setViewedProfile(p)

      let goalsQuery = supabase
        .from('bucket_goals')
        .select('*')
        .eq('user_id', targetId)
        .order('status')
        .order('created_at', { ascending: false })

      if (!isOwnProfile) {
        goalsQuery = goalsQuery.eq('is_public', true)
      }

      const { data: g } = await goalsQuery

      setGoals(g ?? [])

      // Compute shared goals and match % when viewing another profile
      if (!isOwnProfile && currentUser) {
        const { data: myGoals } = await supabase
          .from('bucket_goals')
          .select('title')
          .eq('user_id', currentUser.id)
          .eq('is_public', true)

        const myTitles = new Set((myGoals ?? []).map(g => g.title))
        const shared = (g ?? []).filter(goal => myTitles.has(goal.title))
        setSharedGoals(shared)

        const goalScore = shared.length > 0
          ? Math.round((shared.length / Math.max((g ?? []).length, (myGoals ?? []).length, 1)) * 60 + 40)
          : 35
        setMatchPct(Math.min(100, goalScore))
      }
    } catch {
      // Use currentUser data if DB fails
      if (isOwnProfile && currentUser) setViewedProfile(currentUser)
    } finally {
      setLoading(false)
    }
  }, [targetId, isOwnProfile, currentUser])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#FFFBF7] animate-pulse">
        <div className="h-40 bg-warm-100" />
        <div className="px-5 py-4 space-y-3">
          <div className="h-6 bg-warm-100 rounded w-40" />
          <div className="h-4 bg-warm-100 rounded w-full" />
          <div className="h-4 bg-warm-100 rounded w-3/4" />
        </div>
      </div>
    )
  }

  if (!viewedProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#FFFBF7] px-8 text-center">
        <p className="text-warm-600 text-sm">Profile not found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary-500 font-medium text-sm">
          Go back
        </button>
      </div>
    )
  }

  const initials = getInitials(viewedProfile.full_name)
  const gradient = getGradient(viewedProfile.full_name)
  const totalGoals = goals.length
  const completedGoals = goals.filter(g => g.status === 'completed').length
  const progressPct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
  const grouped = groupGoalsByCategory(goals)

  return (
    <div className="flex flex-col h-full bg-[#FFFBF7]">
      {/* Top actions */}
      <div className="flex items-center justify-between px-4 pt-safe-top pt-3 pb-2 flex-shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="text-warm-600 text-sm font-medium active:text-warm-900 transition-colors"
        >
          ← Back
        </button>
        {!isOwnProfile && (
          <button
            onClick={() => setShowOverflow(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-warm-100 active:bg-warm-200 transition-colors"
            aria-label="More options"
          >
            <MoreHorizontal size={18} className="text-warm-700" />
          </button>
        )}
        {isOwnProfile && (
          <button
            onClick={() => navigate('/app/edit-profile')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warm-100 text-warm-700 text-sm font-medium active:bg-warm-200 transition-colors"
          >
            <Edit2 size={13} />
            Edit
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Hero avatar area */}
        <div className="px-5 pt-2 pb-5 flex flex-col items-center text-center">
          <div className="relative mb-4">
            {viewedProfile.avatar_url ? (
              <img
                src={viewedProfile.avatar_url}
                alt={viewedProfile.full_name}
                className="w-28 h-28 rounded-full object-cover ring-4 ring-white shadow-md"
              />
            ) : (
              <div
                className={cn(
                  'w-28 h-28 rounded-full bg-gradient-to-br flex items-center justify-center ring-4 ring-white shadow-md',
                  gradient
                )}
              >
                <span className="text-white font-bold text-3xl">{initials}</span>
              </div>
            )}
            {isOwnProfile && (
              <button
                onClick={() => navigate('/app/edit-profile')}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center shadow-md active:bg-primary-600 transition-colors"
                aria-label="Change photo"
              >
                <Edit2 size={14} className="text-white" />
              </button>
            )}
          </div>

          {/* Name + verified */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <h1 className="text-2xl font-bold text-warm-900">
              {viewedProfile.full_name}
              {viewedProfile.age ? `, ${viewedProfile.age}` : ''}
            </h1>
            {viewedProfile.is_verified && (
              <VerifiedBadge size={18} />
            )}
          </div>

          {/* Username */}
          <p className="text-warm-500 text-sm mb-2">@{viewedProfile.username}</p>

          {/* Location */}
          {viewedProfile.location && (
            <div className="flex items-center gap-1 mb-3">
              <MapPin size={13} className="text-warm-400" />
              <span className="text-warm-500 text-sm">{viewedProfile.location}</span>
            </div>
          )}

          {/* Tier badge (own) or match % (other) */}
          <div className="flex items-center gap-2 mb-4">
            {isOwnProfile ? (
              <TierBadge tier={viewedProfile.subscription_tier} />
            ) : (
              matchPct !== null && (
                <MatchPercentBadge percentage={matchPct} size="md" />
              )
            )}
          </div>

          {/* Bio */}
          {viewedProfile.bio && (
            <p className="text-warm-700 text-sm leading-relaxed text-center max-w-[300px]">
              {viewedProfile.bio}
            </p>
          )}

          {/* Action buttons for other user */}
          {!isOwnProfile && (
            <div className="flex gap-3 mt-5">
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 text-white font-semibold shadow-md active:scale-[0.97] transition-transform"
              >
                <Heart size={18} className="fill-white" />
                Like
              </button>
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-primary-500 to-orange-400 text-white font-semibold shadow-md active:scale-[0.97] transition-transform"
              >
                <MessageCircle size={18} />
                Message
              </button>
            </div>
          )}
        </div>

        {/* Shared goals section (only for other user) */}
        {!isOwnProfile && sharedGoals.length > 0 && (
          <div className="mx-5 mb-5 bg-orange-50 border border-orange-100 rounded-2xl p-4">
            <p className="text-sm font-semibold text-orange-700 mb-3">
              ✨ You both want to...
            </p>
            <div className="space-y-0 divide-y divide-orange-100">
              {sharedGoals.slice(0, 5).map(goal => (
                <div key={goal.id} className="flex items-center gap-2.5 py-2">
                  <span className="text-base" aria-hidden>{GOAL_CATEGORY_ICONS[goal.category]}</span>
                  <span className="text-sm text-warm-800 font-medium">{goal.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress (own profile) */}
        {isOwnProfile && totalGoals > 0 && (
          <div className="mx-5 mb-5 bg-white rounded-2xl border border-warm-100 p-4 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-warm-800">Bucket List Progress</span>
              <span className="text-sm font-bold text-primary-500">
                {completedGoals}/{totalGoals}
              </span>
            </div>
            <div className="h-2 bg-warm-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-orange-400 rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-warm-400 mt-1.5">{progressPct}% complete</p>
          </div>
        )}

        {/* Goals by category */}
        {grouped.length > 0 && (
          <div className="px-5 pb-8">
            <h2 className="text-base font-bold text-warm-900 mb-3">
              {isOwnProfile ? 'My Bucket List' : `${viewedProfile.full_name.split(' ')[0]}'s Dreams`}
            </h2>
            <div className="space-y-4">
              {grouped.map(({ category, goals: catGoals }) => (
                <div key={category} className="bg-white rounded-2xl border border-warm-100 shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-warm-50">
                    <span className="text-base" aria-hidden>{GOAL_CATEGORY_ICONS[category]}</span>
                    <span className="text-sm font-semibold text-warm-800">{category}</span>
                    <span className="ml-auto text-xs text-warm-400">{catGoals.length}</span>
                  </div>
                  <div className="px-4 divide-y divide-warm-50">
                    {catGoals.map(goal => (
                      <GoalItem key={goal.id} goal={goal} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {isOwnProfile && (
              <button
                onClick={() => navigate('/app/goals')}
                className="w-full mt-4 py-3 rounded-2xl border-2 border-dashed border-primary-200 text-primary-500 text-sm font-semibold active:bg-primary-50 transition-colors"
              >
                + Add a new dream
              </button>
            )}
          </div>
        )}

        {/* Interests */}
        {viewedProfile.interests.length > 0 && (
          <div className="px-5 pb-8">
            <h2 className="text-base font-bold text-warm-900 mb-3">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {viewedProfile.interests.map(interest => (
                <span
                  key={interest}
                  className="px-3 py-1.5 rounded-full bg-warm-100 text-warm-700 text-sm font-medium"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Overflow menu (other user) */}
      <Modal
        isOpen={showOverflow}
        onClose={() => setShowOverflow(false)}
        size="sm"
      >
        <div className="px-4 py-3">
          <button
            onClick={() => {
              setShowOverflow(false)
              setShowReport(true)
            }}
            className="flex items-center gap-3 w-full px-3 py-3.5 rounded-xl text-rose-600 active:bg-rose-50 transition-colors"
          >
            <Flag size={18} />
            <span className="text-sm font-medium">Report {viewedProfile.full_name.split(' ')[0]}</span>
          </button>
        </div>
      </Modal>

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetName={viewedProfile.full_name.split(' ')[0]}
      />
    </div>
  )
}
