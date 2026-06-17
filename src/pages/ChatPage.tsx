import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, CheckCheck, Check, Crown, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase, getAvatarUrl } from '../lib/supabase';
import { Message, Match, TIER_LIMITS } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return 'yesterday';
  return new Date(dateStr).toLocaleDateString();
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[false, true, false].map((right, i) => (
        <div key={i} className={`flex ${right ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`h-10 rounded-2xl animate-pulse bg-gray-200 ${
              right ? 'w-48' : 'w-36'
            }`}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Upgrade Prompt ───────────────────────────────────────────────────────────

function UpgradePrompt({ onDismiss }: { onDismiss: () => void }) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="mx-4 mb-3 p-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg"
    >
      <div className="flex items-start gap-3">
        <Crown className="w-5 h-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Daily message limit reached</p>
          <p className="text-xs text-orange-100 mt-0.5">
            Free accounts can send 10 messages/day. Upgrade for unlimited messaging.
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => navigate('/pricing')}
          className="flex-1 bg-white text-orange-600 text-sm font-semibold py-1.5 rounded-xl hover:bg-orange-50 transition-colors"
        >
          Upgrade Now
        </button>
        <button
          onClick={onDismiss}
          className="px-3 text-orange-100 text-sm hover:text-white transition-colors"
        >
          Later
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [match, setMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMatch, setLoadingMatch] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const isFree = profile?.subscription_tier === 'free';
  const messagesUsed = profile?.messages_today ?? 0;
  const messageLimit = TIER_LIMITS.free.messages_per_day;

  // ── Fetch match ──────────────────────────────────────────────────────────────

  const fetchMatch = useCallback(async () => {
    if (!matchId || !user) return;
    setLoadingMatch(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          user1:profiles!matches_user1_id_fkey(*),
          user2:profiles!matches_user2_id_fkey(*)
        `)
        .eq('id', matchId)
        .single();

      if (error) throw error;

      const otherUser =
        data.user1_id === user.id ? data.user2 : data.user1;

      setMatch({ ...data, other_user: otherUser });
    } catch (err) {
      console.error('Error fetching match:', err);
      toast.error('Could not load conversation');
    } finally {
      setLoadingMatch(false);
    }
  }, [matchId, user]);

  // ── Fetch messages ───────────────────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    if (!matchId || !user) return;
    setLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data as Message[]) ?? []);

      // Mark received messages as read
      const unreadIds = (data as Message[])
        .filter((m) => m.receiver_id === user.id && !m.is_read)
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .in('id', unreadIds);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [matchId, user]);

  // ── Realtime subscription ────────────────────────────────────────────────────

  useEffect(() => {
    if (!matchId || !user) return;

    const channel = supabase
      .channel(`chat:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Auto-mark as read if we're the receiver
          if (newMsg.receiver_id === user.id) {
            await supabase
              .from('messages')
              .update({ is_read: true })
              .eq('id', newMsg.id);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, user]);

  // ── Initial data load ────────────────────────────────────────────────────────

  useEffect(() => {
    fetchMatch();
    fetchMessages();
  }, [fetchMatch, fetchMessages]);

  // ── Scroll to bottom ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!loadingMessages) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loadingMessages]);

  // ── Send message ─────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const content = inputText.trim();
    if (!content || !user || !match || sending) return;

    if (isFree && messagesUsed >= messageLimit) {
      setShowUpgrade(true);
      return;
    }

    setSending(true);
    setInputText('');

    try {
      const otherId = match.other_user?.id;
      if (!otherId) throw new Error('No other user');

      const { error } = await supabase.from('messages').insert({
        match_id: matchId,
        sender_id: user.id,
        receiver_id: otherId,
        content,
        is_read: false,
        is_request: false,
      });

      if (error) throw error;

      // Increment messages_today counter
      await supabase
        .from('profiles')
        .update({ messages_today: messagesUsed + 1 })
        .eq('id', user.id);
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Failed to send message');
      setInputText(content); // Restore on failure
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Shared goals ─────────────────────────────────────────────────────────────

  const sharedGoals = match?.shared_goals ?? [];
  const sharedGoalText =
    sharedGoals.length > 0
      ? sharedGoals.slice(0, 2).join(' and ')
      : 'similar bucket list goals';

  // ── Render ───────────────────────────────────────────────────────────────────

  const otherUser = match?.other_user;
  const avatarUrl = getAvatarUrl(otherUser?.avatar_url);

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] bg-orange-50">
      {/* Header */}
      <div className="flex-none bg-white border-b border-orange-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 -ml-1.5 rounded-xl hover:bg-orange-50 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        {loadingMatch ? (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
          </div>
        ) : (
          <Link
            to={otherUser ? `/u/${otherUser.username}` : '#'}
            className="flex items-center gap-3 flex-1 min-w-0"
          >
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={otherUser?.full_name ?? 'User'}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-orange-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-semibold text-sm">
                  {(otherUser?.full_name ?? '?')[0].toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate">
                {otherUser?.full_name ?? 'Unknown'}
              </p>
              <p className="text-xs text-gray-500 truncate">View profile</p>
            </div>
          </Link>
        )}

        {match && (
          <div className="flex-shrink-0 flex items-center gap-1 bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full">
            <Star className="w-3 h-3 fill-orange-500 text-orange-500" />
            <span className="text-xs font-bold">{match.match_percentage}%</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {loadingMessages ? (
          <MessageSkeleton />
        ) : messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center px-6 pb-8"
          >
            <div className="text-5xl mb-4">👋</div>
            <p className="font-semibold text-gray-800 mb-1">Say hi!</p>
            <p className="text-sm text-gray-500 leading-relaxed">
              You matched because you both want to{' '}
              <span className="text-orange-600 font-medium">{sharedGoalText}</span>.
              Send the first message!
            </p>
          </motion.div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => {
                const isSent = msg.sender_id === user?.id;
                const showTime =
                  idx === 0 ||
                  new Date(msg.created_at).getTime() -
                    new Date(messages[idx - 1].created_at).getTime() >
                    300_000; // 5 min gap

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {showTime && (
                      <p className="text-center text-xs text-gray-400 my-2">
                        {timeAgo(msg.created_at)}
                      </p>
                    )}
                    <div
                      className={`flex ${
                        isSent ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isSent
                            ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-br-sm shadow-orange-200 shadow-md'
                            : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                        }`}
                      >
                        <p>{msg.content}</p>
                        {isSent && (
                          <div className="flex justify-end mt-1">
                            {msg.is_read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-orange-100" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-orange-200" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Upgrade prompt */}
      <AnimatePresence>
        {showUpgrade && (
          <UpgradePrompt onDismiss={() => setShowUpgrade(false)} />
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="flex-none bg-white border-t border-orange-100 px-4 py-3 pb-safe">
        {isFree && (
          <div className="text-xs text-gray-400 mb-2 text-right">
            {messagesUsed}/{messageLimit} messages today
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all disabled:opacity-50"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!inputText.trim() || sending}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-200 disabled:opacity-40 disabled:shadow-none transition-all"
            aria-label="Send"
          >
            <Send className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
