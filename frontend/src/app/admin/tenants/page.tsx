'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import Link from 'next/link';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  Star,
  ArrowRight,
  ShieldCheck,
  Lock,
  Search
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminDataTable, { Column } from '@/components/admin/AdminDataTable';
import AdminFilterBar, { FilterOption } from '@/components/admin/AdminFilterBar';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';

export default function AdminTenantsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [kycFilter, setKycFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants', page, limit],
    queryFn: async () => {
      const res = await api.get(`/admin/users?role=TENANT&page=${page}&limit=${limit}`);
      return res.data;
    }
  });

  const rawTenants: any[] = Array.isArray(data) ? data : data?.users || [];
  const total = Array.isArray(data) ? rawTenants.length : data?.total || 0;
  const totalPages = Array.isArray(data) ? 1 : data?.totalPages || 1;

  const filteredTenants = useMemo(() => {
    return rawTenants.filter((t) => {
      if (kycFilter === 'VERIFIED' && t.ghanaCardStatus !== 'VERIFIED') return false;
      if (kycFilter === 'PENDING' && !['PENDING', 'UNDER_REVIEW'].includes(t.ghanaCardStatus)) return false;
      if (kycFilter === 'NOT_SUBMITTED' && t.ghanaCardStatus !== 'NOT_SUBMITTED') return false;
      if (statusFilter === 'ACTIVE' && t.isSuspended) return false;
      if (statusFilter === 'SUSPENDED' && !t.isSuspended) return false;
      if (typeFilter === 'STUDENT' && !t.studentId) return false;
      if (typeFilter === 'RESIDENT' && !!t.studentId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${t.firstName || ''} ${t.lastName || ''}`.toLowerCase();
        const email = (t.email || '').toLowerCase();
        const phone = (t.phoneNumber || '').toLowerCase();
        const studentId = (t.studentId || '').toLowerCase();
        return fullName.includes(q) || email.includes(q) || phone.includes(q) || studentId.includes(q);
      }

      return true;
    });
  }, [rawTenants, kycFilter, statusFilter, typeFilter, searchQuery]);

  const filterOptions: FilterOption[] = [
    {
      id: 'kyc',
      label: 'Ghana Card',
      value: kycFilter,
      onChange: (v) => {
        setKycFilter(v);
        setPage(1);
      },
      options: [
        { label: 'All KYC', value: 'ALL' },
        { label: 'Verified Card', value: 'VERIFIED' },
        { label: 'Pending Review', value: 'PENDING' },
        { label: 'Not Submitted', value: 'NOT_SUBMITTED' }
      ]
    },
    {
      id: 'type',
      label: 'Resident Type',
      value: typeFilter,
      onChange: (v) => {
        setTypeFilter(v);
        setPage(1);
      },
      options: [
        { label: 'All Residents', value: 'ALL' },
        { label: 'Verified Students', value: 'STUDENT' },
        { label: 'Working Residents', value: 'RESIDENT' }
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
        { label: 'All Statuses', value: 'ALL' },
        { label: 'Active', value: 'ACTIVE' },
        { label: 'Suspended', value: 'SUSPENDED' }
      ]
    }
  ];

  const columns: Column<any>[] = [
    {
      key: 'tenant',
      header: 'Resident / Tenant',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
            {row.firstName?.[0] || 'T'}
          </div>
          <div>
            <div className="font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
              <span>{row.firstName} {row.lastName}</span>
              {row.studentId && (
                <span title="Student Resident">
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                </span>
              )}
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
      header: 'Contact',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="text-zinc-900 dark:text-zinc-100 font-medium">{row.email}</div>
          <div className="text-[11px] text-zinc-400 font-mono">{row.phoneNumber || 'No phone'}</div>
        </div>
      )
    },
    {
      key: 'academic',
      header: 'Campus / Programme',
      render: (row) => (
        row.campus ? (
          <div>
            <div className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">{row.campus}</div>
            <div className="text-[10px] text-zinc-400 font-mono">ID: {row.studentId || 'N/A'}</div>
          </div>
        ) : (
          <span className="text-zinc-400 text-xs">General Resident</span>
        )
      )
    },
    {
      key: 'kyc',
      header: 'NIA Identity (Masked)',
      render: (row) => (
        <div className="space-y-1">
          <AdminStatusBadge status={row.ghanaCardStatus || 'NOT_SUBMITTED'} />
          {row.ghanaCardNumber && (
            <div className="font-mono text-[10px] text-zinc-400">
              {row.ghanaCardNumber}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <AdminStatusBadge status={row.isSuspended ? 'SUSPENDED' : 'ACTIVE'} />
          {row.isProfileLocked && (
            <span title="Profile Locked">
              <Lock className="w-3 h-3 text-amber-500" />
            </span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Workspace',
      align: 'right',
      render: (row) => (
        <Link
          href={`/admin/tenants/${row.id}`}
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
        title="Tenants & Residents"
        subtitle="Manage student and residential tenants, supervise campus housing records, and review compliance."
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Tenants' }
        ]}
      />

      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search tenants by name, email, phone, or Student ID..."
        filters={filterOptions}
        hasActiveFilters={kycFilter !== 'ALL' || statusFilter !== 'ALL' || typeFilter !== 'ALL' || !!searchQuery}
        onReset={() => {
          setSearchQuery('');
          setKycFilter('ALL');
          setStatusFilter('ALL');
          setTypeFilter('ALL');
          setPage(1);
        }}
        totalResults={filteredTenants.length}
      />

      <AdminDataTable
        columns={columns}
        data={filteredTenants}
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
