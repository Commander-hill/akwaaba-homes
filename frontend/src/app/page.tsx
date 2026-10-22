'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  MapPin,
  Building2,
  Home,
  BedDouble,
  GraduationCap,
  KeyRound,
  ArrowRight,
  SlidersHorizontal,
  X,
  FileText,
  ShieldCheck,
  CalendarCheck,
  Compass,
} from 'lucide-react';
import api from '@/lib/axios';
import PropertyCard, { PropertyCardData } from '@/components/tenant-ui/PropertyCard';
import PublicFooter from '@/components/tenant-ui/PublicFooter';
import {
  Button,
  EmptyState,
  ErrorState,
  PropertyCardSkeleton,
} from '@/components/tenant-ui/primitives';

const ACCOMMODATION_CATEGORIES = [
  {
    id: 'ALL',
    label: 'All Accommodations',
    description: 'Browse all verified listings across Ghana',
    icon: Compass,
  },
  {
    id: 'HOSTEL',
    label: 'Student Hostels',
    description: 'Campus and off-campus student residences',
    icon: GraduationCap,
  },
  {
    id: 'SINGLE_ROOM',
    label: 'Private Rooms',
    description: 'Self-contained and single room units',
    icon: BedDouble,
  },
  {
    id: 'APARTMENT',
    label: 'Apartments',
    description: '1 to 3+ bedroom residential flats',
    icon: Building2,
  },
  {
    id: 'STUDIO',
    label: 'Executive Studios',
    description: 'Compact modern living for professionals',
    icon: KeyRound,
  },
  {
    id: 'HOMESTAY',
    label: 'Homestays & Short Stay',
    description: 'Flexible stays and family compounds',
    icon: Home,
  },
] as const;

const GHANA_LOCATIONS = [
  {
    name: 'Legon & East Legon',
    city: 'Accra',
    query: 'Legon',
    subtitle: 'University of Ghana corridor & residential estates',
  },
  {
    name: 'Ayeduase & Bomso',
    city: 'Kumasi',
    query: 'Kumasi',
    subtitle: 'KNUST campus surroundings & student residences',
  },
  {
    name: 'UCC & Apewosika',
    city: 'Cape Coast',
    query: 'Cape Coast',
    subtitle: 'University of Cape Coast & coastal neighborhoods',
  },
  {
    name: 'Osu, Labone & Cantonments',
    city: 'Accra',
    query: 'Osu',
    subtitle: 'Central apartments, studios & professional rentals',
  },
  {
    name: 'Spintex & Tema Community',
    city: 'Greater Accra',
    query: 'Spintex',
    subtitle: 'Family apartments & commuter residential hubs',
  },
  {
    name: 'Takoradi & Anaji',
    city: 'Western Region',
    query: 'Takoradi',
    subtitle: 'Residential houses, studios & tertiary hostels',
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: '01',
    title: 'Explore available properties',
    description:
      'Search by neighborhood, university corridor, accommodation type, and your budget in Ghanaian Cedis (GH₵).',
    icon: Search,
  },
  {
    step: '02',
    title: 'Review property information & rental terms',
    description:
      'Inspect room unit options, capacity, amenities, house rules, host verification status, and the exact rental duration before committing.',
    icon: FileText,
  },
  {
    step: '03',
    title: 'Submit a booking request or reserve a unit',
    description:
      'Select your preferred room or unit, confirm your move-in details, and submit your reservation directly to the property host.',
    icon: CalendarCheck,
  },
  {
    step: '04',
    title: 'Track your booking & payment status',
    description:
      'Complete payment through our protected checkout once approved, review your digital tenancy agreement, and manage your stay from your account.',
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  const router = useRouter();

  // Search Module State
  const [searchLocation, setSearchLocation] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchMaxPrice, setSearchMaxPrice] = useState('');
  const [searchCapacity, setSearchCapacity] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Featured Category Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const {
    data: propertiesResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['homepage-properties', selectedCategory],
    queryFn: async () => {
      const params: Record<string, string | number> = { limit: 6, sort: 'newest' };
      if (selectedCategory !== 'ALL') {
        params.type = selectedCategory;
      }
      const { data } = await api.get('/properties', { params });
      return data;
    },
  });

  const listings: PropertyCardData[] =
    propertiesResponse?.data || propertiesResponse?.properties || [];

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (searchLocation.trim()) params.set('location', searchLocation.trim());
    if (searchType) params.set('type', searchType);
    if (searchMaxPrice) params.set('maxPrice', searchMaxPrice);
    if (searchCapacity) params.set('capacity', searchCapacity);
    setMobileSearchOpen(false);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F2] dark:bg-[#0D100E] text-[#242925] dark:text-[#F2F2EE]">
      {/* ──────────────────────────────────────────────────────────────────────
       * 7.2 & 7.3 EDITORIAL HERO & SEARCH MODULE
       * ────────────────────────────────────────────────────────────────────── */}
      <section className="relative pt-8 pb-14 sm:pt-14 sm:pb-20 border-b border-[#E7E7DF] dark:border-[#262E2A]">
        <div className="container-akwaaba">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Editorial Column (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] text-xs font-medium text-[#557A67]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#173D32]" />
                <span>Trusted Homes for Students &amp; Residents across Ghana</span>
              </div>

              <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[54px] text-[#242925] dark:text-white leading-[1.08] tracking-tight">
                Find a place that feels like home.
              </h1>

              <p className="text-base sm:text-lg text-[#5E645E] dark:text-[#9EA69F] leading-relaxed max-w-xl">
                Discover hostels, rooms, apartments, and houses that fit your lifestyle and budget—with clear Ghanaian Cedi pricing and direct booking terms.
              </p>

              {/* Desktop Multi-Field Search Bar */}
              <form
                onSubmit={handleSearchSubmit}
                aria-label="Search accommodations"
                className="hidden sm:grid sm:grid-cols-12 gap-2.5 p-2.5 bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] rounded-xl shadow-[0_8px_30px_rgba(23,61,50,0.06)]"
              >
                {/* Location / University */}
                <div className="sm:col-span-4 px-3 py-1.5 border-r border-[#E7E7DF] dark:border-[#262E2A]">
                  <label
                    htmlFor="hero-location"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-[#6F756F]"
                  >
                    Location or Campus
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-[#557A67] shrink-0" aria-hidden="true" />
                    <input
                      id="hero-location"
                      type="text"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      placeholder="Accra, Kumasi, Legon, KNUST..."
                      className="w-full text-xs sm:text-sm font-medium text-[#242925] dark:text-white placeholder:text-[#6F756F]/70 bg-transparent outline-none"
                    />
                  </div>
                </div>

                {/* Accommodation Category */}
                <div className="sm:col-span-3 px-3 py-1.5 border-r border-[#E7E7DF] dark:border-[#262E2A]">
                  <label
                    htmlFor="hero-type"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-[#6F756F]"
                  >
                    Property Type
                  </label>
                  <select
                    id="hero-type"
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    className="w-full mt-1 text-xs sm:text-sm font-medium text-[#242925] dark:text-white bg-transparent outline-none cursor-pointer"
                  >
                    <option value="">All types</option>
                    <option value="HOSTEL">Student Hostel</option>
                    <option value="SINGLE_ROOM">Private Room</option>
                    <option value="APARTMENT">Apartment</option>
                    <option value="STUDIO">Studio</option>
                    <option value="HOMESTAY">Homestay</option>
                  </select>
                </div>

                {/* Max Budget */}
                <div className="sm:col-span-3 px-3 py-1.5">
                  <label
                    htmlFor="hero-budget"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-[#6F756F]"
                  >
                    Max Budget (GH₵)
                  </label>
                  <input
                    id="hero-budget"
                    type="number"
                    min="0"
                    step="100"
                    value={searchMaxPrice}
                    onChange={(e) => setSearchMaxPrice(e.target.value)}
                    placeholder="Any budget"
                    className="w-full mt-1 text-xs sm:text-sm font-medium text-[#242925] dark:text-white placeholder:text-[#6F756F]/70 bg-transparent outline-none"
                  />
                </div>

                {/* Submit CTA */}
                <div className="sm:col-span-2 flex items-center">
                  <button
                    type="submit"
                    className="w-full h-full min-h-[48px] rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Search</span>
                  </button>
                </div>
              </form>

              {/* Mobile Compact Search Trigger (Expands into Focused Search Modal) */}
              <div className="sm:hidden">
                <button
                  type="button"
                  onClick={() => setMobileSearchOpen(true)}
                  className="w-full p-3.5 bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] rounded-xl shadow-xs flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#173D32] text-white flex items-center justify-center shrink-0">
                      <Search className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-bold text-[#242925] dark:text-white block truncate">
                        Search accommodations
                      </span>
                      <span className="text-xs text-[#6F756F] block truncate">
                        City, campus, property type &bull; Budget in GH₵
                      </span>
                    </div>
                  </div>
                  <SlidersHorizontal className="w-4 h-4 text-[#557A67] shrink-0" />
                </button>
              </div>

              {/* Popular Quick Destinations */}
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <span className="text-[#6F756F] font-medium">Popular areas:</span>
                {['Legon', 'Kumasi', 'East Legon', 'Cape Coast', 'Osu', 'Spintex'].map((place) => (
                  <Link
                    key={place}
                    href={`/search?location=${encodeURIComponent(place)}`}
                    className="px-2.5 py-1 rounded-md bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] text-[#242925] dark:text-[#F2F2EE] hover:border-[#173D32] transition-colors font-medium"
                  >
                    {place}
                  </Link>
                ))}
              </div>
            </div>

            {/* Right Architectural Photography Composition (5 cols) */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden border border-[#E7E7DF] dark:border-[#262E2A] bg-white dark:bg-[#141816] p-2 shadow-xs">
                <div className="relative aspect-[4/3] sm:aspect-[5/4] rounded-xl overflow-hidden bg-[#F1EFE8]">
                  <img
                    src="/images/hero_accra_apartment.png"
                    alt="Contemporary residential apartment courtyard in Accra, Ghana"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <p className="text-[11px] uppercase tracking-widest text-white/80 font-semibold">
                      Residential &amp; Campus Living
                    </p>
                    <p className="text-sm sm:text-base font-medium mt-0.5">
                      Clear rental periods, verified host details, and structured booking records.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────
       * 7.4 ACCOMMODATION CATEGORIES
       * ────────────────────────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 border-b border-[#E7E7DF] dark:border-[#262E2A] bg-white dark:bg-[#141816]">
        <div className="container-akwaaba space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#557A67]">
                Browse by Category
              </span>
              <h2 className="font-editorial text-2xl sm:text-3xl text-[#242925] dark:text-white mt-1">
                Accommodation tailored to your stay
              </h2>
            </div>
            <Link
              href="/search"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#173D32] dark:text-emerald-400 hover:underline"
            >
              <span>View full directory</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div
            role="tablist"
            aria-label="Filter featured accommodations by category"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
          >
            {ACCOMMODATION_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#173D32] text-white border-[#173D32] shadow-xs'
                      : 'bg-[#F8F7F2] dark:bg-[#1B211E] text-[#242925] dark:text-[#F2F2EE] border-[#E7E7DF] dark:border-[#262E2A] hover:border-[#557A67]'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-white/15 text-white'
                        : 'bg-white dark:bg-[#141816] text-[#173D32] dark:text-emerald-400 border border-[#E7E7DF] dark:border-[#262E2A]'
                    }`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm font-bold leading-snug">{cat.label}</div>
                    <p
                      className={`text-[11px] mt-1 line-clamp-2 leading-normal ${
                        isSelected ? 'text-white/80' : 'text-[#6F756F] dark:text-[#9EA69F]'
                      }`}
                    >
                      {cat.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────
       * 7.5 FEATURED ACCOMMODATION (Genuine Backend Listings)
       * ────────────────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <div className="container-akwaaba space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#557A67]">
                Featured Listings
              </span>
              <h2 className="font-editorial text-2xl sm:text-3xl text-[#242925] dark:text-white mt-1">
                {selectedCategory === 'ALL'
                  ? 'Available homes & residences'
                  : ACCOMMODATION_CATEGORIES.find((c) => c.id === selectedCategory)?.label ||
                    'Available residences'}
              </h2>
            </div>

            <Link
              href={
                selectedCategory === 'ALL'
                  ? '/search'
                  : `/search?type=${encodeURIComponent(selectedCategory)}`
              }
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#173D32] dark:text-emerald-400 hover:underline"
            >
              <span>Explore all matching listings</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <PropertyCardSkeleton key={n} />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              title="Could not load featured accommodations"
              message="We were unable to retrieve listings from the server. Please try again."
              onRetry={() => refetch()}
            />
          ) : listings.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No listings in this category yet"
              description="There are currently no published properties matching this category filter. Try viewing all accommodations or searching another neighborhood."
              actionLabel="Show all categories"
              onAction={() => setSelectedCategory('ALL')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────
       * 7.6 DISCOVERY BY LOCATION (Genuine Ghanaian Neighborhoods & Campuses)
       * ────────────────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-white dark:bg-[#141816] border-t border-b border-[#E7E7DF] dark:border-[#262E2A]">
        <div className="container-akwaaba space-y-8">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#557A67]">
              Explore by Location
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl text-[#242925] dark:text-white mt-1">
              Neighborhoods &amp; university corridors
            </h2>
            <p className="text-sm text-[#6F756F] dark:text-[#9EA69F] mt-2 leading-relaxed">
              Select a city or campus area to browse available hostels, private rooms, and residential apartments in that locality.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GHANA_LOCATIONS.map((loc) => (
              <Link
                key={loc.name}
                href={`/search?location=${encodeURIComponent(loc.query)}`}
                className="group p-5 rounded-xl bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] hover:border-[#173D32] dark:hover:border-emerald-500 transition-all flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#557A67]">
                    {loc.city}
                  </span>
                  <h3 className="text-base font-bold text-[#242925] dark:text-white group-hover:text-[#173D32] dark:group-hover:text-emerald-400 transition-colors">
                    {loc.name}
                  </h3>
                  <p className="text-xs text-[#6F756F] dark:text-[#9EA69F] leading-relaxed">
                    {loc.subtitle}
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] flex items-center justify-center text-[#173D32] dark:text-emerald-400 group-hover:bg-[#173D32] group-hover:text-white transition-colors shrink-0 mt-1">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────────────
       * 7.7 TRUST AND PROCESS SECTION
       * ────────────────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <div className="container-akwaaba space-y-10">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C77B59]">
              How Akwaaba Homes Works
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl text-[#242925] dark:text-white mt-1">
              A clear, structured way to rent
            </h2>
            <p className="text-sm text-[#6F756F] dark:text-[#9EA69F] mt-2 leading-relaxed">
              Every listing presents upfront pricing, unit availability, and host verification state so you can evaluate accommodation before committing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] rounded-xl p-6 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-[#EDF6F0] dark:bg-emerald-950/40 text-[#173D32] dark:text-emerald-400 flex items-center justify-center">
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <span className="font-editorial text-xl text-[#C77B59]">{item.step}</span>
                  </div>
                  <h3 className="text-base font-bold text-[#242925] dark:text-white leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#6F756F] dark:text-[#9EA69F] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── MOBILE FULL-SCREEN SEARCH MODAL ── */}
      {mobileSearchOpen && (
        <div
          className="sm:hidden fixed inset-0 z-50 bg-[#F8F7F2] dark:bg-[#0D100E] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Search accommodations"
        >
          <div className="h-16 px-4 bg-white dark:bg-[#141816] border-b border-[#E7E7DF] dark:border-[#262E2A] flex items-center justify-between">
            <span className="font-editorial text-lg text-[#242925] dark:text-white">
              Search Accommodations
            </span>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              aria-label="Close search"
              className="p-2 rounded-lg text-[#6F756F] hover:text-[#242925]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex-1 p-5 space-y-5 overflow-y-auto">
            <div>
              <label
                htmlFor="mobile-search-location"
                className="block text-xs font-semibold text-[#242925] dark:text-white mb-1.5"
              >
                Destination, Neighborhood, or University
              </label>
              <input
                id="mobile-search-location"
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder="e.g. Legon, Kumasi, East Legon, UCC"
                className="w-full h-11 px-3.5 rounded-lg bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="mobile-search-type"
                className="block text-xs font-semibold text-[#242925] dark:text-white mb-1.5"
              >
                Accommodation Category
              </label>
              <select
                id="mobile-search-type"
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] text-sm"
              >
                <option value="">All accommodation types</option>
                <option value="HOSTEL">Student Hostel</option>
                <option value="SINGLE_ROOM">Private Room</option>
                <option value="APARTMENT">Apartment</option>
                <option value="STUDIO">Studio</option>
                <option value="HOMESTAY">Homestay</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="mobile-search-budget"
                  className="block text-xs font-semibold text-[#242925] dark:text-white mb-1.5"
                >
                  Max Budget (GH₵)
                </label>
                <input
                  id="mobile-search-budget"
                  type="number"
                  min="0"
                  value={searchMaxPrice}
                  onChange={(e) => setSearchMaxPrice(e.target.value)}
                  placeholder="Any"
                  className="w-full h-11 px-3.5 rounded-lg bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="mobile-search-capacity"
                  className="block text-xs font-semibold text-[#242925] dark:text-white mb-1.5"
                >
                  Occupants
                </label>
                <select
                  id="mobile-search-capacity"
                  value={searchCapacity}
                  onChange={(e) => setSearchCapacity(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] text-sm"
                >
                  <option value="">Any</option>
                  <option value="1">1 Person</option>
                  <option value="2">2 People</option>
                  <option value="3">3+ People</option>
                </select>
              </div>
            </div>

            <div className="pt-4">
              <Button type="submit" fullWidth size="lg" leftIcon={<Search className="w-4 h-4" />}>
                Show Matching Properties
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 7.8 Footer */}
      <PublicFooter />
    </div>
  );
}
