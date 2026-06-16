import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import Modal from '@/components/shared/Modal'
import { cn, GOAL_CATEGORIES, GOAL_CATEGORY_ICONS } from '@/lib/utils'
import type { BucketGoal, GoalCategory } from '@/types'

export interface AddGoalModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (goal: Partial<BucketGoal>) => Promise<void>
  existingGoal?: BucketGoal
}

export default function AddGoalModal({
  isOpen,
  onClose,
  onSave,
  existingGoal,
}: AddGoalModalProps) {
  const isEditing = Boolean(existingGoal)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<GoalCategory>('Travel')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)

  // Populate form when editing or when modal opens
  useEffect(() => {
    if (isOpen) {
      if (existingGoal) {
        setTitle(existingGoal.title)
        setDescription(existingGoal.description ?? '')
        setCategory(existingGoal.category)
        setIsPublic(existingGoal.is_public)
      } else {
        setTitle('')
        setDescription('')
        setCategory('Travel')
        setIsPublic(true)
      }
    }
  }, [isOpen, existingGoal])

  async function handleSave() {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      toast.error('Please enter a goal title.')
      return
    }

    setSaving(true)
    try {
      await onSave({
        title: trimmedTitle,
        description: description.trim() || null,
        category,
        is_public: isPublic,
      })
      toast.success(isEditing ? 'Dream updated!' : 'Dream added to your bucket list!')
      onClose()
    } catch (err) {
      console.error('Error saving goal:', err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Dream' : 'Add Dream'}
      size="lg"
    >
      <div className="px-5 py-4 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-warm-800 mb-1.5">
            Dream Title <span className="text-orange-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. See the Northern Lights"
            maxLength={120}
            className={cn(
              'w-full rounded-xl border border-warm-200 bg-white px-4 py-3',
              'text-sm text-warm-900 placeholder:text-warm-400',
              'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent',
              'transition-shadow'
            )}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-warm-800 mb-1.5">
            Description <span className="text-warm-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Why do you want to do this?"
            rows={3}
            maxLength={500}
            className={cn(
              'w-full rounded-xl border border-warm-200 bg-white px-4 py-3',
              'text-sm text-warm-900 placeholder:text-warm-400 resize-none',
              'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent',
              'transition-shadow'
            )}
          />
        </div>

        {/* Category Picker */}
        <div>
          <label className="block text-sm font-semibold text-warm-800 mb-2">
            Category
          </label>
          <div className="grid grid-cols-3 gap-2">
            {GOAL_CATEGORIES.map(cat => {
              const selected = category === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={cn(
                    'flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs font-medium transition-all',
                    selected
                      ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm'
                      : 'border-warm-200 bg-white text-warm-600 hover:border-warm-300 hover:bg-warm-50'
                  )}
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {GOAL_CATEGORY_ICONS[cat]}
                  </span>
                  <span className="truncate w-full text-center">{cat}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Privacy Toggle */}
        <div>
          <label className="block text-sm font-semibold text-warm-800 mb-2">
            Privacy
          </label>
          <div className="flex rounded-xl border border-warm-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
                isPublic
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-warm-600 hover:bg-warm-50'
              )}
            >
              <span aria-hidden>🌍</span> Public
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors',
                !isPublic
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-warm-600 hover:bg-warm-50'
              )}
            >
              <span aria-hidden>🔒</span> Private
            </button>
          </div>
          <p className="mt-1.5 text-xs text-warm-400">
            {isPublic
              ? 'Others can see this goal and match with you on it.'
              : 'Only you can see this goal.'}
          </p>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'w-full py-3.5 rounded-2xl font-semibold text-base text-white',
            'bg-gradient-to-r from-orange-500 to-orange-400 shadow-sm',
            'active:scale-[0.98] transition-all duration-150',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            'flex items-center justify-center gap-2'
          )}
        >
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Saving…
            </>
          ) : (
            isEditing ? 'Save Changes' : 'Add to Bucket List'
          )}
        </button>
      </div>
    </Modal>
  )
}
