'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Package,
  Building,
  User,
  Truck,
  Hash,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Send,
  Loader2,
  Lock,
  MessageSquareShare,
  Bike,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PropertyOption {
  id: string;
  title: string;
  location?: string;
  bookings?: Array<{
    tenantId?: string;
    tenant?: {
      id: string;
      firstName: string;
      lastName: string;
      phoneNumber?: string;
      roomNumber?: string;
    };
  }>;
}

const COURIER_PRESETS = [
  { id: 'DHL', label: 'DHL Express Ghana', icon: Truck, color: 'text-amber-600 bg-amber-500/10 border-amber-300' },
  { id: 'FedEx', label: 'FedEx / GIG Logistics', icon: Truck, color: 'text-purple-600 bg-purple-500/10 border-purple-300' },
  { id: 'Ghana Post', label: 'Ghana Post EMS', icon: Package, color: 'text-red-600 bg-red-500/10 border-red-300' },
  { id: 'Speedaf', label: 'Speedaf Express', icon: Truck, color: 'text-blue-600 bg-blue-500/10 border-blue-300' },
  { id: 'Jumia Express', label: 'Jumia Express', icon: Package, color: 'text-orange-600 bg-orange-500/10 border-orange-300' },
  { id: 'Yango Delivery', label: 'Yango Courier Rider', icon: Bike, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-300' },
  { id: 'Bolt Food', label: 'Bolt Food / Courier', icon: Bike, color: 'text-teal-600 bg-teal-500/10 border-teal-300' },
  { id: 'Private Courier', label: 'Private Motor Dispatch', icon: Bike, color: 'text-slate-600 bg-slate-500/10 border-slate-300' }
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

  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [tenantId, setTenantId] = useState('');
  const [courierName, setCourierName] = useState('DHL');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [storageLocation, setStorageLocation] = useState(STORAGE_LOCATIONS[0]);
  const [packageNotes, setPackageNotes] = useState('');

  // Fetch Caretaker / Assigned properties
  const { data: propertiesData, isLoading: loadingProperties } = useQuery({
    queryKey: ['properties', 'caretaker-active'],
    queryFn: async () => {
      const res = await api.get('/properties');
      return res.data;
    }
  });

  const propertyList: PropertyOption[] = (propertiesData?.properties || propertiesData?.data || [])
    .map((p: any) => ({
      id: p.id,
      title: p.title || 'Residential Property',
      location: p.location || '',
      bookings: p.bookings || []
    }));

  useEffect(() => {
    if (!propertyId && propertyList.length > 0) {
      setPropertyId(initialPropertyId || propertyList[0].id);
    }
  }, [propertyList, propertyId, initialPropertyId]);

  // Fetch residents for selected property
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
      } catch (err) {
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
      const res = await api.post('/parcels', payload);
      return res.data;
    },
    onSuccess: (data: any) => {
      const otp = data?.delivery?.pickupCode || 'Generated';
      toast.success(`Parcel logged successfully! Pickup OTP: ${otp}`);
      queryClient.invalidateQueries({ queryKey: ['parcels'] });
      router.push('/dashboard/caretaker');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to log package delivery');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!propertyId) {
      toast.error('Please select the residential compound');
      return;
    }
    if (!tenantId) {
      toast.error('Please select the resident recipient');
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
  const selectedProperty = propertyList.find(p => p.id === propertyId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Header / Breadcrumb */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Link href="/dashboard/caretaker" className="hover:text-primary flex items-center gap-1 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Caretaker Dashboard
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 dark:text-white font-bold">Log Arrived Package Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldCheck className="w-3.5 h-3.5" /> 4-Digit Pickup OTP Protection
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Page Hero */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden mb-8">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
            <Package className="w-72 h-72" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Package className="w-3.5 h-3.5" /> Front Desk & Gatehouse Delivery Vault
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Log Arrived Parcel for Resident
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed">
              Intake incoming courier deliveries from DHL, Ghana Post, Speedaf, Jumia, or rider dispatch. The resident receives an automated pickup OTP code to verify upon collection.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Property Selection */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-blue-500" />
                Select Compound / Hostel
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Compound Facility
                </label>
                {loadingProperties ? (
                  <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ) : (
                  <select
                    value={propertyId}
                    onChange={(e) => {
                      setPropertyId(e.target.value);
                      setTenantId('');
                    }}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {propertyList.length === 0 && (
                      <option value="">No registered properties</option>
                    )}
                    {propertyList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.location ? `— ${p.location}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* 2. Courier Selection */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-500" />
                Select Courier / Delivery Carrier
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {COURIER_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = courierName === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setCourierName(preset.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2.5 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className={`p-2 rounded-xl w-fit ${preset.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {preset.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Resident & Storage Details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-blue-500" />
                Recipient & Holding Location
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Resident Recipient *
                  </label>
                  {loadingResidents ? (
                    <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                  ) : residents.length === 0 ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                      No active tenancies found for this compound.
                    </div>
                  ) : (
                    <select
                      value={tenantId}
                      onChange={(e) => setTenantId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tracking / Waybill Number (Optional)
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="e.g. GH-DHL-9281923"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Holding Shelf / Vault Bay *
                </label>
                <select
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STORAGE_LOCATIONS.map((loc, idx) => (
                    <option key={idx} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Package Condition / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={packageNotes}
                  onChange={(e) => setPackageNotes(e.target.value)}
                  placeholder="e.g. Fragile sticker attached, sealed carton box in intact condition"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Intake Summary & OTP Protocol */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 sticky top-24">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500" /> Handover Security Protocol
              </h3>

              {/* Delivery Pass Card Preview */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-2xl border border-blue-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs text-blue-400 font-bold uppercase tracking-wider">
                  <span>Front Desk Intake</span>
                  <span className="text-emerald-400">Ready for Vaulting</span>
                </div>

                <div className="text-center py-2 bg-white/5 rounded-xl border border-white/10">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest">
                    Resident Pickup Code
                  </span>
                  <span className="text-2xl font-black font-mono tracking-widest text-emerald-400">
                    4-Digit OTP
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Sent privately to resident upon logging
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recipient:</span>
                    <span className="font-bold text-white truncate max-w-[150px]">
                      {selectedResident?.name || 'Selected Tenant'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Carrier:</span>
                    <span className="font-bold text-white">{courierName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Location:</span>
                    <span className="font-bold text-amber-300 truncate max-w-[150px]">{storageLocation}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={logParcelMutation.isPending || !tenantId}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {logParcelMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Storing & Generating OTP...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Vault Package & Notify Resident
                    </>
                  )}
                </button>

                <Link
                  href="/dashboard/caretaker"
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

export default function NewCaretakerParcelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      }
    >
      <CaretakerParcelContent />
    </Suspense>
  );
}
