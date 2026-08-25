'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { ThemeProvider } from 'next-themes';
import { SocketProvider } from './SocketProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    window.alert = (msg) => {
      if (typeof msg === 'string') {
        const lower = msg.toLowerCase();
        if (lower.includes('success') || lower.includes('copied')) {
          toast.success(msg, { id: msg });
        } else if (lower.includes('error') || lower.includes('fail') || lower.includes('invalid') || lower.includes('must') || lower.includes('first')) {
          toast.error(msg, { id: msg });
        } else {
          toast(msg, { id: msg });
        }
      } else {
        toast(String(msg));
      }
    };
  }, []);

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data stays fresh for 5 minutes — no background refetches within that window
            staleTime: 5 * 60 * 1000,
            // Keep unused data in memory for 10 minutes before GC — instant cache hit on nav
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            // Only retry once on failure to avoid long stall on a bad request
            retry: 1,
            retryDelay: 1000,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          {children}
          <Toaster />
        </SocketProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
