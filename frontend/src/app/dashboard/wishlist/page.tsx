'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getGuestWishlistIds, setGuestWishlistIds } from '@/components/WishlistButton';
import {
  Heart,
  Trash2,
  ArrowRight,
  AlertCircle,
  LogIn,
  Search,
  SlidersHorizontal,
  Scale,
  Check,
  ShieldCheck,
  Sparkles,
  X,
  MapPin,
  Clock,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import PropertyCard, {
  formatPropertyTypeLabel,
  parseStringArray,
} from '@/components/tenant-ui/PropertyCard';
import PropertyImage from '@/components/PropertyImage';
import { EmptyState, PropertyCardSkeleton, Button } from '@/components/tenant-ui/primitives';

type CategoryFilter = 'ALL' | 'HOSTEL' | 'APARTMENT' | 'HOUSE';
type SortOption = 'RECENT' | 'PRICE_ASC' | 'PRICE_DESC' | 'RATING_DESC';

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
    return () => window.removeEventListener('akwaaba_wishlist_changed', sync);
  }, []);

  // Authenticated Wishlist Query
  const { data: authWishlistData, isLoading: isAuthWishlistLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const res = await api.get('/wishlist');
      return res.data;
    },
    enabled: isAuthenticated,
  });

  // Guest Wishlist Query (hydrate properties from public catalog)
  const { data: guestCatalogData, isLoading: isGuestCatalogLoading } = useQuery({
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
      return 0; // RECENT preserves backend createdAt desc order
    });
  }, [savedProperties, searchQuery, categoryFilter, sortBy]);

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

  // Summary Metrics
  const metrics = useMemo(() => {
    if (savedProperties.length === 0) {
      return { minPrice: 0, maxPrice: 0, verifiedCount: 0 };
    }
    const prices = savedProperties.map(getEffectivePrice).filter((p) => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const verifiedCount = savedProperties.filter(
      (p: any) => p.landlord?.isVerifiedLandlord
    ).length;
    return { minPrice, maxPrice, verifiedCount };
  }, [savedProperties]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E7E7DF] dark:border-[#262E29]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#557A67] dark:text-[#86B59C] mb-1">
            Resident Shortlist
          </p>
          <h1 className="font-editorial text-2xl sm:text-3xl text-[#242925] dark:text-white">
            Saved Properties ({savedProperties.length})
          </h1>
          <p className="text-sm text-[#5E645E] dark:text-[#A0A8A2] mt-1">
            Compare rent, security deposits, utilities, and compound policies side-by-side before booking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {savedProperties.length >= 2 && (
            <Button
              variant={showComparePanel ? 'primary' : 'outline'}
              size="sm"
              onClick={handleQuickCompareTop}
              leftIcon={<Scale className="w-4 h-4" />}
            >
              {compareIds.length >= 2
                ? `${showComparePanel ? 'Hide' : 'Compare'} Selected (${compareIds.length})`
                : 'Compare Shortlist'}
            </Button>
          )}

          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#173D32] hover:bg-[#1E4F41] text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            <span>Explore More Homes</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Browser-to-Account Sync Banner (when logged in with leftover localStorage items) */}
      {isAuthenticated && unsyncedGuestIds.length > 0 && (
        <div className="p-4 rounded-[14px] bg-[#F1F6F3] dark:bg-[#16231C] border border-[#CFE0D6] dark:border-[#253D31] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#173D32] dark:text-emerald-400 shrink-0 mt-0.5" />
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

      {/* Guest Persistence Notice */}
      {!isAuthenticated && (
        <div className="p-4 rounded-[16px] bg-[#FFFAEB] dark:bg-[#451A03]/30 border border-[#FDE68A] dark:border-[#78350F] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#173D32] hover:bg-[#1E4F41] text-white text-xs font-semibold shrink-0 self-start sm:self-center"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In to Sync</span>
          </Link>
        </div>
      )}

      {/* KPI Summary Strip (Shown when user has saved properties) */}
      {!isLoading && savedProperties.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-[14px] bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] dark:text-[#A0A8A2] block">
              Shortlisted Homes
            </span>
            <p className="text-xl font-bold text-[#242925] dark:text-white mt-1 tabular-nums">
              {savedProperties.length}
            </p>
            <span className="text-xs text-[#5E645E] dark:text-[#A0A8A2]">
              Ready for review
            </span>
          </div>

          <div className="p-4 rounded-[14px] bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] dark:text-[#A0A8A2] block">
              Starting Rent Range
            </span>
            <p className="text-xl font-bold font-mono tabular-nums text-[#242925] dark:text-white mt-1">
              {metrics.minPrice === metrics.maxPrice
                ? formatCedis(metrics.minPrice)
                : `${formatCedis(metrics.minPrice)} – ${formatCedis(metrics.maxPrice)}`}
            </p>
            <span className="text-xs text-[#5E645E] dark:text-[#A0A8A2]">
              Lowest available room price
            </span>
          </div>

          <div className="p-4 rounded-[14px] bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29]">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] dark:text-[#A0A8A2] block">
              Verified Landlords
            </span>
            <p className="text-xl font-bold text-[#173D32] dark:text-emerald-400 mt-1 tabular-nums">
              {metrics.verifiedCount} / {savedProperties.length}
            </p>
            <span className="text-xs text-[#5E645E] dark:text-[#A0A8A2]">
              Identity &amp; ownership vetted
            </span>
          </div>

          <div className="p-4 rounded-[14px] bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6F756F] dark:text-[#A0A8A2] block">
                Comparison Queue
              </span>
              <p className="text-xl font-bold text-[#242925] dark:text-white mt-1 tabular-nums">
                {compareIds.length} / 3 selected
              </p>
            </div>
            {compareIds.length >= 2 ? (
              <button
                type="button"
                onClick={() => setShowComparePanel((prev) => !prev)}
                className="text-xs font-semibold text-[#16A34A] hover:underline text-left mt-1 cursor-pointer"
              >
                {showComparePanel ? 'Hide comparison matrix' : 'Open side-by-side matrix →'}
              </button>
            ) : (
              <span className="text-xs text-[#5E645E] dark:text-[#A0A8A2]">
                Select 2–3 cards below to compare
              </span>
            )}
          </div>
        </div>
      )}

      {/* Interactive Side-by-Side Comparison Matrix */}
      {showComparePanel && comparedProperties.length >= 2 && (
        <div className="bg-white dark:bg-[#171C19] border border-[#CFE0D6] dark:border-[#253D31] rounded-[16px] overflow-hidden shadow-xs">
          <div className="px-5 py-4 bg-[#F4F8F5] dark:bg-[#142019] border-b border-[#DCE7E0] dark:border-[#253D31] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#173D32] text-white flex items-center justify-center shrink-0">
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
                className="text-xs font-medium text-[#5E645E] hover:text-[#242925] dark:text-[#A0A8A2] dark:hover:text-white px-3 py-1.5 rounded-lg border border-[#D4D6CE] dark:border-[#2E3832] cursor-pointer"
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
                <tr className="border-b border-[#E7E7DF] dark:border-[#262E29]">
                  <th className="p-4 w-44 bg-[#F8F7F2] dark:bg-[#131815] font-semibold uppercase tracking-wider text-[11px] text-[#6F756F] dark:text-[#A0A8A2] align-top">
                    Criteria
                  </th>
                  {comparedProperties.map((prop: any) => {
                    const imgs = parseStringArray(prop.images);
                    return (
                      <th
                        key={prop.id}
                        className="p-4 border-l border-[#E7E7DF] dark:border-[#262E29] align-top min-w-[210px]"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded bg-[#F1F5F2] dark:bg-[#1E2822] text-[#173D32] dark:text-emerald-400 text-[10px] font-semibold">
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
                          <div className="w-14 h-12 rounded-lg overflow-hidden bg-[#F1EFE8] dark:bg-[#1B211E] shrink-0 border border-[#E7E7DF] dark:border-[#262E2A]">
                            <PropertyImage
                              src={imgs[0] || ''}
                              alt={prop.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/properties/${prop.id}`}
                              className="text-sm font-bold text-[#242925] dark:text-white hover:text-[#173D32] dark:hover:text-emerald-400 line-clamp-1"
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
              <tbody className="divide-y divide-[#E7E7DF] dark:divide-[#262E29]">
                {/* Row 1: Starting Rent */}
                <tr>
                  <td className="p-4 bg-[#F8F7F2] dark:bg-[#131815] font-semibold text-[#242925] dark:text-white">
                    Starting Rent
                  </td>
                  {comparedProperties.map((prop: any) => {
                    const price = getEffectivePrice(prop);
                    const isLowest = lowestComparedPrice !== null && price === lowestComparedPrice;
                    return (
                      <td
                        key={prop.id}
                        className="p-4 border-l border-[#E7E7DF] dark:border-[#262E29]"
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
                  <td className="p-4 bg-[#F8F7F2] dark:bg-[#131815] font-semibold text-[#242925] dark:text-white">
                    Caution Deposit
                  </td>
                  {comparedProperties.map((prop: any) => {
                    const caution = Number(prop.cautionDeposit || 0);
                    return (
                      <td
                        key={prop.id}
                        className="p-4 border-l border-[#E7E7DF] dark:border-[#262E29] font-mono tabular-nums text-[#242925] dark:text-white"
                      >
                        {caution > 0 ? (
                          <span>{formatCedis(caution)} (Refundable)</span>
                        ) : (
                          <span className="font-sans text-[#16A34A] dark:text-emerald-400 font-medium">
                            GH₵ 0 (No Caution Fee)
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Row 3: Room Configurations */}
                <tr>
                  <td className="p-4 bg-[#F8F7F2] dark:bg-[#131815] font-semibold text-[#242925] dark:text-white">
                    Room Options
                  </td>
                  {comparedProperties.map((prop: any) => {
                    const rooms = Array.isArray(prop.rooms) ? prop.rooms : [];
                    return (
                      <td
                        key={prop.id}
                        className="p-4 border-l border-[#E7E7DF] dark:border-[#262E29]"
                      >
                        {rooms.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {rooms.slice(0, 4).map((r: any, idx: number) => (
                              <span
                                key={r.id || idx}
                                className="px-2 py-0.5 rounded bg-[#F8F7F2] dark:bg-[#1E2521] border border-[#E7E7DF] dark:border-[#2A332D] text-[11px] text-[#242925] dark:text-white"
                              >
                                {r.roomType || 'Standard'} ({formatCedis(r.price)})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#6F756F] dark:text-[#A0A8A2]">
                            Whole Unit / Standard Room
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Row 4: Included Utilities & Key Amenities */}
                <tr>
                  <td className="p-4 bg-[#F8F7F2] dark:bg-[#131815] font-semibold text-[#242925] dark:text-white">
                    Utilities &amp; Amenities
                  </td>
                  {comparedProperties.map((prop: any) => {
                    const utilities = parseStringArray(prop.includedUtilities);
                    const amenities = parseStringArray(prop.amenities);
                    const combined = Array.from(new Set([...utilities, ...amenities])).slice(0, 5);
                    return (
                      <td
                        key={prop.id}
                        className="p-4 border-l border-[#E7E7DF] dark:border-[#262E29]"
                      >
                        {combined.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {combined.map((item) => (
                              <span
                                key={item}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F4F8F5] dark:bg-[#19241E] text-[#173D32] dark:text-emerald-300 text-[11px]"
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

                {/* Row 5: Compound Rules & Gate Curfew */}
                <tr>
                  <td className="p-4 bg-[#F8F7F2] dark:bg-[#131815] font-semibold text-[#242925] dark:text-white">
                    Gate &amp; Visitor Policy
                  </td>
                  {comparedProperties.map((prop: any) => (
                    <td
                      key={prop.id}
                      className="p-4 border-l border-[#E7E7DF] dark:border-[#262E29] space-y-1 text-[#5E645E] dark:text-[#A0A8A2]"
                    >
                      <p className="flex items-center gap-1.5 text-[#242925] dark:text-white font-medium">
                        <Clock className="w-3.5 h-3.5 text-[#557A67] shrink-0" />
                        <span>{prop.gateLockTime || '24/7 Access (No Curfew)'}</span>
                      </p>
                      <p className="text-[11px]">
                        {prop.visitorPolicy || 'Day visitors allowed'}
                      </p>
                    </td>
                  ))}
                </tr>

                {/* Row 6: Landlord Verification & Rating */}
                <tr>
                  <td className="p-4 bg-[#F8F7F2] dark:bg-[#131815] font-semibold text-[#242925] dark:text-white">
                    Host Verification
                  </td>
                  {comparedProperties.map((prop: any) => (
                    <td
                      key={prop.id}
                      className="p-4 border-l border-[#E7E7DF] dark:border-[#262E29]"
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

                {/* Row 7: Action CTA */}
                <tr>
                  <td className="p-4 bg-[#F8F7F2] dark:bg-[#131815] font-semibold text-[#242925] dark:text-white">
                    Action
                  </td>
                  {comparedProperties.map((prop: any) => (
                    <td
                      key={prop.id}
                      className="p-4 border-l border-[#E7E7DF] dark:border-[#262E29]"
                    >
                      <Link
                        href={`/properties/${prop.id}`}
                        className="inline-flex items-center justify-center gap-1.5 w-full px-3.5 py-2 rounded-lg bg-[#173D32] hover:bg-[#1E4F41] text-white text-xs font-semibold transition"
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

      {/* Filter Pills, Search & Sort Bar */}
      {!isLoading && savedProperties.length > 0 && (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-[#171C19] p-3.5 rounded-[14px] border border-[#E7E7DF] dark:border-[#262E29]">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
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
                      ? 'bg-[#173D32] text-white'
                      : 'text-[#5E645E] dark:text-[#A0A8A2] hover:bg-[#F3F4F1] dark:hover:bg-[#1F2622]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-[#F1F2EE] dark:bg-[#232B26] text-[#5E645E] dark:text-[#A0A8A2]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-[#6F756F] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved homes..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-[#E7E7DF] dark:border-[#262E29] bg-[#F8F7F2] dark:bg-[#121614] text-xs text-[#242925] dark:text-white placeholder:text-[#6F756F] focus:outline-none focus:border-[#173D32]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F756F] hover:text-[#242925] dark:hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E7E7DF] dark:border-[#262E29] bg-[#F8F7F2] dark:bg-[#121614]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#557A67] shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sort saved properties"
                className="bg-transparent text-xs font-semibold text-[#242925] dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="RECENT">Sort: Recently Saved</option>
                <option value="PRICE_ASC">Price: Low to High</option>
                <option value="PRICE_DESC">Price: High to Low</option>
                <option value="RATING_DESC">Highest Rated</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Loading / Empty / Property Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : savedProperties.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-6 h-6" />}
          title="No saved properties yet"
          description="Tap the heart icon on any student hostel, studio, apartment, or residential property while browsing to save it here for side-by-side comparison."
          action={
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#173D32] hover:bg-[#1E4F41] text-white text-sm font-semibold transition-colors"
            >
              <span>Browse Properties</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          }
        />
      ) : filteredProperties.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-6 h-6" />}
          title="No matching saved properties"
          description="No properties in your shortlist match the current search or category filter."
          action={
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
          }
        />
      ) : (
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
                          ? 'bg-[#173D32] text-white border-[#173D32]'
                          : 'bg-white dark:bg-[#141816] text-[#242925] dark:text-[#F2F2EE] border-[#D4D6CE] dark:border-[#2E3832] hover:border-[#173D32]'
                      }`}
                    >
                      {isSelectedForCompare ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Comparing</span>
                        </>
                      ) : (
                        <>
                          <Scale className="w-3.5 h-3.5 text-[#557A67]" />
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
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#173D32] dark:text-emerald-400 hover:underline"
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
      )}
    </div>
  );
}
