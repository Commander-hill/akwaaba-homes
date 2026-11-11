'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function PublicFooter() {
  return (
    <footer className="bg-[#0E1A15] dark:bg-[#09110E] border-t border-[#1E352B] dark:border-[#1A2922] text-[#E6EAE7]">
      <div className="container-akwaaba py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-[#1E3329] dark:border-[#182620]">
          {/* Column 1: Brand & Mission (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link prefetch={false} href="/" className="inline-flex items-center gap-3 group">
              <div className="w-11 h-11 flex items-center justify-center shrink-0">
                <Image
                  src="/logo.png"
                  alt="AkwaabaHomes"
                  width={44}
                  height={44}
                  className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tight text-white block leading-none">
                  AkwaabaHomes
                </span>
                <span className="text-[11px] text-[#6EE7B7] font-medium block mt-0.5">
                  Live Well. Feel at Home.
                </span>
              </div>
            </Link>
            <p className="text-xs sm:text-sm text-[#9FB0A7] leading-relaxed max-w-sm">
              A Ghana-focused accommodation marketplace helping students, professionals, and families discover, evaluate, and book verified rentals with transparent terms.
            </p>
          </div>

          {/* Column 2: Explore Accommodations (3 cols) */}
          <div className="lg:col-span-3 space-y-3.5">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/90">
              Discover Accommodation
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#9FB0A7]">
              <li>
                <Link prefetch={false} href="/search" className="hover:text-[#6EE7B7] transition-colors">
                  All Properties
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/search?type=HOSTEL" className="hover:text-[#6EE7B7] transition-colors">
                  Hostels &amp; Co-Living Spaces
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/search?type=APARTMENT" className="hover:text-[#6EE7B7] transition-colors">
                  Apartments &amp; Studios
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/search?type=SINGLE_ROOM" className="hover:text-[#6EE7B7] transition-colors">
                  Private &amp; Shared Rooms
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/saved" className="hover:text-[#6EE7B7] transition-colors">
                  Saved Properties
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resident Account (3 cols) */}
          <div className="lg:col-span-3 space-y-3.5">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/90">
              Resident Portal
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#9FB0A7]">
              <li>
                <Link prefetch={false} href="/dashboard/tenant" className="hover:text-[#6EE7B7] transition-colors">
                  Resident Dashboard
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/bookings" className="hover:text-[#6EE7B7] transition-colors">
                  My Bookings
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/profile" className="hover:text-[#6EE7B7] transition-colors">
                  Account &amp; Profile Settings
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/login" className="hover:text-[#6EE7B7] transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/register" className="hover:text-[#6EE7B7] transition-colors">
                  Create an Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Support & Policies (2 cols) */}
          <div className="lg:col-span-2 space-y-3.5">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/90">
              Support &amp; Legal
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#9FB0A7]">
              <li>
                <Link prefetch={false} href="/support" className="hover:text-[#6EE7B7] transition-colors">
                  Support &amp; Issue Reporting
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/help" className="hover:text-[#6EE7B7] transition-colors">
                  Help Center &amp; FAQ
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/about" className="hover:text-[#6EE7B7] transition-colors">
                  About Akwaaba Homes
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/terms" className="hover:text-[#6EE7B7] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link prefetch={false} href="/privacy" className="hover:text-[#6EE7B7] transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal & Market Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7D9187]">
          <p>&copy; {new Date().getFullYear()} Akwaaba Homes Ghana. All rights reserved.</p>
          <p className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[#9FB0A7]">All prices displayed in Ghanaian Cedis (GH<span style={{ fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>₵</span>)</span>
            <span className="text-[#3A5247]">&bull;</span>
            <span>Accra &bull; Kumasi &bull; Cape Coast &bull; Takoradi</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
