import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '../providers/Providers';
import Navbar from '../components/Navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'AkwaabaHomes | Secure Hostel & Property Rentals',
  description: 'The premium platform for students and landlords to connect for secure housing in Ghana.',
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
          <Navbar />
          <main className="pt-16 min-h-screen">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
