'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  CreditCard,
  Download,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  ChevronRight,
  Loader2,
  RotateCcw,
  Headphones,
  Home,
  Info,
  X,
  Phone,
  Check,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';
import clsx from 'clsx';

// Demo showcase transactions (Activated only when ?demo=true query param is set)
const DEMO_TRANSACTIONS = [
  {
    id: 'T797819808658609',
    reference: 'T797819808658609',
    createdAt: '2026-09-06T10:00:00.000Z',
    amount: 20000,
    status: 'SUCCESS',
    paymentType: 'Rent payment',
    isShowcase: true,
    property: {
      title: 'GLACIER STUDIO',
      location: 'Achimota, Accra',
    },
  },
];

export default function TenantPaymentsPage() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1';

  const [activeTab, setActiveTab] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('1800');
  const [paymentPurpose, setPaymentPurpose] = useState('Rent payment');
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<any | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  // 1. Fetch current authenticated user profile
  const { data: userResponse } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/me');
        return data;
      } catch {
        return null;
      }
    },
  });

  const currentUser = userResponse?.user;

  // 2. Fetch tenant transactions
  const { data: transactionsData, isLoading: isLoadingTx } = useQuery({
    queryKey: ['tenant-transactions'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/transactions/tenant');
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.transactions)) return data.transactions;
        return [];
      } catch {
        return [];
      }
    },
  });

  // 3. Fetch active/pending bookings
  const { data: bookingsData, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['tenant-bookings'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/bookings/me');
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.bookings)) return data.bookings;
        return [];
      } catch {
        return [];
      }
    },
  });

  // Defensive array extractions (Resolves Anomaly 9)
  const transactions: any[] = useMemo(() => {
    if (Array.isArray(transactionsData)) return transactionsData;
    if (Array.isArray((transactionsData as any)?.transactions)) return (transactionsData as any).transactions;
    return [];
  }, [transactionsData]);

  const bookings: any[] = useMemo(() => {
    if (Array.isArray(bookingsData)) return bookingsData;
    if (Array.isArray((bookingsData as any)?.bookings)) return (bookingsData as any).bookings;
    return [];
  }, [bookingsData]);

  // Active stay
  const activeBooking = useMemo(() => {
    return bookings.find((b: any) =>
      ['ACTIVE', 'CONFIRMED', 'CHECKED_IN', 'APPROVED'].includes(b.status)
    );
  }, [bookings]);

  // Display transactions: real data, or demo showcase strictly when ?demo=true (Resolves Anomaly 1)
  const displayTransactions = useMemo(() => {
    if (transactions.length > 0) return transactions;
    if (isDemo) return DEMO_TRANSACTIONS;
    return [];
  }, [transactions, isDemo]);

  // Accurate KPI Calculations: GH₵ 0 if no payments (Resolves Anomaly 2)
  const totalRentPaid = useMemo(() => {
    return displayTransactions
      .filter((t: any) => ['SUCCESS', 'COMPLETED', 'PAID'].includes(t.status))
      .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
  }, [displayTransactions]);

  const cautionDepositHeld = useMemo(() => {
    return Number(activeBooking?.cautionDepositAmount || activeBooking?.property?.cautionDeposit || 0);
  }, [activeBooking]);

  // Filter counts
  const successCount = displayTransactions.filter(
    (t: any) => t.status === 'SUCCESS' || t.status === 'COMPLETED' || t.status === 'PAID'
  ).length;
  const pendingCount = displayTransactions.filter((t: any) => t.status === 'PENDING').length;
  const failedCount = displayTransactions.filter((t: any) => t.status === 'FAILED').length;

  const filteredTransactions = useMemo(() => {
    return displayTransactions.filter((tx: any) => {
      const isSuccess = tx.status === 'SUCCESS' || tx.status === 'COMPLETED' || tx.status === 'PAID';
      const isPending = tx.status === 'PENDING';
      const isFailed = tx.status === 'FAILED';

      const matchesTab =
        activeTab === 'ALL'
          ? true
          : activeTab === 'SUCCESS'
          ? isSuccess
          : activeTab === 'PENDING'
          ? isPending
          : isFailed;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tx.reference?.toLowerCase().includes(q) ||
        tx.id?.toLowerCase().includes(q) ||
        tx.property?.title?.toLowerCase().includes(q) ||
        tx.property?.location?.toLowerCase().includes(q);

      return matchesTab && matchesSearch;
    });
  }, [displayTransactions, activeTab, searchQuery]);

  // Download PDF Receipt from Backend
  const handleDownloadPDF = async (txId: string) => {
    try {
      toast.loading('Preparing official PDF receipt...', { id: 'pdf' });
      const res = await api.get(`/transactions/${txId}/pdf`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Receipt_${txId.slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Receipt downloaded successfully', { id: 'pdf' });
    } catch {
      toast.error('Unable to retrieve official PDF receipt', { id: 'pdf' });
    }
  };

  // Generate & Download Real Financial Statement CSV (Resolves Anomaly 5)
  const handleDownloadStatement = () => {
    if (displayTransactions.length === 0) {
      toast('No transactions on file to export.', { icon: 'ℹ️' });
      return;
    }

    toast.loading('Exporting financial statement...', { id: 'statement' });
    const residentName = currentUser
      ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Resident'
      : 'Resident';
    const residentEmail = currentUser?.email || 'N/A';
    const residentPhone = currentUser?.phoneNumber || 'N/A';
    const statementDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const csvRows = [
      ['AKWAABA HOMES - RESIDENT FINANCIAL STATEMENT'],
      ['Resident Name', residentName],
      ['Email Address', residentEmail],
      ['Phone Number', residentPhone],
      ['Statement Generated On', statementDate],
      [''],
      ['TRANSACTION LEDGER'],
      ['Date', 'Transaction Reference', 'Property', 'Location', 'Payment Type', 'Amount (GHS)', 'Status'],
      ...displayTransactions.map((tx: any) => [
        new Date(tx.createdAt).toLocaleDateString('en-GB'),
        tx.reference || tx.id,
        `"${(tx.property?.title || 'Accommodation').replace(/"/g, '""')}"`,
        `"${(tx.property?.location || 'Ghana').replace(/"/g, '""')}"`,
        tx.paymentType || 'Rent payment',
        Number(tx.amount || 0).toFixed(2),
        tx.status || 'SUCCESS',
      ]),
      [''],
      ['SUMMARY'],
      ['Total Rent Paid (GHS)', totalRentPaid.toFixed(2)],
      ['Caution Deposit Held (GHS)', cautionDepositHeld.toFixed(2)],
      ['Active Tenancy', activeBooking?.property?.title || 'None'],
    ];

    const csvContent = csvRows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `AkwaabaHomes_Financial_Statement_${new Date().getFullYear()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Financial statement downloaded successfully', { id: 'statement' });
  };

  // Handle Paystack Payment (Resolves Anomaly 4)
  const handleProceedPayment = async () => {
    if (!activeBooking?.id) {
      toast.error('No pending booking requires payment right now. Please explore accommodations to book a room.');
      return;
    }

    setIsPaying(true);
    try {
      toast.loading('Connecting to Paystack gateway...', { id: 'paystack' });
      const res = await api.post(`/bookings/${activeBooking.id}/pay`);
      if (res.data?.authorization_url) {
        toast.success('Redirecting to Paystack...', { id: 'paystack' });
        window.location.href = res.data.authorization_url;
        return;
      }
      toast.error(res.data?.message || 'Unable to initialize payment', { id: 'paystack' });
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Payment initiation failed. Please verify booking status.',
        { id: 'paystack' }
      );
    } finally {
      setIsPaying(false);
    }
  };

  // Dynamic Bar Chart Heights for Recent Payments (Resolves Anomaly 3)
  const recentPayments = useMemo(() => {
    return displayTransactions
      .filter((t: any) => ['SUCCESS', 'COMPLETED', 'PAID'].includes(t.status))
      .slice(0, 5)
      .reverse();
  }, [displayTransactions]);

  const maxRecentAmount = useMemo(() => {
    if (recentPayments.length === 0) return 1;
    return Math.max(...recentPayments.map((p: any) => Number(p.amount) || 0), 1);
  }, [recentPayments]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0D100E] text-zinc-900 dark:text-zinc-100 font-sans relative overflow-x-hidden flex flex-col justify-between">
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6 flex-1">
        {/* ── Top Title & Actions Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#16A34A] tracking-wider uppercase block">
              FINANCE CENTRE
            </span>
            <h1 className="text-3xl sm:text-[35px] font-black text-zinc-950 dark:text-white tracking-tight leading-tight">
              Payments & invoices
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
              A verified ledger of your rent installments, caution deposits, and official transaction receipts.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 relative z-10">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A3826] hover:bg-[#072B1D] text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Make a payment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleDownloadStatement}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-700/60 transition shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
              <span>Download statement</span>
            </button>
          </div>
        </div>

        {/* ── Hero KPI Cards Row (2 Wide Cards) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* ──── LEFT CARD: TOTAL RENT PAID (Dark Green with Dynamic Chart) ──── */}
          <div className="lg:col-span-6 rounded-2xl bg-[#0A3826] text-white p-5 sm:p-6 relative overflow-hidden shadow-sm flex items-center justify-between min-h-[114px]">
            {/* Subtle Geometric Background Watermark */}
            <svg
              className="absolute left-0 top-0 h-full w-48 opacity-15 pointer-events-none"
              viewBox="0 0 100 100"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <pattern id="akwaaba-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="10" height="10" fill="white" fillOpacity="0.1" />
                <path d="M0 10 L10 0 L20 10 L10 20 Z" />
              </pattern>
              <rect width="100" height="100" fill="url(#akwaaba-pattern)" />
            </svg>

            {/* Left Stat */}
            <div className="relative z-10 space-y-0.5">
              <span className="text-[10px] font-bold text-[#86EFAC] uppercase tracking-wider block">
                TOTAL RENT PAID
              </span>
              <p className="text-3xl sm:text-[34px] font-black text-white tracking-tight leading-tight">
                GH₵ {totalRentPaid.toLocaleString()}
              </p>
              <p className="text-xs text-white/70">
                {displayTransactions.length > 0 ? 'Across all verified tenancies' : 'No recorded transactions'}
              </p>
            </div>

            {/* Right Divider + Dynamic Bar Chart (Resolves Anomaly 3) */}
            <div className="relative z-10 flex items-center pl-6 border-l border-white/20">
              {recentPayments.length > 0 ? (
                <div className="flex items-end gap-2 h-16" title="Recent verified payments trend">
                  {recentPayments.map((p: any, idx: number) => {
                    const amount = Number(p.amount) || 0;
                    const pct = Math.max(20, Math.min(100, Math.round((amount / maxRecentAmount) * 100)));
                    return (
                      <div
                        key={p.id || idx}
                        style={{ height: `${pct}%` }}
                        className={clsx(
                          'w-3 rounded-full transition-all duration-300',
                          idx === recentPayments.length - 1
                            ? 'bg-[#22C55E] shadow-xs'
                            : 'bg-[#22C55E]/70'
                        )}
                        title={`GH₵ ${amount.toLocaleString()}`}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-end gap-2 h-16 opacity-30" title="No payment activity yet">
                  <div className="w-3 h-4 bg-white/40 rounded-full" />
                  <div className="w-3 h-4 bg-white/40 rounded-full" />
                  <div className="w-3 h-4 bg-white/40 rounded-full" />
                  <div className="w-3 h-4 bg-white/40 rounded-full" />
                  <div className="w-3 h-4 bg-white/40 rounded-full" />
                </div>
              )}
            </div>
          </div>

          {/* ──── RIGHT CARD: CAUTION DEPOSIT & ACTIVE TENANCY (Light Card) ──── */}
          <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs p-5 flex flex-col justify-between min-h-[114px]">
            {/* Top 2 Columns */}
            <div className="grid grid-cols-2 divide-x divide-zinc-200/80 dark:divide-zinc-800">
              {/* Col 1: Caution Deposit */}
              <div className="flex items-start gap-3 pr-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block">
                    Caution deposit held
                  </span>
                  <p className="text-xl font-black text-zinc-950 dark:text-white mt-0.5">
                    GH₵ {cautionDepositHeld.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Col 2: Active Tenancy */}
              <div className="flex items-start gap-3 pl-4 sm:pl-6">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center shrink-0">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block">
                    Active tenancy
                  </span>
                  <p className="text-base font-black text-zinc-950 dark:text-white mt-0.5 truncate max-w-[170px]">
                    {activeBooking?.property?.title || 'No active stay'}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Row: Notice & Explore Homes Link */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Browse verified listings to reserve your accommodation.</span>
              </div>

              <Link
                href="/properties"
                className="text-xs font-bold text-[#16A34A] hover:text-[#15803D] inline-flex items-center gap-1 transition"
              >
                <span>Explore homes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Main Section: 2 Columns (Left 8 cols, Right 4 cols) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ──── LEFT PANEL (8 COLS): TRANSACTION HISTORY ──── */}
          <div
            id="transaction-history"
            className="lg:col-span-8 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs space-y-4"
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-black text-zinc-950 dark:text-white leading-tight">
                  Transaction history
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Your payments, receipts and transaction references.
                </p>
              </div>
            </div>

            {/* Filter Tabs & Search Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap',
                    activeTab === 'ALL'
                      ? 'bg-[#0A3826] text-white shadow-2xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  )}
                >
                  All transactions ({displayTransactions.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('SUCCESS')}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap',
                    activeTab === 'SUCCESS'
                      ? 'bg-[#0A3826] text-white shadow-2xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  )}
                >
                  Successful ({successCount})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('PENDING')}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap',
                    activeTab === 'PENDING'
                      ? 'bg-[#0A3826] text-white shadow-2xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  )}
                >
                  Pending ({pendingCount})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('FAILED')}
                  className={clsx(
                    'px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer whitespace-nowrap',
                    activeTab === 'FAILED'
                      ? 'bg-[#0A3826] text-white shadow-2xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  )}
                >
                  Failed ({failedCount})
                </button>
              </div>

              {/* Search & Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-xs rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1.5 focus:ring-[#16A34A]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const order: Array<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'> = [
                      'ALL',
                      'SUCCESS',
                      'PENDING',
                      'FAILED',
                    ];
                    const next = order[(order.indexOf(activeTab) + 1) % order.length];
                    setActiveTab(next);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/70 transition cursor-pointer shrink-0"
                >
                  <Filter className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Filter: {activeTab}</span>
                  <span className="text-[10px]">⌄</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto pt-1">
              {isLoadingTx ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2 text-zinc-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  <p className="text-xs font-medium">Loading transactions...</p>
                </div>
              ) : displayTransactions.length === 0 ? (
                // Clean Empty State for Zero Transactions (Resolves Anomaly 1)
                <div className="py-14 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5A3E] dark:text-emerald-400 flex items-center justify-center">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm text-zinc-950 dark:text-white">
                      No payment transactions recorded yet
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                      When you reserve an accommodation or pay your rent through the platform, your receipts and transaction verification codes will appear here.
                    </p>
                  </div>
                  <Link
                    href="/properties"
                    className="mt-2 px-4 py-2 rounded-full bg-[#0A3826] hover:bg-[#072B1D] text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                  >
                    <span>Browse Accommodations</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : filteredTransactions.length === 0 ? (
                // Filter No Results (Resolves Anomaly 10)
                <div className="py-10 text-center text-zinc-500 space-y-2">
                  <p className="text-xs">No transactions match your search query or status filter.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('ALL');
                      setSearchQuery('');
                    }}
                    className="text-xs text-[#16A34A] font-bold hover:underline cursor-pointer"
                  >
                    Clear filter
                  </button>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase border-b border-zinc-100 dark:border-zinc-800">
                    <tr>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Transaction ID</th>
                      <th className="py-3 px-3">Property</th>
                      <th className="py-3 px-3">Payment type</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {filteredTransactions.map((tx: any) => {
                      const dateObj = new Date(tx.createdAt || new Date());
                      const dayMonthStr = dateObj.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                      });
                      const yearStr = dateObj.getFullYear();
                      const propertyTitle = tx.property?.title || activeBooking?.property?.title || 'Accommodation';
                      const propertyLocation = tx.property?.location || activeBooking?.property?.location || 'Ghana';

                      return (
                        <tr key={tx.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40 transition">
                          {/* Date Pill: 2-line calendar tile */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#E8F5E9] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400">
                              <Calendar className="w-4 h-4 shrink-0" />
                              <div className="leading-tight text-left">
                                <div className="text-xs font-bold text-[#16A34A] dark:text-emerald-400">{dayMonthStr}</div>
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">{yearStr}</div>
                              </div>
                            </div>
                          </td>

                          {/* Transaction ID */}
                          <td className="py-3.5 px-3 font-bold font-mono text-xs text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                            {tx.reference || tx.id}
                          </td>

                          {/* Property */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <p className="font-bold text-xs text-zinc-950 dark:text-white uppercase leading-tight">
                              {propertyTitle}
                            </p>
                            <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-zinc-400" />
                              <span>{propertyLocation}</span>
                            </p>
                          </td>

                          {/* Payment Type */}
                          <td className="py-3.5 px-3 text-xs text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                              <span>{tx.paymentType || 'Rent payment'}</span>
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-3 font-black text-xs text-zinc-950 dark:text-white whitespace-nowrap">
                            GH₵ {Number(tx.amount || 0).toLocaleString()}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {tx.status === 'PENDING' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 text-[11px] font-bold border border-amber-200/50 dark:border-amber-800/40">
                                <Clock className="w-3 h-3 stroke-[2.5]" />
                                <span>PENDING</span>
                              </span>
                            ) : tx.status === 'FAILED' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 text-[11px] font-bold border border-rose-200/50 dark:border-rose-800/40">
                                <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                                <span>FAILED</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E6F7EC] dark:bg-emerald-950/50 text-[#16A34A] text-[11px] font-bold border border-emerald-200/50 dark:border-emerald-800/40">
                                <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                                <span>{tx.status || 'SUCCESS'}</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              {tx.isShowcase ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedReceiptTx(tx)}
                                  className="text-xs font-bold text-[#16A34A] hover:underline cursor-pointer"
                                >
                                  View receipt
                                </button>
                              ) : (
                                <Link
                                  href={`/dashboard/invoice/${tx.id}`}
                                  className="text-xs font-bold text-[#16A34A] hover:underline"
                                >
                                  View receipt
                                </Link>
                              )}
                              <span className="text-zinc-300 dark:text-zinc-700">|</span>
                              <button
                                type="button"
                                onClick={() =>
                                  tx.isShowcase ? setSelectedReceiptTx(tx) : handleDownloadPDF(tx.id)
                                }
                                className="text-[#16A34A] hover:opacity-80 transition cursor-pointer p-0.5"
                                title="Download PDF receipt"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ──── RIGHT PANEL (4 COLS): 2 ACTION CARDS ──── */}
          <div className="lg:col-span-4 space-y-5">
            {/* Card 1: Receipts & Documents (Resolves Anomaly 7) */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 p-6 text-center space-y-4 shadow-2xs">
              <div className="flex items-center justify-center gap-2 text-zinc-950 dark:text-white font-bold text-sm">
                <FileText className="w-4 h-4 text-[#16A34A]" />
                <h3>Receipts & documents</h3>
              </div>

              {/* 3D Document Illustration */}
              <div className="relative w-36 h-24 mx-auto">
                <Image
                  src="/images/payments/receipts-doc.png"
                  alt="Receipts and documents"
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed px-2">
                All your payment receipts, transaction proofs, and tax invoices are indexed here.
              </p>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('SUCCESS');
                    document.getElementById('transaction-history')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full py-2.5 px-4 rounded-full bg-[#0A3826] hover:bg-[#072B1D] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                >
                  <span>Filter paid receipts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <Link
                  href="/dashboard/agreements"
                  className="w-full py-2 px-4 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View tenancy agreements</span>
                </Link>
              </div>
            </div>

            {/* Card 2: Need Help With a Payment? */}
            <div className="bg-[#EBF7EE] dark:bg-emerald-950/20 border border-[#D5EFE0] dark:border-emerald-900/30 rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-zinc-950 dark:text-white font-bold text-sm">
                <Headphones className="w-4 h-4 text-[#16A34A]" />
                <h3>Need help with a payment?</h3>
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Our resident finance desk is on standby to assist with Mobile Money issues, bank transfers, or receipt verification.
              </p>

              <Link
                href="/support"
                className="w-full py-2.5 px-4 rounded-full bg-[#0A3826] hover:bg-[#072B1D] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer block text-center"
              >
                <span>Contact finance support</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="w-full bg-white dark:bg-[#0D100E] border-t border-zinc-200/60 dark:border-zinc-800 py-4 px-4 sm:px-6 lg:px-8 mt-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo-light.png"
                alt="AkwaabaHomes"
                width={28}
                height={28}
                className="w-7 h-7 object-contain block dark:hidden"
              />
              <Image
                src="/logo.png"
                alt="AkwaabaHomes"
                width={28}
                height={28}
                className="w-7 h-7 object-contain hidden dark:block"
              />
              <div className="leading-none">
                <span className="font-black text-xs text-[#141816] dark:text-white block">
                  AkwaabaHomes
                </span>
                <span className="text-[9.5px] font-medium text-[#3B6E5C] dark:text-emerald-400 block mt-0.5">
                  Live Well. Feel at Home.
                </span>
              </div>
            </Link>
            <span className="hidden sm:inline text-zinc-300 dark:text-zinc-700">•</span>
            <span className="font-medium">Secure payments for trusted stays in Ghana</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition">
              Privacy
            </Link>
            <span>|</span>
            <Link href="/terms" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition">
              Terms
            </Link>
            <span>|</span>
            <Link href="/help" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition">
              Help
            </Link>
          </div>
        </div>
      </footer>

      {/* ── Make a Payment Modal (Resolves Anomaly 4 & 8) ── */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-zinc-100 dark:border-zinc-800 space-y-4 relative">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-full text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-zinc-950 dark:text-white">
                  Make a Payment
                </h3>
                <p className="text-xs text-zinc-500">Fast & protected checkout in Ghanaian Cedis (GH₵)</p>
              </div>
            </div>

            {activeBooking ? (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Payment Purpose
                  </label>
                  <select
                    value={paymentPurpose}
                    onChange={(e) => setPaymentPurpose(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#16A34A]"
                  >
                    <option value="Rent payment">Rent payment</option>
                    <option value="Rent & Service Charge">Rent & Service Charge</option>
                    <option value="Utility & ECG Top-up">Utility & ECG Top-up</option>
                    <option value="Caution Deposit">Caution Deposit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Amount (GH₵)
                  </label>
                  <input
                    type="number"
                    min="50"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-black text-zinc-900 dark:text-white outline-none focus:border-[#16A34A]"
                  />
                </div>

                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Accommodation</span>
                    <span className="font-bold text-zinc-900 dark:text-white truncate max-w-[200px]">
                      {activeBooking.property?.title || 'Accommodation'}
                    </span>
                  </div>
                  {activeBooking.property?.location && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Location</span>
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        {activeBooking.property.location}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Accepted Gateways</span>
                    <span className="font-semibold text-[#16A34A]">MTN MoMo, Telecel, Card</span>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={isPaying}
                    onClick={handleProceedPayment}
                    className="w-full py-3 rounded-full bg-[#0A3826] hover:bg-[#072B1D] text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isPaying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Connecting to Paystack...</span>
                      </>
                    ) : (
                      <span>Proceed with Paystack (GH₵ {Number(paymentAmount || 0).toLocaleString()})</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentModalOpen(false)}
                    className="w-full py-2.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2 text-center text-xs">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-2">
                  <Info className="w-5 h-5 text-emerald-600 mx-auto" />
                  <p className="font-bold text-zinc-900 dark:text-white">
                    No Pending Accommodation Balance
                  </p>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed text-[11px]">
                    Rent and utility payments are linked to an approved room reservation or active tenancy agreement. Explore listings to book your next stay.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/properties"
                    onClick={() => setPaymentModalOpen(false)}
                    className="flex-1 py-2.5 rounded-full bg-[#0A3826] hover:bg-[#072B1D] text-white font-bold transition text-center"
                  >
                    Browse Listings
                  </Link>
                  <Link
                    href="/dashboard/tenant/bookings"
                    onClick={() => setPaymentModalOpen(false)}
                    className="flex-1 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 font-bold transition text-center"
                  >
                    My Bookings
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Receipt Preview Modal (Resolves Anomaly 6) ── */}
      {selectedReceiptTx && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setSelectedReceiptTx(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-zinc-100 dark:border-zinc-800 space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedReceiptTx(null)}
              className="absolute top-5 right-5 p-1 rounded-full text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#16A34A] block">
                  Official E-Receipt
                </span>
                <h3 className="text-base font-black text-zinc-950 dark:text-white">
                  {selectedReceiptTx.reference || selectedReceiptTx.id}
                </h3>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Property</span>
                <span className="font-bold text-zinc-900 dark:text-white uppercase truncate max-w-[200px]">
                  {selectedReceiptTx.property?.title || 'Accommodation'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Location</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  {selectedReceiptTx.property?.location || 'Ghana'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Payment Type</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {selectedReceiptTx.paymentType || 'Rent payment'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Status</span>
                <span className="font-bold text-[#16A34A]">
                  {selectedReceiptTx.status || 'SUCCESS'} (Verified)
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <span className="font-bold text-zinc-700 dark:text-zinc-300">Amount Paid</span>
                <span className="text-sm font-black text-[#16A34A]">
                  GH₵ {Number(selectedReceiptTx.amount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleDownloadPDF(selectedReceiptTx.id)}
                className="py-2.5 px-4 rounded-full bg-[#0A3826] hover:bg-[#072B1D] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedReceiptTx(null)}
                className="py-2.5 px-4 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
