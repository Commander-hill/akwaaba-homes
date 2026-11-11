'use client';
import '@/app/secondary.css';

import Link from 'next/link';
import clsx from 'clsx';
import {
  Search,
  LayoutDashboard,
  MessageSquare,
  User,
  Heart,
  Building,
  Wrench,
  Key,
  CalendarCheck,
} from 'lucide-react';

export default function MobileBottomNavAuth({
  pathname,
  isCaretaker,
  isLandlord,
}: {
  pathname: string;
  isCaretaker: boolean;
  isLandlord: boolean;
}) {
  const navTabs = isCaretaker
    ? [
        {
          name: 'Command',
          href: '/dashboard/caretaker',
          icon: LayoutDashboard,
          isActive: pathname === '/dashboard/caretaker',
        },
        {
          name: 'Repairs',
          href: '/dashboard/caretaker?tab=maintenance',
          icon: Wrench,
          isActive: false,
        },
        {
          name: 'Gatehouse',
          href: '/dashboard/caretaker?tab=gatehouse',
          icon: Key,
          isActive: false,
        },
        {
          name: 'Messages',
          href: '/dashboard/messages',
          icon: MessageSquare,
          isActive: pathname.startsWith('/dashboard/messages'),
        },
        {
          name: 'Profile',
          href: '/dashboard/profile',
          icon: User,
          isActive: pathname.startsWith('/dashboard/profile'),
        },
      ]
    : isLandlord
    ? [
        {
          name: 'Explore',
          href: '/properties',
          icon: Search,
          isActive: pathname === '/properties' || pathname === '/search',
        },
        {
          name: 'Dashboard',
          href: '/dashboard/landlord',
          icon: LayoutDashboard,
          isActive: pathname === '/dashboard/landlord',
        },
        {
          name: 'Properties',
          href: '/dashboard/landlord/properties',
          icon: Building,
          isActive: pathname === '/dashboard/landlord/properties',
        },
        {
          name: 'Messages',
          href: '/dashboard/messages',
          icon: MessageSquare,
          isActive: pathname.startsWith('/dashboard/messages'),
        },
        {
          name: 'Profile',
          href: '/dashboard/profile',
          icon: User,
          isActive: pathname.startsWith('/dashboard/profile'),
        },
      ]
    : [
        {
          name: 'Explore',
          href: '/search',
          icon: Search,
          isActive: pathname === '/' || pathname === '/search' || pathname.startsWith('/properties'),
        },
        {
          name: 'Saved',
          href: '/saved',
          icon: Heart,
          isActive: pathname === '/saved' || pathname === '/dashboard/wishlist',
        },
        {
          name: 'Bookings',
          href: '/bookings',
          icon: CalendarCheck,
          isActive: pathname.startsWith('/bookings') || pathname.startsWith('/dashboard/tenant/bookings'),
        },
        {
          name: 'Dashboard',
          href: '/dashboard/tenant',
          icon: LayoutDashboard,
          isActive: pathname === '/dashboard/tenant' || pathname === '/dashboard',
        },
        {
          name: 'Account',
          href: '/profile',
          icon: User,
          isActive: pathname.startsWith('/profile') || pathname.startsWith('/dashboard/profile') || pathname.startsWith('/settings'),
        },
      ];

  return (
    <>
      {navTabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link
            prefetch={false}
            key={tab.name}
            href={tab.href}
            aria-current={tab.isActive ? 'page' : undefined}
            className={clsx(
              'flex flex-col items-center justify-center min-h-[44px] py-1 px-2.5 rounded-xl transition-all duration-150 min-w-[56px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] active:scale-[0.93]',
              tab.isActive
                ? 'text-[#166534] dark:text-emerald-400 font-bold bg-[#16A34A]/10 dark:bg-emerald-400/10 shadow-2xs'
                : 'text-[#525852] dark:text-[#9EA69F] hover:text-[#242925] dark:hover:text-white font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800/40'
            )}
          >
            <div className="relative">
              <Icon className={clsx('w-5 h-5', tab.isActive && 'stroke-[2.3]')} />
              {tab.isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#166534] dark:bg-emerald-400 rounded-full" />
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight leading-none">{tab.name}</span>
          </Link>
        );
      })}
    </>
  );
}
