import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft,
  Camera,
  MapPin,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Users,
  Heart,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, getAvatarUrl, uploadAvatar } from '../lib/supabase'
import { UserInterest } from '../types'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const INTEREST_OPTIONS = [
  'Travel',
  'Hiking',
  'Cooking',
  'Photography',
  'Music',
  'Art',
  'Reading',
  'Gaming',
  'Fitness',
  'Yoga',
  'Dancing',
  'Surfing',
  'Skiing',
  'Climbing',
  'Cycling',
  'Running',
  'Swimming',
  'Meditation',
  'Volunteering',
  'Languages',
]

type SoloSquadPreference = 'solo' | 'squad' | 'both'

interface FormErrors {
  fullName?: string
  username?: string
  bio?: string
  age?: string
  location?: string
}

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function EditProfilePage() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile } = useAuth()

  // Form state
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [age, setAge] = useState('')
  const [location, setLocation] = useState('')
  const [soloSquadPref, setSoloSquadPref] = useState<SoloSquadPreference>('both')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Validation state
  const [errors, setErrors] = useState<FormErrors>({})
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle')
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Save state
  const [saving, setSaving] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Pre-populate from profile
  useEffect(() => {
    if (!profile) return

    setFullName(profile.full_name ?? '')
    setUsername(profile.username ?? '')
    setBio(profile.bio ?? '')
    setAge(profile.age != null ? String(profile.age) : '')
    setLocation(profile.location ?? '')
    setSoloSquadPref((profile.solo_squad_preference as SoloSquadPreference) ?? 'both')

    if (profile.avatar_url) {
      setAvatarPreview(getAvatarUrl(profile.avatar_url))
    }
  }, [profile])

  // Fetch current interests
  useEffect(() => {
    if (!user) return
    ;(async () => {
      const { data } = await supabase
        .from('user_interests')
        .select('*')
        .eq('user_id', user.id)
      if (data) {
        setSelectedInterests((data as UserInterest[]).map((i) => i.interest))
      }
      setInitialLoading(false)
    })()
  }, [user])

  // Username validation + debounced uniqueness check
  const checkUsernameAvailability = useCallback(
    async (value: string) => {
      if (!value) {
        setUsernameStatus('idle')
        return
      }

      const usernameRegex = /^[a-zA-Z0-9_]+$/
      if (value.length < 3 || value.length > 20 || !usernameRegex.test(value)) {
        setUsernameStatus('invalid')
        return
      }

      setUsernameStatus('checking')
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', value)
          .neq('id', user?.id ?? '')
          .maybeSingle()

        if (error) throw error
        setUsernameStatus(data ? 'taken' : 'available')
      } catch {
        setUsernameStatus('idle')
      }
    },
    [user?.id]
  )

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    setUsernameStatus('idle')

    if (usernameDebounceRef.current) {
      clearTimeout(usernameDebounceRef.current)
    }

    usernameDebounceRef.current = setTimeout(() => {
      checkUsernameAvailability(value)
    }, 500)
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (usernameDebounceRef.current) {
        clearTimeout(usernameDebounceRef.current)
      }
    }
  }, [])

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    )
  }

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    } else if (fullName.trim().length > 50) {
      newErrors.fullName = 'Full name must be 50 characters or fewer'
    }

    if (username) {
      const usernameRegex = /^[a-zA-Z0-9_]+$/
      if (username.length < 3 || username.length > 20) {
        newErrors.username = 'Username must be 3–20 characters'
      } else if (!usernameRegex.test(username)) {
        newErrors.username = 'Only letters, numbers, and underscores allowed'
      } else if (usernameStatus === 'taken') {
        newErrors.username = 'Username is already taken'
      } else if (usernameStatus === 'checking') {
        newErrors.username = 'Checking username availability...'
      }
    }

    if (bio.length > 160) {
      newErrors.bio = 'Bio must be 160 characters or fewer'
    }

    if (age) {
      const ageNum = parseInt(age, 10)
      if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
        newErrors.age = 'Age must be between 18 and 100'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate() || !user) return

    setSaving(true)
    try {
      // Upload avatar if a new file was selected
      let avatarPath = profile?.avatar_url
      if (avatarFile) {
        const uploaded = await uploadAvatar(user.id, avatarFile)
        if (uploaded) {
          avatarPath = uploaded
        } else {
          toast.error('Failed to upload photo')
          setSaving(false)
          return
        }
      }

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          username: username.trim() || null,
          bio: bio.trim() || null,
          age: age ? parseInt(age, 10) : null,
          location: location.trim() || null,
          solo_squad_preference: soloSquadPref,
          avatar_url: avatarPath ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // Replace interests
      const { error: deleteError } = await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      if (selectedInterests.length > 0) {
        const { error: insertError } = await supabase.from('user_interests').insert(
          selectedInterests.map((interest) => ({
            user_id: user.id,
            interest,
          }))
        )
        if (insertError) throw insertError
      }

      await refreshProfile()
      toast.success('Profile updated!')
      navigate('/profile')
    } catch (err) {
      console.error('Save error:', err)
      toast.error('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const displayName = profile?.full_name ?? profile?.username ?? '?'
  const avatarInitials = displayName
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const getUsernameRightElement = () => {
    if (usernameStatus === 'checking') {
      return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
    }
    if (usernameStatus === 'available') {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') {
      return <XCircle className="w-4 h-4 text-red-400" />
    }
    return undefined
  }

  const getUsernameError = () => {
    if (errors.username) return errors.username
    if (usernameStatus === 'taken') return 'Username is already taken'
    if (usernameStatus === 'invalid' && username.length > 0) {
      if (username.length < 3) return 'Username must be at least 3 characters'
      if (username.length > 20) return 'Username must be 20 characters or fewer'
      return 'Only letters, numbers, and underscores allowed'
    }
    return undefined
  }

  const getUsernameSuccess = () => {
    if (usernameStatus === 'available' && !errors.username) return 'Username is available!'
    return undefined
  }

  const soloSquadOptions: {
    value: SoloSquadPreference
    label: string
    description: string
    icon: React.ReactNode
  }[] = [
    {
      value: 'solo',
      label: 'Solo',
      description: 'Going alone',
      icon: <User className="w-5 h-5" />,
    },
    {
      value: 'squad',
      label: 'Squad',
      description: 'Going with others',
      icon: <Users className="w-5 h-5" />,
    },
    {
      value: 'both',
      label: 'Both',
      description: 'Open to either',
      icon: <Heart className="w-5 h-5" />,
    },
  ]

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-700"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-gray-900">Edit Profile</h1>
          <Button
            variant="primary"
            size="sm"
            loading={saving}
            onClick={handleSave}
          >
            Save
          </Button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Profile photo */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative group"
            aria-label="Change profile photo"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden bg-orange-100 ring-4 ring-white shadow-md flex items-center justify-center">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-orange-600 font-bold text-3xl">{avatarInitials}</span>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div className="absolute bottom-0 right-0 bg-orange-500 rounded-full p-1.5 shadow-md border-2 border-white">
              <Camera className="w-3 h-3 text-white" />
            </div>
          </button>
          <p className="text-xs text-gray-400">Tap to change photo</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarSelect}
          />
        </div>

        {/* Full name */}
        <Input
          label="Full Name"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value)
            if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }))
          }}
          error={errors.fullName}
          placeholder="Your full name"
          maxLength={50}
          fullWidth
        />

        {/* Username */}
        <Input
          label="Username"
          value={username}
          onChange={(e) => {
            handleUsernameChange(e.target.value)
            if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }))
          }}
          leftIcon={<span className="text-sm text-gray-400 font-medium">@</span>}
          rightElement={getUsernameRightElement()}
          error={getUsernameError()}
          success={getUsernameSuccess()}
          placeholder="your_username"
          maxLength={20}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          fullWidth
        />

        {/* Bio */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => {
              if (e.target.value.length <= 160) {
                setBio(e.target.value)
                if (errors.bio) setErrors((prev) => ({ ...prev, bio: undefined }))
              }
            }}
            placeholder="Tell people what you're about..."
            rows={3}
            className={`w-full rounded-xl border px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-400 resize-none outline-none transition-all duration-150 focus:ring-2 focus:ring-offset-0 ${
              errors.bio
                ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                : 'border-gray-200 focus:border-orange-400 focus:ring-orange-100'
            }`}
          />
          <div className="flex items-center justify-between">
            {errors.bio ? (
              <p className="text-xs text-red-500">{errors.bio}</p>
            ) : (
              <span />
            )}
            <span
              className={`text-xs ml-auto ${
                bio.length > 140 ? 'text-red-500 font-semibold' : 'text-gray-400'
              }`}
            >
              {bio.length}/160
            </span>
          </div>
        </div>

        {/* Age */}
        <Input
          label="Age"
          type="number"
          value={age}
          onChange={(e) => {
            setAge(e.target.value)
            if (errors.age) setErrors((prev) => ({ ...prev, age: undefined }))
          }}
          error={errors.age}
          placeholder="25"
          min={18}
          max={100}
          fullWidth
        />

        {/* Location */}
        <Input
          label="Location"
          value={location}
          onChange={(e) => {
            setLocation(e.target.value)
            if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }))
          }}
          error={errors.location}
          leftIcon={<MapPin className="w-4 h-4" />}
          placeholder="City, Country"
          fullWidth
        />

        {/* Solo / Squad preference */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Adventure Preference
          </label>
          <div className="grid grid-cols-3 gap-3">
            {soloSquadOptions.map((option) => {
              const isSelected = soloSquadPref === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => setSoloSquadPref(option.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-150 ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className={isSelected ? 'text-orange-600' : 'text-gray-400'}>
                    {option.icon}
                  </span>
                  <span className="text-sm font-semibold">{option.label}</span>
                  <span className="text-xs text-center leading-tight opacity-70">
                    {option.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Interests */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Interests
          </label>
          <p className="text-xs text-gray-400 mb-3">Tap to select what excites you</p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => {
              const isSelected = selectedInterests.includes(interest)
              return (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                  }`}
                >
                  {interest}
                </button>
              )
            })}
          </div>
        </div>

        {/* Save button (bottom) */}
        <div className="pt-2">
          <Button
            variant="primary"
            fullWidth
            loading={saving}
            onClick={handleSave}
            size="lg"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
