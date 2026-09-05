'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Building, Wrench, ShieldCheck, BellRing, Package, Key, Users, 
  Calendar, CheckCircle2, AlertTriangle, Loader2, Copy, Plus, 
  Phone, Mail, MapPin, ExternalLink, Clock, Sparkles, Check, X,
  FileText, ClipboardCheck, ArrowRight, Gauge, Zap, Droplets, Fuel, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Link from 'next/link';
import InspectionModal from '@/components/landlord/InspectionModal';
import { useSearchParams, useRouter } from 'next/navigation';

function CaretakerDashboardContent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'overview';

  const [activeTab, setActiveTab] = useState<'overview' | 'tickets' | 'inspections' | 'notices' | 'parcels' | 'visitors' | 'meters'>(
    (defaultTab as any) || 'overview'
  );

  // Sync tab with URL search parameter changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && ['overview', 'tickets', 'inspections', 'notices', 'parcels', 'visitors', 'meters'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl as any);
    }
  }, [searchParams]);

  const [selectedInspectionBooking, setSelectedInspectionBooking] = useState<any>(null);
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

  // Notice Creation Modal state
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticePropertyId, setNoticePropertyId] = useState('');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noticeCategory, setNoticeCategory] = useState('GENERAL');
  const [noticePriority, setNoticePriority] = useState('NORMAL');

  // Parcel Intake Modal state
  const [parcelModalOpen, setParcelModalOpen] = useState(false);
  const [parcelPropertyId, setParcelPropertyId] = useState('');
  const [parcelCarrier, setParcelCarrier] = useState('DHL');
  const [parcelTracking, setParcelTracking] = useState('');
  const [parcelLocation, setParcelLocation] = useState('Front Desk Shelf A');

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
      try {
        const saved = localStorage.getItem('akwaaba_caretaker_meters');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'meter-1',
        propertyId: 'prop-1',
        propertyTitle: 'East Legon Residential Compound',
        utilityType: 'ECG_ELECTRICITY',
        unitNumber: 'Flat 101',
        meterNumber: 'ECG-4519284902-8',
        previousReading: 1420.5,
        currentReading: 1585.0,
        unitOfMeasure: 'kWh',
        remainingCredit: 140.0,
        loggedAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        status: 'NORMAL',
        notes: 'Prepaid meter inspected, running steady.',
      },
      {
        id: 'meter-2',
        propertyId: 'prop-1',
        propertyTitle: 'East Legon Residential Compound',
        utilityType: 'GENERATOR_DIESEL',
        unitNumber: 'Central Compound',
        meterNumber: 'GEN-PERKINS-150KVA',
        previousReading: 416.0,
        currentReading: 428.5,
        unitOfMeasure: 'Run Hours',
        fuelLevelPct: 82,
        loggedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
        status: 'READY',
        notes: 'Diesel topped up 120L, oil level checked.',
      },
      {
        id: 'meter-3',
        propertyId: 'prop-1',
        propertyTitle: 'East Legon Residential Compound',
        utilityType: 'GWCL_WATER',
        unitNumber: 'Flat 204',
        meterNumber: 'GWCL-ACC-88391',
        previousReading: 84.2,
        currentReading: 96.5,
        unitOfMeasure: 'm³',
        loggedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        status: 'NORMAL',
        notes: 'Water submeter verified, zero leakage detected.',
      },
      {
        id: 'meter-4',
        propertyId: 'prop-1',
        propertyTitle: 'East Legon Residential Compound',
        utilityType: 'ECG_ELECTRICITY',
        unitNumber: 'Flat 302',
        meterNumber: 'ECG-4519284903-6',
        previousReading: 2110.0,
        currentReading: 2340.0,
        unitOfMeasure: 'kWh',
        remainingCredit: 28.5,
        loggedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        status: 'LOW_BALANCE',
        notes: 'Low prepaid balance alert sent to resident.',
      }
    ];
  });

  const [utilityFilter, setUtilityFilter] = useState<'ALL' | 'ECG_ELECTRICITY' | 'GWCL_WATER' | 'GENERATOR_DIESEL'>('ALL');
  const [meterModalOpen, setMeterModalOpen] = useState(false);
  const [meterForm, setMeterForm] = useState({
    propertyId: '',
    utilityType: 'ECG_ELECTRICITY' as 'ECG_ELECTRICITY' | 'GWCL_WATER' | 'GENERATOR_DIESEL',
    unitNumber: '',
    meterNumber: '',
    previousReading: '',
    currentReading: '',
    remainingCredit: '',
    fuelLevelPct: '',
    notes: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('akwaaba_caretaker_meters', JSON.stringify(meterReadings));
      } catch (e) {}
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

  // Aggregate operations across all assigned properties
  const allTickets = assignedProperties.flatMap((p: any) => 
    (p.tickets || []).map((t: any) => ({ ...t, propertyTitle: p.title, propertyId: p.id }))
  );

  const allBookings = assignedProperties.flatMap((p: any) => 
    (p.bookings || []).map((b: any) => ({ ...b, propertyTitle: p.title, propertyId: p.id }))
  );

  const allNotices = assignedProperties.flatMap((p: any) => 
    (p.compoundNotices || p.notices || []).map((n: any) => ({ ...n, propertyTitle: p.title, propertyId: p.id }))
  );

  const allParcels = assignedProperties.flatMap((p: any) => 
    (p.packageDeliveries || p.deliveryParcels || []).map((d: any) => ({ ...d, propertyTitle: p.title, propertyId: p.id }))
  );

  const allVisitorPasses = assignedProperties.flatMap((p: any) => 
    (p.visitorPasses || []).map((v: any) => ({ ...v, propertyTitle: p.title, propertyId: p.id }))
  );

  // Mutations
  const updateTicketMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { id, ...data } = payload;
      const res = await api.patch('/tickets/' + id + '/status', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Ticket updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff', 'mine'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update ticket');
    }
  });

  const createNoticeMutation = useMutation({
    mutationFn: async (payload: any) => {
      try {
        const res = await api.post('/compound-notices', payload);
        return res.data;
      } catch (e) {
        const res = await api.post('/notices', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success('Compound notice published!');
      setNoticeModalOpen(false);
      setNoticeTitle('');
      setNoticeMessage('');
      queryClient.invalidateQueries({ queryKey: ['staff', 'mine'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to publish notice');
    }
  });

  const logParcelMutation = useMutation({
    mutationFn: async (payload: any) => {
      try {
        const res = await api.post('/parcels', payload);
        return res.data;
      } catch (e) {
        const res = await api.post('/deliveries', payload);
        return res.data;
      }
    },
    onSuccess: () => {
      toast.success('Parcel logged into vault & tenant alerted!');
      setParcelModalOpen(false);
      setParcelTracking('');
      queryClient.invalidateQueries({ queryKey: ['staff', 'mine'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to log parcel');
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

  const handleTabChange = (tabId: any) => {
    setActiveTab(tabId);
    router.push('/dashboard/caretaker?tab=' + tabId, { scroll: false });
  };

  if (isAuthLoading || isStaffLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      
      {/* ── Header Welcome Banner ── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 dark:bg-[#12151D] border border-zinc-800 text-white shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/10 border border-amber-400/20 rounded-full text-xs font-bold text-amber-400">
            <Wrench className="w-3.5 h-3.5" /> Caretaker & Property Operations Hub
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Welcome, {userName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Manage daily residential property maintenance, tenant move-in inspections, utility submeter logging, parcel vault, and compound broadcast notices.
          </p>
        </div>

        {/* Staff Email Badge with 1-Click Copy */}
        <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 space-y-2 shrink-0 w-full sm:w-auto">
          <div className="text-[11px] font-extrabold uppercase text-slate-400">Your Registered Staff Email</div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs sm:text-sm font-bold text-white bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 break-all select-all">
              {userEmail || 'Loading...'}
            </span>
            <button
              onClick={handleCopyEmail}
              className="p-2 bg-white/10 hover:bg-white/20 text-amber-300 rounded-xl transition border border-white/10 flex items-center gap-1 text-xs font-bold shrink-0 cursor-pointer active:scale-95"
              title="Copy staff email for Landlord"
            >
              {copiedEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400">Share this email with landlords to be assigned to their properties.</p>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div 
          onClick={() => handleTabChange('overview')}
          className="p-5 rounded-2xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1 cursor-pointer hover:border-indigo-500/50 transition"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Properties</span>
            <Building className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{assignedProperties.length}</div>
          <div className="text-[11px] text-slate-500">Assigned compounds</div>
        </div>

        <div 
          onClick={() => handleTabChange('tickets')}
          className="p-5 rounded-2xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1 cursor-pointer hover:border-amber-500/50 transition"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Open Tickets</span>
            <Wrench className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {allTickets.filter((t: any) => t.status !== 'RESOLVED').length}
          </div>
          <div className="text-[11px] text-slate-500">Needing repair action</div>
        </div>

        <div 
          onClick={() => handleTabChange('inspections')}
          className="p-5 rounded-2xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1 cursor-pointer hover:border-emerald-500/50 transition"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Inspections</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{allBookings.length}</div>
          <div className="text-[11px] text-slate-500">Resident check-ins</div>
        </div>

        <div 
          onClick={() => handleTabChange('notices')}
          className="p-5 rounded-2xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1 cursor-pointer hover:border-sky-500/50 transition"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Notices</span>
            <BellRing className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400">{allNotices.length}</div>
          <div className="text-[11px] text-slate-500">Broadcast bulletins</div>
        </div>

        <div 
          onClick={() => handleTabChange('parcels')}
          className="p-5 rounded-2xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1 cursor-pointer hover:border-purple-500/50 transition"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Parcels</span>
            <Package className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {allParcels.filter((p: any) => p.status === 'ARRIVED').length}
          </div>
          <div className="text-[11px] text-slate-500">Unclaimed deliveries</div>
        </div>

        <div 
          onClick={() => handleTabChange('meters')}
          className="p-5 rounded-2xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-1 cursor-pointer hover:border-emerald-500/50 transition"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase">Meters</span>
            <Gauge className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {meterReadings.length}
          </div>
          <div className="text-[11px] text-slate-500">ECG &amp; submeters</div>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-3">
        {[
          { id: 'overview', label: 'Operations Overview', icon: Building },
          { id: 'tickets', label: 'Maintenance Requests (' + allTickets.filter((t: any) => t.status !== 'RESOLVED').length + ')', icon: Wrench },
          { id: 'inspections', label: 'Move-In Inspections (' + allBookings.length + ')', icon: ShieldCheck },
          { id: 'notices', label: 'Compound Notices (' + allNotices.length + ')', icon: BellRing },
          { id: 'parcels', label: 'Parcel Vault (' + allParcels.length + ')', icon: Package },
          { id: 'visitors', label: 'Gate Passes (' + allVisitorPasses.length + ')', icon: Key },
          { id: 'meters', label: 'Utility & Meters (' + meterReadings.length + ')', icon: Gauge },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={clsx(
                "px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer",
                isActive 
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md" 
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB: OVERVIEW & ASSIGNED PROPERTIES ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {assignedProperties.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Building className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Awaiting Property Assignment</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Your caretaker account is ready! Please share your registered email (<strong>{userEmail || 'israelboateng5@outlook.com'}</strong>) with your Landlord or Property Manager so they can assign you to their property in their <strong>Staff & Caretakers</strong> tab.
              </p>
              <div className="pt-2">
                <button
                  onClick={handleCopyEmail}
                  className="px-6 py-3 bg-[var(--primary)] text-white font-bold rounded-2xl text-xs sm:text-sm inline-flex items-center gap-2 shadow-lg shadow-[var(--primary)]/30 hover:opacity-95 transition cursor-pointer"
                >
                  {copiedEmail ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedEmail ? 'Email Copied!' : 'Copy Staff Email for Landlord'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Your Assigned Properties</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignments.map((assignment: any) => {
                  const prop = assignment.property;
                  if (!prop) return null;
                  return (
                    <div key={assignment.id} className="p-6 rounded-3xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-600 text-[10px] font-bold rounded-full uppercase">
                            {assignment.role.replace('_', ' ')}
                          </span>
                          <h3 className="font-extrabold text-base text-slate-900 dark:text-white mt-1">{prop.title}</h3>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5" /> {prop.location || 'Accra, Ghana'}
                          </p>
                        </div>
                      </div>

                      {/* Landlord Contact Info */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/60 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          Property Owner: {prop.landlord?.firstName} {prop.landlord?.lastName}
                        </div>
                        {prop.landlord?.phoneNumber && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{prop.landlord.phoneNumber}</span>
                          </div>
                        )}
                        {prop.landlord?.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{prop.landlord.email}</span>
                          </div>
                        )}
                      </div>

                      {/* Authorized Permissions Badges */}
                      <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                        {assignment.canManageTickets && (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-lg">✓ Maintenance Tickets</span>
                        )}
                        {assignment.canCheckInTenants && (
                          <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 rounded-lg">✓ Move-In Inspections</span>
                        )}
                        {assignment.canPostNotices && (
                          <span className="px-2 py-0.5 bg-sky-500/10 text-sky-600 rounded-lg">✓ Compound Notices</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: MAINTENANCE TICKETS ── */}
      {activeTab === 'tickets' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Resident Maintenance Tickets</h2>
          </div>

          {allTickets.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">No Maintenance Requests Reported</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {assignedProperties.length === 0 
                  ? 'Once your landlord assigns you to their property, all tenant maintenance requests will appear here for you to schedule and resolve.'
                  : 'All quiet! There are currently no pending or active repair requests from tenants on your assigned properties.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allTickets.map((t: any) => (
                <div key={t.id} className="p-6 rounded-3xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className={clsx(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        t.status === 'RESOLVED' ? "bg-emerald-500/10 text-emerald-600" :
                        t.status === 'IN_PROGRESS' ? "bg-blue-500/10 text-blue-600" :
                        t.status === 'SCHEDULED' ? "bg-indigo-500/10 text-indigo-600" :
                        "bg-amber-500/10 text-amber-600"
                      )}>
                        {t.status}
                      </span>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1.5">{t.title}</h3>
                      <p className="text-xs text-slate-500">{t.propertyTitle} • Room {t.room?.roomNumber || 'Unit'}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{t.priority} PRIORITY</span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl">
                    {t.description}
                  </p>

                  {/* Action Buttons for Caretaker */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {t.status === 'PENDING' && (
                      <button
                        onClick={() => {
                          setTicketActionModal({
                            isOpen: true,
                            ticketId: t.id,
                            ticketTitle: t.title,
                            mode: 'SCHEDULE',
                            scheduledDate: new Date().toISOString().split('T')[0],
                            repairCost: '0',
                            resolutionNotes: '',
                            completionImageUrl: '',
                          });
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        Schedule Repair
                      </button>
                    )}

                    {(t.status === 'PENDING' || t.status === 'SCHEDULED') && (
                      <button
                        onClick={() => updateTicketMutation.mutate({ id: t.id, status: 'IN_PROGRESS' })}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                      >
                        Start Repair
                      </button>
                    )}

                    {t.status !== 'RESOLVED' && (
                      <button
                        onClick={() => {
                          setTicketActionModal({
                            isOpen: true,
                            ticketId: t.id,
                            ticketTitle: t.title,
                            mode: 'RESOLVE',
                            scheduledDate: new Date().toISOString().split('T')[0],
                            repairCost: '0',
                            resolutionNotes: 'Repair completed successfully by caretaker.',
                            completionImageUrl: '',
                          });
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-500/20 cursor-pointer"
                      >
                        Complete & Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: MOVE-IN / MOVE-OUT INSPECTIONS ── */}
      {activeTab === 'inspections' && (
        <div className="space-y-6">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Resident Move-In & Move-Out Inspections</h2>
          
          {allBookings.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">No Pending Inspections</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Confirmed student and tenant bookings will appear here for you to conduct digital room condition checklists upon move-in and key return.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allBookings.map((b: any) => (
                <div key={b.id} className="p-6 rounded-3xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded-full">
                        {b.status}
                      </span>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white mt-1">
                        {b.tenant?.firstName} {b.tenant?.lastName}
                      </h3>
                      <p className="text-xs text-slate-500">{b.propertyTitle} • Room {b.room?.roomNumber || 'Unit'}</p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <div>Dates: {new Date(b.startDate).toLocaleDateString()} - {new Date(b.endDate).toLocaleDateString()}</div>
                    <div>Phone: {b.tenant?.phoneNumber || 'N/A'}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => setSelectedInspectionBooking(b)}
                      className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" /> Conduct Inspection Checklist
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: COMPOUND NOTICES ── */}
      {activeTab === 'notices' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Compound Broadcast Bulletins</h2>
            {assignedProperties.length > 0 && (
              <button
                onClick={() => {
                  setNoticePropertyId(assignedProperties[0]?.id || '');
                  setNoticeModalOpen(true);
                }}
                className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Post New Notice
              </button>
            )}
          </div>

          {allNotices.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto">
                <BellRing className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">No Compound Notices Published</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {assignedProperties.length === 0
                  ? 'Once linked to a property, you can broadcast water/power outage alerts, generator timings, and rules to all residents.'
                  : 'No notices posted yet. Click "Post New Notice" to broadcast updates to tenants.'
                }
              </p>
              {assignedProperties.length > 0 && (
                <button
                  onClick={() => {
                    setNoticePropertyId(assignedProperties[0]?.id || '');
                    setNoticeModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-[var(--primary)] text-white text-xs font-bold rounded-xl shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Post First Notice
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allNotices.map((n: any) => (
                <div key={n.id} className="p-6 rounded-3xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-0.5 bg-purple-500/10 text-purple-600 text-[10px] font-bold rounded-full uppercase">
                      {n.category} • {n.priority}
                    </span>
                    <span className="text-[10px] text-slate-400">{new Date(n.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">{n.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {n.message}
                  </p>
                  <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    Property: {n.propertyTitle}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: PARCEL VAULT ── */}
      {activeTab === 'parcels' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Parcel Intake & Vault</h2>
            {assignedProperties.length > 0 && (
              <button
                onClick={() => {
                  setParcelPropertyId(assignedProperties[0]?.id || '');
                  setParcelModalOpen(true);
                }}
                className="px-4 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Log Incoming Parcel
              </button>
            )}
          </div>

          {allParcels.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Parcel Vault Empty</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Log incoming courier deliveries (DHL, FedEx, Ghana Post) into the front desk locker vault. Tenants receive instant alerts.
              </p>
              {assignedProperties.length > 0 && (
                <button
                  onClick={() => {
                    setParcelPropertyId(assignedProperties[0]?.id || '');
                    setParcelModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-[var(--primary)] text-white text-xs font-bold rounded-xl shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Log Incoming Package
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {allParcels.map((p: any) => (
                <div key={p.id} className="p-5 rounded-3xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 text-[10px] font-bold rounded-full">
                      {p.carrier || 'Courier'}
                    </span>
                    <span className={clsx("text-[10px] font-bold", p.status === 'ARRIVED' ? "text-amber-500" : "text-emerald-500")}>
                      {p.status}
                    </span>
                  </div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">Slot: {p.lockerNumber || 'Shelf A'}</div>
                  <div className="text-xs text-slate-500">Tracking: {p.trackingNumber || 'N/A'}</div>
                  <div className="text-[10px] text-slate-400">Logged: {new Date(p.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: VISITOR PASSES ── */}
      {activeTab === 'visitors' && (
        <div className="space-y-6">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Gate Access & Visitor Clearance</h2>
          
          {allVisitorPasses.length === 0 ? (
            <div className="p-10 rounded-3xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
                <Key className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">No Active Visitor Passes</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                When tenants generate guest access PINs or delivery passes from their app, they appear here in real time for front desk gate clearance.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {allVisitorPasses.map((v: any) => (
                <div key={v.id} className="p-5 rounded-3xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 text-[10px] font-bold rounded-full">
                      {v.status || 'ACTIVE'}
                    </span>
                    <span className="font-mono text-sm font-black text-indigo-600 dark:text-indigo-400">PIN: {v.accessCode}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{v.visitorName}</h4>
                    <p className="text-xs text-slate-500">{v.purpose || 'Guest Visit'}</p>
                  </div>
                  <div className="text-[10px] text-slate-400">Valid: {new Date(v.validFrom).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: UTILITY & METER LOGGING ── */}
      {activeTab === 'meters' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Gauge className="w-5 h-5 text-[#0F5132] dark:text-emerald-400" />
                Utility Submeters &amp; Standby Generator Logs
              </h2>
              <p className="text-xs text-slate-500">
                Log and monitor ECG prepaid electricity meters, GWCL water submeters, and central diesel generator run-hours across compounds.
              </p>
            </div>
            <button
              onClick={() => {
                setMeterForm({
                  propertyId: assignedProperties[0]?.id || '',
                  utilityType: 'ECG_ELECTRICITY',
                  unitNumber: '',
                  meterNumber: '',
                  previousReading: '',
                  currentReading: '',
                  remainingCredit: '',
                  fuelLevelPct: '',
                  notes: '',
                });
                setMeterModalOpen(true);
              }}
              className="px-4 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer self-start sm:self-auto shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>Log Meter Reading</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { id: 'ALL', label: `All Utilities (${meterReadings.length})` },
              { id: 'ECG_ELECTRICITY', label: `⚡ ECG Electricity (${meterReadings.filter(m => m.utilityType === 'ECG_ELECTRICITY').length})` },
              { id: 'GWCL_WATER', label: `💧 GWCL Water (${meterReadings.filter(m => m.utilityType === 'GWCL_WATER').length})` },
              { id: 'GENERATOR_DIESEL', label: `⚙️ Standby Generator (${meterReadings.filter(m => m.utilityType === 'GENERATOR_DIESEL').length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setUtilityFilter(f.id as any)}
                className={clsx(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer",
                  utilityFilter === f.id
                    ? "bg-[#0F5132] text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Meter Cards Grid */}
          {meterReadings.filter(m => utilityFilter === 'ALL' || m.utilityType === utilityFilter).length === 0 ? (
            <div className="p-10 rounded-3xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
                <Gauge className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">No Meter Logs Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No utility readings recorded under this category yet. Click "Log Meter Reading" to log your first ECG, water submeter, or generator reading.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {meterReadings
                .filter(m => utilityFilter === 'ALL' || m.utilityType === utilityFilter)
                .map((meter) => {
                  const deltaConsumption = Math.max(0, Number((meter.currentReading - meter.previousReading).toFixed(1)));
                  
                  return (
                    <div
                      key={meter.id}
                      className="p-5 rounded-3xl bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4 hover:border-emerald-500/40 transition"
                    >
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={clsx(
                            "w-9 h-9 rounded-xl flex items-center justify-center font-bold",
                            meter.utilityType === 'ECG_ELECTRICITY' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                            meter.utilityType === 'GWCL_WATER' ? "bg-sky-500/10 text-sky-600 dark:text-sky-400" :
                            "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          )}>
                            {meter.utilityType === 'ECG_ELECTRICITY' ? <Zap className="w-4 h-4" /> :
                             meter.utilityType === 'GWCL_WATER' ? <Droplets className="w-4 h-4" /> :
                             <Fuel className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                              {meter.utilityType === 'ECG_ELECTRICITY' ? 'ECG Prepaid' :
                               meter.utilityType === 'GWCL_WATER' ? 'GWCL Water' : 'Standby Generator'}
                            </span>
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{meter.unitNumber}</h4>
                          </div>
                        </div>

                        <span className={clsx(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                          meter.status === 'LOW_BALANCE' ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-500/30" :
                          meter.status === 'READY' ? "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-500/30" :
                          "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30"
                        )}>
                          {meter.status === 'LOW_BALANCE' ? '⚠️ Low Credit' :
                           meter.status === 'READY' ? 'Ready' : 'Normal'}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{meter.meterNumber}</span>
                      </div>

                      {/* Readings Comparison Box */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="text-[10px] text-slate-400">Prev Reading</div>
                            <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                              {meter.previousReading.toLocaleString()} {meter.unitOfMeasure}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400">Current Reading</div>
                            <div className="font-mono font-black text-slate-900 dark:text-white">
                              {meter.currentReading.toLocaleString()} {meter.unitOfMeasure}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800 text-[11px]">
                          <span className="text-slate-500 font-medium">Consumption</span>
                          <span className="font-mono font-black text-[#0F5132] dark:text-emerald-400">
                            +{deltaConsumption} {meter.unitOfMeasure}
                          </span>
                        </div>
                      </div>

                      {/* Remaining Credit or Fuel Level */}
                      {meter.utilityType === 'ECG_ELECTRICITY' && meter.remainingCredit !== undefined && (
                        <div className="flex items-center justify-between text-xs px-1">
                          <span className="text-slate-500">Remaining Balance:</span>
                          <span className={clsx(
                            "font-bold font-mono",
                            meter.remainingCredit < 50 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
                          )}>
                            GHS {meter.remainingCredit.toFixed(2)}
                          </span>
                        </div>
                      )}

                      {meter.utilityType === 'GENERATOR_DIESEL' && meter.fuelLevelPct !== undefined && (
                        <div className="space-y-1 px-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Diesel Fuel Level:</span>
                            <span className="font-bold text-slate-900 dark:text-white font-mono">{meter.fuelLevelPct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className={clsx(
                                "h-full rounded-full transition-all",
                                meter.fuelLevelPct > 50 ? "bg-emerald-500" : meter.fuelLevelPct > 25 ? "bg-amber-500" : "bg-rose-500"
                              )} 
                              style={{ width: `${meter.fuelLevelPct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {meter.notes && (
                        <p className="text-[11px] text-slate-500 italic px-1 line-clamp-1">
                          "{meter.notes}"
                        </p>
                      )}

                      {/* Footer actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400">
                        <span>{new Date(meter.loggedAt).toLocaleDateString('en-GB')}</span>
                        <button
                          onClick={() => {
                            setNoticePropertyId(meter.propertyId || assignedProperties[0]?.id);
                            setNoticeCategory('UTILITY');
                            setNoticePriority(meter.status === 'LOW_BALANCE' ? 'HIGH' : 'NORMAL');
                            setNoticeTitle(
                              meter.utilityType === 'GENERATOR_DIESEL'
                                ? 'Central Standby Generator Run-Hours & Diesel Log'
                                : meter.utilityType === 'ECG_ELECTRICITY'
                                ? `ECG Prepaid Power Reading for ${meter.unitNumber}`
                                : `GWCL Water Submeter Reading for ${meter.unitNumber}`
                            );
                            setNoticeMessage(
                              meter.utilityType === 'GENERATOR_DIESEL'
                                ? `Central Generator recorded ${meter.currentReading} run hours with fuel level at ${meter.fuelLevelPct}%. Ready for standby compound power.`
                                : `Meter ${meter.meterNumber} logged at ${meter.currentReading} ${meter.unitOfMeasure} (Delta: +${deltaConsumption} ${meter.unitOfMeasure}). ${meter.remainingCredit !== undefined ? `Current credit remaining: GHS ${meter.remainingCredit.toFixed(2)}.` : ''}`
                            );
                            setNoticeModalOpen(true);
                          }}
                          className="text-[#0F5132] dark:text-emerald-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <BellRing className="w-3 h-3" /> Post Broadcast
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ── Ticket Resolution Modal ── */}
      {ticketActionModal.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md transition-all">
          <div className="w-full max-w-lg bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-md",
                  ticketActionModal.mode === 'SCHEDULE' ? "bg-indigo-600" : "bg-emerald-600"
                )}>
                  {ticketActionModal.mode === 'SCHEDULE' ? '📅' : '🛠️'}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {ticketActionModal.mode === 'SCHEDULE' ? 'Schedule Maintenance' : 'Complete & Resolve Ticket'}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-1">{ticketActionModal.ticketTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setTicketActionModal(prev => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              {ticketActionModal.mode === 'SCHEDULE' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Estimated Repair Date
                  </label>
                  <input
                    type="date"
                    value={ticketActionModal.scheduledDate}
                    onChange={(e) => setTicketActionModal(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Proof Photo URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={ticketActionModal.completionImageUrl}
                      onChange={(e) => setTicketActionModal(prev => ({ ...prev, completionImageUrl: e.target.value }))}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Resolution Summary / Work Done
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Fixed electrical fuse and replaced broken switches."
                      value={ticketActionModal.resolutionNotes}
                      onChange={(e) => setTicketActionModal(prev => ({ ...prev, resolutionNotes: e.target.value }))}
                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTicketActionModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (ticketActionModal.mode === 'SCHEDULE') {
                    updateTicketMutation.mutate({
                      id: ticketActionModal.ticketId,
                      status: 'SCHEDULED',
                      scheduledDate: ticketActionModal.scheduledDate,
                    });
                  } else {
                    updateTicketMutation.mutate({
                      id: ticketActionModal.ticketId,
                      status: 'RESOLVED',
                      resolutionNotes: ticketActionModal.resolutionNotes || 'Repair completed successfully by caretaker.',
                      completionImageUrl: ticketActionModal.completionImageUrl || undefined,
                    });
                  }
                  setTicketActionModal(prev => ({ ...prev, isOpen: false }));
                }}
                disabled={updateTicketMutation.isPending}
                className={clsx(
                  "px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white transition shadow-lg cursor-pointer",
                  ticketActionModal.mode === 'SCHEDULE' ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                {updateTicketMutation.isPending ? 'Saving...' : ticketActionModal.mode === 'SCHEDULE' ? 'Save Schedule' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Move-In / Move-Out Inspection Modal ── */}
      {selectedInspectionBooking && (
        <InspectionModal
          booking={selectedInspectionBooking}
          isOpen={Boolean(selectedInspectionBooking)}
          onClose={() => setSelectedInspectionBooking(null)}
        />
      )}

      {/* ── Post Notice Modal ── */}
      {noticeModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
          <div className="w-full max-w-lg bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <BellRing className="w-5 h-5 text-sky-500" /> Post Compound Broadcast Notice
              </h3>
              <button onClick={() => setNoticeModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Target Property</label>
                <select
                  value={noticePropertyId}
                  onChange={(e) => setNoticePropertyId(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none"
                >
                  {assignedProperties.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notice Title</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled Generator Maintenance"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Message Content</label>
                <textarea
                  rows={4}
                  placeholder="Write message details for tenants..."
                  value={noticeMessage}
                  onChange={(e) => setNoticeMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setNoticeModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
              <button
                onClick={() => {
                  if (!noticeTitle || !noticeMessage) {
                    toast.error('Please enter notice title and message');
                    return;
                  }
                  createNoticeMutation.mutate({
                    propertyId: noticePropertyId || assignedProperties[0]?.id,
                    title: noticeTitle,
                    message: noticeMessage,
                    category: noticeCategory,
                    priority: noticePriority,
                  });
                }}
                disabled={createNoticeMutation.isPending}
                className="px-6 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                {createNoticeMutation.isPending ? 'Publishing...' : 'Publish Notice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Parcel Modal ── */}
      {parcelModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
          <div className="w-full max-w-lg bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-500" /> Log Incoming Courier Parcel
              </h3>
              <button onClick={() => setParcelModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Property</label>
                <select
                  value={parcelPropertyId}
                  onChange={(e) => setParcelPropertyId(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none"
                >
                  {assignedProperties.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Courier / Carrier</label>
                <input
                  type="text"
                  placeholder="e.g. DHL, FedEx, Jumia, Ghana Post"
                  value={parcelCarrier}
                  onChange={(e) => setParcelCarrier(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tracking Number / Label</label>
                <input
                  type="text"
                  placeholder="e.g. GH-849204"
                  value={parcelTracking}
                  onChange={(e) => setParcelTracking(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Vault / Locker Shelf Location</label>
                <input
                  type="text"
                  placeholder="e.g. Front Desk Shelf A, Locker 3"
                  value={parcelLocation}
                  onChange={(e) => setParcelLocation(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => setParcelModalOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Cancel</button>
              <button
                onClick={() => {
                  logParcelMutation.mutate({
                    propertyId: parcelPropertyId || assignedProperties[0]?.id,
                    carrier: parcelCarrier,
                    trackingNumber: parcelTracking,
                    lockerNumber: parcelLocation,
                  });
                }}
                disabled={logParcelMutation.isPending}
                className="px-6 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                {logParcelMutation.isPending ? 'Logging...' : 'Log & Alert Tenant'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Meter Reading Modal ── */}
      {meterModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
          <div className="w-full max-w-lg bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <Gauge className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Log Utility Submeter Reading
                </h3>
              </div>
              <button 
                onClick={() => setMeterModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              {/* Property Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Compound / Property
                </label>
                <select
                  value={meterForm.propertyId}
                  onChange={(e) => setMeterForm(prev => ({ ...prev, propertyId: e.target.value }))}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none"
                >
                  {assignedProperties.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              {/* Utility Type Radio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Utility Category
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ECG_ELECTRICITY', label: '⚡ ECG Power', icon: Zap },
                    { id: 'GWCL_WATER', label: '💧 Water', icon: Droplets },
                    { id: 'GENERATOR_DIESEL', label: '⚙️ Generator', icon: Fuel },
                  ].map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setMeterForm(prev => ({ ...prev, utilityType: u.id as any }))}
                      className={clsx(
                        "p-2.5 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition cursor-pointer",
                        meterForm.utilityType === u.id
                          ? "bg-[#0F5132] text-white border-[#0F5132] shadow-xs"
                          : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                      )}
                    >
                      <u.icon className="w-4 h-4" />
                      <span>{u.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Unit & Meter Number */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Flat / Unit Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Flat 102, Penthouse B"
                    value={meterForm.unitNumber}
                    onChange={(e) => setMeterForm(prev => ({ ...prev, unitNumber: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Meter Serial / ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ECG-481920-X"
                    value={meterForm.meterNumber}
                    onChange={(e) => setMeterForm(prev => ({ ...prev, meterNumber: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none font-mono"
                  />
                </div>
              </div>

              {/* Previous vs Current Reading */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Previous Reading ({meterForm.utilityType === 'ECG_ELECTRICITY' ? 'kWh' : meterForm.utilityType === 'GWCL_WATER' ? 'm³' : 'Hours'})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 1420.0"
                    value={meterForm.previousReading}
                    onChange={(e) => setMeterForm(prev => ({ ...prev, previousReading: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Current Reading ({meterForm.utilityType === 'ECG_ELECTRICITY' ? 'kWh' : meterForm.utilityType === 'GWCL_WATER' ? 'm³' : 'Hours'})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 1560.5"
                    value={meterForm.currentReading}
                    onChange={(e) => setMeterForm(prev => ({ ...prev, currentReading: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none font-mono"
                  />
                </div>
              </div>

              {/* Conditional: Remaining Credit (for ECG) or Fuel Level (for Generator) */}
              {meterForm.utilityType === 'ECG_ELECTRICITY' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Remaining Prepaid Balance (GHS)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 85.00"
                    value={meterForm.remainingCredit}
                    onChange={(e) => setMeterForm(prev => ({ ...prev, remainingCredit: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none font-mono"
                  />
                </div>
              )}

              {meterForm.utilityType === 'GENERATOR_DIESEL' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Diesel Fuel Tank Level (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="e.g. 80"
                    value={meterForm.fuelLevelPct}
                    onChange={(e) => setMeterForm(prev => ({ ...prev, fuelLevelPct: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none font-mono"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Inspection Remarks / Observations
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Seal intact, no tampering, steady operation."
                  value={meterForm.notes}
                  onChange={(e) => setMeterForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="button"
                onClick={() => setMeterModalOpen(false)} 
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!meterForm.unitNumber || !meterForm.meterNumber || !meterForm.currentReading) {
                    toast.error('Please enter unit number, meter number, and current reading');
                    return;
                  }

                  const prevNum = parseFloat(meterForm.previousReading) || 0;
                  const currNum = parseFloat(meterForm.currentReading) || 0;

                  if (currNum < prevNum) {
                    toast.error('Current reading cannot be lower than previous reading');
                    return;
                  }

                  const selectedProp = assignedProperties.find((p: any) => p.id === meterForm.propertyId) || assignedProperties[0];
                  const remCredit = meterForm.remainingCredit ? parseFloat(meterForm.remainingCredit) : undefined;
                  const fuelLevel = meterForm.fuelLevelPct ? parseInt(meterForm.fuelLevelPct, 10) : undefined;

                  const newEntry = {
                    id: `meter-${Date.now()}`,
                    propertyId: selectedProp?.id || 'prop-default',
                    propertyTitle: selectedProp?.title || 'Residential Compound',
                    utilityType: meterForm.utilityType,
                    unitNumber: meterForm.unitNumber,
                    meterNumber: meterForm.meterNumber,
                    previousReading: prevNum,
                    currentReading: currNum,
                    unitOfMeasure: meterForm.utilityType === 'ECG_ELECTRICITY' ? 'kWh' : meterForm.utilityType === 'GWCL_WATER' ? 'm³' : 'Run Hours',
                    remainingCredit: remCredit,
                    fuelLevelPct: fuelLevel,
                    loggedAt: new Date().toISOString(),
                    status: (remCredit !== undefined && remCredit < 50 ? 'LOW_BALANCE' : meterForm.utilityType === 'GENERATOR_DIESEL' ? 'READY' : 'NORMAL') as any,
                    notes: meterForm.notes || 'Recorded by caretaker inspection.',
                  };

                  setMeterReadings(prev => [newEntry, ...prev]);
                  setMeterModalOpen(false);
                  toast.success('Meter reading logged & recorded!');
                }}
                className="px-6 py-2 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition active:scale-95"
              >
                Save &amp; Log Reading
              </button>
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
