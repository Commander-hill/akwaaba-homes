'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface QueryErrorFallbackProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

/**
 * Standardized Channel-3 error fallback for failed React Query data loads.
 * Prevents failed API calls from masquerading as empty states.
 */
export default function QueryErrorFallback({
  title = 'Unable to load data',
  message = 'We encountered a problem connecting to the server. Please check your connection and try again.',
  onRetry,
  isRetrying = false,
  className = '',
}: QueryErrorFallbackProps) {
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/25 p-6 text-center flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{title}</h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-rose-200 dark:border-rose-800 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
          <span>{isRetrying ? 'Retrying...' : 'Try Again'}</span>
        </button>
      )}
    </div>
  );
}
