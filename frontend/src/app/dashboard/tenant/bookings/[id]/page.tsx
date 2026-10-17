'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Building2,
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

export default function TenantBookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const bookingId = params?.id as string;
  const paymentRef = searchParams.get('reference') || searchParams.get('trxref');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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
          queryClient.invalidateQueries({ queryKey: ['tenant', 'bookings'] });
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
        queryClient.invalidateQueries({ queryKey: ['tenant', 'bookings'] });
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Unable to initiate payment. Ensure your lease agreement is signed.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/bookings/${bookingId}/cancel`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Booking application cancelled.');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['tenant', 'bookings'] });
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
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6 animate-pulse">
        <div className="h-6 w-40 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-44 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 h-72 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
          <div className="h-72 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="bg-white dark:bg-[#12151E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white">Booking Record Not Found</h1>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            This booking may have been removed or you may not have permission to view it.
          </p>
          <Link
            href="/dashboard/tenant"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F5132] text-white text-xs font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Resident Dashboard</span>
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

  const timelineSteps = [
    {
      label: 'Application Submitted',
      desc: new Date(booking.createdAt).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' }),
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

  return (
    <div className="max-w-5xl mx-auto py-4 px-2 sm:px-4 space-y-6 pb-16">
      {/* Top Breadcrumb & Reference Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/dashboard/tenant"
          className="inline-flex items-center gap-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Stay &amp; Bookings</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-zinc-500">
            Booking Ref: <strong className="text-zinc-900 dark:text-white">#{booking.id.slice(0, 8).toUpperCase()}</strong>
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
              isCompletedOrActive
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : isApproved
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                : isPending
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
            }`}
          >
            {booking.isCheckedIn ? 'CHECKED IN' : booking.status}
          </span>
        </div>
      </div>

      {/* Property Banner Card */}
      <div className="bg-white dark:bg-[#12151E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col md:flex-row gap-5 items-start md:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0">
          <div className="relative w-full sm:w-32 h-24 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 shrink-0 border border-zinc-200 dark:border-zinc-800">
            <Image
              src={
                prop.images?.[0] ||
                'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'
              }
              alt={prop.title || 'Property'}
              fill
              sizes="128px"
              className="object-cover"
            />
          </div>
          <div className="space-y-1 min-w-0">
            <span className="inline-block text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold">
              {prop.type?.replace(/_/g, ' ') || 'ACCOMMODATION'}
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-zinc-950 dark:text-white truncate">
              {prop.title || 'Reserved Accommodation'}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400 shrink-0" />
              <span>{prop.location}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-zinc-600 dark:text-zinc-300">
              {booking.room && (
                <span className="font-semibold">
                  Tier: {booking.room.name || booking.room.roomType}
                </span>
              )}
              {booking.roomUnit && <span>• Unit: {booking.roomUnit.name}</span>}
              {booking.bed && <span>• Bed: {booking.bed.label}</span>}
            </div>
          </div>
        </div>

        <Link
          href={`/properties/${prop.id}`}
          className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-[#0F5132] text-xs font-bold text-zinc-800 dark:text-zinc-200 shrink-0 transition-colors"
        >
          View Property Listing
        </Link>
      </div>

      {/* Booking Lifecycle Timeline */}
      <div className="bg-white dark:bg-[#12151E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold mb-4">
          Booking &amp; Tenancy Progression
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {timelineSteps.map((s, idx) => (
            <div
              key={s.label}
              className={`p-3.5 rounded-xl border ${
                s.done
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800/60'
                  : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200/80 dark:border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold text-zinc-400">STEP 0{idx + 1}</span>
                {s.done ? (
                  <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                ) : (
                  <Clock className="w-4 h-4 text-zinc-400" />
                )}
              </div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">{s.label}</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stay Details, Lease Agreement, Check-in & House Rules */}
        <div className="lg:col-span-7 space-y-6">
          {/* Stay Dates & Allocation */}
          <div className="bg-white dark:bg-[#12151E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
              <span>Tenancy Period &amp; Room Allocation</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block">Move-In Date</span>
                <span className="text-xs font-bold text-zinc-900 dark:text-white mt-0.5 block">
                  {new Date(booking.startDate).toLocaleDateString('en-GH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block">Move-Out Date</span>
                <span className="text-xs font-bold text-zinc-900 dark:text-white mt-0.5 block">
                  {new Date(booking.endDate).toLocaleDateString('en-GH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-mono uppercase text-zinc-400 block">Assigned Space</span>
                <span className="text-xs font-bold text-zinc-900 dark:text-white mt-0.5 block">
                  {booking.bed?.label
                    ? `${booking.roomUnit?.name || 'Unit'} • ${booking.bed.label}`
                    : booking.room?.roomType || 'Whole Unit'}
                </span>
              </div>
            </div>

            {/* Check-in Instructions & House Rules */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Check-In Guidelines &amp; Compound Rules
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Gate Curfew</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{prop.gateLockTime || '24/7 Access'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Visitor Policy</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{prop.visitorPolicy || 'Standard Guest Hours'}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Quiet Hours</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{prop.quietHours || '10:00 PM – 6:00 AM'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Digital Lease Agreement Card */}
          <div className="bg-white dark:bg-[#12151E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                <span>Digital Tenancy Agreement (Act 220)</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                {leaseStatus.replace(/_/g, ' ')}
              </span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Your tenancy agreement records the agreed rent, refundable caution deposit, utility responsibilities, and statutory rights under the Ghana Rent Act, 1963 (Act 220).
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href={`/dashboard/agreements/${booking.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0b3e26] text-white text-xs font-bold transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{isLeaseCompleted ? 'View Signed Agreement' : 'Review & Sign Lease Agreement'}</span>
              </Link>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
              >
                {isDownloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>Download PDF Copy</span>
              </button>
            </div>
          </div>

          {/* Landlord / Host Contact Card */}
          <div className="bg-white dark:bg-[#12151E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-950 dark:text-white">
                  Property Host: {landlord.firstName || 'Landlord'} {landlord.lastName || ''}
                </h2>
                {landlord.isVerifiedLandlord && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 pt-1">
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
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold shrink-0 self-start sm:self-center"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Message Host</span>
            </Link>
          </div>
        </div>

        {/* Right Column: Price Breakdown, Payment & Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#12151E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                <span>Financial Breakdown</span>
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F5132] dark:text-emerald-400">
                <Lock className="w-3 h-3" /> Escrow
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Base Tenancy Rent</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-white">
                  GH₵ {rentAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Refundable Caution Deposit</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-white">
                  {cautionDeposit > 0 ? `GH₵ ${cautionDeposit.toLocaleString()}` : 'GH₵ 0'}
                </span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                <span>Platform Booking Fee</span>
                <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">GH₵ 0 (Free for Tenants)</span>
              </div>
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-baseline">
                <span className="font-bold text-zinc-950 dark:text-white">Total Amount</span>
                <span className="font-mono text-lg font-extrabold text-zinc-950 dark:text-white">
                  GH₵ {totalPayable.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment / Action Controls depending on Booking Status */}
            {isCompletedOrActive ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/70 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0F5132] dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Payment Confirmed &amp; Protected</span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {booking.isCheckedIn
                    ? 'You have checked in to this property. Your residency is active.'
                    : 'Your payment is held safely in escrow. Present your booking reference at the property to complete check-in.'}
                </p>
              </div>
            ) : isApproved ? (
              <div className="space-y-2.5">
                {!isLeaseCompleted && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                    Both you and the landlord must sign the digital tenancy agreement before escrow payment is unlocked.
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => payMutation.mutate()}
                  disabled={payMutation.isPending || !isLeaseCompleted}
                  className="w-full py-3 rounded-xl bg-[#0F5132] hover:bg-[#0b3e26] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {payMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CreditCard className="w-4 h-4" />
                  )}
                  <span>Pay GH₵ {totalPayable.toLocaleString()} into Escrow</span>
                </button>
              </div>
            ) : isPending ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                  Your booking request is awaiting landlord confirmation. You can cancel this request at any time before payment without penalty.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to cancel this pending booking application?')) {
                      cancelMutation.mutate();
                    }
                  }}
                  disabled={cancelMutation.isPending}
                  className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {cancelMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  <span>Cancel Booking Request</span>
                </button>
              </div>
            ) : null}

            {/* Recorded Transactions */}
            {Array.isArray(booking.transactions) && booking.transactions.length > 0 && (
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                <h3 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                  Transaction Receipts
                </h3>
                {booking.transactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-mono font-bold text-zinc-900 dark:text-white">
                        GH₵ {Number(tx.amount || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-400">
                        Ref: {tx.paymentReference || tx.id.slice(0, 10)}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      {tx.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Post-Booking Resident Actions (Reviews, Maintenance, Support) */}
          <div className="bg-white dark:bg-[#12151E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Resident Services &amp; Support
            </h3>

            {isCompletedOrActive && (
              <>
                <Link
                  href="/dashboard/tenant/tickets/new"
                  className="w-full py-2.5 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                    <span>Report Maintenance Issue</span>
                  </span>
                  <span>&rarr;</span>
                </Link>

                {!booking.review ? (
                  <Link
                    href="/dashboard/tenant/reviews/new"
                    className="w-full py-2.5 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span>Write a Verified Stay Review</span>
                    </span>
                    <span>&rarr;</span>
                  </Link>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 text-xs">
                    <p className="font-bold text-zinc-900 dark:text-white flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      Your Review: {booking.review.rating}/5
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-400 mt-1">{booking.review.comment}</p>
                  </div>
                )}
              </>
            )}

            <Link
              href={`/contact?subject=${encodeURIComponent(`Booking Support #${booking.id.slice(0, 8).toUpperCase()}`)}`}
              className="w-full py-2.5 px-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-500" />
                <span>Contact Support / Dispute Assistance</span>
              </span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
