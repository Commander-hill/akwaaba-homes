'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { publicGet, usePublicResource } from '@/lib/publicFetch';
import {
  MapPin,
  Home,
  BedDouble,
  Heart,
  Wifi,
  Wind,
  Zap,
} from 'lucide-react';


export interface ShowcasePropertyItem {
  id: string;
  title: string;
  location: string;
  price: number;
  rooms: number;
  type: string;
  badge: string;
  badgeColor: string;
  image: string;
  href: string;
}

const SHOWCASE_PROPERTIES: ShowcasePropertyItem[] = [
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
    href: '/properties/glacier-studio',
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
    href: '/properties/aduana-apartment',
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
    href: '/properties/executive-studio',
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
    href: '/properties/seaside-apartments',
  },
];

export default function HomeFeaturedListings({
  initialLiveListings = [],
}: {
  initialLiveListings?: any[];
}) {
  const [wishlist, setWishlist] = useState<string[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('akwaaba_wishlist');
      if (saved) {
        setWishlist(JSON.parse(saved));
      }
    } catch {
      // Ignore invalid JSON in localStorage
    }
  }, []);

  const { data: propertiesResponse } = usePublicResource(
    'homepage-properties',
    async () => {
      try {
        const data = await publicGet('/properties', { limit: 8, sort: 'newest' });
        return data;
      } catch {
        return null;
      }
    },
    {
      initialData: initialLiveListings.length > 0 ? { data: initialLiveListings } : undefined,
      staleTime: 60 * 1000,
    },
  );

  const liveListings: any[] = propertiesResponse?.data || propertiesResponse?.properties || initialLiveListings;

  const featuredCards = SHOWCASE_PROPERTIES.map((prop, index) => {
    const matchedLive =
      liveListings.find((l) => l.title?.toLowerCase().includes(prop.title.split(' ')[0].toLowerCase())) ||
      liveListings[index];
    return {
      ...prop,
      href: matchedLive?.id ? `/properties/${matchedLive.id}` : prop.href,
      liveId: matchedLive?.id || prop.id,
    };
  });

  const toggleWishlist = async (id: string, title?: string) => {
    const isRemoving = wishlist.includes(id);
    const updated = isRemoving ? wishlist.filter((x) => x !== id) : [...wishlist, id];
    setWishlist(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('akwaaba_wishlist', JSON.stringify(updated));
    }
    const { toast } = await import('react-hot-toast');
    toast.success(
      isRemoving
        ? `Removed ${title || 'property'} from saved homes`
        : `Saved ${title || 'property'} to your wishlist`
    );
    try {
      const { default: api } = await import('@/lib/axios');
      if (isRemoving) {
        await api.delete(`/wishlist/${id}`);
      } else {
        await api.post(`/wishlist/${id}`);
      }
    } catch {
      // Guest user wishlist is persisted in localStorage
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {featuredCards.map((prop) => (
        <Link prefetch={false}
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
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />

            {/* Badge (top left) */}
            <div
              className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs text-white ${
                prop.badgeColor === 'orange'
                  ? 'bg-[#B45309]'
                  : 'bg-[#15803D]'
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
              aria-label={wishlist.includes(prop.liveId) ? `Remove ${prop.title} from wishlist` : `Save ${prop.title} to wishlist`}
              onClick={(e) => {
                e.preventDefault();
                toggleWishlist(prop.liveId, prop.title);
              }}
              className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/95 dark:bg-zinc-900/95 flex items-center justify-center shadow-xs hover:scale-110 transition cursor-pointer"
            >
              <Heart
                className={`w-3.5 h-3.5 transition ${
                  wishlist.includes(prop.liveId)
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
                GH<span style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>₵</span> {Number(prop.price).toLocaleString()}<span className="text-[10px] font-normal opacity-80">/mo</span>
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
  );
}
