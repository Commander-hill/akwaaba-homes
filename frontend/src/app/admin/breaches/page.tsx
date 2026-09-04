'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, 
  Scale, 
  Search, 
  ShieldAlert, 
  XCircle, 
  AlertTriangle, 
  User, 
  Building2, 
  Star, 
  ArrowDownRight, 
  Ban, 
  CheckCircle2, 
  ShieldCheck, 
  Gavel, 
  Phone, 
  Mail, 
  MessageSquare, 
  MapPin, 
  Calendar, 
  FileText, 
  AlertCircle,
  X,
  ExternalLink,
  Check
} from 'lucide-react';
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
        toast.success('Breach claim verified! Penalty deducted and reputation score updated.');
      } else {
        toast.success('Dispute claim dismissed as unsubstantiated.');
      }
      setSelectedBreach(null);
      queryClient.invalidateQueries({ queryKey: ['admin-breaches'] });
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to process dispute adjudication verdict.');
    }
  });

  const reports = data?.breaches || [];

  // Metrics
  const totalCount = reports.length;
  const pendingCount = reports.filter((r: any) => r.status === 'PENDING').length;
  const verifiedCount = reports.filter((r: any) => r.status === 'VERIFIED').length;
  const rejectedCount = reports.filter((r: any) => r.status === 'REJECTED' || r.status === 'DISMISSED').length;

  // Filtering logic
  const filteredReports = useMemo(() => {
    return reports.filter((report: any) => {
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
  }, [reports, searchTerm, statusFilter]);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in">
      
      {/* Sticky Header & Toolbar */}
      <div className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md pt-2 pb-4 -mx-8 px-8 border-b border-slate-200/60 dark:border-slate-800/60 space-y-4 mb-6 shadow-xs">
        
        {/* Executive Banner */}
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0a2e1d] via-[#0F5132] to-[#0a2e1d] text-white shadow-xl relative overflow-hidden border border-emerald-800/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#D97706]/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-900/60 text-red-200 border border-red-700/50">
                <Gavel className="w-3.5 h-3.5 text-red-400" />
                Statutory Judicial Governance
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D97706]/20 text-amber-200 border border-[#D97706]/30">
                Ghana Rent Act, 1963 (Act 220) Arbitration
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <Scale className="w-8 h-8 text-[#D97706]" />
              Tenancy Dispute &amp; Breach Command Center
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Adjudicate statutory tenancy infractions, investigate unlawful lockouts and unauthorized sublets, apply reputation penalties, and enforce institutional platform suspensions.
            </p>
          </div>

          <div className="relative z-10 shrink-0 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 block">Arbitration Standard</span>
            <span className="text-sm font-black text-white">Rent Control Board SLA</span>
            <div className="text-[10px] text-emerald-300 font-semibold mt-0.5">48h Mandated Review</div>
          </div>
        </div>

        {/* 4 Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Total Reported</span>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">{totalCount}</span>
              <span className="text-[10px] font-bold text-slate-500">All Dockets</span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Historical dispute caseload</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Pending Adjudication</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-[#D97706] border border-amber-100 dark:border-amber-900/40">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[#D97706]">{pendingCount}</span>
              <span className="text-[10px] font-bold text-[#D97706] flex items-center gap-0.5">
                Requires Ruling <ArrowDownRight className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Under active investigation</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Verified &amp; Penalized</span>
              <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 border border-red-100 dark:border-red-900/40">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">{verifiedCount}</span>
              <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5">
                Score Deducted <Gavel className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Statutory sanctions enforced</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Dismissed / Resolved</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[#0F5132] dark:text-emerald-400">{rejectedCount}</span>
              <span className="text-[10px] font-bold text-emerald-600">Amicable</span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Unsubstantiated or settled</p>
          </div>

        </div>

        {/* Filter Toolbar & Search */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xs">
          
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search accused tenant, landlord, or breach title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/30 text-[var(--foreground)]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full md:w-auto">
            {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={clsx(
                  "px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all capitalize cursor-pointer",
                  statusFilter === status
                    ? "bg-[#0F5132] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-[var(--foreground)]"
                )}
              >
                {status === 'ALL' ? 'All Disputes' : status.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Breach Reports Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={5} columns={6} />
        ) : filteredReports.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
              <Scale className="w-7 h-7" />
            </div>
            <h4 className="font-extrabold text-base text-[var(--foreground)]">No Tenancy Disputes Logged</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              There are currently no statutory breach reports matching status "{statusFilter.toLowerCase()}". All residential leases operate within compliant Act 220 parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0F5132] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-white font-extrabold">Offense Title &amp; Date</th>
                  <th className="px-6 py-4 text-white font-extrabold">Accused Party (Tenant)</th>
                  <th className="px-6 py-4 text-white font-extrabold">Complainant (Landlord)</th>
                  <th className="px-6 py-4 text-white font-extrabold">Residential Property</th>
                  <th className="px-6 py-4 text-white font-extrabold">Judicial Status</th>
                  <th className="px-6 py-4 text-right text-white font-extrabold">Adjudication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredReports.map((report: any) => {
                  const tenant = report.tenant || {};
                  const reporter = report.reporter || {};
                  const property = report.property || {};

                  return (
                    <tr 
                      key={report.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedBreach(report);
                        setPenaltyDeduction(1.0);
                        setSuspendAccount(tenant.isSuspended || false);
                        setAdminNotes('');
                      }}
                    >
                      <td className="px-6 py-4 max-w-[220px]">
                        <div className="font-extrabold text-[var(--foreground)] truncate text-xs" title={report.title}>
                          {report.title}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.createdAt).toLocaleDateString()} &bull; {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-500" />
                          {tenant.firstName} {tenant.lastName}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/40">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {(tenant.reputationScore || 5.0).toFixed(1)}/5.0
                          </span>
                          {tenant.isSuspended && (
                            <span className="text-[9px] font-black text-red-600 bg-red-100 dark:bg-red-950/50 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 border border-red-300 dark:border-red-900">
                              <Ban className="w-2.5 h-2.5" /> SUSPENDED
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-[var(--foreground)]">
                          {reporter.firstName} {reporter.lastName}
                        </div>
                        <div className="text-[10px] text-slate-500">{reporter.email || reporter.phoneNumber || 'Landlord'}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)] flex items-center gap-1.5 truncate max-w-[180px]">
                          <Building2 className="w-3.5 h-3.5 text-[#0F5132] shrink-0" />
                          <span className="truncate">{property.title || 'Residential Property'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {property.location || 'Ghana (Act 220)'}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {report.status === 'VERIFIED' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-300 dark:border-red-800">
                              <ShieldAlert className="w-3 h-3" /> VERIFIED &amp; PENALIZED
                            </span>
                            <div className="text-[10px] font-bold text-red-600 dark:text-red-400 flex items-center gap-0.5">
                              <ArrowDownRight className="w-3 h-3" /> Score Deducted
                            </div>
                          </div>
                        ) : report.status === 'REJECTED' || report.status === 'DISMISSED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                            <XCircle className="w-3 h-3" /> DISMISSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <AlertTriangle className="w-3 h-3" /> PENDING HEARING
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBreach(report);
                            setPenaltyDeduction(1.0);
                            setSuspendAccount(tenant.isSuspended || false);
                            setAdminNotes('');
                          }}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-[#0F5132] hover:text-white dark:bg-slate-800 dark:hover:bg-[#0F5132] text-[var(--foreground)] rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Gavel className="w-3.5 h-3.5" /> Adjudicate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
          <span>Ghana Rent Control Division &amp; Act 220 Arbitration Framework</span>
          <span>Showing {filteredReports.length} recorded disputes</span>
        </div>
      </div>

      {/* Adjudication Drawer / Modal */}
      {selectedBreach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-950 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center">
                  <Gavel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[var(--foreground)]">Arbitrate Tenancy Dispute</h3>
                  <p className="text-xs text-slate-500">Issue binding administrative verdict under Ghana Rent Act (Act 220).</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBreach(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Parties Dossier: Accused Tenant vs Complainant Landlord */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Accused Tenant */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-red-600 dark:text-red-400 tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" /> Accused Tenant
                </span>
                <div>
                  <div className="font-extrabold text-sm text-[var(--foreground)]">
                    {selectedBreach.tenant?.firstName} {selectedBreach.tenant?.lastName}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{selectedBreach.tenant?.email}</div>
                  {selectedBreach.tenant?.phoneNumber && (
                    <div className="text-[11px] text-slate-500">{selectedBreach.tenant.phoneNumber}</div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-amber-600 font-bold">Reputation: ⭐ {(selectedBreach.tenant?.reputationScore || 5.0).toFixed(1)}/5.0</span>
                  {selectedBreach.tenant?.phoneNumber && (
                    <a
                      href={`https://wa.me/${selectedBreach.tenant.phoneNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
                    >
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {/* Complainant Landlord */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-[#0F5132] dark:text-emerald-400 tracking-wider flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Complainant Landlord
                </span>
                <div>
                  <div className="font-extrabold text-sm text-[var(--foreground)]">
                    {selectedBreach.reporter?.firstName} {selectedBreach.reporter?.lastName}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{selectedBreach.reporter?.email}</div>
                  {selectedBreach.reporter?.phoneNumber && (
                    <div className="text-[11px] text-slate-500">{selectedBreach.reporter.phoneNumber}</div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-slate-500">Property Owner</span>
                  {selectedBreach.reporter?.phoneNumber && (
                    <a
                      href={`https://wa.me/${selectedBreach.reporter.phoneNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
                    >
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Dispute Details & Narrative */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-slate-400">Offense Allegation</span>
                <span className="text-[10px] font-bold text-slate-400">Property: {selectedBreach.property?.title || 'Residential Unit'}</span>
              </div>
              <h4 className="font-extrabold text-sm text-[var(--foreground)]">{selectedBreach.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed">
                {selectedBreach.description}
              </p>
            </div>

            {/* Verdict Controls (if Pending) */}
            {selectedBreach.status === 'PENDING' ? (
              <div className="space-y-4 pt-1">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[var(--foreground)] mb-1.5">
                    Reputation Score Penalty Deduction (-{penaltyDeduction} pts)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: 0.5, label: '-0.5 (Minor)' },
                      { val: 1.0, label: '-1.0 (Standard)' },
                      { val: 1.5, label: '-1.5 (Severe)' },
                      { val: 2.0, label: '-2.0 (Gross)' }
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.val}
                        onClick={() => setPenaltyDeduction(item.val)}
                        className={clsx(
                          "py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer",
                          penaltyDeduction === item.val
                            ? "bg-red-600 text-white border-red-600 shadow-md"
                            : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-[var(--foreground)]"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account Suspension Toggle */}
                <div className="flex items-center justify-between bg-red-50 dark:bg-red-950/30 p-3.5 rounded-2xl border border-red-200 dark:border-red-900/50">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-red-100 dark:bg-red-900/50 text-red-600 rounded-xl">
                      <Ban className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-900 dark:text-red-300">Suspend Accused Account</p>
                      <p className="text-[10px] text-red-700/80 dark:text-red-400/80">Revokes login &amp; restricts tenancy creation platform-wide</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={suspendAccount}
                    onChange={(e) => setSuspendAccount(e.target.checked)}
                    className="w-5 h-5 accent-red-600 rounded cursor-pointer"
                  />
                </div>

                {/* Administrative Reason */}
                <div>
                  <label className="block text-[11px] font-bold text-[var(--foreground)] mb-1">
                    Administrative Adjudication Ruling / Reason (Recorded to Immutable Log)
                  </label>
                  <input
                    type="text"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="e.g. Verified non-payment exceeding 30-day notice under Act 220..."
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-red-500/20 outline-none text-[var(--foreground)]"
                  />
                </div>

                {/* Action Buttons */}
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
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {resolveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gavel className="w-3.5 h-3.5" />}
                    Verify &amp; Apply Sanction
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                <span className="text-xs font-bold text-slate-500">Adjudication Complete</span>
                <p className="text-[11px] text-slate-400">
                  This dispute has already been adjudicated with verdict: <strong className="text-[var(--foreground)]">{selectedBreach.status}</strong>.
                </p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
