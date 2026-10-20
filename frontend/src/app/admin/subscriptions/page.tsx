'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  CreditCard,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminFilterBar, { FilterConfig } from '@/components/admin/AdminFilterBar';
import AdminDataTable, { Column } from '@/components/admin/AdminDataTable';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

export default function AdminSubscriptionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [revokeDialog, setRevokeDialog] = useState<{ isOpen: boolean; id: string | null; title: string }>({
    isOpen: false,
    id: null,
    title: ''
  });

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const res = await api.get('/admin/subscriptions');
      return res.data;
    }
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.put(`/admin/subscriptions/${id}/activate`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Property listing license activated');
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to activate subscription');
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await api.put(`/admin/subscriptions/${id}/revoke`, { reason });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Subscription license revoked');
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to revoke subscription');
    }
  });

  const stats = useMemo(() => {
    if (!Array.isArray(subscriptions)) return { total: 0, active: 0, expired: 0, pending: 0 };
    return {
      total: subscriptions.length,
      active: subscriptions.filter((s: any) => s.isActive && s.paymentStatus === 'COMPLETED').length,
      expired: subscriptions.filter((s: any) => !s.isActive || s.paymentStatus === 'EXPIRED').length,
      pending: subscriptions.filter((s: any) => s.paymentStatus === 'PENDING').length
    };
  }, [subscriptions]);

  const filteredSubs = useMemo(() => {
    if (!Array.isArray(subscriptions)) return [];
    return subscriptions.filter((s: any) => {
      if (statusFilter === 'ACTIVE' && (!s.isActive || s.paymentStatus !== 'COMPLETED')) return false;
      if (statusFilter === 'EXPIRED' && s.isActive && s.paymentStatus === 'COMPLETED') return false;
      if (statusFilter === 'PENDING' && s.paymentStatus !== 'PENDING') return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const prop = (s.property?.title || '').toLowerCase();
        const landlord = `${s.property?.landlord?.firstName || ''} ${s.property?.landlord?.lastName || ''}`.toLowerCase();
        const email = (s.property?.landlord?.email || '').toLowerCase();
        const ref = (s.paymentRef || '').toLowerCase();

        return prop.includes(q) || landlord.includes(q) || email.includes(q) || ref.includes(q);
      }
      return true;
    });
  }, [subscriptions, statusFilter, search]);

  const filterConfigs: FilterConfig[] = [
    {
      id: 'status',
      label: 'License Status',
      value: statusFilter,
      options: [
        { label: 'All Licenses', value: 'ALL' },
        { label: `Active (${stats.active})`, value: 'ACTIVE' },
        { label: `Pending Payment (${stats.pending})`, value: 'PENDING' },
        { label: `Expired / Inactive (${stats.expired})`, value: 'EXPIRED' }
      ],
      onChange: setStatusFilter
    }
  ];

  const columns: Column<any>[] = [
    {
      key: 'property',
      header: 'Listing & Host',
      render: (s) => (
        <div className="space-y-0.5">
          <Link
            href={`/admin/subscriptions/${s.id}`}
            className="font-bold text-xs text-zinc-900 dark:text-white hover:text-emerald-600 transition truncate max-w-[220px] block"
          >
            {s.property?.title || 'Untitled Property'}
          </Link>
          <div className="text-[11px] text-zinc-500">
            {s.property?.landlord ? (
              <Link
                href={`/admin/landlords/${s.property.landlord.id}`}
                className="hover:underline text-zinc-600 dark:text-zinc-400 font-medium"
              >
                {s.property.landlord.firstName} {s.property.landlord.lastName}
              </Link>
            ) : (
              'Unknown Landlord'
            )}
          </div>
        </div>
      )
    },
    {
      key: 'plan',
      header: 'Plan / Tier',
      render: (s) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 uppercase">
          {s.plan || 'Standard Listing'}
        </span>
      )
    },
    {
      key: 'duration',
      header: 'Period & Days Left',
      render: (s) => {
        const now = new Date();
        const end = new Date(s.endDate);
        const diffMs = end.getTime() - now.getTime();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isExp = daysLeft <= 0 || !s.isActive;

        return (
          <div className="text-xs space-y-0.5">
            <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded-full text-[10px] ${
              isExp
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                : daysLeft <= 14
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}>
              {isExp ? 'EXPIRED' : `${daysLeft} days remaining`}
            </span>
            <div className="text-[10px] text-zinc-400">
              Exp: {new Date(s.endDate).toLocaleDateString('en-GB')}
            </div>
          </div>
        );
      }
    },
    {
      key: 'payment',
      header: 'Payment Ref',
      render: (s) => (
        <div className="text-xs">
          <code className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 block truncate max-w-[140px]">
            {s.paymentRef || 'N/A'}
          </code>
          <span className="text-[10px] text-zinc-400 uppercase font-semibold">
            {s.paymentStatus || 'PENDING'}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'License Status',
      render: (s) => (
        <AdminStatusBadge status={s.isActive ? 'ACTIVE' : 'EXPIRED'} />
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/admin/subscriptions/${s.id}`}
            className="px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition"
          >
            <Eye className="w-3 h-3 inline mr-1" /> Inspect
          </Link>

          {!s.isActive && (
            <button
              type="button"
              disabled={activateMutation.isPending}
              onClick={() => activateMutation.mutate(s.id)}
              className="px-2 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition cursor-pointer disabled:opacity-50"
              title="Activate for 1 Year"
            >
              <Check className="w-3 h-3" />
            </button>
          )}

          {s.isActive && (
            <button
              type="button"
              onClick={() => setRevokeDialog({ isOpen: true, id: s.id, title: s.property?.title || 'Property' })}
              className="px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer"
              title="Revoke License"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Landlord Property Subscriptions & Licenses"
        subtitle="Manage annual listing licenses, monitor expiration timelines, and enforce billing compliance across host portfolios."
        badge={
          stats.pending > 0 ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {stats.pending} Pending Invoices
            </span>
          ) : undefined
        }
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Operations', href: '/admin/subscriptions' },
          { label: 'Subscriptions' }
        ]}
      />

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter by property title, landlord, or payment reference..."
        filters={filterConfigs}
        totalCount={filteredSubs.length}
      />

      <AdminDataTable
        columns={columns}
        data={filteredSubs}
        keyExtractor={(s) => s.id}
        isLoading={isLoading}
        emptyTitle="No property subscriptions found"
        emptyDescription="No subscription licenses match your search query."
      />

      {/* Audited License Revocation Dialog */}
      <AdminConfirmDialog
        isOpen={revokeDialog.isOpen}
        onClose={() => setRevokeDialog({ isOpen: false, id: null, title: '' })}
        title={`Revoke Listing License: "${revokeDialog.title}"`}
        description="Explain why this property's listing license is being revoked. The listing will immediately be unpublished from public catalog."
        confirmLabel="Revoke License"
        confirmVariant="danger"
        requireReason={true}
        reasonLabel="Audited Revocation Explanation"
        reasonPlaceholder="e.g. Non-payment of listing fee, chargeback inquiry, or host policy infringement."
        onConfirm={async (reason) => {
          if (!revokeDialog.id) return;
          await revokeMutation.mutateAsync({
            id: revokeDialog.id,
            reason
          });
        }}
      />
    </div>
  );
}
