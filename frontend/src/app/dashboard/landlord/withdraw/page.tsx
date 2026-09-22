'use client';

import React, { useState } from 'react';
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
  ShieldCheck,
  Building2,
  Info,
  Check,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const MOMO_NETWORKS = ['MTN', 'Telecel', 'AirtelTigo', 'Vodafone'];
const GHANA_BANKS = [
  'GCB Bank',
  'Ecobank Ghana',
  'Absa Bank Ghana',
  'Access Bank Ghana',
  'Stanbic Bank Ghana',
  'First National Bank',
  'Agricultural Development Bank',
  'National Investment Bank',
  'Zenith Bank Ghana',
  'UBA Ghana',
  'CalBank',
  'Consolidated Bank Ghana',
];

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  SUCCESS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-3.5 h-3.5" />,
  PROCESSING: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  SUCCESS: <CheckCircle2 className="w-3.5 h-3.5" />,
  FAILED: <XCircle className="w-3.5 h-3.5" />,
};

export default function LandlordWithdrawalPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [recipientType, setRecipientType] = useState<'MOMO' | 'BANK'>('MOMO');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankOrNetwork, setBankOrNetwork] = useState('MTN');
  const [amount, setAmount] = useState('');

  // Step-Up Authentication State
  const [isStepUpOpen, setIsStepUpOpen] = useState(false);
  const [stepUpCode, setStepUpCode] = useState('');
  const [authMethod, setAuthMethod] = useState<'TOTP' | 'EMAIL'>('TOTP');
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);

  // Fetch 2FA status
  const { data: twoFactorStatus } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: async () => {
      const res = await api.get('/auth/2fa/status');
      return res.data;
    },
  });

  // Fetch payout history + balance
  const { data: payoutData, isLoading, refetch } = useQuery({
    queryKey: ['payouts', 'history'],
    queryFn: async () => {
      const res = await api.get('/payouts/history');
      return res.data;
    },
  });

  const summary = payoutData?.summary;
  const payouts: any[] = payoutData?.payouts || [];

  const handleRequestEmailOtp = async () => {
    setIsSendingEmailOtp(true);
    try {
      const res = await api.post('/payouts/otp');
      toast.success(res.data.message || 'Authorization code sent to your email!');
      setAuthMethod('EMAIL');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch email OTP');
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        amount: parseFloat(amount),
        recipientType,
        accountName,
        accountNumber,
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
      setIsStepUpOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Withdrawal authorization failed. Please check your credentials.');
    },
  });

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountName || !accountNumber) {
      toast.error('Please complete all recipient and amount fields');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 10) {
      toast.error('Minimum withdrawal amount is GHS 10.00');
      return;
    }
    if (parsedAmount > (summary?.availableBalance || 0)) {
      toast.error('Amount exceeds your available balance');
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

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Breadcrumbs & Header ── */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
          <Link href="/dashboard/landlord" className="hover:text-emerald-600 transition">
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 dark:text-zinc-200">Withdraw Funds</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Wallet className="w-6 h-6" />
              </span>
              Disbursement & Payouts
            </h1>
            <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1">
              Direct settlement to Ghanaian Mobile Money wallets (MTN, Telecel, AT) or local commercial banks.
            </p>
          </div>

          <Link
            href="/dashboard/landlord"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Link>
        </div>
      </div>

      {/* ── Balance Overview Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            Available for Payout
          </span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            GHS {(summary?.availableBalance || 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Unencumbered rent escrow funds</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            Total Withdrawn to Date
          </span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            GHS {(summary?.totalPaidOut || 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Disbursed via Paystack Transfer</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            Lifetime Net Earnings
          </span>
          <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
            GHS {(summary?.totalNetEarnings || 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Gross tenancy receipts minus fees</p>
        </div>
      </div>

      {/* ── Main 2-Column Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form / Step-up Auth (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 shadow-xs">
            {isStepUpOpen ? (
              <form onSubmit={handleConfirmWithdrawal} className="space-y-6 animate-in fade-in">
                <div className="p-6 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-950 dark:text-white">
                      Step-Up Security Authorization
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                      {twoFactorStatus?.twoFactorEnabled && authMethod === 'TOTP'
                        ? 'Enter the 6-digit one-time code from your authenticator app (Google Authenticator / Authy).'
                        : 'We have dispatched a 6-digit confirmation code to your registered email address.'}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-800 dark:text-zinc-200">
                    <span>Disbursing:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                      GHS {parsedAmountNum.toFixed(2)}
                    </span>
                    <span>to</span>
                    <span className="font-mono font-bold">{accountNumber}</span>
                    <span className="text-slate-400">({bankOrNetwork})</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block text-center">
                    {twoFactorStatus?.twoFactorEnabled && authMethod === 'TOTP'
                      ? 'Authenticator Code'
                      : 'Email Authorization Code'}
                  </label>
                  <div className="max-w-xs mx-auto">
                    <input
                      type="text"
                      maxLength={10}
                      autoFocus
                      required
                      value={stepUpCode}
                      onChange={(e) => setStepUpCode(e.target.value)}
                      placeholder="000000"
                      className="w-full text-center text-2xl font-mono font-bold tracking-widest bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl px-4 py-3.5 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 text-xs">
                  {twoFactorStatus?.twoFactorEnabled && (
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
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline cursor-pointer"
                    >
                      {authMethod === 'TOTP'
                        ? 'Lost access to authenticator? Request Email OTP'
                        : 'Use Authenticator App TOTP code'}
                    </button>
                  )}
                  {!twoFactorStatus?.twoFactorEnabled && (
                    <button
                      type="button"
                      disabled={isSendingEmailOtp}
                      onClick={handleRequestEmailOtp}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline cursor-pointer"
                    >
                      {isSendingEmailOtp ? 'Dispatching...' : "Didn't receive code? Resend Email OTP"}
                    </button>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsStepUpOpen(false)}
                    className="w-1/3 py-3.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-2xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Edit
                  </button>
                  <button
                    type="submit"
                    disabled={withdrawMutation.isPending || !stepUpCode.trim()}
                    className="w-2/3 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {withdrawMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Authorizing Disbursement...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Authorize & Disburse
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleInitialSubmit} className="space-y-6">
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white">
                    Payout Destination
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select your preferred disbursement channel in Ghana.
                  </p>
                </div>

                {/* Recipient Channel Toggle */}
                <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-zinc-800/80 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setRecipientType('MOMO');
                      setBankOrNetwork('MTN');
                    }}
                    className={`py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      recipientType === 'MOMO'
                        ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-xs border border-slate-200/80 dark:border-zinc-700'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Phone className="w-4 h-4 text-emerald-600" />
                    Mobile Money Wallet
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRecipientType('BANK');
                      setBankOrNetwork('GCB Bank');
                    }}
                    className={`py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      recipientType === 'BANK'
                        ? 'bg-white dark:bg-zinc-900 text-slate-950 dark:text-white shadow-xs border border-slate-200/80 dark:border-zinc-700'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Bank Account Transfer
                  </button>
                </div>

                {/* Network / Bank Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    {recipientType === 'MOMO' ? 'Mobile Money Network' : 'Bank Institution'}
                  </label>
                  <div className="relative">
                    <select
                      value={bankOrNetwork}
                      onChange={(e) => setBankOrNetwork(e.target.value)}
                      className="w-full appearance-none bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 pr-10 cursor-pointer"
                    >
                      {(recipientType === 'MOMO' ? MOMO_NETWORKS : GHANA_BANKS).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Account Number with live verification */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                      {recipientType === 'MOMO' ? 'MoMo Phone Number' : 'Bank Account Number'}
                    </label>
                    {recipientType === 'MOMO' && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!accountNumber) {
                            toast.error('Enter MoMo phone number first');
                            return;
                          }
                          try {
                            toast.loading('Verifying Payee with Telecom Gateway...', { id: 'momo-ver' });
                            const networkCode =
                              bankOrNetwork === 'MTN'
                                ? 'MTN'
                                : bankOrNetwork === 'Vodafone' || bankOrNetwork === 'Telecel'
                                ? 'VOD'
                                : 'ATL';
                            const res = await api.post('/payouts/verify-account', {
                              accountNumber,
                              bankCode: networkCode,
                            });
                            setAccountName(res.data.accountName);
                            toast.success(`Verified: ${res.data.accountName}`, { id: 'momo-ver' });
                          } catch {
                            toast.error('Account lookup unavailable. You can enter name manually.', {
                              id: 'momo-ver',
                            });
                          }
                        }}
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                      >
                        🔍 Verify Payee Name
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder={recipientType === 'MOMO' ? '024XXXXXXX or 055XXXXXXX' : 'Account number'}
                    required
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder:text-slate-400 font-mono"
                  />
                </div>

                {/* Account Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    Recipient Full Legal Name
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. Kwame Mensah"
                    required
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder:text-slate-400"
                  />
                  <p className="text-[11px] text-slate-500">
                    Must match the registered name on the telecom account or bank records.
                  </p>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                      Disbursement Amount (GHS)
                    </label>
                    <span className="text-xs text-slate-500">
                      Balance: <strong className="text-slate-900 dark:text-white">GHS {(summary?.availableBalance || 0).toFixed(2)}</strong>
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-600">
                      GHS
                    </span>
                    <input
                      type="number"
                      min={10}
                      step="0.01"
                      max={summary?.availableBalance || 0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full pl-14 pr-16 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3.5 text-base font-extrabold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                    <button
                      type="button"
                      onClick={() => setAmount((summary?.availableBalance || 0).toFixed(2))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Minimum withdrawal is GHS 10.00. No daily withdrawal cap.
                  </p>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={withdrawMutation.isPending || !amount || parseFloat(amount) <= 0}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowDownToLine className="w-5 h-5" /> Proceed to Security Verification
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: Breakdown & Payout Ledger (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Real-Time Settlement Summary */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Settlement Calculation
            </h3>

            <div className="space-y-3 pt-1 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                <span>Gross Withdrawal</span>
                <span className="font-bold text-slate-950 dark:text-white">
                  GHS {parsedAmountNum.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                <span>Platform Payout Fee</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  GHS 0.00 (Waived)
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                <span>Statutory E-Levy</span>
                <span className="font-semibold text-slate-500">
                  Exempt / Disbursed via Paystack B2C
                </span>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center text-sm">
                <span className="font-extrabold text-slate-900 dark:text-white">Net Disbursed to You</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                  GHS {netDisbursement.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800/80 flex items-start gap-2.5 text-xs text-slate-600 dark:text-zinc-400">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 dark:text-white block mb-0.5">Disbursement SLA</span>
                Mobile Money transfers complete in under 5 minutes. Ghanaian bank transfers are routed via Ghana Interbank Payment and Settlement Systems (GhIPSS) Instant Pay.
              </div>
            </div>
          </div>

          {/* Recent Payout History */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Recent Withdrawals
                </h3>
                <p className="text-[11px] text-slate-500">Transaction audit records</p>
              </div>
              <button
                onClick={() => refetch()}
                className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                title="Refresh history"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {isLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                </div>
              ) : payouts.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No payout history on record.
                </p>
              ) : (
                payouts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        {p.recipientType === 'MOMO' ? (
                          <Phone className="w-4 h-4" />
                        ) : (
                          <Building2 className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {p.accountName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {p.bankOrNetwork} • {new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {p.failureReason && (
                          <p className="text-[10px] text-red-500 font-semibold mt-0.5">
                            {p.failureReason}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        GHS {p.amount.toFixed(2)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_STYLES[p.status] || 'bg-slate-100 text-slate-600'}`}
                      >
                        {STATUS_ICONS[p.status]} {p.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
