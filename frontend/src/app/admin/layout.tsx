'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { LogOut, Loader2, ShieldCheck, Users, Building, CalendarCheck, CreditCard, Star, Activity, Megaphone, BarChart3, Wrench, Scale, Settings, Radio } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import NotificationBell from '@/components/NotificationBell';
import ModernSidebar, { SidebarGroup } from '@/components/ModernSidebar';
import AdminPwaInstallPrompt from '@/components/AdminPwaInstallPrompt';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { data: userResponse, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
    retry: false,
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

  if (isLoading || !user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-12 h-12 animate-spin text-purple-500 mb-4" />
        <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">Verifying Security Clearance...</p>
      </div>
    );
  }

  const handleLogout = async () => {
    await api.post('/auth/logout');
    window.location.href = '/admin/login';
  };

  const adminSidebarGroups: SidebarGroup[] = [
    {
      title: 'SYSTEM CONTROLS',
      links: [
        { name: 'System Overview', href: '/admin/dashboard', icon: ShieldCheck },
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
        { name: 'Dynamic Notices', href: '/admin/notices', icon: Megaphone },
        { name: 'Push Broadcasts', href: '/admin/broadcasts', icon: Radio },
      ]
    }
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#0a0a0a] overflow-hidden -mt-20">
      <head>
        <link rel="manifest" href="/admin-manifest.json" />
        <meta name="theme-color" content="#0A0F1D" />
        <meta name="apple-mobile-web-app-title" content="Akwaaba Admin" />
      </head>

      <ModernSidebar user={user} groups={adminSidebarGroups} onLogout={handleLogout} />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0a0a0a] flex flex-col">
        {/* Admin Header with Notification Bell */}
        <div className="h-20 shrink-0 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 bg-white/80 dark:bg-[#111111]/80 backdrop-blur-md sticky top-0 z-10">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white capitalize">
            {pathname.split('/').pop()?.replace(/-/g, ' ') || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-4">
            <NotificationBell />
          </div>
        </div>

        <div className="p-8">
          {children}
        </div>
      </div>
      <AdminPwaInstallPrompt />
    </div>
  );
}
