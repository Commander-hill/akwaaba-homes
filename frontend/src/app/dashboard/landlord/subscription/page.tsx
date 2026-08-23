'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, CreditCard, CheckCircle, AlertCircle, Calendar, Building } from 'lucide-react';
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
    queryKey: ['landlord-properties-billing'],
    queryFn: async () => {
      const res = await api.get('/properties/landlord/mine');
      return res.data.data;
    },
    enabled: !!session
  });

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">Billing & Subscriptions</h1>
        <p className="text-[var(--muted-foreground)]">Manage listing fees and track the active status of your properties.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 rounded-2xl border bg-[#EEF2FF] dark:bg-[#1E1B4B]/60 border-[#C7D2FE] dark:border-[#3730A3] flex flex-col items-center justify-center text-center shadow-sm transition-all hover:shadow-md">
          <div className="w-12 h-12 bg-[#E0E7FF] dark:bg-[#312E81] rounded-2xl flex items-center justify-center text-[#4338CA] dark:text-[#A5B4FC] mb-3 shadow-inner">
            <Building className="w-6 h-6" />
          </div>
          <div className="text-3xl font-black text-[#4338CA] dark:text-[#E0E7FF]">{properties?.length || 0}</div>
          <div className="text-xs font-extrabold text-[#3730A3] dark:text-[#C7D2FE] uppercase tracking-wider mt-1">Total Properties</div>
        </div>

        <div className="p-6 rounded-2xl border bg-[#ECFDF5] dark:bg-[#064E3B]/60 border-[#A7F3D0] dark:border-[#065F46] flex flex-col items-center justify-center text-center shadow-sm transition-all hover:shadow-md">
          <div className="w-12 h-12 bg-[#D1FAE5] dark:bg-[#047857] rounded-2xl flex items-center justify-center text-[#047857] dark:text-[#6EE7B7] mb-3 shadow-inner">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="text-3xl font-black text-[#047857] dark:text-[#6EE7B7]">
            {properties?.filter((p: any) => p.isAvailable).length || 0}
          </div>
          <div className="text-xs font-extrabold text-[#065F46] dark:text-[#A7F3D0] uppercase tracking-wider mt-1">Active Listings</div>
        </div>

        <div className="p-6 rounded-2xl border bg-[#FFE4E6] dark:bg-[#4C0519]/60 border-[#FECDD3] dark:border-[#881337] flex flex-col items-center justify-center text-center shadow-sm transition-all hover:shadow-md">
          <div className="w-12 h-12 bg-[#FECDD3] dark:bg-[#9F1239] rounded-2xl flex items-center justify-center text-[#BE123C] dark:text-[#FECDD3] mb-3 shadow-inner">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="text-3xl font-black text-[#BE123C] dark:text-[#FFE4E6]">
            {properties?.filter((p: any) => !p.isAvailable).length || 0}
          </div>
          <div className="text-xs font-extrabold text-[#881337] dark:text-[#FECDD3] uppercase tracking-wider mt-1">Unpaid / Hidden</div>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border)]">
        <div className="px-6 py-4 border-b border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="font-bold text-[var(--foreground)]">Property Billing Status</h3>
        </div>
        
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
          </div>
        ) : properties?.length === 0 ? (
          <div className="p-12 text-center text-[var(--muted-foreground)]">
            You don't have any properties yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#E06D53] text-white font-extrabold shadow-md">
                <tr>
                  <th className="px-6 py-4 text-white font-extrabold">Property</th>
                  <th className="px-6 py-4 text-white font-extrabold">Visibility</th>
                  <th className="px-6 py-4 text-white font-extrabold">Subscription</th>
                  <th className="px-6 py-4 text-right text-white font-extrabold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {properties?.map((property: any) => (
                  <tr key={property.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-[var(--foreground)]">
                      {property.title}
                    </td>
                    <td className="px-6 py-4">
                      {property.isAvailable ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 font-bold text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Visible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 font-bold text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Hidden
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[var(--muted-foreground)] flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {property.subscription?.endDate 
                        ? new Date(property.subscription.endDate).toLocaleDateString()
                        : 'No active plan'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!property.isAvailable ? (
                        <Link 
                          href="/dashboard/landlord/properties"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-bold text-xs hover:bg-[var(--primary-hover)] transition-colors"
                        >
                          <CreditCard className="w-4 h-4" /> Pay to Publish
                        </Link>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">Paid</span>
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
