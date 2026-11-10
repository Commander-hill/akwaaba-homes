'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PublicFooter from '@/components/tenant-ui/PublicFooter';
import {
  MapPin,
  ArrowRight,
  Play,
  Check,
  ShieldCheck,
  CreditCard,
  FileText,
  GraduationCap,
  Search,
  PenLine,
  HeartHandshake,
  ChevronRight
} from 'lucide-react';
import clsx from 'clsx';

function HeaderSwoosh({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx('w-48 h-2.5 mx-auto text-[#0B3B24] dark:text-emerald-500 opacity-40 dark:opacity-60', className)}
    >
      <path
        d="M2 9C55 2.5 125 10.5 238 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AboutPage() {
  const scrollToHowWeWork = (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById('how-we-work');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0C100D] text-[#14221A] dark:text-zinc-100 font-sans selection:bg-[#0B3B24] selection:text-white relative overflow-x-hidden">
      {/* ══════════════════════════════════════════════════════════════════════
          1. HERO SECTION: A better way to find a place to call home
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-6 sm:pt-10 lg:pt-12 pb-10 sm:pb-14 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        {/* Subtle Adinkra geometric watermark on the left edge */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-6 sm:top-10 w-44 sm:w-56 h-80 opacity-25 dark:opacity-10 pointer-events-none select-none -z-0"
        >
          <Image
            src="/images/about/adinkra-left-motif.jpg"
            alt=""
            fill
            className="object-cover object-left"
            sizes="(max-width: 768px) 100vw, 256px"
/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
          {/* Left Column: Headline, Copy, Action Buttons (7 Cols) */}
          <div className="lg:col-span-6 xl:col-span-5 space-y-6 sm:space-y-7 pr-2">
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-serif font-black text-[#14221A] dark:text-white tracking-tight leading-[1.08]">
                A better way to <br />
                find a place to <br />
                <span className="relative inline-block text-[#0B3B24] dark:text-emerald-400">
                  call home.
                  {/* Organic warm ochre/gold curved line under "call home." */}
                  <svg
                    viewBox="0 0 160 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-2.5 mt-1 text-[#D49339]"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 8C45 2.5 110 4 157 8.5"
                      stroke="currentColor"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </h1>

              <p className="text-xs sm:text-[14px] text-[#4A5A50] dark:text-zinc-300 leading-relaxed font-medium max-w-lg pt-1">
                AkwaabaHomes helps students, professionals, families and landlords navigate Ghana&apos;s rental market with verified listings, transparent terms and digital tenancy.
              </p>
            </div>

            {/* Action Buttons: Solid Green + Outlined Play Pill */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-[13px] font-bold transition shadow-xs cursor-pointer"
              >
                <span>Explore homes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={scrollToHowWeWork}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-transparent hover:bg-[#0B3B24]/5 border border-[#0B3B24] dark:border-emerald-500 text-[#0B3B24] dark:text-emerald-400 text-xs sm:text-[13px] font-bold transition cursor-pointer"
              >
                <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
                  <Play className="w-2 h-2 fill-current ml-0.5" />
                </div>
                <span>How we work</span>
              </button>
            </div>
          </div>

          {/* Right Column: High-Res Group Photo with Building Backdrop (5-6 Cols) */}
          <div className="lg:col-span-6 xl:col-span-7 relative">
            <div className="relative w-full h-[280px] sm:h-[360px] md:h-[420px] rounded-3xl overflow-hidden shadow-[0_10px_35px_rgba(11,59,36,0.06)] border border-[#E8E6DD] dark:border-zinc-800">
              <Image
                src="/images/about/about-hero-group-clean.jpg"
                alt="AkwaabaHomes residents and property host at apartment compound"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover object-center"
              />

              {/* Soft gradient edge fade into the clean white background */}
              <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white/60 dark:from-[#0C100D]/60 to-transparent pointer-events-none" />

              {/* Floating Pill: Built for renters and property owners across Ghana */}
              <div className="absolute bottom-4 right-4 z-20 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs border border-zinc-200/80 dark:border-zinc-700 shadow-md">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-3 h-3 stroke-[2.4]" />
                </span>
                <span className="text-[11px] font-bold text-zinc-900 dark:text-white">
                  Built for renters and property owners across Ghana
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          2. MISSION TRIAD BANNER: WHY WE STARTED
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto py-4">
        <div className="bg-[#EEF4EC] dark:bg-[#121A16] border border-[#DCE5DA] dark:border-zinc-800/80 rounded-3xl p-5 sm:p-7 grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center shadow-xs">
          {/* Left Column: Why We Started Tag + Headline (4 Cols) */}
          <div className="md:col-span-4 space-y-2 pr-2">
            <span className="inline-block text-[11px] font-black uppercase tracking-wider text-[#C88A2E]">
              WHY WE STARTED
            </span>
            <h2 className="text-xl sm:text-2xl font-serif font-black text-[#14221A] dark:text-white leading-tight">
              Renting should begin with confidence, not uncertainty.
            </h2>
          </div>

          {/* Middle Column: Stress Context (divided by vertical rule on md+) (4 Cols) */}
          <div className="md:col-span-4 md:border-l md:border-[#D5DFD3] dark:md:border-zinc-800 md:pl-6 space-y-1">
            <p className="text-xs sm:text-[13px] text-[#4A5A50] dark:text-zinc-300 leading-relaxed font-medium">
              From unclear fees and unreliable listings to fragmented communication and confusing paperwork, finding a decent place in Ghana can be stressful.
            </p>
          </div>

          {/* Right Column: Dark Green Quote Card + Ghana Line-Art (4 Cols) */}
          <div className="md:col-span-4 flex items-center gap-3">
            {/* Green Quote Card */}
            <div className="flex-1 bg-[#0B3B24] dark:bg-[#072416] text-white rounded-2xl p-4 sm:p-4.5 space-y-2 shadow-sm border border-emerald-900/40">
              <span className="text-2xl font-serif font-black text-[#E6A040] leading-none block">
                &ldquo;
              </span>
              <p className="text-xs sm:text-[12.5px] font-serif italic text-white/95 leading-snug">
                Clear information. Verified people. Better rental decisions.
              </p>
            </div>

            {/* Ghana Map & Building Line-Art Card */}
            <div className="w-24 sm:w-28 h-24 sm:h-28 relative rounded-2xl overflow-hidden shrink-0 border border-[#DCE5DA] dark:border-zinc-800 bg-[#E8EFE6] dark:bg-zinc-800/40">
              <Image
                src="/images/about/ghana-line-art.jpg"
                alt="Ghana Map and Property Architecture Line Art"
                fill
                sizes="112px"
                className="object-cover object-center"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          3. HOW WE MAKE RENTING CLEARER (4 Linear Steps with Chevrons)
         ══════════════════════════════════════════════════════════════════════ */}
      <section id="how-we-work" className="px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto py-10 sm:py-14 space-y-8">
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#14221A] dark:text-white tracking-tight">
            How we make renting clearer
          </h2>
          <HeaderSwoosh />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          {/* Step 1: Discover verified homes */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#E9E7DE] dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40">
                <Search className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                  Discover
                </p>
                <p className="text-[11px] text-[#55665B] dark:text-zinc-400">
                  verified homes
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600 hidden lg:block" />
          </div>

          {/* Step 2: Review clear prices and terms */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#E9E7DE] dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40">
                <FileText className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                  Review clear prices
                </p>
                <p className="text-[11px] text-[#55665B] dark:text-zinc-400">
                  and terms
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600 hidden lg:block" />
          </div>

          {/* Step 3: Book and sign digitally */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#E9E7DE] dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40">
                <PenLine className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                  Book and sign digitally
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600 hidden lg:block" />
          </div>

          {/* Step 4: Move in with records and support */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-zinc-900/60 border border-[#E9E7DE] dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40">
                <HeartHandshake className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                  Move in with records
                </p>
                <p className="text-[11px] text-[#55665B] dark:text-zinc-400">
                  and support
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          4. THE STANDARDS BEHIND EVERY LISTING (4 Core Safeguards)
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto py-8 sm:py-12 space-y-8">
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#14221A] dark:text-white tracking-tight">
            The standards behind every listing
          </h2>
          <HeaderSwoosh />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Item 1: Verified host identity and ownership checks */}
          <div className="flex items-start gap-3.5 p-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40 mt-0.5">
              <ShieldCheck className="w-5 h-5 stroke-[2.1]" />
            </div>
            <p className="text-xs sm:text-[12.5px] font-bold text-[#14221A] dark:text-zinc-200 leading-snug">
              Verified host identity and ownership checks
            </p>
          </div>

          {/* Item 2: Secure MoMo and card checkout with digital receipts */}
          <div className="flex items-start gap-3.5 p-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40 mt-0.5">
              <CreditCard className="w-5 h-5 stroke-[2.1]" />
            </div>
            <p className="text-xs sm:text-[12.5px] font-bold text-[#14221A] dark:text-zinc-200 leading-snug">
              Secure MoMo and card checkout with digital receipts
            </p>
          </div>

          {/* Item 3: Digitally executed tenancy agreements and clear rental terms */}
          <div className="flex items-start gap-3.5 p-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40 mt-0.5">
              <FileText className="w-5 h-5 stroke-[2.1]" />
            </div>
            <p className="text-xs sm:text-[12.5px] font-bold text-[#14221A] dark:text-zinc-200 leading-snug">
              Digitally executed tenancy agreements and clear rental terms
            </p>
          </div>

          {/* Item 4: Student accommodations safeguards */}
          <div className="flex items-start gap-3.5 p-3">
            <div className="w-11 h-11 rounded-2xl bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40 mt-0.5">
              <GraduationCap className="w-5 h-5 stroke-[2.1]" />
            </div>
            <p className="text-xs sm:text-[12.5px] font-bold text-[#14221A] dark:text-zinc-200 leading-snug">
              Student accommodations safeguards such as room capacity, eligibility and compatibility information
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          5. WHO WE BRING TOGETHER (Dual Resident / Landlord Cards)
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto py-8 sm:py-12 space-y-8">
        <div className="text-center space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#14221A] dark:text-white tracking-tight">
            Who we bring together
          </h2>
          <HeaderSwoosh />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: For residents */}
          <Link
            href="/search"
            className="group relative h-48 sm:h-56 rounded-3xl overflow-hidden border border-[#E0DED4] dark:border-zinc-800 shadow-md block transition transform active:scale-[0.99]"
          >
            <Image
              src="/images/about/for-residents-photo.jpg"
              alt="Residents using AkwaabaHomes on smartphone"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            {/* Dark gradient on the left side */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />

            <div className="relative z-10 h-full p-6 sm:p-7 flex flex-col justify-between max-w-xs sm:max-w-sm">
              <div className="space-y-1.5">
                <span className="text-base sm:text-lg font-black text-white block">
                  For residents
                </span>
                <p className="text-xs sm:text-[13px] text-white/90 leading-snug font-medium">
                  Discover, compare and manage a stay.
                </p>
              </div>

              <div className="w-8 h-8 rounded-full bg-white text-[#14221A] flex items-center justify-center shadow-md group-hover:bg-[#16A34A] group-hover:text-white transition-colors">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* Card 2: For landlords */}
          <Link
            href="/contact"
            className="group relative h-48 sm:h-56 rounded-3xl overflow-hidden border border-[#E0DED4] dark:border-zinc-800 shadow-md block transition transform active:scale-[0.99]"
          >
            <Image
              src="/images/about/for-landlords-photo.jpg"
              alt="Landlord managing listings on laptop"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
            />
            {/* Dark gradient on the left side */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />

            <div className="relative z-10 h-full p-6 sm:p-7 flex flex-col justify-between max-w-xs sm:max-w-sm">
              <div className="space-y-1.5">
                <span className="text-base sm:text-lg font-black text-white block">
                  For landlords
                </span>
                <p className="text-xs sm:text-[13px] text-white/90 leading-snug font-medium">
                  List and manage properties with clearer communication and records.
                </p>
              </div>

              <div className="w-8 h-8 rounded-full bg-white text-[#14221A] flex items-center justify-center shadow-md group-hover:bg-[#16A34A] group-hover:text-white transition-colors">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          6. BOTTOM CALL-TO-ACTION BANNER: Adinkra Motif Strip
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full bg-[#072B1A] text-white overflow-hidden py-3 px-4 sm:px-8 border-y border-emerald-950/60">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
        >
          <Image
            src="/images/about/bottom-cta-pattern.jpg"
            alt=""
            fill
            className="object-cover object-center"
            sizes="(max-width: 768px) 100vw, 256px"
/>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 sm:gap-6 relative z-10 text-center sm:text-left">
          <p className="text-xs sm:text-sm lg:text-base font-serif font-bold text-white tracking-wide">
            Let&apos;s make your next move a more confident one.
          </p>

          <Link
            href="/search"
            className="px-5 py-2 rounded-full bg-white hover:bg-zinc-100 text-[#14221A] text-xs font-extrabold transition shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <span>Browse verified homes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          7. FOOTER
         ══════════════════════════════════════════════════════════════════════ */}
      <PublicFooter />
    </div>
  );
}
