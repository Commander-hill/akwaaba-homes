'use client';

import React, { useState } from 'react';
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ deliveries: PackageDelivery[] }>({
    queryKey: ['deliveries', 'tenant'],
    queryFn: async () => {
      const res = await api.get('/deliveries');
      return res.data;
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
    </div>
  );
}
