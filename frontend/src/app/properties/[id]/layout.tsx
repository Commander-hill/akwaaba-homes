import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Property Details | AkwaabaHomes',
  description:
    'Explore verified hostels, apartments, and rental homes across Ghana with transparent pricing, room options, and verified landlord profiles on AkwaabaHomes.',
};

export default function PropertyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
