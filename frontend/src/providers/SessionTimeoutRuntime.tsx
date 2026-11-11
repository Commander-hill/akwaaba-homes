'use client';

import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { clearPublicResources, publicPost } from '@/lib/publicFetch';
import { getRegisteredQueryClient } from '@/lib/queryRegistry';

const SessionTimeoutWarningModal = dynamic(() => import('./SessionTimeoutWarningModal'), { ssr: false });

const STORAGE_KEY = 'akwaaba_last_active';
const WARNING_SECONDS = 120;

export default function SessionTimeoutRuntime({
  role,
  pathname,
  isWarningOpen,
  setIsWarningOpen,
  secondsRemaining,
  setSecondsRemaining,
  resetTimer,
}: {
  role?: string;
  pathname: string | null;
  isWarningOpen: boolean;
  setIsWarningOpen: (open: boolean) => void;
  secondsRemaining: number;
  setSecondsRemaining: (secs: number) => void;
  resetTimer: () => void;
}) {
  const queryClient = getRegisteredQueryClient();
  const isLoggingOutRef = useRef(false);
  const authTimestampRef = useRef<number>(Date.now());

  const timeoutDurationMs = React.useMemo(() => {
    switch (role) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return 15 * 60 * 1000;
      case 'LANDLORD':
      case 'CARETAKER':
      case 'STAFF':
        return 20 * 60 * 1000;
      default:
        return 30 * 60 * 1000;
    }
  }, [role]);

  const handleTimeoutLogout = React.useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    setIsWarningOpen(false);

    try {
      await publicPost('/auth/logout');
    } catch {
      // proceed even if server call fails
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('akwaaba_access_token');
        localStorage.removeItem('akwaaba_refresh_token');
        localStorage.removeItem(STORAGE_KEY);
      }
      clearPublicResources();
      queryClient?.clear();

      const isAdminRoute = pathname?.startsWith('/admin');
      window.location.href = isAdminRoute ? '/admin/login?reason=timeout' : '/login?reason=timeout';
    }
  }, [pathname, queryClient, setIsWarningOpen]);

  useEffect(() => {
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
  }, [resetTimer]);

  useEffect(() => {
    authTimestampRef.current = Date.now();
    isLoggingOutRef.current = false;
    setIsWarningOpen(false);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      }
    } catch {}
  }, [setIsWarningOpen]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && isWarningOpen) {
        setIsWarningOpen(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isWarningOpen, setIsWarningOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      const val = raw ? parseInt(raw, 10) : NaN;
      if (isNaN(val) || val <= 0 || val > Date.now()) {
        localStorage.setItem(STORAGE_KEY, String(Date.now()));
      }
    }

    const interval = setInterval(() => {
      if (typeof window === 'undefined') return;
      if (Date.now() - authTimestampRef.current < 60000) return;

      const rawLastActive = localStorage.getItem(STORAGE_KEY);
      let lastActiveTime = rawLastActive ? parseInt(rawLastActive, 10) : Date.now();
      if (isNaN(lastActiveTime) || lastActiveTime <= 0 || lastActiveTime > Date.now()) {
        lastActiveTime = Date.now();
        localStorage.setItem(STORAGE_KEY, String(lastActiveTime));
      }

      const elapsedMs = Date.now() - lastActiveTime;
      const remainingMs = timeoutDurationMs - elapsedMs;

      if (remainingMs <= 0) {
        clearInterval(interval);
        handleTimeoutLogout();
        return;
      }

      if (remainingMs <= WARNING_SECONDS * 1000) {
        setSecondsRemaining(Math.max(1, Math.ceil(remainingMs / 1000)));
        if (!isWarningOpen) setIsWarningOpen(true);
      } else if (isWarningOpen) {
        setIsWarningOpen(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeoutDurationMs, isWarningOpen, setIsWarningOpen, setSecondsRemaining, handleTimeoutLogout]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - authTimestampRef.current < 60000) return;
        const rawLastActive = localStorage.getItem(STORAGE_KEY);
        let lastActiveTime = rawLastActive ? parseInt(rawLastActive, 10) : Date.now();
        if (isNaN(lastActiveTime) || lastActiveTime <= 0 || lastActiveTime > Date.now()) {
          lastActiveTime = Date.now();
          localStorage.setItem(STORAGE_KEY, String(lastActiveTime));
        }
        if (Date.now() - lastActiveTime >= timeoutDurationMs) {
          handleTimeoutLogout();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [timeoutDurationMs, handleTimeoutLogout]);

  if (!isWarningOpen) return null;

  return (
    <SessionTimeoutWarningModal
      secondsRemaining={secondsRemaining}
      onStaySignedIn={resetTimer}
      onLogout={handleTimeoutLogout}
    />
  );
}
