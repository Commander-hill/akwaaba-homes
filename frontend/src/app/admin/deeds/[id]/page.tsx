'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  FileCheck, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  User, 
  ExternalLink, 
  BadgeCheck, 
  AlertTriangle, 
  CreditCard, 
  Phone, 
  Mail, 
  MessageSquare, 
  Eye, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Check, 
  Stamp, 
  MapPin, 
  IdCard, 
  Loader2, 
  ShieldCheck, 
  FileText,
  Clock,
  X
} from 'lucide-react';
import { getImageUrl } from '@/lib/utils';

export default function AdminLandlordDeedAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [rejectionNotes, setRejectionNotes] = useState<string>('');
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);

  // Lands Commission Checklist State
  const [checklist, setChecklist] = useState({
    titleSearch: false,
    sitePlan: false,
    identityMatch: false,
    encumbranceFree: false
  });

  const { data: landlord, isLoading } = useQuery({
    queryKey: ['admin-landlord-deeds-single', id],
    queryFn: async () => {
      const res = await api.get('/admin/landlord-deeds');
      const found = (res.data?.landlords || []).find((l: any) => l.id === id);
      if (found) return found;

      // Fallback lookup via admin users
      try {
        const userRes = await api.get('/admin/users');
        return (userRes.data?.users || []).find((u: any) => u.id === id);
      } catch {
        return null;
      }
    }
  });

  const auditMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: 'VERIFIED' | 'REJECTED'; notes?: string }) => {
      await api.put(`/admin/landlord-deeds/${id}/audit`, { status, notes });
    },
    onSuccess: (_, variables) => {
      if (variables.status === 'VERIFIED') {
        toast.success('Landlord property deed approved! Verified Landlord status granted.');
      } else {
        toast.success('Deed submission rejected. Compliance feedback dispatched.');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-landlord-deeds'] });
      queryClient.invalidateQueries({ queryKey: ['admin-landlord-deeds-single', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] });
      router.push('/admin/deeds');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update deed verification status.');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
          <p className="text-xs font-bold">Loading Land Title Deed audit file...</p>
        </div>
      </div>
    );
  }

  if (!landlord) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full text-center space-y-4 border border-slate-200 dark:border-slate-800 shadow-xl">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Landlord Deed Record Not Found</h2>
          <p className="text-xs text-slate-500">The deed record you are inspecting may have been archived or removed.</p>
          <Link
            href="/admin/deeds"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F5132] text-white text-xs font-bold rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Deeds Registry
          </Link>
        </div>
      </div>
    );
  }

  const allChecklistPassed = checklist.titleSearch && checklist.sitePlan && checklist.identityMatch && checklist.encumbranceFree;
  const rawDeedUrl = landlord.landlordDocUrl ? getImageUrl(landlord.landlordDocUrl) : null;
  const isPdf = rawDeedUrl?.toLowerCase().endsWith('.pdf');
  const cleanPhone = landlord.phoneNumber ? landlord.phoneNumber.replace(/[^0-9]/g, '') : '';
  const waNumber = cleanPhone.startsWith('0') ? '233' + cleanPhone.slice(1) : cleanPhone;
  const waUrl = waNumber 
    ? `https://wa.me/${waNumber}?text=${encodeURIComponent(`Hello ${landlord.firstName}, this is Akwaaba Homes Compliance regarding your Land Title Deed audit.`)}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Header & Breadcrumbs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/deeds"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Return to Landlord Deeds"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Link href="/admin/overview" className="hover:underline">Admin</Link>
                <span>/</span>
                <Link href="/admin/deeds" className="hover:underline">Land Title Deeds</Link>
                <span>/</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">{landlord.firstName} {landlord.lastName}</span>
              </div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Land Title &amp; Indenture Audit:</span>
                <span className="text-[#0F5132] dark:text-emerald-400">{landlord.firstName} {landlord.lastName}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              landlord.isVerifiedLandlord || landlord.landlordVerificationStatus === 'VERIFIED'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : landlord.landlordVerificationStatus === 'REJECTED'
                ? 'bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800'
                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}>
              {landlord.isVerifiedLandlord || landlord.landlordVerificationStatus === 'VERIFIED' ? (
                <>
                  <BadgeCheck className="w-4 h-4 text-emerald-600" />
                  Verified Landlord
                </>
              ) : landlord.landlordVerificationStatus === 'REJECTED' ? (
                <>
                  <XCircle className="w-4 h-4 text-red-600" />
                  Deed Rejected
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-600" />
                  Audit Pending
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left 2-Columns: Deed Inspection Canvas & Cross-Verification */}
          <div className="lg:col-span-2 space-y-6">

            {/* Document Canvas Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center font-bold">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Indenture / Land Title Deed Document
                    </h2>
                    <p className="text-xs text-slate-500">
                      High-resolution inspection canvas for Lands Commission stamps &amp; cadastral site plan
                    </p>
                  </div>
                </div>

                {rawDeedUrl && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-500 w-12 text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                      title="Reset Zoom"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setLightboxOpen(true)}
                      className="p-2 rounded-xl bg-[#0F5132] text-white hover:bg-[#146c43]"
                      title="Fullscreen Lightbox"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Document Display Canvas */}
              {rawDeedUrl ? (
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 min-h-[460px] flex items-center justify-center p-4">
                  {isPdf ? (
                    <div className="text-center space-y-3 text-white p-8">
                      <FileText className="w-16 h-16 mx-auto text-emerald-400" />
                      <div className="text-sm font-bold">PDF Indenture Document Attached</div>
                      <p className="text-xs text-slate-400 max-w-sm">
                        This landlord submitted a multi-page PDF document. Click below to inspect in browser viewer.
                      </p>
                      <a
                        href={rawDeedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F5132] hover:bg-[#146c43] text-white rounded-xl text-xs font-bold transition shadow-md"
                      >
                        <ExternalLink className="w-4 h-4" /> Open Full PDF in New Tab
                      </a>
                    </div>
                  ) : (
                    <div className="overflow-auto max-h-[620px] w-full flex items-center justify-center">
                      <img
                        src={rawDeedUrl}
                        alt="Landlord Deed Scan"
                        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                        className="transition-transform duration-150 max-w-full object-contain cursor-zoom-in"
                        onClick={() => setLightboxOpen(true)}
                      />
                    </div>
                  )}

                  <a
                    href={rawDeedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/75 hover:bg-black text-white text-xs font-bold rounded-xl backdrop-blur-md flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Full Resolution
                  </a>
                </div>
              ) : (
                <div className="p-16 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400 space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No deed or indenture document uploaded</p>
                  <p className="text-xs text-slate-400">The landlord has not submitted an ownership document for audit.</p>
                </div>
              )}
            </div>

            {/* Ghana Card Identity Cross-Reference */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
                    <IdCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Ghana Card Biometric Cross-Match
                    </h2>
                    <p className="text-xs text-slate-500">
                      Cross-reference name on land indenture with verified NIA Ghana Card
                    </p>
                  </div>
                </div>

                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                  landlord.ghanaCardStatus === 'VERIFIED'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  KYC: {landlord.ghanaCardStatus || 'NOT VERIFIED'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Ghana Card Preview */}
                {landlord.ghanaCardFrontUrl ? (
                  <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 aspect-video flex items-center justify-center relative">
                    <img
                      src={getImageUrl(landlord.ghanaCardFrontUrl)}
                      alt="Ghana Card Front"
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                      NIA Ghana Card (Front)
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 flex flex-col items-center justify-center">
                    <IdCard className="w-8 h-8 mb-2" />
                    <p className="text-xs font-bold">No Ghana Card front photo uploaded</p>
                  </div>
                )}

                {/* Identity Verification Strip */}
                <div className="space-y-3 text-xs bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Registered Name:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {landlord.firstName} {landlord.lastName}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">NIA PIN Number:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {landlord.ghanaCardNumber || 'Not Provided'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Account Email:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                      {landlord.email}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Phone Contact:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {landlord.phoneNumber || 'None'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Trust Score:</span>
                    <span className="font-black text-emerald-600">
                      ★ {landlord.reputationScore || 100} / 100
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Property Portfolio Associated */}
            {landlord.properties && landlord.properties.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white">
                    <Building2 className="w-4 h-4 text-[#0F5132]" />
                    Associated Property Portfolio ({landlord.properties.length})
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {landlord.properties.map((prop: any) => (
                    <div
                      key={prop.id}
                      className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between"
                    >
                      <div className="space-y-0.5 overflow-hidden">
                        <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {prop.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          📍 {prop.location}
                        </div>
                      </div>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                        prop.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        prop.approvalStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {prop.approvalStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Lands Commission Checklist & Decision Panel */}
          <div className="space-y-6">

            {/* Lands Commission Audit Checklist */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Lands Commission Audit Checklist
                </span>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  allChecklistPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {Object.values(checklist).filter(Boolean).length}/4 Verified
                </span>
              </div>

              <div className="space-y-2.5">
                {[
                  { key: 'titleSearch', label: '1. Lands Commission Deeds Registry Search Confirmed' },
                  { key: 'sitePlan', label: '2. Licensed Surveyor Cadastral Site Plan Verified' },
                  { key: 'identityMatch', label: '3. Grantee Name Matches NIA Ghana Card' },
                  { key: 'encumbranceFree', label: '4. Encumbrance & Boundary Litigation Free' }
                ].map(({ key, label }) => {
                  const checked = checklist[key as keyof typeof checklist];
                  return (
                    <label
                      key={key}
                      className="flex items-start gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setChecklist(prev => ({ ...prev, [key]: e.target.checked }))}
                        className="mt-0.5 rounded text-[#0F5132] focus:ring-[#0F5132]"
                      />
                      <span className={`text-xs font-bold ${checked ? 'text-[#0F5132] dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Direct Landlord Contact Rail */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                Landlord Direct Contact
              </span>

              <div className="space-y-2">
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs"
                  >
                    <MessageSquare className="w-4 h-4" /> Message on WhatsApp
                  </a>
                )}

                {landlord.phoneNumber && (
                  <a
                    href={`tel:${landlord.phoneNumber}`}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Phone className="w-4 h-4" /> Call {landlord.phoneNumber}
                  </a>
                )}
              </div>
            </div>

            {/* Audit Decision Panel */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider block border-b border-slate-100 dark:border-slate-800 pb-3">
                Audit Decision
              </span>

              {/* Rejection reason box toggle */}
              {showRejectForm ? (
                <div className="space-y-3 animate-in">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mandatory Rejection / Compliance Feedback *
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionNotes}
                    onChange={(e) => setRejectionNotes(e.target.value)}
                    placeholder="e.g. Missing Lands Commission regional stamp; site plan bar code unreadable; name on deed does not match Ghana Card."
                    className="w-full p-3 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectForm(false)}
                      className="w-1/2 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={auditMutation.isPending || !rejectionNotes.trim()}
                      onClick={() => auditMutation.mutate({ status: 'REJECTED', notes: rejectionNotes.trim() })}
                      className="w-1/2 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                    >
                      {auditMutation.isPending ? 'Submitting...' : 'Confirm Rejection'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    disabled={auditMutation.isPending}
                    onClick={() => auditMutation.mutate({ status: 'VERIFIED' })}
                    className="w-full py-3.5 bg-[#0F5132] hover:bg-[#146c43] text-white rounded-2xl font-black text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {auditMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <BadgeCheck className="w-4 h-4" />
                    )}
                    Approve Deed &amp; Grant Verified Badge
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRejectForm(true)}
                    className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-2xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Reject Deed with Compliance Reason
                  </button>
                </div>
              )}
            </div>

            {/* Act 220 Land Title Registry Guidance */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <Stamp className="w-5 h-5 shrink-0" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider">
                  Act 220 Statutory Deed Notice
                </h4>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Under Ghanaian property legislation, granting <strong>Verified Landlord</strong> status displays a public trust accreditation on all current and future listings published by this user.
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* Lightbox Zoom Modal */}
      {lightboxOpen && rawDeedUrl && !isPdf && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in">
          <div className="relative max-w-6xl w-full flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-3 text-white">
              <h3 className="font-extrabold text-base">Land Title Deed Inspection Lightbox</h3>
              <button
                onClick={() => setLightboxOpen(false)}
                className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold backdrop-blur-md"
              >
                Close (Esc)
              </button>
            </div>
            <div className="border border-white/20 rounded-2xl overflow-hidden max-h-[85vh] bg-black">
              <img src={rawDeedUrl} alt="Deed Fullscreen" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
