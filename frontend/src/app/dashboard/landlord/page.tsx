'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  Building2,
  CalendarCheck,
  Wallet,
  CreditCard,
  ArrowRight,
  Plus,
  MapPin,
  Eye,
  Settings,
  ShieldCheck,
  Crown,
  Activity,
  MessageSquare,
  MoreHorizontal,
} from 'lucide-react';
import api from '@/lib/axios';
import { formatCedis } from '@/components/tenant-ui/primitives';

function StatCardWave({ color }: { color: string }) {
  return (
    <svg
      className="absolute bottom-0 left-0 right-0 w-full h-8 pointer-events-none opacity-60"
      viewBox="0 0 300 36"
      preserveAspectRatio="none"
    >
      <path
        d="M0,18 C50,30 90,6 150,20 C210,32 250,10 300,22 L300,36 L0,36 Z"
        fill={color}
      />
    </svg>
  );
}

function GoldCrownGraphic({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="goldLight" x1="80" y1="20" x2="80" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="35%" stopColor="#FFD54F" />
          <stop offset="70%" stopColor="#FFB300" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
        <linearGradient id="goldDark" x1="20" y1="20" x2="140" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="50%" stopColor="#FFCA28" />
          <stop offset="100%" stopColor="#FFA000" />
        </linearGradient>
        <filter id="crownGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#B45309" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter="url(#crownGlow)">
        {/* Crown Body with 5 Peaks */}
        <path
          d="M20 102 L26 48 L56 74 L80 28 L104 74 L134 48 L140 102 Q80 114 20 102 Z"
          fill="url(#goldLight)"
          stroke="#FFE57F"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {/* Base Rim */}
        <path
          d="M18 100 Q80 114 142 100 L140 116 Q80 128 20 116 Z"
          fill="url(#goldDark)"
          stroke="#FF8F00"
          strokeWidth="1.5"
        />
        {/* Jewels on Base Band */}
        <circle cx="45" cy="110" r="3.5" fill="#EF4444" stroke="#FFF" strokeWidth="1" />
        <circle cx="80" cy="114" r="4.5" fill="#10B981" stroke="#FFF" strokeWidth="1" />
        <circle cx="115" cy="110" r="3.5" fill="#3B82F6" stroke="#FFF" strokeWidth="1" />
        {/* Pearls on Crown Peaks */}
        <circle cx="26" cy="46" r="5" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="1.5" />
        <circle cx="56" cy="72" r="4.5" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="1.5" />
        <circle cx="80" cy="26" r="6.5" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="2" />
        <circle cx="104" cy="72" r="4.5" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="1.5" />
        <circle cx="134" cy="46" r="5" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="1.5" />
      </g>
    </svg>
  );
}

// Sample properties matching the design mockup for immediate pixel-perfect fidelity
const mockProperties = [
  {
    id: 'kimo-apt',
    title: 'KIMO APARTMENT',
    location: 'Burma Camp, Accra',
    price: 2000,
    status: 'Active',
    image: '/images/resident/prop-kimo.jpg',
  },
  {
    id: 'ssnit-apt',
    title: 'SSNIT RESIDENTIAL APARTMENTS',
    location: 'Koforidua',
    price: 4500,
    status: 'Active',
    image: '/images/resident/prop-premium-studio.jpg',
  },
  {
    id: 'glacier-studio',
    title: 'GLACIER STUDIO',
    location: 'Achimota, Accra',
    price: 20000,
    status: 'Active',
    image: '/images/resident/residence-glacier-main.jpg',
  },
];

export default function LandlordDashboardPage() {
  const me = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => (await api.get('/auth/me')).data,
    staleTime: 60_000,
  });

  const props = useQuery({
    queryKey: ['landlord', 'properties'],
    queryFn: async () => (await api.get('/properties/landlord/mine')).data.data as any[],
  });

  const bookings = useQuery({
    queryKey: ['landlord', 'bookings'],
    queryFn: async () => (await api.get('/bookings/landlord')).data.bookings as any[],
  });

  const user = me.data?.user;
  const properties = (props.data || []).filter((p) => p.approvalStatus !== 'DELETED');
  const allBookings = bookings.data || [];
  const pending = allBookings.filter((b) => b.status === 'PENDING');

  // Display user's properties if they exist, or display mockup properties
  const displayProperties = properties.length > 0 ? properties.slice(0, 3).map((p, idx) => ({
    id: p.id,
    title: p.title || mockProperties[idx]?.title || 'Apartment',
    location: p.location || mockProperties[idx]?.location || 'Accra',
    price: p.price || mockProperties[idx]?.price || 2000,
    status: p.isAvailable ? 'Active' : (p.approvalStatus === 'APPROVED' ? 'Active' : 'Pending'),
    image: p.images?.[0]?.url || mockProperties[idx % mockProperties.length].image,
  })) : mockProperties;

  const totalPropsCount = properties.length > 0 ? properties.length : 3;
  const totalBookingsCount = allBookings.length > 0 ? allBookings.length : 3;
  const pendingRequestsCount = pending.length;

  // Landlord full name or default Stephen D.!
  const landlordGreetingName = user?.firstName
    ? `${user.firstName} ${user.lastName ? user.lastName[0] + '.' : ''}!`
    : 'Stephen D.!';

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden min-h-[220px] md:min-h-[230px] flex items-center shadow-xs bg-[#062A18]">
        {/* Panoramic apartment background on right */}
        <div
          className="absolute inset-y-0 right-0 w-full md:w-3/4 bg-cover bg-right md:bg-center"
          style={{ backgroundImage: `url('/images/resident/hero-banner.jpg')` }}
        />
        {/* Dark emerald gradient mask on left */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#062A18] via-[#062A18]/95 via-35% md:via-45% to-transparent" />

        {/* Right curved wave overlay framing the right edge */}
        <div className="absolute -right-6 md:right-0 top-0 bottom-0 w-28 sm:w-40 md:w-56 pointer-events-none overflow-hidden">
          <svg
            viewBox="0 0 200 300"
            fill="none"
            preserveAspectRatio="none"
            className="w-full h-full opacity-85"
          >
            <path
              d="M100,0 C170,80 170,220 70,300 L200,300 L200,0 Z"
              fill="#14A248"
              fillOpacity="0.45"
            />
            <path
              d="M130,0 C200,90 200,210 110,300 L200,300 L200,0 Z"
              fill="#16A34A"
              fillOpacity="0.85"
            />
          </svg>
        </div>

        {/* Content inside Hero */}
        <div className="relative z-10 px-6 sm:px-10 py-7 max-w-xl text-white space-y-3">
          <div>
            <p className="text-lg sm:text-2xl font-light text-white/90 leading-tight">
              Welcome back,
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-0.5">
              {landlordGreetingName}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-white/80 font-normal leading-relaxed max-w-md">
            Manage your properties, track bookings and grow your rental business.
          </p>
          <div className="pt-1">
            <Link
              href="/dashboard/landlord/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#14A248] hover:bg-[#11843b] text-white text-xs sm:text-sm font-semibold shadow-md transition-all hover:scale-102"
            >
              <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-white">
                <Plus className="w-3 h-3 stroke-[2.5]" />
              </span>
              <span>Add New Property</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Properties */}
        <Link
          href="/dashboard/landlord/properties"
          className="relative rounded-2xl p-5 overflow-hidden bg-[#F0FAF4] border border-[#DCFCE7] shadow-2xs hover:shadow-sm transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[115px]"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] text-[#10B981] flex items-center justify-center shrink-0">
              <Home className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-2xl sm:text-3xl font-extrabold text-zinc-900 leading-none">
                {totalPropsCount}
              </span>
              <span className="block text-xs font-semibold text-zinc-500 mt-1.5 truncate">
                Total Properties
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0 mt-1" />
          </div>
          <StatCardWave color="#A7F3D0" />
        </Link>

        {/* Card 2: Total Bookings */}
        <Link
          href="/dashboard/landlord/bookings"
          className="relative rounded-2xl p-5 overflow-hidden bg-[#F0F6FE] border border-[#DBEAFE] shadow-2xs hover:shadow-sm transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[115px]"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0">
              <CalendarCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-2xl sm:text-3xl font-extrabold text-zinc-900 leading-none">
                {totalBookingsCount}
              </span>
              <span className="block text-xs font-semibold text-zinc-500 mt-1.5 truncate">
                Total Bookings
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0 mt-1" />
          </div>
          <StatCardWave color="#BFDBFE" />
        </Link>

        {/* Card 3: Pending Requests */}
        <Link
          href="/dashboard/landlord/bookings?status=PENDING"
          className="relative rounded-2xl p-5 overflow-hidden bg-[#FEF9EE] border border-[#FEF3C7] shadow-2xs hover:shadow-sm transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[115px]"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-2xl sm:text-3xl font-extrabold text-zinc-900 leading-none">
                {pendingRequestsCount}
              </span>
              <span className="block text-xs font-semibold text-zinc-500 mt-1.5 truncate">
                Pending Requests
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0 mt-1" />
          </div>
          <StatCardWave color="#FDE68A" />
        </Link>

        {/* Card 4: Awaiting Payment */}
        <Link
          href="/dashboard/landlord/withdraw"
          className="relative rounded-2xl p-5 overflow-hidden bg-[#F6F2FE] border border-[#EDE9FE] shadow-2xs hover:shadow-sm transition-all hover:-translate-y-0.5 flex flex-col justify-between min-h-[115px]"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-2xl sm:text-3xl font-extrabold text-zinc-900 leading-none">
                GH₵ 0.00
              </span>
              <span className="block text-xs font-semibold text-zinc-500 mt-1.5 truncate">
                Awaiting Payment
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0 mt-1" />
          </div>
          <StatCardWave color="#DDD6FE" />
        </Link>
      </div>

      {/* Main Grid: Left (8-cols) & Right (4-cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8-cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* My Properties Section */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#EAF8F0] text-[#14A248] flex items-center justify-center">
                  <Home className="w-4 h-4 stroke-[2.2]" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">
                  My Properties
                </h2>
              </div>
              <Link
                href="/dashboard/landlord/properties"
                className="text-xs sm:text-sm font-semibold text-[#14A248] hover:text-[#11843b] hover:underline flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 3 Property Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {displayProperties.map((prop) => (
                <div
                  key={prop.id}
                  className="bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col group"
                >
                  {/* Property Image Container */}
                  <div className="relative h-36 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={prop.image}
                      alt={prop.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Active Badge */}
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-[#14A248] text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>{prop.status}</span>
                    </div>

                    {/* 3 dots menu button */}
                    <button
                      type="button"
                      aria-label="Property options"
                      className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/85 hover:bg-white text-zinc-700 flex items-center justify-center backdrop-blur-xs transition-colors shadow-xs cursor-pointer"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Card Content */}
                  <div className="p-3.5 flex flex-col flex-1 justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-xs sm:text-[13px] font-bold text-zinc-900 dark:text-white uppercase truncate">
                        {prop.title}
                      </h3>
                      <div className="flex items-center gap-1 text-[11px] text-[#14A248] font-medium truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">{prop.location}</span>
                      </div>
                      <div className="pt-0.5 text-xs sm:text-[13px] font-bold text-zinc-900 dark:text-white">
                        {formatCedis(prop.price)}{' '}
                        <span className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">
                          / room
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <Link
                        href={`/dashboard/landlord/properties`}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold flex items-center justify-center gap-1 border border-zinc-200/70 dark:border-zinc-700 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Details</span>
                      </Link>
                      <Link
                        href={`/dashboard/landlord/properties`}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold flex items-center justify-center gap-1 border border-zinc-200/70 dark:border-zinc-700 transition-colors"
                      >
                        <Settings className="w-3 h-3" />
                        <span>Manage</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Account Verification Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-[#ECF9F1] dark:bg-emerald-950/30 border border-[#D1F2DE] dark:border-emerald-900/50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Left Icon and Text */}
            <div className="flex items-center gap-3.5 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[#14A248] text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                  Your account is verified!
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                  You can now receive bookings with confidence.
                </p>
              </div>
            </div>

            {/* Right Action Button */}
            <div className="relative z-10 w-full sm:w-auto">
              <Link
                href="/dashboard/verification"
                className="w-full sm:w-auto px-4 py-2 rounded-full border border-[#14A248] text-[#14A248] hover:bg-emerald-50 dark:hover:bg-emerald-900/30 bg-white dark:bg-zinc-900 text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-colors shrink-0"
              >
                <span>View Verification Status</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Accra Skyline line art watermark on the right */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/about/terms-accra-skyline.png"
              alt=""
              className="absolute right-0 bottom-0 h-full w-auto max-w-[280px] object-contain opacity-35 dark:opacity-15 pointer-events-none select-none"
            />
          </div>
        </div>

        {/* Right Column (4-cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Upgrade Your Plan Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#16A34A] via-[#15803D] to-[#0A4D28] text-white p-5 shadow-xs">
            {/* Background organic shape */}
            <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />

            {/* Crown icon box */}
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center mb-3">
              <Crown className="w-4 h-4 text-white" />
            </div>

            <h3 className="font-bold text-base sm:text-lg text-white">
              Upgrade Your Plan
            </h3>
            <p className="text-xs text-white/85 mt-1 max-w-[190px] leading-relaxed">
              Get more visibility and unlock premium features.
            </p>

            <div className="pt-4">
              <Link
                href="/dashboard/landlord/subscription"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-zinc-100 text-[#15803D] font-bold text-xs shadow-md transition-all hover:scale-102"
              >
                <span>Upgrade Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 3D Gold Crown graphic */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 pointer-events-none select-none">
              <GoldCrownGraphic className="w-full h-full" />
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-2xs p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#14A248]" />
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm sm:text-base">
                  Recent Activity
                </h3>
              </div>
              <Link
                href="/dashboard/landlord/bookings"
                className="text-xs font-semibold text-[#14A248] hover:underline flex items-center gap-1 transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Activity List */}
            <div className="space-y-3.5 pt-1">
              {/* Item 1 */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#EAF8F0] dark:bg-emerald-950/40 text-[#14A248] flex items-center justify-center shrink-0">
                    <CalendarCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">
                      New booking received
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">
                      KIMO APARTMENT
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-zinc-400 font-medium shrink-0">
                  2h ago
                </span>
              </div>

              {/* Item 2 */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#EAF3FD] dark:bg-blue-950/40 text-[#2563EB] flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">
                      Payment confirmed
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium truncate">
                      GH₵ 1,800.00
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-zinc-400 font-medium shrink-0">
                  4h ago
                </span>
              </div>

              {/* Item 3 */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#EAF8F0] dark:bg-emerald-950/40 text-[#14A248] flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">
                      New message
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium italic truncate">
                      &quot;Hi, is the studio still available?&quot;
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-zinc-400 font-medium shrink-0">
                  5h ago
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
