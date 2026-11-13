'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import {
  RotateCw,
  AlertOctagon,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Eye,
  Copy,
  Check,
  X,
  Server,
  Code
} from 'lucide-react';
import clsx from 'clsx';

interface DLQItem {
  id: string;
  source: string;
  provider: string;
  event: string;
  reference: string;
  failureReason: string;
  retryCount: number;
  status: string;
  payload: any;
  createdAt: string;
  updatedAt: string;
}

interface DLQResponse {
  items: DLQItem[];
  stats: {
    totalDropped: number;
    pendingRetries: number;
    resolved: number;
  };
}

export function WebhookDLQViewer() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectItem, setInspectItem] = useState<DLQItem | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Fetch DLQ entries
  const { data, isLoading, isFetching, refetch } = useQuery<DLQResponse>({
    queryKey: ['admin-webhook-dlq'],
    queryFn: async () => {
      const res = await api.get('/admin/webhooks/dlq');
      return res.data?.data || res.data;
    },
    refetchInterval: 20000 // Poll every 20s for new dropped events
  });

  // Retry Mutation
  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      setRetryingId(id);
      const res = await api.post(`/admin/webhooks/dlq/${id}/retry`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData?.message || 'Webhook re-delivered and processed successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-webhook-dlq'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      if (inspectItem && inspectItem.id === retryingId) {
        setInspectItem(null);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to retry webhook delivery');
    },
    onSettled: () => {
      setRetryingId(null);
    }
  });

  const handleCopyPayload = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedPayload(true);
    toast.success('Payload copied to clipboard');
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const filteredItems = (data?.items || []).filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.reference?.toLowerCase().includes(term) ||
      item.event?.toLowerCase().includes(term) ||
      item.provider?.toLowerCase().includes(term) ||
      item.failureReason?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* DLQ Telemetry Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Dropped Webhooks</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/40">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-zinc-900 dark:text-white">
              {data?.stats?.totalDropped || 0}
            </span>
            <span className="text-[11px] font-bold text-amber-600">DLQ Ingestion</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5">Unacknowledged or failed external hooks</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Awaiting Manual Re-Drive</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/40">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {data?.stats?.pendingRetries || 0}
            </span>
            <span className="text-[11px] font-bold text-rose-500">Unresolved</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5">Queued for operator review or redelivery</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Resolved Webhooks</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/40">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {data?.stats?.resolved || 0}
            </span>
            <span className="text-[11px] font-bold text-emerald-600">Reconciled</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5">Successfully dispatched via manual retry</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by event, reference, or reason..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-[#04793d]/30 focus:border-[#04793d]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetch();
              toast.success('DLQ refreshed');
            }}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition cursor-pointer shadow-2xs"
          >
            <RotateCw className={clsx('w-3.5 h-3.5', isFetching && 'animate-spin text-emerald-600')} />
            <span>{isFetching ? 'Refreshing...' : 'Refresh DLQ'}</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-[#04793d]" />
              Dead Letter Queue (DLQ) Deliveries
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Dropped, failed HMAC signature, or non-200 webhook payloads preserved for forensic inspection and manual re-drive.
            </p>
          </div>
          <span className="text-xs font-bold text-zinc-400">
            {filteredItems.length} records
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-xs text-zinc-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#04793d]" />
            Loading dead letter queue...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <div className="font-bold text-zinc-800 dark:text-zinc-200">No dropped webhooks in Dead Letter Queue</div>
            <div className="text-zinc-400 mt-1">All gateway incoming requests have been successfully processed.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Provider / Channel</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Target Reference</th>
                  <th className="py-3 px-4">Failure Reason</th>
                  <th className="py-3 px-4">Retries</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Captured At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition"
                  >
                    <td className="py-3.5 px-4">
                      <span className={clsx(
                        'px-2 py-0.5 rounded-md font-bold text-[10px] tracking-wide inline-block uppercase',
                        item.provider === 'PAYSTACK'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40'
                          : item.provider === 'TELCO'
                          ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      )}>
                        {item.provider}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {item.event}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-600 dark:text-zinc-400">
                      {item.reference}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-rose-600 dark:text-rose-400" title={item.failureReason}>
                      {item.failureReason}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-zinc-700 dark:text-zinc-300">
                      {item.retryCount}x
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={clsx(
                        'px-2 py-0.5 rounded-full font-bold text-[10px]',
                        item.status === 'RESOLVED'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200'
                          : item.status === 'RETRIED'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200'
                      )}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-zinc-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectItem(item)}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition cursor-pointer flex items-center gap-1"
                          title="Inspect raw payload JSON"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Payload</span>
                        </button>

                        <button
                          type="button"
                          disabled={retryingId === item.id || item.status === 'RESOLVED'}
                          onClick={() => retryMutation.mutate(item.id)}
                          className={clsx(
                            'px-2.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs',
                            item.status === 'RESOLVED'
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700 cursor-not-allowed'
                              : 'bg-[#16A34A] hover:bg-[#15803D] text-white'
                          )}
                          title="1-Click Retry Webhook Delivery"
                        >
                          <RefreshCw className={clsx('w-3.5 h-3.5', retryingId === item.id && 'animate-spin')} />
                          <span>{retryingId === item.id ? 'Replaying...' : item.status === 'RESOLVED' ? 'Replayed' : 'Retry'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Payload Modal */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-[#04793d]" />
                <h3 className="font-bold text-sm text-zinc-950 dark:text-white">
                  Inspect DLQ Payload: <span className="font-mono text-xs text-zinc-500">{inspectItem.reference}</span>
                </h3>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-zinc-950 text-zinc-100 font-mono text-xs">
              <div className="text-[11px] text-zinc-400 border-b border-zinc-800 pb-2 flex items-center justify-between">
                <span>EVENT: {inspectItem.event}</span>
                <span>FAIL REASON: {inspectItem.failureReason}</span>
              </div>
              <pre className="whitespace-pre-wrap break-all leading-relaxed text-[11px] text-emerald-400">
                {JSON.stringify(inspectItem.payload, null, 2)}
              </pre>
            </div>

            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleCopyPayload(inspectItem.payload)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-zinc-800 dark:text-zinc-200 transition cursor-pointer"
              >
                {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPayload ? 'Copied' : 'Copy Payload'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInspectItem(null)}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-100 text-zinc-700 dark:text-zinc-300 transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={retryingId === inspectItem.id || inspectItem.status === 'RESOLVED'}
                  onClick={() => retryMutation.mutate(inspectItem.id)}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white shadow-xs transition"
                >
                  <RefreshCw className={clsx('w-3.5 h-3.5', retryingId === inspectItem.id && 'animate-spin')} />
                  <span>Retry Webhook Delivery</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
