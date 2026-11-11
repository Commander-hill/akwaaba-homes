'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import api from '@/lib/axios';
import { Bell, Check, Loader2, Megaphone, Home, CreditCard, ListTodo, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setData(res.data);
    } catch {
      // Ignore transient notification fetch errors
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const timer = setInterval(() => {
      void fetchNotifications();
    }, 60000);
    return () => clearInterval(timer);
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      await fetchNotifications();
    } catch {
      // Ignore transient error
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all/all');
      await fetchNotifications();
      setIsOpen(false);
    } catch {
      // Ignore transient error
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const getIcon = (type: string) => {
    switch (type) {
      case 'BOOKING': return <ListTodo className="w-4 h-4 text-emerald-500" />;
      case 'SUBSCRIPTION': return <CreditCard className="w-4 h-4 text-amber-500" />;
      case 'PROPERTY': return <Home className="w-4 h-4 text-blue-500" />;
      case 'REVIEW': return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'ANNOUNCEMENT': return <Megaphone className="w-4 h-4 text-red-500" />;
      default: return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-700 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-[var(--background)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-[80vh] bg-white dark:bg-slate-900 border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden flex flex-col z-50">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h3 className="font-bold text-[var(--foreground)]">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => void markAllAsRead()}
                className="text-xs text-[var(--primary)] hover:underline font-medium flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[var(--muted-foreground)]" /></div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-[var(--muted-foreground)] flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 opacity-20" />
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {notifications.map((notif: any) => (
                  <div 
                    key={notif.id}
                    className={clsx(
                      "p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                      !notif.isRead ? "bg-slate-50 dark:bg-slate-800/30" : ""
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0 mt-1">{getIcon(notif.type)}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={clsx("text-sm", !notif.isRead ? "font-bold text-[var(--foreground)]" : "font-medium text-[var(--foreground)]")}>
                            {notif.title}
                          </h4>
                          {!notif.isRead && (
                            <button 
                              onClick={() => void markAsRead(notif.id)}
                              className="w-2 h-2 bg-[var(--primary)] rounded-full shrink-0"
                              title="Mark as read"
                            />
                          )}
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 leading-relaxed mb-2">{notif.message}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-medium">{new Date(notif.createdAt).toLocaleDateString()}</span>
                          {notif.link && (
                            <Link 
                              href={notif.link}
                              onClick={() => {
                                if (!notif.isRead) void markAsRead(notif.id);
                                setIsOpen(false);
                              }}
                              className="text-xs text-[var(--primary)] font-semibold hover:underline"
                            >
                              View details →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
