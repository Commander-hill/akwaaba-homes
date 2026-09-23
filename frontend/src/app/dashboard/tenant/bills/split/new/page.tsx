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
  ShieldCheck,
  Send,
  Loader2,
  Calculator,
  MessageSquareShare
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
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    defaultTitle: 'ECG Prepaid Token Recharge',
    suggestedAmounts: [100, 200, 300, 500],
    noteHint: 'Includes sub-meter service charge. Token will be shared in WhatsApp group once loaded.'
  },
  {
    id: 'WATER_TANKER',
    label: 'Water Tanker Delivery',
    icon: Droplets,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    defaultTitle: 'Commercial Water Tanker (3000L)',
    suggestedAmounts: [250, 350, 450, 600],
    noteHint: 'For overhead storage polytank filling. Delivery expected today.'
  },
  {
    id: 'INTERNET_WIFI',
    label: 'Shared Fiber WiFi',
    icon: Wifi,
    color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    defaultTitle: 'Monthly Unlimited Fiber WiFi Subscription',
    suggestedAmounts: [250, 300, 400, 500],
    noteHint: 'Monthly renewal for Telecel/MTN Fibre broadband router.'
  },
  {
    id: 'GAS_REFILL',
    label: 'Cooking Gas Cylinder',
    icon: Flame,
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    defaultTitle: '14.5kg LPG Cooking Gas Refill',
    suggestedAmounts: [180, 220, 260, 300],
    noteHint: 'Shared kitchen gas cylinder refill + transport fee.'
  },
  {
    id: 'CLEANING',
    label: 'Sanitation & Trash',
    icon: Trash2,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    defaultTitle: 'Compound Trash Collection & Cleaning',
    suggestedAmounts: [80, 120, 150, 200],
    noteHint: 'Zoomlion monthly waste pickup and shared corridor cleaning.'
  },
  {
    id: 'OTHER',
    label: 'Other Shared Expense',
    icon: DollarSign,
    color: 'text-slate-500 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800',
    defaultTitle: 'Compound Shared Utility / Repair',
    suggestedAmounts: [50, 100, 200, 400],
    noteHint: 'State item details and send confirmation receipt.'
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
  const [notes, setNotes] = useState('Send to MTN MoMo: 054-XXXXXXX (Kwame)');
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

  // Extract valid properties list
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
    const totalPeople = participants.length + 1; // +1 for the creator
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
      router.push('/dashboard/tenant');
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

  const selectedPreset = UTILITY_PRESETS.find(p => p.id === category) || UTILITY_PRESETS[0];
  const numTotal = parseFloat(totalAmount) || 0;
  const creatorShare = (numTotal / (participants.length + 1)).toFixed(2);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Header / Breadcrumb */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Link href="/dashboard/tenant" className="hover:text-primary flex items-center gap-1 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Tenant Dashboard
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 dark:text-white font-bold">New Shared Utility Split</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="w-3.5 h-3.5" /> Fair Roommate Settlement
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Page Hero */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden mb-8">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
            <Calculator className="w-72 h-72" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <DollarSign className="w-3.5 h-3.5" /> Roommate Utility Ledger
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Create Shared Utility & Expense Split
            </h1>
            <p className="text-emerald-100 text-sm leading-relaxed">
              Fairly split ECG prepaid electricity tokens, bulk water tanker deliveries, fiber internet, or LPG refills. Send instant share notifications to roommates with your Mobile Money payment details.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form Fields */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Property Selection */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-500" />
                Select Compound / Rental Unit
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Rental Property
                </label>
                {loadingProperties ? (
                  <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ) : (
                  <select
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {propertyList.length === 0 && (
                      <option value="">No registered rental property found</option>
                    )}
                    {propertyList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.location ? `— ${p.location}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  Select the residence where this utility or service was purchased.
                </p>
              </div>
            </div>

            {/* 2. Utility Presets */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Choose Utility Category
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {UTILITY_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = category === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl w-fit ${preset.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {preset.label}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {preset.suggestedAmounts.map(a => `GH₵${a}`).join(' • ')}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Expense Details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Expense & Amount Breakdown
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bill Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. ECG Prepaid 200 Units (East Wing)"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Total Bill Amount (GH₵) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                      GH₵
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={totalAmount}
                      onChange={(e) => {
                        setTotalAmount(e.target.value);
                        handleAutoSplit(e.target.value);
                      }}
                      placeholder="0.00"
                      className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Quick suggestion amounts */}
              {selectedPreset.suggestedAmounts.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-400">Quick Amounts:</span>
                  {selectedPreset.suggestedAmounts.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setTotalAmount(amt.toString());
                        handleAutoSplit(amt.toString());
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 transition"
                    >
                      GH₵ {amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAutoSplit()}
                    className="ml-auto inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition"
                  >
                    <Calculator className="w-3.5 h-3.5" /> Auto-Split Evenly
                  </button>
                </div>
              )}

              {/* Due Date & Settlement notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Settlement Due Date (Optional)
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Instructions / MoMo Wallet
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Send to MTN MoMo: 054-XXXXXXX (Kwame)"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. Roommate Participants */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-500" />
                    Roommate & Co-Tenant Participants
                  </h2>
                  <p className="text-xs text-slate-500">
                    Your share is automatically computed alongside each roommate.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addParticipant}
                  className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl hover:bg-emerald-500/20 transition flex items-center gap-1.5 w-fit"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Roommate
                </button>
              </div>

              {/* Creator row display */}
              <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                    You
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {userData?.firstName ? `${userData.firstName} ${userData.lastName || ''} (Organizer)` : 'Your Share'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Co-tenant / Utility purchaser
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    GH₵ {creatorShare}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Your equal portion</span>
                </div>
              </div>

              {/* Dynamic Roommate rows */}
              <div className="space-y-3">
                {participants.map((p, index) => (
                  <div
                    key={index}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>Roommate #{index + 1}</span>
                      {participants.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeParticipant(index)}
                          className="text-rose-500 hover:text-rose-700 text-xs flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <input
                          type="text"
                          placeholder="Roommate Name (e.g. Kofi Boateng)"
                          value={p.userName}
                          onChange={(e) => updateParticipant(index, 'userName', e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="tel"
                          placeholder="Ghana MoMo Phone (024/054...)"
                          value={p.userPhone}
                          onChange={(e) => updateParticipant(index, 'userPhone', e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          GH₵
                        </span>
                        <input
                          type="number"
                          step="any"
                          placeholder="Share"
                          value={p.shareAmount}
                          onChange={(e) => updateParticipant(index, 'shareAmount', e.target.value)}
                          className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-black outline-none focus:ring-2 focus:ring-emerald-500"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Summary & Settlement Preview */}
          <div className="lg:col-span-4 space-y-6">
            {/* Calculation Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 sticky top-24">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-500" /> Split Summary
              </h3>

              <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Expense Category:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedPreset.label}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Total Bill:</span>
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    GH₵ {numTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Total Participants:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {participants.length + 1} people (You + {participants.length} roommates)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-emerald-600 dark:text-emerald-400">
                  <span className="font-bold">Equal Share / Person:</span>
                  <span className="text-sm font-black">
                    GH₵ {creatorShare}
                  </span>
                </div>
              </div>

              {/* WhatsApp Notification Message Preview */}
              <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3.5 space-y-2 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <MessageSquareShare className="w-4 h-4" /> WhatsApp Broadcast Preview
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono leading-relaxed bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  Hi Roommates! 👋 <br />
                  A shared expense for <strong>{title || 'Utility'}</strong> of <strong>GH₵ {numTotal.toFixed(2)}</strong> has been logged. <br />
                  Your share is <strong>GH₵ {creatorShare}</strong>. <br />
                  {notes ? `Payment Info: ${notes}` : 'Please send via MoMo to settle.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={createSplitMutation.isPending}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {createSplitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating Ledger...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Publish Expense Split
                    </>
                  )}
                </button>

                <Link
                  href="/dashboard/tenant"
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center transition"
                >
                  Cancel & Return
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewBillSplitPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <BillSplitterContent />
    </Suspense>
  );
}
