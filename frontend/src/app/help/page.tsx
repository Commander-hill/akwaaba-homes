'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  HelpCircle, ChevronDown, ChevronUp, Search, 
  ShieldCheck, FileText, Users, Building, ArrowRight
} from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  category: 'TENANTS' | 'LANDLORDS' | 'ESCROW' | 'STUDENTS';
}

const FAQ_DATA: FaqItem[] = [
  {
    category: 'ESCROW',
    question: 'How does the Akwaaba Homes MoMo Rent Escrow work?',
    answer: 'When a tenant pays for a room or hostel bed, funds are safely held in an audited escrow account with licensed payment partners. Funds are released to the landlord only after you inspect the room on-site, sign off on the move-in condition checklist, and receive the keys.'
  },
  {
    category: 'TENANTS',
    question: 'Are there any roadside agent viewing fees?',
    answer: 'No. Akwaaba Homes operates a zero-broker model. You inspect photo galleries, room specs, verified Ghana Post GPS locations, and 360-degree tour dimensions completely free of charge online.'
  },
  {
    category: 'STUDENTS',
    question: 'How does dynamic gender locking work for student hostels?',
    answer: 'In shared student room units (e.g., 2-in-a-room or 4-in-a-room), the unit dynamically locks to Male or Female upon the first student\'s confirmed booking. This ensures occupants never share a room unit with someone of a different gender unless the property is explicitly designated as a private self-contain.'
  },
  {
    category: 'TENANTS',
    question: 'What is the Act 220 Tenancy Agreement?',
    answer: 'Under the Ghana Rent Act, 1963 (Act 220), tenants have statutory rights against unlawful rent advance demands and eviction without notice. Every paid booking on Akwaaba Homes automatically generates an e-signed Act 220 tenancy contract with legal audit seals.'
  },
  {
    category: 'LANDLORDS',
    question: 'How do landlords receive their rent payouts?',
    answer: 'Landlords receive automated settlements directly into their MTN Mobile Money, Telecel Cash, or local bank account as soon as the caretaker confirms the move-in checklist handover.'
  },
  {
    category: 'LANDLORDS',
    question: 'What documents do landlords need to verify their properties?',
    answer: 'Landlords must link their verified Ghana Card and upload proof of property ownership (Site Plan, Land Title Indenture, or Municipal Business Registration). Our security moderation team verifies deeds before granting the Verified Landlord badge.'
  },
  {
    category: 'STUDENTS',
    question: 'How does the Roommate Compatibility Matcher work?',
    answer: 'Students fill in their study habits (Quiet vs. Social), cleanliness standards (Neat vs. Average), and sleep schedules (Early Bird vs. Night Owl). Our 4-factor matching algorithm pairs compatible peers to split hostel accommodation costs legally via escrow.'
  },
  {
    category: 'ESCROW',
    question: 'What happens if a room is substandard upon physical move-in?',
    answer: 'If the room substantially deviates from the listing photos or fails move-in inspection, you can raise an immediate dispute through your Tenant Dashboard. The escrow holds your payment while our dispute moderation team investigates or issues a full refund.'
  }
];

export default function HelpFaqPage() {
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'TENANTS' | 'LANDLORDS' | 'ESCROW' | 'STUDENTS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const filteredFaqs = FAQ_DATA.filter(faq => {
    const matchesCategory = activeCategory === 'ALL' || faq.category === activeCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#FBFBFC] dark:bg-[#090B0E] text-zinc-900 dark:text-zinc-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/40">
            Help Center &amp; FAQ
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-zinc-950 dark:text-white tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
            Everything you need to know about booking campus hostels, digital lease agreements, escrow protections, and landlord property registration.
          </p>
        </div>

        {/* Search Input */}
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs">
            <Search className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help questions (e.g. escrow, gender lock, Act 220)..."
              className="w-full bg-transparent text-xs font-medium outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {[
            { id: 'ALL', label: 'All Questions' },
            { id: 'ESCROW', label: 'Escrow & Payments' },
            { id: 'STUDENTS', label: 'Student Hostels' },
            { id: 'TENANTS', label: 'Tenant Rights' },
            { id: 'LANDLORDS', label: 'Landlords & Verification' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeCategory === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                  : 'bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
              No matching help questions found. Need direct support? <Link href="/contact" className="text-[#0F5132] font-bold underline">Contact us here</Link>.
            </div>
          ) : (
            filteredFaqs.map((faq, idx) => {
              const isOpen = expandedIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isOpen ? null : idx)}
                    className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="font-extrabold text-xs sm:text-sm text-zinc-950 dark:text-white">
                      {faq.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-zinc-800/60 pt-3">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Still Have Questions Box */}
        <div className="p-6 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white">Still have questions?</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Our customer support and tenancy advisors are available to assist you.</p>
          </div>
          <Link
            href="/contact"
            className="px-4 py-2 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold transition-colors shrink-0 shadow-xs"
          >
            Contact Support Team
          </Link>
        </div>

      </div>
    </div>
  );
}
