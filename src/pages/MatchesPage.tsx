import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Heart, MessageCircle, Lock, RefreshCw, ChevronRight, Flag, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';
import { supabase, getAvatarUrl } from '../lib/supabase';
import { Match, TIER_LIMITS } from '../types';

// ─── helpers ─────────────────────────────────────────────────────────────────

function getInitials(name?: string | null) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function matchColor(pct: number) {
  if (pct >= 70) return 'bg-green-500';
  if (pct >= 40) return 'bg-orange-500';
  return 'bg-gray-400';
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── types ───────────────────────────────────────────────────────────────────

interface LikedYouUser {
  swipe_id: string;
  swiper_id: string;
  created_at: string;
  profile: {
    id: string;
    full_name?: string;
    avatar_url?: string;
    age?: number;
    location?: string;
  };
  match_percentage?: number;
}

// ─── celebration overlay ─────────────────────────────────────────────────────

function NewMatchCelebration({
  match,
  onDismiss,
}: {
  match: Match;
  onDismiss: () => void;
}) {
  const avatarUrl = getAvatarUrl(match.other_user?.avatar_url);
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-orange-600 to-rose-600 px-8 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-2 w-2 rounded-full"
          style={{ backgroundColor: ['#fbbf24', '#f97316', '#fb7185', '#c084fc'][i % 4] }}
          initial={{ x: 0, y: 0, scale: 0 }}
          animate={{
            x: (Math.random() - 0.5) * 280,
            y: (Math.random() - 0.5) * 380,
            scale: [0, 1.4, 0],
          }}
          transition={{ duration: 1.1, delay: i * 0.07 }}
        />
      ))}

      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6 text-4xl font-black"
      >
        New Match! 🎉
      </motion.h2>

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
        className="mb-4 h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-xl"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={match.other_user?.full_name ?? ''}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-orange-300 text-2xl font-bold text-white">
            {getInitials(match.other_user?.full_name)}
          </div>
        )}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-1 text-xl font-bold"
      >
        {match.other_user?.full_name}
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mb-8 text-sm text-white/80"
      >
        {match.match_percentage}% dream match
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        onClick={onDismiss}
        className="mb-3 w-full max-w-xs rounded-2xl bg-white py-4 text-center font-bold text-orange-600 shadow-lg transition active:scale-95"
      >
        Send a Message
      </motion.button>
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75 }}
        onClick={onDismiss}
        className="text-sm text-white/70"
      >
        View All Matches
      </motion.button>
    </motion.div>
  );
}

// ─── match row ────────────────────────────────────────────────────────────────

interface ActionMenuState {
  matchId: string;
  otherUserId: string;
  x: number;
  y: number;
}

function MatchRow({
  match,
  onNavigate,
  onBlock,
  onReport,
}: {
  match: Match;
  onNavigate: (matchId: string) => void;
  onBlock: (matchId: string, otherUserId: string) => void;
  onReport: (matchId: string, otherUserId: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [dragX, setDragX] = useState(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarUrl = getAvatarUrl(match.other_user?.avatar_url);
  const pct = match.match_percentage;
  const hasUnread = (match.unread_count ?? 0) > 0;

  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -80) {
      setShowActions(true);
    }
    setDragX(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* swipe-left action hint */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-2 bg-red-50 px-4">
        <Ban className="h-5 w-5 text-red-400" />
        <Flag className="h-5 w-5 text-orange-400" />
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        dragElastic={0.2}
        onDrag={(_, info) => setDragX(info.offset.x)}
        onDragEnd={handleDragEnd}
        animate={{ x: dragX === 0 ? 0 : dragX }}
        className="relative flex cursor-pointer items-center gap-3 bg-white px-4 py-3.5 transition-colors active:bg-orange-50"
        onClick={() => {
          if (!showActions) onNavigate(match.id);
        }}
        onPointerDown={startLongPress}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
      >
        {/* avatar */}
        <div className="relative shrink-0">
          <div className="h-14 w-14 overflow-hidden rounded-full">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={match.other_user?.full_name ?? ''}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-400 to-orange-600 text-lg font-bold text-white">
                {getInitials(match.other_user?.full_name)}
              </div>
            )}
          </div>
          {/* match % badge */}
          <div
            className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white shadow ${matchColor(pct)}`}
          >
            {pct}
          </div>
        </div>

        {/* text */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className={`font-bold text-gray-900 ${hasUnread ? 'text-orange-600' : ''}`}>
              {match.other_user?.full_name ?? 'Unknown'}
            </span>
            <span className="text-xs text-gray-400">
              {timeAgo(match.last_message?.created_at ?? match.created_at)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <p
              className={`truncate text-sm ${
                hasUnread ? 'font-semibold text-gray-800' : 'text-gray-500'
              }`}
            >
              {match.last_message?.content ?? (
                <span className="italic text-orange-400">Say hello!</span>
              )}
            </p>
            {hasUnread && (
              <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                {match.unread_count}
              </span>
            )}
          </div>
          {(match.shared_goals?.length ?? 0) > 0 && (
            <p className="mt-0.5 truncate text-xs text-orange-500">
              {match.shared_goals!.length} shared dream
              {match.shared_goals!.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
      </motion.div>

      {/* action sheet */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 px-4 pb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowActions(false)}
          >
            <motion.div
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-gray-100 px-4 py-4 text-center text-sm font-semibold text-gray-500">
                {match.other_user?.full_name}
              </div>
              <button
                className="flex w-full items-center gap-3 px-6 py-4 text-left text-red-500 transition hover:bg-red-50"
                onClick={() => {
                  setShowActions(false);
                  onBlock(match.id, match.other_user?.id ?? '');
                }}
              >
                <Ban className="h-5 w-5" />
                <span className="font-semibold">Block User</span>
              </button>
              <button
                className="flex w-full items-center gap-3 border-t border-gray-100 px-6 py-4 text-left text-orange-500 transition hover:bg-orange-50"
                onClick={() => {
                  setShowActions(false);
                  onReport(match.id, match.other_user?.id ?? '');
                }}
              >
                <Flag className="h-5 w-5" />
                <span className="font-semibold">Report User</span>
              </button>
              <button
                className="w-full border-t border-gray-200 py-4 text-center font-semibold text-gray-500 transition hover:bg-gray-50"
                onClick={() => setShowActions(false)}
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── liked-you card (premium gate) ───────────────────────────────────────────

function LikedYouCard({
  item,
  isBlurred,
  onUpgrade,
}: {
  item: LikedYouUser;
  isBlurred: boolean;
  onUpgrade: () => void;
}) {
  const avatarUrl = getAvatarUrl(item.profile.avatar_url);
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className={`${isBlurred ? 'blur-md' : ''} transition-all`}>
        <div className="aspect-square overflow-hidden">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-300 to-orange-500 text-3xl font-bold text-white">
              {getInitials(item.profile.full_name)}
            </div>
          )}
        </div>
        <div className="p-2">
          <p className="truncate text-sm font-bold text-gray-900">
            {item.profile.full_name ?? 'Someone'}
          </p>
          <p className="text-xs text-gray-400">{timeAgo(item.created_at)}</p>
        </div>
      </div>

      {isBlurred && (
        <button
          onClick={onUpgrade}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 text-white"
        >
          <Lock className="mb-1 h-6 w-6" />
          <span className="text-xs font-bold">Unlock</span>
        </button>
      )}
    </div>
  );
}

// ─── empty states ─────────────────────────────────────────────────────────────

function MatchesEmpty() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-4 text-6xl">💫</div>
      <h3 className="mb-2 text-xl font-bold text-gray-900">No matches yet</h3>
      <p className="mb-6 text-gray-500">Keep swiping to find your dream partners!</p>
      <button
        onClick={() => navigate('/discover')}
        className="flex items-center gap-2 rounded-2xl bg-orange-500 px-8 py-3.5 font-bold text-white shadow-lg transition active:scale-95"
      >
        <Heart className="h-4 w-4" fill="white" />
        Start Swiping
      </button>
    </div>
  );
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function MatchSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 px-4 py-3.5">
      <div className="h-14 w-14 rounded-full bg-gray-200" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="h-3 w-48 rounded bg-gray-100" />
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function MatchesPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'matches' | 'likes'>('matches');
  const [matches, setMatches] = useState<Match[]>([]);
  const [likedYou, setLikedYou] = useState<LikedYouUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [celebrationMatch, setCelebrationMatch] = useState<Match | null>(null);

  const tier = profile?.subscription_tier ?? 'free';
  const canSeeLikes = TIER_LIMITS[tier].can_see_who_liked;

  const channelRef = useRef<RealtimeChannel | null>(null);

  // ── fetch matches ──────────────────────────────────────────────────────────
  const fetchMatches = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(
          `
          *,
          user1:profiles!matches_user1_id_fkey(*),
          user2:profiles!matches_user2_id_fkey(*),
          last_message:messages(id, content, created_at, sender_id, is_read)
        `
        )
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enriched: Match[] = (data ?? []).map((row: Record<string, unknown>) => {
        const isUser1 = row.user1_id === user.id;
        const otherUser = (isUser1 ? row.user2 : row.user1) as Match['other_user'];

        // last_message might come as array (join); take first
        const msgArr = (row.last_message as { content: string; created_at: string; sender_id: string; is_read: boolean }[] | null) ?? [];
        const lastMsg = Array.isArray(msgArr) ? msgArr[0] : msgArr;

        const unreadCount = Array.isArray(msgArr)
          ? msgArr.filter(
              (m: { is_read: boolean; sender_id: string }) =>
                !m.is_read && m.sender_id !== user.id
            ).length
          : 0;

        return {
          id: row.id as string,
          user1_id: row.user1_id as string,
          user2_id: row.user2_id as string,
          match_percentage: row.match_percentage as number,
          shared_goals: (row.shared_goals as string[]) ?? [],
          shared_goal_ids: (row.shared_goal_ids as string[]) ?? [],
          created_at: row.created_at as string,
          other_user: otherUser,
          last_message: lastMsg ?? undefined,
          unread_count: unreadCount,
        };
      });

      // Sort: unread first, then by last message time
      enriched.sort((a, b) => {
        if ((b.unread_count ?? 0) !== (a.unread_count ?? 0))
          return (b.unread_count ?? 0) - (a.unread_count ?? 0);
        const aTime = a.last_message?.created_at ?? a.created_at;
        const bTime = b.last_message?.created_at ?? b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setMatches(enriched);
    } catch (err) {
      console.error('Error fetching matches:', err);
      toast.error('Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ── fetch who liked you ────────────────────────────────────────────────────
  const fetchLikedYou = useCallback(async () => {
    if (!user) return;
    setLoadingLikes(true);
    try {
      // People who swiped 'like' on me, but I haven't matched with yet
      const matchedUserIds = matches.map((m) =>
        m.user1_id === user.id ? m.user2_id : m.user1_id
      );

      let query = supabase
        .from('swipes')
        .select('id, swiper_id, created_at, profile:profiles!swipes_swiper_id_fkey(*)')
        .eq('swiped_id', user.id)
        .eq('action', 'like')
        .order('created_at', { ascending: false });

      if (matchedUserIds.length > 0) {
        query = query.not('swiper_id', 'in', `(${matchedUserIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const items: LikedYouUser[] = (data ?? []).map(
        (row: Record<string, unknown>) => ({
          swipe_id: row.id as string,
          swiper_id: row.swiper_id as string,
          created_at: row.created_at as string,
          profile: row.profile as LikedYouUser['profile'],
        })
      );

      setLikedYou(items);
    } catch (err) {
      console.error('Error fetching likes:', err);
    } finally {
      setLoadingLikes(false);
    }
  }, [user, matches]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    if (activeTab === 'likes') fetchLikedYou();
  }, [activeTab, fetchLikedYou]);

  // ── realtime subscription for new matches ──────────────────────────────────
  useEffect(() => {
    if (!user) return;

    channelRef.current = supabase
      .channel(`matches-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `user1_id=eq.${user.id}`,
        },
        async (payload) => {
          // Fetch full match data
          const newMatchId = (payload.new as { id: string }).id;
          const { data } = await supabase
            .from('matches')
            .select('*, other_user:profiles!matches_user2_id_fkey(*)')
            .eq('id', newMatchId)
            .single();

          if (data) {
            const match = data as Match;
            setCelebrationMatch(match);
            await fetchMatches();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `user2_id=eq.${user.id}`,
        },
        async (payload) => {
          const newMatchId = (payload.new as { id: string }).id;
          const { data } = await supabase
            .from('matches')
            .select('*, other_user:profiles!matches_user1_id_fkey(*)')
            .eq('id', newMatchId)
            .single();

          if (data) {
            const match = data as Match;
            setCelebrationMatch(match);
            await fetchMatches();
          }
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [user, fetchMatches]);

  // ── block / report ─────────────────────────────────────────────────────────
  const handleBlock = async (matchId: string, otherUserId: string) => {
    if (!user) return;
    try {
      // Insert block record
      await supabase.from('blocks').insert({
        blocker_id: user.id,
        blocked_id: otherUserId,
      });
      // Remove match
      await supabase.from('matches').delete().eq('id', matchId);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      toast.success('User blocked');
    } catch {
      toast.error('Failed to block user');
    }
  };

  const handleReport = async (_matchId: string, otherUserId: string) => {
    if (!user) return;
    try {
      await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_id: otherUserId,
        reason: 'Reported from matches page',
      });
      toast.success('Report submitted. Thank you.');
    } catch {
      toast.error('Failed to submit report');
    }
  };

  const handleCelebrationDismiss = () => {
    const m = celebrationMatch;
    setCelebrationMatch(null);
    if (m) navigate(`/messages/${m.id}`);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-orange-50">
      {/* header */}
      <header className="bg-white px-4 pb-0 pt-safe-top pt-4 shadow-sm">
        <h1 className="mb-3 text-2xl font-black text-gray-900">
          Dream<span className="text-orange-500">Link</span>
        </h1>

        {/* tabs */}
        <div className="flex">
          <button
            onClick={() => setActiveTab('matches')}
            className={`relative flex flex-1 items-center justify-center gap-1.5 pb-3 text-sm font-bold transition ${
              activeTab === 'matches'
                ? 'text-orange-500'
                : 'text-gray-400'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            Matches
            {matches.some((m) => (m.unread_count ?? 0) > 0) && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-black text-white">
                {matches.reduce((a, m) => a + (m.unread_count ?? 0), 0)}
              </span>
            )}
            {activeTab === 'matches' && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('likes')}
            className={`relative flex flex-1 items-center justify-center gap-1.5 pb-3 text-sm font-bold transition ${
              activeTab === 'likes'
                ? 'text-orange-500'
                : 'text-gray-400'
            }`}
          >
            <Heart className="h-4 w-4" />
            Likes You
            {!canSeeLikes && <Lock className="h-3 w-3 text-gray-300" />}
            {activeTab === 'likes' && (
              <motion.div
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
              />
            )}
          </button>
        </div>
      </header>

      {/* content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'matches' ? (
            <motion.div
              key="matches"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              {loading ? (
                <div className="divide-y divide-gray-100 bg-white">
                  {[...Array(5)].map((_, i) => <MatchSkeleton key={i} />)}
                </div>
              ) : matches.length === 0 ? (
                <MatchesEmpty />
              ) : (
                <div className="divide-y divide-gray-100 bg-white">
                  {matches.map((match) => (
                    <MatchRow
                      key={match.id}
                      match={match}
                      onNavigate={(id) => navigate(`/messages/${id}`)}
                      onBlock={handleBlock}
                      onReport={handleReport}
                    />
                  ))}
                </div>
              )}

              {/* refresh button */}
              {!loading && matches.length > 0 && (
                <button
                  onClick={fetchMatches}
                  className="mx-auto mt-4 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-500 shadow-sm transition active:scale-95"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="likes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.18 }}
            >
              {/* upgrade banner for free users */}
              {!canSeeLikes && (
                <div className="mx-4 mt-4 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 p-5 text-white shadow-lg">
                  <div className="mb-1 flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    <span className="font-bold">Premium Feature</span>
                  </div>
                  <p className="mb-4 text-sm text-white/80">
                    Upgrade to see everyone who liked your profile and match instantly.
                  </p>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="w-full rounded-xl bg-white py-3 text-center font-bold text-orange-600 transition active:scale-95"
                  >
                    Unlock Likes You — Upgrade
                  </button>
                </div>
              )}

              {loadingLikes ? (
                <div className="grid grid-cols-2 gap-3 p-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-2xl bg-gray-200" />
                  ))}
                </div>
              ) : likedYou.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
                  <div className="mb-4 text-6xl">🔥</div>
                  <h3 className="mb-2 text-xl font-bold text-gray-900">No likes yet</h3>
                  <p className="text-gray-500">
                    Keep completing your profile to attract more people.
                  </p>
                </div>
              ) : (
                <>
                  <p className="px-4 pb-2 pt-4 text-sm font-semibold text-gray-500">
                    {likedYou.length} {likedYou.length === 1 ? 'person' : 'people'} liked you
                  </p>
                  <div className="grid grid-cols-2 gap-3 px-4 pb-6">
                    {likedYou.map((item, idx) => (
                      <LikedYouCard
                        key={item.swipe_id}
                        item={item}
                        isBlurred={!canSeeLikes && idx > 0}
                        onUpgrade={() => navigate('/pricing')}
                      />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* celebration overlay */}
      <AnimatePresence>
        {celebrationMatch && (
          <NewMatchCelebration
            match={celebrationMatch}
            onDismiss={handleCelebrationDismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
