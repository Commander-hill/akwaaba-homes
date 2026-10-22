'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Printer, Download, ArrowLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.id as string;

  const handleDownloadPDF = async () => {
    try {
      toast.loading('Preparing Official Rent Receipt PDF...', { id: 'receipt-pdf' });
      const response = await api.get(`/transactions/${transactionId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Official_Rent_Receipt_${transactionId.slice(0, 8).toUpperCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Official Rent Receipt Downloaded', { id: 'receipt-pdf' });
    } catch (err) {
      toast.error('Failed to download PDF receipt.', { id: 'receipt-pdf' });
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: async () => {
      const { data } = await api.get(`/transactions/${transactionId}`);
      return data.transaction;
    },
    enabled: !!transactionId
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 text-center bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Rent Receipt Not Found</h2>
        <p className="text-xs text-zinc-500 mt-1">
          The requested transaction voucher could not be retrieved or does not exist.
        </p>
        <button
          onClick={() => router.back()}
          className="mt-5 px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl text-xs font-bold cursor-pointer"
        >
          Return to Previous Page
        </button>
      </div>
    );
  }

  const { tenant, property, booking } = data;
  const receiptRef = data.reference || `AKW/REC/${new Date(data.createdAt).getFullYear()}/${transactionId.slice(0, 6).toUpperCase()}`;
  const issuedDate = new Date(data.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const startStr = booking?.startDate
    ? new Date(booking.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Commencement Date';
  const endStr = booking?.endDate
    ? new Date(booking.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Expiration Date';
  const bookingYear = booking?.startDate ? new Date(booking.startDate).getFullYear() : new Date().getFullYear();
  const nextYear = bookingYear + 1;
  const isSettled = data.status === 'SUCCESS' || data.status === 'COMPLETED';

  return (
    <div className="max-w-3xl mx-auto my-8 px-4 sm:px-6 pb-20">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Ledger
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Official PDF</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Voucher</span>
          </button>
        </div>
      </div>

      {/* Bond-Paper Statutory Rent Receipt */}
      <div
        id="printable-receipt"
        className="bg-[#FFFDF9] dark:bg-[#13161E] text-zinc-900 dark:text-zinc-100 px-8 py-10 sm:px-14 sm:py-12 border border-zinc-300 dark:border-zinc-800 shadow-sm print:border-none print:shadow-none print:p-0 print:bg-white print:text-black"
        style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
      >
        {/* Classical Letterhead */}
        <div className="border-b-2 border-zinc-900 dark:border-zinc-300 pb-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-zinc-600 dark:text-zinc-400">
                Republic of Ghana
              </p>
              <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-zinc-950 dark:text-white mt-1">
                Official Rent Payment Receipt
              </h1>
              <p className="text-xs italic text-zinc-600 dark:text-zinc-400 mt-1">
                Issued Pursuant to Section 20 of the Rent Act, 1963 (Act 220)
              </p>
            </div>

            <div className="sm:text-right text-xs space-y-1 font-sans">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 uppercase text-[10px] font-bold tracking-wider block">
                  Receipt Voucher No.
                </span>
                <span className="font-mono font-bold text-sm text-zinc-950 dark:text-white">
                  {receiptRef}
                </span>
              </div>
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Date of Issue: <strong className="text-zinc-900 dark:text-zinc-200">{issuedDate}</strong>
              </div>
              <div className="pt-0.5">
                <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-zinc-800 dark:border-zinc-400 text-zinc-900 dark:text-zinc-100">
                  {isSettled ? 'Cleared & Settled' : data.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Formal Acknowledgment Prose */}
        <p className="text-sm leading-relaxed text-justify mb-6">
          RECEIVED with thanks from{' '}
          <strong className="underline decoration-zinc-400 underline-offset-4">
            {tenant?.firstName} {tenant?.lastName}
          </strong>{' '}
          the sum of{' '}
          <strong className="font-mono">
            GH₵ {Number(data.amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </strong>{' '}
          being lawful rent advance and tenancy settlement in respect of the demised residential premises situated at{' '}
          <strong>{property?.location || 'Accra / Kumasi, Republic of Ghana'}</strong> ({property?.title}), for the tenancy period specified in the Schedule below.
        </p>

        {/* Schedule of Particulars (Bordered Table) */}
        <div className="mb-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-700 dark:text-zinc-300 mb-2 font-sans">
            Schedule I — Particulars of Payer &amp; Demised Premises
          </div>
          <div className="border border-zinc-400 dark:border-zinc-700">
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="border-b border-zinc-300 dark:border-zinc-800">
                  <td className="py-2.5 px-3.5 font-bold bg-zinc-100/70 dark:bg-zinc-900/60 w-1/3 border-r border-zinc-300 dark:border-zinc-800 font-sans">
                    Tenant / Payer Full Name
                  </td>
                  <td className="py-2.5 px-3.5 text-zinc-900 dark:text-zinc-100">
                    {tenant?.firstName} {tenant?.lastName}
                    {tenant?.studentId ? ` (Index No.: ${tenant.studentId})` : ''}
                  </td>
                </tr>
                <tr className="border-b border-zinc-300 dark:border-zinc-800">
                  <td className="py-2.5 px-3.5 font-bold bg-zinc-100/70 dark:bg-zinc-900/60 border-r border-zinc-300 dark:border-zinc-800 font-sans">
                    Contact Particulars
                  </td>
                  <td className="py-2.5 px-3.5 text-zinc-900 dark:text-zinc-100 font-sans">
                    {tenant?.phoneNumber || 'Recorded on File'} &bull; {tenant?.email}
                  </td>
                </tr>
                <tr className="border-b border-zinc-300 dark:border-zinc-800">
                  <td className="py-2.5 px-3.5 font-bold bg-zinc-100/70 dark:bg-zinc-900/60 border-r border-zinc-300 dark:border-zinc-800 font-sans">
                    Demised Premises
                  </td>
                  <td className="py-2.5 px-3.5 text-zinc-900 dark:text-zinc-100">
                    {property?.title} — {property?.location || 'Republic of Ghana'}
                  </td>
                </tr>
                <tr className="border-b border-zinc-300 dark:border-zinc-800">
                  <td className="py-2.5 px-3.5 font-bold bg-zinc-100/70 dark:bg-zinc-900/60 border-r border-zinc-300 dark:border-zinc-800 font-sans">
                    Unit / Room Classification
                  </td>
                  <td className="py-2.5 px-3.5 text-zinc-900 dark:text-zinc-100">
                    {property?.roomType || 'Self-Contained Residential Unit'}
                  </td>
                </tr>
                <tr className="border-b border-zinc-300 dark:border-zinc-800">
                  <td className="py-2.5 px-3.5 font-bold bg-zinc-100/70 dark:bg-zinc-900/60 border-r border-zinc-300 dark:border-zinc-800 font-sans">
                    Period of Tenancy Covered
                  </td>
                  <td className="py-2.5 px-3.5 text-zinc-900 dark:text-zinc-100">
                    {startStr} to {endStr} ({bookingYear}/{nextYear} Academic / Residential Term)
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3.5 font-bold bg-zinc-100/70 dark:bg-zinc-900/60 border-r border-zinc-300 dark:border-zinc-800 font-sans">
                    Remittance Instrument
                  </td>
                  <td className="py-2.5 px-3.5 text-zinc-900 dark:text-zinc-100 font-sans">
                    {data.paymentMethod || 'Mobile Money / Bank Settlement'} (Escrow Custodianship Account)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Schedule II — Statement of Account */}
        <div className="mb-8">
          <div className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-700 dark:text-zinc-300 mb-2 font-sans">
            Schedule II — Statement of Account &amp; Rent Assessment
          </div>
          <div className="border border-zinc-400 dark:border-zinc-700">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-400 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900 font-sans">
                  <th className="py-2.5 px-3.5 font-bold w-12 border-r border-zinc-300 dark:border-zinc-800">Item</th>
                  <th className="py-2.5 px-3.5 font-bold border-r border-zinc-300 dark:border-zinc-800">
                    Description of Charge
                  </th>
                  <th className="py-2.5 px-3.5 font-bold text-right w-36">Amount (GH₵)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-300 dark:divide-zinc-800">
                <tr>
                  <td className="py-3 px-3.5 font-mono text-zinc-500 border-r border-zinc-300 dark:border-zinc-800">01</td>
                  <td className="py-3 px-3.5 border-r border-zinc-300 dark:border-zinc-800">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                      Residential Rent Advance ({bookingYear}/{nextYear} Term)
                    </div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                      Principal rent assessment for {property?.title} ({property?.roomType || 'Standard Unit'})
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {Number(data.amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-3.5 font-mono text-zinc-500 border-r border-zinc-300 dark:border-zinc-800">02</td>
                  <td className="py-3 px-3.5 border-r border-zinc-300 dark:border-zinc-800">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                      Agency &amp; Viewing Surcharge
                    </div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                      Direct landlord-to-tenant statutory settlement (No commission levied)
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-right font-mono text-zinc-600 dark:text-zinc-400">
                    0.00
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-900 dark:border-zinc-300 bg-zinc-100/80 dark:bg-zinc-900/90 font-sans">
                  <td colSpan={2} className="py-3.5 px-3.5 font-bold text-right uppercase tracking-wider text-zinc-900 dark:text-white">
                    Total Sum Received (GH₵)
                  </td>
                  <td className="py-3.5 px-3.5 text-right font-mono font-bold text-sm text-zinc-950 dark:text-white">
                    GH₵ {Number(data.amount || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Statutory Note & Collector Sign-off Block */}
        <div className="pt-4 border-t border-zinc-300 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-8 items-end">
          <div className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            <p className="font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200 mb-1 font-sans">
              Statutory Notice (Act 220, s. 20)
            </p>
            <p className="text-justify">
              This receipt constitutes conclusive evidence of rent payment for the period stated herein. Funds remitted under escrow custody are disbursed to the Landlord upon mutual execution of the Move-In Condition Inventory.
            </p>
          </div>

          <div className="sm:text-right space-y-6">
            <div className="inline-block text-left sm:w-64">
              <div className="border-b border-zinc-800 dark:border-zinc-400 pb-1 mb-1.5 font-serif italic text-sm text-zinc-800 dark:text-zinc-200">
                Akwaaba Homes Tenancy Comptroller
              </div>
              <div className="text-[10px] font-sans uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400">
                Authorized Receiving Officer / Bursar
              </div>
              <div className="text-[10px] font-sans text-zinc-500">
                For &amp; on behalf of the Landlord
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Separate Electronic Audit Annex (Outside the physical receipt paper) */}
      <div className="mt-4 px-5 py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#12151D] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-zinc-500 print:hidden">
        <div>
          <strong className="text-zinc-800 dark:text-zinc-200">Ledger Verification:</strong> Recorded in the Akwaaba Homes Tenancy Register under Reference <span className="font-mono text-zinc-700 dark:text-zinc-300">{receiptRef}</span>.
        </div>
        <div className="font-mono text-[10px] text-zinc-400">
          VOUCHER-ID: {transactionId.slice(0, 16).toUpperCase()}
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
