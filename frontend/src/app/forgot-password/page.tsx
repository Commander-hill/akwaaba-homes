'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Mail, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  RotateCcw, 
  ArrowLeft,
  AlertCircle,
  Lock,
  Sparkles
} from 'lucide-react';
import api from '@/lib/axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSuccess(true);
      setResendCooldown(60); // 60s cooldown before resending
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to process account recovery request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const maskEmail = (val: string) => {
    const parts = val.split('@');
    if (parts.length !== 2) return val;
    const name = parts[0];
    const domain = parts[1];
    const visibleChars = Math.min(2, name.length);
    const masked = name.slice(0, visibleChars) + '•••';
    return `${masked}@${domain}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBFBFC] dark:bg-[#0B0D12] text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 transition-colors relative overflow-hidden">
      
      {/* Subtle Background Geometry */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Architectural Card */}
      <div className="w-full max-w-md mx-auto relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xs group-hover:scale-105 transition-transform bg-white dark:bg-zinc-900 p-1">
              <Image
                src="/logo.png"
                alt="Akwaaba Homes"
                width={48}
                height={48}
                className="w-full h-full object-cover rounded-xl"
                priority
              />
            </div>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
            Account Recovery
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
            Regain access to your tenancy lease vault, inspection records, or property host portal.
          </p>
        </div>

        {/* Solid Card Container */}
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-zinc-950/5 space-y-6">
          
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-2xl text-xs font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="text-center space-y-5 animate-in fade-in">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-zinc-950 dark:text-white">
                  Recovery Email Dispatched
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  If an account exists for <strong className="font-mono text-zinc-900 dark:text-white">{maskEmail(email)}</strong>, a secure password reset link has been sent.
                </p>
              </div>

              {/* Time Expiry Notice */}
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl text-left flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <div className="text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed">
                  <strong>Security Note:</strong> The reset authorization token is valid for <strong>15 minutes</strong>. If you do not see it in your inbox, please check your spam or promotions folder.
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3 pt-2">
                <Link
                  href="/login"
                  className="w-full py-3 px-4 bg-[#0F5132] hover:bg-[#146c43] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Return to Sign In
                </Link>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || isLoading}
                  onClick={handleSubmit}
                  className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend Recovery Link'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Email Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Registered Account Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. kwame.mensah@example.com"
                    className="block w-full pl-10 pr-3.5 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#0F5132] focus:ring-2 focus:ring-[#0F5132]/20 outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                  Enter the email address associated with your Akwaaba Homes tenant or host profile.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full py-3.5 px-4 bg-[#0F5132] hover:bg-[#146c43] active:scale-[0.99] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-950/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Validating Security Token...
                  </>
                ) : (
                  <>
                    Send Recovery Authorization
                    <ArrowRight className="w-4 h-4 text-[#D97706]" />
                  </>
                )}
              </button>

              {/* Return to Sign In */}
              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Remembered your password? Sign In
                </Link>
              </div>
            </form>
          )}

          {/* Trust Guarantees */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 grid grid-cols-2 gap-3 text-[10px] text-zinc-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>SHA-256 Vault Token</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>15-Minute Expiration</span>
            </div>
          </div>

        </div>

        {/* Footer Regulatory Assurance */}
        <p className="text-center text-[11px] text-zinc-400 dark:text-zinc-500 mt-6 font-medium">
          Protected by Akwaaba Homes Identity Vault &bull; Ghana Data Protection Act (Act 843)
        </p>

      </div>
    </div>
  );
}
