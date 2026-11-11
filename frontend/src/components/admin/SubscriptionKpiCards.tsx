'use client';

import React from 'react';
import { Users, CalendarCheck, Clock, AlertCircle, LucideIcon } from 'lucide-react';

export interface SubscriptionKpiStats {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
  totalTrendPct: number;
  activeTrendPct: number;
  expiringSharePct: number;
  expiredSharePct: number;
}

interface SubscriptionKpiCardsProps {
  stats: SubscriptionKpiStats;
  activeTab: string;
  onSelectTab: (tab: 'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED') => void;
}

interface KpiCardConfig {
  id: 'ALL' | 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
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

export default function SubscriptionKpiCards({
  stats,
  activeTab,
  onSelectTab,
}: SubscriptionKpiCardsProps) {
  const cards: KpiCardConfig[] = [
    {
      id: 'ALL',
      label: 'Total Licenses',
      value: stats.total,
      trendText: `↑ ${stats.totalTrendPct}%`,
      icon: Users,
      iconBg: 'bg-[#EAF7EE] dark:bg-emerald-950/60',
      iconColor: 'text-[#04793d] dark:text-emerald-400',
      trendColor: 'text-[#04793d] dark:text-emerald-400',
      strokeColor: '#16A34A',
      fillColor: 'rgba(22, 163, 74, 0.14)',
      pathD: 'M2 32 C16 30, 26 22, 38 24 C50 26, 62 12, 74 14 C84 15, 92 6, 102 4',
      areaD: 'M2 32 C16 30, 26 22, 38 24 C50 26, 62 12, 74 14 C84 15, 92 6, 102 4 L102 38 L2 38 Z',
    },
    {
      id: 'ACTIVE',
      label: 'Active Subscriptions',
      value: stats.active,
      trendText: `↑ ${stats.activeTrendPct}%`,
      icon: CalendarCheck,
      iconBg: 'bg-[#E8F2FF] dark:bg-blue-950/60',
      iconColor: 'text-[#2563EB] dark:text-blue-400',
      trendColor: 'text-[#04793d] dark:text-emerald-400',
      strokeColor: '#2563EB',
      fillColor: 'rgba(37, 99, 235, 0.14)',
      pathD: 'M2 33 C14 28, 28 24, 40 20 C54 15, 64 19, 76 11 C88 6, 95 9, 102 5',
      areaD: 'M2 33 C14 28, 28 24, 40 20 C54 15, 64 19, 76 11 C88 6, 95 9, 102 5 L102 38 L2 38 Z',
    },
    {
      id: 'EXPIRING_SOON',
      label: 'Expiring Soon',
      value: stats.expiringSoon,
      trendText: `${stats.expiringSharePct}% due soon`,
      icon: Clock,
      iconBg: 'bg-[#FEF4E8] dark:bg-amber-950/60',
      iconColor: 'text-[#D97706] dark:text-amber-400',
      trendColor: 'text-[#C2410C] dark:text-amber-400',
      strokeColor: '#F59E0B',
      fillColor: 'rgba(245, 158, 11, 0.14)',
      pathD: 'M2 33 C18 27, 28 28, 42 22 C54 17, 66 23, 78 13 C88 8, 96 12, 102 9',
      areaD: 'M2 33 C18 27, 28 28, 42 22 C54 17, 66 23, 78 13 C88 8, 96 12, 102 9 L102 38 L2 38 Z',
    },
    {
      id: 'EXPIRED',
      label: 'Expired',
      value: stats.expired,
      trendText: `${stats.expiredSharePct}% lapsed`,
      icon: AlertCircle,
      iconBg: 'bg-[#FEECEC] dark:bg-rose-950/60',
      iconColor: 'text-[#DC2626] dark:text-rose-400',
      trendColor: 'text-[#B91C1C] dark:text-rose-400',
      strokeColor: '#EF4444',
      fillColor: 'rgba(239, 68, 68, 0.13)',
      pathD: 'M2 34 C16 28, 28 31, 42 23 C54 16, 66 22, 80 14 C90 9, 96 15, 102 11',
      areaD: 'M2 34 C16 28, 28 31, 42 23 C54 16, 66 22, 80 14 C90 9, 96 15, 102 11 L102 38 L2 38 Z',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeTab === card.id && card.id !== 'ALL';
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectTab(activeTab === card.id ? 'ALL' : card.id)}
            className={`relative overflow-hidden text-left bg-white dark:bg-zinc-900 rounded-2xl p-4 border shadow-xs transition cursor-pointer group ${
              isActive
                ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                : 'border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-800'
            }`}
          >
            <div className="flex items-start gap-3.5 relative z-10">
              <div
                className={`w-11 h-11 rounded-full ${card.iconBg} flex items-center justify-center shrink-0 mt-0.5`}
              >
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>

              <div className="min-w-0 flex-1 pr-14">
                <div className="text-2xl font-black text-zinc-900 dark:text-white leading-none tracking-tight">
                  {card.value}
                </div>
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mt-1">
                  {card.label}
                </div>
                <div className={`text-[11px] font-bold mt-1.5 ${card.trendColor}`}>
                  {card.trendText}
                </div>
              </div>
            </div>

            <svg
              aria-hidden="true"
              viewBox="0 0 104 40"
              className="w-24 h-10 absolute right-2 bottom-1 pointer-events-none opacity-90 group-hover:scale-105 transition-transform"
            >
              <path d={card.areaD} fill={card.fillColor} />
              <path
                d={card.pathD}
                fill="none"
                stroke={card.strokeColor}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
