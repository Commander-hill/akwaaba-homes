'use client';

import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import {
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ShieldCheck,
  Building2,
  ChevronRight,
  Star,
  RefreshCw,
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────────
 * 1. BUTTON PRIMITIVE
 * ────────────────────────────────────────────────────────────────────────── */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'clay' | 'blue';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'sm',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      children,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-[#0F5132] hover:bg-[#0A3D24] active:bg-[#08301C] text-white border border-[#062415]/40 shadow-xs focus-visible:ring-[#0F5132]/50',
      blue:
        'bg-[#0062BA] hover:bg-[#00529E] active:bg-[#004687] text-white border border-[#00488A]/40 shadow-xs focus-visible:ring-[#0062BA]/50',
      secondary:
        'bg-[#557A67] hover:bg-[#446353] active:bg-[#385244] text-white border border-[#385244]/40 shadow-xs',
      clay:
        'bg-[#C77B59] hover:bg-[#B26948] active:bg-[#9C5A3C] text-white border border-[#9C5A3C]/40 shadow-xs',
      outline:
        'bg-white dark:bg-[#141816] hover:bg-[#F8F7F2] dark:hover:bg-[#1B211E] text-[#242925] dark:text-[#F2F2EE] border border-[#E7E7DF] dark:border-[#262E2A] shadow-2xs',
      ghost:
        'bg-transparent hover:bg-[#F1EFE8] dark:hover:bg-[#1B211E] text-[#242925] dark:text-[#F2F2EE] border border-transparent',
      danger:
        'bg-[#FCEEEE] hover:bg-[#F9DCDC] text-[#9E2A2B] border border-[#F3C5C5] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    };

    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'h-9 px-4 text-xs gap-2 rounded-xl font-extrabold',
      md: 'h-11 px-5 text-xs sm:text-sm gap-2 rounded-xl font-extrabold',
      lg: 'h-12 px-6 text-sm gap-2.5 rounded-2xl font-extrabold',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center transition-all duration-150 select-none cursor-pointer active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5132] focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:active:scale-100',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);
Button.displayName = 'Button';

/* ──────────────────────────────────────────────────────────────────────────
 * 2. INPUT & SELECT CONTROLS
 * ────────────────────────────────────────────────────────────────────────── */
export interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, helperText, error, leftIcon, rightElement, id, className, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-[#242925] dark:text-[#F2F2EE]"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-[#6F756F] pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={clsx(
              'w-full h-11 bg-white dark:bg-[#141816] border rounded-lg text-sm text-[#242925] dark:text-[#F2F2EE] placeholder:text-[#6F756F]/70',
              'transition-colors outline-none focus:border-[#173D32] focus:ring-1 focus:ring-[#173D32]',
              'disabled:bg-[#F1EFE8] disabled:text-[#6F756F] disabled:cursor-not-allowed',
              leftIcon ? 'pl-10' : 'px-3.5',
              rightElement ? 'pr-10' : 'pr-3.5',
              error
                ? 'border-[#9E2A2B] focus:border-[#9E2A2B] focus:ring-[#9E2A2B]'
                : 'border-[#E7E7DF] dark:border-[#262E2A]',
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center">{rightElement}</div>
          )}
        </div>
        {error ? (
          <p id={`${inputId}-error`} className="text-xs font-medium text-[#9E2A2B] flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className="text-xs text-[#6F756F]">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
InputField.displayName = 'InputField';

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

export const SelectField = React.forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, helperText, error, options, id, className, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id || generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-[#242925] dark:text-[#F2F2EE]"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          className={clsx(
            'w-full h-11 px-3.5 bg-white dark:bg-[#141816] border rounded-lg text-sm text-[#242925] dark:text-[#F2F2EE]',
            'transition-colors outline-none focus:border-[#173D32] focus:ring-1 focus:ring-[#173D32] cursor-pointer',
            'disabled:bg-[#F1EFE8] disabled:text-[#6F756F] disabled:cursor-not-allowed',
            error
              ? 'border-[#9E2A2B]'
              : 'border-[#E7E7DF] dark:border-[#262E2A]',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <p className="text-xs font-medium text-[#9E2A2B]">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#6F756F]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
SelectField.displayName = 'SelectField';

/* ──────────────────────────────────────────────────────────────────────────
 * 3. PRICE DISPLAY COMPONENT (GH₵ + Rental Period)
 * ────────────────────────────────────────────────────────────────────────── */
export function formatCedis(amount: number | string | null | undefined): string {
  const num = Number(amount || 0);
  if (isNaN(num)) return 'GH₵ 0';
  return `GH₵ ${num.toLocaleString('en-GH')}`;
}

export function getRentalPeriodLabel(
  propertyType?: string,
  billingCycle?: string,
  compact = false
): string {
  if (billingCycle) {
    const upper = billingCycle.toUpperCase();
    if (upper.includes('SEMESTER')) return compact ? '/ sem' : 'per semester';
    if (upper.includes('ACADEMIC') || upper.includes('YEAR') || upper.includes('ANNUAL'))
      return compact ? '/ yr' : 'per academic year';
    if (upper.includes('NIGHT') || upper.includes('DAY')) return compact ? '/ night' : 'per night';
    if (upper.includes('MONTH')) return compact ? '/ mo' : 'per month';
  }
  const type = (propertyType || '').toUpperCase();
  if (type === 'HOSTEL') return compact ? '/ academic yr' : 'per academic year';
  if (type === 'SHORT_STAY' || type === 'HOMESTAY') return compact ? '/ night' : 'per night';
  return compact ? '/ month' : 'per month';
}

export interface PriceDisplayProps {
  amount: number | string | null | undefined;
  propertyType?: string;
  billingCycle?: string;
  size?: 'sm' | 'md' | 'lg';
  compactPeriod?: boolean;
  className?: string;
}

export function PriceDisplay({
  amount,
  propertyType,
  billingCycle,
  size = 'md',
  compactPeriod = true,
  className,
}: PriceDisplayProps) {
  const formatted = formatCedis(amount);
  const period = getRentalPeriodLabel(propertyType, billingCycle, compactPeriod);

  const sizeMap = {
    sm: { price: 'text-sm font-bold', period: 'text-[11px]' },
    md: { price: 'text-base sm:text-lg font-bold', period: 'text-xs' },
    lg: { price: 'text-2xl sm:text-3xl font-bold', period: 'text-xs sm:text-sm' },
  };

  return (
    <div className={clsx('inline-flex items-baseline gap-1.5', className)}>
      <span className={clsx('text-[#242925] dark:text-[#F2F2EE] tracking-tight', sizeMap[size].price)}>
        {formatted}
      </span>
      <span className={clsx('text-[#6F756F] dark:text-[#9EA69F] font-normal', sizeMap[size].period)}>
        {period}
      </span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 4. SEMANTIC STATUS BADGE (Booking, Payment, Availability, Verification)
 * ────────────────────────────────────────────────────────────────────────── */
export type SemanticStatusTone = 'success' | 'warning' | 'error' | 'danger' | 'info' | 'neutral';

const STATUS_MAP: Record<
  string,
  { label: string; tone: SemanticStatusTone; icon?: React.ElementType }
> = {
  CONFIRMED: { label: 'Confirmed', tone: 'success', icon: CheckCircle2 },
  ACTIVE: { label: 'Active Residency', tone: 'success', icon: CheckCircle2 },
  PAID_IN_ESCROW: { label: 'Paid in Escrow', tone: 'success', icon: ShieldCheck },
  ESCROW_HELD: { label: 'Held in Escrow', tone: 'info', icon: ShieldCheck },
  RELEASED: { label: 'Disbursed', tone: 'success', icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', tone: 'neutral', icon: CheckCircle2 },
  APPROVED: { label: 'Approved — Awaiting Payment', tone: 'warning', icon: Clock },
  PENDING: { label: 'Pending Host Review', tone: 'warning', icon: Clock },
  CANCELLED: { label: 'Cancelled', tone: 'error', icon: XCircle },
  REJECTED: { label: 'Declined', tone: 'error', icon: XCircle },
  FAILED: { label: 'Payment Failed', tone: 'error', icon: AlertCircle },
  VERIFIED: { label: 'Verified', tone: 'success', icon: ShieldCheck },
  UNVERIFIED: { label: 'Unverified', tone: 'neutral' },
  AVAILABLE: { label: 'Available', tone: 'success', icon: CheckCircle2 },
  FULL: { label: 'Fully Booked', tone: 'neutral', icon: XCircle },
};

export function StatusBadge({
  status,
  tone,
  customLabel,
  size = 'sm',
  className,
  children,
}: {
  status?: string;
  tone?: SemanticStatusTone;
  customLabel?: string;
  size?: 'xs' | 'sm';
  className?: string;
  children?: React.ReactNode;
}) {
  const key = (status || '').toUpperCase();
  const mapped = key && STATUS_MAP[key]
    ? STATUS_MAP[key]
    : {
        label: customLabel || status || 'Status',
        tone: (tone || 'neutral') as SemanticStatusTone,
        icon: undefined,
      };

  const resolvedTone: SemanticStatusTone = tone || mapped.tone;

  const toneClasses: Record<SemanticStatusTone, string> = {
    success:
      'bg-[#EDF6F0] text-[#165B36] border-[#C5E2D0] dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    warning:
      'bg-[#FDF5E8] text-[#8C4F0F] border-[#F2D8B3] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    error:
      'bg-[#FCEEEE] text-[#9E2A2B] border-[#F3C5C5] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    danger:
      'bg-[#FCEEEE] text-[#9E2A2B] border-[#F3C5C5] dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    info:
      'bg-[#EEF4F8] text-[#1E4E68] border-[#C7DCE8] dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
    neutral:
      'bg-[#F1EFE8] text-[#5E645E] border-[#E7E7DF] dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  };

  const Icon = mapped.icon;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-semibold border rounded-md whitespace-nowrap',
        size === 'xs' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        toneClasses[resolvedTone],
        className
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      <span>{children ?? customLabel ?? mapped.label}</span>
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 5. VERIFICATION INDICATOR (Genuine KYC vs Registered Host)
 * ────────────────────────────────────────────────────────────────────────── */
export function VerificationIndicator({
  isVerifiedLandlord,
  showUnverified = true,
  size = 'sm',
}: {
  isVerifiedLandlord?: boolean;
  showUnverified?: boolean;
  size?: 'xs' | 'sm';
}) {
  if (isVerifiedLandlord) {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1 font-medium text-[#165B36] dark:text-emerald-400',
          size === 'xs' ? 'text-[11px]' : 'text-xs'
        )}
        title="Landlord identity and property documentation verified by Akwaaba Homes"
      >
        <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#173D32] dark:text-emerald-400" aria-hidden="true" />
        <span>Verified Landlord</span>
      </span>
    );
  }

  if (!showUnverified) return null;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-normal text-[#6F756F] dark:text-zinc-400',
        size === 'xs' ? 'text-[11px]' : 'text-xs'
      )}
    >
      <Building2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>Registered Host</span>
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 6. RATING SUMMARY PILL (Only shows genuine ratings)
 * ────────────────────────────────────────────────────────────────────────── */
export function RatingSummary({
  avgRating,
  reviewCount,
  showNewLabel = true,
}: {
  avgRating?: number | null;
  reviewCount?: number | null;
  showNewLabel?: boolean;
}) {
  const count = Number(reviewCount || 0);
  const rating = Number(avgRating || 0);

  if (count > 0 && rating > 0) {
    return (
      <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#242925] dark:text-[#F2F2EE]">
        <Star className="w-3.5 h-3.5 fill-[#C77B59] text-[#C77B59] shrink-0" aria-hidden="true" />
        <span>{rating.toFixed(1)}</span>
        <span className="text-[#6F756F] dark:text-[#9EA69F] font-normal">
          ({count} {count === 1 ? 'review' : 'reviews'})
        </span>
      </div>
    );
  }

  if (!showNewLabel) return null;

  return (
    <span className="text-xs text-[#6F756F] dark:text-[#9EA69F] font-normal">
      No reviews yet
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 7. BREADCRUMB & SECTION HEADER
 * ────────────────────────────────────────────────────────────────────────── */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function BreadcrumbNav({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1.5 text-xs text-[#6F756F]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#6F756F]/60 shrink-0" aria-hidden="true" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-[#173D32] dark:hover:text-white transition-colors font-medium"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={clsx(
                  'truncate max-w-[240px]',
                  isLast ? 'text-[#242925] dark:text-[#F2F2EE] font-semibold' : ''
                )}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * 8. EMPTY STATE, ERROR STATE & SKELETONS
 * ────────────────────────────────────────────────────────────────────────── */
export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  actionHref,
  onAction,
}: {
  icon?: React.ElementType | React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const IconComp = icon as React.ElementType;
    return <IconComp className="w-5 h-5" aria-hidden="true" />;
  };

  return (
    <div className="bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] rounded-xl p-8 sm:p-12 text-center max-w-xl mx-auto my-4">
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-[#F8F7F2] dark:bg-[#1B211E] border border-[#E7E7DF] dark:border-[#262E2A] flex items-center justify-center mx-auto mb-4 text-[#173D32] dark:text-emerald-400">
          {renderIcon()}
        </div>
      )}
      <h3 className="font-editorial text-xl text-[#242925] dark:text-[#F2F2EE]">
        {title}
      </h3>
      <p className="text-sm text-[#6F756F] dark:text-[#9EA69F] mt-2 leading-relaxed">
        {description}
      </p>
      {action ? (
        <div className="mt-6 flex items-center justify-center">{action}</div>
      ) : (actionLabel && actionHref) ? (
        <div className="mt-6">
          <Link
            href={actionHref}
            className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-[#173D32] hover:bg-[#102C24] text-white text-xs font-semibold transition-colors"
          >
            {actionLabel}
          </Link>
        </div>
      ) : (actionLabel && onAction) ? (
        <div className="mt-6">
          <Button onClick={onAction} size="sm">
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function ErrorState({
  title = 'Unable to load information',
  message,
  description,
  onRetry,
}: {
  title?: string;
  message?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const displayMessage =
    message ||
    description ||
    'We encountered a problem connecting to the server. Please check your connection and try again.';

  return (
    <div
      role="alert"
      className="bg-[#FCEEEE]/60 dark:bg-rose-950/20 border border-[#F3C5C5] dark:border-rose-900/50 rounded-xl p-6 sm:p-8 text-center max-w-lg mx-auto my-4"
    >
      <div className="w-10 h-10 rounded-lg bg-[#FCEEEE] dark:bg-rose-950/60 text-[#9E2A2B] dark:text-rose-300 flex items-center justify-center mx-auto mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-base font-bold text-[#242925] dark:text-white">{title}</h3>
      <p className="text-xs sm:text-sm text-[#6F756F] dark:text-zinc-300 mt-1.5 leading-relaxed">
        {displayMessage}
      </p>
      {onRetry && (
        <div className="mt-5">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#141816] border border-[#E7E7DF] dark:border-[#262E2A] rounded-xl overflow-hidden animate-pulse">
      <div className="aspect-[4/3] w-full bg-[#F1EFE8] dark:bg-[#1B211E]" />
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex justify-between gap-2">
          <div className="h-3.5 w-24 bg-[#F1EFE8] dark:bg-[#1B211E] rounded" />
          <div className="h-3.5 w-16 bg-[#F1EFE8] dark:bg-[#1B211E] rounded" />
        </div>
        <div className="h-5 w-3/4 bg-[#F1EFE8] dark:bg-[#1B211E] rounded" />
        <div className="h-3.5 w-1/2 bg-[#F1EFE8] dark:bg-[#1B211E] rounded" />
        <div className="pt-3 border-t border-[#E7E7DF] dark:border-[#262E2A] flex justify-between items-center">
          <div className="h-5 w-28 bg-[#F1EFE8] dark:bg-[#1B211E] rounded" />
          <div className="h-4 w-20 bg-[#F1EFE8] dark:bg-[#1B211E] rounded" />
        </div>
      </div>
    </div>
  );
}
