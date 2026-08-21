'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
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

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing password reset token.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Fixed Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-20 transform-gpu"
        style={{ backgroundImage: 'url(/images/auth-bg.png)' }}
      />
      {/* Fixed Overlay */}
      <div className="fixed inset-0 bg-black/60 pointer-events-none -z-10 transform-gpu" />

      <div className="max-w-md w-full space-y-8 backdrop-blur-xl bg-black/40 border border-white/20 p-10 rounded-3xl shadow-2xl relative z-10 text-white transform-gpu">
        <div>
          <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight">
            Set New Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            Please enter your new secure password below.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-200 p-4 rounded-xl text-sm font-medium border border-red-500/50 backdrop-blur-md">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6 text-center space-y-6">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Password Reset Complete!</h3>
              <p className="text-sm text-green-200">
                Your password has been successfully updated. You can now use it to sign in.
              </p>
            </div>
            <Link
              href="/login"
              className="flex justify-center items-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition-all shadow-md"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-xl bg-white/5 focus:bg-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={!token}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-xl bg-white/5 focus:bg-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={!token}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !token}
              className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Update Password
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
