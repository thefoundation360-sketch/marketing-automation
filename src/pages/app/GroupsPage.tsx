import { useEffect, useState } from 'react'
import { Plus, Users, Globe, Lock, ChevronRight, Flame } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/shared/Modal'
import { cn, GOAL_CATEGORY_COLORS, GOAL_CATEGORY_ICONS } from '@/lib/utils'
import type { Group, GroupMember, GoalCategory } from '@/types'

// ── Local Types ───────────────────────────────────────────────────────────────

interface GroupWithMeta extends Group {
  shared_goal_category?: GoalCategory
  is_member?: boolean
  last_activity_at?: string | null
}

interface CreateGroupForm {
  name: string
  description: string
  emoji: string
  is_public: boolean
}

const EMOJI_OPTIONS = ['🌍', '🏔️', '🍜', '🎨', '🧘', '❤️', '🚀', '👥', '⚡', '🎯', '🌟', '🏄', '🎭', '🦋', '🔥']

// ── Sub-components ────────────────────────────────────────────────────────────

function GroupAvatar({ emoji, avatarUrl, size = 'md' }: { emoji?: string; avatarUrl?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-10 h-10 text-xl' : size === 'lg' ? 'w-16 h-16 text-3xl' : 'w-12 h-12 text-2xl'
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className={cn('rounded-2xl object-cover flex-shrink-0', sizeClass)} />
  }
  return (
    <div className={cn('rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center flex-shrink-0', sizeClass)}>
      <span>{emoji ?? '👥'}</span>
    </div>
  )
}

function ActiveBadge() {
  return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
      <Flame size={10} className="text-orange-500" />
      Active
    </span>
  )
}

function MySquadCard({ group, onPress }: { group: GroupWithMeta; onPress: () => void }) {
  const isRecent = group.last_activity_at
    ? Date.now() - new Date(group.last_activity_at).getTime() < 86400000 * 3
    : false

  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-warm-100 active:scale-[0.98] transition-transform text-left"
    >
      <GroupAvatar avatarUrl={group.avatar_url} emoji="👥" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-warm-900 text-sm truncate">{group.name}</span>
          {isRecent && <ActiveBadge />}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-warm-500">
          <Users size={11} />
          <span>{group.member_count} member{group.member_count !== 1 ? 's' : ''}</span>
          {group.shared_goal_category && (
            <>
              <span className="text-warm-300">·</span>
              <span>{GOAL_CATEGORY_ICONS[group.shared_goal_category]} {group.shared_goal_category}</span>
            </>
          )}
        </div>
      </div>
      <ChevronRight size={16} className="text-warm-300 flex-shrink-0" />
    </button>
  )
}

function DiscoverGroupCard({ group, onJoin, joining }: { group: GroupWithMeta; onJoin: () => void; joining: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-warm-100">
      <div className="flex items-start gap-3 mb-3">
        <GroupAvatar avatarUrl={group.avatar_url} emoji="🌍" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-semibold text-warm-900 text-sm truncate">{group.name}</span>
            {group.is_public ? <Globe size={12} className="text-warm-400 flex-shrink-0" /> : <Lock size={12} className="text-warm-400 flex-shrink-0" />}
          </div>
          {group.description && (
            <p className="text-xs text-warm-500 line-clamp-2 leading-relaxed">{group.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-warm-500">
            <Users size={11} />
            {group.member_count}
          </span>
          {group.shared_goal_category && (
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', GOAL_CATEGORY_COLORS[group.shared_goal_category])}>
              {GOAL_CATEGORY_ICONS[group.shared_goal_category]} {group.shared_goal_category}
            </span>
          )}
        </div>
        <button
          onClick={onJoin}
          disabled={joining}
          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-white text-xs font-semibold active:scale-[0.97] transition-transform disabled:opacity-60"
        >
          {joining ? 'Joining…' : 'Join'}
        </button>
      </div>
    </div>
  )
}

// ── Create Group Modal ────────────────────────────────────────────────────────

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (group: Group) => void
}

function CreateGroupModal({ isOpen, onClose, onCreated }: CreateGroupModalProps) {
  const { user } = useAuth()
  const [form, setForm] = useState<CreateGroupForm>({ name: '', description: '', emoji: '🌍', is_public: true })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setForm({ name: '', description: '', emoji: '🌍', is_public: true })
    setError(null)
  }

  async function handleCreate() {
    if (!user) return
    if (!form.name.trim()) { setError('Squad name is required'); return }
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
        .from('groups')
        .insert({
          name: form.name.trim(),
          description: form.description.trim() || null,
          creator_id: user.id,
          is_public: form.is_public,
          member_count: 1,
          avatar_url: null,
          goal_id: null,
        })
        .select()
        .single()
      if (err) throw err
      // Auto-join as admin
      await supabase.from('group_members').insert({ group_id: data.id, user_id: user.id, role: 'admin' })
      onCreated(data as Group)
      reset()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create squad')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose() }} title="Create a Squad" size="lg">
      <div className="px-5 py-4 space-y-4">
        {/* Emoji picker */}
        <div>
          <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide mb-2 block">Squad Icon</label>
          <div className="flex flex-wrap gap-2">
            {EMOJI_OPTIONS.map(e => (
              <button
                key={e}
                onClick={() => setForm(f => ({ ...f, emoji: e }))}
                className={cn(
                  'w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 transition-all',
                  form.emoji === e
                    ? 'border-orange-500 bg-orange-50 scale-110'
                    : 'border-warm-200 bg-warm-50 hover:border-warm-300'
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5 block">Squad Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Weekend Adventurers"
            maxLength={60}
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5 block">Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="What's this squad about?"
            maxLength={200}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all resize-none"
          />
          <div className="text-right text-xs text-warm-400 mt-1">{form.description.length}/200</div>
        </div>

        {/* Public toggle */}
        <div className="flex items-center justify-between bg-warm-50 rounded-xl p-3.5 border border-warm-200">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-warm-800">
              {form.is_public ? <Globe size={14} className="text-orange-500" /> : <Lock size={14} className="text-warm-500" />}
              {form.is_public ? 'Public Squad' : 'Private Squad'}
            </div>
            <p className="text-xs text-warm-500 mt-0.5">
              {form.is_public ? 'Anyone can discover and request to join' : 'Only people with a link can join'}
            </p>
          </div>
          <button
            onClick={() => setForm(f => ({ ...f, is_public: !f.is_public }))}
            className={cn(
              'relative w-12 h-6 rounded-full transition-colors flex-shrink-0',
              form.is_public ? 'bg-orange-500' : 'bg-warm-300'
            )}
          >
            <span className={cn(
              'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
              form.is_public ? 'translate-x-7' : 'translate-x-1'
            )} />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading || !form.name.trim()}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-semibold text-base shadow-sm active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {loading ? 'Creating…' : 'Create Squad 🚀'}
        </button>
      </div>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const { user } = useAuth()
  const [myGroups, setMyGroups] = useState<GroupWithMeta[]>([])
  const [discoverGroups, setDiscoverGroups] = useState<GroupWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (user?.id) fetchGroups()
  }, [user?.id])

  async function fetchGroups() {
    if (!user?.id) return
    setLoading(true)
    try {
      // Fetch groups the user is a member of
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)

      const memberGroupIds = (memberships ?? []).map((m: { group_id: string }) => m.group_id)

      if (memberGroupIds.length > 0) {
        const { data: myGroupData } = await supabase
          .from('groups')
          .select('*')
          .in('id', memberGroupIds)
          .order('created_at', { ascending: false })
        setMyGroups(
          (myGroupData ?? []).map((g: Group) => ({ ...g, is_member: true }))
        )
      }

      // Fetch public groups user is not in
      const { data: publicGroups } = await supabase
        .from('groups')
        .select('*')
        .eq('is_public', true)
        .not('id', 'in', memberGroupIds.length > 0 ? `(${memberGroupIds.join(',')})` : '(null)')
        .order('member_count', { ascending: false })
        .limit(20)

      setDiscoverGroups((publicGroups ?? []).map((g: Group) => ({ ...g, is_member: false })))
    } catch (err) {
      console.error('Failed to fetch groups', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(group: GroupWithMeta) {
    if (!user?.id) return
    setJoiningId(group.id)
    try {
      await supabase.from('group_members').insert({ group_id: group.id, user_id: user.id, role: 'member' })
      await supabase.from('groups').update({ member_count: group.member_count + 1 }).eq('id', group.id)
      setDiscoverGroups(prev => prev.filter(g => g.id !== group.id))
      setMyGroups(prev => [{ ...group, member_count: group.member_count + 1, is_member: true }, ...prev])
    } catch (err) {
      console.error('Failed to join group', err)
    } finally {
      setJoiningId(null)
    }
  }

  function handleGroupCreated(group: Group) {
    setMyGroups(prev => [{ ...group, is_member: true }, ...prev])
  }

  function navigateToGroup(groupId: string) {
    window.location.href = `/app/groups/${groupId}`
  }

  return (
    <div className="flex flex-col h-full bg-[#FFFBF7] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-warm-900">Squads</h1>
          <p className="text-sm text-warm-500 mt-0.5">Dream together, achieve together</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-sm active:scale-[0.95] transition-transform"
          aria-label="Create squad"
        >
          <Plus size={20} className="text-white" />
        </button>
      </div>

      <div className="flex-1 px-5 pb-24 space-y-6">
        {/* My Squads */}
        <section>
          <h2 className="text-sm font-semibold text-warm-600 uppercase tracking-wide mb-3">My Squads</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-20 bg-warm-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : myGroups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-warm-100 p-8 text-center">
              <div className="text-4xl mb-3">👥</div>
              <p className="font-semibold text-warm-800 mb-1">No squads yet</p>
              <p className="text-sm text-warm-500">Start a squad around a shared goal! 👥</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 text-white text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                Create your first squad
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {myGroups.map(group => (
                <MySquadCard key={group.id} group={group} onPress={() => navigateToGroup(group.id)} />
              ))}
            </div>
          )}
        </section>

        {/* Discover Groups */}
        {discoverGroups.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-warm-600 uppercase tracking-wide mb-3">Discover Squads</h2>
            <div className="space-y-3">
              {discoverGroups.map(group => (
                <DiscoverGroupCard
                  key={group.id}
                  group={group}
                  onJoin={() => handleJoin(group)}
                  joining={joiningId === group.id}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center shadow-lg active:scale-[0.95] transition-transform z-10"
        aria-label="Create squad"
      >
        <Plus size={24} className="text-white" />
      </button>

      <CreateGroupModal isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={handleGroupCreated} />
    </div>
  )
}
