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
  Server,
  Building,
  Copy,
  Check,
  Download,
  AlertCircle,
  HelpCircle,
  X,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';
import AlertBanner from '@/components/AlertBanner';
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
      }
      if (data?.refreshToken) {
        localStorage.setItem('akwaaba_refresh_token', data.refreshToken);
      }
      toast.success(`Welcome back, ${data?.user?.firstName || 'Administrator'}`);
      window.location.href = '/admin/dashboard';
    } else {
      await api.post('/auth/logout');
      setError('Unauthorized. This portal is strictly for administrative personnel.');
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
      const msg = err.response?.data?.message || 'Invalid credentials or security key.';
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
      const msg = err.response?.data?.message || 'Invalid 2FA code or backup key.';
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
      toast.success('Manual secret key copied to clipboard');
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2500);
      toast.success('All recovery codes copied to clipboard');
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
      <div className="-mt-16 min-h-screen flex flex-col items-center justify-center bg-[#080A0E] text-white p-4 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-xs font-mono text-zinc-400">Verifying administrative authority...</p>
      </div>
    );
  }

  // Active Authenticated State
  if (sessionData && ['ADMIN', 'SUPER_ADMIN'].includes(sessionData.role) && !isTimeout) {
    return (
      <div className="-mt-16 min-h-screen flex items-center justify-center bg-[#080A0E] text-white p-4">
        <div className="max-w-md w-full p-8 bg-[#0D1017]/95 backdrop-blur-xl border border-zinc-800 rounded-3xl text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-700/80 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              {sessionData.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Executive Administrator'}
            </div>
            <h2 className="text-xl font-bold text-white">Administrator Authenticated</h2>
            <p className="text-xs text-zinc-400 mt-1.5 font-mono">
              Active clearance for {sessionData.firstName} {sessionData.lastName} ({sessionData.email})
            </p>
          </div>
          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => { window.location.href = '/admin/dashboard'; }}
              className="w-full py-3.5 px-4 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              <span>Access Executive Console</span>
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
              className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
            >
              Sign out of authority session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mt-16 min-h-screen flex flex-col justify-between bg-[#080A0E] text-zinc-100 relative overflow-hidden select-none">
      
      {/* ── Ambient Background Glow & Micro Grid ── */}
      <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[600px] bg-emerald-500/10 blur-[170px] pointer-events-none rounded-full" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* ── Top Executive Header ── */}
      <header className="w-full px-6 sm:px-10 lg:px-16 py-5 border-b border-zinc-800/60 flex items-center justify-between relative z-10 bg-[#080A0E]/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500 to-[#0F5132] border border-emerald-400/30 flex items-center justify-center shadow-md p-1.5">
            <Image 
              src="/logo.png" 
              alt="Akwaaba Homes" 
              width={32} 
              height={32} 
              className="w-full h-full object-contain" 
              priority 
            />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-base font-extrabold tracking-tight text-white">
              Akwaaba<span className="text-emerald-400">Admin</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Authority Gateway
            </span>
          </div>
        </div>

        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Marketplace</span>
        </Link>
      </header>

      {/* ── Main 2-Sided Executive Workspace ── */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-16 py-8 sm:py-12 relative z-10">
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-14 items-center">
          
          {/* ──── Left Column: Operations Command Suite Showcase (Desktop) ──── */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-5">
            <div className="relative w-full aspect-[4/5] min-h-[540px] max-h-[600px] rounded-3xl overflow-hidden border border-emerald-900/40 shadow-2xl shadow-black/90 group bg-[#0A0D12]">
              
              <Image
                src="/images/auth-admin.jpg"
                alt="AkwaabaHomes National Operations Command Suite in Accra, Ghana"
                fill
                unoptimized
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover object-center transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                priority
              />

              {/* Vignette Gradient for Legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/20" />

              {/* Top Telemetry Pills */}
              <div className="absolute top-5 left-5 right-5 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 backdrop-blur-md">
                  Accra HQ // Main Command
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono text-zinc-300 bg-black/70 backdrop-blur-md border border-zinc-700/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Telemetry
                </span>
              </div>

              {/* Editorial Caption Card */}
              <div className="absolute bottom-0 inset-x-0 p-6 sm:p-7 text-white space-y-2.5">
                <div className="text-[10px] uppercase font-mono tracking-widest text-emerald-400 font-bold">
                  National Real Estate Infrastructure
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white leading-snug">
                  Executive Operations &amp; Statutory Tenancy Oversight
                </h3>
                <p className="text-xs text-zinc-300/80 leading-relaxed font-normal">
                  Centralized supervision over Ghana Card identity compliance, Land Title registry deeds, and automated Paystack escrow settlements across all regions.
                </p>

                {/* Statutory Badges */}
                <div className="pt-3 flex flex-wrap items-center gap-2">
                  <span className="px-2 py-1 rounded-md text-[9px] font-mono font-bold uppercase bg-white/10 text-zinc-300 border border-white/10">
                    256-Bit TLS
                  </span>
                  <span className="px-2 py-1 rounded-md text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Act 843 Audited
                  </span>
                  <span className="px-2 py-1 rounded-md text-[9px] font-mono font-bold uppercase bg-white/10 text-zinc-300 border border-white/10">
                    MFA Enforced
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* ──── Right Column: Command Gateway Card ──── */}
          <div className="lg:col-span-7 xl:col-span-7 w-full max-w-[460px] mx-auto lg:mx-0">
            
            {/* Mobile Visual Header */}
            <div className="lg:hidden mb-5 relative w-full h-44 sm:h-52 rounded-2xl overflow-hidden border border-emerald-900/40 shadow-md bg-[#0A0D12]">
              <Image
                src="/images/auth-admin.jpg"
                alt="AkwaabaHomes National Operations Command Suite"
                fill
                unoptimized
                sizes="100vw"
                className="object-cover object-center"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-4 text-white">
                <div className="text-[9px] uppercase font-mono tracking-widest text-emerald-400 font-bold">
                  Executive Operations
                </div>
                <h3 className="text-sm font-bold text-white">
                  National Tenancy Infrastructure Command
                </h3>
              </div>
            </div>

            {/* Frosted Command Card */}
            <div className="relative rounded-3xl bg-[#0D1017]/95 backdrop-blur-xl border border-zinc-800/90 shadow-2xl shadow-black/80 p-6 sm:p-9 overflow-hidden">
              
              {/* Top Accent Gradient Line */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-[#0F5132]" />

              {/* Console Branding */}
              <div className="flex flex-col items-center text-center mb-6">
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

              {requireSetup ? (
                /* ── Mandatory 2FA Enrollment View ── */
                <form onSubmit={handleSetupSubmit} className="space-y-5 animate-in fade-in duration-300">
                  <div className="text-center pb-1">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-2 text-amber-400">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <h2 className="text-sm font-bold text-white tracking-wide">
                      Set Up Two-Factor Authentication
                    </h2>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                      Two-factor authentication is required for all administrator accounts. Scan the QR code with an authenticator app (Google Authenticator, Authy, or 1Password), then confirm with your 6-digit code.
                    </p>
                  </div>

                  {/* QR Code Container */}
                  {setupData?.qrCodeSvg && (
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className="mx-auto w-[180px] h-[180px] bg-white rounded-2xl p-2.5 shadow-md border border-zinc-200 [&>svg]:w-full [&>svg]:h-full"
                        aria-label="Authenticator QR code"
                        dangerouslySetInnerHTML={{ __html: setupData.qrCodeSvg }}
                      />
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                        Scan with your authenticator app
                      </span>
                    </div>
                  )}

                  {/* Manual Key with 1-Click Copy */}
                  {setupData?.formattedSecret && (
                    <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                          Manual Entry Secret
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(setupData.formattedSecret || '', true)}
                          className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition"
                        >
                          {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                        </button>
                      </div>
                      <div className="text-xs font-mono text-emerald-400 break-all select-all font-bold">
                        {setupData.formattedSecret}
                      </div>
                    </div>
                  )}

                  {/* Emergency Recovery Codes */}
                  {setupData?.rawCodes && setupData.rawCodes.length > 0 && (
                    <div className="rounded-2xl border border-amber-800/60 bg-amber-950/20 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-amber-300 font-bold flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Emergency Recovery Codes
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard((setupData.rawCodes || []).join('\n'), false)}
                            className="text-[10px] font-mono text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            {copiedCodes ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCodes ? 'Copied' : 'Copy'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={downloadRecoveryCodes}
                            className="text-[10px] font-mono text-amber-300 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 font-mono text-xs text-zinc-200 select-all">
                        {setupData.rawCodes.map((c) => (
                          <span key={c} className="bg-zinc-900/90 border border-zinc-800 rounded px-2 py-1 text-center font-bold">
                            {c}
                          </span>
                        ))}
                      </div>

                      <label className="flex items-start gap-2.5 text-[11px] text-zinc-300 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          checked={codesAcknowledged}
                          onChange={(e) => setCodesAcknowledged(e.target.checked)}
                        />
                        <span>I have securely saved these emergency recovery codes in a safe vault.</span>
                      </label>
                    </div>
                  )}

                  {/* 6-Digit TOTP Confirmation Input */}
                  <div className="space-y-1.5">
                    <label htmlFor="setup-code" className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                      Enter 6-Digit Code from App
                    </label>
                    <input
                      id="setup-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      className="block w-full px-4 py-3 border border-zinc-800 rounded-xl bg-zinc-900/90 text-center text-lg font-mono font-bold tracking-widest text-emerald-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-700"
                      placeholder="000000"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  <div className="pt-2 space-y-2.5">
                    <button
                      type="submit"
                      disabled={isLoading || twoFactorCode.length !== 6 || !codesAcknowledged}
                      className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Verify &amp; Activate 2FA</span>
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
                      className="w-full text-center text-xs font-mono text-zinc-500 hover:text-zinc-300 cursor-pointer py-1"
                    >
                      &larr; Cancel and return to sign in
                    </button>
                  </div>
                </form>
              ) : requireTwoFactor ? (
                /* ── 2FA Verification View ── */
                <form onSubmit={handle2FASubmit} className="space-y-5 animate-in fade-in duration-300">
                  <div className="text-center pb-1">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2 text-emerald-400">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <h2 className="text-sm font-bold text-white tracking-wide">
                      Two-Factor Security Verification
                    </h2>
                    <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                      {useRecoveryCode
                        ? 'Enter an unused 8-character recovery backup key.'
                        : 'Enter the 6-digit TOTP code from your authenticator app.'}
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
                      className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-50"
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
                      <button
                        type="button"
                        onClick={() => setShowRecoveryModal(true)}
                        className="text-[10px] font-mono text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        Lost Credentials?
                      </button>
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
                      disabled={isLoading || !formData.email.trim() || !formData.password}
                      className="w-full h-11 inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-950/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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

              {/* Security Monitored Notice */}
              <div className="mt-6 pt-5 border-t border-zinc-800/80 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-zinc-500">
                  <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />
                  <span>UNAUTHORIZED ACCESS IS STRICTLY MONITORED &amp; AUDITED</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* ── Institutional Bottom Telemetry Footer ── */}
      <footer className="w-full px-6 sm:px-10 lg:px-16 py-4 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-zinc-500 relative z-10 gap-2 bg-[#080A0E]/70 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>GATEWAY: ACCRA-PRIMARY // 256-BIT TLS ENCRYPTION</span>
        </div>
        <div>
          GHANA DATA PROTECTION ACT (ACT 843) AUDITED
        </div>
      </footer>

      {/* ── Lost Credentials Emergency Recovery Modal ── */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-3xl bg-[#0D1017] border border-zinc-800 p-6 sm:p-7 space-y-4 shadow-2xl relative text-left">
            <button
              onClick={() => setShowRecoveryModal(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Administrative Key Recovery</h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                For security reasons under the Ghana Data Protection Act, administrative credentials cannot be self-reset through automated email links without active 2FA.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2 text-xs">
              <div className="font-semibold text-zinc-200">Emergency Protocol:</div>
              <ul className="list-disc pl-4 space-y-1 text-zinc-400 text-[11px]">
                <li>Use one of your 10 Emergency Recovery Codes if 2FA device is lost.</li>
                <li>Contact a Super Administrator at HQ to rotate your credentials.</li>
                <li>For engineering emergency, reach: <span className="font-mono text-emerald-400">security@akwaabahomes.com.gh</span></li>
              </ul>
            </div>

            <button
              onClick={() => setShowRecoveryModal(false)}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close Protocol Notice
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="-mt-16 min-h-screen bg-[#080A0E]" />}>
      <AdminLoginForm />
    </Suspense>
  );
}
