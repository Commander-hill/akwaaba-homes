'use client';

import React from 'react';
import { toast as hotToast, Toast, resolveValue, ToastOptions } from 'react-hot-toast';
import { 
  CheckCircle2, AlertTriangle, XCircle, Info, 
  Loader2, X, ShieldAlert, Sparkles 
} from 'lucide-react';
import clsx from 'clsx';

interface EmeraldToastItemProps {
  toast: Toast;
}

export function EmeraldToastItem({ toast }: EmeraldToastItemProps) {
  const message = resolveValue(toast.message, toast);
  const type = toast.type;

  // Configuration based on toast type with Akwaaba Homes Emerald African Proptech theme
  const config = {
    success: {
      badge: 'SUCCESS',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      borderColor: 'border-emerald-500/50 shadow-[0_15px_45px_rgba(5,150,105,0.35)]',
      bgGradient: 'bg-gradient-to-r from-[#062817] via-[#093520] to-[#062817]',
      accentBar: 'bg-gradient-to-r from-emerald-400 to-[#10B981]',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />
    },
    error: {
      badge: 'ACTION ALERT',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      borderColor: 'border-rose-500/50 shadow-[0_15px_45px_rgba(225,29,72,0.35)]',
      bgGradient: 'bg-gradient-to-r from-[#180A0E] via-[#240F15] to-[#180A0E]',
      accentBar: 'bg-gradient-to-r from-rose-500 to-amber-500',
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />
    },
    loading: {
      badge: 'PROCESSING',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      borderColor: 'border-emerald-500/50 shadow-[0_15px_45px_rgba(5,150,105,0.25)]',
      bgGradient: 'bg-gradient-to-r from-[#062817] via-[#093520] to-[#062817]',
      accentBar: 'bg-gradient-to-r from-emerald-400 to-amber-400 animate-pulse',
      icon: <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
    },
    blank: {
      badge: 'NOTIFICATION',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      borderColor: 'border-emerald-500/40 shadow-[0_15px_45px_rgba(5,150,105,0.25)]',
      bgGradient: 'bg-gradient-to-r from-[#072013] via-[#0A2B1A] to-[#072013]',
      accentBar: 'bg-gradient-to-r from-emerald-500 to-[#0F5132]',
      icon: <Sparkles className="w-5 h-5 text-emerald-400" />
    },
    custom: {
      badge: 'AKWAABA',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      borderColor: 'border-emerald-500/40 shadow-[0_15px_45px_rgba(5,150,105,0.25)]',
      bgGradient: 'bg-gradient-to-r from-[#072013] via-[#0A2B1A] to-[#072013]',
      accentBar: 'bg-gradient-to-r from-emerald-500 to-[#0F5132]',
      icon: <Info className="w-5 h-5 text-emerald-400" />
    }
  }[type] || {
    badge: 'NOTICE',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    borderColor: 'border-emerald-500/40 shadow-[0_15px_45px_rgba(5,150,105,0.25)]',
    bgGradient: 'bg-gradient-to-r from-[#072013] via-[#0A2B1A] to-[#072013]',
    accentBar: 'bg-gradient-to-r from-emerald-500 to-[#0F5132]',
    icon: <Info className="w-5 h-5 text-emerald-400" />
  };

  return (
    <div
      className={clsx(
        "relative flex flex-col min-w-[320px] max-w-[440px] rounded-2xl border backdrop-blur-2xl overflow-hidden transition-all duration-300 pointer-events-auto",
        config.bgGradient,
        config.borderColor,
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
      {/* Top Accent Gradient Line */}
      <div className={clsx("h-1 w-full", config.accentBar)} />

      {/* Main Toast Card Body */}
      <div className="flex items-start gap-3.5 p-4 sm:p-4.5">
        {/* Themed Icon Ring Badge */}
        <div
          className={clsx(
            "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-inner mt-0.5",
            config.iconBg
          )}
        >
          {config.icon}
        </div>

        {/* Text Details & Category Badge */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={clsx(
                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                config.badgeColor
              )}
            >
              {config.badge}
            </span>
            <span className="text-[10px] font-medium text-emerald-300/70 tracking-wide uppercase">
              Akwaaba Homes
            </span>
          </div>

          <div className="text-xs sm:text-sm font-semibold text-white leading-snug break-words">
            {message}
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={() => hotToast.dismiss(toast.id)}
          className="text-white/50 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
          aria-label="Dismiss toast"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Convenient drop-in Emerald Toast API
export const emeraldToast = {
  success: (message: React.ReactNode, options?: ToastOptions) => hotToast.success(message as any, options),
  error: (message: React.ReactNode, options?: ToastOptions) => hotToast.error(message as any, options),
  loading: (message: React.ReactNode, options?: ToastOptions) => hotToast.loading(message as any, options),
  custom: hotToast.custom,
  dismiss: hotToast.dismiss,
};

export default emeraldToast;
