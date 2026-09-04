'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { 
  Loader2, 
  Building, 
  CheckCircle, 
  XCircle, 
  MapPin, 
  Clock, 
  Search, 
  Filter, 
  LayoutGrid, 
  Table as TableIcon, 
  Eye, 
  ExternalLink, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Check, 
  X, 
  Layers, 
  Home, 
  User, 
  Banknote,
  Sparkles,
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';

type ApprovalFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export default function AdminPropertiesPage() {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApprovalFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal inspection target
  const [inspectingProperty, setInspectingProperty] = useState<any | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  const { data: properties, isLoading } = useQuery({
    queryKey: ['admin-properties'],
    queryFn: async () => {
      const res = await api.get('/admin/properties');
      return res.data;
    }
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, approvalStatus }: { id: string, approvalStatus: string }) => {
      await api.put(`/admin/properties/${id}/status`, { approvalStatus });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.approvalStatus === 'APPROVED' 
          ? 'Property listing approved & published!' 
          : 'Property status updated.'
      );
      queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
      if (inspectingProperty && inspectingProperty.id === variables.id) {
        setInspectingProperty((prev: any) => prev ? { ...prev, approvalStatus: variables.approvalStatus } : null);
      }
    },
    onError: () => {
      toast.error('Failed to update property status');
    },
    onSettled: () => setProcessingId(null)
  });

  const handleStatusUpdate = (id: string, approvalStatus: string) => {
    setProcessingId(id);
    statusMutation.mutate({ id, approvalStatus });
  };

  // KPI calculations
  const stats = useMemo(() => {
    if (!properties || !Array.isArray(properties)) {
      return { total: 0, pending: 0, approved: 0, rejected: 0, apartments: 0, houses: 0, studios: 0 };
    }
    const total = properties.length;
    const pending = properties.filter((p: any) => p.approvalStatus === 'PENDING').length;
    const approved = properties.filter((p: any) => p.approvalStatus === 'APPROVED').length;
    const rejected = properties.filter((p: any) => p.approvalStatus === 'REJECTED').length;
    const apartments = properties.filter((p: any) => (p.type || '').toLowerCase().includes('apartment')).length;
    const houses = properties.filter((p: any) => (p.type || '').toLowerCase().includes('house') || (p.type || '').toLowerCase().includes('homestay')).length;
    const studios = properties.filter((p: any) => (p.type || '').toLowerCase().includes('studio')).length;

    return { total, pending, approved, rejected, apartments, houses, studios };
  }, [properties]);

  // Unique property types for filter
  const availableTypes = useMemo(() => {
    if (!properties || !Array.isArray(properties)) return [];
    const types = new Set<string>();
    properties.forEach((p: any) => {
      if (p.type) types.add(p.type);
    });
    return Array.from(types);
  }, [properties]);

  // Filtered properties
  const filteredProperties = useMemo(() => {
    if (!properties || !Array.isArray(properties)) return [];

    return properties.filter((p: any) => {
      // Status filter
      if (statusFilter !== 'ALL' && p.approvalStatus !== statusFilter) return false;

      // Type filter
      if (typeFilter !== 'ALL' && p.type !== typeFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const title = (p.title || '').toLowerCase();
        const location = (p.location || '').toLowerCase();
        const landlordName = `${p.landlord?.firstName || ''} ${p.landlord?.lastName || ''}`.toLowerCase();
        const landlordEmail = (p.landlord?.email || '').toLowerCase();

        return title.includes(query) || location.includes(query) || landlordName.includes(query) || landlordEmail.includes(query);
      }

      return true;
    });
  }, [properties, statusFilter, typeFilter, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-[#0F5132]" />
        <p className="text-sm font-semibold text-slate-500">Loading property inventory & approvals...</p>
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
              Act 220 Listing Governance
            </span>
            <span className="text-xs font-semibold text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {stats.total} Total Inventory Units
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Property Approvals & Inventory Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Audit rental listings, inspect property deeds and photo quality, enforce statutory advance rent standards, and moderate live availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#0F5132]/10 text-[#0F5132] dark:bg-emerald-950/50 dark:text-emerald-400 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs">
            <Building className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ─── 4-CARD EXECUTIVE KPI STRIP ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Listings */}
        <div 
          onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); }}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Listings</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:bg-[#0F5132] group-hover:text-white transition-colors">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {stats.total}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.apartments} Apartments • {stats.studios} Studios • {stats.houses} Houses
          </p>
        </div>

        {/* Pending Approvals */}
        <div 
          onClick={() => setStatusFilter('PENDING')}
          className={`cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all shadow-xs group ${
            stats.pending > 0 
              ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/10 hover:border-amber-400' 
              : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Review</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              stats.pending > 0 ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.pending}
            </div>
            {stats.pending > 0 && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                Action Req
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.pending === 0 ? 'All listings reviewed' : 'Awaiting administrative verification'}
          </p>
        </div>

        {/* Approved & Live */}
        <div 
          onClick={() => setStatusFilter('APPROVED')}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Approved & Live</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-[#0F5132] group-hover:text-white transition-colors">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {stats.approved}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Publicly searchable across Ghana
          </p>
        </div>

        {/* Rejected Listings */}
        <div 
          onClick={() => setStatusFilter('REJECTED')}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rejected / Flagged</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {stats.rejected}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Withheld for quality or policy issues
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
              placeholder="Search by property title, location, or landlord..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F5132] dark:focus:ring-emerald-500 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Toggle & Count */}
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing <strong className="text-slate-800 dark:text-slate-200">{filteredProperties.length}</strong> of {stats.total}
            </div>

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-slate-900 text-[#0F5132] shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table' 
                    ? 'bg-white dark:bg-slate-900 text-[#0F5132] shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
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
            All Listings ({stats.total})
          </button>

          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Pending Review ({stats.pending})
            {stats.pending > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Approved ({stats.approved})
          </button>

          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              statusFilter === 'REJECTED'
                ? 'bg-red-700 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Rejected ({stats.rejected})
          </button>

          {/* Type Select */}
          {availableTypes.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-[#0F5132]"
              >
                <option value="ALL">All Categories</option>
                {availableTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ─── CONTENT DISPLAY: GRID OR TABLE ──────────────────────────────── */}
      {filteredProperties.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center text-slate-500 shadow-xs">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-200 mb-1">No property listings found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            No properties match your current search and filter settings.
          </p>
          <button
            onClick={() => { setStatusFilter('ALL'); setTypeFilter('ALL'); setSearchQuery(''); }}
            className="px-4 py-2 bg-[#0F5132] text-white rounded-xl text-xs font-extrabold shadow-sm hover:bg-[#146c43] transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ─── GRID CARD VIEW ───────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property: any) => {
            const hasImages = property.images && Array.isArray(property.images) && property.images.length > 0;
            const primaryImage = hasImages ? getImageUrl(property.images[0]) : null;

            return (
              <div 
                key={property.id} 
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col shadow-xs hover:shadow-md transition-all group"
              >
                {/* Photo & Badge Area */}
                <div className="h-52 overflow-hidden relative bg-slate-100 dark:bg-slate-800">
                  {primaryImage ? (
                    <img 
                      src={primaryImage} 
                      alt={property.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <Building className="w-8 h-8 mb-1" />
                      <span className="text-xs font-semibold">No Image Uploaded</span>
                    </div>
                  )}

                  {/* Top Floating Badges */}
                  <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold shadow-md flex items-center gap-1 text-white ${
                      property.approvalStatus === 'APPROVED' ? 'bg-[#0F5132]' :
                      property.approvalStatus === 'PENDING' ? 'bg-amber-500' :
                      'bg-red-600'
                    }`}>
                      {property.approvalStatus === 'PENDING' && <Clock className="w-3 h-3" />}
                      {property.approvalStatus === 'APPROVED' && <CheckCircle className="w-3 h-3" />}
                      {property.approvalStatus === 'REJECTED' && <XCircle className="w-3 h-3" />}
                      {property.approvalStatus}
                    </span>

                    {property.type && (
                      <span className="bg-slate-950/80 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-xs">
                        {property.type}
                      </span>
                    )}
                  </div>

                  {/* Photo Count badge */}
                  {hasImages && (
                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {property.images.length} Photos
                    </div>
                  )}
                </div>

                {/* Card Details */}
                <div className="p-5 flex flex-col flex-grow space-y-3">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-1 group-hover:text-[#0F5132] dark:group-hover:text-emerald-400 transition-colors">
                      {property.title}
                    </h3>
                    
                    <div className="flex items-center text-slate-500 dark:text-slate-400 text-xs mt-1">
                      <MapPin className="w-3.5 h-3.5 mr-1 shrink-0 text-[#0F5132] dark:text-emerald-400" />
                      <span className="truncate">{property.location || 'Location not specified'}</span>
                    </div>
                  </div>

                  {/* Price Tag (Clean GH₵ without double dollar sign) */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Rent Rate</span>
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        GH₵ {Number(property.price || 0).toLocaleString()}
                        <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1">
                          /{property.pricePeriod ? property.pricePeriod.toLowerCase().replace('academic year', 'yr') : 'yr'}
                        </span>
                      </span>
                    </div>
                    {property.targetAudience && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100/60 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {property.targetAudience}
                      </span>
                    )}
                  </div>

                  {/* Landlord Snapshot */}
                  <div className="text-xs p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase">
                      <span>Landlord Contact</span>
                      <User className="w-3 h-3" />
                    </div>
                    <div className="font-extrabold text-slate-800 dark:text-slate-200 truncate">
                      {property.landlord ? `${property.landlord.firstName} ${property.landlord.lastName}` : 'Unknown Host'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {property.landlord?.email}
                    </div>
                  </div>

                  {/* Action Buttons Strip */}
                  <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    {/* Inspect Button */}
                    <button
                      onClick={() => {
                        setInspectingProperty(property);
                        setActivePhotoIndex(0);
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect
                    </button>

                    {/* View Public Listing */}
                    <Link
                      href={`/properties/${property.id}`}
                      target="_blank"
                      className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="View live public page"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>

                    <div className="flex-1 flex justify-end gap-1.5">
                      {property.approvalStatus !== 'APPROVED' && (
                        <button 
                          onClick={() => handleStatusUpdate(property.id, 'APPROVED')}
                          disabled={processingId === property.id}
                          className="px-3 py-2 bg-[#0F5132] hover:bg-[#146c43] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                        >
                          {processingId === property.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              Approve
                            </>
                          )}
                        </button>
                      )}

                      {property.approvalStatus !== 'REJECTED' && (
                        <button 
                          onClick={() => handleStatusUpdate(property.id, 'REJECTED')}
                          disabled={processingId === property.id}
                          className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          {processingId === property.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ─── DENSE TABLE VIEW ─────────────────────────────────────────── */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-[#0F5132] text-white shadow-xs">
                <tr>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Property</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Category</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Rent Rate</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Landlord</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white">Status</th>
                  <th className="px-6 py-4 font-black tracking-wider text-white text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredProperties.map((property: any) => (
                  <tr key={property.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                          {property.images && property.images.length > 0 ? (
                            <img 
                              src={getImageUrl(property.images[0])} 
                              alt={property.title} 
                              className="w-full h-full object-cover" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <Building className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-900 dark:text-white truncate max-w-xs">
                            {property.title}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#0F5132] shrink-0" />
                            <span>{property.location || 'Location not specified'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {property.type || 'Apartment'}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-black text-slate-900 dark:text-white text-sm">
                        GH₵ {Number(property.price || 0).toLocaleString()}
                        <span className="text-xs font-normal text-slate-400 ml-1">
                          /{property.pricePeriod ? property.pricePeriod.toLowerCase().replace('academic year', 'yr') : 'yr'}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {property.landlord ? `${property.landlord.firstName} ${property.landlord.lastName}` : 'Unknown'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {property.landlord?.email}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        property.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200' :
                        property.approvalStatus === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200' :
                        'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200'
                      }`}>
                        {property.approvalStatus === 'APPROVED' && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                        {property.approvalStatus === 'PENDING' && <Clock className="w-3 h-3 text-amber-600" />}
                        {property.approvalStatus === 'REJECTED' && <XCircle className="w-3 h-3 text-red-600" />}
                        {property.approvalStatus}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setInspectingProperty(property);
                            setActivePhotoIndex(0);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect
                        </button>

                        <Link
                          href={`/properties/${property.id}`}
                          target="_blank"
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Open public page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>

                        {property.approvalStatus !== 'APPROVED' && (
                          <button
                            onClick={() => handleStatusUpdate(property.id, 'APPROVED')}
                            disabled={processingId === property.id}
                            className="px-2.5 py-1.5 bg-[#0F5132] hover:bg-[#146c43] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                          >
                            {processingId === property.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Approve
                          </button>
                        )}

                        {property.approvalStatus !== 'REJECTED' && (
                          <button
                            onClick={() => handleStatusUpdate(property.id, 'REJECTED')}
                            disabled={processingId === property.id}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            {processingId === property.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL: DEEP PROPERTY INSPECTION DRAWER ─────────────────────── */}
      {inspectingProperty && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-emerald-900/30 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#0F5132] via-[#146c43] to-slate-900 text-white flex justify-between items-center relative overflow-hidden shadow-md">
              <div className="flex items-center gap-3.5 z-10">
                <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 border border-white/10 shadow-inner">
                  <Building className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Act 220 Listing Audit
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      inspectingProperty.approvalStatus === 'APPROVED' ? 'bg-emerald-600 text-white' :
                      inspectingProperty.approvalStatus === 'PENDING' ? 'bg-amber-500 text-white' :
                      'bg-red-600 text-white'
                    }`}>
                      {inspectingProperty.approvalStatus}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight mt-0.5 truncate max-w-lg">
                    {inspectingProperty.title}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 z-10">
                <Link
                  href={`/properties/${inspectingProperty.id}`}
                  target="_blank"
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Public Page
                </Link>
                <button
                  onClick={() => setInspectingProperty(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-slate-950/50">
              {/* Photo Inspection Gallery */}
              {inspectingProperty.images && inspectingProperty.images.length > 0 ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-[320px] flex items-center justify-center border border-slate-200 dark:border-slate-800">
                    <img
                      src={getImageUrl(inspectingProperty.images[activePhotoIndex] || inspectingProperty.images[0])}
                      alt={inspectingProperty.title}
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => setZoomedPhoto(getImageUrl(inspectingProperty.images[activePhotoIndex] || inspectingProperty.images[0]))}
                      className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/70 hover:bg-black/90 text-white rounded-xl text-xs font-bold backdrop-blur-md flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Fullscreen
                    </button>
                  </div>

                  {/* Thumbnail Row */}
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {inspectingProperty.images.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setActivePhotoIndex(idx)}
                        className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                          activePhotoIndex === idx 
                            ? 'border-[#0F5132] shadow-sm' 
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                  <Building className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-xs font-bold">No photos uploaded for this property.</p>
                </div>
              )}

              {/* Property Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Pricing & Lease</span>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    GH₵ {Number(inspectingProperty.price || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Period: <strong>{inspectingProperty.pricePeriod || 'Annual'}</strong>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Payment: <strong>{inspectingProperty.paymentSchedule || 'Full Upfront'}</strong>
                  </div>
                  {inspectingProperty.cautionDeposit ? (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                      Caution Deposit: GH₵ {Number(inspectingProperty.cautionDeposit).toLocaleString()}
                    </div>
                  ) : null}
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Location & Specs</span>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {inspectingProperty.location || 'N/A'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Category: <strong>{inspectingProperty.type || 'Apartment'}</strong>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Furnishing: <strong>{inspectingProperty.furnishing || 'Unfurnished'}</strong>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Target: <strong>{inspectingProperty.targetAudience || 'Open to All'}</strong>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Landlord Profile</span>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {inspectingProperty.landlord ? `${inspectingProperty.landlord.firstName} ${inspectingProperty.landlord.lastName}` : 'Unknown'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {inspectingProperty.landlord?.email}
                  </div>
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      <ShieldCheck className="w-3 h-3" />
                      Landlord Registered
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                  Property Description
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {inspectingProperty.description || 'No description provided.'}
                </p>
              </div>

              {/* Amenities */}
              {inspectingProperty.amenities && inspectingProperty.amenities.length > 0 && (
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Verified Amenities & Facilities
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {inspectingProperty.amenities.map((amenity: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        ✓ {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Approving publishes this listing directly to the public directory.
              </p>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {inspectingProperty.approvalStatus !== 'REJECTED' && (
                  <button
                    onClick={() => handleStatusUpdate(inspectingProperty.id, 'REJECTED')}
                    disabled={processingId === inspectingProperty.id}
                    className="px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5"
                  >
                    {processingId === inspectingProperty.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Reject Listing
                      </>
                    )}
                  </button>
                )}

                {inspectingProperty.approvalStatus !== 'APPROVED' && (
                  <button
                    onClick={() => handleStatusUpdate(inspectingProperty.id, 'APPROVED')}
                    disabled={processingId === inspectingProperty.id}
                    className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#146c43] text-white rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    {processingId === inspectingProperty.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Approve & Publish
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: FULLSCREEN LIGHTBOX ZOOM ────────────────────────────── */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in">
          <div className="relative max-w-5xl w-full flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-3 text-white">
              <h3 className="font-extrabold text-base">Property Photo Fullscreen</h3>
              <button
                onClick={() => setZoomedPhoto(null)}
                className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold backdrop-blur-md"
              >
                Close (Esc)
              </button>
            </div>
            <div className="border border-white/20 rounded-2xl overflow-hidden max-h-[85vh] bg-black">
              <img src={zoomedPhoto} alt="" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
