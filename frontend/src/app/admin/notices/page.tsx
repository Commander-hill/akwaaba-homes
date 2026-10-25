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
  XCircle, 
  Filter, 
  X, 
  ExternalLink, 
  Layers, 
  Radio, 
  Scale, 
  Link as LinkIcon, 
  Clock, 
  Wrench,
  AlertTriangle,
  ArrowRight,
  Eye,
  ChevronRight,
  Sliders
} from 'lucide-react';
import { useDialog } from '@/providers/DialogProvider';
import toast from 'react-hot-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import SkeletonTable from '@/components/SkeletonTable';
import NoticeDrawer, { Notice, ICON_MAP } from '@/components/admin/notices/NoticeDrawer';
import clsx from 'clsx';

type StatusFilterTab = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'LEGAL' | 'MAINTENANCE';
type SortOption = 'order' | 'newest' | 'oldest' | 'title';

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

export default function AdminNoticesPage() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { confirm } = useDialog();

  // Filters & Search
  const [activeTab, setActiveTab] = useState<StatusFilterTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('order');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Drawer & Edit State
  const [drawerNotice, setDrawerNotice] = useState<Notice | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch notices
  const { data: rawNotices, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['admin-notices'],
    queryFn: async () => {
      const res = await api.get('/admin/notices');
      return res.data as Notice[];
    },
    refetchInterval: 15000,
    staleTime: 5000
  });

  // Socket.IO real-time synchronization
  useEffect(() => {
    if (!socket) return;

    const handleSync = () => {
      refetch();
    };

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
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/notices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      queryClient.invalidateQueries({ queryKey: ['active-notices'] });
      toast.success('Notice deleted successfully.');
    },
    onError: () => {
      toast.error('Failed to delete notice.');
    }
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
        isActive: false // duplicated notices start in draft
      };
      await api.post('/admin/notices', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      toast.success('Notice duplicated as a draft copy.');
    },
    onError: () => {
      toast.error('Failed to duplicate notice.');
    }
  });

  // KPI Metrics Calculation
  const stats = useMemo(() => {
    const total = notices.length;
    const active = notices.filter((n) => n.isActive).length;
    const draft = notices.filter((n) => !n.isActive).length;
    const withCta = notices.filter((n) => Boolean(n.buttonText && n.buttonLink)).length;
    return { total, active, draft, withCta };
  }, [notices]);

  // Filtering & Sorting
  const filteredNotices = useMemo(() => {
    return notices
      .filter((notice) => {
        // Tab Filter
        if (activeTab === 'ACTIVE' && !notice.isActive) return false;
        if (activeTab === 'INACTIVE' && notice.isActive) return false;
        if (activeTab === 'LEGAL') {
          const isLegal = notice.iconType === 'LEGAL' || 
            (notice.topLabel || '').toLowerCase().includes('policy') ||
            (notice.topLabel || '').toLowerCase().includes('legal') ||
            (notice.topLabel || '').toLowerCase().includes('kyc');
          if (!isLegal) return false;
        }
        if (activeTab === 'MAINTENANCE') {
          const isMaint = notice.iconType === 'MAINTENANCE' ||
            (notice.topLabel || '').toLowerCase().includes('maintenance') ||
            (notice.title || '').toLowerCase().includes('maintenance');
          if (!isMaint) return false;
        }

        // Category Filter
        if (categoryFilter !== 'ALL' && notice.iconType !== categoryFilter) {
          return false;
        }

        // Search Term Filter
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const title = decodeHtmlEntities(notice.title).toLowerCase();
          const desc = decodeHtmlEntities(notice.description).toLowerCase();
          const label = (notice.topLabel || '').toLowerCase();
          const link = (notice.buttonLink || '').toLowerCase();
          return title.includes(q) || desc.includes(q) || label.includes(q) || link.includes(q);
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
  }, [notices, activeTab, categoryFilter, searchTerm, sortBy]);

  // Export handlers
  const handleExportCSV = () => {
    if (notices.length === 0) {
      toast.error('No announcements available to export.');
      return;
    }

    const headers = [
      'Order Index',
      'Top Label',
      'Headline',
      'Description',
      'Visual Icon',
      'Button Label',
      'Button URL',
      'Is Active Live',
      'Created Date'
    ];

    const rows = filteredNotices.map((n) => [
      `"${n.orderIndex}"`,
      `"${n.topLabel || ''}"`,
      `"${decodeHtmlEntities(n.title).replace(/"/g, '""')}"`,
      `"${decodeHtmlEntities(n.description).replace(/"/g, '""')}"`,
      `"${n.iconType || 'INFO'}"`,
      `"${n.buttonText || ''}"`,
      `"${n.buttonLink || ''}"`,
      `"${n.isActive ? 'ACTIVE' : 'INACTIVE'}"`,
      `"${n.createdAt || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `akwaaba_notices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
    toast.success('Notices exported to CSV.');
  };

  const handleExportJSON = () => {
    if (notices.length === 0) {
      toast.error('No announcements available to export.');
      return;
    }

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(filteredNotices, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `akwaaba_notices_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setIsExportMenuOpen(false);
    toast.success('Notices exported to JSON.');
  };

  const openDrawerForNew = () => {
    setDrawerNotice(null);
    setIsDrawerOpen(true);
  };

  const openDrawerForEdit = (notice: Notice) => {
    setDrawerNotice(notice);
    setIsDrawerOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActiveTab('ALL');
    setCategoryFilter('ALL');
    setSortBy('order');
  };

  const hasActiveFilters = Boolean(searchTerm) || activeTab !== 'ALL' || categoryFilter !== 'ALL' || sortBy !== 'order';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Page Header */}
      <AdminPageHeader
        title="Notice & Announcements"
        subtitle="Compose, edit, broadcast, and oversee persistent platform announcements, statutory tenancy guidelines, and operational alerts across all user portals."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Communications', href: '/admin/notices' },
          { label: 'Notices & Announcements' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            {/* Live refetch button */}
            <button
              onClick={() => refetch()}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
              title="Refresh Announcements"
            >
              <RefreshCw className={clsx('w-4 h-4', isRefetching && 'animate-spin text-emerald-600')} />
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
              >
                <Download className="w-4 h-4 text-zinc-400" />
                <span>Export</span>
              </button>

              {isExportMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsExportMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-44 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95">
                    <button
                      onClick={handleExportCSV}
                      className="w-full text-left px-4 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium"
                    >
                      Export CSV (.csv)
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="w-full text-left px-4 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium"
                    >
                      Export JSON (.json)
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Full Composer Link */}
            <Link
              href="/admin/notices/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
              title="Open Full Screen Wizard Composer"
            >
              <Sliders className="w-4 h-4 text-zinc-400" />
              <span>Full Wizard</span>
            </Link>

            {/* Quick Compose Button */}
            <button
              onClick={openDrawerForNew}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Compose Notice</span>
            </button>
          </div>
        }
      />

      {/* KPI Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total */}
        <button
          onClick={() => setActiveTab('ALL')}
          className={clsx(
            'p-4 rounded-2xl border text-left transition relative overflow-hidden group',
            activeTab === 'ALL'
              ? 'border-zinc-400 dark:border-zinc-600 bg-zinc-50/80 dark:bg-zinc-800/80 shadow-sm'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Total Notices
            </span>
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-white">
            {stats.total}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Platform notice inventory
          </div>
        </button>

        {/* Card 2: Active Live Banners */}
        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={clsx(
            'p-4 rounded-2xl border text-left transition relative overflow-hidden group',
            activeTab === 'ACTIVE'
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-sm'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-300 dark:hover:border-emerald-800'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Active Live Banners
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.active}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Currently broadcasting on dashboards
          </div>
        </button>

        {/* Card 3: Drafts / Inactive */}
        <button
          onClick={() => setActiveTab('INACTIVE')}
          className={clsx(
            'p-4 rounded-2xl border text-left transition relative overflow-hidden group',
            activeTab === 'INACTIVE'
              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-sm'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-300 dark:hover:border-amber-800'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Draft / Off
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.draft}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Unpublished draft announcements
          </div>
        </button>

        {/* Card 4: Action Linked CTA */}
        <button
          onClick={() => setActiveTab('ALL')}
          className="p-4 rounded-2xl border text-left transition relative overflow-hidden border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-blue-300 dark:hover:border-blue-800"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Action-Linked
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <LinkIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {stats.withCta}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Banners with destination button link
          </div>
        </button>

      </div>

      {/* Queue Filter Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-px overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { id: 'ALL', label: 'All Notices', count: stats.total },
            { id: 'ACTIVE', label: 'Active Live', count: stats.active },
            { id: 'INACTIVE', label: 'Draft / Off', count: stats.draft },
            { id: 'LEGAL', label: 'Policy & Legal' },
            { id: 'MAINTENANCE', label: 'Maintenance Alerts' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as StatusFilterTab)}
              className={clsx(
                'px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2',
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              )}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={clsx(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  activeTab === tab.id
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search notices by headline, label, or body content..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category & Sort Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Categories</option>
            {Object.entries(ICON_MAP).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="order">Display Order (#)</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="title">Headline (A-Z)</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline px-2 py-1"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Main Announcements Data Table */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={5} columns={6} />
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              No Notices Found
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'No notices match your current filters. Try resetting your search query or switching tabs.'
                : 'No announcements have been created yet. Click "Compose Notice" to publish your first announcement.'}
            </p>
            {hasActiveFilters ? (
              <button
                onClick={clearFilters}
                className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
              >
                Reset All Filters
              </button>
            ) : (
              <button
                onClick={openDrawerForNew}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm"
              >
                Compose First Notice
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4 w-16 text-center">Order</th>
                  <th className="py-3 px-4 w-16">Icon</th>
                  <th className="py-3 px-4">Announcement Headline &amp; Category</th>
                  <th className="py-3 px-4">Call-to-Action Link</th>
                  <th className="py-3 px-4">Broadcast Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredNotices.map((notice) => {
                  const iconCfg = ICON_MAP[notice.iconType || ''] || ICON_MAP.INFO;
                  const IconComp = iconCfg.icon;

                  return (
                    <tr
                      key={notice.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition group"
                    >
                      {/* Order Column */}
                      <td className="py-3.5 px-4 text-center align-top">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          #{notice.orderIndex.toString().padStart(2, '0')}
                        </span>
                      </td>

                      {/* Icon Column */}
                      <td className="py-3.5 px-4 align-top">
                        <div className={clsx(
                          'w-8 h-8 rounded-xl flex items-center justify-center border',
                          iconCfg.bg,
                          iconCfg.color,
                          'border-zinc-200/60 dark:border-zinc-800'
                        )}>
                          <IconComp className="w-4 h-4" />
                        </div>
                      </td>

                      {/* Announcement Details */}
                      <td className="py-3.5 px-4 align-top max-w-md">
                        <div className="space-y-1">
                          {notice.topLabel && (
                            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-800/50">
                              {notice.topLabel}
                            </span>
                          )}
                          <div className="font-bold text-zinc-900 dark:text-white text-xs">
                            {decodeHtmlEntities(notice.title)}
                          </div>
                          <p className="text-zinc-500 dark:text-zinc-400 text-xs line-clamp-2 leading-relaxed">
                            {decodeHtmlEntities(notice.description)}
                          </p>
                        </div>
                      </td>

                      {/* CTA Link Column */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        {notice.buttonText && notice.buttonLink ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px]">
                              <span>{notice.buttonText}</span>
                              <ArrowRight className="w-3 h-3 text-zinc-400" />
                            </span>
                            <div className="font-mono text-[10px] text-zinc-400 truncate max-w-[160px]">
                              {notice.buttonLink}
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-[11px] italic">— No link —</span>
                        )}
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleActiveMutation.mutate({ id: notice.id, isActive: !notice.isActive })}
                          className="focus:outline-none"
                          title="Click to toggle status"
                        >
                          <AdminStatusBadge
                            status={notice.isActive ? 'ACTIVE' : 'NOT_SUBMITTED'}
                            className="cursor-pointer hover:opacity-80 transition"
                          />
                        </button>
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick Edit in Drawer */}
                          <button
                            onClick={() => openDrawerForEdit(notice)}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
                            title="Quick Edit & Preview"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Full Wizard Edit Link */}
                          <Link
                            href={`/admin/notices/new?editId=${notice.id}`}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
                            title="Open in Full Wizard"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                          </Link>

                          {/* Duplicate Notice */}
                          <button
                            onClick={() => duplicateMutation.mutate(notice)}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
                            title="Duplicate Announcement"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Notice */}
                          <button
                            onClick={async () => {
                              const confirmed = await confirm({
                                title: 'Delete Notice & Announcement',
                                message: `Are you sure you want to permanently delete "${notice.title}"? This cannot be undone.`,
                                confirmText: 'Delete Announcement',
                                cancelText: 'Cancel',
                                type: 'danger'
                              });
                              if (confirmed) {
                                deleteMutation.mutate(notice.id);
                              }
                            }}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition"
                            title="Delete Notice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
