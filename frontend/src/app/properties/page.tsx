'use client';

import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { 
  Search, SlidersHorizontal, MapPin, Filter, Loader2, Map as MapIcon,
  Grid2X2, CheckCircle2, Building, Home, Bed, 
  Zap, Droplets, Wind, Lock, Wifi, Dumbbell, Car, UtensilsCrossed,
  X, ChevronDown, Check, ArrowRight, BedDouble, AlertCircle,
  ChevronLeft, RefreshCw
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';
import Map from '@/components/Map';
import WishlistButton from '@/components/WishlistButton';
import { useDebounce } from '@/hooks/useDebounce';
import { queryKeys } from '@/lib/queryKeys';
import clsx from 'clsx';

interface Property {
  id: string;
  title: string;
  type: string;
  targetAudience?: string;
  furnishing?: string;
  pricePeriod?: string;
  rooms: { roomType: string; numberOfRooms?: number; price?: string }[];
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

interface PropertiesResponse {
  data: Property[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const AMENITY_TAGS = [
  { label: 'Standby Generator', val: 'Generator', icon: Zap },
  { label: '24/7 Water / Polytank', val: 'Water', icon: Droplets },
  { label: 'Air Conditioning', val: 'Air Conditioning', icon: Wind },
  { label: 'Compound Security', val: 'Security', icon: Lock },
  { label: 'Fiber WiFi', val: 'WiFi', icon: Wifi },
  { label: 'Compound Parking', val: 'Parking', icon: Car },
  { label: 'Fitted Kitchen', val: 'Kitchen', icon: UtensilsCrossed }
];

export default function PropertiesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Route guard: Caretakers and on-site staff manage operations and are barred from consumer marketplace
  const { data: session } = useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
    retry: false
  });

  useEffect(() => {
    if (session && (session.role === 'CARETAKER' || session.role === 'STAFF')) {
      router.replace('/dashboard/caretaker');
    }
  }, [session, router]);

  const [searchLocation, setSearchLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  
  // Filter States
  const [filterType, setFilterType] = useState('');
  const [filterTargetAudience, setFilterTargetAudience] = useState('');
  const [filterFurnishing, setFilterFurnishing] = useState('');
  const [filterPricePeriod, setFilterPricePeriod] = useState('');
  const [filterRoomType, setFilterRoomType] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [isAvailableOnly, setIsAvailableOnly] = useState(true);
  const [amenitySearch, setAmenitySearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;

  // Search Debouncing: Delays queries by 350ms to prevent server thrashing on rapid keystrokes
  const debouncedLocation = useDebounce(searchLocation, 350);
  const debouncedAmenity = useDebounce(amenitySearch, 350);

  // Reset pagination to page 1 whenever any filter or search term changes
  useEffect(() => {
    setPage(1);
  }, [debouncedLocation, debouncedAmenity, filterType, filterTargetAudience, filterFurnishing, filterPricePeriod, filterRoomType, minPrice, maxPrice, isAvailableOnly]);

  const fetchProperties = async (): Promise<PropertiesResponse> => {
    const params = new URLSearchParams();
    if (debouncedLocation) params.append('location', debouncedLocation);
    if (filterType) params.append('type', filterType);
    if (filterTargetAudience) params.append('targetAudience', filterTargetAudience);
    if (filterFurnishing) params.append('furnishing', filterFurnishing);
    if (filterPricePeriod) params.append('pricePeriod', filterPricePeriod);
    if (filterRoomType) params.append('roomType', filterRoomType);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (debouncedAmenity) params.append('amenity', debouncedAmenity);
    params.append('isAvailable', isAvailableOnly.toString());
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const { data } = await api.get(`/properties?${params.toString()}`);
    return {
      data: data.data || [],
      pagination: data.pagination || {
        total: (data.data || []).length,
        page,
        limit,
        totalPages: Math.ceil(((data.data || []).length) / limit) || 1
      }
    };
  };

  const { data: propertiesResponse, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.properties.list({
      location: debouncedLocation,
      type: filterType,
      targetAudience: filterTargetAudience,
      furnishing: filterFurnishing,
      pricePeriod: filterPricePeriod,
      roomType: filterRoomType,
      minPrice,
      maxPrice,
      isAvailable: isAvailableOnly,
      amenity: debouncedAmenity,
      page,
      limit
    }),
    queryFn: fetchProperties,
    placeholderData: keepPreviousData, // Smooth pagination: Keep current page data while next page loads
    staleTime: 60 * 1000, // 1 minute fresh cache
  });

  const properties = propertiesResponse?.data || [];
  const pagination = propertiesResponse?.pagination || { total: 0, page: 1, limit, totalPages: 1 };

  // Query Prefetching: Prefetches property detail into TanStack Query cache on hover or touch
  const prefetchPropertyDetail = (propertyId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.properties.detail(propertyId),
      queryFn: async () => {
        const res = await api.get(`/properties/${propertyId}`);
        return res.data.property;
      },
      staleTime: 5 * 60 * 1000, // Keep in memory for 5 minutes
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterType) count++;
    if (filterTargetAudience) count++;
    if (filterFurnishing) count++;
    if (filterPricePeriod) count++;
    if (filterRoomType) count++;
    if (minPrice || maxPrice) count++;
    if (amenitySearch) count++;
    return count;
  }, [filterType, filterTargetAudience, filterFurnishing, filterPricePeriod, filterRoomType, minPrice, maxPrice, amenitySearch]);

  const clearAllFilters = () => {
    setFilterType('');
    setFilterTargetAudience('');
    setFilterFurnishing('');
    setFilterPricePeriod('');
    setFilterRoomType('');
    setMinPrice('');
    setMaxPrice('');
    setSearchLocation('');
    setAmenitySearch('');
    setIsAvailableOnly(true);
  };

  if (session && (session.role === 'CARETAKER' || session.role === 'STAFF')) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        <p className="text-xs font-bold text-zinc-500">Redirecting to Caretaker Operations Hub...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFC] dark:bg-[#0B0D12] py-8 relative overflow-hidden text-zinc-900 dark:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* ── HEADER & SEARCH COMMAND BAR ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
              Verified Properties &amp; Rental Directory
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Verified homes, apartments, executive studios, and residential tenancies across Ghana. Zero roadside agent commissions.
            </p>
          </div>
          
          <div className="flex flex-wrap w-full md:w-auto items-center gap-2">
            <form onSubmit={handleSearch} className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search town, neighborhood..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-[#0F5132] outline-none transition-all shadow-xs"
              />
            </form>

            <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/80 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer",
                  viewMode === 'grid' ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <Grid2X2 className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-lg transition-colors cursor-pointer",
                  viewMode === 'map' ? "bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-xs" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Map</span>
              </button>
            </div>

            <button 
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                "flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer",
                showFilters || activeFiltersCount > 0
                  ? "bg-[#0F5132] text-white border-emerald-700"
                  : "bg-white dark:bg-[#12151D] text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-[#0F5132] text-[10px] flex items-center justify-center font-black">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── QUICK HORIZONTAL CATEGORY BAR ── */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {[
            { label: 'All Rentals', val: '' },
            { label: 'Apartments & Flats', val: 'Apartment' },
            { label: 'Executive Studios', val: 'Studio' },
            { label: 'Residential Houses', val: 'Residential House' },
            { label: 'Student Hostels', val: 'Hostel' },
            { label: 'Homestays', val: 'Homestay' },
          ].map((cat) => (
            <button
              key={cat.label}
              type="button"
              onClick={() => setFilterType(filterType === cat.val ? '' : cat.val)}
              className={clsx(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border",
                filterType === cat.val
                  ? "bg-[#0F5132] text-white border-emerald-700 shadow-xs"
                  : "bg-white dark:bg-[#12151D] text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* ── EXPANDABLE FILTER DRAWER / SIDEBAR ── */}
          {showFilters && (
            <div className="w-full lg:w-72 shrink-0 bg-white dark:bg-[#12151D] rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4 animate-in">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <span className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">Refine Search</span>
                {activeFiltersCount > 0 && (
                  <button onClick={clearAllFilters} className="text-[11px] text-[#0F5132] font-bold hover:underline cursor-pointer">
                    Reset ({activeFiltersCount})
                  </button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Target Resident</label>
                  <select 
                    value={filterTargetAudience}
                    onChange={(e) => setFilterTargetAudience(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 font-medium outline-none focus:border-[#0F5132] cursor-pointer"
                  >
                    <option value="">Any Resident Group</option>
                    <option value="Open to All">Open to All</option>
                    <option value="Working Professionals">Working Professionals</option>
                    <option value="Families">Families</option>
                    <option value="Students Only">Students Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Furnishing</label>
                  <select 
                    value={filterFurnishing}
                    onChange={(e) => setFilterFurnishing(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 font-medium outline-none focus:border-[#0F5132] cursor-pointer"
                  >
                    <option value="">Any Furnishing</option>
                    <option value="Fully Furnished">Fully Furnished</option>
                    <option value="Semi-Furnished">Semi-Furnished</option>
                    <option value="Unfurnished">Unfurnished</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Tenancy Billing Cadence</label>
                  <select 
                    value={filterPricePeriod}
                    onChange={(e) => setFilterPricePeriod(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 font-medium outline-none focus:border-[#0F5132] cursor-pointer"
                  >
                    <option value="">Any Cadence</option>
                    <option value="Annual">Annual (1 Year Rent)</option>
                    <option value="Academic Year">Academic Year (2 Semesters)</option>
                    <option value="Monthly">Monthly Rent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Price Range (GH₵)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="number" 
                      placeholder="Min (GH₵)" 
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs font-medium outline-none focus:border-[#0F5132]" 
                    />
                    <input 
                      type="number" 
                      placeholder="Max (GH₵)" 
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs font-medium outline-none focus:border-[#0F5132]" 
                    />
                  </div>
                </div>

                {/* Amenity Badges */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Essential Amenities</label>
                  <div className="flex flex-wrap gap-1.5">
                    {AMENITY_TAGS.map((chip) => {
                      const active = amenitySearch === chip.val;
                      const IconComp = chip.icon;
                      return (
                        <button
                          key={chip.val}
                          type="button"
                          onClick={() => setAmenitySearch(active ? '' : chip.val)}
                          className={clsx(
                            "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer",
                            active
                              ? "bg-[#0F5132] text-white border-emerald-700 shadow-xs"
                              : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400"
                          )}
                        >
                          <IconComp className="w-3 h-3" />
                          <span>{chip.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    <input 
                      type="checkbox" 
                      checked={isAvailableOnly}
                      onChange={(e) => setIsAvailableOnly(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0F5132] focus:ring-0 accent-[#0F5132]" 
                    />
                    <span>Vacant &amp; Available Only</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ── PROPERTIES GRID / MAP ── */}
          <div className="flex-1 w-full space-y-4">
            {/* Live Count & Background Revalidation Indicator */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {pagination.total} {pagination.total === 1 ? 'Property' : 'Properties'} Available
                </span>
                {isFetching && !isLoading && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#0F5132] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 animate-pulse">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Updating...
                  </span>
                )}
              </div>
              {pagination.totalPages > 1 && (
                <span className="text-xs text-zinc-400 font-medium">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
              )}
            </div>

            {isLoading ? (
              /* Loading State: Responsive Skeleton Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col bg-white dark:bg-[#12151D] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-pulse">
                    <div className="h-48 bg-zinc-200 dark:bg-zinc-800" />
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-3/4" />
                        <div className="h-3 bg-zinc-100 dark:bg-zinc-800/60 rounded-md w-1/2" />
                      </div>
                      <div className="flex gap-1.5">
                        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-16" />
                        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-20" />
                      </div>
                      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-md w-24" />
                        <div className="h-7 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-20" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              /* Error Boundary & Retry Fallback */
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs p-8 rounded-2xl text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm">Failed to Load Properties</h4>
                <p className="max-w-md mx-auto text-zinc-600 dark:text-zinc-400">
                  An unexpected network error occurred while querying verified listings.
                </p>
                <button 
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Try Again
                </button>
              </div>
            ) : properties?.length === 0 ? (
              <div className="bg-white dark:bg-[#12151D] p-12 rounded-2xl text-center border border-zinc-200 dark:border-zinc-800 space-y-3 shadow-xs">
                <Building className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto" />
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white">No Properties Found</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  No verified listings matched your selected filters. Try widening your price range or clearing filters.
                </p>
                <button 
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            ) : viewMode === 'map' ? (
              <div className="h-[72vh] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xs z-0 relative">
                <Map mode="multiple" properties={properties as any} />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {properties?.map((property) => {
                    const isHostel = property.type === 'Hostel';
                    const roomsCount = property.rooms?.length || 1;

                    return (
                      <Link 
                        href={`/properties/${property.id}`} 
                        key={property.id} 
                        onMouseEnter={() => prefetchPropertyDetail(property.id)}
                        onTouchStart={() => prefetchPropertyDetail(property.id)}
                        onFocus={() => prefetchPropertyDetail(property.id)}
                        className="group flex flex-col bg-white dark:bg-[#12151D] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs hover:shadow-md transition-all duration-200"
                      >
                        {/* Photo Banner with Badges */}
                        <div className="h-48 bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                          {property.images && property.images.length > 0 ? (
                            <img 
                              src={getImageUrl(property.images[0])} 
                              alt={property.title} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-400">
                              <BedDouble className="w-10 h-10 opacity-40" />
                            </div>
                          )}
                          
                          {/* Status Pills */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                            <span className={clsx(
                              "px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border shadow-xs flex items-center gap-1",
                              property.isAvailable 
                                ? "bg-[#0F5132]/90 text-white border-emerald-500/40" 
                                : "bg-rose-600/90 text-white border-rose-400/40"
                            )}>
                              {property.isAvailable ? (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                                  <span>Vacant</span>
                                </>
                              ) : (
                                <span>Leased</span>
                              )}
                            </span>

                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20">
                              {property.type || 'Residential'}
                            </span>
                          </div>

                          <div className="absolute top-3 right-3 z-10">
                            <WishlistButton propertyId={property.id} />
                          </div>
                        </div>
                        
                        {/* Card Body */}
                        <div className="p-4 flex flex-col flex-1 space-y-3">
                          <div>
                            <h3 className="font-bold text-sm text-zinc-950 dark:text-white line-clamp-1 group-hover:text-[#0F5132] transition-colors">
                              {property.title}
                            </h3>
                            <div className="flex items-center text-zinc-500 text-xs mt-1 truncate">
                              <MapPin className="w-3.5 h-3.5 mr-1 shrink-0 text-zinc-400" />
                              <span className="truncate">{property.location}</span>
                            </div>
                          </div>

                          {/* Cohesive Spec Pills */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {property.furnishing && (
                              <span className="text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80">
                                {property.furnishing}
                              </span>
                            )}

                            {property.targetAudience && property.targetAudience !== 'Open to All' && (
                              <span className="text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80">
                                {property.targetAudience}
                              </span>
                            )}

                            <span className="text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700/80">
                              {roomsCount} {isHostel ? `Room Type${roomsCount > 1 ? 's' : ''}` : `Unit Option${roomsCount > 1 ? 's' : ''}`}
                            </span>
                          </div>

                          {/* Context-Aware Occupancy Strip */}
                          {isHostel && property.totalCapacity > 0 ? (
                            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-2 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-[11px] flex items-center justify-between">
                              <span className="font-semibold text-zinc-600 dark:text-zinc-400">Hostel Bed Availability</span>
                              <span className="font-bold text-[#0F5132] dark:text-emerald-400">
                                {property.remainingCapacity} of {property.totalCapacity} beds vacant
                              </span>
                            </div>
                          ) : (
                            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 text-[11px] flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="font-medium truncate">Direct Landlord • Verified</span>
                            </div>
                          )}
                          
                          {/* Price & Primary Action */}
                          <div className="mt-auto pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                                Rental Rate
                              </span>
                              <div className="font-black text-sm text-zinc-950 dark:text-white">
                                GH₵ {property.price.toLocaleString()}{' '}
                                <span className="text-[10px] font-medium text-zinc-500">
                                  {property.pricePeriod === 'Nightly' ? '/ night' :
                                   property.pricePeriod === 'Monthly' ? '/ mo' :
                                   property.pricePeriod === 'Annual' ? '/ yr' : '/ acad. yr'}
                                </span>
                              </div>
                            </div>

                            <div className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#0F5132] group-hover:bg-[#0A3D24] px-3.5 py-1.5 rounded-xl shadow-xs transition-colors">
                              <span>Explore</span>
                              <ArrowRight className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* ── PAGINATION CONTROLS ── */}
                {pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500">
                      Showing <span className="font-bold text-zinc-900 dark:text-white">{(page - 1) * limit + 1}</span> to{' '}
                      <span className="font-bold text-zinc-900 dark:text-white">{Math.min(page * limit, pagination.total)}</span> of{' '}
                      <span className="font-bold text-zinc-900 dark:text-white">{pagination.total}</span> listings
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setPage((p) => Math.max(p - 1, 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        disabled={page <= 1}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: pagination.totalPages }, (_, idx) => idx + 1).map((pageNum) => {
                          // Only display nearby page pills to prevent overflow
                          if (
                            pageNum === 1 || 
                            pageNum === pagination.totalPages || 
                            Math.abs(pageNum - page) <= 1
                          ) {
                            const isCurrent = pageNum === page;
                            return (
                              <button
                                key={pageNum}
                                onClick={() => {
                                  setPage(pageNum);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={clsx(
                                  "w-8 h-8 rounded-xl text-xs font-bold transition-all",
                                  isCurrent
                                    ? "bg-[#0F5132] text-white shadow-xs"
                                    : "bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300"
                                )}
                              >
                                {pageNum}
                              </button>
                            );
                          } else if (
                            pageNum === page - 2 || 
                            pageNum === page + 2
                          ) {
                            return <span key={pageNum} className="text-zinc-400 text-xs px-1">...</span>;
                          }
                          return null;
                        })}
                      </div>

                      <button
                        onClick={() => {
                          setPage((p) => Math.min(p + 1, pagination.totalPages));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        disabled={page >= pagination.totalPages}
                        className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] text-zinc-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
                      >
                        Next <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
