'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Users,
  Building,
  CalendarCheck,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  BadgeCheck,
  ArrowRight,
  ShieldAlert,
  Clock,
  ExternalLink,
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';

export default function AdminDashboardPage() {
  // 1. Executive Metrics
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    },
    staleTime: 30 * 1000
  });

  // 2. Action Required Priority Queue
  const { data: actionQueue = [], isLoading: queueLoading } = useQuery({
    queryKey: ['admin-action-queue'],
    queryFn: async () => {
      const res = await api.get('/admin/action-queue');
      return res.data;
    },
    staleTime: 30 * 1000
  });

  // 3. Telemetry Activity Stream
  const { data: activityData = [] } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async () => {
      const res = await api.get('/admin/activity');
      return res.data;
    },
    staleTime: 30 * 1000
  });

  const totalUsers = stats?.totalUsers || 0;
  const totalLandlords = stats?.totalLandlords || 0;
  const totalTenants = stats?.totalTenants || 0;
  const totalRevenue = stats?.totalRevenue || 0;
  const totalProperties = stats?.totalProperties || 0;
  const verifiedProperties = stats?.verifiedProperties || 0;
  const totalBookings = stats?.totalBookings || 0;
  const pendingProperties = stats?.pendingProperties || 0;
  const pendingKyc = stats?.pendingKyc || 0;
  const pendingLandlordDeeds = stats?.pendingLandlordDeeds || 0;
  const openBreaches = stats?.openBreaches || 0;
  const activeSubscriptions = stats?.activeSubscriptions || 0;
  const monthlyGrowth = stats?.monthlyGrowth || [];

  return (
    <div className="space-y-8 pb-12">
      {/* ── HEADER ── */}
      <AdminPageHeader
        title="Command Centre"
        subtitle="Centralized operational governance, statutory compliance audit queue, and live marketplace telemetry."
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            Live Telemetry
          </span>
        }
        actions={
          <button
            type="button"
            onClick={() => refetchStats()}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#12151D] hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition shadow-2xs flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            <span>Refresh Telemetry</span>
          </button>
        }
      />

      {/* ── A. COMPACT PERFORMANCE SUMMARY ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title="Escrow Volume"
          value={`GH₵ ${totalRevenue.toLocaleString()}`}
          subtitle="Total transaction throughput"
          icon={CreditCard}
          href="/admin/transactions"
        />
        <AdminStatCard
          title="Registered Users"
          value={totalUsers.toLocaleString()}
          subtitle={`${totalLandlords.toLocaleString()} Landlords · ${totalTenants.toLocaleString()} Tenants`}
          icon={Users}
          href="/admin/landlords"
        />
        <AdminStatCard
          title="Catalog Listings"
          value={totalProperties.toLocaleString()}
          subtitle={`${verifiedProperties.toLocaleString()} Approved & Active`}
          icon={Building}
          href="/admin/properties"
        />
        <AdminStatCard
          title="Tenancy Bookings"
          value={totalBookings.toLocaleString()}
          subtitle={`${activeSubscriptions.toLocaleString()} Active Licenses`}
          icon={CalendarCheck}
          href="/admin/bookings"
        />
      </div>

      {/* ── B. ACTION REQUIRED OPERATIONAL QUEUE (CORE OPERATIONAL WORKSPACE) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white tracking-tight">
                Action-Required Operational Queue
              </h2>
              <p className="text-xs text-zinc-500">
                Prioritized compliance items awaiting immediate administrative adjudication.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-mono">
            {actionQueue.length} pending
          </span>
        </div>

        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-hidden shadow-2xs">
          {queueLoading ? (
            <div className="p-8 text-center text-xs font-bold text-zinc-400">
              Evaluating compliance queues...
            </div>
          ) : actionQueue.length === 0 ? (
            <div className="p-8 text-center space-y-1">
              <BadgeCheck className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
              <div className="text-xs font-bold text-zinc-950 dark:text-white">
                Queue is Clear
              </div>
              <p className="text-[11px] text-zinc-500">
                All identity verifications, property moderation reviews, and disputes are currently resolved.
              </p>
            </div>
          ) : (
            actionQueue.slice(0, 8).map((item: any) => (
              <div
                key={item.id}
                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                        item.priority === 'URGENT'
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {item.priority}
                    </span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed truncate max-w-2xl">
                    {item.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-[11px] text-zinc-400 font-mono hidden md:block">
                    {new Date(item.createdAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </div>
                  <Link
                    href={item.targetUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-[#0F5132] text-white dark:text-zinc-900 dark:hover:text-white text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <span>Investigate</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── C & D. HISTORICAL PLATFORM TRAJECTORY & RECENT TELEMETRY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth Curves (2 Columns) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                Platform Growth Trajectory
              </h3>
              <p className="text-xs text-zinc-500">
                Verified registration trends and published housing inventory over the last 6 months.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F5132]" />
                Users
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Listings
              </span>
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            {monthlyGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyGrowth}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0F5132" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0F5132" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="propGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#12151D',
                      borderColor: '#27272a',
                      borderRadius: '12px',
                      fontSize: '11px',
                      color: '#fff'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#0F5132"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#userGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="properties"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#propGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                Aggregating historical records...
              </div>
            )}
          </div>
        </div>

        {/* Live Marketplace Activity Feed (1 Column) */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                Live Operations Feed
              </h3>
            </div>
            <Link
              href="/admin/audit"
              className="text-[11px] font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition"
            >
              Audit Log
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/40 -mx-2 px-2 max-h-72">
            {activityData.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-400">
                No recent activity logged.
              </div>
            ) : (
              activityData.slice(0, 7).map((item: any) => (
                <div key={item.id} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                    {item.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
