'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, CreditCard, CheckCircle, AlertCircle, Calendar, Building, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function LandlordSubscriptionPage() {
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
  });

  const { data: properties, isLoading } = useQuery({
    queryKey: ['landlord', 'properties'],
    queryFn: async () => {
      const res = await api.get('/properties/landlord/mine');
      return res.data.data;
    },
    enabled: !!session
  });

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Sticky Header & Stats Container */}
      <div className="sticky top-0 z-20 bg-[#FBFBFC]/95 dark:bg-[#0B0D12]/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-zinc-200 dark:border-zinc-800 space-y-4 mb-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">Listing Billing &amp; Subscriptions</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Manage listing fees, verified search visibility, and active rental status.</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
            <span>Paystack / MoMo Automated Billing</span>
          </div>
        </div>

        {/* 3 Executive Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Portfolio</span>
              <Building className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-black text-zinc-950 dark:text-white">{properties?.length || 0}</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Listed properties managed</div>
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Live &amp; Visible</span>
              <CheckCircle className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-[#0F5132] dark:text-emerald-400">
              {properties?.filter((p: any) => p.isAvailable).length || 0}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Visible to prospective tenants across Ghana</div>
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Action Required</span>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {properties?.filter((p: any) => !p.isAvailable).length || 0}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Unpublished or pending renewal</div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-[#12151D] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">Property Listing Billing Status</h3>
          <span className="text-[11px] text-zinc-500">Auto-renews via Paystack Escrow</span>
        </div>
        
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" />
          </div>
        ) : properties?.length === 0 ? (
          <div className="p-12 text-center text-xs text-zinc-500">
            No properties registered under your landlord account yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 dark:bg-zinc-800 text-zinc-100 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Property Name</th>
                  <th className="px-6 py-3.5">Search Visibility</th>
                  <th className="px-6 py-3.5">Subscription Plan</th>
                  <th className="px-6 py-3.5 text-right">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/70">
                {properties?.map((property: any) => (
                  <tr key={property.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">
                      {property.title}
                    </td>
                    <td className="px-6 py-4">
                      {property.isAvailable ? (
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
                          {property.subscription?.endDate 
                            ? `Expires ${new Date(property.subscription.endDate).toLocaleDateString()}`
                            : 'Standard Annual Plan'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!property.isAvailable ? (
                        <Link 
                          href="/dashboard/landlord/properties"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-lg font-bold text-[11px] shadow-xs transition-colors"
                        >
                          <CreditCard className="w-3 h-3" /> Pay to Publish
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#0F5132] dark:text-emerald-400 font-bold text-xs">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Active Paid</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
