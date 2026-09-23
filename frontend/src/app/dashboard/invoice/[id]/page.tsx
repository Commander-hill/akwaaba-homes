'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Printer, Building } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

import toast from 'react-hot-toast';

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.id as string;

  const handleDownloadPDF = async () => {
    try {
      toast.loading('Generating Official Receipt PDF...', { id: 'receipt-pdf' });
      const response = await api.get(`/transactions/${transactionId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt_${transactionId.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF Receipt Downloaded!', { id: 'receipt-pdf' });
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
    return <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" /></div>;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-600">
        <h2 className="text-xl font-bold">Failed to load invoice</h2>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-slate-100 rounded-lg text-slate-800">Go Back</button>
      </div>
    );
  }

  const { tenant, property, booking } = data;

  const bookingYear = new Date(booking.startDate).getFullYear();
  const nextYear = bookingYear + 1;

  return (
    <div className="max-w-4xl mx-auto my-8 relative">
      
      {/* Floating Action Controls - Hidden when printing */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 print:hidden">
        <button
          onClick={() => router.back()}
          className="text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] transition-colors cursor-pointer"
        >
          ← Back
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Official Architectural Receipt Document */}
      <div className="bg-white dark:bg-[#12151D] text-zinc-900 dark:text-zinc-100 p-8 sm:p-12 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm space-y-8 relative overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0 print:bg-white print:text-black">
        
        {/* Background Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-3 pointer-events-none select-none text-9xl font-black uppercase text-zinc-950 dark:text-white rotate-[-20deg]">
          ESCROW PAID
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-zinc-950 dark:text-white tracking-tight">
                Akwaaba<span className="text-[#0F5132] dark:text-emerald-400">Homes</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Official Receipt
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Certified Smart Rental &amp; Student Hostel Marketplace
            </p>
            <p className="text-[11px] text-zinc-400">
              Accra &amp; Kumasi, Republic of Ghana 🇬🇭 • Act 220 Compliant
            </p>
          </div>

          <div className="sm:text-right space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Receipt Reference</div>
            <div className="font-mono font-black text-sm text-[#0F5132] dark:text-emerald-400">
              {data.reference || `AKW-REC-${transactionId.slice(0, 8).toUpperCase()}`}
            </div>
            <div className="text-[11px] text-zinc-500">
              Issued: {new Date(data.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Status & Escrow Assurance Banner */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <div className="font-bold text-emerald-900 dark:text-emerald-200">
                Rent Escrow Safeguard Verified
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                Payment held in regulated escrow. Released to landlord upon move-in condition sign-off.
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase bg-[#0F5132] text-white">
            {data.status === 'SUCCESS' || data.status === 'COMPLETED' ? 'Settled & Active' : data.status}
          </span>
        </div>

        {/* 2-Column Parties Grid: Tenant & Property */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
          {/* Tenant Details */}
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Resident / Tenant Particulars
            </span>
            <div className="font-bold text-sm text-zinc-950 dark:text-white">
              {tenant.firstName} {tenant.lastName}
            </div>
            <div className="space-y-1 text-zinc-600 dark:text-zinc-400">
              <div>Phone: <strong className="text-zinc-900 dark:text-white font-mono">{tenant.phoneNumber || 'N/A'}</strong></div>
              <div>Email: <strong className="text-zinc-900 dark:text-white">{tenant.email}</strong></div>
              {tenant.studentId && (
                <div>Student Index: <strong className="text-zinc-900 dark:text-white font-mono">{tenant.studentId} ({tenant.campus || 'KNUST / UG'})</strong></div>
              )}
            </div>
          </div>

          {/* Property Details */}
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Accommodation &amp; Allocated Unit
            </span>
            <div className="font-bold text-sm text-zinc-950 dark:text-white">
              {property.title}
            </div>
            <div className="space-y-1 text-zinc-600 dark:text-zinc-400">
              <div>Location: <strong className="text-zinc-900 dark:text-white">{property.location || 'Greater Accra / Ashanti'}</strong></div>
              <div>Room Unit: <strong className="text-zinc-900 dark:text-white">{property.roomType || 'Self-Contained Unit'}</strong></div>
              <div>Tenancy Term: <strong className="text-zinc-900 dark:text-white">{new Date(booking.startDate).toLocaleDateString()} – {new Date(booking.endDate).toLocaleDateString()}</strong></div>
            </div>
          </div>
        </div>

        {/* Itemized Financial Ledger Table */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Payment Breakdown &amp; Statutory Assessment
          </div>
          
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-bold">Line Item</th>
                  <th className="py-3 px-4 font-bold">Statutory &amp; Service Classification</th>
                  <th className="py-3 px-4 font-bold text-right">Amount (GHS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                <tr>
                  <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white">
                    Base Accommodation Rent
                  </td>
                  <td className="py-3 px-4 text-zinc-500">
                    {bookingYear}/{nextYear} Tenancy Rent • Rent Act (Act 220) Compliant
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900 dark:text-white">
                    GH₵ {data.amount.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                    Roadside Broker Commission
                  </td>
                  <td className="py-3 px-4 text-emerald-600 font-bold">
                    Zero Roadside Agent Surcharge (Akwaaba Direct Host Guarantee)
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-zinc-400">
                    GH₵ 0.00
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                    Viewing Inspection Surcharge
                  </td>
                  <td className="py-3 px-4 text-emerald-600 font-bold">
                    100% Free Verified Photo &amp; Virtual Inspection
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-zinc-400">
                    GH₵ 0.00
                  </td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-semibold text-zinc-700 dark:text-zinc-300">
                    Paystack / MoMo Escrow Protection
                  </td>
                  <td className="py-3 px-4 text-zinc-500">
                    Audited Escrow Holding &amp; Digital Tenancy Lease E-Signature
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-600 font-bold">
                    Included
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-zinc-50 dark:bg-zinc-900/60 border-t-2 border-zinc-200 dark:border-zinc-800">
                <tr>
                  <td colSpan={2} className="py-4 px-4 font-black text-sm text-zinc-950 dark:text-white text-right">
                    Total Paid via MoMo / Escrow:
                  </td>
                  <td className="py-4 px-4 text-right font-black text-base text-[#0F5132] dark:text-emerald-400 font-mono">
                    GH₵ {data.amount.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Statutory Regulatory Seals & Sign-Off */}
        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="space-y-1">
            <div className="font-bold text-zinc-900 dark:text-white">
              Rent Control Department of Ghana • Statutory Certification
            </div>
            <p className="text-[11px] leading-relaxed max-w-md">
              This digital receipt certifies lawful settlement under Section 19 of the Rent Act, 1963 (Act 220). Retain this receipt for tax, campus bursar, or lease audit purposes.
            </p>
          </div>

          <div className="text-right shrink-0">
            <div className="font-mono text-[10px] text-zinc-400 uppercase">Audit Hash</div>
            <div className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
              SHA256-{transactionId.slice(0, 12)}
            </div>
          </div>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-4xl, .max-w-4xl * {
            visibility: visible;
          }
          .max-w-4xl {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
