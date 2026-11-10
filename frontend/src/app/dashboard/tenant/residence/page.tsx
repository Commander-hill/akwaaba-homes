'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import { DashboardOverviewSkeleton, useInitialSkeleton } from '@/components/ui/PageSkeletons';
import {
  MapPin,
  Calendar,
  Key,
  Wifi,
  Zap,
  Droplets,
  Phone,
  MessageSquare,
  Wrench,
  Receipt,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Loader2,
  Users,
  Copy,
  Check,
  Eye,
  EyeOff,
  X,
  ShieldCheck,
  Building2,
  DollarSign,
  Share2,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Watermark Vector Illustrations matching design mockup
───────────────────────────────────────────────────────────── */

function WifiWatermark() {
  return (
    <svg
      aria-hidden="true"
      className="absolute right-2 -bottom-2 w-32 h-32 text-emerald-900/10 dark:text-emerald-400/10 pointer-events-none select-none"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
    >
      <path d="M 12 34 A 54 54 0 0 1 88 34" />
      <path d="M 24 47 A 38 38 0 0 1 76 47" />
      <path d="M 37 60 A 21 21 0 0 1 63 60" />
      <circle cx="50" cy="73" r="3.5" fill="currentColor" />
    </svg>
  );
}

function ElectricityWatermark() {
  return (
    <svg
      aria-hidden="true"
      className="absolute right-1 -bottom-1 w-32 h-32 text-emerald-900/10 dark:text-emerald-400/10 pointer-events-none select-none"
      viewBox="0 0 120 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* Transmission Tower 1 */}
      <line x1="60" y1="12" x2="60" y2="115" />
      <line x1="42" y1="115" x2="60" y2="12" />
      <line x1="78" y1="115" x2="60" y2="12" />
      {/* Crossbars */}
      <line x1="36" y1="36" x2="84" y2="36" />
      <line x1="30" y1="58" x2="90" y2="58" />
      <line x1="24" y1="82" x2="96" y2="82" />
      {/* Braces */}
      <line x1="36" y1="36" x2="90" y2="58" />
      <line x1="84" y1="36" x2="30" y2="58" />
      <line x1="30" y1="58" x2="96" y2="82" />
      <line x1="90" y1="58" x2="24" y2="82" />
      {/* Transmission Tower 2 in background */}
      <line x1="98" y1="40" x2="98" y2="115" opacity="0.6" />
      <line x1="85" y1="115" x2="98" y2="40" opacity="0.6" />
      <line x1="111" y1="115" x2="98" y2="40" opacity="0.6" />
      <line x1="80" y1="56" x2="116" y2="56" opacity="0.6" />
      <line x1="76" y1="74" x2="120" y2="74" opacity="0.6" />
    </svg>
  );
}

function WaterTowerWatermark() {
  return (
    <svg
      aria-hidden="true"
      className="absolute right-1 -bottom-2 w-28 h-32 text-emerald-900/10 dark:text-emerald-400/10 pointer-events-none select-none"
      viewBox="0 0 100 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* Cylindrical tank */}
      <path d="M 30 20 C 30 14 70 14 70 20 L 70 54 C 70 60 30 60 30 54 Z" />
      <path d="M 30 20 C 30 25 70 25 70 20" />
      <line x1="30" y1="37" x2="70" y2="37" strokeDasharray="3 3" />
      {/* Roof dome */}
      <path d="M 30 20 C 30 8 70 8 70 20" />
      {/* Trestle tower legs */}
      <line x1="33" y1="57" x2="18" y2="115" strokeWidth="3" />
      <line x1="67" y1="57" x2="82" y2="115" strokeWidth="3" />
      <line x1="50" y1="58" x2="50" y2="115" strokeWidth="2.5" />
      {/* Cross bracing */}
      <line x1="30" y1="74" x2="70" y2="74" />
      <line x1="25" y1="94" x2="75" y2="94" />
      <line x1="20" y1="114" x2="80" y2="114" />
      <line x1="30" y1="74" x2="75" y2="94" />
      <line x1="70" y1="74" x2="25" y2="94" />
      <line x1="25" y1="94" x2="80" y2="114" />
      <line x1="75" y1="94" x2="20" y2="114" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Content Component (Wrapped in Suspense)
───────────────────────────────────────────────────────────── */

function ResidencePageContent() {
  const searchParams = useSearchParams();
  const demoParam = searchParams.get('demo') === 'true';

  const [demoActive, setDemoActive] = useState(demoParam);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals state
  const [ecgModalOpen, setEcgModalOpen] = useState(false);
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [wifiModalOpen, setWifiModalOpen] = useState(false);

  // Query active resident tenancy
  const { data: activeBookingData, isLoading } = useQuery({
    queryKey: ['tenant-active-residence'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/bookings/my-active');
        return data.booking || null;
      } catch {
        // Fallback: check /bookings/me for active or checked in stay
        try {
          const { data: res } = await api.get('/bookings/me');
          const list = Array.isArray(res) ? res : res?.bookings || [];
          const found = list.find((b: any) =>
            ['ACTIVE', 'CHECKED_IN', 'CONFIRMED', 'APPROVED'].includes(b.status)
          );
          return found || null;
        } catch {
          return null;
        }
      }
    },
  });

  const liveBooking = activeBookingData;
  const hasLiveBooking = Boolean(liveBooking);

  // Demo fallback matching the screenshot
  const isDemo = !hasLiveBooking && demoActive;

  const property = liveBooking?.property || (isDemo ? {
    id: 'demo-glacier',
    title: 'GLACIER STUDIO',
    location: 'Achimota, Accra',
    price: 20000,
    landlord: {
      firstName: 'Stephen',
      lastName: 'Darko',
      phoneNumber: '+233540123900',
    },
  } : null);

  // Dynamic Room/Unit designation according to schema
  const unitLabel = liveBooking?.roomUnit?.unitNumber
    ? `Unit ${liveBooking.roomUnit.unitNumber}`
    : null;
  const blockLabel = liveBooking?.room?.blockName
    ? `Block ${liveBooking.room.blockName}`
    : null;
  const roomTypeLabel = liveBooking?.room?.roomType || (isDemo ? 'Self-contained' : 'Standard Residence');

  const displayUnitDesignation = unitLabel
    ? [unitLabel, blockLabel, roomTypeLabel].filter(Boolean).join(' · ')
    : (isDemo ? 'Room 1A · Self-contained' : roomTypeLabel);

  const landlord = property?.landlord || {
    firstName: 'Stephen',
    lastName: 'Darko',
    phoneNumber: '+233540123900',
  };

  // Formatted Dates
  const moveInDateStr = liveBooking?.startDate
    ? new Date(liveBooking.startDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : (isDemo ? '06 Sep 2026' : '—');

  const leaseEndsDateStr = liveBooking?.endDate
    ? new Date(liveBooking.endDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : (isDemo ? '06 Sep 2027' : '—');

  const monthlyRentFormatted = Number(
    liveBooking?.room?.price || property?.price || 20000
  ).toLocaleString('en-GH');

  // Dynamic Stay Progress Calculation
  const stayProgress = React.useMemo(() => {
    if (!liveBooking?.startDate || !liveBooking?.endDate) {
      return { percent: 35, label: isDemo ? '35% elapsed' : '0% elapsed' };
    }
    const start = new Date(liveBooking.startDate).getTime();
    const end = new Date(liveBooking.endDate).getTime();
    const now = Date.now();
    if (isNaN(start) || isNaN(end) || end <= start) {
      return { percent: 0, label: '0% elapsed' };
    }
    if (now < start) {
      const daysToStart = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
      return { percent: 0, label: `Starts in ${daysToStart} day${daysToStart === 1 ? '' : 's'}` };
    }
    if (now >= end) {
      return { percent: 100, label: 'Lease completed' };
    }
    const pct = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
    return { percent: pct, label: `${pct}% completed` };
  }, [liveBooking?.startDate, liveBooking?.endDate, isDemo]);

  // Next Rent label
  const nextRentText = React.useMemo(() => {
    if (!liveBooking) return isDemo ? 'Prepaid annual term' : '—';
    if (liveBooking.endDate) {
      const end = new Date(liveBooking.endDate);
      if (end.getTime() < Date.now()) return 'Lease expired';
      return 'Prepaid annual term';
    }
    return 'Active contract';
  }, [liveBooking, isDemo]);

  // Photo Gallery: Real property photos with fallback
  const galleryImages = React.useMemo(() => {
    if (liveBooking?.property?.images) {
      let raw = liveBooking.property.images;
      if (typeof raw === 'string') {
        try {
          raw = JSON.parse(raw);
        } catch {
          raw = [raw];
        }
      }
      if (Array.isArray(raw) && raw.length > 0) {
        const mapped = raw
          .filter((img: any) => typeof img === 'string' && img.trim().length > 0)
          .map((img: string) => getImageUrl(img));
        if (mapped.length > 0) return mapped;
      }
    }
    return [
      '/images/resident/residence-glacier-main.jpg',
      '/images/resident/residence-thumb-1.jpg',
      '/images/resident/residence-thumb-2.jpg',
      '/images/resident/residence-thumb-3.jpg',
    ];
  }, [liveBooking?.property?.images]);

  const activeImageIndex = selectedImageIndex < galleryImages.length ? selectedImageIndex : 0;
  const showSkeleton = useInitialSkeleton(isLoading);
  if (showSkeleton) return <DashboardOverviewSkeleton />;
  const currentMainImage = galleryImages[activeImageIndex] || galleryImages[0];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header & Tenancy Badge ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-zinc-950 dark:text-emerald-100 tracking-tight">
            {hasLiveBooking || isDemo ? 'Your home, under control.' : 'My Residence'}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 font-medium">
            {hasLiveBooking || isDemo ? (
              <>
                Everything you need to manage your stay at{' '}
                <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                  {property?.title || 'Glacier Studio'}
                </span>
                {isDemo && ' (Showcase Preview)'}.
              </>
            ) : (
              'Manage your accommodation details, utilities, and access passes.'
            )}
          </p>
        </div>

        {/* Right Active Tenancy / Demo / No Stay Pill Badge */}
        <div className="flex items-center gap-3">
          {hasLiveBooking ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF6EE] dark:bg-emerald-950/60 border border-[#B7E8C3] dark:border-emerald-800 text-[#0E5C36] dark:text-emerald-300 text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] fill-[#16A34A] text-white" />
              <span>Active Tenancy</span>
            </div>
          ) : isDemo ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Showcase Preview</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold shadow-2xs">
              <Building2 className="w-4 h-4 text-zinc-400" />
              <span>No Active Stay</span>
            </div>
          )}

          {!hasLiveBooking && (
            <button
              onClick={() => setDemoActive(!demoActive)}
              className="text-[11px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline underline-offset-2"
              title="Toggle preview data"
            >
              {demoActive ? 'Show Empty State' : 'Show Demo View'}
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800">
          <Loader2 className="w-7 h-7 animate-spin text-[#16A34A] mx-auto" />
          <p className="text-xs text-zinc-400">Loading your residence details...</p>
        </div>
      ) : !hasLiveBooking && !demoActive ? (
        /* Empty State */
        <div className="p-12 sm:p-16 text-center space-y-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-[#EAF6EE] dark:bg-emerald-950/40 text-[#16A34A] flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold font-serif text-zinc-950 dark:text-white">
              No Active Residence Yet
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              You do not have an active booking reservation or confirmed tenancy agreement right now.
              Once your stay begins, your Wi-Fi credentials, ECG meter, and gate pass will appear here.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs"
            >
              <span>Browse Accommodations</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setDemoActive(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              <span>Preview Demo Residence</span>
            </button>
          </div>
        </div>
      ) : (
        /* ── Main Residence Layout ── */
        <div className="space-y-6">
          {/* ── Top Hero Section: Property Showcase & Stay Overview (2 Columns) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left Card: Property Showcase (7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-2xs flex flex-col justify-between">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Images Column (Left ~58%) */}
                <div className="md:col-span-7 space-y-2.5">
                  {/* Large Featured Photo */}
                  <div className="relative w-full h-48 sm:h-52 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-inner">
                    <Image
                      src={currentMainImage}
                      alt={property?.title || 'Residence Exterior'}
                      fill
                      unoptimized
                      className="object-cover transition duration-300"
                      priority
                      sizes="(max-width: 768px) 100vw, 256px"
/>
                  </div>

                  {/* 3 Thumbnails Strip */}
                  <div className="grid grid-cols-3 gap-2">
                    {galleryImages.slice(1, 4).map((imgSrc, idx) => {
                      const imageIndex = idx + 1;
                      const isSelected = activeImageIndex === imageIndex;
                      return (
                        <button
                          key={imgSrc}
                          type="button"
                          onClick={() => setSelectedImageIndex(imageIndex)}
                          className={`relative h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 transition ${
                            isSelected
                              ? 'border-[#16A34A] dark:border-emerald-500 ring-2 ring-emerald-500/20'
                              : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-700'
                          }`}
                        >
                          <Image
                            src={imgSrc}
                            alt={`Preview ${idx + 1}`}
                            fill
                            unoptimized
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, 256px"
/>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Info Column (Right ~42%) */}
                <div className="md:col-span-5 flex flex-col justify-between h-full py-1 space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-zinc-950 dark:text-white uppercase">
                      {property?.title || 'GLACIER STUDIO'}
                    </h2>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      <MapPin className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                      <span>{property?.location || 'Achimota, Accra'}</span>
                    </div>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      {displayUnitDesignation}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row md:flex-col gap-2 pt-2">
                    <Link
                      href="/dashboard/agreements"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Lease</span>
                    </Link>

                    <Link
                      href={liveBooking?.property?.id ? `/properties/${liveBooking.property.id}` : '/properties'}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                    >
                      <span>Property Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card: Stay Overview (5 cols) - Pure white container */}
            <div className="lg:col-span-5 bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-5">
              {/* Header */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] flex items-center justify-center">
                  <Calendar className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-zinc-950 dark:text-white">
                  Stay Overview
                </h3>
              </div>

              {/* 2 Dates: Move-in & Lease Ends */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                    Move-in Date
                  </span>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-zinc-950 dark:text-white">
                    <Calendar className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                    <span>{moveInDateStr}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                    Lease Ends
                  </span>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-zinc-950 dark:text-white">
                    <Calendar className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                    <span>{leaseEndsDateStr}</span>
                  </div>
                </div>
              </div>

              {/* Monthly Rent */}
              <div>
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 block mb-1">
                  Monthly Rent
                </span>
                <div className="flex items-center gap-1.5 text-base sm:text-lg font-black text-zinc-950 dark:text-white">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-[#16A34A] flex items-center justify-center text-xs font-bold">
                    ₵
                  </div>
                  <span>GH₵{monthlyRentFormatted}</span>
                </div>
              </div>

              {/* Progress Bar: Dynamic Stay Progress */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-800 dark:text-zinc-200">
                    Your Stay Progress
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 font-medium text-[11px]">
                    {stayProgress.label}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-[#16A34A] rounded-full transition-all duration-500"
                    style={{ width: `${stayProgress.percent}%` }}
                  />
                </div>
              </div>

              {/* Next Rent Bottom Bar */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-medium text-zinc-600 dark:text-zinc-400">
                  <Calendar className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Next Rent</span>
                </div>
                <span className="font-bold text-zinc-900 dark:text-white">{nextRentText}</span>
              </div>
            </div>
          </div>

          {/* ── Section: Your Home Services (3 Columns) ── */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-1 rounded-full bg-[#16A34A] dark:bg-emerald-500 inline-block" />
              <h2 className="text-lg font-serif font-bold text-zinc-950 dark:text-white">
                Your home services
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Wi-Fi */}
              <div className="relative rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xs overflow-hidden flex flex-col justify-between min-h-[175px]">
                <WifiWatermark />

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center">
                      <Wifi className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-zinc-950 dark:text-white">Wi-Fi</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#EAF6EE] dark:bg-emerald-950/60 text-[#0E5C36] dark:text-emerald-300 text-[10px] font-bold border border-[#B7E8C3] dark:border-emerald-800">
                        Connected
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                    <p className="font-medium">
                      Network:{' '}
                      <span className="font-bold text-zinc-900 dark:text-white">
                        Akwaaba-Guest
                      </span>
                    </p>
                    <p className="font-medium flex items-center gap-1.5">
                      Password:{' '}
                      <span className="font-mono font-bold text-zinc-900 dark:text-white">
                        {showPassword ? 'AkwaabaStay2026' : '••••••••'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="relative z-10 pt-3">
                  <button
                    type="button"
                    onClick={() => setWifiModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-[#0E5C36] dark:text-emerald-300 text-[11px] font-bold transition"
                  >
                    <span>Reveal details</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Card 2: Electricity */}
              <div className="relative rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xs overflow-hidden flex flex-col justify-between min-h-[175px]">
                <ElectricityWatermark />

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center">
                      <Zap className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <h3 className="font-bold text-sm text-zinc-950 dark:text-white">Electricity</h3>
                  </div>

                  <div className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300">
                    <p className="font-bold text-zinc-900 dark:text-white">ECG prepaid</p>
                    <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] fill-[#16A34A] text-white shrink-0" />
                      <span>Meter status available</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 pt-3">
                  <button
                    type="button"
                    onClick={() => setEcgModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-[#0E5C36] dark:text-emerald-300 text-[11px] font-bold transition"
                  >
                    <span>Top-up guide</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Card 3: Water */}
              <div className="relative rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xs overflow-hidden flex flex-col justify-between min-h-[175px]">
                <WaterTowerWatermark />

                <div className="relative z-10 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center">
                      <Droplets className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-zinc-950 dark:text-white">Water</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#EAF6EE] dark:bg-emerald-950/60 text-[#0E5C36] dark:text-emerald-300 text-[10px] font-bold border border-[#B7E8C3] dark:border-emerald-800">
                        Supply operational
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                    <p className="font-medium text-zinc-600 dark:text-zinc-400">
                      Reservoir available
                    </p>
                  </div>
                </div>

                <div className="relative z-10 pt-3">
                  <Link
                    href="/dashboard/tenant/tickets/new?category=PLUMBING"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-[#0E5C36] dark:text-emerald-300 text-[11px] font-bold transition"
                  >
                    <span>Report an issue</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ── Section: Residence Access & People and Support (2 Columns) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch pt-2">
            {/* Left Column: Residence access (6 cols) */}
            <div className="lg:col-span-6 space-y-2.5">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#16A34A] stroke-[2.5]" />
                <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4">
                  Residence access
                </h3>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-2xs">
                <div className="grid grid-cols-3 divide-x divide-zinc-200 dark:divide-zinc-800 text-center">
                  {/* Guest Pass */}
                  <Link
                    href="/dashboard/tenant/visitors/new"
                    className="px-2 group hover:opacity-90 transition block"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition">
                      <Users className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white block">
                      Guest Pass
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      Invite a guest
                    </span>
                  </Link>

                  {/* Compound Gate */}
                  <button
                    type="button"
                    onClick={() => setGateModalOpen(true)}
                    className="px-2 group hover:opacity-90 transition block text-center"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white block">
                      Compound Gate
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      Access Instructions
                    </span>
                  </button>

                  {/* Caretaker Contact */}
                  <a
                    href={`tel:${landlord.phoneNumber || '+233540123900'}`}
                    className="px-2 group hover:opacity-90 transition block text-center"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition">
                      <Phone className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white block">
                      Caretaker Contact
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                      Get in touch
                    </span>
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column: People & support (6 cols) */}
            <div className="lg:col-span-6 space-y-2.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#16A34A] stroke-[2.5]" />
                <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white underline decoration-zinc-300 dark:decoration-zinc-700 underline-offset-4">
                  People & support
                </h3>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-5 shadow-2xs space-y-3.5">
                {/* Care Team and Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-zinc-950 dark:text-white">
                      Property Care Team
                    </h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Daily support
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${landlord.phoneNumber || '+233540123900'}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>

                    <Link
                      href="/dashboard/messages"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </Link>
                  </div>
                </div>

                {/* Emergency Coral Alert Box */}
                <div className="p-3 rounded-2xl bg-[#FDF1F1] dark:bg-red-950/20 border border-[#FCD4D4] dark:border-red-900/40 flex items-center gap-2.5 text-[#B91C1C] dark:text-red-300 text-xs">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <p className="text-[11px] leading-relaxed">
                    For immediate hazards, contact compound security or local emergency services.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Bottom Quick Actions Row (4 Cards) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
            {/* 1. Report Maintenance */}
            <Link
              href="/dashboard/tenant/tickets/new"
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-700 rounded-2xl p-4 flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 transition shadow-2xs group"
            >
              <div className="flex items-center gap-2.5">
                <Wrench className="w-4 h-4 text-[#16A34A]" />
                <span>Report maintenance</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#16A34A] group-hover:translate-x-0.5 transition" />
            </Link>

            {/* 2. Register a visitor */}
            <Link
              href="/dashboard/tenant/visitors/new"
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-700 rounded-2xl p-4 flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 transition shadow-2xs group"
            >
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-[#16A34A]" />
                <span>Register a visitor</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#16A34A] group-hover:translate-x-0.5 transition" />
            </Link>

            {/* 3. Split a utility bill */}
            <Link
              href="/dashboard/tenant/bills/split/new"
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-700 rounded-2xl p-4 flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 transition shadow-2xs group"
            >
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4 text-[#16A34A]" />
                <span>Split a utility bill</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#16A34A] group-hover:translate-x-0.5 transition" />
            </Link>

            {/* 4. Payment history */}
            <Link
              href="/dashboard/invoice"
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-400 dark:hover:border-emerald-700 rounded-2xl p-4 flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200 transition shadow-2xs group"
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#16A34A]" />
                <span>Payment history</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#16A34A] group-hover:translate-x-0.5 transition" />
            </Link>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
         Interactive Modals
      ───────────────────────────────────────────────────────────── */}

      {/* 1. Wi-Fi Modal */}
      {wifiModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setWifiModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4 cursor-default"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center">
                  <Wifi className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-zinc-950 dark:text-white">
                      Compound Wi-Fi Access
                    </h3>
                    {!hasLiveBooking && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Demo Preview
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500">Fiber high-speed connectivity</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWifiModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">SSID Network:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">
                      Akwaaba-Guest
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('Akwaaba-Guest', 'ssid')}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      {copiedKey === 'ssid' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-200/80 dark:border-zinc-700/60">
                  <span className="text-zinc-500">Password:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">
                      {showPassword ? 'AkwaabaStay2026' : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('AkwaabaStay2026', 'pw')}
                      className="text-zinc-400 hover:text-zinc-600"
                    >
                      {copiedKey === 'pw' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Connect both 2.4GHz and 5GHz bands throughout {property?.title || 'the premises'}. For connection resets,
                contact the caretaker desk.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setWifiModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 2. ECG Electricity Top-up Modal */}
      {ecgModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEcgModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4 cursor-default"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                  <Zap className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-zinc-950 dark:text-white">
                      ECG Prepaid Electricity Guide
                    </h3>
                    {!hasLiveBooking && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Demo Preview
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500">Unit Sub-Meter Top-Up</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEcgModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between">
                <span>Sub-meter Number:</span>
                <span className="font-mono font-bold text-zinc-950 dark:text-white">
                  142-990-482-1
                </span>
              </div>

              <div className="space-y-2 text-[11px] leading-relaxed">
                <p className="font-bold text-zinc-900 dark:text-white">Three ways to purchase power:</p>
                <ol className="list-decimal pl-4 space-y-1 text-zinc-600 dark:text-zinc-400">
                  <li>
                    <strong className="text-zinc-900 dark:text-white">ECG PowerApp:</strong> Enter meter # 1429904821, pay via Mobile Money, and enter token on keypad.
                  </li>
                  <li>
                    <strong className="text-zinc-900 dark:text-white">Mobile Money USSD:</strong> Dial *711# or your provider's bill payment menu for ECG Prepaid.
                  </li>
                  <li>
                    <strong className="text-zinc-900 dark:text-white">Compound Caretaker:</strong> Purchase physical credit tokens directly at the compound office.
                  </li>
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEcgModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* 3. Compound Gate Access Modal */}
      {gateModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setGateModalOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4 cursor-default"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center">
                  <Building2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-zinc-950 dark:text-white">
                      Compound Gate & Security
                    </h3>
                    {!hasLiveBooking && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Demo Preview
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500">{property?.title || 'Glacier Studio'} Access Rules</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 space-y-1">
                <p className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  Pedestrian Gate Keypad Code
                </p>
                <p className="font-mono text-base font-black text-emerald-800 dark:text-emerald-300">
                  # 8 4 2 1 *
                </p>
              </div>

              <div className="space-y-2 text-[11px] leading-relaxed">
                <p>
                  • <strong>Gate Hours:</strong> Main motorized vehicular gate is manned 24/7 by security.
                </p>
                <p>
                  • <strong>Visitor Entry:</strong> Please generate a digital Visitor Pass in advance or notify the gatehouse before arrival.
                </p>
                <p>
                  • <strong>Parking:</strong> Resident parking spot is designated with your room number.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/tenant/visitors/new"
                className="flex-1 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold text-center transition shadow-xs"
              >
                Invite a Guest
              </Link>
              <button
                type="button"
                onClick={() => setGateModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyResidencePage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#16A34A] mx-auto" />
          <p className="text-xs text-zinc-400">Loading residence...</p>
        </div>
      }
    >
      <ResidencePageContent />
    </Suspense>
  );
}
