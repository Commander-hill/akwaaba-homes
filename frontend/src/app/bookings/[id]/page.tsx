'use client';
import '@/app/secondary.css';

import DashboardLayout from '@/app/dashboard/layout';
import TenantBookingDetailsPage from '@/app/dashboard/tenant/bookings/[id]/page';

export default function BookingDetailsRoutePage() {
  return (
    <DashboardLayout>
      <TenantBookingDetailsPage />
    </DashboardLayout>
  );
}
