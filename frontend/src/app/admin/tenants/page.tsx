'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  Plus,
  Download,
  ChevronDown,
  Phone,
  Eye,
  Pencil,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Zap,
  BarChart3,
  ShieldCheck,
  FileText,
  Headphones,
  Building2,
  Ban,
  RotateCcw,
  Calendar,
  X,
} from 'lucide-react';
import api from '@/lib/axios';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import TenantKpiCards from '@/components/admin/TenantKpiCards';
import TenantFormModal, { TenantFormInitialData } from '@/components/admin/TenantFormModal';

interface LatestBookingSummary {
  id: string;
  status: string;
  startDate?: string;
  endDate?: string;
  property?: {
    id: string;
    title: string;
    location?: string;
    thumbnailUrl?: string | null;
  } | null;
}

interface TenantRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  campus?: string | null;
  studentId?: string | null;
  programmeOfStudy?: string | null;
  studentType?: string | null;
  isSuspended: boolean;
  ghanaCardStatus?: string | null;
  latestBooking?: LatestBookingSummary | null;
  createdAt: string;
}

type TenantStatusTab = 'ALL' | 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'EXITED';
type JoinDateFilter = 'ALL' | '7D' | '30D' | '90D' | 'THIS_YEAR';

const PAGE_SIZE = 5;

const getTenantStatus = (t: TenantRecord): Exclude<TenantStatusTab, 'ALL'> => {
  if (t.isSuspended) return 'SUSPENDED';

  const latest = t.latestBooking;
  if (latest) {
    const endedByStatus = ['COMPLETED', 'CHECKED_OUT', 'CANCELLED', 'EXPIRED'].includes(
      String(latest.status || '').toUpperCase()
    );
    const endedByDate = latest.endDate ? new Date(latest.endDate).getTime() < Date.now() : false;
    if (endedByStatus || endedByDate) {
      return 'EXITED';
    }
  }

  if (t.ghanaCardStatus === 'VERIFIED') return 'ACTIVE';
  return 'PENDING';
};

const formatJoinDate = (iso?: string): string => {
  if (!iso) return 'N/A';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getInitials = (firstName?: string, lastName?: string): string => {
  const f = (firstName || '').trim().charAt(0);
  const l = (lastName || '').trim().charAt(0);
  return (f + l).toUpperCase() || 'T';
};

const STATUS_BADGE_MAP: Record<
  Exclude<TenantStatusTab, 'ALL'>,
  { label: string; dot: string; badge: string }
> = {
  ACTIVE: {
    label: 'Active',
    dot: 'bg-emerald-500',
    badge: 'bg-[#EAF7EE] text-[#04793d] dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  PENDING: {
    label: 'Pending',
    dot: 'bg-blue-500',
    badge: 'bg-[#E8F2FF] text-[#1D4ED8] dark:bg-blue-950/60 dark:text-blue-300',
  },
  SUSPENDED: {
    label: 'Suspended',
    dot: 'bg-rose-500',
    badge: 'bg-[#FEECEC] text-[#B91C1C] dark:bg-rose-950/60 dark:text-rose-300',
  },
  EXITED: {
    label: 'Exited',
    dot: 'bg-zinc-400',
    badge: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  },
};

export default function AdminTenantsPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TenantStatusTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('ALL');
  const [joinDateFilter, setJoinDateFilter] = useState<JoinDateFilter>('ALL');
  const [sortBy, setSortBy] = useState<'joinDate' | 'property'>('joinDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const exportRef = useRef<HTMLDivElement | null>(null);

  const [formModal, setFormModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    initialData: TenantFormInitialData | null;
  }>({ isOpen: false, mode: 'create', initialData: null });

  const [suspendTarget, setSuspendTarget] = useState<TenantRecord | null>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
      if (!(e.target as HTMLElement)?.closest('[data-tenant-row-menu]')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-tenants-directory'],
    queryFn: async () => {
      const res = await api.get('/admin/users?role=TENANT');
      return Array.isArray(res.data) ? res.data : res.data?.users || [];
    },
  });

  const tenants: TenantRecord[] = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const counts = useMemo(() => {
    let active = 0;
    let pending = 0;
    let suspended = 0;
    let exited = 0;
    let recentCount = 0;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    tenants.forEach((t) => {
      const st = getTenantStatus(t);
      if (st === 'ACTIVE') active += 1;
      else if (st === 'PENDING') pending += 1;
      else if (st === 'SUSPENDED') suspended += 1;
      else exited += 1;

      if (t.createdAt && new Date(t.createdAt).getTime() >= thirtyDaysAgo) {
        recentCount += 1;
      }
    });

    const total = tenants.length;
    const retentionRate =
      total > 0 ? Math.max(0, Math.min(100, Math.round(((total - exited) / total) * 100))) : 94;
    const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;

    return {
      all: total,
      active,
      pending,
      suspended,
      exited,
      retentionRate,
      activeRate,
      kpiStats: {
        total,
        active,
        pending,
        suspended,
        totalTrendPct: total > 0 ? Math.max(4, Math.round((recentCount / total) * 100)) : 12,
        activeTrendPct: activeRate || 10,
        pendingSharePct: total > 0 ? Math.round((pending / total) * 100) : 0,
        suspendedSharePct: total > 0 ? Math.round((suspended / total) * 100) : 0,
      },
    };
  }, [tenants]);

  const propertyOptions = useMemo(() => {
    const names = new Set<string>();
    tenants.forEach((t) => {
      const title = t.latestBooking?.property?.title;
      if (title) names.add(title);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    const now = Date.now();
    const list = tenants.filter((t) => {
      const st = getTenantStatus(t);
      if (activeTab !== 'ALL' && st !== activeTab) return false;

      if (propertyFilter === 'UNASSIGNED' && t.latestBooking?.property?.title) return false;
      if (
        propertyFilter !== 'ALL' &&
        propertyFilter !== 'UNASSIGNED' &&
        t.latestBooking?.property?.title !== propertyFilter
      ) {
        return false;
      }

      if (joinDateFilter !== 'ALL' && t.createdAt) {
        const createdMs = new Date(t.createdAt).getTime();
        if (joinDateFilter === '7D' && now - createdMs > 7 * 86400000) return false;
        if (joinDateFilter === '30D' && now - createdMs > 30 * 86400000) return false;
        if (joinDateFilter === '90D' && now - createdMs > 90 * 86400000) return false;
        if (joinDateFilter === 'THIS_YEAR') {
          const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
          if (createdMs < yearStart) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const fullName = `${t.firstName || ''} ${t.lastName || ''}`.toLowerCase();
        const email = (t.email || '').toLowerCase();
        const phone = (t.phoneNumber || '').toLowerCase();
        const studentId = (t.studentId || '').toLowerCase();
        const propTitle = (t.latestBooking?.property?.title || '').toLowerCase();
        return (
          fullName.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          studentId.includes(q) ||
          propTitle.includes(q)
        );
      }

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'property') {
        const pa = (a.latestBooking?.property?.title || 'zzz').toLowerCase();
        const pb = (b.latestBooking?.property?.title || 'zzz').toLowerCase();
        return sortDir === 'asc' ? pa.localeCompare(pb) : pb.localeCompare(pa);
      }
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortDir === 'asc' ? da - db : db - da;
    });

    return list;
  }, [tenants, activeTab, propertyFilter, joinDateFilter, searchQuery, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedTenants = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredTenants.slice(start, start + PAGE_SIZE);
  }, [filteredTenants, safePage]);

  const verifyKycMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const res = await api.put(`/admin/verify-user/${tenantId}`, { status: 'VERIFIED' });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Tenant KYC verified successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-tenants-directory'] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to verify tenant KYC');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({
      id,
      isSuspended,
      reason,
    }: {
      id: string;
      isSuspended: boolean;
      reason: string;
    }) => {
      const res = await api.put(`/admin/users/${id}/suspend`, { isSuspended, reason });
      return res.data;
    },
    onSuccess: (res) => {
      toast.success(res?.message || 'Tenant account status updated');
      setSuspendTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-tenants-directory'] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Could not update tenant suspension status');
    },
  });

  const handleToggleSort = (field: 'joinDate' | 'property') => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir(field === 'property' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const handleSelectAllPage = (checked: boolean) => {
    if (checked) {
      const pageIds = paginatedTenants.map((t) => t.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageSet = new Set(paginatedTenants.map((t) => t.id));
      setSelectedIds((prev) => prev.filter((id) => !pageSet.has(id)));
    }
  };

  const handleExportData = (format: 'csv' | 'json') => {
    setExportOpen(false);
    const sourceRows =
      selectedIds.length > 0
        ? filteredTenants.filter((t) => selectedIds.includes(t.id))
        : filteredTenants;

    if (sourceRows.length === 0) {
      toast.error('No tenant records to export');
      return;
    }

    const mapped = sourceRows.map((t) => ({
      name: `${t.firstName} ${t.lastName}`.trim(),
      email: t.email,
      phone: t.phoneNumber || '',
      property: t.latestBooking?.property?.title || 'Not assigned',
      campus: t.campus || '',
      studentId: t.studentId || '',
      status: STATUS_BADGE_MAP[getTenantStatus(t)].label,
      joinDate: formatJoinDate(t.createdAt),
    }));

    let blob: Blob;
    if (format === 'json') {
      blob = new Blob([JSON.stringify(mapped, null, 2)], { type: 'application/json' });
    } else {
      const header = ['Name', 'Email', 'Phone', 'Property', 'Campus', 'Student ID', 'Status', 'Join Date'];
      const rows = mapped.map((r) => [
        r.name,
        r.email,
        r.phone,
        r.property,
        r.campus,
        r.studentId,
        r.status,
        r.joinDate,
      ]);
      const csvContent = [header, ...rows]
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `akwaaba-tenants-${new Date().toISOString().slice(0, 10)}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${sourceRows.length} tenant(s) as ${format.toUpperCase()}`);
  };

  const hasActiveFilters =
    activeTab !== 'ALL' ||
    propertyFilter !== 'ALL' ||
    joinDateFilter !== 'ALL' ||
    searchQuery.trim() !== '';

  const resetAllFilters = () => {
    setActiveTab('ALL');
    setSearchQuery('');
    setPropertyFilter('ALL');
    setJoinDateFilter('ALL');
    setPage(1);
  };

  const paginationItems = useMemo(() => {
    const items: (number | 'ellipsis')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i += 1) items.push(i);
    } else {
      items.push(1);
      if (safePage > 3) items.push('ellipsis');
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i += 1) items.push(i);
      if (safePage < totalPages - 2) items.push('ellipsis');
      items.push(totalPages);
    }
    return items;
  }, [safePage, totalPages]);

  const allPageSelected =
    paginatedTenants.length > 0 && paginatedTenants.every((t) => selectedIds.includes(t.id));

  const ringRadius = 30;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - counts.retentionRate / 100);

  const showingStart = filteredTenants.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(safePage * PAGE_SIZE, filteredTenants.length);

  const tabs: { key: TenantStatusTab; label: string; count: number }[] = [
    { key: 'ALL', label: 'All Tenants', count: counts.all },
    { key: 'ACTIVE', label: 'Active', count: counts.active },
    { key: 'PENDING', label: 'Pending', count: counts.pending },
    { key: 'SUSPENDED', label: 'Suspended', count: counts.suspended },
    { key: 'EXITED', label: 'Exited', count: counts.exited },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-[22px] border border-zinc-200/80 dark:border-zinc-800 bg-gradient-to-r from-[#ebf7f0] via-[#f4fbf7] to-white dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 min-h-[144px] flex items-center">
        <div
          className="absolute right-0 top-0 bottom-0 w-full sm:w-[64%] lg:w-[58%] pointer-events-none select-none overflow-hidden"
          aria-hidden="true"
        >
          <img
            src="/images/admin/landlords-hero-building.webp"
            alt=""
            width={604}
            height={142}
            fetchPriority="high"
            className="w-full h-full object-cover object-right opacity-90 dark:opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#ebf7f0] via-[#f4fbf7]/80 to-transparent dark:from-zinc-900 dark:via-zinc-900/85 dark:to-transparent" />
        </div>

        <div className="relative z-10 px-6 py-5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800/70 text-[#04793d] dark:text-emerald-300 text-[11px] font-bold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Tenants Management</span>
          </div>
          <h1 className="text-2xl sm:text-[28px] font-black text-zinc-900 dark:text-white tracking-tight leading-tight">
            Tenants &amp; Residents
          </h1>
          <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-300 mt-1.5 max-w-md leading-relaxed">
            Manage student and residential tenants, monitor their activity, and ensure compliance across all properties.
          </p>
        </div>
      </section>

      {/* 4-Card KPI Strip */}
      <TenantKpiCards
        stats={counts.kpiStats}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setPage(1);
        }}
      />

      {/* Status Tabs + Top Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter tenants by status">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-[#04793d] text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-800'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setExportOpen((prev) => !prev)}
              aria-expanded={exportOpen}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              <span>Export</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            </button>

            {exportOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-30">
                <button
                  type="button"
                  onClick={() => handleExportData('csv')}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-[#04793d] cursor-pointer"
                >
                  Download CSV ({selectedIds.length > 0 ? `${selectedIds.length} selected` : filteredTenants.length})
                </button>
                <button
                  type="button"
                  onClick={() => handleExportData('json')}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-[#04793d] cursor-pointer"
                >
                  Download JSON Snapshot
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setFormModal({ isOpen: true, mode: 'create', initialData: null })
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#04793d] hover:bg-[#036432] text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Tenant</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid: Filter Bar + Table (Left) & Insights / Quick Actions / Support (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_258px] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-2.5 flex flex-wrap lg:flex-nowrap items-center gap-2 shadow-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Search tenants by name, email, phone or Student ID"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email, phone or Student ID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <select
              aria-label="Filter by tenant status"
              value={activeTab}
              onChange={(e) => {
                setActiveTab(e.target.value as TenantStatusTab);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="EXITED">Exited</option>
            </select>

            <select
              aria-label="Filter by property"
              value={propertyFilter}
              onChange={(e) => {
                setPropertyFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer max-w-[160px]"
            >
              <option value="ALL">All Properties</option>
              {propertyOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              <option value="UNASSIGNED">Not assigned</option>
            </select>

            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
              <select
                aria-label="Filter by join date range"
                value={joinDateFilter}
                onChange={(e) => {
                  setJoinDateFilter(e.target.value as JoinDateFilter);
                  setPage(1);
                }}
                className="pl-8 pr-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="ALL">Join Date Range</option>
                <option value="7D">Last 7 days</option>
                <option value="30D">Last 30 days</option>
                <option value="90D">Last 90 days</option>
                <option value="THIS_YEAR">This year</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                aria-label="Clear active filters"
                onClick={resetAllFilters}
                className="p-2 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                title="Reset filters"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tenants Table Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs overflow-visible">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                    <th className="py-3 pl-3.5 pr-1.5 w-9">
                      <input
                        type="checkbox"
                        aria-label="Select all tenants on this page"
                        checked={allPageSelected}
                        onChange={(e) => handleSelectAllPage(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-zinc-300 text-[#04793d] focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-2">Tenant</th>
                    <th className="py-3 px-2">Contact Details</th>
                    <th className="py-3 px-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSort('property')}
                        className="inline-flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        <span>Property</span>
                        <ChevronsUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">
                      <button
                        type="button"
                        onClick={() => handleToggleSort('joinDate')}
                        className="inline-flex items-center gap-1 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        <span>Join Date</span>
                        <ChevronsUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 pl-2 pr-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx}>
                        <td colSpan={7} className="py-4 px-4">
                          <div className="h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                        </td>
                      </tr>
                    ))
                  ) : paginatedTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 px-4 text-center">
                        <div className="max-w-xs mx-auto space-y-2">
                          <Users className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
                          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                            No matching tenants found
                          </p>
                          <p className="text-xs text-zinc-500">
                            Try adjusting your search criteria, status tab, or property filter.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedTenants.map((tenant) => {
                      const statusKey = getTenantStatus(tenant);
                      const statusStyle = STATUS_BADGE_MAP[statusKey];
                      const fullName = `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim();
                      const prop = tenant.latestBooking?.property;
                      const isMenuOpen = openMenuId === tenant.id;
                      const isSelected = selectedIds.includes(tenant.id);

                      return (
                        <tr
                          key={tenant.id}
                          className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors ${
                            isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                          }`}
                        >
                          <td className="py-3 pl-3.5 pr-1.5">
                            <input
                              type="checkbox"
                              aria-label={`Select ${fullName}`}
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds((prev) => [...prev, tenant.id]);
                                } else {
                                  setSelectedIds((prev) => prev.filter((id) => id !== tenant.id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-zinc-300 text-[#04793d] focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>

                          {/* Tenant Identity */}
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {tenant.avatarUrl ? (
                                <img
                                  src={tenant.avatarUrl}
                                  alt={fullName}
                                  width={34}
                                  height={34}
                                  className="w-8.5 h-8.5 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                                />
                              ) : (
                                <div className="w-8.5 h-8.5 rounded-full bg-[#EAF7EE] dark:bg-emerald-950/60 text-[#04793d] dark:text-emerald-300 font-bold text-[11px] flex items-center justify-center shrink-0 border border-emerald-200/70 dark:border-emerald-800">
                                  {getInitials(tenant.firstName, tenant.lastName)}
                                </div>
                              )}
                              <div className="min-w-0">
                                <Link
                                  href={`/admin/tenants/${tenant.id}`}
                                  className="font-bold text-zinc-900 dark:text-white hover:text-[#04793d] dark:hover:text-emerald-400 transition block truncate max-w-[165px]"
                                >
                                  {fullName}
                                </Link>
                                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[165px]">
                                  {tenant.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Contact Details */}
                          <td className="py-3 px-2 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium">
                              <Phone className="w-3.5 h-3.5 text-[#04793d] dark:text-emerald-400 shrink-0" />
                              <span>{tenant.phoneNumber || 'No phone'}</span>
                            </div>
                          </td>

                          {/* Property */}
                          <td className="py-3 px-2">
                            {prop ? (
                              <div className="flex items-center gap-2 min-w-0">
                                {prop.thumbnailUrl ? (
                                  <img
                                    src={prop.thumbnailUrl}
                                    alt={prop.title}
                                    width={28}
                                    height={28}
                                    className="w-7 h-7 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-lg bg-[#EAF7EE] dark:bg-emerald-950/50 text-[#04793d] dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <Building2 className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[140px]">
                                  {prop.title}
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-400 dark:text-zinc-500 text-xs">
                                Not assigned
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-2 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusStyle.badge}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                              <span>{statusStyle.label}</span>
                            </span>
                          </td>

                          {/* Join Date */}
                          <td className="py-3 px-2 whitespace-nowrap text-zinc-600 dark:text-zinc-300 font-medium">
                            {formatJoinDate(tenant.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 pl-2 pr-3.5">
                            <div className="flex items-center justify-center gap-1 relative" data-tenant-row-menu>
                              <Link
                                href={`/admin/tenants/${tenant.id}`}
                                aria-label={`View ${fullName} profile`}
                                title="View profile"
                                className="w-7 h-7 rounded-full border border-zinc-200/80 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950/60 text-zinc-600 dark:text-zinc-300 hover:text-[#04793d] flex items-center justify-center transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>

                              <button
                                type="button"
                                aria-label={`Edit ${fullName}`}
                                title="Edit details"
                                onClick={() =>
                                  setFormModal({
                                    isOpen: true,
                                    mode: 'edit',
                                    initialData: tenant,
                                  })
                                }
                                className="w-7 h-7 rounded-full border border-zinc-200/80 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950/60 text-zinc-600 dark:text-zinc-300 hover:text-[#04793d] flex items-center justify-center transition cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                aria-label={`More actions for ${fullName}`}
                                aria-expanded={isMenuOpen}
                                title="More actions"
                                onClick={() => setOpenMenuId(isMenuOpen ? null : tenant.id)}
                                className="w-7 h-7 rounded-full border border-zinc-200/80 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>

                              {isMenuOpen && (
                                <div className="absolute right-0 top-8 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1.5 z-40 text-left">
                                  <Link
                                    href={`/admin/tenants/${tenant.id}`}
                                    onClick={() => setOpenMenuId(null)}
                                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>View Full Profile</span>
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setFormModal({
                                        isOpen: true,
                                        mode: 'edit',
                                        initialData: tenant,
                                      });
                                    }}
                                    className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>Edit Tenant Info</span>
                                  </button>

                                  {tenant.ghanaCardStatus !== 'VERIFIED' && (
                                    <button
                                      type="button"
                                      disabled={verifyKycMutation.isPending}
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        verifyKycMutation.mutate(tenant.id);
                                      }}
                                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#04793d] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      <span>Approve KYC Verified</span>
                                    </button>
                                  )}

                                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      setSuspendTarget(tenant);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold cursor-pointer ${
                                      tenant.isSuspended
                                        ? 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                        : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                    }`}
                                  >
                                    {tenant.isSuspended ? (
                                      <>
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Restore Account</span>
                                      </>
                                    ) : (
                                      <>
                                        <Ban className="w-3.5 h-3.5" />
                                        <span>Suspend Tenant</span>
                                      </>
                                    )}
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

            {/* Table Footer Pagination */}
            <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-zinc-500 dark:text-zinc-400 font-medium">
                Showing {showingStart}–{showingEnd} of {filteredTenants.length} tenants
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {paginationItems.map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`el-${idx}`} className="px-1.5 text-zinc-400 font-bold">
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
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
                  className="w-7 h-7 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar Rail */}
        <aside className="space-y-4">
          {/* Card 1: Tenant Insights */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                  Tenant Insights
                </h2>
              </div>
              <button
                type="button"
                aria-label="Export tenant insights summary"
                onClick={() => handleExportData('csv')}
                className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-[#04793d] dark:text-emerald-400 hover:bg-emerald-100 flex items-center justify-center transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-2xl font-black text-zinc-900 dark:text-white leading-none">
                  {counts.retentionRate}%
                </div>
                <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1">
                  Tenant Retention Rate
                </div>
                <div className="text-[11px] font-bold text-[#04793d] dark:text-emerald-400 mt-1">
                  ↑ {counts.activeRate}% verified
                </div>
              </div>

              <div className="relative w-[74px] h-[74px] shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 74 74" aria-hidden="true">
                  <circle
                    cx="37"
                    cy="37"
                    r={ringRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                    className="text-emerald-100 dark:text-emerald-950/70"
                  />
                  <circle
                    cx="37"
                    cy="37"
                    r={ringRadius}
                    fill="none"
                    stroke="#04793d"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-[#EAF7EE] dark:bg-emerald-950/70 flex items-center justify-center text-[#04793d] dark:text-emerald-400">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Quick Actions */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                Quick Actions
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveTab('PENDING');
                setPage(1);
                toast.success(
                  counts.pending > 0
                    ? `Filtered ${counts.pending} tenant(s) awaiting KYC approval`
                    : 'All current tenants are verified!'
                );
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-900/50 text-xs font-bold text-zinc-800 dark:text-zinc-100 transition cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
                <span>Verify Tenant Info</span>
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={() => handleExportData('csv')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-900/50 text-xs font-bold text-zinc-800 dark:text-zinc-100 transition cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <Download className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
                <span>Export Tenant List</span>
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>

            <Link
              href="/admin/audit"
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-900/50 text-xs font-bold text-zinc-800 dark:text-zinc-100 transition"
            >
              <span className="inline-flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
                <span>View Activity Logs</span>
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </Link>
          </div>

          {/* Card 3: Need Help Support Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#064e2b] to-[#022c17] p-4 text-white shadow-sm">
            <Building2
              aria-hidden="true"
              className="w-20 h-20 text-white/10 absolute -right-3 -bottom-3 pointer-events-none"
            />
            <div className="relative z-10 space-y-2.5">
              <Headphones className="w-5 h-5 text-emerald-200" />
              <div>
                <h2 className="text-sm font-extrabold text-white">Need Help?</h2>
                <p className="text-[11px] text-emerald-100/90 mt-0.5 leading-relaxed">
                  Contact our support team for assistance.
                </p>
              </div>
              <Link
                href="/admin/disputes"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#bbf7d0] hover:bg-white text-[#064e2b] text-xs font-bold transition shadow-xs"
              >
                <span>Contact Support</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Add / Edit Tenant Modal */}
      <TenantFormModal
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        initialData={formModal.initialData}
        onClose={() => setFormModal((prev) => ({ ...prev, isOpen: false }))}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-tenants-directory'] });
          refetch();
        }}
      />

      {/* Suspend / Restore Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={Boolean(suspendTarget)}
        onClose={() => setSuspendTarget(null)}
        onConfirm={async (reason) => {
          if (!suspendTarget) return;
          await suspendMutation.mutateAsync({
            id: suspendTarget.id,
            isSuspended: !suspendTarget.isSuspended,
            reason: reason || (suspendTarget.isSuspended ? 'Restored by admin' : 'Suspended by admin'),
          });
        }}
        title={
          suspendTarget?.isSuspended ? 'Restore Tenant Account' : 'Suspend Tenant Account'
        }
        description={
          suspendTarget?.isSuspended
            ? `Restore portal access for ${suspendTarget?.firstName} ${suspendTarget?.lastName}?`
            : `Suspend ${suspendTarget?.firstName} ${suspendTarget?.lastName}? Active sessions and new bookings will be blocked.`
        }
        confirmLabel={suspendTarget?.isSuspended ? 'Restore Account' : 'Suspend Tenant'}
        confirmVariant={suspendTarget?.isSuspended ? 'primary' : 'danger'}
        requireReason={!suspendTarget?.isSuspended}
      />
    </div>
  );
}
