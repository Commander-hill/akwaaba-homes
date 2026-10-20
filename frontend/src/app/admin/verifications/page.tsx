'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import Link from 'next/link';
import {
  BadgeCheck,
  FileCheck,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  User,
  Filter
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminDataTable, { Column } from '@/components/admin/AdminDataTable';
import AdminFilterBar, { FilterOption } from '@/components/admin/AdminFilterBar';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';

export default function AdminVerificationsQueuePage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'GHANA_CARD' | 'LANDLORD_DEED'>('ALL');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data;
    }
  });

  // Extract all verification submissions
  const verificationQueue = useMemo(() => {
    const list: any[] = [];
    users.forEach((u: any) => {
      // 1. Ghana Card KYC
      if (u.ghanaCardStatus && u.ghanaCardStatus !== 'NOT_SUBMITTED') {
        list.push({
          id: `kyc-${u.id}`,
          userId: u.id,
          user: u,
          type: 'GHANA_CARD',
          title: `Ghana Card Identity (${u.role === 'LANDLORD' ? 'Landlord' : 'Tenant'})`,
          status: u.ghanaCardStatus,
          submittedAt: u.updatedAt || u.createdAt,
          hasDocuments: Boolean(u.ghanaCardFrontUrl || u.ghanaCardBackUrl),
          docPreviewUrl: u.ghanaCardFrontUrl
        });
      }

      // 2. Landlord Title Deed
      if (u.role === 'LANDLORD' && u.landlordVerificationStatus && u.landlordVerificationStatus !== 'NOT_SUBMITTED') {
        list.push({
          id: `deed-${u.id}`,
          userId: u.id,
          user: u,
          type: 'LANDLORD_DEED',
          title: 'Landlord Ownership Title Deed',
          status: u.isVerifiedLandlord ? 'VERIFIED' : u.landlordVerificationStatus,
          submittedAt: u.updatedAt || u.createdAt,
          hasDocuments: Boolean(u.landlordDocUrl),
          docPreviewUrl: u.landlordDocUrl
        });
      }
    });

    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [users]);

  // Filtered queue
  const filteredQueue = useMemo(() => {
    return verificationQueue.filter((item) => {
      if (activeTab === 'GHANA_CARD' && item.type !== 'GHANA_CARD') return false;
      if (activeTab === 'LANDLORD_DEED' && item.type !== 'LANDLORD_DEED') return false;

      if (statusFilter === 'PENDING' && !['PENDING', 'UNDER_REVIEW', 'RESUBMISSION_REQUIRED'].includes(item.status)) return false;
      if (statusFilter === 'VERIFIED' && item.status !== 'VERIFIED') return false;
      if (statusFilter === 'REJECTED' && item.status !== 'REJECTED') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = `${item.user?.firstName || ''} ${item.user?.lastName || ''}`.toLowerCase();
        const email = (item.user?.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      }

      return true;
    });
  }, [verificationQueue, activeTab, statusFilter, searchQuery]);

  const filterOptions: FilterOption[] = [
    {
      id: 'status',
      label: 'Decision Status',
      value: statusFilter,
      onChange: setStatusFilter,
      options: [
        { label: 'Action Required (Pending/Review)', value: 'PENDING' },
        { label: 'Verified & Approved', value: 'VERIFIED' },
        { label: 'Rejected', value: 'REJECTED' },
        { label: 'All Records', value: 'ALL' }
      ]
    }
  ];

  const columns: Column<any>[] = [
    {
      key: 'applicant',
      header: 'Applicant',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700">
            {row.user?.firstName?.[0] || 'U'}
          </div>
          <div>
            <div className="font-bold text-zinc-950 dark:text-white">
              {row.user?.firstName} {row.user?.lastName}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">
              {row.user?.email}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Verification Type',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-bold text-zinc-800 dark:text-zinc-200 text-xs">{row.title}</div>
          <div className="text-[10px] uppercase font-mono text-zinc-400">
            {row.type === 'GHANA_CARD' ? 'National Identity Card' : 'Statutory Title Deed Proof'}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <AdminStatusBadge status={row.status} />
    },
    {
      key: 'date',
      header: 'Submitted',
      render: (row) => (
        <span className="text-[11px] font-mono text-zinc-400">
          {new Date(row.submittedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (row) => (
        <Link
          href={`/admin/verifications/${row.userId}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-[#0F5132] text-white dark:text-zinc-900 dark:hover:text-white text-xs font-bold transition shadow-2xs cursor-pointer"
        >
          <span>Audit Document</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <AdminPageHeader
        title="Identity & Ownership Verification"
        subtitle="Review and adjudicate Ghana Card national identity submissions and landlord property ownership deeds."
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Verifications' }
        ]}
      />

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto">
        {(['ALL', 'GHANA_CARD', 'LANDLORD_DEED'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition -mb-px shrink-0 cursor-pointer ${
              activeTab === tab
                ? 'border-[#0F5132] text-[#0F5132] dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {tab === 'ALL' && 'All Verification Submissions'}
            {tab === 'GHANA_CARD' && 'Ghana Card Identity (KYC)'}
            {tab === 'LANDLORD_DEED' && 'Landlord Title Deeds'}
          </button>
        ))}
      </div>

      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search applicants by name or email..."
        filters={filterOptions}
        hasActiveFilters={statusFilter !== 'PENDING' || !!searchQuery}
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('PENDING');
        }}
        totalResults={filteredQueue.length}
      />

      <AdminDataTable
        columns={columns}
        data={filteredQueue}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
      />
    </div>
  );
}
