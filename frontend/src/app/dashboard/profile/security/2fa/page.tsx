'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  ShieldCheck,
  KeyRound,
  QrCode,
  Copy,
  Check,
  Download,
  Printer,
  ChevronLeft,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Loader2,
  MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TwoFactorStatusResponse {
  twoFactorEnabled: boolean;
  remainingRecoveryCodes: number;
}

interface SetupData {
  secret: string;
  formattedSecret: string;
  qrCodeSvg: string;
  rawCodes: string[];
  otpauthUri: string;
  message?: string;
}

function TwoFactorStudioContent() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Active step in enrollment: 1 = Scan QR, 2 = Backup Codes, 3 = Verify & Activate
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [verificationMethod, setVerificationMethod] = useState<'app' | 'sms'>('app');

  // Verification Inputs
  const [totpCode, setTotpCode] = useState(['', '', '', '', '', '']);
  const [smsCode, setSmsCode] = useState(['', '', '', '', '', '']);
  const [savedCodesConfirmed, setSavedCodesConfirmed] = useState(false);

  // Copy states
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedAllCodes, setCopiedAllCodes] = useState(false);
  const [copiedSingleIndex, setCopiedSingleIndex] = useState<number | null>(null);

  // SMS cooldown timer
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [maskedPhone, setMaskedPhone] = useState<string>('');

  // Modals for enrolled users
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [disableAuthType, setDisableAuthType] = useState<'password' | 'code'>('password');
  const [disableAuthValue, setDisableAuthValue] = useState('');

  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [regenAuthType, setRegenAuthType] = useState<'password' | 'code'>('password');
  const [regenAuthValue, setRegenAuthValue] = useState('');
  const [freshRecoveryCodes, setFreshRecoveryCodes] = useState<string[] | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const smsInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Fetch current 2FA status
  const { data: statusData, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery<TwoFactorStatusResponse>({
    queryKey: ['2fa-status'],
    queryFn: async () => {
      const res = await api.get('/auth/2fa/status');
      return res.data;
    }
  });

  // 2. Fetch User Profile to get phone number
  const { data: userProfile } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data?.user;
    }
  });

  // 3. Query or initialize 2FA Setup
  const { data: setupData, isLoading: isLoadingSetup, refetch: refetchSetup } = useQuery<SetupData>({
    queryKey: ['2fa-setup-data'],
    queryFn: async () => {
      const res = await api.post('/auth/2fa/setup');
      return res.data;
    },
    enabled: statusData?.twoFactorEnabled === false,
    staleTime: 5 * 60 * 1000
  });

  // Timer countdown for SMS resend
  useEffect(() => {
    if (smsCooldown <= 0) return;
    const interval = setInterval(() => {
      setSmsCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [smsCooldown]);

  // Handle segmented code input for Authenticator App
  const handleDigitChange = (index: number, val: string, isSms: boolean = false) => {
    const sanitized = val.replace(/\D/g, '');
    const targetArr = isSms ? [...smsCode] : [...totpCode];
    const targetSet = isSms ? setSmsCode : setTotpCode;
    const refs = isSms ? smsInputRefs : inputRefs;

    if (sanitized.length > 1) {
      const digits = sanitized.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        targetArr[i] = digits[i] || '';
      }
      targetSet(targetArr);
      const nextIndex = Math.min(digits.length, 5);
      refs.current[nextIndex]?.focus();
      return;
    }

    targetArr[index] = sanitized;
    targetSet(targetArr);

    if (sanitized && index < 5) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>, isSms: boolean = false) => {
    const targetArr = isSms ? smsCode : totpCode;
    const refs = isSms ? smsInputRefs : inputRefs;

    if (e.key === 'Backspace' && !targetArr[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  // 4. Mutation: Verify & Enable with Authenticator App Code
  const enableMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post('/auth/2fa/enable', { code });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Two-Factor Authentication is now active!');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      refetchStatus();
      setTotpCode(['', '', '', '', '', '']);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Invalid 6-digit code. Please check your app and try again.');
    }
  });

  // 5. Mutation: Send SMS OTP
  const sendSmsMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/auth/2fa/sms/send');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Verification code sent to your phone');
      if (data.maskedPhone) setMaskedPhone(data.maskedPhone);
      setSmsCooldown(60);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Could not send SMS verification code');
    }
  });

  // 6. Mutation: Verify SMS OTP
  const verifySmsMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post('/auth/2fa/sms/verify', { code });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'SMS code verified. Two-Factor Authentication is on!');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      refetchStatus();
      setSmsCode(['', '', '', '', '', '']);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Invalid or expired SMS code');
    }
  });

  // 7. Mutation: Disable 2FA
  const disableMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {};
      if (disableAuthType === 'password') payload.password = disableAuthValue;
      else payload.code = disableAuthValue;

      const res = await api.post('/auth/2fa/disable', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Two-Factor Authentication turned off');
      setDisableModalOpen(false);
      setDisableAuthValue('');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      refetchStatus();
      refetchSetup();
      setCurrentStep(1);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to turn off 2FA. Please check your credentials.');
    }
  });

  // 8. Mutation: Regenerate Recovery Codes
  const regenCodesMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {};
      if (regenAuthType === 'password') payload.password = regenAuthValue;
      else payload.code = regenAuthValue;

      const res = await api.post('/auth/2fa/recovery-codes/regenerate', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'New recovery codes generated!');
      setFreshRecoveryCodes(data.rawCodes || []);
      setRegenAuthValue('');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Could not generate new recovery codes');
    }
  });

  // Helper actions
  const handleCopySecret = () => {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopiedSecret(true);
    toast.success('Key copied to clipboard');
    setTimeout(() => setCopiedSecret(false), 2500);
  };

  const handleCopyAllCodes = (codesList: string[]) => {
    if (!codesList.length) return;
    navigator.clipboard.writeText(codesList.join('\n'));
    setCopiedAllCodes(true);
    toast.success('All 8 recovery codes copied');
    setTimeout(() => setCopiedAllCodes(false), 2500);
  };

  const handleCopySingleCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedSingleIndex(idx);
    toast.success(`Code #${idx + 1} copied`);
    setTimeout(() => setCopiedSingleIndex(null), 2000);
  };

  const handleDownloadCodes = (codesList: string[]) => {
    if (!codesList.length) return;
    const content =
      `AKWAABA HOMES - 2FA BACKUP RECOVERY CODES\n` +
      `Account: ${userProfile?.email || 'User'}\n` +
      `Date: ${new Date().toLocaleDateString()}\n\n` +
      `Each code can only be used ONCE if you lose access to your phone or authenticator app.\n` +
      `Keep this file safe and private.\n\n` +
      codesList.map((c, i) => `[${i + 1}]  ${c}`).join('\n') +
      `\n\nNeed help? Contact support@akwaabahomes.com`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `akwaaba-backup-codes-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Backup codes saved to file');
  };

  const handlePrintSheet = () => {
    window.print();
  };

  const isEnrolled = statusData?.twoFactorEnabled === true;
  const codesToDisplay = freshRecoveryCodes || setupData?.rawCodes || [];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0B0D12] text-zinc-900 dark:text-zinc-100 antialiased pb-24">
      
      {/* ── BREADCRUMB & HEADER ── */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                <Link href="/dashboard/profile" className="hover:text-[#0F5132] dark:hover:text-emerald-400 transition-colors">
                  Profile
                </Link>
                <span>/</span>
                <Link href="/dashboard/profile/security" className="hover:text-[#0F5132] dark:hover:text-emerald-400 transition-colors">
                  Security
                </Link>
                <span>/</span>
                <span className="text-zinc-900 dark:text-white font-medium">Two-Factor Authentication</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/profile/security"
                  className="p-1 -ml-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  title="Return to Security Settings"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                    Two-Factor Authentication
                  </h1>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    Add an extra layer of protection to your account whenever you sign in or withdraw funds.
                  </p>
                </div>
              </div>
            </div>

            {/* Enrolled Status Pill */}
            <div className="flex items-center gap-3 sm:self-center">
              {isLoadingStatus ? (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0F5132] dark:text-emerald-400" />
                  <span>Checking status...</span>
                </div>
              ) : isEnrolled ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Enabled</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-full text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Not Enabled</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">

        {/* ── ENROLLED STATE WORKSTATION (Clean, Direct Ledger) ── */}
        {isEnrolled && (
          <div className="space-y-8 print:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
            
            {/* Top Active Status & Actions */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800/60 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
                    Two-Factor Authentication is on
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
                    Whenever you log in from a new device or initiate a sensitive action, we will ask for a verification code from your authenticator app.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    setRegenAuthValue('');
                    setRegenModalOpen(true);
                  }}
                  className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-900 dark:text-white rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  New Recovery Codes
                </button>
                <button
                  onClick={() => {
                    setDisableAuthValue('');
                    setDisableModalOpen(true);
                  }}
                  className="px-4 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-medium transition-all flex items-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Turn Off 2FA
                </button>
              </div>
            </div>

            {/* Recovery Codes Status Ledger */}
            <div className="pt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                  <span>Emergency Recovery Codes:</span>
                  <span className="text-[#0F5132] dark:text-emerald-400 font-bold">
                    {statusData?.remainingRecoveryCodes ?? 8} of 8 remaining
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Each backup code can be used once if you lose your phone.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handlePrintSheet}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Backup Sheet
                </button>
              </div>
            </div>

            {/* Newly Generated Codes Reveal */}
            {freshRecoveryCodes && freshRecoveryCodes.length > 0 && (
              <div className="pt-8 space-y-4">
                <div className="border-l-2 border-amber-500 pl-4 py-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>New Backup Codes Generated</span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Your previous codes no longer work. Save these 8 new codes in a secure place.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCopyAllCodes(freshRecoveryCodes)}
                      className="text-xs font-medium text-[#0F5132] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedAllCodes ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      Copy All
                    </button>
                    <button
                      onClick={() => handleDownloadCodes(freshRecoveryCodes)}
                      className="text-xs font-medium text-[#0F5132] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {freshRecoveryCodes.map((code, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleCopySingleCode(code, idx)}
                      className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-center font-mono font-medium text-xs text-zinc-900 dark:text-white hover:border-[#0F5132] dark:hover:border-emerald-500 cursor-pointer transition-colors relative group"
                      title="Click to copy single code"
                    >
                      {copiedSingleIndex === idx ? (
                        <span className="text-emerald-600 flex items-center justify-center gap-1 text-[11px]">
                          <Check className="w-3 h-3" /> Copied
                        </span>
                      ) : (
                        code
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── ONBOARDING WORKSTATION (NOT ENROLLED) ── */}
        {!isEnrolled && (
          <div className="space-y-10 print:hidden">
            
            {/* Setup Steps (Horizontal Clean Progress Bar) */}
            <div className="border-b border-zinc-200 dark:border-zinc-800 pb-5">
              <div className="grid grid-cols-3 gap-3">
                
                {/* Step 1 */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`text-left pb-3 border-b-2 transition-all cursor-pointer ${
                    currentStep === 1
                      ? 'border-[#0F5132] dark:border-emerald-400 text-zinc-900 dark:text-white'
                      : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                >
                  <div className="text-xs font-semibold">1. Connect App</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:block mt-0.5">Scan QR code</div>
                </button>

                {/* Step 2 */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className={`text-left pb-3 border-b-2 transition-all cursor-pointer ${
                    currentStep === 2
                      ? 'border-[#0F5132] dark:border-emerald-400 text-zinc-900 dark:text-white'
                      : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                >
                  <div className="text-xs font-semibold">2. Backup Codes</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:block mt-0.5">Save emergency keys</div>
                </button>

                {/* Step 3 */}
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className={`text-left pb-3 border-b-2 transition-all cursor-pointer ${
                    currentStep === 3
                      ? 'border-[#0F5132] dark:border-emerald-400 text-zinc-900 dark:text-white'
                      : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                  }`}
                >
                  <div className="text-xs font-semibold">3. Verify</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:block mt-0.5">Confirm with a code</div>
                </button>

              </div>
            </div>

            {/* Active Stage Content */}
            <div>
              {isLoadingSetup ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-7 h-7 animate-spin text-[#0F5132] dark:text-emerald-400" />
                  <span className="text-xs text-zinc-500">Preparing your security setup...</span>
                </div>
              ) : !setupData ? (
                <div className="py-16 text-center space-y-4">
                  <p className="text-xs text-rose-500 font-medium">Could not start 2FA setup. Please try again.</p>
                  <button
                    onClick={() => refetchSetup()}
                    className="px-5 py-2.5 bg-[#0F5132] text-white rounded-xl text-xs font-medium cursor-pointer"
                  >
                    Retry Setup
                  </button>
                </div>
              ) : (
                <div className="max-w-xl">
                  
                  {/* ──── STAGE 1: QR CODE & MANUAL SECRET ──── */}
                  {currentStep === 1 && (
                    <div className="space-y-8">
                      <div className="space-y-1.5">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                          Scan with your authenticator app
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          Open Google Authenticator, Apple Passwords, Microsoft Authenticator, or Authy on your phone and scan this QR code.
                        </p>
                      </div>

                      {/* QR Code Presentation */}
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 py-2">
                        <div className="p-3 bg-white rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-center w-[200px] h-[200px] shrink-0">
                          {setupData.qrCodeSvg ? (
                            <div
                              className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                              dangerouslySetInnerHTML={{ __html: setupData.qrCodeSvg }}
                            />
                          ) : (
                            <QrCode className="w-16 h-16 text-zinc-300" />
                          )}
                        </div>

                        <div className="space-y-4 text-center sm:text-left">
                          <div>
                            <span className="text-xs text-zinc-400">Account</span>
                            <div className="text-sm font-medium text-zinc-900 dark:text-white mt-0.5">
                              {userProfile?.email || 'Akwaaba Resident'}
                            </div>
                          </div>

                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            After scanning, your app will start generating 6-digit codes that refresh every 30 seconds.
                          </p>

                          <div className="pt-1 text-xs text-zinc-400">
                            Works with Google Authenticator, iCloud Keychain, 1Password, and Authy.
                          </div>
                        </div>
                      </div>

                      {/* Manual Entry Fallback */}
                      <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-6 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500 dark:text-zinc-400">
                            Can&apos;t scan? Enter code manually:
                          </span>
                          <button
                            type="button"
                            onClick={handleCopySecret}
                            className="font-medium text-[#0F5132] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            {copiedSecret ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedSecret ? 'Copied' : 'Copy Key'}</span>
                          </button>
                        </div>

                        <div className="font-mono text-xs font-semibold text-[#0F5132] dark:text-emerald-400 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 tracking-wider text-center select-all">
                          {setupData.formattedSecret || setupData.secret}
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="px-6 py-3 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                        >
                          <span>Next: Backup Codes</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ──── STAGE 2: 8 EMERGENCY BACKUP CODES ──── */}
                  {currentStep === 2 && (
                    <div className="space-y-8">
                      <div className="space-y-1.5">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                          Save your backup recovery codes
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          If you ever lose your phone, each of these 8 one-time codes can be used once to sign back into your account.
                        </p>
                      </div>

                      {/* Top Action Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          8 Single-Use Codes
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleCopyAllCodes(setupData.rawCodes)}
                            className="text-xs font-medium text-[#0F5132] dark:text-emerald-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedAllCodes ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            Copy All
                          </button>
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <button
                            type="button"
                            onClick={() => handleDownloadCodes(setupData.rawCodes)}
                            className="text-xs font-medium text-[#0F5132] dark:text-emerald-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Download .txt
                          </button>
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <button
                            type="button"
                            onClick={handlePrintSheet}
                            className="text-xs font-medium text-[#0F5132] dark:text-emerald-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" /> Print
                          </button>
                        </div>
                      </div>

                      {/* 8 Codes Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {setupData.rawCodes.map((code, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleCopySingleCode(code, idx)}
                            className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl text-center font-mono font-medium text-xs text-zinc-900 dark:text-white hover:border-[#0F5132] dark:hover:border-emerald-500 cursor-pointer transition-colors relative group"
                            title="Click to copy single code"
                          >
                            <div className="text-[10px] text-zinc-400 mb-0.5">#{idx + 1}</div>
                            {copiedSingleIndex === idx ? (
                              <span className="text-emerald-600 flex items-center justify-center gap-1 text-[11px]">
                                <Check className="w-3 h-3" /> Copied
                              </span>
                            ) : (
                              code
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Confirmation Checkbox */}
                      <div className="pt-2">
                        <label className="flex items-start gap-3 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={savedCodesConfirmed}
                            onChange={(e) => setSavedCodesConfirmed(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-[#0F5132] focus:ring-[#0F5132] accent-[#0F5132] cursor-pointer"
                          />
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                            I have saved my backup recovery codes in a safe place.
                          </div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between pt-6 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(1)}
                          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                        >
                          &larr; Back to QR code
                        </button>

                        <button
                          type="button"
                          disabled={!savedCodesConfirmed}
                          onClick={() => setCurrentStep(3)}
                          className="px-6 py-3 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <span>Next: Verify</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ──── STAGE 3: VERIFY & ACTIVATE ──── */}
                  {currentStep === 3 && (
                    <div className="space-y-8">
                      <div className="space-y-1.5">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                          Confirm verification code
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                          Enter the 6-digit code currently shown in your authenticator app to complete setup.
                        </p>
                      </div>

                      {/* Dual Method Tabs */}
                      <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                        <button
                          type="button"
                          onClick={() => setVerificationMethod('app')}
                          className={`text-xs font-medium pb-2 transition-all cursor-pointer flex items-center gap-2 border-b-2 -mb-2.5 ${
                            verificationMethod === 'app'
                              ? 'border-[#0F5132] text-[#0F5132] dark:border-emerald-400 dark:text-emerald-400'
                              : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                          }`}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          Authenticator Code
                        </button>
                        <button
                          type="button"
                          onClick={() => setVerificationMethod('sms')}
                          className={`text-xs font-medium pb-2 transition-all cursor-pointer flex items-center gap-2 border-b-2 -mb-2.5 ${
                            verificationMethod === 'sms'
                              ? 'border-[#0F5132] text-[#0F5132] dark:border-emerald-400 dark:text-emerald-400'
                              : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
                          }`}
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          SMS Backup
                        </button>
                      </div>

                      {/* ── METHOD A: AUTHENTICATOR APP INPUT ── */}
                      {verificationMethod === 'app' && (
                        <div className="space-y-6 pt-2">
                          <div>
                            <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-2">
                              Enter the 6-digit code from your app:
                            </label>

                            <div className="flex items-center gap-2 sm:gap-3 py-2">
                              {totpCode.map((digit, index) => (
                                <input
                                  key={index}
                                  ref={(el) => {
                                    inputRefs.current[index] = el;
                                  }}
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={1}
                                  value={digit}
                                  onChange={(e) => handleDigitChange(index, e.target.value, false)}
                                  onKeyDown={(e) => handleKeyDown(index, e, false)}
                                  className="w-11 sm:w-12 h-13 sm:h-14 text-center text-xl sm:text-2xl font-mono font-medium rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white focus:border-[#0F5132] dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-black focus:outline-none transition-all"
                                />
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={totpCode.join('').length !== 6 || enableMutation.isPending}
                            onClick={() => enableMutation.mutate(totpCode.join(''))}
                            className="w-full py-3.5 px-5 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {enableMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" /> Turn on Two-Factor Authentication
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* ── METHOD B: SMS OTP FALLBACK INPUT ── */}
                      {verificationMethod === 'sms' && (
                        <div className="space-y-6 pt-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
                            <div>
                              <span className="text-xs text-zinc-400">
                                Phone Number
                              </span>
                              <div className="text-xs font-medium text-zinc-900 dark:text-white mt-0.5">
                                {maskedPhone || userProfile?.phoneNumber || '+233 (Registered Number)'}
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={smsCooldown > 0 || sendSmsMutation.isPending}
                              onClick={() => sendSmsMutation.mutate()}
                              className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-900 dark:text-white rounded-xl text-xs font-medium flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                            >
                              {sendSmsMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <MessageSquare className="w-3.5 h-3.5" />
                              )}
                              {smsCooldown > 0 ? `Resend (${smsCooldown}s)` : 'Send SMS Code'}
                            </button>
                          </div>

                          <div>
                            <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-2">
                              Enter the 6-digit code received on your phone:
                            </label>

                            <div className="flex items-center gap-2 sm:gap-3 py-2">
                              {smsCode.map((digit, index) => (
                                <input
                                  key={index}
                                  ref={(el) => {
                                    smsInputRefs.current[index] = el;
                                  }}
                                  type="text"
                                  inputMode="numeric"
                                  maxLength={1}
                                  value={digit}
                                  onChange={(e) => handleDigitChange(index, e.target.value, true)}
                                  onKeyDown={(e) => handleKeyDown(index, e, true)}
                                  className="w-11 sm:w-12 h-13 sm:h-14 text-center text-xl sm:text-2xl font-mono font-medium rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white focus:border-[#0F5132] dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-black focus:outline-none transition-all"
                                />
                              ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={smsCode.join('').length !== 6 || verifySmsMutation.isPending}
                            onClick={() => verifySmsMutation.mutate(smsCode.join(''))}
                            className="w-full py-3.5 px-5 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {verifySmsMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" /> Confirm &amp; Turn On 2FA
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      <div className="flex justify-start pt-6 border-t border-zinc-200 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                        >
                          &larr; Back to backup codes
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>
        )}

        {/* ── PRINTABLE VOUCHER KEY SHEET (Hidden on screen, revealed during window.print()) ── */}
        <div className="hidden print:block font-sans p-8 space-y-6 max-w-2xl mx-auto border-2 border-dashed border-zinc-400 rounded-2xl">
          <div className="border-b-2 border-zinc-900 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-tight text-zinc-900">
                Akwaaba Homes
              </h1>
              <p className="text-xs text-zinc-600 uppercase tracking-wider">
                Emergency 2FA Backup Codes
              </p>
            </div>
            <div className="text-right text-xs">
              <div className="font-medium">{userProfile?.email}</div>
              <div className="text-zinc-500 font-mono">{new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div className="p-4 bg-zinc-100 rounded-xl text-xs text-zinc-800 space-y-1">
            <p className="font-semibold">Instructions:</p>
            <p>1. Store this sheet in a safe, private place.</p>
            <p>2. Each code can be entered once if you cannot access your authenticator app.</p>
            <p>3. Cross off used codes as you use them.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4">
            {codesToDisplay.map((code, idx) => (
              <div
                key={idx}
                className="p-3 border-2 border-zinc-300 rounded-xl text-center font-mono font-bold text-sm tracking-wider flex items-center justify-between px-4"
              >
                <span className="text-zinc-400 text-xs">#{idx + 1}</span>
                <span className="text-zinc-900">{code}</span>
                <span className="text-zinc-300 text-xs">[ ]</span>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-200 pt-4 text-[11px] text-zinc-500 text-center">
            Akwaaba Homes • Trusted Student &amp; Residential Marketplace
          </div>
        </div>

      </div>

      {/* ── MODAL: REGENERATE RECOVERY CODES ── */}
      {regenModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#12151D] rounded-2xl p-6 sm:p-8 max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-5">
            <div className="flex items-center gap-3 text-zinc-900 dark:text-white">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Generate new backup codes</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">All previous backup codes will be voided.</p>
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setRegenAuthType('password')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  regenAuthType === 'password' ? 'bg-white dark:bg-zinc-800 shadow-2xs text-zinc-900 dark:text-white' : 'text-zinc-500'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setRegenAuthType('code')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  regenAuthType === 'code' ? 'bg-white dark:bg-zinc-800 shadow-2xs text-zinc-900 dark:text-white' : 'text-zinc-500'
                }`}
              >
                Current 2FA Code
              </button>
            </div>

            <div>
              <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1.5">
                {regenAuthType === 'password' ? 'Account password' : '6-digit authenticator code'}
              </label>
              <input
                type={regenAuthType === 'password' ? 'password' : 'text'}
                placeholder={regenAuthType === 'password' ? '••••••••' : '000000'}
                value={regenAuthValue}
                onChange={(e) => setRegenAuthValue(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono font-medium focus:border-[#0F5132] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRegenModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!regenAuthValue.trim() || regenCodesMutation.isPending}
                onClick={() => regenCodesMutation.mutate()}
                className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {regenCodesMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Generate 8 Codes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DISABLE 2FA ── */}
      {disableModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#12151D] rounded-2xl p-6 sm:p-8 max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-5">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-500/10 text-rose-600 rounded-xl">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Turn off Two-Factor Authentication</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Your account will only require a password to sign in.</p>
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setDisableAuthType('password')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  disableAuthType === 'password' ? 'bg-white dark:bg-zinc-800 shadow-2xs text-zinc-900 dark:text-white' : 'text-zinc-500'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setDisableAuthType('code')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  disableAuthType === 'code' ? 'bg-white dark:bg-zinc-800 shadow-2xs text-zinc-900 dark:text-white' : 'text-zinc-500'
                }`}
              >
                Current 2FA Code
              </button>
            </div>

            <div>
              <label className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1.5">
                {disableAuthType === 'password' ? 'Confirm account password' : 'Enter 6-digit authenticator code'}
              </label>
              <input
                type={disableAuthType === 'password' ? 'password' : 'text'}
                placeholder={disableAuthType === 'password' ? '••••••••' : '000000'}
                value={disableAuthValue}
                onChange={(e) => setDisableAuthValue(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-mono font-medium focus:border-rose-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDisableModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!disableAuthValue.trim() || disableMutation.isPending}
                onClick={() => disableMutation.mutate()}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {disableMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Turn Off 2FA
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function TwoFactorStudioPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-[#0B0D12] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F5132] dark:text-emerald-400" />
        </div>
      }
    >
      <TwoFactorStudioContent />
    </Suspense>
  );
}
