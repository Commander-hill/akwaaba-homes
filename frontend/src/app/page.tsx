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
  GraduationCap, Clock, HelpCircle, PhoneCall
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
  { name: 'KNUST — Kumasi', query: 'Ayeduase', areas: 'Ayeduase, Kotei, Gaza, Bomso' },
  { name: 'UG Legon — Accra', query: 'East Legon', areas: 'East Legon, Okponglo, Haatso' },
  { name: 'UCC — Cape Coast', query: 'Amamoma', areas: 'Amamoma, Apewosika, Kakumdo' },
  { name: 'UPSA / ATU', query: 'Madina', areas: 'Madina, Adabraka, Central Accra' },
  { name: 'UENR / UDS', query: 'Sunyani', areas: 'Sunyani, Tamale, Wa' },
];

export default function Home() {
  const router = useRouter();

  // Search State
  const [searchLocation, setSearchLocation] = useState('');
  const [searchType, setSearchType] = useState('');
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
    if (searchType) params.append('type', searchType);
    if (searchPeriod) params.append('pricePeriod', searchPeriod);
    router.push('/properties?' + params.toString());
  };

  const handleCampusClick = (query: string) => {
    router.push('/properties?location=' + encodeURIComponent(query));
  };

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-slate-50 dark:bg-[#0e0e12] text-slate-900 dark:text-white selection:bg-[#5B4CFF] selection:text-white transition-colors duration-300">
      
      {/* ── HERO SECTION ── */}
      <section className="relative pt-28 pb-20 lg:pt-40 lg:pb-28 z-10 overflow-hidden">
        
        {/* Full screen background image with gradient overlays */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat fixed pointer-events-none"
          style={{ 
            backgroundImage: 'url(/images/sunset-bg.png)',
            filter: 'brightness(0.55) contrast(1.15)' 
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-[#0e0e12]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Trust Badge Pill */}
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-8 font-semibold text-xs sm:text-sm text-white shadow-xl shadow-black/20">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Ghana's Premier Verified Housing Platform for Students &amp; Working Residents
          </div>
          
          {/* Main Hero Heading */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6 text-white drop-shadow-2xl leading-[1.15]">
            Find Your Perfect <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-indigo-300 to-[#7D6EFF]">
              Home &amp; Hostel in Ghana
            </span>
          </h1>
          
          {/* Subheading */}
          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 drop-shadow-md leading-relaxed">
            Secure, verified hostels, apartments, homestays, and family rentals across Ghana. 
            <strong className="text-white"> 100% escrow protected</strong> with zero middleman broker fraud.
          </p>

          {/* Interactive Live Search Box */}
          <div className="max-w-4xl mx-auto bg-black/40 backdrop-blur-xl rounded-3xl p-3 sm:p-4 shadow-2xl border border-white/20">
            <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-left">
              
              {/* Location Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 bg-white/10 dark:bg-white/5 rounded-2xl border border-white/15 focus-within:border-[#5B4CFF] transition-all">
                <MapPin className="text-amber-400 w-5 h-5 shrink-0" />
                <input 
                  type="text" 
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  placeholder="Location (e.g. Ayeduase, East Legon)" 
                  className="w-full bg-transparent border-none outline-none text-white placeholder:text-slate-400 text-xs sm:text-sm font-medium"
                />
              </div>

              {/* Property Type Dropdown */}
              <div className="flex items-center gap-3 px-4 py-3.5 bg-white/10 dark:bg-white/5 rounded-2xl border border-white/15 focus-within:border-[#5B4CFF] transition-all">
                <Building className="text-indigo-400 w-5 h-5 shrink-0" />
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  aria-label="Filter by Property Type"
                  className="w-full bg-transparent border-none outline-none text-white text-xs sm:text-sm font-medium cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
                >
                  <option value="">All Property Types</option>
                  <option value="Hostel">Student Hostel</option>
                  <option value="Apartment">Apartment / Flat</option>
                  <option value="Single Room">Single Room Self-Contain</option>
                  <option value="Homestay">Homestay / Shared</option>
                  <option value="House">Residential House</option>
                </select>
              </div>

              {/* Price Period Dropdown */}
              <div className="flex items-center gap-3 px-4 py-3.5 bg-white/10 dark:bg-white/5 rounded-2xl border border-white/15 focus-within:border-[#5B4CFF] transition-all">
                <Clock className="text-emerald-400 w-5 h-5 shrink-0" />
                <select
                  value={searchPeriod}
                  onChange={(e) => setSearchPeriod(e.target.value)}
                  aria-label="Filter by Rental Billing Period"
                  className="w-full bg-transparent border-none outline-none text-white text-xs sm:text-sm font-medium cursor-pointer [&>option]:bg-slate-900 [&>option]:text-white"
                >
                  <option value="">Any Rental Period</option>
                  <option value="Academic Year">Per Academic Year</option>
                  <option value="Semester">Per Semester</option>
                  <option value="Monthly">Per Month</option>
                  <option value="Nightly">Per Night</option>
                </select>
              </div>

              {/* Submit Search Button */}
              <button 
                type="submit"
                className="bg-gradient-to-r from-[#5B4CFF] to-[#7D6EFF] hover:from-[#4C3DEE] hover:to-[#6B5CEE] text-white px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/30 shrink-0 cursor-pointer active:scale-95"
              >
                <Search className="w-4 h-4" />
                <span>Search Properties</span>
              </button>
            </form>
          </div>

          {/* ── 1-Click Campus Quick Filters (Ghana Universities) ── */}
          <div className="mt-8 pt-6 border-t border-white/10 max-w-4xl mx-auto flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mr-1">
              <GraduationCap className="w-4 h-4 text-amber-300" /> Popular University Hubs:
            </span>
            {POPULAR_CAMPUSES.map((campus) => (
              <button
                key={campus.name}
                onClick={() => handleCampusClick(campus.query)}
                className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold backdrop-blur-md transition-all hover:scale-105 cursor-pointer shadow-sm"
                title={campus.areas}
              >
                📍 {campus.name}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ── LIVE TRUST & SECURITY STATS STRIP ── */}
      <section className="relative z-20 -mt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#16161D] border border-slate-200/80 dark:border-white/10 shadow-2xl shadow-black/10">
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">100% Escrow</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Funds held safe until move-in</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Ghana Card KYC</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Strict identity verification</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Instant MoMo</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">MTN, Telecel, AT &amp; Banks</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Zero Broker Fraud</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Direct landlord linkage</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── LIVE FEATURED PROPERTIES SECTION ── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-xs font-bold uppercase mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Handpicked Accommodations
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Featured Hostels &amp; Rentals
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
              Top-rated, verified listings with transparent rates and student-friendly amenities.
            </p>
          </div>

          <Link
            href="/properties"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-black transition-all shadow-md shrink-0"
          >
            <span>Explore All Properties</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Property Grid */}
        {isPropsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : featuredProperties.length === 0 ? (
          <div className="p-12 rounded-3xl bg-white dark:bg-[#16161D] border border-slate-200 dark:border-white/10 text-center space-y-4 shadow-sm">
            <Building className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Properties Listed Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              New verified hostels and rental apartments are being added daily. Check back soon or list your own property.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProperties.map((property) => (
              <div 
                key={property.id}
                className="group relative rounded-3xl bg-white dark:bg-[#16161D] border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-sm hover:shadow-2xl hover:border-[var(--primary)]/40 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Property Image & Status Badges */}
                  <div className="relative h-56 w-full overflow-hidden bg-slate-900">
                    <img 
                      src={getImageUrl(property.images?.[0]) || '/placeholder-property.jpg'} 
                      alt={property.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
                    
                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                        {property.type}
                      </span>
                      <div className="pointer-events-auto">
                        <WishlistButton propertyId={property.id} />
                      </div>
                    </div>

                    {/* Bottom Image Overlay Info */}
                    <div className="absolute bottom-3 left-3 right-3 text-white flex justify-between items-end">
                      <div>
                        <div className="text-xl font-black text-amber-300">
                          GHS {property.price.toLocaleString()}
                          <span className="text-[11px] font-normal text-slate-200"> / {property.pricePeriod || 'Year'}</span>
                        </div>
                      </div>
                      {property.landlord?.isVerifiedLandlord && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-bold">
                          <ShieldCheck className="w-3 h-3" /> Verified Host
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-1 group-hover:text-[var(--primary)] transition-colors">
                      {property.title}
                    </h3>
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{property.location}</span>
                    </p>

                    {/* Room Type & Amenities Preview */}
                    <div className="flex flex-wrap gap-1.5 pt-2 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {property.rooms?.[0]?.roomType && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                          🛏️ {property.rooms[0].roomType}
                        </span>
                      )}
                      {property.furnishing && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                          🛋️ {property.furnishing}
                        </span>
                      )}
                      {property.targetAudience && (
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          🎯 {property.targetAudience}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-5 pt-0">
                  <Link
                    href={'/properties/' + property.id}
                    className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-[var(--primary)] text-slate-900 hover:text-white dark:bg-slate-800 dark:hover:bg-[var(--primary)] dark:text-white text-xs font-black flex items-center justify-center gap-2 transition-all group-hover:shadow-md cursor-pointer"
                  >
                    <span>View Room Details &amp; Book</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── ROOMMATE MATCHER SPOTLIGHT ── */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="p-8 sm:p-12 rounded-[36px] bg-gradient-to-r from-[#1F0E3D] via-[#35155D] to-[#511849] border border-white/15 text-white shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
          
          {/* Background Glow */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

          <div className="space-y-4 max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-400/20 border border-amber-300/30 text-amber-300 rounded-full text-xs font-bold">
              <Users className="w-3.5 h-3.5" /> Compatibility Algorithm
            </div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Looking for a Roommate to Split Hostel Rent?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Find compatible student peers across Ghanaian universities. Filter and match based on 
              <strong> cleanliness, budget range, sleep schedules (Early Bird vs Night Owl), and study habits</strong>.
            </p>
            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/dashboard/roommates"
                className="px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-black transition-all shadow-lg shadow-amber-400/20 flex items-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4" />
                <span>Find a Roommate Now</span>
              </Link>
              <Link
                href="/properties"
                className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-bold transition-all flex items-center gap-2"
              >
                <span>Browse Shared Rooms</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full lg:w-auto relative z-10 shrink-0">
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center space-y-1">
              <div className="text-2xl font-black text-amber-300">98%</div>
              <div className="text-[11px] text-slate-300 font-medium">Match Accuracy</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center space-y-1">
              <div className="text-2xl font-black text-emerald-400">100%</div>
              <div className="text-[11px] text-slate-300 font-medium">Student Verified</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center space-y-1">
              <div className="text-2xl font-black text-indigo-300">50%</div>
              <div className="text-[11px] text-slate-300 font-medium">Average Rent Savings</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center space-y-1">
              <div className="text-2xl font-black text-rose-300">0</div>
              <div className="text-[11px] text-slate-300 font-medium">Awkward Disputes</div>
            </div>
          </div>

        </div>
      </section>

      {/* ── HOW IT WORKS IN 3 SIMPLE STEPS ── */}
      <section className="py-20 bg-slate-100/70 dark:bg-[#121217] transition-colors border-y border-slate-200/80 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-xs font-bold uppercase">
              <HelpCircle className="w-3.5 h-3.5" /> Seamless Rental Experience
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
              How Akwaaba Homes Works
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              We eliminate rental scams, fake agent fees, and deposit disputes with a secure, 3-step digital journey.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Step 1 */}
            <div className="p-8 rounded-3xl bg-white dark:bg-[#181820] border border-slate-200/80 dark:border-white/10 shadow-sm relative flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl">
                  01
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Browse &amp; Virtual Tour</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Search campus-verified hostels and residential apartments. Inspect authentic photos, student reviews, and transparent price periods with zero agent markups.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-indigo-500">
                ✓ 100% Genuine Landlord Listings
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-8 rounded-3xl bg-white dark:bg-[#181820] border border-slate-200/80 dark:border-white/10 shadow-sm relative flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xl">
                  02
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Reserve &amp; Digital Lease</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Lock in your room via Mobile Money (MTN, Telecel, AT) or Bank card. Your payment is held safely in escrow while both parties sign a cryptographic digital tenancy agreement.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-emerald-500">
                ✓ Escrow-Secured Payments
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-8 rounded-3xl bg-white dark:bg-[#181820] border border-slate-200/80 dark:border-white/10 shadow-sm relative flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xl">
                  03
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Move In &amp; Inspect</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Arrive at the property and meet your assigned Caretaker or Porter for the official room condition inspection checklist. Collect your keys and settle into your new home!
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-amber-500">
                ✓ Digital Checklist &amp; Key Handover
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ── DUAL CTA: FOR LANDLORDS & CARETAKERS ── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Landlord Card */}
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-white to-indigo-50/50 dark:from-[#16161D] dark:to-[#1C182E] border border-slate-200/80 dark:border-indigo-500/20 shadow-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Building className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">For Landlords &amp; Property Owners</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Fill your hostel or residential rooms with verified student tenants. Receive automated rent payouts directly to your MoMo or Bank account, view P&amp;L reports, and delegate porters effortlessly.
              </p>
              <ul className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Automated Paystack / MoMo Payouts</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Porter &amp; Staff Delegation Hub</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> Digital Lease Signatures &amp; Tenant CRM</li>
              </ul>
            </div>

            <div className="pt-4">
              <Link
                href="/dashboard/landlord/new"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-black transition-all shadow-md shadow-indigo-600/25 inline-flex items-center justify-center gap-2"
              >
                <span>List Your Property Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Caretaker Card */}
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-white to-amber-50/50 dark:from-[#16161D] dark:to-[#2A1E14] border border-slate-200/80 dark:border-amber-500/20 shadow-xl space-y-6 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">For Caretakers &amp; Hostel Porters</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Streamline daily compound operations on your smartphone. Handle resident repair tickets, conduct move-in condition checklists, log incoming courier parcels, and clear visitor gate passes.
              </p>
              <ul className="space-y-2 text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> Digital Move-In Room Condition Checklists</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> Maintenance Ticket Scheduling &amp; Proof Photos</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" /> Front Desk Parcel Vault &amp; Gate PIN Clearance</li>
              </ul>
            </div>

            <div className="pt-4">
              <Link
                href="/dashboard/caretaker"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:hover:bg-amber-400 dark:text-slate-950 text-xs sm:text-sm font-black transition-all shadow-md inline-flex items-center justify-center gap-2"
              >
                <span>Open Caretaker Hub</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 bg-slate-950 text-slate-400 pt-16 pb-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Column 1: Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white font-black text-sm">
                  🏠
                </div>
                <span className="font-black text-white text-lg tracking-tight">Akwaaba Homes</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ghana's trusted digital rental and student housing platform. Escrow secured, verified listings, and seamless tenancy management.
              </p>
            </div>

            {/* Column 2: Explore */}
            <div className="space-y-3 text-xs">
              <h4 className="font-black text-white uppercase text-[11px] tracking-wider">Explore Listings</h4>
              <ul className="space-y-2">
                <li><Link href="/properties?type=Hostel" className="hover:text-white transition-colors">University Hostels</Link></li>
                <li><Link href="/properties?type=Apartment" className="hover:text-white transition-colors">Residential Apartments</Link></li>
                <li><Link href="/properties?type=Single+Room" className="hover:text-white transition-colors">Single Room Self-Contain</Link></li>
                <li><Link href="/dashboard/roommates" className="hover:text-white transition-colors">Find a Student Roommate</Link></li>
              </ul>
            </div>

            {/* Column 3: University Hubs */}
            <div className="space-y-3 text-xs">
              <h4 className="font-black text-white uppercase text-[11px] tracking-wider">Campus Clusters</h4>
              <ul className="space-y-2">
                <li><Link href="/properties?location=Ayeduase" className="hover:text-white transition-colors">KNUST (Ayeduase / Kotei)</Link></li>
                <li><Link href="/properties?location=East+Legon" className="hover:text-white transition-colors">UG Legon (East Legon / Haatso)</Link></li>
                <li><Link href="/properties?location=Amamoma" className="hover:text-white transition-colors">UCC (Amamoma / Apewosika)</Link></li>
                <li><Link href="/properties?location=Madina" className="hover:text-white transition-colors">UPSA &amp; ATU Campus</Link></li>
              </ul>
            </div>

            {/* Column 4: Portals & Security */}
            <div className="space-y-3 text-xs">
              <h4 className="font-black text-white uppercase text-[11px] tracking-wider">Portals &amp; Support</h4>
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

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div>
              &copy; {new Date().getFullYear()} Akwaaba Homes Ghana Ltd. All rights reserved.
            </div>
            <div className="flex items-center gap-6 font-medium">
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
