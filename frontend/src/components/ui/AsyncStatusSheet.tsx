'use client';

import React from 'react';
import { Check, AlertTriangle, Send, Loader2, ArrowUpRight } from 'lucide-react';
import BottomSheetHandle from './BottomSheetHandle';
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss';

export type AsyncSheetStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncStatusSheetProps {
  status: AsyncSheetStatus;
  loadingTitle?: string;
  loadingLabel?: string;
  successTitle?: string;
  successMessage?: string;
  successActionLabel?: string;
  onSuccessAction?: () => void;
  errorTitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onClose: () => void;
}

export default function AsyncStatusSheet({
  status,
  loadingTitle = 'Performing update...',
  loadingLabel = 'Processing...',
  successTitle = 'All set!',
  successMessage = 'Your changes have been saved and applied.',
  successActionLabel,
  onSuccessAction,
  errorTitle = 'There is a problem',
  errorMessage = 'Please check your connection and try again.',
  onRetry,
  onClose,
}: AsyncStatusSheetProps) {
  const isBusy = status === 'loading';
  const { dragHandlers, sheetStyle } = useSwipeToDismiss({
    onDismiss: onClose,
    disabled: isBusy,
  });

  if (status === 'idle') return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) onClose();
      }}
    >
      <div
        {...dragHandlers}
        style={sheetStyle}
        className="w-full sm:max-w-sm bg-white dark:bg-[#12151D] border-t sm:border border-zinc-200/80 dark:border-zinc-800 rounded-t-[28px] rounded-b-none sm:rounded-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45)] text-center space-y-4 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        <BottomSheetHandle />

        {status === 'loading' && (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-sky-50 dark:bg-sky-950/50 border border-sky-200/70 dark:border-sky-800/60 flex items-center justify-center text-sky-500">
              <Send className="w-6 h-6 animate-pulse" />
            </div>
            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {loadingTitle}
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold shadow-sm">
                <span>{loadingLabel}</span>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </span>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Check className="w-7 h-7 stroke-[3]" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-zinc-900 dark:text-white tracking-tight">
                {successTitle}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {successMessage}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
              {successActionLabel && onSuccessAction && (
                <button
                  type="button"
                  onClick={onSuccessAction}
                  className="flex-1 py-2.5 px-4 rounded-full bg-zinc-900 dark:bg-emerald-600 hover:opacity-90 text-white text-xs font-bold transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{successActionLabel}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-500">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-black text-zinc-900 dark:text-white tracking-tight">
                {errorTitle}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 py-2.5 px-4 rounded-full bg-zinc-900 dark:bg-white hover:opacity-90 text-white dark:text-zinc-900 text-xs font-bold transition cursor-pointer"
                >
                  Try again
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
