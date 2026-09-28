'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, Users, Mail, Phone, Calendar, Check, X, 
  CreditCard, Star, CheckCircle, CheckCircle2, Clock, FileSignature, Building, Building2,
  Activity, DollarSign, AlertTriangle, ArrowUpRight, Printer, RefreshCw, Layers, MessageSquare,
  Megaphone, UserCog, ClipboardCheck, TrendingUp, Wrench, Plus, Camera, UserCheck, Eye,
  Bed, ShieldCheck, Download, ExternalLink, ArrowRight, ShieldAlert, Sparkles, Filter
} from 'lucide-react';
import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import OnboardingProgressWidget from '@/components/OnboardingProgressWidget';
import OnboardingTour from '@/components/OnboardingTour';
import MessagingTab from '@/components/MessagingTab';
import FloorplanOccupancyTab from '@/components/landlord/FloorplanOccupancyTab';
import CompoundNoticeTab from '@/components/landlord/CompoundNoticeTab';
import ExpenseTrackerTab from '@/components/landlord/ExpenseTrackerTab';
import StaffDelegationTab from '@/components/landlord/StaffDelegationTab';
import GateLogbookTab from '@/components/landlord/GateLogbookTab';
import UtilitySubMeterTab from '@/components/landlord/UtilitySubMeterTab';
import AcademicInstallmentTab from '@/components/landlord/AcademicInstallmentTab';
import RoomAssetInventoryTab from '@/components/landlord/RoomAssetInventoryTab';
import HostelDisciplinaryTab from '@/components/landlord/HostelDisciplinaryTab';
import AlertBanner from '@/components/AlertBanner';
import toast from 'react-hot-toast';

function getImageUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return `${backendUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

export type LandlordPillar = 'portfolio' | 'financials' | 'tenancies' | 'operations';

export type LandlordSubTab = 
  // Portfolio Pillar
  | 'properties' | 'occupancy' | 'assets'
  // Financials Pillar
  | 'payouts' | 'expenses' | 'utilities' | 'installments' | 'subscriptions'
  // Tenancies Pillar
  | 'bookings' | 'agreements' | 'disciplinary' | 'reviews'
  // Operations Pillar
  | 'tickets' | 'staff' | 'gatepass' | 'notices' | 'messages';

const SUBTAB_TO_PILLAR: Record<string, LandlordPillar> = {
  portfolio: 'portfolio',
  properties: 'portfolio',
  occupancy: 'portfolio',
  assets: 'portfolio',

  financials: 'financials',
  payouts: 'financials',
  expenses: 'financials',
  utilities: 'financials',
  installments: 'financials',
  subscriptions: 'financials',

  tenancies: 'tenancies',
  bookings: 'tenancies',
  agreements: 'tenancies',
  disciplinary: 'tenancies',
  reviews: 'tenancies',

  operations: 'operations',
  tickets: 'operations',
  staff: 'operations',
  gatepass: 'operations',
  notices: 'operations',
  messages: 'operations',
};

function LandlordDashboardContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');

  // Intelligent initial tab & pillar resolution
  const initialSubTab: LandlordSubTab = useMemo(() => {
    if (tabParam && SUBTAB_TO_PILLAR[tabParam]) {
      if (tabParam === 'portfolio') return 'properties';
      if (tabParam === 'financials') return 'payouts';
      if (tabParam === 'tenancies') return 'bookings';
      if (tabParam === 'operations') return 'tickets';
      return tabParam as LandlordSubTab;
    }
    return 'properties';
  }, [tabParam]);

  const [activeSubTab, setActiveSubTab] = useState<LandlordSubTab>(initialSubTab);

  const activePillar: LandlordPillar = useMemo(() => {
    return SUBTAB_TO_PILLAR[activeSubTab] || 'portfolio';
  }, [activeSubTab]);

  useEffect(() => {
    if (tabParam && SUBTAB_TO_PILLAR[tabParam]) {
      const resolved = tabParam === 'portfolio' ? 'properties' :
                       tabParam === 'financials' ? 'payouts' :
                       tabParam === 'tenancies' ? 'bookings' :
                       tabParam === 'operations' ? 'tickets' :
                       (tabParam as LandlordSubTab);
      setActiveSubTab(resolved);
    }
  }, [tabParam]);

  const handleSelectPillar = (pillar: LandlordPillar) => {
    const defaultSubTabs: Record<LandlordPillar, LandlordSubTab> = {
      portfolio: 'properties',
      financials: 'payouts',
      tenancies: 'bookings',
      operations: 'tickets'
    };
    const target = defaultSubTabs[pillar];
    setActiveSubTab(target);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tab', target);
    window.history.replaceState(null, '', newUrl.toString());
  };

  const handleSelectSubTab = (subTab: LandlordSubTab) => {
    setActiveSubTab(subTab);
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('tab', subTab);
    window.history.replaceState(null, '', newUrl.toString());
  };

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [ticketActionModal, setTicketActionModal] = useState<{
    isOpen: boolean;
    ticketId: string;
    ticketTitle: string;
    mode: 'SCHEDULE' | 'RESOLVE';
    scheduledDate: string;
    repairCost: string;
    resolutionNotes: string;
    completionImageUrl: string;
  }>({
    isOpen: false,
    ticketId: '',
    ticketTitle: '',
    mode: 'RESOLVE',
    scheduledDate: new Date().toISOString().split('T')[0],
    repairCost: '0',
    resolutionNotes: 'Repair completed successfully.',
    completionImageUrl: '',
  });

  // Session Query
  const { data: session } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
    staleTime: 5 * 60 * 1000
  });

  // Fetch Bookings
  const { data: bookingsResponse, isLoading: isLoadingBookings, refetch: refetchBookings } = useQuery({
    queryKey: ['bookings', 'landlord'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/bookings/landlord');
        return data;
      } catch (err) {
        console.warn('Could not fetch bookings:', err);
        return { bookings: [] };
      }
    }
  });

  // Fetch Landlord Properties
  const { data: propertiesData, isLoading: isLoadingProperties, refetch: refetchProperties } = useQuery({
    queryKey: ['properties', 'landlord', 'mine'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/properties/landlord/mine');
        return data?.data || [];
      } catch (err) {
        return [];
      }
    }
  });
  const myProperties = propertiesData || [];

  // Fetch Landlord Agreements
  const { data: agreementsResponse, isLoading: isLoadingAgreements, refetch: refetchAgreements } = useQuery({
    queryKey: ['agreements', 'landlord'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/agreements/landlord');
        return data;
      } catch (err) {
        console.warn('Could not fetch agreements:', err);
        return { agreements: [] };
      }
    },
  });

  // Fetch Tickets
  const { data: ticketsResponse, isLoading: isLoadingTickets, refetch: refetchTickets } = useQuery({
    queryKey: ['tickets', 'landlord'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/tickets/landlord');
        return data;
      } catch (err) {
        console.warn('Could not fetch tickets:', err);
        return { tickets: [] };
      }
    },
  });

  // Fetch Subscriptions Overview
  const { data: subOverviewResponse, isLoading: isLoadingSubs, refetch: refetchSubs } = useQuery({
    queryKey: ['subscriptions', 'overview'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/subscriptions/overview');
        return data;
      } catch (err) {
        console.warn('Could not fetch subscriptions overview:', err);
        return { stats: { totalProperties: 0, activeSubscriptions: 0, expiringSoon: 0, unsubscribedOrExpired: 0 }, properties: [] };
      }
    },
  });

  // Fetch Landlord Tenant Reviews
  const { data: landlordReviewsResponse, isLoading: isLoadingLandlordReviews } = useQuery({
    queryKey: ['reviews', 'landlord'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/reviews/landlord');
        return data?.reviews || [];
      } catch (err) {
        console.warn('Could not fetch landlord reviews:', err);
        return [];
      }
    },
    enabled: activeSubTab === 'reviews'
  });
  const landlordReviews = landlordReviewsResponse || [];

  // Fetch Detailed Earnings Report
  const { data: earningsReport, isLoading: isLoadingEarnings, refetch: refetchEarnings } = useQuery({
    queryKey: ['transactions', 'landlord', 'report'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/transactions/landlord/report');
        return data;
      } catch (err) {
        console.warn('Could not fetch earnings report:', err);
        return { summary: { totalGrossEarnings: 0, totalCommissionDeducted: 0, totalNetEarnings: 0, thisMonthNetEarnings: 0, platformCommissionPercent: 5 }, monthlyTrends: [], recentCashflows: [] };
      }
    },
    enabled: activeSubTab === 'payouts' || activePillar === 'financials'
  });

  // Fetch GRA Financial Ledger
  const { data: financialLedger, refetch: refetchLedger } = useQuery({
    queryKey: ['transactions', 'landlord', 'financial-ledger'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/transactions/landlord/financial-ledger');
        return data;
      } catch (err) {
        return null;
      }
    },
    enabled: activeSubTab === 'payouts' || activePillar === 'financials'
  });

  const handleDownloadGRATaxPDF = async () => {
    try {
      toast.loading('Generating GRA Tax Statement PDF...', { id: 'gra-pdf' });
      const response = await api.get('/transactions/landlord/tax-report?format=pdf', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GRA_Tax_Statement_${new Date().getFullYear()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('GRA Tax Statement downloaded!', { id: 'gra-pdf' });
    } catch (e) {
      toast.error('Failed to download GRA Tax Statement PDF', { id: 'gra-pdf' });
    }
  };

  const handleDownloadGRATaxCSV = async () => {
    try {
      toast.loading('Generating GRA Tax Statement CSV...', { id: 'gra-csv' });
      const response = await api.get('/transactions/landlord/tax-report?format=csv', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GRA_Tax_Statement_${new Date().getFullYear()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('GRA Tax Statement CSV exported!', { id: 'gra-csv' });
    } catch (e) {
      toast.error('Failed to export GRA Tax Statement CSV', { id: 'gra-csv' });
    }
  };

  // Status Mutation (Bookings) with Optimistic Update
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.put(`/bookings/${id}/status`, { status });
      return data;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['bookings', 'landlord'] });
      const previousBookings = queryClient.getQueryData<{ bookings: any[] }>(['bookings', 'landlord']);

      if (previousBookings) {
        if (Array.isArray(previousBookings)) {
          queryClient.setQueryData(['bookings', 'landlord'], (previousBookings as any[]).map((b: any) =>
            b.id === id ? { ...b, status } : b
          ));
        } else if ((previousBookings as any).bookings && Array.isArray((previousBookings as any).bookings)) {
          queryClient.setQueryData(['bookings', 'landlord'], {
            ...previousBookings,
            bookings: (previousBookings as any).bookings.map((b: any) =>
              b.id === id ? { ...b, status } : b
            )
          });
        }
      }
      return { previousBookings };
    },
    onError: (err: any, _variables, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(['bookings', 'landlord'], context.previousBookings);
      }
      const message = err.response?.data?.message || 'Failed to update booking status. Changes reverted.';
      toast.error(message);
    },
    onSuccess: (_data, { status }) => {
      toast.success(`Booking ${status === 'APPROVED' ? 'approved' : status.toLowerCase()} successfully!`);
    },
    onSettled: () => {
      setProcessingId(null);
      queryClient.invalidateQueries({ queryKey: ['bookings', 'landlord'] });
      queryClient.invalidateQueries({ queryKey: ['properties', 'landlord', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['agreements', 'landlord'] });
      queryClient.invalidateQueries({ queryKey: ['landlord', 'stats'] });
    }
  });

  // Ticket Status Mutation
  const updateTicketMutation = useMutation({
    mutationFn: async (payload: { id: string; status?: string; scheduledDate?: string; repairCost?: number; completionImageUrl?: string; resolutionNotes?: string }) => {
      const { id, ...data } = payload;
      const res = await api.patch(`/tickets/${id}/status`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Maintenance ticket updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['tickets', 'landlord'] });
    },
    onSettled: () => setProcessingId(null)
  });

  // Renew Subscription Mutation
  const renewSubMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const { data } = await api.post('/subscriptions/initialize', { propertyId });
      return data;
    },
    onSuccess: (data) => {
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        toast.success(data.message || 'Subscription processed');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to initialize payment');
    }
  });

  const bookings = bookingsResponse?.bookings || [];
  const agreements = agreementsResponse?.agreements || [];
  const tickets = ticketsResponse?.tickets || [];
  const subStats = subOverviewResponse?.stats || { totalProperties: 0, activeSubscriptions: 0, expiringSoon: 0, unsubscribedOrExpired: 0 };
  const subProperties = subOverviewResponse?.properties || [];
  const earningsSummary = earningsReport?.summary || { totalGrossEarnings: 0, totalCommissionDeducted: 0, totalNetEarnings: 0, thisMonthNetEarnings: 0, platformCommissionPercent: 5 };
  const monthlyTrends = earningsReport?.monthlyTrends || [];
  const cashflows = earningsReport?.recentCashflows || [];

  const pendingBookingsCount = bookings.filter((b: any) => b.status === 'PENDING').length;
  const pendingTicketsCount = tickets.filter((t: any) => t.status === 'PENDING').length;
  const urgentTicketsCount = tickets.filter((t: any) => t.priority === 'URGENT' || t.priority === 'HIGH' || t.isEscalated).length;

  const filteredProperties = useMemo(() => {
    if (!propertySearchQuery.trim()) return myProperties;
    const q = propertySearchQuery.toLowerCase();
    return myProperties.filter((p: any) => 
      p.title?.toLowerCase().includes(q) || 
      p.location?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  }, [myProperties, propertySearchQuery]);

  return (
    <div className="space-y-8 pb-14 text-zinc-900 dark:text-zinc-100">
      <OnboardingProgressWidget 
        user={session} 
        hasProperty={Boolean(session?.hasProperty || session?._count?.properties > 0 || subStats.totalProperties > 0 || subProperties.length > 0)} 
      />

      {/* ── 1. EXECUTIVE COMMAND HERO (STICKY ON DESKTOP) ── */}
      <div className="static md:sticky md:top-0 z-20 bg-[#FBFBF9]/95 dark:bg-[#0D0F12]/95 backdrop-blur-md pt-2 pb-3 -mx-3 px-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-zinc-200 dark:border-zinc-800 space-y-3 sm:space-y-4 mb-4 sm:mb-6 shadow-xs">
        
        {/* Title & Action Buttons */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-[#0F5132] dark:text-emerald-400 text-[10px] font-extrabold tracking-wider uppercase">
                Host &amp; Asset Management
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                Ghana Act 772 &amp; MoMo Escrow Verified
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight mt-1 flex items-center gap-3">
              <span>Landlord Executive Console</span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/dashboard/landlord/new"
              id="tour-add-property"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>List Property</span>
            </Link>

            <Link
              href="/dashboard/landlord/withdraw"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Request MoMo Payout</span>
            </Link>

            <Link
              href="/dashboard/landlord/notices/new"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">Broadcast Notice</span>
            </Link>

            <OnboardingTour role={session?.role} user={session} />
          </div>
        </div>

        {/* Standardized Platform Notification Banners */}
        {subStats.expiringSoon > 0 && (
          <AlertBanner
            type="warning"
            message={`${subStats.expiringSoon} property listing subscription(s) are expiring soon. Renew now to prevent listing unpublishing from search.`}
          />
        )}

        {/* 4-Metric Executive Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 rounded-xl shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Net Yield (Available)</div>
            <div className="text-lg sm:text-xl font-black text-[#0F5132] dark:text-emerald-400 mt-0.5 font-mono">
              GH₵ {(earningsSummary?.totalNetEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Cleared for instant MoMo payout</div>
          </div>

          <div className="bg-white dark:bg-[#14181E] border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 rounded-xl shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Gross Rent Inflow</div>
            <div className="text-lg sm:text-xl font-black text-zinc-950 dark:text-white mt-0.5 font-mono">
              GH₵ {(earningsSummary?.totalGrossEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">100% escrow collected via Paystack</div>
          </div>

          <div className="bg-white dark:bg-[#14181E] border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 rounded-xl shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Portfolio Scale</div>
            <div className="text-lg sm:text-xl font-black text-zinc-950 dark:text-white mt-0.5">
              {myProperties.length} {myProperties.length === 1 ? 'Property' : 'Properties'}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{subStats.activeSubscriptions} live &amp; published</div>
          </div>

          <div className="bg-white dark:bg-[#14181E] border border-zinc-200/80 dark:border-zinc-800/80 p-3.5 rounded-xl shadow-xs">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Action Queue</div>
            <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {pendingBookingsCount + pendingTicketsCount} Pending
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {pendingBookingsCount} booking(s), {pendingTicketsCount} repair(s)
            </div>
          </div>
        </div>

        {/* ── 2. THE 4 COHESIVE EXECUTIVE PILLAR TABS ── */}
        <div className="space-y-2 pt-2">
          {/* Main 4 Pillars Switcher */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto scrollbar-none flex-nowrap">
            <button
              onClick={() => handleSelectPillar('portfolio')}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                activePillar === 'portfolio'
                  ? "bg-white dark:bg-[#14181E] text-zinc-950 dark:text-white shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Building2 className={clsx("w-4 h-4", activePillar === 'portfolio' ? "text-[#0F5132] dark:text-emerald-400" : "text-zinc-400")} />
              <span>1. Portfolio &amp; Units</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {myProperties.length}
              </span>
            </button>

            <button
              onClick={() => handleSelectPillar('financials')}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                activePillar === 'financials'
                  ? "bg-white dark:bg-[#14181E] text-zinc-950 dark:text-white shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <CreditCard className={clsx("w-4 h-4", activePillar === 'financials' ? "text-[#0F5132] dark:text-emerald-400" : "text-zinc-400")} />
              <span>2. Financials &amp; Escrow</span>
              {earningsSummary?.totalNetEarnings > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              onClick={() => handleSelectPillar('tenancies')}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                activePillar === 'tenancies'
                  ? "bg-white dark:bg-[#14181E] text-zinc-950 dark:text-white shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Users className={clsx("w-4 h-4", activePillar === 'tenancies' ? "text-[#0F5132] dark:text-emerald-400" : "text-zinc-400")} />
              <span>3. Tenancies &amp; Leases</span>
              {pendingBookingsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-black">
                  {pendingBookingsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleSelectPillar('operations')}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap",
                activePillar === 'operations'
                  ? "bg-white dark:bg-[#14181E] text-zinc-950 dark:text-white shadow-xs border border-zinc-200/80 dark:border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Wrench className={clsx("w-4 h-4", activePillar === 'operations' ? "text-[#0F5132] dark:text-emerald-400" : "text-zinc-400")} />
              <span>4. Facility &amp; Operations</span>
              {pendingTicketsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-black">
                  {pendingTicketsCount}
                </span>
              )}
            </button>
          </div>

          {/* Sub-Pills for the Active Pillar */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap py-1">
            
            {/* PILLAR 1 SUB-TABS */}
            {activePillar === 'portfolio' && (
              <>
                <button
                  onClick={() => handleSelectSubTab('properties')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer",
                    activeSubTab === 'properties'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  Property Catalog ({myProperties.length})
                </button>
                <button
                  onClick={() => handleSelectSubTab('occupancy')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer",
                    activeSubTab === 'occupancy'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  Floorplan &amp; Units
                </button>
                <button
                  onClick={() => handleSelectSubTab('assets')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer",
                    activeSubTab === 'assets'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  Fixture &amp; Asset Inventory
                </button>
              </>
            )}

            {/* PILLAR 2 SUB-TABS */}
            {activePillar === 'financials' && (
              <>
                <button
                  onClick={() => handleSelectSubTab('payouts')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer",
                    activeSubTab === 'payouts'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  MoMo Payouts &amp; GRA Ledger
                </button>
                <button
                  onClick={() => handleSelectSubTab('expenses')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer",
                    activeSubTab === 'expenses'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  Expenses &amp; P&amp;L
                </button>
                <button
                  onClick={() => handleSelectSubTab('utilities')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer",
                    activeSubTab === 'utilities'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  Sub-Meter Utilities
                </button>
                <button
                  onClick={() => handleSelectSubTab('installments')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer",
                    activeSubTab === 'installments'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  Semester Tranches
                </button>
                <button
                  onClick={() => handleSelectSubTab('subscriptions')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer",
                    activeSubTab === 'subscriptions'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  Listing Subscriptions
                </button>
              </>
            )}

            {/* PILLAR 3 SUB-TABS */}
            {activePillar === 'tenancies' && (
              <>
                <button
                  onClick={() => handleSelectSubTab('bookings')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5",
                    activeSubTab === 'bookings'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  <span>Reservations</span>
                  {pendingBookingsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-black">
                      {pendingBookingsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleSelectSubTab('agreements')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer",
                    activeSubTab === 'agreements'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  Act 772 Leases ({agreements.length})
                </button>
                <button
                  onClick={() => handleSelectSubTab('disciplinary')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer",
                    activeSubTab === 'disciplinary'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  Resident Conduct
                </button>
                <button
                  onClick={() => handleSelectSubTab('reviews')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer",
                    activeSubTab === 'reviews'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  Verified Reviews ({landlordReviews.length})
                </button>
              </>
            )}

            {/* PILLAR 4 SUB-TABS */}
            {activePillar === 'operations' && (
              <>
                <button
                  onClick={() => handleSelectSubTab('tickets')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5",
                    activeSubTab === 'tickets'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  <span>Work Orders</span>
                  {pendingTicketsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-black">
                      {pendingTicketsCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => handleSelectSubTab('staff')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer",
                    activeSubTab === 'staff'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  Caretaker Staff
                </button>
                <button
                  onClick={() => handleSelectSubTab('gatepass')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer",
                    activeSubTab === 'gatepass'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  Porter Gatehouse
                </button>
                <button
                  onClick={() => handleSelectSubTab('notices')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer",
                    activeSubTab === 'notices'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  Compound Broadcasts
                </button>
                <button
                  onClick={() => handleSelectSubTab('messages')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer",
                    activeSubTab === 'messages'
                      ? "bg-[#0F5132] text-white"
                      : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50"
                  )}
                >
                  Resident Chat
                </button>
              </>
            )}

          </div>
        </div>
      </div>

      {/* ── 3. PILLAR CONTENT WORKSPACES ── */}

      {/* ═══════════════════════════════════════════════════════════════════
          PILLAR 1: PORTFOLIO & UNITS
      ═══════════════════════════════════════════════════════════════════ */}
      {activePillar === 'portfolio' && (
        <div className="space-y-6 animate-in">
          
          {/* Sub-tab: Property Catalog Grid */}
          {activeSubTab === 'properties' && (
            <div className="space-y-6">
              
              {/* Controls bar: Search & Fast Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search properties by title, campus or location..."
                    value={propertySearchQuery}
                    onChange={(e) => setPropertySearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium outline-none focus:border-[#0F5132]"
                  />
                  <Filter className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard/landlord/new"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Property</span>
                  </Link>
                  <Link
                    href="/dashboard/landlord/inventory/new"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>Log Fixtures</span>
                  </Link>
                </div>
              </div>

              {isLoadingProperties ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 animate-pulse space-y-3">
                      <div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                      <div className="h-3 bg-zinc-100 dark:bg-zinc-900 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-800/40">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                      {propertySearchQuery ? 'No matching properties found' : 'No properties in your portfolio yet'}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                      {propertySearchQuery 
                        ? 'Try clearing your search query to see all listed properties.'
                        : 'List your student hostel, apartment, or residential flat to start accepting tenant bookings and MoMo escrow deposits.'}
                    </p>
                  </div>
                  {!propertySearchQuery && (
                    <Link
                      href="/dashboard/landlord/new"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F5132] text-white text-xs font-bold rounded-xl shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create First Property Listing</span>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredProperties.map((p: any) => {
                    const primaryImage = p.images?.[0] ? getImageUrl(p.images[0]) : null;
                    const priceFormatted = Number(p.price || 0).toLocaleString();
                    const isLive = p.isPublished && p.isAvailable;

                    return (
                      <div 
                        key={p.id}
                        className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* Image Thumbnail */}
                          <div className="relative h-44 w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            {primaryImage ? (
                              <img 
                                src={primaryImage} 
                                alt={p.title} 
                                className="w-full h-full object-cover" 
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 gap-1">
                                <Building2 className="w-8 h-8" />
                                <span className="text-[10px] font-mono">No photo attached</span>
                              </div>
                            )}

                            {/* Status Overlay */}
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                              <span className={clsx(
                                "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md shadow-xs border",
                                isLive
                                  ? "bg-emerald-500/90 text-white border-emerald-400/30"
                                  : "bg-zinc-900/85 text-zinc-200 border-zinc-700/50"
                              )}>
                                {isLive ? 'Active Listing' : 'Draft / Hidden'}
                              </span>
                            </div>

                            <div className="absolute top-2.5 right-2.5">
                              <span className="px-2 py-0.5 rounded-lg bg-black/60 text-white backdrop-blur-md font-mono text-[10px] font-bold">
                                {p.category || 'RESIDENTIAL'}
                              </span>
                            </div>
                          </div>

                          {/* Content Body */}
                          <div className="p-4 space-y-2">
                            <div>
                              <h3 className="font-bold text-sm text-zinc-950 dark:text-white line-clamp-1">
                                {p.title}
                              </h3>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                                {p.location || 'Ghana'}
                              </p>
                            </div>

                            <div className="pt-2 flex items-baseline justify-between border-t border-zinc-100 dark:border-zinc-800">
                              <div>
                                <span className="text-sm font-black text-[#0F5132] dark:text-emerald-400 font-mono">
                                  GH₵ {priceFormatted}
                                </span>
                                <span className="text-[11px] text-zinc-400 font-normal"> / {p.period || 'semester'}</span>
                              </div>
                              <span className="text-[11px] text-zinc-500 font-medium">
                                {p.rooms?.length || 0} unit(s) registered
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                          <Link
                            href={`/dashboard/landlord/properties/${p.id}/edit`}
                            className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 transition"
                          >
                            Edit Details
                          </Link>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                handleSelectSubTab('occupancy');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 text-xs font-bold hover:bg-emerald-100 transition"
                              title="View room availability matrix"
                            >
                              Floorplan
                            </button>
                            <Link
                              href={`/properties/${p.id}`}
                              target="_blank"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition"
                              title="Preview Public Listing"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab: Floorplan Matrix */}
          {activeSubTab === 'occupancy' && (
            <FloorplanOccupancyTab properties={myProperties} />
          )}

          {/* Sub-tab: Room Fixture & Asset Inventory */}
          {activeSubTab === 'assets' && (
            <RoomAssetInventoryTab properties={myProperties} bookings={bookings} />
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PILLAR 2: FINANCIALS & ESCROW LEDGER
      ═══════════════════════════════════════════════════════════════════ */}
      {activePillar === 'financials' && (
        <div className="space-y-6 animate-in">
          
          {/* Sub-tab: MoMo Payouts & GRA Ledger */}
          {activeSubTab === 'payouts' && (
            <div className="space-y-6">
              
              {/* Financial Summary & Statement Export */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-zinc-950 dark:text-white">
                      Ghana Revenue Authority (GRA) Escrow Compliance
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
                    Official disbursement record of all verified tenant rent payments, 5% platform service commissions, and Mobile Money settlement vouchers.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleDownloadGRATaxPDF}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Tax PDF</span>
                  </button>
                  <button
                    onClick={handleDownloadGRATaxCSV}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-800 transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* Recent Cashflow Transactions Table */}
              <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-white">
                      Disbursement Ledger &amp; Escrow Settlements
                    </h4>
                    <p className="text-[11px] text-zinc-400">All Paystack transactions cleared to your Mobile Money account</p>
                  </div>
                  <Link
                    href="/dashboard/landlord/withdraw"
                    className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 text-xs font-bold rounded-xl hover:bg-emerald-100 transition"
                  >
                    Request Payout &rarr;
                  </Link>
                </div>

                {isLoadingEarnings ? (
                  <div className="p-8 text-center text-xs text-zinc-400">Loading disbursement cashflows...</div>
                ) : cashflows.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                    <h5 className="font-bold text-sm text-zinc-900 dark:text-white">No Transactions Yet</h5>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      Rent collected from approved tenant bookings will automatically appear in your ledger here.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 uppercase tracking-wider text-[10px] font-bold">
                        <tr>
                          <th className="p-3.5">Reference &amp; Date</th>
                          <th className="p-3.5">Property / Unit</th>
                          <th className="p-3.5">Gross (GH₵)</th>
                          <th className="p-3.5">Fee (5%)</th>
                          <th className="p-3.5">Net Disbursed</th>
                          <th className="p-3.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                        {cashflows.map((flow: any) => (
                          <tr key={flow.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition">
                            <td className="p-3.5">
                              <div className="font-mono font-bold text-zinc-900 dark:text-white">{flow.reference || flow.id.slice(0, 8)}</div>
                              <div className="text-[10px] text-zinc-400">{new Date(flow.createdAt).toLocaleDateString()}</div>
                            </td>
                            <td className="p-3.5 text-zinc-600 dark:text-zinc-300">
                              {flow.propertyTitle || 'Residential Tenancy'}
                            </td>
                            <td className="p-3.5 font-mono">
                              GH₵ {Number(flow.amount || 0).toLocaleString()}
                            </td>
                            <td className="p-3.5 font-mono text-zinc-400">
                              - GH₵ {Number(flow.commission || 0).toLocaleString()}
                            </td>
                            <td className="p-3.5 font-mono font-bold text-[#0F5132] dark:text-emerald-400">
                              GH₵ {Number(flow.netAmount || flow.amount || 0).toLocaleString()}
                            </td>
                            <td className="p-3.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                {flow.status || 'CLEARED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sub-tab: Operational Expense Tracker */}
          {activeSubTab === 'expenses' && (
            <ExpenseTrackerTab properties={myProperties} />
          )}

          {/* Sub-tab: Utility Sub-Meter Billing */}
          {activeSubTab === 'utilities' && (
            <UtilitySubMeterTab properties={myProperties} />
          )}

          {/* Sub-tab: Semester Installment Tranches */}
          {activeSubTab === 'installments' && (
            <AcademicInstallmentTab properties={myProperties} />
          )}

          {/* Sub-tab: Listing Subscriptions */}
          {activeSubTab === 'subscriptions' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">Active Listing Subscriptions</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Monthly and semester platform placement to keep your listings prioritized in student search rankings.
                  </p>
                </div>
                <Link
                  href="/dashboard/landlord/subscription"
                  className="px-4 py-2 bg-[#0F5132] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Manage Subscription Tiers &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subProperties.map((prop: any) => (
                  <div key={prop.id} className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-950 dark:text-white">{prop.title}</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">Status: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{prop.subscriptionStatus || 'Active'}</span></p>
                    </div>
                    <button
                      onClick={() => renewSubMutation.mutate(prop.id)}
                      disabled={renewSubMutation.isPending}
                      className="px-3.5 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold hover:opacity-90 transition cursor-pointer"
                    >
                      Renew
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PILLAR 3: TENANCIES & LEASES
      ═══════════════════════════════════════════════════════════════════ */}
      {activePillar === 'tenancies' && (
        <div className="space-y-6 animate-in">
          
          {/* Sub-tab: Booking Applications Queue */}
          {activeSubTab === 'bookings' && (
            <div className="space-y-6">
              
              {/* Triage Alert for Pending Allocations */}
              {!isLoadingBookings && pendingBookingsCount > 0 && (
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                        Action Required: {pendingBookingsCount} Pending Room Reservation(s)
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                      Approve to automatically issue binding Act 772 lease
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {bookings.filter((b: any) => b.status === 'PENDING').map((pending: any) => (
                      <div 
                        key={pending.id} 
                        className="p-4 rounded-xl bg-white dark:bg-[#12151D] border border-amber-200 dark:border-amber-900/50 shadow-xs flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-black text-sm text-zinc-950 dark:text-white">
                                {pending.tenant?.firstName} {pending.tenant?.lastName}
                              </div>
                              <div className="text-xs text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                <span>{pending.tenant?.campus || pending.tenant?.email}</span>
                                {pending.tenant?.studentId && (
                                  <span className="font-mono text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                    ID: {pending.tenant.studentId}
                                  </span>
                                )}
                              </div>
                            </div>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                              Awaiting Approval
                            </span>
                          </div>

                          <div className="mt-2.5 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                            <span className="font-medium text-zinc-600 dark:text-zinc-400 truncate max-w-[60%]">
                              {pending.property?.title}
                            </span>
                            <span className="font-mono font-bold text-[#0F5132] dark:text-emerald-400">
                              {new Date(pending.startDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => { setProcessingId(pending.id); updateStatusMutation.mutate({ id: pending.id, status: 'APPROVED' }); }}
                            disabled={processingId === pending.id}
                            className="flex-1 py-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            {processingId === pending.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            <span>Approve &amp; Issue Lease</span>
                          </button>
                          <button
                            onClick={() => { setProcessingId(pending.id); updateStatusMutation.mutate({ id: pending.id, status: 'REJECTED' }); }}
                            disabled={processingId === pending.id}
                            className="px-3.5 py-2 bg-zinc-100 hover:bg-rose-50 hover:text-rose-600 dark:bg-zinc-800 dark:hover:bg-rose-950/40 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold inline-flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete Bookings History Table */}
              <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-white">
                    All Tenancy Reservations ({bookings.length})
                  </h4>
                  <span className="text-[11px] text-zinc-400">Direct booking logbook</span>
                </div>

                {isLoadingBookings ? (
                  <div className="p-8 text-center text-xs text-zinc-400">Loading reservations...</div>
                ) : bookings.length === 0 ? (
                  <div className="p-12 text-center space-y-2">
                    <Users className="w-10 h-10 text-zinc-400 mx-auto" />
                    <h5 className="font-bold text-sm text-zinc-950 dark:text-white">No Reservations Yet</h5>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      Prospective tenants applying for your properties will be queued here for review and digital agreement signing.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 uppercase tracking-wider text-[10px] font-bold">
                        <tr>
                          <th className="p-3.5">Tenant Details</th>
                          <th className="p-3.5">Property Title</th>
                          <th className="p-3.5">Stay Period</th>
                          <th className="p-3.5">Status</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
                        {bookings.map((booking: any) => (
                          <tr key={booking.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition">
                            <td className="p-3.5">
                              <div className="font-bold text-zinc-900 dark:text-white">
                                {booking.tenant?.firstName} {booking.tenant?.lastName}
                              </div>
                              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                                <Mail className="w-3 h-3" /> {booking.tenant?.email}
                              </div>
                            </td>
                            <td className="p-3.5 text-zinc-600 dark:text-zinc-300">
                              {booking.property?.title}
                            </td>
                            <td className="p-3.5 text-zinc-500 font-mono text-[11px]">
                              {new Date(booking.startDate).toLocaleDateString()} &rarr; {new Date(booking.endDate).toLocaleDateString()}
                            </td>
                            <td className="p-3.5">
                              <span className={clsx(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold",
                                booking.status === 'PENDING' ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300" :
                                ['APPROVED', 'CONFIRMED', 'COMPLETED', 'PAID', 'ACTIVE', 'CHECKED_IN'].includes(booking.status) ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" :
                                "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                              )}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-right space-x-1.5">
                              {booking.status === 'PENDING' && (
                                <>
                                  <button
                                    onClick={() => { setProcessingId(booking.id); updateStatusMutation.mutate({ id: booking.id, status: 'APPROVED' }); }}
                                    disabled={processingId === booking.id}
                                    className="px-2.5 py-1 bg-[#0F5132] text-white rounded-lg text-xs font-bold hover:bg-[#0A3D24] transition cursor-pointer"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => { setProcessingId(booking.id); updateStatusMutation.mutate({ id: booking.id, status: 'REJECTED' }); }}
                                    disabled={processingId === booking.id}
                                    className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs font-bold hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                </>
                              )}

                              {['CONFIRMED', 'COMPLETED', 'PAID', 'ACTIVE'].includes(booking.status) && (
                                <button
                                  onClick={() => {
                                    setProcessingId(booking.id);
                                    updateStatusMutation.mutate({ id: booking.id, status: 'CHECKED_IN' });
                                  }}
                                  disabled={processingId === booking.id}
                                  className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
                                >
                                  Check-In
                                </button>
                              )}

                              <Link
                                href={`/dashboard/agreements/${booking.id}`}
                                className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-bold hover:bg-zinc-200 transition inline-flex items-center gap-1"
                              >
                                <FileSignature className="w-3 h-3" />
                                <span>Lease</span>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Sub-tab: Act 772 Statutory Tenancy Agreements */}
          {activeSubTab === 'agreements' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                    <FileSignature className="w-5 h-5 text-[#0F5132] dark:text-emerald-400" />
                    <span>Statutory Residential Lease Agreements</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Digitally countersigned under the Rent Act of Ghana (Act 220 &amp; Act 772).
                  </p>
                </div>
              </div>

              {isLoadingAgreements ? (
                <div className="p-8 text-center text-xs text-zinc-400">Loading statutory leases...</div>
              ) : agreements.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <FileSignature className="w-10 h-10 text-zinc-400 mx-auto" />
                  <h5 className="font-bold text-sm text-zinc-900 dark:text-white">No Signed Agreements Found</h5>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    When you approve booking applications, enforceable legal contracts are generated automatically for digital signatures.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agreements.map((item: any) => {
                    const isFullySigned = item.status === 'COMPLETED' || (Boolean(item.tenantSignature) && Boolean(item.landlordSignature));
                    const needsLandlordSig = !item.landlordSignature;

                    return (
                      <div 
                        key={item.id} 
                        className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <span className={clsx(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                              isFullySigned ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" :
                              needsLandlordSig ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 animate-pulse" :
                              "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300"
                            )}>
                              {isFullySigned ? 'Verified & Binding' : needsLandlordSig ? 'Landlord Signature Required' : 'Tenant Signature Required'}
                            </span>
                          </div>

                          <h4 className="font-bold text-base text-zinc-950 dark:text-white mt-2">
                            {item.booking?.property?.title || 'Managed Apartment'}
                          </h4>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Resident: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{item.booking?.tenant?.firstName} {item.booking?.tenant?.lastName}</span>
                          </p>
                        </div>

                        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-zinc-400 font-mono">
                            Created: {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                          <Link
                            href={`/dashboard/agreements/${item.bookingId}`}
                            className={clsx(
                              "px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-xs",
                              needsLandlordSig ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-[#0F5132] hover:bg-[#0A3D24] text-white"
                            )}
                          >
                            <FileSignature className="w-3.5 h-3.5" />
                            <span>{needsLandlordSig ? 'Sign Agreement' : 'View Agreement'}</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab: Resident Conduct Logbook */}
          {activeSubTab === 'disciplinary' && (
            <HostelDisciplinaryTab properties={myProperties} bookings={bookings} />
          )}

          {/* Sub-tab: Tenant Ratings & Reviews */}
          {activeSubTab === 'reviews' && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs">
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">Tenant Ratings &amp; Reviews</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Direct feedback submitted by verified student residents regarding water, electricity, security, and compound maintenance.
                </p>
              </div>

              {isLoadingLandlordReviews ? (
                <div className="p-8 text-center text-xs text-zinc-400">Loading reviews...</div>
              ) : landlordReviews.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <Star className="w-10 h-10 text-amber-500 mx-auto" />
                  <h5 className="font-bold text-sm text-zinc-900 dark:text-white">No Reviews Yet</h5>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Verified residents will rate your accommodation after their tenancy stay.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {landlordReviews.map((rev: any) => (
                    <div key={rev.id} className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm text-zinc-900 dark:text-white">
                          {rev.booking?.tenant?.firstName} {rev.booking?.tenant?.lastName}
                        </div>
                        <div className="flex text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star 
                              key={s} 
                              className={clsx("w-3.5 h-3.5", s <= (rev.rating || 5) ? "fill-amber-500 text-amber-500" : "text-zinc-300 dark:text-zinc-700")} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 italic">
                        "{rev.comment || 'Verified resident review.'}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          PILLAR 4: FACILITY & OPERATIONS
      ═══════════════════════════════════════════════════════════════════ */}
      {activePillar === 'operations' && (
        <div className="space-y-6 animate-in">
          
          {/* Sub-tab: Maintenance Work Orders */}
          {activeSubTab === 'tickets' && (
            <div className="space-y-6">
              
              {/* Emergency Banner if Urgent Tickets exist */}
              {urgentTicketsCount > 0 && (
                <AlertBanner
                  type="warning"
                  message={`Attention: ${urgentTicketsCount} high-priority or escalated repair issue(s) require prompt caretaker dispatch.`}
                />
              )}

              {isLoadingTickets ? (
                <div className="p-8 text-center text-xs text-zinc-400">Loading work orders...</div>
              ) : tickets.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h5 className="font-bold text-sm text-zinc-900 dark:text-white">All Clear! No Maintenance Tickets</h5>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Reported resident issues with plumbing, ECG power, or room fixtures will be queued here for triage.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tickets.map((t: any) => {
                    const isUrgent = t.priority === 'URGENT' || t.priority === 'HIGH' || t.isEscalated;

                    return (
                      <div 
                        key={t.id} 
                        className={clsx(
                          "p-5 rounded-2xl bg-white dark:bg-[#12151D] border shadow-xs space-y-4 transition",
                          isUrgent ? "border-amber-300 dark:border-amber-900/60" : "border-zinc-200 dark:border-zinc-800"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                              {t.property?.title}
                            </span>
                            <h4 className="font-bold text-base text-zinc-950 dark:text-white mt-0.5">
                              {t.title}
                            </h4>
                            <p className="text-xs text-zinc-500 mt-0.5">
                              Tenant: <span className="font-semibold text-zinc-800 dark:text-zinc-200">{t.tenant?.firstName} {t.tenant?.lastName}</span>
                              {t.tenant?.phoneNumber && ` • ${t.tenant.phoneNumber}`}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className={clsx(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase",
                              t.status === 'PENDING' ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300" :
                              t.status === 'SCHEDULED' ? "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300" :
                              t.status === 'RESOLVED' ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" :
                              "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            )}>
                              {t.status}
                            </span>
                            {isUrgent && (
                              <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase">
                                Urgent
                              </span>
                            )}
                          </div>
                        </div>

                        {t.description && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 bg-zinc-50 dark:bg-zinc-900 p-2.5 rounded-xl font-mono text-[11px]">
                            {t.description}
                          </p>
                        )}

                        <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                          <span className="text-[10px] text-zinc-400 font-mono">
                            Logged: {new Date(t.createdAt).toLocaleDateString()}
                          </span>

                          <div className="flex items-center gap-2">
                            {t.status !== 'RESOLVED' && (
                              <>
                                <button
                                  onClick={() => {
                                    setTicketActionModal({
                                      isOpen: true,
                                      ticketId: t.id,
                                      ticketTitle: t.title,
                                      mode: 'SCHEDULE',
                                      scheduledDate: new Date().toISOString().split('T')[0],
                                      repairCost: '0',
                                      resolutionNotes: '',
                                      completionImageUrl: '',
                                    });
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold hover:bg-zinc-200 transition cursor-pointer"
                                >
                                  Schedule
                                </button>
                                <button
                                  onClick={() => {
                                    setTicketActionModal({
                                      isOpen: true,
                                      ticketId: t.id,
                                      ticketTitle: t.title,
                                      mode: 'RESOLVE',
                                      scheduledDate: '',
                                      repairCost: '0',
                                      resolutionNotes: 'Repair completed successfully.',
                                      completionImageUrl: '',
                                    });
                                  }}
                                  className="px-3 py-1.5 rounded-xl bg-[#0F5132] text-white text-xs font-bold hover:bg-[#0A3D24] transition cursor-pointer"
                                >
                                  Resolve
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab: Caretaker & Porter Delegation */}
          {activeSubTab === 'staff' && (
            <StaffDelegationTab properties={myProperties} />
          )}

          {/* Sub-tab: Porter's Gate Logbook */}
          {activeSubTab === 'gatepass' && (
            <GateLogbookTab properties={myProperties} />
          )}

          {/* Sub-tab: Compound Broadcast Notices */}
          {activeSubTab === 'notices' && (
            <CompoundNoticeTab properties={myProperties} />
          )}

          {/* Sub-tab: Direct Resident Messaging */}
          {activeSubTab === 'messages' && (
            <MessagingTab />
          )}

        </div>
      )}

      {/* ── Ticket Action & Resolution Modal ── */}
      {ticketActionModal.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md transition-all">
          <div className="w-full max-w-lg bg-white dark:bg-[#121216] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-xs",
                  ticketActionModal.mode === 'SCHEDULE' ? "bg-indigo-600" : "bg-[#0F5132]"
                )}>
                  {ticketActionModal.mode === 'SCHEDULE' ? <Calendar className="w-5 h-5 text-white" /> : <Wrench className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                    {ticketActionModal.mode === 'SCHEDULE' ? 'Schedule Caretaker Visit' : 'Complete & Resolve Work Order'}
                  </h3>
                  <p className="text-xs text-zinc-500 line-clamp-1">{ticketActionModal.ticketTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setTicketActionModal(prev => ({ ...prev, isOpen: false }))}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-white p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              {ticketActionModal.mode === 'SCHEDULE' ? (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Estimated Caretaker Visit Date
                  </label>
                  <input
                    type="date"
                    value={ticketActionModal.scheduledDate}
                    onChange={(e) => setTicketActionModal(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm font-semibold outline-none focus:border-[#0F5132]"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Repair Expenditure (GH₵)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={ticketActionModal.repairCost}
                        onChange={(e) => setTicketActionModal(prev => ({ ...prev, repairCost: e.target.value }))}
                        className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm font-semibold outline-none focus:border-[#0F5132]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Proof Photo URL (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={ticketActionModal.completionImageUrl}
                        onChange={(e) => setTicketActionModal(prev => ({ ...prev, completionImageUrl: e.target.value }))}
                        className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm font-semibold outline-none focus:border-[#0F5132]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Resolution Summary / Work Done
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Replaced leaking valve and sealed sink pipes."
                      value={ticketActionModal.resolutionNotes}
                      onChange={(e) => setTicketActionModal(prev => ({ ...prev, resolutionNotes: e.target.value }))}
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs sm:text-sm font-semibold outline-none focus:border-[#0F5132] resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setTicketActionModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (ticketActionModal.mode === 'SCHEDULE') {
                    updateTicketMutation.mutate({
                      id: ticketActionModal.ticketId,
                      status: 'SCHEDULED',
                      scheduledDate: ticketActionModal.scheduledDate,
                    });
                  } else {
                    updateTicketMutation.mutate({
                      id: ticketActionModal.ticketId,
                      status: 'RESOLVED',
                      repairCost: parseFloat(ticketActionModal.repairCost) || 0,
                      resolutionNotes: ticketActionModal.resolutionNotes || 'Repair completed successfully.',
                      completionImageUrl: ticketActionModal.completionImageUrl || undefined,
                    });
                  }
                  setTicketActionModal(prev => ({ ...prev, isOpen: false }));
                }}
                disabled={updateTicketMutation.isPending}
                className={clsx(
                  "px-6 py-2.5 rounded-xl text-xs font-bold text-white transition shadow-xs",
                  ticketActionModal.mode === 'SCHEDULE' 
                    ? "bg-indigo-600 hover:bg-indigo-700" 
                    : "bg-[#0F5132] hover:bg-[#0A3D24]"
                )}
              >
                {updateTicketMutation.isPending ? 'Saving...' : ticketActionModal.mode === 'SCHEDULE' ? 'Save Schedule' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function LandlordDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-[500px] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#0F5132]" />
      </div>
    }>
      <LandlordDashboardContent />
    </Suspense>
  );
}
