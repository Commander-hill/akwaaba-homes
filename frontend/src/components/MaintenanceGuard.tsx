'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import api from '@/lib/axios';
import BrandLoader from './BrandLoader';
import MaintenanceScreen from './MaintenanceScreen';

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard/admin');
  const isLoginRoute = pathname === '/login' || pathname === '/register';

  // ── 1. Fetch public system config (source of truth for maintenance state) ──
  const { data: config, isLoading: isConfigLoading } = useQuery({
    queryKey: ['public-config'],
    queryFn: async () => {
      try {
        const res = await api.get('/config/public');
        return res.data;
      } catch {
        return { maintenanceMode: false };
      }
    },
    // Poll every 5s as a safety fallback if socket drops.
    // Socket broadcasts (config_updated) will update the cache instantly.
    refetchInterval: 5000,
    staleTime: 0,
    // Always fetch fresh data even if the window regains focus
    refetchOnWindowFocus: true,
  });

  // ── 2. Fetch session to determine if the user is an ADMIN ────────────────
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        const res = await api.get('/auth/me');
        return res.data.user;
      } catch {
        return null;
      }
    },
    // Keep session reasonably fresh — 30s staleTime balances performance + accuracy
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });

  const isAdminUser = currentUser?.role === 'ADMIN';

  // ── 3. FOUC prevention: block UI render until we know the maintenance state.
  //       Only block non-admin, non-login routes to avoid a flash of the dark
  //       loading screen for administrators.
  if (isConfigLoading && !isAdminRoute && !isLoginRoute) {
    return <BrandLoader message="LOADING AKWAABA HOMES" fullScreen={true} />;
  }

  // ── 4. Admin users and admin/login routes are ALWAYS exempt ──────────────
  if (isAdminUser || isAdminRoute || isLoginRoute) {
    return <>{children}</>;
  }

  // ── 5. Maintenance state is the single source of truth from the backend ──
  //       The backend auto-deactivates when maintenanceEndTime passes and
  //       broadcasts via Socket.io. We trust config.maintenanceMode directly.
  const isMaintenanceActive = Boolean(config?.maintenanceMode);

  if (isMaintenanceActive) {
    const endTime = config?.maintenanceEndTime ? new Date(config.maintenanceEndTime) : undefined;
    return <MaintenanceScreen estimatedEndTime={endTime} />;
  }

  return <>{children}</>;
}
