'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, CreditCard, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export default function AdminTransactionsPage() {
  const queryClient = useQueryClient();

  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const res = await api.get('/admin/subscriptions');
      return res.data;
    }
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/admin/subscriptions/${id}/activate`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Subscriptions & Revenue</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">Monitor and manage all landlord subscription payments.</p>
        </div>
        <div className="p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
          <CreditCard className="w-8 h-8" />
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4 border border-[var(--border)]">
          <div className="text-xs uppercase font-bold text-[var(--muted-foreground)] mb-1">Total Subscriptions</div>
          <div className="text-3xl font-extrabold">{subscriptions?.length || 0}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-[var(--border)]">
          <div className="text-xs uppercase font-bold text-[var(--muted-foreground)] mb-1">Active</div>
          <div className="text-3xl font-extrabold text-emerald-600">{subscriptions?.filter((s: any) => s.isActive).length || 0}</div>
        </div>
        <div className="glass-card rounded-xl p-4 border border-[var(--border)]">
          <div className="text-xs uppercase font-bold text-[var(--muted-foreground)] mb-1">Pending</div>
          <div className="text-3xl font-extrabold text-amber-500">{subscriptions?.filter((s: any) => s.paymentStatus === 'PENDING').length || 0}</div>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--muted-foreground)] uppercase bg-slate-50 dark:bg-slate-900/80 border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 font-medium">Reference</th>
                <th className="px-6 py-4 font-medium">Landlord</th>
                <th className="px-6 py-4 font-medium">Payment Status</th>
                <th className="px-6 py-4 font-medium">Subscription</th>
                <th className="px-6 py-4 font-medium">Validity</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {subscriptions?.map((sub: any) => (
                <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-[var(--muted-foreground)] text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {sub.paymentReference}
                    </div>
                    <div className="text-[10px] mt-1 text-slate-400">{new Date(sub.createdAt).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-[var(--foreground)]">{sub.landlord.firstName} {sub.landlord.lastName}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{sub.landlord.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      sub.paymentStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      sub.paymentStatus === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {sub.paymentStatus === 'COMPLETED' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {sub.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      sub.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {sub.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-[var(--muted-foreground)]">
                    <div>Start: {new Date(sub.startDate).toLocaleDateString()}</div>
                    <div>Ends: {new Date(sub.endDate).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {sub.paymentStatus === 'PENDING' && !sub.isActive && (
                      <button
                        onClick={() => activateMutation.mutate(sub.id)}
                        disabled={activateMutation.isPending}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-lg text-xs font-bold transition-colors"
                      >
                        {activateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {subscriptions?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[var(--muted-foreground)]">No subscription records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
