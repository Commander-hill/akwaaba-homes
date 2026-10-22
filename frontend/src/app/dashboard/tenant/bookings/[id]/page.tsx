'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Download,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Star,
  Wrench,
  Lock,
  HelpCircle,
  Loader2,
  Phone,
  Mail,
} from 'lucide-react';
import { Button, StatusBadge, formatCedis } from '@/components/tenant-ui/primitives';
import { getImageUrl } from '@/lib/utils';

export default function TenantBookingDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const bookingId = params?.id as string;
  const paymentRef = searchParams.get('reference') || searchParams.get('trxref');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['booking-detail', bookingId],
    queryFn: async () => {
      const res = await api.get(`/bookings/${bookingId}`);
      return res.data;
    },
    enabled: Boolean(bookingId),
  });

  const booking = data?.booking;

  // Verify Paystack payment if redirected back with reference
  useEffect(() => {
    if (paymentRef && bookingId) {
      api
        .post(`/bookings/${bookingId}/verify-payment`, { reference: paymentRef })
        .then(() => {
          toast.success('Escrow payment verified!');
          refetch();
          queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] });
        })
        .catch(() => {
          // silently ignore if already verified
        });
    }
  }, [paymentRef, bookingId, refetch, queryClient]);

  const payMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/bookings/${bookingId}/pay`);
      return res.data;
    },
    onSuccess: (resData) => {
      if (resData?.authorization_url) {
        toast.loading('Redirecting to secure Paystack checkout...');
        window.location.href = resData.authorization_url;
      } else {
        toast.success('Payment processed successfully!');
        refetch();
        queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] });
      }
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message ||
          'Unable to initiate payment. Ensure your lease agreement is signed.'
      );
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/bookings/${bookingId}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Booking application cancelled.');
      setShowCancelModal(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Unable to cancel booking.');
    },
  });

  const handleDownloadPdf = async () => {
    if (!bookingId) return;
    setIsDownloadingPdf(true);
    try {
      const res = await api.get(`/bookings/${bookingId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Akwaaba_Homes_Lease_${bookingId.slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Tenancy agreement PDF downloaded.');
    } catch {
      toast.error('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-4 space-y-6 animate-pulse">
        <div className="h-6 w-40 bg-[#E7E7DF] dark:bg-[#262E29] rounded" />
        <div className="h-44 bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px]" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-72 bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px]" />
          <div className="h-72 bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px]" />
        </div>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-8 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-[#B45309] mx-auto" />
          <h1 className="font-editorial text-2xl text-[#242925] dark:text-white">
            Booking Record Not Found
          </h1>
          <p className="text-sm text-[#5E645E] dark:text-[#A0A8A2] max-w-md mx-auto">
            This booking may have been removed or you may not have permission to view it.
          </p>
          <Link
            href="/dashboard/tenant/bookings"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Bookings</span>
          </Link>
        </div>
      </div>
    );
  }

  const prop = booking.property || {};
  const landlord = prop.landlord || {};
  const rentAmount = Number(booking.price || booking.room?.price || prop.price || 0);
  const cautionDeposit = Number(prop.cautionDeposit || 0);
  const totalPayable = rentAmount + cautionDeposit;

  const isCompletedOrActive = ['COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(booking.status);
  const isApproved = booking.status === 'APPROVED' || booking.status === 'CONFIRMED';
  const isPending = booking.status === 'PENDING';
  const isCancelledOrRejected = booking.status === 'CANCELLED' || booking.status === 'REJECTED';
  const leaseStatus = booking.leaseAgreement?.status || 'NONE';
  const isLeaseCompleted = leaseStatus === 'COMPLETED';

  const statusTone = isCompletedOrActive
    ? 'success'
    : isApproved
    ? 'info'
    : isPending
    ? 'warning'
    : 'danger';

  const timelineSteps = [
    {
      label: 'Application Submitted',
      desc: new Date(booking.createdAt).toLocaleDateString('en-GH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      done: true,
    },
    {
      label: 'Landlord Approval',
      desc: isCancelledOrRejected
        ? `Status: ${booking.status}`
        : isPending
        ? 'Awaiting host review'
        : 'Approved by property host',
      done: isApproved || isCompletedOrActive,
    },
    {
      label: 'Digital Tenancy Lease',
      desc:
        leaseStatus === 'COMPLETED'
          ? 'Countersigned by both parties'
          : leaseStatus === 'SIGNED_BY_TENANT'
          ? 'Signed by you • Awaiting host'
          : 'Review & sign digital lease',
      done: isLeaseCompleted || isCompletedOrActive,
    },
    {
      label: 'Escrow Payment & Move-In',
      desc: isCompletedOrActive
        ? booking.isCheckedIn
          ? 'Checked in • Active Residency'
          : 'Paid into Escrow • Ready for Check-In'
        : 'Pay via Mobile Money / Card',
      done: isCompletedOrActive,
    },
  ];

  const primaryImage =
    Array.isArray(prop.images) && prop.images.length > 0
      ? getImageUrl(prop.images[0])
      : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb & Reference Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/dashboard/tenant/bookings"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-[#5E645E] dark:text-[#A0A8A2] hover:text-[#242925] dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Bookings</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono text-[#6F756F] dark:text-[#A0A8A2]">
            Booking Ref:{' '}
            <strong className="text-[#242925] dark:text-white">
              #{booking.id.slice(0, 8).toUpperCase()}
            </strong>
          </span>
          <StatusBadge tone={statusTone}>
            {booking.isCheckedIn ? 'Checked In' : booking.status}
          </StatusBadge>
        </div>
      </div>

      {/* Property Banner Card */}
      <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0">
          <div className="relative w-full sm:w-36 h-28 rounded-[12px] overflow-hidden bg-[#F1EFE7] dark:bg-[#222925] shrink-0 border border-[#E7E7DF] dark:border-[#262E29]">
            <Image
              src={primaryImage}
              alt={prop.title || 'Property'}
              fill
              sizes="144px"
              className="object-cover"
            />
          </div>
          <div className="space-y-1.5 min-w-0">
            <span className="inline-block text-[11px] uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F1EFE7] dark:bg-[#222925] text-[#5E645E] dark:text-[#A0A8A2] font-semibold">
              {prop.type?.replace(/_/g, ' ') || 'ACCOMMODATION'}
            </span>
            <h1 className="font-editorial text-xl sm:text-2xl text-[#242925] dark:text-white truncate">
              {prop.title || 'Reserved Accommodation'}
            </h1>
            <p className="text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#557A67] shrink-0" />
              <span>{prop.location}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-[#242925] dark:text-[#E5E7E4]">
              {booking.room && (
                <span className="font-medium">
                  Room: {booking.room.name || booking.room.roomType}
                </span>
              )}
              {booking.roomUnit && <span>• Unit: {booking.roomUnit.name}</span>}
              {booking.bed && <span>• Bed: {booking.bed.label}</span>}
            </div>
          </div>
        </div>

        <Link
          href={`/properties/${prop.id}`}
          className="px-4 py-2.5 rounded-[10px] border border-[#D4D6CE] dark:border-[#2E3832] hover:border-[#173D32] text-xs sm:text-sm font-medium text-[#242925] dark:text-white shrink-0 transition-colors"
        >
          View Property Listing
        </Link>
      </div>

      {/* Booking Lifecycle Timeline */}
      <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-5 sm:p-6 shadow-2xs">
        <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-[#6F756F] dark:text-[#A0A8A2] mb-4">
          Reservation &amp; Tenancy Progression
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {timelineSteps.map((s, idx) => (
            <div
              key={s.label}
              className={`p-3.5 rounded-[12px] border ${
                s.done
                  ? 'bg-[#ECFDF3]/60 dark:bg-[#064E3B]/25 border-[#A7F3D0] dark:border-[#065F46]'
                  : 'bg-[#F8F7F2] dark:bg-[#111513] border-[#E7E7DF] dark:border-[#262E29]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono font-semibold text-[#6F756F] dark:text-[#A0A8A2]">
                  STEP 0{idx + 1}
                </span>
                {s.done ? (
                  <CheckCircle2 className="w-4 h-4 text-[#1F7A4C] dark:text-[#6EE7B7]" />
                ) : (
                  <Clock className="w-4 h-4 text-[#6F756F]" />
                )}
              </div>
              <p className="text-xs sm:text-sm font-semibold text-[#242925] dark:text-white">
                {s.label}
              </p>
              <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2] mt-0.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stay Details, Lease Agreement, Check-in & House Rules */}
        <div className="lg:col-span-7 space-y-6">
          {/* Stay Dates & Allocation */}
          <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#242925] dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#173D32] dark:text-[#86B59C]" />
              <span>Tenancy Period &amp; Room Allocation</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-3.5 rounded-[12px] bg-[#F8F7F2] dark:bg-[#111513] border border-[#E7E7DF] dark:border-[#262E29]">
                <span className="text-[11px] uppercase tracking-wider text-[#6F756F] dark:text-[#A0A8A2] block">
                  Move-In Date
                </span>
                <span className="text-sm font-semibold text-[#242925] dark:text-white mt-0.5 block">
                  {new Date(booking.startDate).toLocaleDateString('en-GH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="p-3.5 rounded-[12px] bg-[#F8F7F2] dark:bg-[#111513] border border-[#E7E7DF] dark:border-[#262E29]">
                <span className="text-[11px] uppercase tracking-wider text-[#6F756F] dark:text-[#A0A8A2] block">
                  Move-Out Date
                </span>
                <span className="text-sm font-semibold text-[#242925] dark:text-white mt-0.5 block">
                  {new Date(booking.endDate).toLocaleDateString('en-GH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="p-3.5 rounded-[12px] bg-[#F8F7F2] dark:bg-[#111513] border border-[#E7E7DF] dark:border-[#262E29] col-span-2 sm:col-span-1">
                <span className="text-[11px] uppercase tracking-wider text-[#6F756F] dark:text-[#A0A8A2] block">
                  Assigned Space
                </span>
                <span className="text-sm font-semibold text-[#242925] dark:text-white mt-0.5 block">
                  {booking.bed?.label
                    ? `${booking.roomUnit?.name || 'Unit'} • ${booking.bed.label}`
                    : booking.room?.name || booking.room?.roomType || 'Whole Unit'}
                </span>
              </div>
            </div>

            {/* Check-in Instructions & House Rules */}
            <div className="pt-4 border-t border-[#E7E7DF] dark:border-[#262E29] space-y-2.5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-[#6F756F] dark:text-[#A0A8A2]">
                Check-In Guidelines &amp; Compound Rules
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-[10px] bg-[#F8F7F2] dark:bg-[#111513] border border-[#E7E7DF] dark:border-[#262E29]">
                  <span className="text-[11px] text-[#6F756F] dark:text-[#A0A8A2] block">
                    Gate Curfew
                  </span>
                  <span className="font-semibold text-[#242925] dark:text-white mt-0.5 block">
                    {prop.gateLockTime || '24/7 Access'}
                  </span>
                </div>
                <div className="p-3 rounded-[10px] bg-[#F8F7F2] dark:bg-[#111513] border border-[#E7E7DF] dark:border-[#262E29]">
                  <span className="text-[11px] text-[#6F756F] dark:text-[#A0A8A2] block">
                    Visitor Policy
                  </span>
                  <span className="font-semibold text-[#242925] dark:text-white mt-0.5 block">
                    {prop.visitorPolicy || 'Standard Guest Hours'}
                  </span>
                </div>
                <div className="p-3 rounded-[10px] bg-[#F8F7F2] dark:bg-[#111513] border border-[#E7E7DF] dark:border-[#262E29]">
                  <span className="text-[11px] text-[#6F756F] dark:text-[#A0A8A2] block">
                    Quiet Hours
                  </span>
                  <span className="font-semibold text-[#242925] dark:text-white mt-0.5 block">
                    {prop.quietHours || '10:00 PM – 6:00 AM'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Digital Lease Agreement Card */}
          <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#242925] dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#173D32] dark:text-[#86B59C]" />
                <span>Digital Tenancy Agreement (Act 220)</span>
              </h2>
              <StatusBadge tone={isLeaseCompleted ? 'success' : 'neutral'}>
                {leaseStatus.replace(/_/g, ' ')}
              </StatusBadge>
            </div>

            <p className="text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2] leading-relaxed">
              Your tenancy agreement records the agreed rent, refundable caution deposit, utility responsibilities, and statutory rights under the Ghana Rent Act, 1963 (Act 220).
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link href={`/dashboard/agreements/${booking.id}`}>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<FileText className="w-4 h-4" />}
                >
                  {isLeaseCompleted ? 'View Signed Agreement' : 'Review & Sign Lease Agreement'}
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                isLoading={isDownloadingPdf}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Download PDF Copy
              </Button>
            </div>
          </div>

          {/* Landlord / Host Contact Card */}
          <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#242925] dark:text-white">
                  Property Host: {landlord.firstName || 'Landlord'} {landlord.lastName || ''}
                </h2>
                {landlord.isVerifiedLandlord && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#ECFDF3] dark:bg-[#064E3B]/40 text-[#1F7A4C] dark:text-[#6EE7B7]">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Host
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#5E645E] dark:text-[#A0A8A2] pt-1">
                {landlord.phoneNumber && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {landlord.phoneNumber}
                  </span>
                )}
                {landlord.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {landlord.email}
                  </span>
                )}
              </div>
            </div>

            <Link
              href="/dashboard/messages"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[10px] border border-[#D4D6CE] dark:border-[#2E3832] hover:bg-[#F1EFE7] dark:hover:bg-[#222925] text-[#242925] dark:text-white text-xs sm:text-sm font-medium shrink-0 self-start sm:self-center transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Message Host</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Price Breakdown, Payment & Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#E7E7DF] dark:border-[#262E29] pb-3">
              <h2 className="text-base font-semibold text-[#242925] dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#173D32] dark:text-[#86B59C]" />
                <span>Price Breakdown</span>
              </h2>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1F7A4C] dark:text-[#6EE7B7]">
                <Lock className="w-3.5 h-3.5" /> Escrow Protected
              </span>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-[#5E645E] dark:text-[#A0A8A2]">
                <span>Base Tenancy Rent</span>
                <span className="font-semibold text-[#242925] dark:text-white">
                  {formatCedis(rentAmount)}
                </span>
              </div>
              <div className="flex justify-between text-[#5E645E] dark:text-[#A0A8A2]">
                <span>Refundable Caution Deposit</span>
                <span className="font-semibold text-[#242925] dark:text-white">
                  {cautionDeposit > 0 ? formatCedis(cautionDeposit) : 'GH₵ 0'}
                </span>
              </div>
              <div className="flex justify-between text-[#5E645E] dark:text-[#A0A8A2]">
                <span>Platform Booking Fee</span>
                <span className="font-medium text-[#1F7A4C] dark:text-[#6EE7B7]">
                  GH₵ 0 (No Tenant Fee)
                </span>
              </div>
              <div className="pt-3 border-t border-[#E7E7DF] dark:border-[#262E29] flex justify-between items-baseline">
                <span className="font-semibold text-[#242925] dark:text-white">Total Amount</span>
                <span className="text-xl font-bold text-[#242925] dark:text-white">
                  {formatCedis(totalPayable)}
                </span>
              </div>
            </div>

            {/* Payment / Action Controls depending on Booking Status */}
            {isCompletedOrActive ? (
              <div className="p-4 rounded-[12px] bg-[#ECFDF3] dark:bg-[#064E3B]/30 border border-[#A7F3D0] dark:border-[#065F46] space-y-1.5">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#1F7A4C] dark:text-[#6EE7B7]">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Payment Confirmed &amp; Protected</span>
                </div>
                <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2] leading-relaxed">
                  {booking.isCheckedIn
                    ? 'You have checked in to this property. Your residency is active.'
                    : 'Your payment is held safely in escrow. Present your booking reference at the property to complete check-in.'}
                </p>
              </div>
            ) : isApproved ? (
              <div className="space-y-3">
                {!isLeaseCompleted && (
                  <div className="p-3.5 rounded-[12px] bg-[#FFFAEB] dark:bg-[#451A03]/30 border border-[#FDE68A] dark:border-[#78350F] text-xs text-[#B45309] dark:text-[#FCD34D] leading-relaxed">
                    Both you and the landlord must sign the digital tenancy agreement before escrow payment is unlocked.
                  </div>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => payMutation.mutate()}
                  isLoading={payMutation.isPending}
                  disabled={payMutation.isPending || !isLeaseCompleted}
                  leftIcon={<CreditCard className="w-4 h-4" />}
                  className="w-full h-11"
                >
                  Pay {formatCedis(totalPayable)} into Escrow
                </Button>
              </div>
            ) : isPending ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-[12px] bg-[#FFFAEB] dark:bg-[#451A03]/30 border border-[#FDE68A] dark:border-[#78350F] text-xs text-[#B45309] dark:text-[#FCD34D] leading-relaxed">
                  Your booking request is awaiting landlord confirmation. You can cancel this request at any time before payment without penalty.
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowCancelModal(true)}
                  disabled={cancelMutation.isPending}
                  leftIcon={<XCircle className="w-4 h-4" />}
                  className="w-full h-11"
                >
                  Cancel Booking Request
                </Button>
              </div>
            ) : null}

            {/* Recorded Transactions */}
            {Array.isArray(booking.transactions) && booking.transactions.length > 0 && (
              <div className="pt-4 border-t border-[#E7E7DF] dark:border-[#262E29] space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-[#6F756F] dark:text-[#A0A8A2]">
                  Transaction Receipts
                </h3>
                {booking.transactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-[10px] bg-[#F8F7F2] dark:bg-[#111513] border border-[#E7E7DF] dark:border-[#262E29] flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-[#242925] dark:text-white">
                        {formatCedis(tx.amount)}
                      </p>
                      <p className="text-[11px] font-mono text-[#6F756F] dark:text-[#A0A8A2]">
                        Ref: {tx.paymentReference || tx.id.slice(0, 10)}
                      </p>
                    </div>
                    <StatusBadge tone="success">{tx.status}</StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Post-Booking Resident Actions (Reviews, Maintenance, Support) */}
          <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-[#6F756F] dark:text-[#A0A8A2]">
              Resident Services &amp; Support
            </h3>

            {isCompletedOrActive && (
              <>
                <Link
                  href="/dashboard/tenant/tickets/new"
                  className="w-full py-2.5 px-3.5 rounded-[10px] bg-[#F8F7F2] dark:bg-[#111513] hover:bg-[#F1EFE7] dark:hover:bg-[#222925] border border-[#E7E7DF] dark:border-[#262E29] text-xs sm:text-sm font-medium text-[#242925] dark:text-white flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#173D32] dark:text-[#86B59C]" />
                    <span>Report Maintenance Issue</span>
                  </span>
                  <span>&rarr;</span>
                </Link>

                {!booking.review ? (
                  <Link
                    href="/dashboard/tenant/reviews/new"
                    className="w-full py-2.5 px-3.5 rounded-[10px] bg-[#F8F7F2] dark:bg-[#111513] hover:bg-[#F1EFE7] dark:hover:bg-[#222925] border border-[#E7E7DF] dark:border-[#262E29] text-xs sm:text-sm font-medium text-[#242925] dark:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-[#C77B59]" />
                      <span>Write a Verified Stay Review</span>
                    </span>
                    <span>&rarr;</span>
                  </Link>
                ) : (
                  <div className="p-3.5 rounded-[10px] bg-[#F8F7F2] dark:bg-[#111513] border border-[#E7E7DF] dark:border-[#262E29] text-xs">
                    <p className="font-semibold text-[#242925] dark:text-white flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-[#C77B59] text-[#C77B59]" />
                      Your Review: {booking.review.rating}/5
                    </p>
                    <p className="text-[#5E645E] dark:text-[#A0A8A2] mt-1">
                      {booking.review.comment}
                    </p>
                  </div>
                )}
              </>
            )}

            <Link
              href={`/support?bookingId=${booking.id}`}
              className="w-full py-2.5 px-3.5 rounded-[10px] bg-[#F8F7F2] dark:bg-[#111513] hover:bg-[#F1EFE7] dark:hover:bg-[#222925] border border-[#E7E7DF] dark:border-[#262E29] text-xs sm:text-sm font-medium text-[#242925] dark:text-white flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#175CD3] dark:text-[#93C5FD]" />
                <span>Support &amp; Issue Assistance</span>
              </span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Dialog */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-detail-modal-title"
        >
          <div className="w-full max-w-md bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-6 space-y-4 shadow-xl">
            <div className="w-11 h-11 rounded-full bg-[#FEF3F2] dark:bg-[#450A0A]/50 text-[#B42318] dark:text-[#FCA5A5] flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>

            <div className="space-y-1.5">
              <h2
                id="cancel-detail-modal-title"
                className="font-editorial text-xl text-[#242925] dark:text-white"
              >
                Cancel booking application?
              </h2>
              <p className="text-sm text-[#5E645E] dark:text-[#A0A8A2] leading-relaxed">
                Are you sure you want to cancel your booking request for{' '}
                <strong className="text-[#242925] dark:text-white">
                  {prop.title || 'this property'}
                </strong>
                ? You can cancel pending requests without penalty before payment.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelMutation.isPending}
              >
                Keep Request
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => cancelMutation.mutate()}
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
