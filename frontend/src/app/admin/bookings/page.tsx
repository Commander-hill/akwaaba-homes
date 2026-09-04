'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import Link from 'next/link';
import { 
  Loader2, 
  CalendarCheck, 
  Home, 
  Search, 
  Filter, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  CheckCircle, 
  Clock, 
  XCircle, 
  ShieldCheck, 
  FileText, 
  Eye, 
  ExternalLink, 
  X, 
  Banknote, 
  CreditCard, 
  AlertCircle,
  ArrowUpRight,
  Receipt,
  BadgeCheck,
  DoorClosed
} from 'lucide-react';

type BookingStatusFilter = 'ALL' | 'COMPLETED' | 'CONFIRMED' | 'PENDING' | 'CANCELLED';

// Helper to format currency
const formatGhc = (amount: number | null | undefined) => {
  return `GH₵ ${Number(amount || 0).toLocaleString()}`;
};

// Helper to calculate lease duration in months/days
const formatLeaseDuration = (startDate: string, endDate: string) => {
  if (!startDate || !endDate) return 'N/A';
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays >= 360 && diffDays <= 370) return '1 Year / 12 Mos';
  if (diffDays >= 180 && diffDays <= 185) return '6 Months';
  if (diffDays >= 90 && diffDays <= 93) return '3 Months';
  
  const months = Math.round(diffDays / 30.4);
  if (months > 0) return `${months} Months (${diffDays} days)`;
  return `${diffDays} Days`;
};

export default function AdminBookingsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>('ALL');
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const res = await api.get('/admin/bookings');
      return res.data;
    }
  });

  // KPI Calculations
  const stats = useMemo(() => {
    if (!bookings || !Array.isArray(bookings)) {
      return { total: 0, escrowVolume: 0, completed: 0, pending: 0, cancelled: 0 };
    }
    const total = bookings.length;
    let escrowVolume = 0;
    let completed = 0;
    let pending = 0;
    let cancelled = 0;

    bookings.forEach((b: any) => {
      const amount = b.transaction?.amount || b.property?.price || 0;
      if (b.status === 'COMPLETED' || b.status === 'CONFIRMED') {
        escrowVolume += amount;
        completed++;
      } else if (b.status === 'PENDING') {
        pending++;
      } else if (b.status === 'CANCELLED' || b.status === 'REJECTED') {
        cancelled++;
      }
    });

    return { total, escrowVolume, completed, pending, cancelled };
  }, [bookings]);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    if (!bookings || !Array.isArray(bookings)) return [];

    return bookings.filter((b: any) => {
      // Status Filter
      if (statusFilter === 'COMPLETED' && b.status !== 'COMPLETED' && b.status !== 'CONFIRMED') return false;
      if (statusFilter === 'PENDING' && b.status !== 'PENDING') return false;
      if (statusFilter === 'CANCELLED' && b.status !== 'CANCELLED' && b.status !== 'REJECTED') return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const propTitle = (b.property?.title || '').toLowerCase();
        const propLoc = (b.property?.location || '').toLowerCase();
        const tenantName = `${b.tenant?.firstName || ''} ${b.tenant?.lastName || ''}`.toLowerCase();
        const tenantEmail = (b.tenant?.email || '').toLowerCase();
        const landlordName = `${b.property?.landlord?.firstName || ''} ${b.property?.landlord?.lastName || ''}`.toLowerCase();
        const landlordEmail = (b.property?.landlord?.email || '').toLowerCase();
        const ref = (b.transaction?.reference || '').toLowerCase();

        return (
          propTitle.includes(q) ||
          propLoc.includes(q) ||
          tenantName.includes(q) ||
          tenantEmail.includes(q) ||
          landlordName.includes(q) ||
          landlordEmail.includes(q) ||
          ref.includes(q)
        );
      }

      return true;
    });
  }, [bookings, statusFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-[#0F5132]" />
        <p className="text-sm font-semibold text-slate-500">Loading tenancy & escrow registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-in">
      {/* ─── HEADER CONTAINER ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              Act 220 Tenancy Monitor
            </span>
            <span className="text-xs font-semibold text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {stats.total} Total Bookings
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Residential Bookings & Escrow Monitor
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            System-wide registry of active leases, advance rent escrow deposits, Act 220 tenancy deeds, and landlord-tenant fulfillments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#0F5132]/10 text-[#0F5132] dark:bg-emerald-950/50 dark:text-emerald-400 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs">
            <CalendarCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ─── 4-CARD EXECUTIVE ESCROW & BOOKING STRIP ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Bookings */}
        <div 
          onClick={() => setStatusFilter('ALL')}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Bookings</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:bg-[#0F5132] group-hover:text-white transition-colors">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {stats.total}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Across residential apartments, houses & studios
          </p>
        </div>

        {/* Gross Escrow Volume */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gross Escrow Volume</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#0F5132] dark:text-emerald-400 mb-1">
            {formatGhc(stats.escrowVolume)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total verified rental payments processed
          </p>
        </div>

        {/* Active Tenancies */}
        <div 
          onClick={() => setStatusFilter('COMPLETED')}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Leases</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {stats.completed}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Confirmed move-ins under Act 220
          </p>
        </div>

        {/* Pending Fulfillment */}
        <div 
          onClick={() => setStatusFilter('PENDING')}
          className={`cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all shadow-xs group ${
            stats.pending > 0 
              ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/10 hover:border-amber-400' 
              : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Fulfillment</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              stats.pending > 0 ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.pending}
            </div>
            {stats.pending > 0 && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                Action Req
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.pending === 0 ? 'No pending move-ins' : 'Awaiting confirmation or settlement'}
          </p>
        </div>
      </div>

      {/* ─── SEARCH & FILTER CONTROLS ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by property, tenant, landlord, or transaction ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5132] dark:focus:ring-emerald-500 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Count */}
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredBookings.length}</strong> of {stats.total} bookings
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'ALL'
                ? 'bg-[#0F5132] text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            All Bookings ({stats.total})
          </button>

          <button
            onClick={() => setStatusFilter('COMPLETED')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'COMPLETED'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Active & Confirmed ({stats.completed})
          </button>

          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Pending Fulfillment ({stats.pending})
            {stats.pending > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setStatusFilter('CANCELLED')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'CANCELLED'
                ? 'bg-red-700 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Cancelled ({stats.cancelled})
          </button>
        </div>
      </div>

      {/* ─── INSTITUTIONAL BOOKINGS TABLE ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-[#0F5132] text-white shadow-xs">
              <tr>
                <th className="px-6 py-4 font-black tracking-wider text-white">Property & Unit</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Landlord</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Tenant</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Lease Period</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Escrow Rent</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Act 220 Deed</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Status</th>
                <th className="px-6 py-4 font-black tracking-wider text-white text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-bold text-sm">No bookings found matching your filters.</p>
                    <button 
                      onClick={() => { setStatusFilter('ALL'); setSearchQuery(''); }}
                      className="mt-2 text-xs font-bold text-[#0F5132] hover:underline"
                    >
                      Clear search filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking: any) => {
                  const property = booking.property;
                  const tenant = booking.tenant;
                  const landlord = property?.landlord;
                  const rentAmount = booking.transaction?.amount || property?.price || 0;
                  const hasDeed = Boolean(booking.leaseAgreement);
                  const isDeedCompleted = booking.leaseAgreement?.status === 'COMPLETED';

                  return (
                    <tr key={booking.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Property & Unit */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Home className="w-3.5 h-3.5 text-[#0F5132] shrink-0" />
                            <span className="truncate max-w-[200px]">{property?.title || 'Untitled Property'}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            {booking.roomUnit && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-[11px] text-slate-700 dark:text-slate-300">
                                <DoorClosed className="w-3 h-3 text-slate-400" />
                                {booking.roomUnit.unitNumber}
                              </span>
                            )}
                            <span className="truncate max-w-[180px]">{property?.location || 'Location not specified'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Landlord */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Unknown Host'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {landlord?.email}
                          </div>
                        </div>
                      </td>

                      {/* Tenant */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Unknown Tenant'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                            {tenant?.email}
                          </div>
                        </div>
                      </td>

                      {/* Lease Period & Duration */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#0F5132]" />
                            {new Date(booking.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            <span className="text-slate-400 font-normal">→</span>
                            {new Date(booking.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                          <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {formatLeaseDuration(booking.startDate, booking.endDate)}
                          </span>
                        </div>
                      </td>

                      {/* Escrow Rent */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-black text-sm text-[#0F5132] dark:text-emerald-400">
                            {formatGhc(rentAmount)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase">
                            {booking.transaction ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                <CreditCard className="w-2.5 h-2.5" />
                                {booking.transaction.paymentMethod || 'MoMo / Card'}
                              </span>
                            ) : (
                              'Escrow Reserved'
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Act 220 Tenancy Deed */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasDeed ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isDeedCompleted 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200' 
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200'
                          }`}>
                            <FileText className="w-3 h-3" />
                            {isDeedCompleted ? 'Act 220 Stamped 📄' : 'Awaiting Signatures'}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 italic">
                            No deed generated
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${
                          booking.status === 'COMPLETED' || booking.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                            : booking.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                            : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/40'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            booking.status === 'COMPLETED' || booking.status === 'CONFIRMED'
                              ? 'bg-emerald-500' 
                              : booking.status === 'PENDING' 
                              ? 'bg-amber-500' 
                              : 'bg-red-500'
                          }`} />
                          {booking.status === 'COMPLETED' ? 'ACTIVE LEASE' : booking.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBooking(booking)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                            title="Audit full booking & escrow details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect
                          </button>

                          {property?.id && (
                            <Link
                              href={`/properties/${property.id}`}
                              target="_blank"
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="View property details"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: DEEP BOOKING & ESCROW AUDIT DRAWER ───────────────────── */}
      {selectedBooking && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-emerald-900/30 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#0F5132] via-[#146c43] to-slate-900 text-white flex justify-between items-center relative overflow-hidden shadow-md">
              <div className="flex items-center gap-3.5 z-10">
                <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 border border-white/10 shadow-inner">
                  <Receipt className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Act 220 Tenancy Record
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/20 text-white">
                      Ref: {selectedBooking.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight mt-0.5 truncate max-w-md">
                    {selectedBooking.property?.title || 'Property Lease Record'}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 z-10">
                {selectedBooking.property?.id && (
                  <Link
                    href={`/properties/${selectedBooking.property.id}`}
                    target="_blank"
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Property
                  </Link>
                )}
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-slate-950/50">
              {/* Financial & Escrow Overview Card */}
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Escrow Financial Settlement
                  </span>
                  <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {selectedBooking.status === 'COMPLETED' ? 'Escrow Held / Settled' : selectedBooking.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-0.5">Gross Rent Deposited</span>
                    <div className="text-2xl font-black text-[#0F5132] dark:text-emerald-400">
                      {formatGhc(selectedBooking.transaction?.amount || selectedBooking.property?.price || 0)}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-0.5">Payment Method</span>
                    <div className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1 mt-1">
                      <CreditCard className="w-4 h-4 text-[#0F5132]" />
                      {selectedBooking.transaction?.paymentMethod || 'Mobile Money / GHIPSS'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-0.5">Transaction Reference</span>
                    <code className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 block truncate">
                      {selectedBooking.transaction?.reference || `TXN-${selectedBooking.id.slice(0, 10)}`}
                    </code>
                  </div>
                </div>
              </div>

              {/* Counterparties: Tenant & Landlord */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tenant Information */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tenant (Lessee)</span>
                    <User className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="font-extrabold text-base text-slate-900 dark:text-white">
                    {selectedBooking.tenant?.firstName} {selectedBooking.tenant?.lastName}
                  </p>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedBooking.tenant?.email}</span>
                    </div>
                    {selectedBooking.tenant?.phoneNumber && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedBooking.tenant.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Landlord Information */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Landlord (Lessor)</span>
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="font-extrabold text-base text-slate-900 dark:text-white">
                    {selectedBooking.property?.landlord?.firstName} {selectedBooking.property?.landlord?.lastName}
                  </p>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{selectedBooking.property?.landlord?.email}</span>
                    </div>
                    {selectedBooking.property?.landlord?.phoneNumber && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedBooking.property.landlord.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Lease Dates & Duration */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Lease Timeline & Act 220 Duration
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Move-in / Start Date</span>
                    <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                      {new Date(selectedBooking.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block">Move-out / End Date</span>
                    <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mt-0.5">
                      {new Date(selectedBooking.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 block">Calculated Term</span>
                    <span className="inline-block mt-0.5 px-2.5 py-1 rounded-lg text-xs font-black bg-[#0F5132]/10 text-[#0F5132] dark:bg-emerald-950/60 dark:text-emerald-300">
                      {formatLeaseDuration(selectedBooking.startDate, selectedBooking.endDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Act 220 Deed of Tenancy Status */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Statutory Tenancy Agreement (Act 220)
                  </span>
                  <FileText className="w-4 h-4 text-[#0F5132]" />
                </div>
                {selectedBooking.leaseAgreement ? (
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 text-emerald-600" />
                      <span>Agreement Status: <strong>{selectedBooking.leaseAgreement.status}</strong></span>
                    </div>
                    {selectedBooking.leaseAgreement.cryptographicHash && (
                      <div className="text-[11px] font-mono text-slate-400 truncate">
                        Hash: {selectedBooking.leaseAgreement.cryptographicHash}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Digital Deed of Tenancy agreement has not yet been executed for this booking.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex justify-between items-center">
              <Link
                href="/admin/deeds"
                className="text-xs font-bold text-[#0F5132] hover:underline flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                Go to Tenancy Deeds Hub
              </Link>

              <button
                onClick={() => setSelectedBooking(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
