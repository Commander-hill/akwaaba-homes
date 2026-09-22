'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Bell, Check, CheckCheck, Loader2, Megaphone, Home, CreditCard, 
  CalendarCheck, MessageSquare, AlertTriangle, ShieldCheck, Trash2, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import toast from 'react-hot-toast';

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

  const { data, isLoading, refetch } = useQuery({
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
    }
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
    }
  });

  const notifications: NotificationItem[] = data?.notifications || [];
  const unreadCount: number = data?.unreadCount || 0;

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'UNREAD') return !item.isRead;
    if (filter === 'BOOKING') return item.type.includes('BOOKING');
    if (filter === 'PAYMENT') return item.type.includes('PAYMENT') || item.type.includes('TRANSACTION') || item.type.includes('SUBSCRIPTION');
    if (filter === 'SECURITY') return item.type.includes('SECURITY') || item.type.includes('LOCK');
    return true;
  });

  const getIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case 'BOOKING':
      case 'BOOKING_UPDATE':
        return <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case 'PAYMENT':
      case 'TRANSACTION':
      case 'SUBSCRIPTION':
        return <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case 'SECURITY':
        return <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'MESSAGE':
        return <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      default:
        return <Megaphone className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />;
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
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#12151D] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center">
            <Bell className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Notifications & Alerts</h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-zinc-950">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Stay informed on booking requests, lease agreements, and account activities.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
          >
            {markAllAsReadMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5" />
            )}
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        {(['ALL', 'UNREAD', 'BOOKING', 'PAYMENT', 'SECURITY'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
              filter === tab
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800"
            )}
          >
            {tab === 'ALL' ? 'All' : tab === 'UNREAD' ? `Unread (${unreadCount})` : tab === 'BOOKING' ? 'Bookings' : tab === 'PAYMENT' ? 'Billing & Rent' : 'Security'}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 animate-pulse flex gap-4 items-center">
              <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
                <div className="h-3 bg-zinc-100 dark:bg-zinc-850 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No notifications found</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {filter === 'UNREAD' ? "You're all caught up! No unread notifications." : "You do not have any notifications in this filter yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={clsx(
                "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                notification.isRead
                  ? "bg-white dark:bg-[#12151D] border-zinc-200 dark:border-zinc-800/80 opacity-85 hover:opacity-100"
                  : "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 shadow-xs"
              )}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/60 shrink-0 mt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                      {notification.title}
                    </h4>
                    {!notification.isRead && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    <span className="text-[11px] text-zinc-400 font-medium">
                      • {formatTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-2xl">
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
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 transition-colors flex items-center gap-1.5"
                  >
                    View Details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
                {!notification.isRead && (
                  <button
                    onClick={() => markAsReadMutation.mutate(notification.id)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                    title="Mark as read"
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
