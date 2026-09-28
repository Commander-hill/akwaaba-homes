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
  Eye, 
  EyeOff, 
  AlertCircle,
  Check,
  ArrowLeft
} from 'lucide-react';
import api from '@/lib/axios';
import ThemeToggle from '@/components/ThemeToggle';
import AlertBanner from '@/components/AlertBanner';

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
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid or expired password reset authorization link. Please request a new recovery email.');
    }
  }, [token]);

  const isLengthValid = password.length >= 8;
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasDigitOrSymbol = /[\d\W]/.test(password);
  const isMatchValid = password.length > 0 && password === confirmPassword;
  const isPasswordReady = isLengthValid && isMatchValid && !!token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Missing security token. Please open the link directly from your email.');
      return;
    }

    if (!isLengthValid) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!isMatchValid) {
      setError('Password confirmation does not match.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update credentials. This link may have already been used or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full h-11 px-3.5 bg-white dark:bg-[#14181E] border border-zinc-300 dark:border-zinc-700 rounded-xl text-xs font-normal text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-[#0F5132] focus:ring-1 focus:ring-[#0F5132] outline-none transition-colors";
  const labelClass = "block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5";

  return (
    <div className="-mt-18 md:-mt-20 min-h-screen flex flex-col justify-between bg-[#FBFBF9] dark:bg-[#0D0F12] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-emerald-100 selection:text-emerald-950">
      
      {/* ── Purpose-Built Auth Header ── */}
      <header className="w-full px-6 sm:px-10 lg:px-16 py-5 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#0F5132] flex items-center justify-center shadow-xs">
            <Image
              src="/logo.png"
              alt="AkwaabaHomes"
              width={32}
              height={32}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
            Akwaaba<span className="text-[#0F5132] dark:text-emerald-400">Homes</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-5">
          <ThemeToggle />
          <Link 
            href="/login" 
            className="text-xs font-semibold text-[#0F5132] dark:text-emerald-400 hover:text-[#0A3D24] dark:hover:text-emerald-300 transition-colors"
          >
            Sign in &rarr;
          </Link>
        </div>
      </header>

      {/* ── Main Two-Column Editorial Body ── */}
      <main className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-16 py-10 sm:py-16">
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 xl:gap-20 items-center">
          
          {/* ──── Left Side: Brand Reassurance (42% Desktop, Hidden Mobile) ──── */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-5">
            <div className="relative w-full aspect-[4/5] max-h-[560px] rounded-2xl overflow-hidden border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs group bg-[#0B1510]">
              
              <Image
                src="/images/auth-bg.png"
                alt="Modern Ghanaian residential community"
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover object-center transform group-hover:scale-[1.02] transition-transform duration-700 ease-out"
                priority
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

              <div className="absolute bottom-0 inset-x-0 p-7 text-white space-y-2.5">
                <div className="text-[10px] uppercase font-mono tracking-widest text-emerald-300 font-semibold">
                  Credential Security // Cryptographic Lock
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white leading-snug">
                  Securing Ghanaian rental contracts and payments
                </h3>
                <p className="text-xs text-zinc-200/80 leading-relaxed font-normal">
                  Setting a strong new password invalidates prior session tokens across other devices, safeguarding your identity and tenancy lease files.
                </p>
                <div className="pt-2 flex items-center gap-2 text-[11px] text-zinc-300/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>256-bit encryption · Ghana Act 843 compliant</span>
                </div>
              </div>

            </div>
          </div>

          {/* ──── Right Side: Form / Status Container (58% Desktop) ──── */}
          <div className="lg:col-span-7 xl:col-span-7 w-full max-w-[480px] mx-auto lg:mx-0">
            
            {success ? (
              /* Success State */
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center shadow-2xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#0F5132] dark:text-emerald-400">
                    Password Updated
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Credentials secured
                  </h1>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Your password has been changed successfully. You can now use your new password to sign in to your AkwaabaHomes account.
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href="/login"
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Proceed to Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              /* Reset Form */
              <div className="space-y-6">
                
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#0F5132] dark:text-emerald-400 mb-2">
                    Security Update
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    Set new password
                  </h1>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    Choose a strong, unique password to protect your bookings, lease agreements, and payment records.
                  </p>
                </div>

                {/* Error Banner */}
                {error && (
                  <AlertBanner type="error">
                    <span>{error}</span>
                    {!token && (
                      <div className="mt-1.5">
                        <Link 
                          href="/forgot-password" 
                          className="font-bold underline hover:opacity-80"
                        >
                          Request a new reset link &rarr;
                        </Link>
                      </div>
                    )}
                  </AlertBanner>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* New Password */}
                  <div>
                    <label className={labelClass}>New Password *</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        required 
                        autoComplete="new-password" 
                        disabled={!token}
                        className={`${inputClass} pr-10`} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="At least 8 characters" 
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
                  <div>
                    <label className={labelClass}>Confirm New Password *</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        required 
                        autoComplete="new-password" 
                        disabled={!token}
                        className={`${inputClass} pr-10`} 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        placeholder="Re-enter new password" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Live Criteria Checklist */}
                  <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/30 space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                        isLengthValid ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                      }`}>
                        {isLengthValid ? '✓' : '•'}
                      </span>
                      <span className={isLengthValid ? 'text-zinc-800 dark:text-zinc-200 font-medium' : 'text-zinc-500'}>
                        At least 8 characters
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                        hasMixedCase ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                      }`}>
                        {hasMixedCase ? '✓' : '•'}
                      </span>
                      <span className={hasMixedCase ? 'text-zinc-800 dark:text-zinc-200 font-medium' : 'text-zinc-500'}>
                        Uppercase and lowercase letters
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${
                        isMatchValid ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'
                      }`}>
                        {isMatchValid ? '✓' : '•'}
                      </span>
                      <span className={isMatchValid ? 'text-zinc-800 dark:text-zinc-200 font-medium' : 'text-zinc-500'}>
                        Passwords match
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <Link
                      href="/login"
                      className="h-11 px-4 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors flex items-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </Link>

                    <button
                      type="submit"
                      disabled={isLoading || !isPasswordReady}
                      className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#0F5132] cursor-pointer shadow-xs disabled:shadow-none"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Update Password</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                </form>

              </div>
            )}

          </div>

        </div>
      </main>

      {/* ── Subdued Institutional Footer ── */}
      <footer className="w-full px-6 sm:px-10 lg:px-16 py-6 border-t border-zinc-200/60 dark:border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400 dark:text-zinc-500">
        <div>
          &copy; {new Date().getFullYear()} AkwaabaHomes Ghana. All rights reserved.
        </div>
        <div className="flex items-center gap-6">
          <Link href="/privacy" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            Terms of Service
          </Link>
          <Link href="/help" className="hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            Help Center
          </Link>
        </div>
      </footer>

    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="-mt-18 md:-mt-20 min-h-screen flex flex-col items-center justify-center bg-[#FBFBF9] dark:bg-[#0D0F12] text-zinc-900 dark:text-zinc-100 p-6 space-y-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#0F5132]" />
        <span className="text-xs font-medium text-zinc-500">Loading security token...</span>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
