'use client';

import React from 'react';

export type GhanaCarrierType = 'MTN' | 'Telecel' | 'AT' | 'Glo';

interface GhanaCarrierLogoProps {
  carrier: GhanaCarrierType;
  className?: string;
  showLabel?: boolean;
}

export function MtnLogoBadge({ className = '' }: { className?: string }) {
  return (
    <div
      title="MTN Ghana (MoMo)"
      className={`inline-flex items-center justify-center h-[22px] px-2 rounded-md bg-[#FFCC00] text-black shadow-2xs border border-amber-300 select-none ${className}`}
    >
      <svg viewBox="0 0 44 20" className="h-3.5 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="22" cy="10" rx="20" ry="8.5" stroke="#000000" strokeWidth="2" fill="none" />
        <text
          x="22"
          y="13.5"
          textAnchor="middle"
          fill="#000000"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="10.5"
          letterSpacing="-0.4px"
        >
          MTN
        </text>
      </svg>
    </div>
  );
}

export function TelecelLogoBadge({ className = '' }: { className?: string }) {
  return (
    <div
      title="Telecel Ghana (Telecel Cash)"
      className={`inline-flex items-center justify-center h-[22px] px-2 rounded-md bg-[#E60000] text-white shadow-2xs border border-red-600 select-none ${className}`}
    >
      <svg viewBox="0 0 52 18" className="h-3.5 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text
          x="26"
          y="13"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="10.5"
          letterSpacing="-0.3px"
        >
          telecel
        </text>
      </svg>
    </div>
  );
}

export function AtLogoBadge({ className = '' }: { className?: string }) {
  return (
    <div
      title="AT Ghana (AT Money)"
      className={`inline-flex items-center justify-center h-[22px] px-2 rounded-md bg-[#003882] text-white shadow-2xs border border-blue-900 select-none ${className}`}
    >
      <svg viewBox="0 0 32 18" className="h-3.5 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text
          x="12"
          y="13.5"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="12"
          letterSpacing="-0.5px"
        >
          at
        </text>
        <circle cx="23" cy="7" r="2.3" fill="#E60000" />
      </svg>
    </div>
  );
}

export function GloLogoBadge({ className = '' }: { className?: string }) {
  return (
    <div
      title="Glo Ghana"
      className={`inline-flex items-center justify-center h-[22px] px-2 rounded-md bg-[#00843D] text-white shadow-2xs border border-emerald-700 select-none ${className}`}
    >
      <svg viewBox="0 0 32 18" className="h-3.5 w-auto" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text
          x="16"
          y="13.5"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          fontWeight="900"
          fontSize="11.5"
          letterSpacing="-0.2px"
        >
          glo
        </text>
      </svg>
    </div>
  );
}

export default function GhanaCarrierLogo({ carrier, className = '' }: GhanaCarrierLogoProps) {
  switch (carrier) {
    case 'MTN':
      return <MtnLogoBadge className={className} />;
    case 'Telecel':
      return <TelecelLogoBadge className={className} />;
    case 'AT':
      return <AtLogoBadge className={className} />;
    case 'Glo':
      return <GloLogoBadge className={className} />;
    default:
      return null;
  }
}
