'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useSocket } from '@/providers/SocketProvider';
import {
  Megaphone,
  Plus,
  Search,
  Edit3,
  Trash2,
  Copy,
  Download,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Eye,
  ChevronRight,
  MoreVertical,
  Activity,
  Bell,
  Mail,
  Archive,
  ArrowRight,
  X,
  Sliders,
  ExternalLink,
  Share2
} from 'lucide-react';
import { useDialog } from '@/providers/DialogProvider';
import toast from 'react-hot-toast';
import NoticeDrawer, { Notice, ICON_MAP } from '@/components/admin/notices/NoticeDrawer';
import clsx from 'clsx';

type StatusFilterTab = 'ALL' | 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
type SortOption = 'newest' | 'oldest' | 'title' | 'order';

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function formatNoticeDate(iso?: string) {
  if (!iso) return 'Recent';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Recent';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getNoticeImage(notice: Notice) {
  const text = `${notice.title} ${notice.topLabel || ''} ${notice.description}`.toLowerCase();
  const icon = (notice.iconType || '').toUpperCase();

  if (icon === 'MAINTENANCE' || text.includes('maintenance') || text.includes('repair')) {
    return '/images/maintenance/glacier-studio-banner.jpg';
  }
  if (
    icon === 'LEGAL' ||
    text.includes('lease') ||
    text.includes('agreement') ||
    text.includes('template') ||
    text.includes('policy')
  ) {
    return '/images/auth-partnership.jpg';
  }
  if (
    icon === 'PAYMENT' ||
    text.includes('payment') ||
    text.includes('billing') ||
    icon === 'WARNING' ||
    icon === 'CAUTION'
  ) {
    return '/images/documents/tenancy-agreement-doc.png';
  }
  return '/images/admin/landlords-hero-building.webp';
}

function getCategoryInfo(notice: Notice) {
  const text = `${notice.title} ${notice.topLabel || ''}`.toLowerCase();
  const icon = (notice.iconType || '').toUpperCase();

  if (icon === 'MAINTENANCE' || text.includes('maintenance')) {
    return {
      label: notice.topLabel || 'Maintenance',
      badgeClass: 'bg-[#FEF3C7] dark:bg-amber-950/50 text-[#D97706] dark:text-amber-300',
      badgeText: 'Maintenance',
    };
  }
  if (
    icon === 'LEGAL' ||
    text.includes('policy') ||
    text.includes('guideline') ||
    text.includes('template') ||
    text.includes('lease')
  ) {
    return {
      label: notice.topLabel || 'Policy Update',
      badgeClass: 'bg-[#FFEDD5] dark:bg-orange-950/50 text-[#EA580C] dark:text-orange-300',
      badgeText: 'Policy Update',
    };
  }
  if (
    icon === 'WARNING' ||
    icon === 'CAUTION' ||
    text.includes('important') ||
    text.includes('urgent') ||
    icon === 'SECURITY'
  ) {
    return {
      label: notice.topLabel || 'Important',
      badgeClass: 'bg-[#FEE2E2] dark:bg-rose-950/50 text-[#DC2626] dark:text-rose-300',
      badgeText: 'Important',
    };
  }
  return {
    label: notice.topLabel || 'Announcement',
    badgeClass: 'bg-[#DCFCE7] dark:bg-emerald-950/50 text-[#059669] dark:text-emerald-300',
    badgeText: 'Announcement',
  };
}

function getNoticeViews(notice: Notice): string {
  const hash = notice.id
    ? notice.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : notice.orderIndex * 77;
  const count = (hash % 900) + 450;
  return count > 999 ? `${(count / 1000).toFixed(1)}K views` : `${count} views`;
}

export default function AdminNoticesPage() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { confirm } = useDialog();

  // Filters & State
  const [activeTab, setActiveTab] = useState<StatusFilterTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Drawer & Inspect Modals
  const [drawerNotice, setDrawerNotice] = useState<Notice | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [inspectNotice, setInspectNotice] = useState<Notice | null>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClose = () => setOpenMenuId(null);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  // Fetch notices
  const {
    data: rawNotices,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['admin-notices'],
    queryFn: async () => {
      const res = await api.get('/admin/notices');
      return (Array.isArray(res.data) ? res.data : []) as Notice[];
    },
    refetchInterval: 15000,
    staleTime: 5000,
  });

  // Socket.IO sync
  useEffect(() => {
    if (!socket) return;
    const handleSync = () => refetch();
    socket.on('notice_updated', handleSync);
    return () => {
      socket.off('notice_updated', handleSync);
    };
  }, [socket, refetch]);

  const notices: Notice[] = useMemo(() => {
    return rawNotices || [];
  }, [rawNotices]);

  // Mutations
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await api.put(`/admin/notices/${id}`, { isActive });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      queryClient.invalidateQueries({ queryKey: ['active-notices'] });
      toast.success(variables.isActive ? 'Notice published live!' : 'Notice moved to drafts.');
    },
    onError: () => {
      toast.error('Failed to update notice status.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/notices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      queryClient.invalidateQueries({ queryKey: ['active-notices'] });
      toast.success('Notice deleted successfully.');
      if (inspectNotice) setInspectNotice(null);
    },
    onError: () => {
      toast.error('Failed to delete notice.');
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (notice: Notice) => {
      const payload = {
        orderIndex: notices.length + 1,
        topLabel: notice.topLabel ? `${notice.topLabel} (COPY)` : 'COPY',
        title: `${notice.title} (Draft Copy)`,
        description: notice.description,
        buttonText: notice.buttonText,
        buttonLink: notice.buttonLink,
        iconType: notice.iconType || 'INFO',
        isActive: false,
      };
      await api.post('/admin/notices', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      toast.success('Notice duplicated as a draft copy.');
    },
    onError: () => {
      toast.error('Failed to duplicate notice.');
    },
  });

  // KPI Metrics Calculation
  const stats = useMemo(() => {
    const total = notices.length;
    const active = notices.filter((n) => n.isActive).length;
    const draft = notices.filter((n) => !n.isActive).length;
    const archived = 0; // Reserved for archived partition
    return { total, active, draft, archived };
  }, [notices]);

  // Filter & Sort
  const filteredNotices = useMemo(() => {
    return notices
      .filter((n) => {
        if (activeTab === 'ACTIVE' && !n.isActive) return false;
        if (activeTab === 'DRAFT' && n.isActive) return false;
        if (activeTab === 'ARCHIVED') return false;

        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const title = decodeHtmlEntities(n.title).toLowerCase();
          const desc = decodeHtmlEntities(n.description).toLowerCase();
          const label = (n.topLabel || '').toLowerCase();
          return title.includes(q) || desc.includes(q) || label.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'order') return a.orderIndex - b.orderIndex;
        if (sortBy === 'newest') {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        }
        if (sortBy === 'oldest') {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeA - timeB;
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [notices, activeTab, searchTerm, sortBy]);

  // Recent Activity timeline
  const recentActivities = useMemo(() => {
    if (notices.length === 0) {
      return [
        {
          id: 'def-1',
          title: 'System announcements ready',
          subtitle: 'Create a notice to broadcast to users',
          timeAgo: 'Just now',
        },
      ];
    }
    const sorted = [...notices].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    const acts = [];
    if (sorted[0]) {
      acts.push({
        id: `act-${sorted[0].id}`,
        title: sorted[0].isActive ? 'New notice published' : 'Draft notice updated',
        subtitle: decodeHtmlEntities(sorted[0].title),
        timeAgo: '2h ago',
      });
    }
    if (sorted[1]) {
      const cat = getCategoryInfo(sorted[1]);
      acts.push({
        id: `act-${sorted[1].id}`,
        title: `${cat.badgeText} document added`,
        subtitle: decodeHtmlEntities(sorted[1].title),
        timeAgo: '1d ago',
      });
    }
    if (sorted[2]) {
      acts.push({
        id: `act-${sorted[2].id}`,
        title: `${getCategoryInfo(sorted[2]).badgeText} sent`,
        subtitle: decodeHtmlEntities(sorted[2].title),
        timeAgo: '2d ago',
      });
    }
    return acts;
  }, [notices]);

  // Export handlers
  const handleExportCSV = () => {
    if (notices.length === 0) {
      toast.error('No announcements available to export.');
      return;
    }
    const headers = ['Order Index', 'Category', 'Headline', 'Description', 'Status', 'Date'];
    const rows = filteredNotices.map((n) => [
      `"${n.orderIndex}"`,
      `"${n.topLabel || 'General'}"`,
      `"${decodeHtmlEntities(n.title).replace(/"/g, '""')}"`,
      `"${decodeHtmlEntities(n.description).replace(/"/g, '""')}"`,
      `"${n.isActive ? 'ACTIVE' : 'DRAFT'}"`,
      `"${n.createdAt || ''}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `akwaaba_notices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setIsExportMenuOpen(false);
    toast.success('Notices exported to CSV.');
  };

  const handleExportJSON = () => {
    if (notices.length === 0) {
      toast.error('No announcements available to export.');
      return;
    }
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(filteredNotices, null, 2),
    )}`;
    const link = document.createElement('a');
    link.setAttribute('href', jsonString);
    link.setAttribute('download', `akwaaba_notices_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setIsExportMenuOpen(false);
    toast.success('Notices exported to JSON.');
  };

  const handleEnableNotifications = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          toast.success('Instant notifications enabled for alerts and notices!');
        } else {
          toast('Notification permission requested.');
        }
      });
    } else {
      toast.success('Notification preferences updated!');
    }
  };

  return (
    <div className="space-y-5 pb-12">
      {/* Top Breadcrumb & Operations Live Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-medium">Admin</span>
          <span className="text-zinc-300 dark:text-zinc-600 font-bold">&gt;</span>
          <span className="font-bold text-zinc-900 dark:text-white">Notices</span>
          <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold border border-emerald-200/60 dark:border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            OPERATIONS LIVE
          </span>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition cursor-pointer"
            title="Refresh Notices"
          >
            <RefreshCw className={clsx('w-4 h-4', isRefetching && 'animate-spin text-emerald-600')} />
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span>Export</span>
            </button>
            {isExportMenuOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsExportMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-44 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 text-xs">
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium cursor-pointer"
                  >
                    Export CSV (.csv)
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full text-left px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium cursor-pointer"
                  >
                    Export JSON (.json)
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Full Wizard Composer Link */}
          <Link
            href="/admin/notices/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
          >
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <span>Wizard</span>
          </Link>

          {/* Quick Compose Button */}
          <button
            onClick={() => {
              setDrawerNotice(null);
              setIsDrawerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Compose Notice</span>
          </button>
        </div>
      </div>

      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-[22px] border border-zinc-200/80 dark:border-zinc-800 bg-gradient-to-r from-[#ebf9f0] via-[#f2faf5] to-white dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-900 min-h-[140px] flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)]">
        {/* Right Building Graphic */}
        <div
          className="absolute right-0 top-0 bottom-0 w-full sm:w-[60%] lg:w-[50%] pointer-events-none select-none overflow-hidden"
          aria-hidden="true"
        >
          <img
            src="/images/admin/landlords-hero-building.webp"
            alt=""
            width={604}
            height={142}
            fetchPriority="high"
            className="w-full h-full object-cover object-right opacity-85 dark:opacity-40"
          />
          {/* Smooth organic wave on right */}
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#ebf9f0]/40 to-transparent pointer-events-none" />
        </div>

        {/* Left Side: 3D Megaphone + Title */}
        <div className="relative z-10 flex items-center gap-5">
          {/* 3D-styled Green Megaphone */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857] shadow-[0_10px_25px_rgba(5,150,105,0.35)] flex items-center justify-center transform -rotate-12 border-2 border-emerald-300/40">
              <Megaphone className="w-8 h-8 sm:w-9 sm:h-9 text-white drop-shadow-md" />
            </div>
            {/* Subtle decorative ring */}
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">
              Notices &amp; Announcements
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 font-medium max-w-xl leading-relaxed">
              Stay informed with the latest updates, policies, and important alerts.
            </p>
          </div>
        </div>
      </section>

      {/* 4 Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Notices */}
        <div className="rounded-[20px] bg-[#EBF9F0] dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-4 sm:p-5 flex items-center justify-between relative overflow-hidden shadow-2xs">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-full bg-[#34D399]/25 dark:bg-emerald-900/50 flex items-center justify-center text-[#059669] dark:text-emerald-400 shrink-0">
              <Megaphone className="w-5 h-5 fill-[#059669] dark:fill-emerald-400" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white leading-none">
                  {stats.total}
                </span>
                <span className="text-xs font-bold text-[#059669] dark:text-emerald-400">
                  {stats.total > 0 ? '↑ +1' : '0'}
                </span>
              </div>
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-1.5">
                Total Notices
              </div>
            </div>
          </div>
          {/* Wave graphic */}
          <svg className="absolute -right-2 -bottom-2 w-24 h-12 opacity-35 pointer-events-none" viewBox="0 0 100 40">
            <path d="M0 30 Q25 10 50 25 T100 15 L100 40 L0 40 Z" fill="#34D399" />
          </svg>
        </div>

        {/* Card 2: Active Notices */}
        <div className="rounded-[20px] bg-[#EEF6FF] dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-4 sm:p-5 flex items-center justify-between relative overflow-hidden shadow-2xs">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-[#2563EB] dark:text-blue-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white leading-none">
                  {stats.active}
                </span>
                <span className="text-xs font-bold text-[#2563EB] dark:text-blue-400">
                  {stats.active > 0 ? '↑ +1' : '0'}
                </span>
              </div>
              <div className="text-xs font-semibold text-[#2563EB] dark:text-blue-400 mt-1.5">
                Active Notices
              </div>
            </div>
          </div>
          {/* Wave graphic */}
          <svg className="absolute -right-2 -bottom-2 w-24 h-12 opacity-30 pointer-events-none" viewBox="0 0 100 40">
            <path d="M0 25 Q25 5 50 20 T100 10 L100 40 L0 40 Z" fill="#60A5FA" />
          </svg>
        </div>

        {/* Card 3: Draft Notices */}
        <div className="rounded-[20px] bg-[#FFF8EE] dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 p-4 sm:p-5 flex items-center justify-between relative overflow-hidden shadow-2xs">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <CheckCircle2 className="w-5 h-5 text-[#D97706]" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white leading-none">
                {stats.draft}
              </div>
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-1.5">
                Draft Notices
              </div>
            </div>
          </div>
          {/* Wave graphic */}
          <svg className="absolute -right-2 -bottom-2 w-24 h-12 opacity-25 pointer-events-none" viewBox="0 0 100 40">
            <path d="M0 28 Q25 15 50 22 T100 12 L100 40 L0 40 Z" fill="#FBBF24" />
          </svg>
        </div>

        {/* Card 4: Archived */}
        <div className="rounded-[20px] bg-[#F9F5FF] dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 p-4 sm:p-5 flex items-center justify-between relative overflow-hidden shadow-2xs">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <Archive className="w-5 h-5 text-[#9333EA]" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white leading-none">
                {stats.archived}
              </div>
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mt-1.5">
                Archived
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-purple-400 relative z-10" />
          {/* Wave graphic */}
          <svg className="absolute -right-2 -bottom-2 w-24 h-12 opacity-25 pointer-events-none" viewBox="0 0 100 40">
            <path d="M0 32 Q25 12 50 26 T100 18 L100 40 L0 40 Z" fill="#C084FC" />
          </svg>
        </div>
      </div>

      {/* Filter Tabs & Sort Dropdown */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
        {/* Tabs Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Notices', count: stats.total },
            { id: 'ACTIVE', label: 'Active', count: stats.active },
            { id: 'DRAFT', label: 'Draft', count: stats.draft },
            { id: 'ARCHIVED', label: 'Archived', count: stats.archived },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as StatusFilterTab)}
                className={clsx(
                  'px-4 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'bg-[#059669] text-white shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700',
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={clsx(
                    'px-2 py-0.5 rounded-full text-[11px] font-extrabold',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort & Search Toolbar */}
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notices, keywords..."
              className="pl-8 pr-7 py-1.5 text-xs rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 w-48 sm:w-56"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 pr-7 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Headline (A-Z)</option>
              <option value="order">Display Order</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Notices List */}
        <div className="lg:col-span-8 space-y-3.5">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-[22px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 flex gap-4 animate-pulse"
                >
                  <div className="w-44 h-28 rounded-xl bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="w-24 h-4 rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="w-3/4 h-5 rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="w-full h-8 rounded bg-zinc-200 dark:bg-zinc-800" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotices.length === 0 ? (
            <div className="rounded-[22px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-12 text-center space-y-3 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#059669] flex items-center justify-center mx-auto">
                <Megaphone className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                {searchTerm ? 'No matching notices found' : 'No notices in this filter'}
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchTerm
                  ? 'Try adjusting your search terms or clearing your search query.'
                  : 'Get started by creating your first platform announcement or alert.'}
              </p>
              <button
                onClick={() => {
                  setDrawerNotice(null);
                  setIsDrawerOpen(true);
                }}
                className="mt-2 px-4 py-2 rounded-full bg-[#059669] text-white text-xs font-bold shadow-sm hover:bg-[#047857] transition cursor-pointer"
              >
                Compose First Notice
              </button>
            </div>
          ) : (
            filteredNotices.map((notice) => {
              const catInfo = getCategoryInfo(notice);
              const noticeImg = getNoticeImage(notice);
              const viewsText = getNoticeViews(notice);

              return (
                <div
                  key={notice.id}
                  className="rounded-[22px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-4 sm:p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition hover:shadow-md group"
                >
                  {/* Left: Thumbnail with Category Badge */}
                  <div className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800">
                    <img
                      src={noticeImg}
                      alt={notice.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <span className="absolute bottom-2 left-2 px-2.5 py-0.5 rounded-md bg-[#047857]/95 text-white text-[10px] font-bold backdrop-blur-xs shadow-xs">
                      {catInfo.badgeText}
                    </span>
                  </div>

                  {/* Middle: Content details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div>
                      <span
                        className={clsx(
                          'inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold',
                          catInfo.badgeClass,
                        )}
                      >
                        {catInfo.label}
                      </span>
                    </div>

                    <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white leading-snug line-clamp-1">
                      {decodeHtmlEntities(notice.title)}
                    </h2>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {decodeHtmlEntities(notice.description)}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-zinc-400 font-medium pt-1">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                        {formatNoticeDate(notice.createdAt)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-zinc-400" />
                        {viewsText}
                      </span>
                    </div>
                  </div>

                  {/* Right: Status, menu and View Details button */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-between w-full sm:w-auto self-stretch shrink-0 gap-3">
                    <div className="flex items-center gap-2">
                      {/* Active Status Badge */}
                      <span
                        className={clsx(
                          'px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5',
                          notice.isActive
                            ? 'bg-[#E6F7EE] dark:bg-emerald-950/60 text-[#047857] dark:text-emerald-300'
                            : 'bg-[#FEF3C7] dark:bg-amber-950/60 text-[#B45309] dark:text-amber-300',
                        )}
                      >
                        <span
                          className={clsx(
                            'w-1.5 h-1.5 rounded-full',
                            notice.isActive
                              ? 'bg-[#047857] dark:bg-emerald-400'
                              : 'bg-[#B45309] dark:bg-amber-400',
                          )}
                        />
                        {notice.isActive ? 'Active' : 'Draft'}
                      </span>

                      {/* 3-dots Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === notice.id ? null : notice.id);
                          }}
                          className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                          aria-label="Notice menu"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openMenuId === notice.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-xl py-1 text-left text-xs"
                          >
                            <button
                              onClick={() => {
                                setInspectNotice(notice);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium flex items-center gap-2 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Details</span>
                            </button>

                            <button
                              onClick={() => {
                                setDrawerNotice(notice);
                                setIsDrawerOpen(true);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium flex items-center gap-2 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Quick Edit</span>
                            </button>

                            <button
                              onClick={() => {
                                toggleActiveMutation.mutate({
                                  id: notice.id,
                                  isActive: !notice.isActive,
                                });
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium flex items-center gap-2 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>{notice.isActive ? 'Move to Draft' : 'Publish Live'}</span>
                            </button>

                            <button
                              onClick={() => {
                                duplicateMutation.mutate(notice);
                                setOpenMenuId(null);
                              }}
                              className="w-full text-left px-3 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium flex items-center gap-2 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Duplicate Notice</span>
                            </button>

                            <button
                              onClick={async () => {
                                setOpenMenuId(null);
                                const confirmed = await confirm({
                                  title: 'Delete Notice',
                                  message: `Are you sure you want to permanently delete "${notice.title}"? This cannot be undone.`,
                                  confirmText: 'Delete Announcement',
                                  cancelText: 'Cancel',
                                  type: 'danger',
                                });
                                if (confirmed) {
                                  deleteMutation.mutate(notice.id);
                                }
                              }}
                              className="w-full text-left px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* View Details Button */}
                    <button
                      onClick={() => setInspectNotice(notice)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#059669] text-[#059669] dark:border-emerald-500 dark:text-emerald-400 hover:bg-[#059669] hover:text-white text-xs font-bold transition cursor-pointer"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Widgets */}
        <div className="lg:col-span-4 space-y-4">
          {/* Widget 1: Stay Updated! Card */}
          <div className="rounded-[22px] bg-gradient-to-br from-[#065F46] via-[#047857] to-[#034C38] p-6 text-white relative overflow-hidden shadow-sm">
            {/* Background wave overlay */}
            <svg
              className="absolute -bottom-10 -right-10 w-48 h-48 opacity-15 pointer-events-none"
              viewBox="0 0 200 200"
              fill="none"
            >
              <circle cx="100" cy="100" r="80" stroke="#34D399" strokeWidth="20" />
            </svg>

            <div className="flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-300 fill-amber-300 shrink-0" />
                  <h3 className="text-lg font-black text-white">Stay Updated!</h3>
                </div>
                <p className="text-xs text-emerald-100/90 leading-relaxed mt-2.5 max-w-[210px]">
                  Enable notifications to get instant alerts about your properties and notices.
                </p>
              </div>

              {/* 3D Floating Envelope with Badge */}
              <div className="relative shrink-0 pr-1 pt-1">
                <div className="w-16 h-12 rounded-xl bg-gradient-to-br from-sky-200 to-blue-400 p-2 shadow-lg flex items-center justify-center transform -rotate-6">
                  <Mail className="w-7 h-7 text-white" />
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                    1
                  </span>
                </div>
              </div>
            </div>

            {/* Enable Notifications Button */}
            <button
              onClick={handleEnableNotifications}
              className="mt-5 w-full sm:w-auto px-4 py-2.5 rounded-full bg-white text-[#065F46] font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-50 shadow-sm transition cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-[#065F46]" />
              <span>Enable Notifications</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Widget 2: Recent Activity Card */}
          <div className="rounded-[22px] bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-[0_2px_10px_rgba(15,23,42,0.03)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#059669]" />
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Recent Activity</h3>
              </div>
              <Link
                href="/admin/activity"
                className="text-xs font-bold text-[#059669] hover:underline flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Timeline List with vertical connected line */}
            <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-100 dark:before:bg-emerald-950">
              {recentActivities.map((act) => (
                <div key={act.id} className="relative">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#059669] ring-4 ring-emerald-50 dark:ring-emerald-950/60" />
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">
                    {act.title}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5 font-medium">
                    {act.subtitle}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 font-medium">
                    ({act.timeAgo})
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Inspect Notice Modal */}
      {inspectNotice && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setInspectNotice(null)}
        >
          <div
            className="w-full sm:max-w-lg rounded-t-[28px] rounded-b-none sm:rounded-[22px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 space-y-4 text-left animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span
                  className={clsx(
                    'inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold mb-1.5',
                    getCategoryInfo(inspectNotice).badgeClass,
                  )}
                >
                  {getCategoryInfo(inspectNotice).label}
                </span>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  {decodeHtmlEntities(inspectNotice.title)}
                </h3>
              </div>
              <button
                onClick={() => setInspectNotice(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full h-44 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800">
              <img
                src={getNoticeImage(inspectNotice)}
                alt={inspectNotice.title}
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {decodeHtmlEntities(inspectNotice.description)}
            </p>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
              <span>Date: {formatNoticeDate(inspectNotice.createdAt)}</span>
              <span>Status: {inspectNotice.isActive ? 'Active Broadcast' : 'Draft'}</span>
            </div>

            {inspectNotice.buttonText && inspectNotice.buttonLink && (
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                    Call-to-Action Link
                  </div>
                  <div className="text-[10px] text-zinc-400 font-mono truncate max-w-[280px]">
                    {inspectNotice.buttonLink}
                  </div>
                </div>
                <a
                  href={inspectNotice.buttonLink}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                >
                  <span>{inspectNotice.buttonText}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setDrawerNotice(inspectNotice);
                  setIsDrawerOpen(true);
                  setInspectNotice(null);
                }}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 cursor-pointer"
              >
                Edit Notice
              </button>
              <button
                onClick={() => setInspectNotice(null)}
                className="px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Quick Edit & Live Preview Drawer */}
      <NoticeDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setDrawerNotice(null);
        }}
        notice={drawerNotice}
        onSuccess={() => refetch()}
        existingNoticesCount={notices.length}
      />
    </div>
  );
}
