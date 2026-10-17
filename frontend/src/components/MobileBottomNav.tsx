'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  Search,
  LayoutDashboard,
  MessageSquare,
  User,
  Heart,
  Building,
  LogIn,
  Wrench,
  Key,
  CalendarCheck,
} from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/axios';

export default function MobileBottomNav() {
  const pathname = usePathname() || '';

  const { data: userResponse } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const user = userResponse?.user;
  const isAuthenticated = !!user;
  const isCaretaker = user?.role === 'CARETAKER' || user?.role === 'STAFF';
  const isLandlord = user?.role === 'LANDLORD';

  if (
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/verify-email') ||
    pathname === '/onboarding'
  ) {
    return null;
  }

  const navTabs = isAuthenticated
    ? isCaretaker
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
        ]
    : [
        {
          name: 'Home',
          href: '/',
          icon: Home,
          isActive: pathname === '/',
        },
        {
          name: 'Search',
          href: '/search',
          icon: Search,
          isActive: pathname === '/search' || pathname.startsWith('/properties'),
        },
        {
          name: 'Saved',
          href: '/saved',
          icon: Heart,
          isActive: pathname === '/saved' || pathname === '/dashboard/wishlist',
        },
        {
          name: 'Sign in',
          href: '/login',
          icon: LogIn,
          isActive: pathname === '/login',
        },
      ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#141816]/95 backdrop-blur-md border-t border-[#E7E7DF] dark:border-[#262E2A] px-2 py-1.5 shadow-[0_-2px_10px_rgba(23,61,50,0.04)]"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              aria-current={tab.isActive ? 'page' : undefined}
              className={clsx(
                'flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all duration-150 min-w-[56px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173D32]',
                tab.isActive
                  ? 'text-[#173D32] dark:text-emerald-400 font-bold'
                  : 'text-[#6F756F] dark:text-[#9EA69F] hover:text-[#242925] dark:hover:text-white font-medium'
              )}
            >
              <div className="relative">
                <Icon className={clsx('w-5 h-5', tab.isActive && 'stroke-[2.3]')} />
                {tab.isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#173D32] dark:bg-emerald-400 rounded-full" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

