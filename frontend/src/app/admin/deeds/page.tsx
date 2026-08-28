'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, FileCheck, CheckCircle, XCircle, Search, Building2, User, ExternalLink, ShieldCheck, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonTable from '@/components/SkeletonTable';
import clsx from 'clsx';

export default function AdminLandlordDeedsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');
  const [selectedLandlord, setSelectedLandlord] = useState<any | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-landlord-deeds', statusFilter],
    queryFn: async () => {
      const res = await api.get('/admin/landlord-deeds', {
        params: { status: statusFilter === 'ALL' ? undefined : statusFilter }
      });
      return res.data;
    }
  });

  const auditMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: 'VERIFIED' | 'REJECTED'; notes?: string }) => {
      await api.put(`/admin/landlord-deeds/${id}/audit`, { status, notes });
    },
    onSuccess: (_, variables) => {
      if (variables.status === 'VERIFIED') {
        toast.success('Landlord ownership deed approved! Verified status granted.');
      } else {
        toast.success('Deed submission rejected.');
      }
      setSelectedLandlord(null);
      queryClient.invalidateQueries({ queryKey: ['admin-landlord-deeds'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update deed verification status.');
    }
  });

  const landlords = data?.landlords || [];

  const filteredLandlords = landlords.filter((l: any) => {
    const name = `${l.firstName || ''} ${l.lastName || ''}`.toLowerCase();
    const email = (l.email || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || email.includes(search);
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      
      {/* Sticky Header & Filter Toolbar Container */}
      <div className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md pt-2 pb-4 -mx-8 px-8 border-b border-slate-200/60 dark:border-slate-800/60 space-y-4 mb-6 shadow-xs">
        {/* Header Banner */}
        <div className="glass-card p-6 rounded-3xl border border-[var(--border)] bg-gradient-to-r from-emerald-900/20 via-teal-900/10 to-indigo-900/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
              <ShieldCheck className="w-4 h-4" /> Legal Verification &amp; Property Title Audit
            </div>
            <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight">
              Hostel Deed Audit Portal
            </h1>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Review and quick-verify landlord property deeds, land title registration, and Ghana Card verification before public hostel listing.
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="glass-card p-4 rounded-2xl border border-[var(--border)] flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Search landlord name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full md:w-auto">
            {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={clsx(
                  "px-3.5 py-1.5 text-[11px] font-bold rounded-lg transition-all capitalize cursor-pointer",
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
      </div>

      {/* Landlord Deeds Table */}
      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={5} columns={5} />
        ) : filteredLandlords.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <FileCheck className="w-12 h-12 text-slate-300 mb-4" />
            <h4 className="font-bold text-[var(--foreground)]">No Landlord Deed Audits Found</h4>
            <p className="text-xs text-[var(--muted-foreground)] max-w-sm mt-1">
              There are currently no landlord ownership documents matching status "{statusFilter.toLowerCase()}".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gradient-to-r from-emerald-600 to-teal-700 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-md">
                <tr>
                  <th className="px-6 py-4 text-white font-extrabold">Landlord Name</th>
                  <th className="px-6 py-4 text-white font-extrabold">Contact Info</th>
                  <th className="px-6 py-4 text-white font-extrabold">Properties Owned</th>
                  <th className="px-6 py-4 text-white font-extrabold">Verification Status</th>
                  <th className="px-6 py-4 text-right text-white font-extrabold">Deed Audit Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredLandlords.map((landlord: any) => (
                  <tr key={landlord.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-500" />
                        {landlord.firstName} {landlord.lastName}
                      </div>
                      <div className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5 mt-0.5">
                        <Star className="w-3 h-3 fill-amber-400" /> Reputation: {landlord.reputationScore.toFixed(1)}/5.0
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-bold text-[var(--foreground)]">{landlord.email}</div>
                      <div className="text-[10px] text-[var(--muted-foreground)]">{landlord.phoneNumber || 'No phone'}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-bold text-[var(--foreground)] flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        {landlord.properties?.length || 0} Listed Hostels
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {landlord.isVerifiedLandlord ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle className="w-3 h-3" /> VERIFIED DEED
                        </span>
                      ) : landlord.landlordVerificationStatus === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400">
                          <XCircle className="w-3 h-3" /> DEED REJECTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                          <FileCheck className="w-3 h-3" /> PENDING AUDIT
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedLandlord(landlord)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1 ml-auto"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Inspect Deed
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deed Inspection Modal */}
      {selectedLandlord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-950 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[var(--foreground)]">Audit Ownership Document</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">Verify Ghana Land Deed or Property Title Deed.</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLandlord(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-extrabold text-sm text-[var(--foreground)]">{selectedLandlord.firstName} {selectedLandlord.lastName}</span>
                  <span className="block text-[10px] text-[var(--muted-foreground)]">{selectedLandlord.email} • {selectedLandlord.phoneNumber}</span>
                </div>
                <span className="text-[10px] font-bold text-amber-500 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded">
                  Reputation: ⭐ {selectedLandlord.reputationScore.toFixed(1)}
                </span>
              </div>

              {/* Document Preview Box */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Submitted Property Deed / Ownership Proof Document</span>
                {selectedLandlord.landlordDocUrl ? (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-950 flex justify-between items-center">
                    <span className="text-xs font-semibold text-indigo-600 truncate max-w-xs">{selectedLandlord.landlordDocUrl}</span>
                    <a
                      href={selectedLandlord.landlordDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" /> View Document
                    </a>
                  </div>
                ) : (
                  <div className="p-4 text-center bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-200 dark:border-amber-900/40 rounded-xl text-xs">
                    No document uploaded yet. (Landlord registered via expedited portal)
                  </div>
                )}
              </div>
            </div>

            {/* Rejection Notes */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--foreground)] mb-1">Audit Notes / Rejection Reason (Optional)</label>
              <input
                type="text"
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Specify missing stamp or illegible deed details..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                disabled={auditMutation.isPending}
                onClick={() => auditMutation.mutate({ id: selectedLandlord.id, status: 'REJECTED', notes: rejectionNotes })}
                className="flex-1 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {auditMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Reject Deed
              </button>

              <button
                disabled={auditMutation.isPending}
                onClick={() => auditMutation.mutate({ id: selectedLandlord.id, status: 'VERIFIED', notes: rejectionNotes })}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-emerald-500/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {auditMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Approve Deed Verification
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
