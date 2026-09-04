'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, Settings, ShieldCheck, CreditCard, Users, 
  Save, Power, Clock, AlertTriangle, CheckCircle2, ShieldAlert,
  Percent, Calendar, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function AdminConfigPage() {
  const queryClient = useQueryClient();

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
    setFormData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
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
            Manage statutory Rent Act (Act 220) parameters, Paystack escrow rates, and operational safeguards without redeploying.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
        >
          {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>Save Changes</span>
        </button>
      </div>

      {/* ── SECTION 1: STATUTORY IDENTITY & KYC COMPLIANCE ── */}
      <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <ShieldCheck className="w-4 h-4 text-[#0F5132]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
            1. Identity &amp; Statutory KYC Verification (Act 220)
          </h2>
        </div>

        <div className="flex items-start justify-between gap-6 pt-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-zinc-950 dark:text-white block">
                Enforce Mandatory Ghana Card KYC Validation
              </label>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                Statutory Compliance
              </span>
            </div>
            <p className="text-xs text-zinc-500 max-w-xl leading-relaxed">
              When enabled, both landlords and tenants must submit verified Ghana Card credentials before executing residential leases or receiving Paystack escrow payouts under the Ghana Rent Act, 1963 (Act 220).
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleToggle('ghanaCardVerificationEnabled')}
            className={clsx(
              "w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 mt-1",
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

      {/* ── SECTION 2: FINANCIAL PARAMETERS & ESCROW SETTLEMENTS ── */}
      <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <CreditCard className="w-4 h-4 text-[#0F5132]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
            2. Financial Settlements &amp; Escrow Fees
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
          
          {/* Platform Commission Rate */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-2">
            <div className="flex items-baseline justify-between">
              <label className="text-xs font-bold text-zinc-900 dark:text-white">
                Platform Escrow Commission Rate (%)
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
                value={formData.platformCommissionPercent}
                onChange={(e) => setFormData(prev => ({ ...prev, platformCommissionPercent: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold outline-none focus:border-[#0F5132]"
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
              Maximum window allowed for prospective tenants to complete escrow funding before a locked room slot auto-cancels.
            </p>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="168"
                value={formData.bookingGracePeriodHours}
                onChange={(e) => setFormData(prev => ({ ...prev, bookingGracePeriodHours: parseInt(e.target.value) || 0 }))}
                className="w-full p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold outline-none focus:border-[#0F5132]"
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
            onClick={() => handleToggle('roommateFinderEnabled')}
            className={clsx(
              "w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 mt-1",
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
        <div className="flex items-center gap-2 border-b border-rose-100 dark:border-rose-900/40 pb-3">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            4. System Maintenance Safeguards (High Priority)
          </h2>
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
              onClick={() => handleToggle('maintenanceMode')}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 mt-1",
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
                value={formData.maintenanceEndTime}
                onChange={(e) => setFormData(prev => ({ ...prev, maintenanceEndTime: e.target.value }))}
                className="w-full sm:w-72 p-2 bg-white dark:bg-zinc-900 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-semibold outline-none focus:border-rose-600"
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
