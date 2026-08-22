'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { LayoutDashboard, LogOut, Loader2, Home, ListTodo, User, Plus, ShieldCheck, Building, CreditCard, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import { SocketProvider } from '@/providers/SocketProvider';
import ModernSidebar, { SidebarGroup } from '@/components/ModernSidebar';

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

  let sidebarGroups: SidebarGroup[] = [];
  
  if (user.role === 'LANDLORD') {
    sidebarGroups = [
      {
        title: 'MAIN',
        links: [
          { name: 'Dashboard', href: '/dashboard/landlord', icon: ListTodo },
          { name: 'Properties', href: '/dashboard/landlord/properties', icon: Building },
          { name: 'List Property', href: '/dashboard/landlord/new', icon: Plus },
        ]
      },
      {
        title: 'ACCOUNT',
        links: [
          { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
          { name: 'Profile', href: '/dashboard/profile', icon: User },
          { name: 'Verification', href: '/dashboard/verification', icon: ShieldCheck },
        ]
      }
    ];
  } else {
    sidebarGroups = [
      {
        title: 'MAIN',
        links: [
          { name: 'My Bookings', href: '/dashboard/tenant', icon: LayoutDashboard },
          { name: 'Find Properties', href: '/properties', icon: Home },
          { name: 'Find Roommates', href: '/dashboard/roommates', icon: User },
        ]
      },
      {
        title: 'ACCOUNT',
        links: [
          { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
          { name: 'Profile', href: '/dashboard/profile', icon: User },
          { name: 'Verification', href: '/dashboard/verification', icon: ShieldCheck },
        ]
      }
    ];
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] w-full bg-slate-50 dark:bg-[#0a0a0a] overflow-hidden">
      <ModernSidebar user={user} groups={sidebarGroups} onLogout={handleLogout} />

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-full">
          <SocketProvider>
            {children}
          </SocketProvider>
        </div>
      </div>
    </div>
  );
}
