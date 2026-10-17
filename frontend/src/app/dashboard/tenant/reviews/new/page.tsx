'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Star,
  Building,
  CheckCircle2,
  Droplets,
  Zap,
  Lock,
  MessageSquare,
  ThumbsUp,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Loader2,
  BadgeCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const RATING_CRITERIA = [
  { id: 'water', label: 'Water Supply & Polytank Storage', icon: Droplets, desc: 'Reliability of running water and backup storage' },
  { id: 'electricity', label: 'Electricity & ECG Stability', icon: Zap, desc: 'Sub-meter stability and breaker reliability' },
  { id: 'security', label: 'Compound & Gate Security', icon: Lock, desc: 'Night lighting, burglar proofing, gate curfew' },
  { id: 'responsiveness', label: 'Host & Caretaker Responsiveness', icon: MessageSquare, desc: 'Speed of fixing reported repair tickets' },
  { id: 'value', label: 'Value for Rent Advance Paid', icon: ThumbsUp, desc: 'Overall living experience relative to rental rate' }
];

const QUICK_TAGS = [
  'Reliable Water Supply',
  'Quiet Study Environment',
  'Prompt Repairs',
  'Responsive Landlord',
  'Clean Compound',
  'Safe Night Security',
  'Good Ventilation',
  'Accra Fast WiFi',
  'Close to Campus / Transit'
];

function NewReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBookingId = searchParams.get('bookingId') || '';
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [bookingId, setBookingId] = useState(initialBookingId);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({
    water: 5,
    electricity: 5,
    security: 5,
    responsiveness: 5,
    value: 5
  });

  const { data: bookingsData, isLoading: loadingBookings } = useQuery({
    queryKey: ['bookings', 'tenant'],
    queryFn: async () => {
      const res = await api.get('/bookings/me');
      return res.data;
    }
  });

  const eligibleBookings = (bookingsData?.bookings || []).filter((b: any) =>
    ['CONFIRMED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(b.status)
  );

  useEffect(() => {
    if (!bookingId && eligibleBookings.length > 0) {
      setBookingId(initialBookingId || eligibleBookings[0].id);
    }
  }, [eligibleBookings, bookingId, initialBookingId]);

  const targetBooking = eligibleBookings.find((b: any) => b.id === bookingId) || eligibleBookings[0];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const updateCriteria = (id: string, score: number) => {
    setCriteriaScores((prev) => ({ ...prev, [id]: score }));
  };

  const createReviewMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/reviews', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Review submitted! Thank you for helping future Ghanaian renters.');
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      router.push('/dashboard/tenant');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    }
  });

  const handleNextStep = () => {
    if (step === 1 && !bookingId) {
      toast.error('Please select the rented residence to review');
      return;
    }
    if (step === 3 && (!comment.trim() || comment.trim().length < 15)) {
      toast.error('Please write at least 15 characters of feedback');
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
    if (!bookingId || !comment.trim() || comment.trim().length < 15) {
      toast.error('Please select a stay and provide at least 15 characters of feedback');
      return;
    }

    const compiledComment = [
      comment.trim(),
      selectedTags.length > 0 ? `\n[Highlights: ${selectedTags.join(', ')}]` : '',
      `[Detailed Ratings: Water ${criteriaScores.water}/5, ECG ${criteriaScores.electricity}/5, Security ${criteriaScores.security}/5, Responsiveness ${criteriaScores.responsiveness}/5, Value ${criteriaScores.value}/5]`
    ]
      .filter(Boolean)
      .join('\n');

    createReviewMutation.mutate({
      bookingId,
      propertyId: targetBooking?.propertyId,
      rating,
      comment: compiledComment
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
              Write Verified Residence Review
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Share authentic living insights on water flow, ECG stability, and security to guide future tenants.
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
          { num: 1, label: '1. Stay & Star Rating' },
          { num: 2, label: '2. Utility & Security' },
          { num: 3, label: '3. Written Feedback' },
          { num: 4, label: '4. Review & Publish' }
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
        {/* STEP 1: Stay & Star Rating */}
        {step === 1 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Select Rented Residence &amp; Overall Rating
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Choose the verified booking you are evaluating and assign an overall star rating.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Verified Residence Stay *
              </label>
              {loadingBookings ? (
                <div className="h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
              ) : eligibleBookings.length === 0 ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  No verified completed or active tenancies found to review.
                </div>
              ) : (
                <select
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  required
                >
                  {eligibleBookings.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.property?.title} ({b.property?.city || 'Accra'}) — Unit {b.roomNumber || 'Room'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 block">
                Overall Residence Rating
              </span>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        (hoverRating !== null ? hoverRating >= star : rating >= star)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-zinc-300 dark:text-zinc-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {rating === 5 && '5/5 — Outstanding: Exceeded Expectations'}
                {rating === 4 && '4/5 — Good: Reliable & Comfortable'}
                {rating === 3 && '3/5 — Average: Minor Issues Encountered'}
                {rating === 2 && '2/5 — Below Average: Multiple Breaches'}
                {rating === 1 && '1/5 — Unsatisfactory: Do Not Recommend'}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Utility & Security */}
        {step === 2 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Key Tenancy Benchmarks in Ghana
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Score each essential compound factor from 1 (Poor) to 5 (Excellent).
              </p>
            </div>

            <div className="space-y-3">
              {RATING_CRITERIA.map((crit) => {
                const Icon = crit.icon;
                const score = criteriaScores[crit.id] || 5;
                return (
                  <div
                    key={crit.id}
                    className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                        <Icon className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                        <span>{crit.label}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500">{crit.desc}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => updateCriteria(crit.id, val)}
                          className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            score === val
                              ? 'bg-[#0F5132] text-white shadow-xs'
                              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Written Feedback */}
        {step === 3 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Compound Highlights &amp; Written Review
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select quick highlight tags and write an honest review of your experience living at the property.
              </p>
            </div>

            <div>
              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block mb-2">
                Compound Highlights (Optional)
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#0F5132] bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-300 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Written Feedback &amp; Recommendations *
                </label>
                <span className="text-[10px] text-zinc-400">Min. 15 characters</span>
              </div>
              <textarea
                required
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe your daily experience: compound security at night, electricity stability, water flow, and how quickly maintenance was handled..."
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-[#0F5132] leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* STEP 4: Review & Publish */}
        {step === 4 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Confirm &amp; Publish Verified Resident Review
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Your review will display the Verified Resident badge because your stay was escrow-backed on Akwaaba Homes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Reviewed Property</span>
                <div className="font-bold text-zinc-900 dark:text-white">
                  {targetBooking?.property?.title || 'Selected Residence'}
                </div>
                <div className="text-[#0F5132] dark:text-emerald-400 font-bold flex items-center gap-1">
                  <BadgeCheck className="w-3.5 h-3.5" /> Overall Rating: {rating} / 5 Stars
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Factor Breakdown</span>
                <div className="text-zinc-700 dark:text-zinc-300 font-mono">
                  Water {criteriaScores.water}/5 &bull; ECG {criteriaScores.electricity}/5 &bull; Security {criteriaScores.security}/5
                </div>
                <div className="text-zinc-500 truncate">
                  {selectedTags.length > 0 ? selectedTags.join(', ') : 'Standard evaluation'}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Written Evaluation
              </span>
              <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed">
                {comment}
              </p>
            </div>
          </div>
        )}

        {/* Horizontal Summary Bar */}
        <div className="bg-zinc-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
              Verified Resident Review Summary
            </div>
            <div className="text-sm font-bold">
              {targetBooking?.property?.title || 'Selected Residence'} &bull; {rating} / 5 Stars
            </div>
          </div>
          <div className="text-xs text-zinc-400 font-mono">
            {selectedTags.length} Highlight Tags Selected
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
              className="px-6 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0B3D26] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={createReviewMutation.isPending || !bookingId}
              className="px-6 py-3 rounded-xl bg-[#0F5132] hover:bg-[#0B3D26] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              {createReviewMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Publishing Review...
                </>
              ) : (
                <>
                  <Star className="w-4 h-4" /> Publish Verified Review
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function NewReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        </div>
      }
    >
      <NewReviewContent />
    </Suspense>
  );
}
