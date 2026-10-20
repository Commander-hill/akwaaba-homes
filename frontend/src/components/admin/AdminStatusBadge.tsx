'use client';

import React from 'react';
import clsx from 'clsx';

export type StatusVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'purple';

interface AdminStatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
  size?: 'sm' | 'md';
}

const statusVariantMap: Record<string, StatusVariant> = {
  // Positive / Verified / Active
  VERIFIED: 'success',
  APPROVED: 'success',
  ACTIVE: 'success',
  COMPLETED: 'success',
  CONFIRMED: 'success',
  SUCCESS: 'success',
  SUPER_ADMIN: 'purple',

  // Pending / Reviewing
  PENDING: 'warning',
  UNDER_REVIEW: 'warning',
  RESUBMISSION_REQUIRED: 'warning',
  SCHEDULED: 'info',
  IN_PROGRESS: 'info',

  // Negative / Danger
  REJECTED: 'danger',
  SUSPENDED: 'danger',
  CANCELLED: 'danger',
  FAILED: 'danger',
  DISMISSED: 'neutral',
  LOCKED: 'danger',

  // Roles & Types
  ADMIN: 'purple',
  LANDLORD: 'info',
  TENANT: 'neutral',
  CARETAKER: 'info',
  NOT_SUBMITTED: 'neutral',
  NONE: 'neutral'
};

const variantClasses: Record<StatusVariant, string> = {
  success:
    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  warning:
    'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  danger:
    'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
  info:
    'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
  purple:
    'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
  neutral:
    'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
};

export default function AdminStatusBadge({
  status,
  variant,
  className,
  size = 'sm'
}: AdminStatusBadgeProps) {
  const normalized = (status || '').toUpperCase().trim();
  const resolvedVariant = variant || statusVariantMap[normalized] || 'neutral';

  const label = normalized.replace(/_/g, ' ');

  return (
    <span
      className={clsx(
        'inline-flex items-center font-bold uppercase tracking-wider rounded-md border shrink-0',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        variantClasses[resolvedVariant],
        className
      )}
    >
      <span
        className={clsx(
          'w-1.5 h-1.5 rounded-full mr-1.5 shrink-0',
          resolvedVariant === 'success' && 'bg-emerald-500',
          resolvedVariant === 'warning' && 'bg-amber-500',
          resolvedVariant === 'danger' && 'bg-rose-500',
          resolvedVariant === 'info' && 'bg-sky-500',
          resolvedVariant === 'purple' && 'bg-purple-500',
          resolvedVariant === 'neutral' && 'bg-zinc-400'
        )}
      />
      {label}
    </span>
  );
}
