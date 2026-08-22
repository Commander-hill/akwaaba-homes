'use client';

import React from 'react';

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export default function SkeletonTable({ rows = 5, columns = 5 }: SkeletonTableProps) {
  return (
    <div className="w-full animate-pulse p-6 space-y-4 bg-white dark:bg-[#0a0a0a] rounded-2xl">
      {/* Skeleton Header */}
      <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-full flex items-center px-4 gap-4">
        {Array.from({ length: columns }).map((_, idx) => (
          <div key={idx} className="h-4 bg-slate-200 dark:bg-slate-700/80 rounded flex-1" />
        ))}
      </div>

      {/* Skeleton Rows */}
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center gap-4 py-4 border-b border-[var(--border)]">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800/80 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-800/80 rounded w-1/3" />
            <div className="h-3 bg-slate-100 dark:bg-slate-800/40 rounded w-1/2" />
          </div>
          <div className="w-24 h-6 bg-slate-200 dark:bg-slate-800/80 rounded-lg" />
          <div className="w-28 h-6 bg-slate-200 dark:bg-slate-800/80 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
