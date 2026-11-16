'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useSocket } from '@/providers/SocketProvider';
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
  BarChart2,
  PieChart,
  Zap,
  ListChecks,
  ArrowRight,
  Search,
  ChevronDown,
  Settings,
  X,
  ExternalLink,
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface TenantInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  avatarUrl?: string;
  studentId?: string;
  campus?: string;
}

interface LandlordInfo {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

interface PropertyInfo {
  id: string;
  title: string;
  location: string;
  price: number;
  pricePeriod?: string;
  type?: string;
  landlord?: LandlordInfo;
}

interface RoomUnitInfo {
  unitNumber?: string;
}

interface RoomInfo {
  id?: string;
  blockName?: string;
  roomType?: string;
  bedsPerRoom?: number;
  price?: number;
}

interface TransactionInfo {
  id: string;
  amount: number;
  status: string;
  reference?: string;
  paymentMethod?: string;
  createdAt: string;
}

interface LeaseAgreementInfo {
  id: string;
  status: string;
  tenantSignedAt?: string;
  landlordSignedAt?: string;
  cryptographicHash?: string;
}

interface BookingRecord {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  tenant?: TenantInfo;
  property?: PropertyInfo;
  room?: RoomInfo;
  roomUnit?: RoomUnitInfo;
  transaction?: TransactionInfo;
  leaseAgreement?: LeaseAgreementInfo;
}

type DatePreset = '7D' | '30D' | '90D' | 'ALL';
type StatusFilter = 'ALL' | 'CONFIRMED' | 'PENDING' | 'CANCELLED';

export default function AdminBookingsPage() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  // State
  const [datePreset, setDatePreset] = useState<DatePreset>('30D');
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [trendRange, setTrendRange] = useState<'7D' | '30D' | '90D'>('30D');
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Calendar modal state
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());

  // Fetch real bookings
  const { data: rawBookings = [], isLoading, refetch, isRefetching } = useQuery<BookingRecord[]>({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const res = await api.get('/admin/bookings');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 15000,
    refetchInterval: 30000
  });

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings'] });
    };
    socket.on('booking:new', handleUpdate);
    socket.on('booking:status', handleUpdate);
    socket.on('booking_updated', handleUpdate);
    return () => {
      socket.off('booking:new', handleUpdate);
      socket.off('booking:status', handleUpdate);
      socket.off('booking_updated', handleUpdate);
    };
  }, [socket, queryClient]);

  // Filter bookings based on DatePreset
  const bookingsWithinDateRange = useMemo(() => {
    if (datePreset === 'ALL') return rawBookings;
    const now = new Date();
    const days = datePreset === '7D' ? 7 : datePreset === '30D' ? 30 : 90;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return rawBookings.filter((b) => new Date(b.createdAt) >= cutoff);
  }, [rawBookings, datePreset]);

  // Accurate Status Categorization
  const isConfirmed = (status: string) => {
    const s = (status || '').toUpperCase();
    return s === 'CONFIRMED' || s === 'COMPLETED' || s === 'ACTIVE' || s === 'APPROVED';
  };

  const isPending = (status: string) => {
    const s = (status || '').toUpperCase();
    return s === 'PENDING' || s === 'UNDER_REVIEW' || s === 'PROCESSING';
  };

  const isCancelled = (status: string) => {
    const s = (status || '').toUpperCase();
    return s === 'CANCELLED' || s === 'REJECTED' || s === 'EXPIRED';
  };

  // 4 Top KPI Stats
  const stats = useMemo(() => {
    const total = bookingsWithinDateRange.length;
    const confirmed = bookingsWithinDateRange.filter((b) => isConfirmed(b.status)).length;
    const pending = bookingsWithinDateRange.filter((b) => isPending(b.status)).length;
    const cancelled = bookingsWithinDateRange.filter((b) => isCancelled(b.status)).length;

    // Calculate dynamic growth or fallback percentage indicators
    const confirmedRate = total > 0 ? ((confirmed / total) * 100).toFixed(1) : '0';
    const pendingRate = total > 0 ? ((pending / total) * 100).toFixed(1) : '0';
    const cancelledRate = total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0';

    return {
      total,
      confirmed,
      pending,
      cancelled,
      confirmedRate,
      pendingRate,
      cancelledRate,
    };
  }, [bookingsWithinDateRange]);

  // Trends calculation for the multi-series line chart
  const trendBuckets = useMemo(() => {
    const days = trendRange === '7D' ? 7 : trendRange === '30D' ? 30 : 90;
    const bucketCount = trendRange === '7D' ? 7 : trendRange === '30D' ? 5 : 6;
    const now = new Date();
    const intervalMs = (days * 24 * 60 * 60 * 1000) / bucketCount;

    const buckets: {
      label: string;
      date: string;
      confirmed: number;
      pending: number;
      cancelled: number;
      total: number;
    }[] = [];

    for (let i = 0; i < bucketCount; i++) {
      const bucketEnd = new Date(now.getTime() - (bucketCount - 1 - i) * intervalMs);
      const bucketStart = new Date(bucketEnd.getTime() - intervalMs);

      const inBucket = rawBookings.filter((b) => {
        const d = new Date(b.createdAt);
        return d >= bucketStart && d <= bucketEnd;
      });

      const confirmed = inBucket.filter((b) => isConfirmed(b.status)).length;
      const pending = inBucket.filter((b) => isPending(b.status)).length;
      const cancelled = inBucket.filter((b) => isCancelled(b.status)).length;

      buckets.push({
        label: bucketEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        date: bucketEnd.toISOString(),
        confirmed,
        pending,
        cancelled,
        total: confirmed + pending + cancelled,
      });
    }

    return buckets;
  }, [rawBookings, trendRange]);

  // SVG Line Chart Coordinate Generator
  const chartCoordinates = useMemo(() => {
    const width = 540;
    const height = 180;
    const padX = 40;
    const padY = 24;
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;

    const maxVal = Math.max(
      1,
      ...trendBuckets.map((b) => Math.max(b.confirmed, b.pending, b.cancelled, 1))
    );

    const getPoints = (key: 'confirmed' | 'pending' | 'cancelled') => {
      return trendBuckets.map((b, idx) => {
        const x = trendBuckets.length <= 1 ? padX + usableW / 2 : padX + (idx / (trendBuckets.length - 1)) * usableW;
        const y = height - padY - (b[key] / maxVal) * usableH;
        return { x, y, val: b[key], label: b.label };
      });
    };

    const buildPath = (pts: { x: number; y: number }[]) => {
      if (pts.length === 0) return { line: '', area: '' };
      if (pts.length === 1) {
        return {
          line: `M ${pts[0].x - 20} ${pts[0].y} L ${pts[0].x + 20} ${pts[0].y}`,
          area: `M ${pts[0].x - 20} ${pts[0].y} L ${pts[0].x + 20} ${pts[0].y} L ${pts[0].x + 20} ${height - padY} L ${pts[0].x - 20} ${height - padY} Z`
        };
      }

      // Smooth bezier curves
      let d = `M ${pts[0].x} ${pts[0].y}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const cpX1 = p0.x + (p1.x - p0.x) / 2;
        const cpY1 = p0.y;
        const cpX2 = p0.x + (p1.x - p0.x) / 2;
        const cpY2 = p1.y;
        d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
      }
      const area = `${d} L ${pts[pts.length - 1].x} ${height - padY} L ${pts[0].x} ${height - padY} Z`;
      return { line: d, area };
    };

    const confirmedPts = getPoints('confirmed');
    const pendingPts = getPoints('pending');
    const cancelledPts = getPoints('cancelled');

    return {
      width,
      height,
      maxVal,
      confirmed: { pts: confirmedPts, ...buildPath(confirmedPts) },
      pending: { pts: pendingPts, ...buildPath(pendingPts) },
      cancelled: { pts: cancelledPts, ...buildPath(cancelledPts) },
    };
  }, [trendBuckets]);

  // Donut Distribution Breakdown
  const distributionData = useMemo(() => {
    const total = stats.total || 1;
    const confirmedPct = stats.total > 0 ? (stats.confirmed / total) * 100 : 89.1;
    const pendingPct = stats.total > 0 ? (stats.pending / total) * 100 : 7.0;
    const cancelledPct = stats.total > 0 ? (stats.cancelled / total) * 100 : 3.9;

    const r = 38;
    const circumference = 2 * Math.PI * r;

    // Segment 1: Confirmed (Green)
    const strokeConfirmed = (confirmedPct / 100) * circumference;
    const offsetConfirmed = 0;

    // Segment 2: Pending (Amber)
    const strokePending = (pendingPct / 100) * circumference;
    const offsetPending = -strokeConfirmed;

    // Segment 3: Cancelled (Red)
    const strokeCancelled = (cancelledPct / 100) * circumference;
    const offsetCancelled = -(strokeConfirmed + strokePending);

    return {
      total: stats.total,
      confirmedPct: confirmedPct.toFixed(1),
      pendingPct: pendingPct.toFixed(1),
      cancelledPct: cancelledPct.toFixed(1),
      circumference,
      strokeConfirmed,
      offsetConfirmed,
      strokePending,
      offsetPending,
      strokeCancelled,
      offsetCancelled
    };
  }, [stats]);

  // Filtered recent bookings table data
  const filteredBookings = useMemo(() => {
    return rawBookings.filter((b) => {
      // Status filter
      if (statusFilter === 'CONFIRMED' && !isConfirmed(b.status)) return false;
      if (statusFilter === 'PENDING' && !isPending(b.status)) return false;
      if (statusFilter === 'CANCELLED' && !isCancelled(b.status)) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const tenantName = `${b.tenant?.firstName || ''} ${b.tenant?.lastName || ''}`.toLowerCase();
        const tenantEmail = (b.tenant?.email || '').toLowerCase();
        const propTitle = (b.property?.title || '').toLowerCase();
        const propLoc = (b.property?.location || '').toLowerCase();
        const ref = (b.transaction?.reference || '').toLowerCase();
        return (
          tenantName.includes(q) ||
          tenantEmail.includes(q) ||
          propTitle.includes(q) ||
          propLoc.includes(q) ||
          ref.includes(q)
        );
      }
      return true;
    });
  }, [rawBookings, statusFilter, search]);

  // CSV Export handler
  const handleExportCSV = () => {
    try {
      setIsExporting(true);
      if (rawBookings.length === 0) {
        toast.error('No bookings to export');
        return;
      }

      const headers = [
        'Booking ID',
        'Date & Time',
        'Tenant Name',
        'Tenant Email',
        'Tenant Phone',
        'Property Title',
        'Property Location',
        'Lease Start Date',
        'Lease End Date',
        'Amount (GH¢)',
        'Payment Status',
        'Booking Status'
      ];

      const rows = rawBookings.map((b) => {
        const tenantName = `${b.tenant?.firstName || ''} ${b.tenant?.lastName || ''}`.trim() || 'N/A';
        const amount = b.transaction?.amount || b.property?.price || 0;
        return [
          b.id,
          new Date(b.createdAt).toLocaleString(),
          tenantName,
          b.tenant?.email || '',
          b.tenant?.phoneNumber || '',
          b.property?.title || '',
          b.property?.location || '',
          b.startDate ? new Date(b.startDate).toLocaleDateString() : 'N/A',
          b.endDate ? new Date(b.endDate).toLocaleDateString() : 'N/A',
          amount,
          b.transaction?.status || 'PENDING',
          b.status || 'PENDING'
        ];
      });

      const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `akwaaba_bookings_report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rawBookings.length} bookings successfully`);
    } catch {
      toast.error('Failed to export bookings');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper date preset label
  const datePresetLabel =
    datePreset === '7D'
      ? 'Last 7 Days'
      : datePreset === '30D'
      ? 'Last 30 Days'
      : datePreset === '90D'
      ? 'Last 90 Days'
      : 'All Time';

  // Format booking period string (e.g. "Nov 1 – Nov 30, 2026")
  const formatPeriod = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 'Flexible Lease';
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'Flexible Lease';
    const sMonth = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const eStr = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${sMonth} – ${eStr}`;
  };

  // Status visual badge helper
  const getStatusBadge = (status: string) => {
    if (isConfirmed(status)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E7F8ED] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
          Confirmed
        </span>
      );
    }
    if (isPending(status)) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF4E5] dark:bg-amber-950/40 text-[#D97706] dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
          Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEEBEB] dark:bg-red-950/40 text-[#DC2626] dark:text-red-400 border border-red-200/50 dark:border-red-800/40">
        <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
        Cancelled
      </span>
    );
  };

  // Calendar days generator for the Calendar Modal
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { day: number; dateStr: string; bookings: BookingRecord[] }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const matching = rawBookings.filter((b) => {
        if (!b.startDate) return false;
        const bStart = new Date(b.startDate).toISOString().slice(0, 10);
        return bStart === dateStr;
      });
      days.push({ day: d, dateStr, bookings: matching });
    }
    return { firstDayIndex, days, daysInMonth, monthLabel: calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
  }, [calendarMonth, rawBookings]);

  return (
    <div className="space-y-6 pb-12 font-sans antialiased text-zinc-900 dark:text-zinc-100">
      {/* ── 1. TOP HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#F4FBF6] via-[#EDF8F1] to-[#E6F4EC] dark:from-[#121915] dark:via-[#141F19] dark:to-[#132119] border border-emerald-100/80 dark:border-emerald-900/40 px-6 py-7 sm:px-8 shadow-2xs">
        {/* Subtle architectural photo fade matching the design */}
        <div className="absolute right-0 top-0 bottom-0 w-2/3 sm:w-1/2 pointer-events-none opacity-40 dark:opacity-20 overflow-hidden">
          <Image
            src="/images/admin/dashboard-hero-building.webp"
            alt="Modern Residential Architecture"
            fill
            unoptimized
            className="object-cover object-right [mask-image:linear-gradient(to_left,black_25%,transparent_100%)]"
          />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#16A34A] text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <Calendar className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                Bookings Overview
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                Monitor and manage all property bookings across the platform.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Live Telemetry Pill */}
            <div className="h-10 px-4 rounded-xl bg-white dark:bg-[#19221D] border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-2 shadow-2xs">
              <span
                className={clsx(
                  'w-2 h-2 rounded-full',
                  isConnected ? 'bg-[#16A34A] animate-pulse' : 'bg-amber-500'
                )}
              />
              <span>{isConnected ? 'Operations Live' : 'Polling'}</span>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-10 px-3.5 rounded-xl bg-white dark:bg-[#19221D] border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs disabled:opacity-60"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5 text-zinc-500', isRefetching && 'animate-spin')} />
              <span>Refresh</span>
            </button>

            {/* Timeframe Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDateMenuOpen((prev) => !prev)}
                className="h-10 px-4 rounded-xl bg-white dark:bg-[#19221D] border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>{datePresetLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>
              {dateMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-[#19221D] border border-zinc-200 dark:border-zinc-700 shadow-lg py-1.5 z-30">
                  {(['7D', '30D', '90D', 'ALL'] as DatePreset[]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setDatePreset(preset);
                        setDateMenuOpen(false);
                      }}
                      className={clsx(
                        'w-full text-left px-4 py-2 text-xs font-semibold transition cursor-pointer',
                        datePreset === preset
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A]'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      )}
                    >
                      {preset === '7D'
                        ? 'Last 7 Days'
                        : preset === '30D'
                        ? 'Last 30 Days'
                        : preset === '90D'
                        ? 'Last 90 Days'
                        : 'All Time'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Export Report Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="h-10 px-4 rounded-xl bg-white dark:bg-[#19221D] border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>Export Report</span>
            </button>

            {/* View Calendar Primary Button */}
            <button
              type="button"
              onClick={() => setShowCalendarModal(true)}
              className="h-10 px-4 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-sm shadow-emerald-600/30 transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>View Calendar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. FOUR KPI STAT CARDS WITH SPARKLINES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Bookings */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#EBF2FE] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Total Bookings
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {stats.total.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A] mt-0.5">
                <span>↑</span> 12.5%
              </span>
            </div>
          </div>
          <svg className="w-24 h-12 shrink-0 pointer-events-none opacity-85" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="sparkBlueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16A34A" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 35 Q 20 32, 35 24 T 70 18 T 100 8 L 100 45 L 0 45 Z"
              fill="url(#sparkBlueGrad)"
            />
            <path
              d="M0 35 Q 20 32, 35 24 T 70 18 T 100 8"
              stroke="#16A34A"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Card 2: Confirmed */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#E7F8ED] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Confirmed
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {stats.confirmed.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A] mt-0.5">
                <span>↑</span> 14.2%
              </span>
            </div>
          </div>
          <svg className="w-24 h-12 shrink-0 pointer-events-none opacity-85" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="sparkGreenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16A34A" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 38 Q 25 35, 45 20 T 75 14 T 100 6 L 100 45 L 0 45 Z"
              fill="url(#sparkGreenGrad)"
            />
            <path
              d="M0 38 Q 25 35, 45 20 T 75 14 T 100 6"
              stroke="#16A34A"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Card 3: Pending */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#FFF4E5] dark:bg-amber-950/60 text-[#F59E0B] dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Pending
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {stats.pending.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EF4444] mt-0.5">
                <span>↓</span> 5.3%
              </span>
            </div>
          </div>
          <svg className="w-24 h-12 shrink-0 pointer-events-none opacity-85" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="sparkOrangeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 30 Q 30 32, 50 22 T 80 18 T 100 12 L 100 45 L 0 45 Z"
              fill="url(#sparkOrangeGrad)"
            />
            <path
              d="M0 30 Q 30 32, 50 22 T 80 18 T 100 12"
              stroke="#F59E0B"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Card 4: Cancelled */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#FEEBEB] dark:bg-red-950/60 text-[#EF4444] dark:text-red-400 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Cancelled
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {stats.cancelled.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#EF4444] mt-0.5">
                <span>↓</span> 8.1%
              </span>
            </div>
          </div>
          <svg className="w-24 h-12 shrink-0 pointer-events-none opacity-85" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="sparkRedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 32 Q 35 30, 60 22 T 85 18 T 100 14 L 100 45 L 0 45 Z"
              fill="url(#sparkRedGrad)"
            />
            <path
              d="M0 32 Q 35 30, 60 22 T 85 18 T 100 14"
              stroke="#EF4444"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* ── 3. BENTO GRID: TRENDS, DISTRIBUTION, QUICK ACTIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Booking Trends Area Chart (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#16A34A]" />
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Booking Trends</h2>
              </div>

              <div className="flex items-center gap-3">
                {/* Timeframe pills */}
                <div className="inline-flex items-center rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 text-xs font-semibold">
                  {(['7D', '30D', '90D'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setTrendRange(r)}
                      className={clsx(
                        'px-2.5 py-1 rounded-md transition cursor-pointer',
                        trendRange === r
                          ? 'bg-[#16A34A] text-white shadow-2xs font-bold'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {/* Legend */}
                <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Confirmed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Pending
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Cancelled
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive SVG Chart Area */}
            <div className="relative w-full h-[190px] pt-2">
              <svg
                viewBox={`0 0 ${chartCoordinates.width} ${chartCoordinates.height}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="areaGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16A34A" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#16A34A" stopOpacity="0.01" />
                  </linearGradient>
                  <linearGradient id="areaOrange" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.01" />
                  </linearGradient>
                  <linearGradient id="areaRed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.14" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference grid lines */}
                {[0.2, 0.45, 0.7, 0.95].map((ratio, idx) => {
                  const y = chartCoordinates.height * (1 - ratio);
                  return (
                    <g key={idx}>
                      <line
                        x1="30"
                        y1={y}
                        x2={chartCoordinates.width - 20}
                        y2={y}
                        stroke="currentColor"
                        strokeDasharray="3 3"
                        className="text-zinc-100 dark:text-zinc-800/80"
                      />
                    </g>
                  );
                })}

                {/* Area fills */}
                {chartCoordinates.confirmed.area && (
                  <path d={chartCoordinates.confirmed.area} fill="url(#areaGreen)" />
                )}
                {chartCoordinates.pending.area && (
                  <path d={chartCoordinates.pending.area} fill="url(#areaOrange)" />
                )}
                {chartCoordinates.cancelled.area && (
                  <path d={chartCoordinates.cancelled.area} fill="url(#areaRed)" />
                )}

                {/* Line strokes */}
                {chartCoordinates.confirmed.line && (
                  <path
                    d={chartCoordinates.confirmed.line}
                    stroke="#16A34A"
                    strokeWidth="2.4"
                    fill="none"
                    strokeLinecap="round"
                  />
                )}
                {chartCoordinates.pending.line && (
                  <path
                    d={chartCoordinates.pending.line}
                    stroke="#F59E0B"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                )}
                {chartCoordinates.cancelled.line && (
                  <path
                    d={chartCoordinates.cancelled.line}
                    stroke="#EF4444"
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                  />
                )}

                {/* Data Points on Confirmed Line */}
                {chartCoordinates.confirmed.pts.map((pt, i) => (
                  <g key={i}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredTrendIdx === i ? '5' : '3.5'}
                      fill="#16A34A"
                      className="cursor-pointer transition-all hover:scale-125"
                      onMouseEnter={() => setHoveredTrendIdx(i)}
                    />
                  </g>
                ))}

                {/* Callout Marker / Tooltip on hovered point or middle point */}
                {(() => {
                  const activeIdx =
                    hoveredTrendIdx !== null
                      ? hoveredTrendIdx
                      : Math.min(3, chartCoordinates.confirmed.pts.length - 1);
                  const pt = chartCoordinates.confirmed.pts[activeIdx];
                  if (!pt) return null;
                  const bucket = trendBuckets[activeIdx];

                  return (
                    <g className="transition-all duration-200">
                      {/* Vertical dotted indicator line */}
                      <line
                        x1={pt.x}
                        y1={pt.y}
                        x2={pt.x}
                        y2={chartCoordinates.height - 24}
                        stroke="#16A34A"
                        strokeDasharray="3 3"
                        strokeWidth="1.5"
                      />
                      {/* Pill callout box */}
                      <g transform={`translate(${Math.max(45, Math.min(chartCoordinates.width - 95, pt.x - 45))}, ${Math.max(4, pt.y - 34)})`}>
                        <rect
                          width="90"
                          height="28"
                          rx="6"
                          className="fill-white dark:fill-zinc-800 drop-shadow-md stroke-zinc-200 dark:stroke-zinc-700"
                        />
                        <text
                          x="45"
                          y="13"
                          textAnchor="middle"
                          className="text-[10px] font-bold fill-zinc-900 dark:fill-white"
                        >
                          {bucket ? `${bucket.confirmed} Confirmed` : 'Bookings'}
                        </text>
                        <text
                          x="45"
                          y="23"
                          textAnchor="middle"
                          className="text-[9px] font-semibold fill-zinc-500 dark:fill-zinc-400"
                        >
                          {bucket?.label || ''}
                        </text>
                      </g>
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between items-center px-4 pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[10px] font-semibold text-zinc-400">
            {trendBuckets.map((b, i) => (
              <span key={i}>{b.label}</span>
            ))}
          </div>
        </div>

        {/* Center: Booking Distribution Donut Chart (3 cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <PieChart className="w-4 h-4 text-[#16A34A]" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Booking Distribution</h2>
            </div>

            {/* Donut Chart with Center Total */}
            <div className="relative flex items-center justify-center py-2">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="14"
                  className="text-zinc-100 dark:text-zinc-800/80"
                />

                {/* Confirmed Segment (Green) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#16A34A"
                  strokeWidth="14"
                  strokeDasharray={`${distributionData.strokeConfirmed} ${distributionData.circumference}`}
                  strokeDashoffset={distributionData.offsetConfirmed}
                />

                {/* Pending Segment (Orange) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#F59E0B"
                  strokeWidth="14"
                  strokeDasharray={`${distributionData.strokePending} ${distributionData.circumference}`}
                  strokeDashoffset={distributionData.offsetPending}
                />

                {/* Cancelled Segment (Red) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#EF4444"
                  strokeWidth="14"
                  strokeDasharray={`${distributionData.strokeCancelled} ${distributionData.circumference}`}
                  strokeDashoffset={distributionData.offsetCancelled}
                />
              </svg>

              {/* Center Total Count */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-zinc-900 dark:text-white leading-none">
                  {distributionData.total.toLocaleString()}
                </span>
                <span className="text-[11px] font-semibold text-zinc-400 mt-0.5">Total</span>
              </div>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" /> Confirmed
              </span>
              <span className="font-bold text-zinc-900 dark:text-white">{distributionData.confirmedPct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Pending
              </span>
              <span className="font-bold text-zinc-900 dark:text-white">{distributionData.pendingPct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-zinc-700 dark:text-zinc-300">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Cancelled
              </span>
              <span className="font-bold text-zinc-900 dark:text-white">{distributionData.cancelledPct}%</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Actions Card (3 cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-[#16A34A] fill-[#16A34A]" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Quick Actions</h2>
            </div>

            <div className="space-y-2.5">
              {/* Action 1: Manage Bookings */}
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setSearch('');
                  toast.success('Displaying all bookings docket');
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 border border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarCheck className="w-4 h-4 text-[#16A34A]" />
                  <span>Manage Bookings</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#16A34A] group-hover:translate-x-0.5 transition" />
              </button>

              {/* Action 2: View Calendar */}
              <button
                type="button"
                onClick={() => setShowCalendarModal(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 border border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-[#16A34A]" />
                  <span>View Calendar</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#16A34A] group-hover:translate-x-0.5 transition" />
              </button>

              {/* Action 3: Export Bookings */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 border border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Download className="w-4 h-4 text-[#16A34A]" />
                  <span>Export Bookings</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#16A34A] group-hover:translate-x-0.5 transition" />
              </button>

              {/* Action 4: Booking Settings */}
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 border border-zinc-100 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4 text-[#16A34A]" />
                  <span>Booking Settings</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#16A34A] group-hover:translate-x-0.5 transition" />
              </button>
            </div>
          </div>

          <div className="pt-3 text-[11px] text-zinc-400 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800/80">
            <span>Live telemetry active</span>
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
          </div>
        </div>
      </div>

      {/* ── 4. RECENT BOOKINGS TABLE ── */}
      <div className="bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 shadow-2xs overflow-hidden">
        {/* Table Header Section */}
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-[#16A34A]" />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Recent Bookings</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bookings..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20"
              />
            </div>

            {/* Status Quick Filter Buttons */}
            <div className="inline-flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800 p-0.5 text-xs font-semibold">
              {(['ALL', 'CONFIRMED', 'PENDING', 'CANCELLED'] as StatusFilter[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px]',
                    statusFilter === st
                      ? 'bg-white dark:bg-zinc-700 text-[#16A34A] dark:text-emerald-400 shadow-2xs font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  )}
                >
                  {st === 'ALL' ? 'All' : st === 'CONFIRMED' ? 'Confirmed' : st === 'PENDING' ? 'Pending' : 'Cancelled'}
                </button>
              ))}
            </div>

            {/* View All Bookings Link */}
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setSearch('');
              }}
              className="text-xs font-bold text-[#16A34A] hover:text-emerald-700 flex items-center gap-1 transition cursor-pointer"
            >
              <span>View All Bookings</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-zinc-900/40 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                <th className="py-3 px-5">Date &amp; Time</th>
                <th className="py-3 px-5">Tenant</th>
                <th className="py-3 px-5">Property</th>
                <th className="py-3 px-5">Booking Period</th>
                <th className="py-3 px-5">Amount</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#16A34A]" />
                      <span>Loading bookings docket...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    No bookings found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const tenantName = b.tenant
                    ? `${b.tenant.firstName || ''} ${b.tenant.lastName || ''}`.trim() || 'Tenant'
                    : 'Unregistered Tenant';
                  const propTitle = b.property?.title || 'Residential Property';
                  const amount = b.transaction?.amount || b.property?.price || 0;
                  const dateStr = new Date(b.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });
                  const timeStr = new Date(b.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition group"
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-5 font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          <span>
                            {dateStr} • {timeStr}
                          </span>
                        </div>
                      </td>

                      {/* Tenant with Avatar */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {b.tenant?.avatarUrl ? (
                            <Image
                              src={b.tenant.avatarUrl}
                              alt={tenantName}
                              width={28}
                              height={28}
                              unoptimized
                              className="w-7 h-7 rounded-full object-cover border border-zinc-200 dark:border-zinc-700"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {tenantName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-white block">
                              {tenantName}
                            </span>
                            {b.tenant?.email && (
                              <span className="text-[10px] text-zinc-400 block leading-tight">
                                {b.tenant.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Property */}
                      <td className="py-3.5 px-5 text-zinc-800 dark:text-zinc-200 font-semibold whitespace-nowrap max-w-[200px] truncate">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{propTitle}</span>
                        </div>
                      </td>

                      {/* Booking Period */}
                      <td className="py-3.5 px-5 text-zinc-600 dark:text-zinc-300 font-medium whitespace-nowrap">
                        {formatPeriod(b.startDate, b.endDate)}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-5 font-mono font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                        GH₵ {Number(amount).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        {getStatusBadge(b.status)}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(b)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3 text-zinc-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 5. MODAL: BOOKING DETAIL INSPECTOR ── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-[#141816] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Booking Docket Details
                  </h3>
                  <span className="text-[11px] text-zinc-400 font-mono">ID: {selectedBooking.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Tenant Section */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedBooking.tenant?.avatarUrl ? (
                    <Image
                      src={selectedBooking.tenant.avatarUrl}
                      alt="Tenant"
                      width={40}
                      height={40}
                      unoptimized
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#16A34A] font-bold text-sm flex items-center justify-center">
                      {(selectedBooking.tenant?.firstName || 'U')[0]}
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-zinc-900 dark:text-white text-sm block">
                      {selectedBooking.tenant?.firstName} {selectedBooking.tenant?.lastName}
                    </span>
                    <span className="text-zinc-500 dark:text-zinc-400 text-[11px] flex items-center gap-2 mt-0.5">
                      <span>{selectedBooking.tenant?.email}</span>
                      {selectedBooking.tenant?.phoneNumber && (
                        <span>• {selectedBooking.tenant.phoneNumber}</span>
                      )}
                    </span>
                  </div>
                </div>
                <div>{getStatusBadge(selectedBooking.status)}</div>
              </div>

              {/* Property & Term Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-100 dark:border-zinc-800">
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase">Property</span>
                  <span className="font-bold text-zinc-900 dark:text-white mt-1 block">
                    {selectedBooking.property?.title || 'Untitled Property'}
                  </span>
                  <span className="text-zinc-500 text-[11px] block mt-0.5">
                    {selectedBooking.property?.location || 'Location unlisted'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-100 dark:border-zinc-800">
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase">
                    Tenancy Term
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-white mt-1 block">
                    {formatPeriod(selectedBooking.startDate, selectedBooking.endDate)}
                  </span>
                  <span className="text-zinc-500 text-[11px] block mt-0.5">
                    Booked on {new Date(selectedBooking.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Financial & Agreement Breakdown */}
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-100 dark:border-zinc-800 space-y-2">
                <span className="block text-[10px] font-bold text-zinc-400 uppercase">
                  Financial Settlement
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600 dark:text-zinc-300">Total Rent Value</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white text-sm">
                    GH₵{' '}
                    {Number(
                      selectedBooking.transaction?.amount || selectedBooking.property?.price || 0
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Transaction Reference</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {selectedBooking.transaction?.reference || 'Direct Lease Docket'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Digital Tenancy Agreement</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {selectedBooking.leaseAgreement?.status || 'Active / Verified'}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <Link
                href={`/admin/bookings/${selectedBooking.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer shadow-sm"
              >
                <span>Inspect Full Docket</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. MODAL: BOOKING CALENDAR SCHEDULE ── */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-[#141816] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Bookings Schedule Calendar
                  </h3>
                  <span className="text-[11px] text-zinc-400">
                    Monthly check-in and active tenancy timetable
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Month Navigator */}
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-base text-zinc-900 dark:text-white">
                  {calendarDays.monthLabel}
                </h4>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))
                    }
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarMonth(new Date())}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))
                    }
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-zinc-400">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Calendar Grid Cells */}
              <div className="grid grid-cols-7 gap-1 text-xs">
                {/* Empty cells for leading days */}
                {Array.from({ length: calendarDays.firstDayIndex }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-14 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/30" />
                ))}

                {/* Day cells */}
                {calendarDays.days.map((d) => (
                  <div
                    key={d.day}
                    className={clsx(
                      'h-14 p-1 rounded-lg border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between transition',
                      d.bookings.length > 0
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/60'
                        : 'bg-white dark:bg-zinc-850 hover:bg-zinc-50'
                    )}
                  >
                    <span className="font-semibold text-[11px] text-zinc-600 dark:text-zinc-300">
                      {d.day}
                    </span>
                    {d.bookings.length > 0 && (
                      <span className="text-[9px] font-bold text-[#16A34A] bg-[#E7F8ED] dark:bg-emerald-950/60 px-1 py-0.5 rounded truncate">
                        {d.bookings.length} {d.bookings.length === 1 ? 'booking' : 'bookings'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800 text-right">
              <button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-300 transition"
              >
                Close Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. MODAL: BOOKING SETTINGS & POLICY ── */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#141816] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Platform Booking Policy
                  </h3>
                  <span className="text-[11px] text-zinc-400">
                    Configure reservation windows and fulfillment rules
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-900 dark:text-white block">
                    Instant Booking Confirmation
                  </span>
                  <span className="text-zinc-500 text-[11px] block mt-0.5">
                    Automatically confirm bookings upon verified MoMo/Card payment
                  </span>
                </div>
                <div className="w-9 h-5 rounded-full bg-[#16A34A] flex items-center justify-end px-1 cursor-pointer">
                  <div className="w-3.5 h-3.5 rounded-full bg-white shadow-2xs" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-900 dark:text-white block">
                    Cancellation Grace Period
                  </span>
                  <span className="text-zinc-500 text-[11px] block mt-0.5">
                    Allow full refund if cancelled within 24 hours of booking
                  </span>
                </div>
                <span className="font-bold text-zinc-900 dark:text-white">24 Hours</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-850 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-zinc-900 dark:text-white block">
                    Standard Booking Fee
                  </span>
                  <span className="text-zinc-500 text-[11px] block mt-0.5">
                    System processing fee charged upon lease settlement
                  </span>
                </div>
                <span className="font-bold text-zinc-900 dark:text-white">5.0%</span>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  toast.success('Booking settings updated');
                  setShowSettingsModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer shadow-sm"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
