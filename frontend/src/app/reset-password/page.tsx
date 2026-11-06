'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  Lock, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  ShieldCheck,
  Calendar,
  Laptop,
  Clock,
  Home,
  Check,
  FileText,
  CreditCard,
  KeyRound,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/axios';
import ThemeToggle from '@/components/ThemeToggle';
import AlertBanner from '@/components/AlertBanner';
import PublicFooter from '@/components/tenant-ui/PublicFooter';

function HeaderSwoosh({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx('w-48 h-2.5 mx-auto text-[#0B3B24] dark:text-emerald-500 opacity-40 dark:opacity-60', className)}
    >
      <path
        d="M2 9C55 2.5 125 10.5 238 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signOutOthers, setSignOutOthers] = useState(false);

  // Visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch authenticated user info if logged in
  const { data: userData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/me');
        return data?.user || null;
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 60_000,
  });

  const isAuthenticated = Boolean(userData);

  // Fetch session count if authenticated
  const { data: sessionsData } = useQuery({
    queryKey: ['user-sessions-count'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/sessions');
        return data?.sessions || [];
      } catch {
        return [];
      }
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 60_000,
  });

  const activeSessionsCount = sessionsData?.length || 2;

  // Fetch 2FA status if authenticated
  const { data: twoFactorData } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/2fa/status');
        return data;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
    retry: false,
    staleTime: 60_000,
  });

  const is2FAEnabled = Boolean(twoFactorData?.is2FAEnabled);

  // Password Validation Criteria matching mockup
  const hasAtLeast12Chars = newPassword.length >= 12;
  const hasNumberAndSymbol = /\d/.test(newPassword) && /[\W_]/.test(newPassword);
  const hasUpperAndLowerCase = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
  const isMatchValid = newPassword.length > 0 && newPassword === confirmPassword;

  // Strength score
  const passedCriteriaCount = [
    hasAtLeast12Chars,
    hasNumberAndSymbol,
    hasUpperAndLowerCase,
    isMatchValid,
  ].filter(Boolean).length;

  const strengthLabel = 
    passedCriteriaCount === 4
      ? 'Strong'
      : passedCriteriaCount === 3
      ? 'Good'
      : passedCriteriaCount >= 1
      ? 'Fair'
      : 'Weak';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!isMatchValid) {
      setError('New password and confirmation do not match.');
      return;
    }

    setIsLoading(true);

    try {
      if (token) {
        // Unauthenticated Token Reset Flow
        await api.post('/auth/reset-password', {
          token,
          newPassword,
        });
        setSuccess(true);
      } else if (isAuthenticated) {
        // Authenticated In-App Password Change Flow
        if (!currentPassword) {
          setError('Please enter your current password.');
          setIsLoading(false);
          return;
        }

        await api.post('/auth/change-password', {
          currentPassword,
          newPassword,
          signOutOthers,
        });
        setSuccess(true);
      } else {
        // Demo or missing credentials
        setError('Please check the reset link from your email or sign in to update your password.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to update password. Please check your credentials and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isAuthenticated) {
      router.push('/dashboard/profile/security');
    } else {
      router.push('/login');
    }
  };

  const scrollToForm = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById('reset-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToStandards = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById('security-standards');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="-mt-16 min-h-screen w-full bg-white dark:bg-[#0C100D] text-[#14221A] dark:text-zinc-100 font-sans selection:bg-[#0B3B24] selection:text-white relative overflow-x-hidden pt-20 flex flex-col justify-between antialiased transition-colors">
      
      {/* ──── TOP FIXED NAVIGATION BAR ──── */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0C100D]/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between">
          {/* Left Brand + Breadcrumb */}
          <div className="flex items-center gap-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
                <Image
                  src="/logo.png"
                  alt="AkwaabaHomes"
                  width={38}
                  height={38}
                  className="w-full h-full object-contain hidden dark:block transition-transform duration-300 group-hover:scale-105"
                  priority
                />
                <Image
                  src="/logo-light.png"
                  alt="AkwaabaHomes"
                  width={38}
                  height={38}
                  className="w-full h-full object-contain block dark:hidden transition-transform duration-300 group-hover:scale-105"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-base font-black tracking-tight text-[#16A34A] dark:text-white leading-none">
                  AkwaabaHomes
                </span>
                <span className="text-[10px] font-medium text-emerald-800 dark:text-emerald-400 mt-0.5">
                  Live Well. Feel at Home.
                </span>
              </div>
            </Link>

            <span className="hidden sm:inline-block h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

            {/* Breadcrumb */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              <Home className="w-3.5 h-3.5 text-zinc-400" />
              <span>/</span>
              <span>Account</span>
              <span>/</span>
              <span className="text-zinc-900 dark:text-zinc-200 font-bold">Security</span>
            </div>
          </div>

          {/* Right Controls: Theme Toggle & Back Button */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            <span className="h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

            <button
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:text-[#16A34A] dark:hover:text-emerald-400 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isAuthenticated ? 'Back to account' : 'Back to sign in'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          1. HERO SECTION: Keep your stay and profile fully protected
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-6 sm:pt-10 lg:pt-12 pb-10 sm:pb-14 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto w-full">
        {/* Subtle Adinkra geometric watermark on the left edge */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-6 sm:top-10 w-44 sm:w-56 h-80 opacity-20 dark:opacity-10 pointer-events-none select-none -z-0"
        >
          <Image
            src="/images/about/adinkra-left-motif.jpg"
            alt=""
            fill
            className="object-cover object-left"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
          {/* Left Column: Headline, Copy, Action Buttons (7 Cols) */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-6 sm:space-y-7 pr-2">
            <div className="space-y-3">
              <span className="inline-block text-[11px] font-black uppercase tracking-wider text-[#C88A2E]">
                ACCOUNT SECURITY &amp; PROTECTION
              </span>

              <h1 className="text-3xl sm:text-4xl lg:text-[50px] font-serif font-black text-[#14221A] dark:text-white tracking-tight leading-[1.12]">
                Keep your stay <br />
                and profile <br />
                <span className="relative inline-block text-[#0B3B24] dark:text-emerald-400">
                  fully protected.
                  {/* Organic warm ochre/gold curved line */}
                  <svg
                    viewBox="0 0 160 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-2.5 mt-1 text-[#D49339]"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 8C45 2.5 110 4 157 8.5"
                      stroke="currentColor"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              <p className="text-xs sm:text-[14px] text-[#4A5A50] dark:text-zinc-300 leading-relaxed font-medium max-w-lg pt-1">
                Choose a strong, unique password to secure your tenancy agreements, booking history, verified Ghana Card credentials, and digital receipts on AkwaabaHomes.
              </p>
            </div>

            {/* Action Buttons: Solid Green + Outlined Pill */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={scrollToForm}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-[13px] font-bold transition shadow-xs cursor-pointer"
              >
                <span>Update password</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={scrollToStandards}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-transparent hover:bg-[#0B3B24]/5 border border-[#0B3B24] dark:border-emerald-500 text-[#0B3B24] dark:text-emerald-400 text-xs sm:text-[13px] font-bold transition cursor-pointer"
              >
                <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
                  <ShieldCheck className="w-2.5 h-2.5 stroke-[2.4]" />
                </div>
                <span>Security standards</span>
              </button>
            </div>
          </div>

          {/* Right Column: High-Res Security Community Photo Card (6 Cols) */}
          <div className="lg:col-span-6 xl:col-span-6 relative">
            <div className="relative w-full h-[280px] sm:h-[360px] md:h-[400px] rounded-3xl overflow-hidden shadow-[0_10px_35px_rgba(11,59,36,0.06)] border border-[#E8E6DD] dark:border-zinc-800">
              <Image
                src="/images/about/privacy-hero-community-2x.jpg"
                alt="AkwaabaHomes verified residents and protected community"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />

              {/* Soft gradient edge fade into the clean white background */}
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white/60 dark:from-[#0C100D]/60 to-transparent pointer-events-none" />

              {/* Floating Pill: Bank-Grade Protection */}
              <div className="absolute bottom-4 right-4 z-20 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs border border-zinc-200/80 dark:border-zinc-700 shadow-md">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-3 h-3 stroke-[2.4]" />
                </span>
                <span className="text-[11px] font-bold text-zinc-900 dark:text-white">
                  Bank-grade encryption &amp; Act 843 compliant
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          2. MISSION TRIAD BANNER: WHY WE PRIORITIZE SECURITY
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto py-4 w-full">
        <div className="bg-[#EEF4EC] dark:bg-[#121A16] border border-[#DCE5DA] dark:border-zinc-800/80 rounded-3xl p-5 sm:p-7 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center shadow-xs">
          {/* Left Column: Why We Started Tag + Headline (4 Cols) */}
          <div className="md:col-span-4 space-y-2 pr-2">
            <span className="inline-block text-[11px] font-black uppercase tracking-wider text-[#C88A2E]">
              WHY IT MATTERS
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-[#14221A] dark:text-white leading-tight">
              Renting with confidence begins with a protected account.
            </h2>
          </div>

          {/* Middle Column: Context (4 Cols) */}
          <div className="md:col-span-4 md:border-l md:border-[#D5DFD3] dark:md:border-zinc-800 md:pl-6 space-y-1">
            <p className="text-xs sm:text-[13px] text-[#4A5A50] dark:text-zinc-300 leading-relaxed font-medium">
              From signed tenancy agreements and booking histories to verified Ghana Card records and digital payment receipts, your account safeguards your official tenancy journey.
            </p>
          </div>

          {/* Right Column: Dark Green Quote Card + Ghana Line-Art (4 Cols) */}
          <div className="md:col-span-4 flex items-center gap-3">
            {/* Green Quote Card */}
            <div className="flex-1 bg-[#0B3B24] dark:bg-[#072416] text-white rounded-2xl p-4 sm:p-4.5 space-y-2 shadow-sm border border-emerald-900/40">
              <span className="text-2xl font-serif font-black text-[#E6A040] leading-none block">
                &ldquo;
              </span>
              <p className="text-xs sm:text-[12.5px] font-serif italic text-white/95 leading-snug">
                Clear terms. Verified residents. Zero unauthorized access.
              </p>
            </div>

            {/* Ghana Map & Building Line-Art Card */}
            <div className="w-24 sm:w-28 h-24 sm:h-28 relative rounded-2xl overflow-hidden shrink-0 border border-[#DCE5DA] dark:border-zinc-800 bg-[#E8EFE6] dark:bg-zinc-800/40">
              <Image
                src="/images/about/ghana-line-art.jpg"
                alt="Ghana Map and Property Architecture Line Art"
                fill
                sizes="112px"
                className="object-cover object-center"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          3. INTERACTIVE PASSWORD RESET SECTION (Form + Security Dashboard)
         ══════════════════════════════════════════════════════════════════════ */}
      <section id="reset-form" className="px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto py-10 sm:py-14 space-y-8 w-full">
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#14221A] dark:text-white tracking-tight">
            Update your security credentials
          </h2>
          <HeaderSwoosh />
          <p className="text-xs sm:text-[13px] text-[#4A5A50] dark:text-zinc-400 font-medium max-w-md mx-auto pt-1">
            Choose a new password below. Ensure it fulfills the 4 safety criteria to maximize your account protection.
          </p>
        </div>

        {/* Success Banner */}
        {success ? (
          <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-sm text-center space-y-5 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#16A34A] border border-[#D5E3D4] dark:border-emerald-800/50 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#14221A] dark:text-white">
                Password updated successfully
              </h3>
              <p className="text-xs sm:text-sm text-[#4A5A50] dark:text-zinc-400 leading-relaxed max-w-md mx-auto">
                Your credentials have been securely updated. You can now use your new password to sign in and manage your bookings, agreements, and payments.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href={isAuthenticated ? '/dashboard/profile/security' : '/login'}
                className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-[13px] font-bold transition shadow-xs"
              >
                <span>Continue to {isAuthenticated ? 'Security Settings' : 'Sign in'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          /* ──── 2-COLUMN GRID (Form on Left, Security Cards on Right) ──── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* ── LEFT COLUMN: MAIN FORM CARD (7-8 Cols) ── */}
            <div className="lg:col-span-7 xl:col-span-8 bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              
              {/* Internal Reassurance Banner */}
              <div className="relative rounded-2xl overflow-hidden bg-[#EEF4EC] dark:bg-[#15221B] border border-[#DCE5DA] dark:border-emerald-900/40 p-4 sm:p-5 flex items-center gap-4 shadow-xs">
                {/* Shield Key Icon Bubble */}
                <div className="w-11 h-11 rounded-full bg-white dark:bg-emerald-950/80 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40">
                  <KeyRound className="w-5 h-5 stroke-[2.2]" />
                </div>

                {/* Arch Background Watermark */}
                <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center opacity-15 dark:opacity-10">
                  <Image
                    src="/images/auth/security-banner-arch.png"
                    alt=""
                    fill
                    className="object-contain object-right mr-6"
                  />
                </div>

                {/* Thin Vertical Gold Accent Line */}
                <span className="relative z-10 hidden sm:block h-8 w-[1.5px] bg-[#C88A2E]/50 shrink-0" />

                {/* Banner Text */}
                <p className="relative z-10 text-xs sm:text-[13px] font-serif font-bold text-[#0B3B24] dark:text-emerald-200 leading-snug">
                  Protecting your account takes less than a minute. Changes take effect across your sessions immediately.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <AlertBanner type="error">
                  <span>{error}</span>
                </AlertBanner>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* 1. Current Password (only when authenticated without token) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="currentPassword"
                    className="block text-xs sm:text-[13px] font-bold text-[#14221A] dark:text-zinc-200"
                  >
                    Current password
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={token ? 'Not required with reset token' : 'Enter your current password'}
                      disabled={Boolean(token)}
                      className="w-full px-4 py-3 pr-11 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-[#16A34A] disabled:opacity-60 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
                      aria-label="Toggle current password visibility"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. New Password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="newPassword"
                    className="block text-xs sm:text-[13px] font-bold text-[#14221A] dark:text-zinc-200"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      className="w-full px-4 py-3 pr-11 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-[#16A34A] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
                      aria-label="Toggle new password visibility"
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 3. Confirm New Password */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-xs sm:text-[13px] font-bold text-[#14221A] dark:text-zinc-200"
                  >
                    Confirm new password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      className="w-full px-4 py-3 pr-11 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-[#16A34A] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* ── Password Strength Bar ── */}
                <div className="pt-1 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                      Password strength:
                    </span>
                    <span className="font-bold text-[#16A34A] dark:text-emerald-400">
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((seg) => (
                      <div
                        key={seg}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          seg <= passedCriteriaCount
                            ? 'bg-[#16A34A]'
                            : 'bg-zinc-200 dark:bg-zinc-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* ── 4 Criteria Checklist (2 Columns with Emerald Bubbles) ── */}
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Item 1: At least 12 characters */}
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/80">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        hasAtLeast12Chars
                          ? 'bg-[#16A34A] text-white'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[2.6]" />
                    </div>
                    <span className="text-[#14221A] dark:text-zinc-300 font-medium">
                      At least 12 characters
                    </span>
                  </div>

                  {/* Item 2: A number and a symbol */}
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/80">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        hasNumberAndSymbol
                          ? 'bg-[#16A34A] text-white'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[2.6]" />
                    </div>
                    <span className="text-[#14221A] dark:text-zinc-300 font-medium">
                      A number &amp; a symbol
                    </span>
                  </div>

                  {/* Item 3: Uppercase and lowercase letters */}
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/80">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        hasUpperAndLowerCase
                          ? 'bg-[#16A34A] text-white'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[2.6]" />
                    </div>
                    <span className="text-[#14221A] dark:text-zinc-300 font-medium">
                      Uppercase &amp; lowercase
                    </span>
                  </div>

                  {/* Item 4: New password matches */}
                  <div className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/80">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isMatchValid
                          ? 'bg-[#16A34A] text-white'
                          : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      <Check className="w-3 h-3 stroke-[2.6]" />
                    </div>
                    <span className="text-[#14221A] dark:text-zinc-300 font-medium">
                      Passwords match
                    </span>
                  </div>
                </div>

                {/* ── Sign Out of Other Devices Checkbox ── */}
                <div className="pt-2 flex items-center gap-3">
                  <input
                    id="signOutOthers"
                    type="checkbox"
                    checked={signOutOthers}
                    onChange={(e) => setSignOutOthers(e.target.checked)}
                    className="w-4 h-4 rounded text-[#16A34A] focus:ring-[#16A34A] border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 cursor-pointer accent-[#16A34A]"
                  />
                  <label
                    htmlFor="signOutOthers"
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
                  >
                    Sign out of other devices after changing my password
                  </label>
                </div>

                {/* ── Buttons Row ── */}
                <div className="pt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-[13px] font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Update password</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-6 py-3 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs sm:text-[13px] font-bold text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            {/* ── RIGHT COLUMN: SECURITY CARDS (4-5 Cols) ── */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-5">
              
              {/* Card 1: Protect your account (Dark Forest Green matching About Page) */}
              <div className="bg-[#0B3B24] dark:bg-[#072416] rounded-3xl p-6 text-white space-y-4 shadow-xs relative overflow-hidden border border-emerald-900/40">
                <div className="relative z-10 space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 stroke-[2.4]" />
                    <h3 className="font-serif text-base font-bold text-white">
                      Security best practices
                    </h3>
                  </div>
                  <p className="text-xs text-emerald-200/90 leading-relaxed font-normal">
                    Follow these guidelines to keep your tenancy records safe.
                  </p>
                </div>

                <div className="relative z-10 space-y-3 pt-1 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-900/60 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-800/40">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">Unique password</span>
                      <span className="text-[11px] text-emerald-200/80">Never reuse your email or bank credentials.</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-900/60 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-800/40">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">Two-step verification</span>
                      <span className="text-[11px] text-emerald-200/80">Add SMS or authenticator protection.</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-900/60 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-800/40">
                      <Laptop className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">Active session review</span>
                      <span className="text-[11px] text-emerald-200/80">Regularly monitor logged in devices.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Recent security activity */}
              <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-300 flex items-center justify-center border border-[#D5E3D4] dark:border-emerald-800/40">
                    <Clock className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <h3 className="font-serif text-base font-bold text-zinc-950 dark:text-white">
                    Account security status
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Password last updated */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Password status</span>
                    </div>
                    <span className="font-bold text-zinc-900 dark:text-white">Active</span>
                  </div>

                  {/* Two-factor authentication */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>2FA protection</span>
                    </div>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {is2FAEnabled ? 'Enabled' : 'Not configured'}
                    </span>
                  </div>

                  {/* Active sessions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium">
                      <Laptop className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Active sessions</span>
                    </div>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {activeSessionsCount} devices
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <Link
                    href="/dashboard/profile/security"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16A34A] dark:text-emerald-400 hover:underline"
                  >
                    <span>Manage security settings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Card 3: 256-bit encryption note */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-start gap-3 text-xs">
                <Lock className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Your credentials are salted, hashed with bcrypt, and never visible in plaintext to administrators or support agents.
                </p>
              </div>

            </div>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          4. THE SECURITY STANDARDS BEHIND EVERY ACCOUNT (4 Core Safeguards)
         ══════════════════════════════════════════════════════════════════════ */}
      <section id="security-standards" className="px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto py-8 sm:py-12 space-y-8 w-full">
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#14221A] dark:text-white tracking-tight">
            The standards safeguarding your account
          </h2>
          <HeaderSwoosh />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Item 1: Act 843 Compliance */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#E9E7DE] dark:border-zinc-800 shadow-2xs">
            <div className="w-11 h-11 rounded-2xl bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40 mt-0.5">
              <ShieldCheck className="w-5 h-5 stroke-[2.1]" />
            </div>
            <div>
              <p className="text-xs sm:text-[12.5px] font-bold text-[#14221A] dark:text-zinc-200 leading-snug">
                Ghana Data Protection Act (Act 843)
              </p>
              <p className="text-[11px] text-[#55665B] dark:text-zinc-400 mt-0.5">
                Compliant storage and identity handling
              </p>
            </div>
          </div>

          {/* Item 2: Secure MoMo and Card Isolation */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#E9E7DE] dark:border-zinc-800 shadow-2xs">
            <div className="w-11 h-11 rounded-2xl bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40 mt-0.5">
              <CreditCard className="w-5 h-5 stroke-[2.1]" />
            </div>
            <div>
              <p className="text-xs sm:text-[12.5px] font-bold text-[#14221A] dark:text-zinc-200 leading-snug">
                Isolated Payment Tokens
              </p>
              <p className="text-[11px] text-[#55665B] dark:text-zinc-400 mt-0.5">
                Financial data stored via PCI-DSS partners
              </p>
            </div>
          </div>

          {/* Item 3: Encrypted Tenancy Vault */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#E9E7DE] dark:border-zinc-800 shadow-2xs">
            <div className="w-11 h-11 rounded-2xl bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40 mt-0.5">
              <FileText className="w-5 h-5 stroke-[2.1]" />
            </div>
            <div>
              <p className="text-xs sm:text-[12.5px] font-bold text-[#14221A] dark:text-zinc-200 leading-snug">
                Encrypted Tenancy Vault
              </p>
              <p className="text-[11px] text-[#55665B] dark:text-zinc-400 mt-0.5">
                Legally executed leases cryptographically signed
              </p>
            </div>
          </div>

          {/* Item 4: Instant Session Revocation */}
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#E9E7DE] dark:border-zinc-800 shadow-2xs">
            <div className="w-11 h-11 rounded-2xl bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40 mt-0.5">
              <Laptop className="w-5 h-5 stroke-[2.1]" />
            </div>
            <div>
              <p className="text-xs sm:text-[12.5px] font-bold text-[#14221A] dark:text-zinc-200 leading-snug">
                Instant Session Revocation
              </p>
              <p className="text-[11px] text-[#55665B] dark:text-zinc-400 mt-0.5">
                Terminate untrusted devices with one tap
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          5. BOTTOM CALL-TO-ACTION BANNER: Adinkra Motif Strip
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full bg-[#072B1A] text-white overflow-hidden py-3.5 px-4 sm:px-8 border-y border-emerald-950/60 mt-8">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
        >
          <Image
            src="/images/about/bottom-cta-pattern.jpg"
            alt=""
            fill
            className="object-cover object-center"
          />
        </div>

        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 sm:gap-6 relative z-10 text-center sm:text-left">
          <p className="text-xs sm:text-sm lg:text-base font-serif font-bold text-white tracking-wide">
            Need help securing your account or suspect unauthorized access?
          </p>

          <Link
            href="/support"
            className="px-5 py-2 rounded-full bg-white hover:bg-zinc-100 text-[#14221A] text-xs font-extrabold transition shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <span>Contact Help Centre</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          6. FOOTER
         ══════════════════════════════════════════════════════════════════════ */}
      <PublicFooter />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0C100D]">
          <Loader2 className="w-8 h-8 animate-spin text-[#16A34A] dark:text-emerald-400" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
