import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Send, Zap, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn, formatDate, TIER_LIMITS } from '@/lib/utils'
import Avatar from '@/components/shared/Avatar'
import { VerifiedBadge } from '@/components/shared/Badge'
import { ListItemSkeleton } from '@/components/shared/LoadingSkeleton'
import type { Message, Profile, Match, BucketGoal } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────────

interface MessageGroup {
  date: string   // e.g. "June 15, 2026"
  messages: Message[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupMessagesByDay(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = []

  for (const msg of messages) {
    const dateLabel = formatDate(msg.created_at)
    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.date === dateLabel) {
      lastGroup.messages.push(msg)
    } else {
      groups.push({ date: dateLabel, messages: [msg] })
    }
  }

  return groups
}

function formatMessageTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDividerDate(dateLabel: string): string {
  // dateLabel is already from formatDate, check if it's today/yesterday
  const now = new Date()
  const todayLabel = formatDate(now.toISOString())
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayLabel = formatDate(yesterday.toISOString())

  if (dateLabel === todayLabel) return 'Today'
  if (dateLabel === yesterdayLabel) return 'Yesterday'
  return dateLabel
}

// ── Match Banner ──────────────────────────────────────────────────────────────

interface MatchBannerProps {
  otherProfile: Profile
  sharedGoalTitle: string
}

function MatchBanner({ otherProfile, sharedGoalTitle }: MatchBannerProps) {
  return (
    <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-white flex-shrink-0" />
        <p className="text-white text-xs font-medium leading-snug">
          This is a match! You and{' '}
          <span className="font-bold">{otherProfile.full_name.split(' ')[0]}</span>{' '}
          both want to{' '}
          <span className="font-bold">{sharedGoalTitle}</span>
        </p>
      </div>
    </div>
  )
}

// ── Date Divider ──────────────────────────────────────────────────────────────

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="flex-1 h-px bg-warm-100" />
      <span className="text-[11px] text-warm-400 font-medium flex-shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-warm-100" />
    </div>
  )
}

// ── Message Bubble ─────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showSeen: boolean
  otherProfile: Profile
}

function MessageBubble({ message, isOwn, showSeen, otherProfile }: MessageBubbleProps) {
  return (
    <div
      className={cn(
        'flex items-end gap-2 px-4 mb-1',
        isOwn ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Other person's avatar (only for their messages) */}
      {!isOwn && (
        <div className="flex-shrink-0 self-end pb-1">
          <Avatar
            url={otherProfile.avatar_url}
            name={otherProfile.full_name}
            size="xs"
          />
        </div>
      )}

      <div
        className={cn(
          'flex flex-col gap-0.5 max-w-[72%]',
          isOwn ? 'items-end' : 'items-start'
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            'px-3.5 py-2.5 text-sm leading-relaxed break-words',
            isOwn
              ? 'bg-orange-500 text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-sm'
              : 'bg-orange-50 text-warm-900 rounded-tr-2xl rounded-br-2xl rounded-bl-2xl rounded-tl-sm'
          )}
        >
          {message.content}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-warm-400 leading-none px-1">
          {formatMessageTime(message.created_at)}
        </span>

        {/* Seen receipt (only under last sent message that was read) */}
        {isOwn && showSeen && message.read_at && (
          <span className="text-[10px] text-primary-500 font-medium leading-none px-1">
            Seen
          </span>
        )}
      </div>
    </div>
  )
}

// ── Upgrade Banner ────────────────────────────────────────────────────────────

interface UpgradeBannerProps {
  onUpgrade: () => void
}

function UpgradeBanner({ onUpgrade }: UpgradeBannerProps) {
  return (
    <div className="mx-4 mb-3 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center flex-shrink-0">
        <Zap size={18} className="text-white fill-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-warm-900 leading-tight">
          Message limit reached
        </p>
        <p className="text-xs text-warm-500 mt-0.5 leading-snug">
          Upgrade to Premium for unlimited messaging
        </p>
      </div>
      <button
        onClick={onUpgrade}
        className="flex-shrink-0 px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs font-semibold active:bg-orange-600 transition-colors"
      >
        Upgrade
      </button>
    </div>
  )
}

// ── Conversation Page ──────────────────────────────────────────────────────────

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null)
  const [matchData, setMatchData] = useState<Match | null>(null)
  const [sharedGoal, setSharedGoal] = useState<BucketGoal | null>(null)
  const [loading, setLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [messagessentToday, setMessagesSentToday] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isFree = profile?.subscription_tier === 'free'
  const messageLimit = TIER_LIMITS[profile?.subscription_tier ?? 'free'].messages
  const messagesLeft = isFree ? Math.max(0, messageLimit - messagessentToday) : Infinity
  const canSend = !isFree || messagesLeft > 0

  // ── Scroll to bottom ────────────────────────────────────────────────────────

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' })
  }

  // ── Mark messages as read ────────────────────────────────────────────────────

  const markMessagesRead = useCallback(async () => {
    if (!user || !conversationId) return

    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .is('read_at', null)
  }, [user, conversationId])

  // ── Count today's sent messages ──────────────────────────────────────────────

  const fetchTodaySentCount = useCallback(async () => {
    if (!user || !isFree) return

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', user.id)
      .gte('created_at', startOfDay.toISOString())

    setMessagesSentToday(count ?? 0)
  }, [user, isFree])

  // ── Fetch initial data ───────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user || !conversationId) return

    try {
      setLoading(true)

      // Fetch conversation to find other participant
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      if (convError) throw convError

      const otherId = conv.participant_ids.find((id: string) => id !== user.id)
      if (!otherId) return

      // Fetch other participant's profile
      const { data: otherProf, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherId)
        .single()

      if (profileError) throw profileError
      setOtherProfile(otherProf)

      // Fetch messages (ascending order)
      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (msgsError) throw msgsError
      setMessages(msgs ?? [])

      // Fetch match data between these two users
      const { data: matchRows } = await supabase
        .from('matches')
        .select('*')
        .or(
          `and(user_a_id.eq.${user.id},user_b_id.eq.${otherId}),and(user_a_id.eq.${otherId},user_b_id.eq.${user.id})`
        )
        .eq('status', 'matched')
        .limit(1)

      const match = matchRows?.[0] ?? null
      setMatchData(match)

      // If there's a match with shared goals, fetch one to display in banner
      if (match && match.shared_goals && match.shared_goals.length > 0) {
        const { data: goalData } = await supabase
          .from('bucket_goals')
          .select('*')
          .eq('id', match.shared_goals[0])
          .single()

        setSharedGoal(goalData ?? null)
      }

      // Mark messages as read
      await markMessagesRead()
    } catch (err) {
      console.error('Error loading conversation:', err)
      toast.error('Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }, [user, conversationId, markMessagesRead])

  useEffect(() => {
    fetchData()
    fetchTodaySentCount()
  }, [fetchData, fetchTodaySentCount])

  // Scroll to bottom on first load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom('instant')
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime subscription ────────────────────────────────────────────────────

  useEffect(() => {
    if (!conversationId || !user) return

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            // Avoid duplicates (optimistic update already added it)
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          scrollToBottom()

          // Mark as read if it's from the other person
          if (newMsg.sender_id !== user.id) {
            supabase
              .from('messages')
              .update({ read_at: new Date().toISOString() })
              .eq('id', newMsg.id)
              .then(() => {})
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updatedMsg = payload.new as Message
          setMessages(prev =>
            prev.map(m => (m.id === updatedMsg.id ? updatedMsg : m))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, user])

  // ── Send message ─────────────────────────────────────────────────────────────

  async function handleSend() {
    const content = inputText.trim()
    if (!content || !user || !conversationId || sending) return

    if (!canSend) {
      toast.error('Daily message limit reached. Upgrade to Premium!')
      return
    }

    setSending(true)

    // Optimistic message
    const optimisticId = `optimistic-${Date.now()}`
    const optimisticMsg: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      read_at: null,
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, optimisticMsg])
    setInputText('')
    scrollToBottom()

    try {
      const { data: inserted, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
        })
        .select()
        .single()

      if (error) throw error

      // Replace optimistic message with real one
      setMessages(prev =>
        prev.map(m => (m.id === optimisticId ? inserted : m))
      )

      // Update conversation last_message and last_message_at
      await supabase
        .from('conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      // Update daily count for free users
      if (isFree) {
        setMessagesSentToday(prev => prev + 1)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      toast.error('Failed to send message')
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setInputText(content)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleUpgrade() {
    navigate('/app/upgrade')
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  // Find the last sent message that has been read (for seen receipt)
  const ownMessages = messages.filter(m => m.sender_id === user?.id)
  const lastReadOwnMsgId = ownMessages
    .slice()
    .reverse()
    .find(m => m.read_at !== null)?.id ?? null

  const messageGroups = groupMessagesByDay(messages)

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#FFFBF7]">
      {/* Header */}
      <div className="flex-shrink-0 bg-[#FFFBF7] border-b border-warm-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 pt-safe-top pt-3 pb-3">
          {/* Back button */}
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full active:bg-warm-100 transition-colors flex-shrink-0 -ml-1"
            aria-label="Go back"
          >
            <ArrowLeft size={22} className="text-warm-800" />
          </button>

          {/* Avatar + name */}
          {otherProfile ? (
            <Link
              to={`/app/profile/${otherProfile.id}`}
              className="flex items-center gap-2.5 flex-1 min-w-0 active:opacity-70 transition-opacity"
            >
              <Avatar
                url={otherProfile.avatar_url}
                name={otherProfile.full_name}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-warm-900 text-sm truncate">
                    {otherProfile.full_name}
                  </span>
                  {otherProfile.is_verified && <VerifiedBadge size={13} />}
                </div>
                <span className="text-xs text-primary-500 font-medium">
                  View Profile
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex-1 h-9 rounded-xl bg-orange-50 animate-pulse" />
          )}
        </div>
      </div>

      {/* Match banner */}
      {matchData && sharedGoal && otherProfile && (
        <MatchBanner
          otherProfile={otherProfile}
          sharedGoalTitle={sharedGoal.title}
        />
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-3">
        {loading ? (
          <div className="space-y-2 px-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
              <span className="text-3xl" role="img" aria-hidden>
                👋
              </span>
            </div>
            <p className="text-sm font-semibold text-warm-800 mb-1">
              Say hello to {otherProfile?.full_name.split(' ')[0] ?? 'your match'}!
            </p>
            <p className="text-xs text-warm-500">
              Share a dream, a plan, or just a friendly hello.
            </p>
          </div>
        ) : (
          <>
            {messageGroups.map(group => (
              <div key={group.date}>
                <DateDivider label={formatDividerDate(group.date)} />
                {group.messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sender_id === user?.id}
                    showSeen={msg.id === lastReadOwnMsgId}
                    otherProfile={otherProfile!}
                  />
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} className="h-2" />
          </>
        )}
      </div>

      {/* Bottom area: upgrade banner + input */}
      <div className="flex-shrink-0 border-t border-warm-100 bg-[#FFFBF7]">
        {/* Free user message counter */}
        {isFree && messagesLeft !== Infinity && messagesLeft > 0 && (
          <div className="flex items-center justify-center px-4 pt-2">
            <span className="text-[11px] text-warm-400 font-medium">
              {messagesLeft} message{messagesLeft !== 1 ? 's' : ''} left today
            </span>
          </div>
        )}

        {/* Upgrade prompt when limit hit */}
        {isFree && messagesLeft === 0 && (
          <div className="pt-2">
            <UpgradeBanner onUpgrade={handleUpgrade} />
          </div>
        )}

        {/* Input row */}
        <div className="flex items-center gap-2.5 px-4 py-3 pb-safe-bottom">
          <input
            ref={inputRef}
            type="text"
            placeholder={
              canSend
                ? 'Type a message…'
                : 'Upgrade to send more messages'
            }
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!canSend || sending}
            className={cn(
              'flex-1 bg-warm-100 rounded-full px-4 py-2.5 text-sm text-warm-900 placeholder-warm-400 outline-none transition-colors',
              'focus:ring-2 focus:ring-primary-300 focus:bg-white',
              (!canSend || sending) && 'opacity-60 cursor-not-allowed'
            )}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || !canSend || sending}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
              inputText.trim() && canSend && !sending
                ? 'bg-orange-500 active:bg-orange-600 shadow-sm active:scale-95'
                : 'bg-warm-200 cursor-not-allowed'
            )}
            aria-label="Send message"
          >
            <Send
              size={17}
              className={cn(
                inputText.trim() && canSend && !sending
                  ? 'text-white'
                  : 'text-warm-400'
              )}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
