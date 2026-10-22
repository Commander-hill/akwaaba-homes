'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  Megaphone,
  CreditCard,
  CalendarCheck,
  MessageSquare,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { EmptyState, StatusBadge } from '@/components/tenant-ui/primitives';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'BOOKING' | 'PAYMENT' | 'SECURITY'>('ALL');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.put('/notifications/read-all/all');
    },
    onSuccess: () => {
      toast.success('All notifications marked as read');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => {
      toast.error('Failed to mark all as read');
    },
  });

  const notifications: NotificationItem[] = Array.isArray(data)
    ? data
    : data?.notifications || [];
  const unreadCount: number =
    typeof data?.unreadCount === 'number'
      ? data.unreadCount
      : notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((item) => {
    const t = (item.type || '').toUpperCase();
    if (filter === 'UNREAD') return !item.isRead;
    if (filter === 'BOOKING') return t.includes('BOOKING');
    if (filter === 'PAYMENT')
      return t.includes('PAYMENT') || t.includes('TRANSACTION') || t.includes('SUBSCRIPTION');
    if (filter === 'SECURITY') return t.includes('SECURITY') || t.includes('LOCK');
    return true;
  });

  const getIcon = (type: string) => {
    switch ((type || '').toUpperCase()) {
      case 'BOOKING':
      case 'BOOKING_UPDATE':
        return <CalendarCheck className="w-5 h-5 text-[#173D32] dark:text-[#86B59C]" />;
      case 'PAYMENT':
      case 'TRANSACTION':
      case 'SUBSCRIPTION':
        return <CreditCard className="w-5 h-5 text-[#B45309] dark:text-[#FCD34D]" />;
      case 'SECURITY':
        return <CheckCircle2 className="w-5 h-5 text-[#175CD3] dark:text-[#93C5FD]" />;
      case 'MESSAGE':
        return <MessageSquare className="w-5 h-5 text-[#557A67] dark:text-[#86B59C]" />;
      default:
        return <Megaphone className="w-5 h-5 text-[#5E645E] dark:text-[#A0A8A2]" />;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString('en-GH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E7E7DF] dark:border-[#262E29]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#557A67] dark:text-[#86B59C] mb-1">
            Activity &amp; Updates
          </p>
          <div className="flex items-center gap-2.5">
            <h1 className="font-editorial text-2xl sm:text-3xl text-[#242925] dark:text-white">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <StatusBadge tone="warning">{unreadCount} unread</StatusBadge>
            )}
          </div>
          <p className="text-sm text-[#5E645E] dark:text-[#A0A8A2] mt-1">
            Stay informed on booking approvals, tenancy agreements, payment confirmations, and account alerts.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="px-4 py-2.5 bg-white dark:bg-[#171C19] border border-[#D4D6CE] dark:border-[#2E3832] hover:bg-[#F1EFE7] dark:hover:bg-[#222925] text-[#242925] dark:text-white text-xs sm:text-sm font-medium rounded-[10px] transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            {markAllAsReadMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4 text-[#173D32] dark:text-[#86B59C]" />
            )}
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(['ALL', 'UNREAD', 'BOOKING', 'PAYMENT', 'SECURITY'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={clsx(
              'px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer',
              filter === tab
                ? 'bg-[#173D32] text-white shadow-xs'
                : 'bg-white dark:bg-[#171C19] text-[#5E645E] dark:text-[#A0A8A2] hover:text-[#242925] dark:hover:text-white border border-[#E7E7DF] dark:border-[#262E29]'
            )}
          >
            {tab === 'ALL'
              ? 'All'
              : tab === 'UNREAD'
              ? `Unread (${unreadCount})`
              : tab === 'BOOKING'
              ? 'Bookings'
              : tab === 'PAYMENT'
              ? 'Billing & Rent'
              : 'Security'}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 bg-white dark:bg-[#171C19] rounded-[16px] border border-[#E7E7DF] dark:border-[#262E29] animate-pulse flex gap-4 items-center"
            >
              <div className="w-10 h-10 rounded-[10px] bg-[#F1EFE7] dark:bg-[#222925]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[#F1EFE7] dark:bg-[#222925] rounded w-1/3" />
                <div className="h-3 bg-[#F8F7F2] dark:bg-[#111513] rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-6 h-6" />}
          title="No notifications found"
          description={
            filter === 'UNREAD'
              ? "You're all caught up! You have no unread notifications."
              : 'You do not have any notifications in this category yet.'
          }
          action={
            filter !== 'ALL' ? (
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className="px-4 py-2 rounded-[10px] border border-[#D4D6CE] dark:border-[#2E3832] text-xs font-medium text-[#242925] dark:text-white cursor-pointer"
              >
                Show All Notifications
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={clsx(
                'p-4 sm:p-5 rounded-[16px] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                notification.isRead
                  ? 'bg-white dark:bg-[#171C19] border-[#E7E7DF] dark:border-[#262E29]'
                  : 'bg-[#ECFDF3]/40 dark:bg-[#064E3B]/15 border-[#A7F3D0] dark:border-[#065F46] shadow-2xs'
              )}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-[12px] bg-[#F8F7F2] dark:bg-[#111513] border border-[#E7E7DF] dark:border-[#262E29] shrink-0 mt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-semibold text-[#242925] dark:text-white">
                      {notification.title}
                    </h2>
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-[#173D32] dark:bg-[#86B59C] shrink-0" />
                    )}
                    <span className="text-xs text-[#6F756F] dark:text-[#A0A8A2]">
                      • {formatTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2] leading-relaxed max-w-2xl">
                    {notification.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {notification.link && (
                  <Link
                    href={notification.link}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsReadMutation.mutate(notification.id);
                      }
                    }}
                    className="px-3.5 py-2 rounded-[10px] text-xs font-medium text-white bg-[#16A34A] hover:bg-[#15803D] transition-colors flex items-center gap-1.5"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                {!notification.isRead && (
                  <button
                    type="button"
                    onClick={() => markAsReadMutation.mutate(notification.id)}
                    className="p-2 text-[#5E645E] hover:text-[#242925] dark:text-[#A0A8A2] dark:hover:text-white hover:bg-[#F1EFE7] dark:hover:bg-[#222925] rounded-[8px] transition-colors cursor-pointer"
                    title="Mark as read"
                    aria-label="Mark notification as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
