'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
type IconProps = { className?: string };
const UserCircle = ({ className }: IconProps) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>);
const Menu = ({ className }: IconProps) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>);
const X = ({ className }: IconProps) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>);
const AlertTriangle = ({ className }: IconProps) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>);
const CalendarCheck = ({ className }: IconProps) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/></svg>);
const ChevronDown = ({ className }: IconProps) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>);
const Moon = ({ className }: IconProps) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>);
const Sun = ({ className }: IconProps) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>);
const Bell = ({ className }: IconProps) => (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>);
import clsx from 'clsx';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { publicGet, usePublicResource } from '@/lib/publicFetch';
import { getImageUrl } from '@/lib/imageUrl';

const NotificationBell = dynamic(() => import('./NotificationBell'), { ssr: false });
const NavbarMobileDrawer = dynamic(() => import('./NavbarMobileDrawer'), { ssr: false });

const PUBLIC_NAV_LINKS = [
  { name: 'Home', href: '/' },
  { name: 'Explore', href: '/properties', hasDropdown: false },
  { name: 'Neighborhoods', href: '/search', hasDropdown: false },
  { name: 'Services', href: '/services', hasDropdown: false },
  { name: 'About', href: '/about', hasDropdown: false },
  { name: 'Support', href: '/support', hasDropdown: false },
];

export default function Navbar() {
  const pathname = usePathname() || '';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHiddenRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/settings') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/verify-email') ||
    pathname === '/onboarding' ||
    pathname === '/services' ||
    pathname.startsWith('/support') ||
    pathname.startsWith('/help');

  const { data: userResponse } = usePublicResource(
    'auth/session',
    () => publicGet('/auth/session'),
    {
      enabled: !isHiddenRoute,
      staleTime: 5 * 60 * 1000,
    },
  );

  const { data: publicConfig } = usePublicResource(
    'public-config',
    () => publicGet('/config/public'),
    {
      enabled: !isHiddenRoute,
      refetchInterval: 60000,
    },
  );

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

  if (isHiddenRoute) {
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
    <header className="fixed top-0 left-0 right-0 z-50">
      {publicConfig?.maintenanceMode && (
        <div className="bg-[#8C4F0F] text-white px-4 py-1.5 text-center text-xs font-semibold flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Scheduled Maintenance Mode Active — Read-only browsing enabled.</span>
        </div>
      )}

      <nav
        aria-label="Primary Navigation"
        className={clsx(
          'border-b transition-colors duration-150',
          scrolled
            ? 'bg-white/95 dark:bg-[#0C0F0E]/95 backdrop-blur-md border-zinc-200 dark:border-zinc-800 shadow-xs'
            : 'bg-white dark:bg-[#141816] border-zinc-200 dark:border-zinc-800'
        )}
      >
        <div className="container-akwaaba">
          <div className="flex justify-between h-16 items-center">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-6">
              <Link prefetch={false}
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
                    loading="lazy"
                    className="w-full h-full object-contain hidden dark:block transition-transform duration-300 group-hover:scale-105"
                  />
                  <Image
                    src="/logo-light.png"
                    alt="AkwaabaHomes"
                    width={44}
                    height={44}
                    className="w-full h-full object-contain block dark:hidden transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-base tracking-tight text-[#141816] dark:text-white leading-none">
                    AkwaabaHomes
                  </span>
                  <span className="text-[10.5px] font-medium text-[#3B6E5C] dark:text-emerald-400 mt-0.5">
                    Live Well. Feel at Home.
                  </span>
                </div>
              </Link>

              {/* Desktop Navigation Links */}
              <div className="hidden lg:flex items-center gap-0.5">
                {navLinks.map((link) => {
                  const isActive =
                    pathname === link.href ||
                    (link.href === '/saved' && (pathname === '/saved' || pathname === '/dashboard/wishlist'));
                  return (
                    <Link prefetch={false}
                      key={link.name}
                      href={link.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={clsx(
                        'inline-flex items-center gap-0.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]',
                        isActive
                          ? 'text-[#15803D] dark:text-emerald-400 bg-[#EDF6F0] dark:bg-emerald-950/40 border border-[#16A34A]/30'
                          : 'text-[#5E645E] hover:text-[#242925] dark:text-[#9EA69F] dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-[#1B211E]'
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
              {/* Theme Moon/Sun Toggle */}
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                aria-label="Toggle dark mode"
                title={mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {mounted && resolvedTheme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  {/* Bookings Button */}
                  {(role === 'TENANT' || !role) && (
                    <Link prefetch={false}
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
                  <Link prefetch={false}
                    href={dashboardHref}
                    className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-xs font-semibold bg-[#15803D] hover:bg-[#166534] text-white transition-colors shadow-xs"
                  >
                    {user?.avatarUrl || role === 'TENANT' || role === 'LANDLORD' ? (
                      <div className="w-5 h-5 rounded-full overflow-hidden border border-white/20 shrink-0 relative">
                        <img decoding="async"
                          src={user?.avatarUrl ? getImageUrl(user.avatarUrl) : role === 'LANDLORD' ? '/images/avatars/landlord-avatar.png' : '/images/avatars/resident-stephen-darko.png'}
                          alt={userFullName}
                          className="w-full h-full object-cover"
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
                  <Link prefetch={false}
                    href="/bookings"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-[#242925] dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <CalendarCheck className="w-3.5 h-3.5 text-[#557A67]" />
                    <span>Bookings</span>
                  </Link>

                  {/* Notification Bell */}
                  <Link prefetch={false}
                    href="/login"
                    className="relative p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
                    title="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#B91C1C] text-white text-[9px] font-bold flex items-center justify-center">
                      3
                    </span>
                  </Link>

                  {/* My Account button */}
                  <Link prefetch={false}
                    href="/login"
                    className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-xs font-semibold bg-[#15803D] hover:bg-[#166534] text-white transition-colors shadow-xs"
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
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                aria-label="Toggle dark mode"
              >
                {mounted && resolvedTheme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
              {isAuthenticated && <NotificationBell />}
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-[#242925] dark:text-white hover:bg-zinc-50 dark:hover:bg-[#1B211E] cursor-pointer"
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
          <NavbarMobileDrawer
            navLinks={navLinks}
            pathname={pathname}
            isAuthenticated={isAuthenticated}
            dashboardHref={dashboardHref}
            onClose={() => setIsMenuOpen(false)}
          />
        )}
      </nav>
    </header>
  );
}
