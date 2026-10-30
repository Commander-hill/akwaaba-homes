'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  CreditCard,
  Wrench,
  MessageSquare,
  FileText,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  LogOut,
  User,
} from 'lucide-react';
import api from '@/lib/axios';

export interface TenantShellProps {
  user?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string | null;
    role?: string;
    ghanaCardStatus?: string;
    isStudent?: boolean;
    campus?: string;
  } | null;
  unreadNotificationsCount?: number;
  onLogout?: () => void;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  matchPrefixes: string[];
  icon: React.ElementType;
  badge?: number;
}

export default function TenantShell({
  user: propUser,
  unreadNotificationsCount = 0,
  onLogout: propOnLogout,
  children,
}: TenantShellProps) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: meData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
    enabled: !propUser,
    retry: false,
    staleTime: 60_000,
  });

  const user = propUser || meData?.user || null;

  const onLogout =
    propOnLogout ||
    (async () => {
      try {
        await api.post('/auth/logout');
      } catch {
        // ignore network errors on logout
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('akwaaba_access_token');
        localStorage.removeItem('akwaaba_refresh_token');
      }
      queryClient.clear();
      router.push('/login');
    });

  useEffect(() => {
    setMobileDrawerOpen(false);
    setProfileDropdownOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fullName = `${user?.firstName || 'Stephen'} ${user?.lastName || 'Akwaaba'}`.trim();
  const initials = `${user?.firstName?.[0] || 'S'}${user?.lastName?.[0] || 'A'}`.toUpperCase();

  // Navigation Items matching media_1793394736521.jpg exactly
  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard/tenant',
      matchPrefixes: ['/dashboard/tenant'],
      icon: LayoutDashboard,
    },
    {
      label: 'My Residence',
      href: '/dashboard/tenant/bookings',
      matchPrefixes: ['/dashboard/tenant/bookings', '/bookings'],
      icon: Building2,
    },
    {
      label: 'Bookings',
      href: '/dashboard/tenant/bookings',
      matchPrefixes: ['/dashboard/tenant/bookings'],
      icon: CalendarCheck,
    },
    {
      label: 'Payments',
      href: '/dashboard/invoice',
      matchPrefixes: ['/dashboard/invoice'],
      icon: CreditCard,
    },
    {
      label: 'Maintenance',
      href: '/dashboard/tenant/tickets',
      matchPrefixes: ['/dashboard/tenant/tickets'],
      icon: Wrench,
      badge: 2,
    },
    {
      label: 'Messages',
      href: '/dashboard/messages',
      matchPrefixes: ['/dashboard/messages'],
      icon: MessageSquare,
      badge: 3,
    },
    {
      label: 'Documents',
      href: '/dashboard/agreements',
      matchPrefixes: ['/dashboard/agreements', '/lease-agreement'],
      icon: FileText,
    },
    {
      label: 'Settings',
      href: '/dashboard/profile',
      matchPrefixes: ['/dashboard/profile', '/profile', '/settings'],
      icon: Settings,
    },
  ];

  const isNavItemActive = (item: NavItem) => {
    if (item.label === 'Dashboard') {
      return pathname === '/dashboard/tenant' || pathname === '/dashboard';
    }
    if (item.label === 'My Residence') {
      return false; // keep Dashboard highlighted on root
    }
    return item.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const renderSidebarContent = (onNavigate?: () => void) => (
    <div className="flex flex-col h-full bg-white dark:bg-[#141816]">
      {/* Brand Header matching mockup */}
      <div className="h-20 px-6 flex items-center shrink-0">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-3 group">
          <div className="w-9 h-9 flex items-center justify-center shrink-0">
            <Image
              src="/logo-light.png"
              alt="AkwaabaHomes"
              width={38}
              height={38}
              className="w-full h-full object-contain block dark:hidden"
              priority
            />
            <Image
              src="/logo.png"
              alt="AkwaabaHomes"
              width={38}
              height={38}
              className="w-full h-full object-contain hidden dark:block"
              priority
            />
          </div>
          <div>
            <span className="text-[17px] font-black text-[#173D32] dark:text-white tracking-tight block leading-tight">
              AkwaabaHomes
            </span>
            <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 block">
              Live Well. Feel at Home.
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Resident Navigation" className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(item);
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-[13px] transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A]',
                active
                  ? 'bg-[#ECFDF5] text-[#065F46] font-bold shadow-2xs dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'text-zinc-600 dark:text-zinc-400 font-medium hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-[#1B211E]'
              )}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon
                  className={clsx(
                    'w-4 h-4 shrink-0',
                    active ? 'text-[#065F46] dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </span>

              {item.badge !== undefined && item.badge > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#E0533C] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom "Need Help?" Card matching reference screenshot */}
      <div className="p-4 mt-auto">
        <div className="p-4 rounded-2xl bg-[#F0FDF4] dark:bg-emerald-950/25 border border-emerald-100/90 dark:border-emerald-900/30 text-center flex flex-col items-center space-y-2">
          <div className="w-full h-16 relative overflow-hidden rounded-xl flex items-center justify-center mb-0.5">
            <Image
              src="/images/resident/sidebar-help.jpg"
              alt="Need Help Graphic"
              fill
              className="object-contain"
            />
          </div>
          <h4 className="text-xs font-bold text-zinc-950 dark:text-white">
            Need Help?
          </h4>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed px-1">
            Our support team is here to assist you with anything related to your stay.
          </p>
          <Link
            href="/support"
            onClick={onNavigate}
            className="w-full py-2 px-3 mt-1 rounded-full border border-emerald-600/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 text-xs font-bold flex items-center justify-center gap-1.5 transition"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Contact Support</span>
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="-mt-16 min-h-screen flex flex-col lg:flex-row bg-[#FBFBFA] dark:bg-[#0D100E] text-zinc-900 dark:text-zinc-100 font-sans">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden lg:flex lg:w-60 xl:w-64 shrink-0 flex-col border-r border-zinc-200/80 dark:border-zinc-800 sticky top-0 h-screen z-20">
        {renderSidebarContent()}
      </aside>

      {/* ── MAIN WORKSPACE COLUMN ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar matching reference */}
        <header className="h-16 bg-white dark:bg-[#141816] border-b border-zinc-200/80 dark:border-zinc-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          {/* Left: Mobile Menu Toggle & Pill Search Input */}
          <div className="flex items-center gap-3 min-w-0 flex-1 max-w-lg">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-1 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <form onSubmit={handleSearchSubmit} className="relative w-full max-w-sm sm:max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search properties, bookings, or help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-full bg-slate-100/90 dark:bg-zinc-800/80 border border-slate-200/70 dark:border-zinc-700/60 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A] transition"
              />
            </form>
          </div>

          {/* Right: Notifications & Profile Trigger */}
          <div className="flex items-center gap-2 sm:gap-4 ml-4">
            {/* Notification Bell with Red Badge */}
            <Link
              href="/dashboard/notifications"
              className="relative p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#E0533C] text-white text-[9px] font-bold flex items-center justify-center">
                {unreadNotificationsCount > 0 ? unreadNotificationsCount : 3}
              </span>
            </Link>

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

            {/* User Profile Block with Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition cursor-pointer text-left"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>

                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-zinc-950 dark:text-white leading-tight">
                    {fullName}
                  </p>
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                    Resident
                  </p>
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-0.5" />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1.5 z-50 text-xs">
                  <div className="px-3.5 py-2 border-b border-zinc-100 dark:border-zinc-800">
                    <p className="font-bold text-zinc-950 dark:text-white truncate">{fullName}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{user?.email || 'resident@akwaabahomes.com'}</p>
                  </div>

                  <Link
                    href="/dashboard/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                  >
                    <User className="w-4 h-4" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    href="/dashboard/tenant/bookings"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                  >
                    <CalendarCheck className="w-4 h-4" />
                    <span>My Bookings</span>
                  </Link>

                  <Link
                    href="/dashboard/messages"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Messages</span>
                  </Link>

                  <div className="border-t border-zinc-100 dark:border-zinc-800 my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-7">
          {children}
        </main>
      </div>

      {/* ── MOBILE NAVIGATION DRAWER ── */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-[#141816] h-full flex flex-col z-10 border-r border-zinc-200 dark:border-zinc-800 shadow-xl">
            <div className="h-16 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <span className="font-bold text-sm text-zinc-950 dark:text-white">Menu</span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderSidebarContent(() => setMobileDrawerOpen(false))}
          </aside>
        </div>
      )}
    </div>
  );
}
