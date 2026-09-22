'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Building, ShieldCheck, Scale, Users, 
  CheckCircle2, ArrowRight, Lock, MapPin, 
  GraduationCap, Check, HeartHandshake, Eye
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FBFBFC] dark:bg-[#090B0E] text-zinc-900 dark:text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/40">
            <Scale className="w-3.5 h-3.5" />
            <span>Ghana Rent Act, 1963 (Act 220) Certified</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-zinc-950 dark:text-white tracking-tight leading-tight">
            Fixing Ghana's Rental Crisis <br />
            With <span className="text-[#0F5132] dark:text-emerald-400">Trust &amp; Escrow Security</span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Akwaaba Homes is Ghana's certified digital accommodation platform. We eliminate non-refundable roadside viewing fees, 
            prevent double-allocation fraud, and provide lawful, e-signed tenancy contracts backed by MoMo escrow.
          </p>
        </div>

        {/* The Ghana Rental Reality: Why We Exist */}
        <div className="bg-white dark:bg-[#12151D] rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#0F5132] dark:text-emerald-400">
              The Reality
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Why We Built Akwaaba Homes
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Finding accommodation in Accra, Kumasi, or Cape Coast traditionally meant paying non-refundable "viewing fees" (GH₵ 100–200) to informal roadside agents, 
              only to face substandard rooms, unauthorized 2-year advance rent demands, or double-allocation scams.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 space-y-2">
              <div className="text-xs font-bold text-rose-700 dark:text-rose-400">
                ✕ Traditional Roadside Agent Model
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                <li>• Non-refundable viewing fees before inspection</li>
                <li>• 10% agent commission tacked onto your rent</li>
                <li>• Unlawful demands for 2 to 3 years advance payment</li>
                <li>• No written contract or statutory protection</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-2">
              <div className="text-xs font-bold text-[#0F5132] dark:text-emerald-400">
                ✓ The Akwaaba Homes Standard
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                <li>• Zero viewing fees — free online photo tours</li>
                <li>• Direct landlord contact with zero agent surcharge</li>
                <li>• Statutory Act 220 compliant lease contracts</li>
                <li>• MoMo Escrow: Payout released only upon key handover</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 4 Core Pillars */}
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">Our 4 Core Safeguards</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Built to statutory regulatory standards in Ghana.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/40">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white">MoMo Escrow Settlement</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                When a tenant books, funds are locked in an audited escrow account. The landlord or facility manager receives payout only after the on-site caretaker executes the move-in inspection and hands over the keys.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-800/40">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white">Statutory Act 220 Agreements</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Every booking generates an e-signed tenancy agreement with statutory Rent Control seals, protecting tenants against sudden unlawful evictions and locking in transparent utility terms.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-800/40">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white">Verified Ghana Card KYC</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Property owners and caretakers submit verified National Identification Authority (NIA) credentials and ownership deeds before listings are certified.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 flex items-center justify-center border border-purple-100 dark:border-purple-800/40">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white">Student Hostel Protection</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Specialized protections for KNUST, UG Legon, UCC, and UPSA students, featuring automated room-bed capacity tracking, gender locks, and roommate compatibility matching.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Strip */}
        <div className="p-8 rounded-3xl bg-[#0F5132] text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-xl font-black">Ready to find verified accommodation?</h3>
            <p className="text-xs text-emerald-100/90">Browse pre-inspected student hostels, studios, and apartments nationwide.</p>
          </div>
          <Link
            href="/properties"
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold transition-colors shadow-xs shrink-0 flex items-center gap-1.5"
          >
            <span>Browse Accommodations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
}
