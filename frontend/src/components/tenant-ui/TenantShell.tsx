'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  LayoutDashboard,
  CalendarCheck,
  Heart,
  MessageSquare,
  Bell,
  User,
  LifeBuoy,
  Search,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
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
  }, [pathname]);

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard/tenant',
      matchPrefixes: ['/dashboard/tenant'],
      icon: LayoutDashboard,
    },
    {
      label: 'Bookings',
      href: '/dashboard/tenant/bookings',
      matchPrefixes: ['/dashboard/tenant/bookings', '/bookings', '/dashboard/agreements', '/dashboard/invoice'],
      icon: CalendarCheck,
    },
    {
      label: 'Saved Properties',
      href: '/dashboard/wishlist',
      matchPrefixes: ['/dashboard/wishlist', '/saved'],
      icon: Heart,
    },
    {
      label: 'Messages',
      href: '/dashboard/messages',
      matchPrefixes: ['/dashboard/messages'],
      icon: MessageSquare,
    },
    {
      label: 'Notifications',
      href: '/dashboard/notifications',
      matchPrefixes: ['/dashboard/notifications', '/notifications'],
      icon: Bell,
      badge: unreadNotificationsCount,
    },
    {
      label: 'Profile & Settings',
      href: '/dashboard/profile',
      matchPrefixes: ['/dashboard/profile', '/profile', '/settings', '/dashboard/verification'],
      icon: User,
    },
    {
      label: 'Support & Issues',
      href: '/support',
      matchPrefixes: ['/support', '/dashboard/tenant/tickets'],
      icon: LifeBuoy,
    },
  ];

  const isNavItemActive = (item: NavItem) => {
    if (item.href === '/dashboard/tenant') {
      return pathname === '/dashboard/tenant' || pathname === '/dashboard';
    }
    return item.matchPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  };

  const activeNav = navItems.find(isNavItemActive) || navItems[0];
  const fullName = `${user?.firstName || 'Resident'} ${user?.lastName || ''}`.trim();
  const initials = `${user?.firstName?.[0] || 'A'}${user?.lastName?.[0] || 'H'}`.toUpperCase();
  const isVerifiedId = user?.ghanaCardStatus === 'VERIFIED';

  const renderSidebarLinks = (onNavigate?: () => void) => (
    <nav aria-label="Resident Portal Navigation" className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isNavItemActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs sm:text-[13px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173D32]',
              active
                ? 'bg-[#173D32] text-white font-semibold shadow-2xs'
                : 'text-[#5E645E] dark:text-[#9EA69F] hover:text-[#242925] dark:hover:text-white hover:bg-[#F1EFE8] dark:hover:bg-[#1B211E]'
            )}
          >
            <span className="flex items-center gap-3 min-w-0">
              <Icon
                className={clsx(
                  'w-4 h-4 shrink-0',
                  active ? 'text-white' : 'text-[#557A67] dark:text-[#68917C]'
                )}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </span>

            {item.badge !== undefined && item.badge > 0 && (
              <span
                className={clsx(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0',
                  active
                    ? 'bg-white text-[#173D32]'
                    : 'bg-[#C77B59] text-white'
                )}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="-mt-16 min-h-screen flex flex-col lg:flex-row bg-[#F8F7F2] dark:bg-[#0D100E] text-[#242925] dark:text-[#F2F2EE]">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden lg:flex lg:w-64 xl:w-68 shrink-0 flex-col bg-white dark:bg-[#141816] border-r border-[#E7E7DF] dark:border-[#262E2A] sticky top-0 h-screen">
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-[#E7E7DF] dark:border-[#262E2A] flex items-center justify-between shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
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
              <span className="font-editorial text-base text-[#242925] dark:text-white block leading-none">
                Akwaaba Homes
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#557A67] block mt-0.5">
                Resident Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        {renderSidebarLinks()}

        {/* Discovery Shortcut & Account Footer */}
        <div className="p-3.5 border-t border-[#E7E7DF] dark:border-[#262E2A] space-y-3 bg-[#F8F7F2]/60 dark:bg-[#111513]">
          <Link
            href="/search"
            className="w-full flex items-center justify-center gap-2 h-10 px-3 rounded-lg bg-white dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] text-xs font-semibold text-[#173D32] dark:text-emerald-400 hover:border-[#173D32] transition-colors"
          >
            <Search className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Find Accommodation</span>
          </Link>

          <div className="flex items-center justify-between gap-2.5 px-1.5 pt-1">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2.5 min-w-0 flex-1 group"
            >
              <div className="w-9 h-9 rounded-full bg-[#173D32] text-white text-xs font-bold flex items-center justify-center shrink-0 overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-[#242925] dark:text-white truncate group-hover:text-[#173D32] dark:group-hover:text-emerald-400">
                    {fullName}
                  </p>
                  {isVerifiedId && (
                    <ShieldCheck className="w-3.5 h-3.5 text-[#173D32] dark:text-emerald-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-[#6F756F] dark:text-[#9EA69F] truncate">
                  {user?.email || 'Resident Account'}
                </p>
              </div>
            </Link>

            <button
              type="button"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out of your account"
              className="p-2 rounded-lg text-[#6F756F] hover:text-[#9E2A2B] hover:bg-[#FCEEEE] dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN WORKSPACE COLUMN ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Contextual Top Bar */}
        <header className="h-16 bg-white/95 dark:bg-[#141816]/95 backdrop-blur-xs border-b border-[#E7E7DF] dark:border-[#262E2A] px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-1 rounded-lg text-[#242925] dark:text-white hover:bg-[#F1EFE8] dark:hover:bg-[#1B211E] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <span className="text-sm sm:text-base font-bold text-[#242925] dark:text-white truncate block">
                {activeNav.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href="/search"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[#E7E7DF] dark:border-[#262E2A] bg-[#F8F7F2] dark:bg-[#1B211E] hover:border-[#173D32] text-xs font-semibold text-[#242925] dark:text-white transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-[#173D32] dark:text-emerald-400" />
              <span>Explore Homes</span>
            </Link>

            <NotificationBell />

            <Link
              href="/dashboard/profile"
              aria-label="Account profile and settings"
              className="w-8 h-8 rounded-full bg-[#173D32] text-white text-xs font-bold flex items-center justify-center overflow-hidden ring-2 ring-[#E7E7DF] dark:ring-[#262E2A]"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={fullName} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </Link>
          </div>
        </header>

        {/* Page Content Container */}
        <div className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </div>
      </div>

      {/* ── MOBILE NAVIGATION DRAWER ── */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-[#141816] h-full flex flex-col z-10 border-r border-[#E7E7DF] dark:border-[#262E2A] shadow-xl">
            <div className="h-16 px-4 border-b border-[#E7E7DF] dark:border-[#262E2A] flex items-center justify-between">
              <Link
                href="/"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#173D32] flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="Akwaaba Homes"
                    width={26}
                    height={26}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <span className="font-editorial text-base text-[#242925] dark:text-white block leading-none">
                    Akwaaba Homes
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#557A67] block mt-0.5">
                    Resident Portal
                  </span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-[#6F756F] hover:text-[#242925] dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderSidebarLinks(() => setMobileDrawerOpen(false))}

            <div className="p-4 border-t border-[#E7E7DF] dark:border-[#262E2A] space-y-2.5 bg-[#F8F7F2] dark:bg-[#111513]">
              <Link
                href="/search"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-white dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] text-xs font-semibold text-[#173D32] dark:text-emerald-400"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Explore Accommodations</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-lg bg-[#FCEEEE] text-[#9E2A2B] text-xs font-semibold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
