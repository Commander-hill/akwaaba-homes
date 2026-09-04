'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, 
  Star, 
  User, 
  Home, 
  Trash2, 
  Flag, 
  ShieldCheck, 
  MessageSquare, 
  Search, 
  Filter, 
  Building2, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  X, 
  Eye, 
  ExternalLink,
  Award,
  ThumbsUp,
  AlertCircle,
  HelpCircle,
  Scale
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useDialog } from '@/providers/DialogProvider';
import Link from 'next/link';

type ReviewFilter = 'ALL' | 'FIVE_STAR' | 'CRITICAL' | 'FLAGGED' | 'APPEALS';

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const { confirm } = useDialog();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<ReviewFilter>('ALL');
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [appealNote, setAppealNote] = useState('');

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const res = await api.get('/admin/reviews');
      return res.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { 
      await api.delete(`/admin/reviews/${id}`); 
    },
    onSuccess: () => {
      toast.success('Review permanently removed');
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setSelectedReview(null);
    },
    onError: () => toast.error('Failed to delete review')
  });

  const appealMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: string }) => {
      await api.put(`/admin/reviews/${id}/appeal`, { decision, moderationNote: appealNote });
    },
    onSuccess: (_, variables) => {
      toast.success(`Appeal ${variables.decision.toLowerCase()} successfully`);
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setSelectedReview(null);
      setAppealNote('');
    },
    onError: () => toast.error('Failed to adjudicate appeal')
  });

  const flagMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/reviews/${id}/flag`, { reason: 'Flagged for administrative review' });
    },
    onSuccess: () => {
      toast.success('Review flagged for content moderation');
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
    onError: () => toast.error('Failed to flag review')
  });

  // KPI Calculations
  const stats = useMemo(() => {
    if (!reviews || !Array.isArray(reviews)) {
      return { total: 0, avgRating: '5.0', flagged: 0, appeals: 0, fiveStar: 0, critical: 0 };
    }
    const total = reviews.length;
    let sumRating = 0;
    let flagged = 0;
    let appeals = 0;
    let fiveStar = 0;
    let critical = 0;

    reviews.forEach((r: any) => {
      sumRating += (r.rating || 5);
      if (r.rating === 5) fiveStar++;
      if (r.rating <= 2) critical++;
      if (r.isFlagged) flagged++;
      if (r.appealStatus === 'PENDING') appeals++;
    });

    const avgRating = total > 0 ? (sumRating / total).toFixed(1) : '5.0';

    return { total, avgRating, flagged, appeals, fiveStar, critical };
  }, [reviews]);

  // Filtered Reviews
  const filteredReviews = useMemo(() => {
    if (!reviews || !Array.isArray(reviews)) return [];

    return reviews.filter((r: any) => {
      // Tab Filters
      if (activeFilter === 'FIVE_STAR' && r.rating !== 5) return false;
      if (activeFilter === 'CRITICAL' && r.rating > 2) return false;
      if (activeFilter === 'FLAGGED' && !r.isFlagged) return false;
      if (activeFilter === 'APPEALS' && r.appealStatus !== 'PENDING') return false;

      // Search Filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const authorName = `${r.author?.firstName || ''} ${r.author?.lastName || ''}`.toLowerCase();
        const authorEmail = (r.author?.email || '').toLowerCase();
        const propTitle = (r.booking?.property?.title || '').toLowerCase();
        const comment = (r.comment || '').toLowerCase();
        const landlordName = `${r.booking?.property?.landlord?.firstName || ''} ${r.booking?.property?.landlord?.lastName || ''}`.toLowerCase();

        return (
          authorName.includes(query) ||
          authorEmail.includes(query) ||
          propTitle.includes(query) ||
          comment.includes(query) ||
          landlordName.includes(query)
        );
      }

      return true;
    });
  }, [reviews, activeFilter, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-[#0F5132]" />
        <p className="text-sm font-semibold text-slate-500">Loading reputation & trust reviews...</p>
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-12 animate-in">
      {/* ─── HEADER CONTAINER ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              Act 220 Trust & Reputation
            </span>
            <span className="text-xs font-semibold text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {stats.total} Verified Reviews
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Review Moderation & Reputation Trust Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Institutional governance of tenant feedback, ratings fairness, dispute adjudication, and landlord appeals under Ghana Rent Act (Act 220) integrity standards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#0F5132]/10 text-[#0F5132] dark:bg-emerald-950/50 dark:text-emerald-400 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs">
            <Star className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ─── 4-CARD EXECUTIVE TRUST & REPUTATION KPI STRIP ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reviews */}
        <div 
          onClick={() => setActiveFilter('ALL')}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 transition-all shadow-xs group"
        >
          <div className="flex justify-between items-center text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Reviews
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:bg-[#0F5132] group-hover:text-white transition-colors">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {stats.total}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            From verified completed tenancies
          </p>
        </div>

        {/* Average Platform Rating */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/10 dark:bg-amber-950/10 shadow-xs">
          <div className="flex justify-between items-center text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Platform Quality Score
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mb-1">
            <span>{stats.avgRating}</span>
            <span className="text-base text-amber-500">★</span>
            <span className="text-xs font-semibold text-slate-400">/ 5.0</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.fiveStar} five-star perfect ratings
          </p>
        </div>

        {/* Flagged for Moderation */}
        <div 
          onClick={() => setActiveFilter('FLAGGED')}
          className={`cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all shadow-xs group ${
            stats.flagged > 0 
              ? 'border-red-300 dark:border-red-700/60 bg-red-50/20 dark:bg-red-950/10 hover:border-red-400' 
              : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <div className="flex justify-between items-center text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Flagged Content
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              stats.flagged > 0 ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <Flag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.flagged}
            </div>
            {stats.flagged > 0 && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                Review Req
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.flagged === 0 ? 'Zero flagged violations' : 'Flagged for content violation'}
          </p>
        </div>

        {/* Pending Appeals */}
        <div 
          onClick={() => setActiveFilter('APPEALS')}
          className={`cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all shadow-xs group ${
            stats.appeals > 0 
              ? 'border-blue-300 dark:border-blue-700/60 bg-blue-50/20 dark:bg-blue-950/10 hover:border-blue-400' 
              : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <div className="flex justify-between items-center text-slate-400 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Dispute Appeals
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              stats.appeals > 0 ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.appeals}
            </div>
            {stats.appeals > 0 && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white animate-pulse">
                Pending
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.appeals === 0 ? 'No active rating appeals' : 'Awaiting administrative adjudication'}
          </p>
        </div>
      </div>

      {/* ─── STREAMLINED REPUTATION METHODOLOGY ADVISORY ─────────────────── */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#0F5132] shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong className="text-slate-900 dark:text-white font-extrabold">Reputation Governance Standard:</strong> Reputation scores reflect the arithmetic average of verified ratings from completed residential tenancies. Reviews under formal dispute appeal are quarantined from landlord and tenant public scores until adjudicated by an administrator.
        </div>
      </div>

      {/* ─── SEARCH & FILTER CONTROLS ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search reviewer, property, landlord, or comment keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5132] dark:focus:ring-emerald-500 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredReviews.length}</strong> of {stats.total} reviews
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeFilter === 'ALL'
                ? 'bg-[#0F5132] text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            All Reviews ({stats.total})
          </button>

          <button
            onClick={() => setActiveFilter('FIVE_STAR')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'FIVE_STAR'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            5 ★ Excellent ({stats.fiveStar})
          </button>

          <button
            onClick={() => setActiveFilter('CRITICAL')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              activeFilter === 'CRITICAL'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Critical (1–2 ★) ({stats.critical})
          </button>

          <button
            onClick={() => setActiveFilter('FLAGGED')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilter === 'FLAGGED'
                ? 'bg-red-700 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Flagged ({stats.flagged})
            {stats.flagged > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveFilter('APPEALS')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilter === 'APPEALS'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Dispute Appeals ({stats.appeals})
            {stats.appeals > 0 && (
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* ─── INSTITUTIONAL REVIEWS TABLE ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-[#0F5132] text-white shadow-xs">
              <tr>
                <th className="px-6 py-4 font-black tracking-wider text-white">Reviewer</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Property & Landlord</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Rating</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Status</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Review Comment</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Date</th>
                <th className="px-6 py-4 font-black tracking-wider text-white text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Star className="w-10 h-10 text-slate-300 mx-auto mb-2 opacity-60" />
                    <p className="font-bold text-sm">No review records found matching filters.</p>
                    <button 
                      onClick={() => { setActiveFilter('ALL'); setSearchTerm(''); }}
                      className="mt-2 text-xs font-bold text-[#0F5132] hover:underline"
                    >
                      Clear search filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review: any) => {
                  const property = review.booking?.property;
                  const author = review.author;
                  const isUnderAppeal = review.appealStatus === 'PENDING';

                  return (
                    <tr 
                      key={review.id} 
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                        review.isFlagged ? 'bg-red-50/20 dark:bg-red-950/10' : ''
                      }`}
                    >
                      {/* Reviewer */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-xs text-slate-700 dark:text-slate-300 shrink-0">
                            {(author?.firstName || 'U')[0]}{(author?.lastName || '')[0]}
                          </div>
                          <div>
                            <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                              {author ? `${author.firstName} ${author.lastName}` : 'Anonymous Tenant'}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[140px]">
                              {author?.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Property & Landlord */}
                      <td className="px-6 py-4">
                        <div className="space-y-0.5 max-w-[180px]">
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                            {property?.title || 'Residential Property'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            Host: {property?.landlord ? `${property.landlord.firstName} ${property.landlord.lastName}` : 'Landlord'}
                          </div>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="flex text-amber-400">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} 
                              />
                            ))}
                          </div>
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200 ml-1">
                            {review.rating}.0
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isUnderAppeal ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 animate-pulse">
                            <Scale className="w-3 h-3 text-blue-600" />
                            Appeal Pending
                          </span>
                        ) : review.isFlagged ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200">
                            <Flag className="w-3 h-3 text-red-600" />
                            Flagged
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            Published
                          </span>
                        )}
                      </td>

                      {/* Comment */}
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs line-clamp-2 italic" title={review.comment}>
                          &quot;{review.comment || 'No written comment provided.'}&quot;
                        </p>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-medium">
                        {new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedReview(review)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-[#0F5132] hover:text-white dark:bg-slate-800 dark:hover:bg-[#0F5132] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                            title="Audit review details and appeals"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Audit
                          </button>

                          {!review.isFlagged && (
                            <button
                              onClick={() => flagMutation.mutate(review.id)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-xl transition-colors"
                              title="Flag for content violation"
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={async () => {
                              const shouldDelete = await confirm({
                                title: 'Delete Review',
                                message: 'Are you sure you want to permanently delete this tenant review? This action cannot be undone.',
                                confirmText: 'Delete Review',
                                type: 'danger',
                              });
                              if (shouldDelete) {
                                deleteMutation.mutate(review.id);
                              }
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                            title="Permanently remove review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: DEEP REVIEW AUDIT & APPEAL ADJUDICATION ─────────────── */}
      {selectedReview && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-emerald-900/30 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#0F5132] via-[#146c43] to-slate-900 text-white flex justify-between items-center relative overflow-hidden shadow-md">
              <div className="flex items-center gap-3.5 z-10">
                <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 border border-white/10 shadow-inner">
                  <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Review Audit & Adjudication
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/20 text-white">
                      Rating: {selectedReview.rating}.0 ★
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight mt-0.5 truncate max-w-md">
                    Feedback for {selectedReview.booking?.property?.title || 'Property'}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setSelectedReview(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50 dark:bg-slate-950/50">
              {/* Rating & Review Text */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < selectedReview.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'}`} />
                      ))}
                    </div>
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                      {selectedReview.rating}.0 out of 5.0
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-semibold">
                    Submitted {new Date(selectedReview.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 italic leading-relaxed">
                  &quot;{selectedReview.comment || 'No written commentary was provided with this rating.'}&quot;
                </div>
              </div>

              {/* Counterparties: Reviewer & Landlord */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Reviewer (Tenant)</span>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {selectedReview.author?.firstName} {selectedReview.author?.lastName}
                  </div>
                  <div className="text-xs text-slate-500">{selectedReview.author?.email}</div>
                  {selectedReview.author?.phoneNumber && (
                    <div className="text-xs text-slate-400">Phone: {selectedReview.author.phoneNumber}</div>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reviewed Landlord</span>
                    {selectedReview.booking?.property?.id && (
                      <Link
                        href={`/properties/${selectedReview.booking.property.id}`}
                        target="_blank"
                        className="text-[10px] font-bold text-[#0F5132] hover:underline flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-3 h-3" /> Property
                      </Link>
                    )}
                  </div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {selectedReview.booking?.property?.landlord?.firstName} {selectedReview.booking?.property?.landlord?.lastName}
                  </div>
                  <div className="text-xs text-slate-500">{selectedReview.booking?.property?.landlord?.email}</div>
                  <div className="text-xs text-slate-400 truncate">{selectedReview.booking?.property?.title}</div>
                </div>
              </div>

              {/* Appeal Details & Adjudication Controls */}
              {selectedReview.appealStatus === 'PENDING' ? (
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-blue-200 dark:border-blue-900/50 space-y-3">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-extrabold text-xs uppercase tracking-wider">
                    <Scale className="w-4 h-4" /> Formal Appeal Grievance Filed
                  </div>
                  <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
                    <strong>Appellant Statement:</strong> &quot;{selectedReview.appealNote || 'No specific grievance text provided.'}&quot;
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Administrative Determination Note:
                    </label>
                    <textarea
                      placeholder="Enter official ruling rationale (sent to both parties)..."
                      value={appealNote}
                      onChange={(e) => setAppealNote(e.target.value)}
                      rows={2}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F5132]"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => appealMutation.mutate({ id: selectedReview.id, decision: 'ACCEPTED' })}
                      disabled={appealMutation.isPending}
                      className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      {appealMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      Accept Appeal (Unflag Review)
                    </button>
                    <button
                      onClick={() => appealMutation.mutate({ id: selectedReview.id, decision: 'REJECTED' })}
                      disabled={appealMutation.isPending}
                      className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      {appealMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                      Reject Appeal (Dismiss Claim)
                    </button>
                  </div>
                </div>
              ) : selectedReview.isFlagged ? (
                <div className="p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-300 flex items-center justify-between">
                  <div>
                    <strong>Flagged Status:</strong> This review is currently quarantined from public reputation scoring.
                  </div>
                  <button
                    onClick={() => appealMutation.mutate({ id: selectedReview.id, decision: 'ACCEPTED' })}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-red-200 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold hover:bg-red-50"
                  >
                    Remove Flag
                  </button>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
              <button
                onClick={async () => {
                  const shouldDelete = await confirm({
                    title: 'Delete Review',
                    message: 'Are you sure you want to delete this review? It will be permanently expunged.',
                    confirmText: 'Delete Review',
                    type: 'danger',
                  });
                  if (shouldDelete) {
                    deleteMutation.mutate(selectedReview.id);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
              >
                Delete Review
              </button>

              <button
                onClick={() => setSelectedReview(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
