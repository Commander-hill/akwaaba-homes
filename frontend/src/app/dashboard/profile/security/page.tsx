'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, Lock, Monitor, Smartphone, Globe, LogOut, 
  Clock, AlertTriangle, KeyRound, ArrowRight, CheckCircle2 
} from 'lucide-react';

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
    if (!device) return <Monitor className="w-5 h-5 text-zinc-500" />;
    const d = device.toLowerCase();
    if (d.includes('mobile') || d.includes('iphone') || d.includes('android')) {
      return <Smartphone className="w-5 h-5 text-zinc-500" />;
    }
    return <Monitor className="w-5 h-5 text-zinc-500" />;
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
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight flex items-center gap-3">
          <Lock className="w-7 h-7 text-[#0F5132] dark:text-emerald-400" />
          Security &amp; Active Sessions
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Review connected devices, revoke inactive sessions, and manage your two-factor authentication.
        </p>
      </div>

      {/* Security Alert Banner */}
      <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-start gap-3.5">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <h3 className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-300">
            Notice any unfamiliar devices?
          </h3>
          <p className="text-xs text-amber-800/80 dark:text-amber-400/80 leading-relaxed">
            If you see a sign-in location or device you do not recognize, revoke its access immediately and update your password.
          </p>
        </div>
      </div>

      {/* Two-Factor Authentication Section */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white">
                Two-Factor Authentication (2FA)
              </h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                Recommended
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xl leading-relaxed">
              Add an extra layer of protection to your account with authenticator apps (Google Authenticator, Apple Passwords, Authy) and backup emergency recovery codes.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/profile/security/2fa"
          className="px-4 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
        >
          <span>Manage 2FA</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Active Sessions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white">Active Signed-In Devices</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Devices that are currently logged into your account.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" />
          </div>
        ) : !sessionsData || sessionsData.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-xl">
            No active sessions found.
          </div>
        ) : (
          <div className="bg-white dark:bg-[#12151D] rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/80 overflow-hidden shadow-2xs">
            {sessionsData.map((session) => (
              <div 
                key={session.id} 
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-300 shrink-0">
                    {getDeviceIcon(session.deviceFamily)}
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      {session.osFamily || 'Device'} • {session.userAgent?.split(' ')[0] || 'Browser'}
                      {session.isCurrentSession && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-2.5 h-2.5" /> This Device
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-zinc-400" /> {session.ipAddress || 'Unknown IP'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-400" /> Active {timeAgo(session.lastActive)}
                      </span>
                    </div>
                  </div>
                </div>

                {!session.isCurrentSession && (
                  <button
                    onClick={() => revokeMutation.mutate(session.id)}
                    disabled={revokeMutation.isPending}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:text-rose-400 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer self-start sm:self-center"
                  >
                    {revokeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                    <span>Revoke</span>
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
