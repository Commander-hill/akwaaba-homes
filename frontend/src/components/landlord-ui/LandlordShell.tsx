'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Building2,
  CalendarCheck,
  CreditCard,
  Wallet,
  Users,
  Bell,
  User,
  ShieldCheck,
  Menu,
  X,
  Plus,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import LogoutControl from '@/components/LogoutControl';

export interface LandlordShellProps {
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    avatarUrl?: string | null;
    ghanaCardStatus?: string;
    landlordVerificationStatus?: string;
  } | null;
  unreadNotificationsCount?: number;
  onLogout?: () => void;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  prefixes: string[];
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export default function LandlordShell({
  user,
  unreadNotificationsCount = 0,
  onLogout,
  children,
}: LandlordShellProps) {
  const pathname = usePathname() || '';
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const groups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', href: '/dashboard/landlord', prefixes: [], icon: LayoutDashboard },
      ],
    },
    {
      title: 'Property management',
      items: [
        {
          label: 'Properties',
          href: '/dashboard/landlord/properties',
          prefixes: ['/dashboard/landlord/properties', '/dashboard/landlord/new'],
          icon: Building2,
        },
        {
          label: 'Bookings',
          href: '/dashboard/landlord/bookings',
          prefixes: ['/dashboard/landlord/bookings'],
          icon: CalendarCheck,
        },
        {
          label: 'Tenants',
          href: '/dashboard/landlord/tenants',
          prefixes: ['/dashboard/landlord/tenants'],
          icon: Users,
        },
      ],
    },
    {
      title: 'Business and account',
      items: [
        {
          label: 'Subscription',
          href: '/dashboard/landlord/subscription',
          prefixes: ['/dashboard/landlord/subscription'],
          icon: CreditCard,
        },
        {
          label: 'Earnings and payouts',
          href: '/dashboard/landlord/withdraw',
          prefixes: ['/dashboard/landlord/withdraw'],
          icon: Wallet,
        },
        {
          label: 'Notifications',
          href: '/dashboard/notifications',
          prefixes: ['/dashboard/notifications'],
          icon: Bell,
          badge: unreadNotificationsCount,
        },
        {
          label: 'ID & Title Deeds',
          href: '/dashboard/verification',
          prefixes: ['/dashboard/verification'],
          icon: ShieldCheck,
        },
        {
          label: 'Profile and settings',
          href: '/dashboard/profile',
          prefixes: ['/dashboard/profile'],
          icon: User,
        },
      ],
    },
  ];

  const isActive = (item: NavItem) => {
    if (item.href === '/dashboard/landlord') return pathname === '/dashboard/landlord';
    return item.prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  };

  const allItems = groups.flatMap((g) => g.items);
  const current = allItems.find(isActive);
  const pageLabel = current?.label || 'Landlord workspace';
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Landlord';
  const initials = `${user?.firstName?.[0] || 'L'}${user?.lastName?.[0] || ''}`.toUpperCase();

  const nav = (onNavigate?: () => void) => (
    <nav aria-label="Landlord navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#6F756F]">
            {group.title}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173D32]',
                    active
                      ? 'bg-[#173D32] text-white'
                      : 'text-[#5E645E] dark:text-[#9EA69F] hover:bg-[#F1EFE8] dark:hover:bg-[#1B211E] hover:text-[#242925] dark:hover:text-white'
                  )}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={clsx('w-4 h-4 shrink-0', active ? 'text-white' : 'text-[#557A67]')}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {!!item.badge && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C77B59] text-white">
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
  );

  const brand = (
    <Link href="/dashboard/landlord" className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#173D32] flex items-center justify-center shrink-0">
        <Image src="/logo.png" alt="Akwaaba Homes" width={28} height={28} className="w-full h-full object-cover" />
      </div>
      <div>
        <span className="font-editorial text-base text-[#242925] dark:text-white block leading-none">
          Akwaaba Homes
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#557A67] block mt-0.5">
          Landlord workspace
        </span>
      </div>
    </Link>
  );

  const footer = (
    <div className="p-3.5 border-t border-[#E7E7DF] dark:border-[#262E2A] flex items-center gap-2.5 bg-[#F8F7F2]/60 dark:bg-[#111513]">
      <Link href="/dashboard/profile" className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="w-9 h-9 rounded-full bg-[#173D32] text-white text-xs font-bold flex items-center justify-center overflow-hidden shrink-0">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-bold truncate text-[#242925] dark:text-white">{fullName}</span>
          <span className="block text-[11px] truncate text-[#6F756F]">{user?.email}</span>
        </span>
      </Link>
      {onLogout && <LogoutControl onLogout={onLogout} />}
    </div>
  );

  return (
    <div className="-mt-16 min-h-screen flex flex-col lg:flex-row bg-[#F8F7F2] dark:bg-[#0D100E] text-[#242925] dark:text-[#F2F2EE]">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white dark:bg-[#141816] border-r border-[#E7E7DF] dark:border-[#262E2A] sticky top-0 h-screen">
        <div className="h-16 px-5 border-b border-[#E7E7DF] dark:border-[#262E2A] flex items-center shrink-0">{brand}</div>
        {nav()}
        {footer}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-[#141816] border-b border-[#E7E7DF] dark:border-[#262E2A] px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-[#F1EFE8] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <nav aria-label="Breadcrumb" className="text-sm min-w-0 truncate">
              <span className="text-[#6F756F] hidden sm:inline">Landlord / </span>
              <span className="font-semibold">{pageLabel}</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/landlord/new"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Add property</span>
              <span className="sm:hidden sr-only">Add property</span>
            </Link>
            <NotificationBell />
            <Link
              href="/dashboard/profile"
              aria-label="Profile and settings"
              className="w-8 h-8 rounded-full bg-[#173D32] text-white text-xs font-bold flex items-center justify-center overflow-hidden ring-2 ring-[#E7E7DF]"
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">{children}</main>
      </div>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-[#141816] h-full flex flex-col z-10 shadow-xl">
            <div className="h-16 px-4 border-b border-[#E7E7DF] flex items-center justify-between">
              {brand}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-[#6F756F] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {nav(() => setDrawerOpen(false))}
            {footer}
          </aside>
        </div>
      )}
    </div>
  );
}
