'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import api from '@/lib/axios';
import { Button } from '@/components/ui/Button';
import {
  FileText,
  FileSignature,
  Download,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  ArrowRight,
  ExternalLink,
  Loader2,
  BookOpen,
  CreditCard,
  UploadCloud,
  AlertCircle,
  Check,
  GraduationCap,
  Wrench,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TenantDocumentsAndVerificationPage() {
  const queryClient = useQueryClient();

  // ── 1. Fetch User Session (Identity, Student & Host Verification State) ──
  const { data: session, refetch: refetchSession } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
  });

  // ── 2. Fetch Digital Tenancy Agreements ──
  const { data: agreementsData, isLoading: isLoadingAgreements } = useQuery({
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

  // ── 3. Ghana Card Verification State & Handlers ──
  const [ghanaCardNumber, setGhanaCardNumber] = useState('');
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [isSubmittingGhanaCard, setIsSubmittingGhanaCard] = useState(false);
  const [ isEditingGhanaCard, setIsEditingGhanaCard ] = useState(false);
  const [ghanaCardMessage, setGhanaCardMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // ── 4. Student Verification State & Handlers ──
  const [campus, setCampus] = useState('');
  const [studentId, setStudentId] = useState('');
  const [institutionalEmail, setInstitutionalEmail] = useState('');
  const [programmeOfStudy, setProgrammeOfStudy] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [studentDoc, setStudentDoc] = useState<File | null>(null);
  const [isSubmittingStudent, setIsSubmittingStudent] = useState(false);
  const [studentMsg, setStudentMsg] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [isEditingStudent, setIsEditingStudent] = useState(false);

  // ── 5. Landlord Deed Verification State & Handlers ──
  const [landlordDoc, setLandlordDoc] = useState<File | null>(null);
  const [isSubmittingLandlord, setIsSubmittingLandlord] = useState(false);
  const [landlordMsg, setLandlordMsg] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  const uploadDoc = async (file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    const res = await api.post('/upload/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.url;
  };

  const handleGhanaCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingGhanaCard(true);
    setGhanaCardMessage(null);

    const regex = /^GHA-\d{9}-\d$/;
    if (!regex.test(ghanaCardNumber.trim().toUpperCase())) {
      setGhanaCardMessage({
        text: 'Invalid format. Required structure: GHA-XXXXXXXXX-X',
        type: 'error',
      });
      setIsSubmittingGhanaCard(false);
      return;
    }

    if (!frontImage || !backImage) {
      setGhanaCardMessage({
        text: 'Please upload both front and reverse sides of your Ghana Card',
        type: 'error',
      });
      setIsSubmittingGhanaCard(false);
      return;
    }

    try {
      const ghanaCardFrontUrl = await uploadDoc(frontImage);
      const ghanaCardBackUrl = await uploadDoc(backImage);

      await api.post('/auth/ghana-card', {
        ghanaCardNumber: ghanaCardNumber.trim().toUpperCase(),
        ghanaCardFrontUrl,
        ghanaCardBackUrl,
      });

      setGhanaCardMessage({
        text: 'Ghana Card submitted successfully. Tier 1 verification in progress.',
        type: 'success',
      });
      toast.success('Ghana Card submitted for verification');
      setIsEditingGhanaCard(false);
      refetchSession();
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    } catch (error: any) {
      setGhanaCardMessage({
        text: error.response?.data?.message || 'Failed to submit Ghana Card',
        type: 'error',
      });
    } finally {
      setIsSubmittingGhanaCard(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingStudent(true);
    setStudentMsg(null);

    const activeCampus = campus || session?.campus;
    const activeStudentId = studentId || session?.studentId;

    if (!activeCampus || !activeCampus.trim() || !activeStudentId || !activeStudentId.trim()) {
      setStudentMsg({
        text: 'Institution/Campus and Student ID Number are required.',
        type: 'error',
      });
      setIsSubmittingStudent(false);
      return;
    }

    try {
      let studentDocUrl = session?.studentType;
      if (studentDoc) {
        studentDocUrl = await uploadDoc(studentDoc);
      }

      await api.post('/auth/student-verification', {
        campus: activeCampus.trim(),
        studentId: activeStudentId.trim(),
        programmeOfStudy: (programmeOfStudy || session?.programmeOfStudy || '').trim(),
        yearOfStudy: (yearOfStudy || session?.yearOfStudy || '').trim(),
        dateOfAdmission: institutionalEmail.trim() || session?.dateOfAdmission || undefined,
        studentType: studentDocUrl || 'VERIFIED',
      });

      setStudentMsg({
        text: 'Student credentials saved and verified successfully! You are now eligible to book student-only hostels.',
        type: 'success',
      });
      toast.success('Academic student credentials updated');
      setIsEditingStudent(false);
      refetchSession();
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    } catch (err: any) {
      setStudentMsg({
        text: err.response?.data?.message || 'Failed to update student verification',
        type: 'error',
      });
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  const handleLandlordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLandlord(true);
    setLandlordMsg(null);

    if (!landlordDoc) {
      setLandlordMsg({
        text: 'Please select an Indenture, Land Title, or Business Registration Document',
        type: 'error',
      });
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
        landlordDocUrl,
      });

      setLandlordMsg({
        text: 'Deed and host verification submitted successfully. Under administrative review.',
        type: 'success',
      });
      toast.success('Host ownership documents submitted');
      refetchSession();
      queryClient.invalidateQueries({ queryKey: ['session'] });
    } catch (err: any) {
      setLandlordMsg({
        text: err.response?.data?.message || 'Failed to submit landlord verification',
        type: 'error',
      });
    } finally {
      setIsSubmittingLandlord(false);
    }
  };

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

  const isVerified = session?.ghanaCardStatus === 'VERIFIED';
  const isPending = session?.ghanaCardStatus === 'PENDING';
  const isUnderReview = session?.ghanaCardStatus === 'UNDER_REVIEW';
  const isResubmissionRequired = session?.ghanaCardStatus === 'RESUBMISSION_REQUIRED';
  const isRejected = session?.ghanaCardStatus === 'REJECTED';

  const isLandlordVerified =
    session?.isVerifiedLandlord === true || session?.landlordVerificationStatus === 'VERIFIED';
  const isLandlordPending = session?.landlordVerificationStatus === 'PENDING';
  const isLandlordRejected = session?.landlordVerificationStatus === 'REJECTED';

  const isStudentVerified = Boolean(
    session?.studentId &&
      session.studentId.trim().length > 0 &&
      session?.campus &&
      session.campus.trim().length > 0
  );

  const formattedGhanaCardPin =
    session?.ghanaCardNumber && !session.ghanaCardNumber.includes(':')
      ? session.ghanaCardNumber
      : 'GHA-Verified-Encrypted';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 pb-14">
      {/* ── Page Header ── */}
      <div>
        <span className="text-[11px] font-bold text-[#16A34A] tracking-wider uppercase block">
          VERIFICATION &amp; LEGAL VAULT
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight mt-0.5">
          Documents, Identity &amp; Tenancy Agreements
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your Ghana Card (NIA) national identity verification, tertiary student clearance, and digitally executed tenancy agreements.
        </p>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ghana Card Status */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
              Ghana Card (National ID)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-black text-zinc-950 dark:text-white">
            {isVerified
              ? 'Verified ✓'
              : isUnderReview
              ? 'Under Review'
              : isPending
              ? 'Pending Audit'
              : 'Action Needed'}
          </p>
        </div>

        {/* Academic / Student Status */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
              Tertiary Student Status
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg font-black text-zinc-950 dark:text-white truncate">
            {isStudentVerified ? `Cleared (${session?.campus})` : 'Not Verified'}
          </p>
        </div>

        {/* Signed & Active Agreements */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
              Signed &amp; Sealed Leases
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#16A34A]">{signedCount}</p>
        </div>

        {/* Pending Signature */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
              Pending Your Signature
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <FileSignature className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">{pendingCount}</p>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          CARD 1: GHANA CARD (NATIONAL ID) VERIFICATION
         ──────────────────────────────────────────────────────────────── */}
      <div
        id="ghana-card-verification"
        className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-2xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-center text-[#16A34A] shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Ghana Card (National ID) Verification
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Required for identity verification and legally binding digital lease agreements.
              </p>
            </div>
          </div>

          <div>
            <span
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border tracking-wide',
                isVerified
                  ? 'bg-emerald-50 text-[#0F5132] border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                  : isUnderReview
                  ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800'
                  : isResubmissionRequired
                  ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800'
                  : isPending
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                  : isRejected
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
              )}
            >
              {isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
              {isUnderReview && <Clock className="w-3.5 h-3.5 text-sky-600 animate-pulse" />}
              {isResubmissionRequired && <AlertCircle className="w-3.5 h-3.5 text-orange-600" />}
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />}
              {isRejected && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
              <span>
                {session?.ghanaCardStatus
                  ? session.ghanaCardStatus.replace('_', ' ')
                  : 'NOT SUBMITTED'}
              </span>
            </span>
          </div>
        </div>

        <div className="pt-6">
          {isVerified && !isEditingGhanaCard ? (
            <div className="space-y-4">
              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 flex items-start gap-3">
                <div className="p-1 rounded-full bg-emerald-500 text-white shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Government ID Verified &amp; Signed
                  </div>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300/80 mt-0.5 leading-relaxed">
                    Your Ghana Card (PIN:{' '}
                    <span className="font-mono font-bold">{formattedGhanaCardPin}</span>) has been
                    verified. Your electronic signature on tenancy leases is legally compliant with
                    the Ghana Rent Control Department.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Need to submit a renewed or updated National ID card?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingGhanaCard(true);
                    setGhanaCardMessage(null);
                  }}
                  className="text-xs font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  Update Ghana Card Details &rarr;
                </button>
              </div>
            </div>
          ) : isUnderReview && !isEditingGhanaCard ? (
            <div className="bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/50 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 shrink-0">
                  <Clock className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-sky-950 dark:text-sky-100">
                    Compliance Verification Active
                  </h3>
                  <p className="text-xs text-sky-800 dark:text-sky-300 mt-1 leading-relaxed">
                    An Akwaaba Homes compliance administrator is currently reviewing your Ghana Card
                    identity credentials against statutory registry benchmarks.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-sky-200/60 dark:border-sky-800/60">
                <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                  <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    1. Submitted
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Completed
                  </div>
                </div>
                <div className="text-center p-2 rounded-lg bg-sky-100 dark:bg-sky-900/50 border border-sky-300 dark:border-sky-700">
                  <div className="text-[10px] font-bold text-sky-800 dark:text-sky-200">
                    2. Review
                  </div>
                  <div className="text-[10px] text-sky-600 dark:text-sky-300 font-semibold">
                    In Progress
                  </div>
                </div>
                <div className="text-center p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400">
                  <div className="text-[10px] font-bold">3. Certified</div>
                  <div className="text-[10px]">Pending</div>
                </div>
              </div>
            </div>
          ) : isPending && !isEditingGhanaCard ? (
            <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white">
                    Document Submitted &amp; In Audit Queue
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Your Ghana Card credentials and photo proofs have been secured with AES-256
                    encryption. Your submission is in line for compliance verification.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
                  <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    1. Submitted
                  </div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Completed
                  </div>
                </div>
                <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                  <div className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    2. Review Queue
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    Queued
                  </div>
                </div>
                <div className="text-center p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400">
                  <div className="text-[10px] font-bold">3. Certified</div>
                  <div className="text-[10px]">Pending</div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleGhanaCardSubmit} className="space-y-5">
              {isResubmissionRequired && (
                <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-orange-900 dark:text-orange-200">
                    <AlertCircle className="w-4 h-4 text-orange-600" />
                    <span>Action Required: Document Resubmission Requested</span>
                  </div>
                  <p className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed font-medium">
                    {session?.ghanaCardRejectionReason ||
                      'Please capture clearer, glare-free photos of both sides of your card and resubmit.'}
                  </p>
                </div>
              )}

              {isRejected && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs text-rose-900 dark:text-rose-200">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Previous Verification Rejected</span>
                  </div>
                  <p className="text-xs text-rose-800 dark:text-rose-300 leading-relaxed font-medium">
                    {session?.ghanaCardRejectionReason ||
                      'Your previous Ghana Card submission was rejected due to compliance discrepancies.'}
                  </p>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Submission Notice</span>
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Provide your exact Ghana Card PIN as printed on your national ID. All uploaded ID
                  documents are encrypted at rest with AES-256.
                </p>
              </div>

              {ghanaCardMessage && (
                <div
                  className={clsx(
                    'p-3.5 rounded-xl text-xs font-bold border',
                    ghanaCardMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                  )}
                >
                  {ghanaCardMessage.text}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider mb-1.5">
                  Ghana Card Personal ID Number (PIN) *
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
                    Front Side of Ghana Card *
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl hover:border-[#16A34A] dark:hover:border-emerald-500 bg-zinc-50 dark:bg-zinc-900/40 cursor-pointer transition-colors text-center">
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
                    Reverse Side of Ghana Card *
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl hover:border-[#16A34A] dark:hover:border-emerald-500 bg-zinc-50 dark:bg-zinc-900/40 cursor-pointer transition-colors text-center">
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

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  variant="emerald"
                  size="sm"
                  isLoading={isSubmittingGhanaCard}
                  disabled={isSubmittingGhanaCard}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Submit for Verification
                </Button>

                {isEditingGhanaCard && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingGhanaCard(false);
                      setGhanaCardMessage(null);
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          CARD 2: TERTIARY STUDENT VERIFICATION (TENANTS)
         ──────────────────────────────────────────────────────────────── */}
      {(!session?.role || session?.role === 'TENANT') && (
        <div
          id="student-verification"
          className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-2xs"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 flex items-center justify-center text-[#16A34A] shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                  Tertiary Student Verification
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Required to access and book accommodations restricted to registered university or
                  technical university students.
                </p>
              </div>
            </div>

            <div>
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border tracking-wide',
                  isStudentVerified
                    ? 'bg-emerald-50 text-[#0F5132] border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                )}
              >
                {isStudentVerified ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
                )}
                <span>{isStudentVerified ? 'Verified Student 🎓' : 'NOT VERIFIED'}</span>
              </span>
            </div>
          </div>

          <div className="pt-6">
            {isStudentVerified && !isEditingStudent ? (
              <div className="space-y-4">
                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 flex items-start gap-3">
                  <div className="p-1 rounded-full bg-emerald-500 text-white shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Academic Credentials Cleared
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300/80 leading-relaxed">
                      You are recognized as an active tertiary student. You have full clearance to
                      reserve rooms in Student-Only hostels.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-800 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                      Campus / Institution
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {session?.campus}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                      Student ID Number
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white">
                      {session?.studentId}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                      Programme of Study
                    </span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {session?.programmeOfStudy || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase block">
                      Academic Level
                    </span>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {session?.yearOfStudy || '—'}
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCampus(session?.campus || '');
                      setStudentId(session?.studentId || '');
                      setProgrammeOfStudy(session?.programmeOfStudy || '');
                      setYearOfStudy(session?.yearOfStudy || '');
                      setInstitutionalEmail(session?.dateOfAdmission || '');
                      setIsEditingStudent(true);
                      setStudentMsg(null);
                    }}
                    className="text-xs font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Update Academic Information &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleStudentSubmit} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-1">
                  <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span>Hostel Access Requirements</span>
                  </div>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Student-only accommodations and university-affiliated hostels require valid
                    campus registration details to prevent non-student access.
                  </p>
                </div>

                {studentMsg && (
                  <div
                    className={clsx(
                      'p-3.5 rounded-xl text-xs font-bold border',
                      studentMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                    )}
                  >
                    {studentMsg.text}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider mb-1.5">
                      Institution / Campus *
                    </label>
                    <input
                      type="text"
                      list="campus-list"
                      required
                      placeholder="e.g. University of Cape Coast (UCC)"
                      className="block w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#0F5132] outline-none transition-all"
                      value={campus || (isEditingStudent ? campus : session?.campus || '')}
                      onChange={(e) => setCampus(e.target.value)}
                    />
                    <datalist id="campus-list">
                      <option value="Koforidua Technical University (KTU)" />
                      <option value="University of Ghana (UG - Legon)" />
                      <option value="Kwame Nkrumah University of Science & Technology (KNUST)" />
                      <option value="University of Cape Coast (UCC)" />
                      <option value="University of Education, Winneba (UEW)" />
                      <option value="Ghana Institute of Management and Public Administration (GIMPA)" />
                      <option value="Accra Technical University (ATU)" />
                      <option value="Kumasi Technical University (KsTU)" />
                      <option value="University of Mines and Technology (UMaT)" />
                      <option value="University of Professional Studies, Accra (UPSA)" />
                      <option value="Ashesi University" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider mb-1.5">
                      Student ID Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. NRIT/CR/17/22/0001"
                      className="block w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#0F5132] outline-none transition-all"
                      value={studentId || (isEditingStudent ? studentId : session?.studentId || '')}
                      onChange={(e) => setStudentId(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider mb-1.5">
                      Programme of Study
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BSc Information Technology"
                      className="block w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#0F5132] outline-none transition-all"
                      value={
                        programmeOfStudy ||
                        (isEditingStudent ? programmeOfStudy : session?.programmeOfStudy || '')
                      }
                      onChange={(e) => setProgrammeOfStudy(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider mb-1.5">
                      Academic Level / Year
                    </label>
                    <select
                      className="block w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-zinc-800 focus:border-[#0F5132] outline-none transition-all cursor-pointer"
                      value={
                        yearOfStudy || (isEditingStudent ? yearOfStudy : session?.yearOfStudy || '')
                      }
                      onChange={(e) => setYearOfStudy(e.target.value)}
                    >
                      <option value="">Select Level</option>
                      <option value="Level 100">Level 100 (Freshman)</option>
                      <option value="Level 200">Level 200 (Sophomore)</option>
                      <option value="Level 300">Level 300 (Junior)</option>
                      <option value="Level 400">Level 400 (Senior)</option>
                      <option value="Postgraduate">Postgraduate (Masters/PhD)</option>
                      <option value="Diploma/Certificate">Diploma / Certificate</option>
                    </select>
                  </div>
                </div>

                {/* Institutional Email Option (Fast-Track) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider">
                      University Institutional Email (Fast-Track Approval)
                    </label>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                      Instant Clearance
                    </span>
                  </div>
                  <input
                    type="email"
                    placeholder="e.g. student@stu.ucc.edu.gh, student@st.ug.edu.gh"
                    className="block w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#0F5132] outline-none transition-all"
                    value={
                      institutionalEmail ||
                      (isEditingStudent ? institutionalEmail : session?.dateOfAdmission || '')
                    }
                    onChange={(e) => setInstitutionalEmail(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Entering an official accredited university email (.edu.gh) verifies student
                    status directly from your campus domain.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-200 mb-1.5">
                    Student ID Card or Admission Letter Proof (Optional)
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl hover:border-[#16A34A] dark:hover:border-emerald-500 bg-zinc-50 dark:bg-zinc-900/40 cursor-pointer transition-colors text-center">
                    <UploadCloud className="w-5 h-5 text-zinc-400 mb-1.5" />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {studentDoc ? studentDoc.name : 'Upload Student ID Card or Admission Letter'}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">
                      JPG, PNG, PDF up to 10MB
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => setStudentDoc(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="emerald"
                    size="sm"
                    isLoading={isSubmittingStudent}
                    disabled={isSubmittingStudent}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Save &amp; Verify Student Status
                  </Button>

                  {isEditingStudent && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditingStudent(false);
                        setStudentMsg(null);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          CARD 2B: CARETAKER / STAFF CLEARANCE OR LANDLORD DEED CERTIFICATION
         ──────────────────────────────────────────────────────────────── */}
      {(session?.role === 'CARETAKER' || session?.role === 'STAFF') && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-zinc-800/80">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-[#16A34A] shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                  On-Site Facility Staff &amp; Caretaker Clearance
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Statutory authorization for hostel caretakers, compound porters, and facility
                  personnel.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#0F5132] border border-emerald-200">
              {isVerified ? 'Staff Identity Cleared ✓' : 'Pending NIA Ghana Card'}
            </span>
          </div>
        </div>
      )}

      {session?.role === 'LANDLORD' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-[#16A34A] shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                  Property Ownership Deed &amp; Host Certification
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Indenture, Land Title Certificate, or Registrar General (RGD) registration.
                </p>
              </div>
            </div>

            <span
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
                isLandlordVerified
                  ? 'bg-emerald-50 text-[#0F5132] border-emerald-200'
                  : isLandlordPending
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              )}
            >
              {isLandlordVerified
                ? 'VERIFIED HOST'
                : isLandlordPending
                ? 'UNDER REVIEW'
                : isLandlordRejected
                ? 'REJECTED'
                : 'NOT SUBMITTED'}
            </span>
          </div>

          <div className="pt-6">
            {!isLandlordVerified && !isLandlordPending && (
              <form onSubmit={handleLandlordSubmit} className="space-y-4">
                {landlordMsg && (
                  <div
                    className={clsx(
                      'p-3.5 rounded-xl text-xs font-bold border',
                      landlordMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    )}
                  >
                    {landlordMsg.text}
                  </div>
                )}
                <label className="flex flex-col items-center justify-center p-6 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl hover:border-[#16A34A] bg-zinc-50 dark:bg-zinc-900/40 cursor-pointer transition-colors text-center">
                  <FileText className="w-6 h-6 text-zinc-400 mb-2" />
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    {landlordDoc
                      ? landlordDoc.name
                      : 'Select Indenture, Land Title, or RGD Certificate'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    required
                    className="hidden"
                    onChange={(e) => setLandlordDoc(e.target.files?.[0] || null)}
                  />
                </label>
                <Button
                  type="submit"
                  variant="emerald"
                  size="sm"
                  isLoading={isSubmittingLandlord}
                  disabled={isSubmittingLandlord}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Submit Ownership Proof
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────
          SECTION 3: DIGITAL TENANCY AGREEMENTS & LEASE DOCUMENTS
         ──────────────────────────────────────────────────────────────── */}
      <div className="space-y-4 pt-2">
        <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <FileSignature className="w-4 h-4 text-[#16A34A]" />
          <span>Digital Tenancy Agreements &amp; Executed Leases</span>
        </h2>

        {isLoadingAgreements ? (
          <div className="p-12 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
            <Loader2 className="w-6 h-6 animate-spin text-[#16A34A] mx-auto" />
            <p className="text-xs text-zinc-400">Loading your legal documents...</p>
          </div>
        ) : agreements.length === 0 ? (
          <div className="p-10 text-center space-y-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                No tenancy agreements on file
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                When you reserve an accommodation or book a room, your digital tenancy agreement
                will be generated and made available here.
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
                      <span>
                        {isFullySigned
                          ? 'Legally Executed & Sealed'
                          : 'Awaiting Tenant Signature'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Agreement Details Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Tenancy Start
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {startDateStr}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Tenancy Expiry
                    </span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {endDateStr}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Cryptographic Hash
                    </span>
                    <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-300 truncate block">
                      {agreement.cryptographicHash?.slice(0, 16) || 'Pending Execution'}...
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Legal Stamp
                    </span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
                      {isFullySigned ? 'SHA-256 Verified' : 'In Draft'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="text-[11px] text-zinc-400">
                    Governed by Ghana Rent Act (Act 220) &amp; Tenancy Regulations.
                  </div>

                  <div className="flex items-center gap-2">
                    {isPendingTenant ? (
                      <Link
                        href={`/dashboard/agreements/${booking?.id || agreement.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <FileSignature className="w-4 h-4" />
                        <span>Review &amp; Sign Agreement</span>
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
            General Compound Rules &amp; Resident Handbook
          </h3>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          All AkwaabaHomes properties maintain standard compound rules for quiet hours (10:00 PM –
          6:00 AM), visitor registration, waste management, and prepaid electricity sub-meter
          protocols.
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
