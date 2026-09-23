'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  DollarSign, Plus, Trash2, CheckCircle2, Clock, Zap, Droplets, 
  Wifi, Flame, Loader2, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface BillSplitParticipant {
  id: string;
  userName: string;
  userPhone: string | null;
  userEmail: string | null;
  shareAmount: number;
  isPaid: boolean;
  paidAt: string | null;
}

interface BillSplit {
  id: string;
  propertyId: string;
  creatorId?: string;
  title: string;
  category: string;
  totalAmount: number;
  status: 'OPEN' | 'SETTLED' | 'CANCELLED';
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  property: {
    id: string;
    title: string;
    location: string;
  };
  creator: {
    id: string;
    firstName: string;
    lastName: string;
  };
  participants: BillSplitParticipant[];
}

export default function BillSplitterTab({ bookings = [] }: { bookings?: any[] }) {
  const queryClient = useQueryClient();

  const { data: userData } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data?.user || res.data;
    }
  });
  const currentUserId = userData?.id;

  const { data, isLoading } = useQuery<{ billSplits: BillSplit[] }>({
    queryKey: ['billSplits', 'tenant'],
    queryFn: async () => {
      const res = await api.get('/bill-splits');
      return res.data;
    }
  });

  const togglePaymentMutation = useMutation({
    mutationFn: async ({ participantId, isPaid }: { participantId: string; isPaid: boolean }) => {
      const res = await api.patch(`/bill-splits/participants/${participantId}/status`, { isPaid });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Payment status updated');
      queryClient.invalidateQueries({ queryKey: ['billSplits', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update payment');
    }
  });

  const deleteSplitMutation = useMutation({
    mutationFn: async (splitId: string) => {
      const res = await api.delete(`/bill-splits/${splitId}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Bill split deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['billSplits', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete bill split');
    }
  });

  const billSplits = data?.billSplits || [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Shared Utility & Expense Splitter</h2>
            <p className="text-xs text-slate-500">Split ECG prepaid electricity, water tankers, WiFi, & gas refills with roommates</p>
          </div>
        </div>

        <Link
          href="/dashboard/tenant/bills/split/new"
          className="px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition shadow-xs w-fit"
        >
          <Plus className="w-4 h-4" /> New Bill Split
        </Link>
      </div>

      {isLoading ? (
        <div className="p-16 flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : billSplits.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Active Bill Splits</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Create an expense split when purchasing shared electricity prepaid tokens, water tanker deliveries, or internet subscriptions.
          </p>
          <Link
            href="/dashboard/tenant/bills/split/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-500 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create First Expense Split
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {billSplits.map((bill) => {
            const isSettled = bill.status === 'SETTLED';
            const totalPaid = bill.participants.filter(p => p.isPaid).reduce((sum, p) => sum + p.shareAmount, 0);

            return (
              <div
                key={bill.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                        isSettled ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      )}>
                        {isSettled ? 'FULLY SETTLED' : 'PENDING SETTLEMENT'}
                      </span>
                      {!isSettled && (bill.creatorId === currentUserId || bill.creator?.id === currentUserId) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete bill split "${bill.title}"?`)) {
                              deleteSplitMutation.mutate(bill.id);
                            }
                          }}
                          disabled={deleteSplitMutation.isPending}
                          className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors rounded-lg cursor-pointer"
                          title="Delete Split"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white pt-1">{bill.title}</h4>
                    <p className="text-xs text-slate-400">{bill.property?.title} • Created by {bill.creator?.firstName}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total Bill</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      GH₵ {bill.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">Collected Progress:</span>
                    <span className="text-emerald-600">GH₵ {totalPaid.toFixed(2)} / GH₵ {bill.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.round((totalPaid / bill.totalAmount) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Participant breakdown */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Roommate Share Status</span>
                  <div className="space-y-1.5">
                    {bill.participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 dark:text-white">{p.userName}</span>
                          {p.userPhone && <span className="text-[11px] text-slate-400 block">{p.userPhone}</span>}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            GH₵ {p.shareAmount.toFixed(2)}
                          </span>
                          <button
                            onClick={() => togglePaymentMutation.mutate({ participantId: p.id, isPaid: !p.isPaid })}
                            disabled={togglePaymentMutation.isPending}
                            className={clsx(
                              "px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer",
                              p.isPaid ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300"
                            )}
                          >
                            {p.isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                            {p.isPaid ? 'Paid' : 'Mark Paid'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
