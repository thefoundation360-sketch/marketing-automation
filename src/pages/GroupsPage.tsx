import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Users, Lock, Search, X, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useSubscription } from '../hooks/useSubscription'
import { Group, BucketListGoal, GroupMember } from '../types'
import Skeleton from '../components/ui/Skeleton'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import UpgradeModal from '../components/UpgradeModal'

// ─── Constants ───────────────────────────────────────────────────────────────

const GROUP_EMOJIS = [
  '🌍', '🏔️', '🍕', '🎨', '🧘', '🤝', '💼', '❤️',
  '🌊', '🎵', '📚', '🎮', '🏋️', '💃', '🏄', '⛷️',
  '🧗', '🚴', '🏃', '🔭',
]

// ─── Group card (shared by both tabs) ────────────────────────────────────────

interface GroupCardProps {
  group: Group
  onClick: () => void
  onJoin?: () => Promise<void>
  showJoin?: boolean
  joining?: boolean
}

function GroupCard({ group, onClick, onJoin, showJoin = false, joining = false }: GroupCardProps) {
  const isEmoji = group.avatar_url && [...group.avatar_url].length <= 2
  const emojiAvatar = isEmoji ? group.avatar_url : '🌟'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="bg-white rounded-2xl shadow-sm p-4 mb-3 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-2xl flex-shrink-0">
        {emojiAvatar}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-semibold text-gray-900 truncate">{group.name}</span>
          {group.is_premium_only && (
            <Lock size={12} className="text-orange-400 flex-shrink-0" />
          )}
          {group.user_role && (
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                group.user_role === 'admin'
                  ? 'bg-orange-100 text-orange-600'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {group.user_role === 'admin' ? 'Admin' : 'Member'}
            </span>
          )}
        </div>
        {group.description && (
          <p className="text-sm text-gray-500 line-clamp-1 mb-0.5">{group.description}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="flex items-center gap-0.5">
            👥 {group.member_count} member{group.member_count !== 1 ? 's' : ''}
          </span>
          {group.goal && (
            <span className="truncate">🎯 {group.goal.title}</span>
          )}
        </div>
      </div>

      {/* Right action */}
      {showJoin && onJoin ? (
        <Button
          variant="secondary"
          size="sm"
          loading={joining}
          onClick={(e) => {
            e.stopPropagation()
            onJoin()
          }}
        >
          Join
        </Button>
      ) : (
        <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
      )}
    </motion.div>
  )
}

// ─── Skeleton cards ───────────────────────────────────────────────────────────

function GroupSkeletonList() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} variant="card" />
      ))}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { isPremium, isElite, isBusiness, tier } = useSubscription()

  const [activeTab, setActiveTab] = useState<'my' | 'discover'>('my')
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [discoverGroups, setDiscoverGroups] = useState<Group[]>([])
  const [myGroupIds, setMyGroupIds] = useState<string[]>([])
  const [loadingMy, setLoadingMy] = useState(true)
  const [loadingDiscover, setLoadingDiscover] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Create group modal
  const [showCreate, setShowCreate] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [selectedEmoji, setSelectedEmoji] = useState('🌍')
  const [goalQuery, setGoalQuery] = useState('')
  const [goalResults, setGoalResults] = useState<BucketListGoal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<BucketListGoal | null>(null)
  const [creating, setCreating] = useState(false)
  const goalSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch my groups ─────────────────────────────────────────────────────

  const fetchMyGroups = useCallback(async () => {
    if (!user) return
    setLoadingMy(true)
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select(
          '*, group:groups(*, creator:profiles!groups_creator_id_fkey(*), goal:bucket_list_goals(*))'
        )
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })

      if (error) throw error

      const rows = (data ?? []) as (GroupMember & { group: Group })[]
      const ids: string[] = []
      const groups: Group[] = rows.map((row) => {
        ids.push(row.group_id)
        return {
          ...row.group,
          user_role: row.role,
        }
      })
      setMyGroupIds(ids)
      setMyGroups(groups)
    } catch {
      toast.error('Failed to load your groups')
    } finally {
      setLoadingMy(false)
    }
  }, [user])

  // ── Fetch discover groups ────────────────────────────────────────────────

  const fetchDiscoverGroups = useCallback(async () => {
    if (!user) return
    setLoadingDiscover(true)
    try {
      let query = supabase
        .from('groups')
        .select('*, creator:profiles!groups_creator_id_fkey(*), goal:bucket_list_goals(*)')
        .eq('is_premium_only', false)
        .order('member_count', { ascending: false })
        .limit(20)

      if (myGroupIds.length > 0) {
        query = query.not('id', 'in', `(${myGroupIds.join(',')})`)
      }

      const { data, error } = await query
      if (error) throw error
      setDiscoverGroups((data ?? []) as Group[])
    } catch {
      toast.error('Failed to load discover groups')
    } finally {
      setLoadingDiscover(false)
    }
  }, [user, myGroupIds])

  useEffect(() => {
    fetchMyGroups()
  }, [fetchMyGroups])

  useEffect(() => {
    if (activeTab === 'discover' && discoverGroups.length === 0 && !loadingDiscover) {
      fetchDiscoverGroups()
    }
  }, [activeTab, discoverGroups.length, loadingDiscover, fetchDiscoverGroups])

  // ── Join group ───────────────────────────────────────────────────────────

  const joinGroup = async (groupId: string) => {
    if (!user) return
    setJoiningId(groupId)
    try {
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: user.id, role: 'member' })

      if (memberError) {
        if (memberError.code === '23505') {
          toast('You are already a member of this group', { icon: 'ℹ️' })
          return
        }
        throw memberError
      }

      // Increment member_count by re-fetching the current count and updating
      const { data: current } = await supabase
        .from('groups')
        .select('member_count')
        .eq('id', groupId)
        .single()

      if (current) {
        await supabase
          .from('groups')
          .update({ member_count: (current.member_count ?? 0) + 1 })
          .eq('id', groupId)
      }

      toast.success('Joined group!')
      // Refresh both lists
      await fetchMyGroups()
      setDiscoverGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, member_count: (g.member_count ?? 0) + 1 }
            : g
        ).filter((g) => g.id !== groupId)
      )
    } catch {
      toast.error('Failed to join group')
    } finally {
      setJoiningId(null)
    }
  }

  // ── Goal search in create modal ──────────────────────────────────────────

  const searchGoals = async (query: string) => {
    if (!user || !query.trim()) {
      setGoalResults([])
      return
    }
    const { data } = await supabase
      .from('bucket_list_goals')
      .select('*')
      .eq('user_id', user.id)
      .ilike('title', `%${query}%`)
      .limit(5)
    setGoalResults((data ?? []) as BucketListGoal[])
  }

  const handleGoalQueryChange = (value: string) => {
    setGoalQuery(value)
    if (goalSearchTimeout.current) clearTimeout(goalSearchTimeout.current)
    goalSearchTimeout.current = setTimeout(() => searchGoals(value), 300)
  }

  // ── Create group ─────────────────────────────────────────────────────────

  const handleCreateGroup = async () => {
    if (!user || !createName.trim()) return
    setCreating(true)
    try {
      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          name: createName.trim(),
          description: createDesc.trim() || null,
          goal_id: selectedGoal?.id ?? null,
          creator_id: user.id,
          avatar_url: selectedEmoji,
          member_count: 1,
          is_premium_only: false,
        })
        .select()
        .single()

      if (error) throw error

      await supabase.from('group_members').insert({
        group_id: group.id,
        user_id: user.id,
        role: 'admin',
      })

      toast.success('Squad created!')
      setShowCreate(false)
      resetCreateForm()
      await fetchMyGroups()
      setActiveTab('my')
      navigate(`/groups/${group.id}`)
    } catch {
      toast.error('Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  const resetCreateForm = () => {
    setCreateName('')
    setCreateDesc('')
    setSelectedEmoji('🌍')
    setGoalQuery('')
    setGoalResults([])
    setSelectedGoal(null)
  }

  const handleFabClick = () => {
    const canCreate = isPremium || isElite || isBusiness
    if (!canCreate) {
      setShowUpgrade(true)
      return
    }
    setShowCreate(true)
  }

  // ── Filtered discover ────────────────────────────────────────────────────

  const filteredDiscover = discoverGroups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.description ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-orange-100 px-4 pt-4 pb-0 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Groups</h1>

        {/* Tabs */}
        <div className="flex">
          {(['my', 'discover'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-400'
              }`}
            >
              {tab === 'my' ? `My Groups${myGroups.length > 0 ? ` (${myGroups.length})` : ''}` : 'Discover'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'my' ? (
            <motion.div
              key="my"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {loadingMy ? (
                <GroupSkeletonList />
              ) : myGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No groups yet</h3>
                  <p className="text-gray-500 mb-6 text-sm">
                    You haven't joined any groups yet.
                  </p>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="text-orange-500 font-semibold text-sm"
                  >
                    Discover Groups →
                  </button>
                </div>
              ) : (
                myGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onClick={() => navigate(`/groups/${group.id}`)}
                  />
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="discover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Search */}
              <div className="mb-4 relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search groups..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                />
              </div>

              {loadingDiscover ? (
                <GroupSkeletonList />
              ) : filteredDiscover.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="text-gray-500 text-sm">No groups found. Create one!</p>
                </div>
              ) : (
                filteredDiscover.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    onClick={() => navigate(`/groups/${group.id}`)}
                    showJoin
                    joining={joiningId === group.id}
                    onJoin={() => joinGroup(group.id)}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── FAB ── */}
      <button
        onClick={handleFabClick}
        aria-label="Create group"
        className="fixed bottom-20 right-4 w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform z-40 hover:bg-orange-600"
      >
        <Plus size={26} />
      </button>

      {/* ── Create Group Modal ── */}
      <Modal
        isOpen={showCreate}
        onClose={() => {
          setShowCreate(false)
          resetCreateForm()
        }}
        title="Create a Squad"
        fullHeight
      >
        <div className="flex flex-col gap-5 pb-6">
          {/* Emoji avatar picker */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Squad Avatar</p>
            <div className="grid grid-cols-10 gap-1.5">
              {GROUP_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={`w-9 h-9 text-lg rounded-xl flex items-center justify-center transition-all ${
                    selectedEmoji === emoji
                      ? 'bg-orange-500 ring-2 ring-orange-300 scale-110'
                      : 'bg-orange-50 hover:bg-orange-100'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <Input
            label="Group Name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="e.g. Northern Lights Chasers"
            fullWidth
          />

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={createDesc}
              onChange={(e) => setCreateDesc(e.target.value)}
              placeholder="What's this squad about?"
              rows={2}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent resize-none"
            />
          </div>

          {/* Goal search */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Link to a Goal (optional)</p>

            {selectedGoal ? (
              <div className="flex items-center gap-2 bg-orange-50 rounded-xl px-3 py-2">
                <span className="text-sm text-orange-700 font-medium flex-1">
                  🎯 {selectedGoal.title}
                </span>
                <button
                  onClick={() => {
                    setSelectedGoal(null)
                    setGoalQuery('')
                  }}
                  className="text-orange-400 hover:text-orange-600"
                  aria-label="Remove goal"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  value={goalQuery}
                  onChange={(e) => handleGoalQueryChange(e.target.value)}
                  placeholder="Search your goals..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent"
                />
                {goalResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 shadow-lg z-10 overflow-hidden">
                    {goalResults.map((goal) => (
                      <button
                        key={goal.id}
                        onClick={() => {
                          setSelectedGoal(goal)
                          setGoalQuery('')
                          setGoalResults([])
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-gray-800 hover:bg-orange-50 border-b border-gray-50 last:border-0"
                      >
                        {goal.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <Button
            variant="primary"
            fullWidth
            loading={creating}
            disabled={!createName.trim()}
            onClick={handleCreateGroup}
          >
            Create Squad 🚀
          </Button>
        </div>
      </Modal>

      {/* ── Premium gate modal ── */}
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        feature="Create custom groups"
        currentTier={tier}
      />
    </div>
  )
}
