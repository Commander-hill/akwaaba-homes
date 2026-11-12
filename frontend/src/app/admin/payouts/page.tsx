'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Wallet,
  Calendar,
  ChevronDown,
  Plus,
  BarChart2,
  ArrowRight,
  Eye,
  Zap,
  Download,
  FileText,
  Landmark,
  ChevronRight,
  Headphones,
  CheckCircle2,
  X,
  Copy,
  RefreshCw,
  Scale,
  Building2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import { useStepUpAuth } from '@/hooks/useStepUpAuth';
import PayoutKpiCards from '@/components/admin/PayoutKpiCards';

type PayoutStatusFilter = 'ALL' | 'SUCCESS' | 'PENDING' | 'PROCESSING' | 'FAILED';
type DateRangeOption = '7D' | '30D' | '90D' | 'ALL';

const STATUS_STYLE_MAP: Record<string, { pill: string; dot: string; label: string }> = {
  SUCCESS: {
    pill: 'bg-[#E6F7EE] text-[#047857] dark:bg-emerald-950/60 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    label: 'Successful',
  },
  PROCESSING: {
    pill: 'bg-[#E8F2FF] text-[#1D4ED8] dark:bg-blue-950/60 dark:text-blue-300',
    dot: 'bg-blue-500',
    label: 'Processing',
  },
  PENDING: {
    pill: 'bg-[#FEF3E8] text-[#C2410C] dark:bg-amber-950/60 dark:text-amber-300',
    dot: 'bg-amber-500',
    label: 'Pending',
  },
  FAILED: {
    pill: 'bg-[#FEE2E2] text-[#B91C1C] dark:bg-rose-950/60 dark:text-rose-300',
    dot: 'bg-rose-500',
    label: 'Failed',
  },
};

const getInitials = (firstName?: string, lastName?: string, fallback?: string): string => {
  const f = (firstName || '').trim().charAt(0);
  const l = (lastName || '').trim().charAt(0);
  if (f || l) return `${f}${l}`.toUpperCase();
  return (fallback || 'L').trim().charAt(0).toUpperCase() || 'L';
};

const formatDateTime = (iso?: string): string => {
  if (!iso) return 'N/A';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'N/A';
  const datePart = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const timePart = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return `${datePart} • ${timePart}`;
};

export default function AdminPayoutsPage() {
  const queryClient = useQueryClient();
  const { requestStepUp, StepUpModal } = useStepUpAuth();
  const [statusFilter, setStatusFilter] = useState<PayoutStatusFilter>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeOption>('30D');
  const [showAllPayouts, setShowAllPayouts] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [isReconciling, setIsReconciling] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-payouts', statusFilter],
    queryFn: async () => {
      const res = await api.get('/admin/payouts', {
        params: {
          status: statusFilter,
          limit: 50,
        },
      });
      return res.data;
    },
  });

  const allPayouts = useMemo(() => (Array.isArray(data?.payouts) ? data.payouts : []), [data]);

  const stats = data?.stats || {
    totalCount: 0,
    pendingCount: 0,
    pendingSum: 0,
    processingCount: 0,
    processingSum: 0,
    successCount: 0,
    successSum: 0,
    failedCount: 0,
    failedSum: 0,
  };

  const filteredPayouts = useMemo(() => {
    if (dateRange === 'ALL') return allPayouts;
    const days = dateRange === '7D' ? 7 : dateRange === '30D' ? 30 : 90;
    const cutoff = Date.now() - days * 86400000;
    return allPayouts.filter((p: any) => {
      const ts = new Date(p.createdAt).getTime();
      return !Number.isNaN(ts) && ts >= cutoff;
    });
  }, [allPayouts, dateRange]);

  const visiblePayouts = useMemo(() => {
    return showAllPayouts ? filteredPayouts : filteredPayouts.slice(0, 5);
  }, [filteredPayouts, showAllPayouts]);

  const summaryRates = useMemo(() => {
    const total = stats.successCount + stats.pendingCount + stats.processingCount + stats.failedCount;
    if (total === 0) {
      return { successPct: 100, pendingPct: 0, failedPct: 0 };
    }
    const successPct = Math.round((stats.successCount / total) * 100);
    const pendingPct = Math.round(((stats.pendingCount + stats.processingCount) / total) * 100);
    const failedPct = Math.max(0, 100 - successPct - pendingPct);
    return { successPct, pendingPct, failedPct };
  }, [stats]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleManualReconcile = async () => {
    setIsReconciling(true);
    try {
      const res = await api.post('/admin/payouts/reconcile');
      toast.success(res.data?.message || 'Escrow reconciliation & payout sync completed!');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reconcile pending transfers.');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleReleaseEscrow = (payout: any) => {
    requestStepUp({
      title: 'Manual Escrow Payout Release',
      description: `Releasing GHS ${Number(payout.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })} from platform escrow to ${payout.landlord?.firstName || 'Landlord'} ${payout.landlord?.lastName || ''}.`,
      actionType: 'ESCROW_RELEASE',
      payloadSummary: [
        { label: 'Recipient', value: `${payout.landlord?.firstName || ''} ${payout.landlord?.lastName || ''}` },
        { label: 'Amount', value: `GHS ${Number(payout.amount).toFixed(2)}` },
        { label: 'Destination', value: `${payout.bankOrNetwork} (${payout.accountNumber})` },
        { label: 'Transfer Mode', value: payout.recipientType || 'MOMO' },
      ],
      onSuccess: async (stepUpToken: string) => {
        try {
          await api.put(
            `/admin/payouts/${payout.id}/status`,
            { status: 'SUCCESS' },
            { headers: { 'x-step-up-token': stepUpToken } }
          );
          toast.success(`GHS ${Number(payout.amount).toFixed(2)} disbursed to ${payout.accountName} successfully!`);
          setSelectedPayout(null);
          refetch();
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to release escrow payout.');
        }
      },
    });
  };

  const handleFailPayout = (payout: any) => {
    const reason = window.prompt(
      'Please enter the failure / rejection reason (logged to audit trail):',
      'Banking information mismatch / invalid MoMo number'
    );
    if (!reason) return;

    requestStepUp({
      title: 'Reject / Fail Escrow Disbursement',
      description: `Reject payout of GHS ${Number(payout.amount).toFixed(2)} for ${payout.landlord?.firstName || ''} ${payout.landlord?.lastName || ''}. Reason: ${reason}`,
      actionType: 'ESCROW_RELEASE',
      onSuccess: async (stepUpToken: string) => {
        try {
          await api.put(
            `/admin/payouts/${payout.id}/status`,
            { status: 'FAILED', failureReason: reason },
            { headers: { 'x-step-up-token': stepUpToken } }
          );
          toast.success('Payout marked as FAILED and logged.');
          setSelectedPayout(null);
          refetch();
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to update payout status.');
        }
      },
    });
  };

  const exportCSV = () => {
    if (!filteredPayouts.length) {
      toast.error('No payout records to export');
      return;
    }
    const headers = [
      'ID',
      'Landlord Name',
      'Landlord Email',
      'Amount (GHS)',
      'Network / Bank',
      'Account Name',
      'Account Number',
      'Recipient Type',
      'Status',
      'Transfer Reference',
      'Requested Date',
    ];
    const rows = filteredPayouts.map((p: any) => [
      p.id,
      `"${p.landlord?.firstName || ''} ${p.landlord?.lastName || ''}"`,
      `"${p.landlord?.email || ''}"`,
      Number(p.amount || 0).toFixed(2),
      `"${p.bankOrNetwork || ''}"`,
      `"${p.accountName || ''}"`,
      `"'${p.accountNumber || ''}"`,
      p.recipientType || '',
      p.status || 'PENDING',
      p.transferReference || 'N/A',
      new Date(p.createdAt).toISOString(),
    ]);
    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `AkwaabaHomes_Payouts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredPayouts.length} payout records`);
  };

  // Multi-segment donut calculations
  const donutRadius = 40;
  const donutCirc = 2 * Math.PI * donutRadius;
  const successDash = (summaryRates.successPct / 100) * donutCirc;
  const pendingDash = (summaryRates.pendingPct / 100) * donutCirc;
  const failedDash = (summaryRates.failedPct / 100) * donutCirc;

  return (
    <div className="space-y-5 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-[22px] border border-zinc-200/80 dark:border-zinc-800 bg-gradient-to-r from-[#ebf7f0] via-[#f4fbf7] to-white dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 min-h-[132px] flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-5">
        <div
          className="absolute right-0 top-0 bottom-0 w-full sm:w-[60%] lg:w-[52%] pointer-events-none select-none overflow-hidden"
          aria-hidden="true"
        >
          <img
            src="/images/admin/landlords-hero-building.webp"
            alt=""
            width={604}
            height={142}
            fetchPriority="high"
            className="w-full h-full object-cover object-right opacity-85 dark:opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#ebf7f0] via-[#f4fbf7]/85 to-transparent dark:from-zinc-900 dark:via-zinc-900/90 dark:to-transparent" />
        </div>

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E1F5EA] dark:bg-emerald-950/70 border border-emerald-200/70 dark:border-emerald-800/60 flex items-center justify-center text-[#04793d] dark:text-emerald-400 shrink-0 shadow-xs">
            <Wallet className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight leading-tight">
              Landlord Payouts &amp; Disbursements
            </h1>
            <p className="text-xs sm:text-[13px] text-zinc-600 dark:text-zinc-300 mt-1 max-w-xl leading-relaxed">
              Track payouts, manage disbursements, and ensure timely payments to landlords.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2.5 shrink-0">
          <div className="relative">
            <Calendar className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
              aria-label="Filter payout date range"
              className="appearance-none h-10 pl-9 pr-8 rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
              <option value="90D">Last 90 Days</option>
              <option value="ALL">All Time</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={handleManualReconcile}
            disabled={isReconciling}
            className="h-10 px-4 rounded-xl bg-[#04793d] hover:bg-[#036131] text-white text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isReconciling ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>{isReconciling ? 'Reconciling...' : 'Initiate Payout'}</span>
          </button>
        </div>
      </section>

      {/* 4-Card KPI Strip */}
      <PayoutKpiCards
        stats={stats}
        activeStatus={statusFilter}
        onSelectStatus={(s) => setStatusFilter(s)}
      />

      {/* Main Content + Right Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Main Area */}
        <div className="xl:col-span-9 space-y-5">
          {/* Overview Chart + Summary Ring */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Payout Overview Chart */}
            <div className="lg:col-span-7 rounded-[22px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Payout Overview</h2>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                    Disbursed
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                    Pending
                  </span>
                </div>
              </div>

              <div className="relative h-52 w-full">
                {/* Floating total pill */}
                <div className="absolute right-3 top-2 z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200/90 dark:border-zinc-700 shadow-xs text-[11px] font-black text-zinc-900 dark:text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>
                    GHS {Number(stats.successSum || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <svg viewBox="0 0 520 190" className="w-full h-full" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="payoutGreenGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16A34A" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#16A34A" stopOpacity="0.01" />
                    </linearGradient>
                    <linearGradient id="payoutBlueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal gridlines */}
                  {[30, 70, 110, 150].map((y) => (
                    <line
                      key={y}
                      x1="38"
                      y1={y}
                      x2="510"
                      y2={y}
                      stroke="currentColor"
                      className="text-zinc-100 dark:text-zinc-800"
                      strokeDasharray="3 3"
                    />
                  ))}

                  {/* Y-axis labels */}
                  <text x="6" y="34" fontSize="10" fill="#94a3b8">80K</text>
                  <text x="6" y="74" fontSize="10" fill="#94a3b8">60K</text>
                  <text x="6" y="114" fontSize="10" fill="#94a3b8">40K</text>
                  <text x="6" y="154" fontSize="10" fill="#94a3b8">20K</text>

                  {/* Disbursed area + line */}
                  <path
                    d="M40 120 C75 110, 100 90, 130 96 C160 102, 185 84, 215 88 C245 92, 270 55, 300 66 C330 78, 355 62, 385 68 C415 74, 455 58, 505 56 L505 162 L40 162 Z"
                    fill="url(#payoutGreenGrad)"
                  />
                  <path
                    d="M40 120 C75 110, 100 90, 130 96 C160 102, 185 84, 215 88 C245 92, 270 55, 300 66 C330 78, 355 62, 385 68 C415 74, 455 58, 505 56"
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Pending area + line */}
                  <path
                    d="M40 148 C80 145, 110 142, 145 144 C180 146, 210 130, 245 132 C280 134, 310 112, 345 115 C380 118, 425 104, 505 84 L505 162 L40 162 Z"
                    fill="url(#payoutBlueGrad)"
                  />
                  <path
                    d="M40 148 C80 145, 110 142, 145 144 C180 146, 210 130, 245 132 C280 134, 310 112, 345 115 C380 118, 425 104, 505 84"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />

                  {/* End dots */}
                  <circle cx="505" cy="56" r="4" fill="#16A34A" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="505" cy="84" r="3.5" fill="#2563EB" stroke="#ffffff" strokeWidth="1.5" />

                  {/* X-axis dates */}
                  <text x="40" y="182" fontSize="10" fill="#94a3b8">Wk 1</text>
                  <text x="160" y="182" fontSize="10" fill="#94a3b8">Wk 2</text>
                  <text x="290" y="182" fontSize="10" fill="#94a3b8">Wk 3</text>
                  <text x="420" y="182" fontSize="10" fill="#94a3b8">Wk 4</text>
                </svg>
              </div>
            </div>

            {/* Payout Summary Card */}
            <div className="lg:col-span-5 rounded-[22px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Payout Summary</h2>
              </div>

              <div className="flex items-center justify-between gap-4 my-2">
                <div className="flex flex-col items-center">
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                      <circle
                        cx="50"
                        cy="50"
                        r={donutRadius}
                        fill="none"
                        stroke="#e5e7eb"
                        className="dark:stroke-zinc-800"
                        strokeWidth="10"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r={donutRadius}
                        fill="none"
                        stroke="#16A34A"
                        strokeWidth="10"
                        strokeDasharray={`${successDash} ${donutCirc}`}
                        strokeDashoffset="0"
                      />
                      {pendingDash > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={donutRadius}
                          fill="none"
                          stroke="#2563EB"
                          strokeWidth="10"
                          strokeDasharray={`${pendingDash} ${donutCirc}`}
                          strokeDashoffset={-successDash}
                        />
                      )}
                      {failedDash > 0 && (
                        <circle
                          cx="50"
                          cy="50"
                          r={donutRadius}
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="10"
                          strokeDasharray={`${failedDash} ${donutCirc}`}
                          strokeDashoffset={-(successDash + pendingDash)}
                        />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-black text-zinc-900 dark:text-white">
                        {summaryRates.successPct}%
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-1">
                    Success Rate
                  </span>
                </div>

                <div className="flex-1 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Successful
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-white">{summaryRates.successPct}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Pending
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-white">{summaryRates.pendingPct}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Failed
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-white">{summaryRates.failedPct}%</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-xl bg-[#EAF7EE] dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 px-3.5 py-2.5 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#04793d] dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-snug">
                  <div className="font-bold text-[#04793d] dark:text-emerald-300">On Track</div>
                  <div className="text-zinc-600 dark:text-zinc-300">
                    Escrow payout settlements are operating smoothly across Paystack &amp; MoMo.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Payouts Table Card */}
          <div className="rounded-[22px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-[0_2px_10px_rgba(15,23,42,0.03)] overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Recent Payouts</h2>
                {statusFilter !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('ALL')}
                    className="ml-2 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
                  >
                    Filter: {statusFilter} ✕
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowAllPayouts((v) => !v)}
                className="h-8 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>{showAllPayouts ? 'Show Top 5' : 'View All Payouts'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLoading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
                ))}
              </div>
            ) : visiblePayouts.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <Wallet className="w-9 h-9 text-zinc-300 dark:text-zinc-600 mx-auto mb-2.5" />
                <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No payouts found</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Try switching the status card filter or date range.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                      <th className="py-3 px-5 whitespace-nowrap">Date &amp; Time</th>
                      <th className="py-3 px-3 whitespace-nowrap">Landlord</th>
                      <th className="py-3 px-3 whitespace-nowrap">Property / Destination</th>
                      <th className="py-3 px-3 whitespace-nowrap">Amount</th>
                      <th className="py-3 px-3 whitespace-nowrap">Status</th>
                      <th className="py-3 px-3 whitespace-nowrap">Transaction ID</th>
                      <th className="py-3 px-5 text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
                    {visiblePayouts.map((p: any) => {
                      const landlordName =
                        `${p.landlord?.firstName || ''} ${p.landlord?.lastName || ''}`.trim() ||
                        p.accountName ||
                        'Landlord';
                      const statusCfg = STATUS_STYLE_MAP[p.status] || STATUS_STYLE_MAP.PENDING;
                      const refCode = p.transferReference || `PAY-${String(p.id).slice(0, 8).toUpperCase()}`;

                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="py-3.5 px-5 whitespace-nowrap font-medium text-zinc-600 dark:text-zinc-300">
                            {formatDateTime(p.createdAt)}
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2.5 min-w-[140px]">
                              {p.landlord?.avatarUrl ? (
                                <img
                                  src={getImageUrl(p.landlord.avatarUrl)}
                                  alt={landlordName}
                                  className="w-7 h-7 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-[#EAF7EE] dark:bg-emerald-950/70 text-[#04793d] dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {getInitials(p.landlord?.firstName, p.landlord?.lastName, p.accountName)}
                                </div>
                              )}
                              <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[130px]">
                                {landlordName}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-2.5 min-w-[155px]">
                              <div className="w-8 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                                <Building2 className="w-3.5 h-3.5" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[140px]">
                                  {p.bankOrNetwork || 'MoMo / Bank'}
                                </div>
                                <div className="text-[10px] text-zinc-400 truncate max-w-[140px]">
                                  {p.accountName}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap font-bold text-zinc-900 dark:text-white">
                            GHS {Number(p.amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {p.disputeHold ? (
                              <Link
                                href={`/admin/disputes/${p.activeDispute?.disputeId}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-[11px] font-bold hover:underline"
                              >
                                <Scale className="w-3 h-3" />
                                Dispute Frozen
                              </Link>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${statusCfg.pill}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                {statusCfg.label}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 whitespace-nowrap font-mono font-semibold text-zinc-600 dark:text-zinc-300">
                            {refCode}
                          </td>

                          <td className="py-3.5 px-5 whitespace-nowrap text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedPayout(p)}
                              className="h-8 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-zinc-500" />
                              <span>View</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Quick Actions & Help Sidebar */}
        <aside className="xl:col-span-3 space-y-4">
          <div className="rounded-[22px] bg-[#EFFAF3] dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white px-1 mb-1">
              <Zap className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
              <span>Quick Actions</span>
            </div>

            <button
              type="button"
              onClick={handleManualReconcile}
              disabled={isReconciling}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 border border-emerald-100 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:border-emerald-300 transition cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Wallet className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
                <span>Initiate Payout</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            <button
              type="button"
              onClick={exportCSV}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 border border-emerald-100 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:border-emerald-300 transition cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                <Download className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
                <span>Export Payout Report</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            <Link
              href="/admin/transactions"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 border border-emerald-100 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:border-emerald-300 transition"
            >
              <span className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
                <span>View Payment Logs</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </Link>

            <Link
              href="/admin/landlords"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/90 dark:bg-zinc-900/90 border border-emerald-100 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-100 hover:border-emerald-300 transition"
            >
              <span className="flex items-center gap-2.5">
                <Landmark className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
                <span>Manage Bank Accounts</span>
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </Link>
          </div>

          {/* Need Help? Card */}
          <div className="rounded-[22px] bg-[#E9F8EF] dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
              <Headphones className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
              <span>Need Help?</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1.5 leading-relaxed">
              For payout issues or assistance.
            </p>
            <Link
              href="/admin/tickets"
              className="mt-4 inline-flex items-center justify-center gap-2 w-full h-9 rounded-full bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-[#04793d] dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-zinc-800 transition shadow-2xs"
            >
              <span>Contact Support</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </aside>
      </div>

      {/* Payout Detail & Escrow Release Modal */}
      {selectedPayout && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedPayout(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                Payout Disbursement Docket
              </h3>
              <button
                type="button"
                onClick={() => setSelectedPayout(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Landlord</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {selectedPayout.landlord?.firstName} {selectedPayout.landlord?.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Amount</span>
                <span className="font-black text-emerald-600">
                  GHS {Number(selectedPayout.amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Destination</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {selectedPayout.bankOrNetwork} • {selectedPayout.accountNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Account Name</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {selectedPayout.accountName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Reference</span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(selectedPayout.transferReference || selectedPayout.id, 'Reference')
                  }
                  className="inline-flex items-center gap-1 font-mono font-bold text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 cursor-pointer"
                >
                  <span>{selectedPayout.transferReference || selectedPayout.id}</span>
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            {selectedPayout.disputeHold ? (
              <div className="rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Frozen due to an active tenant/landlord dispute. Resolve the dispute before releasing.</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                {(selectedPayout.status === 'PENDING' ||
                  selectedPayout.status === 'PROCESSING' ||
                  selectedPayout.status === 'FAILED') && (
                  <button
                    type="button"
                    onClick={() => handleReleaseEscrow(selectedPayout)}
                    className="h-9 px-4 rounded-xl bg-[#04793d] hover:bg-[#036131] text-white text-xs font-bold transition cursor-pointer"
                  >
                    {selectedPayout.status === 'PROCESSING'
                      ? 'Mark Settled'
                      : selectedPayout.status === 'FAILED'
                      ? 'Retry Release'
                      : 'Release Escrow'}
                  </button>
                )}
                {selectedPayout.status === 'PENDING' && (
                  <button
                    type="button"
                    onClick={() => handleFailPayout(selectedPayout)}
                    className="h-9 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer"
                  >
                    Reject / Mark Failed
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {StepUpModal}
    </div>
  );
}
