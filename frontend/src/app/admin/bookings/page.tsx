'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  CalendarCheck,
  Home,
  User as UserIcon,
  CreditCard,
  Eye,
  ExternalLink,
  Calendar,
  FileText,
  DoorClosed,
  Banknote
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminFilterBar, { FilterConfig } from '@/components/admin/AdminFilterBar';
import AdminDataTable, { Column } from '@/components/admin/AdminDataTable';

const formatLeaseDuration = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return 'N/A';
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 360 && diffDays <= 370) return '1 Year (12 Mo)';
  if (diffDays >= 180 && diffDays <= 185) return '6 Months';
  if (diffDays >= 90 && diffDays <= 93) return '3 Months';

  const months = Math.round(diffDays / 30.4);
  if (months > 0) return `${months} Mo (${diffDays}d)`;
  return `${diffDays} Days`;
};

export default function AdminBookingsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const res = await api.get('/admin/bookings');
      return res.data;
    }
  });

  const stats = useMemo(() => {
    if (!Array.isArray(bookings)) return { total: 0, active: 0, pending: 0, cancelled: 0 };
    return {
      total: bookings.length,
      active: bookings.filter((b: any) => b.status === 'COMPLETED' || b.status === 'CONFIRMED').length,
      pending: bookings.filter((b: any) => b.status === 'PENDING').length,
      cancelled: bookings.filter((b: any) => b.status === 'CANCELLED' || b.status === 'REJECTED').length
    };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    if (!Array.isArray(bookings)) return [];
    return bookings.filter((b: any) => {
      if (statusFilter === 'ACTIVE' && b.status !== 'COMPLETED' && b.status !== 'CONFIRMED') return false;
      if (statusFilter === 'PENDING' && b.status !== 'PENDING') return false;
      if (statusFilter === 'CANCELLED' && b.status !== 'CANCELLED' && b.status !== 'REJECTED') return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const title = (b.property?.title || '').toLowerCase();
        const loc = (b.property?.location || '').toLowerCase();
        const tenant = `${b.tenant?.firstName || ''} ${b.tenant?.lastName || ''}`.toLowerCase();
        const tenantEmail = (b.tenant?.email || '').toLowerCase();
        const landlord = `${b.property?.landlord?.firstName || ''} ${b.property?.landlord?.lastName || ''}`.toLowerCase();
        const ref = (b.transaction?.reference || '').toLowerCase();

        return title.includes(q) || loc.includes(q) || tenant.includes(q) || tenantEmail.includes(q) || landlord.includes(q) || ref.includes(q);
      }
      return true;
    });
  }, [bookings, statusFilter, search]);

  const filterConfigs: FilterConfig[] = [
    {
      id: 'status',
      label: 'Booking Status',
      value: statusFilter,
      options: [
        { label: 'All Bookings', value: 'ALL' },
        { label: `Active Leases (${stats.active})`, value: 'ACTIVE' },
        { label: `Pending Move-In (${stats.pending})`, value: 'PENDING' },
        { label: `Cancelled (${stats.cancelled})`, value: 'CANCELLED' }
      ],
      onChange: setStatusFilter
    }
  ];

  const columns: Column<any>[] = [
    {
      key: 'property',
      header: 'Property & Unit',
      render: (b) => (
        <div className="space-y-1">
          <Link
            href={`/admin/bookings/${b.id}`}
            className="font-bold text-xs text-zinc-900 dark:text-white hover:text-emerald-600 transition flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate max-w-[200px]">{b.property?.title || 'Untitled Property'}</span>
          </Link>
          <div className="text-[11px] text-zinc-500 truncate max-w-[200px] flex items-center gap-1">
            {b.roomUnit && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono font-bold text-zinc-700 dark:text-zinc-300">
                <DoorClosed className="w-2.5 h-2.5" /> {b.roomUnit.unitNumber}
              </span>
            )}
            <span>{b.property?.location || 'Location unlisted'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'tenant',
      header: 'Tenant (Lessee)',
      render: (b) => (
        <div className="text-xs">
          {b.tenant ? (
            <Link
              href={`/admin/tenants/${b.tenant.id}`}
              className="font-bold text-zinc-900 dark:text-white hover:text-emerald-600 transition truncate max-w-[150px] block"
            >
              {b.tenant.firstName} {b.tenant.lastName}
            </Link>
          ) : (
            <span className="text-zinc-400">Unknown Tenant</span>
          )}
          <span className="text-[10px] text-zinc-400 truncate block max-w-[150px]">{b.tenant?.email}</span>
        </div>
      )
    },
    {
      key: 'landlord',
      header: 'Landlord (Lessor)',
      render: (b) => (
        <div className="text-xs">
          {b.property?.landlord ? (
            <Link
              href={`/admin/landlords/${b.property.landlord.id}`}
              className="font-semibold text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 transition truncate max-w-[150px] block"
            >
              {b.property.landlord.firstName} {b.property.landlord.lastName}
            </Link>
          ) : (
            <span className="text-zinc-400">Unknown Host</span>
          )}
          <span className="text-[10px] text-zinc-400 truncate block max-w-[150px]">{b.property?.landlord?.email}</span>
        </div>
      )
    },
    {
      key: 'period',
      header: 'Tenancy Term',
      render: (b) => (
        <div className="text-xs space-y-0.5">
          <div className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300 font-semibold text-[11px]">
            <Calendar className="w-3 h-3 text-emerald-600" />
            <span>{new Date(b.startDate).toLocaleDateString('en-GB')}</span>
            <span className="text-zinc-400">→</span>
            <span>{new Date(b.endDate).toLocaleDateString('en-GB')}</span>
          </div>
          <span className="inline-block text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
            {formatLeaseDuration(b.startDate, b.endDate)}
          </span>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Escrow Rent',
      render: (b) => {
        const amount = b.transaction?.amount || b.property?.price || 0;
        return (
          <div className="text-xs">
            <div className="font-mono font-bold text-zinc-900 dark:text-white">
              GH₵ {Number(amount).toLocaleString()}
            </div>
            <span className="text-[10px] text-zinc-400 uppercase font-medium">
              {b.transaction ? b.transaction.paymentMethod || 'MoMo / Card' : 'Escrow Reserved'}
            </span>
          </div>
        );
      }
    },
    {
      key: 'agreement',
      header: 'Agreement',
      render: (b) => {
        const isSigned = b.leaseAgreement?.status === 'COMPLETED';
        return b.leaseAgreement ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            isSigned
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
          }`}>
            <FileText className="w-3 h-3" />
            {isSigned ? 'Signed 📄' : 'Pending Sign'}
          </span>
        ) : (
          <span className="text-zinc-400 text-[11px] italic">Not generated</span>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => <AdminStatusBadge status={b.status || 'PENDING'} />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (b) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/admin/bookings/${b.id}`}
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
        title="Residential Bookings & Escrow Monitor"
        subtitle="System-wide registry of active leases, advance rent escrow deposits, digital tenancy agreements, and landlord-tenant fulfillments."
        badge={
          stats.pending > 0 ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {stats.pending} Pending Fulfillment
            </span>
          ) : undefined
        }
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Marketplace', href: '/admin/bookings' },
          { label: 'Bookings' }
        ]}
      />

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter bookings by property, tenant, landlord, or transaction ref..."
        filters={filterConfigs}
        totalCount={filteredBookings.length}
      />

      <AdminDataTable
        columns={columns}
        data={filteredBookings}
        keyExtractor={(b) => b.id}
        isLoading={isLoading}
        emptyTitle="No bookings found"
        emptyDescription="No bookings match your current filter criteria."
      />
    </div>
  );
}
