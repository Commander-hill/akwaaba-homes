'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  ShieldCheck,
  Clock,
  Wrench,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Bell,
  Check,
  AlertCircle
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
      const now = new Date().getTime();
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
  const rawTitle = configData?.maintenanceTitle || 'Platform Infrastructure Maintenance';
  const rawMessage = configData?.maintenanceMessage || 
    'Our engineering team is currently conducting scheduled database performance enhancements and infrastructure upgrades. All resident records and tenancy agreements remain strictly safeguarded.';

  return (
    <div className="-mt-16 -mb-16 md:mb-0 min-h-screen w-full flex flex-col justify-between bg-[#F8F7F2] dark:bg-[#070B09] text-zinc-950 dark:text-zinc-100 antialiased p-6 sm:p-10 relative overflow-hidden">
      
      {/* Background ambient gradient */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#0F5132]/10 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none select-none" />

      {/* Top Header: Brand & Theme */}
      <header className="w-full max-w-4xl mx-auto flex items-center justify-between relative z-10">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#0F5132] flex items-center justify-center shadow-xs">
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
            <span className="text-base font-black tracking-tight text-zinc-950 dark:text-white leading-none">
              Akwaaba<span className="text-[#0F5132] dark:text-emerald-400">Homes</span>
            </span>
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 tracking-wide mt-0.5">
              Ghanaian Rental Marketplace
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition shadow-2xs cursor-pointer"
            title="Check live platform status"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${isFetching ? 'animate-spin text-[#0F5132]' : ''}`} />
            <span className="hidden sm:inline">Check Status</span>
          </button>
          <ThemeToggle />
          <Link
            href="/admin/login"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition shadow-2xs"
          >
            <Lock className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
            <span>Admin Gateway</span>
          </Link>
        </div>
      </header>

      {/* Center Hero Advisory Card */}
      <main className="w-full max-w-2xl mx-auto my-12 relative z-10 text-center space-y-8">
        
        {/* If maintenance has ended */}
        {!isMaintenanceActive && !isLoading ? (
          <div className="p-8 rounded-3xl bg-white dark:bg-[#12151D] border border-emerald-500/40 shadow-xl space-y-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-zinc-950 dark:text-white">
                Platform Services Restored
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
                Maintenance has completed successfully. All rental search discovery, verified listings, and resident portals are now fully operational.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0F5132] hover:bg-[#0c4027] text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                <span>Return to Marketplace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Active Maintenance Advisory */}
            <div className="relative inline-flex items-center justify-center">
              <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-[#0F5132] dark:text-emerald-400 shadow-xl">
                <Wrench className="w-10 h-10 animate-pulse" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#16A34A] text-white flex items-center justify-center text-xs font-black shadow-md border-2 border-white dark:border-[#070B09]">
                ✓
              </span>
            </div>

            {/* Heading & Subtitle */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-950/50 border border-emerald-500/30 text-[#0F5132] dark:text-emerald-400 text-xs font-black uppercase tracking-wider">
                <span>
                  {configData?.maintenanceScope === 'TENANTS_ONLY'
                    ? 'Tenant Portal Maintenance'
                    : configData?.maintenanceScope === 'LANDLORDS_ONLY'
                    ? 'Landlord Operations Maintenance'
                    : 'Scheduled System Maintenance'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-950 dark:text-white tracking-tight leading-tight">
                {rawTitle}
              </h1>

              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 max-w-xl mx-auto leading-relaxed">
                {rawMessage}
              </p>
            </div>

            {/* Live Countdown Clock */}
            {timeLeft && !timeLeft.isExpired ? (
              <div className="p-6 rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800/80 shadow-md max-w-md mx-auto space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Estimated Platform Reopening In</span>
                </div>

                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 text-center">
                    <span className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </span>
                    <span className="block text-[10px] font-bold text-zinc-500 uppercase mt-0.5">Hours</span>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 text-center">
                    <span className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </span>
                    <span className="block text-[10px] font-bold text-zinc-500 uppercase mt-0.5">Minutes</span>
                  </div>
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 text-center">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </span>
                    <span className="block text-[10px] font-bold text-zinc-500 uppercase mt-0.5">Seconds</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 shadow-xs">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Target completion: within the scheduled maintenance window</span>
              </div>
            )}

            {/* Email Notification Subscription Form */}
            <div className="max-w-md mx-auto p-5 rounded-2xl bg-white/80 dark:bg-[#12151D]/80 border border-zinc-200/80 dark:border-zinc-800/80 text-left space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-zinc-200">
                <Bell className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                <span>Notify me when services are back online</span>
              </div>
              {subscribed ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>You are subscribed. We will email you the moment the platform resumes.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    required
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-1 focus:ring-[#0F5132]"
                  />
                  <button
                    type="submit"
                    disabled={subscribeMutation.isPending}
                    className="px-4 py-2 rounded-xl bg-[#0F5132] hover:bg-[#0c4027] text-white text-xs font-bold transition shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {subscribeMutation.isPending ? 'Subscribing...' : 'Notify Me'}
                  </button>
                </form>
              )}
            </div>

            {/* Security & Escrow Safeguard Guarantees */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-xl mx-auto pt-2">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D]/60 border border-zinc-200/60 dark:border-zinc-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-950 dark:text-white">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>100% Escrow Protected</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  All resident rental payments and landlord disbursements are strictly held in statutory escrow.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D]/60 border border-zinc-200/60 dark:border-zinc-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-950 dark:text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Leases Unaffected</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  Signed tenancy agreements, verified title deeds, and gatehouse resident passes remain active.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D]/60 border border-zinc-200/60 dark:border-zinc-800/60 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-950 dark:text-white">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Ghana Card Encrypted</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                  All tenant and landlord National Identification records remain fully encrypted and audited.
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer: Emergency Support & Assistance */}
      <footer className="w-full max-w-4xl mx-auto border-t border-zinc-200 dark:border-zinc-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400 relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          <span>Need immediate assistance?</span>
          <a
            href={`tel:${supportPhone}`}
            className="font-bold text-zinc-800 dark:text-zinc-200 hover:underline inline-flex items-center gap-1"
          >
            <Phone className="w-3 h-3 text-[#0F5132] dark:text-emerald-400" />
            <span>{supportPhone}</span>
          </a>
          <span>•</span>
          <a
            href={`mailto:${supportEmail}`}
            className="font-bold text-zinc-800 dark:text-zinc-200 hover:underline inline-flex items-center gap-1"
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
