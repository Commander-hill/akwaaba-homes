'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  FileText, Plus, CheckCircle2, Clock, XCircle, AlertCircle, 
  Loader2, Calendar, ShieldCheck, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface LeaseRenewal {
  id: string;
  propertyId: string;
  bookingId: string;
  proposedDurationMonths: number;
  proposedStartDate: string;
  proposedRent: number | null;
  tenantNotes: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'NEGOTIATING';
  landlordResponse: string | null;
  createdAt: string;
  property: {
    id: string;
    title: string;
    location: string;
  };
  booking: {
    id: string;
    startDate: string;
    endDate: string;
  };
}

export default function LeaseRenewalTab({ bookings = [] }: { bookings?: any[] }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [bookingId, setBookingId] = useState('');
  const [durationMonths, setDurationMonths] = useState('12');
  const [proposedStartDate, setProposedStartDate] = useState('');
  const [proposedRent, setProposedRent] = useState('');
  const [tenantNotes, setTenantNotes] = useState('');

  const activeBookings = (bookings || []).filter((b: any) =>
    ['APPROVED', 'CONFIRMED', 'COMPLETED', 'PAID', 'PENDING'].includes(b.status)
  );

  React.useEffect(() => {
    if (!bookingId && activeBookings.length > 0) {
      setBookingId(activeBookings[0].id);
      // Default proposed start date to existing end date
      if (activeBookings[0].endDate) {
        setProposedStartDate(new Date(activeBookings[0].endDate).toISOString().split('T')[0]);
      }
    }
  }, [activeBookings, bookingId]);

  const { data, isLoading } = useQuery<{ renewals: LeaseRenewal[] }>({
    queryKey: ['leaseRenewals', 'tenant'],
    queryFn: async () => {
      const res = await api.get('/lease-renewals');
      return res.data;
    }
  });

  const requestRenewalMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/lease-renewals', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Lease renewal application submitted to your landlord!');
      setModalOpen(false);
      setTenantNotes('');
      queryClient.invalidateQueries({ queryKey: ['leaseRenewals', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit renewal request');
    }
  });

  const renewals = data?.renewals || [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lease Renewal & Rent Review</h2>
            <p className="text-xs text-slate-500">Apply to renew your annual or semester tenancy early and secure your residence</p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          disabled={activeBookings.length === 0}
          className="px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition shadow-xs disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Request Lease Renewal
        </button>
      </div>

      {isLoading ? (
        <div className="p-16 flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : renewals.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Renewal Applications Yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            As your lease expiration approaches (typically 30–60 days before completion), apply here to lock in your tenancy for another academic year or lease period.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renewals.map((r) => (
            <div
              key={r.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <span className={clsx(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                    r.status === 'ACCEPTED' && "bg-emerald-500/10 text-emerald-600",
                    r.status === 'PENDING' && "bg-amber-500/10 text-amber-600",
                    r.status === 'NEGOTIATING' && "bg-blue-500/10 text-blue-600",
                    r.status === 'DECLINED' && "bg-red-500/10 text-red-600"
                  )}>
                    {r.status}
                  </span>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white pt-1">{r.property?.title}</h4>
                  <p className="text-xs text-slate-400">{r.property?.location}</p>
                </div>

                <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg">
                  {r.proposedDurationMonths} Months Extension
                </span>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Proposed Start Date:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {new Date(r.proposedStartDate).toLocaleDateString()}
                  </span>
                </div>
                {r.proposedRent && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Proposed Rent:</span>
                    <span className="font-bold text-emerald-600">
                      GHS {r.proposedRent.toLocaleString()}
                    </span>
                  </div>
                )}
                {r.tenantNotes && (
                  <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200 dark:border-slate-700">
                    "{r.tenantNotes}"
                  </p>
                )}
              </div>

              {r.landlordResponse && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-blue-600 dark:text-blue-400">Landlord Note:</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{r.landlordResponse}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Renewal Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-500" /> Lease Renewal Application
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Current Tenancy Stay</label>
                <select
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                >
                  {activeBookings.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.property?.title} (Ends: {new Date(b.endDate).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Renewal Term</label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="6">6 Months (Semester)</option>
                    <option value="12">12 Months (Full Academic Year)</option>
                    <option value="24">24 Months (2 Years)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Renewal Start Date</label>
                  <input
                    type="date"
                    value={proposedStartDate}
                    onChange={(e) => setProposedStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Proposed Rent / Offer (Optional)</label>
                <input
                  type="number"
                  value={proposedRent}
                  onChange={(e) => setProposedRent(e.target.value)}
                  placeholder="e.g. 5500 (GHS)"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                />
                <span className="text-[10px] text-slate-400">Leave blank to renew at current rate or standard landlord terms.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes for Landlord</label>
                <textarea
                  rows={2}
                  value={tenantNotes}
                  onChange={(e) => setTenantNotes(e.target.value)}
                  placeholder="e.g. I would like to extend my stay for the next academic year. Happy to sign early."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const targetBookingId = bookingId || activeBookings[0]?.id;
                  if (!targetBookingId) {
                    toast.error('No active tenancy found to renew');
                    return;
                  }
                  if (!proposedStartDate) {
                    toast.error('Proposed start date is required');
                    return;
                  }
                  requestRenewalMutation.mutate({
                    bookingId: targetBookingId,
                    proposedDurationMonths: durationMonths,
                    proposedStartDate,
                    proposedRent: proposedRent || null,
                    tenantNotes
                  });
                }}
                disabled={requestRenewalMutation.isPending}
                className="px-6 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:opacity-90 shadow-sm"
              >
                {requestRenewalMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
