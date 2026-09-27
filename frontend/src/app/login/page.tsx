'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Building2,
  GraduationCap,
  Key,
  ChevronRight
} from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';

type Persona = 'TENANT' | 'LANDLORD';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTimeout = searchParams.get('reason') === 'timeout';
  
  const [persona, setPersona] = useState<Persona>('TENANT');
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

  // Active session loading spinner
  if (isCheckingAuth && typeof window !== 'undefined' && localStorage.getItem('akwaaba_access_token') && !isTimeout) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center bg-[#FAFAF9] dark:bg-[#090C0E] text-zinc-900 dark:text-zinc-100 p-6 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        <p className="text-xs font-mono tracking-widest uppercase text-zinc-400">Verifying Active Session</p>
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
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-[#FAFAF9] dark:bg-[#090C0E] text-zinc-900 dark:text-zinc-100 p-4 sm:p-6">
        <div className="w-full max-w-md bg-white dark:bg-[#11161B] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 text-center space-y-6 shadow-xl shadow-zinc-950/5 relative overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-[#0F5132] absolute top-0 left-0" />
          
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-[#0F5132] dark:text-emerald-400">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white">Active Session Detected</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Welcome back, <span className="font-semibold text-zinc-800 dark:text-zinc-200">{sessionData.firstName || sessionData.email}</span>. You are logged in as{' '}
              <span className="font-mono text-xs uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold">{sessionData.role}</span>.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => redirectByRole(sessionData)}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer"
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
              className="w-full inline-flex items-center justify-center px-5 py-3 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 rounded-xl transition-colors cursor-pointer"
            >
              Sign out &amp; switch account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden bg-[#FAFAF9] dark:bg-[#090C0E] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-emerald-100 selection:text-emerald-950">
      
      {/* ── Ambient Radial Atmosphere ── */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-emerald-500/10 via-emerald-600/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[600px] h-[260px] bg-emerald-950/20 rounded-full blur-3xl pointer-events-none" />

      {/* ── Main Centered Card Container ── */}
      <div className="w-full max-w-[460px] mx-auto relative z-10 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Card Surface */}
        <div className="bg-white/95 dark:bg-[#11161B]/95 backdrop-blur-xl border border-zinc-200/90 dark:border-zinc-800/90 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.06)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] p-6 sm:p-9 relative overflow-hidden">
          
          {/* Top Hairline Emerald Accent */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-[#0F5132] absolute top-0 left-0" />

          {/* Header Monogram & Title */}
          <div className="text-center space-y-3 mb-6">
            <Link href="/" className="inline-block group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-900 via-[#0F5132] to-[#072417] p-2 shadow-md flex items-center justify-center mx-auto border border-emerald-500/30 group-hover:scale-105 transition-transform duration-200">
                <Image
                  src="/logo.png"
                  alt="Akwaaba Homes"
                  width={36}
                  height={36}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </Link>
            
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
                Welcome back
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {persona === 'TENANT' 
                  ? 'Access your verified tenancy, escrow keys & hostel passes'
                  : 'Manage properties, rent disbursements & caretaker operations'}
              </p>
            </div>
          </div>

          {/* Persona Segmented Switcher */}
          {!requireTwoFactor && (
            <div className="mb-6 p-1 bg-zinc-100 dark:bg-zinc-900/80 rounded-2xl grid grid-cols-2 gap-1 border border-zinc-200/70 dark:border-zinc-800/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPersona('TENANT')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl transition-all cursor-pointer ${
                  persona === 'TENANT'
                    ? 'bg-white dark:bg-[#161C23] text-zinc-950 dark:text-white shadow-xs border border-zinc-200/50 dark:border-zinc-700/50 font-bold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <GraduationCap className={`w-3.5 h-3.5 ${persona === 'TENANT' ? 'text-[#0F5132] dark:text-emerald-400' : ''}`} />
                <span>Tenant &amp; Student</span>
              </button>

              <button
                type="button"
                onClick={() => setPersona('LANDLORD')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl transition-all cursor-pointer ${
                  persona === 'LANDLORD'
                    ? 'bg-white dark:bg-[#161C23] text-zinc-950 dark:text-white shadow-xs border border-zinc-200/50 dark:border-zinc-700/50 font-bold'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                <Building2 className={`w-3.5 h-3.5 ${persona === 'LANDLORD' ? 'text-[#0F5132] dark:text-emerald-400' : ''}`} />
                <span>Landlord &amp; Partner</span>
              </button>
            </div>
          )}

          {/* Session Inactivity Timeout Banner */}
          {isTimeout && (
            <div className="mb-5 border-l-2 border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 pl-3.5 pr-3 py-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 rounded-r-xl">
              <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <div className="font-semibold text-[11.5px]">Session Expired</div>
                <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                  Safely closed due to inactivity. Please sign in to resume.
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className={`mb-5 border-l-2 ${
              error.includes('warming up') 
                ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200' 
                : 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200'
            } pl-3.5 pr-3 py-2.5 text-xs flex items-start gap-2.5 transition-all rounded-r-xl`}>
              <Lock className={`w-4 h-4 shrink-0 mt-0.5 ${
                error.includes('warming up') ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
              }`} />
              <div className="space-y-0.5">
                <div className="font-semibold uppercase tracking-wider text-[10.5px]">
                  {error.includes('warming up') ? 'Database Initializing' : 'Authentication Notice'}
                </div>
                <div className="text-[11px] leading-relaxed opacity-95">{error}</div>
              </div>
            </div>
          )}

          {/* Form Content */}
          {requireTwoFactor ? (
            /* 2FA Challenge Form */
            <form onSubmit={handle2FASubmit} className="space-y-5">
              <div className="border-b border-zinc-100 dark:border-zinc-800/80 pb-4 space-y-1">
                <div className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Two-Factor Verification Required
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {useRecoveryCode
                    ? 'Enter an unused 8-character recovery code (e.g. XXXX-XXXX).'
                    : 'Enter the 6-digit code from Google Authenticator, Authy, or Microsoft Authenticator.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400 font-semibold">
                  {useRecoveryCode ? 'Emergency Recovery Key' : '6-Digit Security Token'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-zinc-400" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={useRecoveryCode ? 10 : 6}
                    autoFocus
                    className="block w-full pl-10 pr-3.5 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:bg-white dark:focus:bg-black focus:border-[#0F5132] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0F5132]/15 outline-none transition-all"
                    placeholder={useRecoveryCode ? 'XXXX-XXXX' : '000000'}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setUseRecoveryCode(!useRecoveryCode);
                    setTwoFactorCode('');
                    setError('');
                  }}
                  className="text-[11px] font-semibold text-[#0F5132] dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {useRecoveryCode ? 'Use 6-digit authenticator code' : 'Lost device? Use emergency recovery key'}
                </button>
              </div>

              <div className="space-y-2.5 pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !twoFactorCode.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-white bg-[#0F5132] hover:bg-[#0A3D24] text-xs font-semibold uppercase tracking-wider focus:outline-none transition-colors shadow-xs active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Verify &amp; Enter Portal <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRequireTwoFactor(false);
                    setTwoFactorCode('');
                    setError('');
                  }}
                  className="w-full text-center text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium cursor-pointer py-1"
                >
                  &larr; Back to email and password
                </button>
              </div>
            </form>
          ) : (
            /* Standard Email/Password Login Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-zinc-400" />
                  </div>
                  <input 
                    type="email" 
                    required 
                    autoComplete="email"
                    className="block w-full pl-10 pr-3.5 py-3 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-black focus:border-[#0F5132] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0F5132]/15 outline-none transition-all" 
                    placeholder={persona === 'TENANT' ? 'student@st.ug.edu.gh or personal@email.com' : 'landlord@estate.com.gh or personal@email.com'} 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Password
                  </label>
                  <Link 
                    href="/forgot-password" 
                    className="text-[11px] font-semibold text-[#0F5132] dark:text-emerald-400 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-zinc-400" />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required 
                    autoComplete="current-password"
                    className="block w-full pl-10 pr-10 py-3 bg-zinc-50/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-black focus:border-[#0F5132] dark:focus:border-emerald-500 focus:ring-2 focus:ring-[#0F5132]/15 outline-none transition-all" 
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
              <div className="flex items-center justify-between pt-0.5">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    id="remember-me" 
                    name="remember-me" 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-[#0F5132] focus:ring-[#0F5132] accent-[#0F5132]" 
                  />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                    Keep me signed in on this device
                  </span>
                </label>
              </div>

              {/* Primary Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl text-white bg-gradient-to-b from-[#146c43] to-[#0F5132] hover:from-[#0F5132] hover:to-[#0A3D24] text-xs font-semibold uppercase tracking-wider focus:outline-none transition-all shadow-xs active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Sign in as {persona === 'TENANT' ? 'Tenant' : 'Landlord'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
              
            </form>
          )}

          {/* Switch to Registration */}
          <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>New to AkwaabaHomes?</span>
            <Link 
              href="/register" 
              className="inline-flex items-center gap-1 font-semibold text-[#0F5132] dark:text-emerald-400 hover:underline"
            >
              <span>Create an account</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

        </div>

        {/* Anchored Trust Footnote */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-zinc-400 dark:text-zinc-500">
          <div className="inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
            <span>256-Bit SSL Encrypted</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">•</span>
          <div className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
            <span>Paystack Escrow Protected</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline">•</span>
          <div className="inline-flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
            <span>Digital Keycard Ready</span>
          </div>
        </div>

      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFAF9] dark:bg-[#090C0E]" />}>
      <LoginForm />
    </Suspense>
  );
}
