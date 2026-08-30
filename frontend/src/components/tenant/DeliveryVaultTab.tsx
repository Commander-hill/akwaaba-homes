'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Package, Plus, CheckCircle2, Clock, ShieldCheck, 
  Copy, Check, AlertCircle, Loader2, QrCode, Building, Truck
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface PackageDelivery {
  id: string;
  propertyId: string;
  courierName: string;
  trackingNumber: string | null;
  packageDescription: string | null;
  pickupCode: string;
  status: 'PENDING_PICKUP' | 'COLLECTED' | 'RETURNED';
  loggedBy: string | null;
  receivedAt: string;
  collectedAt: string | null;
  property: {
    id: string;
    title: string;
    location: string;
  };
}

export default function DeliveryVaultTab({ bookings = [] }: { bookings?: any[] }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [propertyId, setPropertyId] = useState('');
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [packageDescription, setPackageDescription] = useState('');

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

  const { data, isLoading } = useQuery<{ deliveries: PackageDelivery[] }>({
    queryKey: ['deliveries', 'tenant'],
    queryFn: async () => {
      const res = await api.get('/deliveries');
      return res.data;
    }
  });

  const logDeliveryMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/deliveries', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Inbound parcel pre-registered! Security will verify on arrival.');
      setModalOpen(false);
      setCourierName('');
      setTrackingNumber('');
      setPackageDescription('');
      queryClient.invalidateQueries({ queryKey: ['deliveries', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to log delivery');
    }
  });

  const confirmPickupMutation = useMutation({
    mutationFn: async ({ id, pickupCode }: { id: string; pickupCode: string }) => {
      const res = await api.patch(`/deliveries/${id}/collect`, { pickupCode });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Parcel collection confirmed! ✅');
      queryClient.invalidateQueries({ queryKey: ['deliveries', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to confirm pickup');
    }
  });

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Pickup OTP copied to clipboard!');
    setTimeout(() => setCopiedId(null), 3000);
  };

  const deliveries = data?.deliveries || [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Gatehouse Parcel & Package Vault</h2>
            <p className="text-xs text-slate-500">Track packages received at the compound gatehouse and present pickup OTPs</p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition shadow-xs"
        >
          <Plus className="w-4 h-4" /> Pre-Register Delivery
        </button>
      </div>

      {isLoading ? (
        <div className="p-16 flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <Package className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Packages Awaiting Pickup</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            When Jumia, DHL, FedEx, or personal deliveries arrive at your residence front desk, security will log them here with a secure pickup PIN.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deliveries.map((d) => {
            const isPending = d.status === 'PENDING_PICKUP';
            const isCollected = d.status === 'COLLECTED';

            return (
              <div
                key={d.id}
                className={clsx(
                  "bg-white dark:bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-xs transition-all",
                  isPending ? "border-amber-500/40 hover:border-amber-500" : "border-slate-200 dark:border-slate-800 opacity-80"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className={clsx(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                      isPending ? "bg-amber-500/10 text-amber-600 animate-pulse" : "bg-emerald-500/10 text-emerald-600"
                    )}>
                      {isPending ? 'READY FOR PICKUP' : 'COLLECTED'}
                    </span>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white pt-1 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-slate-400" />
                      {d.courierName}
                    </h4>
                    <p className="text-xs text-slate-400">{d.property?.title}</p>
                  </div>

                  {isPending && (
                    <button
                      onClick={() => confirmPickupMutation.mutate({ id: d.id, pickupCode: d.pickupCode })}
                      disabled={confirmPickupMutation.isPending}
                      className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 font-bold rounded-lg text-xs transition"
                    >
                      I Picked This Up
                    </button>
                  )}
                </div>

                {/* Pickup OTP Box */}
                {isPending && (
                  <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block">Pickup Verification OTP</span>
                      <div className="text-xl font-black text-slate-900 dark:text-white tracking-widest font-mono">
                        {d.pickupCode}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyCode(d.pickupCode, d.id)}
                      className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-amber-600 shadow-xs"
                    >
                      {copiedId === d.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === d.id ? 'Copied' : 'Copy PIN'}
                    </button>
                  </div>
                )}

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  {d.packageDescription && (
                    <div>
                      <span className="text-slate-400">Description:</span>{' '}
                      <strong>{d.packageDescription}</strong>
                    </div>
                  )}
                  {d.trackingNumber && (
                    <div>
                      <span className="text-slate-400">Tracking #:</span>{' '}
                      <span className="font-mono">{d.trackingNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-400">
                    <span>Logged by: {d.loggedBy || 'Security Gatehouse'}</span>
                    <span>{new Date(d.receivedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pre-Register Delivery Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-500" /> Pre-Register Inbound Parcel
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

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Courier / Delivery Service</label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g. Jumia Delivery, DHL, Bolt Food, FedEx"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tracking Number (Optional)</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. JM-948201-GH"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Package Description</label>
                <input
                  type="text"
                  value={packageDescription}
                  onChange={(e) => setPackageDescription(e.target.value)}
                  placeholder="e.g. Laptop charger in brown carton box"
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
                    toast.error('Please select a residence');
                    return;
                  }
                  if (!courierName) {
                    toast.error('Courier name is required');
                    return;
                  }
                  logDeliveryMutation.mutate({
                    propertyId: targetPropertyId,
                    courierName,
                    trackingNumber,
                    packageDescription
                  });
                }}
                disabled={logDeliveryMutation.isPending}
                className="px-6 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:opacity-90 shadow-sm"
              >
                {logDeliveryMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Log Parcel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
