'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import {
  MapPin,
  Calendar,
  CreditCard,
  FileText,
  Bell,
  Wrench,
  ChevronRight,
  ArrowRight,
  Zap,
  Home,
  CheckCircle2,
  Info,
  Clock,
  Sparkles,
  Wifi,
  Wind,
  Bed,
  DoorOpen,
  Send,
} from 'lucide-react';

export default function TenantDashboardPage() {
  const router = useRouter();

  // 1. Authenticated User Session
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
  });
  const session = sessionData?.user || sessionData;

  // 2. Tenant Bookings
  const { data: bookingsResponse, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', 'tenant'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/me');
      return data;
    },
  });

  // 3. Recent Notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data;
    },
  });

  // 4. Featured Properties
  const { data: propertiesData } = useQuery({
    queryKey: ['featured-properties-resident'],
    queryFn: async () => {
      const { data } = await api.get('/properties?limit=4');
      return data?.properties || data?.data || [];
    },
  });

  const bookings: any[] = bookingsResponse?.bookings || [];
  const primaryBooking = bookings.find(
    (b) => ['ACTIVE', 'CHECKED_IN', 'COMPLETED', 'CONFIRMED'].includes(b.status)
  ) || bookings[0];

  const firstName = session?.firstName || 'Stephen';

  // Dynamic time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 17) return 'Good afternoon,';
    return 'Good evening,';
  }, []);

  // Primary Stay details or fallback to reference mockup defaults
  const activePropertyTitle = primaryBooking?.property?.title || 'Glacier Studio';
  const activePropertyLocation = primaryBooking?.property?.address || 'Achimota, Accra';
  const activeRoomUnit = primaryBooking?.room?.roomNumber
    ? `Room ${primaryBooking.room.roomNumber}`
    : primaryBooking?.roomUnit?.unitNumber
    ? `Unit ${primaryBooking.roomUnit.unitNumber}`
    : 'Room 1A';

  const stayDates = useMemo(() => {
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

  const totalDueAmount = primaryBooking?.amount
    ? Number(primaryBooking.amount)
    : 2500;

  if (sessionLoading && bookingsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-56 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-80 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          <div className="lg:col-span-4 h-80 rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* ── 1. Panoramic Hero Banner ── */}
      <section className="relative rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800 shadow-xs min-h-[220px] sm:min-h-[250px] flex items-center bg-[#0C3827]">
        {/* Background building image positioned on right */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/resident/hero-building-clean.jpg"
            alt="Residence Exterior"
            fill
            priority
            className="object-cover object-right"
          />
          {/* Deep dark green gradient overlay on the left */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0C3827] via-[#0C3827]/90 to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Left: Dynamic Greeting, Subtext & Stay Tags */}
          <div className="max-w-lg space-y-2">
            <p className="text-xs sm:text-sm font-medium text-emerald-200/90">
              {greeting}
            </p>
            <h1 className="text-2xl sm:text-[32px] font-black text-white tracking-tight leading-tight">
              {firstName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-md pt-0.5">
              Your home at Akwaaba awaits. Stay comfortable, connected, and enjoy your living experience.
            </p>

            {/* Resident Stay Tags */}
            <div className="flex items-center gap-2 pt-3 text-emerald-300 text-xs font-semibold">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{activePropertyTitle}</span>
              </span>
              <span className="text-emerald-500/60">|</span>
              <span className="flex items-center gap-1.5">
                <DoorOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{activeRoomUnit}</span>
              </span>
            </div>
          </div>

          {/* Right Floating Card: Current Stay */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-xl border border-zinc-100/80 dark:border-zinc-800 w-full md:w-[340px] shrink-0">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden relative shrink-0 border border-zinc-100 dark:border-zinc-800">
                <Image
                  src="/images/resident/glacier-thumb.jpg"
                  alt={activePropertyTitle}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white truncate">
                    {activePropertyTitle}
                  </h3>
                  <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                    Active
                  </span>
                </div>

                <p className="text-[11px] text-zinc-500 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                  <span>{activePropertyLocation}</span>
                </p>

                <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 pt-0.5 truncate">
                  <span className="flex items-center gap-1">
                    <Bed className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span>1 in a room</span>
                  </span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-zinc-400 shrink-0" />
                    <span>{stayDates}</span>
                  </span>
                </div>
              </div>
            </div>

            <Link
              href={primaryBooking?.id ? `/dashboard/tenant/bookings/${primaryBooking.id}` : '/dashboard/tenant/bookings'}
              className="mt-3.5 w-full py-2 rounded-xl border border-[#16A34A] text-[#16A34A] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <span>View Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 2. Quick Actions ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-zinc-900 dark:text-white fill-current" />
          <div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white leading-tight">
              Quick Actions
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Access what you need, fast.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Card 1: Book a Space */}
          <Link
            href="/dashboard/tenant/bookings"
            className="group relative bg-[#F0FDF4] dark:bg-emerald-950/20 border border-emerald-100/90 dark:border-emerald-900/40 rounded-2xl p-4 transition-all duration-200 hover:shadow-sm hover:border-emerald-200 flex flex-col justify-between h-32"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="w-6 h-6 rounded-full bg-[#16A34A] text-white flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white">
                Book a Space
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Study rooms, events &amp; more
              </p>
            </div>
          </Link>

          {/* Card 2: Make Payment */}
          <Link
            href="/dashboard/invoice"
            className="group relative bg-[#EFF6FF] dark:bg-blue-950/20 border border-blue-100/90 dark:border-blue-900/40 rounded-2xl p-4 transition-all duration-200 hover:shadow-sm hover:border-blue-200 flex flex-col justify-between h-32"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white">
                Make Payment
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Rent, utilities &amp; other fees
              </p>
            </div>
          </Link>

          {/* Card 3: Report an Issue */}
          <Link
            href="/dashboard/tenant/tickets/new"
            className="group relative bg-[#FAF5FF] dark:bg-purple-950/20 border border-purple-100/90 dark:border-purple-900/40 rounded-2xl p-4 transition-all duration-200 hover:shadow-sm hover:border-purple-200 flex flex-col justify-between h-32"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-purple-100/80 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                <Wrench className="w-4 h-4" />
              </div>
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white">
                Report an Issue
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Maintenance &amp; repairs
              </p>
            </div>
          </Link>

          {/* Card 4: View Documents */}
          <Link
            href="/dashboard/agreements"
            className="group relative bg-[#FFFBEB] dark:bg-amber-950/20 border border-amber-100/90 dark:border-amber-900/40 rounded-2xl p-4 transition-all duration-200 hover:shadow-sm hover:border-amber-200 flex flex-col justify-between h-32"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-amber-100/80 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white">
                View Documents
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Lease, receipts &amp; more
              </p>
            </div>
          </Link>
        </div>
      </section>

      {/* ── 3. Main Dashboard Two-Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Upcoming & Recent + Account Summary */}
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Subcard 1: Upcoming & Recent */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white leading-tight">
                        Upcoming &amp; Recent
                      </h3>
                      <p className="text-[10px] text-zinc-400">
                        Your bookings, payments and important dates.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/tenant/bookings"
                    className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 shrink-0"
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* 4 List Items matching reference */}
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                  {/* Item 1: Study Room Booking */}
                  <div className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-10 rounded-lg overflow-hidden relative shrink-0 border border-zinc-100 dark:border-zinc-800">
                        <Image
                          src="/images/resident/study-thumb.jpg"
                          alt="Study room"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            Approved
                          </span>
                        </div>
                        <p className="font-bold text-zinc-950 dark:text-white truncate mt-0.5">
                          Study Room Booking
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          Tue, 9 Sep 2026 &bull; 10:00 AM – 12:00 PM
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                  </div>

                  {/* Item 2: Rent Payment */}
                  <div className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            Paid
                          </span>
                        </div>
                        <p className="font-bold text-zinc-950 dark:text-white truncate mt-0.5">
                          Rent Payment
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          September 2026 &bull; GH₵ 2,500
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                  </div>

                  {/* Item 3: Maintenance Request */}
                  <div className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-center shrink-0">
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-amber-50 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            &bull; In Progress
                          </span>
                        </div>
                        <p className="font-bold text-zinc-950 dark:text-white truncate mt-0.5">
                          Maintenance Request
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          Issue with AC &bull; Submitted 3 Sep 2026
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                  </div>

                  {/* Item 4: Resident Forum */}
                  <div className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            Event
                          </span>
                        </div>
                        <p className="font-bold text-zinc-950 dark:text-white truncate mt-0.5">
                          Resident Forum
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          Sat, 12 Sep 2026 &bull; 5:00 PM – 7:00 PM
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Subcard 2: Account Summary */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between">
              {/* Top Dark Green Gradient Wave Box */}
              <div className="bg-gradient-to-br from-[#0F382A] via-[#092B20] to-[#062017] p-5 text-white relative overflow-hidden">
                {/* Subtle curved background lines */}
                <svg
                  className="absolute right-0 bottom-0 w-48 h-40 opacity-15 pointer-events-none"
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
                  <path
                    d="M20,160 C80,80 160,200 260,100"
                    stroke="#A7F3D0"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold">
                    <CreditCard className="w-4 h-4" />
                    <span>Account Summary</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-emerald-200/80 block">
                      Total Due
                    </span>
                    <span className="text-2xl sm:text-[30px] font-black text-white tracking-tight">
                      GH₵ {totalDueAmount.toLocaleString('en-GH')}
                    </span>
                  </div>

                  <Link
                    href="/dashboard/invoice"
                    className="inline-flex items-center gap-1.5 bg-white text-[#0F382A] hover:bg-emerald-50 px-4 py-2 rounded-full text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <span>Make Payment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Bottom Rent & Utilities Details */}
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-2">
                  {/* Rent */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-zinc-500">Rent</p>
                    <p className="text-sm font-black text-zinc-950 dark:text-white">
                      GH₵ 2,300
                    </p>
                    <p className="text-[10px] text-zinc-400">Due 6 Sep 2026</p>
                    <span className="inline-block bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full mt-1">
                      &bull; Paid
                    </span>
                  </div>

                  {/* Utilities */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-zinc-500">Utilities</p>
                    <p className="text-sm font-black text-zinc-950 dark:text-white">
                      GH₵ 200
                    </p>
                    <p className="text-[10px] text-zinc-400">Due 15 Sep 2026</p>
                    <span className="inline-block bg-amber-50 text-amber-700 text-[9px] font-bold px-2 py-0.5 rounded-full mt-1">
                      Pending
                    </span>
                  </div>
                </div>

                <Link
                  href="/dashboard/tenant/bookings"
                  className="w-full py-2.5 rounded-xl border border-[#16A34A] text-[#16A34A] hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-bold flex items-center justify-center gap-1.5 transition text-center"
                >
                  <span>View Payment History</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Latest Notifications + Explore Properties */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Latest Notifications */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <h3 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white">
                  Latest Notifications
                </h3>
              </div>
              <Link
                href="/dashboard/notifications"
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 shrink-0"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3 pt-1">
              {/* Notification 1 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-xs text-zinc-950 dark:text-white truncate">
                      Payment Confirmed
                    </p>
                    <span className="text-[10px] text-zinc-400 shrink-0">2h ago</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">
                    Your rent for September has been received.
                  </p>
                </div>
              </div>

              {/* Notification 2 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Wrench className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-xs text-zinc-950 dark:text-white truncate">
                      Maintenance Update
                    </p>
                    <span className="text-[10px] text-zinc-400 shrink-0">5h ago</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">
                    Your maintenance request has been assigned.
                  </p>
                </div>
              </div>

              {/* Notification 3 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-xs text-zinc-950 dark:text-white truncate">
                      New Announcement
                    </p>
                    <span className="text-[10px] text-zinc-400 shrink-0">1d ago</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">
                    Weekend gate access will be restricted.
                  </p>
                </div>
              </div>

              {/* Notification 4 */}
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-xs text-zinc-950 dark:text-white truncate">
                      Upcoming Event
                    </p>
                    <span className="text-[10px] text-zinc-400 shrink-0">2d ago</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">
                    Resident forum &bull; 12 Sept 2026
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Explore Properties */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white leading-tight">
                    Explore Properties
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Find your next home with us.
                  </p>
                </div>
              </div>
              <Link
                href="/search"
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 shrink-0"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-3 pt-1">
              {/* Property 1: Premium Studio */}
              <Link
                href="/search"
                className="group flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition border border-transparent hover:border-zinc-200/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-20 h-16 rounded-xl overflow-hidden relative shrink-0 border border-zinc-100 dark:border-zinc-800">
                    <Image
                      src="/images/resident/prop-premium-studio.jpg"
                      alt="Premium Studio"
                      fill
                      className="object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block">
                      Available
                    </span>
                    <p className="font-bold text-xs text-zinc-950 dark:text-white truncate">
                      Premium Studio
                    </p>
                    <p className="text-[10px] text-zinc-400 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span>Legon Campus, Accra</span>
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Bed className="w-3 h-3" /> 1 Room
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Wifi className="w-3 h-3" /> Wi-Fi
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Wind className="w-3 h-3" /> AC
                      </span>
                    </div>
                    <p className="text-xs font-black text-zinc-950 dark:text-white pt-0.5">
                      GH₵ 2,500 <span className="text-[10px] font-normal text-zinc-400">/ month</span>
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-600 shrink-0 group-hover:translate-x-0.5 transition" />
              </Link>

              {/* Property 2: KIMO APARTMENT */}
              <Link
                href="/search"
                className="group flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition border border-transparent hover:border-zinc-200/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-20 h-16 rounded-xl overflow-hidden relative shrink-0 border border-zinc-100 dark:border-zinc-800">
                    <Image
                      src="/images/resident/prop-kimo.jpg"
                      alt="KIMO APARTMENT"
                      fill
                      className="object-cover group-hover:scale-105 transition duration-300"
                    />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block">
                      Available
                    </span>
                    <p className="font-bold text-xs text-zinc-950 dark:text-white truncate">
                      KIMO APARTMENT
                    </p>
                    <p className="text-[10px] text-zinc-400 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span>Burma Camp, Accra</span>
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Bed className="w-3 h-3" /> 1 Room
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Wifi className="w-3 h-3" /> Wi-Fi
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Wind className="w-3 h-3" /> AC
                      </span>
                    </div>
                    <p className="text-xs font-black text-zinc-950 dark:text-white pt-0.5">
                      GH₵ 2,000 <span className="text-[10px] font-normal text-zinc-400">/ month</span>
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-600 shrink-0 group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Bottom Community Banner ── */}
      <section className="relative rounded-2xl border border-emerald-100/90 dark:border-emerald-900/40 bg-gradient-to-r from-[#F0FDF4] via-[#F0FDF4]/90 to-white dark:from-emerald-950/20 dark:via-zinc-900 dark:to-zinc-900 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden shadow-2xs">
        {/* Right side background image strip */}
        <div className="absolute right-0 top-0 bottom-0 w-80 opacity-40 pointer-events-none hidden md:block">
          <Image
            src="/images/resident/bottom-banner-strip.jpg"
            alt="Community Graphic"
            fill
            className="object-cover object-right"
          />
        </div>

        {/* Left: Leaf Logo & Slogan */}
        <div className="flex items-center gap-3.5 relative z-10 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Sparkles className="w-5 h-5 text-emerald-200" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-zinc-950 dark:text-white leading-tight">
              A Community That Feels Like Home
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Safe, comfortable and well-managed residences for students and young professionals.
            </p>
          </div>
        </div>

        {/* Button */}
        <Link
          href="/search"
          className="relative z-10 py-2 px-5 rounded-full border border-[#16A34A] text-[#16A34A] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold transition whitespace-nowrap"
        >
          <span>Explore More Properties</span>
          <span className="ml-1.5">&rarr;</span>
        </Link>
      </section>
    </div>
  );
}
