'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { getImageUrl } from '@/lib/utils';
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
  Home,
  Moon,
  Sun,
  Scale,
  Heart,
  BadgeCheck,
  Receipt,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { useTheme } from 'next-themes';
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

interface NavGroup {
  title: string;
  items: NavItem[];
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
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications-shell'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data;
    },
    enabled: Boolean(user),
    retry: false,
    staleTime: 60_000,
  });

  const { data: conversationsData } = useQuery({
    queryKey: ['conversations-shell-unread'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/chat/conversations');
        return Array.isArray(data) ? data : data?.conversations || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  const unreadMessagesCount = (conversationsData || []).reduce(
    (acc: number, c: any) => acc + (c.unreadCount || (c.unread ? 1 : 0)),
    0
  );

  const { data: ticketsData } = useQuery({
    queryKey: ['tenant-tickets'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/tickets/me');
        return data.tickets || [];
      } catch {
        return [];
      }
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const activeTicketsCount = (ticketsData || []).filter(
    (t: any) => t.status !== 'RESOLVED' && t.status !== 'CLOSED' && t.status !== 'REJECTED'
  ).length;

  const liveUnreadCount =
    unreadNotificationsCount > 0
      ? unreadNotificationsCount
      : Array.isArray(notificationsData?.notifications)
      ? notificationsData.notifications.filter((n: any) => !n.isRead).length
      : 0;

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

  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticPath(null);
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

  const fullName = `${user?.firstName || 'Stephen'} ${user?.lastName || 'Darko'}`.trim();
  const initials = `${user?.firstName?.[0] || 'S'}${user?.lastName?.[0] || 'D'}`.toUpperCase();

  // Categorized Navigation Groups exposing 100% of Resident features
  const navGroups: NavGroup[] = [
    {
      title: 'MY LIVING',
      items: [
        {
          label: 'Dashboard',
          href: '/dashboard/tenant',
          matchPrefixes: ['/dashboard/tenant'],
          icon: LayoutDashboard,
        },
        {
          label: 'My Residence',
          href: '/dashboard/tenant/residence',
          matchPrefixes: ['/dashboard/tenant/residence'],
          icon: Building2,
        },
        {
          label: 'My Bookings',
          href: '/dashboard/tenant/bookings',
          matchPrefixes: ['/dashboard/tenant/bookings', '/bookings'],
          icon: CalendarCheck,
        },
        {
          label: 'Lease & Agreements',
          href: '/dashboard/agreements',
          matchPrefixes: ['/dashboard/agreements', '/lease-agreement'],
          icon: Scale,
        },
        {
          label: 'Visitor Gate Passes',
          href: '/dashboard/tenant/visitors',
          matchPrefixes: ['/dashboard/tenant/visitors'],
          icon: ShieldCheck,
        },
      ],
    },
    {
      title: 'PAYMENTS & BILLS',
      items: [
        {
          label: 'Rent & Utility Bills',
          href: '/dashboard/tenant/bills',
          matchPrefixes: ['/dashboard/tenant/bills'],
          icon: CreditCard,
        },
        {
          label: 'Invoices & Receipts',
          href: '/dashboard/invoice',
          matchPrefixes: ['/dashboard/invoice'],
          icon: Receipt,
        },
      ],
    },
    {
      title: 'COMMUNITY & LIFE',
      items: [
        {
          label: 'Find Roommates',
          href: '/dashboard/roommates',
          matchPrefixes: ['/dashboard/roommates'],
          icon: Users,
        },
        {
          label: 'Maintenance & Repairs',
          href: '/dashboard/tenant/tickets',
          matchPrefixes: ['/dashboard/tenant/tickets', '/maintenance'],
          icon: Wrench,
          badge: activeTicketsCount > 0 ? activeTicketsCount : undefined,
        },
        {
          label: 'Messages & Chat',
          href: '/dashboard/messages',
          matchPrefixes: ['/dashboard/messages'],
          icon: MessageSquare,
          badge: unreadMessagesCount > 0 ? unreadMessagesCount : undefined,
        },
        {
          label: 'Saved Wishlist',
          href: '/dashboard/wishlist',
          matchPrefixes: ['/dashboard/wishlist'],
          icon: Heart,
        },
      ],
    },
    {
      title: 'ACCOUNT & VAULT',
      items: [
        {
          label: 'Documents & KYC Vault',
          href: '/dashboard/documents',
          matchPrefixes: ['/dashboard/documents', '/dashboard/verification'],
          icon: FileText,
        },
        {
          label: 'Account Settings',
          href: '/dashboard/profile',
          matchPrefixes: ['/dashboard/profile', '/profile', '/settings', '/account'],
          icon: User,
        },
      ],
    },
  ];

  const isNavItemActive = (item: NavItem) => {
    const currentPath = optimisticPath || pathname;
    if (item.href === '/dashboard/tenant') {
      return currentPath === '/dashboard/tenant' || currentPath === '/dashboard';
    }
    if (item.href === '/dashboard/tenant/residence') {
      return currentPath.startsWith('/dashboard/tenant/residence');
    }
    return item.matchPrefixes.some((prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const renderSidebarContent = (onNavigate?: () => void) => (
    <div className="flex flex-col h-full bg-white dark:bg-[#12151D] text-zinc-900 dark:text-zinc-100 relative overflow-hidden">
      {/* Brand Header matching mockup */}
      <div className="h-20 px-6 flex items-center shrink-0 border-b border-zinc-100 dark:border-zinc-800/80">
        <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <Image
              src="/logo.png"
              alt="AkwaabaHomes"
              width={42}
              height={42}
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[17px] font-black text-zinc-950 dark:text-white tracking-tight block leading-none">
              AkwaabaHomes
            </span>
            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block mt-1 tracking-wide">
              Trusted Ghanaian Housing
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links Grouped */}
      <nav aria-label="Resident Navigation" className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title}>
            <div className="px-3 pb-1 pt-1">
              <span className="text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                {group.title}
              </span>
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isNavItemActive(item);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => {
                      setOptimisticPath(item.href);
                      if (onNavigate) onNavigate();
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'group flex items-center justify-between px-3.5 py-2 rounded-xl text-xs sm:text-[13px] transition-all duration-150 select-none',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                      active
                        ? 'bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300 font-semibold border border-[#BBF7D0] dark:border-emerald-800/60 shadow-2xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-[#15803D] dark:hover:text-emerald-300 hover:bg-[#DCFCE7]/40 dark:hover:bg-emerald-950/30 hover:border-[#BBF7D0]/40 font-medium border border-transparent active:bg-[#DCFCE7] active:text-[#15803D] active:border-[#BBF7D0]'
                    )}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={clsx(
                          'w-4 h-4 shrink-0 stroke-[2] transition-colors',
                          active
                            ? 'text-[#15803D] dark:text-emerald-300'
                            : 'text-zinc-400 dark:text-zinc-500 stroke-[1.8] group-hover:text-[#15803D] dark:group-hover:text-emerald-300 group-active:text-[#15803D]'
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                    </span>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="w-4.5 h-4.5 rounded-full bg-[#E0533C] text-white text-[9.5px] font-bold flex items-center justify-center shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom "Need Help?" Card matching reference screenshot */}
      <div className="p-3.5 mt-auto">
        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-center flex flex-col items-center space-y-1.5">
          <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
          </div>
          <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
            Need Help?
          </h4>
          <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 leading-relaxed px-1">
            Our support team is here to help.
          </p>
          <Link
            href="/support"
            onClick={onNavigate}
            className="w-full py-2 px-3 mt-0.5 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <span>Contact Support</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>

      {/* Bottom Geometric Kente Textile Trim */}
      <div className="relative w-full h-7 shrink-0 overflow-hidden opacity-90 select-none pointer-events-none">
        <Image
          src="/images/agreements/kente-sidebar-pattern.png"
          alt="Ghanaian Kente Texture"
          fill
          sizes="256px"
          className="object-cover object-bottom"
        />
      </div>
    </div>
  );

  const isFullBleedPage =
    pathname === '/dashboard/invoice' ||
    pathname === '/dashboard/agreements' ||
    pathname === '/dashboard/documents' ||
    pathname === '/dashboard/profile' ||
    pathname === '/profile' ||
    pathname === '/settings' ||
    pathname === '/dashboard/tenant/tickets' ||
    pathname === '/dashboard/messages';

  return (
    <div className="-mt-16 min-h-screen flex flex-col lg:flex-row bg-white dark:bg-[#0E1210] text-zinc-900 dark:text-zinc-100 font-sans">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden lg:flex lg:w-60 xl:w-64 shrink-0 flex-col bg-white dark:bg-[#12151D] border-r border-zinc-200 dark:border-zinc-800 sticky top-0 h-screen z-20 shadow-xs">
        {renderSidebarContent()}
      </aside>

      {/* ── MAIN WORKSPACE COLUMN ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar matching reference */}
        <header className="h-16 bg-white dark:bg-[#141816] border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between fixed top-0 left-0 right-0 lg:left-60 xl:left-64 z-30">
          {/* Left: Mobile Menu Toggle & Breadcrumb / Search */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1 max-w-2xl">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-1 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb matching mockup */}
            <div className="flex items-center gap-1.5 text-xs text-[#526357] dark:text-zinc-400 shrink-0">
              <Home className="w-4 h-4 text-[#16A34A]" />
              <Link href="/dashboard/tenant" className="hover:text-zinc-900 dark:hover:text-zinc-200 font-medium">
                Resident Portal
              </Link>
              <span className="text-zinc-300 dark:text-zinc-600">/</span>
              <span className="font-bold text-zinc-900 dark:text-white capitalize">
                {pathname.includes('/invoice')
                  ? 'Invoices & Receipts'
                  : pathname.includes('/agreements')
                  ? 'Agreements'
                  : pathname.includes('/roommates')
                  ? 'Find Roommates'
                  : pathname.includes('/visitors')
                  ? 'Visitor Gate Passes'
                  : pathname.includes('/wishlist')
                  ? 'Saved Wishlist'
                  : pathname.includes('/bills')
                  ? 'Rent & Utility Bills'
                  : pathname.includes('/documents') || pathname.includes('/verification')
                  ? 'Documents & KYC Vault'
                  : pathname.includes('/profile') || pathname.includes('/settings')
                  ? 'Settings'
                  : pathname.includes('/tickets')
                  ? 'Maintenance'
                  : pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Dashboard'}
              </span>
            </div>

            <form onSubmit={handleSearchSubmit} className="relative w-full max-w-sm sm:max-w-md hidden md:block">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder={
                  pathname.startsWith('/dashboard/messages')
                    ? 'Search messages, users, or topics...'
                    : pathname.startsWith('/dashboard/agreements')
                    ? 'Search properties, bookings, or help...'
                    : 'Search properties, bookings, or help...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 rounded-full bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#16A34A] shadow-2xs transition"
              />
            </form>
          </div>

          {/* Right: Theme Toggle, Notifications & Profile Trigger */}
          <div className="flex items-center gap-2 sm:gap-3.5 ml-4">
            {/* Dark/Light Mode Toggle */}
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
              aria-label="Toggle dark mode"
              title={mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {mounted && resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* Notification Bell with Red Badge */}
            <Link
              href="/dashboard/notifications"
              className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#E0533C] text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                {liveUnreadCount > 0 ? liveUnreadCount : 6}
              </span>
            </Link>

            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

            {/* User Profile Block with Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-zinc-800/60 transition cursor-pointer text-left"
              >
                <div className="w-9 h-9 rounded-full bg-[#0B7A46] text-white text-xs font-bold flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  <img
                    src={user?.avatarUrl ? getImageUrl(user.avatarUrl) : '/images/avatars/resident-stephen-darko.png'}
                    alt={fullName}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="hidden sm:block">
                  <p className="text-xs font-bold text-zinc-950 dark:text-white leading-tight">
                    {fullName}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
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
                      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      {mounted && resolvedTheme === 'dark' ? (
                        <Sun className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Moon className="w-4 h-4 text-zinc-500" />
                      )}
                      <span>Appearance</span>
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 capitalize">
                      {mounted ? resolvedTheme : 'Auto'}
                    </span>
                  </button>

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
        <main
          className={clsx(
            'flex-1 w-full mx-auto pt-16 pb-24 lg:pb-8',
            isFullBleedPage ? 'p-0 pt-16 max-w-full' : 'max-w-[1440px] p-4 pt-20 sm:p-6 sm:pt-22 lg:p-7 lg:pt-23'
          )}
        >
          {children}
        </main>
      </div>

      {/* ── MOBILE NAVIGATION DRAWER ── */}
      {mobileDrawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
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
