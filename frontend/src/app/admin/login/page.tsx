'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  X,
  ShieldCheck,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';
import { publicGet } from '@/lib/publicFetch';
import AlertBanner from '@/components/AlertBanner';
import toast from 'react-hot-toast';

function AdminLoginForm() {
  const router = useRouter();
  const [isTimeout, setIsTimeout] = useState(false);
  useEffect(() => { setIsTimeout(new URLSearchParams(window.location.search).get('reason') === 'timeout'); }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if admin is already authenticated
  const { data: sessionData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const data = await publicGet<{ user?: any }>('/auth/session');
        return data?.user || null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('reason') !== 'timeout' && sessionData && ['ADMIN', 'SUPER_ADMIN'].includes(sessionData.role) && !isTimeout) {
      window.location.href = '/admin/dashboard';
    }
  }, [sessionData, isTimeout]);

  // Lock document/body scroll on desktop viewports so admin login stays 100% stationary and perfectly proportioned
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      } else {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
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
      if (typeof window !== 'undefined') {
        localStorage.setItem('akwaaba_last_active', String(Date.now()));
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


  // Active Authenticated State
  if (mounted && sessionData && ['ADMIN', 'SUPER_ADMIN'].includes(sessionData.role) && !isTimeout) {
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
              className="w-full h-12 bg-[#15803D] hover:bg-[#166534] text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>Go to Admin Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                try {
                  await api.post('/auth/logout');
                } catch (e) {}
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

  const renderCardContent = (formPrefix: 'desktop' | 'mobile') => (
    <>
      {/* Shield Icon Badge */}
      <div className="flex justify-center mb-3">
        <div className="w-16 h-16 xl:w-20 xl:h-20 relative flex items-center justify-center">
          <Image 
            src="/images/auth/admin-shield-icon.png" 
            alt="Admin Security" 
            width={76} 
            height={76} 
            className="object-contain drop-shadow-sm" fetchPriority="high" decoding="sync" quality={65} sizes="76px" 
            priority 
          />
        </div>
      </div>

      {/* Title & Subtitle */}
      <div className="text-center mb-5 xl:mb-6">
        <h2 className="text-xl xl:text-2xl font-black text-zinc-900 tracking-tight">
          Admin Console
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
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
                className="mx-auto w-[150px] h-[150px] bg-white rounded-xl p-2 shadow-xs border border-zinc-200 [&>svg]:w-full [&>svg]:h-full"
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
                  id={`${formPrefix}-codes-ack`} name="codesAcknowledged" type="checkbox"
                  className="mt-0.5 rounded border-zinc-300 text-[#0F5132] focus:ring-[#0F5132] cursor-pointer"
                  checked={codesAcknowledged}
                  onChange={(e) => setCodesAcknowledged(e.target.checked)}
                />
                <span className="text-[11.5px] leading-tight">I have saved these emergency recovery codes in a secure location.</span>
              </label>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor={`${formPrefix}-setup-code`} className="block text-xs font-semibold text-zinc-700">
              6-digit code from authenticator
            </label>
            <input
              id={`${formPrefix}-setup-code`} name="twoFactorSetupCode"
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
              className="w-full h-11 xl:h-12 inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-2xl transition-all shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
        <form onSubmit={handle2FASubmit} className="space-y-4 animate-in fade-in duration-200">
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
            <label htmlFor={`${formPrefix}-admin-2fa`} className="block text-xs font-semibold text-zinc-700">
              {useRecoveryCode ? 'Emergency recovery code' : 'Security verification code'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                id={`${formPrefix}-admin-2fa`} name="twoFactorCode" autoComplete="one-time-code" maxLength={useRecoveryCode ? 10 : 6}
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
              className="w-full h-11 xl:h-12 inline-flex items-center justify-center gap-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-2xl transition-all shadow-sm cursor-pointer disabled:opacity-40"
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
        <form onSubmit={handleSubmit} className="space-y-3.5 xl:space-y-4">
          
          {/* Field 1: Work Email Address */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3 xl:p-3.5 px-4 flex items-center gap-3.5 focus-within:border-[#0F5132] focus-within:ring-2 focus-within:ring-[#0F5132]/10 transition-all shadow-2xs">
            <Mail className="w-4 h-4 xl:w-5 xl:h-5 text-zinc-500 stroke-[1.75] shrink-0" />
            <div className="flex-1 min-w-0">
              <label htmlFor={`${formPrefix}-admin-email`} className="block text-[10.5px] xl:text-[11px] font-semibold text-zinc-600 leading-none mb-1">
                Work Email Address
              </label>
              <input
                id={`${formPrefix}-admin-email`} name="email" type="email"
                required
                autoComplete="email"
                className="w-full text-xs xl:text-sm text-zinc-900 placeholder:text-zinc-400 outline-none bg-transparent leading-none"
                placeholder="admin@akwaabahomes.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          {/* Field 2: Password */}
          <div className="rounded-2xl border border-zinc-200/90 bg-white p-3 xl:p-3.5 px-4 flex items-center gap-3.5 focus-within:border-[#0F5132] focus-within:ring-2 focus-within:ring-[#0F5132]/10 transition-all shadow-2xs">
            <Lock className="w-4 h-4 xl:w-5 xl:h-5 text-zinc-500 stroke-[1.75] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between leading-none mb-1">
                <label htmlFor={`${formPrefix}-admin-password`} className="block text-[10.5px] xl:text-[11px] font-semibold text-zinc-600">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(true)}
                  className="min-h-[24px] py-1 -my-1 inline-flex items-center text-[11px] xl:text-xs font-bold text-[#0F5132] hover:text-[#0A3D24] hover:underline transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <input
                  id={`${formPrefix}-admin-password`} name="password" type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  className="w-full text-xs xl:text-sm text-zinc-900 placeholder:text-zinc-400 outline-none bg-transparent leading-none"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="min-w-[24px] min-h-[24px] flex items-center justify-center text-zinc-500 hover:text-zinc-700 transition-colors cursor-pointer shrink-0"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Sign In Button */}
          <div className="pt-1.5">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 xl:h-12 bg-[#15803D] hover:bg-[#166534] active:bg-[#024a25] text-white font-bold text-xs xl:text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-sm shadow-[#04793d]/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 xl:w-5 xl:h-5 animate-spin" />
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
      <div className="mt-5 xl:mt-6 flex items-center justify-center gap-3 select-none">
        <div className="flex-1 h-[1px] bg-zinc-200/80" />
        <div className="flex items-center gap-1.5 px-2 text-[10.5px] xl:text-[11px] text-zinc-600 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#04793d] fill-[#04793d] text-white" />
          <span>Secured by industry-standard encryption</span>
        </div>
        <div className="flex-1 h-[1px] bg-zinc-200/80" />
      </div>
    </>
  );

  return (
    <div className="-mt-16 min-h-screen lg:h-screen lg:max-h-screen w-full bg-[#EBF7EE] text-[#141816] font-sans relative overflow-hidden">
      
      {/* ── Desktop View (Stationary, Full 16:9 2K Scene, Zero Cropping, Crisp DOM Typography) ── */}
      <div className="hidden lg:block w-full h-full max-h-screen overflow-hidden relative select-none">
        {/* Full 2K Master Scene Background (Zero Baked Text) */}
        <Image
          src="/images/auth/admin-hero-scene-v2.png"
          alt="AkwaabaHomes Admin Portal"
          fill
          quality={75}
          sizes="100vw"
          className="object-fill pointer-events-none select-none"
        />

        {/* Authentic AkwaabaHomes Brand Logo & Slogan Overlay */}
        <Link 
          href="/" 
          className="absolute top-[4.5%] left-[4.8%] inline-flex items-center gap-3.5 group z-20 cursor-pointer"
          title="AkwaabaHomes Home"
        >
          <div className="w-10 h-10 xl:w-11 xl:h-11 flex items-center justify-center shrink-0">
            <Image 
              src="/images/auth/akwaaba-emblem.png" 
              alt="AkwaabaHomes" 
              width={44} 
              height={44} 
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-xs" 
              quality={65}
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-xl xl:text-2xl font-black text-zinc-900 tracking-tight">
              AkwaabaHomes
            </span>
            <span className="text-[11px] xl:text-xs font-semibold text-[#3B6E5C] mt-1 tracking-normal">
              Live Well. Feel at Home.
            </span>
          </div>
        </Link>

        {/* ── Left Hero Crisp DOM Typography (Admin Portal, Headline, Subtitle, Feature Badges) ── */}
        <div 
          className="absolute z-20 flex flex-col justify-start pointer-events-auto select-none"
          style={{
            left: '4.8%',
            top: '18.5%',
            width: '38%',
            maxWidth: '460px',
          }}
        >
          {/* Admin Portal Pill */}
          <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#04793d] text-white text-[11px] xl:text-xs font-bold tracking-wide w-fit shadow-2xs">
            Admin Portal
          </div>

          {/* Headline */}
          <h1 className="mt-3.5 xl:mt-4 text-3xl xl:text-[38px] 2xl:text-[42px] font-black text-zinc-950 tracking-tight leading-[1.12]">
            Welcome Back,<br />
            Administrator!
          </h1>

          {/* Subtitle */}
          <p className="mt-2.5 xl:mt-3 text-xs xl:text-sm text-zinc-600 font-medium leading-relaxed max-w-[360px]">
            Manage users, properties, and system settings from your secure dashboard.
          </p>

          {/* 3 Feature Items */}
          <div className="mt-5 xl:mt-6 flex flex-col gap-2.5 xl:gap-3">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 xl:w-7 xl:h-7 rounded-full bg-[#04793d] flex items-center justify-center text-white shrink-0 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 xl:w-4 xl:h-4 stroke-[2.5]" />
              </div>
              <span className="text-xs xl:text-sm font-semibold text-zinc-900 tracking-tight">
                Secure Access
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-6 h-6 xl:w-7 xl:h-7 rounded-full bg-[#04793d] flex items-center justify-center text-white shrink-0 shadow-2xs">
                <TrendingUp className="w-3.5 h-3.5 xl:w-4 xl:h-4 stroke-[2.5]" />
              </div>
              <span className="text-xs xl:text-sm font-semibold text-zinc-900 tracking-tight">
                Real-Time Management
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-6 h-6 xl:w-7 xl:h-7 rounded-full bg-[#04793d] flex items-center justify-center text-white shrink-0 shadow-2xs">
                <SlidersHorizontal className="w-3.5 h-3.5 xl:w-4 xl:h-4 stroke-[2.5]" />
              </div>
              <span className="text-xs xl:text-sm font-semibold text-zinc-900 tracking-tight">
                Complete Control
              </span>
            </div>
          </div>
        </div>

        {/* Floating White Authentication Card (Overlays Card Region Perfectly) */}
        <div 
          className="absolute z-20 flex flex-col justify-center pointer-events-auto"
          style={{
            left: '66.89%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '38%',
            maxWidth: '450px',
            maxHeight: '92vh',
          }}
        >
          <div className="w-full bg-white rounded-[28px] xl:rounded-[32px] p-6 xl:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] border border-zinc-100 overflow-y-auto">
            {renderCardContent('desktop')}
          </div>
        </div>

        {/* Bottom-Left Crisp Copyright Folio (Over Dark Green Wave) */}
        <div 
          className="absolute z-20 pointer-events-none select-none text-[11px] xl:text-xs text-white/90 font-medium tracking-wide drop-shadow-xs"
          style={{
            left: '4.8%',
            bottom: '4.2%',
          }}
        >
          &copy; {new Date().getFullYear()} AkwaabaHomes Ghana Ltd. | Admin Portal
        </div>
      </div>

      {/* ── Mobile View (< lg) ── */}
      <div className="lg:hidden flex flex-col w-full min-h-screen bg-[#F4FBF7]">
        {/* Mobile Top Header */}
        <div className="w-full px-5 py-4 flex items-center justify-between bg-white border-b border-zinc-200/70 shadow-2xs">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image 
              src="/images/auth/akwaaba-emblem.png" 
              alt="AkwaabaHomes" 
              width={36} 
              height={36} 
              className="w-9 h-9 object-contain drop-shadow-xs" fetchPriority="high" quality={65} 
              priority 
            />
            <div className="flex flex-col leading-none">
              <span className="text-base font-black text-zinc-900 tracking-tight">AkwaabaHomes</span>
              <span className="text-[10px] font-semibold text-[#3B6E5C] mt-0.5">Live Well. Feel at Home.</span>
            </div>
          </Link>
          <span className="px-2.5 py-1 rounded-full bg-[#04793d] text-white text-[10.5px] font-bold">
            Admin Portal
          </span>
        </div>

        {/* Mobile Card Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-[420px] bg-white rounded-2xl p-6 shadow-md border border-zinc-200/80">
            {renderCardContent('mobile')}
          </div>
        </div>

        {/* Mobile Footer */}
        <div className="py-4 text-center text-[11px] text-zinc-500 font-medium border-t border-zinc-200/50 bg-white">
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
  return <AdminLoginForm />;
}
