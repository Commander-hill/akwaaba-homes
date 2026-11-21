'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/axios';
import { formatBookingUnitLabel } from '@/components/landlord-ui/propertyConfig';
import { Building, Download, ExternalLink, Filter, GraduationCap, Mail, MapPin, MessageSquare, Phone, Search, User } from 'lucide-react';
import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { getImageUrl } from '@/lib/utils';
import SkeletonTable from '@/components/SkeletonTable';
import QueryErrorFallback from '@/components/ui/QueryErrorFallback';

export default function LandlordTenantsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [propertyFilter, setPropertyFilter] = useState('ALL');

  const { data: bookingsResponse, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['bookings', 'landlord'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/landlord');
      return data;
    }
  });

  const bookings = bookingsResponse?.bookings || [];

  const propertyOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of bookings) {
      const propId = b.property?.id || b.propertyId;
      const propTitle = b.property?.title;
      if (propId && propTitle && !map.has(propId)) {
        map.set(propId, propTitle);
      }
    }
    return Array.from(map.entries())
      .map(([id, title]) => ({ id, title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    let result = bookings;
    
    if (statusFilter !== 'ALL') {
      result = result.filter((b: any) => b.status === statusFilter);
    }

    if (propertyFilter !== 'ALL') {
      result = result.filter((b: any) => (b.property?.id || b.propertyId) === propertyFilter);
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter((b: any) => {
        const tenant = b.tenant || {};
        const nameMatch = `${tenant.firstName || ''} ${tenant.lastName || ''}`.toLowerCase().includes(term);
        const emailMatch = (tenant.email || '').toLowerCase().includes(term);
        const phoneMatch = tenant.phoneNumber?.toLowerCase().includes(term);
        const studentIdMatch = tenant.studentId?.toLowerCase().includes(term);
        const refMatch = String(b.id || '').toLowerCase().includes(term);
        const propertyMatch = (b.property?.title || '').toLowerCase().includes(term);
        const unitMatch = `${b.room?.roomType || ''} ${b.room?.blockName || ''}`.toLowerCase().includes(term);
        return nameMatch || emailMatch || phoneMatch || studentIdMatch || refMatch || propertyMatch || unitMatch;
      });
    }

    return result;
  }, [bookings, searchTerm, statusFilter, propertyFilter]);

  const activeCount = bookings.filter((b: any) => ['APPROVED', 'CONFIRMED', 'ACTIVE', 'CHECKED_IN'].includes(b.status)).length;
  const pendingCount = bookings.filter((b: any) => b.status === 'PENDING').length;
  const pastCount = bookings.filter((b: any) => ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status)).length;
  const hasActiveFilters = searchTerm.trim() !== '' || statusFilter !== 'ALL' || propertyFilter !== 'ALL';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setPropertyFilter('ALL');
  };

  const exportCsv = () => {
    const escapeCell = (val: unknown) => {
      const str = String(val ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    };
    const headers = ['Booking Ref', 'Tenant Name', 'Student ID', 'Property', 'Unit', 'Start Date', 'End Date', 'Email', 'Phone', 'Status'];
    const rows = filteredBookings.map((b: any) => {
      const t = b.tenant || {};
      const isApproved = ['APPROVED', 'CONFIRMED', 'ACTIVE', 'CHECKED_IN', 'COMPLETED'].includes(b.status);
      return [
        String(b.id || '').substring(0, 8),
        `${t.firstName || 'Unknown'} ${t.lastName || 'Tenant'}`.trim(),
        t.studentId || '',
        b.property?.title || 'Unknown Property',
        formatBookingUnitLabel(b.property?.type, b.room?.roomType, b.room?.blockName),
        b.startDate ? new Date(b.startDate).toLocaleDateString() : '',
        b.endDate ? new Date(b.endDate).toLocaleDateString() : '',
        isApproved ? (t.email || '') : 'Protected',
        isApproved ? (t.phoneNumber || '') : 'Protected',
        b.status || ''
      ].map(escapeCell).join(',');
    });
    const csv = [headers.map(escapeCell).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tenant-roster-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Sticky Header & Stats Container */}
      <div className="sticky top-0 z-20 bg-[#FBFBFC]/95 dark:bg-[#0B0D12]/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-zinc-200 dark:border-zinc-800 space-y-4 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Resident Directory &amp; Tenant Roster</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Verified occupants, room allocations, and tenancy contract statuses across your properties.</p>
          </div>
          {filteredBookings.length > 0 && (
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:border-[#16A34A] hover:text-[#16A34A] transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>

        {/* 4 Architectural Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Bookings</span>
              <User className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-black text-zinc-950 dark:text-white">{bookings.length}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">All-time tenancy records</div>
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Residents</span>
              <Building className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-[#0F5132] dark:text-emerald-400">{activeCount}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Currently residing in rooms</div>
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pending Review</span>
              <Filter className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Awaiting landlord approval</div>
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Past &amp; Completed</span>
              <MapPin className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-black text-zinc-600 dark:text-zinc-400">{pastCount}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Vacated or cancelled leases</div>
          </div>
        </div>
      </div>

      {/* Main Roster Container */}
      <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs flex flex-col min-h-[500px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search name, email, ref, property, or unit..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:border-[#0F5132] outline-none transition-all"
              />
            </div>

            {propertyOptions.length > 1 && (
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                aria-label="Filter by property"
                className="px-3 py-1.5 bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-xs font-medium text-zinc-900 dark:text-white focus:border-[#0F5132] outline-none transition-all cursor-pointer"
              >
                <option value="ALL">All Properties ({propertyOptions.length})</option>
                {propertyOptions.map((prop) => (
                  <option key={prop.id} value={prop.id}>
                    {prop.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-x-auto w-full lg:w-auto">
            {['ALL', 'PENDING', 'APPROVED', 'CONFIRMED', 'CHECKED_IN', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'REJECTED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={clsx(
                  "px-3 py-1 text-[11px] font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer",
                  statusFilter === status
                    ? "bg-[#16A34A] text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <SkeletonTable rows={5} columns={6} />
          ) : isError ? (
            <div className="p-6">
              <QueryErrorFallback
                title="Unable to load tenants"
                onRetry={() => refetch()}
                isRetrying={isRefetching}
              />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center text-center p-12 space-y-2">
              <User className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
              <h3 className="text-sm font-bold text-zinc-950 dark:text-white">No Matching Resident Records</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                Try adjusting your search criteria or switch the status filter tab above.
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:border-[#16A34A] hover:text-[#16A34A] transition-colors cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Stacked Card View (< md) */}
              <div className="md:hidden divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
                {filteredBookings.map((booking: any) => {
                  const t = booking.tenant;
                  const isApproved = ['APPROVED', 'CONFIRMED', 'ACTIVE', 'CHECKED_IN', 'COMPLETED'].includes(booking.status);

                  return (
                    <div key={booking.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300 shrink-0 overflow-hidden text-xs">
                            {t?.avatarUrl ? (
                              <img decoding="async" src={getImageUrl(t.avatarUrl)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              `${t?.firstName?.[0] || 'U'}${t?.lastName?.[0] || ''}`
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-zinc-950 dark:text-white text-sm truncate">
                              {t?.firstName || 'Unknown'} {t?.lastName || 'Tenant'}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              {t?.gender && (
                                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-medium">
                                  {t.gender}
                                </span>
                              )}
                              {t?.studentId && (
                                <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                  <GraduationCap className="w-3 h-3 text-zinc-400" /> {t.studentId}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className={clsx(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[10px] border tracking-wide shrink-0",
                          booking.status === 'APPROVED' || booking.status === 'CONFIRMED' ? "bg-emerald-50 text-[#0F5132] border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60" :
                          booking.status === 'PENDING' ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60" :
                          booking.status === 'ACTIVE' || booking.status === 'CHECKED_IN' ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60" :
                          booking.status === 'COMPLETED' ? "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700" :
                          "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60"
                        )}>
                          {booking.status}
                        </span>
                      </div>

                      <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-zinc-200/60 dark:border-zinc-800/60 space-y-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider shrink-0">Property</span>
                          <div className="text-right min-w-0">
                            <Link href={`/dashboard/landlord/bookings/${booking.id}`} className="font-bold text-zinc-900 dark:text-white hover:text-[#16A34A] block truncate">
                              {booking.property?.title || 'Unknown Property'}
                            </Link>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {formatBookingUnitLabel(booking.property?.type, booking.room?.roomType, booking.room?.blockName)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider shrink-0">Term</span>
                          <div className="text-right">
                            <span className="text-zinc-900 dark:text-white font-medium">
                              {new Date(booking.startDate).toLocaleDateString()} &rarr; {new Date(booking.endDate).toLocaleDateString()}
                            </span>
                            {booking.rentDueSummary && (
                              <div className="mt-1">
                                <span
                                  className={clsx(
                                    'inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-bold',
                                    booking.rentDueSummary.isOverdue
                                      ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                      : booking.rentDueSummary.isDueSoon
                                        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                        : 'bg-emerald-50 text-[#0F5132] dark:bg-emerald-950/40 dark:text-emerald-300'
                                  )}
                                >
                                  {booking.rentDueSummary.isOverdue
                                    ? `Overdue (${Math.abs(booking.rentDueSummary.daysUntilDue)}d)`
                                    : `Due ${new Date(booking.rentDueSummary.nextDueDate).toLocaleDateString()}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider shrink-0">Contact</span>
                          <div className="text-right">
                            {isApproved ? (
                              <div className="flex flex-col items-end gap-0.5">
                                {t?.email && (
                                  <a href={`mailto:${t.email}`} className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300 hover:text-[#16A34A] break-all">
                                    <Mail className="w-3 h-3 text-zinc-400 shrink-0" /> {t.email}
                                  </a>
                                )}
                                {t?.phoneNumber && (
                                  <a href={`tel:${t.phoneNumber}`} className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300 hover:text-[#16A34A]">
                                    <Phone className="w-3 h-3 text-zinc-400 shrink-0" /> {t.phoneNumber}
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-400 italic">Protected until approval</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Link href={`/dashboard/landlord/bookings/${booking.id}`} className="text-[10px] font-mono text-zinc-400 hover:text-[#16A34A]">
                          Ref: #{String(booking.id || '').substring(0, 8)}
                        </Link>
                        <div className="inline-flex items-center gap-1.5">
                          {isApproved && t?.id && (
                            <Link
                              href={`/dashboard/messages?partnerId=${t.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-[#16A34A] hover:text-[#16A34A] transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Message
                            </Link>
                          )}
                          <Link
                            href={`/dashboard/landlord/bookings/${booking.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-[#16A34A] hover:text-white transition-colors"
                          >
                            View
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= md) */}
              <table className="hidden md:table w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-[#14A248] text-white uppercase text-[10px] font-bold tracking-wider z-10">
                <tr>
                  <th className="px-6 py-3.5">Resident / Tenant</th>
                  <th className="px-6 py-3.5">Assigned Property</th>
                  <th className="px-6 py-3.5">Tenancy Term</th>
                  <th className="px-6 py-3.5">Contact Clearance</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
                {filteredBookings.map((booking: any) => {
                  const t = booking.tenant;
                  const isApproved = ['APPROVED', 'CONFIRMED', 'ACTIVE', 'CHECKED_IN', 'COMPLETED'].includes(booking.status);
                  
                  return (
                    <tr key={booking.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-300 shrink-0 overflow-hidden text-xs">
                            {t?.avatarUrl ? (
                              <img decoding="async" src={getImageUrl(t.avatarUrl)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              `${t?.firstName?.[0] || 'U'}${t?.lastName?.[0] || ''}`
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-950 dark:text-white text-xs">
                              {t?.firstName || 'Unknown'} {t?.lastName || 'Tenant'}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {t?.gender && (
                                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded text-zinc-500 font-medium">
                                  {t.gender}
                                </span>
                              )}
                              {t?.studentId && (
                                <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                  <GraduationCap className="w-3 h-3 text-zinc-400" /> {t.studentId}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/landlord/bookings/${booking.id}`} className="font-bold text-zinc-900 dark:text-white hover:text-[#16A34A] text-xs transition-colors">
                          {booking.property?.title || 'Unknown Property'}
                        </Link>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {formatBookingUnitLabel(booking.property?.type, booking.room?.roomType, booking.room?.blockName)}
                        </div>
                        <Link href={`/dashboard/landlord/bookings/${booking.id}`} className="inline-block text-[10px] font-mono text-zinc-400 hover:text-[#16A34A] mt-0.5">
                          Ref: #{String(booking.id || '').substring(0,8)} &rarr;
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-zinc-900 dark:text-white font-medium">
                          {new Date(booking.startDate).toLocaleDateString()}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          to {new Date(booking.endDate).toLocaleDateString()}
                        </div>
                        {booking.rentDueSummary && (
                          <span
                            className={clsx(
                              'inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold',
                              booking.rentDueSummary.isOverdue
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                : booking.rentDueSummary.isDueSoon
                                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-emerald-50 text-[#0F5132] dark:bg-emerald-950/40 dark:text-emerald-300'
                            )}
                          >
                            {booking.rentDueSummary.isOverdue
                              ? `Overdue (${Math.abs(booking.rentDueSummary.daysUntilDue)}d)`
                              : `Due ${new Date(booking.rentDueSummary.nextDueDate).toLocaleDateString()}`}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {isApproved ? (
                            <>
                              {t?.email ? (
                                <a href={`mailto:${t.email}`} className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300 hover:text-[#16A34A] transition-colors">
                                  <Mail className="w-3 h-3 text-zinc-400" /> {t.email}
                                </a>
                              ) : (
                                <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                                  <Mail className="w-3 h-3 text-zinc-400" /> N/A
                                </span>
                              )}
                              {t?.phoneNumber && (
                                <a href={`tel:${t?.phoneNumber}`} className="flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-300 hover:text-[#16A34A] transition-colors">
                                  <Phone className="w-3 h-3 text-zinc-400" /> {t.phoneNumber}
                                </a>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-zinc-400 italic">Protected until approval</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-[10px] border tracking-wide",
                          booking.status === 'APPROVED' || booking.status === 'CONFIRMED' ? "bg-emerald-50 text-[#0F5132] border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60" :
                          booking.status === 'PENDING' ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60" :
                          booking.status === 'ACTIVE' || booking.status === 'CHECKED_IN' ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60" :
                          booking.status === 'COMPLETED' ? "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700" :
                          "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/60"
                        )}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {isApproved && t?.id && (
                            <Link
                              href={`/dashboard/messages?partnerId=${t.id}`}
                              title="Message Tenant"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-[#16A34A] hover:text-[#16A34A] transition-colors"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Message
                            </Link>
                          )}
                          <Link
                            href={`/dashboard/landlord/bookings/${booking.id}`}
                            title="View Booking Details"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-[#16A34A] hover:text-white transition-colors"
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
