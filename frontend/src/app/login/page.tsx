'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Phone,
  Users,
  Mail,
  Lock,
  MapPin,
} from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';

// ── GOOGLE & MICROSOFT SVG ICONS ──
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022"/>
      <rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00"/>
      <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF"/>
      <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900"/>
    </svg>
  );
}

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
  const [isDark, setIsDark] = useState(false);

  // Check if user is already logged in
  const { data: sessionData } = useQuery({
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
        try { await api.post('/auth/logout'); } catch {}
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
          try { await api.post('/auth/logout'); } catch {}
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
        try { await api.post('/auth/logout'); } catch {}
        localStorage.removeItem('akwaaba_access_token');
        localStorage.removeItem('akwaaba_refresh_token');
        setError('ADMIN_PORTAL_REQUIRED');
        setIsLoading(false);
        return;
      }

      if (response.data?.accessToken) {
        localStorage.setItem('akwaaba_access_token', response.data.accessToken);
        localStorage.setItem('akwaaba_last_active', String(Date.now()));
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
        try { await api.post('/auth/logout'); } catch {}
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
        try { await api.post('/auth/logout'); } catch {}
        localStorage.removeItem('akwaaba_access_token');
        localStorage.removeItem('akwaaba_refresh_token');
        setError('ADMIN_PORTAL_REQUIRED');
        setIsLoading(false);
        return;
      }

      if (response.data?.accessToken) {
        localStorage.setItem('akwaaba_access_token', response.data.accessToken);
        localStorage.setItem('akwaaba_last_active', String(Date.now()));
      }
      if (response.data?.refreshToken) {
        localStorage.setItem('akwaaba_refresh_token', response.data.refreshToken);
      }

      redirectByRole(response.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code. Please try again.');
      setIsLoading(false);
    }
  };

  const TRUST_PILLARS = [
    { icon: ShieldCheck, label: 'Verified Listings', sub: 'Stay safe & secure' },
    { icon: Phone, label: '24/7 Support', sub: "We're always here" },
    { icon: Users, label: 'Trusted Community', sub: 'Live with confidence' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0D100E] font-sans">
      {/* ── TOP BAR ── */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 py-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            <Image
              src="/logo-light.png"
              alt="AkwaabaHomes"
              width={36}
              height={36}
              className="w-full h-full object-contain dark:hidden"
              priority
            />
            <Image
              src="/logo.png"
              alt="AkwaabaHomes"
              width={36}
              height={36}
              className="w-full h-full object-contain hidden dark:block"
              priority
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black text-sm text-[#0F5A3E] dark:text-white tracking-tight">AkwaabaHomes</span>
            <span className="text-[10px] text-[#557A67] dark:text-emerald-600 font-medium">Live Well. Feel at Home.</span>
          </div>
        </Link>

        {/* Light / Dark Toggle Pills */}
        <div className="hidden sm:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-full p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsDark(false);
              document.documentElement.classList.remove('dark');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-transparent shadow-xs text-zinc-900 dark:text-zinc-400 transition cursor-pointer"
          >
            <span className="text-yellow-400">☀</span>
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsDark(true);
              document.documentElement.classList.add('dark');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full dark:bg-zinc-700 dark:text-white text-zinc-400 transition cursor-pointer"
          >
            <span>🌙</span>
            <span>Dark</span>
          </button>
        </div>
      </div>

      {/* ── MAIN SPLIT LAYOUT ── */}
      <div className="flex flex-col lg:flex-row flex-1 min-h-screen">
        {/* ── LEFT: Hero Photo + Text ── */}
        <div className="relative lg:flex-1 min-h-[280px] lg:min-h-screen overflow-hidden">
          {/* Background hero photo */}
          <div className="absolute inset-0">
            <Image
              src="/images/auth/login-hero.jpg"
              alt="Happy resident using AkwaabaHomes app"
              fill
              priority
              className="object-cover object-top"
            />
            {/* Light green overlay tint */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-white/10" />
            {/* Bottom fade to white */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white/80 to-transparent lg:hidden" />
          </div>

          {/* Left Content */}
          <div className="relative z-10 flex flex-col justify-between h-full min-h-[280px] lg:min-h-screen p-8 sm:p-12 pt-20">
            {/* Headline */}
            <div className="space-y-4 mt-4">
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-[#0F5A3E] dark:text-white leading-tight tracking-tight max-w-sm">
                Your Next Home<br />is Just a Sign-In{' '}
                <span className="relative">
                  Away
                  <svg
                    className="absolute -bottom-1 left-0 w-full"
                    height="4"
                    viewBox="0 0 100 4"
                    preserveAspectRatio="none"
                  >
                    <path d="M0 2 Q50 4 100 2" stroke="#16A34A" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                  </svg>
                </span>
              </h1>

              <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-xs">
                Discover verified homes, book with ease, and enjoy a seamless living experience across Ghana.
              </p>

              {/* Trust Pillars */}
              <div className="flex items-start gap-5 flex-wrap pt-2">
                {TRUST_PILLARS.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div key={pillar.label} className="flex flex-col items-center gap-1.5 text-center">
                      <div className="w-9 h-9 rounded-full bg-white/80 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700 shadow-xs flex items-center justify-center text-[#16A34A]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-800 dark:text-white">{pillar.label}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{pillar.sub}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom arch card */}
            <div className="hidden lg:block mt-auto">
              <div className="relative bg-white/10 dark:bg-zinc-900/60 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/30 dark:border-zinc-700 shadow-lg max-w-[260px]">
                <div className="relative h-20 w-full">
                  <Image
                    src="/images/auth/login-arch-photo.jpg"
                    alt="Independence Arch, Accra"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {/* Ghana pill */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/90 dark:bg-zinc-800 rounded-full px-2 py-0.5">
                    <MapPin className="w-2.5 h-2.5 text-[#16A34A]" />
                    <span className="text-[9px] font-bold text-zinc-700 dark:text-zinc-200">Ghana</span>
                  </div>
                </div>
                <div className="px-3.5 py-3">
                  <p className="text-xs font-black text-white leading-snug">
                    More than just a place,<br />it's a better way of living.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Login Form Card ── */}
        <div className="lg:w-[420px] xl:w-[460px] flex items-center justify-center px-6 py-12 lg:py-0 bg-white dark:bg-[#0D100E] relative">
          <div className="w-full max-w-sm space-y-6">

            {/* Session timeout / registered banner */}
            {isTimeout && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs text-amber-800 dark:text-amber-300 font-medium">
                Your session timed out due to inactivity. Please sign in to resume.
              </div>
            )}
            {isRegistered && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                Account created successfully! Sign in to continue.
              </div>
            )}

            {/* ── 2FA VIEW ── */}
            {requireTwoFactor ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-black text-zinc-950 dark:text-white">Two-Factor Auth</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Enter the 6-digit code from your authenticator app.</p>
                </div>

                {error && (
                  <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3 text-xs text-rose-700 dark:text-rose-300 font-medium">
                    {error}
                  </div>
                )}

                <form onSubmit={handle2FASubmit} className="space-y-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isLoading || twoFactorCode.length < 6}
                    className="w-full h-12 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify Code <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => { setRequireTwoFactor(false); setTwoFactorCode(''); }}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
                >
                  ← Go back
                </button>
              </div>
            ) : (
              /* ── MAIN LOGIN FORM ── */
              <div className="space-y-5">
                {/* Header */}
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                    Welcome Back!
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Sign in to continue your AkwaabaHomes journey.
                  </p>
                </div>

                {/* Admin error */}
                {error === 'ADMIN_PORTAL_REQUIRED' && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-xs font-medium text-amber-800 dark:text-amber-300">
                    Administrator accounts must use the{' '}
                    <a href="/admin/login" className="underline font-bold">Admin Portal</a>.
                  </div>
                )}
                {error && error !== 'ADMIN_PORTAL_REQUIRED' && (
                  <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl px-4 py-3 text-xs text-rose-700 dark:text-rose-300 font-medium">
                    {error}
                  </div>
                )}

                {/* Social Sign-In Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL || ''}/auth/google`}
                    className="flex items-center justify-center gap-2 h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs font-semibold transition shadow-2xs cursor-pointer"
                  >
                    <GoogleIcon />
                    <span>Continue with Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL || ''}/auth/microsoft`}
                    className="flex items-center justify-center gap-2 h-11 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs font-semibold transition shadow-2xs cursor-pointer"
                  >
                    <MicrosoftIcon />
                    <span>Continue with Microsoft</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                  <span className="text-xs text-zinc-400 font-medium">or</span>
                  <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                </div>

                {/* Login Form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Email */}
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-white placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A] transition"
                    />
                  </div>

                  {/* Password */}
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-11 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-white placeholder:text-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:border-[#16A34A] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Remember me + Forgot password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-[#16A34A] accent-[#16A34A] cursor-pointer"
                      />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">Remember me</span>
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-[#16A34A] hover:text-[#15803D] transition"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  {/* Sign In Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-70 text-white font-black text-sm flex items-center justify-center gap-2 transition shadow-xs cursor-pointer mt-1"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Create account */}
                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Don't have an account?{' '}
                  <Link
                    href="/register"
                    className="font-bold text-[#16A34A] hover:text-[#15803D] transition"
                  >
                    Create an account
                  </Link>
                </p>

                {/* Ghana Skyline Watermark Footer */}
                <div className="pt-2 -mx-2">
                  <Image
                    src="/images/auth/ghana-skyline.svg"
                    alt="Ghana skyline"
                    width={420}
                    height={80}
                    className="w-full opacity-80"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0D100E]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#16A34A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-400">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
