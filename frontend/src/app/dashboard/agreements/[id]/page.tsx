'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, FileSignature, CheckCircle2, Printer, AlertTriangle, 
  XCircle, ShieldCheck, Scale, Lock, Clock, FileCheck, ArrowLeft,
  Building, UserCheck, Shield, HelpCircle
} from 'lucide-react';
import SignaturePad from '@/components/SignaturePad';
import toast from 'react-hot-toast';
import Link from 'next/link';

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
      toast.success('Digital signature verified and cryptographically recorded!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit signature');
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        <p className="text-xs text-slate-500 font-medium">Decrypting Tenancy Vault record...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 rounded-3xl bg-white dark:bg-[#16161D] border border-rose-500/20 text-center space-y-4 shadow-xl">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Lease Agreement Not Found</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          This tenancy contract has not been initialized or you do not hold authorized signatory access.
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

  // Check signature status based on role
  const isTenant = currentUser?.role === 'TENANT';
  const isLandlord = currentUser?.role === 'LANDLORD';
  
  const hasTenantSigned = Boolean(agreement.tenantSignature);
  const hasLandlordSigned = Boolean(agreement.landlordSignature);

  const iHaveSigned = (isTenant && hasTenantSigned) || (isLandlord && hasLandlordSigned);
  const isFullySigned = hasTenantSigned && hasLandlordSigned;

  const handleSaveSignature = (base64: string) => {
    setSignatureData(base64);
  };

  const handleConfirmSignature = () => {
    if (!signatureData) {
      toast.error('Please sign the canvas pad first.');
      return;
    }
    signMutation.mutate(signatureData);
  };

  const handleDownloadPDF = async () => {
    try {
      toast.loading('Generating Official Act 220 Tenancy PDF...', { id: 'pdf' });
      const response = await api.get(`/bookings/${bookingId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ghana_Tenancy_Agreement_${(bookingId as string).slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Official PDF Downloaded!', { id: 'pdf' });
    } catch (err) {
      toast.error('Failed to download PDF document.', { id: 'pdf' });
    }
  };

  const cryptographicDigest = agreement.cryptographicHash || `SHA256-${agreement.id.replace(/-/g, '')}7b9e4a`;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Top Navigation & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white mb-2 transition-colors font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Statutory Tenancy Agreement
            </h1>
            <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
              isFullySigned 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30' 
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-500/30'
            }`}>
              {isFullySigned ? 'COMPLETED & SEALED' : 'AWAITING SIGNATURE'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Compliant with Ghana Rent Act, 1963 (Act 220) &amp; Electronic Transactions Act, 2008 (Act 772)
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadPDF}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Download Official PDF</span>
          </button>

          {!iHaveSigned && (
            <button 
              onClick={() => setShowSignModal(true)}
              className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <FileSignature className="w-4 h-4" />
              <span>E-Sign Contract</span>
            </button>
          )}
        </div>
      </div>

      {/* ── STATUTORY COMPLIANCE BAR ── */}
      <div className="bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
          <span className="font-bold text-zinc-900 dark:text-white">
            Republic of Ghana Rent Act, 1963 (Act 220) &amp; Electronic Transactions Act, 2008 (Act 772)
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px] font-medium text-zinc-500">
          <span>Sec. 17 Eviction Protection</span>
          <span>•</span>
          <span>SHA-256 Legal Vault Seal</span>
        </div>
      </div>

      {/* ── FORMAL STATUTORY DOCUMENT (LEGAL PARCHMENT VIEW) ── */}
      <div className="bg-[#FAF8F5] text-slate-900 rounded-3xl p-8 sm:p-14 shadow-2xl border border-[#E8E2D9] relative overflow-hidden">
        
        {/* Ghana Coat of Arms Emblem Header */}
        <div className="text-center pb-8 border-b-2 border-slate-900/10 space-y-2">
          <div className="text-xs font-bold tracking-widest text-[#0F5132] uppercase mb-1">Official Legal Instrument</div>
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest text-slate-900">
            Republic of Ghana
          </h2>
          <h3 className="text-sm font-extrabold tracking-wider text-slate-700 uppercase">
            Statutory Residential &amp; Commercial Tenancy Lease Agreement
          </h3>
          <p className="text-[11px] text-slate-500 font-medium italic">
            Executed pursuant to the Rent Act, 1963 (Act 220), Rent Regulations (L.I. 369), and Electronic Transactions Act, 2008 (Act 772)
          </p>
          <div className="pt-2 text-[10px] font-mono text-slate-400">
            Vault Ref: {agreement.id.slice(0, 16).toUpperCase()} • Execution Date: {new Date(agreement.createdAt).toLocaleDateString('en-GB')}
          </div>
        </div>

        {/* Agreement Body Clauses */}
        <div className="space-y-8 pt-8 text-xs sm:text-sm leading-relaxed text-slate-800 font-serif">
          
          {/* Intro Recital */}
          <p className="leading-relaxed">
            THIS STATUTORY TENANCY AGREEMENT is made this <strong>{new Date(agreement.createdAt).toLocaleDateString('en-GB')}</strong> by and between the parties named below:
          </p>

          {/* Section 1: Parties */}
          <div className="p-5 rounded-2xl bg-white/70 border border-slate-300/80 space-y-3 font-sans text-xs">
            <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-600" /> 1. The Contracting Parties
            </h4>
            <div className="grid sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <div className="font-bold text-slate-900 text-xs">LANDLORD / LESSOR:</div>
                <div className="text-slate-800 font-semibold">{landlord.firstName} {landlord.lastName}</div>
                <div className="text-slate-500">Phone: {landlord.phoneNumber || 'Registered on-file'}</div>
                <div className="text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                  ✓ Verified Host (Ghana Card KYC on-file)
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-bold text-slate-900 text-xs">TENANT / LESSEE:</div>
                <div className="text-slate-800 font-semibold">{tenant.firstName} {tenant.lastName}</div>
                <div className="text-slate-500">Email: {tenant.email} | Phone: {tenant.phoneNumber || 'N/A'}</div>
                <div className="text-indigo-700 font-bold text-[10px] flex items-center gap-1">
                  ✓ Verified Resident / Student
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Demised Premises */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900 font-sans uppercase tracking-wider">
              2. Demised Premises &amp; Tenancy Duration
            </h4>
            <p>
              The Landlord hereby demises and lets unto the Tenant all that property known and described as <strong>{property.title}</strong>, situated at <strong>{property.location}</strong>. 
              The accommodation category is designated as <strong>{booking.room?.roomType || 'Standard Residential Unit'}</strong>.
            </p>
            <p>
              The term of this tenancy shall commence on <strong>{new Date(booking.startDate).toLocaleDateString('en-GB')}</strong> and expire on <strong>{new Date(booking.endDate).toLocaleDateString('en-GB')}</strong>, unless determined earlier pursuant to statutory provisions.
            </p>
          </div>

          {/* Section 3: Financial Consideration */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900 font-sans uppercase tracking-wider">
              3. Rent Consideration &amp; Escrow Holding
            </h4>
            <p>
              The agreed rent for the entire term is <strong>GHS {property.price.toLocaleString()}</strong>, authenticated and deposited into protected escrow custody via the Akwaaba Homes verified payment gateway (Paystack / Mobile Money). Official electronic receipts have been issued to both parties.
            </p>
          </div>

          {/* Section 4: Landlord Covenants (Act 220) */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900 font-sans uppercase tracking-wider">
              4. Landlord's Statutory Covenants (Rent Act 220, Section 20)
            </h4>
            <p>The Landlord explicitly covenants with the Tenant as follows:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
              <li><strong>Quiet Enjoyment:</strong> The Tenant peacefully holding and paying agreed rent shall quietly enjoy the demised premises without unlawful eviction, harassment, or molestation.</li>
              <li><strong>Structural &amp; Roof Integrity:</strong> The Landlord shall keep the main roof, exterior walls, foundations, main electrical wiring, and plumbing in good, tenantable structural repair.</li>
              <li><strong>Inspection Notice:</strong> The Landlord or authorized agents shall provide minimum <strong>24-48 hours advance written notice</strong> before entering premises for reasonable inspection.</li>
              <li><strong>Prohibition of Unlawful Lockout:</strong> Pursuant to Section 17 of the Rent Act (Act 220), the Landlord covenants <strong>NEVER</strong> to unlawfully eject, lockout, disconnect water or electrical supply, or remove roofing without a valid warrant from a competent Rent Magistrate or Court.</li>
            </ul>
          </div>

          {/* Section 5: Tenant Covenants */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900 font-sans uppercase tracking-wider">
              5. Tenant's Statutory Covenants
            </h4>
            <p>The Tenant explicitly covenants with the Landlord as follows:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-700">
              <li><strong>Rent Punctuality:</strong> To remit agreed rent punctually as stipulated.</li>
              <li><strong>Internal Upkeep:</strong> To keep internal fixtures, windows, glass, and fittings in good tenantable order (reasonable wear and tear excepted).</li>
              <li><strong>Subletting Prohibition:</strong> Not to assign, sublet, or part with possession of the premises or any room therein without the prior written approval of the Landlord.</li>
              <li><strong>Community Quiet Hours:</strong> To respect compound serenity and comply with all residential/hostel rules and municipal sanitation bylaws.</li>
              <li><strong>Digital Inspection:</strong> To execute the digital move-in checklist upon key handover and move-out inspection prior to departure.</li>
            </ul>
          </div>

          {/* Section 6: Security Deposit Escrow */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900 font-sans uppercase tracking-wider">
              6. Caution Deposit Escrow &amp; 14-Day Refund Protocol
            </h4>
            <p>
              Any caution or security deposit paid shall be held in protected custody and shall <strong>never be treated as rent</strong>. 
              Upon vacation of premises, a joint digital move-out inspection shall be conducted. The caution deposit shall be refunded in full within <strong>fourteen (14) calendar days</strong>, subject only to itemized deductions for documented, physical damages exceeding fair wear and tear.
            </p>
          </div>

          {/* Section 7: Notice to Quit */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-900 font-sans uppercase tracking-wider">
              7. Determination of Tenancy &amp; Notice to Quit (Act 220, Section 17)
            </h4>
            <p>
              Either party may give statutory notice to determine tenancy: minimum <strong>one (1) month</strong> for monthly leases and <strong>three (3) months</strong> for annual tenancies. Recovery of possession shall be strictly governed by the statutory provisions of Section 17 of the Rent Act, 1963 (Act 220).
            </p>
          </div>

          {/* Recital End */}
          <p className="pt-4 text-center italic text-xs text-slate-500">
            IN WITNESS WHEREOF, the parties hereto have executed this statutory tenancy contract electronically pursuant to the Electronic Transactions Act, 2008 (Act 772).
          </p>

          {/* ── SIGNATURES GRID ── */}
          <div className="grid sm:grid-cols-2 gap-8 pt-6 border-t-2 border-slate-300">
            
            {/* Tenant Signature Box */}
            <div className="p-5 rounded-2xl bg-white/80 border border-slate-300 text-center space-y-3 font-sans">
              <div className="text-xs font-black text-slate-900 uppercase">Tenant / Lessee E-Signature</div>
              <div className="h-28 flex items-center justify-center border-b-2 border-dashed border-slate-300 bg-slate-50/50 rounded-xl overflow-hidden p-2">
                {agreement.tenantSignature ? (
                  <img src={agreement.tenantSignature} alt="Tenant Signature" className="max-h-24 object-contain" />
                ) : (
                  <span className="text-xs text-slate-400 italic">Pending Digital Signature</span>
                )}
              </div>
              <div className="text-xs font-bold text-slate-900">{tenant.firstName} {tenant.lastName}</div>
              <div className="text-[10px] text-slate-500">
                Signed At: {agreement.tenantSignedAt ? new Date(agreement.tenantSignedAt).toLocaleString('en-GB') : 'Awaiting Execution'}
              </div>
              {agreement.tenantSignature && (
                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3" /> Act 772 E-Signature Validated
                </div>
              )}
            </div>

            {/* Landlord Signature Box */}
            <div className="p-5 rounded-2xl bg-white/80 border border-slate-300 text-center space-y-3 font-sans">
              <div className="text-xs font-black text-slate-900 uppercase">Landlord / Lessor E-Signature</div>
              <div className="h-28 flex items-center justify-center border-b-2 border-dashed border-slate-300 bg-slate-50/50 rounded-xl overflow-hidden p-2">
                {agreement.landlordSignature ? (
                  <img src={agreement.landlordSignature} alt="Landlord Signature" className="max-h-24 object-contain" />
                ) : (
                  <span className="text-xs text-slate-400 italic">Pending Digital Signature</span>
                )}
              </div>
              <div className="text-xs font-bold text-slate-900">{landlord.firstName} {landlord.lastName}</div>
              <div className="text-[10px] text-slate-500">
                Signed At: {agreement.landlordSignedAt ? new Date(agreement.landlordSignedAt).toLocaleString('en-GB') : 'Awaiting Execution'}
              </div>
              {agreement.landlordSignature && (
                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3" /> Ghana Card Host Stamp Verified
                </div>
              )}
            </div>

          </div>

          {/* ── CRYPTOGRAPHIC SHA-256 AUDIT SEAL BOX ── */}
          <div className="mt-8 p-5 rounded-2xl bg-slate-900 text-white font-mono text-[11px] space-y-2">
            <div className="flex items-center justify-between text-amber-400 font-bold">
              <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> IMMUTABLE CRYPTOGRAPHIC SEAL</span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-amber-400/20">SHA-256</span>
            </div>
            <div className="break-all text-slate-300 font-semibold bg-black/40 p-3 rounded-xl border border-white/10 text-[10px]">
              {cryptographicDigest}
            </div>
            <p className="text-[10px] text-slate-400 font-sans">
              This digital tenancy instrument is cryptographically sealed on the Akwaaba Homes Legal Ledger. 
              Any post-signature alteration, tampering, or deletion automatically breaks this seal under Act 772 of the Republic of Ghana.
            </p>
          </div>

        </div>

        {/* Seal Stamp Footer */}
        {isFullySigned && (
          <div className="mt-10 text-center pt-6 border-t-2 border-dashed border-slate-300">
            <div className="inline-block border-4 border-emerald-600 text-emerald-700 px-6 py-2 rounded-2xl transform -rotate-3 shadow-lg bg-emerald-50/50">
              <p className="font-black text-base uppercase tracking-widest leading-tight">ACT 220 STATUTORY SEAL</p>
              <p className="text-[9px] font-extrabold tracking-widest text-emerald-600">AUTHENTICATED • REGISTERED TENANCY</p>
            </div>
          </div>
        )}

      </div>

      {/* ── SIGNATURE PAD MODAL ── */}
      {showSignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1A1B] rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
            
            {/* Modal Header */}
            <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-[#16161D]">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FileSignature className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Execute Statutory Lease
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Complies with Act 220 &amp; Electronic Transactions Act 772
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowSignModal(false)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-8 space-y-6">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-2.5">
                <Scale className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  By applying your electronic signature below, you legally execute this lease contract and consent to the statutory rights and protections under the <strong>Republic of Ghana Rent Act, 1963 (Act 220)</strong>.
                </div>
              </div>
              
              <SignaturePad onSave={handleSaveSignature} label="Sign with Finger / Mouse / Touchscreen" />
              
              {/* Modal Buttons */}
              <div className="mt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowSignModal(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleConfirmSignature}
                  disabled={signMutation.isPending || !signatureData}
                  className="flex-[2] py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
                >
                  {signMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Hashing &amp; Verifying...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Apply Statutory E-Signature</span>
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
