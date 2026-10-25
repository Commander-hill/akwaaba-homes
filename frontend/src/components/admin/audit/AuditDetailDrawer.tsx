'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  X, 
  Database, 
  ExternalLink, 
  Copy, 
  Check, 
  Globe, 
  Clock, 
  User as UserIcon, 
  ShieldCheck, 
  Scale, 
  Fingerprint,
  ArrowRight,
  FileCode
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AuditDiffViewer from './AuditDiffViewer';

export interface AuditLogItem {
  id: string;
  userId: string;
  user: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  action: string;
  entity: string;
  entityId: string;
  oldData: string | null;
  newData: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditDetailDrawerProps {
  log: AuditLogItem | null;
  onClose: () => void;
}

export function getEntityRoute(entity: string, entityId: string): string | null {
  if (!entity || !entityId || entityId === 'SYSTEM' || entityId === 'GLOBAL') return null;
  const upper = entity.toUpperCase().replace(/[\s_-]/g, '');

  if (upper.includes('PROPERTY')) return `/admin/properties/${entityId}`;
  if (upper.includes('DEED') || upper.includes('TITLE')) return `/admin/deeds/${entityId}`;
  if (upper.includes('BOOKING')) return `/admin/bookings/${entityId}`;
  if (upper.includes('DISPUTE')) return `/admin/disputes/${entityId}`;
  if (upper.includes('TICKET') || upper.includes('MAINTENANCE')) return `/admin/tickets/${entityId}`;
  if (upper.includes('VERIFICATION') || upper.includes('GHANACARD')) return `/admin/verifications/${entityId}`;
  if (upper.includes('TRANSACTION') || upper.includes('PAYMENT')) return `/admin/transactions/${entityId}`;
  if (upper.includes('REVIEW')) return `/admin/reviews/${entityId}`;
  if (upper.includes('USER') || upper.includes('TENANT') || upper.includes('LANDLORD')) return `/admin/users`;
  return null;
}

export function getActionCategory(action: string): { label: string; variant: 'danger' | 'success' | 'warning' | 'info' | 'neutral' } {
  const upper = (action || '').toUpperCase();
  if (upper.includes('SUSPEND') || upper.includes('REJECT') || upper.includes('DELETE') || upper.includes('LOCK') || upper.includes('PENAL') || upper.includes('STRIKE')) {
    return { label: 'SANCTION / ENFORCEMENT', variant: 'danger' };
  }
  if (upper.includes('APPROVE') || upper.includes('VERIF') || upper.includes('ACTIVATE') || upper.includes('ACCEPT')) {
    return { label: 'REGULATORY APPROVAL', variant: 'success' };
  }
  if (upper.includes('PAY') || upper.includes('REFUND') || upper.includes('DISBURSE') || upper.includes('ESCROW')) {
    return { label: 'FINANCIAL SETTLEMENT', variant: 'info' };
  }
  if (upper.includes('CONFIG') || upper.includes('BROADCAST') || upper.includes('NOTICE') || upper.includes('SETTING')) {
    return { label: 'PLATFORM CONFIGURATION', variant: 'warning' };
  }
  if (upper.includes('UPDATE') || upper.includes('EDIT') || upper.includes('CHANGE')) {
    return { label: 'STATE MODIFICATION', variant: 'neutral' };
  }
  return { label: 'OPERATIONAL EVENT', variant: 'neutral' };
}

export default function AuditDetailDrawer({ log, onClose }: AuditDetailDrawerProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!log) return null;

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const actionCategory = getActionCategory(log.action);
  const resourceUrl = getEntityRoute(log.entity, log.entityId);
  const formattedDate = new Date(log.createdAt).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-zinc-950 w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-zinc-200 dark:border-zinc-800"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/70 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white flex items-center justify-center font-bold">
              <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-900 dark:text-white">Forensic Audit Dossier</h3>
                <AdminStatusBadge status={actionCategory.label} variant={actionCategory.variant} size="sm" />
              </div>
              <p className="text-[11px] font-mono text-zinc-500 mt-0.5 flex items-center gap-1.5">
                <span>UUID: {log.id}</span>
                <button
                  onClick={() => handleCopy(log.id, 'dossierId')}
                  className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                  title="Copy Entry ID"
                >
                  {copiedKey === 'dossierId' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                </button>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Action & Verification Overview */}
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
                  {log.action}
                </span>
                <span className="text-xs text-zinc-500">on target</span>
                <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 underline decoration-zinc-300 dark:decoration-zinc-700">
                  {log.entity}
                </span>
              </div>
              <div className="text-xs font-mono text-zinc-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Actor & Affected Resource Dossier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Originating Actor */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <UserIcon className="w-3 h-3 text-zinc-400" />
                Originating Administrator
              </span>
              <div className="space-y-0.5">
                <div className="font-bold text-sm text-zinc-900 dark:text-white">
                  {log.user?.firstName || 'System'} {log.user?.lastName || 'Daemon'}
                </div>
                <div className="text-xs text-zinc-500 truncate">{log.user?.email || 'automated@system'}</div>
              </div>
              <div className="pt-1 flex items-center gap-2">
                <AdminStatusBadge status={log.user?.role || 'SYSTEM'} size="sm" />
                {log.userId && (
                  <button
                    onClick={() => handleCopy(log.userId, 'actorUserId')}
                    className="text-[10px] font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'actorUserId' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Actor ID</span>
                  </button>
                )}
              </div>
            </div>

            {/* Target Resource */}
            <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Fingerprint className="w-3 h-3 text-zinc-400" />
                Target Entity Reference
              </span>
              <div className="space-y-0.5">
                <div className="font-bold text-sm text-zinc-900 dark:text-white">
                  {log.entity}
                </div>
                <div className="font-mono text-xs text-zinc-500 flex items-center gap-1.5">
                  <span className="truncate max-w-[130px]">{log.entityId}</span>
                  <button
                    onClick={() => handleCopy(log.entityId, 'targetId')}
                    className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                    title="Copy entity ID"
                  >
                    {copiedKey === 'targetId' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              <div className="pt-1">
                {resourceUrl ? (
                  <Link
                    href={resourceUrl}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    <span>Open Live Record</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                ) : (
                  <span className="text-[11px] text-zinc-400 italic">No direct URL for global resource</span>
                )}
              </div>
            </div>
          </div>

          {/* Network & Origin Telemetry */}
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-zinc-400" />
              Network Origin Endpoint
            </span>
            <div className="flex items-center justify-between font-mono text-xs bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <span className="text-zinc-900 dark:text-zinc-100 font-bold">
                {log.ipAddress || 'Internal Service Loopback (127.0.0.1)'}
              </span>
              {log.ipAddress && (
                <button
                  onClick={() => handleCopy(log.ipAddress || '', 'ipAddr')}
                  className="text-xs font-sans font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'ipAddr' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'ipAddr' ? 'Copied' : 'Copy IP'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Forensic State Mutation Diff */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-zinc-400" />
              State Mutation Payload (Before vs. After)
            </span>
            <AuditDiffViewer oldData={log.oldData} newData={log.newData} />
          </div>

          {/* Statutory Disclosure Notice */}
          <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-bold text-[11px] uppercase tracking-wider">
              <Scale className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              Statutory Retention &amp; Integrity Compliance
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300/80 leading-relaxed">
              This entry is recorded in accordance with the <strong>Ghana Data Protection Act, 2012 (Act 843)</strong>. Operational audit logs cannot be modified, retroactively edited, or purged by any administrative credential.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-50/70 dark:bg-zinc-900/50">
          <span className="text-[11px] text-zinc-500">Forensic record locked</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold transition-all cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
}
