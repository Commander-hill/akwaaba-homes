'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  X,
  RotateCcw,
  Building2,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/axios';
import PropertyCard, {
  PropertyCardData,
  formatPropertyTypeLabel,
} from '@/components/tenant-ui/PropertyCard';
import PublicFooter from '@/components/tenant-ui/PublicFooter';
import {
  Button,
  BreadcrumbNav,
  EmptyState,
  ErrorState,
  PropertyCardSkeleton,
} from '@/components/tenant-ui/primitives';

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'HOSTEL', label: 'Student Hostel' },
  { value: 'SINGLE_ROOM', label: 'Private Room' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'STUDIO', label: 'Studio' },
  { value: 'HOMESTAY', label: 'Homestay' },
];

const AMENITY_OPTIONS = [
  'Wi-Fi',
  'Running Water',
  'Backup Generator',
  'Air Conditioning',
  '24/7 Security',
  'Study Desk',
  'Kitchen',
  'Parking',
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Recently added' },
  { value: 'price_asc', label: 'Lowest price (GH₵)' },
  { value: 'price_desc', label: 'Highest price (GH₵)' },
  { value: 'rating', label: 'Highest rated' },
];

function SearchDiscoveryContent() {
  const router = useRouter();
  const pathname = usePathname() || '/search';
  const searchParams = useSearchParams();

  // Initialize state from URL query params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [capacityFilter, setCapacityFilter] = useState(searchParams.get('capacity') || '');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(() => {
    const raw = searchParams.get('amenities');
    return raw ? raw.split(',').filter(Boolean) : [];
  });
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(Number(searchParams.get('page') || 1));
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Sync local state when browser back/forward changes searchParams
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setLocationFilter(searchParams.get('location') || '');
    setTypeFilter(searchParams.get('type') || '');
    setMinPrice(searchParams.get('minPrice') || '');
    setMaxPrice(searchParams.get('maxPrice') || '');
    setCapacityFilter(searchParams.get('capacity') || '');
    const rawAm = searchParams.get('amenities');
    setSelectedAmenities(rawAm ? rawAm.split(',').filter(Boolean) : []);
    setSortBy(searchParams.get('sort') || 'newest');
    setPage(Number(searchParams.get('page') || 1));
  }, [searchParams]);

  // Persist filter changes in URL
  const updateUrlParams = (overrides: Record<string, string | number | string[] | undefined>) => {
    const next = {
      search: searchQuery,
      location: locationFilter,
      type: typeFilter,
      minPrice,
      maxPrice,
      capacity: capacityFilter,
      amenities: selectedAmenities,
      sort: sortBy,
      page: 1,
      ...overrides,
    };

    const params = new URLSearchParams();
    if (next.search) params.set('search', String(next.search));
    if (next.location) params.set('location', String(next.location));
    if (next.type) params.set('type', String(next.type));
    if (next.minPrice) params.set('minPrice', String(next.minPrice));
    if (next.maxPrice) params.set('maxPrice', String(next.maxPrice));
    if (next.capacity) params.set('capacity', String(next.capacity));
    if (Array.isArray(next.amenities) && next.amenities.length > 0) {
      params.set('amenities', next.amenities.join(','));
    }
    if (next.sort && next.sort !== 'newest') params.set('sort', String(next.sort));
    if (next.page && Number(next.page) > 1) params.set('page', String(next.page));

    const qs = params.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: [
      'properties-search',
      searchQuery,
      locationFilter,
      typeFilter,
      minPrice,
      maxPrice,
      capacityFilter,
      selectedAmenities.join(','),
      sortBy,
      page,
    ],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        limit: 12,
        sort: sortBy,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (locationFilter.trim()) params.location = locationFilter.trim();
      if (typeFilter) params.type = typeFilter;
      if (minPrice) params.minPrice = minPrice;
      if (maxPrice) params.maxPrice = maxPrice;
      if (capacityFilter) params.capacity = capacityFilter;
      if (selectedAmenities.length > 0) params.amenities = selectedAmenities.join(',');

      const res = await api.get('/properties', { params });
      return res.data;
    },
  });

  const listings: PropertyCardData[] = data?.data || data?.properties || [];
  const totalCount: number = data?.pagination?.total ?? listings.length;
  const totalPages: number = data?.pagination?.totalPages ?? 1;

  const toggleAmenity = (amenity: string) => {
    const next = selectedAmenities.includes(amenity)
      ? selectedAmenities.filter((a) => a !== amenity)
      : [...selectedAmenities, amenity];
    setSelectedAmenities(next);
    updateUrlParams({ amenities: next, page: 1 });
  };

  const resetAllFilters = () => {
    setSearchQuery('');
    setLocationFilter('');
    setTypeFilter('');
    setMinPrice('');
    setMaxPrice('');
    setCapacityFilter('');
    setSelectedAmenities([]);
    setSortBy('newest');
    setPage(1);
    router.replace(pathname, { scroll: false });
  };

  // Active filter summary pills
  const activePills: Array<{ key: string; label: string; onRemove: () => void }> = [];
  if (searchQuery) {
    activePills.push({
      key: 'search',
      label: `Keyword: "${searchQuery}"`,
      onRemove: () => {
        setSearchQuery('');
        updateUrlParams({ search: '' });
      },
    });
  }
  if (locationFilter) {
    activePills.push({
      key: 'location',
      label: `Location: ${locationFilter}`,
      onRemove: () => {
        setLocationFilter('');
        updateUrlParams({ location: '' });
      },
    });
  }
  if (typeFilter) {
    activePills.push({
      key: 'type',
      label: `Type: ${formatPropertyTypeLabel(typeFilter)}`,
      onRemove: () => {
        setTypeFilter('');
        updateUrlParams({ type: '' });
      },
    });
  }
  if (minPrice) {
    activePills.push({
      key: 'minPrice',
      label: `Min: GH₵ ${Number(minPrice).toLocaleString()}`,
      onRemove: () => {
        setMinPrice('');
        updateUrlParams({ minPrice: '' });
      },
    });
  }
  if (maxPrice) {
    activePills.push({
      key: 'maxPrice',
      label: `Max: GH₵ ${Number(maxPrice).toLocaleString()}`,
      onRemove: () => {
        setMaxPrice('');
        updateUrlParams({ maxPrice: '' });
      },
    });
  }
  if (capacityFilter) {
    activePills.push({
      key: 'capacity',
      label: `${capacityFilter}+ Occupants`,
      onRemove: () => {
        setCapacityFilter('');
        updateUrlParams({ capacity: '' });
      },
    });
  }
  selectedAmenities.forEach((am) => {
    activePills.push({
      key: `am-${am}`,
      label: am,
      onRemove: () => toggleAmenity(am),
    });
  });

  const renderFilterControls = (prefix: 'desktop' | 'mobile' = 'desktop') => (
    <div className="space-y-6">
      {/* Location Filter */}
      <div className="space-y-1.5">
        <label
          htmlFor={`${prefix}-filter-location`}
          className="block text-xs font-bold text-[#242925] dark:text-white"
        >
          Location or University
        </label>
        <div className="relative flex items-center">
          <MapPin className="w-4 h-4 text-[#557A67] absolute left-3 pointer-events-none" />
          <input
            id={`${prefix}-filter-location`}
            name={`${prefix}-filter-location`}
            type="text"
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              updateUrlParams({ location: e.target.value });
            }}
            placeholder="e.g. Legon, Kumasi, Osu..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] text-xs sm:text-sm text-[#242925] dark:text-white outline-none focus:border-[#173D32]"
          />
        </div>
      </div>

      {/* Accommodation Type */}
      <div className="space-y-2">
        <span className="block text-xs font-bold text-[#242925] dark:text-white">
          Accommodation Type
        </span>
        <div className="space-y-1">
          {PROPERTY_TYPES.map((t) => {
            const active = typeFilter === t.value;
            return (
              <button
                key={t.value || 'ALL'}
                type="button"
                onClick={() => {
                  setTypeFilter(t.value);
                  updateUrlParams({ type: t.value });
                }}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium text-left flex items-center justify-between transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#16A34A] text-white font-semibold shadow-xs'
                    : 'text-[#5E645E] dark:text-[#9EA69F] hover:bg-[#F8F7F2] dark:hover:bg-[#1B211E]'
                }`}
              >
                <span>{t.label}</span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range (GH₵) */}
      <div className="space-y-2 pt-2 border-t border-[#E7E7DF] dark:border-[#262E2A]">
        <span className="block text-xs font-bold text-[#242925] dark:text-white">
          Budget Range (GH₵)
        </span>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor={`${prefix}-filter-min-price`} className="sr-only">
              Minimum Price in GH₵
            </label>
            <input
              id={`${prefix}-filter-min-price`}
              name={`${prefix}-filter-min-price`}
              type="number"
              min="0"
              placeholder="Min GH₵"
              value={minPrice}
              onChange={(e) => {
                setMinPrice(e.target.value);
                updateUrlParams({ minPrice: e.target.value });
              }}
              className="w-full h-10 px-3 rounded-lg bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] text-xs text-[#242925] dark:text-white outline-none focus:border-[#173D32]"
            />
          </div>
          <div>
            <label htmlFor={`${prefix}-filter-max-price`} className="sr-only">
              Maximum Price in GH₵
            </label>
            <input
              id={`${prefix}-filter-max-price`}
              name={`${prefix}-filter-max-price`}
              type="number"
              min="0"
              placeholder="Max GH₵"
              value={maxPrice}
              onChange={(e) => {
                setMaxPrice(e.target.value);
                updateUrlParams({ maxPrice: e.target.value });
              }}
              className="w-full h-10 px-3 rounded-lg bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] text-xs text-[#242925] dark:text-white outline-none focus:border-[#173D32]"
            />
          </div>
        </div>
      </div>

      {/* Occupant Capacity */}
      <div className="space-y-2 pt-2 border-t border-[#E7E7DF] dark:border-[#262E2A]">
        <label
          htmlFor={`${prefix}-filter-capacity`}
          className="block text-xs font-bold text-[#242925] dark:text-white"
        >
          Minimum Capacity
        </label>
        <select
          id={`${prefix}-filter-capacity`}
          name={`${prefix}-filter-capacity`}
          value={capacityFilter}
          onChange={(e) => {
            setCapacityFilter(e.target.value);
            updateUrlParams({ capacity: e.target.value });
          }}
          className="w-full h-10 px-3 rounded-lg bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] text-xs text-[#242925] dark:text-white outline-none focus:border-[#173D32] cursor-pointer"
        >
          <option value="">Any occupancy</option>
          <option value="1">1+ Person</option>
          <option value="2">2+ People</option>
          <option value="3">3+ People</option>
          <option value="4">4+ People</option>
        </select>
      </div>

      {/* Amenities */}
      <div className="space-y-2 pt-2 border-t border-[#E7E7DF] dark:border-[#262E2A]">
        <span className="block text-xs font-bold text-[#242925] dark:text-white">
          Facilities &amp; Amenities
        </span>
        <div className="flex flex-wrap gap-1.5">
          {AMENITY_OPTIONS.map((amenity) => {
            const checked = selectedAmenities.includes(amenity);
            return (
              <button
                key={amenity}
                type="button"
                aria-pressed={checked}
                onClick={() => toggleAmenity(amenity)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  checked
                    ? 'bg-[#16A34A]/10 border-[#16A34A] text-[#16A34A] dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-500 font-semibold'
                    : 'bg-[#F8F7F2] dark:bg-[#1B211E] border-[#E7E7DF] dark:border-[#262E2A] text-[#5E645E] dark:text-[#9EA69F] hover:border-[#557A67]'
                }`}
              >
                {amenity}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset All */}
      {activePills.length > 0 && (
        <div className="pt-3 border-t border-[#E7E7DF] dark:border-[#262E2A]">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={resetAllFilters}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset all filters
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F2] dark:bg-[#0D100E] text-[#242925] dark:text-[#F2F2EE]">
      {/* ── SEARCH HEADER SUMMARY BAR ── */}
      <div className="bg-white dark:bg-[#141816] border-b border-[#E7E7DF] dark:border-[#262E2A]">
        <div className="container-akwaaba py-6 sm:py-8 space-y-4">
          <BreadcrumbNav
            items={[
              { label: 'Home', href: '/' },
              {
                label: locationFilter
                  ? `Accommodations in ${locationFilter}`
                  : typeFilter
                  ? formatPropertyTypeLabel(typeFilter)
                  : 'Search & Discovery',
              },
            ]}
          />

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <h1 className="font-editorial text-2xl sm:text-3xl lg:text-4xl text-[#242925] dark:text-white">
                {locationFilter
                  ? `Accommodations in ${locationFilter}`
                  : typeFilter
                  ? `${formatPropertyTypeLabel(typeFilter)}s in Ghana`
                  : 'Explore Accommodations'}
              </h1>
              <p className="text-xs sm:text-sm text-[#6F756F] dark:text-[#9EA69F] mt-1">
                {isLoading
                  ? 'Searching available properties...'
                  : `${totalCount} ${totalCount === 1 ? 'property' : 'properties'} matching your criteria`}
              </p>
            </div>

            {/* Keyword Search + Sort Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-[#6F756F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <label htmlFor="properties-search-query" className="sr-only">
                  Search property name or keyword
                </label>
                <input
                  id="properties-search-query"
                  name="searchQuery"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    updateUrlParams({ search: e.target.value });
                  }}
                  placeholder="Search property name or keyword..."
                  aria-label="Search by property name or keyword"
                  className="w-full h-10 pl-9 pr-8 rounded-lg bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] text-xs sm:text-sm text-[#242925] dark:text-white outline-none focus:border-[#173D32]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      updateUrlParams({ search: '' });
                    }}
                    aria-label="Clear keyword search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F756F] hover:text-[#242925]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Refresh Action */}
                <Button
                  variant="blue"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />}
                >
                  Refresh
                </Button>

                {/* Mobile Filter Trigger */}
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="lg:hidden h-9 px-3.5 rounded-xl bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] text-xs font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#16A34A]" />
                  <span>Filters</span>
                  {activePills.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-[#16A34A] text-white text-[10px] font-bold">
                      {activePills.length}
                    </span>
                  )}
                </button>

                {/* Sort Select */}
                <div className="relative flex items-center">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#557A67] absolute left-3 pointer-events-none" />
                  <label htmlFor="properties-sort-by" className="sr-only">
                    Sort properties by
                  </label>
                  <select
                    id="properties-sort-by"
                    name="sortBy"
                    aria-label="Sort properties by"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      updateUrlParams({ sort: e.target.value });
                    }}
                    className="h-9 pl-8 pr-3 rounded-xl bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] text-xs font-semibold text-[#242925] dark:text-white outline-none focus:border-[#16A34A] cursor-pointer"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        Sort: {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Active Filter Pills */}
          {activePills.length > 0 && (
            <div className="flex items-center flex-wrap gap-2 pt-2">
              {activePills.map((pill) => (
                <span
                  key={pill.key}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EDF6F0] dark:bg-emerald-950/40 border border-[#C5E2D0] dark:border-emerald-800/60 text-xs font-medium text-[#16A34A] dark:text-emerald-300"
                >
                  <span>{pill.label}</span>
                  <button
                    type="button"
                    onClick={pill.onRemove}
                    aria-label={`Remove ${pill.label} filter`}
                    className="hover:text-[#9E2A2B] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs font-semibold text-[#6F756F] hover:text-[#16A34A] underline ml-1 cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN RESULTS WORKSPACE ── */}
      <div className="container-akwaaba py-8 sm:py-10 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Filter Sidebar (3 cols) */}
          <aside
            aria-label="Search filters"
            className="hidden lg:block lg:col-span-3 bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] rounded-xl p-5 sticky top-22"
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E7E7DF] dark:border-[#262E2A]">
              <h2 className="text-sm font-bold text-[#242925] dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#173D32]" />
                <span>Filter Properties</span>
              </h2>
              {activePills.length > 0 && (
                <span className="text-xs font-semibold text-[#557A67]">
                  {activePills.length} active
                </span>
              )}
            </div>
            {renderFilterControls('desktop')}
          </aside>

          {/* Results Grid (9 cols) */}
          <div className="lg:col-span-9 space-y-8">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <PropertyCardSkeleton key={n} />
                ))}
              </div>
            ) : isError ? (
              <ErrorState
                title="Unable to load search results"
                message="We could not retrieve properties at this moment. Please check your connection and try again."
                onRetry={() => refetch()}
              />
            ) : listings.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No matching accommodations found"
                description="No properties match your current combination of location, budget, and facility filters. Try broadening your location, increasing your maximum GH₵ budget, or clearing active filters."
                actionLabel="Reset all filters"
                onAction={resetAllFilters}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {listings.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>

                {/* Pagination & "See more matches" */}
                {totalPages > 1 && (
                  <div className="pt-8 border-t border-[#E7E7DF] dark:border-[#262E2A] flex flex-col items-center gap-6">
                    {page < totalPages && (
                      <Button
                        variant="blue"
                        size="sm"
                        onClick={() => {
                          const next = Math.min(totalPages, page + 1);
                          setPage(next);
                          updateUrlParams({ page: next });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        See more matches
                      </Button>
                    )}

                    <nav
                      aria-label="Pagination"
                      className="w-full flex items-center justify-between"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => {
                          const prev = Math.max(1, page - 1);
                          setPage(prev);
                          updateUrlParams({ page: prev });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        leftIcon={<ChevronLeft className="w-4 h-4" />}
                      >
                        Previous
                      </Button>
                      <span className="text-xs font-medium text-[#6F756F]">
                        Page <strong className="text-[#242925] dark:text-white">{page}</strong> of{' '}
                        <strong className="text-[#242925] dark:text-white">{totalPages}</strong>
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => {
                          const next = Math.min(totalPages, page + 1);
                          setPage(next);
                          updateUrlParams({ page: next });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                      >
                        Next
                      </Button>
                    </nav>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE FILTER DRAWER ── */}
      {mobileFiltersOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Filter properties"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative w-80 max-w-[90vw] bg-white dark:bg-[#141816] h-full flex flex-col z-10 shadow-2xl">
            <div className="h-16 px-5 border-b border-[#E7E7DF] dark:border-[#262E2A] flex items-center justify-between">
              <span className="font-editorial text-lg text-[#242925] dark:text-white">
                Filter Properties
              </span>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="p-2 rounded-lg text-[#6F756F]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-5 overflow-y-auto">{renderFilterControls('mobile')}</div>
            <div className="p-4 border-t border-[#E7E7DF] dark:border-[#262E2A] bg-[#F8F7F2] dark:bg-[#111513]">
              <Button fullWidth onClick={() => setMobileFiltersOpen(false)}>
                View {totalCount} {totalCount === 1 ? 'Result' : 'Results'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <PublicFooter />
    </div>
  );
}

export default function PropertiesSearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container-akwaaba py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <PropertyCardSkeleton key={n} />
          ))}
        </div>
      }
    >
      <SearchDiscoveryContent />
    </Suspense>
  );
}
