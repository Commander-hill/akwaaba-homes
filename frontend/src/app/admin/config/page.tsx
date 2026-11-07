'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import Link from 'next/link';
import { 
  Loader2, Settings, BadgeCheck, CreditCard, Users, 
  Save, Power, Clock, AlertTriangle, CheckCircle2,
  Percent, Calendar, HelpCircle, ArrowRight, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function AdminConfigPage() {
  const queryClient = useQueryClient();

  const { data: authData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    }
  });
  const isSuperAdmin = authData?.user?.role === 'SUPER_ADMIN';

  const { data: configData, isLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const res = await api.get('/admin/config');
      return res.data;
    }
  });

  const [formData, setFormData] = useState({
    ghanaCardVerificationEnabled: true,
    bookingGracePeriodHours: 48,
    platformCommissionPercent: 5.0,
    roommateFinderEnabled: true,
    maintenanceMode: false,
    maintenanceEndTime: '',
  });

  useEffect(() => {
    if (configData) {
      setFormData({
        ghanaCardVerificationEnabled: configData.ghanaCardVerificationEnabled,
        bookingGracePeriodHours: configData.bookingGracePeriodHours,
        platformCommissionPercent: configData.platformCommissionPercent,
        roommateFinderEnabled: configData.roommateFinderEnabled,
        maintenanceMode: configData.maintenanceMode,
        maintenanceEndTime: configData.maintenanceEndTime ? new Date(configData.maintenanceEndTime).toISOString().slice(0, 16) : '',
      });
    }
  }, [configData]);

  const updateMutation = useMutation({
    mutationFn: async (updatedConfig: typeof formData) => {
      const res = await api.put('/admin/config', updatedConfig);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Platform configuration updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-config'] });
    },
    onError: () => {
      toast.error('Failed to update platform configuration.');
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        <p className="text-xs font-bold text-zinc-400">Loading platform settings...</p>
      </div>
    );
  }

  const handleToggle = (key: keyof typeof formData) => {
    if (!isSuperAdmin) {
      toast.error('Super Admin clearance required to modify platform configuration.');
      return;
    }
    setFormData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    if (!isSuperAdmin) {
      toast.error('Super Admin clearance required to alter configuration.');
      return;
    }
    updateMutation.mutate(formData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 text-zinc-900 dark:text-white animate-in">
      
      {/* ── TOP ACTION HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Platform Configuration Studio
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#0F5132] dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Live Production Controls
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Manage platform policies, Paystack commission rates, and operational safeguards without redeploying.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={!isSuperAdmin || updateMutation.isPending}
          title={!isSuperAdmin ? 'Super Admin clearance required to save changes' : undefined}
          className={clsx(
            "px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors shrink-0",
            isSuperAdmin
              ? "bg-[#16A34A] hover:bg-[#15803D] text-white cursor-pointer"
              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
          )}
        >
          {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isSuperAdmin ? <Save className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          <span>{isSuperAdmin ? 'Save Changes' : 'Super Admin Restricted'}</span>
        </button>
      </div>

      {/* ── SUPER ADMIN CLEARANCE ALERT BANNER ── */}
      {!isSuperAdmin && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs shadow-2xs">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold">Read-Only Governance Mode</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-0.5">
              You are viewing system configuration in read-only mode. Modifying statutory KYC policies, commission rates, or emergency maintenance triggers requires elevated <span className="font-bold">SUPER_ADMIN</span> clearance.
            </p>
          </div>
        </div>
      )}

      {/* ── SECTION 1: IDENTITY & KYC COMPLIANCE ── */}
      <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <BadgeCheck className="w-4 h-4 text-[#0F5132]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
            1. Identity &amp; KYC Verification Policy
          </h2>
        </div>

        <div className="flex items-start justify-between gap-6 pt-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-zinc-950 dark:text-white block">
                Enforce Mandatory Ghana Card KYC Validation
              </label>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                Platform Policy
              </span>
            </div>
            <p className="text-xs text-zinc-500 max-w-xl leading-relaxed">
              When enabled, both landlords and tenants must submit verified Ghana Card credentials before executing leases or receiving Paystack payouts.
            </p>
          </div>

          <button
            type="button"
            disabled={!isSuperAdmin}
            onClick={() => handleToggle('ghanaCardVerificationEnabled')}
            className={clsx(
              "w-12 h-6 rounded-full transition-colors relative shrink-0 mt-1",
              isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-80",
              formData.ghanaCardVerificationEnabled ? "bg-[#0F5132]" : "bg-zinc-300 dark:bg-zinc-700"
            )}
          >
            <span className={clsx(
              "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-xs",
              formData.ghanaCardVerificationEnabled ? "translate-x-6" : "translate-x-0"
            )} />
          </button>
        </div>
      </div>

      {/* ── SECTION 2: FINANCIAL PARAMETERS & SETTLEMENTS ── */}
      <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <CreditCard className="w-4 h-4 text-[#0F5132]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
            2. Financial Settlements &amp; Platform Fees
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
          
          {/* Platform Commission Rate */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
            <div className="flex items-baseline justify-between">
              <label className="text-xs font-bold text-zinc-900 dark:text-white">
                Platform Commission Rate (%)
              </label>
              <span className="text-xs font-black text-[#0F5132]">
                {formData.platformCommissionPercent}%
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Operational service fee deducted from gross rental payments settled through Paystack MoMo &amp; Cards.
            </p>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                max="30"
                disabled={!isSuperAdmin}
                value={formData.platformCommissionPercent}
                onChange={(e) => setFormData(prev => ({ ...prev, platformCommissionPercent: parseFloat(e.target.value) || 0 }))}
                className={clsx(
                  "w-full p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold outline-none focus:border-[#0F5132]",
                  !isSuperAdmin && "opacity-70 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/50"
                )}
              />
              <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-bold">%</span>
            </div>
          </div>

          {/* Booking Grace Period */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
            <div className="flex items-baseline justify-between">
              <label className="text-xs font-bold text-zinc-900 dark:text-white">
                Reservation Holding Grace Period (Hours)
              </label>
              <span className="text-xs font-black text-[#0F5132]">
                {formData.bookingGracePeriodHours} hrs
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Maximum window allowed for prospective tenants to complete payment before a locked room slot auto-cancels.
            </p>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="168"
                disabled={!isSuperAdmin}
                value={formData.bookingGracePeriodHours}
                onChange={(e) => setFormData(prev => ({ ...prev, bookingGracePeriodHours: parseInt(e.target.value) || 0 }))}
                className={clsx(
                  "w-full p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold outline-none focus:border-[#0F5132]",
                  !isSuperAdmin && "opacity-70 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/50"
                )}
              />
              <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-bold">hrs</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── SECTION 3: CO-LIVING & GENERAL RENTAL FEATURE CONTROLS ── */}
      <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <Users className="w-4 h-4 text-[#0F5132]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
            3. Feature Controls &amp; Co-Living Studio
          </h2>
        </div>

        <div className="flex items-start justify-between gap-6 pt-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-zinc-950 dark:text-white block">
                Verified Co-Living &amp; Flatmate Matching Engine
              </label>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-[#0F5132] border border-emerald-200">
                General Rental Feature
              </span>
            </div>
            <p className="text-xs text-zinc-500 max-w-xl leading-relaxed">
              Enables the lifestyle percentage matching studio across the platform, allowing young working professionals and scholars to find compatible co-tenants and split apartment leases.
            </p>
          </div>

          <button
            type="button"
            disabled={!isSuperAdmin}
            onClick={() => handleToggle('roommateFinderEnabled')}
            className={clsx(
              "w-12 h-6 rounded-full transition-colors relative shrink-0 mt-1",
              isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-80",
              formData.roommateFinderEnabled ? "bg-[#0F5132]" : "bg-zinc-300 dark:bg-zinc-700"
            )}
          >
            <span className={clsx(
              "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-xs",
              formData.roommateFinderEnabled ? "translate-x-6" : "translate-x-0"
            )} />
          </button>
        </div>
      </div>

      {/* ── SECTION 4: PLATFORM AVAILABILITY & MAINTENANCE SAFEGUARDS ── */}
      <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-rose-200 dark:border-rose-900/50 p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-rose-100 dark:border-rose-900/40 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              4. System Maintenance Safeguards (High Priority)
            </h2>
          </div>
          <Link
            href="/admin/maintenance"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400 hover:underline"
          >
            <span>Open Dedicated Maintenance Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-4 pt-1">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <label className="text-sm font-bold text-zinc-950 dark:text-white block">
                  Global Maintenance Mode
                </label>
                {formData.maintenanceMode && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 animate-pulse">
                    ACTIVE DOWNTIME
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 max-w-xl leading-relaxed">
                Temporarily suspends public browsing and reservations for non-admin accounts. Displays an official Ghanaian maintenance advisory screen with live countdown timer.
              </p>
            </div>

            <button
              type="button"
              disabled={!isSuperAdmin}
              onClick={() => handleToggle('maintenanceMode')}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative shrink-0 mt-1",
                isSuperAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-80",
                formData.maintenanceMode ? "bg-rose-600" : "bg-zinc-300 dark:bg-zinc-700"
              )}
            >
              <span className={clsx(
                "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow-xs",
                formData.maintenanceMode ? "translate-x-6" : "translate-x-0"
              )} />
            </button>
          </div>

          {formData.maintenanceMode && (
            <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2 animate-in text-xs">
              <label className="font-bold text-rose-950 dark:text-rose-200 block">
                Expected Maintenance Completion Time
              </label>
              <p className="text-[11px] text-zinc-500">
                Drives the public countdown timer presented to visiting tenants and landlords during the scheduled maintenance window.
              </p>
              <input
                type="datetime-local"
                disabled={!isSuperAdmin}
                value={formData.maintenanceEndTime}
                onChange={(e) => setFormData(prev => ({ ...prev, maintenanceEndTime: e.target.value }))}
                className={clsx(
                  "w-full sm:w-72 p-2 bg-white dark:bg-zinc-900 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-semibold outline-none focus:border-rose-600",
                  !isSuperAdmin && "opacity-70 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/50"
                )}
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
