'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
  Building,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Calculator,
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
    defaultTitle: 'ECG Prepaid Token Recharge',
    suggestedAmounts: [100, 200, 300, 500],
    noteHint: 'Includes sub-meter service charge. Token PIN will be shared once loaded.'
  },
  {
    id: 'WATER_TANKER',
    label: 'Water Tanker Delivery',
    icon: Droplets,
    defaultTitle: 'Commercial Water Tanker (3000L)',
    suggestedAmounts: [250, 350, 450, 600],
    noteHint: 'For overhead storage polytank filling.'
  },
  {
    id: 'INTERNET_WIFI',
    label: 'Shared Fiber WiFi',
    icon: Wifi,
    defaultTitle: 'Monthly Unlimited Fiber WiFi Subscription',
    suggestedAmounts: [250, 300, 400, 500],
    noteHint: 'Monthly renewal for Telecel / MTN Fibre broadband router.'
  },
  {
    id: 'GAS_REFILL',
    label: 'Cooking Gas Cylinder',
    icon: Flame,
    defaultTitle: '14.5kg LPG Cooking Gas Refill',
    suggestedAmounts: [180, 220, 260, 300],
    noteHint: 'Shared kitchen gas cylinder refill + transport fee.'
  },
  {
    id: 'CLEANING',
    label: 'Sanitation & Trash',
    icon: Trash2,
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

  const [step, setStep] = useState(1);
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [category, setCategory] = useState('ELECTRICITY_ECG');
  const [title, setTitle] = useState('ECG Prepaid Token Recharge');
  const [totalAmount, setTotalAmount] = useState('300');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('Send via MTN MoMo: 054-XXXXXXX');
  const [participants, setParticipants] = useState<Array<{ userName: string; userPhone: string; shareAmount: string }>>([
    { userName: '', userPhone: '', shareAmount: '150.00' }
  ]);

  const { data: userData } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data?.user || res.data;
    }
  });

  const { data: bookingsData, isLoading: loadingProperties } = useQuery({
    queryKey: ['tenant', 'bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings/me');
      return res.data;
    }
  });

  const propertyList: PropertyOption[] = (bookingsData?.bookings || [])
    .filter((b: any) => !['CANCELLED', 'REJECTED'].includes(b.status))
    .map((b: any) => ({
      id: b.propertyId || b.property?.id,
      title: b.property?.title || 'Booked Residence',
      location: b.property?.location || ''
    }))
    .filter((p: PropertyOption) => Boolean(p.id));

  useEffect(() => {
    if (!propertyId && propertyList.length > 0) {
      setPropertyId(initialPropertyId || propertyList[0].id);
    }
  }, [propertyList, propertyId, initialPropertyId]);

  const handleAutoSplit = (customTotal?: string) => {
    const rawVal = customTotal !== undefined ? customTotal : totalAmount;
    const total = parseFloat(rawVal);
    if (!total || isNaN(total) || participants.length === 0) return;
    const totalPeople = participants.length + 1;
    const equalShare = (total / totalPeople).toFixed(2);
    setParticipants((prev) => prev.map((p) => ({ ...p, shareAmount: equalShare })));
  };

  const handleSelectPreset = (preset: (typeof UTILITY_PRESETS)[0]) => {
    setCategory(preset.id);
    setTitle(preset.defaultTitle);
    if (preset.suggestedAmounts.length > 1) {
      const firstAmt = preset.suggestedAmounts[1].toString();
      setTotalAmount(firstAmt);
      handleAutoSplit(firstAmt);
    }
    if (preset.noteHint) {
      setNotes(preset.noteHint);
    }
  };

  const addParticipant = () => {
    setParticipants((prev) => {
      const updated = [...prev, { userName: '', userPhone: '', shareAmount: '' }];
      const total = parseFloat(totalAmount);
      if (total && !isNaN(total)) {
        const share = (total / (updated.length + 1)).toFixed(2);
        return updated.map((p) => ({ ...p, shareAmount: share }));
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
    const total = parseFloat(totalAmount);
    if (total && !isNaN(total)) {
      const share = (total / (updated.length + 1)).toFixed(2);
      setParticipants(updated.map((p) => ({ ...p, shareAmount: share })));
    } else {
      setParticipants(updated);
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

  const handleNextStep = () => {
    if (step === 1 && !propertyId) {
      toast.error('Please select your residential property');
      return;
    }
    if (step === 2) {
      if (!title.trim()) {
        toast.error('Please enter a bill title');
        return;
      }
      const numAmount = parseFloat(totalAmount);
      if (!numAmount || numAmount <= 0) {
        toast.error('Please enter a valid total bill amount');
        return;
      }
    }
    if (step === 3) {
      const validParticipants = participants.filter((p) => p.userName.trim());
      if (validParticipants.length === 0) {
        toast.error('Please enter at least one roommate name');
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      handleNextStep();
      return;
    }
    const numAmount = parseFloat(totalAmount);
    const validParticipants = participants.filter((p) => p.userName.trim());
    if (!propertyId || !title.trim() || !numAmount || validParticipants.length === 0) {
      toast.error('Please complete all required fields before submitting');
      return;
    }

    createSplitMutation.mutate({
      propertyId,
      title: title.trim(),
      category,
      totalAmount: numAmount,
      dueDate: dueDate || null,
      notes: notes.trim(),
      participants: validParticipants.map((p) => ({
        userName: p.userName.trim(),
        userPhone: p.userPhone.trim() || null,
        shareAmount: parseFloat(p.shareAmount) || parseFloat((numAmount / (validParticipants.length + 1)).toFixed(2))
      }))
    });
  };

  const numTotal = parseFloat(totalAmount) || 0;
  const creatorShare = (numTotal / (participants.length + 1)).toFixed(2);
  const selectedProperty = propertyList.find((p) => p.id === propertyId);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6 pb-24">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard/tenant?tab=payments')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Escrow &amp; Payments
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Split Shared Utility Expense
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Divide ECG prepaid tokens, water tanker deliveries, or WiFi bills transparently among flatmates.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 w-fit">
            Step {step} of 4
          </span>
        </div>
      </div>

      {/* 4-Step Segmented Bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { num: 1, label: '1. Residence & Utility' },
          { num: 2, label: '2. Bill Amount & Terms' },
          { num: 3, label: '3. Roommate Shares' },
          { num: 4, label: '4. Review & Split Bill' }
        ].map((s) => {
          const active = step === s.num;
          const completed = step > s.num;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num < step) setStep(s.num);
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                active
                  ? 'border-[#0F5132] bg-emerald-50/50 dark:bg-emerald-950/20 text-[#0F5132] dark:text-emerald-400'
                  : completed
                  ? 'border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-[#12151D] text-zinc-800 dark:text-zinc-200'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] text-zinc-400'
              }`}
            >
              <div className="text-[11px] font-bold truncate">{s.label}</div>
              <div className="h-1 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    active || completed ? 'w-full bg-[#0F5132] dark:bg-emerald-500' : 'w-0'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Residence & Utility */}
        {step === 1 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Select Residence &amp; Utility Category
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Choose the compound and the type of shared utility bill you are splitting.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Residential Property *
              </label>
              {loadingProperties ? (
                <div className="h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                >
                  {propertyList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.location ? `· ${p.location}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2.5">
                Common Utility Preset *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {UTILITY_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = category === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 text-[#0F5132] dark:text-emerald-300 ring-2 ring-[#0F5132]/20'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[#0F5132] dark:text-emerald-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />}
                      </div>
                      <span className="text-xs font-bold leading-tight">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Bill Amount & Terms */}
        {step === 2 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Bill Amount &amp; Remittance Instructions
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Specify the total amount in Ghana Cedis (GH₵) and how roommates should send their share.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Bill Title / Description *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. ECG Prepaid Sub-meter Recharge"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Total Bill Amount (GH₵) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-xs font-bold text-zinc-400">GH₵</span>
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
                      className="w-full pl-12 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Target Due Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Payment Instructions (MoMo Number / Account Name)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Send to MTN MoMo: 0244XXXXXX (Name) or Pay via Telecel Cash..."
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Roommate Shares */}
        {step === 3 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                  Roommate Participants ({participants.length + 1} People Total)
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  You (Organizer) are automatically included for 1 equal share.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAutoSplit()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  <Calculator className="w-3.5 h-3.5" /> Equalize Shares
                </button>
                <button
                  type="button"
                  onClick={addParticipant}
                  className="inline-flex items-center gap-1 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Roommate
                </button>
              </div>
            </div>

            {/* Organizer Row */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[#0F5132] text-white flex items-center justify-center font-bold text-[10px]">
                  You
                </div>
                <div>
                  <div className="font-bold text-zinc-900 dark:text-white">
                    {userData?.firstName || 'Host Resident'} (Organizer)
                  </div>
                  <div className="text-[11px] text-zinc-500">Your calculated equal share</div>
                </div>
              </div>
              <div className="font-mono font-bold text-sm text-[#0F5132] dark:text-emerald-400">
                GH₵ {creatorShare}
              </div>
            </div>

            {/* Roommate Rows */}
            <div className="space-y-3">
              {participants.map((p, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Roommate #{idx + 1}
                    </span>
                    {participants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeParticipant(idx)}
                        className="text-zinc-400 hover:text-rose-500 text-xs font-bold transition cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      required
                      value={p.userName}
                      onChange={(e) => updateParticipant(idx, 'userName', e.target.value)}
                      placeholder="Roommate full name *"
                      className="px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none"
                    />
                    <input
                      type="tel"
                      value={p.userPhone}
                      onChange={(e) => updateParticipant(idx, 'userPhone', e.target.value)}
                      placeholder="MoMo Phone (optional)"
                      className="px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-medium text-zinc-900 dark:text-white outline-none"
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-[11px] font-bold text-zinc-400">GH₵</span>
                      <input
                        type="number"
                        step="any"
                        value={p.shareAmount}
                        onChange={(e) => updateParticipant(idx, 'shareAmount', e.target.value)}
                        placeholder="Share"
                        className="w-full pl-10 pr-3 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-900 dark:text-white outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Review & Split Bill */}
        {step === 4 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Review Utility Split Breakdown
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Confirm the bill total and individual roommate shares before publishing to the residence ledger.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Utility &amp; Residence</span>
                <div className="font-bold text-zinc-900 dark:text-white">{title}</div>
                <div className="text-zinc-500">{selectedProperty?.title || 'Selected Residence'}</div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total &amp; Per-Person Share</span>
                <div className="font-mono font-bold text-zinc-900 dark:text-white">
                  Total: GH₵ {numTotal.toFixed(2)}
                </div>
                <div className="font-mono text-[#0F5132] dark:text-emerald-400 font-bold">
                  Each ({participants.length + 1} people): GH₵ {creatorShare}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Participant Breakdown
              </div>
              {participants.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-zinc-200/60 dark:border-zinc-800 last:border-none">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {p.userName || `Roommate #${i + 1}`} {p.userPhone ? `(${p.userPhone})` : ''}
                  </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-white">
                    GH₵ {Number(p.shareAmount || creatorShare).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Horizontal Summary Bar */}
        <div className="bg-zinc-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
              Utility Split Summary
            </div>
            <div className="text-sm font-bold">
              {title} &bull; {participants.length + 1} Flatmates
            </div>
          </div>
          <div className="text-right font-mono">
            <span className="text-xs text-zinc-400 block">Per Person Share</span>
            <span className="text-base font-black text-emerald-400">GH₵ {creatorShare}</span>
          </div>
        </div>

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Step
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={createSplitMutation.isPending}
              className="px-6 py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              {createSplitMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating Split Request...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" /> Create Bill Split &amp; Share
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function NewBillSplitPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        </div>
      }
    >
      <BillSplitterContent />
    </Suspense>
  );
}
