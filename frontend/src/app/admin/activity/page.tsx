'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useSocket } from '@/providers/SocketProvider';
import {
  Activity,
  Users,
  Calendar,
  Zap,
  ShieldCheck,
  RefreshCw,
  BarChart2,
  ListChecks,
  Download,
  Eye,
  MoreHorizontal,
  Building2,
  CreditCard,
  Wrench,
  Scale,
  Star,
  CalendarCheck,
  Search,
  X,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Loader2,
  UserCheck,
  Radio,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface TelemetryActor {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
}

interface TelemetryEntity {
  type: string;
  id?: string;
  title?: string;
  location?: string;
  financialAmount?: string;
}

interface TelemetryEvent {
  id: string;
  type: 'BOOKING' | 'USER' | 'PROPERTY' | 'PAYMENT' | 'MAINTENANCE' | 'SECURITY' | 'REVIEW';
  severity: 'INFO' | 'NOTICE' | 'COMPLIANCE' | 'CRITICAL';
  title: string;
  message: string;
  actor?: TelemetryActor;
  entity?: TelemetryEntity;
  status: string;
  createdAt: string;
}

type TrendWindow = '1h' | '24h' | '7d' | '30d' | 'all';

function formatTimeAgo(dateInput: string): string {
  const diffMs = Date.now() - new Date(dateInput).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getModuleVisual(type: string) {
  switch (type) {
    case 'PROPERTY':
      return {
        label: 'Properties',
        icon: Building2,
        pillClass: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200/70 dark:border-blue-800/60',
      };
    case 'BOOKING':
      return {
        label: 'Bookings',
        icon: CalendarCheck,
        pillClass: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200/70 dark:border-teal-800/60',
      };
    case 'USER':
      return {
        label: 'Users & Auth',
        icon: UserCheck,
        pillClass: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200/70 dark:border-purple-800/60',
      };
    case 'PAYMENT':
      return {
        label: 'Transactions',
        icon: CreditCard,
        pillClass: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60',
      };
    case 'SECURITY':
      return {
        label: 'Security',
        icon: Scale,
        pillClass: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60',
      };
    case 'MAINTENANCE':
      return {
        label: 'Maintenance',
        icon: Wrench,
        pillClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60',
      };
    default:
      return {
        label: 'Reviews',
        icon: Star,
        pillClass: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/70 dark:border-indigo-800/60',
      };
  }
}

function getStatusPill(event: TelemetryEvent) {
  if (event.severity === 'CRITICAL' || event.status === 'FAILED' || event.status === 'REJECTED') {
    return {
      label: event.status === 'FAILED' ? 'Failed' : 'Warning',
      dot: 'bg-amber-500',
      classes: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
    };
  }
  if (event.severity === 'NOTICE') {
    return {
      label: 'Notice',
      dot: 'bg-blue-500',
      classes: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300',
    };
  }
  return {
    label: 'Success',
    dot: 'bg-[#16A34A]',
    classes: 'bg-[#E7F8ED] dark:bg-emerald-950/40 text-[#15803D] dark:text-emerald-400',
  };
}

export default function AdminActivityPage() {
  const { isConnected } = useSocket();
  const tableRef = useRef<HTMLDivElement>(null);

  const [trendWindow, setTrendWindow] = useState<TrendWindow>('24h');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<TelemetryEvent | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [nowTimestamp, setNowTimestamp] = useState<number>(() => Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Activity Telemetry
  const {
    data: activity,
    isLoading,
    dataUpdatedAt,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async () => {
      const res = await api.get('/admin/activity');
      return res.data as TelemetryEvent[];
    },
    refetchInterval: 12000,
  });

  // Fetch Admin Stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    },
    staleTime: 20000,
  });

  // Fetch Live Active Users from Socket / Health
  const { data: liveOnlineCount } = useQuery<number>({
    queryKey: ['active-users-count'],
    queryFn: async () => {
      try {
        const res = await api.get('/health');
        return Number(res.data?.activeUsersOnline || 0);
      } catch {
        return 0;
      }
    },
    refetchInterval: 15000,
  });

  const eventList: TelemetryEvent[] = useMemo(() => {
    return Array.isArray(activity) ? activity : [];
  }, [activity]);

  // ── KPI Metrics (100% Real Data) ──
  const kpiMetrics = useMemo(() => {
    const activeUsers = liveOnlineCount ?? stats?.totalUsers ?? 0;
    const totalActions = eventList.length;
    const systemEvents = eventList.filter((e) =>
      ['BOOKING', 'PROPERTY', 'PAYMENT', 'MAINTENANCE'].includes(e.type)
    ).length;
    const securityEvents = eventList.filter(
      (e) => e.type === 'SECURITY' || e.severity === 'CRITICAL'
    ).length;

    return { activeUsers, totalActions, systemEvents, securityEvents };
  }, [eventList, liveOnlineCount, stats]);

  // ── Module Breakdown for Donut Chart ──
  const moduleBreakdown = useMemo(() => {
    const counts = { properties: 0, users: 0, transactions: 0, others: 0 };
    for (const ev of eventList) {
      if (ev.type === 'PROPERTY' || ev.type === 'BOOKING') counts.properties++;
      else if (ev.type === 'USER') counts.users++;
      else if (ev.type === 'PAYMENT') counts.transactions++;
      else counts.others++;
    }
    const total = Math.max(1, eventList.length);
    const pct = (n: number) => (eventList.length === 0 ? 0 : Math.round((n / total) * 1000) / 10);

    return {
      total: eventList.length,
      items: [
        { key: 'properties', label: 'Properties', count: counts.properties, pct: pct(counts.properties), color: '#16A34A' },
        { key: 'users', label: 'Users', count: counts.users, pct: pct(counts.users), color: '#3B82F6' },
        { key: 'transactions', label: 'Transactions', count: counts.transactions, pct: pct(counts.transactions), color: '#F59E0B' },
        { key: 'others', label: 'Others', count: counts.others, pct: pct(counts.others), color: '#9333EA' },
      ],
    };
  }, [eventList]);

  const donutSegments = useMemo(() => {
    const r = 46;
    const circumference = 2 * Math.PI * r;
    const segments: Array<(typeof moduleBreakdown.items)[number] & { dashArray: string; dashOffset: number }> = [];
    let accumulated = 0;
    for (const item of moduleBreakdown.items) {
      const fraction = moduleBreakdown.total > 0 ? item.count / moduleBreakdown.total : 0;
      const dashLength = fraction * circumference;
      const offset = -accumulated;
      accumulated += dashLength;
      segments.push({
        ...item,
        dashArray: `${dashLength} ${circumference}`,
        dashOffset: offset,
      });
    }
    return segments;
  }, [moduleBreakdown]);

  // ── Activity Trends Buckets for SVG Chart ──
  const trendChart = useMemo(() => {
    const cutoffMs =
      trendWindow === '1h'
        ? 3600_000
        : trendWindow === '24h'
        ? 86400_000
        : trendWindow === '7d'
        ? 7 * 86400_000
        : trendWindow === '30d'
        ? 30 * 86400_000
        : Infinity;

    const scoped = eventList.filter(
      (e) => nowTimestamp - new Date(e.createdAt).getTime() <= cutoffMs
    );

    if (scoped.length === 0) return null;

    const buckets = new Map<string, { label: string; userActions: number; systemEvents: number; securityEvents: number }>();
    const sorted = [...scoped].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const ev of sorted) {
      const d = new Date(ev.createdAt);
      const key =
        trendWindow === '1h' || trendWindow === '24h'
          ? `${d.getHours()}:00`
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const entry = buckets.get(key) || {
        label: key,
        userActions: 0,
        systemEvents: 0,
        securityEvents: 0,
      };
      if (ev.type === 'USER' || ev.type === 'REVIEW') entry.userActions++;
      else if (ev.type === 'SECURITY' || ev.severity === 'CRITICAL') entry.securityEvents++;
      else entry.systemEvents++;
      buckets.set(key, entry);
    }

    const ptsList = Array.from(buckets.values()).slice(-12);
    const width = 480;
    const height = 135;
    const padLeft = 34;
    const padRight = 15;
    const usableW = width - padLeft - padRight;
    const maxVal = Math.max(
      1,
      ...ptsList.map((b) => Math.max(b.userActions, b.systemEvents, b.securityEvents))
    );

    const buildSeries = (key: 'userActions' | 'systemEvents' | 'securityEvents') => {
      const pts = ptsList.map((b, i) => {
        const x =
          ptsList.length === 1
            ? padLeft + usableW / 2
            : padLeft + (i / (ptsList.length - 1)) * usableW;
        const y = height - (b[key] / maxVal) * (height - 22);
        return { x, y };
      });
      if (pts.length === 1) {
        return {
          line: `M${padLeft} ${pts[0].y} L${width - padRight} ${pts[0].y}`,
          area: `M${padLeft} ${pts[0].y} L${width - padRight} ${pts[0].y} L${width - padRight} ${height} L${padLeft} ${height} Z`,
          lastPt: { x: width - padRight, y: pts[0].y },
        };
      }
      const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
      const area = `${line} L${pts[pts.length - 1].x.toFixed(1)} ${height} L${pts[0].x.toFixed(1)} ${height} Z`;
      return { line, area, lastPt: pts[pts.length - 1] };
    };

    const latestBucket = ptsList[ptsList.length - 1];
    const latestTotal = latestBucket.userActions + latestBucket.systemEvents + latestBucket.securityEvents;

    return {
      maxVal,
      labels: ptsList.map((p) => p.label),
      userActions: buildSeries('userActions'),
      systemEvents: buildSeries('systemEvents'),
      securityEvents: buildSeries('securityEvents'),
      latestTotal,
      latestLabel: latestBucket.label,
    };
  }, [eventList, trendWindow, nowTimestamp]);

  // ── Filtered Activity Table Rows ──
  const filteredEvents = useMemo(() => {
    return eventList.filter((ev) => {
      if (categoryFilter !== 'ALL' && ev.type !== categoryFilter) return false;
      if (severityFilter !== 'ALL' && ev.severity !== severityFilter) return false;
      if (timeFilter === '24H' && nowTimestamp - new Date(ev.createdAt).getTime() > 86400_000) return false;
      if (timeFilter === '7D' && nowTimestamp - new Date(ev.createdAt).getTime() > 7 * 86400_000) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const hay = `${ev.title} ${ev.message} ${ev.actor?.name || ''} ${ev.actor?.email || ''} ${ev.entity?.title || ''} ${ev.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [eventList, categoryFilter, severityFilter, timeFilter, searchTerm, nowTimestamp]);

  const liveFeedFive = useMemo(() => eventList.slice(0, 5), [eventList]);

  const handleExportCsv = () => {
    if (filteredEvents.length === 0) {
      toast.error('No activity records to export');
      return;
    }
    const headers = ['Timestamp', 'User', 'Action', 'Module', 'Details', 'Target', 'Status'];
    const rows = filteredEvents.map((ev) => [
      new Date(ev.createdAt).toISOString(),
      ev.actor?.name || 'System',
      ev.title,
      getModuleVisual(ev.type).label,
      ev.message,
      ev.entity?.title || ev.entity?.location || 'Platform',
      getStatusPill(ev).label,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `akwaaba_platform_activity_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredEvents.length} telemetry events`);
  };

  const liveTimeStr = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Live';

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. TOP HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#F4FBF6] via-[#EDF8F1] to-[#E6F4EC] dark:from-[#121915] dark:via-[#141F19] dark:to-[#132119] border border-emerald-100/80 dark:border-emerald-900/40 px-6 py-7 sm:px-8 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#16A34A] text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                System Activity &amp; Platform Telemetry
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                Monitor real-time platform activities, user interactions, and system health.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="h-10 px-4 rounded-xl bg-white dark:bg-[#19221D] border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-2 shadow-2xs">
              <span
                className={clsx(
                  'w-2 h-2 rounded-full',
                  isConnected ? 'bg-[#16A34A] animate-pulse' : 'bg-amber-500'
                )}
              />
              <span>{isConnected ? `Live • ${liveTimeStr}` : `Polling • ${liveTimeStr}`}</span>
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="h-10 px-4 rounded-xl bg-white dark:bg-[#19221D] border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs disabled:opacity-60"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5 text-zinc-500', isRefetching && 'animate-spin')} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. FOUR KPI STAT CARDS WITH SPARKLINES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Users */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#E7F8ED] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Active Users
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {kpiMetrics.activeUsers.toLocaleString()}
              </span>
            </div>
          </div>
          <svg className="w-24 h-12 shrink-0 pointer-events-none opacity-80" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="actGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16A34A" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2 40 C20 35, 30 24, 48 26 C64 28, 76 14, 98 9 L98 45 L2 45 Z" fill="url(#actGreen)" />
            <path d="M2 40 C20 35, 30 24, 48 26 C64 28, 76 14, 98 9" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="94" cy="10" r="2.5" fill="#16A34A" />
          </svg>
        </div>

        {/* Card 2: Total Actions */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#E8F2FE] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Total Actions
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {kpiMetrics.totalActions.toLocaleString()}
              </span>
            </div>
          </div>
          <svg className="w-24 h-12 shrink-0 pointer-events-none opacity-80" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="actBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2 38 C22 33, 35 28, 52 21 C68 15, 78 19, 98 8 L98 45 L2 45 Z" fill="url(#actBlue)" />
            <path d="M2 38 C22 33, 35 28, 52 21 C68 15, 78 19, 98 8" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="94" cy="9" r="2.5" fill="#3B82F6" />
          </svg>
        </div>

        {/* Card 3: System Events */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#FEF3E6] dark:bg-amber-950/60 text-[#F97316] dark:text-amber-400 flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                System Events
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {kpiMetrics.systemEvents.toLocaleString()}
              </span>
            </div>
          </div>
          <svg className="w-24 h-12 shrink-0 pointer-events-none opacity-80" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="actOrange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F97316" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2 39 C22 34, 38 22, 54 24 C70 26, 82 12, 98 10 L98 45 L2 45 Z" fill="url(#actOrange)" />
            <path d="M2 39 C22 34, 38 22, 54 24 C70 26, 82 12, 98 10" stroke="#F97316" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="94" cy="11" r="2.5" fill="#F97316" />
          </svg>
        </div>

        {/* Card 4: Security Events */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#F3E8FF] dark:bg-purple-950/60 text-[#9333EA] dark:text-purple-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Security Events
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {kpiMetrics.securityEvents.toLocaleString()}
              </span>
            </div>
          </div>
          <svg className="w-24 h-12 shrink-0 pointer-events-none opacity-80" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="actPurple" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9333EA" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#9333EA" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2 40 C22 38, 36 28, 52 29 C68 30, 80 18, 98 12 L98 45 L2 45 Z" fill="url(#actPurple)" />
            <path d="M2 40 C22 38, 36 28, 52 29 C68 30, 80 18, 98 12" stroke="#9333EA" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="94" cy="13" r="2.5" fill="#9333EA" />
          </svg>
        </div>
      </div>

      {/* ── 3. MIDDLE 3-COLUMN BENTO GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Activity Trends Multi-Series Chart (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#16A34A]" />
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                Activity Trends
              </h2>
            </div>

            {/* Timeframe Switcher */}
            <div className="inline-flex items-center gap-1 bg-zinc-50 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-100 dark:border-zinc-800">
              {[
                { id: '1h', label: '1h' },
                { id: '24h', label: '24h' },
                { id: '7d', label: '7d' },
                { id: '30d', label: '30d' },
                { id: 'all', label: 'All' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTrendWindow(t.id as TrendWindow)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer',
                    trendWindow === t.id
                      ? 'bg-[#16A34A] text-white shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> User Actions
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> System Events
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Security Events
            </span>
          </div>

          <div className="relative w-full h-44">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 480 155" preserveAspectRatio="none">
              <defs>
                <linearGradient id="trendGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A34A" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="trendBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="trendAmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[15, 55, 95, 135].map((y, idx) => {
                const maxTick = trendChart ? Math.round(trendChart.maxVal * (1 - idx / 3)) : (3 - idx) * 10;
                return (
                  <g key={y}>
                    <text x="0" y={y + 3} className="fill-zinc-400 text-[10px] font-medium">
                      {maxTick}
                    </text>
                    <line
                      x1="34"
                      y1={y}
                      x2="470"
                      y2={y}
                      stroke="currentColor"
                      className="text-zinc-100 dark:text-zinc-800"
                      strokeWidth="1"
                    />
                  </g>
                );
              })}

              {!trendChart ? (
                <text x="250" y="80" textAnchor="middle" className="fill-zinc-400 text-[12px] font-medium">
                  No telemetry events in selected window
                </text>
              ) : (
                <>
                  <path d={trendChart.userActions.area} fill="url(#trendGreen)" />
                  <path d={trendChart.systemEvents.area} fill="url(#trendBlue)" />
                  <path d={trendChart.securityEvents.area} fill="url(#trendAmber)" />

                  <path d={trendChart.userActions.line} fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" />
                  <path d={trendChart.systemEvents.line} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                  <path d={trendChart.securityEvents.line} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />

                  <circle cx={trendChart.userActions.lastPt.x} cy={trendChart.userActions.lastPt.y} r="4" fill="#16A34A" stroke="#fff" strokeWidth="1.5" />
                  <circle cx={trendChart.systemEvents.lastPt.x} cy={trendChart.systemEvents.lastPt.y} r="3.5" fill="#3B82F6" />
                  <circle cx={trendChart.securityEvents.lastPt.x} cy={trendChart.securityEvents.lastPt.y} r="3.5" fill="#F59E0B" />

                  {/* Latest Activity Callout */}
                  <g transform="translate(335, -8)">
                    <rect width="132" height="24" rx="10" fill="#141816" className="dark:fill-emerald-950" />
                    <text x="66" y="15.5" textAnchor="middle" className="fill-white text-[10px] font-bold">
                      {trendChart.latestTotal.toLocaleString()} actions • {trendChart.latestLabel}
                    </text>
                  </g>
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Middle: Activity by Module Donut Card (3 cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 shadow-2xs flex flex-col justify-between">
          <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white mb-4">
            Activity by Module
          </h2>

          <div className="flex flex-col items-center justify-center gap-5 my-auto">
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 116 116">
                <circle
                  cx="58"
                  cy="58"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  className="text-zinc-100 dark:text-zinc-800"
                  strokeWidth="15"
                />
                {moduleBreakdown.total > 0 &&
                  donutSegments.map((seg) => (
                    <circle
                      key={seg.key}
                      cx="58"
                      cy="58"
                      r="46"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="15"
                      strokeDasharray={seg.dashArray}
                      strokeDashoffset={seg.dashOffset}
                      className="transition-all duration-500"
                    />
                  ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-black text-zinc-900 dark:text-white leading-none">
                  {moduleBreakdown.total.toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
                  Total
                </span>
              </div>
            </div>

            <div className="w-full space-y-2">
              {moduleBreakdown.items.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {item.label}
                    </span>
                  </div>
                  <span className="font-bold text-zinc-900 dark:text-white tabular-nums">
                    {item.pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Dark Emerald Live Activity Feed Card (3 cols) */}
        <div className="lg:col-span-3 rounded-2xl bg-gradient-to-br from-[#0F4229] via-[#0B301E] to-[#072115] text-white p-5 shadow-md flex flex-col justify-between border border-emerald-800/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-extrabold text-white">
                Live Activity Feed
              </h2>
            </div>
            <button
              type="button"
              onClick={() => tableRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="text-[11px] font-bold text-emerald-300 hover:text-white inline-flex items-center gap-1 transition cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {liveFeedFive.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 text-emerald-200/70">
                <Radio className="w-8 h-8 mb-2 opacity-60 animate-pulse" />
                <p className="text-xs font-semibold">Listening for live events</p>
                <p className="text-[11px] opacity-75 mt-1">New activities will stream here automatically.</p>
              </div>
            ) : (
              liveFeedFive.map((ev) => {
                const mod = getModuleVisual(ev.type);
                const ModIcon = mod.icon;
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setSelectedEvent(ev)}
                    className="w-full text-left flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-white/10 transition cursor-pointer group"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0 text-emerald-300 group-hover:bg-emerald-500/30 transition">
                      <ModIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">
                        {ev.title}
                      </p>
                      <p className="text-[11px] text-emerald-200/80 mt-0.5">
                        {formatTimeAgo(ev.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── 4. RECENT ACTIVITY LOG TABLE ── */}
      <div
        ref={tableRef}
        className="bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 shadow-2xs overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ListChecks className="w-4 h-4 text-[#16A34A]" />
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
              Recent Activity Log
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
              {filteredEvents.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search activities, users..."
                className="h-9 pl-8 pr-3 rounded-xl bg-zinc-50 dark:bg-[#0D100E] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#16A34A] w-48 sm:w-56"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by activity type"
              className="h-9 px-3 rounded-xl bg-zinc-50 dark:bg-[#0D100E] border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-[#16A34A]"
            >
              <option value="ALL">All Activities</option>
              <option value="BOOKING">Bookings</option>
              <option value="USER">Users &amp; Auth</option>
              <option value="PROPERTY">Properties</option>
              <option value="PAYMENT">Transactions</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="SECURITY">Security</option>
              <option value="REVIEW">Reviews</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              aria-label="Filter by severity"
              className="h-9 px-3 rounded-xl bg-zinc-50 dark:bg-[#0D100E] border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-[#16A34A]"
            >
              <option value="ALL">All Modules</option>
              <option value="COMPLIANCE">Compliance Verified</option>
              <option value="NOTICE">Operational Notice</option>
              <option value="CRITICAL">Critical / Security</option>
              <option value="INFO">Platform Info</option>
            </select>

            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              aria-label="Filter by time window"
              className="h-9 px-3 rounded-xl bg-zinc-50 dark:bg-[#0D100E] border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-[#16A34A]"
            >
              <option value="ALL">All Time</option>
              <option value="24H">Last 24 Hours</option>
              <option value="7D">Last 7 Days</option>
            </select>

            <button
              type="button"
              onClick={handleExportCsv}
              className="h-9 px-3.5 rounded-xl bg-zinc-50 dark:bg-[#0D100E] border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>Export Logs</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/80 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                <th className="py-3.5 px-5">Timestamp</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Module</th>
                <th className="py-3.5 px-4">Details</th>
                <th className="py-3.5 px-4">Target / Location</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#16A34A]" />
                    Loading live platform telemetry...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <Activity className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-2.5" />
                    <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                      No platform activities recorded
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Real-time user registrations, bookings, and transactions will populate here automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => {
                  const actorName = ev.actor?.name || 'System Service';
                  const initials = actorName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const mod = getModuleVisual(ev.type);
                  const ModIcon = mod.icon;
                  const statusPill = getStatusPill(ev);
                  const dt = new Date(ev.createdAt);
                  const formattedTs = `${dt.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}, ${dt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}`;

                  return (
                    <tr
                      key={ev.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-5 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                        {formattedTs}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#E7F8ED] dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center text-[10px] font-bold shrink-0">
                            {initials || 'SY'}
                          </div>
                          <span className="font-semibold text-zinc-900 dark:text-white">
                            {actorName}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-bold text-zinc-900 dark:text-white">
                        {ev.title}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold',
                            mod.pillClass
                          )}
                        >
                          <ModIcon className="w-3 h-3" />
                          <span>{mod.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-[260px] truncate text-zinc-600 dark:text-zinc-400">
                        {ev.entity?.financialAmount ? `${ev.entity.financialAmount} — ` : ''}
                        {ev.message}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                        {ev.entity?.location || ev.entity?.title || 'Platform'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold',
                            statusPill.classes
                          )}
                        >
                          <span className={clsx('w-1.5 h-1.5 rounded-full', statusPill.dot)} />
                          <span>{statusPill.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedEvent(ev)}
                            aria-label="Inspect telemetry event"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-[#16A34A] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedEvent(ev)}
                            aria-label="More actions"
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TELEMETRY EVENT INSPECTOR MODAL ── */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141816] rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#16A34A]">
                  {getModuleVisual(selectedEvent.type).label}
                </span>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white mt-0.5">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedEvent(null);
                  setCopiedPayload(false);
                }}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-900/70 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800">
              {selectedEvent.message}
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-400 block text-[10px] font-semibold uppercase">Actor</span>
                <span className="font-bold text-zinc-900 dark:text-white mt-0.5 block">
                  {selectedEvent.actor?.name || 'System'}
                </span>
                {selectedEvent.actor?.email && (
                  <span className="text-[11px] text-zinc-500 block truncate">
                    {selectedEvent.actor.email}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-400 block text-[10px] font-semibold uppercase">Timestamp</span>
                <span className="font-bold text-zinc-900 dark:text-white mt-0.5 block">
                  {new Date(selectedEvent.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(selectedEvent, null, 2));
                  setCopiedPayload(true);
                  toast.success('Copied raw JSON telemetry payload');
                  setTimeout(() => setCopiedPayload(false), 2000);
                }}
                className="h-9 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                {copiedPayload ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPayload ? 'Copied Payload' : 'Copy JSON'}</span>
              </button>

              {selectedEvent.entity?.id && (
                <Link
                  href={
                    selectedEvent.type === 'PROPERTY'
                      ? `/admin/properties/${selectedEvent.entity.id}`
                      : selectedEvent.type === 'BOOKING'
                      ? `/admin/bookings/${selectedEvent.entity.id}`
                      : selectedEvent.type === 'USER'
                      ? `/admin/users`
                      : '/admin/dashboard'
                  }
                  className="h-9 px-4 rounded-xl bg-[#16A34A] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#15803D] transition"
                >
                  <span>Inspect Entity</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
