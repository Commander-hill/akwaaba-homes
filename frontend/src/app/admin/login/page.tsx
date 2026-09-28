'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Lock, 
  Mail, 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';
import AlertBanner from '@/components/AlertBanner';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTimeout = searchParams.get('reason') === 'timeout';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Check if admin is already authenticated
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

  useEffect(() => {
    if (sessionData && sessionData.role === 'ADMIN' && !isTimeout) {
      window.location.href = '/admin/dashboard';
    }
  }, [sessionData, isTimeout]);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

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
      const response = await api.post('/auth/login', formData);
      if (response.data?.requireTwoFactor) {
        setRequireTwoFactor(true);
        setTempToken(response.data.tempToken);
        setIsLoading(false);
        return;
      }

      if (response.status === 200) {
        const userRole = response.data.user.role;
        if (userRole === 'ADMIN') {
          if (response.data?.accessToken) {
            localStorage.setItem('akwaaba_access_token', response.data.accessToken);
          }
          if (response.data?.refreshToken) {
            localStorage.setItem('akwaaba_refresh_token', response.data.refreshToken);
          }
          window.location.href = '/admin/dashboard';
        } else {
          await api.post('/auth/logout');
          setError('Unauthorized. This portal is for administrative personnel only.');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials or security key.');
    } finally {
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

      if (response.status === 200) {
        const userRole = response.data.user.role;
        if (userRole === 'ADMIN') {
          if (response.data?.accessToken) {
            localStorage.setItem('akwaaba_access_token', response.data.accessToken);
          }
          if (response.data?.refreshToken) {
            localStorage.setItem('akwaaba_refresh_token', response.data.refreshToken);
          }
          window.location.href = '/admin/dashboard';
        } else {
          await api.post('/auth/logout');
          setError('Unauthorized. This portal is for administrative personnel only.');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid 2FA code or backup key.');
    } finally {
      setIsLoading(false);
    }
  };

  // Checking Auth State
  if (isCheckingAuth && typeof window !== 'undefined' && localStorage.getItem('akwaaba_access_token') && !isTimeout) {
    return (
      <div className="-mt-18 md:-mt-20 min-h-screen flex flex-col items-center justify-center bg-[#080A0E] text-white p-4 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-xs font-mono text-zinc-400">Verifying administrative authority...</p>
      </div>
    );
  }

  // Active Authenticated State
  if (sessionData && sessionData.role === 'ADMIN' && !isTimeout) {
    return (
      <div className="-mt-18 md:-mt-20 min-h-screen flex items-center justify-center bg-[#080A0E] text-white p-4">
        <div className="max-w-md w-full p-8 bg-[#0D1017]/90 backdrop-blur-xl border border-zinc-800 rounded-3xl text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Administrator Authenticated</h2>
            <p className="text-xs text-zinc-400 mt-1.5 font-mono">
              Active session as {sessionData.firstName || sessionData.email}.
            </p>
          </div>
          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => { window.location.href = '/admin/dashboard'; }}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-[#0F5132] hover:from-emerald-500 hover:to-[#12633e] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Open Admin Console</span>
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
              className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
            >
              Sign out of administrative session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mt-18 md:-mt-20 min-h-screen flex flex-col justify-between bg-[#080A0E] text-zinc-100 relative overflow-hidden select-none">
      
      {/* ── Ambient Background Glow & Micro Grid ── */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[520px] bg-emerald-500/8 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* ── Top Executive Header ── */}
      <header className="w-full px-6 sm:px-10 lg:px-16 py-5 border-b border-zinc-800/60 flex items-center justify-between relative z-10 bg-[#080A0E]/70 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-emerald-500 to-[#0F5132] border border-emerald-400/30 flex items-center justify-center shadow-xs">
            <Image 
              src="/logo.png" 
              alt="Akwaaba Homes" 
              width={22} 
              height={22} 
              className="w-5 h-5 object-contain" 
              priority 
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-white">
              Akwaaba<span className="text-emerald-400">Homes</span>
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Ops Console
            </span>
          </div>
        </div>

        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Platform</span>
        </Link>
      </header>

      {/* ── Main Command Gateway Card ── */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 relative z-10">
        <div className="max-w-[460px] w-full">
          <div className="relative rounded-3xl bg-[#0D1017]/90 backdrop-blur-xl border border-zinc-800/80 shadow-2xl shadow-black/80 p-7 sm:p-9 overflow-hidden">
            
            {/* Top Accent Gradient Line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-[#0F5132]" />

            {/* Console Branding */}
            <div className="flex flex-col items-center text-center mb-7">
              <div className="relative mb-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/80 flex items-center justify-center shadow-lg text-emerald-400 ring-4 ring-emerald-500/10">
                  <ShieldCheck className="w-7 h-7 text-emerald-400" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-[#0D1017] flex items-center justify-center" title="Authority Gateway Active">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </span>
              </div>

              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Administrative Console
                </h1>
                <p className="text-xs text-zinc-400 font-mono tracking-wide">
                  AUTHORITY GATEWAY // RESTRICTED ACCESS
                </p>
              </div>
            </div>

            {/* Session Timeout Alert */}
            {isTimeout && (
              <AlertBanner
                type="warning"
                message="Administrative session timed out due to inactivity. Re-authenticate to access the console."
                className="mb-6"
              />
            )}

            {/* Error Notice */}
            {error && (
              <AlertBanner
                type="error"
                message={error}
                className="mb-6"
              />
            )}

            {requireTwoFactor ? (
              /* ── 2FA Verification View ── */
              <form onSubmit={handle2FASubmit} className="space-y-5 animate-in fade-in duration-300">
                <div className="text-center pb-2">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-2.5 text-zinc-400">
                    <KeyRound className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h2 className="text-sm font-bold text-white tracking-wide">
                    Two-Factor Security Verification
                  </h2>
                  <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                    {useRecoveryCode
                      ? 'Enter an unused 8-character recovery backup key.'
                      : 'Enter 6-digit TOTP code from your authority authenticator app.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                    {useRecoveryCode ? 'Emergency Backup Key' : 'Authority TOTP Code'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={useRecoveryCode ? 10 : 6}
                      autoFocus
                      className="block w-full pl-10 pr-4 py-3 border border-zinc-800 rounded-xl bg-zinc-900/90 text-center text-lg font-mono font-bold tracking-widest text-emerald-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-700"
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
                    className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                  >
                    {useRecoveryCode ? 'Use 6-digit authenticator code' : 'Use emergency recovery code'}
                  </button>
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={isLoading || !twoFactorCode.trim()}
                    className="w-full h-11 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-[#0F5132] hover:from-emerald-500 hover:to-[#12633e] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Verify &amp; Enter Console</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRequireTwoFactor(false);
                      setTwoFactorCode('');
                      setError('');
                    }}
                    className="w-full text-center text-xs font-mono text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer py-1"
                  >
                    &larr; Abort to Primary Credentials
                  </button>
                </div>
              </form>
            ) : (
              /* ── Primary Credential Login Form ── */
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Authority Email */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                    Authority Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      className="w-full h-11 pl-10 pr-3.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="admin@akwaabahomes.com.gh"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Security Key */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                      Security Key
                    </label>
                    <span className="text-[10px] font-mono text-zinc-500">
                      256-Bit TLS
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      className="w-full h-11 pl-10 pr-10 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                      placeholder="••••••••••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                      aria-label={showPassword ? "Hide security key" : "Show security key"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Authenticate Console Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-[#0F5132] hover:from-emerald-500 hover:to-[#12633e] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Authenticate Console</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Security Notice */}
            <div className="mt-7 pt-5 border-t border-zinc-800/80 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-zinc-500">
                <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />
                <span>UNAUTHORIZED ACCESS IS STRICTLY MONITORED</span>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Institutional Bottom Telemetry Footer ── */}
      <footer className="w-full px-6 sm:px-10 lg:px-16 py-4 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-zinc-500 relative z-10 gap-2 bg-[#080A0E]/70 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>GATEWAY: ACCRA-PRIMARY // 256-BIT ENCRYPTION</span>
        </div>
        <div>
          GHANA DATA PROTECTION ACT (ACT 843) AUDITED
        </div>
      </footer>

    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="-mt-18 md:-mt-20 min-h-screen bg-[#080A0E]" />}>
      <AdminLoginForm />
    </Suspense>
  );
}
