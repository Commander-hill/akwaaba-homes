'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Lock, 
  Mail, 
  Loader2, 
  ArrowRight, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  KeyRound,
  ShieldAlert,
  Copy, 
  Check, 
  Download, 
  AlertCircle, 
  X
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
      const msg = err.response?.data?.message || 'Invalid work email address or password.';
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
      <div className="-mt-16 min-h-screen flex flex-col items-center justify-center bg-[#F4FBF7] text-zinc-900 p-4 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        <p className="text-xs text-zinc-600 font-medium">Verifying administrator session...</p>
      </div>
    );
  }

  // Active Authenticated State
  if (sessionData && ['ADMIN', 'SUPER_ADMIN'].includes(sessionData.role) && !isTimeout) {
    return (
      <div className="-mt-16 min-h-screen flex items-center justify-center bg-[#F4FBF7] text-[#141816] p-4">
        <div className="max-w-md w-full p-8 bg-white border border-zinc-200/90 rounded-[32px] text-center space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
          <div className="w-16 h-16 rounded-2xl bg-[#EEF4EC] border border-[#DCE5DA] flex items-center justify-center mx-auto text-[#0F5132]">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#EEF4EC] text-[#0F5132] border border-[#DCE5DA] mb-2.5">
              {sessionData.role === 'SUPER_ADMIN' ? 'Super Administrator' : 'Executive Administrator'}
            </div>
            <h2 className="text-xl font-bold text-zinc-900">Active Session Detected</h2>
            <p className="text-xs text-zinc-500 mt-1">
              Signed in as <span className="font-semibold text-zinc-800">{sessionData.firstName} {sessionData.lastName}</span> ({sessionData.email})
            </p>
          </div>
          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => { window.location.href = '/admin/dashboard'; }}
              className="w-full h-12 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
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
              className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Sign out of this session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mt-16 min-h-screen w-full bg-white text-[#141816] font-sans relative overflow-x-hidden flex flex-col lg:flex-row">
      
      {/* ── Left Column: Master Visual Banner (Exact Mockup Match) ── */}
      <div className="hidden lg:block lg:w-[48%] xl:w-[46%] 2xl:w-[45%] relative min-h-screen bg-[#EBF7EE] shrink-0 overflow-hidden select-none">
        <Image
          src="/images/auth/admin-left-banner-v2.png"
          alt="AkwaabaHomes Admin Portal - Welcome Back, Administrator"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover object-left-top pointer-events-none"
        />
        {/* ── Authentic AkwaabaHomes Brand Logo & Slogan ── */}
        <Link 
          href="/" 
          className="absolute top-8 left-8 sm:left-12 inline-flex items-center gap-3.5 group z-20 cursor-pointer"
          title="AkwaabaHomes Home"
        >
          <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center shrink-0">
            <Image 
              src="/images/auth/akwaaba-emblem.png" 
              alt="AkwaabaHomes" 
              width={48} 
              height={48} 
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-xs" 
              priority 
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              AkwaabaHomes
            </span>
            <span className="text-xs font-semibold text-[#3B6E5C] mt-1 tracking-normal">
              Live Well. Feel at Home.
            </span>
          </div>
        </Link>
      </div>

      {/* ── Mobile Top Header (< lg) ── */}
      <div className="lg:hidden w-full px-6 pt-6 pb-3 flex items-center justify-between bg-[#EBF7EE] border-b border-zinc-200/50">
        <Link href="/" className="inline-flex items-center gap-3">
          <Image 
            src="/images/auth/akwaaba-emblem.png" 
            alt="AkwaabaHomes" 
            width={40} 
            height={40} 
            className="w-10 h-10 object-contain drop-shadow-xs" 
            priority 
          />
          <div className="flex flex-col leading-none">
            <span className="text-lg font-black text-zinc-900 tracking-tight">AkwaabaHomes</span>
            <span className="text-[11px] font-semibold text-[#3B6E5C] mt-0.5">Live Well. Feel at Home.</span>
          </div>
        </Link>
        <span className="px-3 py-1 rounded-full bg-[#04793d] text-white text-[11px] font-bold">
          Admin Portal
        </span>
      </div>

      {/* ── Right Column: Interactive Admin Console Card with Landmark Backdrop ── */}
      <div className="flex-1 relative min-h-screen bg-white flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 overflow-hidden">
        
        {/* Landmark & Diagonal Wave Backdrop (Anchored to Right Edge) */}
        <div 
          className="pointer-events-none select-none absolute top-0 right-0 h-full w-[320px] sm:w-[400px] md:w-[460px] lg:w-[500px] z-0 opacity-90"
          style={{
            backgroundImage: "url('/images/auth/admin-right-landmark.png')",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top right',
            backgroundSize: 'contain',
          }}
        />

        {/* Floating White Authentication Card */}
        <div className="w-full max-w-[450px] bg-white rounded-[28px] sm:rounded-[32px] p-7 sm:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] border border-zinc-100 relative z-10">
          
          {/* Shield Icon Badge */}
          <div className="flex justify-center mb-3">
                <div className="w-20 h-20 relative flex items-center justify-center">
                  <Image 
                    src="/images/auth/admin-shield-icon.png" 
                    alt="Admin Security" 
                    width={84} 
                    height={84} 
                    className="object-contain drop-shadow-sm" 
                    priority 
                  />
                </div>
              </div>

              {/* Title & Subtitle */}
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-[28px] font-extrabold text-zinc-900 tracking-tight">
                  Admin Console
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1">
                  Sign in to access your administrative dashboard
                </p>
              </div>

              {/* Session Timeout Banner */}
              {isTimeout && (
                <AlertBanner
                  type="warning"
                  message="Administrative session timed out. Re-authenticate to access the console."
                  className="mb-4 text-xs"
                />
              )}

              {/* Error Notice */}
              {error && (
                <AlertBanner
                  type="error"
                  message={error}
                  className="mb-4 text-xs"
                />
              )}

              {requireSetup ? (
                /* ── Mandatory 2FA Enrollment ── */
                <form onSubmit={handleSetupSubmit} className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-left space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 mb-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>MFA Required</span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900">
                      Set up two-factor authentication
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Scan this QR code with Google Authenticator, 1Password, or Authy, then enter the 6-digit code.
                    </p>
                  </div>

                  {setupData?.qrCodeSvg && (
                    <div className="flex flex-col items-center gap-2 p-3 bg-zinc-50 rounded-2xl border border-zinc-200">
                      <div
                        className="mx-auto w-[160px] h-[160px] bg-white rounded-xl p-2 shadow-xs border border-zinc-200 [&>svg]:w-full [&>svg]:h-full"
                        aria-label="Authenticator QR code"
                        dangerouslySetInnerHTML={{ __html: setupData.qrCodeSvg }}
                      />
                      <span className="text-[11px] text-zinc-500">
                        Scan with your authenticator app
                      </span>
                    </div>
                  )}

                  {setupData?.formattedSecret && (
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-zinc-600 text-[11px]">
                          Can&apos;t scan? Manual Key
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(setupData.formattedSecret || '', true)}
                          className="text-[11px] font-semibold text-[#0F5132] hover:text-[#0A3D24] flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="text-xs font-mono text-zinc-900 font-bold break-all select-all">
                        {setupData.formattedSecret}
                      </div>
                    </div>
                  )}

                  {setupData?.rawCodes && setupData.rawCodes.length > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Emergency Recovery Codes
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyToClipboard((setupData.rawCodes || []).join('\n'), false)}
                            className="text-[11px] font-semibold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            {copiedCodes ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedCodes ? 'Copied' : 'Copy'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={downloadRecoveryCodes}
                            className="text-[11px] font-semibold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 font-mono text-xs text-zinc-800 select-all">
                        {setupData.rawCodes.map((c) => (
                          <span key={c} className="bg-white border border-zinc-200 rounded px-2 py-1 text-center font-bold">
                            {c}
                          </span>
                        ))}
                      </div>

                      <label className="flex items-start gap-2 text-xs text-zinc-700 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-zinc-300 text-[#0F5132] focus:ring-[#0F5132] cursor-pointer"
                          checked={codesAcknowledged}
                          onChange={(e) => setCodesAcknowledged(e.target.checked)}
                        />
                        <span className="text-[11.5px] leading-tight">I have saved these emergency recovery codes in a secure location.</span>
                      </label>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label htmlFor="setup-code" className="block text-xs font-semibold text-zinc-700">
                      6-digit code from authenticator
                    </label>
                    <input
                      id="setup-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                      maxLength={6}
                      className="block w-full px-4 py-2.5 border border-zinc-200 rounded-xl bg-zinc-50 text-center text-lg font-mono font-bold tracking-[0.25em] text-zinc-900 focus:border-[#0F5132] focus:ring-2 focus:ring-[#0F5132]/10 outline-none transition-all placeholder:text-zinc-400"
                      placeholder="000000"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      disabled={isLoading || twoFactorCode.length !== 6 || !codesAcknowledged}
                      className="w-full h-12 inline-flex items-center justify-center gap-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-2xl transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
                      className="w-full text-center text-xs font-medium text-zinc-500 hover:text-zinc-800 cursor-pointer py-1"
                    >
                      &larr; Cancel and return to sign in
                    </button>
                  </div>
                </form>
              ) : requireTwoFactor ? (
                /* ── 2FA Challenge ── */
                <form onSubmit={handle2FASubmit} className="space-y-5 animate-in fade-in duration-200">
                  <div className="text-left space-y-1">
                    <div className="w-10 h-10 rounded-xl bg-[#EEF4EC] border border-[#DCE5DA] flex items-center justify-center text-[#0F5132] mb-2">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-zinc-900">
                      Two-Factor Authentication
                    </h3>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      {useRecoveryCode
                        ? 'Enter one of your 8-character emergency backup recovery codes.'
                        : 'Enter the 6-digit verification code from your authenticator app.'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-zinc-700">
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
                        className="block w-full pl-10 pr-4 py-2.5 border border-zinc-200 rounded-xl bg-zinc-50 text-center text-base sm:text-lg font-mono font-bold tracking-[0.2em] text-zinc-900 focus:border-[#0F5132] focus:ring-2 focus:ring-[#0F5132]/10 outline-none transition-all placeholder:text-zinc-400"
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
                      className="text-xs font-bold text-[#0F5132] hover:underline cursor-pointer"
                    >
                      {useRecoveryCode ? 'Use authenticator app code' : 'Use emergency recovery code'}
                    </button>
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      disabled={isLoading || !twoFactorCode.trim()}
                      className="w-full h-12 inline-flex items-center justify-center gap-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-2xl transition-all shadow-sm cursor-pointer disabled:opacity-40"
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
                      className="w-full text-center text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer py-1"
                    >
                      &larr; Back to login
                    </button>
                  </div>
                </form>
              ) : (
                /* ── Primary Credential Login Form (Exact Mockup Match) ── */
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Field 1: Work Email Address */}
                  <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 px-4 flex items-center gap-3.5 focus-within:border-[#0F5132] focus-within:ring-2 focus-within:ring-[#0F5132]/10 transition-all shadow-2xs">
                    <Mail className="w-5 h-5 text-zinc-500 stroke-[1.75] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <label className="block text-[11px] font-semibold text-zinc-600 leading-none mb-1">
                        Work Email Address
                      </label>
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        className="w-full text-sm text-zinc-900 placeholder:text-zinc-400 outline-none bg-transparent leading-none"
                        placeholder="admin@akwaabahomes.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Field 2: Password */}
                  <div className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 px-4 flex items-center gap-3.5 focus-within:border-[#0F5132] focus-within:ring-2 focus-within:ring-[#0F5132]/10 transition-all shadow-2xs">
                    <Lock className="w-5 h-5 text-zinc-500 stroke-[1.75] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between leading-none mb-1">
                        <label className="block text-[11px] font-semibold text-zinc-600">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowRecoveryModal(true)}
                          className="text-xs font-bold text-[#0F5132] hover:text-[#0A3D24] hover:underline transition-colors cursor-pointer"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="current-password"
                          className="w-full text-sm text-zinc-900 placeholder:text-zinc-400 outline-none bg-transparent leading-none"
                          placeholder="Enter your password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer shrink-0"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sign In Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-12 sm:h-13 bg-[#04793d] hover:bg-[#035f30] active:bg-[#024a25] text-white font-bold text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2.5 shadow-sm shadow-[#04793d]/25 transition-all cursor-pointer"
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                          <span>Sign In</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              )}

              {/* Faint Divider with Security Check */}
              <div className="mt-7 flex items-center justify-center gap-3 select-none">
                <div className="flex-1 h-[1px] bg-zinc-200/80" />
                <div className="flex items-center gap-1.5 px-2 text-[11px] text-zinc-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#04793d] fill-[#04793d] text-white" />
                  <span>Secured by industry-standard encryption</span>
                </div>
                <div className="flex-1 h-[1px] bg-zinc-200/80" />
              </div>

            </div>

            {/* Mobile Copyright */}
            <div className="lg:hidden mt-6 text-center text-[11px] text-zinc-500 font-medium">
              &copy; {new Date().getFullYear()} AkwaabaHomes Ghana Ltd. | Admin Portal
            </div>

          </div>

      {/* ── Trouble Signing In / Forgot Password Modal ── */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="max-w-md w-full rounded-3xl bg-white border border-zinc-200 p-6 sm:p-7 space-y-4 shadow-xl relative text-left">
            <button
              onClick={() => setShowRecoveryModal(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <KeyRound className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-zinc-900">Account Recovery Protocol</h3>
              <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                For administrative compliance under the Ghana Data Protection Act (Act 843), admin accounts cannot be self-reset through automated email links without MFA.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2 text-xs">
              <div className="font-semibold text-zinc-800">Recommended Steps:</div>
              <ul className="list-disc pl-4 space-y-1.5 text-zinc-600 text-xs">
                <li>If you lost your 2FA device, use one of your 10 saved Emergency Recovery Codes.</li>
                <li>Contact a Super Administrator at HQ to rotate your password or reset your MFA.</li>
                <li>For urgent infrastructure matters, email <span className="font-mono text-[#0F5132] font-semibold">security@akwaabahomes.com</span></li>
              </ul>
            </div>

            <button
              onClick={() => setShowRecoveryModal(false)}
              className="w-full h-10 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
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
    <Suspense fallback={<div className="-mt-16 min-h-screen bg-[#F4FBF7]" />}>
      <AdminLoginForm />
    </Suspense>
  );
}
