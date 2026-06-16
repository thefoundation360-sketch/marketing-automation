import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Share2, Check, Edit3, Trash2, Plus, Camera,
  Users, CheckCircle, AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/shared/Modal'
import { cn, formatDate, formatTimeAgo, GOAL_CATEGORY_COLORS, GOAL_CATEGORY_ICONS, getInitials } from '@/lib/utils'
import type { BucketGoal, Profile, GoalCategory } from '@/types'

// ── Local Types ───────────────────────────────────────────────────────────────

interface GoalWithProfile extends BucketGoal {
  profile?: Pick<Profile, 'full_name' | 'avatar_url' | 'username' | 'id'>
}

interface GoalWanter {
  user_id: string
  profile: Pick<Profile, 'full_name' | 'avatar_url' | 'username' | 'id'>
}

// ── Status Chip ───────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: BucketGoal['status'] }) {
  const CONFIG: Record<BucketGoal['status'], { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    completed: { label: 'Completed ✓', cls: 'bg-green-100 text-green-700 border-green-200' },
    paused: { label: 'Paused', cls: 'bg-warm-100 text-warm-600 border-warm-200' },
  }
  const { label, cls } = CONFIG[status]
  return (
    <span className={cn('inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full border', cls)}>
      {label}
    </span>
  )
}

// ── Category Badge ────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: GoalCategory }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-full', GOAL_CATEGORY_COLORS[category])}>
      <span>{GOAL_CATEGORY_ICONS[category]}</span>
      {category}
    </span>
  )
}

// ── User Avatar ───────────────────────────────────────────────────────────────

function UserAvatar({ url, name, size = 36 }: { url?: string | null; name: string; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-orange-300 to-amber-400 flex items-center justify-center text-white font-bold flex-shrink-0 border-2 border-white shadow-sm"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {getInitials(name)}
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function ToastBanner({ message }: { message: string }) {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-warm-900 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap">
      <Check size={14} className="text-green-400" /> {message}
    </div>
  )
}

// ── Edit Goal Modal ───────────────────────────────────────────────────────────

const CATEGORIES: GoalCategory[] = [
  'Travel', 'Adventure', 'Food', 'Creative',
  'Wellness', 'Philanthropy', 'Career', 'Relationships',
]

interface EditGoalModalProps {
  isOpen: boolean
  onClose: () => void
  goal: BucketGoal
  onSaved: (updated: BucketGoal) => void
}

function EditGoalModal({ isOpen, onClose, goal, onSaved }: EditGoalModalProps) {
  const [title, setTitle] = useState(goal.title)
  const [description, setDescription] = useState(goal.description ?? '')
  const [category, setCategory] = useState<GoalCategory>(goal.category)
  const [isPublic, setIsPublic] = useState(goal.is_public)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setTitle(goal.title)
      setDescription(goal.description ?? '')
      setCategory(goal.category)
      setIsPublic(goal.is_public)
      setError(null)
    }
  }, [isOpen, goal])

  async function handleSave() {
    if (!title.trim()) { setError('Title is required'); return }
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('bucket_goals')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          category,
          is_public: isPublic,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goal.id)
        .select()
        .single()
      if (err) throw err
      onSaved(data as BucketGoal)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update goal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Goal" size="lg">
      <div className="px-5 py-4 space-y-4">
        <div>
          <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5 block">
            Goal Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5 block">
            Description
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Describe your dream goal…"
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide mb-2 block">
            Category
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-medium border transition-all',
                  category === cat
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-warm-50 border-warm-200 text-warm-700'
                )}
              >
                {GOAL_CATEGORY_ICONS[cat]} {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between bg-warm-50 rounded-xl p-3.5 border border-warm-200">
          <div>
            <p className="text-sm font-semibold text-warm-800">Public Goal</p>
            <p className="text-xs text-warm-500 mt-0.5">Allow others to see and share this goal</p>
          </div>
          <button
            onClick={() => setIsPublic(v => !v)}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
              isPublic ? 'bg-orange-500' : 'bg-warm-300'
            )}
          >
            <span className={cn(
              'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
              isPublic ? 'translate-x-6' : 'translate-x-1'
            )} />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={!title.trim() || loading}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-semibold text-sm disabled:opacity-60 active:scale-[0.98] transition-transform"
        >
          {loading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  )
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────

function DeleteModal({ isOpen, onClose, onConfirm }: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    try { await onConfirm() } finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Goal?" size="sm">
      <div className="px-5 py-5 space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 leading-relaxed">
            This will permanently remove this goal from your bucket list. This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-warm-100 text-warm-700 text-sm font-semibold active:bg-warm-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handle}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold active:bg-red-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Mark Complete Modal ───────────────────────────────────────────────────────

function MarkCompleteModal({ isOpen, onClose, onConfirm }: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    try { await onConfirm() } finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="px-5 py-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-warm-900 mb-1">You did it! 🎉</h3>
          <p className="text-sm text-warm-600">
            Mark this goal as completed and celebrate your achievement!
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-warm-100 text-warm-700 text-sm font-semibold active:bg-warm-200 transition-colors"
          >
            Not yet
          </button>
          <button
            onClick={handle}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-green-500 text-white text-sm font-semibold active:bg-green-600 transition-colors disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Mark Complete!'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GoalDetailPage() {
  const { goalId } = useParams<{ goalId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [goal, setGoal] = useState<GoalWithProfile | null>(null)
  const [wanters, setWanters] = useState<GoalWanter[]>([])
  const [matchPercent, setMatchPercent] = useState<number | null>(null)
  const [hasGoal, setHasGoal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showComplete, setShowComplete] = useState(false)

  const [toast, setToast] = useState<string | null>(null)
  const [addingToList, setAddingToList] = useState(false)

  const isOwner = goal?.user_id === user?.id

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const fetchGoal = useCallback(async () => {
    if (!goalId) return
    setLoading(true)
    setError(null)
    try {
      const { data: goalData, error: goalErr } = await supabase
        .from('bucket_goals')
        .select('*, profile:profiles!user_id(full_name, avatar_url, username, id)')
        .eq('id', goalId)
        .single()

      if (goalErr) throw goalErr
      const typedGoal = goalData as GoalWithProfile
      setGoal(typedGoal)

      // Check if current user already has a goal with this title
      if (user?.id && typedGoal) {
        const { count } = await supabase
          .from('bucket_goals')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('title', typedGoal.title)
        setHasGoal((count ?? 0) > 0)
      }

      // Fetch other users who have goals with the same title
      if (typedGoal) {
        const { data: wantersData } = await supabase
          .from('bucket_goals')
          .select('user_id, profile:profiles!user_id(full_name, avatar_url, username, id)')
          .eq('title', typedGoal.title)
          .eq('is_public', true)
          .neq('user_id', user?.id ?? 'none')
          .limit(20)

        const typed = (wantersData ?? []) as unknown as GoalWanter[]
        setWanters(typed)

        // Calculate what % of user's matches share this goal
        if (user?.id) {
          const { data: matches } = await supabase
            .from('matches')
            .select('user_a_id, user_b_id')
            .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
            .eq('status', 'matched')
            .limit(100)

          if (matches && matches.length > 0) {
            const matchUserIds = (matches as { user_a_id: string; user_b_id: string }[]).map(m =>
              m.user_a_id === user.id ? m.user_b_id : m.user_a_id
            )
            const wanterIdSet = new Set(typed.map(w => w.user_id))
            const overlap = matchUserIds.filter(id => wanterIdSet.has(id)).length
            setMatchPercent(Math.round((overlap / matchUserIds.length) * 100))
          } else {
            setMatchPercent(null)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching goal', err)
      setError('Goal not found or you don\'t have access.')
    } finally {
      setLoading(false)
    }
  }, [goalId, user?.id])

  useEffect(() => {
    fetchGoal()
  }, [fetchGoal])

  async function handleMarkComplete() {
    if (!goal) return
    const { data } = await supabase
      .from('bucket_goals')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', goal.id)
      .select()
      .single()
    setGoal(g => g ? { ...g, ...(data as BucketGoal) } : g)
    setShowComplete(false)
    showToast('Goal marked as complete! 🎉')
  }

  async function handleDelete() {
    if (!goal) return
    await supabase.from('bucket_goals').delete().eq('id', goal.id)
    navigate(-1)
  }

  async function handleAddToMyList() {
    if (!user?.id || !goal) return
    setAddingToList(true)
    try {
      await supabase.from('bucket_goals').insert({
        user_id: user.id,
        title: goal.title,
        description: goal.description,
        category: goal.category,
        is_public: true,
        status: 'active',
      })
      setHasGoal(true)
      showToast('Added to your bucket list!')
    } catch (err) {
      console.error('Failed to add goal', err)
    } finally {
      setAddingToList(false)
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/app/goals/${goalId}`
    try {
      if (navigator.share) {
        await navigator.share({ title: goal?.title ?? 'Check out this goal on DreamMatch', url })
      } else {
        await navigator.clipboard.writeText(url)
        showToast('Link copied to clipboard!')
      }
    } catch {
      try {
        await navigator.clipboard.writeText(url)
        showToast('Link copied!')
      } catch {
        // silently fail
      }
    }
  }

  // ── Loading ──

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#FFFBF7]">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center flex-shrink-0">
            <ArrowLeft size={18} className="text-warm-700" />
          </button>
          <div className="h-5 bg-warm-200 rounded-lg w-32 animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-3 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // ── Error ──

  if (error || !goal) {
    return (
      <div className="flex flex-col h-full bg-[#FFFBF7] items-center justify-center px-6 text-center">
        <div className="text-4xl mb-3">🎯</div>
        <h2 className="text-lg font-bold text-warm-900 mb-2">{error ?? 'Goal not found'}</h2>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-5 py-2.5 rounded-xl bg-orange-500 text-white font-semibold text-sm active:scale-[0.98] transition-transform"
        >
          Go Back
        </button>
      </div>
    )
  }

  const isCompleted = goal.status === 'completed'

  return (
    <div className="flex flex-col h-full bg-[#FFFBF7] overflow-y-auto">
      {/* Top nav */}
      <div className="flex-shrink-0 px-5 pt-6 pb-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center active:bg-warm-200 transition-colors"
        >
          <ArrowLeft size={18} className="text-warm-700" />
        </button>
        <button
          onClick={handleShare}
          className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center active:bg-warm-200 transition-colors"
          aria-label="Share goal"
        >
          <Share2 size={16} className="text-warm-700" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-28 space-y-5">

        {/* Main goal card */}
        <div className="bg-white rounded-3xl border border-warm-100 shadow-sm p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="text-xl font-extrabold text-warm-900 leading-tight flex-1">{goal.title}</h1>
            <StatusChip status={goal.status} />
          </div>

          <div className="mb-4">
            <CategoryBadge category={goal.category} />
          </div>

          {goal.description && (
            <p className="text-sm text-warm-600 leading-relaxed mb-4">{goal.description}</p>
          )}

          {/* Author (for non-owner views) */}
          {goal.profile && !isOwner && (
            <button
              onClick={() => navigate(`/app/profile/${goal.profile!.id}`)}
              className="flex items-center gap-2.5 pt-3 border-t border-warm-100 w-full text-left active:opacity-70 transition-opacity"
            >
              <UserAvatar url={goal.profile.avatar_url} name={goal.profile.full_name} size={28} />
              <div>
                <p className="text-xs text-warm-500">Added by</p>
                <p className="text-sm font-semibold text-warm-800">{goal.profile.full_name}</p>
              </div>
            </button>
          )}
        </div>

        {/* Completion details */}
        {isCompleted && goal.completed_at && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={18} className="text-green-500" />
              <span className="font-semibold text-green-800 text-sm">Goal Achieved!</span>
            </div>
            <p className="text-sm text-green-700">
              Completed on <strong>{formatDate(goal.completed_at)}</strong>
            </p>
            {goal.proof_photo_url ? (
              <img
                src={goal.proof_photo_url}
                alt="Proof of completion"
                className="mt-3 w-full rounded-xl object-cover max-h-48"
              />
            ) : isOwner && (
              <button className="mt-3 w-full bg-green-100 border-2 border-dashed border-green-300 rounded-xl p-5 flex flex-col items-center text-center active:bg-green-200 transition-colors">
                <Camera size={22} className="text-green-500 mb-1.5" />
                <p className="text-xs text-green-700 font-semibold">Add proof photo</p>
                <p className="text-xs text-green-600 mt-0.5">Show the world you did it!</p>
              </button>
            )}
          </div>
        )}

        {/* Match % card */}
        {matchPercent !== null && !isOwner && (
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-warm-800">Matches who share this goal</p>
              <span className="text-xl font-extrabold text-orange-600">{matchPercent}%</span>
            </div>
            <div className="h-2.5 bg-orange-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${matchPercent}%` }}
              />
            </div>
            <p className="text-xs text-warm-500 mt-1.5">
              {matchPercent}% of your matches want this goal too
            </p>
          </div>
        )}

        {/* Who else wants this */}
        {wanters.length > 0 ? (
          <div className="bg-white rounded-2xl border border-warm-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-orange-500" />
              <h3 className="font-bold text-warm-900 text-sm">Who else wants this?</h3>
              <span className="text-xs font-medium text-warm-500 bg-warm-100 px-2 py-0.5 rounded-full ml-auto">
                {wanters.length} {wanters.length === 1 ? 'dreamer' : 'dreamers'}
              </span>
            </div>

            {/* Avatar stack */}
            <div className="flex -space-x-2 mb-3">
              {wanters.slice(0, 6).map(w => (
                <UserAvatar key={w.user_id} url={w.profile?.avatar_url} name={w.profile?.full_name ?? 'User'} size={32} />
              ))}
              {wanters.length > 6 && (
                <div className="w-8 h-8 rounded-full bg-warm-200 border-2 border-white flex items-center justify-center text-xs font-bold text-warm-600 shadow-sm">
                  +{wanters.length - 6}
                </div>
              )}
            </div>

            <div className="space-y-1">
              {wanters.slice(0, 5).map(w => (
                <button
                  key={w.user_id}
                  onClick={() => navigate(`/app/profile/${w.user_id}`)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl active:bg-warm-50 transition-colors text-left"
                >
                  <UserAvatar url={w.profile?.avatar_url} name={w.profile?.full_name ?? 'User'} size={30} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-warm-900 truncate">{w.profile?.full_name ?? 'User'}</p>
                    <p className="text-xs text-warm-500 truncate">@{w.profile?.username ?? 'user'}</p>
                  </div>
                </button>
              ))}
              {wanters.length > 5 && (
                <p className="text-xs text-center text-warm-500 pt-1">and {wanters.length - 5} more dreamers…</p>
              )}
            </div>
          </div>
        ) : !isOwner && (
          <div className="bg-white rounded-2xl border border-warm-100 shadow-sm p-5 text-center">
            <div className="text-3xl mb-2">🌱</div>
            <p className="text-sm font-semibold text-warm-700 mb-0.5">Be the first!</p>
            <p className="text-xs text-warm-500">No one else has this goal yet. Add it and be a pioneer!</p>
          </div>
        )}

        {/* Owner actions */}
        {isOwner && (
          <div className="bg-white rounded-2xl border border-warm-100 shadow-sm p-4 space-y-2.5">
            <h3 className="font-bold text-warm-900 text-sm mb-1">Manage Goal</h3>

            <button
              onClick={() => setShowEdit(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-warm-50 border border-warm-200 active:bg-warm-100 transition-colors text-left"
            >
              <Edit3 size={16} className="text-warm-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-warm-800">Edit Goal</span>
            </button>

            {!isCompleted && (
              <button
                onClick={() => setShowComplete(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 border border-green-200 active:bg-green-100 transition-colors text-left"
              >
                <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-green-700">Mark as Complete</span>
              </button>
            )}

            <button
              onClick={() => setShowDelete(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100 active:bg-red-100 transition-colors text-left"
            >
              <Trash2 size={16} className="text-red-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-red-600">Delete Goal</span>
            </button>
          </div>
        )}

        {/* Meta */}
        <p className="text-xs text-center text-warm-400 pb-2">
          Added {formatTimeAgo(goal.created_at)}
          {goal.updated_at !== goal.created_at && ` · Updated ${formatTimeAgo(goal.updated_at)}`}
        </p>
      </div>

      {/* Sticky bottom CTA for non-owners */}
      {!isOwner && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] px-5 pb-6 pt-3 bg-gradient-to-t from-[#FFFBF7] via-[#FFFBF7]/90 to-transparent z-10">
          {hasGoal ? (
            <button
              disabled
              className="w-full py-4 rounded-2xl bg-green-100 text-green-700 font-bold text-sm border-2 border-green-200 flex items-center justify-center gap-2"
            >
              <Check size={16} /> Already in Your Bucket List
            </button>
          ) : (
            <button
              onClick={handleAddToMyList}
              disabled={addingToList}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-bold text-base shadow-lg shadow-orange-200 active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              {addingToList ? 'Adding…' : 'Add to My List'}
            </button>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && <ToastBanner message={toast} />}

      {/* Modals */}
      {goal && (
        <EditGoalModal
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          goal={goal}
          onSaved={updated => setGoal(g => g ? { ...g, ...updated } : g)}
        />
      )}
      <DeleteModal
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
      />
      <MarkCompleteModal
        isOpen={showComplete}
        onClose={() => setShowComplete(false)}
        onConfirm={handleMarkComplete}
      />
    </div>
  )
}
