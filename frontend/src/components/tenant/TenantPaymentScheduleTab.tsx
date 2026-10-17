'use client';

import React from 'react';
import Link from 'next/link';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  ArrowRight,
  Lock,
  Building2,
} from 'lucide-react';

interface TenantPaymentScheduleProps {
  activeBooking?: any;
  bookings?: any[];
}

export default function TenantPaymentScheduleTab({ activeBooking: propActiveBooking, bookings = [] }: TenantPaymentScheduleProps) {
  const activeBooking =
    propActiveBooking ||
    bookings.find((b: any) => !['CANCELLED', 'REJECTED'].includes(b.status)) ||
    null;

  if (!activeBooking) {
    return (
      <div className="bg-white dark:bg-[#12151E] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 text-center space-y-4 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
          <CreditCard className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-base font-bold text-zinc-950 dark:text-white">
            No Active Rent Schedule Yet
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Once you apply for a student hostel or residential unit, your rent breakdown, caution deposit ledger, and Paystack escrow receipts will appear here.
          </p>
        </div>
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-bold transition-colors"
        >
          <span>Browse Accommodations</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  const prop = activeBooking.property || {};
  const baseRent = Number(activeBooking.price || activeBooking.room?.price || prop.price || 0);
  const cautionDeposit = Number(prop.cautionDeposit || 0);
  const totalContractValue = baseRent + cautionDeposit;

  const isPaid = ['COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(activeBooking.status);
  const transactions: any[] = Array.isArray(activeBooking.transactions) ? activeBooking.transactions : [];
  const leaseStatus = activeBooking.leaseAgreement?.status || 'NONE';

  return (
    <div className="bg-white dark:bg-[#12151E] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xs">
      {/* Header */}
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Escrow Rent Ledger</span>
          </div>
          <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
            {prop.title || 'Tenancy Financial Schedule'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Booking Ref: #{activeBooking.id.slice(0, 8).toUpperCase()} • {prop.location}
          </p>
        </div>

        <Link
          href={`/dashboard/tenant/bookings/${activeBooking.id}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-900 dark:text-white transition-colors self-start sm:self-auto"
        >
          <span>Open Full Booking Record</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Financial Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-zinc-100 dark:divide-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div className="p-5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
            Base Tenancy Rent
          </span>
          <span className="text-xl font-mono font-extrabold text-zinc-950 dark:text-white mt-1 block">
            GH₵ {baseRent.toLocaleString()}
          </span>
          <span className="text-[11px] text-zinc-500 mt-0.5 block">
            {activeBooking.room?.roomType || prop.type || 'Standard Tenancy'}
          </span>
        </div>

        <div className="p-5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
            Refundable Caution Deposit
          </span>
          <span className="text-xl font-mono font-extrabold text-zinc-950 dark:text-white mt-1 block">
            GH₵ {cautionDeposit.toLocaleString()}
          </span>
          <span className="text-[11px] text-zinc-500 mt-0.5 block">
            {cautionDeposit > 0 ? 'Protected under Act 220' : 'No deposit required'}
          </span>
        </div>

        <div className="p-5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
            Escrow Settlement Status
          </span>
          <div className="mt-1.5 flex items-center gap-2">
            {isPaid ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Settled (GH₵ {totalContractValue.toLocaleString()})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <Clock className="w-3.5 h-3.5" />
                Pending (GH₵ {totalContractValue.toLocaleString()})
              </span>
            )}
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">
            {activeBooking.isCheckedIn
              ? 'Checked in • Active tenancy'
              : isPaid
              ? 'Held in escrow awaiting check-in'
              : `Lease status: ${leaseStatus.replace(/_/g, ' ')}`}
          </span>
        </div>
      </div>

      {/* Recorded Transactions or Next Step Prompt */}
      <div className="p-6 space-y-4">
        <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
          Verified Payment Receipts
        </h4>

        {transactions.length > 0 ? (
          <div className="space-y-2.5">
            {transactions.map((tx: any) => (
              <div
                key={tx.id}
                className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-zinc-950 dark:text-white">
                      GH₵ {Number(tx.amount || 0).toLocaleString()}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {tx.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-mono">
                    Ref: {tx.paymentReference || tx.id} •{' '}
                    {new Date(tx.createdAt).toLocaleDateString('en-GH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <Link
                  href={`/dashboard/tenant/bookings/${activeBooking.id}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F5132] dark:text-emerald-400 hover:underline"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Booking &amp; PDF Agreement</span>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                <span>
                  {isPaid
                    ? 'Booking marked as settled'
                    : 'No payment transaction recorded for this booking yet'}
                </span>
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isPaid
                  ? 'Open your booking record to download your signed tenancy agreement.'
                  : 'Complete your digital lease signing and proceed to Paystack checkout from your booking details page.'}
              </p>
            </div>

            <Link
              href={`/dashboard/tenant/bookings/${activeBooking.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-bold shrink-0 self-start sm:self-center"
            >
              <span>{isPaid ? 'View Booking Details' : 'Proceed to Lease & Payment'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
