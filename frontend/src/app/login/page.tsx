'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Loader2,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AlertBanner from '@/components/AlertBanner';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTimeout = searchParams.get('reason') === 'timeout';

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
        code: twoFactorCode.trim()
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

  const handleGoogleSignIn = () => {
    toast('Google sign-in is being enabled for your region. Please sign in with your email and password.', {
      icon: 'ℹ️',
      duration: 4000,
    });
  };

  // Active session loading spinner
  if (isCheckingAuth && typeof window !== 'undefined' && localStorage.getItem('akwaaba_access_token') && !isTimeout) {
    return (
      <div className="-mt-18 md:-mt-20 min-h-screen flex flex-col items-center justify-center bg-[#FBFBF9] dark:bg-[#0D0F12] text-zinc-900 dark:text-zinc-100 p-6 space-y-4">
        <Loader2 className="w-7 h-7 animate-spin text-[#0F5132] dark:text-emerald-500" />
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Verifying session...</p>
      </div>
    );
  }

  // Active session already verified
  if (sessionData && !isTimeout) {
    const roleTitle = sessionData.role === 'LANDLORD' 
      ? 'Landlord Dashboard' 
      : sessionData.role === 'ADMIN' 
      ? 'Admin Hub' 
      : (sessionData.role === 'CARETAKER' || sessionData.role === 'STAFF')
      ? 'Operations Hub' 
      : 'Tenant Dashboard';

    return (
      <div className="-mt-18 md:-mt-20 min-h-screen flex items-center justify-center bg-[#FBFBF9] dark:bg-[#0D0F12] text-zinc-900 dark:text-zinc-100 p-6">
        <div className="w-full max-w-md bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-5 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200/60 dark:border-emerald-800/60">
            <CheckCircle2 className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Active Session Detected</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              You are signed in as <span className="font-semibold text-zinc-800 dark:text-zinc-200">{sessionData.firstName || sessionData.email}</span>.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => redirectByRole(sessionData)}
              className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              <span>Continue to {roleTitle}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={async () => {
                try {
                  await api.post('/auth/logout');
                } catch (e) {}
                localStorage.removeItem('akwaaba_access_token');
                localStorage.removeItem('akwaaba_refresh_token');
                window.location.reload();
              }}
              className="w-full h-11 inline-flex items-center justify-center border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-xs font-semibold text-zinc-600 dark:text-zinc-400 rounded-xl transition-colors cursor-pointer"
            >
              Sign out &amp; switch account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mt-18 md:-mt-20 min-h-screen flex flex-col justify-between bg-[#FBFBF9] dark:bg-[#0D0F12] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-emerald-100 selection:text-emerald-950">
      
      {/* ── Minimal Purpose-Built Header ── */}
      <header className="w-full px-6 sm:px-10 lg:px-16 py-5 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#0F5132] flex items-center justify-center shadow-xs">
            <Image
              src="/logo.png"
              alt="AkwabaHomes"
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

        <Link 
          href="/properties" 
          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
        >
          Explore accommodations &rarr;
        </Link>
      </header>

      {/* ── Main Asymmetric Workspace ── */}
      <main className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-16 py-10 sm:py-14">
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-20 items-center">
          
          {/* ──── Left Column: Dominant Authentication Form (58%) ──── */}
          <div className="lg:col-span-7 xl:col-span-6 w-full max-w-md mx-auto lg:mx-0">
            
            {/* Title & Editorial Framing with Centered Akwaaba Logo */}
            <div className="flex flex-col items-center text-center mb-7">
              <Link href="/" className="mb-3.5 inline-flex items-center justify-center group" title="AkwaabaHomes">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500 to-[#0F5132] border border-emerald-400/40 flex items-center justify-center shadow-md p-1.5 group-hover:scale-105 transition-transform ring-4 ring-emerald-500/10 dark:ring-emerald-500/20">
                  <Image
                    src="/logo.png"
                    alt="AkwaabaHomes Logo"
                    width={36}
                    height={36}
                    className="w-full h-full object-contain"
                    priority
                  />
                </div>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Sign in to your account
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1.5 max-w-sm">
                Enter your details to access your tenancy ledger, hostel bookings, or property management desk.
              </p>
            </div>

            {/* Inactivity Timeout Notice */}
            {isTimeout && (
              <AlertBanner
                type="warning"
                message="Your session timed out due to inactivity. Please sign in to resume."
                className="mb-5"
              />
            )}

            {/* Error Notice */}
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
                <div className="space-y-1 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                    Two-Factor Authentication
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {useRecoveryCode
                      ? 'Enter your 8-character emergency recovery code.'
                      : 'Enter the 6-digit code from your authenticator app.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {useRecoveryCode ? 'Emergency recovery key' : '6-digit verification code'}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={useRecoveryCode ? 10 : 6}
                    autoFocus
                    className="w-full h-11 px-3.5 bg-white dark:bg-[#14181E] border border-zinc-300 dark:border-zinc-700 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:border-[#0F5132] focus:ring-1 focus:ring-[#0F5132] outline-none transition-colors"
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
                    className="text-[#0F5132] dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    {useRecoveryCode ? 'Use 6-digit authenticator code' : 'Lost device? Use emergency recovery key'}
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || !twoFactorCode.trim()}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer"
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
                    className="w-full text-center text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer py-1"
                  >
                    &larr; Back to sign in
                  </button>
                </div>
              </form>
            ) : (
              /* Standard Sign-In Form */
              <div className="space-y-5">
                
                {/* Optional Clean Google Sign-in */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full h-11 flex items-center justify-center gap-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#14181E] text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-2xs cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Subtle Divider */}
                <div className="relative flex items-center justify-center my-4">
                  <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                  <span className="absolute bg-[#FBFBF9] dark:bg-[#0D0F12] px-3 text-[11px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    or continue with email
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      Email address
                    </label>
                    <input 
                      type="email" 
                      required 
                      autoComplete="email"
                      className="w-full h-11 px-3.5 bg-white dark:bg-[#14181E] border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-normal text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-[#0F5132] focus:ring-1 focus:ring-[#0F5132] outline-none transition-colors" 
                      placeholder="e.g. kwame@st.ug.edu.gh or personal@email.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                    />
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        Password
                      </label>
                      <Link 
                        href="/forgot-password" 
                        className="text-xs text-[#0F5132] dark:text-emerald-400 hover:underline font-medium"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        required 
                        autoComplete="current-password"
                        className="w-full h-11 pl-3.5 pr-10 bg-white dark:bg-[#14181E] border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-normal text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-[#0F5132] focus:ring-1 focus:ring-[#0F5132] outline-none transition-colors" 
                        placeholder="••••••••••••" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
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
                        className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-[#0F5132] focus:ring-[#0F5132] accent-[#0F5132]" 
                      />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        Keep me signed in on this device
                      </span>
                    </label>
                  </div>

                  {/* Primary Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-60 cursor-pointer shadow-xs"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span>Sign in</span>
                      )}
                    </button>
                  </div>

                </form>

                {/* Secondary Registration Link */}
                <div className="pt-3 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Don&apos;t have an account?{' '}
                  <Link 
                    href="/register" 
                    className="font-semibold text-[#0F5132] dark:text-emerald-400 hover:underline"
                  >
                    Create an account
                  </Link>
                </div>

              </div>
            )}

          </div>

          {/* ──── Right Column: Restrained Editorial Brand Visual (42%) ──── */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-6">
            <div className="relative w-full aspect-[4/5] max-h-[580px] rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs group">
              
              {/* Authentic Ghanaian Student & Residential Complex Photo */}
              <Image
                src="/images/auth-bg.png"
                alt="Nkrumah Residence Ghanaian student and apartment community"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                priority
              />

              {/* Gentle Vignette Gradient for Legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

              {/* Editorial Caption Card */}
              <div className="absolute bottom-0 inset-x-0 p-6 sm:p-8 text-white space-y-2">
                <div className="text-[10px] uppercase font-mono tracking-widest text-emerald-300 font-semibold">
                  Verified Housing // Accra • Kumasi • Cape Coast
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white leading-snug">
                  Nkrumah Residence &amp; Executive Suites
                </h3>
                <p className="text-xs text-zinc-200/80 leading-relaxed font-normal max-w-sm">
                  Verified student hostels and residential tenancies with transparent terms, escrow protection, and direct landlord connections.
                </p>
                <div className="pt-2 flex items-center gap-2 text-[11px] text-zinc-300/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Ayeduase Hub • KNUST &amp; Legon Campus Portals</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ── Restrained Footer ── */}
      <footer className="w-full px-6 sm:px-10 lg:px-16 py-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 gap-2">
        <div>
          &copy; {new Date().getFullYear()} AkwaabaHomes Ghana. All rights reserved.
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="-mt-18 md:-mt-20 min-h-screen bg-[#FBFBF9] dark:bg-[#0D0F12]" />}>
      <LoginForm />
    </Suspense>
  );
}
