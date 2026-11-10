'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { 
  LayoutDashboard, User, Users, 
  BadgeCheck, CreditCard, MessageSquare, Wrench, 
  Key, Gauge, Menu, Bell, Building2
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import ModernSidebar, { SidebarGroup } from '@/components/ModernSidebar';
import NotificationBell from '@/components/NotificationBell';
import BrandLoader from '@/components/BrandLoader';
import TenantShell from '@/components/tenant-ui/TenantShell';
import LandlordShell from '@/components/landlord-ui/LandlordShell';

const USER_CACHE_KEY = 'akwaaba_cached_user_v1';

// Deterministic SSR-safe optimistic shell based purely on pathname (100% identical on server and client)
function getDeterministicRouteUser(pathname: string) {
  if (pathname.startsWith('/dashboard/landlord')) {
    return {
      user: {
        id: 'optimistic-landlord',
        role: 'LANDLORD',
        firstName: 'Stephen',
        lastName: 'Darko',
        isVerifiedLandlord: true,
      },
      _optimistic: true,
    };
  }
  if (pathname.startsWith('/dashboard/tenant')) {
    return {
      user: {
        id: 'optimistic-tenant',
        role: 'TENANT',
        firstName: 'Stephen',
        lastName: 'Darko',
      },
      _optimistic: true,
    };
  }
  return undefined;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cachedSession, setCachedSession] = useState<any>(undefined);

  const isGuestAllowedRoute = pathname === '/dashboard/wishlist';

  // Read client storage only after hydration so SSR and initial client render match 100%
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(USER_CACHE_KEY) || localStorage.getItem(USER_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.user?.role) {
          setCachedSession(parsed);
        }
      }
    } catch {}
  }, []);

  const { data: userResponse, isLoading, isFetching, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (typeof window !== 'undefined' && data?.user) {
          try {
            const serialized = JSON.stringify(data);
            sessionStorage.setItem(USER_CACHE_KEY, serialized);
            localStorage.setItem(USER_CACHE_KEY, serialized);
          } catch {}
        }
        return data;
      } catch (err) {
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem(USER_CACHE_KEY);
            localStorage.removeItem(USER_CACHE_KEY);
          } catch {}
        }
        setCachedSession(undefined);
        throw err;
      }
    },
    placeholderData: () => getDeterministicRouteUser(pathname),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const effectiveResponse = userResponse && !(userResponse as any)?._optimistic
    ? userResponse
    : cachedSession || userResponse;

  const isOptimisticPlaceholder = Boolean((effectiveResponse as any)?._optimistic);
  const user = error ? undefined : effectiveResponse?.user;

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      try {
        const res = await api.get('/notifications');
        return res.data;
      } catch {
        return { notifications: [], unreadCount: 0 };
      }
    },
    enabled: !!user && !isOptimisticPlaceholder && !error,
    staleTime: 30000,
  });
  const unreadNotificationsCount = notificationsData?.unreadCount || 0;

  useEffect(() => {
    if (!isLoading && !isFetching) {
      if ((error || !user) && !isGuestAllowedRoute) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (user?.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if ((user?.role === 'CARETAKER' || user?.role === 'STAFF') && (
        pathname.startsWith('/dashboard/tenant') || 
        (pathname.startsWith('/dashboard/landlord') &&
          !pathname.startsWith('/dashboard/landlord/inspections') &&
          !pathname.startsWith('/dashboard/landlord/notices/new') &&
          !pathname.startsWith('/dashboard/landlord/inventory/new') &&
          !pathname.startsWith('/dashboard/landlord/disciplinary/new')) ||
        pathname.startsWith('/dashboard/roommates') ||
        pathname.startsWith('/dashboard/wishlist')
      )) {
        router.push('/dashboard/caretaker');
      } else if (user?.role === 'TENANT' && (pathname.startsWith('/dashboard/landlord') || pathname.startsWith('/dashboard/caretaker'))) {
        router.push('/dashboard/tenant');
      } else if (user?.role === 'LANDLORD' && (pathname.startsWith('/dashboard/tenant') || pathname.startsWith('/dashboard/caretaker') || pathname.startsWith('/dashboard/roommates') || pathname.startsWith('/dashboard/wishlist'))) {
        router.push('/dashboard/landlord');
      }
    }
  }, [user, isLoading, isFetching, error, router, pathname, isGuestAllowedRoute]);

  if (isLoading && !user) {
    return <BrandLoader message="LOADING YOUR WORKSPACE" fullScreen={true} />;
  }

  // Allow guest access on /dashboard/wishlist (renders inside public shell)
  if (!user && isGuestAllowedRoute) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0D100E] text-[#242925] dark:text-[#F2F2EE]">
        <div className="container-akwaaba py-8">{children}</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    try {
      sessionStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem('akwaaba_access_token');
      localStorage.removeItem('akwaaba_refresh_token');
    } catch {}
    window.location.href = '/login';
  };

  // Dedicated Authenticated Tenant Shell for TENANT role
  if (user.role === 'TENANT') {
    return (
      <TenantShell
        user={user}
        unreadNotificationsCount={unreadNotificationsCount}
        onLogout={handleLogout}
      >
        {children}
      </TenantShell>
    );
  }

  if (user.role === 'LANDLORD') {
    return (
      <LandlordShell
        user={user}
        unreadNotificationsCount={unreadNotificationsCount}
        onLogout={handleLogout}
      >
        {children}
      </LandlordShell>
    );
  }

  // Preserve Caretaker portal untouched
  const sidebarGroups: SidebarGroup[] = [
    {
      title: 'OPERATIONS DESK',
      links: [
        { name: 'Overview', href: '/dashboard/caretaker', icon: LayoutDashboard },
        { name: 'Gatehouse & Parcels', href: '/dashboard/caretaker?tab=gatehouse', icon: Key },
        { name: 'Residents & Check-In', href: '/dashboard/caretaker?tab=residents', icon: Users },
        { name: 'Repairs & Maintenance', href: '/dashboard/caretaker?tab=maintenance', icon: Wrench },
        { name: 'Utilities & Notices', href: '/dashboard/caretaker?tab=utilities', icon: Gauge },
      ]
    },
    {
      title: 'ACCOUNT',
      links: [
        { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
        { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, badge: unreadNotificationsCount },
        { name: 'Profile', href: '/dashboard/profile', icon: User },
        { name: 'Verification', href: '/dashboard/verification', icon: BadgeCheck },
      ]
    }
  ];

  return (
    <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-4rem)] w-full bg-[#FBFBF9] dark:bg-[#0D0F12] text-zinc-900 dark:text-zinc-100 antialiased overflow-hidden">
      <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white dark:bg-[#14181E] border-b border-zinc-200 dark:border-zinc-800 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Open portal navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-xs tracking-tight text-zinc-900 dark:text-white uppercase">
            Caretaker Ops
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link
            href="/dashboard/profile"
            className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400 font-extrabold text-xs"
          >
            {user.firstName?.[0] || 'U'}
          </Link>
        </div>
      </div>

      <Suspense fallback={<div className="hidden md:block w-64 bg-[#0D0F14]" />}>
        <ModernSidebar 
          user={user} 
          groups={sidebarGroups} 
          onLogout={handleLogout}
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
      </Suspense>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-[#0D0F12] min-w-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 min-h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
