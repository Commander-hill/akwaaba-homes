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
  Lock,
  RotateCcw,
  ShieldCheck,
  Building2
} from 'lucide-react';
import api from '@/lib/axios';
import ThemeToggle from '@/components/ThemeToggle';
import AlertBanner from '@/components/AlertBanner';
import { Button } from '@/components/ui/Button';

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
    <div className="-mt-16 -mb-16 md:mb-0 min-h-screen w-full flex bg-white dark:bg-[#0E1210] text-zinc-950 dark:text-zinc-100 antialiased overflow-hidden">
      
      {/* ──── LEFT COLUMN: BRAND VISUAL HERO (60% Desktop, Full Bleed) ──── */}
      <div className="relative hidden lg:block flex-1 min-h-screen lg:h-screen overflow-hidden">
        <Image
          src="/images/auth-recovery.jpg"
          alt="Authentic Ghanaian resident verifying account recovery"
          fill
          sizes="70vw"
          className="object-cover object-center transform hover:scale-[1.01] transition-transform duration-1000 ease-out"
          priority
        />

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20" />

        {/* Top-Left Floating Action */}
        <div className="absolute top-8 left-8 z-10">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold transition shadow-xs cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to sign in</span>
          </Link>
        </div>

        {/* Bottom Overlay Content */}
        <div className="absolute bottom-0 inset-x-0 p-10 xl:p-14 text-white space-y-3 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/20 backdrop-blur-xs border border-emerald-400/30 text-emerald-300 text-[10px] font-mono uppercase tracking-wider font-bold">
            <span>ACCOUNT RECOVERY • PROTECTED ACCESS</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight">
            Safe and verified home tenancies across Ghana
          </h2>

          <p className="text-xs sm:text-sm text-zinc-200/90 leading-relaxed max-w-lg font-normal">
            Your account holds your verified agreements, payment ledgers, and resident access passes. We safeguard every account through secure, time-limited verification.
          </p>

          {/* Trust Markers */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-zinc-300 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Verified Accounts
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-400" /> Time-Limited Recovery
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Verified Resident Passes
            </span>
          </div>
        </div>
      </div>

      {/* ──── RIGHT COLUMN: RECOVERY FORM (30% Desktop, 100% Mobile) ──── */}
      <div className="w-full lg:w-[30%] min-h-screen lg:h-screen lg:overflow-y-auto flex flex-col justify-between p-6 sm:p-8 lg:p-8 xl:p-10 bg-white dark:bg-[#0E1210] lg:border-l border-zinc-200/80 dark:border-zinc-800/80 relative z-10 shrink-0">
        
        {/* Top Header: Brand + Theme Toggle + Sign In */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="Akwaaba Homes"
                width={44}
                height={44}
                className="w-full h-full object-contain hidden dark:block transition-transform duration-300 group-hover:scale-105"
                priority
              />
              <Image
                src="/logo-light.png"
                alt="Akwaaba Homes"
                width={44}
                height={44}
                className="w-full h-full object-contain block dark:hidden transition-transform duration-300 group-hover:scale-105"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-zinc-950 dark:text-white leading-none">
                Akwaaba<span className="text-[#0F5132] dark:text-emerald-400">Homes</span>
              </span>
              <span className="text-[10px] font-mono tracking-wider uppercase text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">
                Ghana PropTech
              </span>
            </div>
          </Link>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-xs font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="my-auto py-8 sm:py-10 max-w-sm w-full mx-auto space-y-6">
          {success ? (
            /* Success / Dispatched State */
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 text-[#0F5132] dark:text-emerald-400 text-[10px] font-mono uppercase font-bold tracking-wider">
                  <span>EMAIL DISPATCHED</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                  Check your email
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pt-0.5">
                  If an account exists for <strong className="font-bold text-zinc-950 dark:text-white">{maskEmail(email)}</strong>, we have sent a secure recovery link to reset your password.
                </p>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400">
                <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>Your recovery link is single-use and expires after 15 minutes.</span>
              </div>

              <div className="space-y-2.5 pt-2">
                <Link
                  href="/login"
                  className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer active:scale-[0.99]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </Link>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || isLoading}
                  onClick={handleSubmit}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend recovery link'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Initial Recovery Request Form */
            <div className="space-y-6">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 text-[#0F5132] dark:text-emerald-400 text-[10px] font-mono uppercase font-bold tracking-wider">
                  <span>ACCOUNT RECOVERY</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                  Recover your account
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Enter the email associated with your AkwaabaHomes account and we&apos;ll send you a secure recovery link.
                </p>
              </div>

              {/* Inline Error Notice */}
              {error && (
                <AlertBanner
                  type="error"
                  message={error}
                />
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="recovery-email" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="recovery-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full h-11 pl-10 pr-3.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-900 focus:border-[#0F5132] focus:ring-4 focus:ring-[#0F5132]/10 outline-none transition"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="emerald"
                    size="sm"
                    isLoading={isLoading}
                    disabled={isLoading || !email.trim().includes('@') || !email.trim().includes('.')}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="w-full"
                  >
                    Send recovery link
                  </Button>
                </div>

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Remember your password?{' '}
                  <Link
                    href="/login"
                    className="font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline"
                  >
                    Sign in
                  </Link>
                </div>

                <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 pt-1">
                  <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span>Your recovery link is single-use and expires after 15 minutes.</span>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Footer */}
        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 gap-2">
          <span>&copy; {new Date().getFullYear()} Akwaaba Homes Ghana</span>
          <div className="flex items-center gap-3">
            <Link href="/terms" className="hover:text-zinc-950 dark:hover:text-white transition">Terms</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-zinc-950 dark:hover:text-white transition">Privacy</Link>
            <span>•</span>
            <Link href="/support" className="hover:text-zinc-950 dark:hover:text-white transition">Support</Link>
          </div>
        </div>
      </div>

    </div>
  );
}
