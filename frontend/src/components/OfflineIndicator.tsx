'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { getRegisteredQueryClient } from '@/lib/queryRegistry';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showRestored, setShowRestored] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);

      // Re-synchronize active queries across the app
      try {
        const client = getRegisteredQueryClient();
        if (client) {
          client.invalidateQueries({ refetchType: 'active' });
        }
      } catch (err) {
        console.warn('Query re-sync after online event:', err);
      }

      // Hide restored banner after 3.5 seconds
      const timeout = setTimeout(() => {
        setShowRestored(false);
      }, 3500);

      return () => clearTimeout(timeout);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showRestored) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      {!isOnline ? (
        <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-amber-500 text-slate-950 font-medium text-xs shadow-lg shadow-amber-500/20 border border-amber-400">
          <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
          <span>You are currently offline. Changes will sync when reconnected.</span>
        </div>
      ) : (
        <div className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white font-medium text-xs shadow-lg shadow-emerald-600/20 border border-emerald-500">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Connection restored. Synchronizing live data.</span>
        </div>
      )}
    </div>
  );
}
