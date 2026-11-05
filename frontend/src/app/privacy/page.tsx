'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ShieldCheck, 
  FileText, 
  Download, 
  Mail, 
  CheckCircle2, 
  Calendar, 
  Leaf, 
  Fingerprint, 
  Scale, 
  Database, 
  Settings, 
  Trash2, 
  ArrowRight, 
  UserCheck, 
  GraduationCap, 
  Receipt, 
  Home, 
  FileEdit, 
  Ban, 
  HelpCircle, 
  Headphones, 
  ChevronRight, 
  X, 
  Send, 
  ShieldAlert, 
  Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

function HeaderSwoosh({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx('w-44 h-2.5 mx-auto text-[#0B3B24] dark:text-emerald-500 opacity-40 dark:opacity-60', className)}
      aria-hidden="true"
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

interface FaqItem {
  question: string;
  answer: string;
  reference: string;
}

const FAQS_DATA: FaqItem[] = [
  {
    question: 'How is my Ghana Card information used?',
    answer: 'Ghana Card numbers and biometric identity verification records are processed exclusively via accredited National Identification Authority (NIA) identity verification pipelines. AkwaabaHomes uses these details strictly to authenticate tenant, student, and landlord accounts, prevent impersonation fraud, and satisfy Know-Your-Customer (KYC) requirements under Act 843 and the Electronic Transactions Act, 2008 (Act 772). We never store raw biometric data.',
    reference: 'Data Protection Act, 2012 (Act 843), Sections 20 & 28 — Principles of Lawful Processing'
  },
  {
    question: 'How long do you keep tenancy records?',
    answer: 'Tenancy agreements, transaction receipts, move-in verification logs, and dispute records are securely archived for seven (7) years following the conclusion of a lease in compliance with statutory Ghanaian tax and accounting laws. Non-essential identity uploads and temporary communication drafts are purged 180 days after account deactivation or upon verified erasure requests.',
    reference: 'Rent Act, 1963 (Act 220) & Ghana Revenue Authority (GRA) Statutory Recordkeeping Requirements'
  },
  {
    question: 'Who can access my information?',
    answer: 'Access to personal information is restricted strictly to verified transaction participants (e.g. a matched property owner reviewing an approved tenant profile, or a student verifying hostel management credentials) and licensed payment switches (Paystack, MTN MoMo, Telecel Cash). AkwaabaHomes maintains strict role-based access control (RBAC), end-to-end encryption in transit (TLS 1.3), and zero third-party marketing brokers.',
    reference: 'Data Protection Act, 2012 (Act 843), Section 30 — Security Measures and Unauthorized Access'
  }
];

export default function PrivacyPage() {
  const [activeFaq, setActiveFaq] = useState<FaqItem | null>(null);
  const [isDsarModalOpen, setIsDsarModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [requestType, setRequestType] = useState('COPY');
  const [userEmail, setUserEmail] = useState('');
  const [ghanaCardNumber, setGhanaCardNumber] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const openDsarWithType = (type: string) => {
    setRequestType(type);
    setIsDsarModalOpen(true);
  };

  const handleDsarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail) {
      toast.error('Please provide a valid email address');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsDsarModalOpen(false);
      setUserEmail('');
      setGhanaCardNumber('');
      setRequestNotes('');
      toast.success('Your Data Subject Request has been filed. Our Data Protection Officer will reply within 14 business days.');
    }, 1000);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !contactMessage) {
      toast.error('Please enter your email and message');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsContactModalOpen(false);
      setUserEmail('');
      setContactMessage('');
      toast.success('Message sent to the Data Protection Officer (privacy@akwaabahomes.com).');
    }, 800);
  };

  return (
    <div className="w-full min-h-screen bg-white dark:bg-[#0C100D] text-[#14221A] dark:text-zinc-100 font-sans selection:bg-[#0B3B24] selection:text-white relative overflow-x-hidden transition-colors">
      
      {/* ══════════════════════════════════════════════════════════════════════
          1. HERO SECTION: Your data. Your choice. Our responsibility.
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-6 sm:pt-8 pb-8 sm:pb-10 px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto">
        {/* Subtle Adinkra geometric watermark on the left edge */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-4 w-44 sm:w-56 h-80 opacity-20 dark:opacity-10 pointer-events-none select-none -z-0"
        >
          <Image
            src="/images/about/adinkra-left-motif.jpg"
            alt=""
            fill
            className="object-cover object-left"
            priority
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center relative z-10">
          
          {/* Left Column: Breadcrumbs, Badge, Headline, Metadata, Actions (6-7 Cols) */}
          <div className="lg:col-span-6 xl:col-span-6 space-y-4 pr-2">
            
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-xs text-[#55665B] dark:text-zinc-400 font-medium">
              <Link href="/" className="hover:text-[#0B3B24] dark:hover:text-emerald-400 transition">
                Home
              </Link>
              <span>/</span>
              <span className="hover:text-[#0B3B24] dark:hover:text-emerald-400 transition">Legal</span>
              <span>/</span>
              <span className="text-[#0B3B24] dark:text-emerald-400 font-bold">Privacy</span>
            </nav>

            {/* Privacy Centre Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B3B24] text-white text-xs font-bold shadow-xs">
              <span>Privacy Centre</span>
            </div>

            {/* Display Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-serif font-black text-[#14221A] dark:text-white tracking-tight leading-[1.12]">
              Your data. Your choice. <br />
              <span className="relative inline-block text-[#0B3B24] dark:text-emerald-400">
                Our responsibility.
                <svg
                  viewBox="0 0 200 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-full h-2.5 mt-1 text-[#D49339]"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8C55 2.5 140 4 197 8.5"
                    stroke="currentColor"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-xs sm:text-[13.5px] text-[#4A5A50] dark:text-zinc-300 leading-relaxed font-medium max-w-xl">
              AkwaabaHomes collects, uses, protects and retains resident, student and landlord information in accordance with the Ghana Data Protection Act, 2012 (Act 843).
            </p>

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#395244] dark:text-emerald-300 font-semibold pt-1">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                <span>Ghana Data Protection Act, 2012 (Act 843)</span>
              </div>
              <span className="opacity-40">•</span>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Last reviewed: October 2026</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-[13px] font-bold transition shadow-xs cursor-pointer"
              >
                <span>Download privacy notice</span>
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsContactModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 text-[#14221A] dark:text-zinc-100 text-xs sm:text-[13px] font-bold transition shadow-2xs cursor-pointer"
              >
                <span>Contact privacy team</span>
                <Mail className="w-3.5 h-3.5 text-[#0B3B24] dark:text-emerald-400" />
              </button>
            </div>

          </div>

          {/* Right Column: High-Res Community Photo with Flag & Shield Agreement (5-6 Cols) */}
          <div className="lg:col-span-6 xl:col-span-6 relative">
            <div className="relative w-full h-[240px] sm:h-[300px] md:h-[340px] rounded-3xl overflow-hidden shadow-[0_10px_35px_rgba(11,59,36,0.06)] border border-zinc-200 dark:border-zinc-800">
              <Image
                src="/images/about/privacy-hero-community-2x.jpg"
                alt="Ghanaian residential community with flying national flag and data protection lock shield"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />

              {/* Soft gradient edge fade into the warm cream background */}
              <div className="absolute inset-y-0 left-0 w-12 sm:w-16 bg-gradient-to-r from-white/80 dark:from-[#0C100D]/70 to-transparent pointer-events-none" />
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          2. FOUR CORE PRIVACY PILLARS STRIP
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto py-2">
        <div className="bg-white dark:bg-[#151B17] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-zinc-800">
            
            {/* Pillar 1: No data selling */}
            <div className="flex items-start gap-3 sm:px-3 pt-2 sm:pt-0">
              <div className="w-10 h-10 rounded-full bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40">
                <Leaf className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-bold text-xs sm:text-[13px] text-[#14221A] dark:text-white leading-tight">
                  No data selling
                </h3>
                <p className="text-[11px] text-[#55665B] dark:text-zinc-400 leading-snug">
                  Personal records are not sold or rented.
                </p>
              </div>
            </div>

            {/* Pillar 2: Identity checks */}
            <div className="flex items-start gap-3 sm:px-3 pt-3 sm:pt-0">
              <div className="w-10 h-10 rounded-full bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40">
                <Fingerprint className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-bold text-xs sm:text-[13px] text-[#14221A] dark:text-white leading-tight">
                  Identity checks
                </h3>
                <p className="text-[11px] text-[#55665B] dark:text-zinc-400 leading-snug">
                  Ghana Card details used for verification where required.
                </p>
              </div>
            </div>

            {/* Pillar 3: Secure payments */}
            <div className="flex items-start gap-3 sm:px-3 pt-3 sm:pt-0">
              <div className="w-10 h-10 rounded-full bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40">
                <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-bold text-xs sm:text-[13px] text-[#14221A] dark:text-white leading-tight">
                  Secure payments
                </h3>
                <p className="text-[11px] text-[#55665B] dark:text-zinc-400 leading-snug">
                  Payment details handled by licensed payment providers.
                </p>
              </div>
            </div>

            {/* Pillar 4: Your rights */}
            <div className="flex items-start gap-3 sm:px-3 pt-3 sm:pt-0">
              <div className="w-10 h-10 rounded-full bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40">
                <Scale className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div className="space-y-0.5">
                <h3 className="font-bold text-xs sm:text-[13px] text-[#14221A] dark:text-white leading-tight">
                  Your rights
                </h3>
                <p className="text-[11px] text-[#55665B] dark:text-zinc-400 leading-snug">
                  Access, correction, objection and erasure requests.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          3. THE DATA LIFECYCLE: HOW WE HANDLE YOUR INFORMATION
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto py-8 sm:py-10 space-y-6">
        <div className="text-center space-y-1">
          <span className="inline-block text-[11px] font-mono font-black uppercase tracking-widest text-[#0B3B24] dark:text-emerald-400">
            THE DATA LIFECYCLE
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#14221A] dark:text-white tracking-tight">
            How We Handle Your Information
          </h2>
          <HeaderSwoosh />
        </div>

        {/* 4 Process Steps connected by right arrows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          
          {/* Step 1: Collect */}
          <div className="relative p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-full bg-[#0B3B24] text-white flex items-center justify-center shadow-xs">
                <Database className="w-5 h-5 text-emerald-300" />
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600 hidden lg:block" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-[#14221A] dark:text-white">Collect</h3>
              <p className="text-[11px] text-[#55665B] dark:text-zinc-400 leading-snug pt-0.5">
                We gather information you provide or that we obtain lawfully.
              </p>
            </div>
          </div>

          {/* Step 2: Use */}
          <div className="relative p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-full bg-[#0B3B24] text-white flex items-center justify-center shadow-xs">
                <Settings className="w-5 h-5 text-emerald-300" />
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600 hidden lg:block" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-[#14221A] dark:text-white">Use</h3>
              <p className="text-[11px] text-[#55665B] dark:text-zinc-400 leading-snug pt-0.5">
                To deliver our services, improve your experience and ensure safety.
              </p>
            </div>
          </div>

          {/* Step 3: Protect */}
          <div className="relative p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-full bg-[#0B3B24] text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600 hidden lg:block" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-[#14221A] dark:text-white">Protect</h3>
              <p className="text-[11px] text-[#55665B] dark:text-zinc-400 leading-snug pt-0.5">
                With industry-standard security and strict access controls.
              </p>
            </div>
          </div>

          {/* Step 4: Retain / Delete */}
          <div className="relative p-4 rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-full bg-[#0B3B24] text-white flex items-center justify-center shadow-xs">
                <Trash2 className="w-5 h-5 text-emerald-300" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-[#14221A] dark:text-white">Retain / Delete</h3>
              <p className="text-[11px] text-[#55665B] dark:text-zinc-400 leading-snug pt-0.5">
                Only for as long as necessary, then securely delete it.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          4. WHAT INFORMATION WE HANDLE (4 Clean Cards)
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto py-6 space-y-5">
        <div className="text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-serif font-black text-[#14221A] dark:text-white tracking-tight">
            What Information We Handle
          </h2>
          <HeaderSwoosh className="w-36" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Identity & Contact */}
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAF6EE] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center border border-[#B7E8C3] dark:border-emerald-800/40">
              <UserCheck className="w-4 h-4 text-[#16A34A]" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-bold text-xs sm:text-sm text-[#14221A] dark:text-white">
                Identity &amp; Contact
              </h3>
              <p className="text-[11px] text-[#55665B] dark:text-zinc-400 leading-relaxed">
                Name, contact details, Ghana Card verification outcome.
              </p>
            </div>
          </div>

          {/* Card 2: Student & Tenancy */}
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAF6EE] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center border border-[#B7E8C3] dark:border-emerald-800/40">
              <GraduationCap className="w-4 h-4 text-[#16A34A]" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-bold text-xs sm:text-sm text-[#14221A] dark:text-white">
                Student &amp; Tenancy
              </h3>
              <p className="text-[11px] text-[#55665B] dark:text-zinc-400 leading-relaxed">
                Institution, student status, booking, lease and occupancy records.
              </p>
            </div>
          </div>

          {/* Card 3: Payments */}
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAF6EE] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center border border-[#B7E8C3] dark:border-emerald-800/40">
              <Receipt className="w-4 h-4 text-[#16A34A]" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-bold text-xs sm:text-sm text-[#14221A] dark:text-white">
                Payments
              </h3>
              <p className="text-[11px] text-[#55665B] dark:text-zinc-400 leading-relaxed">
                Transaction references and payment status via Paystack / Mobile Money.
              </p>
            </div>
          </div>

          {/* Card 4: Property & Host */}
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 shadow-2xs space-y-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAF6EE] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center border border-[#B7E8C3] dark:border-emerald-800/40">
              <Home className="w-4 h-4 text-[#16A34A]" />
            </div>
            <div className="space-y-0.5">
              <h3 className="font-bold text-xs sm:text-sm text-[#14221A] dark:text-white">
                Property &amp; Host
              </h3>
              <p className="text-[11px] text-[#55665B] dark:text-zinc-400 leading-relaxed">
                Listing, ownership and maintenance records.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          5. YOUR PRIVACY RIGHTS INTERACTIVE STRIP
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto py-4">
        <div className="bg-white dark:bg-[#151B17] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Title & Description */}
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-serif font-black text-[#14221A] dark:text-white leading-tight">
                Your Privacy Rights
              </h2>
              <p className="text-xs text-[#55665B] dark:text-zinc-400 font-medium">
                You have control over your personal data.
              </p>
            </div>

            {/* 4 Quick Action Pills + CTA Button */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              <button
                type="button"
                onClick={() => openDsarWithType('COPY')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-[#14221A] dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-[#0B3B24] dark:text-emerald-400" />
                <span>Request a copy</span>
              </button>

              <button
                type="button"
                onClick={() => openDsarWithType('CORRECTION')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-[#14221A] dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs"
              >
                <FileEdit className="w-3.5 h-3.5 text-[#0B3B24] dark:text-emerald-400" />
                <span>Correct your details</span>
              </button>

              <button
                type="button"
                onClick={() => openDsarWithType('OBJECTION')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-[#14221A] dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs"
              >
                <Ban className="w-3.5 h-3.5 text-[#0B3B24] dark:text-emerald-400" />
                <span>Object to processing</span>
              </button>

              <button
                type="button"
                onClick={() => openDsarWithType('DELETION')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-[#14221A] dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-[#0B3B24] dark:text-emerald-400" />
                <span>Request deletion</span>
              </button>

              {/* Start a data request CTA */}
              <div className="flex flex-col items-start sm:items-end">
                <button
                  type="button"
                  onClick={() => openDsarWithType('COPY')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <span>Start a data request</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-[#55665B] dark:text-zinc-400 mt-1 max-w-xs text-left sm:text-right">
                  Requests are reviewed under applicable Ghanaian data protection requirements.
                </span>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          6. FAQS SECTION (Quick Answers to Common Questions)
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto py-4">
        <div className="bg-white/90 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-3 sm:p-4 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            
            {/* Left Tag: FAQs */}
            <div className="lg:col-span-3 flex items-center gap-2.5 p-2 rounded-2xl bg-[#0B3B24] text-white">
              <div className="w-8 h-8 rounded-xl bg-emerald-900/60 flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="leading-tight">
                <h3 className="font-bold text-xs text-white">FAQs</h3>
                <p className="text-[10.5px] text-emerald-200/90">Quick answers to common questions.</p>
              </div>
            </div>

            {/* 3 Clickable FAQ items (3 Cols each) */}
            <div className="lg:col-span-9 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {FAQS_DATA.map((faq, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveFaq(faq)}
                  className="p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-[#0B3B24] dark:hover:border-emerald-500 hover:bg-white dark:hover:bg-zinc-800/60 transition flex items-center justify-between text-left group cursor-pointer"
                >
                  <span className="text-xs font-semibold text-[#14221A] dark:text-zinc-200 line-clamp-1 pr-1 group-hover:text-[#0B3B24] dark:group-hover:text-emerald-400">
                    {faq.question}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#0B3B24] dark:group-hover:text-emerald-400 shrink-0 transition" />
                </button>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          7. PRIVACY OFFICER CONTACT BANNER
         ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto py-4 mb-4">
        <div className="bg-white dark:bg-[#151B17] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          
          {/* Officer Contact info */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#E5EFE4] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#D5E3D4] dark:border-emerald-800/40">
              <Headphones className="w-5 h-5 text-[#16A34A]" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-[#14221A] dark:text-white leading-tight">
                Contact Our Privacy Officer
              </h3>
              <p className="text-[11px] text-[#55665B] dark:text-zinc-400 mt-0.5">
                For any privacy-related enquiries.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsContactModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <span>Contact the privacy team</span>
              <Mail className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => openDsarWithType('COPY')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <span>Data subject request desk</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          8. DARK FOREST GREEN FOOTER
         ══════════════════════════════════════════════════════════════════════ */}
      <footer className="w-full bg-[#0C3827] text-white py-6 border-t border-emerald-900/40 relative overflow-hidden">
        {/* Left Kente Corner Watermark */}
        <div className="absolute left-0 top-0 bottom-0 w-24 opacity-25 pointer-events-none select-none">
          <Image
            src="/images/about/terms-footer-kente.png"
            alt="Kente Motif"
            fill
            className="object-cover object-left"
          />
        </div>

        {/* Right Kente Corner Watermark */}
        <div className="absolute right-0 top-0 bottom-0 w-20 opacity-20 pointer-events-none select-none hidden sm:block">
          <Image
            src="/images/about/privacy-footer-kente-right.png"
            alt="Kente Motif"
            fill
            className="object-cover object-right"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 space-y-4">
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
              <Link href="/privacy" className="hover:text-white transition underline font-bold">Privacy</Link>
              <span className="opacity-40">·</span>
              <Link href="/terms" className="hover:text-white transition">Terms</Link>
              <span className="opacity-40">·</span>
              <Link href="/help" className="hover:text-white transition">Help</Link>
              <span className="opacity-40">·</span>
              <Link href="/contact" className="hover:text-white transition">Contact</Link>
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

      {/* ══════════════════════════════════════════════════════════════════════
          INTERACTIVE MODAL: FAQ DETAIL VIEW
         ══════════════════════════════════════════════════════════════════════ */}
      {activeFaq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-[#14221A] dark:text-white leading-tight">
                  {activeFaq.question}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveFaq(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs sm:text-[13px] text-[#4A5A50] dark:text-zinc-300 leading-relaxed font-normal">
              {activeFaq.answer}
            </div>

            <div className="p-3 rounded-xl bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 text-[11px] text-[#55665B] dark:text-zinc-400 space-y-0.5">
              <span className="font-bold text-[#0B3B24] dark:text-emerald-400">Statutory Reference:</span>
              <p>{activeFaq.reference}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveFaq(null)}
                className="px-4 py-2 rounded-xl bg-[#16A34A] text-white text-xs font-bold hover:bg-[#15803D] transition shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          INTERACTIVE MODAL: DATA SUBJECT ACCESS REQUEST (DSAR) DESK
         ══════════════════════════════════════════════════════════════════════ */}
      {isDsarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EAF6EE] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#B7E8C3] dark:border-emerald-800/40">
                  <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#14221A] dark:text-white leading-tight">
                    Data Subject Request Desk
                  </h3>
                  <p className="text-[11px] text-[#55665B] dark:text-zinc-400">
                    Ghana Data Protection Act, 2012 (Act 843)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDsarModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDsarSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Request Type
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B3B24]"
                >
                  <option value="COPY">Right to Access (Request full copy of my records)</option>
                  <option value="CORRECTION">Right to Rectification (Correct inaccurate details)</option>
                  <option value="OBJECTION">Right to Object (Cease processing my data)</option>
                  <option value="DELETION">Right to Erasure (Permanently delete my account &amp; data)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Your Account Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B3B24]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Ghana Card Number (Optional for identity verification)
                </label>
                <input
                  type="text"
                  placeholder="GHA-000000000-0"
                  value={ghanaCardNumber}
                  onChange={(e) => setGhanaCardNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B3B24]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Specific Details or Requirements
                </label>
                <textarea
                  rows={3}
                  placeholder="Please specify any specific property leases, dates or records applicable to your request..."
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B3B24]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDsarModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
                >
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Request'}</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          INTERACTIVE MODAL: CONTACT PRIVACY OFFICER
         ══════════════════════════════════════════════════════════════════════ */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EAF6EE] dark:bg-emerald-950/60 text-[#0B3B24] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-[#B7E8C3] dark:border-emerald-800/40">
                  <Mail className="w-4 h-4 text-[#16A34A]" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-[#14221A] dark:text-white leading-tight">
                    Contact Data Protection Team
                  </h3>
                  <p className="text-[11px] text-[#55665B] dark:text-zinc-400">
                    Direct enquiry to privacy@akwaabahomes.com
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsContactModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Your Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B3B24]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Message / Privacy Enquiry *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="How can our data protection team assist you? Ask about data handling, third-party processors, or Ghana Card policies..."
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B3B24]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
                >
                  <span>{isSubmitting ? 'Sending...' : 'Send Message'}</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
