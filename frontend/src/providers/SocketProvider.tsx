'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only connect if we have a token
    // Extract token from cookie (assuming the server set an HTTP-only cookie, 
    // we can't easily read it from JS. We need to pass it, or let the socket use withCredentials: true)
    
    // Connect to the root domain, stripping /api or /api/v1 if it exists in the NEXT_PUBLIC_API_URL
    const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const socketUrl = rawUrl.replace(/\/api(\/v1)?\/?$/, '');

    // With credentials allows the socket connection to send the HTTP-only cookies automatically
    const socketInstance = io(socketUrl, {
      withCredentials: true,
      autoConnect: true,
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      // Changed to console.warn to prevent Next.js Dev Overlay from crashing the UI
      // when the socket fails to connect due to an expired or missing accessToken.
      console.warn('Socket connection error:', err.message);
    });

    socketInstance.on('notification', (data: { title: string, message: string, type: string }) => {
      toast(
        (t) => (
          <div className="flex flex-col gap-1">
            <span className="font-bold text-sm text-[var(--foreground)]">{data.title}</span>
            <span className="text-xs text-[var(--muted-foreground)]">{data.message}</span>
          </div>
        ),
        {
          duration: 5000,
          position: 'top-right',
          style: {
            background: 'rgba(28, 26, 27, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            borderRadius: '12px'
          },
        }
      );
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
