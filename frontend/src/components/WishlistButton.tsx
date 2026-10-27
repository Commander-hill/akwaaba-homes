'use client';

import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

const GUEST_WISHLIST_KEY = 'akwaaba_guest_wishlist';

export function getGuestWishlistIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setGuestWishlistIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(Array.from(new Set(ids))));
    window.dispatchEvent(new Event('akwaaba_wishlist_changed'));
  } catch {
    // ignore storage errors
  }
}

export interface WishlistButtonProps {
  propertyId: string;
  initialIsSaved?: boolean;
  showText?: boolean;
  className?: string;
}

export default function WishlistButton({
  propertyId,
  initialIsSaved = false,
  showText = false,
  className = '',
}: WishlistButtonProps) {
  const queryClient = useQueryClient();
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [isLoading, setIsLoading] = useState(false);

  const { data: userResponse } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const isAuthenticated = Boolean(userResponse?.user);

  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const res = await api.get('/wishlist');
      return res.data;
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (isAuthenticated && wishlistData?.savedPropertyIds) {
      setIsSaved(wishlistData.savedPropertyIds.includes(propertyId));
    } else if (!isAuthenticated) {
      const syncGuest = () => {
        const guestIds = getGuestWishlistIds();
        setIsSaved(guestIds.includes(propertyId));
      };
      syncGuest();
      window.addEventListener('akwaaba_wishlist_changed', syncGuest);
      return () => window.removeEventListener('akwaaba_wishlist_changed', syncGuest);
    }
  }, [isAuthenticated, wishlistData, propertyId]);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      const currentIds = getGuestWishlistIds();
      const exists = currentIds.includes(propertyId);
      const nextIds = exists
        ? currentIds.filter((id) => id !== propertyId)
        : [...currentIds, propertyId];
      setGuestWishlistIds(nextIds);
      setIsSaved(!exists);
      toast.success(
        exists
          ? 'Removed from saved homes'
          : 'Saved in this browser. Sign in anytime to sync across devices.'
      );
      return;
    }

    const previousState = isSaved;
    setIsSaved(!isSaved);
    setIsLoading(true);

    try {
      const res = await api.post('/wishlist/toggle', { propertyId });
      setIsSaved(res.data.isSaved);
      toast.success(res.data.isSaved ? 'Saved to your wishlist' : 'Removed from wishlist');
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    } catch (error: any) {
      setIsSaved(previousState);
      toast.error(error?.response?.data?.message || 'Failed to update saved properties');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      aria-pressed={isSaved}
      aria-label={isSaved ? 'Remove from saved properties' : 'Save property'}
      title={isSaved ? 'Remove from saved properties' : 'Save property'}
      className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 flex items-center justify-center gap-1.5 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173D32] cursor-pointer border ${
        isSaved
          ? 'bg-white/95 dark:bg-[#141816]/95 text-[#E11D48] border-[#FECDD3] dark:border-[#881337]/60 hover:bg-[#FFF1F2] dark:hover:bg-[#1F1216]'
          : 'bg-white/90 dark:bg-[#141816]/90 text-[#242925] dark:text-[#F2F2EE] border-[#E7E7DF] dark:border-[#262E2A] hover:text-[#E11D48] dark:hover:text-[#FB7185]'
      } ${showText ? 'px-3.5 py-2 rounded-xl text-xs font-semibold' : 'w-9 h-9'} ${
        isLoading ? 'opacity-60 cursor-wait' : ''
      } ${className}`}
    >
      <Heart className={`w-4 h-4 transition-transform duration-200 ${isSaved ? 'fill-current scale-110 text-[#E11D48]' : ''}`} />
      {showText && <span>{isSaved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
