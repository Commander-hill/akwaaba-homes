'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface BrandLoaderProps {
  /**
   * The text displayed under the logo.
   * Default: 'LOADING AKWAABA HOMES'
   */
  message?: string;
  /**
   * Whether to display as a full-screen fixed overlay (default: true).
   * If false, renders as a flexible centered container.
   */
  fullScreen?: boolean;
  /**
   * Optional custom class for the outer wrapper.
   */
  className?: string;
}

export default function BrandLoader({
  message = 'LOADING AKWAABA HOMES',
  fullScreen = true,
  className = '',
}: BrandLoaderProps) {
  const [dots, setDots] = useState('.');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '.' : prev + '.'));
    }, 450);
    return () => clearInterval(interval);
  }, []);

  // Strip any trailing dots or whitespace from the incoming message for uniform animation
  const cleanMessage = message.replace(/\.+$/, '').trim();

  const containerClasses = fullScreen
    ? 'fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#F8F7F2] dark:bg-[#0B0D12] select-none transition-colors duration-200'
    : 'min-h-[50vh] w-full flex flex-col items-center justify-center bg-transparent select-none';

  return (
    <div className={`${containerClasses} ${className}`} role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        {/* Brand Logo - Design Only (No borders, no cards) */}
        <div className="relative flex items-center justify-center">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Akwaaba Homes"
              width={96}
              height={96}
              className="w-full h-full object-contain drop-shadow-sm transition-transform duration-300"
              priority
            />
          </div>
        </div>

        {/* Clean Status Text (Uncarded) */}
        <div className="inline-flex items-center justify-center">
          <span className="text-[11px] sm:text-xs font-bold tracking-widest text-[#242925] dark:text-[#E2E8F0] uppercase">
            {cleanMessage}
          </span>
          <span className="inline-block text-[11px] sm:text-xs font-bold text-[#16A34A] dark:text-emerald-400 w-5 text-left ml-0.5">
            {dots}
          </span>
        </div>
      </div>
    </div>
  );
}
