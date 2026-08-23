'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Radio, Send, Users, Building2, Globe, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function AdminBroadcastPage() {
  const [target, setTarget] = useState<'ALL_TENANTS' | 'ALL_LANDLORDS' | 'ALL_USERS'>('ALL_TENANTS');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const broadcastMutation = useMutation({
    mutationFn: async (payload: { target: string, title: string, message: string }) => {
      const res = await api.post('/admin/notifications/broadcast', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Broadcast sent successfully to ${data.count} users!`);
      setTitle('');
      setMessage('');
    },
    onError: () => {
      toast.error('Failed to send broadcast.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required.');
      return;
    }
    broadcastMutation.mutate({ target, title, message });
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in max-w-4xl mx-auto">
      
      {/* Header Banner */}
      <div className="glass-card p-8 rounded-3xl border border-[var(--border)] bg-gradient-to-r from-sky-900/20 via-blue-900/10 to-indigo-900/20">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-500 mb-1">
          <Radio className="w-4 h-4 animate-pulse" /> Live Communications
        </div>
        <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">
          Mass Push Notifications
        </h1>
        <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-2xl">
          Instantly dispatch in-app push alerts to targeted user segments. This bypasses the notice board and delivers directly to their notification center.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column - Form */}
        <div className="md:col-span-2 glass-card p-6 rounded-3xl border border-[var(--border)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Target Audience Selector */}
            <div>
              <label className="text-sm font-bold text-[var(--foreground)] block mb-3">Target Audience Segment</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTarget('ALL_TENANTS')}
                  className={clsx(
                    "p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all",
                    target === 'ALL_TENANTS'
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-400 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Users className="w-6 h-6" />
                  <span className="text-xs font-extrabold uppercase tracking-wider">All Tenants</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTarget('ALL_LANDLORDS')}
                  className={clsx(
                    "p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all",
                    target === 'ALL_LANDLORDS'
                      ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Building2 className="w-6 h-6" />
                  <span className="text-xs font-extrabold uppercase tracking-wider">All Landlords</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTarget('ALL_USERS')}
                  className={clsx(
                    "p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all",
                    target === 'ALL_USERS'
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Globe className="w-6 h-6" />
                  <span className="text-xs font-extrabold uppercase tracking-wider">Global (Everyone)</span>
                </button>
              </div>
            </div>

            {/* Notification Title */}
            <div>
              <label className="text-sm font-bold text-[var(--foreground)] block mb-1">Alert Title</label>
              <p className="text-[10px] text-[var(--muted-foreground)] mb-2">Short, attention-grabbing header.</p>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g., Scheduled Maintenance Window"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>

            {/* Notification Message */}
            <div>
              <label className="text-sm font-bold text-[var(--foreground)] block mb-1">Message Body</label>
              <p className="text-[10px] text-[var(--muted-foreground)] mb-2">The full content of the push notification.</p>
              <textarea
                required
                rows={5}
                maxLength={500}
                placeholder="Write your announcement here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-sky-500/40 resize-none"
              />
              <div className="text-[10px] font-bold text-slate-400 mt-1 text-right">
                {message.length} / 500 characters
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={broadcastMutation.isPending || !title.trim() || !message.trim()}
                className="w-full py-3.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-extrabold shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {broadcastMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                Dispatch Broadcast Now
              </button>
            </div>
          </form>
        </div>

        {/* Right Column - Preview & Guidelines */}
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="glass-card p-5 rounded-3xl border border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4" /> Live Device Preview
            </h3>
            
            <div className="bg-white dark:bg-[#111111] p-4 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-sky-500" />
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950/50 text-sky-500 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="space-y-1 overflow-hidden">
                  <h4 className="font-bold text-sm text-[var(--foreground)] truncate">
                    {title || 'Announcement Title'}
                  </h4>
                  <p className="text-xs text-[var(--muted-foreground)] line-clamp-3 leading-relaxed">
                    {message || 'The preview of your broadcast message will appear here...'}
                  </p>
                  <div className="text-[9px] text-slate-400 pt-1 font-bold">
                    Just now • System Broadcast
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Guidelines */}
          <div className="glass-card p-5 rounded-3xl border border-[var(--border)] space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Best Practices
            </h3>
            <ul className="text-[11px] text-[var(--muted-foreground)] space-y-2 list-disc pl-4">
              <li>Use for urgent platform updates, policy changes, or system downtime.</li>
              <li>For permanent informational records, use the <strong>Dynamic Notices</strong> feature instead.</li>
              <li>Broadcasts trigger real-time alerts. Avoid sending during late night hours.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
