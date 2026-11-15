export interface RentDueSummary {
  nextDueDate: string;
  daysUntilDue: number;
  isDueSoon: boolean;
  isOverdue: boolean;
  billingPeriod: string;
}

/**
 * Adds one billing cycle (from Property.pricePeriod) to a reference date.
 */
export function addBillingPeriod(fromDate: Date, pricePeriod?: string | null): Date {
  const next = new Date(fromDate.getTime());
  const normalized = String(pricePeriod || 'Monthly').trim().toLowerCase();

  if (normalized.includes('daily') || normalized.includes('nightly')) {
    next.setDate(next.getDate() + 1);
  } else if (normalized.includes('week')) {
    next.setDate(next.getDate() + 7);
  } else if (normalized.includes('quarter')) {
    next.setMonth(next.getMonth() + 3);
  } else if (normalized.includes('semester')) {
    next.setMonth(next.getMonth() + 4);
  } else if (normalized.includes('year') || normalized.includes('annual')) {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    // Default: Monthly
    next.setMonth(next.getMonth() + 1);
  }

  return next;
}

/**
 * Computes the initial nextRentDueDate when a booking is paid/confirmed,
 * capped by booking.endDate when endDate is after startDate.
 */
export function computeInitialNextRentDueDate(
  startDate: Date | string,
  endDate: Date | string,
  pricePeriod?: string | null
): Date {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const cycleEnd = addBillingPeriod(start, pricePeriod);

  if (end > start && cycleEnd > end) {
    return end;
  }
  return cycleEnd;
}

/**
 * Computes live rent-due status for active/paid bookings.
 */
export function getRentDueSummary(
  booking: {
    startDate: Date | string;
    endDate: Date | string;
    nextRentDueDate?: Date | string | null;
    status: string;
  },
  pricePeriod?: string | null
): RentDueSummary | null {
  if (!['COMPLETED', 'ACTIVE', 'CHECKED_IN', 'CONFIRMED'].includes(booking.status)) {
    return null;
  }

  const dueDate = booking.nextRentDueDate
    ? new Date(booking.nextRentDueDate)
    : computeInitialNextRentDueDate(booking.startDate, booking.endDate, pricePeriod);

  const now = new Date();
  const diffMs = dueDate.getTime() - now.getTime();
  const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    nextDueDate: dueDate.toISOString(),
    daysUntilDue,
    isDueSoon: daysUntilDue >= 0 && daysUntilDue <= 7,
    isOverdue: daysUntilDue < 0,
    billingPeriod: pricePeriod || 'Monthly',
  };
}
