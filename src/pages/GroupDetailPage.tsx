import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, MessageCircle, Target, Calendar, Users,
  Plus, Send, Check, Crown, UserMinus, MoreVertical,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Group, GroupMessage, GroupMember, GroupGoal, GroupEvent, Profile } from '../types';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import { formatTimeAgo, formatDate } from '../lib/utils';
import toast from 'react-hot-toast';

type Tab = 'chat' | 'goals' | 'events' | 'members';

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [userRole, setUserRole] = useState<'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);

  // Chat state
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Goals state
  const [goals, setGoals] = useState<GroupGoal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');

  // Events state
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');

  // Members state
  const [members, setMembers] = useState<GroupMember[]>([]);

  useEffect(() => {
    if (!groupId || !user) return;
    loadGroup();

    const channel = supabase
      .channel(`group_chat:${groupId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`,
      }, async (payload) => {
        const newMsg = payload.new as GroupMessage;
        if (newMsg.sender_id !== user.id) {
          const { data: senderData } = await supabase.from('profiles').select('*').eq('id', newMsg.sender_id).single();
          setMessages(prev => [...prev, { ...newMsg, sender: senderData as Profile }]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadGroup = async () => {
    if (!groupId || !user) return;
    setLoading(true);
    try {
      const [groupRes, memberRes, msgRes, goalsRes, eventsRes] = await Promise.all([
        supabase.from('groups').select('*').eq('id', groupId).single(),
        supabase.from('group_members').select('*, user:user_id(*)').eq('group_id', groupId),
        supabase.from('group_messages').select('*, sender:sender_id(*)').eq('group_id', groupId).order('created_at').limit(50),
        supabase.from('group_goals').select('*').eq('group_id', groupId),
        supabase.from('group_events').select('*, creator:created_by(full_name, avatar_url)').eq('group_id', groupId).order('event_date'),
      ]);

      setGroup(groupRes.data as Group);
      setMessages((msgRes.data || []) as unknown as GroupMessage[]);
      setGoals((goalsRes.data || []) as GroupGoal[]);
      setEvents((eventsRes.data || []) as unknown as GroupEvent[]);

      const memberList = (memberRes.data || []) as unknown as GroupMember[];
      setMembers(memberList);
      const myMembership = memberList.find(m => m.user_id === user.id);
      setUserRole(myMembership?.role || null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !user || !groupId || sending) return;
    setSending(true);
    const content = messageInput.trim();
    setMessageInput('');

    const optimisticMsg: GroupMessage = {
      id: `temp-${Date.now()}`,
      group_id: groupId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const { data, error } = await supabase
        .from('group_messages')
        .insert({ group_id: groupId, sender_id: user.id, content })
        .select()
        .single();
      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? data as GroupMessage : m));
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const addGoal = async () => {
    if (!goalTitle.trim() || !groupId || !user) return;
    const { data, error } = await supabase
      .from('group_goals')
      .insert({ group_id: groupId, title: goalTitle, created_by: user.id })
      .select()
      .single();
    if (!error && data) {
      setGoals(prev => [...prev, data as GroupGoal]);
      setGoalTitle('');
      setShowAddGoal(false);
      toast.success('Goal added!');
    }
  };

  const toggleGoalComplete = async (goal: GroupGoal) => {
    const { error } = await supabase
      .from('group_goals')
      .update({ is_completed: !goal.is_completed, completed_at: !goal.is_completed ? new Date().toISOString() : null })
      .eq('id', goal.id);
    if (!error) {
      setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, is_completed: !g.is_completed } : g));
    }
  };

  const addEvent = async () => {
    if (!eventTitle.trim() || !eventDate || !groupId || !user) return;
    const { data, error } = await supabase
      .from('group_events')
      .insert({ group_id: groupId, title: eventTitle, event_date: eventDate, location: eventLocation, created_by: user.id })
      .select()
      .single();
    if (!error && data) {
      setEvents(prev => [...prev, data as GroupEvent]);
      setEventTitle('');
      setEventDate('');
      setEventLocation('');
      setShowAddEvent(false);
      toast.success('Event added!');
    }
  };

  const removeMember = async (memberId: string, userId: string) => {
    if (!groupId) return;
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
    setMembers(prev => prev.filter(m => m.id !== memberId));
    toast.success('Member removed');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-4xl animate-bounce">👥</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-orange-50 flex flex-col items-center justify-center">
        <p className="text-gray-500">Group not found</p>
        <button onClick={() => navigate('/groups')} className="btn-primary mt-4">Back to Groups</button>
      </div>
    );
  }

  const TAB_ITEMS: { id: Tab; icon: typeof MessageCircle; label: string }[] = [
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
    { id: 'goals', icon: Target, label: 'Goals' },
    { id: 'events', icon: Calendar, label: 'Events' },
    { id: 'members', icon: Users, label: 'Members' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-orange-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/groups')} className="text-gray-400 hover:text-gray-700">
          <ArrowLeft size={22} />
        </button>
        <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-xl">
          {group.avatar_url && group.avatar_url.length <= 4 ? group.avatar_url : '👥'}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 truncate">{group.name}</h2>
          <p className="text-xs text-gray-400">{members.length} members</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b border-orange-100 flex">
        {TAB_ITEMS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
              activeTab === tab.id ? 'text-orange-500' : 'text-gray-400'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">💬</div>
                  <p className="text-gray-500">No messages yet. Start the conversation!</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                    {!isMe && (
                      <Avatar
                        src={(msg.sender as Profile)?.avatar_url}
                        name={(msg.sender as Profile)?.full_name}
                        size="sm"
                      />
                    )}
                    <div className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && (
                        <span className="text-xs text-gray-500 px-1">
                          {(msg.sender as Profile)?.full_name}
                        </span>
                      )}
                      <div className={`message-bubble ${isMe ? 'sent' : 'received'}`}>
                        {msg.content}
                      </div>
                      <span className="text-xs text-gray-400 px-1">
                        {formatTimeAgo(msg.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-orange-100 bg-white p-3 flex gap-2">
              <input
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Message the group..."
                className="flex-1 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
              />
              <button
                onClick={sendMessage}
                disabled={!messageInput.trim() || sending}
                className="w-10 h-10 bg-orange-500 text-white rounded-xl flex items-center justify-center disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        )}

        {activeTab === 'goals' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Shared Goals</h3>
              <button onClick={() => setShowAddGoal(true)} className="text-orange-500 flex items-center gap-1 text-sm font-medium">
                <Plus size={16} /> Add
              </button>
            </div>
            {goals.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🎯</div>
                <p className="text-gray-500">No shared goals yet. Add one!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {goals.map(goal => (
                  <div key={goal.id} className="card p-4 flex items-center gap-3">
                    <button
                      onClick={() => toggleGoalComplete(goal)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        goal.is_completed
                          ? 'bg-green-500 border-green-500'
                          : 'border-gray-300 hover:border-orange-400'
                      }`}
                    >
                      {goal.is_completed && <Check size={12} className="text-white" />}
                    </button>
                    <div className="flex-1">
                      <p className={`font-medium text-sm ${goal.is_completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {goal.title}
                      </p>
                      {goal.is_completed && goal.completed_at && (
                        <p className="text-xs text-green-600">Completed {formatDate(goal.completed_at)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Events</h3>
              <button onClick={() => setShowAddEvent(true)} className="text-orange-500 flex items-center gap-1 text-sm font-medium">
                <Plus size={16} /> Add
              </button>
            </div>
            {events.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-gray-500">No events planned yet!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {events.map(event => {
                  const isPast = new Date(event.event_date) < new Date();
                  return (
                    <div key={event.id} className={`card p-4 ${isPast ? 'opacity-60' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className="bg-orange-100 rounded-xl p-2 text-xl flex-shrink-0">
                          📅
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{event.title}</h4>
                          <p className="text-sm text-orange-600">
                            {new Date(event.event_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                          {event.location && (
                            <p className="text-xs text-gray-500 mt-0.5">📍 {event.location}</p>
                          )}
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="font-semibold text-gray-900 mb-4">{members.length} Members</h3>
            <div className="flex flex-col gap-3">
              {members.map(member => {
                const memberProfile = member.user as unknown as Profile;
                const isMe = member.user_id === user?.id;
                return (
                  <div key={member.id} className="card p-3 flex items-center gap-3">
                    <Avatar
                      src={memberProfile?.avatar_url}
                      name={memberProfile?.full_name}
                      size="md"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm text-gray-900">
                          {memberProfile?.full_name}
                          {isMe && <span className="text-gray-400 ml-1">(you)</span>}
                        </span>
                        {member.role === 'admin' && (
                          <Crown size={12} className="text-orange-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {member.role === 'admin' ? 'Admin' : 'Member'} · Joined {formatTimeAgo(member.joined_at)}
                      </p>
                    </div>
                    {userRole === 'admin' && !isMe && (
                      <button
                        onClick={() => removeMember(member.id, member.user_id)}
                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add Goal Modal */}
      <Modal isOpen={showAddGoal} onClose={() => setShowAddGoal(false)} title="Add Shared Goal">
        <div className="flex flex-col gap-4 pb-4">
          <input
            value={goalTitle}
            onChange={e => setGoalTitle(e.target.value)}
            placeholder="e.g. Summit Mount Kilimanjaro together"
            className="input-field"
            autoFocus
          />
          <button onClick={addGoal} disabled={!goalTitle.trim()} className="btn-primary">
            Add Goal
          </button>
        </div>
      </Modal>

      {/* Add Event Modal */}
      <Modal isOpen={showAddEvent} onClose={() => setShowAddEvent(false)} title="Add Event">
        <div className="flex flex-col gap-4 pb-4">
          <input
            value={eventTitle}
            onChange={e => setEventTitle(e.target.value)}
            placeholder="Event name"
            className="input-field"
          />
          <input
            type="datetime-local"
            value={eventDate}
            onChange={e => setEventDate(e.target.value)}
            className="input-field"
          />
          <input
            value={eventLocation}
            onChange={e => setEventLocation(e.target.value)}
            placeholder="Location (optional)"
            className="input-field"
          />
          <button onClick={addEvent} disabled={!eventTitle.trim() || !eventDate} className="btn-primary">
            Add Event
          </button>
        </div>
      </Modal>
    </div>
  );
}
