'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Users, BedDouble } from 'lucide-react';
import PropertyImage from '@/components/PropertyImage';
import WishlistButton from '@/components/WishlistButton';
import {
  PriceDisplay,
  RatingSummary,
  VerificationIndicator,
  StatusBadge,
} from './primitives';

export interface PropertyCardData {
  id: string;
  title: string;
  location: string;
  type?: string;
  price: number | string;
  billingCycle?: string;
  images?: string[] | string;
  amenities?: string[] | string;
  capacity?: number;
  isAvailable?: boolean;
  avgRating?: number | null;
  reviewCount?: number | null;
  landlord?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    isVerifiedLandlord?: boolean;
  } | null;
  rooms?: Array<{
    id: string;
    name?: string;
    price?: number;
    capacity?: number;
    isAvailable?: boolean;
    availableBeds?: number;
  }>;
}

export function formatPropertyTypeLabel(type?: string): string {
  const upper = (type || 'APARTMENT').toUpperCase();
  switch (upper) {
    case 'HOSTEL':
      return 'Student Hostel';
    case 'APARTMENT':
      return 'Apartment';
    case 'STUDIO':
      return 'Studio';
    case 'SINGLE_ROOM':
    case 'ROOM':
      return 'Private Room';
    case 'SHARED':
    case 'SHARED_ROOM':
      return 'Shared Room';
    case 'HOMESTAY':
    case 'SHORT_STAY':
      return 'Homestay';
    case 'HOUSE':
      return 'Residential House';
    default:
      return type ? type.replace(/_/g, ' ') : 'Residence';
  }
}

export function parseStringArray(val: string[] | string | undefined | null): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export default function PropertyCard({
  property,
  initialIsSaved,
  onRemoveWishlist,
  footerSlot,
}: {
  property: PropertyCardData;
  initialIsSaved?: boolean;
  onRemoveWishlist?: (id: string) => void;
  footerSlot?: React.ReactNode;
}) {
  const images = parseStringArray(property.images);
  const primaryImage = images[0] || '';
  const amenities = parseStringArray(property.amenities).slice(0, 3);

  const availableRooms = Array.isArray(property.rooms)
    ? property.rooms.filter((r) => r.isAvailable !== false)
    : [];

  const isPropertyAvailable =
    property.isAvailable !== false &&
    (!Array.isArray(property.rooms) || property.rooms.length === 0 || availableRooms.length > 0);

  // Determine lowest starting price if rooms have distinct prices
  const displayPrice =
    availableRooms.length > 0
      ? Math.min(
          ...availableRooms
            .map((r) => Number(r.price || property.price || 0))
            .filter((p) => p > 0),
          Number(property.price || 0)
        )
      : Number(property.price || 0);

  return (
    <article className="group relative bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] rounded-xl overflow-hidden transition-all duration-200 hover:border-[#C5C5B8] dark:hover:border-[#36423B] hover:shadow-[0_8px_24px_-6px_rgba(23,61,50,0.08)] flex flex-col h-full">
      {/* Favorite / Wishlist Control — Placed outside <Link> for valid WCAG 2.2 AA semantics */}
      <div className="absolute top-3 right-3 z-20">
        <WishlistButton
          propertyId={property.id}
          initialIsSaved={initialIsSaved}
          className="hover:scale-105 transition-transform"
        />
      </div>

      <Link
        href={`/properties/${property.id}`}
        className="flex flex-col flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#173D32]"
      >
        {/* 4:3 Image Container */}
        <div className="relative aspect-[4/3] w-full bg-[#F1EFE8] dark:bg-[#1B211E] overflow-hidden shrink-0">
          <PropertyImage
            src={primaryImage}
            alt={`${property.title} in ${property.location}`}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
          />

          {/* Subtle Top-Left Accommodation Type Pill */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
            <span className="px-2.5 py-1 rounded-md bg-white/95 dark:bg-[#141816]/95 backdrop-blur-xs text-[#242925] dark:text-[#F2F2EE] text-[11px] font-semibold border border-[#E7E7DF]/80 dark:border-[#262E2A] shadow-2xs">
              {formatPropertyTypeLabel(property.type)}
            </span>
          </div>

          {/* Bottom-Left Availability Status */}
          <div className="absolute bottom-3 left-3 z-10">
            {isPropertyAvailable ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#173D32]/90 backdrop-blur-xs text-white text-[11px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#74C69D]" />
                {availableRooms.length > 0
                  ? `${availableRooms.length} ${availableRooms.length === 1 ? 'unit' : 'units'} open`
                  : 'Available'}
              </span>
            ) : (
              <StatusBadge status="FULL" size="xs" />
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
          <div className="space-y-2">
            {/* Row 1: Location & Rating */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-xs text-[#6F756F] dark:text-[#9EA69F] min-w-0">
                <MapPin className="w-3.5 h-3.5 text-[#557A67] shrink-0" aria-hidden="true" />
                <span className="truncate font-medium">{property.location}</span>
              </div>
              <RatingSummary
                avgRating={property.avgRating}
                reviewCount={property.reviewCount}
                showNewLabel={false}
              />
            </div>

            {/* Row 2: Property Title */}
            <h3 className="text-base font-bold text-[#242925] dark:text-[#F2F2EE] group-hover:text-[#173D32] dark:group-hover:text-emerald-400 transition-colors line-clamp-1 leading-snug">
              {property.title}
            </h3>

            {/* Row 3: Genuine Amenities or Room Capacity Metadata */}
            <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
              {property.capacity && property.capacity > 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#6F756F] dark:text-[#9EA69F] bg-[#F8F7F2] dark:bg-[#1B211E] px-2 py-0.5 rounded border border-[#E7E7DF] dark:border-[#262E2A]">
                  <Users className="w-3 h-3 text-[#557A67]" aria-hidden="true" />
                  <span>Up to {property.capacity}</span>
                </span>
              ) : null}
              {Array.isArray(property.rooms) && property.rooms.length > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#6F756F] dark:text-[#9EA69F] bg-[#F8F7F2] dark:bg-[#1B211E] px-2 py-0.5 rounded border border-[#E7E7DF] dark:border-[#262E2A]">
                  <BedDouble className="w-3 h-3 text-[#557A67]" aria-hidden="true" />
                  <span>
                    {property.rooms.length} {property.rooms.length === 1 ? 'room type' : 'room types'}
                  </span>
                </span>
              )}
              {amenities.slice(0, 2).map((amenity) => (
                <span
                  key={amenity}
                  className="text-[11px] text-[#6F756F] dark:text-[#9EA69F] bg-[#F8F7F2] dark:bg-[#1B211E] px-2 py-0.5 rounded border border-[#E7E7DF] dark:border-[#262E2A] truncate max-w-[120px]"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </div>

          {/* Row 4: Price & Host Verification Footer */}
          <div className="pt-3 border-t border-[#E7E7DF] dark:border-[#262E2A] flex items-center justify-between gap-2">
            <PriceDisplay
              amount={displayPrice}
              propertyType={property.type}
              billingCycle={property.billingCycle || (property as any).pricePeriod}
              size="md"
            />
            <VerificationIndicator
              isVerifiedLandlord={property.landlord?.isVerifiedLandlord}
              showUnverified={true}
              size="xs"
            />
          </div>
        </div>
      </Link>
      {footerSlot && (
        <div className="px-4 sm:px-5 py-2.5 bg-[#F8F7F2]/80 dark:bg-[#191E1B] border-t border-[#E7E7DF] dark:border-[#262E2A]">
          {footerSlot}
        </div>
      )}
    </article>
  );
}
