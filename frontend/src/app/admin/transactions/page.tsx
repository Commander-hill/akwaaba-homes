'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Banknote,
  Receipt,
  CheckCircle,
  AlertCircle,
  Copy,
  Eye,
  ExternalLink,
  CreditCard,
  Building,
  User as UserIcon,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminFilterBar, { FilterConfig } from '@/components/admin/AdminFilterBar';
import AdminDataTable, { Column } from '@/components/admin/AdminDataTable';

export default function AdminTransactionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: transactions = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const res = await api.get('/admin/transactions');
      return res.data;
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Gateway reference copied to clipboard');
  };

  const stats = useMemo(() => {
    if (!Array.isArray(transactions)) return { total: 0, totalVolume: 0, successful: 0, pending: 0, failed: 0 };
    let totalVolume = 0;
    let successful = 0;
    let pending = 0;
    let failed = 0;

    transactions.forEach((t: any) => {
      const amt = Number(t.amount || 0);
      if (t.status === 'SUCCESS' || t.status === 'COMPLETED') {
        totalVolume += amt;
        successful++;
      } else if (t.status === 'PENDING') {
        pending++;
      } else {
        failed++;
      }
    });

    return { total: transactions.length, totalVolume, successful, pending, failed };
  }, [transactions]);

  const filteredTxns = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter((t: any) => {
      if (statusFilter === 'SUCCESS' && t.status !== 'SUCCESS' && t.status !== 'COMPLETED') return false;
      if (statusFilter === 'PENDING' && t.status !== 'PENDING') return false;
      if (statusFilter === 'FAILED' && t.status !== 'FAILED' && t.status !== 'REJECTED') return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const ref = (t.reference || '').toLowerCase();
        const prop = (t.property?.title || '').toLowerCase();
        const tenant = `${t.tenant?.firstName || ''} ${t.tenant?.lastName || ''}`.toLowerCase();
        const landlord = `${t.landlord?.firstName || ''} ${t.landlord?.lastName || ''}`.toLowerCase();

        return ref.includes(q) || prop.includes(q) || tenant.includes(q) || landlord.includes(q);
      }
      return true;
    });
  }, [transactions, statusFilter, search]);

  const filterConfigs: FilterConfig[] = [
    {
      id: 'status',
      label: 'Settlement Status',
      value: statusFilter,
      options: [
        { label: 'All Transactions', value: 'ALL' },
        { label: `Settled (${stats.successful})`, value: 'SUCCESS' },
        { label: `Pending (${stats.pending})`, value: 'PENDING' },
        { label: `Failed / Cancelled (${stats.failed})`, value: 'FAILED' }
      ],
      onChange: setStatusFilter
    }
  ];

  const columns: Column<any>[] = [
    {
      key: 'reference',
      header: 'Paystack Reference & Date',
      render: (t) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/admin/transactions/${t.id}`}
              className="font-mono font-bold text-xs text-zinc-900 dark:text-white hover:text-emerald-600 transition"
            >
              {t.reference}
            </Link>
            <button
              type="button"
              onClick={() => copyToClipboard(t.reference)}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
              title="Copy reference"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="text-[10px] text-zinc-400">
            {new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      )
    },
    {
      key: 'property',
      header: 'Property Premises',
      render: (t) => (
        <div className="space-y-0.5 max-w-[200px]">
          <div className="font-bold text-xs text-zinc-900 dark:text-white truncate">
            {t.property?.title || 'Residential Rental'}
          </div>
          <div className="text-[10px] text-zinc-400 truncate">
            {t.property?.location || 'Location unlisted'}
          </div>
        </div>
      )
    },
    {
      key: 'tenant',
      header: 'Tenant (Payer)',
      render: (t) => (
        <div className="text-xs">
          {t.tenant ? (
            <Link
              href={`/admin/tenants/${t.tenant.id}`}
              className="font-semibold text-zinc-900 dark:text-white hover:text-emerald-600 transition block truncate max-w-[150px]"
            >
              {t.tenant.firstName} {t.tenant.lastName}
            </Link>
          ) : (
            <span className="text-zinc-400">Unknown Tenant</span>
          )}
          <span className="text-[10px] text-zinc-400 block truncate max-w-[150px]">{t.tenant?.email}</span>
        </div>
      )
    },
    {
      key: 'landlord',
      header: 'Landlord (Beneficiary)',
      render: (t) => (
        <div className="text-xs">
          {t.landlord ? (
            <Link
              href={`/admin/landlords/${t.landlord.id}`}
              className="font-semibold text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 transition block truncate max-w-[150px]"
            >
              {t.landlord.firstName} {t.landlord.lastName}
            </Link>
          ) : (
            <span className="text-zinc-400">Unknown Landlord</span>
          )}
          <span className="text-[10px] text-zinc-400 block truncate max-w-[150px]">{t.landlord?.email}</span>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Amount Paid',
      render: (t) => (
        <div className="text-xs font-mono font-bold text-zinc-900 dark:text-white">
          GH₵ {Number(t.amount || 0).toLocaleString()}
          <span className="text-[10px] text-zinc-400 block font-sans font-normal uppercase">
            {t.paymentMethod || 'MoMo / Card'}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <AdminStatusBadge status={t.status || 'PENDING'} />
    },
    {
      key: 'actions',
      header: 'Receipt & Audit',
      align: 'right',
      render: (t) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/admin/transactions/${t.id}`}
            className="px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition flex items-center gap-1"
          >
            <Eye className="w-3 h-3" /> View Docket
          </Link>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Financial Transactions & Payment Ledger"
        subtitle="Oversight of tenant advance rent payments, Paystack gateway settlements, and landlord disbursements."
        badge={
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Total Volume: GH₵ {stats.totalVolume.toLocaleString()}
          </span>
        }
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Operations', href: '/admin/transactions' },
          { label: 'Transactions' }
        ]}
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="px-3.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-emerald-600' : ''}`} />
            Sync Ledger
          </button>
        }
      />

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter by transaction reference, property, tenant, or landlord..."
        filters={filterConfigs}
        totalCount={filteredTxns.length}
      />

      <AdminDataTable
        columns={columns}
        data={filteredTxns}
        keyExtractor={(t) => t.id}
        isLoading={isLoading}
        emptyTitle="No financial transactions found"
        emptyDescription="No transaction records match your search filter."
      />
    </div>
  );
}
