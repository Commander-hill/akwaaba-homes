import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '../providers/Providers';
import Navbar from '../components/Navbar';
import MobileBottomNav from '../components/MobileBottomNav';
import PwaRegister from '../components/PwaRegister';
import PwaInstallPrompt from '../components/PwaInstallPrompt';
import MaintenanceGuard from '../components/MaintenanceGuard';

// Suppress React 19 false-positive warning for next-themes' SSR inline script
if (typeof console !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Encountered a script tag while rendering React component')
    ) {
      return;
    }
    originalError.apply(console, args);
  };
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#173D32',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Akwaaba Homes — Trusted Homes for Students & Residents',
  description: 'Discover verified hostels, private rooms, studios, apartments, and residential rentals across Ghana with transparent pricing and protected bookings.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Akwaaba Homes',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-[#F8F7F2] text-[#242925] dark:bg-[#0B0D12] dark:text-[#F4F4F5]" suppressHydrationWarning>
        <Providers>
          <PwaRegister />
          <MaintenanceGuard>
            <Navbar />
            <main className="pt-16 pb-16 md:pb-0 min-h-screen">
              {children}
            </main>
            <MobileBottomNav />
          </MaintenanceGuard>
          <PwaInstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
