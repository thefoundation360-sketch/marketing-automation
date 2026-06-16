import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  MapPin,
  Calendar,
  Crown,
  Bell,
  Moon,
  LogOut,
  Share2,
  ChevronRight,
  CheckCircle2,
  Settings,
  Edit2,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, getAvatarUrl } from '../lib/supabase'
import { BucketListGoal, UserInterest, GOAL_CATEGORIES } from '../types'
import Button from '../components/ui/Button'

interface ProfileStats {
  goals: number
  matches: number
  completed: number
}

const TIER_CONFIG = {
  free: { label: 'Free', className: 'bg-gray-100 text-gray-600' },
  premium: { label: 'Premium', className: 'bg-orange-100 text-orange-600' },
  elite: { label: 'Elite', className: 'bg-purple-100 text-purple-700' },
  business: { label: 'Business', className: 'bg-blue-100 text-blue-700' },
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-100 rounded-lg ${className ?? ''}`} />
  )
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, profile, signOut, loading: authLoading } = useAuth()

  const [goals, setGoals] = useState<BucketListGoal[]>([])
  const [interests, setInterests] = useState<UserInterest[]>([])
  const [stats, setStats] = useState<ProfileStats>({ goals: 0, matches: 0, completed: 0 })
  const [dataLoading, setDataLoading] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user) return
    setDataLoading(true)
    try {
      const [goalsRes, interestsRes, matchesRes] = await Promise.all([
        supabase
          .from('bucket_list_goals')
          .select('*')
          .eq('user_id', user.id)
          .order('order_index', { ascending: true }),
        supabase
          .from('user_interests')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
      ])

      const fetchedGoals = (goalsRes.data ?? []) as BucketListGoal[]
      setGoals(fetchedGoals)
      setInterests((interestsRes.data ?? []) as UserInterest[])
      setStats({
        goals: fetchedGoals.length,
        matches: matchesRes.count ?? 0,
        completed: fetchedGoals.filter((g) => g.is_completed).length,
      })
    } catch (err) {
      console.error('Error fetching profile data:', err)
    } finally {
      setDataLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/')
    } catch {
      toast.error('Failed to sign out')
      setSigningOut(false)
    }
  }

  const handleShareProfile = async () => {
    const username = profile?.username
    const url = username
      ? `https://dreamlink.app/u/${username}`
      : `https://dreamlink.app/u/${user?.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied!')
    } catch {
      toast.error('Could not copy link')
    }
  }

  const avatarUrl = profile?.avatar_url ? getAvatarUrl(profile.avatar_url) : null
  const displayName = profile?.full_name ?? profile?.username ?? 'DreamLinker'
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const tierConfig = TIER_CONFIG[profile?.subscription_tier ?? 'free']
  const completedCount = stats.completed
  const totalGoals = stats.goals
  const progressPercent = totalGoals > 0 ? Math.round((completedCount / totalGoals) * 100) : 0

  const isLoading = authLoading || dataLoading

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No profile found.</p>
          <Button variant="primary" onClick={() => navigate('/')}>
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header gradient cover */}
      <div className="relative h-32 bg-gradient-to-br from-orange-400 to-orange-600">
        <button
          onClick={() => navigate('/edit-profile')}
          className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
          aria-label="Edit profile"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      </div>

      {/* Avatar + basic info */}
      <div className="px-4">
        <div className="flex items-end justify-between -mt-10 mb-3">
          <div className="relative">
            <div className="w-20 h-20 rounded-full ring-4 ring-white overflow-hidden bg-orange-100 flex items-center justify-center shadow-md">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <span className="text-orange-600 font-bold text-2xl">{initials}</span>
              )}
            </div>
          </div>
          <div className="mb-1">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${tierConfig.className}`}>
              {profile.subscription_tier !== 'free' && (
                <Crown className="w-3 h-3 inline mr-1 -mt-0.5" />
              )}
              {tierConfig.label}
            </span>
          </div>
        </div>

        {/* Name + username */}
        <div className="mb-1">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
            {profile.is_verified && (
              <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
            )}
          </div>
          {profile.username && (
            <p className="text-gray-500 text-sm">@{profile.username}</p>
          )}
        </div>

        {/* Location + age */}
        {(profile.location || profile.age) && (
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {profile.location}
              </span>
            )}
            {profile.age && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {profile.age} years old
              </span>
            )}
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-gray-600 text-sm leading-relaxed mb-4">{profile.bio}</p>
        )}

        {/* Stats row */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 grid grid-cols-3 divide-x divide-gray-100 mb-4">
          {[
            { label: 'Goals', value: isLoading ? '—' : stats.goals },
            { label: 'Matches', value: isLoading ? '—' : stats.matches },
            { label: 'Completed', value: isLoading ? '—' : stats.completed },
          ].map(({ label, value }) => (
            <div key={label} className="py-4 flex flex-col items-center gap-0.5">
              <span className="text-2xl font-bold text-gray-900">{value}</span>
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {!isLoading && totalGoals > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-700">Bucket List Progress</span>
              <span className="text-sm text-orange-600 font-bold">{progressPercent}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              {completedCount} of {totalGoals} goals completed
            </p>
          </div>
        )}

        {/* Interests */}
        <div className="mb-4">
          <h2 className="text-base font-bold text-gray-900 mb-2">My Interests</h2>
          {isLoading ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[1, 2, 3, 4].map((i) => (
                <SkeletonBlock key={i} className="h-7 w-20 shrink-0 rounded-full" />
              ))}
            </div>
          ) : interests.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No interests added yet.</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {interests.map((i) => (
                <span
                  key={i.id}
                  className="shrink-0 bg-orange-50 text-orange-700 rounded-full px-3 py-1 text-sm font-medium border border-orange-100"
                >
                  {i.interest}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Bucket list goals preview */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-gray-900">Bucket List</h2>
            <Link
              to="/bucket-list"
              className="text-sm text-orange-500 font-semibold hover:text-orange-600"
            >
              See all →
            </Link>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <SkeletonBlock key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : goals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-400 mb-2">No goals yet!</p>
              <Link to="/bucket-list">
                <Button variant="secondary" size="sm">
                  Add Goals
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {goals.slice(0, 3).map((goal) => {
                const cat = GOAL_CATEGORIES.find((c) => c.value === goal.category)
                return (
                  <div
                    key={goal.id}
                    className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm"
                  >
                    <span className="text-xl shrink-0">{cat?.emoji ?? '🎯'}</span>
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">
                      {goal.title}
                    </span>
                    {goal.is_completed && (
                      <span className="shrink-0 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        Done
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Settings section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-50">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
              <Settings className="w-3.5 h-3.5" />
              Settings
            </div>
          </div>

          {/* Subscription */}
          <button
            onClick={() => navigate('/pricing')}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50"
          >
            <div className="flex items-center gap-3">
              <Crown className="w-4.5 h-4.5 text-orange-500 w-5 h-5" />
              <span className="text-sm font-medium text-gray-800">Subscription</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 capitalize">{profile.subscription_tier}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </button>

          {/* Notifications */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-800">Notifications</span>
            </div>
            <button
              onClick={() => setNotificationsEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                notificationsEnabled ? 'bg-orange-500' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={notificationsEnabled}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Dark mode */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <Moon className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-800">Dark Mode</span>
            </div>
            <button
              onClick={() => setDarkMode((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                darkMode ? 'bg-orange-500' : 'bg-gray-200'
              }`}
              role="switch"
              aria-checked={darkMode}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 active:bg-red-100 transition-colors text-left"
          >
            {signingOut ? (
              <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogOut className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm font-medium text-red-500">
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </span>
          </button>
        </div>

        {/* Share profile button */}
        <Button
          variant="secondary"
          fullWidth
          icon={<Share2 className="w-4 h-4" />}
          onClick={handleShareProfile}
        >
          Share Profile
        </Button>
      </div>
    </div>
  )
}
