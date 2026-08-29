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
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: {
        token: token ? `Bearer ${token}` : undefined,
      },
    });

    socketInstance.on('connect', () => {
      console.log('🔌 Socket connected cleanly:', socketInstance.id);
      setIsConnected(true);
      // Immediately refresh all active views upon reconnection
      queryClient.invalidateQueries({ refetchType: 'all' });
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
      // Invalidate notifications query
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // --- REAL-TIME PLATFORM DATA SYNC & ZERO-REFRESH CACHE INVALIDATION ---
    const invalidateAllPlatformViews = () => {
      // Invalidate and trigger active query refetches with zero delay
      queryClient.invalidateQueries({ refetchType: 'all' });
      queryClient.refetchQueries({ type: 'active' });
    };

    const syncEvents = [
      'booking_created',
      'booking_updated',
      'booking_cancelled',
      'room_updated',
      'room_capacity_updated',
      'property_created',
      'property_updated',
      'property_deleted',
      'ticket_created',
      'ticket_updated',
      'ticket_deleted',
      'review_created',
      'review_updated',
      'review_deleted',
      'notice_created',
      'notice_updated',
      'notice_deleted',
      'breach_created',
      'breach_updated',
      'agreement_created',
      'agreement_updated',
      'user_updated',
      'profile_updated',
      'account_suspended',
      'account_verified',
      'subscription_created',
      'subscription_updated',
      'payout_created',
      'payout_updated',
      'roommate_updated',
      'invitation_updated',
      'invitation_received',
      'wishlist_updated',
      'activity:new'
    ];

    syncEvents.forEach(event => {
      socketInstance.on(event, (data?: any) => {
        console.log(`⚡ Real-time lightning sync triggered: [${event}]`, data || '');
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
      invalidateAllPlatformViews();
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
