'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LeaseAgreementRedirect() {
  const { id } = useParams();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      router.replace(`/dashboard/agreements/${id}`);
    }
  }, [id, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      <p className="text-sm font-semibold text-slate-500">Redirecting to Tenancy Agreement...</p>
    </div>
  );
}
