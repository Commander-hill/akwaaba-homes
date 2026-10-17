'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import api from '@/lib/axios';

export default function DashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    api.get('/auth/me')
      .then((res) => {
        const user = res.data?.user || res.data;
        if (!user) {
          router.replace('/login');
          return;
        }
        if (user.role === 'ADMIN') {
          router.replace('/admin/dashboard');
        } else if (user.role === 'LANDLORD') {
          router.replace('/dashboard/landlord');
        } else if (user.role === 'CARETAKER' || user.role === 'STAFF') {
          router.replace('/dashboard/caretaker');
        } else {
          router.replace('/dashboard/tenant');
        }
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBF9] dark:bg-[#0D0F12] text-zinc-900 dark:text-zinc-100 p-6 space-y-3">
      <Loader2 className="w-7 h-7 animate-spin text-[#0F5132] dark:text-emerald-400" />
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        Routing to your workspace...
      </p>
    </div>
  );
}
