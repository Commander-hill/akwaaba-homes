'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CardGridSkeleton, useInitialSkeleton } from '@/components/ui/PageSkeletons';
import {
  Home,
  CalendarCheck,
  Wallet,
  TrendingUp,
  Search,
  LayoutGrid,
  Check,
  Heart,
  Camera,
  MapPin,
  Star,
  Bed,
  Bath,
  Maximize2,
  Eye,
  Edit2,
  MoreHorizontal,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

function RollingWaves({ color, darkColor }: { color: string; darkColor: string }) {
  return (
    <svg
      className="absolute bottom-0 left-0 right-0 w-full h-8 pointer-events-none"
      viewBox="0 0 320 40"
      preserveAspectRatio="none"
    >
      <path
        d="M0,26 C40,12 80,32 120,18 C160,8 200,28 240,16 C270,6 295,22 320,18 L320,40 L0,40 Z"
        fill={color}
        fillOpacity="0.55"
      />
      <path
        d="M0,32 C45,20 90,36 140,24 C190,14 235,32 275,22 C295,16 310,24 320,22 L320,40 L0,40 Z"
        fill={darkColor}
        fillOpacity="0.5"
      />
    </svg>
  );
}

interface PropertyItem {
  id: string;
  title: string;
  location: string;
  price: string;
  period: string;
  rating: number;
  reviews: number;
  rooms: string;
  baths: string;
  area: string;
  status: 'Active' | 'Pending' | 'Under Review';
  photosCount: number;
  image: string;
}

const propertiesData: PropertyItem[] = [
  {
    id: 'kimo-apt',
    title: 'KIMO APARTMENT',
    location: 'Burma Camp, Accra',
    price: 'GH₵ 2,000',
    period: '/ month',
    rating: 4.8,
    reviews: 24,
    rooms: '1 Room',
    baths: '1 Bath',
    area: '50 m²',
    status: 'Active',
    photosCount: 5,
    image: '/images/resident/prop-kimo.jpg',
  },
  {
    id: 'ssnit-apt',
    title: 'SSNIT RESIDENTIAL APARTMENTS',
    location: 'Koforidua',
    price: 'GH₵ 4,500',
    period: '/ month',
    rating: 4.7,
    reviews: 18,
    rooms: '2 Rooms',
    baths: '2 Baths',
    area: '80 m²',
    status: 'Active',
    photosCount: 5,
    image: '/images/resident/prop-premium-studio.jpg',
  },
  {
    id: 'glacier-studio',
    title: 'GLACIER STUDIO',
    location: 'Achimota, Accra',
    price: 'GH₵ 20,000',
    period: '/ month',
    rating: 4.9,
    reviews: 32,
    rooms: '1 Room',
    baths: '1 Bath',
    area: '40 m²',
    status: 'Active',
    photosCount: 5,
    image: '/images/resident/residence-glacier-main.jpg',
  },
];

export default function LandlordPropertiesPage() {
  const showSkeleton = useInitialSkeleton();
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'Active' | 'Pending' | 'Under Review'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredProperties = useMemo(() => {
    return propertiesData.filter((prop) => {
      const matchesFilter = activeFilter === 'ALL' || prop.status === activeFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        prop.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prop.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, searchQuery]);
  if (showSkeleton) return <CardGridSkeleton />;

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden min-h-[220px] md:h-[235px] flex items-center shadow-xs bg-[#EBF5FB] border border-[#D5EBF9]">
        {/* Panoramic apartment background on right */}
        <div
          className="absolute inset-y-0 right-0 w-full md:w-[62%] bg-cover bg-center"
          style={{ backgroundImage: "url('/images/resident/landlord-properties-hero-bldg.jpg')" }}
        >
          {/* Seamless left edge blend */}
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#EBF5FB] to-transparent" />
        </div>

        {/* Content inside Hero */}
        <div className="relative z-10 px-6 sm:px-10 py-7 max-w-xl text-zinc-900 space-y-1.5">
          <p className="text-xs font-black tracking-wider text-[#14A248] uppercase">
            LANDLORD PORTAL
          </p>
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#133E2B] tracking-tight">
              My Properties
            </h1>
            {/* Green curved brush stroke under heading */}
            <div className="w-16 h-1 rounded-full bg-[#14A248] mt-1" />
          </div>
          <p className="text-xs sm:text-sm text-zinc-700 font-medium leading-relaxed max-w-md pt-1">
            Manage your listings, track performance and grow your rental business.
          </p>
        </div>
      </div>

      {/* 4 Stat / KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Properties */}
        <div className="relative rounded-2xl p-5 overflow-hidden bg-[#EDF9F0] border border-[#DCF5E3] shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between min-h-[115px]">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#D2F5DC] text-[#14A248] flex items-center justify-center shrink-0">
              <Home className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-3xl font-extrabold text-zinc-900 leading-none">
                3
              </span>
              <span className="block text-xs font-semibold text-zinc-500 mt-1.5 truncate">
                Total Properties
              </span>
            </div>
            <span className="text-xs font-bold text-[#14A248] flex items-center gap-0.5 mt-0.5">
              ↑ +1
            </span>
          </div>
          <RollingWaves color="#A7F3D0" darkColor="#4ADE80" />
        </div>

        {/* Card 2: Total Bookings */}
        <div className="relative rounded-2xl p-5 overflow-hidden bg-[#EAF3FD] border border-[#D6E8FD] shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between min-h-[115px]">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#D6E8FD] text-[#2563EB] flex items-center justify-center shrink-0">
              <CalendarCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-3xl font-extrabold text-zinc-900 leading-none">
                3
              </span>
              <span className="block text-xs font-semibold text-zinc-500 mt-1.5 truncate">
                Total Bookings
              </span>
            </div>
            <span className="text-xs font-bold text-[#2563EB] flex items-center gap-0.5 mt-0.5">
              ↑ +1
            </span>
          </div>
          <RollingWaves color="#BFDBFE" darkColor="#60A5FA" />
        </div>

        {/* Card 3: Pending Payments */}
        <div className="relative rounded-2xl p-5 overflow-hidden bg-[#FEF7EB] border border-[#FDECCD] shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between min-h-[115px]">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#FDECCD] text-[#D97706] flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-2xl sm:text-3xl font-extrabold text-zinc-900 leading-none">
                GH₵ 0.00
              </span>
              <span className="block text-xs font-semibold text-zinc-500 mt-1.5 truncate">
                Pending Payments
              </span>
            </div>
          </div>
          <RollingWaves color="#FDE68A" darkColor="#FBBF24" />
        </div>

        {/* Card 4: Occupancy Rate */}
        <div className="relative rounded-2xl p-5 overflow-hidden bg-[#F3EEFD] border border-[#E6DBFC] shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between min-h-[115px]">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#E6DBFC] text-[#7C3AED] flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div className="flex-1 ml-4 min-w-0">
              <span className="block text-3xl font-extrabold text-zinc-900 leading-none">
                92%
              </span>
              <span className="block text-xs font-semibold text-zinc-500 mt-1.5 truncate">
                Occupancy Rate
              </span>
            </div>
            <span className="text-xs font-bold text-[#7C3AED] flex items-center gap-0.5 mt-0.5">
              ↑ +5%
            </span>
          </div>
          <RollingWaves color="#DDD6FE" darkColor="#A78BFA" />
        </div>
      </div>

      {/* Filter Tabs, Search Bar, and Add Property Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        {/* Left Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* All Properties Tab */}
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
              activeFilter === 'ALL'
                ? 'bg-[#14A248] text-white'
                : 'bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>All Properties</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeFilter === 'ALL' ? 'bg-white text-[#14A248]' : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              3
            </span>
          </button>

          {/* Active Tab */}
          <button
            type="button"
            onClick={() => setActiveFilter('Active')}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
              activeFilter === 'Active'
                ? 'bg-[#14A248] text-white border-transparent shadow-xs'
                : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200 shadow-2xs'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#14A248]" />
            <span>Active</span>
            <span className="text-zinc-400 text-[11px] font-semibold">3</span>
          </button>

          {/* Pending Tab */}
          <button
            type="button"
            onClick={() => setActiveFilter('Pending')}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
              activeFilter === 'Pending'
                ? 'bg-[#F59E0B] text-white border-transparent shadow-xs'
                : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200 shadow-2xs'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
            <span>Pending</span>
            <span className="text-zinc-400 text-[11px] font-semibold">0</span>
          </button>

          {/* Under Review Tab */}
          <button
            type="button"
            onClick={() => setActiveFilter('Under Review')}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
              activeFilter === 'Under Review'
                ? 'bg-[#2563EB] text-white border-transparent shadow-xs'
                : 'bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200 shadow-2xs'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
            <span>Under Review</span>
            <span className="text-zinc-400 text-[11px] font-semibold">0</span>
          </button>
        </div>

        {/* Right Search Input & Add Property Button */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search properties..."
              className="h-10 pl-9 pr-4 rounded-full bg-white border border-zinc-200 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 w-44 sm:w-60 shadow-2xs"
            />
          </div>

          <Link
            href="/dashboard/landlord/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#14A248] hover:bg-[#11843b] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all hover:scale-102"
          >
            <Home className="w-4 h-4 stroke-[2.2]" />
            <span>Add Property</span>
          </Link>
        </div>
      </div>

      {/* 3 Property Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredProperties.map((prop) => (
          <div
            key={prop.id}
            className="bg-white dark:bg-[#141816] rounded-3xl border border-zinc-100 dark:border-zinc-800 shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col group"
          >
            {/* Property Image Container */}
            <div className="relative h-52 w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={prop.image}
                alt={prop.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Active Badge on TOP-LEFT */}
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#14A248] text-white text-xs font-bold flex items-center gap-1.5 shadow-md">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{prop.status}</span>
              </div>

              {/* Wishlist Heart on TOP-RIGHT */}
              <button
                type="button"
                onClick={() => toggleFavorite(prop.id)}
                aria-label="Save to favorites"
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-zinc-800 flex items-center justify-center backdrop-blur-xs shadow-xs transition-colors cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 stroke-[2.2] transition-colors ${
                    favorites[prop.id] ? 'fill-red-500 text-red-500' : 'text-zinc-800'
                  }`}
                />
              </button>

              {/* Photos Count on BOTTOM-LEFT of Image */}
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5 shadow-xs">
                <Camera className="w-3.5 h-3.5" />
                <span>{prop.photosCount} Photos</span>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-5 flex flex-col flex-1 justify-between gap-4">
              <div className="space-y-1.5">
                <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white uppercase tracking-tight truncate">
                  {prop.title}
                </h3>
                <div className="flex items-center gap-1 text-xs text-zinc-500 font-medium truncate">
                  <MapPin className="w-3.5 h-3.5 text-[#14A248] shrink-0" />
                  <span className="truncate">{prop.location}</span>
                </div>
              </div>

              {/* Price & Rating */}
              <div className="flex items-center justify-between pt-0.5">
                <div className="text-base font-extrabold text-[#14A248]">
                  {prop.price}{' '}
                  <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                    {prop.period}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <Star className="w-3.5 h-3.5 fill-[#FBBF24] text-[#FBBF24]" />
                  <span>{prop.rating}</span>
                  <span className="text-zinc-400 font-normal">({prop.reviews} reviews)</span>
                </div>
              </div>

              {/* Amenities */}
              <div className="flex items-center justify-between py-2.5 border-t border-b border-zinc-100 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <Bed className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{prop.rooms}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Bath className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{prop.baths}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{prop.area}</span>
                </span>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <Link
                  href={`/dashboard/landlord/properties`}
                  className="py-2 px-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-zinc-200/80 dark:border-zinc-700 transition-colors shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5 text-[#14A248]" />
                  <span>View Details</span>
                </Link>
                <Link
                  href={`/dashboard/landlord/properties`}
                  className="py-2 px-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-zinc-200/80 dark:border-zinc-700 transition-colors shadow-2xs"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Edit</span>
                </Link>
                <button
                  type="button"
                  className="py-2 px-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-zinc-200/80 dark:border-zinc-700 transition-colors shadow-2xs cursor-pointer"
                >
                  <MoreHorizontal className="w-3.5 h-3.5 text-zinc-500" />
                  <span>More</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Section: Grow Your Business Banner & Pagination */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pt-2">
        {/* Grow Your Business Banner */}
        <div className="flex-1 w-full lg:max-w-xl rounded-2xl bg-[#EAF7EE] dark:bg-emerald-950/30 border border-[#D0F2DC] dark:border-emerald-900/40 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 text-[#14A248] flex items-center justify-center shrink-0 shadow-2xs">
              <TrendingUp className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                Grow Your Business
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                Upgrade to a premium plan and unlock more features.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/landlord/subscription"
            className="px-5 py-2.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs shrink-0"
          >
            <span>Upgrade Plan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2]" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(1)}
            className={`w-9 h-9 rounded-xl text-xs font-bold flex items-center justify-center shadow-xs cursor-pointer transition-colors ${
              currentPage === 1
                ? 'bg-[#14A248] text-white'
                : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'
            }`}
          >
            1
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage(2)}
            className={`w-9 h-9 rounded-xl text-xs font-semibold flex items-center justify-center shadow-2xs cursor-pointer transition-colors ${
              currentPage === 2
                ? 'bg-[#14A248] text-white'
                : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'
            }`}
          >
            2
          </button>
          <button
            type="button"
            aria-label="Next page"
            onClick={() => setCurrentPage((p) => Math.min(2, p + 1))}
            className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  );
}
