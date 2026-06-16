import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MessageCircle,
  Target,
  Calendar,
  Users,
  Plus,
  Send,
  Check,
  CheckCircle2,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { format, isPast, differenceInDays, differenceInHours } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase, getAvatarUrl } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Group,
  GroupMessage,
  GroupMember,
  GroupGoal,
  GroupEvent,
  Match,
  Profile,
} from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';

type Tab = 'chat' | 'goals' | 'events' | 'members';

const TABS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: 'chat', label: 'Chat', Icon: MessageCircle },
  { id: 'goals', label: 'Goals', Icon: Target },
  { id: 'events', label: 'Events', Icon: Calendar },
  { id: 'members', label: 'Members', Icon: Users },
];

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function InitialsAvatar({ name, className = 'w-10 h-10' }: { name?: string | null; className?: string }) {
  return (
    <div
      className={`${className} rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-semibold text-sm shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
}

function CountdownBadge({ eventDate }: { eventDate: string }) {
  const date = new Date(eventDate);
  if (isPast(date)) return null;
  const days = differenceInDays(date, new Date());
  const hours = differenceInHours(date, new Date());
  const label =
    days > 0 ? `in ${days} day${days === 1 ? '' : 's'}` : `in ${hours} hour${hours === 1 ? '' : 's'}`;
  return (
    <span className="inline-block bg-orange-100 text-orange-600 text-xs font-semibold px-2.5 py-0.5 rounded-full shrink-0">
      {label}
    </span>
  );
}

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  // Chat
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Goals
  const [goals, setGoals] = useState<GroupGoal[]>([]);
  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [addingGoal, setAddingGoal] = useState(false);

  // Events
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [addingEvent, setAddingEvent] = useState(false);

  // Members
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from('group_messages')
      .select('*, sender:profiles(id, full_name, avatar_url, username)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(50);
    if (data) setMessages(data as unknown as GroupMessage[]);
  }, [groupId]);

  const fetchGoals = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from('group_goals')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    if (data) setGoals(data as GroupGoal[]);
  }, [groupId]);

  const fetchEvents = useCallback(async () => {
    if (!groupId) return;
    const { data } = await supabase
      .from('group_events')
      .select('*, creator:profiles(id, full_name)')
      .eq('group_id', groupId)
      .order('event_date', { ascending: true });
    if (data) setEvents(data as unknown as GroupEvent[]);
  }, [groupId]);

  const fetchMembers = useCallback(async () => {
    if (!groupId || !user) return;
    const { data } = await supabase
      .from('group_members')
      .select('*, user:profiles(id, full_name, avatar_url, username, is_verified)')
      .eq('group_id', groupId)
      .order('joined_at', { ascending: true });
    if (data) {
      const memberList = data as unknown as GroupMember[];
      setMembers(memberList);
      const myMembership = memberList.find((m) => m.user_id === user.id);
      setUserRole(myMembership?.role ?? null);
    }
  }, [groupId, user]);

  const fetchGroup = useCallback(async () => {
    if (!groupId || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*, creator:profiles!groups_creator_id_fkey(*), members:group_members(*, user:profiles(*))')
        .eq('id', groupId)
        .single();
      if (error || !data) {
        setGroup(null);
        return;
      }
      setGroup(data as unknown as Group);
      const memberList = ((data as any).members ?? []) as GroupMember[];
      setMembers(memberList);
      const myMembership = memberList.find((m: GroupMember) => m.user_id === user.id);
      setUserRole(myMembership?.role ?? null);
    } finally {
      setLoading(false);
    }
  }, [groupId, user]);

  // Initial data load
  useEffect(() => {
    if (!groupId || !user) return;
    fetchGroup();
    fetchMessages();
    fetchGoals();
    fetchEvents();
  }, [groupId, user, fetchGroup, fetchMessages, fetchGoals, fetchEvents]);

  // Real-time chat subscription
  useEffect(() => {
    if (!groupId || !user) return;
    const channel = supabase
      .channel('group-messages-' + groupId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: 'group_id=eq.' + groupId,
        },
        async (payload) => {
          const newMsg = payload.new as GroupMessage;
          if (newMsg.sender_id === user.id) return;
          const { data: senderData } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, username')
            .eq('id', newMsg.sender_id)
            .single();
          setMessages((prev) => [...prev, { ...newMsg, sender: senderData as Profile }]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    if (!messageInput.trim() || !user || !groupId || sending) return;
    setSending(true);
    const content = messageInput.trim();
    setMessageInput('');

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMsg: GroupMessage = {
      id: optimisticId,
      group_id: groupId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      sender: profile as Profile,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const { data, error } = await supabase
        .from('group_messages')
        .insert({ group_id: groupId, sender_id: user.id, content })
        .select()
        .single();
      if (error) throw error;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId ? ({ ...data, sender: profile } as unknown as GroupMessage) : m
        )
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setMessageInput(content);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const toggleGoalComplete = async (goal: GroupGoal) => {
    const newCompleted = !goal.is_completed;
    const newCompletedAt = newCompleted ? new Date().toISOString() : undefined;
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id ? { ...g, is_completed: newCompleted, completed_at: newCompletedAt } : g
      )
    );
    const { error } = await supabase
      .from('group_goals')
      .update({ is_completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null })
      .eq('id', goal.id);
    if (error) {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goal.id ? { ...g, is_completed: goal.is_completed, completed_at: goal.completed_at } : g
        )
      );
      toast.error('Failed to update goal');
    }
  };

  const addGoal = async () => {
    if (!goalTitle.trim() || !groupId || !user) return;
    setAddingGoal(true);
    const { data, error } = await supabase
      .from('group_goals')
      .insert({
        group_id: groupId,
        title: goalTitle.trim(),
        description: goalDescription.trim() || undefined,
        created_by: user.id,
      })
      .select()
      .single();
    if (error) {
      toast.error('Failed to add goal');
    } else if (data) {
      setGoals((prev) => [data as GroupGoal, ...prev]);
      setGoalTitle('');
      setGoalDescription('');
      setShowAddGoalForm(false);
      toast.success('Goal added!');
    }
    setAddingGoal(false);
  };

  const addEvent = async () => {
    if (!eventTitle.trim() || !eventDate || !groupId || !user) return;
    setAddingEvent(true);
    const { error } = await supabase.from('group_events').insert({
      group_id: groupId,
      title: eventTitle.trim(),
      description: eventDescription.trim() || undefined,
      event_date: new Date(eventDate).toISOString(),
      location: eventLocation.trim() || undefined,
      created_by: user.id,
    });
    if (error) {
      toast.error('Failed to add event');
    } else {
      await fetchEvents();
      setEventTitle('');
      setEventDescription('');
      setEventDate('');
      setEventLocation('');
      setShowAddEventModal(false);
      toast.success('Event added!');
    }
    setAddingEvent(false);
  };

  const removeMember = async (member: GroupMember) => {
    const { error } = await supabase.from('group_members').delete().eq('id', member.id);
    if (error) {
      toast.error('Failed to remove member');
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success('Member removed');
    }
  };

  const openInviteModal = async () => {
    setShowInviteModal(true);
    if (!user) return;
    setLoadingMatches(true);
    const { data } = await supabase
      .from('matches')
      .select('*, other_user:profiles!matches_user2_id_fkey(id, full_name, avatar_url, username)')
      .eq('user1_id', user.id);
    setMatches((data as unknown as Match[]) ?? []);
    setLoadingMatches(false);
  };

  const inviteMatch = async (matchUserId: string) => {
    if (!user || !group) return;
    setInvitingUserId(matchUserId);
    const { error } = await supabase.from('notifications').insert({
      user_id: matchUserId,
      type: 'group_invite',
      title: 'Group Invitation',
      body: 'You were invited to join ' + group.name,
      metadata: { group_id: groupId },
    });
    if (error) {
      toast.error('Failed to send invitation');
    } else {
      toast.success('Invitation sent!');
    }
    setInvitingUserId(null);
  };

  // ─── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col max-w-md mx-auto">
        <div className="bg-white border-b border-orange-100 px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-4 w-36 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white border-b border-orange-100 flex">
          {TABS.map((t) => (
            <div key={t.id} className="flex-1 py-3 flex justify-center">
              <div className="h-4 w-10 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="flex-1 p-4 flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`flex gap-2 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
              <div className="w-6 h-6 rounded-full bg-gray-100 animate-pulse shrink-0" />
              <div
                className={`h-10 rounded-2xl bg-gray-100 animate-pulse ${i % 2 === 0 ? 'w-48' : 'w-40'}`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Not found ───────────────────────────────────────────────────────────────

  if (!group) {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center gap-4 px-4 max-w-md mx-auto">
        <div className="text-5xl">🔍</div>
        <p className="text-gray-500 text-center">Group not found.</p>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const avatarIsEmoji = !!group.avatar_url && group.avatar_url.length <= 4;

  // ─── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-dvh bg-orange-50 max-w-md mx-auto">
      {/* ── Header ── */}
      <div className="bg-white border-b border-orange-100 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-500"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Group avatar */}
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-orange-50 border border-orange-100">
            {avatarIsEmoji ? (
              <span className="text-xl leading-none">{group.avatar_url}</span>
            ) : group.avatar_url ? (
              <img
                src={getAvatarUrl(group.avatar_url) ?? group.avatar_url}
                alt={group.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xl">👥</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate leading-tight text-sm">{group.name}</h1>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-gray-400">
                {group.member_count ?? members.length} member
                {(group.member_count ?? members.length) !== 1 ? 's' : ''}
              </p>
              {userRole && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                    userRole === 'admin'
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {userRole === 'admin' ? 'Admin' : 'Member'}
                </span>
              )}
            </div>
          </div>
        </div>

        {group.description && (
          <p className="text-xs text-gray-500 px-4 pb-2 truncate">{group.description}</p>
        )}

        {/* Tab bar */}
        <div className="flex border-t border-gray-100 relative">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors relative ${
                  isActive ? 'text-orange-500' : 'text-gray-400'
                }`}
              >
                <tab.Icon size={16} />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-3 right-3 h-0.5 bg-orange-500 rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait" initial={false}>

          {/* CHAT */}
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex-1 overflow-hidden flex flex-col"
            >
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
                {messages.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                    <div className="text-4xl mb-3">👋</div>
                    <p className="text-gray-500 text-sm">No messages yet. Say hello!</p>
                  </div>
                )}
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  const sender = msg.sender as Profile | undefined;
                  const timeStr = format(new Date(msg.created_at), 'HH:mm');
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isMe && (
                        <div className="shrink-0 self-end">
                          {sender?.avatar_url ? (
                            <img
                              src={getAvatarUrl(sender.avatar_url) ?? sender.avatar_url}
                              alt={sender.full_name ?? ''}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-orange-200 flex items-center justify-center text-[10px] font-bold text-orange-700">
                              {getInitials(sender?.full_name)}
                            </div>
                          )}
                        </div>
                      )}
                      <div
                        className={`flex flex-col gap-0.5 max-w-[72%] ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        {!isMe && sender && (
                          <span className="text-[11px] text-gray-500 pl-1 font-medium">
                            {sender.full_name ?? sender.username ?? 'Someone'}
                          </span>
                        )}
                        <div
                          className={`px-3.5 py-2 text-sm leading-snug break-words ${
                            isMe
                              ? 'bg-orange-500 text-white rounded-2xl rounded-tr-sm'
                              : 'bg-white text-gray-900 rounded-2xl rounded-tl-sm shadow-sm border border-orange-50'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-gray-400 px-1">{timeStr}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div className="border-t border-orange-100 bg-white px-3 py-3 flex items-center gap-2 shrink-0">
                <input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Message the group…"
                  className="flex-1 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || sending}
                  aria-label="Send message"
                  className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 active:bg-orange-600 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* GOALS */}
          {activeTab === 'goals' && (
            <motion.div
              key="goals"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex-1 overflow-y-auto"
            >
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900 text-base">Shared Goals</h2>
                  <button
                    onClick={() => setShowAddGoalForm((v) => !v)}
                    className="flex items-center gap-1 text-orange-500 text-sm font-semibold active:opacity-70"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                <AnimatePresence>
                  {showAddGoalForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-white rounded-2xl border border-orange-100 p-4 mb-4 flex flex-col gap-3 shadow-sm">
                        <Input
                          label="Goal title"
                          value={goalTitle}
                          onChange={(e) => setGoalTitle(e.target.value)}
                          placeholder="e.g. Summit Kilimanjaro together"
                          autoFocus
                        />
                        <Input
                          label="Description (optional)"
                          value={goalDescription}
                          onChange={(e) => setGoalDescription(e.target.value)}
                          placeholder="Any details…"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowAddGoalForm(false);
                              setGoalTitle('');
                              setGoalDescription('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            loading={addingGoal}
                            disabled={!goalTitle.trim()}
                            onClick={addGoal}
                            fullWidth
                          >
                            Add Goal
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {goals.length === 0 && !showAddGoalForm && (
                  <div className="flex flex-col items-center py-16 text-center">
                    <div className="text-4xl mb-3">🎯</div>
                    <p className="text-gray-500 text-sm">No shared goals yet. Add the first one!</p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {goals.map((goal) => (
                    <div
                      key={goal.id}
                      className="bg-white rounded-2xl border border-orange-50 p-4 flex items-start gap-3 shadow-sm"
                    >
                      <button
                        onClick={() => toggleGoalComplete(goal)}
                        aria-label={goal.is_completed ? 'Mark incomplete' : 'Mark complete'}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          goal.is_completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-orange-400 active:border-orange-500'
                        }`}
                      >
                        {goal.is_completed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium leading-snug ${
                            goal.is_completed ? 'line-through text-gray-400' : 'text-gray-900'
                          }`}
                        >
                          {goal.title}
                        </p>
                        {goal.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{goal.description}</p>
                        )}
                        {goal.is_completed && goal.completed_at && (
                          <p className="text-xs text-green-600 mt-0.5">
                            Completed {format(new Date(goal.completed_at), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                      {goal.is_completed && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* EVENTS */}
          {activeTab === 'events' && (
            <motion.div
              key="events"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex-1 overflow-y-auto"
            >
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-900 text-base">Events</h2>
                  <button
                    onClick={() => setShowAddEventModal(true)}
                    className="flex items-center gap-1 text-orange-500 text-sm font-semibold active:opacity-70"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {events.length === 0 && (
                  <div className="flex flex-col items-center py-16 text-center">
                    <div className="text-4xl mb-3">📅</div>
                    <p className="text-gray-500 text-sm">No events planned yet.</p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  {events.map((event) => {
                    const eventDateTime = new Date(event.event_date);
                    const past = isPast(eventDateTime);
                    return (
                      <div
                        key={event.id}
                        className={`bg-white rounded-2xl border border-orange-50 p-4 shadow-sm transition-opacity ${
                          past ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-1.5">
                          <h3 className="font-semibold text-gray-900 text-sm leading-snug flex-1">
                            {event.title}
                          </h3>
                          <CountdownBadge eventDate={event.event_date} />
                        </div>
                        <p className="text-xs text-orange-600 font-medium mb-1">
                          {format(eventDateTime, "EEEE, MMM d · h:mm a")}
                        </p>
                        {event.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{event.location}</span>
                          </div>
                        )}
                        {event.description && (
                          <p className="text-xs text-gray-600 mt-1.5">{event.description}</p>
                        )}
                        {event.creator && (
                          <p className="text-[11px] text-gray-400 mt-2">
                            Added by {(event.creator as Profile).full_name}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* MEMBERS */}
          {activeTab === 'members' && (
            <motion.div
              key="members"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex-1 overflow-y-auto"
            >
              <div className="px-4 py-4">
                <h2 className="font-bold text-gray-900 text-base mb-4">
                  {members.length} Member{members.length !== 1 ? 's' : ''}
                </h2>

                <div className="flex flex-col gap-2 mb-6">
                  {members.map((member) => {
                    const memberProfile = member.user as Profile | undefined;
                    const isMe = member.user_id === user?.id;
                    const isAdmin = member.role === 'admin';
                    return (
                      <div
                        key={member.id}
                        className="bg-white rounded-2xl border border-orange-50 p-3 flex items-center gap-3 shadow-sm"
                      >
                        {memberProfile?.avatar_url ? (
                          <img
                            src={getAvatarUrl(memberProfile.avatar_url) ?? memberProfile.avatar_url}
                            alt={memberProfile.full_name ?? ''}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <InitialsAvatar name={memberProfile?.full_name} className="w-10 h-10" />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-sm text-gray-900">
                              {memberProfile?.full_name ?? 'Unknown'}
                              {isMe && <span className="text-gray-400 ml-1 text-xs font-normal">(you)</span>}
                            </span>
                            {memberProfile?.is_verified && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            )}
                            <span
                              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                                isAdmin
                                  ? 'bg-orange-100 text-orange-600'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {isAdmin ? 'Admin' : 'Member'}
                            </span>
                          </div>
                          {memberProfile?.username && (
                            <p className="text-xs text-gray-400 truncate">@{memberProfile.username}</p>
                          )}
                        </div>

                        {userRole === 'admin' && !isMe && !isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMember(member)}
                            className="text-red-400 hover:text-red-600 shrink-0 !text-xs"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {user && (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={openInviteModal}
                    icon={<Users className="w-4 h-4" />}
                  >
                    Invite a Match
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Add Event Modal ── */}
      <Modal isOpen={showAddEventModal} onClose={() => setShowAddEventModal(false)} title="New Event">
        <div className="px-5 py-4 flex flex-col gap-4 pb-8">
          <Input
            label="Title"
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="e.g. Group hike at Runyon Canyon"
            autoFocus
          />
          <Input
            label="Description (optional)"
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
            placeholder="Any details…"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Date &amp; Time</label>
            <input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-200 transition-colors text-gray-900"
            />
          </div>
          <Input
            label="Location (optional)"
            value={eventLocation}
            onChange={(e) => setEventLocation(e.target.value)}
            placeholder="e.g. Runyon Canyon, LA"
            leftIcon={<MapPin className="w-4 h-4 text-gray-400" />}
          />
          <Button
            variant="primary"
            fullWidth
            loading={addingEvent}
            disabled={!eventTitle.trim() || !eventDate}
            onClick={addEvent}
          >
            Add Event
          </Button>
        </div>
      </Modal>

      {/* ── Invite a Match Modal ── */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite a Match"
        fullHeight
      >
        <div className="px-5 py-4 pb-8">
          {loadingMatches && (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gray-100 animate-pulse shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loadingMatches && matches.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="text-4xl mb-3">💫</div>
              <p className="text-gray-500 text-sm">No matches to invite yet.</p>
            </div>
          )}

          {!loadingMatches && matches.length > 0 && (
            <div className="flex flex-col gap-4">
              {matches.map((match) => {
                const otherUser = match.other_user as Profile | undefined;
                const alreadyMember = members.some((m) => m.user_id === otherUser?.id);
                return (
                  <div key={match.id} className="flex items-center gap-3">
                    {otherUser?.avatar_url ? (
                      <img
                        src={getAvatarUrl(otherUser.avatar_url) ?? otherUser.avatar_url}
                        alt={otherUser.full_name ?? ''}
                        className="w-11 h-11 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <InitialsAvatar name={otherUser?.full_name} className="w-11 h-11" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">
                        {otherUser?.full_name ?? 'Unknown'}
                      </p>
                      {otherUser?.username && (
                        <p className="text-xs text-gray-400">@{otherUser.username}</p>
                      )}
                    </div>
                    {alreadyMember ? (
                      <span className="text-xs text-gray-400 font-medium shrink-0">In group</span>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        loading={invitingUserId === otherUser?.id}
                        disabled={invitingUserId !== null}
                        onClick={() => otherUser && inviteMatch(otherUser.id)}
                      >
                        Invite
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
