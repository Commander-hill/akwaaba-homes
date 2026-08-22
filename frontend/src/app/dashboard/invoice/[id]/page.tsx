'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Printer, Building } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.id as string;

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
      
      {/* Floating Print Button - Hidden when printing */}
      <div className="absolute -top-12 right-0 print:hidden">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[var(--primary)] text-white px-5 py-2.5 rounded-full font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
        >
          <Printer className="w-5 h-5" /> Print Invoice
        </button>
      </div>

      {/* Invoice Document (White background for printing) */}
      <div className="bg-white text-black p-8 sm:p-12 shadow-sm print:shadow-none border print:border-none rounded-sm">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-[3px] border-[#0a192f] pb-4 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Akwaaba Homes</h1>
            <p className="text-sm font-medium text-gray-700">Digital Accommodations, Ghana</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-[#0a192f] text-white flex items-center justify-center rounded-lg shadow-sm">
              <Building className="w-8 h-8" />
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">info@akwaabahomes.com</p>
            <p className="text-sm font-medium text-gray-700">+233 24 123 4567</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Invoice Valid For: <span className="text-emerald-600">{bookingYear}/{nextYear}</span>
          </h2>
        </div>

        {/* Student Profile Block */}
        <div className="flex flex-col sm:flex-row gap-6 mb-8">
          {/* Avatar Area */}
          <div className="w-40 shrink-0">
            {tenant.avatarUrl ? (
              <img src={tenant.avatarUrl} alt="Student" className="w-full h-auto rounded border border-gray-300 shadow-sm" />
            ) : (
              <div className="w-full aspect-[3/4] bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-400 rounded">
                No Photo
              </div>
            )}
          </div>
          
          {/* Student Details Grid */}
          <div className="flex-1 border border-[#0a192f]">
            <div className="grid grid-cols-2 divide-x divide-[#0a192f]">
              <div className="p-3 border-b border-[#0a192f]">
                <p className="text-xs text-gray-600 font-semibold mb-1">Name</p>
                <p className="text-sm font-bold uppercase">{tenant.firstName} {tenant.lastName}</p>
              </div>
              <div className="p-3 border-b border-[#0a192f]">
                <p className="text-xs text-gray-600 font-semibold mb-1">Mobile Number</p>
                <p className="text-sm font-bold uppercase">{tenant.phoneNumber || 'N/A'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 divide-x divide-[#0a192f]">
              <div className="p-3 border-b border-[#0a192f]">
                <p className="text-xs text-gray-600 font-semibold mb-1">Email</p>
                <p className="text-sm font-bold uppercase">{tenant.email}</p>
              </div>
              <div className="p-3 border-b border-[#0a192f]">
                <p className="text-xs text-gray-600 font-semibold mb-1">Student ID</p>
                <p className="text-sm font-bold uppercase">{tenant.studentId || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-[#0a192f]">
              <div className="p-3 border-b border-[#0a192f]">
                <p className="text-xs text-gray-600 font-semibold mb-1">Level</p>
                <p className="text-sm font-bold uppercase">{tenant.yearOfStudy || 'N/A'}</p>
              </div>
              <div className="p-3 border-b border-[#0a192f]">
                <p className="text-xs text-gray-600 font-semibold mb-1">Course</p>
                <p className="text-sm font-bold uppercase">{tenant.programmeOfStudy || 'N/A'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-[#0a192f]">
              <div className="p-3">
                <p className="text-xs text-gray-600 font-semibold mb-1">Campus</p>
                <p className="text-sm font-bold uppercase">{tenant.campus || 'N/A'}</p>
              </div>
              <div className="p-3 bg-gray-50">
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-b-[3px] border-[#0a192f] mb-4"></div>

        {/* Payment Summary */}
        <div className="flex items-center gap-4 mb-4">
          <span className="font-semibold text-gray-700">Payment Summary</span>
          <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 border border-green-200 rounded-sm shadow-sm uppercase tracking-wider">
            {data.status === 'SUCCESS' ? 'FULLY PAID' : data.status}
          </span>
          <span className="ml-auto font-bold text-gray-900">
            Invoice Number <span className="font-extrabold">{data.reference}</span>
          </span>
        </div>

        {/* Payment Details Grid */}
        <div className="grid grid-cols-4 border border-[#0a192f] divide-x divide-[#0a192f] mb-8">
          <div className="p-3">
            <p className="text-xs text-gray-600 font-semibold mb-1">Amount(GHS)</p>
            <p className="text-sm font-bold">{data.amount.toFixed(2)}</p>
          </div>
          <div className="p-3">
            <p className="text-xs text-gray-600 font-semibold mb-1">Payment Method</p>
            <p className="text-sm font-bold uppercase">PAYSTACK</p>
          </div>
          <div className="p-3">
            <p className="text-xs text-gray-600 font-semibold mb-1">Issued Date</p>
            <p className="text-sm font-bold uppercase">
              {new Date(data.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="p-3">
            <p className="text-xs text-gray-600 font-semibold mb-1">Completion Date</p>
            <p className="text-sm font-bold uppercase">
              {new Date(data.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="border-b-[3px] border-[#0a192f] mb-4"></div>

        {/* Items Table */}
        <div className="w-full mb-12">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#0a192f]">
                <th className="py-3 px-2 font-bold text-gray-900 w-16">#</th>
                <th className="py-3 px-2 font-bold text-gray-900">Title</th>
                <th className="py-3 px-2 font-bold text-gray-900">Description</th>
                <th className="py-3 px-2 font-bold text-gray-900">Amount(GHS)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-4 px-2 font-medium text-gray-700">01</td>
                <td className="py-4 px-2 font-medium text-gray-700">Bed booking</td>
                <td className="py-4 px-2 font-medium text-gray-700">{property.title} - {property.roomType}</td>
                <td className="py-4 px-2 font-medium text-gray-700">{data.amount.toFixed(2)}</td>
              </tr>
              <tr className="bg-gray-50 border-b border-gray-100">
                <td className="py-4 px-2 font-medium text-gray-700">02</td>
                <td className="py-4 px-2 font-medium text-gray-700">JRC Dues</td>
                <td className="py-4 px-2 font-medium text-gray-700">JRC Dues</td>
                <td className="py-4 px-2 font-medium text-gray-700">0.00</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-4 px-2 font-medium text-gray-700">03</td>
                <td className="py-4 px-2 font-medium text-gray-700 uppercase">Software Fees</td>
                <td className="py-4 px-2 font-medium text-gray-700">Software Maintenance Fee</td>
                <td className="py-4 px-2 font-medium text-gray-700">0.00</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="py-4 px-2 font-medium text-gray-700">04</td>
                <td className="py-4 px-2 font-medium text-gray-700 uppercase">Key Deposit Fees</td>
                <td className="py-4 px-2 font-medium text-gray-700">Key Deposit</td>
                <td className="py-4 px-2 font-medium text-gray-700">0.00</td>
              </tr>
              
              {/* Totals Row */}
              <tr className="border-t-[3px] border-[#0a192f]">
                <td colSpan={2}></td>
                <td className="py-4 px-2 font-bold text-gray-900 text-right pr-8">Total Payable Amount</td>
                <td className="py-4 px-2 font-black text-gray-900 text-lg">GH₵{data.amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 mb-4">
          <p className="text-sm font-medium text-gray-600">
            Thank you for choosing <span className="font-bold text-gray-900">Akwaaba Homes!</span>
          </p>
          <p className="text-xs font-medium text-gray-500 mt-1">
            For inquiries, contact us at <span className="font-bold text-gray-800">info@akwaabahomes.com</span> or call <span className="font-bold text-gray-800">+233 24 123 4567</span>.
          </p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          /* This selects the specific document div and makes it visible */
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
