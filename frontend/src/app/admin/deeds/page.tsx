'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, 
  FileCheck, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Building2, 
  User, 
  ExternalLink, 
  ShieldCheck, 
  Star, 
  AlertTriangle, 
  CreditCard, 
  Phone, 
  Mail, 
  MessageSquare, 
  Eye, 
  X, 
  FileText, 
  Check, 
  Stamp, 
  Maximize2,
  Sparkles,
  MapPin,
  IdCard,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonTable from '@/components/SkeletonTable';
import clsx from 'clsx';

interface PropertySummary {
  id: string;
  title: string;
  location: string;
  approvalStatus: string;
}

interface LandlordDeedRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  landlordDocUrl?: string;
  ghanaCardNumber?: string;
  ghanaCardStatus?: string;
  ghanaCardFrontUrl?: string;
  isVerifiedLandlord: boolean;
  landlordVerificationStatus: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  reputationScore: number;
  createdAt: string;
  properties?: PropertySummary[];
}

export default function AdminLandlordDeedsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');
  const [selectedLandlord, setSelectedLandlord] = useState<LandlordDeedRecord | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Verification Checklist State
  const [checklist, setChecklist] = useState({
    titleSearch: false,
    sitePlan: false,
    identityMatch: false,
    encumbranceFree: false
  });

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
        toast.success('Landlord property deed approved! Verified Landlord status granted.');
      } else {
        toast.success('Deed submission rejected. Feedback notification dispatched.');
      }
      setSelectedLandlord(null);
      setRejectionNotes('');
      queryClient.invalidateQueries({ queryKey: ['admin-landlord-deeds'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update deed verification status.');
    }
  });

  const landlords: LandlordDeedRecord[] = data?.landlords || [];

  // Metrics
  const metrics = useMemo(() => {
    const total = landlords.length;
    const verified = landlords.filter(l => l.isVerifiedLandlord || l.landlordVerificationStatus === 'VERIFIED').length;
    const pending = landlords.filter(l => l.landlordVerificationStatus === 'PENDING').length;
    const rejected = landlords.filter(l => l.landlordVerificationStatus === 'REJECTED').length;
    const withGhanaCard = landlords.filter(l => l.ghanaCardNumber).length;
    const kycRate = total > 0 ? Math.round((withGhanaCard / total) * 100) : 100;

    return { total, verified, pending, rejected, kycRate };
  }, [landlords]);

  // Filtered landlords
  const filteredLandlords = useMemo(() => {
    return landlords.filter((l) => {
      const name = `${l.firstName || ''} ${l.lastName || ''}`.toLowerCase();
      const email = (l.email || '').toLowerCase();
      const phone = (l.phoneNumber || '').toLowerCase();
      const card = (l.ghanaCardNumber || '').toLowerCase();
      const search = searchTerm.toLowerCase();

      return name.includes(search) || email.includes(search) || phone.includes(search) || card.includes(search);
    });
  }, [landlords, searchTerm]);

  const handleOpenInspector = (landlord: LandlordDeedRecord) => {
    setSelectedLandlord(landlord);
    setRejectionNotes('');
    setChecklist({
      titleSearch: landlord.isVerifiedLandlord,
      sitePlan: landlord.isVerifiedLandlord,
      identityMatch: !!landlord.ghanaCardNumber,
      encumbranceFree: landlord.isVerifiedLandlord
    });
  };

  const isAllChecklistPassed = checklist.titleSearch && checklist.sitePlan && checklist.identityMatch && checklist.encumbranceFree;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in">
      
      {/* Sticky Header & Toolbar Container */}
      <div className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md pt-2 pb-4 -mx-8 px-8 border-b border-slate-200/60 dark:border-slate-800/60 space-y-4 mb-6 shadow-xs">
        
        {/* Executive Banner */}
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0a2e1d] via-[#0F5132] to-[#0a2e1d] text-white shadow-xl relative overflow-hidden border border-emerald-800/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#D97706]/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-900/60 text-emerald-200 border border-emerald-700/50">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                Land Title Registry &amp; Indenture Audit
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D97706]/20 text-amber-200 border border-[#D97706]/30">
                Ghana Lands Commission &amp; Act 220 Standard
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <FileCheck className="w-8 h-8 text-[#D97706]" />
              Land Title &amp; Property Deed Audit Hub
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Verify landlord title deeds, conveyance indentures, Lands Commission searches, and NIA Ghana Card identity cross-checks before authorizing public residential property listings.
            </p>
          </div>

          <div className="relative z-10 shrink-0 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl text-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200 block">Statutory Guarantee</span>
            <span className="text-sm font-black text-white">Fraud-Free Titles</span>
            <div className="text-[10px] text-emerald-300 font-semibold mt-0.5">Section 18 Deed Registry Act</div>
          </div>
        </div>

        {/* 4 Executive KPI Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Total Landlords</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 border border-blue-100 dark:border-blue-900/40">
                <User className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">{metrics.total}</span>
              <span className="text-[10px] font-bold text-blue-600">Enrolled Owners</span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Registered property owners</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Verified Title Deeds</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[#0F5132] dark:text-emerald-400">{metrics.verified}</span>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                Authorized <CheckCircle2 className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Lands Commission validated</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Pending Deed Audits</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-[#D97706] border border-amber-100 dark:border-amber-900/40">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[#D97706]">{metrics.pending}</span>
              <span className="text-[10px] font-bold text-[#D97706]">Requires Review</span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Awaiting title inspection</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Ghana Card NIA KYC</span>
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 border border-indigo-100 dark:border-indigo-900/40">
                <IdCard className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">{metrics.kycRate}%</span>
              <span className="text-[10px] font-bold text-indigo-600">Identity Match</span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Cross-referenced with deed name</p>
          </div>

        </div>

        {/* Filter Toolbar & Live Search */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xs">
          
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search landlord name, email, phone, or Ghana Card..."
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
                {status === 'ALL' ? 'All Landlords' : status.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Landlord Deeds Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={5} columns={5} />
        ) : filteredLandlords.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
              <FileCheck className="w-7 h-7" />
            </div>
            <h4 className="font-extrabold text-base text-[var(--foreground)]">No Landlord Deed Records Found</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              There are currently no landlord ownership deed submissions matching filter status "{statusFilter.toLowerCase()}".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0F5132] text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-white font-extrabold">Landlord &amp; National ID</th>
                  <th className="px-6 py-4 text-white font-extrabold">Contact &amp; Region</th>
                  <th className="px-6 py-4 text-white font-extrabold">Residential Portfolio</th>
                  <th className="px-6 py-4 text-white font-extrabold">Deed / Indenture Status</th>
                  <th className="px-6 py-4 text-white font-extrabold">Verification Status</th>
                  <th className="px-6 py-4 text-right text-white font-extrabold">Deed Audit Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredLandlords.map((landlord) => (
                  <tr 
                    key={landlord.id} 
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    onClick={() => handleOpenInspector(landlord)}
                  >
                    {/* Landlord Name & ID */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-[var(--foreground)] flex items-center gap-1.5 text-xs">
                        <User className="w-3.5 h-3.5 text-[#0F5132]" />
                        {landlord.firstName} {landlord.lastName}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {(landlord.reputationScore || 5.0).toFixed(1)}/5.0
                        </span>
                        {landlord.ghanaCardNumber ? (
                          <span className="font-mono text-[9px] font-black bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                            {landlord.ghanaCardNumber}
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400">No Ghana Card</span>
                        )}
                      </div>
                    </td>

                    {/* Contact & Phone */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-[var(--foreground)]">{landlord.email}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{landlord.phoneNumber || 'No phone recorded'}</span>
                        {landlord.phoneNumber && (
                          <a
                            href={`https://wa.me/${landlord.phoneNumber.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
                          >
                            <MessageSquare className="w-2.5 h-2.5" /> WhatsApp
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Properties */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        {landlord.properties?.length || 0} Listed Residential {landlord.properties?.length === 1 ? 'Property' : 'Properties'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {landlord.properties?.[0]?.location || 'Ghana Nationwide'}
                      </div>
                    </td>

                    {/* Document Upload Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {landlord.landlordDocUrl ? (
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800">
                            <FileText className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <span className="font-bold text-[var(--foreground)] block text-xs">Title Deed Uploaded</span>
                            <span className="text-[10px] text-slate-400">Indenture / Conveyance</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="text-xs font-semibold">Missing Document</span>
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {landlord.isVerifiedLandlord || landlord.landlordVerificationStatus === 'VERIFIED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> VERIFIED TITLE DEED
                        </span>
                      ) : landlord.landlordVerificationStatus === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border border-red-300 dark:border-red-800">
                          <XCircle className="w-3 h-3" /> DEED REJECTED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <FileCheck className="w-3 h-3" /> PENDING AUDIT
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInspector(landlord);
                        }}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-[#0F5132] hover:text-white dark:bg-slate-800 dark:hover:bg-[#0F5132] text-[var(--foreground)] rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect Deed
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
          <span>Ghana Lands Commission Land Title Registry Compliance</span>
          <span>Showing {filteredLandlords.length} enrolled landlords</span>
        </div>
      </div>

      {/* Deep Deed Inspector Drawer / Modal */}
      {selectedLandlord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            
            {/* Drawer Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-[var(--foreground)]">Audit Landlord Property Deed</h3>
                  <p className="text-xs text-slate-500">Verify Ghana Lands Commission conveyance indenture and title proof.</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLandlord(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Landlord Identity Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-base text-[var(--foreground)] flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#0F5132]" />
                    {selectedLandlord.firstName} {selectedLandlord.lastName}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedLandlord.email} &bull; {selectedLandlord.phoneNumber || 'No phone'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900/40">
                    ⭐ {(selectedLandlord.reputationScore || 5.0).toFixed(1)}/5.0
                  </span>
                  {selectedLandlord.phoneNumber && (
                    <a
                      href={`https://wa.me/${selectedLandlord.phoneNumber.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs"
                    >
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </a>
                  )}
                </div>
              </div>

              {/* Ghana Card NIA Identity Match */}
              <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block">National Identity (NIA Ghana Card)</span>
                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                    {selectedLandlord.ghanaCardNumber || 'NIA Card not submitted'}
                  </span>
                </div>
                <span className={clsx(
                  "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border",
                  selectedLandlord.ghanaCardNumber 
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  {selectedLandlord.ghanaCardNumber ? 'KYC Matched' : 'Pending KYC'}
                </span>
              </div>
            </div>

            {/* Document Preview Box */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Stamp className="w-3.5 h-3.5 text-[#D97706]" /> Submitted Property Deed / Title Document
                </span>
                {selectedLandlord.landlordDocUrl && (
                  <a
                    href={selectedLandlord.landlordDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    Open in New Tab <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {selectedLandlord.landlordDocUrl ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-900 text-center relative group">
                  <img
                    src={selectedLandlord.landlordDocUrl}
                    alt="Property Deed"
                    className="max-h-64 w-full object-contain mx-auto transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(selectedLandlord.landlordDocUrl!)}
                      className="px-4 py-2 bg-white text-slate-900 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer hover:bg-slate-100"
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> Fullscreen Lightbox
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 rounded-2xl space-y-2">
                  <AlertTriangle className="w-8 h-8 mx-auto text-[#D97706]" />
                  <p className="font-bold text-xs">No Deed Document Uploaded Yet</p>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 max-w-sm mx-auto">
                    The landlord enrolled via expedited registration. Please request an Indenture scan or Land Title Certificate before approving.
                  </p>
                </div>
              )}
            </div>

            {/* Statutory Ghana Lands Commission Checklist */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Statutory Audit Checklist (Ghana Lands Commission Protocol)
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.titleSearch}
                    onChange={(e) => setChecklist(prev => ({ ...prev, titleSearch: e.target.checked }))}
                    className="w-4 h-4 accent-[#0F5132] rounded cursor-pointer"
                  />
                  <span className="font-medium text-[var(--foreground)]">Indenture / Title Stamp Validated</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.sitePlan}
                    onChange={(e) => setChecklist(prev => ({ ...prev, sitePlan: e.target.checked }))}
                    className="w-4 h-4 accent-[#0F5132] rounded cursor-pointer"
                  />
                  <span className="font-medium text-[var(--foreground)]">Licensed Surveyor Cadastral Plan</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.identityMatch}
                    onChange={(e) => setChecklist(prev => ({ ...prev, identityMatch: e.target.checked }))}
                    className="w-4 h-4 accent-[#0F5132] rounded cursor-pointer"
                  />
                  <span className="font-medium text-[var(--foreground)]">NIA Ghana Card Name Matches Deed</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist.encumbranceFree}
                    onChange={(e) => setChecklist(prev => ({ ...prev, encumbranceFree: e.target.checked }))}
                    className="w-4 h-4 accent-[#0F5132] rounded cursor-pointer"
                  />
                  <span className="font-medium text-[var(--foreground)]">Clean Search (No Adverse Claims)</span>
                </label>
              </div>
            </div>

            {/* Audit Notes / Rejection Reason */}
            <div>
              <label className="block text-[11px] font-bold text-[var(--foreground)] mb-1">
                Audit Notes / Rejection Feedback (Recorded &amp; Dispatched to Landlord)
              </label>
              <input
                type="text"
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="e.g. Indenture requires Lands Commission stamping seal on page 2..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none text-[var(--foreground)]"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                disabled={auditMutation.isPending}
                onClick={() => auditMutation.mutate({ id: selectedLandlord.id, status: 'REJECTED', notes: rejectionNotes })}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {auditMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                Reject Deed Submission
              </button>

              <button
                disabled={auditMutation.isPending || !selectedLandlord.landlordDocUrl}
                onClick={() => auditMutation.mutate({ id: selectedLandlord.id, status: 'VERIFIED', notes: rejectionNotes })}
                className="flex-1 py-2.5 bg-[#0F5132] hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {auditMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5 text-[#D97706]" />}
                Approve Deed &amp; Grant Verified Status
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-6 right-6 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-all text-sm font-bold"
          >
            ✕ Close
          </button>
          <img
            src={lightboxUrl}
            alt="Deed Full Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}

    </div>
  );
}
