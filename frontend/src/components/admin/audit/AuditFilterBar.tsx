'use client';

import React from 'react';
import { Search, X, Download, Filter, Radio, Pause, Play, Calendar } from 'lucide-react';
import clsx from 'clsx';

export type AuditCategory = 'ALL' | 'VERIFICATIONS' | 'SANCTIONS' | 'FINANCIAL' | 'CONFIG' | 'UPDATES';

export type AuditDateRange = 'ALL' | 'TODAY' | '7D' | '30D';

interface AuditFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  category: AuditCategory;
  onCategoryChange: (cat: AuditCategory) => void;
  entity: string;
  onEntityChange: (entity: string) => void;
  availableEntities: string[];
  dateRange: AuditDateRange;
  onDateRangeChange: (range: AuditDateRange) => void;
  isStreaming: boolean;
  onToggleStreaming: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  isExporting?: boolean;
}

const CATEGORY_TABS: { id: AuditCategory; label: string }[] = [
  { id: 'ALL', label: 'All Records' },
  { id: 'VERIFICATIONS', label: 'Approvals & KYC' },
  { id: 'SANCTIONS', label: 'Sanctions & Locks' },
  { id: 'FINANCIAL', label: 'Settlements & Payouts' },
  { id: 'CONFIG', label: 'Configuration' },
  { id: 'UPDATES', label: 'State Updates' }
];

const DATE_PRESETS: { id: AuditDateRange; label: string }[] = [
  { id: 'ALL', label: 'All Time' },
  { id: 'TODAY', label: 'Today' },
  { id: '7D', label: 'Past 7 Days' },
  { id: '30D', label: 'Past 30 Days' }
];

export default function AuditFilterBar({
  searchTerm,
  onSearchChange,
  category,
  onCategoryChange,
  entity,
  onEntityChange,
  availableEntities,
  dateRange,
  onDateRangeChange,
  isStreaming,
  onToggleStreaming,
  onExportCsv,
  onExportJson,
  isExporting = false
}: AuditFilterBarProps) {
  return (
    <div className="space-y-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
      {/* Top Row: Search, Entity Filter, Date Range, Stream Toggle, and Export */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by actor, email, action verb, entity ID, or origin IP..."
            className="w-full pl-9 pr-8 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-0.5"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Entity Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-zinc-400 text-[11px] font-semibold">Entity:</span>
            <select
              value={entity}
              onChange={(e) => onEntityChange(e.target.value)}
              className="bg-transparent text-zinc-900 dark:text-white font-bold text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Entities</option>
              {availableEntities.map((ent) => (
                <option key={ent} value={ent} className="dark:bg-zinc-900">
                  {ent}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={dateRange}
              onChange={(e) => onDateRangeChange(e.target.value as AuditDateRange)}
              className="bg-transparent text-zinc-900 dark:text-white font-bold text-xs focus:outline-none cursor-pointer pr-1"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="dark:bg-zinc-900">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Live Stream Toggle */}
          <button
            onClick={onToggleStreaming}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border',
              isStreaming
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
            )}
            title={isStreaming ? 'Pause live audit stream' : 'Resume live audit stream'}
          >
            {isStreaming ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Live Feed</span>
              </>
            ) : (
              <>
                <Pause className="w-3 h-3 text-zinc-500" />
                <span>Paused</span>
              </>
            )}
          </button>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={onExportCsv}
              disabled={isExporting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
              title="Download Compliance CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
            <button
              onClick={onExportJson}
              disabled={isExporting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer"
              title="Download Raw JSON Dump"
            >
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 border-t border-zinc-100 dark:border-zinc-800/60 no-scrollbar">
        {CATEGORY_TABS.map((tab) => {
          const isActive = category === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onCategoryChange(tab.id)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer',
                isActive
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-xs'
                  : 'bg-zinc-100/70 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
