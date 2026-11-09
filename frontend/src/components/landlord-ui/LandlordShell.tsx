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
  Megaphone,
  Receipt,
  UserCheck,
  ClipboardList,
  AlertTriangle,
  BadgeCheck,
  Search,
  ChevronDown,
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import LogoutControl from '@/components/LogoutControl';
import { getImageUrl } from '@/lib/utils';

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
      title: 'Portfolio',
      items: [
        { label: 'Dashboard', href: '/dashboard/landlord', prefixes: [], icon: LayoutDashboard },
        {
          label: 'Properties & Units',
          href: '/dashboard/landlord/properties',
          prefixes: ['/dashboard/landlord/properties', '/dashboard/landlord/new'],
          icon: Building2,
        },
        {
          label: 'Bookings & Applications',
          href: '/dashboard/landlord/bookings',
          prefixes: ['/dashboard/landlord/bookings'],
          icon: CalendarCheck,
        },
        {
          label: 'Tenants & Residents',
          href: '/dashboard/landlord/tenants',
          prefixes: ['/dashboard/landlord/tenants'],
          icon: Users,
        },
      ],
    },
    {
      title: 'Finances & Revenue',
      items: [
        {
          label: 'Revenue & Operations',
          href: '/dashboard/landlord/operations',
          prefixes: ['/dashboard/landlord/operations'],
          icon: Receipt,
        },
        {
          label: 'Earnings & Payouts',
          href: '/dashboard/landlord/withdraw',
          prefixes: ['/dashboard/landlord/withdraw'],
          icon: Wallet,
        },
        {
          label: 'Property Expenses',
          href: '/dashboard/landlord/expenses/new',
          prefixes: ['/dashboard/landlord/expenses'],
          icon: CreditCard,
        },
        {
          label: 'Platform Subscription',
          href: '/dashboard/landlord/subscription',
          prefixes: ['/dashboard/landlord/subscription'],
          icon: BadgeCheck,
        },
      ],
    },
    {
      title: 'Operations & Caretakers',
      items: [
        {
          label: 'Resident Notices',
          href: '/dashboard/landlord/notices',
          prefixes: ['/dashboard/landlord/notices'],
          icon: Megaphone,
        },
        {
          label: 'Staff & Caretakers',
          href: '/dashboard/landlord/staff/new',
          prefixes: ['/dashboard/landlord/staff'],
          icon: UserCheck,
        },
        {
          label: 'Fixture Inventory',
          href: '/dashboard/landlord/inventory/new',
          prefixes: ['/dashboard/landlord/inventory'],
          icon: ClipboardList,
        },
        {
          label: 'Report Tenant Breach',
          href: '/dashboard/landlord/disciplinary/new',
          prefixes: ['/dashboard/landlord/disciplinary'],
          icon: AlertTriangle,
        },
      ],
    },
    {
      title: 'Account & Trust',
      items: [
        {
          label: 'ID & Title Deeds',
          href: '/dashboard/verification',
          prefixes: ['/dashboard/verification'],
          icon: ShieldCheck,
        },
        {
          label: 'Notifications',
          href: '/dashboard/notifications',
          prefixes: ['/dashboard/notifications'],
          icon: Bell,
          badge: unreadNotificationsCount,
        },
        {
          label: 'Profile & Settings',
          href: '/dashboard/profile',
          prefixes: ['/dashboard/profile'],
          icon: User,
        },
      ],
    },
  ];

  const [optimisticPath, setOptimisticPath] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticPath(null);
  }, [pathname]);

  const isActive = (item: NavItem) => {
    const current = optimisticPath || pathname;
    if (item.href === '/dashboard/landlord') return current === '/dashboard/landlord';
    return item.prefixes.some((p) => current === p || current.startsWith(`${p}/`));
  };

  const allItems = groups.flatMap((g) => g.items);
  const current = allItems.find(isActive);
  const pageLabel = current?.label || 'Landlord workspace';
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Landlord';
  const initials = `${user?.firstName?.[0] || 'L'}${user?.lastName?.[0] || ''}`.toUpperCase();

  const nav = (onNavigate?: () => void) => (
    <nav aria-label="Landlord navigation" className="flex-1 overflow-y-auto px-3.5 py-4 space-y-4">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    setOptimisticPath(item.href);
                    if (onNavigate) onNavigate();
                  }}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[13.5px] transition-all duration-150 select-none',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
                    active
                      ? 'bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-300 font-semibold border border-[#BBF7D0] dark:border-emerald-800/60 shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-[#15803D] dark:hover:text-emerald-300 hover:bg-[#DCFCE7]/40 dark:hover:bg-emerald-950/30 hover:border-[#BBF7D0]/40 font-medium border border-transparent active:bg-[#DCFCE7] active:text-[#15803D] active:border-[#BBF7D0]'
                  )}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={clsx(
                        'w-4.5 h-4.5 shrink-0 stroke-[2] transition-colors',
                        active ? 'text-[#15803D] dark:text-emerald-300' : 'text-zinc-400 dark:text-zinc-500 stroke-[1.8] group-hover:text-[#15803D]'
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {!!item.badge && item.badge > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E0533C] text-white">
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
    <Link href="/dashboard/landlord" className="flex items-center gap-2.5 group">
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
        <span className="font-black text-base tracking-tight text-[#141816] dark:text-white block leading-none">
          AkwaabaHomes
        </span>
        <span className="text-[10.5px] font-medium text-[#3B6E5C] dark:text-emerald-400 block mt-0.5">
          Live Well. Feel at Home.
        </span>
      </div>
    </Link>
  );

  const footer = (
    <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5 bg-white dark:bg-[#111513]">
      <Link href="/dashboard/profile" className="flex items-center gap-2.5 min-w-0 flex-1">
        <span className="w-9 h-9 rounded-full bg-[#173D32] text-white text-xs font-bold flex items-center justify-center overflow-hidden shrink-0">
          {user?.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getImageUrl(user.avatarUrl)} alt="" className="w-full h-full object-cover" />
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
    <div className="-mt-16 min-h-screen flex flex-col lg:flex-row bg-white dark:bg-[#0D100E] text-[#242925] dark:text-[#F2F2EE]">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white dark:bg-[#141816] border-r border-zinc-200 dark:border-zinc-800 sticky top-0 h-screen">
        <div className="h-16 px-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center shrink-0">{brand}</div>
        {nav()}
        {footer}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-[#141816] border-b border-zinc-100 dark:border-zinc-800 px-4 sm:px-6 lg:px-8 flex items-center justify-between fixed top-0 left-0 right-0 lg:left-64 z-30">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="p-2 -ml-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 cursor-pointer"
            >
              <Menu className="w-5 h-5 stroke-[2]" />
            </button>
            <div className="relative flex-1 max-w-md hidden sm:block">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search your properties, bookings..."
                className="w-full h-10 pl-10 pr-4 rounded-full bg-[#EEF2F6] dark:bg-zinc-800/80 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              <button
                type="button"
                aria-label="Notifications"
                className="relative p-2 text-zinc-700 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <Bell className="w-5 h-5 stroke-[1.8]" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-zinc-900 leading-none">
                  3
                </span>
              </button>
            </div>
            <Link
              href="/dashboard/profile"
              aria-label="Profile and settings"
              className="flex items-center gap-1.5 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden ring-2 ring-emerald-500/20 bg-zinc-200 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user?.avatarUrl ? getImageUrl(user.avatarUrl) : '/images/avatars/stephen-darko.png'}
                  alt="Stephen Darko"
                  className="w-full h-full object-cover"
                />
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-600 hidden sm:block stroke-[2.2]" />
            </Link>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-6 sm:pt-22 sm:pb-8">{children}</main>
      </div>

      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-[#141816] h-full flex flex-col z-10 shadow-xl">
            <div className="h-16 px-4 border-b border-zinc-200 flex items-center justify-between">
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
