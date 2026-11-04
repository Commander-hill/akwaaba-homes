'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Loader2,
  FileSignature,
  CheckCircle2,
  Printer,
  AlertTriangle,
  XCircle,
  Scale,
  Lock,
  ArrowLeft,
  Download,
  ShieldCheck,
} from 'lucide-react';
import SignaturePad from '@/components/SignaturePad';
import toast from 'react-hot-toast';

/**
 * Formats a date string into traditional Ghanaian legal prose:
 * e.g., "6th day of September, 2026"
 */
function formatLegalOrdinalDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';

  const day = date.getDate();
  const month = date.toLocaleString('en-GB', { month: 'long' });
  const year = date.getFullYear();

  const getOrdinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return `${getOrdinal(day)} day of ${month}, ${year}`;
}

/**
 * Formats a date string into clean British/Ghanaian prose:
 * e.g., "6 September 2026"
 */
function formatStandardLegalDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function AgreementPage() {
  const { id: bookingId } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Fetch agreement details
  const { data, isLoading, error } = useQuery({
    queryKey: ['agreement', bookingId],
    queryFn: async () => {
      const { data } = await api.get(`/agreements/booking/${bookingId}`);
      return data;
    },
  });

  // Fetch current user
  const { data: userResponse } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
  });

  const currentUser = userResponse?.user;

  const signMutation = useMutation({
    mutationFn: async (signature: string) => {
      await api.post(`/agreements/booking/${bookingId}/sign`, { signature });
    },
    onSuccess: () => {
      setShowSignModal(false);
      queryClient.invalidateQueries({ queryKey: ['agreement', bookingId] });
      toast.success('Signature recorded on the Tenancy Agreement.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit signature');
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        <p className="text-xs text-slate-500 font-medium">Loading tenancy agreement...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-2xl bg-white dark:bg-[#16161D] border border-rose-500/20 text-center space-y-4 shadow-xl">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tenancy Agreement Not Found</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          This tenancy contract has not been initialized yet or you do not have access to view it.
        </p>
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold hover:bg-slate-200 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { agreement, landlord } = data;
  const { booking } = agreement;
  const { property, tenant } = booking;

  const isContractTenant = currentUser?.id === tenant?.id;
  const isContractLandlord = currentUser?.id === property?.landlordId || currentUser?.role === 'ADMIN';

  const hasTenantSigned = Boolean(agreement.tenantSignature);
  const hasLandlordSigned = Boolean(agreement.landlordSignature);

  const canSign = (isContractTenant && !hasTenantSigned) || (isContractLandlord && !hasLandlordSigned);
  const isFullySigned = hasTenantSigned && hasLandlordSigned;

  const handleSaveSignature = (base64: string) => {
    setSignatureData(base64);
  };

  const handleConfirmSignature = () => {
    if (!signatureData) {
      toast.error('Please sign inside the signature box first.');
      return;
    }
    signMutation.mutate(signatureData);
  };

  const handleDownloadPDF = async () => {
    try {
      toast.loading('Preparing Tenancy Agreement PDF...', { id: 'pdf' });
      const response = await api.get(`/bookings/${bookingId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Tenancy_Agreement_${(bookingId as string).slice(0, 8).toUpperCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Tenancy Agreement PDF downloaded.', { id: 'pdf' });
    } catch (err) {
      toast.error('Failed to download PDF document.', { id: 'pdf' });
    }
  };

  const docRef = `AKW/${new Date(agreement.createdAt).getFullYear()}/${agreement.id.slice(0, 8).toUpperCase()}`;
  const cryptographicDigest = agreement.cryptographicHash || `${agreement.id.replace(/-/g, '')}7b9e4a`;
  const landlordFullName = `${landlord.firstName} ${landlord.lastName}`;
  const tenantFullName = `${tenant.firstName} ${tenant.lastName}`;
  const unitDescription = booking.room?.roomType || 'Self-Contained Residential Unit';

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      {/* ── ACTION HEADER (HIDDEN WHEN PRINTING) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white mb-2 transition-colors font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Tenancies
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Tenancy Agreement
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold tracking-wide ${
                isFullySigned
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50'
                  : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50'
              }`}
            >
              {isFullySigned ? 'Executed by Both Parties' : 'Awaiting Execution'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Reference No. <span className="font-mono text-slate-700 dark:text-slate-300">{docRef}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>

          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </button>

          {canSign && (
            <button
              onClick={() => setShowSignModal(true)}
              className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>Sign Agreement</span>
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          THE 4-PAGE PHYSICAL LEGAL INSTRUMENT (GHANAIAN CONVEYANCING DEED)
         ══════════════════════════════════════════════════════════════════════════ */}
      <div className="space-y-8 print:space-y-0">
        {/* ── SHEET 1 OF 4: RECITALS, PARTIES, SCHEDULE 1 & GRANT OF TENANCY ── */}
        <article
          className="bg-[#FCFBF9] text-[#1A1A18] rounded-xs px-7 py-10 sm:px-14 sm:py-14 shadow-[0_10px_35px_rgba(15,23,42,0.08)] border border-[#DED8CE] relative print:shadow-none print:border-none print:p-8 print:break-after-page overflow-hidden min-h-[960px] flex flex-col justify-between"
          style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
        >
          {/* Centered Akwaaba Watermark Logo */}
          <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0 opacity-[0.16] print:opacity-[0.18]">
            <div className="w-80 sm:w-96 h-80 sm:h-96 relative">
              <Image
                src="/logo-light.png"
                alt="Akwaaba Homes Watermark"
                fill
                priority
                className="object-contain"
              />
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            {/* Top Metadata Folio Line */}
            <div className="flex items-center justify-between text-[11px] text-[#57534E] pb-3 border-b border-[#D6D0C4] tracking-wide">
              <span>INSTRUMENT REF: {docRef}</span>
              <span>REPUBLIC OF GHANA</span>
            </div>

            {/* Formal Conveyancing Title Header */}
            <header className="text-center py-4 border-b-2 border-double border-[#1A1A18] space-y-2">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div className="w-16 h-14 relative">
                  <Image
                    src="/images/agreements/coat-of-arms.png"
                    alt="Republic of Ghana Coat of Arms"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="w-[1.5px] h-10 bg-[#C8A24A]" />
                <div className="w-16 h-14 relative">
                  <Image
                    src="/logo-light.png"
                    alt="Akwaaba Homes"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
              <p className="text-xs uppercase tracking-[0.25em] text-[#44403C] font-semibold">
                Republic of Ghana
              </p>
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-[0.12em] text-[#111110]">
                Residential Tenancy Agreement
              </h2>
              <p className="text-[11px] italic text-[#57534E] pt-0.5">
                Made pursuant to the Rent Act, 1963 (Act 220), Conveyancing Act, 1973 (NRCD 175) and Electronic Transactions Act, 2008 (Act 772)
              </p>
            </header>

            {/* Opening Recital & Parties */}
            <div className="space-y-4 text-[13px] sm:text-[13.5px] leading-[1.8] text-[#1C1917] text-justify">
              <p>
                <strong>THIS RESIDENTIAL TENANCY AGREEMENT</strong> is made the{' '}
                <strong>{formatLegalOrdinalDate(agreement.createdAt)}</strong>{' '}
                <strong>BETWEEN</strong>{' '}
                <strong className="uppercase">{landlordFullName}</strong> (Telephone:{' '}
                {landlord.phoneNumber || 'on file'}) of the Republic of Ghana, hereinafter referred to as{' '}
                <strong>&ldquo;the Landlord&rdquo;</strong> (which expression shall, where the context so admits, include
                the Landlord&rsquo;s heirs, personal representatives, successors-in-title, and assigns) of the one part;
              </p>

              <p>
                <strong>AND</strong>{' '}
                <strong className="uppercase">{tenantFullName}</strong> (Telephone:{' '}
                {tenant.phoneNumber || 'on file'}; Electronic Mail: {tenant.email}), hereinafter referred to as{' '}
                <strong>&ldquo;the Tenant&rdquo;</strong> (which expression shall, where the context so admits, include
                the Tenant&rsquo;s personal representatives and permitted assigns) of the other part.
              </p>

              {/* Recitals (WHEREAS) */}
              <div className="space-y-2 pt-1">
                <p><strong>WHEREAS:</strong></p>
                <ol className="list-[upper-roman] pl-6 space-y-1.5 text-[12.5px] sm:text-[13px]">
                  <li>
                    The Landlord is the lawful owner or registered lessor of the residential property known as{' '}
                    <strong>{property.title}</strong>, situated at <strong>{property.location}</strong> in the Republic of
                    Ghana (hereinafter referred to as <strong>&ldquo;the Premises&rdquo;</strong>).
                  </li>
                  <li>
                    The Landlord has agreed to let and the Tenant has agreed to take the Premises for private residential
                    purposes at the agreed rent and upon the covenants and conditions hereinafter contained.
                  </li>
                  <li>
                    The parties intend that this Agreement shall take effect as a binding legal tenancy under the laws of the Republic of Ghana, incorporating statutory tenant protections under the Rent Act, 1963 (Act 220).
                  </li>
                </ol>
              </div>

              <p className="pt-1 font-bold uppercase tracking-wide text-[12.5px] text-[#111110]">
                NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:
              </p>

              {/* Schedule 1 of Tenancy Particulars */}
              <div className="my-3">
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#1C1917] mb-1.5">
                  Schedule 1: Schedule of Tenancy Particulars
                </div>
                <table className="w-full border-collapse border border-[#A8A29E] text-[12px] sm:text-[12.5px] text-left">
                  <tbody>
                    <tr className="border-b border-[#A8A29E]">
                      <th className="py-2 px-3 bg-[#F5F2EB] font-bold text-[#292524] w-2/5 border-r border-[#A8A29E]">
                        1. Description &amp; Location of Premises
                      </th>
                      <td className="py-2 px-3 text-[#1C1917]">
                        <strong>{property.title}</strong>, situated at {property.location}
                      </td>
                    </tr>
                    <tr className="border-b border-[#A8A29E]">
                      <th className="py-2 px-3 bg-[#F5F2EB] font-bold text-[#292524] border-r border-[#A8A29E]">
                        2. Unit / Accommodation Category
                      </th>
                      <td className="py-2 px-3 text-[#1C1917]">{unitDescription}</td>
                    </tr>
                    <tr className="border-b border-[#A8A29E]">
                      <th className="py-2 px-3 bg-[#F5F2EB] font-bold text-[#292524] border-r border-[#A8A29E]">
                        3. Term of Tenancy
                      </th>
                      <td className="py-2 px-3 text-[#1C1917]">
                        From <strong>{formatStandardLegalDate(booking.startDate)}</strong> to{' '}
                        <strong>{formatStandardLegalDate(booking.endDate)}</strong>
                      </td>
                    </tr>
                    <tr className="border-b border-[#A8A29E]">
                      <th className="py-2 px-3 bg-[#F5F2EB] font-bold text-[#292524] border-r border-[#A8A29E]">
                        4. Agreed Rent for the Term
                      </th>
                      <td className="py-2 px-3 text-[#1C1917]">
                        <strong>GHS {Number(property.price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</strong>{' '}
                        (Ghana Cedis)
                      </td>
                    </tr>
                    <tr>
                      <th className="py-2 px-3 bg-[#F5F2EB] font-bold text-[#292524] border-r border-[#A8A29E]">
                        5. Permitted Use
                      </th>
                      <td className="py-2 px-3 text-[#1C1917]">Private Residential Occupation Only</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Clause 1: Grant of Tenancy */}
              <div className="space-y-1.5 pt-1">
                <h4 className="font-bold text-[13px] uppercase tracking-wider text-[#111110]">
                  1. Grant of Tenancy and Term
                </h4>
                <p className="text-[12.5px] sm:text-[13px]">
                  <strong>1.1.</strong> In consideration of the rent hereby reserved and the covenants on the part of the Tenant hereinafter
                  contained, the Landlord hereby lets unto the Tenant the Premises described in Schedule 1 hereto, TO HOLD
                  the same unto the Tenant from <strong>{formatStandardLegalDate(booking.startDate)}</strong> until{' '}
                  <strong>{formatStandardLegalDate(booking.endDate)}</strong>, unless earlier determined in accordance with
                  the provisions of this Agreement or the Rent Act, 1963 (Act 220).
                </p>
                <p className="text-[12.5px] sm:text-[13px]">
                  <strong>1.2.</strong> The Tenant shall have exclusive possession and peaceful enjoyment of the designated residential unit during the subsistence of this tenancy, subject strictly to the terms and covenants herein agreed.
                </p>
              </div>
            </div>
          </div>

          {/* Page 1 Footer */}
          <div className="relative z-10 pt-6 mt-6 border-t border-[#D6D0C4] flex items-center justify-between text-[11px] text-[#57534E]">
            <span>Tenancy Agreement ({docRef})</span>
            <span className="font-semibold text-[#292524]">Page 1 of 4</span>
          </div>
        </article>

        {/* ── SHEET 2 OF 4: RENT ADVANCE, TENANT & LANDLORD COVENANTS ── */}
        <article
          className="bg-[#FCFBF9] text-[#1A1A18] rounded-xs px-7 py-10 sm:px-14 sm:py-14 shadow-[0_10px_35px_rgba(15,23,42,0.08)] border border-[#DED8CE] relative print:shadow-none print:border-none print:p-8 print:break-after-page overflow-hidden min-h-[960px] flex flex-col justify-between"
          style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
        >
          {/* Centered Akwaaba Watermark Logo */}
          <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0 opacity-[0.16] print:opacity-[0.18]">
            <div className="w-80 sm:w-96 h-80 sm:h-96 relative">
              <Image
                src="/logo-light.png"
                alt="Akwaaba Homes Watermark"
                fill
                className="object-contain"
              />
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            {/* Continuation Header */}
            <div className="flex items-center justify-between text-[11px] text-[#57534E] pb-3 border-b border-[#D6D0C4] tracking-wide">
              <span>INSTRUMENT REF: {docRef}</span>
              <span className="uppercase font-semibold tracking-wider">Part II — Rent, Statutory Advance &amp; Covenants</span>
            </div>

            <div className="space-y-5 text-[12.5px] sm:text-[13px] leading-[1.8] text-[#1C1917] text-justify">
              {/* Clause 2: Rent & Payment */}
              <div className="space-y-2">
                <h4 className="font-bold text-[13px] uppercase tracking-wider text-[#111110]">
                  2. Rent, Statutory Advance &amp; Official Receipts
                </h4>
                <p>
                  <strong>2.1. Reserved Rent:</strong> The rent reserved for the tenancy is{' '}
                  <strong>GHS {Number(property.price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</strong>, paid
                  by the Tenant through the designated electronic settlement platform on behalf of the Landlord.
                </p>
                <p>
                  <strong>2.2. Statutory Advance Compliance:</strong> In strict accordance with Section 25(5) of the Rent Act, 1963 (Act 220), the Landlord shall not demand, receive, or require payment of rent advance exceeding statutory limits.
                </p>
                <p>
                  <strong>2.3. Official Receipts:</strong> In accordance with Section 20 of the Rent Act, 1963 (Act 220), every payment of rent
                  made under this Agreement shall be acknowledged by an official written or electronic rent receipt issued
                  to the Tenant stating the payment date, period covered, and exact sum received.
                </p>
                <p>
                  <strong>2.4. Rent Stability:</strong> Pursuant to Section 19 of the Rent Act, 1963 (Act 220), the Landlord shall not unilaterally increase the rent during the subsistence of this tenancy term without prior assessment by the Rent Control Division or mutual written addendum.
                </p>
              </div>

              {/* Clause 3: Tenant's Covenants */}
              <div className="space-y-2">
                <h4 className="font-bold text-[13px] uppercase tracking-wider text-[#111110]">
                  3. Tenant&rsquo;s Covenants
                </h4>
                <p>The Tenant hereby covenants with the Landlord as follows:</p>
                <div className="pl-4 sm:pl-5 space-y-1.5 text-[12px] sm:text-[12.5px]">
                  <p>
                    <strong>3.1. Punctual Payment of Rent:</strong> To pay the reserved rent punctually as stipulated in Schedule 1 without any unlawful set-off, deduction, or delay.
                  </p>
                  <p>
                    <strong>3.2. Care of Interior &amp; Fixtures:</strong> To keep the interior of the Premises, including doors, locks, glazing, sanitary installations, and electrical fittings in clean and tenantable repair (fair wear and tear excepted).
                  </p>
                  <p>
                    <strong>3.3. Alterations:</strong> Not to make structural alterations, additions, or changes to external locks without the prior written consent of the Landlord.
                  </p>
                  <p>
                    <strong>3.4. Absolute Prohibition on Subletting:</strong> Not to assign, underlet, or part with possession of the Premises or any room therein to any third party without express written permission of the Landlord (Section 22 of Act 220).
                  </p>
                  <p>
                    <strong>3.5. Good Neighbourliness &amp; Lawful Use:</strong> Not to cause nuisance, annoyance, or offensive disturbance to neighbours, nor use the Premises for any illegal, commercial, or immoral activity.
                  </p>
                  <p>
                    <strong>3.6. Right of Inspection on Prior Notice:</strong> To permit the Landlord or authorized agents, upon at least twenty-four (24) hours&rsquo; prior notice, to enter at reasonable daytime hours to examine the state of repair.
                  </p>
                  <p>
                    <strong>3.7. Surrender of Possession:</strong> Peaceably to yield up the Premises with all keys and Landlord&rsquo;s fixtures in good tenantable order at the determination of the tenancy.
                  </p>
                </div>
              </div>

              {/* Clause 4: Landlord's Covenants */}
              <div className="space-y-2">
                <h4 className="font-bold text-[13px] uppercase tracking-wider text-[#111110]">
                  4. Landlord&rsquo;s Covenants
                </h4>
                <p>The Landlord hereby covenants with the Tenant as follows:</p>
                <div className="pl-4 sm:pl-5 space-y-1.5 text-[12px] sm:text-[12.5px]">
                  <p>
                    <strong>4.1. Quiet Enjoyment:</strong> That the Tenant, paying rent and observing covenants, shall peaceably and quietly hold and enjoy the Premises without unlawful interruption or harassment by the Landlord.
                  </p>
                  <p>
                    <strong>4.2. Structural Repairs:</strong> To keep the roof, foundation, main walls, external drainage, and primary plumbing and electrical distribution infrastructure in good structural order.
                  </p>
                  <p>
                    <strong>4.3. Rates &amp; Ground Taxes:</strong> To punctually pay all property rates, municipal tenement assessments, and statutory ground rents assessed against the Premises.
                  </p>
                  <p>
                    <strong>4.4. Prohibition of Self-Help Evictions:</strong> Not to lock out the Tenant, disconnect essential electricity or water supplies, or remove doors or roofing, adhering strictly to the Rent Act, 1963 (Act 220).
                  </p>
                  <p>
                    <strong>4.5. Prompt Remediation of Safety Hazards:</strong> To remediate within reasonable notice any structural defect or hazard jeopardizing safety, sanitary fitness, or structural integrity.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Page 2 Footer */}
          <div className="relative z-10 pt-6 mt-6 border-t border-[#D6D0C4] flex items-center justify-between text-[11px] text-[#57534E]">
            <span>Tenancy Agreement ({docRef})</span>
            <span className="font-semibold text-[#292524]">Page 2 of 4</span>
          </div>
        </article>

        {/* ── SHEET 3 OF 4: CAUTION DEPOSIT, UTILITIES, HOUSE RULES & NOTICE ── */}
        <article
          className="bg-[#FCFBF9] text-[#1A1A18] rounded-xs px-7 py-10 sm:px-14 sm:py-14 shadow-[0_10px_35px_rgba(15,23,42,0.08)] border border-[#DED8CE] relative print:shadow-none print:border-none print:p-8 print:break-after-page overflow-hidden min-h-[960px] flex flex-col justify-between"
          style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
        >
          {/* Centered Akwaaba Watermark Logo */}
          <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0 opacity-[0.16] print:opacity-[0.18]">
            <div className="w-80 sm:w-96 h-80 sm:h-96 relative">
              <Image
                src="/logo-light.png"
                alt="Akwaaba Homes Watermark"
                fill
                className="object-contain"
              />
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            {/* Continuation Header */}
            <div className="flex items-center justify-between text-[11px] text-[#57534E] pb-3 border-b border-[#D6D0C4] tracking-wide">
              <span>INSTRUMENT REF: {docRef}</span>
              <span className="uppercase font-semibold tracking-wider">Part III — Deposit, Utilities &amp; Property Governance</span>
            </div>

            <div className="space-y-5 text-[12.5px] sm:text-[13px] leading-[1.8] text-[#1C1917] text-justify">
              {/* Clause 5: Caution Deposit Escrow */}
              <div className="space-y-2">
                <h4 className="font-bold text-[13px] uppercase tracking-wider text-[#111110]">
                  5. Caution Deposit Escrow and Refund Protocol
                </h4>
                <p>
                  <strong>5.1. Security Escrow:</strong> Any caution or security deposit deposited by the Tenant shall be held in secure escrow solely as security for the faithful performance of the Tenant&rsquo;s covenants and shall under no circumstance be treated as rent.
                </p>
                <p>
                  <strong>5.2. Mandatory 14-Day Refund:</strong> Upon the determination of the tenancy and completion of the joint exit inspection, the caution deposit shall be refunded to the Tenant within fourteen (14) calendar days.
                </p>
                <p>
                  <strong>5.3. Legitimate Deductions:</strong> Deductions from the caution deposit are strictly restricted to verified, itemized expenses incurred to rectify physical damage caused by the Tenant beyond fair wear and tear, or to settle certified outstanding utility bills attributable to the Tenant&rsquo;s occupancy.
                </p>
              </div>

              {/* Clause 6: Utilities, Sub-Meters & Services */}
              <div className="space-y-2">
                <h4 className="font-bold text-[13px] uppercase tracking-wider text-[#111110]">
                  6. Utilities, Sub-Meters and Essential Services
                </h4>
                <p>
                  <strong>6.1. Electricity Sub-Metering:</strong> The Tenant shall be responsible for purchasing ECG electricity recharge tokens for the dedicated prepaid sub-meter allocated to the Premises and shall operate all appliances safely without overloading circuits.
                </p>
                <p>
                  <strong>6.2. Water Supply &amp; Sanitation:</strong> The Landlord shall maintain functional connectivity to the Ghana Water Company Limited (GWCL) mains or auxiliary borehole water storage tanks. The Tenant shall practice water conservation and promptly notify the Landlord of any plumbing leaks or pressure anomalies.
                </p>
                <p>
                  <strong>6.3. Waste Management:</strong> The Tenant shall bag and deposit domestic refuse into designated municipal collection bins and maintain clean sanitary conditions within the unit and adjoining corridors.
                </p>
              </div>

              {/* Clause 7: Residence & Compound Regulations */}
              <div className="space-y-2">
                <h4 className="font-bold text-[13px] uppercase tracking-wider text-[#111110]">
                  7. Residence and Compound Regulations
                </h4>
                <p>
                  <strong>7.1. Security and Access:</strong> Main compound gates shall be secured at designated hours. Tenants and their visitors shall observe security protocols. Overnight guests exceeding three (3) consecutive nights require advance notification to the property manager.
                </p>
                <p>
                  <strong>7.2. Fire and Environmental Safety:</strong> No open coal pot cooking, kerosene heaters, or storage of volatile petroleum fuel shall be permitted within residential quarters. Smoke alarms and fire extinguishers on site must remain unobstructed.
                </p>
                <p>
                  <strong>7.3. Student Accommodation Provisions:</strong> Where the Premises is designated as student housing, tenancy is granted subject to active matriculation at an accredited tertiary institution. Quiet hours shall be observed from 10:00 PM to 6:00 AM daily.
                </p>
              </div>

              {/* Clause 8: Determination & Notice to Quit */}
              <div className="space-y-2">
                <h4 className="font-bold text-[13px] uppercase tracking-wider text-[#111110]">
                  8. Determination of Tenancy and Notice to Quit
                </h4>
                <p>
                  <strong>8.1. Statutory Notice:</strong> Either party intending not to renew or wishing to determine this tenancy shall serve written notice of not less than one (1) calendar month in the case of a monthly tenancy, or not less than three (3) calendar months in the case of an annual tenancy.
                </p>
                <p>
                  <strong>8.2. Default and Forfeiture:</strong> If the reserved rent remains unpaid for thirty (30) days after becoming due, or if the Tenant persistently breaches any covenant herein, the Landlord may initiate statutory recovery of possession proceedings pursuant to the Rent Act, 1963 (Act 220).
                </p>
                <p>
                  <strong>8.3. Move-Out Clearance:</strong> Upon vacating the Premises, the Tenant shall hand over all sets of keys, settle final utility readings, and participate in a final joint exit condition assessment.
                </p>
              </div>
            </div>
          </div>

          {/* Page 3 Footer */}
          <div className="relative z-10 pt-6 mt-6 border-t border-[#D6D0C4] flex items-center justify-between text-[11px] text-[#57534E]">
            <span>Tenancy Agreement ({docRef})</span>
            <span className="font-semibold text-[#292524]">Page 3 of 4</span>
          </div>
        </article>

        {/* ── SHEET 4 OF 4: DISPUTE RESOLUTION, INVENTORY & EXECUTION BLOCK ── */}
        <article
          className="bg-[#FCFBF9] text-[#1A1A18] rounded-xs px-7 py-10 sm:px-14 sm:py-14 shadow-[0_10px_35px_rgba(15,23,42,0.08)] border border-[#DED8CE] relative print:shadow-none print:border-none print:p-8 overflow-hidden min-h-[960px] flex flex-col justify-between"
          style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
        >
          {/* Centered Akwaaba Watermark Logo */}
          <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0 opacity-[0.16] print:opacity-[0.18]">
            <div className="w-80 sm:w-96 h-80 sm:h-96 relative">
              <Image
                src="/logo-light.png"
                alt="Akwaaba Homes Watermark"
                fill
                className="object-contain"
              />
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            {/* Continuation Header */}
            <div className="flex items-center justify-between text-[11px] text-[#57534E] pb-3 border-b border-[#D6D0C4] tracking-wide">
              <span>INSTRUMENT REF: {docRef}</span>
              <span className="uppercase font-semibold tracking-wider">Part IV — Dispute Resolution, Inventory &amp; Execution</span>
            </div>

            <div className="space-y-5 text-[12.5px] sm:text-[13px] leading-[1.8] text-[#1C1917] text-justify">
              {/* Clause 9: Dispute Resolution */}
              <div className="space-y-2">
                <h4 className="font-bold text-[13px] uppercase tracking-wider text-[#111110]">
                  9. Dispute Resolution and Rent Control Conciliation
                </h4>
                <p>
                  <strong>9.1. Amicable Conciliation:</strong> Any dispute, claim, or difference arising out of this Agreement shall in the first instance be submitted to good-faith mediation between the parties or through the Akwaaba Homes dispute conciliation system within fourteen (14) days.
                </p>
                <p>
                  <strong>9.2. Statutory Referral:</strong> In default of amicable settlement, the dispute shall be referred to the Rent Control Officer or District Rent Magistrate having jurisdiction over the Premises under the Rent Act, 1963 (Act 220).
                </p>
                <p>
                  <strong>9.3. Governing Law:</strong> This Agreement shall be governed by, construed, and enforced in accordance with the substantive laws of the Republic of Ghana.
                </p>
              </div>

              {/* Clause 10: Electronic Execution */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-[13px] uppercase tracking-wider text-[#111110]">
                  10. Electronic Execution and Statutory Validity
                </h4>
                <p className="text-[12px] sm:text-[12.5px]">
                  This Agreement is executed electronically pursuant to Section 10 of the Electronic Transactions Act, 2008 (Act 772). The parties expressly agree that digital signatures, electronic consent timestamps, and cryptographic SHA-256 hashes constitute conclusive proof of authentic execution and legal enforceability.
                </p>
              </div>

              {/* Schedule 2: Fixtures & Inventory */}
              <div className="my-2">
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#1C1917] mb-1.5">
                  Schedule 2: Schedule of Fixtures &amp; Move-In Inventory Record
                </div>
                <table className="w-full border-collapse border border-[#A8A29E] text-[11.5px] sm:text-[12px] text-left">
                  <tbody>
                    <tr className="border-b border-[#A8A29E]">
                      <th className="py-1.5 px-3 bg-[#F5F2EB] font-bold text-[#292524] w-2/5 border-r border-[#A8A29E]">
                        1. Keys &amp; Access Control
                      </th>
                      <td className="py-1.5 px-3 text-[#1C1917]">
                        Main entrance key, room key, deadbolt, security gate remote/key (Complete &amp; functional)
                      </td>
                    </tr>
                    <tr className="border-b border-[#A8A29E]">
                      <th className="py-1.5 px-3 bg-[#F5F2EB] font-bold text-[#292524] border-r border-[#A8A29E]">
                        2. Electrical Fittings
                      </th>
                      <td className="py-1.5 px-3 text-[#1C1917]">
                        Ceiling lighting points, wall sockets, light switches, dedicated ECG sub-meter (Inspected &amp; working)
                      </td>
                    </tr>
                    <tr className="border-b border-[#A8A29E]">
                      <th className="py-1.5 px-3 bg-[#F5F2EB] font-bold text-[#292524] border-r border-[#A8A29E]">
                        3. Sanitary Installations
                      </th>
                      <td className="py-1.5 px-3 text-[#1C1917]">
                        Water closet, wash basin, taps, shower rose, drain traps, mirrors (Clean &amp; leak-free)
                      </td>
                    </tr>
                    <tr className="border-b border-[#A8A29E]">
                      <th className="py-1.5 px-3 bg-[#F5F2EB] font-bold text-[#292524] border-r border-[#A8A29E]">
                        4. Structural &amp; Joinery
                      </th>
                      <td className="py-1.5 px-3 text-[#1C1917]">
                        Doors, glazed windows, secure latches, interior paint surfaces, wardrobes (Good condition)
                      </td>
                    </tr>
                    <tr>
                      <th className="py-1.5 px-3 bg-[#F5F2EB] font-bold text-[#292524] border-r border-[#A8A29E]">
                        5. Compound Amenities
                      </th>
                      <td className="py-1.5 px-3 text-[#1C1917]">
                        Compound perimeter lighting, refuse bin allocation, water storage overhead tank connection
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Testimonium Clause */}
              <div className="pt-2">
                <p className="text-[#1C1917] font-semibold text-[12.5px]">
                  IN WITNESS WHEREOF the Landlord and the Tenant have hereunto executed this Indenture under their respective hands or electronic signatures the day, month, and year first above written.
                </p>
              </div>

              {/* Two-Column Solicitor Execution Block */}
              <div className="grid sm:grid-cols-2 gap-10 pt-4 mt-2 border-t border-[#A8A29E] text-left">
                {/* Landlord Execution Column */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#292524]">
                    SIGNED by the within-named LANDLORD:
                  </p>

                  <div className="h-20 flex items-end justify-start border-b border-[#1C1917] pb-1 px-1">
                    {agreement.landlordSignature ? (
                      <img
                        src={agreement.landlordSignature}
                        alt="Landlord Signature"
                        className="max-h-16 object-contain mix-blend-multiply contrast-125 brightness-105"
                      />
                    ) : (
                      <span className="text-xs italic text-[#78716C] pb-2">
                        [ Awaiting Landlord&rsquo;s Signature ]
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 text-[12px] pt-1">
                    <p>
                      <span className="text-[#57534E]">Name:</span>{' '}
                      <strong className="uppercase">{landlordFullName}</strong>
                    </p>
                    <p>
                      <span className="text-[#57534E]">Capacity:</span> Landlord / Lessor
                    </p>
                    <p>
                      <span className="text-[#57534E]">Date Signed:</span>{' '}
                      {agreement.landlordSignedAt
                        ? formatStandardLegalDate(agreement.landlordSignedAt)
                        : 'Pending execution'}
                    </p>
                  </div>
                </div>

                {/* Tenant Execution Column */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#292524]">
                    SIGNED by the within-named TENANT:
                  </p>

                  <div className="h-20 flex items-end justify-start border-b border-[#1C1917] pb-1 px-1">
                    {agreement.tenantSignature ? (
                      <img
                        src={agreement.tenantSignature}
                        alt="Tenant Signature"
                        className="max-h-16 object-contain mix-blend-multiply contrast-125 brightness-105"
                      />
                    ) : (
                      <span className="text-xs italic text-[#78716C] pb-2">
                        [ Awaiting Tenant&rsquo;s Signature ]
                      </span>
                    )}
                  </div>

                  <div className="space-y-0.5 text-[12px] pt-1">
                    <p>
                      <span className="text-[#57534E]">Name:</span>{' '}
                      <strong className="uppercase">{tenantFullName}</strong>
                    </p>
                    <p>
                      <span className="text-[#57534E]">Capacity:</span> Tenant / Lessee
                    </p>
                    <p>
                      <span className="text-[#57534E]">Date Signed:</span>{' '}
                      {agreement.tenantSignedAt
                        ? formatStandardLegalDate(agreement.tenantSignedAt)
                        : 'Pending execution'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cryptographic SHA-256 Box */}
              <div className="p-3 bg-[#FAF8F3] border border-[#D6D0C4] rounded-sm text-[11px] text-[#57534E] space-y-1">
                <div className="font-bold text-[#0F5132] uppercase tracking-wide text-[10.5px]">
                  Digitally Authenticated Legal Record • Electronic Transactions Act, 2008 (Act 772)
                </div>
                <div className="text-[10px] text-slate-500 font-mono break-all">
                  Instrument Ref: {docRef} • Checksum (SHA-256): {cryptographicDigest}
                </div>
              </div>
            </div>
          </div>

          {/* Page 4 Footer */}
          <div className="relative z-10 pt-6 mt-6 border-t border-[#D6D0C4] flex items-center justify-between text-[11px] text-[#57534E]">
            <span>Tenancy Agreement ({docRef})</span>
            <span className="font-semibold text-[#292524]">Page 4 of 4</span>
          </div>
        </article>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          SEPARATE ELECTRONIC EXECUTION CERTIFICATE (OUTSIDE THE PAPER SHEET)
         ══════════════════════════════════════════════════════════════════════════ */}
      <section className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#111318] p-5 text-xs space-y-3 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
            <ShieldCheck className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
            <span>Certificate of Electronic Execution &amp; Audit Record (Act 772)</span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Document ID: {docRef}
          </span>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 text-[11px] text-slate-600 dark:text-slate-400">
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-200 mb-0.5">Landlord Verification</div>
            <div>{landlordFullName} (Ghana Card KYC On-File)</div>
            <div className="text-slate-400">
              {agreement.landlordSignedAt
                ? `Signed: ${new Date(agreement.landlordSignedAt).toLocaleString('en-GB')}`
                : 'Signature Pending'}
            </div>
          </div>

          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-200 mb-0.5">Tenant Verification</div>
            <div>{tenantFullName} (Verified Resident Account)</div>
            <div className="text-slate-400">
              {agreement.tenantSignedAt
                ? `Signed: ${new Date(agreement.tenantSignedAt).toLocaleString('en-GB')}`
                : 'Signature Pending'}
            </div>
          </div>

          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-200 mb-0.5 flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" /> Document Checksum (SHA-256)
            </div>
            <div className="font-mono text-[10px] break-all text-slate-500">
              {cryptographicDigest}
            </div>
          </div>
        </div>
      </section>

      {/* ── SIGNATURE PAD MODAL ── */}
      {showSignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1A1B] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
            <div className="px-7 py-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#16161D]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Sign Tenancy Agreement
                  </h3>
                  <p className="text-xs text-slate-500">
                    Draw your signature to execute {docRef}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSignModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="p-7 space-y-5">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs leading-relaxed flex items-start gap-2.5">
                <Scale className="w-4 h-4 shrink-0 mt-0.5 text-[#0F5132] dark:text-emerald-400" />
                <div>
                  By signing below, you execute this Tenancy Agreement under the Electronic Transactions Act, 2008 (Act
                  772) and agree to abide by the covenants set forth herein.
                </div>
              </div>

              <SignaturePad onSave={handleSaveSignature} label="Draw Your Signature" />

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSignModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSignature}
                  disabled={signMutation.isPending || !signatureData}
                  className="flex-[2] py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                >
                  {signMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording Signature...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sign &amp; Execute Agreement</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
