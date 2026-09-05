'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, UserCircle, LogIn, Menu, X, ShieldAlert, Sparkles, Building, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import api from '@/lib/axios';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import { useLanguage } from '@/providers/LanguageContext';

export default function Navbar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  // Do not render public Navbar on Admin portal routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 15);
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
    refetchInterval: 60000
  });

  const isAuthenticated = !!userResponse?.user;
  const role = userResponse?.user?.role;
  const dashboardHref = role === 'LANDLORD' ? '/dashboard/landlord' : '/dashboard/tenant';

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Browse Accommodations', href: '/properties' },
    { name: 'Roommate Matcher', href: '/dashboard/roommates' },
  ];
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all">
      {/* Maintenance Mode Alert */}
      {publicConfig?.maintenanceMode && (
        <div className="bg-amber-600 text-white px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          <span>Scheduled Maintenance Mode Active — Read-only browsing enabled.</span>
        </div>
      )}

      {/* Main Editorial Navigation Bar */}
      <nav className={clsx(
        "transition-all duration-200 border-b",
        scrolled
          ? "bg-white/95 dark:bg-[#0B0D12]/95 backdrop-blur-md border-zinc-200 dark:border-zinc-800 shadow-[0_1px_3px_0_rgba(0,0,0,0.03)]"
          : "bg-white dark:bg-[#0B0D12] border-zinc-200/80 dark:border-zinc-800/80"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-18 items-center">
            
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700/60 shadow-xs group-hover:scale-102 transition-transform shrink-0">
                  <Image
                    src="/logo.png"
                    alt="Akwaaba Homes Logo"
                    width={36}
                    height={36}
                    className="w-full h-full object-cover"
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-lg tracking-tight text-zinc-950 dark:text-zinc-50 leading-none">
                    Akwaaba<span className="text-[#0F5132] dark:text-[#198754]">Homes</span>
                  </span>
                  <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 tracking-wider uppercase mt-0.5">
                    Ghana PropTech
                  </span>
                </div>
              </Link>

              {/* Desktop Nav Links */}
              <div className="hidden lg:flex items-center space-x-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  const isProperties = link.href === '/properties';
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      id={isProperties ? 'tour-nav-properties' : undefined}
                      className={clsx(
                        "px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors",
                        isActive
                          ? "text-[#0F5132] dark:text-[#198754] bg-emerald-50 dark:bg-emerald-950/40 font-bold"
                          : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60"
                      )}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right: Quick Tools & Authentication */}
            <div className="hidden md:flex items-center space-x-3">
              <LanguageSelector />
              <ThemeToggle isScrolled={true} />

              <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

              {/* List Property CTA: strictly for Landlords, never for Tenants */}
              {!pathname?.startsWith('/dashboard/tenant') && role !== 'TENANT' && (role === 'LANDLORD' || !isAuthenticated) && (
                <Link
                  href="/dashboard/landlord/new"
                  className="text-[13px] font-bold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  List Property
                </Link>
              )}
              
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <NotificationBell />
                  <Link
                    href={dashboardHref}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0F5132] hover:bg-[#0A3D24] text-white shadow-xs transition-all"
                  >
                    <UserCircle className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="text-[13px] font-bold text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white px-3.5 py-2 rounded-lg transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white transition-all shadow-xs"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile menu trigger */}
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle isScrolled={true} />
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Toggle navigation menu"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-[#0B0D12] border-b border-zinc-200 dark:border-zinc-800 px-4 pt-3 pb-6 space-y-3 animate-in">
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {link.name}
                </Link>
              ))}
              {!pathname?.startsWith('/dashboard/tenant') && role !== 'TENANT' && (role === 'LANDLORD' || !isAuthenticated) && (
                <Link
                  href="/dashboard/landlord/new"
                  onClick={() => setIsMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-lg text-sm font-bold text-[#0F5132] dark:text-[#198754] hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                >
                  + List a Property
                </Link>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
              {isAuthenticated ? (
                <Link
                  href={dashboardHref}
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full py-2.5 text-center text-xs font-bold text-white bg-[#0F5132] rounded-xl"
                >
                  Open Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full py-2.5 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded-xl"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full py-2.5 text-center text-xs font-bold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-xl"
                  >
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
