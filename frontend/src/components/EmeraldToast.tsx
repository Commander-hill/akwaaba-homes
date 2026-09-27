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
          wrapper: "bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300",
          icon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />,
          closeHover: "hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300",
        };
      case 'success':
        return {
          wrapper: "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300",
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
          closeHover: "hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300",
        };
      case 'loading':
        return {
          wrapper: "bg-zinc-50 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200",
          icon: <Loader2 className="w-4 h-4 text-zinc-600 dark:text-zinc-400 shrink-0 animate-spin" />,
          closeHover: "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200",
        };
      default:
        return {
          wrapper: "bg-sky-50 dark:bg-sky-950/70 border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-300",
          icon: <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />,
          closeHover: "hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-800 dark:text-sky-300",
        };
    }
  })();

  return (
    <div
      className={clsx(
        "flex items-center gap-2.5 min-w-[300px] max-w-[92vw] sm:max-w-xl px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl sm:rounded-2xl border transition-all duration-200 ease-out pointer-events-auto backdrop-blur-xs shadow-xs",
        config.wrapper,
        toast.visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 -translate-y-4 scale-95 pointer-events-none"
      )}
      style={{
        ...toast.style,
      }}
      role="alert"
      aria-live="polite"
    >
      {/* Status Icon */}
      {config.icon}

      {/* Message Text */}
      <span className="flex-1 text-xs sm:text-[13.5px] font-bold tracking-tight leading-snug break-words">
        {message}
      </span>

      {/* Dismiss Button */}
      <button
        onClick={() => hotToast.dismiss(toast.id)}
        className={clsx(
          "p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity ml-1.5 cursor-pointer shrink-0",
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
