'use client';

import React from 'react';
import { 
  X, 
  RotateCcw, 
  Clock, 
  Users, 
  Building2, 
  Globe, 
  ShieldCheck, 
  CheckCircle2, 
  Radio, 
  Mail, 
  BellRing,
  FileText,
  UserCheck
} from 'lucide-react';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';

export interface BroadcastRecord {
  id: string;
  title: string;
  message: string;
  target: 'ALL_TENANTS' | 'ALL_LANDLORDS' | 'ALL_USERS';
  count: number;
  category?: string;
  priority?: string;
  channels?: ('IN_APP' | 'SOCKET' | 'EMAIL')[];
  dispatchedBy: string;
  createdAt: string;
}

interface BroadcastDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  record: BroadcastRecord | null;
  onClone?: (record: BroadcastRecord) => void;
}

export default function BroadcastDetailDrawer({
  isOpen,
  onClose,
  record,
  onClone
}: BroadcastDetailDrawerProps) {
  if (!isOpen || !record) return null;

  const targetLabel = 
    record.target === 'ALL_TENANTS' ? 'Tenants & Students' :
    record.target === 'ALL_LANDLORDS' ? 'Landlords & Property Managers' :
    'Entire Network (All Users)';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col z-10 overflow-hidden border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Broadcast Dispatch Details
            </span>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white truncate max-w-md">
              {record.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Section: Headline & Full Message */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                Transmitted Announcement Copy
              </span>
              {record.category && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                  {record.category.replace('_', ' ')}
                </span>
              )}
            </div>

            <h3 className="text-sm font-bold text-zinc-900 dark:text-white leading-snug">
              {record.title}
            </h3>

            <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200/60 dark:border-zinc-800">
              {record.message}
            </div>
          </div>

          {/* Section: Audience & Delivery Reach */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
              Audience &amp; Transmission Summary
            </span>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                <span className="text-zinc-400 text-[10px] uppercase font-bold block mb-1">Target Segment</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {targetLabel}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                <span className="text-zinc-400 text-[10px] uppercase font-bold block mb-1">Delivered Recipients</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{record.count} User Accounts</span>
                </span>
              </div>
            </div>

            {/* Channels used */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Delivery Channels Utilized
              </span>
              <div className="flex flex-wrap gap-2">
                {(record.channels || ['IN_APP', 'SOCKET']).map((ch) => (
                  <span
                    key={ch}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                  >
                    {ch === 'IN_APP' && <BellRing className="w-3.5 h-3.5 text-blue-500" />}
                    {ch === 'SOCKET' && <Radio className="w-3.5 h-3.5 text-emerald-500" />}
                    {ch === 'EMAIL' && <Mail className="w-3.5 h-3.5 text-amber-500" />}
                    <span>{ch === 'IN_APP' ? 'In-App Feed' : ch === 'SOCKET' ? 'Socket.IO Push' : 'Institutional Email'}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Section: Dispatch Officer & Audit Info */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2.5 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 block">
              Audit Ledger Records
            </span>

            <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Admin Dispatch Officer:</span>
              <span className="font-semibold text-zinc-900 dark:text-white">
                {record.dispatchedBy || 'System Administrator'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-zinc-500">Dispatch Timestamp:</span>
              <span className="font-mono text-zinc-900 dark:text-white">
                {new Date(record.createdAt).toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-zinc-500">Audit Action Key:</span>
              <span className="font-mono text-[11px] text-zinc-400">
                ADMIN_BROADCAST_NOTIFICATION
              </span>
            </div>
          </div>

        </div>

        {/* Drawer Fixed Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
          >
            Close
          </button>

          {onClone && (
            <button
              type="button"
              onClick={() => {
                onClone(record);
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clone into Composer</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
