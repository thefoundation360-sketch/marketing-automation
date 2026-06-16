import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Compass, Heart, MessageCircle, Rss, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  icon: typeof Compass
  label: string
  key: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/discover', icon: Compass, label: 'Discover', key: 'discover' },
  { to: '/matches', icon: Heart, label: 'Matches', key: 'matches' },
  { to: '/messages', icon: MessageCircle, label: 'Messages', key: 'messages' },
  { to: '/feed', icon: Rss, label: 'Feed', key: 'feed' },
  { to: '/profile', icon: User, label: 'Profile', key: 'profile' },
]

export default function Layout() {
  const location = useLocation()
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return

    async function fetchUnreadCount() {
      // First: get conversation IDs this user participates in
      const { data: convData } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [user!.id])

      const conversationIds = (convData ?? []).map((c: { id: string }) => c.id)
      if (conversationIds.length === 0) {
        setUnreadCount(0)
        return
      }

      // Second: count unread messages from others in those conversations
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .neq('sender_id', user!.id)
        .is('read_at', null)
        .in('conversation_id', conversationIds)

      setUnreadCount(count ?? 0)
    }

    fetchUnreadCount()

    const channel = supabase
      .channel(`unread-messages-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchUnreadCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return (
    <div className="min-h-screen bg-[#FFFBF7] flex justify-center">
      <div className="w-full max-w-[428px] relative flex flex-col min-h-screen">
        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20">
          <Outlet />
        </main>

        {/* Bottom navigation */}
        <nav
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] bg-white border-t border-warm-100 z-50"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-around px-2 h-16">
            {NAV_ITEMS.map(({ to, icon: Icon, label, key }) => {
              const isActive = location.pathname.startsWith(to)
              const isMessages = key === 'messages'

              return (
                <NavLink
                  key={key}
                  to={to}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 relative group"
                >
                  <div className="relative">
                    <Icon
                      size={22}
                      className={cn(
                        'transition-colors duration-150',
                        isActive
                          ? 'text-primary-500'
                          : 'text-warm-400 group-active:text-warm-600'
                      )}
                      strokeWidth={isActive ? 2.5 : 1.8}
                    />
                    {isMessages && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium transition-colors duration-150 leading-none',
                      isActive ? 'text-primary-500' : 'text-warm-400'
                    )}
                  >
                    {label}
                  </span>
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary-500 rounded-full" />
                  )}
                </NavLink>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
