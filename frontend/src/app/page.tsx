'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Search,
  MapPin,
  Building2,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Lock,
  Users,
  Home as HomeIcon,
  GraduationCap,
  SlidersHorizontal,
  Star,
  FileText,
  HelpCircle,
  Wallet,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import WishlistButton from '@/components/WishlistButton';

const POPULAR_LOCATIONS = [
  { label: 'KNUST • Ayeduase / Boadi', query: 'KNUST' },
  { label: 'UG Legon • East Legon', query: 'Legon' },
  { label: 'UCC • Cape Coast', query: 'UCC' },
  { label: 'UPSA • Madina', query: 'Madina' },
  { label: 'Accra • Spintex / Osu', query: 'Accra' },
  { label: 'Kumasi • Ahodwo', query: 'Kumasi' },
];

const PROPERTY_TYPES = [
  { value: '', label: 'All Accommodation Types' },
  { value: 'HOSTEL', label: 'Student Hostel' },
  { value: 'APARTMENT', label: 'Self-Contained Apartment' },
  { value: 'STUDIO', label: 'Studio Unit' },
  { value: 'CHAMBER_AND_HALL', label: 'Chamber & Hall' },
  { value: 'SINGLE_ROOM', label: 'Single Room' },
  { value: 'HOUSE', label: 'Full Residential House' },
];

const BUDGET_PRESETS = [
  { value: '', label: 'Any Budget (GH₵)' },
  { value: '0-2000', label: 'Up to GH₵ 2,000' },
  { value: '2000-4000', label: 'GH₵ 2,000 – GH₵ 4,000' },
  { value: '4000-7500', label: 'GH₵ 4,000 – GH₵ 7,500' },
  { value: '7500-50000', label: 'GH₵ 7,500+' },
];

export default function Home() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'HOSTEL' | 'RESIDENTIAL' | 'BUDGET'>('ALL');

  const { data: userResponse } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const user = userResponse?.user;

  const { data: propertiesData, isLoading: isLoadingProperties } = useQuery({
    queryKey: ['featured-properties'],
    queryFn: async () => {
      const { data } = await api.get('/properties?limit=12');
      return data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const allListings: any[] = useMemo(() => {
    return propertiesData?.data || propertiesData?.properties || [];
  }, [propertiesData]);

  const filteredListings = useMemo(() => {
    if (activeCategory === 'HOSTEL') {
      return allListings.filter((p) => p.type === 'HOSTEL' || p.targetAudience === 'STUDENTS').slice(0, 6);
    }
    if (activeCategory === 'RESIDENTIAL') {
      return allListings.filter((p) => p.type !== 'HOSTEL').slice(0, 6);
    }
    if (activeCategory === 'BUDGET') {
      return [...allListings].sort((a, b) => Number(a.price || 0) - Number(b.price || 0)).slice(0, 6);
    }
    return allListings.slice(0, 6);
  }, [allListings, activeCategory]);

  const spotlightProperty = allListings[0] || null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.append('location', searchQuery.trim());
    if (propertyType) params.append('type', propertyType);
    if (budgetRange) {
      const [min, max] = budgetRange.split('-');
      if (min) params.append('minPrice', min);
      if (max) params.append('maxPrice', max);
    }
    router.push(`/properties?${params.toString()}`);
  };

  const formatPeriod = (period?: string, type?: string) => {
    if (period === 'PER_MONTH') return '/ month';
    if (period === 'PER_SEMESTER') return '/ semester';
    if (period === 'PER_YEAR' || period === 'PER_ACADEMIC_YEAR') {
      return type === 'HOSTEL' ? '/ academic yr' : '/ year';
    }
    return type === 'HOSTEL' ? '/ academic yr' : '/ year';
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F6] dark:bg-[#0B0D12] text-zinc-900 dark:text-zinc-100 selection:bg-[#0F5132] selection:text-white">
      {/* 1. HERO SECTION */}
      <section className="relative pt-24 pb-16 sm:pt-28 sm:pb-20 lg:pt-32 lg:pb-24 border-b border-zinc-200/80 dark:border-zinc-800/80 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#0F5132 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Copy & Search */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/5 dark:bg-emerald-400/10 border border-[#0F5132]/20 dark:border-emerald-400/20">
                <span className="w-2 h-2 rounded-full bg-[#0F5132] dark:bg-emerald-400" />
                <span className="text-xs font-semibold text-[#0F5132] dark:text-emerald-300 tracking-wide">
                  Akwaaba Homes — Trusted Homes for Students &amp; Residents
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-[3.35rem] font-extrabold tracking-tight text-zinc-950 dark:text-white leading-[1.1]">
                Find safe, transparent accommodation across{' '}
                <span className="text-[#0F5132] dark:text-emerald-400">Ghana.</span>
              </h1>

              <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
                Browse accredited student hostels, self-contained apartments, and residential homes near major campuses and city centres. Review real utility terms, sign digital leases, and pay safely through escrow.
              </p>

              {/* Structured Multi-Field Search Panel */}
              <form
                onSubmit={handleSearch}
                aria-label="Search accommodations"
                className="bg-white dark:bg-[#12151E] p-3 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-[0_12px_36px_-10px_rgba(0,0,0,0.08)]"
              >
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  {/* Location Input */}
                  <div className="sm:col-span-5 flex items-center px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-transparent focus-within:border-[#0F5132] dark:focus-within:border-emerald-500 transition-colors">
                    <MapPin className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
                    <div className="w-full">
                      <label htmlFor="hero-location-search" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Location or Campus
                      </label>
                      <input
                        id="hero-location-search"
                        type="text"
                        placeholder="KNUST, Legon, East Legon, UCC..."
                        className="w-full bg-transparent text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none text-sm font-medium mt-0.5"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Property Type Select */}
                  <div className="sm:col-span-4 flex items-center px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-transparent focus-within:border-[#0F5132] dark:focus-within:border-emerald-500 transition-colors">
                    <Building2 className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
                    <div className="w-full">
                      <label htmlFor="hero-property-type" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Property Type
                      </label>
                      <select
                        id="hero-property-type"
                        value={propertyType}
                        onChange={(e) => setPropertyType(e.target.value)}
                        className="w-full bg-transparent text-zinc-900 dark:text-white focus:outline-none text-sm font-medium mt-0.5 cursor-pointer"
                      >
                        {PROPERTY_TYPES.map((t) => (
                          <option key={t.value} value={t.value} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Budget Select */}
                  <div className="sm:col-span-3 flex items-center px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-transparent focus-within:border-[#0F5132] dark:focus-within:border-emerald-500 transition-colors">
                    <Wallet className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
                    <div className="w-full">
                      <label htmlFor="hero-budget" className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Budget
                      </label>
                      <select
                        id="hero-budget"
                        value={budgetRange}
                        onChange={(e) => setBudgetRange(e.target.value)}
                        className="w-full bg-transparent text-zinc-900 dark:text-white focus:outline-none text-sm font-medium mt-0.5 cursor-pointer"
                      >
                        {BUDGET_PRESETS.map((b) => (
                          <option key={b.value} value={b.value} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                            {b.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-zinc-400 mr-1">Popular:</span>
                    {POPULAR_LOCATIONS.map((loc) => (
                      <button
                        key={loc.query}
                        type="button"
                        onClick={() => router.push(`/properties?location=${encodeURIComponent(loc.query)}`)}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-emerald-50 text-zinc-700 hover:text-[#0F5132] dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                      >
                        {loc.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl font-bold text-white bg-[#0F5132] hover:bg-[#0b3e26] transition-all flex items-center justify-center gap-2 text-sm shadow-sm shrink-0 cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search Homes</span>
                  </button>
                </div>
              </form>

              {/* Key Platform Commitments */}
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-zinc-200/70 dark:border-zinc-800/70">
                <div className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">Escrow Rent Protection</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Funds held until check-in</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">Act 220 Digital Leases</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Clear terms &amp; deposit rules</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">Transparent Listings</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Upfront ECG &amp; water policies</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Visual Showcase (Backed by Real Listing or Honest Platform Card) */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl bg-zinc-900 aspect-[4/4.6]">
                <Image
                  src={
                    spotlightProperty?.images?.[0] ||
                    'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1200&q=85'
                  }
                  alt={spotlightProperty?.title || 'Modern residential accommodation in Ghana'}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-semibold border border-white/15">
                    {spotlightProperty ? 'Live Marketplace Listing' : 'Escrow-Protected Marketplace'}
                  </span>
                  {spotlightProperty?.landlord?.isVerifiedLandlord && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0F5132]/90 backdrop-blur-md text-white text-[11px] font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      KYC Verified Host
                    </span>
                  )}
                </div>

                {spotlightProperty ? (
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-[#12151E]/95 backdrop-blur-md p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-lg">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#0F5132] dark:text-emerald-400">
                          {spotlightProperty.type?.replace(/_/g, ' ') || 'ACCOMMODATION'}
                        </p>
                        <h2 className="font-bold text-zinc-900 dark:text-white text-base truncate mt-0.5">
                          {spotlightProperty.title}
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          {spotlightProperty.location}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-extrabold text-zinc-950 dark:text-white text-base">
                          GH₵ {Number(spotlightProperty.price || 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {formatPeriod(spotlightProperty.pricePeriod, spotlightProperty.type)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between">
                      <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                        {spotlightProperty.remainingCapacity > 0
                          ? `${spotlightProperty.remainingCapacity} space(s) open`
                          : 'Available for inspection'}
                      </span>
                      <Link
                        href={`/properties/${spotlightProperty.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#0F5132] dark:text-emerald-400 hover:underline"
                      >
                        View details <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-[#12151E]/95 backdrop-blur-md p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-lg">
                    <p className="text-xs font-bold text-zinc-900 dark:text-white">
                      Verified Student Hostels &amp; Private Rentals
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Explore available accommodations with transparent pricing in GH₵ and digital tenancy protection.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. QUICK BROWSE BY ACCOMMODATION CATEGORY */}
      <section className="py-12 bg-white dark:bg-[#0E1017] border-b border-zinc-200/70 dark:border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-[#0F5132] dark:text-emerald-400 font-semibold">
                Browse by Category
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-zinc-950 dark:text-white tracking-tight mt-0.5">
                Tailored for Campus &amp; City Living
              </h2>
            </div>
            <Link
              href="/properties"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F5132] dark:text-emerald-400 hover:underline"
            >
              <span>Open Full Search &amp; Filters</span>
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/properties?type=HOSTEL"
              className="group p-5 rounded-xl bg-[#FAF9F6] dark:bg-[#12151E] border border-zinc-200/90 dark:border-zinc-800 hover:border-[#0F5132] dark:hover:border-emerald-500/60 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-950/10 dark:bg-emerald-400/10 flex items-center justify-center text-[#0F5132] dark:text-emerald-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Student Hostels</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  1-in-a-room to 4-in-a-room campus hostels with bed-level booking.
                </p>
              </div>
            </Link>

            <Link
              href="/properties?type=APARTMENT"
              className="group p-5 rounded-xl bg-[#FAF9F6] dark:bg-[#12151E] border border-zinc-200/90 dark:border-zinc-800 hover:border-[#0F5132] dark:hover:border-emerald-500/60 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-950/10 dark:bg-emerald-400/10 flex items-center justify-center text-[#0F5132] dark:text-emerald-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Self-Contained Apartments</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Private apartments and studios for professionals, couples, and families.
                </p>
              </div>
            </Link>

            <Link
              href="/properties?type=CHAMBER_AND_HALL"
              className="group p-5 rounded-xl bg-[#FAF9F6] dark:bg-[#12151E] border border-zinc-200/90 dark:border-zinc-800 hover:border-[#0F5132] dark:hover:border-emerald-500/60 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-950/10 dark:bg-emerald-400/10 flex items-center justify-center text-[#0F5132] dark:text-emerald-400">
                  <HomeIcon className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Chamber &amp; Hall / Single Rooms</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Practical Ghanaian residential units with transparent advance terms.
                </p>
              </div>
            </Link>

            <Link
              href={user ? '/dashboard/roommates' : '/login'}
              className="group p-5 rounded-xl bg-[#FAF9F6] dark:bg-[#12151E] border border-zinc-200/90 dark:border-zinc-800 hover:border-[#0F5132] dark:hover:border-emerald-500/60 transition-all flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Users className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm">Roommate Matcher</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Pair with compatible students or co-tenants by study and sleep habits.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. FEATURED & VERIFIED LISTINGS */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-[#0F5132] dark:text-emerald-400 font-semibold mb-1">
              Live Accommodations
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Available Properties Across Ghana
            </h2>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
            {[
              { id: 'ALL', label: 'All Featured' },
              { id: 'HOSTEL', label: 'Student Hostels' },
              { id: 'RESIDENTIAL', label: 'Apartments & Homes' },
              { id: 'BUDGET', label: 'Lowest Price First' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeCategory === tab.id
                    ? 'bg-[#0F5132] text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {isLoadingProperties ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="bg-white dark:bg-[#12151E] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-pulse"
              >
                <div className="h-52 bg-zinc-200 dark:bg-zinc-800" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                  <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                  <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredListings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((prop: any) => {
              const amenitiesList: string[] = Array.isArray(prop.amenities)
                ? prop.amenities
                : Array.isArray(prop.includedUtilities)
                ? prop.includedUtilities
                : [];
              const isVerifiedHost = Boolean(prop.landlord?.isVerifiedLandlord);

              return (
                <article
                  key={prop.id}
                  className="group relative bg-white dark:bg-[#12151E] rounded-2xl overflow-hidden border border-zinc-200/90 dark:border-zinc-800/90 hover:border-[#0F5132]/50 dark:hover:border-emerald-500/50 transition-all duration-200 flex flex-col shadow-xs hover:shadow-lg"
                >
                  {/* Wishlist Button placed outside <Link> to satisfy HTML5 & WCAG 2.2 AA */}
                  <div className="absolute top-3 right-3 z-20">
                    <WishlistButton propertyId={prop.id} />
                  </div>

                  <Link href={`/properties/${prop.id}`} className="flex flex-col flex-1 focus-visible:outline-none">
                    {/* Image Container */}
                    <div className="relative h-52 w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                      <Image
                        src={
                          prop.images && prop.images.length > 0
                            ? prop.images[0]
                            : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80'
                        }
                        alt={prop.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      {/* Top Left Badges */}
                      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 pr-12">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-zinc-900/80 text-white backdrop-blur-md">
                          {prop.type?.replace(/_/g, ' ') || 'RESIDENCE'}
                        </span>
                        {isVerifiedHost && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#0F5132]/95 text-white backdrop-blur-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                            Verified Host
                          </span>
                        )}
                      </div>

                      {/* Bottom Left Availability / Rating */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                        <span className="font-medium bg-black/55 backdrop-blur-xs px-2.5 py-0.5 rounded-md">
                          {prop.totalCapacity > 0
                            ? prop.remainingCapacity > 0
                              ? `${prop.remainingCapacity} bed(s) left`
                              : 'Fully Booked'
                            : prop.isAvailable
                            ? 'Available Now'
                            : 'Unavailable'}
                        </span>
                        {prop.avgRating && (
                          <span className="inline-flex items-center gap-1 bg-black/65 backdrop-blur-xs px-2 py-0.5 rounded-md font-bold text-amber-300">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {Number(prop.avgRating).toFixed(1)}
                            {prop.reviewCount ? <span className="text-zinc-300 font-normal">({prop.reviewCount})</span> : null}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 transition-colors line-clamp-1 mb-1">
                          {prop.title}
                        </h3>
                        <p className="flex items-center text-zinc-500 dark:text-zinc-400 text-xs mb-3 line-clamp-1">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-zinc-400 shrink-0" />
                          {prop.location}
                        </p>

                        {/* Genuine Amenities from Property Data */}
                        {amenitiesList.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {amenitiesList.slice(0, 3).map((item, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium"
                              >
                                {item}
                              </span>
                            ))}
                            {amenitiesList.length > 3 && (
                              <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/90 text-zinc-500 text-[11px]">
                                +{amenitiesList.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-4">
                            {prop.furnishing ? `${prop.furnishing.replace(/_/g, ' ')} • ` : ''}
                            {prop.targetAudience ? `For ${prop.targetAudience.toLowerCase()}` : 'Direct landlord listing'}
                          </p>
                        )}
                      </div>

                      <div className="pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-baseline justify-between">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                            Rent
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-mono font-extrabold text-zinc-950 dark:text-white">
                              GH₵ {Number(prop.price || 0).toLocaleString()}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {formatPeriod(prop.pricePeriod, prop.type)}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-bold text-[#0F5132] dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                          Inspect <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-14 bg-white dark:bg-[#12151E] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8">
            <Building2 className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
              No properties match this category yet
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs max-w-md mx-auto mb-4">
              Switch categories above or explore the full property catalog.
            </p>
            <button
              type="button"
              onClick={() => setActiveCategory('ALL')}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-[#0F5132] text-white hover:bg-[#0b3e26] transition-colors cursor-pointer"
            >
              Show All Featured Homes
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:border-[#0F5132] dark:hover:border-emerald-400 text-xs font-bold text-zinc-900 dark:text-white transition-colors"
          >
            <span>View All Available Accommodations</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* 4. HOW AKWAABA HOMES WORKS (4-Step Process) */}
      <section id="how-it-works" className="py-16 bg-white dark:bg-[#0E1017] border-y border-zinc-200/80 dark:border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <p className="text-xs font-mono uppercase tracking-widest text-[#0F5132] dark:text-emerald-400 font-semibold mb-1">
              How It Works
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
              From Campus Search to Safe Move-In
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
              Every booking on Akwaaba Homes follows a clear, verifiable process designed to protect students and residents from rental fraud.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Search & Filter Honestly',
                desc: 'Filter by university campus, neighbourhood, room occupancy (1-in-a-room to 4-in-a-room), furnishing, and budget in GH₵.',
              },
              {
                step: '02',
                title: 'Verify Rules & Utilities',
                desc: 'Review real photos, ECG electricity meter type, water supply, gate curfew hours, and caution deposit requirements before applying.',
              },
              {
                step: '03',
                title: 'Sign Digital Lease & Pay Escrow',
                desc: 'Once approved, review and sign your digital tenancy agreement and pay via Mobile Money or card into Paystack-backed escrow.',
              },
              {
                step: '04',
                title: 'Check In & Release Funds',
                desc: 'Collect your keys at the property and confirm check-in on your dashboard before rent is released to the property owner.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="p-6 rounded-2xl bg-[#FAF9F6] dark:bg-[#12151E] border border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between"
              >
                <div>
                  <span className="inline-block font-mono text-xs font-extrabold px-2.5 py-1 rounded-md bg-emerald-950/10 dark:bg-emerald-400/10 text-[#0F5132] dark:text-emerald-400 mb-4">
                    STEP {item.step}
                  </span>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. TRUST, ESCROW & RESIDENT PROTECTION */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#0F291E] text-white p-8 sm:p-12 border border-emerald-800/40 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Resident Safeguards</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Why Students &amp; Residents Book Through Akwaaba Homes
              </h2>
              <p className="text-sm text-emerald-100/80 leading-relaxed max-w-xl">
                Informal agents often demand inspection fees or full rent advances before showing a real room. Akwaaba Homes replaces informal guesswork with documented leases, verified landlord badges, and escrow payment protection.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  href="/properties"
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs transition-colors"
                >
                  Browse Accommodations
                </Link>
                <Link
                  href="/faq"
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition-colors"
                >
                  Read Frequently Asked Questions
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <Lock className="w-5 h-5 text-amber-400 mb-2" />
                <h3 className="text-sm font-bold text-white">Escrow Safeguard</h3>
                <p className="text-xs text-emerald-100/75 mt-1">
                  Your rent payment stays protected in escrow until your physical move-in is confirmed.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-2" />
                <h3 className="text-sm font-bold text-white">KYC Identity Checks</h3>
                <p className="text-xs text-emerald-100/75 mt-1">
                  Landlords and students can complete Ghana Card and Student ID verification for mutual trust.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <FileText className="w-5 h-5 text-amber-400 mb-2" />
                <h3 className="text-sm font-bold text-white">Digital Tenancy PDF</h3>
                <p className="text-xs text-emerald-100/75 mt-1">
                  Every approved booking generates a downloadable tenancy agreement with clear terms.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <HelpCircle className="w-5 h-5 text-emerald-400 mb-2" />
                <h3 className="text-sm font-bold text-white">Dedicated Support</h3>
                <p className="text-xs text-emerald-100/75 mt-1">
                  Report listing discrepancies, maintenance issues, or booking questions directly from your portal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. COMPLETE FOOTER */}
      <footer className="bg-white dark:bg-[#080A0F] border-t border-zinc-200 dark:border-zinc-800/80 pt-14 pb-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-zinc-200 dark:border-zinc-800">
            {/* Brand Column */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  <Image src="/logo.png" alt="Akwaaba Homes" width={28} height={28} className="object-cover" />
                </div>
                <span className="font-bold text-base tracking-tight text-zinc-950 dark:text-white">
                  Akwaaba<span className="text-[#0F5132] dark:text-emerald-400">Homes</span>
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm leading-relaxed">
                Akwaaba Homes — Trusted Homes for Students &amp; Residents. Connecting students, working professionals, and families with verified hostels and residential properties across Ghana.
              </p>
              <p className="text-[11px] font-mono text-zinc-400">
                Accra • Kumasi • Cape Coast • Takoradi • Tamale
              </p>
            </div>

            {/* Explore Links */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white mb-3">
                Explore Homes
              </h3>
              <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li><Link href="/properties" className="hover:text-[#0F5132] dark:hover:text-emerald-400">All Accommodations</Link></li>
                <li><Link href="/properties?type=HOSTEL" className="hover:text-[#0F5132] dark:hover:text-emerald-400">Student Hostels</Link></li>
                <li><Link href="/properties?type=APARTMENT" className="hover:text-[#0F5132] dark:hover:text-emerald-400">Apartments &amp; Studios</Link></li>
                <li><Link href="/dashboard/wishlist" className="hover:text-[#0F5132] dark:hover:text-emerald-400">Saved Properties</Link></li>
                <li><Link href="/dashboard/roommates" className="hover:text-[#0F5132] dark:hover:text-emerald-400">Roommate Matcher</Link></li>
              </ul>
            </div>

            {/* Support & Company */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white mb-3">
                Support &amp; Platform
              </h3>
              <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li><Link href="/about" className="hover:text-[#0F5132] dark:hover:text-emerald-400">About Akwaaba Homes</Link></li>
                <li><Link href="/#how-it-works" className="hover:text-[#0F5132] dark:hover:text-emerald-400">How It Works</Link></li>
                <li><Link href="/faq" className="hover:text-[#0F5132] dark:hover:text-emerald-400">Frequently Asked Questions</Link></li>
                <li><Link href="/help" className="hover:text-[#0F5132] dark:hover:text-emerald-400">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-[#0F5132] dark:hover:text-emerald-400">Contact Support</Link></li>
              </ul>
            </div>

            {/* Legal & Compliance */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white mb-3">
                Legal &amp; Policies
              </h3>
              <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
                <li><Link href="/terms" className="hover:text-[#0F5132] dark:hover:text-emerald-400">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-[#0F5132] dark:hover:text-emerald-400">Privacy Policy</Link></li>
                <li><Link href="/lease-agreement" className="hover:text-[#0F5132] dark:hover:text-emerald-400">Standard Tenancy Framework</Link></li>
                <li><Link href="/dashboard/verification" className="hover:text-[#0F5132] dark:hover:text-emerald-400">KYC Verification Center</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
            <p>© {new Date().getFullYear()} Akwaaba Homes Ghana. All rights reserved.</p>
            <p>Compliant with the Ghana Rent Act, 1963 (Act 220) &amp; Data Protection Act, 2012 (Act 843).</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
