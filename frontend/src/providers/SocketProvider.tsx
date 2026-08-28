'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

  useEffect(() => {
    // Extract token from localStorage as fallback if HTTP-only cookie is not accessible
    const token = typeof window !== 'undefined' ? localStorage.getItem('akwaaba_access_token') : null;
    
    // Connect to the root domain, stripping /api or /api/v1 if it exists in NEXT_PUBLIC_API_URL
    const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const socketUrl = rawUrl.replace(/\/api(\/v1)?\/?$/, '');

    const socketInstance = io(socketUrl, {
      withCredentials: true,
      autoConnect: true,
      auth: {
        token: token ? `Bearer ${token}` : undefined,
      },
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected cleanly:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Socket connection retry status:', err.message);
    });

    socketInstance.on('notification', (data: { title: string, message: string, type: string }) => {
      toast(
        (t) => (
          <div className="flex flex-col gap-1 text-left">
            <span className="font-semibold text-sm text-white leading-snug">{data.title}</span>
            <span className="text-xs text-slate-300 leading-normal">{data.message}</span>
          </div>
        ),
        {
          duration: 6000,
          position: 'top-right',
          style: {
            background: '#0F172A',
            border: '1px solid #334155',
            color: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            padding: '12px 16px',
          },
        }
      );
    });

    // --- REAL-TIME PLATFORM DATA SYNC & ZERO-REFRESH CACHE INVALIDATION ---
    const invalidateAllPlatformViews = () => {
      // Invalidate ALL queries across the active React Query cache globally
      queryClient.invalidateQueries();
    };

    const syncEvents = [
      'booking_created',
      'booking_updated',
      'room_updated',
      'property_created',
      'property_updated',
      'ticket_created',
      'ticket_updated',
      'review_created',
      'review_updated',
      'notice_created',
      'notice_updated',
      'breach_updated',
      'agreement_updated',
      'user_updated',
      'profile_updated',
      'subscription_updated',
      'activity:new'
    ];

    syncEvents.forEach(event => {
      socketInstance.on(event, (data?: any) => {
        console.log(`⚡ Real-time global sync event triggered: [${event}]`, data || '');
        invalidateAllPlatformViews();
      });
    });

    socketInstance.on('receive_message', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    });

    socketInstance.on('config_updated', (data: any) => {
      console.log('⚡ Instant config update received via Socket:', data);
      if (data) {
        queryClient.setQueryData(['public-config'], data);
        queryClient.setQueryData(['admin-config'], data);
      }
      queryClient.invalidateQueries();
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
