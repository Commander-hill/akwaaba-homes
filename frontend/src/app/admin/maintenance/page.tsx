'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import {
  ShieldAlert,
  Power,
  Clock,
  AlertTriangle,
  Loader2,
  Calendar,
  Lock,
  ExternalLink,
  Eye,
  RefreshCw,
  Users,
  Building2,
  Globe,
  Save,
  History,
  FileText,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Sliders,
  ShieldCheck,
  Server,
  WifiOff,
  Activity,
  Code2,
  ArrowRight
} from 'lucide-react';
import clsx from 'clsx';
import { useDialog } from '@/providers/DialogProvider';
import { useSocket } from '@/providers/SocketProvider';

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

/**
 * Converts a Date or ISO timestamp into a local `YYYY-MM-DDTHH:mm` string
 * suitable for `<input type="datetime-local">` without shifting by UTC offset.
 */
function toLocalDateTimeInput(isoOrDate?: string | Date | null): string {
  if (!isoOrDate) return '';
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

/**
 * Safely parses `oldData` or `newData` from an AuditLog entry whether stored as a JSON string or object.
 */
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

/**
 * Builds structured field-by-field comparison rows for the Audit Trail inspection drawer.
 */
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

/**
 * Computes compact summary pills for the Audit Trail table row.
 */
function computeAuditDiffPills(oldRaw: any, newRaw: any, action: string): string[] {
  const oldObj = parseAuditPayload(oldRaw) || {};
  const newObj = parseAuditPayload(newRaw) || {};
  const pills: string[] = [];

  if (oldObj.maintenanceMode !== undefined || newObj.maintenanceMode !== undefined) {
    if (oldObj.maintenanceMode !== newObj.maintenanceMode && newObj.maintenanceMode !== undefined) {
      pills.push(`Mode: ${oldObj.maintenanceMode ? 'Offline' : 'Online'} → ${newObj.maintenanceMode ? 'Offline' : 'Online'}`);
    }
  }

  if (newObj.maintenanceScope && oldObj.maintenanceScope && oldObj.maintenanceScope !== newObj.maintenanceScope) {
    pills.push(`Scope: ${oldObj.maintenanceScope} → ${newObj.maintenanceScope}`);
  } else if (newObj.maintenanceScope && !oldObj.maintenanceScope) {
    pills.push(`Scope: ${newObj.maintenanceScope}`);
  }

  if (newObj.maintenanceScheduled !== undefined && oldObj.maintenanceScheduled !== newObj.maintenanceScheduled) {
    pills.push(newObj.maintenanceScheduled ? 'Window Scheduled' : 'Schedule Cleared');
  }

  if (newObj.maintenanceEndTime !== oldObj.maintenanceEndTime) {
    if (newObj.maintenanceEndTime) {
      const formatted = new Date(newObj.maintenanceEndTime).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      pills.push(`Target End: ${formatted}`);
    } else if (oldObj.maintenanceEndTime && !newObj.maintenanceEndTime) {
      pills.push('Target End Cleared');
    }
  }

  if (newObj.maintenanceTitle && oldObj.maintenanceTitle && newObj.maintenanceTitle !== oldObj.maintenanceTitle) {
    pills.push('Headline Updated');
  }

  if (newObj.maintenanceMessage && oldObj.maintenanceMessage && newObj.maintenanceMessage !== oldObj.maintenanceMessage) {
    pills.push('Advisory Copy Updated');
  }

  if (
    (newObj.maintenanceContactEmail && newObj.maintenanceContactEmail !== oldObj.maintenanceContactEmail) ||
    (newObj.maintenanceContactPhone && newObj.maintenanceContactPhone !== oldObj.maintenanceContactPhone)
  ) {
    pills.push('Support Contacts Updated');
  }

  if (pills.length === 0) {
    if (action === 'MAINTENANCE_ACTIVATED') pills.push('Mode: Online → Offline');
    else if (action === 'MAINTENANCE_DEACTIVATED') pills.push('Mode: Offline → Online');
    else if (action === 'MAINTENANCE_SCHEDULED') pills.push('Maintenance Window Scheduled');
    else if (action === 'MAINTENANCE_SCHEDULE_CANCELLED') pills.push('Scheduled Window Cancelled');
    else pills.push('Configuration Synchronized');
  }

  return pills;
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
    error: configError,
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
  const [historySearchInput, setHistorySearchInput] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [showRawJsonIds, setShowRawJsonIds] = useState<Record<string, boolean>>({});

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

  // Synchronize local form when backend config loads
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

  // Real-time socket sync when config updates on any administrative device
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

  // Track Unsaved Changes
  const hasUnsavedChanges = useMemo(() => {
    if (!configData) return false;
    const origScope = configData.maintenanceScope || 'GLOBAL';
    const origTitle = configData.maintenanceTitle || 'Scheduled Platform Maintenance';
    const origMessage =
      configData.maintenanceMessage ||
      'AkwaabaHomes is currently undergoing scheduled maintenance to upgrade our infrastructure and improve your rental experience. We will be back online shortly.';
    const origEmail = configData.maintenanceContactEmail || 'support@akwaabahomes.com';
    const origPhone = configData.maintenanceContactPhone || '+233 24 000 0000';
    const origReason = configData.maintenanceReason || '';
    const origEnd = toLocalDateTimeInput(configData.maintenanceEndTime);
    const origStart = toLocalDateTimeInput(configData.maintenanceStartTime);

    return (
      scope !== origScope ||
      title !== origTitle ||
      message !== origMessage ||
      contactEmail !== origEmail ||
      contactPhone !== origPhone ||
      reason !== origReason ||
      endTime !== origEnd ||
      startTime !== origStart
    );
  }, [configData, scope, title, message, contactEmail, contactPhone, reason, endTime, startTime]);

  // Warn on navigation if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

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
      const now = Date.now();
      const diff = target - now;

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
    if (!isSuperAdmin) return;
    const baseTime = startTime ? new Date(startTime) : new Date();
    const effectiveStart = Number.isNaN(baseTime.getTime()) ? new Date() : baseTime;
    const future = new Date(effectiveStart.getTime() + minutes * 60 * 1000);
    setEndTime(toLocalDateTimeInput(future));
  };

  // ── Save Draft (Without immediate activation) ──
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

  // ── Trigger Activation Flow (Opens Two-Step Confirmation) ──
  const handleOpenActivationModal = () => {
    if (!isSuperAdmin) {
      toast.error('Super Administrator clearance is required to toggle platform maintenance.');
      return;
    }
    setConfirmPhraseInput('');
    setImpactModalOpen(true);
  };

  // ── Confirm Activation ──
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

  // ── Deactivate Maintenance ──
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

  // ── Cancel Scheduled Maintenance ──
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

  // ── Discard Unsaved Changes ──
  const handleDiscardChanges = () => {
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
      toast.success('Unsaved changes discarded.');
    }
  };

  // ── Loading Skeleton ──
  if (isLoadingConfig) {
    return (
      <div className="min-h-[55vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132] dark:text-emerald-400" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Loading platform availability &amp; maintenance governance controls...
        </p>
      </div>
    );
  }

  // ── Explicit Telemetry Error / Unknown State ──
  if (isConfigError || !configData) {
    return (
      <div className="space-y-6 pb-20 animate-in fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/admin/dashboard" className="hover:text-zinc-900 dark:hover:text-white transition">
              Admin
            </Link>
            <span>/</span>
            <span className="text-zinc-400">Governance &amp; Operations</span>
            <span>/</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-200">Maintenance Mode</span>
          </div>
        </div>

        <div className="p-8 rounded-2xl bg-white dark:bg-[#12151D] border border-rose-300 dark:border-rose-900/70 border-l-4 border-l-rose-600 max-w-2xl mx-auto my-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border border-rose-500/20">
            <WifiOff className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
              Status Unknown • Telemetry Unreachable
            </span>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
              Unable to Verify Live Platform Availability State
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
              The administration portal could not retrieve the current <code className="font-mono text-xs">SystemConfig</code> state from <code className="font-mono text-xs">/api/v1/admin/config</code>. For operational safety, maintenance controls are locked until live state verification succeeds.
            </p>
            {(configError as any)?.response?.data?.message && (
              <p className="text-xs font-mono text-rose-600 dark:text-rose-400 pt-1">
                Server response: {(configError as any).response.data.message}
              </p>
            )}
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => refetchConfig()}
              disabled={isFetchingConfig}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', isFetchingConfig && 'animate-spin')} />
              <span>Retry State Verification</span>
            </button>
            <Link
              href="/maintenance"
              target="_blank"
              className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition flex items-center gap-1.5"
            >
              <span>Inspect Public Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      
      {/* ── BREADCRUMB & METADATA BAR ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <Link href="/admin/dashboard" className="hover:text-zinc-900 dark:hover:text-white transition">
            Admin
          </Link>
          <span>/</span>
          <span className="text-zinc-400">Governance &amp; Operations</span>
          <span>/</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-200">Maintenance Mode</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
            <Server className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
            <span>Production • GMT (UTC+00:00)</span>
          </span>

          <button
            type="button"
            onClick={() => {
              refetchConfig();
              refetchHistory();
            }}
            disabled={isFetchingConfig}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
            title="Refresh live telemetry"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', isFetchingConfig && 'animate-spin text-[#0F5132]')} />
          </button>

          <Link
            href="/maintenance"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
            <span>Open Public Advisory</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </Link>
        </div>
      </div>

      {/* ── READ-ONLY CLEARANCE BANNER FOR STANDARD ADMINS ── */}
      {isReadOnlyAdmin && (
        <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-800 border-l-4 border-l-amber-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-zinc-900 dark:text-white">Observer Mode (Read-Only Clearance): </span>
              <span>
                Your account role (<code className="font-mono text-xs font-semibold">{userRole}</code>) can inspect maintenance telemetry and audit logs, but <code className="font-mono text-xs font-semibold">SUPER_ADMIN</code> clearance is required to modify configuration or toggle platform availability.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
            Controls Locked
          </span>
        </div>
      )}

      {/* ── PAGE TITLE & PURPOSE ── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2.5">
          <ShieldAlert className={clsx('w-6 h-6', isServerMaintenanceActive ? 'text-rose-600 dark:text-rose-400' : 'text-[#0F5132] dark:text-emerald-400')} />
          <span>Maintenance Mode &amp; Availability Governance</span>
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
          Manage planned infrastructure windows, enforce portal-level HTTP 503 access restrictions, and coordinate service restoration.
        </p>
      </div>

      {/* ── OPERATIONAL STATUS & TELEMETRY BANNER ── */}
      <div
        className={clsx(
          'rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/90 dark:border-zinc-800 border-l-4 shadow-xs overflow-hidden transition-all',
          isServerMaintenanceActive
            ? 'border-l-rose-600 dark:border-l-rose-500'
            : serverScheduled
            ? 'border-l-amber-500 dark:border-l-amber-400'
            : 'border-l-[#0F5132] dark:border-l-emerald-500'
        )}
      >
        {/* Top Row: Primary Status & Principal Actions */}
        <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border',
                  isServerMaintenanceActive
                    ? 'bg-rose-600 text-white border-rose-700'
                    : serverScheduled
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-[#0F5132] text-white border-emerald-800'
                )}
              >
                <Power className="w-3.5 h-3.5" />
                {isServerMaintenanceActive
                  ? 'Maintenance Active • HTTP 503 Enforced'
                  : serverScheduled
                  ? 'Scheduled Window Queued'
                  : 'Normal Operation • All Portals Online'}
              </span>

              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-100 dark:bg-zinc-800/90 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                Active Scope:{' '}
                {configData?.maintenanceScope === 'TENANTS_ONLY'
                  ? 'Tenant & Resident Portal Only'
                  : configData?.maintenanceScope === 'LANDLORDS_ONLY'
                  ? 'Landlord Operations Only'
                  : 'Entire Platform (Global)'}
              </span>
            </div>

            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-950 dark:text-white">
                {isServerMaintenanceActive
                  ? 'Platform Traffic is Currently Held at the Maintenance Advisory Barrier'
                  : serverScheduled
                  ? 'Upcoming Maintenance Window is Armed for Automatic Execution'
                  : 'Public Discovery, Room Bookings, and Landlord Operations are Live'}
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {isServerMaintenanceActive
                  ? 'Non-exempt API requests within the active scope are receiving HTTP 503 Service Unavailable with a Retry-After header. Administrator sessions bypass restrictions.'
                  : serverScheduled
                  ? `The server will automatically transition into maintenance mode at ${serverStartTime ? new Date(serverStartTime).toLocaleString() : 'the scheduled start time'}.`
                  : 'All marketplace microservices, Paystack/MoMo escrow callbacks, and resident portals are serving traffic normally.'}
              </p>
            </div>
          </div>

          {/* Right Column: Live Countdown & Primary CTAs */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3.5 shrink-0">
            {countdown && !countdown.isExpired && (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <Clock className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                <div className="text-left">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                    {isServerMaintenanceActive ? 'Target Restoration In' : 'Window Commences In'}
                  </div>
                  <div className="font-mono text-base font-bold text-zinc-950 dark:text-white">
                    {String(countdown.hours).padStart(2, '0')}h : {String(countdown.minutes).padStart(2, '0')}m : {String(countdown.seconds).padStart(2, '0')}s
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5">
              {isServerMaintenanceActive ? (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={!isSuperAdmin || updateConfigMutation.isPending || actionInProgress !== null}
                  className="px-5 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0c4027] text-white text-sm font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionInProgress === 'DEACTIVATE' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Power className="w-4 h-4" />
                  )}
                  <span>Restore Public Access</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenActivationModal}
                  disabled={!isSuperAdmin || updateConfigMutation.isPending || actionInProgress !== null}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Power className="w-4 h-4" />
                  <span>Activate Maintenance Mode</span>
                </button>
              )}

              {serverScheduled && (
                <button
                  type="button"
                  onClick={handleCancelSchedule}
                  disabled={!isSuperAdmin || updateConfigMutation.isPending}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel Schedule
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Strip: Full-Width 6-Metric Operational Telemetry Bar */}
        <div className="bg-zinc-50/80 dark:bg-zinc-900/50 border-t border-zinc-200/80 dark:border-zinc-800/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200/80 dark:divide-zinc-800/80 text-xs">
          <div className="px-4 py-3">
            <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Effective Start</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
              {serverStartTime
                ? new Date(serverStartTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Manual / Immediate'}
            </span>
          </div>

          <div className="px-4 py-3">
            <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Target Restoration</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
              {serverEndTime
                ? new Date(serverEndTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Open-Ended'}
            </span>
          </div>

          <div className="px-4 py-3">
            <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">In-Flight Bookings</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
              {operationalContext.activeBookingsInFlight} Pending Reservation{operationalContext.activeBookingsInFlight === 1 ? '' : 's'}
            </span>
          </div>

          <div className="px-4 py-3">
            <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Restoration Queue</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
              {operationalContext.pendingSubscribersCount} Subscriber{operationalContext.pendingSubscribersCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="px-4 py-3">
            <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Last Modified</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 block mt-0.5">
              {configData?.updatedAt
                ? new Date(configData.updatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Just now'}
            </span>
          </div>

          <div className="px-4 py-3">
            <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Updated By</span>
            <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate block mt-0.5" title={configData?.maintenanceUpdatedBy || 'System'}>
              {configData?.maintenanceUpdatedBy || 'System'}
            </span>
          </div>
        </div>
      </div>

      {/* ── UNSAVED CHANGES BANNER ── */}
      {hasUnsavedChanges && isSuperAdmin && (
        <div className="p-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 text-sm font-medium text-amber-950 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>You have unsaved maintenance configuration changes. Save your configuration draft or activate when ready.</span>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleDiscardChanges}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:underline cursor-pointer"
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={updateConfigMutation.isPending}
              className="px-4 py-2 rounded-lg bg-[#0F5132] hover:bg-[#0c4027] text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      )}

      {/* ── TWO-COLUMN SPLIT WORKSPACE: CONFIGURATION STACK (LEFT) + LIVE PREVIEW & EXEMPTIONS (RIGHT) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (7/12): Unified Configuration Stack */}
        <div className="xl:col-span-7 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/90 dark:border-zinc-800 shadow-xs divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden">
          
          {/* Section 1: Scope & Enforcement Policy */}
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-sm font-bold text-zinc-950 dark:text-white">
                  <Sliders className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                  <span>1. Maintenance Scope &amp; Portal Restriction</span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Choose which portals and API route groups are intercepted by server middleware.
                </p>
              </div>
              <span className="text-[11px] font-mono font-semibold text-zinc-400">HTTP 503</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Option 1: Global */}
              <label
                className={clsx(
                  'p-4 rounded-xl border transition flex flex-col justify-between space-y-3',
                  !isSuperAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer',
                  scope === 'GLOBAL'
                    ? 'border-[#0F5132] dark:border-emerald-500 bg-emerald-500/5 ring-1 ring-[#0F5132]/30 dark:ring-emerald-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-950 dark:text-white">
                      <Globe className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                      <span>Entire Platform</span>
                    </div>
                    <input
                      type="radio"
                      name="scope"
                      value="GLOBAL"
                      disabled={!isSuperAdmin}
                      checked={scope === 'GLOBAL'}
                      onChange={() => setScope('GLOBAL')}
                      className="text-[#0F5132] focus:ring-[#0F5132]"
                    />
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Suspends public discovery, room reservations, tenant tools, and landlord operations.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  Blocks: All Non-Admin APIs
                </span>
              </label>

              {/* Option 2: Tenant Portal Only */}
              <label
                className={clsx(
                  'p-4 rounded-xl border transition flex flex-col justify-between space-y-3',
                  !isSuperAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer',
                  scope === 'TENANTS_ONLY'
                    ? 'border-[#0F5132] dark:border-emerald-500 bg-emerald-500/5 ring-1 ring-[#0F5132]/30 dark:ring-emerald-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-950 dark:text-white">
                      <Users className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                      <span>Tenant Portal Only</span>
                    </div>
                    <input
                      type="radio"
                      name="scope"
                      value="TENANTS_ONLY"
                      disabled={!isSuperAdmin}
                      checked={scope === 'TENANTS_ONLY'}
                      onChange={() => setScope('TENANTS_ONLY')}
                      className="text-[#0F5132] focus:ring-[#0F5132]"
                    />
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Pauses tenant search, room bookings, and resident portals. Landlord tools stay online.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  Blocks: Public &amp; Tenant APIs
                </span>
              </label>

              {/* Option 3: Landlord Portal Only */}
              <label
                className={clsx(
                  'p-4 rounded-xl border transition flex flex-col justify-between space-y-3',
                  !isSuperAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer',
                  scope === 'LANDLORDS_ONLY'
                    ? 'border-[#0F5132] dark:border-emerald-500 bg-emerald-500/5 ring-1 ring-[#0F5132]/30 dark:ring-emerald-500/30'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-950 dark:text-white">
                      <Building2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                      <span>Landlord Portal Only</span>
                    </div>
                    <input
                      type="radio"
                      name="scope"
                      value="LANDLORDS_ONLY"
                      disabled={!isSuperAdmin}
                      checked={scope === 'LANDLORDS_ONLY'}
                      onChange={() => setScope('LANDLORDS_ONLY')}
                      className="text-[#0F5132] focus:ring-[#0F5132]"
                    />
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Pauses property publishing, payouts, and landlord operations. Tenant browsing stays live.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  Blocks: Landlord APIs Only
                </span>
              </label>
            </div>
          </div>

          {/* Section 2: Schedule & Change Management Ticket */}
          <div className="p-6 space-y-5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-950 dark:text-white">
                <Calendar className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                <span>2. Maintenance Window Schedule &amp; Change Reference</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Set an automated start/end window (GMT / local time) and record an internal change ticket reference.
              </p>
            </div>

            {/* Quick Duration Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Quick Target Duration Presets (Relative to Start Time or Now)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label: '+15 Mins', mins: 15 },
                  { label: '+30 Mins', mins: 30 },
                  { label: '+1 Hour', mins: 60 },
                  { label: '+2 Hours', mins: 120 },
                  { label: '+4 Hours', mins: 240 },
                  { label: 'Overnight (8h)', mins: 480 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={!isSuperAdmin}
                    onClick={() => handleApplyPresetMinutes(preset.mins)}
                    className="px-2.5 py-2 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 hover:bg-[#0F5132]/10 hover:border-[#0F5132] dark:hover:border-emerald-500 hover:text-[#0F5132] dark:hover:text-emerald-400 transition cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Planned Start Date &amp; Time
                  </label>
                  {startTime && isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setStartTime('')}
                      className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={startTime}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]/30 focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <span className="text-[11px] text-zinc-400 block">Leave blank to trigger manually</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Target End / Restoration Time
                  </label>
                  {endTime && isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setEndTime('')}
                      className="text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={endTime}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]/30 focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <span className="text-[11px] text-zinc-400 block">Powers public countdown &amp; Retry-After header</span>
              </div>
            </div>

            {/* Internal Reason */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Internal Operational Reason / Change Management Ticket Reference
              </label>
              <input
                type="text"
                value={reason}
                disabled={!isSuperAdmin}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. INFRA-2026-Q4-01: PostgreSQL index maintenance and SSL certificate rotation"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]/30 focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <span className="text-[11px] text-zinc-400 block">Logged strictly in the internal administrator audit trail</span>
            </div>
          </div>

          {/* Section 3: Public Advisory Copy & Support Contacts */}
          <div className="p-6 space-y-5">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-950 dark:text-white">
                <FileText className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                <span>3. Public Advisory Copy &amp; Support Desk Contacts</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Customize the message displayed on <code className="font-mono">/maintenance</code> and returned in HTTP 503 JSON payloads.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Advisory Headline
                  </label>
                  <span className="text-[11px] text-zinc-400 font-mono">{title.length}/100</span>
                </div>
                <input
                  type="text"
                  value={title}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. Scheduled Platform Infrastructure Upgrade"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]/30 focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Explanatory Advisory Message
                  </label>
                  <span className="text-[11px] text-zinc-400 font-mono">{message.length}/500</span>
                </div>
                <textarea
                  rows={3}
                  value={message}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  placeholder="Provide a clear explanation of the maintenance window and reassure residents..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]/30 focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Support Desk Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="support@akwaabahomes.com"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]/30 focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Emergency Support Hotline
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+233 24 000 0000"
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]/30 focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="px-6 py-4 bg-zinc-50/70 dark:bg-zinc-900/50 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-zinc-500">
              {!isSuperAdmin ? (
                <span>Observer mode • Super Admin clearance required for modifications</span>
              ) : hasUnsavedChanges ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">Unsaved configuration edits pending</span>
              ) : (
                <span>All configuration fields synchronized with database</span>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {hasUnsavedChanges && isSuperAdmin && (
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  Discard
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={!isSuperAdmin || updateConfigMutation.isPending || actionInProgress !== null}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {actionInProgress === 'SAVE' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Save Configuration</span>
              </button>

              {!isServerMaintenanceActive && (
                <button
                  type="button"
                  onClick={handleOpenActivationModal}
                  disabled={!isSuperAdmin || updateConfigMutation.isPending || actionInProgress !== null}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Review &amp; Activate</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5/12): Sticky Live Advisory Preview & Exemptions */}
        <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-6">
          
          {/* Live Institutional Public Advisory Preview */}
          <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/90 dark:border-zinc-800 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                <Eye className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                <span>Live Public Advisory Preview</span>
              </div>
              <Link
                href="/maintenance"
                target="_blank"
                className="text-[11px] font-semibold text-[#0F5132] dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Open /maintenance</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* Simulated Public Canvas matching /maintenance */}
            <div className="p-5 bg-[#F8F7F2] dark:bg-[#0B0E14]">
              <div className="rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
                {/* Simulated Top Status Strip */}
                <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/70 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {scope === 'TENANTS_ONLY'
                        ? 'Tenant Portal Advisory'
                        : scope === 'LANDLORDS_ONLY'
                        ? 'Landlord Operations Advisory'
                        : 'Scheduled System Maintenance'}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">HTTP 503 • GMT</span>
                </div>

                {/* Simulated Card Body */}
                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <h4 className="text-base font-bold text-zinc-950 dark:text-white leading-snug">
                      {title || 'Scheduled Platform Maintenance'}
                    </h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {message || 'Our engineering team is currently conducting scheduled database performance enhancements...'}
                    </p>
                  </div>

                  {/* Simulated Schedule Box */}
                  <div className="p-3.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-zinc-400">Commenced</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block truncate">
                        {startTime
                          ? new Date(startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'Immediate Window'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-zinc-400">Est. Restoration</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block truncate">
                        {endTime
                          ? new Date(endTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'Upon verification'}
                      </span>
                    </div>
                  </div>

                  {/* Simulated Support Bar */}
                  <div className="pt-3 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                    <span>Support: <strong className="text-zinc-800 dark:text-zinc-200">{contactPhone || '+233 24 000 0000'}</strong></span>
                    <span className="truncate">{contactEmail || 'support@akwaabahomes.com'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Server-Enforced Access Exemptions & Recovery Guarantees */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/90 dark:border-zinc-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-950 dark:text-white">
              <ShieldCheck className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
              <span>Server-Enforced Exemptions &amp; Recovery Guarantees</span>
            </div>
            <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-900 dark:text-zinc-200">Administrator Bypass:</strong> Requests carrying a valid <code className="font-mono text-[11px]">ADMIN</code> or <code className="font-mono text-[11px]">SUPER_ADMIN</code> JWT bypass maintenance middleware automatically.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-900 dark:text-zinc-200">Admin Gateway &amp; Auth:</strong> <code className="font-mono text-[11px]">/admin/*</code> and <code className="font-mono text-[11px]">/api/v1/auth/login</code> remain 100% reachable so operators can never lock themselves out.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-zinc-900 dark:text-zinc-200">Uptime Probes:</strong> <code className="font-mono text-[11px]">/api/health</code> and <code className="font-mono text-[11px]">/api/v1/config/public</code> remain unthrottled during downtime.
                </span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* ── GENUINE MAINTENANCE AUDIT TRAIL ── */}
      <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/90 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
              <span>Maintenance Governance Audit Trail</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Immutable server records of administrator actions, downtime toggles, and structured field-level diffs.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={historySearchInput}
                onChange={(e) => setHistorySearchInput(e.target.value)}
                placeholder="Search admin, reason, scope..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-[#0F5132] w-48 sm:w-60"
              />
            </div>

            <select
              value={historyActionFilter}
              onChange={(e) => {
                setHistoryActionFilter(e.target.value);
                setHistoryPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 focus:outline-hidden focus:ring-1 focus:ring-[#0F5132]"
            >
              <option value="ALL">All Events</option>
              <option value="MAINTENANCE_ACTIVATED">Activated</option>
              <option value="MAINTENANCE_DEACTIVATED">Deactivated</option>
              <option value="MAINTENANCE_SCHEDULED">Scheduled</option>
              <option value="MAINTENANCE_SCHEDULE_CANCELLED">Schedule Cancelled</option>
              <option value="MAINTENANCE_CONFIG_UPDATED">Config Updated</option>
            </select>

            <button
              type="button"
              onClick={() => refetchHistory()}
              disabled={isFetchingHistory}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
              title="Refresh audit log"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', isFetchingHistory && 'animate-spin text-[#0F5132]')} />
            </button>
          </div>
        </div>

        {/* Audit Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Action Event</th>
                <th className="px-5 py-3">Responsible Administrator</th>
                <th className="px-5 py-3">Scope &amp; Reason</th>
                <th className="px-5 py-3">Field-Level Changes</th>
                <th className="px-4 py-3 text-right">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80 text-zinc-700 dark:text-zinc-300">
              {isLoadingHistory ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0F5132]" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : !historyData?.history || historyData.history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400">
                    No matching maintenance audit events found.
                  </td>
                </tr>
              ) : (
                historyData.history.map((record) => {
                  const newObj = parseAuditPayload(record.newData) || {};
                  const oldObj = parseAuditPayload(record.oldData) || {};
                  const diffPills = computeAuditDiffPills(record.oldData, record.newData, record.action);
                  const structuredRows = computeStructuredDiffRows(record.oldData, record.newData);
                  const isExpanded = expandedAuditId === record.id;
                  const showRawJson = Boolean(showRawJsonIds[record.id]);

                  const actionStyle =
                    record.action === 'MAINTENANCE_ACTIVATED'
                      ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20'
                      : record.action === 'MAINTENANCE_DEACTIVATED'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                      : record.action === 'MAINTENANCE_SCHEDULED'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                      : 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20';

                  const reasonText =
                    newObj?.reason ||
                    newObj?.maintenanceReason ||
                    (record.action === 'MAINTENANCE_DEACTIVATED' ? 'Routine restoration' : 'Administrative update');

                  return (
                    <React.Fragment key={record.id}>
                      <tr className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap text-zinc-500">
                          <div className="font-medium text-zinc-800 dark:text-zinc-200">
                            {new Date(record.createdAt).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {record.ipAddress && (
                            <span className="text-[10px] font-mono text-zinc-400">{record.ipAddress}</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${actionStyle}`}>
                            {record.action}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-200">
                          <div>
                            <span>
                              {record.user
                                ? `${record.user.firstName} ${record.user.lastName}`
                                : 'System Administrator'}
                            </span>
                            <span className="block text-[11px] text-zinc-400">
                              {record.user?.email || 'superadmin'}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 max-w-xs truncate text-zinc-600 dark:text-zinc-400" title={reasonText}>
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {newObj?.maintenanceScope || oldObj?.maintenanceScope || 'GLOBAL'}
                          </div>
                          <div className="truncate text-[11px] text-zinc-500">{reasonText}</div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap gap-1.5">
                            {diffPills.map((pill, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700"
                              >
                                {pill}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setExpandedAuditId(isExpanded ? null : record.id)}
                            className={clsx(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold transition cursor-pointer',
                              isExpanded
                                ? 'border-[#0F5132] bg-[#0F5132]/10 text-[#0F5132] dark:border-emerald-500 dark:text-emerald-400'
                                : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            )}
                          >
                            <span>Inspect</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-zinc-50/80 dark:bg-zinc-900/40">
                          <td colSpan={6} className="px-6 py-4">
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
                                      {Object.keys(newObj).length > 0 ? JSON.stringify(newObj, null, 2) : 'No new state recorded'}
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

      {/* ── TWO-STEP IMPACT CONFIRMATION MODAL ── */}
      {impactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden space-y-5 p-6 sm:p-8 animate-in zoom-in-95">
            
            {/* Header */}
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

            {/* Impact Summary & Live Blast-Radius Telemetry */}
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

            {/* Typed Phrase Safeguard */}
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

            {/* Modal Actions */}
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
