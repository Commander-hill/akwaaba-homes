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
  Activity
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

/**
 * Computes human-readable field-level diff summaries between `oldData` and `newData`.
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
  const [activeTab, setActiveTab] = useState<'policy' | 'message' | 'schedule'>('policy');

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
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Loading platform availability &amp; maintenance governance controls...
        </p>
      </div>
    );
  }

  // ── Explicit Telemetry Error / Unknown State (Never infer "Online" when backend query fails) ──
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

        <div className="p-8 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-900/60 max-w-2xl mx-auto my-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center border border-rose-500/20">
            <WifiOff className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
              Status Unknown • Telemetry Unreachable
            </span>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
              Unable to Verify Live Platform Availability State
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed">
              The administration portal could not retrieve the current <code className="font-mono">SystemConfig</code> state from <code className="font-mono">/api/v1/admin/config</code>. For operational safety, maintenance controls are locked until live state verification succeeds.
            </p>
            {(configError as any)?.response?.data?.message && (
              <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400 pt-1">
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
            <Server className="w-3 h-3 text-[#0F5132] dark:text-emerald-400" />
            <span>Environment: Production (GMT / UTC+00:00)</span>
          </span>

          <button
            type="button"
            onClick={() => {
              refetchConfig();
              refetchHistory();
            }}
            disabled={isFetchingConfig}
            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
            title="Refresh status"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', isFetchingConfig && 'animate-spin text-[#0F5132]')} />
          </button>

          <Link
            href="/maintenance"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
            <span>Preview Advisory</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </Link>
        </div>
      </div>

      {/* ── READ-ONLY CLEARANCE BANNER FOR STANDARD ADMINS ── */}
      {isReadOnlyAdmin && (
        <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-300 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-zinc-900 dark:text-white">Observer Mode (Read-Only Clearance): </span>
              <span>
                Your account role (<code className="font-mono font-semibold">{userRole}</code>) can inspect maintenance telemetry and audit logs, but <code className="font-mono font-semibold">SUPER_ADMIN</code> clearance is required to modify configuration or toggle platform availability.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
            Controls Locked
          </span>
        </div>
      )}

      {/* ── PAGE TITLE & PURPOSE ── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2.5">
          <ShieldAlert className={clsx('w-6 h-6', isServerMaintenanceActive ? 'text-rose-600 dark:text-rose-400' : 'text-[#0F5132] dark:text-emerald-400')} />
          <span>Maintenance Mode</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
          Control planned downtime, restrict access during maintenance, and manage the return to normal platform operations.
        </p>
      </div>

      {/* ── OPERATIONAL STATUS SECTION ── */}
      <div
        className={clsx(
          'p-5 sm:p-6 rounded-2xl border transition-all',
          isServerMaintenanceActive
            ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
            : serverScheduled
            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-900/60'
            : 'bg-white dark:bg-[#12151D] border-zinc-200/90 dark:border-zinc-800'
        )}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Status Badge & Headline */}
          <div className="space-y-3 max-w-3xl flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border',
                  isServerMaintenanceActive
                    ? 'bg-rose-600 text-white border-rose-700'
                    : serverScheduled
                    ? 'bg-amber-500 text-white border-amber-600'
                    : 'bg-emerald-600 text-white border-emerald-700'
                )}
              >
                <Power className="w-3 h-3" />
                {isServerMaintenanceActive
                  ? 'Maintenance Active: Platform Disrupted'
                  : serverScheduled
                  ? 'Maintenance Scheduled'
                  : 'Normal Operation: All Services Online'}
              </span>

              <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                Scope: {configData?.maintenanceScope === 'TENANTS_ONLY'
                  ? 'Tenant Portal Only'
                  : configData?.maintenanceScope === 'LANDLORDS_ONLY'
                  ? 'Landlord Operations Only'
                  : 'Entire Platform (Global)'}
              </span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
                {isServerMaintenanceActive
                  ? 'Platform is Currently Offline for Maintenance'
                  : serverScheduled
                  ? 'Planned Maintenance Window Scheduled'
                  : 'Public Services and Portals are Fully Operational'}
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                {isServerMaintenanceActive
                  ? 'Public listing discovery and student/tenant room reservations are temporarily blocked with HTTP 503 Service Unavailable. Authenticated administrators retain full governance access.'
                  : serverScheduled
                  ? `Maintenance is configured to commence at ${serverStartTime ? new Date(serverStartTime).toLocaleString() : 'scheduled time'}. Public visitors will see advance warning.`
                  : 'Students and tenants can search accommodations, book beds, and complete payments. Landlords have uninterrupted property management access.'}
              </p>
            </div>

            {/* Metadata & Blast-Radius Telemetry Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                <span className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">Effective Start</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-200 truncate block mt-0.5">
                  {serverStartTime ? new Date(serverStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : 'Immediate'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                <span className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">Target Restoration</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-200 truncate block mt-0.5">
                  {serverEndTime ? new Date(serverEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : 'Unspecified'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                <span className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">In-Flight Bookings</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-200 truncate block mt-0.5">
                  {operationalContext.activeBookingsInFlight} Pending
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                <span className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">Notify Queue</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-200 truncate block mt-0.5">
                  {operationalContext.pendingSubscribersCount} Subscribers
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                <span className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">Last Modified</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-200 truncate block mt-0.5">
                  {configData?.updatedAt ? new Date(configData.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : 'Just now'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                <span className="block text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">Updated By</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-200 truncate block mt-0.5" title={configData?.maintenanceUpdatedBy || 'Administrator'}>
                  {configData?.maintenanceUpdatedBy ? configData.maintenanceUpdatedBy.split(' ')[0] : 'System'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Center & Countdown */}
          <div className="flex flex-col items-start lg:items-end justify-between gap-4 shrink-0">
            {/* Live Countdown Display */}
            {countdown && !countdown.isExpired && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <Clock className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                <div className="text-left">
                  <div className="text-[10px] uppercase font-bold text-zinc-500">
                    {isServerMaintenanceActive ? 'Target Completion In' : 'Starts In'}
                  </div>
                  <div className="font-mono text-sm font-bold text-zinc-900 dark:text-white">
                    {String(countdown.hours).padStart(2, '0')}:{String(countdown.minutes).padStart(2, '0')}:{String(countdown.seconds).padStart(2, '0')}
                  </div>
                </div>
              </div>
            )}

            {/* Principal Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {isServerMaintenanceActive ? (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={!isSuperAdmin || updateConfigMutation.isPending || actionInProgress !== null}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>

      {/* ── UNSAVED CHANGES BANNER ── */}
      {hasUnsavedChanges && isSuperAdmin && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>You have unsaved maintenance configuration changes. Save draft or apply when ready.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDiscardChanges}
              className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:underline cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={updateConfigMutation.isPending}
              className="px-4 py-1.5 rounded-lg bg-[#0F5132] hover:bg-[#0c4027] text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>
          </div>
        </div>
      )}

      {/* ── CONFIGURATION WORKSPACE (TABS) ── */}
      <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/90 dark:border-zinc-800 shadow-xs overflow-hidden">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 px-6 pt-3 gap-6 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('policy')}
            className={clsx(
              'pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'policy'
                ? 'border-[#0F5132] dark:border-emerald-500 text-[#0F5132] dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            )}
          >
            <Sliders className="w-4 h-4" />
            <span>Scope &amp; Access Policy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('message')}
            className={clsx(
              'pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'message'
                ? 'border-[#0F5132] dark:border-emerald-500 text-[#0F5132] dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            )}
          >
            <FileText className="w-4 h-4" />
            <span>Public Advisory Message</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={clsx(
              'pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'schedule'
                ? 'border-[#0F5132] dark:border-emerald-500 text-[#0F5132] dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            )}
          >
            <Calendar className="w-4 h-4" />
            <span>Scheduled Maintenance Window</span>
          </button>
        </div>

        {/* Tab 1: Scope & Access Policy */}
        {activeTab === 'policy' && (
          <div className="p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Application Maintenance Scope
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Specify which platform users and endpoints are held in maintenance mode. Restrictions are enforced by server middleware.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Option 1: Global */}
              <label
                className={clsx(
                  'p-4 rounded-xl border-2 transition flex flex-col justify-between space-y-3',
                  !isSuperAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer',
                  scope === 'GLOBAL'
                    ? 'border-[#0F5132] dark:border-emerald-500 bg-emerald-500/5'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                      <Globe className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                      <span>Entire Platform (Global)</span>
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
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Suspends all public discovery, room searches, resident portals, and landlord management tools. Full platform outage.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                  Enforcement: All Non-Admin API Routes Blocked (503)
                </span>
              </label>

              {/* Option 2: Tenant Portal Only */}
              <label
                className={clsx(
                  'p-4 rounded-xl border-2 transition flex flex-col justify-between space-y-3',
                  !isSuperAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer',
                  scope === 'TENANTS_ONLY'
                    ? 'border-[#0F5132] dark:border-emerald-500 bg-emerald-500/5'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                      <Users className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                      <span>Tenant &amp; Resident Portal Only</span>
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
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Suspends tenant listings search, room bookings, and resident tools. Landlord and Caretaker portals remain fully functional.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                  Enforcement: Public &amp; Tenant Routes Blocked
                </span>
              </label>

              {/* Option 3: Landlord Portal Only */}
              <label
                className={clsx(
                  'p-4 rounded-xl border-2 transition flex flex-col justify-between space-y-3',
                  !isSuperAdmin ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer',
                  scope === 'LANDLORDS_ONLY'
                    ? 'border-[#0F5132] dark:border-emerald-500 bg-emerald-500/5'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                      <Building2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                      <span>Landlord Operations Only</span>
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
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Pauses landlord property creation, payouts, and utility sub-meters. Public tenant browsing and booking remains live.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                  Enforcement: Landlord Endpoints Paused
                </span>
              </label>
            </div>

            {/* Access Exemptions Summary */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                <ShieldCheck className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                <span>Server-Enforced Access Exemptions &amp; Recovery Guarantees</span>
              </div>
              <ul className="text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1 list-disc pl-5">
                <li>
                  <strong>Administrators &amp; Super Admins:</strong> All requests bearing valid admin JWT tokens bypass maintenance mode automatically via server middleware.
                </li>
                <li>
                  <strong>Admin Gateway &amp; Auth:</strong> Routes <code className="text-zinc-800 dark:text-zinc-200 font-mono">/admin/*</code> and <code className="text-zinc-800 dark:text-zinc-200 font-mono">/api/v1/auth/login</code> remain 100% accessible to ensure platform recovery.
                </li>
                <li>
                  <strong>Health Monitoring:</strong> The operational health endpoint <code className="text-zinc-800 dark:text-zinc-200 font-mono">/api/health</code> is unthrottled and exempt from maintenance barriers.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Tab 2: Public Advisory Message */}
        {activeTab === 'message' && (
          <div className="p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Public Advisory Banner &amp; Content
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Configure the advisory copy displayed to affected visitors when maintenance mode is active.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Advisory Headline
                  </label>
                  <input
                    type="text"
                    value={title}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    placeholder="e.g. Scheduled Platform Infrastructure Upgrade"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <span className="text-[10px] text-zinc-400 block text-right">{title.length}/100</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Explanatory Message (Displayed to users)
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={500}
                    placeholder="Provide a concise, professional explanation of the maintenance purpose..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <span className="text-[10px] text-zinc-400 block text-right">{message.length}/500</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Support Contact Email
                    </label>
                    <input
                      type="email"
                      value={contactEmail}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="support@akwaabahomes.com"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Support Phone Hotline
                    </label>
                    <input
                      type="text"
                      value={contactPhone}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="+233 24 000 0000"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Real-time Preview Container */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                    <span>Live Public Advisory Screen Preview</span>
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">Exact visitor render</span>
                </div>

                <div className="p-6 rounded-2xl bg-[#F8F7F2] dark:bg-[#070B09] border border-zinc-200 dark:border-zinc-800 text-center space-y-4">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                    {scope === 'TENANTS_ONLY'
                      ? 'Tenant Portal Advisory'
                      : scope === 'LANDLORDS_ONLY'
                      ? 'Landlord Operations Advisory'
                      : 'Scheduled System Maintenance'}
                  </span>

                  <h4 className="text-base font-black text-zinc-950 dark:text-white leading-tight">
                    {title || 'Scheduled Platform Maintenance'}
                  </h4>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                    {message || 'Our engineering team is currently conducting scheduled database performance enhancements...'}
                  </p>

                  <div className="pt-2 text-[10px] text-zinc-500 border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-center gap-3">
                    <span>Hotline: {contactPhone || '+233 24 000 0000'}</span>
                    <span>•</span>
                    <span>{contactEmail || 'support@akwaabahomes.com'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Scheduled Maintenance Window */}
        {activeTab === 'schedule' && (
          <div className="p-6 space-y-6">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Scheduled Maintenance Window &amp; Automation
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Plan ahead for routine deployments. The server automatically activates maintenance when the start time is reached and deactivates when the end time expires (local browser time; Ghana operates on GMT / UTC+00:00).
              </p>
            </div>

            {/* Quick Duration Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Quick Target Duration Presets (Relative to Start Time or Now)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
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
                    className="px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-[#0F5132]/10 hover:border-[#0F5132] dark:hover:border-emerald-500 hover:text-[#0F5132] dark:hover:text-emerald-400 transition cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Planned Start Date &amp; Time (Local / GMT)
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <span className="text-[10px] text-zinc-400">Leave blank to activate manually</span>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Target End / Restoration Time (Local / GMT)
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  disabled={!isSuperAdmin}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <span className="text-[10px] text-zinc-400">Used for countdown and automatic restoration</span>
              </div>
            </div>

            {/* Internal Reason */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Internal Operational Reason / Change Management Ticket Ref
              </label>
              <input
                type="text"
                value={reason}
                disabled={!isSuperAdmin}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. INFRA-2026-Q4-01: PostgreSQL high-availability failover and SSL cert rotation"
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <span className="text-[10px] text-zinc-400">Recorded strictly in administrator audit logs</span>
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-zinc-500">
            {!isSuperAdmin ? (
              <span className="text-zinc-500">Read-only observer view • Super Admin required for edits</span>
            ) : hasUnsavedChanges ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">Unsaved edits pending</span>
            ) : (
              <span>Configuration synchronized with database</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && isSuperAdmin && (
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
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

      {/* ── GENUINE MAINTENANCE AUDIT TRAIL ── */}
      <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/90 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
              <span>Maintenance Governance Audit Trail</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Immutable server records of administrator actions, downtime toggles, and field-level configuration diffs.
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
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-[#0F5132] w-48 sm:w-56"
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
                <th className="px-4 py-3 text-right">Inspect</th>
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
                  const isExpanded = expandedAuditId === record.id;

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
                        <td className="px-5 py-3 whitespace-nowrap text-zinc-500">
                          <div>
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

                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${actionStyle}`}>
                            {record.action}
                          </span>
                        </td>

                        <td className="px-5 py-3 whitespace-nowrap font-medium text-zinc-900 dark:text-zinc-200">
                          <div>
                            <span>
                              {record.user
                                ? `${record.user.firstName} ${record.user.lastName}`
                                : 'System Administrator'}
                            </span>
                            <span className="block text-[10px] text-zinc-400">
                              {record.user?.email || 'superadmin'}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-3 max-w-xs truncate text-zinc-600 dark:text-zinc-400" title={reasonText}>
                          <div className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {newObj?.maintenanceScope || oldObj?.maintenanceScope || 'GLOBAL'}
                          </div>
                          <div className="truncate text-[11px] text-zinc-500">{reasonText}</div>
                        </td>

                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1">
                            {diffPills.map((pill, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700"
                              >
                                {pill}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setExpandedAuditId(isExpanded ? null : record.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                          >
                            <span>Diff</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-zinc-50/70 dark:bg-zinc-900/40">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                              <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                                <div className="font-bold text-zinc-500 uppercase tracking-wider text-[10px]">
                                  Previous State Snapshot (oldData)
                                </div>
                                <pre className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                                  {Object.keys(oldObj).length > 0 ? JSON.stringify(oldObj, null, 2) : 'No prior state recorded'}
                                </pre>
                              </div>

                              <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                                <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[10px]">
                                  Applied State Snapshot (newData)
                                </div>
                                <pre className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                                  {Object.keys(newObj).length > 0 ? JSON.stringify(newObj, null, 2) : 'No new state recorded'}
                                </pre>
                              </div>
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
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500">
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
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden space-y-5 p-6 sm:p-8 animate-in zoom-in-95">
            
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-zinc-950 dark:text-white">
                  Confirm Platform Maintenance Mode Activation
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  You are about to suspend live public services on AkwaabaHomes. Please review the operational blast radius before confirming.
                </p>
              </div>
            </div>

            {/* Impact Summary & Live Blast-Radius Telemetry */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2.5 text-xs">
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
                <span className="text-zinc-500 flex items-center gap-1">
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
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500 font-mono font-bold"
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
