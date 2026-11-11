'use client';

import { usePathname } from 'next/navigation';
import { usePublicResource, publicGet } from '@/lib/publicFetch';
import dynamic from 'next/dynamic';

const MaintenanceScreen = dynamic(() => import('./MaintenanceScreen'), { ssr: false });

// Deterministic SSR-safe default so server HTML and initial client hydration match 100%
const DEFAULT_PUBLIC_CONFIG = { maintenanceMode: false };

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard/admin');
  const isLoginRoute = pathname === '/login' || pathname === '/register';
  const isExemptRoute = isLoginRoute || pathname === '/button-preview' || pathname?.startsWith('/button-preview');

  // ── 1. Fetch public system config non-blockingly so SSR & LCP render at 0ms ──
  const { data: config } = usePublicResource(
    'public-config',
    async () => {
      try {
        return await publicGet('/config/public');
      } catch {
        return DEFAULT_PUBLIC_CONFIG;
      }
    },
    { placeholderData: DEFAULT_PUBLIC_CONFIG, refetchInterval: 15000, staleTime: 10000 }
  );

  const isMaintenanceActive = Boolean(config?.maintenanceMode);

  // ── 2. Only check session role in MaintenanceGuard if maintenance mode is active ──
  const { data: currentUserRes } = usePublicResource(
    'auth/session',
    async () => {
      try {
        return await publicGet('/auth/session');
      } catch {
        return { user: null };
      }
    },
    { enabled: isMaintenanceActive && !isAdminRoute && !isExemptRoute, staleTime: 5 * 60 * 1000 }
  );
  const currentUser = currentUserRes?.user;

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
