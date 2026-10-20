'use client';

import React from 'react';
import { Search, X, Filter, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

export interface FilterOption {
  id: string;
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

export type FilterConfig = FilterOption;

export interface AdminFilterBarProps {
  searchQuery?: string;
  search?: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  onReset?: () => void;
  hasActiveFilters?: boolean;
  totalResults?: number;
  totalCount?: number;
  rightAction?: React.ReactNode;
  className?: string;
}

export default function AdminFilterBar({
  searchQuery,
  search,
  onSearchChange,
  searchPlaceholder = 'Search records by name, email, identifier...',
  filters = [],
  onReset,
  hasActiveFilters,
  totalResults,
  totalCount,
  rightAction,
  className
}: AdminFilterBarProps) {
  const query = searchQuery ?? search ?? '';
  const count = totalResults ?? totalCount;

  return (
    <div className={clsx('space-y-3', className)}>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-10 pl-10 pr-9 bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#0F5132] focus:ring-2 focus:ring-[#0F5132]/20 transition"
          />
          {query && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              aria-label="Clear search query"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right action / Count */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          {count !== undefined && (
            <span className="text-xs text-zinc-500 font-medium">
              Showing <strong className="text-zinc-900 dark:text-white font-bold">{count}</strong> records
            </span>
          )}

          {rightAction}

          {onReset && hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Filters row */}
      {filters.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 shrink-0 mr-1">
            <Filter className="w-3 h-3" /> Filters:
          </div>

          {filters.map((filter) => (
            <div key={filter.id} className="relative shrink-0">
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="h-8 pl-3 pr-7 bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-[#0F5132] cursor-pointer appearance-none"
              >
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]">
                ▼
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
