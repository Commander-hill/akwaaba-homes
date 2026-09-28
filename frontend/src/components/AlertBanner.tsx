'use client';

import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import clsx from 'clsx';

export type AlertType = 'error' | 'success' | 'warning' | 'info';

export interface AlertBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: AlertType;
  message?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClose?: () => void;
  icon?: React.ReactNode;
}

export const AlertBanner = React.forwardRef<HTMLDivElement, AlertBannerProps>(
  ({ type = 'error', message, children, className, onClose, icon, ...props }, ref) => {
    const config = {
      error: {
        container: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300",
        icon: <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />,
        closeHover: "hover:bg-rose-200/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300",
      },
      success: {
        container: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300",
        icon: <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />,
        closeHover: "hover:bg-emerald-200/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300",
      },
      warning: {
        container: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300",
        icon: <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />,
        closeHover: "hover:bg-amber-200/50 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300",
      },
      info: {
        container: "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60 text-sky-800 dark:text-sky-300",
        icon: <Info className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400" />,
        closeHover: "hover:bg-sky-200/50 dark:hover:bg-sky-900/60 text-sky-800 dark:text-sky-300",
      },
    }[type];

    const content = message || children;
    if (!content) return null;

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        className={clsx(
          "p-3.5 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in transition-all",
          config.container,
          className
        )}
        {...props}
      >
        {icon || config.icon}
        <div className="flex-1 break-words">{content}</div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss message"
            className={clsx(
              "p-1 rounded-lg opacity-60 hover:opacity-100 transition-opacity ml-1 cursor-pointer shrink-0",
              config.closeHover
            )}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }
);

AlertBanner.displayName = 'AlertBanner';
export default AlertBanner;
