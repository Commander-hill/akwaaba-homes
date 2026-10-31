'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  MapPin,
  Building2,
  Home,
  BedDouble,
  GraduationCap,
  ShieldCheck,
  Heart,
  CheckCircle2,
  Wifi,
  Wind,
  Plus,
  ArrowRight,
  Zap,
  Phone,
  ChevronDown,
} from 'lucide-react';
import api from '@/lib/axios';
import PublicFooter from '@/components/tenant-ui/PublicFooter';

// ── SHOWCASE PROPERTY CARDS ──
const SHOWCASE_PROPERTIES = [
  {
    id: 'glacier-studio',
    title: 'Glacier Studio',
    location: 'Legon, Accra',
    price: 2500,
    rooms: 1,
    type: 'Studio',
    badge: 'Verified',
    badgeColor: 'green',
    image: '/images/home/glacier-living.jpg',
    href: '/properties',
  },
  {
    id: 'aduana-apartment',
    title: 'Aduana Apartment',
    location: 'Kumasi',
    price: 1800,
    rooms: 2,
    type: 'Apartment',
    badge: 'Verified',
    badgeColor: 'green',
    image: '/images/home/aduana-bedroom.jpg',
    href: '/properties',
  },
  {
    id: 'executive-studio',
    title: 'Executive Studio',
    location: 'Airport Residential, Accra',
    price: 4000,
    rooms: 1,
    type: 'Studio',
    badge: 'Popular',
    badgeColor: 'orange',
    image: '/images/home/executive-living.jpg',
    href: '/properties',
  },
  {
    id: 'seaside-apartments',
    title: 'Seaside Apartments',
    location: 'Cape Coast',
    price: 2000,
    rooms: 2,
    type: 'Apartment',
    badge: 'Verified',
    badgeColor: 'green',
    image: '/images/home/seaside-exterior.jpg',
    href: '/properties',
  },
];

const CATEGORY_PILLS = [
  { label: 'Hostels', subtitle: 'Comfortable & Affordable', icon: BedDouble },
  { label: 'Student Housing', subtitle: 'Close to Campus', icon: GraduationCap },
  { label: 'Apartments', subtitle: 'Modern Living', icon: Building2 },
  { label: 'Houses', subtitle: 'Spacious & Secure', icon: Home },
  { label: 'Verified Listings', subtitle: 'Trusted & Secure', icon: ShieldCheck },
];

const TRUST_PILLARS = [
  {
    icon: ShieldCheck,
    label: 'Verified Properties',
    desc: '100% genuine listings',
  },
  {
    icon: Phone,
    label: '24/7 Support',
    desc: 'Always here to help',
  },
  {
    icon: Zap,
    label: 'Easy Booking',
    desc: 'Book in minutes',
  },
  {
    icon: CheckCircle2,
    label: 'Trusted Community',
    desc: 'Join thousands of happy residents',
  },
];

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

export default function HomePage() {
  const router = useRouter();
  const [searchLocation, setSearchLocation] = useState('');
  const [searchType, setSearchType] = useState('');
  const [searchMaxPrice, setSearchMaxPrice] = useState('');
  const [wishlist, setWishlist] = useState<string[]>([]);

  const { data: propertiesResponse } = useQuery({
    queryKey: ['homepage-properties'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/properties', { params: { limit: 4, sort: 'newest' } });
        return data;
      } catch {
        return null;
      }
    },
  });

  const liveListings = propertiesResponse?.data || propertiesResponse?.properties || [];

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (searchLocation.trim()) params.set('location', searchLocation.trim());
    if (searchType) params.set('type', searchType);
    if (searchMaxPrice) params.set('maxPrice', searchMaxPrice);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const toggleWishlist = (id: string) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F2] dark:bg-[#0D100E] text-[#242925] dark:text-[#F2F2EE]">

      {/* ── 1. HERO SECTION ── */}
      <section className="relative overflow-hidden min-h-[270px] sm:min-h-[320px]">
        {/* Background: Building Photo on right */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/resident/hero-building-clean.jpg"
            alt="Modern apartment building in Ghana"
            fill
            priority
            className="object-cover object-right"
          />
          {/* Green wavy gradient overlay on left (matching reference) */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(105deg, #0A3826 0%, #0A3826 35%, #0F5A3E 50%, rgba(15,90,62,0.6) 65%, rgba(15,90,62,0.1) 80%, transparent 100%)',
            }}
          />
          {/* Additional bottom fade for readability */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#F8F7F2] dark:from-[#0D100E] to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container-akwaaba py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Text + Search Bar */}
            <div className="lg:col-span-8 space-y-5">
              {/* Trusted Partner Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 text-white text-xs font-semibold">
                <Home className="w-3.5 h-3.5 text-emerald-300" />
                <span>Ghana's Trusted Housing Partner</span>
              </div>

              {/* Headline */}
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-white leading-tight tracking-tight">
                  Find a place that
                </h1>
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-white leading-tight tracking-tight">
                  feels like{' '}
                  <em
                    className="not-italic"
                    style={{
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontStyle: 'italic',
                      color: '#4ADE80',
                      fontWeight: 700,
                    }}
                  >
                    home.
                  </em>
                </h1>
              </div>

              {/* Subtitle */}
              <p className="text-sm text-white/80 leading-relaxed max-w-lg">
                Discover verified hostels, rooms, apartments, and houses across Ghana — with clear pricing and direct booking.
              </p>

              {/* Search Bar */}
              <form
                onSubmit={handleSearchSubmit}
                className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-full shadow-lg border border-zinc-200/60 dark:border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-0 overflow-hidden"
              >
                {/* Location */}
                <div className="flex items-center gap-2.5 px-4 py-3 flex-1 min-w-0 border-b sm:border-b-0 sm:border-r border-zinc-100 dark:border-zinc-800">
                  <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Location</p>
                    <input
                      type="text"
                      placeholder="e.g. Accra, Kumasi..."
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="w-full text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Property Type */}
                <div className="flex items-center gap-2.5 px-4 py-3 flex-1 min-w-0 border-b sm:border-b-0 sm:border-r border-zinc-100 dark:border-zinc-800">
                  <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Property Type</p>
                    <select
                      value={searchType}
                      onChange={(e) => setSearchType(e.target.value)}
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
                  <span className="text-zinc-400 text-sm shrink-0 font-bold">₵</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Max Budget (GH₵)</p>
                    <select
                      value={searchMaxPrice}
                      onChange={(e) => setSearchMaxPrice(e.target.value)}
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
                    className="w-full sm:w-auto h-10 px-6 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Right: 10K+ Trust Card */}
            <div className="lg:col-span-4 flex justify-end">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-4 border border-zinc-100 dark:border-zinc-800 w-full max-w-xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 fill-[#16A34A] text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-950 dark:text-white leading-tight">Verified Listings</p>
                    <p className="text-[10px] text-zinc-400">Book with confidence</p>
                  </div>
                </div>

                <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
                  <p className="text-3xl font-black text-zinc-950 dark:text-white tracking-tight leading-none">
                    10K+
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                    Happy Residents
                  </p>
                </div>

                {/* Avatar stack */}
                <div className="flex items-center gap-1.5">
                  {['/images/messages/chelsea-list.png', '/images/messages/john-avatar.png', '/images/messages/stephen-avatar.png'].map((src, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full overflow-hidden border-2 border-white dark:border-zinc-900 relative bg-zinc-100"
                      style={{ marginLeft: i === 0 ? 0 : '-8px', zIndex: 3 - i }}
                    >
                      <Image src={src} alt="Resident" fill className="object-cover" />
                    </div>
                  ))}
                  <div
                    className="w-8 h-8 rounded-full bg-[#16A34A] border-2 border-white dark:border-zinc-900 flex items-center justify-center"
                    style={{ marginLeft: '-8px' }}
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. CATEGORY PILLS ROW ── */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 shadow-2xs">
        <div className="container-akwaaba py-4">
          <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
            {CATEGORY_PILLS.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.label}
                  href={`/search?type=${cat.label.toUpperCase().replace(/ /g, '_')}`}
                  className="flex flex-col items-center gap-1.5 min-w-fit px-3 py-2 group cursor-pointer hover:text-[#16A34A] transition"
                >
                  <Icon className="w-5 h-5 text-zinc-400 group-hover:text-[#16A34A] transition" />
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 group-hover:text-[#16A34A] whitespace-nowrap transition">
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-zinc-400 whitespace-nowrap">{cat.subtitle}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. FEATURED LISTINGS ("Handpicked for you") ── */}
      <section className="py-10 sm:py-12 bg-[#F8F7F2] dark:bg-[#0D100E]">
        <div className="container-akwaaba space-y-6">
          {/* Section Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-[#16A34A]" />
                <span className="text-xs font-bold text-[#16A34A] uppercase tracking-wider">Featured Listings</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                Handpicked for you
              </h2>
            </div>
            <Link
              href="/properties"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#16A34A] hover:text-[#15803D] whitespace-nowrap transition"
            >
              <span>View all properties</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 4 Property Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SHOWCASE_PROPERTIES.map((prop) => (
              <Link
                key={prop.id}
                href={prop.href}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/70 dark:border-zinc-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group"
              >
                {/* Card Image */}
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={prop.image}
                    alt={prop.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={() => {}}
                  />

                  {/* Badge (top left) */}
                  <div
                    className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs text-white ${
                      prop.badgeColor === 'orange'
                        ? 'bg-[#F59E0B]'
                        : 'bg-[#16A34A]'
                    }`}
                  >
                    {prop.badgeColor === 'orange' ? (
                      <Zap className="w-3 h-3" />
                    ) : (
                      <Home className="w-3 h-3" />
                    )}
                    <span>{prop.badge}</span>
                  </div>

                  {/* Wishlist Heart (top right) */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleWishlist(prop.id);
                    }}
                    className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xs flex items-center justify-center shadow-xs hover:scale-110 transition cursor-pointer"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 transition ${
                        wishlist.includes(prop.id)
                          ? 'fill-rose-500 text-rose-500'
                          : 'text-zinc-500'
                      }`}
                    />
                  </button>

                  {/* Location + Price Bottom Bar */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-white text-[10px]">
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{prop.location}</span>
                    </div>
                    <span className="text-white text-[11px] font-black whitespace-nowrap">
                      GH₵ {Number(prop.price).toLocaleString()}<span className="text-[10px] font-normal opacity-80">/mo</span>
                    </span>
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-3.5 space-y-2">
                  <h3 className="font-black text-sm text-zinc-950 dark:text-white leading-tight">
                    {prop.title}
                  </h3>

                  {/* Specs */}
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      {prop.rooms} {prop.rooms === 1 ? 'room' : 'rooms'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      Wi-Fi
                    </span>
                    <span className="flex items-center gap-1">
                      <Wind className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      AC
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Mobile View All Link */}
          <div className="sm:hidden flex justify-center">
            <Link
              href="/properties"
              className="flex items-center gap-1.5 text-xs font-bold text-[#16A34A] hover:text-[#15803D]"
            >
              <span>View all properties</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. WHY CHOOSE AKWAABAHOMES ── */}
      <section className="py-4 pb-10 bg-[#F8F7F2] dark:bg-[#0D100E]">
        <div className="container-akwaaba">
          <div className="bg-[#F0FDF4] dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl px-6 sm:px-8 py-6 sm:py-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left: Headline & Description */}
              <div className="lg:col-span-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#16A34A]">
                  WHY CHOOSE AKWAABAHOMES
                </p>
                <h2 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
                  More than just a place
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Enjoy a seamless booking experience, trusted listings, and dedicated support throughout your stay.
                </p>
              </div>

              {/* Right: 4 Trust Pillars */}
              <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {TRUST_PILLARS.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div key={pillar.label} className="flex flex-col items-center text-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-2xs flex items-center justify-center text-[#16A34A]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-900 dark:text-white leading-tight">
                          {pillar.label}
                        </p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{pillar.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Far Right: CTA */}
              <div className="lg:col-span-2 flex justify-end">
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold shadow-xs transition whitespace-nowrap"
                >
                  <span>Learn More</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. BOTTOM CTA BANNER ("Ready to find your next home?") ── */}
      <section className="relative overflow-hidden rounded-none min-h-[120px]" style={{ background: 'linear-gradient(105deg, #0A3826 0%, #0F5A3E 60%, #0A3826 100%)' }}>
        {/* Independence Arch photo blended on right */}
        <div className="absolute inset-y-0 right-0 w-1/2 z-0 opacity-30">
          <Image
            src="/images/home/arch-blended.jpg"
            alt="Independence Arch, Ghana"
            fill
            className="object-cover object-left"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A3826] via-[#0A3826]/60 to-transparent" />
        </div>

        {/* Decorative SVG house outlines */}
        <svg
          className="absolute left-8 top-1/2 -translate-y-1/2 w-24 h-24 opacity-10 pointer-events-none"
          viewBox="0 0 100 100"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
        >
          <path d="M10 45 L50 15 L90 45 V90 H10 Z" />
          <rect x="38" y="60" width="24" height="30" />
          <rect x="18" y="50" width="16" height="20" />
          <rect x="66" y="50" width="16" height="20" />
        </svg>

        {/* Content */}
        <div className="relative z-10 container-akwaaba py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            {/* Left */}
            <div className="flex items-center gap-4">
              {/* White house icon */}
              <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                  Ready to find your next home?
                </h2>
                <p className="text-xs text-white/70 mt-0.5">
                  Explore our listings today and experience the AkwaabaHomes difference.
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-zinc-50 text-[#0A3826] text-sm font-black shadow-xs transition whitespace-nowrap shrink-0"
            >
              <span>Browse Properties</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <PublicFooter />
    </div>
  );
}
