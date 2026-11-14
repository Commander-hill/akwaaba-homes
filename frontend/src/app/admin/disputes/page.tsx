'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import {
  Scale,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Download,
  Plus,
  ChevronDown,
  ArrowRight,
  MoreVertical,
  Search,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  X,
  Gavel,
  ShieldAlert,
  Loader2,
  FileText,
  User as UserIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type TabFilter = 'ALL' | 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'ESCALATED';
type TimeRange = 'Last 30 Days' | 'Last 6 Months' | 'Last 12 Months' | 'All Time';

interface DisputeRecord {
  id: string;
  title: string;
  description?: string;
  category?: string;
  severity?: string;
  status: string;
  createdAt: string;
  property?: {
    id: string;
    title?: string;
    location?: string;
    images?: string[];
  } | null;
  tenant?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
    avatar?: string;
    reputationScore?: number;
    isSuspended?: boolean;
  } | null;
  reporter?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
  } | null;
}

const PROPERTY_FALLBACK_IMAGES = [
  '/images/resident/prop-kimo.jpg',
  '/images/resident/booking-glacier-clean.jpg',
  '/images/resident/prop-premium-studio.jpg',
  '/images/resident/landlord-properties-hero-bldg.jpg',
];

function getFallbackPropertyImage(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % PROPERTY_FALLBACK_IMAGES.length;
  }
  return PROPERTY_FALLBACK_IMAGES[Math.abs(hash) % PROPERTY_FALLBACK_IMAGES.length];
}

function formatShortDate(dateInput: string): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return 'Recent';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeDays(dateInput: string): string {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return 'Just now';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function formatCaseCode(dispute: DisputeRecord): string {
  const yr = new Date(dispute.createdAt).getFullYear() || 2024;
  const suffix = dispute.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '1042';
  return `Case #DH-${yr}-${suffix}`;
}

function normalizeStatusBucket(status?: string, severity?: string): Exclude<TabFilter, 'ALL'> {
  const upper = (status || 'PENDING').toUpperCase();
  if (upper === 'ESCALATED' || (upper === 'PENDING' && severity?.toUpperCase() === 'CRITICAL')) {
    return 'ESCALATED';
  }
  if (upper === 'IN_REVIEW' || upper === 'UNDER_REVIEW') return 'IN_REVIEW';
  if (upper === 'VERIFIED' || upper === 'RESOLVED' || upper === 'REJECTED' || upper === 'DISMISSED') {
    return 'RESOLVED';
  }
  return 'PENDING';
}

function getStatusPillConfig(status?: string, severity?: string) {
  const bucket = normalizeStatusBucket(status, severity);
  switch (bucket) {
    case 'IN_REVIEW':
      return {
        label: 'In Review',
        bg: 'bg-[#EFF6FF] dark:bg-blue-950/50',
        text: 'text-[#2563EB] dark:text-blue-400',
        dot: 'bg-[#2563EB] dark:bg-blue-400',
      };
    case 'RESOLVED':
      return {
        label: status?.toUpperCase() === 'REJECTED' || status?.toUpperCase() === 'DISMISSED' ? 'Dismissed' : 'Resolved',
        bg: 'bg-[#ECFDF5] dark:bg-emerald-950/50',
        text: 'text-[#16A34A] dark:text-emerald-400',
        dot: 'bg-[#16A34A] dark:bg-emerald-400',
      };
    case 'ESCALATED':
      return {
        label: 'Escalated',
        bg: 'bg-[#FFF7ED] dark:bg-orange-950/50',
        text: 'text-[#EA580C] dark:text-orange-400',
        dot: 'bg-[#EA580C] dark:bg-orange-400',
      };
    default:
      return {
        label: 'Pending',
        bg: 'bg-[#FEF2F2] dark:bg-rose-950/50',
        text: 'text-[#DC2626] dark:text-rose-400',
        dot: 'bg-[#DC2626] dark:bg-rose-400',
      };
  }
}

function getCategoryPillConfig(dispute: DisputeRecord) {
  const sev = (dispute.severity || '').toUpperCase();
  const cat = (dispute.category || dispute.title || '').toLowerCase();

  if (sev === 'HIGH' || sev === 'CRITICAL' || cat.includes('late') || cat.includes('rent')) {
    return {
      label: sev === 'HIGH' || sev === 'CRITICAL' ? 'High Priority' : 'Late Payment',
      bg: 'bg-[#FEF2F2] dark:bg-rose-950/60',
      text: 'text-[#DC2626] dark:text-rose-400',
      icon: AlertCircle,
    };
  }
  if (cat.includes('damage')) {
    return {
      label: 'Property Damage',
      bg: 'bg-[#FFF7ED] dark:bg-orange-950/60',
      text: 'text-[#EA580C] dark:text-orange-400',
      icon: ShieldAlert,
    };
  }
  if (cat.includes('maintenance') || cat.includes('complaint') || cat.includes('delay')) {
    return {
      label: 'Tenant Complaint',
      bg: 'bg-[#ECFDF5] dark:bg-emerald-950/60',
      text: 'text-[#16A34A] dark:text-emerald-400',
      icon: CheckCircle2,
    };
  }
  return {
    label: 'Lease Breach',
    bg: 'bg-[#EFF6FF] dark:bg-blue-950/60',
    text: 'text-[#2563EB] dark:text-blue-400',
    icon: AlertCircle,
  };
}

export default function AdminDisputesPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabFilter>('ALL');
  const [search, setSearch] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('Last 6 Months');
  const [timeDropdownOpen, setTimeDropdownOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Adjudication modal state
  const [actionTarget, setActionTarget] = useState<DisputeRecord | null>(null);
  const [verdictStatus, setVerdictStatus] = useState<'VERIFIED' | 'REJECTED'>('VERIFIED');
  const [adminNotes, setAdminNotes] = useState('');
  const [penaltyPoints, setPenaltyPoints] = useState(1.0);
  const [suspendAccount, setSuspendAccount] = useState(false);

  // Info modal for "+ New Dispute"
  const [newDisputeModalOpen, setNewDisputeModalOpen] = useState(false);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['admin-breaches'],
    queryFn: async () => {
      const res = await api.get('/admin/breaches');
      return res.data;
    },
    staleTime: 20_000,
  });

  const disputes: DisputeRecord[] = useMemo(() => data?.breaches || [], [data]);

  const timeFiltered = useMemo(() => {
    if (timeRange === 'All Time') return disputes;
    const now = Date.now();
    const days = timeRange === 'Last 30 Days' ? 30 : timeRange === 'Last 6 Months' ? 180 : 365;
    const cutoff = now - days * 86_400_000;
    return disputes.filter((d) => new Date(d.createdAt).getTime() >= cutoff);
  }, [disputes, timeRange]);

  const counts = useMemo(() => {
    let pending = 0;
    let inReview = 0;
    let resolved = 0;
    let escalated = 0;

    for (const d of timeFiltered) {
      const bucket = normalizeStatusBucket(d.status, d.severity);
      if (bucket === 'PENDING') pending++;
      else if (bucket === 'IN_REVIEW') inReview++;
      else if (bucket === 'RESOLVED') resolved++;
      else if (bucket === 'ESCALATED') escalated++;
    }

    return {
      all: timeFiltered.length,
      pending,
      inReview,
      resolved,
      escalated,
    };
  }, [timeFiltered]);

  const filteredDisputes = useMemo(() => {
    return timeFiltered.filter((d) => {
      const bucket = normalizeStatusBucket(d.status, d.severity);
      if (activeTab !== 'ALL' && bucket !== activeTab) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const title = (d.title || '').toLowerCase();
        const prop = (d.property?.title || '').toLowerCase();
        const loc = (d.property?.location || '').toLowerCase();
        const tenant = `${d.tenant?.firstName || ''} ${d.tenant?.lastName || ''}`.toLowerCase();
        const reporter = `${d.reporter?.firstName || ''} ${d.reporter?.lastName || ''}`.toLowerCase();
        return (
          title.includes(q) ||
          prop.includes(q) ||
          loc.includes(q) ||
          tenant.includes(q) ||
          reporter.includes(q)
        );
      }
      return true;
    });
  }, [timeFiltered, activeTab, search]);

  useEffect(() => {
    if (filteredDisputes.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillExists = filteredDisputes.some((d) => d.id === selectedId);
    if (!stillExists) {
      setSelectedId(filteredDisputes[0].id);
    }
  }, [filteredDisputes, selectedId]);

  const selectedDispute = useMemo(
    () => filteredDisputes.find((d) => d.id === selectedId) || filteredDisputes[0] || null,
    [filteredDisputes, selectedId]
  );

  const resolveMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
      penaltyDeduction,
      suspend,
    }: {
      id: string;
      status: 'VERIFIED' | 'REJECTED';
      notes: string;
      penaltyDeduction?: number;
      suspend?: boolean;
    }) => {
      const res = await api.put(`/admin/breaches/${id}/resolve`, {
        status,
        adminNotes: notes,
        penaltyDeduction,
        suspendAccount: suspend,
      });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.status === 'VERIFIED'
          ? 'Dispute verified and enforcement applied.'
          : 'Dispute dismissed cleanly.'
      );
      setActionTarget(null);
      setAdminNotes('');
      setSuspendAccount(false);
      queryClient.invalidateQueries({ queryKey: ['admin-breaches'] });
      queryClient.invalidateQueries({ queryKey: ['admin-action-queue'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to resolve dispute');
    },
  });

  const handleExportCsv = () => {
    if (filteredDisputes.length === 0) {
      toast.error('No disputes to export');
      return;
    }
    const headers = ['Case ID', 'Title', 'Property', 'Location', 'Tenant', 'Email', 'Status', 'Submitted Date'];
    const rows = filteredDisputes.map((d) => [
      formatCaseCode(d),
      `"${(d.title || '').replace(/"/g, '""')}"`,
      `"${(d.property?.title || 'Residential Property').replace(/"/g, '""')}"`,
      `"${(d.property?.location || 'Accra, Ghana').replace(/"/g, '""')}"`,
      `"${`${d.tenant?.firstName || ''} ${d.tenant?.lastName || ''}`.trim() || 'Tenant'}"`,
      d.tenant?.email || '',
      getStatusPillConfig(d.status, d.severity).label,
      formatShortDate(d.createdAt),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disputes-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredDisputes.length} dispute records`);
  };

  const openTakeAction = (dispute: DisputeRecord, defaultStatus: 'VERIFIED' | 'REJECTED' = 'VERIFIED') => {
    setActionTarget(dispute);
    setVerdictStatus(defaultStatus);
    setAdminNotes('');
    setPenaltyPoints(1.0);
    setSuspendAccount(false);
    setOpenMenuId(null);
  };

  const renderSparkline = (stroke: string, fillId: string, dPath: string) => (
    <svg viewBox="0 0 110 38" className="w-24 h-9 shrink-0 overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={`${dPath} L108,36 L2,36 Z`} fill={`url(#${fillId})`} />
      <path d={dPath} fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  return (
    <div className="space-y-5 pb-12">
      {/* ── 1. HERO HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#F2FBF5] via-[#ECFDF5] to-[#E6F7ED] dark:from-[#062919] dark:via-[#052014] dark:to-[#041a10] border border-[#D4F2DE] dark:border-emerald-900/40 px-6 py-5 sm:px-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs">
        <img
          src="/images/admin/dashboard-hero-building.png"
          alt=""
          className="absolute right-0 bottom-0 h-full w-auto max-w-[420px] object-cover object-left opacity-35 dark:opacity-20 pointer-events-none select-none hidden md:block [mask-image:linear-gradient(to_left,black_55%,transparent_100%)]"
        />

        <div className="relative z-10 space-y-1">
          <nav className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <Link href="/admin/dashboard" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition">
              Admin
            </Link>
            <span>&rsaquo;</span>
            <span>Operations</span>
            <span>&rsaquo;</span>
            <span className="font-bold text-zinc-900 dark:text-white">Disputes</span>
          </nav>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Disputes &amp; Lease Breaches
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-medium">
            Review, manage and resolve tenant disputes and lease violations efficiently.
          </p>
        </div>

        <div className="relative z-20 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            title="Refresh disputes"
            className="p-2.5 rounded-xl bg-white/95 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs"
          >
            <RefreshCw className={clsx('w-4 h-4', isRefetching && 'animate-spin text-[#16A34A]')} />
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-xl bg-white/95 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-zinc-500" />
            <span>Export Report</span>
          </button>

          <button
            type="button"
            onClick={() => setNewDisputeModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Dispute</span>
          </button>
        </div>
      </div>

      {/* ── 2. 4 KPI STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Disputes */}
        <div className="rounded-2xl bg-gradient-to-br from-[#F2FBF5] to-[#E6F8EC] dark:from-[#072617] dark:to-[#04180f] border border-[#D4F2DE] dark:border-emerald-900/50 p-4 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-full bg-[#D1F4DF] dark:bg-emerald-900/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 truncate">Total Disputes</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">{counts.all}</span>
                <span className="text-[11px] font-bold text-[#16A34A] dark:text-emerald-400">&uarr; +12%</span>
              </div>
            </div>
          </div>
          {renderSparkline('#16A34A', 'sparkTotal', 'M2,30 Q22,22 38,26 T70,16 T108,8')}
        </div>

        {/* Pending */}
        <div className="rounded-2xl bg-gradient-to-br from-[#F2F7FF] to-[#E8F1FF] dark:from-[#081b33] dark:to-[#051224] border border-[#D6E6FF] dark:border-blue-900/50 p-4 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-full bg-[#DCEBFF] dark:bg-blue-900/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 truncate">Pending</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">{counts.pending}</span>
                <span className="text-[11px] font-bold text-[#2563EB] dark:text-blue-400">&uarr; +6%</span>
              </div>
            </div>
          </div>
          {renderSparkline('#2563EB', 'sparkPending', 'M2,32 Q25,28 45,22 T78,20 T108,10')}
        </div>

        {/* In Review */}
        <div className="rounded-2xl bg-gradient-to-br from-[#FFF7EE] to-[#FFEFDD] dark:from-[#291707] dark:to-[#1d1004] border border-[#FFE0BF] dark:border-orange-900/50 p-4 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-full bg-[#FFE4C4] dark:bg-orange-900/60 text-[#EA580C] dark:text-orange-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 truncate">In Review</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">{counts.inReview}</span>
                <span className="text-[11px] font-bold text-[#EA580C] dark:text-orange-400">&uarr; +3%</span>
              </div>
            </div>
          </div>
          {renderSparkline('#EA580C', 'sparkReview', 'M2,30 Q24,26 48,18 T82,22 T108,12')}
        </div>

        {/* Resolved */}
        <div className="rounded-2xl bg-gradient-to-br from-[#F8F3FF] to-[#F0E6FF] dark:from-[#1f0e33] dark:to-[#150924] border border-[#E5D4FF] dark:border-purple-900/50 p-4 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-full bg-[#EBD9FF] dark:bg-purple-900/60 text-[#7C3AED] dark:text-purple-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 truncate">Resolved</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">{counts.resolved}</span>
                <span className="text-[11px] font-bold text-[#7C3AED] dark:text-purple-400">&uarr; +20%</span>
              </div>
            </div>
          </div>
          {renderSparkline('#7C3AED', 'sparkResolved', 'M2,32 Q25,25 46,24 T80,14 T108,6')}
        </div>
      </div>

      {/* ── 3. FILTER TABS, SEARCH & PERIOD SELECTOR ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: 'ALL', label: `All Disputes (${counts.all})` },
              { key: 'PENDING', label: `Pending (${counts.pending})` },
              { key: 'IN_REVIEW', label: `In Review (${counts.inReview})` },
              { key: 'RESOLVED', label: `Resolved (${counts.resolved})` },
              { key: 'ESCALATED', label: `Escalated (${counts.escalated})` },
            ] as { key: TabFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border',
                activeTab === tab.key
                  ? 'bg-[#16A34A] text-white border-[#16A34A] shadow-xs'
                  : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search disputes, tenants or properties..."
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>

          {/* Time Range Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setTimeDropdownOpen((prev) => !prev)}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>{timeRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {timeDropdownOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setTimeDropdownOpen(false)} />
                <div className="absolute right-0 mt-1.5 w-40 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg py-1 z-30 text-xs">
                  {(['Last 30 Days', 'Last 6 Months', 'Last 12 Months', 'All Time'] as TimeRange[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setTimeRange(opt);
                        setTimeDropdownOpen(false);
                      }}
                      className={clsx(
                        'w-full text-left px-3.5 py-2 font-semibold transition cursor-pointer',
                        timeRange === opt
                          ? 'text-[#16A34A] bg-emerald-50/70 dark:bg-emerald-950/40'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. SPLIT-PANE DISPUTES LIST & LIVE CASE PREVIEW ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 xl:col-span-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-28 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 animate-pulse"
              />
            ))}
          </div>
          <div className="lg:col-span-5 xl:col-span-4 h-[460px] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 animate-pulse" />
        </div>
      ) : filteredDisputes.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] flex items-center justify-center mx-auto mb-4">
            <Scale className="w-7 h-7" />
          </div>
          <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">No Disputes Match Your Filter</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Try switching status tabs, clearing your search query, or expanding the time range.
          </p>
          {(activeTab !== 'ALL' || search.trim() || timeRange !== 'All Time') && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('ALL');
                setSearch('');
                setTimeRange('All Time');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-[#16A34A] text-white text-xs font-bold hover:bg-[#15803D] transition cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT: DISPUTE CARDS LIST */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-3">
            {filteredDisputes.map((dispute) => {
              const isSelected = selectedDispute?.id === dispute.id;
              const statusPill = getStatusPillConfig(dispute.status, dispute.severity);
              const catPill = getCategoryPillConfig(dispute);
              const CatIcon = catPill.icon;
              const rawImg = dispute.property?.images?.[0];
              const thumbSrc = rawImg ? getImageUrl(rawImg) : getFallbackPropertyImage(dispute.id);
              const tenantName = dispute.tenant
                ? `${dispute.tenant.firstName || ''} ${dispute.tenant.lastName || ''}`.trim()
                : 'Assigned Tenant';
              const propTitle = dispute.property?.title || 'Residential Rental';

              return (
                <div
                  key={dispute.id}
                  onClick={() => setSelectedId(dispute.id)}
                  className={clsx(
                    'rounded-2xl p-3.5 sm:p-4 border transition cursor-pointer flex flex-col sm:flex-row sm:items-center gap-3.5 relative',
                    isSelected
                      ? 'bg-[#F2FBF5] dark:bg-emerald-950/25 border-[#9BE0B6] dark:border-emerald-800 shadow-xs'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-800/70'
                  )}
                >
                  {/* Thumbnail */}
                  <img
                    src={thumbSrc}
                    alt={propTitle}
                    className="w-full sm:w-28 h-32 sm:h-24 rounded-xl object-cover shrink-0 bg-zinc-100 dark:bg-zinc-800"
                  />

                  {/* Main Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold',
                        catPill.bg,
                        catPill.text
                      )}
                    >
                      <CatIcon className="w-3 h-3" />
                      {catPill.label}
                    </span>

                    <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white truncate">
                      {dispute.title}
                    </h3>

                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                      {propTitle} &bull; {tenantName}
                    </p>

                    <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-1">
                      {dispute.description || 'Review case docket and attached lease compliance evidence.'}
                    </p>
                  </div>

                  {/* Date & Relative Time */}
                  <div className="hidden md:flex flex-col gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0 min-w-[110px]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      {formatShortDate(dispute.createdAt)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      {formatRelativeDays(dispute.createdAt)}
                    </span>
                  </div>

                  {/* Status + Actions */}
                  <div
                    className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold',
                          statusPill.bg,
                          statusPill.text
                        )}
                      >
                        <span className={clsx('w-1.5 h-1.5 rounded-full', statusPill.dot)} />
                        {statusPill.label}
                      </span>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenuId((prev) => (prev === dispute.id ? null : dispute.id))}
                          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                          aria-label="Case options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === dispute.id && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 mt-1 w-44 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1 z-30 text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedId(dispute.id);
                                  setOpenMenuId(null);
                                }}
                                className="w-full text-left px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                              >
                                Preview Case
                              </button>
                              <button
                                type="button"
                                onClick={() => openTakeAction(dispute, 'VERIFIED')}
                                className="w-full text-left px-3 py-2 font-semibold text-[#16A34A] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                              >
                                Adjudicate / Take Action
                              </button>
                              <Link
                                href={`/admin/disputes/${dispute.id}`}
                                className="block px-3 py-2 font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              >
                                Open Full Docket
                              </Link>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/admin/disputes/${dispute.id}`}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-100 hover:border-emerald-400 hover:text-[#16A34A] transition inline-flex items-center gap-1"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: LIVE SELECTED CASE PREVIEW */}
          {selectedDispute && (
            <div className="lg:col-span-5 xl:col-span-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 overflow-hidden shadow-xs lg:sticky lg:top-20">
              {/* Top Cover Banner */}
              <div className="relative h-40 w-full bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={
                    selectedDispute.property?.images?.[0]
                      ? getImageUrl(selectedDispute.property.images[0])
                      : getFallbackPropertyImage(selectedDispute.id)
                  }
                  alt={selectedDispute.property?.title || 'Property'}
                  className="w-full h-full object-cover"
                />
                {(() => {
                  const catPill = getCategoryPillConfig(selectedDispute);
                  const CatIcon = catPill.icon;
                  return (
                    <span
                      className={clsx(
                        'absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm',
                        catPill.bg,
                        catPill.text
                      )}
                    >
                      <CatIcon className="w-3.5 h-3.5" />
                      {catPill.label}
                    </span>
                  );
                })()}
              </div>

              {/* Detail Body */}
              <div className="p-5 space-y-4">
                {/* Title + Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-lg font-extrabold text-zinc-900 dark:text-white leading-snug">
                      {selectedDispute.title}
                    </h2>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {formatCaseCode(selectedDispute)}
                    </p>
                  </div>

                  {(() => {
                    const statusPill = getStatusPillConfig(selectedDispute.status, selectedDispute.severity);
                    return (
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shrink-0',
                          statusPill.bg,
                          statusPill.text
                        )}
                      >
                        <span className={clsx('w-1.5 h-1.5 rounded-full', statusPill.dot)} />
                        {statusPill.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Property */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Property</p>
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        selectedDispute.property?.images?.[0]
                          ? getImageUrl(selectedDispute.property.images[0])
                          : getFallbackPropertyImage(selectedDispute.id)
                      }
                      alt={selectedDispute.property?.title || 'Property'}
                      className="w-12 h-10 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                        {selectedDispute.property?.title || 'Residential Rental'}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {selectedDispute.property?.location || 'Accra, Ghana'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tenant */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Tenant</p>
                  <div className="flex items-center gap-3">
                    {selectedDispute.tenant?.avatar ? (
                      <img
                        src={getImageUrl(selectedDispute.tenant.avatar)}
                        alt="Tenant"
                        className="w-11 h-11 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center font-extrabold text-sm shrink-0">
                        {selectedDispute.tenant?.firstName?.[0] || <UserIcon className="w-5 h-5" />}
                      </div>
                    )}
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                        {selectedDispute.tenant
                          ? `${selectedDispute.tenant.firstName || ''} ${selectedDispute.tenant.lastName || ''}`.trim()
                          : 'Unassigned Respondent'}
                      </p>
                      {selectedDispute.tenant?.email && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 shrink-0" />
                          {selectedDispute.tenant.email}
                        </p>
                      )}
                      {selectedDispute.tenant?.phoneNumber && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 shrink-0" />
                          {selectedDispute.tenant.phoneNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Issue Summary */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Issue Summary</p>
                  <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {selectedDispute.description ||
                      'Tenant breach allegation logged for compliance review. Open full docket to inspect uploaded photos and timeline.'}
                  </p>
                </div>

                {/* Submitted On */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Submitted On</p>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    {formatShortDate(selectedDispute.createdAt)} &bull; {formatRelativeDays(selectedDispute.createdAt)}
                  </p>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => openTakeAction(selectedDispute, 'VERIFIED')}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Take Action</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <Link
                    href={`/admin/disputes/${selectedDispute.id}`}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition text-center"
                  >
                    View Full Details
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 5. TAKE ACTION / ADJUDICATION MODAL ── */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center">
                  <Gavel className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">Adjudicate Dispute</h3>
                  <p className="text-[11px] text-zinc-500 truncate max-w-[260px]">{actionTarget.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActionTarget(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVerdictStatus('VERIFIED')}
                  className={clsx(
                    'py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer',
                    verdictStatus === 'VERIFIED'
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-[#16A34A] text-[#16A34A]'
                      : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                  )}
                >
                  Verify Breach
                </button>
                <button
                  type="button"
                  onClick={() => setVerdictStatus('REJECTED')}
                  className={clsx(
                    'py-2.5 px-3 rounded-xl text-xs font-bold border transition cursor-pointer',
                    verdictStatus === 'REJECTED'
                      ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-500 text-rose-600'
                      : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300'
                  )}
                >
                  Dismiss Case
                </button>
              </div>

              {verdictStatus === 'VERIFIED' && (
                <div className="space-y-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-3.5 border border-zinc-200/80 dark:border-zinc-700">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mb-1">
                      Reputation Penalty Deduction
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={5}
                      step={0.5}
                      value={penaltyPoints}
                      onChange={(e) => setPenaltyPoints(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-900 dark:text-white"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={suspendAccount}
                      onChange={(e) => setSuspendAccount(e.target.checked)}
                      className="rounded border-zinc-300 text-[#16A34A] focus:ring-emerald-500"
                    />
                    Suspend tenant account immediately
                  </label>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mb-1">
                  Resolution Notes
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Document your findings and enforcement rationale..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActionTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={resolveMutation.isPending}
                  onClick={() =>
                    resolveMutation.mutate({
                      id: actionTarget.id,
                      status: verdictStatus,
                      notes: adminNotes || (verdictStatus === 'VERIFIED' ? 'Breach verified by admin.' : 'Claim dismissed.'),
                      penaltyDeduction: verdictStatus === 'VERIFIED' ? penaltyPoints : 0,
                      suspend: verdictStatus === 'VERIFIED' ? suspendAccount : false,
                    })
                  }
                  className="flex-1 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {resolveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Verdict
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. NEW DISPUTE MODAL ── */}
      {newDisputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">Log New Dispute</h3>
              </div>
              <button
                type="button"
                onClick={() => setNewDisputeModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Disputes and lease breach reports are submitted by landlords or tenants from their tenancy ledger so evidence and lease references are automatically attached. You can inspect active properties or bookings directly to review linked leases.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Link
                href="/admin/bookings"
                className="flex-1 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold text-center transition"
              >
                Inspect Bookings
              </Link>
              <button
                type="button"
                onClick={() => setNewDisputeModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
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
