'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { LayoutDashboard, LogOut, Loader2, Home, ListTodo, User, Plus, ShieldCheck, Building, CreditCard, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import { SocketProvider } from '@/providers/SocketProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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

  // Protect routes and redirect correctly
  useEffect(() => {
    if (!isLoading) {
      if (error || !user) {
        router.push('/login');
      } else if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (user.role === 'TENANT' && pathname.includes('/landlord')) {
        router.push('/dashboard/tenant');
      } else if (user.role === 'LANDLORD' && pathname.includes('/tenant')) {
        router.push('/dashboard/landlord');
      }
    }
  }, [user, isLoading, error, router, pathname]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  const handleLogout = async () => {
    await api.post('/auth/logout');
    window.location.href = '/login';
  };

  let links: any[] = [];
  
  if (user.role === 'LANDLORD') {
    links = [
      { name: 'Booking Requests', href: '/dashboard/landlord', icon: ListTodo },
      { name: 'My Properties', href: '/dashboard/landlord/properties', icon: Building },
      { name: 'List Property', href: '/dashboard/landlord/new', icon: Plus },
      { name: 'My Profile', href: '/dashboard/profile', icon: User },
      { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      { name: 'ID Verification', href: '/dashboard/verification', icon: ShieldCheck },
    ];
  } else {
    links = [
      { name: 'My Bookings', href: '/dashboard/tenant', icon: LayoutDashboard },
      { name: 'Find Properties', href: '/properties', icon: Home },
      { name: 'Find Roommates', href: '/dashboard/roommates', icon: User },
      { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
      { name: 'My Profile', href: '/dashboard/profile', icon: User },
      { name: 'ID Verification', href: '/dashboard/verification', icon: ShieldCheck },
    ];
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8 min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <div className="w-full md:w-64 shrink-0">
        <div className="glass-card rounded-2xl p-6 sticky top-24">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-[var(--primary)] font-bold text-xl">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div>
              <h3 className="font-bold text-[var(--foreground)] leading-tight">{user.firstName} {user.lastName}</h3>
              <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider font-semibold">{user.role}</p>
            </div>
          </div>

          <nav className="space-y-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${isActive ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--muted-foreground)] hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[var(--foreground)]'}`}
                >
                  <Icon className="w-5 h-5" />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-6 border-t border-[var(--border)]">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        <SocketProvider>
          {children}
        </SocketProvider>
      </div>
    </div>
  );
}
