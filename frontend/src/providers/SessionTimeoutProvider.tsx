'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { usePublicResource, publicGet } from '@/lib/publicFetch';

const SessionTimeoutRuntime = dynamic(() => import('./SessionTimeoutRuntime'), { ssr: false });

const STORAGE_KEY = 'akwaaba_last_active';
const WARNING_SECONDS = 120;

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
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_SECONDS);

  const isAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname?.startsWith('/verify-email') ||
    pathname === '/onboarding' ||
    pathname === '/admin/login';

  const { data: userData } = usePublicResource(
    'auth/session',
    () => publicGet('/auth/session'),
    { enabled: !isAuthRoute, staleTime: 5 * 60 * 1000 }
  );

  const user = userData?.user;
  const isAuthenticated = Boolean(user);

  const resetTimer = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {}
    if (isWarningOpen) {
      setIsWarningOpen(false);
    }
  }, [isWarningOpen]);

  return (
    <SessionTimeoutContext.Provider value={{ lastActive: Date.now(), resetTimer, isWarningOpen }}>
      {children}
      {isAuthenticated && !isAuthRoute && (
        <SessionTimeoutRuntime
          role={user?.role}
          pathname={pathname}
          isWarningOpen={isWarningOpen}
          setIsWarningOpen={setIsWarningOpen}
          secondsRemaining={secondsRemaining}
          setSecondsRemaining={setSecondsRemaining}
          resetTimer={resetTimer}
        />
      )}
    </SessionTimeoutContext.Provider>
  );
}
