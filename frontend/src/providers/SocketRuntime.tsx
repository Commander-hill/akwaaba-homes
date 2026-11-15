'use client';

import React, { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { getRegisteredQueryClient } from '@/lib/queryRegistry';
import { invalidatePublicResource, setPublicResourceData } from '@/lib/publicFetch';

/**
 * Synthesizes a soft, pleasant notification chime using the Web Audio API.
 * Pure mathematical sine synthesis requiring zero network assets.
 */
function playNotificationChime(type?: string) {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const isSuccess = type === 'PAYMENT_RECEIVED' || type?.includes('SUCCESS') || type?.includes('APPROVED');
    const isAlert = type?.includes('ERROR') || type?.includes('ALERT') || type?.includes('SECURITY') || type?.includes('BREACH');

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    if (isSuccess) {
      // Ascending major chord (C5 -> E5 -> G5)
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.16);
    } else if (isAlert) {
      // Soft alert double-tone
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(349.23, now + 0.12);
    } else {
      // Gentle chime (A4 -> C#5)
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(554.37, now + 0.1);
    }

    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Web Audio blocked by browser autoplay policy until first interaction
  }
}

/**
 * Triggers native OS/browser notification when application tab is in background.
 */
function showBrowserNotification(title: string, body: string) {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted' && document.hidden) {
      new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
      });
    }
  } catch {}
}

export default function SocketRuntime({
  onSocketChange,
  onConnectionChange,
}: {
  onSocketChange: (socket: Socket | null) => void;
  onConnectionChange: (connected: boolean) => void;
}) {
  const hasConnectedOnceRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let activeSocket: Socket | null = null;

    const connectSocket = async () => {
      const { io } = await import('socket.io-client');
      if (cancelled) return;

      const rawUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      let socketUrl = rawUrl.replace(/\/api(\/v1)?\/?$/, '');

      if (typeof window !== 'undefined') {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (!isLocal && socketUrl.includes('localhost')) {
          socketUrl = socketUrl.replace('localhost', window.location.hostname);
        }
      }

      const socketInstance = io(socketUrl, {
        withCredentials: true,
        autoConnect: true,
        reconnection: true,
        transports: ['websocket', 'polling'],
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socketInstance.on('connect', () => {
        console.log('🔌 Socket connected cleanly:', socketInstance?.id);
        onConnectionChange(true);
        if (hasConnectedOnceRef.current) {
          getRegisteredQueryClient()?.invalidateQueries({ refetchType: 'all' });
        } else {
          hasConnectedOnceRef.current = true;
        }
      });

      socketInstance.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
        onConnectionChange(false);
      });

      socketInstance.on('connect_error', (err) => {
        console.warn('Socket connection retry status:', err.message);
      });

      socketInstance.on('notification', (data: { title: string; message: string; type: string }) => {
        const isSuccess = data.type === 'PAYMENT_RECEIVED' || data.type?.includes('SUCCESS') || data.type?.includes('APPROVED');
        const isError = data.type?.includes('ERROR') || data.type?.includes('REJECTED');

        const messageContent = (
          <div className="flex flex-col gap-0.5 text-left">
            <span className="font-bold text-xs leading-snug">{data.title}</span>
            <span className="text-[11px] font-normal opacity-90 leading-relaxed">{data.message}</span>
          </div>
        );

        playNotificationChime(data.type);
        showBrowserNotification(data.title, data.message);

        const toastFn = isSuccess ? toast.success : isError ? toast.error : toast;
        toastFn(messageContent, { duration: 6000, position: 'top-right' });
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['notifications'] });
        invalidatePublicResource('notifications');
      });

      const eventQueryMap: Record<string, string[][]> = {
        user_updated: [
          ['admin-users'], ['admin-user-verification'], ['admin-stats'], ['admin-action-queue'],
          ['admin-activity'], ['admin-landlords'], ['admin-tenants'], ['admin-landlord-deeds'], ['auth', 'me'],
        ],
        kyc_submitted: [
          ['admin-users'], ['admin-user-verification'], ['admin-stats'], ['admin-action-queue'],
          ['admin-activity'], ['admin-tenants'], ['admin-landlords'], ['notifications'],
        ],
        deed_submitted: [
          ['admin-users'], ['admin-landlord-deeds'], ['admin-stats'], ['admin-action-queue'],
          ['admin-activity'], ['admin-landlords'], ['notifications'],
        ],
        verification_updated: [
          ['admin-users'], ['admin-user-verification'], ['admin-stats'], ['admin-action-queue'],
          ['admin-activity'], ['admin-landlord-deeds'], ['admin-landlords'], ['admin-tenants'], ['notifications'],
        ],
        landlord_deeds_updated: [['admin-landlord-deeds'], ['admin-users'], ['admin-stats'], ['admin-action-queue']],
        admin_action_required: [['admin-action-queue'], ['admin-stats'], ['admin-activity'], ['admin-users'], ['notifications']],
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
        agreement_updated: [['agreements'], ['leaseRenewals'], ['bookings'], ['notifications']],
        agreement_completed: [['agreements'], ['leaseRenewals'], ['bookings'], ['notifications']],
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
        payout_created: [['payouts'], ['financials'], ['transactions'], ['landlord', 'stats']],
        payout_updated: [['payouts'], ['financials'], ['transactions'], ['landlord', 'stats']],
        subscription_created: [['subscriptions'], ['landlord', 'stats']],
        subscription_updated: [['subscriptions'], ['landlord', 'stats']],
        roommate_updated: [['roommateMatches'], ['roommateInvitations']],
        roommate_invitation_received: [['roommateInvitations'], ['notifications']],
        roommate_invitation_responded: [['roommateInvitations'], ['notifications'], ['conversations']],
        roommate_invitation_cancelled: [['roommateInvitations'], ['notifications']],
        invitation_updated: [['roommateInvitations']],
        invitation_received: [['roommateInvitations'], ['notifications']],
        notifications_marked_read: [['notifications']],
        notification_read: [['notifications']],
        wishlist_updated: [['wishlist']],
        'activity:new': [['activities'], ['auditLogs']],
      };

      Object.entries(eventQueryMap).forEach(([event, queryKeys]) => {
        socketInstance.on(event, () => {
          queryKeys.forEach((key) => {
            getRegisteredQueryClient()?.invalidateQueries({ queryKey: key });
          });
        });
      });

      socketInstance.on('kyc_submitted', (data: any) => {
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['admin-users'] });
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['admin-stats'] });
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['admin-action-queue'] });
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['admin-activity'] });
        if (data?.userId) {
          getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['admin-user-verification', data.userId] });
        }
        toast(
          <div>
            <p className="font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              🪪 New Ghana Card KYC Submission
            </p>
            <p className="text-xs font-semibold text-zinc-900 dark:text-white">
              {data?.name || 'A user'} submitted Ghana Card credentials
            </p>
            <p className="text-[10px] text-zinc-500">Verification queue updated in real time</p>
          </div>,
          { id: `kyc-${data?.userId || Date.now()}`, duration: 6000, position: 'top-right' }
        );
      });

      socketInstance.on('deed_submitted', (data: any) => {
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['admin-users'] });
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['admin-landlord-deeds'] });
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['admin-stats'] });
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['admin-action-queue'] });
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['admin-activity'] });
        toast(
          <div>
            <p className="font-bold text-xs uppercase tracking-wider text-blue-600 dark:text-blue-400">
              📜 New Title Deed Submission
            </p>
            <p className="text-xs font-semibold text-zinc-900 dark:text-white">
              {data?.name || 'A landlord'} submitted ownership deed
            </p>
            <p className="text-[10px] text-zinc-500">Deed registry updated in real time</p>
          </div>,
          { id: `deed-${data?.userId || Date.now()}`, duration: 6000, position: 'top-right' }
        );
      });

      socketInstance.on('receive_message', (msg?: any) => {
        playNotificationChime('MESSAGE');
        if (msg?.content && document.hidden) {
          showBrowserNotification('New Message on AkwaabaHomes', msg.content);
        }
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['conversations'] });
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['messages'] });
      });

      socketInstance.on('message_read', () => {
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['messages'] });
      });

      socketInstance.on('user_presence_change', () => {
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['online-users'] });
      });

      socketInstance.on('active_users_count', (data: any) => {
        if (data?.totalOnline !== undefined) {
          getRegisteredQueryClient()?.setQueryData(['active-users-count'], data.totalOnline);
          getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['admin-stats'] });
        }
      });

      socketInstance.on('broadcast_dispatched', (data: any) => {
        playNotificationChime('ALERT');
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['admin-broadcast-history'] });
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['notifications'] });
        if (data?.title) {
          toast(
            <div className="flex flex-col gap-0.5 text-left">
              <span className="font-bold text-xs text-amber-600 dark:text-amber-400">📢 Announcement</span>
              <span className="font-semibold text-xs leading-snug">{data.title}</span>
              {data.message && <span className="text-[11px] opacity-85 leading-relaxed">{data.message}</span>}
            </div>,
            { duration: 8000, position: 'top-right' }
          );
        }
      });

      socketInstance.on('config_updated', (data: any) => {
        if (data) {
          setPublicResourceData('public-config', data);
          getRegisteredQueryClient()?.setQueryData(['public-config'], data);
          getRegisteredQueryClient()?.setQueryData(['admin-config'], data);
        }
        invalidatePublicResource('public-config');
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['public-config'] });
        getRegisteredQueryClient()?.invalidateQueries({ queryKey: ['admin-config'] });
      });

      activeSocket = socketInstance;
      if (!cancelled) {
        onSocketChange(socketInstance);
      }
    };

    const timer = setTimeout(() => {
      void connectSocket();
    }, 1500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (activeSocket) {
        activeSocket.disconnect();
      }
      onSocketChange(null);
      onConnectionChange(false);
    };
  }, [onSocketChange, onConnectionChange]);

  return null;
}
