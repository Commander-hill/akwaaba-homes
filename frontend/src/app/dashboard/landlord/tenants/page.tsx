'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Search, Mail, Phone, User, GraduationCap, MapPin, Building, Star, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';
import clsx from 'clsx';
import { getImageUrl } from '@/lib/utils';

export default function LandlordTenantsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: bookingsResponse, isLoading } = useQuery({
    queryKey: ['bookings', 'landlord'],
    queryFn: async () => {
      const { data } = await api.get('/bookings/landlord');
      return data;
    }
  });

  const bookings = bookingsResponse?.bookings || [];

  // Filter and sort bookings to get unique tenants or just show all booking instances
  const filteredBookings = useMemo(() => {
    let result = bookings;
    
    // Apply Status Filter
    if (statusFilter !== 'ALL') {
      result = result.filter((b: any) => b.status === statusFilter);
    }

    // Apply Search Term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter((b: any) => {
        const tenant = b.tenant;
        const nameMatch = `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(term);
        const emailMatch = tenant.email.toLowerCase().includes(term);
        const phoneMatch = tenant.phoneNumber?.toLowerCase().includes(term);
        const studentIdMatch = tenant.studentId?.toLowerCase().includes(term);
        return nameMatch || emailMatch || phoneMatch || studentIdMatch;
      });
    }

    return result;
  }, [bookings, searchTerm, statusFilter]);

  const activeCount = bookings.filter((b: any) => b.status === 'APPROVED' || b.status === 'ACTIVE').length;
  const pendingCount = bookings.filter((b: any) => b.status === 'PENDING').length;
  const pastCount = bookings.filter((b: any) => b.status === 'COMPLETED' || b.status === 'CANCELLED').length;

  return (
    <div className="w-full space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">Tenants & Guests</h1>
        <p className="text-[var(--muted-foreground)]">Manage and view details for all people who have booked your properties.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Total Bookings</p>
            <p className="text-3xl font-black text-[var(--foreground)]">{bookings.length}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Active</p>
            <p className="text-3xl font-black text-emerald-600">{activeCount}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Building className="w-6 h-6" />
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Pending</p>
            <p className="text-3xl font-black text-amber-500">{pendingCount}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Filter className="w-6 h-6" />
          </div>
        </div>
        <div className="glass-card p-5 rounded-2xl border border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">Past</p>
            <p className="text-3xl font-black text-slate-500">{pastCount}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
            <MapPin className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col h-[600px]">
        {/* Toolbar */}
        <div className="p-4 border-b border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input 
              type="text" 
              placeholder="Search by name, email, or student ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-[#0a0a0a] border border-[var(--input)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {['ALL', 'PENDING', 'APPROVED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors",
                  statusFilter === status
                    ? "bg-[var(--primary)] text-white"
                    : "bg-white dark:bg-slate-800 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto bg-white dark:bg-[#0a0a0a]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center text-center p-8">
              <User className="w-16 h-16 text-slate-200 dark:text-slate-800 mb-4" />
              <h3 className="text-lg font-bold text-[var(--foreground)]">No Tenants Found</h3>
              <p className="text-[var(--muted-foreground)] text-sm max-w-sm mt-1">
                Try adjusting your search filters, or wait for new booking requests to come in.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-[var(--border)] z-10">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Tenant</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Property</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredBookings.map((booking: any) => {
                  const t = booking.tenant;
                  const isApproved = ['APPROVED', 'ACTIVE'].includes(booking.status);
                  
                  return (
                    <tr key={booking.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={getImageUrl(t.avatarUrl) || 'https://via.placeholder.com/150'} 
                            alt={t.firstName} 
                            className="w-10 h-10 rounded-full object-cover border border-[var(--border)]"
                          />
                          <div>
                            <div className="font-bold text-[var(--foreground)] text-sm">{t?.firstName || 'Unknown'} {t?.lastName || 'Tenant'}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {t.gender && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[var(--muted-foreground)]">{t.gender}</span>}
                              {t.studentId && (
                                <span className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]">
                                  <GraduationCap className="w-3 h-3" /> {t.studentId}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-xs font-medium text-[var(--muted-foreground)]">{(t?.reputationScore || 5.0).toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)] text-sm">{booking.property?.title || 'Unknown Property'}</div>
                        <div className="text-xs text-[var(--muted-foreground)] mt-0.5">Booking Ref: {String(booking.id || '').substring(0,8)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[var(--foreground)]">{new Date(booking.startDate).toLocaleDateString()}</div>
                        <div className="text-xs text-[var(--muted-foreground)] mt-0.5">to {new Date(booking.endDate).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          {isApproved ? (
                            <>
                              <a href={`mailto:${t.email}`} className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">
                                <Mail className="w-3.5 h-3.5" /> {t.email}
                              </a>
                              {t.phoneNumber && (
                                <a href={`tel:${t.phoneNumber}`} className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors">
                                  <Phone className="w-3.5 h-3.5" /> {t.phoneNumber}
                                </a>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)] italic">Revealed when approved</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "inline-flex items-center px-2.5 py-1 rounded-md font-bold text-[10px]",
                          booking.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" :
                          booking.status === 'PENDING' ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" :
                          booking.status === 'ACTIVE' ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" :
                          booking.status === 'COMPLETED' ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400" :
                          "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                        )}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
