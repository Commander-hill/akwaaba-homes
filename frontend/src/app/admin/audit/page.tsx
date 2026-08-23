'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, FileText, User as UserIcon, Shield, Clock, Globe, ArrowRight } from 'lucide-react';
import React, { useState } from 'react';

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

export default function AuditLogsPage() {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const res = await api.get('/admin/audit-logs');
      return res.data as AuditLog[];
    }
  });

  const getActionColor = (action: string) => {
    if (action.includes('SUSPEND') || action.includes('REJECT') || action.includes('DELETE')) return 'text-red-500 bg-red-50 dark:bg-red-900/20';
    if (action.includes('APPROVE') || action.includes('VERIFY')) return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
    if (action.includes('UPDATE')) return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
    return 'text-slate-500 bg-slate-50 dark:bg-slate-800';
  };

  const formatJSON = (jsonString: string | null) => {
    if (!jsonString) return 'No data';
    try {
      const obj = JSON.parse(jsonString);
      return JSON.stringify(obj, null, 2);
    } catch {
      return jsonString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Immutable Audit Trail</h1>
        <p className="text-[var(--muted-foreground)] mt-2">Comprehensive logging of critical administrative and landlord actions.</p>
      </div>

      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#E06D53] uppercase text-[10px] tracking-wider font-extrabold text-white shadow-md">
              <tr>
                <th className="px-6 py-4 text-white font-extrabold">Timestamp</th>
                <th className="px-6 py-4 text-white font-extrabold">Actor</th>
                <th className="px-6 py-4 text-white font-extrabold">Action</th>
                <th className="px-6 py-4 text-white font-extrabold">Target Entity</th>
                <th className="px-6 py-4 text-white font-extrabold">IP Address</th>
                <th className="px-6 py-4 text-right text-white font-extrabold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {logs?.map((log) => (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                        <Clock className="w-4 h-4" />
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold flex items-center gap-2">
                        {log.user.role === 'ADMIN' ? <Shield className="w-4 h-4 text-emerald-500" /> : <UserIcon className="w-4 h-4 text-blue-500" />}
                        {log.user.firstName} {log.user.lastName}
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)]">{log.user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{log.entity}</div>
                      <div className="text-xs text-[var(--muted-foreground)] font-mono">{log.entityId.substring(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-[var(--muted-foreground)] text-xs">
                        <Globe className="w-3.5 h-3.5" />
                        {log.ipAddress}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        className="text-[var(--primary)] hover:underline font-medium text-sm flex items-center gap-1 justify-end w-full"
                      >
                        <FileText className="w-4 h-4" /> Payload
                      </button>
                    </td>
                  </tr>
                  {expandedLogId === log.id && (
                    <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border)]">
                      <td colSpan={6} className="px-6 py-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-white dark:bg-slate-950 border border-[var(--border)] rounded-xl overflow-hidden shadow-inner">
                            <div className="px-4 py-2 border-b border-[var(--border)] bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider flex items-center justify-between">
                              Before State
                            </div>
                            <pre className="p-4 text-xs font-mono text-slate-600 dark:text-slate-300 overflow-x-auto">
                              {formatJSON(log.oldData)}
                            </pre>
                          </div>
                          
                          <div className="bg-white dark:bg-slate-950 border border-[var(--border)] rounded-xl overflow-hidden shadow-inner relative">
                            <div className="absolute top-1/2 -left-4 w-8 h-8 -mt-4 bg-slate-100 dark:bg-slate-800 rounded-full border border-[var(--border)] flex items-center justify-center hidden md:flex z-10 shadow-sm">
                              <ArrowRight className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="px-4 py-2 border-b border-[var(--border)] bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider flex items-center justify-between">
                              After State
                            </div>
                            <pre className="p-4 text-xs font-mono text-slate-600 dark:text-slate-300 overflow-x-auto">
                              {formatJSON(log.newData)}
                            </pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              
              {logs?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--muted-foreground)]">
                    No audit logs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
