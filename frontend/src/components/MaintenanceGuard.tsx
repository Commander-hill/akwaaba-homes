'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import api from '@/lib/axios';
import MaintenanceScreen from './MaintenanceScreen';

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 1. Fetch public system config to check maintenance mode status
  const { data: config } = useQuery({
    queryKey: ['public-system-config'],
    queryFn: async () => {
      try {
        const res = await api.get('/config/public');
        return res.data;
      } catch (err) {
        return { maintenanceMode: false };
      }
    },
    refetchInterval: 30000, // Check maintenance status every 30 seconds
  });

  // 2. Fetch current logged-in user profile to check if user is an ADMIN
  const { data: currentUser } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        const res = await api.get('/auth/me');
        return res.data.user;
      } catch (err) {
        return null;
      }
    },
    staleTime: 60000,
  });

  // 3. Exempt Admin routes and Login page from maintenance screen block
  const isAdminRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/dashboard/admin');
  const isLoginRoute = pathname === '/login' || pathname === '/register';
  const isAdminUser = currentUser?.role === 'ADMIN';

  // If Maintenance Mode is ENABLED:
  // Admin users, Admin routes, and login pages bypass maintenance mode
  if (config?.maintenanceMode) {
    if (isAdminUser || isAdminRoute || isLoginRoute) {
      return <>{children}</>;
    }
    // Render Maintenance Mode Screen for non-admin users
    return <MaintenanceScreen />;
  }

  // Normal operation
  return <>{children}</>;
}
