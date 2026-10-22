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
  ArrowLeft,
  ShieldCheck,
  Building2,
  KeyRound
} from 'lucide-react';
import api from '@/lib/axios';
import ThemeToggle from '@/components/ThemeToggle';
import AlertBanner from '@/components/AlertBanner';
import { Button } from '@/components/ui/Button';

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

  return (
    <div className="-mt-16 -mb-16 md:mb-0 min-h-screen w-full flex bg-white dark:bg-[#0E1210] text-zinc-950 dark:text-zinc-100 antialiased overflow-hidden">
      
      {/* ──── LEFT COLUMN: BRAND VISUAL HERO (60% Desktop, Full Bleed) ──── */}
      <div className="relative hidden lg:block flex-1 min-h-screen lg:h-screen overflow-hidden">
        <Image
          src="/images/auth-recovery.jpg"
          alt="Authentic Ghanaian resident verifying password reset"
          fill
          sizes="60vw"
          className="object-cover object-center transform hover:scale-[1.01] transition-transform duration-1000 ease-out"
          priority
        />

        {/* Cinematic Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20" />

        {/* Top-Left Floating Action */}
        <div className="absolute top-8 left-8 z-10">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold transition shadow-xs cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to sign in</span>
          </Link>
        </div>

        {/* Bottom Overlay Content */}
        <div className="absolute bottom-0 inset-x-0 p-10 xl:p-14 text-white space-y-3 z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/20 backdrop-blur-xs border border-emerald-400/30 text-emerald-300 text-[10px] font-mono uppercase tracking-wider font-bold">
            <span>CREDENTIAL SECURITY • CRYPTOGRAPHIC LOCK</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight">
            Securing Ghanaian rental contracts and payments
          </h2>

          <p className="text-xs sm:text-sm text-zinc-200/90 leading-relaxed max-w-lg font-normal">
            Setting a strong new password invalidates prior session tokens across other devices, safeguarding your identity and tenancy lease files.
          </p>

          {/* Trust Markers */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-zinc-300 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Escrow Protection
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" /> 256-Bit Encryption
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Ghana Act 843 Compliant
            </span>
          </div>
        </div>
      </div>

      {/* ──── RIGHT COLUMN: RESET PASSWORD FORM (40% Desktop, 100% Mobile) ──── */}
      <div className="w-full lg:w-[42%] xl:w-[38%] min-h-screen lg:h-screen lg:overflow-y-auto flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-14 bg-white dark:bg-[#0E1210] lg:border-l border-zinc-200/80 dark:border-zinc-800/80 relative z-10 shrink-0">
        
        {/* Top Header: Brand + Theme Toggle + Sign In */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#0F5132] flex items-center justify-center shadow-xs">
              <Image
                src="/logo.png"
                alt="Akwaaba Homes"
                width={36}
                height={36}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-zinc-950 dark:text-white leading-none">
                Akwaaba<span className="text-[#0F5132] dark:text-emerald-400">Homes</span>
              </span>
              <span className="text-[10px] font-mono tracking-wider uppercase text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">
                Ghana PropTech
              </span>
            </div>
          </Link>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-xs font-bold text-[#0F5132] dark:text-emerald-400 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="my-auto py-8 sm:py-10 max-w-sm w-full mx-auto space-y-6">
          {success ? (
            /* Success State */
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 text-[#0F5132] dark:text-emerald-400 text-[10px] font-mono uppercase font-bold tracking-wider">
                  <span>PASSWORD UPDATED</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                  Credentials secured
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed pt-0.5">
                  Your password has been changed successfully. You can now use your new password to sign in to your AkwaabaHomes account.
                </p>
              </div>

              <div className="pt-2">
                <Link href="/login" className="block w-full">
                  <Button
                    type="button"
                    variant="emerald"
                    size="sm"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="w-full"
                  >
                    Proceed to Sign In
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Reset Form */
            <div className="space-y-6">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 text-[#0F5132] dark:text-emerald-400 text-[10px] font-mono uppercase font-bold tracking-wider">
                  <span>SECURITY UPDATE</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                  Set new password
                </h1>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
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
                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    New Password
                  </label>
                  <div className="relative">
                    <input 
                      id="new-password"
                      type={showPassword ? 'text' : 'password'} 
                      required 
                      autoComplete="new-password" 
                      disabled={!token}
                      className="w-full h-11 pl-3.5 pr-10 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-900 focus:border-[#0F5132] focus:ring-4 focus:ring-[#0F5132]/10 outline-none transition" 
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
                <div className="space-y-1.5">
                  <label htmlFor="confirm-password" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input 
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'} 
                      required 
                      autoComplete="new-password" 
                      disabled={!token}
                      className="w-full h-11 pl-3.5 pr-10 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-900 focus:border-[#0F5132] focus:ring-4 focus:ring-[#0F5132]/10 outline-none transition" 
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
                  <Link href="/login">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                    >
                      Back
                    </Button>
                  </Link>

                  <Button
                    type="submit"
                    variant="emerald"
                    size="sm"
                    isLoading={isLoading}
                    disabled={isLoading || !isPasswordReady}
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                    className="flex-1"
                  >
                    Update Password
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Bottom Footer */}
        <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between text-[11px] text-zinc-400 gap-2">
          <span>&copy; {new Date().getFullYear()} Akwaaba Homes Ghana</span>
          <div className="flex items-center gap-3">
            <Link href="/terms" className="hover:text-zinc-950 dark:hover:text-white transition">Terms</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-zinc-950 dark:hover:text-white transition">Privacy</Link>
            <span>•</span>
            <Link href="/support" className="hover:text-zinc-950 dark:hover:text-white transition">Support</Link>
          </div>
        </div>
      </div>

    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="-mt-16 -mb-16 md:mb-0 min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0E1210] text-zinc-900 dark:text-zinc-100 p-6 space-y-3">
        <Loader2 className="w-7 h-7 animate-spin text-[#0F5132]" />
        <span className="text-xs font-medium text-zinc-500">Loading security token...</span>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
