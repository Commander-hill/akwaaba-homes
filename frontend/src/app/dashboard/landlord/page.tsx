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
  const [activeTab, setActiveTab] = useState<'bookings' | 'tickets'>('bookings');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Fetch Subscriptions
  const { data: subResponse, isLoading: isLoadingSub } = useQuery({
    queryKey: ['subscriptions', 'status'],
    queryFn: async () => {
      const { data } = await api.get('/subscriptions/status');
      return data;
    }
  });

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
    },
    enabled: !!subResponse?.isActive
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

  // Real Paystack Payment Mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/subscriptions/initialize');
      return data;
    },
    onSuccess: (data) => {
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to initialize payment');
    },
    onSettled: () => {
      setIsSubscribing(false);
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

  const handlePayment = () => {
    setIsSubscribing(true);
    subscribeMutation.mutate();
  };

  if (isLoadingBookings || isLoadingSub || isLoadingTickets || isLoadingStats) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;
  }

  if (error) {
    return <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100">Failed to load dashboard data.</div>;
  }

  const bookings = bookingsResponse?.bookings || [];
  const tickets = ticketsResponse?.tickets || [];
  const hasActiveSub = subResponse?.isActive;

  return (
    <div className="space-y-8 animate-in">
      {/* SUBSCRIPTION BANNER */}
      {!hasActiveSub ? (
        <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-full shrink-0">
              <ShieldAlert className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Subscription Inactive</h2>
              <p className="text-red-100 text-sm mt-1">You must have an active subscription to list properties and accept new tenants.</p>
            </div>
          </div>
          <button 
            onClick={handlePayment}
            disabled={isSubscribing}
            className="shrink-0 flex items-center justify-center gap-2 bg-white text-red-600 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-red-50 transition-colors w-full sm:w-auto disabled:opacity-70"
          >
            {isSubscribing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
            {isSubscribing ? 'Initializing...' : 'Subscribe Now (GHS 500)'}
          </button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-full shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">Premium Active <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">PRO</span></h2>
            <p className="text-emerald-100 text-sm mt-0.5">Your subscription is active until {new Date(subResponse.endDate).toLocaleDateString()}.</p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">Landlord Dashboard</h1>
        <p className="text-[var(--muted-foreground)]">Manage incoming tenant requests and property maintenance tickets.</p>
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
    </div>
  );
}
