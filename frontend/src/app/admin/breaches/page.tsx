'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminBreachesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/disputes');
  }, [router]);

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      <p className="text-xs font-semibold text-zinc-500">Redirecting to Dispute Adjudication Hub...</p>
    </div>
  );
}
