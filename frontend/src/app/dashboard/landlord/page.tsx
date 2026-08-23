'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, Users, Mail, Phone, Calendar, Check, X, ShieldAlert, ShieldCheck, 
  CreditCard, Star, PenTool, CheckCircle, Clock, FileSignature, Building, 
  Activity, DollarSign, AlertTriangle, ArrowUpRight, Printer, RefreshCw, Layers
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import toast from 'react-hot-toast';

export default function LandlordDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'bookings' | 'tickets' | 'subscriptions' | 'financials'>('bookings');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch Bookings
  const { data: bookingsResponse, isLoading: isLoadingBookings, error } = useQuery({
    queryKey: ['bookings', 'landlord'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/landlord');
      return data;
    }
  });

  // Fetch Tickets
  const { data: ticketsResponse, isLoading: isLoadingTickets } = useQuery({
    queryKey: ['tickets', 'landlord'],
    queryFn: async () => {
      const { data } = await api.get('/tickets/landlord');
      return data;
    }
  });

  // Fetch Subscriptions Overview
  const { data: subOverviewResponse, isLoading: isLoadingSubs } = useQuery({
    queryKey: ['subscriptions', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/subscriptions/overview');
      return data;
    }
  });

  // Fetch Detailed Earnings Report
  const { data: earningsReport, isLoading: isLoadingEarnings } = useQuery({
    queryKey: ['transactions', 'landlord', 'report'],
    queryFn: async () => {
      const { data } = await api.get('/transactions/landlord/report');
      return data;
    }
  });

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

  if (isLoadingBookings || isLoadingTickets || isLoadingSubs || isLoadingEarnings) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100">
        Failed to load dashboard data.
      </div>
    );
  }

  const bookings = bookingsResponse?.bookings || [];
  const tickets = ticketsResponse?.tickets || [];
  const subStats = subOverviewResponse?.stats || { totalProperties: 0, activeSubscriptions: 0, expiringSoon: 0, unsubscribedOrExpired: 0 };
  const subProperties = subOverviewResponse?.properties || [];
  const earningsSummary = earningsReport?.summary || { totalGrossEarnings: 0, totalCommissionDeducted: 0, totalNetEarnings: 0, thisMonthNetEarnings: 0, platformCommissionPercent: 5 };
  const monthlyTrends = earningsReport?.monthlyTrends || [];
  const cashflows = earningsReport?.recentCashflows || [];

  return (
    <div className="space-y-8 animate-in pb-12">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            Landlord CRM Command Center
          </h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            Manage booking requests, tenant support tickets, listing subscriptions, and earnings reports.
          </p>
        </div>

        {/* Expiring Soon Alert Badge */}
        {subStats.expiringSoon > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold animate-pulse">
            <AlertTriangle className="w-4 h-4" />
            <span>{subStats.expiringSoon} property subscription(s) expiring within 7 days!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit flex-wrap gap-1">
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
      </div>

      {/* ─── TAB 1: BOOKING REQUESTS ──────────────────────────────────────────────── */}
      {activeTab === 'bookings' && (
        <div className="animate-in space-y-4">
          {bookings.length === 0 ? (
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
                            booking.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                            booking.status === 'CONFIRMED' || booking.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {booking.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => { setProcessingId(booking.id); updateStatusMutation.mutate({ id: booking.id, status: 'CONFIRMED' }); }}
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

      {/* ─── TAB 2: MAINTENANCE TICKETS ───────────────────────────────────────────── */}
      {activeTab === 'tickets' && (
        <div className="animate-in space-y-4">
          {tickets.length === 0 ? (
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
          
          {/* Subscription Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border flex items-center gap-4">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl dark:bg-indigo-950/50">
                <Building className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--muted-foreground)]">Total Properties</p>
                <h3 className="text-2xl font-black">{subStats.totalProperties}</h3>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl dark:bg-emerald-950/50">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--muted-foreground)]">Active Listings</p>
                <h3 className="text-2xl font-black">{subStats.activeSubscriptions}</h3>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border flex items-center gap-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl dark:bg-amber-950/50">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--muted-foreground)]">Expiring Soon (&lt;7d)</p>
                <h3 className="text-2xl font-black text-amber-600">{subStats.expiringSoon}</h3>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border flex items-center gap-4">
              <div className="p-3 bg-red-100 text-red-600 rounded-xl dark:bg-red-950/50">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--muted-foreground)]">Expired / Inactive</p>
                <h3 className="text-2xl font-black text-red-600">{subStats.unsubscribedOrExpired}</h3>
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
        </div>
      )}

      {/* ─── TAB 4: FINANCIAL EARNINGS & REVENUE REPORT ───────────────────────────── */}
      {activeTab === 'financials' && (
        <div className="animate-in space-y-6">
          
          {/* Action Header */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Landlord Financial Earnings Statement</h3>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4" /> Print / Export Statement
            </button>
          </div>

          {/* Earnings Breakdown Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl dark:bg-emerald-950/50">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--muted-foreground)]">Gross Tenant Revenue</p>
                <h3 className="text-2xl font-black text-emerald-600">
                  GHS {earningsSummary.totalGrossEarnings.toLocaleString()}
                </h3>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border flex items-center gap-4">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl dark:bg-indigo-950/50">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--muted-foreground)]">
                  Platform Commission ({earningsSummary.platformCommissionPercent}%)
                </p>
                <h3 className="text-2xl font-black text-indigo-600">
                  - GHS {earningsSummary.totalCommissionDeducted.toLocaleString()}
                </h3>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border flex items-center gap-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
              <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--muted-foreground)]">Net Landlord Earnings</p>
                <h3 className="text-2xl font-black text-emerald-500">
                  GHS {earningsSummary.totalNetEarnings.toLocaleString()}
                </h3>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border flex items-center gap-4">
              <div className="p-3 bg-sky-100 text-sky-600 rounded-xl dark:bg-sky-950/50">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--muted-foreground)]">This Month Net Payout</p>
                <h3 className="text-2xl font-black text-sky-600">
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

        </div>
      )}

    </div>
  );
}
