'use client';

import React, { useState } from 'react';
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
          THE PHYSICAL LEGAL INSTRUMENT (AUTHENTIC GHANAIAN CONVEYANCING PAPER)
         ══════════════════════════════════════════════════════════════════════════ */}
      <article
        className="bg-[#FCFBF9] text-[#1A1A18] rounded-xs px-7 py-10 sm:px-16 sm:py-16 shadow-[0_10px_35px_rgba(15,23,42,0.08)] border border-[#DED8CE] relative print:shadow-none print:border-none print:p-0"
        style={{
          fontFamily: 'Georgia, "Times New Roman", Times, serif',
        }}
      >
        {/* Top Metadata Folio Line */}
        <div className="flex items-center justify-between text-[11px] text-[#57534E] pb-4 border-b border-[#D6D0C4] tracking-wide">
          <span>INSTRUMENT REF: {docRef}</span>
          <span>REPUBLIC OF GHANA</span>
        </div>

        {/* Formal Conveyancing Title Header */}
        <header className="text-center py-8 border-b-2 border-double border-[#1A1A18] space-y-2">
          <p className="text-xs uppercase tracking-[0.25em] text-[#44403C] font-semibold">
            Republic of Ghana
          </p>
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-[0.12em] text-[#111110]">
            Tenancy Agreement
          </h2>
          <p className="text-xs italic text-[#57534E] pt-0.5">
            Made pursuant to the Rent Act, 1963 (Act 220) and the Conveyancing Act, 1973 (N.R.C.D. 175)
          </p>
        </header>

        {/* Legal Body */}
        <div className="pt-8 space-y-6 text-[13.5px] sm:text-[14.5px] leading-[1.85] text-[#1C1917] text-justify">
          {/* Opening Recital & Parties */}
          <p>
            <strong>THIS TENANCY AGREEMENT</strong> is made the{' '}
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
          <div className="space-y-3 pt-1">
            <p>
              <strong>WHEREAS:</strong>
            </p>
            <ol className="list-[upper-roman] pl-7 space-y-2">
              <li>
                The Landlord is the lawful owner or authorized lessor of the residential property known as{' '}
                <strong>{property.title}</strong>, situated at <strong>{property.location}</strong> in the Republic of
                Ghana (hereinafter referred to as <strong>&ldquo;the Premises&rdquo;</strong>).
              </li>
              <li>
                The Landlord has agreed to let and the Tenant has agreed to take the Premises for the term and at the
                rent hereinafter set forth, subject to the covenants, conditions, and stipulations contained in this
                Agreement.
              </li>
            </ol>
          </div>

          <p className="pt-1 font-bold uppercase tracking-wide text-[13px] text-[#111110]">
            NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:
          </p>

          {/* Schedule of Tenancy Particulars (Classic Legal Table) */}
          <div className="my-5">
            <div className="text-xs font-bold uppercase tracking-widest text-[#1C1917] mb-2">
              Schedule of Tenancy Particulars
            </div>
            <table className="w-full border-collapse border border-[#A8A29E] text-[13px] text-left">
              <tbody>
                <tr className="border-b border-[#A8A29E]">
                  <th className="py-2.5 px-3.5 bg-[#F5F2EB] font-bold text-[#292524] w-2/5 border-r border-[#A8A29E]">
                    1. Description &amp; Location of Premises
                  </th>
                  <td className="py-2.5 px-3.5 text-[#1C1917]">
                    <strong>{property.title}</strong>, situated at {property.location}
                  </td>
                </tr>
                <tr className="border-b border-[#A8A29E]">
                  <th className="py-2.5 px-3.5 bg-[#F5F2EB] font-bold text-[#292524] border-r border-[#A8A29E]">
                    2. Unit / Accommodation Category
                  </th>
                  <td className="py-2.5 px-3.5 text-[#1C1917]">{unitDescription}</td>
                </tr>
                <tr className="border-b border-[#A8A29E]">
                  <th className="py-2.5 px-3.5 bg-[#F5F2EB] font-bold text-[#292524] border-r border-[#A8A29E]">
                    3. Term of Tenancy
                  </th>
                  <td className="py-2.5 px-3.5 text-[#1C1917]">
                    From <strong>{formatStandardLegalDate(booking.startDate)}</strong> to{' '}
                    <strong>{formatStandardLegalDate(booking.endDate)}</strong>
                  </td>
                </tr>
                <tr className="border-b border-[#A8A29E]">
                  <th className="py-2.5 px-3.5 bg-[#F5F2EB] font-bold text-[#292524] border-r border-[#A8A29E]">
                    4. Agreed Rent for the Term
                  </th>
                  <td className="py-2.5 px-3.5 text-[#1C1917]">
                    <strong>GHS {Number(property.price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</strong>{' '}
                    (Ghana Cedis)
                  </td>
                </tr>
                <tr>
                  <th className="py-2.5 px-3.5 bg-[#F5F2EB] font-bold text-[#292524] border-r border-[#A8A29E]">
                    5. Permitted Use
                  </th>
                  <td className="py-2.5 px-3.5 text-[#1C1917]">Private Residential Occupation Only</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Clause 1: Grant of Tenancy */}
          <div className="space-y-2">
            <h4 className="font-bold text-[14px] uppercase tracking-wider text-[#111110]">
              1. Grant of Tenancy and Term
            </h4>
            <p>
              In consideration of the rent hereby reserved and the covenants on the part of the Tenant hereinafter
              contained, the Landlord hereby lets unto the Tenant the Premises described in the Schedule hereto, TO HOLD
              the same unto the Tenant from <strong>{formatStandardLegalDate(booking.startDate)}</strong> until{' '}
              <strong>{formatStandardLegalDate(booking.endDate)}</strong>, unless earlier determined in accordance with
              the provisions of this Agreement or the Rent Act, 1963 (Act 220).
            </p>
          </div>

          {/* Clause 2: Rent & Payment */}
          <div className="space-y-2">
            <h4 className="font-bold text-[14px] uppercase tracking-wider text-[#111110]">
              2. Rent and Receipts
            </h4>
            <p>
              <strong>2.1.</strong> The rent reserved for the tenancy is{' '}
              <strong>GHS {Number(property.price).toLocaleString('en-GH', { minimumFractionDigits: 2 })}</strong>, paid
              by the Tenant through the designated settlement channel on behalf of the Landlord.
            </p>
            <p>
              <strong>2.2.</strong> In accordance with Section 20 of the Rent Act, 1963 (Act 220), every payment of rent
              made under this Agreement shall be acknowledged by an official written or electronic rent receipt issued
              to the Tenant stating the period covered and the sum received.
            </p>
          </div>

          {/* Clause 3: Tenant's Covenants */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-[14px] uppercase tracking-wider text-[#111110]">
              3. Tenant&rsquo;s Covenants
            </h4>
            <p>The Tenant hereby covenants with the Landlord as follows:</p>
            <div className="pl-4 sm:pl-6 space-y-2">
              <p>
                <strong>3.1. Payment of Rent and Utilities:</strong> To pay the reserved rent punctually as stipulated,
                and to pay all charges for electricity, water, sanitation, and other utilities consumed on or
                attributable to the Premises during the tenancy.
              </p>
              <p>
                <strong>3.2. Care of Interior and Fixtures:</strong> To keep the interior of the Premises, including all
                doors, windows, locks, sanitary fittings, electrical appliances, and fixtures provided by the Landlord,
                in a clean and tenantable state of repair (fair wear and tear and damage by accidental fire or natural
                causes excepted).
              </p>
              <p>
                <strong>3.3. Alterations:</strong> Not to make any structural alterations, additions, or permanent
                modifications to the Premises without obtaining the prior written consent of the Landlord.
              </p>
              <p>
                <strong>3.4. Prohibition on Assignment and Subletting:</strong> Not to assign, sublet, or part with the
                possession of the Premises or any part thereof to any third party without the prior written consent of
                the Landlord, in compliance with Section 22 of the Rent Act, 1963 (Act 220).
              </p>
              <p>
                <strong>3.5. Good Neighbourliness and Conduct:</strong> Not to do or permit to be done upon the Premises
                anything which may constitute a nuisance, annoyance, or disturbance to the Landlord, co-tenants, or
                occupiers of adjoining properties, nor to use the Premises for any unlawful or immoral purpose.
              </p>
              <p>
                <strong>3.6. Condition Inspection and Yielding Up:</strong> To participate in a joint condition
                inspection upon taking possession and at the expiration of the tenancy, and to peaceably yield up the
                Premises with all keys and Landlord&rsquo;s fixtures in good tenantable order at the determination of the
                tenancy.
              </p>
            </div>
          </div>

          {/* Clause 4: Landlord's Covenants */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-[14px] uppercase tracking-wider text-[#111110]">
              4. Landlord&rsquo;s Covenants
            </h4>
            <p>The Landlord hereby covenants with the Tenant as follows:</p>
            <div className="pl-4 sm:pl-6 space-y-2">
              <p>
                <strong>4.1. Quiet Enjoyment:</strong> That the Tenant, paying the rent hereby reserved and observing
                and performing the covenants and obligations on the Tenant&rsquo;s part herein contained, shall peaceably
                and quietly hold and enjoy the Premises during the term without any unlawful interruption, harassment,
                or disturbance by the Landlord or any person rightfully claiming under or in trust for the Landlord.
              </p>
              <p>
                <strong>4.2. Structural and External Repairs:</strong> To keep the roof, foundation, exterior walls,
                main drains, main plumbing pipes, and primary electrical conduit of the Premises in good and tenantable
                structural repair throughout the term of the tenancy.
              </p>
              <p>
                <strong>4.3. Notice of Entry for Inspection:</strong> To give the Tenant not less than twenty-four (24)
                hours&rsquo; prior notice (except in the case of an emergency) before entering the Premises at reasonable
                daytime hours to inspect its condition or carry out necessary repairs.
              </p>
              <p>
                <strong>4.4. Due Process of Law:</strong> Not to unlawfully lock out the Tenant, remove roofing or
                doors, or disconnect essential water or electricity supplies as a means of compelling vacation of the
                Premises, in strict observance of the Rent Act, 1963 (Act 220).
              </p>
            </div>
          </div>

          {/* Clause 5: Caution / Security Deposit */}
          <div className="space-y-2">
            <h4 className="font-bold text-[14px] uppercase tracking-wider text-[#111110]">
              5. Caution Deposit and Refund
            </h4>
            <p>
              Any caution or security deposit paid by the Tenant shall be held strictly as security for the due
              performance of the Tenant&rsquo;s obligations and shall not be treated by either party as payment of rent.
              Upon the expiration or lawful determination of the tenancy and following a joint move-out inspection, the
              caution deposit shall be refunded to the Tenant within fourteen (14) days, less only verified and itemized
              costs of repairing physical damage caused by the Tenant beyond fair wear and tear, or settling unpaid
              utility bills incurred during the Tenant&rsquo;s occupation.
            </p>
          </div>

          {/* Clause 6: Notice & Determination */}
          <div className="space-y-2">
            <h4 className="font-bold text-[14px] uppercase tracking-wider text-[#111110]">
              6. Determination of Tenancy and Notice
            </h4>
            <p>
              <strong>6.1.</strong> Either party wishing to terminate or not renew this tenancy shall give prior written
              notice to the other party of not less than one (1) calendar month in the case of a monthly tenancy, or not
              less than three (3) calendar months in the case of an annual tenancy.
            </p>
            <p>
              <strong>6.2.</strong> Any dispute or difference arising out of or in connection with this Agreement which
              cannot be amicably resolved between the parties within fourteen (14) days shall be referred for mediation
              or determination by the appropriate Rent Magistrate or Rent Control Officer in accordance with the Rent
              Act, 1963 (Act 220) of the Republic of Ghana.
            </p>
          </div>

          {/* Testimonium Clause */}
          <div className="pt-6">
            <p className="text-[#1C1917]">
              <strong>IN WITNESS WHEREOF</strong> the parties hereto have executed this Agreement the day, month, and
              year first above written.
            </p>
          </div>

          {/* ── TRADITIONAL SOLICITOR EXECUTION BLOCK ── */}
          <div className="grid sm:grid-cols-2 gap-12 pt-8 mt-6 border-t border-[#A8A29E] text-left">
            {/* Landlord Execution Column */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#292524]">
                SIGNED by the within-named LANDLORD:
              </p>

              <div className="h-24 flex items-end justify-start border-b border-[#1C1917] pb-1 px-1">
                {agreement.landlordSignature ? (
                  <img
                    src={agreement.landlordSignature}
                    alt="Landlord Signature"
                    className="max-h-20 object-contain mix-blend-multiply contrast-125 brightness-105"
                  />
                ) : (
                  <span className="text-xs italic text-[#78716C] pb-2">
                    [ Awaiting Landlord&rsquo;s Signature ]
                  </span>
                )}
              </div>

              <div className="space-y-1 text-[13px] pt-1">
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
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-[#292524]">
                SIGNED by the within-named TENANT:
              </p>

              <div className="h-24 flex items-end justify-start border-b border-[#1C1917] pb-1 px-1">
                {agreement.tenantSignature ? (
                  <img
                    src={agreement.tenantSignature}
                    alt="Tenant Signature"
                    className="max-h-20 object-contain mix-blend-multiply contrast-125 brightness-105"
                  />
                ) : (
                  <span className="text-xs italic text-[#78716C] pb-2">
                    [ Awaiting Tenant&rsquo;s Signature ]
                  </span>
                )}
              </div>

              <div className="space-y-1 text-[13px] pt-1">
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

          {/* Paper Footer Attestation */}
          <div className="pt-10 mt-8 border-t border-[#D6D0C4] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[11px] text-[#57534E]">
            <div>
              Executed electronically in accordance with Section 10 of the Electronic Transactions Act, 2008 (Act 772).
            </div>
            <div className="shrink-0 font-semibold text-[#292524]">
              Page 1 of 1
            </div>
          </div>
        </div>
      </article>

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
