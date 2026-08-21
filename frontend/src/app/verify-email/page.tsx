'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid verification link. Token is missing.');
      return;
    }

    const verifyToken = async () => {
      try {
        await api.post('/auth/verify-email', { token });
        setStatus('success');
        setMessage('Your email has been successfully verified! You can now access your account.');
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Verification failed. The link may be expired or invalid.');
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className={`absolute top-0 left-0 -translate-y-12 -translate-x-1/3 w-[600px] h-[600px] opacity-10 rounded-full blur-[80px] pointer-events-none ${status === 'success' ? 'bg-emerald-500' : status === 'error' ? 'bg-red-500' : 'bg-[var(--primary)]'}`} />
      
      <div className="max-w-md w-full glass-card p-10 rounded-3xl animate-in relative z-10 text-center flex flex-col items-center">
        
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 animate-spin text-[var(--primary)] mb-6" />
            <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">Verifying...</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight mb-2">Verified!</h2>
            <p className="text-[var(--muted-foreground)] mb-8">{message}</p>
            <Link href="/login" className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md font-bold">
              Continue to Login <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight mb-2">Verification Failed</h2>
            <p className="text-[var(--muted-foreground)] mb-8">{message}</p>
            <Link href="/register" className="w-full flex justify-center items-center py-3 px-4 rounded-xl font-bold border border-[var(--border)] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-[var(--foreground)]">
              Try Registering Again
            </Link>
          </>
        )}

      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Loading...</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
