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

    // --- REAL-TIME TARGETED CACHE INVALIDATIONS (Zero-Logout, Lightning Speed) ---
    const eventQueryMap: Record<string, string[][]> = {
      ticket_created: [['tickets'], ['staff'], ['notifications'], ['landlord', 'stats']],
      ticket_updated: [['tickets'], ['staff'], ['notifications'], ['landlord', 'stats']],
      ticket_deleted: [['tickets'], ['staff'], ['notifications'], ['landlord', 'stats']],
      booking_created: [['bookings'], ['staff'], ['occupancy'], ['properties'], ['landlord', 'stats'], ['notifications']],
      booking_updated: [['bookings'], ['staff'], ['occupancy'], ['properties'], ['landlord', 'stats'], ['notifications']],
      booking_cancelled: [['bookings'], ['staff'], ['occupancy'], ['properties'], ['landlord', 'stats'], ['notifications']],
      room_updated: [['properties'], ['occupancy'], ['landlord', 'properties']],
      room_capacity_updated: [['properties'], ['occupancy'], ['landlord', 'properties']],
      property_created: [['properties'], ['landlord', 'properties'], ['landlord', 'stats']],
      property_updated: [['properties'], ['landlord', 'properties'], ['landlord', 'stats']],
      property_deleted: [['properties'], ['landlord', 'properties'], ['landlord', 'stats']],
      review_created: [['reviews'], ['properties'], ['landlord', 'stats']],
      review_updated: [['reviews'], ['properties'], ['landlord', 'stats']],
      review_deleted: [['reviews'], ['properties'], ['landlord', 'stats']],
      notice_created: [['notices'], ['compoundNotices'], ['staff']],
      notice_updated: [['notices'], ['compoundNotices'], ['staff']],
      notice_deleted: [['notices'], ['compoundNotices'], ['staff']],
      breach_created: [['breaches'], ['notifications']],
      breach_updated: [['breaches'], ['notifications']],
      agreement_created: [['agreements'], ['leaseRenewals']],
      agreement_updated: [['agreements'], ['leaseRenewals']],
      visitor_pass_created: [['visitorPasses'], ['staff']],
      visitor_pass_updated: [['visitorPasses'], ['staff']],
      service_booking_created: [['serviceBookings']],
      service_booking_updated: [['serviceBookings']],
      vehicle_created: [['vehicles']],
      vehicle_updated: [['vehicles']],
      delivery_created: [['deliveries'], ['staff']],
      delivery_updated: [['deliveries'], ['staff']],
      package_arrived: [['deliveries'], ['staff'], ['notifications']],
      package_collected: [['deliveries'], ['staff'], ['notifications']],
      staff_updated: [['staff'], ['landlord', 'staff'], ['notifications']],
      bill_split_created: [['billSplits']],
      bill_split_updated: [['billSplits']],
      bill_split_deleted: [['billSplits']],
      lease_renewal_requested: [['leaseRenewals'], ['notifications']],
      lease_renewal_updated: [['leaseRenewals'], ['agreements'], ['notifications']],
      inspection_updated: [['inspections'], ['staff'], ['notifications']],
      financials_updated: [['expenses'], ['financials'], ['transactions'], ['landlord', 'stats']],
      payout_created: [['payouts'], ['landlord', 'stats']],
      payout_updated: [['payouts'], ['landlord', 'stats']],
      subscription_created: [['subscriptions'], ['landlord', 'stats']],
      subscription_updated: [['subscriptions'], ['landlord', 'stats']],
      roommate_updated: [['roommateMatches'], ['roommateInvitations']],
      roommate_invitation_received: [['roommateInvitations'], ['notifications']],
      roommate_invitation_responded: [['roommateInvitations'], ['notifications'], ['conversations']],
      roommate_invitation_cancelled: [['roommateInvitations'], ['notifications']],
      invitation_updated: [['roommateInvitations']],
      invitation_received: [['roommateInvitations'], ['notifications']],
      wishlist_updated: [['wishlist']],
      'activity:new': [['activities'], ['auditLogs']],
    };

    Object.entries(eventQueryMap).forEach(([event, queryKeys]) => {
      socketInstance.on(event, (data?: any) => {
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
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
      queryClient.invalidateQueries({ queryKey: ['public-config'] });
      queryClient.invalidateQueries({ queryKey: ['admin-config'] });
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
