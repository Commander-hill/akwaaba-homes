'use client';

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  ClipboardCheck, CheckCircle2, AlertTriangle, XCircle, 
  DollarSign, FileSignature, Loader2, Camera, ShieldCheck
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
  { id: '1', name: 'Room & Compound Keys Handover', category: 'Access', condition: 'GOOD', notes: '' },
  { id: '2', name: 'Wall Paint & Surface Condition', category: 'Walls & Ceiling', condition: 'GOOD', notes: '' },
  { id: '3', name: 'Lighting, Ceiling Fan & Sockets', category: 'Electrical', condition: 'GOOD', notes: '' },
  { id: '4', name: 'Bathroom Plumbing, Faucets & Shower', category: 'Plumbing', condition: 'GOOD', notes: '' },
  { id: '5', name: 'Bed Frame, Mattress & Wardrobe', category: 'Furnishing', condition: 'GOOD', notes: '' },
  { id: '6', name: 'Windows, Mosquito Nets & Door Locks', category: 'Windows & Doors', condition: 'GOOD', notes: '' },
  { id: '7', name: 'Room Cleanliness & Odor', category: 'Cleanliness', condition: 'GOOD', notes: '' }
];

interface InspectionModalProps {
  booking: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function InspectionModal({ booking, isOpen, onClose }: InspectionModalProps) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<'MOVE_IN' | 'MOVE_OUT'>('MOVE_IN');
  const [items, setItems] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST_ITEMS);
  const [generalNotes, setGeneralNotes] = useState('');
  const [cautionDeduction, setCautionDeduction] = useState('0');
  const [deductionReason, setDeductionReason] = useState('');

  const { data: existingData, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['inspections', booking?.id],
    queryFn: async () => {
      if (!booking?.id) return null;
      const res = await api.get(`/inspections/booking/${booking.id}`);
      return res.data;
    },
    enabled: Boolean(booking?.id) && isOpen
  });

  const saveInspectionMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/inspections', payload);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || 'Inspection report saved!');
      queryClient.invalidateQueries({ queryKey: ['inspections', booking?.id] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save inspection report');
    }
  });

  if (!isOpen || !booking) return null;

  const updateItemCondition = (id: string, condition: 'GOOD' | 'FAIR' | 'DAMAGED') => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, condition } : item));
  };

  const updateItemNotes = (id: string, notes: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, notes } : item));
  };

  const cautionDepositAmount = booking.property?.cautionDeposit || 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 animate-in">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-2xl">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                Digital Room Condition Inspection
              </h3>
              <p className="text-xs text-slate-500">
                {booking.property?.title} • Tenant: {booking.tenant?.firstName} {booking.tenant?.lastName}
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 font-bold rounded-xl">
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Inspection Type Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setType('MOVE_IN')}
              className={clsx(
                "px-5 py-2 rounded-lg font-bold transition",
                type === 'MOVE_IN' ? "bg-white dark:bg-slate-900 text-[var(--primary)] shadow-xs" : "text-slate-500"
              )}
            >
              🟢 Move-In Handover Checklist
            </button>
            <button
              onClick={() => setType('MOVE_OUT')}
              className={clsx(
                "px-5 py-2 rounded-lg font-bold transition",
                type === 'MOVE_OUT' ? "bg-white dark:bg-slate-900 text-red-600 shadow-xs" : "text-slate-500"
              )}
            >
              🔴 Move-Out Checkout Checklist
            </button>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Room Condition Verification</h4>

            <div className="space-y-2.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{item.name}</span>
                    <span className="text-[10px] text-slate-400 block">{item.category}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => updateItemCondition(item.id, 'GOOD')}
                      className={clsx(
                        "px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1",
                        item.condition === 'GOOD'
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <CheckCircle2 className="w-3 h-3" /> Good
                    </button>

                    <button
                      onClick={() => updateItemCondition(item.id, 'FAIR')}
                      className={clsx(
                        "px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1",
                        item.condition === 'FAIR'
                          ? "bg-amber-500 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <AlertTriangle className="w-3 h-3" /> Fair / Wear
                    </button>

                    <button
                      onClick={() => updateItemCondition(item.id, 'DAMAGED')}
                      className={clsx(
                        "px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1",
                        item.condition === 'DAMAGED'
                          ? "bg-red-500 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      )}
                    >
                      <XCircle className="w-3 h-3" /> Damaged
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Move-Out Caution Deposit Settlement Section */}
          {type === 'MOVE_OUT' && (
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Caution Deposit Settlement
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  Deposit Held: GHS {cautionDepositAmount.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Deduction Amount (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cautionDeduction}
                    onChange={(e) => setCautionDeduction(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-red-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Deduction Reason
                  </label>
                  <input
                    type="text"
                    value={deductionReason}
                    onChange={(e) => setDeductionReason(e.target.value)}
                    placeholder="e.g. Wall repainting & broken door lock"
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium"
                  />
                </div>
              </div>

              <div className="text-[11px] font-semibold text-slate-500 pt-1">
                Refund to Tenant: <span className="font-bold text-emerald-600">GHS {Math.max(0, cautionDepositAmount - parseFloat(cautionDeduction || '0')).toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* General Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
              General Handover Notes
            </label>
            <textarea
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              rows={3}
              placeholder="Additional condition notes or tenant sign-off remarks..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-normal"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              saveInspectionMutation.mutate({
                bookingId: booking.id,
                type,
                items,
                notes: generalNotes,
                cautionDepositDeduction: parseFloat(cautionDeduction || '0'),
                deductionReason: deductionReason || null
              });
            }}
            disabled={saveInspectionMutation.isPending}
            className="px-6 py-2.5 bg-[var(--primary)] text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:opacity-90 shadow-sm"
          >
            {saveInspectionMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save & Sign Inspection
          </button>
        </div>
      </div>
    </div>
  );
}
