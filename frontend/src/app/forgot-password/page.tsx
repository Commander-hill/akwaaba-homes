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
  ChevronDown,
  Moon,
  Sun,
  ShieldCheck,
  Zap,
  Clock,
  Home,
} from 'lucide-react';
import api from '@/lib/axios';

const NAV_LINKS = [
  { name: 'Home', href: '/' },
  { name: 'Explore', href: '/properties', hasDropdown: true },
  { name: 'Neighborhoods', href: '/search', hasDropdown: true },
  { name: 'Services', href: '/about', hasDropdown: true },
  { name: 'About', href: '/about', hasDropdown: true },
  { name: 'Support', href: '/support', hasDropdown: true },
];

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const toggleTheme = (dark: boolean) => {
    setIsDarkMode(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

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
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#FAF9F5] dark:bg-[#0D100E] text-zinc-900 dark:text-zinc-100 font-sans relative overflow-x-hidden">

      {/* ── 1. TOP NAVBAR ── */}
      <header className="w-full bg-white dark:bg-[#141A17] border-b border-zinc-200/70 dark:border-zinc-800 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* Left: Brand Identity */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <Image
                src="/logo-light.png"
                alt="AkwaabaHomes"
                width={36}
                height={36}
                className="w-full h-full object-contain dark:hidden transition-transform duration-300 group-hover:scale-105"
                priority
              />
              <Image
                src="/logo.png"
                alt="AkwaabaHomes"
                width={36}
                height={36}
                className="w-full h-full object-contain hidden dark:block transition-transform duration-300 group-hover:scale-105"
                priority
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-sm tracking-tight text-[#0D3827] dark:text-white">
                AkwaabaHomes
              </span>
              <span className="text-[10px] text-[#557A67] dark:text-emerald-500 font-medium mt-0.5">
                Trusted Ghanaian Housing
              </span>
            </div>
          </Link>

          {/* Center: Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="inline-flex items-center gap-0.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-[#16A34A] dark:hover:text-emerald-400 transition"
              >
                <span>{link.name}</span>
                {link.hasDropdown && <ChevronDown className="w-3 h-3 opacity-60" />}
              </Link>
            ))}
          </nav>

          {/* Right: Theme Toggle + Back to Sign In */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Icon */}
            <button
              type="button"
              onClick={() => toggleTheme(!isDarkMode)}
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Divider */}
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />

            {/* Back to Sign In */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16A34A] hover:text-[#15803D] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. MAIN CONTENT ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 z-10 flex flex-col justify-center">

        {/* ── Centered Header ── */}
        <div className="text-center space-y-3 mb-8 sm:mb-10">
          {/* Breadcrumb Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF7EE] dark:bg-emerald-950/40 border border-[#CDEED5] dark:border-emerald-800/40 text-[#16A34A] dark:text-emerald-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
            <Home className="w-3.5 h-3.5" />
            <span>ACCOUNT / PASSWORD RECOVERY</span>
          </div>

          {/* Headline with curved swoop underline under 'you' */}
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0D3827] dark:text-white tracking-tight leading-tight">
            Let's get{' '}
            <span className="relative inline-block">
              you
              <svg
                className="absolute -bottom-1 left-0 w-full"
                height="5"
                viewBox="0 0 50 5"
                fill="none"
                preserveAspectRatio="none"
              >
                <path d="M1 3.5 Q25 0.5 49 3.5" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
            {' '}back home.
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Enter the email linked to your AkwaabaHomes account. We'll send a secure link to reset your password.
          </p>
        </div>

        {/* ── Two-Card Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch max-w-5xl mx-auto w-full">

          {/* ──── LEFT CARD: ARCHITECTURAL VISUAL + TRUST STRIP ──── */}
          <div className="lg:col-span-7 bg-white dark:bg-zinc-900 rounded-[28px] border border-zinc-200/80 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col justify-between">
            {/* Top House Artwork */}
            <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-[#EFF7F2] dark:bg-zinc-950">
              <Image
                src="/images/auth/recovery-house-art.jpg"
                alt="AkwaabaHomes Secure Recovery"
                fill
                priority
                className="object-cover object-center"
              />
            </div>

            {/* Bottom 3-Pillar Security Strip */}
            <div className="bg-[#EBF7EE] dark:bg-emerald-950/30 border-t border-[#D7EFE0] dark:border-emerald-900/40 px-4 sm:px-6 py-3.5">
              <div className="grid grid-cols-3 divide-x divide-emerald-200/60 dark:divide-emerald-800/40 text-center sm:text-left">
                {/* Pillar 1 */}
                <div className="flex items-center justify-center sm:justify-start gap-2.5 px-2">
                  <div className="w-7 h-7 rounded-full bg-[#16A34A] flex items-center justify-center shrink-0 text-white shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 fill-white text-[#16A34A]" />
                  </div>
                  <div className="leading-tight text-left">
                    <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">Private recovery</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">process</p>
                  </div>
                </div>

                {/* Pillar 2 */}
                <div className="flex items-center justify-center sm:justify-start gap-2.5 px-2 pl-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 text-[#16A34A]">
                    <Zap className="w-4 h-4 fill-[#16A34A]" />
                  </div>
                  <div className="leading-tight text-left">
                    <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">Single-use</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">reset link</p>
                  </div>
                </div>

                {/* Pillar 3 */}
                <div className="flex items-center justify-center sm:justify-start gap-2.5 px-2 pl-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0 text-[#16A34A]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="leading-tight text-left">
                    <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">15-minute</p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">link expiry</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ──── RIGHT CARD: RECOVERY FORM ──── */}
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 rounded-[28px] border border-zinc-200/80 dark:border-zinc-800 shadow-sm p-6 sm:p-7 flex flex-col justify-between">
            {success ? (
              /* Success Confirmation View */
              <div className="py-6 space-y-5 text-center my-auto">
                <div className="w-14 h-14 rounded-2xl bg-[#EBF7EE] dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-black text-zinc-950 dark:text-white">
                    Check your inbox
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xs mx-auto">
                    We've dispatched a secure recovery link to <span className="font-semibold text-zinc-800 dark:text-zinc-200">{maskEmail(email)}</span>. It expires in 15 minutes.
                  </p>
                </div>

                <div className="pt-2 space-y-3">
                  <button
                    type="button"
                    onClick={() => { setSuccess(false); }}
                    disabled={resendCooldown > 0}
                    className="w-full h-11 rounded-full bg-[#0F6848] hover:bg-[#0B543A] disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend link'}
                  </button>

                  <Link
                    href="/login"
                    className="block text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition"
                  >
                    Return to sign in
                  </Link>
                </div>
              </div>
            ) : (
              /* Recovery Form View */
              <div className="space-y-5">
                {/* Card Header: Icon + Badge + Title */}
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#EBF7EE] dark:bg-emerald-950/60 flex items-center justify-center shrink-0 border border-[#CDEED5] dark:border-emerald-800/40 text-[#16A34A]">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#EBF7EE] dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                      ACCOUNT RECOVERY
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white tracking-tight mt-0.5">
                      Reset your password
                    </h2>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl px-3.5 py-2.5 text-xs text-rose-700 dark:text-rose-300 font-medium">
                    {error}
                  </div>
                )}

                {/* Recovery Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full h-11 pl-10 pr-3.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1.5 focus:ring-[#16A34A] focus:border-[#16A34A] transition"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 rounded-full bg-[#0F6848] hover:bg-[#0B543A] disabled:opacity-70 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
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
                </form>

                {/* Remembered password? Sign in */}
                <div className="pt-2 text-center border-t border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Remembered your password?{' '}
                    <Link
                      href="/login"
                      className="font-bold text-[#16A34A] hover:text-[#15803D] transition"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>

                {/* Security Footnote */}
                <div className="pt-3 flex items-center justify-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A] shrink-0" />
                  <span>We'll only use this address to verify your account.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── 3. ATMOSPHERIC SKYLINE BACKGROUND (At base) ── */}
      <div className="relative w-full h-24 pointer-events-none select-none opacity-40 dark:opacity-20">
        <Image
          src="/images/auth/recovery-skyline-bg.png"
          alt="Ghana skyline"
          fill
          className="object-cover object-bottom"
        />
      </div>

      {/* ── 4. FOOTER ── */}
      <footer className="w-full bg-[#FAF9F5] dark:bg-[#0D100E] border-t border-zinc-200/60 dark:border-zinc-800 py-4 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <div>© 2026 AkwaabaHomes Ghana</div>
          <div className="flex items-center gap-4">
            <Link href="/help" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition">
              Help Centre
            </Link>
            <span>|</span>
            <Link href="/privacy" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition">
              Privacy
            </Link>
            <span>|</span>
            <Link href="/terms" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
