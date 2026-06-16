import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Heart, TrendingUp, DollarSign, Flag, ToggleLeft, ToggleRight,
  Bell, ArrowLeft, Shield, Star, Activity, AlertTriangle, CheckCircle,
  Search, ChevronRight, Ban
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Profile, Report, FeatureFlag, Subscription } from '../types';
import Avatar from '../components/ui/Avatar';
import { formatTimeAgo, formatCurrency, calculateMRR } from '../lib/utils';
import toast from 'react-hot-toast';

type AdminTab = 'overview' | 'users' | 'reports' | 'flags' | 'notifications' | 'revenue';

interface AdminStats {
  totalUsers: number;
  dau: number;
  mau: number;
  totalMatches: number;
  mrr: number;
  arr: number;
  popularGoals: Array<{ title: string; count: number }>;
  matchSuccessRate: number;
  tierBreakdown: Record<string, number>;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [userPage, setUserPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!profile?.is_admin) {
      navigate('/discover');
      return;
    }
    loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadUsers(),
        loadReports(),
        loadFlags(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [usersRes, dauRes, mauRes, matchesRes, goalsRes, subsRes] = await Promise.all([
      supabase.from('profiles').select('id, subscription_tier', { count: 'exact' }),
      supabase.from('profiles').select('id', { count: 'exact' }).gte('last_active_at', dayAgo),
      supabase.from('profiles').select('id', { count: 'exact' }).gte('last_active_at', monthAgo),
      supabase.from('matches').select('id', { count: 'exact' }),
      supabase.from('bucket_list_goals').select('title').eq('is_public', true),
      supabase.from('subscriptions').select('tier, status'),
    ]);

    // Popular goals: count by title similarity
    const goalCounts: Record<string, number> = {};
    (goalsRes.data || []).forEach(g => {
      const key = g.title.toLowerCase();
      goalCounts[key] = (goalCounts[key] || 0) + 1;
    });
    const popularGoals = Object.entries(goalCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([title, count]) => ({ title, count }));

    // Tier breakdown
    const tierBreakdown: Record<string, number> = {};
    (usersRes.data || []).forEach(u => {
      tierBreakdown[u.subscription_tier] = (tierBreakdown[u.subscription_tier] || 0) + 1;
    });

    const activeSubs = (subsRes.data || []).filter(s => s.status === 'active');
    const mrr = calculateMRR(activeSubs);

    const totalUsers = usersRes.count || 0;
    const totalMatches = matchesRes.count || 0;
    const matchSuccessRate = totalUsers > 0 ? Math.round((totalMatches / totalUsers) * 100) : 0;

    setStats({
      totalUsers,
      dau: dauRes.count || 0,
      mau: mauRes.count || 0,
      totalMatches,
      mrr,
      arr: mrr * 12,
      popularGoals,
      matchSuccessRate,
      tierBreakdown,
    });
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .range(userPage * PAGE_SIZE, (userPage + 1) * PAGE_SIZE - 1);
    setUsers((data || []) as Profile[]);
  };

  const loadReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('*, reporter:reporter_id(*), reported:reported_id(*)')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });
    setReports((data || []) as unknown as Report[]);
  };

  const loadFlags = async () => {
    const { data } = await supabase
      .from('feature_flags')
      .select('*')
      .order('name');
    setFlags((data || []) as FeatureFlag[]);
  };

  const toggleFlag = async (flag: FeatureFlag) => {
    const { error } = await supabase
      .from('feature_flags')
      .update({ is_enabled: !flag.is_enabled })
      .eq('id', flag.id);
    if (!error) {
      setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, is_enabled: !f.is_enabled } : f));
      toast.success(`${flag.name} ${!flag.is_enabled ? 'enabled' : 'disabled'}`);
    }
  };

  const banUser = async (userId: string) => {
    if (!confirm('Are you sure you want to ban this user?')) return;
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: true })
      .eq('id', userId);
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: true } : u));
      toast.success('User banned');
    }
  };

  const resolveReport = async (reportId: string) => {
    const { error } = await supabase
      .from('reports')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', reportId);
    if (!error) {
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast.success('Report resolved');
    }
  };

  const promoteToAdmin = async (userId: string) => {
    await supabase.from('profiles').update({ is_admin: true }).eq('id', userId);
    toast.success('User promoted to admin');
  };

  const sendPushNotification = async () => {
    if (!pushTitle.trim() || !pushBody.trim()) return;
    toast.success(`Push notification queued: "${pushTitle}" (implement via Edge Function + OneSignal)`);
    setPushTitle('');
    setPushBody('');
  };

  const filteredUsers = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const TABS: { id: AdminTab; icon: typeof Users; label: string }[] = [
    { id: 'overview', icon: Activity, label: 'Overview' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'reports', icon: Flag, label: `Reports${reports.length > 0 ? ` (${reports.length})` : ''}` },
    { id: 'flags', icon: ToggleLeft, label: 'Flags' },
    { id: 'notifications', icon: Bell, label: 'Push' },
    { id: 'revenue', icon: DollarSign, label: 'Revenue' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Admin header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/discover')} className="text-slate-400 hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <Shield size={20} className="text-orange-500" />
        <h1 className="font-bold text-lg">Admin Dashboard</h1>
        <span className="ml-auto text-xs text-slate-500">DreamLink · {new Date().toLocaleDateString()}</span>
      </div>

      {/* Tab navigation */}
      <div className="bg-slate-800 border-b border-slate-700 flex overflow-x-auto scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* OVERVIEW */}
        {activeTab === 'overview' && stats && (
          <div>
            <h2 className="text-xl font-bold mb-4">Platform Overview</h2>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'text-blue-400' },
                { label: 'DAU', value: stats.dau.toLocaleString(), icon: Activity, color: 'text-green-400' },
                { label: 'MAU', value: stats.mau.toLocaleString(), icon: TrendingUp, color: 'text-purple-400' },
                { label: 'Total Matches', value: stats.totalMatches.toLocaleString(), icon: Heart, color: 'text-red-400' },
                { label: 'MRR', value: formatCurrency(stats.mrr), icon: DollarSign, color: 'text-yellow-400' },
                { label: 'ARR', value: formatCurrency(stats.arr), icon: Star, color: 'text-orange-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-slate-800 rounded-2xl p-4">
                  <div className={`${stat.color} mb-1`}>
                    <stat.icon size={18} />
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Match success rate */}
            <div className="bg-slate-800 rounded-2xl p-4 mb-4">
              <h3 className="font-semibold mb-2 text-slate-300">Match Success Rate</h3>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-orange-400">{stats.matchSuccessRate}%</span>
                <span className="text-sm text-slate-400 mb-0.5">of users have at least 1 match</span>
              </div>
              <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{ width: `${stats.matchSuccessRate}%` }}
                />
              </div>
            </div>

            {/* Popular goals */}
            <div className="bg-slate-800 rounded-2xl p-4 mb-4">
              <h3 className="font-semibold mb-3 text-slate-300">Most Popular Goals 🔥</h3>
              <div className="flex flex-col gap-2">
                {stats.popularGoals.map((goal, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-orange-400 font-bold text-sm w-4">{i + 1}</span>
                    <span className="flex-1 text-sm text-slate-200 truncate capitalize">{goal.title}</span>
                    <span className="text-xs text-slate-400">{goal.count} users</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tier breakdown */}
            <div className="bg-slate-800 rounded-2xl p-4">
              <h3 className="font-semibold mb-3 text-slate-300">Users by Tier</h3>
              <div className="flex flex-col gap-2">
                {Object.entries(stats.tierBreakdown).map(([tier, count]) => {
                  const pct = Math.round((count / stats.totalUsers) * 100);
                  const colors: Record<string, string> = {
                    free: 'bg-gray-500',
                    premium: 'bg-orange-500',
                    elite: 'bg-purple-500',
                    business: 'bg-slate-400',
                  };
                  return (
                    <div key={tier}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-slate-300">{tier}</span>
                        <span className="text-slate-400">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full ${colors[tier] || 'bg-gray-500'} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Users</h2>
              <span className="text-slate-400 text-sm">{stats?.totalUsers} total</span>
            </div>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              {filteredUsers.map(user => (
                <div key={user.id} className="bg-slate-800 rounded-2xl p-3 flex items-center gap-3">
                  <Avatar src={user.avatar_url} name={user.full_name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-white">{user.full_name}</span>
                      {user.is_admin && <Shield size={12} className="text-orange-400" />}
                      {user.is_blocked && <Ban size={12} className="text-red-400" />}
                    </div>
                    <p className="text-xs text-slate-400">@{user.username} · {user.subscription_tier}</p>
                    <p className="text-xs text-slate-500">{formatTimeAgo(user.created_at)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => banUser(user.id)}
                      className="text-xs text-red-400 hover:text-red-300 bg-red-900/30 px-2 py-1 rounded-lg"
                    >
                      Ban
                    </button>
                    <button
                      onClick={() => promoteToAdmin(user.id)}
                      className="text-xs text-orange-400 hover:text-orange-300 bg-orange-900/30 px-2 py-1 rounded-lg"
                    >
                      Admin
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4 justify-center">
              {userPage > 0 && (
                <button onClick={() => { setUserPage(p => p - 1); loadUsers(); }} className="text-sm text-orange-400 hover:text-orange-300">
                  ← Previous
                </button>
              )}
              {users.length === PAGE_SIZE && (
                <button onClick={() => { setUserPage(p => p + 1); loadUsers(); }} className="text-sm text-orange-400 hover:text-orange-300">
                  Next →
                </button>
              )}
            </div>
          </div>
        )}

        {/* REPORTS */}
        {activeTab === 'reports' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Open Reports ({reports.length})</h2>
            {reports.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle size={48} className="text-green-400 mx-auto mb-3" />
                <p className="text-slate-400">No open reports. All clear! 🎉</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {reports.map(report => (
                  <div key={report.id} className="bg-slate-800 rounded-2xl p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <AlertTriangle size={18} className="text-yellow-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-white">{report.reason}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Reported {formatTimeAgo(report.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mb-3 text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Reporter:</span>
                        <span className="text-white">{(report.reporter as Profile)?.full_name}</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-500" />
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Reported:</span>
                        <span className="text-white">{(report.reported as Profile)?.full_name}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveReport(report.id)}
                        className="flex-1 text-sm font-medium text-green-400 bg-green-900/30 py-2 rounded-xl hover:bg-green-900/50"
                      >
                        Resolve
                      </button>
                      <button
                        onClick={() => {
                          if (report.reported_id) banUser(report.reported_id);
                          resolveReport(report.id);
                        }}
                        className="flex-1 text-sm font-medium text-red-400 bg-red-900/30 py-2 rounded-xl hover:bg-red-900/50"
                      >
                        Ban & Resolve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FEATURE FLAGS */}
        {activeTab === 'flags' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Feature Flags</h2>
            <div className="flex flex-col gap-3">
              {flags.map(flag => (
                <div key={flag.id} className="bg-slate-800 rounded-2xl p-4 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-white">{flag.name}</p>
                    {flag.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{flag.description}</p>
                    )}
                  </div>
                  <button onClick={() => toggleFlag(flag)}>
                    {flag.is_enabled
                      ? <ToggleRight size={28} className="text-orange-500" />
                      : <ToggleLeft size={28} className="text-slate-600" />
                    }
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PUSH NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div>
            <h2 className="text-xl font-bold mb-2">Send Push Notification</h2>
            <p className="text-slate-400 text-sm mb-6">Send a message to all app users via OneSignal.</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Title</label>
                <input
                  value={pushTitle}
                  onChange={e => setPushTitle(e.target.value)}
                  placeholder="Notification title"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Body</label>
                <textarea
                  value={pushBody}
                  onChange={e => setPushBody(e.target.value)}
                  placeholder="Notification message body..."
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
              <button
                onClick={sendPushNotification}
                disabled={!pushTitle.trim() || !pushBody.trim()}
                className="bg-orange-500 text-white font-semibold py-3 px-6 rounded-2xl disabled:opacity-50 hover:bg-orange-600 transition-colors"
              >
                Send to All Users
              </button>
              <div className="bg-slate-800 rounded-2xl p-4 text-sm text-slate-400">
                <p className="font-medium text-slate-300 mb-1">⚠️ Implementation Note</p>
                <p>Connect to OneSignal API via a Supabase Edge Function. Set ONESIGNAL_APP_ID and ONESIGNAL_API_KEY as Supabase secrets.</p>
              </div>
            </div>
          </div>
        )}

        {/* REVENUE */}
        {activeTab === 'revenue' && stats && (
          <div>
            <h2 className="text-xl font-bold mb-4">Revenue</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-800 rounded-2xl p-4">
                <p className="text-slate-400 text-xs mb-1">Monthly MRR</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.mrr)}</p>
              </div>
              <div className="bg-slate-800 rounded-2xl p-4">
                <p className="text-slate-400 text-xs mb-1">Annual ARR</p>
                <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.arr)}</p>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-4 mb-4">
              <h3 className="font-semibold text-slate-300 mb-4">Revenue by Tier</h3>
              {Object.entries(stats.tierBreakdown).filter(([tier]) => tier !== 'free').map(([tier, count]) => {
                const prices: Record<string, number> = { premium: 9.99, elite: 24.99, business: 99 };
                const tierRevenue = (prices[tier] || 0) * count;
                const maxRevenue = Math.max(...Object.entries(stats.tierBreakdown)
                  .filter(([t]) => t !== 'free')
                  .map(([t, c]) => (prices[t] || 0) * c));
                const pct = maxRevenue > 0 ? (tierRevenue / maxRevenue) * 100 : 0;
                return (
                  <div key={tier} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-slate-300">{tier} ({count} users)</span>
                      <span className="text-green-400 font-medium">{formatCurrency(tierRevenue)}/mo</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-800 rounded-2xl p-4">
              <p className="text-slate-400 text-sm">
                <span className="font-medium text-slate-300">📈 Growth tip:</span> Connect Stripe Webhook to automatically sync subscription data. Implement Supabase Edge Function at <code className="text-orange-400">functions/v1/stripe-webhook</code>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
