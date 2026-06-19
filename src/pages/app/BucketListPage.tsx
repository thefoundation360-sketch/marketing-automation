import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, CheckCircle, Users, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  cn,
  formatDate,
  GOAL_CATEGORIES,
  GOAL_CATEGORY_ICONS,
  GOAL_CATEGORY_COLORS,
  TIER_LIMITS,
  canAddGoal,
} from '@/lib/utils'
import { isDemoMode, DEMO_GOALS } from '@/lib/demoData'
import EmptyState from '@/components/shared/EmptyState'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import Modal from '@/components/shared/Modal'
import AddGoalModal from '@/components/bucketlist/AddGoalModal'
import GoalCompletionModal from '@/components/bucketlist/GoalCompletionModal'
import type { BucketGoal, GoalCategory } from '@/types'

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'active' | 'completed' | 'categories'

// ── Who Else Wants This Modal ─────────────────────────────────────────────────

interface WhoWantsModalProps {
  isOpen: boolean
  onClose: () => void
  goalTitle: string
  count: number
}

function WhoWantsModal({ isOpen, onClose, goalTitle, count }: WhoWantsModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dreamers Like You" size="sm">
      <div className="px-5 py-6 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-4">
          <Users size={28} className="text-orange-500" />
        </div>
        <p className="text-3xl font-bold text-warm-900 mb-1">{count.toLocaleString()}</p>
        <p className="text-sm text-warm-500 mb-1">
          {count === 1 ? 'person wants' : 'people want'}
        </p>
        <p className="text-sm font-semibold text-warm-800 line-clamp-2">"{goalTitle}"</p>
        <p className="text-xs text-warm-400 mt-3">
          Discover them on the Explore tab!
        </p>
      </div>
    </Modal>
  )
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  goalTitle: string
  deleting: boolean
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  goalTitle,
  deleting,
}: DeleteConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Remove Dream?" size="sm">
      <div className="px-5 py-5">
        <p className="text-sm text-warm-600 mb-1">
          Are you sure you want to remove:
        </p>
        <p className="text-sm font-semibold text-warm-900 mb-5 line-clamp-2">"{goalTitle}"</p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className={cn(
              'w-full py-3 rounded-xl bg-red-500 text-white font-semibold text-sm',
              'active:scale-[0.98] transition-all disabled:opacity-60'
            )}
          >
            {deleting ? 'Removing…' : 'Yes, Remove'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-warm-500 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressSection({ goals }: { goals: BucketGoal[] }) {
  const total = goals.length
  const completed = goals.filter(g => g.status === 'completed').length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0

  function motivationalMessage() {
    if (total === 0) return 'Start adding your dreams below!'
    if (pct === 0) return 'Every journey starts with one step. You got this!'
    if (pct < 25) return 'Great start! Keep going!'
    if (pct < 50) return "You're making progress. Keep dreaming!"
    if (pct < 75) return "Halfway there — you're unstoppable!"
    if (pct < 100) return 'Almost there! The finish line is in sight!'
    return '🏆 You completed your entire bucket list! Legend!'
  }

  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl border border-warm-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-warm-800">
          {completed} of {total} goals completed
        </p>
        <span className="text-sm font-bold text-orange-500">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-warm-100 overflow-hidden mb-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-warm-400">{motivationalMessage()}</p>
    </div>
  )
}

// ── Goal Card ─────────────────────────────────────────────────────────────────

interface GoalCardProps {
  goal: BucketGoal
  onEdit: (goal: BucketGoal) => void
  onDelete: (goal: BucketGoal) => void
  onLongPress: (goal: BucketGoal) => void
  onWhoWants: (goal: BucketGoal) => void
}

function GoalCard({ goal, onEdit, onDelete, onLongPress, onWhoWants }: GoalCardProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCompleted = goal.status === 'completed'

  function handleTouchStart() {
    longPressTimer.current = setTimeout(() => {
      onLongPress(goal)
    }, 500)
  }

  function handleTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // Simulate a match count deterministically from goal id for display
  const matchCount = Math.abs(
    goal.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  ) % 200 + 3

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-warm-100 shadow-sm p-4',
        isCompleted && 'opacity-70'
      )}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div className="flex gap-3">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Category badge */}
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm leading-none" aria-hidden>
              {GOAL_CATEGORY_ICONS[goal.category]}
            </span>
            <span
              className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                GOAL_CATEGORY_COLORS[goal.category]
              )}
            >
              {goal.category}
            </span>
          </div>

          {/* Title */}
          <h3
            className={cn(
              'text-base font-semibold text-warm-900 leading-snug mb-1',
              isCompleted && 'line-through text-warm-500'
            )}
          >
            {isCompleted && (
              <CheckCircle
                size={14}
                className="inline text-green-500 mr-1 mb-0.5"
                aria-hidden
              />
            )}
            {goal.title}
          </h3>

          {/* Description */}
          {goal.description && (
            <p className="text-sm text-warm-500 line-clamp-2 mb-2 leading-relaxed">
              {goal.description}
            </p>
          )}

          {/* Status chip */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                <CheckCircle size={11} />
                Completed
              </span>
            ) : (
              <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border border-orange-400 text-orange-600">
                Active
              </span>
            )}
            {isCompleted && goal.completed_at && (
              <span className="text-xs text-warm-400">
                {formatDate(goal.completed_at)}
              </span>
            )}
          </div>

          {/* Who wants this */}
          <button
            type="button"
            onClick={() => onWhoWants(goal)}
            className="flex items-center gap-1.5 text-xs font-medium text-orange-500 hover:text-orange-600 transition-colors"
          >
            <Users size={13} />
            Who else wants this? ({matchCount} people)
          </button>
        </div>

        {/* Right column: proof photo + actions */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Proof photo thumbnail */}
          {goal.proof_photo_url && (
            <img
              src={goal.proof_photo_url}
              alt="Proof"
              className="w-[60px] h-[60px] rounded-xl object-cover border border-warm-100 flex-shrink-0"
            />
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(goal)}
              aria-label="Edit goal"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-warm-100 hover:bg-warm-200 text-warm-600 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(goal)}
              aria-label="Delete goal"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-warm-100 hover:bg-red-100 text-warm-600 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Bucket List Page ──────────────────────────────────────────────────────────

export default function BucketListPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [goals, setGoals] = useState<BucketGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [selectedCategory, setSelectedCategory] = useState<GoalCategory | null>(null)

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<BucketGoal | undefined>(undefined)
  const [completionGoal, setCompletionGoal] = useState<BucketGoal | null>(null)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [whoWantsGoal, setWhoWantsGoal] = useState<BucketGoal | null>(null)
  const [deleteGoal, setDeleteGoal] = useState<BucketGoal | null>(null)
  const [deleting, setDeleting] = useState(false)

  const tier = profile?.subscription_tier ?? 'free'
  const goalLimit = TIER_LIMITS[tier].goals
  const isFree = tier === 'free'
  const atLimit = isFree && !canAddGoal(tier, goals.length)

  // ── Load Goals ──────────────────────────────────────────────────────────────

  const loadGoals = useCallback(async () => {
    if (isDemoMode()) {
      const stored = localStorage.getItem('demo_goals')
      if (stored) {
        setGoals(JSON.parse(stored))
      } else {
        setGoals(DEMO_GOALS)
        localStorage.setItem('demo_goals', JSON.stringify(DEMO_GOALS))
      }
      setLoading(false)
      return
    }
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bucket_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGoals(data ?? [])
    } catch (err) {
      console.error('Error loading goals:', err)
      toast.error('Could not load your goals.')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadGoals()
  }, [loadGoals])

  // ── Save Goal (Add or Edit) ─────────────────────────────────────────────────

  async function handleSaveGoal(partial: Partial<BucketGoal>) {
    if (isDemoMode()) {
      const stored = localStorage.getItem('demo_goals')
      const current: BucketGoal[] = stored ? JSON.parse(stored) : DEMO_GOALS
      let updated: BucketGoal[]
      if (editingGoal) {
        updated = current.map(g =>
          g.id === editingGoal.id
            ? { ...g, ...partial, updated_at: new Date().toISOString() }
            : g
        )
      } else {
        const newGoal: BucketGoal = {
          id: `goal-${Date.now()}`, user_id: 'demo-user-1',
          title: partial.title ?? 'New Dream',
          description: partial.description ?? null,
          category: partial.category ?? 'Travel',
          status: 'active', is_public: partial.is_public ?? true,
          completed_at: null, proof_photo_url: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }
        updated = [newGoal, ...current]
      }
      localStorage.setItem('demo_goals', JSON.stringify(updated))
      setGoals(updated)
      return
    }

    if (!user) throw new Error('Not authenticated')

    if (editingGoal) {
      // Update
      const { error } = await supabase
        .from('bucket_goals')
        .update({ ...partial, updated_at: new Date().toISOString() })
        .eq('id', editingGoal.id)
        .eq('user_id', user.id)

      if (error) throw error
    } else {
      // Insert
      const { error } = await supabase.from('bucket_goals').insert({
        user_id: user.id,
        title: partial.title,
        description: partial.description ?? null,
        category: partial.category ?? 'Travel',
        status: 'active',
        is_public: partial.is_public ?? true,
        completed_at: null,
        proof_photo_url: null,
      })
      if (error) throw error
    }

    await loadGoals()
  }

  function openAddModal() {
    setEditingGoal(undefined)
    setShowAddModal(true)
  }

  function openEditModal(goal: BucketGoal) {
    setEditingGoal(goal)
    setShowAddModal(true)
  }

  // ── Delete Goal ─────────────────────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteGoal) return
    setDeleting(true)
    try {
      if (isDemoMode()) {
        const stored = localStorage.getItem('demo_goals')
        const current: BucketGoal[] = stored ? JSON.parse(stored) : DEMO_GOALS
        const updated = current.filter(g => g.id !== deleteGoal.id)
        localStorage.setItem('demo_goals', JSON.stringify(updated))
        setGoals(updated)
        toast.success('Dream removed.')
        setDeleteGoal(null)
        return
      }

      if (!user) return
      const { error } = await supabase
        .from('bucket_goals')
        .delete()
        .eq('id', deleteGoal.id)
        .eq('user_id', user.id)

      if (error) throw error
      toast.success('Dream removed.')
      setDeleteGoal(null)
      await loadGoals()
    } catch (err) {
      console.error('Error deleting goal:', err)
      toast.error('Could not remove goal. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  // ── Complete Goal ───────────────────────────────────────────────────────────

  async function handleComplete(
    goalId: string,
    completedAt: string,
    proofPhotoUrl: string | null,
    _shareToFeed: boolean
  ) {
    if (isDemoMode()) {
      const stored = localStorage.getItem('demo_goals')
      const current: BucketGoal[] = stored ? JSON.parse(stored) : DEMO_GOALS
      const updated = current.map(g =>
        g.id === goalId
          ? { ...g, status: 'completed' as const, completed_at: new Date(completedAt).toISOString(), proof_photo_url: proofPhotoUrl, updated_at: new Date().toISOString() }
          : g
      )
      localStorage.setItem('demo_goals', JSON.stringify(updated))
      setGoals(updated)
      return
    }

    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('bucket_goals')
      .update({
        status: 'completed',
        completed_at: new Date(completedAt).toISOString(),
        proof_photo_url: proofPhotoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', goalId)
      .eq('user_id', user.id)

    if (error) throw error

    if (_shareToFeed) {
      await supabase.from('feed_items').insert({
        user_id: user.id,
        type: 'goal_completed',
        goal_id: goalId,
        content: `just completed a bucket list goal! 🎉`,
        likes_count: 0,
        comments_count: 0,
      })
    }

    await loadGoals()
  }

  function handleLongPress(goal: BucketGoal) {
    if (goal.status !== 'completed') {
      setCompletionGoal(goal)
      setShowCompletionModal(true)
    }
  }

  // ── Filtered Goals ──────────────────────────────────────────────────────────

  const filteredGoals = goals.filter(g => {
    if (activeTab === 'active') return g.status === 'active'
    if (activeTab === 'completed') return g.status === 'completed'
    if (activeTab === 'categories' && selectedCategory) return g.category === selectedCategory
    return true
  })

  const activeCount = goals.filter(g => g.status === 'active').length
  const completedCount = goals.filter(g => g.status === 'completed').length

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#FFFBF7] overflow-hidden">
      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 pt-safe-top pt-4 pb-3 bg-[#FFFBF7] border-b border-warm-100 sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">My Bucket List</h1>
          <p className="text-xs text-warm-400 mt-0.5">
            {goals.length} dream{goals.length !== 1 ? 's' : ''} · {completedCount} completed
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          aria-label="Add new goal"
          className={cn(
            'w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center',
            'shadow-sm active:scale-[0.95] transition-transform',
            atLimit && 'opacity-40 cursor-not-allowed'
          )}
          disabled={atLimit}
        >
          <Plus size={20} className="text-white" />
        </button>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-24">
        {loading ? (
          <div className="px-4 pt-4 space-y-3">
            {[0, 1, 2].map(i => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* Progress section */}
            {goals.length > 0 && <ProgressSection goals={goals} />}

            {/* Free tier warning banner */}
            {atLimit && (
              <div className="mx-4 mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-3">
                <Zap size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">
                    You've used all {goalLimit} free goal slots
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Upgrade to Premium for unlimited dreams.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/app/profile')}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-semibold active:scale-[0.97] transition-transform"
                >
                  Upgrade
                </button>
              </div>
            )}

            {/* Filter Tabs */}
            <div className="px-4 mt-4">
              <div className="flex gap-1 bg-warm-100 rounded-xl p-1">
                {(['all', 'active', 'completed', 'categories'] as FilterTab[]).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab)
                      if (tab !== 'categories') setSelectedCategory(null)
                    }}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all',
                      activeTab === tab
                        ? 'bg-white text-orange-500 shadow-sm'
                        : 'text-warm-500'
                    )}
                  >
                    {tab === 'active'
                      ? `Active (${activeCount})`
                      : tab === 'completed'
                      ? `Done (${completedCount})`
                      : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Category Chips */}
              {activeTab === 'categories' && (
                <div className="flex gap-2 overflow-x-auto py-3 -mx-0 scrollbar-hide">
                  {GOAL_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() =>
                        setSelectedCategory(prev => (prev === cat ? null : cat))
                      }
                      className={cn(
                        'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        selectedCategory === cat
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-white border-warm-200 text-warm-600'
                      )}
                    >
                      <span aria-hidden>{GOAL_CATEGORY_ICONS[cat]}</span>
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Goal List */}
            {filteredGoals.length === 0 ? (
              goals.length === 0 ? (
                <EmptyState
                  icon="✨"
                  title="Add your first dream!"
                  description="Your bucket list is empty. Start adding goals you want to achieve!"
                  actionLabel="Add Goal"
                  onAction={openAddModal}
                  className="mt-8"
                />
              ) : (
                <EmptyState
                  icon="🔍"
                  title="No goals here"
                  description="Try switching to a different filter to see your goals."
                  className="mt-8"
                />
              )
            ) : (
              <div className="px-4 mt-3 space-y-3">
                {filteredGoals.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={openEditModal}
                    onDelete={g => setDeleteGoal(g)}
                    onLongPress={handleLongPress}
                    onWhoWants={g => setWhoWantsGoal(g)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── FAB ── */}
      <button
        type="button"
        onClick={openAddModal}
        disabled={atLimit}
        aria-label="Add new dream"
        className={cn(
          'fixed bottom-20 right-5 w-14 h-14 rounded-full',
          'bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg',
          'flex items-center justify-center',
          'active:scale-[0.92] transition-transform z-30',
          atLimit && 'opacity-40 cursor-not-allowed'
        )}
      >
        <Plus size={24} />
      </button>

      {/* ── Modals ── */}
      <AddGoalModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false)
          setEditingGoal(undefined)
        }}
        onSave={handleSaveGoal}
        existingGoal={editingGoal}
      />

      <GoalCompletionModal
        isOpen={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false)
          setCompletionGoal(null)
        }}
        goal={completionGoal}
        onComplete={handleComplete}
      />

      {whoWantsGoal && (
        <WhoWantsModal
          isOpen={Boolean(whoWantsGoal)}
          onClose={() => setWhoWantsGoal(null)}
          goalTitle={whoWantsGoal.title}
          count={
            Math.abs(
              whoWantsGoal.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
            ) % 200 + 3
          }
        />
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleteGoal)}
        onClose={() => setDeleteGoal(null)}
        onConfirm={confirmDelete}
        goalTitle={deleteGoal?.title ?? ''}
        deleting={deleting}
      />
    </div>
  )
}
