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
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Lock,
  ExternalLink,
  Wrench,
  Megaphone,
  Radio,
  Eye,
  Settings,
  ArrowRight,
  Info,
  Building,
  RefreshCw,
  Users
} from 'lucide-react';
import clsx from 'clsx';
import { useDialog } from '@/providers/DialogProvider';

export default function AdminMaintenancePage() {
  const queryClient = useQueryClient();
  const { confirm } = useDialog();

  const { data: configData, isLoading, refetch } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const res = await api.get('/admin/config');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  const { data: authData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isSuperAdmin = authData?.user?.role === 'SUPER_ADMIN';

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceEndTime, setMaintenanceEndTime] = useState('');
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean } | null>(null);

  useEffect(() => {
    if (configData) {
      setMaintenanceMode(Boolean(configData.maintenanceMode));
      setMaintenanceEndTime(
        configData.maintenanceEndTime ? new Date(configData.maintenanceEndTime).toISOString().slice(0, 16) : ''
      );
    }
  }, [configData]);

  // Live countdown timer calculation
  useEffect(() => {
    if (!maintenanceEndTime) {
      setTimeLeft(null);
      return;
    }

    const calculate = () => {
      const target = new Date(maintenanceEndTime).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isExpired: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [maintenanceEndTime]);

  const updateMutation = useMutation({
    mutationFn: async (payload: { maintenanceMode: boolean; maintenanceEndTime: string | null }) => {
      const res = await api.put('/admin/config', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(
        data.maintenanceMode
          ? 'Platform Maintenance Mode is now ACTIVE across public portals.'
          : 'Maintenance Mode deactivated. Public services restored.'
      );
      queryClient.invalidateQueries({ queryKey: ['admin-config'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update maintenance configuration.');
    },
  });

  const handleToggleMode = async () => {
    if (!isSuperAdmin) {
      toast.error('Elevated Super Administrator clearance is required to toggle Maintenance Mode.');
      return;
    }

    const nextState = !maintenanceMode;
    const confirmed = await confirm({
      title: nextState ? 'Activate Global Maintenance Mode?' : 'Deactivate Maintenance Mode?',
      message: nextState
        ? 'Activating maintenance mode will immediately suspend public browsing, room discovery, and tenant bookings. Visiting users will see the Ghanaian Maintenance Advisory screen. Administrator accounts retain full access via the Admin Gateway.'
        : 'Deactivating maintenance mode will immediately restore live public access, search indexation, and room reservation flows for all tenants and landlords.',
      confirmText: nextState ? 'Activate Maintenance' : 'Restore Public Access',
      cancelText: 'Cancel',
      type: nextState ? 'danger' : 'info',
    });

    if (confirmed) {
      setMaintenanceMode(nextState);
      updateMutation.mutate({
        maintenanceMode: nextState,
        maintenanceEndTime: nextState && maintenanceEndTime ? new Date(maintenanceEndTime).toISOString() : null,
      });
    }
  };

  const handleApplyPresetMinutes = (minutes: number) => {
    const future = new Date(Date.now() + minutes * 60 * 1000);
    const formatted = future.toISOString().slice(0, 16);
    setMaintenanceEndTime(formatted);

    if (maintenanceMode) {
      updateMutation.mutate({
        maintenanceMode: true,
        maintenanceEndTime: future.toISOString(),
      });
    }
  };

  const handleSaveSchedule = () => {
    if (!isSuperAdmin) {
      toast.error('Super Administrator clearance is required.');
      return;
    }

    updateMutation.mutate({
      maintenanceMode,
      maintenanceEndTime: maintenanceEndTime ? new Date(maintenanceEndTime).toISOString() : null,
    });
  };

  const handleClearSchedule = () => {
    setMaintenanceEndTime('');
    if (maintenanceMode) {
      updateMutation.mutate({
        maintenanceMode: true,
        maintenanceEndTime: null,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132] dark:text-emerald-400" />
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          Loading platform availability &amp; maintenance telemetry...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16 animate-in fade-in">
      
      {/* ── HEADER BANNER ── */}
      <div className="p-6 md:p-8 rounded-3xl bg-zinc-950 text-white shadow-md relative overflow-hidden border border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative z-10 space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border',
                maintenanceMode
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              )}
            >
              <Power className="w-3.5 h-3.5" />
              {maintenanceMode ? 'Maintenance Mode: Active' : 'Public Platform: Operational'}
            </span>

            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              Governance &amp; Infrastructure
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <ShieldAlert className={clsx('w-8 h-8', maintenanceMode ? 'text-rose-400' : 'text-emerald-400')} />
            Platform Maintenance Mode
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Control platform availability safeguards, configure scheduled maintenance countdown timers, and broadcast official advisory notices to Ghanaian tenants, landlords, and partners.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10 w-full md:w-auto justify-end">
          <Link
            href="/maintenance"
            target="_blank"
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-xl shadow-xs transition-all cursor-pointer border border-white/20"
          >
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>Preview Public Advisory</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </Link>
        </div>
      </div>

      {/* ── QUICK ACCESS TO RELATED MAINTENANCE HUBS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/tickets"
          className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-[#0F5132]/50 dark:hover:border-emerald-500/40 transition shadow-2xs group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-950 dark:text-white group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 transition-colors">
                Property Repairs &amp; Work Orders
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Tenant maintenance tickets &amp; repairs registry
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/admin/notices"
          className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-[#0F5132]/50 dark:hover:border-emerald-500/40 transition shadow-2xs group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-950 dark:text-white group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 transition-colors">
                Public Notices &amp; Announcements
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Compose global banners &amp; statutory policy notices
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          href="/admin/broadcasts"
          className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800/80 hover:border-[#0F5132]/50 dark:hover:border-emerald-500/40 transition shadow-2xs group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-zinc-950 dark:text-white group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 transition-colors">
                Live Broadcasts &amp; Instant Alerts
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Push real-time socket alerts to all users
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* ── MAIN TWO-COLUMN CONTROLS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Toggle & Schedule Configuration (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card: Global Toggle Switch */}
          <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 max-w-lg">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-zinc-950 dark:text-white">
                    Global Maintenance Mode Switch
                  </h3>
                  {maintenanceMode && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      LIVE ON PROD
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  When enabled, all public web routes, search discovery, and rental bookings are suspended. Visitors see the verified Ghanaian advisory screen with countdown. Administrator routes remain fully operational.
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleMode}
                disabled={updateMutation.isPending}
                className={clsx(
                  'relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-50',
                  maintenanceMode ? 'bg-rose-600' : 'bg-zinc-300 dark:bg-zinc-700'
                )}
                aria-label="Toggle maintenance mode"
              >
                <span
                  className={clsx(
                    'pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
                    maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* Current State Info Banner */}
            <div
              className={clsx(
                'p-4 rounded-2xl border text-xs flex items-start gap-3',
                maintenanceMode
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
              )}
            >
              {maintenanceMode ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <strong className="font-bold block">
                  {maintenanceMode
                    ? 'Public Portals are Currently Offline for Maintenance'
                    : 'All Public Market Services are Fully Operational'}
                </strong>
                <p className="text-[11px] leading-relaxed opacity-90">
                  {maintenanceMode
                    ? 'Only authenticated administrators can navigate through the platform. Scheduled maintenance timer is broadcasting to users.'
                    : 'Tenants can browse verified listings, submit bookings, and make escrow deposits. Landlords have unrestricted portal access.'}
                </p>
              </div>
            </div>
          </div>

          {/* Card: Scheduled Maintenance Window & Duration Presets */}
          <div className="p-6 md:p-8 rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-black text-zinc-950 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Expected Maintenance Completion Window</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Sets the target completion time shown on the live public advisory screen countdown timer.
              </p>
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Quick Duration Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { label: '+15 Mins', mins: 15 },
                  { label: '+30 Mins', mins: 30 },
                  { label: '+1 Hour', mins: 60 },
                  { label: '+2 Hours', mins: 120 },
                  { label: '+4 Hours', mins: 240 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleApplyPresetMinutes(preset.mins)}
                    className="px-3 py-2 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-[#0F5132]/10 hover:border-[#0F5132] dark:hover:border-emerald-500 hover:text-[#0F5132] dark:hover:text-emerald-400 transition cursor-pointer text-center"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Time Picker Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Custom Target End Date &amp; Time (Local / UTC)
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    type="datetime-local"
                    value={maintenanceEndTime}
                    onChange={(e) => setMaintenanceEndTime(e.target.value)}
                    className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-950 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]/20 focus:border-[#0F5132]"
                  />
                </div>
                {maintenanceEndTime && (
                  <button
                    type="button"
                    onClick={handleClearSchedule}
                    className="h-11 px-3 text-xs font-bold text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 transition cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Live Countdown Display if active */}
            {timeLeft && (
              <div className="p-4 rounded-2xl bg-zinc-900 text-white border border-zinc-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Live Broadcast Countdown
                  </span>
                  <p className="text-xs text-zinc-400">Time remaining until public reopening:</p>
                </div>
                <div className="flex items-center gap-2 font-mono font-black text-lg text-emerald-400 bg-black/40 px-3.5 py-1.5 rounded-xl border border-emerald-500/30">
                  <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
                  <span>:</span>
                  <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
                  <span>:</span>
                  <span>{String(timeLeft.seconds).padStart(2, '0')}s</span>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSaveSchedule}
                disabled={updateMutation.isPending || !isSuperAdmin}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Save Maintenance Window</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Public Screen Preview & Security Bypass Protocol (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Public Screen Interactive Preview Card */}
          <div className="p-6 rounded-3xl bg-zinc-950 text-white border border-zinc-800 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-black uppercase tracking-wider text-zinc-200">
                  Public Visitor Advisory Preview
                </h4>
              </div>
              <span className="text-[10px] font-bold text-zinc-500">Live Simulation</span>
            </div>

            {/* Embedded Mini Preview */}
            <div className="p-6 rounded-2xl bg-[#070A08] border border-zinc-800/80 text-center space-y-4 shadow-inner">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center mx-auto text-emerald-400">
                <Wrench className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-1">
                <h5 className="text-sm font-black text-white">System Under Scheduled Maintenance</h5>
                <p className="text-[11px] text-zinc-400 leading-relaxed max-w-xs mx-auto">
                  Our engineering team is executing routine security upgrades and database indexing.
                </p>
              </div>

              {timeLeft && !timeLeft.isExpired ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/60 border border-zinc-700 text-emerald-400 font-mono text-xs font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Est. Reopening: {String(timeLeft.hours).padStart(2, '0')}:
                    {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/60 border border-zinc-700 text-zinc-400 text-[11px]">
                  <span>Resuming shortly</span>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-center gap-4 text-[10px] text-zinc-500">
                <span>Escrow Protected</span>
                <span>•</span>
                <span>Leases Intact</span>
                <span>•</span>
                <span>Accra &amp; Kumasi</span>
              </div>
            </div>

            <Link
              href="/maintenance"
              target="_blank"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-bold border border-zinc-800 transition cursor-pointer"
            >
              <span>Open Full Public Screen</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </Link>
          </div>

          {/* Administrator Bypass Protocol Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-zinc-950 dark:text-white">
              <Lock className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
              <h4 className="text-xs font-black uppercase tracking-wider">
                Administrator Access &amp; Bypass Protocol
              </h4>
            </div>

            <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <p>
                <strong>Bypass Clearance:</strong> Authenticated administrators with valid JWT session tokens bypass the maintenance filter automatically across all administrative and operational endpoints.
              </p>
              <p>
                <strong>Admin Login Gateway:</strong> In the event an administrator is logged out while maintenance mode is active, sign-in remains open exclusively via{' '}
                <Link href="/admin/login" className="text-[#16A34A] dark:text-emerald-400 font-bold hover:underline">
                  /admin/login
                </Link>
                .
              </p>
              <p>
                <strong>Statutory Audits:</strong> All toggles to maintenance mode are immutably recorded in the platform audit log along with the executing administrator&apos;s digital signature and timestamp.
              </p>
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-bold">
              <Link
                href="/admin/audit"
                className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white inline-flex items-center gap-1.5"
              >
                <span>View Audit Trail</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <Link
                href="/admin/config"
                className="text-[#16A34A] dark:text-emerald-400 hover:underline inline-flex items-center gap-1.5"
              >
                <span>All Platform Config</span>
                <Settings className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
