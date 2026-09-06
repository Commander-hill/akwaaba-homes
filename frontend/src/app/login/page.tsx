'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, ArrowRight, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/axios';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // 2FA State
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const redirectByRole = (user: any) => {
    if (user.role === 'ADMIN') {
      window.location.href = '/dashboard/admin';
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBFBFC] dark:bg-[#0B0D12] text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 transition-colors">
      
      {/* Editorial Card Container */}
      <div className="w-full max-w-md mx-auto">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-xs group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="Akwaaba Homes"
                width={40}
                height={40}
                className="w-full h-full object-cover"
                priority
              />
            </div>
          </Link>
          <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
            Sign in to Akwaaba<span className="text-[#0F5132] dark:text-[#198754]">Homes</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Access your tenancy lease vault, inspections, or host dashboard.
          </p>
        </div>

        {/* Solid Architectural Card */}
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs">
          
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl text-xs font-semibold flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {requireTwoFactor ? (
            /* 2FA Challenge Form */
            <form onSubmit={handle2FASubmit} className="space-y-5">
              <div className="text-center pb-1">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-3 text-[#0F5132] dark:text-[#198754]">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
                  Two-Factor Authentication
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {useRecoveryCode
                    ? 'Enter an unused 8-character recovery code (e.g. XXXX-XXXX).'
                    : 'Enter the 6-digit code from Google Authenticator, Authy, or Microsoft Authenticator.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  {useRecoveryCode ? 'Emergency Recovery Code' : '6-Digit Security Code'}
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
                    className="block w-full pl-10 pr-3.5 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-center text-lg font-mono font-bold tracking-widest text-zinc-900 dark:text-white placeholder:text-zinc-300 dark:placeholder:text-zinc-600 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#0F5132] focus:ring-1 focus:ring-[#0F5132] outline-none transition-all"
                    placeholder={useRecoveryCode ? 'XXXX-XXXX' : '000000'}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setUseRecoveryCode(!useRecoveryCode);
                    setTwoFactorCode('');
                    setError('');
                  }}
                  className="text-[11px] font-bold text-[#0F5132] dark:text-[#198754] hover:underline cursor-pointer"
                >
                  {useRecoveryCode ? 'Use 6-digit authenticator code' : 'Lost device? Use emergency recovery code'}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || !twoFactorCode.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-[#0F5132] hover:bg-[#0A3D24] font-bold text-xs focus:outline-none transition-colors shadow-xs active:scale-[0.99] disabled:opacity-70 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Verify &amp; Sign In <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequireTwoFactor(false);
                  setTwoFactorCode('');
                  setError('');
                }}
                className="w-full text-center text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium cursor-pointer"
              >
                &larr; Back to email &amp; password
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-zinc-400" />
                  </div>
                  <input 
                    type="email" 
                    required 
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#0F5132] focus:ring-1 focus:ring-[#0F5132] outline-none transition-all" 
                    placeholder="student@st.knust.edu.gh / name@mail.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-[11px] font-bold text-[#0F5132] dark:text-[#198754] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-zinc-400" />
                  </div>
                  <input 
                    type="password" 
                    required 
                    className="block w-full pl-10 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#0F5132] focus:ring-1 focus:ring-[#0F5132] outline-none transition-all" 
                    placeholder="••••••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center pt-1">
                <input 
                  id="remember-me" 
                  name="remember-me" 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-[#0F5132] focus:ring-[#0F5132]" 
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-zinc-600 dark:text-zinc-400 font-medium cursor-pointer">
                  Keep me signed in on this device
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white bg-[#0F5132] hover:bg-[#0A3D24] font-bold text-xs focus:outline-none transition-colors shadow-xs active:scale-[0.99] disabled:opacity-70 cursor-pointer pt-3"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Sign in to Account <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
              
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Don&apos;t have an account yet?{' '}
            <Link href="/register" className="font-bold text-[#0F5132] dark:text-[#198754] hover:underline">
              Create an account
            </Link>
          </div>

        </div>

        {/* Bottom Trust Stamp */}
        <div className="mt-6 text-center text-[11px] text-zinc-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Ghana Rent Act (Act 220) &amp; MoMo Escrow Verified System</span>
        </div>

      </div>

    </div>
  );
}
