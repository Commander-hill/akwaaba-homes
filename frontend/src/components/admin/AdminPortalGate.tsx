'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import '../../app/dashboard-admin.css';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import BrandLoader from '@/components/BrandLoader';
import AdminShell from '@/components/admin/AdminShell';
import AdminInactivityLock from '@/components/admin/AdminInactivityLock';
import { clearPublicResources } from '@/lib/publicFetch';
import { getRegisteredQueryClient } from '@/lib/queryRegistry';

const AdminPwaInstallPrompt = dynamic(() => import('@/components/AdminPwaInstallPrompt'), {
  ssr: false,
});

const USER_CACHE_KEY = 'akwaaba_cached_user_v1';

interface AdminPortalGateProps {
  initialUser?: any;
  initialFetchedAt?: number;
  children: React.ReactNode;
}

/** Authenticated shell and stylesheet gate for /admin/* portal routes outside /admin/login. */
export default function AdminPortalGate({
  initialUser = null,
  initialFetchedAt,
  children,
}: AdminPortalGateProps) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [cachedAdmin, setCachedAdmin] = useState<any>(undefined);
  const hasValidInitialUser =
    initialUser?.role === 'ADMIN' || initialUser?.role === 'SUPER_ADMIN';

  useEffect(() => {
    setHydrated(true);
    try {
      if (hasValidInitialUser) {
        const serialized = JSON.stringify({ user: initialUser });
        sessionStorage.setItem(USER_CACHE_KEY, serialized);
        localStorage.setItem(USER_CACHE_KEY, serialized);
        return;
      }
      const raw = sessionStorage.getItem(USER_CACHE_KEY) || localStorage.getItem(USER_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.user?.role === 'ADMIN' || parsed?.user?.role === 'SUPER_ADMIN') {
          setCachedAdmin(parsed);
        }
      }
    } catch {}
  }, [hasValidInitialUser, initialUser]);

  const { data: userResponse, isLoading, isFetching, error } = useQuery({
    queryKey: ['auth', 'me'],
    initialData: hasValidInitialUser ? { user: initialUser } : undefined,
    initialDataUpdatedAt: hasValidInitialUser ? initialFetchedAt : undefined,
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
        setCachedAdmin(undefined);
        throw err;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const effectiveResponse =
    userResponse ||
    (hasValidInitialUser ? { user: initialUser } : undefined) ||
    (hydrated ? cachedAdmin : undefined);
  const user = error ? undefined : effectiveResponse?.user;

  useEffect(() => {
    if (!isLoading && !isFetching) {
      if (error || !userResponse?.user) {
        router.push('/admin/login');
      } else if (userResponse.user.role !== 'ADMIN' && userResponse.user.role !== 'SUPER_ADMIN') {
        window.location.href = '/login';
      }
    }
  }, [userResponse, isLoading, isFetching, error, router]);

  if (!user && (!hydrated || isLoading)) {
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
    clearPublicResources();
    getRegisteredQueryClient()?.clear();
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
