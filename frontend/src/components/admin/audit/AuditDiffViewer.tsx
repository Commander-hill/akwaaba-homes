'use client';

import React, { useState, useMemo } from 'react';
import { Copy, Check, Columns, AlignLeft, Code, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface AuditDiffViewerProps {
  oldData: string | null | undefined;
  newData: string | null | undefined;
  className?: string;
}

type DiffStatus = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';

interface KeyDiff {
  key: string;
  status: DiffStatus;
  oldVal: any;
  newVal: any;
}

function safeParse(input: string | null | undefined): Record<string, any> | null {
  if (!input) return null;
  if (typeof input === 'object') return input;
  try {
    const parsed = JSON.parse(input);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
    return { value: parsed };
  } catch {
    return { raw: input };
  }
}

function formatValue(val: any): string {
  if (val === undefined) return '<undefined>';
  if (val === null) return 'null';
  if (typeof val === 'object') {
    return JSON.stringify(val, null, 2);
  }
  return String(val);
}

export default function AuditDiffViewer({ oldData, newData, className }: AuditDiffViewerProps) {
  const [viewMode, setViewMode] = useState<'split' | 'unified' | 'raw'>('unified');
  const [hideUnchanged, setHideUnchanged] = useState<boolean>(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const oldObj = useMemo(() => safeParse(oldData), [oldData]);
  const newObj = useMemo(() => safeParse(newData), [newData]);

  // Compute key diffs
  const diffs: KeyDiff[] = useMemo(() => {
    if (!oldObj && !newObj) return [];

    const keys = new Set<string>([
      ...(oldObj ? Object.keys(oldObj) : []),
      ...(newObj ? Object.keys(newObj) : [])
    ]);

    const result: KeyDiff[] = [];

    Array.from(keys).sort().forEach((key) => {
      const hasOld = oldObj !== null && key in oldObj;
      const hasNew = newObj !== null && key in newObj;
      const oldVal = hasOld ? oldObj[key] : undefined;
      const newVal = hasNew ? newObj[key] : undefined;

      let status: DiffStatus = 'UNCHANGED';

      if (!hasOld && hasNew) {
        status = 'ADDED';
      } else if (hasOld && !hasNew) {
        status = 'REMOVED';
      } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        status = 'MODIFIED';
      }

      result.push({ key, status, oldVal, newVal });
    });

    return result;
  }, [oldObj, newObj]);

  const filteredDiffs = useMemo(() => {
    if (!hideUnchanged) return diffs;
    return diffs.filter((d) => d.status !== 'UNCHANGED');
  }, [diffs, hideUnchanged]);

  const counts = useMemo(() => {
    return {
      added: diffs.filter((d) => d.status === 'ADDED').length,
      removed: diffs.filter((d) => d.status === 'REMOVED').length,
      modified: diffs.filter((d) => d.status === 'MODIFIED').length,
      unchanged: diffs.filter((d) => d.status === 'UNCHANGED').length
    };
  }, [diffs]);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 1800);
  };

  if (!oldData && !newData) {
    return (
      <div className="p-6 text-center rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
        No state mutation payload was recorded for this event.
      </div>
    );
  }

  return (
    <div className={clsx('space-y-3', className)}>
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        {/* Diff summary badges */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
            +{counts.added} added
          </span>
          <span className="px-2 py-0.5 rounded-md font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
            ~{counts.modified} modified
          </span>
          <span className="px-2 py-0.5 rounded-md font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50">
            -{counts.removed} removed
          </span>
          {counts.unchanged > 0 && (
            <button
              onClick={() => setHideUnchanged(!hideUnchanged)}
              className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 text-[10px] underline ml-1 cursor-pointer"
            >
              {hideUnchanged ? `Show ${counts.unchanged} unchanged` : `Hide unchanged`}
            </button>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-xs font-semibold">
          <button
            onClick={() => setViewMode('unified')}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px]',
              viewMode === 'unified'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            )}
            title="Unified Key-by-Key Delta"
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Delta</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px]',
              viewMode === 'split'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            )}
            title="Side-by-Side Comparison"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={clsx(
              'flex items-center gap-1 px-2.5 py-1 rounded-md transition-all cursor-pointer text-[11px]',
              viewMode === 'raw'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs font-bold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            )}
            title="Raw Formatted JSON"
          >
            <Code className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* VIEW: UNIFIED DELTA */}
      {viewMode === 'unified' && (
        <div className="space-y-2">
          {filteredDiffs.length === 0 ? (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-center text-xs text-zinc-500">
              No field-level mutations detected between old and new state.
            </div>
          ) : (
            filteredDiffs.map((d) => (
              <div
                key={d.key}
                className={clsx(
                  'p-3 rounded-xl border text-xs font-mono transition-colors',
                  d.status === 'ADDED' &&
                    'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50',
                  d.status === 'REMOVED' &&
                    'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/50',
                  d.status === 'MODIFIED' &&
                    'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50',
                  d.status === 'UNCHANGED' &&
                    'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-60'
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={clsx(
                        'px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider',
                        d.status === 'ADDED' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
                        d.status === 'REMOVED' && 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300',
                        d.status === 'MODIFIED' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
                        d.status === 'UNCHANGED' && 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      )}
                    >
                      {d.status === 'ADDED' && '+ ADDED'}
                      {d.status === 'REMOVED' && '- REMOVED'}
                      {d.status === 'MODIFIED' && '~ MODIFIED'}
                      {d.status === 'UNCHANGED' && '= UNCHANGED'}
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-white">{d.key}</span>
                  </div>

                  <button
                    onClick={() => handleCopy(formatValue(d.newVal ?? d.oldVal), d.key)}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer p-1"
                    title="Copy value"
                  >
                    {copiedKey === d.key ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Values display */}
                {d.status === 'MODIFIED' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 pt-2 border-t border-amber-200/50 dark:border-amber-900/30">
                    <div className="p-2 rounded-lg bg-red-100/40 dark:bg-red-950/40 text-red-800 dark:text-red-300 overflow-x-auto">
                      <span className="text-[10px] font-sans font-bold uppercase text-red-600 dark:text-red-400 block mb-1">
                        Previous Value:
                      </span>
                      <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">{formatValue(d.oldVal)}</pre>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-100/40 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 overflow-x-auto">
                      <span className="text-[10px] font-sans font-bold uppercase text-emerald-600 dark:text-emerald-400 block mb-1">
                        Committed Value:
                      </span>
                      <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">{formatValue(d.newVal)}</pre>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 overflow-x-auto">
                    <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">
                      {formatValue(d.newVal !== undefined ? d.newVal : d.oldVal)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW: SPLIT SIDE-BY-SIDE */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Pre-Mutation */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-900 text-zinc-100">
            <div className="px-3.5 py-2 bg-zinc-800/80 border-b border-zinc-700/80 flex items-center justify-between">
              <span className="font-bold text-[10px] uppercase tracking-wider text-red-400">
                Pre-Mutation State (Old)
              </span>
              {oldData && (
                <button
                  onClick={() => handleCopy(JSON.stringify(oldObj, null, 2), 'oldRaw')}
                  className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'oldRaw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'oldRaw' ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
            <pre className="p-3 text-[11px] font-mono overflow-x-auto max-h-72 leading-relaxed">
              {oldObj ? JSON.stringify(oldObj, null, 2) : 'null (Created as new entity)'}
            </pre>
          </div>

          {/* Post-Mutation */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-900 text-zinc-100">
            <div className="px-3.5 py-2 bg-zinc-800/80 border-b border-zinc-700/80 flex items-center justify-between">
              <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-400">
                Post-Mutation State (New)
              </span>
              {newData && (
                <button
                  onClick={() => handleCopy(JSON.stringify(newObj, null, 2), 'newRaw')}
                  className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'newRaw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'newRaw' ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>
            <pre className="p-3 text-[11px] font-mono overflow-x-auto max-h-72 leading-relaxed">
              {newObj ? JSON.stringify(newObj, null, 2) : 'null (Deleted / Purged entity)'}
            </pre>
          </div>
        </div>
      )}

      {/* VIEW: RAW FORMATTED JSON */}
      {viewMode === 'raw' && (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-900 text-zinc-100">
          <div className="px-3.5 py-2 bg-zinc-800/80 border-b border-zinc-700/80 flex items-center justify-between">
            <span className="font-bold text-[10px] uppercase tracking-wider text-zinc-300">
              Complete Forensic Mutation Payload
            </span>
            <button
              onClick={() =>
                handleCopy(
                  JSON.stringify({ oldState: oldObj, newState: newObj }, null, 2),
                  'combinedRaw'
                )
              }
              className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              {copiedKey === 'combinedRaw' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'combinedRaw' ? 'Copied Full Dossier' : 'Copy Full Payload'}</span>
            </button>
          </div>
          <pre className="p-3 text-[11px] font-mono overflow-x-auto max-h-80 leading-relaxed">
            {JSON.stringify({ oldState: oldObj, newState: newObj }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
