'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  BadgeCheck,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  User as UserIcon,
  Phone,
  Mail,
  Calendar,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileCheck,
  Building,
  Loader2,
  Lock,
  ExternalLink,
  ZoomIn,
  X,
  AlertCircle,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/lib/utils';

export default function AdminVerificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [targetAction, setTargetAction] = useState<'REJECT' | 'RESUBMISSION' | null>(null);

  // Fetch all users to locate this user record
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data;
    }
  });

  const user = (users as any[]).find((u: any) => u.id === userId);

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const res = await api.put(`/admin/verify-user/${id}`, { status, reason });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Ghana Card KYC status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setTargetAction(null);
      setDecisionReason('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update KYC status');
    }
  });

  const verifyLandlordMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.put(`/admin/verify-landlord/${id}`, { status });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Landlord deed verification updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to verify landlord deed');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-semibold text-slate-500">Loading statutory audit records...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">User Record Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          The requested applicant profile could not be located in the current database index.
        </p>
        <Link
          href="/admin/users"
          className="px-4 py-2 bg-[#0F5132] text-white rounded-xl text-xs font-bold transition"
        >
          Return to User Directory
        </Link>
      </div>
    );
  }

  const isNiaFormatValid = /^GHA-\d{9}-\d$/.test(user.ghanaCardNumber || '');

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-in">
      {/* ── Breadcrumbs & Navigation ── */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
          <Link href="/admin/dashboard" className="hover:text-emerald-600 transition">
            Admin Console
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/admin/users" className="hover:text-emerald-600 transition">
            User Directory
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 dark:text-zinc-200">KYC Verification</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Identity &amp; Ownership Verification
              </span>
              <span className="text-xs font-semibold text-slate-400">•</span>
              <span className="text-xs font-mono text-slate-500">ID: {user.id}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-3">
              <span>{user.firstName} {user.lastName}</span>
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                user.role === 'LANDLORD'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {user.role}
              </span>
            </h1>
          </div>

          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Directory
          </Link>
        </div>
      </div>

      {/* ── Main 2-Column Inspector ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Rail: High-Res Document Inspection (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Ghana Card Front */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Document 01: Ghana Card Front (National Identity)
              </h3>
              {user.ghanaCardFrontUrl && (
                <button
                  type="button"
                  onClick={() => setZoomedImage({ url: getImageUrl(user.ghanaCardFrontUrl), title: 'Ghana Card Front' })}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" /> Fullscreen Zoom
                </button>
              )}
            </div>

            <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-2 bg-slate-50 dark:bg-zinc-950 flex items-center justify-center min-h-[220px]">
              {user.ghanaCardFrontUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getImageUrl(user.ghanaCardFrontUrl)}
                  alt="Ghana Card Front"
                  className="max-h-72 object-contain rounded-xl w-full"
                />
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No front photo uploaded
                </div>
              )}
            </div>
          </div>

          {/* Ghana Card Back */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                Document 02: Ghana Card Back (Barcodes & Signature)
              </h3>
              {user.ghanaCardBackUrl && (
                <button
                  type="button"
                  onClick={() => setZoomedImage({ url: getImageUrl(user.ghanaCardBackUrl), title: 'Ghana Card Back' })}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" /> Fullscreen Zoom
                </button>
              )}
            </div>

            <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-2 bg-slate-50 dark:bg-zinc-950 flex items-center justify-center min-h-[220px]">
              {user.ghanaCardBackUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getImageUrl(user.ghanaCardBackUrl)}
                  alt="Ghana Card Back"
                  className="max-h-72 object-contain rounded-xl w-full"
                />
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No back photo uploaded
                </div>
              )}
            </div>
          </div>

          {/* Landlord Deed / Indenture (if Landlord) */}
          {user.role === 'LANDLORD' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-blue-200 dark:border-blue-900/50 p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  Landlord Document: Property Title Deed / Indenture
                </h3>
                {user.landlordDocUrl && (
                  <button
                    type="button"
                    onClick={() => setZoomedImage({ url: getImageUrl(user.landlordDocUrl), title: 'Property Ownership Deed / Indenture' })}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" /> Fullscreen Zoom
                  </button>
                )}
              </div>

              <div className="border-2 border-dashed border-blue-200 dark:border-blue-900/60 rounded-2xl p-2 bg-slate-50 dark:bg-zinc-950 flex items-center justify-center min-h-[220px]">
                {user.landlordDocUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getImageUrl(user.landlordDocUrl)}
                    alt="Property Deed"
                    className="max-h-80 object-contain rounded-xl w-full"
                  />
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50 text-blue-500" />
                    No property ownership deed or indenture uploaded yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Rail: Metadata & Decision Workspace (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Statutory Identification Check */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-emerald-600" />
              Statutory NIA Metadata
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 uppercase tracking-wider block font-bold text-[10px] mb-1">
                  Ghana Card PIN
                </span>
                <div className="flex items-center gap-2">
                  <code className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm border border-slate-200 dark:border-zinc-700 inline-block">
                    {user.ghanaCardNumber || 'NOT PROVIDED'}
                  </code>
                  {user.ghanaCardNumber && (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isNiaFormatValid
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {isNiaFormatValid ? '✓ NIA Format Valid' : '⚠ Non-standard PIN'}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block font-bold text-[10px]">
                    Current KYC Status
                  </span>
                  <span className="font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                    {user.ghanaCardStatus || 'NOT SUBMITTED'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase tracking-wider block font-bold text-[10px]">
                    Account Joined
                  </span>
                  <span className="font-semibold text-slate-700 dark:text-zinc-300 mt-0.5 block">
                    {new Date(user.createdAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium">{user.phoneNumber || 'No phone number'}</span>
                </div>
              </div>

              {user.ghanaCardRejectionReason && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-bold block mb-0.5">Previous Audit Feedback:</span>
                  &quot;{user.ghanaCardRejectionReason}&quot;
                </div>
              )}
            </div>
          </div>

          {/* Decision Panel */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
              Compliance Audit Action
            </h3>

            {targetAction && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {targetAction === 'RESUBMISSION' ? 'Request Resubmission Notice' : 'Statutory Rejection Reason'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTargetAction(null)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <textarea
                  rows={3}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder={
                    targetAction === 'RESUBMISSION'
                      ? 'e.g. The photo of the back of the card is blurry. Please upload a well-lit photo.'
                      : 'e.g. Document appears expired or does not match applicant legal name.'
                  }
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-emerald-500/40"
                />

                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setTargetAction(null)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={verifyMutation.isPending || !decisionReason.trim()}
                    onClick={() => {
                      verifyMutation.mutate({
                        id: user.id,
                        status: targetAction === 'RESUBMISSION' ? 'RESUBMISSION_REQUIRED' : 'REJECTED',
                        reason: decisionReason.trim()
                      });
                    }}
                    className={`px-4 py-1.5 text-xs font-extrabold text-white rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                      targetAction === 'RESUBMISSION' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {verifyMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Confirm {targetAction === 'RESUBMISSION' ? 'Resubmission Request' : 'Rejection'}
                  </button>
                </div>
              </div>
            )}

            {!targetAction && (
              <div className="space-y-2.5">
                {/* Approve Ghana Card */}
                <button
                  type="button"
                  disabled={verifyMutation.isPending || user.ghanaCardStatus === 'VERIFIED'}
                  onClick={() => verifyMutation.mutate({ id: user.id, status: 'VERIFIED' })}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {verifyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Approve Ghana Card Verification
                </button>

                {/* Verify Landlord Deed (if landlord) */}
                {user.role === 'LANDLORD' && (
                  <button
                    type="button"
                    disabled={verifyLandlordMutation.isPending}
                    onClick={() => verifyLandlordMutation.mutate({ id: user.id, status: 'VERIFIED' })}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-extrabold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {verifyLandlordMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileCheck className="w-4 h-4" />
                    )}
                    Verify Landlord Deed
                  </button>
                )}

                {/* Mark Under Review */}
                {user.ghanaCardStatus !== 'UNDER_REVIEW' && user.ghanaCardStatus !== 'VERIFIED' && (
                  <button
                    type="button"
                    disabled={verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate({ id: user.id, status: 'UNDER_REVIEW' })}
                    className="w-full py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" /> Mark Status as Under Review
                  </button>
                )}

                {/* Request Resubmission */}
                <button
                  type="button"
                  onClick={() => setTargetAction('RESUBMISSION')}
                  className="w-full py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Request Document Resubmission
                </button>

                {/* Reject ID */}
                <button
                  type="button"
                  onClick={() => setTargetAction('REJECT')}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject ID Submission
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Zoom */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-5xl w-full flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-3 text-white">
              <h3 className="font-extrabold text-sm">{zoomedImage.title}</h3>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold"
              >
                Close (Esc)
              </button>
            </div>
            <div className="border border-white/20 rounded-2xl overflow-hidden max-h-[85vh] bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={zoomedImage.url} alt={zoomedImage.title} className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
