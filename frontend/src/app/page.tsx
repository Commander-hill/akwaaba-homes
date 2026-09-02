'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import { 
  Search, MapPin, Building, Star, ShieldCheck, Shield, Users, 
  ArrowRight, CheckCircle2, Lock, Sparkles, Home as HomeIcon, 
  DollarSign, Wrench, Package, Key, ChevronRight, BedDouble, 
  GraduationCap, Clock, HelpCircle, PhoneCall, FileText, Check,
  SlidersHorizontal, Heart, Sparkle, Compass, Award, ExternalLink
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

const CATEGORIES = [
  { id: 'Hostel', name: 'Student Hostels', icon: '🎓', desc: 'KNUST, UG, UCC off-campus blocks', count: '120+ Verified' },
  { id: 'Apartment', name: '1-2 Bed Flats', icon: '🏢', desc: 'Modern residential & executive suites', count: '85+ Listings' },
  { id: 'Single Room', name: 'Self-Contain', icon: '🛋️', desc: 'Private bath, kitchen & balcony', count: '64+ Available' },
  { id: 'House', name: 'Family Houses', icon: '👨‍👩‍👧', desc: 'Gated compounds & secure estates', count: '40+ Homes' },
  { id: 'Homestay', name: 'Shared Rooms', icon: '🤝', desc: 'Split rent with verified peers', count: '90+ Rooms' },
];

const POPULAR_CAMPUSES = [
  { name: 'KNUST — Kumasi', query: 'Ayeduase', tag: 'Ayeduase • Kotei • Gaza' },
  { name: 'UG Legon — Accra', query: 'East Legon', tag: 'East Legon • Okponglo' },
  { name: 'UCC — Cape Coast', query: 'Amamoma', tag: 'Amamoma • Apewosika' },
  { name: 'UPSA / ATU', query: 'Madina', tag: 'Madina • Adabraka' },
  { name: 'UENR / UDS', query: 'Sunyani', tag: 'Sunyani • Tamale' },
];

export default function Home() {
  const router = useRouter();

  // Search State
  const [activeTab, setActiveTab] = useState<'ALL' | 'Hostel' | 'Apartment' | 'Single Room'>('ALL');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchBudget, setSearchBudget] = useState('');
  const [searchPeriod, setSearchPeriod] = useState('');

  // Fetch Featured Properties
  const { data: propertiesData, isLoading: isPropsLoading } = useQuery<{ properties: Property[] }>({
    queryKey: ['properties', 'featured'],
    queryFn: async () => {
      const res = await api.get('/properties');
      return res.data;
    }
  });

  const featuredProperties = (propertiesData?.properties || []).slice(0, 6);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchLocation.trim()) params.append('location', searchLocation.trim());
    if (activeTab !== 'ALL') params.append('type', activeTab);
    if (searchPeriod) params.append('pricePeriod', searchPeriod);
    if (searchBudget) {
      if (searchBudget === 'under2k') params.append('maxPrice', '2000');
      if (searchBudget === '2k-5k') { params.append('minPrice', '2000'); params.append('maxPrice', '5000'); }
      if (searchBudget === '5k-10k') { params.append('minPrice', '5000'); params.append('maxPrice', '10000'); }
      if (searchBudget === 'above10k') params.append('minPrice', '10000');
    }
    router.push('/properties?' + params.toString());
  };

  const handleCampusClick = (query: string) => {
    router.push('/properties?location=' + encodeURIComponent(query));
  };

  const handleCategoryClick = (categoryId: string) => {
    router.push('/properties?type=' + encodeURIComponent(categoryId));
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 selection:bg-[#5B4CFF] selection:text-white transition-colors duration-300">
      
      {/* ════════════════════════════════════════════════════════════════
          1. HERO HEADER SECTION (CONTAINED & ADAPTIVE)
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[580px] lg:min-h-[660px] flex items-center justify-center pt-24 pb-20 overflow-hidden">
        
        {/* Contained hero background image with atmospheric overlay */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
          style={{ 
            backgroundImage: 'url(/images/sunset-bg.png)',
            filter: 'brightness(0.42) contrast(1.15) saturate(1.1)' 
          }}
        />
        
        {/* Radial grid pattern */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        
        {/* Adaptive bottom gradient fade: blends into slate-50 in light mode and #0B0F19 in dark mode */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/40 via-black/60 to-slate-50 dark:to-[#0B0F19] transition-colors duration-300" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Top Trust Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 dark:bg-white/10 backdrop-blur-md border border-white/20 mb-6 text-xs font-semibold text-white shadow-xl">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Ghana's Premier Housing Platform for Students, Families &amp; Professionals
          </div>
          
          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight mb-4 text-white leading-[1.15] drop-shadow-lg">
            Find Your Verified <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-indigo-300 to-[#7D6EFF]">
              Home &amp; Hostel in Ghana
            </span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xs sm:text-sm md:text-base text-slate-200 max-w-2xl mx-auto mb-8 leading-relaxed font-medium drop-shadow-md">
            Campus student hostels, residential apartments, family rentals, and homestays.
            <strong className="text-white"> 100% Escrow Protected</strong> with zero middleman broker fraud.
          </p>

          {/* ── SEARCH COMMAND CAPSULE (LIGHT / DARK RESPONSIVE) ── */}
          <div className="max-w-4xl mx-auto bg-white/95 dark:bg-[#111827]/95 backdrop-blur-2xl rounded-3xl p-3 sm:p-4 shadow-2xl border border-slate-200/80 dark:border-white/15 text-left transition-colors">
            
            {/* Segmented Category Tabs */}
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-200 dark:border-white/10 overflow-x-auto scrollbar-none">
              {[
                { id: 'ALL', label: '🏠 All Rentals' },
                { id: 'Hostel', label: '🎓 Student Hostels' },
                { id: 'Apartment', label: '🏢 Apartments' },
                { id: 'Single Room', label: '🛋️ Self-Contain' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-[#5B4CFF] text-white shadow-md shadow-indigo-500/30'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form Inputs Grid */}
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              
              {/* Location Input */}
              <div className="flex items-center gap-2.5 px-3.5 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 focus-within:border-[#5B4CFF] transition-all">
                <MapPin className="text-amber-500 dark:text-amber-400 w-4 h-4 shrink-0" />
                <input 
                  type="text" 
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="Location (Ayeduase, Legon...)" 
                  className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder:text-slate-400 text-xs font-medium"
                />
              </div>

              {/* Budget Range */}
              <div className="flex items-center gap-2.5 px-3.5 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 focus-within:border-[#5B4CFF] transition-all">
                <DollarSign className="text-emerald-600 dark:text-emerald-400 w-4 h-4 shrink-0" />
                <select
                  value={searchBudget}
                  onChange={(e) => setSearchBudget(e.target.value)}
                  aria-label="Filter by Budget Range"
                  className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white text-xs font-medium cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-white"
                >
                  <option value="">Any Budget</option>
                  <option value="under2k">Under GHS 2,000</option>
                  <option value="2k-5k">GHS 2,000 – 5,000</option>
                  <option value="5k-10k">GHS 5,000 – 10,000</option>
                  <option value="above10k">Above GHS 10,000</option>
                </select>
              </div>

              {/* Price Period */}
              <div className="flex items-center gap-2.5 px-3.5 py-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 focus-within:border-[#5B4CFF] transition-all">
                <Clock className="text-indigo-600 dark:text-indigo-400 w-4 h-4 shrink-0" />
                <select
                  value={searchPeriod}
                  onChange={(e) => setSearchPeriod(e.target.value)}
                  aria-label="Filter by Rental Period"
                  className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white text-xs font-medium cursor-pointer [&>option]:bg-white [&>option]:text-slate-900 dark:[&>option]:bg-slate-900 dark:[&>option]:text-white"
                >
                  <option value="">Any Rental Period</option>
                  <option value="Academic Year">Per Academic Year</option>
                  <option value="Semester">Per Semester</option>
                  <option value="Monthly">Per Month</option>
                  <option value="Nightly">Per Night</option>
                </select>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                className="bg-[#5B4CFF] hover:bg-[#4C3DEE] text-white px-5 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/30 cursor-pointer active:scale-95"
              >
                <Search className="w-4 h-4" />
                <span>Search Properties</span>
              </button>
            </form>
          </div>

          {/* Campus Quick Pills */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5 text-amber-300" /> Popular Campuses:
            </span>
            {POPULAR_CAMPUSES.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => handleCampusClick(c.query)}
                className="px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 text-white text-[11px] font-semibold backdrop-blur-md transition-all cursor-pointer"
              >
                📍 {c.name}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          2. SEAMLESS TRUST & SECURITY STRIP (ADAPTIVE LIGHT / DARK)
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 border-y border-slate-200 dark:border-white/10 bg-white dark:bg-[#0E131F] transition-colors duration-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white">100% Escrow Protection</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Funds locked safe until move-in</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white">Ghana Card Verified</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Strict KYC on hosts &amp; porters</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white">Instant MoMo &amp; Bank</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">MTN, Telecel, AT, GHIPSS</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-slate-900 dark:text-white">Zero Agent Fraud</div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Direct landlord &amp; caretaker link</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          3. EXPLORE BY CATEGORY (VISUAL GRID)
         ════════════════════════════════════════════════════════════════ */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#5B4CFF]" /> Explore Accommodations by Type
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select the rental category that matches your lifestyle and budget.
            </p>
          </div>
          <Link 
            href="/properties" 
            className="text-xs font-bold text-[#5B4CFF] hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
          >
            View All Categories <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              className="p-5 rounded-2xl bg-white hover:bg-slate-50 dark:bg-[#111827] dark:hover:bg-[#1F2937] border border-slate-200/80 dark:border-white/5 hover:border-[#5B4CFF]/40 text-left transition-all group cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1"
            >
              <div className="text-3xl mb-3">{cat.icon}</div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#5B4CFF] transition-colors">
                {cat.name}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {cat.desc}
              </p>
              <div className="mt-3 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                {cat.count}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          4. HOW AKWAABA HOMES WORKS (3-STEP VISUAL JOURNEY)
         ════════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-slate-100/70 dark:bg-[#0E131F]/60 border-y border-slate-200/80 dark:border-white/5 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[11px] font-bold uppercase border border-indigo-500/20">
              <HelpCircle className="w-3.5 h-3.5" /> 3-Step Simple Journey
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              How Akwaaba Homes Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Zero fake agents, zero upfront unverified fees, and 100% legal protection.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 relative flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-base">
                  01
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Browse &amp; Virtual Tour</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Search campus-verified hostels and residential apartments. Inspect authentic photos, student reviews, room types, and transparent rates with zero agent fees.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 100% Genuine Owner Listings
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 relative flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-base">
                  02
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Reserve &amp; Digital Lease</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Lock in your room via Mobile Money (MTN, Telecel, AT) or Bank card. Rent is held safely in escrow while both parties sign a legally binding Ghana Rent Act tenancy agreement.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Escrow-Secured &amp; Signed Contract
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 relative flex flex-col justify-between shadow-sm">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-600/20 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-base">
                  03
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Move In &amp; Inspect</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Arrive at the property and meet your assigned Caretaker or Porter for the official room condition inspection checklist. Verify room condition and collect your keys!
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Digital Checklist &amp; Key Handover
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          5. FEATURED & TOP-RATED ACCOMMODATIONS (REAL CONTENT CARDS)
         ════════════════════════════════════════════════════════════════ */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-300 rounded-full text-[11px] font-bold uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Handpicked Properties
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Featured Accommodations
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Top-rated, verified hostels and apartments with transparent GHS rates.
            </p>
          </div>

          <Link
            href="/properties"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#5B4CFF] hover:bg-[#4C3DEE] text-white text-xs font-black transition-all shadow-md shrink-0 cursor-pointer"
          >
            <span>Explore All Listings</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Property Grid */}
        {isPropsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-80 rounded-3xl bg-slate-200 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : featuredProperties.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 text-center space-y-4 shadow-sm">
            <Building className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Properties Currently Listed</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              New verified hostels and rental apartments are being added daily.
            </p>
            <Link
              href="/dashboard/landlord/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#5B4CFF] text-white text-xs font-bold rounded-xl"
            >
              List a Property Now
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProperties.map((property) => (
              <div 
                key={property.id}
                className="group rounded-3xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/10 hover:border-[#5B4CFF]/50 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Property Image */}
                  <div className="relative h-52 w-full overflow-hidden bg-slate-900">
                    <img 
                      src={getImageUrl(property.images?.[0]) || '/placeholder-property.jpg'} 
                      alt={property.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                    
                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/70 backdrop-blur-md text-white border border-white/20">
                        {property.type}
                      </span>
                      <div className="pointer-events-auto">
                        <WishlistButton propertyId={property.id} />
                      </div>
                    </div>

                    {/* Price Overlay */}
                    <div className="absolute bottom-3 left-3 right-3 text-white flex justify-between items-end">
                      <div className="text-lg font-black text-amber-300">
                        GHS {property.price.toLocaleString()}
                        <span className="text-[11px] font-normal text-slate-300"> / {property.pricePeriod || 'Year'}</span>
                      </div>
                      {property.landlord?.isVerifiedLandlord && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3" /> Verified Host
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-2.5">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-[#5B4CFF] transition-colors">
                      {property.title}
                    </h3>
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{property.location}</span>
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                      {property.rooms?.[0]?.roomType && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                          🛏️ {property.rooms[0].roomType}
                        </span>
                      )}
                      {property.furnishing && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                          🛋️ {property.furnishing}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <Link
                    href={'/properties/' + property.id}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-[#5B4CFF] text-slate-900 hover:text-white dark:bg-white/10 dark:hover:bg-[#5B4CFF] dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>View Room Details &amp; Book</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════
          6. ROOMMATE MATCHER COMPATIBILITY SPOTLIGHT
         ════════════════════════════════════════════════════════════════ */}
      <section className="py-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[#1C1335] via-[#28184C] to-[#3B1E4A] border border-white/15 text-white shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
          
          <div className="space-y-3.5 max-w-xl relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-[11px] font-bold border border-amber-400/30">
              <Users className="w-3.5 h-3.5" /> Compatibility Algorithm
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Looking for a Roommate to Split Rent?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Find compatible peers across Ghanaian universities. Match based on 
              <strong> cleanliness, budget range, sleep schedules (Early Bird vs Night Owl), and study habits</strong>.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard/roommates"
                className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black transition-all shadow-lg shadow-amber-400/20 inline-flex items-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Find a Roommate Now</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full lg:w-auto relative z-10 shrink-0 text-center font-sans">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="text-xl font-black text-amber-300">98%</div>
              <div className="text-[10px] text-slate-300 font-medium">Match Accuracy</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="text-xl font-black text-emerald-400">100%</div>
              <div className="text-[10px] text-slate-300 font-medium">Student Verified</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="text-xl font-black text-indigo-300">50%</div>
              <div className="text-[10px] text-slate-300 font-medium">Rent Savings</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
              <div className="text-xl font-black text-rose-300">0</div>
              <div className="text-[10px] text-slate-300 font-medium">Awkward Disputes</div>
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          7. DUAL PORTALS: FOR LANDLORDS & CARETAKERS
         ════════════════════════════════════════════════════════════════ */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full border-t border-slate-200 dark:border-white/5 transition-colors">
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Landlord Portal */}
          <div className="p-8 rounded-3xl bg-white dark:bg-[#111827] border border-indigo-500/20 shadow-sm space-y-4 flex flex-col justify-between transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">For Landlords &amp; Property Owners</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Fill your hostel or residential rooms with verified tenants. Receive automated rent payouts directly to your MoMo or Bank account, view P&amp;L reports, and delegate porters effortlessly.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium pt-1">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Automated Paystack / MoMo Payouts</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Porter &amp; Staff Delegation Hub</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Digital Lease Signatures &amp; Tenant CRM</li>
              </ul>
            </div>

            <div className="pt-3">
              <Link
                href="/dashboard/landlord/new"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all inline-flex items-center gap-2 shadow-md shadow-indigo-600/20"
              >
                <span>List Your Property</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Caretaker Portal */}
          <div className="p-8 rounded-3xl bg-white dark:bg-[#111827] border border-amber-500/20 shadow-sm space-y-4 flex flex-col justify-between transition-colors">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-600/20 border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">For Caretakers &amp; Hostel Porters</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Streamline daily compound operations on your phone. Handle resident repair tickets, conduct move-in condition checklists, log incoming parcels, and clear gate passes.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium pt-1">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Digital Move-In Condition Checklists</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Maintenance Ticket Scheduling &amp; Proof Photos</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Front Desk Parcel Vault &amp; Gate PINs</li>
              </ul>
            </div>

            <div className="pt-3">
              <Link
                href="/dashboard/caretaker"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all inline-flex items-center gap-2 shadow-md shadow-amber-500/20"
              >
                <span>Open Caretaker Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          8. MODERN PRESTIGE FOOTER
         ════════════════════════════════════════════════════════════════ */}
      <footer className="bg-slate-950 text-slate-400 pt-16 pb-12 border-t border-slate-800 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Brand */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#5B4CFF] flex items-center justify-center text-white font-black text-xs">
                  🏠
                </div>
                <span className="font-black text-white text-base tracking-tight">Akwaaba Homes</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ghana's trusted digital rental and student housing platform. Escrow secured, verified listings, and seamless tenancy management.
              </p>
            </div>

            {/* Explore */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-black text-white uppercase text-[10px] tracking-wider">Explore Listings</h4>
              <ul className="space-y-2">
                <li><Link href="/properties?type=Hostel" className="hover:text-white transition-colors">University Hostels</Link></li>
                <li><Link href="/properties?type=Apartment" className="hover:text-white transition-colors">Residential Apartments</Link></li>
                <li><Link href="/properties?type=Single+Room" className="hover:text-white transition-colors">Single Room Self-Contain</Link></li>
                <li><Link href="/dashboard/roommates" className="hover:text-white transition-colors">Find a Student Roommate</Link></li>
              </ul>
            </div>

            {/* Campus Clusters */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-black text-white uppercase text-[10px] tracking-wider">Campus Clusters</h4>
              <ul className="space-y-2">
                <li><Link href="/properties?location=Ayeduase" className="hover:text-white transition-colors">KNUST (Ayeduase / Kotei)</Link></li>
                <li><Link href="/properties?location=East+Legon" className="hover:text-white transition-colors">UG Legon (East Legon / Haatso)</Link></li>
                <li><Link href="/properties?location=Amamoma" className="hover:text-white transition-colors">UCC (Amamoma / Apewosika)</Link></li>
                <li><Link href="/properties?location=Madina" className="hover:text-white transition-colors">UPSA &amp; ATU Campus</Link></li>
              </ul>
            </div>

            {/* Portals & Security */}
            <div className="space-y-2.5 text-xs">
              <h4 className="font-black text-white uppercase text-[10px] tracking-wider">Portals &amp; Support</h4>
              <ul className="space-y-2">
                <li><Link href="/login" className="hover:text-white transition-colors">Resident &amp; Student Sign In</Link></li>
                <li><Link href="/dashboard/landlord" className="hover:text-white transition-colors">Landlord Command Center</Link></li>
                <li><Link href="/dashboard/caretaker" className="hover:text-white transition-colors">Caretaker Operations Hub</Link></li>
                <li>
                  <Link 
                    href="/admin/login" 
                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold"
                  >
                    <Shield className="w-3.5 h-3.5" /> Admin Security Portal
                  </Link>
                </li>
              </ul>
            </div>

          </div>

          <div className="pt-6 border-t border-slate-800 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div>
              &copy; {new Date().getFullYear()} Akwaaba Homes Ghana Ltd. All rights reserved.
            </div>
            <div className="flex items-center gap-6 font-medium text-slate-400">
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Escrow Secured
              </span>
              <span>Accra, Ghana 🇬🇭</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
