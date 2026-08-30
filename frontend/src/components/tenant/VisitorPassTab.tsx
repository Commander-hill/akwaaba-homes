'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  KeyRound, Plus, Trash2, ShieldCheck, Clock, User, Phone, 
  Copy, Check, AlertCircle, Loader2, QrCode, Share2
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface VisitorPass {
  id: string;
  propertyId: string;
  visitorName: string;
  visitorPhone: string | null;
  purpose: string | null;
  accessCode: string;
  validFrom: string;
  validUntil: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
  checkInTime: string | null;
  createdAt: string;
  property: {
    id: string;
    title: string;
    location: string;
  };
}

export default function VisitorPassTab({ bookings = [] }: { bookings?: any[] }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [propertyId, setPropertyId] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [purpose, setPurpose] = useState('Guest Visit');
  const [durationHours, setDurationHours] = useState('12');

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
      title: b.property?.title || 'Residential Compound',
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

  const { data, isLoading } = useQuery<{ passes: VisitorPass[] }>({
    queryKey: ['visitorPasses', 'tenant'],
    queryFn: async () => {
      const res = await api.get('/visitor-passes');
      return res.data;
    }
  });

  const createPassMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/visitor-passes', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Visitor gate pass generated! Share PIN with your guest.');
      setModalOpen(false);
      setVisitorName('');
      setVisitorPhone('');
      queryClient.invalidateQueries({ queryKey: ['visitorPasses', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to generate pass');
    }
  });

  const revokePassMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/visitor-passes/${id}/revoke`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Visitor pass revoked');
      queryClient.invalidateQueries({ queryKey: ['visitorPasses', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to revoke pass');
    }
  });

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Gate PIN copied to clipboard!');
    setTimeout(() => setCopiedId(null), 3000);
  };

  const passes = data?.passes || [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Digital Visitor & Gate Passes</h2>
            <p className="text-xs text-slate-500">Generate 1-time gate clearance PINs for guests, Bolt/Uber drivers, & delivery couriers</p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition shadow-xs"
        >
          <Plus className="w-4 h-4" /> Generate Gate Pass
        </button>
      </div>

      {isLoading ? (
        <div className="p-16 flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : passes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Visitor Passes Generated</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Pre-authorize visitors or delivery drivers by generating a secure gate PIN they can present at the security checkpoint.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {passes.map((pass) => {
            const isExpired = new Date() > new Date(pass.validUntil);
            const isUsed = pass.status === 'USED';
            const isRevoked = pass.status === 'REVOKED';
            const isActive = pass.status === 'ACTIVE' && !isExpired;

            return (
              <div
                key={pass.id}
                className={clsx(
                  "bg-white dark:bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-xs transition-all",
                  isActive ? "border-amber-500/40 hover:border-amber-500" : "border-slate-200 dark:border-slate-800 opacity-80"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className={clsx(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                      isActive && "bg-emerald-500/10 text-emerald-600",
                      isUsed && "bg-blue-500/10 text-blue-600",
                      (isExpired || isRevoked) && "bg-red-500/10 text-red-600"
                    )}>
                      {isRevoked ? 'REVOKED' : isUsed ? 'CHECKED IN' : isExpired ? 'EXPIRED' : 'ACTIVE PIN'}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white pt-1">{pass.visitorName}</h4>
                    <p className="text-xs text-slate-400">{pass.purpose || 'Guest'}</p>
                  </div>

                  {isActive && (
                    <button
                      onClick={() => revokePassMutation.mutate(pass.id)}
                      disabled={revokePassMutation.isPending}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs"
                      title="Revoke pass"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* PIN Box */}
                <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block">Security Gate PIN</span>
                    <div className="text-xl font-black text-slate-900 dark:text-white tracking-widest font-mono">
                      {pass.accessCode}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyCode(pass.accessCode, pass.id)}
                    className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-amber-600 shadow-xs"
                  >
                    {copiedId === pass.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === pass.id ? 'Copied' : 'Copy PIN'}
                  </button>
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Valid Until:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {new Date(pass.validUntil).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  {pass.checkInTime && (
                    <div className="flex items-center justify-between text-emerald-600">
                      <span>Checked In At:</span>
                      <span className="font-bold">
                        {new Date(pass.checkInTime).toLocaleTimeString([], { timeStyle: 'short' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate Pass Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" /> Create Visitor Gate Pass
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
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Visitor / Driver Full Name</label>
                <input
                  type="text"
                  value={visitorName}
                  onChange={(e) => setVisitorName(e.target.value)}
                  placeholder="e.g. Kwame Mensah (Uber Driver)"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Visitor Phone (Optional)</label>
                  <input
                    type="tel"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    placeholder="054 XXX XXXX"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Duration Validity</label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="2">2 Hours (Quick Delivery / Pickup)</option>
                    <option value="6">6 Hours (Day Visit)</option>
                    <option value="12">12 Hours (Full Day)</option>
                    <option value="24">24 Hours (Overnight)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Visit Purpose</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="Guest Visit">Guest / Friend Visit</option>
                  <option value="Delivery / Courier">Delivery / Courier (Food/Jumia)</option>
                  <option value="Domestic Staff / Cleaner">Domestic Staff / Cleaner</option>
                  <option value="Artisan / Contractor">Artisan / Contractor</option>
                  <option value="Family Member">Family Member</option>
                </select>
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
                    toast.error('Active tenancy required to generate gate passes');
                    return;
                  }
                  if (!visitorName) {
                    toast.error('Visitor name is required');
                    return;
                  }
                  createPassMutation.mutate({
                    propertyId: targetPropertyId,
                    visitorName,
                    visitorPhone,
                    purpose,
                    durationHours
                  });
                }}
                disabled={createPassMutation.isPending}
                className="px-6 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:opacity-90 shadow-sm"
              >
                {createPassMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Generate PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
