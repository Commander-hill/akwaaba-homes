'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  QrCode,
  Smartphone,
  Copy,
  Check,
  Download,
  Printer,
  ChevronLeft,
  ArrowRight,
  AlertTriangle,
  Lock,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Loader2,
  Info,
  MessageSquare,
  Shield,
  FileText
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
    staleTime: 5 * 60 * 1000 // preserve setup session for 5 min
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
      // Paste detected
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
      toast.success(data.message || 'Two-Factor Authentication successfully activated!');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      refetchStatus();
      setTotpCode(['', '', '', '', '', '']);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Invalid 6-digit code. Please verify the code displayed in your authenticator app.');
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
      toast.error(err.response?.data?.message || 'Failed to dispatch SMS verification code');
    }
  });

  // 6. Mutation: Verify SMS OTP
  const verifySmsMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post('/auth/2fa/sms/verify', { code });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'SMS Code verified. 2FA activated!');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      refetchStatus();
      setSmsCode(['', '', '', '', '', '']);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Invalid or expired SMS verification code');
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
      toast.success(data.message || 'Two-Factor Authentication deactivated');
      setDisableModalOpen(false);
      setDisableAuthValue('');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      refetchStatus();
      refetchSetup();
      setCurrentStep(1);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to disable 2FA. Check your authorization credentials.');
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
      toast.success(data.message || '8 fresh recovery codes generated!');
      setFreshRecoveryCodes(data.rawCodes || []);
      setRegenAuthValue('');
      queryClient.invalidateQueries({ queryKey: ['2fa-status'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to regenerate recovery codes');
    }
  });

  // Helper actions
  const handleCopySecret = () => {
    if (!setupData?.secret) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopiedSecret(true);
    toast.success('Secret key copied to clipboard');
    setTimeout(() => setCopiedSecret(false), 2500);
  };

  const handleCopyAllCodes = (codesList: string[]) => {
    if (!codesList.length) return;
    navigator.clipboard.writeText(codesList.join('\n'));
    setCopiedAllCodes(true);
    toast.success('All 8 emergency recovery codes copied!');
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
      `AKWAABA HOMES - 2FA EMERGENCY RECOVERY CODES\n` +
      `Account: ${userProfile?.email || 'User'}\n` +
      `Generated: ${new Date().toUTCString()}\n` +
      `Security Directive: Ghana Rent Act Escrow & Account Protection\n\n` +
      `Each one-time code can only be used ONCE if you lose access to your authenticator.\n` +
      `Store this file in an encrypted vault or offline drive.\n\n` +
      codesList.map((c, i) => `[${i + 1}]  ${c}`).join('\n') +
      `\n\nSupport: security@akwaabahomes.com`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `akwaaba-recovery-keys-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Recovery keys dossier downloaded');
  };

  const handlePrintSheet = () => {
    window.print();
  };

  const isEnrolled = statusData?.twoFactorEnabled === true;
  const codesToDisplay = freshRecoveryCodes || setupData?.rawCodes || [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* ── BREADCRUMB & HEADER ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                <Link href="/dashboard/profile" className="hover:text-emerald-600 transition-colors">
                  Profile
                </Link>
                <span>/</span>
                <Link href="/dashboard/profile/security" className="hover:text-emerald-600 transition-colors">
                  Security
                </Link>
                <span>/</span>
                <span className="text-slate-900 dark:text-slate-100 font-bold">Two-Factor Authentication</span>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard/profile/security"
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                  title="Return to Security Center"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                    <KeyRound className="w-6 h-6 text-emerald-600" />
                    Two-Factor Authentication (2FA) Studio
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    RFC 6238 TOTP Authenticator, Printable Emergency Keys &amp; Ghana SMS Fallback
                  </p>
                </div>
              </div>
            </div>

            {/* Enrolled Status Pill */}
            <div className="flex items-center gap-3">
              {isLoadingStatus ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" /> Checking 2FA status...
                </div>
              ) : isEnrolled ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-extrabold shadow-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Account Protected</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-extrabold shadow-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Setup Required</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* ── STATUTORY SECURITY & ESCROW ADVISORY ── */}
        <div className="bg-emerald-950/10 dark:bg-emerald-950/30 border border-emerald-500/30 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0 mt-0.5">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                Ghana Rent Act (Act 220) &amp; Escrow Security Mandate
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-3xl leading-relaxed">
                2FA protects high-stakes actions across Akwaaba Homes: authorization of <strong>Landlord Mobile Money escrow disbursements</strong>, 
                signing of official digital tenancy agreements, access to verified Ghana Card KYC documents, and dispute arbitration filings.
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider bg-white dark:bg-slate-900 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full font-bold">
              Standard RFC 6238 TOTP
            </span>
          </div>
        </div>

        {/* ── ENROLLED STATE WORKSTATION ── */}
        {isEnrolled && (
          <div className="space-y-6 print:hidden">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">
                      Two-Factor Authentication is Active
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Your sign-ins and financial payouts require your 6-digit TOTP code or an emergency recovery key.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setRegenAuthValue('');
                      setRegenModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate Recovery Codes
                  </button>
                  <button
                    onClick={() => {
                      setDisableAuthValue('');
                      setDisableModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Deactivate 2FA
                  </button>
                </div>
              </div>

              {/* Recovery Codes Status Banner */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Emergency Recovery Keys Remaining:</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                        {statusData?.remainingRecoveryCodes ?? 8} of 8
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Each backup code is single-use. If you run out, generate 8 new keys immediately.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintSheet}
                    className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Backup Sheet
                  </button>
                </div>
              </div>

              {/* Newly Generated Codes Reveal if just regenerated */}
              {freshRecoveryCodes && freshRecoveryCodes.length > 0 && (
                <div className="p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-black text-sm">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>New Backup Codes Generated — Save These Now!</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyAllCodes(freshRecoveryCodes)}
                        className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedAllCodes ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy All
                      </button>
                      <button
                        onClick={() => handleDownloadCodes(freshRecoveryCodes)}
                        className="text-xs font-bold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-amber-700 dark:text-amber-400/90 leading-relaxed">
                    Your previous recovery codes are now void. Store these 8 new codes in a secure location:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {freshRecoveryCodes.map((code, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleCopySingleCode(code, idx)}
                        className="p-3 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/80 rounded-xl text-center font-mono font-bold text-xs text-slate-900 dark:text-white hover:border-amber-500 cursor-pointer transition-colors shadow-2xs relative group"
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
          </div>
        )}

        {/* ── ONBOARDING WORKSTATION (NOT ENROLLED) ── */}
        {!isEnrolled && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
            {/* Left Steps Progress Column */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Setup Progression
                </h3>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div
                    onClick={() => setCurrentStep(1)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      currentStep === 1
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/50 text-emerald-900 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        currentStep === 1
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      1
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        Scan Authenticator QR
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Link Google Authenticator, Authy, or Microsoft Authenticator.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div
                    onClick={() => setCurrentStep(2)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      currentStep === 2
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/50 text-emerald-900 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        currentStep === 2
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      2
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        Save Emergency Keys
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Download or print 8 one-time backup recovery codes.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div
                    onClick={() => setCurrentStep(3)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                      currentStep === 3
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/50 text-emerald-900 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        currentStep === 3
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      3
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        Confirm &amp; Activate
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Verify with a 6-digit TOTP code or Ghana SMS OTP.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Supported Apps Guide Card */}
              <div className="bg-slate-100 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Compatible Authenticator Apps</span>
                </div>
                <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                  <li><strong>Google Authenticator</strong> (iOS &amp; Android)</li>
                  <li><strong>Microsoft Authenticator</strong></li>
                  <li><strong>Apple Passwords / Keychain</strong> (iOS 15+)</li>
                  <li><strong>Twilio Authy</strong> or <strong>1Password</strong></li>
                </ul>
              </div>
            </div>

            {/* Right Main Stage Column */}
            <div className="lg:col-span-8">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
                {isLoadingSetup ? (
                  <div className="py-24 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                    <span className="text-xs font-bold text-slate-500">Generating cryptographic TOTP keys...</span>
                  </div>
                ) : !setupData ? (
                  <div className="py-16 text-center space-y-4">
                    <p className="text-xs text-rose-500 font-bold">Failed to initialize 2FA setup session.</p>
                    <button
                      onClick={() => refetchSetup()}
                      className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Retry Initialization
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* ──── STAGE 1: QR CODE & MANUAL SECRET ──── */}
                    {currentStep === 1 && (
                      <div className="space-y-6 animate-in">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Step 1 of 3
                          </span>
                          <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                            Scan the QR Code with Your Authenticator App
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Open your authenticator app on your phone, tap &quot;+ Add Account&quot;, and point your camera at this QR code.
                          </p>
                        </div>

                        {/* QR Code Container */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
                          <div className="p-4 bg-white rounded-3xl border-2 border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center w-[230px] h-[230px]">
                            {setupData.qrCodeSvg ? (
                              <div
                                className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                                dangerouslySetInnerHTML={{ __html: setupData.qrCodeSvg }}
                              />
                            ) : (
                              <QrCode className="w-16 h-16 text-slate-300" />
                            )}
                          </div>

                          <div className="space-y-3 max-w-xs text-center sm:text-left">
                            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Account Label
                              </span>
                              <div className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
                                {userProfile?.email || 'Akwaaba Resident'}
                              </div>
                              <div className="text-[10px] text-emerald-600 font-bold">Issuer: Akwaaba Homes</div>
                            </div>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                              Once scanned, your phone will begin generating 6-digit codes that refresh every 30 seconds.
                            </p>
                          </div>
                        </div>

                        {/* Manual Entry Fallback Box */}
                        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              Can&apos;t scan the QR code? Enter secret key manually:
                            </span>
                            <button
                              type="button"
                              onClick={handleCopySecret}
                              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              {copiedSecret ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedSecret ? 'Copied' : 'Copy Key'}</span>
                            </button>
                          </div>

                          <div className="font-mono text-sm font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 tracking-wider text-center select-all">
                            {setupData.formattedSecret || setupData.secret}
                          </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(2)}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer"
                          >
                            <span>Next: Save Recovery Keys</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ──── STAGE 2: 8 EMERGENCY BACKUP CODES ──── */}
                    {currentStep === 2 && (
                      <div className="space-y-6 animate-in">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Step 2 of 3
                          </span>
                          <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                            Save 8 Emergency Backup Recovery Keys
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            If you ever lose, break, or reset your phone, each of these 8 one-time codes grants emergency account recovery.
                          </p>
                        </div>

                        {/* Top Action Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Dossier Voucher Keys (8 total)
                          </span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleCopyAllCodes(setupData.rawCodes)}
                              className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              {copiedAllCodes ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              Copy All
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadCodes(setupData.rawCodes)}
                              className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" /> Download .txt
                            </button>
                            <button
                              type="button"
                              onClick={handlePrintSheet}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" /> Print Sheet
                            </button>
                          </div>
                        </div>

                        {/* 8 Codes Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {setupData.rawCodes.map((code, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleCopySingleCode(code, idx)}
                              className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center font-mono font-bold text-xs text-slate-900 dark:text-white hover:border-emerald-500 cursor-pointer transition-colors shadow-2xs relative group"
                              title="Click to copy single code"
                            >
                              <div className="text-[9px] font-mono text-slate-400 mb-0.5">#{idx + 1}</div>
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
                          <label className="flex items-start gap-3 p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl cursor-pointer">
                            <input
                              type="checkbox"
                              checked={savedCodesConfirmed}
                              onChange={(e) => setSavedCodesConfirmed(e.target.checked)}
                              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed font-medium">
                              I confirm that I have copied, downloaded, or printed my 8 emergency backup keys and stored them safely. 
                              I understand that Akwaaba Homes support cannot recover lost 2FA keys without these codes.
                            </div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(1)}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Back to QR Code
                          </button>

                          <button
                            type="button"
                            disabled={!savedCodesConfirmed}
                            onClick={() => setCurrentStep(3)}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            <span>Next: Verify &amp; Activate</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ──── STAGE 3: VERIFY & ACTIVATE ──── */}
                    {currentStep === 3 && (
                      <div className="space-y-6 animate-in">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Step 3 of 3
                          </span>
                          <h2 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                            Verify Code to Complete Activation
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Choose verification by Authenticator App code or Ghana SMS OTP fallback to finalize security activation.
                          </p>
                        </div>

                        {/* Dual Method Tabs */}
                        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
                          <button
                            type="button"
                            onClick={() => setVerificationMethod('app')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                              verificationMethod === 'app'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Authenticator App Code
                          </button>
                          <button
                            type="button"
                            onClick={() => setVerificationMethod('sms')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                              verificationMethod === 'sms'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Ghana SMS OTP Fallback
                          </button>
                        </div>

                        {/* ── METHOD A: AUTHENTICATOR APP INPUT ── */}
                        {verificationMethod === 'app' && (
                          <div className="space-y-6 pt-2">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Enter the 6-Digit Code displayed in your Authenticator:
                              </label>

                              <div className="flex items-center justify-center gap-2 sm:gap-3 py-4">
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
                                    className="w-11 sm:w-13 h-13 sm:h-15 text-center text-xl sm:text-2xl font-mono font-black rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-emerald-600 focus:outline-none shadow-xs"
                                  />
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={totpCode.join('').length !== 6 || enableMutation.isPending}
                              onClick={() => enableMutation.mutate(totpCode.join(''))}
                              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {enableMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying Code...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4" /> Activate Two-Factor Authentication
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {/* ── METHOD B: SMS OTP FALLBACK INPUT ── */}
                        {verificationMethod === 'sms' && (
                          <div className="space-y-6 pt-2">
                            <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Registered Ghanaian Phone Number
                                </span>
                                <div className="text-xs font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                                  {maskedPhone || userProfile?.phoneNumber || '+233 (Registered Number)'}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                  SMS gateway dispatches via Arkesel / Hubtel / Africa&apos;s Talking.
                                </p>
                              </div>

                              <button
                                type="button"
                                disabled={smsCooldown > 0 || sendSmsMutation.isPending}
                                onClick={() => sendSmsMutation.mutate()}
                                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
                              >
                                {sendSmsMutation.isPending ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <MessageSquare className="w-3.5 h-3.5" />
                                )}
                                {smsCooldown > 0 ? `Resend SMS (${smsCooldown}s)` : 'Send 6-Digit SMS Code'}
                              </button>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                                Enter the 6-Digit Code received on your phone:
                              </label>

                              <div className="flex items-center justify-center gap-2 sm:gap-3 py-4">
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
                                    className="w-11 sm:w-13 h-13 sm:h-15 text-center text-xl sm:text-2xl font-mono font-black rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:border-emerald-600 focus:outline-none shadow-xs"
                                  />
                                ))}
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={smsCode.join('').length !== 6 || verifySmsMutation.isPending}
                              onClick={() => verifySmsMutation.mutate(smsCode.join(''))}
                              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {verifySmsMutation.isPending ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" /> Verifying SMS Code...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4" /> Confirm SMS Code &amp; Activate 2FA
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        <div className="flex justify-start pt-4 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => setCurrentStep(2)}
                            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            Back to Recovery Keys
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── PRINTABLE VOUCHER KEY SHEET (Hidden on screen, revealed during window.print()) ── */}
        <div className="hidden print:block font-sans p-8 space-y-6 max-w-2xl mx-auto border-2 border-dashed border-slate-400 rounded-3xl">
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                Akwaaba Homes
              </h1>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Emergency 2FA Recovery Keys Dossier
              </p>
            </div>
            <div className="text-right text-xs">
              <div className="font-bold">{userProfile?.email}</div>
              <div className="text-slate-500 font-mono">{new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div className="p-4 bg-slate-100 rounded-xl text-xs text-slate-800 space-y-1">
            <p className="font-bold">IMPORTANT INSTRUCTIONS:</p>
            <p>1. Store this printed voucher in a secure location (fireproof safe, lockbox, or passport wallet).</p>
            <p>2. Each code can be entered ONCE in place of your 6-digit authenticator code.</p>
            <p>3. Strike through used codes with a pen as you consume them.</p>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4">
            {codesToDisplay.map((code, idx) => (
              <div
                key={idx}
                className="p-3 border-2 border-slate-300 rounded-xl text-center font-mono font-black text-sm tracking-wider flex items-center justify-between px-4"
              >
                <span className="text-slate-400 text-xs">#{idx + 1}</span>
                <span className="text-slate-900">{code}</span>
                <span className="text-slate-300 text-xs">[ ]</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-500 text-center">
            Ghana Rent Act Escrow &amp; Account Protection Standard • Akwaaba Homes Marketplace Ltd.
          </div>
        </div>
      </div>

      {/* ── MODAL: REGENERATE RECOVERY CODES ── */}
      {regenModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-slate-900 dark:text-white">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black">Regenerate Recovery Keys</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">All previous backup codes will be voided.</p>
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setRegenAuthType('password')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  regenAuthType === 'password' ? 'bg-white dark:bg-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setRegenAuthType('code')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  regenAuthType === 'code' ? 'bg-white dark:bg-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Current 2FA Code
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {regenAuthType === 'password' ? 'Enter Account Password *' : 'Enter 6-Digit Authenticator Code *'}
              </label>
              <input
                type={regenAuthType === 'password' ? 'password' : 'text'}
                placeholder={regenAuthType === 'password' ? '••••••••' : '000000'}
                value={regenAuthValue}
                onChange={(e) => setRegenAuthValue(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono font-bold focus:border-emerald-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRegenModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!regenAuthValue.trim() || regenCodesMutation.isPending}
                onClick={() => regenCodesMutation.mutate()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {regenCodesMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Generate 8 New Keys
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DISABLE 2FA ── */}
      {disableModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-500/10 text-rose-600 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Deactivate 2FA</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Escrow payouts will no longer be protected.</p>
              </div>
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setDisableAuthType('password')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  disableAuthType === 'password' ? 'bg-white dark:bg-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setDisableAuthType('code')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  disableAuthType === 'code' ? 'bg-white dark:bg-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Current 2FA Code
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {disableAuthType === 'password' ? 'Confirm Account Password *' : 'Enter 6-Digit Authenticator Code *'}
              </label>
              <input
                type={disableAuthType === 'password' ? 'password' : 'text'}
                placeholder={disableAuthType === 'password' ? '••••••••' : '000000'}
                value={disableAuthValue}
                onChange={(e) => setDisableAuthValue(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-mono font-bold focus:border-rose-600 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDisableModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!disableAuthValue.trim() || disableMutation.isPending}
                onClick={() => disableMutation.mutate()}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {disableMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Deactivation
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <TwoFactorStudioContent />
    </Suspense>
  );
}
