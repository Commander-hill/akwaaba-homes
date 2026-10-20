'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import clsx from 'clsx';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  backUrl?: string;
  backLabel?: string;
  className?: string;
}

export default function AdminPageHeader({
  title,
  subtitle,
  badge,
  breadcrumbs,
  actions,
  backUrl,
  backLabel = 'Back',
  className
}: AdminPageHeaderProps) {
  return (
    <div className={clsx('space-y-3 pb-6 border-b border-zinc-200 dark:border-zinc-800', className)}>
      {/* Breadcrumbs or Back Link */}
      <div className="flex items-center justify-between gap-4">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-zinc-500">
            {breadcrumbs.map((item, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                  {item.href && !isLast ? (
                    <Link
                      href={item.href}
                      className="hover:text-zinc-900 dark:hover:text-white transition-colors truncate max-w-[150px] sm:max-w-none font-medium"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className={clsx('truncate max-w-[200px] sm:max-w-none', isLast ? 'font-bold text-zinc-900 dark:text-white' : 'font-medium')}>
                      {item.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </nav>
        ) : backUrl ? (
          <Link
            href={backUrl}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{backLabel}</span>
          </Link>
        ) : null}
      </div>

      {/* Title, Badge & Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
