'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mail, ArrowRight, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function PendingVerificationPage() {
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
          
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-7 sm:p-9 shadow-xs text-center space-y-6">
            
            {/* Status Icon */}
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center mx-auto shadow-2xs">
              <Mail className="w-6 h-6" />
            </div>

            {/* Heading & Details */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#0F5132] dark:text-emerald-400">
                Verification Required
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Check your inbox
              </h1>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                We sent a secure activation link to your registered email address. Click the link in the message to confirm your identity and unlock your account.
              </p>
            </div>

            {/* Checklist Guide */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/30 text-left space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-1.5 shrink-0" />
                <span>Links remain valid for 24 hours from dispatch.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-1.5 shrink-0" />
                <span>If not in your primary inbox, please check your Spam or Promotions folder.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400 mt-1.5 shrink-0" />
                <span>Required for Ghana Card identity compliance and tenancy agreements.</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <Link
                href="/login"
                className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              
              <Link
                href="/register"
                className="w-full h-11 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Need to change email? Re-register
              </Link>
            </div>

            {/* Reassurance Metadata */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Identity protected · Ghana Act 843 compliant</span>
            </div>

          </div>

        </div>
      </main>

      {/* ── Subdued Institutional Footer ── */}
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
