'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Building2 } from 'lucide-react';

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'HOSTEL', label: 'Hostel' },
  { value: 'APARTMENT', label: 'Apartment' },
  { value: 'STUDIO', label: 'Studio' },
  { value: 'HOUSE', label: 'House' },
  { value: 'SINGLE_ROOM', label: 'Single Room' },
];

const BUDGET_OPTIONS = [
  { value: '', label: 'Any Budget' },
  { value: '1000', label: 'GH₵ 1,000' },
  { value: '2000', label: 'GH₵ 2,000' },
  { value: '3000', label: 'GH₵ 3,000' },
  { value: '5000', label: 'GH₵ 5,000' },
  { value: '10000', label: 'GH₵ 10,000+' },
];

export default function HomeSearchForm() {
  const router = useRouter();
  const [searchLocation, setSearchLocation] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchMaxPrice, setSearchMaxPrice] = useState('');

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (searchLocation.trim()) params.set('location', searchLocation.trim());
    if (searchType) params.set('type', searchType);
    if (searchMaxPrice) params.set('maxPrice', searchMaxPrice);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200/60 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-0 overflow-hidden"
    >
      {/* Location */}
      <div className="flex items-center gap-2.5 px-4 py-3 flex-1 min-w-0 border-b sm:border-b-0 sm:border-r border-zinc-100 dark:border-zinc-800">
        <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <label htmlFor="home-search-location" className="block text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">Location</label>
          <input
            id="home-search-location"
            name="location"
            type="text"
            placeholder="e.g. Accra, Kumasi..."
            value={searchLocation}
            onChange={(e) => setSearchLocation(e.target.value)}
            className="w-full text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-500 bg-transparent focus:outline-none"
          />
        </div>
      </div>

      {/* Property Type */}
      <div className="flex items-center gap-2.5 px-4 py-3 flex-1 min-w-0 border-b sm:border-b-0 sm:border-r border-zinc-100 dark:border-zinc-800">
        <Building2 className="w-4 h-4 text-zinc-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <label htmlFor="home-search-type" className="block text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">Property Type</label>
          <select
            id="home-search-type"
            name="type"
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            aria-label="Property Type"
            className="w-full text-xs font-medium text-zinc-900 dark:text-white bg-transparent focus:outline-none cursor-pointer"
          >
            {PROPERTY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Max Budget */}
      <div className="flex items-center gap-2.5 px-4 py-3 flex-1 min-w-0 border-b sm:border-b-0 sm:border-r border-zinc-100 dark:border-zinc-800">
        <span className="text-zinc-500 text-sm shrink-0 font-bold" style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }} aria-hidden="true">₵</span>
        <div className="flex-1 min-w-0">
          <label htmlFor="home-search-budget" className="block text-[10px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-wide">
            Max Budget (GH<span style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>₵</span>)
          </label>
          <select
            id="home-search-budget"
            name="maxPrice"
            style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}
            value={searchMaxPrice}
            onChange={(e) => setSearchMaxPrice(e.target.value)}
            aria-label="Max Budget"
            className="w-full text-xs font-medium text-zinc-900 dark:text-white bg-transparent focus:outline-none cursor-pointer"
          >
            {BUDGET_OPTIONS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Button */}
      <div className="p-2">
        <button
          type="submit"
          className="w-full sm:w-auto h-10 px-6 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
        >
          <Search className="w-4 h-4" />
          <span>Search</span>
        </button>
      </div>
    </form>
  );
}
