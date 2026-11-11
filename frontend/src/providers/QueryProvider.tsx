'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { registerQueryClient } from '@/lib/queryRegistry';

let sharedQueryClient: QueryClient | null = null;

function getSharedQueryClient() {
  if (!sharedQueryClient) {
    sharedQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000,
          gcTime: 15 * 60 * 1000,
          refetchOnWindowFocus: false,
          refetchOnReconnect: true,
          retry: 1,
          retryDelay: 800,
        },
      },
    });
  }
  return sharedQueryClient;
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getSharedQueryClient());

  useEffect(() => {
    registerQueryClient(queryClient);
  }, [queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
