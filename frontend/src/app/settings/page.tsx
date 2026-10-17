'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import TenantShell from '@/components/tenant-ui/TenantShell';
import { ProfileWorkspaceContent } from '@/components/tenant-ui/ProfileWorkspaceContent';

export default function StandaloneSettingsRoute() {
  return (
    <TenantShell>
      <Suspense
        fallback={
          <div className="flex justify-center p-12">
            <Loader2 className="w-7 h-7 animate-spin text-[#173D32]" />
          </div>
        }
      >
        <ProfileWorkspaceContent defaultTab="security" />
      </Suspense>
    </TenantShell>
  );
}
