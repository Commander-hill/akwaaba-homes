'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, Users, Mail, Phone, Calendar, Check, X, ShieldAlert, ShieldCheck, 
  CreditCard, Star, PenTool, CheckCircle, Clock, FileSignature, Building, 
  Activity, DollarSign, AlertTriangle, ArrowUpRight, Printer, RefreshCw, Layers, MessageSquare
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import OnboardingProgressWidget from '@/components/OnboardingProgressWidget';
import OnboardingTour from '@/components/OnboardingTour';
import MessagingTab from '@/components/MessagingTab';
import WithdrawalModal from '@/components/WithdrawalModal';
import toast from 'react-hot-toast';

export default function LandlordDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'bookings' | 'tickets' | 'subscriptions' | 'financials' | 'messages' | 'agreements'>('bookings');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

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
    enabled: activeTab === 'agreements'
  });

  // Fetch Tickets — only loads when tickets tab is open
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
    enabled: activeTab === 'tickets'
  });

  // Fetch Subscriptions Overview — only loads when subscriptions tab is open
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
    enabled: activeTab === 'subscriptions'
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

  const handleRefreshAll = () => {
    refetchBookings();
    if (activeTab === 'agreements') refetchAgreements();
    if (activeTab === 'tickets') refetchTickets();
    if (activeTab === 'subscriptions') refetchSubs();
    if (activeTab === 'financials') refetchEarnings();
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
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { data } = await api.patch(`/tickets/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      toast.success('Ticket updated!');
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
    <div className="space-y-8 animate-in pb-12">
      <OnboardingProgressWidget 
        user={session} 
        hasProperty={Boolean(session?.hasProperty || session?._count?.properties > 0 || subStats.totalProperties > 0 || subProperties.length > 0)} 
      />
      
      {/* Header Banner */}
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
            "px-5 py-2.5 text-sm font-bold rounded-lg transition-all",
            activeTab === 'bookings' 
              ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          Booking Requests ({bookings.length})
        </button>

        <button
          onClick={() => setActiveTab('agreements')}
          className={clsx(
            "px-5 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
            activeTab === 'agreements' 
              ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          <FileSignature className="w-4 h-4 text-purple-500" />
          Lease Vault ({agreements.length})
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={clsx(
            "px-5 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
            activeTab === 'tickets' 
              ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          Maintenance Tickets {tickets.filter((t:any) => t.status === 'PENDING').length > 0 && (
            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">
              {tickets.filter((t:any) => t.status === 'PENDING').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('subscriptions')}
          className={clsx(
            "px-5 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
            activeTab === 'subscriptions' 
              ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          <CreditCard className="w-4 h-4" />
          Listing Subscriptions {subStats.expiringSoon > 0 && (
            <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-xs">
              {subStats.expiringSoon} Expiration Soon
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('financials')}
          className={clsx(
            "px-5 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
            activeTab === 'financials' 
              ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          <DollarSign className="w-4 h-4" />
          Earnings & Revenue
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={clsx(
            "px-5 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
            activeTab === 'messages' 
              ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          <MessageSquare className="w-4 h-4 text-indigo-500" />
          Direct Messages
        </button>
      </div>

      {activeTab === 'messages' && (
        <div className="animate-in">
          <MessagingTab />
        </div>
      )}

      {/* ─── TAB 1: BOOKING REQUESTS ──────────────────────────────────────────────── */}
      {activeTab === 'bookings' && (
        <div className="animate-in space-y-4">
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
                            <Link
                              href={`/dashboard/agreements/${booking.id}`}
                              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md shadow-indigo-500/20"
                            >
                              <FileSignature className="w-3.5 h-3.5" /> View & Sign Agreement
                            </Link>
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
              {tickets.map((t: any) => (
                <div key={t.id} className="glass-card p-5 rounded-2xl border space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black uppercase text-indigo-500">{t.property?.title}</span>
                      <h4 className="font-bold text-base text-[var(--foreground)]">{t.title}</h4>
                    </div>
                    <span className={clsx(
                      "px-2.5 py-1 rounded-full text-xs font-bold uppercase",
                      t.status === 'PENDING' ? "bg-amber-100 text-amber-700" :
                      t.status === 'IN_PROGRESS' ? "bg-blue-100 text-blue-700" :
                      "bg-emerald-100 text-emerald-700"
                    )}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">{t.description}</p>
                  <div className="flex justify-between items-center pt-2 border-t text-xs">
                    <span className="text-slate-400">Filed: {new Date(t.createdAt).toLocaleDateString()}</span>
                    <div className="flex gap-2">
                      {t.status !== 'RESOLVED' && (
                        <button
                          onClick={() => updateTicketMutation.mutate({ id: t.id, status: 'RESOLVED' })}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Landlord Financial Earnings Statement</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowWithdrawalModal(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20"
              >
                <DollarSign className="w-4 h-4" /> Request Withdrawal
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
              >
                <Printer className="w-4 h-4" /> Print Statement
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

    </div>

    {/* ── Withdrawal Modal ── */}
    {showWithdrawalModal && (
      <WithdrawalModal onClose={() => setShowWithdrawalModal(false)} />
    )}
  );
}
