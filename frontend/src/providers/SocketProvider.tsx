'use client';

import React, { createContext, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Socket } from 'socket.io-client';
import { usePublicResource, publicGet } from '@/lib/publicFetch';

const SocketRuntime = dynamic(() => import('./SocketRuntime'), { ssr: false });

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

const AUTH_ROUTES = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/onboarding',
  '/admin/login',
]);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname() || '';
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const isAuthRoute = AUTH_ROUTES.has(pathname) || pathname.startsWith('/verify-email');

  const { data: sessionRes } = usePublicResource(
    'auth/session',
    () => publicGet('/auth/session'),
    { enabled: !isAuthRoute, staleTime: 5 * 60 * 1000 }
  );
  const hasAuthenticatedUser = Boolean(sessionRes?.user);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
      {!isAuthRoute && hasAuthenticatedUser && (
        <SocketRuntime onSocketChange={setSocket} onConnectionChange={setIsConnected} />
      )}
    </SocketContext.Provider>
  );
};
