'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getGuestWishlistIds, setGuestWishlistIds } from '@/components/WishlistButton';
import {
  Heart,
  MapPin,
  Trash2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const queryClient = useQueryClient();
  const [guestIds, setGuestIds] = useState<string[]>([]);

  const { data: userResponse, isLoading: isAuthLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const isAuthenticated = Boolean(userResponse?.user);

  useEffect(() => {
    if (!isAuthenticated) {
      const sync = () => setGuestIds(getGuestWishlistIds());
      sync();
      window.addEventListener('akwaaba_wishlist_changed', sync);
      return () => window.removeEventListener('akwaaba_wishlist_changed', sync);
    }
  }, [isAuthenticated]);

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
    onSuccess: () => {
      toast.success('Removed from saved properties');
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: () => {
      toast.error('Failed to remove property');
    },
  });

  const handleRemove = (propertyId: string) => {
    if (!isAuthenticated) {
      const next = guestIds.filter((id) => id !== propertyId);
      setGuestWishlistIds(next);
      setGuestIds(next);
      toast.success('Removed from saved homes');
      return;
    }
    removeMutation.mutate(propertyId);
  };

  const savedProperties: any[] = isAuthenticated
    ? authWishlistData?.properties ||
      (authWishlistData?.wishlists || []).map((w: any) => w.property).filter(Boolean)
    : guestCatalogData || [];

  const isLoading =
    isAuthLoading ||
    (isAuthenticated ? isAuthWishlistLoading : guestIds.length > 0 && isGuestCatalogLoading);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0B0D12] pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 w-56 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-80 rounded-2xl bg-white dark:bg-[#12151E] border border-zinc-200 dark:border-zinc-800 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0B0D12] text-zinc-900 dark:text-zinc-100 pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#0F5132] dark:text-emerald-400 font-semibold mb-1.5">
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Shortlist &amp; Saved Homes</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-950 dark:text-white tracking-tight">
              Saved Accommodations ({savedProperties.length})
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Compare your shortlisted hostels, apartments, and residential properties before booking.
            </p>
          </div>

          <Link
            href="/properties"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-bold transition-colors self-start sm:self-auto"
          >
            <span>Explore More Homes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Guest Persistence Notice */}
        {!isAuthenticated && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white">
                  Saved in your current browser session
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                  Sign in or create an account to permanently save your shortlist and access it on any device.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold shrink-0 self-start sm:self-center"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In to Sync</span>
            </Link>
          </div>
        )}

        {/* Saved Properties Grid or Empty State */}
        {savedProperties.length === 0 ? (
          <div className="bg-white dark:bg-[#12151E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center max-w-xl mx-auto my-8">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4 text-zinc-400">
              <Heart className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-zinc-950 dark:text-white mb-1.5">
              Your saved shortlist is empty
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Tap the heart icon on any student hostel, studio, or residential apartment while browsing to save it here for quick comparison.
            </p>
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0F5132] hover:bg-[#0b3e26] text-white font-bold text-xs rounded-xl transition-colors"
            >
              <span>Browse Accommodations</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedProperties.map((prop: any) => {
              const images = Array.isArray(prop.images) ? prop.images : [];
              const imageUrl =
                images.length > 0
                  ? images[0]
                  : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';
              const isUnavailable = prop.isAvailable === false || prop.remainingCapacity === 0;

              return (
                <article
                  key={prop.id}
                  className="bg-white dark:bg-[#12151E] border border-zinc-200/90 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xs hover:shadow-md transition-all"
                >
                  <div>
                    <div className="relative h-52 w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                      <Image
                        src={imageUrl}
                        alt={prop.title || 'Saved Property'}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pr-12">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-zinc-900/80 text-white backdrop-blur-md">
                          {prop.type?.replace(/_/g, ' ') || 'RESIDENCE'}
                        </span>
                        {prop.landlord?.isVerifiedLandlord && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#0F5132]/90 text-white backdrop-blur-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                            Verified Host
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemove(prop.id)}
                        disabled={removeMutation.isPending}
                        aria-label={`Remove ${prop.title} from saved homes`}
                        title="Remove from saved homes"
                        className="absolute top-3 right-3 p-2.5 bg-red-600/90 hover:bg-red-600 text-white rounded-full backdrop-blur-md transition-colors shadow-md cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold backdrop-blur-md ${
                            isUnavailable ? 'bg-red-950/90 text-red-200' : 'bg-black/65 text-white'
                          }`}
                        >
                          {isUnavailable ? 'Currently Unavailable' : 'Available'}
                        </span>
                        <span className="font-mono font-extrabold text-white text-sm bg-black/65 backdrop-blur-md px-2.5 py-0.5 rounded-md">
                          GH₵ {Number(prop.price || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <h2 className="text-base font-bold text-zinc-950 dark:text-white line-clamp-1 mb-1">
                        {prop.title}
                      </h2>
                      <p className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 mb-3 line-clamp-1">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        {prop.location}
                      </p>

                      {Array.isArray(prop.amenities) && prop.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {prop.amenities.slice(0, 3).map((a: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px]"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                    <Link
                      href={`/properties/${prop.id}`}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>View Property Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
