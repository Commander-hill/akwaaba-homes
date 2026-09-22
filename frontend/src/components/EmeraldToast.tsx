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

  // Linear / Stripe minimalist icon mapping
  const icon = (() => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'loading':
        return <Loader2 className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0 animate-spin" />;
      default:
        return <Info className="w-4 h-4 text-zinc-600 dark:text-zinc-300 shrink-0" />;
    }
  })();

  return (
    <div
      className={clsx(
        "flex items-center gap-2.5 min-w-[280px] max-w-[420px] px-3.5 py-2.5 rounded-xl border transition-all duration-200 ease-out pointer-events-auto",
        "bg-white/95 dark:bg-[#12141A]/95 text-zinc-900 dark:text-zinc-100",
        "border-zinc-200/90 dark:border-zinc-800/90",
        "backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]",
        toast.visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 -translate-y-2 scale-95 pointer-events-none"
      )}
      style={{
        ...toast.style,
      }}
      role="alert"
      aria-live="polite"
    >
      {/* Status Icon */}
      {icon}

      {/* Message Text */}
      <span className="flex-1 text-[13px] font-medium leading-snug break-words">
        {message}
      </span>

      {/* Dismiss Button */}
      <button
        onClick={() => hotToast.dismiss(toast.id)}
        className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-0.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors ml-1 cursor-pointer shrink-0"
        aria-label="Dismiss"
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
