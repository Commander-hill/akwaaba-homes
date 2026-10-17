'use client';

import WishlistPage from '@/app/dashboard/wishlist/page';
import PublicFooter from '@/components/tenant-ui/PublicFooter';

export default function SavedPropertiesPublicRoute() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F8F7F2] dark:bg-[#111513]">
      <div className="container-akwaaba py-8 sm:py-12 flex-1">
        <WishlistPage />
      </div>
      <PublicFooter />
    </div>
  );
}
