'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Activity, CalendarCheck, Users, Building, CreditCard } from 'lucide-react';

const TYPE_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  BOOKING:      { color: 'bg-blue-500',   icon: CalendarCheck },
  USER:         { color: 'bg-emerald-500', icon: Users },
  PROPERTY:     { color: 'bg-amber-500',   icon: Building },
  SUBSCRIPTION: { color: 'bg-purple-500',  icon: CreditCard },
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  APPROVED:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  COMPLETED:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  NEW:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CANCELLED:  'bg-slate-100 text-slate-700',
};

export default function AdminActivityPage() {
  const { data: activity, isLoading, dataUpdatedAt, refetch } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async () => {
      const res = await api.get('/admin/activity');
      return res.data;
    },
    refetchInterval: 30000, // auto-refresh every 30s
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">System Activity</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">Live feed of all recent platform events.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-3 py-2 text-xs font-bold border border-[var(--border)] rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Refresh
          </button>
          <div className="p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
            <Activity className="w-8 h-8" />
          </div>
        </div>
      </div>

      {/* System Health Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-[var(--border)]">
          <div className="text-xs uppercase font-bold text-[var(--muted-foreground)] mb-1">Total Users</div>
          <div className="text-2xl font-extrabold">{stats?.totalUsers || 0}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-[var(--border)]">
          <div className="text-xs uppercase font-bold text-[var(--muted-foreground)] mb-1">Properties</div>
          <div className="text-2xl font-extrabold">{stats?.totalProperties || 0}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-[var(--border)]">
          <div className="text-xs uppercase font-bold text-[var(--muted-foreground)] mb-1">Bookings</div>
          <div className="text-2xl font-extrabold">{stats?.totalBookings || 0}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-[var(--border)]">
          <div className="text-xs uppercase font-bold text-[var(--muted-foreground)] mb-1">Landlords</div>
          <div className="text-2xl font-extrabold">{stats?.totalLandlords || 0}</div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
          <h2 className="font-bold text-sm uppercase tracking-wider text-[var(--muted-foreground)]">Recent Events</h2>
          {dataUpdatedAt && (
            <span className="text-xs text-[var(--muted-foreground)]">
              Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="divide-y divide-[var(--border)]">
          {activity?.length === 0 && (
            <div className="px-6 py-10 text-center text-[var(--muted-foreground)]">No activity recorded yet.</div>
          )}
          {activity?.map((event: any, i: number) => {
            const config = TYPE_CONFIG[event.type] || { color: 'bg-slate-400', icon: Activity };
            const Icon = config.icon;
            return (
              <div key={i} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                <div className={`mt-0.5 w-8 h-8 rounded-full ${config.color} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] leading-snug">{event.message}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{new Date(event.createdAt).toLocaleString()}</p>
                </div>
                <span className={`shrink-0 inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_COLORS[event.status] || 'bg-slate-100 text-slate-700'}`}>
                  {event.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
