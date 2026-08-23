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
        <div className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center text-[var(--primary)] mb-3">
            <Building className="w-6 h-6" />
          </div>
          <div className="text-3xl font-black text-[var(--foreground)]">{properties?.length || 0}</div>
          <div className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Total Properties</div>
        </div>
        <div className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-600 mb-3">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div className="text-3xl font-black text-emerald-600">
            {properties?.filter((p: any) => p.isAvailable).length || 0}
          </div>
          <div className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Active Listings</div>
        </div>
        <div className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="text-3xl font-black text-rose-500">
            {properties?.filter((p: any) => !p.isAvailable).length || 0}
          </div>
          <div className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Unpaid / Hidden</div>
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
