'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Building, Wrench, Scale, BellRing, Package, Key, Users, 
  Calendar, CheckCircle2, AlertTriangle, Loader2, Copy, Plus, 
  Phone, Mail, MapPin, ExternalLink, Clock, Check, X,
  FileText, ClipboardCheck, ArrowRight, Gauge, Zap, Droplets, 
  Fuel, Activity, ShieldCheck, MessageSquare, ChevronRight,
  Eye, CheckCircle, Search, Filter, AlertCircle, Sparkles,
  LayoutDashboard, ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Link from 'next/link';
import GateLogbookTab from '@/components/landlord/GateLogbookTab';
import RoomAssetInventoryTab from '@/components/landlord/RoomAssetInventoryTab';
import HostelDisciplinaryTab from '@/components/landlord/HostelDisciplinaryTab';
import UtilitySubMeterTab from '@/components/landlord/UtilitySubMeterTab';
import { useSearchParams, useRouter } from 'next/navigation';
import { getImageUrl } from '@/lib/utils';

// Main 4 Operational Domains
type DomainTab = 'overview' | 'maintenance' | 'security' | 'facilities';

function CaretakerDashboardContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTabParam = searchParams.get('tab') || 'overview';

  // Map legacy/sidebar 9 tabs to the 4 streamlined domains
  const initialDomain: DomainTab = useMemo(() => {
    if (rawTabParam === 'tickets') return 'maintenance';
    if (['visitors', 'parcels', 'conduct'].includes(rawTabParam)) return 'security';
    if (['meters', 'assets', 'inspections', 'notices'].includes(rawTabParam)) return 'facilities';
    return 'overview';
  }, [rawTabParam]);

  const [activeDomain, setActiveDomain] = useState<DomainTab>(initialDomain);
  const [securitySubTab, setSecuritySubTab] = useState<'visitors' | 'parcels' | 'conduct'>(
    ['visitors', 'parcels', 'conduct'].includes(rawTabParam) ? (rawTabParam as any) : 'visitors'
  );
  const [facilitiesSubTab, setFacilitiesSubTab] = useState<'meters' | 'assets' | 'inspections' | 'notices'>(
    ['meters', 'assets', 'inspections', 'notices'].includes(rawTabParam) ? (rawTabParam as any) : 'meters'
  );

  // Sync tab with URL search parameter changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (!tabFromUrl) return;

    if (tabFromUrl === 'tickets') {
      setActiveDomain('maintenance');
    } else if (['visitors', 'parcels', 'conduct'].includes(tabFromUrl)) {
      setActiveDomain('security');
      setSecuritySubTab(tabFromUrl as any);
    } else if (['meters', 'assets', 'inspections', 'notices'].includes(tabFromUrl)) {
      setActiveDomain('facilities');
      setFacilitiesSubTab(tabFromUrl as any);
    } else if (tabFromUrl === 'overview') {
      setActiveDomain('overview');
    }
  }, [searchParams]);

  const [copiedEmail, setCopiedEmail] = useState(false);

  // Ticket Action Modal state
  const [ticketActionModal, setTicketActionModal] = useState<{
    isOpen: boolean;
    ticketId: string;
    ticketTitle: string;
    mode: 'SCHEDULE' | 'RESOLVE';
    scheduledDate: string;
    repairCost: string;
    resolutionNotes: string;
    completionImageUrl: string;
  }>({
    isOpen: false,
    ticketId: '',
    ticketTitle: '',
    mode: 'RESOLVE',
    scheduledDate: new Date().toISOString().split('T')[0],
    repairCost: '0',
    resolutionNotes: 'Repair completed successfully.',
    completionImageUrl: '',
  });

  // Parcel Collection Modal state
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [collectParcel, setCollectParcel] = useState<any>(null);
  const [collectOtp, setCollectOtp] = useState('');

  // Meter & Utility Logging state
  const [meterReadings, setMeterReadings] = useState<Array<{
    id: string;
    propertyId: string;
    propertyTitle: string;
    utilityType: 'ECG_ELECTRICITY' | 'GWCL_WATER' | 'GENERATOR_DIESEL';
    unitNumber: string;
    meterNumber: string;
    previousReading: number;
    currentReading: number;
    unitOfMeasure: string;
    remainingCredit?: number;
    fuelLevelPct?: number;
    loggedAt: string;
    status: 'NORMAL' | 'LOW_BALANCE' | 'HIGH_CONSUMPTION' | 'READY';
    notes?: string;
  }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('akwaaba_caretaker_meter_readings');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [
      {
        id: 'meter-init-1',
        propertyId: 'mock-1',
        propertyTitle: 'SSNIT Hostel',
        utilityType: 'ECG_ELECTRICITY',
        unitNumber: 'Block A - Main Sub-Meter',
        meterNumber: 'ECG-7829-019',
        previousReading: 14280,
        currentReading: 14590,
        unitOfMeasure: 'kWh',
        remainingCredit: 245.50,
        loggedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'NORMAL',
        notes: 'Prepaid balance topped up with GH₵ 300 via ECG Mobile App.'
      },
      {
        id: 'meter-init-2',
        propertyId: 'mock-1',
        propertyTitle: 'SSNIT Hostel',
        utilityType: 'GWCL_WATER',
        unitNumber: 'Reservoir Tank Polytank #1',
        meterNumber: 'GWCL-WTR-5510',
        previousReading: 890,
        currentReading: 912,
        unitOfMeasure: 'm³ (Cubic Meters)',
        loggedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'NORMAL',
        notes: 'Polytank filled to 95% from GWCL main line.'
      },
      {
        id: 'meter-init-3',
        propertyId: 'mock-1',
        propertyTitle: 'SSNIT Hostel',
        utilityType: 'GENERATOR_DIESEL',
        unitNumber: 'Compound Standby Perkins 65kVA',
        meterNumber: 'GEN-DIESEL-01',
        previousReading: 120,
        currentReading: 185,
        unitOfMeasure: 'Liters / Fuel Tank %',
        fuelLevelPct: 82,
        loggedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'NORMAL',
        notes: 'Filled with 100L diesel fuel before exam revision week.'
      },
      {
        id: 'meter-init-4',
        propertyId: 'mock-1',
        propertyTitle: 'SSNIT Hostel',
        utilityType: 'ECG_ELECTRICITY',
        unitNumber: 'Block B - Executive Floor 2',
        meterNumber: 'ECG-7829-020',
        previousReading: 8200,
        currentReading: 8295,
        unitOfMeasure: 'kWh',
        remainingCredit: 45.00,
        loggedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        status: 'LOW_BALANCE',
        notes: 'Prepaid balance below GH₵ 50. Top-up recommended soon.'
      }
    ];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('akwaaba_caretaker_meter_readings', JSON.stringify(meterReadings));
    }
  }, [meterReadings]);

  // Fetch Current Caretaker Session
  const { data: sessionData, isLoading: isAuthLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    }
  });

  const currentUser = sessionData?.user || sessionData;
  const userEmail = currentUser?.email || '';
  const userName = (currentUser?.firstName ? (currentUser.firstName + ' ' + (currentUser.lastName || '')) : '').trim() || 'Caretaker';

  // Fetch Caretaker Assigned Properties & Operations Data
  const { data: staffData, isLoading: isStaffLoading } = useQuery({
    queryKey: ['staff', 'mine'],
    queryFn: async () => {
      try {
        const res = await api.get('/staff/mine');
        const rawList = res.data?.assignments || res.data?.staff || [];
        return { assignments: rawList };
      } catch (err) {
        try {
          const fallback = await api.get('/staff');
          const rawList = fallback.data?.assignments || fallback.data?.staff || [];
          return { assignments: rawList };
        } catch {
          return { assignments: [] };
        }
      }
    },
    refetchInterval: 5000,
  });

  const rawAssignments = staffData?.assignments || [];
  const assignments = rawAssignments.map((a: any) => {
    if (a.property) {
      return a;
    }
    return {
      id: a.id,
      role: a.role || 'CARETAKER',
      canManageTickets: a.canManageTickets !== false,
      canCheckInTenants: a.canCheckInTenants !== false,
      canPostNotices: a.canPostNotices !== false,
      property: a
    };
  });

  const assignedProperties = assignments.map((a: any) => a.property).filter(Boolean);

  // Synchronize live meter readings from backend with local cache
  useEffect(() => {
    let isMounted = true;
    if (assignedProperties.length > 0) {
      const fetchAllPropertyMeters = async () => {
        try {
          const promises = assignedProperties.map((p: any) =>
            api.get(`/inspections/property/${p.id}/meters`).then((res: any) => res.data?.readings || []).catch(() => [])
          );
          const results = await Promise.all(promises);
          const combined = results.flat();
          if (combined.length > 0 && isMounted) {
            setMeterReadings((prev: any[]) => {
              const prevIds = new Set(prev.map((m: any) => m.id));
              const newItems = combined.filter((m: any) => !prevIds.has(m.id));
              return [...newItems, ...prev];
            });
          }
        } catch (e) {}
      };
      fetchAllPropertyMeters();
    }
    return () => { isMounted = false; };
  }, [assignedProperties.length]);

  // Aggregate operations across all assigned properties
  const allTickets = useMemo(() => assignedProperties.flatMap((p: any) => 
    (p.tickets || []).map((t: any) => ({ ...t, propertyTitle: p.title, propertyId: p.id }))
  ), [assignedProperties]);

  const allBookings = useMemo(() => assignedProperties.flatMap((p: any) => 
    (p.bookings || []).map((b: any) => ({ ...b, propertyTitle: p.title, propertyId: p.id }))
  ), [assignedProperties]);

  const allNotices = useMemo(() => assignedProperties.flatMap((p: any) => 
    (p.compoundNotices || p.notices || []).map((n: any) => ({ ...n, propertyTitle: p.title, propertyId: p.id }))
  ), [assignedProperties]);

  const allParcels = useMemo(() => assignedProperties.flatMap((p: any) => 
    (p.packageDeliveries || p.deliveryParcels || []).map((d: any) => ({ ...d, propertyTitle: p.title, propertyId: p.id }))
  ), [assignedProperties]);

  const allVisitorPasses = useMemo(() => assignedProperties.flatMap((p: any) => 
    (p.visitorPasses || []).map((v: any) => ({ ...v, propertyTitle: p.title, propertyId: p.id }))
  ), [assignedProperties]);

  // Mutations
  const updateTicketMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { id, ...data } = payload;
      const res = await api.patch('/tickets/' + id + '/status', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Work order updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff', 'mine'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update ticket');
    }
  });


  const collectParcelMutation = useMutation({
    mutationFn: async ({ id, pickupCode }: { id: string; pickupCode: string }) => {
      const res = await api.patch(`/deliveries/${id}/collect`, { pickupCode });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Parcel verified and handed over to resident');
      setCollectModalOpen(false);
      setCollectParcel(null);
      setCollectOtp('');
      queryClient.invalidateQueries({ queryKey: ['staff', 'mine'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to verify pickup OTP');
    }
  });

  const handleCopyEmail = () => {
    if (userEmail) {
      navigator.clipboard.writeText(userEmail);
      setCopiedEmail(true);
      toast.success('Staff email copied to clipboard!');
      setTimeout(() => setCopiedEmail(false), 2500);
    } else {
      toast.error('Email address not loaded yet. Please refresh the page.');
    }
  };

  const handleDomainChange = (domain: DomainTab) => {
    setActiveDomain(domain);
    let targetUrlParam: string = domain;
    if (domain === 'maintenance') targetUrlParam = 'tickets';
    if (domain === 'security') targetUrlParam = securitySubTab;
    if (domain === 'facilities') targetUrlParam = facilitiesSubTab;
    router.push('/dashboard/caretaker?tab=' + targetUrlParam, { scroll: false });
  };

  const handleSecuritySubTabChange = (tab: 'visitors' | 'parcels' | 'conduct') => {
    setSecuritySubTab(tab);
    router.push('/dashboard/caretaker?tab=' + tab, { scroll: false });
  };

  const handleFacilitiesSubTabChange = (tab: 'meters' | 'assets' | 'inspections' | 'notices') => {
    setFacilitiesSubTab(tab);
    router.push('/dashboard/caretaker?tab=' + tab, { scroll: false });
  };

  if (isAuthLoading || isStaffLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-9 h-9 animate-spin text-[#0F5132]" />
        <p className="text-xs font-bold text-zinc-400">Loading facility operations command...</p>
      </div>
    );
  }

  const pendingTicketsCount = allTickets.filter((t: any) => t.status !== 'RESOLVED').length;
  const unclaimedParcelsCount = allParcels.filter((p: any) => p.status === 'ARRIVED').length;
  const primaryProperty = assignedProperties[0] || null;

  return (
    <div className="space-y-6 pb-20 text-zinc-900 dark:text-white">
      
      {/* ── 1. EXECUTIVE OPERATIONS COMMAND HEADER ── */}
      <div className="relative rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 dark:from-[#0E1117] dark:via-[#12161F] dark:to-[#0B0D13] border border-zinc-800 text-white p-6 sm:p-7 shadow-xl overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-[#0F5132]/25 blur-3xl pointer-events-none -z-0" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            {/* Live Operational Status Chip */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Live Facility Monitor • On-Duty</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
                <ShieldCheck className="w-3.5 h-3.5 text-[#D97706]" />
                <span>Ghana Rent Act (Act 220) Compliant</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Facility Operations Command</span>
            </h1>

            <p className="text-xs sm:text-[13px] text-zinc-400 leading-relaxed">
              On-site operations for {userName}. Oversee maintenance tickets, gatehouse vehicle & visitor access, utility sub-meters, and room asset inventories.
            </p>
          </div>

          {/* Staff ID & Quick Primary Triggers */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 shrink-0">
            {/* Staff Email Identity Chip */}
            <div className="inline-flex items-center gap-2 bg-zinc-950/70 border border-zinc-800/80 px-3.5 py-1.5 rounded-xl text-xs backdrop-blur-md">
              <div className="text-[10px] font-extrabold uppercase text-zinc-400">Staff ID:</div>
              <span className="font-mono font-bold text-emerald-300 select-all">{userEmail}</span>
              <button
                onClick={handleCopyEmail}
                className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-emerald-300 transition cursor-pointer"
                title="Copy staff email for Landlord assignment"
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Quick Action Ribbon */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  setActiveDomain('security');
                  setSecuritySubTab('visitors');
                }}
                className="px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 text-white font-bold text-xs border border-zinc-700/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gate Pass</span>
              </button>

              <Link
                href={`/dashboard/caretaker/parcels/new?propertyId=${primaryProperty?.id || ''}`}
                className="px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-750 text-white font-bold text-xs border border-zinc-700/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              >
                <Package className="w-3.5 h-3.5 text-purple-400" />
                <span>Log Parcel</span>
              </Link>

              <Link
                href={`/dashboard/landlord/notices/new?propertyId=${primaryProperty?.id || ''}`}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#0F5132] to-[#15803D] hover:from-[#0A3D24] hover:to-[#0F5132] text-white font-black text-xs border border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40 active:scale-95"
              >
                <BellRing className="w-3.5 h-3.5 text-white" />
                <span>Broadcast Notice</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. 4-CARD KPI COMMAND GRID ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metric 1: Assigned Compounds */}
        <div 
          onClick={() => handleDomainChange('overview')}
          className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Assigned Facility</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
            {assignedProperties.length}
          </div>
          <div className="text-[11px] font-semibold text-zinc-500 mt-1 flex items-center gap-1">
            <span className="truncate">{primaryProperty ? primaryProperty.title : 'None Assigned'}</span>
          </div>
        </div>

        {/* Metric 2: Open Work Orders */}
        <div 
          onClick={() => handleDomainChange('maintenance')}
          className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs hover:shadow-md hover:border-amber-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Work Orders</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
            {pendingTicketsCount}
          </div>
          <div className="text-[11px] font-semibold text-zinc-500 mt-1 flex items-center gap-1.5">
            {pendingTicketsCount === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> All Repairs Cleared
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-bold">Action Required</span>
            )}
          </div>
        </div>

        {/* Metric 3: Gatehouse & Access */}
        <div 
          onClick={() => {
            handleDomainChange('security');
            setSecuritySubTab('visitors');
          }}
          className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs hover:shadow-md hover:border-blue-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Gatehouse Access</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Key className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
            {allVisitorPasses.length}
          </div>
          <div className="text-[11px] font-semibold text-zinc-500 mt-1 flex items-center gap-1.5">
            <span>Passes &amp; Check-Ins</span>
            {unclaimedParcelsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 text-[9px] font-extrabold">
                {unclaimedParcelsCount} parcels
              </span>
            )}
          </div>
        </div>

        {/* Metric 4: Monitored Sub-Meters */}
        <div 
          onClick={() => {
            handleDomainChange('facilities');
            setFacilitiesSubTab('meters');
          }}
          className="p-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/90 dark:border-zinc-800/90 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400">Sub-Meters Logged</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
            {meterReadings.length}
          </div>
          <div className="text-[11px] font-semibold text-zinc-500 mt-1">
            ECG Power, GWCL &amp; Gen
          </div>
        </div>
      </div>

      {/* ── 3. STREAMLINED 4-DOMAIN SEGMENTED NAVIGATION ── */}
      <div className="space-y-3">
        <div className="bg-zinc-100 dark:bg-[#12151D] p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'overview', label: 'Command Overview', icon: LayoutDashboard },
            { 
              id: 'maintenance', 
              label: 'Work Orders & Repairs', 
              icon: Wrench,
              badge: pendingTicketsCount > 0 ? pendingTicketsCount : undefined,
              badgeColor: 'bg-amber-500 text-zinc-950'
            },
            { 
              id: 'security', 
              label: 'Gatehouse & Access', 
              icon: Key,
              badge: unclaimedParcelsCount > 0 ? unclaimedParcelsCount : undefined,
              badgeColor: 'bg-purple-500 text-white'
            },
            { 
              id: 'facilities', 
              label: 'Utilities & Inventories', 
              icon: Gauge,
              badge: meterReadings.length > 0 ? meterReadings.length : undefined,
              badgeColor: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
            },
          ].map((domain) => {
            const Icon = domain.icon;
            const isActive = activeDomain === domain.id;
            return (
              <button
                key={domain.id}
                onClick={() => handleDomainChange(domain.id as any)}
                className={clsx(
                  "flex-1 min-w-[170px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer select-none",
                  isActive 
                    ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm border border-zinc-200/80 dark:border-zinc-700" 
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-850"
                )}
              >
                <Icon className={clsx("w-4 h-4 shrink-0", isActive ? "text-[#0F5132] dark:text-emerald-400" : "text-zinc-400")} />
                <span className="truncate">{domain.label}</span>
                {domain.badge !== undefined && domain.badge > 0 && (
                  <span className={clsx("px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0", domain.badgeColor)}>
                    {domain.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Secondary Sub-Tab Bar for Security Domain */}
        {activeDomain === 'security' && (
          <div className="flex items-center gap-2 pl-1 border-b border-zinc-200 dark:border-zinc-800 pb-2">
            {[
              { id: 'visitors', label: `Gatehouse Logbook (${allVisitorPasses.length})`, icon: Key },
              { id: 'parcels', label: `Package Deliveries (${allParcels.length})`, icon: Package },
              { id: 'conduct', label: 'Hostel Conduct & Disciplinary', icon: Scale },
            ].map((sub) => {
              const Icon = sub.icon;
              const isSubActive = securitySubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => handleSecuritySubTabChange(sub.id as any)}
                  className={clsx(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer",
                    isSubActive 
                      ? "bg-[#0F5132] text-white shadow-xs" 
                      : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Secondary Sub-Tab Bar for Facilities Domain */}
        {activeDomain === 'facilities' && (
          <div className="flex items-center gap-2 pl-1 border-b border-zinc-200 dark:border-zinc-800 pb-2 overflow-x-auto scrollbar-none">
            {[
              { id: 'meters', label: `Utility Sub-Meters (${meterReadings.length})`, icon: Gauge },
              { id: 'assets', label: 'Room Fixtures & Asset Inventory', icon: ClipboardCheck },
              { id: 'inspections', label: `Move-In Inspections (${allBookings.length})`, icon: FileText },
              { id: 'notices', label: `Compound Notices (${allNotices.length})`, icon: BellRing },
            ].map((sub) => {
              const Icon = sub.icon;
              const isSubActive = facilitiesSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => handleFacilitiesSubTabChange(sub.id as any)}
                  className={clsx(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0",
                    isSubActive 
                      ? "bg-[#0F5132] text-white shadow-xs" 
                      : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 4. DOMAIN 1: COMMAND OVERVIEW ── */}
      {activeDomain === 'overview' && (
        <div className="space-y-6 animate-in">
          {assignedProperties.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Building className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-white">Awaiting Property Assignment</h3>
              <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
                Your caretaker account is active! Please share your staff email (<strong>{userEmail}</strong>) with your Landlord or Property Manager so they can delegate property management privileges to you.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleCopyEmail}
                  className="px-5 py-2.5 bg-[#0F5132] text-white font-bold rounded-xl text-xs inline-flex items-center gap-2 shadow-md shadow-emerald-950/20 hover:bg-[#0A3D24] transition cursor-pointer"
                >
                  {copiedEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedEmail ? 'Email Copied!' : 'Copy Staff Email for Landlord'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Rich Assigned Facility Showcase Card */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-black text-zinc-950 dark:text-white tracking-tight">
                    Your Assigned Facility
                  </h2>
                  <span className="text-xs font-bold text-zinc-400">
                    {assignedProperties.length} {assignedProperties.length === 1 ? 'Compound' : 'Compounds'} Under On-Site Management
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {assignments.map((assignment: any) => {
                    const prop = assignment.property;
                    if (!prop) return null;

                    const parsedImages = Array.isArray(prop.images) ? prop.images : (prop.images ? JSON.parse(prop.images) : []);
                    const coverPhoto = parsedImages?.[0] ? getImageUrl(parsedImages[0]) : 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80';

                    const totalBeds = prop.totalCapacity || 360;
                    const remainingBeds = prop.remainingCapacity !== undefined ? prop.remainingCapacity : totalBeds;
                    const occupiedBeds = Math.max(0, totalBeds - remainingBeds);
                    const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

                    return (
                      <div 
                        key={assignment.id} 
                        className="rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-12">
                          {/* Image & Facility Badge */}
                          <div className="lg:col-span-4 relative min-h-[220px] bg-zinc-900 overflow-hidden">
                            <img
                              src={coverPhoto}
                              alt={prop.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                            
                            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                              <span className="px-3 py-1 rounded-full bg-[#0F5132] text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                                {assignment.role.replace('_', ' ')}
                              </span>
                              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                                {prop.type || 'Student Hostel'}
                              </span>
                            </div>

                            <div className="absolute bottom-4 left-4 right-4 text-white">
                              <h3 className="text-xl font-black tracking-tight">{prop.title}</h3>
                              <p className="text-xs text-zinc-300 flex items-center gap-1.5 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>{prop.location || 'Koforidua, Ghana'}</span>
                              </p>
                            </div>
                          </div>

                          {/* Facility Operational Details */}
                          <div className="lg:col-span-8 p-6 sm:p-7 flex flex-col justify-between space-y-5">
                            <div className="space-y-4">
                              {/* Top Bar: Landlord Info & Contact */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200/80 dark:border-zinc-800">
                                <div className="space-y-0.5">
                                  <div className="text-[10px] font-extrabold uppercase text-zinc-400">
                                    Facility Landlord / Host
                                  </div>
                                  <div className="text-xs sm:text-sm font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                                    <span>{prop.landlord?.firstName} {prop.landlord?.lastName}</span>
                                    <span className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                      ✓ Verified Host
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {prop.landlord?.phoneNumber && (
                                    <a
                                      href={`tel:${prop.landlord.phoneNumber}`}
                                      className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 transition-colors flex items-center gap-1.5 shadow-xs"
                                    >
                                      <Phone className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                                      <span>{prop.landlord.phoneNumber}</span>
                                    </a>
                                  )}
                                  <Link
                                    href="/dashboard/messages"
                                    className="px-3 py-1.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Message</span>
                                  </Link>
                                </div>
                              </div>

                              {/* Live Occupancy Metric Bar */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-bold text-zinc-700 dark:text-zinc-300">
                                    Bed Occupancy &amp; Inventory
                                  </span>
                                  <span className="font-mono font-bold text-zinc-900 dark:text-white">
                                    {occupiedBeds} occupied / {totalBeds} total ({remainingBeds} vacant)
                                  </span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-[#0F5132] to-[#15803D] rounded-full transition-all duration-500"
                                    style={{ width: `${Math.min(100, Math.max(occupancyPct, 2))}%` }}
                                  />
                                </div>
                              </div>

                              {/* Authorized Caretaker Permissions */}
                              <div className="space-y-1.5">
                                <div className="text-[10px] font-extrabold uppercase text-zinc-400">
                                  Delegated On-Site Authorities
                                </div>
                                <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Work Order Management
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                                    <CheckCircle2 className="w-3 h-3 text-indigo-600" /> Move-In Room Check-Ins
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                                    <CheckCircle2 className="w-3 h-3 text-blue-600" /> Gatehouse Access Logbook
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                                    <CheckCircle2 className="w-3 h-3 text-purple-600" /> Package Deliveries
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Operational Shortcut Buttons */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                              <div className="text-xs text-zinc-500 font-medium">
                                Fast Operations:
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDomainChange('maintenance')}
                                  className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl transition cursor-pointer"
                                >
                                  Work Orders ({pendingTicketsCount})
                                </button>
                                <button
                                  onClick={() => {
                                    handleDomainChange('security');
                                    setSecuritySubTab('visitors');
                                  }}
                                  className="px-3.5 py-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                  <span>Gate Logbook</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Two-Column Urgent Operational Action Queue */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Column 1: Pending Maintenance Queue */}
                <div className="rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-wider">
                        Pending Repair Work Orders
                      </h3>
                    </div>
                    <button
                      onClick={() => handleDomainChange('maintenance')}
                      className="text-xs font-bold text-[#0F5132] dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>View All</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {allTickets.filter((t: any) => t.status !== 'RESOLVED').length === 0 ? (
                    <div className="py-8 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto">
                        <Check className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">All Work Orders Cleared</p>
                      <p className="text-[11px] text-zinc-400">No active maintenance complaints reported by residents.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {allTickets.filter((t: any) => t.status !== 'RESOLVED').slice(0, 3).map((t: any) => (
                        <div key={t.id} className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200/80 dark:border-zinc-800 flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              {t.priority || 'NORMAL'}
                            </span>
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-white leading-snug">{t.title}</h4>
                            <p className="text-[11px] text-zinc-500 line-clamp-1">{t.description}</p>
                          </div>
                          <button
                            onClick={() => {
                              setTicketActionModal({
                                isOpen: true,
                                ticketId: t.id,
                                ticketTitle: t.title,
                                mode: 'RESOLVE',
                                scheduledDate: new Date().toISOString().split('T')[0],
                                repairCost: t.cost ? String(t.cost) : '0',
                                resolutionNotes: t.resolutionNotes || 'Repair verified on-site.',
                                completionImageUrl: '',
                              });
                            }}
                            className="px-3 py-1.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-[11px] font-bold rounded-xl shrink-0 cursor-pointer shadow-xs"
                          >
                            Resolve
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Column 2: Unclaimed Courier Parcels */}
                <div className="rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-purple-500" />
                      <h3 className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-wider">
                        Package Intake &amp; Deliveries
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        handleDomainChange('security');
                        setSecuritySubTab('parcels');
                      }}
                      className="text-xs font-bold text-[#0F5132] dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>View Shelf</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {allParcels.filter((p: any) => p.status === 'ARRIVED').length === 0 ? (
                    <div className="py-8 text-center space-y-2">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
                        <Package className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Front Desk Shelf Clear</p>
                      <p className="text-[11px] text-zinc-400">All resident courier deliveries collected.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {allParcels.filter((p: any) => p.status === 'ARRIVED').slice(0, 3).map((p: any) => (
                        <div key={p.id} className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between gap-3">
                          <div className="space-y-0.5">
                            <span className="font-bold text-xs text-zinc-900 dark:text-white block">
                              {p.carrier || 'Courier Delivery'} • #{p.trackingNumber || 'PARCEL'}
                            </span>
                            <span className="text-[11px] text-zinc-500 block">
                              Location: {p.location || 'Shelf A'}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setCollectParcel(p);
                              setCollectModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold rounded-xl shrink-0 cursor-pointer shadow-xs"
                          >
                            Verify OTP
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 5. DOMAIN 2: MAINTENANCE WORK ORDERS & REPAIRS ── */}
      {activeDomain === 'maintenance' && (
        <div className="space-y-4 animate-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <div>
              <h2 className="text-lg font-black text-zinc-950 dark:text-white tracking-tight">
                Maintenance Work Orders
              </h2>
              <p className="text-xs text-zinc-500">
                Track, schedule, and resolve facility maintenance requests reported by residents.
              </p>
            </div>
            <div className="text-xs font-bold text-zinc-500">
              Total Work Orders: <span className="font-mono text-zinc-900 dark:text-white font-bold">{allTickets.length}</span>
            </div>
          </div>

          {allTickets.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2">
              <Wrench className="w-10 h-10 text-zinc-300 mx-auto" />
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">No Maintenance Requests Found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                No resident maintenance complaints have been submitted for your assigned facilities.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allTickets.map((ticket: any) => {
                const isResolved = ticket.status === 'RESOLVED';
                return (
                  <div key={ticket.id} className="p-5 rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={clsx(
                            "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                            ticket.priority === 'URGENT' ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300" :
                            ticket.priority === 'HIGH' ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300" :
                            "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          )}>
                            {ticket.priority || 'NORMAL'}
                          </span>
                          <span className={clsx(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            isResolved ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                          )}>
                            {ticket.status}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">{ticket.title}</h3>
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5" /> {ticket.propertyTitle}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                      {ticket.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                      <span className="text-zinc-400 font-medium">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                      {!isResolved && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setTicketActionModal({
                                isOpen: true,
                                ticketId: ticket.id,
                                ticketTitle: ticket.title,
                                mode: 'SCHEDULE',
                                scheduledDate: new Date().toISOString().split('T')[0],
                                repairCost: ticket.cost ? String(ticket.cost) : '0',
                                resolutionNotes: '',
                                completionImageUrl: '',
                              });
                            }}
                            className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-bold transition cursor-pointer"
                          >
                            Schedule
                          </button>
                          <button
                            onClick={() => {
                              setTicketActionModal({
                                isOpen: true,
                                ticketId: ticket.id,
                                ticketTitle: ticket.title,
                                mode: 'RESOLVE',
                                scheduledDate: new Date().toISOString().split('T')[0],
                                repairCost: ticket.cost ? String(ticket.cost) : '0',
                                resolutionNotes: 'Repair completed on-site.',
                                completionImageUrl: '',
                              });
                            }}
                            className="px-3 py-1.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-xl text-xs font-bold transition cursor-pointer"
                          >
                            Resolve &amp; Close
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── 6. DOMAIN 3: GATEHOUSE & RESIDENT ACCESS ── */}
      {activeDomain === 'security' && (
        <div className="space-y-4 animate-in">
          {securitySubTab === 'visitors' && (
            <GateLogbookTab properties={assignedProperties} />
          )}

          {securitySubTab === 'conduct' && (
            <HostelDisciplinaryTab properties={assignedProperties} bookings={allBookings} />
          )}

          {securitySubTab === 'parcels' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h2 className="text-lg font-black text-zinc-950 dark:text-white tracking-tight">
                    Package Intake &amp; Courier Deliveries
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Log incoming resident packages and securely verify OTP handovers.
                  </p>
                </div>
                <Link
                  href={`/dashboard/caretaker/parcels/new?propertyId=${primaryProperty?.id || ''}`}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Log New Delivery
                </Link>
              </div>

              {allParcels.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <Package className="w-10 h-10 text-zinc-300 mx-auto" />
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">No Deliveries on Shelf</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    No courier packages currently waiting for resident collection.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allParcels.map((parcel: any) => (
                    <div key={parcel.id} className="p-5 rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                          {parcel.carrier || 'Courier'}
                        </span>
                        <span className={clsx(
                          "text-[10px] font-bold uppercase",
                          parcel.status === 'ARRIVED' ? "text-amber-500" : "text-emerald-500"
                        )}>
                          {parcel.status}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-zinc-900 dark:text-white">Tracking: #{parcel.trackingNumber || 'N/A'}</h4>
                        <p className="text-xs text-zinc-500 mt-0.5">Location: {parcel.location || 'Shelf A'}</p>
                      </div>
                      {parcel.status === 'ARRIVED' && (
                        <button
                          onClick={() => {
                            setCollectParcel(parcel);
                            setCollectModalOpen(true);
                          }}
                          className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Verify Handover OTP
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 7. DOMAIN 4: UTILITIES & INVENTORIES ── */}
      {activeDomain === 'facilities' && (
        <div className="space-y-4 animate-in">
          {facilitiesSubTab === 'meters' && (
            <UtilitySubMeterTab properties={assignedProperties} />
          )}

          {facilitiesSubTab === 'assets' && (
            <RoomAssetInventoryTab properties={assignedProperties} bookings={allBookings} />
          )}

          {facilitiesSubTab === 'inspections' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h2 className="text-lg font-black text-zinc-950 dark:text-white tracking-tight">
                    Move-In Tenancy Inspections
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Conduct digital check-in audits and document room fixture conditions before resident move-in.
                  </p>
                </div>
              </div>

              {allBookings.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <ClipboardCheck className="w-10 h-10 text-zinc-300 mx-auto" />
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">No Tenancies Found</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Resident move-ins will appear here for statutory condition reporting.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allBookings.map((b: any) => (
                    <div key={b.id} className="p-5 rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="font-extrabold text-sm text-zinc-900 dark:text-white">
                          {b.tenant?.firstName} {b.tenant?.lastName}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded text-[10px] font-bold">
                          {b.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500">Property: {b.propertyTitle}</p>
                      <Link
                        href={`/dashboard/landlord/inspections/${b.id}`}
                        className="w-full py-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        Start Check-In Inspection
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {facilitiesSubTab === 'notices' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <h2 className="text-lg font-black text-zinc-950 dark:text-white tracking-tight">
                    Compound Broadcast Bulletins
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Post utility maintenance announcements, quiet hours, and facility alerts to all residents.
                  </p>
                </div>
                <Link
                  href={`/dashboard/landlord/notices/new?propertyId=${primaryProperty?.id || ''}`}
                  className="px-4 py-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> New Compound Notice
                </Link>
              </div>

              {allNotices.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <BellRing className="w-10 h-10 text-zinc-300 mx-auto" />
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">No Active Notices</h3>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Broadcast bulletins to notify residents of generator schedules or water shutoffs.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allNotices.map((notice: any) => (
                    <div key={notice.id} className="p-5 rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {notice.category || 'NOTICE'}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {new Date(notice.createdAt || Date.now()).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white">{notice.title}</h4>
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                        {notice.message || notice.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: TICKET SCHEDULE & RESOLVE ── */}
      {ticketActionModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12151D] rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                {ticketActionModal.mode === 'RESOLVE' ? 'Resolve Work Order' : 'Schedule Contractor'}
              </h3>
              <button onClick={() => setTicketActionModal(prev => ({ ...prev, isOpen: false }))}>
                <X className="w-4 h-4 text-zinc-400 hover:text-zinc-600" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Repair Cost (GH₵)</label>
                <input
                  type="number"
                  value={ticketActionModal.repairCost}
                  onChange={e => setTicketActionModal(prev => ({ ...prev, repairCost: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Resolution Notes</label>
                <textarea
                  rows={3}
                  value={ticketActionModal.resolutionNotes}
                  onChange={e => setTicketActionModal(prev => ({ ...prev, resolutionNotes: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 font-medium"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTicketActionModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateTicketMutation.mutate({
                      id: ticketActionModal.ticketId,
                      status: ticketActionModal.mode === 'RESOLVE' ? 'RESOLVED' : 'SCHEDULED',
                      cost: Number(ticketActionModal.repairCost) || 0,
                      resolutionNotes: ticketActionModal.resolutionNotes,
                    });
                    setTicketActionModal(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white font-bold"
                >
                  Save &amp; Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: PARCEL HANDOVER OTP VERIFICATION ── */}
      {collectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12151D] rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">Verify Resident Pickup OTP</h3>
              <button onClick={() => setCollectModalOpen(false)}>
                <X className="w-4 h-4 text-zinc-400 hover:text-zinc-600" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <p className="text-zinc-500">
                Ask the resident for the 6-digit OTP code sent to their dashboard or SMS:
              </p>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. 892019"
                value={collectOtp}
                onChange={e => setCollectOtp(e.target.value)}
                className="w-full text-center text-xl font-mono font-black tracking-widest p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCollectModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={collectOtp.length < 4}
                  onClick={() => {
                    if (collectParcel) {
                      collectParcelMutation.mutate({
                        id: collectParcel.id,
                        pickupCode: collectOtp,
                      });
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
                >
                  Confirm Handover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}

export default function CaretakerDashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-[500px] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
      </div>
    }>
      <CaretakerDashboardContent />
    </Suspense>
  );
}
