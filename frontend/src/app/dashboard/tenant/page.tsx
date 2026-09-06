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
  Sparkles, Car, Package, DollarSign, ShieldAlert, Shield, HeartPulse, Flame, 
  Radio, Building2, Check, ShieldCheck 
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
import DeliveryVaultTab from '@/components/tenant/DeliveryVaultTab';
import BillSplitterTab from '@/components/tenant/BillSplitterTab';
import { getImageUrl } from '@/lib/utils';
import clsx from 'clsx';
import SkeletonTable from '@/components/SkeletonTable';
import { printPaymentReceipt, printLeaseAgreementReceipt } from '@/lib/receiptTemplates';

const VALID_TENANT_TABS = [
  'bookings', 'tickets', 'reviews', 'roommates', 'documents', 'payments', 
  'safety', 'messages', 'visitors', 'services', 'vehicles', 'renewals', 
  'deliveries', 'billsplit'
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
      verifyPaymentMutation.mutate({ bookingId: verifyId, reference: (reference || trxref) as string });
    }
  }, []);
  
  // Review State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Appeal State
  const [appealModalOpen, setAppealModalOpen] = useState(false);
  const [appealTargetId, setAppealTargetId] = useState('');
  const [appealNote, setAppealNote] = useState('');

  // Ticket State
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketPropertyId, setTicketPropertyId] = useState('');
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketPriority, setTicketPriority] = useState('MEDIUM');
  const [ticketError, setTicketError] = useState('');

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
  const reviewMutation = useMutation({
    mutationFn: async (reviewData: { bookingId: string; rating: number; comment: string }) => {
      const res = await api.post('/reviews', reviewData);
      return res.data;
    },
    onSuccess: () => {
      setReviewModalOpen(false);
      setComment('');
      setRating(5);
      setReviewSuccess('Your review was submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] });
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
      setTimeout(() => setReviewSuccess(''), 5000);
    },
    onError: (err: any) => {
      setReviewError(err.response?.data?.message || 'Failed to submit review');
    }
  });

  const cancelPendingMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data } = await api.post(`/bookings/${bookingId}/cancel`);
      return data;
    },
    onSuccess: () => {
      toast.success('Pending booking request cancelled.');
      queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'my-active'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to cancel pending booking');
    }
  });

  const { data: myReviewsData, isLoading: myReviewsLoading } = useQuery({
    queryKey: ['myReviews'],
    queryFn: async () => {
      const { data } = await api.get('/reviews/mine');
      return data;
    },
  });

  const appealMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const res = await api.put(`/reviews/${id}/appeal`, { appealNote: note });
      return res.data;
    },
    onSuccess: () => {
      setAppealModalOpen(false);
      setAppealNote('');
      queryClient.invalidateQueries({ queryKey: ['myReviews'] });
    }
  });

  const ticketMutation = useMutation({
    mutationFn: async (ticketData: { propertyId: string; title: string; description: string; priority: string }) => {
      const res = await api.post('/tickets', ticketData);
      return res.data;
    },
    onSuccess: () => {
      setTicketModalOpen(false);
      setTicketTitle('');
      setTicketDesc('');
      setTicketPriority('MEDIUM');
      queryClient.invalidateQueries({ queryKey: ['tickets', 'tenant'] });
      toast.success('Maintenance request submitted successfully!');
    },
    onError: (err: any) => {
      setTicketError(err.response?.data?.message || 'Failed to submit request');
    }
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
      toast.success('Payment verified! Your booking is now complete.');
      // Remove query params
      window.history.replaceState({}, document.title, window.location.pathname);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to verify payment');
    }
  });

  const bookings = bookingsResponse?.bookings || [];
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
      case 'PENDING': return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold"><Clock className="w-3 h-3" /> Pending</span>;
      case 'REJECTED': return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold"><XCircle className="w-3 h-3" /> Rejected</span>;
      case 'COMPLETED': return <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold"><CheckCircle className="w-3 h-3" /> Completed</span>;
      
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
  const activeBooking = bookings.find((b: any) => ['APPROVED', 'CONFIRMED', 'COMPLETED', 'PENDING'].includes(b.status));
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
  const compoundNotices = Array.isArray(compoundNoticesData?.notices) ? compoundNoticesData.notices : [];

  return (
    <div className="space-y-6">
      <OnboardingProgressWidget user={session} />
      {/* Sticky Header Banner, Notice & Tabs Container */}
      <div className="sticky top-0 z-20 bg-[#FBFBFC]/95 dark:bg-[#0B0D12]/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-zinc-200 dark:border-zinc-800 space-y-4 mb-6 shadow-xs">
        <NoticeBoard />

        {/* Live Landlord Compound Notice Advisory */}
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
                    "p-3.5 rounded-2xl border flex items-start gap-3 shadow-xs animate-in",
                    isEmergency && "bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300",
                    isImportant && "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300",
                    !isEmergency && !isImportant && "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300"
                  )}
                >
                  <Megaphone className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center gap-2 font-bold flex-wrap">
                      <span className="uppercase text-[10px] tracking-wider px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/40">
                        {notice.category || 'NOTICE'} • {notice.property?.title || 'Property'}
                      </span>
                      <span>{notice.title || 'Announcement'}</span>
                    </div>
                    <p className="mt-1 font-medium opacity-90 whitespace-pre-line leading-relaxed">
                      {notice.message || ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div id="tour-tenant-workspaces" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">Tenant Dashboard</h1>
            <p className="text-[var(--muted-foreground)] text-xs sm:text-sm">Manage your residential tenancies, rent escrow payments, and maintenance requests.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/wishlist"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-sm border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors shadow-sm"
            >
              <Heart className="w-4 h-4 fill-rose-500 text-rose-500" /> My Wishlist
            </Link>
            <OnboardingTour role={session?.role} user={session} />
          </div>
        </div>
      </div>

      {activeTab === 'bookings' && (
        <div className="animate-in">
          {bookingsLoading ? (
            <SkeletonTable rows={3} columns={4} />
          ) : bookings.length === 0 ? (
            <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs p-12 rounded-2xl text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-[var(--muted-foreground)]" />
              </div>
              <h3 className="text-base font-black text-zinc-950 dark:text-white">No Active Accommodations Reserved</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-5 max-w-md mx-auto">
                Explore verified campus hostels and residential apartments across KNUST, Legon, and UCC. Your deposit is backed by MoMo escrow until physical on-site room handover.
              </p>
              <Link href="/properties" className="inline-flex items-center gap-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-xs">
                Browse Verified Hostels &amp; Apartments
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {bookings.map((booking: any) => (
                <div key={booking.id} className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs rounded-2xl p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="w-full sm:w-32 h-32 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 relative">
                    {(() => {
                      try {
                        let imgs = booking.property.images;
                        if (typeof imgs === 'string') imgs = JSON.parse(imgs);
                        if (Array.isArray(imgs) && imgs.length > 0) {
                          return <img src={getImageUrl(imgs[0])} className="w-full h-full object-cover" alt="Property" />;
                        }
                      } catch (e) {}
                      return <div className="w-full h-full flex items-center justify-center text-[var(--muted-foreground)]"><Calendar /></div>;
                    })()}
                  </div>
                  
                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-[var(--foreground)] leading-tight">{booking.property.title}</h3>
                        <div className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] mt-1">
                          <MapPin className="w-4 h-4" /> {booking.property.location}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          {booking.status === 'PENDING' && booking.createdAt && (
                            <LiveBookingCountdown 
                              createdAt={booking.createdAt} 
                              onExpire={() => queryClient.invalidateQueries({ queryKey: ['bookings', 'tenant'] })} 
                            />
                          )}
                          {getStatusBadge(booking.status)}
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                          {booking.status === 'PENDING' && (
                            <button 
                              onClick={() => cancelPendingMutation.mutate(booking.id)}
                              disabled={cancelPendingMutation.isPending}
                              className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors flex items-center gap-1 disabled:opacity-50"
                            >
                              {cancelPendingMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />} Cancel Request
                            </button>
                          )}
                          {(booking.status === 'APPROVED' || booking.status === 'COMPLETED') && (
                            <>
                              <Link 
                                href={`/dashboard/agreements/${booking.id}`}
                                className="text-xs font-bold text-white bg-[#0F5132] hover:bg-[#0A3D24] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                              >
                                View Agreement
                              </Link>
                              {booking.status === 'APPROVED' && (
                                <button 
                                  onClick={() => payBookingMutation.mutate(booking.id)}
                                  disabled={payBookingMutation.isPending || booking.leaseAgreement?.status !== 'COMPLETED'}
                                  title={booking.leaseAgreement?.status !== 'COMPLETED' ? "Tenancy Agreement must be signed by both parties first" : "Pay Rent"}
                                  className={clsx(
                                    "text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors",
                                    booking.leaseAgreement?.status !== 'COMPLETED'
                                      ? "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                                      : "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
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
                              <button 
                                onClick={() => { setTicketPropertyId(booking.propertyId); setTicketError(''); setTicketModalOpen(true); }}
                                className="text-xs font-bold text-slate-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              >
                                <PenTool className="w-3 h-3" /> Report Issue
                              </button>
                            </>
                          )}
                          {booking.status === 'COMPLETED' && (
                            <button 
                              onClick={() => { setSelectedBookingId(booking.id); setReviewError(''); setReviewModalOpen(true); }}
                              className="text-xs font-bold text-[var(--primary)] bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 rounded-lg text-xs font-bold dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                            >
                              <Star className="w-3 h-3 fill-current" /> Leave Review
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border">
                      <div>
                        <span className="text-[var(--muted-foreground)] block text-xs uppercase tracking-wide font-semibold mb-0.5">Check In</span>
                        <span className="font-medium">{new Date(booking.startDate).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-[var(--muted-foreground)] block text-xs uppercase tracking-wide font-semibold mb-0.5">Check Out</span>
                        <span className="font-medium">{new Date(booking.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    {/* Commute Widget */}
                    {(booking.status === 'APPROVED' || booking.status === 'COMPLETED') && (
                      <CommuteWidget propertyId={booking.propertyId} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="animate-in">
          {ticketsLoading ? (
            <SkeletonTable rows={3} columns={4} />
          ) : tickets.length === 0 ? (
            <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs p-12 rounded-2xl text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <PenTool className="w-8 h-8 text-[var(--muted-foreground)]" />
              </div>
              <h3 className="text-base font-black text-zinc-950 dark:text-white">No Active Maintenance Tickets</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                Everything in your room is functioning properly. If you experience plumbing, electrical, or lock issues, report directly to your assigned caretaker above.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {tickets.map((ticket: any) => (
                <div key={ticket.id} className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs p-5 rounded-xl border flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{ticket.title}</h3>
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mb-3">{ticket.description}</p>
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ticket.property.title}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-start shrink-0">
                    {getStatusBadge(ticket.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="animate-in space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">My Reviews</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">Reviews you've submitted for completed stays. You can appeal any flagged review.</p>
            </div>
          </div>

          {reviewSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-5 h-5 shrink-0" /> {reviewSuccess}
            </div>
          )}

          {myReviewsLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
          ) : myReviewsData?.reviews?.length === 0 ? (
            <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs p-12 rounded-2xl text-center flex flex-col items-center border border-[var(--border)]">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Star className="w-8 h-8 text-[var(--muted-foreground)]" />
              </div>
              <h3 className="text-lg font-bold">No reviews yet</h3>
              <p className="text-[var(--muted-foreground)] mt-2">Once you complete a stay, you can leave a verified review for the property.</p>
            </div>
          ) : (
            <div className="grid gap-5">
              {myReviewsData?.reviews?.map((review: any) => (
                <div key={review.id} className={`bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs rounded-2xl p-6 border ${review.isFlagged ? 'border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-900/10' : 'border-[var(--border)]'}`}>
                  <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
                    <div>
                      <h3 className="font-bold text-lg">{review.booking?.property?.title || 'Property'}</h3>
                      <p className="text-sm text-[var(--muted-foreground)] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {review.booking?.property?.location || 'Location'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {review.isFlagged ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-bold">
                          <Flag className="w-3 h-3" /> Flagged
                        </span>
                      ) : review.isModerated ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium">
                          <Clock className="w-3 h-3" /> Under Review
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-bold">
                          <CheckCircle className="w-3 h-3" /> Published
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-5 h-5 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'}`} />
                    ))}
                    <span className="text-sm text-[var(--muted-foreground)] ml-1">{new Date(review.createdAt).toLocaleDateString()}</span>
                  </div>

                  {review.comment && (
                    <p className="text-sm text-[var(--muted-foreground)] bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-[var(--border)] italic leading-relaxed">&quot;{review.comment}&quot;</p>
                  )}

                  {/* Appeal Section */}
                  {(review.isFlagged || review.isModerated) && (
                    <div className="mt-4 pt-4 border-t border-[var(--border)]">
                      {review.appealStatus === 'PENDING' ? (
                        <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 font-medium">
                          <Clock className="w-4 h-4" /> Your appeal is pending admin review.
                        </div>
                      ) : review.appealStatus === 'ACCEPTED' ? (
                        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-medium">
                          <CheckCircle className="w-4 h-4" /> Appeal accepted — your review is reinstated.
                        </div>
                      ) : review.appealStatus === 'REJECTED' ? (
                        <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 font-medium">
                          <XCircle className="w-4 h-4" /> Appeal rejected by admin.
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAppealTargetId(review.id); setAppealNote(''); setAppealModalOpen(true); }}
                          className="flex items-center gap-2 text-sm font-bold text-[var(--primary)] hover:underline"
                        >
                          <MessageSquare className="w-4 h-4" /> Submit an Appeal
                        </button>
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
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
          ) : !hasProfile || isEditingProfile ? (
            <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs p-8 rounded-2xl max-w-2xl border">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                  <UserPlus className="w-6 h-6 text-[var(--primary)]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{hasProfile ? 'Edit' : 'Create'} Roommate Profile</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">Share your habits to find the perfect compatible roommate.</p>
                </div>
              </div>
              
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Budget (GHS / yr)</label>
                    <input type="number" className="w-full p-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none" value={roommateProfile.budget} onChange={(e) => setRoommateProfile({...roommateProfile, budget: Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cleanliness</label>
                    <select className="w-full p-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none" value={roommateProfile.cleanliness} onChange={(e) => setRoommateProfile({...roommateProfile, cleanliness: e.target.value})}>
                      <option value="NEAT">Very Neat</option>
                      <option value="AVERAGE">Average</option>
                      <option value="MESSY">A bit messy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Sleep Habits</label>
                    <select className="w-full p-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none" value={roommateProfile.sleepHabits} onChange={(e) => setRoommateProfile({...roommateProfile, sleepHabits: e.target.value})}>
                      <option value="EARLY_BIRD">Early Bird</option>
                      <option value="NIGHT_OWL">Night Owl</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Study Habits</label>
                    <select className="w-full p-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none" value={roommateProfile.studyHabits} onChange={(e) => setRoommateProfile({...roommateProfile, studyHabits: e.target.value})}>
                      <option value="QUIET">Quiet & Focused</option>
                      <option value="SOCIAL">Social & Collaborative</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bio (Optional)</label>
                  <textarea className="w-full p-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none min-h-[80px]" placeholder="Tell potential roommates a bit about yourself..." value={roommateProfile.bio} onChange={(e) => setRoommateProfile({...roommateProfile, bio: e.target.value})} />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  {hasProfile && (
                    <button onClick={() => setIsEditingProfile(false)} className="px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
                  )}
                  <button onClick={() => profileMutation.mutate(roommateProfile)} disabled={profileMutation.isPending} className="px-6 py-2 bg-[var(--primary)] text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                    {profileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Save Profile
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900">
                <div className="flex items-center gap-3">
                  <HeartHandshake className="w-6 h-6 text-[var(--primary)]" />
                  <div>
                    <h3 className="font-bold text-sm">Roommate Finder is Active</h3>
                    <p className="text-xs text-[var(--muted-foreground)]">You are currently visible to other {roommateProfileResponse?.profile?.user?.gender || 'students'} at your campus.</p>
                  </div>
                </div>
                <button onClick={() => setIsEditingProfile(true)} className="px-4 py-2 text-xs font-bold bg-white dark:bg-slate-800 shadow-sm border rounded-lg hover:bg-slate-50 flex items-center gap-2">
                  <Edit3 className="w-3 h-3" /> Edit Profile
                </button>
              </div>

              {matchesLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>
              ) : matches.length === 0 ? (
                <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs p-12 rounded-2xl text-center flex flex-col items-center border">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-[var(--muted-foreground)]" />
                  </div>
                  <h3 className="text-lg font-bold">No exact matches yet</h3>
                  <p className="text-[var(--muted-foreground)]">Check back later as more students at your campus join.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matches.map((match: any) => (
                    <div key={match.id} className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs rounded-2xl p-6 border flex flex-col h-full hover:border-[var(--primary)] transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-700 font-bold text-lg">
                            {match.user.firstName[0]}
                          </div>
                          <div>
                            <h3 className="font-bold">{match.user.firstName} {match.user.lastName[0]}.</h3>
                            <p className="text-xs text-[var(--muted-foreground)]">{match.user.campus}</p>
                          </div>
                        </div>
                        {match.score > 2 && <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full">Top Match</span>}
                      </div>
                      
                      <div className="space-y-2 mb-6 flex-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[var(--muted-foreground)]">Budget:</span>
                          <span className="font-bold">GHS {match.budget}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--muted-foreground)]">Cleanliness:</span>
                          <span className="font-medium">{match.cleanliness}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--muted-foreground)]">Sleep:</span>
                          <span className="font-medium">{match.sleepHabits.replace('_', ' ')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--muted-foreground)]">Study:</span>
                          <span className="font-medium">{match.studyHabits}</span>
                        </div>
                        {match.bio && (
                          <div className="pt-2 mt-2 border-t text-xs text-slate-600 dark:text-slate-400 italic">
                            "{match.bio}"
                          </div>
                        )}
                      </div>

                      <div className="pt-4 mt-auto border-t">
                        <p className="text-xs font-semibold mb-2">Contact:</p>
                        <div className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                          <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded w-full text-center select-all">{match.user.email}</div>
                        </div>
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
        <div className="animate-in space-y-6">
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" /> Digital Lease & Document Vault
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Access your legally binding lease agreements, tenancy terms, and official payment receipts.
              </p>
            </div>
            <div className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Verified Legal Copy
            </div>
          </div>

          {agreementsLoading ? (
            <SkeletonTable rows={3} columns={4} />
          ) : agreements.length === 0 ? (
            <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs p-12 rounded-2xl text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-[var(--muted-foreground)]" />
              </div>
              <h3 className="text-base font-black text-zinc-950 dark:text-white">Lease Agreement Vault is Empty</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mt-1 mb-4 leading-relaxed">
                When a landlord confirms your reservation, your statutory Ghana Rent Act (Act 220) tenancy agreement with a 64-character SHA-256 tamper-proof cryptographic audit seal will appear here for signing.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {agreements.map((agreement: any) => {
                const b = agreement.booking;
                const p = b?.property || {};
                const l = p?.landlord || {};
                const isCompleted = agreement.status === 'COMPLETED' || (Boolean(agreement.tenantSignature) && Boolean(agreement.landlordSignature));

                return (
                  <div key={agreement.id} className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs p-6 rounded-2xl border border-[var(--border)] hover:border-sky-500/30 transition-all space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border)] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-extrabold text-[var(--foreground)]">{p.title || 'Property Lease'}</h3>
                          <span className={clsx(
                            "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase",
                            isCompleted ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          )}>
                            {isCompleted ? 'COMPLETED' : agreement.status}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {p.location || 'N/A'} • Room: {b?.room?.roomType || 'Standard'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {!isCompleted && (
                          <Link 
                            href={`/dashboard/agreements/${b.id}`}
                            className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 transition-all flex items-center gap-2"
                          >
                            Sign Agreement Now
                          </Link>
                        )}
                        {isCompleted && (
                          <button
                            onClick={() => handlePrintAgreement(agreement)}
                            className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs font-bold rounded-xl shadow-md hover:opacity-90 transition-all flex items-center gap-2"
                          >
                            <Printer className="w-4 h-4" /> Print / Receipt
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Signatures & Execution Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-[var(--border)] space-y-1.5">
                        <div className="font-bold text-[var(--muted-foreground)] uppercase text-[10px]">Tenant Signature</div>
                        <div className="font-semibold text-sm flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" /> Signed by Tenant
                        </div>
                        <div className="text-[var(--muted-foreground)]">
                          {agreement.tenantSignedAt ? new Date(agreement.tenantSignedAt).toLocaleString() : 'N/A'}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-[var(--border)] space-y-1.5">
                        <div className="font-bold text-[var(--muted-foreground)] uppercase text-[10px]">Landlord Signature</div>
                        <div className="font-semibold text-sm flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
                          <CheckCircle2 className="w-4 h-4" /> Signed by {l.firstName || 'Landlord'} {l.lastName || ''}
                        </div>
                        <div className="text-[var(--muted-foreground)]">
                          {agreement.landlordSignedAt ? new Date(agreement.landlordSignedAt).toLocaleString() : 'Pending Landlord Counter-Signature'}
                        </div>
                      </div>
                    </div>

                    {/* Cryptographic SHA-256 Verification Seal */}
                    {agreement.cryptographicHash && (
                      <div className="p-4 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" /> SHA-256 Cryptographic Hash Seal
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(agreement.cryptographicHash);
                              toast.success('SHA-256 Hash copied to clipboard!');
                            }}
                            className="text-xs font-semibold text-sky-400 hover:text-white flex items-center gap-1 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" /> Copy Hash
                          </button>
                        </div>
                        <div className="font-mono text-[11px] text-sky-200/90 break-all select-all bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                          {agreement.cryptographicHash}
                        </div>
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
          {/* Summary Financial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-2xl border bg-sky-50/80 dark:bg-sky-950/30 border-sky-100 dark:border-sky-900/50 flex items-center justify-between shadow-sm transition-all hover:shadow-md">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-sky-900/70 dark:text-sky-300/80 mb-1">Total Paid Rent</p>
                <p className="text-3xl font-black text-sky-600 dark:text-sky-400">GHS {totalPaidGhs.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300 flex items-center justify-center shadow-inner">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>

            <div className="p-6 rounded-2xl border bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between shadow-sm transition-all hover:shadow-md">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-900/70 dark:text-emerald-300/80 mb-1">Verified Receipts</p>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{transactions.length}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shadow-inner">
                <Receipt className="w-6 h-6" />
              </div>
            </div>

            <div className="p-6 rounded-2xl border bg-indigo-50/80 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between shadow-sm transition-all hover:shadow-md">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-900/70 dark:text-indigo-300/80 mb-1">Payment Gateway</p>
                <p className="text-sm font-extrabold text-indigo-950 dark:text-indigo-200 mt-1">Paystack Encrypted</p>
                <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70">MoMo & Card Supported</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shadow-inner">
                <Lock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="p-5 border-b border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-[var(--foreground)]">Financial Payment Ledger</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Download official payment receipts for proof of tenancy.</p>
              </div>
            </div>

            {transactionsLoading ? (
              <SkeletonTable rows={4} columns={5} />
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Receipt className="w-8 h-8 text-[var(--muted-foreground)]" />
                </div>
                <h4 className="text-lg font-bold text-[var(--foreground)]">No Payment History Yet</h4>
                <p className="text-xs text-[var(--muted-foreground)] max-w-sm mt-1 mb-4">
                  When you complete rental payments on Paystack, your receipts and transaction histories will populate here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#0F5132] text-white">
                    <tr>
                      <th className="px-6 py-4 font-extrabold text-white uppercase">Transaction Ref</th>
                      <th className="px-6 py-4 font-extrabold text-white uppercase">Property &amp; Room</th>
                      <th className="px-6 py-4 font-extrabold text-white uppercase">Amount</th>
                      <th className="px-6 py-4 font-extrabold text-white uppercase">Date</th>
                      <th className="px-6 py-4 font-extrabold text-white uppercase">Status</th>
                      <th className="px-6 py-4 font-extrabold text-white uppercase text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {transactions.map((tx: any) => {
                      const p = tx.property || {};

                      return (
                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-mono font-bold text-[var(--foreground)] text-xs">{tx.reference}</div>
                            <div className="text-[10px] text-[var(--muted-foreground)]">Paystack Direct</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-[var(--foreground)] text-sm">{p.title || 'Property'}</div>
                            <div className="text-[11px] text-[var(--muted-foreground)]">Room: {tx.room?.roomType || 'Standard Room'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-extrabold text-sm text-sky-600 dark:text-sky-400">GHS {tx.amount?.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[var(--foreground)]">{new Date(tx.createdAt).toLocaleDateString()}</div>
                            <div className="text-[10px] text-[var(--muted-foreground)]">{new Date(tx.createdAt).toLocaleTimeString()}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                              {tx.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handlePrintReceipt(tx)}
                              className="px-3 py-1.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-lg text-xs font-bold shadow hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
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
          {/* Header Banner */}
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                  Emergency &amp; Tenant Safety Center
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
                  One-tap direct dials for Ghanaian national first responders, campus security desks, and your active residence manager.
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 text-zinc-700 dark:text-zinc-300 text-xs font-semibold shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>24/7 Dispatch Ready</span>
            </div>
          </div>

          {/* Residence Manager & Location Card */}
          {(() => {
            const activeBooking = bookings.find((b: any) => ['COMPLETED', 'APPROVED', 'CONFIRMED'].includes(b.status)) || bookings[0];
            const p = activeBooking?.property;
            const phone = p?.landlord?.phoneNumber || '+233200000000';
            const cleanPhone = phone.replace(/[^0-9+]/g, '');
            const fullAddress = p ? `${p.title}, ${p.location || 'Accra, Ghana'}` : 'Akwaaba Homes Residential Network';

            if (!p) {
              return (
                <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs p-6 rounded-2xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Akwaaba Resident Support Concierge</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Available 24/7 for tenant onboarding, lease safety, and general inquiries.</p>
                    </div>
                  </div>
                  <a
                    href="tel:+233302000000"
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    Call Support (+233 30 200 0000)
                  </a>
                </div>
              );
            }

            return (
              <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs p-6 rounded-2xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50">
                        My Active Residence
                      </span>
                      {activeBooking?.id && (
                        <>
                          <span className="text-xs text-zinc-300 dark:text-zinc-700">•</span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Lease Ref #{activeBooking.id.slice(-6).toUpperCase()}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">{p.title}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
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
                    <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-300 shrink-0">
                      {(p.landlord?.firstName?.[0] || 'H')}{(p.landlord?.lastName?.[0] || 'M')}
                    </div>
                  </div>
                </div>

                {/* Location Copy Strip for Dispatch */}
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200/70 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                    <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                    <span>Emergency Dispatch Address: <strong className="text-zinc-900 dark:text-white font-semibold">{fullAddress}</strong></span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(fullAddress);
                      setCopiedDispatchAddress(true);
                      toast.success('Dispatch address copied to clipboard');
                      setTimeout(() => setCopiedDispatchAddress(false), 2500);
                    }}
                    className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 rounded-lg font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    {copiedDispatchAddress ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDispatchAddress ? 'Copied' : 'Copy Dispatch Address'}</span>
                  </button>
                </div>

                {/* Direct Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <a
                    href={`tel:${cleanPhone}`}
                    className="px-4 py-3 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <PhoneCall className="w-4 h-4" /> Call Property Manager Now
                  </a>
                  <a
                    href={`https://wa.me/${cleanPhone.replace('+', '')}?text=URGENT%20SAFETY%20ALERT:%20I%20am%20a%20tenant%20at%20${encodeURIComponent(p?.title)}%20and%20require%20immediate%20assistance.`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs border border-zinc-800 dark:border-zinc-700"
                  >
                    <MessageSquare className="w-4 h-4" /> WhatsApp Urgent Alert
                  </a>
                </div>
              </div>
            );
          })()}

          {/* National & Campus Hotlines Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                name: 'Ghana Police Service',
                category: 'National Security & Crime Patrol',
                hotline: '191 / 112',
                dialUrl: 'tel:191',
                description: 'Immediate response for security threats, burglary, intruder breach, and emergency patrol.',
                icon: Shield,
                badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/40',
              },
              {
                name: 'National Ambulance Service',
                category: 'Medical Crises & Paramedic Dispatch',
                hotline: '193 / 112',
                dialUrl: 'tel:193',
                description: 'Immediate paramedic ambulance dispatch, urgent medical trauma, and hospital conveyance.',
                icon: HeartPulse,
                badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200/60 dark:border-rose-900/40',
              },
              {
                name: 'Ghana National Fire Service',
                category: 'Fire Hazard & Rescue Operations',
                hotline: '192 / 112',
                dialUrl: 'tel:192',
                description: 'Structural fires, smoke outbreaks, domestic gas leakages, and search & rescue response.',
                icon: Flame,
                badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/40',
              },
              {
                name: 'Campus Security Desk',
                category: 'Rapid Campus Patrol & Night Escort',
                hotline: '+233 30 221 3820',
                dialUrl: 'tel:+233302213820',
                description: 'On-campus gate guards, student night patrols, and perimeter security control.',
                icon: Radio,
                badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/50',
              },
            ].map((service) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.name}
                  className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
                      </div>
                      <span className={clsx("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border", service.badgeColor)}>
                        {service.hotline}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {service.name}
                      </h4>
                      <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {service.category}
                      </p>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {service.description}
                    </p>
                  </div>

                  <div className="pt-5 mt-auto">
                    <a
                      href={service.dialUrl}
                      className="w-full py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs"
                    >
                      <Phone className="w-3.5 h-3.5" /> Call {service.hotline.split('/')[0].trim()}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Emergency Action Guidelines & Protocols */}
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Resident Emergency Protocols &amp; Checklist</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 space-y-1.5">
                <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-500" /> Medical Emergency
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Stay calm, dial <strong>193 / 112</strong>, and clearly communicate your unit number and nearest street landmark. Keep compound gates open for paramedics.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 space-y-1.5">
                <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500" /> Fire &amp; Gas Leaks
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Evacuate immediately via stairwells — never use elevators. Pull the compound alarm if available, dial <strong>192</strong>, and assemble in the open yard.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 space-y-1.5">
                <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-blue-500" /> Intrusion &amp; Security
                </div>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Bolt your deadlocks immediately. Dial <strong>191 / 112</strong>, notify your on-site compound caretaker via WhatsApp, and remain sheltered until clearance.
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
          <DeliveryVaultTab bookings={bookings} />
        </div>
      )}

      {activeTab === 'billsplit' && (
        <div>
          <BillSplitterTab bookings={bookings} />
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in">
            <h3 className="text-xl font-bold mb-1 flex items-center gap-2"><Star className="w-5 h-5 text-amber-400 fill-amber-400" /> Leave a Review</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-5">Your honest feedback helps other students find great accommodation.</p>
            {reviewError && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl text-sm font-medium">{reviewError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Your Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRating(star)} className="p-1 focus:outline-none transition-transform hover:scale-125">
                      <Star className={`w-9 h-9 transition-colors ${rating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700'}`} />
                    </button>
                  ))}
                  <span className="ml-2 text-sm font-bold text-[var(--muted-foreground)]">{['','Poor','Fair','Good','Great','Excellent'][rating]}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Your Comment</label>
                <textarea className="w-full p-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none min-h-[120px] resize-none" placeholder="Describe your experience — cleanliness, landlord responsiveness, location, value for money..." value={comment} onChange={(e) => setComment(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setReviewModalOpen(false); setReviewError(''); }} className="px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">Cancel</button>
                <button
                  onClick={() => { if (!comment.trim()) { setReviewError('Please write a comment before submitting'); return; } setReviewError(''); reviewMutation.mutate({ bookingId: selectedBookingId, rating, comment }); }}
                  disabled={reviewMutation.isPending}
                  className="px-6 py-2.5 bg-[var(--primary)] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {reviewMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Star className="w-4 h-4" /> Submit Review</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appeal Modal */}
      {appealModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in">
            <h3 className="text-xl font-bold mb-1 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-[var(--primary)]" /> Submit an Appeal</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-5">Explain why you believe this review should be reinstated. An admin will review your appeal.</p>
            <textarea
              value={appealNote}
              onChange={(e) => setAppealNote(e.target.value)}
              rows={4}
              placeholder="Provide your justification here..."
              className="w-full p-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setAppealModalOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
              <button
                onClick={() => { if (appealNote.trim()) appealMutation.mutate({ id: appealTargetId, note: appealNote }); }}
                disabled={appealMutation.isPending || !appealNote.trim()}
                className="px-6 py-2.5 bg-[var(--primary)] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {appealMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : 'Submit Appeal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      {ticketModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in">
            <h3 className="text-xl font-bold mb-1 flex items-center gap-2"><MessageSquarePlus className="w-5 h-5 text-[var(--primary)]" /> Report an Issue</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">Your landlord will be notified immediately.</p>
            
            {ticketError && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{ticketError}</div>}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title (What's wrong?)</label>
                <input type="text" className="w-full p-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none" placeholder="e.g. Leaking sink in bathroom" value={ticketTitle} onChange={(e) => setTicketTitle(e.target.value)} />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Priority Level</label>
                <select className="w-full p-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none" value={ticketPriority} onChange={(e) => setTicketPriority(e.target.value)}>
                  <option value="LOW">Low - Not urgent</option>
                  <option value="MEDIUM">Medium - Needs attention</option>
                  <option value="HIGH">High - Impacts daily life</option>
                  <option value="URGENT">Urgent - Emergency</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea className="w-full p-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none min-h-[100px]" placeholder="Provide more details about the issue..." value={ticketDesc} onChange={(e) => setTicketDesc(e.target.value)} />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button onClick={() => setTicketModalOpen(false)} className="px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">Cancel</button>
                <button onClick={() => { if (!ticketTitle || !ticketDesc) { setTicketError('Provide a title and description'); return; } ticketMutation.mutate({ propertyId: ticketPropertyId, title: ticketTitle, description: ticketDesc, priority: ticketPriority }); }} disabled={ticketMutation.isPending} className="px-6 py-2 bg-[var(--primary)] text-white text-sm font-bold rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity">
                  {ticketMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Submit Ticket
                </button>
              </div>
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
