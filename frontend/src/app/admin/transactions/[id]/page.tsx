'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Banknote,
  Receipt,
  CreditCard,
  Building,
  User as UserIcon,
  Calendar,
  AlertCircle,
  Loader2,
  Copy,
  Mail,
  Phone,
  ShieldCheck,
  FileText,
  BadgeCheck,
  CheckCircle,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';

export default function AdminTransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const transactionId = resolvedParams.id;

  const { data: transaction, isLoading, error } = useQuery({
    queryKey: ['admin-transaction', transactionId],
    queryFn: async () => {
      const res = await api.get(`/admin/transactions/${transactionId}`);
      return res.data;
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-semibold text-zinc-500">Retrieving Paystack gateway transaction audit docket...</p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-zinc-900 dark:text-white">Transaction Not Located</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-6">
          The requested payment transaction could not be located in the financial ledger.
        </p>
        <Link
          href="/admin/transactions"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
        >
          Return to Transactions Ledger
        </Link>
      </div>
    );
  }

  const property = transaction.property;
  const tenant = transaction.tenant;
  const landlord = transaction.landlord;
  const booking = transaction.booking;
  const agreement = booking?.leaseAgreement;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Payment Docket: ${transaction.reference}`}
        subtitle={`Rent Payment • GH₵ ${Number(transaction.amount || 0).toLocaleString()} • ${transaction.paymentMethod || 'Paystack'}`}
        badge={<AdminStatusBadge status={transaction.status || 'PENDING'} />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Transactions', href: '/admin/transactions' },
          { label: transaction.reference }
        ]}
        backUrl="/admin/transactions"
        backLabel="Back to Ledger"
        actions={
          <button
            type="button"
            onClick={() => copyToClipboard(transaction.reference)}
            className="px-3.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" /> Copy Reference
          </button>
        }
      />

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Settlement & Breakdown (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Financial Overview Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              Settlement & Financial Breakdown
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  Gross Payment
                </span>
                <span className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  GH₵ {Number(transaction.amount || 0).toLocaleString()}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  Gateway Channel
                </span>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  {transaction.paymentMethod || 'Mobile Money / Card'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  Settlement Status
                </span>
                <div className="mt-1">
                  <AdminStatusBadge status={transaction.status || 'PENDING'} />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                <span>Transaction Timestamp</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {new Date(transaction.createdAt).toLocaleString('en-GB')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                <span>Paystack Gateway Reference</span>
                <code className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                  {transaction.reference}
                </code>
              </div>
              <div className="flex justify-between py-1">
                <span>Disbursement Policy</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Disbursed 24 hours post-tenant verified check-in
                </span>
              </div>
            </div>
          </div>

          {/* Tenancy Booking Association */}
          {booking && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Associated Tenancy Booking
                </h3>
                <Link
                  href={`/admin/bookings/${booking.id}`}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  View Full Booking Docket
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Booking Status</span>
                  <AdminStatusBadge status={booking.status || 'CONFIRMED'} />
                </div>
                {agreement && (
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-zinc-500">Lease Agreement</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {agreement.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Counterparties & Property (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Tenant (Payer) */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-emerald-600" />
                Tenant (Payer)
              </h3>
              {tenant && (
                <Link
                  href={`/admin/tenants/${tenant.id}`}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Profile
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
              <p className="text-xs text-zinc-400 italic">No tenant record attached</p>
            )}
          </div>

          {/* Landlord (Beneficiary) */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                Landlord (Disbursement Beneficiary)
              </h3>
              {landlord && (
                <Link
                  href={`/admin/landlords/${landlord.id}`}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Profile
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
              <p className="text-xs text-zinc-400 italic">No landlord attached</p>
            )}
          </div>

          {/* Property Premises */}
          {property && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-600" />
                  Rented Premises
                </h3>
                <Link
                  href={`/admin/properties/${property.id}`}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Listing Audit
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1 text-xs">
                <div className="font-bold text-zinc-900 dark:text-white">{property.title}</div>
                <div className="text-zinc-500">{property.location || 'Location unlisted'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
