'use client';

import React from 'react';
import Link from 'next/link';
import {
  Lock,
  ArrowRight,
  ShieldCheck,
  Building2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface ResidentLockedTeaserProps {
  title: string;
  badge?: string;
  description: string;
  bullets: string[];
  ctaText?: string;
  ctaHref?: string;
  icon: React.ElementType;
}

export default function ResidentLockedTeaser({
  title,
  badge = 'Unlocks Upon Move-In',
  description,
  bullets,
  ctaText = 'Explore Verified Properties',
  ctaHref = '/properties',
  icon: Icon,
}: ResidentLockedTeaserProps) {
  return (
    <div className="w-full max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <div className="relative rounded-3xl bg-gradient-to-b from-white to-zinc-50 dark:from-[#141816] dark:to-[#0F1210] border border-zinc-200 dark:border-zinc-800 p-6 sm:p-10 shadow-sm overflow-hidden text-center">
        {/* Subtle decorative background gradient */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Floating Lock & Feature Icon */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shadow-xs">
            <Icon className="w-8 h-8 stroke-[1.8]" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-md">
            <Lock className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 mb-3 tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{badge}</span>
        </div>

        {/* Title & Description */}
        <h2 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
          {title}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto mt-2 leading-relaxed">
          {description}
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-8 text-left max-w-2xl mx-auto">
          {bullets.map((bullet, idx) => (
            <div
              key={idx}
              className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl p-4 flex items-start gap-2.5 shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-xs text-zinc-700 dark:text-zinc-300 leading-snug font-medium">
                {bullet}
              </span>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href={ctaHref}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-bold shadow-xs transition duration-150"
          >
            <Building2 className="w-4 h-4" />
            <span>{ctaText}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard/tenant/bookings"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold transition duration-150"
          >
            <span>Check My Bookings</span>
          </Link>
        </div>

        {/* Trust Note */}
        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-6 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Automatic unlock upon approved booking and digital lease signature.</span>
        </p>
      </div>
    </div>
  );
}
