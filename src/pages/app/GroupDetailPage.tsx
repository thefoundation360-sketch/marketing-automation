import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Settings, MessageCircle, Users, Target, Calendar,
  Send, Crown, UserMinus, UserPlus, Check, MapPin, Plus, Trash2,
  Globe, Lock, AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/shared/Modal'
import Avatar from '@/components/shared/Avatar'
import AddGoalModal from '@/components/bucketlist/AddGoalModal'
import { cn, formatTimeAgo, GOAL_CATEGORY_COLORS, GOAL_CATEGORY_ICONS } from '@/lib/utils'
import type { Group, GroupMember, BucketGoal, GoalCategory, Match, Profile } from '@/types'

// ── Local Types ───────────────────────────────────────────────────────────────

interface GroupMessage {
  id: string
  group_id: string
  sender_id: string
  content: string
  created_at: string
  sender?: {
    full_name: string
    avatar_url: string | null
    username: string
  }
}

interface GroupEvent {
  id: string
  group_id: string
  creator_id: string
  title: string
  description: string | null
  location: string | null
  event_date: string
  created_at: string
  rsvps?: Record<string, 'going' | 'maybe' | 'no'>
}

interface MemberWithProfile extends GroupMember {
  profile?: {
    full_name: string
    avatar_url: string | null
    username: string
    is_verified: boolean
  }
}

interface GroupGoal extends BucketGoal {
  group_goal_id?: string
}

type Tab = 'chat' | 'members' | 'goals' | 'events'

const RSVP_LABELS: Record<'going' | 'maybe' | 'no', string> = {
  going: 'Going',
  maybe: 'Maybe',
  no: "Can't go",
}

const RSVP_ACTIVE: Record<'going' | 'maybe' | 'no', string> = {
  going: 'bg-green-100 text-green-700 border-green-300',
  maybe: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  no: 'bg-red-100 text-red-700 border-red-300',
}

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'events', label: 'Events', icon: Calendar },
]

// ── Chat Tab ──────────────────────────────────────────────────────────────────

function ChatTab({ groupId, userId }: { groupId: string; userId: string }) {
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' })
  }, [])

  async function fetchMessages() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('group_messages')
        .select('*, sender:profiles!sender_id(full_name, avatar_url, username)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(100)
      setMessages((data as GroupMessage[]) ?? [])
    } catch (err) {
      console.error('Failed to load messages', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()

    const channel = supabase
      .channel(`group-chat-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const msg = payload.new as GroupMessage
          // Avoid duplicate if optimistic message already added
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          // Fetch sender profile for incoming message
          supabase
            .from('profiles')
            .select('full_name, avatar_url, username')
            .eq('id', msg.sender_id)
            .single()
            .then(({ data: profile }) => {
              setMessages(prev =>
                prev.map(m => m.id === msg.id ? { ...m, sender: profile ?? undefined } : m)
              )
            })
          scrollToBottom()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [groupId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading) scrollToBottom('instant')
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendMessage() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')

    // Optimistic
    const optimisticId = `opt-${Date.now()}`
    const optimistic: GroupMessage = {
      id: optimisticId,
      group_id: groupId,
      sender_id: userId,
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    scrollToBottom()

    try {
      const { data: inserted, error } = await supabase
        .from('group_messages')
        .insert({ group_id: groupId, sender_id: userId, content: text })
        .select('*, sender:profiles!sender_id(full_name, avatar_url, username)')
        .single()
      if (error) throw error
      setMessages(prev =>
        prev.map(m => m.id === optimisticId ? (inserted as GroupMessage) : m)
      )
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setInput(text)
      toast.error('Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 overscroll-contain">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center">
            <MessageCircle size={40} className="text-warm-200 mx-auto mb-3" />
            <p className="text-warm-500 text-sm font-semibold">No messages yet</p>
            <p className="text-warm-400 text-xs mt-1">Be the first to say something!</p>
          </div>
        )}
        {messages.map(msg => {
          const isOwn = msg.sender_id === userId
          return (
            <div key={msg.id} className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}>
              {!isOwn && (
                <Avatar
                  url={msg.sender?.avatar_url}
                  name={msg.sender?.full_name ?? 'User'}
                  size="xs"
                  className="self-end mb-4 flex-shrink-0"
                />
              )}
              <div className={cn('max-w-[75%] flex flex-col gap-0.5', isOwn ? 'items-end' : 'items-start')}>
                {/* Sender name (for non-own messages) */}
                {!isOwn && msg.sender && (
                  <span className="text-xs text-warm-500 font-medium px-1 leading-none mb-0.5">
                    {msg.sender.full_name}
                  </span>
                )}
                {/* Bubble */}
                <div className={cn(
                  'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words',
                  isOwn
                    ? 'bg-gradient-to-br from-orange-500 to-amber-400 text-white rounded-tr-sm'
                    : 'bg-white border border-warm-100 text-warm-900 rounded-tl-sm shadow-sm',
                )}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-warm-400 px-1 leading-none">
                  {formatTimeAgo(msg.created_at)}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} className="h-1" />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-warm-100 bg-[#FFFBF7]">
        <div className="flex items-center gap-2 bg-white rounded-2xl border border-warm-200 px-4 py-2 shadow-sm">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
            }}
            placeholder="Message the squad…"
            className="flex-1 bg-transparent text-sm text-warm-900 placeholder-warm-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-[0.93] transition-transform"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Members Tab ───────────────────────────────────────────────────────────────

interface MembersTabProps {
  groupId: string
  userId: string
  isAdmin: boolean
}

interface MatchProfile {
  match_id: string
  profile: Profile
}

function MembersTab({ groupId, userId, isAdmin }: MembersTabProps) {
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [matchProfiles, setMatchProfiles] = useState<MatchProfile[]>([])
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [inviting, setInviting] = useState<string | null>(null)

  useEffect(() => { fetchMembers() }, [groupId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchMembers() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('group_members')
        .select('*, profile:profiles!user_id(full_name, avatar_url, username, is_verified)')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true })
      setMembers((data as MemberWithProfile[]) ?? [])
    } catch (err) {
      console.error('Failed to load members', err)
    } finally {
      setLoading(false)
    }
  }

  async function removeMember(memberId: string) {
    setRemoving(memberId)
    try {
      await supabase.from('group_members').delete().eq('id', memberId)
      setMembers(prev => prev.filter(m => m.id !== memberId))
      toast.success('Member removed.')
    } catch {
      toast.error('Failed to remove member.')
    } finally {
      setRemoving(null)
    }
  }

  async function openInvite() {
    setShowInvite(true)
    setMatchesLoading(true)
    try {
      // Fetch mutual matches for the current user
      const { data: matchRows } = await supabase
        .from('matches')
        .select('id, user_a_id, user_b_id')
        .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
        .eq('status', 'matched')
        .limit(50)

      if (!matchRows || matchRows.length === 0) {
        setMatchProfiles([])
        return
      }

      const memberUserIds = members.map(m => m.user_id)
      const otherIds = matchRows
        .map((m: { id: string; user_a_id: string; user_b_id: string }) => m.user_a_id === userId ? m.user_b_id : m.user_a_id)
        .filter((id: string) => !memberUserIds.includes(id))

      if (otherIds.length === 0) {
        setMatchProfiles([])
        return
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', otherIds)

      const mapped: MatchProfile[] = (profiles ?? []).map((p: Profile) => {
        const row = matchRows.find(
          (m: { id: string; user_a_id: string; user_b_id: string }) => m.user_a_id === p.id || m.user_b_id === p.id
        )
        return { match_id: row?.id ?? '', profile: p }
      })
      setMatchProfiles(mapped)
    } catch (err) {
      console.error('Failed to load matches for invite', err)
    } finally {
      setMatchesLoading(false)
    }
  }

  async function sendInvite(matchProfile: MatchProfile) {
    setInviting(matchProfile.profile.id)
    try {
      // Find or create a DM conversation with this match, then send invite message
      let conversationId: string | null = null

      const { data: convRows } = await supabase
        .from('conversations')
        .select('id, participant_ids')
        .contains('participant_ids', [userId, matchProfile.profile.id])
        .limit(1)

      if (convRows && convRows.length > 0) {
        conversationId = convRows[0].id
      } else {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            participant_ids: [userId, matchProfile.profile.id],
            is_match_gated: false,
          })
          .select()
          .single()
        conversationId = newConv?.id ?? null
      }

      if (!conversationId) throw new Error('Could not create conversation')

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: `Hey! I'd love for you to join my squad on DreamMatch. Check it out: ${window.location.origin}/app/groups/${groupId}`,
      })

      toast.success(`Invite sent to ${matchProfile.profile.full_name.split(' ')[0]}!`)
      setInviting(null)
    } catch {
      toast.error('Failed to send invite.')
      setInviting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-warm-100 bg-[#FFFBF7]">
        <span className="text-sm text-warm-600 font-medium">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={openInvite}
          className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 active:opacity-70"
        >
          <UserPlus size={15} />
          Invite a match
        </button>
      </div>

      {/* Member list */}
      <div className="divide-y divide-warm-50">
        {members.map(member => (
          <div key={member.id} className="flex items-center gap-3 px-4 py-3.5">
            <Avatar
              url={member.profile?.avatar_url}
              name={member.profile?.full_name ?? 'User'}
              size="sm"
              showBadge={member.profile?.is_verified}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-warm-900 text-sm truncate">
                  {member.profile?.full_name ?? 'Unknown'}
                </span>
                {member.role === 'admin' && (
                  <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
                    <Crown size={8} /> Admin
                  </span>
                )}
              </div>
              <span className="text-xs text-warm-400">@{member.profile?.username ?? 'user'}</span>
            </div>
            {isAdmin && member.user_id !== userId && (
              <button
                type="button"
                onClick={() => removeMember(member.id)}
                disabled={removing === member.id}
                className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center active:bg-red-100 transition-colors disabled:opacity-40"
                aria-label="Remove member"
              >
                {removing === member.id
                  ? <div className="w-3 h-3 border border-red-300 border-t-red-500 rounded-full animate-spin" />
                  : <UserMinus size={14} className="text-red-500" />
                }
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite a Match" size="md">
        <div className="px-5 py-4">
          {matchesLoading ? (
            <div className="py-8 text-center text-warm-400 text-sm">Loading matches…</div>
          ) : matchProfiles.length === 0 ? (
            <div className="py-8 text-center">
              <Users size={36} className="text-warm-200 mx-auto mb-3" />
              <p className="text-warm-600 text-sm font-semibold">No matches to invite</p>
              <p className="text-warm-400 text-xs mt-1">All your matches are already in this squad, or you have no matches yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matchProfiles.map(mp => (
                <div key={mp.profile.id} className="flex items-center gap-3 bg-warm-50 rounded-2xl p-3">
                  <Avatar url={mp.profile.avatar_url} name={mp.profile.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-warm-900 truncate">{mp.profile.full_name}</p>
                    <p className="text-xs text-warm-400">@{mp.profile.username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => sendInvite(mp)}
                    disabled={inviting === mp.profile.id}
                    className="px-3.5 py-1.5 rounded-xl bg-orange-500 text-white text-xs font-semibold active:bg-orange-600 transition-colors disabled:opacity-60"
                  >
                    {inviting === mp.profile.id ? 'Sending…' : 'Invite'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

// ── Goals Tab ─────────────────────────────────────────────────────────────────

function GoalsTab({ groupId, userId }: { groupId: string; userId: string }) {
  const [goals, setGoals] = useState<GroupGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => { fetchGoals() }, [groupId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchGoals() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('group_goals')
        .select('id, goal:bucket_goals(*)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
      const extracted = (data ?? []).map((row: { id: string; goal: BucketGoal | BucketGoal[] }) => ({
        ...(Array.isArray(row.goal) ? row.goal[0] : row.goal) as BucketGoal,
        group_goal_id: row.id,
      })) as GroupGoal[]
      setGoals(extracted.filter(Boolean))
    } catch (err) {
      console.error('Failed to load group goals', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveGoal(partial: Partial<BucketGoal>) {
    // Create a new bucket_goal for this user, then link it to the group
    const { data: goal, error } = await supabase
      .from('bucket_goals')
      .insert({
        title: partial.title!,
        description: partial.description ?? null,
        category: partial.category ?? 'Travel',
        is_public: true,
        status: 'active',
        user_id: userId,
      })
      .select()
      .single()
    if (error) throw error
    await supabase.from('group_goals').insert({ group_id: groupId, goal_id: goal.id, added_by: userId })
    setGoals(prev => [{ ...(goal as BucketGoal), group_goal_id: undefined }, ...prev])
  }

  async function toggleComplete(goal: GroupGoal) {
    setToggling(goal.id)
    const newStatus = goal.status === 'completed' ? 'active' : 'completed'
    try {
      await supabase
        .from('bucket_goals')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', goal.id)
      setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: newStatus } : g))
    } catch {
      toast.error('Failed to update goal.')
    } finally {
      setToggling(null)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-warm-100 bg-[#FFFBF7]">
        <span className="text-sm text-warm-600 font-medium">
          {goals.length} shared goal{goals.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 active:opacity-70"
        >
          <Plus size={15} /> Add goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <Target size={40} className="text-warm-200 mx-auto mb-3" />
          <p className="font-semibold text-warm-700 mb-1">No shared goals yet</p>
          <p className="text-sm text-warm-500 mb-5">Add goals your squad wants to achieve together</p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-white text-sm font-semibold"
          >
            Add first goal
          </button>
        </div>
      ) : (
        <div className="divide-y divide-warm-50">
          {goals.map(goal => (
            <div
              key={goal.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3.5 transition-opacity',
                goal.status === 'completed' && 'opacity-60',
              )}
            >
              {/* Completion toggle */}
              <button
                type="button"
                onClick={() => toggleComplete(goal)}
                disabled={toggling === goal.id}
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  goal.status === 'completed'
                    ? 'bg-green-500 border-green-500'
                    : 'border-warm-300 hover:border-orange-400',
                )}
              >
                {goal.status === 'completed' && (
                  <Check size={12} className="text-white" strokeWidth={3} />
                )}
              </button>

              {/* Goal info */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium text-warm-900 truncate leading-snug',
                  goal.status === 'completed' && 'line-through text-warm-400',
                )}>
                  {goal.title}
                </p>
                <span className={cn(
                  'inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full',
                  GOAL_CATEGORY_COLORS[goal.category as GoalCategory] ?? 'bg-warm-100 text-warm-600',
                )}>
                  {GOAL_CATEGORY_ICONS[goal.category as GoalCategory] ?? ''} {goal.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddGoalModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleSaveGoal}
      />
    </div>
  )
}

// ── Events Tab ────────────────────────────────────────────────────────────────

function EventsTab({ groupId, userId }: { groupId: string; userId: string }) {
  const [events, setEvents] = useState<GroupEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [rsvping, setRsvping] = useState<string | null>(null)
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    event_date: '',
  })
  const [adding, setAdding] = useState(false)

  useEffect(() => { fetchEvents() }, [groupId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchEvents() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('group_events')
        .select('*')
        .eq('group_id', groupId)
        .order('event_date', { ascending: true })
      setEvents((data as GroupEvent[]) ?? [])
    } catch (err) {
      console.error('Failed to load events', err)
    } finally {
      setLoading(false)
    }
  }

  async function createEvent() {
    if (!newEvent.title.trim() || !newEvent.event_date) return
    setAdding(true)
    try {
      const { data, error } = await supabase
        .from('group_events')
        .insert({
          group_id: groupId,
          creator_id: userId,
          title: newEvent.title.trim(),
          description: newEvent.description.trim() || null,
          location: newEvent.location.trim() || null,
          event_date: newEvent.event_date,
        })
        .select()
        .single()
      if (error) throw error
      setEvents(prev => [...prev, data as GroupEvent])
      setNewEvent({ title: '', description: '', location: '', event_date: '' })
      setShowAdd(false)
      toast.success('Event created!')
    } catch {
      toast.error('Failed to create event.')
    } finally {
      setAdding(false)
    }
  }

  async function rsvp(eventId: string, status: 'going' | 'maybe' | 'no') {
    setRsvping(eventId)
    try {
      await supabase
        .from('group_event_rsvps')
        .upsert({ event_id: eventId, user_id: userId, status }, { onConflict: 'event_id,user_id' })
      setEvents(prev =>
        prev.map(e => e.id === eventId ? { ...e, rsvps: { ...e.rsvps, [userId]: status } } : e)
      )
    } catch {
      toast.error('Failed to save RSVP.')
    } finally {
      setRsvping(null)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-warm-100 bg-[#FFFBF7]">
        <span className="text-sm text-warm-600 font-medium">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 active:opacity-70"
        >
          <Plus size={15} /> Create Event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <Calendar size={40} className="text-warm-200 mx-auto mb-3" />
          <p className="font-semibold text-warm-700 mb-1">No events planned</p>
          <p className="text-sm text-warm-500 mb-5">Plan your next meetup or adventure!</p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-white text-sm font-semibold"
          >
            Plan first event
          </button>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          {events.map(event => {
            const myRsvp = event.rsvps?.[userId]
            const eventDate = new Date(event.event_date)
            const isPast = eventDate < new Date()
            const goingCount = Object.values(event.rsvps ?? {}).filter(s => s === 'going').length
            const maybeCount = Object.values(event.rsvps ?? {}).filter(s => s === 'maybe').length

            return (
              <div key={event.id} className="bg-white rounded-2xl border border-warm-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-warm-900 text-sm leading-snug">{event.title}</h4>
                    <div className="flex items-center gap-1 text-xs text-orange-600 font-medium mt-1">
                      <Calendar size={11} className="flex-shrink-0" />
                      {eventDate.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  {isPast && (
                    <span className="text-[10px] font-semibold bg-warm-100 text-warm-500 px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wide">
                      Past
                    </span>
                  )}
                </div>

                {event.location && (
                  <div className="flex items-center gap-1 text-xs text-warm-500 mb-2">
                    <MapPin size={11} className="flex-shrink-0" />
                    {event.location}
                  </div>
                )}

                {event.description && (
                  <p className="text-xs text-warm-600 leading-relaxed mb-3">{event.description}</p>
                )}

                {/* RSVP counts */}
                {(goingCount > 0 || maybeCount > 0) && (
                  <div className="flex items-center gap-3 mb-3 text-xs text-warm-500">
                    {goingCount > 0 && <span className="text-green-600 font-medium">{goingCount} going</span>}
                    {maybeCount > 0 && <span className="text-yellow-600 font-medium">{maybeCount} maybe</span>}
                  </div>
                )}

                {/* RSVP buttons */}
                {!isPast && (
                  <div className="flex gap-2">
                    {(['going', 'maybe', 'no'] as const).map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => rsvp(event.id, status)}
                        disabled={rsvping === event.id}
                        className={cn(
                          'flex-1 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-[0.97]',
                          myRsvp === status
                            ? RSVP_ACTIVE[status]
                            : 'bg-warm-50 border-warm-200 text-warm-600',
                          'disabled:opacity-50',
                        )}
                      >
                        {RSVP_LABELS[status]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Event Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Create Event" size="lg">
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5 block">
              Title <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              value={newEvent.title}
              onChange={e => setNewEvent(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Weekend Hike at Griffith Park"
              maxLength={100}
              className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5 block">
              Date & Time <span className="text-orange-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={newEvent.event_date}
              onChange={e => setNewEvent(p => ({ ...p, event_date: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5 block">
              Location
            </label>
            <input
              type="text"
              value={newEvent.location}
              onChange={e => setNewEvent(p => ({ ...p, location: e.target.value }))}
              placeholder="e.g. Griffith Park, Los Angeles"
              className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5 block">
              Description
            </label>
            <textarea
              value={newEvent.description}
              onChange={e => setNewEvent(p => ({ ...p, description: e.target.value }))}
              placeholder="What's the plan?"
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all resize-none"
            />
          </div>
          <button
            type="button"
            onClick={createEvent}
            disabled={!newEvent.title.trim() || !newEvent.event_date || adding}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-bold text-sm disabled:opacity-60 active:scale-[0.98] transition-all"
          >
            {adding ? 'Creating…' : 'Create Event'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

// ── Group Settings Modal (admin only) ─────────────────────────────────────────

interface GroupSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  onGroupUpdated: (g: Group) => void
  onGroupDeleted: () => void
}

function GroupSettingsModal({
  isOpen,
  onClose,
  group,
  onGroupUpdated,
  onGroupDeleted,
}: GroupSettingsModalProps) {
  const navigate = useNavigate()
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description ?? '')
  const [isPublic, setIsPublic] = useState(group.is_public)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    if (!name.trim()) { toast.error('Squad name is required.'); return }
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('groups')
        .update({ name: name.trim(), description: description.trim() || null, is_public: isPublic })
        .eq('id', group.id)
        .select()
        .single()
      if (error) throw error
      onGroupUpdated(data as Group)
      toast.success('Squad updated!')
      onClose()
    } catch {
      toast.error('Failed to update squad.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await supabase.from('group_members').delete().eq('group_id', group.id)
      await supabase.from('groups').delete().eq('id', group.id)
      navigate('/app/groups')
      toast.success('Squad deleted.')
    } catch {
      toast.error('Failed to delete squad.')
      setDeleting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Squad Settings" size="lg">
      <div className="px-5 py-4 space-y-4">
        <div>
          <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5 block">
            Squad Name <span className="text-orange-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={60}
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5 block">
            Description
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="What's this squad about?"
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all resize-none"
          />
        </div>
        {/* Public toggle */}
        <div className="flex items-center justify-between bg-warm-50 rounded-xl p-3.5 border border-warm-200">
          <div className="flex items-center gap-2">
            {isPublic
              ? <Globe size={14} className="text-orange-500" />
              : <Lock size={14} className="text-warm-500" />}
            <span className="text-sm font-semibold text-warm-800">
              {isPublic ? 'Public Squad' : 'Private Squad'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsPublic(v => !v)}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors',
              isPublic ? 'bg-orange-500' : 'bg-warm-300',
            )}
          >
            <span className={cn(
              'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
              isPublic ? 'translate-x-7' : 'translate-x-1',
            )} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-bold text-sm disabled:opacity-60 active:scale-[0.98] transition-all"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        {/* Danger zone */}
        <div className="border border-red-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={15} />
            <span className="text-xs font-bold uppercase tracking-wide">Danger Zone</span>
          </div>
          {confirmDelete ? (
            <>
              <p className="text-xs text-red-600 leading-relaxed">
                This will permanently delete the squad and remove all members. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2.5 rounded-xl border border-warm-200 text-warm-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete Squad'}
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold active:bg-red-50 transition-colors"
            >
              <Trash2 size={14} /> Delete Squad
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [group, setGroup] = useState<Group | null>(null)
  const [membership, setMembership] = useState<GroupMember | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = membership?.role === 'admin'
  const isMember = membership !== null

  useEffect(() => {
    if (groupId && user?.id) fetchGroup()
  }, [groupId, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchGroup() {
    if (!groupId || !user?.id) return
    setLoading(true)
    try {
      const [{ data: groupData, error: groupErr }, { data: memberData }] = await Promise.all([
        supabase.from('groups').select('*').eq('id', groupId).single(),
        supabase
          .from('group_members')
          .select('*')
          .eq('group_id', groupId)
          .eq('user_id', user.id)
          .maybeSingle(),
      ])
      if (groupErr || !groupData) { setError('Squad not found'); return }
      setGroup(groupData as Group)
      setMembership((memberData as GroupMember) ?? null)
    } catch {
      setError('Failed to load squad')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin() {
    if (!groupId || !user?.id || !group) return
    setJoining(true)
    try {
      const { data, error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: user.id, role: 'member' })
        .select()
        .single()
      if (error) throw error
      await supabase
        .from('groups')
        .update({ member_count: group.member_count + 1 })
        .eq('id', groupId)
      setMembership(data as GroupMember)
      setGroup(g => g ? { ...g, member_count: g.member_count + 1 } : g)
      toast.success(`You joined ${group.name}!`)
    } catch {
      toast.error('Failed to join squad.')
    } finally {
      setJoining(false)
    }
  }

  async function handleLeave() {
    if (!groupId || !user?.id || !group || !membership) return
    if (isAdmin) {
      toast.error('Admins cannot leave the squad. Transfer ownership or delete the squad first.')
      return
    }
    setLeaving(true)
    try {
      await supabase.from('group_members').delete().eq('id', membership.id)
      await supabase
        .from('groups')
        .update({ member_count: Math.max(0, group.member_count - 1) })
        .eq('id', groupId)
      navigate('/app/groups')
    } catch {
      toast.error('Failed to leave squad.')
      setLeaving(false)
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#FFFBF7]">
        <div className="flex items-center gap-3 px-5 pt-6 pb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-warm-100 flex items-center justify-center flex-shrink-0"
          >
            <ArrowLeft size={18} className="text-warm-700" />
          </button>
          <div className="h-5 bg-warm-100 rounded-lg w-36 animate-pulse" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────

  if (error || !group) {
    return (
      <div className="flex flex-col h-full bg-[#FFFBF7] items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="text-lg font-bold text-warm-900 mb-2">{error ?? 'Squad not found'}</h2>
        <p className="text-sm text-warm-500 mb-6">This squad may have been deleted or the link is incorrect.</p>
        <button
          type="button"
          onClick={() => navigate('/app/groups')}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-semibold text-sm"
        >
          Back to Squads
        </button>
      </div>
    )
  }

  // ── Main UI ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#FFFBF7]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-warm-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 pt-5 pb-3">
          {/* Back */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-warm-100 flex items-center justify-center active:bg-warm-200 transition-colors flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft size={17} className="text-warm-700" />
          </button>

          {/* Group avatar */}
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-2xl flex-shrink-0">
            {group.avatar_url
              ? <img src={group.avatar_url} alt={group.name} className="w-full h-full rounded-2xl object-cover" />
              : '👥'}
          </div>

          {/* Name + member count (centered) */}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-warm-900 text-base truncate leading-tight">{group.name}</h1>
            <p className="text-xs text-warm-400 mt-0.5">
              {group.member_count} member{group.member_count !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Join / Leave / Admin badge */}
            {!isMember && (
              <button
                type="button"
                onClick={handleJoin}
                disabled={joining}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-white text-xs font-bold active:scale-[0.97] transition-transform disabled:opacity-60"
              >
                {joining ? 'Joining…' : 'Join Squad'}
              </button>
            )}
            {isMember && !isAdmin && (
              <button
                type="button"
                onClick={handleLeave}
                disabled={leaving}
                className="px-3.5 py-1.5 rounded-xl border border-warm-300 bg-white text-warm-600 text-xs font-semibold active:bg-warm-50 transition-colors disabled:opacity-50"
              >
                {leaving ? '…' : 'Leave Squad'}
              </button>
            )}
            {/* Settings gear (admin only) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="w-9 h-9 rounded-full bg-warm-100 flex items-center justify-center active:bg-warm-200 transition-colors"
                aria-label="Squad settings"
              >
                <Settings size={16} className="text-warm-600" />
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-warm-100">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold transition-colors border-b-2',
                  isActive
                    ? 'text-orange-600 border-orange-500'
                    : 'text-warm-400 border-transparent hover:text-warm-600',
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === 'chat' && user && (
          <ChatTab groupId={group.id} userId={user.id} />
        )}
        {activeTab === 'members' && user && (
          <MembersTab groupId={group.id} userId={user.id} isAdmin={isAdmin} />
        )}
        {activeTab === 'goals' && user && (
          <GoalsTab groupId={group.id} userId={user.id} />
        )}
        {activeTab === 'events' && user && (
          <EventsTab groupId={group.id} userId={user.id} />
        )}
      </div>

      {/* ── Admin settings modal ────────────────────────────────────────────── */}
      {group && (
        <GroupSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          group={group}
          onGroupUpdated={updated => setGroup(updated)}
          onGroupDeleted={() => navigate('/app/groups')}
        />
      )}
    </div>
  )
}
