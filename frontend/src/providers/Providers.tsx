'use client';

import { ThemeProvider } from 'next-themes';
import { SocketProvider } from './SocketProvider';
import { LanguageProvider } from './LanguageContext';
import { DialogProvider } from './DialogProvider';
import { SessionTimeoutProvider } from './SessionTimeoutProvider';

// Suppress React 19 false-positive warning for next-themes' inline script
if (typeof console !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Encountered a script tag while rendering React component')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <SocketProvider>
        <LanguageProvider>
          <DialogProvider>
            <SessionTimeoutProvider>
              {children}
            </SessionTimeoutProvider>
          </DialogProvider>
        </LanguageProvider>
      </SocketProvider>
    </ThemeProvider>
  );
}
