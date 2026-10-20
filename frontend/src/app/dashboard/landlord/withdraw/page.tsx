'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Wallet,
  ArrowDownToLine,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Banknote,
  Phone,
  ChevronDown,
  RefreshCw,
  Lock,
  ArrowLeft,
  ArrowRight,
  Building2,
  Info,
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
  Smartphone,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const MOMO_NETWORKS = [
  { id: 'MTN', label: 'MTN Mobile Money', short: 'MTN', code: 'MTN' },
  { id: 'Telecel', label: 'Telecel Cash (Vodafone)', short: 'Telecel', code: 'VOD' },
  { id: 'AirtelTigo', label: 'AT Money (AirtelTigo)', short: 'AT Money', code: 'ATL' },
];

const GHANA_BANKS = [
  'GCB Bank',
  'Ecobank Ghana',
  'Absa Bank Ghana',
  'Access Bank Ghana',
  'Stanbic Bank Ghana',
  'Fidelity Bank Ghana',
  'First National Bank',
  'Agricultural Development Bank (ADB)',
  'National Investment Bank (NIB)',
  'Zenith Bank Ghana',
  'UBA Ghana',
  'CalBank',
  'Consolidated Bank Ghana (CBG)',
  'Standard Chartered Bank',
];

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  PENDING: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/60',
    icon: <Clock className="w-3 h-3 text-amber-500" />
  },
  PROCESSING: {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/60',
    icon: <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
  },
  SUCCESS: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    icon: <CheckCircle2 className="w-3 h-3 text-emerald-500" />
  },
  FAILED: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/60',
    icon: <XCircle className="w-3 h-3 text-rose-500" />
  },
};

export default function LandlordWithdrawalPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [recipientType, setRecipientType] = useState<'MOMO' | 'BANK'>('MOMO');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankOrNetwork, setBankOrNetwork] = useState('MTN');
  const [amount, setAmount] = useState('');
  const [isVerifyingPayee, setIsVerifyingPayee] = useState(false);
  const [payeeVerified, setPayeeVerified] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'>('ALL');

  // Step-Up Security State
  const [isStepUpOpen, setIsStepUpOpen] = useState(false);
  const [stepUpCode, setStepUpCode] = useState('');
  const [authMethod, setAuthMethod] = useState<'TOTP' | 'EMAIL'>('TOTP');
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);

  // 1. Fetch 2FA status
  const { data: twoFactorStatus } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: async () => {
      const res = await api.get('/auth/2fa/status');
      return res.data;
    },
  });

  // 2. Fetch payout history + balance
  const { data: payoutData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['payouts', 'history'],
    queryFn: async () => {
      const res = await api.get('/payouts/history');
      return res.data;
    },
  });

  const summary = payoutData?.summary;
  const payouts: any[] = payoutData?.payouts || [];
  const availableBalance = summary?.availableBalance || 0;

  // Filtered history list
  const filteredPayouts = useMemo(() => {
    if (historyFilter === 'ALL') return payouts;
    return payouts.filter((p) => p.status === historyFilter);
  }, [payouts, historyFilter]);

  // Request Email OTP handler
  const handleRequestEmailOtp = async () => {
    setIsSendingEmailOtp(true);
    try {
      const res = await api.post('/payouts/otp');
      toast.success(res.data.message || 'Authorization code sent to your registered email!');
      setAuthMethod('EMAIL');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch email OTP');
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  // Payee lookup verification with telecom gateway
  const handleVerifyPayee = async () => {
    if (!accountNumber.trim()) {
      toast.error('Please enter a phone number first');
      return;
    }
    setIsVerifyingPayee(true);
    setPayeeVerified(false);
    try {
      const networkObj = MOMO_NETWORKS.find(n => n.id === bankOrNetwork);
      const networkCode = networkObj ? networkObj.code : 'MTN';
      
      const res = await api.post('/payouts/verify-account', {
        accountNumber: accountNumber.trim(),
        bankCode: networkCode,
      });

      if (res.data?.accountName) {
        setAccountName(res.data.accountName);
        setPayeeVerified(true);
        toast.success(`Verified: ${res.data.accountName}`);
      }
    } catch (err: any) {
      toast.error('Account lookup unavailable. You can enter the name manually.');
    } finally {
      setIsVerifyingPayee(false);
    }
  };

  // Payout submission mutation
  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        amount: parseFloat(amount),
        recipientType,
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        bankOrNetwork,
      };

      if (twoFactorStatus?.twoFactorEnabled && authMethod === 'TOTP') {
        payload.twoFactorCode = stepUpCode.trim();
      } else {
        payload.emailOtp = stepUpCode.trim();
      }

      const res = await api.post('/payouts/request', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Withdrawal authorized and queued for disbursement.');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      setAmount('');
      setAccountName('');
      setAccountNumber('');
      setStepUpCode('');
      setPayeeVerified(false);
      setIsStepUpOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Withdrawal authorization failed. Please check your credentials.');
    },
  });

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountName.trim() || !accountNumber.trim()) {
      toast.error('Please complete all recipient and disbursement fields');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 10) {
      toast.error('Minimum withdrawal amount is GH₵ 10.00');
      return;
    }
    if (parsedAmount > availableBalance) {
      toast.error('Disbursement amount exceeds your available balance');
      return;
    }

    setStepUpCode('');
    if (twoFactorStatus?.twoFactorEnabled) {
      setAuthMethod('TOTP');
    } else {
      setAuthMethod('EMAIL');
      handleRequestEmailOtp();
    }
    setIsStepUpOpen(true);
  };

  const handleConfirmWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepUpCode.trim()) {
      toast.error('Please enter the 6-digit authorization code');
      return;
    }
    withdrawMutation.mutate();
  };

  const parsedAmountNum = parseFloat(amount) || 0;
  const processingFee = 0.00; // Akwaaba Homes pays payment processing fee
  const netDisbursement = Math.max(0, parsedAmountNum - processingFee);

  const applyPercentPreset = (pct: number) => {
    const val = (availableBalance * pct).toFixed(2);
    setAmount(val);
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-20 pt-4 px-4 sm:px-6 lg:px-8 space-y-6 animate-in fade-in duration-300">
      
      {/* ── Breadcrumb & Top Header ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          <Link href="/dashboard/landlord" className="hover:text-zinc-900 dark:hover:text-white transition">
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#0F5132] dark:text-emerald-400 font-bold">Withdraw Funds</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center shadow-xs">
                <Wallet className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                Disbursement &amp; Payouts
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 pl-13">
              Direct settlement to Ghanaian Mobile Money wallets (MTN, Telecel, AT) or local commercial banks.
            </p>
          </div>

          <Link
            href="/dashboard/landlord"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition shadow-2xs self-start sm:self-auto cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>

      {/* ── Balance Overview Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Available Balance */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#0F5132] dark:text-emerald-400">
              AVAILABLE FOR PAYOUT
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-[#0F5132] dark:text-emerald-400 tracking-tight">
              GH₵ {availableBalance.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Unencumbered rent escrow funds
            </p>
          </div>
        </div>

        {/* Total Paid Out */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              TOTAL WITHDRAWN TO DATE
            </span>
            <span className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <ArrowDownToLine className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
              GH₵ {(summary?.totalPaidOut || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Disbursed via Paystack Transfer
            </p>
          </div>
        </div>

        {/* Lifetime Net Earnings */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              LIFETIME NET EARNINGS
            </span>
            <span className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              <Banknote className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
              GH₵ {(summary?.totalNetEarnings || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Gross tenancy receipts minus fees
            </p>
          </div>
        </div>
      </div>

      {/* ── Security Alert / Status Banner ── */}
      {twoFactorStatus && !twoFactorStatus.twoFactorEnabled ? (
        <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-300 font-medium">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <span>
              Escrow payouts currently use <strong>Email OTP</strong>. Enable TOTP 2FA for instant, tamper-proof authorization.
            </span>
          </div>
          <Link
            href="/dashboard/profile/security/2fa"
            className="inline-flex items-center gap-1.5 font-bold text-amber-950 dark:text-amber-200 hover:underline shrink-0 pl-9 sm:pl-0"
          >
            <span>Configure 2FA Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : twoFactorStatus?.twoFactorEnabled ? (
        <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-xs text-emerald-950 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
            <span>Two-Factor Authentication is <strong>Active</strong>. Payout authorizations are protected by TOTP step-up verification.</span>
          </div>
          <span className="text-[10px] font-mono uppercase font-bold text-emerald-700 dark:text-emerald-400 hidden sm:inline">
            SECURED ESCROW
          </span>
        </div>
      ) : null}

      {/* ── Main Two-Column Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        
        {/* ──── Left Column: Form & Step-Up Auth (7 Cols) ──── */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs">
            
            {isStepUpOpen ? (
              /* ── Step-Up Security Screen ── */
              <form onSubmit={handleConfirmWithdrawal} className="space-y-6 animate-in fade-in duration-200">
                <div className="p-6 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0F5132] text-white flex items-center justify-center mx-auto shadow-xs">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-zinc-950 dark:text-white">
                      Step-Up Security Authorization
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
                      {twoFactorStatus?.twoFactorEnabled && authMethod === 'TOTP'
                        ? 'Enter the 6-digit one-time code from your authenticator app (Google Authenticator / Authy).'
                        : 'We have dispatched a 6-digit confirmation code to your registered email address.'}
                    </p>
                  </div>

                  {/* Summary preview pill */}
                  <div className="inline-flex flex-wrap items-center justify-center gap-1.5 bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 shadow-2xs">
                    <span>Disbursing</span>
                    <strong className="text-[#0F5132] dark:text-emerald-400 font-extrabold">
                      GH₵ {parsedAmountNum.toFixed(2)}
                    </strong>
                    <span>to</span>
                    <span className="font-mono font-bold text-zinc-950 dark:text-white">{accountNumber}</span>
                    <span className="text-zinc-400">({bankOrNetwork})</span>
                  </div>
                </div>

                {/* 6-Digit Code Input */}
                <div className="space-y-2 text-center">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                    {twoFactorStatus?.twoFactorEnabled && authMethod === 'TOTP'
                      ? 'AUTHENTICATOR CODE (TOTP)'
                      : 'EMAIL AUTHORIZATION CODE'}
                  </label>
                  <div className="max-w-xs mx-auto">
                    <input
                      type="text"
                      maxLength={8}
                      autoFocus
                      required
                      value={stepUpCode}
                      onChange={(e) => setStepUpCode(e.target.value)}
                      placeholder="000000"
                      className="w-full text-center text-3xl font-mono font-black tracking-widest bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-[#0F5132] dark:text-emerald-400 focus:outline-none focus:border-[#0F5132] focus:ring-4 focus:ring-[#0F5132]/10 transition"
                    />
                  </div>
                </div>

                {/* Auth Method Switcher & Resend */}
                <div className="flex items-center justify-center gap-3 text-xs">
                  {twoFactorStatus?.twoFactorEnabled ? (
                    <button
                      type="button"
                      disabled={isSendingEmailOtp}
                      onClick={() => {
                        if (authMethod === 'TOTP') {
                          handleRequestEmailOtp();
                        } else {
                          setAuthMethod('TOTP');
                        }
                      }}
                      className="font-bold text-[#0F5132] hover:text-[#0A3D24] dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {authMethod === 'TOTP'
                        ? 'Lost access to authenticator? Request Email OTP'
                        : 'Use Authenticator App TOTP code'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSendingEmailOtp}
                      onClick={handleRequestEmailOtp}
                      className="font-bold text-[#0F5132] hover:text-[#0A3D24] dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      {isSendingEmailOtp ? 'Dispatching...' : "Didn't receive code? Resend Email OTP"}
                    </button>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsStepUpOpen(false)}
                    className="w-1/3 h-11 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  
                  <button
                    type="submit"
                    disabled={withdrawMutation.isPending || !stepUpCode.trim()}
                    className="w-2/3 h-11 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                  >
                    {withdrawMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Authorizing Disbursement...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Authorize &amp; Disburse Payout</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* ── Initial Destination & Amount Form ── */
              <form onSubmit={handleInitialSubmit} className="space-y-6">
                
                {/* Section Title */}
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-[#0F5132] dark:text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
                    STEP 1 &bull; DESTINATION
                  </div>
                  <h2 className="text-lg font-black text-zinc-950 dark:text-white tracking-tight">
                    Payout Destination
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Select your preferred Ghanaian disbursement channel.
                  </p>
                </div>

                {/* Recipient Channel Toggle */}
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientType('MOMO');
                      setBankOrNetwork('MTN');
                      setPayeeVerified(false);
                    }}
                    className={clsx(
                      'py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer',
                      recipientType === 'MOMO'
                        ? 'bg-white dark:bg-[#12151D] text-zinc-950 dark:text-white shadow-xs border border-zinc-200 dark:border-zinc-700'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    )}
                  >
                    <Smartphone className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                    <span>Mobile Money Wallet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecipientType('BANK');
                      setBankOrNetwork('GCB Bank');
                      setPayeeVerified(false);
                    }}
                    className={clsx(
                      'py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer',
                      recipientType === 'BANK'
                        ? 'bg-white dark:bg-[#12151D] text-zinc-950 dark:text-white shadow-xs border border-zinc-200 dark:border-zinc-700'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    )}
                  >
                    <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Bank Account Transfer</span>
                  </button>
                </div>

                {/* Mobile Money Network or Bank Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {recipientType === 'MOMO' ? 'Mobile Money Network *' : 'Bank Institution *'}
                  </label>
                  <div className="relative">
                    <select
                      value={bankOrNetwork}
                      onChange={(e) => {
                        setBankOrNetwork(e.target.value);
                        setPayeeVerified(false);
                      }}
                      className="w-full h-11 appearance-none bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F5132] focus:ring-4 focus:ring-[#0F5132]/10 pr-10 cursor-pointer transition"
                    >
                      {recipientType === 'MOMO'
                        ? MOMO_NETWORKS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))
                        : GHANA_BANKS.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  </div>
                </div>

                {/* Account Number with inline verify button */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {recipientType === 'MOMO' ? 'MoMo Phone Number *' : 'Bank Account Number *'}
                    </label>

                    {recipientType === 'MOMO' && (
                      <button
                        type="button"
                        onClick={handleVerifyPayee}
                        disabled={isVerifyingPayee || !accountNumber.trim()}
                        className="text-[11px] font-bold text-[#0F5132] hover:text-[#0A3D24] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-lg transition cursor-pointer disabled:opacity-40 flex items-center gap-1"
                      >
                        {isVerifyingPayee ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : payeeVerified ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Verified Payee</span>
                          </>
                        ) : (
                          <>
                            <Search className="w-3 h-3" />
                            <span>Verify Payee Name</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => {
                      setAccountNumber(e.target.value);
                      setPayeeVerified(false);
                    }}
                    placeholder={recipientType === 'MOMO' ? '024XXXXXXX or 055XXXXXXX' : 'e.g. 1029384756'}
                    required
                    className="w-full h-11 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F5132] focus:ring-4 focus:ring-[#0F5132]/10 placeholder:text-zinc-400 font-mono transition"
                  />
                </div>

                {/* Recipient Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Recipient Full Legal Name *
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. Kwame Mensah"
                    required
                    className="w-full h-11 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F5132] focus:ring-4 focus:ring-[#0F5132]/10 placeholder:text-zinc-400 transition"
                  />
                  <p className="text-[11px] text-zinc-400">
                    Must match the registered legal name on the SIM wallet or bank account.
                  </p>
                </div>

                {/* Disbursement Amount */}
                <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Disbursement Amount (GH₵) *
                    </label>
                    <span className="text-xs text-zinc-500">
                      Available: <strong className="text-[#0F5132] dark:text-emerald-400">GH₵ {availableBalance.toFixed(2)}</strong>
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-[#0F5132] dark:text-emerald-400 font-mono">
                      GH₵
                    </span>
                    <input
                      type="number"
                      min={10}
                      step="0.01"
                      max={availableBalance}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full h-12 pl-12 pr-18 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 text-base font-black text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F5132] focus:ring-4 focus:ring-[#0F5132]/10 font-mono transition"
                    />
                    <button
                      type="button"
                      onClick={() => setAmount(availableBalance.toFixed(2))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-[#0F5132] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 px-2 py-1 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>

                  {/* Percentage Presets */}
                  <div className="flex items-center gap-2 pt-0.5">
                    {[
                      { label: '25%', pct: 0.25 },
                      { label: '50%', pct: 0.50 },
                      { label: '75%', pct: 0.75 },
                      { label: '100% (All)', pct: 1.00 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyPercentPreset(preset.pct)}
                        className="flex-1 py-1 text-[11px] font-bold rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-zinc-400">
                    Minimum disbursement: GH₵ 10.00 &bull; No daily withdrawal ceiling.
                  </p>
                </div>

                {/* Primary CTA Submit */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={withdrawMutation.isPending || !amount || parseFloat(amount) < 10 || parseFloat(amount) > availableBalance}
                    className="w-full h-12 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
                  >
                    <span>Proceed to Security Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>

        {/* ──── Right Column: Settlement & History (5 Cols) ──── */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Real-Time Settlement Calculation Card */}
          <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                <span>Settlement Calculation</span>
              </h3>
              <span className="text-[10px] font-mono text-zinc-400">PAYSTACK ESCROW</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                <span>Gross Withdrawal</span>
                <span className="font-bold font-mono text-zinc-950 dark:text-white">
                  GH₵ {parsedAmountNum.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                <span>Platform Payout Fee</span>
                <span className="font-bold text-[#0F5132] dark:text-emerald-400">
                  GH₵ 0.00 (Waived)
                </span>
              </div>

              <div className="flex justify-between items-center text-zinc-600 dark:text-zinc-400">
                <span>Statutory E-Levy</span>
                <span className="text-[11px] font-medium text-zinc-400">
                  Exempt &bull; B2C Disbursed
                </span>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-sm">
                <span className="font-black text-zinc-950 dark:text-white">Net Disbursed to You</span>
                <span className="font-black font-mono text-[#0F5132] dark:text-emerald-400 text-base">
                  GH₵ {netDisbursement.toFixed(2)}
                </span>
              </div>
            </div>

            {/* SLA Callout */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800 flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400">
              <Zap className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed text-[11px]">
                <strong className="text-zinc-950 dark:text-white block font-bold">Disbursement SLA:</strong>
                <span>Mobile Money payouts settle in under 5 minutes. Bank transfers route via Ghana Interbank Payment and Settlement Systems (GhIPSS) Instant Pay.</span>
              </div>
            </div>
          </div>

          {/* Recent Payout History Ledger */}
          <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            
            {/* Header + Refresh + Filters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-950 dark:text-white">
                    Recent Withdrawals
                  </h3>
                  <p className="text-[11px] text-zinc-400">Transaction audit records</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                  title="Refresh history"
                >
                  <RefreshCw className={clsx('w-3.5 h-3.5 text-zinc-500', isRefetching && 'animate-spin text-[#0F5132]')} />
                </button>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {(['ALL', 'SUCCESS', 'PENDING', 'FAILED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setHistoryFilter(st)}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg font-bold transition cursor-pointer shrink-0',
                      historyFilter === st
                        ? 'bg-[#0F5132] text-white shadow-2xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                    )}
                  >
                    {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0F5132] dark:text-emerald-400" />
                  <span className="text-xs text-zinc-400">Loading payout records...</span>
                </div>
              ) : filteredPayouts.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                    <ArrowDownToLine className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-zinc-400">
                    No {historyFilter !== 'ALL' ? historyFilter.toLowerCase() : ''} withdrawals found.
                  </p>
                </div>
              ) : (
                filteredPayouts.map((p) => {
                  const statusConf = STATUS_CONFIG[p.status] || STATUS_CONFIG.PENDING;
                  return (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shrink-0">
                          {p.recipientType === 'MOMO' ? (
                            <Phone className="w-4 h-4" />
                          ) : (
                            <Building2 className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-zinc-950 dark:text-white truncate">
                            {p.accountName}
                          </p>
                          <p className="text-[10px] text-zinc-400 truncate">
                            {p.bankOrNetwork} &bull; {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                          {p.failureReason && (
                            <p className="text-[10px] text-rose-500 font-semibold mt-0.5 truncate">
                              {p.failureReason}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-xs font-black font-mono text-zinc-950 dark:text-white">
                          GH₵ {p.amount.toFixed(2)}
                        </span>
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border',
                            statusConf.bg,
                            statusConf.text,
                            statusConf.border
                          )}
                        >
                          {statusConf.icon}
                          <span>{p.status}</span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
