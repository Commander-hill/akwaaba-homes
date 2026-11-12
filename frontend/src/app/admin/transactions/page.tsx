'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Calendar,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  List,
  LayoutGrid,
  Eye,
  MoreHorizontal,
  Copy,
  ExternalLink,
  Smartphone,
  Landmark,
  BarChart2,
  Headphones,
  ArrowRight,
  Building2,
} from 'lucide-react';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import TransactionKpiCards from '@/components/admin/TransactionKpiCards';

type LedgerCategory = 'ALL' | 'RENT_PAYMENT' | 'DISBURSEMENT' | 'REFUND' | 'ADJUSTMENT';
type LedgerStatus = 'SUCCESSFUL' | 'PROCESSING' | 'FAILED' | 'REFUNDED';
type DateRangeOption = '7D' | '30D' | '90D' | 'ALL';
type SortOption = 'NEWEST' | 'OLDEST' | 'AMOUNT_DESC' | 'AMOUNT_ASC';

interface LedgerEntry {
  id: string;
  source: 'TRANSACTION' | 'PAYOUT';
  reference: string;
  createdAt: string;
  category: Exclude<LedgerCategory, 'ALL'>;
  typeLabel: 'Rent Payment' | 'Payout' | 'Disbursement' | 'Refund' | 'Adjustment';
  partyName: string;
  partyEmail: string;
  partyAvatar?: string | null;
  partyHref?: string;
  propertyTitle: string;
  propertyLocation?: string;
  propertyThumbnail?: string | null;
  amount: number;
  status: LedgerStatus;
  paymentMethod: 'Mobile Money' | 'Bank Transfer' | 'Card Payment';
  detailHref: string;
}

const PAGE_SIZE = 5;

const parseFirstPropertyImage = (rawImages: unknown): string | null => {
  if (!rawImages) return null;
  if (Array.isArray(rawImages)) {
    const first = rawImages[0];
    return typeof first === 'string' && first.trim() ? first : null;
  }
  if (typeof rawImages === 'string') {
    const trimmed = rawImages.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
          return parsed[0];
        }
      } catch {
        return null;
      }
    }
    return trimmed;
  }
  return null;
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const formatDateParts = (iso: string): { date: string; time: string } => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: 'N/A', time: '' };
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
  };
};

const TYPE_BADGE_MAP: Record<LedgerEntry['typeLabel'], string> = {
  'Rent Payment': 'bg-[#E6F7EE] text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-300',
  Payout: 'bg-[#E8F2FF] text-[#1D4ED8] dark:bg-blue-950/60 dark:text-blue-300',
  Disbursement: 'bg-[#F3E8FF] text-[#7E22CE] dark:bg-purple-950/60 dark:text-purple-300',
  Refund: 'bg-[#FEF3E8] text-[#C2410C] dark:bg-amber-950/60 dark:text-amber-300',
  Adjustment: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

const STATUS_STYLE_MAP: Record<LedgerStatus, { pill: string; dot: string; label: string }> = {
  SUCCESSFUL: {
    pill: 'bg-[#E6F7EE] text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    label: 'Successful',
  },
  PROCESSING: {
    pill: 'bg-[#E8F2FF] text-[#1D4ED8] dark:bg-blue-950/60 dark:text-blue-300',
    dot: 'bg-blue-500',
    label: 'Processing',
  },
  REFUNDED: {
    pill: 'bg-[#FEF3E8] text-[#C2410C] dark:bg-amber-950/60 dark:text-amber-300',
    dot: 'bg-amber-500',
    label: 'Refunded',
  },
  FAILED: {
    pill: 'bg-[#FEE2E2] text-[#B91C1C] dark:bg-rose-950/60 dark:text-rose-300',
    dot: 'bg-rose-500',
    label: 'Failed',
  },
};

export default function AdminTransactionsPage() {
  const [activeCategory, setActiveCategory] = useState<LedgerCategory>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeOption>('30D');
  const [sortBy, setSortBy] = useState<SortOption>('NEWEST');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  useEffect(() => {
    const closeMenu = () => setOpenActionId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const { data: rawTransactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const res = await api.get('/admin/transactions');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const { data: rawPayouts = [], isLoading: payoutsLoading } = useQuery({
    queryKey: ['admin-transactions-payouts'],
    queryFn: async () => {
      try {
        const res = await api.get('/admin/payouts?limit=100');
        if (Array.isArray(res.data)) return res.data;
        if (Array.isArray(res.data?.payouts)) return res.data.payouts;
        return [];
      } catch {
        return [];
      }
    },
  });

  const allEntries: LedgerEntry[] = useMemo(() => {
    const txEntries: LedgerEntry[] = (rawTransactions as any[]).map((t) => {
      const rawStatus = String(t.status || 'SUCCESS').toUpperCase();
      let status: LedgerStatus = 'PROCESSING';
      let category: Exclude<LedgerCategory, 'ALL'> = 'RENT_PAYMENT';
      let typeLabel: LedgerEntry['typeLabel'] = 'Rent Payment';

      if (rawStatus === 'REFUNDED') {
        status = 'REFUNDED';
        category = 'REFUND';
        typeLabel = 'Refund';
      } else if (rawStatus === 'ADJUSTED' || rawStatus === 'ADJUSTMENT') {
        status = 'SUCCESSFUL';
        category = 'ADJUSTMENT';
        typeLabel = 'Adjustment';
      } else if (rawStatus === 'SUCCESS' || rawStatus === 'COMPLETED') {
        status = 'SUCCESSFUL';
      } else if (rawStatus === 'FAILED' || rawStatus === 'REJECTED' || rawStatus === 'CANCELLED') {
        status = 'FAILED';
      }

      const methodRaw = String(t.paymentMethod || t.channel || '').toLowerCase();
      let paymentMethod: LedgerEntry['paymentMethod'] = 'Mobile Money';
      if (methodRaw.includes('card')) paymentMethod = 'Card Payment';
      else if (methodRaw.includes('bank') || methodRaw.includes('transfer')) {
        paymentMethod = 'Bank Transfer';
      }

      const partyName = t.tenant
        ? `${t.tenant.firstName || ''} ${t.tenant.lastName || ''}`.trim() || 'Tenant'
        : 'Tenant';

      return {
        id: `tx-${t.id}`,
        source: 'TRANSACTION',
        reference: t.reference || `TXN-${String(t.id).slice(0, 8).toUpperCase()}`,
        createdAt: t.createdAt,
        category,
        typeLabel,
        partyName,
        partyEmail: t.tenant?.email || '',
        partyAvatar: t.tenant?.avatarUrl || null,
        partyHref: t.tenant?.id ? `/admin/tenants/${t.tenant.id}` : undefined,
        propertyTitle: t.property?.title || 'Residential Rental',
        propertyLocation: t.property?.location || '',
        propertyThumbnail: parseFirstPropertyImage(t.property?.images),
        amount: Number(t.amount || 0),
        status,
        paymentMethod,
        detailHref: `/admin/transactions/${t.id}`,
      };
    });

    const payoutEntries: LedgerEntry[] = (rawPayouts as any[]).map((p) => {
      const rawStatus = String(p.status || 'PENDING').toUpperCase();
      let status: LedgerStatus = 'PROCESSING';
      if (rawStatus === 'PAID' || rawStatus === 'COMPLETED' || rawStatus === 'APPROVED') {
        status = 'SUCCESSFUL';
      } else if (rawStatus === 'REJECTED' || rawStatus === 'FAILED') {
        status = 'FAILED';
      }

      const bankOrNet = String(p.bankOrNetwork || '').toLowerCase();
      const paymentMethod: LedgerEntry['paymentMethod'] =
        bankOrNet.includes('mtn') ||
        bankOrNet.includes('telecel') ||
        bankOrNet.includes('airtel') ||
        bankOrNet.includes('momo')
          ? 'Mobile Money'
          : 'Bank Transfer';

      const partyName = p.landlord
        ? `${p.landlord.firstName || ''} ${p.landlord.lastName || ''}`.trim() || p.accountName || 'Landlord'
        : p.accountName || 'Landlord';

      return {
        id: `po-${p.id}`,
        source: 'PAYOUT',
        reference: p.transferReference || `PAY-${String(p.id).slice(0, 8).toUpperCase()}`,
        createdAt: p.createdAt,
        category: 'DISBURSEMENT',
        typeLabel: rawStatus === 'PAID' || rawStatus === 'COMPLETED' ? 'Disbursement' : 'Payout',
        partyName,
        partyEmail: p.landlord?.email || p.accountNumber || '',
        partyAvatar: p.landlord?.avatarUrl || null,
        partyHref: p.landlord?.id ? `/admin/landlords/${p.landlord.id}` : undefined,
        propertyTitle: p.bankOrNetwork || 'Landlord Settlement',
        propertyLocation: p.accountName || '',
        propertyThumbnail: null,
        amount: Number(p.amount || 0),
        status,
        paymentMethod,
        detailHref: '/admin/payouts',
      };
    });

    return [...txEntries, ...payoutEntries];
  }, [rawTransactions, rawPayouts]);

  const dateFilteredEntries = useMemo(() => {
    if (dateRange === 'ALL') return allEntries;
    const days = dateRange === '7D' ? 7 : dateRange === '30D' ? 30 : 90;
    const cutoff = Date.now() - days * 86400000;
    return allEntries.filter((e) => {
      const ts = new Date(e.createdAt).getTime();
      return !Number.isNaN(ts) && ts >= cutoff;
    });
  }, [allEntries, dateRange]);

  const counts = useMemo(() => {
    let rentPayments = 0;
    let disbursements = 0;
    let refunds = 0;
    let adjustments = 0;

    let inflows = 0;
    let outflows = 0;
    let successful = 0;
    let processing = 0;
    let failed = 0;
    let refunded = 0;

    dateFilteredEntries.forEach((e) => {
      if (e.category === 'RENT_PAYMENT') rentPayments += 1;
      else if (e.category === 'DISBURSEMENT') disbursements += 1;
      else if (e.category === 'REFUND') refunds += 1;
      else if (e.category === 'ADJUSTMENT') adjustments += 1;

      if (e.category === 'RENT_PAYMENT' && e.status === 'SUCCESSFUL') {
        inflows += e.amount;
      } else if (e.category === 'DISBURSEMENT' || e.category === 'REFUND') {
        outflows += e.amount;
      }

      if (e.status === 'SUCCESSFUL') successful += 1;
      else if (e.status === 'PROCESSING') processing += 1;
      else if (e.status === 'FAILED') failed += 1;
      else if (e.status === 'REFUNDED') refunded += 1;
    });

    const totalCount = dateFilteredEntries.length;
    const totalVolume = inflows + outflows;
    const successRate = totalCount > 0 ? (successful / totalCount) * 100 : 100;

    return {
      all: totalCount,
      rentPayments,
      disbursements,
      refunds,
      adjustments,
      successful,
      processing,
      failed,
      refunded,
      kpiStats: {
        totalVolume,
        inflows,
        outflows,
        successRate,
      },
    };
  }, [dateFilteredEntries]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = dateFilteredEntries.filter((e) => {
      if (activeCategory !== 'ALL' && e.category !== activeCategory) return false;
      if (q) {
        const hay = `${e.reference} ${e.partyName} ${e.partyEmail} ${e.propertyTitle} ${e.typeLabel}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'NEWEST') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'OLDEST') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'AMOUNT_DESC') return b.amount - a.amount;
      return a.amount - b.amount;
    });
  }, [dateFilteredEntries, activeCategory, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedEntries = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [filteredEntries, safePage]);

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

  const exportReportCSV = () => {
    if (!filteredEntries.length) {
      toast.error('No transactions to export');
      return;
    }
    const headers = ['Date', 'Transaction ID', 'Type', 'Party', 'Email', 'Property', 'Amount (GHS)', 'Status', 'Payment Method'];
    const rows = filteredEntries.map((e) => [
      new Date(e.createdAt).toISOString(),
      e.reference,
      e.typeLabel,
      `"${e.partyName.replace(/"/g, '""')}"`,
      `"${e.partyEmail.replace(/"/g, '""')}"`,
      `"${e.propertyTitle.replace(/"/g, '""')}"`,
      e.amount.toFixed(2),
      STATUS_STYLE_MAP[e.status].label,
      e.paymentMethod,
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `AkwaabaHomes_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredEntries.length} ledger records`);
  };

  const copyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    toast.success('Transaction ID copied');
  };

  const ringRadius = 40;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(100, Math.max(0, counts.kpiStats.successRate)) / 100);

  const showingStart = filteredEntries.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(safePage * PAGE_SIZE, filteredEntries.length);
  const isLoading = txLoading || payoutsLoading;

  const tabs: { key: LedgerCategory; label: string; count: number }[] = [
    { key: 'ALL', label: 'All Transactions', count: counts.all },
    { key: 'RENT_PAYMENT', label: 'Rent Payments', count: counts.rentPayments },
    { key: 'DISBURSEMENT', label: 'Disbursements', count: counts.disbursements },
    { key: 'REFUND', label: 'Refunds', count: counts.refunds },
    { key: 'ADJUSTMENT', label: 'Adjustments', count: counts.adjustments },
  ];

  const breakdownRows: { label: string; count: number; dot: string }[] = [
    { label: 'Successful', count: counts.successful, dot: 'bg-emerald-400' },
    { label: 'Processing', count: counts.processing, dot: 'bg-sky-400' },
    { label: 'Failed', count: counts.failed, dot: 'bg-amber-400' },
    { label: 'Refunded', count: counts.refunded, dot: 'bg-purple-400' },
  ];

  return (
    <div className="space-y-5 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-[22px] border border-zinc-200/80 dark:border-zinc-800 bg-gradient-to-r from-[#ebf7f0] via-[#f4fbf7] to-white dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 min-h-[132px] flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-5">
        <div
          className="absolute right-0 top-0 bottom-0 w-full sm:w-[60%] lg:w-[52%] pointer-events-none select-none overflow-hidden"
          aria-hidden="true"
        >
          <img
            src="/images/admin/landlords-hero-building.webp"
            alt=""
            width={604}
            height={142}
            fetchPriority="high"
            className="w-full h-full object-cover object-right opacity-85 dark:opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#ebf7f0] via-[#f4fbf7]/85 to-transparent dark:from-zinc-900 dark:via-zinc-900/90 dark:to-transparent" />
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E1F5EA] dark:bg-emerald-950/70 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center text-[#04793d] dark:text-emerald-400 shrink-0 shadow-xs">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight">
              Financial Transactions &amp; Payment Ledger
            </h1>
            <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-300 mt-1 max-w-xl leading-relaxed">
              Track all tenant payments, rent disbursements, and financial activities.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 shrink-0">
          <div className="relative">
            <Calendar className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as DateRangeOption);
                setPage(1);
              }}
              aria-label="Filter date range"
              className="appearance-none h-10 pl-9 pr-8 rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
              <option value="90D">Last 90 Days</option>
              <option value="ALL">All Time</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={exportReportCSV}
            className="h-10 px-4 rounded-xl bg-[#04793d] hover:bg-[#036131] text-white text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Report</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>
      </section>

      {/* 4-Card KPI Strip */}
      <TransactionKpiCards
        stats={counts.kpiStats}
        activeTab={activeCategory}
        onSelectTab={(tab) => {
          setActiveCategory(tab);
          setPage(1);
        }}
      />

      {/* Category Filter Tabs + Sort + View Mode */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {tabs.map((tab) => {
            const isActive = activeCategory === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveCategory(tab.key);
                  setPage(1);
                }}
                className={`h-9 px-4 rounded-full text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-[#04793d] text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5 self-end lg:self-auto">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span>Sort by:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as SortOption);
                  setPage(1);
                }}
                aria-label="Sort transactions"
                className="appearance-none h-9 pl-3 pr-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
                <option value="AMOUNT_DESC">Highest Amount</option>
                <option value="AMOUNT_ASC">Lowest Amount</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#E6F7EE] text-[#04793d] dark:bg-emerald-950/70 dark:text-emerald-400'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#E6F7EE] text-[#04793d] dark:bg-emerald-950/70 dark:text-emerald-400'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Ledger Area */}
        <div className="xl:col-span-9 space-y-4">
          {/* Search Bar */}
          <div className="relative max-w-xl">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by tenant, landlord, property, or transaction ID..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition"
            />
          </div>

          {/* Table / Grid Card */}
          <div className="rounded-[22px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
                ))}
              </div>
            ) : paginatedEntries.length === 0 ? (
              <div className="py-16 px-6 text-center">
                <CreditCard className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  No financial transactions found
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Adjust your category tab, date range, or search query to view records.
                </p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                      <th className="py-3.5 px-4 whitespace-nowrap">Date &amp; Time</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">Transaction ID</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">Type</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">Party</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">Property</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">Amount</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">Status</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">Payment Method</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
                    {paginatedEntries.map((entry) => {
                      const dt = formatDateParts(entry.createdAt);
                      const statusCfg = STATUS_STYLE_MAP[entry.status];
                      return (
                        <tr
                          key={entry.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-semibold text-zinc-800 dark:text-zinc-100">{dt.date}</div>
                            <div className="text-[11px] text-zinc-400">{dt.time}</div>
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <Link
                              href={entry.detailHref}
                              className="font-mono font-semibold text-zinc-700 dark:text-zinc-200 hover:text-emerald-600 transition"
                            >
                              {entry.reference}
                            </Link>
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${TYPE_BADGE_MAP[entry.typeLabel]}`}
                            >
                              {entry.typeLabel}
                            </span>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2.5 min-w-[160px]">
                              {entry.partyAvatar ? (
                                <img
                                  src={getImageUrl(entry.partyAvatar)}
                                  alt={entry.partyName}
                                  className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#EAF7EE] dark:bg-emerald-950/70 text-[#04793d] dark:text-emerald-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                                  {getInitials(entry.partyName)}
                                </div>
                              )}
                              <div className="min-w-0">
                                {entry.partyHref ? (
                                  <Link
                                    href={entry.partyHref}
                                    className="font-bold text-zinc-900 dark:text-white hover:text-emerald-600 transition block truncate max-w-[140px]"
                                  >
                                    {entry.partyName}
                                  </Link>
                                ) : (
                                  <div className="font-bold text-zinc-900 dark:text-white truncate max-w-[140px]">
                                    {entry.partyName}
                                  </div>
                                )}
                                <div className="text-[11px] text-zinc-400 truncate max-w-[140px]">
                                  {entry.partyEmail || '—'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2.5 min-w-[155px]">
                              {entry.propertyThumbnail ? (
                                <img
                                  src={getImageUrl(entry.propertyThumbnail)}
                                  alt={entry.propertyTitle}
                                  className="w-9 h-7 rounded-md object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                                />
                              ) : (
                                <div className="w-9 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                  <Building2 className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <span className="font-semibold text-zinc-700 dark:text-zinc-200 truncate max-w-[130px]">
                                {entry.propertyTitle}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap font-bold text-zinc-900 dark:text-white">
                            GH₵ {entry.amount.toLocaleString()}
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusCfg.pill}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                              {statusCfg.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 font-medium">
                              {entry.paymentMethod === 'Mobile Money' ? (
                                <span className="w-5 h-5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                                  <Smartphone className="w-3 h-3" />
                                </span>
                              ) : entry.paymentMethod === 'Bank Transfer' ? (
                                <span className="w-5 h-5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                                  <Landmark className="w-3 h-3" />
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
                                  <CreditCard className="w-3 h-3" />
                                </span>
                              )}
                              <span>{entry.paymentMethod}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1.5 relative">
                              <Link
                                href={entry.detailHref}
                                title="View Details"
                                className="w-7 h-7 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-emerald-600 hover:border-emerald-300 transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionId(openActionId === entry.id ? null : entry.id);
                                }}
                                aria-label="More actions"
                                className="w-7 h-7 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition cursor-pointer"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>

                              {openActionId === entry.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg py-1.5 text-left"
                                >
                                  <Link
                                    href={entry.detailHref}
                                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    View Full Docket
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      copyReference(entry.reference);
                                      setOpenActionId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy Transaction ID
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {paginatedEntries.map((entry) => {
                  const dt = formatDateParts(entry.createdAt);
                  const statusCfg = STATUS_STYLE_MAP[entry.status];
                  return (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 flex flex-col justify-between gap-3 hover:border-emerald-300 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-100">
                            {entry.reference}
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            {dt.date} • {dt.time}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusCfg.pill}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                            {entry.partyName}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate">{entry.propertyTitle}</div>
                        </div>
                        <div className="text-sm font-black text-zinc-900 dark:text-white shrink-0">
                          GH₵ {entry.amount.toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${TYPE_BADGE_MAP[entry.typeLabel]}`}
                        >
                          {entry.typeLabel}
                        </span>
                        <Link
                          href={entry.detailHref}
                          className="text-xs font-bold text-[#04793d] hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Footer */}
            <div className="px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Showing {showingStart}–{showingEnd} of {filteredEntries.length} transactions
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                  className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {paginationItems.map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`el-${idx}`} className="px-1.5 text-xs text-zinc-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                        item === safePage
                          ? 'bg-[#04793d] text-white shadow-xs'
                          : 'border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                  className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="xl:col-span-3 space-y-4">
          {/* Transaction Insights Dark Emerald Card */}
          <div className="rounded-[22px] bg-gradient-to-b from-[#064e2b] to-[#022c18] text-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-bold">
              <BarChart2 className="w-4 h-4 text-emerald-300" />
              <span>Transaction Insights</span>
            </div>

            <div className="flex flex-col items-center justify-center my-5">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                  <circle
                    cx="50"
                    cy="50"
                    r={ringRadius}
                    fill="none"
                    stroke="rgba(255,255,255,0.14)"
                    strokeWidth="9"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={ringRadius}
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-black tracking-tight">
                    {counts.kpiStats.successRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="text-sm font-bold mt-2">Success Rate</div>
              <div className="text-xs font-semibold text-emerald-300 mt-0.5">↑ +0.2%</div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-white/10 text-xs">
              {breakdownRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-50/90">
                    <span className={`w-2 h-2 rounded-full ${row.dot}`} />
                    <span>{row.label}</span>
                  </div>
                  <span className="font-bold text-white">{row.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Need Help? Card */}
          <div className="rounded-[22px] bg-[#E9F8EF] dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
              <Headphones className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
              <span>Need Help?</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1.5 leading-relaxed">
              Our support team is ready to assist you.
            </p>
            <Link
              href="/admin/tickets"
              className="mt-4 inline-flex items-center justify-center gap-2 w-full h-9 rounded-full bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-[#04793d] dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-zinc-800 transition shadow-2xs"
            >
              <span>Contact Support</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
