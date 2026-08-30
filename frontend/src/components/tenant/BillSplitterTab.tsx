'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  DollarSign, Plus, Trash2, CheckCircle2, Clock, Zap, Droplets, 
  Wifi, Flame, Sparkles, Loader2, Users, Send, AlertCircle
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
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [propertyId, setPropertyId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('ELECTRICITY_ECG');
  const [totalAmount, setTotalAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [participants, setParticipants] = useState<Array<{ userName: string; userPhone: string; shareAmount: string }>>([
    { userName: '', userPhone: '', shareAmount: '' }
  ]);

  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'public-catalog'],
    queryFn: async () => {
      const res = await api.get('/properties');
      return res.data;
    }
  });

  const rawBookingProps = (bookings || [])
    .map((b: any) => ({
      id: b.propertyId || b.property?.id,
      title: b.property?.title || 'Residential Residence',
      location: b.property?.location || ''
    }))
    .filter((p: any) => Boolean(p.id));

  const fallbackProps = (propertiesData?.properties || propertiesData?.data || [])
    .map((p: any) => ({
      id: p.id,
      title: p.title || 'Residential Residence',
      location: p.location || ''
    }))
    .filter((p: any) => Boolean(p.id));

  const activeProperties = rawBookingProps.length > 0 ? rawBookingProps : fallbackProps;

  useEffect(() => {
    if (!propertyId && activeProperties.length > 0) {
      setPropertyId(activeProperties[0].id);
    }
  }, [activeProperties, propertyId]);

  const { data, isLoading } = useQuery<{ billSplits: BillSplit[] }>({
    queryKey: ['billSplits', 'tenant'],
    queryFn: async () => {
      const res = await api.get('/bill-splits');
      return res.data;
    }
  });

  const createSplitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/bill-splits', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Bill split created! Roommates can now view and settle.');
      setModalOpen(false);
      setTitle('');
      setTotalAmount('');
      setNotes('');
      setParticipants([{ userName: '', userPhone: '', shareAmount: '' }]);
      queryClient.invalidateQueries({ queryKey: ['billSplits', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create bill split');
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

  const addParticipant = () => {
    setParticipants([...participants, { userName: '', userPhone: '', shareAmount: '' }]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, field: string, value: string) => {
    const updated = [...participants];
    (updated[index] as any)[field] = value;
    setParticipants(updated);
  };

  const handleAutoSplit = () => {
    const total = parseFloat(totalAmount);
    if (!total || isNaN(total) || participants.length === 0) return;
    const count = participants.length + 1; // +1 for creator
    const splitEach = (total / count).toFixed(2);
    const updated = participants.map(p => ({ ...p, shareAmount: splitEach }));
    setParticipants(updated);
    toast.success(`Split evenly into GHS ${splitEach} per person`);
  };

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

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition shadow-xs"
        >
          <Plus className="w-4 h-4" /> New Bill Split
        </button>
      </div>

      {isLoading ? (
        <div className="p-16 flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : billSplits.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Active Bill Splits</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Create an expense split when purchasing shared electricity prepaid tokens, water tanker deliveries, or internet subscriptions.
          </p>
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
                    <span className={clsx(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                      isSettled ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                    )}>
                      {isSettled ? 'FULLY SETTLED ✅' : 'PENDING SETTLEMENT'}
                    </span>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white pt-1">{bill.title}</h4>
                    <p className="text-xs text-slate-400">{bill.property?.title} • Created by {bill.creator?.firstName}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total Bill</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      GHS {bill.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">Collected Progress:</span>
                    <span className="text-emerald-600">GHS {totalPaid.toFixed(2)} / GHS {bill.totalAmount.toFixed(2)}</span>
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
                            GHS {p.shareAmount.toFixed(2)}
                          </span>
                          <button
                            onClick={() => togglePaymentMutation.mutate({ participantId: p.id, isPaid: !p.isPaid })}
                            disabled={togglePaymentMutation.isPending}
                            className={clsx(
                              "px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1",
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

      {/* Create Split Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" /> New Expense & Bill Split
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Residence</label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                >
                  {activeProperties.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.location ? `(${p.location})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Bill Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. ECG Prepaid 200 Units"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="ELECTRICITY_ECG">⚡ Electricity (ECG Units)</option>
                    <option value="WATER_TANKER">💧 Water Tanker Delivery</option>
                    <option value="INTERNET_WIFI">📶 High-Speed WiFi Internet</option>
                    <option value="GAS_REFILL">🔥 Cooking Gas Cylinder</option>
                    <option value="CLEANING">🧹 Compound Cleaning / Trash</option>
                    <option value="OTHER">📦 Other Expense</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Total Bill Amount (GHS)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="e.g. 300"
                    className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAutoSplit}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    Auto-Split Evenly
                  </button>
                </div>
              </div>

              {/* Participants */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Roommate Participants</label>
                  <button
                    type="button"
                    onClick={addParticipant}
                    className="text-xs text-[var(--primary)] font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Roommate
                  </button>
                </div>

                <div className="space-y-2">
                  {participants.map((p, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Name (e.g. Kofi)"
                        value={p.userName}
                        onChange={(e) => updateParticipant(index, 'userName', e.target.value)}
                        className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                      />
                      <input
                        type="tel"
                        placeholder="MoMo Phone"
                        value={p.userPhone}
                        onChange={(e) => updateParticipant(index, 'userPhone', e.target.value)}
                        className="w-28 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                      />
                      <input
                        type="number"
                        placeholder="GHS"
                        value={p.shareAmount}
                        onChange={(e) => updateParticipant(index, 'shareAmount', e.target.value)}
                        className="w-20 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                      />
                      {participants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeParticipant(index)}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Payment Info (Optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Send to MTN MoMo: 054-XXXXXXX (Kwame)"
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
                  const targetPropertyId = propertyId || activeProperties[0]?.id;
                  if (!targetPropertyId) {
                    toast.error('Active tenancy required to create bill splits');
                    return;
                  }
                  if (!title || !totalAmount) {
                    toast.error('Bill title and amount are required');
                    return;
                  }
                  const validParticipants = participants.filter(p => p.userName.trim());
                  if (validParticipants.length === 0) {
                    toast.error('At least one roommate name is required');
                    return;
                  }
                  createSplitMutation.mutate({
                    propertyId: targetPropertyId,
                    title,
                    category,
                    totalAmount,
                    notes,
                    participants: validParticipants
                  });
                }}
                disabled={createSplitMutation.isPending}
                className="px-6 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:opacity-90 shadow-sm"
              >
                {createSplitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Split
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
