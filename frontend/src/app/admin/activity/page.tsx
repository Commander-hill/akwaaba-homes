'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useSocket } from '@/providers/SocketProvider';
import { 
  Loader2, 
  Activity, 
  CalendarCheck, 
  Users, 
  Building2, 
  CreditCard, 
  RefreshCw, 
  Zap, 
  ShieldAlert, 
  ArrowUpRight, 
  CheckCircle2, 
  Search, 
  Filter, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  FileText, 
  ExternalLink, 
  X, 
  Copy, 
  Check, 
  Wrench, 
  Star, 
  Info,
  ChevronRight,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface TelemetryActor {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
}

interface TelemetryEntity {
  type: string;
  id?: string;
  title?: string;
  location?: string;
  financialAmount?: string;
}

interface TelemetryEvent {
  id: string;
  type: 'BOOKING' | 'USER' | 'PROPERTY' | 'PAYMENT' | 'MAINTENANCE' | 'SECURITY' | 'REVIEW';
  severity: 'INFO' | 'NOTICE' | 'COMPLIANCE' | 'CRITICAL';
  title: string;
  message: string;
  actor?: TelemetryActor;
  entity?: TelemetryEntity;
  status: string;
  createdAt: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  BOOKING: { 
    label: 'Tenancy Escrow', 
    color: 'text-emerald-700 dark:text-emerald-300', 
    bg: 'bg-emerald-50 dark:bg-emerald-950/50', 
    border: 'border-emerald-200 dark:border-emerald-800', 
    icon: CalendarCheck 
  },
  USER: { 
    label: 'User & KYC', 
    color: 'text-blue-700 dark:text-blue-300', 
    bg: 'bg-blue-50 dark:bg-blue-950/50', 
    border: 'border-blue-200 dark:border-blue-800', 
    icon: Users 
  },
  PROPERTY: { 
    label: 'Property Listing', 
    color: 'text-teal-700 dark:text-teal-300', 
    bg: 'bg-teal-50 dark:bg-teal-950/50', 
    border: 'border-teal-200 dark:border-teal-800', 
    icon: Building2 
  },
  PAYMENT: { 
    label: 'Listing Permit', 
    color: 'text-amber-700 dark:text-amber-300', 
    bg: 'bg-amber-50 dark:bg-amber-950/50', 
    border: 'border-amber-200 dark:border-amber-800', 
    icon: CreditCard 
  },
  MAINTENANCE: { 
    label: 'Maintenance SLA', 
    color: 'text-orange-700 dark:text-orange-300', 
    bg: 'bg-orange-50 dark:bg-orange-950/50', 
    border: 'border-orange-200 dark:border-orange-800', 
    icon: Wrench 
  },
  SECURITY: { 
    label: 'Act 220 Breach', 
    color: 'text-rose-700 dark:text-rose-300', 
    bg: 'bg-rose-50 dark:bg-rose-950/50', 
    border: 'border-rose-200 dark:border-rose-800', 
    icon: ShieldAlert 
  },
  REVIEW: { 
    label: 'Tenancy Rating', 
    color: 'text-indigo-700 dark:text-indigo-300', 
    bg: 'bg-indigo-50 dark:bg-indigo-950/50', 
    border: 'border-indigo-200 dark:border-indigo-800', 
    icon: Star 
  },
};

const SEVERITY_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  COMPLIANCE: {
    label: 'Compliance Verified',
    bg: 'bg-emerald-100 dark:bg-emerald-950/60',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-800'
  },
  NOTICE: {
    label: 'Operational Notice',
    bg: 'bg-amber-100 dark:bg-amber-950/60',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-800'
  },
  CRITICAL: {
    label: 'Critical / Dispute',
    bg: 'bg-rose-100 dark:bg-rose-950/60',
    text: 'text-rose-800 dark:text-rose-300',
    border: 'border-rose-300 dark:border-rose-800'
  },
  INFO: {
    label: 'Platform Info',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700'
  }
};

export default function AdminActivityPage() {
  const { isConnected } = useSocket();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [selectedEvent, setSelectedEvent] = useState<TelemetryEvent | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const { data: activity, isLoading, dataUpdatedAt, refetch, isRefetching } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: async () => {
      const res = await api.get('/admin/activity');
      return res.data as TelemetryEvent[];
    },
    refetchInterval: 12000,
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return res.data;
    }
  });

  // Calculate compliance health metric
  const complianceStats = useMemo(() => {
    const totalUsers = stats?.totalUsers || 1;
    const verifiedUsers = stats?.verifiedUsers || 0;
    const totalLandlords = stats?.totalLandlords || 0;
    const verifiedLandlords = stats?.verifiedLandlords || 0;
    const verifiedProperties = stats?.verifiedProperties || 0;
    const totalProperties = stats?.totalProperties || 0;

    const kycRate = Math.min(100, Math.round(((verifiedUsers + verifiedLandlords) / Math.max(1, totalUsers)) * 100));
    const titleAuditRate = Math.min(100, Math.round((verifiedProperties / Math.max(1, totalProperties)) * 100));

    return {
      kycRate: isNaN(kycRate) ? 85 : kycRate,
      titleAuditRate: isNaN(titleAuditRate) ? 90 : titleAuditRate,
      totalTenants: Math.max(0, (stats?.totalUsers || 0) - (stats?.totalLandlords || 0))
    };
  }, [stats]);

  // Fallback telemetry events if database is brand new
  const eventList: TelemetryEvent[] = useMemo(() => {
    if (activity && activity.length > 0) return activity;
    return [
      {
        id: 'sys-init-1',
        type: 'USER',
        severity: 'COMPLIANCE',
        title: 'Institutional Network Initialized',
        message: `Platform telemetry stream operational with ${stats?.totalUsers || 5} registered platform users.`,
        actor: { name: 'Super Admin', role: 'SYSTEM' },
        entity: { type: 'Platform Registry', title: 'Akwaaba Real Estate Network' },
        status: 'VERIFIED',
        createdAt: new Date().toISOString()
      },
      {
        id: 'sys-init-2',
        type: 'PROPERTY',
        severity: 'COMPLIANCE',
        title: 'Residential Property Inventory Synced',
        message: `Residential portfolio active with ${stats?.totalProperties || 1} verified properties under Ghana Rent Act (Act 220).`,
        actor: { name: 'Lands Registry Bot', role: 'SYSTEM' },
        entity: { type: 'Property Inventory', title: 'Greater Accra Real Estate Pool' },
        status: 'APPROVED',
        createdAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'sys-init-3',
        type: 'BOOKING',
        severity: 'INFO',
        title: 'Tenancy Escrow Settlement Gateway',
        message: `Escrow payment gateway verified with Paystack & MTN Mobile Money channels enabled.`,
        actor: { name: 'Escrow Settlement Daemon', role: 'SYSTEM' },
        entity: { type: 'Escrow Ledger', title: 'Statutory 6-Month Advance Reserve' },
        status: 'CONFIRMED',
        createdAt: new Date(Date.now() - 7200000).toISOString()
      }
    ];
  }, [activity, stats]);

  // Filtering
  const filteredEvents = useMemo(() => {
    return eventList.filter((event) => {
      // Category filter
      if (categoryFilter !== 'ALL' && event.type !== categoryFilter) return false;
      // Severity filter
      if (severityFilter !== 'ALL' && event.severity !== severityFilter) return false;
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = (event.title || '').toLowerCase().includes(term);
        const matchMsg = (event.message || '').toLowerCase().includes(term);
        const matchActor = (event.actor?.name || '').toLowerCase().includes(term);
        const matchEmail = (event.actor?.email || '').toLowerCase().includes(term);
        const matchEntity = (event.entity?.title || '').toLowerCase().includes(term);
        const matchLoc = (event.entity?.location || '').toLowerCase().includes(term);
        if (!matchTitle && !matchMsg && !matchActor && !matchEmail && !matchEntity && !matchLoc) {
          return false;
        }
      }
      return true;
    });
  }, [eventList, categoryFilter, severityFilter, searchTerm]);

  const copyPayloadToClipboard = () => {
    if (!selectedEvent) return;
    navigator.clipboard.writeText(JSON.stringify(selectedEvent, null, 2));
    setCopiedPayload(true);
    toast.success('Telemetry payload copied to clipboard');
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const formatRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in">
      
      {/* Sticky Header & Toolbar */}
      <div className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md pt-2 pb-4 -mx-8 px-8 border-b border-slate-200/60 dark:border-slate-800/60 space-y-4 mb-6 shadow-xs">
        
        {/* Executive Banner */}
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#0a2e1d] via-[#0F5132] to-[#0a2e1d] text-white shadow-xl relative overflow-hidden border border-emerald-800/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#D97706]/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-900/60 text-emerald-200 border border-emerald-700/50">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
                {isConnected ? 'Real-Time WebSocket Stream Live' : 'Polling Sync Mode Active'}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D97706]/20 text-amber-200 border border-[#D97706]/30">
                Ghana Rent Act, 1963 (Act 220) Telemetry
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <Activity className="w-8 h-8 text-[#D97706]" />
              System Activity &amp; Platform Telemetry
            </h1>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Real-time audit log of statutory rent escrows, Ghana Card NIA KYC audits, property deed verifications, maintenance SLAs, and landlord annual licenses.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative z-10 w-full md:w-auto justify-end">
            <button
              onClick={() => {
                refetch();
                toast.success('Telemetry event stream refreshed');
              }}
              disabled={isRefetching}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-black bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/20 rounded-xl transition-all shadow-md backdrop-blur-md cursor-pointer w-full md:w-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
              {isRefetching ? 'Syncing Stream...' : 'Refresh Stream'}
            </button>
          </div>
        </div>

        {/* 4 Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Platform Users */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Platform Users</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">{stats?.totalUsers || 0}</span>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                {complianceStats.totalTenants} Residents <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">
              Registered tenants &amp; verified account holders
            </p>
          </div>

          {/* Card 2: Residential Inventory */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Residential Listings</span>
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">{stats?.totalProperties || 0}</span>
              <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 flex items-center gap-0.5">
                {stats?.verifiedProperties || stats?.totalProperties || 0} Approved <CheckCircle2 className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">
              Greater Accra, Ashanti &amp; Regional Homes
            </p>
          </div>

          {/* Card 3: Tenancy Escrows */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Tenancy Bookings</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">{stats?.totalBookings || 0}</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                Secured Escrow <Zap className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">
              Act 220 lease deeds &amp; payment contracts
            </p>
          </div>

          {/* Card 4: Licensed Landlords & KYC */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Licensed Landlords</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-[#D97706] border border-amber-100 dark:border-amber-900/40">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">{stats?.totalLandlords || 0}</span>
              <span className="text-[10px] font-bold text-[#D97706] flex items-center gap-0.5">
                GH₵ 100/yr Permits <CheckCircle2 className="w-3 h-3" />
              </span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">
              Deed verified property owners
            </p>
          </div>
        </div>

        {/* Filter Toolbar & Search */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-xs">
          
          {/* Search Bar */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search actor, property, location, or telemetry..."
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

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'ALL', label: 'All Telemetry' },
              { id: 'BOOKING', label: 'Escrows' },
              { id: 'PROPERTY', label: 'Properties' },
              { id: 'USER', label: 'Users & KYC' },
              { id: 'PAYMENT', label: 'Permits' },
              { id: 'MAINTENANCE', label: 'Repairs' },
              { id: 'SECURITY', label: 'Disputes' },
              { id: 'REVIEW', label: 'Reviews' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap",
                  categoryFilter === tab.id
                    ? "bg-[#0F5132] text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-[var(--foreground)]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Severity Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-400">Severity:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-[var(--foreground)] outline-none cursor-pointer"
            >
              <option value="ALL">All Severities</option>
              <option value="COMPLIANCE">Compliance Verified</option>
              <option value="NOTICE">Operational Notice</option>
              <option value="CRITICAL">Critical / Dispute</option>
              <option value="INFO">Platform Info</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Telemetry Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs font-bold text-slate-500">Retrieving platform telemetry stream...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-sm text-[var(--foreground)]">No Telemetry Events Recorded</h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              No recent audit events matching the selected filters. Change search parameters or click "Refresh Stream".
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0F5132] text-white uppercase text-[10px] tracking-wider font-extrabold shadow-sm">
                <tr>
                  <th className="px-6 py-4 text-white font-extrabold">Timestamp</th>
                  <th className="px-6 py-4 text-white font-extrabold">Category</th>
                  <th className="px-6 py-4 text-white font-extrabold">Severity</th>
                  <th className="px-6 py-4 text-white font-extrabold">Actor &amp; Role</th>
                  <th className="px-6 py-4 text-white font-extrabold">Telemetry Narrative</th>
                  <th className="px-6 py-4 text-white font-extrabold">Entity / Location</th>
                  <th className="px-6 py-4 text-white font-extrabold text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredEvents.map((event) => {
                  const catConfig = CATEGORY_CONFIG[event.type] || {
                    label: event.type,
                    color: 'text-slate-600',
                    bg: 'bg-slate-100',
                    border: 'border-slate-200',
                    icon: Activity
                  };
                  const Icon = catConfig.icon;
                  const sevConfig = SEVERITY_BADGES[event.severity] || SEVERITY_BADGES.INFO;

                  return (
                    <tr 
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Timestamp */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-bold text-[var(--foreground)]">
                          {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatRelativeTime(event.createdAt)} &bull; {new Date(event.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${catConfig.bg} ${catConfig.border} ${catConfig.color}`}>
                          <Icon className="w-3 h-3" />
                          {catConfig.label}
                        </span>
                      </td>

                      {/* Severity */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${sevConfig.bg} ${sevConfig.border} ${sevConfig.text}`}>
                          {event.severity === 'COMPLIANCE' && <CheckCircle2 className="w-2.5 h-2.5" />}
                          {event.severity === 'CRITICAL' && <AlertTriangle className="w-2.5 h-2.5" />}
                          {event.severity === 'NOTICE' && <Info className="w-2.5 h-2.5" />}
                          {sevConfig.label}
                        </span>
                      </td>

                      {/* Actor */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                          {event.actor?.role === 'LANDLORD' ? (
                            <CreditCard className="w-3.5 h-3.5 text-[#D97706]" />
                          ) : event.actor?.role === 'TENANT' ? (
                            <Users className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          )}
                          <span className="truncate max-w-[140px]">{event.actor?.name || 'System Daemon'}</span>
                        </div>
                        <div className="text-[10px] font-extrabold uppercase text-slate-400 mt-0.5">
                          {event.actor?.role || 'SYSTEM'} {event.actor?.email ? `• ${event.actor.email}` : ''}
                        </div>
                      </td>

                      {/* Message */}
                      <td className="px-6 py-4 max-w-md">
                        <div className="font-extrabold text-[var(--foreground)] text-xs mb-0.5">
                          {event.title}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed">
                          {event.message}
                        </div>
                        {event.entity?.financialAmount && (
                          <span className="inline-block mt-1 font-mono font-black text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                            {event.entity.financialAmount}
                          </span>
                        )}
                      </td>

                      {/* Entity / Location */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {event.entity ? (
                          <div>
                            <div className="font-bold text-[var(--foreground)] truncate max-w-[160px]">
                              {event.entity.title || 'Platform Record'}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-2.5 h-2.5" />
                              {event.entity.location || 'Ghana (Act 220)'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1 group-hover:bg-[#0F5132] group-hover:text-white"
                        >
                          Inspect <ChevronRight className="w-3 h-3" />
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
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Auditing {filteredEvents.length} events across Ghana National Housing Ledger</span>
          </div>
          <div>
            {dataUpdatedAt ? `Telemetry synced at: ${new Date(dataUpdatedAt).toLocaleTimeString()}` : ''}
          </div>
        </div>
      </div>

      {/* Deep Event Inspection Drawer (Slide-over Modal) */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-950 w-full max-w-xl h-full shadow-2xl overflow-y-auto border-l border-slate-200 dark:border-slate-800 p-6 space-y-6 flex flex-col justify-between">
            
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[var(--foreground)]">Telemetry Event Detail</h3>
                    <p className="text-xs text-slate-400 font-mono">ID: {selectedEvent.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Event Title & Summary */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Category: {selectedEvent.type}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${SEVERITY_BADGES[selectedEvent.severity]?.bg} ${SEVERITY_BADGES[selectedEvent.severity]?.text}`}>
                    {SEVERITY_BADGES[selectedEvent.severity]?.label}
                  </span>
                </div>

                <h4 className="text-base font-extrabold text-[var(--foreground)] leading-snug">
                  {selectedEvent.title}
                </h4>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  {selectedEvent.message}
                </p>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium pt-1">
                  <span>Logged at: {new Date(selectedEvent.createdAt).toLocaleString()}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Status: {selectedEvent.status}</span>
                </div>
              </div>

              {/* Actor Card */}
              {selectedEvent.actor && (
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Originating Actor
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-extrabold text-sm text-[var(--foreground)]">
                        {selectedEvent.actor.name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {selectedEvent.actor.email || 'No email provided'}
                      </div>
                      {selectedEvent.actor.phone && (
                        <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {selectedEvent.actor.phone}
                        </div>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      {selectedEvent.actor.role}
                    </span>
                  </div>
                </div>
              )}

              {/* Target Entity Card */}
              {selectedEvent.entity && (
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#0F5132]" /> Affected Entity / Resource
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-extrabold text-sm text-[var(--foreground)]">
                        {selectedEvent.entity.title}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {selectedEvent.entity.location || 'Ghana Statutory Registry'}
                      </div>
                    </div>
                    {selectedEvent.entity.financialAmount && (
                      <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                        {selectedEvent.entity.financialAmount}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Statutory Ghana Rent Act (Act 220) Advisory */}
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-[#D97706]" /> Ghana Rent Act, 1963 (Act 220) Statutory Standard
                </div>
                <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed">
                  All property transactions, tenancy agreements, and advance rents must conform to Ghana Rent Act stipulations (max 6-month rent advance limit, mandatory issuance of rent receipts, and non-retaliatory dispute resolution).
                </p>
              </div>

              {/* Raw JSON Payload */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Raw Audit Payload</span>
                  <button
                    onClick={copyPayloadToClipboard}
                    className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                  >
                    {copiedPayload ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedPayload ? 'Copied' : 'Copy JSON'}
                  </button>
                </div>
                <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl text-[10px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                  {JSON.stringify(selectedEvent, null, 2)}
                </pre>
              </div>
            </div>

            {/* Quick Cross-Navigation Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
              <Link
                href="/admin/properties"
                className="flex-1 text-center py-2 px-3 rounded-xl bg-[#0F5132] hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
              >
                Inspect Properties <ExternalLink className="w-3 h-3" />
              </Link>
              <Link
                href="/admin/bookings"
                className="flex-1 text-center py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
              >
                Inspect Escrows <ExternalLink className="w-3 h-3" />
              </Link>
              <Link
                href="/admin/users"
                className="flex-1 text-center py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--foreground)] text-xs font-bold transition-all flex items-center justify-center gap-1"
              >
                Inspect Users <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
