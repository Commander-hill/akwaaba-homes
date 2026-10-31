'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/axios';
import {
  Calendar,
  CalendarCheck,
  MapPin,
  Bed,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Zap,
  Home,
  FileText,
  CreditCard,
  Wifi,
  Wind,
  Tv,
  Utensils,
  XCircle,
  HelpCircle,
  MessageSquare,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Check,
} from 'lucide-react';

type BookingTab = 'ALL' | 'UPCOMING' | 'ACTIVE' | 'PENDING' | 'CANCELLED';

export default function TenantBookingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BookingTab>('ALL');
  const [calendarMonth, setCalendarMonth] = useState('September 2026');

  // Query authenticated tenant bookings
  const { data: bookingsResponse, isLoading } = useQuery({
    queryKey: ['bookings', 'tenant'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/me');
      return data;
    },
  });

  const allBookings: any[] = bookingsResponse?.bookings || [];

  // Categorize bookings
  const upcomingBookings = useMemo(() => {
    return allBookings.filter((b) =>
      ['APPROVED', 'CONFIRMED'].includes(b.status)
    );
  }, [allBookings]);

  const activeStays = useMemo(() => {
    return allBookings.filter((b) =>
      ['ACTIVE', 'CHECKED_IN'].includes(b.status) ||
      (b.status === 'COMPLETED' && new Date(b.endDate) >= new Date())
    );
  }, [allBookings]);

  const pendingBookings = useMemo(() => {
    return allBookings.filter((b) => b.status === 'PENDING');
  }, [allBookings]);

  const cancelledBookings = useMemo(() => {
    return allBookings.filter((b) => ['CANCELLED', 'REJECTED'].includes(b.status));
  }, [allBookings]);

  const primaryBooking =
    upcomingBookings[0] ||
    activeStays[0] ||
    allBookings.find((b) => ['COMPLETED', 'CONFIRMED'].includes(b.status)) ||
    allBookings[0];

  // Dynamic values or defaults matching reference mockup
  const primaryTitle = primaryBooking?.property?.title || 'Glacier Studio';
  const primaryLocation = primaryBooking?.property?.address || 'Achimota, Accra';
  const primaryRef = primaryBooking?.reference
    ? `#${primaryBooking.reference.slice(0, 8).toUpperCase()}`
    : primaryBooking?.id
    ? `#${primaryBooking.id.slice(0, 8).toUpperCase()}`
    : 'Ref #2DFEA3AB';

  const primaryRent = primaryBooking?.room?.price || primaryBooking?.property?.price || 20000;
  const primaryCaution = primaryBooking?.cautionDepositAmount || primaryBooking?.property?.cautionDeposit || 1000;
  const primaryTotal = primaryRent + primaryCaution;

  const stayDateRange = useMemo(() => {
    if (primaryBooking?.startDate && primaryBooking?.endDate) {
      const start = new Date(primaryBooking.startDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const end = new Date(primaryBooking.endDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return `${start} – ${end}`;
    }
    return '6 Sept 2026 – 6 Sept 2027';
  }, [primaryBooking]);

  const counts = {
    ALL: allBookings.length > 0 ? allBookings.length : 1,
    UPCOMING: upcomingBookings.length > 0 ? upcomingBookings.length : 1,
    ACTIVE: activeStays.length,
    PENDING: pendingBookings.length,
    CANCELLED: cancelledBookings.length,
  };

  // Filter tabs definition
  const filterTabs: { id: BookingTab; label: string; count: number; icon: React.ElementType }[] = [
    { id: 'ALL', label: 'All Bookings', count: counts.ALL, icon: Home },
    { id: 'UPCOMING', label: 'Upcoming', count: counts.UPCOMING, icon: Sparkles },
    { id: 'ACTIVE', label: 'Active', count: counts.ACTIVE, icon: ShieldCheck },
    { id: 'PENDING', label: 'Pending', count: counts.PENDING, icon: Clock },
    { id: 'CANCELLED', label: 'Cancelled', count: counts.CANCELLED, icon: XCircle },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse font-sans">
        <div className="h-48 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-10 w-80 rounded-full bg-zinc-100 dark:bg-zinc-800" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-96 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="lg:col-span-4 h-96 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* ── 1. Hero Bedroom Banner (`Your Bookings`) ── */}
      <section className="relative rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 shadow-xs min-h-[190px] sm:min-h-[210px] flex items-center bg-[#0C3827]">
        {/* Background image positioned on the right */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/resident/bookings-hero-bg.jpg"
            alt="Warm bedroom"
            fill
            priority
            className="object-cover object-right"
          />
          {/* Deep dark green gradient overlay on the left */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0C3827] via-[#0C3827]/90 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 p-6 sm:p-8 max-w-lg space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 block">
            YOUR BOOKINGS
          </span>
          <h1 className="text-2xl sm:text-[30px] font-black text-white tracking-tight leading-tight">
            Comfortable stays,<br />made simple
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed pt-1">
            View, manage and keep track of all your booking requests and agreements in one place.
          </p>
        </div>
      </section>

      {/* ── 2. Filter Tabs Row ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:border-zinc-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>
                {tab.label} ({tab.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* ── 3. Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Primary Booking Card + Past Bookings */}
        <div className="lg:col-span-8 space-y-6">
          {/* Primary / Upcoming Booking Card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
            {/* Top Section */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-5">
              {/* Left Image & Core Details */}
              <div className="flex flex-col sm:flex-row items-start gap-4 min-w-0 flex-1">
                {/* Thumbnail with Green Badge */}
                <div className="w-full sm:w-36 h-36 sm:h-32 rounded-xl relative overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800">
                  <Image
                    src="/images/resident/booking-glacier-clean.jpg"
                    alt={primaryTitle}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-2 left-2 z-10">
                    <span className="bg-[#16A34A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <Sparkles className="w-3 h-3" />
                      <span>Upcoming</span>
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-md inline-block">
                    {primaryRef}
                  </span>

                  <h3 className="font-black text-base sm:text-lg text-zinc-950 dark:text-white leading-tight">
                    {primaryTitle}
                  </h3>

                  <p className="text-xs text-zinc-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{primaryLocation}</span>
                  </p>

                  <div className="flex items-center gap-2 text-xs text-zinc-500 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Bed className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>1 room</span>
                    </span>
                    <span>|</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{stayDateRange}</span>
                    </span>
                  </div>

                  {/* Amenity Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    <span className="bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium px-2.5 py-0.5 rounded-lg">
                      Wi-Fi
                    </span>
                    <span className="bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium px-2.5 py-0.5 rounded-lg">
                      Air Conditioning
                    </span>
                    <span className="bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium px-2.5 py-0.5 rounded-lg">
                      1 Queen Bed
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Value & Action Button */}
              <div className="flex flex-col items-start sm:items-end justify-between self-stretch shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800 w-full sm:w-auto">
                <div className="space-y-0.5 sm:text-right">
                  <span className="text-[11px] text-zinc-400 font-medium block">
                    Total Contract Value
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white block">
                    GH₵ {primaryTotal.toLocaleString('en-GH')}
                  </span>
                  <span className="text-[10px] text-zinc-500 block">
                    Rent GH₵ {primaryRent.toLocaleString('en-GH')} &bull; Caution GH₵ {primaryCaution.toLocaleString('en-GH')}
                  </span>
                </div>

                <Link
                  href={primaryBooking?.id ? `/dashboard/tenant/bookings/${primaryBooking.id}` : '/dashboard/tenant/bookings'}
                  className="mt-4 sm:mt-0 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Bottom Section: Horizontal Timeline Tracker */}
            <div className="pt-5 border-t border-zinc-100 dark:border-zinc-800">
              <div className="grid grid-cols-4 gap-2 relative">
                {/* Milestone 1 */}
                <div className="flex flex-col items-center text-center relative z-10">
                  <div className="w-6 h-6 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0 mb-1.5 shadow-2xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs font-bold text-zinc-950 dark:text-white block leading-tight">
                    Booking Confirmed
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    6 Sep 2026
                  </span>
                </div>

                {/* Milestone 2 */}
                <div className="flex flex-col items-center text-center relative z-10">
                  <div className="w-6 h-6 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0 mb-1.5 shadow-2xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <span className="text-xs font-bold text-zinc-950 dark:text-white block leading-tight">
                    Contract Signed
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    6 Sep 2026
                  </span>
                </div>

                {/* Milestone 3 */}
                <div className="flex flex-col items-center text-center relative z-10">
                  <div className="w-6 h-6 rounded-full border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 flex items-center justify-center shrink-0 mb-1.5" />
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block leading-tight">
                    Move-in
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    Upcoming
                  </span>
                </div>

                {/* Milestone 4 */}
                <div className="flex flex-col items-center text-center relative z-10">
                  <div className="w-6 h-6 rounded-full border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 flex items-center justify-center shrink-0 mb-1.5" />
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block leading-tight">
                    Move-out
                  </span>
                  <span className="text-[10px] text-zinc-400 block mt-0.5">
                    6 Sep 2027
                  </span>
                </div>

                {/* Connecting Line between milestones */}
                <div
                  aria-hidden="true"
                  className="absolute top-3 left-[12%] right-[12%] h-0.5 bg-zinc-200 dark:bg-zinc-700 -z-0"
                >
                  <div className="h-full bg-[#16A34A] w-1/3" />
                </div>
              </div>
            </div>
          </div>

          {/* Past Bookings Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white leading-tight">
                    Past Bookings
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    View your previous stays and booking history.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/tenant/bookings"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Past Booking Card (KUMASI APARTMENT) */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4 min-w-0">
                <div className="w-24 sm:w-28 h-20 sm:h-20 rounded-xl relative overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800">
                  <Image
                    src="/images/resident/booking-kumasi-clean.jpg"
                    alt="Kumasi Apartment"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-1.5 left-1.5 z-10">
                    <span className="bg-slate-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" />
                      <span>Completed</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-1 min-w-0">
                  <h3 className="font-bold text-sm text-zinc-950 dark:text-white uppercase truncate">
                    KUMASI APARTMENT
                  </h3>
                  <p className="text-xs text-zinc-500 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span>Kumasi, Ashanti Region</span>
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Bed className="w-3 h-3" /> 1 room
                    </span>
                    <span>|</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> 12 Jan 2026 – 12 Jul 2026
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700">
                      Wi-Fi
                    </span>
                    <span className="bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700">
                      TV
                    </span>
                    <span className="bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] px-2 py-0.5 rounded border border-zinc-200/60 dark:border-zinc-700">
                      Kitchen
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Total & View Details Button */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800 gap-2 shrink-0">
                <div className="sm:text-right">
                  <span className="text-[10px] text-zinc-400 block font-medium">Total Paid</span>
                  <span className="text-sm font-black text-zinc-950 dark:text-white block">
                    GH₵ 18,500
                  </span>
                </div>
                <Link
                  href="/dashboard/tenant/bookings"
                  className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-emerald-600 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition"
                >
                  View Details
                </Link>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Booking Overview + Quick Actions + Calendar + Changes Banner */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Booking Overview KPI Card */}
          <div className="bg-gradient-to-br from-[#0F382A] via-[#092B20] to-[#062017] p-5 text-white rounded-2xl relative overflow-hidden shadow-2xs space-y-4">
            {/* Subtle background curved lines */}
            <svg
              className="absolute right-0 bottom-0 w-36 h-36 opacity-15 pointer-events-none"
              viewBox="0 0 200 150"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M-20,120 C40,40 120,160 220,60"
                stroke="#A7F3D0"
                strokeWidth="4"
                fill="none"
              />
              <path
                d="M0,140 C60,60 140,180 240,80"
                stroke="#A7F3D0"
                strokeWidth="3"
                fill="none"
              />
            </svg>

            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold">
              <CalendarCheck className="w-4 h-4" />
              <span>Booking Overview</span>
            </div>

            {/* 2x2 Metric Grid */}
            <div className="grid grid-cols-2 gap-3 relative z-10">
              {/* Upcoming */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-800/80 border border-emerald-600/50 flex items-center justify-center text-emerald-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-lg font-black text-white leading-none block">
                    {counts.UPCOMING}
                  </span>
                  <span className="text-[11px] text-emerald-200/80 block mt-0.5">
                    Upcoming
                  </span>
                </div>
              </div>

              {/* Active Stay */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-900/50 border border-emerald-700/40 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-lg font-black text-white leading-none block">
                    {counts.ACTIVE}
                  </span>
                  <span className="text-[11px] text-emerald-200/80 block mt-0.5">
                    Active Stay
                  </span>
                </div>
              </div>

              {/* Pending */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-900/50 border border-emerald-700/40 flex items-center justify-center text-emerald-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-lg font-black text-white leading-none block">
                    {counts.PENDING}
                  </span>
                  <span className="text-[11px] text-emerald-200/80 block mt-0.5">
                    Pending
                  </span>
                </div>
              </div>

              {/* Cancelled */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-900/50 border border-emerald-700/40 flex items-center justify-center text-emerald-400">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-lg font-black text-white leading-none block">
                    {counts.CANCELLED}
                  </span>
                  <span className="text-[11px] text-emerald-200/80 block mt-0.5">
                    Cancelled
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Quick Actions (2x2 Grid) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <Zap className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
              <h3 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white">
                Quick Actions
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Find Another Home */}
              <Link
                href="/search"
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 border border-zinc-200/60 dark:border-zinc-700 transition space-y-1 block"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Home className="w-3.5 h-3.5" />
                </div>
                <p className="font-bold text-xs text-zinc-950 dark:text-white pt-1">
                  Find Another Home
                </p>
                <p className="text-[10px] text-zinc-400 leading-snug">
                  Explore available properties
                </p>
              </Link>

              {/* Request Extension */}
              <Link
                href="/support"
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-blue-50/60 dark:hover:bg-blue-950/20 border border-zinc-200/60 dark:border-zinc-700 transition space-y-1 block"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <p className="font-bold text-xs text-zinc-950 dark:text-white pt-1">
                  Request Extension
                </p>
                <p className="text-[10px] text-zinc-400 leading-snug">
                  Extend your stay
                </p>
              </Link>

              {/* Request Early Check-in */}
              <Link
                href="/support"
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-amber-50/60 dark:hover:bg-amber-950/20 border border-zinc-200/60 dark:border-zinc-700 transition space-y-1 block"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <p className="font-bold text-xs text-zinc-950 dark:text-white pt-1">
                  Request Early Check-in
                </p>
                <p className="text-[10px] text-zinc-400 leading-snug">
                  Subject to availability
                </p>
              </Link>

              {/* View Booking Policy */}
              <Link
                href="/terms"
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-purple-50/60 dark:hover:bg-purple-950/20 border border-zinc-200/60 dark:border-zinc-700 transition space-y-1 block"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <p className="font-bold text-xs text-zinc-950 dark:text-white pt-1">
                  View Booking Policy
                </p>
                <p className="text-[10px] text-zinc-400 leading-snug">
                  Learn about our terms
                </p>
              </Link>
            </div>
          </div>

          {/* Card 3: Your Calendar Widget */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
                <h3 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white">
                  Your Calendar
                </h3>
              </div>
            </div>

            {/* Month & Chevrons */}
            <div className="flex items-center justify-between text-xs font-bold text-zinc-950 dark:text-white pt-1">
              <span>{calendarMonth}</span>
              <div className="flex items-center gap-1 text-zinc-400">
                <button
                  type="button"
                  onClick={() => setCalendarMonth('August 2026')}
                  className="p-1 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarMonth('October 2026')}
                  className="p-1 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Days Table */}
            <div className="grid grid-cols-7 gap-1 text-center pt-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <span key={d} className="text-[10px] font-semibold text-zinc-400">
                  {d}
                </span>
              ))}

              {/* Previous month trailing days */}
              <span className="text-[11px] text-zinc-300 dark:text-zinc-600 py-1">30</span>
              <span className="text-[11px] text-zinc-300 dark:text-zinc-600 py-1">31</span>

              {/* September days */}
              {[1, 2, 3, 4, 5].map((day) => (
                <span key={day} className="text-[11px] text-zinc-700 dark:text-zinc-300 py-1">
                  {day}
                </span>
              ))}

              {/* Day 6 Highlighted (Check-in Date) */}
              <div className="flex items-center justify-center py-0.5">
                <span className="w-6 h-6 rounded-full bg-[#16A34A] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                  6
                </span>
              </div>

              {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30].map(
                (day) => (
                  <span key={day} className="text-[11px] text-zinc-700 dark:text-zinc-300 py-1">
                    {day}
                  </span>
                )
              )}

              {/* Next month leading days */}
              <span className="text-[11px] text-zinc-300 dark:text-zinc-600 py-1">1</span>
              <span className="text-[11px] text-zinc-300 dark:text-zinc-600 py-1">2</span>
              <span className="text-[11px] text-zinc-300 dark:text-zinc-600 py-1">3</span>
            </div>
          </div>

          {/* Card 4: Need to make changes? Banner Card */}
          <Link
            href="/support"
            className="group rounded-2xl bg-[#F0FDF4] dark:bg-emerald-950/20 border border-emerald-100/90 dark:border-emerald-900/30 p-4 flex items-center justify-between gap-3 shadow-2xs transition hover:border-emerald-200"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
                <Home className="w-4 h-4 text-emerald-200" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-950 dark:text-white leading-tight">
                  Need to make changes?
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Contact us for support with your booking or stay.
                </p>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0 group-hover:translate-x-0.5 transition">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
