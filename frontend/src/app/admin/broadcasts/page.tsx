'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useSocket } from '@/providers/SocketProvider';
import { 
  Radio, 
  Send, 
  Users, 
  Building2, 
  Globe, 
  Search, 
  Download, 
  RefreshCw, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Filter, 
  Eye, 
  Layers, 
  Mail, 
  BellRing, 
  Plus, 
  ChevronRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import SkeletonTable from '@/components/SkeletonTable';
import BroadcastComposerModal, { BroadcastPayload, BROADCAST_CATEGORIES } from '@/components/admin/broadcasts/BroadcastComposerModal';
import BroadcastDetailDrawer, { BroadcastRecord } from '@/components/admin/broadcasts/BroadcastDetailDrawer';
import clsx from 'clsx';

type TargetFilter = 'ALL' | 'ALL_TENANTS' | 'ALL_LANDLORDS' | 'ALL_USERS';
type SortOption = 'newest' | 'oldest' | 'reach';

export default function AdminBroadcastsPage() {
  const queryClient = useQueryClient();
  const { isConnected, socket } = useSocket();

  // Filters & Search
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
    staleTime: 30000
  });

  // Fetch Broadcast History
  const { data: rawHistory, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['admin-broadcast-history'],
    queryFn: async () => {
      const res = await api.get('/admin/notifications/broadcasts/history');
      return res.data as BroadcastRecord[];
    },
    refetchInterval: 15000,
    staleTime: 5000
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

  const history: BroadcastRecord[] = useMemo(() => {
    return rawHistory || [];
  }, [rawHistory]);

  // Audience metrics
  const audienceMetrics = useMemo(() => {
    const total = stats?.totalUsers || 0;
    const landlords = stats?.totalLandlords || 0;
    const tenants = Math.max(0, total - landlords);
    return { tenants, landlords, total };
  }, [stats]);

  // Filtering & Sorting
  const filteredHistory = useMemo(() => {
    return history
      .filter((rec) => {
        // Target filter
        if (targetFilter !== 'ALL' && rec.target !== targetFilter) {
          return false;
        }

        // Category filter
        if (categoryFilter !== 'ALL' && rec.category !== categoryFilter) {
          return false;
        }

        // Search filter
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
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'reach') {
          return (b.count || 0) - (a.count || 0);
        }
        return 0;
      });
  }, [history, targetFilter, categoryFilter, searchTerm, sortBy]);

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
      'Dispatched By'
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
      `"${rec.dispatchedBy || 'Admin'}"`
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

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(filteredHistory, null, 2)
    )}`;
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
      channels: rec.channels || ['IN_APP', 'SOCKET']
    });
    setIsComposerOpen(true);
  };

  const openComposerNew = () => {
    setComposerInitialData(null);
    setIsComposerOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTargetFilter('ALL');
    setCategoryFilter('ALL');
    setSortBy('newest');
  };

  const hasActiveFilters = Boolean(searchTerm) || targetFilter !== 'ALL' || categoryFilter !== 'ALL' || sortBy !== 'newest';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Page Header */}
      <AdminPageHeader
        title="Live Broadcast & Alerts"
        subtitle="Send important updates, target users, and monitor delivery."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Communications', href: '/admin/broadcasts' },
          { label: 'Live Broadcast & Alerts' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            {/* Live socket connection status pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900">
              <span className={clsx('w-2 h-2 rounded-full', isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500')} />
              <span>{isConnected ? 'Real-Time Stream Active' : 'Fallback Polling'}</span>
            </div>

            {/* Live refresh button */}
            <button
              onClick={() => refetch()}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
              title="Refresh History Ledger"
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

            {/* Primary Action: Create Broadcast */}
            <button
              onClick={openComposerNew}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
            >
              <Send className="w-4 h-4" />
              <span>Create Broadcast</span>
            </button>
          </div>
        }
      />

      {/* Compact Operational Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Dispatched Broadcasts */}
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Total Dispatched
            </span>
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-white">
            {history.length}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Logged broadcast operations
          </div>
        </div>

        {/* Card 2: Addressable Tenants */}
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Active Tenants
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {audienceMetrics.tenants}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Addressable tenant accounts
          </div>
        </div>

        {/* Card 3: Licensed Landlords */}
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Licensed Landlords
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {audienceMetrics.landlords}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Verified property owners
          </div>
        </div>

        {/* Card 4: Total Network Reach */}
        <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Network Reach
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {audienceMetrics.total}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Total addressable user accounts
          </div>
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
            placeholder="Search broadcasts by headline, message, or officer..."
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

        {/* Target, Category & Sort Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value as TargetFilter)}
            className="text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Audiences</option>
            <option value="ALL_TENANTS">Tenants Only</option>
            <option value="ALL_LANDLORDS">Landlords Only</option>
            <option value="ALL_USERS">Entire Network</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Categories</option>
            {BROADCAST_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="newest">Most Recent</option>
            <option value="oldest">Oldest Dispatched</option>
            <option value="reach">Highest Reach</option>
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

      {/* Historical Broadcast Dispatch Ledger (Data Table) */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={5} columns={6} />
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <Radio className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              No Broadcasts Recorded
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'No broadcast records match your search criteria. Try resetting your query or filters.'
                : 'No mass broadcasts have been transmitted yet. Click "Create Broadcast" to dispatch your first update.'}
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
                onClick={openComposerNew}
                className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow-sm"
              >
                Create Broadcast
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Dispatched Date</th>
                  <th className="py-3 px-4 whitespace-nowrap">Target Segment</th>
                  <th className="py-3 px-4">Alert Headline &amp; Message</th>
                  <th className="py-3 px-4 whitespace-nowrap">Channels</th>
                  <th className="py-3 px-4 whitespace-nowrap">Recipients Reached</th>
                  <th className="py-3 px-4 whitespace-nowrap">Admin Officer</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredHistory.map((rec) => {
                  const targetBadgeClass = 
                    rec.target === 'ALL_TENANTS' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-900/50' :
                    rec.target === 'ALL_LANDLORDS' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-900/50' :
                    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50';

                  const channelsList = rec.channels || ['IN_APP', 'SOCKET'];

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition group"
                    >
                      {/* Date Column */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                          {new Date(rec.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                          {new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Target Column */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <span className={clsx(
                          'inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border',
                          targetBadgeClass
                        )}>
                          {rec.target.replace('ALL_', '')}
                        </span>
                      </td>

                      {/* Content Column */}
                      <td className="py-3.5 px-4 align-top max-w-md">
                        <div className="space-y-1">
                          {rec.category && (
                            <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                              {rec.category.replace('_', ' ')}
                            </span>
                          )}
                          <div className="font-bold text-zinc-900 dark:text-white text-xs">
                            {rec.title}
                          </div>
                          <p className="text-zinc-500 dark:text-zinc-400 text-xs line-clamp-2 leading-relaxed">
                            {rec.message}
                          </p>
                        </div>
                      </td>

                      {/* Channels Column */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {channelsList.includes('IN_APP') && (
                            <span className="p-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-900/50" title="In-App Feed">
                              <BellRing className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {channelsList.includes('SOCKET') && (
                            <span className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/50" title="Real-Time Socket Alert">
                              <Radio className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {channelsList.includes('EMAIL') && (
                            <span className="p-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50" title="Institutional Email">
                              <Mail className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Delivered Count Column */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{rec.count} Users</span>
                        </span>
                      </td>

                      {/* Dispatched By Column */}
                      <td className="py-3.5 px-4 align-top whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {rec.dispatchedBy || 'System Administrator'}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Inspect Detail Drawer */}
                          <button
                            onClick={() => setInspectRecord(rec)}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
                            title="Inspect Transmission Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Re-use / Clone */}
                          <button
                            onClick={() => handleCloneBroadcast(rec)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-[11px] transition"
                            title="Load into Composer"
                          >
                            <RotateCcw className="w-3 h-3 text-zinc-400" />
                            <span>Re-use</span>
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

      {/* Dedicated Broadcast Composer Modal */}
      <BroadcastComposerModal
        isOpen={isComposerOpen}
        onClose={() => {
          setIsComposerOpen(false);
          setComposerInitialData(null);
        }}
        initialData={composerInitialData}
        audienceStats={audienceMetrics}
        onSuccess={() => refetch()}
      />

      {/* Broadcast Detail Drawer */}
      <BroadcastDetailDrawer
        isOpen={Boolean(inspectRecord)}
        onClose={() => setInspectRecord(null)}
        record={inspectRecord}
        onClone={(rec) => handleCloneBroadcast(rec)}
      />

    </div>
  );
}
