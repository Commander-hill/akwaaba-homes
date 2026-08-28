'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import Link from 'next/link';
import { Heart, MapPin, Building, ShieldCheck, Loader2, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';
import WishlistButton from '@/components/WishlistButton';

export default function WishlistPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const res = await api.get('/wishlist');
      return res.data;
    },
    retry: 1,
  });

  const rawProperties = data?.properties || [];

  // Parse images safely
  const properties = rawProperties.map((property: any) => {
    let images: string[] = [];
    if (Array.isArray(property.images)) {
      images = property.images;
    } else if (typeof property.images === 'string') {
      try {
        const parsed = JSON.parse(property.images);
        images = Array.isArray(parsed) ? parsed : [property.images];
      } catch {
        images = property.images ? [property.images] : [];
      }
    }
    return { ...property, images };
  });

  return (
    <div className="min-h-screen bg-[var(--background)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-6 border-b border-[var(--border)]">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-xs font-bold mb-2">
              <Heart className="w-3.5 h-3.5 fill-rose-500" /> Saved Favorites
            </div>
            <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">My Wishlist</h1>
            <p className="text-[var(--muted-foreground)] mt-1">Keep track of properties you like and compare before booking.</p>
          </div>
          
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-bold text-sm shadow-md hover:bg-[var(--primary-hover)] transition-all"
          >
            Browse More Properties <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-rose-500 mb-4" />
            <p className="text-[var(--muted-foreground)]">Loading your saved properties...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-8 rounded-3xl text-center border border-red-200 dark:border-red-900/40 max-w-lg mx-auto my-12 shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto text-red-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Unable to load wishlist</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {(error as any)?.response?.data?.message || 'Please verify your tenant account session and try refreshing.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Try Again
              </button>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Log In
              </Link>
            </div>
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-[var(--border)] shadow-sm max-w-lg mx-auto my-12">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-500">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Your wishlist is empty</h3>
            <p className="text-[var(--muted-foreground)] mb-6 text-sm">
              Click the heart icon on any property card to save your favorite hostels and apartments here.
            </p>
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-bold text-sm shadow-md hover:bg-[var(--primary-hover)] transition-all"
            >
              Explore Properties
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {properties.map((property: any) => (
              <div key={property.id} className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-[var(--border)] shadow-sm hover:shadow-xl transition-all duration-300">
                <div className="h-48 bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
                  {property.images && property.images.length > 0 ? (
                    <img 
                      src={getImageUrl(property.images[0])} 
                      alt={property.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[var(--muted-foreground)]">
                      <Building className="w-12 h-12 opacity-50" />
                    </div>
                  )}
                  
                  <div className="absolute top-4 right-4 z-10">
                    <WishlistButton propertyId={property.id} initialIsSaved={true} />
                  </div>

                  {property.landlord?.isVerifiedLandlord && (
                    <div className="absolute top-4 left-4 bg-blue-600 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified Host
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-[var(--foreground)] line-clamp-1 leading-tight group-hover:text-[var(--primary)] transition-colors mb-1">
                    {property.title}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] mb-3">
                    <MapPin className="w-4 h-4 text-[var(--secondary)]" />
                    {property.location}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">{property.type || 'Hostel'}</span>
                  </div>

                  <div className="mt-auto pt-4 border-t border-[var(--border)] flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[var(--muted-foreground)] font-semibold block mb-0.5">Starting from</span>
                      <span className="text-xl font-extrabold text-[var(--foreground)]">GHS {property.price?.toLocaleString()}</span>
                    </div>
                    <Link
                      href={`/properties/${property.id}`}
                      className="text-white text-sm font-bold bg-[var(--primary)] px-4 py-2 rounded-xl hover:bg-[var(--primary-hover)] transition-colors shadow-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

