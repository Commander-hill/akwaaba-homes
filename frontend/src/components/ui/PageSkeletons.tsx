'use client';

import React, { useEffect, useState } from 'react';
import SkeletonTable from '@/components/SkeletonTable';

/**
 * Ensures a page displays its skeleton frame during initial mount/navigation
 * even when React Query data is already cached or fallback data is present,
 * and stays active as long as `isQueryLoading` is true.
 */
export function useInitialSkeleton(isQueryLoading = false, minDurationMs = 160): boolean {
  const [initialLoading, setInitialLoading] = useState(true);
  const [maxHoldExpired, setMaxHoldExpired] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, minDurationMs);
    const maxTimer = setTimeout(() => setMaxHoldExpired(true), 850);
    return () => { clearTimeout(timer); clearTimeout(maxTimer); };
  }, [minDurationMs]);

  return initialLoading || (isQueryLoading && !maxHoldExpired);
}

export function DashboardOverviewSkeleton() {
  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-5 pb-6 animate-pulse">
      {/* Hero Banner Skeleton */}
      <div className="relative rounded-[22px] bg-slate-200/80 dark:bg-slate-800/60 min-h-[210px] p-7 flex flex-col justify-center">
        <div className="space-y-3 max-w-md">
          <div className="h-5 w-36 bg-slate-300 dark:bg-slate-700 rounded-lg" />
          <div className="h-9 w-64 bg-slate-300 dark:bg-slate-700 rounded-xl" />
          <div className="h-4 w-80 bg-slate-300/80 dark:bg-slate-700/70 rounded-lg" />
          <div className="h-4 w-60 bg-slate-300/80 dark:bg-slate-700/70 rounded-lg" />
          <div className="pt-2">
            <div className="h-10 w-44 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>

      {/* 4 KPI Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[18px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-5 py-4 h-[92px] flex items-center gap-4 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        {/* Left 8 Columns */}
        <div className="xl:col-span-8 flex flex-col gap-5">
          <div className="bg-white dark:bg-slate-900 rounded-[22px] border border-slate-100 dark:border-slate-800 p-5 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-[18px] border border-slate-100 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-800/30"
                >
                  <div className="h-[148px] bg-slate-200 dark:bg-slate-800 w-full" />
                  <div className="p-3.5 space-y-2.5">
                    <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3 w-1/2 bg-slate-200/70 dark:bg-slate-800 rounded" />
                    <div className="h-5 w-2/5 bg-slate-200 dark:bg-slate-700 rounded pt-1" />
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="h-7 bg-slate-200/70 dark:bg-slate-800 rounded-lg" />
                      <div className="h-7 bg-slate-200/70 dark:bg-slate-800 rounded-lg" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Banner Skeleton */}
          <div className="rounded-[20px] bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 px-6 py-4 h-[76px] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="space-y-2">
                <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-3 w-64 bg-slate-200/70 dark:bg-slate-800/60 rounded" />
              </div>
            </div>
            <div className="h-9 w-40 bg-slate-200 dark:bg-slate-800 rounded-full hidden sm:block" />
          </div>
        </div>

        {/* Right 4 Columns */}
        <div className="xl:col-span-4 flex flex-col gap-5">
          <div className="rounded-[22px] bg-slate-200/80 dark:bg-slate-800/60 p-5 h-[155px] flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-5 w-40 bg-slate-300 dark:bg-slate-700 rounded" />
              <div className="h-3.5 w-52 bg-slate-300/80 dark:bg-slate-700/70 rounded" />
            </div>
            <div className="h-9 w-36 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[22px] border border-slate-100 dark:border-slate-800 p-5 shadow-sm flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3.5 py-2">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-3/5 bg-slate-200 dark:bg-slate-800 rounded" />
                  <div className="h-3 w-2/5 bg-slate-100 dark:bg-slate-800/60 rounded" />
                </div>
                <div className="h-3 w-12 bg-slate-100 dark:bg-slate-800/60 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton() {
  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-5 pb-6 animate-pulse">
      {/* Hero Banner Skeleton */}
      <div className="rounded-[22px] bg-slate-200/75 dark:bg-slate-800/60 min-h-[185px] p-7 flex flex-col justify-center">
        <div className="space-y-3 max-w-md">
          <div className="h-3.5 w-32 bg-slate-300 dark:bg-slate-700 rounded" />
          <div className="h-9 w-60 bg-slate-300 dark:bg-slate-700 rounded-xl" />
          <div className="h-4 w-80 bg-slate-300/80 dark:bg-slate-700/70 rounded" />
        </div>
      </div>

      {/* 4 KPI Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[18px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-5 py-4 h-[92px] flex items-center gap-4 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-3.5 w-28 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-28 bg-slate-200/80 dark:bg-slate-800 rounded-full" />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-64 bg-slate-200/70 dark:bg-slate-800 rounded-full" />
          <div className="h-10 w-36 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>
      </div>

      {/* 3-Column Property Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-[22px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm p-3 space-y-3.5"
          >
            <div className="h-[195px] bg-slate-200 dark:bg-slate-800 rounded-[16px] w-full" />
            <div className="px-2 space-y-2.5">
              <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-3.5 w-1/2 bg-slate-100 dark:bg-slate-800 rounded" />
              <div className="flex items-center justify-between pt-1">
                <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
              <div className="flex items-center gap-3 py-2 border-y border-slate-100 dark:border-slate-800">
                <div className="h-3.5 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-3.5 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-3.5 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="h-9 bg-slate-200/80 dark:bg-slate-800 rounded-full" />
                <div className="h-9 bg-slate-200/80 dark:bg-slate-800 rounded-full" />
                <div className="h-9 bg-slate-200/80 dark:bg-slate-800 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BookingListSkeleton() {
  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-5 pb-6 animate-pulse">
      {/* Hero Banner Skeleton */}
      <div className="rounded-[22px] bg-slate-200/75 dark:bg-slate-800/60 min-h-[140px] p-7 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-slate-300 dark:bg-slate-700 shrink-0" />
        <div className="space-y-2.5">
          <div className="h-7 w-48 bg-slate-300 dark:bg-slate-700 rounded-lg" />
          <div className="h-4 w-72 bg-slate-300/80 dark:bg-slate-700/70 rounded" />
        </div>
      </div>

      {/* 4 KPI Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[18px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-5 py-4 h-[92px] flex items-center gap-4 shadow-sm"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-3.5 w-24 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Pills Skeleton */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-32 bg-slate-200/80 dark:bg-slate-800 rounded-full" />
          ))}
        </div>
        <div className="h-10 w-36 bg-slate-200/80 dark:bg-slate-800 rounded-full" />
      </div>

      {/* 3 Horizontal Booking Cards Skeleton */}
      <div className="space-y-3.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-[20px] border border-slate-100 dark:border-slate-800 p-4 flex flex-col lg:flex-row items-center justify-between gap-5 shadow-sm"
          >
            <div className="flex items-center gap-4 w-full lg:w-[46%]">
              <div className="w-[180px] h-[112px] rounded-[14px] bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="space-y-2.5 flex-1">
                <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3.5 w-32 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-3.5 w-64 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-6 w-52 bg-slate-200/70 dark:bg-slate-800 rounded-full" />
              </div>
            </div>
            <div className="flex items-center gap-3.5 w-full lg:w-[24%]">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="space-y-2">
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="h-3.5 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-2.5 w-full lg:w-[26%]">
              <div className="h-6 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-9 w-36 bg-slate-200 dark:bg-slate-800 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TablePageSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 pb-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          <div className="h-4 w-80 bg-slate-200/70 dark:bg-slate-800/60 rounded-lg" />
        </div>
        <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>

      {/* 4 KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 space-y-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="h-7 w-28 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <SkeletonTable rows={rows} columns={columns} />
      </div>
    </div>
  );
}
