'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Loader2, LayoutDashboard, Users, Building, CalendarCheck, CreditCard, Star, Activity, Megaphone, BarChart3, Wrench, Scale, Settings, Radio, FileCheck, Menu } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import ModernSidebar, { SidebarGroup } from '@/components/ModernSidebar';
import AdminPwaInstallPrompt from '@/components/AdminPwaInstallPrompt';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Protect Admin routes
  useEffect(() => {
    // Skip protection for the admin login page itself
    if (pathname === '/admin/login') return;

    if (!isLoading) {
      if (error || !user) {
        router.push('/admin/login');
      } else if (user.role !== 'ADMIN') {
        // If a non-admin somehow gets here, kick them out
        window.location.href = '/login';
      }
    }
  }, [user, isLoading, error, router, pathname]);

  // If on login page, render children with admin manifest and install prompt
  if (pathname === '/admin/login') {
    return (
      <>
        <head>
          <link rel="manifest" href="/admin-manifest.json" />
          <meta name="theme-color" content="#0A0F1D" />
          <meta name="apple-mobile-web-app-title" content="Akwaaba Admin" />
        </head>
        {children}
        <AdminPwaInstallPrompt />
      </>
    );
  }

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-950">
        <div className="h-1 w-full bg-[#0F5132] animate-pulse" />
        <div className="flex flex-1 flex-col items-center justify-center text-white">
          <Loader2 className="w-12 h-12 animate-spin text-[#198754] mb-4" />
          <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">Verifying Security Clearance...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') return null;

  const handleLogout = async () => {
    await api.post('/auth/logout');
    window.location.href = '/admin/login';
  };

  const adminSidebarGroups: SidebarGroup[] = [
    {
      title: 'SYSTEM CONTROLS',
      links: [
        { name: 'System Overview', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Global Config', href: '/admin/config', icon: Settings },
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'Properties', href: '/admin/properties', icon: Building },
        { name: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
        { name: 'Tickets', href: '/admin/tickets', icon: Wrench },
      ]
    },
    {
      title: 'MANAGEMENT',
      links: [
        { name: 'Analytics & Insights', href: '/admin/analytics', icon: BarChart3 },
        { name: 'Subscriptions', href: '/admin/transactions', icon: CreditCard },
        { name: 'Reviews', href: '/admin/reviews', icon: Star },
        { name: 'System Activity', href: '/admin/activity', icon: Activity },
        { name: 'Tenant Breaches', href: '/admin/breaches', icon: Scale },
        { name: 'Deed Audits', href: '/admin/deeds', icon: FileCheck },
        { name: 'Dynamic Notices', href: '/admin/notices', icon: Megaphone },
        { name: 'Push Broadcasts', href: '/admin/broadcasts', icon: Radio },
      ]
    }
  ];

  return (
    <div className="flex h-screen w-full bg-[#FBFBFC] dark:bg-[#0B0D12] overflow-hidden -mt-20">
      <head>
        <link rel="manifest" href="/admin-manifest.json" />
        <meta name="theme-color" content="#0A0F1D" />
        <meta name="apple-mobile-web-app-title" content="Akwaaba Admin" />
      </head>

      <ModernSidebar 
        user={user} 
        groups={adminSidebarGroups} 
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-[#FBFBFC] dark:bg-[#0B0D12] flex flex-col min-w-0">
        {/* Admin Header with Notification Bell */}
        <div className="h-16 md:h-20 shrink-0 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 sm:px-6 md:px-8 bg-white/95 dark:bg-[#0B0D12]/95 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Open admin navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-zinc-950 dark:text-white font-extrabold tracking-tight capitalize truncate">
              {pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>

        <div className="p-4 sm:p-6 md:p-8">
          {children}
        </div>
      </div>
      <AdminPwaInstallPrompt />
    </div>
  );
}
