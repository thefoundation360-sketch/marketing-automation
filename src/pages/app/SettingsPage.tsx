import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ChevronRight, LogOut, Shield, Bell, User, CreditCard,
  FileText, Trash2, Download, Lock, Eye, EyeOff, AlertTriangle, Check,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { redirectToPortal } from '@/lib/stripe'
import { cn } from '@/lib/utils'
import Avatar from '@/components/shared/Avatar'
import { TierBadge } from '@/components/shared/Badge'
import Modal from '@/components/shared/Modal'

// ── Types ──────────────────────────────────────────────────────────────────────

interface NotifPrefs {
  new_matches: boolean
  new_messages: boolean
  friend_goal_completed: boolean
  nearby_dreamers: boolean
  weekly_nudge: boolean
}

const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  new_matches: true,
  new_messages: true,
  friend_goal_completed: true,
  nearby_dreamers: false,
  weekly_nudge: true,
}

const NOTIF_ITEMS: { key: keyof NotifPrefs; label: string; description: string }[] = [
  { key: 'new_matches', label: 'New Matches', description: 'When you get a new match' },
  { key: 'new_messages', label: 'New Messages', description: 'When someone messages you' },
  { key: 'friend_goal_completed', label: 'Friend completed a goal', description: 'Celebrate with your connections' },
  { key: 'nearby_dreamers', label: 'Nearby dreamers', description: 'People with shared goals near you' },
  { key: 'weekly_nudge', label: 'Weekly nudge', description: 'Keep momentum on your bucket list' },
]

type ProfileVisibility = 'everyone' | 'matches' | 'nobody'
type MessagePermission = 'everyone' | 'matches'

// ── iOS-style Toggle ───────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        'relative w-12 h-6 rounded-full transition-colors flex-shrink-0 focus:outline-none',
        on ? 'bg-orange-500' : 'bg-warm-300',
      )}
    >
      <span
        className={cn(
          'absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform',
          on ? 'translate-x-7' : 'translate-x-1',
        )}
      />
    </button>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 px-5 pt-6 pb-2">
      <Icon size={13} className="text-warm-400" />
      <h2 className="text-xs font-bold text-warm-400 uppercase tracking-wider">{label}</h2>
    </div>
  )
}

// ── Settings card wrapper ──────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-4 bg-white rounded-2xl border border-warm-100 shadow-sm overflow-hidden divide-y divide-warm-50">
      {children}
    </div>
  )
}

// ── Settings row ───────────────────────────────────────────────────────────────

function SettingsRow({
  label,
  sublabel,
  rightEl,
  onPress,
  danger = false,
}: {
  label: string
  sublabel?: string
  rightEl?: React.ReactNode
  onPress?: () => void
  danger?: boolean
}) {
  const Tag = onPress ? 'button' : 'div'
  return (
    <Tag
      type={onPress ? 'button' : undefined}
      onClick={onPress}
      className={cn(
        'w-full flex items-center gap-3 px-5 py-3.5 text-left',
        onPress && 'active:bg-warm-50 transition-colors',
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium leading-snug', danger ? 'text-red-500' : 'text-warm-900')}>
          {label}
        </p>
        {sublabel && <p className="text-xs text-warm-400 mt-0.5 leading-snug">{sublabel}</p>}
      </div>
      {rightEl !== undefined
        ? rightEl
        : onPress && !danger
          ? <ChevronRight size={16} className="text-warm-300 flex-shrink-0" />
          : null}
    </Tag>
  )
}

// ── Change Email Modal ─────────────────────────────────────────────────────────

function ChangeEmailModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  function resetAndClose() {
    setNewEmail('')
    setPassword('')
    onClose()
  }

  async function handleSubmit() {
    if (!newEmail.trim() || !password) {
      toast.error('Please fill in all fields.')
      return
    }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Not authenticated')
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      })
      if (signInErr) throw new Error('Incorrect current password.')
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) throw error
      toast.success('Confirmation sent to your new email address.')
      resetAndClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Change Email" size="sm">
      <div className="px-5 py-4 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
            New Email Address
          </label>
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
            Confirm Current Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your current password"
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
          />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !newEmail.trim() || !password}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-bold text-sm disabled:opacity-60 active:scale-[0.98] transition-all"
        >
          {loading ? 'Sending link…' : 'Update Email'}
        </button>
      </div>
    </Modal>
  )
}

// ── Change Password Modal ──────────────────────────────────────────────────────

function ChangePasswordModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [loading, setLoading] = useState(false)

  function resetAndClose() {
    setCurrent(''); setNext(''); setConfirm('')
    onClose()
  }

  async function handleSubmit() {
    if (!current || !next || !confirm) { toast.error('Please fill in all fields.'); return }
    if (next !== confirm) { toast.error('New passwords do not match.'); return }
    if (next.length < 8) { toast.error('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) throw new Error('Not authenticated')
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: current })
      if (signInErr) throw new Error('Current password is incorrect.')
      const { error } = await supabase.auth.updateUser({ password: next })
      if (error) throw error
      toast.success('Password updated successfully!')
      resetAndClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Change Password" size="md">
      <div className="px-5 py-4 space-y-4">
        {/* Current password */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              placeholder="Your current password"
              className="w-full px-4 py-3 pr-11 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-warm-400"
            >
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* New password */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
            New Password
          </label>
          <div className="relative">
            <input
              type={showNext ? 'text' : 'password'}
              value={next}
              onChange={e => setNext(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-4 py-3 pr-11 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowNext(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-warm-400"
            >
              {showNext ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Confirm */}
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repeat your new password"
            className="w-full px-4 py-3 rounded-xl border border-warm-200 bg-warm-50 text-warm-900 placeholder-warm-400 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !current || !next || !confirm}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-bold text-sm disabled:opacity-60 active:scale-[0.98] transition-all"
        >
          {loading ? 'Updating…' : 'Update Password'}
        </button>
      </div>
    </Modal>
  )
}

// ── Block List Modal ───────────────────────────────────────────────────────────

interface BlockedUser {
  id: string
  blocked_id: string
  profile?: { full_name: string; avatar_url: string | null; username: string }
}

function BlockListModal({
  isOpen,
  onClose,
  userId,
}: {
  isOpen: boolean
  onClose: () => void
  userId: string
}) {
  const [blocked, setBlocked] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(false)
  const [unblocking, setUnblocking] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) fetchBlocked()
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchBlocked() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('blocked_users')
        .select('*, profile:profiles!blocked_id(full_name, avatar_url, username)')
        .eq('user_id', userId)
      setBlocked((data as BlockedUser[]) ?? [])
    } catch {
      // Table may not exist in all environments; fail silently
    } finally {
      setLoading(false)
    }
  }

  async function handleUnblock(entry: BlockedUser) {
    setUnblocking(entry.id)
    try {
      await supabase.from('blocked_users').delete().eq('id', entry.id)
      setBlocked(prev => prev.filter(b => b.id !== entry.id))
      toast.success('User unblocked.')
    } catch {
      toast.error('Failed to unblock user.')
    } finally {
      setUnblocking(null)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Block List" size="md">
      <div className="px-5 py-4">
        {loading ? (
          <div className="py-8 text-center text-warm-400 text-sm">Loading…</div>
        ) : blocked.length === 0 ? (
          <div className="py-8 text-center">
            <Shield size={36} className="text-warm-300 mx-auto mb-3" />
            <p className="text-warm-600 text-sm font-semibold">No blocked users</p>
            <p className="text-warm-400 text-xs mt-1">Users you block will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {blocked.map(entry => (
              <div key={entry.id} className="flex items-center gap-3 bg-warm-50 rounded-2xl p-3">
                <Avatar
                  url={entry.profile?.avatar_url}
                  name={entry.profile?.full_name ?? 'User'}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-warm-900 truncate">
                    {entry.profile?.full_name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-warm-400">@{entry.profile?.username ?? 'user'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnblock(entry)}
                  disabled={unblocking === entry.id}
                  className="px-3 py-1.5 rounded-xl border border-warm-200 bg-white text-xs font-semibold text-warm-700 active:bg-warm-100 transition-colors disabled:opacity-50"
                >
                  {unblocking === entry.id ? '…' : 'Unblock'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ── Delete Account Modal ───────────────────────────────────────────────────────

function DeleteAccountModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm.')
      return
    }
    setLoading(true)
    try {
      // Try edge function first
      const { error } = await supabase.functions.invoke('delete-account', { body: {} })
      if (error) {
        // If the function isn't deployed, route to support instead
        toast('Please contact support@dreammatch.app to delete your account.', {
          icon: 'ℹ️',
          duration: 6000,
        })
        onClose()
        return
      }
      await signOut()
      navigate('/')
    } catch {
      toast('Please email support@dreammatch.app to permanently delete your account.', {
        icon: 'ℹ️',
        duration: 6000,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  function handleClose() { setConfirmText(''); onClose() }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Delete Account" size="md">
      <div className="px-5 py-4 space-y-4">
        <div className="flex gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 leading-relaxed">
            <strong>This action is permanent.</strong> All your profile data, bucket list goals,
            matches, and messages will be deleted and cannot be recovered.
          </p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wide mb-1.5">
            Type DELETE to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-warm-900 placeholder-red-300 text-sm font-mono focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
          />
        </div>
        <button
          type="button"
          onClick={handleDelete}
          disabled={confirmText !== 'DELETE' || loading}
          className="w-full py-3.5 rounded-2xl bg-red-500 text-white font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-all"
        >
          {loading ? 'Deleting…' : 'Permanently Delete Account'}
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="w-full py-2.5 text-sm text-warm-500 font-medium"
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}

// ── Main Settings Page ─────────────────────────────────────────────────────────

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()

  // Notifications — persisted to localStorage
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(() => {
    try {
      const stored = localStorage.getItem('notif_prefs')
      return stored
        ? { ...DEFAULT_NOTIF_PREFS, ...(JSON.parse(stored) as Partial<NotifPrefs>) }
        : DEFAULT_NOTIF_PREFS
    } catch {
      return DEFAULT_NOTIF_PREFS
    }
  })

  // Privacy
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>('everyone')
  const [messagePermission, setMessagePermission] = useState<MessagePermission>('matches')

  // Loading states
  const [portalLoading, setPortalLoading] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Modals
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showBlockList, setShowBlockList] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  function updateNotif(key: keyof NotifPrefs, value: boolean) {
    const updated = { ...notifPrefs, [key]: value }
    setNotifPrefs(updated)
    try {
      localStorage.setItem('notif_prefs', JSON.stringify(updated))
    } catch {
      // localStorage may be unavailable in some browsers
    }
    toast.success('Preference saved.')
  }

  async function handleManageSubscription() {
    if (!user) return
    setPortalLoading(true)
    try {
      await redirectToPortal(user.id)
    } catch {
      toast.error('Failed to open billing portal. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  async function handleExportData() {
    if (!user || !profile) return
    try {
      const { data: goals } = await supabase
        .from('bucket_goals')
        .select('*')
        .eq('user_id', user.id)

      const exportPayload = {
        exported_at: new Date().toISOString(),
        profile,
        goals: goals ?? [],
      }

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `dreammatch-data-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success('Data exported!')
    } catch {
      toast.error('Failed to export data.')
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/')
    } catch {
      toast.error('Failed to sign out.')
      setSigningOut(false)
    }
  }

  if (!profile || !user) {
    return (
      <div className="flex items-center justify-center h-full bg-[#FFFBF7]">
        <div className="w-10 h-10 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    )
  }

  const tier = profile.subscription_tier
  const isPaidUser = tier !== 'free'
  const tierBenefitLine: Record<typeof tier, string> = {
    free: '5 swipes/day · 3 goals · 10 messages/day',
    premium: 'Unlimited swipes, goals & messages. Full match breakdown.',
    elite: 'Everything in Premium plus 1:1 coaching and verified badge.',
    business: 'Full brand tools, analytics, and promoted placement.',
  }

  return (
    <div className="flex flex-col min-h-full bg-[#FFFBF7] pb-8">

      {/* ── Page title ─────────────────────────────────────────────────────── */}
      <div className="px-5 pt-8 pb-2">
        <h1 className="text-2xl font-extrabold text-warm-900">Settings</h1>
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* PROFILE */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionHeader icon={User} label="Profile" />
      <Card>
        {/* Profile summary row */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-warm-50">
          <Avatar
            url={profile.avatar_url}
            name={profile.full_name}
            size="lg"
            showBadge={profile.is_verified}
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-warm-900 text-base truncate leading-tight">
              {profile.full_name}
            </p>
            <p className="text-xs text-warm-400 truncate mt-0.5">{user.email}</p>
            <div className="mt-1.5">
              <TierBadge tier={tier} />
            </div>
          </div>
        </div>

        <SettingsRow
          label="Edit Profile"
          sublabel="Update name, bio, interests and avatar"
          onPress={() => navigate('/app/edit-profile')}
        />
      </Card>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* SUBSCRIPTION */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionHeader icon={CreditCard} label="Subscription" />
      <Card>
        {/* Plan summary */}
        <div className="px-5 py-4 border-b border-warm-50">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-warm-800">Current Plan</span>
              <TierBadge tier={tier} />
            </div>
            {isPaidUser && (
              <span className="text-xs text-warm-400 font-medium">Next bill: July 15, 2026</span>
            )}
          </div>
          <p className="text-xs text-warm-500 leading-relaxed">{tierBenefitLine[tier]}</p>
        </div>

        {!isPaidUser ? (
          <div className="px-5 py-4">
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-bold text-sm shadow-sm active:scale-[0.98] transition-all"
            >
              Upgrade to Premium — 7 days free
            </button>
          </div>
        ) : (
          <SettingsRow
            label="Manage Subscription"
            sublabel="Update plan, payment method, or cancel"
            rightEl={
              portalLoading ? (
                <div className="w-4 h-4 border-2 border-warm-300 border-t-orange-400 rounded-full animate-spin" />
              ) : (
                <ChevronRight size={16} className="text-warm-300 flex-shrink-0" />
              )
            }
            onPress={handleManageSubscription}
          />
        )}
      </Card>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* NOTIFICATIONS */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionHeader icon={Bell} label="Notifications" />
      <Card>
        {NOTIF_ITEMS.map(({ key, label, description }) => (
          <div key={key} className="flex items-center gap-3 px-5 py-3.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warm-900">{label}</p>
              <p className="text-xs text-warm-400 mt-0.5">{description}</p>
            </div>
            <Toggle on={notifPrefs[key]} onChange={v => updateNotif(key, v)} />
          </div>
        ))}
      </Card>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* PRIVACY */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionHeader icon={Eye} label="Privacy" />
      <Card>
        {/* Profile visibility */}
        <div className="px-5 py-3.5 border-b border-warm-50">
          <label className="block text-sm font-medium text-warm-900 mb-2">
            Profile visible to
          </label>
          <select
            value={profileVisibility}
            onChange={e => setProfileVisibility(e.target.value as ProfileVisibility)}
            className="w-full px-3 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-sm text-warm-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
          >
            <option value="everyone">Everyone</option>
            <option value="matches">Matches only</option>
            <option value="nobody">Nobody</option>
          </select>
        </div>

        {/* Who can message */}
        <div className="px-5 py-3.5 border-b border-warm-50">
          <label className="block text-sm font-medium text-warm-900 mb-2">
            Who can message me
          </label>
          <select
            value={messagePermission}
            onChange={e => setMessagePermission(e.target.value as MessagePermission)}
            className="w-full px-3 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-sm text-warm-900 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
          >
            <option value="matches">Matches only</option>
            <option value="everyone">Everyone</option>
          </select>
        </div>

        {/* Block list */}
        <SettingsRow
          label="Block List"
          sublabel="Manage users you have blocked"
          onPress={() => setShowBlockList(true)}
        />
      </Card>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ACCOUNT */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionHeader icon={Lock} label="Account" />
      <Card>
        <SettingsRow
          label="Change Email"
          sublabel={user.email ?? ''}
          onPress={() => setShowEmailModal(true)}
        />
        <SettingsRow
          label="Change Password"
          sublabel="Update your account password"
          onPress={() => setShowPasswordModal(true)}
        />
        <SettingsRow
          label="Export My Data"
          sublabel="Download a JSON copy of your profile and goals"
          onPress={handleExportData}
          rightEl={<Download size={16} className="text-warm-400 flex-shrink-0" />}
        />
      </Card>

      {/* Danger zone */}
      <div className="mx-4 mt-3 bg-red-50 rounded-2xl overflow-hidden border border-red-100">
        <SettingsRow
          label="Delete Account"
          sublabel="Permanently remove your account and all data"
          onPress={() => setShowDeleteModal(true)}
          danger
          rightEl={<Trash2 size={15} className="text-red-400 flex-shrink-0" />}
        />
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* LEGAL */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      <SectionHeader icon={FileText} label="Legal" />
      <Card>
        <Link
          to="/privacy"
          className="flex items-center justify-between px-5 py-3.5 active:bg-warm-50 transition-colors"
        >
          <span className="text-sm font-medium text-warm-900">Privacy Policy</span>
          <ChevronRight size={16} className="text-warm-300" />
        </Link>
        <Link
          to="/terms"
          className="flex items-center justify-between px-5 py-3.5 active:bg-warm-50 transition-colors"
        >
          <span className="text-sm font-medium text-warm-900">Terms of Service</span>
          <ChevronRight size={16} className="text-warm-300" />
        </Link>
        <Link
          to="/contact"
          className="flex items-center justify-between px-5 py-3.5 active:bg-warm-50 transition-colors"
        >
          <span className="text-sm font-medium text-warm-900">Contact Support</span>
          <ChevronRight size={16} className="text-warm-300" />
        </Link>
      </Card>

      {/* ── Sign Out button ───────────────────────────────────────────────── */}
      <div className="mx-4 mt-6">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 text-white font-bold text-base shadow-sm active:scale-[0.98] transition-all disabled:opacity-60"
        >
          <LogOut size={18} />
          {signingOut ? 'Signing out…' : 'Sign Out'}
        </button>
      </div>

      <p className="text-center text-xs text-warm-300 mt-4">DreamMatch v1.0.0</p>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <ChangeEmailModal isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} />
      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <BlockListModal
        isOpen={showBlockList}
        onClose={() => setShowBlockList(false)}
        userId={user.id}
      />
      <DeleteAccountModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} />
    </div>
  )
}
