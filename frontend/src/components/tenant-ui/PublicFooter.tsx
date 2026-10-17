'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function PublicFooter() {
  return (
    <footer className="bg-white dark:bg-[#111513] border-t border-[#E7E7DF] dark:border-[#262E2A] text-[#242925] dark:text-[#F2F2EE]">
      <div className="container-akwaaba py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-[#E7E7DF] dark:border-[#262E2A]">
          {/* Column 1: Brand & Mission (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#173D32] flex items-center justify-center shrink-0">
                <Image
                  src="/logo.png"
                  alt="Akwaaba Homes"
                  width={28}
                  height={28}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="font-editorial text-lg tracking-tight text-[#242925] dark:text-white block leading-none">
                  Akwaaba Homes
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#557A67] font-semibold block mt-0.5">
                  Trusted Homes for Students &amp; Residents
                </span>
              </div>
            </Link>
            <p className="text-xs sm:text-sm text-[#6F756F] dark:text-[#9EA69F] leading-relaxed max-w-sm">
              A Ghana-focused accommodation marketplace helping students, professionals, and families discover, evaluate, and book verified rentals with transparent terms.
            </p>
          </div>

          {/* Column 2: Explore Accommodations (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#242925] dark:text-white">
              Discover Accommodation
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-[#6F756F] dark:text-[#9EA69F]">
              <li>
                <Link href="/search" className="hover:text-[#173D32] dark:hover:text-white transition-colors">
                  All Properties
                </Link>
              </li>
              <li>
                <Link href="/search?type=HOSTEL" className="hover:text-[#173D32] dark:hover:text-white transition-colors">
                  University &amp; Student Hostels
                </Link>
              </li>
              <li>
                <Link href="/search?type=APARTMENT" className="hover:text-[#173D32] dark:hover:text-white transition-colors">
                  Apartments &amp; Studios
                </Link>
              </li>
              <li>
                <Link href="/search?type=SINGLE_ROOM" className="hover:text-[#173D32] dark:hover:text-white transition-colors">
                  Private &amp; Shared Rooms
                </Link>
              </li>
              <li>
                <Link href="/saved" className="hover:text-[#173D32] dark:hover:text-white transition-colors">
                  Saved Properties
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resident Account (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#242925] dark:text-white">
              Resident Portal
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-[#6F756F] dark:text-[#9EA69F]">
              <li>
                <Link href="/dashboard/tenant" className="hover:text-[#173D32] dark:hover:text-white transition-colors">
                  Resident Dashboard
                </Link>
              </li>
              <li>
                <Link href="/bookings" className="hover:text-[#173D32] dark:hover:text-white transition-colors">
                  Bookings &amp; Escrow Status
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-[#173D32] dark:hover:text-white transition-colors">
                  Account &amp; Profile Settings
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#173D32] dark:hover:text-white transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-[#173D32] dark:hover:text-white transition-colors">
                  Create an Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Support & Policies (2 cols) */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#242925] dark:text-white">
              Support &amp; Legal
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-[#6F756F] dark:text-[#9EA69F]">
              <li>
                <Link href="/support" className="hover:text-[#173D32] dark:hover:text-white transition-colors">
                  Support &amp; Issue Reporting
                </Link>
              </li>
              <li>
                <Link href="/help" className="hover:text-[#173D32] dark:hover:text-white transition-colors">
                  Help Center &amp; FAQ
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#173D32] dark:hover:text-white transition-colors">
                  About Akwaaba Homes
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#173D32] dark:hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#173D32] dark:hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal & Market Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6F756F] dark:text-[#9EA69F]">
          <p>&copy; {new Date().getFullYear()} Akwaaba Homes Ghana. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span>All prices displayed in Ghanaian Cedis (GH₵)</span>
            <span>&bull;</span>
            <span>Accra &bull; Kumasi &bull; Cape Coast &bull; Takoradi</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
