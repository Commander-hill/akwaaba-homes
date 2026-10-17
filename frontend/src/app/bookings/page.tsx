'use client';

import TenantShell from '@/components/tenant-ui/TenantShell';
import TenantBookingsOverviewPage from '@/app/dashboard/tenant/bookings/page';

export default function BookingsRoutePage() {
  return (
    <TenantShell>
      <TenantBookingsOverviewPage />
    </TenantShell>
  );
}
