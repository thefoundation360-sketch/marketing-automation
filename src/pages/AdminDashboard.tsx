import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  BarChart2, Users, Flag, Zap, DollarSign, Bell,
  TrendingUp, Search, ChevronLeft, ChevronRight,
  LogOut, Shield, CheckCircle2, Menu, X
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase, getAvatarUrl } from '../lib/supabase'
import { Profile, Report, FeatureFlag, Subscription, BucketListGoal, GOAL_CATEGORIES } from '../types'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────
type Section = 'overview' | 'users' | 'reports' | 'flags' | 'revenue' | 'notifications'

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
  travel: '✈️',
  adventure: '🏔️',
  health: '💪',
  learning: '📚',
  creative: '🎨',
  social: '👥',
  career: '💼',
  financial: '💰',
  wellness: '🧘',
  food: '🍜',
  philanthropy: '❤️',
  relationships: '👥',
}

function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category.toLowerCase()] ?? '🎯'
}

function getCategoryLabel(category: string): string {
  const found = GOAL_CATEGORIES.find(c => c.value === category)
  if (found) return found.label
  return category.charAt(0).toUpperCase() + category.slice(1)
}

// ────────────────────────────────────────────────────────────
// Loading screen
// ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-400 text-sm">Loading admin panel…</span>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Toggle switch
// ────────────────────────────────────────────────────────────
function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        enabled ? 'bg-orange-500' : 'bg-slate-600'
      }`}
      aria-pressed={enabled}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ────────────────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { profile, signOut, loading } = useAuth()
  const navigate = useNavigate()

  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ── Guard ──────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && profile && !profile.is_admin) {
      navigate('/')
    }
  }, [loading, profile, navigate])

  // ── Open report count (badge) ──────────────────────────────
  const [openReportCount, setOpenReportCount] = useState(0)

  useEffect(() => {
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('is_resolved', false)
      .then(({ count }) => setOpenReportCount(count ?? 0))
  }, [])

  // ── Nav items ──────────────────────────────────────────────
  const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'reports', label: 'Reports', icon: Flag },
    { id: 'flags', label: 'Feature Flags', icon: Zap },
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'notifications', label: 'Push Notifications', icon: Bell },
  ]

  // ────────────────────────────────────────────────────────────
  // SECTION 1 — OVERVIEW
  // ────────────────────────────────────────────────────────────
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [totalUsers, setTotalUsers] = useState(0)
  const [dau, setDau] = useState(0)
  const [totalMatches, setTotalMatches] = useState(0)
  const [mrr, setMrr] = useState(0)
  const [topGoals, setTopGoals] = useState<{ category: string; count: number }[]>([])
  const [goalCompletionRate, setGoalCompletionRate] = useState(0)

  const fetchOverview = useCallback(async () => {
    setOverviewLoading(true)
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const [usersRes, dauRes, matchesRes, subsRes, goalsRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_guest', false),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_guest', false)
          .gte('last_active_at', yesterday),
        supabase.from('matches').select('*', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('tier, status').eq('status', 'active'),
        supabase.from('bucket_list_goals').select('category, is_completed').limit(500),
      ])

      setTotalUsers(usersRes.count ?? 0)
      setDau(dauRes.count ?? 0)
      setTotalMatches(matchesRes.count ?? 0)

      const prices: Record<string, number> = {
        premium: 9.99,
        elite: 19.99,
        business: 49.99,
        free: 0,
      }
      const subs = subsRes.data ?? []
      const mrrVal = subs.reduce((sum, s) => sum + (prices[s.tier] ?? 0), 0)
      setMrr(mrrVal)

      const goals = goalsRes.data ?? []
      const catCounts: Record<string, number> = {}
      goals.forEach(g => {
        catCounts[g.category] = (catCounts[g.category] ?? 0) + 1
      })
      const sorted = Object.entries(catCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, count]) => ({ category, count }))
      setTopGoals(sorted)

      const completed = goals.filter(g => g.is_completed).length
      setGoalCompletionRate(goals.length > 0 ? Math.round((completed / goals.length) * 100) : 0)
    } catch {
      toast.error('Failed to load overview')
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  // ────────────────────────────────────────────────────────────
  // SECTION 2 — USERS
  // ────────────────────────────────────────────────────────────
  const [usersLoading, setUsersLoading] = useState(false)
  const [users, setUsers] = useState<Profile[]>([])
  const [userCount, setUserCount] = useState(0)
  const [userPage, setUserPage] = useState(0)
  const [userSearch, setUserSearch] = useState('')
  const [userSearchInput, setUserSearchInput] = useState('')
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'premium' | 'elite' | 'business'>('all')
  const pageSize = 20

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setUserSearch(userSearchInput)
      setUserPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearchInput])

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .eq('is_guest', false)
        .order('created_at', { ascending: false })
        .range(userPage * pageSize, (userPage + 1) * pageSize - 1)

      if (userSearch) {
        query = query.or(
          `full_name.ilike.%${userSearch}%,username.ilike.%${userSearch}%`
        )
      }
      if (tierFilter !== 'all') {
        query = query.eq('subscription_tier', tierFilter)
      }

      const { data, count, error } = await query
      if (error) throw error
      setUsers((data ?? []) as Profile[])
      setUserCount(count ?? 0)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }, [userPage, userSearch, tierFilter])

  // ────────────────────────────────────────────────────────────
  // SECTION 3 — REPORTS
  // ────────────────────────────────────────────────────────────
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reports, setReports] = useState<Report[]>([])
  const [showResolved, setShowResolved] = useState(false)

  const fetchReports = useCallback(async () => {
    setReportsLoading(true)
    try {
      let query = supabase
        .from('reports')
        .select(
          '*, reporter:profiles!reports_reporter_id_fkey(id, full_name, username, avatar_url), reported:profiles!reports_reported_id_fkey(id, full_name, username, avatar_url)'
        )
        .order('created_at', { ascending: false })

      if (!showResolved) {
        query = query.eq('is_resolved', false)
      }

      const { data, error } = await query
      if (error) throw error
      setReports((data ?? []) as unknown as Report[])

      const { count } = await supabase
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('is_resolved', false)
      setOpenReportCount(count ?? 0)
    } catch {
      toast.error('Failed to load reports')
    } finally {
      setReportsLoading(false)
    }
  }, [showResolved])

  const resolveReport = async (reportId: string) => {
    await supabase.from('reports').update({ is_resolved: true }).eq('id', reportId)
    toast.success('Report resolved')
    fetchReports()
  }

  const banUser = async (_userId: string) => {
    toast('User banned (simulated)', { icon: '⚠️' })
  }

  // ────────────────────────────────────────────────────────────
  // SECTION 4 — FEATURE FLAGS
  // ────────────────────────────────────────────────────────────
  const [flagsLoading, setFlagsLoading] = useState(false)
  const [flags, setFlags] = useState<FeatureFlag[]>([])

  const fetchFlags = useCallback(async () => {
    setFlagsLoading(true)
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('name')
      if (error) throw error
      setFlags(data ?? [])
    } catch {
      toast.error('Failed to load feature flags')
    } finally {
      setFlagsLoading(false)
    }
  }, [])

  const toggleFlag = async (flag: FeatureFlag) => {
    setFlags(prev =>
      prev.map(f => (f.id === flag.id ? { ...f, is_enabled: !f.is_enabled } : f))
    )
    const { error } = await supabase
      .from('feature_flags')
      .update({ is_enabled: !flag.is_enabled })
      .eq('id', flag.id)
    if (error) {
      setFlags(prev =>
        prev.map(f => (f.id === flag.id ? { ...f, is_enabled: flag.is_enabled } : f))
      )
      toast.error('Failed to update flag')
    } else {
      toast.success(`${flag.name} ${!flag.is_enabled ? 'enabled' : 'disabled'}`)
    }
  }

  // ────────────────────────────────────────────────────────────
  // SECTION 5 — REVENUE
  // ────────────────────────────────────────────────────────────
  const [revenueLoading, setRevenueLoading] = useState(false)
  const [tierCounts, setTierCounts] = useState<Record<string, number>>({
    free: 0,
    premium: 0,
    elite: 0,
    business: 0,
  })

  const fetchRevenue = useCallback(async () => {
    setRevenueLoading(true)
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('tier, status')
        .eq('status', 'active')
      if (error) throw error
      const counts: Record<string, number> = { free: 0, premium: 0, elite: 0, business: 0 }
      ;(data ?? []).forEach(s => {
        if (counts[s.tier] !== undefined) counts[s.tier]++
      })
      setTierCounts(counts)
    } catch {
      toast.error('Failed to load revenue data')
    } finally {
      setRevenueLoading(false)
    }
  }, [])

  const prices = { free: 0, premium: 9.99, elite: 19.99, business: 49.99 }

  const revenueMRR = useMemo(
    () =>
      Object.entries(tierCounts).reduce(
        (sum, [tier, count]) => sum + (prices[tier as keyof typeof prices] ?? 0) * count,
        0
      ),
    [tierCounts]
  )
  const revenueARR = revenueMRR * 12

  // ────────────────────────────────────────────────────────────
  // SECTION 6 — PUSH NOTIFICATIONS
  // ────────────────────────────────────────────────────────────
  const [notifTitle, setNotifTitle] = useState('')
  const [notifBody, setNotifBody] = useState('')
  const [sendingNotif, setSendingNotif] = useState(false)

  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) {
      toast.error('Please fill in title and message')
      return
    }
    setSendingNotif(true)
    await new Promise(r => setTimeout(r, 1500))
    setSendingNotif(false)
    toast.success('Notification queued! (Edge Function would handle delivery)')
    setNotifTitle('')
    setNotifBody('')
  }

  // ────────────────────────────────────────────────────────────
  // Section switching — fetch data as needed
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  useEffect(() => {
    if (activeSection === 'users') fetchUsers()
  }, [activeSection, fetchUsers])

  useEffect(() => {
    if (activeSection === 'reports') fetchReports()
  }, [activeSection, fetchReports])

  useEffect(() => {
    if (activeSection === 'flags') fetchFlags()
  }, [activeSection, fetchFlags])

  useEffect(() => {
    if (activeSection === 'revenue') fetchRevenue()
  }, [activeSection, fetchRevenue])

  // Re-fetch users when deps change (page / search / filter)
  useEffect(() => {
    if (activeSection === 'users') fetchUsers()
  }, [userPage, userSearch, tierFilter])

  // ────────────────────────────────────────────────────────────
  // Guard / loading
  // ────────────────────────────────────────────────────────────
  if (loading || !profile) return <LoadingScreen />
  if (!profile.is_admin) return null

  // ────────────────────────────────────────────────────────────
  // Derived
  // ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(userCount / pageSize)

  const topTier = Object.entries(tierCounts).reduce(
    (best, [tier, count]) => {
      const rev = count * prices[tier as keyof typeof prices]
      return rev > best.rev ? { tier, rev } : best
    },
    { tier: 'none', rev: 0 }
  )

  const tierColors: Record<string, string> = {
    free: 'bg-slate-500',
    premium: 'bg-orange-500',
    elite: 'bg-purple-500',
    business: 'bg-blue-500',
  }

  const tierPillColors: Record<string, string> = {
    free: 'bg-slate-600 text-slate-200',
    premium: 'bg-orange-600 text-white',
    elite: 'bg-purple-600 text-white',
    business: 'bg-blue-600 text-white',
  }

  function UserInitials({ name }: { name?: string }) {
    const initials = name
      ? name
          .split(' ')
          .slice(0, 2)
          .map(n => n[0])
          .join('')
          .toUpperCase()
      : '?'
    return (
      <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
        {initials}
      </div>
    )
  }

  function navigateTo(s: Section) {
    setActiveSection(s)
    setSidebarOpen(false)
  }

  // ────────────────────────────────────────────────────────────
  // Section renderers
  // ────────────────────────────────────────────────────────────
  function OverviewSection() {
    const circumference = 2 * Math.PI * 40 // ≈ 251.3

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">Platform Overview</h2>

        {/* Stat cards */}
        {overviewLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-700 rounded-xl h-28" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Users',
                value: totalUsers.toLocaleString(),
                icon: Users,
                bg: 'bg-purple-500/20',
                fg: 'text-purple-400',
              },
              {
                label: 'DAU',
                value: dau.toLocaleString(),
                icon: TrendingUp,
                bg: 'bg-green-500/20',
                fg: 'text-green-400',
              },
              {
                label: 'Total Matches',
                value: totalMatches.toLocaleString(),
                icon: BarChart2,
                bg: 'bg-blue-500/20',
                fg: 'text-blue-400',
              },
              {
                label: 'MRR',
                value: `$${mrr.toFixed(2)}`,
                icon: DollarSign,
                bg: 'bg-orange-500/20',
                fg: 'text-orange-400',
              },
            ].map(card => (
              <div key={card.label} className="bg-slate-800 rounded-xl p-4">
                <div className={`w-9 h-9 rounded-full ${card.bg} flex items-center justify-center mb-3`}>
                  <card.icon className={`w-5 h-5 ${card.fg}`} />
                </div>
                <p className="text-2xl font-bold text-white">{card.value}</p>
                <p className="text-slate-400 text-sm mt-0.5">{card.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Top goals + completion rate */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top 5 goals by category */}
          <div className="bg-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Top Goal Categories</h3>
            {overviewLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-6 bg-slate-700 rounded" />
                ))}
              </div>
            ) : topGoals.length === 0 ? (
              <p className="text-slate-400 text-sm">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {topGoals.map((g, i) => (
                  <div key={g.category} className="flex items-center gap-3">
                    <span className="text-slate-500 text-xs w-4 text-right">{i + 1}</span>
                    <span className="text-xl">{getCategoryEmoji(g.category)}</span>
                    <span className="flex-1 text-slate-200 text-sm capitalize">
                      {getCategoryLabel(g.category)}
                    </span>
                    <span className="text-slate-400 text-xs">{g.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Goal completion rate ring */}
          <div className="bg-slate-800 rounded-xl p-5 flex flex-col items-center justify-center gap-3">
            <h3 className="text-white font-semibold self-start">Goal Completion Rate</h3>
            {overviewLoading ? (
              <div className="animate-pulse w-24 h-24 rounded-full bg-slate-700" />
            ) : (
              <svg viewBox="0 0 100 100" className="w-24 h-24">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="8"
                  strokeDasharray={`${circumference}`}
                  strokeDashoffset={circumference * (1 - goalCompletionRate / 100)}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                <text
                  x="50"
                  y="54"
                  textAnchor="middle"
                  fill="white"
                  fontSize="16"
                  fontWeight="bold"
                >
                  {goalCompletionRate}%
                </text>
              </svg>
            )}
            <p className="text-slate-400 text-sm text-center">
              of all bucket list goals completed
            </p>
          </div>
        </div>
      </div>
    )
  }

  function UsersSection() {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Users</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            value={userSearchInput}
            onChange={e => setUserSearchInput(e.target.value)}
            placeholder="Search by name or username…"
            className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Tier filter pills */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'free', 'premium', 'elite', 'business'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTierFilter(t); setUserPage(0) }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                tierFilter === t
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-slate-800 rounded-xl overflow-hidden">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-slate-700">
                {['Avatar', 'Name', 'Username', 'Tier', 'Created', 'Status', 'Actions'].map(
                  col => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-slate-300 text-xs uppercase tracking-wider font-semibold"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {usersLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="animate-pulse h-4 bg-slate-700 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map(user => {
                  const avatarUrl = getAvatarUrl(user.avatar_url)
                  const isActive =
                    user.last_active_at
                      ? new Date(user.last_active_at) >
                        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                      : false

                  return (
                    <tr key={user.id} className="hover:bg-slate-750 transition-colors">
                      <td className="px-4 py-3">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={user.full_name ?? 'avatar'}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <UserInitials name={user.full_name} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-white text-sm">
                        {user.full_name ?? 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-sm">
                        {user.username ? `@${user.username}` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            tierPillColors[user.subscription_tier] ?? 'bg-slate-600 text-slate-200'
                          }`}
                        >
                          {user.subscription_tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-sm whitespace-nowrap">
                        {format(new Date(user.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium ${
                            isActive ? 'text-green-400' : 'text-slate-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-green-400' : 'bg-slate-500'
                            }`}
                          />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              user.username ? navigate(`/u/${user.username}`) : undefined
                            }
                            className="px-2 py-1 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                          >
                            Profile
                          </button>
                          <button
                            onClick={() => banUser(user.id)}
                            className="px-2 py-1 text-xs text-red-400 bg-red-900/20 hover:bg-red-900/40 rounded-lg transition-colors"
                          >
                            Ban
                          </button>
                          {!user.is_admin && (
                            <button
                              onClick={async () => {
                                await supabase
                                  .from('profiles')
                                  .update({ is_admin: true })
                                  .eq('id', user.id)
                                toast.success('User promoted to admin')
                                fetchUsers()
                              }}
                              className="px-2 py-1 text-xs text-orange-400 bg-orange-900/20 hover:bg-orange-900/40 rounded-lg transition-colors"
                            >
                              Admin
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-slate-400 text-sm">
            {userCount} user{userCount !== 1 ? 's' : ''} total
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUserPage(p => Math.max(0, p - 1))}
              disabled={userPage === 0}
              className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-slate-300 text-sm">
              Page {userPage + 1} of {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setUserPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={userPage >= totalPages - 1}
              className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  function ReportsSection() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Reports</h2>
          <button
            onClick={() => setShowResolved(v => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showResolved
                ? 'bg-orange-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {showResolved ? 'Hiding resolved' : 'Show resolved'}
          </button>
        </div>

        {reportsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-700 rounded-xl h-32" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-slate-400">No open reports. All clear! ✅</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => {
              const reporter = report.reporter as Profile | undefined
              const reported = report.reported as Profile | undefined
              return (
                <div key={report.id} className="bg-slate-800 rounded-xl p-4 mb-3">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-sm text-slate-300">
                      <span className="font-medium text-white">
                        {reporter?.full_name ?? 'Unknown'}
                      </span>
                      <span className="text-slate-500">reported</span>
                      <span className="font-medium text-white">
                        {reported?.full_name ?? 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {/* Reason */}
                  <p className="text-white font-medium text-sm mb-1">{report.reason}</p>

                  {/* Details */}
                  {report.details && (
                    <p className="text-slate-400 text-sm mb-2">{report.details}</p>
                  )}

                  {/* Date */}
                  <p className="text-xs text-slate-500 mb-3">
                    {format(new Date(report.created_at), 'MMM d, yyyy · h:mm a')}
                  </p>

                  {/* Actions */}
                  {report.is_resolved ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-900/30 text-green-400 text-xs font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Resolved
                    </span>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveReport(report.id)}
                        className="flex-1 py-1.5 rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50 text-sm font-medium transition-colors"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => banUser(report.reported_id)}
                        className="flex-1 py-1.5 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 text-sm font-medium transition-colors"
                      >
                        Ban User
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  function FlagsSection() {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Feature Flags</h2>

        {flagsLoading ? (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse p-4 border-b border-slate-700 last:border-b-0">
                <div className="h-4 bg-slate-700 rounded w-1/3 mb-2" />
                <div className="h-3 bg-slate-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : flags.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-400">
            No feature flags configured.
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl divide-y divide-slate-700">
            {flags.map(flag => (
              <div
                key={flag.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex-1 mr-4">
                  <p className="font-mono text-sm text-orange-400">{flag.name}</p>
                  {flag.description && (
                    <p className="text-slate-400 text-xs mt-0.5">{flag.description}</p>
                  )}
                </div>
                <ToggleSwitch
                  enabled={flag.is_enabled}
                  onToggle={() => toggleFlag(flag)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  function RevenueSection() {
    const maxCount = Math.max(...Object.values(tierCounts), 1)

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Revenue</h2>

        {revenueLoading ? (
          <div className="animate-pulse bg-slate-700 rounded-xl h-32" />
        ) : (
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl p-6">
            <p className="text-orange-100 text-sm">Monthly Recurring Revenue</p>
            <p className="text-4xl font-bold text-white mt-1">
              ${revenueMRR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-orange-200 text-sm mt-1">
              ARR: ${revenueARR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {/* Tier breakdown */}
        <div className="bg-slate-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Subscription Breakdown</h3>
          {revenueLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse h-8 bg-slate-700 rounded" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(['free', 'premium', 'elite', 'business'] as const).map(tier => {
                const count = tierCounts[tier] ?? 0
                const barWidth = Math.round((count / maxCount) * 100)
                const contribution = count * prices[tier]
                return (
                  <div key={tier}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-slate-300 text-sm capitalize">{tier}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-xs">
                          ${contribution.toFixed(2)}/mo
                        </span>
                        <span className="text-slate-400 text-xs w-12 text-right">
                          {count} users
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${tierColors[tier] ?? 'bg-slate-500'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top tier callout */}
        {!revenueLoading && topTier.tier !== 'none' && (
          <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-orange-400 shrink-0" />
            <div>
              <p className="text-slate-400 text-sm">Top Revenue Tier</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-white font-semibold capitalize">{topTier.tier}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    tierPillColors[topTier.tier] ?? 'bg-slate-600 text-slate-200'
                  }`}
                >
                  ${topTier.rev.toFixed(2)}/mo
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  function NotificationsSection() {
    return (
      <div>
        <div className="bg-slate-800 rounded-xl p-6 max-w-lg">
          <h2 className="text-xl font-bold text-white mb-1">Send Push Notification</h2>
          <p className="text-slate-400 text-sm mb-6">
            Broadcast a message to all DreamLink users
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">
                Notification Title
              </label>
              <input
                value={notifTitle}
                onChange={e => setNotifTitle(e.target.value)}
                placeholder="Enter title…"
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3.5 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1">
                Message Body
              </label>
              <textarea
                value={notifBody}
                onChange={e => setNotifBody(e.target.value)}
                placeholder="Enter message…"
                rows={4}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white resize-none text-sm placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            <Button
              variant="primary"
              fullWidth
              loading={sendingNotif}
              icon={<Bell className="w-4 h-4" />}
              onClick={sendNotification}
            >
              Send to All Users
            </Button>

            <p className="text-slate-500 text-xs mt-4 text-center">
              In production, this calls a Supabase Edge Function that sends via OneSignal
            </p>
          </div>
        </div>
      </div>
    )
  }

  function renderSection() {
    switch (activeSection) {
      case 'overview':
        return <OverviewSection />
      case 'users':
        return <UsersSection />
      case 'reports':
        return <ReportsSection />
      case 'flags':
        return <FlagsSection />
      case 'revenue':
        return <RevenueSection />
      case 'notifications':
        return <NotificationsSection />
    }
  }

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* ── Desktop Sidebar ────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 bg-slate-800 fixed inset-y-0 left-0 z-30 border-r border-slate-700">
        {/* Brand */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-slate-700">
          <Shield className="w-5 h-5 text-orange-500 shrink-0" />
          <span className="text-white font-bold text-sm">DreamLink Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => navigateTo(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors relative ${
                activeSection === item.id
                  ? 'text-orange-400 bg-orange-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === 'reports' && openReportCount > 0 && (
                <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-xs flex items-center justify-center px-1">
                  {openReportCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-slate-700">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Drawer ──────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Drawer */}
            <motion.aside
              key="sidebar-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 flex flex-col border-r border-slate-700 md:hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-orange-500" />
                  <span className="text-white font-bold text-sm">DreamLink Admin</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 overflow-y-auto py-3">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors relative ${
                      activeSection === item.id
                        ? 'text-orange-400 bg-orange-500/10'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.id === 'reports' && openReportCount > 0 && (
                      <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-xs flex items-center justify-center px-1">
                        {openReportCount}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              {/* Sign out */}
              <div className="p-3 border-t border-slate-700">
                <button
                  onClick={signOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Sign Out
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content area ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:ml-56 min-h-screen">
        {/* Mobile header */}
        <header className="md:hidden bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 text-slate-300 hover:text-white"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            <span className="text-white font-bold">DreamLink Admin</span>
          </div>
          <div className="w-6" />
        </header>

        {/* Section content */}
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Mobile bottom tab bar ──────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 flex md:hidden z-40">
        {navItems.slice(0, 5).map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`flex-1 flex flex-col items-center py-2 relative transition-colors ${
              activeSection === item.id ? 'text-orange-500' : 'text-slate-400'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs mt-0.5">{item.label === 'Feature Flags' ? 'Flags' : item.label}</span>
            {item.id === 'reports' && openReportCount > 0 && (
              <span className="absolute top-1 right-1/4 min-w-[16px] h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-0.5">
                {openReportCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
