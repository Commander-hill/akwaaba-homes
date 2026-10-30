'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Loader2,
  Printer,
  Download,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  Building2,
  UserCheck,
  KeyRound,
  Calendar,
  CreditCard,
  Home,
  FileCheck,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.id as string;
  const [copiedRef, setCopiedRef] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      toast.loading('Preparing PDF receipt...', { id: 'receipt-pdf' });
      const response = await api.get(`/transactions/${transactionId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Rent_Receipt_${transactionId.slice(0, 8).toUpperCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Receipt PDF downloaded', { id: 'receipt-pdf' });
    } catch {
      toast.error('Failed to download PDF receipt.', { id: 'receipt-pdf' });
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/transactions/${transactionId}`);
        return data.transaction;
      } catch (err) {
        // Fallback: resolve receipt directly from /bookings/:id if transaction lookup fails
        const { data: bookingRes } = await api.get(`/bookings/${transactionId}`);
        const booking = bookingRes.booking || bookingRes;
        if (!booking || !booking.id) throw err;

        const tx = booking.transactions?.[0] || booking.transaction;
        const baseRent = booking.room?.price ?? booking.property?.price ?? booking.price ?? 0;
        const caution = booking.cautionDepositAmount ?? booking.property?.cautionDeposit ?? 0;
        const totalAmount = tx?.amount ?? baseRent + caution;
        const isPaid = ['COMPLETED', 'ACTIVE', 'CHECKED_IN', 'CHECKED_OUT'].includes(booking.status);
        const ref =
          tx?.reference ||
          (booking.checkInCode
            ? `PAY-${booking.checkInCode}`
            : `RCP-${booking.id.slice(0, 8).toUpperCase()}`);

        return {
          id: tx?.id || booking.id,
          bookingId: booking.id,
          amount: totalAmount,
          reference: ref,
          paymentReference: ref,
          paymentMethod: isPaid ? 'Paystack (Ghana MoMo / Card)' : 'Pending Settlement',
          status: tx?.status || (isPaid ? 'SUCCESS' : 'PENDING'),
          createdAt: tx?.createdAt || booking.updatedAt || booking.createdAt,
          tenant: booking.tenant,
          property: booking.property,
          room: booking.room,
          booking,
        };
      }
    },
    enabled: !!transactionId,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-20 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <p className="text-xs font-semibold text-zinc-500">Retrieving official receipt record...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 text-center bg-white dark:bg-[#141816] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-3">
          <FileCheck className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-zinc-950 dark:text-white">Rent Receipt Not Found</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
          The requested payment receipt record could not be retrieved or is not linked to your account.
        </p>
        <button
          onClick={() => router.back()}
          className="mt-5 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg text-xs font-bold transition cursor-pointer"
        >
          Return to Previous Page
        </button>
      </div>
    );
  }

  const { tenant, property, booking } = data;
  const room = data.room || booking?.room;
  const landlord = property?.landlord;

  const receiptRef = data.reference || `RCP-${transactionId.slice(0, 8).toUpperCase()}`;
  const issuedDate = new Date(data.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const issuedTime = new Date(data.createdAt).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const startStr = booking?.startDate
    ? new Date(booking.startDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;
  const endStr = booking?.endDate
    ? new Date(booking.endDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;
  const periodLabel = startStr && endStr ? `${startStr} – ${endStr}` : 'Current Tenancy Term';

  const roomTypeLabel = room?.roomType || property?.type || 'Residential Unit';
  const allocationParts = [
    room?.blockName ? `Block ${room.blockName}` : null,
    booking?.roomUnit?.unitNumber ? `Unit ${booking.roomUnit.unitNumber}` : null,
    booking?.bed?.bedNumber ? `Bed Space ${booking.bed.bedNumber}` : null,
  ].filter(Boolean);
  const unitAllocationLabel =
    allocationParts.length > 0 ? allocationParts.join(' • ') : 'Standard Unit Allocation';

  const totalAmount = Number(data.amount || 0);
  const rawCaution = Number(booking?.cautionDepositAmount ?? property?.cautionDeposit ?? 0);
  const cautionDeposit = rawCaution > 0 && totalAmount > rawCaution ? rawCaution : 0;
  const baseRent = totalAmount - cautionDeposit;

  const isSettled = data.status === 'SUCCESS' || data.status === 'COMPLETED';
  const checkInCode =
    booking?.checkInCode || (booking?.id ? `AKW-${booking.id.slice(0, 6).toUpperCase()}` : null);

  const fmtCedis = (amount: number) =>
    `GH₵ ${Number(amount || 0).toLocaleString('en-GH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const handleCopyRef = () => {
    navigator.clipboard.writeText(receiptRef);
    setCopiedRef(true);
    toast.success('Receipt reference copied to clipboard');
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto my-6 px-4 sm:px-6 pb-20 font-sans">
      {/* ── Top Action Toolbar (Hidden when printing) ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141816] transition cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Portal</span>
        </button>

        <div className="flex items-center gap-2">
          {booking?.id && (
            <Link
              href={`/dashboard/tenant/bookings/${booking.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-200 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141816] hover:border-[#16A34A] transition shadow-2xs"
            >
              <span>View Booking</span>
            </Link>
          )}
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 text-white px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* ── Official Receipt Sheet ── */}
      <div
        id="printable-receipt"
        className="relative bg-white dark:bg-[#121614] text-zinc-900 dark:text-zinc-100 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-md overflow-hidden print:border-none print:shadow-none print:rounded-none print:bg-white print:text-black"
      >
        {/* Top Brand Green Stripe */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#0F5132] via-[#16A34A] to-[#22C55E]" />

        {/* ── Background Watermark: Akwaaba Homes Official Emblem ── */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-0 flex items-center justify-center overflow-hidden z-0"
        >
          <div className="relative w-80 sm:w-[440px] h-80 sm:h-[440px] opacity-[0.038] dark:opacity-[0.055] print:opacity-[0.045] grayscale contrast-125 transform -rotate-12 transition-all">
            <Image
              src="/logo-light.png"
              alt=""
              fill
              sizes="(max-width: 768px) 320px, 440px"
              className="object-contain block dark:hidden print:block"
              priority
            />
            <Image
              src="/logo.png"
              alt=""
              fill
              sizes="(max-width: 768px) 320px, 440px"
              className="object-contain hidden dark:block print:hidden"
              priority
            />
          </div>
        </div>

        {/* ── Receipt Content Container ── */}
        <div className="relative z-10 p-6 sm:p-10 space-y-7">
          
          {/* Header Row: Official Brandmark & Document Details vs. Settlement Status & Amount */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-zinc-200/80 dark:border-zinc-800">
            {/* Left: Official Brand & Title */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shrink-0">
                <Image
                  src="/logo-light.png"
                  alt="Akwaaba Homes"
                  width={64}
                  height={64}
                  className="w-full h-full object-contain block dark:hidden print:block"
                  priority
                />
                <Image
                  src="/logo.png"
                  alt="Akwaaba Homes"
                  width={64}
                  height={64}
                  className="w-full h-full object-contain hidden dark:block print:hidden"
                  priority
                />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-editorial text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 dark:text-white leading-none">
                    Akwaaba Homes
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-100/70 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                    OFFICIAL RENT RECEIPT
                  </span>
                </div>
                <h1 className="text-sm sm:text-base font-bold text-zinc-800 dark:text-zinc-200">
                  Rent &amp; Tenancy Settlement Voucher
                </h1>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                  Issued in accordance with Section 20 of the Rent Act, 1963 (Act 220) &bull; Republic of Ghana
                </p>
              </div>
            </div>

            {/* Right: Settled Badge & Amount Hero */}
            <div className="sm:text-right space-y-2 shrink-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-50 text-[#0F5132] dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                {isSettled ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] dark:text-emerald-400" />
                    <span>Payment Confirmed &bull; Settled</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{data.status}</span>
                  </>
                )}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 dark:text-zinc-400 block">
                  Total Amount Paid
                </span>
                <span className="text-3xl sm:text-4xl font-black tracking-tight tabular-nums text-zinc-950 dark:text-white font-sans">
                  {fmtCedis(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Receipt Reference & Issuance Bar ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-zinc-50/90 dark:bg-zinc-900/50 rounded-xl px-4 py-3 border border-zinc-200/80 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">Receipt No:</span>
              <strong className="font-mono font-bold text-zinc-950 dark:text-white tracking-wider">{receiptRef}</strong>
              <button
                type="button"
                onClick={handleCopyRef}
                className="text-zinc-400 hover:text-[#16A34A] dark:hover:text-emerald-400 transition cursor-pointer print:hidden p-0.5"
                title="Copy reference"
              >
                {copiedRef ? <Check className="w-3.5 h-3.5 text-[#16A34A]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 text-xs">
              <span>Settled on <strong className="text-zinc-950 dark:text-white font-semibold">{issuedDate}</strong> at {issuedTime}</span>
            </div>
          </div>

          {/* ── Counterparty Particulars (Payer vs. Payee) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Payer Particulars */}
            <div className="rounded-xl p-4 bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200/70 dark:border-zinc-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  <UserCheck className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
                  <span>Received From (Tenant)</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/50">
                  Verified Resident
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400">Legal Tenant Name</dt>
                  <dd className="font-bold text-sm text-zinc-950 dark:text-white mt-0.5">
                    {tenant?.firstName} {tenant?.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400">Phone Number</dt>
                  <dd className="font-mono font-medium text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {tenant?.phoneNumber || 'On record'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400">Email Address</dt>
                  <dd className="text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                    {tenant?.email || 'On record'}
                  </dd>
                </div>
                {(tenant?.studentId || tenant?.campus) && (
                  <div className="col-span-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                    <dt className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400">Academic / Campus Identification</dt>
                    <dd className="font-semibold text-zinc-950 dark:text-white mt-0.5">
                      {[tenant.studentId ? `ID: ${tenant.studentId}` : null, tenant.campus || null]
                        .filter(Boolean)
                        .join(' • ')}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Payee Particulars */}
            <div className="rounded-xl p-4 bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200/70 dark:border-zinc-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-[#16A34A] dark:text-emerald-400" />
                  <span>Property &amp; Landlord (Payee)</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-800/50">
                  Verified Property
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400">Premises / Property</dt>
                  <dd className="font-bold text-sm text-zinc-950 dark:text-white mt-0.5">
                    {property?.title || 'Residential Accommodation'}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400">Location / Address</dt>
                  <dd className="text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {property?.location || 'Accra / Kumasi, Republic of Ghana'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400">Landlord / Authorized Host</dt>
                  <dd className="font-semibold text-zinc-950 dark:text-white mt-0.5">
                    {landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Authorized Landlord'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase font-semibold text-zinc-500 dark:text-zinc-400">Landlord Contact</dt>
                  <dd className="font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {landlord?.phoneNumber || 'Verified via Akwaaba'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* ── Tenancy Terms & Allocation Particulars (Full Text, Never Truncated) ── */}
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider border-b border-zinc-200/70 dark:border-zinc-800 pb-2">
              <Home className="w-3.5 h-3.5 text-[#16A34A] dark:text-emerald-400" />
              <span>Tenancy Schedule &amp; Allocation Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 block">
                  Accommodation Type
                </span>
                <span className="font-bold text-zinc-950 dark:text-white block">
                  {roomTypeLabel}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 block">
                  Assigned Unit &amp; Bed Space
                </span>
                <span className="font-bold text-zinc-950 dark:text-white block leading-snug">
                  {unitAllocationLabel}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 block">
                  Tenancy Period
                </span>
                <span className="font-bold text-zinc-950 dark:text-white block leading-snug">
                  {periodLabel}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400 block">
                  Settlement Channel
                </span>
                <span className="font-bold text-zinc-950 dark:text-white block leading-snug">
                  {data.paymentMethod || 'Paystack Direct Settlement (Ghana MoMo / Card)'}
                </span>
              </div>
            </div>
          </div>

          {/* ── Itemized Financial Accounting Table ── */}
          <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 border-b border-zinc-200/80 dark:border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-600 dark:text-zinc-300 font-bold">
                  <th className="py-3 px-4">Item Description &amp; Scope</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Tenancy Period</th>
                  <th className="py-3 px-4 text-right">Amount (GHS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/80 text-xs">
                <tr>
                  <td className="py-4 px-4 space-y-1">
                    <p className="font-bold text-zinc-950 dark:text-white text-sm">
                      Rent Advance &mdash; {property?.title}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      {roomTypeLabel} &bull; {unitAllocationLabel}
                    </p>
                  </td>
                  <td className="py-4 px-4 text-zinc-600 dark:text-zinc-400 hidden sm:table-cell font-medium">
                    {periodLabel}
                  </td>
                  <td className="py-4 px-4 text-right tabular-nums font-bold text-sm text-zinc-950 dark:text-white">
                    {fmtCedis(baseRent)}
                  </td>
                </tr>

                {cautionDeposit > 0 && (
                  <tr>
                    <td className="py-4 px-4 space-y-1">
                      <p className="font-bold text-zinc-950 dark:text-white text-sm">
                        Refundable Security / Caution Deposit
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        Held in statutory trust pursuant to Tenancy Agreement; fully refundable upon move-out room condition inspection
                      </p>
                    </td>
                    <td className="py-4 px-4 text-zinc-600 dark:text-zinc-400 hidden sm:table-cell font-medium">
                      One-time refundable
                    </td>
                    <td className="py-4 px-4 text-right tabular-nums font-bold text-sm text-zinc-950 dark:text-white">
                      {fmtCedis(cautionDeposit)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Financial Ledger Summary */}
            <div className="bg-zinc-50/90 dark:bg-zinc-900/60 border-t border-zinc-200/80 dark:border-zinc-800 px-4 py-4 flex flex-col items-end space-y-2 text-xs">
              <div className="w-full sm:w-80 flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span>Rent Advance Subtotal</span>
                <span className="font-medium tabular-nums">{fmtCedis(baseRent)}</span>
              </div>
              {cautionDeposit > 0 && (
                <div className="w-full sm:w-80 flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Refundable Caution Deposit</span>
                  <span className="font-medium tabular-nums">{fmtCedis(cautionDeposit)}</span>
                </div>
              )}
              <div className="w-full sm:w-80 flex items-center justify-between text-zinc-600 dark:text-zinc-400">
                <span>Tenant Platform &amp; Payment Service Fee</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">GH₵ 0.00 (Waived)</span>
              </div>

              <div className="w-full sm:w-80 pt-2.5 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between text-base font-black text-zinc-950 dark:text-white">
                <span>Total Amount Paid</span>
                <span className="text-[#0F5132] dark:text-emerald-400 tabular-nums">
                  {fmtCedis(totalAmount)}
                </span>
              </div>

              <div className="w-full sm:w-80 flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                <span>Remaining Balance Due</span>
                <span className="tabular-nums">
                  {isSettled ? 'GH₵ 0.00 (Fully Settled)' : fmtCedis(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Statutory Compliance & Clearance Code Strip ── */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40">
            <div className="sm:col-span-8 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#0F5132] dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-bold text-zinc-950 dark:text-white">
                  Official Statutory Receipt &bull; Rent Act, 1963 (Act 220, Section 20)
                </p>
                <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-[11px]">
                  This document serves as conclusive legal proof of rent and security deposit payment under Ghanaian Law. Both tenant and landlord are protected through Akwaaba Homes verified digital tenancy records.
                </p>
              </div>
            </div>

            {checkInCode && (
              <div className="sm:col-span-4 sm:border-l sm:border-emerald-200 dark:sm:border-emerald-800/50 sm:pl-4 flex items-center sm:justify-end gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-600/10 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400 block">
                    Check-In Clearance Code
                  </span>
                  <span className="font-mono text-sm font-black text-zinc-950 dark:text-white tracking-wider">
                    {checkInCode}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Digital Verification Seal & Footer Line ── */}
          <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
            <div className="flex flex-wrap items-center gap-2">
              <span>Folio: <strong className="font-mono text-zinc-900 dark:text-zinc-200">{receiptRef}</strong></span>
              {booking?.id && (
                <>
                  <span>&bull;</span>
                  <span>Booking ID: <strong className="font-mono text-zinc-900 dark:text-zinc-200">{booking.id.slice(0, 12).toUpperCase()}</strong></span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">Akwaaba Homes Verified Ledger &bull; Republic of Ghana</span>
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-receipt,
          #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
