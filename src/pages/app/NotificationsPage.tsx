import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Heart,
  MessageCircle,
  Trophy,
  MapPin,
  Star,
  MessageSquare,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn, formatTimeAgo } from '@/lib/utils'
import EmptyState from '@/components/shared/EmptyState'
import { ListItemSkeleton } from '@/components/shared/LoadingSkeleton'
import type { Notification, NotificationType } from '@/types'

// ── Icon config ───────────────────────────────────────────────────────────────

interface IconConfig {
  icon: React.ReactNode
  bg: string
}

function getIconConfig(type: NotificationType): IconConfig {
  switch (type) {
    case 'new_match':
      return {
        icon: <Heart size={18} className="text-rose-500 fill-rose-500" />,
        bg: 'bg-rose-100',
      }
    case 'new_message':
      return {
        icon: <MessageCircle size={18} className="text-blue-500" />,
        bg: 'bg-blue-100',
      }
    case 'goal_completed_friend':
      return {
        icon: <Trophy size={18} className="text-amber-500" />,
        bg: 'bg-amber-100',
      }
    case 'goal_nearby':
      return {
        icon: <MapPin size={18} className="text-green-600" />,
        bg: 'bg-green-100',
      }
    case 'weekly_nudge':
      return {
        icon: <Star size={18} className="text-purple-500" />,
        bg: 'bg-purple-100',
      }
    case 'milestone':
      return {
        icon: <Star size={18} className="text-orange-500" />,
        bg: 'bg-orange-100',
      }
    default:
      return {
        icon: <MessageSquare size={18} className="text-warm-500" />,
        bg: 'bg-warm-100',
      }
  }
}

function getNavigationPath(type: NotificationType): string {
  switch (type) {
    case 'new_match':
      return '/app/discover'
    case 'new_message':
      return '/app/messages'
    case 'goal_completed_friend':
      return '/app/feed'
    case 'goal_nearby':
      return '/app/discover'
    case 'weekly_nudge':
      return '/app/bucket-list'
    case 'milestone':
      return '/app/feed'
    default:
      return '/app/feed'
  }
}

// ── Time grouping ─────────────────────────────────────────────────────────────

type TimeGroup = 'Today' | 'This Week' | 'Earlier'

function getTimeGroup(dateString: string): TimeGroup {
  const date = new Date(dateString)
  const now = new Date()

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay())

  if (date >= startOfToday) return 'Today'
  if (date >= startOfWeek) return 'This Week'
  return 'Earlier'
}

interface GroupedNotifications {
  today: Notification[]
  thisWeek: Notification[]
  earlier: Notification[]
}

function groupNotifications(notifications: Notification[]): GroupedNotifications {
  const result: GroupedNotifications = { today: [], thisWeek: [], earlier: [] }
  for (const n of notifications) {
    const group = getTimeGroup(n.created_at)
    if (group === 'Today') result.today.push(n)
    else if (group === 'This Week') result.thisWeek.push(n)
    else result.earlier.push(n)
  }
  return result
}

// ── Notification Item ─────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification
  onRead: (id: string) => void
}

function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const navigate = useNavigate()
  const isUnread = notification.read_at === null
  const { icon, bg } = getIconConfig(notification.type)

  function handleTap() {
    if (isUnread) {
      onRead(notification.id)
    }
    navigate(getNavigationPath(notification.type))
  }

  return (
    <button
      onClick={handleTap}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3.5 active:bg-warm-50 transition-colors text-left',
        isUnread && 'border-l-4 border-orange-500 pl-3'
      )}
    >
      {/* Icon circle */}
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
          bg
        )}
      >
        {icon}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-snug',
            isUnread ? 'text-warm-900 font-medium' : 'text-warm-700'
          )}
        >
          {notification.body}
        </p>
        <p className="text-xs text-warm-400 mt-0.5">
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>

      {/* Unread dot */}
      {isUnread && (
        <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />
      )}
    </button>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

interface NotificationSectionProps {
  title: string
  notifications: Notification[]
  onRead: (id: string) => void
}

function NotificationSection({
  title,
  notifications,
  onRead,
}: NotificationSectionProps) {
  if (notifications.length === 0) return null

  return (
    <div className="mb-2">
      <div className="px-4 pt-4 pb-1.5">
        <h2 className="text-xs font-bold text-warm-500 uppercase tracking-wider">
          {title}
        </h2>
      </div>
      <div className="bg-white rounded-2xl border border-warm-100 shadow-sm mx-4 overflow-hidden divide-y divide-warm-50">
        {notifications.map(n => (
          <NotificationItem key={n.id} notification={n} onRead={onRead} />
        ))}
      </div>
    </div>
  )
}

// ── Notifications Page ────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { profile } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(60)

      if (error) throw error
      setNotifications((data as Notification[]) ?? [])
    } catch {
      toast.error('Could not load notifications')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  async function handleMarkAllRead() {
    if (!profile) return
    const unreadIds = notifications
      .filter(n => n.read_at === null)
      .map(n => n.id)

    if (unreadIds.length === 0) {
      toast('All caught up!', { icon: '✅' })
      return
    }

    // Optimistic update
    const now = new Date().toISOString()
    setNotifications(prev =>
      prev.map(n => (n.read_at === null ? { ...n, read_at: now } : n))
    )

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', profile.id)
        .is('read_at', null)

      if (error) throw error
      toast.success('All notifications marked as read')
    } catch {
      // Revert on failure
      setNotifications(prev =>
        prev.map(n => (unreadIds.includes(n.id) ? { ...n, read_at: null } : n))
      )
      toast.error('Could not mark notifications as read')
    }
  }

  async function handleMarkOneRead(id: string) {
    const now = new Date().toISOString()

    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read_at: now } : n))
    )

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id)

      if (error) throw error
    } catch {
      // Revert on failure
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read_at: null } : n))
      )
      toast.error('Could not mark notification as read')
    }
  }

  const unreadCount = notifications.filter(n => n.read_at === null).length
  const grouped = groupNotifications(notifications)

  return (
    <div className="flex flex-col h-full bg-[#FFFBF7]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FFFBF7] border-b border-warm-100 px-5 pt-safe-top pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-warm-900">Notifications</h1>
            {unreadCount > 0 && !loading && (
              <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={handleMarkAllRead}
            className="text-sm font-medium text-orange-500 active:opacity-60 transition-opacity"
          >
            Mark all read
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain py-2">
        {loading ? (
          <div className="bg-white rounded-2xl border border-warm-100 shadow-sm mx-4 mt-2 overflow-hidden divide-y divide-warm-50">
            {[0, 1, 2, 3, 4].map(i => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="No notifications yet"
            description="When you get matches, messages, and activity, they'll show up here."
          />
        ) : (
          <div className="pb-6">
            <NotificationSection
              title="Today"
              notifications={grouped.today}
              onRead={handleMarkOneRead}
            />
            <NotificationSection
              title="This Week"
              notifications={grouped.thisWeek}
              onRead={handleMarkOneRead}
            />
            <NotificationSection
              title="Earlier"
              notifications={grouped.earlier}
              onRead={handleMarkOneRead}
            />
          </div>
        )}
      </div>
    </div>
  )
}
