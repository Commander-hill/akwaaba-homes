'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Lock, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Check
} from 'lucide-react';
import api from '@/lib/axios';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or expired password reset authorization token. Please initiate a new recovery request.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password confirmations do not match.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password. Your token may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const isLengthValid = password.length >= 8;
  const isMatchValid = password.length > 0 && password === confirmPassword;

  return (
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
          Set New Password
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
          Create a secure password to protect your tenancy leases and identity credentials.
        </p>
      </div>

      {/* Solid Architectural Card */}
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
                Password Successfully Updated!
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Your account credentials have been secured with your new password. All active sessions have been updated.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/login"
                className="w-full py-3.5 px-4 bg-[#0F5132] hover:bg-[#146c43] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
              >
                Proceed to Sign In <ArrowRight className="w-4 h-4 text-[#D97706]" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                New Secure Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  disabled={!token}
                  className="block w-full pl-10 pr-10 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#0F5132] focus:ring-2 focus:ring-[#0F5132]/20 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  disabled={!token}
                  className="block w-full pl-10 pr-10 py-3 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-800 focus:border-[#0F5132] focus:ring-2 focus:ring-[#0F5132]/20 outline-none transition-all"
                />
              </div>
            </div>

            {/* Validation Checklist */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl space-y-1 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className={isLengthValid ? "text-emerald-600 font-bold" : "text-zinc-400"}>
                  {isLengthValid ? <Check className="w-3.5 h-3.5 inline" /> : '○'} At least 8 characters
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={isMatchValid ? "text-emerald-600 font-bold" : "text-zinc-400"}>
                  {isMatchValid ? <Check className="w-3.5 h-3.5 inline" /> : '○'} Passwords match
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !token || !isLengthValid || !isMatchValid}
              className="w-full py-3.5 px-4 bg-[#0F5132] hover:bg-[#146c43] active:scale-[0.99] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-950/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Securing Credentials...
                </>
              ) : (
                <>
                  Update Account Password
                  <ArrowRight className="w-4 h-4 text-[#D97706]" />
                </>
              )}
            </button>

            {/* Return to Sign In */}
            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                Cancel and return to Sign In
              </Link>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBFBFC] dark:bg-[#0B0D12] text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 transition-colors relative overflow-hidden">
      
      {/* Subtle Background Geometry */}
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
          <span className="text-xs font-bold text-zinc-500">Loading security token...</span>
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>

    </div>
  );
}
