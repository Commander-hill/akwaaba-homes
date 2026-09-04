'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Building,
  User,
  ExternalLink,
  CheckCircle2,
  Lock,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

interface FraudReport {
  propertyId: string;
  title: string;
  location: string;
  landlordName: string;
  landlordEmail: string;
  landlordId: string;
  ghanaCardStatus: string;
  price: number;
  riskScore: number;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  flags: string[];
  createdAt: string;
}

export default function FraudDetectionTab() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Fetch Compliance Scan Results
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['admin', 'fraud-scan'],
    queryFn: async () => {
      const res = await api.get('/fraud/scan');
      return res.data;
    },
    staleTime: 60 * 1000
  });

  // Resolve Action Mutation
  const resolveMutation = useMutation({
    mutationFn: async ({ propertyId, action }: { propertyId: string; action: 'APPROVE' | 'SUSPEND_PROPERTY' | 'SUSPEND_LANDLORD' }) => {
      const res = await api.post('/fraud/resolve', { propertyId, action });
      return res.data;
    },
    onSuccess: (res) => {
      setActionSuccessMsg(res.message);
      queryClient.invalidateQueries({ queryKey: ['admin', 'fraud-scan'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'properties'] });
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  });

  const reports: FraudReport[] = data?.reports || [];
  const filteredReports = reports.filter(r => {
    if (filter === 'HIGH') return r.riskLevel === 'HIGH';
    if (filter === 'MEDIUM') return r.riskLevel === 'MEDIUM';
    return true;
  });

  return (
    <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-6 shadow-xs">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-zinc-950 dark:text-white">
              Listing Compliance &amp; Act 220 Verification
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#0F5132] dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Active Monitoring
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Automated compliance verification scanning for price anomalies, duplicate media, and landlord KYC signals.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
          className="px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={clsx("w-3.5 h-3.5", isRefetching && "animate-spin")} />
          <span>{isRefetching ? 'Verifying...' : 'Re-verify Listings'}</span>
        </button>
      </div>

      {/* Toast Alert */}
      {actionSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
          <span>{actionSuccessMsg}</span>
          <CheckCircle2 className="w-4 h-4 text-[#0F5132]" />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl">
          <button
            onClick={() => setFilter('ALL')}
            className={clsx(
              "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
              filter === 'ALL' 
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs" 
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            All Audited ({reports.length})
          </button>
          <button
            onClick={() => setFilter('HIGH')}
            className={clsx(
              "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
              filter === 'HIGH' 
                ? "bg-rose-600 text-white shadow-xs" 
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            High Priority ({reports.filter(r => r.riskLevel === 'HIGH').length})
          </button>
          <button
            onClick={() => setFilter('MEDIUM')}
            className={clsx(
              "px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
              filter === 'MEDIUM' 
                ? "bg-amber-600 text-white shadow-xs" 
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            Review Suggested ({reports.filter(r => r.riskLevel === 'MEDIUM').length})
          </button>
        </div>

        <div className="text-[11px] font-semibold text-zinc-400 hidden sm:block">
          {data?.totalScanned || 0} active platform properties evaluated
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="p-8 text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-[#0F5132] animate-spin mx-auto" />
          <p className="text-xs font-bold text-zinc-400">Evaluating statutory compliance...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 space-y-2">
          <ShieldCheck className="w-8 h-8 text-[#0F5132] mx-auto" />
          <h3 className="text-xs font-bold text-zinc-900 dark:text-white">All Properties Comply with Platform Standards</h3>
          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
            No active property listings currently trigger compliance or fraud flags.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map(report => (
            <div
              key={report.propertyId}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 space-y-3"
            >
              {/* Top Row: Title, Location & Risk Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-zinc-500" />
                    <h3 className="font-bold text-sm text-zinc-950 dark:text-white">
                      {report.title}
                    </h3>
                  </div>
                  <p className="text-xs text-zinc-500">{report.location}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={clsx(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                    report.riskLevel === 'HIGH' 
                      ? "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                      : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                  )}>
                    {report.riskScore}% {report.riskLevel} Priority
                  </span>
                  
                  <span className="text-xs font-black text-zinc-900 dark:text-white">
                    GH₵ {Number(report.price).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Landlord KYC & Flags Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                <div className="p-2.5 bg-white dark:bg-zinc-800/80 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase block">Landlord &amp; ID</span>
                    <span className="font-bold text-zinc-900 dark:text-white">{report.landlordName}</span>
                    <span className="text-[10px] text-zinc-400 block truncate">{report.landlordEmail}</span>
                  </div>
                  <span className={clsx(
                    "text-[10px] font-bold px-2 py-0.5 rounded",
                    report.ghanaCardStatus === 'APPROVED'
                      ? "bg-emerald-50 text-[#0F5132] border border-emerald-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  )}>
                    {report.ghanaCardStatus === 'APPROVED' ? 'Ghana Card Verified ✓' : 'ID Pending'}
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-zinc-800/80 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Detected Signals</span>
                  <div className="space-y-1">
                    {report.flags.map((flag, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[11px] text-zinc-700 dark:text-zinc-300 font-medium">
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="truncate">{flag}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
                <Link
                  href={`/properties/${report.propertyId}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs font-bold text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
                >
                  <Eye className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Inspect Public Listing</span>
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </Link>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => resolveMutation.mutate({ propertyId: report.propertyId, action: 'APPROVE' })}
                    disabled={resolveMutation.isPending}
                    className="px-3 py-1 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Approve Act 220
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveMutation.mutate({ propertyId: report.propertyId, action: 'SUSPEND_PROPERTY' })}
                    disabled={resolveMutation.isPending}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Suspend Listing
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
