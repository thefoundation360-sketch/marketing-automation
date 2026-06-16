import { ChangeEvent, FormEvent, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ChevronRight, Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { INTERESTS, GOAL_CATEGORIES, GOAL_CATEGORY_ICONS, cn } from '@/lib/utils'
import type { GoalCategory } from '@/types'

const TOTAL_STEPS = 4

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 px-5 pt-2">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex-1 h-1 rounded-full transition-colors duration-300',
            i < step ? 'bg-primary-500' : 'bg-warm-200'
          )}
        />
      ))}
    </div>
  )
}

// ─── Step 1 — Interests ───────────────────────────────────────────────────────

interface Step1Props {
  selected: string[]
  onToggle: (interest: string) => void
}

function Step1Interests({ selected, onToggle }: Step1Props) {
  return (
    <div className="flex flex-col flex-1">
      <div className="px-5 pt-6 pb-4">
        <h2 className="text-2xl font-bold text-warm-900 leading-tight">What are you into?</h2>
        <p className="text-sm text-warm-500 mt-1.5">
          Pick at least 3 interests — we'll use these to find your matches.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(interest => {
            const active = selected.includes(interest)
            return (
              <button
                key={interest}
                type="button"
                onClick={() => onToggle(interest)}
                className={cn(
                  'px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-150',
                  active
                    ? 'bg-primary-500 text-white border-primary-500 shadow-sm'
                    : 'bg-white text-warm-700 border-warm-200 hover:border-primary-300 hover:text-primary-600'
                )}
              >
                {interest}
              </button>
            )
          })}
        </div>
        {selected.length > 0 && selected.length < 3 && (
          <p className="text-xs text-primary-500 mt-3">
            Pick {3 - selected.length} more to continue
          </p>
        )}
        {selected.length >= 3 && (
          <p className="text-xs text-green-600 mt-3 font-medium">
            ✓ {selected.length} selected — looking good!
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Step 2 — Bucket List Goals ───────────────────────────────────────────────

interface InitialGoal {
  title: string
  category: GoalCategory
}

interface Step2Props {
  goals: InitialGoal[]
  onAdd: () => void
  onRemove: (i: number) => void
  onChange: (i: number, field: keyof InitialGoal, value: string) => void
}

function Step2Goals({ goals, onAdd, onRemove, onChange }: Step2Props) {
  return (
    <div className="flex flex-col flex-1">
      <div className="px-5 pt-6 pb-4">
        <h2 className="text-2xl font-bold text-warm-900 leading-tight">
          What's on your bucket list?
        </h2>
        <p className="text-sm text-warm-500 mt-1.5">
          Add up to 5 dreams — you can always add more later.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
        {goals.map((goal, i) => (
          <div
            key={i}
            className="bg-white border border-warm-200 rounded-xl p-4 shadow-sm animate-slide-up"
          >
            <div className="flex items-start gap-2 mb-3">
              <span className="text-lg leading-none mt-0.5" aria-hidden>
                {GOAL_CATEGORY_ICONS[goal.category]}
              </span>
              <input
                type="text"
                value={goal.title}
                onChange={e => onChange(i, 'title', e.target.value)}
                placeholder="e.g. Hike the Inca Trail"
                maxLength={80}
                className="flex-1 text-sm text-warm-800 placeholder-warm-400 bg-transparent focus:outline-none leading-snug"
              />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="text-warm-300 hover:text-rose-400 transition-colors p-0.5 flex-shrink-0"
                aria-label="Remove goal"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <select
              value={goal.category}
              onChange={e => onChange(i, 'category', e.target.value)}
              className="w-full text-xs font-medium text-warm-600 bg-warm-50 border border-warm-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-300 appearance-none"
            >
              {GOAL_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {GOAL_CATEGORY_ICONS[cat]} {cat}
                </option>
              ))}
            </select>
          </div>
        ))}

        {goals.length < 5 && (
          <button
            type="button"
            onClick={onAdd}
            className="w-full py-3.5 border-2 border-dashed border-warm-200 rounded-xl text-sm font-medium text-warm-400 hover:border-primary-300 hover:text-primary-500 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus size={16} />
            Add a dream
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Step 3 — About You ───────────────────────────────────────────────────────

interface Step3Data {
  location: string
  age: string
  avatarPreview: string | null
  avatarFile: File | null
}

interface Step3Props {
  data: Step3Data
  onChange: (updates: Partial<Step3Data>) => void
}

function Step3About({ data, onChange }: Step3Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }
    const preview = URL.createObjectURL(file)
    onChange({ avatarFile: file, avatarPreview: preview })
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="px-5 pt-6 pb-4">
        <h2 className="text-2xl font-bold text-warm-900 leading-tight">
          Tell us about you
        </h2>
        <p className="text-sm text-warm-500 mt-1.5">
          This helps us find matches near you.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-5">
        {/* Avatar upload */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-28 h-28 rounded-full overflow-hidden bg-orange-50 border-2 border-dashed border-primary-300 hover:border-primary-500 transition-colors group"
            aria-label="Upload profile photo"
          >
            {data.avatarPreview ? (
              <img
                src={data.avatarPreview}
                alt="Profile preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-1.5">
                <Camera size={24} className="text-primary-400 group-hover:text-primary-600 transition-colors" />
                <span className="text-xs text-primary-400 font-medium">Add photo</span>
              </div>
            )}
            {data.avatarPreview && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={20} className="text-white" />
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <p className="text-xs text-warm-400 mt-2">Tap to upload (optional)</p>
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5 uppercase tracking-wide">
            Location
          </label>
          <input
            type="text"
            value={data.location}
            onChange={e => onChange({ location: e.target.value })}
            placeholder="City, Country"
            autoComplete="address-level2"
            className="w-full px-4 py-3.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition-shadow"
          />
        </div>

        {/* Age */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 mb-1.5 uppercase tracking-wide">
            Age
          </label>
          <input
            type="number"
            value={data.age}
            onChange={e => onChange({ age: e.target.value })}
            placeholder="Your age"
            min={18}
            max={99}
            className="w-full px-4 py-3.5 bg-white border border-warm-200 rounded-xl text-sm text-warm-800 placeholder-warm-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 transition-shadow"
          />
          {data.age && (Number(data.age) < 18 || Number(data.age) > 99) && (
            <p className="text-xs text-rose-500 mt-1">Age must be between 18 and 99</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step 4 — Connection Style ────────────────────────────────────────────────

type Preference = 'solo' | 'squad' | 'both'

const PREFERENCE_OPTIONS: { value: Preference; emoji: string; label: string; description: string }[] = [
  {
    value: 'solo',
    emoji: '🧘',
    label: 'Solo Explorer',
    description: 'I prefer doing things on my own terms',
  },
  {
    value: 'squad',
    emoji: '👥',
    label: 'Squad Goals',
    description: 'I love sharing adventures with others',
  },
  {
    value: 'both',
    emoji: '🌟',
    label: 'Open to Both',
    description: 'I\'m flexible — the right person matters more',
  },
]

interface Step4Props {
  preference: Preference
  onChange: (p: Preference) => void
}

function Step4Style({ preference, onChange }: Step4Props) {
  return (
    <div className="flex flex-col flex-1">
      <div className="px-5 pt-6 pb-4">
        <h2 className="text-2xl font-bold text-warm-900 leading-tight">
          How do you adventure?
        </h2>
        <p className="text-sm text-warm-500 mt-1.5">
          This shapes how we introduce you to others.
        </p>
      </div>
      <div className="flex-1 px-5 pb-4 space-y-3">
        {PREFERENCE_OPTIONS.map(opt => {
          const active = preference === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'w-full p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all duration-150',
                active
                  ? 'border-primary-500 bg-primary-50 shadow-sm'
                  : 'border-warm-200 bg-white hover:border-warm-300'
              )}
            >
              <div
                className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-colors',
                  active ? 'bg-primary-100' : 'bg-warm-50'
                )}
              >
                {opt.emoji}
              </div>
              <div>
                <p className={cn('font-semibold text-sm', active ? 'text-primary-700' : 'text-warm-800')}>
                  {opt.label}
                </p>
                <p className="text-xs text-warm-500 mt-0.5 leading-snug">
                  {opt.description}
                </p>
              </div>
              {active && (
                <div className="ml-auto flex-shrink-0 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── OnboardingPage ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const { user, updateProfile } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1
  const [interests, setInterests] = useState<string[]>([])

  // Step 2
  const [goals, setGoals] = useState<Array<{ title: string; category: GoalCategory }>>([
    { title: '', category: 'Travel' },
  ])

  // Step 3
  const [aboutData, setAboutData] = useState({
    location: '',
    age: '',
    avatarPreview: null as string | null,
    avatarFile: null as File | null,
  })

  // Step 4
  const [preference, setPreference] = useState<Preference>('both')

  function toggleInterest(interest: string) {
    setInterests(prev =>
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    )
  }

  function addGoal() {
    if (goals.length >= 5) return
    setGoals(prev => [...prev, { title: '', category: 'Travel' }])
  }

  function removeGoal(index: number) {
    setGoals(prev => prev.filter((_, i) => i !== index))
  }

  function updateGoal(index: number, field: 'title' | 'category', value: string) {
    setGoals(prev =>
      prev.map((g, i) =>
        i === index ? { ...g, [field]: value } : g
      )
    )
  }

  function validateCurrentStep(): boolean {
    if (step === 1) {
      if (interests.length < 3) {
        toast.error('Please select at least 3 interests')
        return false
      }
    }
    if (step === 3) {
      const age = Number(aboutData.age)
      if (aboutData.age && (age < 18 || age > 99)) {
        toast.error('Please enter a valid age between 18 and 99')
        return false
      }
    }
    return true
  }

  async function uploadAvatar(file: File): Promise<string | null> {
    if (!user) return null
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `${user.id}/avatar.${ext}`
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) {
      console.error('Avatar upload error:', error)
      return null
    }
    return path
  }

  async function saveGoalsToSupabase(validGoals: Array<{ title: string; category: GoalCategory }>) {
    if (!user || validGoals.length === 0) return
    await supabase.from('bucket_goals').insert(
      validGoals.map(g => ({
        user_id: user.id,
        title: g.title,
        category: g.category,
        status: 'active' as const,
        is_public: true,
      }))
    )
  }

  async function handleFinish() {
    if (!user) return
    if (!validateCurrentStep()) return
    setLoading(true)

    try {
      // Upload avatar if provided
      let avatarPath: string | null = null
      if (aboutData.avatarFile) {
        avatarPath = await uploadAvatar(aboutData.avatarFile)
      }

      // Save valid goals
      const validGoals = goals.filter(g => g.title.trim().length > 0)
      await saveGoalsToSupabase(validGoals)

      // Update profile
      await updateProfile({
        interests,
        preference,
        location: aboutData.location.trim() || null,
        age: aboutData.age ? Number(aboutData.age) : null,
        avatar_url: avatarPath,
        onboarding_complete: true,
      })

      toast.success('Welcome to DreamMatch! 🔥')
      navigate('/discover', { replace: true })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleNext(e?: FormEvent) {
    e?.preventDefault()
    if (!validateCurrentStep()) return

    if (step < TOTAL_STEPS) {
      setStep(s => s + 1)
    } else {
      await handleFinish()
    }
  }

  const isLastStep = step === TOTAL_STEPS
  const canProceed =
    step === 1 ? interests.length >= 3 :
    step === 2 ? true :
    step === 3 ? true :
    true

  return (
    <div className="min-h-screen bg-[#FFFBF7] flex flex-col max-w-[428px] mx-auto">
      {/* Header */}
      <div className="px-5 pt-12 pb-2">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl" aria-hidden>🔥</span>
          <span className="text-base font-bold text-warm-800">DreamMatch</span>
        </div>
        <p className="text-xs text-warm-400 font-medium">
          Step {step} of {TOTAL_STEPS}
        </p>
      </div>

      <ProgressBar step={step} />

      {/* Step content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {step === 1 && (
          <Step1Interests selected={interests} onToggle={toggleInterest} />
        )}
        {step === 2 && (
          <Step2Goals
            goals={goals}
            onAdd={addGoal}
            onRemove={removeGoal}
            onChange={updateGoal}
          />
        )}
        {step === 3 && (
          <Step3About
            data={aboutData}
            onChange={updates => setAboutData(prev => ({ ...prev, ...updates }))}
          />
        )}
        {step === 4 && (
          <Step4Style preference={preference} onChange={setPreference} />
        )}
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pb-10 pt-4 border-t border-warm-100 bg-[#FFFBF7] space-y-3">
        <button
          type="button"
          onClick={handleNext}
          disabled={!canProceed || loading}
          className={cn(
            'w-full py-4 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150 shadow-sm',
            canProceed && !loading
              ? 'bg-primary-500 hover:bg-primary-600 active:bg-primary-700'
              : 'bg-warm-300 cursor-not-allowed'
          )}
        >
          {loading ? (
            'Saving…'
          ) : isLastStep ? (
            "Let's Go! 🚀"
          ) : (
            <>
              Next <ChevronRight size={16} />
            </>
          )}
        </button>

        {/* Skip option on step 2 */}
        {step === 2 && (
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            className="w-full py-2 text-sm text-warm-400 font-medium hover:text-warm-600 transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}
