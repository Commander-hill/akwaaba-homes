'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  CalendarCheck,
  Home,
  User as UserIcon,
  CreditCard,
  Building2,
  Calendar,
  FileText,
  BadgeCheck,
  AlertCircle,
  ExternalLink,
  Loader2,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  DoorClosed,
  Banknote
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

const formatLeaseDuration = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return 'N/A';
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= 360 && diffDays <= 370) return '1 Year (12 Months)';
  if (diffDays >= 180 && diffDays <= 185) return '6 Months';
  if (diffDays >= 90 && diffDays <= 93) return '3 Months';

  const months = Math.round(diffDays / 30.4);
  if (months > 0) return `${months} Months (${diffDays} days)`;
  return `${diffDays} Days`;
};

export default function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id;
  const queryClient = useQueryClient();

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'CANCEL' | 'COMPLETE' | null;
  }>({
    isOpen: false,
    action: null
  });

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['admin-booking', bookingId],
    queryFn: async () => {
      const res = await api.get(`/admin/bookings/${bookingId}`);
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-semibold text-zinc-500">Retrieving tenancy lease docket & escrow audit records...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-zinc-900 dark:text-white">Booking Record Not Found</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-6">
          The requested lease booking record does not exist or has been removed from index.
        </p>
        <Link
          href="/admin/bookings"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
        >
          Return to Bookings Directory
        </Link>
      </div>
    );
  }

  const property = booking.property;
  const tenant = booking.tenant;
  const landlord = property?.landlord;
  const transaction = booking.transaction;
  const agreement = booking.leaseAgreement;
  const rentAmount = transaction?.amount || property?.price || 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Lease Record #${booking.id.slice(0, 8).toUpperCase()}`}
        subtitle={`${property?.title || 'Residential Property'} • Lease Period: ${formatLeaseDuration(booking.startDate, booking.endDate)}`}
        badge={<AdminStatusBadge status={booking.status || 'PENDING'} />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Bookings', href: '/admin/bookings' },
          { label: `Record #${booking.id.slice(0, 8)}` }
        ]}
        backUrl="/admin/bookings"
        backLabel="Back to Bookings"
        actions={
          <div className="flex items-center gap-2">
            {property?.id && (
              <Link
                href={`/properties/${property.id}`}
                target="_blank"
                className="px-3.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Public Listing
              </Link>
            )}
          </div>
        }
      />

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Lease & Escrow Details (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Escrow Settlement Financials */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              Escrow Financial Settlement
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Gross Escrow Rent
                </span>
                <span className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  GH₵ {Number(rentAmount).toLocaleString()}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Payment Gateway
                </span>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 mt-0.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  {transaction?.paymentMethod || 'Mobile Money / Card'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Paystack Reference
                </span>
                <code className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 block truncate">
                  {transaction?.reference || 'ESCROW-PENDING'}
                </code>
              </div>
            </div>
          </div>

          {/* Tenancy Timeline */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Tenancy Term & Move-In Timeline
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                  Move-In Start Date
                </span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1 block">
                  {new Date(booking.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                  Lease End Date
                </span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1 block">
                  {new Date(booking.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                  Duration
                </span>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {formatLeaseDuration(booking.startDate, booking.endDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Digital Tenancy Agreement Deed */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Digital Tenancy Agreement (Deed)
              </h3>
              {agreement && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  agreement.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                }`}>
                  {agreement.status}
                </span>
              )}
            </div>

            {agreement ? (
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    Cryptographically Authenticated Tenancy Agreement
                  </span>
                </div>
                {agreement.cryptographicHash && (
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 block uppercase">SHA-256 Digest:</span>
                    <code className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 break-all">
                      {agreement.cryptographicHash}
                    </code>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                Digital deed of tenancy has not been generated for this booking.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Counterparties & Property (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Tenant Profile Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-emerald-600" />
                Tenant (Lessee)
              </h3>
              {tenant && (
                <Link
                  href={`/admin/tenants/${tenant.id}`}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  View Profile
                </Link>
              )}
            </div>

            {tenant ? (
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                <div className="font-bold text-zinc-900 dark:text-white">
                  {tenant.firstName} {tenant.lastName}
                </div>
                <div className="space-y-1 text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{tenant.email}</span>
                  </div>
                  {tenant.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{tenant.phoneNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">No tenant assigned</p>
            )}
          </div>

          {/* Landlord Profile Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                Landlord (Lessor)
              </h3>
              {landlord && (
                <Link
                  href={`/admin/landlords/${landlord.id}`}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View Profile
                </Link>
              )}
            </div>

            {landlord ? (
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                <div className="font-bold text-zinc-900 dark:text-white">
                  {landlord.firstName} {landlord.lastName}
                </div>
                <div className="space-y-1 text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{landlord.email}</span>
                  </div>
                  {landlord.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{landlord.phoneNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">No landlord assigned</p>
            )}
          </div>

          {/* Property Reference Card */}
          {property && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                  <Home className="w-4 h-4 text-emerald-600" />
                  Property Premises
                </h3>
                <Link
                  href={`/admin/properties/${property.id}`}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Audit Listing
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1 text-xs">
                <div className="font-bold text-zinc-900 dark:text-white">{property.title}</div>
                <div className="text-zinc-500">{property.location || 'Location unlisted'}</div>
                {booking.roomUnit && (
                  <div className="pt-2 mt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                    <DoorClosed className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unit: {booking.roomUnit.unitNumber}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
