'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Scale,
  AlertCircle,
  Building,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  Send,
  Loader2,
  Gavel,
  BookOpen,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

const APPEAL_REASONS = [
  { id: 'DEPOSIT_DISPUTE', label: 'Caution Deposit Deduction Dispute', desc: 'Disputing arbitrary deductions not substantiated by move-in inspection.' },
  { id: 'DEFAMATION', label: 'Unfair Host Evaluation / Counter-Claim', desc: 'Landlord retaliation following reported maintenance breaches.' },
  { id: 'MAINTENANCE_FAILURE', label: 'Unresolved Maintenance & Repairs', desc: 'Landlord failure to maintain electrical, plumbing, or essential fixtures.' },
  { id: 'ILLEGAL_INCREMENT', label: 'Unlawful Rent Surcharge', desc: 'Attempted mid-tenancy price increases without mutual agreement.' },
  { id: 'OTHER', label: 'Other Tenancy Grievance', desc: 'General dispute requiring platform arbitration or mediation.' }
];

function NewAppealContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialReviewId = searchParams.get('reviewId') || '';
  const queryClient = useQueryClient();

  const [reviewId, setReviewId] = useState(initialReviewId);
  const [reasonCategory, setReasonCategory] = useState(APPEAL_REASONS[0].id);
  const [appealNote, setAppealNote] = useState('');
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [requestMediation, setRequestMediation] = useState(true);

  // Fetch Tenant's Reviews
  const { data: myReviewsData, isLoading: loadingReviews } = useQuery({
    queryKey: ['myReviews'],
    queryFn: async () => {
      const res = await api.get('/reviews/mine');
      return res.data;
    }
  });

  const reviews = myReviewsData?.reviews || myReviewsData || [];

  useEffect(() => {
    if (!reviewId && Array.isArray(reviews) && reviews.length > 0) {
      setReviewId(initialReviewId || reviews[0].id);
    }
  }, [reviews, reviewId, initialReviewId]);

  const targetReview = Array.isArray(reviews) ? reviews.find((r: any) => r.id === reviewId) : null;

  const appealMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const res = await api.put(`/reviews/${id}/appeal`, { appealNote: note });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Dispute appeal filed! Akwaaba Compliance Officers notified.');
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
      router.push('/dashboard/tenant');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit dispute appeal');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewId) {
      toast.error('Please select the tenancy review or case to appeal');
      return;
    }
    if (!appealNote.trim()) {
      toast.error('Please provide a comprehensive explanation of your appeal');
      return;
    }

    const selectedReason = APPEAL_REASONS.find(r => r.id === reasonCategory)?.label || 'General Grievance';
    const compiledAppeal = `[Category: ${selectedReason}]\n\n${appealNote.trim()}${
      evidenceSummary.trim() ? `\n\n[Supporting Evidence]:\n${evidenceSummary.trim()}` : ''
    }${requestMediation ? '\n\n[Action Requested]: Formal Rent Magistrate / Platform Mediation Requested.' : ''}`;

    appealMutation.mutate({
      id: reviewId,
      note: compiledAppeal
    });
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0D0F12] pb-24 pt-4 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* ── Breadcrumbs & Header ── */}
      <div className="mb-6 space-y-3 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          <Link href="/dashboard/tenant" className="hover:text-[#0F5132] dark:hover:text-emerald-400 transition">
            Resident Portal
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-900 dark:text-zinc-200 font-bold">File Dispute Appeal</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                <Scale className="w-5 h-5" />
              </span>
              Submit Tenancy Grievance Appeal
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Independent review under the Rent Act, 1963 (Act 220) for caution deposits, arbitrary charges, or repair breaches.
            </p>
          </div>

          <Link
            href="/dashboard/tenant"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14181E] text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel & Return
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Form Area */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Review / Case Selector */}
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
              Target Tenancy Review Record
            </h2>
            <div>
              {loadingReviews ? (
                <div className="h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl animate-pulse" />
              ) : !Array.isArray(reviews) || reviews.length === 0 ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  No active reviews eligible for appeal found.
                </div>
              ) : (
                <select
                  value={reviewId}
                  onChange={(e) => setReviewId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F5132]/30 cursor-pointer"
                  required
                >
                  {reviews.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.property?.title || 'Property Review'} (Rating: {r.rating}★) — {r.id.substring(0, 8)}...
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 2. Dispute Reason Presets */}
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Primary Ground for Appeal
            </h2>
            <div className="space-y-2">
              {APPEAL_REASONS.map((reason) => {
                const isSelected = reasonCategory === reason.id;
                return (
                  <div
                    key={reason.id}
                    onClick={() => setReasonCategory(reason.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 text-[#0F5132] dark:text-emerald-300 ring-1 ring-[#0F5132]/30'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold">{reason.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{reason.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Detailed Explanation */}
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Dispute Statement & Evidence
            </h2>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Detailed Grounds for Dispute *
              </label>
              <textarea
                required
                rows={4}
                value={appealNote}
                onChange={(e) => setAppealNote(e.target.value)}
                placeholder="Clearly state what occurred, citing move-in inspection dates, repair tickets filed, or deposit amounts in dispute..."
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F5132]/30 leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Evidence Summary (Links, Photos, Bank Statements)
              </label>
              <textarea
                rows={2}
                value={evidenceSummary}
                onChange={(e) => setEvidenceSummary(e.target.value)}
                placeholder="List receipts, inspection photos, WhatsApp messages, or Paystack references that corroborate your claim..."
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F5132]/30"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={requestMediation}
                  onChange={(e) => setRequestMediation(e.target.checked)}
                  className="rounded border-zinc-300 text-[#0F5132] focus:ring-[#0F5132]"
                />
                <span>Request formal platform mediation session between Landlord and Tenant</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Act 220 Summary & Submission (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Arbitration Standards
            </span>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl space-y-2 border border-zinc-200/80 dark:border-zinc-800 text-xs">
              <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Ghana Rent Act, 1963 (Act 220)
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                AkwaabaHomes maintains strict compliance with national tenancy guidelines. Unilateral rent escalations or withholding of caution deposits without formal joint inventory inspection are prohibited.
              </p>
            </div>

            <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Reviewed by independent compliance officers</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Escrow deductions paused during active dispute</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Binding resolution delivered within 5 business days</span>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div>
            <button
              type="submit"
              disabled={appealMutation.isPending}
              className="w-full py-3.5 bg-[#0F5132] hover:bg-[#0B3D26] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {appealMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting Appeal...
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4" /> File Formal Appeal
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewAppealPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
      </div>
    }>
      <NewAppealContent />
    </Suspense>
  );
}
