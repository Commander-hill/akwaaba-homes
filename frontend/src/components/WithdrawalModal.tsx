'use client';

import React, { useState } from 'react';
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
  KeyRound,
  Lock,
  ArrowLeft
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
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  PROCESSING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  SUCCESS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  PENDING: <Clock className="w-3.5 h-3.5" />,
  PROCESSING: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  SUCCESS: <CheckCircle2 className="w-3.5 h-3.5" />,
  FAILED: <XCircle className="w-3.5 h-3.5" />,
};

export default function WithdrawalModal({ onClose }: { onClose: () => void }) {
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
      toast.success('✅ Withdrawal authorized & submitted! Funds are being disbursed.');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      setAmount('');
      setAccountName('');
      setAccountNumber('');
      setStepUpCode('');
      setIsStepUpOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Withdrawal authorization failed. Please check your code.');
    },
  });

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountName || !accountNumber) {
      toast.error('Please fill all required fields');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 10) {
      toast.error('Minimum withdrawal is GHS 10');
      return;
    }
    if (parsedAmount > (summary?.availableBalance || 0)) {
      toast.error('Amount exceeds your available balance');
      return;
    }

    // Open Step-up Authorization
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0F0F10] rounded-[28px] w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-300">

        {/* ── Header ── */}
        <div className="px-8 py-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-green-800 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Request Withdrawal</h2>
              <p className="text-xs text-emerald-100/80 font-medium mt-0.5">MoMo or Bank Transfer via Paystack</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* ── Balance Summary ── */}
          <div className="px-8 pt-6 pb-4">
            {isLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
            ) : (
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Total Net Earned', value: `GHS ${(summary?.totalNetEarnings || 0).toFixed(2)}`, color: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Total Withdrawn', value: `GHS ${(summary?.totalPaidOut || 0).toFixed(2)}`, color: 'text-slate-700 dark:text-slate-300' },
                  { label: 'Available Balance', value: `GHS ${(summary?.availableBalance || 0).toFixed(2)}`, color: 'text-blue-600 dark:text-blue-400 font-black' },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-[var(--border)]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">{item.label}</p>
                    <p className={`text-base font-extrabold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Withdrawal Form / Step-Up Authorization ── */}
            {isStepUpOpen ? (
              <form onSubmit={handleConfirmWithdrawal} className="space-y-4 animate-in fade-in">
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-[#0F5132] text-white flex items-center justify-center mx-auto shadow-xs">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black text-zinc-950 dark:text-white">
                    Step-Up Security Authorization
                  </h4>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
                    {twoFactorStatus?.twoFactorEnabled && authMethod === 'TOTP'
                      ? 'Enter the 6-digit code from your authenticator app (Google Authenticator / Authy) or your emergency recovery code.'
                      : 'We have dispatched a 6-digit authorization code to your verified email address.'}
                  </p>
                  <div className="inline-block bg-white dark:bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Withdrawing: <span className="text-[#0F5132] dark:text-emerald-400 font-black">GHS {parseFloat(amount || '0').toFixed(2)}</span> to <span className="font-mono">{accountNumber}</span> ({bankOrNetwork})
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider block text-center">
                    {twoFactorStatus?.twoFactorEnabled && authMethod === 'TOTP'
                      ? 'Enter 6-Digit Authenticator Code'
                      : 'Enter 6-Digit Email Authorization Code'}
                  </label>
                  <div className="relative max-w-xs mx-auto">
                    <input
                      type="text"
                      maxLength={10}
                      autoFocus
                      required
                      value={stepUpCode}
                      onChange={(e) => setStepUpCode(e.target.value)}
                      placeholder="000000"
                      className="w-full text-center text-xl font-mono font-bold tracking-widest bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl px-4 py-3 text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline cursor-pointer"
                    >
                      {authMethod === 'TOTP'
                        ? "Don't have your phone? Send email code instead"
                        : 'Use Authenticator App TOTP code'}
                    </button>
                  )}
                  {!twoFactorStatus?.twoFactorEnabled && (
                    <button
                      type="button"
                      disabled={isSendingEmailOtp}
                      onClick={handleRequestEmailOtp}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 underline cursor-pointer"
                    >
                      {isSendingEmailOtp ? 'Sending...' : "Didn't receive code? Resend Email OTP"}
                    </button>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsStepUpOpen(false)}
                    className="w-1/3 py-3.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-zinc-700 dark:text-zinc-200 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={withdrawMutation.isPending || !stepUpCode.trim()}
                    className="w-2/3 py-3.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {withdrawMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Authorizing...</>
                    ) : (
                      <><CheckCircle2 className="w-4 h-4" /> Confirm &amp; Disburse</>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleInitialSubmit} className="space-y-5">

                {/* Recipient Type Toggle */}
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-[var(--border)]">
                  {(['MOMO', 'BANK'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setRecipientType(type);
                        setBankOrNetwork(type === 'MOMO' ? 'MTN' : 'GCB Bank');
                      }}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                        recipientType === type
                          ? 'bg-white dark:bg-slate-800 shadow text-[var(--foreground)] border border-[var(--border)]'
                          : 'text-[var(--muted-foreground)]'
                      }`}
                    >
                      {type === 'MOMO' ? <Phone className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />}
                      {type === 'MOMO' ? 'Mobile Money' : 'Bank Transfer'}
                    </button>
                  ))}
                </div>

                {/* Network / Bank Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    {recipientType === 'MOMO' ? 'MoMo Network' : 'Bank'}
                  </label>
                  <div className="relative">
                    <select
                      value={bankOrNetwork}
                      onChange={(e) => setBankOrNetwork(e.target.value)}
                      className="w-full appearance-none bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 pr-10"
                    >
                      {(recipientType === 'MOMO' ? MOMO_NETWORKS : GHANA_BANKS).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
                  </div>
                </div>

                {/* Account Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Account / Recipient Name
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. Kwame Mensah"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-medium text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-400"
                  />
                </div>

                {/* Account Number */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                      {recipientType === 'MOMO' ? 'MoMo Phone Number' : 'Bank Account Number'}
                    </label>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!accountNumber) {
                          toast.error('Enter account number first');
                          return;
                        }
                        if (recipientType !== 'MOMO') {
                          toast.error('Instant name resolution is available for Mobile Money (MTN, Telecel, AirtelTigo). For bank transfers, ensure your name matches bank records.');
                          return;
                        }
                        try {
                          toast.loading('Verifying Payee Account Name...', { id: 'momo-ver' });
                          const networkCode =
                            bankOrNetwork === 'MTN'
                              ? 'MTN'
                              : bankOrNetwork === 'Vodafone' || bankOrNetwork === 'Telecel'
                              ? 'VOD'
                              : 'ATL';
                          const res = await api.post('/payouts/verify-account', {
                            accountNumber,
                            bankCode: networkCode
                          });
                          setAccountName(res.data.accountName);
                          toast.success(`Verified: ${res.data.accountName}`, { id: 'momo-ver' });
                        } catch (e) {
                          toast.error('Account verification unavailable', { id: 'momo-ver' });
                        }
                      }}
                      className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                    >
                      🔍 Verify Payee Name
                    </button>
                  </div>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder={recipientType === 'MOMO' ? '024XXXXXXX' : '1234567890'}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-medium text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 placeholder:text-slate-400"
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">
                    Amount (GHS)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-emerald-600">GHS</span>
                    <input
                      type="number"
                      min={10}
                      step="0.01"
                      max={summary?.availableBalance || 0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full pl-14 bg-slate-50 dark:bg-slate-900 border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-semibold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setAmount((summary?.availableBalance || 0).toFixed(2))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]">Minimum withdrawal: GHS 10 • Available: GHS {(summary?.availableBalance || 0).toFixed(2)}</p>
                </div>

                <button
                  type="submit"
                  disabled={withdrawMutation.isPending}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white rounded-2xl font-extrabold text-sm shadow-[0_8px_24px_-6px_rgba(16,185,129,0.4)] hover:shadow-[0_12px_30px_-6px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowDownToLine className="w-4 h-4" /> Continue to Verification
                </button>
              </form>
            )}
          </div>

          {/* ── Payout History ── */}
          <div className="px-8 pb-8">
            <div className="flex items-center justify-between mb-3 mt-4">
              <h3 className="text-sm font-extrabold text-[var(--foreground)]">Payout History</h3>
              <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <RefreshCw className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
              </button>
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {payouts.length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)] text-center py-4">No withdrawals yet.</p>
              ) : (
                payouts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                        {p.recipientType === 'MOMO' ? <Phone className="w-3.5 h-3.5" /> : <Banknote className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--foreground)]">{p.accountName} • {p.bankOrNetwork}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">{new Date(p.createdAt).toLocaleDateString()}</p>
                        {p.failureReason && <p className="text-[10px] text-red-500 mt-0.5">{p.failureReason}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-extrabold text-[var(--foreground)]">GHS {p.amount.toFixed(2)}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLES[p.status]}`}>
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
