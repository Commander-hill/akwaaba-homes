'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { LogOut, Loader2, ShieldCheck, Users, Building, CalendarCheck, CreditCard, Star, Activity, Megaphone } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import NotificationBell from '@/components/NotificationBell';

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

  // If on login page, just render children without sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
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

  const adminLinks = [
    { name: 'System Overview', href: '/admin/dashboard', icon: ShieldCheck },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Properties', href: '/admin/properties', icon: Building },
    { name: 'Bookings', href: '/admin/bookings', icon: CalendarCheck },
    { name: 'Subscriptions', href: '/admin/transactions', icon: CreditCard },
    { name: 'Reviews', href: '/admin/reviews', icon: Star },
    { name: 'System Activity', href: '/admin/activity', icon: Activity },
    { name: 'Dynamic Notices', href: '/admin/notices', icon: Megaphone },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a]">
      {/* Top Navbar */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111] sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">Admin<span className="text-purple-600">Portal</span></span>
            </div>
            <div className="flex items-center gap-6">
              <NotificationBell />
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-slate-900 dark:text-white">{user.firstName} {user.lastName}</div>
                <div className="text-xs text-purple-600 font-mono">SUPERADMIN</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                title="Secure Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        {/* Isolated Admin Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white dark:bg-[#111] border border-slate-200 dark:border-slate-800 rounded-xl p-4 sticky top-24 shadow-sm">
            <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 px-3">System Controls</div>
            <nav className="space-y-1">
              {adminLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${isActive ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
