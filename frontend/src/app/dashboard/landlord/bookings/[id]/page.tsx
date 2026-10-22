'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, CheckCircle2, Clock, XCircle, AlertCircle, Phone, 
  Mail, MessageSquare, Calendar, Building2, Bed, Home, User, 
  GraduationCap, ShieldCheck, ShieldAlert, FileText, Receipt, 
  ExternalLink, ChevronRight, ChevronDown, Check, MoreVertical
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/Button';
import { getImageUrl } from '@/lib/utils';
import clsx from 'clsx';

// HTML Entity decoder for sanitizing escaped backend strings (e.g. "24&#x2F;7" -> "24/7")
const decodeHtml = (str?: string | null): string => {
  if (!str) return '';
  return str
    .replace(/&#x2F;/g, '/')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const formatCedis = (amount?: number | null) => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return 'GH₵ 0.00';
  return `GH₵ ${Number(amount).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getDuration = (start?: string | null, end?: string | null) => {
  if (!start || !end) return '';
  try {
    const d1 = new Date(start);
    const d2 = new Date(end);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays >= 330) {
      const years = Math.round(diffDays / 365);
      return `${years} ${years === 1 ? 'Year' : 'Years'}`;
    }
    if (diffDays >= 50) {
      const months = Math.round(diffDays / 30);
      return `${months} Months`;
    }
    return `${diffDays} Days`;
  } catch {
    return '';
  }
};

interface TenancyAction {
  status: string;
  label: string;
  confirmTitle: string;
  confirmDescription: string;
  variant: 'emerald' | 'danger' | 'outline';
}

const LIFECYCLE_ACTIONS: Record<string, TenancyAction[]> = {
  PENDING: [
    {
      status: 'APPROVED',
      label: 'Approve Request',
      confirmTitle: 'Approve Tenancy Request',
      confirmDescription: 'The tenant will be prompted to electronically sign the lease agreement and make payment.',
      variant: 'emerald',
    },
    {
      status: 'REJECTED',
      label: 'Decline',
      confirmTitle: 'Decline Tenancy Request',
      confirmDescription: 'This reservation request will be declined and the applicant notified. This action cannot be undone.',
      variant: 'danger',
    },
  ],
  APPROVED: [
    {
      status: 'CANCELLED',
      label: 'Cancel Approval',
      confirmTitle: 'Cancel Approved Tenancy',
      confirmDescription: 'This will revoke approval and release the assigned unit/bed back to your public inventory.',
      variant: 'danger',
    },
  ],
  CONFIRMED: [
    {
      status: 'CHECKED_IN',
      label: 'Mark as Checked In',
      confirmTitle: 'Confirm Resident Check-In',
      confirmDescription: 'Confirm that the tenant has arrived, received keys, and taken occupancy of their unit.',
      variant: 'emerald',
    },
    {
      status: 'CANCELLED',
      label: 'Cancel Tenancy',
      confirmTitle: 'Cancel Confirmed Tenancy',
      confirmDescription: 'Are you sure you want to cancel this confirmed tenancy? Applicable cancellation policies will apply.',
      variant: 'danger',
    },
  ],
  CHECKED_IN: [
    {
      status: 'COMPLETED',
      label: 'Mark Tenancy Completed',
      confirmTitle: 'Conclude Tenancy & Check Out',
      confirmDescription: 'Confirm that the tenant has completed their lease term, completed checkout inspection, and vacated the unit.',
      variant: 'emerald',
    },
  ],
};

const STATUS_MAP: Record<string, { label: string; badgeClass: string }> = {
  PENDING: {
    label: 'Pending Approval',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/80',
  },
  APPROVED: {
    label: 'Awaiting Signature & Payment',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/80',
  },
  CONFIRMED: {
    label: 'Confirmed Reservation',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80',
  },
  CHECKED_IN: {
    label: 'Active Resident',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80',
  },
  COMPLETED: {
    label: 'Tenancy Completed',
    badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
  },
  REJECTED: {
    label: 'Declined',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/80',
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
  },
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [pendingAction, setPendingAction] = useState<TenancyAction | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ['landlord', 'booking', id],
    queryFn: async () => {
      const res = await api.get(`/bookings/${id}`);
      return res.data.booking || res.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (status: string) => (await api.put(`/bookings/${id}/status`, { status })).data,
    onSuccess: () => {
      toast.success('Tenancy status updated successfully');
      setPendingAction(null);
      qc.invalidateQueries({ queryKey: ['landlord', 'booking', id] });
      qc.invalidateQueries({ queryKey: ['landlord', 'bookings'] });
      qc.invalidateQueries({ queryKey: ['landlord'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Could not update tenancy status. Please try again.');
      setPendingAction(null);
      refetch();
    },
  });

  if (isError) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-xl text-center space-y-4 shadow-xs">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-zinc-900 dark:text-white">Unable to Load Tenancy Record</h2>
        <p className="text-xs text-zinc-500 leading-relaxed">
          The tenancy record could not be loaded. It may not exist, or you may not have authorization to view it.
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <Link href="/dashboard/landlord/bookings">
            <Button variant="outline" size="sm">Back to Tenancies</Button>
          </Link>
          <Button variant="emerald" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (isLoading || !booking) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-pulse">
        <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-28 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="h-96 bg-zinc-200 dark:bg-zinc-800 rounded-xl lg:col-span-7" />
          <div className="h-96 bg-zinc-200 dark:bg-zinc-800 rounded-xl lg:col-span-5" />
        </div>
      </div>
    );
  }

  const tenant = booking.tenant || {};
  const property = booking.property || {};
  const room = booking.room || {};
  const unit = booking.roomUnit || {};
  const bed = booking.bed || {};
  const lease = booking.leaseAgreement;
  const tx = booking.transaction || booking.transactions?.[0];
  const actions = LIFECYCLE_ACTIONS[booking.status] || [];
  const statusInfo = STATUS_MAP[booking.status] || STATUS_MAP.PENDING;

  // Property Image extraction
  let propertyThumbnail = '';
  if (property.images) {
    try {
      const parsed = Array.isArray(property.images) ? property.images : JSON.parse(property.images);
      if (parsed.length > 0) propertyThumbnail = parsed[0];
    } catch {
      propertyThumbnail = typeof property.images === 'string' ? property.images : '';
    }
  }

  // Financial calculations
  const rentAmount = Number(booking.price ?? room.price ?? property.price ?? 0);
  const cautionDeposit = Number(property.cautionDeposit ?? 0);
  const totalContract = rentAmount + cautionDeposit;
  const isPaid = tx?.status === 'SUCCESS' || ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status);
  const amountPaid = isPaid ? (tx?.amount ? Number(tx.amount) : totalContract) : 0;
  const balanceDue = Math.max(0, totalContract - amountPaid);

  // Term duration
  const termDuration = getDuration(booking.startDate, booking.endDate);

  // Chronological Tenancy Activity (authoritative events only)
  const activityEvents: { label: string; date: string | null; detail?: string }[] = [];
  if (booking.createdAt) {
    activityEvents.push({ label: 'Tenancy request submitted', date: booking.createdAt });
  }
  if (['APPROVED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status) && booking.updatedAt) {
    activityEvents.push({ label: 'Request approved by landlord', date: booking.updatedAt });
  }
  if (lease?.tenantSignedAt) {
    activityEvents.push({ label: 'Agreement electronically signed by tenant', date: lease.tenantSignedAt });
  }
  if (lease?.landlordSignedAt) {
    activityEvents.push({ label: 'Agreement countersigned by landlord', date: lease.landlordSignedAt });
  }
  if (tx?.status === 'SUCCESS' && tx.createdAt) {
    activityEvents.push({ 
      label: 'Payment confirmed and verified', 
      date: tx.createdAt, 
      detail: `Ref: ${tx.reference || 'Paystack'} (${formatCedis(tx.amount || totalContract)})` 
    });
  }
  if (booking.status === 'CHECKED_IN') {
    activityEvents.push({ label: 'Tenant completed physical check-in', date: booking.updatedAt });
  }
  if (booking.status === 'COMPLETED') {
    activityEvents.push({ label: 'Tenancy term concluded and checked out', date: booking.updatedAt });
  }
  if (booking.status === 'REJECTED') {
    activityEvents.push({ label: 'Request declined by landlord', date: booking.updatedAt });
  }
  if (booking.status === 'CANCELLED') {
    activityEvents.push({ label: 'Booking cancelled', date: booking.updatedAt });
  }

  const initials = `${tenant.firstName?.[0] || 'T'}${tenant.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-16">

      {/* ── BREADCRUMB ── */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs text-zinc-500">
          <li>
            <Link href="/dashboard/landlord" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
              Dashboard
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/dashboard/landlord/bookings" className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
              Tenancies
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="font-semibold text-zinc-900 dark:text-zinc-100" aria-current="page">
            Tenancy Record
          </li>
        </ol>
      </nav>

      {/* ── COMPACT TENANT IDENTITY HEADER ── */}
      <header className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Restrained Avatar */}
            {tenant.avatarUrl ? (
              <img
                src={getImageUrl(tenant.avatarUrl)}
                alt=""
                className="w-12 h-12 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
              />
            ) : (
              <div 
                className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-bold text-base shrink-0 border border-zinc-200 dark:border-zinc-700 select-none"
                aria-hidden="true"
              >
                {initials}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-zinc-950 dark:text-white tracking-tight truncate">
                  {tenant.firstName} {tenant.lastName}
                </h1>
                <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border", statusInfo.badgeClass)}>
                  {statusInfo.label}
                </span>
              </div>

              <p className="text-xs text-zinc-500 mt-0.5 truncate">
                {decodeHtml(property.title)}
                {unit.unitNumber && ` · Unit ${unit.unitNumber}`}
                {bed.bedNumber && ` (${bed.bedNumber})`}
              </p>
            </div>
          </div>

          {/* Header Action Group */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {tenant.phoneNumber && ['APPROVED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status) && (
              <a href={`tel:${tenant.phoneNumber}`}>
                <Button variant="outline" size="sm" leftIcon={<Phone className="w-3.5 h-3.5 text-zinc-500" />}>
                  Call Tenant
                </Button>
              </a>
            )}

            {lease?.id && (
              <Link href={`/lease-agreement/${lease.id}`} target="_blank">
                <Button variant="outline" size="sm" leftIcon={<FileText className="w-3.5 h-3.5 text-zinc-500" />}>
                  View Agreement
                </Button>
              </Link>
            )}

            {/* Contextual Status Buttons */}
            {actions.map((act) => (
              <Button
                key={act.status}
                variant={act.variant}
                size="sm"
                onClick={() => setPendingAction(act)}
              >
                {act.label}
              </Button>
            ))}
          </div>

        </div>
      </header>

      {/* ── HORIZONTAL TENANCY OVERVIEW BAR ── */}
      <section 
        className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-xl px-5 py-3.5 shadow-2xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs"
        aria-label="Tenancy Summary Overview"
      >
        <div>
          <span className="text-zinc-500 block text-[11px]">Tenancy Period</span>
          <span className="font-semibold text-zinc-900 dark:text-white block mt-0.5">
            {formatDate(booking.startDate)} — {formatDate(booking.endDate)}
          </span>
          {termDuration && (
            <span className="text-[11px] text-zinc-500 block mt-0.5">
              {termDuration}
            </span>
          )}
        </div>

        <div>
          <span className="text-zinc-500 block text-[11px]">Assigned Unit</span>
          <span className="font-semibold text-zinc-900 dark:text-white block mt-0.5">
            {unit.unitNumber ? `Unit ${unit.unitNumber}` : 'Standard Unit'}
            {bed.bedNumber && ` · ${bed.bedNumber}`}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-0.5">
            {room.roomType ? decodeHtml(room.roomType) : decodeHtml(property.type) || 'Accommodation'}
          </span>
        </div>

        <div>
          <span className="text-zinc-500 block text-[11px]">Payment Status</span>
          <span className={clsx("font-semibold block mt-0.5", isPaid ? "text-[#16A34A]" : "text-amber-600 dark:text-amber-400")}>
            {isPaid ? 'Settled in Full' : 'Pending Payment'}
          </span>
          <span className="text-[11px] text-zinc-500 block mt-0.5">
            {isPaid ? formatCedis(amountPaid) : `Due: ${formatCedis(balanceDue)}`}
          </span>
        </div>

        <div>
          <span className="text-zinc-500 block text-[11px]">Lease Document</span>
          <span className="font-semibold text-zinc-900 dark:text-white block mt-0.5">
            {lease?.tenantSignedAt && lease?.landlordSignedAt
              ? 'Executed & Signed'
              : lease?.tenantSignedAt
              ? 'Tenant Signed'
              : lease?.id
              ? 'Drafted / Pending'
              : 'Not Generated'}
          </span>
          {lease?.id ? (
            <Link 
              href={`/lease-agreement/${lease.id}`}
              target="_blank"
              className="text-[11px] text-[#16A34A] hover:underline inline-flex items-center gap-0.5 mt-0.5 font-medium"
            >
              Open deed <ChevronRight className="w-3 h-3" />
            </Link>
          ) : (
            <span className="text-[11px] text-zinc-400 block mt-0.5">Generated on approval</span>
          )}
        </div>
      </section>

      {/* ── TWO-COLUMN INFORMATION ARCHITECTURE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ── MAIN COLUMN (7 / 12 = ~60%) ── */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Accommodation & Unit Details */}
          <section className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Accommodation Details
              </h2>
              {property.id && (
                <Link
                  href={`/properties/${property.id}`}
                  target="_blank"
                  className="text-xs text-[#16A34A] hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  View Property <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Property Summary Row */}
            <div className="flex items-start gap-3.5">
              {propertyThumbnail ? (
                <img
                  src={getImageUrl(propertyThumbnail)}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                />
              ) : (
                <div 
                  className="w-16 h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-700"
                  aria-hidden="true"
                >
                  <Building2 className="w-6 h-6" />
                </div>
              )}

              <div className="min-w-0">
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white truncate">
                  {decodeHtml(property.title)}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {decodeHtml(property.location)}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium">{decodeHtml(property.type) || 'Hostel'}</span>
                  <span>•</span>
                  <span>{decodeHtml(property.pricePeriod) || 'Academic Year'}</span>
                </div>
              </div>
            </div>

            {/* Spec List */}
            <dl className="grid grid-cols-2 gap-y-2.5 gap-x-4 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
              <div>
                <dt className="text-zinc-500 text-[11px]">Room Type</dt>
                <dd className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {[room.blockName, room.roomType].filter(Boolean).map(decodeHtml).join(' · ') || 'Standard Room'}
                </dd>
              </div>

              <div>
                <dt className="text-zinc-500 text-[11px]">Unit &amp; Floor</dt>
                <dd className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {unit.unitNumber ? `Unit ${unit.unitNumber}` : 'Unassigned'}
                  {unit.floor ? ` (Floor ${unit.floor})` : ''}
                </dd>
              </div>

              <div>
                <dt className="text-zinc-500 text-[11px]">Bed Allocation</dt>
                <dd className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {bed.bedNumber || 'Bed 1'}
                </dd>
              </div>

              <div>
                <dt className="text-zinc-500 text-[11px]">Check-In / Out</dt>
                <dd className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {formatDate(booking.startDate)} — {formatDate(booking.endDate)}
                </dd>
              </div>
            </dl>
          </section>

          {/* Financial Summary */}
          <section className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Financial Summary
              </h2>
              {['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status) && (
                <Link
                  href={`/dashboard/invoice/${booking.id}`}
                  className="text-xs text-[#16A34A] hover:underline inline-flex items-center gap-1 font-semibold"
                >
                  <Receipt className="w-3.5 h-3.5" /> View Receipt
                </Link>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Agreed Rent ({decodeHtml(property.pricePeriod) || 'Tenancy Term'})
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {formatCedis(rentAmount)}
                </span>
              </div>

              {cautionDeposit > 0 && (
                <div className="flex justify-between py-1">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Refundable Caution Deposit
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {formatCedis(cautionDeposit)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2 border-t border-zinc-200 dark:border-zinc-800 font-bold text-sm">
                <span className="text-zinc-950 dark:text-white">Total Tenancy Obligation</span>
                <span className="text-zinc-950 dark:text-white tabular-nums">
                  {formatCedis(totalContract)}
                </span>
              </div>

              <div className="flex justify-between py-1 text-xs text-zinc-600 dark:text-zinc-400">
                <span>Total Amount Received</span>
                <span className={clsx("font-semibold tabular-nums", isPaid ? "text-[#16A34A]" : "text-zinc-700 dark:text-zinc-300")}>
                  {formatCedis(amountPaid)}
                </span>
              </div>

              {balanceDue > 0 && (
                <div className="flex justify-between py-1 text-xs text-amber-700 dark:text-amber-400 font-semibold">
                  <span>Outstanding Balance</span>
                  <span className="tabular-nums">{formatCedis(balanceDue)}</span>
                </div>
              )}
            </div>

            {/* Reconciliation Note */}
            {tx?.reference && (
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 flex flex-wrap justify-between gap-1">
                <span>Reconciliation Ref: <code className="font-mono text-zinc-700 dark:text-zinc-300">{tx.reference}</code></span>
                {tx.createdAt && <span>Settled: {formatDateTime(tx.createdAt)}</span>}
              </div>
            )}
          </section>

          {/* Activity History (Quiet, Collapsible) */}
          <section className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-2xs space-y-3">
            <button
              type="button"
              onClick={() => setShowHistory(prev => !prev)}
              className="w-full flex items-center justify-between text-left cursor-pointer select-none"
              aria-expanded={showHistory}
            >
              <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Tenancy Activity History ({activityEvents.length})
              </h2>
              <span className="text-xs text-zinc-500 flex items-center gap-1 font-medium">
                {showHistory ? 'Hide history' : 'Show history'}
                <ChevronDown className={clsx("w-3.5 h-3.5 transition-transform duration-150", showHistory && "rotate-180")} />
              </span>
            </button>

            {showHistory && (
              <ol className="relative border-l border-zinc-200 dark:border-zinc-800 ml-2 mt-3 space-y-3 text-xs">
                {activityEvents.map((evt, idx) => (
                  <li key={idx} className="ml-4">
                    <div 
                      className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-[#12151D] bg-[#16A34A]" 
                      aria-hidden="true"
                    />
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {evt.label}
                    </div>
                    {evt.detail && (
                      <div className="text-[11px] text-zinc-500 mt-0.5">
                        {evt.detail}
                      </div>
                    )}
                    <time className="text-[10px] text-zinc-400 block mt-0.5">
                      {formatDateTime(evt.date)}
                    </time>
                  </li>
                ))}
              </ol>
            )}
          </section>

        </div>

        {/* ── SECONDARY COLUMN (5 / 12 = ~40%) ── */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Tenant & Student Profile */}
          <section className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-2xs space-y-4">
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Tenant &amp; Resident Profile
              </h2>
              {tenant.ghanaCardStatus === 'VERIFIED' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A34A]">
                  <ShieldCheck className="w-3.5 h-3.5" /> ID Verified
                </span>
              ) : (
                <span className="text-[11px] text-zinc-400">
                  Unverified
                </span>
              )}
            </div>

            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/80">
                <dt className="text-zinc-500">Full Name</dt>
                <dd className="font-semibold text-zinc-900 dark:text-white">
                  {tenant.firstName} {tenant.lastName}
                </dd>
              </div>

              {['APPROVED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status) ? (
                <>
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/80">
                    <dt className="text-zinc-500">Phone</dt>
                    <dd>
                      <a href={`tel:${tenant.phoneNumber}`} className="font-semibold text-[#16A34A] hover:underline">
                        {tenant.phoneNumber || '—'}
                      </a>
                    </dd>
                  </div>

                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/80">
                    <dt className="text-zinc-500">Email</dt>
                    <dd>
                      <a href={`mailto:${tenant.email}`} className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline truncate max-w-[190px] block text-right">
                        {tenant.email || '—'}
                      </a>
                    </dd>
                  </div>
                </>
              ) : (
                <div className="py-2 text-[11px] text-zinc-500 italic">
                  Contact details are revealed once you approve this tenancy request.
                </div>
              )}

              {/* Student Information when provided */}
              {tenant.campus && (
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/80">
                  <dt className="text-zinc-500">Campus / Institution</dt>
                  <dd className="font-semibold text-zinc-900 dark:text-white text-right">
                    {decodeHtml(tenant.campus)}
                  </dd>
                </div>
              )}

              {tenant.programmeOfStudy && (
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/80">
                  <dt className="text-zinc-500">Programme of Study</dt>
                  <dd className="font-semibold text-zinc-900 dark:text-white text-right">
                    {decodeHtml(tenant.programmeOfStudy)}
                  </dd>
                </div>
              )}

              {tenant.yearOfStudy && (
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/80">
                  <dt className="text-zinc-500">Academic Level</dt>
                  <dd className="font-semibold text-zinc-900 dark:text-white">
                    {decodeHtml(tenant.yearOfStudy)}
                  </dd>
                </div>
              )}

              {tenant.studentId && (
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/80">
                  <dt className="text-zinc-500">Student ID / Index</dt>
                  <dd className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
                    {tenant.studentId}
                  </dd>
                </div>
              )}
            </dl>

            {/* Emergency / Guardian Contact */}
            {(tenant.guardianName || tenant.guardianPhone) && (
              <div className="pt-2">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                  Emergency Contact / Guardian
                </span>
                <dl className="space-y-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  {tenant.guardianName && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Name</dt>
                      <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{decodeHtml(tenant.guardianName)}</dd>
                    </div>
                  )}
                  {tenant.guardianPhone && (
                    <div className="flex justify-between">
                      <dt className="text-zinc-500">Phone</dt>
                      <dd>
                        <a href={`tel:${tenant.guardianPhone}`} className="font-semibold text-[#16A34A] hover:underline">
                          {tenant.guardianPhone}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </section>

          {/* Tenancy Agreement & Deed Status */}
          <section className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-2xs space-y-3.5">
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Tenancy Agreement
              </h2>
              {lease?.tenantSignedAt && lease?.landlordSignedAt && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16A34A]">
                  <Check className="w-3.5 h-3.5" /> Fully Executed
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Tenant Signature</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {lease?.tenantSignedAt ? formatDateTime(lease.tenantSignedAt) : 'Pending'}
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Landlord Signature</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {lease?.landlordSignedAt ? formatDateTime(lease.landlordSignedAt) : 'Pending'}
                </span>
              </div>
            </div>

            {lease?.id ? (
              <Link href={`/lease-agreement/${lease.id}`} target="_blank" className="block pt-1">
                <Button variant="outline" size="sm" className="w-full" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                  Open Signed Agreement
                </Button>
              </Link>
            ) : (
              <p className="text-xs text-zinc-400 italic pt-1">
                Tenancy agreement will be prepared automatically upon request approval.
              </p>
            )}
          </section>

          {/* House Rules & Property Policies */}
          <section className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-2xs space-y-3">
            <h2 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-3">
              House Rules &amp; Conduct
            </h2>

            <dl className="space-y-2.5 text-xs">
              {property.gateLockTime && (
                <div className="flex justify-between py-0.5">
                  <dt className="text-zinc-500">Curfew / Gate Lock</dt>
                  <dd className="font-semibold text-zinc-900 dark:text-white text-right">
                    {decodeHtml(property.gateLockTime)}
                  </dd>
                </div>
              )}

              {property.visitorPolicy && (
                <div className="flex justify-between py-0.5">
                  <dt className="text-zinc-500">Visitor Policy</dt>
                  <dd className="font-semibold text-zinc-900 dark:text-white text-right">
                    {decodeHtml(property.visitorPolicy)}
                  </dd>
                </div>
              )}

              {property.quietHours && (
                <div className="flex justify-between py-0.5">
                  <dt className="text-zinc-500">Quiet Hours</dt>
                  <dd className="font-semibold text-zinc-900 dark:text-white text-right">
                    {decodeHtml(property.quietHours)}
                  </dd>
                </div>
              )}

              {!property.gateLockTime && !property.visitorPolicy && !property.quietHours && (
                <p className="text-zinc-400 text-xs italic">
                  No property-specific house rules configured.
                </p>
              )}
            </dl>
          </section>

        </div>

      </div>

      {/* ── CONTEXTUAL ACTION CONFIRMATION MODAL ── */}
      {pendingAction && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in" 
          role="alertdialog" 
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div>
              <h2 id="modal-title" className="text-base font-bold text-zinc-950 dark:text-white">
                {pendingAction.confirmTitle}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                {tenant.firstName} {tenant.lastName} · {decodeHtml(property.title)} (Unit {unit.unitNumber || 'Standard'})
              </p>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80">
              {pendingAction.confirmDescription}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={mutation.isPending} 
                onClick={() => setPendingAction(null)}
              >
                Go Back
              </Button>
              <Button
                variant={pendingAction.variant}
                size="sm"
                isLoading={mutation.isPending}
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(pendingAction.status)}
              >
                Confirm {pendingAction.label}
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
