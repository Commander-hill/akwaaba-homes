'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
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
  AlertCircle
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminFilterBar, { FilterConfig } from '@/components/admin/AdminFilterBar';
import AdminDataTable, { Column } from '@/components/admin/AdminDataTable';

export default function AdminReviewsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const res = await api.get('/admin/reviews');
      return res.data;
    }
  });

  const stats = useMemo(() => {
    if (!Array.isArray(reviews)) return { total: 0, avg: '5.0', flagged: 0, appeals: 0 };
    let sum = 0;
    let flagged = 0;
    let appeals = 0;

    reviews.forEach((r: any) => {
      sum += (r.rating || 5);
      if (r.isFlagged) flagged++;
      if (r.appealStatus === 'PENDING') appeals++;
    });

    const avg = reviews.length > 0 ? (sum / reviews.length).toFixed(1) : '5.0';
    return { total: reviews.length, avg, flagged, appeals };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (!Array.isArray(reviews)) return [];
    return reviews.filter((r: any) => {
      if (filter === 'FLAGGED' && !r.isFlagged) return false;
      if (filter === 'APPEALS' && r.appealStatus !== 'PENDING') return false;
      if (filter === 'CRITICAL' && r.rating > 2) return false;
      if (filter === 'FIVE_STAR' && r.rating !== 5) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const author = `${r.author?.firstName || ''} ${r.author?.lastName || ''}`.toLowerCase();
        const prop = (r.booking?.property?.title || '').toLowerCase();
        const comment = (r.comment || '').toLowerCase();
        const landlord = `${r.booking?.property?.landlord?.firstName || ''} ${r.booking?.property?.landlord?.lastName || ''}`.toLowerCase();

        return author.includes(q) || prop.includes(q) || comment.includes(q) || landlord.includes(q);
      }
      return true;
    });
  }, [reviews, filter, search]);

  const filterConfigs: FilterConfig[] = [
    {
      id: 'filter',
      label: 'Moderation Filter',
      value: filter,
      options: [
        { label: 'All Reviews', value: 'ALL' },
        { label: `Dispute Appeals (${stats.appeals})`, value: 'APPEALS' },
        { label: `Flagged (${stats.flagged})`, value: 'FLAGGED' },
        { label: 'Critical (1-2 ★)', value: 'CRITICAL' },
        { label: '5 ★ Perfect', value: 'FIVE_STAR' }
      ],
      onChange: setFilter
    }
  ];

  const columns: Column<any>[] = [
    {
      key: 'reviewer',
      header: 'Reviewer (Tenant)',
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300 shrink-0">
            {(r.author?.firstName || 'U')[0]}{(r.author?.lastName || '')[0]}
          </div>
          <div className="min-w-0">
            <Link
              href={`/admin/reviews/${r.id}`}
              className="font-bold text-xs text-zinc-900 dark:text-white hover:text-emerald-600 transition block truncate max-w-[150px]"
            >
              {r.author ? `${r.author.firstName} ${r.author.lastName}` : 'Anonymous Tenant'}
            </Link>
            <span className="text-[10px] text-zinc-400 block truncate max-w-[150px]">{r.author?.email}</span>
          </div>
        </div>
      )
    },
    {
      key: 'property',
      header: 'Property & Host',
      render: (r) => {
        const prop = r.booking?.property;
        return (
          <div className="space-y-0.5 max-w-[180px]">
            <div className="font-semibold text-xs text-zinc-900 dark:text-white truncate">
              {prop?.title || 'Residential Property'}
            </div>
            <div className="text-[10px] text-zinc-400 truncate">
              Host: {prop?.landlord ? `${prop.landlord.firstName} ${prop.landlord.lastName}` : 'Landlord'}
            </div>
          </div>
        );
      }
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <div className="flex text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-200 dark:text-zinc-700'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200">
            {r.rating}.0
          </span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        if (r.appealStatus === 'PENDING') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
              <Scale className="w-3 h-3" /> Appeal Pending
            </span>
          );
        }
        if (r.isFlagged) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
              <Flag className="w-3 h-3" /> Flagged
            </span>
          );
        }
        return <AdminStatusBadge status="PUBLISHED" />;
      }
    },
    {
      key: 'comment',
      header: 'Review Comment',
      render: (r) => (
        <p className="text-xs text-zinc-600 dark:text-zinc-300 max-w-xs line-clamp-2 italic" title={r.comment}>
          &quot;{r.comment || 'No comment text provided.'}&quot;
        </p>
      )
    },
    {
      key: 'date',
      header: 'Date',
      render: (r) => (
        <span className="text-xs text-zinc-400">
          {new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Inspection',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/admin/reviews/${r.id}`}
            className="px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition flex items-center gap-1"
          >
            <Eye className="w-3 h-3" /> Inspect Docket
          </Link>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Review Moderation & Trust Reputation"
        subtitle="Audit community feedback, adjudicate landlord rating appeals, and ensure marketplace fairness and integrity."
        badge={
          stats.appeals > 0 ? (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {stats.appeals} Appeal Dockets Pending
            </span>
          ) : undefined
        }
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Operations', href: '/admin/reviews' },
          { label: 'Reviews' }
        ]}
      />

      <AdminFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter reviews by tenant, landlord, property, or text keywords..."
        filters={filterConfigs}
        totalCount={filteredReviews.length}
      />

      <AdminDataTable
        columns={columns}
        data={filteredReviews}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyTitle="No reviews found"
        emptyDescription="No review records match your search filter."
      />
    </div>
  );
}
