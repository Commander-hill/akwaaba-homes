'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Scale, Search, ShieldAlert, XCircle, AlertTriangle, User, Building2, Star, ArrowDownRight, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonTable from '@/components/SkeletonTable';
import clsx from 'clsx';

export default function AdminBreachesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [selectedBreach, setSelectedBreach] = useState<any | null>(null);
  
  const [penaltyDeduction, setPenaltyDeduction] = useState<number>(1.0);
  const [suspendAccount, setSuspendAccount] = useState<boolean>(false);
  const [adminNotes, setAdminNotes] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-breaches'],
    queryFn: async () => {
      const res = await api.get('/admin/breaches');
      return res.data;
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, status, penaltyDeduction, suspendAccount, adminNotes }: { id: string; status: 'VERIFIED' | 'REJECTED' | 'DISMISSED'; penaltyDeduction?: number; suspendAccount?: boolean; adminNotes?: string }) => {
      await api.put(`/admin/breaches/${id}/resolve`, { status, penaltyDeduction, suspendAccount, adminNotes });
    },
    onSuccess: (_, variables) => {
      if (variables.status === 'VERIFIED') {
        toast.success('Breach claim verified! Penalty deducted from reputation score.');
      } else {
        toast.success('Breach claim dismissed.');
      }
      setSelectedBreach(null);
      queryClient.invalidateQueries({ queryKey: ['admin-breaches'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to process breach verdict.');
    }
  });

  const reports = data?.breaches || [];

  // Filtering logic
  const filteredReports = reports.filter((report: any) => {
    const tenantName = `${report.tenant?.firstName || ''} ${report.tenant?.lastName || ''}`.toLowerCase();
    const reporterName = `${report.reporter?.firstName || ''} ${report.reporter?.lastName || ''}`.toLowerCase();
    const title = (report.title || '').toLowerCase();
    const propertyTitle = (report.property?.title || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch = tenantName.includes(search) || reporterName.includes(search) || title.includes(search) || propertyTitle.includes(search);
    if (!matchesSearch) return false;

    if (statusFilter !== 'ALL' && report.status !== statusFilter) return false;

    return true;
  });

  // Metrics
  const totalCount = reports.length;
  const pendingCount = reports.filter((r: any) => r.status === 'PENDING').length;
  const verifiedCount = reports.filter((r: any) => r.status === 'VERIFIED').length;
  const rejectedCount = reports.filter((r: any) => r.status === 'REJECTED' || r.status === 'DISMISSED').length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      
      {/* Sticky Header & KPI Ribbon Container */}
      <div className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md pt-2 pb-4 -mx-8 px-8 border-b border-slate-200/60 dark:border-slate-800/60 space-y-4 mb-6 shadow-xs">
        {/* Header Banner */}
        <div className="glass-card p-6 rounded-3xl border border-[var(--border)] bg-gradient-to-r from-red-900/20 via-orange-900/10 to-amber-900/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-600 dark:text-red-400 mb-1">
              <Scale className="w-4 h-4" /> Judicial Governance &amp; Moderation
            </div>
            <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">
              Tenant Breach &amp; Dispute Command Center
            </h1>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Review landlord breach reports, apply automated reputation score penalties, and enforce account suspensions.
            </p>
          </div>
        </div>

        {/* KPI Stats Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-[var(--border)] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Total Reported</p>
              <p className="text-3xl font-black text-[var(--foreground)]">{totalCount}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
              <Scale className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-[var(--border)] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Pending Adjudication</p>
              <p className="text-3xl font-black text-amber-500">{pendingCount}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-[var(--border)] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Verified &amp; Penalized</p>
              <p className="text-3xl font-black text-red-600 dark:text-red-400">{verifiedCount}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-[var(--border)] flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)] mb-1">Dismissed / Rejected</p>
              <p className="text-3xl font-black text-slate-500">{rejectedCount}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card p-4 rounded-2xl border border-[var(--border)] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            type="text"
            placeholder="Search tenant, landlord reporter, or offense title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-red-500/30"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full md:w-auto">
          {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((status) => (
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

      {/* Main Breach Reports Table */}
      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={5} columns={6} />
        ) : filteredReports.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <Scale className="w-12 h-12 text-slate-300 mb-4" />
            <h4 className="font-bold text-[var(--foreground)]">No Breach Reports Found</h4>
            <p className="text-xs text-[var(--muted-foreground)] max-w-sm mt-1">
              No reported breach violations match your current search or status filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-zinc-900 dark:bg-zinc-800 text-zinc-100 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
                <tr>
                  <th className="px-6 py-4 text-white font-extrabold">Offense Title &amp; Date</th>
                  <th className="px-6 py-4 text-white font-extrabold">Tenant (Accused)</th>
                  <th className="px-6 py-4 text-white font-extrabold">Reporter (Landlord)</th>
                  <th className="px-6 py-4 text-white font-extrabold">Property</th>
                  <th className="px-6 py-4 text-white font-extrabold">Status &amp; Impact</th>
                  <th className="px-6 py-4 text-right text-white font-extrabold">Adjudication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredReports.map((report: any) => {
                  const tenant = report.tenant || {};
                  const reporter = report.reporter || {};
                  const property = report.property || {};

                  return (
                    <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 max-w-[200px]">
                        <div className="font-bold text-[var(--foreground)] truncate" title={report.title}>{report.title}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                          {tenant.firstName} {tenant.lastName}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                            <Star className="w-3 h-3 fill-amber-400" /> {(tenant.reputationScore || 5.0).toFixed(1)}
                          </span>
                          {tenant.isSuspended && (
                            <span className="text-[9px] font-extrabold text-red-600 bg-red-100 dark:bg-red-950/50 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                              <Ban className="w-2.5 h-2.5" /> SUSPENDED
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)]">{reporter.firstName} {reporter.lastName}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">{reporter.email}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-sky-500" />
                          {property.title || 'Hostel Unit'}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {report.status === 'VERIFIED' ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-300 dark:border-red-800">
                              <ShieldAlert className="w-3 h-3" /> VERIFIED
                            </span>
                            <div className="text-[10px] font-bold text-red-600 flex items-center gap-0.5">
                              <ArrowDownRight className="w-3 h-3" /> Score Penalized
                            </div>
                          </div>
                        ) : report.status === 'REJECTED' || report.status === 'DISMISSED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                            <XCircle className="w-3 h-3" /> DISMISSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                            <AlertTriangle className="w-3 h-3" /> PENDING REVIEW
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedBreach(report);
                            setPenaltyDeduction(1.0);
                            setSuspendAccount(false);
                            setAdminNotes('');
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[var(--foreground)] rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Adjudicate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjudication Modal */}
      {selectedBreach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-950 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[var(--foreground)]">Issue Dispute Verdict</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">Review evidence and assign reputation penalties.</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBreach(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Offense Title</span>
                <span className="font-bold text-[var(--foreground)] text-sm">{selectedBreach.title}</span>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">Landlord Claim Description</span>
                <p className="text-[var(--muted-foreground)] bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  {selectedBreach.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Accused Tenant</span>
                  <span className="font-bold text-[var(--foreground)]">{selectedBreach.tenant?.firstName} {selectedBreach.tenant?.lastName}</span>
                  <span className="block text-[10px] text-amber-500 font-bold">Current Reputation: ⭐ {(selectedBreach.tenant?.reputationScore || 5.0).toFixed(1)}/5.0</span>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Reporting Landlord</span>
                  <span className="font-bold text-[var(--foreground)]">{selectedBreach.reporter?.firstName} {selectedBreach.reporter?.lastName}</span>
                </div>
              </div>
            </div>

            {selectedBreach.status === 'PENDING' ? (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--foreground)] mb-1.5">
                    Reputation Score Penalty Deduction (-{penaltyDeduction} pts)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0.5, 1.0, 1.5, 2.0].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setPenaltyDeduction(val)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${penaltyDeduction === val ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[var(--foreground)]'}`}
                      >
                        -{val} Pts
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 dark:border-red-900/50">
                  <div className="flex items-center gap-2">
                    <Ban className="w-4 h-4 text-red-600" />
                    <div>
                      <p className="text-xs font-bold text-red-900 dark:text-red-400">Suspend Account</p>
                      <p className="text-[10px] text-red-700/80 dark:text-red-400/80">Freeze user access on platform</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={suspendAccount}
                    onChange={(e) => setSuspendAccount(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--foreground)] mb-1">Administrative Note / Verdict Explanation</label>
                  <input
                    type="text"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Enter reason for verdict..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-red-500/20 outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    disabled={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate({ id: selectedBreach.id, status: 'REJECTED', adminNotes })}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {resolveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    Dismiss Claim
                  </button>

                  <button
                    disabled={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate({ id: selectedBreach.id, status: 'VERIFIED', penaltyDeduction, suspendAccount, adminNotes })}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-red-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {resolveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                    Verify &amp; Apply Penalty
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-xl text-center text-xs font-bold text-[var(--muted-foreground)]">
                This breach dispute has been processed.
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
