'use client';
import '@/app/secondary.css';

import React from 'react';
import { AlertTriangle, Clock, LogOut, CheckCircle2 } from 'lucide-react';

interface SessionTimeoutWarningModalProps {
  secondsRemaining: number;
  onStaySignedIn: () => void;
  onLogout: () => void;
}

export default function SessionTimeoutWarningModal({
  secondsRemaining,
  onStaySignedIn,
  onLogout,
}: SessionTimeoutWarningModalProps) {
  const m = Math.floor(secondsRemaining / 60);
  const s = secondsRemaining % 60;
  const formattedTime = `${m}:${s < 10 ? '0' : ''}${s}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="alertdialog"
        aria-labelledby="timeout-title"
        aria-describedby="timeout-desc"
        className="w-full sm:max-w-md bg-white dark:bg-[#121216] border border-amber-200 dark:border-amber-900/60 rounded-t-[28px] rounded-b-none sm:rounded-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-7 shadow-2xl space-y-6 text-center max-h-[88dvh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 id="timeout-title" className="text-xl font-bold text-slate-900 dark:text-white">
            Session Inactivity Warning
          </h2>
          <p id="timeout-desc" className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            You have been inactive for a while. To protect your personal records and residential data, your session will automatically lock and log out in:
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-100/70 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 font-mono text-2xl font-bold tracking-wider">
          <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
          <span>{formattedTime}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={onStaySignedIn}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            Stay Signed In
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-sm font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
