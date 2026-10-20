'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Building,
  User as UserIcon,
  ShieldAlert,
  Calendar,
  RefreshCw
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminFilterBar, { FilterConfig } from '@/components/admin/AdminFilterBar';
import AdminDataTable, { Column } from '@/components/admin/AdminDataTable';

export default function AdminDisputesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['admin-breaches'],
    queryFn: async () => {
      const res = await api.get('/admin/breaches');
      return res.data;
    }
  });

  const reports: any[] = data?.breaches || [];

  const stats = useMemo(() => {
    return {
      total: reports.length,
      pending: reports.filter((r) => r.status === 'PENDING').length,
      verified: reports.filter((r) => r.status === 'VERIFIED').length,
      dismissed: reports.filter((r) => r.status === 'REJECTED' || r.status === 'DISMISSED').length
    };
  }, [reports]);

  const filteredReports = useMemo(() => {
    return reports.filter((r: any) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const title = (r.title || '').toLowerCase();
        const prop = (r.property?.title || '').toLowerCase();
        const tenant = `${r.tenant?.firstName || ''} ${r.tenant?.lastName || ''}`.toLowerCase();
        const reporter = `${r.reporter?.firstName || ''} ${r.reporter?.lastName || ''}`.toLowerCase();

        return title.includes(q) || prop.includes(q) || tenant.includes(q) || reporter.includes(q);
      }
      return true;
    });
  }, [reports, statusFilter, search]);

  const filterConfigs: FilterConfig[] = [
    {
      id: 'status',
      label: 'Adjudication Status',
      value: statusFilter,
      options: [
        { label: 'All Cases', value: 'ALL' },
        { label: `Action Required (${stats.pending})`, value: 'PENDING' },
        { label: `Verified Breaches (${stats.verified})`, value: 'VERIFIED' },
        { label: `Dismissed (${stats.dismissed})`, value: 'REJECTED' }
      ],
      onChange: setStatusFilter
    }
  ];

  const columns: Column<any>[] = [
    {
      key: 'claim',
      header: 'Case Title & Date',
      render: (r) => (
        <div className="space-y-0.5 max-w-[220px]">
          <Link
            href={`/admin/disputes/${r.id}`}
            className="font-bold text-xs text-zinc-900 dark:text-white hover:text-emerald-600 transition truncate block"
          >
            {r.title}
          </Link>
          <div className="text-[10px] text-zinc-400">
            Lodged: {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      )
    },
    {
      key: 'property',
      header: 'Property Premises',
      render: (r) => (
        <div className="space-y-0.5 max-w-[180px]">
          <div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 truncate">
            {r.property?.title || 'Residential Rental'}
          </div>
          <div className="text-[10px] text-zinc-400 truncate">
            {r.property?.location || 'Accra, Ghana'}
          </div>
        </div>
      )
    },
    {
      key: 'reporter',
      header: 'Claimant (Reporter)',
      render: (r) => (
        <div className="text-xs">
          <div className="font-semibold text-zinc-900 dark:text-white truncate max-w-[140px]">
            {r.reporter ? `${r.reporter.firstName} ${r.reporter.lastName}` : 'Anonymous'}
          </div>
          <span className="text-[10px] text-zinc-400 block truncate max-w-[140px]">{r.reporter?.email}</span>
        </div>
      )
    },
    {
      key: 'tenant',
      header: 'Respondent (Tenant)',
      render: (r) => (
        <div className="text-xs">
          <div className="font-semibold text-zinc-900 dark:text-white truncate max-w-[140px]">
            {r.tenant ? `${r.tenant.firstName} ${r.tenant.lastName}` : 'Unassigned'}
          </div>
          <span className="text-[10px] text-zinc-400 block truncate max-w-[140px]">{r.tenant?.email}</span>
        </div>
      )
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (r) => {
        const sev = r.severity || 'MEDIUM';
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
            sev === 'HIGH' || sev === 'CRITICAL'
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
          }`}>
            {sev}
          </span>
        );
      }
    },
    {
      key: 'status',
      header: 'Adjudication',
      render: (r) => <AdminStatusBadge status={r.status || 'PENDING'} />
    },
    {
      key: 'actions',
      header: 'Case Docket',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/admin/disputes/${r.id}`}
            className="px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition flex items-center gap-1"
          >
            <Eye className="w-3 h-3" /> Inspect Docket
          </Link>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tenancy Disputes & Breach Adjudication"
        subtitle="Adjudicate tenant breach allegations, inspect damage evidence, apply audited reputation penalties, and enforce residential compliance."
        badge={
          stats.pending > 0 ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              {stats.pending} Awaiting Verdict
            </span>
          ) : undefined
        }
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Operations', href: '/admin/disputes' },
          { label: 'Disputes' }
        ]}
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="px-3.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin text-emerald-600' : ''}`} />
            Sync Docket
          </button>
        }
      />

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter disputes by title, property, claimant, or tenant..."
        filters={filterConfigs}
        totalCount={filteredReports.length}
      />

      <AdminDataTable
        columns={columns}
        data={filteredReports}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyTitle="No dispute claims found"
        emptyDescription="There are currently no reported tenancy breach claims matching your search filter."
      />
    </div>
  );
}
