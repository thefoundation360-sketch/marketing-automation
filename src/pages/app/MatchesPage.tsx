import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Sparkles, CheckCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn, formatTimeAgo, getInitials } from '@/lib/utils'
import { isDemoMode, DEMO_MATCHES, DEMO_CONVERSATIONS } from '@/lib/demoData'
import MatchPercentBadge from '@/components/matching/MatchPercentBadge'
import type { Match, Profile, BucketGoal } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────────

interface MatchWithProfile {
  match: Match
  profile: Profile
  sharedGoals: BucketGoal[]
  lastMessage: string | null
  lastMessageAt: string | null
  conversationId: string | null
  isNew: boolean // never messaged
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

// ── Skeleton loader ───────────────────────────────────────────────────────────

function MatchSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-3 animate-pulse">
      <div className="w-14 h-14 rounded-full bg-warm-100 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-warm-100 rounded w-32" />
        <div className="h-3 bg-warm-100 rounded w-48" />
      </div>
      <div className="h-6 w-20 bg-warm-100 rounded-full" />
    </div>
  )
}

// ── New Match Bubble ──────────────────────────────────────────────────────────

function NewMatchBubble({ match }: { match: MatchWithProfile }) {
  const navigate = useNavigate()
  const initials = getInitials(match.profile.full_name)
  const gradient = getGradient(match.profile.full_name)
  const firstName = match.profile.full_name.split(' ')[0]

  function handleClick() {
    if (match.conversationId) {
      navigate(`/app/messages/${match.conversationId}`)
    } else {
      navigate(`/app/profile/${match.profile.id}`)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[72px] active:scale-95 transition-transform"
    >
      <div className="relative">
        {match.profile.avatar_url ? (
          <img
            src={match.profile.avatar_url}
            alt={match.profile.full_name}
            className="w-14 h-14 rounded-full object-cover ring-3 ring-primary-400 ring-offset-2"
          />
        ) : (
          <div
            className={cn(
              'w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center ring-3 ring-primary-400 ring-offset-2',
              gradient
            )}
          >
            <span className="text-white font-bold text-lg">{initials}</span>
          </div>
        )}
        {/* New indicator dot */}
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary-500 rounded-full border-2 border-white" />
      </div>
      <span className="text-xs text-warm-700 font-medium text-center leading-tight w-full truncate">
        {firstName}
      </span>
    </button>
  )
}

// ── Match List Item ───────────────────────────────────────────────────────────

function MatchListItem({ match }: { match: MatchWithProfile }) {
  const navigate = useNavigate()
  const initials = getInitials(match.profile.full_name)
  const gradient = getGradient(match.profile.full_name)

  function handleClick() {
    if (match.conversationId) {
      navigate(`/app/messages/${match.conversationId}`)
    } else {
      navigate(`/app/profile/${match.profile.id}`)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-3 w-full px-5 py-3.5 active:bg-warm-50 transition-colors text-left"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {match.profile.avatar_url ? (
          <img
            src={match.profile.avatar_url}
            alt={match.profile.full_name}
            className="w-14 h-14 rounded-full object-cover"
          />
        ) : (
          <div
            className={cn(
              'w-14 h-14 rounded-full bg-gradient-to-br flex items-center justify-center',
              gradient
            )}
          >
            <span className="text-white font-bold text-lg">{initials}</span>
          </div>
        )}
        {match.isNew && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary-500 rounded-full border-2 border-white" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-semibold text-warm-900 text-sm leading-tight truncate">
            {match.profile.full_name}
            {match.profile.age ? `, ${match.profile.age}` : ''}
          </span>
          {match.profile.is_verified && (
            <CheckCircle size={13} className="text-primary-500 flex-shrink-0" strokeWidth={2.5} />
          )}
        </div>

        {/* Message preview or CTA */}
        {match.lastMessage ? (
          <p className="text-xs text-warm-500 truncate">{match.lastMessage}</p>
        ) : (
          <p className="text-xs text-primary-500 font-medium flex items-center gap-1">
            <Sparkles size={11} />
            Start a dream together
          </p>
        )}

        <p className="text-[11px] text-warm-400 mt-0.5">
          {match.sharedGoals.length} shared dream{match.sharedGoals.length !== 1 ? 's' : ''}
          {match.lastMessageAt ? ` · ${formatTimeAgo(match.lastMessageAt)}` : ''}
        </p>
      </div>

      {/* Match badge */}
      <div className="flex-shrink-0 flex flex-col items-end gap-2">
        <MatchPercentBadge percentage={match.match.match_percentage} size="sm" />
        {match.lastMessage ? (
          <MessageCircle size={14} className="text-warm-400" />
        ) : (
          <MessageCircle size={14} className="text-primary-400" />
        )}
      </div>
    </button>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyMatches() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="text-5xl mb-4" aria-hidden>🌟</div>
      <h3 className="text-lg font-bold text-warm-900 mb-2">No matches yet!</h3>
      <p className="text-warm-500 text-sm mb-6">
        Keep swiping to find your dream adventure partners.
      </p>
      <button
        onClick={() => navigate('/app/discover')}
        className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary-500 to-orange-400 text-white font-semibold shadow-orange active:scale-[0.98] transition-transform"
      >
        Start Discovering
      </button>
    </div>
  )
}

// ── Matches Page ──────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const { profile } = useAuth()
  const [matches, setMatches] = useState<MatchWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMatches = useCallback(async () => {
    if (!profile) return
    setLoading(true)

    if (isDemoMode()) {
      const conv = DEMO_CONVERSATIONS
      const built: MatchWithProfile[] = DEMO_MATCHES.map(m => {
        const convRow = conv.find(c => c.participant_ids.includes(m.user_b_id))
        return {
          match: m as unknown as Match,
          profile: m.profile,
          sharedGoals: m.shared_goal_titles.map((t, i) => ({
            id: `sg-${i}`, user_id: m.user_b_id, title: t, description: null,
            category: 'Travel' as const, status: 'active' as const, is_public: true,
            completed_at: null, proof_photo_url: null,
            created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          } as BucketGoal)),
          lastMessage: convRow?.last_message ?? null,
          lastMessageAt: convRow?.last_message_at ?? null,
          conversationId: convRow?.id ?? null,
          isNew: !convRow?.last_message,
        }
      })
      setMatches(built)
      setLoading(false)
      return
    }

    try {
      // Fetch all matched rows involving this user
      const { data: matchRows, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user_a_id.eq.${profile.id},user_b_id.eq.${profile.id}`)
        .eq('status', 'matched')
        .order('matched_at', { ascending: false })

      if (error) throw error

      if (!matchRows || matchRows.length === 0) {
        setMatches([])
        return
      }

      // Get the other user's id for each match
      const otherIds = matchRows.map(m =>
        m.user_a_id === profile.id ? m.user_b_id : m.user_a_id
      )

      // Fetch other profiles
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('*')
        .in('id', otherIds)

      // Fetch conversations
      const { data: convRows } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [profile.id])

      // Fetch shared goals (public goals of other users)
      const { data: goalRows } = await supabase
        .from('bucket_goals')
        .select('*')
        .in('user_id', otherIds)
        .eq('is_public', true)

      const profileMap = new Map((profileRows ?? []).map(p => [p.id, p]))
      const goalsMap = new Map<string, BucketGoal[]>()
      for (const g of (goalRows ?? [])) {
        const arr = goalsMap.get(g.user_id) ?? []
        arr.push(g)
        goalsMap.set(g.user_id, arr)
      }

      const built: MatchWithProfile[] = matchRows
        .map(m => {
          const otherId = m.user_a_id === profile.id ? m.user_b_id : m.user_a_id
          const otherProfile = profileMap.get(otherId)
          if (!otherProfile) return null

          // Find conversation between both users
          const conv = (convRows ?? []).find(c =>
            c.participant_ids.includes(otherId) && c.participant_ids.includes(profile.id)
          )

          return {
            match: m,
            profile: otherProfile,
            sharedGoals: m.shared_goals
              ? (goalsMap.get(otherId) ?? []).filter(g => (m.shared_goals as string[]).includes(g.id))
              : (goalsMap.get(otherId) ?? []).slice(0, 3),
            lastMessage: conv?.last_message ?? null,
            lastMessageAt: conv?.last_message_at ?? null,
            conversationId: conv?.id ?? null,
            isNew: !conv?.last_message,
          } satisfies MatchWithProfile
        })
        .filter((m): m is MatchWithProfile => m !== null)

      setMatches(built)
    } catch {
      // If DB not connected, show empty state gracefully
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  const newMatches = matches.filter(m => m.isNew)
  const allMatches = matches

  return (
    <div className="flex flex-col h-full bg-[#FFFBF7]">
      {/* Header */}
      <div className="px-5 pt-safe-top pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-warm-900">Matches</h1>
          {matches.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-primary-500 text-white text-xs font-bold">
              {matches.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="space-y-0">
            {[...Array(5)].map((_, i) => <MatchSkeleton key={i} />)}
          </div>
        ) : matches.length === 0 ? (
          <EmptyMatches />
        ) : (
          <>
            {/* New Matches horizontal scroll */}
            {newMatches.length > 0 && (
              <div className="mb-2">
                <div className="px-5 mb-3">
                  <h2 className="text-sm font-semibold text-warm-600 uppercase tracking-wider">
                    New Matches
                  </h2>
                </div>
                <div className="flex gap-4 px-5 pb-3 overflow-x-auto scrollbar-none">
                  {newMatches.map(m => (
                    <NewMatchBubble key={m.match.id} match={m} />
                  ))}
                </div>
                <div className="h-px bg-warm-100 mx-5 mt-1" />
              </div>
            )}

            {/* All Matches list */}
            <div>
              <div className="px-5 py-3">
                <h2 className="text-sm font-semibold text-warm-600 uppercase tracking-wider">
                  All Matches
                </h2>
              </div>
              <div className="divide-y divide-warm-100">
                {allMatches.map(m => (
                  <MatchListItem key={m.match.id} match={m} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
