'use client';
import '@/app/secondary.css';

import WishlistPage from '@/app/dashboard/wishlist/page';
import QueryProvider from '@/providers/QueryProvider';
import PublicFooter from '@/components/tenant-ui/PublicFooter';

export default function SavedPropertiesPublicRoute() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-white dark:bg-[#111513]">
      <div className="container-akwaaba py-8 sm:py-12 flex-1">
        <QueryProvider><WishlistPage /></QueryProvider>
      </div>
      <PublicFooter />
    </div>
  );
}
