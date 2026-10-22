'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  BadgeCheck,
  AlertCircle,
  Mail,
  Phone,
  ZoomIn,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileCheck,
  Loader2,
  FileText,
  ShieldCheck,
  Lock,
  User as UserIcon,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/lib/utils';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

function DocumentPreviewCard({
  title,
  docNumber,
  rawUrl,
  accentColor = 'emerald',
  onZoom,
  emptyMessage,
}: {
  title: string;
  docNumber: string;
  rawUrl?: string | null;
  accentColor?: 'emerald' | 'blue';
  onZoom: (url: string, title: string) => void;
  emptyMessage: string;
}) {
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

  const resolvedUrl = rawUrl ? getImageUrl(rawUrl) : null;
  const isPdf = resolvedUrl
    ? Boolean(resolvedUrl.toLowerCase().split('?')[0].endsWith('.pdf') || resolvedUrl.toLowerCase().includes('.pdf'))
    : false;

  return (
    <div
      className={`bg-white dark:bg-zinc-900 rounded-2xl border ${
        accentColor === 'blue' ? 'border-blue-200 dark:border-blue-900/60' : 'border-zinc-200 dark:border-zinc-800'
      } p-5 shadow-xs space-y-3`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${accentColor === 'blue' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
          <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-white">
            {docNumber}: {title}
          </h3>
        </div>
        {resolvedUrl && !loadError && (
          <div className="flex items-center gap-3">
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 cursor-pointer transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Direct Link
            </a>
            <button
              type="button"
              onClick={() => onZoom(resolvedUrl, title)}
              className={`text-xs font-bold ${
                accentColor === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
              } hover:underline flex items-center gap-1 cursor-pointer`}
            >
              <ZoomIn className="w-3.5 h-3.5" /> Fullscreen Zoom
            </button>
          </div>
        )}
      </div>

      <div
        className={`border border-dashed ${
          accentColor === 'blue'
            ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/20'
            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50'
        } dark:bg-zinc-950 rounded-xl p-3 flex items-center justify-center min-h-[220px] relative overflow-hidden`}
      >
        {!resolvedUrl ? (
          <div className="text-center py-10 text-zinc-400 text-xs space-y-1">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">{emptyMessage}</p>
          </div>
        ) : isPdf ? (
          <div className="text-center py-8 space-y-3">
            <FileText className="w-12 h-12 mx-auto text-blue-500" />
            <div className="text-xs font-bold text-zinc-900 dark:text-white">PDF Document Attached</div>
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-[#16A34A] text-white dark:text-zinc-900 dark:hover:text-white text-xs font-bold transition shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Inspect PDF Document
            </a>
          </div>
        ) : loadError ? (
          <div className="text-center py-8 space-y-3 text-xs">
            <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
            <div className="font-bold text-zinc-900 dark:text-white">Image Preview Unavailable</div>
            <p className="text-zinc-500 max-w-xs text-[11px]">
              Document proxy stream could not be loaded. You can retry or open the asset directly.
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setLoadError(false);
                  setLoading(true);
                  setRetryKey((k) => k + 1);
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-bold inline-flex items-center gap-1.5 text-xs transition cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-bold inline-flex items-center gap-1.5 text-xs transition"
              >
                <ExternalLink className="w-3 h-3" /> Open Directly
              </a>
            </div>
          </div>
        ) : (
          <div className="relative w-full flex items-center justify-center">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-50/80 dark:bg-zinc-950/80 z-10">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={retryKey}
              src={resolvedUrl}
              alt={title}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setLoadError(true);
              }}
              onClick={() => onZoom(resolvedUrl, title)}
              className={`max-h-72 object-contain rounded-lg w-full cursor-zoom-in transition-opacity duration-200 ${
                loading ? 'opacity-0' : 'opacity-100'
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminVerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'REJECT_KYC' | 'RESUBMIT_KYC' | 'REJECT_DEED' | null;
  }>({
    isOpen: false,
    type: null,
  });

  // Single-entity lookup from backend
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['admin-user', userId],
    queryFn: async () => {
      const res = await api.get(`/admin/users/${userId}`);
      return res.data;
    }
  });

  const verifyKycMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      const res = await api.put(`/admin/verify-user/${userId}`, { status, reason });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Identity verification status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-action-queue'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update verification status');
    }
  });

  const verifyLandlordDeedMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: string; notes?: string }) => {
      // Use landlord deed audit endpoint
      const res = await api.put(`/admin/verify-landlord/${userId}`, { status, notes });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Landlord title deed verification updated');
      queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-action-queue'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update deed verification');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-semibold text-zinc-500">Retrieving statutory identity documents...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-zinc-900 dark:text-white">Applicant Record Not Found</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-6">
          The requested statutory compliance file could not be located or has been archived.
        </p>
        <Link
          href="/admin/verifications"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
        >
          Return to Verification Queue
        </Link>
      </div>
    );
  }

  const isNiaFormatValid = /^GHA-\d{9}-\d$/.test(user.ghanaCardNumber || '');

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`${user.firstName} ${user.lastName}`}
        subtitle={`Statutory Identity & Ownership Inspection • ${user.role}`}
        badge={
          <div className="flex items-center gap-2">
            <AdminStatusBadge status={user.ghanaCardStatus || 'PENDING'} />
            {user.role === 'LANDLORD' && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                Landlord Deed: {user.landlordVerificationStatus || 'UNVERIFIED'}
              </span>
            )}
          </div>
        }
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Verifications', href: '/admin/verifications' },
          { label: `${user.firstName} ${user.lastName}` }
        ]}
        backUrl="/admin/verifications"
        backLabel="Back to Queue"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={user.role === 'LANDLORD' ? `/admin/landlords/${user.id}` : `/admin/tenants/${user.id}`}
              className="px-3.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition flex items-center gap-1.5"
            >
              <UserIcon className="w-3.5 h-3.5" /> Full Operational Profile
            </Link>
          </div>
        }
      />

      {/* 2-Column Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Document Evidence (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <DocumentPreviewCard
            title="Ghana Card Front (National Identity)"
            docNumber="Document 01"
            rawUrl={user.ghanaCardFrontUrl}
            accentColor="emerald"
            onZoom={(url, title) => setZoomedImage({ url, title })}
            emptyMessage="No Ghana Card front photo uploaded"
          />

          <DocumentPreviewCard
            title="Ghana Card Back (Barcodes & Signature)"
            docNumber="Document 02"
            rawUrl={user.ghanaCardBackUrl}
            accentColor="emerald"
            onZoom={(url, title) => setZoomedImage({ url, title })}
            emptyMessage="No Ghana Card back photo uploaded"
          />

          {user.role === 'LANDLORD' && (
            <DocumentPreviewCard
              title="Property Title Deed / Indenture"
              docNumber="Document 03"
              rawUrl={user.landlordDocUrl}
              accentColor="blue"
              onZoom={(url, title) => setZoomedImage({ url, title })}
              emptyMessage="No property ownership deed or indenture uploaded yet"
            />
          )}
        </div>

        {/* Right: Metadata & Adjudication Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Statutory NIA Identity Details */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-emerald-600" />
              Statutory NIA Metadata
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-zinc-500 uppercase tracking-wider block font-bold text-[10px] mb-1">
                  Ghana Card PIN (Act 843 Protected)
                </span>
                <div className="flex items-center gap-2">
                  <code className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm border border-zinc-200 dark:border-zinc-700 inline-block">
                    {user.ghanaCardNumber || user.maskedGhanaCard || 'NOT PROVIDED'}
                  </code>
                  {user.ghanaCardNumber && (
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isNiaFormatValid
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}>
                      {isNiaFormatValid ? '✓ Valid PIN Format' : '⚠ Non-standard PIN'}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block font-bold text-[10px]">
                    Current Status
                  </span>
                  <div className="mt-1">
                    <AdminStatusBadge status={user.ghanaCardStatus || 'PENDING'} />
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500 uppercase tracking-wider block font-bold text-[10px]">
                    Registered Since
                  </span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 mt-1 block">
                    {new Date(user.createdAt).toLocaleDateString('en-GB')}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-medium">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
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

          {/* Operational Adjudication Controls */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Compliance Adjudication
            </h3>

            <div className="space-y-2.5">
              {/* Approve Ghana Card */}
              <button
                type="button"
                disabled={verifyKycMutation.isPending || user.ghanaCardStatus === 'VERIFIED'}
                onClick={() => verifyKycMutation.mutate({ status: 'VERIFIED' })}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {verifyKycMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Approve Ghana Card KYC
              </button>

              {/* Verify Landlord Title Deed (if Landlord) */}
              {user.role === 'LANDLORD' && (
                <button
                  type="button"
                  disabled={verifyLandlordDeedMutation.isPending || user.landlordVerificationStatus === 'VERIFIED'}
                  onClick={() => verifyLandlordDeedMutation.mutate({ status: 'VERIFIED' })}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {verifyLandlordDeedMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileCheck className="w-4 h-4" />
                  )}
                  Approve Landlord Title Deed
                </button>
              )}

              {/* Mark Status as Under Review */}
              {user.ghanaCardStatus !== 'UNDER_REVIEW' && user.ghanaCardStatus !== 'VERIFIED' && (
                <button
                  type="button"
                  disabled={verifyKycMutation.isPending}
                  onClick={() => verifyKycMutation.mutate({ status: 'UNDER_REVIEW' })}
                  className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" /> Mark Status as Under Review
                </button>
              )}

              {/* Request Document Resubmission */}
              <button
                type="button"
                onClick={() => setConfirmDialog({ isOpen: true, type: 'RESUBMIT_KYC' })}
                className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Request Resubmission
              </button>

              {/* Reject ID Submission */}
              <button
                type="button"
                onClick={() => setConfirmDialog({ isOpen: true, type: 'REJECT_KYC' })}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject ID Submission
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audited Confirmation Dialog */}
      <AdminConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: null })}
        title={
          confirmDialog.type === 'RESUBMIT_KYC'
            ? 'Request Document Resubmission'
            : 'Reject Identity Verification'
        }
        description={
          confirmDialog.type === 'RESUBMIT_KYC'
            ? `Please specify why the uploaded identity document is insufficient for ${user.firstName} ${user.lastName}. The user will receive an in-app notice to re-upload.`
            : `Are you sure you want to reject the statutory identity submission for ${user.firstName} ${user.lastName}? This will restrict their platform capabilities.`
        }
        confirmLabel={
          confirmDialog.type === 'RESUBMIT_KYC'
            ? 'Send Resubmission Request'
            : 'Confirm Rejection'
        }
        confirmVariant={confirmDialog.type === 'RESUBMIT_KYC' ? 'warning' : 'danger'}
        requireReason={true}
        reasonLabel="Audited Feedback for Applicant"
        reasonPlaceholder={
          confirmDialog.type === 'RESUBMIT_KYC'
            ? 'e.g. Back of Ghana card is blurry and barcode cannot be scanned. Please re-upload in good lighting.'
            : 'e.g. Document expired or name does not correspond to applicant records.'
        }
        onConfirm={async (reason) => {
          if (confirmDialog.type === 'RESUBMIT_KYC') {
            await verifyKycMutation.mutateAsync({
              status: 'RESUBMISSION_REQUIRED',
              reason
            });
          } else if (confirmDialog.type === 'REJECT_KYC') {
            await verifyKycMutation.mutateAsync({
              status: 'REJECTED',
              reason
            });
          }
        }}
      />

      {/* Fullscreen Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-6xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center w-full mb-3 text-white">
              <h3 className="font-bold text-sm tracking-wide">{zoomedImage.title}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={zoomedImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open in New Tab
                </a>
                <button
                  type="button"
                  onClick={() => setZoomedImage(null)}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Close (Esc)
                </button>
              </div>
            </div>
            <div className="border border-white/15 rounded-2xl overflow-hidden max-h-[85vh] bg-zinc-950 flex items-center justify-center w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={zoomedImage.url} alt={zoomedImage.title} className="max-h-[82vh] w-auto max-w-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
