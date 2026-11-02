'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  FileText,
  FileSignature,
  Download,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  Calendar,
  Lock,
  ArrowRight,
  ExternalLink,
  Loader2,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TenantAgreementsPage() {
  const { data: agreementsData, isLoading } = useQuery({
    queryKey: ['tenant-agreements'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/agreements/tenant');
        return data.agreements || [];
      } catch {
        return [];
      }
    },
  });

  const agreements = agreementsData || [];

  const signedCount = agreements.filter(
    (a: any) => a.status === 'COMPLETED' || a.status === 'SIGNED'
  ).length;
  const pendingCount = agreements.filter(
    (a: any) => a.status === 'PENDING_TENANT' || a.status === 'PENDING'
  ).length;

  const handleDownloadPDF = async (bookingId: string) => {
    try {
      toast.loading('Preparing agreement PDF...', { id: 'agreement-pdf' });
      const res = await api.get(`/bookings/${bookingId}/pdf`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `Tenancy_Agreement_${bookingId.slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Agreement PDF downloaded', { id: 'agreement-pdf' });
    } catch {
      toast.error('Unable to download agreement PDF.', { id: 'agreement-pdf' });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
          Documents & Tenancy Agreements
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Review digitally executed Ghanaian tenancy agreements, lease terms, and building house rules.
        </p>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Documents */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Total Legal Agreements</span>
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-950 dark:text-white">{agreements.length}</p>
        </div>

        {/* Signed & Active */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Signed & Sealed</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#16A34A]">{signedCount}</p>
        </div>

        {/* Pending Signature */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Pending Your Signature</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <FileSignature className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
        </div>
      </div>

      {/* ── Agreements List ── */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <FileSignature className="w-4 h-4 text-[#16A34A]" />
          <span>Tenancy Agreements</span>
        </h2>

        {isLoading ? (
          <div className="p-12 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
            <Loader2 className="w-6 h-6 animate-spin text-[#16A34A] mx-auto" />
            <p className="text-xs text-zinc-400">Loading your legal documents...</p>
          </div>
        ) : agreements.length === 0 ? (
          <div className="p-12 text-center space-y-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">No agreements on file</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                When you reserve an accommodation or book a room, your digital tenancy agreement will be generated and made available here.
              </p>
            </div>
            <Link
              href="/properties"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16A34A] text-white text-xs font-bold hover:bg-[#15803D] transition"
            >
              <span>Explore Accommodations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          agreements.map((agreement: any) => {
            const isFullySigned =
              agreement.status === 'COMPLETED' || agreement.status === 'SIGNED';
            const isPendingTenant =
              agreement.status === 'PENDING_TENANT' || agreement.status === 'PENDING';
            const booking = agreement.booking;
            const property = booking?.property;
            const landlord = property?.landlord;

            const startDateStr = booking?.startDate
              ? new Date(booking.startDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '—';
            const endDateStr = booking?.endDate
              ? new Date(booking.endDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '—';

            return (
              <div
                key={agreement.id}
                className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-800 transition space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-zinc-950 dark:text-white leading-tight">
                        {property?.title || 'Residential Tenancy Agreement'}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {property?.location || 'Ghana'} • Landlord:{' '}
                        {landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Property Host'}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        isFullySigned
                          ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/40'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/40'
                      }`}
                    >
                      {isFullySigned ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      <span>{isFullySigned ? 'Legally Executed & Sealed' : 'Awaiting Tenant Signature'}</span>
                    </span>
                  </div>
                </div>

                {/* Agreement Details Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Tenancy Start</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{startDateStr}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Tenancy Expiry</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{endDateStr}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Cryptographic Hash</span>
                    <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300 truncate block">
                      {agreement.cryptographicHash?.slice(0, 16) || 'Pending Execution'}...
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Legal Stamp</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
                      {isFullySigned ? 'SHA-256 Verified' : 'In Draft'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="text-[11px] text-zinc-400">
                    Governed by Ghana Rent Act (Act 220) & Tenancy Regulations.
                  </div>

                  <div className="flex items-center gap-2">
                    {isPendingTenant ? (
                      <Link
                        href={`/dashboard/agreements/${booking?.id || agreement.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <FileSignature className="w-4 h-4" />
                        <span>Review & Sign Agreement</span>
                      </Link>
                    ) : (
                      <>
                        <Link
                          href={`/dashboard/agreements/${booking?.id || agreement.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>View Sealed Agreement</span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(booking?.id || agreement.id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Community Guidelines & Compound Rules ── */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-[#16A34A]" />
          <h3 className="font-bold text-sm text-zinc-950 dark:text-white">
            General Compound Rules & Resident Handbook
          </h3>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          All AkwaabaHomes properties maintain standard compound rules for quiet hours (10:00 PM – 6:00 AM), visitor registration, waste management, and prepaid electricity sub-meter protocols.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <Link
            href="/terms"
            className="text-xs font-bold text-[#16A34A] hover:underline flex items-center gap-1"
          >
            <span>Read Tenancy Code of Conduct</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
