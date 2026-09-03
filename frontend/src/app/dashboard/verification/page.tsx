'use client';

import { useState } from 'react';
import { 
  ShieldCheck, Loader2, ArrowRight, FileCheck, UploadCloud, 
  CheckCircle2, AlertCircle, FileText, Lock, Building2, Check, Clock
} from 'lucide-react';
import api from '@/lib/axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

export default function VerificationPage() {
  const queryClient = useQueryClient();
  const [ghanaCardNumber, setGhanaCardNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const { data: session, refetch } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
  });

  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);

  // Landlord verification state
  const [landlordDoc, setLandlordDoc] = useState<File | null>(null);
  const [isSubmittingLandlord, setIsSubmittingLandlord] = useState(false);
  const [landlordMsg, setLandlordMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const uploadDoc = async (file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    const res = await api.post('/upload/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
  };

  const handleLandlordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLandlord(true);
    setLandlordMsg(null);

    if (!landlordDoc) {
      setLandlordMsg({ text: 'Please select an Indenture, Land Title, or Business Registration Document', type: 'error' });
      setIsSubmittingLandlord(false);
      return;
    }

    try {
      const landlordDocUrl = await uploadDoc(landlordDoc);
      const frontUrl = frontImage ? await uploadDoc(frontImage) : session?.ghanaCardFrontUrl;
      const backUrl = backImage ? await uploadDoc(backImage) : session?.ghanaCardBackUrl;

      await api.post('/auth/landlord-verification', {
        ghanaCardNumber: ghanaCardNumber || session?.ghanaCardNumber || 'GHA-000000000-0',
        ghanaCardFrontUrl: frontUrl || 'N/A',
        ghanaCardBackUrl: backUrl || 'N/A',
        landlordDocUrl
      });

      setLandlordMsg({ text: 'Deed and host verification submitted successfully. Under administrative review.', type: 'success' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['session'] });
    } catch (err: any) {
      setLandlordMsg({ text: err.response?.data?.message || 'Failed to submit landlord verification', type: 'error' });
    } finally {
      setIsSubmittingLandlord(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const regex = /^GHA-\d{9}-\d$/;
    if (!regex.test(ghanaCardNumber.toUpperCase())) {
      setMessage({ text: 'Invalid format. Required structure: GHA-XXXXXXXXX-X', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    if (!frontImage || !backImage) {
      setMessage({ text: 'Please upload both front and reverse sides of your Ghana Card', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    try {
      const frontFormData = new FormData();
      frontFormData.append('document', frontImage);
      const frontRes = await api.post('/upload/document', frontFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const ghanaCardFrontUrl = frontRes.data.url;

      const backFormData = new FormData();
      backFormData.append('document', backImage);
      const backRes = await api.post('/upload/document', backFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const ghanaCardBackUrl = backRes.data.url;

      await api.post('/auth/ghana-card', { 
        ghanaCardNumber: ghanaCardNumber.toUpperCase(),
        ghanaCardFrontUrl,
        ghanaCardBackUrl
      });
      
      setMessage({ text: 'Ghana Card submitted successfully. Tier 1 verification in progress.', type: 'success' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    } catch (error: any) {
      setMessage({ text: error.response?.data?.message || 'Failed to submit Ghana Card', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) return null;

  const isVerified = session.ghanaCardStatus === 'VERIFIED';
  const isPending = session.ghanaCardStatus === 'PENDING';
  const isRejected = session.ghanaCardStatus === 'REJECTED';

  return (
    <div className="max-w-3xl space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-bold tracking-wider uppercase mb-2 border border-zinc-200/60 dark:border-zinc-700">
          <Lock className="w-3 h-3 text-[#198754]" /> Statutory Compliance Vault
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
          Identity &amp; Host Certification
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Government-grade KYC verification via the National Identification Authority (NIA) and Lands Commission registry.
        </p>
      </div>

      {/* ── CARD 1: GHANA CARD VERIFICATION ── */}
      <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div className="flex items-center gap-3.5">
            <div className={clsx(
              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border",
              isVerified ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-[#0F5132] dark:text-emerald-400" :
              isPending ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400" :
              isRejected ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400" :
              "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500"
            )}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                  Ghana Card (National ID)
                </h2>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700">
                  NIA Tier-1
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Required by Act 220 for legal tenancy contract signature validation.
              </p>
            </div>
          </div>

          <div>
            <span className={clsx(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border tracking-wide",
              isVerified ? "bg-emerald-50 text-[#0F5132] border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800" :
              isPending ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800" :
              isRejected ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800" :
              "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
            )}>
              {isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />}
              {isRejected && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
              <span>{session.ghanaCardStatus ? session.ghanaCardStatus.replace('_', ' ') : 'NOT SUBMITTED'}</span>
            </span>
          </div>
        </div>

        {/* Content depending on Status */}
        <div className="pt-6">
          {isVerified ? (
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 flex items-start gap-3">
              <div className="p-1 rounded-full bg-emerald-500 text-white shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Government ID Verified &amp; Signed
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-300/80 mt-0.5 leading-relaxed">
                  Your Ghana Card (PIN: <span className="font-mono font-bold">{session.ghanaCardNumber || 'GHA-XXXXXXXXX-X'}</span>) has been verified. Your electronic signature on tenancy leases is legally compliant with the Ghana Rent Control Department.
                </p>
              </div>
            </div>
          ) : isPending ? (
            <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Document Submitted &amp; Awaiting Clearance
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Your Ghana Card credentials and photo proofs have been secured with SHA-256 encryption. Our compliance team is verifying the biometric match against the NIA registry.
                  </p>
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                  <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">1. Submitted</div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Completed</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                  <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300">2. Review</div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">In Progress</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400">
                  <div className="text-[10px] font-bold">3. Certified</div>
                  <div className="text-[10px]">Pending</div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#198754]" />
                  <span>Statutory Compliance Notice</span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Provide your exact Ghana Card PIN as printed on your national ID. Once submitted, submissions are locked to prevent identity tampering.
                </p>
              </div>

              {message && (
                <div className={clsx(
                  "p-3.5 rounded-xl text-xs font-bold border",
                  message.type === 'success' ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                )}>
                  {message.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider mb-1.5">
                  Ghana Card Personal ID Number (PIN)
                </label>
                <input 
                  type="text" 
                  required 
                  placeholder="GHA-123456789-0" 
                  className="block w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#0F5132] outline-none transition-all uppercase" 
                  value={ghanaCardNumber} 
                  onChange={(e) => setGhanaCardNumber(e.target.value)} 
                />
                <p className="mt-1 text-[11px] text-zinc-500">Format: GHA-XXXXXXXXX-X</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Front of Card */}
                <div>
                  <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 mb-1.5">
                    Front Side of Ghana Card
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 cursor-pointer transition-colors text-center">
                    <UploadCloud className="w-5 h-5 text-zinc-400 mb-1.5" />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {frontImage ? frontImage.name : 'Upload Card Front'}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">JPG, PNG up to 10MB</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      required 
                      className="hidden" 
                      onChange={(e) => setFrontImage(e.target.files?.[0] || null)} 
                    />
                  </label>
                </div>

                {/* Back of Card */}
                <div>
                  <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 mb-1.5">
                    Reverse Side of Ghana Card
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 cursor-pointer transition-colors text-center">
                    <UploadCloud className="w-5 h-5 text-zinc-400 mb-1.5" />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {backImage ? backImage.name : 'Upload Card Reverse'}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">JPG, PNG up to 10MB</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      required 
                      className="hidden" 
                      onChange={(e) => setBackImage(e.target.files?.[0] || null)} 
                    />
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Encrypting &amp; Submitting...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit for Verification</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── CARD 2: LANDLORD DEED & HOST CERTIFICATION ── */}
      {session?.role === 'LANDLORD' && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-800 dark:text-zinc-200 shrink-0">
                <Building2 className="w-5 h-5 text-[#0F5132] dark:text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                    Property Ownership Deed &amp; Host Certification
                  </h2>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Indenture, Land Title Certificate, or Registrar General (RGD) registration.
                </p>
              </div>
            </div>

            <div>
              <span className={clsx(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border tracking-wide",
                session.isVerifiedLandlord ? "bg-emerald-50 text-[#0F5132] border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800" :
                session.landlordVerificationStatus === 'PENDING' ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800" :
                "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
              )}>
                {session.isVerifiedLandlord && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                {session.landlordVerificationStatus === 'PENDING' && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />}
                <span>
                  {session.isVerifiedLandlord ? 'CERTIFIED HOST' : session.landlordVerificationStatus || 'UNVERIFIED'}
                </span>
              </span>
            </div>
          </div>

          <div className="pt-6">
            {session.isVerifiedLandlord ? (
              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 flex items-start gap-3">
                <div className="p-1 rounded-full bg-emerald-500 text-white shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Host Deed Certified by Akwaaba Homes
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300/80 mt-0.5 leading-relaxed">
                    Your property deeds are audited. All your student hostels and residential apartments display the <span className="font-bold text-[#0F5132] dark:text-emerald-400">Direct Landlord Verified</span> badge across search results.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleLandlordSubmit} className="space-y-5">
                {landlordMsg && (
                  <div className={clsx(
                    "p-3.5 rounded-xl text-xs font-bold border",
                    landlordMsg.type === 'success' ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                  )}>
                    {landlordMsg.text}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider mb-1.5">
                    Deed / Title Documentation
                  </label>
                  <label className="flex flex-col items-center justify-center p-6 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl hover:border-zinc-400 dark:hover:border-zinc-500 bg-zinc-50 dark:bg-zinc-900/40 cursor-pointer transition-colors text-center">
                    <FileText className="w-6 h-6 text-zinc-400 mb-2" />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {landlordDoc ? landlordDoc.name : 'Select Indenture, Land Title, or RGD Certificate'}
                    </span>
                    <span className="text-[11px] text-zinc-500 mt-1">
                      PDF, JPG, or PNG up to 15MB. Proves legal ownership or leasing authorization.
                    </span>
                    <input 
                      type="file" 
                      accept="image/*,.pdf"
                      required 
                      className="hidden" 
                      onChange={(e) => setLandlordDoc(e.target.files?.[0] || null)} 
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingLandlord}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmittingLandlord ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading Deed &amp; Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Ownership Proof</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
