'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/axios';
import { useInitialSkeleton } from '@/components/ui/PageSkeletons';
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
import { format, isToday, isSameDay } from 'date-fns';
import { getImageUrl } from '@/lib/utils';
import clsx from 'clsx';

type BookingTab = 'ALL' | 'UPCOMING' | 'ACTIVE' | 'PENDING' | 'CANCELLED';

// Demo showcase bookings (Strictly gated to ?demo=true)
const DEMO_BOOKING = {
  id: 'bkg-demo-1',
  reference: '2DFEA3AB',
  status: 'CONFIRMED',
  startDate: '2026-09-06T00:00:00.000Z',
  endDate: '2027-09-06T00:00:00.000Z',
  createdAt: '2026-09-06T10:00:00.000Z',
  price: 20000,
  cautionDepositAmount: 1000,
  property: {
    id: 'prop-demo-1',
    title: 'Glacier Studio',
    location: 'Achimota, Accra',
    images: ['/images/resident/booking-glacier-clean.jpg'],
    type: 'Studio Suite',
    includedUtilities: ['Wi-Fi', 'Air Conditioning', '1 Queen Bed'],
  },
  room: {
    roomType: 'Studio Suite (1 Room)',
    price: 20000,
  },
};

export default function TenantBookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1';

  const [activeTab, setActiveTab] = useState<BookingTab>('ALL');
  const [today] = useState(() => new Date());
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date>(() => new Date());
  const [selectedBookingModal, setSelectedBookingModal] = useState<any | null>(null);

  // Query authenticated tenant bookings
  const { data: bookingsResponse, isLoading } = useQuery({
    queryKey: ['bookings', 'tenant'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/bookings/me');
        return data;
      } catch {
        return [];
      }
    },
  });

  // Defensive array extraction (Resolves Anomaly 9)
  const allBookings: any[] = useMemo(() => {
    if (Array.isArray(bookingsResponse)) return bookingsResponse;
    if (Array.isArray(bookingsResponse?.bookings)) return bookingsResponse.bookings;
    if (isDemo) return [DEMO_BOOKING];
    return [];
  }, [bookingsResponse, isDemo]);

  // Categorize bookings
  const upcomingBookings = useMemo(() => {
    return allBookings.filter((b) => ['APPROVED', 'CONFIRMED'].includes(b.status));
  }, [allBookings]);

  const activeStays = useMemo(() => {
    return allBookings.filter(
      (b) =>
        ['ACTIVE', 'CHECKED_IN'].includes(b.status) ||
        (b.status === 'COMPLETED' && b.endDate && new Date(b.endDate) >= new Date())
    );
  }, [allBookings]);

  const pendingBookings = useMemo(() => {
    return allBookings.filter((b) => b.status === 'PENDING');
  }, [allBookings]);

  const cancelledBookings = useMemo(() => {
    return allBookings.filter((b) => ['CANCELLED', 'REJECTED'].includes(b.status));
  }, [allBookings]);

  // Real past stays (Resolves Anomaly 2)
  const pastStays = useMemo(() => {
    return allBookings.filter(
      (b) =>
        ['COMPLETED', 'CHECKED_OUT'].includes(b.status) ||
        (b.status === 'ACTIVE' && b.endDate && new Date(b.endDate) < new Date())
    );
  }, [allBookings]);

  // Primary booking selection
  const primaryBooking = useMemo(() => {
    return (
      upcomingBookings[0] ||
      activeStays[0] ||
      allBookings.find((b) => ['COMPLETED', 'CONFIRMED'].includes(b.status)) ||
      allBookings[0] ||
      null
    );
  }, [upcomingBookings, activeStays, allBookings]);

  // Dynamic values derived from database (Resolves Anomaly 1, 3, 6, 7)
  const primaryTitle = primaryBooking?.property?.title || 'Accommodation';
  const primaryLocation = primaryBooking?.property?.location || 'Ghana';
  const primaryRef = primaryBooking?.reference
    ? `#${primaryBooking.reference.slice(0, 8).toUpperCase()}`
    : primaryBooking?.id
    ? `#${primaryBooking.id.slice(0, 8).toUpperCase()}`
    : '';

  const primaryRent = Number(
    primaryBooking?.room?.price ||
      primaryBooking?.property?.price ||
      primaryBooking?.price ||
      0
  );
  const primaryCaution = Number(
    primaryBooking?.cautionDepositAmount ||
      primaryBooking?.property?.cautionDeposit ||
      0
  );
  const primaryTotal = primaryRent + primaryCaution;

  // Real property thumbnail resolution
  const primaryThumbnail = useMemo(() => {
    const imgs = primaryBooking?.property?.images;
    if (Array.isArray(imgs) && imgs.length > 0) return getImageUrl(imgs[0]);
    if (typeof imgs === 'string') {
      try {
        const parsed = JSON.parse(imgs);
        if (Array.isArray(parsed) && parsed.length > 0) return getImageUrl(parsed[0]);
      } catch {
        if (imgs.startsWith('/') || imgs.startsWith('http')) return getImageUrl(imgs);
      }
    }
    return '/images/resident/booking-glacier-clean.jpg';
  }, [primaryBooking]);

  // Real dynamic amenities list (Resolves Anomaly 7)
  const primaryAmenities = useMemo(() => {
    const list: string[] = [];
    if (primaryBooking?.room?.roomType) list.push(primaryBooking.room.roomType);
    if (primaryBooking?.bed?.bedNumber) list.push(`Bed ${primaryBooking.bed.bedNumber}`);
    const utils = primaryBooking?.property?.includedUtilities;
    if (Array.isArray(utils)) {
      list.push(...utils.slice(0, 2));
    }
    if (list.length === 0) list.push('Verified Listing', 'Resident Protection', 'Direct Check-in');
    return list;
  }, [primaryBooking]);

  const stayDateRange = useMemo(() => {
    if (primaryBooking?.startDate && primaryBooking?.endDate) {
      try {
        const start = format(new Date(primaryBooking.startDate), 'd MMM yyyy');
        const end = format(new Date(primaryBooking.endDate), 'd MMM yyyy');
        return `${start} – ${end}`;
      } catch {
        return 'Dates on file';
      }
    }
    return 'Tenancy dates pending';
  }, [primaryBooking]);

  // Milestone timeline dynamic dates (Resolves Anomaly 4)
  const milestoneDatesMap = useMemo(() => {
    if (!primaryBooking) return null;
    const confirmedDate = primaryBooking.createdAt
      ? format(new Date(primaryBooking.createdAt), 'd MMM yyyy')
      : 'Confirmed';
    const signedDate = primaryBooking.leaseAgreement?.tenantSignedAt
      ? format(new Date(primaryBooking.leaseAgreement.tenantSignedAt), 'd MMM yyyy')
      : primaryBooking.createdAt
      ? format(new Date(primaryBooking.createdAt), 'd MMM yyyy')
      : 'Signed';
    const moveInDate = primaryBooking.startDate
      ? format(new Date(primaryBooking.startDate), 'd MMM yyyy')
      : 'Scheduled';
    const moveOutDate = primaryBooking.endDate
      ? format(new Date(primaryBooking.endDate), 'd MMM yyyy')
      : 'Scheduled';

    const isConfirmed = ['APPROVED', 'CONFIRMED', 'ACTIVE', 'CHECKED_IN', 'COMPLETED'].includes(
      primaryBooking.status
    );
    const isSigned = Boolean(
      primaryBooking.leaseAgreement?.tenantSignedAt ||
        ['CONFIRMED', 'ACTIVE', 'CHECKED_IN', 'COMPLETED'].includes(primaryBooking.status)
    );
    const isCheckedIn = ['ACTIVE', 'CHECKED_IN', 'COMPLETED'].includes(primaryBooking.status);
    const isCompleted = primaryBooking.status === 'COMPLETED';

    return {
      confirmed: { date: confirmedDate, done: isConfirmed },
      signed: { date: signedDate, done: isSigned },
      moveIn: { date: moveInDate, done: isCheckedIn },
      moveOut: { date: moveOutDate, done: isCompleted },
    };
  }, [primaryBooking]);

  // Accurate non-fabricated counts (Resolves Anomaly 1)
  const counts = {
    ALL: allBookings.length,
    UPCOMING: upcomingBookings.length,
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

  const showSkeleton = useInitialSkeleton(isLoading);
  if (showSkeleton) {
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

      {/* ── 2. Filter Tabs Row (Resolves Anomaly 10) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition whitespace-nowrap cursor-pointer',
                isActive
                  ? 'bg-[#16A34A] text-white shadow-xs'
                  : 'bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:border-zinc-300 dark:hover:border-zinc-700'
              )}
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
        {/* LEFT COLUMN: Dynamically Filtered by activeTab */}
        <div className="lg:col-span-8 space-y-6">
          {/* Entire Bookings Empty State (Resolves Anomaly 1) */}
          {allBookings.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-10 text-center space-y-4 shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5A3E] dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
                <CalendarCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-lg font-black text-zinc-950 dark:text-white">
                  No Bookings Recorded Yet
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  You haven&apos;t reserved any properties yet. Once you submit a booking request on Akwaaba Homes, your room reservation, verification timeline, and check-in codes will appear here.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/properties"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <span>Explore Verified Listings</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* ── TAB: ALL BOOKINGS or UPCOMING or ACTIVE (when matching primaryBooking exists) ── */}
              {primaryBooking &&
                (activeTab === 'ALL' ||
                  (activeTab === 'UPCOMING' && counts.UPCOMING > 0) ||
                  (activeTab === 'ACTIVE' && counts.ACTIVE > 0)) && (
                  <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-6">
                    {/* Top Section */}
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-5">
                      {/* Left Image & Core Details */}
                      <div className="flex flex-col sm:flex-row items-start gap-4 min-w-0 flex-1">
                        {/* Thumbnail with Status Badge (Resolves Anomaly 6) */}
                        <div className="w-full sm:w-36 h-36 sm:h-32 rounded-xl relative overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800 bg-zinc-100">
                          <Image
                            src={primaryThumbnail}
                            alt={primaryTitle}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute bottom-2 left-2 z-10">
                            {activeTab === 'ACTIVE' || ['ACTIVE', 'CHECKED_IN'].includes(primaryBooking.status) ? (
                              <span className="bg-[#16A34A] text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-xs">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Active Stay</span>
                              </span>
                            ) : (
                              <span className="bg-[#16A34A] text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-xs">
                                <Sparkles className="w-3 h-3" />
                                <span>{primaryBooking.status || 'Upcoming'}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {primaryRef && (
                              <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-mono px-2 py-0.5 rounded-md inline-block">
                                {primaryRef}
                              </span>
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#16A34A] dark:text-emerald-400">
                              • {primaryBooking.status === 'ACTIVE' ? 'Verified Active Tenancy' : 'Confirmed Reservation'}
                            </span>
                          </div>

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
                              <span>{primaryBooking.room?.roomType || 'Standard Room'}</span>
                            </span>
                            <span>|</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span>{stayDateRange}</span>
                            </span>
                          </div>

                          {/* Amenity Badges (Resolves Anomaly 7) */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-2">
                            {primaryAmenities.map((amenity, idx) => (
                              <span
                                key={idx}
                                className="bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/60 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium px-2.5 py-0.5 rounded-lg"
                              >
                                {amenity}
                              </span>
                            ))}
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
                            Rent GH₵ {primaryRent.toLocaleString('en-GH')}
                            {primaryCaution > 0 && ` • Caution GH₵ ${primaryCaution.toLocaleString('en-GH')}`}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
                          {primaryBooking.id && (
                            <Link
                              href={`/dashboard/tenant/bookings/${primaryBooking.id}`}
                              className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                            >
                              <span>View Details</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Section: Dynamic Horizontal Timeline Tracker (Resolves Anomaly 4) */}
                    {milestoneDatesMap && (
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
                              {milestoneDatesMap.confirmed.date}
                            </span>
                          </div>

                          {/* Milestone 2 */}
                          <div className="flex flex-col items-center text-center relative z-10">
                            <div
                              className={clsx(
                                'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-1.5 shadow-2xs',
                                milestoneDatesMap.signed.done
                                  ? 'bg-[#16A34A] text-white'
                                  : 'border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900'
                              )}
                            >
                              {milestoneDatesMap.signed.done && (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              )}
                            </div>
                            <span className="text-xs font-bold text-zinc-950 dark:text-white block leading-tight">
                              Contract Signed
                            </span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                              {milestoneDatesMap.signed.date}
                            </span>
                          </div>

                          {/* Milestone 3 */}
                          <div className="flex flex-col items-center text-center relative z-10">
                            <div
                              className={clsx(
                                'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-1.5 shadow-2xs',
                                milestoneDatesMap.moveIn.done
                                  ? 'bg-[#16A34A] text-white'
                                  : 'border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900'
                              )}
                            >
                              {milestoneDatesMap.moveIn.done && (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              )}
                            </div>
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block leading-tight">
                              Move-in
                            </span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                              {milestoneDatesMap.moveIn.done ? 'Checked In' : milestoneDatesMap.moveIn.date}
                            </span>
                          </div>

                          {/* Milestone 4 */}
                          <div className="flex flex-col items-center text-center relative z-10">
                            <div
                              className={clsx(
                                'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mb-1.5',
                                milestoneDatesMap.moveOut.done
                                  ? 'bg-[#16A34A] text-white'
                                  : 'border-2 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900'
                              )}
                            >
                              {milestoneDatesMap.moveOut.done && (
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              )}
                            </div>
                            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block leading-tight">
                              Move-out
                            </span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                              {milestoneDatesMap.moveOut.date}
                            </span>
                          </div>

                          {/* Connecting Line between milestones */}
                          <div
                            aria-hidden="true"
                            className="absolute top-3 left-[12%] right-[12%] h-0.5 bg-zinc-200 dark:bg-zinc-700 -z-0"
                          >
                            <div
                              className={clsx(
                                'h-full bg-[#16A34A] transition-all duration-300',
                                milestoneDatesMap.moveOut.done
                                  ? 'w-full'
                                  : milestoneDatesMap.moveIn.done
                                  ? 'w-2/3'
                                  : milestoneDatesMap.signed.done
                                  ? 'w-1/3'
                                  : 'w-0'
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* ── TAB: ACTIVE (when 0 active stays) ── */}
              {activeTab === 'ACTIVE' && counts.ACTIVE === 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-10 text-center space-y-3 shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-zinc-950 dark:text-white">
                      No Active Stay Right Now
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                      Your confirmed reservations will move to Active once your check-in date arrives.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center gap-2.5">
                    {counts.UPCOMING > 0 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('UPCOMING')}
                        className="px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition cursor-pointer"
                      >
                        View Upcoming ({counts.UPCOMING})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab('ALL')}
                      className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                    >
                      Show All Bookings
                    </button>
                  </div>
                </div>
              )}

              {/* ── TAB: UPCOMING (when 0 upcoming) ── */}
              {activeTab === 'UPCOMING' && counts.UPCOMING === 0 && (
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-10 text-center space-y-3 shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-zinc-950 dark:text-white">
                      No Upcoming Reservations
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                      You do not have any future stays scheduled. Explore listings to book your next room.
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center gap-2.5">
                    <Link
                      href="/properties"
                      className="px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition"
                    >
                      Explore Properties
                    </Link>
                  </div>
                </div>
              )}

              {/* ── TAB: PENDING ── */}
              {activeTab === 'PENDING' && (
                <>
                  {pendingBookings.length > 0 ? (
                    <div className="space-y-4">
                      {pendingBookings.map((b: any) => (
                        <div
                          key={b.id}
                          className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                              <Clock className="w-3 h-3" /> Pending Host Approval / Payment
                            </span>
                            <h3 className="text-base font-black text-zinc-950 dark:text-white">
                              {b.property?.title || 'Pending Residence Booking'}
                            </h3>
                            <p className="text-xs text-zinc-500">
                              {b.property?.location || 'Ghana'} • GH₵{' '}
                              {Number(b.room?.price || b.property?.price || 0).toLocaleString()}
                            </p>
                          </div>
                          <Link
                            href={`/dashboard/tenant/bookings/${b.id}`}
                            className="px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition"
                          >
                            Complete Booking
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-10 text-center space-y-3 shadow-2xs">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center mx-auto">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-zinc-950 dark:text-white">
                          No Pending Booking Requests (0)
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                          You have no unpaid or awaiting-approval booking requests right now.
                        </p>
                      </div>
                      <div className="pt-2 flex justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveTab('ALL')}
                          className="px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition cursor-pointer"
                        >
                          Back to All Bookings
                        </button>
                        <Link
                          href="/properties"
                          className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                        >
                          Explore Properties
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── TAB: CANCELLED ── */}
              {activeTab === 'CANCELLED' && (
                <>
                  {cancelledBookings.length > 0 ? (
                    <div className="space-y-4">
                      {cancelledBookings.map((b: any) => (
                        <div
                          key={b.id}
                          className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                              <XCircle className="w-3 h-3" /> {b.status}
                            </span>
                            <h3 className="text-base font-black text-zinc-950 dark:text-white">
                              {b.property?.title || 'Cancelled Booking'}
                            </h3>
                            <p className="text-xs text-zinc-500">
                              {b.property?.location || 'Ghana'}
                            </p>
                          </div>
                          <Link
                            href={`/dashboard/tenant/bookings/${b.id}`}
                            className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold"
                          >
                            View Record
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-10 text-center space-y-3 shadow-2xs">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center mx-auto">
                        <XCircle className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-zinc-950 dark:text-white">
                          No Cancelled Bookings (0)
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                          You have not cancelled or had any booking requests rejected.
                        </p>
                      </div>
                      <div className="pt-2 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setActiveTab('ALL')}
                          className="px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition cursor-pointer"
                        >
                          Back to All Bookings
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Dynamic Past Bookings Section (Resolves Anomaly 2) */}
              {activeTab === 'ALL' && pastStays.length > 0 && (
                <section className="space-y-3 pt-2">
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
                  </div>

                  <div className="space-y-3">
                    {pastStays.map((b: any) => {
                      const pastTitle = b.property?.title || 'Accommodation';
                      const pastLoc = b.property?.location || 'Ghana';
                      const pastDates = b.startDate && b.endDate
                        ? `${format(new Date(b.startDate), 'd MMM yyyy')} – ${format(new Date(b.endDate), 'd MMM yyyy')}`
                        : 'Past Tenancy';
                      const pastTotal = Number(b.price || b.room?.price || b.property?.price || 0);

                      return (
                        <div
                          key={b.id}
                          className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-start sm:items-center gap-4 min-w-0">
                            <div className="w-24 sm:w-28 h-20 sm:h-20 rounded-xl relative overflow-hidden shrink-0 border border-zinc-100 dark:border-zinc-800 bg-zinc-100">
                              <Image
                                src={b.property?.images?.[0] ? getImageUrl(b.property.images[0]) : '/images/resident/booking-glacier-clean.jpg'}
                                alt={pastTitle}
                                fill
                                className="object-cover"
                              />
                              <div className="absolute bottom-1.5 left-1.5 z-10">
                                <span className="bg-slate-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Completed</span>
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1 min-w-0">
                              <h3 className="font-bold text-sm text-zinc-950 dark:text-white uppercase truncate">
                                {pastTitle}
                              </h3>
                              <p className="text-xs text-zinc-500 flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                                <span>{pastLoc}</span>
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                                <span className="flex items-center gap-1">
                                  <Bed className="w-3 h-3" /> {b.room?.roomType || 'Standard Room'}
                                </span>
                                <span>|</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {pastDates}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Total & View Details Button */}
                          <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800 gap-2 shrink-0">
                            <div className="sm:text-right">
                              <span className="text-[10px] text-zinc-400 block font-medium">Total Paid</span>
                              <span className="text-sm font-black text-zinc-950 dark:text-white block">
                                GH₵ {pastTotal.toLocaleString('en-GH')}
                              </span>
                            </div>
                            <Link
                              href={`/dashboard/tenant/bookings/${b.id}`}
                              className="px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:border-emerald-600 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition cursor-pointer"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* RIGHT COLUMN: Booking Overview + Quick Actions + Calendar + Changes Banner */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Booking Overview KPI Card */}
          <div className="bg-gradient-to-br from-[#0F382A] via-[#092B20] to-[#062017] p-5 text-white rounded-2xl relative overflow-hidden shadow-2xs space-y-4">
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

            <div className="flex items-center justify-between text-emerald-200 text-xs font-bold">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4" />
                <span>Booking Overview</span>
              </div>
              {activeTab !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className="text-[10px] text-emerald-300 underline cursor-pointer"
                >
                  Reset filter
                </button>
              )}
            </div>

            {/* 2x2 Interactive Metric Grid */}
            <div className="grid grid-cols-2 gap-3 relative z-10">
              {/* Upcoming */}
              <button
                type="button"
                onClick={() => setActiveTab('UPCOMING')}
                className={clsx(
                  'flex items-center gap-2.5 p-1.5 rounded-lg text-left transition cursor-pointer',
                  activeTab === 'UPCOMING' ? 'bg-white/10 ring-1 ring-emerald-400/50' : 'hover:bg-white/5'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-800/80 border border-emerald-600/50 flex items-center justify-center text-emerald-300 shrink-0">
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
              </button>

              {/* Active Stay */}
              <button
                type="button"
                onClick={() => setActiveTab('ACTIVE')}
                className={clsx(
                  'flex items-center gap-2.5 p-1.5 rounded-lg text-left transition cursor-pointer',
                  activeTab === 'ACTIVE' ? 'bg-white/10 ring-1 ring-emerald-400/50' : 'hover:bg-white/5'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-900/50 border border-emerald-700/40 flex items-center justify-center text-emerald-400 shrink-0">
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
              </button>

              {/* Pending */}
              <button
                type="button"
                onClick={() => setActiveTab('PENDING')}
                className={clsx(
                  'flex items-center gap-2.5 p-1.5 rounded-lg text-left transition cursor-pointer',
                  activeTab === 'PENDING' ? 'bg-white/10 ring-1 ring-emerald-400/50' : 'hover:bg-white/5'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-900/50 border border-emerald-700/40 flex items-center justify-center text-emerald-400 shrink-0">
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
              </button>

              {/* Cancelled */}
              <button
                type="button"
                onClick={() => setActiveTab('CANCELLED')}
                className={clsx(
                  'flex items-center gap-2.5 p-1.5 rounded-lg text-left transition cursor-pointer',
                  activeTab === 'CANCELLED' ? 'bg-white/10 ring-1 ring-emerald-400/50' : 'hover:bg-white/5'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-900/50 border border-emerald-700/40 flex items-center justify-center text-emerald-400 shrink-0">
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
              </button>
            </div>
          </div>

          {/* Card 2: Quick Actions (2x2 Grid) (Resolves Anomaly 8) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <Zap className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
              <h3 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white">
                Quick Actions
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Find Another Home -> /properties */}
              <Link
                href="/properties"
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 border border-zinc-200/60 dark:border-zinc-700 transition space-y-1 block"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Home className="w-3.5 h-3.5" />
                </div>
                <p className="font-bold text-xs text-zinc-950 dark:text-white pt-1">
                  Find Another Home
                </p>
                <p className="text-[10px] text-zinc-400 leading-snug">
                  Explore verified properties
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

          {/* Card 3: Your Calendar Widget (Resolves Anomaly 5) */}
          {(() => {
            const viewYear = calendarCursor.getFullYear();
            const viewMonth = calendarCursor.getMonth();
            const monthLabel = calendarCursor.toLocaleDateString('en-GB', {
              month: 'long',
              year: 'numeric',
            });

            const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
            const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
            const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

            const prevTrailingDays = Array.from({ length: firstDayOfWeek }, (_, idx) => ({
              day: daysInPrevMonth - firstDayOfWeek + idx + 1,
              date: new Date(viewYear, viewMonth - 1, daysInPrevMonth - firstDayOfWeek + idx + 1),
              isCurrentMonth: false,
            }));

            const currentMonthDays = Array.from({ length: daysInMonth }, (_, idx) => ({
              day: idx + 1,
              date: new Date(viewYear, viewMonth, idx + 1),
              isCurrentMonth: true,
            }));

            const totalCellsSoFar = prevTrailingDays.length + currentMonthDays.length;
            const totalGridCells = totalCellsSoFar <= 35 ? 35 : 42;
            const nextLeadingCount = totalGridCells - totalCellsSoFar;

            const nextLeadingDays = Array.from({ length: nextLeadingCount }, (_, idx) => ({
              day: idx + 1,
              date: new Date(viewYear, viewMonth + 1, idx + 1),
              isCurrentMonth: false,
            }));

            const allCells = [...prevTrailingDays, ...currentMonthDays, ...nextLeadingDays];

            // Real milestones from actual bookings (Resolves Anomaly 5)
            const milestoneDates: { date: Date; label: string; type: 'CHECK_IN' | 'MOVE_OUT' }[] = [];
            allBookings.forEach((b) => {
              if (b.startDate) {
                milestoneDates.push({
                  date: new Date(b.startDate),
                  label: `Check-in: ${b.property?.title || 'Accommodation'}`,
                  type: 'CHECK_IN',
                });
              }
              if (b.endDate) {
                milestoneDates.push({
                  date: new Date(b.endDate),
                  label: `Move-out: ${b.property?.title || 'Accommodation'}`,
                  type: 'MOVE_OUT',
                });
              }
            });

            const selectedMilestone = milestoneDates.find((m) =>
              isSameDay(m.date, selectedCalendarDate)
            );
            const isCurrentMonthToday =
              viewYear === today.getFullYear() && viewMonth === today.getMonth();

            return (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
                    <h3 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white">
                      Your Calendar
                    </h3>
                  </div>

                  {!isCurrentMonthToday && (
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setCalendarCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                        setSelectedCalendarDate(now);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 text-[10px] font-bold hover:bg-emerald-100 transition cursor-pointer"
                    >
                      Today
                    </button>
                  )}
                </div>

                {/* Month & Chevrons */}
                <div className="flex items-center justify-between text-xs font-bold text-zinc-950 dark:text-white pt-1">
                  <span>{monthLabel}</span>
                  <div className="flex items-center gap-1 text-zinc-400">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarCursor(new Date(viewYear, viewMonth - 1, 1))
                      }
                      className="p-1 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarCursor(new Date(viewYear, viewMonth + 1, 1))
                      }
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

                  {allCells.map((cell, idx) => {
                    const isTodayCell = isSameDay(cell.date, today);
                    const isSelectedCell = isSameDay(cell.date, selectedCalendarDate);
                    const milestone = milestoneDates.find((m) =>
                      isSameDay(m.date, cell.date)
                    );

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedCalendarDate(cell.date);
                          if (!cell.isCurrentMonth) {
                            setCalendarCursor(
                              new Date(cell.date.getFullYear(), cell.date.getMonth(), 1)
                            );
                          }
                        }}
                        title={
                          milestone
                            ? milestone.label
                            : isTodayCell
                            ? 'Today'
                            : format(cell.date, 'd MMM yyyy')
                        }
                        className="relative flex items-center justify-center py-0.5 cursor-pointer group"
                      >
                        <span
                          className={clsx(
                            'w-6 h-6 rounded-full text-[11px] flex items-center justify-center transition',
                            isTodayCell
                              ? 'bg-[#16A34A] text-white font-bold shadow-xs'
                              : isSelectedCell
                              ? 'bg-emerald-100 dark:bg-emerald-950/70 text-[#0B3B24] dark:text-emerald-300 font-bold ring-1 ring-[#16A34A]'
                              : milestone
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#15803D] dark:text-emerald-400 font-bold ring-1 ring-emerald-300 dark:ring-emerald-700'
                              : cell.isCurrentMonth
                              ? 'text-zinc-700 dark:text-zinc-300 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800'
                              : 'text-zinc-300 dark:text-zinc-600'
                          )}
                        >
                          {cell.day}
                        </span>
                        {milestone && !isTodayCell && (
                          <span className="w-1 h-1 rounded-full bg-[#16A34A] absolute bottom-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Synced Footer Status */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium">
                    {isToday(selectedCalendarDate)
                      ? `Today • ${format(today, 'd MMM yyyy')}`
                      : format(selectedCalendarDate, 'EEE, d MMM yyyy')}
                  </span>
                  <span className="font-bold text-[#16A34A] dark:text-emerald-400 truncate max-w-[155px]">
                    {selectedMilestone ? selectedMilestone.label : 'Synced • Live'}
                  </span>
                </div>
              </div>
            );
          })()}

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
                  Contact resident support with your booking inquiry.
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
