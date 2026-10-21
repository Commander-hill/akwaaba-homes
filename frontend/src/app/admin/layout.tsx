'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import api from '@/lib/axios';
import BrandLoader from '@/components/BrandLoader';
import AdminShell from '@/components/admin/AdminShell';
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
      } else if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        // If a non-admin somehow gets here, kick them out
        window.location.href = '/login';
      }
    }
  }, [user, isLoading, error, router, pathname]);

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
    localStorage.removeItem('akwaaba_access_token');
    localStorage.removeItem('akwaaba_refresh_token');
    window.location.href = '/admin/login';
  };

  return (
    <AdminShell user={user} onLogout={handleLogout}>
      <link rel="manifest" href="/admin-manifest.json" />
      <meta name="theme-color" content="#0A0F1D" />
      <meta name="apple-mobile-web-app-title" content="Akwaaba Admin" />
      {children}
      <AdminPwaInstallPrompt />
    </AdminShell>
  );
}
