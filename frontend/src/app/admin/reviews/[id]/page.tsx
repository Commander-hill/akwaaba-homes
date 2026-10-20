'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Star,
  MessageSquare,
  Award,
  Flag,
  Scale,
  Eye,
  Building,
  User as UserIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  Mail,
  Phone,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

export default function AdminReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const reviewId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: 'ACCEPT_APPEAL' | 'REJECT_APPEAL' | 'DELETE' | null;
  }>({
    isOpen: false,
    action: null
  });

  const { data: review, isLoading, error } = useQuery({
    queryKey: ['admin-review', reviewId],
    queryFn: async () => {
      const res = await api.get(`/admin/reviews/${reviewId}`);
      return res.data;
    }
  });

  const appealMutation = useMutation({
    mutationFn: async ({ decision, moderationNote }: { decision: string; moderationNote: string }) => {
      const res = await api.put(`/admin/reviews/${reviewId}/appeal`, { decision, moderationNote });
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast.success(`Appeal ${variables.decision.toLowerCase()} successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin-review', reviewId] });
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to adjudicate appeal');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/admin/reviews/${reviewId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Review permanently deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      router.push('/admin/reviews');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete review');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-semibold text-zinc-500">Loading review moderation & appeal docket...</p>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-zinc-900 dark:text-white">Review Record Not Found</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-6">
          The requested feedback testimonial has been expunged or does not exist.
        </p>
        <Link
          href="/admin/reviews"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
        >
          Return to Reviews Directory
        </Link>
      </div>
    );
  }

  const author = review.author;
  const property = review.booking?.property;
  const landlord = property?.landlord;
  const isAppealPending = review.appealStatus === 'PENDING';

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Review Audit: ${review.rating}.0 ★ Rating`}
        subtitle={`Submitted on ${new Date(review.createdAt).toLocaleDateString('en-GB')} by ${author?.firstName || 'Tenant'} ${author?.lastName || ''}`}
        badge={
          isAppealPending ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Appeal Pending Adjudication
            </span>
          ) : (
            <AdminStatusBadge status={review.isFlagged ? 'FLAGGED' : 'PUBLISHED'} />
          )
        }
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Reviews', href: '/admin/reviews' },
          { label: `${review.rating}.0 ★ Review` }
        ]}
        backUrl="/admin/reviews"
        backLabel="Back to Reviews"
      />

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Review Text & Appeal Dossier (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Rating & Comment Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-200 dark:text-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-bold text-sm text-zinc-900 dark:text-white">
                  {review.rating}.0 / 5.0
                </span>
              </div>
              <span className="text-xs text-zinc-400">
                {new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-800 dark:text-zinc-200 italic leading-relaxed">
              &quot;{review.comment || 'No written commentary provided.'}&quot;
            </div>
          </div>

          {/* Appeal Grievance (if appealed) */}
          {review.appealStatus && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-blue-200 dark:border-blue-900/50 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Host Rating Appeal Docket
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  review.appealStatus === 'PENDING'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
                }`}>
                  Status: {review.appealStatus}
                </span>
              </div>

              <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/30 text-xs text-zinc-700 dark:text-zinc-300 space-y-1">
                <span className="font-bold block text-zinc-900 dark:text-white">Appellant Statement:</span>
                <p>&quot;{review.appealNote || 'No specific grievance narrative attached.'}&quot;</p>
              </div>

              {review.appealModerationNote && (
                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs space-y-1">
                  <span className="font-bold block text-zinc-800 dark:text-zinc-200">
                    Administrative Ruling Note:
                  </span>
                  <p className="text-zinc-600 dark:text-zinc-400">&quot;{review.appealModerationNote}&quot;</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Counterparties & Moderation Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Adjudication Controls */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Adjudication Actions
            </h3>

            <div className="space-y-2">
              {isAppealPending && (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmDialog({ isOpen: true, action: 'ACCEPT_APPEAL' })}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" /> Accept Appeal (Quarantine Review)
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfirmDialog({ isOpen: true, action: 'REJECT_APPEAL' })}
                    className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Scale className="w-4 h-4" /> Reject Appeal (Uphold Review)
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setConfirmDialog({ isOpen: true, action: 'DELETE' })}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Review Permanently
              </button>
            </div>
          </div>

          {/* Author (Tenant) */}
          {author && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-emerald-600" />
                  Reviewer (Tenant)
                </h3>
                <Link
                  href={`/admin/tenants/${author.id}`}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  View Profile
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1 text-xs">
                <div className="font-bold text-zinc-900 dark:text-white">
                  {author.firstName} {author.lastName}
                </div>
                <div className="text-zinc-500">{author.email}</div>
              </div>
            </div>
          )}

          {/* Property & Landlord */}
          {property && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  Reviewed Property
                </h3>
                <Link
                  href={`/admin/properties/${property.id}`}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Listing
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
                <div className="font-bold text-zinc-900 dark:text-white">{property.title}</div>
                <div className="text-zinc-500">{property.location || 'Location unlisted'}</div>
                {landlord && (
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
                    Host: {landlord.firstName} {landlord.lastName} ({landlord.email})
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audited Action Dialog */}
      <AdminConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: null })}
        title={
          confirmDialog.action === 'ACCEPT_APPEAL'
            ? 'Accept Rating Appeal'
            : confirmDialog.action === 'REJECT_APPEAL'
            ? 'Reject Rating Appeal'
            : 'Permanently Delete Review'
        }
        description={
          confirmDialog.action === 'ACCEPT_APPEAL'
            ? 'Explain why this appeal is accepted. The review will be quarantined from the landlord public score.'
            : confirmDialog.action === 'REJECT_APPEAL'
            ? 'Explain why the appeal is rejected. The tenant review will remain published and active.'
            : 'Are you sure you want to permanently delete this review? This action is irreversible.'
        }
        confirmLabel={
          confirmDialog.action === 'ACCEPT_APPEAL'
            ? 'Accept Appeal'
            : confirmDialog.action === 'REJECT_APPEAL'
            ? 'Reject Appeal'
            : 'Delete Permanently'
        }
        confirmVariant={confirmDialog.action === 'DELETE' ? 'danger' : 'primary'}
        requireReason={true}
        reasonLabel="Audited Official Finding"
        reasonPlaceholder="e.g. Review contained defamatory language violating platform terms, or verified as legitimate tenant experience."
        onConfirm={async (reason) => {
          if (confirmDialog.action === 'ACCEPT_APPEAL') {
            await appealMutation.mutateAsync({ decision: 'ACCEPTED', moderationNote: reason });
          } else if (confirmDialog.action === 'REJECT_APPEAL') {
            await appealMutation.mutateAsync({ decision: 'REJECTED', moderationNote: reason });
          } else if (confirmDialog.action === 'DELETE') {
            await deleteMutation.mutateAsync();
          }
        }}
      />
    </div>
  );
}
