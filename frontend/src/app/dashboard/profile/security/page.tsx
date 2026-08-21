'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, ShieldCheck, Monitor, Smartphone, Globe, LogOut, Clock, AlertTriangle } from 'lucide-react';

interface Session {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceFamily: string | null;
  osFamily: string | null;
  lastActive: string;
  createdAt: string;
  isCurrentSession: boolean;
}

export default function SecurityPage() {
  const queryClient = useQueryClient();

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await api.get('/auth/sessions');
      return res.data.sessions as Session[];
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/auth/sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    }
  });

  const getDeviceIcon = (device: string | null) => {
    if (!device) return <Monitor className="w-6 h-6 text-slate-400" />;
    const d = device.toLowerCase();
    if (d.includes('mobile') || d.includes('iphone') || d.includes('android')) return <Smartphone className="w-6 h-6 text-slate-500" />;
    return <Monitor className="w-6 h-6 text-slate-500" />;
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-[var(--primary)]" />
          Security & Active Sessions
        </h1>
        <p className="text-[var(--muted-foreground)] mt-2">Manage your devices and secure your account.</p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 flex gap-4">
        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-1" />
        <div>
          <h3 className="font-bold text-amber-800 dark:text-amber-500 text-lg">Did you notice suspicious activity?</h3>
          <p className="text-amber-700/80 dark:text-amber-500/80 mt-1">If you see a device you don't recognize, immediately revoke its access below and change your password.</p>
        </div>
      </div>

      <div className="glass-card rounded-3xl border border-[var(--border)] overflow-hidden">
        <div className="px-6 py-5 border-b border-[var(--border)] bg-slate-50 dark:bg-slate-900/50">
          <h2 className="text-xl font-bold">Active Sessions</h2>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
          </div>
        ) : sessionsData?.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted-foreground)]">No active sessions found.</div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {sessionsData?.map((session) => (
              <div key={session.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    {getDeviceIcon(session.deviceFamily)}
                  </div>
                  <div>
                    <div className="font-bold flex items-center gap-2 text-lg">
                      {session.osFamily || 'Unknown OS'} - {session.userAgent?.split(' ')[0] || 'Unknown Browser'}
                      {session.isCurrentSession && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                          This Device
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[var(--muted-foreground)] mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                      <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> {session.ipAddress || 'Unknown IP'}</span>
                      <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Active {timeAgo(session.lastActive)}</span>
                    </div>
                  </div>
                </div>
                
                {!session.isCurrentSession && (
                  <button
                    onClick={() => revokeMutation.mutate(session.id)}
                    disabled={revokeMutation.isPending}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg font-bold transition-colors disabled:opacity-50"
                  >
                    {revokeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
