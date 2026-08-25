'use client';

import { useQuery } from '@tanstack/react-query';
import { usePathname } from 'next/navigation';
import api from '@/lib/axios';
import MaintenanceScreen from './MaintenanceScreen';

export default function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 1. Fetch public system config to check maintenance mode status
  const { data: config, isLoading: isConfigLoading } = useQuery({
    queryKey: ['public-config'],
    queryFn: async () => {
      try {
        const res = await api.get('/config/public');
        return res.data;
      } catch (err) {
        return { maintenanceMode: false };
      }
    },
    refetchInterval: 15000,
    staleTime: 0,
  });

  // 2. Fetch current logged-in user profile to check if user is an ADMIN
  const { data: currentUser, isLoading: isUserLoading } = useQuery({
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

  // Prevent Flash of Unmaintained Content (FOUC) while checking system status on non-admin routes
  if (isConfigLoading && !isAdminRoute && !isLoginRoute) {
    return (
      <div className="fixed inset-0 z-50 bg-[#09090B] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Check if maintenance mode is active AND has not passed its target completion time
  const hasEndTimePassed = config?.maintenanceEndTime && new Date() >= new Date(config.maintenanceEndTime);
  const isMaintenanceActive = config?.maintenanceMode && !hasEndTimePassed;

  if (isMaintenanceActive) {
    // Only authenticated ADMIN users or users on Admin/Login routes can bypass
    if (isAdminUser || isAdminRoute || isLoginRoute) {
      return <>{children}</>;
    }
    
    // Render Maintenance Mode Screen for all standard users
    const endTime = config.maintenanceEndTime ? new Date(config.maintenanceEndTime) : undefined;
    return <MaintenanceScreen estimatedEndTime={endTime} />;
  }

  // Normal operation
  return <>{children}</>;
}
