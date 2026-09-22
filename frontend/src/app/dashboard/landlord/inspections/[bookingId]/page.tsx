'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  DollarSign,
  Loader2,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
  Building,
  User,
  Calendar,
  Camera,
  Info,
  Save,
  Check,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  condition: 'GOOD' | 'FAIR' | 'DAMAGED';
  notes: string;
}

const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: '1', name: 'Room & Compound Keys Handover', category: 'Access & Security', condition: 'GOOD', notes: '' },
  { id: '2', name: 'Wall Paint, Plaster & Ceiling Finish', category: 'Walls & Structure', condition: 'GOOD', notes: '' },
  { id: '3', name: 'Lighting, Sockets & Ceiling Fan Regulator', category: 'Electrical & Power', condition: 'GOOD', notes: '' },
  { id: '4', name: 'Prepaid Sub-Meter Display & Reading', category: 'Utilities', condition: 'GOOD', notes: '' },
  { id: '5', name: 'Bathroom Plumbing, Faucets & Shower Flow', category: 'Plumbing', condition: 'GOOD', notes: '' },
  { id: '6', name: 'Toilet Flush Mechanism & Seat Condition', category: 'Plumbing', condition: 'GOOD', notes: '' },
  { id: '7', name: 'Bed Frame, Mattress & Wardrobe Hinges', category: 'Furnishings', condition: 'GOOD', notes: '' },
  { id: '8', name: 'Window Latches, Glass & Mosquito Netting', category: 'Windows & Doors', condition: 'GOOD', notes: '' },
  { id: '9', name: 'Floor Tiles, Grouting & Room Cleanliness', category: 'Cleanliness & Flooring', condition: 'GOOD', notes: '' }
];

export default function InspectionDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const resolvedParams = use(params);
  const bookingId = resolvedParams.bookingId;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [type, setType] = useState<'MOVE_IN' | 'MOVE_OUT'>('MOVE_IN');
  const [items, setItems] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST_ITEMS);
  const [generalNotes, setGeneralNotes] = useState('');
  const [cautionDeduction, setCautionDeduction] = useState('0');
  const [deductionReason, setDeductionReason] = useState('');

  // Fetch Landlord Bookings to find this booking
  const { data: landlordBookingsData, isLoading: isBookingLoading } = useQuery({
    queryKey: ['bookings', 'landlord'],
    queryFn: async () => {
      const res = await api.get('/bookings/landlord');
      return res.data;
    }
  });

  const bookingsList: any[] = landlordBookingsData?.bookings || [];
  const booking = bookingsList.find((b: any) => b.id === bookingId);

  // Fetch Existing Inspections for this booking
  const { data: inspectionData, isLoading: isInspectionLoading } = useQuery({
    queryKey: ['inspections', bookingId],
    queryFn: async () => {
      const res = await api.get(`/inspections/booking/${bookingId}`);
      return res.data;
    },
    enabled: Boolean(bookingId)
  });

  // Load existing inspection if present for the selected type
  useEffect(() => {
    if (inspectionData?.inspections) {
      const existing = inspectionData.inspections.find((i: any) => i.type === type);
      if (existing) {
        if (Array.isArray(existing.items) && existing.items.length > 0) {
          setItems(existing.items);
        }
        if (existing.notes) setGeneralNotes(existing.notes);
        if (existing.cautionDepositDeduction !== undefined) {
          setCautionDeduction(String(existing.cautionDepositDeduction));
        }
        if (existing.deductionReason) setDeductionReason(existing.deductionReason);
      } else {
        setItems(DEFAULT_CHECKLIST_ITEMS);
        setGeneralNotes('');
        setCautionDeduction('0');
        setDeductionReason('');
      }
    }
  }, [type, inspectionData]);

  const saveInspectionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/inspections', payload);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || 'Inspection checklist successfully recorded and signed.');
      queryClient.invalidateQueries({ queryKey: ['inspections', bookingId] });
      router.push('/dashboard/landlord?tab=bookings');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save inspection report.');
    }
  });

  const updateItemCondition = (id: string, condition: 'GOOD' | 'FAIR' | 'DAMAGED') => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, condition } : item)));
  };

  const updateItemNotes = (id: string, notes: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, notes } : item)));
  };

  const cautionDepositAmount = booking?.property?.cautionDeposit || 0;
  const parsedDeduction = parseFloat(cautionDeduction || '0');
  const netRefund = Math.max(0, cautionDepositAmount - parsedDeduction);

  const damagedCount = items.filter(i => i.condition === 'DAMAGED').length;
  const fairCount = items.filter(i => i.condition === 'FAIR').length;
  const goodCount = items.filter(i => i.condition === 'GOOD').length;

  if (isBookingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Breadcrumbs & Header ── */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
          <Link href="/dashboard/landlord" className="hover:text-emerald-600 transition">
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/dashboard/landlord?tab=bookings" className="hover:text-emerald-600 transition">
            Tenancies
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 dark:text-zinc-200">Room Inspection</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ClipboardCheck className="w-6 h-6" />
              </span>
              Digital Room Condition Inspection
            </h1>
            <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1">
              Legally binding condition record for move-in handover or move-out caution deposit settlement.
            </p>
          </div>

          <Link
            href="/dashboard/landlord"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Link>
        </div>
      </div>

      {/* ── Type Selector Tabs ── */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType('MOVE_IN')}
            className={clsx(
              'px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer',
              type === 'MOVE_IN'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            )}
          >
            <CheckCircle2 className="w-4 h-4" /> Move-In Handover Inspection
          </button>

          <button
            type="button"
            onClick={() => setType('MOVE_OUT')}
            className={clsx(
              'px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer',
              type === 'MOVE_OUT'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
            )}
          >
            <AlertTriangle className="w-4 h-4" /> Move-Out Checkout Inspection
          </button>
        </div>

        {/* Quick Tally */}
        <div className="flex items-center gap-3 px-3 text-xs font-bold">
          <span className="text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {goodCount} Good
          </span>
          <span className="text-amber-500 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> {fairCount} Wear
          </span>
          <span className="text-red-500 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" /> {damagedCount} Damaged
          </span>
        </div>
      </div>

      {/* ── Main 2-Column Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Rail: Room Checklist (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-7 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
                Room Fixture & Amenity Verification
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect each item in person with the tenant present. Mark condition and log any defects.
              </p>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40 space-y-3 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-slate-950 dark:text-white block">
                        {item.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateItemCondition(item.id, 'GOOD')}
                        className={clsx(
                          'px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer',
                          item.condition === 'GOOD'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'
                        )}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Good
                      </button>

                      <button
                        type="button"
                        onClick={() => updateItemCondition(item.id, 'FAIR')}
                        className={clsx(
                          'px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer',
                          item.condition === 'FAIR'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'
                        )}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Fair
                      </button>

                      <button
                        type="button"
                        onClick={() => updateItemCondition(item.id, 'DAMAGED')}
                        className={clsx(
                          'px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer',
                          item.condition === 'DAMAGED'
                            ? 'bg-red-600 text-white shadow-xs'
                            : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300'
                        )}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Damaged
                      </button>
                    </div>
                  </div>

                  {/* Optional Item Specific Notes */}
                  {(item.condition === 'FAIR' || item.condition === 'DAMAGED' || item.notes) && (
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => updateItemNotes(item.id, e.target.value)}
                      placeholder={`Notes regarding ${item.name.toLowerCase()} (e.g. slight scratch or dent)...`}
                      className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* General Handover Notes */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                General Handover / Sign-Off Remarks
              </label>
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                rows={3}
                placeholder="Log meter starting units, number of keys handed over, or agreement on minor touch-ups..."
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/40"
              />
            </div>
          </div>
        </div>

        {/* Right Rail: Caution Deposit & Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Tenancy Record Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" /> Tenancy Record
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                <span>Property:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {booking?.property?.title || 'Rental Unit'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                <span>Tenant:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {booking?.tenant?.firstName} {booking?.tenant?.lastName}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                <span>Tenancy Term:</span>
                <span className="font-mono text-slate-700 dark:text-zinc-300">
                  {booking ? `${new Date(booking.startDate).toLocaleDateString()} — ${new Date(booking.endDate).toLocaleDateString()}` : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-zinc-400">
                <span>Security / Caution Deposit:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  GHS {cautionDepositAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Move-Out Caution Deposit Settlement Panel */}
          {type === 'MOVE_OUT' && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-red-200 dark:border-red-900/50 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Caution Deposit Settlement
                </h3>
                <span className="text-[11px] font-bold text-slate-400">Held in Escrow</span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1">
                    Deduction for Repairs (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={cautionDepositAmount}
                    value={cautionDeduction}
                    onChange={(e) => setCautionDeduction(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl font-bold text-red-600 outline-none focus:ring-2 focus:ring-red-500/30 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1">
                    Repair Justification Reason
                  </label>
                  <input
                    type="text"
                    value={deductionReason}
                    onChange={(e) => setDeductionReason(e.target.value)}
                    placeholder="e.g. Repainting stained wall & replacement lock"
                    className="w-full p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500/30"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center text-xs">
                  <span className="text-slate-600 dark:text-zinc-400">Tenant Deposit Refund:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                    GHS {netRefund.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Submission Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            <button
              type="button"
              disabled={saveInspectionMutation.isPending || !bookingId}
              onClick={() => {
                saveInspectionMutation.mutate({
                  bookingId,
                  type,
                  items,
                  notes: generalNotes,
                  cautionDepositDeduction: parseFloat(cautionDeduction || '0'),
                  deductionReason: deductionReason || null
                });
              }}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {saveInspectionMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Saving & Signing Inspection...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" /> Save & Sign Inspection Report
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Upon saving, a digital notification and timestamped copy will be generated for the tenant and logged in the property records.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
