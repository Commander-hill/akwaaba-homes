'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Star,
  MessageSquare,
  ThumbsUp,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  MoreVertical,
  CheckCircle2,
  Trophy,
  Building2,
  Eye,
  Flag,
  Scale,
  Search,
  Home,
  Heart,
} from 'lucide-react';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';

const parseFirstPropertyImage = (rawImages: unknown): string | null => {
  if (!rawImages) return null;
  if (Array.isArray(rawImages)) {
    const first = rawImages[0];
    return typeof first === 'string' && first.trim() ? first : null;
  }
  if (typeof rawImages === 'string') {
    const trimmed = rawImages.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
          return parsed[0];
        }
      } catch {
        return null;
      }
    }
    return trimmed;
  }
  return null;
};

const formatRelativeDate = (iso?: string): string => {
  if (!iso) return 'Recently';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Recently';
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getInitials = (firstName?: string, lastName?: string): string => {
  const f = (firstName || '').trim().charAt(0);
  const l = (lastName || '').trim().charAt(0);
  return `${f}${l}`.toUpperCase() || 'T';
};

export default function AdminReviewsPage() {
  const [propertyFilter, setPropertyFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [chartWindow, setChartWindow] = useState<'6M' | '12M'>('6M');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const res = await api.get('/admin/reviews');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const propertyOptions = useMemo(() => {
    const map = new Map<string, string>();
    (reviews as any[]).forEach((r) => {
      const prop = r.booking?.property;
      if (prop?.id && prop?.title) {
        map.set(prop.id, prop.title);
      }
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [reviews]);

  const stats = useMemo(() => {
    const list = Array.isArray(reviews) ? reviews : [];
    if (list.length === 0) {
      return {
        total: 0,
        avg: 0,
        positiveCount: 0,
        positivePct: 0,
        verifiedPct: 0,
      };
    }
    let sum = 0;
    let positive = 0;
    let verified = 0;

    list.forEach((r: any) => {
      const rating = Number(r.rating || 0);
      sum += rating;
      if (rating >= 4) positive += 1;
      if (r.bookingId || r.booking) verified += 1;
    });

    return {
      total: list.length,
      avg: Number((sum / list.length).toFixed(1)),
      positiveCount: positive,
      positivePct: Math.round((positive / list.length) * 100),
      verifiedPct: Math.round((verified / list.length) * 100),
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (reviews as any[]).filter((r) => {
      if (propertyFilter !== 'ALL' && r.booking?.property?.id !== propertyFilter) {
        return false;
      }
      if (q) {
        const author = `${r.author?.firstName || ''} ${r.author?.lastName || ''}`.toLowerCase();
        const prop = (r.booking?.property?.title || '').toLowerCase();
        const comment = (r.comment || '').toLowerCase();
        if (!author.includes(q) && !prop.includes(q) && !comment.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [reviews, propertyFilter, search]);

  const visibleReviews = useMemo(() => {
    return showAll ? filteredReviews : filteredReviews.slice(0, 5);
  }, [filteredReviews, showAll]);

  const chartPoints = useMemo(() => {
    const now = new Date();
    const bucketMonths = chartWindow === '6M' ? 1 : 2;
    const list = Array.isArray(reviews) ? reviews : [];

    const buckets = Array.from({ length: 6 }, (_, i) => {
      const monthsAgo = (5 - i) * bucketMonths;
      const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo - (bucketMonths - 1), 1);
      const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0, 23, 59, 59, 999);
      const label = end.toLocaleDateString('en-US', { month: 'short' });
      let sum = 0;
      let count = 0;
      list.forEach((r: any) => {
        const d = new Date(r.createdAt);
        if (!Number.isNaN(d.getTime()) && d >= start && d <= end) {
          sum += Number(r.rating || 0);
          count += 1;
        }
      });
      const val = count > 0 ? Number((sum / count).toFixed(1)) : 0;
      const y = val > 0 ? Math.max(22, Math.min(118, Math.round(105 - (val - 3.0) * 40))) : 122;
      return {
        label,
        val,
        count,
        x: 36 + i * 53,
        y,
      };
    });

    const linePath = buckets
      .map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x} ${pt.y}`)
      .join(' ');
    const areaPath = `${linePath} L${buckets[buckets.length - 1].x} 126 L${buckets[0].x} 126 Z`;

    return { points: buckets, linePath, areaPath };
  }, [reviews, chartWindow]);

  const loveHighlights = useMemo(() => {
    const list = Array.isArray(reviews) ? reviews : [];
    if (list.length === 0) return [];
    const themes = [
      { label: 'Great location', keywords: ['location', 'neighborhood', 'area', 'central', 'close to'] },
      { label: 'Responsive host', keywords: ['host', 'landlord', 'responsive', 'communication', 'helpful'] },
      { label: 'Well-maintained property', keywords: ['clean', 'maintained', 'well-kept', 'tidy', 'neat'] },
      { label: 'Safe & secure', keywords: ['safe', 'secure', 'security', 'quiet'] },
      { label: 'Smooth booking process', keywords: ['smooth', 'easy', 'process', 'check-in', 'recommend'] },
    ];
    return themes
      .map((t) => ({
        label: t.label,
        hits: list.filter((r: any) => {
          const text = String(r.comment || '').toLowerCase();
          return t.keywords.some((kw) => text.includes(kw));
        }).length,
      }))
      .filter((t) => t.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 3)
      .map((t) => t.label);
  }, [reviews]);

  return (
    <div className="space-y-5 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-black text-zinc-900 dark:text-white tracking-tight leading-tight">
            Reviews &amp; Ratings
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            See what tenants are saying about properties and services across the platform.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAll((v) => !v);
            setPropertyFilter('ALL');
            setSearch('');
          }}
          className="h-10 px-4 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-zinc-800 dark:text-zinc-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition inline-flex items-center gap-2 cursor-pointer self-start sm:self-auto shadow-2xs"
        >
          <MessageSquare className="w-4 h-4 text-[#04793d] dark:text-emerald-400" />
          <span>{showAll ? 'Show Recent Reviews' : 'View All Reviews'}</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#04793d] dark:text-emerald-400" />
        </button>
      </div>

      {/* 4 Soft-Mint KPI Strip Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Overall Rating */}
        <div className="rounded-[20px] bg-[#EBF9F0] dark:bg-emerald-950/35 border border-emerald-100 dark:border-emerald-900/50 px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-[#059669] dark:text-emerald-400 shadow-2xs shrink-0">
            <Star className="w-6 h-6 fill-[#059669] dark:fill-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white leading-none">
              {stats.avg.toFixed(1)}
            </div>
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mt-1">
              Overall Rating
            </div>
            <div className="flex items-center gap-0.5 mt-1 text-amber-400">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i <= Math.round(stats.avg) ? 'fill-amber-400 text-amber-400' : 'text-zinc-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Total Reviews */}
        <div className="rounded-[20px] bg-[#EBF9F0] dark:bg-emerald-950/35 border border-emerald-100 dark:border-emerald-900/50 px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-[#059669] dark:text-emerald-400 shadow-2xs shrink-0">
            <MessageSquare className="w-5 h-5 fill-[#059669] dark:fill-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white leading-none">
              {stats.total}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                Total Reviews
              </span>
              <span className="text-[11px] font-bold text-[#059669] dark:text-emerald-400">
                {stats.positiveCount} positive
              </span>
            </div>
          </div>
        </div>

        {/* Positive Feedback */}
        <div className="rounded-[20px] bg-[#EBF9F0] dark:bg-emerald-950/35 border border-emerald-100 dark:border-emerald-900/50 px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-[#059669] dark:text-emerald-400 shadow-2xs shrink-0">
            <ThumbsUp className="w-5 h-5 fill-[#059669] dark:fill-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white leading-none">
              {stats.positivePct}%
            </div>
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mt-1.5">
              Positive Feedback
            </div>
          </div>
        </div>

        {/* Verified Reviews */}
        <div className="rounded-[20px] bg-[#EBF9F0] dark:bg-emerald-950/35 border border-emerald-100 dark:border-emerald-900/50 px-5 py-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-[#059669] dark:text-emerald-400 shadow-2xs shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-900 dark:text-white leading-none">
              {stats.verifiedPct}%
            </div>
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mt-1.5">
              Verified Reviews
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Recent Reviews Feed */}
        <div className="xl:col-span-8 rounded-[22px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Recent Reviews</h2>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search properties, tenants..."
                  className="h-9 pl-8 pr-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 w-48"
                />
              </div>

              <div className="relative">
                <select
                  value={propertyFilter}
                  onChange={(e) => setPropertyFilter(e.target.value)}
                  aria-label="Filter by property"
                  className="appearance-none h-9 pl-3.5 pr-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/25"
                >
                  <option value="ALL">All Properties</option>
                  {propertyOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
              ))}
            </div>
          ) : visibleReviews.length === 0 ? (
            <div className="py-14 text-center">
              <MessageSquare className="w-9 h-9 text-zinc-300 dark:text-zinc-600 mx-auto mb-2.5" />
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No reviews found</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Adjust your property filter or search query to view tenant feedback.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {visibleReviews.map((r: any) => {
                const authorName = r.author
                  ? `${r.author.firstName || ''} ${r.author.lastName || ''}`.trim() || 'Tenant'
                  : 'Verified Tenant';
                const prop = r.booking?.property;
                const propTitle = prop?.title || 'Residential Property';
                const propImg = parseFirstPropertyImage(prop?.images);
                const rating = Math.max(1, Math.min(5, Number(r.rating || 5)));

                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-emerald-200 dark:hover:border-emerald-800/70 transition-colors"
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {r.author?.avatarUrl ? (
                        <img
                          src={getImageUrl(r.author.avatarUrl)}
                          alt={authorName}
                          className="w-12 h-12 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#EAF7EE] dark:bg-emerald-950/70 text-[#04793d] dark:text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0">
                          {getInitials(r.author?.firstName, r.author?.lastName)}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link
                            href={`/admin/reviews/${r.id}`}
                            className="text-sm font-bold text-zinc-900 dark:text-white hover:text-emerald-600 transition"
                          >
                            {authorName}
                          </Link>
                          <CheckCircle2 className="w-4 h-4 text-[#059669] dark:text-emerald-400 fill-[#059669] text-white" />
                          {r.isFlagged && (
                            <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-bold">
                              <Flag className="w-2.5 h-2.5" /> Flagged
                            </span>
                          )}
                          {r.appealStatus === 'PENDING' && (
                            <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-bold">
                              <Scale className="w-2.5 h-2.5" /> Appeal Pending
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          Tenant • {formatRelativeDate(r.createdAt)}
                        </div>

                        <div className="flex items-center gap-0.5 my-1.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i <= rating
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-zinc-200 dark:text-zinc-700'
                              }`}
                            />
                          ))}
                        </div>

                        <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed line-clamp-2">
                          &ldquo;{r.comment || 'Verified stay feedback.'}&rdquo;
                        </p>
                      </div>
                    </div>

                    {/* Right Property Thumbnail + Menu */}
                    <div className="flex items-start justify-between sm:justify-end gap-2 shrink-0">
                      <div className="flex flex-col items-start sm:items-end gap-1.5">
                        {propImg ? (
                          <img
                            src={getImageUrl(propImg)}
                            alt={propTitle}
                            className="w-32 h-16 rounded-xl object-cover border border-zinc-200 dark:border-zinc-700"
                          />
                        ) : (
                          <div className="w-32 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <Building2 className="w-5 h-5" />
                          </div>
                        )}
                        <span className="px-2.5 py-0.5 rounded-full bg-[#E6F7EE] dark:bg-emerald-950/60 text-[#047857] dark:text-emerald-300 text-[10px] font-bold max-w-[140px] truncate">
                          {propTitle}
                        </span>
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === r.id ? null : r.id);
                          }}
                          aria-label="Review actions"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === r.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-lg py-1.5 text-left"
                          >
                            <Link
                              href={`/admin/reviews/${r.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Inspect &amp; Moderate
                            </Link>
                            {prop?.id && (
                              <Link
                                href={`/admin/properties/${prop.id}`}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              >
                                <Building2 className="w-3.5 h-3.5" />
                                View Property
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <aside className="xl:col-span-4 space-y-4">
          {/* Rating Overview Dark Emerald Card */}
          <div className="rounded-[22px] bg-gradient-to-b from-[#064e2b] to-[#022c18] text-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">Your Rating Overview</h2>
              <div className="relative">
                <select
                  value={chartWindow}
                  onChange={(e) => setChartWindow(e.target.value as '6M' | '12M')}
                  aria-label="Rating overview range"
                  className="appearance-none h-8 pl-3 pr-7 rounded-xl bg-white/10 border border-white/15 text-[11px] font-semibold text-white cursor-pointer focus:outline-none"
                >
                  <option value="6M" className="text-zinc-900">Last 6 Months</option>
                  <option value="12M" className="text-zinc-900">Last 12 Months</option>
                </select>
                <ChevronDown className="w-3 h-3 text-emerald-200 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Trend Area Chart */}
            <div className="relative h-44 w-full pt-2">
              <svg viewBox="0 0 320 150" className="w-full h-full overflow-visible" aria-hidden="true">
                <defs>
                  <linearGradient id="reviewAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {[25, 65, 105].map((y) => (
                  <line
                    key={y}
                    x1="28"
                    y1={y}
                    x2="308"
                    y2={y}
                    stroke="rgba(255,255,255,0.12)"
                    strokeDasharray="3 3"
                  />
                ))}

                <text x="2" y="28" fontSize="10" fill="rgba(255,255,255,0.7)">5.0</text>
                <text x="2" y="68" fontSize="10" fill="rgba(255,255,255,0.7)">4.0</text>
                <text x="2" y="108" fontSize="10" fill="rgba(255,255,255,0.7)">3.0</text>

                <path
                  d={chartPoints.areaPath}
                  fill="url(#reviewAreaGrad)"
                />
                <path
                  d={chartPoints.linePath}
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {chartPoints.points.map((pt) => (
                    <g key={pt.label}>
                      {pt.count > 0 && (
                        <g transform={`translate(${pt.x - 14}, ${pt.y - 24})`}>
                          <rect width="28" height="16" rx="6" fill="#ffffff" />
                          <text
                            x="14"
                            y="11"
                            textAnchor="middle"
                            fontSize="9"
                            fontWeight="800"
                            fill="#064e2b"
                          >
                            {pt.val.toFixed(1)}
                          </text>
                        </g>
                      )}
                      <circle cx={pt.x} cy={pt.y} r="4" fill="#34d399" stroke="#ffffff" strokeWidth="1.5" />
                      <text x={pt.x} y="144" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.75)">
                        {pt.label}
                      </text>
                    </g>
                ))}
              </svg>
            </div>

            {/* Bottom Excellent Callout */}
            <div className="rounded-2xl bg-[#E8F8EE] text-zinc-900 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-zinc-900">
                  {stats.total === 0
                    ? 'No Ratings Yet'
                    : stats.avg >= 4.5
                    ? 'Rated Excellent!'
                    : stats.avg >= 3.5
                    ? 'Good Standing'
                    : 'Needs Attention'}
                </div>
                <div className="text-[11px] text-zinc-600">
                  {stats.total === 0
                    ? 'Tenant ratings will appear here once reviews are submitted.'
                    : `${stats.positivePct}% positive feedback across ${stats.total} reviews.`}
                </div>
              </div>
            </div>
          </div>

          {/* What tenants love most Card */}
          <div className="relative overflow-hidden rounded-[22px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)]">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-3.5">
              What tenants love most
            </h2>
            {loveHighlights.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 relative z-10">
                No tenant feedback highlights yet.
              </p>
            ) : (
              <ul className="space-y-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 relative z-10">
                {loveHighlights.map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="absolute right-4 bottom-3 opacity-15 pointer-events-none select-none flex flex-col items-center">
              <Heart className="w-6 h-6 text-[#059669] fill-[#059669] mb-0.5" />
              <Home className="w-12 h-12 text-[#059669]" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
