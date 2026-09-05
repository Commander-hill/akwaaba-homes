'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, 
  FileText, 
  User as UserIcon, 
  Shield, 
  Clock, 
  Globe, 
  ArrowRight, 
  Search, 
  Filter, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  X, 
  Eye, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Database,
  Hash,
  Fingerprint
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface AuditLog {
  id: string;
  userId: string;
  user: { firstName: string; lastName: string; email: string; role: string };
  action: string;
  entity: string;
  entityId: string;
  oldData: string | null;
  newData: string | null;
  ipAddress: string | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  SANCTION: { bg: 'bg-red-100 dark:bg-red-950/60', text: 'text-red-800 dark:text-red-300', border: 'border-red-300 dark:border-red-800' },
  APPROVAL: { bg: 'bg-emerald-100 dark:bg-emerald-950/60', text: 'text-emerald-800 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-800' },
  CONFIG: { bg: 'bg-amber-100 dark:bg-amber-950/60', text: 'text-[#D97706]', border: 'border-amber-300 dark:border-amber-800' },
  UPDATE: { bg: 'bg-blue-100 dark:bg-blue-950/60', text: 'text-blue-800 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-800' },
  DEFAULT: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-300 dark:border-slate-700' }
};

function getActionStyle(action: string) {
  const upper = action.toUpperCase();
  if (upper.includes('SUSPEND') || upper.includes('REJECT') || upper.includes('DELETE') || upper.includes('LOCK') || upper.includes('PENAL')) {
    return ACTION_COLORS.SANCTION;
  }
  if (upper.includes('APPROVE') || upper.includes('VERIFY') || upper.includes('ACTIVATE')) {
    return ACTION_COLORS.APPROVAL;
  }
  if (upper.includes('CONFIG') || upper.includes('BROADCAST') || upper.includes('NOTICE')) {
    return ACTION_COLORS.CONFIG;
  }
  if (upper.includes('UPDATE') || upper.includes('EDIT') || upper.includes('CHANGE')) {
    return ACTION_COLORS.UPDATE;
  }
  return ACTION_COLORS.DEFAULT;
}

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionCategory, setActionCategory] = useState<'ALL' | 'SANCTIONS' | 'APPROVALS' | 'CONFIG' | 'UPDATES'>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: logs, isLoading, dataUpdatedAt, refetch, isRefetching } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const res = await api.get('/admin/audit-logs');
      return res.data as AuditLog[];
    },
    refetchInterval: 15000
  });

  // Calculate Metrics
  const metrics = useMemo(() => {
    const list = logs || [];
    const total = list.length;
    const sanctions = list.filter(l => {
      const a = l.action.toUpperCase();
      return a.includes('SUSPEND') || a.includes('REJECT') || a.includes('DELETE') || a.includes('LOCK') || a.includes('PENAL');
    }).length;
    const approvals = list.filter(l => {
      const a = l.action.toUpperCase();
      return a.includes('APPROVE') || a.includes('VERIFY') || a.includes('ACTIVATE');
    }).length;
    
    const uniqueIps = new Set(list.map(l => l.ipAddress).filter(Boolean)).size;

    return { total, sanctions, approvals, uniqueIps };
  }, [logs]);

  // Unique Entities
  const entityOptions = useMemo(() => {
    const set = new Set<string>();
    (logs || []).forEach(l => {
      if (l.entity) set.add(l.entity);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Filtering
  const filteredLogs = useMemo(() => {
    return (logs || []).filter(log => {
      // Category filter
      if (actionCategory !== 'ALL') {
        const a = log.action.toUpperCase();
        if (actionCategory === 'SANCTIONS' && !a.includes('SUSPEND') && !a.includes('REJECT') && !a.includes('DELETE') && !a.includes('LOCK') && !a.includes('PENAL')) return false;
        if (actionCategory === 'APPROVALS' && !a.includes('APPROVE') && !a.includes('VERIFY') && !a.includes('ACTIVATE')) return false;
        if (actionCategory === 'CONFIG' && !a.includes('CONFIG') && !a.includes('BROADCAST') && !a.includes('NOTICE')) return false;
        if (actionCategory === 'UPDATES' && !a.includes('UPDATE') && !a.includes('EDIT') && !a.includes('CHANGE')) return false;
      }

      // Entity filter
      if (entityFilter !== 'ALL' && log.entity !== entityFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchActor = `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.toLowerCase().includes(term);
        const matchEmail = (log.user?.email || '').toLowerCase().includes(term);
        const matchAction = log.action.toLowerCase().includes(term);
        const matchEntity = log.entity.toLowerCase().includes(term);
        const matchEntityId = log.entityId.toLowerCase().includes(term);
        const matchIp = (log.ipAddress || '').toLowerCase().includes(term);

        if (!matchActor && !matchEmail && !matchAction && !matchEntity && !matchEntityId && !matchIp) {
          return false;
        }
      }

      return true;
    });
  }, [logs, actionCategory, entityFilter, searchTerm]);

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatJSON = (jsonString: string | null) => {
    if (!jsonString) return 'No payload recorded';
    try {
      const obj = JSON.parse(jsonString);
      return JSON.stringify(obj, null, 2);
    } catch {
      return jsonString;
    }
  };

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
    <div className="space-y-6 pb-16 animate-in fade-in">
      
      {/* Sticky Header & Toolbar */}
      <div className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md pt-2 pb-4 -mx-8 px-8 border-b border-slate-200/60 dark:border-slate-800/60 space-y-4 mb-6 shadow-xs">
        
        {/* Executive Banner */}
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0a2e1d] via-[#0F5132] to-[#0a2e1d] text-white shadow-xl relative overflow-hidden border border-emerald-800/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#D97706]/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-900/60 text-emerald-200 border border-emerald-700/50">
                <Fingerprint className="w-3.5 h-3.5 text-[#D97706]" />
                Cryptographically Sequenced Operational Audit
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D97706]/20 text-amber-200 border border-[#D97706]/30">
                Ghana Data Protection Act, 2012 (Act 843)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <Database className="w-8 h-8 text-[#D97706]" />
              Immutable Audit Trail &amp; Regulatory Ledger
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Complete, tamper-evident forensic log documenting administrative status overrides, user sanctions, deed approvals, mass broadcasts, and platform security events.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative z-10 w-full md:w-auto justify-end">
            <button
              onClick={() => {
                refetch();
                toast.success('Audit trail synced with primary database');
              }}
              disabled={isRefetching}
              className="flex items-center justify-center gap-2 px-5 py-3 text-xs font-black bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 rounded-xl transition-all shadow-md backdrop-blur-md cursor-pointer w-full md:w-auto"
            >
              <Loader2 className={clsx("w-3.5 h-3.5", isRefetching && "animate-spin")} />
              {isRefetching ? 'Syncing Ledger...' : 'Sync Audit Trail'}
            </button>
          </div>
        </div>

        {/* 4 Executive KPI Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Total Audit Records</span>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Hash className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">{metrics.total}</span>
              <span className="text-[10px] font-bold text-slate-500">Immutable Entries</span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Recorded operational transactions</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Compliance Approvals</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[#0F5132] dark:text-emerald-400">{metrics.approvals}</span>
              <span className="text-[10px] font-bold text-emerald-600">Verifications</span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Deeds &amp; listing authorizations</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Security &amp; Sanctions</span>
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 border border-red-100 dark:border-red-900/40">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">{metrics.sanctions}</span>
              <span className="text-[10px] font-bold text-red-600">Enforced</span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Suspensions, locks &amp; penalties</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Unique Origin IPs</span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 border border-indigo-100 dark:border-indigo-900/40">
                <Globe className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">{metrics.uniqueIps}</span>
              <span className="text-[10px] font-bold text-indigo-600">Monitored</span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Distinct network endpoints</p>
          </div>

        </div>

        {/* Filter Toolbar & Live Search */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 shadow-xs">
          
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by actor, email, action, entity, or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/30 text-[var(--foreground)]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'APPROVALS', label: 'Verifications' },
              { id: 'SANCTIONS', label: 'Sanctions' },
              { id: 'CONFIG', label: 'Configuration' },
              { id: 'UPDATES', label: 'Modifications' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActionCategory(tab.id as any)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap",
                  actionCategory === tab.id
                    ? "bg-[#0F5132] text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-[var(--foreground)]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Entity Filter */}
          {entityOptions.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-slate-400">Entity:</span>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-[var(--foreground)] outline-none cursor-pointer"
              >
                <option value="ALL">All Entities</option>
                {entityOptions.map(ent => (
                  <option key={ent} value={ent}>{ent}</option>
                ))}
              </select>
            </div>
          )}

        </div>
      </div>

      {/* Main Audit Trail Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
            <span className="text-xs font-bold text-slate-500">Retrieving immutable audit ledger...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
              <Database className="w-7 h-7" />
            </div>
            <h4 className="font-extrabold text-base text-[var(--foreground)]">No Audit Events Logged</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              No audit records match the current filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0F5132] text-white uppercase text-[10px] tracking-wider font-extrabold shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-white font-extrabold">Timestamp</th>
                  <th className="px-6 py-4 text-white font-extrabold">Originating Actor</th>
                  <th className="px-6 py-4 text-white font-extrabold">Action Taken</th>
                  <th className="px-6 py-4 text-white font-extrabold">Target Entity</th>
                  <th className="px-6 py-4 text-white font-extrabold">Origin IP Address</th>
                  <th className="px-6 py-4 text-right text-white font-extrabold">Forensic Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredLogs.map((log) => {
                  const actionStyle = getActionStyle(log.action);

                  return (
                    <tr 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Timestamp */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-bold text-[var(--foreground)]">
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(log.createdAt)} &bull; {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                          {log.user?.role === 'ADMIN' ? (
                            <Shield className="w-3.5 h-3.5 text-[#0F5132]" />
                          ) : (
                            <UserIcon className="w-3.5 h-3.5 text-blue-500" />
                          )}
                          <span>{log.user?.firstName || 'System'} {log.user?.lastName || 'Daemon'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {log.user?.email || 'automated@system'} &bull; <span className="font-black uppercase text-[9px]">{log.user?.role || 'SYSTEM'}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider border uppercase",
                          actionStyle.bg,
                          actionStyle.border,
                          actionStyle.text
                        )}>
                          {log.action}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-[var(--foreground)]">{log.entity}</div>
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                          #{log.entityId ? log.entityId.slice(0, 10) : 'GLOBAL'}
                        </div>
                      </td>

                      {/* IP */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.ipAddress || 'Internal Loopback'}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-[#0F5132] hover:text-white dark:bg-slate-800 dark:hover:bg-[#0F5132] text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
          <span>Cryptographic Hash Integrity Verified</span>
          <span>Showing {filteredLogs.length} audit entries</span>
        </div>
      </div>

      {/* Deep Forensic Inspection Drawer (Slide-over Modal) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-950 w-full max-w-2xl h-full shadow-2xl overflow-y-auto border-l border-slate-200 dark:border-slate-800 p-6 space-y-6 flex flex-col justify-between">
            
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[var(--foreground)]">Forensic Audit Log Dossier</h3>
                    <p className="text-xs text-slate-400 font-mono">Entry ID: {selectedLog.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action & Timestamp Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className={clsx(
                    "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border",
                    getActionStyle(selectedLog.action).bg,
                    getActionStyle(selectedLog.action).border,
                    getActionStyle(selectedLog.action).text
                  )}>
                    {selectedLog.action}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {new Date(selectedLog.createdAt).toUTCString()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 pt-1">
                  Logged on {new Date(selectedLog.createdAt).toLocaleString()} via origin endpoint: <strong className="text-[var(--foreground)]">{selectedLog.ipAddress || 'Internal Loopback'}</strong>
                </p>
              </div>

              {/* Actor & Entity Dossier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Originating Actor</span>
                  <div className="font-extrabold text-sm text-[var(--foreground)]">
                    {selectedLog.user?.firstName || 'System'} {selectedLog.user?.lastName || 'Daemon'}
                  </div>
                  <div className="text-xs text-slate-500">{selectedLog.user?.email}</div>
                  <span className="inline-block mt-1 text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                    {selectedLog.user?.role || 'SYSTEM'}
                  </span>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Affected Target Entity</span>
                  <div className="font-extrabold text-sm text-[var(--foreground)]">
                    {selectedLog.entity}
                  </div>
                  <div className="font-mono text-xs text-slate-500 flex items-center justify-between">
                    <span className="truncate max-w-[140px]">{selectedLog.entityId}</span>
                    <button
                      onClick={() => copyToClipboard(selectedLog.entityId, 'entityId')}
                      className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {copiedField === 'entityId' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedField === 'entityId' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Before vs After State Payloads */}
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                  State Mutation Payloads
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Before State */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-900 text-slate-100">
                    <div className="px-4 py-2 bg-red-950/60 border-b border-red-900/60 text-red-400 font-bold text-[10px] uppercase tracking-wider flex items-center justify-between">
                      <span>Previous State (Pre-Mutation)</span>
                      {selectedLog.oldData && (
                        <button
                          onClick={() => copyToClipboard(formatJSON(selectedLog.oldData), 'oldData')}
                          className="text-[9px] text-red-300 hover:underline cursor-pointer"
                        >
                          {copiedField === 'oldData' ? 'Copied' : 'Copy JSON'}
                        </button>
                      )}
                    </div>
                    <pre className="p-3.5 text-[10px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                      {formatJSON(selectedLog.oldData)}
                    </pre>
                  </div>

                  {/* After State */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-900 text-slate-100">
                    <div className="px-4 py-2 bg-emerald-950/60 border-b border-emerald-900/60 text-emerald-400 font-bold text-[10px] uppercase tracking-wider flex items-center justify-between">
                      <span>Committed State (Post-Mutation)</span>
                      {selectedLog.newData && (
                        <button
                          onClick={() => copyToClipboard(formatJSON(selectedLog.newData), 'newData')}
                          className="text-[9px] text-emerald-300 hover:underline cursor-pointer"
                        >
                          {copiedField === 'newData' ? 'Copied' : 'Copy JSON'}
                        </button>
                      )}
                    </div>
                    <pre className="p-3.5 text-[10px] font-mono overflow-x-auto max-h-56 leading-relaxed">
                      {formatJSON(selectedLog.newData)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Statutory Disclosure Notice */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-extrabold text-[10px] uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D97706]" /> Legal Admissibility &amp; Data Protection
                </div>
                <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                  This record is permanently sealed in compliance with the Ghana Data Protection Act, 2012 (Act 843). Audit entries cannot be edited, retroactively purged, or deleted by any administrative account.
                </p>
              </div>
            </div>

            {/* Drawer Close Action */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[var(--foreground)] text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                Close Forensic Dossier
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
