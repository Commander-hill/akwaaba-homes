'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/axios';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, Mail } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address with AkwaabaHomes identity services...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('The verification link is missing an authorization token. Please check the full link in your email.');
      return;
    }

    const verifyToken = async () => {
      try {
        await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage('Your email address has been verified. Your AkwaabaHomes account is now fully active.');
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Verification could not be completed. The link may have expired or was already used.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="-mt-18 md:-mt-20 min-h-screen flex flex-col justify-between bg-[#FBFBF9] dark:bg-[#0D0F12] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-emerald-100 selection:text-emerald-950">
      
      {/* ── Purpose-Built Auth Header ── */}
      <header className="w-full px-6 sm:px-10 lg:px-16 py-5 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#0F5132] flex items-center justify-center shadow-xs">
            <Image
              src="/logo.png"
              alt="AkwaabaHomes"
              width={32}
              height={32}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
            Akwaaba<span className="text-[#0F5132] dark:text-emerald-400">Homes</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          <ThemeToggle />
          <Link 
            href="/login" 
            className="text-xs font-semibold text-[#0F5132] dark:text-emerald-400 hover:text-[#0A3D24] dark:hover:text-emerald-300 transition-colors"
          >
            Sign in &rarr;
          </Link>
        </div>
      </header>

      {/* ── Center Editorial Card ── */}
      <main className="flex-1 flex items-center justify-center px-6 sm:px-10 py-12 sm:py-20">
        <div className="w-full max-w-md mx-auto">
          
          {/* Status Container */}
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-7 sm:p-9 shadow-xs text-center space-y-6">
            
            {status === 'loading' && (
              <div className="space-y-4 py-4 animate-in fade-in">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center mx-auto shadow-2xs">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0F5132] dark:text-emerald-400" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Verifying Credentials
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
                    {message}
                  </p>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-5 animate-in fade-in">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#0F5132] dark:text-emerald-400">
                    Verification Confirmed
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Account activated
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                    {message} You can now browse verified student and residential rooms, book viewings, and manage rent payments.
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/login"
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Proceed to Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-5 animate-in fade-in">
                <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-900/60 flex items-center justify-center mx-auto shadow-2xs">
                  <AlertCircle className="w-6 h-6" />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                    Link Expired or Invalid
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Verification unconfirmed
                  </h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                    {message}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  <Link
                    href="/login"
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Try Signing In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/register"
                    className="w-full h-11 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
                  >
                    Create a new account
                  </Link>
                </div>
              </div>
            )}

            {/* Reassurance Metadata */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Identity protected · Ghana Act 843 compliant</span>
            </div>

          </div>

        </div>
      </main>

      {/* ── Subdued Footer ── */}
      <footer className="w-full px-6 sm:px-10 lg:px-16 py-6 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400 dark:text-zinc-500">
        <div>
          &copy; {new Date().getFullYear()} AkwaabaHomes Ghana. All rights reserved.
        </div>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            Terms of Service
          </Link>
          <Link href="/help" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            Help Center
          </Link>
        </div>
      </footer>

    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="-mt-18 md:-mt-20 min-h-screen flex flex-col items-center justify-center bg-[#FBFBF9] dark:bg-[#0D0F12] text-zinc-900 dark:text-zinc-100 p-6 space-y-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#0F5132]" />
        <span className="text-xs font-medium text-zinc-500">Connecting to verification service...</span>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
