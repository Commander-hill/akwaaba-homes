'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  TrendingUp,
  Banknote,
  FileCheck,
  Award,
  RefreshCw,
  Loader2,
  Building,
  MapPin,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatCard from '@/components/admin/AdminStatCard';

const formatGhc = (amount: number | null | undefined) => {
  return `GH₵ ${Number(amount || 0).toLocaleString()}`;
};

export default function AdminAnalyticsPage() {
  const { data: analytics, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-semibold text-zinc-500">Computing platform macroeconomic metrics from database timestamps...</p>
      </div>
    );
  }

  const funnel = analytics?.funnel || { totalBookings: 0, approvedBookings: 0, paidBookings: 0, conversionRate: 0 };
  const topLandlords = analytics?.topLandlords || [];
  const geographicalDensity = analytics?.geographicalDensity || [];
  const monthlyTrends = analytics?.monthlyTrends || [];
  const categoryMix = analytics?.categoryMix || [];
  const deedExecutionRate = analytics?.deedExecutionRate ?? 100;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Macroeconomic Platform Analytics & Intelligence"
        subtitle="Real-time aggregation of residential lease conversion, escrow velocity, regional inventory density, and category performance."
        badge={
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Database Aggregated
          </span>
        }
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Insights', href: '/admin/analytics' },
          { label: 'Platform Analytics' }
        ]}
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="px-3.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-emerald-600' : ''}`} />
            Refresh Metrics
          </button>
        }
      />

      {/* 4-Card Macro Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title="Total Escrow Volume"
          value={formatGhc(analytics?.totalRevenueGhs || 0)}
          subtitle="Processed via Paystack & MoMo"
          icon={Banknote}
        />
        <AdminStatCard
          title="Lease Conversion"
          value={`${funnel.conversionRate}%`}
          subtitle={`${funnel.paidBookings} paid of ${funnel.totalBookings} requests`}
          icon={TrendingUp}
        />
        <AdminStatCard
          title="Deed Execution Rate"
          value={`${deedExecutionRate}%`}
          subtitle="Tenancies with digital deed signed"
          icon={FileCheck}
        />
        <AdminStatCard
          title="Top Landlord Volume"
          value={topLandlords.length > 0 ? formatGhc(topLandlords[0].revenue) : 'GH₵ 0'}
          subtitle={topLandlords.length > 0 ? `Host: ${topLandlords[0].name}` : 'No volume recorded'}
          icon={Award}
        />
      </div>

      {/* 6-Month Growth & Conversion Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 6-Month Booking & Escrow Trajectory (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              6-Month Tenancy Escrow Volume (GH₵)
            </h3>
            <span className="text-[11px] font-semibold text-zinc-400">Authentic Timestamps</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="escrowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" strokeOpacity={0.4} />
                <XAxis dataKey="month" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `GH₵${v}`} />
                <Tooltip
                  formatter={(value: any) => [`GH₵ ${Number(value).toLocaleString()}`, 'Escrow Volume']}
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#fff', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#escrowGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Regional Geographic Density (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Regional Inventory Density
            </h3>
            <span className="text-[11px] font-semibold text-zinc-400">Ghana Metros</span>
          </div>

          <div className="space-y-3">
            {geographicalDensity.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center italic">No regional inventory data available</p>
            ) : (
              geographicalDensity.slice(0, 5).map((region: any, idx: number) => {
                const totalProps = geographicalDensity.reduce((acc: number, r: any) => acc + (r.count || 0), 0) || 1;
                const percentage = Math.round(((region.count || 0) / totalProps) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-zinc-800 dark:text-zinc-200">{region.location || 'Accra'}</span>
                      <span className="font-mono text-zinc-500">{region.count} units ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Category Mix & Top Landlords */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            Property Type Distribution
          </h3>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryMix}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" strokeOpacity={0.4} />
                <XAxis dataKey="type" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '0.75rem', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performing Landlords (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-600" />
            Top Landlords by Settlement Revenue
          </h3>

          <div className="space-y-3">
            {topLandlords.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center italic">No landlord transaction history yet</p>
            ) : (
              topLandlords.map((l: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-xs text-zinc-900 dark:text-white">{l.name}</div>
                      <span className="text-[10px] text-zinc-400">{l.isVerified ? '✓ Verified Host' : 'Host'}</span>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                    {formatGhc(l.revenue)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
