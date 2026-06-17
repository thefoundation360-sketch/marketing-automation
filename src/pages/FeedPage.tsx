import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Share2,
  ChevronDown,
  ChevronUp,
  Send,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase, getAvatarUrl, getGoalPhotoUrl } from '../lib/supabase';
import { FeedActivity, FeedComment } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function activityText(activity: FeedActivity): string {
  switch (activity.type) {
    case 'goal_completed':
      return `completed ${activity.goal?.category ? getCategoryEmoji(activity.goal.category) : '✨'} ${activity.goal?.title ?? 'a goal'}`;
    case 'goal_added':
      return `added ${activity.goal?.category ? getCategoryEmoji(activity.goal.category) : '🌟'} ${activity.goal?.title ?? 'a new goal'} to their bucket list`;
    case 'new_match':
      return activity.content ?? 'made a new match 🤝';
    case 'milestone':
      return activity.content ?? 'reached a milestone 🏆';
    default:
      return activity.content ?? 'did something awesome';
  }
}

const CATEGORY_EMOJIS: Record<string, string> = {
  travel: '✈️',
  adventure: '🏔️',
  food: '🍜',
  creative: '🎨',
  wellness: '🧘',
  philanthropy: '❤️',
  career: '💼',
  relationships: '👥',
};

function getCategoryEmoji(cat: string) {
  return CATEGORY_EMOJIS[cat] ?? '✨';
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FeedCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-gray-200 rounded w-28" />
          <div className="h-2.5 bg-gray-200 rounded w-40" />
        </div>
      </div>
      <div className="h-3 bg-gray-200 rounded w-3/4 mb-3" />
      <div className="h-32 bg-gray-200 rounded-xl mb-3" />
      <div className="flex gap-4">
        <div className="h-3 bg-gray-200 rounded w-12" />
        <div className="h-3 bg-gray-200 rounded w-12" />
        <div className="h-3 bg-gray-200 rounded w-12" />
      </div>
    </div>
  );
}

// ─── Comment Item ─────────────────────────────────────────────────────────────

function CommentItem({ comment }: { comment: FeedComment }) {
  const avatar = getAvatarUrl(comment.user?.avatar_url);
  return (
    <div className="flex gap-2.5 py-2">
      {avatar ? (
        <img
          src={avatar}
          alt={comment.user?.full_name ?? 'User'}
          className="w-7 h-7 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 text-xs font-bold flex-shrink-0">
          {(comment.user?.full_name ?? '?')[0].toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className="text-xs font-semibold text-gray-800 mr-1.5">
          {comment.user?.full_name ?? 'User'}
        </span>
        <span className="text-xs text-gray-600">{comment.content}</span>
        <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(comment.created_at)}</p>
      </div>
    </div>
  );
}

// ─── Feed Card ─────────────────────────────────────────────────────────────────

function FeedCard({
  activity,
  currentUserId,
  onLikeToggle,
  onComment,
}: {
  activity: FeedActivity;
  currentUserId: string;
  onLikeToggle: (id: string, liked: boolean) => Promise<void>;
  onComment: (id: string, content: string) => Promise<void>;
}) {
  const [liked, setLiked] = useState(activity.user_liked ?? false);
  const [likeCount, setLikeCount] = useState(activity.likes_count ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>(
    activity.comments ?? []
  );
  const [commentCount, setCommentCount] = useState(
    activity.comments_count ?? 0
  );
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [togglingLike, setTogglingLike] = useState(false);

  const avatar = getAvatarUrl(activity.user?.avatar_url);
  const photoUrl = getGoalPhotoUrl(activity.goal?.completion_photo_url);

  const handleLike = async () => {
    if (togglingLike) return;
    setTogglingLike(true);
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => c + (newLiked ? 1 : -1));
    try {
      await onLikeToggle(activity.id, newLiked);
    } catch {
      // Revert on error
      setLiked(!newLiked);
      setLikeCount((c) => c + (newLiked ? -1 : 1));
    } finally {
      setTogglingLike(false);
    }
  };

  const handleExpandComments = async () => {
    const next = !showComments;
    setShowComments(next);

    if (next && comments.length <= 2) {
      setLoadingComments(true);
      try {
        const { data, error } = await supabase
          .from('feed_comments')
          .select('*, user:profiles!feed_comments_user_id_fkey(*)')
          .eq('activity_id', activity.id)
          .order('created_at', { ascending: true });
        if (!error) setComments((data as FeedComment[]) ?? []);
      } catch {
        // ignore
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleSendComment = async () => {
    const content = commentText.trim();
    if (!content || sendingComment) return;
    setSendingComment(true);
    setCommentText('');
    try {
      await onComment(activity.id, content);
      setCommentCount((c) => c + 1);
      // Optimistically append comment placeholder — real data fetched on next expand
      const { data } = await supabase
        .from('feed_comments')
        .select('*, user:profiles!feed_comments_user_id_fkey(*)')
        .eq('activity_id', activity.id)
        .order('created_at', { ascending: true });
      if (data) setComments(data as FeedComment[]);
    } catch (err) {
      toast.error('Could not send comment');
      setCommentText(content);
    } finally {
      setSendingComment(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'DreamLink',
        text: `${activity.user?.full_name} just ${activityText(activity)} on DreamLink!`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    }
  };

  const previewComments = comments.slice(-2);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden"
    >
      {/* User header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        {avatar ? (
          <img
            src={avatar}
            alt={activity.user?.full_name ?? 'User'}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-orange-200"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold text-sm">
            {(activity.user?.full_name ?? '?')[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {activity.user?.full_name ?? 'Someone'}
          </p>
          <p className="text-xs text-gray-500">{timeAgo(activity.created_at)}</p>
        </div>
      </div>

      {/* Activity text */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-700 leading-relaxed">
          <span className="font-semibold text-gray-900">
            {activity.user?.full_name ?? 'Someone'}
          </span>{' '}
          {activityText(activity)}
        </p>
      </div>

      {/* Goal details / photo */}
      {activity.goal && (
        <div className="mx-4 mb-3">
          {photoUrl ? (
            <div className="relative rounded-2xl overflow-hidden">
              <img
                src={photoUrl}
                alt={activity.goal.title}
                className="w-full h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white font-semibold text-sm">
                  {getCategoryEmoji(activity.goal.category)} {activity.goal.title}
                </p>
                {activity.goal.completion_note && (
                  <p className="text-white/80 text-xs mt-0.5 line-clamp-2">
                    {activity.goal.completion_note}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3">
              <p className="text-sm font-medium text-gray-800">
                {getCategoryEmoji(activity.goal.category)} {activity.goal.title}
              </p>
              {activity.goal.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {activity.goal.description}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-t border-orange-50">
        {/* Like */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleLike}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
            liked
              ? 'text-red-500 bg-red-50'
              : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <motion.div
            animate={liked ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Heart
              className="w-4 h-4"
              fill={liked ? 'currentColor' : 'none'}
            />
          </motion.div>
          {likeCount > 0 && <span>{likeCount}</span>}
        </motion.button>

        {/* Comment */}
        <button
          onClick={handleExpandComments}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {commentCount > 0 && <span>{commentCount}</span>}
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Expand/collapse comments toggle */}
        {commentCount > 0 && (
          <button
            onClick={handleExpandComments}
            className="ml-auto flex items-center gap-1 text-xs text-orange-500 font-medium px-2 py-1"
          >
            {showComments ? (
              <>
                Hide <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                {commentCount} comment{commentCount !== 1 ? 's' : ''}{' '}
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-orange-50 overflow-hidden"
          >
            <div className="px-4 pb-2">
              {loadingComments ? (
                <div className="py-3 space-y-2">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-2.5 items-center">
                      <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse flex-1" />
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">
                  No comments yet. Be the first!
                </p>
              ) : (
                <>
                  {/* Show last 2 by default, all if expanded */}
                  {previewComments.map((c) => (
                    <CommentItem key={c.id} comment={c} />
                  ))}
                  {comments.length > 2 && !showComments && (
                    <button
                      onClick={handleExpandComments}
                      className="text-xs text-orange-500 font-medium py-1"
                    >
                      See all {comments.length} comments
                    </button>
                  )}
                </>
              )}

              {/* Comment input */}
              <div className="flex items-center gap-2 pt-2 pb-1 border-t border-gray-100 mt-1">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  placeholder="Add a comment..."
                  className="flex-1 text-xs bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent placeholder-gray-400"
                />
                <button
                  onClick={handleSendComment}
                  disabled={!commentText.trim() || sendingComment}
                  className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center disabled:opacity-40 transition-opacity"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<FeedActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch feed ───────────────────────────────────────────────────────────────

  const fetchFeed = useCallback(
    async (silent = false) => {
      if (!user) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);

      try {
        // Get my match user IDs to show their activities too
        const { data: matchData } = await supabase
          .from('matches')
          .select('user1_id, user2_id')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

        const matchUserIds = new Set<string>([user.id]);
        (matchData ?? []).forEach((m) => {
          matchUserIds.add(m.user1_id);
          matchUserIds.add(m.user2_id);
        });

        const { data, error } = await supabase
          .from('feed_activities')
          .select(`
            *,
            user:profiles!feed_activities_user_id_fkey(*),
            goal:bucket_list_goals(*),
            likes:feed_likes(id, user_id),
            comments:feed_comments(
              *,
              user:profiles!feed_comments_user_id_fkey(*)
            )
          `)
          .in('user_id', Array.from(matchUserIds))
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        const enriched: FeedActivity[] = (data ?? []).map((a) => ({
          ...a,
          likes_count: a.likes?.length ?? 0,
          comments_count: a.comments?.length ?? 0,
          user_liked: (a.likes ?? []).some(
            (l: { user_id: string }) => l.user_id === user.id
          ),
          comments: (a.comments ?? []).slice(-2),
        }));

        setActivities(enriched);
      } catch (err) {
        console.error('Error fetching feed:', err);
        if (!silent) toast.error('Could not load feed');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // ── Realtime subscription ────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('feed:new')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feed_activities',
        },
        () => {
          fetchFeed(true);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchFeed]);

  // ── Like toggle ──────────────────────────────────────────────────────────────

  const handleLikeToggle = async (activityId: string, liked: boolean) => {
    if (!user) return;

    if (liked) {
      const { error } = await supabase.from('feed_likes').insert({
        activity_id: activityId,
        user_id: user.id,
      });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('feed_likes')
        .delete()
        .eq('activity_id', activityId)
        .eq('user_id', user.id);
      if (error) throw error;
    }
  };

  // ── Comment ──────────────────────────────────────────────────────────────────

  const handleComment = async (activityId: string, content: string) => {
    if (!user) return;

    const { error } = await supabase.from('feed_comments').insert({
      activity_id: activityId,
      user_id: user.id,
      content,
    });
    if (error) throw error;
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-orange-50 pb-24">
      {/* Header */}
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Feed</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            What your matches are up to
          </p>
        </div>
        <button
          onClick={() => fetchFeed(true)}
          disabled={refreshing}
          className="p-2 rounded-xl hover:bg-orange-50 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw
            className={`w-5 h-5 text-orange-500 ${
              refreshing ? 'animate-spin' : ''
            }`}
          />
        </button>
      </div>

      {/* Pull-to-refresh hint */}
      <div className="text-center py-2">
        <span className="text-[10px] text-gray-400">
          Tap the refresh icon or pull down to update
        </span>
      </div>

      {/* Feed content */}
      <div className="px-4 pt-1 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <FeedCardSkeleton key={i} />
          ))
        ) : activities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="text-5xl mb-4">✨</div>
            <p className="font-semibold text-gray-800 mb-1">
              Your feed is empty
            </p>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              Complete a goal to share with your matches! Your journey starts
              here.
            </p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {activities.map((activity) => (
              <FeedCard
                key={activity.id}
                activity={activity}
                currentUserId={user?.id ?? ''}
                onLikeToggle={handleLikeToggle}
                onComment={handleComment}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
