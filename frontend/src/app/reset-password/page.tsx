'use client';
import '@/app/secondary.css';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import QueryProvider from '@/providers/QueryProvider';
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
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import api from '@/lib/axios';
import ThemeToggle from '@/components/ThemeToggle';
import AlertBanner from '@/components/AlertBanner';

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

  return (
    <div className="-mt-16 min-h-screen w-full bg-white dark:bg-[#0D100E] text-zinc-900 dark:text-zinc-100 flex flex-col justify-between antialiased transition-colors pt-16">
      
      {/* ──── 1. TOP FIXED NAVIGATION BAR ──── */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-[#0D100E]/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
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

      {/* ──── 2. MAIN CONTENT INTERFACE ──── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col justify-center space-y-6">
        
        {/* Centered Heading */}
        <div className="text-center space-y-2.5 max-w-xl mx-auto">
          {/* Security Pill Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF7EE] dark:bg-emerald-950/40 border border-[#CDEED5] dark:border-emerald-800/40 text-[#16A34A] dark:text-emerald-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
            <Lock className="w-3.5 h-3.5" />
            <span>ACCOUNT SECURITY / PASSWORD RESET</span>
          </div>

          {/* Main Title with Gold Underline Swoosh */}
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-[#0D3827] dark:text-white tracking-tight leading-tight">
            Update your{' '}
            <span className="relative inline-block text-[#16A34A] dark:text-emerald-400">
              password
              <svg
                className="absolute -bottom-1 left-0 w-full text-[#D49339]"
                height="6"
                viewBox="0 0 70 6"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M1 4.5 Q35 0.5 69 4.5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
              </svg>
            </span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
            Choose a strong password to keep your bookings, agreements and payment records protected.
          </p>
        </div>

        {/* Success Banner */}
        {success ? (
          <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm text-center space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-full bg-[#EAF6EE] dark:bg-emerald-950/40 text-[#16A34A] border border-[#B7E8C3] dark:border-emerald-800 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-serif font-bold text-[#086333] dark:text-emerald-100">
                Password updated successfully
              </h2>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Your credentials have been securely updated. You can now use your new password to access your account.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href={isAuthenticated ? '/dashboard/profile/security' : '/login'}
                className="inline-flex items-center justify-center gap-2 px-7 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          /* ──── 2-COLUMN GRID (Form on Left, Security Cards on Right) ──── */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ── LEFT COLUMN: MAIN FORM CARD (8 Cols) ── */}
            <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              
              {/* Internal Top Banner with Independence Arch Line Art & Shield */}
              <div className="relative rounded-2xl overflow-hidden bg-[#F4F9F4] dark:bg-zinc-800/60 border border-[#D5E8D8] dark:border-zinc-700/80 p-4 sm:p-4.5 flex items-center gap-4 shadow-2xs">
                {/* Shield Key Icon */}
                <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center text-[#16A34A] dark:text-emerald-400 shrink-0 border border-zinc-200 dark:border-zinc-700 shadow-2xs">
                  <KeyRound className="w-5 h-5 stroke-[2.2]" />
                </div>

                {/* Arch Background Watermark */}
                <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center opacity-25 dark:opacity-15">
                  <Image
                    src="/images/auth/security-banner-arch.png"
                    alt=""
                    fill
                    className="object-contain object-right mr-12"
                    sizes="(max-width: 768px) 100vw, 256px"
/>
                </div>

                {/* Thin Vertical Gold Accent Line */}
                <span className="relative z-10 hidden sm:block h-8 w-[1.5px] bg-amber-400/80 dark:bg-amber-500/60 shrink-0" />

                {/* Banner Text */}
                <p className="relative z-10 text-xs sm:text-[13px] font-serif font-bold text-[#086333] dark:text-emerald-100 leading-snug max-w-md">
                  A secure account means a safer and smoother experience on AkwaabaHomes.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <AlertBanner type="error">
                  <span>{error}</span>
                </AlertBanner>
              )}

              {/* Form with Indented Alignment Matching Design Reference */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* 1. Current Password (only when authenticated) */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                  <label
                    htmlFor="currentPassword"
                    className="sm:col-span-4 text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100"
                  >
                    Current password
                  </label>
                  <div className="sm:col-span-8 relative">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder={token ? 'Not required with reset token' : 'Enter your current password'}
                      disabled={Boolean(token)}
                      className="w-full px-4 py-2.5 pr-10 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-[#16A34A] disabled:opacity-60 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
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
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                  <label
                    htmlFor="newPassword"
                    className="sm:col-span-4 text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100"
                  >
                    New password
                  </label>
                  <div className="sm:col-span-8 relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      className="w-full px-4 py-2.5 pr-10 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-[#16A34A] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
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
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center">
                  <label
                    htmlFor="confirmPassword"
                    className="sm:col-span-4 text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100"
                  >
                    Confirm new password
                  </label>
                  <div className="sm:col-span-8 relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your new password"
                      className="w-full px-4 py-2.5 pr-10 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-[#16A34A] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition"
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

                {/* ── Password Strength Bar (Indented to match Inputs) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center pt-1">
                  <div className="hidden sm:block sm:col-span-4" />
                  <div className="sm:col-span-8">
                    <div className="flex items-center gap-3">
                      <div className="grid grid-cols-4 gap-2 flex-1">
                        {[1, 2, 3, 4].map((seg) => (
                          <div
                            key={seg}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              seg <= passedCriteriaCount
                                ? 'bg-[#16A34A]'
                                : 'bg-zinc-200 dark:bg-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-[#16A34A] dark:text-emerald-400 w-14 text-right">
                        {strengthLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── 4 Criteria Checklist (2 Columns, Indented to match Inputs) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-start pt-1">
                  <div className="hidden sm:block sm:col-span-4" />
                  <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {/* Item 1: At least 12 characters */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          hasAtLeast12Chars
                            ? 'bg-[#16A34A] text-white'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                        At least 12 characters
                      </span>
                    </div>

                    {/* Item 2: A number and a symbol */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          hasNumberAndSymbol
                            ? 'bg-[#16A34A] text-white'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                        A number and a symbol
                      </span>
                    </div>

                    {/* Item 3: Uppercase and lowercase letters */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          hasUpperAndLowerCase
                            ? 'bg-[#16A34A] text-white'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                        Uppercase and lowercase
                      </span>
                    </div>

                    {/* Item 4: New password matches */}
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                          isMatchValid
                            ? 'bg-[#16A34A] text-white'
                            : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-400'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                        Passwords match
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Sign Out of Other Devices Checkbox (Indented) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center pt-2">
                  <div className="hidden sm:block sm:col-span-4" />
                  <div className="sm:col-span-8 flex items-center gap-2.5">
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
                </div>

                {/* ── Buttons Row (Indented to match inputs) ── */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 items-center pt-4">
                  <div className="hidden sm:block sm:col-span-4" />
                  <div className="sm:col-span-8 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-6 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Update password</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* ── RIGHT COLUMN: SECURITY CARDS (4 Cols) ── */}
            <div className="lg:col-span-4 space-y-5">
              
              {/* Card 1: Protect your account (Dark Forest Green #0A3D26) */}
              <div className="bg-[#0A3D26] dark:bg-[#072419] rounded-3xl p-6 text-white space-y-3.5 shadow-xs relative overflow-hidden border border-emerald-900/40">
                <div className="relative z-10 space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 stroke-[2.4]" />
                    <h3 className="font-serif text-base font-bold text-white">
                      Protect your account
                    </h3>
                  </div>
                  <p className="text-xs text-emerald-200/90 leading-relaxed font-normal">
                    Follow these best practices to keep your AkwaabaHomes account safe.
                  </p>
                </div>

                <div className="relative z-10 divide-y divide-emerald-800/60 pt-1 text-xs">
                  <div className="py-2.5 flex items-center gap-3">
                    <Lock className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span className="font-medium text-emerald-50">Unique password</span>
                  </div>

                  <div className="py-2.5 flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span className="font-medium text-emerald-50">Two-step verification</span>
                  </div>

                  <div className="py-2.5 flex items-center gap-3">
                    <Laptop className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span className="font-medium text-emerald-50">Review active sessions</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Recent security activity */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-300 flex items-center justify-center">
                    <Clock className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <h3 className="font-serif text-base font-bold text-zinc-950 dark:text-white">
                    Recent security activity
                  </h3>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Password last updated */}
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Password status</span>
                    </div>
                    <span className="font-bold text-zinc-900 dark:text-white">Active</span>
                  </div>

                  {/* Two-factor authentication */}
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Two-factor authentication</span>
                    </div>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {is2FAEnabled ? 'Enabled' : 'Not enabled'}
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
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16A34A] dark:text-emerald-300 hover:underline"
                  >
                    <span>Manage security settings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ──── BOTTOM ENCRYPTION DISCLAIMER ──── */}
        <div className="pt-2">
          <div className="flex items-center justify-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="hidden sm:inline-block w-28 h-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex items-center gap-1.5 font-medium">
              <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>Your password is encrypted and never displayed to support staff.</span>
            </div>
            <span className="hidden sm:inline-block w-28 h-px bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      </main>

      {/* ──── 3. FOOTER ──── */}
      <footer className="w-full bg-white dark:bg-[#0D100E] border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 gap-2">
          <span>© 2026 AkwaabaHomes Ghana</span>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <span>•</span>
            <Link href="/help" className="hover:underline">Help</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0D100E]">
          <Loader2 className="w-8 h-8 animate-spin text-[#16A34A] dark:text-emerald-400" />
        </div>
      }
    >
      <QueryProvider>
        <ResetPasswordForm />
      </QueryProvider>
    </Suspense>
  );
}
