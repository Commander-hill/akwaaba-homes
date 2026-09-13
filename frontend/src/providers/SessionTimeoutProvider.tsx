'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { ShieldAlert, Clock, LogOut, CheckCircle2 } from 'lucide-react';
import api from '@/lib/axios';

const STORAGE_KEY = 'akwaaba_last_active';
const WARNING_SECONDS = 120; // Show warning modal 2 minutes before cutoff

interface SessionTimeoutContextType {
  lastActive: number;
  resetTimer: () => void;
  isWarningOpen: boolean;
}

const SessionTimeoutContext = createContext<SessionTimeoutContextType>({
  lastActive: Date.now(),
  resetTimer: () => {},
  isWarningOpen: false,
});

export const useSessionTimeout = () => useContext(SessionTimeoutContext);

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_SECONDS);
  const isLoggingOutRef = useRef(false);

  // Retrieve current user to determine role-tailored timeout window
  const { data: userData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const user = userData?.user;
  const isAuthenticated = Boolean(user);

  // Role-based timeout thresholds (in milliseconds)
  // Admin: 15 mins (strictest security)
  // Landlord / Caretaker: 20 mins
  // Tenant / Default: 30 mins
  const timeoutDurationMs = React.useMemo(() => {
    if (!user) return 30 * 60 * 1000;
    if (user.role === 'ADMIN') return 15 * 60 * 1000;
    if (user.role === 'LANDLORD' || user.role === 'CARETAKER' || user.role === 'STAFF') return 20 * 60 * 1000;
    return 30 * 60 * 1000;
  }, [user]);

  // Record user activity
  const resetTimer = useCallback(() => {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      // ignore storage quota errors
    }
    if (isWarningOpen) {
      setIsWarningOpen(false);
    }
  }, [isWarningOpen]);

  // Execute full secure logout
  const handleTimeoutLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setIsWarningOpen(false);

    try {
      await api.post('/auth/logout');
    } catch {
      // proceed even if server call fails
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('akwaaba_access_token');
        localStorage.removeItem('akwaaba_refresh_token');
        localStorage.removeItem(STORAGE_KEY);
      }
      queryClient.clear();

      const isAdminRoute = pathname?.startsWith('/admin');
      const targetUrl = isAdminRoute ? '/admin/login?reason=timeout' : '/login?reason=timeout';
      window.location.href = targetUrl;
    }
  }, [pathname, queryClient]);

  // Throttled activity event listener (records interaction at most once every 10 seconds)
  useEffect(() => {
    if (!isAuthenticated) return;

    let lastRecorded = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastRecorded > 10000) {
        lastRecorded = now;
        resetTimer();
      }
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
    };
  }, [isAuthenticated, resetTimer]);

  // Listen to cross-tab activity updates
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && isWarningOpen) {
        // Another tab recorded activity; dismiss warning modal in this tab
        setIsWarningOpen(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isAuthenticated, isWarningOpen]);

  // Inactivity & countdown monitor interval
  useEffect(() => {
    if (!isAuthenticated) {
      setIsWarningOpen(false);
      return;
    }

    // Initialize activity timestamp if not present
    if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }

    const interval = setInterval(() => {
      if (typeof window === 'undefined') return;

      const rawLastActive = localStorage.getItem(STORAGE_KEY);
      const lastActiveTime = rawLastActive ? parseInt(rawLastActive, 10) : Date.now();
      const elapsedMs = Date.now() - lastActiveTime;
      const remainingMs = timeoutDurationMs - elapsedMs;

      // Case 1: Timeout expired (e.g. laptop lid reopened after hours or user left desk)
      if (remainingMs <= 0) {
        clearInterval(interval);
        handleTimeoutLogout();
        return;
      }

      // Case 2: In warning window (within last 120 seconds)
      const warningThresholdMs = WARNING_SECONDS * 1000;
      if (remainingMs <= warningThresholdMs) {
        const secsLeft = Math.max(1, Math.ceil(remainingMs / 1000));
        setSecondsRemaining(secsLeft);
        if (!isWarningOpen) {
          setIsWarningOpen(true);
        }
      } else if (isWarningOpen) {
        setIsWarningOpen(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, timeoutDurationMs, isWarningOpen, handleTimeoutLogout]);

  // Handle visibility change (e.g. user switches back to this tab after being away)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const rawLastActive = localStorage.getItem(STORAGE_KEY);
        const lastActiveTime = rawLastActive ? parseInt(rawLastActive, 10) : Date.now();
        const elapsedMs = Date.now() - lastActiveTime;
        if (elapsedMs >= timeoutDurationMs) {
          handleTimeoutLogout();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isAuthenticated, timeoutDurationMs, handleTimeoutLogout]);

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <SessionTimeoutContext.Provider value={{ lastActive: Date.now(), resetTimer, isWarningOpen }}>
      {children}

      {/* ── Inactivity Warning Modal ── */}
      {isWarningOpen && isAuthenticated && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            role="alertdialog"
            aria-labelledby="timeout-title"
            aria-describedby="timeout-desc"
            className="w-full max-w-md bg-white dark:bg-[#121216] border border-amber-200 dark:border-amber-900/60 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 text-center"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <ShieldAlert className="w-7 h-7" />
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
              <span>{formatTime(secondsRemaining)}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={resetTimer}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" />
                Stay Signed In
              </button>
              <button
                type="button"
                onClick={handleTimeoutLogout}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 text-sm font-semibold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </SessionTimeoutContext.Provider>
  );
}
