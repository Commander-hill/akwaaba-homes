'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { 
  LayoutDashboard, LogOut, Loader2, Home, ListTodo, User, Users, Plus, 
  BadgeCheck, Scale, Building, CreditCard, MessageSquare, Wrench, BellRing, 
  Package, Key, FileText, Receipt, PhoneCall, KeyRound, Heart, Compass, Calculator,
  Calendar, Armchair, Gauge, ClipboardCheck
} from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
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
    // Use cached data instantly if available, even if stale — avoids white screen on nav
    staleTime: 5 * 60 * 1000,
  });

  const user = userResponse?.user;

  // Protect routes and redirect correctly
  useEffect(() => {
    if (!isLoading) {
      if (error || !user) {
        router.push('/login');
      } else if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if ((user.role === 'CARETAKER' || user.role === 'STAFF') && (pathname.startsWith('/dashboard/tenant') || pathname.startsWith('/dashboard/landlord'))) {
        router.push('/dashboard/caretaker');
      } else if (user.role === 'TENANT' && (pathname.startsWith('/dashboard/landlord') || pathname.startsWith('/dashboard/caretaker'))) {
        router.push('/dashboard/tenant');
      } else if (user.role === 'LANDLORD' && (pathname.startsWith('/dashboard/tenant') || pathname.startsWith('/dashboard/caretaker') || pathname.startsWith('/dashboard/roommates'))) {
        router.push('/dashboard/landlord');
      }
    }
  }, [user, isLoading, error, router, pathname]);

  // While loading or unauthenticated, show a loading placeholder while redirect happens
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="h-1 w-full bg-[var(--primary)] animate-pulse" />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)] opacity-50" />
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await api.post('/auth/logout');
    window.location.href = '/login';
  };

  let sidebarGroups: SidebarGroup[] = [];
  
  if (user?.role === 'LANDLORD') {
    sidebarGroups = [
      {
        title: 'MAIN',
        links: [
          { name: 'Dashboard', href: '/dashboard/landlord', icon: ListTodo },
          { name: 'Properties', href: '/dashboard/landlord/properties', icon: Building },
          { name: 'Tenants', href: '/dashboard/landlord/tenants', icon: Users },
          { name: 'List Property', href: '/dashboard/landlord/new', icon: Plus },
        ]
      },
      {
        title: 'ACCOUNT',
        links: [
          { name: 'Subscription', href: '/dashboard/landlord/subscription', icon: CreditCard },
          { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
          { name: 'Profile', href: '/dashboard/profile', icon: User },
          { name: 'Verification', href: '/dashboard/verification', icon: BadgeCheck },
        ]
      }
    ];
  } else if (user?.role === 'CARETAKER' || user?.role === 'STAFF') {
    sidebarGroups = [
      {
        title: 'OPERATIONS',
        links: [
          { name: 'Operations Hub', href: '/dashboard/caretaker', icon: LayoutDashboard },
          { name: 'Maintenance Tickets', href: '/dashboard/caretaker?tab=tickets', icon: Wrench },
          { name: 'Gatehouse Logbook', href: '/dashboard/caretaker?tab=visitors', icon: Key },
          { name: 'Fixtures & Inventory', href: '/dashboard/caretaker?tab=assets', icon: ClipboardCheck },
          { name: 'Utility Sub-Meters', href: '/dashboard/caretaker?tab=meters', icon: Gauge },
          { name: 'Conduct Logbook', href: '/dashboard/caretaker?tab=conduct', icon: Scale },
          { name: 'Move-In Inspections', href: '/dashboard/caretaker?tab=inspections', icon: FileText },
          { name: 'Package Deliveries', href: '/dashboard/caretaker?tab=parcels', icon: Package },
          { name: 'Compound Notices', href: '/dashboard/caretaker?tab=notices', icon: BellRing },
        ]
      },
      {
        title: 'ACCOUNT',
        links: [
          { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
          { name: 'Profile', href: '/dashboard/profile', icon: User },
          { name: 'Verification', href: '/dashboard/verification', icon: BadgeCheck },
        ]
      }
    ];
  } else {
    sidebarGroups = [
      {
        title: 'RESIDENCE',
        links: [
          { name: 'My Bookings', href: '/dashboard/tenant', icon: LayoutDashboard },
          { name: 'Payment Tranches', href: '/dashboard/tenant?tab=tranches', icon: Calendar },
          { name: 'Unit Inventory', href: '/dashboard/tenant?tab=inventory', icon: Armchair },
          { name: 'Lease & Documents', href: '/dashboard/tenant?tab=documents', icon: FileText },
          { name: 'Rent & Payments', href: '/dashboard/tenant?tab=payments', icon: Receipt },
          { name: 'Maintenance & Repairs', href: '/dashboard/tenant?tab=tickets', icon: Wrench },
          { name: 'Safety & Hotlines', href: '/dashboard/tenant?tab=safety', icon: PhoneCall },
        ]
      },
      {
        title: 'LIVING & COMMUNITY',
        links: [
          { name: 'Find Roommates', href: '/dashboard/roommates', icon: Users },
          { name: 'Bill Splitter', href: '/dashboard/tenant?tab=billsplit', icon: Calculator },
          { name: 'Guest Passes', href: '/dashboard/tenant?tab=visitors', icon: KeyRound },
          { name: 'Package Deliveries', href: '/dashboard/tenant?tab=deliveries', icon: Package },
          { name: 'Saved Wishlist', href: '/dashboard/wishlist', icon: Heart },
          { name: 'Explore Homes', href: '/properties', icon: Compass },
        ]
      },
      {
        title: 'ACCOUNT',
        links: [
          { name: 'Messages', href: '/dashboard/messages', icon: MessageSquare },
          { name: 'Profile', href: '/dashboard/profile', icon: User },
          { name: 'Verification', href: '/dashboard/verification', icon: BadgeCheck },
        ]
      }
    ];
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] w-full bg-slate-50 dark:bg-[#0a0a0a] overflow-hidden">
      <Suspense fallback={<div className="w-64 bg-[#0B0D12]" />}>
        <ModernSidebar user={user} groups={sidebarGroups} onLogout={handleLogout} />
      </Suspense>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
