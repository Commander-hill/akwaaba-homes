'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, 
  Scale, 
  Search, 
  XCircle, 
  AlertTriangle, 
  User, 
  Building2, 
  Star, 
  ArrowDownRight, 
  Ban, 
  CheckCircle2, 
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
  Check,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonTable from '@/components/SkeletonTable';
import clsx from 'clsx';
import AlertBanner from '@/components/AlertBanner';

export default function AdminBreachesPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [selectedBreach, setSelectedBreach] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [penaltyDeduction, setPenaltyDeduction] = useState<number>(1.0);
  const [suspendAccount, setSuspendAccount] = useState<boolean>(false);
  const [adminNotes, setAdminNotes] = useState<string>('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-breaches'],
    queryFn: async () => {
      const res = await api.get('/admin/breaches');
      return res.data;
    }
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const resolveMutation = useMutation({
    mutationFn: async ({ id, status, penaltyDeduction, suspendAccount, adminNotes }: { id: string; status: 'VERIFIED' | 'REJECTED' | 'DISMISSED'; penaltyDeduction?: number; suspendAccount?: boolean; adminNotes?: string }) => {
      await api.put(`/admin/breaches/${id}/resolve`, { status, penaltyDeduction, suspendAccount, adminNotes });
    },
    onSuccess: (_, variables) => {
      if (variables.status === 'VERIFIED') {
        toast.success('Breach claim verified! Statutory penalty deducted and reputation score updated.');
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

  const STANDARD_REASONS = [
    'Unlawful lockout or lock tampering without Rent Control Board order',
    'Unauthorized commercial subletting or room swapping violation',
    'Unsettled utility arrears exceeding 30-day statutory notice',
    'Willful physical property damage exceeding security deposit',
    'Disturbance of quiet enjoyment and persistent conduct breach',
    'Claim dismissed: unsubstantiated allegation with no objective proof'
  ];

  return (
    <div className="space-y-6 pb-20 animate-in fade-in">
      
      {/* ── 1. STATUTORY EXECUTIVE HERO ── */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-[#0B1510] via-[#0E1E16] to-[#080E0A] text-white shadow-xl relative overflow-hidden border border-emerald-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        
        {/* Subtle Ambient Radial Lighting */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 shadow-xs">
              <Scale className="w-3.5 h-3.5 text-emerald-400" />
              Statutory Dispute Resolution
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Ghana Rent Act, 1963 (Act 220)
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <Gavel className="w-8 h-8 text-amber-400 shrink-0" />
            Tenancy Dispute &amp; Breach Review
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl font-normal">
            Adjudicate tenancy infractions, investigate unlawful lockouts, examine unauthorized subletting, enforce statutory reputation penalties, and issue binding platform mediation verdicts.
          </p>
        </div>

        {/* Right SLA Reassurance Box */}
        <div className="relative z-10 shrink-0 bg-zinc-900/80 backdrop-blur-md border border-zinc-800/90 p-4 rounded-2xl text-center shadow-lg min-w-[200px]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block font-mono">Arbitration Protocol</span>
          <span className="text-sm font-extrabold text-white block mt-0.5">Rent Control Board SLA</span>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold mt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>48h Mandated Review</span>
          </div>
        </div>
      </div>

      {/* ── 2. EXECUTIVE METRIC KPI CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Caseload */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#12151C] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total Reported</span>
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-900 dark:text-white">{totalCount}</span>
            <span className="text-[11px] font-mono font-semibold text-zinc-500">All Dockets</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Historical dispute caseload</p>
        </div>

        {/* Pending Hearing */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#12151C] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:border-amber-500/40 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pending Adjudication</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
              <AlertTriangle className={clsx("w-4 h-4", pendingCount > 0 && "animate-pulse")} />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</span>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
              Requires Ruling <ArrowDownRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Under active investigation</p>
        </div>

        {/* Verified & Penalized */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#12151C] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:border-rose-500/40 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Verified &amp; Penalized</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40">
              <Gavel className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400">{verifiedCount}</span>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
              Score Deducted <ArrowDownRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Statutory sanctions enforced</p>
        </div>

        {/* Dismissed / Resolved */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#12151C] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:border-emerald-500/40 transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Dismissed / Resolved</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-[#0F5132] dark:text-emerald-400">{rejectedCount}</span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Amicable</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 font-medium">Unsubstantiated or settled</p>
        </div>

      </div>

      {/* ── 3. FILTER TOOLBAR & REAL-TIME SEARCH ── */}
      <div className="p-4 bg-white dark:bg-[#12151C] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xs">
        
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search accused party, complainant, or citation title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs cursor-pointer p-0.5"
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Segment Tabs & Refresh */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex flex-wrap gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl">
            {(['ALL', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((status) => {
              const count = status === 'ALL' ? totalCount : status === 'PENDING' ? pendingCount : status === 'VERIFIED' ? verifiedCount : rejectedCount;
              const label = status === 'ALL' ? 'All Disputes' : status === 'PENDING' ? 'Pending' : status === 'VERIFIED' ? 'Verified' : 'Dismissed';

              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                    statusFilter === status
                      ? "bg-[#0F5132] text-white shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  <span>{label}</span>
                  <span className={clsx(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                    statusFilter === status 
                      ? "bg-white/20 text-white font-bold" 
                      : "bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh disputes dossier"
            className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RotateCcw className={clsx("w-4 h-4", isRefreshing && "animate-spin text-emerald-500")} />
          </button>
        </div>
      </div>

      {/* ── 4. MAIN BREACH REPORTS TABLE / REASSURING EMPTY STATE ── */}
      <div className="bg-white dark:bg-[#12151C] rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={5} columns={6} />
        ) : filteredReports.length === 0 ? (
          /* Prestigious Empty State */
          <div className="py-20 px-6 text-center flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
              <ShieldCheck className="w-8 h-8" />
            </div>
            
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                Tenancy Arbitration Docket Clear
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-normal">
                There are currently no breach reports matching status <strong className="text-zinc-900 dark:text-white">&quot;{statusFilter.toLowerCase()}&quot;</strong>. All residential leases and student host tenancies are operating in compliance with statutory platform standards.
              </p>
            </div>

            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0B1510] text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wider border-b border-emerald-900/40">
                <tr>
                  <th className="px-6 py-4 text-emerald-200 font-extrabold">Offense Title &amp; Date</th>
                  <th className="px-6 py-4 text-emerald-200 font-extrabold">Accused Party (Tenant)</th>
                  <th className="px-6 py-4 text-emerald-200 font-extrabold">Complainant (Landlord)</th>
                  <th className="px-6 py-4 text-emerald-200 font-extrabold">Residential Property</th>
                  <th className="px-6 py-4 text-emerald-200 font-extrabold">Judicial Status</th>
                  <th className="px-6 py-4 text-right text-emerald-200 font-extrabold">Adjudication</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {filteredReports.map((report: any) => {
                  const tenant = report.tenant || {};
                  const reporter = report.reporter || {};
                  const property = report.property || {};

                  return (
                    <tr 
                      key={report.id} 
                      className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedBreach(report);
                        setPenaltyDeduction(1.0);
                        setSuspendAccount(tenant.isSuspended || false);
                        setAdminNotes('');
                      }}
                    >
                      <td className="px-6 py-4 max-w-[220px]">
                        <div className="font-extrabold text-zinc-900 dark:text-white truncate text-xs group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" title={report.title}>
                          {report.title}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {new Date(report.createdAt).toLocaleDateString()} &bull; {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-blue-500" />
                          <span>{tenant.firstName} {tenant.lastName}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/40">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> {(tenant.reputationScore || 5.0).toFixed(1)}/5.0
                          </span>
                          {tenant.isSuspended && (
                            <span className="text-[9px] font-mono font-bold text-red-600 bg-red-100 dark:bg-red-950/50 px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5 border border-red-300 dark:border-red-900">
                              <Ban className="w-2.5 h-2.5" /> SUSPENDED
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-zinc-900 dark:text-white">
                          {reporter.firstName} {reporter.lastName}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">{reporter.email || reporter.phoneNumber || 'Landlord'}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5 truncate max-w-[180px]">
                          <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{property.title || 'Residential Property'}</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          <span>{property.location || 'Ghana'}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {report.status === 'VERIFIED' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <Gavel className="w-3 h-3" /> VERIFIED &amp; PENALIZED
                            </span>
                            <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 font-mono">
                              <ArrowDownRight className="w-3 h-3" /> Points Deducted
                            </div>
                          </div>
                        ) : report.status === 'REJECTED' || report.status === 'DISMISSED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                            <XCircle className="w-3 h-3" /> DISMISSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
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
                          className="px-3.5 py-1.5 bg-zinc-100 hover:bg-[#0F5132] hover:text-white dark:bg-zinc-800 dark:hover:bg-[#0F5132] text-zinc-900 dark:text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <Gavel className="w-3.5 h-3.5" />
                          <span>Adjudicate</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Audit Bar */}
        <div className="p-4 bg-zinc-50 dark:bg-[#0E1015] border-t border-zinc-200/80 dark:border-zinc-800/80 flex flex-col sm:flex-row justify-between items-center text-[11px] font-mono text-zinc-500 gap-2">
          <span>PLATFORM STATUTORY ARBITRATION REGISTRY // ACT 220</span>
          <span>RECORDED DISPUTES: {filteredReports.length} OF {totalCount}</span>
        </div>
      </div>

      {/* ── 5. STATUTORY ADJUDICATION DRAWER / MODAL ── */}
      {selectedBreach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#0D1017] w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-center shadow-xs">
                  <Gavel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white tracking-tight">
                    Arbitrate Tenancy Dispute
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">
                    Statutory Tribunal Docket // Act 220 Review
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBreach(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Parties Dossier: Accused Tenant vs Complainant Landlord */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Accused Tenant */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase text-rose-600 dark:text-rose-400 tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" /> Accused Tenant
                </span>
                <div>
                  <div className="font-extrabold text-sm text-zinc-900 dark:text-white">
                    {selectedBreach.tenant?.firstName} {selectedBreach.tenant?.lastName}
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono mt-0.5 truncate">{selectedBreach.tenant?.email}</div>
                  {selectedBreach.tenant?.phoneNumber && (
                    <div className="text-[11px] text-zinc-500 font-mono">{selectedBreach.tenant.phoneNumber}</div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {(selectedBreach.tenant?.reputationScore || 5.0).toFixed(1)}/5.0
                  </span>
                  {selectedBreach.tenant?.phoneNumber && (
                    <a
                      href={`https://wa.me/${selectedBreach.tenant.phoneNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {/* Complainant Landlord */}
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase text-[#0F5132] dark:text-emerald-400 tracking-wider flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Complainant Landlord
                </span>
                <div>
                  <div className="font-extrabold text-sm text-zinc-900 dark:text-white">
                    {selectedBreach.reporter?.firstName} {selectedBreach.reporter?.lastName}
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono mt-0.5 truncate">{selectedBreach.reporter?.email}</div>
                  {selectedBreach.reporter?.phoneNumber && (
                    <div className="text-[11px] text-zinc-500 font-mono">{selectedBreach.reporter.phoneNumber}</div>
                  )}
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-zinc-500 font-medium">Property Owner</span>
                  {selectedBreach.reporter?.phoneNumber && (
                    <a
                      href={`https://wa.me/${selectedBreach.reporter.phoneNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-500 flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Allegation Details */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">Offense Allegation</span>
                <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[240px]">
                  Unit: {selectedBreach.property?.title || 'Residential Unit'}
                </span>
              </div>
              <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white">{selectedBreach.title}</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-950 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 leading-relaxed font-normal">
                {selectedBreach.description}
              </p>
            </div>

            {/* Verdict Controls (if Pending) */}
            {selectedBreach.status === 'PENDING' ? (
              <div className="space-y-4 pt-1">
                
                {/* Penalty Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Reputation Score Penalty Deduction (-{penaltyDeduction} pts)
                    </label>
                    <span className="text-[11px] font-mono font-bold text-rose-500">
                      New Score: {Math.max(1.0, (selectedBreach.tenant?.reputationScore || 5.0) - penaltyDeduction).toFixed(1)}/5.0
                    </span>
                  </div>
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
                            ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                            : "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Account Suspension Toggle */}
                <div className="flex items-center justify-between bg-rose-50/70 dark:bg-rose-950/20 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/40">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-rose-100 dark:bg-rose-900/50 text-rose-600 rounded-xl">
                      <Ban className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-rose-900 dark:text-rose-200">Suspend Accused Account</p>
                      <p className="text-[10px] text-rose-700/80 dark:text-rose-400/80">Revokes login &amp; restricts tenancy creation platform-wide</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={suspendAccount}
                    onChange={(e) => setSuspendAccount(e.target.checked)}
                    className="w-5 h-5 accent-rose-600 rounded cursor-pointer"
                  />
                </div>

                {/* Standard Judicial Reason Presets */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Administrative Ruling Reason (Immutable Audit Log)
                  </label>
                  
                  {/* Preset Pills */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {STANDARD_REASONS.map((reason, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setAdminNotes(reason)}
                        className="px-2 py-1 rounded-lg text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer text-left"
                      >
                        + {reason.slice(0, 32)}...
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Enter formal arbitration reason or select preset above..."
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 transition-all"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    disabled={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate({ id: selectedBreach.id, status: 'REJECTED', adminNotes })}
                    className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {resolveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>Dismiss Claim</span>
                  </button>

                  <button
                    disabled={resolveMutation.isPending}
                    onClick={() => resolveMutation.mutate({ id: selectedBreach.id, status: 'VERIFIED', penaltyDeduction, suspendAccount, adminNotes })}
                    className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {resolveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gavel className="w-3.5 h-3.5" />}
                    <span>Verify &amp; Apply Sanction</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-center space-y-1">
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Adjudication Complete</span>
                <p className="text-[11px] text-zinc-500 font-mono">
                  This dispute has already been adjudicated with verdict: <strong className="text-zinc-900 dark:text-white">{selectedBreach.status}</strong>.
                </p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
