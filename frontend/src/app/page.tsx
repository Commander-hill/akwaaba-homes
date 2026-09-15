'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import { 
  Search, MapPin, Building, Users, 
  ArrowRight, CheckCircle2, Lock, DollarSign, Wrench, ChevronRight,
  GraduationCap, Clock, HelpCircle, FileText, Check,
  Zap, Compass, PhoneCall, AlertCircle, Eye, BedDouble, Droplet,
  ShieldCheck, Key, ArrowUpRight, Sparkles, FileCheck, Landmark
} from 'lucide-react';
import WishlistButton from '@/components/WishlistButton';

interface Property {
  id: string;
  title: string;
  type: string;
  targetAudience?: string;
  furnishing?: string;
  pricePeriod?: string;
  rooms: { roomType: string }[];
  totalCapacity: number;
  remainingCapacity: number;
  description: string;
  price: number;
  location: string;
  amenities: string[];
  images: string[];
  isAvailable: boolean;
  landlord?: {
    id: string;
    firstName: string;
    lastName: string;
    isVerifiedLandlord?: boolean;
    landlordVerificationStatus?: string;
  };
}

const POPULAR_CAMPUSES = [
  { name: 'KNUST — Kumasi', query: 'Ayeduase', tag: 'Ayeduase • Kotei • Gaza • Boadi' },
  { name: 'UG Legon — Accra', query: 'East Legon', tag: 'East Legon • Okponglo • Haatso' },
  { name: 'UCC — Cape Coast', query: 'Amamoma', tag: 'Amamoma • Apewosika • Kakumdo' },
  { name: 'UPSA / ATU', query: 'Madina', tag: 'Madina • Kinbu • Adabraka' },
  { name: 'UENR / UDS', query: 'Sunyani', tag: 'Sunyani • Tamale Campus' },
];

export default function Home() {
  const router = useRouter();

  // Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeType, setActiveType] = useState<string>('ALL');

  // Fetch Featured Listings
  const { data: propertiesData, isLoading: isPropsLoading } = useQuery<{ properties: Property[] }>({
    queryKey: ['properties', 'featured'],
    queryFn: async () => {
      const res = await api.get('/properties');
      return res.data;
    }
  });

  const featuredListings = (propertiesData?.properties || []).slice(0, 6);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.append('location', searchTerm.trim());
    if (activeType !== 'ALL') params.append('type', activeType);
    router.push('/properties?' + params.toString());
  };

  const handleCampusDirect = (query: string) => {
    router.push('/properties?location=' + encodeURIComponent(query));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FBFBFC] dark:bg-[#090B0E] text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      
      {/* ════════════════════════════════════════════════════════════════
          1. NSA-STYLE HERO SECTION (CENTERED, BOLD WITH ACCENT BADGE)
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-10 pb-12 sm:pt-16 sm:pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          
          {/* Headline with High-Contrast Highlight Pill */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-zinc-950 dark:text-white tracking-tight leading-[1.12]">
              Everything You Need <br className="hidden sm:inline" />
              For Your{' '}
              <span className="inline-block px-3.5 py-0.5 sm:px-5 sm:py-1 rounded-xl sm:rounded-2xl bg-[#E8590C] text-white shadow-sm align-middle tracking-normal">
                Accommodation
              </span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Find campus hostels, verified private studios, roommate shares, and legal Act 220 lease agreements — Search or browse below.
            </p>
          </div>

          {/* Minimalist Command Search Box */}
          <div className="max-w-2xl mx-auto pt-2">
            <form 
              onSubmit={handleSearch}
              className="relative flex items-center bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-1.5 sm:p-2 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all focus-within:ring-2 focus-within:ring-[#E8590C]/20 focus-within:border-[#E8590C]"
            >
              <div className="pl-3 sm:pl-4 text-zinc-400">
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Start typing campus, area, or hall (e.g. Ayeduase, East Legon)..."
                className="w-full py-2.5 px-3 bg-transparent text-xs sm:text-sm font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none"
              />
              <button
                type="submit"
                className="shrink-0 px-4 sm:px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>Search</span>
                <ChevronRight className="w-4 h-4 hidden sm:inline" />
              </button>
            </form>

            {/* Quick Campus Chips */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-[#0F5132] dark:text-[#198754]" /> Hubs:
              </span>
              {POPULAR_CAMPUSES.map((campus) => (
                <button
                  key={campus.name}
                  type="button"
                  onClick={() => handleCampusDirect(campus.query)}
                  className="px-2.5 py-0.5 rounded-full bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer shadow-2xs"
                >
                  {campus.name.split('—')[0].trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Hero Feature Banner: Clean Civic Trust Strip */}
          <div className="pt-4 max-w-3xl mx-auto">
            <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/60 dark:bg-[#12151D]/60 backdrop-blur-xs p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/40">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Escrow Protected</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Rent released only upon verified key handover.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800/40">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Act 220 Leases</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Automatic statutory contracts with audit seals.</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-800/40">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Zero Middleman Fees</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Direct landlord contact with no roadside agent cuts.</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          2. BROWSE BY CATEGORY (NSA STYLE WITH STATUS PILLS)
         ════════════════════════════════════════════════════════════════ */}
      <section className="py-6 max-w-4xl mx-auto px-4 sm:px-6 w-full">
        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Browse By Category
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Category 1 */}
            <Link
              href="/properties?type=Hostel"
              className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/40">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                  140+ Halls
                </span>
              </div>
              <div className="pt-3">
                <h3 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 transition-colors">
                  Hostels &amp; Enrolment
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Academic year billing, student halls &amp; clusters
                </p>
              </div>
            </Link>

            {/* Category 2 */}
            <Link
              href="/properties?type=Single+Room"
              className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-800/40">
                  <BedDouble className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/50">
                  85+ Studios
                </span>
              </div>
              <div className="pt-3">
                <h3 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Studios &amp; Apartments
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Self-contained rooms, private baths &amp; 1-3 bed flats
                </p>
              </div>
            </Link>

            {/* Category 3 */}
            <Link
              href="/dashboard/roommates"
              className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-800/40">
                  <Users className="w-4 h-4" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/50">
                  94+ Peers
                </span>
              </div>
              <div className="pt-3">
                <h3 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  Roommate Matching
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Compatibility algorithm &amp; safe bill splitting
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          3. POPULAR SERVICES (CHEVRON LIST CARDS)
         ════════════════════════════════════════════════════════════════ */}
      <section className="py-6 max-w-4xl mx-auto px-4 sm:px-6 w-full">
        <div className="space-y-3">
          <h2 className="text-sm font-black text-zinc-950 dark:text-white">
            Popular Services
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Service 1 */}
            <Link
              href="/properties?type=Hostel"
              className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-3 group shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/40">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 transition-colors">
                    Campus Hostels &amp; Halls
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Search KNUST, UG Legon, UCC, and UPSA hostels
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
            </Link>

            {/* Service 2 */}
            <Link
              href="/lease-agreement/new"
              className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-3 group shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800/40">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Act 220 Tenancy Agreement
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Generate statutory e-signed residential lease agreements
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
            </Link>

            {/* Service 3 */}
            <Link
              href="/dashboard/roommates"
              className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-3 group shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-800/40">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    Roommate Compatibility Matcher
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Split room rent with verified student peers
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
            </Link>

            {/* Service 4 */}
            <Link
              href="/properties"
              className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex items-center justify-between gap-3 group shadow-2xs hover:shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-800/40">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    MoMo Escrow Rent Protection
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Safe payouts released upon key handover
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          4. ALL SERVICES & DIRECTORY (GROUPED CATEGORY LISTS)
         ════════════════════════════════════════════════════════════════ */}
      <section className="py-8 max-w-4xl mx-auto px-4 sm:px-6 w-full space-y-6">
        <div>
          <h2 className="text-sm sm:text-base font-black text-zinc-950 dark:text-white">
            All Accommodations &amp; Services
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            The full housing directory, grouped by operational category.
          </p>
        </div>

        {/* Group 1: Enrolment & Hostels */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Campus &amp; Student Living</span>
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden shadow-2xs">
            <Link
              href="/properties?type=Hostel"
              className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 transition-colors">
                    University Hostels &amp; Enrolment Booking
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Check available beds across accredited KNUST, Legon, UCC, and UPSA hostels.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
            </Link>

            <Link
              href="/dashboard/roommates"
              className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 transition-colors">
                    Student Roommate Pairing &amp; Split-Bill Agreements
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Find compatible peers to share rooms and divide semester rent expenses.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
            </Link>

            <Link
              href="/dashboard/verification"
              className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 transition-colors">
                    Tertiary Student Status Verification
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Link your student ID to access subsidized student accommodations and priority booking.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
            </Link>
          </div>
        </div>

        {/* Group 2: Residential & Family Tenancies */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5" />
            <span>Residential &amp; Private Rentals</span>
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden shadow-2xs">
            <Link
              href="/properties?type=Single+Room"
              className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <BedDouble className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Single Room Self-Contained Studios
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Private kitchen, bath, and individual ECG prepaid meter.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
            </Link>

            <Link
              href="/properties?type=Apartment"
              className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    1–3 Bedroom Residential Apartments &amp; Flats
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Furnished and unfurnished residences for working professionals and families.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
            </Link>
          </div>
        </div>

        {/* Group 3: Legal, Escrow & Statutory Tools */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5" />
            <span>Statutory Leases &amp; Compliance</span>
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden shadow-2xs">
            <Link
              href="/dashboard/tenant"
              className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    Act 220 Tenancy Agreement Form
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Download copies of your certified e-signed lease agreement and rent schedule.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
            </Link>

            <Link
              href="/dashboard/verification"
              className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    Ghana Card KYC Verification
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Verify landlord ownership and tenant identity to unlock escrow protection.
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors shrink-0" />
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          5. FEATURED VERIFIED PROPERTIES (SHOWCASE GRID)
         ════════════════════════════════════════════════════════════════ */}
      <section className="py-10 max-w-4xl mx-auto px-4 sm:px-6 w-full space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-black text-zinc-950 dark:text-white">
              Featured Accommodations
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Genuine listings with real photos, transparent rates, and zero roadside agent fees.
            </p>
          </div>

          <Link
            href="/properties"
            className="text-xs font-bold text-[#0F5132] dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Explore All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isPropsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 rounded-2xl bg-zinc-200 dark:bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
        ) : featuredListings.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-center space-y-2">
            <Building className="w-8 h-8 text-zinc-400 mx-auto" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white">All Properties Currently Reserved</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              New verified hostels and rental apartments are added weekly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredListings.map((prop) => (
              <div 
                key={prop.id}
                className="group rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 overflow-hidden shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                    <img 
                      src={getImageUrl(prop.images?.[0]) || '/placeholder-property.jpg'} 
                      alt={prop.title} 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                    
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1 pointer-events-none">
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider bg-zinc-950/80 text-white backdrop-blur-xs">
                        {prop.type}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5 pointer-events-auto">
                      <WishlistButton propertyId={prop.id} />
                    </div>

                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                      <span className="px-2 py-0.5 rounded-md bg-white/95 dark:bg-zinc-900/95 text-zinc-950 dark:text-white text-xs font-black shadow-2xs">
                        GH₵ {prop.price.toLocaleString()}
                        <span className="text-[10px] font-normal text-zinc-500"> / {prop.pricePeriod || 'Yr'}</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-xs text-zinc-950 dark:text-white line-clamp-1 group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 transition-colors">
                        {prop.title}
                      </h3>
                      {prop.landlord?.isVerifiedLandlord && (
                        <span title="Verified Host">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 line-clamp-1">
                      <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                      <span>{prop.location}</span>
                    </p>
                  </div>
                </div>

                <div className="p-3.5 pt-0">
                  <Link
                    href={`/properties/${prop.id}`}
                    className="w-full py-2 rounded-xl bg-zinc-100 hover:bg-[#0F5132] text-zinc-900 hover:text-white dark:bg-zinc-800 dark:hover:bg-[#0F5132] dark:text-zinc-100 dark:hover:text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>View Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════
          6. SIGNATURE GREEN "GET STARTED" COMMAND CARD (NSA STYLE)
         ════════════════════════════════════════════════════════════════ */}
      <section className="py-8 max-w-4xl mx-auto px-4 sm:px-6 w-full">
        <div className="rounded-3xl bg-[#0F5132] text-white p-6 sm:p-8 relative overflow-hidden shadow-md">
          {/* Subtle Watermark */}
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <ShieldCheck className="w-64 h-64 text-white" />
          </div>

          <div className="relative z-10 space-y-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                Get Started
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-1">
                Sign in to your account, or explore verified accommodations below.
              </p>
            </div>

            {/* Elevated Primary White Card */}
            <Link
              href="/login"
              className="block p-4 sm:p-5 rounded-2xl bg-white text-zinc-950 hover:bg-zinc-50 transition-all shadow-md group cursor-pointer"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F5132] flex items-center justify-center shrink-0 border border-emerald-100">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-zinc-950 group-hover:text-[#0F5132] transition-colors">
                      Current Residents &amp; Landlords
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Log in to view active tenancies, check escrow postings, download certificates, and manage your account.
                    </p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-zinc-100 group-hover:bg-[#0F5132] group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                  <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-white" />
                </div>
              </div>
            </Link>

            {/* Twin Secondary Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Link
                href="/properties?type=Hostel"
                className="p-4 rounded-2xl bg-[#0A3D24]/70 hover:bg-[#0A3D24] border border-emerald-700/50 transition-all flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-700/40 text-emerald-200 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-200 transition-colors">
                    Campus Accommodation
                  </h4>
                  <p className="text-[11px] text-emerald-200/80 mt-0.5">
                    Check available student halls near university gates to begin enrolment.
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/landlord/new"
                className="p-4 rounded-2xl bg-[#0A3D24]/70 hover:bg-[#0A3D24] border border-emerald-700/50 transition-all flex items-start gap-3 group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-700/40 text-emerald-200 flex items-center justify-center shrink-0">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-200 transition-colors">
                    Property Owners &amp; Landlords
                  </h4>
                  <p className="text-[11px] text-emerald-200/80 mt-0.5">
                    Register and list your properties with zero broker fees and direct MoMo payouts.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          7. MINIMAL SLEEK FOOTER (MATCHING NSA DARK FOOTER)
         ════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#07090C] text-zinc-500 dark:text-zinc-400 py-8 mt-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-black text-zinc-950 dark:text-white text-base tracking-tight">
                Akwaaba<span className="text-[#0F5132] dark:text-[#198754]">Homes</span>
              </span>
              <span className="text-xs text-zinc-400">• Certified National Housing Portal</span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
              <Link href="/" className="hover:text-zinc-950 dark:hover:text-white">Home</Link>
              <Link href="/properties" className="hover:text-zinc-950 dark:hover:text-white">Directory</Link>
              <Link href="/dashboard/roommates" className="hover:text-zinc-950 dark:hover:text-white">Roommates</Link>
              <Link href="/terms" className="hover:text-zinc-950 dark:hover:text-white">Terms</Link>
              <Link href="/privacy" className="hover:text-zinc-950 dark:hover:text-white">Privacy</Link>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-zinc-400">
            <div>
              &copy; {new Date().getFullYear()} Akwaaba Homes Ghana Ltd. All rights reserved.
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              <span>Republic of Ghana 🇬🇭 • Escrow Secured</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
