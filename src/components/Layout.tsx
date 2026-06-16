import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Compass, Heart, Home, Star, User, Bell, X, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Notification } from '../types';
import { formatDistanceToNow } from 'date-fns';

const NAV_ITEMS = [
  { path: '/discover', icon: Compass, label: 'Discover' },
  { path: '/matches', icon: Heart, label: 'Matches' },
  { path: '/feed', icon: Home, label: 'Feed' },
  { path: '/bucket-list', icon: Star, label: 'Goals' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const PATH_TITLES: Record<string, string> = {
  '/discover': 'Discover',
  '/matches': 'Matches',
  '/feed': 'Feed',
  '/bucket-list': 'My Goals',
  '/profile': 'Profile',
  '/pricing': 'Upgrade',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
};

function getPageTitle(pathname: string): string {
  for (const [path, title] of Object.entries(PATH_TITLES)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return title;
    }
  }
  return 'DreamLink';
}

function getNotificationIcon(type: Notification['type']): string {
  const icons: Record<Notification['type'], string> = {
    new_match: '💞',
    message: '💬',
    goal_completed: '🏆',
    nearby_goal: '📍',
    weekly_nudge: '✨',
    goal_liked: '❤️',
    goal_commented: '💭',
    group_invite: '👥',
  };
  return icons[type] ?? '🔔';
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const pageTitle = getPageTitle(location.pathname);

  // Fetch notifications from Supabase
  useEffect(() => {
    if (!user || isGuest) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
      }
    };

    fetchNotifications();

    // Subscribe to real-time notification inserts
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 10));
          setUnreadCount((c) => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isGuest]);

  // Close panel when clicking outside
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen]);

  const handleBellClick = () => {
    setPanelOpen((prev) => !prev);
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const markOneRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 max-w-md mx-auto relative">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo mark + title */}
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none">🌟</span>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">{pageTitle}</h1>
          </div>

          {/* Bell */}
          <button
            onClick={handleBellClick}
            className="relative p-2 rounded-full hover:bg-orange-50 active:bg-orange-100 transition-colors"
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          >
            <Bell className="w-5 h-5 text-gray-600" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center leading-none"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Notification Panel */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              ref={panelRef}
              key="notif-panel"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="absolute top-full left-0 right-0 z-50 bg-white border-b border-gray-100 shadow-xl rounded-b-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-900 text-sm">Notifications</span>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-orange-500 font-medium hover:text-orange-600 flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setPanelOpen(false)}
                    className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
                    aria-label="Close notifications"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-80">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <span className="text-3xl mb-2">🔔</span>
                    <p className="text-sm text-gray-500">No notifications yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      We'll let you know when something happens!
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => markOneRead(notif.id)}
                      className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-orange-50 active:bg-orange-100 transition-colors border-b border-gray-50 last:border-0 ${
                        !notif.is_read ? 'bg-orange-50/60' : ''
                      }`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">
                        {getNotificationIcon(notif.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`text-sm leading-snug ${
                              !notif.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                            }`}
                          >
                            {notif.title}
                          </p>
                          {!notif.is_read && (
                            <span className="shrink-0 w-2 h-2 rounded-full bg-orange-500 mt-1.5" />
                          )}
                        </div>
                        {notif.body && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-white border-t border-gray-100 shadow-lg">
        <div className="flex items-stretch">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => {
            const isActive =
              location.pathname === path ||
              location.pathname.startsWith(path + '/');

            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex-1 flex flex-col items-center justify-center pt-2 pb-3 gap-0.5 relative transition-colors ${
                  isActive ? 'text-orange-500' : 'text-gray-400 hover:text-gray-600'
                }`}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Icon
                    className="w-5 h-5"
                    strokeWidth={isActive ? 2.5 : 1.75}
                  />
                </motion.div>
                <span className={`text-[10px] leading-none font-medium ${isActive ? 'text-orange-500' : 'text-gray-400'}`}>
                  {label}
                </span>

                {/* Active dot indicator */}
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      key="dot"
                      layoutId="nav-dot"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute bottom-1 w-1 h-1 rounded-full bg-orange-500"
                    />
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
