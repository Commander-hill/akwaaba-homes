'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/axios';
import {
  Loader2,
  Settings,
  ShieldCheck,
  Coins,
  Building2,
  Home,
  BedDouble,
  Save,
  Clock,
  CheckCircle2,
  Percent,
  ArrowRight,
  Lock,
  ChevronUp,
  ChevronDown,
  Wallet,
  FileSpreadsheet,
  Sliders,
  AlertCircle,
  Users,
  Store,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import QueryErrorFallback from '@/components/ui/QueryErrorFallback';

type ConfigTab =
  | 'GENERAL'
  | 'FINANCIAL'
  | 'SUBSCRIPTIONS'
  | 'FEATURES'
  | 'MAINTENANCE';

type SectionKey = 'kyc' | 'financial' | 'subscriptions' | 'advanced';

/** Stylized Ghana Card mini illustration matching the KYC status card */
function GhanaCardGraphic({ active }: { active: boolean }) {
  return (
    <div
      className={clsx(
        'relative w-24 h-16 rounded-xl border shadow-xs shrink-0 overflow-hidden select-none transition-all',
        active
          ? 'bg-white dark:bg-zinc-900 border-emerald-200/80 dark:border-emerald-800/60'
          : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 opacity-60 grayscale'
      )}
      aria-hidden="true"
    >
      {/* Top micro header strip */}
      <div className="h-3.5 px-2 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-950/60 dark:to-sky-950/60 border-b border-zinc-100 dark:border-zinc-800">
        <div className="w-8 h-1 rounded-full bg-emerald-600/40" />
        {/* Ghana Flag */}
        <div className="w-4 h-2.5 rounded-[2px] overflow-hidden flex flex-col border border-black/10">
          <div className="flex-1 bg-[#CE1126]" />
          <div className="flex-1 bg-[#FCD116] flex items-center justify-center">
            <span className="w-0.5 h-0.5 rounded-full bg-black" />
          </div>
          <div className="flex-1 bg-[#006B3F]" />
        </div>
      </div>

      {/* Card body: avatar silhouette + credential lines */}
      <div className="p-2 flex items-center gap-2">
        <div className="w-7 h-8 rounded-md bg-sky-100/90 dark:bg-sky-950/70 border border-sky-200/60 dark:border-sky-800/50 flex flex-col items-center justify-end overflow-hidden shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-500/70 mb-0.5" />
          <div className="w-5 h-3 rounded-t-full bg-sky-600/70" />
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-1.5 w-4/5 rounded-full bg-zinc-200/80 dark:bg-zinc-700/80" />
          <div className="h-1 w-3/5 rounded-full bg-emerald-500/40" />
        </div>
      </div>
    </div>
  );
}

export default function AdminConfigPage() {
  const queryClient = useQueryClient();

  const { data: authData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
  });
  const isSuperAdmin = authData?.user?.role === 'SUPER_ADMIN';

  const { data: configData, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['admin-config'],
    queryFn: async () => {
      const res = await api.get('/admin/config');
      return res.data;
    },
  });

  const [activeTab, setActiveTab] = useState<ConfigTab>('GENERAL');
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    kyc: true,
    financial: true,
    subscriptions: true,
    advanced: true,
  });

  const [formData, setFormData] = useState({
    ghanaCardVerificationEnabled: true,
    bookingGracePeriodHours: 48,
    platformCommissionPercent: 5.0,
    subscriptionFeeStudioGhs: 100,
    subscriptionFeeApartmentGhs: 150,
    subscriptionFeeHouseGhs: 200,
    subscriptionFeeHostelGhs: 300,
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
        subscriptionFeeStudioGhs: configData.subscriptionFeeStudioGhs ?? 100,
        subscriptionFeeApartmentGhs: configData.subscriptionFeeApartmentGhs ?? 150,
        subscriptionFeeHouseGhs: configData.subscriptionFeeHouseGhs ?? 200,
        subscriptionFeeHostelGhs: configData.subscriptionFeeHostelGhs ?? 300,
        roommateFinderEnabled: configData.roommateFinderEnabled,
        maintenanceMode: configData.maintenanceMode,
        maintenanceEndTime: configData.maintenanceEndTime
          ? new Date(configData.maintenanceEndTime).toISOString().slice(0, 16)
          : '',
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
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update platform configuration.');
    },
  });

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggle = (key: keyof typeof formData) => {
    if (!isSuperAdmin) {
      toast.error('Super Admin clearance required to modify platform configuration.');
      return;
    }
    setFormData((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    if (!isSuperAdmin) {
      toast.error('Super Admin clearance required to alter configuration.');
      return;
    }
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#127337]" />
        <p className="text-xs font-bold text-zinc-400">Loading platform settings...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-5xl mx-auto py-12">
        <QueryErrorFallback
          title="Unable to load platform configuration"
          onRetry={() => refetch()}
          isRetrying={isRefetching}
        />
      </div>
    );
  }

  const tabs: Array<{ id: ConfigTab; label: string; icon: React.ElementType }> = [
    { id: 'GENERAL', label: 'General Settings', icon: Settings },
    { id: 'FINANCIAL', label: 'Financial & Payments', icon: Wallet },
    { id: 'SUBSCRIPTIONS', label: 'Listings & Subscriptions', icon: FileSpreadsheet },
    { id: 'FEATURES', label: 'Features & Controls', icon: Sliders },
    { id: 'MAINTENANCE', label: 'System Maintenance', icon: Settings },
  ];

  const showKyc = activeTab === 'GENERAL';
  const showFinancial = activeTab === 'GENERAL' || activeTab === 'FINANCIAL';
  const showSubscriptions = activeTab === 'GENERAL' || activeTab === 'SUBSCRIPTIONS';
  const showAdvanced =
    activeTab === 'GENERAL' || activeTab === 'FEATURES' || activeTab === 'MAINTENANCE';

  const commissionSliderPct = Math.min(100, Math.max(0, (Number(formData.platformCommissionPercent || 0) / 30) * 100));
  const graceSliderPct = Math.min(100, Math.max(0, (Number(formData.bookingGracePeriodHours || 1) / 168) * 100));

  const subscriptionTiers = [
    {
      key: 'subscriptionFeeStudioGhs' as const,
      label: 'Studio',
      hint: 'Single self-contained unit',
      icon: Building2,
      iconBg: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/50',
    },
    {
      key: 'subscriptionFeeApartmentGhs' as const,
      label: 'Apartment',
      hint: 'Flats & multi-bedroom units',
      icon: Home,
      iconBg: 'bg-orange-50 dark:bg-orange-950/50 text-orange-500 dark:text-orange-400 border-orange-100 dark:border-orange-900/50',
    },
    {
      key: 'subscriptionFeeHouseGhs' as const,
      label: 'House',
      hint: 'Detached & family homes',
      icon: Home,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
    },
    {
      key: 'subscriptionFeeHostelGhs' as const,
      label: 'Hostel',
      hint: 'Multi-room, student residences',
      icon: BedDouble,
      iconBg: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-20 text-zinc-900 dark:text-white animate-in">
      {/* ── 1. EDITORIAL HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#EBF7F0] via-[#F2FBF5] to-[#E2F4EA] dark:from-[#0C1F16] dark:via-[#10281D] dark:to-[#0C1E15] border border-emerald-200/70 dark:border-emerald-900/50 px-5 sm:px-8 py-6 sm:py-7 shadow-2xs">
        {/* Right-side custom editorial illustration */}
        <div className="hidden md:block absolute right-0 top-0 bottom-0 w-[44%] max-w-[460px] pointer-events-none select-none overflow-hidden">
          <Image
            src="/images/admin/config-hero-illustration.jpg"
            alt="Platform Configuration Illustration"
            fill
            sizes="(max-width: 1024px) 40vw, 460px"
            priority
            className="object-cover object-center dark:opacity-45 [mask-image:linear-gradient(to_left,black_75%,transparent_100%)]"
          />
        </div>

        <div className="relative z-10 flex items-center gap-4 sm:gap-5 max-w-2xl">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#DFF4E7] dark:bg-emerald-950/80 border border-emerald-300/60 dark:border-emerald-800/70 flex items-center justify-center shrink-0 shadow-2xs">
            <Settings className="w-7 h-7 text-[#127337] dark:text-emerald-400" strokeWidth={2.1} />
          </div>

          <div className="hidden sm:block h-11 w-px bg-emerald-300/70 dark:bg-emerald-800/70 shrink-0" />

          <div className="min-w-0">
            <h1 className="text-xl sm:text-[26px] font-black text-zinc-950 dark:text-white tracking-tight leading-tight">
              Platform Configuration
            </h1>
            <p className="text-xs sm:text-[13.5px] text-zinc-600 dark:text-emerald-100/75 mt-1 leading-snug">
              Manage platform policies, payment settings, and operational safeguards without redeploying.
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. CATEGORY PILL BAR + SAVE CHANGES CTA ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none touch-scroll pb-1 lg:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 border',
                  isActive
                    ? 'bg-[#127337] text-white border-[#127337] shadow-sm shadow-emerald-900/15'
                    : 'bg-white dark:bg-[#12151D] text-zinc-700 dark:text-zinc-300 border-zinc-200/90 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-800 hover:text-[#127337] dark:hover:text-emerald-400'
                )}
              >
                <Icon className={clsx('w-3.5 h-3.5', isActive ? 'text-white' : 'text-zinc-500 dark:text-zinc-400')} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!isSuperAdmin || updateMutation.isPending}
          title={!isSuperAdmin ? 'Super Admin clearance required to save changes' : undefined}
          className={clsx(
            'inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold shadow-sm transition-all shrink-0 self-end lg:self-auto',
            isSuperAdmin
              ? 'bg-[#127337] hover:bg-[#0E5E2C] text-white cursor-pointer shadow-emerald-900/15'
              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed'
          )}
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSuperAdmin ? (
            <Save className="w-4 h-4" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          <span>{isSuperAdmin ? 'Save Changes' : 'Super Admin Restricted'}</span>
        </button>
      </div>

      {/* ── READ-ONLY GOVERNANCE BANNER (FOR STANDARD ADMINS) ── */}
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

      {/* ── SECTION 1: IDENTITY & KYC VERIFICATION POLICY (GREEN ACCENT) ── */}
      {showKyc && (
        <section className="relative rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#16A34A]" aria-hidden="true" />

          <button
            type="button"
            onClick={() => toggleSection('kyc')}
            className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#16A34A] dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-extrabold text-zinc-950 dark:text-white tracking-tight">
                  Identity &amp; KYC Verification Policy
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Manage identity verification requirements for platform users.
                </p>
              </div>
            </div>
            {openSections.kyc ? (
              <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
            )}
          </button>

          {openSections.kyc && (
            <div className="px-5 sm:px-6 pb-5 pt-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: Toggle Control Card */}
              <div className="lg:col-span-7 rounded-xl bg-[#F8FAFC] dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800 p-4 flex items-start gap-4">
                <button
                  type="button"
                  role="switch"
                  aria-checked={formData.ghanaCardVerificationEnabled}
                  disabled={!isSuperAdmin}
                  onClick={() => handleToggle('ghanaCardVerificationEnabled')}
                  className={clsx(
                    'w-12 h-6.5 rounded-full transition-colors relative shrink-0 mt-0.5',
                    isSuperAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-75',
                    formData.ghanaCardVerificationEnabled
                      ? 'bg-[#127337]'
                      : 'bg-zinc-300 dark:bg-zinc-700'
                  )}
                >
                  <span
                    className={clsx(
                      'absolute top-[3px] left-[3px] bg-white w-5 h-5 rounded-full transition-transform shadow-xs',
                      formData.ghanaCardVerificationEnabled ? 'translate-x-[22px]' : 'translate-x-0'
                    )}
                  />
                </button>

                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white">
                      Enforce Mandatory Ghana Card KYC Validation
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/80 text-[#127337] dark:bg-emerald-950/60 dark:text-emerald-300">
                      Platform Policy
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    When enabled, both landlords and tenants must submit verified Ghana Card credentials before executing leases or receiving Paystack payouts.
                  </p>
                </div>
              </div>

              {/* Right: Live KYC Policy Status Banner + Ghana Card Graphic */}
              <div
                className={clsx(
                  'lg:col-span-5 rounded-xl border p-4 flex items-center justify-between gap-3 transition-colors',
                  formData.ghanaCardVerificationEnabled
                    ? 'bg-gradient-to-r from-[#ECFDF3] via-[#F2FBF6] to-[#E5F7ED] dark:from-emerald-950/40 dark:via-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/80 dark:border-emerald-800/50'
                    : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/50'
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                      formData.ghanaCardVerificationEnabled
                        ? 'bg-[#127337] text-white'
                        : 'bg-amber-500 text-white'
                    )}
                  >
                    <CheckCircle2 className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={clsx(
                        'text-xs sm:text-sm font-extrabold',
                        formData.ghanaCardVerificationEnabled
                          ? 'text-[#0B3B24] dark:text-emerald-200'
                          : 'text-amber-900 dark:text-amber-200'
                      )}
                    >
                      {formData.ghanaCardVerificationEnabled
                        ? 'KYC Policy is Active'
                        : 'KYC Policy is Paused'}
                    </p>
                    <p className="text-[11.5px] text-zinc-600 dark:text-zinc-400 mt-0.5 leading-snug">
                      {formData.ghanaCardVerificationEnabled
                        ? 'All new users will be required to verify their Ghana Card.'
                        : 'Users can currently transact without mandatory Ghana Card approval.'}
                    </p>
                  </div>
                </div>

                <GhanaCardGraphic active={formData.ghanaCardVerificationEnabled} />
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 2: FINANCIAL SETTINGS & PLATFORM FEES (BLUE ACCENT) ── */}
      {showFinancial && (
        <section className="relative rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2563EB]" aria-hidden="true" />

          <button
            type="button"
            onClick={() => toggleSection('financial')}
            className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/60 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-extrabold text-zinc-950 dark:text-white tracking-tight">
                  Financial Settings &amp; Platform Fees
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Configure platform commission and reservation policies.
                </p>
              </div>
            </div>
            {openSections.financial ? (
              <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
            )}
          </button>

          {openSections.financial && (
            <div className="px-5 sm:px-6 pb-5 pt-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Sub-card 1: Platform Commission Rate */}
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800 p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100/80 dark:bg-blue-950/70 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Percent className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white block">
                      Platform Commission Rate
                    </label>
                    <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Operational service fee deducted from gross rental payments settled through Paystack (MoMo &amp; Cards).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-24 shrink-0">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      disabled={!isSuperAdmin}
                      value={formData.platformCommissionPercent}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          platformCommissionPercent: Math.min(30, Math.max(0, parseFloat(e.target.value) || 0)),
                        }))
                      }
                      className={clsx(
                        'w-full pl-3 pr-7 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#2563EB] tabular-nums',
                        !isSuperAdmin && 'opacity-70 cursor-not-allowed'
                      )}
                    />
                    <span className="absolute right-2.5 top-2 text-xs font-bold text-zinc-400">%</span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="0.5"
                    disabled={!isSuperAdmin}
                    value={formData.platformCommissionPercent}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        platformCommissionPercent: parseFloat(e.target.value) || 0,
                      }))
                    }
                    style={{
                      background: `linear-gradient(to right, #2563EB ${commissionSliderPct}%, #E2E8F0 ${commissionSliderPct}%)`,
                    }}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-[#2563EB] disabled:opacity-60 disabled:cursor-not-allowed"
                    aria-label="Platform Commission Rate slider"
                  />

                  <span className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/60 text-[#2563EB] dark:text-blue-300 text-xs font-extrabold tabular-nums shrink-0">
                    {formData.platformCommissionPercent}%
                  </span>
                </div>
              </div>

              {/* Sub-card 2: Reservation Holding Grace Period */}
              <div className="rounded-xl bg-[#F8FAFC] dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800 p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/70 text-[#127337] dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <label className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white block">
                      Reservation Holding Grace Period
                    </label>
                    <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      Maximum window allowed for prospective tenants to complete payment before a locked room slot auto-cancels.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-24 shrink-0">
                    <input
                      type="number"
                      min="1"
                      max="168"
                      disabled={!isSuperAdmin}
                      value={formData.bookingGracePeriodHours}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          bookingGracePeriodHours: Math.min(168, Math.max(1, parseInt(e.target.value, 10) || 1)),
                        }))
                      }
                      className={clsx(
                        'w-full pl-3 pr-8 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#127337] tabular-nums',
                        !isSuperAdmin && 'opacity-70 cursor-not-allowed'
                      )}
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] font-bold text-zinc-400">hrs</span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="168"
                    step="1"
                    disabled={!isSuperAdmin}
                    value={formData.bookingGracePeriodHours}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        bookingGracePeriodHours: parseInt(e.target.value, 10) || 1,
                      }))
                    }
                    style={{
                      background: `linear-gradient(to right, #127337 ${graceSliderPct}%, #E2E8F0 ${graceSliderPct}%)`,
                    }}
                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-[#127337] disabled:opacity-60 disabled:cursor-not-allowed"
                    aria-label="Reservation Holding Grace Period slider"
                  />

                  <span className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/60 text-[#127337] dark:text-emerald-300 text-xs font-extrabold tabular-nums shrink-0">
                    {formData.bookingGracePeriodHours} hrs
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 3: ANNUAL LISTING SUBSCRIPTION FEES (PURPLE ACCENT) ── */}
      {showSubscriptions && (
        <section className="relative rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#7C3AED]" aria-hidden="true" />

          <button
            type="button"
            onClick={() => toggleSection('subscriptions')}
            className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/70 dark:border-purple-800/60 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5 text-[#7C3AED] dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-extrabold text-zinc-950 dark:text-white tracking-tight">
                  Annual Listing Subscription Fees by Property Type (GHS / Year)
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Applies to new listings &amp; renewals; active &amp; in-checkout rates stay locked.
                </p>
              </div>
            </div>
            {openSections.subscriptions ? (
              <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
            )}
          </button>

          {openSections.subscriptions && (
            <div className="px-5 sm:px-6 pb-5 pt-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
              {subscriptionTiers.map((tier) => {
                const Icon = tier.icon;
                return (
                  <div
                    key={tier.key}
                    className="rounded-xl bg-[#F8FAFC] dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800 p-3.5 flex items-center justify-between gap-3 hover:border-purple-300/80 dark:hover:border-purple-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={clsx(
                          'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
                          tier.iconBg
                        )}
                      >
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <label
                          htmlFor={tier.key}
                          className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white block truncate"
                        >
                          {tier.label}
                        </label>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                          {tier.hint}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700 rounded-lg px-2 py-1 focus-within:border-[#127337] focus-within:ring-2 focus-within:ring-emerald-500/15">
                      <span className="text-[11px] font-extrabold text-[#127337] dark:text-emerald-400">
                        GHS
                      </span>
                      <input
                        id={tier.key}
                        type="number"
                        step="1"
                        min="1"
                        disabled={!isSuperAdmin}
                        value={formData[tier.key]}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            [tier.key]: Math.max(1, parseFloat(e.target.value) || 0),
                          }))
                        }
                        className={clsx(
                          'w-14 bg-transparent text-right text-sm font-black text-[#127337] dark:text-emerald-400 outline-none tabular-nums',
                          !isSuperAdmin && 'opacity-70 cursor-not-allowed'
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 4: ADVANCED FEATURES & SYSTEM CONTROLS (BLUE ACCENT) ── */}
      {showAdvanced && (
        <section className="relative rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3B82F6]" aria-hidden="true" />

          <button
            type="button"
            onClick={() => toggleSection('advanced')}
            className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 transition cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/60 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#2563EB] dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-extrabold text-zinc-950 dark:text-white tracking-tight">
                  Advanced Features &amp; System Controls
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Manage optional features and system-level settings.
                </p>
              </div>
            </div>
            {openSections.advanced ? (
              <ChevronUp className="w-4 h-4 text-zinc-400 shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
            )}
          </button>

          {openSections.advanced && (
            <div className="px-5 sm:px-6 pb-5 pt-1 space-y-3.5">
              {/* Row 1: Maintenance Safeguards Split Bar */}
              {(activeTab === 'GENERAL' || activeTab === 'MAINTENANCE') && (
                <div className="rounded-xl bg-[#F8FAFC] dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800 p-4 space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:divide-x lg:divide-zinc-200/80 dark:lg:divide-zinc-800 items-center">
                    {/* Left: Global Maintenance Mode Toggle */}
                    <div className="flex items-start gap-4">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={formData.maintenanceMode}
                        disabled={!isSuperAdmin}
                        onClick={() => handleToggle('maintenanceMode')}
                        className={clsx(
                          'w-12 h-6.5 rounded-full transition-colors relative shrink-0 mt-0.5',
                          isSuperAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-75',
                          formData.maintenanceMode
                            ? 'bg-rose-600'
                            : 'bg-zinc-300 dark:bg-zinc-700'
                        )}
                      >
                        <span
                          className={clsx(
                            'absolute top-[3px] left-[3px] bg-white w-5 h-5 rounded-full transition-transform shadow-xs',
                            formData.maintenanceMode ? 'translate-x-[22px]' : 'translate-x-0'
                          )}
                        />
                      </button>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white">
                            Global Maintenance Mode
                          </span>
                          {formData.maintenanceMode && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 animate-pulse">
                              ACTIVE DOWNTIME
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          Temporarily disable public access to the platform for maintenance.
                        </p>
                      </div>
                    </div>

                    {/* Right: Dedicated Maintenance Hub Callout */}
                    <div className="lg:pl-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Dedicated Maintenance Hub Available</span>
                        </span>
                        <p className="text-[11.5px] text-zinc-500 dark:text-zinc-400">
                          Configure scoped windows, grace delays &amp; advance advisory emails.
                        </p>
                      </div>

                      <Link
                        href="/admin/maintenance"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:border-rose-300 dark:hover:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-400 transition shrink-0 self-start sm:self-center"
                      >
                        <span>Open Hub</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {formData.maintenanceMode && (
                    <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2 animate-in text-xs">
                      <label className="font-bold text-rose-950 dark:text-rose-200 block">
                        Expected Maintenance Completion Time
                      </label>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Drives the public countdown timer presented to visiting tenants and landlords during the scheduled maintenance window.
                      </p>
                      <input
                        type="datetime-local"
                        disabled={!isSuperAdmin}
                        value={formData.maintenanceEndTime}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, maintenanceEndTime: e.target.value }))
                        }
                        className={clsx(
                          'w-full sm:w-72 p-2 bg-white dark:bg-zinc-900 border border-rose-300 dark:border-rose-800 rounded-xl text-xs font-semibold outline-none focus:border-rose-600',
                          !isSuperAdmin && 'opacity-70 cursor-not-allowed bg-zinc-50 dark:bg-zinc-800/50'
                        )}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Row 2: Co-Living & Flatmate Matching Engine */}
              {(activeTab === 'GENERAL' || activeTab === 'FEATURES') && (
                <div className="rounded-xl bg-[#F8FAFC] dark:bg-zinc-900/50 border border-zinc-200/70 dark:border-zinc-800 p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={formData.roommateFinderEnabled}
                      disabled={!isSuperAdmin}
                      onClick={() => handleToggle('roommateFinderEnabled')}
                      className={clsx(
                        'w-12 h-6.5 rounded-full transition-colors relative shrink-0 mt-0.5',
                        isSuperAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-75',
                        formData.roommateFinderEnabled
                          ? 'bg-[#127337]'
                          : 'bg-zinc-300 dark:bg-zinc-700'
                      )}
                    >
                      <span
                        className={clsx(
                          'absolute top-[3px] left-[3px] bg-white w-5 h-5 rounded-full transition-transform shadow-xs',
                          formData.roommateFinderEnabled ? 'translate-x-[22px]' : 'translate-x-0'
                        )}
                      />
                    </button>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-zinc-950 dark:text-white">
                          Verified Co-Living &amp; Flatmate Matching Engine
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/80 text-[#127337] dark:bg-emerald-950/60 dark:text-emerald-300">
                          <Users className="w-3 h-3" />
                          <span>General Rental Feature</span>
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Enables lifestyle percentage matching across the platform so students and young professionals can find compatible roommates and split leases.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
