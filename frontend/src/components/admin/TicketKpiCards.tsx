'use client';

import React from 'react';
import { Ticket, Clock, FileCheck, AlertCircle, LucideIcon } from 'lucide-react';

export interface TicketKpiStats {
  total: number;
  inProgress: number;
  resolved: number;
  overdue: number;
  totalTrendText?: string;
  inProgressTrendText?: string;
  resolvedTrendText?: string;
  overdueTrendText?: string;
}

interface TicketKpiCardsProps {
  stats: TicketKpiStats;
  activeTab: string;
  onSelectTab: (tab: 'ALL' | 'IN_PROGRESS' | 'RESOLVED' | 'OVERDUE') => void;
}

interface KpiCardConfig {
  id: 'ALL' | 'IN_PROGRESS' | 'RESOLVED' | 'OVERDUE';
  label: string;
  value: number;
  trendText: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  trendColor: string;
  strokeColor: string;
  fillColor: string;
  pathD: string;
  areaD: string;
}

export default function TicketKpiCards({
  stats,
  activeTab,
  onSelectTab,
}: TicketKpiCardsProps) {
  const cards: KpiCardConfig[] = [
    {
      id: 'ALL',
      label: 'Total Tickets',
      value: stats.total,
      trendText: stats.totalTrendText || `${stats.total} logged`,
      icon: Ticket,
      iconBg: 'bg-[#E6F7EE] dark:bg-emerald-950/60',
      iconColor: 'text-[#059669] dark:text-emerald-400',
      trendColor: 'text-[#059669] dark:text-emerald-400',
      strokeColor: '#16A34A',
      fillColor: 'rgba(22, 163, 74, 0.14)',
      pathD: 'M2 32 C14 31, 24 22, 36 24 C48 26, 60 12, 74 14 C86 16, 94 7, 102 4',
      areaD: 'M2 32 C14 31, 24 22, 36 24 C48 26, 60 12, 74 14 C86 16, 94 7, 102 4 L102 38 L2 38 Z',
    },
    {
      id: 'IN_PROGRESS',
      label: 'In Progress',
      value: stats.inProgress,
      trendText: stats.inProgressTrendText || `${stats.inProgress} active`,
      icon: Clock,
      iconBg: 'bg-[#E8F2FF] dark:bg-blue-950/60',
      iconColor: 'text-[#2563EB] dark:text-blue-400',
      trendColor: 'text-[#059669] dark:text-emerald-400',
      strokeColor: '#2563EB',
      fillColor: 'rgba(37, 99, 235, 0.14)',
      pathD: 'M2 33 C16 28, 28 24, 40 20 C54 15, 64 19, 76 11 C88 6, 95 9, 102 5',
      areaD: 'M2 33 C16 28, 28 24, 40 20 C54 15, 64 19, 76 11 C88 6, 95 9, 102 5 L102 38 L2 38 Z',
    },
    {
      id: 'RESOLVED',
      label: 'Resolved',
      value: stats.resolved,
      trendText: stats.resolvedTrendText || `${stats.resolved} closed`,
      icon: FileCheck,
      iconBg: 'bg-[#FEF3E8] dark:bg-amber-950/60',
      iconColor: 'text-[#EA580C] dark:text-amber-400',
      trendColor: 'text-[#059669] dark:text-emerald-400',
      strokeColor: '#F59E0B',
      fillColor: 'rgba(245, 158, 11, 0.14)',
      pathD: 'M2 33 C18 28, 28 29, 42 22 C54 17, 66 23, 78 13 C88 8, 96 12, 102 9',
      areaD: 'M2 33 C18 28, 28 29, 42 22 C54 17, 66 23, 78 13 C88 8, 96 12, 102 9 L102 38 L2 38 Z',
    },
    {
      id: 'OVERDUE',
      label: 'Overdue',
      value: stats.overdue,
      trendText: stats.overdueTrendText || `${stats.overdue} overdue`,
      icon: AlertCircle,
      iconBg: 'bg-[#FEE2E2] dark:bg-rose-950/60',
      iconColor: 'text-[#DC2626] dark:text-rose-400',
      trendColor: 'text-[#DC2626] dark:text-rose-400',
      strokeColor: '#EF4444',
      fillColor: 'rgba(239, 68, 68, 0.14)',
      pathD: 'M2 31 C16 32, 26 26, 38 28 C50 29, 62 21, 74 23 C86 24, 94 14, 102 18',
      areaD: 'M2 31 C16 32, 26 26, 38 28 C50 29, 62 21, 74 23 C86 24, 94 14, 102 18 L102 38 L2 38 Z',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeTab === card.id;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectTab(isActive && card.id !== 'ALL' ? 'ALL' : card.id)}
            className={`group relative overflow-hidden rounded-[20px] bg-white dark:bg-zinc-900 border px-5 py-4 flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
              isActive
                ? 'border-emerald-400 dark:border-emerald-600 shadow-sm ring-1 ring-emerald-500/20'
                : 'border-zinc-200/80 dark:border-zinc-800 shadow-[0_2px_10px_rgba(15,23,42,0.03)] hover:border-zinc-300 dark:hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0 z-10">
              <div
                className={`w-11 h-11 rounded-full ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0`}
              >
                <Icon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 truncate">
                  {card.label}
                </div>
                <div className="text-[22px] font-black text-zinc-900 dark:text-white tracking-tight leading-tight mt-0.5 truncate">
                  {card.value.toLocaleString()}
                </div>
                <div className={`text-[11px] font-bold mt-0.5 ${card.trendColor}`}>
                  {card.trendText}
                </div>
              </div>
            </div>

            <div className="w-20 h-9 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity self-end">
              <svg viewBox="0 0 104 40" className="w-full h-full overflow-visible" aria-hidden="true">
                <path d={card.areaD} fill={card.fillColor} />
                <path
                  d={card.pathD}
                  fill="none"
                  stroke={card.strokeColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>
        );
      })}
    </div>
  );
}
