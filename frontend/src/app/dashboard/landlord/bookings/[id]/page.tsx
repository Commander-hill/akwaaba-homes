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
  ExternalLink, Download, Check, Loader2, Sparkles, AlertTriangle,
  Lock, KeyRound, MapPin, DollarSign, ClipboardCheck
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/Button';
import { getImageUrl } from '@/lib/utils';
import clsx from 'clsx';

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
const fmtTime = (d?: string) => (d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '');

const formatCedis = (amount?: number | null) => {
  if (amount === undefined || amount === null) return 'GH₵ 0';
  return `GH₵ ${Number(amount).toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const getDuration = (start?: string, end?: string) => {
  if (!start || !end) return '';
  const d1 = new Date(start);
  const d2 = new Date(end);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays >= 300) return `${Math.round(diffDays / 365)} Year (${diffDays} days)`;
  if (diffDays >= 60) return `${Math.round(diffDays / 30)} Months (${diffDays} days)`;
  return `${diffDays} Days`;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  PENDING: { 
    label: 'Pending Approval', 
    bg: 'bg-amber-50 dark:bg-amber-950/40', 
    text: 'text-amber-700 dark:text-amber-400', 
    border: 'border-amber-300 dark:border-amber-800', 
    icon: Clock 
  },
  APPROVED: { 
    label: 'Approved (Awaiting Signing & Payment)', 
    bg: 'bg-blue-50 dark:bg-blue-950/40', 
    text: 'text-blue-700 dark:text-blue-400', 
    border: 'border-blue-300 dark:border-blue-800', 
    icon: CheckCircle2 
  },
  CONFIRMED: { 
    label: 'Confirmed & Reserved', 
    bg: 'bg-emerald-50 dark:bg-emerald-950/40', 
    text: 'text-[#16A34A] dark:text-emerald-400', 
    border: 'border-emerald-300 dark:border-emerald-800', 
    icon: CheckCircle2 
  },
  CHECKED_IN: { 
    label: 'Checked In / Active Resident', 
    bg: 'bg-indigo-50 dark:bg-indigo-950/40', 
    text: 'text-indigo-700 dark:text-indigo-400', 
    border: 'border-indigo-300 dark:border-indigo-800', 
    icon: Home 
  },
  COMPLETED: { 
    label: 'Tenancy Completed', 
    bg: 'bg-emerald-50 dark:bg-emerald-950/40', 
    text: 'text-[#16A34A] dark:text-emerald-400', 
    border: 'border-emerald-300 dark:border-emerald-800', 
    icon: CheckCircle2 
  },
  REJECTED: { 
    label: 'Request Declined', 
    bg: 'bg-rose-50 dark:bg-rose-950/40', 
    text: 'text-rose-700 dark:text-rose-400', 
    border: 'border-rose-300 dark:border-rose-800', 
    icon: XCircle 
  },
  CANCELLED: { 
    label: 'Booking Cancelled', 
    bg: 'bg-zinc-100 dark:bg-zinc-800', 
    text: 'text-zinc-600 dark:text-zinc-400', 
    border: 'border-zinc-300 dark:border-zinc-700', 
    icon: XCircle 
  },
};

const NEXT: Record<string, { status: string; label: string; danger?: boolean; variant: 'emerald' | 'danger' | 'outline' | 'blue'; confirm: string }[]> = {
  PENDING: [
    { 
      status: 'APPROVED', 
      label: 'Approve Reservation', 
      variant: 'emerald', 
      confirm: 'Approve this reservation request? The student will be prompted to sign the digital agreement and complete payment.' 
    },
    { 
      status: 'REJECTED', 
      label: 'Decline Request', 
      danger: true, 
      variant: 'danger', 
      confirm: 'Decline this reservation request? This action cannot be reversed.' 
    },
  ],
  APPROVED: [
    { 
      status: 'CANCELLED', 
      label: 'Revoke Approval', 
      danger: true, 
      variant: 'danger', 
      confirm: 'Revoke approval for this booking? The student will be notified and the bed released.' 
    },
  ],
  CONFIRMED: [
    { 
      status: 'CHECKED_IN', 
      label: 'Confirm Move-in / Check-in', 
      variant: 'emerald', 
      confirm: 'Confirm that the tenant has arrived and checked in to their designated room/bed?' 
    },
    { 
      status: 'CANCELLED', 
      label: 'Cancel Booking', 
      danger: true, 
      variant: 'danger', 
      confirm: 'Cancel this confirmed booking? Please ensure cancellation policies are respected.' 
    },
  ],
  CHECKED_IN: [
    { 
      status: 'COMPLETED', 
      label: 'Mark Stay Completed', 
      variant: 'emerald', 
      confirm: 'Confirm that the tenant has completed their stay, checked out, and room handover is concluded?' 
    },
  ],
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [pendingAction, setPendingAction] = useState<null | { status: string; label: string; confirm: string; danger?: boolean; variant: string }>(null);

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
      toast.success('Booking status updated successfully');
      setPendingAction(null);
      qc.invalidateQueries({ queryKey: ['landlord', 'booking', id] });
      qc.invalidateQueries({ queryKey: ['landlord', 'bookings'] });
      qc.invalidateQueries({ queryKey: ['landlord'] });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Could not update this booking. Please try again.');
      setPendingAction(null);
      refetch();
    },
  });

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white dark:bg-[#12151D] border border-rose-200 dark:border-rose-900/50 rounded-2xl text-center space-y-4 shadow-xs">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-black text-zinc-900 dark:text-white">Could Not Load Booking Details</h2>
        <p className="text-xs text-zinc-500">There was an issue fetching the reservation record. It may not exist or you may lack authorization.</p>
        <div className="flex gap-2 justify-center pt-2">
          <Link href="/dashboard/landlord/bookings">
            <Button variant="outline" size="sm">Back to Bookings</Button>
          </Link>
          <Button variant="emerald" size="sm" onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (isLoading || !booking) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-pulse">
        <div className="h-6 w-36 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
        <div className="h-28 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl md:col-span-2" />
          <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const t = booking.tenant || {};
  const actions = NEXT[booking.status] || [];
  const lease = booking.leaseAgreement;
  const tx = booking.transaction || booking.transactions?.[0];
  const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusCfg.icon;

  // Property Image fallback
  let propertyImage = '';
  if (booking.property?.images) {
    try {
      const parsed = Array.isArray(booking.property.images) 
        ? booking.property.images 
        : JSON.parse(booking.property.images);
      if (parsed.length > 0) propertyImage = parsed[0];
    } catch {
      propertyImage = typeof booking.property.images === 'string' ? booking.property.images : '';
    }
  }

  const isVerified = t.ghanaCardStatus === 'VERIFIED';
  const durationText = getDuration(booking.startDate, booking.endDate);
  const totalRent = booking.price ?? booking.room?.price ?? booking.property?.price ?? 0;
  const cautionDeposit = booking.property?.cautionDeposit ?? 0;
  const totalPaid = tx?.amount ? Number(tx.amount) : (booking.status === 'CONFIRMED' || booking.status === 'CHECKED_IN' || booking.status === 'COMPLETED' ? totalRent + cautionDeposit : 0);

  const timelineSteps = [
    {
      id: 1,
      title: 'Booking Request',
      subtitle: 'Submitted by student',
      timestamp: booking.createdAt,
      isCompleted: true,
      isCurrent: booking.status === 'PENDING',
    },
    {
      id: 2,
      title: 'Landlord Approval',
      subtitle: booking.status === 'REJECTED' ? 'Request was declined' : 'Approved for residency',
      timestamp: ['APPROVED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status) ? booking.updatedAt : null,
      isCompleted: ['APPROVED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status),
      isCurrent: booking.status === 'PENDING',
      isFailed: booking.status === 'REJECTED',
    },
    {
      id: 3,
      title: 'Digital Tenancy Agreement',
      subtitle: lease?.tenantSignedAt && lease?.landlordSignedAt 
        ? 'Signed by both parties' 
        : lease?.tenantSignedAt 
        ? 'Tenant signed (awaiting your countersignature)' 
        : 'Pending digital signatures',
      timestamp: lease?.landlordSignedAt || lease?.tenantSignedAt,
      isCompleted: Boolean(lease?.tenantSignedAt && lease?.landlordSignedAt),
      isCurrent: booking.status === 'APPROVED' && (!lease?.tenantSignedAt || !lease?.landlordSignedAt),
    },
    {
      id: 4,
      title: 'Tenancy Payment',
      subtitle: tx?.status === 'SUCCESS' || ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status) 
        ? `Payment verified (${formatCedis(totalPaid)})` 
        : 'Pending fee settlement',
      timestamp: tx?.status === 'SUCCESS' ? tx.createdAt : null,
      isCompleted: tx?.status === 'SUCCESS' || ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status),
      isCurrent: booking.status === 'APPROVED' && (!tx || tx.status !== 'SUCCESS'),
    },
    {
      id: 5,
      title: 'Check-in & Residency',
      subtitle: booking.status === 'COMPLETED' 
        ? 'Tenancy term completed' 
        : booking.status === 'CHECKED_IN' 
        ? 'Tenant actively in residence' 
        : 'Scheduled for move-in',
      timestamp: ['CHECKED_IN', 'COMPLETED'].includes(booking.status) ? booking.updatedAt : null,
      isCompleted: ['CHECKED_IN', 'COMPLETED'].includes(booking.status),
      isCurrent: booking.status === 'CONFIRMED',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      
      {/* ── BREADCRUMB & TOP NAV ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link 
          href="/dashboard/landlord/bookings" 
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Reservations
        </Link>

        {/* Quick Inspection Link if Active */}
        {['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status) && (
          <Link href={`/dashboard/landlord/inspections/${booking.id}`}>
            <Button variant="outline" size="sm" leftIcon={<ClipboardCheck className="w-3.5 h-3.5 text-[#16A34A]" />}>
              Inspection Checklist
            </Button>
          </Link>
        )}
      </div>

      {/* ── HERO BANNER CARD ── */}
      <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Tenant Avatar & Identification */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {t.avatarUrl ? (
                <img 
                  src={getImageUrl(t.avatarUrl)} 
                  alt="" 
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-zinc-100 dark:border-zinc-800" 
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-[#16A34A] flex items-center justify-center font-black text-2xl border-2 border-zinc-200 dark:border-zinc-700/80">
                  {t.firstName?.[0] || 'T'}{t.lastName?.[0] || ''}
                </div>
              )}
              {isVerified && (
                <span className="absolute -bottom-1 -right-1 bg-[#16A34A] text-white p-1 rounded-full shadow-xs" title="Ghana Card KYC Verified">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
                  {t.firstName || 'Student'} {t.lastName || 'Tenant'}
                </h1>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] border border-emerald-300 dark:border-emerald-800">
                    <ShieldCheck className="w-3 h-3" /> Ghana Card Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                    <ShieldAlert className="w-3 h-3" /> Unverified ID
                  </span>
                )}
              </div>

              <p className="text-xs font-semibold text-zinc-500 mt-0.5 flex flex-wrap items-center gap-2">
                <span>{booking.property?.title}</span>
                <span>•</span>
                <span className="text-zinc-700 dark:text-zinc-300 font-bold">
                  Unit {booking.roomUnit?.unitNumber || 'Unassigned'} ({booking.bed?.bedNumber || 'Bed 1'})
                </span>
              </p>
            </div>
          </div>

          {/* Status Badge & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 self-start md:self-center">
            <div className={clsx(
              "px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2",
              statusCfg.bg, statusCfg.text, statusCfg.border
            )}>
              <StatusIcon className="w-4 h-4 shrink-0" />
              <span>{statusCfg.label}</span>
            </div>
          </div>
        </div>

        {/* Action Controls & Contact Buttons */}
        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          
          {/* Quick Contact Links */}
          <div className="flex flex-wrap items-center gap-2">
            {t.phoneNumber && ['APPROVED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status) && (
              <a href={`tel:${t.phoneNumber}`}>
                <Button variant="outline" size="sm" leftIcon={<Phone className="w-3.5 h-3.5 text-[#16A34A]" />}>
                  Call {t.phoneNumber}
                </Button>
              </a>
            )}

            {t.id && (
              <Link href={`/dashboard/messages?userId=${t.id}`}>
                <Button variant="outline" size="sm" leftIcon={<MessageSquare className="w-3.5 h-3.5 text-blue-600" />}>
                  Message Tenant
                </Button>
              </Link>
            )}

            {lease?.id && (
              <Link href={`/lease-agreement/${lease.id}`} target="_blank">
                <Button variant="outline" size="sm" leftIcon={<FileText className="w-3.5 h-3.5 text-indigo-600" />}>
                  View Agreement
                </Button>
              </Link>
            )}

            {['CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status) && (
              <Link href={`/dashboard/invoice/${booking.id}`}>
                <Button variant="outline" size="sm" leftIcon={<Receipt className="w-3.5 h-3.5 text-zinc-500" />}>
                  Receipt / Invoice
                </Button>
              </Link>
            )}
          </div>

          {/* Contextual Status Advancement Actions */}
          {actions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {actions.map((a) => (
                <Button 
                  key={a.status} 
                  variant={a.variant} 
                  size="sm" 
                  onClick={() => setPendingAction(a)}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── PROGRESS & MILESTONES STEPPER ── */}
      <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
          <h2 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#16A34A]" /> Reservation Progression
          </h2>
          <span className="text-[11px] font-bold text-zinc-400">
            Reference #{booking.id.slice(0, 8).toUpperCase()}
          </span>
        </div>

        {/* Responsive Connected Stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          {timelineSteps.map((step, idx) => (
            <div 
              key={step.id} 
              className={clsx(
                "p-3 rounded-xl border relative transition-all",
                step.isFailed
                  ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900"
                  : step.isCompleted
                  ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80"
                  : step.isCurrent
                  ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800 ring-2 ring-blue-500/20"
                  : "bg-zinc-50/60 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800 opacity-60"
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Step 0{step.id}
                </span>
                {step.isFailed ? (
                  <XCircle className="w-4 h-4 text-rose-500" />
                ) : step.isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                ) : step.isCurrent ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                )}
              </div>

              <h3 className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                {step.title}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2 leading-snug">
                {step.subtitle}
              </p>

              {step.timestamp && (
                <span className="block text-[10px] text-zinc-400 font-medium mt-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
                  {fmtTime(step.timestamp)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── TWO-COLUMN MAIN CONTENT ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ── LEFT COLUMN: ACCOMMODATION & FINANCES ── */}
        <div className="space-y-6">
          
          {/* Stay & Room Details Card */}
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h2 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[#16A34A]" /> Accommodation Details
              </h2>
              {booking.property?.id && (
                <Link 
                  href={`/properties/${booking.property.id}`} 
                  target="_blank"
                  className="text-[11px] font-bold text-[#16A34A] hover:underline inline-flex items-center gap-1"
                >
                  View Property <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Property Snippet with Image */}
            <div className="flex gap-3 p-3 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
              {propertyImage ? (
                <img 
                  src={getImageUrl(propertyImage)} 
                  alt="" 
                  className="w-16 h-16 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-700" 
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-400">
                  <Building2 className="w-8 h-8" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                  {booking.property?.title}
                </h3>
                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{booking.property?.location || 'Campus / Town Area'}</span>
                </p>
                <div className="flex gap-2 mt-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {booking.property?.type || 'Hostel'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {booking.property?.pricePeriod || 'Academic Year'}
                  </span>
                </div>
              </div>
            </div>

            {/* Room & Bed Allocation Breakdown */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Room Type</span>
                <span className="font-bold text-zinc-900 dark:text-white block">
                  {[booking.room?.blockName, booking.room?.roomType].filter(Boolean).join(' · ') || 'Standard Room'}
                </span>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Unit &amp; Floor</span>
                <span className="font-bold text-zinc-900 dark:text-white block">
                  {booking.roomUnit?.unitNumber ? `Unit ${booking.roomUnit.unitNumber}` : 'Unassigned'}
                  {booking.roomUnit?.floor ? ` (Floor ${booking.roomUnit.floor})` : ''}
                </span>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Bed Allocation</span>
                <span className="font-bold text-[#16A34A] dark:text-emerald-400 block">
                  {booking.bed?.bedNumber || 'Bed 1'}
                </span>
              </div>

              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">Total Stay Duration</span>
                <span className="font-bold text-zinc-900 dark:text-white block">
                  {durationText || 'Academic Year'}
                </span>
              </div>
            </div>

            {/* Check-in & Check-out Calendar Cards */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Check-In Date</span>
                </div>
                <div className="text-xs font-black text-zinc-900 dark:text-white">
                  {fmt(booking.startDate)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5 text-rose-500" />
                  <span>Check-Out Date</span>
                </div>
                <div className="text-xs font-black text-zinc-900 dark:text-white">
                  {fmt(booking.endDate)}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Breakdown Card */}
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h2 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-[#16A34A]" /> Financial Statement
              </h2>
              {tx?.status === 'SUCCESS' && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] border border-emerald-300 dark:border-emerald-800">
                  Paid &amp; Cleared
                </span>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/80">
                <span className="text-zinc-500">Accommodation Base Rent</span>
                <span className="font-bold text-zinc-900 dark:text-white tabular-nums">
                  {formatCedis(totalRent)}
                </span>
              </div>

              {cautionDeposit > 0 && (
                <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex flex-col">
                    <span className="text-zinc-500">Refundable Caution Deposit</span>
                    <span className="text-[10px] text-zinc-400">Held for damages / key return</span>
                  </div>
                  <span className="font-bold text-zinc-900 dark:text-white tabular-nums">
                    {formatCedis(cautionDeposit)}
                  </span>
                </div>
              )}

              <div className="flex justify-between py-2 pt-3 font-bold text-sm bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
                <span className="text-zinc-950 dark:text-white">Total Tenancy Fee</span>
                <span className="text-[#16A34A] dark:text-emerald-400 font-black tabular-nums">
                  {formatCedis(totalRent + cautionDeposit)}
                </span>
              </div>

              {tx?.reference && (
                <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[11px] space-y-1">
                  <div className="flex justify-between text-zinc-500">
                    <span>Payment Reference:</span>
                    <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{tx.reference}</span>
                  </div>
                  <div className="flex justify-between text-zinc-500">
                    <span>Processed At:</span>
                    <span>{fmtTime(tx.createdAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN: TENANT PROFILE, RULES & LEASE ── */}
        <div className="space-y-6">
          
          {/* Student Profile Card */}
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-600" /> Student &amp; Tenant Profile
              </h2>
              <span className="text-[10px] font-bold text-zinc-400">
                ID #{t.studentId || 'N/A'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Institution / Campus</span>
                <span className="font-bold text-zinc-900 dark:text-white">{t.campus || 'Not specified'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Programme of Study</span>
                <span className="font-bold text-zinc-900 dark:text-white">{t.programmeOfStudy || 'Not specified'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Level / Year</span>
                <span className="font-bold text-zinc-900 dark:text-white">{t.yearOfStudy || 'Level 100'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Gender</span>
                <span className="font-bold text-zinc-900 dark:text-white">{t.gender || 'Not specified'}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Nationality</span>
                <span className="font-bold text-zinc-900 dark:text-white">{t.nationality || 'Ghanaian'}</span>
              </div>

              {['APPROVED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status) ? (
                <>
                  <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">Phone Contact</span>
                    <a href={`tel:${t.phoneNumber}`} className="font-bold text-[#16A34A] hover:underline">
                      {t.phoneNumber || 'N/A'}
                    </a>
                  </div>

                  <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-500">Email Address</span>
                    <a href={`mailto:${t.email}`} className="font-bold text-zinc-900 dark:text-white hover:underline truncate max-w-[200px]">
                      {t.email || 'N/A'}
                    </a>
                  </div>
                </>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-[11px] text-amber-800 dark:text-amber-300">
                  Phone and email contacts are unlocked immediately once you approve this reservation request.
                </div>
              )}
            </div>

            {/* Emergency / Guardian Contact */}
            {(t.guardianName || t.guardianPhone) && (
              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 mt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Emergency / Next of Kin Contact
                </span>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-600 dark:text-zinc-400">Guardian Name:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{t.guardianName || 'Parent / Guardian'}</span>
                </div>
                {t.guardianPhone && (
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400">Guardian Phone:</span>
                    <a href={`tel:${t.guardianPhone}`} className="font-bold text-[#16A34A] hover:underline">
                      {t.guardianPhone}
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Legal Lease Agreement Card */}
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-blue-600" /> Tenancy Agreement &amp; Deed
              </h2>
              {lease?.cryptographicHash && (
                <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]" title={lease.cryptographicHash}>
                  {lease.cryptographicHash.slice(0, 10)}...
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 dark:text-white">Tenant Electronic Signature</span>
                  {lease?.tenantSignedAt ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A]">
                      <Check className="w-3.5 h-3.5" /> Signed {fmtTime(lease.tenantSignedAt)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-400 font-semibold">Pending Signature</span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 dark:text-white">Landlord Countersignature</span>
                  {lease?.landlordSignedAt ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#16A34A]">
                      <Check className="w-3.5 h-3.5" /> Signed {fmtTime(lease.landlordSignedAt)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-400 font-semibold">Pending Signature</span>
                  )}
                </div>
              </div>

              {lease?.id ? (
                <Link href={`/lease-agreement/${lease.id}`} target="_blank" className="block">
                  <Button variant="outline" size="sm" className="w-full" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                    Open Signed Digital Deed
                  </Button>
                </Link>
              ) : (
                <p className="text-[11px] text-zinc-400 italic">
                  Digital deed generates automatically upon approving this reservation request.
                </p>
              )}
            </div>
          </div>

          {/* House Rules & Policies Card */}
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" /> Host House Rules
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/80">
                <span className="text-zinc-500">Gate Lock / Curfew:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{booking.property?.gateLockTime || '24/7 Access'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/80">
                <span className="text-zinc-500">Visitor Policy:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{booking.property?.visitorPolicy || 'Standard'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Quiet Study Hours:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{booking.property?.quietHours || 'From 10:00 PM'}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── ACTION CONFIRMATION MODAL ── */}
      {pendingAction && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in" 
          role="alertdialog" 
          aria-modal="true"
        >
          <div className="relative bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className={clsx(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                pendingAction.danger ? "bg-rose-100 dark:bg-rose-950 text-rose-600" : "bg-emerald-100 dark:bg-emerald-950 text-[#16A34A]"
              )}>
                {pendingAction.danger ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                  {pendingAction.label}
                </h2>
                <span className="text-[11px] font-bold text-zinc-400">
                  {t.firstName} {t.lastName} · Unit {booking.roomUnit?.unitNumber || 'STUD-102'}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
              {pendingAction.confirm}
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
                variant={pendingAction.danger ? 'danger' : 'emerald'}
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
