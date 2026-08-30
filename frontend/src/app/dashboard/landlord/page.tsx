'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, Users, Mail, Phone, Calendar, Check, X, ShieldAlert, ShieldCheck, 
  CreditCard, Star, PenTool, CheckCircle, Clock, FileSignature, Building, 
  Activity, DollarSign, AlertTriangle, ArrowUpRight, Printer, RefreshCw, Layers, MessageSquare,
  Megaphone, UserCog, ClipboardCheck, TrendingUp, Sparkles, Wrench
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import OnboardingProgressWidget from '@/components/OnboardingProgressWidget';
import OnboardingTour from '@/components/OnboardingTour';
import MessagingTab from '@/components/MessagingTab';
import WithdrawalModal from '@/components/WithdrawalModal';
import FloorplanOccupancyTab from '@/components/landlord/FloorplanOccupancyTab';
import CompoundNoticeTab from '@/components/landlord/CompoundNoticeTab';
import ExpenseTrackerTab from '@/components/landlord/ExpenseTrackerTab';
import StaffDelegationTab from '@/components/landlord/StaffDelegationTab';
import InspectionModal from '@/components/landlord/InspectionModal';
import toast from 'react-hot-toast';

function getImageUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return `${backendUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

export default function LandlordDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'bookings' | 'occupancy' | 'notices' | 'expenses' | 'tickets' | 'subscriptions' | 'financials' | 'messages' | 'agreements' | 'staff'>('bookings');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedInspectionBooking, setSelectedInspectionBooking] = useState<any>(null);
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

  // Session Query — uses shared cache key so it's instant on re-nav
  const { data: session } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
    staleTime: 5 * 60 * 1000
  });

  // Fetch Bookings — loads eagerly as the primary tab
  const { data: bookingsResponse, isLoading: isLoadingBookings, error: bookingsError, refetch: refetchBookings } = useQuery({
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

  // Fetch Landlord Properties for all tabs & selectors
  const { data: propertiesData } = useQuery({
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

  // Fetch Landlord Agreements (Lease Vault) — only loads when agreements tab is open
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

  // Fetch Tickets — active for real-time badge updates and instant sync
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

  // Fetch Subscriptions Overview — active for instant status updates
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

  // Fetch Detailed Earnings Report — only loads when financials tab is open
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
    enabled: activeTab === 'financials'
  });

  // Fetch GRA Financial Ledger (Net Yields & Tax Deductions)
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
    enabled: activeTab === 'financials'
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

  const handleRefreshAll = () => {
    refetchBookings();
    if (activeTab === 'agreements') refetchAgreements();
    if (activeTab === 'tickets') refetchTickets();
    if (activeTab === 'subscriptions') refetchSubs();
    if (activeTab === 'financials') {
      refetchEarnings();
      refetchLedger();
    }
    toast.success('Refreshing dashboard data...');
  };

  // Status Mutation (Bookings)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { data } = await api.put(`/bookings/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      toast.success('Booking status updated!');
      queryClient.invalidateQueries({ queryKey: ['bookings', 'landlord'] });
    },
    onSettled: () => setProcessingId(null)
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



  const isLoading = isLoadingBookings && isLoadingTickets && isLoadingSubs && isLoadingEarnings;

  const bookings = bookingsResponse?.bookings || [];
  const agreements = agreementsResponse?.agreements || [];
  const tickets = ticketsResponse?.tickets || [];
  const subStats = subOverviewResponse?.stats || { totalProperties: 0, activeSubscriptions: 0, expiringSoon: 0, unsubscribedOrExpired: 0 };
  const subProperties = subOverviewResponse?.properties || [];
  const earningsSummary = earningsReport?.summary || { totalGrossEarnings: 0, totalCommissionDeducted: 0, totalNetEarnings: 0, thisMonthNetEarnings: 0, platformCommissionPercent: 5 };
  const monthlyTrends = earningsReport?.monthlyTrends || [];
  const cashflows = earningsReport?.recentCashflows || [];

  return (
    <div className="space-y-8 pb-12">
      <OnboardingProgressWidget 
        user={session} 
        hasProperty={Boolean(session?.hasProperty || session?._count?.properties > 0 || subStats.totalProperties > 0 || subProperties.length > 0)} 
      />
      
      {/* Sticky Header Banner & Tabs Container */}
      <div className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-slate-200/60 dark:border-slate-800/60 space-y-4 mb-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight flex items-center gap-3 flex-wrap">
              <span>Landlord CRM Command Center</span>
            </h1>
            <p className="text-xs text-[var(--muted-foreground)]">
              Manage booking requests, tenant support tickets, listing subscriptions, and earnings reports.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <OnboardingTour role={session?.role} user={session} />
            {/* Expiring Soon Alert Badge */}
            {subStats.expiringSoon > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                <span>{subStats.expiringSoon} property subscription(s) expiring within 7 days!</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div id="tour-landlord-tabs" className="flex space-x-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('bookings')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all",
              activeTab === 'bookings' 
                ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            Bookings ({bookings.length})
          </button>

          <button
            onClick={() => setActiveTab('occupancy')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === 'occupancy' 
                ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-500" />
            Floorplan Matrix
          </button>

          <button
            onClick={() => setActiveTab('notices')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === 'notices' 
                ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            <Megaphone className="w-3.5 h-3.5 text-purple-500" />
            Compound Notices
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === 'expenses' 
                ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            Expenses & P&L
          </button>

          <button
            onClick={() => setActiveTab('agreements')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === 'agreements' 
                ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            <FileSignature className="w-3.5 h-3.5 text-indigo-500" />
            Lease Vault ({agreements.length})
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === 'tickets' 
                ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            <Wrench className="w-3.5 h-3.5 text-red-500" />
            Tickets {tickets.filter((t:any) => t.status === 'PENDING').length > 0 && (
              <span className="bg-red-500 text-white px-1.5 py-0.2 rounded-full text-[10px]">
                {tickets.filter((t:any) => t.status === 'PENDING').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('staff')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === 'staff' 
                ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            <UserCog className="w-3.5 h-3.5 text-blue-500" />
            Staff Delegation
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === 'subscriptions' 
                ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Subscriptions
          </button>

          <button
            onClick={() => setActiveTab('financials')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === 'financials' 
                ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Financials & Payouts
          </button>

          <button
            onClick={() => setActiveTab('messages')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5",
              activeTab === 'messages' 
                ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            )}
          >
            <MessageSquare className="w-3.5 h-3.5 text-teal-500" />
            Messages
          </button>
        </div>
      </div>

      {activeTab === 'messages' && (
        <div>
          <MessagingTab />
        </div>
      )}

      {/* ─── TAB 1: BOOKING REQUESTS ──────────────────────────────────────────────── */}
      {activeTab === 'bookings' && (
        <div className="space-y-4">
          {isLoadingBookings ? (
            <div className="glass-card rounded-2xl p-6 space-y-3 border border-[var(--border)]">
              {[1,2,3].map(i => (
                <div key={i} className="flex gap-4 items-center animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-1/3" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2" />
                  </div>
                  <div className="h-7 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-[var(--muted-foreground)]" />
              </div>
              <h3 className="text-lg font-bold">No booking requests yet</h3>
              <p className="text-[var(--muted-foreground)]">When tenants book your properties, they will appear here.</p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#E06D53] text-white shadow-md">
                    <tr>
                      <th className="p-4 text-xs font-extrabold text-white uppercase tracking-wider">Tenant</th>
                      <th className="p-4 text-xs font-extrabold text-white uppercase tracking-wider">Property</th>
                      <th className="p-4 text-xs font-extrabold text-white uppercase tracking-wider">Dates</th>
                      <th className="p-4 text-xs font-extrabold text-white uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-extrabold text-white uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {bookings.map((booking: any) => (
                      <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-[var(--foreground)]">{booking.tenant.firstName} {booking.tenant.lastName}</div>
                          <div className="flex flex-col gap-1 mt-1">
                            <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                              <Star className="w-3 h-3 fill-amber-500" /> Rep: {booking.tenant.reputationScore ? (booking.tenant.reputationScore / 10).toFixed(1) : '5.0'}/5.0
                            </span>
                            <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]"><Mail className="w-3 h-3"/> {booking.tenant.email}</span>
                            {booking.tenant.phoneNumber && (
                              <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]"><Phone className="w-3 h-3"/> {booking.tenant.phoneNumber}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-medium">{booking.property.title}</td>
                        <td className="p-4 text-sm text-[var(--muted-foreground)]">
                          <div className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(booking.startDate).toLocaleDateString()}</div>
                          <div className="text-xs ml-4">to {new Date(booking.endDate).toLocaleDateString()}</div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                            booking.status === 'PENDING' ? 'bg-amber-100 text-amber-700 font-bold' :
                            booking.status === 'APPROVED' || booking.status === 'CONFIRMED' || booking.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {booking.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => { setProcessingId(booking.id); updateStatusMutation.mutate({ id: booking.id, status: 'APPROVED' }); }}
                                disabled={processingId === booking.id}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all"
                              >
                                {processingId === booking.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Accept
                              </button>
                              <button
                                onClick={() => { setProcessingId(booking.id); updateStatusMutation.mutate({ id: booking.id, status: 'REJECTED' }); }}
                                disabled={processingId === booking.id}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all"
                              >
                                <X className="w-3 h-3" /> Decline
                              </button>
                            </>
                          )}
                          {(booking.status === 'APPROVED' || booking.status === 'CONFIRMED' || booking.status === 'COMPLETED' || booking.status === 'PAID') && (
                            <>
                              <button
                                onClick={() => setSelectedInspectionBooking(booking)}
                                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                                title="Digital Move-In / Move-Out Inspection"
                              >
                                <ClipboardCheck className="w-3.5 h-3.5" /> Inspect
                              </button>
                              <Link
                                href={`/dashboard/agreements/${booking.id}`}
                                className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md shadow-indigo-500/20"
                              >
                                <FileSignature className="w-3.5 h-3.5" /> View & Sign Agreement
                              </Link>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: LEASE VAULT (DIGITAL LEASE AGREEMENTS) ─────────────────────────── */}
      {activeTab === 'agreements' && (
        <div className="animate-in space-y-4">
          <div className="flex justify-between items-center bg-purple-50 dark:bg-purple-950/30 p-4 rounded-2xl border border-purple-100 dark:border-purple-900/50">
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Digital Tenancy Lease Vault
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                Review, digitally sign, and manage binding SHA-256 encrypted tenancy contracts for your properties.
              </p>
            </div>
          </div>

          {isLoadingAgreements ? (
            <div className="glass-card rounded-2xl p-6 space-y-3 border border-[var(--border)]">
              {[1,2,3].map(i => (
                <div key={i} className="flex gap-4 items-center animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-1/3" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2" />
                  </div>
                  <div className="h-7 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
              ))}
            </div>
          ) : agreements.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mb-4">
                <FileSignature className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold">No Lease Agreements Found</h3>
              <p className="text-[var(--muted-foreground)] text-xs mt-1 max-w-sm">
                When you accept tenant booking requests, official digital tenancy agreements will automatically be generated here for signature.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agreements.map((item: any) => {
                const isFullySigned = item.status === 'COMPLETED';
                const needsLandlordSig = !item.landlordSignature;

                return (
                  <div key={item.id} className="glass-card p-6 rounded-2xl border border-[var(--border)] hover:border-purple-500/50 transition-all flex flex-col justify-between space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isFullySigned ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' :
                          needsLandlordSig ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 animate-pulse' :
                          'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400'
                        }`}>
                          {isFullySigned ? 'Verified & Binding' : needsLandlordSig ? 'Landlord Signature Needed' : 'Tenant Signature Needed'}
                        </span>
                        <h4 className="font-extrabold text-base text-[var(--foreground)] mt-3">
                          {item.booking?.property?.title}
                        </h4>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Tenant: <span className="font-bold text-[var(--foreground)]">{item.booking?.tenant?.firstName} {item.booking?.tenant?.lastName}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-[var(--muted-foreground)] pt-3 border-t border-[var(--border)]">
                      <div>
                        Created: {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                      <Link
                        href={`/dashboard/agreements/${item.bookingId}`}
                        className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                          needsLandlordSig 
                            ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90 shadow-amber-500/20' 
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                        }`}
                      >
                        <FileSignature className="w-3.5 h-3.5" />
                        {needsLandlordSig ? 'Sign Agreement' : 'View Agreement'}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: MAINTENANCE TICKETS ───────────────────────────────────────────── */}
      {activeTab === 'tickets' && (
        <div className="animate-in space-y-4">
          {isLoadingTickets ? (
            <div className="glass-card rounded-2xl p-6 space-y-3 border border-[var(--border)]">
              {[1,2,3].map(i => (
                <div key={i} className="flex gap-4 items-center animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-1/3" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-2/3" />
                  </div>
                  <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center flex flex-col items-center">
              <CheckCircle className="w-12 h-12 text-emerald-500 mb-3" />
              <h3 className="text-lg font-bold">No maintenance tickets</h3>
              <p className="text-xs text-[var(--muted-foreground)]">All property issues are currently clear.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tickets.map((t: any) => {
                const isUrgent = t.priority === 'URGENT' || t.priority === 'HIGH';
                return (
                  <div key={t.id} className={clsx(
                    "glass-card p-5 rounded-2xl border space-y-4 transition-all",
                    t.isEscalated ? "border-red-500/60 bg-red-500/5 shadow-lg shadow-red-500/10" : "border-[var(--border)]"
                  )}>
                    {/* Header Badges */}
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider">{t.property?.title}</span>
                        <h4 className="font-extrabold text-base text-[var(--foreground)]">{t.title}</h4>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Tenant: <strong>{t.tenant?.firstName} {t.tenant?.lastName}</strong> ({t.tenant?.phoneNumber || t.tenant?.email})
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={clsx(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                          t.status === 'PENDING' ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300" :
                          t.status === 'SCHEDULED' ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-300" :
                          t.status === 'IN_PROGRESS' ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-300" :
                          t.status === 'ESCALATED' ? "bg-red-600 text-white animate-pulse" :
                          "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300"
                        )}>
                          {t.status}
                        </span>
                        
                        {isUrgent && (
                          <span className="text-[9px] font-black text-red-500 uppercase flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {t.priority} Priority
                          </span>
                        )}

                        {t.isEscalated && (
                          <span className="text-[9px] font-black bg-red-500 text-white px-2 py-0.5 rounded-md animate-bounce">
                            ⚠️ Admin Escalated (48h Unresolved)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Multi-Stage Repair Status Bar */}
                    <div className="bg-slate-100 dark:bg-slate-800/60 p-2.5 rounded-xl flex items-center justify-between text-[11px] font-bold">
                      <span className={t.status === 'PENDING' ? 'text-amber-500 font-extrabold' : 'text-slate-400'}>1. Pending</span>
                      <span className="text-slate-400">→</span>
                      <span className={t.status === 'SCHEDULED' ? 'text-indigo-500 font-extrabold' : 'text-slate-400'}>2. Scheduled</span>
                      <span className="text-slate-400">→</span>
                      <span className={t.status === 'IN_PROGRESS' ? 'text-blue-500 font-extrabold' : 'text-slate-400'}>3. In Repair</span>
                      <span className="text-slate-400">→</span>
                      <span className={t.status === 'RESOLVED' ? 'text-emerald-500 font-extrabold' : 'text-slate-400'}>4. Resolved</span>
                    </div>

                    <p className="text-xs text-[var(--muted-foreground)]">{t.description}</p>

                    {/* Meta Data Details */}
                    {t.scheduledDate && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Scheduled Repair Date: <strong>{new Date(t.scheduledDate).toLocaleDateString()}</strong>
                      </p>
                    )}

                    {t.repairCost && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold">
                        Logged Repair Cost: GHS {t.repairCost.toLocaleString()}
                      </p>
                    )}

                    {/* Image Attachments */}
                    {(t.imageUrl || t.completionImageUrl) && (
                      <div className="flex gap-2 pt-1">
                        {t.imageUrl && (
                          <a href={getImageUrl(t.imageUrl)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-indigo-500 underline flex items-center gap-1">
                            📷 Issue Photo
                          </a>
                        )}
                        {t.completionImageUrl && (
                          <a href={getImageUrl(t.completionImageUrl)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-emerald-500 underline flex items-center gap-1">
                            ✅ Repair Completion Proof
                          </a>
                        )}
                      </div>
                    )}

                    {/* Action Controls */}
                    <div className="flex flex-wrap justify-between items-center pt-3 border-t border-[var(--border)] text-xs gap-2">
                      <span className="text-slate-400 font-mono text-[10px]">
                        Filed: {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                      
                      <div className="flex flex-wrap gap-2">
                        {t.status === 'PENDING' && (
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
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                          >
                            Schedule Repair
                          </button>
                        )}

                        {(t.status === 'PENDING' || t.status === 'SCHEDULED') && (
                          <button
                            onClick={() => updateTicketMutation.mutate({ id: t.id, status: 'IN_PROGRESS' })}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                          >
                            Start Repair
                          </button>
                        )}

                        {t.status !== 'RESOLVED' && (
                          <button
                            onClick={() => {
                              setTicketActionModal({
                                isOpen: true,
                                ticketId: t.id,
                                ticketTitle: t.title,
                                mode: 'RESOLVE',
                                scheduledDate: new Date().toISOString().split('T')[0],
                                repairCost: '0',
                                resolutionNotes: 'Repair completed successfully.',
                                completionImageUrl: '',
                              });
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/20"
                          >
                            Complete Repair & Resolve
                          </button>
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

      {/* ─── TAB 3: LISTING SUBSCRIPTIONS & RENEWAL REMINDERS ─────────────────────── */}
      {activeTab === 'subscriptions' && (
        <div className="animate-in space-y-6">
          {isLoadingSubs ? (
            <div className="glass-card rounded-2xl p-6 space-y-4 border border-[var(--border)]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-20 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
                ))}
              </div>
              {[1,2,3].map(i => (
                <div key={i} className="flex gap-4 items-center animate-pulse">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded-full w-1/3" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2" />
                  </div>
                  <div className="h-7 w-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
          <>
          {/* Subscription Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border bg-[#EEF2FF] dark:bg-[#1E1B4B]/60 border-[#C7D2FE] dark:border-[#3730A3] flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="p-3 bg-[#E0E7FF] dark:bg-[#312E81] text-[#4338CA] dark:text-[#A5B4FC] rounded-2xl shadow-inner">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#3730A3] dark:text-[#C7D2FE] uppercase tracking-wider">Total Properties</p>
                <h3 className="text-2xl font-black text-[#4338CA] dark:text-[#E0E7FF]">{subStats.totalProperties}</h3>
              </div>
            </div>

            <div className="p-5 rounded-2xl border bg-[#ECFDF5] dark:bg-[#064E3B]/60 border-[#A7F3D0] dark:border-[#065F46] flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="p-3 bg-[#D1FAE5] dark:bg-[#047857] text-[#047857] dark:text-[#6EE7B7] rounded-2xl shadow-inner">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#065F46] dark:text-[#A7F3D0] uppercase tracking-wider">Active Listings</p>
                <h3 className="text-2xl font-black text-[#047857] dark:text-[#6EE7B7]">{subStats.activeSubscriptions}</h3>
              </div>
            </div>

            <div className="p-5 rounded-2xl border bg-[#FFFBEB] dark:bg-[#451A03]/60 border-[#FDE68A] dark:border-[#78350F] flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="p-3 bg-[#FEF3C7] dark:bg-[#92400E] text-[#B45309] dark:text-[#FDE68A] rounded-2xl shadow-inner">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#78350F] dark:text-[#FDE68A] uppercase tracking-wider">Expiring Soon (&lt;7d)</p>
                <h3 className="text-2xl font-black text-[#B45309] dark:text-[#FEF3C7]">{subStats.expiringSoon}</h3>
              </div>
            </div>

            <div className="p-5 rounded-2xl border bg-[#FFE4E6] dark:bg-[#4C0519]/60 border-[#FECDD3] dark:border-[#881337] flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="p-3 bg-[#FECDD3] dark:bg-[#9F1239] text-[#BE123C] dark:text-[#FECDD3] rounded-2xl shadow-inner">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#881337] dark:text-[#FECDD3] uppercase tracking-wider">Expired / Inactive</p>
                <h3 className="text-2xl font-black text-[#BE123C] dark:text-[#FFE4E6]">{subStats.unsubscribedOrExpired}</h3>
              </div>
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="glass-card rounded-2xl overflow-hidden border">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">Property Listing Subscriptions</h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Annual subscriptions grant active listing rights and search visibility.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#E06D53] text-white shadow-md">
                  <tr>
                    <th className="p-4 text-xs font-extrabold text-white uppercase">Property</th>
                    <th className="p-4 text-xs font-extrabold text-white uppercase">Location</th>
                    <th className="p-4 text-xs font-extrabold text-white uppercase">Status</th>
                    <th className="p-4 text-xs font-extrabold text-white uppercase">Days Left</th>
                    <th className="p-4 text-xs font-extrabold text-white uppercase">Expiry Date</th>
                    <th className="p-4 text-xs font-extrabold text-white uppercase text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {subProperties.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">No properties registered yet.</td>
                    </tr>
                  ) : (
                    subProperties.map((p: any) => {
                      const sub = p.subscription;
                      return (
                        <tr key={p.propertyId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="p-4 font-bold text-sm text-[var(--foreground)]">{p.propertyTitle}</td>
                          <td className="p-4 text-xs text-[var(--muted-foreground)]">{p.location}</td>
                          <td className="p-4">
                            <span className={clsx(
                              "px-2.5 py-1 rounded-full text-xs font-bold uppercase",
                              sub?.isActive ? (sub.needsRenewalSoon ? "bg-amber-100 text-amber-700 animate-pulse" : "bg-emerald-100 text-emerald-700") : "bg-red-100 text-red-700"
                            )}>
                              {sub?.isActive ? (sub.needsRenewalSoon ? "Expiring Soon" : "Active") : "Expired"}
                            </span>
                          </td>
                          <td className="p-4 text-xs font-black">
                            {sub?.isActive ? `${sub.daysLeft} days` : '0 days'}
                          </td>
                          <td className="p-4 text-xs text-[var(--muted-foreground)]">
                            {sub?.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => renewSubMutation.mutate(p.propertyId)}
                              disabled={renewSubMutation.isPending}
                              className={clsx(
                                "px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-sm",
                                sub?.needsRenewalSoon || !sub?.isActive
                                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              )}
                            >
                              {renewSubMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                              {sub?.isActive ? "Extend License" : "Renew Listing (GHS 100)"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* ─── TAB 4: FINANCIAL EARNINGS & REVENUE REPORT ───────────────────────────── */}
      {activeTab === 'financials' && (
        <div className="animate-in space-y-6">
          {isLoadingEarnings ? (
            <div className="glass-card rounded-2xl p-6 space-y-4 border border-[var(--border)]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
                ))}
              </div>
              <div className="h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
              {[1,2,3].map(i => (
                <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse w-full" />
              ))}
            </div>
          ) : (
          <>
          {/* Action Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-bold">Landlord Financial Earnings Statement</h3>
              <p className="text-xs text-[var(--muted-foreground)]">Net yield tracking &amp; GRA official rental tax filing.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadGRATaxPDF}
                className="px-3.5 py-2 bg-[#064E3B] hover:bg-[#047857] text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-300" /> GRA Tax PDF
              </button>
              <button
                onClick={handleDownloadGRATaxCSV}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" /> GRA Tax CSV
              </button>
              <button
                onClick={() => setShowWithdrawalModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <DollarSign className="w-4 h-4" /> Request Withdrawal
              </button>
            </div>
          </div>

          {/* Earnings Breakdown Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl border bg-[#ECFDF5] dark:bg-[#064E3B]/60 border-[#A7F3D0] dark:border-[#065F46] flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="p-3 bg-[#D1FAE5] dark:bg-[#047857] text-[#047857] dark:text-[#6EE7B7] rounded-2xl shadow-inner">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#065F46] dark:text-[#A7F3D0] uppercase tracking-wider">Gross Tenant Revenue</p>
                <h3 className="text-2xl font-black text-[#047857] dark:text-[#6EE7B7]">
                  GHS {earningsSummary.totalGrossEarnings.toLocaleString()}
                </h3>
              </div>
            </div>

            <div className="p-5 rounded-2xl border bg-[#EEF2FF] dark:bg-[#1E1B4B]/60 border-[#C7D2FE] dark:border-[#3730A3] flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="p-3 bg-[#E0E7FF] dark:bg-[#312E81] text-[#4338CA] dark:text-[#A5B4FC] rounded-2xl shadow-inner">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#3730A3] dark:text-[#C7D2FE] uppercase tracking-wider">
                  Platform Commission ({earningsSummary.platformCommissionPercent}%)
                </p>
                <h3 className="text-2xl font-black text-[#4338CA] dark:text-[#E0E7FF]">
                  - GHS {earningsSummary.totalCommissionDeducted.toLocaleString()}
                </h3>
              </div>
            </div>

            <div className="p-5 rounded-2xl border bg-[#CCFBF1] dark:bg-[#134E4A]/70 border-[#5EEAD4] dark:border-[#115E59] flex items-center gap-4 shadow-md transition-all">
              <div className="p-3 bg-[#0D9488] text-white rounded-2xl shadow-md shadow-[#0D9488]/30">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#115E59] dark:text-[#99F6E4] uppercase tracking-wider">Net Landlord Earnings</p>
                <h3 className="text-2xl font-black text-[#0F766E] dark:text-[#CCFBF1]">
                  GHS {earningsSummary.totalNetEarnings.toLocaleString()}
                </h3>
              </div>
            </div>

            <div className="p-5 rounded-2xl border bg-[#E0F2FE] dark:bg-[#0C4A6E]/60 border-[#BAE6FD] dark:border-[#075985] flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="p-3 bg-[#BAE6FD] dark:bg-[#0284C7] text-[#0369A1] dark:text-[#BAE6FD] rounded-2xl shadow-inner">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-extrabold text-[#075985] dark:text-[#BAE6FD] uppercase tracking-wider">This Month Net Payout</p>
                <h3 className="text-2xl font-black text-[#0369A1] dark:text-[#E0F2FE]">
                  GHS {earningsSummary.thisMonthNetEarnings.toLocaleString()}
                </h3>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="glass-card p-6 rounded-2xl border">
            <h3 className="text-lg font-bold mb-6">Gross vs. Net Monthly Revenue Trend</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `GHS ${value}`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    formatter={(value: any, name: any) => [
                      `GHS ${Number(value).toLocaleString()}`, 
                      name === 'gross' ? 'Gross Revenue' : 'Net Payout'
                    ]}
                  />
                  <Legend wrapperStyle={{ paddingTop: 10 }} />
                  <Bar dataKey="gross" name="Gross Revenue" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={25} />
                  <Bar dataKey="net" name="Net Payout (After 5%)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Transaction Ledger */}
          <div className="glass-card rounded-2xl overflow-hidden border">
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-lg font-bold">Transaction & Payout Ledger</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#E06D53] text-white shadow-md">
                  <tr>
                    <th className="p-4 text-xs font-extrabold text-white uppercase">Date</th>
                    <th className="p-4 text-xs font-extrabold text-white uppercase">Tenant</th>
                    <th className="p-4 text-xs font-extrabold text-white uppercase">Property &amp; Room</th>
                    <th className="p-4 text-xs font-extrabold text-white uppercase">Gross Paid</th>
                    <th className="p-4 text-xs font-extrabold text-white uppercase">Commission ({earningsSummary.platformCommissionPercent}%)</th>
                    <th className="p-4 text-xs font-extrabold text-white uppercase text-right">Net Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {cashflows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[var(--muted-foreground)]">
                        No transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    cashflows.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-4 text-xs font-medium">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-xs text-[var(--foreground)]">{tx.tenantName}</div>
                          <div className="text-[10px] font-mono text-slate-400">{tx.reference}</div>
                        </td>
                        <td className="p-4 text-xs">
                          <div className="font-bold">{tx.propertyTitle}</div>
                          <div className="text-[10px] text-slate-400">{tx.roomType}</div>
                        </td>
                        <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                          GHS {tx.grossAmount.toLocaleString()}
                        </td>
                        <td className="p-4 text-xs font-bold text-red-500">
                          - GHS {tx.commissionFee.toLocaleString()}
                        </td>
                        <td className="p-4 text-right font-black text-emerald-600">
                          GHS {tx.netAmount.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}
        </div>
      )}

      {/* ─── TAB: FLOORPLAN & BED OCCUPANCY MATRIX ────────────────────────────────── */}
      {activeTab === 'occupancy' && (
        <div>
          <FloorplanOccupancyTab properties={myProperties} />
        </div>
      )}

      {/* ─── TAB: COMPOUND NOTICE BOARD ───────────────────────────────────────────── */}
      {activeTab === 'notices' && (
        <div>
          <CompoundNoticeTab properties={myProperties} />
        </div>
      )}

      {/* ─── TAB: OPERATING EXPENSES & P&L ────────────────────────────────────────── */}
      {activeTab === 'expenses' && (
        <div>
          <ExpenseTrackerTab properties={myProperties} />
        </div>
      )}

      {/* ─── TAB: STAFF & CARETAKER DELEGATION ────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <div>
          <StaffDelegationTab properties={myProperties} />
        </div>
      )}

      {/* ── Move-In / Move-Out Inspection Modal ── */}
      {selectedInspectionBooking && (
        <InspectionModal
          booking={selectedInspectionBooking}
          isOpen={Boolean(selectedInspectionBooking)}
          onClose={() => setSelectedInspectionBooking(null)}
        />
      )}

      {/* ── Withdrawal Modal ── */}
      {showWithdrawalModal && (
        <WithdrawalModal onClose={() => setShowWithdrawalModal(false)} />
      )}

      {/* ── Ticket Action & Resolution Modal ── */}
      {ticketActionModal.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md transition-all">
          <div className="w-full max-w-lg bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-md",
                  ticketActionModal.mode === 'SCHEDULE' ? "bg-indigo-600 shadow-indigo-600/30" : "bg-emerald-600 shadow-emerald-600/30"
                )}>
                  {ticketActionModal.mode === 'SCHEDULE' ? '📅' : '🛠️'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {ticketActionModal.mode === 'SCHEDULE' ? 'Schedule Maintenance' : 'Complete & Resolve Ticket'}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{ticketActionModal.ticketTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setTicketActionModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              {ticketActionModal.mode === 'SCHEDULE' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Estimated Repair Date
                  </label>
                  <input
                    type="date"
                    value={ticketActionModal.scheduledDate}
                    onChange={(e) => setTicketActionModal(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Repair Expenditure (GHS)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={ticketActionModal.repairCost}
                        onChange={(e) => setTicketActionModal(prev => ({ ...prev, repairCost: e.target.value }))}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Proof Photo URL (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={ticketActionModal.completionImageUrl}
                        onChange={(e) => setTicketActionModal(prev => ({ ...prev, completionImageUrl: e.target.value }))}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Resolution Summary / Work Done
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Replaced leaking valve and sealed sink pipes."
                      value={ticketActionModal.resolutionNotes}
                      onChange={(e) => setTicketActionModal(prev => ({ ...prev, resolutionNotes: e.target.value }))}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTicketActionModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
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
                  "px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition shadow-lg",
                  ticketActionModal.mode === 'SCHEDULE' 
                    ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30" 
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
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
