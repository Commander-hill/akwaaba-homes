'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Package,
  Building,
  User,
  Truck,
  Hash,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Send,
  Loader2,
  Bike,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PropertyOption {
  id: string;
  title: string;
  location?: string;
}

const COURIER_PRESETS = [
  { id: 'DHL', label: 'DHL Express Ghana', icon: Truck },
  { id: 'FedEx', label: 'FedEx / GIG Logistics', icon: Truck },
  { id: 'Ghana Post', label: 'Ghana Post EMS', icon: Package },
  { id: 'Speedaf', label: 'Speedaf Express', icon: Truck },
  { id: 'Jumia Express', label: 'Jumia Express', icon: Package },
  { id: 'Yango Delivery', label: 'Yango Courier Rider', icon: Bike },
  { id: 'Bolt Food', label: 'Bolt Food / Courier', icon: Bike },
  { id: 'Private Courier', label: 'Private Motor Dispatch', icon: Bike }
];

const STORAGE_LOCATIONS = [
  'Front Desk Shelf A (Standard Parcels)',
  'Front Desk Shelf B (Documents & Envelopes)',
  'Cold Storage / Perishable Fridge',
  'Porter Office Locked Cabinet (Valuables)',
  'Security Gatehouse Holding Box',
  'Floor Bay 1 (Heavy / Oversized Items)'
];

function CaretakerParcelContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPropertyId = searchParams.get('propertyId') || '';
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [tenantId, setTenantId] = useState('');
  const [courierName, setCourierName] = useState('DHL');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [storageLocation, setStorageLocation] = useState(STORAGE_LOCATIONS[0]);
  const [packageNotes, setPackageNotes] = useState('');

  const { data: propertiesData, isLoading: loadingProperties } = useQuery({
    queryKey: ['properties', 'caretaker-active'],
    queryFn: async () => {
      const res = await api.get('/properties');
      return res.data;
    }
  });

  const propertyList: PropertyOption[] = (propertiesData?.properties || propertiesData?.data || []).map((p: any) => ({
    id: p.id,
    title: p.title || 'Residential Property',
    location: p.location || ''
  }));

  useEffect(() => {
    if (!propertyId && propertyList.length > 0) {
      setPropertyId(initialPropertyId || propertyList[0].id);
    }
  }, [propertyList, propertyId, initialPropertyId]);

  const { data: residentsData, isLoading: loadingResidents } = useQuery({
    queryKey: ['property-residents', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      try {
        const res = await api.get(`/bookings/property/${propertyId}`);
        const bookings = res.data?.bookings || res.data || [];
        return bookings
          .map((b: any) => ({
            id: b.tenantId || b.tenant?.id,
            name: `${b.tenant?.firstName || ''} ${b.tenant?.lastName || ''}`.trim() || 'Resident',
            phone: b.tenant?.phoneNumber || '',
            roomNumber: b.roomNumber || b.room?.unitNumber || ''
          }))
          .filter((t: any) => Boolean(t.id));
      } catch {
        return [];
      }
    },
    enabled: Boolean(propertyId)
  });

  const residents = residentsData || [];

  useEffect(() => {
    if (residents.length > 0 && !tenantId) {
      setTenantId(residents[0].id);
    }
  }, [residents, tenantId]);

  const logParcelMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/deliveries', payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      const otp = data?.delivery?.pickupCode || 'Generated';
      toast.success(`Parcel logged! Resident pickup OTP: ${otp}`);
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'mine'] });
      router.push('/dashboard/caretaker');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to log package delivery');
    }
  });

  const handleNextStep = () => {
    if (step === 1 && !propertyId) {
      toast.error('Please select a compound facility');
      return;
    }
    if (step === 2 && !tenantId) {
      toast.error('Please select the resident recipient');
      return;
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
    if (!propertyId || !tenantId) {
      toast.error('Please select both the compound and resident recipient');
      return;
    }

    logParcelMutation.mutate({
      propertyId,
      tenantId,
      courierName,
      trackingNumber: trackingNumber.trim() || null,
      packageDescription: `${storageLocation}${packageNotes ? ` — ${packageNotes.trim()}` : ''}`
    });
  };

  const selectedResident = residents.find((r: any) => r.id === tenantId);
  const selectedProperty = propertyList.find((p) => p.id === propertyId);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6 pb-24">
      {/* Top Navigation & Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard/caretaker')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Caretaker Desk
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Log Arrived Parcel Delivery
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Intake incoming courier packages at the gatehouse or lodge desk and issue a 4-digit pickup OTP.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 w-fit">
            Step {step} of 4
          </span>
        </div>
      </div>

      {/* 4-Step Segmented Progress Bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { num: 1, label: '1. Compound & Carrier' },
          { num: 2, label: '2. Recipient & Waybill' },
          { num: 3, label: '3. Vault Bay & Notes' },
          { num: 4, label: '4. Review & Log Parcel' }
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
        {/* STEP 1: Compound & Carrier */}
        {step === 1 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Select Compound &amp; Courier Service
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Identify the residential facility receiving the package and the dispatch carrier.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Compound / Hostel Facility *
              </label>
              {loadingProperties ? (
                <div className="h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={propertyId}
                  onChange={(e) => {
                    setPropertyId(e.target.value);
                    setTenantId('');
                  }}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                >
                  {propertyList.length === 0 && <option value="">No registered properties</option>}
                  {propertyList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.location ? `— ${p.location}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2.5">
                Delivery Carrier / Dispatch Rider *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {COURIER_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = courierName === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setCourierName(preset.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'border-[#16A34A] bg-[#16A34A]/10 dark:bg-emerald-950/30 ring-2 ring-[#16A34A]/20'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/40 dark:bg-zinc-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[#0F5132] dark:text-emerald-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />}
                      </div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white">{preset.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Recipient & Waybill */}
        {step === 2 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Resident Recipient &amp; Waybill Reference
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select the tenant addressed on the parcel label so their private 4-digit pickup code can be dispatched.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Resident Recipient *
                </label>
                {loadingResidents ? (
                  <div className="h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                ) : residents.length === 0 ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                    No active resident tenancies found for this compound. Please select a different property in Step 1.
                  </div>
                ) : (
                  <select
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                    required
                  >
                    <option value="">Select resident...</option>
                    {residents.map((r: any) => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.roomNumber ? `(Room ${r.roomNumber})` : ''} {r.phone ? `— ${r.phone}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Courier Tracking / Waybill Number (Optional)
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="e.g. GH-DHL-9281923"
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Vault Bay & Notes */}
        {step === 3 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Holding Shelf &amp; Package Condition
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Assign a secure storage bay at the front desk or gatehouse and note the parcel condition upon arrival.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Designated Holding Shelf / Vault Bay *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {STORAGE_LOCATIONS.map((loc) => {
                    const active = storageLocation === loc;
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setStorageLocation(loc)}
                        className={`p-3.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          active
                            ? 'border-[#16A34A] bg-[#16A34A]/10 dark:bg-emerald-950/30 text-[#16A34A] dark:text-emerald-300'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <span className="truncate pr-2">{loc}</span>
                        {active && <Check className="w-4 h-4 shrink-0 text-[#0F5132] dark:text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Package Condition / Intake Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  value={packageNotes}
                  onChange={(e) => setPackageNotes(e.target.value)}
                  placeholder="e.g. Fragile sticker attached, sealed brown carton box received intact from rider."
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Log Parcel */}
        {step === 4 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Confirm Gatehouse Parcel Intake
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Verify the delivery particulars below. Submitting generates a 4-digit OTP sent privately to the resident.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Compound Facility</span>
                <div className="font-bold text-zinc-900 dark:text-white">{selectedProperty?.title || 'Selected Compound'}</div>
                <div className="text-zinc-500">{selectedProperty?.location || 'Ghana'}</div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Resident Recipient</span>
                <div className="font-bold text-zinc-900 dark:text-white">{selectedResident?.name || 'Selected Resident'}</div>
                <div className="text-zinc-500">{selectedResident?.phone || 'Notification via Resident Portal'}</div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Carrier &amp; Waybill</span>
                <div className="font-bold text-zinc-900 dark:text-white">{courierName}</div>
                <div className="font-mono text-zinc-500">{trackingNumber || 'No Waybill Recorded'}</div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Assigned Storage Bay</span>
                <div className="font-bold text-[#0F5132] dark:text-emerald-400">{storageLocation}</div>
                <div className="text-zinc-500 truncate">{packageNotes || 'Standard intact intake'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Horizontal Summary Bar */}
        <div className="bg-zinc-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
              Gatehouse Parcel Intake Summary
            </div>
            <div className="text-sm font-bold">
              {courierName} &bull; {selectedResident?.name || 'No Resident Selected'} ({storageLocation.split('(')[0].trim()})
            </div>
          </div>
          <div className="text-xs text-zinc-400 font-mono">
            OTP Handover Security Enabled
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
              disabled={logParcelMutation.isPending || !tenantId}
              className="px-6 py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              {logParcelMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Vaulting &amp; Sending OTP...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Vault Package &amp; Notify Resident
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function NewCaretakerParcelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        </div>
      }
    >
      <CaretakerParcelContent />
    </Suspense>
  );
}
