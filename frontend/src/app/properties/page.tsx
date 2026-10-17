'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/axios';
import Map from '@/components/Map';
import {
  MapPin,
  Search,
  CheckCircle2,
  SlidersHorizontal,
  ArrowRight,
  Building2,
  Map as MapIcon,
  LayoutGrid,
  X,
  RotateCcw,
  Star,
  ArrowUpDown,
} from 'lucide-react';
import WishlistButton from '@/components/WishlistButton';

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#12151E] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-pulse">
      <div className="h-52 bg-zinc-200 dark:bg-zinc-800" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded w-full mt-4" />
      </div>
    </div>
  );
}

interface RoomTier {
  id: string;
  name: string;
  roomType: string;
  price: number;
  bedsPerRoom: number;
  numberOfRooms: number;
}

interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  price: number;
  type: string;
  targetAudience?: string;
  furnishing?: string;
  pricePeriod?: string;
  cautionDeposit?: number;
  amenities: string[];
  includedUtilities?: string[];
  images: string[];
  isAvailable: boolean;
  totalCapacity?: number;
  remainingCapacity?: number;
  avgRating?: number | null;
  reviewCount?: number;
  rooms?: RoomTier[];
  landlord?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    isVerifiedLandlord?: boolean;
    landlordVerificationStatus?: string;
    reputationScore?: number;
  };
}

function PropertiesCatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize filter states from URL search params
  const [location, setLocation] = useState(() => searchParams.get('location') || '');
  const [minPrice, setMinPrice] = useState(() => searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get('maxPrice') || '');
  const [type, setType] = useState(() => searchParams.get('type') || '');
  const [roomType, setRoomType] = useState(() => searchParams.get('roomType') || '');
  const [targetAudience, setTargetAudience] = useState(() => searchParams.get('targetAudience') || '');
  const [furnishing, setFurnishing] = useState(() => searchParams.get('furnishing') || '');
  const [pricePeriod, setPricePeriod] = useState(() => searchParams.get('pricePeriod') || '');
  const [amenity, setAmenity] = useState(() => searchParams.get('amenity') || '');
  const [onlyAvailable, setOnlyAvailable] = useState(() => searchParams.get('isAvailable') !== 'false');
  const [sort, setSort] = useState(() => searchParams.get('sort') || 'newest');

  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Sync state when URL changes externally (e.g., browser back/forward or Navbar link)
  useEffect(() => {
    setLocation(searchParams.get('location') || '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    setType(searchParams.get('type') || '');
    setRoomType(searchParams.get('roomType') || '');
    setTargetAudience(searchParams.get('targetAudience') || '');
    setFurnishing(searchParams.get('furnishing') || '');
    setPricePeriod(searchParams.get('pricePeriod') || '');
    setAmenity(searchParams.get('amenity') || '');
    setOnlyAvailable(searchParams.get('isAvailable') !== 'false');
    setSort(searchParams.get('sort') || 'newest');
  }, [searchParams]);

  // Helper to push filter changes to URL
  const syncUrlParams = useCallback(
    (overrides: Record<string, string | boolean | undefined> = {}) => {
      const next = {
        location,
        minPrice,
        maxPrice,
        type,
        roomType,
        targetAudience,
        furnishing,
        pricePeriod,
        amenity,
        onlyAvailable,
        sort,
        ...overrides,
      };
      const params = new URLSearchParams();
      if (next.location) params.set('location', String(next.location));
      if (next.minPrice) params.set('minPrice', String(next.minPrice));
      if (next.maxPrice) params.set('maxPrice', String(next.maxPrice));
      if (next.type) params.set('type', String(next.type));
      if (next.roomType) params.set('roomType', String(next.roomType));
      if (next.targetAudience) params.set('targetAudience', String(next.targetAudience));
      if (next.furnishing) params.set('furnishing', String(next.furnishing));
      if (next.pricePeriod) params.set('pricePeriod', String(next.pricePeriod));
      if (next.amenity) params.set('amenity', String(next.amenity));
      if (next.onlyAvailable === false) params.set('isAvailable', 'false');
      if (next.sort && next.sort !== 'newest') params.set('sort', String(next.sort));

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [location, minPrice, maxPrice, type, roomType, targetAudience, furnishing, pricePeriod, amenity, onlyAvailable, sort, pathname, router]
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['properties', location, minPrice, maxPrice, type, roomType, targetAudience, furnishing, pricePeriod, amenity, onlyAvailable, sort],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (location) params.append('location', location);
      if (minPrice) params.append('minPrice', minPrice);
      if (maxPrice) params.append('maxPrice', maxPrice);
      if (type) params.append('type', type);
      if (roomType) params.append('roomType', roomType);
      if (targetAudience) params.append('targetAudience', targetAudience);
      if (furnishing) params.append('furnishing', furnishing);
      if (pricePeriod) params.append('pricePeriod', pricePeriod);
      if (amenity) params.append('amenity', amenity);
      if (onlyAvailable) params.append('isAvailable', 'true');
      else params.append('isAvailable', 'false');
      if (sort) params.append('sort', sort);

      const response = await api.get(`/properties?${params.toString()}`);
      return response.data;
    },
  });

  const properties: Property[] = data?.data || data?.properties || [];

  // Build active filter chips for easy removal
  const activeFilterChips: { key: string; label: string; clear: () => void }[] = [];
  if (location) {
    activeFilterChips.push({
      key: 'location',
      label: `Location: "${location}"`,
      clear: () => {
        setLocation('');
        syncUrlParams({ location: '' });
      },
    });
  }
  if (type) {
    activeFilterChips.push({
      key: 'type',
      label: `Type: ${type.replace(/_/g, ' ')}`,
      clear: () => {
        setType('');
        setRoomType('');
        syncUrlParams({ type: '', roomType: '' });
      },
    });
  }
  if (roomType) {
    activeFilterChips.push({
      key: 'roomType',
      label: `Occupancy: ${roomType.replace(/_/g, ' ')}`,
      clear: () => {
        setRoomType('');
        syncUrlParams({ roomType: '' });
      },
    });
  }
  if (targetAudience) {
    activeFilterChips.push({
      key: 'targetAudience',
      label: `For: ${targetAudience.replace(/_/g, ' ')}`,
      clear: () => {
        setTargetAudience('');
        syncUrlParams({ targetAudience: '' });
      },
    });
  }
  if (furnishing) {
    activeFilterChips.push({
      key: 'furnishing',
      label: `Furnishing: ${furnishing.replace(/_/g, ' ')}`,
      clear: () => {
        setFurnishing('');
        syncUrlParams({ furnishing: '' });
      },
    });
  }
  if (pricePeriod) {
    activeFilterChips.push({
      key: 'pricePeriod',
      label: `Billing: ${pricePeriod.replace(/_/g, ' ')}`,
      clear: () => {
        setPricePeriod('');
        syncUrlParams({ pricePeriod: '' });
      },
    });
  }
  if (minPrice || maxPrice) {
    activeFilterChips.push({
      key: 'price',
      label: `Budget: GH₵ ${minPrice || '0'} – ${maxPrice ? `GH₵ ${maxPrice}` : 'Any'}`,
      clear: () => {
        setMinPrice('');
        setMaxPrice('');
        syncUrlParams({ minPrice: '', maxPrice: '' });
      },
    });
  }
  if (amenity) {
    activeFilterChips.push({
      key: 'amenity',
      label: `Utility: ${amenity}`,
      clear: () => {
        setAmenity('');
        syncUrlParams({ amenity: '' });
      },
    });
  }
  if (!onlyAvailable) {
    activeFilterChips.push({
      key: 'onlyAvailable',
      label: 'Including Unavailable',
      clear: () => {
        setOnlyAvailable(true);
        syncUrlParams({ onlyAvailable: true });
      },
    });
  }

  const resetFilters = () => {
    setLocation('');
    setMinPrice('');
    setMaxPrice('');
    setType('');
    setRoomType('');
    setTargetAudience('');
    setFurnishing('');
    setPricePeriod('');
    setAmenity('');
    setOnlyAvailable(true);
    setSort('newest');
    router.replace(pathname, { scroll: false });
  };

  const quickRegions = [
    { label: 'KNUST Campus', val: 'KNUST' },
    { label: 'UG Legon', val: 'Legon' },
    { label: 'East Legon', val: 'East Legon' },
    { label: 'UCC Cape Coast', val: 'UCC' },
    { label: 'Spintex / Osu', val: 'Spintex' },
    { label: 'Madina / UPSA', val: 'Madina' },
  ];

  const formatPeriod = (period?: string, propType?: string) => {
    if (period === 'PER_MONTH') return '/ month';
    if (period === 'PER_SEMESTER') return '/ semester';
    if (period === 'PER_ACADEMIC_YEAR') return '/ academic yr';
    if (period === 'PER_YEAR') return propType === 'HOSTEL' ? '/ academic yr' : '/ year';
    return propType === 'HOSTEL' ? '/ academic yr' : '/ year';
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0B0D12] text-zinc-900 dark:text-zinc-100 pb-20">
      {/* 1. COMPACT SEARCH HEADER */}
      <div className="bg-white dark:bg-[#12151E] border-b border-zinc-200 dark:border-zinc-800 pt-22 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#0F5132] dark:text-emerald-400 font-semibold mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F5132] dark:bg-emerald-400" />
                <span>Accommodation Directory</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
                Explore Student Hostels &amp; Residential Homes
              </h1>
            </div>

            {/* View Mode Toggle & Mobile Filter Trigger */}
            <div className="flex items-center gap-2.5 self-start md:self-auto">
              <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'map'
                      ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                  }`}
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Map</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-semibold cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFilterChips.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-[#0F5132] text-white text-[10px] flex items-center justify-center font-mono">
                    {activeFilterChips.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Search Bar & Quick Campus/Area Chips */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                syncUrlParams({ location });
              }}
              className="relative flex-1 flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  aria-label="Search by neighbourhood, campus, or hostel name"
                  placeholder="Search by neighbourhood, university campus, or property title..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onBlur={() => syncUrlParams({ location })}
                  className="w-full pl-10 pr-9 py-2.5 bg-[#FAF9F6] dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-[#0F5132] dark:focus:border-emerald-500 transition-colors"
                />
                {location && (
                  <button
                    type="button"
                    aria-label="Clear search query"
                    onClick={() => {
                      setLocation('');
                      syncUrlParams({ location: '' });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            {/* Quick Region Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
              {quickRegions.map((reg) => {
                const isSelected = location.toLowerCase() === reg.val.toLowerCase();
                return (
                  <button
                    key={reg.val}
                    type="button"
                    onClick={() => {
                      const nextLoc = isSelected ? '' : reg.val;
                      setLocation(nextLoc);
                      syncUrlParams({ location: nextLoc });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer ${
                      isSelected
                        ? 'bg-[#0F5132] text-white border-[#0F5132]'
                        : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    {reg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: LEFT FILTER SIDEBAR + RIGHT LISTINGS */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* LEFT FILTER PANEL */}
          <aside
            aria-label="Property Filters"
            className={`
              lg:w-72 shrink-0 bg-white dark:bg-[#12151E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5
              ${isMobileFilterOpen ? 'fixed inset-4 z-50 overflow-y-auto shadow-2xl lg:static lg:shadow-none' : 'hidden lg:block lg:sticky lg:top-22'}
            `}
          >
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-zinc-950 dark:text-white">Filter Properties</h2>
              </div>

              <div className="flex items-center gap-2">
                {activeFilterChips.length > 0 && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
                {isMobileFilterOpen && (
                  <button
                    type="button"
                    aria-label="Close filters"
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="lg:hidden p-1 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-5">
              {/* Availability Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800">
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-white">Available Now</p>
                  <p className="text-[11px] text-zinc-500">Hide fully booked properties</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={onlyAvailable}
                  aria-label="Only show available properties"
                  onClick={() => {
                    const next = !onlyAvailable;
                    setOnlyAvailable(next);
                    syncUrlParams({ onlyAvailable: next });
                  }}
                  className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    onlyAvailable ? 'bg-[#0F5132]' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4.5 h-4.5 rounded-full shadow-xs transform transition-transform ${
                      onlyAvailable ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Property Category */}
              <div>
                <label htmlFor="filter-type" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Property Category
                </label>
                <select
                  id="filter-type"
                  value={type}
                  onChange={(e) => {
                    const val = e.target.value;
                    setType(val);
                    const nextRoom = val !== 'HOSTEL' ? '' : roomType;
                    if (val !== 'HOSTEL') setRoomType('');
                    syncUrlParams({ type: val, roomType: nextRoom });
                  }}
                  className="w-full px-3 py-2 bg-[#FAF9F6] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F5132]"
                >
                  <option value="">All Property Types</option>
                  <option value="HOSTEL">Student Hostel</option>
                  <option value="APARTMENT">Self-Contained Apartment</option>
                  <option value="STUDIO">Studio Unit</option>
                  <option value="CHAMBER_AND_HALL">Chamber &amp; Hall Self-Contain</option>
                  <option value="SINGLE_ROOM">Single Room (Porch / Shared)</option>
                  <option value="HOUSE">Full Residential House</option>
                </select>
              </div>

              {/* Target Resident */}
              <div>
                <label htmlFor="filter-audience" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Resident Profile
                </label>
                <select
                  id="filter-audience"
                  value={targetAudience}
                  onChange={(e) => {
                    setTargetAudience(e.target.value);
                    syncUrlParams({ targetAudience: e.target.value });
                  }}
                  className="w-full px-3 py-2 bg-[#FAF9F6] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F5132]"
                >
                  <option value="">Anyone (All Residents)</option>
                  <option value="STUDENTS">University Students</option>
                  <option value="PROFESSIONALS">Working Professionals</option>
                  <option value="FAMILIES">Families &amp; Couples</option>
                </select>
              </div>

              {/* Room Occupancy (for Hostels / All) */}
              {(type === 'HOSTEL' || type === '') && (
                <div>
                  <label htmlFor="filter-room-type" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                    Hostel Room Occupancy
                  </label>
                  <select
                    id="filter-room-type"
                    value={roomType}
                    onChange={(e) => {
                      setRoomType(e.target.value);
                      syncUrlParams({ roomType: e.target.value });
                    }}
                    className="w-full px-3 py-2 bg-[#FAF9F6] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F5132]"
                  >
                    <option value="">Any Room Configuration</option>
                    <option value="1-in-a-room">1-in-a-Room (Private Executive)</option>
                    <option value="2-in-a-room">2-in-a-Room (Twin Shared)</option>
                    <option value="3-in-a-room">3-in-a-Room (Triple Shared)</option>
                    <option value="4-in-a-room">4-in-a-Room (Quadruple Shared)</option>
                  </select>
                </div>
              )}

              {/* Furnishing Level & Billing Cycle */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="filter-furnishing" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Furnishing
                  </label>
                  <select
                    id="filter-furnishing"
                    value={furnishing}
                    onChange={(e) => {
                      setFurnishing(e.target.value);
                      syncUrlParams({ furnishing: e.target.value });
                    }}
                    className="w-full px-2.5 py-2 bg-[#FAF9F6] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F5132]"
                  >
                    <option value="">Any</option>
                    <option value="FURNISHED">Furnished</option>
                    <option value="SEMI_FURNISHED">Semi-Furnished</option>
                    <option value="UNFURNISHED">Unfurnished</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="filter-billing" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Billing Cycle
                  </label>
                  <select
                    id="filter-billing"
                    value={pricePeriod}
                    onChange={(e) => {
                      setPricePeriod(e.target.value);
                      syncUrlParams({ pricePeriod: e.target.value });
                    }}
                    className="w-full px-2.5 py-2 bg-[#FAF9F6] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F5132]"
                  >
                    <option value="">Any Cycle</option>
                    <option value="PER_ACADEMIC_YEAR">Per Academic Yr</option>
                    <option value="PER_SEMESTER">Per Semester</option>
                    <option value="PER_MONTH">Per Month</option>
                    <option value="PER_YEAR">Per Year</option>
                  </select>
                </div>
              </div>

              {/* Price Range (GH₵) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Budget Range (GH₵)</label>
                  <span className="text-[10px] font-mono text-zinc-400">GHS</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={0}
                    aria-label="Minimum price in Ghana Cedis"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    onBlur={() => syncUrlParams({ minPrice })}
                    className="w-full px-3 py-2 bg-[#FAF9F6] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F5132]"
                  />
                  <input
                    type="number"
                    min={0}
                    aria-label="Maximum price in Ghana Cedis"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    onBlur={() => syncUrlParams({ maxPrice })}
                    className="w-full px-3 py-2 bg-[#FAF9F6] dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F5132]"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { label: '≤ 2,500', min: '', max: '2500' },
                    { label: '2.5k – 5k', min: '2500', max: '5000' },
                    { label: '5k+', min: '5000', max: '' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setMinPrice(preset.min);
                        setMaxPrice(preset.max);
                        syncUrlParams({ minPrice: preset.min, maxPrice: preset.max });
                      }}
                      className="text-[11px] font-mono px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Essential Infrastructure & Utilities */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Essential Utilities &amp; Features
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    'Wi-Fi',
                    'AC',
                    'Backup Generator',
                    'Water Supply',
                    '24/7 Security',
                    'Study Room',
                    'Self-Contained',
                    'Kitchen',
                  ].map((item) => {
                    const isSelected = amenity === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          const nextVal = isSelected ? '' : item;
                          setAmenity(nextVal);
                          syncUrlParams({ amenity: nextVal });
                        }}
                        className={`px-2.5 py-2 rounded-lg text-left text-[11px] font-medium border transition-colors truncate cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 border-[#0F5132] text-[#0F5132] dark:text-emerald-300 font-semibold'
                            : 'bg-[#FAF9F6] dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isMobileFilterOpen && (
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-3 rounded-xl bg-[#0F5132] text-white text-xs font-bold mt-4"
                >
                  Apply Filters ({properties.length} results)
                </button>
              )}
            </div>
          </aside>

          {/* RIGHT LISTINGS AREA */}
          <div className="flex-1 w-full min-w-0">
            {/* Results Count + Sort Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-200/70 dark:border-zinc-800/70">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Showing <span className="font-mono font-bold text-zinc-950 dark:text-white">{properties.length}</span>{' '}
                {properties.length === 1 ? 'accommodation' : 'accommodations'}
                {location ? ` matching "${location}"` : ''}
              </p>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                <label htmlFor="sort-select" className="text-xs font-semibold text-zinc-500">
                  Sort by:
                </label>
                <select
                  id="sort-select"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    syncUrlParams({ sort: e.target.value });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#12151E] border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-[#0F5132] cursor-pointer"
                >
                  <option value="newest">Newest Listed</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>

            {/* Active Filter Chips */}
            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {activeFilterChips.map((chip) => (
                  <span
                    key={chip.key}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/10 dark:bg-emerald-400/10 border border-[#0F5132]/25 dark:border-emerald-400/25 text-xs font-semibold text-[#0F5132] dark:text-emerald-300"
                  >
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      onClick={chip.clear}
                      aria-label={`Remove ${chip.label} filter`}
                      className="hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline ml-1 cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <SkeletonCard key={n} />
                ))}
              </div>
            )}

            {/* Error State */}
            {isError && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-8 text-center">
                <p className="text-sm font-bold text-red-700 dark:text-red-400 mb-1">
                  Unable to load accommodations right now
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/70 mb-4">
                  Please check your network connection and try again.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
                >
                  Retry Search
                </button>
              </div>
            )}

            {/* Map View */}
            {!isLoading && !isError && viewMode === 'map' && (
              <div className="h-[600px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                <Map mode="multiple" properties={properties} />
              </div>
            )}

            {/* Grid View */}
            {!isLoading && !isError && viewMode === 'grid' && (
              <>
                {properties.length === 0 ? (
                  <div className="bg-white dark:bg-[#12151E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
                    <Building2 className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
                      No matching accommodations found
                    </h3>
                    <p className="text-xs text-zinc-500 max-w-md mx-auto mb-5">
                      Try broadening your budget range, clearing a utility filter, or searching a nearby neighbourhood.
                    </p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Reset All Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {properties.map((property) => {
                      const lowestRoomPrice =
                        property.rooms && property.rooms.length > 0
                          ? Math.min(...property.rooms.map((r) => r.price))
                          : property.price;
                      const isVerifiedHost = Boolean(property.landlord?.isVerifiedLandlord);

                      return (
                        <article
                          key={property.id}
                          className="group relative bg-white dark:bg-[#12151E] rounded-2xl overflow-hidden border border-zinc-200/90 dark:border-zinc-800/90 hover:border-[#0F5132]/50 dark:hover:border-emerald-500/50 transition-all duration-200 flex flex-col shadow-2xs hover:shadow-md"
                        >
                          {/* Wishlist Button outside <Link> for valid HTML5 & WCAG AA */}
                          <div className="absolute top-3 right-3 z-20">
                            <WishlistButton propertyId={property.id} />
                          </div>

                          <Link
                            href={`/properties/${property.id}`}
                            className="flex flex-col flex-1 focus-visible:outline-none"
                          >
                            {/* Image Header */}
                            <div className="relative h-52 w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                              {property.images?.[0] ? (
                                <Image
                                  src={property.images[0]}
                                  alt={property.title}
                                  fill
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                  className="object-cover group-hover:scale-103 transition-transform duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
                                  No Image Available
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

                              {/* Top Left Badges */}
                              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pr-12">
                                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-zinc-900/80 text-white backdrop-blur-md">
                                  {property.type.replace(/_/g, ' ')}
                                </span>
                                {isVerifiedHost && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#0F5132]/90 text-white backdrop-blur-md">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                                    Verified Host
                                  </span>
                                )}
                              </div>

                              {/* Bottom Status & Rating Pill */}
                              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                                {property.totalCapacity && property.totalCapacity > 0 ? (
                                  <span
                                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold backdrop-blur-md ${
                                      property.remainingCapacity === 0
                                        ? 'bg-red-950/90 text-red-200'
                                        : 'bg-black/65 text-white'
                                    }`}
                                  >
                                    {property.remainingCapacity === 0
                                      ? 'Sold Out'
                                      : `${property.remainingCapacity} of ${property.totalCapacity} beds left`}
                                  </span>
                                ) : (
                                  <span
                                    className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold backdrop-blur-md ${
                                      property.isAvailable ? 'bg-black/65 text-white' : 'bg-red-950/90 text-red-200'
                                    }`}
                                  >
                                    {property.isAvailable ? 'Available' : 'Booked'}
                                  </span>
                                )}

                                {property.avgRating && (
                                  <span className="inline-flex items-center gap-1 bg-black/65 backdrop-blur-xs px-2 py-0.5 rounded-md text-xs font-bold text-amber-300">
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    {Number(property.avgRating).toFixed(1)}
                                    {property.reviewCount ? (
                                      <span className="text-zinc-300 font-normal">({property.reviewCount})</span>
                                    ) : null}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-5 flex-1 flex flex-col justify-between">
                              <div>
                                <h2 className="text-base font-bold text-zinc-950 dark:text-white group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 transition-colors line-clamp-1 mb-1">
                                  {property.title}
                                </h2>
                                <p className="flex items-center text-zinc-500 dark:text-zinc-400 text-xs mb-3 line-clamp-1">
                                  <MapPin className="w-3.5 h-3.5 mr-1 text-zinc-400 shrink-0" />
                                  {property.location}
                                </p>

                                {/* Room Tiers or Furnishing summary */}
                                {property.rooms && property.rooms.length > 0 ? (
                                  <div className="flex flex-wrap gap-1.5 mb-3">
                                    {property.rooms.slice(0, 3).map((room) => (
                                      <span
                                        key={room.id}
                                        className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300"
                                      >
                                        {room.roomType}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5 mb-3">
                                    {property.furnishing && (
                                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300">
                                        {property.furnishing.replace(/_/g, ' ')}
                                      </span>
                                    )}
                                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300">
                                      {isVerifiedHost ? 'Direct Landlord • KYC Verified' : 'Direct Landlord Listing'}
                                    </span>
                                  </div>
                                )}

                                {/* Amenities preview */}
                                {property.amenities && property.amenities.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mb-4">
                                    {property.amenities.slice(0, 3).map((item, i) => (
                                      <span key={i} className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                        • {item}
                                      </span>
                                    ))}
                                    {property.amenities.length > 3 && (
                                      <span className="text-[11px] text-zinc-400">
                                        +{property.amenities.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Price Footer */}
                              <div className="pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-baseline justify-between">
                                <div>
                                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                                    {property.rooms && property.rooms.length > 0 ? 'Starting from' : 'Rent'}
                                  </span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-mono font-extrabold text-zinc-950 dark:text-white">
                                      GH₵ {Number(lowestRoomPrice || 0).toLocaleString()}
                                    </span>
                                    <span className="text-xs text-zinc-500">
                                      {formatPeriod(property.pricePeriod, property.type)}
                                    </span>
                                  </div>
                                </div>

                                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0F5132] dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                                  <span>View Details</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PropertiesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0B0D12] pt-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <SkeletonCard key={n} />
            ))}
          </div>
        </div>
      }
    >
      <PropertiesCatalogContent />
    </Suspense>
  );
}
