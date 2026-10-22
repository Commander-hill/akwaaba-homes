'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
  ChevronLeft,
  Loader2,
  BookOpen,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

const APPEAL_REASONS = [
  {
    id: 'DEPOSIT_DISPUTE',
    label: 'Caution Deposit Deduction Dispute',
    desc: 'Disputing arbitrary deductions not substantiated by move-in inspection.'
  },
  {
    id: 'DEFAMATION',
    label: 'Unfair Host Evaluation / Counter-Claim',
    desc: 'Landlord retaliation following reported maintenance breaches.'
  },
  {
    id: 'MAINTENANCE_FAILURE',
    label: 'Unresolved Maintenance & Repairs',
    desc: 'Landlord failure to maintain electrical, plumbing, or essential fixtures.'
  },
  {
    id: 'ILLEGAL_INCREMENT',
    label: 'Unlawful Rent Surcharge',
    desc: 'Attempted mid-tenancy price increases without mutual agreement.'
  },
  {
    id: 'OTHER',
    label: 'Other Tenancy Grievance',
    desc: 'General dispute requiring platform arbitration or mediation.'
  }
];

function NewAppealContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialReviewId = searchParams.get('reviewId') || '';
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [reviewId, setReviewId] = useState(initialReviewId);
  const [reasonCategory, setReasonCategory] = useState(APPEAL_REASONS[0].id);
  const [appealNote, setAppealNote] = useState('');
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [requestMediation, setRequestMediation] = useState(true);

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
  const selectedReasonObj = APPEAL_REASONS.find((r) => r.id === reasonCategory) || APPEAL_REASONS[0];

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

  const handleNextStep = () => {
    if (step === 1 && !reviewId) {
      toast.error('Please select the tenancy review record to appeal');
      return;
    }
    if (step === 3 && !appealNote.trim()) {
      toast.error('Please provide a detailed statement of your dispute grounds');
      return;
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      handleNextStep();
      return;
    }
    if (!reviewId || !appealNote.trim()) {
      toast.error('Please select a case and provide your appeal statement');
      return;
    }

    const compiledAppeal = `[Category: ${selectedReasonObj.label}]\n\n${appealNote.trim()}${
      evidenceSummary.trim() ? `\n\n[Supporting Evidence]:\n${evidenceSummary.trim()}` : ''
    }${requestMediation ? '\n\n[Action Requested]: Formal Rent Magistrate / Platform Mediation Requested.' : ''}`;

    appealMutation.mutate({
      id: reviewId,
      note: compiledAppeal
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6 pb-24">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard/tenant')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Resident Portal
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Submit Tenancy Grievance Appeal
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Independent compliance review under the Rent Act, 1963 (Act 220) for caution deposits or tenancy breaches.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 w-fit">
            Step {step} of 4
          </span>
        </div>
      </div>

      {/* 4-Step Segmented Bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { num: 1, label: '1. Case Selection' },
          { num: 2, label: '2. Grounds for Appeal' },
          { num: 3, label: '3. Statement & Evidence' },
          { num: 4, label: '4. Review & File Appeal' }
        ].map((s) => {
          const active = step === s.num;
          const completed = step > s.num;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num < step) setStep(s.num);
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                active
                  ? 'border-[#0F5132] bg-emerald-50/50 dark:bg-emerald-950/20 text-[#0F5132] dark:text-emerald-400'
                  : completed
                  ? 'border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-[#12151D] text-zinc-800 dark:text-zinc-200'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] text-zinc-400'
              }`}
            >
              <div className="text-[11px] font-bold truncate">{s.label}</div>
              <div className="h-1 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    active || completed ? 'w-full bg-[#0F5132] dark:bg-emerald-500' : 'w-0'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Case Selection */}
        {step === 1 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Select Target Tenancy Record
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Choose the tenancy evaluation or property record you wish to submit for compliance arbitration.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Eligible Tenancy Record *
              </label>
              {loadingReviews ? (
                <div className="h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
              ) : !Array.isArray(reviews) || reviews.length === 0 ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  No active tenancy review records eligible for appeal were found on your profile.
                </div>
              ) : (
                <select
                  value={reviewId}
                  onChange={(e) => setReviewId(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  required
                >
                  {reviews.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.property?.title || 'Property Review'} (Rating: {r.rating}★) — Ref #{r.id.substring(0, 8)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
              <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Statutory Protection under Ghana Rent Act, 1963 (Act 220)
              </div>
              <p className="text-zinc-500 leading-relaxed">
                Unilateral rent escalations during an active tenancy or arbitrary withholding of caution deposits without a signed move-in/move-out inventory inspection are prohibited.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: Grounds for Appeal */}
        {step === 2 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Primary Ground for Appeal
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select the statutory classification that best describes your tenancy dispute.
              </p>
            </div>

            <div className="space-y-2.5">
              {APPEAL_REASONS.map((reason) => {
                const isSelected = reasonCategory === reason.id;
                return (
                  <button
                    key={reason.id}
                    type="button"
                    onClick={() => setReasonCategory(reason.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 text-[#0F5132] dark:text-emerald-300 ring-2 ring-[#0F5132]/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{reason.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{reason.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Statement & Evidence */}
        {step === 3 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Dispute Statement &amp; Corroborating Evidence
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Provide a factual account of events and reference any inspection photos, receipts, or repair tickets.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Detailed Grounds for Dispute *
                </label>
                <textarea
                  required
                  rows={4}
                  value={appealNote}
                  onChange={(e) => setAppealNote(e.target.value)}
                  placeholder="Clearly state what occurred, citing move-in inspection dates, repair tickets filed, or deposit amounts in dispute..."
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-[#0F5132] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Corroborating Evidence Summary (Optional)
                </label>
                <textarea
                  rows={2}
                  value={evidenceSummary}
                  onChange={(e) => setEvidenceSummary(e.target.value)}
                  placeholder="List receipt numbers, inspection photos, or Paystack references that corroborate your claim..."
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                />
              </div>

              <div className="pt-1">
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
        )}

        {/* STEP 4: Review & File Appeal */}
        {step === 4 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Review Grievance Appeal Dossier
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Verify your statement before transmitting to the Akwaaba Homes Compliance &amp; Arbitration Desk.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Target Record</span>
                <div className="font-bold text-zinc-900 dark:text-white">
                  {targetReview?.property?.title || (reviewId ? `Case #${reviewId.slice(0, 8)}` : 'Selected Case')}
                </div>
                <div className="text-zinc-500">
                  {requestMediation ? 'Formal Mediation Requested' : 'Direct Compliance Review'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ground for Appeal</span>
                <div className="font-bold text-[#0F5132] dark:text-emerald-400">{selectedReasonObj.label}</div>
                <div className="text-zinc-500 truncate">{selectedReasonObj.desc}</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Submitted Statement
              </span>
              <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed">
                {appealNote || 'No statement entered.'}
              </p>
            </div>
          </div>
        )}

        {/* Horizontal Summary Bar */}
        <div className="bg-zinc-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
              Arbitration Dossier Summary
            </div>
            <div className="text-sm font-bold">
              {selectedReasonObj.label}
            </div>
          </div>
          <div className="text-xs text-zinc-400 font-mono">
            {requestMediation ? 'Act 220 Mediation Active' : 'Standard Compliance Audit'}
          </div>
        </div>

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Step
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={appealMutation.isPending || !reviewId}
              className="px-6 py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
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
          )}
        </div>
      </form>
    </div>
  );
}

export default function NewAppealPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        </div>
      }
    >
      <NewAppealContent />
    </Suspense>
  );
}
