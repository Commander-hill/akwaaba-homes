'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import Link from 'next/link';
import {
  UserCheck,
  Building,
  Star,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Clock
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminDataTable, { Column } from '@/components/admin/AdminDataTable';
import AdminFilterBar, { FilterOption } from '@/components/admin/AdminFilterBar';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';

export default function AdminLandlordsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-landlords', page, limit],
    queryFn: async () => {
      const res = await api.get(`/admin/users?role=LANDLORD&page=${page}&limit=${limit}`);
      return res.data;
    }
  });

  const rawLandlords: any[] = Array.isArray(data) ? data : data?.users || [];
  const total = Array.isArray(data) ? rawLandlords.length : data?.total || 0;
  const totalPages = Array.isArray(data) ? 1 : data?.totalPages || 1;

  // Client filtering on active page / query
  const filteredLandlords = useMemo(() => {
    return rawLandlords.filter((l) => {
      if (verificationFilter === 'VERIFIED' && !l.isVerifiedLandlord) return false;
      if (verificationFilter === 'PENDING' && l.landlordVerificationStatus !== 'PENDING') return false;
      if (verificationFilter === 'NOT_SUBMITTED' && l.landlordVerificationStatus !== 'NOT_SUBMITTED') return false;
      if (statusFilter === 'ACTIVE' && l.isSuspended) return false;
      if (statusFilter === 'SUSPENDED' && !l.isSuspended) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${l.firstName || ''} ${l.lastName || ''}`.toLowerCase();
        const email = (l.email || '').toLowerCase();
        const phone = (l.phoneNumber || '').toLowerCase();
        return fullName.includes(q) || email.includes(q) || phone.includes(q);
      }

      return true;
    });
  }, [rawLandlords, verificationFilter, statusFilter, searchQuery]);

  const filterOptions: FilterOption[] = [
    {
      id: 'verification',
      label: 'Deed Audit',
      value: verificationFilter,
      onChange: (v) => {
        setVerificationFilter(v);
        setPage(1);
      },
      options: [
        { label: 'All Audits', value: 'ALL' },
        { label: 'Verified Deeds', value: 'VERIFIED' },
        { label: 'Pending Deeds', value: 'PENDING' },
        { label: 'Not Submitted', value: 'NOT_SUBMITTED' }
      ]
    },
    {
      id: 'status',
      label: 'Account',
      value: statusFilter,
      onChange: (v) => {
        setStatusFilter(v);
        setPage(1);
      },
      options: [
        { label: 'All Accounts', value: 'ALL' },
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Suspended', value: 'SUSPENDED' }
      ]
    }
  ];

  const columns: Column<any>[] = [
    {
      key: 'landlord',
      header: 'Landlord & Host',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-950/60 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-800/60">
            {row.firstName?.[0] || 'L'}
          </div>
          <div>
            <div className="font-bold text-zinc-950 dark:text-white">
              {row.firstName} {row.lastName}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              ID: {row.id.slice(0, 8)}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      header: 'Contact Details',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="text-zinc-900 dark:text-zinc-100 font-medium">
            {row.email}
          </div>
          <div className="text-[11px] text-zinc-400 font-mono">
            {row.phoneNumber || 'No phone recorded'}
          </div>
        </div>
      )
    },
    {
      key: 'verification',
      header: 'Ownership Deed Status',
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.isVerifiedLandlord ? (
            <AdminStatusBadge status="VERIFIED" />
          ) : (
            <AdminStatusBadge status={row.landlordVerificationStatus || 'NOT_SUBMITTED'} />
          )}
        </div>
      )
    },
    {
      key: 'reputation',
      header: 'Reputation',
      render: (row) => (
        <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span>{(row.reputationScore || 5.0).toFixed(1)}</span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Account Status',
      render: (row) => (
        <AdminStatusBadge status={row.isSuspended ? 'SUSPENDED' : 'ACTIVE'} />
      )
    },
    {
      key: 'registered',
      header: 'Registered',
      render: (row) => (
        <span className="text-[11px] font-mono text-zinc-400">
          {new Date(row.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Workspace',
      align: 'right',
      render: (row) => (
        <Link
          href={`/admin/landlords/${row.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-[#16A34A] text-zinc-800 dark:text-zinc-200 hover:text-white dark:hover:text-white text-xs font-bold transition shadow-2xs cursor-pointer"
        >
          <span>View Profile</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <AdminPageHeader
        title="Landlords & Property Owners"
        subtitle="Manage registered property hosts, verify statutory ownership deeds, and monitor landlord compliance."
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Landlords' }
        ]}
      />

      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search landlords by name, email, phone number..."
        filters={filterOptions}
        hasActiveFilters={verificationFilter !== 'ALL' || statusFilter !== 'ALL' || !!searchQuery}
        onReset={() => {
          setSearchQuery('');
          setVerificationFilter('ALL');
          setStatusFilter('ALL');
          setPage(1);
        }}
        totalResults={filteredLandlords.length}
      />

      <AdminDataTable
        columns={columns}
        data={filteredLandlords}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        pagination={{
          page,
          totalPages,
          total,
          onPageChange: setPage
        }}
      />
    </div>
  );
}
