'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Headphones,
  Calendar,
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  List,
  LayoutGrid,
  Eye,
  MoreHorizontal,
  Zap,
  FilePlus2,
  Ticket as TicketIcon,
  Download,
  Settings,
  ExternalLink,
  Copy,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import TicketKpiCards from '@/components/admin/TicketKpiCards';

type TicketTab = 'ALL' | 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'OVERDUE';
type DateRangeOption = '7D' | '30D' | '90D' | 'ALL';
type SortOption = 'NEWEST' | 'OLDEST' | 'PRIORITY';

const PAGE_SIZE = 5;

const detectCategory = (title = '', desc = ''): 'Maintenance' | 'Rent & Billing' | 'Access & Security' | 'Other' => {
  const text = `${title} ${desc}`.toLowerCase();
  if (
    text.includes('rent') ||
    text.includes('receipt') ||
    text.includes('billing') ||
    text.includes('payment') ||
    text.includes('invoice') ||
    text.includes('refund')
  ) {
    return 'Rent & Billing';
  }
  if (
    text.includes('door') ||
    text.includes('lock') ||
    text.includes('key') ||
    text.includes('gate') ||
    text.includes('security') ||
    text.includes('access') ||
    text.includes('card')
  ) {
    return 'Access & Security';
  }
  if (
    text.includes('leak') ||
    text.includes('water') ||
    text.includes('electric') ||
    text.includes('power') ||
    text.includes('plumb') ||
    text.includes('ac') ||
    text.includes('pipe') ||
    text.includes('internet') ||
    text.includes('wifi') ||
    text.includes('repair')
  ) {
    return 'Maintenance';
  }
  return 'Other';
};

const isOverdueTicket = (t: any): boolean => {
  const rawStatus = String(t.status || '').toUpperCase();
  if (rawStatus === 'RESOLVED' || rawStatus === 'CLOSED') return false;
  if (rawStatus === 'OVERDUE') return true;
  const ageDays = (Date.now() - new Date(t.createdAt).getTime()) / 86400000;
  return (String(t.priority || '').toUpperCase() === 'URGENT' || ageDays > 7) && rawStatus !== 'RESOLVED';
};

const normalizeStatus = (t: any): Exclude<TicketTab, 'ALL'> => {
  const raw = String(t.status || 'PENDING').toUpperCase();
  if (raw === 'RESOLVED' || raw === 'CLOSED') return 'RESOLVED';
  if (isOverdueTicket(t)) return 'OVERDUE';
  if (raw === 'IN_PROGRESS') return 'IN_PROGRESS';
  return 'NEW';
};

const normalizePriority = (raw?: string): 'High' | 'Medium' | 'Low' => {
  const p = String(raw || '').toUpperCase();
  if (p === 'URGENT' || p === 'HIGH') return 'High';
  if (p === 'MEDIUM' || p === 'NORMAL') return 'Medium';
  return 'Low';
};

const STATUS_BADGE_MAP: Record<Exclude<TicketTab, 'ALL'>, { pill: string; dot: string; label: string }> = {
  NEW: {
    pill: 'bg-[#E6F7EE] text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    label: 'New',
  },
  IN_PROGRESS: {
    pill: 'bg-[#E8F2FF] text-[#1D4ED8] dark:bg-blue-950/60 dark:text-blue-300',
    dot: 'bg-blue-500',
    label: 'In Progress',
  },
  RESOLVED: {
    pill: 'bg-[#E6F7EE] text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    label: 'Resolved',
  },
  OVERDUE: {
    pill: 'bg-[#FEF3E8] text-[#C2410C] dark:bg-amber-950/60 dark:text-amber-300',
    dot: 'bg-amber-500',
    label: 'Overdue',
  },
};

const PRIORITY_STYLE_MAP: Record<'High' | 'Medium' | 'Low', { dot: string; text: string }> = {
  High: { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
  Medium: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  Low: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
};

const getInitials = (firstName?: string, lastName?: string): string => {
  const f = (firstName || '').trim().charAt(0);
  const l = (lastName || '').trim().charAt(0);
  return `${f}${l}`.toUpperCase() || 'T';
};

const formatDateShort = (iso?: string): string => {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'N/A';
  const datePart = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${datePart}, ${timePart}`;
};

export default function AdminTicketsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TicketTab>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeOption>('30D');
  const [sortBy, setSortBy] = useState<SortOption>('NEWEST');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const { data: rawTickets = [], isLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: async () => {
      const res = await api.get('/admin/tickets');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await api.put(`/tickets/${id}/status`, { status });
    },
    onSuccess: () => {
      toast.success('Ticket status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update ticket status');
    },
  });

  const dateFilteredTickets = useMemo(() => {
    if (dateRange === 'ALL') return rawTickets;
    const days = dateRange === '7D' ? 7 : dateRange === '30D' ? 30 : 90;
    const cutoff = Date.now() - days * 86400000;
    return (rawTickets as any[]).filter((t) => {
      const ts = new Date(t.createdAt).getTime();
      return !Number.isNaN(ts) && ts >= cutoff;
    });
  }, [rawTickets, dateRange]);

  const counts = useMemo(() => {
    let newCount = 0;
    let inProgress = 0;
    let resolved = 0;
    let overdue = 0;

    const catMap = {
      Maintenance: 0,
      'Rent & Billing': 0,
      'Access & Security': 0,
      Other: 0,
    };

    dateFilteredTickets.forEach((t: any) => {
      const st = normalizeStatus(t);
      if (st === 'NEW') newCount += 1;
      else if (st === 'IN_PROGRESS') inProgress += 1;
      else if (st === 'RESOLVED') resolved += 1;
      else if (st === 'OVERDUE') overdue += 1;

      const cat = detectCategory(t.title, t.description);
      catMap[cat] += 1;
    });

    const total = dateFilteredTickets.length;
    const slaPct = total > 0 ? Math.max(0, Math.min(100, Math.round(((total - overdue) / total) * 100))) : 0;

    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

    return {
      total,
      newCount,
      inProgress,
      resolved,
      overdue,
      slaPct,
      categories: [
        { label: 'Maintenance', count: catMap.Maintenance, pct: total > 0 ? pct(catMap.Maintenance) : 0, color: '#047857', dot: 'bg-[#047857]' },
        { label: 'Rent & Billing', count: catMap['Rent & Billing'], pct: total > 0 ? pct(catMap['Rent & Billing']) : 0, color: '#2563EB', dot: 'bg-[#2563EB]' },
        { label: 'Access & Security', count: catMap['Access & Security'], pct: total > 0 ? pct(catMap['Access & Security']) : 0, color: '#F59E0B', dot: 'bg-[#F59E0B]' },
        { label: 'Other', count: catMap.Other, pct: total > 0 ? Math.max(0, 100 - pct(catMap.Maintenance) - pct(catMap['Rent & Billing']) - pct(catMap['Access & Security'])) : 0, color: '#9333EA', dot: 'bg-[#9333EA]' },
      ],
    };
  }, [dateFilteredTickets]);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = dateFilteredTickets.filter((t: any) => {
      const st = normalizeStatus(t);
      if (activeTab !== 'ALL' && st !== activeTab) return false;
      if (q) {
        const ref = `TKT-${String(t.id).slice(0, 8)}`.toLowerCase();
        const tenantName = `${t.tenant?.firstName || ''} ${t.tenant?.lastName || ''}`.toLowerCase();
        const prop = (t.property?.title || '').toLowerCase();
        const title = (t.title || '').toLowerCase();
        if (!ref.includes(q) && !tenantName.includes(q) && !prop.includes(q) && !title.includes(q)) {
          return false;
        }
      }
      return true;
    });

    return [...list].sort((a: any, b: any) => {
      if (sortBy === 'OLDEST') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === 'PRIORITY') {
        const rank = (p?: string) => (p === 'URGENT' ? 3 : p === 'HIGH' ? 2 : p === 'MEDIUM' ? 1 : 0);
        return rank(b.priority) - rank(a.priority);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [dateFilteredTickets, activeTab, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedTickets = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredTickets.slice(start, start + PAGE_SIZE);
  }, [filteredTickets, safePage]);

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

  const exportTicketsCSV = () => {
    if (!filteredTickets.length) {
      toast.error('No tickets to export');
      return;
    }
    const headers = ['Ticket #', 'Issue Type', 'Reported By', 'Property', 'Priority', 'Status', 'Date'];
    const rows = filteredTickets.map((t: any) => [
      `TKT-${String(t.id).slice(0, 8).toUpperCase()}`,
      `"${String(t.title || '').replace(/"/g, '""')}"`,
      `"${t.tenant?.firstName || ''} ${t.tenant?.lastName || ''}"`,
      `"${String(t.property?.title || '').replace(/"/g, '""')}"`,
      normalizePriority(t.priority),
      STATUS_BADGE_MAP[normalizeStatus(t)].label,
      new Date(t.createdAt).toISOString(),
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `AkwaabaHomes_Tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredTickets.length} tickets`);
  };

  // Donut SVG math
  const r = 40;
  const circ = 2 * Math.PI * r;
  let runningOffset = 0;

  const slaRadius = 42;
  const slaCirc = 2 * Math.PI * slaRadius;
  const slaOffset = slaCirc * (1 - counts.slaPct / 100);

  const showingStart = filteredTickets.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const showingEnd = Math.min(safePage * PAGE_SIZE, filteredTickets.length);

  const tabs: { key: TicketTab; label: string; count: number }[] = [
    { key: 'ALL', label: 'All Tickets', count: counts.total },
    { key: 'NEW', label: 'New', count: counts.newCount },
    { key: 'IN_PROGRESS', label: 'In Progress', count: counts.inProgress },
    { key: 'RESOLVED', label: 'Resolved', count: counts.resolved },
    { key: 'OVERDUE', label: 'Overdue', count: counts.overdue },
  ];

  const barGroups = useMemo(() => {
    const now = Date.now();
    const spanMs =
      dateRange === '7D'
        ? 7 * 86400000
        : dateRange === '30D'
        ? 30 * 86400000
        : dateRange === '90D'
        ? 90 * 86400000
        : 180 * 86400000;
    const startMs = now - spanMs;
    const bucketMs = spanMs / 6;

    const buckets = Array.from({ length: 6 }, (_, i) => {
      const bucketEnd = new Date(startMs + (i + 1) * bucketMs);
      return {
        label: bucketEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        newCount: 0,
        inProgressCount: 0,
        resolvedCount: 0,
      };
    });

    (dateFilteredTickets as any[]).forEach((t) => {
      const ts = new Date(t.createdAt).getTime();
      if (Number.isNaN(ts)) return;
      const idx = Math.max(0, Math.min(5, Math.floor((ts - startMs) / bucketMs)));
      const st = normalizeStatus(t);
      if (st === 'IN_PROGRESS') buckets[idx].inProgressCount += 1;
      else if (st === 'RESOLVED') buckets[idx].resolvedCount += 1;
      else buckets[idx].newCount += 1;
    });

    const maxVal = Math.max(
      1,
      ...buckets.flatMap((b) => [b.newCount, b.inProgressCount, b.resolvedCount]),
    );

    return buckets.map((b) => ({
      label: b.label,
      n: b.newCount > 0 ? Math.max(8, Math.round((b.newCount / maxVal) * 100)) : 0,
      p: b.inProgressCount > 0 ? Math.max(8, Math.round((b.inProgressCount / maxVal) * 100)) : 0,
      res: b.resolvedCount > 0 ? Math.max(8, Math.round((b.resolvedCount / maxVal) * 100)) : 0,
    }));
  }, [dateFilteredTickets, dateRange]);

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
          <div className="w-14 h-14 rounded-full bg-[#E1F5EA] dark:bg-emerald-950/70 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center text-[#04793d] dark:text-emerald-400 shrink-0 shadow-xs">
            <Headphones className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight">
              Maintenance &amp; Support Tickets
            </h1>
            <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-300 mt-1 max-w-xl leading-relaxed">
              Manage and resolve support tickets from tenants, landlords, and residents.
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
              aria-label="Filter ticket date range"
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
            onClick={() => setShowInfoModal(true)}
            className="h-10 px-4 rounded-xl bg-[#04793d] hover:bg-[#036131] text-white text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <span>New Ticket</span>
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 4-Card KPI Strip */}
      <TicketKpiCards
        stats={{
          total: counts.total,
          inProgress: counts.inProgress,
          resolved: counts.resolved,
          overdue: counts.overdue,
        }}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setPage(1);
        }}
      />

      {/* Main 2-Column Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Main Area */}
        <div className="xl:col-span-9 space-y-5">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Tickets Overview Bar Chart */}
            <div className="lg:col-span-7 rounded-[22px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Tickets Overview</h2>
                <div className="flex items-center gap-3 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#047857]" />
                    New
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                    In Progress
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#34D399]" />
                    Resolved
                  </span>
                </div>
              </div>

              <div className="h-44 flex items-end justify-between gap-3 pt-4 px-2 border-b border-zinc-100 dark:border-zinc-800">
                {barGroups.map((grp) => (
                  <div key={grp.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="flex items-end gap-1.5 w-full justify-center h-32">
                      <div
                        className="w-2.5 sm:w-3 rounded-t-md bg-[#047857] transition-all"
                        style={{ height: `${grp.n}%` }}
                      />
                      <div
                        className="w-2.5 sm:w-3 rounded-t-md bg-[#2563EB] transition-all"
                        style={{ height: `${grp.p}%` }}
                      />
                      <div
                        className="w-2.5 sm:w-3 rounded-t-md bg-[#34D399] transition-all"
                        style={{ height: `${grp.res}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-zinc-400 pb-1">{grp.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Category Donut Chart */}
            <div className="lg:col-span-5 rounded-[22px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">By Category</h2>
              <div className="flex items-center justify-between gap-4">
                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                    {counts.categories.map((cat) => {
                      const dash = (cat.pct / 100) * circ;
                      const el = (
                        <circle
                          key={cat.label}
                          cx="50"
                          cy="50"
                          r={r}
                          fill="none"
                          stroke={cat.color}
                          strokeWidth="12"
                          strokeDasharray={`${dash} ${circ}`}
                          strokeDashoffset={-runningOffset}
                        />
                      );
                      runningOffset += dash;
                      return el;
                    })}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-zinc-900 dark:text-white leading-none">
                      {counts.total}
                    </span>
                    <span className="text-[11px] font-medium text-zinc-400 mt-0.5">Total</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2.5 text-xs">
                  {counts.categories.map((cat) => (
                    <div key={cat.label} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-300 truncate">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cat.dot}`} />
                        <span className="truncate">{cat.label}</span>
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-white shrink-0">{cat.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Filter Pills + Sort + View Mode */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.key);
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
                    aria-label="Sort tickets"
                    className="appearance-none h-9 pl-3 pr-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <option value="NEWEST">Newest First</option>
                    <option value="OLDEST">Oldest First</option>
                    <option value="PRIORITY">Highest Priority</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-0.5">
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
              </div>
            </div>
          </div>

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
              placeholder="Search tickets by reference, tenant, or issue..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-500 transition"
            />
          </div>

          {/* Tickets Table / Grid Card */}
          <div className="rounded-[22px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
                ))}
              </div>
            ) : paginatedTickets.length === 0 ? (
              <div className="py-16 px-6 text-center">
                <TicketIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No support tickets found</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Adjust your filter tab, date range, or search query.
                </p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                      <th className="py-3.5 px-4 whitespace-nowrap">Ticket #</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">Issue Type</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">Reported By</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">Property</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">Priority</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">Status</th>
                      <th className="py-3.5 px-3 whitespace-nowrap">Date</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
                    {paginatedTickets.map((t: any) => {
                      const ticketCode = `TKT-${String(t.id).slice(0, 8).toUpperCase()}`;
                      const normStatus = normalizeStatus(t);
                      const statusCfg = STATUS_BADGE_MAP[normStatus];
                      const priority = normalizePriority(t.priority);
                      const priorityCfg = PRIORITY_STYLE_MAP[priority];
                      const reporterName =
                        `${t.tenant?.firstName || ''} ${t.tenant?.lastName || ''}`.trim() || 'Tenant';

                      return (
                        <tr
                          key={t.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <Link
                              href={`/admin/tickets/${t.id}`}
                              className="font-mono font-bold text-zinc-800 dark:text-zinc-100 hover:text-emerald-600 transition"
                            >
                              {ticketCode}
                            </Link>
                          </td>

                          <td className="py-3.5 px-3 font-semibold text-zinc-800 dark:text-zinc-100 max-w-[170px] truncate">
                            {t.title || detectCategory(t.title, t.description)}
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2.5 min-w-[140px]">
                              {t.tenant?.avatarUrl ? (
                                <img
                                  src={getImageUrl(t.tenant.avatarUrl)}
                                  alt={reporterName}
                                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-[#EAF7EE] dark:bg-emerald-950/70 text-[#04793d] dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {getInitials(t.tenant?.firstName, t.tenant?.lastName)}
                                </div>
                              )}
                              <span className="font-semibold text-zinc-800 dark:text-zinc-100 truncate max-w-[125px]">
                                {reporterName}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 text-zinc-600 dark:text-zinc-300 max-w-[160px] truncate">
                            {t.property?.title || 'Residential Unit'}
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 font-bold ${priorityCfg.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                              {priority}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusCfg.pill}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                              {statusCfg.label}
                            </span>
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                            {formatDateShort(t.createdAt)}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1.5 relative">
                              <Link
                                href={`/admin/tickets/${t.id}`}
                                title="View Ticket"
                                className="w-7 h-7 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-emerald-600 hover:border-emerald-300 transition"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === t.id ? null : t.id);
                                }}
                                aria-label="Ticket actions"
                                className="w-7 h-7 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition cursor-pointer"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>

                              {openMenuId === t.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg py-1.5 text-left"
                                >
                                  <Link
                                    href={`/admin/tickets/${t.id}`}
                                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Open Ticket Thread
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateStatusMutation.mutate({ id: t.id, status: 'IN_PROGRESS' });
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                                  >
                                    <Clock className="w-3.5 h-3.5" />
                                    Mark In Progress
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateStatusMutation.mutate({ id: t.id, status: 'RESOLVED' });
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Mark Resolved
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(ticketCode);
                                      toast.success('Ticket # copied');
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy Ticket #
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
                {paginatedTickets.map((t: any) => {
                  const ticketCode = `TKT-${String(t.id).slice(0, 8).toUpperCase()}`;
                  const normStatus = normalizeStatus(t);
                  const statusCfg = STATUS_BADGE_MAP[normStatus];
                  const priority = normalizePriority(t.priority);
                  const priorityCfg = PRIORITY_STYLE_MAP[priority];
                  const reporterName =
                    `${t.tenant?.firstName || ''} ${t.tenant?.lastName || ''}`.trim() || 'Tenant';

                  return (
                    <div
                      key={t.id}
                      className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 space-y-3 hover:border-emerald-300 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-100">
                            {ticketCode}
                          </div>
                          <div className="text-xs font-bold text-zinc-900 dark:text-white mt-0.5">
                            {t.title}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusCfg.pill}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>{reporterName} • {t.property?.title || 'Unit'}</span>
                        <span className={`font-bold ${priorityCfg.text}`}>{priority}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                        <span className="text-zinc-400">{formatDateShort(t.createdAt)}</span>
                        <Link href={`/admin/tickets/${t.id}`} className="font-bold text-[#04793d] hover:underline">
                          View Ticket →
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
                Showing {showingStart}–{showingEnd} of {filteredTickets.length} tickets
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

        {/* Right SLA & Quick Actions Sidebar */}
        <aside className="xl:col-span-3 space-y-4">
          {/* Support SLA Card */}
          <div className="rounded-[22px] bg-[#EFFAF3] dark:bg-emerald-950/35 border border-emerald-200/70 dark:border-emerald-900/50 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
              <Zap className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
              <span>Support SLA</span>
            </div>

            <div className="flex flex-col items-center justify-center my-5">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                  <circle
                    cx="50"
                    cy="50"
                    r={slaRadius}
                    fill="none"
                    stroke="rgba(4,121,61,0.14)"
                    strokeWidth="9"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={slaRadius}
                    fill="none"
                    stroke="#04793d"
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={slaCirc}
                    strokeDashoffset={slaOffset}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-zinc-900 dark:text-white leading-none">
                    {counts.slaPct}%
                  </span>
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-1">
                    {counts.slaPct >= 90 ? 'On Track' : 'Needs Review'}
                  </span>
                </div>
              </div>

              <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mt-2">
                Target: <strong className="text-zinc-900 dark:text-white">90%</strong>{' '}
                <span className="text-[#04793d] dark:text-emerald-400 font-bold ml-1">
                  {counts.resolved} of {counts.total} resolved
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="rounded-[22px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-4 space-y-2 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
            <div className="text-sm font-bold text-zinc-900 dark:text-white px-2 pb-1">
              Quick Actions
            </div>

            <button
              type="button"
              onClick={() => setShowInfoModal(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/70 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition cursor-pointer text-left"
            >
              <span className="w-7 h-7 rounded-lg bg-[#E6F7EE] dark:bg-emerald-950/60 text-[#04793d] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <FilePlus2 className="w-3.5 h-3.5" />
              </span>
              <span>Create New Ticket</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('ALL');
                setSearch('');
                setDateRange('ALL');
                setPage(1);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/70 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition cursor-pointer text-left"
            >
              <span className="w-7 h-7 rounded-lg bg-[#E6F7EE] dark:bg-emerald-950/60 text-[#04793d] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <TicketIcon className="w-3.5 h-3.5" />
              </span>
              <span>View All Tickets</span>
            </button>

            <button
              type="button"
              onClick={exportTicketsCSV}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/70 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition cursor-pointer text-left"
            >
              <span className="w-7 h-7 rounded-lg bg-[#E6F7EE] dark:bg-emerald-950/60 text-[#04793d] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Download className="w-3.5 h-3.5" />
              </span>
              <span>Export Tickets</span>
            </button>

            <Link
              href="/admin/config"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/70 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition"
            >
              <span className="w-7 h-7 rounded-lg bg-[#E6F7EE] dark:bg-emerald-950/60 text-[#04793d] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Settings className="w-3.5 h-3.5" />
              </span>
              <span>Settings</span>
            </Link>
          </div>
        </aside>
      </div>

      {/* New Ticket Guidance Modal */}
      {showInfoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                Ticket Intake &amp; Escalation
              </h3>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Maintenance and support tickets are filed directly by verified tenants from their resident portal or escalated from active tenancy disputes.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Link
                href="/admin/disputes"
                className="h-9 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 inline-flex items-center"
              >
                Review Disputes
              </Link>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="h-9 px-4 rounded-xl bg-[#04793d] text-white text-xs font-bold cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
