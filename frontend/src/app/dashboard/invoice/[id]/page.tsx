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
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
            ? `ESCROW-${booking.checkInCode}`
            : `RCP-${booking.id.slice(0, 8).toUpperCase()}`);

        return {
          id: tx?.id || booking.id,
          bookingId: booking.id,
          amount: totalAmount,
          reference: ref,
          paymentReference: ref,
          paymentMethod: isPaid ? 'Paystack Escrow (MoMo / Card)' : 'Pending Settlement',
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
      <div className="flex justify-center p-20">
        <Loader2 className="w-7 h-7 animate-spin text-[#173D32]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 text-center bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-2xl">
        <h2 className="text-lg font-semibold text-[#242925] dark:text-white">Rent Receipt Not Found</h2>
        <p className="text-xs text-[#6F756F] dark:text-[#A0A8A2] mt-1">
          The requested payment receipt could not be retrieved or does not exist.
        </p>
        <button
          onClick={() => router.back()}
          className="mt-5 px-4 py-2 bg-[#173D32] text-white rounded-xl text-xs font-semibold cursor-pointer hover:bg-[#1E4F41] transition"
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
    booking?.bed?.bedNumber ? `Bed ${booking.bed.bedNumber}` : null,
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
    toast.success('Receipt reference copied');
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto my-6 px-4 sm:px-6 pb-20 font-sans">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 print:hidden">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E645E] dark:text-[#A0A8A2] hover:text-[#242925] dark:hover:text-white px-3.5 py-2 rounded-xl border border-[#E7E7DF] dark:border-[#262E29] bg-white dark:bg-[#171C19] transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {booking?.id && (
            <Link
              href={`/dashboard/tenant/bookings/${booking.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#242925] dark:text-white px-3.5 py-2 rounded-xl border border-[#E7E7DF] dark:border-[#262E29] bg-white dark:bg-[#171C19] hover:border-[#173D32] transition"
            >
              View Booking
            </Link>
          )}
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 bg-[#173D32] hover:bg-[#1E4F41] text-white px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 bg-[#242925] hover:bg-[#343B35] dark:bg-white dark:text-[#171C19] dark:hover:bg-zinc-200 text-white px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Receipt Sheet */}
      <div
        id="printable-receipt"
        className="bg-white dark:bg-[#141916] text-[#181C19] dark:text-[#F1F3F1] rounded-2xl border border-[#E4E7E2] dark:border-[#242C27] shadow-xs overflow-hidden print:border-none print:shadow-none print:rounded-none print:bg-white print:text-black"
      >
        {/* Top Brand Accent Bar */}
        <div className="h-1.5 w-full bg-[#173D32]" />

        <div className="p-6 sm:p-10 space-y-8">
          {/* Header Row: Brand & Receipt Meta vs. Status & Total Paid */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-[#E8EBE6] dark:border-[#242C27]">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#173D32] dark:text-emerald-400">
                  AkwaabaHomes
                </span>
                <span className="text-[#C8CEC9] dark:text-[#333D37]">&bull;</span>
                <span className="text-xs font-medium text-[#6F756F] dark:text-[#9CA59E]">
                  Escrow &amp; Rent Settlement
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#181C19] dark:text-white">
                Rent Payment Receipt
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6F756F] dark:text-[#9CA59E] pt-0.5">
                <span className="inline-flex items-center gap-1.5">
                  <span>Receipt No:</span>
                  <strong className="font-mono text-[#181C19] dark:text-white">{receiptRef}</strong>
                  <button
                    type="button"
                    onClick={handleCopyRef}
                    className="text-[#6F756F] hover:text-[#173D32] dark:hover:text-emerald-400 transition print:hidden cursor-pointer"
                    title="Copy reference"
                  >
                    {copiedRef ? (
                      <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </span>
                <span>&bull;</span>
                <span>
                  Issued <strong className="text-[#181C19] dark:text-white">{issuedDate}</strong> at{' '}
                  {issuedTime}
                </span>
              </div>
            </div>

            <div className="sm:text-right space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-[#ECFDF3] text-[#166534] dark:bg-emerald-500/15 dark:text-emerald-300 border border-[#BBF7D0] dark:border-emerald-500/30">
                {isSettled ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] dark:text-emerald-400" />
                    <span>Paid &bull; Escrow Verified</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{data.status}</span>
                  </>
                )}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[#6F756F] dark:text-[#9CA59E]">
                  Amount Paid
                </p>
                <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight text-[#181C19] dark:text-white">
                  {fmtCedis(totalAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* 2-Column Counterparty Grid: Tenant vs. Property & Landlord */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-[#F8F9F7] dark:bg-[#1A201C] border border-[#E8EBE6] dark:border-[#242C27] space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] dark:text-[#9CA59E]">
                <UserCheck className="w-3.5 h-3.5 text-[#173D32] dark:text-emerald-400" />
                <span>Received From (Tenant)</span>
              </div>
              <div className="space-y-0.5 text-xs">
                <p className="text-sm font-semibold text-[#181C19] dark:text-white">
                  {tenant?.firstName} {tenant?.lastName}
                </p>
                {tenant?.email && (
                  <p className="text-[#5E645E] dark:text-[#A0A8A2]">{tenant.email}</p>
                )}
                {tenant?.phoneNumber && (
                  <p className="text-[#5E645E] dark:text-[#A0A8A2]">{tenant.phoneNumber}</p>
                )}
                {(tenant?.studentId || tenant?.campus) && (
                  <p className="text-[#5E645E] dark:text-[#A0A8A2] pt-1 font-medium">
                    {[
                      tenant.studentId ? `Student ID: ${tenant.studentId}` : null,
                      tenant.campus || null,
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F9F7] dark:bg-[#1A201C] border border-[#E8EBE6] dark:border-[#242C27] space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] dark:text-[#9CA59E]">
                <Building2 className="w-3.5 h-3.5 text-[#173D32] dark:text-emerald-400" />
                <span>Property &amp; Landlord</span>
              </div>
              <div className="space-y-0.5 text-xs">
                <p className="text-sm font-semibold text-[#181C19] dark:text-white">
                  {property?.title || 'Residential Property'}
                </p>
                <p className="text-[#5E645E] dark:text-[#A0A8A2]">
                  {property?.location || 'Accra / Kumasi, Ghana'}
                </p>
                {landlord && (
                  <p className="text-[#5E645E] dark:text-[#A0A8A2] pt-1 font-medium">
                    Landlord: {landlord.firstName} {landlord.lastName}
                    {landlord.phoneNumber ? ` (${landlord.phoneNumber})` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 4-Cell Tenancy & Allocation Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#E8EBE6] dark:bg-[#242C27] rounded-xl overflow-hidden border border-[#E8EBE6] dark:border-[#242C27]">
            <div className="bg-white dark:bg-[#141916] p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6F756F] dark:text-[#9CA59E] block">
                Room / Unit Type
              </span>
              <span className="text-xs font-semibold text-[#181C19] dark:text-white mt-1 block truncate">
                {roomTypeLabel}
              </span>
            </div>
            <div className="bg-white dark:bg-[#141916] p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6F756F] dark:text-[#9CA59E] block">
                Assigned Allocation
              </span>
              <span className="text-xs font-semibold text-[#181C19] dark:text-white mt-1 block truncate">
                {unitAllocationLabel}
              </span>
            </div>
            <div className="bg-white dark:bg-[#141916] p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6F756F] dark:text-[#9CA59E] block">
                Tenancy Term
              </span>
              <span className="text-xs font-semibold text-[#181C19] dark:text-white mt-1 block truncate">
                {periodLabel}
              </span>
            </div>
            <div className="bg-white dark:bg-[#141916] p-3.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6F756F] dark:text-[#9CA59E] block">
                Payment Method
              </span>
              <span className="text-xs font-semibold text-[#181C19] dark:text-white mt-1 block truncate">
                {data.paymentMethod || 'Paystack (MoMo / Card)'}
              </span>
            </div>
          </div>

          {/* Line-Item Accounting Table */}
          <div>
            <div className="border border-[#E8EBE6] dark:border-[#242C27] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8F9F7] dark:bg-[#1A201C] border-b border-[#E8EBE6] dark:border-[#242C27] text-[11px] uppercase tracking-wider text-[#6F756F] dark:text-[#9CA59E]">
                    <th className="py-3 px-4 font-semibold">Description</th>
                    <th className="py-3 px-4 font-semibold hidden sm:table-cell">Tenancy Period</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EBE6] dark:divide-[#242C27]">
                  <tr>
                    <td className="py-4 px-4">
                      <p className="font-semibold text-[#181C19] dark:text-white text-xs sm:text-sm">
                        Rent Advance &mdash; {property?.title}
                      </p>
                      <p className="text-[11px] text-[#6F756F] dark:text-[#9CA59E] mt-0.5">
                        {roomTypeLabel} &bull; {unitAllocationLabel}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-[#5E645E] dark:text-[#A0A8A2] hidden sm:table-cell">
                      {periodLabel}
                    </td>
                    <td className="py-4 px-4 text-right font-mono tabular-nums font-semibold text-xs sm:text-sm text-[#181C19] dark:text-white">
                      {fmtCedis(baseRent)}
                    </td>
                  </tr>

                  {cautionDeposit > 0 && (
                    <tr>
                      <td className="py-4 px-4">
                        <p className="font-semibold text-[#181C19] dark:text-white text-xs sm:text-sm">
                          Refundable Security / Caution Deposit
                        </p>
                        <p className="text-[11px] text-[#6F756F] dark:text-[#9CA59E] mt-0.5">
                          Held in escrow against move-out room condition inspection
                        </p>
                      </td>
                      <td className="py-4 px-4 text-[#5E645E] dark:text-[#A0A8A2] hidden sm:table-cell">
                        One-time refundable
                      </td>
                      <td className="py-4 px-4 text-right font-mono tabular-nums font-semibold text-xs sm:text-sm text-[#181C19] dark:text-white">
                        {fmtCedis(cautionDeposit)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Financial Summary Footer */}
              <div className="bg-[#F8F9F7] dark:bg-[#1A201C] border-t border-[#E8EBE6] dark:border-[#242C27] px-4 py-4 flex flex-col items-end space-y-2 text-xs">
                <div className="w-full sm:w-72 flex items-center justify-between text-[#5E645E] dark:text-[#A0A8A2]">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{fmtCedis(totalAmount)}</span>
                </div>
                <div className="w-full sm:w-72 flex items-center justify-between text-[#5E645E] dark:text-[#A0A8A2]">
                  <span>Tenant Service Fee</span>
                  <span className="font-mono tabular-nums">GH₵ 0.00</span>
                </div>
                <div className="w-full sm:w-72 pt-2 border-t border-[#D8DDD6] dark:border-[#2E3832] flex items-center justify-between text-sm font-bold text-[#181C19] dark:text-white">
                  <span>Total Paid</span>
                  <span className="font-mono tabular-nums">{fmtCedis(totalAmount)}</span>
                </div>
                <div className="w-full sm:w-72 flex items-center justify-between text-[11px] font-medium text-[#16A34A] dark:text-emerald-400">
                  <span>Balance Due</span>
                  <span className="font-mono tabular-nums">
                    {isSettled ? 'GH₵ 0.00' : fmtCedis(totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Escrow Protection & Statutory Rent Act Note */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-4 rounded-xl bg-[#F4F7F4] dark:bg-[#19221D] border border-[#DCE5DC] dark:border-[#26352C]">
            <div className="sm:col-span-8 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#173D32] dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-[#181C19] dark:text-white">
                  Escrow Protected &bull; Statutory Rent Receipt (Act 220, s. 20)
                </p>
                <p className="text-[#5E645E] dark:text-[#A0A8A2] leading-relaxed">
                  Issued in compliance with Section 20 of the Rent Act, 1963 (Act 220). Your payment
                  is safeguarded in AkwaabaHomes Escrow on behalf of the Landlord and disbursed upon
                  verified move-in.
                </p>
              </div>
            </div>

            {checkInCode && (
              <div className="sm:col-span-4 sm:border-l sm:border-[#DCE5DC] dark:sm:border-[#26352C] sm:pl-4 flex items-center sm:justify-end gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#173D32]/10 dark:bg-emerald-500/10 text-[#173D32] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#6F756F] dark:text-[#9CA59E] block">
                    Check-In Clearance Code
                  </span>
                  <span className="font-mono text-sm font-bold text-[#181C19] dark:text-white">
                    {checkInCode}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Metadata Line */}
          <div className="pt-4 border-t border-[#E8EBE6] dark:border-[#242C27] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-[#6F756F] dark:text-[#9CA59E]">
            <div>
              Reference: <span className="font-mono text-[#181C19] dark:text-white">{receiptRef}</span>
              {booking?.id && (
                <>
                  {' '}
                  &bull; Booking ID:{' '}
                  <span className="font-mono text-[#181C19] dark:text-white">
                    {booking.id.slice(0, 12).toUpperCase()}
                  </span>
                </>
              )}
            </div>
            <div>AkwaabaHomes &mdash; Verified Rental Marketplace</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
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
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
