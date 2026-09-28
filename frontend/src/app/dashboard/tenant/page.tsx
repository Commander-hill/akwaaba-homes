'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { 
  Loader2, Calendar, MapPin, CheckCircle, Clock, XCircle, Star, PenTool, 
  AlertTriangle, MessageSquarePlus, Users, Edit3, HeartHandshake, UserPlus, 
  MessageSquare, Flag, CreditCard, Lock, FileText, Printer, Copy, CheckCircle2, 
  Receipt, PhoneCall, Siren, Phone, ExternalLink, Heart, Megaphone, KeyRound, 
  Car, Package, DollarSign, HeartPulse, Flame, Key, AlertCircle, ClipboardCheck, BadgeCheck,
  Radio, Building2, Check, Trash2, Wrench, Camera, GraduationCap, ChevronRight, ArrowLeft,
  ArrowUpRight, Scale, ShieldCheck, Sparkles, Filter, Plus
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

// ─── 5 Cohesive Resident Pillars ─────────────────────────────────────────────
export type TenantPillarType = 'residence' | 'payments' | 'maintenance' | 'living' | 'community';

// Legacy mapping for bookmarks and direct links
const LEGACY_TAB_MAP: Record<string, { pillar: TenantPillarType; subview?: string }> = {
  'bookings': { pillar: 'residence', subview: 'home' },
  'active-booking': { pillar: 'residence', subview: 'home' },
  'documents': { pillar: 'residence', subview: 'lease' },
  'renewals': { pillar: 'residence', subview: 'renewals' },
  'inventory': { pillar: 'residence', subview: 'inventory' },
  'payments': { pillar: 'payments', subview: 'receipts' },
  'tranches': { pillar: 'payments', subview: 'tranches' },
  'billsplit': { pillar: 'payments', subview: 'billsplit' },
  'tickets': { pillar: 'maintenance', subview: 'tickets' },
  'safety': { pillar: 'maintenance', subview: 'safety' },
  'visitors': { pillar: 'living', subview: 'passes' },
  'deliveries': { pillar: 'living', subview: 'deliveries' },
  'vehicles': { pillar: 'living', subview: 'vehicles' },
  'services': { pillar: 'living', subview: 'services' },
  'roommates': { pillar: 'community', subview: 'roommates' },
  'messages': { pillar: 'community', subview: 'messages' },
  'reviews': { pillar: 'community', subview: 'reviews' },
};

function LiveBookingCountdown({ createdAt, onExpire }: { createdAt: string; onExpire?: () => void }) {
  const getRemainingSeconds = () => {
    const expiresAt = new Date(createdAt).getTime() + 15 * 60 * 1000;
    return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  };

  const [diffSec, setDiffSec] = useState<number>(getRemainingSeconds);

  useEffect(() => {
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
      <span className="text-[11px] font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900 flex items-center gap-1">
        <Clock className="w-3 h-3 text-rose-500" />
        Expired
      </span>
    );
  }

  const minutes = Math.floor(diffSec / 60);
  const seconds = String(diffSec % 60).padStart(2, '0');

  return (
    <span className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 flex items-center gap-1">
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

  // Determine initial pillar & subview
  const initialNav = useMemo(() => {
    if (!tabParam) return { pillar: 'residence' as TenantPillarType, subview: 'home' };
    if (['residence', 'payments', 'maintenance', 'living', 'community'].includes(tabParam)) {
      return { pillar: tabParam as TenantPillarType, subview: undefined };
    }
    if (LEGACY_TAB_MAP[tabParam]) {
      return LEGACY_TAB_MAP[tabParam];
    }
    return { pillar: 'residence' as TenantPillarType, subview: 'home' };
  }, [tabParam]);

  const [activePillar, setActivePillar] = useState<TenantPillarType>(initialNav.pillar);
  const [subview, setSubview] = useState<string>(initialNav.subview || 'home');

  useEffect(() => {
    if (tabParam) {
      if (['residence', 'payments', 'maintenance', 'living', 'community'].includes(tabParam)) {
        setActivePillar(tabParam as TenantPillarType);
      } else if (LEGACY_TAB_MAP[tabParam]) {
        setActivePillar(LEGACY_TAB_MAP[tabParam].pillar);
        if (LEGACY_TAB_MAP[tabParam].subview) {
          setSubview(LEGACY_TAB_MAP[tabParam].subview!);
        }
      }
    }
  }, [tabParam]);

  const handleSelectPillar = (pillar: TenantPillarType) => {
    setActivePillar(pillar);
    // Reset to default subview for that pillar
    let defSubview = 'home';
    if (pillar === 'payments') defSubview = 'receipts';
    if (pillar === 'maintenance') defSubview = 'tickets';
    if (pillar === 'living') defSubview = 'passes';
    if (pillar === 'community') defSubview = 'roommates';
    setSubview(defSubview);
    router.replace(`/dashboard/tenant?tab=${pillar}`, { scroll: false });
  };

  // Queries
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    }
  });

  const { data: bookingsResponse, isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings', 'tenant'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/me');
      return data;
    }
  });

  const { data: ticketsResponse, isLoading: ticketsLoading } = useQuery({
    queryKey: ['tickets', 'tenant'],
    queryFn: async () => {
      const { data } = await api.get('/tickets/me');
      return data;
    }
  });

  const { data: agreementsResponse, isLoading: agreementsLoading } = useQuery({
    queryKey: ['agreements', 'tenant'],
    queryFn: async () => {
      const { data } = await api.get('/agreements/tenant');
      return data;
    }
  });

  const { data: transactionsResponse, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', 'tenant'],
    queryFn: async () => {
      const { data } = await api.get('/transactions/tenant');
      return data;
    }
  });

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
        if (err.response?.status === 404) return null;
        throw err;
      }
    }
  });

  const { data: roommateMatchesResponse } = useQuery({
    queryKey: ['roommateMatches'],
    queryFn: async () => {
      const { data } = await api.get('/roommates/matches');
      return data;
    },
    enabled: !!roommateProfileResponse?.profile
  });

  const { data: myReviewsData, isLoading: myReviewsLoading } = useQuery({
    queryKey: ['myReviews'],
    queryFn: async () => {
      const { data } = await api.get('/reviews/mine');
      return data;
    }
  });

  // State
  const [selectedGatePassBooking, setSelectedGatePassBooking] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [roommateProfile, setRoommateProfile] = useState({
    budget: 5000,
    cleanliness: 'AVERAGE',
    sleepHabits: 'EARLY_BIRD',
    studyHabits: 'QUIET',
    bio: ''
  });
  const [copiedDispatchAddress, setCopiedDispatchAddress] = useState(false);
  const [bookingFilter, setBookingFilter] = useState<'ACTIVE' | 'CANCELLED'>('ACTIVE');

  // Verify Paystack return params
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
          }
        }
      );
    }
  }, []);

  // Mutations
  const cancelPendingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data } = await api.post(`/bookings/${bookingId}/cancel`);
      return data;
    },
    onSuccess: () => {
      toast.success('Booking request cancelled. 100% Escrow refund initiated.');
      queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    }
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data } = await api.delete(`/bookings/${bookingId}`);
      return data;
    },
    onSuccess: () => {
      toast.success('Booking removed from history');
      queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] });
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
      toast.error(err.response?.data?.message || 'Failed to initialize payment');
    }
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ bookingId, reference }: { bookingId: string, reference: string }) => {
      const res = await api.post(`/bookings/${bookingId}/verify-payment`, { reference });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] });
      queryClient.invalidateQueries({ queryKey: ['transactions', 'tenant'] });
      queryClient.invalidateQueries({ queryKey: ['agreements', 'tenant'] });
      toast.success('Payment verified! Tenancy agreement ready to sign.');
      window.history.replaceState({}, document.title, window.location.pathname);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Payment verification failed');
    }
  });

  const profileMutation = useMutation({
    mutationFn: async (profileData: any) => {
      const res = await api.post('/roommates/profile', profileData);
      return res.data;
    },
    onSuccess: () => {
      setIsEditingProfile(false);
      toast.success('Roommate preferences updated');
      queryClient.invalidateQueries({ queryKey: ['roommateProfile', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['roommateMatches'] });
    }
  });

  // Data processing
  const bookings = bookingsResponse?.bookings || [];
  const activeBookings = bookings.filter((b: any) => ['PENDING', 'APPROVED', 'CONFIRMED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(b.status));
  const cancelledBookings = bookings.filter((b: any) => ['CANCELLED', 'REJECTED'].includes(b.status));
  const displayedBookings = bookingFilter === 'ACTIVE' ? activeBookings : cancelledBookings;

  const tickets = ticketsResponse?.tickets || [];
  const agreements = agreementsResponse?.agreements || [];
  const transactions = transactionsResponse?.transactions || [];
  const matches = roommateMatchesResponse?.matches || [];
  const myReviews = myReviewsData?.reviews || myReviewsData || [];

  const totalPaidGhs = transactions.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

  // Active Resident Dossier Selection
  const activeResidentBooking = activeBookings.find((b: any) =>
    ['APPROVED', 'CONFIRMED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(b.status)
  );
  const pendingBooking = activeBookings.find((b: any) => b.status === 'PENDING');

  const activePropertyId = activeResidentBooking?.propertyId || pendingBooking?.propertyId;

  // Compound Notices Query
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

  const handlePrintReceipt = (tx: any) => {
    printPaymentReceipt(tx);
  };

  const handlePrintAgreement = (agreement: any) => {
    printLeaseAgreementReceipt(agreement);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24">
      <OnboardingProgressWidget user={session} />

      {/* ── AMBIENT COMPOUND NOTICES ── */}
      {compoundNotices.length > 0 && (
        <div className="space-y-2">
          {compoundNotices.map((notice: any) => {
            if (!notice) return null;
            const isEmergency = notice.priority === 'EMERGENCY';
            const isImportant = notice.priority === 'IMPORTANT';
            return (
              <div
                key={notice.id}
                className={clsx(
                  "py-3 px-4 rounded-xl border-l-4 flex items-start gap-3 text-xs transition-colors",
                  isEmergency && "bg-rose-50/70 border-l-rose-600 text-rose-950 dark:bg-rose-950/20 dark:text-rose-200 border border-rose-200 dark:border-rose-900/40",
                  isImportant && "bg-amber-50/70 border-l-amber-500 text-amber-950 dark:bg-amber-950/20 dark:text-amber-200 border border-amber-200 dark:border-amber-900/40",
                  !isEmergency && !isImportant && "bg-emerald-50/70 border-l-[#0F5132] text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/40"
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

      {/* ── CONTEXT-AWARE HERO MASTHEAD ── */}
      {activeResidentBooking ? (
        /* State A: Active Resident Dossier */
        <section aria-label="Active Residence Dossier" className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700">
                {(() => {
                  try {
                    let imgs = activeResidentBooking.property?.images;
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
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#0F5132] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                    Active Resident
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {activeResidentBooking.status === 'CHECKED_IN' || activeResidentBooking.status === 'ACTIVE' 
                      ? 'Tenancy Active' 
                      : 'Move-In Ready'}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-medium">
                    <Lock className="w-3 h-3 text-[#0F5132] dark:text-emerald-400" /> MoMo Escrow Verified
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white tracking-tight truncate">
                  {activeResidentBooking.property?.title}
                </h1>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{activeResidentBooking.property?.location}</span>
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-700">•</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-200">
                    {activeResidentBooking.room?.roomType || 'Standard Unit'}
                    {activeResidentBooking.roomUnit?.unitNumber ? ` · Unit ${activeResidentBooking.roomUnit.unitNumber}` : ''}
                    {activeResidentBooking.bed?.bedNumber ? ` · Bed ${activeResidentBooking.bed.bedNumber}` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Fast Action Tray */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setSelectedGatePassBooking(activeResidentBooking)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F5132] hover:bg-[#0B3D26] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Digital Gate Pass</span>
              </button>

              <Link
                href={`/dashboard/tenant/tickets/new?propertyId=${activeResidentBooking.propertyId}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors"
              >
                <Wrench className="w-3.5 h-3.5 text-amber-500" />
                <span>Report Issue</span>
              </Link>

              <Link
                href={`/dashboard/agreements/${activeResidentBooking.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                <span>View Lease</span>
              </Link>

              <Link
                href={`/dashboard/tenant/bills/split/new?propertyId=${activeResidentBooking.propertyId}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-700 transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Split Utility</span>
              </Link>
            </div>
          </div>

          {/* Tenancy Validity Row */}
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-4 flex-wrap">
              <span>Term: <strong className="text-zinc-900 dark:text-zinc-100">{new Date(activeResidentBooking.startDate).toLocaleDateString()} – {new Date(activeResidentBooking.endDate).toLocaleDateString()}</strong></span>
              {activeResidentBooking.price && (
                <span>Advance: <strong className="text-zinc-900 dark:text-zinc-100">GH₵ {activeResidentBooking.price.toLocaleString()}</strong></span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Key Handover &amp; Move-in Inventory Cleared
              </span>
            </div>
          </div>
        </section>
      ) : pendingBooking ? (
        /* State B: Pending Booking / Escrow Hold */
        <section aria-label="Pending Booking Escrow Status" className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-700">
                  Escrow Hold Active
                </span>
                <LiveBookingCountdown createdAt={pendingBooking.createdAt} />
              </div>
              <h2 className="text-lg font-bold text-zinc-950 dark:text-white">
                Booking Pending Landlord Confirmation: {pendingBooking.property?.title}
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                Your rent deposit is secured in Paystack escrow. If the landlord does not confirm within the window, a <strong>100% automated refund</strong> is issued to your mobile money account.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => cancelPendingMutation.mutate(pendingBooking.id)}
                disabled={cancelPendingMutation.isPending}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 transition cursor-pointer"
              >
                {cancelPendingMutation.isPending ? 'Cancelling...' : 'Cancel & Release Escrow'}
              </button>
            </div>
          </div>
        </section>
      ) : (
        /* State C: New Tenant Discovery Hero */
        <section aria-label="Welcome Hero" className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" /> Ghana Rent Act, 1963 (Act 220) Verified
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
                Welcome to your Resident Portal
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Discover verified student hostels, executive flats, and shared apartments across Greater Accra and Kumasi. All advance rents are secured in escrow until move-in.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                href="/properties"
                className="px-4 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0B3D26] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
              >
                <span>Browse Verified Rooms</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/dashboard/verification"
                className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs border border-zinc-200 dark:border-zinc-700 transition-colors"
              >
                Verify Ghana Card
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── 4 EXECUTIVE SNAPSHOT METRICS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Current Residence</div>
          <div className="text-sm sm:text-base font-bold text-zinc-950 dark:text-white mt-0.5 truncate">
            {activeResidentBooking?.property?.title || 'No Active Stay'}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 flex items-center gap-1 truncate">
            <Lock className="w-2.5 h-2.5 shrink-0" />
            <span>{activeResidentBooking ? 'MoMo Escrow Verified' : 'Explore Campus Hostels'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Escrow Rent Paid</div>
          <div className="text-lg sm:text-xl font-black text-[#0F5132] dark:text-emerald-400 mt-0.5">
            GH₵ {totalPaidGhs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Protected in Paystack escrow</div>
        </div>

        <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Legal Agreements</div>
          <div className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white mt-0.5">
            {agreements.length} {agreements.length === 1 ? 'Agreement' : 'Agreements'}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Act 220 Legally Binding</div>
        </div>

        <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Maintenance Queue</div>
          <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
            {tickets.filter((t: any) => t.status !== 'RESOLVED').length} Active
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">
            {tickets.filter((t: any) => t.status === 'RESOLVED').length} resolved tickets
          </div>
        </div>
      </div>

      {/* ── 5 RESIDENT PILLARS NAVIGATION ── */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap py-1">
          <button
            type="button"
            onClick={() => handleSelectPillar('residence')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activePillar === 'residence'
                ? "bg-[#0F5132] text-white shadow-xs"
                : "bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50"
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>My Residence &amp; Lease</span>
            {activeBookings.length > 0 && (
              <span className={clsx(
                "px-1.5 py-0.2 rounded-full font-mono text-[10px] font-extrabold",
                activePillar === 'residence' ? "bg-white/20 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              )}>
                {activeBookings.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectPillar('payments')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activePillar === 'payments'
                ? "bg-[#0F5132] text-white shadow-xs"
                : "bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50"
            )}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Escrow &amp; Payments</span>
            {transactions.length > 0 && (
              <span className={clsx(
                "px-1.5 py-0.2 rounded-full font-mono text-[10px] font-extrabold",
                activePillar === 'payments' ? "bg-white/20 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              )}>
                {transactions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectPillar('maintenance')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activePillar === 'maintenance'
                ? "bg-[#0F5132] text-white shadow-xs"
                : "bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50"
            )}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Repairs &amp; Maintenance</span>
            {tickets.filter((t: any) => t.status !== 'RESOLVED').length > 0 && (
              <span className={clsx(
                "px-1.5 py-0.2 rounded-full font-mono text-[10px] font-extrabold",
                activePillar === 'maintenance' ? "bg-white/20 text-white" : "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300"
              )}>
                {tickets.filter((t: any) => t.status !== 'RESOLVED').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectPillar('living')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activePillar === 'living'
                ? "bg-[#0F5132] text-white shadow-xs"
                : "bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50"
            )}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Living &amp; Amenities</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPillar('community')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap",
              activePillar === 'community'
                ? "bg-[#0F5132] text-white shadow-xs"
                : "bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50"
            )}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Community &amp; Roommates</span>
          </button>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          PILLAR 1: MY RESIDENCE & LEASE
      ═════════════════════════════════════════════════════════════════════════ */}
      {activePillar === 'residence' && (
        <div className="space-y-6">
          {/* Subview Pills */}
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            {[
              { id: 'home', label: 'Accommodation Dossier' },
              { id: 'lease', label: `Digital Leases (${agreements.length})` },
              { id: 'inventory', label: 'Move-in Inventory' },
              { id: 'renewals', label: 'Lease Renewal' },
              { id: 'history', label: 'Booking Archive' },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSubview(sub.id)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                  subview === sub.id
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Subview: Home / Accommodations */}
          {subview === 'home' && (
            <div className="space-y-6">
              {bookingsLoading ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" /></div>
              ) : activeBookings.length === 0 ? (
                <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">No Active Accommodations</h3>
                  <p className="text-xs text-zinc-500 max-w-md mx-auto">
                    You do not have any active or confirmed bookings. Explore verified hostels and apartments across Ghana.
                  </p>
                  <Link
                    href="/properties"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F5132] text-white text-xs font-bold hover:bg-[#0B3D26] transition"
                  >
                    Find a Home
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeBookings.map((b: any) => {
                    const isConfirmed = ['APPROVED', 'CONFIRMED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(b.status);
                    const isPending = b.status === 'PENDING';

                    return (
                      <div
                        key={b.id}
                        className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                                {b.property?.title}
                              </h3>
                              <span className={clsx(
                                "px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase",
                                isConfirmed && "bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
                                isPending && "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              )}>
                                {b.status}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                              <span>{b.property?.location || b.property?.city || 'Accra, Ghana'}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-zinc-400 uppercase font-mono block">Rental Rate</span>
                            <span className="text-sm font-bold text-zinc-900 dark:text-white">
                              GH₵ {b.price ? b.price.toLocaleString() : '—'}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Unit Allocated</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                              {b.room?.roomType || 'Standard'} {b.roomUnit?.unitNumber ? `· Unit ${b.roomUnit.unitNumber}` : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Move-in Date</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                              {new Date(b.startDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block">End Date</span>
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                              {new Date(b.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Escrow Reference</span>
                            <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-400 truncate block">
                              {b.id.slice(0, 12)}...
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isConfirmed && (
                              <button
                                onClick={() => setSelectedGatePassBooking(b)}
                                className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                                <span>Gate Clearance</span>
                              </button>
                            )}
                            <Link
                              href={`/dashboard/agreements/${b.id}`}
                              className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 transition"
                            >
                              <FileText className="w-3.5 h-3.5 text-zinc-500" />
                              <span>View Agreement</span>
                            </Link>
                          </div>

                          {isPending && (
                            <button
                              onClick={() => cancelPendingMutation.mutate(b.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 transition cursor-pointer"
                            >
                              Cancel Booking
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Subview: Leases */}
          {subview === 'lease' && (
            <div className="space-y-4">
              {agreementsLoading ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" /></div>
              ) : agreements.length === 0 ? (
                <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-2">
                  <FileText className="w-8 h-8 text-zinc-400 mx-auto" />
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white">No Signed Tenancy Leases</h3>
                  <p className="text-xs text-zinc-500">Agreements appear here once booking payment is confirmed by the landlord.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agreements.map((agr: any) => (
                    <div
                      key={agr.id}
                      className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-950 dark:text-white">
                            {agr.property?.title || 'Residential Tenancy Agreement'}
                          </h4>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Act 220 Legally Binding
                          </span>
                        </div>
                        <div className="text-xs text-zinc-500">
                          Executed between {agr.landlord?.firstName} {agr.landlord?.lastName} (Landlord) and You (Tenant)
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400">
                          Verification Hash: {agr.signatureHash ? agr.signatureHash.slice(0, 20) + '...' : agr.id}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePrintAgreement(agr)}
                          className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Agreement</span>
                        </button>
                        <Link
                          href={`/dashboard/agreements/${agr.bookingId || agr.id}`}
                          className="px-3.5 py-2 rounded-xl bg-[#0F5132] hover:bg-[#0B3D26] text-white text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <span>Open Lease</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subview: Inventory */}
          {subview === 'inventory' && (
            <TenantAssetInventoryTab bookings={bookings} />
          )}

          {/* Subview: Renewals */}
          {subview === 'renewals' && (
            <LeaseRenewalTab bookings={bookings} />
          )}

          {/* Subview: History / Archive */}
          {subview === 'history' && (
            <div className="space-y-4">
              {cancelledBookings.length === 0 ? (
                <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center text-xs text-zinc-500">
                  No cancelled or expired booking records in archive.
                </div>
              ) : (
                <div className="space-y-3">
                  {cancelledBookings.map((b: any) => (
                    <div
                      key={b.id}
                      className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-zinc-900 dark:text-white">{b.property?.title}</div>
                        <div className="text-zinc-500">Status: {b.status} · {new Date(b.createdAt).toLocaleDateString()}</div>
                      </div>
                      <button
                        onClick={() => deleteBookingMutation.mutate(b.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg transition cursor-pointer"
                        title="Remove from history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          PILLAR 2: ESCROW & PAYMENTS
      ═════════════════════════════════════════════════════════════════════════ */}
      {activePillar === 'payments' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            {[
              { id: 'receipts', label: `Escrow Receipts (${transactions.length})` },
              { id: 'tranches', label: 'Payment Tranches' },
              { id: 'billsplit', label: 'Split Utilities' },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSubview(sub.id)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                  subview === sub.id
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Subview: Escrow Receipts */}
          {subview === 'receipts' && (
            <div className="space-y-4">
              <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-[#0F5132] dark:text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    Paystack Escrow Protection
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl">
                    All rent transactions processed through AkwaabaHomes are held in automated escrow until key handover and move-in inspection are complete.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Total Escrow Processed</span>
                  <span className="text-xl font-black text-[#0F5132] dark:text-emerald-400">
                    GH₵ {totalPaidGhs.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {transactionsLoading ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" /></div>
              ) : transactions.length === 0 ? (
                <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500">
                  No payment transactions recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx: any) => (
                    <div
                      key={tx.id}
                      className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-950 dark:text-white">
                            {tx.description || tx.booking?.property?.title || 'Rent Advance Deposit'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400">
                            {tx.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {new Date(tx.createdAt).toLocaleDateString()} · Channel: {tx.channel || 'Paystack MoMo'} · Ref: <span className="font-mono">{tx.reference || tx.id.slice(0, 10)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white">
                          GH₵ {(tx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(tx)}
                          className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subview: Tranches */}
          {subview === 'tranches' && (
            <TenantPaymentScheduleTab bookings={bookings} />
          )}

          {/* Subview: Bill Splitter */}
          {subview === 'billsplit' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Link
                  href="/dashboard/tenant/bills/split/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F5132] hover:bg-[#0B3D26] text-white text-xs font-bold transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Split New Utility Bill</span>
                </Link>
              </div>
              <BillSplitterTab bookings={bookings} />
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          PILLAR 3: REPAIRS & MAINTENANCE
      ═════════════════════════════════════════════════════════════════════════ */}
      {activePillar === 'maintenance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSubview('tickets')}
                className={clsx(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                  subview === 'tickets'
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                Work Orders ({tickets.length})
              </button>
              <button
                type="button"
                onClick={() => setSubview('safety')}
                className={clsx(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                  subview === 'safety'
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                Emergency Dispatch &amp; Hotlines
              </button>
            </div>

            <Link
              href="/dashboard/tenant/tickets/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F5132] hover:bg-[#0B3D26] text-white text-xs font-bold transition shadow-xs"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Report a Maintenance Issue</span>
            </Link>
          </div>

          {/* Subview: Tickets */}
          {subview === 'tickets' && (
            <div className="space-y-4">
              {ticketsLoading ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" /></div>
              ) : tickets.length === 0 ? (
                <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3">
                  <Wrench className="w-8 h-8 text-zinc-400 mx-auto" />
                  <h3 className="text-sm font-bold text-zinc-950 dark:text-white">No Maintenance Tickets</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Everything running smoothly? If any electrical, plumbing, or lock faults occur, submit a ticket for prompt artisan dispatch.
                  </p>
                  <Link
                    href="/dashboard/tenant/tickets/new"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F5132] text-white text-xs font-bold"
                  >
                    Report Fault
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {tickets.map((t: any) => {
                    const isResolved = t.status === 'RESOLVED';
                    return (
                      <div
                        key={t.id}
                        className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-zinc-950 dark:text-white">{t.title}</h4>
                            <span className={clsx(
                              "px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase",
                              isResolved && "bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 border border-emerald-200",
                              !isResolved && "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200"
                            )}>
                              {t.status}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                              {t.priority} PRIORITY
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-400">
                            Logged {new Date(t.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-line leading-relaxed">
                          {t.description}
                        </p>

                        {t.imageUrl && (
                          <div className="pt-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={t.imageUrl} alt="Fault Attachment" className="h-28 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800" />
                          </div>
                        )}

                        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
                          <span>Property: <strong>{t.property?.title || 'Rented Unit'}</strong></span>
                          <span>Ticket Reference: <strong className="font-mono">{t.id.slice(0, 10)}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Subview: Safety & Emergency Hotlines */}
          {subview === 'safety' && (
            <div className="space-y-6">
              {/* Emergency Dispatch Card */}
              {activeResidentBooking && (
                <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                      Your Dispatch Residence Address
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const addr = `${activeResidentBooking.property?.title}, ${activeResidentBooking.property?.location}, Room ${activeResidentBooking.roomNumber || 'Unit'}`;
                        navigator.clipboard.writeText(addr);
                        setCopiedDispatchAddress(true);
                        toast.success('Address copied for emergency dispatch');
                        setTimeout(() => setCopiedDispatchAddress(false), 2000);
                      }}
                      className="text-xs font-semibold text-[#0F5132] dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedDispatchAddress ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDispatchAddress ? 'Copied' : 'Copy Address'}</span>
                    </button>
                  </div>
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-xl space-y-1">
                    <div className="font-bold text-sm text-zinc-900 dark:text-white">
                      {activeResidentBooking.property?.title}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      {activeResidentBooking.property?.location}, Greater Accra, Ghana
                    </div>
                    {activeResidentBooking.roomNumber && (
                      <div className="text-xs font-semibold text-[#0F5132] dark:text-emerald-400">
                        Allocated Unit: {activeResidentBooking.roomNumber}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* National Emergency Hotline Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-sm text-zinc-950 dark:text-white">Ghana Police Service</div>
                  <div className="text-[11px] text-zinc-500">Security threats, compound intrusion</div>
                  <a href="tel:191" className="block mt-2 font-mono font-black text-base text-blue-600 hover:underline">
                    191 / 18555
                  </a>
                </div>

                <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-sm text-zinc-950 dark:text-white">National Fire Service</div>
                  <div className="text-[11px] text-zinc-500">Gas leaks, active electrical fires</div>
                  <a href="tel:192" className="block mt-2 font-mono font-black text-base text-rose-600 hover:underline">
                    192
                  </a>
                </div>

                <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                    <HeartPulse className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-sm text-zinc-950 dark:text-white">Ambulance Service</div>
                  <div className="text-[11px] text-zinc-500">Medical emergencies, paramedic triage</div>
                  <a href="tel:193" className="block mt-2 font-mono font-black text-base text-emerald-600 hover:underline">
                    193
                  </a>
                </div>

                <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                    <Siren className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-sm text-zinc-950 dark:text-white">Emergency Toll-Free</div>
                  <div className="text-[11px] text-zinc-500">Universal national crisis dispatch</div>
                  <a href="tel:112" className="block mt-2 font-mono font-black text-base text-amber-600 hover:underline">
                    112
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          PILLAR 4: LIVING & AMENITIES
      ═════════════════════════════════════════════════════════════════════════ */}
      {activePillar === 'living' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            {[
              { id: 'passes', label: 'Gate Passes' },
              { id: 'deliveries', label: 'Package Deliveries' },
              { id: 'vehicles', label: 'Vehicle Parking' },
              { id: 'services', label: 'Home Services' },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSubview(sub.id)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                  subview === sub.id
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Subview: Passes */}
          {subview === 'passes' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Link
                  href="/dashboard/tenant/visitors/new"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F5132] hover:bg-[#0B3D26] text-white text-xs font-bold transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Generate New Gate Pass</span>
                </Link>
              </div>
              <VisitorPassTab bookings={bookings} />
            </div>
          )}

          {/* Subview: Deliveries */}
          {subview === 'deliveries' && (
            <PackageDeliveriesTab bookings={bookings} />
          )}

          {/* Subview: Vehicles */}
          {subview === 'vehicles' && (
            <VehicleParkingTab bookings={bookings} />
          )}

          {/* Subview: Services */}
          {subview === 'services' && (
            <HomeServicesTab bookings={bookings} />
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          PILLAR 5: COMMUNITY & ROOMMATES
      ═════════════════════════════════════════════════════════════════════════ */}
      {activePillar === 'community' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
            {[
              { id: 'roommates', label: 'Roommate Matcher' },
              { id: 'messages', label: 'Secure Messages' },
              { id: 'notices', label: 'Notice Board' },
              { id: 'reviews', label: `Reviews & Appeals (${myReviews.length})` },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSubview(sub.id)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                  subview === sub.id
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Subview: Roommates */}
          {subview === 'roommates' && (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-zinc-950 dark:text-white">Your Roommate Living Profile</h3>
                    <p className="text-xs text-zinc-500">Compatibility factors used to match you with compatible flatmates.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                    className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 transition cursor-pointer"
                  >
                    {isEditingProfile ? 'Cancel' : 'Edit Profile'}
                  </button>
                </div>

                {isEditingProfile ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      profileMutation.mutate(roommateProfile);
                    }}
                    className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Max Monthly Budget (GH₵)</label>
                        <input
                          type="number"
                          value={roommateProfile.budget}
                          onChange={(e) => setRoommateProfile({ ...roommateProfile, budget: Number(e.target.value) })}
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Sleep Schedule</label>
                        <select
                          value={roommateProfile.sleepHabits}
                          onChange={(e) => setRoommateProfile({ ...roommateProfile, sleepHabits: e.target.value })}
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none"
                        >
                          <option value="EARLY_BIRD">Early Bird (Before 10 PM)</option>
                          <option value="NIGHT_OWL">Night Owl (Late study)</option>
                          <option value="FLEXIBLE">Flexible</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">About You &amp; Expectations</label>
                      <textarea
                        rows={3}
                        value={roommateProfile.bio}
                        onChange={(e) => setRoommateProfile({ ...roommateProfile, bio: e.target.value })}
                        placeholder="State your department, university year, hobbies, and cooking habits..."
                        className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={profileMutation.isPending}
                      className="px-4 py-2 bg-[#0F5132] text-white rounded-xl text-xs font-bold hover:bg-[#0B3D26] transition cursor-pointer"
                    >
                      {profileMutation.isPending ? 'Saving...' : 'Save Profile'}
                    </button>
                  </form>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">Target Budget</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">GH₵ {roommateProfile.budget}/mo</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">Sleep Schedule</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">{roommateProfile.sleepHabits}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">Study Preference</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">{roommateProfile.studyHabits}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">Cleanliness</span>
                      <span className="font-semibold text-zinc-900 dark:text-white">{roommateProfile.cleanliness}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Roommate Matches */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Algorithmic Compatibility Matches
                </h4>
                {matches.length === 0 ? (
                  <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center text-xs text-zinc-500">
                    No matching roommates found yet. Matches appear as more tenants complete their profiles.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {matches.map((m: any) => (
                      <div
                        key={m.userId || m.id}
                        className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-sm text-zinc-950 dark:text-white">
                            {m.user?.firstName} {m.user?.lastName}
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400">
                            {m.compatibilityScore || 85}% Match
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 line-clamp-2">{m.bio || 'Prospective resident looking for quiet shared flat.'}</p>
                        <div className="text-[11px] text-zinc-400">Budget: GH₵ {m.budget}/mo · {m.sleepHabits}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Subview: Messages */}
          {subview === 'messages' && (
            <MessagingTab />
          )}

          {/* Subview: Notices */}
          {subview === 'notices' && (
            <div className="space-y-4">
              <NoticeBoard />
            </div>
          )}

          {/* Subview: Reviews & Appeals */}
          {subview === 'reviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Your Verified Reviews</span>
                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard/tenant/appeals/new"
                    className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14181E] text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-50 transition"
                  >
                    File Grievance Appeal
                  </Link>
                  <Link
                    href="/dashboard/tenant/reviews/new"
                    className="px-3.5 py-2 rounded-xl bg-[#0F5132] hover:bg-[#0B3D26] text-white text-xs font-bold transition shadow-xs"
                  >
                    Write Property Review
                  </Link>
                </div>
              </div>

              {myReviewsLoading ? (
                <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" /></div>
              ) : myReviews.length === 0 ? (
                <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center text-xs text-zinc-500">
                  You have not published any property reviews yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {myReviews.map((r: any) => (
                    <div
                      key={r.id}
                      className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm text-zinc-950 dark:text-white">
                          {r.property?.title}
                        </div>
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-bold text-zinc-900 dark:text-white">{r.rating}/5</span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">{r.comment}</p>
                      <div className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        Published {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── DIGITAL GATE PASS MODAL ── */}
      {selectedGatePassBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setSelectedGatePassBooking(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-zinc-950 dark:text-white">
                  {session?.studentId ? 'Digital Student Gate Pass' : 'Resident Gate Clearance'}
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Pre-authorized access for estate security &amp; caretaker key handover.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500">Resident Name:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{session?.firstName} {session?.lastName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500">Gate Pass Code:</span>
                <span className="font-mono font-black text-[#0F5132] dark:text-emerald-400">
                  {session?.studentId ? 'STU-' : 'RES-'}{selectedGatePassBooking.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <span className="text-zinc-500">Accommodation:</span>
                <span className="font-semibold text-zinc-900 dark:text-white truncate max-w-[180px]">
                  {selectedGatePassBooking.property?.title}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Allocated Unit:</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {selectedGatePassBooking.room?.roomType || 'Standard'} {selectedGatePassBooking.roomUnit?.unitNumber ? `· Unit ${selectedGatePassBooking.roomUnit.unitNumber}` : ''}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-900 dark:text-amber-300">
              Present this pass with your valid photo ID or Student ID Card to the caretaker upon arrival to inspect the room and collect keys.
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Pass</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedGatePassBooking(null)}
                className="flex-1 py-2.5 bg-[#0F5132] hover:bg-[#0B3D26] text-white text-xs font-bold rounded-xl transition cursor-pointer"
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
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
      </div>
    }>
      <TenantDashboardContent />
    </Suspense>
  );
}
