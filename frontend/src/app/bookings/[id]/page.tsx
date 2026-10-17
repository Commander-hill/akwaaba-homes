'use client';

import TenantShell from '@/components/tenant-ui/TenantShell';
import TenantBookingDetailsPage from '@/app/dashboard/tenant/bookings/[id]/page';

export default function BookingDetailsRoutePage() {
  return (
    <TenantShell>
      <TenantBookingDetailsPage />
    </TenantShell>
  );
}
