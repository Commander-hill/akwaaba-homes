'use client';

import React, { useState } from 'react';
import api from '@/lib/axios';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  AlertTriangle,
  Loader2,
  X,
  Eye,
  EyeOff,
  FileCheck2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface StepUpActionConfig {
  title: string;
  description: string;
  actionType: 'ESCROW_RELEASE' | 'DEED_VERIFICATION' | 'SETTLEMENT_UPDATE' | 'CRITICAL_ACTION';
  payloadSummary?: { label: string; value: string }[];
  onSuccess: (stepUpToken: string) => void | Promise<void>;
}

interface StepUpAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionConfig: StepUpActionConfig | null;
}

export default function StepUpAuthModal({
  isOpen,
  onClose,
  actionConfig,
}: StepUpAuthModalProps) {
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !actionConfig) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Administrator password is required for elevated authorization.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/verify-step-up', {
        password,
        otp: otp.trim() || undefined,
        actionType: actionConfig.actionType,
      });

      const { stepUpToken } = res.data;
      toast.success('Elevated authorization granted (Valid for 5 mins)', {
        icon: '🛡️',
      });

      setPassword('');
      setOtp('');
      onClose();

      // Execute protected action with valid stepUpToken
      await actionConfig.onSuccess(stepUpToken);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        'Authorization denied. Invalid administrator password or 2FA OTP.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="step-up-modal-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                <span>Act 843 &amp; Act 1038 Compliance</span>
              </div>
              <h3 id="step-up-modal-title" className="text-base font-bold text-zinc-950 dark:text-white mt-1">
                Step-Up Authorization Required
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Details Box */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
            <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{actionConfig.title}</span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {actionConfig.description}
          </p>

          {actionConfig.payloadSummary && actionConfig.payloadSummary.length > 0 && (
            <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 grid grid-cols-2 gap-2 text-[11px]">
              {actionConfig.payloadSummary.map((item, i) => (
                <div key={i} className="min-w-0">
                  <span className="text-zinc-400 block font-medium">{item.label}</span>
                  <span className="font-bold text-zinc-900 dark:text-white font-mono truncate block">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Regulatory Governance Notice */}
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Critical operations modifying landlord payouts, banking settlement conduits, or statutory title deeds require cryptographic elevated authorization. Your action will be permanently recorded in the immutable audit trail.
        </p>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="stepup-password"
              className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              Administrator Password *
            </label>
            <div className="relative">
              <input
                id="stepup-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter your administrator password..."
                disabled={isLoading}
                autoFocus
                className="w-full px-4 py-2.5 pr-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-hidden transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="stepup-otp"
              className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5"
            >
              2FA Authenticator Code <span className="text-zinc-400 font-normal">(Optional if active)</span>
            </label>
            <input
              id="stepup-otp"
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 123456"
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs font-mono tracking-wider focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-hidden transition"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-[11.5px] leading-tight">{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authorizing...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm &amp; Authorize Action</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
