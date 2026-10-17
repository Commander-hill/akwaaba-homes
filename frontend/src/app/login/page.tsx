'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';
import AlertBanner from '@/components/AlertBanner';
import ThemeToggle from '@/components/ThemeToggle';

function LoginForm() {
  const searchParams = useSearchParams();
  const isTimeout = searchParams.get('reason') === 'timeout';
  const isRegistered = searchParams.get('registered') === 'true';
  const redirectParam = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Check if user is already logged in
  const { data: sessionData, isLoading: isCheckingAuth } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/me');
        return data?.user || null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const redirectByRole = (user: any) => {
    if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
      window.location.href = redirectParam;
      return;
    }

    if (user.role === 'ADMIN') {
      window.location.href = '/admin/dashboard';
    } else if (user.role === 'LANDLORD') {
      window.location.href = '/dashboard/landlord';
    } else if (user.role === 'CARETAKER' || user.role === 'STAFF') {
      window.location.href = '/dashboard/caretaker';
    } else {
      if (user.isStudent && !user.studentId) {
        window.location.href = '/onboarding';
      } else {
        window.location.href = '/dashboard/tenant';
      }
    }
  };

  useEffect(() => {
    if (sessionData && !isTimeout) {
      redirectByRole(sessionData);
    }
  }, [sessionData, isTimeout]);

  // 2FA State
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, password });

      if (response.data.requireTwoFactor) {
        setRequireTwoFactor(true);
        setTempToken(response.data.tempToken);
        setIsLoading(false);
        return;
      }

      if (response.data?.accessToken) {
        localStorage.setItem('akwaaba_access_token', response.data.accessToken);
      }
      if (response.data?.refreshToken) {
        localStorage.setItem('akwaaba_refresh_token', response.data.refreshToken);
      }

      redirectByRole(response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password.');
      setIsLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login/2fa', {
        tempToken,
        code: twoFactorCode.trim(),
      });

      if (response.data?.accessToken) {
        localStorage.setItem('akwaaba_access_token', response.data.accessToken);
      }
      if (response.data?.refreshToken) {
        localStorage.setItem('akwaaba_refresh_token', response.data.refreshToken);
      }

      redirectByRole(response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid 2FA code or recovery code.');
      setIsLoading(false);
    }
  };

  // Active session loading spinner
  if (isCheckingAuth && typeof window !== 'undefined' && localStorage.getItem('akwaaba_access_token') && !isTimeout) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F7F2] dark:bg-[#111513] text-[#242925] dark:text-[#F4F5F2] p-6 space-y-4">
        <Loader2 className="w-7 h-7 animate-spin text-[#173D32] dark:text-[#86B59C]" />
        <p className="text-xs font-medium text-[#5E645E] dark:text-[#A0A8A2]">Verifying session...</p>
      </div>
    );
  }

  // Active session already verified
  if (sessionData && !isTimeout) {
    const roleTitle =
      sessionData.role === 'LANDLORD'
        ? 'Landlord Dashboard'
        : sessionData.role === 'ADMIN'
        ? 'Admin Hub'
        : sessionData.role === 'CARETAKER' || sessionData.role === 'STAFF'
        ? 'Operations Hub'
        : 'Tenant Dashboard';

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F2] dark:bg-[#111513] text-[#242925] dark:text-[#F4F5F2] p-6">
        <div className="w-full max-w-md bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-8 text-center space-y-5 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#1F7A4C] dark:text-[#6EE7B7] flex items-center justify-center mx-auto border border-[#A7F3D0] dark:border-[#065F46]">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="font-editorial text-2xl text-[#242925] dark:text-white">Active Session Detected</h2>
            <p className="text-sm text-[#5E645E] dark:text-[#A0A8A2]">
              You are signed in as{' '}
              <span className="font-semibold text-[#242925] dark:text-white">
                {sessionData.firstName || sessionData.email}
              </span>
              .
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => redirectByRole(sessionData)}
              className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#173D32] hover:bg-[#102C24] text-white text-sm font-medium rounded-[10px] transition-colors cursor-pointer"
            >
              <span>Continue to {roleTitle}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                try {
                  await api.post('/auth/logout');
                } catch {}
                localStorage.removeItem('akwaaba_access_token');
                localStorage.removeItem('akwaaba_refresh_token');
                window.location.reload();
              }}
              className="w-full h-11 inline-flex items-center justify-center border border-[#D4D6CE] dark:border-[#2E3832] hover:bg-[#F1EFE7] dark:hover:bg-[#1E2420] text-sm font-medium text-[#242925] dark:text-[#F4F5F2] rounded-[10px] transition-colors cursor-pointer"
            >
              Sign out &amp; switch account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8F7F2] dark:bg-[#111513] text-[#242925] dark:text-[#F4F5F2] antialiased">
      {/* ── Minimal Purpose-Built Header ── */}
      <header className="w-full px-6 sm:px-10 lg:px-16 py-5 border-b border-[#E7E7DF] dark:border-[#262E29] bg-white/80 dark:bg-[#111513]/80 backdrop-blur-md flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-[10px] overflow-hidden bg-[#173D32] flex items-center justify-center shadow-xs">
            <Image
              src="/logo.png"
              alt="Akwaaba Homes"
              width={36}
              height={36}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[16px] font-semibold tracking-tight text-[#242925] dark:text-white leading-none">
              Akwaaba<span className="text-[#173D32] dark:text-[#86B59C]">Homes</span>
            </span>
            <span className="text-[10px] text-[#6F756F] dark:text-[#9CA39E] tracking-wide mt-0.5">
              Trusted Homes for Students &amp; Residents
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/search"
            className="text-xs sm:text-sm font-medium text-[#5E645E] hover:text-[#242925] dark:text-[#A0A8A2] dark:hover:text-white transition-colors"
          >
            Explore homes &rarr;
          </Link>
        </div>
      </header>

      {/* ── Main Asymmetric Workspace ── */}
      <main className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-16 py-10 sm:py-14">
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-20 items-center">
          {/* ──── Left Column: Dominant Authentication Form (58%) ──── */}
          <div className="lg:col-span-7 xl:col-span-6 w-full max-w-md mx-auto lg:mx-0 bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-6 sm:p-8 shadow-xs">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#557A67] dark:text-[#86B59C] mb-1.5">
                Welcome Back
              </p>
              <h1 className="font-editorial text-2xl sm:text-3xl text-[#242925] dark:text-white">
                Sign in to your account
              </h1>
              <p className="text-sm text-[#5E645E] dark:text-[#A0A8A2] leading-relaxed mt-1.5">
                Access your bookings, saved properties, tenancy records, or host workspace.
              </p>
            </div>

            {isRegistered && (
              <AlertBanner
                type="success"
                message="Your account has been created. Please sign in below to continue."
                className="mb-5"
              />
            )}

            {isTimeout && (
              <AlertBanner
                type="warning"
                message="Your session timed out due to inactivity. Please sign in to resume."
                className="mb-5"
              />
            )}

            {error && (
              <AlertBanner
                type="error"
                message={error}
                className="mb-5"
              />
            )}

            {/* Two-Factor Verification Challenge */}
            {requireTwoFactor ? (
              <form onSubmit={handle2FASubmit} className="space-y-5">
                <div className="space-y-1 pb-2 border-b border-[#E7E7DF] dark:border-[#262E29]">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#242925] dark:text-white">
                    Two-Factor Authentication
                  </div>
                  <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2]">
                    {useRecoveryCode
                      ? 'Enter your 8-character emergency recovery code.'
                      : 'Enter the 6-digit code from your authenticator app.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-[#242925] dark:text-[#E5E7E4]">
                    {useRecoveryCode ? 'Emergency recovery key' : '6-digit verification code'}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={useRecoveryCode ? 10 : 6}
                    autoFocus
                    className="w-full h-11 px-3.5 bg-white dark:bg-[#111513] border border-[#D4D6CE] dark:border-[#2E3832] rounded-[10px] text-center text-lg font-mono font-bold tracking-widest text-[#242925] dark:text-white placeholder:text-[#6F756F] focus:border-[#173D32] focus:ring-2 focus:ring-[#173D32]/20 outline-none transition-colors"
                    placeholder={useRecoveryCode ? 'XXXX-XXXX' : '000000'}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                  />
                </div>

                <div className="text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setUseRecoveryCode(!useRecoveryCode);
                      setTwoFactorCode('');
                      setError('');
                    }}
                    className="text-[#173D32] dark:text-[#86B59C] hover:underline cursor-pointer font-medium"
                  >
                    {useRecoveryCode ? 'Use 6-digit authenticator code' : 'Lost device? Use emergency recovery key'}
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || !twoFactorCode.trim()}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-[10px] bg-[#173D32] hover:bg-[#102C24] text-white text-sm font-medium transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify and continue'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRequireTwoFactor(false);
                      setTwoFactorCode('');
                      setError('');
                    }}
                    className="w-full text-center text-xs text-[#5E645E] hover:text-[#242925] dark:text-[#A0A8A2] dark:hover:text-white cursor-pointer py-1"
                  >
                    &larr; Back to sign in
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="login-email"
                      className="block text-[13px] font-medium text-[#242925] dark:text-[#E5E7E4]"
                    >
                      Email address
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="email"
                      className="w-full h-11 px-3.5 bg-white dark:bg-[#111513] border border-[#D4D6CE] dark:border-[#2E3832] rounded-[10px] text-sm text-[#242925] dark:text-white placeholder:text-[#6F756F] focus:border-[#173D32] focus:ring-2 focus:ring-[#173D32]/20 outline-none transition-colors"
                      placeholder="e.g. kwame@st.ug.edu.gh or personal@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="login-password"
                        className="block text-[13px] font-medium text-[#242925] dark:text-[#E5E7E4]"
                      >
                        Password
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-xs text-[#173D32] dark:text-[#86B59C] hover:underline font-medium"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        className="w-full h-11 pl-3.5 pr-10 bg-white dark:bg-[#111513] border border-[#D4D6CE] dark:border-[#2E3832] rounded-[10px] text-sm text-[#242925] dark:text-white placeholder:text-[#6F756F] focus:border-[#173D32] focus:ring-2 focus:ring-[#173D32]/20 outline-none transition-colors"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#6F756F] hover:text-[#242925] dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Keep me signed in */}
                  <div className="pt-0.5">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-[#D4D6CE] text-[#173D32] focus:ring-[#173D32] accent-[#173D32]"
                      />
                      <span className="text-xs text-[#5E645E] dark:text-[#A0A8A2]">
                        Keep me signed in on this device
                      </span>
                    </label>
                  </div>

                  {/* Primary Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading || !email.trim() || !password}
                      className="w-full h-11 flex items-center justify-center gap-2 rounded-[10px] bg-[#173D32] hover:bg-[#102C24] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign in</span>}
                    </button>
                  </div>
                </form>

                {/* Secondary Registration Link */}
                <div className="pt-3 border-t border-[#E7E7DF] dark:border-[#262E29] text-center text-sm text-[#5E645E] dark:text-[#A0A8A2]">
                  Don&apos;t have an account?{' '}
                  <Link
                    href={redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : '/register'}
                    className="font-semibold text-[#173D32] dark:text-[#86B59C] hover:underline"
                  >
                    Create an account
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ──── Right Column: Restrained Editorial Brand Visual (42%) ──── */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-6">
            <div className="relative w-full aspect-[4/5] max-h-[560px] rounded-[16px] overflow-hidden border border-[#E7E7DF] dark:border-[#262E29] shadow-xs group">
              <Image
                src="/images/auth-bg.png"
                alt="Verified Ghanaian student and residential community"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
                priority
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

              <div className="absolute bottom-0 inset-x-0 p-7 sm:p-8 text-white space-y-2.5">
                <div className="text-[11px] uppercase tracking-widest text-[#A7F3D0] font-semibold">
                  Verified Housing • Accra • Kumasi • Cape Coast
                </div>
                <h3 className="font-editorial text-2xl text-white leading-snug">
                  Trusted homes for students &amp; residents across Ghana
                </h3>
                <p className="text-xs text-white/85 leading-relaxed font-normal max-w-sm">
                  Review room availability, compare transparent GH₵ pricing, and manage your reservations in one calm workspace.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Restrained Footer ── */}
      <footer className="w-full px-6 sm:px-10 lg:px-16 py-4 border-t border-[#E7E7DF] dark:border-[#262E29] flex flex-col sm:flex-row items-center justify-between text-xs text-[#6F756F] dark:text-[#A0A8A2] gap-2">
        <div>&copy; {new Date().getFullYear()} Akwaaba Homes Ghana. All rights reserved.</div>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-[#242925] dark:hover:text-white transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-[#242925] dark:hover:text-white transition-colors">
            Privacy
          </Link>
          <Link href="/support" className="hover:text-[#242925] dark:hover:text-white transition-colors">
            Support
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F7F2] dark:bg-[#111513]" />}>
      <LoginForm />
    </Suspense>
  );
}
