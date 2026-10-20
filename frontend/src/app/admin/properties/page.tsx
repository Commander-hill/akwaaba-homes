'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Building,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ExternalLink,
  MapPin,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  Check,
  X,
  User as UserIcon,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminFilterBar, { FilterConfig } from '@/components/admin/AdminFilterBar';
import AdminDataTable, { Column } from '@/components/admin/AdminDataTable';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

export default function AdminPropertiesPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [rejectDialog, setRejectDialog] = useState<{ isOpen: boolean; propertyId: string | null; title: string }>({
    isOpen: false,
    propertyId: null,
    title: ''
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['admin-properties'],
    queryFn: async () => {
      const res = await api.get('/admin/properties');
      return res.data;
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, approvalStatus, rejectionReason }: { id: string; approvalStatus: string; rejectionReason?: string }) => {
      const res = await api.put(`/admin/properties/${id}/status`, { approvalStatus, rejectionReason });
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast.success(
        variables.approvalStatus === 'APPROVED'
          ? 'Listing approved and published to public catalog'
          : 'Listing status updated'
      );
      queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
      queryClient.invalidateQueries({ queryKey: ['admin-action-queue'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update property status');
    }
  });

  const propertyTypes = useMemo(() => {
    if (!Array.isArray(properties)) return [];
    const types = new Set<string>();
    properties.forEach((p: any) => {
      if (p.type) types.add(p.type);
    });
    return Array.from(types).map(t => ({ label: t, value: t }));
  }, [properties]);

  const filteredProperties = useMemo(() => {
    if (!Array.isArray(properties)) return [];
    return properties.filter((p: any) => {
      if (statusFilter !== 'ALL' && p.approvalStatus !== statusFilter) return false;
      if (typeFilter !== 'ALL' && p.type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const title = (p.title || '').toLowerCase();
        const loc = (p.location || '').toLowerCase();
        const landlordName = `${p.landlord?.firstName || ''} ${p.landlord?.lastName || ''}`.toLowerCase();
        const email = (p.landlord?.email || '').toLowerCase();
        return title.includes(q) || loc.includes(q) || landlordName.includes(q) || email.includes(q);
      }
      return true;
    });
  }, [properties, statusFilter, typeFilter, search]);

  const stats = useMemo(() => {
    if (!Array.isArray(properties)) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    return {
      total: properties.length,
      pending: properties.filter((p: any) => p.approvalStatus === 'PENDING').length,
      approved: properties.filter((p: any) => p.approvalStatus === 'APPROVED').length,
      rejected: properties.filter((p: any) => p.approvalStatus === 'REJECTED').length
    };
  }, [properties]);

  const filterConfigs: FilterConfig[] = [
    {
      id: 'status',
      label: 'Approval Status',
      value: statusFilter,
      options: [
        { label: 'All Statuses', value: 'ALL' },
        { label: `Pending Review (${stats.pending})`, value: 'PENDING' },
        { label: `Approved (${stats.approved})`, value: 'APPROVED' },
        { label: `Rejected (${stats.rejected})`, value: 'REJECTED' }
      ],
      onChange: setStatusFilter
    },
    ...(propertyTypes.length > 0
      ? [
          {
            id: 'type',
            label: 'Property Type',
            value: typeFilter,
            options: [{ label: 'All Categories', value: 'ALL' }, ...propertyTypes],
            onChange: setTypeFilter
          }
        ]
      : [])
  ];

  const columns: Column<any>[] = [
    {
      key: 'property',
      header: 'Listing & Location',
      render: (p) => {
        const img = p.images && p.images.length > 0 ? getImageUrl(p.images[0]) : null;
        return (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt={p.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-400">
                  <Building className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <Link
                href={`/admin/properties/${p.id}`}
                className="font-bold text-zinc-900 dark:text-white hover:text-emerald-600 transition truncate max-w-xs block text-xs"
              >
                {p.title}
              </Link>
              <div className="text-[11px] text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{p.location || 'Location unlisted'}</span>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'type',
      header: 'Category',
      render: (p) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
          {p.type || 'Apartment'}
        </span>
      )
    },
    {
      key: 'price',
      header: 'Rent Rate',
      render: (p) => (
        <div className="font-mono font-bold text-xs text-zinc-900 dark:text-white">
          GH₵ {Number(p.price || 0).toLocaleString()}
          <span className="text-[10px] text-zinc-400 font-normal ml-1">
            /{p.pricePeriod ? p.pricePeriod.toLowerCase().replace('academic year', 'yr') : 'yr'}
          </span>
        </div>
      )
    },
    {
      key: 'landlord',
      header: 'Landlord / Owner',
      render: (p) => (
        <div className="text-xs">
          {p.landlord ? (
            <Link
              href={`/admin/landlords/${p.landlord.id}`}
              className="font-semibold text-zinc-800 dark:text-zinc-200 hover:text-emerald-600 transition block truncate max-w-[160px]"
            >
              {p.landlord.firstName} {p.landlord.lastName}
            </Link>
          ) : (
            <span className="text-zinc-400">Unassigned Host</span>
          )}
          <span className="text-[10px] text-zinc-400 block truncate">{p.landlord?.email}</span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <AdminStatusBadge status={p.approvalStatus || 'PENDING'} />
    },
    {
      key: 'actions',
      header: 'Adjudication',
      align: 'right',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/admin/properties/${p.id}`}
            className="px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition flex items-center gap-1"
          >
            <Eye className="w-3 h-3" /> Inspect
          </Link>
          {p.approvalStatus !== 'APPROVED' && (
            <button
              type="button"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ id: p.id, approvalStatus: 'APPROVED' })}
              className="px-2 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Approve & Publish"
            >
              <Check className="w-3 h-3" />
            </button>
          )}
          {p.approvalStatus !== 'REJECTED' && (
            <button
              type="button"
              onClick={() => setRejectDialog({ isOpen: true, propertyId: p.id, title: p.title })}
              className="px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition flex items-center gap-1 cursor-pointer"
              title="Reject Listing"
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
        title="Property Moderation & Catalog"
        subtitle="Audit rental listings, inspect physical amenities, verify advance rent rates, and moderate live market visibility."
        badge={
          stats.pending > 0 ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              {stats.pending} Awaiting Moderation
            </span>
          ) : undefined
        }
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Marketplace', href: '/admin/properties' },
          { label: 'Properties' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        }
      />

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter listings by title, location, or landlord..."
        filters={filterConfigs}
        totalCount={filteredProperties.length}
      />

      {viewMode === 'table' ? (
        <AdminDataTable
          columns={columns}
          data={filteredProperties}
          keyExtractor={(p) => p.id}
          isLoading={isLoading}
          emptyTitle="No property listings match criteria"
          emptyDescription="Try clearing your search query or status filter to view all listings in catalog."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProperties.map((p: any) => {
            const img = p.images && p.images.length > 0 ? getImageUrl(p.images[0]) : null;
            return (
              <div
                key={p.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition flex flex-col"
              >
                <div className="h-44 bg-zinc-100 dark:bg-zinc-800 relative">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      <Building className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5">
                    <AdminStatusBadge status={p.approvalStatus || 'PENDING'} />
                  </div>
                  {p.type && (
                    <span className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {p.type}
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 dark:text-white line-clamp-1">
                      {p.title}
                    </h3>
                    <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                      {p.location || 'Location unlisted'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      GH₵ {Number(p.price || 0).toLocaleString()}
                      <span className="text-[10px] text-zinc-400 font-normal ml-0.5">/yr</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/properties/${p.id}`}
                        className="px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition"
                      >
                        Inspect
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Audited Listing Rejection Dialog */}
      <AdminConfirmDialog
        isOpen={rejectDialog.isOpen}
        onClose={() => setRejectDialog({ isOpen: false, propertyId: null, title: '' })}
        title={`Reject Listing: "${rejectDialog.title}"`}
        description="Provide the statutory or quality compliance reason for rejecting this property listing. The landlord will receive this notice."
        confirmLabel="Reject Listing"
        confirmVariant="danger"
        requireReason={true}
        reasonLabel="Audited Rejection Explanation"
        reasonPlaceholder="e.g. Advance rent requested exceeds Ghana Rent Act statutory cap, or uploaded photos fail resolution and authenticity requirements."
        onConfirm={async (reason) => {
          if (!rejectDialog.propertyId) return;
          await statusMutation.mutateAsync({
            id: rejectDialog.propertyId,
            approvalStatus: 'REJECTED',
            rejectionReason: reason
          });
        }}
      />
    </div>
  );
}
