'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Settings, ShieldAlert, CreditCard, Users, Construction, Save, Power } from 'lucide-react';
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
      toast.error('Failed to update configuration.');
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
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
    <div className="space-y-6 pb-12 animate-in fade-in max-w-4xl mx-auto">
      
      {/* Header Banner */}
      <div className="glass-card p-8 rounded-3xl border border-[var(--border)] bg-gradient-to-r from-slate-900/20 via-indigo-900/10 to-sky-900/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
            <Settings className="w-4 h-4" /> Operations
          </div>
          <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">
            Platform Configuration
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Manage global platform behaviors, feature flags, and operational parameters without requiring backend redeploys.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-extrabold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security Settings */}
        <div className="glass-card p-6 rounded-3xl border border-[var(--border)] space-y-6">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-4">
            <ShieldAlert className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Security & Identity</h2>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <label className="text-sm font-bold text-[var(--foreground)] block">Ghana Card KYC Verification</label>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Enforce mandatory Ghana Card validation for new user registrations.</p>
            </div>
            <button
              onClick={() => handleToggle('ghanaCardVerificationEnabled')}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative",
                formData.ghanaCardVerificationEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
              )}
            >
              <span className={clsx(
                "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform",
                formData.ghanaCardVerificationEnabled ? "translate-x-6" : "translate-x-0"
              )} />
            </button>
          </div>
        </div>

        {/* Financial Settings */}
        <div className="glass-card p-6 rounded-3xl border border-[var(--border)] space-y-6">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-4">
            <CreditCard className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Billing & Financials</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-[var(--foreground)] block mb-1">Platform Commission Rate (%)</label>
              <p className="text-[10px] text-[var(--muted-foreground)] mb-2">Percentage fee deducted from successful property bookings.</p>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.platformCommissionPercent}
                onChange={(e) => setFormData(prev => ({ ...prev, platformCommissionPercent: parseFloat(e.target.value) || 0 }))}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-[var(--foreground)] block mb-1">Booking Grace Period (Hours)</label>
              <p className="text-[10px] text-[var(--muted-foreground)] mb-2">Time allowed for tenant payment before auto-canceling a pending booking.</p>
              <input
                type="number"
                min="1"
                value={formData.bookingGracePeriodHours}
                onChange={(e) => setFormData(prev => ({ ...prev, bookingGracePeriodHours: parseInt(e.target.value) || 0 }))}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
          </div>
        </div>

        {/* Feature Flags */}
        <div className="glass-card p-6 rounded-3xl border border-[var(--border)] space-y-6">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-4">
            <Users className="w-5 h-5 text-sky-500" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">Feature Flags</h2>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <label className="text-sm font-bold text-[var(--foreground)] block">Roommate Finder Engine</label>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Allow students to create and match with roommate profiles globally.</p>
            </div>
            <button
              onClick={() => handleToggle('roommateFinderEnabled')}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative",
                formData.roommateFinderEnabled ? "bg-sky-500" : "bg-slate-300 dark:bg-slate-700"
              )}
            >
              <span className={clsx(
                "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform",
                formData.roommateFinderEnabled ? "translate-x-6" : "translate-x-0"
              )} />
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card p-6 rounded-3xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10 space-y-6">
          <div className="flex items-center gap-2 border-b border-red-200 dark:border-red-900/50 pb-4">
            <Construction className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-bold text-red-600 dark:text-red-500">Danger Zone</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <label className="text-sm font-bold text-red-700 dark:text-red-400 block flex items-center gap-1">
                  <Power className="w-4 h-4" /> Global Maintenance Mode
                </label>
                <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">Disables access for all non-admin users. Displays maintenance splash screen.</p>
              </div>
              <button
                onClick={() => handleToggle('maintenanceMode')}
                className={clsx(
                  "w-12 h-6 rounded-full transition-colors relative shadow-inner",
                  formData.maintenanceMode ? "bg-red-600" : "bg-red-200 dark:bg-red-900/50"
                )}
              >
                <span className={clsx(
                  "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow",
                  formData.maintenanceMode ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>

            {formData.maintenanceMode && (
              <div className="pt-2 border-t border-red-200 dark:border-red-900/40 animate-in fade-in">
                <label className="text-xs font-extrabold text-red-800 dark:text-red-300 block mb-1">
                  📅 Estimated Maintenance Completion Time
                </label>
                <p className="text-[10px] text-red-600/80 dark:text-red-400/80 mb-2">
                  Set the expected date and time for maintenance completion to drive the public countdown timer.
                </p>
                <input
                  type="datetime-local"
                  value={formData.maintenanceEndTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, maintenanceEndTime: e.target.value }))}
                  className="w-full p-2.5 bg-white dark:bg-slate-900 border border-red-300 dark:border-red-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-500/40 text-slate-800 dark:text-slate-200"
                />
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
