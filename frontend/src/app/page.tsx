import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Building2,
  Home,
  BedDouble,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Plus,
  ArrowRight,
  Phone,
  Zap,
  ChevronDown,
} from 'lucide-react';
import PublicFooter from '@/components/tenant-ui/PublicFooter';
import HomeSearchForm from '@/components/home/HomeSearchForm';
import HomeFeaturedListings from '@/components/home/HomeFeaturedListings';

const CATEGORY_PILLS = [
  { label: 'Hostels', subtitle: 'Comfortable & Affordable', icon: BedDouble, href: '/search?type=HOSTEL' },
  { label: 'Student Housing', subtitle: 'Close to Campus', icon: GraduationCap, href: '/search?targetAudience=STUDENT' },
  { label: 'Apartments', subtitle: 'Modern Living', icon: Building2, href: '/search?type=APARTMENT' },
  { label: 'Houses', subtitle: 'Spacious & Secure', icon: Home, href: '/search?type=HOUSE' },
  { label: 'Verified Listings', subtitle: 'Trusted & Secure', icon: ShieldCheck, href: '/search?verified=true' },
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

async function getInitialFeaturedListings(): Promise<any[]> {
  try {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
    const res = await fetch(`${apiBase}/properties?limit=8&sort=newest`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(1200),
    });
    if (!res.ok) return [];
    const payload = await res.json();
    const rawList = payload?.data || payload?.properties || [];
    return rawList.map((item: any) => ({ id: item.id, title: item.title }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const initialLiveListings = await getInitialFeaturedListings();

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0D100E] text-[#242925] dark:text-[#F2F2EE]">

      {/* ── 1. HERO SECTION ── */}
      <section className="relative overflow-hidden min-h-[270px] sm:min-h-[320px]">
        {/* Background: Building Photo on right */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/resident/hero-building-clean.webp"
            alt="Modern apartment building in Ghana"
            fill
            priority
            fetchPriority="high"

            className="object-cover object-right"
            sizes="100vw" quality={65} decoding="sync"
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
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white dark:from-[#0D100E] to-transparent" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container-akwaaba py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Text + Search Bar */}
            <div className="lg:col-span-8 space-y-5">
              {/* Trusted Partner Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-white text-xs font-semibold">
                <Home className="w-3.5 h-3.5 text-emerald-300" />
                <span>Ghana's Trusted Housing Partner</span>
              </div>

              {/* Headline */}
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-white leading-[1.15] tracking-tight">
                  Find a place that
                  <br />
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
              <HomeSearchForm />
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
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-300">Book with confidence</p>
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
                      <Image src={src} alt="Resident" fill loading="lazy" fetchPriority="low" className="object-cover" sizes="32px" />
                    </div>
                  ))}
                  <div
                    className="w-8 h-8 rounded-full bg-[#15803D] border-2 border-white dark:border-zinc-900 flex items-center justify-center"
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
                <Link prefetch={false}
                  key={cat.label}
                  href={cat.href}
                  className="flex flex-col items-center gap-1.5 min-w-fit px-3 py-2 group cursor-pointer hover:text-[#15803D] dark:text-emerald-400 transition"
                >
                  <Icon className="w-5 h-5 text-zinc-400 group-hover:text-[#15803D] dark:text-emerald-400 transition" />
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 group-hover:text-[#15803D] dark:text-emerald-400 whitespace-nowrap transition">
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-zinc-600 dark:text-zinc-300 whitespace-nowrap">{cat.subtitle}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 3. FEATURED LISTINGS ("Handpicked for you") ── */}
      <section className="py-10 sm:py-12 bg-white dark:bg-[#0D100E]" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 650px' }}>
        <div className="container-akwaaba space-y-6">
          {/* Section Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-4 h-0.5 bg-[#16A34A]" />
                <span className="text-xs font-bold text-[#15803D] dark:text-emerald-400 uppercase tracking-wider">Featured Listings</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                Handpicked for you
              </h2>
            </div>
            <Link prefetch={false}
              href="/properties"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-[#15803D] dark:text-emerald-400 hover:text-[#15803D] whitespace-nowrap transition"
            >
              <span>View all properties</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 4 Property Cards */}
          <HomeFeaturedListings initialLiveListings={initialLiveListings} />

          {/* Mobile View All Link */}
          <div className="sm:hidden flex justify-center">
            <Link prefetch={false}
              href="/properties"
              className="flex items-center gap-1.5 text-xs font-bold text-[#15803D] dark:text-emerald-400 hover:text-[#15803D]"
            >
              <span>View all properties</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. WHY CHOOSE AKWAABAHOMES ── */}
      <section className="py-4 pb-10 bg-white dark:bg-[#0D100E]" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 240px' }}>
        <div className="container-akwaaba">
          <div className="bg-[#F0FDF4] dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl px-6 sm:px-8 py-6 sm:py-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Left: Headline & Description */}
              <div className="lg:col-span-4 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#15803D] dark:text-emerald-400">
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
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-2xs flex items-center justify-center text-[#15803D] dark:text-emerald-400">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-zinc-900 dark:text-white leading-tight">
                          {pillar.label}
                        </p>
                        <p className="text-[10px] text-zinc-600 dark:text-zinc-300 mt-0.5">{pillar.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Far Right: CTA */}
              <div className="lg:col-span-2 flex justify-end">
                <Link prefetch={false}
                  href="/about"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#15803D] hover:bg-[#166534] text-white text-xs font-bold shadow-xs transition whitespace-nowrap"
                >
                  <span>Learn more about us</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. BOTTOM CTA BANNER ("Ready to find your next home?") ── */}
      <section className="relative overflow-hidden rounded-none min-h-[120px]" style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 160px', background: 'linear-gradient(105deg, #0A3826 0%, #0F5A3E 60%, #0A3826 100%)' }}>
        {/* Independence Arch photo blended on right */}
        <div className="absolute inset-y-0 right-0 w-1/2 z-0 opacity-30">
          <Image
            src="/images/home/arch-blended.jpg"
            alt="Independence Arch, Ghana"
            fill
            loading="lazy"
            className="object-cover object-left"
            sizes="(max-width: 768px) 50vw, 40vw"
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
            <Link prefetch={false}
              href="/properties"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white hover:bg-zinc-50 text-[#0A3826] text-sm font-black shadow-xs transition whitespace-nowrap shrink-0"
            >
              <span>Browse Properties</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <div style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 380px' }}><PublicFooter /></div>
    </div>
  );
}
