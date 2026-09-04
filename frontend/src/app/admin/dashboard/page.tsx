'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, Users, Building, CalendarCheck, CreditCard, TrendingUp, 
  XCircle, ShieldCheck, Megaphone, Send, Activity, ArrowRight, 
  CheckCircle2, Clock, AlertTriangle, FileCheck, Key, RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import FraudDetectionTab from '@/components/FraudDetectionTab';
import clsx from 'clsx';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState('ALL');
  const [broadcastStatus, setBroadcastStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
  });

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    },
    enabled: !!session && session.role === 'ADMIN'
  });

  // Recent Activity stream
  const { data: activityData } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/activity');
        return res.data;
      } catch {
        return [];
      }
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
      setBroadcastStatus({ type: 'success', text: 'Announcement broadcasted successfully to all target members!' });
      setBroadcastSubject('');
      setBroadcastMessage('');
      setTimeout(() => setBroadcastStatus(null), 5000);
    },
    onError: (err: any) => {
      setBroadcastStatus({ type: 'error', text: err.response?.data?.message || 'Failed to dispatch broadcast' });
    }
  });

  if (sessionLoading || statsLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        <p className="text-xs font-bold text-zinc-400">Loading platform executive console...</p>
      </div>
    );
  }

  if (session?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <XCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Security Clearance Required</h2>
        <p className="text-xs text-zinc-500">You must hold an active Administrator role to view this operational console.</p>
      </div>
    );
  }

  const totalUsers = stats?.totalUsers || 0;
  const totalLandlords = stats?.totalLandlords || 0;
  const totalTenants = Math.max(0, totalUsers - totalLandlords);
  const totalRevenue = stats?.totalRevenue || 0;
  const totalProperties = stats?.totalProperties || 0;
  const totalBookings = stats?.totalBookings || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 text-zinc-900 dark:text-white">
      
      {/* ── EXECUTIVE HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
              Executive Operations Console
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Act 220 Compliant
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time governance, Paystack escrow oversight, and property compliance across Ghana.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchStats()}
            className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold border border-zinc-200 dark:border-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
            <span>Refresh Metrics</span>
          </button>
        </div>
      </div>

      {/* ── HIGH-DENSITY METRIC STRIP (4 EXECUTIVE CARDS) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Escrow Volume */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Escrow Volume</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">
            GH₵ {totalRevenue.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 flex items-center gap-1">
            <span className="text-[#0F5132] font-bold">100% Secured</span>
            <span>• Paystack Escrow</span>
          </div>
        </div>

        {/* Listed Properties */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Listings</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
              <Building className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">
            {totalProperties}
          </div>
          <div className="text-[11px] text-zinc-500">
            Across Accra &amp; Regional Centers
          </div>
        </div>

        {/* Confirmed Leases / Bookings */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Confirmed Leases</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
              <CalendarCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">
            {totalBookings}
          </div>
          <div className="text-[11px] text-zinc-500">
            Tenancy Agreements Executed
          </div>
        </div>

        {/* Platform Members */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Members</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">
            {totalUsers}
          </div>
          <div className="text-[11px] text-zinc-500">
            {totalLandlords} Landlords • {totalTenants} Tenants
          </div>
        </div>

      </div>

      {/* ── 2-COLUMN OPERATIONAL WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ── LEFT COLUMN (65%): CHARTS & COMPLIANCE AUDIT ── */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Platform Tenancy Growth Curve */}
          <div className="bg-white dark:bg-[#12151D] rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-950 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0F5132]" />
                  <span>Platform Growth &amp; Transaction Trajectory</span>
                </h2>
                <p className="text-[11px] text-zinc-500">6-month transaction and registration trend</p>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                  <span className="w-2 h-2 rounded-full bg-[#0F5132]"></span> Users
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Properties
                </span>
              </div>
            </div>

            {stats?.monthlyGrowth && (
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.monthlyGrowth} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="growthEmerald" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0F5132" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#0F5132" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#A1A1AA" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#A1A1AA" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181B', borderRadius: '10px', border: '1px solid #27272A', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="users" stroke="#0F5132" strokeWidth={2.5} fillOpacity={1} fill="url(#growthEmerald)" />
                    <Area type="monotone" dataKey="properties" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Listing Compliance & Risk Audit */}
          <FraudDetectionTab />

        </div>

        {/* ── RIGHT COLUMN (35%): ACTION TRIAGE & BROADCAST ── */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Priority Action Triage */}
          <div className="bg-white dark:bg-[#12151D] rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Action Required Queue</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Priority
              </span>
            </h2>

            <div className="space-y-2.5 text-xs">
              
              {/* Landlord KYC Review */}
              <Link 
                href="/admin/users"
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700 flex items-start gap-3 hover:border-zinc-300 transition-all block"
              >
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-zinc-900 dark:text-white">Landlord KYC &amp; Ghana Card</div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Review submitted IDs to grant Act 220 Verified status.</p>
                </div>
              </Link>

              {/* Property Moderation */}
              <Link 
                href="/admin/properties"
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700 flex items-start gap-3 hover:border-zinc-300 transition-all block"
              >
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-zinc-900 dark:text-white">Property Quality Moderation</div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Audit new listings before public publishing.</p>
                </div>
              </Link>

              {/* Escrow Disbursements */}
              <Link 
                href="/admin/transactions"
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700 flex items-start gap-3 hover:border-zinc-300 transition-all block"
              >
                <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-zinc-900 dark:text-white">Escrow Settlements &amp; MoMo</div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Release tenant funds following key handover.</p>
                </div>
              </Link>

            </div>
          </div>

          {/* Quick System Broadcast Drawer */}
          <div className="bg-white dark:bg-[#12151D] rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#0F5132]" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
                Dispatch System Broadcast
              </h2>
            </div>

            {broadcastStatus && (
              <div className={clsx(
                "p-2.5 rounded-xl text-xs font-bold border",
                broadcastStatus.type === 'success' 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                  : "bg-rose-50 text-rose-700 border-rose-200"
              )}>
                {broadcastStatus.text}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Target</label>
                <select
                  value={broadcastTarget}
                  onChange={(e) => setBroadcastTarget(e.target.value)}
                  className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-xs font-medium cursor-pointer"
                >
                  <option value="ALL">All Users (Tenants &amp; Landlords)</option>
                  <option value="LANDLORD">Landlords Only</option>
                  <option value="TENANT">Tenants Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Subject</label>
                <input
                  type="text"
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  placeholder="e.g. Scheduled Maintenance Notice"
                  className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Message</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Write the announcement message..."
                  rows={3}
                  className="w-full p-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none text-xs resize-none"
                />
              </div>

              <button
                type="button"
                onClick={() => broadcastMutation.mutate()}
                disabled={broadcastMutation.isPending || !broadcastSubject || !broadcastMessage}
                className="w-full py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {broadcastMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Broadcast</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
