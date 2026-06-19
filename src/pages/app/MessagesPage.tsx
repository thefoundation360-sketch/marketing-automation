import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit2, Search, ChevronDown, ChevronUp, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn, formatTimeAgo } from '@/lib/utils'
import { isDemoMode, DEMO_CONVERSATIONS } from '@/lib/demoData'
import Avatar from '@/components/shared/Avatar'
import { VerifiedBadge } from '@/components/shared/Badge'
import { ListItemSkeleton } from '@/components/shared/LoadingSkeleton'
import EmptyState from '@/components/shared/EmptyState'
import type { Conversation, Profile } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────────

interface ConversationWithProfile {
  conversation: Conversation
  otherProfile: Profile
  unreadCount: number
  isOnline: boolean
  isMatch: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncateMessage(msg: string | null, maxLen = 40): string {
  if (!msg) return 'Tap to start chatting'
  if (msg.length <= maxLen) return msg
  return msg.slice(0, maxLen).trimEnd() + '…'
}

// ── Conversation Row ───────────────────────────────────────────────────────────

interface ConversationRowProps {
  item: ConversationWithProfile
  currentUserId: string
}

function ConversationRow({ item, currentUserId: _currentUserId }: ConversationRowProps) {
  const navigate = useNavigate()
  const { conversation, otherProfile, unreadCount, isOnline } = item

  return (
    <button
      onClick={() => navigate(`/app/messages/${conversation.id}`)}
      className="flex items-center gap-3 w-full px-4 py-3.5 active:bg-warm-50 transition-colors text-left"
    >
      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        <Avatar
          url={otherProfile.avatar_url}
          name={otherProfile.full_name}
          size="md"
        />
        {isOnline && (
          <span
            className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"
            aria-label="Online"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name row */}
        <div className="flex items-center gap-1 mb-0.5">
          <span
            className={cn(
              'text-sm leading-tight truncate',
              unreadCount > 0 ? 'font-bold text-warm-900' : 'font-semibold text-warm-800'
            )}
          >
            {otherProfile.full_name}
          </span>
          {otherProfile.is_verified && <VerifiedBadge size={13} />}
        </div>

        {/* Message preview */}
        <p
          className={cn(
            'text-xs truncate',
            unreadCount > 0 ? 'text-warm-800 font-medium' : 'text-warm-500'
          )}
        >
          {truncateMessage(conversation.last_message)}
        </p>
      </div>

      {/* Right side: time + unread badge */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {conversation.last_message_at && (
          <span className="text-[11px] text-warm-400 leading-none">
            {formatTimeAgo(conversation.last_message_at)}
          </span>
        )}
        {unreadCount > 0 && (
          <span className="min-w-[20px] h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>
    </button>
  )
}

// ── Message Requests Section ───────────────────────────────────────────────────

interface MessageRequestsProps {
  items: ConversationWithProfile[]
  currentUserId: string
}

function MessageRequestsSection({ items, currentUserId }: MessageRequestsProps) {
  const [expanded, setExpanded] = useState(false)

  if (items.length === 0) return null

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(prev => !prev)}
        className="flex items-center justify-between w-full px-4 py-3 active:bg-warm-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-warm-700">Message Requests</span>
          <span className="min-w-[20px] h-5 bg-warm-200 text-warm-700 text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
            {items.length}
          </span>
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-warm-400" />
        ) : (
          <ChevronDown size={16} className="text-warm-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-warm-100">
          {items.map(item => (
            <ConversationRow
              key={item.conversation.id}
              item={item}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      <div className="h-px bg-warm-100 mx-4 mt-1" />
    </div>
  )
}

// ── Messages Page ─────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [conversations, setConversations] = useState<ConversationWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    if (isDemoMode()) {
      const built: ConversationWithProfile[] = DEMO_CONVERSATIONS.map(c => ({
        conversation: c as unknown as Conversation,
        otherProfile: c.other_profile,
        unreadCount: c.unread,
        isOnline: c.other_profile.id === 'demo-2',
        isMatch: true,
      }))
      setConversations(built)
      setLoading(false)
      return
    }

    if (!user || !profile) return

    try {
      // Fetch all conversations this user participates in
      const { data: convRows, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [user.id])
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (convError) throw convError
      if (!convRows || convRows.length === 0) {
        setConversations([])
        return
      }

      // Collect all other participant IDs
      const otherUserIds = Array.from(
        new Set(
          convRows.flatMap((c: Conversation) =>
            c.participant_ids.filter(id => id !== user.id)
          )
        )
      )

      if (otherUserIds.length === 0) {
        setConversations([])
        return
      }

      // Fetch profiles for other participants
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', otherUserIds)

      if (profileError) throw profileError

      const profileMap = new Map<string, Profile>(
        (profileRows ?? []).map((p: Profile) => [p.id, p])
      )

      // Fetch unread counts per conversation
      const conversationIds = convRows.map((c: Conversation) => c.id)
      const { data: unreadRows } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .is('read_at', null)

      const unreadMap = new Map<string, number>()
      for (const row of unreadRows ?? []) {
        unreadMap.set(
          row.conversation_id,
          (unreadMap.get(row.conversation_id) ?? 0) + 1
        )
      }

      // Check which conversations have a corresponding match
      const { data: matchRows } = await supabase
        .from('matches')
        .select('user_a_id, user_b_id')
        .or(
          otherUserIds
            .map(id =>
              `and(user_a_id.eq.${user.id},user_b_id.eq.${id}),and(user_a_id.eq.${id},user_b_id.eq.${user.id})`
            )
            .join(',')
        )
        .eq('status', 'matched')

      const matchedUserIds = new Set<string>(
        (matchRows ?? []).flatMap((m: { user_a_id: string; user_b_id: string }) => [
          m.user_a_id,
          m.user_b_id,
        ])
      )

      const built: ConversationWithProfile[] = convRows
        .map((conv: Conversation) => {
          const otherId = conv.participant_ids.find(id => id !== user.id)
          if (!otherId) return null
          const otherProfile = profileMap.get(otherId)
          if (!otherProfile) return null

          return {
            conversation: conv,
            otherProfile,
            unreadCount: unreadMap.get(conv.id) ?? 0,
            // Simulate online status: deterministic based on user id character sum
            isOnline:
              otherProfile.id
                .split('')
                .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) %
                5 ===
              0,
            isMatch:
              matchedUserIds.has(otherId) &&
              // is_match_gated false means it IS a match-based convo
              !conv.is_match_gated,
          } satisfies ConversationWithProfile
        })
        .filter((c): c is ConversationWithProfile => c !== null)

      setConversations(built)
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [user, profile])

  // Initial load
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // ── Realtime subscription ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`conversations-list-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchConversations])

  // ── Search focus ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [showSearch])

  // ── Filtered conversations ────────────────────────────────────────────────────

  const filtered = conversations.filter(item => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      item.otherProfile.full_name.toLowerCase().includes(q) ||
      (item.otherProfile.username?.toLowerCase().includes(q) ?? false)
    )
  })

  // Split into match convos vs message requests (is_match_gated = true means not yet matched)
  const matchConversations = filtered.filter(item => !item.conversation.is_match_gated)
  const requestConversations = filtered.filter(item => item.conversation.is_match_gated)

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#FFFBF7]">
      {/* Header */}
      <div className="flex-shrink-0 bg-[#FFFBF7] sticky top-0 z-10 border-b border-warm-100">
        <div className="flex items-center justify-between px-4 pt-safe-top pt-4 pb-3">
          <h1 className="text-2xl font-bold text-warm-900">Messages</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(prev => !prev)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-warm-100 active:bg-warm-200 transition-colors"
              aria-label="Search conversations"
            >
              <Search size={17} className="text-warm-700" />
            </button>
            <button
              onClick={() => navigate('/app/messages/new')}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-primary-500 active:bg-primary-600 transition-colors shadow-sm"
              aria-label="New message"
            >
              <Edit2 size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        {showSearch && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 bg-warm-100 rounded-xl px-3 py-2">
              <Search size={15} className="text-warm-400 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search conversations…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-warm-800 placeholder-warm-400 outline-none"
              />
              {searchQuery.length > 0 && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="flex-shrink-0 active:opacity-70"
                  aria-label="Clear search"
                >
                  <X size={14} className="text-warm-400" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="divide-y divide-warm-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon="💬"
            title="No conversations yet"
            description="Match with someone to start chatting!"
            actionLabel="Start Discovering"
            onAction={() => navigate('/app/discover')}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No results"
            description={`No conversations matching "${searchQuery}"`}
          />
        ) : (
          <>
            {/* Message Requests collapsible section */}
            {user && (
              <MessageRequestsSection
                items={requestConversations}
                currentUserId={user.id}
              />
            )}

            {/* Match conversations */}
            {matchConversations.length > 0 && (
              <div className="divide-y divide-warm-100">
                {matchConversations.map(item => (
                  user && (
                    <ConversationRow
                      key={item.conversation.id}
                      item={item}
                      currentUserId={user.id}
                    />
                  )
                ))}
              </div>
            )}

            {/* No match conversations and only requests exist */}
            {matchConversations.length === 0 && requestConversations.length > 0 && (
              <EmptyState
                icon="💬"
                title="No matched conversations"
                description="Match with someone to unlock full messaging!"
                actionLabel="Discover People"
                onAction={() => navigate('/app/discover')}
                className="pt-8"
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
