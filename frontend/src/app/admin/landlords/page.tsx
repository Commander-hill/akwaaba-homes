'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Plus,
  Phone,
  Home,
  Eye,
  Pencil,
  MoreHorizontal,
  Calendar,
  Zap,
  ShieldCheck,
  Download,
  FileText,
  BarChart2,
  ArrowRight,
  Ban,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import LandlordKpiCards, { LandlordKpiStats } from '@/components/admin/LandlordKpiCards';
import LandlordFormModal, { LandlordFormInitialData } from '@/components/admin/LandlordFormModal';
import { useStepUpAuth } from '@/hooks/useStepUpAuth';

const CATEGORY_LABELS: Record<string, string> = {
  INDIVIDUAL_OWNER: 'Individual Owner',
  REGISTERED_HOSTEL_COMPANY: 'Hostel Company',
  PROPERTY_MANAGER: 'Property Manager',
};

function getLandlordStatusMeta(row: any) {
  if (row.isSuspended) {
    return {
      label: 'Suspended',
      pill: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/50',
      dot: 'bg-rose-500',
    };
  }
  if (row.isVerifiedLandlord || row.landlordVerificationStatus === 'VERIFIED') {
    return {
      label: 'Verified',
      pill: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/50',
      dot: 'bg-emerald-500',
    };
  }
  if (row.landlordVerificationStatus === 'REJECTED') {
    return {
      label: 'Rejected',
      pill: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200/80 dark:border-red-800/50',
      dot: 'bg-red-500',
    };
  }
  if (
    row.landlordVerificationStatus === 'PENDING' ||
    row.landlordVerificationStatus === 'UNDER_REVIEW'
  ) {
    return {
      label: 'Pending',
      pill: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/50',
      dot: 'bg-purple-500',
    };
  }
  return {
    label: 'Unverified',
    pill: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
    dot: 'bg-zinc-400',
  };
}

function getPageNumbers(current: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) pages.push('ellipsis');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
}

export default function AdminLandlordsPage() {
  const queryClient = useQueryClient();
  const { requestStepUp, StepUpModal } = useStepUpAuth();

  // Filter & pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [joinedFilter, setJoinedFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  // Selection & row menu state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Add / Edit & confirm modals
  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    data: LandlordFormInitialData | null;
  }>({ isOpen: false, mode: 'create', data: null });

  const [confirmSuspend, setConfirmSuspend] = useState<{
    isOpen: boolean;
    landlord: any | null;
  }>({ isOpen: false, landlord: null });

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch all landlords so KPI cards, area/category facets, export & client pagination reflect live totals
  const { data, isLoading } = useQuery({
    queryKey: ['admin-landlords'],
    queryFn: async () => {
      const res = await api.get('/admin/users?role=LANDLORD');
      return res.data;
    },
  });

  const landlords: any[] = useMemo(() => {
    if (Array.isArray(data)) return data;
    return data?.users || [];
  }, [data]);

  // Derived KPI + Insights metrics computed from live landlord records
  const stats = useMemo(() => {
    const total = landlords.length;
    const verifiedList = landlords.filter(
      (l) => !l.isSuspended && (l.isVerifiedLandlord || l.landlordVerificationStatus === 'VERIFIED')
    );
    const pendingList = landlords.filter(
      (l) =>
        !l.isSuspended &&
        !l.isVerifiedLandlord &&
        (l.landlordVerificationStatus === 'PENDING' || l.landlordVerificationStatus === 'UNDER_REVIEW')
    );
    const suspendedList = landlords.filter((l) => Boolean(l.isSuspended));
    const activeCount = total - suspendedList.length;

    const nowMs = Date.now();
    const thirtyDaysAgo = nowMs - 30 * 24 * 60 * 60 * 1000;
    const recentCount = landlords.filter((l) => new Date(l.createdAt).getTime() >= thirtyDaysAgo).length;
    const recentVerifiedCount = verifiedList.filter(
      (l) => new Date(l.createdAt).getTime() >= thirtyDaysAgo
    ).length;

    const totalTrendPct = total > 0 ? Math.round((recentCount / total) * 100) : 0;
    const verifiedTrendPct = verifiedList.length > 0 ? Math.round((recentVerifiedCount / verifiedList.length) * 100) : 0;
    const pendingSharePct = total > 0 ? Math.round((pendingList.length / total) * 100) : 0;
    const suspendedSharePct = total > 0 ? Math.round((suspendedList.length / total) * 100) : 0;
    const verificationRate = total > 0 ? Math.round((verifiedList.length / total) * 100) : 0;

    return {
      kpi: {
        total,
        verified: verifiedList.length,
        pending: pendingList.length,
        suspended: suspendedList.length,
        totalTrendPct,
        verifiedTrendPct,
        pendingSharePct,
        suspendedSharePct,
      } satisfies LandlordKpiStats,
      active: activeCount,
      verificationRate,
      verifiedTrendPct,
    };
  }, [landlords]);

  // Unique region areas present in data
  const areaOptions = useMemo(() => {
    const set = new Set<string>();
    landlords.forEach((l) => {
      if (l.primaryRegion && String(l.primaryRegion).trim()) {
        set.add(String(l.primaryRegion).trim());
      }
    });
    return Array.from(set).sort();
  }, [landlords]);

  // Filtered rows
  const filteredLandlords = useMemo(() => {
    const now = Date.now();
    return landlords.filter((l) => {
      if (statusFilter === 'VERIFIED') {
        if (l.isSuspended || (!l.isVerifiedLandlord && l.landlordVerificationStatus !== 'VERIFIED')) {
          return false;
        }
      } else if (statusFilter === 'PENDING') {
        if (
          l.isSuspended ||
          l.isVerifiedLandlord ||
          !['PENDING', 'UNDER_REVIEW'].includes(l.landlordVerificationStatus)
        ) {
          return false;
        }
      } else if (statusFilter === 'NOT_SUBMITTED') {
        if (l.isSuspended || l.isVerifiedLandlord || l.landlordVerificationStatus !== 'NOT_SUBMITTED') {
          return false;
        }
      } else if (statusFilter === 'SUSPENDED' && !l.isSuspended) {
        return false;
      }

      if (areaFilter !== 'ALL' && (l.primaryRegion || '').trim() !== areaFilter) {
        return false;
      }

      if (categoryFilter !== 'ALL' && (l.hostEntityType || 'INDIVIDUAL_OWNER') !== categoryFilter) {
        return false;
      }

      if (joinedFilter !== 'ALL') {
        const createdMs = new Date(l.createdAt).getTime();
        const dayMs = 24 * 60 * 60 * 1000;
        if (joinedFilter === '7D' && createdMs < now - 7 * dayMs) return false;
        if (joinedFilter === '30D' && createdMs < now - 30 * dayMs) return false;
        if (joinedFilter === '90D' && createdMs < now - 90 * dayMs) return false;
        if (joinedFilter === 'YEAR' && new Date(l.createdAt).getFullYear() !== new Date().getFullYear()) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const fullName = `${l.firstName || ''} ${l.lastName || ''}`.toLowerCase();
        const email = (l.email || '').toLowerCase();
        const phone = (l.phoneNumber || '').toLowerCase();
        const company = (l.businessName || '').toLowerCase();
        if (!fullName.includes(q) && !email.includes(q) && !phone.includes(q) && !company.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [landlords, statusFilter, areaFilter, categoryFilter, joinedFilter, searchQuery]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredLandlords.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedLandlords = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredLandlords.slice(start, start + pageSize);
  }, [filteredLandlords, safePage]);

  const startIndex = filteredLandlords.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, filteredLandlords.length);
  const pageNumbers = useMemo(() => getPageNumbers(safePage, totalPages), [safePage, totalPages]);

  const suspendMutation = useMutation({
    mutationFn: async ({ id, isSuspended }: { id: string; isSuspended: boolean }) => {
      const res = await api.put(`/admin/users/${id}/suspend`, { isSuspended });
      return res.data;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.isSuspended ? 'Landlord account suspended.' : 'Landlord account restored.'
      );
      queryClient.invalidateQueries({ queryKey: ['admin-landlords'] });
      setConfirmSuspend({ isOpen: false, landlord: null });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update suspension status.');
    },
  });

  const handleVerifyLandlord = (landlord: any) => {
    setActiveMenuId(null);
    const fullName = `${landlord.firstName || ''} ${landlord.lastName || ''}`.trim();
    requestStepUp({
      title: 'Verify Landlord KYC',
      description: `Confirm official Verified Landlord status for ${fullName} (${landlord.email}).`,
      actionType: 'DEED_VERIFICATION',
      payloadSummary: [
        { label: 'Landlord', value: fullName },
        { label: 'Email', value: landlord.email || '—' },
      ],
      onSuccess: async (stepUpToken: string) => {
        try {
          await api.put(
            `/admin/verify-landlord/${landlord.id}`,
            { status: 'VERIFIED' },
            { headers: { 'X-Admin-Step-Up': stepUpToken } }
          );
          toast.success(`${fullName} is now Verified.`);
          queryClient.invalidateQueries({ queryKey: ['admin-landlords'] });
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to verify landlord.');
        }
      },
    });
  };

  const handleExportCsv = (subset?: any[]) => {
    const rowsSource = subset && subset.length > 0
      ? subset
      : filteredLandlords.length > 0
      ? filteredLandlords
      : landlords;

    if (!rowsSource.length) {
      toast.error('No landlord records available to export.');
      return;
    }

    const headers = [
      'ID',
      'Name',
      'Email',
      'Phone',
      'Company / Business',
      'Category',
      'Area / Region',
      'Properties Count',
      'Status',
      'Join Date',
    ];

    const csvRows = rowsSource.map((l) => {
      const meta = getLandlordStatusMeta(l);
      return [
        `"${l.id}"`,
        `"${`${l.firstName || ''} ${l.lastName || ''}`.trim().replace(/"/g, '""')}"`,
        `"${(l.email || '').replace(/"/g, '""')}"`,
        `"${(l.phoneNumber || 'N/A').replace(/"/g, '""')}"`,
        `"${(l.businessName || 'Individual').replace(/"/g, '""')}"`,
        `"${CATEGORY_LABELS[l.hostEntityType] || 'Individual Owner'}"`,
        `"${(l.primaryRegion || 'Unassigned').replace(/"/g, '""')}"`,
        l._count?.properties ?? 0,
        `"${meta.label}"`,
        `"${new Date(l.createdAt).toISOString().split('T')[0]}"`,
      ].join(',');
    });

    const blob = new Blob([[headers.join(','), ...csvRows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `AkwaabaHomes_Landlords_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rowsSource.length} landlord record(s) to CSV`);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setAreaFilter('ALL');
    setCategoryFilter('ALL');
    setJoinedFilter('ALL');
    setPage(1);
  };

  // Ring geometry for Insights Verification Rate widget
  const ringRadius = 28;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset =
    ringCircumference - (Math.min(100, Math.max(0, stats.verificationRate)) / 100) * ringCircumference;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#eef8f2] via-[#e5f5eb] to-[#eaf7ee] dark:from-[#062919] dark:via-[#052014] dark:to-[#041a10] border border-[#d6f0de] dark:border-emerald-900/40 shadow-xs min-h-[152px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 sm:px-8 sm:py-7">
        {/* Right background architectural illustration */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 bottom-0 w-full sm:w-[66%] lg:w-[62%] pointer-events-none opacity-85 dark:opacity-35"
        >
          <Image
            src="/images/admin/landlords-hero-building.webp"
            alt=""
            fill
            unoptimized
            priority
            fetchPriority="high"
            decoding="async"
            sizes="(max-width: 640px) 100vw, 62vw"
            className="object-cover sm:object-contain object-right"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#eef8f2] via-[#eef8f2]/85 to-transparent dark:from-[#062919] dark:via-[#062919]/85 sm:w-1/2" />
        </div>

        {/* Left hero text */}
        <div className="relative z-10 max-w-md lg:max-w-lg">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/90 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-300 text-xs font-semibold mb-3 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
            <Users className="w-3.5 h-3.5 text-[#04793d] dark:text-emerald-400" />
            <span>Landlords Management</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Landlords
          </h1>
          <p className="text-zinc-700 dark:text-zinc-300 text-xs sm:text-sm mt-1.5 leading-relaxed font-normal">
            Manage registered property hosts, verify their credentials, and monitor their activity.
          </p>
        </div>

        {/* Right frosted Total Landlords pill card */}
        <div className="relative z-10 self-start sm:self-center">
          <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs rounded-2xl px-4 py-3 border border-emerald-200/70 dark:border-emerald-800/60 shadow-sm flex items-center gap-3.5 min-w-[175px]">
            <div className="w-11 h-11 rounded-full bg-[#EAF7EE] dark:bg-emerald-950/70 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5 text-[#04793d] dark:text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-black text-zinc-900 dark:text-white leading-none tracking-tight">
                {stats.kpi.total}
              </div>
              <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-1">
                Total Landlords
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FOUR KPI SUMMARY CARDS */}
      <LandlordKpiCards
        stats={stats.kpi}
        activeStatus={statusFilter}
        onSelectStatus={(nextStatus) => {
          setStatusFilter(nextStatus);
          setPage(1);
        }}
      />

      {/* 3. FILTER & PRIMARY ACTION BAR */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-wrap items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[230px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            aria-label="Search landlords"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search landlords by name, email, phone, or company..."
            className="w-full pl-10 pr-8 py-2 text-xs rounded-xl bg-zinc-50/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setSearchQuery('');
                setPage(1);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* All Status */}
        <div className="relative">
          <select
            aria-label="Filter by Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-xl pl-3.5 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="VERIFIED">Verified</option>
            <option value="PENDING">Pending</option>
            <option value="NOT_SUBMITTED">Unverified</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* All Areas */}
        <div className="relative">
          <select
            aria-label="Filter by Area"
            value={areaFilter}
            onChange={(e) => {
              setAreaFilter(e.target.value);
              setPage(1);
            }}
            className="appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-xl pl-3.5 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="ALL">All Areas</option>
            {areaOptions.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* All Categories */}
        <div className="relative">
          <select
            aria-label="Filter by Category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-xl pl-3.5 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Joined Date */}
        <div className="relative">
          <Calendar className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            aria-label="Filter by Joined Date"
            value={joinedFilter}
            onChange={(e) => {
              setJoinedFilter(e.target.value);
              setPage(1);
            }}
            className="appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-xl pl-8 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option value="ALL">Joined Date</option>
            <option value="7D">Last 7 Days</option>
            <option value="30D">Last 30 Days</option>
            <option value="90D">Last 90 Days</option>
            <option value="YEAR">This Year</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset */}
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-xs font-bold transition cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
          <span>Reset</span>
        </button>

        {/* + Add Landlord */}
        <button
          type="button"
          onClick={() => setFormModal({ isOpen: true, mode: 'create', data: null })}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#04793d] hover:bg-[#036432] text-white text-xs font-bold shadow-xs hover:shadow-md transition cursor-pointer ml-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Landlord</span>
        </button>
      </div>

      {/* Bulk selection bar (visible only when rows are selected) */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
          <span className="font-bold text-emerald-900 dark:text-emerald-200">
            {selectedIds.length} landlord{selectedIds.length === 1 ? '' : 's'} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const subset = landlords.filter((l) => selectedIds.includes(l.id));
                handleExportCsv(subset);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#04793d] hover:bg-[#036432] text-white font-bold cursor-pointer"
            >
              Export Selected
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-semibold hover:bg-white/60 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN 2-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_258px] gap-4 items-start">
        {/* LEFT COLUMN: DATA TABLE & PAGINATION */}
        <div className="min-w-0">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
                    <th scope="col" className="py-3.5 pl-2.5 pr-1 w-8 text-center">
                      <input
                        type="checkbox"
                        aria-label="Select all landlords on page"
                        checked={
                          paginatedLandlords.length > 0 &&
                          paginatedLandlords.every((l) => selectedIds.includes(l.id))
                        }
                        onChange={() => {
                          const pageIds = paginatedLandlords.map((l) => l.id);
                          const allSelected = pageIds.every((id) => selectedIds.includes(id));
                          setSelectedIds((prev) =>
                            allSelected
                              ? prev.filter((id) => !pageIds.includes(id))
                              : Array.from(new Set([...prev, ...pageIds]))
                          );
                        }}
                        className="w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th scope="col" className="py-3.5 px-2 min-w-[148px]">
                      Landlord
                    </th>
                    <th scope="col" className="py-3.5 px-2 whitespace-nowrap">
                      Contact Details
                    </th>
                    <th scope="col" className="py-3.5 px-1.5 text-center whitespace-nowrap">
                      Properties
                    </th>
                    <th scope="col" className="py-3.5 px-2 whitespace-nowrap">
                      Status
                    </th>
                    <th scope="col" className="py-3.5 px-2 whitespace-nowrap">
                      Join Date
                    </th>
                    <th scope="col" className="py-3.5 pl-1.5 pr-3 text-right whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-zinc-500 dark:text-zinc-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#04793d]" />
                        <span className="font-medium">Loading registered landlords...</span>
                      </td>
                    </tr>
                  ) : paginatedLandlords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-zinc-500 dark:text-zinc-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                        <p className="font-bold text-zinc-700 dark:text-zinc-200">
                          No landlords match the current filters
                        </p>
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-2 text-xs font-bold text-[#04793d] dark:text-emerald-400 hover:underline cursor-pointer"
                        >
                          Reset all filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    paginatedLandlords.map((row) => {
                      const statusMeta = getLandlordStatusMeta(row);
                      const initials = `${row.firstName?.[0] || ''}${row.lastName?.[0] || ''}`.toUpperCase() || 'L';
                      const fullName = `${row.firstName || ''} ${row.lastName || ''}`.trim();
                      const propCount = row._count?.properties ?? 0;
                      const isSelected = selectedIds.includes(row.id);

                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="py-3.5 pl-2.5 pr-1 text-center">
                            <input
                              type="checkbox"
                              aria-label={`Select ${fullName}`}
                              checked={isSelected}
                              onChange={() =>
                                setSelectedIds((prev) =>
                                  isSelected ? prev.filter((id) => id !== row.id) : [...prev, row.id]
                                )
                              }
                              className="w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>

                          {/* Landlord Avatar + Name + Email */}
                          <td className="py-3.5 px-2">
                            <div className="flex items-center gap-2">
                              {row.avatarUrl ? (
                                <img
                                  src={getImageUrl(row.avatarUrl)}
                                  alt={fullName}
                                  className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#04793d] text-white font-bold text-[11px] flex items-center justify-center shrink-0">
                                  {initials}
                                </div>
                              )}
                              <div className="min-w-0 max-w-[138px]">
                                <Link
                                  href={`/admin/landlords/${row.id}`}
                                  className="font-bold text-zinc-900 dark:text-white hover:text-[#04793d] dark:hover:text-emerald-400 transition block truncate"
                                >
                                  {fullName}
                                </Link>
                                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                  {row.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Contact Details */}
                          <td className="py-3.5 px-2 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium">
                              <Phone className="w-3.5 h-3.5 text-[#04793d] dark:text-emerald-400 shrink-0" />
                              <span>{row.phoneNumber || 'Not recorded'}</span>
                            </div>
                          </td>

                          {/* Properties Count */}
                          <td className="py-3.5 px-1.5 text-center whitespace-nowrap">
                            <div className="inline-flex items-center justify-center gap-1 font-bold text-zinc-800 dark:text-zinc-200">
                              <Home className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
                              <span>{propCount}</span>
                            </div>
                          </td>

                          {/* Status Pill */}
                          <td className="py-3.5 px-2 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${statusMeta.pill}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                              <span>{statusMeta.label}</span>
                            </span>
                          </td>

                          {/* Join Date */}
                          <td className="py-3.5 px-2 whitespace-nowrap text-zinc-600 dark:text-zinc-400 font-medium">
                            {new Date(row.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 pl-1.5 pr-3 whitespace-nowrap text-right">
                            <div
                              className="inline-flex items-center justify-end gap-1 relative"
                              ref={activeMenuId === row.id ? menuRef : undefined}
                            >
                              <Link
                                href={`/admin/landlords/${row.id}`}
                                aria-label={`View profile for ${fullName}`}
                                title="View Landlord Profile"
                                className="w-7 h-7 rounded-full border border-zinc-200/80 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/60 text-zinc-600 dark:text-zinc-300 hover:text-[#04793d] flex items-center justify-center transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>

                              <button
                                type="button"
                                aria-label={`Edit details for ${fullName}`}
                                title="Edit Landlord Details"
                                onClick={() =>
                                  setFormModal({
                                    isOpen: true,
                                    mode: 'edit',
                                    data: {
                                      id: row.id,
                                      firstName: row.firstName,
                                      lastName: row.lastName,
                                      email: row.email,
                                      phoneNumber: row.phoneNumber,
                                      businessName: row.businessName,
                                      primaryRegion: row.primaryRegion,
                                      hostEntityType: row.hostEntityType,
                                    },
                                  })
                                }
                                className="w-7 h-7 rounded-full border border-zinc-200/80 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/60 text-zinc-600 dark:text-zinc-300 hover:text-[#04793d] flex items-center justify-center transition cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                aria-label={`More actions for ${fullName}`}
                                aria-expanded={activeMenuId === row.id}
                                onClick={() =>
                                  setActiveMenuId((prev) => (prev === row.id ? null : row.id))
                                }
                                className="w-7 h-7 rounded-full border border-zinc-200/80 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>

                              {activeMenuId === row.id && (
                                <div className="absolute right-0 top-9 z-30 w-48 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl py-1.5 text-left">
                                  <Link
                                    href={`/admin/landlords/${row.id}`}
                                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>View Full Profile</span>
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setFormModal({
                                        isOpen: true,
                                        mode: 'edit',
                                        data: {
                                          id: row.id,
                                          firstName: row.firstName,
                                          lastName: row.lastName,
                                          email: row.email,
                                          phoneNumber: row.phoneNumber,
                                          businessName: row.businessName,
                                          primaryRegion: row.primaryRegion,
                                          hostEntityType: row.hostEntityType,
                                        },
                                      });
                                    }}
                                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>Edit Details</span>
                                  </button>

                                  {!row.isVerifiedLandlord && !row.isSuspended && (
                                    <button
                                      type="button"
                                      onClick={() => handleVerifyLandlord(row)}
                                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#04793d] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Verify Landlord KYC</span>
                                    </button>
                                  )}

                                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setConfirmSuspend({ isOpen: true, landlord: row });
                                    }}
                                    className={`w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold cursor-pointer ${
                                      row.isSuspended
                                        ? 'text-[#04793d] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50'
                                        : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                    }`}
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                    <span>{row.isSuspended ? 'Restore Account' : 'Suspend Account'}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer + Numbered Pagination */}
            <div className="px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="text-zinc-600 dark:text-zinc-400 font-medium">
                Showing {startIndex}–{endIndex} of {filteredLandlords.length} landlord
                {filteredLandlords.length === 1 ? '' : 's'}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {pageNumbers.map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="px-1 text-zinc-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                        safePage === item
                          ? 'bg-[#04793d] text-white shadow-xs'
                          : 'border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  aria-label="Next page"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: QUICK ACTIONS, INSIGHTS, COMPLIANCE CARD */}
        <div className="space-y-5">
          {/* Card 1: Quick Actions */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
              <h2 className="font-extrabold text-zinc-900 dark:text-white text-sm">Quick Actions</h2>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('PENDING');
                  setPage(1);
                  toast.success(`Showing ${stats.kpi.pending} pending KYC review request(s)`);
                }}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-[#EAF7EE]/85 hover:bg-[#dcf3e3] dark:bg-emerald-950/45 dark:hover:bg-emerald-900/50 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                      Verify Pending KYC
                    </div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      ({stats.kpi.pending} request{stats.kpi.pending === 1 ? '' : 's'})
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleExportCsv()}
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-[#EAF7EE]/85 hover:bg-[#dcf3e3] dark:bg-emerald-950/45 dark:hover:bg-emerald-900/50 transition text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
                  </div>
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                    Export Landlords
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>

              <Link
                href="/admin/audit"
                className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-[#EAF7EE]/85 hover:bg-[#dcf3e3] dark:bg-emerald-950/45 dark:hover:bg-emerald-900/50 transition text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
                  </div>
                  <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                    View Audit Logs
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </Link>
            </div>
          </div>

          {/* Card 2: Insights */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
              <h2 className="font-extrabold text-zinc-900 dark:text-white text-sm">Insights</h2>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Verification Rate
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
                    {stats.verificationRate}%
                  </span>
                  <span className="text-xs font-bold text-[#04793d] dark:text-emerald-400">
                    ↑ {stats.verifiedTrendPct}%
                  </span>
                </div>
              </div>

              <svg
                aria-label={`Verification rate ${stats.verificationRate}%`}
                viewBox="0 0 72 72"
                className="w-16 h-16 -rotate-90 shrink-0"
              >
                <circle
                  cx="36"
                  cy="36"
                  r={ringRadius}
                  strokeWidth="8"
                  className="stroke-zinc-100 dark:stroke-zinc-800 fill-none"
                />
                <circle
                  cx="36"
                  cy="36"
                  r={ringRadius}
                  strokeWidth="8"
                  stroke="#04793d"
                  fill="none"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringDashOffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#EAF7EE] dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Active Landlords
                </div>
                <div className="text-sm font-black text-zinc-900 dark:text-white">
                  {stats.active} / {stats.kpi.total}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Compliance Callout Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B512C] to-[#06381D] p-5 text-white shadow-sm min-h-[150px] flex items-center justify-between gap-3">
            <div className="relative z-10 space-y-2 max-w-[185px]">
              <h3 className="font-extrabold text-sm leading-snug text-white">
                Keep our landlord data up to date.
              </h3>
              <p className="text-[11px] text-emerald-100/90 leading-relaxed">
                Review and verify landlord information regularly.
              </p>
              <div className="pt-1">
                <Link
                  href="/admin/deeds"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#B7F4C8] hover:bg-white text-emerald-950 font-bold text-xs transition shadow-xs"
                >
                  <span>Go to Compliance</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div
              aria-hidden="true"
              className="relative z-10 w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-400/25 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-[#86EFAC]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Landlord Modal */}
      <LandlordFormModal
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        initialData={formModal.data}
        onClose={() => setFormModal((prev) => ({ ...prev, isOpen: false }))}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-landlords'] })}
      />

      {/* Suspend / Restore Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={confirmSuspend.isOpen}
        title={confirmSuspend.landlord?.isSuspended ? 'Restore Landlord Account' : 'Suspend Landlord Account'}
        description={
          confirmSuspend.landlord
            ? confirmSuspend.landlord.isSuspended
              ? `Restore platform access for ${confirmSuspend.landlord.firstName} ${confirmSuspend.landlord.lastName}?`
              : `Suspend ${confirmSuspend.landlord.firstName} ${confirmSuspend.landlord.lastName} from accepting bookings or managing listings?`
            : ''
        }
        confirmLabel={confirmSuspend.landlord?.isSuspended ? 'Restore Account' : 'Suspend Account'}
        confirmVariant={confirmSuspend.landlord?.isSuspended ? 'warning' : 'danger'}
        requireReason={false}
        onConfirm={async () => {
          if (confirmSuspend.landlord) {
            await suspendMutation.mutateAsync({
              id: confirmSuspend.landlord.id,
              isSuspended: !confirmSuspend.landlord.isSuspended,
            });
          }
        }}
        onClose={() => setConfirmSuspend({ isOpen: false, landlord: null })}
      />

      <StepUpModal />
    </div>
  );
}
