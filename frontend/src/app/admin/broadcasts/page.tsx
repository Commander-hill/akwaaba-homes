'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useSocket } from '@/providers/SocketProvider';
import { 
  Loader2, 
  Radio, 
  Send, 
  Users, 
  Building2, 
  Globe, 
  AlertCircle, 
  CheckCircle2, 
  BellRing, 
  Scale, 
  CreditCard, 
  ShieldAlert, 
  Sparkles, 
  Clock, 
  Smartphone, 
  RotateCcw, 
  ArrowRight, 
  Check, 
  FileText, 
  Zap,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface BroadcastRecord {
  id: string;
  title: string;
  message: string;
  target: 'ALL_TENANTS' | 'ALL_LANDLORDS' | 'ALL_USERS';
  count: number;
  dispatchedBy: string;
  createdAt: string;
}

const GHANA_BROADCAST_PRESETS = [
  {
    name: 'Act 220 Statutory Rent Cap',
    target: 'ALL_LANDLORDS' as const,
    title: 'Statutory 6-Month Rent Advance Ceiling Enforced',
    message: 'Ghana Rent Act (Act 220) strictly caps advance rent at 6 months for residential leases. All listing terms and escrow requests violating this limit will be suppressed.',
    category: 'STATUTORY_ALERT'
  },
  {
    name: 'Mandatory Ghana Card KYC',
    target: 'ALL_USERS' as const,
    title: 'National Identity Card (Ghana Card) Mandatory',
    message: 'Under platform statutory compliance rules, all residents and property owners must link their NIA Ghana Card by the end of the current month to prevent lease freezes.',
    category: 'STATUTORY_ALERT'
  },
  {
    name: 'Paystack & MoMo Gateway Maintenance',
    target: 'ALL_USERS' as const,
    title: 'Scheduled Escrow Gateway Maintenance (1:00 AM - 3:00 AM)',
    message: 'Routine banking settlement maintenance scheduled for Mobile Money and Paystack channels. Active tenancies and lease renewals remain secure.',
    category: 'FINANCIAL_ESCROW'
  },
  {
    name: 'Greater Accra Flood & Drainage Advisory',
    target: 'ALL_TENANTS' as const,
    title: 'Greater Accra Rainy Season & Compound Safety Advisory',
    message: 'Tenants are advised to inspect perimeter drainage and report structural compound leaks immediately via the Maintenance Tickets portal.',
    category: 'MAINTENANCE_UPDATE'
  },
  {
    name: 'Annual Landlord Permit Renewal (GH₵ 100)',
    target: 'ALL_LANDLORDS' as const,
    title: 'Annual Landlord Listing Permit Renewal Active',
    message: 'Ensure your GH₵ 100/yr property listing licenses are current to keep your residential listings visible to verified prospective tenants across Ghana.',
    category: 'FINANCIAL_ESCROW'
  }
];

export default function AdminBroadcastPage() {
  const queryClient = useQueryClient();
  const { isConnected } = useSocket();

  const [target, setTarget] = useState<'ALL_TENANTS' | 'ALL_LANDLORDS' | 'ALL_USERS'>('ALL_TENANTS');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<string>('STATUTORY_ALERT');

  // Fetch Audience Stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    }
  });

  // Fetch Broadcast History
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['admin-broadcast-history'],
    queryFn: async () => {
      const res = await api.get('/admin/notifications/broadcasts/history');
      return res.data as BroadcastRecord[];
    }
  });

  // Calculate Audience Segment Numbers
  const audienceMetrics = useMemo(() => {
    const total = stats?.totalUsers || 5;
    const landlords = stats?.totalLandlords || 1;
    const tenants = Math.max(0, total - landlords);

    return {
      tenants,
      landlords,
      total
    };
  }, [stats]);

  const currentAudienceCount = useMemo(() => {
    if (target === 'ALL_TENANTS') return audienceMetrics.tenants;
    if (target === 'ALL_LANDLORDS') return audienceMetrics.landlords;
    return audienceMetrics.total;
  }, [target, audienceMetrics]);

  const broadcastMutation = useMutation({
    mutationFn: async (payload: { target: string, title: string, message: string }) => {
      const res = await api.post('/admin/notifications/broadcast', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Broadcast dispatched successfully to ${data.count} users!`);
      setTitle('');
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['admin-broadcast-history'] });
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] });
    },
    onError: () => {
      toast.error('Failed to dispatch mass push broadcast.');
    }
  });

  const handleApplyPreset = (preset: typeof GHANA_BROADCAST_PRESETS[0]) => {
    setTarget(preset.target);
    setTitle(preset.title);
    setMessage(preset.message);
    setCategory(preset.category);
    toast.success(`Applied preset: "${preset.name}"`);
  };

  const handleCloneBroadcast = (rec: BroadcastRecord) => {
    setTarget(rec.target);
    setTitle(rec.title);
    setMessage(rec.message);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Broadcast template loaded into composer.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Alert title and message body are required.');
      return;
    }
    broadcastMutation.mutate({ target, title: title.trim(), message: message.trim() });
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in max-w-6xl mx-auto">
      
      {/* Executive Command Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0a2e1d] via-[#0F5132] to-[#0a2e1d] text-white shadow-xl relative overflow-hidden border border-emerald-800/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D97706]/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-900/60 text-emerald-200 border border-emerald-700/50">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
              {isConnected ? 'Real-Time Push Stream Active' : 'Fallback Push Stream'}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D97706]/20 text-amber-200 border border-[#D97706]/30">
              Ghana Electronic Communications &amp; Rent Act Standards
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <Radio className="w-8 h-8 text-[#D97706] animate-pulse" />
            Mass Push Notifications &amp; Alert Engine
          </h1>

          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Instantly dispatch high-priority push notifications and statutory tenancy alerts directly to tenant and landlord mobile devices and in-app notification centers.
          </p>
        </div>

        <div className="relative z-10 shrink-0 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 block">Current Target Reach</span>
          <span className="text-2xl font-black text-white">{currentAudienceCount} Users</span>
          <div className="text-[10px] text-emerald-300 font-semibold mt-0.5">100% Instant Delivery</div>
        </div>
      </div>

      {/* 4 Executive Audience & Delivery KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Addressable Tenants</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 border border-blue-100 dark:border-blue-900/40">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">{audienceMetrics.tenants}</span>
            <span className="text-[10px] font-bold text-blue-600">Active Residents</span>
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Eligible for tenant alerts</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Licensed Landlords</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-[#D97706] border border-amber-100 dark:border-amber-900/40">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-[#D97706]">{audienceMetrics.landlords}</span>
            <span className="text-[10px] font-bold text-[#D97706]">Property Owners</span>
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Property managers &amp; landlords</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Total Network Reach</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-[#0F5132] dark:text-emerald-400">{audienceMetrics.total}</span>
            <span className="text-[10px] font-bold text-emerald-600">100% Penetration</span>
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">All registered accounts</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Delivery Channels</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 border border-indigo-100 dark:border-indigo-900/40">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">Dual Mode</span>
            <span className="text-[10px] font-bold text-indigo-600">Socket + DB</span>
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Persistent in-app notification</p>
        </div>

      </div>

      {/* 1-Click Ghana Statutory & Emergency Presets */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D97706]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-[var(--foreground)]">
            1-Click Ghana Regulatory &amp; Emergency Push Presets
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {GHANA_BROADCAST_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-[#0F5132] hover:text-white dark:bg-slate-800 dark:hover:bg-[#0F5132] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-all cursor-pointer flex items-center gap-2 shadow-2xs"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>{preset.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 uppercase">
                {preset.target.replace('ALL_', '')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Form (Left) & Smartphone Mockup (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Dispatch Composer Form (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Target Segment Selector */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-2">
                1. Target Audience Segment
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTarget('ALL_TENANTS')}
                  className={clsx(
                    "p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer",
                    target === 'ALL_TENANTS'
                      ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-950 dark:border-slate-800 hover:bg-slate-100"
                  )}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-wider">All Tenants</span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">({audienceMetrics.tenants} Users)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTarget('ALL_LANDLORDS')}
                  className={clsx(
                    "p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer",
                    target === 'ALL_LANDLORDS'
                      ? "bg-amber-50 border-amber-300 text-[#D97706] dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-300 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-950 dark:border-slate-800 hover:bg-slate-100"
                  )}
                >
                  <Building2 className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-wider">All Landlords</span>
                  <span className="text-[10px] font-bold text-amber-600">({audienceMetrics.landlords} Users)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTarget('ALL_USERS')}
                  className={clsx(
                    "p-3.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer",
                    target === 'ALL_USERS'
                      ? "bg-emerald-50 border-emerald-300 text-[#0F5132] dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-950 dark:border-slate-800 hover:bg-slate-100"
                  )}
                >
                  <Globe className="w-5 h-5" />
                  <span className="text-xs font-black uppercase tracking-wider">Everyone</span>
                  <span className="text-[10px] font-bold text-emerald-600">({audienceMetrics.total} Users)</span>
                </button>
              </div>
            </div>

            {/* Urgency / Category */}
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-1">
                2. Notification Severity / Urgency Tag
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'STATUTORY_ALERT', label: 'Statutory / Legal' },
                  { id: 'FINANCIAL_ESCROW', label: 'Payment & Escrow' },
                  { id: 'MAINTENANCE_UPDATE', label: 'Repairs & SLA' },
                  { id: 'GENERAL_ANNOUNCEMENT', label: 'General Alert' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={clsx(
                      "py-2 px-1 text-center rounded-xl text-[11px] font-bold border transition-all cursor-pointer",
                      category === cat.id
                        ? "bg-[#0F5132] text-white border-[#0F5132] shadow-xs"
                        : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Alert Title */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  3. Alert Headline <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-slate-400">{title.length} / 100</span>
              </div>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g., Statutory 6-Month Rent Advance Ceiling Enforced"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 text-[var(--foreground)]"
              />
            </div>

            {/* Alert Message */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500">
                  4. Message Body <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-slate-400">{message.length} / 500</span>
              </div>
              <textarea
                required
                rows={5}
                maxLength={500}
                placeholder="Write the complete broadcast message. Be clear and specific regarding statutory regulations or deadlines..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none leading-relaxed text-[var(--foreground)]"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={broadcastMutation.isPending || !title.trim() || !message.trim()}
              className="w-full py-3.5 bg-[#0F5132] hover:bg-emerald-800 active:scale-95 text-white rounded-xl text-xs font-black tracking-wider uppercase shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {broadcastMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 text-[#D97706]" />
              )}
              {broadcastMutation.isPending ? 'Transmitting Broadcast...' : `Dispatch to ${currentAudienceCount} Users Now`}
            </button>
          </form>
        </div>

        {/* Right Column: Realistic Smartphone Push Notification Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              Live Mobile Push Notification Preview
            </span>

            {/* Realistic Smartphone Lock Screen Card */}
            <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-2xl border-4 border-slate-800 space-y-4 relative overflow-hidden">
              
              {/* Phone Status Bar */}
              <div className="flex justify-between items-center text-[10px] text-slate-400 px-1">
                <span className="font-bold">9:41 AM</span>
                <div className="w-16 h-3 bg-slate-900 rounded-full mx-auto"></div>
                <div className="flex items-center gap-1 text-[10px]">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Notification Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#0F5132] text-[#D97706] flex items-center justify-center font-black text-[9px] shadow-xs">
                      AH
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                      Akwaaba Homes
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold">NOW</span>
                </div>

                <div className="space-y-0.5">
                  <h5 className="font-extrabold text-xs text-white leading-snug">
                    {title || 'Announcement Title Preview'}
                  </h5>
                  <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                    {message || 'The full push alert message will display here on user smartphones and in their notification center...'}
                  </p>
                </div>

                <div className="pt-2 flex gap-2">
                  <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    Tap to Open App
                  </span>
                </div>
              </div>

              {/* Lock screen footer hint */}
              <div className="text-center pt-2">
                <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto"></div>
              </div>
            </div>
          </div>

          {/* Regulatory Guidelines */}
          <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-extrabold uppercase text-[10px] tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-[#D97706]" /> Transmission &amp; Notice Standards
            </div>
            <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
              Push broadcasts are recorded in the <strong>Immutable Audit Trail</strong> and trigger real-time device notifications. Maintain professional, non-promotional language in accordance with Ghana statutory rental regulations.
            </p>
          </div>

        </div>

      </div>

      {/* Lower Section: Recent Dispatch History Ledger */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
          <div>
            <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#0F5132]" />
              Historical Broadcast Dispatch Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Audit log of previously transmitted mass push announcements.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            {history?.length || 0} Broadcasts Recorded
          </span>
        </div>

        {historyLoading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" />
            <span className="text-xs font-bold text-slate-500">Loading broadcast history...</span>
          </div>
        ) : !history || history.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <BellRing className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
            <h4 className="font-bold text-xs text-[var(--foreground)]">No Dispatches Logged</h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
              No mass broadcasts have been dispatched yet. Use the composer above to transmit your first announcement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0F5132] text-white uppercase text-[10px] tracking-wider font-extrabold shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-white font-extrabold">Dispatched Date</th>
                  <th className="px-6 py-4 text-white font-extrabold">Target Segment</th>
                  <th className="px-6 py-4 text-white font-extrabold">Alert Title &amp; Narrative</th>
                  <th className="px-6 py-4 text-white font-extrabold">Delivered Count</th>
                  <th className="px-6 py-4 text-white font-extrabold">Admin Officer</th>
                  <th className="px-6 py-4 text-right text-white font-extrabold">Re-use</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {history.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-xs font-bold text-[var(--foreground)]">
                        {new Date(rec.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={clsx(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                        rec.target === 'ALL_TENANTS'
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
                          : rec.target === 'ALL_LANDLORDS'
                          ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                      )}>
                        {rec.target.replace('ALL_', '')}
                      </span>
                    </td>

                    <td className="px-6 py-4 max-w-md">
                      <div className="font-bold text-[var(--foreground)] text-xs mb-0.5">
                        {rec.title}
                      </div>
                      {rec.message && (
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                          {rec.message}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {rec.count} Users
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                      {rec.dispatchedBy || 'Super Admin'}
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleCloneBroadcast(rec)}
                        className="px-3 py-1 bg-slate-100 hover:bg-[#0F5132] hover:text-white dark:bg-slate-800 dark:hover:bg-[#0F5132] text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Re-use
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
