'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import api from '@/lib/axios';
import {
  FileText,
  FileSignature,
  Download,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building2,
  ArrowRight,
  Loader2,
  BookOpen,
  CreditCard,
  UploadCloud,
  AlertCircle,
  GraduationCap,
  Eye,
  RefreshCw,
  Lock,
  MapPin,
  Calendar,
  Headphones,
  X,
  Check,
  PenLine,
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

  // Primary active completed agreement (if available)
  const primaryAgreement =
    agreements.find((a: any) => a.status === 'COMPLETED' || a.status === 'SIGNED') ||
    agreements[0] ||
    null;
  const hasActiveAgreement = Boolean(
    primaryAgreement && (primaryAgreement.status === 'COMPLETED' || primaryAgreement.status === 'SIGNED')
  );

  const activePropertyName = (
    primaryAgreement?.booking?.property?.title || 'Residential Residence'
  ).toUpperCase();
  const activePropertyLocation =
    primaryAgreement?.booking?.property?.location ||
    primaryAgreement?.booking?.property?.address ||
    'Accra, Ghana';
  const activeLandlordName = primaryAgreement?.booking?.property?.landlord
    ? `${primaryAgreement.booking.property.landlord.firstName || ''} ${
        primaryAgreement.booking.property.landlord.lastName || ''
      }`.trim()
    : 'Property Landlord';
  const activeStartDate = primaryAgreement?.booking?.startDate
    ? new Date(primaryAgreement.booking.startDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
  const activeEndDate = primaryAgreement?.booking?.endDate
    ? new Date(primaryAgreement.booking.endDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';
  const activeHash = primaryAgreement?.cryptographicHash
    ? `${primaryAgreement.cryptographicHash.slice(0, 8)}...${primaryAgreement.cryptographicHash.slice(-8)}`
    : '';

  // ── 3. Interactive Modal States ──
  const [ghanaCardModalMode, setGhanaCardModalMode] = useState<'view' | 'edit' | null>(null);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [studentModalMode, setStudentModalMode] = useState<'view' | 'edit'>('view');
  const [handbookModalOpen, setHandbookModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [agreementPreviewOpen, setAgreementPreviewOpen] = useState(false);

  // ── 4. Ghana Card Verification Form State & Handlers ──
  const [ghanaCardNumber, setGhanaCardNumber] = useState('');
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [isSubmittingGhanaCard, setIsSubmittingGhanaCard] = useState(false);
  const [ghanaCardMessage, setGhanaCardMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);

  // ── 5. Student Verification Form State & Handlers ──
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
      refetchSession();
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setTimeout(() => setGhanaCardModalMode('view'), 900);
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
      refetchSession();
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setTimeout(() => setStudentModalMode('view'), 900);
    } catch (err: any) {
      setStudentMsg({
        text: err.response?.data?.message || 'Failed to update student verification',
        type: 'error',
      });
    } finally {
      setIsSubmittingStudent(false);
    }
  };

  const handleDownloadPDF = async (bookingId?: string) => {
    if (!bookingId) {
      toast.error('No active booking ID found for agreement download.');
      return;
    }
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

  // Dynamic Ghana Card status & masked PIN display
  const ghanaCardStatus = session?.ghanaCardStatus || 'NOT_SUBMITTED';
  const isGhanaCardVerified = ghanaCardStatus === 'VERIFIED';
  const isGhanaCardPending = ghanaCardStatus === 'PENDING' || ghanaCardStatus === 'UNDER_REVIEW';
  const isGhanaCardRejected =
    ghanaCardStatus === 'REJECTED' || ghanaCardStatus === 'RESUBMISSION_REQUIRED';

  const maskedGhanaCardDisplay = (() => {
    const raw = session?.ghanaCardNumber;
    if (raw && !raw.includes(':') && raw.length >= 4) {
      const last4 = raw.replace(/[^0-9]/g, '').slice(-4) || '1234';
      return `********${last4}`;
    }
    return raw ? raw : 'Not Submitted';
  })();

  const lastGhanaCardVerifiedDate = session?.ghanaCardReviewedAt
    ? new Date(session.ghanaCardReviewedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : isGhanaCardVerified
    ? 'Verified'
    : isGhanaCardPending
    ? 'Under Review'
    : 'Not Verified';

  // Dynamic Student Clearance status & display
  const hasStudentCredentials = Boolean(session?.campus || session?.studentId);
  const isStudentVerified = session?.studentType === 'VERIFIED' || hasStudentCredentials;
  const displayCampus = session?.campus || 'Not specified';
  const displayProgramme = session?.programmeOfStudy || 'Not specified';
  const displayLevel = session?.yearOfStudy
    ? session.yearOfStudy.replace(/Level\s*/i, '')
    : '';

  const openStudentModal = (mode: 'view' | 'edit') => {
    setCampus(session?.campus || '');
    setStudentId(session?.studentId || '');
    setProgrammeOfStudy(session?.programmeOfStudy || '');
    setYearOfStudy(session?.yearOfStudy || 'Level 100');
    setInstitutionalEmail(session?.dateOfAdmission || session?.email || '');
    setStudentMsg(null);
    setStudentModalMode(mode);
    setStudentModalOpen(true);
  };

  // Dynamic user profile name
  const userFullName =
    `${session?.firstName || ''} ${session?.lastName || ''}`.trim() || 'Verified Resident';

  // Dynamic Document Activity Timeline
  const dynamicDocumentActivities = (() => {
    const list: Array<{ title: string; desc: string; date: string; icon: any }> = [];

    if (isGhanaCardVerified) {
      list.push({
        title: 'Ghana Card verified',
        desc: 'Your national ID was successfully reviewed and cleared.',
        date: lastGhanaCardVerifiedDate,
        icon: CreditCard,
      });
    } else if (isGhanaCardPending) {
      list.push({
        title: 'Ghana Card submitted',
        desc: 'Your national ID document is currently under review.',
        date: 'Pending',
        icon: CreditCard,
      });
    }

    if (hasStudentCredentials) {
      list.push({
        title: 'Academic status cleared',
        desc: `Student record on file for ${displayCampus}.`,
        date: 'Verified',
        icon: GraduationCap,
      });
    }

    agreements.forEach((a: any) => {
      const isSigned = a.status === 'COMPLETED' || a.status === 'SIGNED';
      const pName = a.booking?.property?.title || 'residential unit';
      list.push({
        title: isSigned ? 'Lease signed & sealed' : 'Lease generated',
        desc: isSigned
          ? `Tenancy agreement executed for ${pName}.`
          : `Tenancy agreement awaiting execution for ${pName}.`,
        date: a.updatedAt
          ? new Date(a.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          : 'Recent',
        icon: FileSignature,
      });
    });

    return list;
  })();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F6F0] dark:bg-[#0D100E] text-[#14221A] dark:text-zinc-100 flex flex-col justify-between relative overflow-x-hidden font-sans">
      {/* Main Content Container */}
      <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-7 lg:px-10 pt-5 pb-6 flex-1 flex flex-col justify-between gap-4">
        {/* ── 1. HERO TITLE BANNER WITH APARTMENT BUILDING & PALM TREES ── */}
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between min-h-[96px] pb-1">
          <div className="relative z-10 max-w-2xl pr-4">
            <h1 className="text-[28px] sm:text-[34px] lg:text-[38px] font-extrabold text-[#0B3B24] dark:text-emerald-400 tracking-tight leading-[1.12]">
              Documents &amp; Verification
            </h1>
            <p className="text-xs sm:text-[13.5px] text-[#3E4C43] dark:text-zinc-400 mt-1.5 font-medium">
              Your identity, academic clearance, tenancy agreements and resident resources — securely organised in one place.
            </p>
          </div>

          {/* Right Building & Palm Trees Graphic */}
          <div className="hidden lg:block absolute right-[-24px] top-[-14px] bottom-[-18px] w-[540px] pointer-events-none select-none overflow-hidden rounded-bl-3xl">
            <Image
              src="/images/documents/docs-header-building.jpg"
              alt="Akwaaba Homes Residence"
              fill
              priority
              sizes="540px"
              className="object-cover object-right"
            />
            {/* Soft left gradient fade into #F7F6F0 page background */}
            <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-[#F7F6F0] dark:from-[#0D100E] via-[#F7F6F0]/80 dark:via-[#0D100E]/80 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[#F7F6F0] dark:from-[#0D100E] to-transparent" />
          </div>
        </div>

        {/* ── 2. 4 KPI SUMMARY CARDS ROW ── */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* KPI 1: Ghana Card */}
          <div className="bg-[#FDFCF9] dark:bg-[#141A16] border border-[#E7E5DC] dark:border-zinc-800 rounded-2xl px-4 py-3.5 shadow-[0_2px_10px_rgba(11,59,36,0.03)] flex items-center gap-3.5">
            <div
              className={clsx(
                'w-11 h-11 rounded-xl border flex items-center justify-center shrink-0',
                isGhanaCardVerified
                  ? 'bg-[#EAF5EC] dark:bg-emerald-950/50 border-[#D4EBDA] dark:border-emerald-900/50 text-[#15803D] dark:text-emerald-400'
                  : isGhanaCardPending
                  ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400'
                  : isGhanaCardRejected
                  ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
              )}
            >
              <CreditCard className="w-5 h-5 stroke-[2.1]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold text-[#4A5950] dark:text-zinc-400 leading-tight">
                Ghana Card
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={clsx(
                    'text-[17px] font-extrabold leading-tight',
                    isGhanaCardVerified
                      ? 'text-[#117A37] dark:text-emerald-400'
                      : isGhanaCardPending
                      ? 'text-amber-600 dark:text-amber-400'
                      : isGhanaCardRejected
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                  )}
                >
                  {isGhanaCardVerified
                    ? 'Verified'
                    : isGhanaCardPending
                    ? 'Under Review'
                    : isGhanaCardRejected
                    ? 'Action Req.'
                    : 'Not Submitted'}
                </span>
                {isGhanaCardVerified && (
                  <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
                {isGhanaCardPending && (
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                )}
              </div>
            </div>
          </div>

          {/* KPI 2: Student Status */}
          <div className="bg-[#FDFCF9] dark:bg-[#141A16] border border-[#E7E5DC] dark:border-zinc-800 rounded-2xl px-4 py-3.5 shadow-[0_2px_10px_rgba(11,59,36,0.03)] flex items-center gap-3.5">
            <div
              className={clsx(
                'w-11 h-11 rounded-xl border flex items-center justify-center shrink-0',
                hasStudentCredentials
                  ? 'bg-[#EAF5EC] dark:bg-emerald-950/50 border-[#D4EBDA] dark:border-emerald-900/50 text-[#15803D] dark:text-emerald-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
              )}
            >
              <GraduationCap className="w-5 h-5 stroke-[2.1]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold text-[#4A5950] dark:text-zinc-400 leading-tight">
                Student Status
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={clsx(
                    'text-[17px] font-extrabold leading-tight truncate',
                    hasStudentCredentials
                      ? 'text-[#117A37] dark:text-emerald-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                  )}
                >
                  {hasStudentCredentials
                    ? displayCampus.includes('(')
                      ? `${displayCampus.split('(')[1].replace(')', '')} Cleared`
                      : `${displayCampus.split(' ')[0]} Cleared`
                    : 'Not Submitted'}
                </span>
                {hasStudentCredentials && (
                  <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* KPI 3: Executed Leases */}
          <div className="bg-[#FDFCF9] dark:bg-[#141A16] border border-[#E7E5DC] dark:border-zinc-800 rounded-2xl px-4 py-3.5 shadow-[0_2px_10px_rgba(11,59,36,0.03)] flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#EAF5EC] dark:bg-emerald-950/50 border border-[#D4EBDA] dark:border-emerald-900/50 flex items-center justify-center shrink-0 text-[#15803D] dark:text-emerald-400">
              <FileText className="w-5 h-5 stroke-[2.1]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold text-[#4A5950] dark:text-zinc-400 leading-tight">
                Executed Leases
              </p>
              <p className="text-[18px] font-extrabold text-[#14221A] dark:text-white leading-tight mt-0.5">
                {signedCount}
              </p>
            </div>
          </div>

          {/* KPI 4: Needs Your Signature */}
          <div className="bg-[#FDFCF9] dark:bg-[#141A16] border border-[#E7E5DC] dark:border-zinc-800 rounded-2xl px-4 py-3.5 shadow-[0_2px_10px_rgba(11,59,36,0.03)] flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#EAF5EC] dark:bg-emerald-950/50 border border-[#D4EBDA] dark:border-emerald-900/50 flex items-center justify-center shrink-0 text-[#15803D] dark:text-emerald-400">
              <PenLine className="w-5 h-5 stroke-[2.1]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold text-[#4A5950] dark:text-zinc-400 leading-tight">
                Needs Your Signature
              </p>
              <p className="text-[18px] font-extrabold text-[#14221A] dark:text-white leading-tight mt-0.5">
                {pendingCount}
              </p>
            </div>
          </div>
        </div>

        {/* ── 3. MAIN 2-COLUMN GRID (LEFT: IDENTITY & VAULT | RIGHT: ACTIVITY, HANDBOOK, HELP) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* ══════════════════════════════════════════════════════════════════
              LEFT COLUMN (7 COLS): Identity & eligibility + Tenancy agreement vault
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 flex flex-col gap-4 justify-between">
            {/* ── Card 1: Identity & eligibility ── */}
            <div className="bg-[#FDFCF9] dark:bg-[#141A16] border border-[#E7E5DC] dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(11,59,36,0.03)] space-y-3.5">
              {/* Card Header */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#117A37] text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[16px] sm:text-[17px] font-extrabold text-[#14221A] dark:text-white leading-snug">
                    Identity &amp; eligibility
                  </h2>
                  <p className="text-xs text-[#54635A] dark:text-zinc-400">
                    Your verified identity and student status.
                  </p>
                </div>
              </div>

              {/* Sub-card 1: Ghana Card • National ID */}
              <div className="bg-[#F7F5EE] dark:bg-zinc-900 border border-[#EAE7DD] dark:border-zinc-800 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Cropped Ghana Card Illustration */}
                  <div className="w-[116px] h-[72px] relative rounded-lg overflow-hidden shrink-0 shadow-2xs border border-black/5 bg-[#EBE8DF] dark:bg-zinc-800">
                    <Image
                      src="/images/documents/ghana-card-illust.png"
                      alt="Ghana Card National ID"
                      fill
                      sizes="116px"
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-extrabold text-[#14221A] dark:text-white">
                        Ghana Card • National ID
                      </span>
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold',
                          isGhanaCardVerified
                            ? 'bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300'
                            : isGhanaCardPending
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : isGhanaCardRejected
                            ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        )}
                      >
                        {isGhanaCardVerified && (
                          <span className="w-3.5 h-3.5 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                        {isGhanaCardVerified
                          ? 'Verified'
                          : isGhanaCardPending
                          ? 'Under Review'
                          : isGhanaCardRejected
                          ? 'Resubmission Required'
                          : 'Not Submitted'}
                      </span>
                    </div>

                    <p className="text-[15px] font-extrabold tracking-wider text-[#14221A] dark:text-zinc-200 font-mono">
                      {maskedGhanaCardDisplay}
                    </p>

                    <p className="text-[11px] text-[#5B6960] dark:text-zinc-400 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#6D7B72]" />
                      <span>Status: {lastGhanaCardVerifiedDate}</span>
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {session?.ghanaCardNumber && (
                    <button
                      type="button"
                      onClick={() => {
                        setGhanaCardNumber(
                          session?.ghanaCardNumber && !session.ghanaCardNumber.includes(':')
                            ? session.ghanaCardNumber
                            : ''
                        );
                        setGhanaCardMessage(null);
                        setGhanaCardModalMode('view');
                      }}
                      className="px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-[#D5D3C8] dark:border-zinc-700 text-[#1E2E24] dark:text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#3B4C41] dark:text-zinc-300" />
                      <span>View verification</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setGhanaCardNumber(
                        session?.ghanaCardNumber && !session.ghanaCardNumber.includes(':')
                          ? session.ghanaCardNumber
                          : ''
                      );
                      setGhanaCardMessage(null);
                      setGhanaCardModalMode('edit');
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#0B3B24] hover:bg-[#0E4B2E] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{session?.ghanaCardNumber ? 'Update details' : 'Upload card'}</span>
                  </button>
                </div>
              </div>

              {/* Sub-card 2: Tertiary student clearance */}
              <div className="bg-[#F7F5EE] dark:bg-zinc-900 border border-[#EAE7DD] dark:border-zinc-800 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Cropped 3D Graduation Cap Illustration */}
                  <div className="w-[116px] h-[66px] relative rounded-lg overflow-hidden shrink-0 bg-[#EFECE3] dark:bg-zinc-800 border border-black/5">
                    <Image
                      src="/images/documents/grad-cap-illust.png"
                      alt="Tertiary Student Clearance"
                      fill
                      sizes="116px"
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <h3 className="text-[14px] font-extrabold text-[#14221A] dark:text-white">
                      Tertiary student clearance
                    </h3>
                    <p className="text-xs text-[#2B3B31] dark:text-zinc-300 font-medium truncate">
                      {hasStudentCredentials ? (
                        <>
                          {displayCampus}
                          {displayProgramme !== 'Not specified' && (
                            <>
                              <span className="text-zinc-400 mx-1">|</span> {displayProgramme}
                            </>
                          )}
                          {displayLevel && (
                            <>
                              <span className="text-zinc-400 mx-1">|</span> Level: {displayLevel}
                            </>
                          )}
                        </>
                      ) : (
                        'No student credentials recorded.'
                      )}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {hasStudentCredentials ? (
                        <>
                          <span className="text-xs font-bold text-[#2B3B31] dark:text-zinc-300 font-mono">
                            Student ID: {session?.studentId || 'Recorded'}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300 text-[10.5px] font-bold">
                            <span className="w-3.5 h-3.5 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 stroke-[3]" />
                            </span>
                            Verified student
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          Clear your academic credentials to unlock student-discounted hostels.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => openStudentModal(hasStudentCredentials ? 'view' : 'edit')}
                    className="px-3.5 py-2 rounded-lg bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 border border-[#D5D3C8] dark:border-zinc-700 text-[#1E2E24] dark:text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#15803D] dark:text-emerald-400" />
                    <span>
                      {hasStudentCredentials ? 'View academic record' : 'Submit student record'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Card 2: Tenancy agreement vault (Dark Forest Green Card) ── */}
            {hasActiveAgreement ? (
              <div className="relative rounded-2xl bg-gradient-to-br from-[#0B3B24] via-[#0D4028] to-[#082B1A] text-white p-4 sm:p-5 shadow-[0_6px_20px_rgba(8,43,26,0.18)] overflow-hidden">
                <div className="absolute -right-12 -top-12 w-56 h-56 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />

                {/* Top Header Row */}
                <div className="relative z-10 flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="w-4 h-4 text-emerald-300" />
                    </div>
                    <div>
                      <h2 className="text-[16px] sm:text-[17px] font-extrabold text-white leading-tight">
                        Tenancy agreement vault
                      </h2>
                      <p className="text-xs text-emerald-100/80 mt-0.5">
                        Your executed tenancy agreement for {activePropertyName}.
                      </p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#135435] border border-emerald-400/30 text-emerald-200 text-[11px] font-bold">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#22C55E] text-[#082B1A] inline-flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    Legally executed &amp; sealed
                  </span>
                </div>

                {/* Content Row: Tilted Document Illustration on Left + Details & Actions on Right */}
                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4 pt-1">
                  {/* Left: 3D Tilted Tenancy Agreement Graphic */}
                  <div className="w-[144px] h-[126px] relative shrink-0 -mb-2 -ml-1 select-none">
                    <Image
                      src="/images/documents/tenancy-agreement-doc.png"
                      alt="Executed Tenancy Agreement"
                      fill
                      sizes="144px"
                      className="object-contain"
                    />
                  </div>

                  {/* Right: Property Info + Bottom SHA-256 & Action Bar */}
                  <div className="flex-1 w-full space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 pb-3 border-b border-white/10">
                      <div>
                        <h3 className="text-[18px] sm:text-[19px] font-extrabold tracking-wide text-white uppercase">
                          {activePropertyName}
                        </h3>
                        <p className="text-xs text-emerald-100/85 flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                          <span>{activePropertyLocation}</span>
                        </p>
                      </div>

                      <div className="hidden sm:block h-9 w-px bg-white/15" />

                      <div className="space-y-1 text-xs text-emerald-100/90">
                        <p className="flex items-center gap-1.5 font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                          <span>Landlord: {activeLandlordName}</span>
                        </p>
                        {activeStartDate && (
                          <p className="flex items-center gap-1.5 text-emerald-100/80">
                            <Calendar className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                            <span>
                              {activeStartDate} — {activeEndDate}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: SHA-256 Verified Hash + Open Agreement + Download PDF */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-emerald-300 shrink-0">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-[11.5px] font-bold text-white leading-tight">
                            SHA-256 verified
                          </p>
                          <p className="text-[11px] font-mono text-emerald-200/75 leading-tight">
                            {activeHash || 'Cryptographically verified'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {primaryAgreement?.id ? (
                          <Link
                            href={`/dashboard/agreements/${primaryAgreement.id}`}
                            className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/25 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Open agreement</span>
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAgreementPreviewOpen(true)}
                            className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/25 text-white text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Open agreement</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDownloadPDF(primaryAgreement?.bookingId)}
                          className="px-3.5 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl bg-[#FAF9F4] dark:bg-[#141A16] border border-[#E6E4DA] dark:border-zinc-800 p-5 shadow-[0_2px_10px_rgba(11,59,36,0.03)] space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EAF5EC] dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center shrink-0">
                      <FileSignature className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-[16px] font-extrabold text-[#14221A] dark:text-white leading-tight">
                        Tenancy Agreement Vault
                      </h2>
                      <p className="text-xs text-[#54635A] dark:text-zinc-400 mt-0.5">
                        Digital lease agreements executed under the Ghana Rent Act.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#EAE8DF] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold">
                    0 Executed
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-[#E7E5DC] dark:border-zinc-800 space-y-2">
                  <p className="text-xs font-bold text-[#14221A] dark:text-white">
                    No executed tenancy agreements on record
                  </p>
                  <p className="text-xs text-[#54635A] dark:text-zinc-400 leading-relaxed">
                    Once your rental booking is confirmed and both you and your property owner digitally sign the tenancy agreement, your tamper-proof SHA-256 sealed contract will be accessible here for instant preview and PDF download.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Link
                    href="/dashboard/agreements"
                    className="px-4 py-2 rounded-xl bg-[#0B3B24] hover:bg-[#072B1D] text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Agreements Portal</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT COLUMN (5 COLS): Document activity + Resident handbook + Need help
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 flex flex-col gap-4 justify-between">
            {/* ── Card 1: Document activity ── */}
            <div className="bg-[#FDFCF9] dark:bg-[#141A16] border border-[#E7E5DC] dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(11,59,36,0.03)]">
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#0B3B24] dark:text-emerald-400 stroke-[2.2]" />
                  <h2 className="text-[15.5px] font-extrabold text-[#14221A] dark:text-white">
                    Document activity
                  </h2>
                </div>
                {dynamicDocumentActivities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActivityModalOpen(true)}
                    className="text-xs font-bold text-[#15803D] hover:text-[#0B3B24] dark:text-emerald-400 dark:hover:text-emerald-300 inline-flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>View all</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Timeline List */}
              {dynamicDocumentActivities.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  <p>No document activity recorded yet.</p>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                    Submissions, clearances, and agreements will log here automatically.
                  </p>
                </div>
              ) : (
                <div className="relative pl-3 space-y-3.5 before:content-[''] before:absolute before:left-[15px] before:top-3 before:bottom-3 before:w-[1.5px] before:bg-[#D5E6D9] dark:before:bg-zinc-800">
                  {dynamicDocumentActivities.slice(0, 3).map((act, idx) => {
                    const IconComp = act.icon || FileText;
                    return (
                      <div key={idx} className="relative flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A] ring-4 ring-[#EAF5EC] dark:ring-emerald-950/60 mt-1.5 shrink-0 relative z-10" />
                          <div className="w-7 h-7 rounded-lg bg-[#EAF5EC] dark:bg-emerald-950/50 text-[#15803D] dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-[#14221A] dark:text-white">
                              {act.title}
                            </p>
                            <p className="text-[11px] text-[#5B6960] dark:text-zinc-400 leading-snug">
                              {act.desc}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-[10.5px] text-[#69776E] dark:text-zinc-400 shrink-0 leading-tight">
                          <p className="font-semibold">{act.date}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Card 2: Resident handbook (Warm Cream/Peach Card) ── */}
            <div className="bg-gradient-to-br from-[#FBF3E4] to-[#F7E8D0] dark:from-[#201A12] dark:to-[#17140F] border border-[#DFCBB3] dark:border-amber-900/40 rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(180,120,50,0.05)] relative overflow-hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#FFF8EE] dark:bg-amber-950/60 border border-[#E6CFAF] dark:border-amber-800/40 text-[#D97706] flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <h2 className="text-[15.5px] font-extrabold text-[#14221A] dark:text-white leading-tight">
                        Resident handbook
                      </h2>
                      <p className="text-[11.5px] text-[#5A5246] dark:text-amber-200/80">
                        Know the rules. Enjoy your stay.
                      </p>
                    </div>
                  </div>

                  {/* 4 Check Items */}
                  <ul className="space-y-1.5 pt-0.5">
                    {[
                      'Quiet hours: 10:00 PM – 6:00 AM',
                      'Visitor registration',
                      'Waste management',
                      'Prepaid electricity sub-meter protocols',
                    ].map((rule) => (
                      <li
                        key={rule}
                        className="flex items-center gap-2 text-xs font-semibold text-[#2A2621] dark:text-zinc-200"
                      >
                        <span className="w-4 h-4 rounded-full bg-[#EA580C]/15 text-[#EA580C] inline-flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                        <span>{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Right Building Thumbnail */}
                <div className="w-[108px] h-[112px] relative rounded-xl overflow-hidden shrink-0 border border-[#E5D3B8] dark:border-amber-900/50 shadow-xs hidden sm:block">
                  <Image
                    src="/images/documents/handbook-building.png"
                    alt="Resident Handbook Building"
                    fill
                    sizes="108px"
                    className="object-cover"
                  />
                </div>
              </div>

              <div className="mt-3.5 flex justify-center sm:justify-start sm:pl-14">
                <button
                  type="button"
                  onClick={() => setHandbookModalOpen(true)}
                  className="px-4 py-1.5 rounded-lg bg-[#FBF6EE] dark:bg-zinc-800 hover:bg-white dark:hover:bg-zinc-700 border border-[#9E9585] dark:border-zinc-700 text-[#14221A] dark:text-white text-xs font-bold inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <span>Read house guidelines</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── Card 3: Need help with a document? (Soft Mint Green Card) ── */}
            <div className="bg-[#EBF6EC] dark:bg-emerald-950/20 border border-[#CDE5D1] dark:border-emerald-900/40 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-[0_2px_10px_rgba(11,59,36,0.03)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#D8EEDD] dark:bg-emerald-900/50 text-[#0B3B24] dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[13.5px] font-extrabold text-[#14221A] dark:text-white">
                    Need help with a document?
                  </h3>
                  <p className="text-[11px] text-[#45584C] dark:text-zinc-300 leading-snug">
                    Our support team is ready to assist you with any document-related issue.
                  </p>
                </div>
              </div>

              <Link
                href="/support"
                className="px-3.5 py-2 rounded-lg bg-[#0B3B24] hover:bg-[#0E4B2E] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition shadow-2xs"
              >
                <span>Contact support</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. BOTTOM FOOTER BAR ── */}
      <footer className="w-full border-t border-[#E5E3D8] dark:border-zinc-800 bg-[#F3F1E8]/80 dark:bg-[#0D100E] py-3 px-4 sm:px-8 lg:px-12 mt-auto">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11.5px] text-[#4E5D53] dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0B3B24] dark:text-emerald-400" />
            <span>
              © 2026 <strong className="text-[#14221A] dark:text-white">Akwaaba Homes Ghana</strong> • Secure. Transparent. Student-Centric.
            </span>
          </div>
          <div className="flex items-center gap-3 font-semibold text-[#3B4A40] dark:text-zinc-300">
            <Link href="/privacy" className="hover:text-[#0B3B24] dark:hover:text-emerald-400 transition">
              Privacy
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Link href="/terms" className="hover:text-[#0B3B24] dark:hover:text-emerald-400 transition">
              Terms
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">|</span>
            <Link href="/support" className="hover:text-[#0B3B24] dark:hover:text-emerald-400 transition">
              Help
            </Link>
          </div>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1: GHANA CARD VERIFICATION (VIEW & UPDATE DETAILS)
         ══════════════════════════════════════════════════════════════════════ */}
      {ghanaCardModalMode && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#EAF5EC] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
                    {ghanaCardModalMode === 'view'
                      ? 'Ghana Card • National ID Record'
                      : 'Update Ghana Card Verification'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    National Identification Authority (NIA) Tier-1 Identity Vault
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGhanaCardModalMode(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {ghanaCardModalMode === 'view' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#F7F5EE] dark:bg-zinc-800/60 border border-[#E7E5DC] dark:border-zinc-700 flex items-center gap-4">
                  <div className="w-28 h-18 relative rounded-lg overflow-hidden shrink-0 border border-black/10">
                    <Image
                      src="/images/documents/ghana-card-illust.png"
                      alt="Ghana Card"
                      fill
                      sizes="112px"
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-1">
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold',
                        isGhanaCardVerified
                          ? 'bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300'
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                      )}
                    >
                      {isGhanaCardVerified ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Verified National ID
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" /> Under Verification
                        </>
                      )}
                    </span>
                    <p className="text-sm font-extrabold text-zinc-900 dark:text-white font-mono">
                      PIN: {maskedGhanaCardDisplay}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Holder: {userFullName}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700">
                    <p className="text-zinc-400 font-medium">Verification Status</p>
                    <p
                      className={clsx(
                        'font-bold mt-0.5',
                        isGhanaCardVerified
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      )}
                    >
                      {isGhanaCardVerified ? 'NIA Tier-1 Cleared' : 'Verification In Progress'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700">
                    <p className="text-zinc-400 font-medium">Last Verified Date</p>
                    <p className="font-bold text-zinc-900 dark:text-white mt-0.5">
                      {lastGhanaCardVerifiedDate}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700">
                    <p className="text-zinc-400 font-medium">Front Card Scan</p>
                    <p className="font-bold text-zinc-900 dark:text-white mt-0.5">
                      {session?.ghanaCardFrontUrl ? 'Encrypted & Stored' : 'Not Uploaded'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700">
                    <p className="text-zinc-400 font-medium">Reverse Barcode Scan</p>
                    <p className="font-bold text-zinc-900 dark:text-white mt-0.5">
                      {session?.ghanaCardBackUrl ? 'Encrypted & Stored' : 'Not Uploaded'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setGhanaCardModalMode(null)}
                    className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setGhanaCardModalMode('edit')}
                    className="px-4 py-2 rounded-lg bg-[#0B3B24] hover:bg-[#0E4B2E] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Update details</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGhanaCardSubmit} className="space-y-4">
                {ghanaCardMessage && (
                  <div
                    className={clsx(
                      'p-3 rounded-xl border text-xs font-medium flex items-center gap-2',
                      ghanaCardMessage.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                    )}
                  >
                    {ghanaCardMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{ghanaCardMessage.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Ghana Card Personal ID Number (PIN)
                  </label>
                  <input
                    type="text"
                    placeholder="GHA-XXXXXXXXX-X"
                    value={ghanaCardNumber}
                    onChange={(e) => setGhanaCardNumber(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Enter your 15-character National Identification Authority PIN (e.g. GHA-123456789-0).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Front Side of Ghana Card
                    </label>
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-[#16A34A] transition bg-zinc-50/60 dark:bg-zinc-800/50 text-center">
                      <UploadCloud className="w-5 h-5 text-zinc-400 mb-1" />
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-full px-2">
                        {frontImage ? frontImage.name : 'Upload Front Image'}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">JPG, PNG or PDF</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => setFrontImage(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Reverse Side of Ghana Card
                    </label>
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-[#16A34A] transition bg-zinc-50/60 dark:bg-zinc-800/50 text-center">
                      <UploadCloud className="w-5 h-5 text-zinc-400 mb-1" />
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate max-w-full px-2">
                        {backImage ? backImage.name : 'Upload Back Image'}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">JPG, PNG or PDF</span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => setBackImage(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setGhanaCardModalMode(null)}
                    className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingGhanaCard}
                    className="px-4 py-2 rounded-lg bg-[#0B3B24] hover:bg-[#0E4B2E] disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSubmittingGhanaCard ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Save &amp; Verify Ghana Card</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: TERTIARY STUDENT CLEARANCE (VIEW & UPDATE ACADEMIC RECORD)
         ══════════════════════════════════════════════════════════════════════ */}
      {studentModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#EAF5EC] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-400 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
                    {studentModalMode === 'view'
                      ? 'Tertiary Student Clearance Record'
                      : 'Update Academic Student Credentials'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    University &amp; Hostel Allocation Eligibility Record
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStudentModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {studentModalMode === 'view' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#F7F5EE] dark:bg-zinc-800/60 border border-[#E7E5DC] dark:border-zinc-700 flex items-center gap-4">
                  <div className="w-24 h-16 relative rounded-lg overflow-hidden shrink-0 border border-black/10">
                    <Image
                      src="/images/documents/grad-cap-illust.png"
                      alt="Graduation Cap"
                      fill
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300 text-[11px] font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Verified Student Status
                    </span>
                    <p className="text-sm font-extrabold text-zinc-900 dark:text-white">
                      {displayCampus}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {displayProgramme}
                      {displayLevel ? ` • Level ${displayLevel}` : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700">
                    <p className="text-zinc-400 font-medium">Student Number</p>
                    <p className="font-bold text-zinc-900 dark:text-white mt-0.5 font-mono">
                      {session?.studentId || 'Not Recorded'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700">
                    <p className="text-zinc-400 font-medium">Institutional Email</p>
                    <p className="font-bold text-zinc-900 dark:text-white mt-0.5 truncate">
                      {session?.dateOfAdmission || session?.email || 'Not Recorded'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700">
                    <p className="text-zinc-400 font-medium">Programme of Study</p>
                    <p className="font-bold text-zinc-900 dark:text-white mt-0.5">
                      {displayProgramme}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700">
                    <p className="text-zinc-400 font-medium">Academic Level</p>
                    <p className="font-bold text-zinc-900 dark:text-white mt-0.5">
                      {displayLevel ? `Level ${displayLevel}` : 'Not Specified'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStudentModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentModalMode('edit')}
                    className="px-4 py-2 rounded-lg bg-[#0B3B24] hover:bg-[#0E4B2E] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Update academic record</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleStudentSubmit} className="space-y-3.5">
                {studentMsg && (
                  <div
                    className={clsx(
                      'p-3 rounded-xl border text-xs font-medium flex items-center gap-2',
                      studentMsg.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                    )}
                  >
                    {studentMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{studentMsg.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Institution / Campus
                    </label>
                    <input
                      type="text"
                      list="ghana-universities-modal"
                      placeholder="e.g. University of Ghana, Legon (UG)"
                      value={campus}
                      onChange={(e) => setCampus(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    />
                    <datalist id="ghana-universities-modal">
                      <option value="University of Ghana, Legon (UG)" />
                      <option value="KNUST, Kumasi" />
                      <option value="University of Cape Coast (UCC)" />
                      <option value="UPSA, Accra" />
                      <option value="GIMPA, Greenhill" />
                      <option value="Ashesi University" />
                      <option value="Central University" />
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Student ID Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 10928374"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Programme of Study
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BSc Computer Engineering"
                      value={programmeOfStudy}
                      onChange={(e) => setProgrammeOfStudy(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                      Academic Level / Year
                    </label>
                    <select
                      value={yearOfStudy}
                      onChange={(e) => setYearOfStudy(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    >
                      <option value="Level 100">Level 100 (Freshman)</option>
                      <option value="Level 200">Level 200 (Sophomore)</option>
                      <option value="Level 300">Level 300 (Junior)</option>
                      <option value="Level 400">Level 400 (Final Year)</option>
                      <option value="Postgraduate">Postgraduate (Masters / PhD)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    University Institutional Email (.edu.gh Fast-Track)
                  </label>
                  <input
                    type="email"
                    placeholder="student@st.ug.edu.gh"
                    value={institutionalEmail}
                    onChange={(e) => setInstitutionalEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                    Student ID Card or Admission Letter (Optional)
                  </label>
                  <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-[#16A34A] transition bg-zinc-50/60 dark:bg-zinc-800/50">
                    <UploadCloud className="w-4 h-4 text-zinc-400" />
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                      {studentDoc ? studentDoc.name : 'Upload Student ID / Admission Letter'}
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => setStudentDoc(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStudentModalMode('view')}
                    className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingStudent}
                    className="px-4 py-2 rounded-lg bg-[#0B3B24] hover:bg-[#0E4B2E] disabled:opacity-60 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSubmittingStudent ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save Academic Record</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 3: TENANCY AGREEMENT PREVIEW MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {agreementPreviewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#16A34A]">
                  EXECUTED LEASE VAULT • GHANA RENT ACT (ACT 220)
                </span>
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-white mt-0.5">
                  Tenancy Agreement — {activePropertyName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAgreementPreviewOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700 space-y-2 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed relative overflow-hidden">
              {/* Centered Akwaaba Watermark Logo */}
              <div className="pointer-events-none select-none absolute inset-0 flex items-center justify-center z-0 opacity-[0.16]">
                <div className="w-60 h-60 relative">
                  <Image
                    src="/logo-light.png"
                    alt="Akwaaba Homes Watermark"
                    fill
                    priority
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="relative z-10 space-y-2">
                <p>
                  <strong>Property:</strong> {activePropertyName} ({activePropertyLocation})
                </p>
                <p>
                  <strong>Landlord:</strong> {activeLandlordName}
                </p>
                <p>
                  <strong>Tenant:</strong> {userFullName}
                </p>
                {activeStartDate && (
                  <p>
                    <strong>Term:</strong> {activeStartDate} — {activeEndDate}
                  </p>
                )}
                {activeHash && (
                  <p>
                    <strong>Digital Seal (SHA-256):</strong>{' '}
                    <span className="font-mono">{activeHash}</span>
                  </p>
                )}
                <hr className="border-zinc-200 dark:border-zinc-700 my-2" />
                <p className="text-[11.5px] text-zinc-600 dark:text-zinc-400">
                  This residential tenancy agreement has been digitally executed and cryptographically sealed under the Ghana Rent Act, 1963 (Act 220) and Electronic Transactions Act, 2008 (Act 772).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAgreementPreviewOpen(false)}
                className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Close
              </button>
              {primaryAgreement?.bookingId && (
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(primaryAgreement?.bookingId)}
                  className="px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 4: RESIDENT HANDBOOK & HOUSE GUIDELINES MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {handbookModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
                    Resident Handbook &amp; House Guidelines
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Know the rules. Enjoy your stay.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHandbookModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-[#FBF3E4]/60 dark:bg-zinc-800 border border-[#DFCBB3] dark:border-zinc-700">
                <p className="font-bold text-zinc-900 dark:text-white">1. Quiet hours: 10:00 PM – 6:00 AM</p>
                <p className="mt-0.5">
                  Maintain low audio levels in corridors, balconies, and shared study spaces during designated quiet hours.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#FBF3E4]/60 dark:bg-zinc-800 border border-[#DFCBB3] dark:border-zinc-700">
                <p className="font-bold text-zinc-900 dark:text-white">2. Visitor registration</p>
                <p className="mt-0.5">
                  All non-resident visitors must sign in at the security desk with a valid Ghana Card or Student ID and depart by 10:00 PM.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#FBF3E4]/60 dark:bg-zinc-800 border border-[#DFCBB3] dark:border-zinc-700">
                <p className="font-bold text-zinc-900 dark:text-white">3. Waste management</p>
                <p className="mt-0.5">
                  Dispose of bagged domestic waste in the designated compound bins daily before 8:00 AM.
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#FBF3E4]/60 dark:bg-zinc-800 border border-[#DFCBB3] dark:border-zinc-700">
                <p className="font-bold text-zinc-900 dark:text-white">
                  4. Prepaid electricity sub-meter protocols
                </p>
                <p className="mt-0.5">
                  Each unit is fitted with a dedicated ECG prepaid sub-meter. Top-ups and token history are accessible via the Utilities portal.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setHandbookModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#0B3B24] text-white text-xs font-bold cursor-pointer"
              >
                Got it, thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 5: DOCUMENT ACTIVITY AUDIT LOG MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {activityModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0B3B24] dark:text-emerald-400" />
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
                  Complete Document Activity Log
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActivityModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs overflow-y-auto flex-1 pr-1">
              {dynamicDocumentActivities.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                  <p>No document activity entries on file.</p>
                </div>
              ) : (
                dynamicDocumentActivities.map((act, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700 flex justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-white">{act.title}</p>
                      <p className="text-zinc-500 dark:text-zinc-400 mt-0.5">{act.desc}</p>
                    </div>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400 shrink-0 font-medium">
                      {act.date}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setActivityModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#0B3B24] text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
