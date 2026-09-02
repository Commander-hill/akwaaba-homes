'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import { 
  Search, MapPin, Building, ShieldCheck, Shield, Users, 
  ArrowRight, CheckCircle2, Lock, DollarSign, Wrench, ChevronRight,
  GraduationCap, Clock, HelpCircle, FileText, Check, Sparkles,
  Zap, Compass, PhoneCall, AlertCircle, Eye, BedDouble, Droplet
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

const PROPERTY_CATEGORIES = [
  { id: 'Hostel', name: 'University Hostels', tag: 'Academic Year Billing', icon: GraduationCap, count: '140+ Halls & Hostels' },
  { id: 'Single Room', name: 'Self-Contained Studios', tag: 'Private Kitchen & Bath', icon: BedDouble, count: '85+ Available' },
  { id: 'Apartment', name: '1–3 Bed Residential Flats', tag: 'Professionals & Families', icon: Building, count: '62+ Units' },
  { id: 'Homestay', name: 'Verified Room Shares', tag: 'Split Rent via Escrow', icon: Users, count: '94+ Verified Peers' },
];

export default function Home() {
  const router = useRouter();

  // Search State
  const [activeType, setActiveType] = useState<string>('ALL');
  const [locationInput, setLocationInput] = useState('');
  const [budgetTier, setBudgetTier] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('');

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
    if (locationInput.trim()) params.append('location', locationInput.trim());
    if (activeType !== 'ALL') params.append('type', activeType);
    if (billingPeriod) params.append('pricePeriod', billingPeriod);
    if (budgetTier) {
      if (budgetTier === 'under2k') params.append('maxPrice', '2000');
      if (budgetTier === '2k-5k') { params.append('minPrice', '2000'); params.append('maxPrice', '5000'); }
      if (budgetTier === '5k-10k') { params.append('minPrice', '5000'); params.append('maxPrice', '10000'); }
      if (budgetTier === 'above10k') params.append('minPrice', '10000');
    }
    router.push('/properties?' + params.toString());
  };

  const handleCampusDirect = (query: string) => {
    router.push('/properties?location=' + encodeURIComponent(query));
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FBFBFC] dark:bg-[#0B0D12] text-zinc-900 dark:text-zinc-100 transition-colors duration-200">
      
      {/* ════════════════════════════════════════════════════════════════
          1. EDITORIAL HERO SECTION: GROUNDED & ARCHITECTURAL
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-12 pb-16 lg:pt-18 lg:pb-24 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Clear Editorial Messaging */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Trust Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-[#0F5132] dark:text-emerald-400 text-xs font-bold tracking-tight">
                <ShieldCheck className="w-4 h-4" />
                <span>Ghana Rent Act (Act 220) &amp; Ghana Card KYC Verified</span>
              </div>

              {/* Editorial Title */}
              <h1 className="text-3xl sm:text-5xl lg:text-5xl font-black text-zinc-950 dark:text-white tracking-tight leading-[1.12]">
                Verified Housing in Ghana. <br />
                <span className="text-[#0F5132] dark:text-[#198754]">
                  Zero Roadside Agent Fees.
                </span>
              </h1>

              {/* Sub-copy */}
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl leading-relaxed">
                Connect directly with certified property owners and hostel managers across KNUST, Legon, UCC, and Accra. 
                Pay securely via MoMo escrow — funds are released only after on-site key handover and condition sign-off.
              </p>

              {/* ── SOLID EDITORIAL SEARCH MODULE ── */}
              <div className="pt-2">
                <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm">
                  
                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 pb-3 border-b border-zinc-100 dark:border-zinc-800 overflow-x-auto scrollbar-none">
                    {[
                      { id: 'ALL', label: 'All Listings' },
                      { id: 'Hostel', label: 'Student Hostels' },
                      { id: 'Single Room', label: 'Self-Contain' },
                      { id: 'Apartment', label: 'Apartments' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveType(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeType === tab.id
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Form Inputs Grid */}
                  <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
                    
                    {/* Location Input */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Campus or Area
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                        <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                        <input
                          type="text"
                          value={locationInput}
                          onChange={(e) => setLocationInput(e.target.value)}
                          placeholder="e.g. Ayeduase, East Legon..."
                          className="w-full bg-transparent border-none outline-none text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400"
                        />
                      </div>
                    </div>

                    {/* Price Range */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Budget Range
                      </label>
                      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
                        <DollarSign className="w-4 h-4 text-zinc-400 shrink-0" />
                        <select
                          value={budgetTier}
                          onChange={(e) => setBudgetTier(e.target.value)}
                          aria-label="Select Budget Range"
                          className="w-full bg-transparent border-none outline-none text-xs font-medium text-zinc-900 dark:text-white cursor-pointer [&>option]:bg-white [&>option]:text-zinc-900 dark:[&>option]:bg-zinc-900 dark:[&>option]:text-white"
                        >
                          <option value="">Any Price</option>
                          <option value="under2k">Under GH₵ 2,000</option>
                          <option value="2k-5k">GH₵ 2,000 – 5,000</option>
                          <option value="5k-10k">GH₵ 5,000 – 10,000</option>
                          <option value="above10k">Above GH₵ 10,000</option>
                        </select>
                      </div>
                    </div>

                    {/* Search Trigger */}
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <Search className="w-4 h-4" />
                        <span>Find Listings</span>
                      </button>
                    </div>

                  </form>
                </div>
              </div>

              {/* Quick Campus Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-[#0F5132] dark:text-[#198754]" /> Major Hubs:
                </span>
                {POPULAR_CAMPUSES.map((campus) => (
                  <button
                    key={campus.name}
                    type="button"
                    onClick={() => handleCampusDirect(campus.query)}
                    className="px-2.5 py-1 rounded-md bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 text-zinc-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer"
                  >
                    {campus.name}
                  </button>
                ))}
              </div>

            </div>

            {/* Right Column: Architectural Photography Preview */}
            <div className="lg:col-span-5 relative">
              <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm relative">
                <div className="relative h-96 w-full">
                  <img
                    src="/images/sunset-bg.png"
                    alt="Verified student accommodation complex in Ghana"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/20 to-transparent" />

                  {/* Overlaid Data Tag */}
                  <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 shadow-md flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Direct Landlord Verified
                      </div>
                      <div className="text-sm font-black text-zinc-900 dark:text-white mt-0.5">
                        Unity Palms Student Hostel
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Ayeduase Gate, KNUST • 400m from Campus
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-zinc-400 line-through">GH₵ 3,800</div>
                      <div className="text-base font-black text-[#0F5132] dark:text-emerald-400">
                        GH₵ 3,200
                        <span className="text-[10px] font-normal text-zinc-500"> / Acad. Yr</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          2. AUDITED TRUST & STATUTORY SECURITY STRIP
         ════════════════════════════════════════════════════════════════ */}
      <section className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#12151D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-800/50">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Escrow Protected</div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Rent safely held until on-site key handover</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800/50">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Ghana Card KYC</div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Verified landlord &amp; caretaker identities</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-800/50">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Instant MoMo Payouts</div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">MTN, Telecel Cash, AT &amp; Bank Transfer</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-800/50">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Act 220 Legal Leases</div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Statutory tenancy contracts with SHA-256 seal</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          3. REALITY CHECK: WHY AKWAABA BEATS ROADSIDE BROKERS
         ════════════════════════════════════════════════════════════════ */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] p-8 sm:p-10 shadow-xs">
          
          <div className="max-w-2xl mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0F5132] dark:text-[#198754]">
              The Ghana Rental Reality
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight mt-1">
              Engineered to Fix the Roadside Agent Crisis
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
              In Ghana, finding accommodation traditionally meant paying non-refundable "viewing fees" to informal roadside agents, 
              only to be shown substandard rooms or face double-allocation scams. Here is how Akwaaba Homes changes the game:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/60 space-y-3">
              <div className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> Old Roadside Agent Model
              </div>
              <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li className="line-through">GH₵ 100–200 upfront viewing fees before inspection</li>
                <li className="line-through">10% agent commission added onto your rent</li>
                <li className="line-through">Unlawful demands for 2–3 years advance payment</li>
                <li className="line-through">No written lease or statutory eviction protection</li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-3 md:col-span-2">
              <div className="text-xs font-bold text-[#0F5132] dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> The Akwaaba Homes Standard
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-700 dark:text-zinc-300">
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Zero viewing fees:</strong> Inspect photos, 360 virtual tours, and room dimensions for free online.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Direct Host Linkage:</strong> Deal directly with verified landlords and on-site caretakers.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Statutory Lease:</strong> Automatic Act 220 compliant tenancy agreement signed digitally.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Escrow Safeguard:</strong> Landlord receives payout only when you inspect the room and sign off.</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          4. BROWSE BY ACCOMMODATION TYPE (EDITORIAL TILES)
         ════════════════════════════════════════════════════════════════ */}
      <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-zinc-950 dark:text-white tracking-tight">
              Accommodations by Category
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Select verified housing tailored to student schedules or residential tenancies.
            </p>
          </div>
          <Link
            href="/properties"
            className="text-xs font-bold text-[#0F5132] dark:text-[#198754] hover:underline flex items-center gap-1"
          >
            All Listings <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROPERTY_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.id}
                href={`/properties?type=${encodeURIComponent(cat.id)}`}
                className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 transition-all group shadow-xs hover:shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200 group-hover:bg-[#0F5132] group-hover:text-white transition-colors mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  {cat.tag}
                </p>
                <div className="mt-3 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  {cat.count}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          5. FEATURED LISTINGS: DENSE WITH AUTHENTIC GHANAIAN SPECS
         ════════════════════════════════════════════════════════════════ */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#0F5132] dark:text-[#198754]">
              Pre-Inspected &amp; Available
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight mt-1">
              Featured Verified Accommodations
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Genuine listings with real photos, transparent billing, and zero agent surcharge.
            </p>
          </div>

          <Link
            href="/properties"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-colors shrink-0"
          >
            <span>Explore All Accommodations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Listings Grid */}
        {isPropsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-84 rounded-2xl bg-zinc-200 dark:bg-zinc-800/50 animate-pulse" />
            ))}
          </div>
        ) : featuredListings.length === 0 ? (
          <div className="p-12 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-center space-y-3">
            <Building className="w-10 h-10 text-zinc-400 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">All Properties Reserved</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
              New verified hostels and rental apartments are inspected and onboarded weekly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredListings.map((prop) => (
              <div 
                key={prop.id}
                className="group rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Photo Thumbnail */}
                  <div className="relative h-50 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                    <img 
                      src={getImageUrl(prop.images?.[0]) || '/placeholder-property.jpg'} 
                      alt={prop.title} 
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                    
                    {/* Top Type Tag */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-zinc-950/80 text-white backdrop-blur-xs">
                        {prop.type}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 pointer-events-auto">
                      <WishlistButton propertyId={prop.id} />
                    </div>

                    {/* Price Tag Overlay */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="px-2.5 py-1 rounded-lg bg-white/95 dark:bg-zinc-900/95 text-zinc-950 dark:text-white text-xs font-black shadow-xs">
                        GH₵ {prop.price.toLocaleString()}
                        <span className="text-[10px] font-normal text-zinc-500"> / {prop.pricePeriod || 'Year'}</span>
                      </span>
                      {prop.landlord?.isVerifiedLandlord && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Verified Host
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2">
                    <h3 className="font-bold text-sm text-zinc-950 dark:text-white line-clamp-1 group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 transition-colors">
                      {prop.title}
                    </h3>
                    
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{prop.location}</span>
                    </p>

                    {/* Ghanaian Utility & Housing Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">
                      {prop.rooms?.[0]?.roomType && (
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                          🛏️ {prop.rooms[0].roomType}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                        ⚡ Prepaid ECG Meter
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800">
                        💧 Polytank Backup
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <Link
                    href={`/properties/${prop.id}`}
                    className="w-full py-2 rounded-xl bg-zinc-100 hover:bg-[#0F5132] text-zinc-900 hover:text-white dark:bg-zinc-800 dark:hover:bg-[#0F5132] dark:text-zinc-100 dark:hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>View Room Details</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════════════
          6. EDITORIAL ROOMMATE COMPATIBILITY SECTION
         ════════════════════════════════════════════════════════════════ */}
      <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-white p-8 sm:p-12 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
          
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/10 text-zinc-200 text-xs font-bold tracking-tight">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Roommate Matcher Algorithm</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Split Campus Hostel Rent with Compatible Students.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Living alone off-campus is expensive. Match with vetted student peers across KNUST, Legon, and UCC based on study habits, 
              cleanliness standards, and sleep schedules. Split the room cost in half safely through digital lease escrow.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard/roommates"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold transition-colors shadow-xs"
              >
                <span>Find a Compatible Roommate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full lg:w-auto shrink-0 text-center">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-2xl font-black text-amber-400">GH₵ 1,800+</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Average Yearly Savings</div>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-2xl font-black text-emerald-400">100%</div>
              <div className="text-[10px] text-zinc-400 mt-0.5">Student ID Verified</div>
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          7. DUAL PORTALS: LANDLORDS & HOSTEL CARETAKERS
         ════════════════════════════════════════════════════════════════ */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Landlord Portal */}
          <div className="p-8 rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800/40">
                <Building className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-zinc-950 dark:text-white">For Property Owners &amp; Landlords</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                List your residential units or student hostels. Fill rooms without informal agent squabbles, manage tenant leases automatically, 
                and receive automated MoMo payouts straight into your MTN or Telecel wallet.
              </p>
              <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Direct MoMo &amp; Bank Escrow Settlements</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Caretaker &amp; Porter Delegation Tools</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Digital Rent Act (Act 220) Contracts</li>
              </ul>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard/landlord/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#0F5132] hover:bg-[#0A3D24] transition-colors"
              >
                <span>List a Property</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Caretaker Portal */}
          <div className="p-8 rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-800/40">
                <Wrench className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-zinc-950 dark:text-white">For On-Site Hostel Caretakers</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Conduct digital move-in condition checklists right on your phone. Record tenant signatures, track plumbing or electrical repair tickets, 
                and log incoming packages with front-desk PIN clearance.
              </p>
              <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> Digital Room Handover Condition Checklist</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> Work Order Management &amp; Repair Proof</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> Front Desk Parcel Vault Logging</li>
              </ul>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard/caretaker"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-zinc-900 bg-amber-400 hover:bg-amber-300 transition-colors"
              >
                <span>Open Caretaker Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
          8. EDITORIAL ARCHITECTURAL FOOTER
         ════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0B0D12] text-zinc-500 dark:text-zinc-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-black text-zinc-950 dark:text-white text-base tracking-tight">
                  Akwaaba<span className="text-[#0F5132] dark:text-[#198754]">Homes</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Ghana's certified digital rental and hostel marketplace. Escrow backed, zero middleman broker fraud, and legal Act 220 tenancy contracts.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-zinc-950 dark:text-white uppercase tracking-wider text-[11px]">Accommodations</div>
              <ul className="space-y-1.5">
                <li><Link href="/properties?type=Hostel" className="hover:text-zinc-950 dark:hover:text-white">University Hostels</Link></li>
                <li><Link href="/properties?type=Single+Room" className="hover:text-zinc-950 dark:hover:text-white">Single Room Self-Contain</Link></li>
                <li><Link href="/properties?type=Apartment" className="hover:text-zinc-950 dark:hover:text-white">Residential Apartments</Link></li>
                <li><Link href="/dashboard/roommates" className="hover:text-zinc-950 dark:hover:text-white">Find a Roommate</Link></li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-zinc-950 dark:text-white uppercase tracking-wider text-[11px]">Campus Clusters</div>
              <ul className="space-y-1.5">
                <li><Link href="/properties?location=Ayeduase" className="hover:text-zinc-950 dark:hover:text-white">KNUST (Ayeduase / Kotei / Gaza)</Link></li>
                <li><Link href="/properties?location=East+Legon" className="hover:text-zinc-950 dark:hover:text-white">UG Legon (East Legon / Okponglo)</Link></li>
                <li><Link href="/properties?location=Amamoma" className="hover:text-zinc-950 dark:hover:text-white">UCC (Amamoma / Apewosika)</Link></li>
                <li><Link href="/properties?location=Madina" className="hover:text-zinc-950 dark:hover:text-white">UPSA &amp; ATU</Link></li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-zinc-950 dark:text-white uppercase tracking-wider text-[11px]">Portals &amp; Legal</div>
              <ul className="space-y-1.5">
                <li><Link href="/login" className="hover:text-zinc-950 dark:hover:text-white">Resident &amp; Student Sign In</Link></li>
                <li><Link href="/dashboard/landlord" className="hover:text-zinc-950 dark:hover:text-white">Landlord Command Center</Link></li>
                <li><Link href="/dashboard/caretaker" className="hover:text-zinc-950 dark:hover:text-white">Caretaker Operations Hub</Link></li>
                <li><Link href="/admin/login" className="text-[#0F5132] dark:text-[#198754] font-bold">Admin Security Portal</Link></li>
              </ul>
            </div>

          </div>

          <div className="pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div>
              &copy; {new Date().getFullYear()} Akwaaba Homes Ghana Ltd. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-zinc-500">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% MoMo Escrow Verified
              </span>
              <span>Accra &amp; Kumasi, Ghana 🇬🇭</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
