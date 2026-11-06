'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
  ShieldAlert,
  Copy, 
  Check, 
  Download, 
  AlertCircle, 
  X,
  Shield
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';
import AlertBanner from '@/components/AlertBanner';
import ThemeToggle from '@/components/ThemeToggle';
import toast from 'react-hot-toast';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTimeout = searchParams.get('reason') === 'timeout';
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

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
    if (sessionData && ['ADMIN', 'SUPER_ADMIN'].includes(sessionData.role) && !isTimeout) {
      window.location.href = '/admin/dashboard';
    }
  }, [sessionData, isTimeout]);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // 2FA Challenge State
  const [requireTwoFactor, setRequireTwoFactor] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  // Mandatory 2FA Enrollment State (admins without 2FA configured)
  const [requireSetup, setRequireSetup] = useState(false);
  const [setupData, setSetupData] = useState<{ 
    qrCodeSvg?: string; 
    formattedSecret?: string; 
    rawCodes?: string[] 
  } | null>(null);
  const [codesAcknowledged, setCodesAcknowledged] = useState(false);

  const finalizeAdminSession = async (data: any) => {
    const userRole = data?.user?.role;
    if (['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      if (data?.accessToken) {
        localStorage.setItem('akwaaba_access_token', data.accessToken);
        localStorage.setItem('akwaaba_last_active', String(Date.now()));
      }
      if (data?.refreshToken) {
        localStorage.setItem('akwaaba_refresh_token', data.refreshToken);
      }
      toast.success(`Welcome back, ${data?.user?.firstName || 'Administrator'}`);
      window.location.href = '/admin/dashboard';
    } else {
      await api.post('/auth/logout');
      setError('Access restricted. This console is reserved for administrative personnel.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        portal: 'ADMIN',
      });

      if (response.data?.requireTwoFactor) {
        setRequireTwoFactor(true);
        setTempToken(response.data.tempToken);
        setIsLoading(false);
        return;
      }

      if (response.data?.requireTwoFactorSetup) {
        setRequireSetup(true);
        setTempToken(response.data.tempToken);
        setSetupData({
          qrCodeSvg: response.data.qrCodeSvg,
          formattedSecret: response.data.formattedSecret,
          rawCodes: response.data.rawCodes,
        });
        setIsLoading(false);
        return;
      }

      if (response.status === 200) {
        await finalizeAdminSession(response.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid work email or password.';
      setError(msg);
      toast.error(msg);
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
        code: twoFactorCode.trim(),
        portal: 'ADMIN',
      });

      if (response.status === 200) {
        await finalizeAdminSession(response.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid verification code or recovery backup key.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login/2fa/mandatory-setup', {
        tempToken,
        code: twoFactorCode.trim(),
      });
      if (response.status === 200) {
        await finalizeAdminSession(response.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Could not verify the authenticator code.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, isSecretKey: boolean = false) => {
    navigator.clipboard.writeText(text);
    if (isSecretKey) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
      toast.success('Secret key copied to clipboard');
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2500);
      toast.success('Recovery codes copied to clipboard');
    }
  };

  const downloadRecoveryCodes = () => {
    if (!setupData?.rawCodes) return;
    const content = `AKWAABA HOMES — ADMINISTRATOR RECOVERY CODES
Date Generated: ${new Date().toUTCString()}
Account: ${formData.email || 'Administrator'}

IMPORTANT: Keep these recovery codes in a secure password manager or offline vault.
Each code can only be used once if you lose access to your authenticator app.

${setupData.rawCodes.map((code, idx) => `${idx + 1}. ${code}`).join('\n')}
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `akwaaba-admin-recovery-codes-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Recovery codes downloaded (.txt)');
  };

  // Checking Auth State
  if (isCheckingAuth && typeof window !== 'undefined' && localStorage.getItem('akwaaba_access_token') && !isTimeout) {
    return (
      <div className="-mt-16 min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-[#0B0F0E] text-zinc-900 dark:text-zinc-100 p-4 space-y-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#16A34A]" />
        <p className="text-xs text-zinc-500 font-medium">Verifying administrator session...</p>
      </div>
    );
  }

  // Active Authenticated State
  if (sessionData && ['ADMIN', 'SUPER_ADMIN'].includes(sessionData.role) && !isTimeout) {
    return (
      <div className="-mt-16 min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-[#0B0F0E] text-[#141816] dark:text-zinc-100 p-4">
        <div className="max-w-md w-full p-8 bg-white dark:bg-[#121715] border border-zinc-200 dark:border-zinc-800 rounded-3xl text-center space-y-5 shadow-sm dark:shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#EEF4EC] dark:bg-emerald-950/60 border border-[#DCE5DA] dark:border-emerald-800/80 flex items-center justify-center mx-auto text-[#15803D] dark:text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#EEF4EC] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300 border border-[#DCE5DA] dark:border-emerald-800/80 mb-2.5">
              {sessionData.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Executive Administrator'}
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Active Session Detected</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Signed in as <span className="font-semibold text-zinc-800 dark:text-zinc-200">{sessionData.firstName} {sessionData.lastName}</span> ({sessionData.email})
            </p>
          </div>
          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => { window.location.href = '/admin/dashboard'; }}
              className="w-full h-11 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <span>Go to Admin Dashboard</span>
              <ArrowRight className="w-4 h-4" />
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
              className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
            >
              Sign out of this session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mt-16 min-h-screen flex flex-col justify-between bg-zinc-50 dark:bg-[#0B0F0E] text-[#141816] dark:text-zinc-100 font-sans selection:bg-[#DCFCE7] selection:text-[#15803D] relative overflow-hidden">
      
      {/* ── Top Header ── */}
      <header className="w-full px-5 sm:px-8 lg:px-12 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-white/85 dark:bg-[#0B0F0E]/85 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image 
              src="/logo-light.png" 
              alt="AkwaabaHomes" 
              width={34} 
              height={34} 
              className="dark:hidden shrink-0" 
              priority 
            />
            <Image 
              src="/logo.png" 
              alt="AkwaabaHomes" 
              width={34} 
              height={34} 
              className="hidden dark:block shrink-0" 
              priority 
            />
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-zinc-900 dark:text-white">
                  AkwaabaHomes
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EEF4EC] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300 border border-[#DCE5DA] dark:border-emerald-800/80">
                  Admin
                </span>
              </div>
              <span className="text-[10px] font-medium text-[#3B6E5C] dark:text-emerald-400 mt-0.5">
                Internal Operations
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {/* Status Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Systems Normal</span>
          </div>

          <ThemeToggle />

          <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Marketplace</span>
          </Link>
        </div>
      </header>

      {/* ── Main Centered Administration Card ── */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14 relative z-10">
        <div className="w-full max-w-[440px] mx-auto">

          {/* White / Charcoal Glass Card */}
          <div className="bg-white dark:bg-[#121715] border border-zinc-200/90 dark:border-zinc-800/90 rounded-3xl p-7 sm:p-9 shadow-sm dark:shadow-2xl relative overflow-hidden space-y-6">
            
            {/* Top Green Accent Indicator */}
            <div className="absolute top-0 inset-x-0 h-1 bg-[#16A34A]" />

            {/* Header Content */}
            <div className="space-y-1.5 text-left">
              <div className="w-12 h-12 rounded-2xl bg-[#EEF4EC] dark:bg-emerald-950/50 border border-[#DCE5DA] dark:border-emerald-800/60 flex items-center justify-center text-[#15803D] dark:text-emerald-400 mb-4 shadow-2xs">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Admin Console
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Sign in with your staff account to manage properties, verifications, and financial settlements.
              </p>
            </div>

            {/* Session Timeout Alert */}
            {isTimeout && (
              <AlertBanner
                type="warning"
                message="Your administrative session expired due to inactivity. Please sign in again."
                className="text-xs"
              />
            )}

            {/* Error Notice */}
            {error && (
              <AlertBanner
                type="error"
                message={error}
                className="text-xs"
              />
            )}

            {requireSetup ? (
              /* ── Mandatory 2FA Enrollment View ── */
              <form onSubmit={handleSetupSubmit} className="space-y-5 animate-in fade-in duration-200">
                <div className="text-left space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 mb-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>MFA Required</span>
                  </div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Set up two-factor authentication
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Scan this QR code with Google Authenticator, 1Password, or Authy, then enter the 6-digit code.
                  </p>
                </div>

                {/* QR Code Container */}
                {setupData?.qrCodeSvg && (
                  <div className="flex flex-col items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                    <div
                      className="mx-auto w-[170px] h-[170px] bg-white rounded-xl p-2 shadow-xs border border-zinc-200 [&>svg]:w-full [&>svg]:h-full"
                      aria-label="Authenticator QR code"
                      dangerouslySetInnerHTML={{ __html: setupData.qrCodeSvg }}
                    />
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Scan with your authenticator app
                    </span>
                  </div>
                )}

                {/* Manual Secret Key */}
                {setupData?.formattedSecret && (
                  <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-600 dark:text-zinc-400 text-[11px]">
                        Can&apos;t scan? Manual Key
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(setupData.formattedSecret || '', true)}
                        className="text-[11px] font-semibold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="text-xs font-mono text-zinc-900 dark:text-emerald-300 font-bold break-all select-all">
                      {setupData.formattedSecret}
                    </div>
                  </div>
                )}

                {/* Emergency Recovery Codes */}
                {setupData?.rawCodes && setupData.rawCodes.length > 0 && (
                  <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Emergency Recovery Codes
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyToClipboard((setupData.rawCodes || []).join('\n'), false)}
                          className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCodes ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCodes ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={downloadRecoveryCodes}
                          className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 font-mono text-xs text-zinc-800 dark:text-zinc-200 select-all">
                      {setupData.rawCodes.map((c) => (
                        <span key={c} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-center font-bold">
                          {c}
                        </span>
                      ))}
                    </div>

                    <label className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        className="mt-0.5 rounded border-zinc-300 text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
                        checked={codesAcknowledged}
                        onChange={(e) => setCodesAcknowledged(e.target.checked)}
                      />
                      <span className="text-[11.5px] leading-tight">I have saved these emergency recovery codes in a secure location.</span>
                    </label>
                  </div>
                )}

                {/* 6-Digit TOTP Confirmation Input */}
                <div className="space-y-1.5">
                  <label htmlFor="setup-code" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    6-digit code from authenticator
                  </label>
                  <input
                    id="setup-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={6}
                    className="block w-full px-4 py-2.5 border border-zinc-200 dark:border-zinc-700/80 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-center text-lg font-mono font-bold tracking-[0.25em] text-zinc-900 dark:text-white focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20 outline-none transition-all placeholder:text-zinc-400"
                    placeholder="000000"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={isLoading || twoFactorCode.length !== 6 || !codesAcknowledged}
                    className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Activate 2FA &amp; Enter Console</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRequireSetup(false);
                      setSetupData(null);
                      setTwoFactorCode('');
                      setCodesAcknowledged(false);
                      setError('');
                    }}
                    className="w-full text-center text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer py-1"
                  >
                    &larr; Cancel and return to sign in
                  </button>
                </div>
              </form>
            ) : requireTwoFactor ? (
              /* ── 2FA Verification View ── */
              <form onSubmit={handle2FASubmit} className="space-y-5 animate-in fade-in duration-200">
                <div className="text-left space-y-1">
                  <div className="w-10 h-10 rounded-xl bg-[#EEF4EC] dark:bg-emerald-950/50 border border-[#DCE5DA] dark:border-emerald-800/60 flex items-center justify-center text-[#15803D] dark:text-emerald-400 mb-2">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    Two-Factor Authentication
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {useRecoveryCode
                      ? 'Enter one of your 8-character emergency backup recovery codes.'
                      : 'Enter the 6-digit verification code from your authenticator app.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {useRecoveryCode ? 'Emergency recovery code' : 'Security verification code'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={useRecoveryCode ? 10 : 6}
                      autoFocus
                      className="block w-full pl-10 pr-4 py-2.5 border border-zinc-200 dark:border-zinc-700/80 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-center text-base sm:text-lg font-mono font-bold tracking-[0.2em] text-zinc-900 dark:text-white focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20 outline-none transition-all placeholder:text-zinc-400"
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
                    className="text-xs font-medium text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 dark:hover:text-emerald-300 underline cursor-pointer"
                  >
                    {useRecoveryCode ? 'Use authenticator app code' : 'Use emergency recovery code'}
                  </button>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={isLoading || !twoFactorCode.trim()}
                    className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-40"
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
                    className="w-full text-center text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer py-1"
                  >
                    &larr; Back to login
                  </button>
                </div>
              </form>
            ) : (
              /* ── Primary Credential Login Form ── */
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Work Email */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Work email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      className="w-full h-11 pl-10 pr-3.5 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20 outline-none transition-all"
                      placeholder="admin@akwaabahomes.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowRecoveryModal(true)}
                      className="text-xs font-medium text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      Trouble signing in?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      className="w-full h-11 pl-10 pr-10 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-[#16A34A] focus:ring-2 focus:ring-[#16A34A]/20 outline-none transition-all"
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading || !formData.email.trim() || !formData.password}
                    className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Sign in to Admin Console</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Subtle Compliance Note */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500">
                <Shield className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
                <span>Authorized personnel only. Sessions are logged &amp; monitored.</span>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* ── Institutional Footer ── */}
      <footer className="w-full px-5 sm:px-8 lg:px-12 py-4 border-t border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 relative z-10 gap-2 bg-white/60 dark:bg-[#0B0F0E]/60 backdrop-blur-md">
        <div>
          &copy; {new Date().getFullYear()} Akwaaba Homes Ghana Ltd · Internal Operations Console
        </div>
        <div className="flex items-center gap-2.5 text-[11px] text-zinc-400 dark:text-zinc-500">
          <span>Act 843 Compliant</span>
          <span>•</span>
          <span>256-bit TLS</span>
          <span>•</span>
          <span>MFA Enforced</span>
        </div>
      </footer>

      {/* ── Trouble Signing In / Lost Credentials Modal ── */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="max-w-md w-full rounded-3xl bg-white dark:bg-[#121715] border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 space-y-4 shadow-xl relative text-left">
            <button
              onClick={() => setShowRecoveryModal(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">Account Recovery Protocol</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                For administrative compliance under the Ghana Data Protection Act (Act 843), admin accounts cannot be self-reset through automated email links.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
              <div className="font-semibold text-zinc-800 dark:text-zinc-200">Recommended Steps:</div>
              <ul className="list-disc pl-4 space-y-1.5 text-zinc-600 dark:text-zinc-400 text-xs">
                <li>If you lost your 2FA device, use one of your 10 saved Emergency Recovery Codes.</li>
                <li>Contact a Super Administrator at HQ to rotate your password or reset your MFA.</li>
                <li>For urgent infrastructure matters, email <span className="font-mono text-[#16A34A] dark:text-emerald-400">security@akwaabahomes.com</span></li>
              </ul>
            </div>

            <button
              onClick={() => setShowRecoveryModal(false)}
              className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="-mt-16 min-h-screen bg-zinc-50 dark:bg-[#0B0F0E]" />}>
      <AdminLoginForm />
    </Suspense>
  );
}
