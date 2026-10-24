'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Megaphone,
  Zap,
  Droplets,
  Wrench,
  ShieldAlert,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Building
} from 'lucide-react';
import clsx from 'clsx';

interface CompoundNotice {
  id: string;
  propertyId: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  createdAt: string;
  property?: {
    id: string;
    title: string;
    location: string;
  };
}

export default function ResidentNoticeCard({ propertyId }: { propertyId: string }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const { data, isLoading } = useQuery<{ notices: CompoundNotice[] }>({
    queryKey: ['compoundNotices', 'property', propertyId],
    queryFn: async () => {
      const res = await api.get(`/compound-notices/property/${propertyId}`);
      return res.data;
    },
    enabled: Boolean(propertyId),
    refetchInterval: 60000,
  });

  const notices = data?.notices || [];

  if (isLoading || notices.length === 0) {
    return null;
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'UTILITY':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'MAINTENANCE':
        return <Wrench className="w-4 h-4 text-orange-500" />;
      case 'SECURITY':
        return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      default:
        return <Megaphone className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="rounded-[16px] bg-white dark:bg-[#171C19] border border-amber-200/80 dark:border-amber-900/40 p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                Building Announcements &amp; Advisories
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                {notices.length} {notices.length === 1 ? 'Notice' : 'Notices'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Official updates from your landlord and compound gatehouse
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition cursor-pointer"
          aria-label={isExpanded ? 'Collapse notices' : 'Expand notices'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-1">
          {notices.map((notice) => (
            <div
              key={notice.id}
              className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 space-y-2"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {getCategoryIcon(notice.category)}
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    {notice.title}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                      notice.priority === 'EMERGENCY'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        : notice.priority === 'IMPORTANT'
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    )}
                  >
                    {notice.priority}
                  </span>

                  <span className="text-[10px] font-medium text-zinc-400">
                    {new Date(notice.createdAt).toLocaleDateString('en-GH', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                {notice.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
