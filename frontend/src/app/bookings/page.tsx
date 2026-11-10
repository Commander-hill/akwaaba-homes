'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import DashboardLayout from '@/app/dashboard/layout';
import TenantBookingsOverviewPage from '@/app/dashboard/tenant/bookings/page';
import LandlordBookingsPage from '@/app/dashboard/landlord/bookings/page';

export default function BookingsRoutePage() {
  const router = useRouter();
  const { data: userResponse } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/me');
        return data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const role = userResponse?.user?.role;

  useEffect(() => {
    if (role === 'LANDLORD') {
      router.replace('/dashboard/landlord/bookings');
    }
  }, [role, router]);

  return (
    <DashboardLayout>
      {role === 'LANDLORD' ? <LandlordBookingsPage /> : <TenantBookingsOverviewPage />}
    </DashboardLayout>
  );
}
