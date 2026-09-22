'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, CreditCard, CheckCircle, AlertCircle, Calendar, Building, 
  MapPin, Smartphone, ShieldCheck, X 
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function LandlordSubscriptionPage() {
  const [selectedPropertyForPayment, setSelectedPropertyForPayment] = useState<any | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'PAYSTACK' | 'HUBTEL'>('PAYSTACK');
  const [momoPhoneNumber, setMomoPhoneNumber] = useState('');

  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
  });

  const { data: overviewData, isLoading, refetch } = useQuery({
    queryKey: ['subscriptions', 'overview'],
    queryFn: async () => {
      const res = await api.get('/subscriptions/overview');
      return res.data;
    },
    enabled: !!session
  });

  const properties = overviewData?.properties || [];
  const stats = overviewData?.stats || {
    totalProperties: 0,
    activeSubscriptions: 0,
    expiringSoon: 0,
    unsubscribedOrExpired: 0
  };

  const initPaymentMutation = useMutation({
    mutationFn: async ({ propertyId, provider, phoneNumber }: { propertyId: string; provider: 'PAYSTACK' | 'HUBTEL'; phoneNumber?: string }) => {
      const { data } = await api.post('/subscriptions/initialize', { propertyId, provider, phoneNumber });
      return data?.data || data;
    },
    onSuccess: (data: any) => {
      const authUrl = data?.authorization_url || data?.data?.authorization_url;
      if (authUrl) {
        window.location.href = authUrl;
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start payment.');
    }
  });

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Sticky Header & Stats Container */}
      <div className="sticky top-0 z-20 bg-[#FBFBFC]/95 dark:bg-[#0B0D12]/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-zinc-200 dark:border-zinc-800 space-y-4 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Listing Billing &amp; Subscriptions</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Manage annual listing fees, search visibility, and active verification status.</p>
          </div>
        </div>

        {/* 3 Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Portfolio</span>
              <Building className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-black text-zinc-950 dark:text-white">{stats.totalProperties}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Listed properties managed</div>
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Live &amp; Visible</span>
              <CheckCircle className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-[#0F5132] dark:text-emerald-400">
              {stats.activeSubscriptions}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Active subscriptions granting live public search visibility</div>
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Action Required</span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {stats.unsubscribedOrExpired}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Unpublished or expired listings</div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-[#12151D] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">Property Listing Billing Status</h3>
          <span className="text-[11px] text-zinc-500">Paystack &amp; Hubtel Dual Gateway</span>
        </div>
        
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" />
          </div>
        ) : properties.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500">
            No properties registered under your landlord account yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0F5132] text-white uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Property Name</th>
                  <th className="px-6 py-3.5">Search Visibility</th>
                  <th className="px-6 py-3.5">Subscription Plan</th>
                  <th className="px-6 py-3.5">Days Remaining</th>
                  <th className="px-6 py-3.5 text-right">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
                {properties.map((item: any) => {
                  const sub = item.subscription;
                  const isLive = item.isAvailable && sub?.isActive;

                  return (
                    <tr key={item.propertyId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-900 dark:text-white">{item.propertyTitle}</div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-zinc-400" />
                          <span>{item.location}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#0F5132] dark:bg-emerald-950/40 dark:text-emerald-400 font-bold text-[11px] border border-emerald-200 dark:border-emerald-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Live & Listed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 font-bold text-[11px] border border-rose-200 dark:border-rose-800/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Hidden / Expired
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          <span>
                            {sub?.endDate 
                              ? `Expires ${new Date(sub.endDate).toLocaleDateString()}`
                              : 'Standard Annual Plan'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {sub?.isActive ? (
                          <span className={clsx(
                            "font-bold text-xs",
                            sub.daysLeft <= 7 ? "text-amber-600 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-300"
                          )}>
                            {sub.daysLeft} days left
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-medium">0 days</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isLive ? (
                          <button 
                            onClick={() => {
                              setSelectedPropertyForPayment({ id: item.propertyId, title: item.propertyTitle, location: item.location });
                              setMomoPhoneNumber(session?.phoneNumber || '');
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-lg font-bold text-[11px] shadow-xs transition-colors cursor-pointer"
                          >
                            <CreditCard className="w-3 h-3" /> Pay to Publish
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#0F5132] dark:text-emerald-400 font-bold text-xs">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Active Paid</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscription Checkout Modal */}
      {selectedPropertyForPayment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#0F5132]/10 text-[#0F5132] dark:text-emerald-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950 dark:text-white">Publish Property Listing</h3>
                  <p className="text-xs text-zinc-500">Annual Listing Subscription &amp; Search Visibility</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedPropertyForPayment(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800">
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Target Listing</div>
                <div className="font-bold text-sm text-zinc-900 dark:text-white mt-0.5">{selectedPropertyForPayment.title}</div>
                <div className="flex items-center text-zinc-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-zinc-400" />
                  <span>{selectedPropertyForPayment.location}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60">
                <div>
                  <div className="font-bold text-xs text-[#0F5132] dark:text-emerald-300">Standard Annual Plan</div>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400">365 Days Verified Visibility &amp; Direct Tenant Bookings</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-black text-[#0F5132] dark:text-emerald-400">GH₵ 100</div>
                  <div className="text-[10px] text-zinc-400">1 Year License</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-zinc-800 dark:text-zinc-200 block text-xs">
                  Select Payment Gateway
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedProvider('PAYSTACK')}
                    className={clsx(
                      "p-3 rounded-xl border text-left transition-all cursor-pointer",
                      selectedProvider === 'PAYSTACK'
                        ? "border-[#0F5132] dark:border-emerald-500 bg-[#0F5132]/5 dark:bg-emerald-950/30 ring-2 ring-[#0F5132]/20"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-[#12151D]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-zinc-950 dark:text-white text-xs">Paystack</span>
                      <CreditCard className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">Ghana Cards, Bank, Apple Pay, MoMo</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedProvider('HUBTEL')}
                    className={clsx(
                      "p-3 rounded-xl border text-left transition-all cursor-pointer",
                      selectedProvider === 'HUBTEL'
                        ? "border-[#0F5132] dark:border-emerald-500 bg-[#0F5132]/5 dark:bg-emerald-950/30 ring-2 ring-[#0F5132]/20"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-[#12151D]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-zinc-950 dark:text-white text-xs">Hubtel</span>
                      <Smartphone className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-tight">Instant Prompt: MTN MoMo, Telecel, AT</p>
                  </button>
                </div>
              </div>

              {selectedProvider === 'HUBTEL' && (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="font-bold text-zinc-800 dark:text-zinc-200 block text-xs">
                    Mobile Money Phone Number (Ghana)
                  </label>
                  <input
                    type="tel"
                    value={momoPhoneNumber}
                    onChange={(e) => setMomoPhoneNumber(e.target.value)}
                    placeholder="e.g. 0244123456"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0F5132] text-xs font-medium"
                  />
                  <p className="text-[10px] text-zinc-400">An authorization prompt will be pushed to this mobile number.</p>
                </div>
              )}

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-[11px] text-zinc-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Idempotent server-side payment verification with SSL encryption.</span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-2 bg-zinc-50 dark:bg-zinc-900/50">
              <button
                type="button"
                onClick={() => setSelectedPropertyForPayment(null)}
                disabled={initPaymentMutation.isPending}
                className="px-4 py-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  initPaymentMutation.mutate({
                    propertyId: selectedPropertyForPayment.id,
                    provider: selectedProvider,
                    phoneNumber: momoPhoneNumber || undefined
                  });
                }}
                disabled={initPaymentMutation.isPending}
                className="px-5 py-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {initPaymentMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting to {selectedProvider === 'HUBTEL' ? 'Hubtel' : 'Paystack'}...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Proceed to Pay GH₵ 100</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
