'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TenantPaymentsPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'COMPLETED' | 'PENDING'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch transactions
  const { data: transactionsData, isLoading: isLoadingTx } = useQuery({
    queryKey: ['tenant-transactions'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/transactions/tenant');
        return data.transactions || [];
      } catch {
        return [];
      }
    },
  });

  // 2. Fetch active/pending bookings to detect any pending rent or caution deposit
  const { data: bookingsData, isLoading: isLoadingBookings } = useQuery({
    queryKey: ['tenant-bookings'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/bookings/me');
        return data.bookings || [];
      } catch {
        return [];
      }
    },
  });

  const transactions = transactionsData || [];
  const bookings = bookingsData || [];

  // KPI Calculations
  const totalPaid = transactions
    .filter((t: any) => t.status === 'SUCCESS' || t.status === 'COMPLETED' || t.status === 'PAID')
    .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

  const activeBooking = bookings.find((b: any) =>
    ['ACTIVE', 'CONFIRMED', 'CHECKED_IN', 'APPROVED'].includes(b.status)
  );

  const cautionDepositHeld = activeBooking?.cautionDepositAmount || activeBooking?.property?.cautionDeposit || 0;

  // Filter transactions
  const filteredTransactions = transactions.filter((tx: any) => {
    const matchesTab =
      activeTab === 'ALL'
        ? true
        : activeTab === 'COMPLETED'
        ? tx.status === 'SUCCESS' || tx.status === 'COMPLETED' || tx.status === 'PAID'
        : tx.status === 'PENDING';

    const matchesSearch =
      searchTerm.trim() === '' ||
      tx.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.property?.title?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const handleDownloadPDF = async (txId: string) => {
    try {
      toast.loading('Preparing receipt PDF...', { id: 'pdf' });
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
      toast.error('Unable to generate receipt PDF.', { id: 'pdf' });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
            Payments & Invoices
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Review your rental transactions, caution deposits, and download tax-compliant digital receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeBooking && (
            <Link
              href={`/dashboard/invoice/${activeBooking.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>Latest Rent Invoice</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Financial Overview KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Rent Paid */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Total Rent Paid</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              GH₵ {totalPaid.toLocaleString()}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Across all tenancies</p>
          </div>
        </div>

        {/* Caution Deposit */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Caution Deposit Held</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              GH₵ {cautionDepositHeld.toLocaleString()}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Protected in escrow, refundable upon checkout</p>
          </div>
        </div>

        {/* Active Tenancy */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Active Tenancy</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-lg font-bold text-zinc-900 dark:text-white truncate">
              {activeBooking?.property?.title || 'No Active Stay'}
            </p>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {activeBooking?.room?.roomType || activeBooking?.property?.location || 'Browsing listings'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            All ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'COMPLETED'
                ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Completed
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Pending
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by reference, property..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1.5 focus:ring-[#16A34A]"
          />
        </div>
      </div>

      {/* ── Transaction Ledger Table ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
        {isLoadingTx || isLoadingBookings ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#16A34A] mx-auto" />
            <p className="text-xs text-zinc-400">Loading payment ledger...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white">No transactions found</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              {transactions.length === 0
                ? 'You have not made any rental payments yet. When you complete a booking payment, your official receipt will appear here.'
                : 'No transactions match the selected filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200/70 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 sm:px-6 py-3.5">Reference & Date</th>
                  <th className="px-4 sm:px-6 py-3.5">Accommodation</th>
                  <th className="px-4 sm:px-6 py-3.5">Amount</th>
                  <th className="px-4 sm:px-6 py-3.5">Status</th>
                  <th className="px-4 sm:px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {filteredTransactions.map((tx: any) => {
                  const isSuccess =
                    tx.status === 'SUCCESS' || tx.status === 'COMPLETED' || tx.status === 'PAID';
                  const dateStr = tx.createdAt
                    ? new Date(tx.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition"
                    >
                      <td className="px-4 sm:px-6 py-4">
                        <div className="font-mono font-bold text-zinc-900 dark:text-white">
                          {tx.reference || tx.id.slice(0, 10).toUpperCase()}
                        </div>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{dateStr}</span>
                        </div>
                      </td>

                      <td className="px-4 sm:px-6 py-4">
                        <div className="font-bold text-zinc-900 dark:text-white">
                          {tx.property?.title || 'Accommodation Booking'}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {tx.property?.location || 'Ghana'}
                        </div>
                      </td>

                      <td className="px-4 sm:px-6 py-4 font-black text-sm text-zinc-950 dark:text-white">
                        GH₵ {Number(tx.amount || 0).toLocaleString()}
                      </td>

                      <td className="px-4 sm:px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] border border-emerald-200 dark:border-emerald-800/40'
                              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 border border-amber-200 dark:border-amber-800/40'
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          <span>{tx.status}</span>
                        </span>
                      </td>

                      <td className="px-4 sm:px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/invoice/${tx.id}`}
                            className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                            title="View digital invoice"
                          >
                            <Receipt className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDownloadPDF(tx.id)}
                            className="p-1.5 rounded-lg text-[#16A34A] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                            title="Download PDF receipt"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
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
  );
}
