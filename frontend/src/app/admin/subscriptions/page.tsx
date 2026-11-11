'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Crown,
  Search,
  Calendar,
  List,
  LayoutGrid,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldCheck,
  Building2,
  BarChart2,
  Check,
  XCircle,
  Download,
} from 'lucide-react';
import api from '@/lib/axios';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import SubscriptionKpiCards from '@/components/admin/SubscriptionKpiCards';

interface SubscriptionRecord {
  id: string;
  propertyId: string;
  paymentReference: string;
  paymentStatus: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  daysRemaining?: number;
  propertyThumbnail?: string | null;
  createdAt: string;
  property?: {
    id: string;
    title: string;
    type?: string;
    price?: number;
    location?: string;
    landlord?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber?: string | null;
      avatarUrl?: string | null;
      isSuspended?: boolean;
    } | null;
  } | null;
}

type SubscriptionStatusTab = 'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'SUSPENDED';
type DateRangeFilter = 'ALL' | 'EXPIRING_30D' | 'STARTED_30D' | 'THIS_YEAR';
type SortOption = 'EXPIRY' | 'START' | 'LANDLORD' | 'STATUS';
type PlanTier = 'Standard Plan' | 'Premium Plan' | 'Enterprise Plan';

const PAGE_SIZE = 5;

const getDaysRemaining = (sub: SubscriptionRecord): number => {
  if (typeof sub.daysRemaining === 'number') return sub.daysRemaining;
  const end = new Date(sub.endDate).getTime();
  return Math.ceil((end - Date.now()) / 86400000);
};

const getSubscriptionStatus = (sub: SubscriptionRecord): Exclude<SubscriptionStatusTab, 'ALL'> => {
  if (sub.paymentStatus === 'FAILED' || sub.property?.landlord?.isSuspended) {
    return 'SUSPENDED';
  }
  const days = getDaysRemaining(sub);
  if (!sub.isActive || sub.paymentStatus === 'EXPIRED' || days <= 0) {
    if (!sub.isActive && sub.paymentStatus === 'PENDING') {
      return 'EXPIRING_SOON';
    }
    return 'EXPIRED';
  }
  if (days <= 30) return 'EXPIRING_SOON';
  return 'ACTIVE';
};

const getSubscriptionPlan = (sub: SubscriptionRecord): PlanTier => {
  const price = Number(sub.property?.price || 0);
  const propType = String(sub.property?.type || '').toLowerCase();
  if (price >= 5000 || propType.includes('hostel')) return 'Enterprise Plan';
  if (price >= 1500 || propType.includes('townhouse') || propType.includes('house')) {
    return 'Premium Plan';
  }
  return 'Standard Plan';
};

const formatDateShort = (iso?: string): string => {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const getInitials = (firstName?: string, lastName?: string): string => {
  const f = (firstName || '').trim().charAt(0);
  const l = (lastName || '').trim().charAt(0);
  return (f + l).toUpperCase() || 'L';
};

const PLAN_STYLE_MAP: Record<PlanTier, string> = {
  'Standard Plan': 'bg-[#E8F2FF] text-[#1D4ED8] dark:bg-blue-950/60 dark:text-blue-300',
  'Premium Plan': 'bg-[#F3E8FF] text-[#7E22CE] dark:bg-purple-950/60 dark:text-purple-300',
  'Enterprise Plan': 'bg-[#EAF7EE] text-[#04793d] dark:bg-emerald-950/60 dark:text-emerald-300',
};

const STATUS_STYLE_MAP: Record<
  Exclude<SubscriptionStatusTab, 'ALL'>,
  { label: string; dot: string; badge: string }
> = {
  ACTIVE: {
    label: 'Active',
    dot: 'bg-emerald-500',
    badge: 'bg-[#EAF7EE] text-[#04793d] dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  EXPIRING_SOON: {
    label: 'Expiring Soon',
    dot: 'bg-amber-500',
    badge: 'bg-[#FEF4E8] text-[#C2410C] dark:bg-amber-950/60 dark:text-amber-300',
  },
  EXPIRED: {
    label: 'Expired',
    dot: 'bg-rose-500',
    badge: 'bg-[#FEECEC] text-[#B91C1C] dark:bg-rose-950/60 dark:text-rose-300',
  },
  SUSPENDED: {
    label: 'Suspended',
    dot: 'bg-purple-500',
    badge: 'bg-[#F3E8FF] text-[#7E22CE] dark:bg-purple-950/60 dark:text-purple-300',
  },
};

export default function AdminSubscriptionsPage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<SubscriptionStatusTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('EXPIRY');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [revokeDialog, setRevokeDialog] = useState<{
    isOpen: boolean;
    id: string | null;
    title: string;
  }>({ isOpen: false, id: null, title: '' });

  useEffect(() => {
    const onOutsideClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement)?.closest('[data-sub-row-menu]')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  const { data: rawSubscriptions = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const res = await api.get('/admin/subscriptions');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const subscriptions: SubscriptionRecord[] = useMemo(
    () => (Array.isArray(rawSubscriptions) ? rawSubscriptions : []),
    [rawSubscriptions]
  );

  const counts = useMemo(() => {
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    let suspended = 0;
    let recentCreated = 0;
    const thirtyDaysAgo = Date.now() - 30 * 86400000;

    subscriptions.forEach((s) => {
      const st = getSubscriptionStatus(s);
      if (st === 'ACTIVE') active += 1;
      else if (st === 'EXPIRING_SOON') expiringSoon += 1;
      else if (st === 'EXPIRED') expired += 1;
      else suspended += 1;

      if (s.createdAt && new Date(s.createdAt).getTime() >= thirtyDaysAgo) {
        recentCreated += 1;
      }
    });

    const total = subscriptions.length;
    const complianceRate =
      total > 0 ? Math.round(((active + expiringSoon) / total) * 100) : 0;

    return {
      all: total,
      active,
      expiringSoon,
      expired,
      suspended,
      complianceRate,
      kpiStats: {
        total,
        active,
        expiringSoon,
        expired,
        totalTrendPct: total > 0 ? Math.max(4, Math.round((recentCreated / total) * 100)) : 8,
        activeTrendPct: total > 0 ? Math.round((active / total) * 100) : 14,
        expiringSharePct: total > 0 ? Math.round((expiringSoon / total) * 100) : 0,
        expiredSharePct: total > 0 ? Math.round((expired / total) * 100) : 0,
      },
    };
  }, [subscriptions]);

  const filteredSubscriptions = useMemo(() => {
    const now = Date.now();
    const list = subscriptions.filter((s) => {
      const st = getSubscriptionStatus(s);
      if (activeTab !== 'ALL' && st !== activeTab) return false;

      if (dateRange === 'EXPIRING_30D') {
        const days = getDaysRemaining(s);
        if (days < 0 || days > 30) return false;
      } else if (dateRange === 'STARTED_30D') {
        const startMs = new Date(s.startDate).getTime();
        if (now - startMs > 30 * 86400000) return false;
      } else if (dateRange === 'THIS_YEAR') {
        const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
        if (new Date(s.startDate).getTime() < yearStart) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const propTitle = (s.property?.title || '').toLowerCase();
        const landlord = s.property?.landlord;
        const hostName = `${landlord?.firstName || ''} ${landlord?.lastName || ''}`.toLowerCase();
        const email = (landlord?.email || '').toLowerCase();
        const ref = (s.paymentReference || '').toLowerCase();
        return (
          propTitle.includes(q) ||
          hostName.includes(q) ||
          email.includes(q) ||
          ref.includes(q)
        );
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'EXPIRY') {
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      }
      if (sortBy === 'START') {
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      }
      if (sortBy === 'LANDLORD') {
        const na = `${a.property?.landlord?.firstName || ''} ${a.property?.landlord?.lastName || ''}`.toLowerCase();
        const nb = `${b.property?.landlord?.firstName || ''} ${b.property?.landlord?.lastName || ''}`.toLowerCase();
        return na.localeCompare(nb);
      }
      return getSubscriptionStatus(a).localeCompare(getSubscriptionStatus(b));
    });

    return list;
  }, [subscriptions, activeTab, dateRange, searchQuery, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredSubscriptions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedSubscriptions = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredSubscriptions.slice(start, start + PAGE_SIZE);
  }, [filteredSubscriptions, safePage]);

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(`/admin/subscriptions/${id}/activate`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Property listing license activated for 1 year');
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to activate subscription');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.put(`/admin/subscriptions/${id}/revoke`, { reason });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Subscription license revoked');
      setRevokeDialog({ isOpen: false, id: null, title: '' });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to revoke subscription');
    },
  });

  const handleSelectAllPage = (checked: boolean) => {
    if (checked) {
      const ids = paginatedSubscriptions.map((s) => s.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    } else {
      const pageSet = new Set(paginatedSubscriptions.map((s) => s.id));
      setSelectedIds((prev) => prev.filter((id) => !pageSet.has(id)));
    }
  };

  const handleExportCsv = (rowsToExport?: SubscriptionRecord[]) => {
    const source =
      rowsToExport ||
      (selectedIds.length > 0
        ? filteredSubscriptions.filter((s) => selectedIds.includes(s.id))
        : filteredSubscriptions);

    if (source.length === 0) {
      toast.error('No subscription records to export');
      return;
    }

    const header = [
      'Landlord',
      'Email',
      'Property',
      'Plan',
      'License Ref',
      'Start Date',
      'Expiry Date',
      'Status',
    ];
    const rows = source.map((s) => {
      const landlord = s.property?.landlord;
      return [
        landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Unknown Landlord',
        landlord?.email || '',
        s.property?.title || 'Untitled Property',
        getSubscriptionPlan(s),
        s.paymentReference || 'N/A',
        formatDateShort(s.startDate),
        formatDateShort(s.endDate),
        STATUS_STYLE_MAP[getSubscriptionStatus(s)].label,
      ];
    });

    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `akwaaba-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${source.length} license record(s)`);
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
    paginatedSubscriptions.length > 0 &&
    paginatedSubscriptions.every((s) => selectedIds.includes(s.id));

  const ringRadius = 40;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - counts.complianceRate / 100);

  const showingStart =
    filteredSubscriptions.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(safePage * PAGE_SIZE, filteredSubscriptions.length);

  const tabs: { key: SubscriptionStatusTab; label: string; count: number }[] = [
    { key: 'ALL', label: 'All Subscriptions', count: counts.all },
    { key: 'ACTIVE', label: 'Active', count: counts.active },
    { key: 'EXPIRING_SOON', label: 'Expiring Soon', count: counts.expiringSoon },
    { key: 'EXPIRED', label: 'Expired', count: counts.expired },
    { key: 'SUSPENDED', label: 'Suspended', count: counts.suspended },
  ];

  const breakdownRows: {
    key: Exclude<SubscriptionStatusTab, 'ALL'>;
    label: string;
    count: number;
    dot: string;
  }[] = [
    { key: 'ACTIVE', label: 'Active', count: counts.active, dot: 'bg-emerald-500' },
    {
      key: 'EXPIRING_SOON',
      label: 'Expiring Soon',
      count: counts.expiringSoon,
      dot: 'bg-amber-500',
    },
    { key: 'EXPIRED', label: 'Expired', count: counts.expired, dot: 'bg-rose-500' },
    { key: 'SUSPENDED', label: 'Suspended', count: counts.suspended, dot: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-[22px] border border-zinc-200/80 dark:border-zinc-800 bg-gradient-to-r from-[#ebf7f0] via-[#f4fbf7] to-white dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 min-h-[144px] flex items-center justify-between gap-4 px-6 py-5">
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

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800/70 text-[#04793d] dark:text-emerald-300 text-[11px] font-bold mb-2">
            <Crown className="w-3.5 h-3.5" />
            <span>Subscription Management</span>
          </div>
          <h1 className="text-2xl sm:text-[26px] font-black text-zinc-900 dark:text-white tracking-tight leading-tight">
            Landlord Property Subscriptions &amp; Licenses
          </h1>
          <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-300 mt-1.5 max-w-lg leading-relaxed">
            Manage annual listing licenses, monitor expiration timelines, and enforce billing compliance.
          </p>
        </div>

        {/* Floating Frosted Right Expiring Soon Pill */}
        <button
          type="button"
          onClick={() => {
            setActiveTab('EXPIRING_SOON');
            setPage(1);
          }}
          className="hidden md:flex relative z-10 items-center gap-3 px-4 py-3 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-white/80 dark:border-zinc-700 shadow-sm hover:border-emerald-300 transition cursor-pointer shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-[#EAF7EE] dark:bg-emerald-950/70 flex items-center justify-center text-[#04793d] dark:text-emerald-400">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="text-lg font-black text-zinc-900 dark:text-white leading-none">
              {counts.expiringSoon}
            </div>
            <div className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
              Expiring Soon
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 ml-1" />
        </button>
      </section>

      {/* 4-Card KPI Strip */}
      <SubscriptionKpiCards
        stats={counts.kpiStats}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setPage(1);
        }}
      />

      {/* Segmented Status Tabs + Date Range Picker */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex flex-wrap items-center gap-2"
          role="tablist"
          aria-label="Filter subscriptions by status"
        >
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

        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 text-zinc-500 absolute left-3 pointer-events-none" />
            <select
              aria-label="Filter by subscription date range"
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as DateRangeFilter);
                setPage(1);
              }}
              className="pl-8 pr-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="ALL">Date Range</option>
              <option value="EXPIRING_30D">Expiring Within 30 Days</option>
              <option value="STARTED_30D">Started Last 30 Days</option>
              <option value="THIS_YEAR">Started This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main 2-Column Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_242px] gap-3.5 items-start">
        <div className="space-y-3.5 min-w-0">
          {/* Search + Sort + View Mode Bar */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                aria-label="Search subscriptions by landlord, property, or license number"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by landlord, property, or license number..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Sort by:
              </span>
              <select
                aria-label="Sort subscriptions"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as SortOption);
                  setPage(1);
                }}
                className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="EXPIRY">Expiry Date</option>
                <option value="START">Start Date</option>
                <option value="LANDLORD">Landlord Name</option>
                <option value="STATUS">Status</option>
              </select>

              <div className="inline-flex items-center p-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-xs">
                <button
                  type="button"
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-[#EAF7EE] text-[#04793d] dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[#EAF7EE] text-[#04793d] dark:bg-emerald-950/60 dark:text-emerald-400'
                      : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Data Container: List Table vs Card Grid */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs overflow-visible">
            {viewMode === 'list' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                      <th className="py-3 pl-2.5 pr-1 w-7">
                        <input
                          type="checkbox"
                          aria-label="Select all licenses on this page"
                          checked={allPageSelected}
                          onChange={(e) => handleSelectAllPage(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-zinc-300 text-[#04793d] focus:ring-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-1.5">Landlord</th>
                      <th className="py-3 px-1.5">Property / Portfolio</th>
                      <th className="py-3 px-1.5 whitespace-nowrap">Subscription Plan</th>
                      <th className="py-3 px-1.5 whitespace-nowrap">Start Date</th>
                      <th className="py-3 px-1.5 whitespace-nowrap">Expiry Date</th>
                      <th className="py-3 px-1.5">Status</th>
                      <th className="py-3 pl-1 pr-2.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={idx}>
                          <td colSpan={8} className="py-4 px-4">
                            <div className="h-7 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                          </td>
                        </tr>
                      ))
                    ) : paginatedSubscriptions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 px-4 text-center">
                          <div className="max-w-xs mx-auto space-y-2">
                            <Crown className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto" />
                            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                              No subscription licenses found
                            </p>
                            <p className="text-xs text-zinc-500">
                              Try adjusting your search query, date range, or status tab.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedSubscriptions.map((sub) => {
                        const landlord = sub.property?.landlord;
                        const hostName = landlord
                          ? `${landlord.firstName || ''} ${landlord.lastName || ''}`.trim()
                          : 'Unknown Landlord';
                        const statusKey = getSubscriptionStatus(sub);
                        const statusStyle = STATUS_STYLE_MAP[statusKey];
                        const plan = getSubscriptionPlan(sub);
                        const isSelected = selectedIds.includes(sub.id);
                        const isMenuOpen = openMenuId === sub.id;

                        return (
                          <tr
                            key={sub.id}
                            className={`hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors ${
                              isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                            }`}
                          >
                            <td className="py-3 pl-2.5 pr-1">
                              <input
                                type="checkbox"
                                aria-label={`Select license for ${sub.property?.title || hostName}`}
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedIds((prev) => [...prev, sub.id]);
                                  } else {
                                    setSelectedIds((prev) => prev.filter((id) => id !== sub.id));
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-zinc-300 text-[#04793d] focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>

                            {/* Landlord */}
                            <td className="py-3 px-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                {landlord?.avatarUrl ? (
                                  <img
                                    src={landlord.avatarUrl}
                                    alt={hostName}
                                    width={30}
                                    height={30}
                                    className="w-7.5 h-7.5 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                                  />
                                ) : (
                                  <div className="w-7.5 h-7.5 rounded-full bg-[#EAF7EE] dark:bg-emerald-950/60 text-[#04793d] dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center shrink-0 border border-emerald-200/70 dark:border-emerald-800">
                                    {getInitials(landlord?.firstName, landlord?.lastName)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  {landlord?.id ? (
                                    <Link
                                      href={`/admin/landlords/${landlord.id}`}
                                      className="font-bold text-zinc-900 dark:text-white hover:text-[#04793d] dark:hover:text-emerald-400 transition block truncate max-w-[114px]"
                                    >
                                      {hostName}
                                    </Link>
                                  ) : (
                                    <span className="font-bold text-zinc-900 dark:text-white block truncate max-w-[114px]">
                                      {hostName}
                                    </span>
                                  )}
                                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[114px]">
                                    {landlord?.email || 'No email'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Property / Portfolio */}
                            <td className="py-3 px-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {sub.propertyThumbnail ? (
                                  <img
                                    src={sub.propertyThumbnail}
                                    alt={sub.property?.title || 'Property'}
                                    width={26}
                                    height={26}
                                    className="w-6.5 h-6.5 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                                  />
                                ) : (
                                  <div className="w-6.5 h-6.5 rounded-lg bg-[#EAF7EE] dark:bg-emerald-950/50 text-[#04793d] dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <Building2 className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                <Link
                                  href={`/admin/subscriptions/${sub.id}`}
                                  className="font-semibold text-[11px] text-zinc-800 dark:text-zinc-200 hover:text-[#04793d] truncate max-w-[106px] block"
                                >
                                  {sub.property?.title || 'Untitled Property'}
                                </Link>
                              </div>
                            </td>

                            {/* Subscription Plan */}
                            <td className="py-3 px-1.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${PLAN_STYLE_MAP[plan]}`}
                              >
                                <Crown className="w-2.5 h-2.5 shrink-0" />
                                <span>{plan}</span>
                              </span>
                            </td>

                            {/* Start Date */}
                            <td className="py-3 px-1.5 whitespace-nowrap text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
                              {formatDateShort(sub.startDate)}
                            </td>

                            {/* Expiry Date */}
                            <td className="py-3 px-1.5 whitespace-nowrap text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
                              {formatDateShort(sub.endDate)}
                            </td>

                            {/* Status */}
                            <td className="py-3 px-1.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyle.badge}`}
                              >
                                {statusKey === 'EXPIRING_SOON' ? (
                                  <Clock className="w-2.5 h-2.5 shrink-0" />
                                ) : (
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                )}
                                <span>{statusStyle.label}</span>
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="py-3 pl-1 pr-2.5">
                              <div
                                className="flex items-center justify-center gap-1 relative"
                                data-sub-row-menu
                              >
                                <Link
                                  href={`/admin/subscriptions/${sub.id}`}
                                  aria-label={`Inspect license for ${sub.property?.title || hostName}`}
                                  title="Inspect license"
                                  className="w-6.5 h-6.5 rounded-full border border-zinc-200/80 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950/60 text-zinc-600 dark:text-zinc-300 hover:text-[#04793d] flex items-center justify-center transition"
                                >
                                  <Eye className="w-3 h-3" />
                                </Link>

                                <button
                                  type="button"
                                  aria-label={`More license actions for ${sub.property?.title || hostName}`}
                                  aria-expanded={isMenuOpen}
                                  title="More actions"
                                  onClick={() => setOpenMenuId(isMenuOpen ? null : sub.id)}
                                  className="w-6.5 h-6.5 rounded-full border border-zinc-200/80 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center transition cursor-pointer"
                                >
                                  <MoreHorizontal className="w-3 h-3" />
                                </button>

                                {isMenuOpen && (
                                  <div className="absolute right-0 top-8 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1.5 z-40 text-left">
                                    <Link
                                      href={`/admin/subscriptions/${sub.id}`}
                                      onClick={() => setOpenMenuId(null)}
                                      className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                                      <span>Inspect License Details</span>
                                    </Link>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuId(null);
                                        handleExportCsv([sub]);
                                      }}
                                      className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                                    >
                                      <Download className="w-3.5 h-3.5 text-zinc-400" />
                                      <span>Export License CSV</span>
                                    </button>

                                    <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />

                                    {!sub.isActive || statusKey === 'EXPIRED' ? (
                                      <button
                                        type="button"
                                        disabled={activateMutation.isPending}
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          activateMutation.mutate(sub.id);
                                        }}
                                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#04793d] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Activate / Renew (1 Yr)</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          setRevokeDialog({
                                            isOpen: true,
                                            id: sub.id,
                                            title: sub.property?.title || 'Property',
                                          });
                                        }}
                                        className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>Revoke License</span>
                                      </button>
                                    )}
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
            ) : (
              /* Grid View */
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {paginatedSubscriptions.length === 0 ? (
                  <div className="col-span-full py-10 text-center text-xs text-zinc-500">
                    No matching subscriptions found.
                  </div>
                ) : (
                  paginatedSubscriptions.map((sub) => {
                    const landlord = sub.property?.landlord;
                    const hostName = landlord
                      ? `${landlord.firstName || ''} ${landlord.lastName || ''}`.trim()
                      : 'Unknown Landlord';
                    const statusKey = getSubscriptionStatus(sub);
                    const statusStyle = STATUS_STYLE_MAP[statusKey];
                    const plan = getSubscriptionPlan(sub);
                    return (
                      <div
                        key={sub.id}
                        className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/30 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-[#EAF7EE] dark:bg-emerald-950/60 text-[#04793d] dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                              {getInitials(landlord?.firstName, landlord?.lastName)}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/admin/subscriptions/${sub.id}`}
                                className="font-bold text-xs text-zinc-900 dark:text-white hover:text-[#04793d] truncate block"
                              >
                                {sub.property?.title || 'Untitled Property'}
                              </Link>
                              <div className="text-[11px] text-zinc-500 truncate">{hostName}</div>
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusStyle.badge}`}
                          >
                            {statusStyle.label}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${PLAN_STYLE_MAP[plan]}`}>
                            <Crown className="w-3 h-3" />
                            <span>{plan}</span>
                          </span>
                          <span className="text-zinc-500">
                            Exp: {formatDateShort(sub.endDate)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                          <Link
                            href={`/admin/subscriptions/${sub.id}`}
                            className="text-xs font-bold text-[#04793d] hover:underline"
                          >
                            Inspect License →
                          </Link>
                          {!sub.isActive ? (
                            <button
                              type="button"
                              onClick={() => activateMutation.mutate(sub.id)}
                              className="px-2.5 py-1 rounded-lg bg-[#04793d] text-white text-[11px] font-bold cursor-pointer"
                            >
                              Activate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setRevokeDialog({
                                  isOpen: true,
                                  id: sub.id,
                                  title: sub.property?.title || 'Property',
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-bold cursor-pointer"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Table Footer Pagination */}
            <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-zinc-500 dark:text-zinc-400 font-medium">
                Showing {showingStart}–{showingEnd} of {filteredSubscriptions.length} subscriptions
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
          {/* Card 1: Subscription Overview */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 shadow-xs space-y-4">
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white text-center">
              Subscription Overview
            </h2>

            <div className="flex flex-col items-center">
              <div className="relative w-[104px] h-[104px] flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 104 104" aria-hidden="true">
                  <circle
                    cx="52"
                    cy="52"
                    r={ringRadius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="9"
                    className="text-emerald-100 dark:text-emerald-950/70"
                  />
                  <circle
                    cx="52"
                    cy="52"
                    r={ringRadius}
                    fill="none"
                    stroke="#04793d"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-black text-zinc-900 dark:text-white">
                    {counts.complianceRate}%
                  </span>
                </div>
              </div>

              <div className="text-xs font-extrabold text-zinc-900 dark:text-white mt-2">
                Compliance Rate
              </div>
              <div className="text-[11px] font-bold text-[#04793d] dark:text-emerald-400 mt-0.5">
                ↑ {counts.active} active of {counts.all}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              {breakdownRows.map((row) => (
                <button
                  key={row.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(row.key);
                    setPage(1);
                  }}
                  className="w-full flex items-center justify-between text-xs py-1 px-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-300 font-medium">
                    <span className={`w-2 h-2 rounded-full ${row.dot}`} />
                    <span>{row.label}</span>
                  </span>
                  <span className="font-extrabold text-zinc-900 dark:text-white">
                    {row.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Card 2: Stay Compliant Card */}
          <div className="rounded-2xl bg-[#EAF7EE] dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 p-4 space-y-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-emerald-900/60 flex items-center justify-center text-[#04793d] dark:text-emerald-400 shrink-0 shadow-2xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white leading-tight">
                  Stay Compliant
                </h2>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1 leading-relaxed">
                  Keep all landlord subscriptions up to date to ensure compliance.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveTab('EXPIRING_SOON');
                setPage(1);
                toast.success(
                  counts.expiringSoon > 0
                    ? `Showing ${counts.expiringSoon} license(s) expiring soon`
                    : 'No licenses expiring within 30 days'
                );
              }}
              className="w-full py-2.5 px-3.5 rounded-xl bg-[#04793d] hover:bg-[#036432] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <span>View Expiring Licenses</span>
              <span>→</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Revoke Subscription License Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={revokeDialog.isOpen}
        onClose={() => setRevokeDialog({ isOpen: false, id: null, title: '' })}
        onConfirm={async (reason) => {
          if (revokeDialog.id) {
            await revokeMutation.mutateAsync({ id: revokeDialog.id, reason });
          }
        }}
        title="Revoke Property License"
        description={`You are about to revoke the active annual listing license for "${revokeDialog.title}". The property will be unlisted from tenant search immediately.`}
        confirmLabel="Revoke License"
        confirmVariant="danger"
        requireReason={true}
      />
    </div>
  );
}
