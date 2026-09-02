'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Users, Building, CalendarCheck, CreditCard, TrendingUp, XCircle, ShieldCheck, Megaphone, Send, Activity } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import FraudDetectionTab from '@/components/FraudDetectionTab';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('ALL');
  const [broadcastStatus, setBroadcastStatus] = useState<{type: 'success'|'error', text: string} | null>(null);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    },
    enabled: !!session && session.role === 'ADMIN'
  });

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/broadcast', {
        subject: broadcastSubject,
        message: broadcastMessage,
        targetRole: broadcastTarget
      });
    },
    onSuccess: () => {
      setBroadcastStatus({ type: 'success', text: 'Announcement broadcasted successfully!' });
      setBroadcastSubject('');
      setBroadcastMessage('');
      setTimeout(() => setBroadcastStatus(null), 5000);
    },
    onError: (err: any) => {
      setBroadcastStatus({ type: 'error', text: err.response?.data?.message || 'Failed to send broadcast' });
    }
  });

  if (sessionLoading || statsLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;

  if (session?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <XCircle className="w-16 h-16 text-red-500" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-[var(--muted-foreground)]">You must be an Administrator to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sticky Header & Stats Container */}
      <div className="sticky top-0 z-20 bg-[#FBFBFC]/95 dark:bg-[#0B0D12]/95 backdrop-blur-md pt-2 pb-4 -mx-8 px-8 border-b border-zinc-200 dark:border-zinc-800 space-y-4 mb-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Command Center</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Overview of system activity and performance metrics.</p>
          </div>
          <div className="p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
            <TrendingUp className="w-8 h-8" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border bg-white dark:bg-[#12151D] border-zinc-200 dark:border-zinc-800 relative overflow-hidden shadow-xs hover:border-zinc-400 dark:hover:border-zinc-700 transition-all">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Users className="w-14 h-14 text-zinc-200 dark:text-zinc-800" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl shadow-inner">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wider">Total Users</h3>
            </div>
            <div className="text-3xl font-black text-zinc-950 dark:text-white">{stats?.totalUsers || 0}</div>
            <div className="mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Including {stats?.totalLandlords || 0} Landlords</div>
          </div>

          <div className="p-5 rounded-2xl border bg-white dark:bg-[#12151D] border-zinc-200 dark:border-zinc-800 relative overflow-hidden shadow-xs hover:border-zinc-400 dark:hover:border-zinc-700 transition-all">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Building className="w-14 h-14 text-zinc-200 dark:text-zinc-800" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-xl shadow-inner">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wider">Properties</h3>
            </div>
            <div className="text-3xl font-black text-zinc-950 dark:text-white">{stats?.totalProperties || 0}</div>
            <div className="mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">Listed on platform</div>
          </div>

          <div className="p-5 rounded-2xl border bg-white dark:bg-[#12151D] border-zinc-200 dark:border-zinc-800 relative overflow-hidden shadow-xs hover:border-zinc-400 dark:hover:border-zinc-700 transition-all">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-14 h-14 text-zinc-200 dark:text-zinc-800" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-xl shadow-inner">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wider">Bookings</h3>
            </div>
            <div className="text-3xl font-black text-zinc-950 dark:text-white">{stats?.totalBookings || 0}</div>
            <div className="mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">All time system bookings</div>
          </div>

          <div className="p-5 rounded-2xl border bg-white dark:bg-[#12151D] border-zinc-200 dark:border-zinc-800 relative overflow-hidden shadow-xs hover:border-zinc-400 dark:hover:border-zinc-700 transition-all">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <CreditCard className="w-14 h-14 text-zinc-200 dark:text-zinc-800" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl shadow-inner">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wider">Revenue (GHS)</h3>
            </div>
            <div className="text-3xl font-black text-zinc-950 dark:text-white">GH₵ {stats?.totalRevenue?.toLocaleString() || 0}</div>
            <div className="mt-1 text-xs font-semibold text-[#581C87] dark:text-[#E9D5FF]">From landlord subscriptions</div>
          </div>
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="glass-card p-8 rounded-3xl border border-[var(--border)] relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-[var(--primary)]" /> Platform Growth
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">6-month trend of user acquisition and listings</p>
          </div>
        </div>
        
        {stats?.monthlyGrowth ? (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.monthlyGrowth} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: 'var(--foreground)', fontSize: '14px', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="users" name="Total Users" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="properties" name="Properties" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[300px] w-full flex items-center justify-center">
            <span className="text-[var(--muted-foreground)]">No analytics data available.</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-8 border border-[var(--border)] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Platform Security</h2>
          <p className="text-[var(--muted-foreground)] mb-6">Manage users, ban fraudulent accounts, and approve identity verification cards.</p>
          <button onClick={() => router.push('/admin/users')} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg w-fit">
            Manage Users
          </button>
        </div>
        
        <div className="glass-card rounded-2xl p-8 border border-[var(--border)] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <Building className="w-12 h-12 text-blue-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Listing Approvals</h2>
          <p className="text-[var(--muted-foreground)] mb-6">Review new property listings submitted by landlords and approve or reject them.</p>
          <button onClick={() => router.push('/admin/properties')} className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg w-fit">
            Review Properties
          </button>
        </div>
      </div>

      {/* AI Fraud & Scam Detection Engine */}
      <FraudDetectionTab />

      {/* Admin Broadcast Component */}
      <div className="glass-card p-8 rounded-3xl border border-[var(--border)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">System Broadcast</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Send critical announcements via Email and In-App Notification.</p>
          </div>
        </div>

        {broadcastStatus && (
          <div className={`p-4 rounded-xl text-sm font-medium mb-6 border ${broadcastStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-900/50' : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30 dark:border-red-900/50'}`}>
            {broadcastStatus.text}
          </div>
        )}

        <div className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Target Audience</label>
              <select 
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value)}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
              >
                <option value="ALL">All Users</option>
                <option value="TENANT">Tenants Only</option>
                <option value="LANDLORD">Landlords Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Subject</label>
              <input 
                type="text" 
                value={broadcastSubject}
                onChange={(e) => setBroadcastSubject(e.target.value)}
                placeholder="e.g. System Maintenance"
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Message</label>
            <textarea 
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="Write the announcement message here..."
              rows={4}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all resize-none"
            />
          </div>
          <div className="pt-2">
            <button 
              onClick={() => broadcastMutation.mutate()}
              disabled={broadcastMutation.isPending || !broadcastSubject || !broadcastMessage}
              className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {broadcastMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Send Broadcast
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
