'use client';
import '@/app/secondary.css';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import api from '@/lib/axios';
import QueryProvider from '@/providers/QueryProvider';
import {
  ShieldCheck,
  CalendarCheck,
  FileText,
  Wallet,
  ArrowRight,
  Play,
  Search,
  PenLine,
  Home,
  GraduationCap,
  Check,
  ChevronDown,
  Sun,
  Moon,
  Bell,
} from 'lucide-react';

const SERVICE_CARDS = [
  {
    title: 'Find verified accommodation',
    description: 'Hostels, rooms, studios and apartments.',
    image: '/images/services/card-find-accommodation.jpg',
    href: '/properties',
  },
  {
    title: 'Book with clear terms',
    description: 'Direct host contact, transparent pricing and no roadside viewing fees.',
    image: '/images/services/card-book-clear-terms.jpg',
    href: '/search',
  },
  {
    title: 'Sign and manage your tenancy',
    description: 'Digital tenancy agreements and resident records.',
    image: '/images/services/card-sign-tenancy.jpg',
    href: '/dashboard/agreements',
  },
  {
    title: 'Pay securely',
    description: 'Paystack checkout with Mobile Money and cards, digital receipts.',
    image: '/images/services/card-pay-securely.jpg',
    href: '/dashboard/invoice',
  },
];

function ServicesContent() {
  const journeyRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: userResponse } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/me');
        return data;
      } catch {
        return null;
      }
    },
    retry: false,
  });

  const user = userResponse?.user;
  const initials = user
    ? `${user.firstName?.[0] || 'S'}${user.lastName?.[0] || 'D'}`.toUpperCase()
    : 'SD';
  const dashboardHref =
    user?.role === 'LANDLORD'
      ? '/dashboard/landlord'
      : user?.role === 'CARETAKER' || user?.role === 'STAFF'
      ? '/dashboard/caretaker'
      : '/dashboard/tenant';

  return (
    <div className="-mt-16 min-h-screen bg-white text-[#14221A] flex flex-col justify-between font-sans overflow-x-hidden pt-16">
      {/* ══════════════════════════════════════════════════════════════════════
          1. INTEGRATED HERO SECTION WITH TOP OVERLAY NAVBAR
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full bg-white overflow-hidden">
        {/* Right-Side Full-Bleed Curved Wave + Apartment Building & Palm Trees */}
        <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-[62%] pointer-events-none select-none z-0">
          <Image
            src="/images/services/services-hero-building.jpg"
            alt="Verified AkwaabaHomes Residence"
            fill
            priority
            sizes="65vw"
            className="object-cover object-left-bottom"
          />
          {/* Left blend into #FAF6EC */}
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#FAF6EC] to-transparent" />
        </div>

        {/* ── Top Fixed Navigation Bar ── */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0D100E]/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          {/* Left: Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 relative flex items-center justify-center shrink-0">
              <Image
                src="/logo-light.png"
                alt="AkwaabaHomes"
                width={40}
                height={40}
                className="w-full h-full object-contain block dark:hidden transition-transform duration-300 group-hover:scale-105"
                priority
              />
              <Image
                src="/logo.png"
                alt="AkwaabaHomes"
                width={40}
                height={40}
                className="w-full h-full object-contain hidden dark:block transition-transform duration-300 group-hover:scale-105"
                priority
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-black text-base tracking-tight text-[#141816] dark:text-white">
                AkwaabaHomes
              </span>
              <span className="text-[10px] text-[#3B6E5C] dark:text-emerald-400 font-medium mt-0.5">
                Live Well. Feel at Home.
              </span>
            </div>
          </Link>

          {/* Center: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#233128]">
            <Link href="/" className="hover:text-[#15803D] transition">
              Home
            </Link>
            <Link href="/properties" className="hover:text-[#15803D] transition">
              Explore
            </Link>
            <Link href="/search" className="hover:text-[#15803D] transition">
              Neighborhoods
            </Link>
            <Link
              href="/services"
              className="text-[#15803D] font-bold inline-flex items-center gap-0.5 relative py-1.5 after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[2px] after:bg-[#15803D] after:rounded-full"
            >
              <span>Services</span>
              <ChevronDown className="w-3 h-3" />
            </Link>
            <Link href="/about" className="hover:text-[#15803D] transition">
              About
            </Link>
            <Link href="/support" className="hover:text-[#15803D] transition">
              Support
            </Link>
          </nav>

          {/* Right: Theme Icons + Bookings + Notification + My Account */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Theme Toggles */}
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle dark mode"
              title={mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/60 hover:bg-white/85 backdrop-blur-xs text-[#2B3B31] cursor-pointer transition shadow-2xs"
            >
              <Sun className={`w-3.5 h-3.5 ${mounted && resolvedTheme === 'dark' ? 'text-amber-400' : 'text-[#14221A]'}`} />
              <Moon className={`w-3.5 h-3.5 ${mounted && resolvedTheme === 'dark' ? 'text-emerald-400' : 'text-zinc-500'}`} />
            </button>

            {/* Bookings Button */}
            <Link
              href={user ? '/dashboard/tenant/bookings' : '/bookings'}
              className="px-3.5 py-1.5 rounded-lg bg-white/95 hover:bg-white text-[#14221A] text-[11.5px] font-bold inline-flex items-center gap-1.5 shadow-xs transition"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-[#15803D]" />
              <span>Bookings</span>
            </Link>

            {/* Bell with Red 1 Badge */}
            <Link
              href={user ? '/dashboard/notifications' : '/login'}
              className="relative w-8 h-8 rounded-lg bg-white/85 hover:bg-white flex items-center justify-center text-[#14221A] shadow-xs transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#DC2626] text-white text-[9px] font-extrabold flex items-center justify-center">
                1
              </span>
            </Link>

            {/* My Account Button */}
            <Link
              href={user ? dashboardHref : '/login'}
              className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-xs font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white transition-colors shadow-xs"
            >
              <span className="w-5 h-5 rounded-full bg-white/20 text-white text-[10px] font-extrabold flex items-center justify-center">
                {initials}
              </span>
              <span className="hidden sm:inline">{user ? 'My Account' : 'My Account'}</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </Link>
          </div>
        </div>
      </header>

        {/* ── Hero Content Container ── */}
        <div className="relative z-10 max-w-[1380px] mx-auto px-4 sm:px-8 lg:px-12 pt-4 pb-8 lg:py-9">
          <div className="max-w-lg space-y-3.5">
            {/* OUR SERVICES Badge */}
            <span className="inline-block px-3 py-1 rounded-lg bg-[#EFECE1] border border-[#DDD7C5] text-[#2B3B31] text-[10px] font-extrabold uppercase tracking-wider">
              OUR SERVICES
            </span>

            {/* Display Heading */}
            <h1 className="font-serif text-[32px] sm:text-[40px] lg:text-[44px] font-extrabold text-[#0B3B24] tracking-tight leading-[1.08]">
              Housing services
              <br />
              built around <span className="text-[#15803D]">trust.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-[13.5px] text-[#2F3E35] leading-relaxed max-w-md font-medium">
              Get verified accommodation, transparent booking, digital tenancy, secure payments and student protection across Ghana.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href="/properties"
                className="px-5 py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold inline-flex items-center gap-2 shadow-xs transition"
              >
                <span>Explore accommodation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>

              <button
                type="button"
                onClick={() =>
                  journeyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
                className="px-4 py-2.5 rounded-lg bg-white hover:bg-white border border-zinc-200 text-[#14221A] text-xs font-bold inline-flex items-center gap-2 transition cursor-pointer"
              >
                <span className="w-4 h-4 rounded-full border border-[#14221A] inline-flex items-center justify-center">
                  <Play className="w-2 h-2 fill-[#14221A] ml-0.5" />
                </span>
                <span>How it works</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          2. 4-PILLAR TRUST STRIP
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="w-full bg-white border-y border-zinc-200">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-8 lg:px-12 py-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-zinc-200 text-xs font-bold text-[#1E2E24]">
            <div className="flex items-center justify-center gap-2 py-1.5 lg:py-0.5">
              <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span>Verified hosts</span>
            </div>

            <div className="flex items-center justify-center gap-2 py-1.5 lg:py-0.5">
              <CalendarCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span>Direct booking</span>
            </div>

            <div className="flex items-center justify-center gap-2 py-1.5 lg:py-0.5">
              <FileText className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span>Digital agreements</span>
            </div>

            <div className="flex items-center justify-center gap-2 py-1.5 lg:py-0.5">
              <Wallet className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span>MoMo &amp; card payments</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          3. MAIN BODY CONTENT
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-8 lg:px-12 py-5 space-y-5 flex-1 flex flex-col justify-between">
        {/* ── Section 1: What you can do with AkwaabaHomes (4 Stepped Photo Cards) ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-[#15803D]" />
            <h2 className="text-[16px] sm:text-[17px] font-extrabold text-[#0B3B24]">
              What you can do with AkwaabaHomes
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {SERVICE_CARDS.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group relative h-[112px] sm:h-[118px] rounded-2xl overflow-hidden border border-[#E5E2D7] shadow-[0_2px_10px_rgba(11,59,36,0.04)] block transition hover:-translate-y-0.5"
              >
                {/* Cleaned L-Shaped Card Artwork with Circular Green Icon Badge */}
                <Image
                  src={card.image}
                  alt={card.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-fill"
                />

                {/* Crisp HTML Text Overlaid in the Cleaned Bottom-Right Cream Cutout */}
                <div className="absolute left-[26%] right-2 bottom-1.5 top-[50%] flex flex-col justify-center pr-1">
                  <h3 className="text-[12px] xl:text-[12.5px] font-extrabold text-[#14221A] leading-tight group-hover:text-[#15803D] transition">
                    {card.title}
                  </h3>
                  <p className="text-[10px] xl:text-[10.5px] text-[#4A5A50] leading-[1.25] mt-0.5 line-clamp-2">
                    {card.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Section 2: A safer rental journey, from search to move-in. ── */}
        <div
          ref={journeyRef}
          className="bg-[#EEF5EE] border border-[#D4E4D6] rounded-2xl px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[0_2px_10px_rgba(11,59,36,0.02)]"
        >
          {/* Left Title */}
          <div className="flex items-stretch gap-3 shrink-0">
            <span className="w-1 rounded-full bg-[#15803D] my-0.5" />
            <div>
              <h2 className="text-[16px] sm:text-[17.5px] font-extrabold text-[#0B3B24] leading-snug">
                A safer rental journey,
                <br />
                from search to move-in.
              </h2>
            </div>
          </div>

          {/* Right 4-Step Horizontal Flow */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:pl-6 items-start">
            {/* Step 1: Discover */}
            <div className="relative flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0F6938] text-white text-[10.5px] font-extrabold inline-flex items-center justify-center">
                  1
                </span>
                <Search className="w-4 h-4 text-[#15803D]" />
                <ArrowRight className="hidden lg:block w-3.5 h-3.5 text-[#15803D] ml-auto mr-3" />
              </div>
              <p className="text-xs font-extrabold text-[#14221A] mt-0.5">Discover</p>
              <p className="text-[10.5px] text-[#4A5A50] leading-snug">
                Browse verified homes across Ghana.
              </p>
            </div>

            {/* Step 2: Verify */}
            <div className="relative flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0F6938] text-white text-[10.5px] font-extrabold inline-flex items-center justify-center">
                  2
                </span>
                <ShieldCheck className="w-4 h-4 text-[#15803D]" />
                <ArrowRight className="hidden lg:block w-3.5 h-3.5 text-[#15803D] ml-auto mr-3" />
              </div>
              <p className="text-xs font-extrabold text-[#14221A] mt-0.5">Verify</p>
              <p className="text-[10.5px] text-[#4A5A50] leading-snug">
                Check host and property details.
              </p>
            </div>

            {/* Step 3: Book & sign */}
            <div className="relative flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0F6938] text-white text-[10.5px] font-extrabold inline-flex items-center justify-center">
                  3
                </span>
                <PenLine className="w-4 h-4 text-[#15803D]" />
                <ArrowRight className="hidden lg:block w-3.5 h-3.5 text-[#15803D] ml-auto mr-3" />
              </div>
              <p className="text-xs font-extrabold text-[#14221A] mt-0.5">Book &amp; sign</p>
              <p className="text-[10.5px] text-[#4A5A50] leading-snug">
                Secure your booking and sign tenancy digitally.
              </p>
            </div>

            {/* Step 4: Move in */}
            <div className="relative flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#0F6938] text-white text-[10.5px] font-extrabold inline-flex items-center justify-center">
                  4
                </span>
                <Home className="w-4 h-4 text-[#15803D]" />
              </div>
              <p className="text-xs font-extrabold text-[#14221A] mt-0.5">Move in</p>
              <p className="text-[10.5px] text-[#4A5A50] leading-snug">
                Settle into your new home.
              </p>
            </div>
          </div>
        </div>

        {/* ── Section 3: Protection for every kind of resident (2 Split Cards) ── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-[#15803D]" />
            <h2 className="text-[16px] sm:text-[17px] font-extrabold text-[#0B3B24]">
              Protection for every kind of resident
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card 1: Student Housing */}
            <div className="bg-[#F7EFE2] border border-[#E6DAC7] rounded-2xl overflow-hidden flex flex-col sm:flex-row items-stretch shadow-2xs">
              <div className="w-full sm:w-[220px] h-28 sm:h-auto relative shrink-0">
                <Image
                  src="/images/services/student-housing.jpg"
                  alt="Student Housing"
                  fill
                  sizes="220px"
                  className="object-cover"
                />
              </div>

              <div className="p-3.5 sm:p-4 flex items-start gap-2.5 flex-1">
                <div className="w-7 h-7 rounded-full bg-[#E3F1E5] text-[#15803D] flex items-center justify-center shrink-0 mt-0.5">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[14.5px] font-extrabold text-[#14221A]">
                    Student Housing
                  </h3>
                  <p className="text-[11px] text-[#3B4B41] leading-relaxed font-medium">
                    Campus-focused listings, room/bed capacity tracking, student eligibility checks and roommate compatibility.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Landlord Services */}
            <div className="bg-[#F7EFE2] border border-[#E6DAC7] rounded-2xl overflow-hidden flex flex-col sm:flex-row items-stretch shadow-2xs">
              <div className="w-full sm:w-[200px] h-28 sm:h-auto relative shrink-0">
                <Image
                  src="/images/services/landlord-services.jpg"
                  alt="Landlord Services"
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              </div>

              <div className="p-3.5 sm:p-4 flex items-start gap-2.5 flex-1">
                <div className="w-7 h-7 rounded-full bg-[#E3F1E5] text-[#15803D] flex items-center justify-center shrink-0 mt-0.5">
                  <Home className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[14.5px] font-extrabold text-[#14221A]">
                    Landlord Services
                  </h3>
                  <p className="text-[11px] text-[#3B4B41] leading-relaxed font-medium">
                    Identity and ownership checks, listing management, room availability and rent payouts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 4: The AkwaabaHomes standard Bar ── */}
        <div className="bg-white border border-zinc-200 rounded-2xl px-4 sm:px-6 py-3 shadow-2xs space-y-2">
          <h3 className="text-xs sm:text-[13px] font-extrabold text-[#14221A]">
            The AkwaabaHomes standard
          </h3>

          <div className="pt-1.5 border-t border-zinc-200 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 lg:divide-x divide-zinc-200 text-[11px] font-semibold text-[#233128]">
            {[
              'Clear viewing terms',
              'Transparent pricing',
              'Verified host details',
              'Documented tenancy',
              'Secure checkout',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center lg:justify-center gap-1.5 first:lg:justify-start"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          4. BOTTOM DARK GREEN CTA BAND + FOOTER BAR
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="w-full mt-auto">
        {/* Dark Green CTA Strip */}
        <div className="relative w-full bg-[#10492B] text-white overflow-hidden py-3.5 px-4 sm:px-8 lg:px-12">
          {/* Right Architectural Line Art Watermark */}
          <div className="hidden md:block absolute right-4 top-0 bottom-0 w-[300px] pointer-events-none select-none opacity-90">
            <Image
              src="/images/services/cta-arch-art.png"
              alt="Ghana Architecture Line Art"
              fill
              sizes="300px"
              className="object-contain object-right-bottom"
            />
          </div>

          <div className="relative z-10 max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10">
            <div className="flex items-center gap-2.5">
              <Home className="w-5 h-5 text-emerald-300 shrink-0" />
              <h2 className="text-sm sm:text-[16px] font-extrabold tracking-tight text-white">
                Find a place you can book with confidence
              </h2>
            </div>

            <Link
              href="/properties"
              className="px-5 py-2 rounded-lg bg-white hover:bg-white text-[#14221A] text-xs font-extrabold inline-flex items-center gap-1.5 shadow-xs transition shrink-0"
            >
              <span>Browse homes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Footer Bar */}
        <footer className="w-full bg-white border-t border-zinc-200 py-3.5 px-4 sm:px-8 lg:px-12">
          <div className="max-w-[1380px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-3 text-[11px] text-[#3B4B41]">
            {/* Left Brand */}
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo-light.png"
                alt="AkwaabaHomes"
                width={32}
                height={32}
                className="w-8 h-8 object-contain block dark:hidden"
              />
              <Image
                src="/logo.png"
                alt="AkwaabaHomes"
                width={32}
                height={32}
                className="w-8 h-8 object-contain hidden dark:block"
              />
              <div className="leading-none">
                <p className="font-black text-xs text-[#141816] dark:text-white">
                  AkwaabaHomes
                </p>
                <p className="text-[9.5px] text-[#3B6E5C] dark:text-emerald-400 font-medium mt-0.5">
                  Live Well. Feel at Home.
                </p>
              </div>
            </Link>

            {/* Center Links */}
            <div className="flex flex-wrap items-center justify-center gap-3 font-semibold text-[#233128]">
              <Link href="/properties" className="hover:text-[#15803D] transition">
                Explore
              </Link>
              <span className="text-zinc-300">|</span>
              <Link href="/dashboard/tenant" className="hover:text-[#15803D] transition">
                Resident Portal
              </Link>
              <span className="text-zinc-300">|</span>
              <Link href="/support" className="hover:text-[#15803D] transition">
                Support &amp; Legal
              </Link>
              <span className="text-zinc-300">|</span>
              <Link href="/about" className="hover:text-[#15803D] transition">
                About Us
              </Link>
              <span className="text-zinc-300">|</span>
              <Link href="/support" className="hover:text-[#15803D] transition">
                Contact
              </Link>
            </div>

            {/* Right Social Icons & Copyright */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-[#14221A] font-bold">
                <span className="w-4 h-4 rounded-full bg-[#14221A] text-white text-[9px] inline-flex items-center justify-center">
                  f
                </span>
                <span className="text-xs font-extrabold">𝕏</span>
                <span className="w-4 h-4 rounded-md border border-[#14221A] text-[9px] inline-flex items-center justify-center">
                  ◎
                </span>
                <span className="w-4 h-3.5 rounded-xs bg-[#14221A] text-white text-[8px] inline-flex items-center justify-center">
                  ▶
                </span>
                <span className="text-xs font-extrabold">in</span>
              </div>
              <span className="text-[10.5px] text-[#4A5A50]">
                © 2026 AkwaabaHomes Ghana. All rights reserved.
              </span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <QueryProvider>
      <ServicesContent />
    </QueryProvider>
  );
}
