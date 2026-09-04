'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, CalendarCheck, Home } from 'lucide-react';

export default function AdminBookingsPage() {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['admin-bookings'],
    queryFn: async () => {
      const res = await api.get('/admin/bookings');
      return res.data;
    }
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;

  return (
    <div className="space-y-6">
      {/* Sticky Header Container */}
      <div className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md pt-2 pb-4 -mx-8 px-8 border-b border-slate-200/60 dark:border-slate-800/60 mb-6 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Booking Monitor</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">System-wide overview of all platform bookings.</p>
        </div>
        <div className="p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
          <CalendarCheck className="w-8 h-8" />
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-white uppercase bg-[#0F5132] text-white shadow-md">
              <tr>
                <th className="px-6 py-4 font-extrabold text-white">Property &amp; Landlord</th>
                <th className="px-6 py-4 font-extrabold text-white">Tenant</th>
                <th className="px-6 py-4 font-extrabold text-white">Dates</th>
                <th className="px-6 py-4 font-extrabold text-white">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {bookings?.map((booking: any) => (
                <tr key={booking.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-[var(--foreground)] flex items-center gap-1"><Home className="w-3 h-3 text-[var(--primary)]"/> {booking.property.title}</div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-1">Host: {booking.property.landlord.firstName} {booking.property.landlord.lastName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-[var(--foreground)]">{booking.tenant.firstName} {booking.tenant.lastName}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{booking.tenant.email}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-[var(--muted-foreground)]">
                    {new Date(booking.startDate).toLocaleDateString()} <br/>to<br/> {new Date(booking.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${
                      booking.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      booking.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                      booking.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
              {bookings?.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[var(--muted-foreground)]">No bookings found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
