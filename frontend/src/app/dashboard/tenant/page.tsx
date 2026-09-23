'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { 
  Loader2, Calendar, MapPin, CheckCircle, Clock, XCircle, Star, PenTool, 
  AlertTriangle, MessageSquarePlus, Users, Edit3, HeartHandshake, UserPlus, 
  MessageSquare, Flag, CreditCard, Lock, FileText, Printer, Copy, CheckCircle2, 
  Receipt, PhoneCall, Siren, Phone, ExternalLink, Heart, Megaphone, KeyRound, 
  Car, Package, DollarSign, HeartPulse, Flame, Key, AlertCircle, ClipboardCheck, BadgeCheck,
  Radio, Building2, Check, Trash2, Wrench, Camera, GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import NoticeBoard from '@/components/NoticeBoard';
import CommuteWidget from '@/components/CommuteWidget';
import OnboardingProgressWidget from '@/components/OnboardingProgressWidget';
import OnboardingTour from '@/components/OnboardingTour';
import MessagingTab from '@/components/MessagingTab';
import VisitorPassTab from '@/components/tenant/VisitorPassTab';
import HomeServicesTab from '@/components/tenant/HomeServicesTab';
import VehicleParkingTab from '@/components/tenant/VehicleParkingTab';
import LeaseRenewalTab from '@/components/tenant/LeaseRenewalTab';
import PackageDeliveriesTab from '@/components/tenant/PackageDeliveriesTab';
import BillSplitterTab from '@/components/tenant/BillSplitterTab';
import TenantPaymentScheduleTab from '@/components/tenant/TenantPaymentScheduleTab';
import TenantAssetInventoryTab from '@/components/tenant/TenantAssetInventoryTab';
import { getImageUrl } from '@/lib/utils';
import clsx from 'clsx';
import SkeletonTable from '@/components/SkeletonTable';
import { printPaymentReceipt, printLeaseAgreementReceipt } from '@/lib/receiptTemplates';

const VALID_TENANT_TABS = [
  'bookings', 'active-booking', 'tickets', 'reviews', 'roommates', 'documents', 'payments', 
  'safety', 'messages', 'visitors', 'services', 'vehicles', 'renewals', 
  'deliveries', 'billsplit', 'tranches', 'inventory'
] as const;
type TenantTabType = typeof VALID_TENANT_TABS[number];

function LiveBookingCountdown({ createdAt, onExpire }: { createdAt: string; onExpire?: () => void }) {
  const getRemainingSeconds = () => {
    const expiresAt = new Date(createdAt).getTime() + 15 * 60 * 1000;
    return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  };

  const [diffSec, setDiffSec] = useState<number>(getRemainingSeconds);

  useEffect(() => {
    // Initial sync
    const initial = getRemainingSeconds();
    setDiffSec(initial);

    if (initial <= 0) {
      onExpire?.();
      return;
    }

    const interval = setInterval(() => {
      const remaining = getRemainingSeconds();
      setDiffSec(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  if (diffSec <= 0) {
    return (
      <span className="text-[11px] font-mono font-extrabold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2.5 py-1 rounded-lg border border-rose-300 dark:border-rose-800 flex items-center gap-1 shadow-xs">
        <Clock className="w-3 h-3 text-rose-500" />
        Expired
      </span>
    );
  }

  const minutes = Math.floor(diffSec / 60);
  const seconds = String(diffSec % 60).padStart(2, '0');

  return (
    <span className="text-[11px] font-mono font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-300 dark:border-amber-700 flex items-center gap-1 shadow-xs">
      <Clock className="w-3 h-3 animate-pulse text-amber-600 dark:text-amber-400" />
      {minutes}m {seconds}s left
    </span>
  );
}

function TenantDashboardContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTabState] = useState<TenantTabType>(
    (tabParam && (VALID_TENANT_TABS as readonly string[]).includes(tabParam)) 
      ? (tabParam as TenantTabType) 
      : 'bookings'
  );

  const setActiveTab = (tab: TenantTabType) => {
    setActiveTabState(tab);
    const url = tab === 'bookings' ? '/dashboard/tenant' : `/dashboard/tenant?tab=${tab}`;
    router.replace(url, { scroll: false });
  };

  useEffect(() => {
    if (tabParam && (VALID_TENANT_TABS as readonly string[]).includes(tabParam)) {
      setActiveTabState(tabParam as TenantTabType);
    } else if (!tabParam) {
      setActiveTabState('bookings');
    }
  }, [tabParam]);

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    }
  });
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const verifyId = urlParams.get('verify');
    const reference = urlParams.get('reference');
    const trxref = urlParams.get('trxref');

    if (verifyId && (reference || trxref)) {
      toast.loading('Verifying payment with payment gateway...', { id: 'payment-verifying' });
      verifyPaymentMutation.mutate(
        { bookingId: verifyId, reference: (reference || trxref) as string },
        {
          onSettled: () => {
            toast.dismiss('payment-verifying');
          }
        }
      );
    }
  }, []);
  
  const [selectedGatePassBooking, setSelectedGatePassBooking] = useState<any>(null);



  // Roommate Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [roommateProfile, setRoommateProfile] = useState({
    budget: 5000,
    cleanliness: 'AVERAGE',
    sleepHabits: 'EARLY_BIRD',
    studyHabits: 'QUIET',
    bio: ''
  });

  // Emergency Dispatch Copy State
  const [copiedDispatchAddress, setCopiedDispatchAddress] = useState(false);

  // Booking Tab Sub-Filter State
  const [bookingFilter, setBookingFilter] = useState<'ACTIVE' | 'CANCELLED'>('ACTIVE');

  // Queries
  // Bookings load eagerly — this is the primary tab
  const { data: bookingsResponse, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', 'tenant'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/me');
      return data;
    }
  });

  // Tickets query
  const { data: ticketsResponse, isLoading: ticketsLoading } = useQuery({
    queryKey: ['tickets', 'tenant'],
    queryFn: async () => {
      const { data } = await api.get('/tickets/me');
      return data;
    },
  });

  // Agreements query
  const { data: agreementsResponse, isLoading: agreementsLoading } = useQuery({
    queryKey: ['agreements', 'tenant'],
    queryFn: async () => {
      const { data } = await api.get('/agreements/tenant');
      return data;
    },
  });

  // Transactions query
  const { data: transactionsResponse, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', 'tenant'],
    queryFn: async () => {
      const { data } = await api.get('/transactions/tenant');
      return data;
    },
  });

  // Roommate profile query
  const { data: roommateProfileResponse, isLoading: profileLoading } = useQuery({
    queryKey: ['roommateProfile', 'me'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/roommates/profile');
        if (data.profile) {
          setRoommateProfile({
            budget: data.profile.budget,
            cleanliness: data.profile.cleanliness,
            sleepHabits: data.profile.sleepHabits,
            studyHabits: data.profile.studyHabits,
            bio: data.profile.bio || ''
          });
        }
        return data;
      } catch (err: any) {
        if (err.response?.status === 404) return null; // No profile yet
        throw err;
      }
    },
  });

  const { data: roommateMatchesResponse, isLoading: matchesLoading } = useQuery({
    queryKey: ['roommateMatches'],
    queryFn: async () => {
      const { data } = await api.get('/roommates/matches');
      return data;
    },
    enabled: !!roommateProfileResponse?.profile
  });

  // Mutations

  const cancelPendingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data } = await api.post(`/bookings/${bookingId}/cancel`);
      return data;
    },
    onMutate: async (bookingId: string) => {
      await queryClient.cancelQueries({ queryKey: ['bookings', 'tenant'] });
      await queryClient.cancelQueries({ queryKey: ['bookings', 'my-active'] });

      const prevTenantBookings = queryClient.getQueryData(['bookings', 'tenant']);
      const prevActiveBooking = queryClient.getQueryData(['bookings', 'my-active']);

      // Optimistically update tenant bookings list
      queryClient.setQueryData(['bookings', 'tenant'], (old: any) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((b: any) => b.id === bookingId ? { ...b, status: 'CANCELLED' } : b);
        }
        if (old.bookings && Array.isArray(old.bookings)) {
          return {
            ...old,
            bookings: old.bookings.map((b: any) => b.id === bookingId ? { ...b, status: 'CANCELLED' } : b)
          };
        }
        return old;
      });

      // Optimistically update active booking
      queryClient.setQueryData(['bookings', 'my-active'], (old: any) => {
        if (!old) return old;
        if (old.booking && old.booking.id === bookingId) {
          return { ...old, booking: { ...old.booking, status: 'CANCELLED' } };
        }
        return old;
      });

      return { prevTenantBookings, prevActiveBooking };
    },
    onError: (err: any, _bookingId, context) => {
      if (context?.prevTenantBookings !== undefined) {
        queryClient.setQueryData(['bookings', 'tenant'], context.prevTenantBookings);
      }
      if (context?.prevActiveBooking !== undefined) {
        queryClient.setQueryData(['bookings', 'my-active'], context.prevActiveBooking);
      }
      toast.error(err.response?.data?.message || 'Failed to cancel booking request. Changes reverted.');
    },
    onSuccess: () => {
      toast.success('Booking request cancelled successfully.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'my-active'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    }
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data } = await api.delete(`/bookings/${bookingId}`);
      return data;
    },
    onSuccess: () => {
      toast.success('Booking removed from your history.');
      queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'my-active'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to remove booking');
    }
  });

  const { data: myReviewsData, isLoading: myReviewsLoading } = useQuery({
    queryKey: ['myReviews'],
    queryFn: async () => {
      const { data } = await api.get('/reviews/mine');
      return data;
    },
  });




  const profileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const res = await api.post('/roommates/profile', profileData);
      return res.data;
    },
    onSuccess: () => {
      setIsEditingProfile(false);
      queryClient.invalidateQueries({ queryKey: ['roommateProfile', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['roommateMatches'] });
    }
  });

  const payBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.post(`/bookings/${bookingId}/pay`);
      return res.data;
    },
    onSuccess: (data) => {
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to process payment');
    }
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ bookingId, reference }: { bookingId: string, reference: string }) => {
      const res = await api.post(`/bookings/${bookingId}/verify-payment`, { reference });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'my-active'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'tenant'] });
      queryClient.invalidateQueries({ queryKey: ['agreements', 'tenant'] });
      toast.success('Payment verified! Your booking is now complete.');
      // Remove query params
      window.history.replaceState({}, document.title, window.location.pathname);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to verify payment');
    }
  });

  const bookings = bookingsResponse?.bookings || [];
  const activeBookings = bookings.filter((b: any) => ['PENDING', 'APPROVED', 'CONFIRMED', 'COMPLETED', 'ACTIVE'].includes(b.status));
  const cancelledBookings = bookings.filter((b: any) => ['CANCELLED', 'REJECTED'].includes(b.status));
  const displayedBookings = bookingFilter === 'ACTIVE' ? activeBookings : cancelledBookings;

  const tickets = ticketsResponse?.tickets || [];
  const agreements = agreementsResponse?.agreements || [];
  const transactions = transactionsResponse?.transactions || [];
  const matches = roommateMatchesResponse?.matches || [];
  const hasProfile = !!roommateProfileResponse?.profile;

  const totalPaidGhs = transactions.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

  const handlePrintReceipt = (tx: any) => {
    printPaymentReceipt(tx);
  };

  const handlePrintAgreement = (agreement: any) => {
    printLeaseAgreementReceipt(agreement);
  };

  // Helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold"><CheckCircle className="w-3 h-3" /> Approved</span>;
      case 'ACTIVE': return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-bold border border-emerald-300 dark:border-emerald-800"><CheckCircle className="w-3 h-3" /> Active Resident</span>;
      case 'CHECKED_IN': return <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 px-3 py-1 rounded-full text-xs font-bold border border-teal-300 dark:border-teal-800"><CheckCircle className="w-3 h-3" /> Checked In & Resident</span>;
      case 'PENDING': return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold"><Clock className="w-3 h-3" /> Pending</span>;
      case 'REJECTED': return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold"><XCircle className="w-3 h-3" /> Rejected</span>;
      case 'COMPLETED': return <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold"><CheckCircle className="w-3 h-3" /> Completed</span>;
      case 'CANCELLED': return <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 px-3 py-1 rounded-full text-xs font-bold border border-zinc-200 dark:border-zinc-700"><XCircle className="w-3 h-3 text-zinc-400" /> Cancelled</span>;
      
      // Ticket specific
      case 'IN_PROGRESS': return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold"><PenTool className="w-3 h-3" /> In Progress</span>;
      case 'RESOLVED': return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold"><CheckCircle className="w-3 h-3" /> Resolved</span>;
      default: return null;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'LOW': return <span className="text-slate-500 font-bold text-xs bg-slate-100 px-2 py-1 rounded">LOW</span>;
      case 'MEDIUM': return <span className="text-amber-600 font-bold text-xs bg-amber-50 px-2 py-1 rounded border border-amber-200">MEDIUM</span>;
      case 'HIGH': return <span className="text-orange-600 font-bold text-xs bg-orange-50 px-2 py-1 rounded border border-orange-200">HIGH</span>;
      case 'URGENT': return <span className="text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded flex items-center gap-1 border border-red-200"><AlertTriangle className="w-3 h-3" /> URGENT</span>;
      default: return null;
    }
  };

  // Fetch Compound Broadcast Notices for Tenant's Booked Property
  const activeBooking = activeBookings.find((b: any) => ['APPROVED', 'CONFIRMED', 'COMPLETED', 'PENDING', 'ACTIVE', 'CHECKED_IN'].includes(b.status));
  const activePropertyId = activeBooking?.propertyId;
  const { data: compoundNoticesData } = useQuery({
    queryKey: ['compoundNotices', 'tenant', activePropertyId],
    queryFn: async () => {
      if (!activePropertyId) return { notices: [] };
      try {
        const res = await api.get(`/compound-notices/property/${activePropertyId}`);
        return res.data;
      } catch (err) {
        return { notices: [] };
      }
    },
    enabled: Boolean(activePropertyId)
  });

  const compoundNotices = Array.isArray(compoundNoticesData?.notices)
    ? compoundNoticesData.notices.filter((n: any) => n && !n.title?.startsWith('__') && n.category !== 'ASSET_INVENTORY')
    : [];

  return (
    <div className="space-y-6">
      <OnboardingProgressWidget user={session} />
      
      {/* ── WORKSPACE HEADER & ANNOUNCEMENTS (ARCHITECTURAL CANVAS LAYOUT) ── */}
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
        <NoticeBoard />

        {/* Live Landlord Compound Notice Advisory: Sleek Ambient Strip */}
        {compoundNotices.length > 0 && (
          <div className="space-y-1.5">
            {compoundNotices.map((notice: any) => {
              if (!notice) return null;
              const isEmergency = notice.priority === 'EMERGENCY';
              const isImportant = notice.priority === 'IMPORTANT';
              return (
                <div
                  key={notice.id}
                  className={clsx(
                    "py-2.5 px-3.5 rounded-lg border-l-3 flex items-start gap-3 text-xs transition-colors",
                    isEmergency && "bg-red-500/5 border-l-red-600 text-red-900 dark:text-red-200 border-y border-r border-red-200/50 dark:border-red-900/40",
                    isImportant && "bg-amber-500/5 border-l-amber-500 text-amber-900 dark:text-amber-200 border-y border-r border-amber-200/50 dark:border-amber-900/40",
                    !isEmergency && !isImportant && "bg-purple-500/5 border-l-purple-600 text-purple-900 dark:text-purple-200 border-y border-r border-purple-200/50 dark:border-purple-900/40"
                  )}
                >
                  <Megaphone className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-bold flex-wrap">
                      <span className="uppercase font-mono text-[9px] tracking-wider px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
                        {notice.category || 'NOTICE'} • {notice.property?.title || 'Property'}
                      </span>
                      <span>{notice.title || 'Announcement'}</span>
                    </div>
                    <p className="mt-0.5 font-medium opacity-90 whitespace-pre-line leading-relaxed">
                      {notice.message || ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div id="tour-tenant-workspaces" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Tenant Portal</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs sm:text-sm">Manage your residential tenancies, rent escrow disbursements, and maintenance requests.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/dashboard/wishlist"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs border border-zinc-200 dark:border-zinc-700 transition-colors"
            >
              <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" /> My Wishlist
            </Link>
            <OnboardingTour role={session?.role} user={session} />
          </div>
        </div>
      </div>

      {(activeTab === 'bookings' || activeTab === 'active-booking') && (
        <div className="animate-in space-y-6">
          {/* ── PRIORITY RESIDENCE MASTHEAD (EDITORIAL DOSSIER, NO BUBBLY CARD) ── */}
          {activeBooking && ['APPROVED', 'CONFIRMED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(activeBooking.status) && (
            <section aria-label="Current Residence Dossier" className="pb-6 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700/80">
                    {(() => {
                      try {
                        let imgs = activeBooking.property?.images;
                        if (typeof imgs === 'string') imgs = JSON.parse(imgs);
                        if (Array.isArray(imgs) && imgs.length > 0) {
                          return <img src={getImageUrl(imgs[0])} className="w-full h-full object-cover" alt="Current Residence" />;
                        }
                      } catch (e) {}
                      return <div className="w-full h-full flex items-center justify-center text-zinc-400"><Building2 className="w-7 h-7" /></div>;
                    })()}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/80 dark:border-emerald-800/60">
                        Active Residence
                      </span>
                      <span className="text-zinc-400">•</span>
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        {activeBooking.status === 'CHECKED_IN' || activeBooking.status === 'ACTIVE' 
                          ? 'Tenancy Active' 
                          : 'Move-In Clearance Ready'}
                      </span>
                      <span className="text-zinc-400">•</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-[#0F5132] dark:text-emerald-400" /> MoMo Escrow Verified
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white tracking-tight truncate">
                      {activeBooking.property?.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{activeBooking.property?.location}</span>
                      </span>
                      <span className="text-zinc-300 dark:text-zinc-700">•</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                        {activeBooking.room?.roomType || 'Standard Room'}
                        {activeBooking.roomUnit?.unitNumber ? ` · Unit ${activeBooking.roomUnit.unitNumber}` : ''}
                        {activeBooking.bed?.bedNumber ? ` · Bed ${activeBooking.bed.bedNumber}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Priority Quick Actions: Clean, tactile hairline buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedGatePassBooking(activeBooking)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all cursor-pointer shadow-xs"
                    title="Open Gate Pass QR for Security & Caretaker"
                  >
                    <GraduationCap className="w-4 h-4 text-zinc-950" />
                    <span>Digital Gate Pass</span>
                  </button>

                  <Link
                    href={`/dashboard/tenant/tickets/new?propertyId=${activeBooking.propertyId}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Report Issue</span>
                  </Link>

                  <Link
                    href={`/dashboard/agreements/${activeBooking.id}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-500" />
                    <span>View Lease</span>
                  </Link>

                  <button
                    onClick={() => setActiveTab('billsplit')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                    <span>Split Utilities</span>
                  </button>
                </div>
              </div>

              {/* Tenancy Validity Row */}
              <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-4 flex-wrap">
                  <span>Tenancy Term: <strong className="text-zinc-900 dark:text-zinc-100">{new Date(activeBooking.startDate).toLocaleDateString()} – {new Date(activeBooking.endDate).toLocaleDateString()}</strong></span>
                  {activeBooking.price && (
                    <span>Rate: <strong className="text-zinc-900 dark:text-zinc-100">GH₵ {activeBooking.price.toLocaleString()}</strong></span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Room Key Handover &amp; Inspection Cleared
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Sub-tabs if there are any cancelled or active bookings */}
          {!bookingsLoading && cancelledBookings.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="inline-flex items-center gap-1">
                <button
                  onClick={() => setBookingFilter('ACTIVE')}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                    bookingFilter === 'ACTIVE'
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <span>Active Accommodations</span>
                  <span className={clsx(
                    "px-1.5 py-0.2 rounded-full font-mono text-[10px] font-extrabold",
                    bookingFilter === 'ACTIVE' 
                      ? "bg-white/20 text-white dark:bg-black/20 dark:text-zinc-900" 
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}>
                    {activeBookings.length}
                  </span>
                </button>
                <button
                  onClick={() => setBookingFilter('CANCELLED')}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                    bookingFilter === 'CANCELLED'
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <span>Cancelled &amp; Past</span>
                  <span className={clsx(
                    "px-1.5 py-0.2 rounded-full font-mono text-[10px] font-extrabold",
                    bookingFilter === 'CANCELLED'
                      ? "bg-white/20 text-white dark:bg-black/20 dark:text-zinc-900"
                      : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  )}>
                    {cancelledBookings.length}
                  </span>
                </button>
              </div>

              {bookingFilter === 'CANCELLED' && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Cancelled bookings can be permanently removed from your dashboard.
                </p>
              )}
            </div>
          )}

          {bookingsLoading ? (
            <SkeletonTable rows={3} columns={4} />
          ) : displayedBookings.length === 0 ? (
            bookingFilter === 'ACTIVE' ? (
              <div className="py-14 text-center flex flex-col items-center">
                <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-3 text-zinc-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">No Active Accommodations Reserved</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-5 max-w-md mx-auto leading-relaxed">
                  Explore verified campus hostels and residential apartments across KNUST, Legon, and UCC. Your deposit is secured in Bank of Ghana / Paystack MoMo escrow.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  <Link href="/properties" className="inline-flex items-center gap-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-xs">
                    Browse Verified Hostels &amp; Apartments
                  </Link>
                  {cancelledBookings.length > 0 && (
                    <button
                      onClick={() => setBookingFilter('CANCELLED')}
                      className="inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors border border-zinc-200 dark:border-zinc-700"
                    >
                      View Past Requests ({cancelledBookings.length})
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-14 text-center flex flex-col items-center">
                <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-3 text-zinc-400">
                  <XCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">No Cancelled Requests</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-4 max-w-md mx-auto">
                  You do not have any cancelled or declined room bookings.
                </p>
                <button
                  onClick={() => setBookingFilter('ACTIVE')}
                  className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors"
                >
                  Back to Active Accommodations
                </button>
              </div>
            )
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {displayedBookings.map((booking: any) => (
                <div 
                  key={booking.id} 
                  className={clsx(
                    "py-5 first:pt-1 last:pb-1 flex flex-col sm:flex-row gap-5 items-start sm:items-center transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 -mx-3 px-3 sm:-mx-4 sm:px-4 rounded-xl",
                    (booking.status === 'CANCELLED' || booking.status === 'REJECTED') && "opacity-75"
                  )}
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700/80">
                    {(() => {
                      try {
                        let imgs = booking.property?.images;
                        if (typeof imgs === 'string') imgs = JSON.parse(imgs);
                        if (Array.isArray(imgs) && imgs.length > 0) {
                          return <img src={getImageUrl(imgs[0])} className="w-full h-full object-cover" alt="Property" />;
                        }
                      } catch (e) {}
                      return <div className="w-full h-full flex items-center justify-center text-zinc-400"><Calendar className="w-6 h-6" /></div>;
                    })()}
                  </div>
                  
                  <div className="flex-1 space-y-2.5 w-full min-w-0">
                    <div className="flex flex-wrap justify-between items-start gap-3">
                      <div>
                        <h3 className="text-base font-bold text-zinc-950 dark:text-white leading-tight">{booking.property?.title}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{booking.property?.location}</span>
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">{booking.room?.roomType || 'Standard Room'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {booking.status === 'PENDING' && booking.createdAt && (
                          <LiveBookingCountdown 
                            createdAt={booking.createdAt} 
                            onExpire={() => queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] })} 
                          />
                        )}
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>

                    {booking.status === 'CANCELLED' && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>Booking cancelled. Reserved room hold was released.</span>
                      </p>
                    )}
                    {booking.status === 'REJECTED' && (
                      <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span>Booking request was declined by the property owner.</span>
                      </p>
                    )}

                    {/* Term, Rate & Action Controls (Linear Continuous Row) */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400 flex-wrap">
                        <span>Term: <strong className="text-zinc-800 dark:text-zinc-200">{new Date(booking.startDate).toLocaleDateString()} – {new Date(booking.endDate).toLocaleDateString()}</strong></span>
                        {booking.price && (
                          <>
                            <span className="text-zinc-300 dark:text-zinc-700">•</span>
                            <span>Rate: <strong className="text-zinc-900 dark:text-zinc-100">GH₵ {booking.price.toLocaleString()}</strong></span>
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {['PENDING', 'APPROVED'].includes(booking.status) && (
                          <button 
                            onClick={() => cancelPendingMutation.mutate(booking.id)}
                            disabled={cancelPendingMutation.isPending}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 hover:underline transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            {cancelPendingMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />} Cancel Request
                          </button>
                        )}
                        {(booking.status === 'CANCELLED' || booking.status === 'REJECTED') && (
                          <button
                            onClick={() => {
                              if (confirm('Remove this cancelled booking from your dashboard?')) {
                                deleteBookingMutation.mutate(booking.id);
                              }
                            }}
                            disabled={deleteBookingMutation.isPending}
                            className="text-xs font-semibold text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                            title="Remove from your dashboard"
                          >
                            {deleteBookingMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Remove
                          </button>
                        )}
                        {(['APPROVED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(booking.status)) && (
                          <>
                            <Link 
                              href={`/dashboard/agreements/${booking.id}`}
                              className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              View Agreement
                            </Link>
                            {booking.status === 'APPROVED' && (
                              <button 
                                onClick={() => payBookingMutation.mutate(booking.id)}
                                disabled={payBookingMutation.isPending || booking.leaseAgreement?.status !== 'COMPLETED'}
                                title={booking.leaseAgreement?.status !== 'COMPLETED' ? "Tenancy Agreement must be signed by both parties first" : "Pay Rent"}
                                className={clsx(
                                  "text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer",
                                  booking.leaseAgreement?.status !== 'COMPLETED'
                                    ? "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed"
                                    : "text-white bg-[#0F5132] hover:bg-[#0A3D24]"
                                )}
                              >
                                {payBookingMutation.isPending ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : booking.leaseAgreement?.status !== 'COMPLETED' ? (
                                  <Lock className="w-3 h-3" />
                                ) : (
                                  <CreditCard className="w-3 h-3" />
                                )}
                                Pay Rent
                              </button>
                            )}
                            <Link 
                              href={`/dashboard/tenant/tickets/new?propertyId=${booking.propertyId}`}
                              className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                            >
                              <Wrench className="w-3 h-3 text-emerald-500" />
                              <span>Report Issue</span>
                            </Link>
                            {(booking.property?.type === 'Hostel' || booking.property?.targetAudience === 'Students Only' || session?.studentId) && (
                              <button
                                onClick={() => setSelectedGatePassBooking(booking)}
                                className="text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-300/80 dark:border-amber-700/80 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                                title="Digital Student Gate Pass & Move-In Clearance"
                              >
                                <GraduationCap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                <span>Gate Pass</span>
                              </button>
                            )}
                          </>
                        )}
                        {(['COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(booking.status)) && (
                          <Link 
                            href={`/dashboard/tenant/reviews/new?bookingId=${booking.id}`}
                            className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1"
                          >
                            <Star className="w-3 h-3 fill-current text-amber-400" /> Review
                          </Link>
                        )}
                      </div>
                    </div>
                    
                    {/* Commute Widget */}
                    {(['APPROVED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(booking.status)) && (
                      <div className="pt-1">
                        <CommuteWidget propertyId={booking.propertyId} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="animate-in space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h2 className="text-xl font-black text-zinc-950 dark:text-white tracking-tight flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Maintenance &amp; Repair Tickets
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Track real-time resolution status and scheduled caretaker visits for your residence.
              </p>
            </div>
            {activeBookings.length > 0 && (
              <Link
                href={`/dashboard/tenant/tickets/new?propertyId=${activeBookings[0].propertyId}`}
                className="px-3.5 py-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-2 shrink-0 cursor-pointer self-start sm:self-auto"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Report an Issue</span>
              </Link>
            )}
          </div>

          {ticketsLoading ? (
            <SkeletonTable rows={3} columns={4} />
          ) : tickets.length === 0 ? (
            <div className="py-14 text-center flex flex-col items-center">
              <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-3 text-zinc-400">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white">No Active Maintenance Tickets</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
                Everything in your residence is functioning properly. If you experience plumbing, electrical, or lock issues, submit a ticket to alert your caretaker.
              </p>
              {activeBookings.length > 0 && (
                <Link
                  href={`/dashboard/tenant/tickets/new?propertyId=${activeBookings[0].propertyId}`}
                  className="mt-4 px-4 py-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Report First Issue</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {tickets.map((ticket: any) => (
                <div key={ticket.id} className="py-5 first:pt-1 last:pb-1 flex flex-col gap-3 transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 -mx-3 px-3 sm:-mx-4 sm:px-4 rounded-xl">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {getPriorityBadge(ticket.priority)}
                        <h3 className="font-bold text-base text-zinc-950 dark:text-white">{ticket.title}</h3>
                      </div>
                      <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                        {ticket.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                        <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-zinc-400" /> {ticket.property?.title}</span>
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-zinc-400" /> {new Date(ticket.createdAt).toLocaleDateString()}</span>
                        {ticket.scheduledDate && (
                          <>
                            <span className="text-zinc-300 dark:text-zinc-700">•</span>
                            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                              <Clock className="w-3.5 h-3.5" /> Caretaker Visit: {new Date(ticket.scheduledDate).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 self-start sm:self-auto">
                      {getStatusBadge(ticket.status)}
                    </div>
                  </div>

                  {/* Photo Proof & Resolution Attachments (Clean hairline row) */}
                  {(ticket.imageUrl || ticket.completionImageUrl || ticket.resolutionNotes) && (
                    <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center gap-2.5 text-xs">
                      {ticket.imageUrl && (
                        <a 
                          href={getImageUrl(ticket.imageUrl)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 font-semibold text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700"
                        >
                          <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Tenant Photo</span>
                        </a>
                      )}
                      {ticket.completionImageUrl && (
                        <a 
                          href={getImageUrl(ticket.completionImageUrl)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>Caretaker Proof</span>
                        </a>
                      )}
                      {ticket.resolutionNotes && (
                        <span className="text-zinc-600 dark:text-zinc-400">
                          <strong className="text-zinc-900 dark:text-zinc-200 font-semibold">Note:</strong> {ticket.resolutionNotes}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="animate-in space-y-5">
          <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-black text-zinc-950 dark:text-white tracking-tight flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" /> My Verified Reviews &amp; Ratings
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Verified reviews submitted for completed hostel and residential stays. You can appeal any moderated rating.
            </p>
          </div>

          {myReviewsLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
          ) : myReviewsData?.reviews?.length === 0 ? (
            <div className="py-14 text-center flex flex-col items-center">
              <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-3 text-zinc-400">
                <Star className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white">No Reviews Submitted Yet</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Once your stay is completed, you can leave verified feedback to help other Ghanaian students and residents.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {myReviewsData?.reviews?.map((review: any) => (
                <div key={review.id} className="py-5 first:pt-1 last:pb-1 space-y-2.5 transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 -mx-3 px-3 sm:-mx-4 sm:px-4 rounded-xl">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3 className="font-bold text-base text-zinc-950 dark:text-white">{review.booking?.property?.title || 'Property'}</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400" /> {review.booking?.property?.location || 'Location'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {review.isFlagged ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 rounded text-[10px] font-mono font-bold uppercase border border-red-200 dark:border-red-900/60">
                          <Flag className="w-3 h-3" /> Flagged
                        </span>
                      ) : review.isModerated ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded text-[10px] font-mono font-medium border border-zinc-200 dark:border-zinc-700">
                          <Clock className="w-3 h-3" /> Under Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 rounded text-[10px] font-mono font-bold uppercase border border-emerald-200/80 dark:border-emerald-800/60">
                          <CheckCircle className="w-3 h-3" /> Published
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-700'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-zinc-400 ml-1.5 font-mono">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>

                  {review.comment && (
                    <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                      &quot;{review.comment}&quot;
                    </p>
                  )}

                  {/* Appeal Section */}
                  {(review.isFlagged || review.isModerated) && (
                    <div className="pt-2 text-xs">
                      {review.appealStatus === 'PENDING' ? (
                        <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-medium">
                          <Clock className="w-3.5 h-3.5" /> Appeal is pending admin review.
                        </div>
                      ) : review.appealStatus === 'ACCEPTED' ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> Appeal accepted — review reinstated.
                        </div>
                      ) : review.appealStatus === 'REJECTED' ? (
                        <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400 font-medium">
                          <XCircle className="w-3.5 h-3.5" /> Appeal rejected by moderation desk.
                        </div>
                      ) : (
                        <Link
                          href={`/dashboard/tenant/appeals/new?reviewId=${review.id}`}
                          className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Submit Appeal Dossier
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'roommates' && (
        <div className="animate-in space-y-6">
          {profileLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
          ) : !hasProfile || isEditingProfile ? (
            <div className="pb-6 border-b border-zinc-200 dark:border-zinc-800 space-y-5 max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200">
                  <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-950 dark:text-white tracking-tight">{hasProfile ? 'Edit' : 'Create'} Roommate Profile</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Share your living habits to find compatible roommates across your campus.</p>
                </div>
              </div>
              
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Max Budget (GH₵ / yr)</label>
                    <input type="number" className="w-full p-2.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg bg-transparent focus:ring-1 focus:ring-emerald-600 outline-none" value={roommateProfile.budget} onChange={(e) => setRoommateProfile({...roommateProfile, budget: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Cleanliness</label>
                    <select className="w-full p-2.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#12151D] focus:ring-1 focus:ring-emerald-600 outline-none" value={roommateProfile.cleanliness} onChange={(e) => setRoommateProfile({...roommateProfile, cleanliness: e.target.value})}>
                      <option value="NEAT">Very Neat</option>
                      <option value="AVERAGE">Average</option>
                      <option value="MESSY">A bit relaxed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Sleep Habits</label>
                    <select className="w-full p-2.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#12151D] focus:ring-1 focus:ring-emerald-600 outline-none" value={roommateProfile.sleepHabits} onChange={(e) => setRoommateProfile({...roommateProfile, sleepHabits: e.target.value})}>
                      <option value="EARLY_BIRD">Early Bird</option>
                      <option value="NIGHT_OWL">Night Owl</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Study Habits</label>
                    <select className="w-full p-2.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-[#12151D] focus:ring-1 focus:ring-emerald-600 outline-none" value={roommateProfile.studyHabits} onChange={(e) => setRoommateProfile({...roommateProfile, studyHabits: e.target.value})}>
                      <option value="QUIET">Quiet &amp; Focused</option>
                      <option value="SOCIAL">Social &amp; Collaborative</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Personal Bio</label>
                  <textarea className="w-full p-2.5 text-xs border border-zinc-200 dark:border-zinc-700 rounded-lg bg-transparent focus:ring-1 focus:ring-emerald-600 outline-none min-h-[70px]" placeholder="Tell prospective roommates a bit about yourself..." value={roommateProfile.bio} onChange={(e) => setRoommateProfile({...roommateProfile, bio: e.target.value})} />
                </div>
                <div className="flex justify-end gap-2.5 pt-2">
                  {hasProfile && (
                    <button onClick={() => setIsEditingProfile(false)} className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white rounded-lg cursor-pointer">Cancel</button>
                  )}
                  <button onClick={() => profileMutation.mutate(roommateProfile)} disabled={profileMutation.isPending} className="px-4 py-1.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer">
                    {profileMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Save Profile
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-950 dark:text-white">Roommate Matcher is Active</h3>
                    <p className="text-xs text-zinc-500">You are visible to other verified students at your campus.</p>
                  </div>
                </div>
                <button onClick={() => setIsEditingProfile(true)} className="px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5 cursor-pointer">
                  <Edit3 className="w-3.5 h-3.5" /> Edit Habits
                </button>
              </div>

              {matchesLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
              ) : matches.length === 0 ? (
                <div className="py-14 text-center flex flex-col items-center">
                  <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-3 text-zinc-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">No Exact Matches Yet</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    Check back shortly as more students from your university register their preferences.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matches.map((match: any) => (
                    <div key={match.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-800 dark:text-zinc-200 font-bold text-xs">
                              {match.user.firstName[0]}
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-zinc-950 dark:text-white">{match.user.firstName} {match.user.lastName[0]}.</h3>
                              <p className="text-[11px] text-zinc-500">{match.user.campus}</p>
                            </div>
                          </div>
                          {match.score > 2 && <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-200/80 dark:border-emerald-800/60">Top Match</span>}
                        </div>
                        
                        <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Budget:</span>
                            <span className="font-semibold text-zinc-900 dark:text-white">GH₵ {match.budget?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Cleanliness:</span>
                            <span className="font-medium">{match.cleanliness}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Schedule:</span>
                            <span className="font-medium">{match.sleepHabits?.replace('_', ' ')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Study:</span>
                            <span className="font-medium">{match.studyHabits}</span>
                          </div>
                          {match.bio && (
                            <p className="pt-2 text-[11px] text-zinc-500 italic border-t border-zinc-100 dark:border-zinc-800/80">
                              &quot;{match.bio}&quot;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 mt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Contact</span>
                        <a href={`mailto:${match.user.email}`} className="font-mono text-emerald-700 dark:text-emerald-400 hover:underline">
                          {match.user.email}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="animate-in space-y-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h2 className="text-xl font-black text-zinc-950 dark:text-white tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Tenancy Agreements &amp; Legal Leases
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Digital tenancy agreements with tamper-evident e-signatures and protected records.
              </p>
            </div>
            <div className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 rounded-md text-[11px] font-semibold flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700/80 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Verified Standard
            </div>
          </div>

          {agreementsLoading ? (
            <SkeletonTable rows={3} columns={4} />
          ) : agreements.length === 0 ? (
            <div className="py-14 text-center flex flex-col items-center">
              <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-3 text-zinc-400">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-950 dark:text-white">No Tenancy Agreements Yet</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mt-1 mb-4 leading-relaxed">
                When a landlord confirms your reservation, your digital tenancy agreement will appear here for review and electronic signature.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {agreements.map((agreement: any) => {
                const b = agreement.booking;
                const p = b?.property || {};
                const l = p?.landlord || {};
                const isCompleted = agreement.status === 'COMPLETED' || (Boolean(agreement.tenantSignature) && Boolean(agreement.landlordSignature));

                return (
                  <div key={agreement.id} className="py-5 first:pt-1 last:pb-1 space-y-3 transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-900/30 -mx-3 px-3 sm:-mx-4 sm:px-4 rounded-xl">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-zinc-950 dark:text-white">{p.title || 'Property Lease'}</h3>
                          <span className={clsx(
                            "px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase",
                            isCompleted ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60" : "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60"
                          )}>
                            {isCompleted ? 'EXECUTED & COMPLETED' : agreement.status}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400" /> {p.location || 'N/A'}
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <span>Room: {b?.room?.roomType || 'Standard'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isCompleted && (
                          <Link 
                            href={`/dashboard/agreements/${b.id}`}
                            className="px-3.5 py-1.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            Sign Agreement Now
                          </Link>
                        )}
                        {isCompleted && (
                          <button
                            onClick={() => handlePrintAgreement(agreement)}
                            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Printer className="w-3.5 h-3.5" /> Print Official Copy
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Signatures & Execution Line */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Tenant: <strong>Signed</strong> {agreement.tenantSignedAt ? `on ${new Date(agreement.tenantSignedAt).toLocaleDateString()}` : ''}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                        {agreement.landlordSignedAt ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                        <span>Landlord ({l.firstName || 'Landlord'} {l.lastName || ''}): {agreement.landlordSignedAt ? <strong>Counter-signed</strong> : <span className="text-amber-600 dark:text-amber-400 font-medium">Pending Counter-Signature</span>}</span>
                      </div>
                    </div>

                    {/* Cryptographic SHA-256 Verification Monospace Line */}
                    {agreement.cryptographicHash && (
                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-1.5 rounded-md border border-zinc-200/60 dark:border-zinc-800/60">
                        <div className="flex items-center gap-2 truncate max-w-xl">
                          <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase text-[10px]">SHA-256:</span>
                          <span className="truncate">{agreement.cryptographicHash}</span>
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(agreement.cryptographicHash);
                            toast.success('SHA-256 Hash copied to clipboard');
                          }}
                          className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white flex items-center gap-1 cursor-pointer font-sans text-xs shrink-0"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="animate-in space-y-6">
          {/* ── DIRECT CANVAS FINANCIAL READOUT (STRIPE/BREX STYLE) ── */}
          <div className="pb-6 border-b border-zinc-200 dark:border-zinc-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total Paid Rent</p>
                <p className="text-3xl font-black text-zinc-950 dark:text-white tabular-nums tracking-tight">GH₵ {totalPaidGhs.toLocaleString()}</p>
                <p className="text-xs text-zinc-500">Cumulative verified tenancy disbursements</p>
              </div>

              <div className="space-y-1 sm:border-l sm:border-zinc-200 dark:sm:border-zinc-800 sm:pl-6">
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Verified Receipts</p>
                <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400 tabular-nums tracking-tight">{transactions.length}</p>
                <p className="text-xs text-zinc-500">Instant digital rent receipts</p>
              </div>

              <div className="space-y-1 sm:border-l sm:border-zinc-200 dark:sm:border-zinc-800 sm:pl-6">
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Escrow Safeguard</p>
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-1">
                  <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Paystack &amp; BoG Escrow
                </p>
                <p className="text-xs text-zinc-500">MTN MoMo, Telecel Cash &amp; Bank Cards</p>
              </div>
            </div>
          </div>

          {/* ── FINANCIAL PAYMENT LEDGER ── */}
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">Transaction History &amp; Official Receipts</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Download itemized receipts for tax and proof of tenancy.</p>
              </div>
            </div>

            {transactionsLoading ? (
              <SkeletonTable rows={4} columns={5} />
            ) : transactions.length === 0 ? (
              <div className="py-14 text-center flex flex-col items-center">
                <div className="w-14 h-14 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-3 text-zinc-400">
                  <Receipt className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-zinc-950 dark:text-white">No Payment History Yet</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1 mb-4 leading-relaxed">
                  When you complete rental payments on Paystack, your receipts and transaction histories will populate here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      <th className="py-3 pr-4">Transaction Ref</th>
                      <th className="py-3 px-4">Property &amp; Unit</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 pl-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {transactions.map((tx: any) => {
                      const p = tx.property || {};

                      return (
                        <tr key={tx.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40 transition-colors">
                          <td className="py-3.5 pr-4">
                            <div className="font-mono font-semibold text-zinc-950 dark:text-white text-xs">{tx.reference}</div>
                            <div className="text-[10px] text-zinc-400">Paystack Direct</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-200 text-xs">{p.title || 'Property'}</div>
                            <div className="text-[11px] text-zinc-500">Room: {tx.room?.roomType || 'Standard Room'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-sm text-zinc-950 dark:text-white tabular-nums">GH₵ {tx.amount?.toLocaleString()}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="text-zinc-800 dark:text-zinc-200">{new Date(tx.createdAt).toLocaleDateString()}</div>
                            <div className="text-[10px] text-zinc-400">{new Date(tx.createdAt).toLocaleTimeString()}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3.5 pl-4 text-right">
                            <button
                              onClick={() => handlePrintReceipt(tx)}
                              className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <Printer className="w-3.5 h-3.5" /> Receipt
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'safety' && (
        <div className="animate-in space-y-6">
          {/* ── HEADER BANNER (CANVAS DIRECT) ── */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h2 className="text-xl font-black text-zinc-950 dark:text-white tracking-tight flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" /> Emergency &amp; Tenant Safety Directory
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-2xl">
                One-tap direct dials for Ghanaian national first responders, campus security desks, and your active residence manager.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 text-xs font-semibold shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>24/7 Dispatch Ready</span>
            </div>
          </div>

          {/* ── ACTIVE RESIDENCE MANAGER CONTACT STRIP ── */}
          {(() => {
            const activeBooking = activeBookings.find((b: any) => ['COMPLETED', 'APPROVED', 'CONFIRMED'].includes(b.status)) || activeBookings[0] || null;
            const p = activeBooking?.property;
            const phone = p?.landlord?.phoneNumber || '+233200000000';
            const cleanPhone = phone.replace(/[^0-9+]/g, '');
            const fullAddress = p ? `${p.title}, ${p.location || 'Accra, Ghana'}` : 'Akwaaba Homes Residential Network';

            if (!p) {
              return (
                <div className="py-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-950 dark:text-white">Akwaaba Resident Support Concierge</h4>
                      <p className="text-xs text-zinc-500">Available 24/7 for tenant onboarding, lease safety, and general inquiries.</p>
                    </div>
                  </div>
                  <a
                    href="tel:+233302000000"
                    className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0"
                  >
                    Call Support (+233 30 200 0000)
                  </a>
                </div>
              );
            }

            return (
              <div className="py-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60">
                        Current Residence Manager
                      </span>
                      {activeBooking?.id && (
                        <span className="text-xs text-zinc-400 font-mono">Lease #{activeBooking.id.slice(-6).toUpperCase()}</span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-zinc-950 dark:text-white tracking-tight">{p.title}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{p.location || 'Accra, Ghana'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-bold text-zinc-900 dark:text-white">
                        {p.landlord?.firstName} {p.landlord?.lastName || 'Host'}
                      </p>
                      <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">{phone}</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-300 shrink-0">
                      {(p.landlord?.firstName?.[0] || 'H')}{(p.landlord?.lastName?.[0] || 'M')}
                    </div>
                  </div>
                </div>

                {/* Dispatch & Action Strip */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs pt-1">
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>Dispatch Address: <strong className="text-zinc-900 dark:text-white font-medium">{fullAddress}</strong></span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(fullAddress);
                        setCopiedDispatchAddress(true);
                        toast.success('Dispatch address copied to clipboard');
                        setTimeout(() => setCopiedDispatchAddress(false), 2500);
                      }}
                      className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white inline-flex items-center gap-1 font-semibold ml-1 cursor-pointer"
                    >
                      {copiedDispatchAddress ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDispatchAddress ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`tel:${cleanPhone}`}
                      className="px-3 py-1.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <PhoneCall className="w-3.5 h-3.5" /> Call Manager
                    </a>
                    <a
                      href={`https://wa.me/${cleanPhone.replace('+', '')}?text=URGENT%20SAFETY%20ALERT:%20I%20am%20a%20tenant%20at%20${encodeURIComponent(p?.title)}%20and%20require%20immediate%20assistance.`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
                    </a>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── NATIONAL & CAMPUS HOTLINES DIRECTORY ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px] font-mono">
              National First Responders &amp; Security Hotlines
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  name: 'Ghana Police Service',
                  category: 'Security & Crime Patrol',
                  hotline: '191 / 112',
                  dialUrl: 'tel:191',
                  description: 'Immediate response for burglary, threats, and emergency patrol.',
                  icon: BadgeCheck,
                  badgeColor: 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/60',
                },
                {
                  name: 'National Ambulance',
                  category: 'Paramedic & Trauma',
                  hotline: '193 / 112',
                  dialUrl: 'tel:193',
                  description: 'Urgent medical emergencies and rapid hospital conveyance.',
                  icon: HeartPulse,
                  badgeColor: 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/80 dark:border-rose-900/60',
                },
                {
                  name: 'National Fire Service',
                  category: 'Fire & Gas Outbreaks',
                  hotline: '192 / 112',
                  dialUrl: 'tel:192',
                  description: 'Structural fires, smoke, gas leaks, and search & rescue.',
                  icon: Flame,
                  badgeColor: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/60',
                },
                {
                  name: 'Campus Security',
                  category: 'Night Patrol & Gating',
                  hotline: '+233 30 221 3820',
                  dialUrl: 'tel:+233302213820',
                  description: 'Campus gate guards, night escort, and perimeter control.',
                  icon: Radio,
                  badgeColor: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
                },
              ].map((service) => {
                const Icon = service.icon;
                return (
                  <div
                    key={service.name}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Icon className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                        <span className={clsx("text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border", service.badgeColor)}>
                          {service.hotline}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-zinc-950 dark:text-white">
                          {service.name}
                        </h4>
                        <p className="text-[11px] text-zinc-500">
                          {service.category}
                        </p>
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-auto">
                      <a
                        href={service.dialUrl}
                        className="w-full py-1.5 px-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Phone className="w-3 h-3" /> Dial {service.hotline.split('/')[0].trim()}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RESIDENT EMERGENCY PROTOCOLS (CLEAN 3-COLUMN LEDGER) ── */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Resident Emergency Protocols &amp; Action Guidelines
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              <div className="space-y-1">
                <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Medical Emergency
                </div>
                <p>
                  Dial <strong>193 / 112</strong> immediately. Communicate your unit number and nearest street landmark. Ensure compound gates are kept open for rapid paramedic entry.
                </p>
              </div>

              <div className="space-y-1 md:border-l md:border-zinc-200 dark:md:border-zinc-800 md:pl-6">
                <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" /> Fire &amp; Gas Leaks
                </div>
                <p>
                  Evacuate via stairs — never use elevators. Dial <strong>192</strong>, pull compound alarms if available, and assemble at the designated compound open yard.
                </p>
              </div>

              <div className="space-y-1 md:border-l md:border-zinc-200 dark:md:border-zinc-800 md:pl-6">
                <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-500" /> Intrusion &amp; Security
                </div>
                <p>
                  Secure deadbolts immediately. Dial <strong>191 / 112</strong>, alert your compound caretaker via WhatsApp, and remain securely indoors until clearance is confirmed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'visitors' && (
        <div>
          <VisitorPassTab bookings={bookings} />
        </div>
      )}

      {activeTab === 'services' && (
        <div>
          <HomeServicesTab bookings={bookings} />
        </div>
      )}

      {activeTab === 'vehicles' && (
        <div>
          <VehicleParkingTab bookings={bookings} />
        </div>
      )}

      {activeTab === 'renewals' && (
        <div>
          <LeaseRenewalTab bookings={bookings} />
        </div>
      )}

      {activeTab === 'deliveries' && (
        <div>
          <PackageDeliveriesTab bookings={bookings} />
        </div>
      )}

      {activeTab === 'billsplit' && (
        <div>
          <BillSplitterTab bookings={bookings} />
        </div>
      )}

      {activeTab === 'tranches' && (
        <div>
          <TenantPaymentScheduleTab bookings={bookings} />
        </div>
      )}

      {activeTab === 'inventory' && (
        <div>
          <TenantAssetInventoryTab bookings={bookings} />
        </div>
      )}




      {/* Digital Student Gate Pass & Move-In Clearance Modal */}
      {selectedGatePassBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSelectedGatePassBooking(null)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-zinc-950 dark:text-white">
                    {session?.studentId ? 'Digital Student Gate Pass' : 'Resident Move-In Gate Pass'}
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    {session?.studentId ? 'Verified Student' : 'Verified Resident'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Official move-in clearance for compound gate security &amp; caretaker key collection.
                </p>
              </div>
            </div>

            {/* Pass Card */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-3 border-b border-zinc-200/80 dark:border-zinc-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Resident Name</span>
                  <span className="font-bold text-zinc-900 dark:text-white text-sm">
                    {session?.firstName} {session?.lastName}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Gate Pass Code</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                    {session?.studentId ? 'STU-GATE-' : 'RES-GATE-'}{selectedGatePassBooking.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">{session?.studentId ? 'Institution / Campus' : 'Location Area'}</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{session?.campus || 'Greater Accra'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">{session?.studentId ? 'Student ID / Index No.' : 'Resident ID'}</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white">{session?.studentId || session?.ghanaCardNumber || 'On-file'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Accommodation</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{selectedGatePassBooking.property?.title}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Allocated Unit</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {selectedGatePassBooking.room?.roomType || 'Standard Room'}
                    {selectedGatePassBooking.roomUnit?.unitNumber ? ` • Unit ${selectedGatePassBooking.roomUnit.unitNumber}` : ''}
                    {selectedGatePassBooking.bed?.bedNumber ? ` • Bed ${selectedGatePassBooking.bed.bedNumber}` : ''}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-200/80 dark:border-zinc-800 text-[11px] text-zinc-500 space-y-1">
                <div>Move-In Validity: {new Date(selectedGatePassBooking.startDate).toLocaleDateString()} to {new Date(selectedGatePassBooking.endDate).toLocaleDateString()}</div>
                <div>Emergency Contact: {session?.guardianName ? `${session?.guardianName} (${session?.guardianPhone || 'N/A'})` : 'Property Front Desk'}</div>
              </div>
            </div>

            {/* Check-In Protocol Instructions */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Caretaker Key Handover Requirement</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                Present this digital pass alongside your <strong>physical University Student ID Card</strong> to the compound caretaker. The caretaker will cross-check your Student ID against this pass before releasing your physical room keys.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.print();
                  }
                }}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save Pass</span>
              </button>
              <button
                onClick={() => setSelectedGatePassBooking(null)}
                className="flex-1 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TenantDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-[500px] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
      </div>
    }>
      <TenantDashboardContent />
    </Suspense>
  );
}
