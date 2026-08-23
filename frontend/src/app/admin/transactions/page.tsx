'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, CreditCard, Clock, CheckCircle, AlertCircle, ShieldAlert, Ban, Search, Filter, Copy, RefreshCw, Building2, User, Sparkles, Check, AlertTriangle, Calendar, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import SkeletonTable from '@/components/SkeletonTable';

export default function AdminSubscriptionsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'FAILED'>('ALL');
  const [selectedSubForRevoke, setSelectedSubForRevoke] = useState<any | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const { data: subscriptions, isLoading, isRefetching, refetch } = useQuery({
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
    onSuccess: () => {
      toast.success('Subscription activated successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: () => {
      toast.error('Failed to activate subscription.');
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await api.put(`/admin/subscriptions/${id}/revoke`, { reason });
    },
    onSuccess: () => {
      toast.success('Subscription revoked & listing unlisted.');
      setSelectedSubForRevoke(null);
      setRevokeReason('');
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    },
    onError: () => {
      toast.error('Failed to revoke subscription.');
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Reference copied to clipboard!');
  };

  // Filter subscriptions
  const filteredSubscriptions = (subscriptions || []).filter((sub: any) => {
    const landlordName = `${sub.property?.landlord?.firstName || ''} ${sub.property?.landlord?.lastName || ''}`.toLowerCase();
    const email = (sub.property?.landlord?.email || '').toLowerCase();
    const propTitle = (sub.property?.title || '').toLowerCase();
    const ref = (sub.paymentReference || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = landlordName.includes(search) || email.includes(search) || propTitle.includes(search) || ref.includes(search);

    if (!matchesSearch) return false;

    if (statusFilter === 'ACTIVE') return sub.isActive && sub.daysRemaining > 0;
    if (statusFilter === 'PENDING') return sub.paymentStatus === 'PENDING';
    if (statusFilter === 'EXPIRED') return sub.daysRemaining <= 0 && sub.paymentStatus === 'COMPLETED';
    if (statusFilter === 'FAILED') return sub.paymentStatus === 'FAILED' || (!sub.isActive && sub.paymentStatus !== 'PENDING');

    return true;
  });

  // Calculate Metrics
  const totalCount = subscriptions?.length || 0;
  const activeCount = subscriptions?.filter((s: any) => s.isActive && s.daysRemaining > 0).length || 0;
  const pendingCount = subscriptions?.filter((s: any) => s.paymentStatus === 'PENDING').length || 0;
  const totalRevenueGhs = subscriptions?.filter((s: any) => s.paymentStatus === 'COMPLETED').length * 100 || 0;

  return (
    <div className="space-y-6 pb-12 animate-in">
      {/* Top Header Banner */}
      <div className="glass-card p-6 rounded-3xl border border-[var(--border)] bg-gradient-to-r from-indigo-600/10 via-purple-600/5 to-sky-600/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
            <ShieldAlert className="w-4 h-4" /> Financial & Governance Control
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            Subscription &amp; Listing License Management
          </h1>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Monitor annual landlord listing fees, active license validity countdowns, and enforce manual activations or revocations.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-xl shadow-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className={clsx("w-3.5 h-3.5", isRefetching && "animate-spin")} /> Sync Licenses
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Total Subscriptions</p>
            <p className="text-3xl font-black text-[var(--foreground)]">{totalCount}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Active Licenses</p>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Pending Processing</p>
            <p className="text-3xl font-black text-amber-500">{pendingCount}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Estimated Listing Revenue</p>
            <p className="text-3xl font-black text-sky-600 dark:text-sky-400">GHS {totalRevenueGhs.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-[var(--border)] flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search landlord, property, or Paystack ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full md:w-auto">
          {(['ALL', 'ACTIVE', 'PENDING', 'EXPIRED', 'FAILED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={clsx(
                "px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all capitalize cursor-pointer",
                statusFilter === status
                  ? "bg-white dark:bg-slate-800 text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              )}
            >
              {status.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main Subscriptions Table */}
      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={5} columns={6} />
        ) : filteredSubscriptions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-[var(--muted-foreground)]" />
            </div>
            <h4 className="text-lg font-bold text-[var(--foreground)]">No Subscription Records Found</h4>
            <p className="text-xs text-[var(--muted-foreground)] max-w-sm mt-1">
              No subscriptions match your search filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900 border-b border-[var(--border)] text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-4">Paystack Reference</th>
                  <th className="px-6 py-4">Landlord</th>
                  <th className="px-6 py-4">Property</th>
                  <th className="px-6 py-4">Status &amp; License Countdown</th>
                  <th className="px-6 py-4">Validity Range</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredSubscriptions.map((sub: any) => {
                  const landlord = sub.property?.landlord || {};
                  const property = sub.property || {};
                  const isLicenseActive = sub.isActive && sub.daysRemaining > 0;

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      {/* Reference */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[var(--foreground)] text-xs">{sub.paymentReference}</span>
                          <button
                            onClick={() => copyToClipboard(sub.paymentReference)}
                            className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded transition-colors"
                            title="Copy reference"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                          Created {new Date(sub.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Landlord */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                          {landlord.firstName} {landlord.lastName}
                        </div>
                        <div className="text-[11px] text-[var(--muted-foreground)]">{landlord.email}</div>
                      </td>

                      {/* Property */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-sky-500" />
                          {property.title || 'Untitled Property'}
                        </div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">{property.location}</div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4">
                        {isLicenseActive ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle className="w-3 h-3" /> ACTIVE LICENSE
                            </span>
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              ⏱️ {sub.daysRemaining} days remaining
                            </div>
                          </div>
                        ) : sub.paymentStatus === 'PENDING' ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                              <Clock className="w-3 h-3" /> PENDING PAYMENT
                            </span>
                            <div className="text-[10px] text-amber-600">Awaiting Paystack callback</div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-300 dark:border-red-800">
                              <Ban className="w-3 h-3" /> REVOKED / EXPIRED
                            </span>
                            <div className="text-[10px] text-red-500">Unlisted from portal</div>
                          </div>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="px-6 py-4 text-[11px] text-[var(--muted-foreground)]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{new Date(sub.startDate).toLocaleDateString()} &rarr; {new Date(sub.endDate).toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right space-x-2">
                        {!sub.isActive && (
                          <button
                            onClick={() => activateMutation.mutate(sub.id)}
                            disabled={activateMutation.isPending}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer inline-flex items-center gap-1"
                          >
                            {activateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Activate
                          </button>
                        )}

                        {sub.isActive && (
                          <button
                            onClick={() => setSelectedSubForRevoke(sub)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 rounded-lg text-xs font-bold transition-all border border-red-200 dark:border-red-800 cursor-pointer inline-flex items-center gap-1"
                          >
                            <Ban className="w-3 h-3" /> Revoke License
                          </button>
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

      {/* Revocation Modal */}
      {selectedSubForRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-950 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-red-200 dark:border-red-900/60 p-6 space-y-5">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-[var(--foreground)]">Revoke Listing License</h3>
                <p className="text-xs text-[var(--muted-foreground)]">This action will immediately unlist the property.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl text-xs space-y-1">
              <p><strong>Property:</strong> {selectedSubForRevoke.property?.title}</p>
              <p><strong>Landlord:</strong> {selectedSubForRevoke.property?.landlord?.firstName} {selectedSubForRevoke.property?.landlord?.lastName}</p>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
                Reason for Revocation *
              </label>
              <textarea
                rows={3}
                required
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. Terms of Service violation, fraudulent photos, or manual landlord request..."
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500/40"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSubForRevoke(null)}
                className="px-4 py-2 text-xs font-bold text-[var(--muted-foreground)] hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!revokeReason.trim() || revokeMutation.isPending}
                onClick={() => revokeMutation.mutate({ id: selectedSubForRevoke.id, reason: revokeReason })}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold shadow flex items-center gap-1.5 disabled:opacity-50"
              >
                {revokeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
