'use client';

import React from 'react';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Check, LucideIcon } from 'lucide-react';

export interface TransactionKpiStats {
  totalVolume: number;
  inflows: number;
  outflows: number;
  successRate: number;
  totalTrendText?: string;
  inflowsTrendText?: string;
  outflowsTrendText?: string;
  successTrendText?: string;
}

interface TransactionKpiCardsProps {
  stats: TransactionKpiStats;
  activeTab: string;
  onSelectTab: (tab: 'ALL' | 'RENT_PAYMENT' | 'DISBURSEMENT') => void;
}

interface KpiCardConfig {
  id: 'ALL' | 'RENT_PAYMENT' | 'DISBURSEMENT' | 'SUCCESS_RATE';
  clickableTab?: 'ALL' | 'RENT_PAYMENT' | 'DISBURSEMENT';
  label: string;
  valueText: string;
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

export default function TransactionKpiCards({
  stats,
  activeTab,
  onSelectTab,
}: TransactionKpiCardsProps) {
  const cards: KpiCardConfig[] = [
    {
      id: 'ALL',
      clickableTab: 'ALL',
      label: 'Total Transactions',
      valueText: `GH₵ ${Math.round(stats.totalVolume).toLocaleString()}`,
      trendText: stats.totalTrendText || '↑ 12%',
      icon: Wallet,
      iconBg: 'bg-[#E6F7EE] dark:bg-emerald-950/60',
      iconColor: 'text-[#059669] dark:text-emerald-400',
      trendColor: 'text-[#059669] dark:text-emerald-400',
      strokeColor: '#16A34A',
      fillColor: 'rgba(22, 163, 74, 0.14)',
      pathD: 'M2 32 C14 31, 24 22, 36 24 C48 26, 60 12, 74 14 C86 16, 94 7, 102 4',
      areaD: 'M2 32 C14 31, 24 22, 36 24 C48 26, 60 12, 74 14 C86 16, 94 7, 102 4 L102 38 L2 38 Z',
    },
    {
      id: 'RENT_PAYMENT',
      clickableTab: 'RENT_PAYMENT',
      label: 'Total Inflows',
      valueText: `GH₵ ${Math.round(stats.inflows).toLocaleString()}`,
      trendText: stats.inflowsTrendText || '↑ 15%',
      icon: ArrowDownToLine,
      iconBg: 'bg-[#E8F2FF] dark:bg-blue-950/60',
      iconColor: 'text-[#2563EB] dark:text-blue-400',
      trendColor: 'text-[#059669] dark:text-emerald-400',
      strokeColor: '#2563EB',
      fillColor: 'rgba(37, 99, 235, 0.14)',
      pathD: 'M2 33 C16 28, 28 24, 40 20 C54 15, 64 19, 76 11 C88 6, 95 9, 102 5',
      areaD: 'M2 33 C16 28, 28 24, 40 20 C54 15, 64 19, 76 11 C88 6, 95 9, 102 5 L102 38 L2 38 Z',
    },
    {
      id: 'DISBURSEMENT',
      clickableTab: 'DISBURSEMENT',
      label: 'Total Outflows',
      valueText: `GH₵ ${Math.round(stats.outflows).toLocaleString()}`,
      trendText: stats.outflowsTrendText || '↑ 8%',
      icon: ArrowUpFromLine,
      iconBg: 'bg-[#FEF3E8] dark:bg-amber-950/60',
      iconColor: 'text-[#EA580C] dark:text-amber-400',
      trendColor: 'text-[#059669] dark:text-emerald-400',
      strokeColor: '#EA580C',
      fillColor: 'rgba(234, 88, 12, 0.14)',
      pathD: 'M2 33 C18 28, 28 29, 42 22 C54 17, 66 23, 78 13 C88 8, 96 12, 102 9',
      areaD: 'M2 33 C18 28, 28 29, 42 22 C54 17, 66 23, 78 13 C88 8, 96 12, 102 9 L102 38 L2 38 Z',
    },
    {
      id: 'SUCCESS_RATE',
      label: 'Successful',
      valueText: `${stats.successRate.toFixed(1)}%`,
      trendText: stats.successTrendText || '↑ 0.2%',
      icon: Check,
      iconBg: 'bg-[#F3E8FF] dark:bg-purple-950/60',
      iconColor: 'text-[#9333EA] dark:text-purple-400',
      trendColor: 'text-[#059669] dark:text-emerald-400',
      strokeColor: '#9333EA',
      fillColor: 'rgba(147, 51, 234, 0.14)',
      pathD: 'M2 31 C16 28, 28 24, 42 20 C56 17, 68 18, 82 11 C90 8, 96 6, 102 4',
      areaD: 'M2 31 C16 28, 28 24, 42 20 C56 17, 68 18, 82 11 C90 8, 96 6, 102 4 L102 38 L2 38 Z',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = card.clickableTab ? activeTab === card.clickableTab : false;
        return (
          <button
            key={card.id}
            type="button"
            onClick={() => card.clickableTab && onSelectTab(card.clickableTab)}
            className={`group relative overflow-hidden rounded-[20px] bg-white dark:bg-zinc-900 border px-5 py-4 flex items-center justify-between gap-3 text-left transition-all ${
              card.clickableTab ? 'cursor-pointer' : 'cursor-default'
            } ${
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
                  {card.valueText}
                </div>
                <div className={`text-[11px] font-bold mt-0.5 ${card.trendColor}`}>
                  {card.trendText}
                </div>
              </div>
            </div>

            <div className="w-24 h-10 shrink-0 opacity-90 group-hover:opacity-100 transition-opacity self-end">
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
