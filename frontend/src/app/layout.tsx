import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '../providers/Providers';
import Navbar from '../components/Navbar';
import PwaRegister from '../components/PwaRegister';
import PwaInstallPrompt from '../components/PwaInstallPrompt';
import MaintenanceGuard from '../components/MaintenanceGuard';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const viewport: Viewport = {
  themeColor: '#4F46E5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'AkwaabaHomes | Secure Hostel & Property Rentals',
  description: 'Ghana\'s premier rental platform connecting landlords and tenants for verified apartments, homes, executive studios, and residential tenancies.',
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
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <Providers>
          <PwaRegister />
          <MaintenanceGuard>
            <Navbar />
            <main className="pt-20 min-h-screen">
              {children}
            </main>
          </MaintenanceGuard>
          <PwaInstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
