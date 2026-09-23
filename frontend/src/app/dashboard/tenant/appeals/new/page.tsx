'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Scale,
  ShieldAlert,
  FileText,
  AlertCircle,
  Building,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  Send,
  Loader2,
  Gavel,
  BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

const APPEAL_REASONS = [
  { id: 'DEPOSIT_DISPUTE', label: 'Caution Deposit Deduction Dispute', desc: 'Disputing arbitrary deductions not substantiated by move-in inspection.' },
  { id: 'DEFAMATION', label: 'Unfair Host Evaluation / Counter-Claim', desc: 'Landlord retaliation following reported maintenance breaches.' },
  { id: 'MAINTENANCE_FAILURE', label: 'Unresolved Statutory Repairs (Act 220 § 25)', desc: 'Landlord failure to maintain electrical, plumbing, or roofing fixtures.' },
  { id: 'ILLEGAL_INCREMENT', label: 'Unlawful Rent Surcharge', desc: 'Attempted mid-tenancy price increases without Rent Control authorization.' },
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
      toast.success('Dispute appeal filed! Akwaaba Arbitration Desk has been notified.');
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Header / Breadcrumb */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Link href="/dashboard/tenant" className="hover:text-primary flex items-center gap-1 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Tenant Dashboard
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 dark:text-white font-bold">File Dispute Appeal</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Gavel className="w-3.5 h-3.5" /> Rent Act Arbitration
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Page Hero */}
        <div className="bg-gradient-to-r from-rose-700 via-red-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden mb-8">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
            <Scale className="w-72 h-72" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Gavel className="w-3.5 h-3.5" /> Formal Tenancy Arbitration
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Submit Dispute &amp; Review Appeal
            </h1>
            <p className="text-rose-100 text-sm leading-relaxed">
              Formally appeal unfair caution deposit deductions, retaliatory reviews, or unresolved repairs. Cases are reviewed by Akwaaba Compliance Officers in accordance with the Ghana Rent Act, 1963.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Review / Case Selector */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-rose-500" />
                Select Tenancy Review Record
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Target Case / Review Record
                </label>
                {loadingReviews ? (
                  <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ) : !Array.isArray(reviews) || reviews.length === 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                    No active reviews eligible for appeal found.
                  </div>
                ) : (
                  <select
                    value={reviewId}
                    onChange={(e) => setReviewId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                Primary Ground for Appeal
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {APPEAL_REASONS.map((reason) => {
                  const isSelected = reasonCategory === reason.id;
                  return (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => setReasonCategory(reason.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 ring-2 ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {reason.label}
                      </div>
                      <div className="text-[11px] text-slate-400 leading-snug">
                        {reason.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Detailed Appeal Statement */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-500" />
                Formal Statement of Appeal
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Appeal Narrative &amp; Facts *
                </label>
                <textarea
                  rows={5}
                  value={appealNote}
                  onChange={(e) => setAppealNote(e.target.value)}
                  placeholder="Clearly outline why the record or deduction is unjustified. Mention dates, agreements, caretaker communications, or condition discrepancies..."
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Supporting Evidence / Document References (Optional)
                </label>
                <textarea
                  rows={3}
                  value={evidenceSummary}
                  onChange={(e) => setEvidenceSummary(e.target.value)}
                  placeholder="e.g. Move-in inspection report signed on 12/03/2025, MoMo payment receipts for ECG tokens, WhatsApp chat transcript with caretaker..."
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Mediation Checkbox */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="mediationCheck"
                  checked={requestMediation}
                  onChange={(e) => setRequestMediation(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                />
                <label htmlFor="mediationCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Request formal mediation session facilitated by Akwaaba Homes Dispute Resolution Officers.
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Statutory Reference & Submit */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 sticky top-24">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-rose-500" /> Ghana Rent Act Protections
              </h3>

              {/* Act 220 Reference Card */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-300 space-y-2">
                <div className="font-bold flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <Scale className="w-4 h-4" /> Ghana Rent Act, 1963 (Act 220)
                </div>
                <p className="text-[11px] leading-relaxed">
                  Under Act 220, tenants are protected against arbitrary deposit withholding. Deductions for normal fair wear and tear are strictly prohibited by law.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={appealMutation.isPending || !reviewId}
                  className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {appealMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Transmitting Appeal...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Formal Appeal
                    </>
                  )}
                </button>

                <Link
                  href="/dashboard/tenant"
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center transition"
                >
                  Cancel & Return
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewAppealPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      }
    >
      <NewAppealContent />
    </Suspense>
  );
}
