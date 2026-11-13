'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { BookingListSkeleton, useInitialSkeleton } from '@/components/ui/PageSkeletons';
import {
  CalendarCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  ChevronDown,
  MapPin,
  Bed,
  User,
  Users,
  ShieldCheck,
  Star,
  ArrowRight,
  MoreVertical,
  Check,
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

interface BookingItem {
  id: string;
  propertyTitle: string;
  location: string;
  rooms: string;
  guests: string;
  guestIcon: 'single' | 'multiple';
  dateRange: string;
  noteText: string;
  noteAmount?: string;
  noteTone: 'mint' | 'amber';
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  image: string;
  tenant: {
    name: string;
    avatar: string;
    verified: boolean;
    rating: string;
    reviews: number;
  };
  amount: string;
}

const initialBookings: BookingItem[] = [
  {
    id: 'booking-glacier',
    propertyTitle: 'Glacier Studio',
    location: 'Achimota, Accra',
    rooms: '1 Room',
    guests: '1 Guest',
    guestIcon: 'single',
    dateRange: '12 Oct 2026 – 14 Oct 2026',
    noteText: '“Great place! Very clean and secure.”',
    noteTone: 'mint',
    status: 'Confirmed',
    image: '/images/resident/residence-glacier-main.jpg',
    tenant: {
      name: 'Ama Serwaa',
      avatar: '/images/messages/chelsea-avatar.png',
      verified: true,
      rating: '5.0',
      reviews: 12,
    },
    amount: 'GH₵ 480.00',
  },
  {
    id: 'booking-ssnit',
    propertyTitle: 'SSNIT Residential Apartments',
    location: 'Koforidua',
    rooms: '2 Rooms',
    guests: '2 Guests',
    guestIcon: 'multiple',
    dateRange: '18 Oct 2026 – 20 Oct 2026',
    noteText: 'Awaiting tenant payment',
    noteAmount: '(GH₵ 750.00)',
    noteTone: 'amber',
    status: 'Pending',
    image: '/images/resident/prop-premium-studio.jpg',
    tenant: {
      name: 'Kwame Mensah',
      avatar: '/images/messages/john-avatar.png',
      verified: false,
      rating: '4.8',
      reviews: 8,
    },
    amount: 'GH₵ 750.00',
  },
  {
    id: 'booking-kimo',
    propertyTitle: 'KIMO APARTMENT',
    location: 'Burma Camp, Accra',
    rooms: '1 Room',
    guests: '1 Guest',
    guestIcon: 'single',
    dateRange: '05 Oct 2026 – 07 Oct 2026',
    noteText: 'Payment received',
    noteTone: 'mint',
    status: 'Confirmed',
    image: '/images/resident/prop-kimo.jpg',
    tenant: {
      name: 'Daniel Osei',
      avatar: '/images/messages/stephen-avatar.png',
      verified: true,
      rating: '5.0',
      reviews: 5,
    },
    amount: 'GH₵ 300.00',
  },
];

export default function LandlordBookingsPage() {
  const showSkeleton = useInitialSkeleton();
  const [bookings, setBookings] = useState<BookingItem[]>(initialBookings);
  const [activeTab, setActiveTab] = useState<'ALL' | 'Pending' | 'Confirmed' | 'Cancelled'>('ALL');
  const [period, setPeriod] = useState('This Month');

  const counts = useMemo(() => {
    return {
      ALL: bookings.length,
      Pending: bookings.filter((b) => b.status === 'Pending').length,
      Confirmed: bookings.filter((b) => b.status === 'Confirmed').length,
      Cancelled: bookings.filter((b) => b.status === 'Cancelled').length,
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (activeTab === 'ALL') return bookings;
    return bookings.filter((b) => b.status === activeTab);
  }, [bookings, activeTab]);
  if (showSkeleton) return <BookingListSkeleton />;

  const handleConfirm = (id: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status: 'Confirmed',
              noteText: 'Payment received',
              noteAmount: undefined,
              noteTone: 'mint',
            }
          : b
      )
    );
  };

  const handleCancel = (id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: 'Cancelled' } : b))
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden min-h-[165px] md:h-[180px] flex items-center shadow-xs bg-[#E8F7EE] border border-[#D4F2E0]">
        {/* Panoramic apartment background on right */}
        <div
          className="absolute inset-y-0 right-0 w-full md:w-[60%] bg-cover bg-center"
          style={{ backgroundImage: "url('/images/resident/landlord-bookings-hero-bldg.jpg')" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/resident/landlord-bookings-hero-bldg.jpg" alt="" fetchPriority="high" decoding="async" className="w-full h-full object-cover object-center" />
          {/* Seamless left edge blend for crisp text contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#E8F7EE] via-[#E8F7EE]/90 to-[#E8F7EE]/15 md:via-[#E8F7EE]/75 md:to-transparent" />
        </div>

        {/* Content inside Hero */}
        <div className="relative z-10 px-6 sm:px-10 py-6 flex items-center gap-4 sm:gap-5 max-w-2xl">
          <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#D0F3DD] text-[#14A248] flex items-center justify-center shrink-0 shadow-2xs">
            <CalendarCheck className="w-9 h-9 sm:w-10 sm:h-10 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">
              Bookings
            </h1>
            <p className="text-xs sm:text-sm text-zinc-700 font-medium mt-1 leading-relaxed">
              Manage and track all booking requests and reservations.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Stat / KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Bookings */}
        <div className="relative rounded-2xl p-5 overflow-hidden bg-[#EDF9F0] border border-[#DCF5E3] shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between min-h-[115px]">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#D2F5DC] text-[#14A248] flex items-center justify-center shrink-0">
              <CalendarCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-3xl font-extrabold text-zinc-900 leading-none">
                {counts.ALL}
              </span>
              <span className="block text-xs font-semibold text-zinc-600 mt-1.5 truncate">
                Total Bookings
              </span>
            </div>
            <span className="text-xs font-bold text-[#14A248] flex items-center gap-0.5 mt-0.5">
              ↑ +1
            </span>
          </div>
          <RollingWaves color="#A7F3D0" darkColor="#4ADE80" />
        </div>

        {/* Card 2: Pending */}
        <div className="relative rounded-2xl p-5 overflow-hidden bg-[#EAF3FD] border border-[#D6E8FD] shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between min-h-[115px]">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#D6E8FD] text-[#2563EB] flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-3xl font-extrabold text-zinc-900 leading-none">
                {counts.Pending}
              </span>
              <span className="block text-xs font-semibold text-zinc-600 mt-1.5 truncate">
                Pending
              </span>
            </div>
            <span className="text-xs font-bold text-[#14A248] flex items-center gap-0.5 mt-0.5">
              ↑ +0
            </span>
          </div>
          <RollingWaves color="#BFDBFE" darkColor="#60A5FA" />
        </div>

        {/* Card 3: Confirmed */}
        <div className="relative rounded-2xl p-5 overflow-hidden bg-[#EDF9F0] border border-[#DCF5E3] shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between min-h-[115px]">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#D2F5DC] text-[#14A248] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-3xl font-extrabold text-zinc-900 leading-none">
                {counts.Confirmed}
              </span>
              <span className="block text-xs font-semibold text-zinc-600 mt-1.5 truncate">
                Confirmed
              </span>
            </div>
          </div>
          <RollingWaves color="#A7F3D0" darkColor="#4ADE80" />
        </div>

        {/* Card 4: Cancelled */}
        <div className="relative rounded-2xl p-5 overflow-hidden bg-[#FEF3EC] border border-[#FDE2D2] shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between min-h-[115px]">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#FADBD0] text-[#EF4444] flex items-center justify-center shrink-0">
              <XCircle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-3xl font-extrabold text-zinc-900 leading-none">
                {counts.Cancelled}
              </span>
              <span className="block text-xs font-semibold text-zinc-600 mt-1.5 truncate">
                Cancelled
              </span>
            </div>
          </div>
          <RollingWaves color="#FDE68A" darkColor="#FB923C" />
        </div>
      </div>

      {/* Filter Tabs & Date Dropdown Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        {/* Left Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'bg-[#F1F3F6] hover:bg-zinc-200/70 text-zinc-800'
            }`}
          >
            All Bookings ({counts.ALL})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('Pending')}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'Pending'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'bg-[#F1F3F6] hover:bg-zinc-200/70 text-zinc-800'
            }`}
          >
            Pending ({counts.Pending})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('Confirmed')}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'Confirmed'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'bg-[#F1F3F6] hover:bg-zinc-200/70 text-zinc-800'
            }`}
          >
            Confirmed ({counts.Confirmed})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('Cancelled')}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'Cancelled'
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'bg-[#F1F3F6] hover:bg-zinc-200/70 text-zinc-800'
            }`}
          >
            Cancelled ({counts.Cancelled})
          </button>
        </div>

        {/* Right Month Filter Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() =>
              setPeriod((p) => (p === 'This Month' ? 'All Time' : 'This Month'))
            }
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2.5 shadow-2xs hover:bg-zinc-50 transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            <span>{period}</span>
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* Horizontal Booking Cards List */}
      <div className="space-y-4">
        {filteredBookings.map((booking) => (
          <div
            key={booking.id}
            className="bg-white dark:bg-[#141816] rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-2xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-5 xl:gap-6 relative"
          >
            {/* Top-Right 3 Vertical Dots */}
            <button
              type="button"
              aria-label="Booking options"
              className=" absolute top-4 right-4 p-1.5 rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Left Column: Image & Property Stay Details */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 w-full xl:flex-1 min-w-0 pr-8 xl:pr-0">
              {/* Property Thumbnail */}
              <div className="relative w-full sm:w-44 h-28 sm:h-30 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img decoding="async"
                  src={booking.image}
                  alt={booking.propertyTitle}
                  className="w-full h-full object-cover"
                />

                {/* Status Badge on Bottom-Left of Image */}
                {booking.status === 'Confirmed' && (
                  <div className="absolute bottom-2 left-2 px-3 py-1 rounded-full bg-[#16A34A] text-white text-[11px] font-bold flex items-center gap-1 shadow-sm">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Confirmed</span>
                  </div>
                )}
                {booking.status === 'Pending' && (
                  <div className="absolute bottom-2 left-2 px-3 py-1 rounded-full bg-[#EAB308] text-white text-[11px] font-bold flex items-center gap-1 shadow-sm">
                    <Clock className="w-3 h-3 stroke-[2.5]" />
                    <span>Pending</span>
                  </div>
                )}
                {booking.status === 'Cancelled' && (
                  <div className="absolute bottom-2 left-2 px-3 py-1 rounded-full bg-[#EF4444] text-white text-[11px] font-bold flex items-center gap-1 shadow-sm">
                    <XCircle className="w-3 h-3 stroke-[2.5]" />
                    <span>Cancelled</span>
                  </div>
                )}
              </div>

              {/* Property & Booking Details */}
              <div className="space-y-1.5 min-w-0 flex-1 w-full">
                <h3 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-white truncate">
                  {booking.propertyTitle}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>{booking.location}</span>
                </div>

                {/* Room, Guest, Dates */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300 font-medium pt-0.5">
                  <span className="flex items-center gap-1.5">
                    <Bed className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{booking.rooms}</span>
                  </span>
                  <span className="text-zinc-300">|</span>
                  <span className="flex items-center gap-1.5">
                    {booking.guestIcon === 'multiple' ? (
                      <Users className="w-3.5 h-3.5 text-zinc-400" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                    )}
                    <span>{booking.guests}</span>
                  </span>
                  <span className="text-zinc-300">|</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{booking.dateRange}</span>
                  </span>
                </div>

                {/* Bottom Note Pill */}
                <div className="pt-1">
                  <span
                    className={`inline-block px-3 py-1 rounded-lg text-xs font-semibold ${
                      booking.noteTone === 'amber'
                        ? 'bg-[#FEF6E0] text-zinc-800'
                        : 'bg-[#EDF9F1] text-zinc-800'
                    }`}
                  >
                    {booking.noteText}{' '}
                    {booking.noteAmount && (
                      <span className="font-normal text-zinc-600">
                        {booking.noteAmount}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Middle Column: Tenant Info */}
            <div className="flex flex-col gap-1.5 w-full sm:w-auto xl:min-w-[200px] xl:border-l xl:border-zinc-100 dark:xl:border-zinc-800 xl:pl-6 pt-3 xl:pt-0 border-t xl:border-t-0 border-zinc-100 dark:border-zinc-800">
              <span className="text-[11px] text-zinc-400 font-medium">
                Tenant
              </span>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img decoding="async"
                  src={booking.tenant.avatar}
                  alt={booking.tenant.name}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-800 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      {booking.tenant.name}
                    </span>
                    {booking.tenant.verified && (
                      <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-[#FBBF24] text-[#FBBF24]" />
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      {booking.tenant.rating}
                    </span>
                    <span className="text-zinc-400 font-normal">
                      ({booking.tenant.reviews} reviews)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Total Amount & Actions */}
            <div className="flex flex-row sm:flex-row xl:flex-col items-center xl:items-start justify-between gap-3 xl:min-w-[200px] w-full xl:w-auto xl:pr-6 pt-3 xl:pt-0 border-t xl:border-t-0 border-zinc-100 dark:border-zinc-800">
              <div>
                <span className="block text-[11px] text-zinc-500 font-medium">
                  Total Amount
                </span>
                <span
                  className={`block text-lg sm:text-xl font-extrabold mt-0.5 ${
                    booking.status === 'Confirmed'
                      ? 'text-[#14873E]'
                      : 'text-zinc-900 dark:text-white'
                  }`}
                >
                  {booking.amount}
                </span>
              </div>

              {booking.status === 'Pending' ? (
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleConfirm(booking.id)}
                    className="px-4 py-2.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                  >
                    Confirm Booking
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancel(booking.id)}
                    className="px-5 py-2.5 rounded-full bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <Link
                  href={`/dashboard/landlord/bookings`}
                  className="px-6 py-2.5 rounded-full bg-[#D5F5DF] hover:bg-[#c2efd0] text-[#0E6B2F] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors w-full sm:w-auto"
                >
                  <span>View Details</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Banner: Secure & Verified Bookings */}
      <div className="relative overflow-hidden rounded-2xl bg-[#E8F8EE] dark:bg-emerald-950/30 border border-[#CDEED9] dark:border-emerald-900/50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-[#14A248] text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-white">
              Secure &amp; Verified Bookings
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
              All bookings are verified and payments are protected.
            </p>
          </div>
        </div>

        {/* Accra Skyline Watermark in Background */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img decoding="async"
          src="/images/about/terms-accra-skyline.png"
          alt=""
          className="absolute right-40 bottom-0 h-full w-auto max-w-[300px] object-contain opacity-45 dark:opacity-20 pointer-events-none select-none hidden md:block"
        />

        {/* Manage Availability Button */}
        <div className="relative z-10 w-full sm:w-auto">
          <Link
            href="/dashboard/landlord/properties"
            className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all shrink-0"
          >
            <span>Manage Availability</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
