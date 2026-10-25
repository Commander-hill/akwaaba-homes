'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useSocket } from '@/providers/SocketProvider';
import { 
  Database, 
  RotateCw, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Globe, 
  Clock, 
  User as UserIcon, 
  Eye, 
  ExternalLink, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AuditFilterBar, { AuditCategory, AuditDateRange } from '@/components/admin/audit/AuditFilterBar';
import AuditDetailDrawer, { AuditLogItem, getActionCategory, getEntityRoute } from '@/components/admin/audit/AuditDetailDrawer';

interface AuditLogsResponse {
  logs: AuditLogItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  metrics: {
    total: number;
    sanctions: number;
    approvals: number;
    uniqueIps: number;
  };
  availableEntities: string[];
}

export default function AuditLogsPage() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  // Filter & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<AuditCategory>('ALL');
  const [entity, setEntity] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<AuditDateRange>('ALL');
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);

  // Live streaming & UI State
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1); // Reset to first page on search change
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Compute startDate based on dateRange preset
  const startDate = useMemo(() => {
    if (dateRange === 'TODAY') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    if (dateRange === '7D') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toISOString();
    }
    if (dateRange === '30D') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString();
    }
    return '';
  }, [dateRange]);

  // Query Audit Logs
  const { data, isLoading, isFetching, refetch } = useQuery<AuditLogsResponse>({
    queryKey: ['admin-audit-logs', page, limit, debouncedSearch, category, entity, startDate],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page,
        limit
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (category !== 'ALL') params.category = category;
      if (entity !== 'ALL') params.entity = entity;
      if (startDate) params.startDate = startDate;

      const res = await api.get('/admin/audit-logs', { params });
      
      // Support legacy response array fallback if backend returned bare array
      if (Array.isArray(res.data)) {
        return {
          logs: res.data,
          pagination: { total: res.data.length, page: 1, limit: res.data.length, totalPages: 1 },
          metrics: {
            total: res.data.length,
            sanctions: res.data.filter((l: AuditLogItem) => l.action?.includes('REJECT') || l.action?.includes('LOCK')).length,
            approvals: res.data.filter((l: AuditLogItem) => l.action?.includes('APPROVE') || l.action?.includes('VERIF')).length,
            uniqueIps: new Set(res.data.map((l: AuditLogItem) => l.ipAddress).filter(Boolean)).size
          },
          availableEntities: Array.from(new Set(res.data.map((l: AuditLogItem) => l.entity).filter(Boolean)))
        };
      }

      return res.data;
    },
    staleTime: 30000
  });

  // Socket.IO live sync
  useEffect(() => {
    if (!socket) return;

    const handleNewAuditEvent = (newLog: AuditLogItem) => {
      if (!isStreaming) return;

      // Invalidate query so the table and metrics refresh seamlessly
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });

      // Notify if high-severity sanction
      const cat = getActionCategory(newLog.action);
      if (cat.variant === 'danger') {
        toast.error(`Security Event: ${newLog.action} recorded on ${newLog.entity}`, {
          duration: 4000,
          position: 'top-right'
        });
      }
    };

    socket.on('audit_event_logged', handleNewAuditEvent);

    return () => {
      socket.off('audit_event_logged', handleNewAuditEvent);
    };
  }, [socket, isStreaming, queryClient]);

  const logs = data?.logs || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 50, totalPages: 1 };
  const metrics = data?.metrics || { total: 0, sanctions: 0, approvals: 0, uniqueIps: 0 };
  const availableEntities = data?.availableEntities || [];

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    toast.success('IP copied to clipboard');
    setTimeout(() => setCopiedIp(null), 1800);
  };

  // CSV Export
  const handleExportCsv = useCallback(() => {
    if (logs.length === 0) {
      toast.error('No audit records to export');
      return;
    }
    setIsExporting(true);
    try {
      const headers = [
        'Timestamp (UTC)',
        'Actor Name',
        'Actor Email',
        'Actor Role',
        'Action Verb',
        'Action Category',
        'Target Entity',
        'Entity ID',
        'Origin IP Address'
      ];

      const csvRows = logs.map((log) => {
        const cat = getActionCategory(log.action);
        return [
          `"${new Date(log.createdAt).toISOString()}"`,
          `"${log.user?.firstName || 'System'} ${log.user?.lastName || 'Daemon'}"`,
          `"${log.user?.email || 'automated@system'}"`,
          `"${log.user?.role || 'SYSTEM'}"`,
          `"${log.action || ''}"`,
          `"${cat.label}"`,
          `"${log.entity || ''}"`,
          `"${log.entityId || ''}"`,
          `"${log.ipAddress || 'Internal'}"`
        ].join(',');
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `AkwaabaHomes_Audit_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Audit CSV export complete');
    } catch {
      toast.error('Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  }, [logs]);

  // JSON Export
  const handleExportJson = useCallback(() => {
    if (logs.length === 0) {
      toast.error('No audit records to export');
      return;
    }
    setIsExporting(true);
    try {
      const jsonContent = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
      const link = document.createElement('a');
      link.setAttribute('href', jsonContent);
      link.setAttribute('download', `AkwaabaHomes_Audit_Dump_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Forensic JSON dump complete');
    } catch {
      toast.error('Failed to export JSON');
    } finally {
      setIsExporting(false);
    }
  }, [logs]);

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Standard Admin Header */}
      <AdminPageHeader
        title="Audit Logs & Forensic Trail"
        subtitle="Immutable legal ledger logging administrative actions, compliance verifications, sanctions, and mutations under Ghana Data Protection Act (Act 843)."
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Security & Compliance' },
          { label: 'Audit Logs' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                refetch();
                toast.success('Audit ledger synced');
              }}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer shadow-2xs"
            >
              <RotateCw className={clsx('w-3.5 h-3.5', isFetching && 'animate-spin text-emerald-600')} />
              <span>{isFetching ? 'Syncing...' : 'Sync Ledger'}</span>
            </button>
          </div>
        }
      />

      {/* 4 Compact High-Signal Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Events */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Recorded Events</span>
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-zinc-900 dark:text-white">
              {metrics.total.toLocaleString()}
            </span>
            <span className="text-[11px] font-bold text-zinc-500">Immutable Records</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5">Full platform operational trail</p>
        </div>

        {/* Compliance Approvals */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Compliance Approvals</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {metrics.approvals.toLocaleString()}
            </span>
            <span className="text-[11px] font-bold text-emerald-600">Verifications</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5">Ghana Card &amp; Title Deed clearances</p>
        </div>

        {/* Security & Sanctions */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Security &amp; Sanctions</span>
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 border border-red-100 dark:border-red-900/40">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-red-600 dark:text-red-400">
              {metrics.sanctions.toLocaleString()}
            </span>
            <span className="text-[11px] font-bold text-red-600">Enforced</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5">Account locks, suspensions &amp; penalties</p>
        </div>

        {/* Origin Endpoints */}
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Origin IP Endpoints</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 border border-indigo-100 dark:border-indigo-900/40">
              <Globe className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-zinc-900 dark:text-white">
              {metrics.uniqueIps}
            </span>
            <span className="text-[11px] font-bold text-indigo-600">Active Nodes</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5">Monitored client network endpoints</p>
        </div>
      </div>

      {/* Filter, Search & Export Bar */}
      <AuditFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        category={category}
        onCategoryChange={(newCat) => {
          setCategory(newCat);
          setPage(1);
        }}
        entity={entity}
        onEntityChange={(newEnt) => {
          setEntity(newEnt);
          setPage(1);
        }}
        availableEntities={availableEntities}
        dateRange={dateRange}
        onDateRangeChange={(newRange) => {
          setDateRange(newRange);
          setPage(1);
        }}
        isStreaming={isStreaming}
        onToggleStreaming={() => setIsStreaming(!isStreaming)}
        onExportCsv={handleExportCsv}
        onExportJson={handleExportJson}
        isExporting={isExporting}
      />

      {/* Enterprise Data Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs font-bold text-zinc-500">Retrieving immutable audit ledger...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mb-4">
              <Database className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-base text-zinc-900 dark:text-white">No Audit Events Recorded</h4>
            <p className="text-xs text-zinc-500 max-w-md mt-1">
              No audit records match the current filter or date range criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 uppercase text-[10px] tracking-wider font-bold text-zinc-500">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Originating Actor</th>
                  <th className="px-5 py-3.5">Action Executed</th>
                  <th className="px-5 py-3.5">Target Entity</th>
                  <th className="px-5 py-3.5">Origin Network</th>
                  <th className="px-5 py-3.5 text-right">Forensic Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                {logs.map((log) => {
                  const cat = getActionCategory(log.action);
                  const resourceUrl = getEntityRoute(log.entity, log.entityId);

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Timestamp */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-mono text-xs font-bold text-zinc-900 dark:text-white">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{formatRelativeTime(log.createdAt)}</span>
                          <span>&bull;</span>
                          <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-bold text-[10px] shrink-0 border border-zinc-200 dark:border-zinc-700">
                            {(log.user?.firstName?.[0] || 'S') + (log.user?.lastName?.[0] || 'D')}
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                              <span>{log.user?.firstName || 'System'} {log.user?.lastName || 'Daemon'}</span>
                              <AdminStatusBadge status={log.user?.role || 'SYSTEM'} size="sm" />
                            </div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {log.user?.email || 'automated@system'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <AdminStatusBadge status={log.action} variant={cat.variant} size="sm" />
                        </div>
                      </td>

                      {/* Target Entity */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[11px]">
                            {log.entity}
                          </span>
                          <span className="font-mono text-[11px] text-zinc-400">
                            #{log.entityId ? log.entityId.slice(0, 8) : 'GLOBAL'}
                          </span>
                          {resourceUrl && (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(resourceUrl, '_blank');
                              }}
                              className="text-zinc-400 hover:text-emerald-600 transition-colors cursor-pointer p-0.5"
                              title="Open live resource"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Origin IP */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                          <Globe className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{log.ipAddress || '127.0.0.1 (Loopback)'}</span>
                          {log.ipAddress && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyIp(log.ipAddress || '');
                              }}
                              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-0.5"
                              title="Copy IP"
                            >
                              {copiedIp === log.ipAddress ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Inspect Action */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-900 hover:text-white dark:hover:bg-white dark:hover:text-zinc-900 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination & Ledger Stats Footer */}
        <div className="p-4 bg-zinc-50 dark:bg-zinc-950/80 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span>
              Showing {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total.toLocaleString()} entries
            </span>
            <span>&bull;</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2 py-1 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1 || isLoading}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <span className="px-2 font-mono font-bold text-zinc-700 dark:text-zinc-300">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
              disabled={page >= pagination.totalPages || isLoading}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over Deep Forensic Inspection Drawer */}
      <AuditDetailDrawer
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </div>
  );
}
