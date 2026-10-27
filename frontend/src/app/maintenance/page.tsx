'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  ArrowRight,
  RefreshCw,
  Bell,
  Check,
  ShieldAlert,
  Server
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import toast from 'react-hot-toast';

export default function PublicMaintenancePage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const { data: configData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['public-config'],
    queryFn: async () => {
      try {
        const res = await api.get('/config/public');
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 10 * 1000,
    refetchInterval: 15000,
  });

  const maintenanceStartTime = configData?.maintenanceStartTime || null;
  const maintenanceEndTime = configData?.maintenanceEndTime || null;
  const isMaintenanceActive = Boolean(configData?.maintenanceMode);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number; isExpired: boolean } | null>(null);

  useEffect(() => {
    if (!maintenanceEndTime) {
      setTimeLeft(null);
      return;
    }

    const calculate = () => {
      const target = new Date(maintenanceEndTime).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, isExpired: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [maintenanceEndTime]);

  const subscribeMutation = useMutation({
    mutationFn: async (targetEmail: string) => {
      const res = await api.post('/config/subscribe-maintenance', { email: targetEmail });
      return res.data;
    },
    onSuccess: (data) => {
      setSubscribed(true);
      toast.success(data?.message || 'Subscribed! We will notify you the moment services are restored.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Could not register email notification.');
    }
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    subscribeMutation.mutate(email);
  };

  const supportEmail = configData?.maintenanceContactEmail || 'support@akwaabahomes.com';
  const supportPhone = configData?.maintenanceContactPhone || '+233 24 000 0000';
  const rawTitle = configData?.maintenanceTitle || 'Scheduled Platform Maintenance';
  const rawMessage =
    configData?.maintenanceMessage ||
    'Our engineering team is currently conducting scheduled database performance enhancements and infrastructure upgrades. All resident records and tenancy agreements remain strictly safeguarded.';

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-[#F8F7F2] dark:bg-[#0B0E14] text-zinc-950 dark:text-zinc-100 antialiased p-6 sm:p-10">
      
      {/* Top Header: Brand & Operational Controls */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-5">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#0F5132] flex items-center justify-center border border-emerald-800">
            <Image
              src="/logo.png"
              alt="Akwaaba Homes"
              width={40}
              height={40}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-zinc-950 dark:text-white leading-none">
              Akwaaba<span className="text-[#0F5132] dark:text-emerald-400">Homes</span>
            </span>
            <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
              Ghanaian Rental Marketplace
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="Check live platform status"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${isFetching ? 'animate-spin text-[#0F5132]' : ''}`} />
            <span className="hidden sm:inline">Check Status</span>
          </button>
          <ThemeToggle />
          <Link
            href="/admin/login"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <Lock className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
            <span>Admin Gateway</span>
          </Link>
        </div>
      </header>

      {/* Center Institutional Advisory Container */}
      <main className="w-full max-w-2xl mx-auto my-10">
        {!isMaintenanceActive && !isLoading ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#12151D] border border-emerald-500/40 shadow-xs text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                All Systems Operational
              </span>
              <h1 className="text-2xl font-bold text-zinc-950 dark:text-white">
                Platform Services Restored
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                Scheduled maintenance has completed. Property search discovery, verified listings, and resident portals are now online.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0c4027] text-white text-xs font-bold transition cursor-pointer"
              >
                <span>Return to Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
            
            {/* Advisory Top Status Bar */}
            <div className="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="inline-flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>
                  {configData?.maintenanceScope === 'TENANTS_ONLY'
                    ? 'Tenant Portal Advisory'
                    : configData?.maintenanceScope === 'LANDLORDS_ONLY'
                    ? 'Landlord Operations Advisory'
                    : 'Scheduled System Maintenance'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                <span>HTTP 503 • Standard Time: GMT</span>
              </span>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Headline & Explanatory Copy */}
              <div className="space-y-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight leading-snug">
                  {rawTitle}
                </h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {rawMessage}
                </p>
              </div>

              {/* Window Schedule Metadata & Countdown */}
              <div className="p-4 sm:p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-b border-zinc-200/70 dark:border-zinc-800 pb-3.5">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Window Commenced
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                      {maintenanceStartTime
                        ? new Date(maintenanceStartTime).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Active Maintenance Window'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      Estimated Restoration
                    </span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                      {maintenanceEndTime
                        ? new Date(maintenanceEndTime).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Upon completion of verification checks'}
                    </span>
                  </div>
                </div>

                {timeLeft && !timeLeft.isExpired ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      <Clock className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                      <span>Estimated time remaining until reopening:</span>
                    </div>
                    <div className="inline-flex items-center gap-2 font-mono text-sm font-bold">
                      <span className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white">
                        {String(timeLeft.hours).padStart(2, '0')}h
                      </span>
                      <span>:</span>
                      <span className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white">
                        {String(timeLeft.minutes).padStart(2, '0')}m
                      </span>
                      <span>:</span>
                      <span className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-[#0F5132] dark:text-emerald-400">
                        {String(timeLeft.seconds).padStart(2, '0')}s
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    <Clock className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                    <span>Final verification checks are in progress. Normal access will resume shortly.</span>
                  </div>
                )}
              </div>

              {/* Restoration Notification Subscription */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-200">
                  <Bell className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                  <span>Receive an email notification when services resume</span>
                </div>
                {subscribed ? (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Your email is registered. We will notify you as soon as platform access is restored.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      className="flex-1 px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-[#0F5132]"
                    />
                    <button
                      type="submit"
                      disabled={subscribeMutation.isPending}
                      className="px-4 py-2 rounded-lg bg-[#0F5132] hover:bg-[#0c4027] text-white text-xs font-bold transition shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {subscribeMutation.isPending ? 'Registering...' : 'Notify Me'}
                    </button>
                  </form>
                )}
              </div>

              {/* Statutory & Data Integrity Assurances */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                    <ShieldCheck className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                    <span>Payments Safeguarded</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    All rental payments and landlord disbursements remain securely recorded.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                    <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                    <span>Leases Intact</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    Active tenancy agreements, room reservations, and resident passes are unaffected.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/70 dark:border-zinc-800/80 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                    <Lock className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                    <span>Records Encrypted</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    Ghana Card KYC records and property title deeds remain encrypted and audited.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer: Support Contacts & Admin Access */}
      <footer className="w-full max-w-4xl mx-auto border-t border-zinc-200 dark:border-zinc-800/80 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex flex-wrap items-center gap-3">
          <span>Support Desk:</span>
          <a
            href={`tel:${supportPhone}`}
            className="font-semibold text-zinc-800 dark:text-zinc-200 hover:underline inline-flex items-center gap-1"
          >
            <Phone className="w-3 h-3 text-[#0F5132] dark:text-emerald-400" />
            <span>{supportPhone}</span>
          </a>
          <span>•</span>
          <a
            href={`mailto:${supportEmail}`}
            className="font-semibold text-zinc-800 dark:text-zinc-200 hover:underline inline-flex items-center gap-1"
          >
            <Mail className="w-3 h-3 text-[#0F5132] dark:text-emerald-400" />
            <span>{supportEmail}</span>
          </a>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/admin/login"
            className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition font-medium"
          >
            Administrator Login
          </Link>
          <span>© {new Date().getFullYear()} Akwaaba Homes Ghana</span>
        </div>
      </footer>
    </div>
  );
}
