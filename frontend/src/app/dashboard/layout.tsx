'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { 
  LayoutDashboard, Loader2, User, Users, 
  BadgeCheck, CreditCard, MessageSquare, Wrench, 
  Key, Gauge, Menu, Bell, Building2
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import ModernSidebar, { SidebarGroup } from '@/components/ModernSidebar';
import NotificationBell from '@/components/NotificationBell';
import TenantShell from '@/components/tenant-ui/TenantShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isGuestAllowedRoute = pathname === '/dashboard/wishlist';

  const { data: userResponse, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const user = userResponse?.user;

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
    enabled: !!user,
    staleTime: 30000,
  });
  const unreadNotificationsCount = notificationsData?.unreadCount || 0;

  useEffect(() => {
    if (!isLoading) {
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
  }, [user, isLoading, error, router, pathname, isGuestAllowedRoute]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F7F2] dark:bg-[#0D100E] text-[#242925] dark:text-[#F2F2EE]">
        <Loader2 className="w-7 h-7 animate-spin text-[#173D32]" />
        <span className="text-xs font-medium text-[#6F756F] mt-2.5">Loading your workspace...</span>
      </div>
    );
  }

  // Allow guest access on /dashboard/wishlist (renders inside public shell)
  if (!user && isGuestAllowedRoute) {
    return (
      <div className="min-h-screen bg-[#F8F7F2] dark:bg-[#0D100E] text-[#242925] dark:text-[#F2F2EE]">
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
    localStorage.removeItem('akwaaba_access_token');
    localStorage.removeItem('akwaaba_refresh_token');
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

  // Preserve Landlord and Caretaker portals untouched
  let sidebarGroups: SidebarGroup[] = [];
  
  if (user.role === 'LANDLORD') {
    sidebarGroups = [
      {
        title: 'EXECUTIVE PILLARS',
        links: [
          { name: 'Overview', href: '/dashboard/landlord', icon: LayoutDashboard },
          { name: 'Portfolio & Units', href: '/dashboard/landlord?tab=portfolio', icon: Building2 },
          { name: 'Financials & Escrow', href: '/dashboard/landlord?tab=financials', icon: CreditCard },
          { name: 'Tenancies & Leases', href: '/dashboard/landlord?tab=tenancies', icon: Users },
          { name: 'Facility & Operations', href: '/dashboard/landlord?tab=operations', icon: Wrench },
        ]
      },
      {
        title: 'ACCOUNT & ALERTS',
        links: [
          { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
          { name: 'Profile & MoMo', href: '/dashboard/profile', icon: User },
          { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, badge: unreadNotificationsCount },
          { name: 'Verification Status', href: '/dashboard/verification', icon: BadgeCheck },
        ]
      }
    ];
  } else {
    sidebarGroups = [
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
  }

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
            {user.role === 'LANDLORD' ? 'Landlord Hub' : 'Caretaker Ops'}
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

      <div className="flex-1 overflow-y-auto bg-[#FBFBF9] dark:bg-[#0D0F12] min-w-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 min-h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
