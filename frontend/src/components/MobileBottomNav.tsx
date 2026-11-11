'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { publicGet, usePublicResource } from '@/lib/publicFetch';

const MobileBottomNavAuth = dynamic(() => import('./MobileBottomNavAuth'), { ssr: false });

function HomeSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

function SearchSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function HeartSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

function LogInSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" x2="3" y1="12" y2="12" />
    </svg>
  );
}

export default function MobileBottomNav() {
  const pathname = usePathname() || '';

  const isHiddenRoute =
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/verify-email') ||
    pathname === '/onboarding';

  const { data: userResponse } = usePublicResource(
    'auth/session',
    () => publicGet('/auth/session'),
    {
      enabled: !isHiddenRoute,
      staleTime: 5 * 60 * 1000,
    },
  );

  const user = userResponse?.user;
  const isAuthenticated = !!user;
  const isCaretaker = user?.role === 'CARETAKER' || user?.role === 'STAFF';
  const isLandlord = user?.role === 'LANDLORD' || pathname.startsWith('/dashboard/landlord');

  if (isHiddenRoute) {
    return null;
  }

  const guestTabs = [
    {
      name: 'Home',
      href: '/',
      icon: HomeSvg,
      isActive: pathname === '/',
    },
    {
      name: 'Search',
      href: '/search',
      icon: SearchSvg,
      isActive: pathname === '/search' || pathname.startsWith('/properties'),
    },
    {
      name: 'Saved',
      href: '/saved',
      icon: HeartSvg,
      isActive: pathname === '/saved' || pathname === '/dashboard/wishlist',
    },
    {
      name: 'Sign in',
      href: '/login',
      icon: LogInSvg,
      isActive: pathname === '/login',
    },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#141816] border-t border-zinc-200 dark:border-zinc-800 px-2 py-1.5 shadow-[0_-2px_10px_rgba(23,61,50,0.04)]"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-around">
        {isAuthenticated ? (
          <MobileBottomNavAuth pathname={pathname} isCaretaker={isCaretaker} isLandlord={isLandlord} />
        ) : (
          guestTabs.map((tab) => {
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
          })
        )}
      </div>
    </nav>
  );
}
