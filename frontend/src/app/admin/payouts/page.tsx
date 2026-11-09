'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Banknote,
  Receipt,
  CheckCircle,
  Clock,
  AlertCircle,
  Copy,
  ExternalLink,
  CreditCard,
  User,
  RefreshCw,
  Download,
  Phone,
  Building
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminFilterBar, { FilterConfig } from '@/components/admin/AdminFilterBar';
import AdminDataTable, { Column } from '@/components/admin/AdminDataTable';
import { useStepUpAuth } from '@/hooks/useStepUpAuth';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

export default function AdminPayoutsPage() {
  const queryClient = useQueryClient();
  const { requestStepUp, StepUpModal } = useStepUpAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-payouts', statusFilter, search],
    queryFn: async () => {
      const res = await api.get('/admin/payouts', {
        params: {
          status: statusFilter,
          search: search || undefined
        }
      });
      return res.data;
    }
  });

  const payouts = data?.payouts || [];
  const stats = data?.stats || {
    totalCount: 0,
    pendingCount: 0,
    pendingSum: 0,
    processingCount: 0,
    processingSum: 0,
    successCount: 0,
    successSum: 0,
    failedCount: 0,
    failedSum: 0
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };


  const handleReleaseEscrow = (payout: any) => {
    requestStepUp({
      title: 'Manual Escrow Payout Release',
      description: `You are executing an elevated financial action: Releasing GHS ${Number(payout.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })} from platform escrow to ${payout.landlord?.firstName || 'Landlord'} ${payout.landlord?.lastName || ''}.`,
      actionType: 'ESCROW_RELEASE',
      payloadSummary: [
        { label: 'Recipient', value: `${payout.landlord?.firstName || ''} ${payout.landlord?.lastName || ''}` },
        { label: 'Amount', value: `GHS ${Number(payout.amount).toFixed(2)}` },
        { label: 'Destination', value: `${payout.bankOrNetwork} (${payout.accountNumber})` },
        { label: 'Transfer Mode', value: payout.recipientType }
      ],
      onSuccess: async (stepUpToken: string) => {
        try {
          await api.put(`/admin/payouts/${payout.id}/status`, { status: 'SUCCESS' }, {
            headers: { 'x-step-up-token': stepUpToken }
          });
          toast.success(`GHS ${Number(payout.amount).toFixed(2)} disbursed to ${payout.accountName} successfully!`);
          refetch();
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to release escrow payout.');
        }
      }
    });
  };

  const handleFailPayout = (payout: any) => {
    const reason = window.prompt('Please enter the failure / rejection reason (logged to Act 843 audit):', 'Banking information mismatch / invalid MoMo number');
    if (!reason) return;

    requestStepUp({
      title: 'Reject / Fail Escrow Disbursement',
      description: `Reject payout of GHS ${Number(payout.amount).toFixed(2)} for ${payout.landlord?.firstName} ${payout.landlord?.lastName}. Reason: ${reason}`,
      actionType: 'ESCROW_RELEASE',
      onSuccess: async (stepUpToken: string) => {
        try {
          await api.put(`/admin/payouts/${payout.id}/status`, { status: 'FAILED', failureReason: reason }, {
            headers: { 'x-step-up-token': stepUpToken }
          });
          toast.success('Payout marked as FAILED. Refund or revision logged.');
          refetch();
          queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to update payout status.');
        }
      }
    });
  };

  const exportCSV = () => {
    if (!payouts.length) {
      toast.error('No payout records to export');
      return;
    }

    const headers = ['ID', 'Landlord Name', 'Landlord Email', 'Amount (GHS)', 'Network / Bank', 'Account Name', 'Account Number', 'Recipient Type', 'Status', 'Transfer Reference', 'Requested Date'];
    const rows = payouts.map((p: any) => [
      p.id,
      `"${p.landlord?.firstName || ''} ${p.landlord?.lastName || ''}"`,
      `"${p.landlord?.email || ''}"`,
      p.amount.toFixed(2),
      `"${p.bankOrNetwork}"`,
      `"${p.accountName}"`,
      `"'${p.accountNumber}"`,
      p.recipientType,
      p.status,
      p.transferReference || 'N/A',
      new Date(p.createdAt).toISOString()
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AkwaabaHomes_Payouts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Payout batch exported to CSV');
  };

  const filterConfigs: FilterConfig[] = [
    {
      id: 'status',
      label: 'Status',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: 'All Statuses', value: 'ALL' },
        { label: 'Pending Hold', value: 'PENDING' },
        { label: 'Processing (MoMo/Bank)', value: 'PROCESSING' },
        { label: 'Settled', value: 'SUCCESS' },
        { label: 'Failed / Rejected', value: 'FAILED' }
      ]
    }
  ];

  const columns: Column<any>[] = [
    {
      key: 'landlord',
      header: 'Landlord / Recipient',
      render: (p: any) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/20 text-[#16A34A] flex items-center justify-center font-bold text-xs shrink-0">
            {p.landlord?.firstName?.[0] || 'L'}{p.landlord?.lastName?.[0] || 'D'}
          </div>
          <div className="min-w-0">
            <Link
              href={`/admin/landlords/${p.landlordId}`}
              className="font-bold text-sm text-zinc-950 dark:text-white hover:text-emerald-600 transition truncate block"
            >
              {p.landlord?.firstName || 'Host'} {p.landlord?.lastName || ''}
            </Link>
            <div className="text-xs text-zinc-500 truncate flex items-center gap-1.5 mt-0.5">
              <span>{p.accountName}</span>
              <span>•</span>
              <span className="font-mono">{p.landlord?.phoneNumber || p.landlord?.email}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (p: any) => (
        <div>
          <div className="text-sm font-black text-zinc-950 dark:text-white">
            GHS {Number(p.amount).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-500 font-medium">
            Net Landlord Earnings
          </div>
        </div>
      )
    },
    {
      key: 'destination',
      header: 'Payout Destination',
      render: (p: any) => (
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200">
            {p.recipientType === 'MOMO' ? <Phone className="w-3 h-3 text-emerald-500" /> : <Building className="w-3 h-3 text-blue-500" />}
            <span>{p.bankOrNetwork}</span>
          </div>
          <div className="text-xs font-mono text-zinc-600 dark:text-zinc-400 mt-1 flex items-center gap-1">
            <span>{p.accountNumber}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(p.accountNumber, 'Account number')}
              className="text-zinc-400 hover:text-zinc-600 transition"
              title="Copy account number"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (p: any) => (
        <div>
          <AdminStatusBadge status={p.status} />
          {p.failureReason && (
            <div className="text-[11px] text-red-500 font-medium mt-1 truncate max-w-xs" title={p.failureReason}>
              {p.failureReason}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (p: any) => (
        <div className="text-xs font-mono text-zinc-500">
          {p.transferReference ? (
            <div className="flex items-center gap-1">
              <span className="truncate max-w-[130px]">{p.transferReference}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(p.transferReference, 'Transfer reference')}
                className="text-zinc-400 hover:text-zinc-600 transition"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span className="text-zinc-400">Awaiting processing</span>
          )}
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Escrow Action',
      render: (p: any) => (
        <div className="flex items-center gap-1.5">
          {p.status === 'PENDING' && (
            <>
              <button
                type="button"
                onClick={() => handleReleaseEscrow(p)}
                className="px-2.5 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Authorize escrow payout release (Requires Step-Up Authentication)"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Release</span>
              </button>
              <button
                type="button"
                onClick={() => handleFailPayout(p)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-rose-50 text-rose-600 dark:bg-zinc-800 dark:hover:bg-rose-950/40 text-xs font-bold transition cursor-pointer"
                title="Reject or mark transfer as failed"
              >
                <span>Reject</span>
              </button>
            </>
          )}
          {p.status === 'PROCESSING' && (
            <button
              type="button"
              onClick={() => handleReleaseEscrow(p)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Mark Settled</span>
            </button>
          )}
          {p.status === 'SUCCESS' && (
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Settled</span>
            </span>
          )}
          {p.status === 'FAILED' && (
            <button
              type="button"
              onClick={() => handleReleaseEscrow(p)}
              className="px-2 py-1 rounded-md text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline cursor-pointer"
            >
              Retry Release
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Landlord Payouts & Disbursements"
        subtitle="Monitor MoMo and GHIPSS bank withdrawal disbursements, verify 24-hour move-in escrow releases, and manage settlement batch records."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${isRefetching ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#141816] border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Disbursed</div>
          <div className="text-2xl font-black text-emerald-600">
            GHS {stats.successSum.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">
            {stats.successCount} settled withdrawal{stats.successCount !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#141816] border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Pending Release</div>
          <div className="text-2xl font-black text-amber-500">
            GHS {stats.pendingSum.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">
            {stats.pendingCount} queue awaiting transfer
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#141816] border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">In Processing</div>
          <div className="text-2xl font-black text-blue-500">
            GHS {stats.processingSum.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">
            {stats.processingCount} bank / telco batch
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#141816] border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-1">
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Failed Transfers</div>
          <div className="text-2xl font-black text-red-500">
            GHS {stats.failedSum.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">
            {stats.failedCount} action required
          </div>
        </div>
      </div>

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by landlord, phone, recipient account, or transfer reference..."
        filters={filterConfigs}
        onReset={() => {
          setSearch('');
          setStatusFilter('ALL');
        }}
      />

      <StepUpModal />
      <AdminDataTable
        columns={columns}
        data={payouts}
        isLoading={isLoading}
        keyExtractor={(p) => p.id}
        emptyTitle="No Payout Records Found"
        emptyDescription="There are currently no landlord withdrawal requests matching your search filter."
      />
    </div>
  );
}
