'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, ArrowRight, MessageSquare, Mail } from 'lucide-react';

interface FaqItem {
  id: string;
  category: 'RENT_PAYMENTS' | 'STUDENT_HOUSING' | 'TENANTS' | 'LANDLORDS' | 'VERIFICATION' | 'ROOMMATES';
  categoryLabel: string;
  question: string;
  answer: string;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All' },
  { id: 'RENT_PAYMENTS', label: 'Rent & Payments' },
  { id: 'STUDENT_HOUSING', label: 'Student Housing' },
  { id: 'TENANTS', label: 'Tenants' },
  { id: 'LANDLORDS', label: 'Landlords' },
  { id: 'VERIFICATION', label: 'Verification' },
  { id: 'ROOMMATES', label: 'Roommates' },
] as const;

const FAQ_DATA: FaqItem[] = [
  {
    id: 'escrow-how',
    category: 'RENT_PAYMENTS',
    categoryLabel: 'Rent & Payments',
    question: 'How does the AkwaabaHomes rent escrow system work?',
    answer: 'When you book a room or hostel bed, your payment is placed into an audited trust escrow account via licensed payment partners. The landlord is not paid until you arrive on-site, inspect the accommodation, verify that it matches the listing, and confirm the digital key handover pass.'
  },
  {
    id: 'viewing-fees',
    category: 'TENANTS',
    categoryLabel: 'Tenants',
    question: 'Are there any roadside agent viewing fees on AkwaabaHomes?',
    answer: 'No. AkwaabaHomes strictly prohibits informal viewing fees. All photo galleries, room specs, verified Ghana Post GPS locations, and virtual tours are accessible completely free online. You only pay for your accommodation once you decide to book through escrow.'
  },
  {
    id: 'gender-lock',
    category: 'STUDENT_HOUSING',
    categoryLabel: 'Student Housing',
    question: 'How does dynamic gender locking work for student hostels?',
    answer: 'In shared student units (such as 2-in-a-room or 4-in-a-room hostels near campuses like UG, KNUST, UCC, and ATU), the room unit automatically locks to Male or Female upon the first student\'s confirmed booking. This guarantees that residents never share a room with someone of a different gender unless the unit is explicitly rented as a private whole apartment.'
  },
  {
    id: 'lease-agreements',
    category: 'TENANTS',
    categoryLabel: 'Tenants',
    question: 'How do digital tenancy agreements work?',
    answer: 'Every confirmed booking automatically generates a legally binding, e-signed tenancy agreement with digital audit stamps. Both tenant and property owner countersign electronically, providing full legal standing under the Rent Act of Ghana (Act 220).'
  },
  {
    id: 'landlord-payouts',
    category: 'LANDLORDS',
    categoryLabel: 'Landlords',
    question: 'How and when do landlords receive rent payouts?',
    answer: 'Rent settlements are automatically disbursed directly into your registered MTN Mobile Money, Telecel Cash, or local bank account as soon as the resident and caretaker sign off on the move-in inspection and key handover pass.'
  },
  {
    id: 'verification-docs',
    category: 'VERIFICATION',
    categoryLabel: 'Verification',
    question: 'What documentation is required to verify a property or host profile?',
    answer: 'To earn the Verified Landlord badge, owners must complete Ghana Card identification and submit proof of property ownership (Site Plan, Land Title Indenture, or Municipal Business Permit). Our compliance team validates every document before listing activation.'
  },
  {
    id: 'roommate-matcher',
    category: 'ROOMMATES',
    categoryLabel: 'Roommates',
    question: 'How does the Roommate Compatibility Matcher work?',
    answer: 'Students can optionally fill in preferences regarding study environment (Quiet vs. Social), tidiness, and sleep schedules. Our compatibility engine matches verified peers attending the same campus so they can legally co-rent and split hostel costs.'
  },
  {
    id: 'substandard-room',
    category: 'RENT_PAYMENTS',
    categoryLabel: 'Rent & Payments',
    question: 'What happens if a room is substandard or misrepresented upon move-in?',
    answer: 'If the physical accommodation deviates significantly from the listing photos or fails basic habitability standards, you have 24 hours to file a move-in dispute through your dashboard. The escrow funds remain frozen while our mediation team investigates or processes your 100% advance rent refund.'
  },
  {
    id: 'student-id-req',
    category: 'STUDENT_HOUSING',
    categoryLabel: 'Student Housing',
    question: 'Do I need a university student ID to book campus hostels?',
    answer: 'Yes. For campus-specific student accommodation, you will be prompted to provide your university name, student index/ID number, and program of study during checkout to confirm eligibility for student rates.'
  },
  {
    id: 'caretaker-delegation',
    category: 'LANDLORDS',
    categoryLabel: 'Landlords',
    question: 'Can landlords assign on-site caretakers to manage check-ins?',
    answer: 'Yes. Landlords can add staff and caretakers from their dashboard with restricted operations access, enabling them to inspect rooms, log visitor records, and authorize physical key handovers directly on their mobile device.'
  }
];

export default function HelpFaqPage() {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    'escrow-how': true
  });

  const toggleItem = (id: string) => {
    setOpenIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredFaqs = FAQ_DATA.filter(faq => {
    const matchesCategory = activeCategory === 'ALL' || faq.category === activeCategory;
    const matchesSearch = !searchQuery.trim() || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0D0F12] text-zinc-900 dark:text-zinc-100 antialiased selection:bg-emerald-100 selection:text-emerald-950">
      
      {/* ── Document Header ── */}
      <div className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-[#111419]/50 backdrop-blur-xs">
        <div className="max-w-4xl mx-auto px-6 sm:px-8 py-12 sm:py-16 text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#0F5132] dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400" />
            <span>Support &amp; Knowledge Base</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-950 dark:text-white">
            Help Center
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Find answers about renting, payments, verification, roommates, and property listings across Ghana.
          </p>

          {/* Prominent Search Field */}
          <div className="max-w-xl mx-auto pt-2">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-zinc-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help articles (e.g. escrow, gender lock, lease)..."
                className="w-full h-12 pl-11 pr-4 bg-white dark:bg-[#15191E] border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-[#0F5132] focus:ring-1 focus:ring-[#0F5132] outline-none transition-colors shadow-2xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Help Content ── */}
      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-10 sm:py-14 space-y-10">
        
        {/* Category Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-zinc-200/60 dark:border-zinc-800/60">
          {CATEGORIES.map(category => {
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        {/* Clean Accordion List with Subtle Dividers */}
        <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800/80">
          {filteredFaqs.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500 space-y-2">
              <p>No answers found matching &ldquo;{searchQuery}&rdquo;.</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('ALL'); }}
                className="text-[#0F5132] dark:text-emerald-400 font-semibold underline cursor-pointer"
              >
                Clear search filters
              </button>
            </div>
          ) : (
            filteredFaqs.map(faq => {
              const isOpen = !!openIds[faq.id];
              return (
                <div key={faq.id} className="py-5 sm:py-6 group">
                  <button
                    type="button"
                    onClick={() => toggleItem(faq.id)}
                    className="w-full text-left flex items-start justify-between gap-4 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-semibold block">
                        {faq.categoryLabel}
                      </span>
                      <h3 className="text-base sm:text-[17px] font-semibold text-zinc-900 dark:text-white group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 transition-colors leading-snug">
                        {faq.question}
                      </h3>
                    </div>
                    <div className="pt-1 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#0F5132] dark:text-emerald-400' : ''}`} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="pt-3 pr-6 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed animate-in fade-in duration-150">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Reassurance Support Box */}
        <div className="pt-8 border-t border-zinc-200/80 dark:border-zinc-800/80">
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-2xs">
            <div className="space-y-1 max-w-md">
              <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                Have a question that isn&apos;t covered here?
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Our Accra and Kumasi tenancy advisory teams can assist you with active bookings, verification, or disputes.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-semibold transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <span>Contact Support</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
