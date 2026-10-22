'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import {
  Search,
  MapPin,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Heart,
  Bell,
  Star,
  Wrench,
  MessageSquare,
  Building2,
  ShieldCheck,
  Loader2,
  KeyRound,
  Package,
  Users,
  Receipt,
  ChevronRight,
} from 'lucide-react';
import PropertyCard from '@/components/tenant-ui/PropertyCard';
import {
  Button,
  StatusBadge,
  EmptyState,
  formatCedis,
} from '@/components/tenant-ui/primitives';
import { getImageUrl } from '@/lib/utils';
import VisitorPassTab from '@/components/tenant/VisitorPassTab';
import PackageDeliveriesTab from '@/components/tenant/PackageDeliveriesTab';
import TenantPaymentScheduleTab from '@/components/tenant/TenantPaymentScheduleTab';

type ActiveResidentModalTool = 'visitors' | 'deliveries' | 'payments' | null;

function TenantDashboardContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [quickSearchType, setQuickSearchType] = useState('');
  const [activeResidentTool, setActiveResidentTool] = useState<ActiveResidentModalTool>(null);

  // 1. Authenticated User Session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data?.user;
    },
  });

  // 2. Tenant Bookings
  const { data: bookingsResponse, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', 'tenant'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/me');
      return data;
    },
  });

  // 3. Saved Properties (Wishlist)
  const { data: wishlistData, isLoading: wishlistLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const { data } = await api.get('/wishlist');
      return data;
    },
  });

  // 4. Recent Notifications
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get('/notifications');
      return data;
    },
  });

  // 5. Featured / Available Properties (for State A or discovery)
  const { data: featuredPropsData } = useQuery({
    queryKey: ['tenant-dashboard-featured-properties'],
    queryFn: async () => {
      const { data } = await api.get('/properties?limit=3');
      return data?.data || data?.properties || [];
    },
  });

  // Verify Paystack return params if redirected back to /dashboard/tenant
  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ bookingId, reference }: { bookingId: string; reference: string }) => {
      const res = await api.post(`/bookings/${bookingId}/verify-payment`, { reference });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] });
      toast.success('Payment verified! Your booking status has been updated.');
      window.history.replaceState({}, document.title, window.location.pathname);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Payment verification failed');
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const verifyId = urlParams.get('verify');
    const reference = urlParams.get('reference');
    const trxref = urlParams.get('trxref');

    if (verifyId && (reference || trxref)) {
      toast.loading('Verifying Paystack escrow deposit...', { id: 'payment-verifying' });
      verifyPaymentMutation.mutate(
        { bookingId: verifyId, reference: (reference || trxref) as string },
        {
          onSettled: () => {
            toast.dismiss('payment-verifying');
          },
        }
      );
    }
  }, []);

  const payBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.post(`/bookings/${bookingId}/pay`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.authorization_url) {
        toast.loading('Redirecting to secure Paystack checkout...');
        window.location.href = data.authorization_url;
      }
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          'Unable to initialize payment. Please ensure your lease agreement is signed.'
      );
    },
  });

  const bookings: any[] = bookingsResponse?.bookings || [];
  const savedProperties: any[] =
    wishlistData?.properties ||
    (wishlistData?.wishlists || []).map((w: any) => w.property).filter(Boolean);
  const notifications: any[] = Array.isArray(notificationsData)
    ? notificationsData
    : notificationsData?.notifications || [];
  const featuredProperties: any[] = Array.isArray(featuredPropsData) ? featuredPropsData : [];

  // Determine the Tenant's Current Dashboard State (Section 11.2)
  const dashboardState = useMemo(() => {
    // 1. Check for Pending Booking or Pending Payment (APPROVED/CONFIRMED awaiting lease or payment, or PENDING approval)
    const pendingOrAwaitingPayment = bookings.find((b) =>
      ['PENDING', 'APPROVED', 'CONFIRMED'].includes(b.status)
    );

    // 2. Check for Active / Upcoming Confirmed Stay (PAID / COMPLETED / ACTIVE / CHECKED_IN)
    const confirmedOrActiveStay = bookings.find(
      (b) =>
        ['ACTIVE', 'CHECKED_IN'].includes(b.status) ||
        (b.status === 'COMPLETED' && (b.isCheckedIn || new Date(b.endDate) >= new Date()))
    );

    // 3. Check for Past Completed Bookings
    const completedPastBookings = bookings.filter((b) => b.status === 'COMPLETED');
    const unreviewedCompletedBooking = completedPastBookings.find((b) => !b.review);

    if (pendingOrAwaitingPayment) {
      return {
        mode: 'PENDING_BOOKING' as const,
        primaryBooking: pendingOrAwaitingPayment,
      };
    }

    if (confirmedOrActiveStay) {
      return {
        mode: 'CONFIRMED_STAY' as const,
        primaryBooking: confirmedOrActiveStay,
      };
    }

    if (completedPastBookings.length > 0) {
      return {
        mode: 'RETURNING_TENANT' as const,
        primaryBooking: unreviewedCompletedBooking || completedPastBookings[0],
        needsReview: Boolean(unreviewedCompletedBooking),
      };
    }

    return {
      mode: 'NEW_TENANT' as const,
      primaryBooking: null,
    };
  }, [bookings]);

  const handleQuickSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (quickSearchQuery.trim()) params.set('search', quickSearchQuery.trim());
    if (quickSearchType) params.set('type', quickSearchType);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  if (sessionLoading || bookingsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 rounded-[16px] bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29]" />
        <div className="h-64 rounded-[16px] bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29]" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-72 rounded-[16px] bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29]" />
          <div className="lg:col-span-5 h-72 rounded-[16px] bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29]" />
        </div>
      </div>
    );
  }

  const firstName = session?.firstName || 'Resident';
  const primaryBooking = dashboardState.primaryBooking;

  return (
    <div className="space-y-8">
      {/* ── 1. Welcome Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E7E7DF] dark:border-[#262E29]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#557A67] dark:text-[#86B59C] mb-1">
            Resident Workspace
          </p>
          <h1 className="font-editorial text-2xl sm:text-3xl text-[#242925] dark:text-white">
            Akwaaba, {firstName}
          </h1>
          <p className="text-sm text-[#5E645E] dark:text-[#A0A8A2] mt-1">
            {dashboardState.mode === 'PENDING_BOOKING'
              ? 'You have an active reservation request in progress.'
              : dashboardState.mode === 'CONFIRMED_STAY'
              ? 'Your accommodation is confirmed and protected in escrow.'
              : dashboardState.mode === 'RETURNING_TENANT'
              ? 'Welcome back. Review your past stays or search for your next home.'
              : 'Explore verified student hostels, studios, and apartments across Ghana.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {primaryBooking ? (
            <Link
              href={`/dashboard/tenant/bookings/${primaryBooking.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-medium transition-colors"
            >
              <span>View Active Booking</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-medium transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Find a Home</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── 2. Primary Focus Card (Adapts to State A, B, C, or D) ── */}
      {dashboardState.mode === 'NEW_TENANT' && (
        <section className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-6 sm:p-8 shadow-2xs space-y-6">
          <div className="max-w-2xl space-y-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#1F7A4C] dark:text-[#6EE7B7]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Ghanaian Accommodations
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl text-[#242925] dark:text-white">
              Start your search for a verified home
            </h2>
            <p className="text-sm text-[#5E645E] dark:text-[#A0A8A2] leading-relaxed">
              Search by university campus, neighborhood, or accommodation type. Every listing displays transparent GH₵ pricing, room availability, and verified host details.
            </p>
          </div>

          <form
            onSubmit={handleQuickSearch}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-2 rounded-[14px] bg-[#F8F7F2] dark:bg-[#111513] border border-[#E7E7DF] dark:border-[#262E29]"
          >
            <div className="sm:col-span-6 relative flex items-center">
              <Search className="w-4 h-4 text-[#6F756F] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={quickSearchQuery}
                onChange={(e) => setQuickSearchQuery(e.target.value)}
                placeholder="Search Ayeduase, Legon, East Legon, Cape Coast..."
                aria-label="Search location or property name"
                className="w-full h-11 pl-10 pr-3.5 bg-white dark:bg-[#171C19] border border-[#D4D6CE] dark:border-[#2E3832] rounded-[10px] text-sm text-[#242925] dark:text-white placeholder:text-[#6F756F] focus:border-[#173D32] outline-none"
              />
            </div>
            <div className="sm:col-span-3">
              <select
                value={quickSearchType}
                onChange={(e) => setQuickSearchType(e.target.value)}
                aria-label="Accommodation type"
                className="w-full h-11 px-3.5 bg-white dark:bg-[#171C19] border border-[#D4D6CE] dark:border-[#2E3832] rounded-[10px] text-sm text-[#242925] dark:text-white focus:border-[#173D32] outline-none cursor-pointer"
              >
                <option value="">All Property Types</option>
                <option value="HOSTEL">Student Hostels</option>
                <option value="APARTMENT">Apartments &amp; Studios</option>
                <option value="HOUSE">Compound &amp; Family Houses</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="w-full h-11"
              >
                Search Homes
              </Button>
            </div>
          </form>

          {/* 3-Step How Booking Works Reassurance */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#E7E7DF] dark:border-[#262E29]">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#173D32] text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-[#242925] dark:text-white">
                  Compare &amp; Select a Room
                </p>
                <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2] mt-0.5">
                  Review real photos, amenities, and room/bed availability.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#173D32] text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-[#242925] dark:text-white">
                  Host Approval &amp; Digital Lease
                </p>
                <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2] mt-0.5">
                  Once approved, review and sign your Act 220 tenancy agreement.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-[#173D32] text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-[#242925] dark:text-white">
                  Protected Escrow Payment
                </p>
                <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2] mt-0.5">
                  Pay securely via Mobile Money or card before move-in.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {dashboardState.mode === 'PENDING_BOOKING' && primaryBooking && (
        <section className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-6 sm:p-7 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E7E7DF] dark:border-[#262E29]">
            <div className="flex items-center gap-2.5">
              <StatusBadge
                tone={primaryBooking.status === 'PENDING' ? 'warning' : 'info'}
              >
                {primaryBooking.status === 'PENDING'
                  ? 'Awaiting Landlord Approval'
                  : primaryBooking.leaseAgreement?.status === 'COMPLETED'
                  ? 'Approved • Ready for Escrow Payment'
                  : 'Approved • Lease Signature Required'}
              </StatusBadge>
              <span className="text-xs font-mono text-[#6F756F] dark:text-[#A0A8A2]">
                Ref #{primaryBooking.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <Link
              href={`/dashboard/tenant/bookings/${primaryBooking.id}`}
              className="text-xs font-medium text-[#173D32] dark:text-[#86B59C] hover:underline inline-flex items-center gap-1"
            >
              <span>Full Booking Details</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
            <div className="flex flex-col sm:flex-row gap-4 min-w-0 flex-1">
              <div className="relative w-full sm:w-44 h-32 rounded-[12px] overflow-hidden bg-[#F1EFE7] dark:bg-[#222925] shrink-0 border border-[#E7E7DF] dark:border-[#262E29]">
                <Image
                  src={
                    primaryBooking.property?.images?.[0]
                      ? getImageUrl(primaryBooking.property.images[0])
                      : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'
                  }
                  alt={primaryBooking.property?.title || 'Property'}
                  fill
                  sizes="176px"
                  className="object-cover"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <h2 className="font-editorial text-xl sm:text-2xl text-[#242925] dark:text-white truncate">
                  {primaryBooking.property?.title || 'Reserved Property'}
                </h2>
                <p className="text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#557A67] shrink-0" />
                  <span>{primaryBooking.property?.location}</span>
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-[#242925] dark:text-[#E5E7E4]">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-[#557A67]" />
                    {primaryBooking.bed?.label
                      ? `${primaryBooking.roomUnit?.name || 'Unit'} • ${primaryBooking.bed.label}`
                      : primaryBooking.room?.name || primaryBooking.room?.roomType || 'Standard Unit'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#5E645E] dark:text-[#A0A8A2]">
                    <Calendar className="w-3.5 h-3.5 text-[#557A67]" />
                    Move-in:{' '}
                    {new Date(primaryBooking.startDate).toLocaleDateString('en-GH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2] pt-1">
                  {primaryBooking.status === 'PENDING'
                    ? 'The property host is reviewing your reservation request. You will be notified as soon as it is approved.'
                    : primaryBooking.leaseAgreement?.status !== 'COMPLETED'
                    ? 'Your request has been approved! Please review and sign the digital tenancy agreement to unlock escrow payment.'
                    : 'Your digital tenancy agreement is complete. Proceed to secure your room via Paystack escrow.'}
                </p>
              </div>
            </div>

            {/* Action Area */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#E7E7DF] dark:border-[#262E29]">
              <div className="lg:text-right">
                <span className="text-[11px] uppercase tracking-wider text-[#6F756F] dark:text-[#A0A8A2] block">
                  Total Payable
                </span>
                <span className="text-xl font-bold text-[#242925] dark:text-white">
                  {formatCedis(
                    Number(
                      primaryBooking.price ||
                        primaryBooking.room?.price ||
                        primaryBooking.property?.price ||
                        0
                    ) + Number(primaryBooking.property?.cautionDeposit || 0)
                  )}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {['APPROVED', 'CONFIRMED'].includes(primaryBooking.status) &&
                  primaryBooking.leaseAgreement?.status !== 'COMPLETED' && (
                    <Link href={`/dashboard/agreements/${primaryBooking.id}`}>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<FileText className="w-4 h-4" />}
                      >
                        Review &amp; Sign Lease
                      </Button>
                    </Link>
                  )}

                {['APPROVED', 'CONFIRMED'].includes(primaryBooking.status) &&
                  primaryBooking.leaseAgreement?.status === 'COMPLETED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => payBookingMutation.mutate(primaryBooking.id)}
                      isLoading={payBookingMutation.isPending}
                      leftIcon={<CreditCard className="w-4 h-4" />}
                    >
                      Complete Escrow Payment
                    </Button>
                  )}

                <Link href={`/dashboard/tenant/bookings/${primaryBooking.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    View Booking Details
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {dashboardState.mode === 'CONFIRMED_STAY' && primaryBooking && (
        <section className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-6 sm:p-7 shadow-2xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E7E7DF] dark:border-[#262E29]">
            <div className="flex items-center gap-2.5">
              <StatusBadge tone="success">
                {primaryBooking.isCheckedIn ? 'Active Residency • Checked In' : 'Confirmed Upcoming Stay'}
              </StatusBadge>
              <span className="text-xs font-mono text-[#6F756F] dark:text-[#A0A8A2]">
                Ref #{primaryBooking.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <Link
              href={`/dashboard/tenant/bookings/${primaryBooking.id}`}
              className="text-xs font-medium text-[#173D32] dark:text-[#86B59C] hover:underline inline-flex items-center gap-1"
            >
              <span>Manage Residency</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
            <div className="flex flex-col sm:flex-row gap-4 min-w-0 flex-1">
              <div className="relative w-full sm:w-44 h-32 rounded-[12px] overflow-hidden bg-[#F1EFE7] dark:bg-[#222925] shrink-0 border border-[#E7E7DF] dark:border-[#262E29]">
                <Image
                  src={
                    primaryBooking.property?.images?.[0]
                      ? getImageUrl(primaryBooking.property.images[0])
                      : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'
                  }
                  alt={primaryBooking.property?.title || 'Property'}
                  fill
                  sizes="176px"
                  className="object-cover"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <h2 className="font-editorial text-xl sm:text-2xl text-[#242925] dark:text-white truncate">
                  {primaryBooking.property?.title || 'Confirmed Residence'}
                </h2>
                <p className="text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#557A67] shrink-0" />
                  <span>{primaryBooking.property?.location}</span>
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-[#242925] dark:text-[#E5E7E4]">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-[#557A67]" />
                    {primaryBooking.bed?.label
                      ? `${primaryBooking.roomUnit?.name || 'Unit'} • ${primaryBooking.bed.label}`
                      : primaryBooking.room?.name || primaryBooking.room?.roomType || 'Whole Unit'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[#5E645E] dark:text-[#A0A8A2]">
                    <Calendar className="w-3.5 h-3.5 text-[#557A67]" />
                    {new Date(primaryBooking.startDate).toLocaleDateString('en-GH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    &ndash;{' '}
                    {new Date(primaryBooking.endDate).toLocaleDateString('en-GH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions for Confirmed / Active Resident */}
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-[#E7E7DF] dark:border-[#262E29]">
              <Link
                href={`/dashboard/tenant/bookings/${primaryBooking.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-medium transition-colors"
              >
                <span>View Booking Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href={`/dashboard/agreements/${primaryBooking.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] border border-[#D4D6CE] dark:border-[#2E3832] hover:bg-[#F1EFE7] dark:hover:bg-[#222925] text-xs sm:text-sm font-medium text-[#242925] dark:text-white transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Agreement</span>
              </Link>
              <Link
                href="/dashboard/tenant/tickets/new"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] border border-[#D4D6CE] dark:border-[#2E3832] hover:bg-[#F1EFE7] dark:hover:bg-[#222925] text-xs sm:text-sm font-medium text-[#242925] dark:text-white transition-colors"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Report Issue</span>
              </Link>
              <Link
                href="/dashboard/messages"
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[10px] border border-[#D4D6CE] dark:border-[#2E3832] hover:bg-[#F1EFE7] dark:hover:bg-[#222925] text-xs sm:text-sm font-medium text-[#242925] dark:text-white transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Contact Host</span>
              </Link>
            </div>
          </div>

          {/* Active Residency Utility Strip */}
          <div className="pt-4 border-t border-[#E7E7DF] dark:border-[#262E29] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#5E645E] dark:text-[#A0A8A2]">
              Resident Compound Utilities:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={activeResidentTool === 'visitors' ? 'primary' : 'outline'}
                size="sm"
                onClick={() =>
                  setActiveResidentTool(activeResidentTool === 'visitors' ? null : 'visitors')
                }
                leftIcon={<KeyRound className="w-3.5 h-3.5" />}
              >
                Visitor Passes
              </Button>
              <Button
                type="button"
                variant={activeResidentTool === 'deliveries' ? 'primary' : 'outline'}
                size="sm"
                onClick={() =>
                  setActiveResidentTool(activeResidentTool === 'deliveries' ? null : 'deliveries')
                }
                leftIcon={<Package className="w-3.5 h-3.5" />}
              >
                Gatehouse Parcels
              </Button>
              <Button
                type="button"
                variant={activeResidentTool === 'payments' ? 'primary' : 'outline'}
                size="sm"
                onClick={() =>
                  setActiveResidentTool(activeResidentTool === 'payments' ? null : 'payments')
                }
                leftIcon={<Receipt className="w-3.5 h-3.5" />}
              >
                Rent Schedule
              </Button>
              <Link
                href="/dashboard/roommates"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F8F7F2] dark:bg-[#111513] text-[#242925] dark:text-white border border-[#E7E7DF] dark:border-[#262E29] hover:border-[#173D32] transition-colors"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Roommate Match</span>
              </Link>
            </div>
          </div>

          {activeResidentTool && (
            <div className="pt-4 border-t border-[#E7E7DF] dark:border-[#262E29]">
              {activeResidentTool === 'visitors' && <VisitorPassTab />}
              {activeResidentTool === 'deliveries' && <PackageDeliveriesTab />}
              {activeResidentTool === 'payments' && <TenantPaymentScheduleTab />}
            </div>
          )}
        </section>
      )}

      {dashboardState.mode === 'RETURNING_TENANT' && primaryBooking && (
        <section className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-6 sm:p-7 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <StatusBadge tone={dashboardState.needsReview ? 'warning' : 'neutral'}>
              {dashboardState.needsReview ? 'Share Your Experience' : 'Completed Tenancy'}
            </StatusBadge>
            <h2 className="font-editorial text-xl sm:text-2xl text-[#242925] dark:text-white">
              {dashboardState.needsReview
                ? `How was your stay at ${primaryBooking.property?.title || 'your recent residence'}?`
                : `Ready for your next accommodation?`}
            </h2>
            <p className="text-sm text-[#5E645E] dark:text-[#A0A8A2] leading-relaxed">
              {dashboardState.needsReview
                ? 'Your verified resident review helps fellow students and tenants make confident housing decisions across Ghana.'
                : 'Browse available hostels, apartments, and studios for the upcoming semester or tenancy period.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {dashboardState.needsReview && (
              <Link
                href="/dashboard/tenant/reviews/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-medium transition-colors"
              >
                <Star className="w-4 h-4" />
                <span>Leave a Verified Review</span>
              </Link>
            )}
            <Link
              href="/search"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] border border-[#D4D6CE] dark:border-[#2E3832] hover:bg-[#F1EFE7] dark:hover:bg-[#222925] text-sm font-medium text-[#242925] dark:text-white transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>Search Next Home</span>
            </Link>
          </div>
        </section>
      )}

      {/* ── 3. Secondary Two-Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Recent Bookings OR Featured Homes */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-editorial text-xl text-[#242925] dark:text-white">
                  {bookings.length > 0 ? 'Recent Bookings' : 'Available Properties to Explore'}
                </h2>
                <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2]">
                  {bookings.length > 0
                    ? 'Your latest reservation requests and tenancy records'
                    : 'Verified listings currently open for booking'}
                </p>
              </div>
              <Link
                href={bookings.length > 0 ? '/dashboard/tenant/bookings' : '/search'}
                className="text-xs font-medium text-[#173D32] dark:text-[#86B59C] hover:underline inline-flex items-center gap-1"
              >
                <span>{bookings.length > 0 ? 'View All' : 'Explore All'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {bookings.length > 0 ? (
              <div className="divide-y divide-[#E7E7DF] dark:divide-[#262E29]">
                {bookings.slice(0, 4).map((b: any) => {
                  const prop = b.property || {};
                  const total =
                    Number(b.price || b.room?.price || prop.price || 0) +
                    Number(prop.cautionDeposit || 0);
                  const tone = ['COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(b.status)
                    ? 'success'
                    : ['APPROVED', 'CONFIRMED'].includes(b.status)
                    ? 'info'
                    : b.status === 'PENDING'
                    ? 'warning'
                    : 'danger';

                  return (
                    <div
                      key={b.id}
                      className="py-3.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/tenant/bookings/${b.id}`}
                            className="text-sm font-semibold text-[#242925] dark:text-white hover:text-[#173D32] dark:hover:text-[#86B59C] truncate"
                          >
                            {prop.title || 'Accommodation'}
                          </Link>
                          <StatusBadge tone={tone}>
                            {b.isCheckedIn ? 'Checked In' : b.status}
                          </StatusBadge>
                        </div>
                        <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2] flex flex-wrap items-center gap-2">
                          <span>{prop.location}</span>
                          <span>•</span>
                          <span>
                            {new Date(b.startDate).toLocaleDateString('en-GH', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="text-sm font-bold text-[#242925] dark:text-white">
                          {formatCedis(total)}
                        </span>
                        <Link
                          href={`/dashboard/tenant/bookings/${b.id}`}
                          className="px-3 py-1.5 rounded-[8px] border border-[#D4D6CE] dark:border-[#2E3832] hover:bg-[#F1EFE7] dark:hover:bg-[#222925] text-xs font-medium text-[#242925] dark:text-white transition-colors"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : featuredProperties.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {featuredProperties.slice(0, 2).map((prop: any) => (
                  <PropertyCard key={prop.id} property={prop} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Building2 className="w-6 h-6" />}
                title="No bookings yet"
                description="Explore verified hostels and apartments to make your first reservation."
                action={
                  <Link
                    href="/search"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#173D32] text-white text-xs font-medium"
                  >
                    Browse Properties
                  </Link>
                }
              />
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Saved Properties Summary & Recent Notifications */}
        <div className="lg:col-span-5 space-y-6">
          {/* Saved Properties Card */}
          <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#C77B59]" />
                <h2 className="font-editorial text-lg text-[#242925] dark:text-white">
                  Saved Properties ({savedProperties.length})
                </h2>
              </div>
              <Link
                href="/dashboard/wishlist"
                className="text-xs font-medium text-[#173D32] dark:text-[#86B59C] hover:underline"
              >
                View All
              </Link>
            </div>

            {wishlistLoading ? (
              <div className="h-24 rounded-[12px] bg-[#F8F7F2] dark:bg-[#111513] animate-pulse" />
            ) : savedProperties.length === 0 ? (
              <div className="p-4 rounded-[12px] bg-[#F8F7F2] dark:bg-[#111513] border border-[#E7E7DF] dark:border-[#262E29] text-center space-y-2">
                <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2]">
                  You haven&apos;t saved any properties to your shortlist yet.
                </p>
                <Link
                  href="/search"
                  className="inline-block text-xs font-semibold text-[#173D32] dark:text-[#86B59C] hover:underline"
                >
                  Explore homes to shortlist &rarr;
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {savedProperties.slice(0, 3).map((prop: any) => (
                  <Link
                    key={prop.id}
                    href={`/properties/${prop.id}`}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-[12px] hover:bg-[#F8F7F2] dark:hover:bg-[#111513] border border-transparent hover:border-[#E7E7DF] dark:hover:border-[#262E29] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-14 h-12 rounded-[8px] overflow-hidden bg-[#F1EFE7] shrink-0">
                        <Image
                          src={
                            prop.images?.[0]
                              ? getImageUrl(prop.images[0])
                              : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=300&q=80'
                          }
                          alt={prop.title || 'Saved Property'}
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-[#242925] dark:text-white truncate">
                          {prop.title}
                        </p>
                        <p className="text-[11px] text-[#5E645E] dark:text-[#A0A8A2] truncate">
                          {prop.location}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#242925] dark:text-white shrink-0">
                      {formatCedis(prop.price)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notifications Card */}
          <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#557A67]" />
                <h2 className="font-editorial text-lg text-[#242925] dark:text-white">
                  Recent Notifications
                </h2>
              </div>
              <Link
                href="/dashboard/notifications"
                className="text-xs font-medium text-[#173D32] dark:text-[#86B59C] hover:underline"
              >
                View All
              </Link>
            </div>

            {notificationsLoading ? (
              <div className="h-24 rounded-[12px] bg-[#F8F7F2] dark:bg-[#111513] animate-pulse" />
            ) : notifications.length === 0 ? (
              <div className="p-4 rounded-[12px] bg-[#F8F7F2] dark:bg-[#111513] border border-[#E7E7DF] dark:border-[#262E29] text-center">
                <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2]">
                  You&apos;re all caught up. Important booking and payment updates will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E7E7DF] dark:divide-[#262E29]">
                {notifications.slice(0, 3).map((n: any) => (
                  <div key={n.id} className="py-2.5 first:pt-0 last:pb-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#242925] dark:text-white truncate">
                        {n.title || 'Account Update'}
                      </p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#173D32] dark:bg-[#86B59C] shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2] line-clamp-2">
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Quick Search / Explore Strip ── */}
      <div className="bg-[#F1EFE7] dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-editorial text-lg text-[#242925] dark:text-white">
            Looking for another hostel, studio, or apartment?
          </h3>
          <p className="text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2]">
            Filter verified listings across Accra, Kumasi, Cape Coast, and major university campuses.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href="/search?type=HOSTEL"
            className="px-3.5 py-2 rounded-[10px] bg-white dark:bg-[#111513] border border-[#D4D6CE] dark:border-[#2E3832] text-xs font-medium text-[#242925] dark:text-white hover:border-[#173D32] transition-colors"
          >
            Student Hostels
          </Link>
          <Link
            href="/search?type=APARTMENT"
            className="px-3.5 py-2 rounded-[10px] bg-white dark:bg-[#111513] border border-[#D4D6CE] dark:border-[#2E3832] text-xs font-medium text-[#242925] dark:text-white hover:border-[#173D32] transition-colors"
          >
            Apartments
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-medium transition-colors"
          >
            <span>Browse All Properties</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function TenantDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#173D32]" />
        </div>
      }
    >
      <TenantDashboardContent />
    </Suspense>
  );
}
