import { useEffect, useState, useCallback, useRef } from 'react'
import {
  Heart,
  MessageCircle,
  Share2,
  RotateCcw,
  Send,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { cn, formatTimeAgo, GOAL_CATEGORY_ICONS, GOAL_CATEGORY_COLORS } from '@/lib/utils'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import { CardSkeleton } from '@/components/shared/LoadingSkeleton'
import type { FeedItem, Comment } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────────

type FeedTab = 'friends' | 'nearby' | 'all'

interface LikeState {
  liked: boolean
  count: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getActionText(item: FeedItem): string {
  const name = item.profile?.full_name ?? 'Someone'
  switch (item.type) {
    case 'goal_completed':
      return `${name} completed a bucket list goal! 🎉`
    case 'new_match':
      return `${name} got a new match! ❤️`
    case 'joined_group':
      return `${name} joined a new group! 👥`
    case 'milestone':
      return `${name} hit a milestone! 🌟`
    default:
      return item.content
  }
}

// ── Comment Item ──────────────────────────────────────────────────────────────

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="flex items-start gap-2.5 py-2">
      <Avatar
        url={comment.profile?.avatar_url}
        name={comment.profile?.full_name ?? 'User'}
        size="xs"
      />
      <div className="flex-1 min-w-0">
        <div className="bg-warm-50 rounded-2xl px-3 py-2">
          <span className="text-xs font-semibold text-warm-800 mr-1.5">
            {comment.profile?.full_name ?? 'User'}
          </span>
          <span className="text-xs text-warm-700 leading-relaxed">{comment.content}</span>
        </div>
        <span className="text-[10px] text-warm-400 ml-3 mt-0.5 block">
          {formatTimeAgo(comment.created_at)}
        </span>
      </div>
    </div>
  )
}

// ── Feed Card ─────────────────────────────────────────────────────────────────

interface FeedCardProps {
  item: FeedItem
  currentUserId: string
}

function FeedCard({ item, currentUserId }: FeedCardProps) {
  const [likeState, setLikeState] = useState<LikeState>({
    liked: false,
    count: item.likes_count,
  })
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const commentInputRef = useRef<HTMLInputElement>(null)

  // Check if already liked on mount
  useEffect(() => {
    let cancelled = false
    async function checkLike() {
      const { data } = await supabase
        .from('feed_likes')
        .select('id')
        .eq('feed_item_id', item.id)
        .eq('user_id', currentUserId)
        .maybeSingle()
      if (!cancelled) {
        setLikeState(prev => ({ ...prev, liked: Boolean(data) }))
      }
    }
    checkLike()
    return () => { cancelled = true }
  }, [item.id, currentUserId])

  async function handleLike() {
    const wasLiked = likeState.liked
    // Optimistic update
    setLikeState(prev => ({
      liked: !prev.liked,
      count: prev.liked ? prev.count - 1 : prev.count + 1,
    }))

    try {
      if (wasLiked) {
        await supabase
          .from('feed_likes')
          .delete()
          .eq('feed_item_id', item.id)
          .eq('user_id', currentUserId)
      } else {
        await supabase
          .from('feed_likes')
          .upsert(
            { feed_item_id: item.id, user_id: currentUserId },
            { onConflict: 'feed_item_id,user_id' }
          )
      }
    } catch {
      // Revert on failure
      setLikeState({ liked: wasLiked, count: item.likes_count })
      toast.error('Could not update like')
    }
  }

  async function loadComments() {
    setCommentsLoading(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profile:profiles(*)')
        .eq('feed_item_id', item.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments((data as Comment[]) ?? [])
    } catch {
      toast.error('Could not load comments')
    } finally {
      setCommentsLoading(false)
    }
  }

  function toggleComments() {
    const opening = !commentsOpen
    setCommentsOpen(opening)
    if (opening && comments.length === 0) {
      loadComments()
    }
    if (opening) {
      setTimeout(() => commentInputRef.current?.focus(), 150)
    }
  }

  async function handleSubmitComment() {
    const text = commentInput.trim()
    if (!text || submittingComment) return
    setSubmittingComment(true)
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          feed_item_id: item.id,
          user_id: currentUserId,
          content: text,
        })
        .select('*, profile:profiles(*)')
        .single()

      if (error) throw error
      setComments(prev => [...prev, data as Comment])
      setCommentInput('')
    } catch {
      toast.error('Could not post comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  function handleShare() {
    if (navigator.share) {
      navigator
        .share({
          title: 'DreamMatch Activity',
          text: getActionText(item),
          url: window.location.href,
        })
        .catch(() => {/* user dismissed */})
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        toast.success('Link copied!')
      })
    }
  }

  const displayedComments = commentsOpen ? comments : comments.slice(-2)
  const hiddenCount = comments.length - 2

  return (
    <div className="bg-white rounded-2xl border border-warm-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Avatar
          url={item.profile?.avatar_url}
          name={item.profile?.full_name ?? 'User'}
          size="sm"
          showBadge={item.profile?.is_verified}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-warm-900 leading-tight truncate">
            {item.profile?.full_name ?? 'Someone'}
          </p>
          <p className="text-xs text-warm-400">{formatTimeAgo(item.created_at)}</p>
        </div>
      </div>

      {/* Action text */}
      <p className="px-4 pb-3 text-sm text-warm-700 leading-relaxed">
        {getActionText(item)}
      </p>

      {/* Goal inset card */}
      {item.goal && (
        <div className="mx-4 mb-3 border-l-4 border-orange-500 rounded-r-xl bg-orange-50 overflow-hidden">
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base leading-none" aria-hidden>
                {GOAL_CATEGORY_ICONS[item.goal.category]}
              </span>
              <span className="text-sm font-semibold text-warm-900 flex-1 min-w-0 truncate">
                {item.goal.title}
              </span>
            </div>
            <span
              className={cn(
                'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full',
                GOAL_CATEGORY_COLORS[item.goal.category]
              )}
            >
              {item.goal.category}
            </span>
          </div>
          {item.goal.proof_photo_url && (
            <img
              src={item.goal.proof_photo_url}
              alt={`Proof: ${item.goal.title}`}
              className="w-full rounded-b-xl object-cover max-h-64"
            />
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-1 px-3 pb-3 border-t border-warm-50 pt-2">
        {/* Like */}
        <button
          onClick={handleLike}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors active:scale-95',
            likeState.liked
              ? 'text-red-500 bg-red-50'
              : 'text-warm-500 hover:bg-warm-50'
          )}
          aria-label={likeState.liked ? 'Unlike' : 'Like'}
        >
          <Heart
            size={16}
            className={cn(likeState.liked && 'fill-red-500')}
            strokeWidth={likeState.liked ? 0 : 2}
          />
          <span>{likeState.count > 0 ? likeState.count : ''}</span>
        </button>

        {/* Comment */}
        <button
          onClick={toggleComments}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors active:scale-95',
            commentsOpen
              ? 'text-orange-500 bg-orange-50'
              : 'text-warm-500 hover:bg-warm-50'
          )}
          aria-label="Toggle comments"
        >
          <MessageCircle size={16} />
          <span>{item.comments_count > 0 ? item.comments_count : ''}</span>
          {commentsOpen ? (
            <ChevronUp size={12} />
          ) : (
            <ChevronDown size={12} />
          )}
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-warm-500 hover:bg-warm-50 transition-colors active:scale-95 ml-auto"
          aria-label="Share"
        >
          <Share2 size={16} />
        </button>
      </div>

      {/* Comments section */}
      {commentsOpen && (
        <div className="border-t border-warm-100 px-4 pb-3">
          {commentsLoading ? (
            <div className="py-4 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* "View all" link if there are hidden older comments */}
              {!commentsOpen && hiddenCount > 0 && (
                <button
                  onClick={toggleComments}
                  className="text-xs text-orange-500 font-medium py-1"
                >
                  View all {comments.length} comments
                </button>
              )}

              {/* Comment list */}
              <div className="space-y-0">
                {displayedComments.map(c => (
                  <CommentItem key={c.id} comment={c} />
                ))}
              </div>

              {/* View all link when more exist and we're still collapsed (shouldn't happen when open, but guard) */}
              {commentsOpen && hiddenCount > 0 && comments.length === 0 && (
                <button
                  onClick={loadComments}
                  className="text-xs text-orange-500 font-medium py-1"
                >
                  View all {item.comments_count} comments
                </button>
              )}

              {/* Comment input */}
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-warm-50">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={commentInput}
                  onChange={e => setCommentInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmitComment()
                    }
                  }}
                  placeholder="Add a comment…"
                  className="flex-1 text-sm bg-warm-50 rounded-2xl px-3 py-2 outline-none focus:ring-2 focus:ring-orange-200 placeholder-warm-400 text-warm-900"
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentInput.trim() || submittingComment}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center transition-colors flex-shrink-0',
                    commentInput.trim()
                      ? 'bg-orange-500 text-white active:scale-95'
                      : 'bg-warm-100 text-warm-400'
                  )}
                  aria-label="Post comment"
                >
                  {submittingComment ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab Button ────────────────────────────────────────────────────────────────

interface TabButtonProps {
  label: string
  active: boolean
  onClick: () => void
}

function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 py-2 text-sm font-semibold rounded-xl transition-all',
        active
          ? 'bg-orange-500 text-white shadow-sm'
          : 'text-warm-500 hover:text-warm-700'
      )}
    >
      {label}
    </button>
  )
}

// ── Feed Page ─────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const { profile, user } = useAuth()
  const [tab, setTab] = useState<FeedTab>('all')
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Touch-to-refresh state
  const touchStartY = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchFeed = useCallback(
    async (silent = false) => {
      if (!profile) return
      if (!silent) setLoading(true)

      try {
        let query = supabase
          .from('feed_items')
          .select('*, profile:profiles(*), goal:bucket_goals(*)')
          .order('created_at', { ascending: false })
          .limit(40)

        if (tab === 'friends') {
          // Only followed/matched users
          const { data: matchData } = await supabase
            .from('matches')
            .select('user_a_id, user_b_id')
            .or(`user_a_id.eq.${profile.id},user_b_id.eq.${profile.id}`)
            .eq('status', 'matched')

          const friendIds = (matchData ?? []).map(m =>
            m.user_a_id === profile.id ? m.user_b_id : m.user_a_id
          )

          if (friendIds.length === 0) {
            setFeedItems([])
            return
          }

          query = query.in('user_id', friendIds)
        }
        // 'nearby' and 'all' both query everyone for now
        // (nearby would require geospatial filtering via a DB function)

        const { data, error } = await query
        if (error) throw error
        setFeedItems((data as FeedItem[]) ?? [])
      } catch {
        toast.error('Could not load feed')
        setFeedItems([])
      } finally {
        setLoading(false)
      }
    },
    [profile, tab]
  )

  useEffect(() => {
    fetchFeed()
  }, [fetchFeed])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchFeed(true)
    setTimeout(() => setRefreshing(false), 600)
  }

  // Simulated pull-to-refresh via touch events
  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const diff = e.changedTouches[0].clientY - touchStartY.current
    const scrollTop = containerRef.current?.scrollTop ?? 0
    if (diff > 80 && scrollTop === 0 && !refreshing) {
      handleRefresh()
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#FFFBF7]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FFFBF7] border-b border-warm-100 px-5 pt-safe-top pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-warm-900">Activity</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-9 h-9 rounded-full bg-warm-100 flex items-center justify-center active:bg-warm-200 transition-colors"
            aria-label="Refresh feed"
          >
            <RotateCcw
              size={17}
              className={cn(
                'text-warm-600 transition-transform',
                refreshing && 'animate-spin'
              )}
            />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-warm-100 rounded-xl p-1">
          <TabButton
            label="Friends"
            active={tab === 'friends'}
            onClick={() => setTab('friends')}
          />
          <TabButton
            label="Nearby"
            active={tab === 'nearby'}
            onClick={() => setTab('nearby')}
          />
          <TabButton
            label="All"
            active={tab === 'all'}
            onClick={() => setTab('all')}
          />
        </div>
      </div>

      {/* Feed content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull-to-refresh indicator */}
        {refreshing && (
          <div className="flex items-center justify-center py-3 mb-2">
            <div className="flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm border border-warm-100">
              <div className="w-3.5 h-3.5 border-2 border-orange-300 border-t-orange-500 rounded-full animate-spin" />
              <span className="text-xs font-medium text-warm-600">Refreshing…</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map(i => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : feedItems.length === 0 ? (
          <EmptyState
            icon="🌟"
            title="No activity yet. Complete a goal to share!"
            description="Be the first to share an achievement with your friends."
          />
        ) : (
          <div className="space-y-4 pb-6">
            {feedItems.map(item => (
              <FeedCard
                key={item.id}
                item={item}
                currentUserId={user?.id ?? profile?.id ?? ''}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
