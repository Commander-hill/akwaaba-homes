'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Inbox, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  width?: string;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  pageSize?: number;
}

interface AdminDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  pagination?: PaginationProps;
  onRowClick?: (row: T) => void;
  className?: string;
}

export default function AdminDataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyMessage,
  emptyDescription,
  emptyAction,
  pagination,
  onRowClick,
  className
}: AdminDataTableProps<T>) {
  const displayEmptyMessage = emptyMessage ?? emptyDescription ?? 'There are no records matching your selected parameters.';
  if (isLoading) {
    return (
      <div className="w-full rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-12 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#0F5132] dark:text-emerald-400" />
        <p className="text-xs font-bold text-zinc-500">Loading catalog records...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto border border-zinc-200/60 dark:border-zinc-700/60">
          <Inbox className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-zinc-950 dark:text-white">{emptyTitle}</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">{displayEmptyMessage}</p>
        </div>
        {emptyAction && <div className="pt-2">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className={clsx('w-full rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xs', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={clsx(
                    'py-3.5 px-4 font-bold',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-200">
            {data.map((row, index) => {
              const rowKey = keyExtractor(row);
              return (
                <tr
                  key={rowKey}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={clsx(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                  )}
                >
                  {columns.map((col) => {
                    const content = col.render ? col.render(row, index) : (row as any)[col.key];
                    return (
                      <td
                        key={col.key}
                        className={clsx(
                          'py-3 px-4 text-xs',
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right',
                          col.className
                        )}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-500">
          <div>
            Page <span className="font-bold text-zinc-900 dark:text-white">{pagination.page}</span> of{' '}
            <span className="font-bold text-zinc-900 dark:text-white">{pagination.totalPages}</span>
            {pagination.total !== undefined && ` (${pagination.total.toLocaleString()} total)`}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-white dark:hover:bg-zinc-800 transition cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 hover:bg-white dark:hover:bg-zinc-800 transition cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
