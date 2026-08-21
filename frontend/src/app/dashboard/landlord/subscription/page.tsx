'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, CreditCard, CalendarDays, ShieldAlert, CheckCircle, Clock, ArrowRight, Smartphone, Banknote, Shield } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';

function SubscriptionPageContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: subData, isLoading } = useQuery({
    queryKey: ['subscriptions', 'status'],
    queryFn: async () => {
      const { data } = await api.get('/subscriptions/status');
      return data;
    }
  });

  const initializeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/subscriptions/initialize');
      return data;
    },
    onSuccess: (data) => {
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to initialize payment. Please check your server configuration.');
      setSuccess('');
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async (reference: string) => {
      const { data } = await api.post('/subscriptions/verify', { paymentReference: reference });
      return data;
    },
    onSuccess: () => {
      setSuccess('🎉 Payment successful! Your subscription is now active.');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['subscriptions', 'status'] });
      router.replace('/dashboard/landlord/subscription');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Payment verification failed. Please contact support.');
      setSuccess('');
      router.replace('/dashboard/landlord/subscription');
    },
    onSettled: () => {
      setIsVerifying(false);
    }
  });

  useEffect(() => {
    const verify = searchParams.get('verify');
    const reference = searchParams.get('reference') || searchParams.get('trxref');

    if (verify === 'true' && reference && !isVerifying) {
      setIsVerifying(true);
      verifyMutation.mutate(reference);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Full-screen verifying state
  if (isVerifying || verifyMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full border-4 border-[var(--primary)]/20 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-[var(--foreground)] mb-2">Verifying Payment</h2>
          <p className="text-[var(--muted-foreground)]">Please wait while we confirm your payment with Paystack...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;
  }

  const { isActive, paymentStatus, startDate, endDate, accountStatus, subscription } = subData || {};
  const isPending = paymentStatus === 'PENDING';

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">Subscription Management</h1>
        <p className="text-[var(--muted-foreground)] mt-1">Manage your annual landlord subscription and account standing.</p>
      </div>

      {/* Status Banner */}
      {success && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-full shrink-0">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Payment Confirmed!</h3>
            <p className="text-emerald-100 text-sm mt-0.5">{success}</p>
          </div>
          <Link href="/dashboard/landlord" className="ml-auto shrink-0 flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors">
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 text-red-700 dark:text-red-400 text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Card */}
        <div className="glass-card rounded-2xl p-6 border border-[var(--border)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <CreditCard className="w-24 h-24" />
          </div>
          <h2 className="text-lg font-bold mb-6 relative z-10">Current Status</h2>

          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-center pb-4 border-b border-[var(--border)]">
              <span className="text-[var(--muted-foreground)]">Subscription</span>
              {isActive ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full text-xs">
                  <CheckCircle className="w-4 h-4" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-600 font-bold bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-full text-xs">
                  <ShieldAlert className="w-4 h-4" /> Inactive
                </span>
              )}
            </div>

            <div className="flex justify-between items-center pb-4 border-b border-[var(--border)]">
              <span className="text-[var(--muted-foreground)]">Payment Status</span>
              {paymentStatus === 'COMPLETED' ? (
                <span className="font-bold text-emerald-600">Completed</span>
              ) : paymentStatus === 'PENDING' ? (
                <span className="font-bold text-amber-600">Pending</span>
              ) : (
                <span className="font-bold text-[var(--muted-foreground)]">N/A</span>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[var(--muted-foreground)]">Account Standing</span>
              <span className={`font-bold ${accountStatus === 'Active' ? 'text-emerald-600' : 'text-red-600'}`}>
                {accountStatus || 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* Dates Card */}
        <div className="glass-card rounded-2xl p-6 border border-[var(--border)]">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[var(--primary)]" /> Billing Cycle
          </h2>

          {subscription ? (
            <div className="space-y-6">
              <div>
                <span className="block text-xs uppercase tracking-wider font-semibold text-[var(--muted-foreground)] mb-1">Start Date</span>
                <span className="font-bold text-lg">
                  {new Date(startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-wider font-semibold text-[var(--muted-foreground)] mb-1">Expiry Date</span>
                <span className="font-bold text-lg">
                  {new Date(endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              No previous subscription history found.
            </div>
          )}
        </div>
      </div>

      {/* Action Area */}
      {!isActive && (
        <div className="glass-card p-8 rounded-3xl border border-[var(--border)]">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 bg-[var(--primary)]/10 rounded-2xl mb-4">
              <Shield className="w-10 h-10 text-[var(--primary)]" />
            </div>
            <h2 className="text-2xl font-extrabold mb-2">Unlock Premium Access</h2>
            <p className="text-[var(--muted-foreground)] max-w-md mx-auto">
              Subscribe for GHS 500/year to list properties, manage bookings, and connect with students across Ghana.
            </p>
          </div>

          {/* Payment Methods */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Smartphone, label: 'MTN Mobile Money', color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' },
              { icon: Smartphone, label: 'Telecel / AirtelTigo', color: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
              { icon: Banknote, label: 'Debit / Credit Card', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className={`flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] ${color}`}>
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-sm font-semibold">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            {isPending ? (
              <div className="space-y-4 text-center">
                <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-4 py-2 rounded-xl font-medium border border-amber-100">
                  <Clock className="w-5 h-5" />
                  Your previous payment is still pending verification.
                </div>
                <div>
                  <button
                    onClick={() => initializeMutation.mutate()}
                    disabled={initializeMutation.isPending}
                    className="bg-[var(--primary)] text-white px-8 py-3 rounded-xl font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
                  >
                    {initializeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                    Retry Payment
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => initializeMutation.mutate()}
                disabled={initializeMutation.isPending}
                className="bg-[var(--primary)] text-white px-10 py-4 rounded-xl font-bold text-lg shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {initializeMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Connecting to Paystack...</>
                ) : (
                  <><CreditCard className="w-6 h-6" /> Pay GHS 500 via Paystack</>
                )}
              </button>
            )}
          </div>

          <p className="text-center text-xs text-[var(--muted-foreground)] mt-4 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" /> Secured and processed by Paystack &mdash; Ghana&apos;s leading payment gateway.
          </p>
        </div>
      )}

      {isActive && (
        <div className="glass-card p-8 rounded-3xl border border-emerald-200 dark:border-emerald-800 text-center bg-emerald-50/50 dark:bg-emerald-900/10">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mb-2">You&apos;re All Set!</h3>
          <p className="text-[var(--muted-foreground)] mb-6">Your subscription is active. Enjoy full access to Akwaaba Homes Landlord features.</p>
          <Link href="/dashboard/landlord" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-colors">
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>}>
      <SubscriptionPageContent />
    </Suspense>
  );
}
