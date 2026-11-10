'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import api from '@/lib/axios';
import MaintenanceScreen from './MaintenanceScreen';

const CONFIG_CACHE_KEY = 'akwaaba_public_config_v1';

function getInitialPublicConfig() {
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(CONFIG_CACHE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return { maintenanceMode: false };
}

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard/admin');
  const isLoginRoute = pathname === '/login' || pathname === '/register';
  const isExemptRoute = isLoginRoute || pathname === '/button-preview' || pathname?.startsWith('/button-preview');

  // ── 1. Fetch public system config non-blockingly so SSR & LCP render at 0ms ──
  const { data: config } = useQuery({
    queryKey: ['public-config'],
    queryFn: async () => {
      try {
        const res = await api.get('/config/public');
        if (typeof window !== 'undefined' && res.data) {
          try {
            sessionStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(res.data));
          } catch {}
        }
        return res.data;
      } catch {
        return { maintenanceMode: false };
      }
    },
    placeholderData: getInitialPublicConfig,
    refetchInterval: 15000,
    staleTime: 10000,
    refetchOnWindowFocus: false,
  });

  const isMaintenanceActive = Boolean(config?.maintenanceMode);

  // ── 2. Only check session role in MaintenanceGuard if maintenance mode is active ──
  const { data: currentUser } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        const res = await api.get('/auth/me');
        return res.data.user;
      } catch {
        return null;
      }
    },
    enabled: isMaintenanceActive && !isAdminRoute && !isExemptRoute,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const isAdminUser = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  if (isAdminUser || isAdminRoute || isExemptRoute) {
    return <>{children}</>;
  }

  if (isMaintenanceActive) {
    const endTime = config?.maintenanceEndTime ? new Date(config.maintenanceEndTime) : undefined;
    return <MaintenanceScreen estimatedEndTime={endTime} />;
  }

  return <>{children}</>;
}
