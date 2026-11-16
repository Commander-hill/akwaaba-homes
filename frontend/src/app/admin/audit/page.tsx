'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useSocket } from '@/providers/SocketProvider';
import {
  Database,
  User as UserIcon,
  ShieldCheck,
  Clock,
  Calendar,
  Download,
  BarChart2,
  PieChart,
  Zap,
  Filter,
  FileSpreadsheet,
  ShieldAlert,
  Settings,
  Search,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  ListChecks,
  ArrowRight,
  Eye,
  CheckCircle2,
  X,
  RotateCw,
  Loader2,
  Server,
  ChevronLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { WebhookDLQViewer } from '@/components/admin/audit/WebhookDLQViewer';
import AuditDetailDrawer, {
  AuditLogItem,
} from '@/components/admin/audit/AuditDetailDrawer';

interface AuditLogsResponse {
  logs: AuditLogItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  metrics: {
    total: number;
    sanctions: number;
    approvals: number;
    uniqueIps: number;
    uniqueActors?: number;
    securityEvents?: number;
    failedActions?: number;
  };
  availableEntities: string[];
}

type DatePreset = 'TODAY' | '7D' | '30D' | 'ALL';
type SeverityFilter = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH';
type ActionFilter = 'ALL' | 'USER_ACTIVITY' | 'DATA_CHANGES' | 'SECURITY' | 'OTHER';

function formatActionLabel(action: string): string {
  if (!action) return 'System Action';
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getLogSeverity(action: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  const upper = (action || '').toUpperCase();
  if (
    upper.includes('DELETE') ||
    upper.includes('SUSPEND') ||
    upper.includes('BAN') ||
    upper.includes('BREACH') ||
    upper.includes('REVOKE') ||
    upper.includes('FAIL') ||
    upper.includes('REJECT') ||
    upper.includes('LOCK')
  ) {
    return 'HIGH';
  }
  if (
    upper.includes('UPDATE') ||
    upper.includes('EDIT') ||
    upper.includes('CHANGE') ||
    upper.includes('CONFIG') ||
    upper.includes('APPROVE') ||
    upper.includes('PAY') ||
    upper.includes('DISBURSE')
  ) {
    return 'MEDIUM';
  }
  return 'LOW';
}

function getLogStatus(action: string): 'Success' | 'Failed' {
  const upper = (action || '').toUpperCase();
  if (
    upper.includes('FAIL') ||
    upper.includes('REJECT') ||
    upper.includes('DENIED') ||
    upper.includes('ERROR') ||
    upper.includes('INVALID')
  ) {
    return 'Failed';
  }
  return 'Success';
}

function getLogCategoryBucket(action: string): 'USER_ACTIVITY' | 'DATA_CHANGES' | 'SECURITY' | 'OTHER' {
  const upper = (action || '').toUpperCase();
  if (
    upper.includes('LOGIN') ||
    upper.includes('2FA') ||
    upper.includes('PASSWORD') ||
    upper.includes('SECURITY') ||
    upper.includes('SUSPEND') ||
    upper.includes('LOCK') ||
    upper.includes('REVOKE') ||
    upper.includes('AUTH')
  ) {
    return 'SECURITY';
  }
  if (
    upper.includes('UPDATE') ||
    upper.includes('CREATE') ||
    upper.includes('DELETE') ||
    upper.includes('EDIT') ||
    upper.includes('APPROVE') ||
    upper.includes('CONFIG') ||
    upper.includes('CHANGE')
  ) {
    return 'DATA_CHANGES';
  }
  if (
    upper.includes('EXPORT') ||
    upper.includes('VIEW') ||
    upper.includes('REGISTER') ||
    upper.includes('BOOK') ||
    upper.includes('PAY')
  ) {
    return 'USER_ACTIVITY';
  }
  return 'OTHER';
}

function summarizeDetails(log: AuditLogItem): string {
  try {
    if (log.newData) {
      const parsed = typeof log.newData === 'string' ? JSON.parse(log.newData) : log.newData;
      if (parsed && typeof parsed === 'object') {
        const keys = Object.keys(parsed);
        if (parsed.reason) return String(parsed.reason);
        if (parsed.message) return String(parsed.message);
        if (parsed.status) return `Status set to ${parsed.status}`;
        if (keys.length > 0) {
          const firstKey = keys[0];
          const val = parsed[firstKey];
          if (typeof val !== 'object') {
            return `${firstKey}: ${String(val)}`.slice(0, 48);
          }
        }
      }
    }
  } catch {
    // Fallback if non-JSON string
  }
  if (log.entityId && log.entityId !== 'SYSTEM' && log.entityId !== 'GLOBAL') {
    return `Target ID: ${log.entityId.slice(0, 12)}...`;
  }
  return `${formatActionLabel(log.action)} executed`;
}

export default function AuditLogsPage() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filters & UI State
  const [datePreset, setDatePreset] = useState<DatePreset>('30D');
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('ALL');
  const [actorFilter, setActorFilter] = useState<string>('ALL');
  const [resourceFilter, setResourceFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [showAllLogs, setShowAllLogs] = useState(false);

  // Modals & Drawers
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showRetentionModal, setShowRetentionModal] = useState(false);
  const [activeView, setActiveView] = useState<'AUDIT' | 'DLQ'>('AUDIT');
  const [isStreaming, setIsStreaming] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const startDate = useMemo(() => {
    const d = new Date();
    if (datePreset === 'TODAY') {
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    if (datePreset === '7D') {
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    if (datePreset === '30D') {
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    }
    return '';
  }, [datePreset]);

  const { data, isLoading, isFetching, refetch } = useQuery<AuditLogsResponse>({
    queryKey: ['admin-audit-logs', page, limit, debouncedSearch, resourceFilter, actorFilter, startDate],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: showAllLogs ? 50 : limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (resourceFilter !== 'ALL') params.entity = resourceFilter;
      if (actorFilter !== 'ALL') params.actorId = actorFilter;
      if (startDate) params.startDate = startDate;

      const res = await api.get('/admin/audit-logs', { params });
      if (Array.isArray(res.data)) {
        return {
          logs: res.data,
          pagination: { total: res.data.length, page: 1, limit: 50, totalPages: 1 },
          metrics: { total: res.data.length, sanctions: 0, approvals: 0, uniqueIps: 0 },
          availableEntities: [],
        };
      }
      return res.data;
    },
    staleTime: 15_000,
    refetchInterval: isStreaming && !isConnected ? 20_000 : false,
  });

  // Real-time Socket listener
  useEffect(() => {
    if (!socket || !isStreaming) return;
    const handleNewActivity = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
    };
    socket.on('activity:new', handleNewActivity);
    socket.on('user_updated', handleNewActivity);
    return () => {
      socket.off('activity:new', handleNewActivity);
      socket.off('user_updated', handleNewActivity);
    };
  }, [socket, isStreaming, queryClient]);

  const rawLogs = useMemo(() => data?.logs || [], [data]);
  const availableEntities = useMemo(() => data?.availableEntities || [], [data]);

  // Extract unique actors from fetched logs for the "All Users" filter
  const availableActors = useMemo(() => {
    const map = new Map<string, string>();
    for (const log of rawLogs) {
      if (log.user?.id) {
        map.set(log.user.id, `${log.user.firstName} ${log.user.lastName}`.trim() || log.user.email);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [rawLogs]);

  // Apply client-side refinements for action category & severity
  const filteredLogs = useMemo(() => {
    return rawLogs.filter((log) => {
      if (actionFilter !== 'ALL' && getLogCategoryBucket(log.action) !== actionFilter) {
        return false;
      }
      if (severityFilter !== 'ALL' && getLogSeverity(log.action) !== severityFilter) {
        return false;
      }
      return true;
    });
  }, [rawLogs, actionFilter, severityFilter]);

  // Metrics (100% Real Database Driven)
  const metrics = useMemo(() => {
    const m = data?.metrics;
    const totalEvents = m?.total ?? rawLogs.length;
    const uniqueActors =
      m?.uniqueActors ??
      new Set(rawLogs.map((l) => l.userId).filter(Boolean)).size;
    const securityEvents =
      m?.securityEvents ??
      rawLogs.filter((l) => getLogCategoryBucket(l.action) === 'SECURITY').length;
    const failedActions =
      m?.failedActions ??
      rawLogs.filter((l) => getLogStatus(l.action) === 'Failed').length;

    return { totalEvents, uniqueActors, securityEvents, failedActions };
  }, [data, rawLogs]);

  // Category Breakdown for Donut Chart
  const categoryBreakdown = useMemo(() => {
    const counts = { USER_ACTIVITY: 0, DATA_CHANGES: 0, SECURITY: 0, OTHER: 0 };
    for (const log of rawLogs) {
      counts[getLogCategoryBucket(log.action)]++;
    }
    const total = Math.max(1, rawLogs.length);
    const pct = (val: number) =>
      rawLogs.length === 0 ? 0 : Math.round((val / total) * 1000) / 10;

    return {
      total: rawLogs.length,
      items: [
        { key: 'USER_ACTIVITY', label: 'User Activities', count: counts.USER_ACTIVITY, pct: pct(counts.USER_ACTIVITY), color: '#16A34A' },
        { key: 'DATA_CHANGES', label: 'Data Changes', count: counts.DATA_CHANGES, pct: pct(counts.DATA_CHANGES), color: '#3B82F6' },
        { key: 'SECURITY', label: 'Security Events', count: counts.SECURITY, pct: pct(counts.SECURITY), color: '#F97316' },
        { key: 'OTHER', label: 'Other', count: counts.OTHER, pct: pct(counts.OTHER), color: '#EAB308' },
      ],
    };
  }, [rawLogs]);

  // Activity Overview Daily Buckets for SVG Multi-Line Chart
  const chartBuckets = useMemo(() => {
    if (rawLogs.length === 0) return [];
    const dayMap = new Map<string, { label: string; actions: number; security: number; failed: number }>();

    // Sort chronologically
    const sorted = [...rawLogs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    for (const log of sorted) {
      const d = new Date(log.createdAt);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const entry = dayMap.get(key) || { label, actions: 0, security: 0, failed: 0 };
      entry.actions++;
      if (getLogCategoryBucket(log.action) === 'SECURITY') entry.security++;
      if (getLogStatus(log.action) === 'Failed') entry.failed++;
      dayMap.set(key, entry);
    }

    return Array.from(dayMap.values()).slice(-12);
  }, [rawLogs]);

  const handleExportCsv = useCallback(async () => {
    if (filteredLogs.length === 0) {
      toast.error('No audit logs available to export');
      return;
    }
    setIsExporting(true);
    try {
      const headers = ['Timestamp', 'Actor', 'Email', 'Action', 'Resource', 'Details', 'IP Address', 'Severity', 'Status'];
      const rows = filteredLogs.map((log) => {
        const actor = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System';
        return [
          new Date(log.createdAt).toISOString(),
          actor,
          log.user?.email || '',
          formatActionLabel(log.action),
          log.entity,
          summarizeDetails(log),
          log.ipAddress || 'Internal',
          getLogSeverity(log.action),
          getLogStatus(log.action),
        ]
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `akwaaba_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filteredLogs.length} audit entries to CSV`);
    } catch {
      toast.error('Failed to export logs');
    } finally {
      setIsExporting(false);
    }
  }, [filteredLogs]);

  const dateLabel =
    datePreset === 'TODAY'
      ? 'Today'
      : datePreset === '7D'
      ? 'Last 7 Days'
      : datePreset === '30D'
      ? 'Last 30 Days'
      : 'All Time';

  const pagination = data?.pagination || { total: filteredLogs.length, page: 1, limit: 15, totalPages: 1 };

  // Build SVG path helper for Activity Overview
  const svgPaths = useMemo(() => {
    if (chartBuckets.length === 0) return null;
    const width = 480;
    const height = 135;
    const padLeft = 36;
    const padRight = 15;
    const usableW = width - padLeft - padRight;
    const maxVal = Math.max(
      1,
      ...chartBuckets.map((b) => Math.max(b.actions, b.security, b.failed))
    );

    const buildLine = (key: 'actions' | 'security' | 'failed') => {
      const pts = chartBuckets.map((b, i) => {
        const x =
          chartBuckets.length === 1
            ? padLeft + usableW / 2
            : padLeft + (i / (chartBuckets.length - 1)) * usableW;
        const y = height - (b[key] / maxVal) * (height - 20);
        return { x, y };
      });

      if (pts.length === 1) {
        return {
          line: `M${padLeft} ${pts[0].y} L${width - padRight} ${pts[0].y}`,
          area: `M${padLeft} ${pts[0].y} L${width - padRight} ${pts[0].y} L${width - padRight} ${height} L${padLeft} ${height} Z`,
          lastPt: { x: width - padRight, y: pts[0].y },
          pts,
        };
      }

      const d = pts.map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
      const area = `${d} L${pts[pts.length - 1].x.toFixed(1)} ${height} L${pts[0].x.toFixed(1)} ${height} Z`;
      return { line: d, area, lastPt: pts[pts.length - 1], pts };
    };

    return {
      maxVal,
      actions: buildLine('actions'),
      security: buildLine('security'),
      failed: buildLine('failed'),
      latestCount: chartBuckets[chartBuckets.length - 1]?.actions || 0,
    };
  }, [chartBuckets]);

  // Donut stroke dash calculations
  const donutSegments = useMemo(() => {
    const r = 46;
    const circumference = 2 * Math.PI * r;
    const segments: Array<(typeof categoryBreakdown.items)[number] & { dashArray: string; dashOffset: number }> = [];
    let accumulated = 0;

    for (const item of categoryBreakdown.items) {
      const fraction = categoryBreakdown.total > 0 ? item.count / categoryBreakdown.total : 0;
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
  }, [categoryBreakdown]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. TOP HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#F4FBF6] via-[#EDF8F1] to-[#E6F4EC] dark:from-[#121915] dark:via-[#141F19] dark:to-[#132119] border border-emerald-100/80 dark:border-emerald-900/40 px-6 py-7 sm:px-8 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#16A34A] text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
                Audit Logs &amp; Forensic Trail
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                Track all sensitive actions, monitor system activities, and maintain a complete forensic record for accountability and compliance.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Date Preset Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDateMenuOpen((prev) => !prev)}
                className="h-10 px-4 rounded-xl bg-white dark:bg-[#19221D] border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs"
              >
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                <span>{dateLabel}</span>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
              </button>
              {dateMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-[#19221D] border border-zinc-200 dark:border-zinc-700 shadow-lg py-1.5 z-30">
                  {[
                    { id: 'TODAY', label: 'Today' },
                    { id: '7D', label: 'Last 7 Days' },
                    { id: '30D', label: 'Last 30 Days' },
                    { id: 'ALL', label: 'All Time' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setDatePreset(opt.id as DatePreset);
                        setDateMenuOpen(false);
                        setPage(1);
                      }}
                      className={clsx(
                        'w-full text-left px-4 py-2 text-xs font-semibold transition cursor-pointer',
                        datePreset === opt.id
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A]'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="h-10 px-4 rounded-xl bg-white dark:bg-[#19221D] border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs disabled:opacity-60"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-zinc-500" />}
              <span>Export Logs</span>
            </button>

            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="h-10 px-4 rounded-xl bg-white dark:bg-[#19221D] border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs"
            >
              <BarChart2 className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>View Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. FOUR KPI STAT CARDS WITH SPARKLINES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Events */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#E7F8ED] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Total Events
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {metrics.totalEvents.toLocaleString()}
              </span>
            </div>
          </div>
          <svg className="w-24 h-12 shrink-0 pointer-events-none opacity-80" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="auditGreenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16A34A" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2 40 C20 35, 30 24, 48 26 C64 28, 76 14, 98 9 L98 45 L2 45 Z" fill="url(#auditGreenGrad)" />
            <path d="M2 40 C20 35, 30 24, 48 26 C64 28, 76 14, 98 9" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="94" cy="10" r="2.5" fill="#16A34A" />
          </svg>
        </div>

        {/* Card 2: Unique Actors */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#E8F2FE] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Unique Actors
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {metrics.uniqueActors.toLocaleString()}
              </span>
            </div>
          </div>
          <svg className="w-24 h-12 shrink-0 pointer-events-none opacity-80" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="auditBlueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2 38 C22 33, 35 28, 52 21 C68 15, 78 19, 98 8 L98 45 L2 45 Z" fill="url(#auditBlueGrad)" />
            <path d="M2 38 C22 33, 35 28, 52 21 C68 15, 78 19, 98 8" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="94" cy="9" r="2.5" fill="#3B82F6" />
          </svg>
        </div>

        {/* Card 3: Security Events */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#FEF3E6] dark:bg-amber-950/60 text-[#F97316] dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Security Events
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {metrics.securityEvents.toLocaleString()}
              </span>
            </div>
          </div>
          <svg className="w-24 h-12 shrink-0 pointer-events-none opacity-80" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="auditOrangeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F97316" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2 39 C22 34, 38 22, 54 24 C70 26, 82 12, 98 10 L98 45 L2 45 Z" fill="url(#auditOrangeGrad)" />
            <path d="M2 39 C22 34, 38 22, 54 24 C70 26, 82 12, 98 10" stroke="#F97316" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="94" cy="11" r="2.5" fill="#F97316" />
          </svg>
        </div>

        {/* Card 4: Failed Actions */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#F3E8FF] dark:bg-purple-950/60 text-[#9333EA] dark:text-purple-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Failed Actions
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {metrics.failedActions.toLocaleString()}
              </span>
            </div>
          </div>
          <svg className="w-24 h-12 shrink-0 pointer-events-none opacity-80" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="auditRedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2 40 C22 38, 36 28, 52 29 C68 30, 80 18, 98 14 L98 45 L2 45 Z" fill="url(#auditRedGrad)" />
            <path d="M2 40 C22 38, 36 28, 52 29 C68 30, 80 18, 98 14" stroke="#EF4444" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="94" cy="15" r="2.5" fill="#EF4444" />
          </svg>
        </div>
      </div>

      {/* ── 3. MIDDLE 3-COLUMN BENTO GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Activity Overview Multi-Series Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#16A34A]" />
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                Activity Overview
              </h2>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#16A34A]" /> Actions
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> Security
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Failed
              </span>
            </div>
          </div>

          <div className="relative w-full h-44">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 480 155" preserveAspectRatio="none">
              <defs>
                <linearGradient id="overviewGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16A34A" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="overviewBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.14" />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="overviewRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[15, 55, 95, 135].map((y, idx) => {
                const maxLabel = svgPaths ? Math.round(svgPaths.maxVal * (1 - idx / 3)) : (3 - idx) * 10;
                return (
                  <g key={y}>
                    <text x="0" y={y + 3} className="fill-zinc-400 text-[10px] font-medium">
                      {maxLabel}
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

              {!svgPaths ? (
                <text x="250" y="80" textAnchor="middle" className="fill-zinc-400 text-[12px] font-medium">
                  No audit activity recorded yet
                </text>
              ) : (
                <>
                  <path d={svgPaths.actions.area} fill="url(#overviewGreen)" />
                  <path d={svgPaths.security.area} fill="url(#overviewBlue)" />
                  <path d={svgPaths.failed.area} fill="url(#overviewRed)" />

                  <path d={svgPaths.actions.line} fill="none" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" />
                  <path d={svgPaths.security.line} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                  <path d={svgPaths.failed.line} fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />

                  <circle cx={svgPaths.actions.lastPt.x} cy={svgPaths.actions.lastPt.y} r="4" fill="#16A34A" stroke="#fff" strokeWidth="1.5" />
                  <circle cx={svgPaths.security.lastPt.x} cy={svgPaths.security.lastPt.y} r="3.5" fill="#3B82F6" />
                  <circle cx={svgPaths.failed.lastPt.x} cy={svgPaths.failed.lastPt.y} r="3.5" fill="#EF4444" />

                  {/* Latest Count Pill */}
                  <g transform="translate(340, -10)">
                    <rect width="122" height="22" rx="11" fill="#141816" className="dark:fill-emerald-950" />
                    <circle cx="12" cy="11" r="3" fill="#16A34A" />
                    <text x="66" y="15" textAnchor="middle" className="fill-white text-[10px] font-bold">
                      {svgPaths.latestCount.toLocaleString()} Actions
                    </text>
                  </g>
                </>
              )}
            </svg>
          </div>
        </div>

        {/* Middle: Events by Category Donut Card (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-4 h-4 text-[#16A34A]" />
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
              Events by Category
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-5 my-auto">
            {/* SVG Donut */}
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
                {categoryBreakdown.total > 0 &&
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
                  {metrics.totalEvents.toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mt-1">
                  Total
                </span>
              </div>
            </div>

            {/* Category Legend */}
            <div className="flex-1 w-full space-y-2.5">
              {categoryBreakdown.items.map((item) => (
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

        {/* Right: Quick Actions Card (3 cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-[#16A34A]" />
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
              Quick Actions
            </h2>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            <button
              type="button"
              onClick={() => searchInputRef.current?.focus()}
              className="w-full py-2.5 flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-[#16A34A] transition cursor-pointer group"
            >
              <span className="flex items-center gap-2.5">
                <Filter className="w-4 h-4 text-[#16A34A]" />
                <span>Filter Logs</span>
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="w-full py-2.5 flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-[#16A34A] transition cursor-pointer group"
            >
              <span className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-[#16A34A]" />
                <span>Export to CSV</span>
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveView('AUDIT');
                setActionFilter('SECURITY');
                setPage(1);
                toast.success('Filtered to Security Events');
              }}
              className="w-full py-2.5 flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-[#16A34A] transition cursor-pointer group"
            >
              <span className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-[#16A34A]" />
                <span>View Security Logs</span>
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => setShowRetentionModal(true)}
              className="w-full py-2.5 flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:text-[#16A34A] transition cursor-pointer group"
            >
              <span className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-[#16A34A]" />
                <span>Manage Retention</span>
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 4. SEARCH & FILTER TOOLBAR ── */}
      <div className="bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by user, action, or resource..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-zinc-50 dark:bg-[#0D100E] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#16A34A]"
            />
          </div>

          {/* Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value as ActionFilter);
                setPage(1);
              }}
              aria-label="Filter by action category"
              className="h-10 px-3 rounded-xl bg-zinc-50 dark:bg-[#0D100E] border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-[#16A34A]"
            >
              <option value="ALL">All Actions</option>
              <option value="USER_ACTIVITY">User Activities</option>
              <option value="DATA_CHANGES">Data Changes</option>
              <option value="SECURITY">Security Events</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              value={actorFilter}
              onChange={(e) => {
                setActorFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by actor"
              className="h-10 px-3 rounded-xl bg-zinc-50 dark:bg-[#0D100E] border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-[#16A34A]"
            >
              <option value="ALL">All Users</option>
              {availableActors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <select
              value={resourceFilter}
              onChange={(e) => {
                setResourceFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by resource"
              className="h-10 px-3 rounded-xl bg-zinc-50 dark:bg-[#0D100E] border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-[#16A34A]"
            >
              <option value="ALL">All Resources</option>
              {availableEntities.map((ent) => (
                <option key={ent} value={ent}>
                  {ent}
                </option>
              ))}
            </select>

            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value as SeverityFilter);
                setPage(1);
              }}
              aria-label="Filter by severity"
              className="h-10 px-3 rounded-xl bg-zinc-50 dark:bg-[#0D100E] border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-[#16A34A]"
            >
              <option value="ALL">All Severity</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>

            <button
              type="button"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className={clsx(
                'h-10 px-4 rounded-xl border text-xs font-bold inline-flex items-center gap-2 transition cursor-pointer',
                showAdvancedFilters
                  ? 'bg-[#16A34A] border-[#16A34A] text-white'
                  : 'bg-[#E7F8ED]/60 dark:bg-emerald-950/30 border-[#16A34A]/40 text-[#15803D] dark:text-emerald-400 hover:bg-[#E7F8ED]'
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Advanced Filters</span>
            </button>
          </div>
        </div>

        {/* Expandable Advanced Row */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveView('AUDIT')}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer',
                  activeView === 'AUDIT'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                )}
              >
                Forensic Audit Trail
              </button>
              <button
                type="button"
                onClick={() => setActiveView('DLQ')}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer',
                  activeView === 'DLQ'
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                )}
              >
                <Server className="w-3.5 h-3.5" />
                <span>Webhook Dead-Letter Queue</span>
              </button>
              <button
                type="button"
                onClick={() => setIsStreaming((prev) => !prev)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer',
                  isStreaming
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A]'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                )}
              >
                <span className={clsx('w-2 h-2 rounded-full', isStreaming ? 'bg-[#16A34A] animate-pulse' : 'bg-zinc-400')} />
                <span>{isStreaming ? 'Live Stream Active' : 'Stream Paused'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setActionFilter('ALL');
                  setActorFilter('ALL');
                  setResourceFilter('ALL');
                  setSeverityFilter('ALL');
                  setDatePreset('30D');
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition cursor-pointer"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => refetch()}
                className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
              >
                <RotateCw className={clsx('w-3.5 h-3.5', isFetching && 'animate-spin')} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 5. RECENT AUDIT LOGS TABLE OR WEBHOOK DLQ ── */}
      {activeView === 'DLQ' ? (
        <WebhookDLQViewer />
      ) : (
        <div className="bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 shadow-2xs overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ListChecks className="w-4 h-4 text-[#16A34A]" />
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                Recent Audit Logs
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                {pagination.total.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAllLogs((prev) => !prev);
                setLimit((prev) => (prev === 15 ? 50 : 15));
                setPage(1);
              }}
              className="text-xs font-bold text-[#16A34A] hover:text-[#15803D] inline-flex items-center gap-1 transition cursor-pointer"
            >
              <span>{showAllLogs ? 'Show Compact View' : 'View All Logs'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800/80 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                  <th className="py-3.5 px-5">Timestamp</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Resource</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-4">IP Address</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-zinc-500">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#16A34A]" />
                      Loading forensic audit trail...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center">
                      <ShieldCheck className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-2.5" />
                      <p className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
                        No audit logs found
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        System actions, logins, and modifications will appear here in real time.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const actorName = log.user
                      ? `${log.user.firstName} ${log.user.lastName}`.trim() || log.user.email
                      : 'System Process';
                    const initials = actorName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    const severity = getLogSeverity(log.action);
                    const status = getLogStatus(log.action);
                    const formattedDate = new Date(log.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    const formattedTime = new Date(log.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="py-3.5 px-5 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                          <div className="inline-flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>
                              {formattedDate} &bull; {formattedTime}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            {log.user?.avatarUrl ? (
                              <Image
                                src={log.user.avatarUrl}
                                alt={actorName}
                                width={28}
                                height={28}
                                unoptimized
                                className="w-7 h-7 rounded-full object-cover border border-zinc-200 dark:border-zinc-700 shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[#E7F8ED] dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center text-[10px] font-bold shrink-0">
                                {initials || 'SY'}
                              </div>
                            )}
                            <span className="font-semibold text-zinc-900 dark:text-white">
                              {actorName}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-bold text-zinc-900 dark:text-white">
                          {formatActionLabel(log.action)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-zinc-700 dark:text-zinc-300">
                          {log.entity || 'System'}
                        </td>

                        <td className="py-3.5 px-4 max-w-[240px] truncate text-zinc-600 dark:text-zinc-400">
                          {summarizeDetails(log)}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                          {log.ipAddress || 'Internal'}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={clsx(
                              'inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold',
                              severity === 'HIGH' && 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400',
                              severity === 'MEDIUM' && 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
                              severity === 'LOW' && 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                            )}
                          >
                            {severity === 'HIGH' ? 'High' : severity === 'MEDIUM' ? 'Medium' : 'Low'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={clsx(
                              'inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold',
                              status === 'Success'
                                ? 'bg-[#E7F8ED] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400'
                                : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400'
                            )}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:text-[#16A34A] transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-zinc-500" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {pagination.totalPages > 1 && (
            <div className="px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} events)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FORENSIC DIFF DRAWER ── */}
      <AuditDetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />

      {/* ── VIEW REPORT MODAL ── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141816] rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BarChart2 className="w-5 h-5 text-[#16A34A]" />
                <h3 className="text-base font-black text-zinc-900 dark:text-white">
                  Forensic Compliance Report ({dateLabel})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500 block">Total Recorded Events</span>
                <span className="text-xl font-black text-zinc-900 dark:text-white mt-1 block">
                  {metrics.totalEvents.toLocaleString()}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500 block">Unique Participating Actors</span>
                <span className="text-xl font-black text-zinc-900 dark:text-white mt-1 block">
                  {metrics.uniqueActors.toLocaleString()}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500 block">Security &amp; Auth Events</span>
                <span className="text-xl font-black text-amber-600 mt-1 block">
                  {metrics.securityEvents.toLocaleString()}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500 block">Failed / Rejected Actions</span>
                <span className="text-xl font-black text-red-600 mt-1 block">
                  {metrics.failedActions.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="h-9 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  handleExportCsv();
                  setShowReportModal(false);
                }}
                className="h-9 px-4 rounded-xl bg-[#16A34A] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download CSV Report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MANAGE RETENTION MODAL ── */}
      {showRetentionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141816] rounded-2xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
                <h3 className="text-base font-black text-zinc-900 dark:text-white">
                  Audit Retention &amp; Immutability Policy
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRetentionModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              In compliance with Ghana Data Protection Act (Act 843) and statutory financial accountability standards, all audit records are append-only and retained for a minimum of <strong>7 years</strong>.
            </p>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span>Tamper-proof append-only logging is active.</span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowRetentionModal(false)}
                className="h-9 px-4 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
