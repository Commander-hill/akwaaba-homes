'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import api from '@/lib/axios';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process request');
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
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            Remembered your password?{' '}
            <Link href="/login" className="font-medium text-white underline hover:text-[var(--primary)] transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-200 p-4 rounded-xl text-sm font-medium border border-red-500/50 backdrop-blur-md">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto" />
            <h3 className="text-lg font-medium text-white">Check your email</h3>
            <p className="text-sm text-green-200">
              If an account with that email exists, we've sent you instructions to reset your password.
            </p>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-1">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-xl bg-white/5 focus:bg-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent outline-none transition-all"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Send Reset Link
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
