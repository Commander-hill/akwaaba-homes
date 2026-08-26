'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Ban,
  CheckCircle2,
  Building,
  User,
  DollarSign,
  Image as ImageIcon,
  ExternalLink,
  Sparkles
} from 'lucide-react';

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

  // Fetch Fraud Scan Results
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['admin', 'fraud-scan'],
    queryFn: async () => {
      const res = await api.get('/fraud/scan');
      return res.data;
    },
    staleTime: 60 * 1000
  });

  // Resolve Fraud Action Mutation
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-500/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-gradient-to-br from-red-500/20 to-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              AI Automated Security Engine
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Fraud & Scam Detection Center
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time heuristic scanning of active hostel listings across Ghana to detect price anomalies, duplicate photos, unverified Ghana Card signals, and fake accounts.
            </p>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Scanning Platform...' : 'Re-Run AI Scan'}
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800">
          <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50">
            <p className="text-xs font-semibold text-slate-400 uppercase">Total Scanned</p>
            <p className="text-2xl font-black text-white mt-1">{data?.totalScanned || 0}</p>
          </div>
          <div className="bg-red-950/40 backdrop-blur-md rounded-2xl p-4 border border-red-800/40">
            <p className="text-xs font-semibold text-red-400 uppercase">High Risk Flags</p>
            <p className="text-2xl font-black text-red-400 mt-1">{data?.highRiskCount || 0}</p>
          </div>
          <div className="bg-amber-950/40 backdrop-blur-md rounded-2xl p-4 border border-amber-800/40">
            <p className="text-xs font-semibold text-amber-400 uppercase">Medium Risk Flags</p>
            <p className="text-2xl font-black text-amber-400 mt-1">{data?.mediumRiskCount || 0}</p>
          </div>
          <div className="bg-emerald-950/40 backdrop-blur-md rounded-2xl p-4 border border-emerald-800/40">
            <p className="text-xs font-semibold text-emerald-400 uppercase">System Status</p>
            <p className="text-sm font-black text-emerald-400 mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Active Defense
            </p>
          </div>
        </div>
      </div>

      {/* Toast Alert */}
      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <span>{actionSuccessMsg}</span>
          <CheckCircle2 className="w-4 h-4" />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-[var(--border)]">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
              filter === 'ALL'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Flagged ({reports.length})
          </button>
          <button
            onClick={() => setFilter('HIGH')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
              filter === 'HIGH'
                ? 'bg-red-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            High Risk ({reports.filter(r => r.riskLevel === 'HIGH').length})
          </button>
          <button
            onClick={() => setFilter('MEDIUM')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-colors cursor-pointer ${
              filter === 'MEDIUM'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Medium Risk ({reports.filter(r => r.riskLevel === 'MEDIUM').length})
          </button>
        </div>
      </div>

      {/* Scan Results Cards */}
      {isLoading ? (
        <div className="p-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm font-extrabold text-slate-500">Scanning platform listings with AI rules...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border-2 border-dashed border-[var(--border)] bg-[var(--card)] space-y-3">
          <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-extrabold text-[var(--foreground)]">No Suspicious Listings Detected</h3>
          <p className="text-xs text-[var(--muted-foreground)]">All active property listings pass platform security and Ghana Card validation checks.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredReports.map(report => (
            <div
              key={report.propertyId}
              className={`rounded-3xl border p-6 space-y-5 transition-all shadow-md ${
                report.riskLevel === 'HIGH'
                  ? 'bg-red-50/50 dark:bg-red-950/20 border-red-300 dark:border-red-800/60'
                  : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/60'
              }`}
            >
              {/* Card Top: Property Title & Risk Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-base font-extrabold text-[var(--foreground)] line-clamp-1">
                      {report.title}
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">{report.location}</p>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shrink-0 ${
                    report.riskLevel === 'HIGH'
                      ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                      : 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  }`}
                >
                  {report.riskScore}% {report.riskLevel} RISK
                </span>
              </div>

              {/* Landlord Info & Price */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-[var(--border)] text-xs">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <User className="w-3 h-3" /> Landlord
                  </p>
                  <p className="font-extrabold text-[var(--foreground)] truncate">{report.landlordName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{report.landlordEmail}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Price / Ghana Card
                  </p>
                  <p className="font-extrabold text-indigo-600 dark:text-indigo-400">GHS {report.price.toLocaleString()}</p>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    report.ghanaCardStatus === 'APPROVED'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
                      : 'bg-red-100 dark:bg-red-950 text-red-600'
                  }`}>
                    Ghana Card: {report.ghanaCardStatus}
                  </span>
                </div>
              </div>

              {/* Detected Risk Flags List */}
              <div className="space-y-2">
                <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <ShieldAlert className="w-4 h-4 text-red-500" /> Detected Risk Anomaly Signals:
                </p>
                <ul className="space-y-1.5">
                  {report.flags.map((flag, idx) => (
                    <li
                      key={idx}
                      className="text-xs font-semibold text-red-700 dark:text-red-300 bg-red-100/60 dark:bg-red-900/30 px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-800/40 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <span>{flag}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <a
                  href={`/properties/${report.propertyId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View
                </a>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => resolveMutation.mutate({ propertyId: report.propertyId, action: 'APPROVE' })}
                    disabled={resolveMutation.isPending}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>

                  <button
                    onClick={() => resolveMutation.mutate({ propertyId: report.propertyId, action: 'SUSPEND_PROPERTY' })}
                    disabled={resolveMutation.isPending}
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Suspend
                  </button>

                  <button
                    onClick={() => resolveMutation.mutate({ propertyId: report.propertyId, action: 'SUSPEND_LANDLORD' })}
                    disabled={resolveMutation.isPending}
                    className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" /> Ban User
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
