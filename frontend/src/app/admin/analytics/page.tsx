'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, TrendingUp, Users, Building2, CreditCard, Award, MapPin, ArrowUpRight, ShieldCheck, RefreshCw, BarChart3, PieChart, Layers } from 'lucide-react';
import SkeletonTable from '@/components/SkeletonTable';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

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
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  const funnel = analytics?.funnel || { totalBookings: 0, approvedBookings: 0, paidBookings: 0, conversionRate: 0 };
  const topLandlords = analytics?.topLandlords || [];
  const geographicalDensity = analytics?.geographicalDensity || [];
  const monthlyTrends = analytics?.monthlyTrends || [];

  return (
    <div className="space-y-8 pb-12 animate-in fade-in">
      
      {/* ── Top Header Banner ── */}
      <div className="glass-card p-6 rounded-3xl border border-[var(--border)] bg-gradient-to-r from-purple-900/20 via-indigo-900/10 to-sky-900/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
            <BarChart3 className="w-4 h-4" /> Executive Intelligence &amp; Platform Metrics
          </div>
          <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">
            Platform Analytics &amp; Insights Hub
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Data-driven performance metrics: user growth, regional hostel density, funnel conversion, and landlord revenue distribution.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh Metrics
        </button>
      </div>

      {/* ── Metric Cards Ribbon ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Booking Conversion Rate */}
        <div className="glass-card p-5 rounded-2xl border border-[var(--border)] space-y-3">
          <div className="flex justify-between items-center text-[var(--muted-foreground)]">
            <span className="text-[10px] font-black uppercase tracking-wider">Conversion Rate</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-[var(--foreground)]">
            {funnel.conversionRate}%
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, funnel.conversionRate)}%` }}
            />
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            {funnel.paidBookings} paid of {funnel.totalBookings} total booking requests
          </p>
        </div>

        {/* Total Platform Volume */}
        <div className="glass-card p-5 rounded-2xl border border-[var(--border)] space-y-3">
          <div className="flex justify-between items-center text-[var(--muted-foreground)]">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Platform Volume</span>
            <CreditCard className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-3xl font-black text-sky-600 dark:text-sky-400">
            GHS {(analytics?.totalRevenueGhs || 0).toLocaleString()}
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            Verified payments via Paystack gateway
          </p>
        </div>

        {/* Total Approved Bookings */}
        <div className="glass-card p-5 rounded-2xl border border-[var(--border)] space-y-3">
          <div className="flex justify-between items-center text-[var(--muted-foreground)]">
            <span className="text-[10px] font-black uppercase tracking-wider">Approved Bookings</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-black text-purple-600 dark:text-purple-400">
            {funnel.approvedBookings}
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            Hostel slots verified by landlords
          </p>
        </div>

        {/* Top Region Density */}
        <div className="glass-card p-5 rounded-2xl border border-[var(--border)] space-y-3">
          <div className="flex justify-between items-center text-[var(--muted-foreground)]">
            <span className="text-[10px] font-black uppercase tracking-wider">Top Property Hub</span>
            <MapPin className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 truncate">
            {geographicalDensity[0]?.region || 'UCC / Cape Coast'}
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            {geographicalDensity[0]?.propertyCount || 0} active listed properties
          </p>
        </div>

      </div>

      {/* ── Main Charts Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Chart 1: Revenue & Monthly Growth Area Chart (2 Cols) */}
        <div className="lg:col-span-2 glass-card p-6 rounded-3xl border border-[var(--border)] space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-lg text-[var(--foreground)]">Growth &amp; Revenue Trends</h3>
              <p className="text-xs text-[var(--muted-foreground)]">Monthly user acquisition vs platform revenue trajectory.</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="flex items-center gap-1 text-indigo-500"><span className="w-3 h-3 rounded-full bg-indigo-500 inline-block"/> Tenants</span>
              <span className="flex items-center gap-1 text-purple-500"><span className="w-3 h-3 rounded-full bg-purple-500 inline-block"/> Landlords</span>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="colorTenants" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLandlords" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" stroke="#888888" fontSize={11} />
                <YAxis stroke="#888888" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Area type="monotone" dataKey="tenants" stroke="#6366f1" fillOpacity={1} fill="url(#colorTenants)" strokeWidth={2} />
                <Area type="monotone" dataKey="landlords" stroke="#a855f7" fillOpacity={1} fill="url(#colorLandlords)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Booking Conversion Funnel (1 Col) */}
        <div className="glass-card p-6 rounded-3xl border border-[var(--border)] space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-lg text-[var(--foreground)] flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" /> Booking Funnel Pipeline
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Lifecycle conversion of student booking requests.</p>
          </div>

          <div className="space-y-4">
            {/* Step 1: Created */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-[var(--foreground)]">
                <span>1. Requests Created</span>
                <span className="font-mono text-indigo-500">{funnel.totalBookings}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full w-full rounded-full" />
              </div>
            </div>

            {/* Step 2: Approved */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-[var(--foreground)]">
                <span>2. Landlord Approved</span>
                <span className="font-mono text-purple-500">{funnel.approvedBookings}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${funnel.totalBookings > 0 ? (funnel.approvedBookings / funnel.totalBookings) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Step 3: Paid */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold text-[var(--foreground)]">
                <span>3. Completed &amp; Paid</span>
                <span className="font-mono text-emerald-500">{funnel.paidBookings}</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${funnel.totalBookings > 0 ? (funnel.paidBookings / funnel.totalBookings) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
              ⚡ {funnel.conversionRate}% End-to-End Conversion Efficiency
            </span>
          </div>
        </div>

      </div>

      {/* ── Lower Row: Geographical Density & Top Landlords ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Regional Density Bar Chart */}
        <div className="glass-card p-6 rounded-3xl border border-[var(--border)] space-y-4">
          <div>
            <h3 className="font-extrabold text-lg text-[var(--foreground)] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-sky-500" /> Geographical Property Density
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Property listing distribution across major university towns in Ghana.</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={geographicalDensity}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="region" stroke="#888888" fontSize={10} />
                <YAxis stroke="#888888" fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="propertyCount" fill="#0284c7" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Landlords Leaderboard */}
        <div className="glass-card p-6 rounded-3xl border border-[var(--border)] space-y-4">
          <div>
            <h3 className="font-extrabold text-lg text-[var(--foreground)] flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" /> Top 5 Revenue Generating Landlords
            </h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">Landlords with highest verified booking revenues on Akwaaba Homes.</p>
          </div>

          {topLandlords.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--muted-foreground)]">
              No revenue transactions recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {topLandlords.map((landlord: any) => {
                const rankIcons = ['🥇', '🥈', '🥉'];
                const rankIcon = rankIcons[landlord.rank - 1] || `#${landlord.rank}`;

                return (
                  <div
                    key={landlord.landlordId || landlord.rank}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between transition-all hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center font-bold text-lg">
                        {rankIcon}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-[var(--foreground)]">{landlord.name}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">{landlord.email}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                        GHS {landlord.totalEarningsGhs.toLocaleString()}
                      </div>
                      <div className="text-[9px] uppercase font-bold tracking-wider text-[var(--muted-foreground)]">
                        Total Volume
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
