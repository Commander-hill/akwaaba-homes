'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import api from '@/lib/axios';
import {
  Wrench,
  Clock,
  CheckCircle2,
  Phone,
  Search,
  ShieldAlert,
  ArrowRight,
  MapPin,
  Compass,
  Calendar,
  Tag,
  Users,
  MessageSquare,
  Filter,
  BarChart3,
  Lightbulb,
  Check,
  X,
  Ticket,
  Building,
  Droplets,
  Zap,
  Wind,
  Key,
  FileText,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface RepairItem {
  id: string;
  ticketCode: string;
  title: string;
  description: string;
  dateLabel: string;
  rawDate: string;
  priorityLabel: 'High' | 'Normal';
  statusRaw: string;
  statusType: 'RESOLVED' | 'IN_PROGRESS';
  statusLabel: string;
  progressStep: number;
  teamLabel: string;
  imageUrl?: string;
  propertyName: string;
  propertyLocation: string;
  roomName: string;
}

export default function TenantTicketsPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'High' | 'Normal'>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<RepairItem | null>(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);

  const { data: ticketsData, isLoading: isLoadingTickets } = useQuery({
    queryKey: ['tenant-tickets'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/tickets/me');
        return data.tickets || [];
      } catch {
        return [];
      }
    },
  });

  // Query real active residence booking
  const { data: activeBookingData, isLoading: isLoadingResidence } = useQuery({
    queryKey: ['tenant-active-residence'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/bookings/my-active');
        return data.booking || null;
      } catch {
        try {
          const { data: allBookings } = await api.get('/bookings/me');
          const found = (allBookings.bookings || []).find((b: any) =>
            ['ACTIVE', 'CHECKED_IN', 'CONFIRMED', 'APPROVED'].includes(b.status)
          );
          return found || null;
        } catch {
          return null;
        }
      }
    },
  });

  const hasActiveTenancy = Boolean(activeBookingData);
  const propertyTitle = activeBookingData?.property?.title || 'Residential Residence';
  const propertyLocation =
    activeBookingData?.property?.location || activeBookingData?.property?.address || 'Accra, Ghana';
  const propertyRoom = activeBookingData?.room?.roomNumber
    ? `Room ${activeBookingData.room.roomNumber}`
    : activeBookingData?.roomUnit?.unitNumber
    ? `Unit ${activeBookingData.roomUnit.unitNumber}`
    : 'Allocated Unit';
  const propertyBannerImg =
    activeBookingData?.property?.images?.[0] ||
    activeBookingData?.property?.coverImage ||
    '/images/maintenance/glacier-studio-banner.jpg';
  const emergencyPhone =
    activeBookingData?.property?.landlord?.phoneNumber || '+233 30 200 0000';

  // Map real database tickets
  const liveMappedTickets: RepairItem[] = (ticketsData || []).map((t: any, idx: number) => {
    const isResolved = t.status === 'RESOLVED' || t.status === 'CLOSED';
    const isHigh =
      t.priority === 'HIGH' || t.priority === 'URGENT' || t.priority === 'EMERGENCY';
    const statusUpper = (t.status || 'OPEN').toUpperCase();

    let progressStep = 1;
    let statusLabel = 'Awaiting response';
    if (isResolved) {
      progressStep = 4;
      statusLabel = 'Resolved';
    } else if (statusUpper === 'IN_PROGRESS') {
      progressStep = 3;
      statusLabel = 'Work underway';
    } else if (statusUpper === 'SCHEDULED' || statusUpper === 'ASSIGNED') {
      progressStep = 2;
      statusLabel = 'Assigned to Technician';
    } else if (statusUpper === 'REJECTED') {
      progressStep = 1;
      statusLabel = 'Declined';
    }

    return {
      id: t.id,
      ticketCode: `#MA-${(t.id || '').slice(0, 6).toUpperCase() || String(idx + 1).padStart(4, '0')}`,
      title: t.title || 'Maintenance request',
      description: t.description || 'Submitted via Resident Portal.',
      dateLabel: t.createdAt
        ? new Date(t.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : 'Recent',
      rawDate: t.createdAt || '',
      priorityLabel: isHigh ? 'High' : 'Normal',
      statusRaw: statusUpper,
      statusType: isResolved ? 'RESOLVED' : 'IN_PROGRESS',
      statusLabel,
      progressStep,
      teamLabel: 'Maintenance Team',
      imageUrl: t.imageUrl || undefined,
      propertyName: t.property?.title || propertyTitle,
      propertyLocation: t.property?.location || propertyLocation,
      roomName: propertyRoom,
    };
  });

  const allRequests: RepairItem[] = liveMappedTickets;
  const inProgressCount = allRequests.filter((r) => r.statusType === 'IN_PROGRESS').length;
  const resolvedCount = allRequests.filter((r) => r.statusType === 'RESOLVED').length;

  const filteredRequests = allRequests.filter((req) => {
    const matchesTab =
      activeTab === 'ALL'
        ? true
        : activeTab === 'IN_PROGRESS'
        ? req.statusType === 'IN_PROGRESS'
        : req.statusType === 'RESOLVED';

    const matchesPriority =
      priorityFilter === 'ALL' ? true : req.priorityLabel === priorityFilter;

    const matchesSearch =
      searchQuery.trim() === '' ||
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.ticketCode.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesPriority && matchesSearch;
  });

  // Dynamic Service Activity timeline built from real tickets
  const dynamicActivityEvents = allRequests
    .slice(0, 5)
    .flatMap((req) => {
      const list = [];
      if (req.progressStep >= 4) {
        list.push({
          title: `Issue resolved (${req.ticketCode})`,
          desc: `${req.title} was completed and inspected.`,
          date: req.dateLabel,
        });
      }
      if (req.progressStep >= 2) {
        list.push({
          title: `Technician assigned (${req.ticketCode})`,
          desc: `Work order dispatched to maintenance team.`,
          date: req.dateLabel,
        });
      }
      list.push({
        title: `Request received (${req.ticketCode})`,
        desc: `${req.title} logged for ${req.propertyName}.`,
        date: req.dateLabel,
      });
      return list;
    })
    .slice(0, 3);

  const fullActivityEvents = allRequests.flatMap((req) => {
    const list = [];
    if (req.progressStep >= 4) {
      list.push({
        title: `Issue resolved (${req.ticketCode})`,
        desc: `${req.title} was completed and marked resolved.`,
        date: req.dateLabel,
      });
    }
    if (req.progressStep >= 2) {
      list.push({
        title: `Assigned to ${req.teamLabel}`,
        desc: `Technician assigned to inspect ${req.title}.`,
        date: req.dateLabel,
      });
    }
    list.push({
      title: `Request received (${req.ticketCode})`,
      desc: `${req.title} submitted via Resident Portal.`,
      date: req.dateLabel,
    });
    return list;
  });

  const renderTicketIcon = (req: RepairItem) => {
    if (req.imageUrl) {
      return (
        <div className="w-[88px] h-[72px] relative rounded-xl overflow-hidden shrink-0 border border-black/10">
          <Image
            src={req.imageUrl}
            alt={req.title}
            fill
            sizes="88px"
            className="object-cover"
          />
        </div>
      );
    }

    const lower = (req.title + ' ' + req.description).toLowerCase();
    let IconComponent = Wrench;
    let bgClass = 'bg-[#EAF5EC] text-[#15803D] border-[#CDE2CF]';

    if (
      lower.includes('water') ||
      lower.includes('plumb') ||
      lower.includes('pipe') ||
      lower.includes('drain') ||
      lower.includes('sink') ||
      lower.includes('leak') ||
      lower.includes('toilet')
    ) {
      IconComponent = Droplets;
      bgClass = 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300';
    } else if (
      lower.includes('electric') ||
      lower.includes('power') ||
      lower.includes('light') ||
      lower.includes('socket') ||
      lower.includes('meter')
    ) {
      IconComponent = Zap;
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300';
    } else if (
      lower.includes('ac') ||
      lower.includes('air') ||
      lower.includes('cool') ||
      lower.includes('fan')
    ) {
      IconComponent = Wind;
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300';
    } else if (
      lower.includes('lock') ||
      lower.includes('key') ||
      lower.includes('door') ||
      lower.includes('window')
    ) {
      IconComponent = Key;
      bgClass = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300';
    }

    return (
      <div
        className={clsx(
          'w-[88px] h-[72px] rounded-xl border flex items-center justify-center shrink-0 shadow-2xs',
          bgClass
        )}
      >
        <IconComponent className="w-6 h-6 stroke-[1.9]" />
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F6F0] dark:bg-[#0D100E] text-[#14221A] dark:text-zinc-100 flex flex-col justify-between relative overflow-x-hidden font-sans">
      <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-7 lg:px-10 pt-5 pb-6 flex-1 flex flex-col justify-between gap-4">
        {/* ── 1. HERO TITLE BANNER & REPORT AN ISSUE BUTTON ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-[28px] sm:text-[34px] lg:text-[38px] font-extrabold text-[#0B3B24] dark:text-emerald-400 tracking-tight leading-[1.1]">
              Maintenance &amp; Repairs
            </h1>
            <p className="text-xs sm:text-[13.5px] text-[#3B4B41] dark:text-zinc-400 mt-1.5 font-medium">
              Report a problem, follow progress, and keep your home in good condition.
            </p>
          </div>

          <Link
            href="/dashboard/tenant/tickets/new"
            className="px-5 py-3 rounded-2xl bg-[#136F38] hover:bg-[#0E592C] text-white text-xs sm:text-[13.5px] font-bold inline-flex items-center gap-2.5 shadow-sm transition shrink-0 w-fit cursor-pointer"
          >
            <Wrench className="w-4 h-4 stroke-[2.2]" />
            <span>Report an issue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* ── 2. ACTIVE TENANCY BANNER CARD ── */}
        {hasActiveTenancy ? (
          <div className="relative bg-[#FAF9F4] dark:bg-[#141A16] border border-[#E6E4DA] dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between min-h-[96px] shadow-[0_2px_10px_rgba(11,59,36,0.03)]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 relative z-10">
              {/* Left Building Photo */}
              <div className="w-full sm:w-[215px] h-[96px] relative shrink-0 overflow-hidden bg-zinc-200 dark:bg-zinc-800">
                <Image
                  src={propertyBannerImg}
                  alt={propertyTitle}
                  fill
                  priority
                  sizes="215px"
                  className="object-cover"
                />
              </div>

              {/* Middle Property Info */}
              <div className="px-4 pb-3 sm:p-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 text-[18px] sm:text-[19px] font-extrabold text-[#14221A] dark:text-white tracking-tight">
                    <MapPin className="w-4 h-4 text-[#16A34A] stroke-[2.4]" />
                    <span>{propertyTitle}</span>
                  </span>
                  <span className="px-3 py-0.5 rounded-full bg-[#DCEFE0] dark:bg-emerald-950/60 text-[#116932] dark:text-emerald-300 text-xs font-bold">
                    Active Tenancy
                  </span>
                </div>

                <p className="text-xs text-[#4A5A50] dark:text-zinc-400 font-medium flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#5D6D63]" />
                  <span>{propertyLocation}</span>
                  <span className="text-zinc-400">•</span>
                  <span>{propertyRoom}</span>
                </p>
              </div>
            </div>

            {/* Right Pastel Green Skyline & Trees Graphic */}
            <div className="hidden md:block relative w-[460px] h-[96px] shrink-0 pointer-events-none select-none">
              <Image
                src="/images/maintenance/tenancy-skyline-right.png"
                alt="Residence Skyline"
                fill
                sizes="460px"
                className="object-cover object-right"
              />
              <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#FAF9F4] dark:from-[#141A16] to-transparent" />
            </div>
          </div>
        ) : (
          <div className="relative bg-[#FAF9F4] dark:bg-[#141A16] border border-[#E6E4DA] dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[0_2px_10px_rgba(11,59,36,0.03)]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#EAF5EC] dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center shrink-0">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-extrabold text-[#14221A] dark:text-white">
                    No Active Tenancy on Record
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EAE8DF] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[11px] font-bold">
                    Unassigned
                  </span>
                </div>
                <p className="text-xs text-[#4A5A50] dark:text-zinc-400 mt-0.5">
                  Once your booking is confirmed or checked in, your assigned residence details and dedicated compound contacts will appear here.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/tenant/bookings"
              className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-[#D8D6CA] dark:border-zinc-700 text-xs font-bold text-[#14221A] dark:text-zinc-200 hover:bg-[#F5F4EE] dark:hover:bg-zinc-700 transition shrink-0 w-fit"
            >
              View My Bookings
            </Link>
          </div>
        )}

        {/* ── 3. MAIN 2-COLUMN GRID (LEFT 8 COLS / RIGHT 4 COLS) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* ══════════════════════════════════════════════════════════════════
              LEFT COLUMN (8 COLS): Your repair requests + Recent service activity
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-8 flex flex-col gap-4 justify-between">
            {/* ── Card 1: Your repair requests ── */}
            <div className="bg-[#FAF9F4] dark:bg-[#141A16] border border-[#E6E4DA] dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(11,59,36,0.03)] space-y-4">
              {/* Header */}
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#0B3B24] dark:text-[#16A34A] stroke-[2.1]" />
                <h2 className="text-[16.5px] font-extrabold text-[#14221A] dark:text-white">
                  Your repair requests
                </h2>
              </div>

              {/* Filter Pills & Search Bar Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Left Filter Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ALL')}
                    className={clsx(
                      'px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer',
                      activeTab === 'ALL'
                        ? 'bg-[#0B3B24] text-white shadow-2xs'
                        : 'bg-[#F3F2EC] hover:bg-[#EAE8DF] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#2B3B31] dark:text-zinc-300 border border-[#E2E0D5] dark:border-zinc-700'
                    )}
                  >
                    <span>All requests</span>
                    <span
                      className={clsx(
                        'w-4 h-4 rounded-full text-[10.5px] font-extrabold inline-flex items-center justify-center',
                        activeTab === 'ALL'
                          ? 'bg-[#16A34A] text-white'
                          : 'bg-[#DFDDD2] dark:bg-zinc-700 text-[#2B3B31] dark:text-zinc-300'
                      )}
                    >
                      {allRequests.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('IN_PROGRESS')}
                    className={clsx(
                      'px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer',
                      activeTab === 'IN_PROGRESS'
                        ? 'bg-[#0B3B24] text-white shadow-2xs'
                        : 'bg-[#F3F2EC] hover:bg-[#EAE8DF] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#2B3B31] dark:text-zinc-300 border border-[#E2E0D5] dark:border-zinc-700'
                    )}
                  >
                    <span>In progress</span>
                    <span
                      className={clsx(
                        'w-4 h-4 rounded-full text-[10.5px] font-extrabold inline-flex items-center justify-center',
                        activeTab === 'IN_PROGRESS'
                          ? 'bg-[#16A34A] text-white'
                          : 'bg-[#E2E0D5] dark:bg-zinc-700 text-[#4A5A50] dark:text-zinc-300'
                      )}
                    >
                      {inProgressCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('RESOLVED')}
                    className={clsx(
                      'px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer',
                      activeTab === 'RESOLVED'
                        ? 'bg-[#0B3B24] text-white shadow-2xs'
                        : 'bg-[#F3F2EC] hover:bg-[#EAE8DF] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#2B3B31] dark:text-zinc-300 border border-[#E2E0D5] dark:border-zinc-700'
                    )}
                  >
                    <span>Resolved</span>
                    <span
                      className={clsx(
                        'w-4 h-4 rounded-full text-[10.5px] font-extrabold inline-flex items-center justify-center',
                        activeTab === 'RESOLVED'
                          ? 'bg-[#16A34A] text-white'
                          : 'bg-[#E2E0D5] dark:bg-zinc-700 text-[#4A5A50] dark:text-zinc-300'
                      )}
                    >
                      {resolvedCount}
                    </span>
                  </button>
                </div>

                {/* Right Search Input + Filter Button */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-52">
                    <Search className="w-3.5 h-3.5 text-[#7A887F] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search requests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-9 pl-8 pr-3 rounded-xl bg-[#F5F4EE] dark:bg-zinc-800/80 border border-[#DFDDD2] dark:border-zinc-700 text-xs text-[#14221A] dark:text-white placeholder:text-[#7A887F] focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setPriorityFilter((prev) =>
                        prev === 'ALL' ? 'High' : prev === 'High' ? 'Normal' : 'ALL'
                      )
                    }
                    title={`Filter by priority (Current: ${priorityFilter})`}
                    className={clsx(
                      'w-9 h-9 rounded-xl border flex items-center justify-center transition cursor-pointer shrink-0',
                      priorityFilter !== 'ALL'
                        ? 'bg-[#EAF5EC] border-[#16A34A] text-[#15803D]'
                        : 'bg-[#F5F4EE] hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 border-[#DFDDD2] dark:border-zinc-700 text-[#3B4B41] dark:text-zinc-300'
                    )}
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Request Cards Stack */}
              <div className="space-y-3.5">
                {isLoadingTickets ? (
                  <div className="bg-[#FDFCF9] dark:bg-zinc-900 border border-[#E7E5DC] dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3">
                    <Loader2 className="w-7 h-7 text-[#16A34A] animate-spin mx-auto" />
                    <p className="text-xs text-[#55665B] dark:text-zinc-400 font-medium">
                      Loading your maintenance requests...
                    </p>
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="bg-[#FDFCF9] dark:bg-zinc-900 border border-[#E7E5DC] dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#EAF5EC] dark:bg-emerald-950/60 text-[#16A34A] mx-auto flex items-center justify-center">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <h3 className="font-extrabold text-sm text-[#14221A] dark:text-white">
                      {searchQuery || activeTab !== 'ALL' || priorityFilter !== 'ALL'
                        ? 'No matching maintenance tickets found'
                        : 'No maintenance requests logged yet'}
                    </h3>
                    <p className="text-xs text-[#55665B] dark:text-zinc-400 max-w-sm mx-auto">
                      {searchQuery || activeTab !== 'ALL' || priorityFilter !== 'ALL'
                        ? 'Try adjusting your filter selection or search terms.'
                        : 'Have an issue with plumbing, AC, fixtures, or electrical fittings? Log a quick repair request and the compound team will be dispatched.'}
                    </p>
                    <Link
                      href="/dashboard/tenant/tickets/new"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-2xs"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Report a Repair</span>
                    </Link>
                  </div>
                ) : (
                  filteredRequests.map((req) => {
                    const isResolved = req.statusType === 'RESOLVED';

                    return (
                      <div
                        key={req.id}
                        className="relative bg-[#FDFCF9] dark:bg-zinc-900 border border-[#E7E5DC] dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs"
                      >
                        {/* Left Colored Accent Bar */}
                        <div
                          className={clsx(
                            'absolute left-0 top-0 bottom-0 w-1.5',
                            isResolved ? 'bg-[#16A34A]' : 'bg-[#F59E0B]'
                          )}
                        />

                        <div className="p-3.5 sm:p-4 pl-5 sm:pl-5 space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            {/* Left: Thumbnail + Title/Desc/Date */}
                            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                              {renderTicketIcon(req)}

                              <div className="min-w-0 space-y-1">
                                <h3 className="text-[14.5px] font-extrabold text-[#14221A] dark:text-white leading-snug">
                                  {req.title}
                                </h3>
                                <p className="text-xs text-[#4A5A50] dark:text-zinc-400 leading-snug line-clamp-2">
                                  {req.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-2.5 pt-1 text-[11.5px] text-[#55665B] dark:text-zinc-400 font-semibold">
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-[#69786E]" />
                                    <span>{req.dateLabel}</span>
                                  </span>
                                  <span className="text-[#D4D2C6] dark:text-zinc-700">|</span>
                                  <span className="inline-flex items-center gap-1 font-mono text-[#3B4B41] dark:text-zinc-300">
                                    {isResolved ? (
                                      <Tag className="w-3.5 h-3.5 text-[#69786E]" />
                                    ) : (
                                      <Ticket className="w-3.5 h-3.5 text-[#69786E]" />
                                    )}
                                    <span>{req.ticketCode}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Badges + Team + View details button */}
                            <div className="flex flex-col sm:items-end justify-between gap-2.5 shrink-0">
                              {/* Priority & Status Pills */}
                              <div className="flex items-center gap-2">
                                {req.priorityLabel === 'High' ? (
                                  <span className="px-3 py-1 rounded-full bg-[#FCE8E6] text-[#B42318] dark:bg-rose-950/50 dark:text-rose-300 text-xs font-extrabold">
                                    High
                                  </span>
                                ) : (
                                  <span className="px-3 py-1 rounded-full bg-[#E3F3E6] text-[#15803D] dark:bg-emerald-950/50 dark:text-emerald-300 text-xs font-extrabold">
                                    Normal
                                  </span>
                                )}

                                {isResolved ? (
                                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#E3F3E6] text-[#116932] dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-extrabold">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
                                    <span>Resolved</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FDECCF] text-[#9A5B13] dark:bg-amber-950/60 dark:text-amber-300 text-xs font-extrabold">
                                    <Clock className="w-3.5 h-3.5 text-[#D97706] fill-[#D97706]/20" />
                                    <span>{req.statusLabel}</span>
                                  </span>
                                )}
                              </div>

                              {/* Team & View Details Button */}
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B4B41] dark:text-zinc-400">
                                  <Users className="w-3.5 h-3.5 text-[#5A6A60]" />
                                  <span>{req.teamLabel}</span>
                                </span>

                                <button
                                  type="button"
                                  onClick={() => setSelectedRequest(req)}
                                  className="px-3.5 py-1.5 rounded-xl bg-[#FAF9F5] hover:bg-white dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-[#D8D6CA] dark:border-zinc-700 text-[#14221A] dark:text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                                >
                                  <span>View details</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 4-Step Dynamic Progress Bar */}
                          <div className="pt-2 pb-0.5 px-2 sm:px-8">
                            <div className="relative flex items-center justify-between">
                              {/* Background Line */}
                              <div className="absolute left-6 right-6 top-2.5 h-[2px] bg-[#DEDCD2] dark:bg-zinc-800" />
                              {/* Active Green Line Segment */}
                              <div
                                className="absolute left-6 top-2.5 h-[2px] bg-[#16A34A] transition-all"
                                style={{
                                  width:
                                    req.progressStep === 1
                                      ? '8%'
                                      : req.progressStep === 2
                                      ? '38%'
                                      : req.progressStep === 3
                                      ? '68%'
                                      : 'calc(100% - 3rem)',
                                }}
                              />

                              {/* Step 1: Received */}
                              <div className="relative z-10 flex flex-col items-center gap-1">
                                <span className="w-5 h-5 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-2xs">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                                <span className="text-[11px] font-semibold text-[#3B4B41] dark:text-zinc-300">
                                  Received
                                </span>
                              </div>

                              {/* Step 2: Assigned */}
                              <div className="relative z-10 flex flex-col items-center gap-1">
                                <span
                                  className={clsx(
                                    'w-5 h-5 rounded-full flex items-center justify-center shadow-2xs',
                                    req.progressStep >= 2
                                      ? 'bg-[#16A34A] text-white'
                                      : 'bg-[#FAF9F4] dark:bg-zinc-800 border-2 border-[#D4D2C6] dark:border-zinc-700'
                                  )}
                                >
                                  {req.progressStep >= 2 ? (
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                  )}
                                </span>
                                <span
                                  className={clsx(
                                    'text-[11px]',
                                    req.progressStep === 2
                                      ? 'font-extrabold text-[#14221A] dark:text-white'
                                      : 'font-semibold text-[#5A6A60] dark:text-zinc-400'
                                  )}
                                >
                                  Assigned
                                </span>
                              </div>

                              {/* Step 3: Work underway */}
                              <div className="relative z-10 flex flex-col items-center gap-1">
                                <span
                                  className={clsx(
                                    'w-5 h-5 rounded-full flex items-center justify-center shadow-2xs',
                                    req.progressStep >= 3
                                      ? 'bg-[#16A34A] text-white'
                                      : 'bg-[#FAF9F4] dark:bg-zinc-800 border-2 border-[#D4D2C6] dark:border-zinc-700'
                                  )}
                                >
                                  {req.progressStep > 3 ? (
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  ) : req.progressStep === 3 ? (
                                    <span className="w-2 h-2 rounded-full bg-white" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                  )}
                                </span>
                                <span
                                  className={clsx(
                                    'text-[11px]',
                                    req.progressStep === 3
                                      ? 'font-extrabold text-[#14221A] dark:text-white'
                                      : 'font-semibold text-[#5A6A60] dark:text-zinc-400'
                                  )}
                                >
                                  Work underway
                                </span>
                              </div>

                              {/* Step 4: Completed */}
                              <div className="relative z-10 flex flex-col items-center gap-1">
                                <span
                                  className={clsx(
                                    'w-5 h-5 rounded-full flex items-center justify-center shadow-2xs',
                                    req.progressStep >= 4
                                      ? 'bg-[#16A34A] text-white'
                                      : 'bg-[#FAF9F4] dark:bg-zinc-800 border-2 border-[#D4D2C6] dark:border-zinc-700'
                                  )}
                                >
                                  {req.progressStep >= 4 ? (
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  ) : (
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                                  )}
                                </span>
                                <span
                                  className={clsx(
                                    'text-[11px]',
                                    req.progressStep >= 4
                                      ? 'font-extrabold text-[#14221A] dark:text-white'
                                      : 'font-semibold text-[#5A6A60] dark:text-zinc-400'
                                  )}
                                >
                                  Completed
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Card 2: Recent service activity ── */}
            <div className="bg-[#FAF9F4] dark:bg-[#141A16] border border-[#E6E4DA] dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(11,59,36,0.03)] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#0B3B24] dark:text-[#16A34A] stroke-[2.2]" />
                  <h2 className="text-[15.5px] font-extrabold text-[#14221A] dark:text-white">
                    Recent service activity
                  </h2>
                </div>

                {fullActivityEvents.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActivityModalOpen(true)}
                    className="text-xs font-extrabold text-[#116932] hover:text-[#0B3B24] dark:text-emerald-400 dark:hover:text-emerald-300 inline-flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span>View all activity</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {dynamicActivityEvents.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#5A6A60] dark:text-zinc-400">
                  <p>No recent service activity recorded.</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                    Live updates will appear here when technicians are assigned or work is completed.
                  </p>
                </div>
              ) : (
                <div className="relative px-2 sm:px-6 pt-1 pb-1">
                  <div className="hidden sm:block absolute left-10 right-24 top-[9px] h-[2px] bg-[#16A34A]" />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                    {dynamicActivityEvents.map((evt, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <div>
                          <p className="text-xs font-extrabold text-[#14221A] dark:text-white">
                            {evt.date}
                          </p>
                          <p className="text-[11.5px] text-[#4A5A50] dark:text-zinc-400">
                            {evt.title}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT COLUMN (4 COLS): Service at a glance + Emergency + Helpful tips
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 flex flex-col gap-4 justify-between">
            {/* ── Card 1: Service at a glance ── */}
            <div className="bg-[#FAF9F4] dark:bg-[#141A16] border border-[#E6E4DA] dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(11,59,36,0.03)] space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#0B3B24] dark:text-[#16A34A] stroke-[2.2]" />
                <h2 className="text-[15.5px] font-extrabold text-[#14221A] dark:text-white">
                  Service at a glance
                </h2>
              </div>

              <div className="grid grid-cols-2 divide-x divide-[#E5E3D8] dark:divide-zinc-800 py-1">
                {/* Awaiting response */}
                <div className="pr-3 flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#F59E0B] text-white flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                  </span>
                  <div>
                    <p className="text-[22px] font-extrabold text-[#14221A] dark:text-white leading-none">
                      {inProgressCount}
                    </p>
                    <p className="text-xs text-[#4A5A50] dark:text-zinc-400 mt-1 font-medium">
                      awaiting response
                    </p>
                  </div>
                </div>

                {/* Resolved */}
                <div className="pl-4 flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#EAF5EC] dark:bg-emerald-950/60 text-[#16A34A] border border-[#16A34A] flex items-center justify-center shrink-0 mt-1 shadow-2xs">
                    <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                  </span>
                  <div>
                    <p className="text-[22px] font-extrabold text-[#14221A] dark:text-white leading-none">
                      {resolvedCount}
                    </p>
                    <p className="text-xs text-[#4A5A50] dark:text-zinc-400 mt-1 font-medium">
                      resolved
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#EAE8DF] dark:border-zinc-800 flex items-center gap-2.5 text-xs">
                <Calendar className="w-4 h-4 text-[#3B4B41] dark:text-zinc-400 shrink-0" />
                <div>
                  <p className="text-[#4A5A50] dark:text-zinc-400">Support hours:</p>
                  <p className="font-extrabold text-[#14221A] dark:text-white">Mon–Sat, 8am–6pm</p>
                </div>
              </div>
            </div>

            {/* ── Card 2: Emergency assistance (Soft Coral/Red Card) ── */}
            <div className="bg-[#FCECE9] dark:bg-rose-950/20 border border-[#F3C7C0] dark:border-rose-900/40 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(180,35,24,0.04)] space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#C93535] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-[15.5px] font-extrabold text-[#8A1C1C] dark:text-rose-400">
                    Emergency assistance
                  </h2>
                  <p className="text-xs text-[#3D2323] dark:text-zinc-300 leading-relaxed font-medium">
                    For flooding, exposed wiring, gas leaks or immediate danger, contact compound security or local emergency services.
                  </p>
                </div>
              </div>

              <a
                href={`tel:${emergencyPhone.replace(/\s+/g, '')}`}
                className="w-full py-2.5 px-4 rounded-xl bg-[#C83232] hover:bg-[#B02727] text-white text-xs sm:text-[13px] font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call compound security ({emergencyPhone})</span>
              </a>
            </div>

            {/* ── Card 3: Helpful before you report (Soft Mint Green Card) ── */}
            <div className="bg-[#E8F3E9] dark:bg-emerald-950/20 border border-[#CDE2CF] dark:border-emerald-900/40 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(11,59,36,0.03)] space-y-3">
              <div className="flex items-center gap-2.5">
                <Lightbulb className="w-5 h-5 text-[#15803D] dark:text-emerald-400 fill-[#15803D]/20 stroke-[2.2]" />
                <h2 className="text-[15px] font-extrabold text-[#14221A] dark:text-white">
                  Helpful before you report
                </h2>
              </div>

              <ul className="space-y-2 pl-1">
                {[
                  'Add a photo',
                  'Describe where the issue occurs',
                  'Include access availability',
                ].map((tip) => (
                  <li
                    key={tip}
                    className="flex items-center gap-2.5 text-xs font-semibold text-[#1E2E24] dark:text-zinc-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#15803D] dark:text-emerald-400 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. BOTTOM FOOTER BAR ── */}
      <footer className="w-full border-t border-[#E5E3D8] dark:border-zinc-800 bg-[#F3F1E8]/80 dark:bg-[#0D100E] py-3 px-4 sm:px-8 lg:px-12 mt-auto">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11.5px] text-[#4E5D53] dark:text-zinc-400 font-medium">
          <span>
            © 2026 <strong className="text-[#14221A] dark:text-white">Akwaaba Homes Ghana</strong>
          </span>
          <div className="flex items-center gap-2.5 font-semibold text-[#3B4A40] dark:text-zinc-300">
            <Link href="/terms" className="hover:text-[#0B3B24] dark:hover:text-emerald-400 transition">
              Terms
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-[#0B3B24] dark:hover:text-emerald-400 transition">
              Privacy
            </Link>
            <span>•</span>
            <Link href="/support" className="hover:text-[#0B3B24] dark:hover:text-emerald-400 transition">
              Support
            </Link>
          </div>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1: REPAIR REQUEST DETAILS MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[11px] font-mono font-bold text-[#15803D] dark:text-emerald-400">
                  {selectedRequest.ticketCode} • {selectedRequest.propertyName} ({selectedRequest.roomName})
                </span>
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-white mt-0.5">
                  {selectedRequest.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700 space-y-2 text-xs text-zinc-700 dark:text-zinc-300">
              <p>
                <strong>Submitted:</strong> {selectedRequest.dateLabel}
              </p>
              <p>
                <strong>Assigned To:</strong> {selectedRequest.teamLabel}
              </p>
              <p>
                <strong>Priority:</strong> {selectedRequest.priorityLabel}
              </p>
              <p>
                <strong>Status:</strong> {selectedRequest.statusLabel}
              </p>
              <hr className="border-zinc-200 dark:border-zinc-700 my-2" />
              <p className="leading-relaxed whitespace-pre-line">{selectedRequest.description}</p>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Close
              </button>
              <Link
                href={`/dashboard/tenant/tickets/${selectedRequest.id}`}
                className="px-4 py-2 rounded-lg bg-[#0B3B24] hover:bg-[#072B1D] text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Full Ticket &amp; Notes</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: SERVICE ACTIVITY TIMELINE MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {activityModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0B3B24] dark:text-[#16A34A]" />
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
                  Complete Service Activity Log
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivityModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs overflow-y-auto flex-1 pr-1">
              {fullActivityEvents.length === 0 ? (
                <div className="py-8 text-center text-zinc-500">
                  <p>No activity entries recorded yet.</p>
                </div>
              ) : (
                fullActivityEvents.map((evt, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/70 dark:border-zinc-700 flex justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">{evt.title}</p>
                      <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">{evt.desc}</p>
                    </div>
                    <span className="text-[11px] text-zinc-500 shrink-0 font-medium">
                      {evt.date}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setActivityModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#0B3B24] text-white text-xs font-bold cursor-pointer hover:bg-[#072B1D] transition"
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
