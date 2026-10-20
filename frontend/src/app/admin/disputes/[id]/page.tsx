'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building,
  User as UserIcon,
  ShieldAlert,
  Calendar,
  AlertCircle,
  Loader2,
  ZoomIn,
  Camera,
  Star,
  Mail,
  Phone,
  Gavel
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/lib/utils';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

export default function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const disputeId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [adjudicateDialog, setAdjudicateDialog] = useState<{
    isOpen: boolean;
    status: 'VERIFIED' | 'REJECTED' | null;
  }>({
    isOpen: false,
    status: null
  });
  const [penaltyPoints, setPenaltyPoints] = useState<number>(1.0);
  const [suspendRespondent, setSuspendRespondent] = useState<boolean>(false);

  const { data: dispute, isLoading, error } = useQuery({
    queryKey: ['admin-dispute', disputeId],
    queryFn: async () => {
      const res = await api.get(`/admin/disputes/${disputeId}`);
      return res.data;
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async ({
      status,
      adminNotes,
      penaltyDeduction,
      suspendAccount
    }: {
      status: 'VERIFIED' | 'REJECTED';
      adminNotes: string;
      penaltyDeduction?: number;
      suspendAccount?: boolean;
    }) => {
      const res = await api.put(`/admin/breaches/${disputeId}/resolve`, {
        status,
        adminNotes,
        penaltyDeduction,
        suspendAccount
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      if (variables.status === 'VERIFIED') {
        toast.success('Breach verified. Penalty applied to tenant reputation.');
      } else {
        toast.success('Dispute claim dismissed as unsubstantiated.');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-dispute', disputeId] });
      queryClient.invalidateQueries({ queryKey: ['admin-breaches'] });
      queryClient.invalidateQueries({ queryKey: ['admin-action-queue'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit adjudication verdict');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-semibold text-zinc-500">Loading statutory tenancy dispute dossier...</p>
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-zinc-900 dark:text-white">Dispute Dossier Not Found</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-6">
          The requested breach report has been archived or does not exist.
        </p>
        <Link
          href="/admin/disputes"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
        >
          Return to Disputes Docket
        </Link>
      </div>
    );
  }

  const images: string[] = Array.isArray(dispute.images) ? dispute.images : [];
  const property = dispute.property;
  const claimant = dispute.reporter;
  const respondent = dispute.tenant;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Dispute Case: ${dispute.title}`}
        subtitle={`Breach Claim • Severity: ${dispute.severity || 'MEDIUM'} • Lodged on ${new Date(dispute.createdAt).toLocaleDateString('en-GB')}`}
        badge={<AdminStatusBadge status={dispute.status || 'PENDING'} />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Disputes', href: '/admin/disputes' },
          { label: dispute.title }
        ]}
        backUrl="/admin/disputes"
        backLabel="Back to Disputes"
      />

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Allegation Narrative & Evidence (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Narrative Statement */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-600" />
              Claimant&apos;s Sworn Narrative
            </h3>

            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              {dispute.description || 'No detailed statement provided.'}
            </p>
          </div>

          {/* Photographic Evidence Gallery */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                Submitted Damage / Breach Evidence ({images.length} Photos)
              </h3>
              <span className="text-[11px] text-zinc-400 font-medium">Click to inspect</span>
            </div>

            {images.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                No photographic evidence uploaded with this claim.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    onClick={() => setZoomedImage(getImageUrl(imgUrl))}
                    className="relative group rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 cursor-pointer h-32 flex items-center justify-center"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(imgUrl)}
                      alt={`Evidence ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <ZoomIn className="w-5 h-5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Verdict Notes (if already resolved) */}
          {dispute.adminNotes && (
            <div className="p-4 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs space-y-1">
              <span className="font-bold text-zinc-800 dark:text-zinc-200 block uppercase text-[10px]">
                Administrative Verdict Record:
              </span>
              <p className="text-zinc-700 dark:text-zinc-300">&quot;{dispute.adminNotes}&quot;</p>
            </div>
          )}
        </div>

        {/* Right Column: Counterparties & Adjudication Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Adjudication Panel */}
          {dispute.status === 'PENDING' ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <Gavel className="w-4 h-4 text-emerald-600" />
                Administrative Adjudication Verdict
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                    Reputation Score Penalty Deduction: <strong className="text-rose-600">-{penaltyPoints.toFixed(1)} Pts</strong>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.5"
                    value={penaltyPoints}
                    onChange={(e) => setPenaltyPoints(parseFloat(e.target.value))}
                    className="w-full accent-rose-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                    <span>-0.5 (Minor)</span>
                    <span>-2.5 (Severe)</span>
                    <span>-5.0 (Critical)</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    <input
                      type="checkbox"
                      checked={suspendRespondent}
                      onChange={(e) => setSuspendRespondent(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>Immediately suspend respondent&apos;s account</span>
                  </label>
                </div>

                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setAdjudicateDialog({ isOpen: true, status: 'VERIFIED' })}
                    className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Uphold Claim & Apply Penalties
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjudicateDialog({ isOpen: true, status: 'REJECTED' })}
                    className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" /> Dismiss Claim as Unsubstantiated
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Case Adjudicated
              </h3>
              <p className="text-xs text-zinc-500">
                This dispute was adjudicated on {new Date(dispute.updatedAt || dispute.createdAt).toLocaleDateString('en-GB')}.
              </p>
            </div>
          )}

          {/* Respondent Tenant */}
          {respondent && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-rose-600" />
                  Respondent (Tenant)
                </h3>
                <Link
                  href={`/admin/tenants/${respondent.id}`}
                  className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Tenant Profile
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {respondent.firstName} {respondent.lastName}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                    {respondent.reputationScore ?? 5.0}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  {respondent.email} • {respondent.phoneNumber || 'No phone'}
                </div>
              </div>
            </div>
          )}

          {/* Claimant */}
          {claimant && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-emerald-600" />
                  Claimant (Reporter)
                </h3>
                <Link
                  href={claimant.role === 'LANDLORD' ? `/admin/landlords/${claimant.id}` : `/admin/tenants/${claimant.id}`}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  View Profile
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1 text-xs">
                <div className="font-bold text-zinc-900 dark:text-white">
                  {claimant.firstName} {claimant.lastName} ({claimant.role})
                </div>
                <div className="text-[11px] text-zinc-500">
                  {claimant.email} • {claimant.phoneNumber || 'No phone'}
                </div>
              </div>
            </div>
          )}

          {/* Property Context */}
          {property && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-emerald-600" />
                  Subject Property
                </h3>
                <Link
                  href={`/admin/properties/${property.id}`}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Listing
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1 text-xs">
                <div className="font-bold text-zinc-900 dark:text-white">{property.title}</div>
                <div className="text-zinc-500">{property.location || 'Location unlisted'}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audited Adjudication Dialog */}
      <AdminConfirmDialog
        isOpen={adjudicateDialog.isOpen}
        onClose={() => setAdjudicateDialog({ isOpen: false, status: null })}
        title={
          adjudicateDialog.status === 'VERIFIED'
            ? 'Uphold Tenancy Breach Claim'
            : 'Dismiss Tenancy Breach Claim'
        }
        description={
          adjudicateDialog.status === 'VERIFIED'
            ? `Confirming this verdict will deduct -${penaltyPoints.toFixed(1)} points from the respondent's reputation score${suspendRespondent ? ' and suspend their platform account' : ''}.`
            : 'Dismissing this claim will record the dispute as rejected or unsubstantiated.'
        }
        confirmLabel={
          adjudicateDialog.status === 'VERIFIED' ? 'Deliver Guilty Verdict' : 'Dismiss Claim'
        }
        confirmVariant={adjudicateDialog.status === 'VERIFIED' ? 'danger' : 'warning'}
        requireReason={true}
        reasonLabel="Audited Official Finding & Rationale"
        reasonPlaceholder={
          adjudicateDialog.status === 'VERIFIED'
            ? 'e.g. Damage confirmed by photographic inspection; repairs estimate provided by certified artisan.'
            : 'e.g. Insufficient evidence provided by claimant; normal wear and tear.'
        }
        onConfirm={async (reason) => {
          if (!adjudicateDialog.status) return;
          await resolveMutation.mutateAsync({
            status: adjudicateDialog.status,
            adminNotes: reason,
            penaltyDeduction: adjudicateDialog.status === 'VERIFIED' ? penaltyPoints : undefined,
            suspendAccount: adjudicateDialog.status === 'VERIFIED' ? suspendRespondent : false
          });
        }}
      />

      {/* Lightbox Zoom */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-5xl w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center w-full mb-3 text-white">
              <h3 className="font-bold text-sm">Dispute Evidence Photo</h3>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Close (Esc)
              </button>
            </div>
            <div className="border border-white/20 rounded-2xl overflow-hidden max-h-[85vh] bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={zoomedImage} alt="Evidence Zoom" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
