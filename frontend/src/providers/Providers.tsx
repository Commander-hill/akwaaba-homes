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
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 5000,
                style: {
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '12px 16px',
                },
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
          </LanguageProvider>
        </SocketProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
