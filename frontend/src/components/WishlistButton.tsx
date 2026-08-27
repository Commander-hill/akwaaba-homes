'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface WishlistButtonProps {
  propertyId: string;
  initialIsSaved?: boolean;
  className?: string;
  showText?: boolean;
}

export default function WishlistButton({
  propertyId,
  initialIsSaved = false,
  className = '',
  showText = false,
}: WishlistButtonProps) {
  const queryClient = useQueryClient();
  const [isSaved, setIsSaved] = useState(initialIsSaved);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/wishlist/toggle', { propertyId });
      return data;
    },
    onMutate: () => {
      // Instant optimistic UI toggle
      setIsSaved(prev => !prev);
    },
    onSuccess: (data) => {
      setIsSaved(data.isSaved);
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success(data.message, { id: `wishlist-${propertyId}` });
    },
    onError: () => {
      // Revert on error
      setIsSaved(prev => !prev);
      toast.error('Please log in as a tenant to save properties.');
    },
  });

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        mutation.mutate();
      }}
      disabled={mutation.isPending}
      className={`group relative inline-flex items-center justify-center gap-2 p-2.5 rounded-full transition-all duration-300 ${
        isSaved
          ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105'
          : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur text-slate-600 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-900 shadow-md'
      } ${className}`}
      title={isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
    >
      <Heart
        className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${
          isSaved ? 'fill-white stroke-white' : 'stroke-current'
        }`}
      />
      {showText && (
        <span className="text-sm font-bold pr-1">
          {isSaved ? 'Saved to Wishlist' : 'Add to Wishlist'}
        </span>
      )}
    </button>
  );
}
