import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check, ChevronLeft, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn, INTERESTS, getInitials } from '@/lib/utils'
import type { Profile } from '@/types'

const BIO_LIMIT = 160

type Preference = Profile['preference']

const PREFERENCE_OPTIONS: { value: Preference; label: string; desc: string }[] = [
  { value: 'solo', label: 'Solo', desc: 'I prefer doing things on my own' },
  { value: 'squad', label: 'Squad', desc: 'Better with a group' },
  { value: 'both', label: 'Both', desc: "I'm flexible either way" },
]

// ── Toast notification ────────────────────────────────────────────────────────

function Toast({ visible, message }: { visible: boolean; message: string }) {
  return (
    <div
      aria-live="polite"
      className={cn(
        'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-warm-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      )}
    >
      <span className="flex items-center gap-2">
        <Check size={15} />
        {message}
      </span>
    </div>
  )
}

// ── Gradient from name ────────────────────────────────────────────────────────

function getGradient(name: string): string {
  const gradients = [
    'from-orange-400 to-rose-400',
    'from-amber-400 to-orange-500',
    'from-rose-400 to-pink-500',
    'from-orange-300 to-amber-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

// ── Edit Profile Page ─────────────────────────────────────────────────────────

export default function EditProfilePage() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useAuth()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [location, setLocation] = useState(profile?.location ?? '')
  const [age, setAge] = useState<string>(profile?.age?.toString() ?? '')
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? [])
  const [preference, setPreference] = useState<Preference>(profile?.preference ?? 'both')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null)

  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('Saved!')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep form in sync if profile loads after mount
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name)
      setBio(profile.bio ?? '')
      setLocation(profile.location ?? '')
      setAge(profile.age?.toString() ?? '')
      setInterests(profile.interests)
      setPreference(profile.preference)
      setAvatarUrl(profile.avatar_url)
    }
  }, [profile?.id])

  function showToast(msg = 'Saved!') {
    setToastMessage(msg)
    setToastVisible(true)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 2500)
  }

  const saveField = useCallback(
    async (updates: Partial<Profile>) => {
      try {
        await updateProfile(updates)
        showToast('Saved!')
      } catch {
        showToast('Failed to save')
      }
    },
    [updateProfile]
  )

  // Autosave handlers on blur
  async function handleNameBlur() {
    if (!fullName.trim() || fullName === profile?.full_name) return
    await saveField({ full_name: fullName.trim() })
  }

  async function handleBioBlur() {
    if (bio === (profile?.bio ?? '')) return
    await saveField({ bio: bio.trim() || null })
  }

  async function handleLocationBlur() {
    if (location === (profile?.location ?? '')) return
    await saveField({ location: location.trim() || null })
  }

  async function handleAgeBlur() {
    const parsed = parseInt(age, 10)
    if (isNaN(parsed) || parsed === profile?.age) return
    if (parsed < 18 || parsed > 120) return
    await saveField({ age: parsed })
  }

  async function handlePreferenceChange(pref: Preference) {
    setPreference(pref)
    await saveField({ preference: pref })
  }

  async function toggleInterest(interest: string) {
    const next = interests.includes(interest)
      ? interests.filter(i => i !== interest)
      : [...interests, interest]
    setInterests(next)
    await saveField({ interests: next })
  }

  // Photo upload
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${profile.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = urlData.publicUrl
      setAvatarUrl(publicUrl)
      await saveField({ avatar_url: publicUrl })
      showToast('Photo updated!')
    } catch {
      showToast('Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // Final save button
  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await updateProfile({
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        location: location.trim() || null,
        age: parseInt(age, 10) || null,
        interests,
        preference,
      })
      showToast('Profile saved!')
      setTimeout(() => navigate(-1), 800)
    } catch {
      showToast('Save failed')
    } finally {
      setSaving(false)
    }
  }

  const initials = getInitials(fullName || profile?.full_name || 'U')
  const gradient = getGradient(fullName || profile?.full_name || 'U')

  return (
    <div className="flex flex-col h-full bg-[#FFFBF7]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe-top pt-4 pb-3 border-b border-warm-100 flex-shrink-0 bg-[#FFFBF7]">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-warm-600 active:text-warm-900 transition-colors"
        >
          <ChevronLeft size={18} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h1 className="text-base font-bold text-warm-900">Edit Profile</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-1.5 rounded-full bg-gradient-to-r from-primary-500 to-orange-400 text-white text-sm font-semibold disabled:opacity-60 active:scale-[0.97] transition-all"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Photo upload */}
        <div className="flex flex-col items-center py-6 px-5 border-b border-warm-100">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative group"
            aria-label="Change profile photo"
            disabled={uploading}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile photo"
                className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-md"
              />
            ) : (
              <div
                className={cn(
                  'w-24 h-24 rounded-full bg-gradient-to-br flex items-center justify-center ring-4 ring-white shadow-md',
                  gradient
                )}
              >
                <span className="text-white font-bold text-2xl">{initials}</span>
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity">
              {uploading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={24} className="text-white" />
              )}
            </div>
          </button>
          <p className="text-xs text-warm-500 mt-2">Tap to change photo</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Full name */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              onBlur={handleNameBlur}
              placeholder="Your full name"
              className="w-full px-4 py-3 rounded-xl bg-white border border-warm-200 text-warm-900 text-sm placeholder:text-warm-300 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
            />
          </div>

          {/* Bio */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-warm-600 uppercase tracking-wider">
                Bio
              </label>
              <span
                className={cn(
                  'text-xs font-medium',
                  bio.length > BIO_LIMIT ? 'text-rose-500' : 'text-warm-400'
                )}
              >
                {bio.length}/{BIO_LIMIT}
              </span>
            </div>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, BIO_LIMIT))}
              onBlur={handleBioBlur}
              placeholder="Tell people what drives you..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-white border border-warm-200 text-warm-900 text-sm placeholder:text-warm-300 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all resize-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              onBlur={handleLocationBlur}
              placeholder="City, State"
              className="w-full px-4 py-3 rounded-xl bg-white border border-warm-200 text-warm-900 text-sm placeholder:text-warm-300 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
            />
          </div>

          {/* Age */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">
              Age
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={age}
              onChange={e => setAge(e.target.value)}
              onBlur={handleAgeBlur}
              placeholder="Your age"
              min={18}
              max={120}
              className="w-full px-4 py-3 rounded-xl bg-white border border-warm-200 text-warm-900 text-sm placeholder:text-warm-300 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
            />
          </div>

          {/* Preference */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-2">
              Preference
            </label>
            <div className="space-y-2">
              {PREFERENCE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handlePreferenceChange(opt.value)}
                  className={cn(
                    'flex items-center justify-between w-full px-4 py-3.5 rounded-xl border transition-all text-left',
                    preference === opt.value
                      ? 'border-primary-400 bg-primary-50'
                      : 'border-warm-200 bg-white'
                  )}
                >
                  <div>
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        preference === opt.value ? 'text-primary-700' : 'text-warm-800'
                      )}
                    >
                      {opt.label}
                    </p>
                    <p className="text-xs text-warm-500 mt-0.5">{opt.desc}</p>
                  </div>
                  {preference === opt.value && (
                    <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-2">
              Interests
              <span className="normal-case ml-1 font-normal text-warm-400">
                ({interests.length} selected)
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => {
                const selected = interests.includes(interest)
                return (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-[0.96]',
                      selected
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'bg-white border-warm-200 text-warm-700'
                    )}
                  >
                    {interest}
                    {selected && <X size={12} className="text-white/80" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bottom save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary-500 to-orange-400 text-white font-semibold text-base shadow-orange disabled:opacity-60 active:scale-[0.98] transition-all mt-2"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>

          <div className="h-8" aria-hidden />
        </div>
      </div>

      <Toast visible={toastVisible} message={toastMessage} />
    </div>
  )
}
