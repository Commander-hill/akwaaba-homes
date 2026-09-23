'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Star,
  Building,
  ShieldCheck,
  Droplets,
  Zap,
  Lock,
  MessageSquare,
  ThumbsUp,
  ArrowLeft,
  ChevronRight,
  Send,
  Loader2,
  CheckCircle2,
  Calendar,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

const RATING_CRITERIA = [
  { id: 'water', label: 'Water Supply & Polytank Storage', icon: Droplets, desc: 'Reliability of running water and overhead tanks' },
  { id: 'electricity', label: 'Electricity & ECG Stability', icon: Zap, desc: 'Sub-meter stability and low breaker trips' },
  { id: 'security', label: 'Estate & Gate Security', icon: Lock, desc: 'Compound lighting, gate curfew, and guard presence' },
  { id: 'responsiveness', label: 'Host & Caretaker Responsiveness', icon: MessageSquare, desc: 'Speed of resolving reported maintenance issues' },
  { id: 'value', label: 'Value for Rent Advance Paid', icon: ThumbsUp, desc: 'Living experience relative to rental cost' }
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
  'Close to Campus/Transit'
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

  // Fetch Tenant Bookings to find the target booking / allow booking selection
  const { data: bookingsData, isLoading: loadingBookings } = useQuery({
    queryKey: ['bookings', 'tenant'],
    queryFn: async () => {
      const res = await api.get('/bookings/my-bookings');
      return res.data;
    }
  });

  const bookings = bookingsData?.bookings || bookingsData?.data || [];

  useEffect(() => {
    if (!bookingId && bookings.length > 0) {
      setBookingId(initialBookingId || bookings[0].id);
    }
  }, [bookings, bookingId, initialBookingId]);

  const targetBooking = bookings.find((b: any) => b.id === bookingId);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleCriteriaChange = (criterionId: string, score: number) => {
    setCriteriaScores(prev => ({ ...prev, [criterionId]: score }));
  };

  const reviewMutation = useMutation({
    mutationFn: async (payload: { bookingId: string; rating: number; comment: string }) => {
      const res = await api.post('/reviews', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Thank you! Your experience review has been submitted.');
      queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] });
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
      router.push('/dashboard/tenant');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit review');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) {
      toast.error('Please select the tenancy stay you are reviewing');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please write a brief summary of your stay experience');
      return;
    }

    const tagSection = selectedTags.length > 0 ? `\n\nHighlights: ${selectedTags.join(', ')}` : '';
    const fullComment = `${comment.trim()}${tagSection}`;

    reviewMutation.mutate({
      bookingId,
      rating,
      comment: fullComment
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
              <span className="text-slate-900 dark:text-white font-bold">Write Property Review</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Tenant Review
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Page Hero */}
        <div className="bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden mb-8">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
            <Star className="w-72 h-72 fill-white" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Community Transparency
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Rate Your Tenancy Experience
            </h1>
            <p className="text-amber-100 text-sm leading-relaxed">
              Help prospective Ghanaian tenants and university students make informed housing decisions. Your feedback rewards good landlords and promotes higher rental standards.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Rating Form */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Property / Stay Selector */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-500" />
                Select Completed Tenancy
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Rental Facility
                </label>
                {loadingBookings ? (
                  <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ) : bookings.length === 0 ? (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                    No confirmed or completed tenancies found to review.
                  </div>
                ) : (
                  <select
                    value={bookingId}
                    onChange={(e) => setBookingId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    {bookings.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.property?.title || 'Rental Unit'} — {b.property?.location || 'Ghana'} ({b.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* 2. Overall Star Rating */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4 text-center">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Overall Satisfaction Rating
              </h2>
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(star)}
                    className="p-1.5 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        (hoverRating !== null ? star <= hoverRating : star <= rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-slate-500">
                {rating === 5 && 'Outstanding Living Experience (5.0)'}
                {rating === 4 && 'Good & Recommended Stay (4.0)'}
                {rating === 3 && 'Average / Met Basic Expectations (3.0)'}
                {rating === 2 && 'Subpar / Maintenance Deficiencies (2.0)'}
                {rating === 1 && 'Unsatisfactory Stay (1.0)'}
              </p>
            </div>

            {/* 3. Criteria Scoring Breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-500" />
                Category Performance Breakdown
              </h2>
              <div className="space-y-3.5">
                {RATING_CRITERIA.map((criterion) => {
                  const Icon = criterion.icon;
                  const score = criteriaScores[criterion.id] || 5;
                  return (
                    <div
                      key={criterion.id}
                      className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">
                            {criterion.label}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {criterion.desc}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleCriteriaChange(criterion.id, s)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                              s <= score
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Experience Highlights (Quick Tags) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Stay Highlights (Select all that apply)
              </h2>
              <div className="flex flex-wrap gap-2 pt-1">
                {QUICK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold ring-2 ring-amber-500/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Detailed Review Narrative */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Detailed Review Comment *
              </h2>
              <textarea
                rows={5}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your personal experience regarding the neighborhood, water flow, power stability, caretaker helpfulness, and overall compound atmosphere..."
                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* Right Column: Guidance & Submit Button */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 sticky top-24">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" /> Community Standards
              </h3>

              {/* Verified Stay Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {targetBooking?.property?.title || 'Selected Property'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {targetBooking?.property?.location || 'Accra, Ghana'}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 pt-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{rating}.0 out of 5 Stars</span>
                </div>
              </div>

              {/* Ghana Rent Act Fair Review Advisory */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-900 dark:text-amber-300 space-y-1.5">
                <div className="font-bold flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <ShieldCheck className="w-4 h-4" /> Honest Feedback Guarantee
                </div>
                <p className="text-[11px] leading-relaxed">
                  Akwaaba Homes safeguards tenant freedom of expression. Authentic reviews reflecting actual tenancy conditions cannot be suppressed by property owners.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={reviewMutation.isPending || !bookingId}
                  className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {reviewMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting Review...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Publish Verified Review
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

export default function NewReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <NewReviewContent />
    </Suspense>
  );
}
