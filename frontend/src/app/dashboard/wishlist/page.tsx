'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import QueryErrorFallback from '@/components/ui/QueryErrorFallback';
import { getGuestWishlistIds, setGuestWishlistIds } from '@/components/WishlistButton';
import {
  Heart,
  Trash2,
  ArrowRight,
  AlertCircle,
  LogIn,
  Search,
  Scale,
  Check,
  ShieldCheck,
  Sparkles,
  X,
  MapPin,
  CheckCircle2,
  LayoutGrid,
  List,
  ChevronDown,
  Building2,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import PropertyCard, {
  formatPropertyTypeLabel,
  parseStringArray,
} from '@/components/tenant-ui/PropertyCard';
import PropertyImage from '@/components/PropertyImage';
import WishlistButton from '@/components/WishlistButton';
import { PropertyCardSkeleton, Button } from '@/components/tenant-ui/primitives';

type CategoryFilter = 'ALL' | 'HOSTEL' | 'APARTMENT' | 'HOUSE';
type SortOption = 'RECENT' | 'PRICE_ASC' | 'PRICE_DESC' | 'RATING_DESC';
type ViewMode = 'grid' | 'list';

function getEffectivePrice(prop: any): number {
  const rooms = Array.isArray(prop?.rooms) ? prop.rooms : [];
  const roomPrices = rooms.map((r: any) => Number(r.price || 0)).filter((p: number) => p > 0);
  if (roomPrices.length > 0) {
    return Math.min(...roomPrices);
  }
  return Number(prop?.price || 0);
}

function formatCedis(amount: number): string {
  return `GH₵ ${Number(amount || 0).toLocaleString('en-GH', {
    maximumFractionDigits: 0,
  })}`;
}

export default function WishlistPage() {
  const queryClient = useQueryClient();
  const [guestIds, setGuestIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('RECENT');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showComparePanel, setShowComparePanel] = useState(false);

  const { data: userResponse, isLoading: isAuthLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/me');
        return data;
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const isAuthenticated = Boolean(userResponse?.user);

  useEffect(() => {
    const sync = () => setGuestIds(getGuestWishlistIds());
    sync();
    window.addEventListener('akwaaba_wishlist_changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('akwaaba_wishlist_changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // Authenticated Wishlist Query
  const {
    data: authWishlistData,
    isLoading: isAuthWishlistLoading,
    isError: isAuthWishlistError,
    refetch: refetchAuthWishlist,
  } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const res = await api.get('/wishlist');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  // Guest Wishlist Query (hydrate properties from public catalog)
  const {
    data: guestCatalogData,
    isLoading: isGuestCatalogLoading,
    isError: isGuestCatalogError,
    refetch: refetchGuestCatalog,
  } = useQuery({
    queryKey: ['guest-wishlist-properties', guestIds],
    queryFn: async () => {
      if (guestIds.length === 0) return [];
      const res = await api.get('/properties?limit=100');
      const all: any[] = res.data?.data || res.data?.properties || [];
      return all.filter((p) => guestIds.includes(p.id));
    },
    enabled: !isAuthenticated && guestIds.length > 0,
  });

  const removeMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return api.post('/wishlist/toggle', { propertyId });
    },
    onSuccess: (_res, propertyId) => {
      toast.success('Removed from saved properties');
      setCompareIds((prev) => prev.filter((id) => id !== propertyId));
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: () => {
      toast.error('Failed to remove property');
    },
  });

  const syncGuestMutation = useMutation({
    mutationFn: async (propertyIds: string[]) => {
      return api.post('/wishlist/toggle', { propertyIds });
    },
    onSuccess: (res) => {
      setGuestWishlistIds([]);
      setGuestIds([]);
      toast.success(res.data?.message || 'Browser shortlist synced to your account');
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: () => {
      toast.error('Failed to sync browser shortlist');
    },
  });

  const handleRemove = (propertyId: string) => {
    if (!isAuthenticated) {
      const next = guestIds.filter((id) => id !== propertyId);
      setGuestWishlistIds(next);
      setGuestIds(next);
      setCompareIds((prev) => prev.filter((id) => id !== propertyId));
      toast.success('Removed from saved properties');
      return;
    }
    removeMutation.mutate(propertyId);
  };

  const savedProperties: any[] = useMemo(() => {
    if (isAuthenticated) {
      return (
        authWishlistData?.properties ||
        (authWishlistData?.wishlists || []).map((w: any) => w.property).filter(Boolean)
      );
    }
    return guestCatalogData || [];
  }, [isAuthenticated, authWishlistData, guestCatalogData]);

  // Detect any browser-saved guest items not yet imported into the authenticated user's account
  const unsyncedGuestIds = useMemo(() => {
    if (!isAuthenticated || guestIds.length === 0) return [];
    const savedIdSet = new Set(savedProperties.map((p: any) => p.id));
    return guestIds.filter((id) => !savedIdSet.has(id));
  }, [isAuthenticated, guestIds, savedProperties]);

  // Category Counts
  const categoryCounts = useMemo(() => {
    let hostel = 0;
    let apartment = 0;
    let house = 0;
    savedProperties.forEach((p: any) => {
      const upper = (p.type || '').toUpperCase();
      if (upper.includes('HOSTEL')) hostel++;
      else if (upper.includes('APARTMENT') || upper.includes('STUDIO')) apartment++;
      else house++;
    });
    return {
      ALL: savedProperties.length,
      HOSTEL: hostel,
      APARTMENT: apartment,
      HOUSE: house,
    };
  }, [savedProperties]);

  // Filter & Sort
  const filteredProperties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = savedProperties.filter((prop: any) => {
      if (q) {
        const hay = `${prop.title || ''} ${prop.location || ''} ${prop.type || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      const upperType = (prop.type || '').toUpperCase();
      if (categoryFilter === 'HOSTEL') {
        return upperType.includes('HOSTEL');
      }
      if (categoryFilter === 'APARTMENT') {
        return upperType.includes('APARTMENT') || upperType.includes('STUDIO');
      }
      if (categoryFilter === 'HOUSE') {
        return (
          upperType.includes('HOUSE') ||
          upperType.includes('HOMESTAY') ||
          upperType.includes('ROOM')
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'PRICE_ASC') {
        return getEffectivePrice(a) - getEffectivePrice(b);
      }
      if (sortBy === 'PRICE_DESC') {
        return getEffectivePrice(b) - getEffectivePrice(a);
      }
      if (sortBy === 'RATING_DESC') {
        return Number(b.avgRating || 0) - Number(a.avgRating || 0);
      }
      // RECENT: Deterministic timestamp descending sort
      const dateA = new Date(a.savedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.savedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [savedProperties, searchQuery, categoryFilter, sortBy]);

  const toggleCompare = (propertyId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(propertyId)) {
        return prev.filter((id) => id !== propertyId);
      }
      if (prev.length >= 3) {
        toast.error('You can compare up to 3 properties at a time');
        return prev;
      }
      return [...prev, propertyId];
    });
  };

  const handleQuickCompareTop = () => {
    if (compareIds.length >= 2) {
      setShowComparePanel((prev) => !prev);
      return;
    }
    const topIds = filteredProperties.slice(0, 3).map((p: any) => p.id);
    setCompareIds(topIds);
    setShowComparePanel(true);
  };

  const comparedProperties = useMemo(() => {
    return savedProperties.filter((p: any) => compareIds.includes(p.id));
  }, [savedProperties, compareIds]);

  const lowestComparedPrice = useMemo(() => {
    if (comparedProperties.length < 2) return null;
    const prices = comparedProperties.map(getEffectivePrice).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [comparedProperties]);

  const isLoading =
    isAuthLoading ||
    (isAuthenticated ? isAuthWishlistLoading : guestIds.length > 0 && isGuestCatalogLoading);

  return (
    <div className="space-y-6 pb-12">
      {/* ======================================================== */}
      {/* 1. TOP HERO BANNER (Pixel-matched from design)          */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-[22px] border border-emerald-100/90 dark:border-emerald-950/40 bg-[#E3F5EB] dark:bg-[#10241A] p-5 sm:p-6 lg:p-7 shadow-xs">
        {/* Right-aligned panoramic building background */}
        <div
          className="absolute inset-y-0 right-0 w-full sm:w-2/3 lg:w-3/5 bg-cover bg-right bg-no-repeat pointer-events-none opacity-90 mix-blend-multiply dark:mix-blend-luminosity"
          style={{ backgroundImage: `url('/images/resident/hero-building-clean.webp')` }}
        />
        {/* Soft mint fade from left so text is crisp */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#E3F5EB] via-[#E3F5EB]/90 sm:via-[#E3F5EB]/70 to-transparent pointer-events-none dark:from-[#10241A] dark:via-[#10241A]/90 dark:sm:via-[#10241A]/70" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Emerald Heart Badge in Rounded Square */}
            <div className="w-14 h-14 rounded-2xl bg-[#C8F0D6] dark:bg-[#1A3828] flex items-center justify-center shrink-0 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#059669] flex items-center justify-center shadow-xs">
                <Heart className="w-5 h-5 text-white fill-white" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                My Wishlist
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 mt-1">
                Keep track of your favorite properties and find them easily later.
              </p>
            </div>
          </div>

          <Link
            href="/properties"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white text-zinc-900 text-xs sm:text-sm font-semibold hover:bg-zinc-50 shadow-sm transition border border-zinc-200/80 shrink-0 self-start sm:self-auto"
          >
            <span>Browse Properties</span>
            <ArrowRight className="w-4 h-4 text-zinc-700" />
          </Link>
        </div>
      </div>

      {/* Sync Banner (Logged in with leftover localStorage items) */}
      {isAuthenticated && unsyncedGuestIds.length > 0 && (
        <div className="p-4 rounded-[16px] bg-[#F1F6F3] dark:bg-[#16231C] border border-[#CFE0D6] dark:border-[#253D31] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#242925] dark:text-white">
                {unsyncedGuestIds.length} browser-saved{' '}
                {unsyncedGuestIds.length === 1 ? 'property' : 'properties'} found
              </p>
              <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2] mt-0.5">
                Import the homes you saved before signing in so they stay synced across all your devices.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => syncGuestMutation.mutate(unsyncedGuestIds)}
            isLoading={syncGuestMutation.isPending}
          >
            Import to Account
          </Button>
        </div>
      )}

      {/* Guest Notice (When browsing logged out) */}
      {!isAuthenticated && (
        <div className="p-4 rounded-[16px] bg-[#FFFAEB] dark:bg-[#451A03]/30 border border-[#FDE68A] dark:border-[#78350F] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#B45309] dark:text-[#FCD34D] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#242925] dark:text-white">
                Saved in your current browser session
              </p>
              <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2] mt-0.5">
                Sign in or create an account to save your shortlist across devices.
              </p>
            </div>
          </div>
          <Link
            href="/login?redirect=/dashboard/wishlist"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold shrink-0 self-start sm:self-center shadow-xs"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In to Sync</span>
          </Link>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MIDDLE TWO CARDS (Pixel-matched from design)          */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Your wishlist is empty / status card */}
        <div className="bg-white dark:bg-[#171C19] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 flex flex-col sm:flex-row items-center gap-6 shadow-xs relative overflow-hidden">
          <div className="relative w-32 h-28 shrink-0 flex items-center justify-center">
            <Image
              src="/images/resident/wishlist-heart-house-trans.png"
              alt="Heart house"
              width={130}
              height={110}
              className="object-contain drop-shadow-xs"
              priority
            />
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
              {savedProperties.length === 0
                ? 'Your wishlist is empty!'
                : `Your wishlist has ${savedProperties.length} saved ${savedProperties.length === 1 ? 'property' : 'properties'}!`}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 mb-4 leading-relaxed">
              {savedProperties.length === 0
                ? 'Save properties you love and access them anytime from here.'
                : 'Review your shortlisted homes and choose the best fit for your stay.'}
            </p>
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all"
            >
              <Search className="w-4 h-4" />
              <span>{savedProperties.length === 0 ? 'Explore Properties' : 'Explore More'}</span>
            </Link>
          </div>
        </div>

        {/* Card 2: Why Save Properties? with Suburban Skyline Background */}
        <div className="bg-white dark:bg-[#171C19] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-6 shadow-xs relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <div className="relative z-10 max-w-[62%] sm:max-w-[60%]">
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white mb-3">
              Why Save Properties?
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 font-medium">
                <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[#059669] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span>Quickly revisit your favorite homes</span>
              </li>
              <li className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 font-medium">
                <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[#059669] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span>Get notified about price changes</span>
              </li>
              <li className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-200 font-medium">
                <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[#059669] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
                <span>Find your dream home faster</span>
              </li>
            </ul>
          </div>

          {/* City & Suburban Illustration positioned on the right */}
          <div className="absolute right-0 bottom-0 top-0 w-[42%] sm:w-[45%] pointer-events-none overflow-hidden flex items-end justify-end">
            <Image
              src="/images/resident/wishlist-city-illustration-feathered.png"
              alt="Suburban skyline"
              width={270}
              height={130}
              className="object-contain object-right-bottom max-h-full"
            />
          </div>
        </div>
      </div>

      {/* Comparison Drawer / Matrix (if user compares 2+ properties) */}
      {showComparePanel && comparedProperties.length >= 2 && (
        <div className="bg-white dark:bg-[#171C19] border border-[#CFE0D6] dark:border-[#253D31] rounded-[16px] overflow-hidden shadow-xs">
          <div className="px-5 py-4 bg-[#F4F8F5] dark:bg-[#142019] border-b border-[#DCE7E0] dark:border-[#253D31] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#059669] text-white flex items-center justify-center shrink-0">
                <Scale className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#242925] dark:text-white">
                  Side-by-Side Shortlist Comparison ({comparedProperties.length} Homes)
                </h2>
                <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2]">
                  Comparing rent, caution deposit, included utilities, and compound policies
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCompareIds([]);
                  setShowComparePanel(false);
                }}
                className="text-xs font-medium text-[#5E645E] hover:text-[#242925] dark:text-[#A0A8A2] dark:hover:text-white px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer"
              >
                Clear Selection
              </button>
              <button
                type="button"
                onClick={() => setShowComparePanel(false)}
                className="p-1.5 rounded-lg text-[#5E645E] hover:text-[#242925] dark:text-[#A0A8A2] dark:hover:text-white cursor-pointer"
                aria-label="Close comparison matrix"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="p-4 w-44 bg-white dark:bg-[#131815] font-semibold uppercase tracking-wider text-[11px] text-[#6F756F] dark:text-[#A0A8A2] align-top">
                    Criteria
                  </th>
                  {comparedProperties.map((prop: any) => {
                    const imgs = parseStringArray(prop.images);
                    return (
                      <th
                        key={prop.id}
                        className="p-4 border-l border-zinc-200 dark:border-zinc-800 align-top min-w-[210px]"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded bg-[#F1F5F2] dark:bg-[#1E2822] text-[#059669] dark:text-emerald-400 text-[10px] font-semibold">
                            {formatPropertyTypeLabel(prop.type)}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCompare(prop.id)}
                            className="text-[#6F756F] hover:text-[#B42318] transition cursor-pointer"
                            title="Remove from comparison"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-12 rounded-lg overflow-hidden bg-zinc-100 dark:bg-[#1B211E] shrink-0 border border-zinc-200 dark:border-zinc-800">
                            <PropertyImage
                              src={imgs[0] || ''}
                              alt={prop.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/properties/${prop.id}`}
                              className="text-sm font-bold text-[#242925] dark:text-white hover:text-[#059669] dark:hover:text-emerald-400 line-clamp-1"
                            >
                              {prop.title}
                            </Link>
                            <p className="text-[11px] font-normal text-[#6F756F] dark:text-[#A0A8A2] flex items-center gap-1 truncate mt-0.5">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{prop.location}</span>
                            </p>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {/* Row 1: Starting Rent */}
                <tr>
                  <td className="p-4 bg-white dark:bg-[#131815] font-semibold text-[#242925] dark:text-white">
                    Starting Rent
                  </td>
                  {comparedProperties.map((prop: any) => {
                    const price = getEffectivePrice(prop);
                    const isLowest = lowestComparedPrice !== null && price === lowestComparedPrice;
                    return (
                      <td
                        key={prop.id}
                        className="p-4 border-l border-zinc-200 dark:border-zinc-800"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold font-mono tabular-nums text-[#242925] dark:text-white">
                            {formatCedis(price)}
                          </span>
                          <span className="text-[11px] text-[#6F756F] dark:text-[#A0A8A2]">
                            / {prop.billingCycle || prop.pricePeriod || 'Academic Year'}
                          </span>
                        </div>
                        {isLowest && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#ECFDF3] text-[#166534] dark:bg-emerald-500/15 dark:text-emerald-300">
                            Lowest Price
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Row 2: Security / Caution Deposit */}
                <tr>
                  <td className="p-4 bg-white dark:bg-[#131815] font-semibold text-[#242925] dark:text-white">
                    Caution Deposit
                  </td>
                  {comparedProperties.map((prop: any) => {
                    const caution = Number(prop.cautionDeposit || 0);
                    return (
                      <td
                        key={prop.id}
                        className="p-4 border-l border-zinc-200 dark:border-zinc-800 font-mono tabular-nums text-[#242925] dark:text-white"
                      >
                        {caution > 0 ? (
                          <span>{formatCedis(caution)} (Refundable)</span>
                        ) : (
                          <span className="font-sans text-[#059669] dark:text-emerald-400 font-medium">
                            GH₵ 0 (No Caution Fee)
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Row 3: Included Utilities & Key Amenities */}
                <tr>
                  <td className="p-4 bg-white dark:bg-[#131815] font-semibold text-[#242925] dark:text-white">
                    Utilities &amp; Amenities
                  </td>
                  {comparedProperties.map((prop: any) => {
                    const utilities = parseStringArray(prop.includedUtilities);
                    const amenities = parseStringArray(prop.amenities);
                    const combined = Array.from(new Set([...utilities, ...amenities])).slice(0, 5);
                    return (
                      <td
                        key={prop.id}
                        className="p-4 border-l border-zinc-200 dark:border-zinc-800"
                      >
                        {combined.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {combined.map((item) => (
                              <span
                                key={item}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F4F8F5] dark:bg-[#19241E] text-[#059669] dark:text-emerald-300 text-[11px]"
                              >
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                <span>{item}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#6F756F] dark:text-[#A0A8A2]">
                            Standard compound utilities
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Row 4: Landlord Verification */}
                <tr>
                  <td className="p-4 bg-white dark:bg-[#131815] font-semibold text-[#242925] dark:text-white">
                    Host Verification
                  </td>
                  {comparedProperties.map((prop: any) => (
                    <td
                      key={prop.id}
                      className="p-4 border-l border-zinc-200 dark:border-zinc-800"
                    >
                      <div className="flex items-center gap-2">
                        {prop.landlord?.isVerifiedLandlord ? (
                          <span className="inline-flex items-center gap-1 text-[#166534] dark:text-emerald-400 font-semibold">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Verified Landlord</span>
                          </span>
                        ) : (
                          <span className="text-[#6F756F] dark:text-[#A0A8A2]">
                            Standard Host
                          </span>
                        )}
                        {prop.avgRating ? (
                          <span className="text-[#242925] dark:text-white font-semibold">
                            &bull; ★ {prop.avgRating} ({prop.reviewCount})
                          </span>
                        ) : null}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Row 5: Action CTA */}
                <tr>
                  <td className="p-4 bg-white dark:bg-[#131815] font-semibold text-[#242925] dark:text-white">
                    Action
                  </td>
                  {comparedProperties.map((prop: any) => (
                    <td
                      key={prop.id}
                      className="p-4 border-l border-zinc-200 dark:border-zinc-800"
                    >
                      <Link
                        href={`/properties/${prop.id}`}
                        className="inline-flex items-center justify-center gap-1.5 w-full px-3.5 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold transition"
                      >
                        <span>View &amp; Select Room</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SECTION HEADER BAR (Saved Properties, Sort, Views)    */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2.5">
          <Heart className="w-5 h-5 text-[#059669] fill-[#059669]" />
          <h2 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
            Saved Properties ({savedProperties.length})
          </h2>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Quick Compare Trigger if 2+ properties saved */}
          {savedProperties.length >= 2 && (
            <Button
              variant={showComparePanel ? 'primary' : 'outline'}
              size="sm"
              onClick={handleQuickCompareTop}
              leftIcon={<Scale className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              {compareIds.length >= 2
                ? `${showComparePanel ? 'Hide' : 'Compare'} (${compareIds.length})`
                : 'Compare'}
            </Button>
          )}

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">
              Sort by:
            </span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort saved properties"
                className="appearance-none bg-white dark:bg-[#171C19] border border-zinc-200/90 dark:border-zinc-800 rounded-lg pl-3 pr-8 py-1.5 text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#059669] cursor-pointer shadow-2xs"
              >
                <option value="RECENT">Recently Added</option>
                <option value="PRICE_ASC">Price: Low to High</option>
                <option value="PRICE_DESC">Price: High to Low</option>
                <option value="RATING_DESC">Highest Rated</option>
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* View Mode Toggle: Grid & List */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#171C19] border border-zinc-200/90 dark:border-zinc-800 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#059669] text-white shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`p-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#059669] text-white shadow-2xs'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Bar (Cleanly revealed when user has saved properties) */}
      {!isLoading && savedProperties.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#171C19] p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {(
              [
                { id: 'ALL', label: 'All Saved', count: categoryCounts.ALL },
                { id: 'HOSTEL', label: 'Student Hostels', count: categoryCounts.HOSTEL },
                { id: 'APARTMENT', label: 'Apartments & Studios', count: categoryCounts.APARTMENT },
                { id: 'HOUSE', label: 'Houses & Rooms', count: categoryCounts.HOUSE },
              ] as const
            ).map((tab) => {
              const active = categoryFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    active
                      ? 'bg-[#059669] text-white shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved homes..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121614] text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-[#059669]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. CONTENT AREA: Loading / Error / Empty / Property List */}
      {/* ======================================================== */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : (isAuthenticated ? isAuthWishlistError : isGuestCatalogError) ? (
        <QueryErrorFallback
          title="Unable to load saved properties"
          onRetry={() => (isAuthenticated ? refetchAuthWishlist() : refetchGuestCatalog())}
        />
      ) : savedProperties.length === 0 ? (
        /* Empty State Card (Pixel-matched from design) */
        <div className="bg-white dark:bg-[#171C19] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 py-14 sm:py-16 px-6 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="relative w-48 h-24 mb-4 flex items-center justify-center">
            <Image
              src="/images/resident/wishlist-empty-house-trans.png"
              alt="Empty wishlist"
              width={200}
              height={86}
              className="object-contain drop-shadow-xs"
              priority
            />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-white">
            No properties in your wishlist yet
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 mb-6 max-w-md">
            Click the heart icon on any property to add it to your wishlist.
          </p>
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#059669] hover:bg-[#047857] text-white text-xs sm:text-sm font-semibold shadow-xs transition"
          >
            <span>Browse Properties</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="bg-white dark:bg-[#171C19] rounded-2xl border border-zinc-200/80 dark:border-zinc-800 py-12 px-6 text-center flex flex-col items-center justify-center shadow-xs">
          <Building2 className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mb-2" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            No matching saved properties
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-4">
            No properties match your current search or category filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setCategoryFilter('ALL');
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((prop: any) => {
            const isSelectedForCompare = compareIds.includes(prop.id);
            return (
              <PropertyCard
                key={prop.id}
                property={prop}
                initialIsSaved={true}
                footerSlot={
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        toggleCompare(prop.id);
                        if (!isSelectedForCompare && compareIds.length >= 1) {
                          setShowComparePanel(true);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        isSelectedForCompare
                          ? 'bg-[#059669] text-white border-[#059669]'
                          : 'bg-white dark:bg-[#141816] text-[#242925] dark:text-[#F2F2EE] border-zinc-200 dark:border-zinc-700 hover:border-[#059669]'
                      }`}
                    >
                      {isSelectedForCompare ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Comparing</span>
                        </>
                      ) : (
                        <>
                          <Scale className="w-3.5 h-3.5 text-[#059669]" />
                          <span>Compare</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleRemove(prop.id)}
                        disabled={removeMutation.isPending}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#6F756F] hover:text-[#B42318] dark:text-[#A0A8A2] dark:hover:text-[#FCA5A5] transition-colors cursor-pointer"
                        title="Remove from saved properties"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>

                      <Link
                        href={`/properties/${prop.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#059669] dark:text-emerald-400 hover:underline"
                      >
                        <span>View Rooms</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                }
              />
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="flex flex-col gap-4">
          {filteredProperties.map((prop: any) => {
            const isSelectedForCompare = compareIds.includes(prop.id);
            const imgs = parseStringArray(prop.images);
            return (
              <div
                key={prop.id}
                className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-white dark:bg-[#171C19] border border-zinc-200/80 dark:border-zinc-800 hover:shadow-md transition-all group"
              >
                <div className="relative w-full sm:w-60 h-44 rounded-xl overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800">
                  <PropertyImage
                    src={imgs[0] || ''}
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 right-2.5">
                    <WishlistButton propertyId={prop.id} initialIsSaved={true} />
                  </div>
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/95 dark:bg-zinc-900/95 text-zinc-800 dark:text-zinc-200 shadow-2xs">
                    {formatPropertyTypeLabel(prop.type)}
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/properties/${prop.id}`}
                          className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white hover:text-[#059669] dark:hover:text-emerald-400 transition"
                        >
                          {prop.title}
                        </Link>
                        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{prop.location}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold font-mono text-[#059669] dark:text-emerald-400">
                          {formatCedis(getEffectivePrice(prop))}
                        </p>
                        <span className="text-[11px] text-zinc-400">
                          / {prop.billingCycle || prop.pricePeriod || 'Academic Year'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 mt-2 leading-relaxed">
                      {prop.description || 'Modern and secure residential space in a prime location.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {prop.landlord?.isVerifiedLandlord && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified Host</span>
                        </span>
                      )}
                      {prop.avgRating ? (
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                          ★ {prop.avgRating} ({prop.reviewCount || 0})
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          toggleCompare(prop.id);
                          if (!isSelectedForCompare && compareIds.length >= 1) {
                            setShowComparePanel(true);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          isSelectedForCompare
                            ? 'bg-[#059669] text-white border-[#059669]'
                            : 'border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>{isSelectedForCompare ? 'Comparing' : 'Compare'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemove(prop.id)}
                        disabled={removeMutation.isPending}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#6F756F] hover:text-[#B42318] dark:text-[#A0A8A2] dark:hover:text-[#FCA5A5] px-2 py-1.5 transition-colors cursor-pointer"
                        title="Remove from saved properties"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>

                      <Link
                        href={`/properties/${prop.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold shadow-2xs transition"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
