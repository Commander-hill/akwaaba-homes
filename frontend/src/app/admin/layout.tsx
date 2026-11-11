'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import QueryProvider from '@/providers/QueryProvider';

const AdminPortalGate = dynamic(() => import('@/components/admin/AdminPortalGate'), {
  ssr: false,
});

const AdminPwaInstallPrompt = dynamic(() => import('@/components/AdminPwaInstallPrompt'), {
  ssr: false,
});

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/admin/login') {
    return (
      <>
        <link rel="manifest" href="/admin-manifest.json" />
        <meta name="theme-color" content="#0A0F1D" />
        <meta name="apple-mobile-web-app-title" content="Akwaaba Admin" />
        {children}
        <AdminPwaInstallPrompt />
      </>
    );
  }

  return <AdminPortalGate>{children}</AdminPortalGate>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </QueryProvider>
  );
}
