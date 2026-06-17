import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Share2, MapPin, CheckCircle, Heart, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Profile, BucketListGoal, UserInterest, GOAL_CATEGORIES } from '../types'
import Avatar from '../components/ui/Avatar'
import Skeleton from '../components/ui/Skeleton'
import Button from '../components/ui/Button'

// ─── Loading skeleton ────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <div className="h-36 bg-gradient-to-br from-orange-300 to-orange-400 animate-pulse" />
      <div className="px-4 pb-24 -mt-10">
        <Skeleton variant="avatar" size="xl" className="mb-4" />
        <Skeleton variant="text" lines={2} className="mb-4" />
        <Skeleton variant="card" className="mb-4" />
        <Skeleton variant="card" className="mb-4" />
        <Skeleton variant="card" />
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user, isGuest } = useAuth()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [goals, setGoals] = useState<BucketListGoal[]>([])
  const [interests, setInterests] = useState<UserInterest[]>([])
  const [matchId, setMatchId] = useState<string | null>(null)
  const [isMatched, setIsMatched] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [liking, setLiking] = useState(false)

  const loadProfile = useCallback(async () => {
    if (!username) return
    setLoading(true)
    setNotFound(false)

    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username.toLowerCase())
        .single()

      if (error || !profileData) {
        setNotFound(true)
        return
      }

      setProfile(profileData as Profile)

      const [goalsRes, interestsRes] = await Promise.all([
        supabase
          .from('bucket_list_goals')
          .select('*')
          .eq('user_id', profileData.id)
          .eq('is_public', true)
          .order('order_index', { ascending: true }),
        supabase
          .from('user_interests')
          .select('*')
          .eq('user_id', profileData.id),
      ])

      setGoals((goalsRes.data ?? []) as BucketListGoal[])
      setInterests((interestsRes.data ?? []) as UserInterest[])

      // Check match status if the viewer is a logged-in user
      if (user && profileData.id !== user.id) {
        const uid1 = user.id < profileData.id ? user.id : profileData.id
        const uid2 = user.id < profileData.id ? profileData.id : user.id
        const { data: matchRows } = await supabase
          .from('matches')
          .select('id')
          .eq('user1_id', uid1)
          .eq('user2_id', uid2)
          .limit(1)

        if (matchRows && matchRows.length > 0) {
          setIsMatched(true)
          setMatchId(matchRows[0].id)
        }
      }
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [username, user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Redirect to own profile page if viewing self
  useEffect(() => {
    if (!loading && profile && user && profile.id === user.id) {
      navigate('/profile', { replace: true })
    }
  }, [loading, profile, user, navigate])

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: `${profile?.full_name ?? 'Someone'} on DreamLink`, url })
      } catch {
        // user cancelled native share
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        toast.success('Profile link copied!')
      } catch {
        toast.error('Could not copy link')
      }
    }
  }

  const handleLike = async () => {
    if (!user || !profile) return
    setLiking(true)
    try {
      const { error } = await supabase
        .from('swipes')
        .insert({ swiper_id: user.id, swiped_id: profile.id, action: 'like' })

      if (error) {
        if (error.code === '23505') {
          toast('You already liked this profile', { icon: '💛' })
        } else {
          throw error
        }
      } else {
        toast.success('Profile liked!')
      }
    } catch {
      toast.error('Failed to like profile')
    } finally {
      setLiking(false)
    }
  }

  const getCategoryEmoji = (category: string) =>
    GOAL_CATEGORIES.find((c) => c.value === category)?.emoji ?? '🎯'

  // ── Not found ────────────────────────────────────────────────────────────

  if (notFound) {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Profile not found</h2>
        <p className="text-gray-500 mb-6">
          This user doesn't exist or has made their profile private.
        </p>
        <Button variant="primary" onClick={() => navigate('/')}>
          Back to Home
        </Button>
      </div>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) return <ProfileSkeleton />
  if (!profile) return null

  const isLoggedIn = !!user || isGuest
  const isOwnProfile = user && profile.id === user.id
  const displayName = profile.full_name || profile.username || 'DreamLinker'
  const completedCount = goals.filter((g) => g.is_completed).length

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-32">
      {/* ── Gradient header ── */}
      <div className="relative h-36 bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="absolute top-4 left-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <button
          onClick={handleShare}
          aria-label="Share profile"
          className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
        >
          <Share2 size={20} className="text-white" />
        </button>
      </div>

      {/* ── Avatar + meta ── */}
      <div className="px-4 -mt-10 pb-6">
        <div className="mb-3">
          <Avatar
            src={profile.avatar_url}
            name={profile.full_name}
            size="xl"
            verified={profile.is_verified}
          />
        </div>

        {/* Name */}
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
          {profile.is_verified && (
            <CheckCircle size={16} className="text-blue-500 flex-shrink-0" aria-label="Verified" />
          )}
        </div>

        {profile.username && (
          <p className="text-sm text-gray-500 mb-1">@{profile.username}</p>
        )}

        {/* Location & age */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
          {profile.location && (
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <MapPin size={13} className="flex-shrink-0" />
              {profile.location}
            </span>
          )}
          {profile.age && (
            <span className="text-sm text-gray-500">{profile.age} years old</span>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-gray-600 leading-relaxed mb-1">{profile.bio}</p>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Goals', value: goals.length },
            { label: 'Completed', value: completedCount },
            {
              label: 'Progress',
              value:
                goals.length > 0
                  ? `${Math.round((completedCount / goals.length) * 100)}%`
                  : '0%',
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-3 text-center shadow-sm">
              <p className="text-xl font-bold text-orange-500">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Interests ── */}
        {interests.length > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2.5">Interests</h2>
            <div className="flex flex-wrap gap-2">
              {interests.map((item) => (
                <span
                  key={item.id}
                  className="bg-orange-50 text-orange-700 rounded-full px-3 py-1 text-sm font-medium"
                >
                  {item.interest}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* ── Bucket List ── */}
        <section className="mt-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2.5">Bucket List ✨</h2>
          {goals.length === 0 ? (
            <div className="bg-white rounded-2xl p-5 text-center shadow-sm">
              <p className="text-gray-400 text-sm">No public goals yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {goals.map((goal, i) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3"
                >
                  <span className="text-xl flex-shrink-0">{getCategoryEmoji(goal.category)}</span>
                  <span
                    className={`text-sm flex-1 font-medium ${
                      goal.is_completed
                        ? 'line-through text-gray-400'
                        : 'text-gray-800'
                    }`}
                  >
                    {goal.title}
                  </span>
                  {goal.is_completed && (
                    <span className="text-green-500 text-base flex-shrink-0" aria-label="Completed">
                      ✓
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* ── Inline CTA for unauthenticated (below content) ── */}
        {!isLoggedIn && (
          <div className="mt-8 p-6 bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl text-center text-white">
            <h3 className="text-xl font-bold mb-1">Chase Dreams Together</h3>
            <p className="text-orange-100 text-sm mb-4">
              Join DreamLink to connect with{' '}
              {profile.full_name?.split(' ')[0] ?? 'them'} and others who share
              your bucket list goals.
            </p>
            <button
              onClick={() => navigate('/auth')}
              className="bg-white text-orange-600 font-bold px-6 py-3 rounded-2xl active:scale-95 transition-transform"
            >
              Join Free
            </button>
          </div>
        )}
      </div>

      {/* ── Sticky bottom CTA ── */}
      {!isOwnProfile && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 py-4">
          {!isLoggedIn ? (
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white">
              <h3 className="font-bold text-base mb-0.5">
                Join DreamLink to Connect
              </h3>
              <p className="text-orange-100 text-xs mb-3">
                Sign up free to send messages and match with{' '}
                {profile.full_name?.split(' ')[0] ?? 'them'}
              </p>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate('/auth')}
              >
                Join Free
              </Button>
            </div>
          ) : isMatched ? (
            <Button
              variant="primary"
              fullWidth
              icon={<MessageCircle size={18} />}
              onClick={() =>
                matchId ? navigate(`/matches?match=${matchId}`) : navigate('/matches')
              }
            >
              Send Message
            </Button>
          ) : (
            <Button
              variant="primary"
              fullWidth
              loading={liking}
              icon={<Heart size={18} />}
              onClick={handleLike}
            >
              Like Profile
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
