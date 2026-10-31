'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Sun,
  Moon,
  ShieldCheck,
  Headphones,
  Users,
  MapPin,
} from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';

// ── BRAND SVG ICONS ──
function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
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
  const [isDarkMode, setIsDarkMode] = useState(false);

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
      setError('Please enter both your email address and password.');
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

  const toggleTheme = (dark: boolean) => {
    setIsDarkMode(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // ── FORM INTERIOR COMPONENT ──
  const renderCardForm = () => (
    <div className="flex flex-col h-full justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-2">
      {/* Top section: Title, Subtitle, SSO, Inputs */}
      <div className="space-y-3.5">
        {/* Header */}
        <div>
          <h2 className="text-xl sm:text-2xl xl:text-[26px] font-black text-[#0D3827] dark:text-white tracking-tight leading-tight">
            Welcome Back!
          </h2>
          <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Sign in to continue your AkwaabaHomes journey.
          </p>
        </div>

        {/* Status / Alert Banners */}
        {isTimeout && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
            Session timed out. Please sign in again.
          </div>
        )}
        {isRegistered && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-1.5 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
            Account created! Sign in to continue.
          </div>
        )}
        {error === 'ADMIN_PORTAL_REQUIRED' && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-1.5 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
            Admin accounts must use the{' '}
            <a href="/admin/login" className="underline font-bold">Admin Portal</a>.
          </div>
        )}
        {error && error !== 'ADMIN_PORTAL_REQUIRED' && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg px-3 py-1.5 text-[11px] text-rose-700 dark:text-rose-300 font-medium">
            {error}
          </div>
        )}

        {/* 2FA Mode */}
        {requireTwoFactor ? (
          <form onSubmit={handle2FASubmit} className="space-y-3 pt-1">
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Enter 6-digit authenticator code:
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full h-11 px-3 text-center text-lg font-mono tracking-widest rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
              autoFocus
            />
            <button
              type="submit"
              disabled={isLoading || twoFactorCode.length < 6}
              className="w-full h-10 rounded-full bg-[#0F6848] hover:bg-[#0B543A] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify Code <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
            <button
              type="button"
              onClick={() => { setRequireTwoFactor(false); setTwoFactorCode(''); }}
              className="w-full text-center text-[11px] text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
            >
              ← Cancel
            </button>
          </form>
        ) : (
          <>
            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL || ''}/auth/google`}
                className="flex items-center justify-center gap-1.5 h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 text-[11px] font-semibold transition cursor-pointer shadow-2xs"
              >
                <GoogleIcon />
                <span className="truncate">Continue with Google</span>
              </button>

              <button
                type="button"
                onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_URL || ''}/auth/microsoft`}
                className="flex items-center justify-center gap-1.5 h-9 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-100 text-[11px] font-semibold transition cursor-pointer shadow-2xs"
              >
                <MicrosoftIcon />
                <span className="truncate">Continue with Microsoft</span>
              </button>
            </div>

            {/* "or" Divider */}
            <div className="flex items-center gap-2.5 py-0.5">
              <div className="flex-1 h-px bg-zinc-200/80 dark:bg-zinc-700" />
              <span className="text-[10px] text-zinc-400 font-medium lowercase">or</span>
              <div className="flex-1 h-px bg-zinc-200/80 dark:bg-zinc-700" />
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {/* Email Address */}
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1.5 focus:ring-[#16A34A] focus:border-[#16A34A] transition"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-10 pl-9 pr-10 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/60 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1.5 focus:ring-[#16A34A] focus:border-[#16A34A] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-0.5"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Remember Me + Forgot Password */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-zinc-300 dark:border-zinc-600 text-[#16A34A] accent-[#16A34A] cursor-pointer"
                  />
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">Remember me</span>
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-[#16A34A] hover:text-[#15803D] transition"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 rounded-full bg-[#0F6848] hover:bg-[#0B543A] disabled:opacity-70 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer mt-1"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            {/* Create Account Link */}
            <p className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 pt-0.5">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="font-bold text-[#16A34A] hover:text-[#15803D] transition"
              >
                Create an account
              </Link>
            </p>
          </>
        )}
      </div>

      {/* Card Bottom: Accra Skyline Illustration */}
      <div className="pt-2 -mx-6 -mb-2 overflow-hidden pointer-events-none select-none">
        <Image
          src="/images/auth/login-skyline-exact.png"
          alt="Accra Ghana Skyline"
          width={340}
          height={65}
          className="w-full object-cover opacity-90"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FAF9F5] dark:bg-[#0D100E] font-sans overflow-x-hidden">

      {/* ────────────────────────────────────────────────────────────────
          DESKTOP VIEW (16:9 Widescreen Pixel-Perfect Presentation)
          Visible on lg: (1024px and wider screens)
         ──────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex w-full min-h-screen items-center justify-center p-2 xl:p-4">
        <div className="relative w-full max-w-[1536px] aspect-[16/9] shadow-2xl rounded-2xl overflow-hidden bg-white dark:bg-[#0D100E]">

          {/* 1. Base 2K Background Scene (Woman on couch, building, left text, waves) */}
          <Image
            src="/images/auth/login-hero-2k.jpg"
            alt="AkwaabaHomes Sign In"
            fill
            priority
            className="object-cover object-center pointer-events-none select-none"
          />

          {/* 2. Interactive Logo Link Overlay (top-left) */}
          <Link
            href="/"
            title="AkwaabaHomes Home"
            className="absolute rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16A34A]"
            style={{
              left: '4.39%',
              top: '4.86%',
              width: '18.55%',
              height: '7.64%',
            }}
          />

          {/* 3. Interactive Light / Dark Toggle Overlay (top-right) */}
          <div
            className="absolute flex items-center bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xs rounded-full p-0.5 shadow-xs border border-zinc-200/60 dark:border-zinc-700 z-20 text-[11px] font-semibold"
            style={{
              left: '87.5%',
              top: '4.34%',
              height: '5.21%',
            }}
          >
            <button
              type="button"
              onClick={() => toggleTheme(false)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full transition cursor-pointer ${
                !isDarkMode
                  ? 'bg-white shadow-2xs text-zinc-900 font-bold'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => toggleTheme(true)}
              className={`flex items-center gap-1 px-3 py-1 rounded-full transition cursor-pointer ${
                isDarkMode
                  ? 'bg-zinc-800 shadow-2xs text-white font-bold'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <Moon className="w-3 h-3 text-zinc-400" />
              <span>Dark</span>
            </button>
          </div>

          {/* 4. Interactive Bottom-Left Arch Card Link */}
          <Link
            href="/properties"
            title="Explore Ghana accommodations"
            className="absolute rounded-2xl focus:outline-none focus:ring-2 focus:ring-white/50"
            style={{
              left: '2.73%',
              top: '77.78%',
              width: '30.08%',
              height: '16.84%',
            }}
          />

          {/* 5. Real Interactive Floating Login Card (matches exact coordinates) */}
          <div
            className="absolute bg-white dark:bg-[#141A17] rounded-[24px] xl:rounded-[30px] shadow-2xl border border-gray-100/90 dark:border-zinc-800 z-20 overflow-hidden"
            style={{
              left: '65.23%',
              top: '13.19%',
              width: '31.84%',
              height: '81.94%',
            }}
          >
            {renderCardForm()}
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          MOBILE / TABLET RESPONSIVE VIEW (< 1024px)
          Provides beautiful full scrolling experience on phones/tablets
         ──────────────────────────────────────────────────────────────── */}
      <div className="lg:hidden flex flex-col w-full min-h-screen bg-white dark:bg-[#0D100E]">
        {/* Mobile Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo-light.png"
              alt="AkwaabaHomes"
              width={32}
              height={32}
              className="dark:hidden"
            />
            <Image
              src="/logo.png"
              alt="AkwaabaHomes"
              width={32}
              height={32}
              className="hidden dark:block"
            />
            <div className="flex flex-col">
              <span className="font-black text-sm text-[#0F5A3E] dark:text-white">AkwaabaHomes</span>
              <span className="text-[9px] text-[#557A67] dark:text-emerald-500">Live Well. Feel at Home.</span>
            </div>
          </Link>

          {/* Mobile Theme Toggle */}
          <button
            type="button"
            onClick={() => toggleTheme(!isDarkMode)}
            className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile Hero Banner */}
        <div className="relative h-56 w-full overflow-hidden">
          <Image
            src="/images/auth/login-hero-woman.jpg"
            alt="AkwaabaHomes Resident"
            fill
            priority
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <h1 className="text-lg font-black leading-tight">
              Your Next Home is Just a Sign-In Away
            </h1>
            <p className="text-[11px] text-white/80 mt-0.5">
              Discover verified homes across Ghana.
            </p>
          </div>
        </div>

        {/* Mobile Card Form */}
        <div className="flex-1 px-4 py-6">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-lg overflow-hidden">
            {renderCardForm()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9F5] dark:bg-[#0D100E]">
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
