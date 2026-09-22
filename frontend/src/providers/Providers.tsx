'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { EmeraldToastItem } from '@/components/EmeraldToast';
import { ThemeProvider } from 'next-themes';
import { SocketProvider } from './SocketProvider';
import { LanguageProvider } from './LanguageContext';
import { DialogProvider } from './DialogProvider';
import { SessionTimeoutProvider } from './SessionTimeoutProvider';

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
            staleTime: 30 * 1000, // Serve immediately from memory cache (instantaneous 0ms clicks & tab switches)
            gcTime: 15 * 60 * 1000,
            refetchOnWindowFocus: false, // Prevent UI stutter/lag when switching tabs or focusing elements
            refetchOnReconnect: true,  // Automatically revalidate when network reconnects
            retry: 1,
            retryDelay: 800,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <LanguageProvider>
            <DialogProvider>
              <SessionTimeoutProvider>
                {children}
              </SessionTimeoutProvider>
              <Toaster
                position="top-right"
                gutter={8}
                containerStyle={{
                  top: 20,
                  right: 20,
                  zIndex: 99999,
                }}
                toastOptions={{
                  duration: 4000,
                }}
              >
                {(t) => <EmeraldToastItem toast={t} />}
              </Toaster>
            </DialogProvider>
          </LanguageProvider>
        </SocketProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
