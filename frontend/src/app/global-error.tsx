'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to monitoring service (e.g., Sentry) in production
    console.error('[Global Error Boundary]', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-lg text-center space-y-6 animate-in fade-in">
          {/* Icon */}
          <div className="w-24 h-24 rounded-3xl bg-red-900/30 border border-red-700/50 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>

          {/* Error Code */}
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-red-500">
              Critical Error
            </p>
            <h1 className="text-4xl font-black text-white">Something went wrong</h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
              An unexpected error occurred. Our team has been notified. Please try again or return to the homepage.
            </p>
          </div>

          {/* Error digest for debugging */}
          {error.digest && (
            <div className="inline-block px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-400">
              Error ID: {error.digest}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={reset}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <Link
              href="/"
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
