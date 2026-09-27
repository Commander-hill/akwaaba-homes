'use client';

import React from 'react';
import { toast as hotToast, Toast, resolveValue, ToastOptions } from 'react-hot-toast';
import { CheckCircle2, AlertCircle, Loader2, Info, X } from 'lucide-react';
import clsx from 'clsx';

interface EmeraldToastItemProps {
  toast: Toast;
}

export function EmeraldToastItem({ toast }: EmeraldToastItemProps) {
  const message = resolveValue(toast.message, toast);
  const type = toast.type;

  // Semantically styled pill banner matching the platform's alert aesthetic
  const config = (() => {
    switch (type) {
      case 'error':
        return {
          wrapper: "bg-rose-50/95 dark:bg-rose-950/85 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 shadow-xs",
          icon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />,
          closeHover: "hover:bg-rose-200/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300",
        };
      case 'success':
        return {
          wrapper: "bg-emerald-50/95 dark:bg-emerald-950/85 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 shadow-xs",
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
          closeHover: "hover:bg-emerald-200/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300",
        };
      case 'loading':
        return {
          wrapper: "bg-zinc-50/95 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-xs",
          icon: <Loader2 className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0 animate-spin" />,
          closeHover: "hover:bg-zinc-200/50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200",
        };
      default:
        return {
          wrapper: "bg-sky-50/95 dark:bg-sky-950/85 border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-300 shadow-xs",
          icon: <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />,
          closeHover: "hover:bg-sky-200/50 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300",
        };
    }
  })();

  return (
    <div
      onClick={() => hotToast.dismiss(toast.id)}
      className={clsx(
        "flex items-center gap-2.5 min-w-[280px] max-w-[92vw] sm:max-w-lg px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-full sm:rounded-2xl border transition-all duration-200 ease-out pointer-events-auto cursor-pointer select-none",
        "hover:opacity-25 transition-opacity duration-150", // Peek-through: softens on hover so any text underneath is visible
        config.wrapper,
        toast.visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 -translate-y-3 scale-95 pointer-events-none"
      )}
      style={{
        ...toast.style,
      }}
      role="alert"
      aria-live="polite"
      title="Click anywhere to dismiss (hover to see behind)"
    >
      {/* Status Icon */}
      {config.icon}

      {/* Message Text */}
      <span className="flex-1 text-xs sm:text-[13px] font-bold tracking-tight leading-snug break-words">
        {message}
      </span>

      {/* Dismiss Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          hotToast.dismiss(toast.id);
        }}
        className={clsx(
          "p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity ml-1 cursor-pointer shrink-0",
          config.closeHover
        )}
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Minimalist drop-in Toast API
export const emeraldToast = {
  success: (message: React.ReactNode, options?: ToastOptions) => hotToast.success(message as any, options),
  error: (message: React.ReactNode, options?: ToastOptions) => hotToast.error(message as any, options),
  loading: (message: React.ReactNode, options?: ToastOptions) => hotToast.loading(message as any, options),
  custom: hotToast.custom,
  dismiss: hotToast.dismiss,
};

export default emeraldToast;
