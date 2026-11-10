'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/axios';
import BrandLoader from '@/components/BrandLoader';
import AdminShell from '@/components/admin/AdminShell';
import AdminInactivityLock from '@/components/admin/AdminInactivityLock';
import AdminPwaInstallPrompt from '@/components/AdminPwaInstallPrompt';

const USER_CACHE_KEY = 'akwaaba_cached_user_v1';

function getInitialAdminUser() {
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(USER_CACHE_KEY) || localStorage.getItem(USER_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.user?.role === 'ADMIN' || parsed?.user?.role === 'SUPER_ADMIN') {
          return parsed;
        }
      }
    } catch {}
  }
  return undefined;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: userResponse, isLoading, isFetching, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      if (typeof window !== 'undefined' && data?.user) {
        try {
          const serialized = JSON.stringify(data);
          sessionStorage.setItem(USER_CACHE_KEY, serialized);
          localStorage.setItem(USER_CACHE_KEY, serialized);
        } catch {}
      }
      return data;
    },
    placeholderData: getInitialAdminUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const user = userResponse?.user;

  // Protect Admin routes
  useEffect(() => {
    // Skip protection for the admin login page itself
    if (pathname === '/admin/login') return;

    if (!isLoading && !isFetching) {
      if (error || !user) {
        router.push('/admin/login');
      } else if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        // If a non-admin somehow gets here, kick them out
        window.location.href = '/login';
      }
    }
  }, [user, isLoading, isFetching, error, router, pathname]);

  // If on login page, render children with admin manifest and install prompt
  if (pathname === '/admin/login') {
    return (
      <>
        <link rel="manifest" href="/admin-manifest.json" />
        <meta name="theme-color" content="#0A0F1D" />
        <meta name="apple-mobile-web-app-title" content="Akwaaba Admin" />
        {children}
        <AdminPwaInstallPrompt />
      </>
    );
  }

  if (isLoading && !user) {
    return <BrandLoader message="VERIFYING SECURITY CLEARANCE" fullScreen={true} />;
  }

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) return null;

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    try {
      sessionStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem(USER_CACHE_KEY);
    } catch {}
    window.location.href = '/admin/login';
  };

  return (
    <AdminInactivityLock user={user}>
      <AdminShell user={user} onLogout={handleLogout}>
        <link rel="manifest" href="/admin-manifest.json" />
        <meta name="theme-color" content="#0A0F1D" />
        <meta name="apple-mobile-web-app-title" content="Akwaaba Admin" />
        {children}
        <AdminPwaInstallPrompt />
      </AdminShell>
    </AdminInactivityLock>
  );
}
