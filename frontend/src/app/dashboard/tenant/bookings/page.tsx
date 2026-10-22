'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import {
  CalendarCheck,
  MapPin,
  Calendar,
  ArrowRight,
  CreditCard,
  FileText,
  XCircle,
  Loader2,
  Building2,
} from 'lucide-react';
import {
  Button,
  StatusBadge,
  EmptyState,
  ErrorState,
  formatCedis,
} from '@/components/tenant-ui/primitives';
import { getImageUrl } from '@/lib/utils';

type BookingFilterTab = 'ALL' | 'UPCOMING' | 'PENDING' | 'COMPLETED' | 'CANCELLED';

const FILTER_TABS: { id: BookingFilterTab; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'UPCOMING', label: 'Upcoming / Active' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function TenantBookingsOverviewPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<BookingFilterTab>('ALL');
  const [bookingToCancel, setBookingToCancel] = useState<any | null>(null);

  const {
    data: bookingsResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['bookings', 'tenant'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/me');
      return data;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data } = await api.post(`/bookings/${bookingId}/cancel`);
      return data;
    },
    onSuccess: () => {
      toast.success('Booking request cancelled.');
      setBookingToCancel(null);
      queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Unable to cancel booking.');
    },
  });

  const allBookings: any[] = bookingsResponse?.bookings || [];

  const counts = useMemo(() => {
    return {
      ALL: allBookings.length,
      UPCOMING: allBookings.filter((b) =>
        ['APPROVED', 'CONFIRMED', 'ACTIVE', 'CHECKED_IN'].includes(b.status) ||
        (b.status === 'COMPLETED' && b.isCheckedIn)
      ).length,
      PENDING: allBookings.filter((b) => b.status === 'PENDING').length,
      COMPLETED: allBookings.filter((b) => b.status === 'COMPLETED').length,
      CANCELLED: allBookings.filter((b) => ['CANCELLED', 'REJECTED'].includes(b.status)).length,
    };
  }, [allBookings]);

  const filteredBookings = useMemo(() => {
    if (activeTab === 'ALL') return allBookings;
    if (activeTab === 'UPCOMING') {
      return allBookings.filter(
        (b) =>
          ['APPROVED', 'CONFIRMED', 'ACTIVE', 'CHECKED_IN'].includes(b.status) ||
          (b.status === 'COMPLETED' && b.isCheckedIn)
      );
    }
    if (activeTab === 'PENDING') {
      return allBookings.filter((b) => b.status === 'PENDING');
    }
    if (activeTab === 'COMPLETED') {
      return allBookings.filter((b) => b.status === 'COMPLETED');
    }
    return allBookings.filter((b) => ['CANCELLED', 'REJECTED'].includes(b.status));
  }, [allBookings, activeTab]);

  const getStatusTone = (status: string, isCheckedIn?: boolean) => {
    if (isCheckedIn || ['COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(status)) return 'success' as const;
    if (['APPROVED', 'CONFIRMED'].includes(status)) return 'info' as const;
    if (status === 'PENDING') return 'warning' as const;
    if (['CANCELLED', 'REJECTED'].includes(status)) return 'danger' as const;
    return 'neutral' as const;
  };

  const getPaymentStatusLabel = (b: any) => {
    const hasCompletedTx = Array.isArray(b.transactions) && b.transactions.some((tx: any) => tx.status === 'COMPLETED' || tx.status === 'SUCCESS');
    if (hasCompletedTx || ['COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(b.status)) {
      return { label: 'Paid in Escrow', tone: 'success' as const };
    }
    if (['CANCELLED', 'REJECTED'].includes(b.status)) {
      return { label: 'No Payment Due', tone: 'neutral' as const };
    }
    if (['APPROVED', 'CONFIRMED'].includes(b.status)) {
      return { label: 'Awaiting Payment', tone: 'warning' as const };
    }
    return { label: 'Unpaid (Pending Approval)', tone: 'neutral' as const };
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E7E7DF] dark:border-[#262E29]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#557A67] dark:text-[#86B59C] mb-1">
            Reservations &amp; Tenancies
          </p>
          <h1 className="font-editorial text-2xl sm:text-3xl text-[#242925] dark:text-white">
            My Bookings
          </h1>
          <p className="text-sm text-[#5E645E] dark:text-[#A0A8A2] mt-1">
            Track your reservation requests, digital tenancy agreements, and escrow payments.
          </p>
        </div>

        <Link
          href="/search"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#173D32] hover:bg-[#102C24] text-white text-sm font-medium transition-colors self-start sm:self-auto"
        >
          <span>Find Another Home</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#173D32] text-white shadow-xs'
                  : 'bg-white dark:bg-[#171C19] text-[#5E645E] dark:text-[#A0A8A2] border border-[#E7E7DF] dark:border-[#262E29] hover:text-[#242925] dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-[#F1EFE7] dark:bg-[#222925] text-[#5E645E] dark:text-[#A0A8A2]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-[16px] bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Unable to load your bookings"
          message="We couldn't retrieve your reservation history right now. Please try again."
          onRetry={() => refetch()}
        />
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck className="w-6 h-6" />}
          title={
            activeTab === 'ALL'
              ? 'No bookings yet'
              : `No ${FILTER_TABS.find((t) => t.id === activeTab)?.label.toLowerCase()} bookings`
          }
          description={
            activeTab === 'ALL'
              ? 'Browse verified student hostels, apartments, and compound houses across Ghana to submit your first reservation request.'
              : 'You have no bookings matching this status filter.'
          }
          action={
            activeTab === 'ALL' ? (
              <Link
                href="/search"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#173D32] hover:bg-[#102C24] text-white text-sm font-medium transition-colors"
              >
                <span>Browse Properties</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] border border-[#D4D6CE] dark:border-[#2E3832] text-xs font-medium text-[#242925] dark:text-white cursor-pointer"
              >
                Show All Bookings
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking: any) => {
            const prop = booking.property || {};
            const images = Array.isArray(prop.images) ? prop.images : [];
            const imageUrl =
              images.length > 0
                ? getImageUrl(images[0])
                : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80';
            const totalAmount =
              Number(booking.price || booking.room?.price || prop.price || 0) +
              Number(prop.cautionDeposit || 0);
            const paymentStatus = getPaymentStatusLabel(booking);
            const unitSummary = booking.bed?.label
              ? `${booking.room?.name || booking.room?.roomType || 'Room'} • ${booking.roomUnit?.name || 'Unit'} • ${booking.bed.label}`
              : booking.room?.name || booking.room?.roomType || 'Entire Unit';

            return (
              <article
                key={booking.id}
                className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-4 sm:p-6 shadow-2xs hover:border-[#C5C8BE] dark:hover:border-[#38433C] transition-all"
              >
                <div className="flex flex-col lg:flex-row gap-5 justify-between">
                  {/* Left: Property Image & Summary */}
                  <div className="flex flex-col sm:flex-row gap-4 min-w-0 flex-1">
                    <Link
                      href={`/dashboard/tenant/bookings/${booking.id}`}
                      className="relative w-full sm:w-44 h-36 sm:h-32 rounded-[12px] overflow-hidden bg-[#F1EFE7] dark:bg-[#222925] shrink-0 border border-[#E7E7DF] dark:border-[#262E29]"
                    >
                      <Image
                        src={imageUrl}
                        alt={prop.title || 'Property'}
                        fill
                        sizes="(max-width: 640px) 100vw, 176px"
                        className="object-cover"
                      />
                    </Link>

                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono text-[#6F756F] dark:text-[#A0A8A2]">
                          Ref #{booking.id.slice(0, 8).toUpperCase()}
                        </span>
                        <StatusBadge
                          tone={getStatusTone(booking.status, booking.isCheckedIn)}
                        >
                          {booking.isCheckedIn ? 'Checked In' : booking.status}
                        </StatusBadge>
                        <StatusBadge tone={paymentStatus.tone}>
                          {paymentStatus.label}
                        </StatusBadge>
                      </div>

                      <Link
                        href={`/dashboard/tenant/bookings/${booking.id}`}
                        className="block text-lg font-semibold text-[#242925] dark:text-white hover:text-[#173D32] dark:hover:text-[#86B59C] transition-colors truncate"
                      >
                        {prop.title || 'Reserved Accommodation'}
                      </Link>

                      <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#557A67] shrink-0" />
                        <span className="truncate">{prop.location || 'Ghana'}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-[#5E645E] dark:text-[#A0A8A2]">
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#242925] dark:text-[#E5E7E4]">
                          <Building2 className="w-3.5 h-3.5 text-[#557A67]" />
                          {unitSummary}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#557A67]" />
                          {new Date(booking.startDate).toLocaleDateString('en-GH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          &ndash;{' '}
                          {new Date(booking.endDate).toLocaleDateString('en-GH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Total Price & Primary Actions */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-[#E7E7DF] dark:border-[#262E29] shrink-0">
                    <div className="lg:text-right">
                      <span className="text-[11px] uppercase tracking-wider text-[#6F756F] dark:text-[#A0A8A2] block">
                        Total Amount
                      </span>
                      <span className="text-lg font-bold text-[#242925] dark:text-white">
                        {formatCedis(totalAmount)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {booking.status === 'PENDING' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setBookingToCancel(booking)}
                        >
                          Cancel Request
                        </Button>
                      )}

                      {['APPROVED', 'CONFIRMED'].includes(booking.status) &&
                        booking.leaseAgreement?.status !== 'COMPLETED' && (
                          <Link href={`/dashboard/agreements/${booking.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<FileText className="w-3.5 h-3.5" />}
                            >
                              Sign Lease
                            </Button>
                          </Link>
                        )}

                      <Link href={`/dashboard/tenant/bookings/${booking.id}`}>
                        <Button
                          variant="primary"
                          size="sm"
                          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                        >
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Cancellation Confirmation Dialog */}
      {bookingToCancel && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-booking-title"
        >
          <div className="w-full max-w-md bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-6 space-y-4 shadow-xl">
            <div className="w-11 h-11 rounded-full bg-[#FEF3F2] dark:bg-[#450A0A]/50 text-[#B42318] dark:text-[#FCA5A5] flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>

            <div className="space-y-1.5">
              <h2
                id="cancel-booking-title"
                className="font-editorial text-xl text-[#242925] dark:text-white"
              >
                Cancel booking request?
              </h2>
              <p className="text-sm text-[#5E645E] dark:text-[#A0A8A2] leading-relaxed">
                Are you sure you want to cancel your reservation request for{' '}
                <strong className="text-[#242925] dark:text-white">
                  {bookingToCancel.property?.title || 'this property'}
                </strong>
                ? Pending requests can be cancelled without penalty before payment.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBookingToCancel(null)}
                disabled={cancelMutation.isPending}
              >
                Keep Booking
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => cancelMutation.mutate(bookingToCancel.id)}
                isLoading={cancelMutation.isPending}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
