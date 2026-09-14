'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Home, Compass, LayoutDashboard, MessageSquare, User, Heart, Building, LogIn, Wrench } from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/axios';

export default function MobileBottomNav() {
  const pathname = usePathname();

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

  // Derive dashboard link
  const dashboardHref = user?.role === 'ADMIN' 
    ? '/admin/dashboard' 
    : user?.role === 'LANDLORD' 
    ? '/dashboard/landlord' 
    : (user?.role === 'CARETAKER' || user?.role === 'STAFF')
    ? '/dashboard/caretaker'
    : '/dashboard/tenant';

  // Define nav tabs based on authentication state
  const navTabs = isAuthenticated
    ? [
        {
          name: 'Explore',
          href: '/properties',
          icon: Compass,
          isActive: pathname === '/properties' || pathname === '/',
        },
        {
          name: (user?.role === 'CARETAKER' || user?.role === 'STAFF') ? 'Ops Hub' : 'Dashboard',
          href: dashboardHref,
          icon: LayoutDashboard,
          isActive: (pathname?.startsWith('/dashboard') && !pathname?.startsWith('/dashboard/messages') && !pathname?.startsWith('/dashboard/profile') && !pathname?.startsWith('/dashboard/wishlist')) || pathname?.startsWith('/admin'),
        },
        {
          name: 'Messages',
          href: '/dashboard/messages',
          icon: MessageSquare,
          isActive: pathname?.startsWith('/dashboard/messages'),
        },
        ...(user?.role === 'LANDLORD'
          ? [
              {
                name: 'Properties',
                href: '/dashboard/landlord/properties',
                icon: Building,
                isActive: pathname === '/dashboard/landlord/properties',
              },
            ]
          : (user?.role === 'CARETAKER' || user?.role === 'STAFF')
          ? [
              {
                name: 'Tickets',
                href: '/dashboard/caretaker?tab=tickets',
                icon: Wrench,
                isActive: pathname === '/dashboard/caretaker',
              },
            ]
          : [
              {
                name: 'Saved',
                href: '/dashboard/wishlist',
                icon: Heart,
                isActive: pathname === '/dashboard/wishlist',
              },
            ]
        ),
        {
          name: 'Profile',
          href: '/dashboard/profile',
          icon: User,
          isActive: pathname?.startsWith('/dashboard/profile'),
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
          name: 'Explore',
          href: '/properties',
          icon: Compass,
          isActive: pathname?.startsWith('/properties'),
        },
        {
          name: 'Sign In',
          href: '/login',
          icon: LogIn,
          isActive: pathname === '/login',
        },
      ];

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0B0D12]/95 backdrop-blur-md border-t border-zinc-200/90 dark:border-zinc-800/90 px-2 py-1.5 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={clsx(
                "flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 min-w-[52px] cursor-pointer",
                tab.isActive
                  ? "text-[#0F5132] dark:text-[#198754] font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium"
              )}
            >
              <div className="relative">
                <Icon className={clsx("w-5 h-5", tab.isActive && "stroke-[2.4]")} />
                {tab.isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#0F5132] dark:bg-[#198754] rounded-full" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
