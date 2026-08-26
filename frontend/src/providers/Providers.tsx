'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { ThemeProvider } from 'next-themes';
import { SocketProvider } from './SocketProvider';
import { LanguageProvider } from './LanguageContext';

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
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
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
          <LanguageProvider>
            {children}
            <Toaster />
          </LanguageProvider>
        </SocketProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
