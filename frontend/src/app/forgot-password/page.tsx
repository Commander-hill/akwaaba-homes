'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Mail, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  ArrowLeft,
  AlertCircle,
  Lock,
  RotateCcw
} from 'lucide-react';
import api from '@/lib/axios';
import ThemeToggle from '@/components/ThemeToggle';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSuccess(true);
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to process account recovery request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const maskEmail = (val: string) => {
    const parts = val.split('@');
    if (parts.length !== 2) return val;
    const name = parts[0];
    const domain = parts[1];
    const visibleChars = Math.min(2, name.length);
    const masked = name.slice(0, visibleChars) + '•••';
    return `${masked}@${domain}`;
  };

  return (
    <div className="-mt-18 md:-mt-20 min-h-screen flex flex-col justify-between bg-[#FBFBF9] dark:bg-[#0D0F12] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-emerald-100 selection:text-emerald-950">
      
      {/* ── Focused Application Header ── */}
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
            Sign in
          </Link>
        </div>
      </header>

      {/* ── Main Two-Part Editorial Body ── */}
      <main className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-16 py-10 sm:py-16">
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-20 items-center">
          
          {/* ──── Left Side: Brand Reassurance Area (42% Desktop, Hidden Mobile) ──── */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-5">
            <div className="relative w-full aspect-[4/5] max-h-[560px] rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs group bg-[#0B1510]">
              
              {/* Tasteful Ghanaian Student & Residential Photo */}
              <Image
                src="/images/auth-bg.png"
                alt="Modern Ghanaian residential community"
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover object-center transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                priority
              />

              {/* Gentle Vignette Gradient for Legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

              {/* Editorial Reassurance Caption */}
              <div className="absolute bottom-0 inset-x-0 p-7 text-white space-y-2.5">
                <div className="text-[10px] uppercase font-mono tracking-widest text-emerald-300 font-semibold">
                  Account Recovery // Protected Access
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white leading-snug">
                  Safe and verified home tenancies across Ghana
                </h3>
                <p className="text-xs text-zinc-200/80 leading-relaxed font-normal">
                  Your account holds your verified agreements, payment ledgers, and resident access passes. We safeguard every account through secure, time-limited verification.
                </p>
                <div className="pt-2 flex items-center gap-2 text-[11px] text-zinc-300/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Ayeduase Campus Hub • Accra &amp; Kumasi Portals</span>
                </div>
              </div>

            </div>
          </div>

          {/* ──── Right Side: Account Recovery Form (58% Desktop, 100% Mobile) ──── */}
          <div className="lg:col-span-7 xl:col-span-7 w-full max-w-[480px] mx-auto lg:mx-0">
            
            {success ? (
              /* Success / Dispatched State */
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center shadow-2xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#0F5132] dark:text-emerald-400">
                    Email Dispatched
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Check your email
                  </h1>
                  <p className="text-[15px] sm:text-[16px] text-zinc-600 dark:text-zinc-300 leading-relaxed pt-1">
                    If an account exists for <strong className="font-semibold text-zinc-900 dark:text-white">{maskEmail(email)}</strong>, we have sent a secure recovery link to reset your password.
                  </p>
                </div>

                {/* Understated Security Reassurance */}
                <div className="flex items-center gap-2 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <Lock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                  <span>Your recovery link is single-use and expires after 15 minutes.</span>
                </div>

                <div className="space-y-3 pt-3">
                  <Link
                    href="/login"
                    className="w-full h-[52px] inline-flex items-center justify-center gap-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-sm font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Return to Sign In</span>
                  </Link>

                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isLoading}
                    onClick={handleSubmit}
                    className="w-full h-11 inline-flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-xs font-semibold text-zinc-600 dark:text-zinc-400 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend recovery link'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Initial Recovery Request Form */
              <div className="space-y-6">
                
                {/* Clear Typographic Hierarchy */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#0F5132] dark:text-emerald-400">
                    Account Recovery
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Recover your account
                  </h1>
                  <p className="text-[15px] sm:text-[16px] text-zinc-500 dark:text-zinc-400 leading-relaxed pt-0.5">
                    Enter the email associated with your AkwaabaHomes account and we&apos;ll send you a secure recovery link.
                  </p>
                </div>

                {/* Inline Error Notice */}
                {error && (
                  <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-800/60 bg-rose-50/70 dark:bg-rose-950/20 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                    <div className="text-xs leading-relaxed">{error}</div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Email Input */}
                  <div className="space-y-2">
                    <label className="block text-xs sm:text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
                      Email address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full h-[52px] pl-10 pr-3.5 bg-white dark:bg-[#14181E] border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-[#0F5132] focus:ring-1 focus:ring-[#0F5132] outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Primary CTA Button */}
                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full h-[52px] flex items-center justify-center gap-2 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-sm font-semibold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Send recovery link</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Remember Password Link */}
                  <div className="text-center pt-2">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Remember your password?{' '}
                    </span>
                    <Link
                      href="/login"
                      className="text-xs font-semibold text-[#0F5132] dark:text-emerald-400 hover:underline"
                    >
                      Sign in
                    </Link>
                  </div>

                </form>

                {/* Understated Security Reassurance */}
                <div className="pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <Lock className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                  <span>Your recovery link is single-use and expires after 15 minutes.</span>
                </div>

              </div>
            )}

          </div>

        </div>
      </main>

      {/* ── Restrained Footer ── */}
      <footer className="w-full px-6 sm:px-10 lg:px-16 py-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 gap-2">
        <div>
          &copy; {new Date().getFullYear()} AkwaabaHomes Ghana PropTech. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Privacy
          </Link>
          <Link href="/help" className="hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
            Support
          </Link>
        </div>
      </footer>

    </div>
  );
}
