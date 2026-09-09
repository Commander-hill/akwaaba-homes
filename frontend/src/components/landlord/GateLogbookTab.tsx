'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  ShieldCheck, Clock, User, Phone, Check, AlertCircle, Loader2, 
  Search, RefreshCw, KeyRound, LogOut, LogIn, AlertTriangle, 
  DoorOpen, CheckCircle2, ShieldAlert, ArrowRight, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useSocket } from '@/providers/SocketProvider';

interface VisitorPass {
  id: string;
  propertyId: string;
  visitorName: string;
  visitorPhone: string | null;
  purpose: string | null;
  accessCode: string;
  validFrom: string;
  validUntil: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED' | string;
  checkInTime: string | null;
  checkOutTime: string | null;
  createdAt: string;
  tenant?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    email: string;
  };
}

interface GateLogbookTabProps {
  properties?: any[];
}

export default function GateLogbookTab({ properties = [] }: GateLogbookTabProps) {
  const queryClient = useQueryClient();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [accessCodeInput, setAccessCodeInput] = useState<string>('');
  const [activeSubTab, setActiveSubTab] = useState<'INSIDE' | 'EXPECTED' | 'CHECKED_OUT' | 'ALL'>('INSIDE');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fallback query to guarantee live landlord properties list
  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'landlord', 'mine'],
    queryFn: async () => {
      try {
        const res = await api.get('/properties/landlord/mine');
        return res.data?.data || [];
      } catch {
        return [];
      }
    }
  });

  const rawProps = (propertiesData && propertiesData.length > 0) ? propertiesData : properties;
  const propertyList = rawProps.map((p: any) => ({
    id: p.id || p.propertyId,
    title: p.title || p.propertyTitle || 'Property',
    location: p.location || p.propertyLocation || ''
  })).filter((p: any) => Boolean(p.id));

  useEffect(() => {
    if (!selectedPropertyId && propertyList.length > 0) {
      setSelectedPropertyId(propertyList[0].id);
    }
  }, [propertyList, selectedPropertyId]);

  // Fetch passes for selected property
  const { data: passesData, isLoading, refetch, isFetching } = useQuery<{ passes: VisitorPass[] }>({
    queryKey: ['propertyVisitorPasses', selectedPropertyId],
    queryFn: async () => {
      if (!selectedPropertyId) return { passes: [] };
      const res = await api.get(`/visitor-passes/property/${selectedPropertyId}`);
      return res.data;
    },
    enabled: Boolean(selectedPropertyId)
  });

  const passes: VisitorPass[] = passesData?.passes || [];

  const { socket } = useSocket();

  // Real-time socket sync
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (payload: any) => {
      if (payload?.propertyId === selectedPropertyId || !payload?.propertyId) {
        queryClient.invalidateQueries({ queryKey: ['propertyVisitorPasses', selectedPropertyId] });
      }
    };

    socket.on('visitor_pass_created', handleUpdate);
    socket.on('visitor_pass_updated', handleUpdate);
    socket.on('visitor_checked_in', handleUpdate);
    socket.on('visitor_checked_out', handleUpdate);

    return () => {
      socket.off('visitor_pass_created', handleUpdate);
      socket.off('visitor_pass_updated', handleUpdate);
      socket.off('visitor_checked_in', handleUpdate);
      socket.off('visitor_checked_out', handleUpdate);
    };
  }, [selectedPropertyId, queryClient]);

  // Gate PIN Verification mutation
  const verifyPinMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await api.post('/visitor-passes/verify', { accessCode: code.trim() });
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || 'Visitor cleared for entry! ✅', { duration: 4000 });
      setAccessCodeInput('');
      queryClient.invalidateQueries({ queryKey: ['propertyVisitorPasses', selectedPropertyId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Invalid or expired access PIN');
    }
  });

  // Check out mutation
  const checkOutMutation = useMutation({
    mutationFn: async (passId: string) => {
      const res = await api.patch(`/visitor-passes/${passId}/checkout`);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || 'Visitor signed out successfully 👋');
      queryClient.invalidateQueries({ queryKey: ['propertyVisitorPasses', selectedPropertyId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to checkout visitor');
    }
  });

  // KPI Calculations
  const stats = useMemo(() => {
    const now = new Date();
    let insideCount = 0;
    let curfewBreaches = 0;
    let expectedCount = 0;
    let clearedToday = 0;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    passes.forEach((pass) => {
      const isInside = pass.checkInTime && !pass.checkOutTime;
      if (isInside) {
        insideCount++;
        // If guest is inside beyond validUntil
        if (now > new Date(pass.validUntil)) {
          curfewBreaches++;
        }
      }
      if (!pass.checkInTime && pass.status === 'ACTIVE' && now <= new Date(pass.validUntil)) {
        expectedCount++;
      }
      if (pass.checkInTime && new Date(pass.checkInTime) >= startOfToday) {
        clearedToday++;
      }
    });

    return { insideCount, curfewBreaches, expectedCount, clearedToday };
  }, [passes]);

  // Filtered passes
  const filteredPasses = useMemo(() => {
    const now = new Date();
    return passes.filter((pass) => {
      const isInside = pass.checkInTime && !pass.checkOutTime;
      const isExpected = !pass.checkInTime && pass.status === 'ACTIVE';
      const isCheckedOut = Boolean(pass.checkOutTime);

      if (activeSubTab === 'INSIDE' && !isInside) return false;
      if (activeSubTab === 'EXPECTED' && !isExpected) return false;
      if (activeSubTab === 'CHECKED_OUT' && !isCheckedOut) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchVisitor = pass.visitorName.toLowerCase().includes(q);
        const matchCode = pass.accessCode.includes(q);
        const matchTenant = pass.tenant 
          ? `${pass.tenant.firstName} ${pass.tenant.lastName}`.toLowerCase().includes(q) 
          : false;
        return matchVisitor || matchCode || matchTenant;
      }

      return true;
    });
  }, [passes, activeSubTab, searchQuery]);

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCodeInput.trim()) {
      toast.error('Please enter the 6-digit access PIN');
      return;
    }
    verifyPinMutation.mutate(accessCodeInput.trim());
  };

  return (
    <div className="space-y-6">
      {/* Header & Property Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-xl">
            <DoorOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Digital Porter’s Desk &amp; Gate Logbook</h2>
            <p className="text-xs text-slate-500">Live guest entry clearance, visitor logbook, and curfew security</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--primary)] cursor-pointer"
          >
            {propertyList.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.title} {p.location ? `(${p.location})` : ''}
              </option>
            ))}
          </select>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Refresh logbook"
          >
            <RefreshCw className={clsx("w-5 h-5", isFetching && "animate-spin text-[var(--primary)]")} />
          </button>
        </div>
      </div>

      {/* Quick Access PIN Verification Terminal */}
      <div className="bg-gradient-to-r from-[#0F5132]/10 via-[#0F5132]/5 to-transparent border border-[#0F5132]/30 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F5132] dark:text-emerald-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" /> Porter Station Verification
            </span>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              Verify 6-Digit Gate PIN
            </h3>
            <p className="text-xs text-slate-500 max-w-md">
              Ask visitor for their 6-digit access code generated by the resident. Verification automatically registers check-in.
            </p>
          </div>

          <form onSubmit={handleVerifySubmit} className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 min-w-[200px]">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                maxLength={6}
                value={accessCodeInput}
                onChange={(e) => setAccessCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Enter 6-digit PIN..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono font-bold tracking-widest text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F5132]"
              />
            </div>
            <button
              type="submit"
              disabled={verifyPinMutation.isPending || !accessCodeInput}
              className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0c4128] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
            >
              {verifyPinMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Clear Entry
            </button>
          </form>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <LogIn className="w-3.5 h-3.5" /> Inside Compound
          </span>
          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mt-1">
            {stats.insideCount}
          </div>
          <span className="text-[11px] text-emerald-600/80">Active visitors</span>
        </div>

        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Curfew Breaches
          </span>
          <div className="text-2xl font-black text-rose-800 dark:text-rose-200 mt-1">
            {stats.curfewBreaches}
          </div>
          <span className="text-[11px] text-rose-600/80">Pass expired / past hours</span>
        </div>

        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Expected Arrivals
          </span>
          <div className="text-2xl font-black text-amber-800 dark:text-amber-200 mt-1">
            {stats.expectedCount}
          </div>
          <span className="text-[11px] text-amber-600/80">Valid passes pending</span>
        </div>

        <div className="p-4 bg-slate-500/10 border border-slate-500/20 rounded-2xl">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Cleared Today
          </span>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
            {stats.clearedToday}
          </div>
          <span className="text-[11px] text-slate-500">Total entries registered</span>
        </div>
      </div>

      {/* Curfew Policy Banner */}
      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
        <span>
          <strong>Hostel Curfew Notice:</strong> Standard visiting hours conclude at <strong>10:00 PM</strong>. Non-resident visitors remaining inside without prior caretaker authorization will be flagged for overnight checkout.
        </span>
      </div>

      {/* Filter Toolbar & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        {/* Sub-tabs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveSubTab('INSIDE')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeSubTab === 'INSIDE'
                ? "bg-[#0F5132] text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
            )}
          >
            Inside Compound ({stats.insideCount})
          </button>
          <button
            onClick={() => setActiveSubTab('EXPECTED')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeSubTab === 'EXPECTED'
                ? "bg-[#0F5132] text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
            )}
          >
            Expected ({stats.expectedCount})
          </button>
          <button
            onClick={() => setActiveSubTab('CHECKED_OUT')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeSubTab === 'CHECKED_OUT'
                ? "bg-[#0F5132] text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
            )}
          >
            Departed / Checked Out
          </button>
          <button
            onClick={() => setActiveSubTab('ALL')}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              activeSubTab === 'ALL'
                ? "bg-[#0F5132] text-white shadow-xs"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
            )}
          >
            All Logs ({passes.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search visitor, host or PIN..."
            className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-none"
          />
        </div>
      </div>

      {/* Visitor Logbook List */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
          <p className="text-sm font-medium">Loading gate logbook records...</p>
        </div>
      ) : filteredPasses.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
          No visitor log records matching the selected view.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPasses.map((pass) => {
            const isInside = pass.checkInTime && !pass.checkOutTime;
            const isCurfewBreach = isInside && new Date() > new Date(pass.validUntil);
            const isCheckedOut = Boolean(pass.checkOutTime);

            return (
              <div
                key={pass.id}
                className={clsx(
                  "p-4 bg-white dark:bg-slate-900 border rounded-2xl transition-all shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4",
                  isCurfewBreach
                    ? "border-rose-500/60 bg-rose-50/10"
                    : isInside
                      ? "border-emerald-500/40"
                      : "border-slate-200 dark:border-slate-800"
                )}
              >
                {/* Left: Visitor & Host Details */}
                <div className="flex items-start gap-3">
                  <div className={clsx(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 mt-0.5",
                    isCurfewBreach 
                      ? "bg-rose-500/20 text-rose-600" 
                      : isInside 
                        ? "bg-emerald-500/20 text-emerald-600" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                  )}>
                    {pass.visitorName.charAt(0)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {pass.visitorName}
                      </h4>
                      <span className="font-mono text-xs font-extrabold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
                        PIN: {pass.accessCode}
                      </span>
                      {isCurfewBreach ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 border border-rose-500/30">
                          Curfew Exceeded ⚠️
                        </span>
                      ) : isInside ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                          Inside Compound 🟢
                        </span>
                      ) : isCheckedOut ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                          Checked Out 👋
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600">
                          Expected ⏳
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span>Purpose: <strong>{pass.purpose || 'Guest Visit'}</strong></span>
                      {pass.visitorPhone && (
                        <>
                          <span>•</span>
                          <a 
                            href={`tel:${pass.visitorPhone}`}
                            className="text-slate-600 dark:text-slate-400 hover:underline flex items-center gap-0.5"
                          >
                            <Phone className="w-3 h-3" /> {pass.visitorPhone}
                          </a>
                        </>
                      )}
                    </div>

                    {/* Host Resident Information */}
                    {pass.tenant && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 pt-0.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Host Resident: <strong>{pass.tenant.firstName} {pass.tenant.lastName}</strong></span>
                        {pass.tenant.phoneNumber && (
                          <a 
                            href={`tel:${pass.tenant.phoneNumber}`}
                            className="text-[var(--primary)] hover:underline ml-1 font-semibold"
                          >
                            ({pass.tenant.phoneNumber})
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Timestamps & Check-Out Action */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 self-end lg:self-center">
                  <div className="text-right text-xs text-slate-500 space-y-0.5">
                    {pass.checkInTime ? (
                      <div>
                        In: <strong className="text-slate-700 dark:text-slate-300">{new Date(pass.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> ({new Date(pass.checkInTime).toLocaleDateString()})
                      </div>
                    ) : (
                      <div>Valid Until: {new Date(pass.validUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    )}
                    {pass.checkOutTime && (
                      <div>
                        Out: <strong className="text-slate-700 dark:text-slate-300">{new Date(pass.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                      </div>
                    )}
                  </div>

                  {isInside && (
                    <button
                      onClick={() => checkOutMutation.mutate(pass.id)}
                      disabled={checkOutMutation.isPending}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
