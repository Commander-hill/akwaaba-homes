'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  ShieldCheck,
  Clock,
  Wrench,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  Building2,
  AlertCircle
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function PublicMaintenancePage() {
  const { data: configData } = useQuery({
    queryKey: ['public-config'],
    queryFn: async () => {
      try {
        const res = await api.get('/config/public');
        return res.data;
      } catch {
        // Fallback or retry
        return null;
      }
    },
    staleTime: 30 * 1000,
    refetchInterval: 30000,
  });

  const maintenanceEndTime = configData?.maintenanceEndTime || null;
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

  return (
    <div className="-mt-16 -mb-16 md:mb-0 min-h-screen w-full flex flex-col justify-between bg-[#F8F7F2] dark:bg-[#070B09] text-zinc-950 dark:text-zinc-100 antialiased p-6 sm:p-10 relative overflow-hidden">
      
      {/* Ambient background glow */}
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
        
        {/* Animated Badge Icon */}
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
            <span>Scheduled System Maintenance</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-zinc-950 dark:text-white tracking-tight leading-tight">
            We are upgrading our platform infrastructure
          </h1>

          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 max-w-xl mx-auto leading-relaxed">
            Our engineering team is currently deploying scheduled database performance enhancements and payment security upgrades. Public listings and room reservations will resume shortly.
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
      </main>

      {/* Footer: Emergency Support & Assistance */}
      <footer className="w-full max-w-4xl mx-auto border-t border-zinc-200 dark:border-zinc-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400 relative z-10">
        <div className="flex items-center gap-4">
          <span>Need immediate assistance?</span>
          <a
            href="https://wa.me/233200000000"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#16A34A] dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
          >
            <span>WhatsApp Support</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span>•</span>
          <a
            href="mailto:support@akwaabahomes.com"
            className="font-bold text-zinc-700 dark:text-zinc-300 hover:underline"
          >
            support@akwaabahomes.com
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
