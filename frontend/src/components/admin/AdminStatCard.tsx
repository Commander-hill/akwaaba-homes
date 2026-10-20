'use client';

import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { ArrowUpRight } from 'lucide-react';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  href?: string;
  badge?: string;
  className?: string;
}

export default function AdminStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  href,
  badge,
  className
}: AdminStatCardProps) {
  const CardContent = (
    <div
      className={clsx(
        'p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 transition shadow-2xs relative group',
        href && 'hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {title}
        </span>
        <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shrink-0 border border-zinc-200/60 dark:border-zinc-700/60">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
          {value}
        </div>

        {(subtitle || trend || badge) && (
          <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
            {badge && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                {badge}
              </span>
            )}

            {trend && (
              <span
                className={clsx(
                  'text-[11px] font-bold',
                  trend.isPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                )}
              >
                {trend.value} {trend.label}
              </span>
            )}

            {subtitle && (
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>

      {href && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
          <ArrowUpRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{CardContent}</Link>;
  }

  return CardContent;
}
