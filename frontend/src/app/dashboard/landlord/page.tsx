'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import { DashboardOverviewSkeleton } from '@/components/ui/PageSkeletons';
import {
  Home,
  CalendarCheck,
  Wallet,
  CreditCard,
  ArrowRight,
  MapPin,
  Eye,
  Settings,
  ShieldCheck,
  Crown,
  Activity,
  Plus,
  Building2,
} from 'lucide-react';

function RollingWaves({ color, darkColor }: { color: string; darkColor: string }) {
  return (
    <svg
      className="absolute bottom-0 left-0 right-0 w-full h-8 pointer-events-none"
      viewBox="0 0 320 40"
      preserveAspectRatio="none"
    >
      <path
        d="M0,26 C40,12 80,32 120,18 C160,8 200,28 240,16 C270,6 295,22 320,18 L320,40 L0,40 Z"
        fill={color}
        fillOpacity="0.55"
      />
      <path
        d="M0,32 C45,20 90,36 140,24 C190,14 235,32 275,22 C295,16 310,24 320,22 L320,40 L0,40 Z"
        fill={darkColor}
        fillOpacity="0.5"
      />
    </svg>
  );
}

function GoldCrownGraphic({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="goldLight" x1="80" y1="20" x2="80" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF59D" />
          <stop offset="30%" stopColor="#FFD54F" />
          <stop offset="65%" stopColor="#FFA000" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
        <linearGradient id="goldDark" x1="20" y1="20" x2="140" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="50%" stopColor="#FFCA28" />
          <stop offset="100%" stopColor="#FF8F00" />
        </linearGradient>
        <filter id="crownGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#92400E" floodOpacity="0.35" />
        </filter>
      </defs>
      <circle cx="34" cy="34" r="2.5" fill="#FFF9C4" />
      <circle cx="128" cy="30" r="2" fill="#FFF9C4" />
      <circle cx="24" cy="80" r="2" fill="#FFE082" />
      <circle cx="136" cy="75" r="2.5" fill="#FFE082" />
      <path d="M120 42L122 46L126 48L122 50L120 54L118 50L114 48L118 46L120 42Z" fill="#FFF59D" />
      <g filter="url(#crownGlow)" transform="rotate(-12 80 70)">
        <path
          d="M36 96L28 48L56 68L80 34L104 68L132 48L124 96H36Z"
          fill="url(#goldLight)"
          stroke="#FFF59D"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M56 68L80 34L104 68L80 96L56 68Z" fill="url(#goldDark)" fillOpacity="0.45" />
        <rect x="34" y="96" width="92" height="12" rx="6" fill="url(#goldLight)" stroke="#FFF59D" strokeWidth="1.5" />
        <circle cx="28" cy="45" r="5" fill="#FFF59D" />
        <circle cx="80" cy="31" r="6" fill="#FFF59D" />
        <circle cx="132" cy="45" r="5" fill="#FFF59D" />
        <circle cx="80" cy="78" r="5" fill="#FFF9C4" />
        <circle cx="54" cy="83" r="3" fill="#FFF9C4" />
        <circle cx="106" cy="83" r="3" fill="#FFF9C4" />
      </g>
    </svg>
  );
}

function formatTimeAgo(iso?: string): string {
  if (!iso) return 'Recently';
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function LandlordDashboardPage() {
  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
    staleTime: 60_000,
  });

  const { data: propertiesData, isLoading: propsLoading } = useQuery({
    queryKey: ['landlord-properties'],
    queryFn: async () => {
      const res = await api.get('/properties/landlord/mine');
      const d = res.data;
      return Array.isArray(d) ? d : Array.isArray(d?.properties) ? d.properties : [];
    },
  });

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ['landlord-bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings/landlord');
      const d = res.data;
      return Array.isArray(d) ? d : Array.isArray(d?.bookings) ? d.bookings : [];
    },
  });

  const { data: payoutData } = useQuery({
    queryKey: ['payouts', 'history'],
    queryFn: async () => {
      try {
        const res = await api.get('/payouts/history');
        return res.data;
      } catch {
        return null;
      }
    },
  });

  const user = meData?.user || meData || null;
  const properties: any[] = propertiesData || [];
  const bookings: any[] = bookingsData || [];
  const payouts: any[] = payoutData?.payouts || [];
  const availableBalance = Number(payoutData?.summary?.availableBalance || 0);

  const displayName = useMemo(() => {
    if (!user?.firstName) return 'Landlord';
    const lastInitial = user.lastName ? ` ${user.lastName[0]}.` : '';
    return `${user.firstName}${lastInitial}`;
  }, [user]);

  const pendingBookingsCount = useMemo(
    () => bookings.filter((b: any) => b.status === 'PENDING' || b.status === 'AWAITING_LANDLORD').length,
    [bookings],
  );

  const recentProperties = useMemo(() => properties.slice(0, 3), [properties]);

  const recentActivities = useMemo(() => {
    const items: {
      id: string;
      kind: 'BOOKING' | 'PAYOUT';
      title: string;
      subtitle: string;
      time: string;
      ts: number;
    }[] = [];

    bookings.slice(0, 4).forEach((b: any) => {
      items.push({
        id: `bk-${b.id}`,
        kind: 'BOOKING',
        title: b.status === 'PENDING' ? 'New booking request' : `Booking ${String(b.status || '').toLowerCase()}`,
        subtitle: b.property?.title || 'Property Booking',
        time: formatTimeAgo(b.createdAt),
        ts: new Date(b.createdAt || 0).getTime(),
      });
    });

    payouts.slice(0, 3).forEach((p: any) => {
      items.push({
        id: `pay-${p.id}`,
        kind: 'PAYOUT',
        title: p.status === 'COMPLETED' ? 'Payout settled' : `Payout ${String(p.status || 'pending').toLowerCase()}`,
        subtitle: `GH₵ ${Number(p.amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`,
        time: formatTimeAgo(p.createdAt),
        ts: new Date(p.createdAt || 0).getTime(),
      });
    });

    return items.sort((a, b) => b.ts - a.ts).slice(0, 3);
  }, [bookings, payouts]);

  const isVerified =
    user?.ghanaCardStatus === 'VERIFIED' || user?.landlordVerificationStatus === 'VERIFIED';

  if (meLoading && propsLoading && bookingsLoading) {
    return <DashboardOverviewSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-sm border border-emerald-950/10 min-h-[190px] sm:min-h-[210px] flex items-center bg-[#064E3B]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          decoding="async"
          src="/images/resident/landlord-dashboard-hero-bldg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-right"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, rgba(6,78,59,0.96) 0%, rgba(6,78,59,0.88) 42%, rgba(6,78,59,0.35) 75%, rgba(6,78,59,0.05) 100%)',
          }}
        />

        <div className="relative z-10 px-6 sm:px-10 py-7 max-w-xl text-white space-y-3">
          <div>
            <p className="text-xl sm:text-2xl font-light text-white/95 leading-tight">
              Welcome back,
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-0.5">
              {displayName}!
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-white/85 font-normal leading-relaxed max-w-md">
            Manage your properties, track bookings and grow your rental business.
          </p>
          <div className="pt-1">
            <Link
              href="/dashboard/landlord/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#15803D] hover:bg-[#11843b] text-white text-xs sm:text-sm font-semibold shadow-md transition-all hover:scale-102"
            >
              <span className="w-4 h-4 rounded-full bg-white text-[#15803D] flex items-center justify-center font-bold text-xs leading-none">
                +
              </span>
              <span>Add New Property</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Stat / KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <Link
          href="/dashboard/landlord/properties"
          className="relative rounded-2xl p-5 overflow-hidden bg-[#EDF9F0] border border-[#DCF5E3] shadow-2xs hover:shadow-sm transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[115px]"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#D2F5DC] text-[#15803D] flex items-center justify-center shrink-0">
              <Home className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-3xl font-extrabold text-zinc-900 leading-none">
                {properties.length}
              </span>
              <span className="block text-xs font-semibold text-zinc-700 mt-1.5 truncate">
                Total Properties
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0 mt-1 stroke-[2]" />
          </div>
          <RollingWaves color="#A7F3D0" darkColor="#4ADE80" />
        </Link>

        <Link
          href="/dashboard/landlord/bookings"
          className="relative rounded-2xl p-5 overflow-hidden bg-[#EAF3FD] border border-[#D6E8FD] shadow-2xs hover:shadow-sm transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[115px]"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#D6E8FD] text-[#2563EB] flex items-center justify-center shrink-0">
              <CalendarCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-3xl font-extrabold text-zinc-900 leading-none">
                {bookings.length}
              </span>
              <span className="block text-xs font-semibold text-zinc-700 mt-1.5 truncate">
                Total Bookings
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0 mt-1 stroke-[2]" />
          </div>
          <RollingWaves color="#BFDBFE" darkColor="#60A5FA" />
        </Link>

        <Link
          href="/dashboard/landlord/bookings?status=PENDING"
          className="relative rounded-2xl p-5 overflow-hidden bg-[#FEF7EB] border border-[#FDECCD] shadow-2xs hover:shadow-sm transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[115px]"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#FDECCD] text-[#D97706] flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-3xl font-extrabold text-zinc-900 leading-none">
                {pendingBookingsCount}
              </span>
              <span className="block text-xs font-semibold text-zinc-700 mt-1.5 truncate">
                Pending Requests
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0 mt-1 stroke-[2]" />
          </div>
          <RollingWaves color="#FDE68A" darkColor="#FBBF24" />
        </Link>

        <Link
          href="/dashboard/landlord/withdraw"
          className="relative rounded-2xl p-5 overflow-hidden bg-[#F3EEFD] border border-[#E6DBFC] shadow-2xs hover:shadow-sm transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[115px]"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#E6DBFC] text-[#7C3AED] flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-2xl sm:text-3xl font-extrabold text-zinc-900 leading-none truncate">
                GH₵ {availableBalance.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="block text-xs font-semibold text-zinc-700 mt-1.5 truncate">
                Available Balance
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0 mt-1 stroke-[2]" />
          </div>
          <RollingWaves color="#DDD6FE" darkColor="#A78BFA" />
        </Link>
      </div>

      {/* Main Grid: Left (8-cols) & Right (4-cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-6">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Home className="w-5 h-5 text-[#15803D] stroke-[2.2]" />
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                  My Properties
                </h2>
              </div>
              <Link
                href="/dashboard/landlord/properties"
                className="text-xs sm:text-sm font-semibold text-[#15803D] hover:text-[#11843b] hover:underline flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentProperties.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-[#141816] border border-zinc-200/80 dark:border-zinc-800 p-10 text-center space-y-3 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#15803D] flex items-center justify-center mx-auto">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  No properties listed yet
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                  Publish your first apartment, hostel, or residential unit to start receiving verified tenant bookings.
                </p>
                <Link
                  href="/dashboard/landlord/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#15803D] hover:bg-[#11843b] text-white text-xs font-bold shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Property</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                {recentProperties.map((prop: any) => {
                  const thumb = prop.images?.[0]?.url || prop.images?.[0] || prop.coverImage || '/images/resident/prop-kimo.jpg';
                  const locationText = [prop.address, prop.city].filter(Boolean).join(', ') || 'Ghana';
                  const priceVal = Number(prop.price || 0).toLocaleString('en-GH');
                  const unitLabel = prop.priceUnit === 'MONTHLY' ? '/ month' : prop.priceUnit === 'SEMESTER' ? '/ semester' : '/ year';
                  const statusLabel = prop.isAvailable === false ? 'Occupied' : prop.status === 'PENDING' ? 'Pending' : 'Active';

                  return (
                    <div
                      key={prop.id}
                      className="bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col group"
                    >
                      <div className="relative h-36 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          decoding="async"
                          loading="lazy"
                          src={getImageUrl(thumb)}
                          alt={prop.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#15803D] text-white text-[11px] font-semibold shadow-md">
                          {statusLabel}
                        </div>
                      </div>

                      <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-xs sm:text-[13px] font-bold text-zinc-900 dark:text-white uppercase truncate">
                            {prop.title}
                          </h3>
                          <div className="flex items-center gap-1 text-[11px] text-[#15803D] font-medium truncate">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{locationText}</span>
                          </div>
                          <div className="pt-0.5 text-xs sm:text-[13px] font-bold text-zinc-900 dark:text-white">
                            GH₵ {priceVal}{' '}
                            <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                              {unitLabel}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                          <Link
                            href={`/properties/${prop.id}`}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-zinc-200/80 dark:border-zinc-700 transition-colors shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#15803D]" />
                            <span>View</span>
                          </Link>
                          <Link
                            href={`/dashboard/landlord/properties/${prop.id}/edit`}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 border border-zinc-200/80 dark:border-zinc-700 transition-colors shadow-2xs"
                          >
                            <Settings className="w-3.5 h-3.5 text-[#15803D]" />
                            <span>Manage</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Account Verification Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-[#EDF9F2] dark:bg-emerald-950/30 border border-[#D0F2DC] dark:border-emerald-900/50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[#15803D] text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                  {isVerified ? 'Your account is verified!' : 'Complete Landlord Verification'}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                  {isVerified
                    ? 'You can receive bookings and withdraw payouts with confidence.'
                    : 'Verify your Ghana Card and property title to unlock automated payouts.'}
                </p>
              </div>
            </div>

            <div className="relative z-10 w-full sm:w-auto">
              <Link
                href="/dashboard/verification"
                className="w-full sm:w-auto px-5 py-2 rounded-full border border-[#15803D] text-[#15803D] hover:bg-emerald-50 dark:hover:bg-emerald-900/30 bg-white dark:bg-zinc-900 text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors shrink-0"
              >
                <span>View Verification Status</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              decoding="async"
              loading="lazy"
              src="/images/about/terms-accra-skyline.png"
              alt=""
              className="absolute right-0 bottom-0 h-16 opacity-20 pointer-events-none select-none"
            />
          </div>
        </div>

        {/* Right Column (4-cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Upgrade Plan Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#065F46] via-[#047857] to-[#064E3B] p-6 text-white shadow-sm">
            <div className="relative z-10 max-w-[200px] space-y-2.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-bold uppercase tracking-wider">
                <Crown className="w-3 h-3 text-amber-300" />
                <span>Pro Hosting</span>
              </div>
              <h3 className="text-lg font-extrabold leading-snug">
                Boost Your Property Visibility
              </h3>
              <p className="text-xs text-emerald-100/90 leading-relaxed">
                Unlock featured placement, priority support, and advanced analytics.
              </p>
              <Link
                href="/dashboard/landlord/subscription"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-zinc-100 text-[#15803D] font-bold text-xs shadow-md transition-all hover:scale-102"
              >
                <span>Upgrade Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 pointer-events-none select-none">
              <GoldCrownGraphic className="w-full h-full" />
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#15803D]" />
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm sm:text-base">
                  Recent Activity
                </h3>
              </div>
              <Link
                href="/dashboard/landlord/bookings"
                className="text-xs font-semibold text-[#15803D] hover:underline flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentActivities.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 py-2">
                No recent booking or payout activity yet.
              </p>
            ) : (
              <div className="space-y-3.5 pt-1">
                {recentActivities.map((act) => (
                  <div key={act.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          act.kind === 'BOOKING'
                            ? 'bg-[#EAF8F0] dark:bg-emerald-950/40 text-[#15803D]'
                            : 'bg-[#EAF3FD] dark:bg-blue-950/40 text-[#2563EB]'
                        }`}
                      >
                        {act.kind === 'BOOKING' ? (
                          <CalendarCheck className="w-4 h-4" />
                        ) : (
                          <CreditCard className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">
                          {act.title}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">
                          {act.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium shrink-0">
                      {act.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
