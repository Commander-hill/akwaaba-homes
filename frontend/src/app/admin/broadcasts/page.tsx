'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useSocket } from '@/providers/SocketProvider';
import {
  Send,
  Users,
  Check,
  Eye,
  Megaphone,
  Image as ImageIcon,
  Paperclip,
  Calendar,
  ChevronDown,
  ArrowRight,
  MoreVertical,
  Home,
  Bell,
  Info,
  Gift,
  BarChart2,
  Lightbulb,
  Search,
  Download,
  RefreshCw,
  X,
  RotateCcw,
  Radio,
  Loader2,
  CheckCircle2,
  Building2,
  Globe,
  ShieldAlert,
  Wrench,
  CreditCard,
  BellRing,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import SkeletonTable from '@/components/SkeletonTable';
import BroadcastComposerModal, {
  BroadcastPayload,
  BROADCAST_CATEGORIES,
} from '@/components/admin/broadcasts/BroadcastComposerModal';
import BroadcastDetailDrawer, {
  BroadcastRecord,
} from '@/components/admin/broadcasts/BroadcastDetailDrawer';
import clsx from 'clsx';

type TargetFilter = 'ALL' | 'ALL_TENANTS' | 'ALL_LANDLORDS' | 'ALL_USERS';
type SortOption = 'newest' | 'oldest' | 'reach';

/** Relative time formatter for recent broadcast feed */
function formatTimeAgo(dateInput: string): string {
  const diffMs = Date.now() - new Date(dateInput).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** Category visual styles matching reference feed */
function getBroadcastCategoryVisual(category?: string) {
  switch (category) {
    case 'MAINTENANCE_UPDATE':
      return {
        icon: Home,
        bg: 'bg-[#E7F8ED] dark:bg-emerald-950/50',
        color: 'text-[#16A34A] dark:text-emerald-400',
      };
    case 'FINANCIAL_SETTLEMENT':
      return {
        icon: Bell,
        bg: 'bg-[#FEF3E6] dark:bg-amber-950/50',
        color: 'text-[#F97316] dark:text-amber-400',
      };
    case 'SECURITY_ADVISORY':
      return {
        icon: Info,
        bg: 'bg-[#F3E8FF] dark:bg-purple-950/50',
        color: 'text-[#9333EA] dark:text-purple-400',
      };
    case 'STATUTORY_ALERT':
      return {
        icon: ShieldAlert,
        bg: 'bg-[#FEF3E6] dark:bg-amber-950/50',
        color: 'text-[#D97706] dark:text-amber-400',
      };
    default:
      return {
        icon: Gift,
        bg: 'bg-[#E8F2FE] dark:bg-blue-950/50',
        color: 'text-[#2563EB] dark:text-blue-400',
      };
  }
}

export default function AdminBroadcastsPage() {
  const queryClient = useQueryClient();
  const { isConnected, socket } = useSocket();
  const ledgerRef = useRef<HTMLDivElement>(null);

  // Inline Composer State
  const [inlineTarget, setInlineTarget] = useState<'ALL_USERS' | 'ALL_TENANTS' | 'ALL_LANDLORDS'>('ALL_USERS');
  const [inlineTitle, setInlineTitle] = useState('');
  const [inlineMessage, setInlineMessage] = useState('');
  const [inlineCategory, setInlineCategory] = useState('GENERAL_ANNOUNCEMENT');
  const [inlineChannels, setInlineChannels] = useState<('IN_APP' | 'SOCKET' | 'EMAIL')[]>(['IN_APP', 'SOCKET']);
  const [inlineSending, setInlineSending] = useState(false);
  const [scheduleDropdownOpen, setScheduleDropdownOpen] = useState(false);

  // Full Ledger / Filters State
  const [showFullLedger, setShowFullLedger] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Modals & Drawers
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerInitialData, setComposerInitialData] = useState<Partial<BroadcastPayload> | null>(null);
  const [inspectRecord, setInspectRecord] = useState<BroadcastRecord | null>(null);

  // Fetch Audience Stats
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    },
    staleTime: 30000,
  });

  // Fetch Broadcast History
  const {
    data: rawHistory,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-broadcast-history'],
    queryFn: async () => {
      const res = await api.get('/admin/notifications/broadcasts/history');
      return res.data as BroadcastRecord[];
    },
    refetchInterval: 15000,
    staleTime: 5000,
  });

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    if (!socket) return;
    const handleSync = () => {
      refetch();
    };
    socket.on('broadcast_dispatched', handleSync);
    return () => {
      socket.off('broadcast_dispatched', handleSync);
    };
  }, [socket, refetch]);

  const history: BroadcastRecord[] = useMemo(() => rawHistory || [], [rawHistory]);

  const audienceMetrics = useMemo(() => {
    const total = stats?.totalUsers || 0;
    const landlords = stats?.totalLandlords || 0;
    const tenants = Math.max(0, total - landlords);
    return { tenants, landlords, total };
  }, [stats]);

  const recentFour = useMemo(() => {
    return [...history]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4);
  }, [history]);

  // Filtering & Sorting for full ledger
  const filteredHistory = useMemo(() => {
    return history
      .filter((rec) => {
        if (targetFilter !== 'ALL' && rec.target !== targetFilter) return false;
        if (categoryFilter !== 'ALL' && rec.category !== categoryFilter) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const title = (rec.title || '').toLowerCase();
          const msg = (rec.message || '').toLowerCase();
          const sender = (rec.dispatchedBy || '').toLowerCase();
          return title.includes(q) || msg.includes(q) || sender.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === 'reach') return (b.count || 0) - (a.count || 0);
        return 0;
      });
  }, [history, targetFilter, categoryFilter, searchTerm, sortBy]);

  // Handle Inline Broadcast Dispatch
  const handleInlineSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineMessage.trim()) {
      toast.error('Please type a broadcast message first.');
      return;
    }

    const derivedTitle =
      inlineTitle.trim() ||
      (inlineMessage.trim().length > 48
        ? `${inlineMessage.trim().slice(0, 45)}...`
        : inlineMessage.trim());

    try {
      setInlineSending(true);
      const res = await api.post('/admin/notifications/broadcast', {
        target: inlineTarget,
        title: derivedTitle,
        message: inlineMessage.trim(),
        category: inlineCategory,
        priority: 'NORMAL',
        channels: inlineChannels,
      });

      toast.success(res.data?.message || `Broadcast dispatched to ${res.data?.count || 'target'} recipients!`);
      setInlineTitle('');
      setInlineMessage('');
      queryClient.invalidateQueries({ queryKey: ['admin-broadcast-history'] });
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send broadcast.');
    } finally {
      setInlineSending(false);
    }
  };

  // Export Handlers
  const handleExportCSV = () => {
    if (history.length === 0) {
      toast.error('No broadcast records available to export.');
      return;
    }

    const headers = [
      'Broadcast ID',
      'Dispatched Date',
      'Target Audience',
      'Headline',
      'Message Body',
      'Delivered Count',
      'Category',
      'Priority',
      'Channels',
      'Dispatched By',
    ];

    const rows = filteredHistory.map((rec) => [
      `"${rec.id}"`,
      `"${new Date(rec.createdAt).toISOString()}"`,
      `"${rec.target}"`,
      `"${(rec.title || '').replace(/"/g, '""')}"`,
      `"${(rec.message || '').replace(/"/g, '""')}"`,
      `"${rec.count}"`,
      `"${rec.category || 'GENERAL_ANNOUNCEMENT'}"`,
      `"${rec.priority || 'NORMAL'}"`,
      `"${(rec.channels || ['IN_APP', 'SOCKET']).join(', ')}"`,
      `"${rec.dispatchedBy || 'Admin'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `akwaaba_broadcast_dispatches_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
    toast.success('Broadcast ledger exported to CSV.');
  };

  const handleExportJSON = () => {
    if (history.length === 0) {
      toast.error('No broadcast records available to export.');
      return;
    }

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(filteredHistory, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `akwaaba_broadcast_dispatches_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setIsExportMenuOpen(false);
    toast.success('Broadcast ledger exported to JSON.');
  };

  const handleCloneBroadcast = (rec: BroadcastRecord) => {
    setComposerInitialData({
      target: rec.target,
      title: rec.title,
      message: rec.message,
      category: rec.category || 'STATUTORY_ALERT',
      priority: (rec.priority as any) || 'NORMAL',
      channels: rec.channels || ['IN_APP', 'SOCKET'],
    });
    setIsComposerOpen(true);
  };

  const openFullComposerWithCurrent = () => {
    setComposerInitialData({
      target: inlineTarget,
      title: inlineTitle,
      message: inlineMessage,
      category: inlineCategory,
      priority: 'NORMAL',
      channels: inlineChannels,
    });
    setIsComposerOpen(true);
  };

  const handleViewAllClick = () => {
    setShowFullLedger((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          ledgerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
      return next;
    });
  };

  return (
    <div className="space-y-5 pb-14">
      {/* ── 1. HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#EBF9F0] via-[#E6F7EC] to-[#EBF9F0] dark:from-[#062919] dark:via-[#052014] dark:to-[#041a10] border border-[#D4F2DE] dark:border-emerald-900/40 shadow-2xs min-h-[144px] flex items-center justify-between px-6 py-6 sm:px-8">
        {/* Right background building illustration */}
        <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[62%] lg:w-[55%] pointer-events-none opacity-95 dark:opacity-35">
          <Image
            src="/images/admin/dashboard-hero-building.webp"
            alt="AkwaabaHomes Residences"
            fill
            unoptimized
            priority
            sizes="(max-width: 640px) 100vw, 55vw"
            className="object-cover object-right"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#EBF9F0] via-[#EBF9F0]/85 to-transparent dark:from-[#062919] dark:via-[#062919]/85 dark:to-transparent" />
        </div>

        <div className="relative z-10 flex items-center gap-4 sm:gap-5 max-w-2xl">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#D1F2DC] dark:bg-emerald-900/70 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Megaphone className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              Live Broadcasts &amp; Alerts
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 font-medium mt-1">
              Send important updates, target users, and monitor delivery across the platform.
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. FOUR KPI STAT CARDS WITH SPARKLINES ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Broadcasts */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#E7F8ED] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Total Broadcasts
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {history.length}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#16A34A] mt-0.5">
                ↑ 12%
              </span>
            </div>
          </div>
          {/* Mini Green Sparkline */}
          <svg className="w-24 h-12 shrink-0 pointer-events-none" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16A34A" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#16A34A" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2 40 C18 35, 25 22, 42 26 C58 30, 72 10, 98 8 L98 45 L2 45 Z" fill="url(#gradGreen)" />
            <path d="M2 40 C18 35, 25 22, 42 26 C58 30, 72 10, 98 8" stroke="#16A34A" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="94" cy="9" r="2.5" fill="#16A34A" />
          </svg>
        </div>

        {/* Card 2: Active Recipients */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#E8F2FE] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Active Recipients
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                {audienceMetrics.total.toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#16A34A] mt-0.5">
                ↑ 8%
              </span>
            </div>
          </div>
          {/* Mini Blue Sparkline */}
          <svg className="w-24 h-12 shrink-0 pointer-events-none" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2 38 C20 34, 30 28, 48 20 C65 13, 76 18, 98 7 L98 45 L2 45 Z" fill="url(#gradBlue)" />
            <path d="M2 38 C20 34, 30 28, 48 20 C65 13, 76 18, 98 7" stroke="#3B82F6" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="94" cy="9" r="2.5" fill="#3B82F6" />
          </svg>
        </div>

        {/* Card 3: Delivery Rate */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#FEF3E6] dark:bg-amber-950/60 text-[#F97316] dark:text-amber-400 flex items-center justify-center shrink-0">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Delivery Rate
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                98.5%
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#16A34A] mt-0.5">
                ↑ 0.3%
              </span>
            </div>
          </div>
          {/* Mini Orange Sparkline */}
          <svg className="w-24 h-12 shrink-0 pointer-events-none" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F97316" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2 39 C22 36, 36 22, 52 24 C68 26, 80 12, 98 9 L98 45 L2 45 Z" fill="url(#gradOrange)" />
            <path d="M2 39 C22 36, 36 22, 52 24 C68 26, 80 12, 98 9" stroke="#F97316" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="94" cy="10" r="2.5" fill="#F97316" />
          </svg>
        </div>

        {/* Card 4: Read Rate */}
        <div className="relative overflow-hidden bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-4 sm:p-5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-11 h-11 rounded-full bg-[#F3E8FF] dark:bg-purple-950/60 text-[#9333EA] dark:text-purple-400 flex items-center justify-center shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Read Rate
              </span>
              <span className="block text-2xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                87.2%
              </span>
              <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#16A34A] mt-0.5">
                ↑ 4.1%
              </span>
            </div>
          </div>
          {/* Mini Purple Sparkline */}
          <svg className="w-24 h-12 shrink-0 pointer-events-none" viewBox="0 0 100 45" fill="none">
            <defs>
              <linearGradient id="gradPurple" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9333EA" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#9333EA" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M2 41 C20 38, 35 30, 50 25 C68 18, 78 14, 98 8 L98 45 L2 45 Z" fill="url(#gradPurple)" />
            <path d="M2 41 C20 38, 35 30, 50 25 C68 18, 78 14, 98 8" stroke="#9333EA" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="94" cy="9" r="2.5" fill="#9333EA" />
          </svg>
        </div>
      </div>

      {/* ── 3. MIDDLE 3-COLUMN BENTO GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Create a Broadcast Inline Composer (5 cols) */}
        <form
          onSubmit={handleInlineSend}
          className="lg:col-span-5 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 shadow-2xs flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#E7F8ED] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Megaphone className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-zinc-900 dark:text-white leading-snug">
                  Create a Broadcast
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Share updates, notices, or alerts with tenants, landlords, and users.
                </p>
              </div>
            </div>

            {/* Audience Target Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setInlineTarget('ALL_USERS')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer flex items-center gap-1.5',
                  inlineTarget === 'ALL_USERS'
                    ? 'bg-[#16A34A] text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                )}
              >
                <span className={clsx('px-1.5 py-0.2 rounded text-[10px]', inlineTarget === 'ALL_USERS' ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-700')}>
                  All
                </span>
                <span>Recipients</span>
              </button>

              <button
                type="button"
                onClick={() => setInlineTarget('ALL_TENANTS')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer',
                  inlineTarget === 'ALL_TENANTS'
                    ? 'bg-[#16A34A] text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                )}
              >
                Tenants
              </button>

              <button
                type="button"
                onClick={() => setInlineTarget('ALL_LANDLORDS')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer',
                  inlineTarget === 'ALL_LANDLORDS'
                    ? 'bg-[#16A34A] text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                )}
              >
                Landlords
              </button>

              <button
                type="button"
                onClick={openFullComposerWithCurrent}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Specific Group</span>
              </button>
            </div>

            {/* Optional Subject + Message Textarea Box */}
            <div className="mt-4 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-900/50 p-3 focus-within:border-[#16A34A] focus-within:ring-2 focus-within:ring-[#16A34A]/15 transition">
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={openFullComposerWithCurrent}
                  title="Open full composer with presets"
                  className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-[#16A34A] flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <input
                    type="text"
                    value={inlineTitle}
                    onChange={(e) => setInlineTitle(e.target.value)}
                    placeholder="Headline (optional, e.g. Rent Reminder)"
                    maxLength={100}
                    className="w-full bg-transparent text-xs font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none border-b border-zinc-200/70 dark:border-zinc-800 pb-1"
                  />
                  <textarea
                    rows={3}
                    value={inlineMessage}
                    onChange={(e) => setInlineMessage(e.target.value)}
                    maxLength={500}
                    placeholder="Type your message here..."
                    className="w-full bg-transparent text-xs sm:text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 outline-none resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-1">
                <span className="text-[10px] font-semibold text-zinc-400 tabular-nums">
                  {inlineMessage.length}/500
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Composer Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 mt-4 pt-1 relative">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={openFullComposerWithCurrent}
                className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Paperclip className="w-3.5 h-3.5 text-zinc-500" />
                <span>Attach File</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setScheduleDropdownOpen((p) => !p)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Schedule Later</span>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                </button>

                {scheduleDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setScheduleDropdownOpen(false)}
                    />
                    <div className="absolute left-0 bottom-full mb-2 w-56 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-2 z-30 text-xs space-y-1">
                      <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Delivery Options
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setScheduleDropdownOpen(false);
                          openFullComposerWithCurrent();
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer"
                      >
                        Open Advanced Composer &amp; Presets
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInlineCategory('MAINTENANCE_UPDATE');
                          setScheduleDropdownOpen(false);
                          toast.success('Category set to Maintenance Update');
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                      >
                        Tag as Maintenance Notice
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInlineCategory('FINANCIAL_SETTLEMENT');
                          setScheduleDropdownOpen(false);
                          toast.success('Category set to Rent / Payments');
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                      >
                        Tag as Rent Reminder
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={inlineSending}
              className="px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer ml-auto"
            >
              {inlineSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{inlineSending ? 'Sending...' : 'Send Broadcast'}</span>
            </button>
          </div>
        </form>

        {/* Center: Green Feature Highlight Card (3 cols) */}
        <div className="lg:col-span-3 bg-[#E7F6EC] dark:bg-emerald-950/30 border border-[#CEEFDA] dark:border-emerald-900/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          {/* Stylized Megaphone Graphic */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-[#D1F2DC] dark:bg-emerald-900/50 flex items-center justify-center shadow-2xs rotate-[-8deg]">
              <Megaphone className="w-11 h-11 text-[#16A34A] dark:text-emerald-400 stroke-[2]" />
            </div>
            <span className="absolute -top-1 right-1 w-3 h-1 rounded-full bg-[#16A34A]/60 rotate-[-25deg]" />
            <span className="absolute top-5 -right-2 w-4 h-1 rounded-full bg-[#16A34A]/80" />
            <span className="absolute bottom-4 -right-1 w-3 h-1 rounded-full bg-[#16A34A]/60 rotate-[25deg]" />
          </div>

          {/* Feature Checklist */}
          <ul className="mt-6 space-y-3 text-left w-full max-w-[180px] mx-auto">
            <li className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100">
              <span className="w-5 h-5 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
              <span>Instant Delivery</span>
            </li>
            <li className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100">
              <span className="w-5 h-5 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
              <span>Targeted Audience</span>
            </li>
            <li className="flex items-center gap-2.5 text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100">
              <span className="w-5 h-5 rounded-full bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 stroke-[3]" />
              </span>
              <span>Track Engagement</span>
            </li>
          </ul>
        </div>

        {/* Right: Recent Broadcasts Feed (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
              Recent Broadcasts
            </h2>
            <button
              type="button"
              onClick={handleViewAllClick}
              className="text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:text-[#16A34A] flex items-center gap-1 transition cursor-pointer"
            >
              <span>{showFullLedger ? 'Hide Ledger' : 'View All'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {isLoading ? (
              <div className="space-y-3 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
                ))}
              </div>
            ) : recentFour.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-8 text-center">
                <Radio className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-2" />
                <p className="text-xs font-semibold text-zinc-500">No broadcasts sent yet.</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Use the composer on the left to dispatch your first alert.</p>
              </div>
            ) : (
              recentFour.map((rec) => {
                const visual = getBroadcastCategoryVisual(rec.category);
                const IconComp = visual.icon;
                return (
                  <div
                    key={rec.id}
                    onClick={() => setInspectRecord(rec)}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition cursor-pointer group border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', visual.bg, visual.color)}>
                        <IconComp className="w-4 h-4 stroke-[2.2]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate group-hover:text-[#16A34A] transition">
                          {rec.title}
                        </h3>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {rec.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="px-2.5 py-1 rounded-full bg-[#E7F8ED] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                        <span>Sent</span>
                      </span>
                      <span className="text-[11px] text-zinc-400 font-medium whitespace-nowrap">
                        {formatTimeAgo(rec.createdAt)}
                      </span>
                      <MoreVertical className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── 4. BOTTOM ROW: BROADCAST PERFORMANCE + PRO TIP ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Broadcast Performance + Top Channels (9 cols) */}
        <div className="lg:col-span-9 bg-white dark:bg-[#141816] rounded-2xl border border-zinc-100 dark:border-zinc-800/80 p-5 sm:p-6 shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left: Smooth Area Performance Chart */}
            <div className="md:col-span-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-[#16A34A]" />
                  <h2 className="text-base font-extrabold text-zinc-900 dark:text-white">
                    Broadcast Performance
                  </h2>
                </div>
                <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 text-[10px] font-bold text-zinc-500">
                  <span className={clsx('w-1.5 h-1.5 rounded-full', isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')} />
                  <span>{isConnected ? 'Live Stream' : 'Polling'}</span>
                </div>
              </div>

              {/* SVG Smooth Delivery Rate Curve */}
              <div className="relative w-full h-44">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 560 155" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="perfArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16A34A" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#16A34A" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid Lines + Y-Axis Labels */}
                  {[
                    { y: 15, label: '100%' },
                    { y: 45, label: '75%' },
                    { y: 75, label: '50%' },
                    { y: 105, label: '25%' },
                    { y: 135, label: '0%' },
                  ].map((tick) => (
                    <g key={tick.label}>
                      <text x="0" y={tick.y + 3} className="fill-zinc-400 text-[10px] font-medium">
                        {tick.label}
                      </text>
                      <line x1="36" y1={tick.y} x2="550" y2={tick.y} stroke="currentColor" className="text-zinc-100 dark:text-zinc-800" strokeWidth="1" />
                    </g>
                  ))}

                  {/* Area Fill */}
                  <path
                    d="M40 75 C85 65, 110 42, 165 40 C215 38, 250 18, 295 22 C335 26, 360 44, 395 36 C430 28, 455 17, 485 19 C515 21, 535 28, 550 32 L550 135 L40 135 Z"
                    fill="url(#perfArea)"
                  />

                  {/* Main Curve Line */}
                  <path
                    d="M40 75 C85 65, 110 42, 165 40 C215 38, 250 18, 295 22 C335 26, 360 44, 395 36 C430 28, 455 17, 485 19 C515 21, 535 28, 550 32"
                    fill="none"
                    stroke="#16A34A"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Data Nodes */}
                  {[
                    { cx: 40, cy: 75 },
                    { cx: 95, cy: 59 },
                    { cx: 165, cy: 40 },
                    { cx: 235, cy: 28 },
                    { cx: 295, cy: 22 },
                    { cx: 365, cy: 41 },
                    { cx: 485, cy: 19, peak: true },
                    { cx: 550, cy: 32 },
                  ].map((pt, i) => (
                    <circle
                      key={i}
                      cx={pt.cx}
                      cy={pt.cy}
                      r={pt.peak ? 5 : 3.5}
                      fill="#16A34A"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  ))}

                  {/* Peak Tooltip Badge (98.5%) */}
                  <g transform="translate(457, -12)">
                    <rect width="56" height="24" rx="12" fill="#0B5E2E" />
                    <text x="28" y="16" textAnchor="middle" className="fill-white text-[11px] font-bold">
                      98.5%
                    </text>
                  </g>

                  {/* X-Axis Labels */}
                  {[
                    { x: 55, label: 'Oct 22' },
                    { x: 170, label: 'Oct 24' },
                    { x: 295, label: 'Oct 26' },
                    { x: 420, label: 'Oct 28' },
                    { x: 530, label: 'Oct 30' },
                  ].map((d) => (
                    <text key={d.label} x={d.x} y="152" textAnchor="middle" className="fill-zinc-400 text-[10px] font-medium">
                      {d.label}
                    </text>
                  ))}
                </svg>
              </div>
            </div>

            {/* Right: Top Channels Breakdown */}
            <div className="md:col-span-4 md:border-l md:border-zinc-100 dark:md:border-zinc-800 md:pl-6 space-y-4">
              <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white">
                Top Channels
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-zinc-600 dark:text-zinc-300">In-App Notifications</span>
                    <span className="font-bold text-zinc-900 dark:text-white">72%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full bg-[#16A34A]" style={{ width: '72%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-zinc-600 dark:text-zinc-300">Email</span>
                    <span className="font-bold text-zinc-900 dark:text-white">18%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: '18%' }} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                    <span className="text-zinc-600 dark:text-zinc-300">SMS</span>
                    <span className="font-bold text-zinc-900 dark:text-white">10%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full bg-[#F97316]" style={{ width: '10%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pro Tip Card (3 cols) */}
        <div className="lg:col-span-3 bg-[#EBF8F0] dark:bg-emerald-950/30 border border-[#D1F2DC] dark:border-emerald-900/40 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
              <Lightbulb className="w-5 h-5 text-[#16A34A] shrink-0" />
              <h3 className="text-sm font-extrabold">Pro Tip</h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mt-3">
              Schedule broadcasts during peak activity hours for higher engagement.
            </p>
          </div>

          <Link
            href="/admin/analytics"
            className="mt-5 w-full px-4 py-2.5 rounded-full bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-[#CEEFDA] dark:border-emerald-800 text-zinc-900 dark:text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition"
          >
            <span>View Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── 5. EXPANDABLE FULL BROADCAST LEDGER & EXPORT PANEL ── */}
      {showFullLedger && (
        <div
          ref={ledgerRef}
          className="bg-white dark:bg-[#141816] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-white">
                Complete Broadcast Ledger ({filteredHistory.length})
              </h3>
              <p className="text-xs text-zinc-500">
                Search, filter, inspect, clone, or export historical dispatch records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refetch()}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
                title="Refresh Ledger"
              >
                <RefreshCw className={clsx('w-4 h-4', isRefetching && 'animate-spin text-emerald-600')} />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsExportMenuOpen((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
                >
                  <Download className="w-4 h-4 text-zinc-400" />
                  <span>Export</span>
                </button>

                {isExportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setIsExportMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-44 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl py-1 z-30">
                      <button
                        type="button"
                        onClick={handleExportCSV}
                        className="w-full text-left px-4 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium cursor-pointer"
                      >
                        Export CSV (.csv)
                      </button>
                      <button
                        type="button"
                        onClick={handleExportJSON}
                        className="w-full text-left px-4 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium cursor-pointer"
                      >
                        Export JSON (.json)
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by headline, message, or officer..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={targetFilter}
                onChange={(e) => setTargetFilter(e.target.value as TargetFilter)}
                className="text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none"
              >
                <option value="ALL">All Audiences</option>
                <option value="ALL_TENANTS">Tenants Only</option>
                <option value="ALL_LANDLORDS">Landlords Only</option>
                <option value="ALL_USERS">Entire Network</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none"
              >
                <option value="ALL">All Categories</option>
                {BROADCAST_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none"
              >
                <option value="newest">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="reach">Highest Reach</option>
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          {isLoading ? (
            <SkeletonTable rows={5} />
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-xs text-zinc-500">
              No broadcast records match your filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Broadcast</th>
                    <th className="py-3 px-4">Target</th>
                    <th className="py-3 px-4">Recipients</th>
                    <th className="py-3 px-4">Dispatched</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
                  {filteredHistory.map((rec) => (
                    <tr
                      key={rec.id}
                      onClick={() => setInspectRecord(rec)}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition"
                    >
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-bold text-zinc-900 dark:text-white truncate">{rec.title}</p>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">{rec.message}</p>
                      </td>
                      <td className="py-3 px-4">
                        <AdminStatusBadge status={rec.target} />
                      </td>
                      <td className="py-3 px-4 font-bold text-zinc-900 dark:text-white">
                        {rec.count.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                        {new Date(rec.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloneBroadcast(rec);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 font-semibold cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Clone</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── MODALS & DRAWERS ── */}
      <BroadcastComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        initialData={composerInitialData}
        onSuccess={() => refetch()}
        audienceStats={audienceMetrics}
      />

      <BroadcastDetailDrawer
        isOpen={Boolean(inspectRecord)}
        record={inspectRecord}
        onClose={() => setInspectRecord(null)}
        onClone={(rec) => {
          setInspectRecord(null);
          handleCloneBroadcast(rec);
        }}
      />
    </div>
  );
}
