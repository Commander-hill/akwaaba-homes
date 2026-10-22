'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  Building2,
  Wrench,
  Scale,
  BellRing,
  Package,
  Key,
  Users,
  CheckCircle2,
  Loader2,
  Copy,
  Plus,
  Phone,
  MapPin,
  Check,
  X,
  ClipboardCheck,
  ArrowRight,
  Gauge,
  MessageSquare,
  Search,
  LogIn,
  LogOut,
  Trash2,
  Calendar,
  Armchair,
} from 'lucide-react';

type PillarTab = 'overview' | 'gatehouse' | 'residents' | 'maintenance' | 'utilities';
type GatehouseSubTab = 'visitors' | 'parcels';
type ResidentsSubTab = 'checkins' | 'assets' | 'conduct';
type UtilitiesSubTab = 'meters' | 'notices';

function CaretakerPortalContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') || 'overview';

  // Derive active pillar and sub-tab from URL ?tab= parameter
  const activePillar: PillarTab = useMemo(() => {
    if (['gatehouse', 'visitors', 'parcels'].includes(rawTab)) return 'gatehouse';
    if (['residents', 'checkins', 'inspections', 'assets', 'conduct'].includes(rawTab)) return 'residents';
    if (['maintenance', 'tickets'].includes(rawTab)) return 'maintenance';
    if (['utilities', 'meters', 'notices'].includes(rawTab)) return 'utilities';
    return 'overview';
  }, [rawTab]);

  const [gatehouseSub, setGatehouseSub] = useState<GatehouseSubTab>('visitors');
  const [residentsSub, setResidentsSub] = useState<ResidentsSubTab>('checkins');
  const [utilitiesSub, setUtilitiesSub] = useState<UtilitiesSubTab>('meters');

  useEffect(() => {
    if (rawTab === 'parcels') setGatehouseSub('parcels');
    else if (rawTab === 'visitors') setGatehouseSub('visitors');
    else if (rawTab === 'assets') setResidentsSub('assets');
    else if (rawTab === 'conduct') setResidentsSub('conduct');
    else if (rawTab === 'checkins' || rawTab === 'inspections') setResidentsSub('checkins');
    else if (rawTab === 'notices') setUtilitiesSub('notices');
    else if (rawTab === 'meters') setUtilitiesSub('meters');
  }, [rawTab]);

  const navigateTab = (tab: string) => {
    router.push(`/dashboard/caretaker?tab=${tab}`, { scroll: false });
  };

  // Current user session
  const { data: sessionData, isLoading: isAuthLoading } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    },
  });

  const currentUser = sessionData?.user || sessionData;
  const userEmail = currentUser?.email || '';
  const userName =
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || 'Staff';

  // Fetch Caretaker's assigned properties & operations
  const { data: staffData, isLoading: isStaffLoading } = useQuery({
    queryKey: ['staff', 'mine'],
    queryFn: async () => {
      try {
        const res = await api.get('/staff/mine');
        const list = res.data?.assignments || res.data?.staff || [];
        return { assignments: list };
      } catch {
        return { assignments: [] };
      }
    },
    refetchInterval: 10000,
  });

  const assignments = useMemo(() => {
    const raw = staffData?.assignments || [];
    return raw
      .map((a: any) => {
        if (a.property) return a;
        return {
          id: a.id,
          role: a.role || 'CARETAKER',
          canManageTickets: a.canManageTickets !== false,
          canCheckInTenants: a.canCheckInTenants !== false,
          canPostNotices: a.canPostNotices !== false,
          property: a,
        };
      })
      .filter((a: any) => Boolean(a.property?.id));
  }, [staffData]);

  // Selected Property Context Switcher
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');

  useEffect(() => {
    if (assignments.length === 1 && selectedPropertyId === 'ALL') {
      setSelectedPropertyId(assignments[0].property.id);
    }
  }, [assignments, selectedPropertyId]);

  const scopedAssignments = useMemo(() => {
    if (selectedPropertyId === 'ALL') return assignments;
    return assignments.filter((a: any) => a.property.id === selectedPropertyId);
  }, [assignments, selectedPropertyId]);

  const activeProperty = useMemo(() => {
    if (selectedPropertyId !== 'ALL') {
      return assignments.find((a: any) => a.property.id === selectedPropertyId)?.property || assignments[0]?.property || null;
    }
    return assignments[0]?.property || null;
  }, [assignments, selectedPropertyId]);

  const activeAssignment = useMemo(() => {
    if (!activeProperty) return null;
    return assignments.find((a: any) => a.property.id === activeProperty.id) || assignments[0] || null;
  }, [assignments, activeProperty]);

  // Aggregated real database records across scoped properties
  const allTickets = useMemo(
    () =>
      scopedAssignments.flatMap((a: any) =>
        (a.property.tickets || []).map((t: any) => ({
          ...t,
          propertyTitle: a.property.title,
          propertyId: a.property.id,
        }))
      ),
    [scopedAssignments]
  );

  const allBookings = useMemo(
    () =>
      scopedAssignments.flatMap((a: any) =>
        (a.property.bookings || []).map((b: any) => ({
          ...b,
          propertyTitle: a.property.title,
          propertyId: a.property.id,
        }))
      ),
    [scopedAssignments]
  );

  const allParcels = useMemo(
    () =>
      scopedAssignments.flatMap((a: any) =>
        (a.property.packageDeliveries || []).map((d: any) => ({
          ...d,
          propertyTitle: a.property.title,
          propertyId: a.property.id,
        }))
      ),
    [scopedAssignments]
  );

  const allVisitorPasses = useMemo(
    () =>
      scopedAssignments.flatMap((a: any) =>
        (a.property.visitorPasses || []).map((v: any) => ({
          ...v,
          propertyTitle: a.property.title,
          propertyId: a.property.id,
        }))
      ),
    [scopedAssignments]
  );

  const allNotices = useMemo(
    () =>
      scopedAssignments.flatMap((a: any) =>
        (a.property.compoundNotices || []).map((n: any) => ({
          ...n,
          propertyTitle: a.property.title,
          propertyId: a.property.id,
        }))
      ),
    [scopedAssignments]
  );

  const allBreaches = useMemo(
    () =>
      scopedAssignments.flatMap((a: any) =>
        (a.property.BreachReport || []).map((b: any) => ({
          ...b,
          propertyTitle: a.property.title,
          propertyId: a.property.id,
        }))
      ),
    [scopedAssignments]
  );

  // Fetch room fixture inventory for active property
  const { data: inventoryData } = useQuery({
    queryKey: ['propertyInventory', activeProperty?.id],
    queryFn: async () => {
      if (!activeProperty?.id) return { items: [] };
      try {
        const res = await api.get(`/inspections/property/${activeProperty.id}/inventory`);
        return res.data || { items: [] };
      } catch {
        return { items: [] };
      }
    },
    enabled: Boolean(activeProperty?.id),
  });

  const inventoryItems: any[] = inventoryData?.items || [];

  // Fetch utility meter readings for active property
  const { data: meterData } = useQuery({
    queryKey: ['propertyMeters', activeProperty?.id],
    queryFn: async () => {
      if (!activeProperty?.id) return { readings: [] };
      try {
        const res = await api.get(`/inspections/property/${activeProperty.id}/meters`);
        return res.data || { readings: [] };
      } catch {
        return { readings: [] };
      }
    },
    enabled: Boolean(activeProperty?.id),
  });

  const meterReadings: any[] = meterData?.readings || [];

  // Local UI state
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [gatePinInput, setGatePinInput] = useState('');
  const [visitorFilter, setVisitorFilter] = useState<'ALL' | 'ACTIVE' | 'USED' | 'EXPIRED'>('ALL');
  const [visitorSearch, setVisitorSearch] = useState('');

  const [parcelFilter, setParcelFilter] = useState<'ALL' | 'PENDING_PICKUP' | 'COLLECTED'>('ALL');
  const [collectModalParcel, setCollectModalParcel] = useState<any | null>(null);
  const [collectOtp, setCollectOtp] = useState('');

  const [residentFilter, setResidentFilter] = useState<'ALL' | 'PENDING_CHECKIN' | 'CHECKED_IN'>('ALL');
  const [residentSearch, setResidentSearch] = useState('');

  const [ticketFilter, setTicketFilter] = useState<'ALL' | 'OPEN' | 'SCHEDULED' | 'RESOLVED'>('ALL');
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketModal, setTicketModal] = useState<{
    isOpen: boolean;
    ticketId: string;
    ticketTitle: string;
    mode: 'SCHEDULE' | 'RESOLVE';
    scheduledDate: string;
    repairCost: string;
    resolutionNotes: string;
  }>({
    isOpen: false,
    ticketId: '',
    ticketTitle: '',
    mode: 'RESOLVE',
    scheduledDate: new Date().toISOString().split('T')[0],
    repairCost: '',
    resolutionNotes: '',
  });

  // New Meter Reading Form State
  const [showMeterForm, setShowMeterForm] = useState(false);
  const [meterForm, setMeterForm] = useState({
    utilityType: 'ECG_ELECTRICITY',
    unitNumber: '',
    meterNumber: '',
    previousReading: '',
    currentReading: '',
    remainingCredit: '',
    notes: '',
  });

  // ── Mutations ──
  const verifyGatePinMutation = useMutation({
    mutationFn: async (accessCode: string) => {
      const res = await api.post('/visitor-passes/verify', { accessCode: accessCode.trim() });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Visitor pass verified and checked in');
      setGatePinInput('');
      queryClient.invalidateQueries({ queryKey: ['staff', 'mine'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Invalid or expired visitor access code');
    },
  });

  const checkoutVisitorMutation = useMutation({
    mutationFn: async (passId: string) => {
      const res = await api.patch(`/visitor-passes/${passId}/checkout`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Visitor signed out');
      queryClient.invalidateQueries({ queryKey: ['staff', 'mine'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Could not sign out visitor');
    },
  });

  const collectParcelMutation = useMutation({
    mutationFn: async ({ id, pickupCode }: { id: string; pickupCode: string }) => {
      const res = await api.patch(`/deliveries/${id}/collect`, { pickupCode: pickupCode.trim() });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Package handover verified and recorded');
      setCollectModalParcel(null);
      setCollectOtp('');
      queryClient.invalidateQueries({ queryKey: ['staff', 'mine'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Invalid pickup code');
    },
  });

  const checkInResidentMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.put(`/bookings/${bookingId}/status`, { status: 'CHECKED_IN' });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Resident checked in');
      queryClient.invalidateQueries({ queryKey: ['staff', 'mine'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Could not check in resident');
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async (payload: {
      id: string;
      status: string;
      scheduledDate?: string;
      repairCost?: number;
      resolutionNotes?: string;
    }) => {
      const { id, ...body } = payload;
      const res = await api.patch(`/tickets/${id}/status`, body);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Maintenance ticket updated');
      setTicketModal((prev) => ({ ...prev, isOpen: false }));
      queryClient.invalidateQueries({ queryKey: ['staff', 'mine'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update ticket');
    },
  });

  const saveMeterReadingMutation = useMutation({
    mutationFn: async () => {
      if (!activeProperty?.id) throw new Error('No property selected');
      const unitOfMeasure =
        meterForm.utilityType === 'ECG_ELECTRICITY'
          ? 'kWh'
          : meterForm.utilityType === 'GWCL_WATER'
          ? 'm³'
          : 'Liters';
      const payload = {
        propertyTitle: activeProperty.title,
        utilityType: meterForm.utilityType,
        unitNumber: meterForm.unitNumber.trim(),
        meterNumber: meterForm.meterNumber.trim(),
        previousReading: Number(meterForm.previousReading) || 0,
        currentReading: Number(meterForm.currentReading) || 0,
        unitOfMeasure,
        remainingCredit: meterForm.remainingCredit ? Number(meterForm.remainingCredit) : undefined,
        status:
          meterForm.remainingCredit && Number(meterForm.remainingCredit) < 50
            ? 'LOW_BALANCE'
            : 'NORMAL',
        notes: meterForm.notes.trim() || undefined,
      };
      const res = await api.post(`/inspections/property/${activeProperty.id}/meters`, payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Meter reading recorded');
      setShowMeterForm(false);
      setMeterForm({
        utilityType: 'ECG_ELECTRICITY',
        unitNumber: '',
        meterNumber: '',
        previousReading: '',
        currentReading: '',
        remainingCredit: '',
        notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['propertyMeters', activeProperty?.id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save meter reading');
    },
  });

  const deleteNoticeMutation = useMutation({
    mutationFn: async (noticeId: string) => {
      await api.delete(`/compound-notices/${noticeId}`);
    },
    onSuccess: () => {
      toast.success('Notice removed');
      queryClient.invalidateQueries({ queryKey: ['staff', 'mine'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Could not remove notice');
    },
  });

  const handleCopyEmail = () => {
    if (!userEmail) return;
    navigator.clipboard.writeText(userEmail);
    setCopiedEmail(true);
    toast.success('Email copied to clipboard');
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  if (isAuthLoading || isStaffLoading) {
    return (
      <div className="min-h-[420px] flex flex-col items-center justify-center space-y-2.5">
        <Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" />
        <p className="text-xs text-zinc-500">Loading operations desk...</p>
      </div>
    );
  }

  // Computed counts
  const openTickets = allTickets.filter((t: any) => t.status !== 'RESOLVED');
  const pendingParcels = allParcels.filter((p: any) => p.status === 'PENDING_PICKUP');
  const activePasses = allVisitorPasses.filter((v: any) => v.status === 'ACTIVE' || (v.checkInTime && !v.checkOutTime));
  const pendingCheckIns = allBookings.filter((b: any) =>
    ['CONFIRMED', 'APPROVED', 'PAID'].includes(b.status)
  );

  // Unassigned Caretaker State
  if (assignments.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-center space-y-4">
        <div className="w-11 h-11 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center mx-auto">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
            No Property Assigned Yet
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Share your registered account email with the property owner so they can assign you to their compound from their Landlord dashboard.
          </p>
        </div>
        <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs">
          <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{userEmail}</span>
          <button
            type="button"
            onClick={handleCopyEmail}
            className="px-2.5 py-1 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
          >
            {copiedEmail ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 text-zinc-900 dark:text-zinc-100">
      {/* ── Persistent Top Context Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-[#0F5132] dark:text-emerald-400">
              {activeAssignment?.role?.replace(/_/g, ' ') || 'CARETAKER'}
            </span>
            <span>·</span>
            <span>{userName}</span>
            <span>·</span>
            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              title="Copy staff email"
            >
              <span>{userEmail}</span>
              {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
            {activePillar === 'overview' && 'Operations Overview'}
            {activePillar === 'gatehouse' && 'Gatehouse & Package Desk'}
            {activePillar === 'residents' && 'Residents, Check-In & Rooms'}
            {activePillar === 'maintenance' && 'Repairs & Maintenance'}
            {activePillar === 'utilities' && 'Utilities & Compound Notices'}
          </h1>
        </div>

        {/* Compound Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {assignments.length > 1 ? (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-zinc-500">Compound:</label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="h-9 px-3 rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
              >
                <option value="ALL">All Assigned ({assignments.length})</option>
                {assignments.map((a: any) => (
                  <option key={a.property.id} value={a.property.id}>
                    {a.property.title}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            activeProperty && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-xs">
                <Building2 className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                <span className="font-semibold text-zinc-900 dark:text-white">{activeProperty.title}</span>
                {activeProperty.location && (
                  <span className="text-zinc-400 hidden sm:inline">· {activeProperty.location}</span>
                )}
              </div>
            )
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          PILLAR 1: OVERVIEW
         ════════════════════════════════════════════════════════════════════════ */}
      {activePillar === 'overview' && (
        <div className="space-y-6">
          {/* 4 Summary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <button
              type="button"
              onClick={() => navigateTab('residents')}
              className="p-4 rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                <span>Residents &amp; Check-Ins</span>
                <Users className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white">
                {allBookings.length}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                {pendingCheckIns.length > 0
                  ? `${pendingCheckIns.length} awaiting check-in`
                  : 'All confirmed residents checked in'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigateTab('maintenance')}
              className="p-4 rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                <span>Open Repairs</span>
                <Wrench className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white">
                {openTickets.length}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                {allTickets.length} total maintenance logs
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigateTab('parcels')}
              className="p-4 rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                <span>Uncollected Packages</span>
                <Package className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white">
                {pendingParcels.length}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                {allParcels.length} total packages logged
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigateTab('visitors')}
              className="p-4 rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                <span>Active Visitor Passes</span>
                <Key className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="text-2xl font-bold tabular-nums text-zinc-950 dark:text-white">
                {activePasses.length}
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                {allVisitorPasses.length} total gate passes
              </div>
            </button>
          </div>

          {/* Assigned Property Details & Landlord Contact */}
          <div className="grid grid-cols-1 gap-4">
            {scopedAssignments.map((assignment: any) => {
              const prop = assignment.property;
              const landlordName =
                [prop.landlord?.firstName, prop.landlord?.lastName].filter(Boolean).join(' ') ||
                'Property Owner';
              const totalCapacity = prop.totalCapacity || 0;
              const remainingCapacity =
                prop.remainingCapacity !== undefined ? prop.remainingCapacity : 0;
              const occupiedCount = Math.max(0, totalCapacity - remainingCapacity);

              return (
                <div
                  key={assignment.id}
                  className="p-5 rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                        {prop.title}
                      </h2>
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                        {prop.type || 'Property'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      {prop.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                          {prop.location}
                        </span>
                      )}
                      {totalCapacity > 0 && (
                        <span>
                          Occupancy: <strong className="text-zinc-800 dark:text-zinc-200">{occupiedCount}</strong> / {totalCapacity} beds ({remainingCapacity} vacant)
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-zinc-500">
                      <span>Permissions:</span>
                      {assignment.canManageTickets && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 font-medium">
                          Repairs
                        </span>
                      )}
                      {assignment.canCheckInTenants && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 font-medium">
                          Resident Check-In
                        </span>
                      )}
                      {assignment.canPostNotices && (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 font-medium">
                          Compound Notices
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-zinc-100 dark:border-zinc-800/80">
                    <div className="text-xs mr-2">
                      <div className="text-zinc-400 text-[11px]">Owner / Landlord</div>
                      <div className="font-semibold text-zinc-900 dark:text-white">{landlordName}</div>
                    </div>
                    {prop.landlord?.phoneNumber && (
                      <a
                        href={`tel:${prop.landlord.phoneNumber}`}
                        className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{prop.landlord.phoneNumber}</span>
                      </a>
                    )}
                    <Link
                      href="/dashboard/messages"
                      className="px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Two-Column Action Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Open Repairs */}
            <div className="rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Open Repair Requests ({openTickets.length})
                </h3>
                <button
                  type="button"
                  onClick={() => navigateTab('maintenance')}
                  className="text-xs font-medium text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>View all</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              {openTickets.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No open repair requests at the moment.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {openTickets.slice(0, 4).map((t: any) => (
                    <div key={t.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                            {t.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            {t.priority || 'MEDIUM'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate">
                          {t.tenant ? `${t.tenant.firstName} ${t.tenant.lastName}` : 'Resident'} · {new Date(t.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setTicketModal({
                            isOpen: true,
                            ticketId: t.id,
                            ticketTitle: t.title,
                            mode: 'RESOLVE',
                            scheduledDate: new Date().toISOString().split('T')[0],
                            repairCost: t.repairCost ? String(t.repairCost) : '',
                            resolutionNotes: t.resolutionNotes || '',
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-medium text-zinc-800 dark:text-zinc-200 shrink-0 cursor-pointer"
                      >
                        Update
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Uncollected Packages */}
            <div className="rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Packages Awaiting Pickup ({pendingParcels.length})
                </h3>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/dashboard/caretaker/parcels/new?propertyId=${activeProperty?.id || ''}`}
                    className="text-xs font-medium text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Log package</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => navigateTab('parcels')}
                    className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>All</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {pendingParcels.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No packages waiting for resident pickup.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {pendingParcels.slice(0, 4).map((p: any) => {
                    const recipientName = p.tenant
                      ? `${p.tenant.firstName} ${p.tenant.lastName}`
                      : 'Resident';
                    return (
                      <div key={p.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                            {recipientName} — {p.courierName || 'Courier'}
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate">
                            {p.packageDescription || 'Parcel'} {p.trackingNumber ? `· #${p.trackingNumber}` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCollectModalParcel(p);
                            setCollectOtp('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-medium shrink-0 cursor-pointer"
                        >
                          Hand Over
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          PILLAR 2: GATEHOUSE & PARCELS
         ════════════════════════════════════════════════════════════════════════ */}
      {activePillar === 'gatehouse' && (
        <div className="space-y-5">
          {/* Sub-navigation switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => navigateTab('visitors')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5',
                  gatehouseSub === 'visitors'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Visitor Passes ({allVisitorPasses.length})</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTab('parcels')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5',
                  gatehouseSub === 'parcels'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Package Deliveries ({allParcels.length})</span>
              </button>
            </div>

            {gatehouseSub === 'parcels' && (
              <Link
                href={`/dashboard/caretaker/parcels/new?propertyId=${activeProperty?.id || ''}`}
                className="px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Incoming Package</span>
              </Link>
            )}
          </div>

          {/* SUB-VIEW A: VISITOR PASSES */}
          {gatehouseSub === 'visitors' && (
            <div className="space-y-4">
              {/* Gate PIN Verification Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (gatePinInput.trim().length < 4) return;
                  verifyGatePinMutation.mutate(gatePinInput);
                }}
                className="p-4 rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">
                    Verify Visitor Gate PIN
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Enter the 6-digit access code presented by the visitor to record their check-in time.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={gatePinInput}
                    onChange={(e) => setGatePinInput(e.target.value)}
                    placeholder="6-digit PIN"
                    className="w-36 h-9 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono text-xs font-semibold tracking-widest text-center outline-none focus:border-[#0F5132]"
                  />
                  <button
                    type="submit"
                    disabled={verifyGatePinMutation.isPending || gatePinInput.trim().length < 4}
                    className="h-9 px-4 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {verifyGatePinMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <LogIn className="w-3.5 h-3.5" />
                    )}
                    <span>Verify &amp; Check In</span>
                  </button>
                </div>
              </form>

              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {(['ALL', 'ACTIVE', 'USED', 'EXPIRED'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setVisitorFilter(st)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                        visitorFilter === st
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold'
                          : 'bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                      )}
                    >
                      {st === 'ALL' ? 'All Passes' : st}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={visitorSearch}
                    onChange={(e) => setVisitorSearch(e.target.value)}
                    placeholder="Search visitor, host, or PIN..."
                    className="w-full h-9 pl-8 pr-3 rounded-lg bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-xs outline-none focus:border-[#0F5132]"
                  />
                </div>
              </div>

              {/* Visitor Passes Table */}
              <div className="rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-[11px] font-semibold text-zinc-500">
                        <th className="py-3 px-4">Visitor</th>
                        <th className="py-3 px-4">Host Resident</th>
                        <th className="py-3 px-4">Access PIN</th>
                        <th className="py-3 px-4">Check-In / Out</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {allVisitorPasses
                        .filter((v: any) => {
                          if (visitorFilter !== 'ALL' && v.status !== visitorFilter) return false;
                          if (!visitorSearch.trim()) return true;
                          const q = visitorSearch.toLowerCase();
                          const host = `${v.tenant?.firstName || ''} ${v.tenant?.lastName || ''}`.toLowerCase();
                          return (
                            v.visitorName?.toLowerCase().includes(q) ||
                            v.accessCode?.toLowerCase().includes(q) ||
                            host.includes(q)
                          );
                        })
                        .map((v: any) => {
                          const isInside = Boolean(v.checkInTime && !v.checkOutTime);
                          return (
                            <tr key={v.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-zinc-900 dark:text-white">
                                  {v.visitorName}
                                </div>
                                <div className="text-[11px] text-zinc-500">
                                  {v.visitorPhone || 'No phone'} {v.purpose ? `· ${v.purpose}` : ''}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-zinc-800 dark:text-zinc-200">
                                  {v.tenant ? `${v.tenant.firstName} ${v.tenant.lastName}` : 'Resident'}
                                </div>
                                {v.tenant?.phoneNumber && (
                                  <div className="text-[11px] text-zinc-500">{v.tenant.phoneNumber}</div>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono font-semibold text-zinc-900 dark:text-white">
                                {v.accessCode}
                              </td>
                              <td className="py-3 px-4 text-[11px] text-zinc-500">
                                {v.checkInTime ? (
                                  <div>
                                    <div>In: {new Date(v.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    {v.checkOutTime && (
                                      <div>Out: {new Date(v.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    )}
                                  </div>
                                ) : (
                                  <span>Valid until {new Date(v.validUntil).toLocaleDateString()}</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={clsx(
                                    'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                                    isInside
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : v.status === 'ACTIVE'
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                  )}
                                >
                                  {isInside ? 'ON PREMISES' : v.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {isInside ? (
                                  <button
                                    type="button"
                                    onClick={() => checkoutVisitorMutation.mutate(v.id)}
                                    disabled={checkoutVisitorMutation.isPending}
                                    className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <LogOut className="w-3 h-3" />
                                    <span>Sign Out</span>
                                  </button>
                                ) : v.status === 'ACTIVE' && !v.checkInTime ? (
                                  <button
                                    type="button"
                                    onClick={() => verifyGatePinMutation.mutate(v.accessCode)}
                                    disabled={verifyGatePinMutation.isPending}
                                    className="px-2.5 py-1 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-medium cursor-pointer"
                                  >
                                    Check In
                                  </button>
                                ) : (
                                  <span className="text-zinc-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      {allVisitorPasses.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-zinc-500">
                            No visitor passes recorded for this compound.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW B: PACKAGE DELIVERIES */}
          {gatehouseSub === 'parcels' && (
            <div className="space-y-4">
              <div className="flex items-center gap-1.5">
                {(['ALL', 'PENDING_PICKUP', 'COLLECTED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setParcelFilter(st)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                      parcelFilter === st
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold'
                        : 'bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    )}
                  >
                    {st === 'ALL'
                      ? `All (${allParcels.length})`
                      : st === 'PENDING_PICKUP'
                      ? `Awaiting Pickup (${pendingParcels.length})`
                      : 'Collected'}
                  </button>
                ))}
              </div>

              <div className="rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-[11px] font-semibold text-zinc-500">
                        <th className="py-3 px-4">Resident</th>
                        <th className="py-3 px-4">Courier &amp; Tracking</th>
                        <th className="py-3 px-4">Package Description</th>
                        <th className="py-3 px-4">Received</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {allParcels
                        .filter((p: any) => parcelFilter === 'ALL' || p.status === parcelFilter)
                        .map((parcel: any) => {
                          const isPending = parcel.status === 'PENDING_PICKUP';
                          return (
                            <tr key={parcel.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-zinc-900 dark:text-white">
                                  {parcel.tenant
                                    ? `${parcel.tenant.firstName} ${parcel.tenant.lastName}`
                                    : 'Resident'}
                                </div>
                                {parcel.tenant?.phoneNumber && (
                                  <div className="text-[11px] text-zinc-500">{parcel.tenant.phoneNumber}</div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-zinc-900 dark:text-white">
                                  {parcel.courierName || 'Courier'}
                                </div>
                                <div className="text-[11px] font-mono text-zinc-500">
                                  {parcel.trackingNumber ? `#${parcel.trackingNumber}` : 'No tracking #'}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-zinc-600 dark:text-zinc-300">
                                {parcel.packageDescription || 'Standard package'}
                              </td>
                              <td className="py-3 px-4 text-[11px] text-zinc-500">
                                {new Date(parcel.receivedAt || parcel.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={clsx(
                                    'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                                    isPending
                                      ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                      : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  )}
                                >
                                  {isPending ? 'Awaiting Pickup' : 'Collected'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                {isPending ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCollectModalParcel(parcel);
                                      setCollectOtp('');
                                    }}
                                    className="px-3 py-1 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-medium cursor-pointer"
                                  >
                                    Verify OTP
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-zinc-400">
                                    {parcel.collectedAt
                                      ? new Date(parcel.collectedAt).toLocaleDateString()
                                      : 'Handed over'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      {allParcels.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-zinc-500">
                            No package deliveries logged yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          PILLAR 3: RESIDENTS & CHECK-IN
         ════════════════════════════════════════════════════════════════════════ */}
      {activePillar === 'residents' && (
        <div className="space-y-5">
          {/* Sub-navigation switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => navigateTab('checkins')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5',
                  residentsSub === 'checkins'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Residents &amp; Check-In ({allBookings.length})</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTab('assets')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5',
                  residentsSub === 'assets'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                <Armchair className="w-3.5 h-3.5" />
                <span>Room Fixtures ({inventoryItems.length})</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTab('conduct')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5',
                  residentsSub === 'conduct'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Conduct Log ({allBreaches.length})</span>
              </button>
            </div>

            {residentsSub === 'assets' && (
              <Link
                href={`/dashboard/landlord/inventory/new?propertyId=${activeProperty?.id || ''}`}
                className="px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Room Fixture</span>
              </Link>
            )}

            {residentsSub === 'conduct' && (
              <Link
                href={`/dashboard/landlord/disciplinary/new?propertyId=${activeProperty?.id || ''}`}
                className="px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>File Conduct Report</span>
              </Link>
            )}
          </div>

          {/* SUB-VIEW A: RESIDENT CHECK-IN & INSPECTIONS */}
          {residentsSub === 'checkins' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {([
                    { id: 'ALL', label: `All Residents (${allBookings.length})` },
                    { id: 'PENDING_CHECKIN', label: `Awaiting Check-In (${pendingCheckIns.length})` },
                    { id: 'CHECKED_IN', label: 'Checked In' },
                  ] as const).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setResidentFilter(f.id)}
                      className={clsx(
                        'px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                        residentFilter === f.id
                          ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold'
                          : 'bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={residentSearch}
                    onChange={(e) => setResidentSearch(e.target.value)}
                    placeholder="Search resident name or room..."
                    className="w-full h-9 pl-8 pr-3 rounded-lg bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-xs outline-none focus:border-[#0F5132]"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-[11px] font-semibold text-zinc-500">
                        <th className="py-3 px-4">Resident</th>
                        <th className="py-3 px-4">Room / Bed</th>
                        <th className="py-3 px-4">Emergency Contact</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {allBookings
                        .filter((b: any) => {
                          if (
                            residentFilter === 'PENDING_CHECKIN' &&
                            !['CONFIRMED', 'APPROVED', 'PAID'].includes(b.status)
                          )
                            return false;
                          if (
                            residentFilter === 'CHECKED_IN' &&
                            !['CHECKED_IN', 'ACTIVE', 'COMPLETED'].includes(b.status)
                          )
                            return false;
                          if (!residentSearch.trim()) return true;
                          const q = residentSearch.toLowerCase();
                          const name = `${b.tenant?.firstName || ''} ${b.tenant?.lastName || ''}`.toLowerCase();
                          const unit = `${b.roomUnit?.unitNumber || ''} ${b.room?.blockName || ''}`.toLowerCase();
                          return name.includes(q) || unit.includes(q);
                        })
                        .map((b: any) => {
                          const canCheckIn =
                            activeAssignment?.canCheckInTenants !== false &&
                            ['CONFIRMED', 'APPROVED', 'PAID'].includes(b.status);
                          const hasInspection = Array.isArray(b.inspections) && b.inspections.length > 0;

                          return (
                            <tr key={b.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-zinc-900 dark:text-white">
                                  {b.tenant?.firstName} {b.tenant?.lastName}
                                </div>
                                <div className="text-[11px] text-zinc-500">
                                  {b.tenant?.phoneNumber || b.tenant?.email}
                                  {b.tenant?.studentId ? ` · ID: ${b.tenant.studentId}` : ''}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="font-medium text-zinc-900 dark:text-white">
                                  {b.roomUnit?.unitNumber || b.room?.roomType || 'Assigned Unit'}
                                  {b.bed?.bedNumber ? ` · ${b.bed.bedNumber}` : ''}
                                </div>
                                <div className="text-[11px] text-zinc-500">
                                  {b.room?.blockName || b.propertyTitle}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-[11px] text-zinc-500">
                                {b.tenant?.guardianName ? (
                                  <div>
                                    <div className="font-medium text-zinc-700 dark:text-zinc-300">
                                      {b.tenant.guardianName}
                                    </div>
                                    <div>{b.tenant.guardianPhone}</div>
                                  </div>
                                ) : (
                                  <span>Not provided</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={clsx(
                                    'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                                    b.status === 'CHECKED_IN' || b.status === 'ACTIVE'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                      : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  )}
                                >
                                  {b.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-2">
                                  {canCheckIn && (
                                    <button
                                      type="button"
                                      onClick={() => checkInResidentMutation.mutate(b.id)}
                                      disabled={checkInResidentMutation.isPending}
                                      className="px-2.5 py-1 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-medium cursor-pointer"
                                    >
                                      Check In
                                    </button>
                                  )}
                                  <Link
                                    href={`/dashboard/landlord/inspections/${b.id}`}
                                    className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200"
                                  >
                                    {hasInspection ? 'View Inspection' : 'Inspect Room'}
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      {allBookings.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-10 text-center text-zinc-500">
                            No confirmed residents found for this compound.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW B: ROOM FIXTURES & INVENTORY */}
          {residentsSub === 'assets' && (
            <div className="rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-[11px] font-semibold text-zinc-500">
                      <th className="py-3 px-4">Room Unit</th>
                      <th className="py-3 px-4">Fixture / Asset</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Condition</th>
                      <th className="py-3 px-4">Replacement Value</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {inventoryItems.map((item: any, idx: number) => (
                      <tr key={item.id || idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                        <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-white">
                          {item.roomUnit || 'General'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-zinc-900 dark:text-white">{item.name}</div>
                          {item.serialTag && (
                            <div className="text-[11px] font-mono text-zinc-400">Tag: {item.serialTag}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-zinc-500">{item.category || 'FURNITURE'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                              item.condition === 'PRISTINE' || item.condition === 'GOOD'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : item.condition === 'FAIR'
                                ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                            )}
                          >
                            {item.condition || 'GOOD'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-700 dark:text-zinc-300">
                          GH₵ {Number(item.replacementCostGHS || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 max-w-xs truncate">
                          {item.notes || '—'}
                        </td>
                      </tr>
                    ))}
                    {inventoryItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-zinc-500">
                          No room fixtures logged yet. Click &ldquo;Log Room Fixture&rdquo; above to add an item.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-VIEW C: CONDUCT & DISCIPLINARY LOG */}
          {residentsSub === 'conduct' && (
            <div className="rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-[11px] font-semibold text-zinc-500">
                      <th className="py-3 px-4">Resident</th>
                      <th className="py-3 px-4">Incident Title</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                    {allBreaches.map((b: any) => (
                      <tr key={b.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-900 dark:text-white">
                            {b.tenant ? `${b.tenant.firstName} ${b.tenant.lastName}` : 'Resident'}
                          </div>
                          {b.tenant?.phoneNumber && (
                            <div className="text-[11px] text-zinc-500">{b.tenant.phoneNumber}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white">
                          {b.title}
                        </td>
                        <td className="py-3 px-4 text-zinc-500 max-w-md truncate">
                          {b.description}
                        </td>
                        <td className="py-3 px-4 text-[11px] text-zinc-500">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={clsx(
                              'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                              b.status === 'VERIFIED'
                                ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            )}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {allBreaches.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-zinc-500">
                          No disciplinary or house-rule breach reports on record.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          PILLAR 4: REPAIRS & MAINTENANCE
         ════════════════════════════════════════════════════════════════════════ */}
      {activePillar === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {([
                { id: 'ALL', label: `All (${allTickets.length})` },
                { id: 'OPEN', label: `Pending (${openTickets.length})` },
                { id: 'SCHEDULED', label: 'Scheduled' },
                { id: 'RESOLVED', label: 'Resolved' },
              ] as const).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTicketFilter(f.id)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                    ticketFilter === f.id
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold'
                      : 'bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                placeholder="Search repair title or resident..."
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 text-xs outline-none focus:border-[#0F5132]"
              />
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-[11px] font-semibold text-zinc-500">
                    <th className="py-3 px-4">Issue</th>
                    <th className="py-3 px-4">Reported By</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Logged</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {allTickets
                    .filter((t: any) => {
                      if (ticketFilter === 'OPEN' && t.status === 'RESOLVED') return false;
                      if (ticketFilter === 'SCHEDULED' && t.status !== 'SCHEDULED') return false;
                      if (ticketFilter === 'RESOLVED' && t.status !== 'RESOLVED') return false;
                      if (!ticketSearch.trim()) return true;
                      const q = ticketSearch.toLowerCase();
                      const resident = `${t.tenant?.firstName || ''} ${t.tenant?.lastName || ''}`.toLowerCase();
                      return (
                        t.title?.toLowerCase().includes(q) ||
                        t.description?.toLowerCase().includes(q) ||
                        resident.includes(q)
                      );
                    })
                    .map((ticket: any) => {
                      const isResolved = ticket.status === 'RESOLVED';
                      return (
                        <tr key={ticket.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                          <td className="py-3.5 px-4 max-w-sm">
                            <div className="font-semibold text-zinc-900 dark:text-white">
                              {ticket.title}
                            </div>
                            <p className="text-[11px] text-zinc-500 line-clamp-2 mt-0.5">
                              {ticket.description}
                            </p>
                            {ticket.resolutionNotes && (
                              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">
                                Note: {ticket.resolutionNotes}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-zinc-800 dark:text-zinc-200">
                              {ticket.tenant
                                ? `${ticket.tenant.firstName} ${ticket.tenant.lastName}`
                                : 'Resident'}
                            </div>
                            {ticket.tenant?.phoneNumber && (
                              <a
                                href={`tel:${ticket.tenant.phoneNumber}`}
                                className="text-[11px] text-zinc-500 hover:underline"
                              >
                                {ticket.tenant.phoneNumber}
                              </a>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                                ticket.priority === 'URGENT'
                                  ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                  : ticket.priority === 'HIGH'
                                  ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                              )}
                            >
                              {ticket.priority || 'MEDIUM'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={clsx(
                                'px-2 py-0.5 rounded text-[10px] font-semibold uppercase',
                                isResolved
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : ticket.status === 'SCHEDULED'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                                  : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              )}
                            >
                              {ticket.status}
                            </span>
                            {ticket.scheduledDate && !isResolved && (
                              <div className="text-[10px] text-zinc-400 mt-0.5">
                                {new Date(ticket.scheduledDate).toLocaleDateString()}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-[11px] text-zinc-500">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {!isResolved && activeAssignment?.canManageTickets !== false ? (
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTicketModal({
                                      isOpen: true,
                                      ticketId: ticket.id,
                                      ticketTitle: ticket.title,
                                      mode: 'SCHEDULE',
                                      scheduledDate: ticket.scheduledDate
                                        ? new Date(ticket.scheduledDate).toISOString().split('T')[0]
                                        : new Date().toISOString().split('T')[0],
                                      repairCost: ticket.repairCost ? String(ticket.repairCost) : '',
                                      resolutionNotes: ticket.resolutionNotes || '',
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer"
                                >
                                  Schedule
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setTicketModal({
                                      isOpen: true,
                                      ticketId: ticket.id,
                                      ticketTitle: ticket.title,
                                      mode: 'RESOLVE',
                                      scheduledDate: new Date().toISOString().split('T')[0],
                                      repairCost: ticket.repairCost ? String(ticket.repairCost) : '',
                                      resolutionNotes: ticket.resolutionNotes || '',
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-medium cursor-pointer"
                                >
                                  Resolve
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-400">
                                {ticket.repairCost ? `GH₵ ${Number(ticket.repairCost).toFixed(2)}` : 'Closed'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  {allTickets.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-zinc-500">
                        No maintenance tickets reported for this compound.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          PILLAR 5: UTILITIES & NOTICES
         ════════════════════════════════════════════════════════════════════════ */}
      {activePillar === 'utilities' && (
        <div className="space-y-5">
          {/* Sub-navigation switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => navigateTab('meters')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5',
                  utilitiesSub === 'meters'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                <Gauge className="w-3.5 h-3.5" />
                <span>Utility Sub-Meters ({meterReadings.length})</span>
              </button>
              <button
                type="button"
                onClick={() => navigateTab('notices')}
                className={clsx(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5',
                  utilitiesSub === 'notices'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Compound Notices ({allNotices.length})</span>
              </button>
            </div>

            {utilitiesSub === 'meters' && (
              <button
                type="button"
                onClick={() => setShowMeterForm(!showMeterForm)}
                className="px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showMeterForm ? 'Cancel' : 'Record Meter Reading'}</span>
              </button>
            )}

            {utilitiesSub === 'notices' && activeAssignment?.canPostNotices !== false && (
              <Link
                href={`/dashboard/landlord/notices/new?propertyId=${activeProperty?.id || ''}`}
                className="px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Compound Notice</span>
              </Link>
            )}
          </div>

          {/* SUB-VIEW A: UTILITY SUB-METERS */}
          {utilitiesSub === 'meters' && (
            <div className="space-y-4">
              {showMeterForm && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveMeterReadingMutation.mutate();
                  }}
                  className="p-5 rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-4"
                >
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">
                    Log New Utility Sub-Meter Reading
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                    <div>
                      <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Utility Type
                      </label>
                      <select
                        value={meterForm.utilityType}
                        onChange={(e) => setMeterForm({ ...meterForm, utilityType: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
                      >
                        <option value="ECG_ELECTRICITY">ECG Electricity (kWh)</option>
                        <option value="GWCL_WATER">GWCL Water (m³)</option>
                        <option value="GENERATOR_DIESEL">Standby Generator (Liters)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Room / Block Unit *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Block A - Room 102"
                        value={meterForm.unitNumber}
                        onChange={(e) => setMeterForm({ ...meterForm, unitNumber: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Meter Serial Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. ECG-049182"
                        value={meterForm.meterNumber}
                        onChange={(e) => setMeterForm({ ...meterForm, meterNumber: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Previous Reading
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={meterForm.previousReading}
                        onChange={(e) => setMeterForm({ ...meterForm, previousReading: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Current Reading *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={meterForm.currentReading}
                        onChange={(e) => setMeterForm({ ...meterForm, currentReading: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Prepaid Balance (GH₵, optional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="e.g. 120.00"
                        value={meterForm.remainingCredit}
                        onChange={(e) => setMeterForm({ ...meterForm, remainingCredit: e.target.value })}
                        className="w-full h-9 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMeterForm(false)}
                      className="px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        saveMeterReadingMutation.isPending ||
                        !meterForm.unitNumber.trim() ||
                        !meterForm.meterNumber.trim() ||
                        !meterForm.currentReading
                      }
                      className="px-4 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
                    >
                      {saveMeterReadingMutation.isPending ? 'Saving...' : 'Save Reading'}
                    </button>
                  </div>
                </form>
              )}

              <div className="rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 text-[11px] font-semibold text-zinc-500">
                        <th className="py-3 px-4">Unit / Block</th>
                        <th className="py-3 px-4">Meter #</th>
                        <th className="py-3 px-4">Utility</th>
                        <th className="py-3 px-4">Previous</th>
                        <th className="py-3 px-4">Current</th>
                        <th className="py-3 px-4">Prepaid Credit</th>
                        <th className="py-3 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                      {meterReadings.map((m: any, idx: number) => (
                        <tr key={m.id || idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20">
                          <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-white">
                            {m.unitNumber}
                          </td>
                          <td className="py-3 px-4 font-mono text-zinc-600 dark:text-zinc-300">
                            {m.meterNumber}
                          </td>
                          <td className="py-3 px-4 text-zinc-500">
                            {m.utilityType?.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-zinc-500">
                            {m.previousReading} {m.unitOfMeasure}
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums font-semibold text-zinc-900 dark:text-white">
                            {m.currentReading} {m.unitOfMeasure}
                          </td>
                          <td className="py-3 px-4 font-mono">
                            {m.remainingCredit !== undefined && m.remainingCredit !== null
                              ? `GH₵ ${Number(m.remainingCredit).toFixed(2)}`
                              : '—'}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-zinc-500">
                            {new Date(m.loggedAt || Date.now()).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                      {meterReadings.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-zinc-500">
                            No sub-meter readings recorded yet. Click &ldquo;Record Meter Reading&rdquo; above to log a reading.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-VIEW B: COMPOUND NOTICES */}
          {utilitiesSub === 'notices' && (
            <div className="rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              {allNotices.length === 0 ? (
                <div className="p-10 text-center text-xs text-zinc-500">
                  No compound notices have been posted yet.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {allNotices.map((notice: any) => (
                    <div
                      key={notice.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                    >
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {notice.category || 'GENERAL'}
                          </span>
                          {notice.priority && notice.priority !== 'NORMAL' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              {notice.priority}
                            </span>
                          )}
                          <span className="text-[11px] text-zinc-400">
                            {new Date(notice.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                          {notice.title}
                        </h3>
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                          {notice.message}
                        </p>
                      </div>
                      {activeAssignment?.canPostNotices !== false && (
                        <button
                          type="button"
                          onClick={() => deleteNoticeMutation.mutate(notice.id)}
                          disabled={deleteNoticeMutation.isPending}
                          className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors self-end sm:self-start cursor-pointer"
                          title="Remove notice"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* ── MODAL 1: SCHEDULE OR RESOLVE MAINTENANCE TICKET ── */}
      {ticketModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                  {ticketModal.mode === 'RESOLVE' ? 'Resolve Maintenance Ticket' : 'Schedule Repair Date'}
                </h3>
                <p className="text-[11px] text-zinc-500 truncate max-w-xs">{ticketModal.ticketTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setTicketModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {ticketModal.mode === 'SCHEDULE' && (
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    Scheduled Repair Date *
                  </label>
                  <input
                    type="date"
                    value={ticketModal.scheduledDate}
                    onChange={(e) =>
                      setTicketModal((prev) => ({ ...prev, scheduledDate: e.target.value }))
                    }
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                  />
                </div>
              )}

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Repair Cost (GH₵, optional)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={ticketModal.repairCost}
                  onChange={(e) =>
                    setTicketModal((prev) => ({ ...prev, repairCost: e.target.value }))
                  }
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {ticketModal.mode === 'RESOLVE' ? 'Resolution Notes *' : 'Technician / Schedule Notes'}
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the work completed or scheduled..."
                  value={ticketModal.resolutionNotes}
                  onChange={(e) =>
                    setTicketModal((prev) => ({ ...prev, resolutionNotes: e.target.value }))
                  }
                  className="w-full p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTicketModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    updateTicketMutation.isPending ||
                    (ticketModal.mode === 'RESOLVE' && !ticketModal.resolutionNotes.trim()) ||
                    (ticketModal.mode === 'SCHEDULE' && !ticketModal.scheduledDate)
                  }
                  onClick={() => {
                    updateTicketMutation.mutate({
                      id: ticketModal.ticketId,
                      status: ticketModal.mode === 'RESOLVE' ? 'RESOLVED' : 'SCHEDULED',
                      scheduledDate:
                        ticketModal.mode === 'SCHEDULE' ? ticketModal.scheduledDate : undefined,
                      repairCost: ticketModal.repairCost ? Number(ticketModal.repairCost) : undefined,
                      resolutionNotes: ticketModal.resolutionNotes.trim() || undefined,
                    });
                  }}
                  className="px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold disabled:opacity-40 cursor-pointer"
                >
                  {updateTicketMutation.isPending ? 'Saving...' : 'Save Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: PACKAGE PICKUP OTP VERIFICATION ── */}
      {collectModalParcel && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#12151D] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-sm w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">
                Verify Package Handover
              </h3>
              <button
                type="button"
                onClick={() => setCollectModalParcel(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-zinc-500">
                Enter the 4-digit pickup code sent to{' '}
                <strong className="text-zinc-900 dark:text-white">
                  {collectModalParcel.tenant
                    ? `${collectModalParcel.tenant.firstName} ${collectModalParcel.tenant.lastName}`
                    : 'the resident'}
                </strong>{' '}
                for their {collectModalParcel.courierName} package:
              </p>
              <input
                type="text"
                maxLength={6}
                placeholder="4-digit code"
                value={collectOtp}
                onChange={(e) => setCollectOtp(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-center font-mono text-base font-bold tracking-widest outline-none focus:border-[#0F5132]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCollectModalParcel(null)}
                  className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={collectParcelMutation.isPending || collectOtp.trim().length < 4}
                  onClick={() =>
                    collectParcelMutation.mutate({
                      id: collectModalParcel.id,
                      pickupCode: collectOtp,
                    })
                  }
                  className="px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold disabled:opacity-40 cursor-pointer"
                >
                  {collectParcelMutation.isPending ? 'Verifying...' : 'Confirm Handover'}
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
    <Suspense
      fallback={
        <div className="min-h-[420px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" />
        </div>
      }
    >
      <CaretakerPortalContent />
    </Suspense>
  );
}
