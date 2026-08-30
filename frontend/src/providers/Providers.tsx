'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { ThemeProvider } from 'next-themes';
import { SocketProvider } from './SocketProvider';
import { LanguageProvider } from './LanguageContext';
import { DialogProvider } from './DialogProvider';

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
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4500,
                  className: '!bg-white/95 dark:!bg-[#111116]/95 !text-slate-900 dark:!text-white !border !border-slate-200/80 dark:!border-white/10 !backdrop-blur-xl !shadow-[0_20px_50px_rgba(0,0,0,0.3)] !rounded-2xl !px-5 !py-3.5 !text-xs sm:!text-sm !font-bold',
                  success: {
                    iconTheme: {
                      primary: '#10B981',
                      secondary: '#FFFFFF',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#EF4444',
                      secondary: '#FFFFFF',
                    },
                  },
                }}
              />
            </DialogProvider>
          </LanguageProvider>
        </SocketProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
