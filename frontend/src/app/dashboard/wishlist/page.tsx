'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getGuestWishlistIds, setGuestWishlistIds } from '@/components/WishlistButton';
import {
  Heart,
  Trash2,
  ArrowRight,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import PropertyCard from '@/components/tenant-ui/PropertyCard';
import { EmptyState, PropertyCardSkeleton } from '@/components/tenant-ui/primitives';

export default function WishlistPage() {
  const queryClient = useQueryClient();
  const [guestIds, setGuestIds] = useState<string[]>([]);

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
      toast.success('Removed from saved properties');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E7E7DF] dark:border-[#262E29]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#557A67] dark:text-[#86B59C] mb-1">
            Shortlist
          </p>
          <h1 className="font-editorial text-2xl sm:text-3xl text-[#242925] dark:text-white">
            Saved Properties ({savedProperties.length})
          </h1>
          <p className="text-sm text-[#5E645E] dark:text-[#A0A8A2] mt-1">
            Compare your shortlisted hostels, studios, apartments, and houses before booking.
          </p>
        </div>

        <Link
          href="/search"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-medium transition-colors self-start sm:self-auto"
        >
          <span>Explore More Homes</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

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
            href="/login?redirect=/saved"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-medium shrink-0 self-start sm:self-center"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In to Sync</span>
          </Link>
        </div>
      )}

      {/* Loading State */}
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
          description="Tap the heart icon on any student hostel, studio, apartment, or residential property while browsing to save it here for comparison."
          action={
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-medium transition-colors"
            >
              <span>Browse Properties</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedProperties.map((prop: any) => (
            <div key={prop.id} className="flex flex-col gap-2">
              <PropertyCard property={prop} initialIsSaved={true} />
              <div className="flex items-center justify-end px-1">
                <button
                  type="button"
                  onClick={() => handleRemove(prop.id)}
                  disabled={removeMutation.isPending}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5E645E] hover:text-[#B42318] dark:text-[#A0A8A2] dark:hover:text-[#FCA5A5] transition-colors cursor-pointer py-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove from saved</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
