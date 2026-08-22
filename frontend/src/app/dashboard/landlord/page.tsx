'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Users, Mail, Phone, Calendar, Check, X, ShieldAlert, ShieldCheck, CreditCard, Star, PenTool, CheckCircle, Clock, FileSignature, Building, Activity, DollarSign } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function LandlordDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'bookings' | 'tickets' | 'financials'>('bookings');
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

  // Fetch Landlord Stats
  const { data: statsResponse, isLoading: isLoadingStats } = useQuery({
    queryKey: ['landlord', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/properties/landlord/stats');
      return data;
    }
  });

  // Fetch Cashflows & Transactions
  const { data: cashflowsResponse, isLoading: isLoadingCashflows } = useQuery({
    queryKey: ['transactions', 'landlord'],
    queryFn: async () => {
      const { data } = await api.get('/transactions/landlord');
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
      queryClient.invalidateQueries({ queryKey: ['bookings', 'landlord'] });
    },
    onSettled: () => {
      setProcessingId(null);
    }
  });

  // Ticket Status Mutation
  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { data } = await api.patch(`/tickets/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'landlord'] });
    },
    onSettled: () => {
      setProcessingId(null);
    }
  });
  const handleStatusUpdate = (id: string, status: string) => {
    setProcessingId(id);
    updateStatusMutation.mutate({ id, status });
  };

  const handleTicketUpdate = (id: string, status: string) => {
    setProcessingId(id);
    updateTicketMutation.mutate({ id, status });
  };

  if (isLoadingBookings || isLoadingTickets || isLoadingStats || isLoadingCashflows) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;
  }

  if (error) {
    return <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100">Failed to load dashboard data.</div>;
  }

  const bookings = bookingsResponse?.bookings || [];
  const tickets = ticketsResponse?.tickets || [];
  const cashflows = cashflowsResponse || { totalRevenue: 0, chartData: [], transactions: [] };

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">Landlord Dashboard</h1>
          <p className="text-[var(--muted-foreground)]">Manage incoming tenant requests and property maintenance tickets.</p>
        </div>
        <Link 
          href="/dashboard/landlord/subscription" 
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-[var(--primary)] rounded-xl font-bold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors border border-[var(--primary)]/20 shadow-sm"
        >
          <CreditCard className="w-5 h-5" /> Manage Subscriptions
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('bookings')}
          className={clsx(
            "px-6 py-2.5 text-sm font-bold rounded-lg transition-all",
            activeTab === 'bookings' 
              ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          Booking Requests
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={clsx(
            "px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
            activeTab === 'tickets' 
              ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          Maintenance Tickets {tickets.filter((t:any) => t.status === 'PENDING').length > 0 && (
            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs">{tickets.filter((t:any) => t.status === 'PENDING').length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('financials')}
          className={clsx(
            "px-6 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center gap-2",
            activeTab === 'financials' 
              ? "bg-white dark:bg-slate-800 text-[var(--primary)] shadow-sm" 
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          Financials
        </button>
      </div>

      {activeTab === 'bookings' && (
        <div className="animate-in">
          {bookings.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-[var(--muted-foreground)]" />
              </div>
              <h3 className="text-lg font-bold">No requests yet</h3>
              <p className="text-[var(--muted-foreground)]">When tenants book your properties, they will appear here.</p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden border">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                      <th className="p-4 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Tenant</th>
                      <th className="p-4 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Property</th>
                      <th className="p-4 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Dates</th>
                      <th className="p-4 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Status</th>
                      <th className="p-4 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {bookings.map((booking: any) => (
                      <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-[var(--foreground)]">{booking.tenant.firstName} {booking.tenant.lastName}</div>
                          <div className="flex flex-col gap-1 mt-1">
                            <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                              <Star className="w-3 h-3 fill-amber-500" /> Rep: {booking.tenant.reputationScore ? (booking.tenant.reputationScore / 10).toFixed(1) : 'N/A'}/5.0
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
                            booking.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {booking.status === 'PENDING' && (
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => handleStatusUpdate(booking.id, 'APPROVED')}
                                disabled={processingId === booking.id}
                                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                                title="Approve"
                              >
                                {processingId === booking.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                              </button>
                              <button 
                                onClick={() => handleStatusUpdate(booking.id, 'REJECTED')}
                                disabled={processingId === booking.id}
                                className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Reject"
                              >
                                {processingId === booking.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                              </button>
                            </div>
                          )}
                          {(booking.status === 'APPROVED' || booking.status === 'COMPLETED') && (
                            <Link 
                              href={`/dashboard/agreements/${booking.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--primary)] text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity"
                            >
                              <FileSignature className="w-3 h-3" /> Agreement
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

      {activeTab === 'tickets' && (
        <div className="animate-in">
          {tickets.length === 0 ? (
            <div className="glass-card p-12 rounded-2xl text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <PenTool className="w-8 h-8 text-[var(--muted-foreground)]" />
              </div>
              <h3 className="text-lg font-bold">No Maintenance Tickets</h3>
              <p className="text-[var(--muted-foreground)]">Your properties are currently in good shape.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {tickets.map((ticket: any) => (
                <div key={ticket.id} className={`glass-card p-5 rounded-xl border flex flex-col sm:flex-row justify-between gap-4 ${ticket.status === 'PENDING' ? 'border-l-4 border-l-amber-500' : ''}`}>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-lg">{ticket.title}</h3>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${ticket.priority === 'URGENT' ? 'bg-red-100 text-red-700' : ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' : ticket.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] mb-3">{ticket.description}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
                      <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{ticket.property.title}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {ticket.tenant.firstName} {ticket.tenant.lastName}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    {/* Display Current Status */}
                    <div className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border">
                      {ticket.status.replace('_', ' ')}
                    </div>
                    
                    {/* Action Buttons */}
                    {ticket.status !== 'RESOLVED' && (
                      <div className="flex gap-2">
                        {ticket.status === 'PENDING' && (
                          <button 
                            onClick={() => handleTicketUpdate(ticket.id, 'IN_PROGRESS')}
                            disabled={processingId === ticket.id}
                            className="text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                          >
                            {processingId === ticket.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenTool className="w-3 h-3" />} Start Work
                          </button>
                        )}
                        <button 
                          onClick={() => handleTicketUpdate(ticket.id, 'RESOLVED')}
                          disabled={processingId === ticket.id}
                          className="text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
                        >
                          {processingId === ticket.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Mark Resolved
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'financials' && (
        <div className="animate-in space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-6 rounded-2xl border flex items-center gap-4">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-xl">
                <DollarSign className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--muted-foreground)]">Total Revenue</p>
                <h3 className="text-2xl font-bold">GHS {cashflows.totalRevenue.toLocaleString()}</h3>
              </div>
            </div>
            <div className="glass-card p-6 rounded-2xl border flex items-center gap-4">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-xl">
                <Activity className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--muted-foreground)]">Total Transactions</p>
                <h3 className="text-2xl font-bold">{cashflows.transactions.length}</h3>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="glass-card p-6 rounded-2xl border">
            <h3 className="text-lg font-bold mb-6">Monthly Revenue</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashflows.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `GHS ${value}`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                    formatter={(value: any) => [`GHS ${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Transaction Ledger */}
          <div className="glass-card rounded-2xl overflow-hidden border">
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-lg font-bold">Transaction Ledger</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b">
                    <th className="p-4 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Date</th>
                    <th className="p-4 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Tenant</th>
                    <th className="p-4 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Property</th>
                    <th className="p-4 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Reference</th>
                    <th className="p-4 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {cashflows.transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[var(--muted-foreground)]">No transactions recorded yet.</td>
                    </tr>
                  ) : (
                    cashflows.transactions.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-4 text-sm font-medium">{new Date(tx.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          <div className="font-bold text-[var(--foreground)]">{tx.tenant.firstName} {tx.tenant.lastName}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">{tx.tenant.email}</div>
                        </td>
                        <td className="p-4 text-sm">{tx.property.title}</td>
                        <td className="p-4 text-xs font-mono text-slate-500">{tx.reference}</td>
                        <td className="p-4 text-right font-bold text-emerald-600">GHS {tx.amount.toLocaleString()}</td>
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
