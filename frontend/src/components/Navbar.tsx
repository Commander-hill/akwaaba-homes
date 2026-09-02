'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, UserCircle, LogIn, Menu, X, AlertTriangle, ShieldAlert } from 'lucide-react';
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
  const isHome = pathname === '/';
  const isScrolled = isHome ? scrolled : true;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
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
    refetchInterval: 60000 // Background fallback poll (Instant updates via Socket)
  });

  const isAuthenticated = !!userResponse?.user;
  const role = userResponse?.user?.role;
  const dashboardHref = role === 'LANDLORD' ? '/dashboard/landlord' : '/dashboard/tenant';

  const navLinks = [
    { name: 'Home', href: '/', icon: Home },
    { name: t('findHostel'), href: '/properties', icon: Search },
  ];
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Maintenance Mode Top Banner */}
      {publicConfig?.maintenanceMode && (
        <div className="bg-red-600 text-white px-4 py-1.5 text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md animate-pulse">
          <ShieldAlert className="w-4 h-4" />
          <span>Global Maintenance Mode Active — Standard operations are currently restricted.</span>
        </div>
      )}

      <nav className={clsx(
        "transition-all duration-300 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10",
        isScrolled ? "shadow-md dark:shadow-xl" : "shadow-xs"
      )}>
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-[var(--primary)]/20 group-hover:shadow-[var(--primary)]/40 group-hover:scale-105 transition-all shrink-0">
              <Image
                src="/logo.png"
                alt="Akwaaba Homes Logo"
                width={40}
                height={40}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white transition-colors group-hover:text-[#5B4CFF]">
              AKWAABA Homes
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  id={link.name === 'Properties' ? 'tour-nav-properties' : undefined}
                  className={clsx(
                    "flex items-center gap-2 text-[15px] font-bold transition-colors",
                    isActive 
                      ? "text-[#5B4CFF]" 
                      : "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                  )}
                >
                  <Icon className={clsx("w-4 h-4", isActive ? "text-[#5B4CFF]" : "")} />
                  {link.name}
                </Link>
              );
            })}

            {/* Dashboard placed right after Properties */}
            {isAuthenticated && (
              <Link href={dashboardHref} className={clsx(
                "flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-bold transition-colors shadow-sm",
                pathname.startsWith('/dashboard')
                  ? "border-[#5B4CFF] bg-[#5B4CFF]/10 text-[#5B4CFF]"
                  : "border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              )}>
                <UserCircle className="w-5 h-5 text-[#5B4CFF]" />
                Dashboard
              </Link>
            )}
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center space-x-5">
            <LanguageSelector />
            <ThemeToggle isScrolled={isScrolled} />
            
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <NotificationBell />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-[15px] font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link href="/register" className="bg-[#5B4CFF] text-white hover:bg-[#4B3DEE] px-6 py-2.5 rounded-full text-[15px] font-bold transition-all shadow-[0_0_20px_rgba(91,76,255,0.3)]">
                  Create Account
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-3">
            <LanguageSelector />
            <ThemeToggle isScrolled={isScrolled} />
            {isAuthenticated && <NotificationBell />}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 transition-colors text-slate-900 dark:text-white cursor-pointer">
              {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-[#1C1A1B] border-b border-slate-200 dark:border-white/10 absolute top-20 left-0 w-full shadow-2xl">
          <div className="px-4 py-6 space-y-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={clsx(
                    "flex items-center gap-3 text-lg font-bold p-3 rounded-2xl transition-colors",
                    isActive 
                      ? "bg-indigo-50 dark:bg-[#5B4CFF]/10 text-[#5B4CFF] dark:text-white" 
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-[#A1A1AA] dark:hover:bg-[#2A2A2B]/40 dark:hover:text-white"
                  )}
                >
                  <Icon className={clsx("w-6 h-6", isActive ? "text-[#5B4CFF]" : "text-slate-400 dark:text-[#71717A]")} />
                  {link.name}
                </Link>
              );
            })}
            
            <div className="border-t border-slate-100 dark:border-white/10 pt-6 mt-4 flex flex-col gap-3">
              {isAuthenticated ? (
                <Link href={dashboardHref} onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center gap-2 w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-lg font-bold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10">
                  <UserCircle className="w-6 h-6 text-[#5B4CFF]" />
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center gap-2 w-full px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#2A2A2B]/40 text-lg font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10">
                    <LogIn className="w-6 h-6 text-slate-400 dark:text-[#71717A]" />
                    Sign In
                  </Link>
                  <Link href="/register" onClick={() => setIsMenuOpen(false)} className="flex items-center justify-center w-full px-6 py-4 rounded-2xl bg-[#5B4CFF] text-lg font-bold text-white hover:bg-[#4B3DEE]">
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  </header>
  );
}
