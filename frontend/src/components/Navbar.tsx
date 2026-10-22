'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserCircle, Menu, X, AlertTriangle, Heart, Search, CalendarCheck } from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import api from '@/lib/axios';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const pathname = usePathname() || '';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: userResponse } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
    retry: false,
  });

  const { data: publicConfig } = useQuery({
    queryKey: ['public-config'],
    queryFn: async () => {
      const { data } = await api.get('/config/public');
      return data;
    },
    refetchInterval: 60000,
  });

  const user = userResponse?.user;
  const isAuthenticated = !!user;
  const role = user?.role;
  const dashboardHref =
    role === 'LANDLORD'
      ? '/dashboard/landlord'
      : role === 'CARETAKER' || role === 'STAFF'
      ? '/dashboard/caretaker'
      : '/dashboard/tenant';

  const isLandlord = role === 'LANDLORD' || pathname.startsWith('/dashboard/landlord');
  const isStaff = role === 'CARETAKER' || role === 'STAFF' || pathname.startsWith('/dashboard/caretaker');

  // Check if current route uses the dedicated Authenticated Tenant Shell
  const isTenantShellRoute =
    pathname.startsWith('/dashboard/tenant') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/settings') ||
    (pathname.startsWith('/support') && isAuthenticated && role === 'TENANT') ||
    (pathname.startsWith('/dashboard') &&
      !pathname.startsWith('/dashboard/landlord') &&
      !pathname.startsWith('/dashboard/caretaker') &&
      (!isAuthenticated || role === 'TENANT'));

  // Do not render public Navbar on Admin portal, Auth routes, or Authenticated Tenant Shell routes
  if (
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/verify-email') ||
    pathname === '/onboarding' ||
    isTenantShellRoute
  ) {
    return null;
  }

  const navLinks = isStaff
    ? [
        { name: 'Compound Command', href: '/dashboard/caretaker' },
        { name: 'Repairs & Utilities', href: '/dashboard/caretaker?tab=maintenance' },
        { name: 'Gatehouse & Parcels', href: '/dashboard/caretaker?tab=gatehouse' },
      ]
    : isLandlord
    ? [
        { name: 'Home', href: '/' },
        { name: 'Explore', href: '/properties' },
        { name: 'My Properties', href: '/dashboard/landlord/properties' },
      ]
    : [
        { name: 'Explore', href: '/search' },
        { name: 'Hostels', href: '/search?type=HOSTEL' },
        { name: 'Apartments', href: '/search?type=APARTMENT' },
        { name: 'Saved', href: '/saved' },
        { name: 'Support', href: '/support' },
      ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all">
      {publicConfig?.maintenanceMode && (
        <div className="bg-[#8C4F0F] text-white px-4 py-1.5 text-center text-xs font-semibold flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Scheduled Maintenance Mode Active — Read-only browsing enabled.</span>
        </div>
      )}

      <nav
        aria-label="Primary Navigation"
        className={clsx(
          'transition-all duration-200 border-b relative',
          scrolled
            ? 'bg-white/95 dark:bg-[#141816]/95 backdrop-blur-md border-[#E7E7DF] dark:border-[#262E2A] shadow-[0_1px_3px_0_rgba(23,61,50,0.04)]'
            : 'bg-white dark:bg-[#141816] border-[#E7E7DF] dark:border-[#262E2A]'
        )}
      >
        <div className="container-akwaaba">
          <div className="flex justify-between h-16 items-center">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-8">
              <Link
                href="/"
                className={clsx(
                  'items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] rounded-lg',
                  pathname.startsWith('/dashboard') ? 'hidden xl:flex' : 'flex'
                )}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#173D32] flex items-center justify-center shrink-0">
                  <Image
                    src="/logo.png"
                    alt="Akwaaba Homes"
                    width={30}
                    height={30}
                    className="w-full h-full object-cover"
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-editorial text-lg tracking-tight text-[#242925] dark:text-white leading-none">
                    Akwaaba Homes
                  </span>
                  <span className="text-[10px] font-medium text-[#557A67] tracking-wider uppercase mt-0.5">
                    Trusted Homes &bull; Ghana
                  </span>
                </div>
              </Link>

              {/* Desktop Discovery Navigation */}
              <div className="hidden lg:flex items-center gap-1">
                {navLinks.map((link) => {
                  const isActive =
                    pathname === link.href ||
                    (link.href === '/search' && (pathname === '/search' || pathname === '/properties')) ||
                    (link.href === '/saved' && (pathname === '/saved' || pathname === '/dashboard/wishlist'));
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={clsx(
                        'px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]',
                        isActive
                          ? 'text-[#16A34A] dark:text-emerald-400 bg-[#EDF6F0] dark:bg-emerald-950/40'
                          : 'text-[#5E645E] hover:text-[#242925] dark:text-[#9EA69F] dark:hover:text-white hover:bg-[#F8F7F2] dark:hover:bg-[#1B211E]'
                      )}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right: Account Actions */}
            <div className="hidden md:flex items-center gap-2.5">
              <ThemeToggle isScrolled={true} />

              <div className="h-4 w-px bg-[#E7E7DF] dark:bg-[#262E2A] mx-1" />

              {isAuthenticated ? (
                <div className="flex items-center gap-2.5">
                  {role === 'TENANT' && (
                    <Link
                      href="/bookings"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#242925] dark:text-white hover:bg-[#F8F7F2] dark:hover:bg-[#1B211E] transition-colors"
                    >
                      <CalendarCheck className="w-3.5 h-3.5 text-[#557A67]" />
                      <span>Bookings</span>
                    </Link>
                  )}
                  <NotificationBell />
                  <Link
                    href={dashboardHref}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-xs font-semibold bg-[#16A34A] hover:bg-[#15803D] text-white transition-colors"
                  >
                    <UserCircle className="w-3.5 h-3.5" />
                    <span>{role === 'TENANT' ? 'My Account' : 'Dashboard'}</span>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="h-9 px-3.5 inline-flex items-center justify-center rounded-lg text-xs font-semibold text-[#242925] dark:text-white hover:bg-[#F8F7F2] dark:hover:bg-[#1B211E] transition-colors"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/register"
                    className="h-9 px-4 inline-flex items-center justify-center rounded-lg text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] transition-colors shadow-2xs"
                  >
                    Create account
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Controls */}
            <div className="md:hidden flex items-center gap-1.5">
              <Link
                href="/search"
                aria-label="Search accommodations"
                className="p-2 rounded-lg text-[#242925] dark:text-white hover:bg-[#F8F7F2] dark:hover:bg-[#1B211E]"
              >
                <Search className="w-5 h-5" />
              </Link>
              {isAuthenticated && <NotificationBell />}
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-[#242925] dark:text-white hover:bg-[#F8F7F2] dark:hover:bg-[#1B211E] cursor-pointer"
                aria-label="Toggle navigation menu"
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden fixed inset-0 top-16 z-50 flex flex-col">
            <div
              className="fixed inset-0 top-16 bg-black/40 backdrop-blur-xs"
              onClick={() => setIsMenuOpen(false)}
            />
            <div className="relative bg-white dark:bg-[#141816] border-b border-[#E7E7DF] dark:border-[#262E2A] px-5 pt-4 pb-6 space-y-4 shadow-xl">
              <div className="space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={clsx(
                      'block px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                      pathname === link.href
                        ? 'bg-[#EDF6F0] text-[#16A34A] dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'text-[#242925] dark:text-white hover:bg-[#F8F7F2] dark:hover:bg-[#1B211E]'
                    )}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>

              <div className="pt-3 border-t border-[#E7E7DF] dark:border-[#262E2A]">
                {isAuthenticated ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href={dashboardHref}
                      onClick={() => setIsMenuOpen(false)}
                      className="h-10 flex items-center justify-center text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg"
                    >
                      My Account
                    </Link>
                    <Link
                      href="/bookings"
                      onClick={() => setIsMenuOpen(false)}
                      className="h-10 flex items-center justify-center text-xs font-semibold text-[#242925] dark:text-white border border-[#E7E7DF] dark:border-[#262E2A] rounded-lg"
                    >
                      My Bookings
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="h-10 flex items-center justify-center text-xs font-semibold text-[#242925] dark:text-white border border-[#E7E7DF] dark:border-[#262E2A] rounded-lg"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsMenuOpen(false)}
                      className="h-10 flex items-center justify-center text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg"
                    >
                      Create account
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

