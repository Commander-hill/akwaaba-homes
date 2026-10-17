'use client';

import TenantShell from '@/components/tenant-ui/TenantShell';
import NotificationsPage from '@/app/dashboard/notifications/page';

export default function NotificationsRoutePage() {
  return (
    <TenantShell>
      <NotificationsPage />
    </TenantShell>
  );
}
