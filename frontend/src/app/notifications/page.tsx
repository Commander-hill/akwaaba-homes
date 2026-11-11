'use client';
import '@/app/secondary.css';

import DashboardLayout from '@/app/dashboard/layout';
import NotificationsPage from '@/app/dashboard/notifications/page';

export default function NotificationsRoutePage() {
  return (
    <DashboardLayout>
      <NotificationsPage />
    </DashboardLayout>
  );
}
