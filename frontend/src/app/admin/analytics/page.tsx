'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  TrendingUp,
  Users,
  CalendarCheck,
  Banknote,
  Home,
  Calendar,
  ChevronDown,
  Download,
  Lightbulb,
  ArrowRight,
  Building2,
  Trophy,
  Activity,
  Star,
  UserPlus,
  BarChart3,
  Loader2,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type ChartMetric = 'revenue' | 'bookings' | 'users';
type PeriodOption = 'Last 12 Months' | 'Last 6 Months' | 'Last 30 Days';

const formatGhc = (amount: number | null | undefined) =>
  `GH₵ ${Number(amount || 0).toLocaleString()}`;

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<PeriodOption>('Last 12 Months');
  const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [activeMetric, setActiveMetric] = useState<ChartMetric>('revenue');

  const { data: analytics, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics');
      return res.data;
    },
    staleTime: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    },
    staleTime: 30_000,
  });

  const { data: activityData } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/activity');
        return Array.isArray(res.data) ? res.data : res.data?.activities || [];
      } catch {
        return [];
      }
    },
    staleTime: 20_000,
  });

  const funnel = analytics?.funnel || {
    totalBookings: 0,
    approvedBookings: 0,
    paidBookings: 0,
    conversionRate: 0,
  };

  const totalProperties = stats?.totalProperties ?? 0;
  const totalLandlords = stats?.totalLandlords ?? 0;
  const totalUsers = stats?.totalUsers ?? 0;
  const totalTenants = Math.max(0, totalUsers - totalLandlords);
  const totalBookings = funnel.totalBookings ?? 0;
  const totalRevenueGhs = analytics?.totalRevenueGhs ?? 0;

  // Build chart data strictly from real API trends
  const chartData = useMemo(() => {
    const apiTrends = analytics?.monthlyTrends || [];
    if (!Array.isArray(apiTrends) || apiTrends.length === 0) {
      return [];
    }

    const mapped = apiTrends.map((t: any, idx: number) => {
      const revenue = Number(t.revenueGhs ?? t.revenue ?? 0);
      const bookings = Number(t.bookings ?? t.count ?? 0);
      const users = Number(
        t.users ?? (Number(t.tenants ?? 0) + Number(t.landlords ?? 0))
      );
      return {
        month: t.month || `M${idx + 1}`,
        revenue,
        lastPeriodRevenue: 0,
        bookings,
        lastPeriodBookings: 0,
        users,
        lastPeriodUsers: 0,
      };
    });

    if (period === 'Last 6 Months') return mapped.slice(-6);
    if (period === 'Last 30 Days') return mapped.slice(-4);
    return mapped;
  }, [analytics, period]);

  const topLandlords = useMemo(() => {
    const apiLandlords = analytics?.topLandlords || [];
    if (!Array.isArray(apiLandlords) || apiLandlords.length === 0) {
      return [];
    }
    return apiLandlords.slice(0, 3).map((l: any, i: number) => ({
      id: l.landlordId || l.id || `ll-${i}`,
      name: l.name || 'Verified Landlord',
      revenue: Number(l.totalEarningsGhs ?? l.revenue ?? 0),
      avatar: l.avatarUrl || '/images/messages/chelsea-avatar.png',
    }));
  }, [analytics]);

  const propertyPerformance = useMemo(() => {
    const apiProps = analytics?.propertyPerformance || [];
    return Array.isArray(apiProps) ? apiProps : [];
  }, [analytics]);

  const recentActivity = useMemo(() => {
    if (!Array.isArray(activityData) || activityData.length === 0) {
      return [];
    }
    return activityData.slice(0, 3).map((item: any, idx: number) => {
      const mins = Math.max(1, Math.floor((Date.now() - new Date(item.createdAt).getTime()) / 60000));
      const timeAgo = mins < 60 ? `${mins} mins ago` : `${Math.floor(mins / 60)}h ago`;
      return {
        id: item.id || `act-${idx}`,
        title: item.title || 'Platform event logged',
        timeAgo,
        type: idx === 0 ? 'booking' : idx === 1 ? 'review' : 'user',
      };
    });
  }, [activityData]);

  const handleExportCSV = () => {
    const headers = ['Month', 'This Period Revenue (GHC)', 'Last Period Revenue (GHC)', 'Bookings', 'Users'];
    const rows = chartData.map((r) => [r.month, r.revenue, r.lastPeriodRevenue, r.bookings, r.users]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `akwaaba_platform_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setExportMenuOpen(false);
    toast.success('Analytics report exported as CSV.');
  };

  const handleExportJSON = () => {
    const json = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify({ period, summary: { totalProperties, totalTenants, totalBookings, totalRevenueGhs }, chartData }, null, 2)
    )}`;
    const link = document.createElement('a');
    link.setAttribute('href', json);
    link.setAttribute('download', `akwaaba_platform_analytics_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setExportMenuOpen(false);
    toast.success('Analytics report exported as JSON.');
  };

  if (isLoading) {
    return (
      <div className="min-h-[420px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <p className="text-xs font-semibold text-zinc-500">Aggregating real-time platform analytics...</p>
      </div>
    );
  }

  const metricConfig = {
    revenue: {
      currentKey: 'revenue',
      prevKey: 'lastPeriodRevenue',
      formatter: (v: number) => `GH₵ ${v.toLocaleString()}`,
      yTick: (v: number) => (v === 0 ? '0' : `${Math.round(v / 1000)}K`),
    },
    bookings: {
      currentKey: 'bookings',
      prevKey: 'lastPeriodBookings',
      formatter: (v: number) => `${v} bookings`,
      yTick: (v: number) => `${v}`,
    },
    users: {
      currentKey: 'users',
      prevKey: 'lastPeriodUsers',
      formatter: (v: number) => `${v} users`,
      yTick: (v: number) => `${v}`,
    },
  }[activeMetric];

  return (
    <div className="space-y-5 pb-14">
      {/* ── 1. HEADER & PERIOD/EXPORT CONTROLS ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#EBF9F0] via-[#E6F7EC] to-[#EBF9F0] dark:from-[#062919] dark:via-[#052014] dark:to-[#041a10] border border-[#D4F2DE] dark:border-emerald-900/40 px-6 py-5 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        {/* Subtle cityscape watermark on right */}
        <img
          src="/images/about/terms-accra-skyline.png"
          alt=""
          className="absolute right-12 bottom-0 h-full w-auto max-w-[360px] object-contain opacity-25 dark:opacity-15 pointer-events-none select-none hidden md:block"
        />

        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Platform Analytics
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-medium mt-1">
            Get real-time insights into your platform&apos;s performance and growth.
          </p>
        </div>

        {/* Right Controls */}
        <div className="relative z-20 flex flex-wrap items-center gap-2.5">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            title="Refresh metrics"
            className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <RefreshCw className={clsx('w-4 h-4', isRefetching && 'animate-spin text-[#16A34A]')} />
          </button>

          {/* Period Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPeriodMenuOpen((p) => !p)}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2 shadow-2xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>{period}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {periodMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setPeriodMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1 z-30 text-xs">
                  {(['Last 12 Months', 'Last 6 Months', 'Last 30 Days'] as PeriodOption[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setPeriod(opt);
                        setPeriodMenuOpen(false);
                      }}
                      className={clsx(
                        'w-full text-left px-3.5 py-2 font-semibold transition cursor-pointer',
                        period === opt
                          ? 'text-[#16A34A] bg-emerald-50/70 dark:bg-emerald-950/40'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Export Report Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((p) => !p)}
              className="px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <span>Export Report</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1 z-30 text-xs">
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="w-full text-left px-3.5 py-2 font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span>Export CSV (.csv)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="w-full text-left px-3.5 py-2 font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-500" />
                    <span>Export JSON (.json)</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. FOUR PASTEL KPI STAT CARDS WITH SPARKLINES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Properties */}
        <div className="relative overflow-hidden rounded-2xl bg-[#EDF9F0] dark:bg-emerald-950/30 border border-[#D8F3E0] dark:border-emerald-900/40 p-4 sm:p-5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#D1F2DC] dark:bg-emerald-900/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Total Properties
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {totalProperties}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end justify-between h-full">
            <span className="inline-flex items-center text-[#16A34A] text-xs font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <ArrowUpRight className="w-3.5 h-3.5 -ml-1.5" />
            </span>
            <svg className="w-20 h-9 mt-2" viewBox="0 0 80 35" fill="none">
              <path d="M2 30 C16 28, 22 18, 36 22 C50 26, 62 12, 78 6 L78 35 L2 35 Z" fill="#16A34A" fillOpacity="0.18" />
              <path d="M2 30 C16 28, 22 18, 36 22 C50 26, 62 12, 78 6" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 2: Total Tenants */}
        <div className="relative overflow-hidden rounded-2xl bg-[#ECF4FE] dark:bg-blue-950/30 border border-[#D6E8FD] dark:border-blue-900/40 p-4 sm:p-5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#D6E8FD] dark:bg-blue-900/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Total Tenants
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-zinc-900 dark:text-white leading-tight">
                  {totalTenants}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end justify-between h-full">
            <span className="inline-flex items-center text-[#16A34A] text-xs font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <ArrowUpRight className="w-3.5 h-3.5 -ml-1.5" />
            </span>
            <svg className="w-20 h-9 mt-2" viewBox="0 0 80 35" fill="none">
              <path d="M2 32 C18 29, 28 20, 42 23 C56 26, 66 10, 78 5 L78 35 L2 35 Z" fill="#2563EB" fillOpacity="0.18" />
              <path d="M2 32 C18 29, 28 20, 42 23 C56 26, 66 10, 78 5" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 3: Total Bookings */}
        <div className="relative overflow-hidden rounded-2xl bg-[#FEF3EC] dark:bg-amber-950/30 border border-[#FDE2D2] dark:border-amber-900/40 p-4 sm:p-5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#FCE3D2] dark:bg-amber-900/60 text-[#F97316] dark:text-amber-400 flex items-center justify-center shrink-0">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Total Bookings
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black text-zinc-900 dark:text-white leading-tight">
                  {totalBookings}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end justify-between h-full">
            <span className="inline-flex items-center text-[#F97316] text-xs font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <ArrowUpRight className="w-3.5 h-3.5 -ml-1.5" />
            </span>
            <svg className="w-20 h-9 mt-2" viewBox="0 0 80 35" fill="none">
              <path d="M2 31 C16 26, 26 22, 40 16 C56 10, 68 14, 78 4 L78 35 L2 35 Z" fill="#F97316" fillOpacity="0.18" />
              <path d="M2 31 C16 26, 26 22, 40 16 C56 10, 68 14, 78 4" stroke="#F97316" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 4: Total Revenue */}
        <div className="relative overflow-hidden rounded-2xl bg-[#F5EEFE] dark:bg-purple-950/30 border border-[#EBDCFB] dark:border-purple-900/40 p-4 sm:p-5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-[#EBD9FC] dark:bg-purple-900/60 text-[#9333EA] dark:text-purple-400 flex items-center justify-center shrink-0">
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Total Revenue
              </span>
              <span className="block text-xl sm:text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {formatGhc(totalRevenueGhs)}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end justify-between h-full">
            <span className="inline-flex items-center text-[#9333EA] text-xs font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <ArrowUpRight className="w-3.5 h-3.5 -ml-1.5" />
            </span>
            <svg className="w-20 h-9 mt-2" viewBox="0 0 80 35" fill="none">
              <path d="M2 30 C16 25, 28 24, 42 18 C55 12, 66 15, 78 5 L78 35 L2 35 Z" fill="#9333EA" fillOpacity="0.18" />
              <path d="M2 30 C16 25, 28 24, 42 18 C55 12, 66 15, 78 5" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── 3. MIDDLE ROW: REVENUE OVERVIEW (8 COLS) + KEY INSIGHTS (4 COLS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Revenue Overview Card */}
        <div className="lg:col-span-8 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <BarChart3 className="w-5 h-5 text-[#16A34A]" />
              <h2 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white">
                Revenue Overview
              </h2>
            </div>

            {/* Center Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                <span>This Period</span>
              </span>
              <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-[#86EFAC]" />
                <span>Last Period</span>
              </span>
            </div>

            {/* Metric Switcher Pills */}
            <div className="inline-flex items-center p-1 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/60">
              {(['revenue', 'bookings', 'users'] as ChartMetric[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setActiveMetric(m)}
                  className={clsx(
                    'px-3.5 py-1 rounded-full text-xs font-bold capitalize transition cursor-pointer',
                    activeMetric === m
                      ? 'bg-[#16A34A] text-white shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="thisPeriodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="lastPeriodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#86EFAC" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#86EFAC" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" strokeOpacity={0.5} />
                <XAxis
                  dataKey="month"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={metricConfig.yTick}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    metricConfig.formatter(Number(value)),
                    name === metricConfig.currentKey ? 'This Period' : 'Last Period',
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e4e4e7',
                    borderRadius: '0.85rem',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    color: '#18181b',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={metricConfig.prevKey}
                  stroke="#86EFAC"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#lastPeriodGrad)"
                  dot={{ r: 3, fill: '#86EFAC', strokeWidth: 0 }}
                />
                <Area
                  type="monotone"
                  dataKey={metricConfig.currentKey}
                  stroke="#16A34A"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#thisPeriodGrad)"
                  dot={{ r: 3.5, fill: '#16A34A', stroke: '#ffffff', strokeWidth: 1.5 }}
                  activeDot={{ r: 6, fill: '#16A34A', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Insights Card */}
        <div className="lg:col-span-4 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 sm:p-6 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-[#16A34A]" />
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
                Key Insights
              </h2>
            </div>
            <Link
              href="/admin/transactions"
              className="text-xs font-bold text-[#16A34A] hover:underline flex items-center gap-1"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-center">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-[#E7F8ED] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-white">
                  Platform Revenue
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  Total verified revenue is {formatGhc(totalRevenueGhs)} for {period.toLowerCase()}.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-[#E8F2FE] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-white">
                  Tenant Footprint
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  {totalTenants} registered {totalTenants === 1 ? 'tenant' : 'tenants'} across {totalProperties} {totalProperties === 1 ? 'property' : 'properties'}.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-[#FEF3E6] dark:bg-amber-950/60 text-[#F97316] dark:text-amber-400 flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-white">
                  Booking Conversion
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  Current conversion rate is {funnel.conversionRate ?? 0}% across {totalBookings} {totalBookings === 1 ? 'booking' : 'bookings'}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. BOTTOM 3-COLUMN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Card 1: Property Performance */}
        <div className="lg:col-span-4 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#16A34A]" />
              <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white">
                Property Performance
              </h3>
            </div>
            <Link
              href="/admin/properties"
              className="text-xs font-bold text-[#16A34A] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {propertyPerformance.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 py-6 text-center">
                No property performance data yet.
              </p>
            ) : (
              propertyPerformance.map((prop: any) => (
                <div key={prop.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={prop.image || '/images/resident/prop-kimo.jpg'}
                      alt={prop.name}
                      className="w-14 h-10 rounded-lg object-cover shrink-0 bg-zinc-100 dark:bg-zinc-800"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-zinc-900 dark:text-white truncate">
                        {prop.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {prop.bookings} bookings • {formatGhc(prop.revenue)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-16 h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#16A34A]"
                        style={{ width: `${prop.occupancy}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 w-8 text-right">
                      {prop.occupancy}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 2: Top Landlords by Revenue */}
        <div className="lg:col-span-4 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#16A34A]" />
              <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white">
                Top Landlords by Revenue
              </h3>
            </div>
            <Link
              href="/admin/landlords"
              className="text-xs font-bold text-[#16A34A] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {topLandlords.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 py-6 text-center">
                No landlord revenue recorded yet.
              </p>
            ) : (
              topLandlords.map((ll: any, idx: number) => {
                const medalStyle =
                  idx === 0
                    ? 'bg-amber-100 text-amber-700 border-amber-300'
                    : idx === 1
                    ? 'bg-zinc-100 text-zinc-600 border-zinc-300'
                    : 'bg-orange-100 text-orange-700 border-orange-300';

                return (
                  <div key={ll.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={clsx(
                          'w-6 h-6 rounded-full border text-[11px] font-black flex items-center justify-center shrink-0',
                          medalStyle
                        )}
                      >
                        {idx + 1}
                      </span>
                      <img
                        src={ll.avatar}
                        alt={ll.name}
                        className="w-9 h-9 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-800 shrink-0"
                      />
                      <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                        {ll.name}
                      </span>
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-[#16A34A] whitespace-nowrap">
                      {formatGhc(ll.revenue)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Card 3: Platform Activity */}
        <div className="lg:col-span-4 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#16A34A]" />
              <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white">
                Platform Activity
              </h3>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E7F8ED] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
              <span>Live</span>
            </span>
          </div>

          <div className="relative pl-5 space-y-4 before:content-[''] before:absolute before:left-[6px] before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-100 dark:before:bg-emerald-900/40">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 py-4">
                No recent platform activity.
              </p>
            ) : (
              recentActivity.map((act: any) => {
                const IconComp =
                  act.type === 'booking'
                    ? CalendarCheck
                    : act.type === 'review'
                    ? Star
                    : UserPlus;

                return (
                  <div key={act.id} className="relative flex items-center gap-3">
                    <span className="absolute -left-[18px] w-2.5 h-2.5 rounded-full bg-[#16A34A] ring-4 ring-white dark:ring-[#141816]" />
                    <div className="w-9 h-9 rounded-xl bg-[#E7F8ED] dark:bg-emerald-950/50 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                        {act.title}
                      </p>
                      <p className="text-[11px] text-zinc-500">{act.timeAgo}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── 5. BOTTOM GROWTH CTA BANNER REMOVED ── */}
    </div>
  );
}
