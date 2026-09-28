'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  DollarSign,
  Zap,
  Droplets,
  Wifi,
  Flame,
  Trash2,
  Plus,
  Users,
  Building,
  CheckCircle2,
  Calendar,
  Phone,
  ArrowLeft,
  ChevronRight,
  Send,
  Loader2,
  Calculator,
  User,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PropertyOption {
  id: string;
  title: string;
  location?: string;
}

const UTILITY_PRESETS = [
  {
    id: 'ELECTRICITY_ECG',
    label: 'Electricity (ECG Prepaid)',
    icon: Zap,
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    defaultTitle: 'ECG Prepaid Token Recharge',
    suggestedAmounts: [100, 200, 300, 500],
    noteHint: 'Includes sub-meter service charge. Token PIN will be sent to WhatsApp group once loaded.'
  },
  {
    id: 'WATER_TANKER',
    label: 'Water Tanker Delivery',
    icon: Droplets,
    badgeColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    defaultTitle: 'Commercial Water Tanker (3000L)',
    suggestedAmounts: [250, 350, 450, 600],
    noteHint: 'For overhead storage polytank filling. Delivery expected today.'
  },
  {
    id: 'INTERNET_WIFI',
    label: 'Shared Fiber WiFi',
    icon: Wifi,
    badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    defaultTitle: 'Monthly Unlimited Fiber WiFi Subscription',
    suggestedAmounts: [250, 300, 400, 500],
    noteHint: 'Monthly renewal for Telecel / MTN Fibre broadband router.'
  },
  {
    id: 'GAS_REFILL',
    label: 'Cooking Gas Cylinder',
    icon: Flame,
    badgeColor: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    defaultTitle: '14.5kg LPG Cooking Gas Refill',
    suggestedAmounts: [180, 220, 260, 300],
    noteHint: 'Shared kitchen gas cylinder refill + transport fee.'
  },
  {
    id: 'CLEANING',
    label: 'Sanitation & Trash',
    icon: Trash2,
    badgeColor: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    defaultTitle: 'Compound Trash Collection & Cleaning',
    suggestedAmounts: [80, 120, 150, 200],
    noteHint: 'Monthly waste pickup and shared corridor cleaning.'
  }
];

function BillSplitterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPropertyId = searchParams.get('propertyId') || '';
  const queryClient = useQueryClient();

  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [category, setCategory] = useState('ELECTRICITY_ECG');
  const [title, setTitle] = useState('ECG Prepaid Token Recharge');
  const [totalAmount, setTotalAmount] = useState('300');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('Send via MTN MoMo: 054-XXXXXXX');
  const [participants, setParticipants] = useState<Array<{ userName: string; userPhone: string; shareAmount: string }>>([
    { userName: '', userPhone: '', shareAmount: '150' }
  ]);

  // Current User Query
  const { data: userData } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data?.user || res.data;
    }
  });

  // Fetch Public or Active Tenancy Properties
  const { data: propertiesData, isLoading: loadingProperties } = useQuery({
    queryKey: ['properties', 'public-catalog'],
    queryFn: async () => {
      const res = await api.get('/properties');
      return res.data;
    }
  });

  const propertyList: PropertyOption[] = (propertiesData?.properties || propertiesData?.data || [])
    .map((p: any) => ({
      id: p.id,
      title: p.title || 'Residential Residence',
      location: p.location || ''
    }));

  useEffect(() => {
    if (!propertyId && propertyList.length > 0) {
      setPropertyId(initialPropertyId || propertyList[0].id);
    }
  }, [propertyList, propertyId, initialPropertyId]);

  // Auto-split calculation
  const handleAutoSplit = (customTotal?: string) => {
    const rawVal = customTotal !== undefined ? customTotal : totalAmount;
    const total = parseFloat(rawVal);
    if (!total || isNaN(total) || participants.length === 0) return;
    const totalPeople = participants.length + 1; // +1 for creator
    const equalShare = (total / totalPeople).toFixed(2);
    setParticipants(prev => prev.map(p => ({ ...p, shareAmount: equalShare })));
  };

  const handleSelectPreset = (preset: typeof UTILITY_PRESETS[0]) => {
    setCategory(preset.id);
    setTitle(preset.defaultTitle);
    if (preset.suggestedAmounts.length > 0) {
      const firstAmt = preset.suggestedAmounts[1].toString();
      setTotalAmount(firstAmt);
      handleAutoSplit(firstAmt);
    }
    if (preset.noteHint) {
      setNotes(preset.noteHint);
    }
  };

  const addParticipant = () => {
    setParticipants(prev => {
      const updated = [...prev, { userName: '', userPhone: '', shareAmount: '' }];
      const total = parseFloat(totalAmount);
      if (total && !isNaN(total)) {
        const share = (total / (updated.length + 1)).toFixed(2);
        return updated.map(p => ({ ...p, shareAmount: share }));
      }
      return updated;
    });
  };

  const removeParticipant = (index: number) => {
    if (participants.length <= 1) {
      toast.error('At least one roommate participant is required');
      return;
    }
    const updated = participants.filter((_, i) => i !== index);
    setParticipants(updated);
    const total = parseFloat(totalAmount);
    if (total && !isNaN(total)) {
      const share = (total / (updated.length + 1)).toFixed(2);
      setParticipants(updated.map(p => ({ ...p, shareAmount: share })));
    }
  };

  const updateParticipant = (index: number, field: string, value: string) => {
    const updated = [...participants];
    (updated[index] as any)[field] = value;
    setParticipants(updated);
  };

  const createSplitMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/bill-splits', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Bill split created! Roommates can now view and settle.');
      queryClient.invalidateQueries({ queryKey: ['billSplits', 'tenant'] });
      router.push('/dashboard/tenant?tab=payments');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create bill split');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!propertyId) {
      toast.error('Please select the residential property');
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter a descriptive bill title');
      return;
    }
    const numAmount = parseFloat(totalAmount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Please enter a valid bill total in GH₵');
      return;
    }
    const validParticipants = participants.filter(p => p.userName.trim());
    if (validParticipants.length === 0) {
      toast.error('Please add at least one roommate participant name');
      return;
    }

    createSplitMutation.mutate({
      propertyId,
      title: title.trim(),
      category,
      totalAmount: numAmount,
      dueDate: dueDate || null,
      notes: notes.trim(),
      participants: validParticipants.map(p => ({
        userName: p.userName.trim(),
        userPhone: p.userPhone.trim() || null,
        shareAmount: parseFloat(p.shareAmount) || parseFloat((numAmount / (validParticipants.length + 1)).toFixed(2))
      }))
    });
  };

  const numTotal = parseFloat(totalAmount) || 0;
  const creatorShare = (numTotal / (participants.length + 1)).toFixed(2);

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0D0F12] pb-24 pt-4 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* ── Breadcrumbs & Header ── */}
      <div className="mb-6 space-y-3 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          <Link href="/dashboard/tenant" className="hover:text-[#0F5132] dark:hover:text-emerald-400 transition">
            Resident Portal
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <Link href="/dashboard/tenant?tab=payments" className="hover:text-[#0F5132] dark:hover:text-emerald-400 transition">
            Escrow & Payments
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-900 dark:text-zinc-200 font-bold">Split Utility Bill</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <DollarSign className="w-5 h-5" />
              </span>
              Split Utility Expense
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Equally divide ECG prepaid tokens, water tanker deliveries, or WiFi subscriptions with your flatmates.
            </p>
          </div>

          <Link
            href="/dashboard/tenant?tab=payments"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14181E] text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel & Return
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Form Fields */}
        <div className="lg:col-span-7 space-y-6">
          {/* Property Selector */}
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
              Residential Property
            </h2>
            <div>
              {loadingProperties ? (
                <div className="h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F5132]/30 cursor-pointer"
                >
                  {propertyList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.location ? `· ${p.location}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Utility Presets */}
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                1. Select Common Utility
              </span>
              <span className="text-[10px] text-zinc-400">Auto-fills typical cost</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {UTILITY_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = category === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 text-[#0F5132] dark:text-emerald-300 ring-2 ring-[#0F5132]/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-1.5 rounded-lg border ${preset.badgeColor}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />}
                    </div>
                    <span className="text-xs font-bold leading-tight">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bill Details */}
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              2. Bill Information
            </h2>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Title / Item Description *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. ECG Prepaid Sub-meter Recharge"
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F5132]/30"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Total Bill Amount (GH₵) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-zinc-400">GH₵</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={totalAmount}
                    onChange={(e) => {
                      setTotalAmount(e.target.value);
                      handleAutoSplit(e.target.value);
                    }}
                    placeholder="300"
                    className="w-full pl-12 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F5132]/30"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Target Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F5132]/30"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Payment Instructions (MoMo Details)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Send to MTN MoMo: 0244XXXXXX (Name) or Pay via Telecel Cash..."
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F5132]/30"
              />
            </div>
          </div>

          {/* Roommates Participants */}
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  3. Roommate Participants ({participants.length + 1} People Total)
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  You (Creator) are automatically included for 1 equal share.
                </p>
              </div>
              <button
                type="button"
                onClick={addParticipant}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Roommate
              </button>
            </div>

            {/* Creator Row */}
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#0F5132] text-white flex items-center justify-center font-bold text-[10px]">
                  You
                </div>
                <div>
                  <div className="font-bold text-zinc-900 dark:text-white">
                    {userData?.firstName || 'Host Resident'} (Organizer)
                  </div>
                  <div className="text-[10px] text-zinc-500">Your calculated contribution share</div>
                </div>
              </div>
              <div className="font-mono font-bold text-sm text-[#0F5132] dark:text-emerald-400">
                GH₵ {creatorShare}
              </div>
            </div>

            {/* Dynamic Roommate Rows */}
            <div className="space-y-2.5">
              {participants.map((p, idx) => (
                <div key={idx} className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Roommate #{idx + 1}
                    </span>
                    {participants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeParticipant(idx)}
                        className="text-zinc-400 hover:text-rose-500 text-xs transition cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      value={p.userName}
                      onChange={(e) => updateParticipant(idx, 'userName', e.target.value)}
                      placeholder="Roommate name"
                      className="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-900 dark:text-white outline-none"
                    />
                    <input
                      type="tel"
                      value={p.userPhone}
                      onChange={(e) => updateParticipant(idx, 'userPhone', e.target.value)}
                      placeholder="MoMo Phone (optional)"
                      className="px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-medium text-zinc-900 dark:text-white outline-none"
                    />
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-[11px] font-bold text-zinc-400">GH₵</span>
                      <input
                        type="number"
                        step="any"
                        value={p.shareAmount}
                        onChange={(e) => updateParticipant(idx, 'shareAmount', e.target.value)}
                        placeholder="Share"
                        className="w-full pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Breakdown & Submit (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
              Split Breakdown Summary
            </span>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl space-y-3 border border-zinc-200/80 dark:border-zinc-800">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Total Bill Amount:</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-white">GH₵ {numTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Split Mode:</span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Equal Division</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Participants:</span>
                <span className="font-semibold">{participants.length + 1} People</span>
              </div>
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">Calculated Per Person:</span>
                <span className="font-mono font-black text-base text-[#0F5132] dark:text-emerald-400">
                  GH₵ {creatorShare}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleAutoSplit()}
              className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5 text-zinc-500" />
              <span>Recalculate Equal Shares</span>
            </button>
          </div>

          {/* Submit Action */}
          <div>
            <button
              type="submit"
              disabled={createSplitMutation.isPending}
              className="w-full py-3.5 bg-[#0F5132] hover:bg-[#0B3D26] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {createSplitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating Split Request...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" /> Create Bill Split & Share
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewBillSplitPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
      </div>
    }>
      <BillSplitterContent />
    </Suspense>
  );
}
