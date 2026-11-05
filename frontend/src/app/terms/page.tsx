'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ShieldCheck, 
  Scale, 
  Lock, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Building2, 
  GraduationCap, 
  Printer, 
  Copy, 
  Check, 
  ArrowRight, 
  ChevronRight, 
  HelpCircle, 
  Users, 
  CreditCard, 
  Mail, 
  Headphones, 
  Bookmark, 
  MapPin, 
  Calendar, 
  AlertCircle,
  Eye,
  Bell,
  Home,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import ThemeToggle from '@/components/ThemeToggle';

interface Section {
  id: string;
  num: string;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
}

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('section-01');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'section-01': true,
    'section-02': false,
    'section-03': false,
    'section-04': false,
    'section-05': false,
    'section-06': false,
    'section-07': false,
    'section-08': false,
  });
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Track scroll position to update active section in sidebar
  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = document.querySelectorAll('div[data-section-id]');
      const scrollPosition = window.scrollY + 260;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const el = sectionElements[i] as HTMLElement;
        if (el.offsetTop <= scrollPosition) {
          const id = el.getAttribute('data-section-id');
          if (id) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setExpandedSections((prev) => ({ ...prev, [id]: true }));
    const el = document.querySelector(`[data-section-id="${id}"]`);
    if (el) {
      const yOffset = -90;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    toast.success('Section terms copied to clipboard');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const currentSectionNumber = activeSection.replace('section-', '');

  const SECTIONS_LIST = [
    { id: 'section-01', num: '01', title: 'Acceptance of platform terms' },
    { id: 'section-02', num: '02', title: 'User roles & identity verification' },
    { id: 'section-03', num: '03', title: 'Reservations & payment processing' },
    { id: 'section-04', num: '04', title: 'Shared rooms & student allocation' },
    { id: 'section-05', num: '05', title: 'Digital tenancy agreements' },
    { id: 'section-06', num: '06', title: 'Listing standards & anti-fraud' },
    { id: 'section-07', num: '07', title: 'Move-in, disputes & refunds' },
    { id: 'section-08', num: '08', title: 'Liability & governing law' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#FAF7F0] dark:bg-[#0D100E] text-zinc-900 dark:text-zinc-100 flex flex-col justify-between antialiased transition-colors font-sans">
      
      {/* ──── TOP GLOBAL NAVIGATION ──── */}
      <header className="w-full bg-[#FAF7F0] dark:bg-[#0D100E] border-b border-zinc-200/80 dark:border-zinc-800/80 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="AkwaabaHomes"
                width={38}
                height={38}
                className="w-full h-full object-contain hidden dark:block transition-transform duration-300 group-hover:scale-105"
                priority
              />
              <Image
                src="/logo-light.png"
                alt="AkwaabaHomes"
                width={38}
                height={38}
                className="w-full h-full object-contain block dark:hidden transition-transform duration-300 group-hover:scale-105"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-[#0C3827] dark:text-white leading-none">
                AkwaabaHomes
              </span>
              <span className="text-[10px] font-medium text-emerald-800 dark:text-emerald-400 mt-0.5">
                Live Well. Feel at Home.
              </span>
            </div>
          </Link>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            <Link href="/" className="hover:text-[#0C3827] dark:hover:text-emerald-400 transition">
              Home
            </Link>
            <Link href="/properties" className="hover:text-[#0C3827] dark:hover:text-emerald-400 transition">
              Explore
            </Link>
            <Link href="/properties?tab=neighbourhoods" className="hover:text-[#0C3827] dark:hover:text-emerald-400 transition">
              Neighbourhoods
            </Link>
            <Link href="/services" className="hover:text-[#0C3827] dark:hover:text-emerald-400 transition">
              Services
            </Link>
            <Link href="/about" className="hover:text-[#0C3827] dark:hover:text-emerald-400 transition">
              About
            </Link>
            <Link href="/help" className="hover:text-[#0C3827] dark:hover:text-emerald-400 transition">
              Support
            </Link>
          </nav>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-3">
            <ThemeToggle />

            {/* Bookings shortcut */}
            <Link
              href="/dashboard/tenant/bookings"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold transition"
            >
              <Calendar className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Bookings</span>
            </Link>

            {/* Notification Bell with Badge */}
            <Link
              href="/dashboard/notifications"
              className="relative p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                7
              </span>
            </Link>

            {/* My Account Button */}
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0C3827] hover:bg-[#072419] text-white text-xs font-bold transition shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>My Account</span>
              <ChevronRight className="w-3 h-3 rotate-90" />
            </Link>
          </div>
        </div>
      </header>

      {/* ──── HERO SECTION: LEGAL CENTRE · GHANA ──── */}
      <section className="relative w-full bg-[#0C3827] text-white overflow-hidden py-10 sm:py-14">
        {/* Subtle Kente Geometric Watermark on Left */}
        <div className="absolute left-0 top-0 bottom-0 w-64 opacity-10 pointer-events-none select-none">
          <Image
            src="/images/auth/security-protect-bg.png"
            alt="Kente Motif"
            fill
            className="object-cover object-left"
          />
        </div>

        {/* Building Exterior on Right with Smooth Fade */}
        <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[50%] lg:w-[42%] pointer-events-none select-none overflow-hidden hidden md:block">
          <Image
            src="/images/home/hero-building.jpg"
            alt="Ghanaian Modern Residential Community"
            fill
            className="object-cover object-center opacity-40 mix-blend-luminosity"
            priority
          />
          {/* Gradient Mask to fade building into forest green */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0C3827] via-[#0C3827]/80 to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 space-y-6">
          <div className="max-w-3xl space-y-3">
            {/* Legal Centre Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-400/40 bg-emerald-950/40 text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider shadow-xs">
              <Scale className="w-3.5 h-3.5 text-amber-300" />
              <span>LEGAL CENTRE · GHANA</span>
            </div>

            {/* Display Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold tracking-tight text-white leading-tight">
              Terms of Service &amp; <span className="text-[#E0CA7C]">Platform Rules</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-normal max-w-2xl">
              The agreement governing access, listings, reservations, payments and digital tenancy on AkwaabaHomes.
            </p>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-emerald-200/90 font-medium">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                <span>Effective October 2026</span>
              </div>
              <span className="opacity-50">|</span>
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-300" />
                <span>8 sections</span>
              </div>
              <span className="opacity-50">|</span>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-300" />
                <span>Governing jurisdiction: Republic of Ghana</span>
              </div>
            </div>
          </div>

          {/* Action Buttons Row + Golden Scales Emblem */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#0C3827]" />
                <span>Print</span>
              </button>

              {/* Download PDF Button */}
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/40 hover:bg-white/10 text-white text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-300" />
                <span>Download PDF</span>
              </button>

              {/* Contact Legal Team */}
              <Link
                href="/contact?topic=legal"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Legal Team</span>
              </Link>
            </div>

            {/* Golden Scales of Justice Emblem */}
            <div className="hidden lg:flex items-center justify-center shrink-0 pr-12">
              <div className="relative w-16 h-16 opacity-90 drop-shadow-md">
                <Image
                  src="/images/about/terms-scales.png"
                  alt="Scales of Justice"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──── "BEFORE YOU CONTINUE" KEY POINTS STRIP ──── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 sm:-mt-8 relative z-20 w-full">
        <div className="bg-[#F7F5EE] dark:bg-zinc-900 border border-[#E8E4D7] dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
            
            {/* Header Title (Left ~3 Cols) */}
            <div className="lg:col-span-3 flex items-center gap-3.5 lg:border-r border-[#E8E4D7] dark:border-zinc-800 lg:pr-5">
              <div className="w-11 h-11 rounded-2xl bg-[#EAF6EE] dark:bg-emerald-950/60 text-[#0C3827] dark:text-emerald-300 flex items-center justify-center shrink-0 border border-[#B7E8C3] dark:border-emerald-800">
                <ShieldCheck className="w-6 h-6 text-[#16A34A]" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-sm sm:text-base text-zinc-950 dark:text-white leading-tight">
                  Before you continue
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Here are some key points to note:
                </p>
              </div>
            </div>

            {/* 4 Feature Columns (Right ~9 Cols) */}
            <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E8E4D7] dark:divide-zinc-800">
              
              {/* Point 1: Verified Identities */}
              <div className="flex items-start gap-2.5 sm:px-3 pt-3 sm:pt-0">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-zinc-950 dark:text-white">Verified Identities</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    Ghana Card checks for relevant roles.
                  </p>
                </div>
              </div>

              {/* Point 2: Protected Payments */}
              <div className="flex items-start gap-2.5 sm:px-3 pt-3 sm:pt-0">
                <CreditCard className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-zinc-950 dark:text-white">Protected Payments</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    Paystack / MoMo and card checkout.
                  </p>
                </div>
              </div>

              {/* Point 3: Digital Tenancy */}
              <div className="flex items-start gap-2.5 sm:px-3 pt-3 sm:pt-0">
                <FileText className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-zinc-950 dark:text-white">Digital Tenancy</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    Electronically signed agreements.
                  </p>
                </div>
              </div>

              {/* Point 4: Student Accommodation */}
              <div className="flex items-start gap-2.5 sm:px-3 pt-3 sm:pt-0">
                <GraduationCap className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-zinc-950 dark:text-white">Student Accommodation</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
                    Campus-specific eligibility and room allocation rules.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ──── MAIN 3-COLUMN WORKSPACE ──── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 w-full py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ════ LEFT COLUMN: STICKY SIDEBAR NAVIGATION (3 Cols) ════ */}
          <aside className="lg:col-span-3 lg:sticky lg:top-24 space-y-4">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xs">
              {/* Header */}
              <div className="bg-[#0C3827] px-4 py-3.5 text-white font-mono font-bold text-xs tracking-wider uppercase">
                IN THIS DOCUMENT
              </div>

              {/* Section Links */}
              <nav className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
                {SECTIONS_LIST.map((sec) => {
                  const isActive = activeSection === sec.id;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => scrollToSection(sec.id)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#EAF3EA] dark:bg-emerald-950/40 text-[#0C3827] dark:text-emerald-300 font-bold border-l-4 border-[#0C3827] dark:border-emerald-500'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <span className="font-mono text-zinc-400 font-bold">{sec.num}</span>
                      <span className="leading-snug">{sec.title}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Reading Progress Indicator */}
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                  <span>Section {currentSectionNumber} of 08</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-[#0C3827] dark:bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${(Number(currentSectionNumber) / 8) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* ════ CENTER COLUMN: INTERACTIVE DOCUMENT READER (6 Cols) ════ */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* ── Section 01: Acceptance of platform terms ── */}
            <div
              data-section-id="section-01"
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-7 rounded-lg bg-[#0C3827] text-white font-mono font-bold text-xs flex items-center justify-center">
                    01
                  </span>
                  <span className="h-6 w-px bg-zinc-300 dark:bg-zinc-700" />
                  <h2 className="font-serif text-lg sm:text-xl font-bold text-zinc-950 dark:text-white">
                    Acceptance of platform terms
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      'By accessing or using the AkwaabaHomes platform, you agree to be bound by these Terms of Service and all applicable laws and regulations of the Republic of Ghana. If you do not agree with these terms, you must not access, browse, or use the platform.',
                      'section-01'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  {copiedSection === 'section-01' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#16A34A]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                By accessing or using the AkwaabaHomes platform, you agree to be bound by these Terms of Service and all applicable laws and regulations of the Republic of Ghana. If you do not agree with these terms, you must not access, browse, or use the platform.
              </p>

              {/* Legal Reference Callout Box */}
              <div className="p-4 rounded-2xl bg-[#EAF6EE] dark:bg-emerald-950/30 border border-[#B7E8C3] dark:border-emerald-800/60 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-[#16A34A] flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <h4 className="font-bold text-[#0C3827] dark:text-emerald-300">Legal Reference</h4>
                  <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    These terms are made in accordance with the <strong>Electronic Transactions Act, 2008 (Act 772)</strong> and the <strong>Rent Act, 1963 (Act 220)</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Section 02: User roles & identity verification ── */}
            <div
              data-section-id="section-02"
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-7 rounded-lg bg-[#0C3827] text-white font-mono font-bold text-xs flex items-center justify-center">
                    02
                  </span>
                  <div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-zinc-950 dark:text-white">
                      User roles &amp; identity verification
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Different roles, different permissions and verification requirements.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSection('section-02')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  <span>{expandedSections['section-02'] ? 'Collapse' : 'Read Next'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 3 Role Columns matching mockup */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3.5 rounded-2xl bg-[#FAF7F0] dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 text-center space-y-1">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center mx-auto">
                    <Users className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs text-zinc-950 dark:text-white">Tenants &amp; Students</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Book and rent properties</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF7F0] dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 text-center space-y-1">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center mx-auto">
                    <Home className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs text-zinc-950 dark:text-white">Landlords &amp; Hosts</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">List and manage properties</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF7F0] dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 text-center space-y-1">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-xs text-zinc-950 dark:text-white">Caretakers &amp; Staff</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Manage facilities</p>
                </div>
              </div>

              {expandedSections['section-02'] && (
                <div className="pt-2 text-xs text-zinc-600 dark:text-zinc-300 space-y-2 border-t border-zinc-100 dark:border-zinc-800">
                  <p>
                    All landlords must submit verified land deeds or indenture documents and complete biometric Ghana Card verification before units are published. Tenants booking academic hostel rooms must provide valid university admission letters or campus identity cards.
                  </p>
                </div>
              )}
            </div>

            {/* ── Section 03: Reservations & payment processing ── */}
            <div
              data-section-id="section-03"
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-7 rounded-lg bg-[#0C3827] text-white font-mono font-bold text-xs flex items-center justify-center">
                    03
                  </span>
                  <div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-zinc-950 dark:text-white">
                      Reservations &amp; payment processing
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Secure booking and multiple payment options.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSection('section-03')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  <span>{expandedSections['section-03'] ? 'Collapse' : 'Read Next'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 3 Checkmark Safeguards */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-800 dark:text-zinc-200 pt-1">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>Verified checkout</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>Instant receipts</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>Secure payouts</span>
                </div>
              </div>

              {expandedSections['section-03'] && (
                <div className="pt-2 text-xs text-zinc-600 dark:text-zinc-300 space-y-2 border-t border-zinc-100 dark:border-zinc-800">
                  <p>
                    Rent and reservation transactions are processed exclusively through accredited Bank of Ghana licensed payment switches (Paystack Ghana, MTN Mobile Money, Vodafone Cash, AirtelTigo Money, and Visa/Mastercard). AkwaabaHomes holds initial security deposits in escrow until resident move-in verification is satisfied.
                  </p>
                </div>
              )}
            </div>

            {/* ── Section 04: Shared rooms & student allocation ── */}
            <div
              data-section-id="section-04"
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-7 rounded-lg bg-[#0C3827] text-white font-mono font-bold text-xs flex items-center justify-center">
                    04
                  </span>
                  <div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-zinc-950 dark:text-white">
                      Shared rooms &amp; student allocation
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Single, 2-in-1, 3-in-1, and 4-in-1 academic room rules.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSection('section-04')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  <span>{expandedSections['section-04'] ? 'Collapse' : 'Read Details'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {expandedSections['section-04'] ? (
                <div className="pt-2 text-xs text-zinc-600 dark:text-zinc-300 space-y-2 border-t border-zinc-100 dark:border-zinc-800 leading-relaxed">
                  <p>
                    Hostel spaces designated for accredited tertiary institutions (e.g. University of Ghana, KNUST, UPSA, UCC) operate under strict academic calendar leases. Roommate pairings conform with student gender specifications and disciplinary codes of conduct established by hostel management.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Defines bedspace assignment, quiet study hours, visitor curfews, and common area maintenance responsibilities.
                </p>
              )}
            </div>

            {/* ── Section 05: Digital tenancy agreements ── */}
            <div
              data-section-id="section-05"
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-7 rounded-lg bg-[#0C3827] text-white font-mono font-bold text-xs flex items-center justify-center">
                    05
                  </span>
                  <div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-zinc-950 dark:text-white">
                      Digital tenancy agreements
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Standardized tenancy agreements with electronic execution.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSection('section-05')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  <span>{expandedSections['section-05'] ? 'Collapse' : 'Read Details'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {expandedSections['section-05'] ? (
                <div className="pt-2 text-xs text-zinc-600 dark:text-zinc-300 space-y-2 border-t border-zinc-100 dark:border-zinc-800 leading-relaxed">
                  <p>
                    Tenancy contracts generated on the platform are structured in accordance with Act 220 and electronically executed pursuant to Act 772. Both parties receive tamper-evident cryptographic PDF copies with audit timestamps upon lease completion.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Specifies rent advance limits, maintenance protocols, quiet enjoyment covenants, and automated lease renewals.
                </p>
              )}
            </div>

            {/* ── Section 06: Listing standards & anti-fraud ── */}
            <div
              data-section-id="section-06"
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-7 rounded-lg bg-[#0C3827] text-white font-mono font-bold text-xs flex items-center justify-center">
                    06
                  </span>
                  <div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-zinc-950 dark:text-white">
                      Listing standards &amp; anti-fraud
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Strict verification of titles, photographs, and pricing.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSection('section-06')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  <span>{expandedSections['section-06'] ? 'Collapse' : 'Read Details'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {expandedSections['section-06'] ? (
                <div className="pt-2 text-xs text-zinc-600 dark:text-zinc-300 space-y-2 border-t border-zinc-100 dark:border-zinc-800 leading-relaxed">
                  <p>
                    Publishing misleading photos, duplicate phantom listings, or soliciting off-platform cash advances constitutes a material breach resulting in immediate account termination, forfeiture of platform deposits, and referral to the Ghana Police Service Cybercrime Directorate.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Mandatory on-site verification inspections, accurate utility disclosures, and zero tolerance for bait-and-switch listings.
                </p>
              )}
            </div>

            {/* ── Section 07: Move-in, disputes & refunds ── */}
            <div
              data-section-id="section-07"
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-7 rounded-lg bg-[#0C3827] text-white font-mono font-bold text-xs flex items-center justify-center">
                    07
                  </span>
                  <div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-zinc-950 dark:text-white">
                      Move-in, disputes &amp; refunds
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      48-hour inspection grace period and escrow release terms.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSection('section-07')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  <span>{expandedSections['section-07'] ? 'Collapse' : 'Read Details'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {expandedSections['section-07'] ? (
                <div className="pt-2 text-xs text-zinc-600 dark:text-zinc-300 space-y-2 border-t border-zinc-100 dark:border-zinc-800 leading-relaxed">
                  <p>
                    Tenants are entitled to a 48-hour move-in inspection window. If a property diverges materially from its verified listing (unusable plumbing, structural hazards, lack of electricity), funds remain locked in escrow while our mediation team investigates.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Standardized dispute resolution protocol, refund eligibility rules, and Rent Control Department arbitration.
                </p>
              )}
            </div>

            {/* ── Section 08: Liability & governing law ── */}
            <div
              data-section-id="section-08"
              className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-7 rounded-lg bg-[#0C3827] text-white font-mono font-bold text-xs flex items-center justify-center">
                    08
                  </span>
                  <div>
                    <h2 className="font-serif text-lg sm:text-xl font-bold text-zinc-950 dark:text-white">
                      Liability &amp; governing law
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Jurisdiction in Accra, Ghana and statutory limitation of damages.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleSection('section-08')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  <span>{expandedSections['section-08'] ? 'Collapse' : 'Read Details'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {expandedSections['section-08'] ? (
                <div className="pt-2 text-xs text-zinc-600 dark:text-zinc-300 space-y-2 border-t border-zinc-100 dark:border-zinc-800 leading-relaxed">
                  <p>
                    These terms are governed exclusively by the laws of the Republic of Ghana. Any formal dispute not resolved through platform mediation shall be submitted to the exclusive jurisdiction of the Courts of Ghana seated in Accra.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Force majeure exceptions, limitation of consequential damages, and severability clauses.
                </p>
              )}
            </div>

          </div>

          {/* ════ RIGHT COLUMN: QUICK REFERENCE & LEGAL ASSISTANCE (3 Cols) ════ */}
          <aside className="lg:col-span-3 space-y-5">
            
            {/* Card 1: Quick Reference */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xs">
              <div className="bg-[#0C3827] px-4 py-3 text-white font-serif font-bold text-sm flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-emerald-300" />
                <span>Quick Reference</span>
              </div>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs font-semibold">
                <Link
                  href="/privacy"
                  className="p-3.5 flex items-center justify-between text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                    <span>Privacy Policy</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#0C3827] dark:group-hover:text-emerald-400 transition" />
                </Link>

                <Link
                  href="/help?topic=disputes"
                  className="p-3.5 flex items-center justify-between text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <Scale className="w-4 h-4 text-[#16A34A]" />
                    <span>Dispute Resolution</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#0C3827] dark:group-hover:text-emerald-400 transition" />
                </Link>

                <Link
                  href="/help"
                  className="p-3.5 flex items-center justify-between text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-[#16A34A]" />
                    <span>Help Centre</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#0C3827] dark:group-hover:text-emerald-400 transition" />
                </Link>
              </div>
            </div>

            {/* Card 2: Need Legal Assistance? */}
            <div className="bg-[#EAF3EA] dark:bg-emerald-950/20 border border-[#D5E8D8] dark:border-emerald-900/40 rounded-3xl p-5 space-y-3.5 text-center shadow-2xs">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-[#16A34A] flex items-center justify-center mx-auto">
                <Headphones className="w-5 h-5" />
              </div>

              <div className="space-y-1">
                <h3 className="font-serif font-bold text-sm text-zinc-950 dark:text-white">
                  Need Legal Assistance?
                </h3>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                  Our legal team is here to help with any concerns about these terms.
                </p>
              </div>

              <Link
                href="/contact?topic=legal"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#0C3827] hover:bg-[#072419] text-white text-xs font-bold transition shadow-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Support</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Card 3: Accra Skyline & Black Star Gate Illustration */}
            <div className="relative w-full h-24 rounded-2xl overflow-hidden bg-transparent pointer-events-none select-none">
              <Image
                src="/images/about/terms-accra-skyline.png"
                alt="Accra Black Star Gate Illustration"
                fill
                className="object-contain object-bottom"
              />
            </div>

          </aside>
        </div>
      </main>

      {/* ──── DARK FOREST GREEN FOOTER ──── */}
      <footer className="w-full bg-[#0C3827] text-white pt-8 pb-6 border-t border-emerald-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-900/80 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <Image
                  src="/logo.png"
                  alt="AkwaabaHomes"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-tight text-white leading-none">
                  AkwaabaHomes
                </span>
                <span className="text-[9.5px] font-medium text-emerald-300 mt-0.5">
                  Live Well. Feel at Home.
                </span>
              </div>
            </div>

            {/* Center Copyright & Links */}
            <div className="text-xs text-emerald-200/80 flex flex-wrap items-center gap-2">
              <span>© 2026 AkwaabaHomes Ghana. All rights reserved.</span>
              <span className="opacity-40">·</span>
              <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
              <span className="opacity-40">·</span>
              <Link href="/terms" className="hover:text-white transition underline">Legal Notice</Link>
              <span className="opacity-40">·</span>
              <Link href="/help" className="hover:text-white transition">Help</Link>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3 text-emerald-300 text-xs">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-white transition" aria-label="Facebook">
                f
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-white transition" aria-label="X">
                𝕏
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-white transition" aria-label="Instagram">
                ig
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-white transition" aria-label="YouTube">
                yt
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-white transition" aria-label="LinkedIn">
                in
              </a>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}
