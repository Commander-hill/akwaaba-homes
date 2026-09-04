'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, 
  TrendingUp, 
  Users, 
  Building2, 
  CreditCard, 
  Award, 
  MapPin, 
  ArrowUpRight, 
  ShieldCheck, 
  RefreshCw, 
  BarChart3, 
  PieChart, 
  Layers,
  Banknote,
  FileText,
  BadgeCheck,
  CheckCircle,
  Home,
  Clock
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

// Format currency in GH₵
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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-[#0F5132]" />
        <p className="text-sm font-semibold text-slate-500">Loading macroeconomic platform analytics...</p>
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
    <div className="space-y-7 pb-12 animate-in">
      {/* ─── HEADER CONTAINER ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              Ghanaian PropTech & Act 220 Insights
            </span>
            <span className="text-xs font-semibold text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Executive Intelligence Hub
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Platform Analytics & Insights Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Macroeconomic oversight of residential lease volume, tenant-to-landlord growth, Act 220 tenancy deed compliance, and regional property density across Ghana.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer text-slate-700 dark:text-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-[#0F5132]' : ''}`} />
            <span>Refresh Metrics</span>
          </button>
        </div>
      </div>

      {/* ─── 4-CARD EXECUTIVE MACRO METRIC STRIP ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Platform Volume */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-xs">
          <div className="flex justify-between items-center text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Escrow Volume
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F5132] dark:text-emerald-400 mb-1">
            {formatGhc(analytics?.totalRevenueGhs || 0)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Verified payments via MoMo & Paystack
          </p>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Lease Conversion Rate
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {funnel.conversionRate}%
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#0F5132] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, funnel.conversionRate)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {funnel.paidBookings} completed of {funnel.totalBookings} total requests
          </p>
        </div>

        {/* Act 220 Tenancy Deed Rate */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-center text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Act 220 Deed Execution
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {deedExecutionRate}%
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Leases with executed tenancy deeds
          </p>
        </div>

        {/* Top Property Hub */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex justify-between items-center text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Top Metropolitan Market
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white truncate mb-1">
            {geographicalDensity[0]?.region || 'Greater Accra'}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {geographicalDensity[0]?.propertyCount || 0} active rental listings
          </p>
        </div>
      </div>

      {/* ─── MAIN CHARTS: GROWTH TRAJECTORY & TENANCY PIPELINE ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Growth & Platform Revenue Area Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                Platform Growth & User Acquisition
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monthly verified residential tenants vs registered landlords.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-extrabold">
              <span className="flex items-center gap-1.5 text-[#0F5132] dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F5132]" />
                Tenants
              </span>
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Landlords
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrends}>
                <defs>
                  <linearGradient id="colorTenantsGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0F5132" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0F5132" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLandlordsGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="tenants" 
                  name="Tenants"
                  stroke="#0F5132" 
                  fillOpacity={1} 
                  fill="url(#colorTenantsGreen)" 
                  strokeWidth={2.5} 
                />
                <Area 
                  type="monotone" 
                  dataKey="landlords" 
                  name="Landlords"
                  stroke="#D97706" 
                  fillOpacity={1} 
                  fill="url(#colorLandlordsGold)" 
                  strokeWidth={2.5} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tenancy Pipeline & Booking Funnel (1 Col) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#0F5132]" />
              Tenancy Funnel Pipeline
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Fulfillment lifecycle from reservation request to escrow settlement.
            </p>
          </div>

          <div className="space-y-3.5">
            {/* Step 1: Inquiries / Created */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>1. Reservations Initiated</span>
                <span className="font-mono text-[#0F5132] dark:text-emerald-400 font-extrabold">
                  {funnel.totalBookings}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div className="bg-[#0F5132] h-full w-full rounded-full" />
              </div>
            </div>

            {/* Step 2: Landlord Approved */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>2. Landlord Approved</span>
                <span className="font-mono text-blue-600 dark:text-blue-400 font-extrabold">
                  {funnel.approvedBookings}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{ width: `${funnel.totalBookings > 0 ? (funnel.approvedBookings / funnel.totalBookings) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Step 3: Completed & Paid */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>3. Escrow Paid & Stamped</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">
                  {funnel.paidBookings}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all"
                  style={{ width: `${funnel.totalBookings > 0 ? (funnel.paidBookings / funnel.totalBookings) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-xl text-center">
            <span className="text-xs font-black text-[#0F5132] dark:text-emerald-300">
              ⚡ {funnel.conversionRate}% End-to-End Tenancy Efficiency
            </span>
          </div>
        </div>
      </div>

      {/* ─── LOWER SECTION: REGIONAL PROPERTY DENSITY & TOP LANDLORDS ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Real Estate Distribution */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#0F5132]" />
              Metropolitan Property Distribution
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active residential rental listings across Ghana&apos;s prime metropolitan regions.
            </p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={geographicalDensity} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="region" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Bar 
                  dataKey="propertyCount" 
                  name="Properties" 
                  fill="#0F5132" 
                  radius={[8, 8, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Performing Landlords Leaderboard */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Top Landlord Portfolios by Escrow Volume
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Verified landlords with highest fulfilled tenancy payouts on Akwaaba Homes.
            </p>
          </div>

          <div className="space-y-3 pt-1">
            {topLandlords.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold">No landlord transaction revenue recorded yet.</p>
              </div>
            ) : (
              topLandlords.map((landlord: any, index: number) => (
                <div
                  key={landlord.landlordId || index}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between hover:border-slate-300 transition-all shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                      index === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                      index === 1 ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200' :
                      'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                    }`}>
                      #{index + 1}
                    </div>

                    <div>
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{landlord.name}</span>
                        {landlord.isVerified && (
                          <span title="Act 220 Verified Landlord">
                            <BadgeCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {landlord.email}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-black text-sm text-[#0F5132] dark:text-emerald-400">
                      {formatGhc(landlord.totalEarningsGhs)}
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Total Escrow
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── INVENTORY CATEGORY MIX STRIP ─────────────────────────────────── */}
      {categoryMix.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#0F5132]" />
                Residential Inventory Mix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Breakdown of active properties listed across Ghanaian residential categories.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categoryMix.map((cat: any) => (
              <div
                key={cat.name}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60"
              >
                <span className="text-xs font-bold text-slate-400 block mb-1">
                  {cat.name}
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white">
                  {cat.count}
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  Listed Units
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
