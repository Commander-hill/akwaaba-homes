'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Receipt,
  Plus,
  Zap,
  Droplets,
  Wifi,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Share2,
  Trash2,
  Loader2,
  Calendar,
  Building,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import ResidentLockedTeaser from '@/components/tenant-ui/ResidentLockedTeaser';
import { TablePageSkeleton, useInitialSkeleton } from '@/components/ui/PageSkeletons';

export default function TenantBillsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'SETTLED'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: billsData, isLoading } = useQuery({
    queryKey: ['billSplits', 'tenant'],
    queryFn: async () => {
      try {
        const res = await api.get('/bill-splits');
        return res.data?.splits || res.data?.billSplits || [];
      } catch {
        return [];
      }
    }
  });

  const { data: bookingsData, isLoading: isBookingsLoading } = useQuery({
    queryKey: ['bookings', 'tenant'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/bookings/me');
        return Array.isArray(data) ? data : data?.bookings || [];
      } catch {
        return [];
      }
    },
  });

  const bookingsList: any[] = Array.isArray(bookingsData)
    ? bookingsData
    : Array.isArray((bookingsData as any)?.bookings)
    ? (bookingsData as any).bookings
    : [];

  const hasActiveStay = Boolean(
    bookingsList.some((b: any) =>
      ['ACTIVE', 'CHECKED_IN', 'CONFIRMED', 'APPROVED'].includes(b.status)
    )
  );

  const togglePaidMutation = useMutation({
    mutationFn: async ({ participantId, isPaid }: { participantId: string; isPaid: boolean }) => {
      const res = await api.patch(`/bill-splits/participants/${participantId}/status`, { isPaid });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Contribution status updated');
      queryClient.invalidateQueries({ queryKey: ['billSplits', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update payment status');
    }
  });

  const rawSplits: any[] = billsData || [];
  const showSkeleton = useInitialSkeleton(isLoading || isBookingsLoading);
  if (showSkeleton) return <TablePageSkeleton rows={4} columns={4} />;

  if (!isLoading && !isBookingsLoading && !hasActiveStay && rawSplits.length === 0) {
    return (
      <ResidentLockedTeaser
        icon={Receipt}
        title="Rent & Utility Bills Splitting"
        badge="Unlocks Upon Active Residence"
        description="Split ECG electricity, Ghana Water Company, and high-speed Wi-Fi expenses with flatmates and track who has contributed in real time."
        bullets={[
          'Automatic split calculations per roommate',
          'Ghana MoMo and card payment collection',
          'Instant proof of payment receipts for compound audit',
        ]}
        ctaText="Find & Book Your Residence"
        ctaHref="/properties"
      />
    );
  }

  // Fallback demo splits if empty
  const splits = rawSplits.length > 0 ? rawSplits : [
    {
      id: 'BS-9021',
      title: 'ECG Prepaid Electricity Meter Top-Up',
      category: 'ELECTRICITY',
      totalAmount: 400,
      sharePerPerson: 100,
      dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      status: 'ACTIVE',
      property: {
        title: 'GLACIER STUDIO',
        location: 'Achimota, Accra'
      },
      participants: [
        { id: 'p1', name: 'You (Tenant)', isPaid: true, amount: 100 },
        { id: 'p2', name: 'Kwame M.', isPaid: true, amount: 100 },
        { id: 'p3', name: 'Esi O.', isPaid: false, amount: 100 },
        { id: 'p4', name: 'Kofi B.', isPaid: false, amount: 100 }
      ]
    },
    {
      id: 'BS-9022',
      title: 'Starlink High-Speed Fiber Internet',
      category: 'INTERNET',
      totalAmount: 600,
      sharePerPerson: 150,
      dueDate: new Date(Date.now() + 86400000 * 12).toISOString(),
      status: 'ACTIVE',
      property: {
        title: 'GLACIER STUDIO',
        location: 'Achimota, Accra'
      },
      participants: [
        { id: 'p5', name: 'You (Tenant)', isPaid: true, amount: 150 },
        { id: 'p6', name: 'Kwame M.', isPaid: false, amount: 150 },
        { id: 'p7', name: 'Esi O.', isPaid: false, amount: 150 },
        { id: 'p8', name: 'Kofi B.', isPaid: false, amount: 150 }
      ]
    }
  ];

  const filteredSplits = splits.filter((s: any) => {
    if (activeTab === 'ACTIVE') return s.status === 'ACTIVE' || !s.status;
    if (activeTab === 'SETTLED') return s.status === 'SETTLED' || s.status === 'COMPLETED';
    return true;
  });

  const getCategoryIcon = (category: string) => {
    switch (category?.toUpperCase()) {
      case 'ELECTRICITY':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'WATER':
        return <Droplets className="w-4 h-4 text-blue-500" />;
      case 'INTERNET':
        return <Wifi className="w-4 h-4 text-emerald-500" />;
      default:
        return <Receipt className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6 pb-24">
      {/* Top Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#16A34A] tracking-wider uppercase block">
            SHARED UTILITIES
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
            Shared Utility Splits
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Coordinate electricity, water tanker, and Wi-Fi splits transparently with flatmates.
          </p>
        </div>

        <Link
          href="/dashboard/tenant/bills/split/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Create Bill Split</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={clsx(
            'px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer',
            activeTab === 'ALL'
              ? 'bg-[#16A34A] text-white shadow-2xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          )}
        >
          All Splits
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ACTIVE')}
          className={clsx(
            'px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer',
            activeTab === 'ACTIVE'
              ? 'bg-[#16A34A] text-white shadow-2xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          )}
        >
          Active / In Progress
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SETTLED')}
          className={clsx(
            'px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer',
            activeTab === 'SETTLED'
              ? 'bg-[#16A34A] text-white shadow-2xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          )}
        >
          Settled
        </button>
      </div>

      {/* List of Splits */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
          <p className="text-xs font-semibold text-zinc-500">Loading utility splits...</p>
        </div>
      ) : filteredSplits.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] mx-auto flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
            No active utility splits
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            Split monthly electricity units, generator diesel fuel, or fiber internet bills among housemates.
          </p>
          <Link
            href="/dashboard/tenant/bills/split/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Start a Bill Split</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredSplits.map((s: any) => {
            const participants: any[] = s.participants || [];
            const paidCount = participants.filter((p) => p.isPaid).length;
            const totalCount = participants.length || 1;
            const progressPercent = Math.round((paidCount / totalCount) * 100);
            const isSettled = paidCount === totalCount;

            return (
              <div
                key={s.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xs relative"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                      {getCategoryIcon(s.category)}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
                        {s.title}
                      </h4>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Due {new Date(s.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>

                  <span
                    className={clsx(
                      'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase',
                      isSettled
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                    )}
                  >
                    {isSettled ? 'FULLY SETTLED' : `${paidCount}/${totalCount} PAID`}
                  </span>
                </div>

                {/* Amount Summary */}
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Cost</span>
                    <span className="text-xl font-black text-zinc-950 dark:text-white">
                      GH₵ {Number(s.totalAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">Share Each</span>
                    <span className="text-sm font-bold text-[#16A34A]">
                      GH₵ {Number(s.sharePerPerson || s.totalAmount / totalCount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-zinc-500">
                    <span>Collection progress</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-[#16A34A] rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Participants List */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Roommate Shares</span>
                  <div className="space-y-1.5">
                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                      >
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {p.name || p.user?.firstName || 'Roommate'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={clsx(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full',
                              p.isPaid
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                            )}
                          >
                            {p.isPaid ? 'PAID' : 'PENDING'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
