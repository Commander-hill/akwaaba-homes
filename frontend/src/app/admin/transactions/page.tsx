'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { 
  Loader2, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ShieldAlert, 
  Ban, 
  Search, 
  Filter, 
  Copy, 
  RefreshCw, 
  Building2, 
  User, 
  Sparkles, 
  Check, 
  AlertTriangle, 
  Calendar, 
  ExternalLink,
  Banknote,
  Receipt,
  FileCheck,
  ShieldCheck,
  X,
  Eye,
  BadgeCheck,
  ArrowUpRight,
  Layers
} from 'lucide-react';

type SubStatusFilter = 'ALL' | 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'FAILED';
type ActiveTab = 'LICENSES' | 'ESCROW_TXNS';

// Currency formatter
const formatGhc = (amount: number | null | undefined) => {
  return `GH₵ ${Number(amount || 0).toLocaleString()}`;
};

export default function AdminTransactionsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>('LICENSES');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubStatusFilter>('ALL');
  
  // Inspection / Revoke modals
  const [selectedSubForRevoke, setSelectedSubForRevoke] = useState<any | null>(null);
  const [selectedSubDetails, setSelectedSubDetails] = useState<any | null>(null);
  const [selectedTxnDetails, setSelectedTxnDetails] = useState<any | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  // Subscriptions Query
  const { data: subscriptions, isLoading: subsLoading, isRefetching: subsRefetching, refetch: refetchSubs } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const res = await api.get('/admin/subscriptions');
      return res.data;
    }
  });

  // Transactions Query
  const { data: transactions, isLoading: txnsLoading, isRefetching: txnsRefetching, refetch: refetchTxns } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const res = await api.get('/admin/transactions');
      return res.data;
    }
  });

  // Mutations
  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/admin/subscriptions/${id}/activate`);
    },
    onSuccess: () => {
      toast.success('Listing license activated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      setSelectedSubDetails(null);
    },
    onError: () => {
      toast.error('Failed to activate listing license.');
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.put(`/admin/subscriptions/${id}/revoke`, { reason });
    },
    onSuccess: () => {
      toast.success('Listing license revoked & property unlisted.');
      setSelectedSubForRevoke(null);
      setSelectedSubDetails(null);
      setRevokeReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: () => {
      toast.error('Failed to revoke listing license.');
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Reference copied to clipboard!');
  };

  // Filter Subscriptions
  const filteredSubscriptions = useMemo(() => {
    if (!subscriptions || !Array.isArray(subscriptions)) return [];

    return subscriptions.filter((sub: any) => {
      const landlordName = `${sub.property?.landlord?.firstName || ''} ${sub.property?.landlord?.lastName || ''}`.toLowerCase();
      const email = (sub.property?.landlord?.email || '').toLowerCase();
      const propTitle = (sub.property?.title || '').toLowerCase();
      const ref = (sub.paymentReference || '').toLowerCase();
      const search = searchTerm.toLowerCase().trim();

      const matchesSearch = !search || landlordName.includes(search) || email.includes(search) || propTitle.includes(search) || ref.includes(search);
      if (!matchesSearch) return false;

      if (statusFilter === 'ACTIVE') return sub.isActive && sub.daysRemaining > 0;
      if (statusFilter === 'PENDING') return sub.paymentStatus === 'PENDING';
      if (statusFilter === 'EXPIRED') return sub.daysRemaining <= 0 && sub.paymentStatus === 'COMPLETED';
      if (statusFilter === 'FAILED') return sub.paymentStatus === 'FAILED' || (!sub.isActive && sub.paymentStatus !== 'PENDING');

      return true;
    });
  }, [subscriptions, searchTerm, statusFilter]);

  // Filter Transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions || !Array.isArray(transactions)) return [];

    return transactions.filter((txn: any) => {
      const tenantName = `${txn.tenant?.firstName || ''} ${txn.tenant?.lastName || ''}`.toLowerCase();
      const landlordName = `${txn.landlord?.firstName || ''} ${txn.landlord?.lastName || ''}`.toLowerCase();
      const propTitle = (txn.property?.title || '').toLowerCase();
      const ref = (txn.reference || '').toLowerCase();
      const search = searchTerm.toLowerCase().trim();

      return !search || tenantName.includes(search) || landlordName.includes(search) || propTitle.includes(search) || ref.includes(search);
    });
  }, [transactions, searchTerm]);

  // Overall KPI Calculations
  const stats = useMemo(() => {
    const totalSubs = subscriptions?.length || 0;
    const activeSubs = subscriptions?.filter((s: any) => s.isActive && s.daysRemaining > 0).length || 0;
    const pendingSubs = subscriptions?.filter((s: any) => s.paymentStatus === 'PENDING').length || 0;
    const subRevenue = (subscriptions?.filter((s: any) => s.paymentStatus === 'COMPLETED').length || 0) * 100;
    
    let totalEscrow = 0;
    let totalTxnCount = transactions?.length || 0;
    (transactions || []).forEach((t: any) => {
      if (t.status === 'SUCCESS') totalEscrow += (t.amount || 0);
    });

    const grandTotalVolume = totalEscrow + subRevenue;

    return { totalSubs, activeSubs, pendingSubs, subRevenue, totalEscrow, totalTxnCount, grandTotalVolume };
  }, [subscriptions, transactions]);

  const isLoading = subsLoading || txnsLoading;
  const isRefetching = subsRefetching || txnsRefetching;

  const handleRefresh = () => {
    refetchSubs();
    refetchTxns();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-[#0F5132]" />
        <p className="text-sm font-semibold text-slate-500">Loading financial transactions & licenses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-12 animate-in">
      {/* ─── HEADER CONTAINER ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              Financial & Licensing Ledger
            </span>
            <span className="text-xs font-semibold text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {stats.totalSubs} Listing Licenses • {stats.totalTxnCount} Escrow Payments
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Financial Transactions & Listing Licenses Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Institutional oversight of annual landlord listing subscriptions (GH₵ 100/yr), tenant rent escrow deposits, Paystack gateway records, and license enforcement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefetching}
            className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer text-slate-700 dark:text-slate-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-[#0F5132]' : ''}`} />
            <span>Sync Ledger</span>
          </button>
        </div>
      </div>

      {/* ─── 4-CARD EXECUTIVE FINANCIAL KPI STRIP ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Platform Volume */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-xs">
          <div className="flex justify-between items-center text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Processed Volume
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F5132] dark:text-emerald-400 mb-1">
            {formatGhc(stats.grandTotalVolume)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Escrow deposits + annual listing permit fees
          </p>
        </div>

        {/* Active Landlord Licenses */}
        <div 
          onClick={() => { setActiveTab('LICENSES'); setStatusFilter('ACTIVE'); }}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 transition-all shadow-xs group"
        >
          <div className="flex justify-between items-center text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Listing Licenses
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {stats.activeSubs} <span className="text-sm font-semibold text-slate-400">/ {stats.totalSubs}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Properties verified with valid annual permits
          </p>
        </div>

        {/* Listing License Revenue */}
        <div 
          onClick={() => setActiveTab('LICENSES')}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 transition-all shadow-xs group"
        >
          <div className="flex justify-between items-center text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Listing License Fees
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {formatGhc(stats.subRevenue)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Annual GH₵ 100 platform listing permits
          </p>
        </div>

        {/* Tenant Rent Escrow */}
        <div 
          onClick={() => setActiveTab('ESCROW_TXNS')}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 transition-all shadow-xs group"
        >
          <div className="flex justify-between items-center text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Escrow Rent Settlements
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {formatGhc(stats.totalEscrow)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.totalTxnCount} successful tenancy payments
          </p>
        </div>
      </div>

      {/* ─── DUAL SEGMENTED MODE TABS ───────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setActiveTab('LICENSES'); setSearchTerm(''); }}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'LICENSES'
                ? 'bg-[#0F5132] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            Landlord Listing Licenses ({stats.totalSubs})
          </button>

          <button
            onClick={() => { setActiveTab('ESCROW_TXNS'); setSearchTerm(''); }}
            className={`px-4 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'ESCROW_TXNS'
                ? 'bg-[#0F5132] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Tenant Rent Escrow Ledger ({stats.totalTxnCount})
          </button>
        </div>
      </div>

      {/* ─── SEARCH & FILTER CONTROLS ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={activeTab === 'LICENSES' ? "Search landlord, property, or Paystack reference..." : "Search tenant, landlord, property, or txn reference..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5132] dark:focus:ring-emerald-500 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-800 dark:text-slate-200">{activeTab === 'LICENSES' ? filteredSubscriptions.length : filteredTransactions.length}</strong> records
          </div>
        </div>

        {/* Filter Pills for Subscriptions */}
        {activeTab === 'LICENSES' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-[#0F5132] text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              All Licenses ({stats.totalSubs})
            </button>

            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Active ({stats.activeSubs})
            </button>

            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Pending ({stats.pendingSubs})
            </button>

            <button
              onClick={() => setStatusFilter('EXPIRED')}
              className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                statusFilter === 'EXPIRED'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Expired
            </button>
          </div>
        )}
      </div>

      {/* ─── TAB 1: LISTING LICENSES TABLE ───────────────────────────────── */}
      {activeTab === 'LICENSES' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-[#0F5132] text-white shadow-xs">
                <tr>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Gateway Reference</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Landlord</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Property</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white">License Fee</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Status & Countdown</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Validity Range</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="font-bold text-sm">No listing license records found.</p>
                      <button 
                        onClick={() => { setStatusFilter('ALL'); setSearchTerm(''); }}
                        className="mt-2 text-xs font-bold text-[#0F5132] hover:underline"
                      >
                        Clear search filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredSubscriptions.map((sub: any) => {
                    const landlord = sub.property?.landlord || {};
                    const property = sub.property || {};
                    const isLicenseActive = sub.isActive && sub.daysRemaining > 0;

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Reference */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <code className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                                {sub.paymentReference}
                              </code>
                              <button
                                onClick={() => copyToClipboard(sub.paymentReference)}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                                title="Copy Paystack reference"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Issued {new Date(sub.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        </td>

                        {/* Landlord */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="font-extrabold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{landlord.firstName} {landlord.lastName}</span>
                              {landlord.isVerifiedLandlord && (
                                <BadgeCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                              {landlord.email}
                            </div>
                          </div>
                        </td>

                        {/* Property */}
                        <td className="px-6 py-4">
                          <div className="space-y-0.5 max-w-[200px]">
                            <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                              {property.title || 'Untitled Property'}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {property.location || 'N/A'}
                            </div>
                          </div>
                        </td>

                        {/* License Fee */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-black text-sm text-[#0F5132] dark:text-emerald-400">
                            GH₵ 100
                            <span className="text-xs font-normal text-slate-400 ml-0.5">/yr</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">
                            Annual Permit
                          </span>
                        </td>

                        {/* Status & Countdown */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isLicenseActive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
                                : sub.paymentStatus === 'PENDING'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200'
                            }`}>
                              {isLicenseActive ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                              {isLicenseActive ? 'Active License' : sub.paymentStatus}
                            </span>

                            {isLicenseActive && (
                              <div className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <span>⚡ {sub.daysRemaining} days remaining</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Validity Range */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(sub.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            <span className="text-slate-400">→</span>
                            {new Date(sub.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedSubDetails(sub)}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                              title="Audit license details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Inspect
                            </button>

                            {isLicenseActive ? (
                              <button
                                onClick={() => setSelectedSubForRevoke(sub)}
                                className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Revoke
                              </button>
                            ) : sub.paymentStatus === 'PENDING' ? (
                              <button
                                onClick={() => activateMutation.mutate(sub.id)}
                                disabled={activateMutation.isPending}
                                className="px-2.5 py-1.5 bg-[#0F5132] hover:bg-[#146c43] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                              >
                                {activateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Activate
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── TAB 2: TENANT RENT ESCROW TRANSACTIONS TABLE ─────────────────── */}
      {activeTab === 'ESCROW_TXNS' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-[#0F5132] text-white shadow-xs">
                <tr>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Txn Reference</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Property</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Tenant (Payer)</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Landlord (Beneficiary)</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Rent Deposited</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Status</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      <Receipt className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="font-bold text-sm">No rent escrow transaction records found.</p>
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="mt-2 text-xs font-bold text-[#0F5132] hover:underline"
                      >
                        Clear search filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((txn: any) => (
                    <tr key={txn.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Reference */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <code className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-800 dark:text-slate-200">
                              {txn.reference}
                            </code>
                            <button
                              onClick={() => copyToClipboard(txn.reference)}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                              title="Copy transaction reference"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(txn.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </td>

                      {/* Property */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5 max-w-[200px]">
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                            {txn.property?.title || 'Residential Rental'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {txn.property?.location || 'N/A'}
                          </div>
                        </div>
                      </td>

                      {/* Tenant */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {txn.tenant ? `${txn.tenant.firstName} ${txn.tenant.lastName}` : 'Unknown Tenant'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {txn.tenant?.email}
                          </div>
                        </div>
                      </td>

                      {/* Landlord */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {txn.landlord ? `${txn.landlord.firstName} ${txn.landlord.lastName}` : 'Unknown Landlord'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {txn.landlord?.email}
                          </div>
                        </div>
                      </td>

                      {/* Escrow Amount */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-black text-sm text-[#0F5132] dark:text-emerald-400">
                          {formatGhc(txn.amount)}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          Escrow Protected
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          txn.status === 'SUCCESS' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200'
                        }`}>
                          {txn.status === 'SUCCESS' ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-red-600" />}
                          {txn.status === 'SUCCESS' ? 'Settled' : txn.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTxnDetails(txn)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-xs ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL: INSPECT LICENSE DETAILS ─────────────────────────────── */}
      {selectedSubDetails && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-emerald-900/30 max-h-[92vh] flex flex-col">
            <div className="px-6 py-5 bg-gradient-to-r from-[#0F5132] via-[#146c43] to-slate-900 text-white flex justify-between items-center relative overflow-hidden shadow-md">
              <div className="flex items-center gap-3.5 z-10">
                <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 border border-white/10 shadow-inner">
                  <FileCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Listing License Audit
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight mt-0.5 truncate max-w-md">
                    {selectedSubDetails.property?.title || 'Property Permit'}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setSelectedSubDetails(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50 dark:bg-slate-950/50">
              {/* Fee & Reference Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">License Fee</span>
                  <div className="text-2xl font-black text-[#0F5132] dark:text-emerald-400">
                    GH₵ 100
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">Annual Listing Permit</span>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Permit Status</span>
                  <span className={`inline-block text-xs font-extrabold px-2.5 py-1 rounded-full ${
                    selectedSubDetails.isActive && selectedSubDetails.daysRemaining > 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                  }`}>
                    {selectedSubDetails.isActive && selectedSubDetails.daysRemaining > 0 ? 'Active License' : 'Inactive / Expired'}
                  </span>
                  {selectedSubDetails.daysRemaining > 0 && (
                    <div className="text-[11px] font-bold text-emerald-600 mt-1">
                      {selectedSubDetails.daysRemaining} days validity left
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Paystack Ref</span>
                  <code className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 block truncate">
                    {selectedSubDetails.paymentReference}
                  </code>
                </div>
              </div>

              {/* Landlord & Property Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Licensed Landlord</span>
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {selectedSubDetails.property?.landlord?.firstName} {selectedSubDetails.property?.landlord?.lastName}
                  </p>
                  <div className="text-xs text-slate-500 space-y-0.5">
                    <div>Email: {selectedSubDetails.property?.landlord?.email}</div>
                    {selectedSubDetails.property?.landlord?.phoneNumber && (
                      <div>Phone: {selectedSubDetails.property?.landlord?.phoneNumber}</div>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Licensed Property</span>
                    {selectedSubDetails.property?.id && (
                      <Link
                        href={`/properties/${selectedSubDetails.property.id}`}
                        target="_blank"
                        className="text-[10px] font-bold text-[#0F5132] hover:underline flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-3 h-3" /> View Page
                      </Link>
                    )}
                  </div>
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {selectedSubDetails.property?.title}
                  </p>
                  <div className="text-xs text-slate-500">
                    {selectedSubDetails.property?.location}
                  </div>
                </div>
              </div>

              {/* Validity Timeline */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Permit Validity Range (365 Days)
                </span>
                <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Valid From</span>
                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">
                      {new Date(selectedSubDetails.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Valid Until</span>
                    <span className="text-slate-800 dark:text-slate-200 font-extrabold">
                      {new Date(selectedSubDetails.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex justify-end gap-2">
              <button
                onClick={() => setSelectedSubDetails(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: ESCROW RECEIPT DETAILS ──────────────────────────────── */}
      {selectedTxnDetails && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-emerald-900/30 max-h-[92vh] flex flex-col">
            <div className="px-6 py-5 bg-gradient-to-r from-[#0F5132] via-[#146c43] to-slate-900 text-white flex justify-between items-center relative overflow-hidden shadow-md">
              <div className="flex items-center gap-3.5 z-10">
                <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 border border-white/10 shadow-inner">
                  <Receipt className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Escrow Payment Receipt
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight mt-0.5 truncate max-w-sm">
                    {formatGhc(selectedTxnDetails.amount)}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setSelectedTxnDetails(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50 dark:bg-slate-950/50 text-xs">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Payment Gateway Ref:</span>
                  <code className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedTxnDetails.reference}</code>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Transaction Status:</span>
                  <span className="font-extrabold text-emerald-600">Settled (SUCCESS)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {new Date(selectedTxnDetails.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">Counterparties</div>
                <div>Tenant (Lessee): <strong>{selectedTxnDetails.tenant?.firstName} {selectedTxnDetails.tenant?.lastName}</strong> ({selectedTxnDetails.tenant?.email})</div>
                <div>Landlord (Lessor): <strong>{selectedTxnDetails.landlord?.firstName} {selectedTxnDetails.landlord?.lastName}</strong> ({selectedTxnDetails.landlord?.email})</div>
                <div>Property: <strong>{selectedTxnDetails.property?.title}</strong> ({selectedTxnDetails.property?.location})</div>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedTxnDetails(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REVOKE LICENSE CONFIRMATION ──────────────────────────── */}
      {selectedSubForRevoke && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-red-200 dark:border-red-900/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300">
                <Ban className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  License Enforcement
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                  Revoke Listing Permit?
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Revoking this license will immediately unpublish <strong>{selectedSubForRevoke.property?.title}</strong> from Akwaaba Homes search directory. The landlord will be notified via email and in-app alert.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Reason for Revocation:
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g., Landlord violated Act 220 advance rent regulations or fraudulent ownership dispute..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => { setSelectedSubForRevoke(null); setRevokeReason(''); }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => revokeMutation.mutate({ id: selectedSubForRevoke.id, reason: revokeReason })}
                disabled={revokeMutation.isPending}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5"
              >
                {revokeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Confirm Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
