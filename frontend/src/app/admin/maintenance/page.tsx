'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import {
  Power,
  Clock,
  AlertTriangle,
  Loader2,
  Calendar,
  Lock,
  Eye,
  RefreshCw,
  Users,
  Building2,
  Globe,
  Save,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  ShieldCheck,
  Activity,
  Code2,
  ArrowRight,
  Wrench,
  CheckCircle2,
  Settings,
  Megaphone,
  CalendarClock,
  Mail,
  Phone,
  Download,
  Info,
  Play,
  Square,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useDialog } from '@/providers/DialogProvider';
import { useSocket } from '@/providers/SocketProvider';
import QueryErrorFallback from '@/components/ui/QueryErrorFallback';

type MaintenanceScope = 'GLOBAL' | 'TENANTS_ONLY' | 'LANDLORDS_ONLY';

interface MaintenanceAuditRecord {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldData: any;
  newData: any;
  ipAddress: string | null;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
}

interface StructuredDiffRow {
  fieldKey: string;
  label: string;
  before: string;
  after: string;
  changed: boolean;
}

function toLocalDateTimeInput(isoOrDate?: string | Date | null): string {
  if (!isoOrDate) return '';
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function parseAuditPayload(payload: any): Record<string, any> | null {
  if (!payload) return null;
  if (typeof payload === 'object') return payload;
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
  return null;
}

function formatAuditValue(key: string, val: any): string {
  if (val === undefined || val === null || val === '') return '—';
  if (key === 'maintenanceMode') return val ? 'Active (Offline)' : 'Normal (Online)';
  if (key === 'maintenanceScheduled') return val ? 'Scheduled' : 'Not Scheduled';
  if (key === 'maintenanceScope') {
    if (val === 'TENANTS_ONLY') return 'Tenant Portal Only';
    if (val === 'LANDLORDS_ONLY') return 'Landlord Operations Only';
    return 'Entire Platform (Global)';
  }
  if (key === 'maintenanceStartTime' || key === 'maintenanceEndTime') {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return String(val);
}

function computeStructuredDiffRows(oldRaw: any, newRaw: any): StructuredDiffRow[] {
  const oldObj = parseAuditPayload(oldRaw) || {};
  const newObj = parseAuditPayload(newRaw) || {};

  const fields: Array<{ key: string; label: string }> = [
    { key: 'maintenanceMode', label: 'Availability State' },
    { key: 'maintenanceScope', label: 'Enforcement Scope' },
    { key: 'maintenanceScheduled', label: 'Window Automation' },
    { key: 'maintenanceStartTime', label: 'Effective Start Time' },
    { key: 'maintenanceEndTime', label: 'Target Restoration Time' },
    { key: 'maintenanceTitle', label: 'Advisory Headline' },
    { key: 'maintenanceMessage', label: 'Public Advisory Copy' },
    { key: 'maintenanceReason', label: 'Internal Ticket / Reason' },
    { key: 'maintenanceContactEmail', label: 'Support Contact Email' },
    { key: 'maintenanceContactPhone', label: 'Support Hotline' },
  ];

  const rows: StructuredDiffRow[] = [];

  for (const { key, label } of fields) {
    const rawOld = key === 'maintenanceReason' ? (oldObj.maintenanceReason ?? oldObj.reason) : oldObj[key];
    const rawNew = key === 'maintenanceReason' ? (newObj.maintenanceReason ?? newObj.reason) : newObj[key];

    if (rawOld === undefined && rawNew === undefined) continue;

    const before = formatAuditValue(key, rawOld);
    const after = formatAuditValue(key, rawNew);
    const changed = before !== after && rawOld !== undefined;

    rows.push({
      fieldKey: key,
      label,
      before,
      after,
      changed,
    });
  }

  return rows;
}

function getEventDisplayMeta(action: string, newObj: Record<string, any> | null) {
  switch (action) {
    case 'MAINTENANCE_ACTIVATED':
      return {
        eventLabel: 'Maintenance Mode Enabled',
        description: newObj?.maintenanceReason || 'Platform set to maintenance mode',
        statusLabel: 'Active',
        statusClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        dotClass: 'bg-rose-500',
      };
    case 'MAINTENANCE_DEACTIVATED':
      return {
        eventLabel: 'Maintenance Mode Disabled',
        description: 'Platform restored to normal operation',
        statusLabel: 'Success',
        statusClass: 'bg-[#E6F7EE] text-[#059669] dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        dotClass: 'bg-emerald-500',
      };
    case 'MAINTENANCE_SCHEDULED':
      return {
        eventLabel: 'Schedule Set',
        description: newObj?.maintenanceStartTime
          ? `Maintenance window scheduled for ${new Date(newObj.maintenanceStartTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          : 'Maintenance window scheduled',
        statusLabel: 'Scheduled',
        statusClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        dotClass: 'bg-purple-500',
      };
    case 'MAINTENANCE_SCHEDULE_CANCELLED':
      return {
        eventLabel: 'Schedule Cancelled',
        description: 'Planned maintenance window cleared',
        statusLabel: 'Info',
        statusClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        dotClass: 'bg-sky-500',
      };
    default:
      return {
        eventLabel: 'Advisory Updated',
        description: newObj?.maintenanceMessage ? 'Public advisory message & settings updated' : 'Maintenance configuration synchronized',
        statusLabel: 'Info',
        statusClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
        dotClass: 'bg-sky-500',
      };
  }
}

export default function AdminMaintenancePage() {
  const queryClient = useQueryClient();
  const { confirm } = useDialog();
  const { socket } = useSocket();

  // ── Queries ──
  const {
    data: configData,
    isLoading: isLoadingConfig,
    isError: isConfigError,
    refetch: refetchConfig,
    isFetching: isFetchingConfig,
  } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const res = await api.get('/admin/config');
      return res.data;
    },
    staleTime: 10 * 1000,
    retry: 1,
  });

  const { data: authData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Audit History Filtering & Pagination State ──
  const [historyPage, setHistoryPage] = useState(1);
  const [historyActionFilter, setHistoryActionFilter] = useState<string>('ALL');
  const [historyRangeFilter, setHistoryRangeFilter] = useState<'30D' | '7D' | 'ALL'>('30D');
  const [historySearchInput, setHistorySearchInput] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [showRawJsonIds, setShowRawJsonIds] = useState<Record<string, boolean>>({});
  const [scopeEditing, setScopeEditing] = useState(false);
  const [clearanceModalOpen, setClearanceModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHistorySearch(historySearchInput.trim());
      setHistoryPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [historySearchInput]);

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    refetch: refetchHistory,
    isFetching: isFetchingHistory,
  } = useQuery<{
    history: MaintenanceAuditRecord[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: ['admin-maintenance-history', historyPage, historyActionFilter, historySearch],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(historyPage),
        limit: '8',
      });
      if (historyActionFilter && historyActionFilter !== 'ALL') {
        params.set('action', historyActionFilter);
      }
      if (historySearch) {
        params.set('search', historySearch);
      }
      const res = await api.get(`/admin/maintenance/history?${params.toString()}`);
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  const userRole = authData?.user?.role;
  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isReadOnlyAdmin = Boolean(authData?.user && userRole !== 'SUPER_ADMIN');

  // ── Server-derived Live State ──
  const isServerMaintenanceActive = Boolean(configData?.maintenanceMode);
  const serverEndTime = configData?.maintenanceEndTime || null;
  const serverStartTime = configData?.maintenanceStartTime || null;
  const serverScheduled = Boolean(configData?.maintenanceScheduled);
  const operationalContext = configData?.operationalContext || {
    pendingSubscribersCount: 0,
    totalSubscribersCount: 0,
    activeBookingsInFlight: 0,
  };

  // ── Local Form / Configuration State ──
  const [scope, setScope] = useState<MaintenanceScope>('GLOBAL');
  const [title, setTitle] = useState('Scheduled Platform Maintenance');
  const [message, setMessage] = useState(
    'AkwaabaHomes is currently undergoing scheduled maintenance to upgrade our infrastructure and improve your rental experience. We will be back online shortly.'
  );
  const [contactEmail, setContactEmail] = useState('support@akwaabahomes.com');
  const [contactPhone, setContactPhone] = useState('+233 24 000 0000');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');

  // ── Confirmation Modal State ──
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [confirmPhraseInput, setConfirmPhraseInput] = useState('');
  const [actionInProgress, setActionInProgress] = useState<'ACTIVATE' | 'DEACTIVATE' | 'SAVE' | null>(null);

  useEffect(() => {
    if (configData) {
      setScope((configData.maintenanceScope as MaintenanceScope) || 'GLOBAL');
      setTitle(configData.maintenanceTitle || 'Scheduled Platform Maintenance');
      setMessage(
        configData.maintenanceMessage ||
          'AkwaabaHomes is currently undergoing scheduled maintenance to upgrade our infrastructure and improve your rental experience. We will be back online shortly.'
      );
      setContactEmail(configData.maintenanceContactEmail || 'support@akwaabahomes.com');
      setContactPhone(configData.maintenanceContactPhone || '+233 24 000 0000');
      setReason(configData.maintenanceReason || '');
      setStartTime(toLocalDateTimeInput(configData.maintenanceStartTime));
      setEndTime(toLocalDateTimeInput(configData.maintenanceEndTime));
    }
  }, [configData]);

  useEffect(() => {
    if (!socket) return;
    const handleConfigUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-config'] });
      queryClient.invalidateQueries({ queryKey: ['admin-maintenance-history'] });
    };
    socket.on('config_updated', handleConfigUpdated);
    return () => {
      socket.off('config_updated', handleConfigUpdated);
    };
  }, [socket, queryClient]);

  // ── Live Countdown Calculation ──
  const [countdown, setCountdown] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  } | null>(null);

  useEffect(() => {
    const targetIso = isServerMaintenanceActive ? serverEndTime : serverStartTime;
    if (!targetIso) {
      setCountdown(null);
      return;
    }

    const calculate = () => {
      const target = new Date(targetIso).getTime();
      const diff = target - Date.now();

      if (diff <= 0) {
        setCountdown({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown({ hours, minutes, seconds, isExpired: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [isServerMaintenanceActive, serverEndTime, serverStartTime]);

  // ── Mutations ──
  const updateConfigMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put('/admin/config', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-config'] });
      queryClient.invalidateQueries({ queryKey: ['admin-maintenance-history'] });
      setImpactModalOpen(false);
      setConfirmPhraseInput('');
      setActionInProgress(null);

      if (data?.config?.maintenanceMode) {
        toast.success('Maintenance Mode is now ACTIVE across selected platform scope.');
      } else if (data?.action === 'MAINTENANCE_DEACTIVATED') {
        toast.success('Maintenance Mode deactivated. Normal platform operations fully restored.');
      } else if (data?.action === 'MAINTENANCE_SCHEDULED') {
        toast.success('Maintenance window scheduled successfully.');
      } else {
        toast.success('Maintenance configuration saved successfully.');
      }
    },
    onError: (err: any) => {
      setActionInProgress(null);
      toast.error(err?.response?.data?.message || 'Failed to update maintenance configuration.');
    },
  });

  // ── Preset Handlers ──
  const handleApplyPresetMinutes = (minutes: number) => {
    if (!isSuperAdmin) {
      toast.error('Super Administrator clearance is required to modify schedule presets.');
      return;
    }
    const baseTime = startTime ? new Date(startTime) : new Date();
    const effectiveStart = Number.isNaN(baseTime.getTime()) ? new Date() : baseTime;
    if (!startTime) {
      setStartTime(toLocalDateTimeInput(effectiveStart));
    }
    const future = new Date(effectiveStart.getTime() + minutes * 60 * 1000);
    setEndTime(toLocalDateTimeInput(future));
  };

  // ── Save Advisory / Schedule ──
  const handleSaveDraft = () => {
    if (!isSuperAdmin) {
      toast.error('Super Administrator clearance is required to modify maintenance settings.');
      return;
    }

    if (endTime && startTime && new Date(endTime) <= new Date(startTime)) {
      toast.error('Scheduled end time must occur after scheduled start time.');
      return;
    }

    setActionInProgress('SAVE');
    updateConfigMutation.mutate({
      maintenanceTitle: title.trim(),
      maintenanceMessage: message.trim(),
      maintenanceScope: scope,
      maintenanceReason: reason.trim() || null,
      maintenanceContactEmail: contactEmail.trim(),
      maintenanceContactPhone: contactPhone.trim(),
      maintenanceStartTime: startTime ? new Date(startTime).toISOString() : null,
      maintenanceEndTime: endTime ? new Date(endTime).toISOString() : null,
      maintenanceScheduled: Boolean(startTime && new Date(startTime) > new Date()),
    });
  };

  const handleOpenActivationModal = () => {
    if (!isSuperAdmin) {
      toast.error('Super Administrator clearance is required to toggle platform maintenance.');
      return;
    }
    setConfirmPhraseInput('');
    setImpactModalOpen(true);
  };

  const handleConfirmActivation = () => {
    if (!isSuperAdmin) return;
    if (confirmPhraseInput.trim() !== 'ENABLE MAINTENANCE') {
      toast.error('Please type the exact confirmation phrase "ENABLE MAINTENANCE".');
      return;
    }

    setActionInProgress('ACTIVATE');
    updateConfigMutation.mutate({
      maintenanceMode: true,
      maintenanceScheduled: false,
      maintenanceTitle: title.trim(),
      maintenanceMessage: message.trim(),
      maintenanceScope: scope,
      maintenanceReason: reason.trim() || 'Urgent platform infrastructure maintenance',
      maintenanceContactEmail: contactEmail.trim(),
      maintenanceContactPhone: contactPhone.trim(),
      maintenanceStartTime: new Date().toISOString(),
      maintenanceEndTime: endTime ? new Date(endTime).toISOString() : null,
    });
  };

  const handleDeactivate = async () => {
    if (!isSuperAdmin) {
      toast.error('Super Administrator clearance is required to restore platform services.');
      return;
    }

    const confirmed = await confirm({
      title: 'Restore Public Platform Operations?',
      message:
        'Deactivating maintenance mode will immediately resume public listing discovery, tenant room reservations, and landlord operations. All active subscribers will receive restoration notifications.',
      confirmText: 'Restore Public Access',
      cancelText: 'Keep Offline',
      type: 'info',
    });

    if (confirmed) {
      setActionInProgress('DEACTIVATE');
      updateConfigMutation.mutate({
        maintenanceMode: false,
        maintenanceScheduled: false,
        maintenanceStartTime: null,
        maintenanceEndTime: null,
      });
    }
  };

  const handleCancelSchedule = async () => {
    if (!isSuperAdmin) return;
    const confirmed = await confirm({
      title: 'Cancel Scheduled Maintenance Window?',
      message: 'This will remove the upcoming planned maintenance window. The platform will remain online continuously.',
      confirmText: 'Cancel Schedule',
      cancelText: 'Keep Schedule',
      type: 'warning',
    });

    if (confirmed) {
      setStartTime('');
      setEndTime('');
      updateConfigMutation.mutate({
        maintenanceScheduled: false,
        maintenanceStartTime: null,
        maintenanceEndTime: null,
      });
    }
  };

  // ── Derived KPI & Log Metrics ──
  const rawHistory = useMemo(() => historyData?.history || [], [historyData]);
  const totalHistoryCount = historyData?.pagination?.total ?? rawHistory.length;

  const filteredHistory = useMemo(() => {
    if (historyRangeFilter === 'ALL') return rawHistory;
    const days = historyRangeFilter === '7D' ? 7 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return rawHistory.filter((r) => new Date(r.createdAt).getTime() >= cutoff);
  }, [rawHistory, historyRangeFilter]);

  const scheduledTasksCount = useMemo(() => {
    const fromLog = rawHistory.filter((r) => r.action === 'MAINTENANCE_SCHEDULED').length;
    return serverScheduled ? Math.max(1, fromLog) : fromLog;
  }, [rawHistory, serverScheduled]);

  const completedTasksCount = useMemo(
    () =>
      rawHistory.filter((r) =>
        ['MAINTENANCE_DEACTIVATED', 'MAINTENANCE_CONFIG_UPDATED'].includes(r.action)
      ).length,
    [rawHistory]
  );

  const pendingActionsCount = useMemo(
    () => (isServerMaintenanceActive ? 1 : 0) + (serverScheduled ? 1 : 0),
    [isServerMaintenanceActive, serverScheduled]
  );

  const lastModifiedLabel = useMemo(() => {
    const latest = rawHistory[0]?.createdAt || configData?.updatedAt;
    if (!latest) return '—';
    return new Date(latest).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }, [rawHistory, configData?.updatedAt]);

  const handleExportLogs = () => {
    if (filteredHistory.length === 0) {
      toast.error('No maintenance log entries to export.');
      return;
    }
    const headers = ['Date & Time', 'Event', 'Description', 'By', 'Status'];
    const rows = filteredHistory.map((r) => {
      const parsedNew = parseAuditPayload(r.newData);
      const meta = getEventDisplayMeta(r.action, parsedNew);
      const actor = r.user ? `${r.user.firstName} ${r.user.lastName}`.trim() : 'System Admin';
      const dateStr = new Date(r.createdAt).toLocaleString();
      return [dateStr, meta.eventLabel, meta.description, actor, meta.statusLabel]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Maintenance logs exported to CSV.');
  };

  if (isLoadingConfig) {
    return (
      <div className="min-h-[55vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A] dark:text-emerald-400" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Loading maintenance governance &amp; availability telemetry...
        </p>
      </div>
    );
  }

  if (isConfigError || !configData) {
    return (
      <div className="py-12">
        <QueryErrorFallback
          title="Unable to load Maintenance Dashboard"
          message="Could not retrieve live system availability configuration. Please verify your session and retry."
          onRetry={() => refetchConfig()}
          isRetrying={isFetchingConfig}
        />
      </div>
    );
  }

  const scopeCards: Array<{
    id: MaintenanceScope;
    label: string;
    desc: string;
    icon: React.ElementType;
  }> = [
    {
      id: 'GLOBAL',
      label: 'Entire Platform',
      desc: 'Suspends public discovery, room reservations, tenant tools, and landlord operations.',
      icon: Globe,
    },
    {
      id: 'TENANTS_ONLY',
      label: 'Tenant Portal Only',
      desc: 'Pauses tenant search, room bookings, and resident portals.',
      icon: Users,
    },
    {
      id: 'LANDLORDS_ONLY',
      label: 'Landlord Portal Only',
      desc: 'Pauses property publishing, payments, and landlord operations.',
      icon: Building2,
    },
  ];

  return (
    <div className="space-y-5 pb-12 font-sans">
      {/* ── 1. TOP HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[#E9F7EF] via-[#F2FBF6] to-[#E6F4EC] dark:from-[#072617] dark:via-[#0A2E1D] dark:to-[#072115] border border-emerald-200/70 dark:border-emerald-900/50 shadow-2xs min-h-[124px] flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5">
        {/* Right panoramic building blend */}
        <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[56%] pointer-events-none opacity-85 dark:opacity-35">
          <Image
            src="/images/admin/dashboard-hero-building.webp"
            alt="Maintenance Dashboard"
            fill
            unoptimized
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#E9F7EF] via-[#E9F7EF]/85 to-transparent dark:from-[#072617] dark:via-[#072617]/85" />
        </div>

        {/* Left Icon & Title */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100/90 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-[#16A34A] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Maintenance Dashboard
            </h1>
            <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-300 mt-0.5">
              Monitor maintenance activities, manage audit trails, and keep your platform running smoothly.
            </p>
          </div>
        </div>

        {/* Right Refresh Button */}
        <div className="relative z-10 shrink-0">
          <button
            type="button"
            onClick={() => {
              refetchConfig();
              refetchHistory();
              toast.success('Maintenance telemetry refreshed');
            }}
            disabled={isFetchingConfig || isFetchingHistory}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-100 shadow-xs transition cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', (isFetchingConfig || isFetchingHistory) && 'animate-spin')} />
            <span>Refresh Dashboard</span>
          </button>
        </div>
      </div>

      {/* ── 2. OBSERVER MODE BANNER (SHOWN FOR READ-ONLY ADMIN) ── */}
      {isReadOnlyAdmin && (
        <div className="rounded-2xl bg-[#FFF8EB] dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-amber-100">
                Observer Mode (Read-Only Clearance)
              </h2>
              <p className="text-[11.5px] text-zinc-600 dark:text-amber-200/80 mt-0.5">
                Your account role (<span className="font-mono font-bold">{userRole}</span>) can inspect maintenance telemetry and audit logs, but <span className="font-mono font-bold">SUPER_ADMIN</span> clearance is required to modify configuration or toggle platform availability.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setClearanceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/40 transition shrink-0 cursor-pointer self-start sm:self-center"
          >
            <span>View Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── 3. 4 KPI SPARKLINE CARDS ROW ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Maintenance Activities */}
        <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 px-5 py-4 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                Maintenance Activities
              </p>
              <p className="text-2xl font-black text-zinc-950 dark:text-white leading-tight mt-0.5">
                {totalHistoryCount}
              </p>
              <p className="text-[11px] font-bold text-[#16A34A] dark:text-emerald-400 mt-0.5">
                ↑ {totalHistoryCount > 0 ? 'Active' : '0%'} audit log
              </p>
            </div>
          </div>
          <svg viewBox="0 0 80 34" className="w-20 h-9 shrink-0" aria-hidden="true">
            <defs>
              <linearGradient id="maint-g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16A34A" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2,30 L16,26 L30,27 L44,18 L58,20 L78,4 L78,34 L2,34 Z" fill="url(#maint-g1)" />
            <path d="M2,30 L16,26 L30,27 L44,18 L58,20 L78,4" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Card 2: Scheduled Tasks */}
        <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 px-5 py-4 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-full bg-sky-100/80 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                Scheduled Tasks
              </p>
              <p className="text-2xl font-black text-zinc-950 dark:text-white leading-tight mt-0.5">
                {scheduledTasksCount}
              </p>
              <p className="text-[11px] font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                {serverScheduled ? '● Window queued' : '→ None queued'}
              </p>
            </div>
          </div>
          <svg viewBox="0 0 80 34" className="w-20 h-9 shrink-0" aria-hidden="true">
            <defs>
              <linearGradient id="maint-g2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284C7" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2,31 L18,22 L34,25 L50,15 L64,18 L78,7 L78,34 L2,34 Z" fill="url(#maint-g2)" />
            <path d="M2,31 L18,22 L34,25 L50,15 L64,18 L78,7" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Card 3: Completed Tasks */}
        <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 px-5 py-4 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-full bg-purple-100/80 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                Completed Tasks
              </p>
              <p className="text-2xl font-black text-zinc-950 dark:text-white leading-tight mt-0.5">
                {completedTasksCount}
              </p>
              <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                ↑ Verified changes
              </p>
            </div>
          </div>
          <svg viewBox="0 0 80 34" className="w-20 h-9 shrink-0" aria-hidden="true">
            <defs>
              <linearGradient id="maint-g3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9333EA" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#9333EA" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2,29 L18,24 L32,14 L46,20 L62,12 L78,5 L78,34 L2,34 Z" fill="url(#maint-g3)" />
            <path d="M2,29 L18,24 L32,14 L46,20 L62,12 L78,5" fill="none" stroke="#9333EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Card 4: Pending Actions */}
        <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 px-5 py-4 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-full bg-rose-100/80 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                Pending Actions
              </p>
              <p className="text-2xl font-black text-zinc-950 dark:text-white leading-tight mt-0.5">
                {pendingActionsCount}
              </p>
              <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {isServerMaintenanceActive ? '● Mode active' : '↓ All clear'}
              </p>
            </div>
          </div>
          <svg viewBox="0 0 80 34" className="w-20 h-9 shrink-0" aria-hidden="true">
            <defs>
              <linearGradient id="maint-g4" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E11D48" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#E11D48" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2,28 L16,30 L30,22 L46,16 L62,21 L78,6 L78,34 L2,34 Z" fill="url(#maint-g4)" />
            <path d="M2,28 L16,30 L30,22 L46,16 L62,21 L78,6" fill="none" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* ── 4. GOVERNANCE & SCOPE ROW (7 COLS / 5 COLS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Maintenance Mode & Availability Governance */}
        <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs flex flex-col justify-between gap-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-950 dark:text-white tracking-tight">
                Maintenance Mode &amp; Availability Governance
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Manage planned infrastructure windows, enforce portal-level HTTP 503 access restrictions, and coordinate service restoration.
              </p>
            </div>
          </div>

          {/* Central Status & Toggle Strip */}
          <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Operation Status Pill */}
            <div
              className={clsx(
                'rounded-xl px-4 py-3 flex items-center gap-3 flex-1',
                isServerMaintenanceActive
                  ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60'
                  : 'bg-[#E9F7EF] dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50'
              )}
            >
              <div
                className={clsx(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                  isServerMaintenanceActive
                    ? 'bg-rose-500 text-white'
                    : 'bg-[#16A34A] text-white'
                )}
              >
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <p
                  className={clsx(
                    'text-xs font-extrabold',
                    isServerMaintenanceActive
                      ? 'text-rose-800 dark:text-rose-200'
                      : 'text-[#0B3B24] dark:text-emerald-200'
                  )}
                >
                  {isServerMaintenanceActive ? 'Maintenance Active' : 'Normal Operation'}
                </p>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  {isServerMaintenanceActive
                    ? 'HTTP 503 active across selected scope.'
                    : 'All services are running normally.'}
                </p>
              </div>
            </div>

            {/* Middle Toggle Label */}
            <div className="flex items-center gap-3 px-1">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">Maintenance Mode</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isServerMaintenanceActive}
                    disabled={!isSuperAdmin || actionInProgress !== null}
                    onClick={isServerMaintenanceActive ? handleDeactivate : handleOpenActivationModal}
                    className={clsx(
                      'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                      isServerMaintenanceActive ? 'bg-rose-500' : 'bg-zinc-300 dark:bg-zinc-700'
                    )}
                  >
                    <span
                      className={clsx(
                        'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-xs transform transition',
                        isServerMaintenanceActive ? 'translate-x-4' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Activate maintenance mode to restrict access.
                </p>
              </div>
            </div>

            {/* Right Action Button */}
            <div className="shrink-0">
              {isServerMaintenanceActive ? (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={!isSuperAdmin || actionInProgress !== null}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionInProgress === 'DEACTIVATE' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Square className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>Disable Mode</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenActivationModal}
                  disabled={!isSuperAdmin || actionInProgress !== null}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionInProgress === 'ACTIVATE' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>Enable Mode</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom 3-Column Timing Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <span className="text-[10.5px] text-zinc-500 block">Effective Start</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {serverStartTime
                    ? new Date(serverStartTime).toLocaleString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Manual / Immediate'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <span className="text-[10.5px] text-zinc-500 block">Target Restoration</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {countdown && !countdown.isExpired
                    ? `${String(countdown.hours).padStart(2, '0')}h ${String(countdown.minutes).padStart(2, '0')}m ${String(countdown.seconds).padStart(2, '0')}s`
                    : serverEndTime
                    ? new Date(serverEndTime).toLocaleString('en-US', {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Open-Ended'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-zinc-400 shrink-0" />
              <div>
                <span className="text-[10.5px] text-zinc-500 block">Last Modified</span>
                <span className="font-bold text-zinc-900 dark:text-white">{lastModifiedLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Maintenance Scope */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-base font-black text-zinc-950 dark:text-white tracking-tight">
                Maintenance Scope
              </h2>
            </div>

            <button
              type="button"
              disabled={!isSuperAdmin}
              onClick={() => {
                if (scopeEditing) {
                  handleSaveDraft();
                  setScopeEditing(false);
                } else {
                  setScopeEditing(true);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[11px] font-bold text-zinc-700 dark:text-zinc-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-3 h-3" />
              <span>{scopeEditing ? 'Save Scope' : 'Edit Scope'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
            {scopeCards.map((item) => {
              const Icon = item.icon;
              const isSelected = scope === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={!isSuperAdmin}
                  onClick={() => setScope(item.id)}
                  className={clsx(
                    'relative text-left rounded-xl p-3.5 border transition flex flex-col justify-between gap-2 cursor-pointer disabled:cursor-not-allowed',
                    isSelected
                      ? 'border-[#16A34A] bg-[#F2FBF6] dark:bg-emerald-950/30 ring-1 ring-[#16A34A]/30'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-700'
                  )}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div
                      className={clsx(
                        'w-8 h-8 rounded-lg flex items-center justify-center',
                        isSelected
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 text-[#16A34A] dark:text-emerald-400'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="mt-1">
                    <p className="text-xs font-extrabold text-zinc-900 dark:text-white leading-snug">
                      {item.label}
                    </p>
                    <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 5. ADVISORY CONTACTS & WINDOW SCHEDULE ROW (2 COLS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Public Advisory, Copy & Support Desk Contacts */}
        <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-zinc-950 dark:text-white">
                1. Public Advisory, Copy &amp; Support Desk Contacts
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Customize the message displayed on <code className="font-mono text-[11px]">/maintenance</code> and returned in HTTP 503 JSON payloads.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-7">
              <textarea
                rows={5}
                value={message}
                disabled={!isSuperAdmin}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter public maintenance advisory message..."
                className="w-full h-full min-h-[126px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-900 p-3 text-xs text-zinc-800 dark:text-zinc-100 leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
              />
            </div>

            <div className="md:col-span-5 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Support Desk Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={contactEmail}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Emergency Support Hotline
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={contactPhone}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={!isSuperAdmin || actionInProgress !== null}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionInProgress === 'SAVE' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>

                <Link
                  href="/maintenance"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition"
                >
                  <Phone className="w-3 h-3" />
                  <span>Preview Message</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Maintenance Window Schedule & Change Reference */}
        <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-zinc-950 dark:text-white">
                  2. Maintenance Window Schedule &amp; Change Reference
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Set an automated start/end window (GMT / local time) and record an internal change ticket reference.
                </p>
              </div>
            </div>
            {serverScheduled && isSuperAdmin && (
              <button
                type="button"
                onClick={handleCancelSchedule}
                className="text-[11px] font-bold text-rose-600 hover:underline shrink-0 cursor-pointer"
              >
                Cancel Window
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Presets & Temporal Safety */}
            <div className="md:col-span-5 space-y-3">
              <div>
                <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Quick Target Duration Presets
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: '+15 Mins', mins: 15 },
                    { label: '+30 Mins', mins: 30 },
                    { label: '+1 Hour', mins: 60 },
                    { label: '+2 Hours', mins: 120 },
                    { label: '+4 Hours', mins: 240 },
                    { label: 'Overnight (8h)', mins: 480 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      disabled={!isSuperAdmin}
                      onClick={() => handleApplyPresetMinutes(p.mins)}
                      className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-300 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 p-3">
                <p className="text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                  Temporal Safety
                </p>
                <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  Logged strictly in the internal administrator audit trail.
                </p>
              </div>
            </div>

            {/* Date Pickers & Internal Reference */}
            <div className="md:col-span-7 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Planned Start Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Target End / Restoration Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end gap-2.5">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Internal Reference
                  </label>
                  <input
                    type="text"
                    value={reason}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. INFRA-2026-Q4-01"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={!isSuperAdmin || actionInProgress !== null}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-xs transition shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedule Maintenance</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6. MAINTENANCE LOG TABLE ── */}
      <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <h2 className="text-sm sm:text-base font-black text-zinc-950 dark:text-white">
              3. Maintenance Log
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={historySearchInput}
                onChange={(e) => setHistorySearchInput(e.target.value)}
                placeholder="Search logs..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 w-44"
              />
            </div>

            <select
              value={historyActionFilter}
              onChange={(e) => {
                setHistoryActionFilter(e.target.value);
                setHistoryPage(1);
              }}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-200 outline-none cursor-pointer"
            >
              <option value="ALL">All Events</option>
              <option value="MAINTENANCE_ACTIVATED">Mode Enabled</option>
              <option value="MAINTENANCE_DEACTIVATED">Mode Disabled</option>
              <option value="MAINTENANCE_SCHEDULED">Schedule Set</option>
              <option value="MAINTENANCE_CONFIG_UPDATED">Advisory Updated</option>
            </select>

            <select
              value={historyRangeFilter}
              onChange={(e) => setHistoryRangeFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-200 outline-none cursor-pointer"
            >
              <option value="30D">Last 30 Days</option>
              <option value="7D">Last 7 Days</option>
              <option value="ALL">All Time</option>
            </select>

            <button
              type="button"
              onClick={handleExportLogs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Logs</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <th className="px-5 py-3 w-12">#</th>
                <th className="px-4 py-3">Date &amp; Time</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">By</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
              {isLoadingHistory ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#16A34A]" />
                    Loading maintenance audit log...
                  </td>
                </tr>
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No maintenance audit events match your current filters.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((record, idx) => {
                  const newObj = parseAuditPayload(record.newData);
                  const oldObj = parseAuditPayload(record.oldData) || {};
                  const meta = getEventDisplayMeta(record.action, newObj);
                  const actorName = record.user
                    ? `${record.user.firstName} ${record.user.lastName}`.trim()
                    : 'System Admin';
                  const isExpanded = expandedAuditId === record.id;
                  const showRawJson = Boolean(showRawJsonIds[record.id]);
                  const structuredRows = computeStructuredDiffRows(record.oldData, record.newData);
                  const rowNum = (historyPage - 1) * 8 + idx + 1;

                  return (
                    <React.Fragment key={record.id}>
                      <tr className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 transition">
                        <td className="px-5 py-3.5 font-mono text-zinc-500">{rowNum}</td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-zinc-700 dark:text-zinc-300 font-medium">
                          {new Date(record.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                          {meta.eventLabel}
                        </td>
                        <td className="px-4 py-3.5 text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                          {meta.description}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap text-zinc-700 dark:text-zinc-300 font-medium">
                          {actorName}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span
                            className={clsx(
                              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                              meta.statusClass
                            )}
                          >
                            <span className={clsx('w-1.5 h-1.5 rounded-full', meta.dotClass)} />
                            {meta.statusLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setExpandedAuditId(isExpanded ? null : record.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:text-[#16A34A] transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-zinc-50/80 dark:bg-zinc-900/40">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                              <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/70 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                                  Structured Field-Level Audit Comparison
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowRawJsonIds((prev) => ({
                                      ...prev,
                                      [record.id]: !prev[record.id],
                                    }))
                                  }
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                                >
                                  <Code2 className="w-3.5 h-3.5" />
                                  <span>{showRawJson ? 'Show Structured Table' : 'View Raw JSON'}</span>
                                </button>
                              </div>

                              {showRawJson ? (
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                    <div className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">
                                      Previous State (oldData)
                                    </div>
                                    <pre className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                                      {Object.keys(oldObj).length > 0 ? JSON.stringify(oldObj, null, 2) : 'No prior state recorded'}
                                    </pre>
                                  </div>
                                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1">
                                    <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[10px]">
                                      Applied State (newData)
                                    </div>
                                    <pre className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                                      {newObj && Object.keys(newObj).length > 0 ? JSON.stringify(newObj, null, 2) : 'No new state recorded'}
                                    </pre>
                                  </div>
                                </div>
                              ) : structuredRows.length === 0 ? (
                                <div className="p-4 text-xs text-zinc-500">
                                  No structured field parameters recorded for this event.
                                </div>
                              ) : (
                                <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70 text-xs">
                                  {structuredRows.map((row) => (
                                    <div
                                      key={row.fieldKey}
                                      className={clsx(
                                        'px-4 py-2.5 grid grid-cols-1 md:grid-cols-12 gap-2 items-center',
                                        row.changed && 'bg-emerald-500/[0.03] dark:bg-emerald-500/[0.04]'
                                      )}
                                    >
                                      <div className="md:col-span-3 font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                                        <span>{row.label}</span>
                                        {row.changed && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                            Modified
                                          </span>
                                        )}
                                      </div>
                                      <div className="md:col-span-4 text-zinc-500 dark:text-zinc-400 truncate" title={row.before}>
                                        <span className="text-[10px] uppercase font-bold text-zinc-400 mr-1.5">Before:</span>
                                        <span className={clsx(row.changed && 'line-through opacity-75')}>{row.before}</span>
                                      </div>
                                      <div className="md:col-span-5 font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 truncate" title={row.after}>
                                        <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                        <span className={clsx(row.changed && 'text-[#0F5132] dark:text-emerald-400')}>
                                          {row.after}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {historyData && historyData.pagination.totalPages > 1 && (
          <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Page {historyData.pagination.page} of {historyData.pagination.totalPages} ({historyData.pagination.total} events)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage === 1}
                className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setHistoryPage((p) => Math.min(historyData.pagination.totalPages, p + 1))}
                disabled={historyPage >= historyData.pagination.totalPages}
                className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-40 transition cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── OBSERVER CLEARANCE DETAILS MODAL ── */}
      {clearanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-zinc-950 dark:text-white">
                Observer Mode Clearance
              </h3>
              <button
                type="button"
                onClick={() => setClearanceModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Maintenance mode toggles, HTTP 503 scope changes, and public advisory edits affect live platform availability across Ghana. Only <span className="font-mono font-bold">SUPER_ADMIN</span> accounts can execute these state changes.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setClearanceModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#16A34A] text-white text-xs font-bold cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TWO-STEP IMPACT CONFIRMATION MODAL ── */}
      {impactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full sm:max-w-xl rounded-t-[28px] rounded-b-none sm:rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden space-y-5 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-8 animate-in zoom-in-95">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
                  Confirm Platform Maintenance Mode Activation
                </h3>
                <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  You are about to suspend live public services on AkwaabaHomes. Review the operational blast radius below before confirming.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                <span className="text-zinc-500">Enforced Scope:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {scope === 'GLOBAL' ? 'Entire Platform (Global Outage)' : scope === 'TENANTS_ONLY' ? 'Tenant Portal Only' : 'Landlord Operations Only'}
                </span>
              </div>

              <div className="flex justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                <span className="text-zinc-500">Affected User Traffic:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {scope === 'GLOBAL' ? 'Students, Tenants & Landlords' : scope === 'TENANTS_ONLY' ? 'Students & Tenants' : 'Landlords'}
                </span>
              </div>

              <div className="flex justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-500" />
                  <span>In-Flight Pending Bookings:</span>
                </span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {operationalContext.activeBookingsInFlight} active reservation(s)
                </span>
              </div>

              <div className="flex justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-2">
                <span className="text-zinc-500">Target Restoration:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {endTime ? new Date(endTime).toLocaleString() : 'Open-ended (Requires manual deactivation)'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-zinc-500">Administrator Clearance:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Admin Gateway 100% Preserved</span>
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-900 dark:text-white">
                To confirm downtime, please type <span className="font-mono text-rose-600 dark:text-rose-400 uppercase select-all">ENABLE MAINTENANCE</span> below:
              </label>
              <input
                type="text"
                value={confirmPhraseInput}
                onChange={(e) => setConfirmPhraseInput(e.target.value)}
                placeholder="Type ENABLE MAINTENANCE"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setImpactModalOpen(false);
                  setConfirmPhraseInput('');
                }}
                disabled={actionInProgress !== null}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmActivation}
                disabled={confirmPhraseInput.trim() !== 'ENABLE MAINTENANCE' || actionInProgress !== null}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {actionInProgress === 'ACTIVATE' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
                <span>Confirm &amp; Activate Downtime</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
