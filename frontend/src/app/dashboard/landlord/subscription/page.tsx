'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/axios';
import { 
  Loader2, CreditCard, CheckCircle, AlertCircle, Calendar, Building, 
  MapPin, Smartphone, ShieldCheck, X, ExternalLink
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function LandlordSubscriptionPage() {

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
                          <Link 
                            href={`/dashboard/landlord/properties/${item.propertyId}/publish`}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
