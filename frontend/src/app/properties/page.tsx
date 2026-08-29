'use client';

import { useQuery } from '@tanstack/react-query';
import { Search, MapPin, Filter, Loader2, BedDouble, X, Map as MapIcon, Grid2X2, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import api from '@/lib/axios';
import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';
import Map from '@/components/Map';
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

export default function PropertiesPage() {
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

  const fetchProperties = async () => {
    const params = new URLSearchParams();
    if (searchLocation) params.append('location', searchLocation);
    if (filterType) params.append('type', filterType);
    if (filterTargetAudience) params.append('targetAudience', filterTargetAudience);
    if (filterFurnishing) params.append('furnishing', filterFurnishing);
    if (filterPricePeriod) params.append('pricePeriod', filterPricePeriod);
    if (filterRoomType) params.append('roomType', filterRoomType);
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (amenitySearch) params.append('amenity', amenitySearch);
    params.append('isAvailable', isAvailableOnly.toString());

    const { data } = await api.get(`/properties?${params.toString()}`);
    return data.data as Property[];
  };

  const { data: properties, isLoading, error, refetch } = useQuery({
    queryKey: ['properties', searchLocation, filterType, filterTargetAudience, filterFurnishing, filterPricePeriod, filterRoomType, minPrice, maxPrice, isAvailableOnly, amenitySearch],
    queryFn: fetchProperties,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header & Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Browse Properties</h1>
            <p className="text-[var(--muted-foreground)] mt-1">Find the perfect place that fits your lifestyle.</p>
          </div>
          
          <div className="flex w-full md:w-auto gap-3">
            <form onSubmit={handleSearch} className="relative flex-1 md:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-[var(--muted-foreground)]" />
              </div>
              <input
                type="text"
                placeholder="Search location..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-[var(--border)] rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all shadow-sm"
              />
            </form>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
              >
                <Grid2X2 className="w-4 h-4" />
                Grid
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${viewMode === 'map' ? 'bg-white dark:bg-slate-900 text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
              >
                <MapIcon className="w-4 h-4" />
                Map
              </button>
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-[var(--border)] bg-white dark:bg-slate-900 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm text-sm font-medium"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className={`lg:w-72 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="glass-card rounded-2xl p-6 border border-[var(--border)] shadow-sm sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">Filter Search</h3>
                <button className="lg:hidden p-1 text-[var(--muted-foreground)] hover:bg-slate-100 rounded" onClick={() => setShowFilters(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-semibold mb-2 block">Property Type</label>
                  <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">Any Type</option>
                    <option value="Hostel">Hostel</option>
                    <option value="Apartment">Apartment / Flat</option>
                    <option value="Homestay">Homestay</option>
                    <option value="Studio">Studio Apartment</option>
                    <option value="Residential House">Residential House</option>
                    <option value="Townhouse">Townhouse</option>
                    <option value="Guest House">Guest House / Villa</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Target Tenant</label>
                  <select 
                    value={filterTargetAudience}
                    onChange={(e) => setFilterTargetAudience(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">Any Target Group</option>
                    <option value="Open to All">Open to All</option>
                    <option value="Students & Young Professionals">Students & Young Professionals</option>
                    <option value="Working Professionals">Working Professionals</option>
                    <option value="Families">Families</option>
                    <option value="Short-Term Vacationers">Short-Term Vacationers</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Furnishing Status</label>
                  <select 
                    value={filterFurnishing}
                    onChange={(e) => setFilterFurnishing(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">Any Furnishing</option>
                    <option value="Fully Furnished">Fully Furnished</option>
                    <option value="Semi-Furnished">Semi-Furnished</option>
                    <option value="Unfurnished">Unfurnished</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Rental Period</label>
                  <select 
                    value={filterPricePeriod}
                    onChange={(e) => setFilterPricePeriod(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">Any Period</option>
                    <option value="Academic Year">Academic Year (2 Semesters)</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Annual">Annual (Full Year)</option>
                    <option value="Nightly">Nightly (Short-Stay)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Room Type</label>
                  <select 
                    value={filterRoomType}
                    onChange={(e) => setFilterRoomType(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="">Any Room Type</option>
                    <option value="1 in a room">1 in a room</option>
                    <option value="2 in a room">2 in a room</option>
                    <option value="3 in a room">3 in a room</option>
                    <option value="4 in a room">4 in a room</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Price Range (GHS)</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      placeholder="Min" 
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" 
                    />
                    <span className="text-[var(--muted-foreground)]">-</span>
                    <input 
                      type="number" 
                      placeholder="Max" 
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" 
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block">Must Have Amenity</label>
                  <input 
                    type="text" 
                    placeholder="e.g. WiFi, AC, Desk" 
                    value={amenitySearch}
                    onChange={(e) => setAmenitySearch(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" 
                  />
                </div>

                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isAvailableOnly}
                      onChange={(e) => setIsAvailableOnly(e.target.checked)}
                      className="w-5 h-5 border border-[var(--border)] rounded bg-transparent focus:ring-3 focus:ring-[var(--primary)] accent-[var(--primary)]" 
                    />
                    <span className="text-sm font-semibold">Show Available Only</span>
                  </label>
                </div>

                <button 
                  onClick={() => {
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
                  }}
                  className="w-full py-2 text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)] mb-4" />
                <p className="text-[var(--muted-foreground)]">Loading premium properties...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-600 p-6 rounded-2xl text-center border border-red-100">
                Failed to load properties. Please try again later.
              </div>
            ) : properties?.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl text-center border border-[var(--border)] shadow-sm">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-[var(--muted-foreground)]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">No properties found</h3>
                <p className="text-[var(--muted-foreground)]">Try adjusting your search filters or location.</p>
              </div>
            ) : viewMode === 'map' ? (
              <div className="h-[70vh] rounded-3xl overflow-hidden border border-[var(--border)] shadow-sm z-0 relative">
                <Map mode="multiple" properties={properties as any} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {properties?.map((property) => (
                  <Link href={`/properties/${property.id}`} key={property.id} className="group flex flex-col bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-[var(--border)] shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="h-48 bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
                      {property.images && property.images.length > 0 ? (
                        <img 
                          src={getImageUrl(property.images[0])} 
                          alt={property.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[var(--muted-foreground)]">
                          <BedDouble className="w-12 h-12 opacity-50" />
                        </div>
                      )}
                      <div className={`absolute top-4 left-4 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-[var(--foreground)] shadow-sm ${property.isAvailable ? 'bg-white/90 dark:bg-slate-900/90' : 'bg-red-500/90 text-white'}`}>
                        {property.isAvailable ? 'Available' : 'Booked'}
                      </div>
                      <div className="absolute top-4 right-4 z-10">
                        <WishlistButton propertyId={property.id} />
                      </div>
                    </div>
                    
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-lg font-bold text-[var(--foreground)] line-clamp-1 leading-tight group-hover:text-[var(--primary)] transition-colors">
                          {property.title}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] mb-3">
                        <MapPin className="w-4 h-4 text-[var(--secondary)]" />
                        {property.location}
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{property.type || 'Hostel'}</span>
                        {property.targetAudience && property.targetAudience !== 'Open to All' && (
                          <span className="text-xs font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-md">
                            👥 {property.targetAudience}
                          </span>
                        )}
                        {property.furnishing && (
                          <span className="text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-md">
                            🛋️ {property.furnishing}
                          </span>
                        )}
                        {property.rooms && property.rooms.length > 0 && (
                          <span className="text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-[var(--primary)] px-2 py-1 rounded-md">
                            {property.rooms.length} Room Type{property.rooms.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Availability Meter */}
                      {property.totalCapacity > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-[var(--muted-foreground)]">Availability</span>
                            <span className={`text-xs font-bold ${
                              property.remainingCapacity === 0 ? 'text-red-500' :
                              property.remainingCapacity <= Math.ceil(property.totalCapacity * 0.25) ? 'text-amber-500' :
                              'text-emerald-600'
                            }`}>
                              {property.remainingCapacity === 0 ? 'Fully Booked' : `${property.remainingCapacity} of ${property.totalCapacity} beds available`}
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                property.remainingCapacity === 0 ? 'bg-red-400' :
                                property.remainingCapacity <= Math.ceil(property.totalCapacity * 0.25) ? 'bg-amber-400' :
                                'bg-emerald-400'
                              }`}
                              style={{ width: `${Math.round((property.remainingCapacity / property.totalCapacity) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-auto pt-4 border-t border-[var(--border)] flex items-center justify-between">
                        <div>
                          <span className="text-xs text-[var(--muted-foreground)] font-semibold block mb-0.5">Starting from</span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-extrabold text-[var(--foreground)]">GHS {property.price.toLocaleString()}</span>
                            <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                              {property.pricePeriod === 'Nightly' ? '/ night' :
                               property.pricePeriod === 'Monthly' ? '/ mo' :
                               property.pricePeriod === 'Annual' ? '/ yr' : '/ acad. yr'}
                            </span>
                          </div>
                        </div>
                        <span className="text-[var(--primary)] text-sm font-bold bg-indigo-50 dark:bg-indigo-900/30 px-3.5 py-1.5 rounded-lg group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                          Book Now
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
