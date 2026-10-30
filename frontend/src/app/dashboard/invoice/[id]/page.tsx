'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Loader2,
  Printer,
  Download,
  ArrowLeft,
  Copy,
  Check,
  FileCheck,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { generateQRCodeSvg } from '@/lib/qr';

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
      link.setAttribute('download', `Transaction_Receipt_${transactionId.slice(0, 8).toUpperCase()}.pdf`);
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
          paymentMethod: isPaid ? 'MoMo' : 'Pending Settlement',
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

  const qrCodeSvg = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const currentUrl = window.location.href;
    return generateQRCodeSvg(currentUrl, 160, '#000000');
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-20 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <p className="text-xs font-semibold text-zinc-500">Loading receipt...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 text-center bg-white dark:bg-[#141816] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mb-3">
          <FileCheck className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-zinc-950 dark:text-white">Receipt Not Found</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
          The requested transaction receipt could not be retrieved.
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
  const dateObj = new Date(data.createdAt);
  const issuedDate = dateObj.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const issuedTime = dateObj.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalAmount = Number(data.amount || 0);
  const rawCaution = Number(booking?.cautionDepositAmount ?? property?.cautionDeposit ?? 0);
  const cautionDeposit = rawCaution > 0 && totalAmount > rawCaution ? rawCaution : 0;
  const baseRent = totalAmount - cautionDeposit;

  const roomTypeLabel = room?.roomType || property?.type || 'Residential Unit';
  const allocationParts = [
    room?.blockName ? `Block ${room.blockName}` : null,
    booking?.roomUnit?.unitNumber ? `Unit ${booking.roomUnit.unitNumber}` : null,
    booking?.bed?.bedNumber ? `Bed ${booking.bed.bedNumber}` : null,
  ].filter(Boolean);
  const unitAllocationLabel =
    allocationParts.length > 0 ? allocationParts.join(' • ') : 'Standard Unit';

  const propertyDetails = `${property?.title || 'Residential Accommodation'}${
    unitAllocationLabel ? ` (${roomTypeLabel} • ${unitAllocationLabel})` : ''
  }`;

  const paymentMethodLabel = data.paymentMethod
    ? data.paymentMethod.includes('MoMo')
      ? 'MoMo'
      : data.paymentMethod
    : 'MoMo';

  const handleCopyRef = () => {
    navigator.clipboard.writeText(receiptRef);
    setCopiedRef(true);
    toast.success('Transaction ID copied');
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto my-6 px-4 sm:px-6 pb-20 font-sans">
      {/* ── Top Toolbar (Hidden when printing) ── */}
      <div className="flex items-center justify-between gap-3 mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#141816] transition cursor-pointer shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
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
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ── Official Receipt Container (Exact format from reference) ── */}
      <div
        id="printable-receipt"
        className="relative bg-white text-zinc-900 border border-zinc-200/90 shadow-sm overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black"
        style={{ borderRadius: '0.75rem' }}
      >
        {/* Top Solid Brand Header Bar */}
        <div className="h-4 w-full bg-[#16A34A] print:bg-[#16A34A]" />

        {/* ── Subtle Background Watermark: Akwaaba Homes Emblem ── */}
        <div
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-0 flex items-center justify-center overflow-hidden z-0"
        >
          <div className="relative w-80 sm:w-96 h-80 sm:h-96 opacity-[0.045] print:opacity-[0.045] grayscale contrast-125 transform -rotate-12">
            <Image
              src="/logo-light.png"
              alt=""
              fill
              sizes="(max-width: 768px) 320px, 384px"
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* ── Receipt Main Body ── */}
        <div className="relative z-10 p-6 sm:p-10 space-y-6">

          {/* 1. Top Merchant Header Card */}
          <div className="border border-zinc-200/90 rounded-xl p-4 sm:p-5 flex items-center gap-4 bg-white">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/80 p-2 flex items-center justify-center shrink-0">
              <Image
                src="/logo-light.png"
                alt="Akwaaba Homes"
                width={48}
                height={48}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="space-y-0.5">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-950 leading-tight">
                Akwaaba Homes
              </h2>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Akwaaba Technologies Ltd, Plot 14 Independence Avenue,<br />
                Airport City / West Ridge, Accra, Ghana
              </p>
            </div>
          </div>

          {/* 2. Document Title Section */}
          <div className="space-y-1 pt-1">
            <h1 className="text-2xl sm:text-[26px] font-black tracking-tight text-zinc-950">
              Transaction receipt
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 font-normal">
              This document serves as a confirmation of your transaction.
            </p>
          </div>

          {/* 3. Section Sub-heading */}
          <div className="pt-2">
            <h3 className="text-xs sm:text-sm font-black text-zinc-950">
              Purchased Tenancy Transaction
            </h3>
          </div>

          {/* 4. Clean Key-Value Table matching reference layout */}
          <div className="border-t border-zinc-200/90 text-xs sm:text-sm">
            {/* Sender's Name */}
            <div className="py-3 px-1 border-b border-zinc-200/90 flex items-center justify-between gap-4">
              <span className="text-zinc-600 font-medium">Sender&apos;s Name</span>
              <span className="font-bold text-zinc-950 text-right">
                {tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Tenant'}
              </span>
            </div>

            {/* Recipient's Number */}
            <div className="py-3 px-1 border-b border-zinc-200/90 flex items-center justify-between gap-4">
              <span className="text-zinc-600 font-medium">Recipient&apos;s Number</span>
              <span className="font-bold text-zinc-950 text-right font-mono">
                {landlord?.phoneNumber ? landlord.phoneNumber.replace(/[^0-9]/g, '') : '233247124268'}
              </span>
            </div>

            {/* Recipient's Name */}
            <div className="py-3 px-1 border-b border-zinc-200/90 flex items-center justify-between gap-4">
              <span className="text-zinc-600 font-medium">Recipient&apos;s Name</span>
              <span className="font-bold text-zinc-950 text-right uppercase">
                {landlord ? `${landlord.firstName} ${landlord.lastName}` : (property?.title || 'AKWAABA HOMES')}
              </span>
            </div>

            {/* Transaction ID */}
            <div className="py-3 px-1 border-b border-zinc-200/90 flex items-center justify-between gap-4">
              <span className="text-zinc-600 font-medium">Transaction ID</span>
              <div className="flex items-center gap-1.5 font-bold text-zinc-950 font-mono text-right">
                <span>{receiptRef}</span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="text-zinc-400 hover:text-zinc-800 transition cursor-pointer print:hidden p-0.5"
                  title="Copy reference"
                >
                  {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="py-3 px-1 border-b border-zinc-200/90 flex items-center justify-between gap-4">
              <span className="text-zinc-600 font-medium">Amount</span>
              <span className="font-bold text-zinc-950 text-right">
                GHS {totalAmount.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Date */}
            <div className="py-3 px-1 border-b border-zinc-200/90 flex items-center justify-between gap-4">
              <span className="text-zinc-600 font-medium">Date</span>
              <span className="font-bold text-zinc-950 text-right">
                {issuedDate}
              </span>
            </div>

            {/* Time */}
            <div className="py-3 px-1 border-b border-zinc-200/90 flex items-center justify-between gap-4">
              <span className="text-zinc-600 font-medium">Time</span>
              <span className="font-bold text-zinc-950 text-right">
                {issuedTime}
              </span>
            </div>

            {/* Payment Method */}
            <div className="py-3 px-1 border-b border-zinc-200/90 flex items-center justify-between gap-4">
              <span className="text-zinc-600 font-medium">Payment Method</span>
              <span className="font-bold text-zinc-950 text-right">
                {paymentMethodLabel}
              </span>
            </div>

            {/* Property / Accommodation */}
            <div className="py-3 px-1 border-b border-zinc-200/90 flex items-center justify-between gap-4">
              <span className="text-zinc-600 font-medium">Accommodation</span>
              <span className="font-bold text-zinc-950 text-right max-w-xs sm:max-w-md">
                {propertyDetails}
              </span>
            </div>
          </div>

          {/* 5. Bottom Card with QR Code matching reference */}
          <div className="mt-8 rounded-2xl bg-zinc-50 border border-zinc-200/70 p-6 sm:p-8 text-center flex flex-col items-center justify-center space-y-2">
            <h4 className="text-xs sm:text-sm font-bold text-zinc-950">
              Download The Akwaaba Homes App
            </h4>
            <p className="text-[11px] sm:text-xs text-zinc-600 max-w-md">
              Scan the QR code to verify this transaction on the official Akwaaba Homes portal.
            </p>

            <div className="pt-3 pb-1">
              <div
                className="w-40 h-40 bg-white p-2 rounded-xl border border-zinc-200/90 shadow-2xs flex items-center justify-center mx-auto"
                dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
              />
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
        }
      `}</style>
    </div>
  );
}
