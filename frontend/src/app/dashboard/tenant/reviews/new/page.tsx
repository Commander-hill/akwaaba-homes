'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
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
  Send,
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

  // Fetch tenant's eligible completed or active bookings
  const { data: bookingsData, isLoading: loadingBookings } = useQuery({
    queryKey: ['bookings', 'tenant'],
    queryFn: async () => {
      const res = await api.get('/bookings/my-bookings');
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
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const updateCriteria = (id: string, score: number) => {
    setCriteriaScores(prev => ({ ...prev, [id]: score }));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) {
      toast.error('Please select the stay to review');
      return;
    }
    if (!comment.trim() || comment.trim().length < 15) {
      toast.error('Please write at least 15 characters of honest feedback');
      return;
    }

    const compiledComment = [
      comment.trim(),
      selectedTags.length > 0 ? `\n[Highlights: ${selectedTags.join(', ')}]` : '',
      `[Detailed Ratings: Water ${criteriaScores.water}/5, ECG ${criteriaScores.electricity}/5, Security ${criteriaScores.security}/5, Responsiveness ${criteriaScores.responsiveness}/5, Value ${criteriaScores.value}/5]`
    ].filter(Boolean).join('\n');

    createReviewMutation.mutate({
      bookingId,
      propertyId: targetBooking?.propertyId,
      rating,
      comment: compiledComment
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
          <span className="text-zinc-900 dark:text-zinc-200 font-bold">Write Residence Review</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
              </span>
              Verified Resident Review
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Share authentic living insights to help Ghanaian university students and working professionals make informed rental decisions.
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
        {/* Main Review Form */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Property Selector */}
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
              Rented Residence
            </h2>
            <div>
              {loadingBookings ? (
                <div className="h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl animate-pulse" />
              ) : eligibleBookings.length === 0 ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  No verified completed or active tenancies found to review.
                </div>
              ) : (
                <select
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F5132]/30 cursor-pointer"
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
          </div>

          {/* 2. Overall Star Rating */}
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3 text-center">
            <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Overall Residence Rating
            </span>
            <div className="flex items-center justify-center gap-2 py-2">
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
            <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
              {rating === 5 && 'Outstanding — Exceeded Expectations'}
              {rating === 4 && 'Good — Reliable & Comfortable'}
              {rating === 3 && 'Average — Minor Issues Encountered'}
              {rating === 2 && 'Below Average — Multiple Breaches'}
              {rating === 1 && 'Unsatisfactory — Do Not Recommend'}
            </div>
          </div>

          {/* 3. Detailed Criteria Scores */}
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Key Tenancy Factors in Ghana
            </h2>
            <div className="space-y-3">
              {RATING_CRITERIA.map((crit) => {
                const Icon = crit.icon;
                const score = criteriaScores[crit.id] || 5;
                return (
                  <div key={crit.id} className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                        <Icon className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                        <span>{crit.label}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500">{crit.desc}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => updateCriteria(crit.id, val)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            score === val
                              ? 'bg-[#0F5132] text-white shadow-xs'
                              : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
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

          {/* 4. Quick Highlights & Written Comment */}
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2">
                Compound Highlights (Tap to select)
              </span>
              <div className="flex flex-wrap gap-1.5">
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
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Written Feedback & Recommendations *
                </label>
                <span className="text-[10px] text-zinc-400">Min. 15 characters</span>
              </div>
              <textarea
                required
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Describe your daily experience: compound security at night, electricity stability, water flow, and how quickly maintenance was handled..."
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F5132]/30 leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Verification Trust & Submit (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Verified Review Guidelines
            </span>

            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-[#0F5132] dark:text-emerald-400 flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 shrink-0" />
                Verified Resident Badge
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Your review will feature the green <strong>Verified Tenant</strong> badge because your tenancy was booked and escrow-secured through AkwaabaHomes.
              </p>
            </div>

            <div className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Fair, factual, and unbiased commentary</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Landlords can post a polite public response</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Directly impacts the property’s quality rank</span>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div>
            <button
              type="submit"
              disabled={createReviewMutation.isPending}
              className="w-full py-3.5 bg-[#0F5132] hover:bg-[#0B3D26] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
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
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewReviewPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
      </div>
    }>
      <NewReviewContent />
    </Suspense>
  );
}
