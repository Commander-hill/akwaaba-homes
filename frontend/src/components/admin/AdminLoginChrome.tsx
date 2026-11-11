'use client';

import dynamic from 'next/dynamic';

const AdminPwaInstallPrompt = dynamic(() => import('@/components/AdminPwaInstallPrompt'), {
  ssr: false,
});

/** Client wrapper rendering admin login PWA metadata and install prompt without portal shell assets. */
export default function AdminLoginChrome({ children }: { children: React.ReactNode }) {
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
