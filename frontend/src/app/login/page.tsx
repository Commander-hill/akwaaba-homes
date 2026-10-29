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
  Compass,
  ShieldAlert,
  Home,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';
import AlertBanner from '@/components/AlertBanner';
import ThemeToggle from '@/components/ThemeToggle';
import { Button } from '@/components/ui/Button';

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
    if (user.role === 'ADMIN') {
      (async () => {
        try {
          await api.post('/auth/logout');
        } catch {}
        localStorage.removeItem('akwaaba_access_token');
        localStorage.removeItem('akwaaba_refresh_token');
      })();
      setError('ADMIN_PORTAL_REQUIRED');
      return;
    }

    if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
      window.location.href = redirectParam;
      return;
    }

    if (user.role === 'LANDLORD') {
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
      if (sessionData.role === 'ADMIN') {
        (async () => {
          try {
            await api.post('/auth/logout');
          } catch {}
          localStorage.removeItem('akwaaba_access_token');
          localStorage.removeItem('akwaaba_refresh_token');
        })();
        setError('ADMIN_PORTAL_REQUIRED');
      } else {
        redirectByRole(sessionData);
      }
    }
  }, [sessionData, isTimeout]);

  // 2FA State
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please provide both your email address and password.');
      return;
    }

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

      if (response.data?.user?.role === 'ADMIN') {
        try {
          await api.post('/auth/logout');
        } catch {}
        localStorage.removeItem('akwaaba_access_token');
        localStorage.removeItem('akwaaba_refresh_token');
        setError('ADMIN_PORTAL_REQUIRED');
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
      if (
        err.response?.data?.code === 'ADMIN_PORTAL_REQUIRED' ||
        err.response?.data?.message?.includes('Administrator accounts cannot sign in')
      ) {
        try {
          await api.post('/auth/logout');
        } catch {}
        localStorage.removeItem('akwaaba_access_token');
        localStorage.removeItem('akwaaba_refresh_token');
        setError('ADMIN_PORTAL_REQUIRED');
      } else {
        setError(err.response?.data?.message || 'Invalid email or password.');
      }
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

      if (response.data?.user?.role === 'ADMIN') {
        try {
          await api.post('/auth/logout');
        } catch {}
        localStorage.removeItem('akwaaba_access_token');
        localStorage.removeItem('akwaaba_refresh_token');
        setError('ADMIN_PORTAL_REQUIRED');
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
      if (
        err.response?.data?.code === 'ADMIN_PORTAL_REQUIRED' ||
        err.response?.data?.message?.includes('Administrator accounts cannot sign in')
      ) {
        try {
          await api.post('/auth/logout');
        } catch {}
        localStorage.removeItem('akwaaba_access_token');
        localStorage.removeItem('akwaaba_refresh_token');
        setError('ADMIN_PORTAL_REQUIRED');
      } else {
        setError(err.response?.data?.message || 'Invalid 2FA code or recovery code.');
      }
      setIsLoading(false);
    }
  };

  // Active session loading spinner
  if (isCheckingAuth && typeof window !== 'undefined' && localStorage.getItem('akwaaba_access_token') && !isTimeout) {
    return (
      <div className="-mt-16 -mb-16 md:mb-0 min-h-screen flex flex-col items-center justify-center bg-[#F8F7F2] dark:bg-[#111513] text-[#242925] dark:text-[#F4F5F2] p-6 space-y-4">
        <Loader2 className="w-7 h-7 animate-spin text-[#0F5132] dark:text-emerald-400" />
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Verifying session...</p>
      </div>
    );
  }

  // Active session already verified
  if (sessionData && sessionData.role !== 'ADMIN' && !isTimeout) {
    const roleTitle =
      sessionData.role === 'LANDLORD'
        ? 'Landlord Dashboard'
        : sessionData.role === 'CARETAKER' || sessionData.role === 'STAFF'
        ? 'Operations Hub'
        : 'Tenant Dashboard';

    return (
      <div className="-mt-16 -mb-16 md:mb-0 min-h-screen flex items-center justify-center bg-white dark:bg-[#0E1210] text-zinc-950 dark:text-white p-6">
        <div className="w-full max-w-md bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-6 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Active Session Detected</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              You are signed in as{' '}
              <span className="font-bold text-zinc-950 dark:text-white">
                {sessionData.firstName || sessionData.email}
              </span>
              .
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => redirectByRole(sessionData)}
              className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
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
              className="w-full h-11 inline-flex items-center justify-center border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-200 rounded-xl transition cursor-pointer"
            >
              Sign out &amp; switch account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mt-16 -mb-16 md:mb-0 min-h-screen w-full flex bg-white dark:bg-[#0E1210] text-zinc-950 dark:text-zinc-100 antialiased overflow-hidden">
      
      {/* ──── LEFT COLUMN: BRAND VISUAL HERO (70% Desktop, Full Bleed Landscape) ──── */}
      <div className="relative hidden lg:block flex-1 min-h-screen lg:h-screen overflow-hidden">
        <Image
          src="/images/auth-student-landscape.jpg"
          alt="Happy verified Ghanaian resident enjoying modern residential community"
          fill
          sizes="70vw"
          className="object-cover object-center transform hover:scale-[1.01] transition-transform duration-1000 ease-out"
          priority
        />

        {/* Cinematic Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/20" />

        {/* Top-Left Floating Explore Action */}
        <div className="absolute top-8 left-8 z-20">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold transition shadow-xs cursor-pointer group"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400 group-hover:rotate-45 transition-transform" />
            <span>Explore homes</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Bottom Overlay Content (matching the user's design) */}
        <div className="absolute bottom-0 inset-x-0 p-10 xl:p-14 text-white space-y-4 z-10 max-w-2xl">
          {/* Green accent line */}
          <div className="w-12 h-1 rounded-full bg-[#16A34A]" />

          <div className="space-y-2">
            <h2 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight">
              Welcome Back
            </h2>
            <p className="text-xs sm:text-sm text-zinc-200/90 leading-relaxed max-w-lg font-normal">
              Sign in to access your bookings, saved properties, and more.
            </p>
          </div>

          {/* Trust Markers */}
          <div className="pt-2 flex flex-wrap items-center gap-6 text-xs text-zinc-200 font-medium">
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <Home className="w-3.5 h-3.5" />
              </span>
              <span>Trusted Listings</span>
            </span>

            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
              <span>Secure Transactions</span>
            </span>

            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span>Ghana&apos;s Best Homes</span>
            </span>
          </div>
        </div>
      </div>

      {/* ──── RIGHT COLUMN: SIGN-IN FORM (30% Desktop, 100% Mobile) ──── */}
      <div className="w-full lg:w-[30%] min-h-screen lg:h-screen lg:overflow-y-auto flex flex-col justify-between p-6 sm:p-8 lg:p-8 xl:p-10 bg-white dark:bg-[#0E1210] lg:border-l border-zinc-200/80 dark:border-zinc-800/80 relative z-10 shrink-0">
        
        {/* Top Header: Brand + Theme Toggle */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="Akwaaba Homes"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-zinc-950 dark:text-white leading-none">
                Akwaaba<span className="text-[#0F5132] dark:text-emerald-400">Homes</span>
              </span>
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide mt-0.5">
                Trusted Ghanaian Housing
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/search"
              className="lg:hidden inline-flex items-center gap-1 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
            >
              <span>Explore</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Center: Authentication Form Container */}
        <div className="w-full max-w-sm mx-auto my-auto py-8">
          
          {/* Header Title & Subtitle */}
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-[#0F5132] dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-2.5">
              Welcome Back
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1.5">
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

          {error === 'ADMIN_PORTAL_REQUIRED' ? (
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 dark:border-amber-700/40 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Administrator Access Restricted
                  </h3>
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    Administrator accounts are barred from signing in through the public tenant and landlord portal. For system security and regulatory audit compliance, administrative access requires the dedicated security gateway.
                  </p>
                </div>
              </div>
              <div className="pt-1">
                <Link
                  href="/admin/login"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <span>Open Admin Login Gateway</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : error ? (
            <AlertBanner
              type="error"
              message={error}
              className="mb-5"
            />
          ) : null}

          {/* Two-Factor Verification Challenge */}
          {requireTwoFactor ? (
            <form onSubmit={handle2FASubmit} className="space-y-5 animate-in fade-in">
              <div className="space-y-1 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
                  Two-Factor Authentication
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {useRecoveryCode
                    ? 'Enter your 8-character emergency recovery code.'
                    : 'Enter the 6-digit code from your authenticator app.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {useRecoveryCode ? 'Emergency recovery key' : '6-digit verification code'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={useRecoveryCode ? 10 : 6}
                  autoFocus
                  className="w-full h-12 px-3.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-center text-xl font-mono font-bold tracking-widest text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-900 focus:border-[#0F5132] focus:ring-4 focus:ring-[#0F5132]/10 outline-none transition"
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
                  className="text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline cursor-pointer font-bold"
                >
                  {useRecoveryCode ? 'Use 6-digit authenticator code' : 'Lost device? Use emergency recovery key'}
                </button>
              </div>

              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  variant="emerald"
                  size="sm"
                  isLoading={isLoading}
                  disabled={isLoading || !twoFactorCode.trim()}
                  className="w-full"
                >
                  Verify and continue
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setRequireTwoFactor(false);
                    setTwoFactorCode('');
                    setError('');
                  }}
                  className="w-full text-center text-xs font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-white cursor-pointer py-1"
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
                    className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                  >
                    Email address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full h-11 px-3.5 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-900 focus:border-[#0F5132] focus:ring-4 focus:ring-[#0F5132]/10 outline-none transition"
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
                      className="block text-xs font-bold text-zinc-700 dark:text-zinc-300"
                    >
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline font-bold"
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
                      className="w-full h-11 pl-3.5 pr-10 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-900 focus:border-[#16A34A] focus:ring-4 focus:ring-[#16A34A]/10 outline-none transition"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
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
                      className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-[#16A34A] focus:ring-[#16A34A] accent-[#16A34A] cursor-pointer"
                    />
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                      Keep me signed in on this device
                    </span>
                  </label>
                </div>

                {/* Primary Submit Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="emerald"
                    size="sm"
                    isLoading={isLoading}
                    className="w-full"
                  >
                    Sign in
                  </Button>
                </div>
              </form>

              {/* Secondary Registration Link */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center text-xs text-zinc-500 dark:text-zinc-400">
                Don&apos;t have an account?{' '}
                <Link
                  href={redirectParam ? `/register?redirect=${encodeURIComponent(redirectParam)}` : '/register'}
                  className="font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline"
                >
                  Create an account
                </Link>
              </div>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="-mt-16 -mb-16 md:mb-0 min-h-screen bg-white dark:bg-[#0E1210]" />}>
      <LoginForm />
    </Suspense>
  );
}
