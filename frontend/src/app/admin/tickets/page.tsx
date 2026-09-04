'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/lib/utils';
import { 
  Loader2, 
  Wrench, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  ShieldAlert, 
  XCircle,
  Building,
  User,
  Phone,
  Mail,
  Calendar,
  Eye,
  X,
  Check,
  Camera,
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  Droplets,
  Zap,
  Hammer,
  KeyRound,
  Tv
} from 'lucide-react';

type StatusFilter = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED' | 'URGENT';

// Helper to determine issue category from title/description
const detectCategory = (title: string = '', desc: string = '') => {
  const text = `${title} ${desc}`.toLowerCase();
  if (text.includes('leak') || text.includes('water') || text.includes('shower') || text.includes('tap') || text.includes('sink') || text.includes('pipe') || text.includes('toilet') || text.includes('drain')) {
    return { name: 'Plumbing', icon: Droplets, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/50' };
  }
  if (text.includes('light') || text.includes('wire') || text.includes('electric') || text.includes('power') || text.includes('switch') || text.includes('socket') || text.includes('bulb')) {
    return { name: 'Electrical', icon: Zap, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/50' };
  }
  if (text.includes('door') || text.includes('lock') || text.includes('key') || text.includes('gate') || text.includes('security') || text.includes('burglar')) {
    return { name: 'Security & Access', icon: KeyRound, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-900/50' };
  }
  if (text.includes('ac') || text.includes('air condition') || text.includes('fridge') || text.includes('fan') || text.includes('heater') || text.includes('stove') || text.includes('appliance')) {
    return { name: 'Appliance', icon: Tv, color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-900/50' };
  }
  return { name: 'Structural & General', icon: Hammer, color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' };
};

// Relative time helper
const formatRelativeTime = (dateStr: string) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

export default function AdminTicketsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; title: string } | null>(null);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: async () => {
      const res = await api.get('/admin/tickets');
      return res.data;
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      await api.put(`/admin/tickets/${id}/status`, { status });
    },
    onSuccess: (_, variables) => {
      toast.success(`Ticket status updated to ${variables.status.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
      if (selectedTicket && selectedTicket.id === variables.id) {
        setSelectedTicket((prev: any) => prev ? { ...prev, status: variables.status } : null);
      }
    },
    onError: () => {
      toast.error('Failed to update ticket status');
    }
  });

  // KPI Calculations
  const stats = useMemo(() => {
    if (!tickets || !Array.isArray(tickets)) {
      return { total: 0, pending: 0, inProgress: 0, resolved: 0, urgent: 0 };
    }
    const total = tickets.length;
    const pending = tickets.filter((t: any) => t.status === 'PENDING').length;
    const inProgress = tickets.filter((t: any) => t.status === 'IN_PROGRESS').length;
    const resolved = tickets.filter((t: any) => t.status === 'RESOLVED').length;
    const urgent = tickets.filter((t: any) => t.priority === 'URGENT' && t.status !== 'RESOLVED').length;

    return { total, pending, inProgress, resolved, urgent };
  }, [tickets]);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    if (!tickets || !Array.isArray(tickets)) return [];

    return tickets.filter((ticket: any) => {
      // Status Filter
      if (statusFilter === 'URGENT' && (ticket.priority !== 'URGENT' || ticket.status === 'RESOLVED')) return false;
      if (statusFilter !== 'ALL' && statusFilter !== 'URGENT' && ticket.status !== statusFilter) return false;

      // Category Filter
      if (categoryFilter !== 'ALL') {
        const cat = detectCategory(ticket.title, ticket.description);
        if (cat.name !== categoryFilter) return false;
      }

      // Search Filter
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase().trim();
        const tenantName = `${ticket.tenant?.firstName || ''} ${ticket.tenant?.lastName || ''}`.toLowerCase();
        const landlordName = `${ticket.property?.landlord?.firstName || ''} ${ticket.property?.landlord?.lastName || ''}`.toLowerCase();
        const title = (ticket.title || '').toLowerCase();
        const desc = (ticket.description || '').toLowerCase();
        const propertyTitle = (ticket.property?.title || '').toLowerCase();

        return (
          tenantName.includes(search) || 
          landlordName.includes(search) || 
          title.includes(search) || 
          desc.includes(search) || 
          propertyTitle.includes(search)
        );
      }

      return true;
    });
  }, [tickets, statusFilter, categoryFilter, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-[#0F5132]" />
        <p className="text-sm font-semibold text-slate-500">Loading statutory maintenance registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-in">
      {/* ─── HEADER CONTAINER ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              Act 220 Landlord Repair Oversight
            </span>
            <span className="text-xs font-semibold text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {stats.total} Total Issues Filed
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Maintenance Operations & Statutory Repairs Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Institutional oversight of residential repairs. Ensure landlords fulfill statutory habitability duties under the Ghana Rent Act, 1963 (Act 220).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#0F5132]/10 text-[#0F5132] dark:bg-emerald-950/50 dark:text-emerald-400 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs">
            <Wrench className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ─── 4-CARD EXECUTIVE MAINTENANCE KPI STRIP ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Issues */}
        <div 
          onClick={() => { setStatusFilter('ALL'); setCategoryFilter('ALL'); }}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Reports</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:bg-[#0F5132] group-hover:text-white transition-colors">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {stats.total}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Across registered residential units
          </p>
        </div>

        {/* Urgent & Unresolved */}
        <div 
          onClick={() => setStatusFilter('URGENT')}
          className={`cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all shadow-xs group ${
            stats.urgent > 0 
              ? 'border-red-300 dark:border-red-700/60 bg-red-50/20 dark:bg-red-950/10 hover:border-red-400' 
              : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Urgent & Active</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              stats.urgent > 0 ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.urgent}
            </div>
            {stats.urgent > 0 && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                Action Req
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.urgent === 0 ? 'No urgent unresolved emergencies' : 'Critical issues requiring immediate action'}
          </p>
        </div>

        {/* In Progress */}
        <div 
          onClick={() => setStatusFilter('IN_PROGRESS')}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">In Progress</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {stats.inProgress}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dispatched to technicians / in repair
          </p>
        </div>

        {/* Resolved */}
        <div 
          onClick={() => setStatusFilter('RESOLVED')}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Resolved</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-[#0F5132] group-hover:text-white transition-colors">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {stats.resolved}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Repairs confirmed fixed by tenants
          </p>
        </div>
      </div>

      {/* ─── SEARCH & FILTER CONTROLS ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by issue, property, tenant, or landlord..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5132] dark:focus:ring-emerald-500 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Count */}
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredTickets.length}</strong> of {stats.total} tickets
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'ALL'
                ? 'bg-[#0F5132] text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            All Tickets ({stats.total})
          </button>

          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Pending ({stats.pending})
          </button>

          <button
            onClick={() => setStatusFilter('IN_PROGRESS')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'IN_PROGRESS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            In Progress ({stats.inProgress})
          </button>

          <button
            onClick={() => setStatusFilter('RESOLVED')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'RESOLVED'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Resolved ({stats.resolved})
          </button>

          <button
            onClick={() => setStatusFilter('URGENT')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === 'URGENT'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Urgent Only ({stats.urgent})
            {stats.urgent > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            )}
          </button>
        </div>
      </div>

      {/* ─── INSTITUTIONAL TICKETS TABLE ─────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-[#0F5132] text-white shadow-xs">
              <tr>
                <th className="px-6 py-4 font-black tracking-wider text-white">Issue & Category</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Property</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Tenant</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Landlord</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Reported SLA</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Priority</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Status</th>
                <th className="px-6 py-4 font-black tracking-wider text-white text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-bold text-sm">No maintenance tickets found matching criteria.</p>
                    <button 
                      onClick={() => { setStatusFilter('ALL'); setSearchTerm(''); }}
                      className="mt-2 text-xs font-bold text-[#0F5132] hover:underline"
                    >
                      Clear search filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket: any) => {
                  const category = detectCategory(ticket.title, ticket.description);
                  const CategoryIcon = category.icon;
                  const hasPhoto = Boolean(ticket.imageUrl);

                  return (
                    <tr key={ticket.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Issue & Category */}
                      <td className="px-6 py-4">
                        <div className="space-y-1 max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 dark:text-white truncate">
                              {ticket.title}
                            </span>
                            {hasPhoto && (
                              <button
                                onClick={() => setZoomedPhoto({ url: getImageUrl(ticket.imageUrl), title: ticket.title })}
                                className="p-1 text-[#0F5132] hover:bg-[#0F5132]/10 rounded-md shrink-0"
                                title="Click to inspect photo evidence"
                              >
                                <Camera className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${category.color}`}>
                              <CategoryIcon className="w-3 h-3" />
                              {category.name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Property */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-0.5 max-w-[180px]">
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                            {ticket.property?.title || 'Unknown Property'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {ticket.property?.location || 'Location not specified'}
                          </div>
                        </div>
                      </td>

                      {/* Tenant */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                            {ticket.tenant ? `${ticket.tenant.firstName} ${ticket.tenant.lastName}` : 'Unknown'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            {ticket.tenant?.phoneNumber || ticket.tenant?.email}
                          </div>
                        </div>
                      </td>

                      {/* Landlord */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {ticket.property?.landlord ? `${ticket.property.landlord.firstName} ${ticket.property.landlord.lastName}` : 'Unknown'}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                            {ticket.property?.landlord?.phoneNumber || ticket.property?.landlord?.email}
                          </div>
                        </div>
                      </td>

                      {/* Reported SLA */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {formatRelativeTime(ticket.createdAt)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                          ticket.priority === 'URGENT' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900/50' :
                          ticket.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-900/50' :
                          ticket.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50' :
                          'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {ticket.priority === 'URGENT' && <ShieldAlert className="w-3 h-3 text-red-600 animate-pulse" />}
                          {ticket.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          ticket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200' :
                          ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200' :
                          ticket.status === 'REJECTED' ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200' :
                          'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200'
                        }`}>
                          {ticket.status === 'RESOLVED' && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                          {ticket.status === 'IN_PROGRESS' && <Clock className="w-3 h-3 text-blue-600" />}
                          {ticket.status === 'REJECTED' && <XCircle className="w-3 h-3 text-slate-500" />}
                          {ticket.status === 'PENDING' && <AlertCircle className="w-3 h-3 text-amber-600" />}
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-[#0F5132] hover:text-white dark:bg-slate-800 dark:hover:bg-[#0F5132] text-slate-700 dark:text-slate-200 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 ml-auto shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Audit Ticket
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: DEEP TICKET AUDIT & ESCALATION DRAWER ───────────────── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-emerald-900/30 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#0F5132] via-[#146c43] to-slate-900 text-white flex justify-between items-center relative overflow-hidden shadow-md">
              <div className="flex items-center gap-3.5 z-10">
                <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 border border-white/10 shadow-inner">
                  <Wrench className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Maintenance Audit
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      selectedTicket.priority === 'URGENT' ? 'bg-red-600 text-white' : 'bg-white/20 text-white'
                    }`}>
                      {selectedTicket.priority}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight mt-0.5 truncate max-w-md">
                    {selectedTicket.title}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/50 dark:bg-slate-950/50">
              {/* Photo Evidence Card */}
              {selectedTicket.imageUrl && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#0F5132]" />
                      Tenant Uploaded Evidence
                    </span>
                    <button
                      onClick={() => setZoomedPhoto({ url: getImageUrl(selectedTicket.imageUrl), title: selectedTicket.title })}
                      className="text-xs font-bold text-[#0F5132] hover:underline"
                    >
                      Enlarge / Fullscreen
                    </button>
                  </div>
                  <div className="relative rounded-xl overflow-hidden bg-black max-h-[220px] flex items-center justify-center border border-slate-200 dark:border-slate-800">
                    <img
                      src={getImageUrl(selectedTicket.imageUrl)}
                      alt={selectedTicket.title}
                      className="w-full h-full object-contain max-h-[220px]"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Problem Description
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                  {selectedTicket.description || 'No detailed description entered.'}
                </p>
              </div>

              {/* Counterparties: Tenant & Landlord */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tenant Card */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Reporting Tenant
                  </span>
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {selectedTicket.tenant?.firstName} {selectedTicket.tenant?.lastName}
                  </p>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{selectedTicket.tenant?.email}</span>
                    </div>
                    {selectedTicket.tenant?.phoneNumber && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedTicket.tenant.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Landlord Card */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Obligated Landlord
                    </span>
                    {selectedTicket.property?.landlord?.phoneNumber && (
                      <a
                        href={`https://wa.me/${selectedTicket.property.landlord.phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${selectedTicket.property.landlord.firstName}, this is an urgent notification from Akwaaba Homes management regarding maintenance ticket: "${selectedTicket.title}" at ${selectedTicket.property?.title}.`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                      >
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </a>
                    )}
                  </div>
                  <p className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {selectedTicket.property?.landlord?.firstName} {selectedTicket.property?.landlord?.lastName}
                  </p>
                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{selectedTicket.property?.landlord?.email}</span>
                    </div>
                    {selectedTicket.property?.landlord?.phoneNumber && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedTicket.property.landlord.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Act 220 Legal Advisory */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#0F5132] shrink-0 mt-0.5" />
                <div>
                  <strong className="font-extrabold">Act 220 Landlord Obligation:</strong> Under Section 25 of the Ghana Rent Act, 1963 (Act 220), landlords are legally obligated to maintain residential premises in tenantable repair and remedy structural/utility defects.
                </div>
              </div>

              {/* Status Override Controls */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Admin Resolution Override
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'PENDING', label: 'Pending', color: 'hover:border-amber-400' },
                    { key: 'IN_PROGRESS', label: 'In Progress', color: 'hover:border-blue-400' },
                    { key: 'RESOLVED', label: 'Resolved', color: 'hover:border-emerald-400' },
                    { key: 'REJECTED', label: 'Dismiss / Reject', color: 'hover:border-slate-400' }
                  ].map((s) => (
                    <button
                      key={s.key}
                      disabled={updateStatusMutation.isPending || selectedTicket.status === s.key}
                      onClick={() => updateStatusMutation.mutate({ id: selectedTicket.id, status: s.key })}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all text-center flex items-center justify-center gap-1.5 ${
                        selectedTicket.status === s.key
                          ? 'bg-[#0F5132] text-white border-[#0F5132] shadow-xs'
                          : `bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 ${s.color}`
                      }`}
                    >
                      {updateStatusMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: FULLSCREEN PHOTO LIGHTBOX ───────────────────────────── */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in">
          <div className="relative max-w-5xl w-full flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-3 text-white">
              <h3 className="font-extrabold text-base">{zoomedPhoto.title}</h3>
              <button
                onClick={() => setZoomedPhoto(null)}
                className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold backdrop-blur-md"
              >
                Close (Esc)
              </button>
            </div>
            <div className="border border-white/20 rounded-2xl overflow-hidden max-h-[85vh] bg-black">
              <img src={zoomedPhoto.url} alt={zoomedPhoto.title} className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
