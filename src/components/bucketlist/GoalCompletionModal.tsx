import { useState, useRef, useEffect, ChangeEvent } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Camera, X } from 'lucide-react'
import Modal from '@/components/shared/Modal'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import type { BucketGoal } from '@/types'

export interface GoalCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  goal: BucketGoal | null
  onComplete: (
    goalId: string,
    completedAt: string,
    proofPhotoUrl: string | null,
    shareToFeed: boolean
  ) => Promise<void>
}

function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export default function GoalCompletionModal({
  isOpen,
  onClose,
  goal,
  onComplete,
}: GoalCompletionModalProps) {
  const { user } = useAuth()

  const [completedAt, setCompletedAt] = useState(todayISO())
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [shareToFeed, setShareToFeed] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset state whenever the modal opens for a new goal
  useEffect(() => {
    if (isOpen) {
      setCompletedAt(todayISO())
      setProofFile(null)
      setPreviewUrl(null)
      setShareToFeed(true)
      setSaving(false)
    }
  }, [isOpen, goal?.id])

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }

    // Revoke any previous object URL
    if (previewUrl) URL.revokeObjectURL(previewUrl)

    setProofFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function removePhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setProofFile(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadProofPhoto(goalId: string): Promise<string | null> {
    if (!proofFile || !user) return null

    const ext = proofFile.name.split('.').pop() ?? 'jpg'
    const timestamp = Date.now()
    const path = `${user.id}/${goalId}/${timestamp}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('proof-photos')
      .upload(path, proofFile, { upsert: true })

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('proof-photos').getPublicUrl(path)
    return data.publicUrl
  }

  async function handleComplete() {
    if (!goal) return

    if (!completedAt) {
      toast.error('Please select the date you completed this goal.')
      return
    }

    setSaving(true)
    try {
      let proofPhotoUrl: string | null = null
      if (proofFile) {
        proofPhotoUrl = await uploadProofPhoto(goal.id)
      }

      await onComplete(goal.id, completedAt, proofPhotoUrl, shareToFeed)
      toast.success('🎉 Congratulations! Goal marked as complete!')
      onClose()
    } catch (err) {
      console.error('Error completing goal:', err)
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="px-5 py-4 space-y-5">
        {/* Celebratory Header */}
        <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 p-5 text-center text-white">
          <div className="text-5xl mb-2" aria-hidden>🎉</div>
          <h2 className="text-2xl font-bold tracking-tight">You Did It!</h2>
          {goal && (
            <p className="mt-1 text-sm text-orange-100 font-medium line-clamp-2">
              Celebrating: {goal.title}
            </p>
          )}
        </div>

        {/* Completion Date */}
        <div>
          <label
            htmlFor="completedAt"
            className="block text-sm font-semibold text-warm-800 mb-1.5"
          >
            Date Completed
          </label>
          <input
            id="completedAt"
            type="date"
            value={completedAt}
            max={todayISO()}
            onChange={e => setCompletedAt(e.target.value)}
            className={cn(
              'w-full rounded-xl border border-warm-200 bg-white px-4 py-3',
              'text-sm text-warm-900',
              'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent',
              'transition-shadow'
            )}
          />
        </div>

        {/* Proof Photo */}
        <div>
          <p className="text-sm font-semibold text-warm-800 mb-2">
            Add Proof Photo{' '}
            <span className="text-warm-400 font-normal">(optional)</span>
          </p>

          {previewUrl ? (
            <div className="relative w-24 h-24">
              <img
                src={previewUrl}
                alt="Proof preview"
                className="w-24 h-24 rounded-xl object-cover border border-warm-200"
              />
              <button
                type="button"
                onClick={removePhoto}
                aria-label="Remove photo"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-warm-800 text-white flex items-center justify-center shadow"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed',
                'border-warm-200 bg-warm-50 text-warm-500 text-sm font-medium',
                'hover:border-orange-400 hover:bg-orange-50 hover:text-orange-600',
                'transition-colors active:scale-[0.98]'
              )}
            >
              <Camera size={18} />
              Upload a photo
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Share to Feed Toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShareToFeed(v => !v)}
            className="flex items-center justify-between w-full"
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-warm-800">Share to Activity Feed</p>
              <p className="text-xs text-warm-400 mt-0.5">
                Let your matches celebrate with you!
              </p>
            </div>
            {/* Toggle pill */}
            <div
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ml-3',
                shareToFeed ? 'bg-orange-500' : 'bg-warm-200'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                  shareToFeed ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </div>
          </button>
        </div>

        {/* Complete Button */}
        <button
          type="button"
          onClick={handleComplete}
          disabled={saving}
          className={cn(
            'w-full py-4 rounded-2xl font-bold text-base text-white',
            'bg-gradient-to-r from-orange-500 to-amber-400 shadow-sm',
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
            'I Did It! 🎊'
          )}
        </button>
      </div>
    </Modal>
  )
}
