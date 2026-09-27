'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Building2,
  Sparkles,
  Check,
  Radio,
  GraduationCap,
  QrCode,
  Wifi
} from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';

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

  if (isCheckingAuth && typeof window !== 'undefined' && localStorage.getItem('akwaaba_access_token') && !isTimeout) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0B0D12] text-zinc-900 dark:text-zinc-100 p-6 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        <p className="text-xs font-mono tracking-widest uppercase text-zinc-400">Verifying Active Session</p>
      </div>
    );
  }

  if (sessionData && !isTimeout) {
    const roleTitle = sessionData.role === 'LANDLORD' 
      ? 'Landlord Dashboard' 
      : sessionData.role === 'ADMIN' 
      ? 'Admin Hub' 
      : (sessionData.role === 'CARETAKER' || sessionData.role === 'STAFF')
      ? 'Operations Hub' 
      : 'Tenant Dashboard';

    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0B0D12] text-zinc-900 dark:text-zinc-100 p-6 sm:p-12">
        <div className="w-full max-w-lg space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Session Detected
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-light tracking-tight text-zinc-900 dark:text-white">
              Welcome back, <span className="font-semibold">{sessionData.firstName || sessionData.email}</span>
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              You are currently authenticated as <span className="font-mono text-xs uppercase px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold">{sessionData.role}</span>.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => redirectByRole(sessionData)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-semibold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer"
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
              className="inline-flex items-center justify-center px-5 py-3.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 rounded-xl transition-colors cursor-pointer"
            >
              Sign out &amp; switch account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-[#0B0D12] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-emerald-100 selection:text-emerald-950">
      
      {/* ── Left Editorial & Product Artifact Showcase (Desktop 42%) ── */}
      <div className="relative hidden lg:flex lg:w-5/12 flex-col justify-between p-10 xl:p-14 bg-[#05150E] text-white overflow-hidden border-r border-emerald-950/80">
        
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-gradient-to-tr from-emerald-600/15 via-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-950/60 rounded-full blur-2xl pointer-events-none" />

        {/* Top Brand Header */}
        <div className="relative z-10 space-y-5">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-emerald-400/40 shadow-xs bg-emerald-950 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="Akwaaba Homes"
                width={40}
                height={40}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">Akwaaba<span className="text-emerald-400">Homes</span></span>
              <span className="block text-[11px] font-mono tracking-wider uppercase text-emerald-300/80">Ghana PropTech Marketplace</span>
            </div>
          </Link>

          <div className="pt-2 space-y-2 max-w-sm">
            <h2 className="text-2xl xl:text-[26px] font-bold tracking-tight text-white leading-tight">
              One secure credential for your tenancy, keys, and payments.
            </h2>
            <p className="text-xs text-emerald-200/70 leading-relaxed font-normal">
              Every verified booking issues an encrypted digital lease agreement, automated escrow hold, and gatehouse check-in pass.
            </p>
          </div>
        </div>

        {/* ── The Human-Engineered Product Artifact: Digital Resident Keycard ── */}
        <div className="relative z-10 my-auto py-6 flex justify-center">
          <div className="w-full max-w-sm rounded-2xl bg-gradient-to-br from-[#0D281C] via-[#091F16] to-[#040D08] border border-emerald-500/35 p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden backdrop-blur-md transform -rotate-1 hover:rotate-0 transition-transform duration-500 group">
            
            {/* Holographic foil sweep line */}
            <div className="absolute -inset-full bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent rotate-45 pointer-events-none group-hover:translate-x-full transition-transform duration-1000" />

            {/* Card Top: Chip & NFC Contactless */}
            <div className="flex items-center justify-between pb-5 border-b border-emerald-900/50">
              <div className="flex items-center gap-3">
                {/* Gold Smart Microchip Graphic */}
                <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-amber-600/90 via-amber-400 to-amber-200/90 border border-amber-300/60 relative overflow-hidden shadow-xs">
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[1px] opacity-40">
                    <div className="border-r border-b border-amber-950" />
                    <div className="border-b border-amber-950" />
                    <div className="border-r border-amber-950" />
                    <div />
                  </div>
                </div>
                {/* Contactless Wifi Icon */}
                <Wifi className="w-4 h-4 text-emerald-400/80 rotate-90" />
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                  RESIDENT KEYCARD
                </span>
                <span className="text-[9px] font-mono text-emerald-200/50 tracking-wider">
                  SECURE TENANCY PASS
                </span>
              </div>
            </div>

            {/* Card Middle: Resident Credentials */}
            <div className="py-4 space-y-3">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-300/60 block">Verified Resident</span>
                <div className="text-base font-bold text-white tracking-wide mt-0.5">
                  Nana Kwabena Osei
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div>
                  <span className="text-[9px] uppercase font-mono tracking-wider text-emerald-300/60 block">Campus Hub</span>
                  <div className="font-semibold text-emerald-100 text-[12px] truncate">
                    KNUST // Ayeduase
                  </div>
                </div>
                <div>
                  <span className="text-[9px] uppercase font-mono tracking-wider text-emerald-300/60 block">Assigned Unit</span>
                  <div className="font-semibold text-emerald-100 text-[12px]">
                    Studio Room 14B
                  </div>
                </div>
              </div>
            </div>

            {/* Card Security Strip */}
            <div className="py-2 px-3 rounded-xl bg-emerald-950/70 border border-emerald-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-emerald-300 tracking-wider">
                  ESCROW ACTIVE • CHECK-IN READY
                </span>
              </div>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            {/* Card Bottom: Verification Hash & QR */}
            <div className="pt-3.5 flex items-center justify-between text-[10px] font-mono text-emerald-200/50 border-t border-emerald-900/40 mt-3">
              <div>
                <span className="block text-emerald-300/70 font-bold tracking-wider">ID: GH-AKW-2026-8941</span>
                <span className="text-[9px]">ISSUED: AKWAABA TRUST PROTOCOL</span>
              </div>
              <div className="w-7 h-7 rounded-md bg-white p-1 flex items-center justify-center shrink-0">
                <QrCode className="w-full h-full text-zinc-950" />
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Platform Proof Footnote */}
        <div className="relative z-10 pt-4 border-t border-emerald-900/50 flex items-center justify-between text-[11px] text-emerald-300/70 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>1,200+ Verified Rooms Active</span>
          </div>
          <span>UG • KNUST • UCC • ATU</span>
        </div>

      </div>

      {/* ── Right Authentication Surface (Direct Canvas, De-Carded) ── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 xl:p-20 overflow-y-auto">
        
        {/* Top Minimal Navigation Bar */}
        <div className="flex items-center justify-between w-full max-w-md mx-auto mb-8 sm:mb-12">
          {/* Mobile Brand Logo */}
          <Link href="/" className="lg:hidden inline-flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-xs">
              <Image
                src="/logo.png"
                alt="Akwaaba Homes"
                width={32}
                height={32}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-white">
              Akwaaba<span className="text-[#0F5132] dark:text-emerald-400">Homes</span>
            </span>
          </Link>

          {/* Desktop/Tablet Back to Marketplace Link */}
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors ml-auto group"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Marketplace</span>
          </Link>
        </div>

        {/* Central Authentication Form (Centered & Balanced) */}
        <div className="w-full max-w-md mx-auto my-auto py-4">
          
          {/* Header Typography */}
          <div className="space-y-1.5 mb-8">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#0F5132] dark:text-emerald-400 font-bold">
              Authentication // Secure Sign In
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Sign in to your account
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Enter your credentials to access your tenancy ledger, landlord bookings, or operations desk.
            </p>
          </div>

          {/* De-carded Architectural Status Indicators */}
          {isTimeout && (
            <div className="mb-6 border-l-2 border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 pl-4 pr-3 py-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5 rounded-r-xl">
              <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold">Session Expired</div>
                <div className="text-[11px] text-amber-800/80 dark:text-amber-300/80">Your session was safely closed due to inactivity. Please authenticate to resume.</div>
              </div>
            </div>
          )}

          {error && (
            <div className={`mb-6 border-l-2 ${
              error.includes('warming up') 
                ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200' 
                : 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200'
            } pl-4 pr-3 py-3 text-xs flex items-start gap-2.5 transition-all rounded-r-xl`}>
              <Lock className={`w-4 h-4 shrink-0 mt-0.5 ${
                error.includes('warming up') ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
              }`} />
              <div className="space-y-0.5">
                <div className="font-semibold uppercase tracking-wider text-[11px]">
                  {error.includes('warming up') ? 'Database Initializing' : 'Authentication Notice'}
                </div>
                <div className="text-[11px] leading-relaxed opacity-90">{error}</div>
              </div>
            </div>
          )}

          {/* Form Content */}
          {requireTwoFactor ? (
            /* 2FA Challenge Form */
            <form onSubmit={handle2FASubmit} className="space-y-5">
              <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4 space-y-1">
                <div className="text-xs font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Two-Factor Verification Required
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {useRecoveryCode
                    ? 'Enter an unused 8-character recovery code (e.g. XXXX-XXXX).'
                    : 'Enter the 6-digit code from Google Authenticator, Authy, or Microsoft Authenticator.'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
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

              <div className="space-y-3 pt-2">
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
            /* Standard Login Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Email Address */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
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
                    placeholder="student@st.ug.edu.gh or name@gmail.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                </div>

                {/* Campus Email Quick-Fill Tags */}
                <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Quick student suffix:</span>
                  {[
                    '@st.ug.edu.gh',
                    '@st.knust.edu.gh',
                    '@ucc.edu.gh'
                  ].map((domain) => (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => {
                        if (!email.includes('@')) {
                          setEmail(prev => (prev ? prev.trim() + domain : ''));
                        } else {
                          const username = email.split('@')[0];
                          setEmail(username + domain);
                        }
                      }}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-[#0F5132] dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-zinc-200 dark:border-zinc-700/60 transition-colors cursor-pointer"
                    >
                      {domain}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
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
              <div className="flex items-center justify-between pt-1">
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

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-xl text-white bg-[#0F5132] hover:bg-[#0A3D24] text-xs font-semibold uppercase tracking-wider focus:outline-none transition-colors shadow-xs active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Sign in to Account <ArrowRight className="w-3.5 h-3.5" /></>
                  )}
                </button>
              </div>
              
            </form>
          )}

          {/* Switch to Registration */}
          <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Don&apos;t have an account yet?</span>
            <Link 
              href="/register" 
              className="font-semibold text-[#0F5132] dark:text-emerald-400 hover:underline"
            >
              Create an account &rarr;
            </Link>
          </div>

        </div>

        {/* Bottom Security & Compliance Microcopy (Refined Trust Chips) */}
        <div className="w-full max-w-md mx-auto pt-6 flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500">
          <div className="inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">Protected Escrow Payments</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
            <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">256-Bit SSL Encrypted</span>
          </div>
        </div>

      </div>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-[#0B0D12]" />}>
      <LoginForm />
    </Suspense>
  );
}
