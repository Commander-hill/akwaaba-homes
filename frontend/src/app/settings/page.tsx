'use client';
import '@/app/secondary.css';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import DashboardLayout from '@/app/dashboard/layout';
import { ProfileWorkspaceContent } from '@/components/tenant-ui/ProfileWorkspaceContent';

export default function StandaloneSettingsRoute() {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="flex justify-center p-12">
            <Loader2 className="w-7 h-7 animate-spin text-[#173D32]" />
          </div>
        }
      >
        <ProfileWorkspaceContent defaultTab="security" />
      </Suspense>
    </DashboardLayout>
  );
}
