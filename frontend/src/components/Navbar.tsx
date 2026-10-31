'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  UserCircle, Menu, X, AlertTriangle, CalendarCheck,
  ChevronDown, Moon, Bell
} from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import api from '@/lib/axios';
import NotificationBell from './NotificationBell';

const PUBLIC_NAV_LINKS = [
  { name: 'Home', href: '/' },
  { name: 'Explore', href: '/properties', hasDropdown: true },
  { name: 'Neighborhoods', href: '/search', hasDropdown: true },
  { name: 'Services', href: '/about', hasDropdown: true },
  { name: 'About', href: '/about', hasDropdown: true },
  { name: 'Support', href: '/support', hasDropdown: true },
];

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

  // Staff/Caretaker and Landlord get their own nav links
  const staffNavLinks = [
    { name: 'Compound Command', href: '/dashboard/caretaker', hasDropdown: false },
    { name: 'Repairs & Utilities', href: '/dashboard/caretaker?tab=maintenance', hasDropdown: false },
    { name: 'Gatehouse & Parcels', href: '/dashboard/caretaker?tab=gatehouse', hasDropdown: false },
  ];

  const landlordNavLinks = [
    { name: 'Home', href: '/', hasDropdown: false },
    { name: 'Explore', href: '/properties', hasDropdown: true },
    { name: 'My Properties', href: '/dashboard/landlord/properties', hasDropdown: false },
  ];

  const navLinks = isStaff ? staffNavLinks : isLandlord ? landlordNavLinks : PUBLIC_NAV_LINKS;

  const userFullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'My Account';

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
          'border-b transition-all duration-200',
          scrolled
            ? 'bg-white/95 dark:bg-[#0C0F0E]/95 backdrop-blur-md border-[#E7E7DF] dark:border-[#262E2A] shadow-xs'
            : 'bg-white dark:bg-[#141816] border-[#E7E7DF] dark:border-[#262E2A]'
        )}
      >
        <div className="container-akwaaba">
          <div className="flex justify-between h-16 items-center">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className={clsx(
                  'items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] rounded-lg',
                  pathname.startsWith('/dashboard') ? 'hidden xl:flex' : 'flex'
                )}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
                  <Image
                    src="/logo.png"
                    alt="AkwaabaHomes"
                    width={44}
                    height={44}
                    className="w-full h-full object-contain hidden dark:block transition-transform duration-300 group-hover:scale-105"
                    priority
                  />
                  <Image
                    src="/logo-light.png"
                    alt="AkwaabaHomes"
                    width={44}
                    height={44}
                    className="w-full h-full object-contain block dark:hidden transition-transform duration-300 group-hover:scale-105"
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-base tracking-tight text-[#242925] dark:text-white leading-none">
                    AkwaabaHomes
                  </span>
                  <span className="text-[10px] font-medium text-[#557A67] dark:text-emerald-600 mt-0.5">
                    Live Well. Feel at Home.
                  </span>
                </div>
              </Link>

              {/* Desktop Navigation Links */}
              <div className="hidden lg:flex items-center gap-0.5">
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
                        'inline-flex items-center gap-0.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]',
                        isActive
                          ? 'text-[#16A34A] dark:text-emerald-400 bg-[#EDF6F0] dark:bg-emerald-950/40 border border-[#16A34A]/30'
                          : 'text-[#5E645E] hover:text-[#242925] dark:text-[#9EA69F] dark:hover:text-white hover:bg-[#F8F7F2] dark:hover:bg-[#1B211E]'
                      )}
                    >
                      {link.name}
                      {link.hasDropdown && !isActive && (
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right: Account Actions */}
            <div className="hidden md:flex items-center gap-2">
              {/* Theme Moon Toggle */}
              <button
                type="button"
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                aria-label="Toggle dark mode"
              >
                <Moon className="w-4 h-4" />
              </button>

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  {/* Bookings Button */}
                  {(role === 'TENANT' || !role) && (
                    <Link
                      href="/bookings"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-[#242925] dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <CalendarCheck className="w-3.5 h-3.5 text-[#557A67]" />
                      <span>Bookings</span>
                    </Link>
                  )}

                  {/* Notification Bell */}
                  <NotificationBell />

                  {/* My Account Button with Avatar */}
                  <Link
                    href={dashboardHref}
                    className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-xs font-semibold bg-[#0F5A3E] hover:bg-[#0B432E] text-white transition-colors shadow-xs"
                  >
                    {user?.avatarUrl ? (
                      <div className="w-5 h-5 rounded-full overflow-hidden border border-white/20 shrink-0 relative">
                        <Image
                          src={user.avatarUrl}
                          alt={userFullName}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <UserCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{role === 'TENANT' ? 'My Account' : 'Dashboard'}</span>
                    <ChevronDown className="w-3 h-3 opacity-80 shrink-0" />
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Bookings Button (guest) */}
                  <Link
                    href="/bookings"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-[#242925] dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-[#557A67]" />
                    <span>Bookings</span>
                  </Link>

                  {/* Notification Bell (guest shows badge 3 like mockup) */}
                  <Link
                    href="/login"
                    className="relative p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#E0533C] text-white text-[9px] font-bold flex items-center justify-center">
                      3
                    </span>
                  </Link>

                  {/* My Account button */}
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-xs font-semibold bg-[#0F5A3E] hover:bg-[#0B432E] text-white transition-colors shadow-xs"
                  >
                    <UserCircle className="w-4 h-4" />
                    <span>My Account</span>
                    <ChevronDown className="w-3 h-3 opacity-80" />
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Controls */}
            <div className="md:hidden flex items-center gap-1.5">
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
                      className="h-10 flex items-center justify-center text-xs font-semibold text-white bg-[#0F5A3E] hover:bg-[#0B432E] rounded-lg"
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
                      className="h-10 flex items-center justify-center text-xs font-semibold text-white bg-[#0F5A3E] hover:bg-[#0B432E] rounded-lg"
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
