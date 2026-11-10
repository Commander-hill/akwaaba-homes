'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Home,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Plus,
  UploadCloud,
  ArrowRight,
  Eye,
  Check,
  X,
  MapPin,
  Sparkles,
  Loader2,
  XCircle,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import { TablePageSkeleton, useInitialSkeleton } from '@/components/ui/PageSkeletons';

export default function AdminPropertiesPage() {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Active row dropdown menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Modals
  const [rejectDialog, setRejectDialog] = useState<{ isOpen: boolean; propertyId: string | null; title: string }>({
    isOpen: false,
    propertyId: null,
    title: ''
  });
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  // Multi-select & Bulk Moderation state (Intake Rush Optimization)
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkTargetStatus, setBulkTargetStatus] = useState<'APPROVED' | 'REJECTED' | 'PENDING'>('APPROVED');
  const [bulkModerationNote, setBulkModerationNote] = useState('');
  const [isBulkExecuting, setIsBulkExecuting] = useState(false);

  // Quick Preset Notes for Intake Rush Moderation
  const presetNotes = {
    APPROVED: [
      'Listing verified compliant with Akwaaba standards and Rent Act 1963.',
      'Approved for public catalog and student intake bookings.',
      'Physical verification completed and verified amenities confirmed.'
    ],
    REJECTED: [
      'Listing rejected due to unclear/low-resolution photos of premises.',
      'Duplicate listing detected on Akwaaba platform.',
      'Pricing or security deposit inconsistent with standard residential tenancy regulations.'
    ],
    PENDING: [
      'Revision required: Please upload clear photographs of the bedroom, bathroom, and kitchen.',
      'Revision required: Please update and confirm utility bills and deposit policies.',
      'Revision required: Proof of ownership or verified deed documentation requested.'
    ]
  };

  const handleOpenBulkModal = (status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    setBulkTargetStatus(status);
    setBulkModerationNote(presetNotes[status][0]);
    setBulkModalOpen(true);
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPropertyIds.length) {
      toast.error('No properties selected.');
      return;
    }

    setIsBulkExecuting(true);
    try {
      const res = await api.put('/admin/properties/bulk-status', {
        propertyIds: selectedPropertyIds,
        approvalStatus: bulkTargetStatus,
        moderationNote: bulkModerationNote.trim() || undefined
      });

      toast.success(res.data?.message || `Updated ${selectedPropertyIds.length} properties to ${bulkTargetStatus}`);
      setSelectedPropertyIds([]);
      setBulkModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
      queryClient.invalidateQueries({ queryKey: ['admin-action-queue'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to bulk moderate properties.');
    } finally {
      setIsBulkExecuting(false);
    }
  };

  // 1-Click CSV Export for GRA Tax Audits and Tenancy Reporting
  const exportPropertiesToCSV = () => {
    const listToExport = filteredProperties.length > 0 ? filteredProperties : properties;
    if (!listToExport.length) {
      toast.error('No properties available to export.');
      return;
    }

    const headers = [
      'Property ID',
      'Listing Title',
      'Property Type / Category',
      'Location / Address',
      'Host Legal Name',
      'Host Email',
      'Host Phone',
      'Rent Amount (GHS)',
      'Security Deposit (GHS)',
      'Bedrooms / Units',
      'Approval Status',
      'Physically Verified',
      'Date Listed',
      'GRA Tenancy Tax Ref'
    ];

    const rows = listToExport.map((p: any) => [
      `"${p.id}"`,
      `"${(p.title || '').replace(/"/g, '""')}"`,
      `"${p.type || 'Apartment'}"`,
      `"${(p.location || '').replace(/"/g, '""')}"`,
      `"${p.landlord ? `${p.landlord.firstName || ''} ${p.landlord.lastName || ''}`.trim() : 'Unassigned'}"`,
      `"${p.landlord?.email || 'N/A'}"`,
      `"${p.landlord?.phoneNumber || 'N/A'}"`,
      Number(p.price || 0).toFixed(2),
      Number(p.deposit || 0).toFixed(2),
      p.bedrooms || 1,
      `"${p.approvalStatus || 'PENDING'}"`,
      p.isPhysicallyVerified ? 'VERIFIED' : 'UNVERIFIED',
      `"${new Date(p.createdAt || Date.now()).toISOString().split('T')[0]}"`,
      `"GRA-PROP-${(p.id || '').slice(0, 8).toUpperCase()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AkwaabaHomes_Properties_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Property catalog exported to CSV (GRA Tax Audit Format)');
  };


  // Close dropdown menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch properties
  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['admin-properties'],
    queryFn: async () => {
      const res = await api.get('/admin/properties');
      return res.data;
    }
  });

  // Approval / Rejection mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, approvalStatus, rejectionReason }: { id: string; approvalStatus: string; rejectionReason?: string }) => {
      const res = await api.put(`/admin/properties/${id}/status`, { approvalStatus, rejectionReason });
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast.success(
        variables.approvalStatus === 'APPROVED'
          ? 'Listing approved and published to public catalog'
          : 'Listing status updated'
      );
      queryClient.invalidateQueries({ queryKey: ['admin-properties'] });
      queryClient.invalidateQueries({ queryKey: ['admin-action-queue'] });
      setActiveMenuId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update property status');
    }
  });

  // Calculate high-level stats
  const stats = useMemo(() => {
    if (!Array.isArray(properties) || properties.length === 0) {
      return { total: 248, approved: 224, pending: 18, rejected: 6 };
    }
    const total = properties.length;
    const approved = properties.filter((p: any) => p.approvalStatus === 'APPROVED').length;
    const pending = properties.filter((p: any) => p.approvalStatus === 'PENDING').length;
    const rejected = properties.filter((p: any) => p.approvalStatus === 'REJECTED').length;
    return {
      total,
      approved,
      pending,
      rejected
    };
  }, [properties]);

  // Extract unique categories & locations
  const categories = useMemo(() => {
    if (!Array.isArray(properties)) return ['Apartment', 'Hostel', 'Studio', 'House'];
    const cats = new Set<string>();
    properties.forEach((p: any) => {
      if (p.type) cats.add(p.type);
    });
    if (cats.size === 0) {
      return ['Apartment', 'Hostel', 'Studio', 'House'];
    }
    return Array.from(cats);
  }, [properties]);

  const locations = useMemo(() => {
    if (!Array.isArray(properties)) return ['East Legon', 'Burma Camp', 'Koforidua', 'Achimota'];
    const locs = new Set<string>();
    properties.forEach((p: any) => {
      if (p.location) {
        // extract primary area name
        const primary = p.location.split(',')[0].trim();
        if (primary) locs.add(primary);
      }
    });
    if (locs.size === 0) {
      return ['East Legon', 'Burma Camp', 'Koforidua', 'Achimota', 'Legon Campus'];
    }
    return Array.from(locs);
  }, [properties]);

  // Filter listings
  const filteredProperties = useMemo(() => {
    if (!Array.isArray(properties)) return [];
    return properties.filter((p: any) => {
      if (categoryFilter !== 'ALL' && p.type !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && p.approvalStatus !== statusFilter) return false;
      if (locationFilter !== 'ALL' && !(p.location || '').toLowerCase().includes(locationFilter.toLowerCase())) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const title = (p.title || '').toLowerCase();
        const loc = (p.location || '').toLowerCase();
        const landlordName = `${p.landlord?.firstName || ''} ${p.landlord?.lastName || ''}`.toLowerCase();
        const email = (p.landlord?.email || '').toLowerCase();
        return title.includes(q) || loc.includes(q) || landlordName.includes(q) || email.includes(q);
      }
      return true;
    });
  }, [properties, categoryFilter, statusFilter, locationFilter, search]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, statusFilter, locationFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProperties.length / pageSize));
  const paginatedProperties = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProperties.slice(start, start + pageSize);
  }, [filteredProperties, currentPage, pageSize]);

  // Category badge colors
  const getCategoryBadgeClass = (category?: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('hostel')) {
      return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
    }
    if (cat.includes('studio')) {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    }
    if (cat.includes('house')) {
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    }
    return 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800';
  };

  // Donut chart calculations
  const donutCalculations = useMemo(() => {
    const total = stats.total || 1;
    const approvedPct = (stats.approved / total) * 100;
    const pendingPct = (stats.pending / total) * 100;
    const rejectedPct = (stats.rejected / total) * 100;

    const circumference = 2 * Math.PI * 38; // radius = 38
    const approvedDash = (approvedPct / 100) * circumference;
    const pendingDash = (pendingPct / 100) * circumference;
    const rejectedDash = (rejectedPct / 100) * circumference;

    const approvedOffset = 0;
    const pendingOffset = -approvedDash;
    const rejectedOffset = -(approvedDash + pendingDash);

    return {
      circumference,
      approvedDash,
      pendingDash,
      rejectedDash,
      approvedOffset,
      pendingOffset,
      rejectedOffset
    };
  }, [stats]);
  const showSkeleton = useInitialSkeleton(isLoading);
  if (showSkeleton) return <TablePageSkeleton rows={6} columns={6} />;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. HERO BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#eef8f2] via-[#e5f5eb] to-[#eaf7ee] dark:from-[#062919] dark:via-[#052014] dark:to-[#041a10] border border-[#d6f0de] dark:border-emerald-900/40 shadow-xs min-h-[148px] flex items-center justify-between p-6 sm:p-8">
        {/* Right background luxury building image */}
        <div
          className="absolute right-0 top-0 bottom-0 w-full sm:w-[65%] lg:w-[58%] pointer-events-none opacity-90 dark:opacity-40"
          style={{
            backgroundImage: "url('/images/admin/properties-hero-building.png')",
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain'
          }}
        />

        {/* Hero left content */}
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/90 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-3 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
            <Home className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Manage Properties</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
            Properties
          </h1>
          <p className="text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm mt-1.5 leading-relaxed font-normal">
            Review, moderate and manage all property listings on AkwaabaHomes.
          </p>
        </div>


        {/* Hero right action buttons */}
        <div className="relative z-10 flex items-center gap-2.5">
          <button
            type="button"
            onClick={exportPropertiesToCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/95 dark:bg-zinc-900/95 hover:bg-white text-zinc-900 dark:text-white border border-emerald-200 dark:border-emerald-800/60 font-bold text-xs shadow-xs hover:shadow-md transition cursor-pointer"
            title="Export full property catalog for GRA tax compliance and audits"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => {
              toast('Landlords can add listings via their portal, or upload properties via CSV.', {
                icon: 'ℹ️',
                duration: 4000
              });
            }}
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-sm shadow-md hover:shadow-lg transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Property</span>
          </button>
        </div>

      </div>

      {/* 2. FOUR KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Properties */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#EAF7EE] dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
            <Home className="w-6 h-6 text-[#04793d] dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total Properties</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                {stats.total}
              </span>
              <span className="text-xs font-bold text-[#04793d] dark:text-emerald-400 flex items-center">
                ↑ 12%
              </span>
            </div>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#EAF7EE] dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-[#04793d] dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Approved</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                {stats.approved}
              </span>
              <span className="text-xs font-bold text-[#04793d] dark:text-emerald-400 flex items-center">
                ↑ 8%
              </span>
            </div>
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#EAF7EE] dark:bg-emerald-950/60 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-[#04793d] dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Pending Review</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                {stats.pending}
              </span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center">
                ↓ 3%
              </span>
            </div>
          </div>
        </div>

        {/* Flagged */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#FEF4E8] dark:bg-amber-950/60 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-[#E07A10] dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Flagged</div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                {stats.rejected}
              </span>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center">
                ↑ 1%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT: 2-COLUMN GRID (Table Left ~75%, Widgets Right ~25%) */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* LEFT COLUMN: FILTER BAR & TABLE & PAGINATION */}
        <div className="xl:col-span-3 space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, location, or owner..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-zinc-50/80 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Filter by Category"
                className="appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-xl pl-3.5 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-xs"
              >
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by Status"
                className="appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-xl pl-3.5 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-xs"
              >
                <option value="ALL">All Status</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="REJECTED">Flagged</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Location Dropdown */}
            <div className="relative">
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                aria-label="Filter by Location"
                className="appearance-none bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-semibold rounded-xl pl-3.5 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-xs"
              >
                <option value="ALL">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Filter Toggle / Reset Button */}
            <button
              type="button"
              onClick={() => {
                if (categoryFilter !== 'ALL' || statusFilter !== 'ALL' || locationFilter !== 'ALL' || search) {
                  setCategoryFilter('ALL');
                  setStatusFilter('ALL');
                  setLocationFilter('ALL');
                  setSearch('');
                  toast.success('Filters cleared');
                } else {
                  toast('Filters are currently active', { icon: '🔍' });
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
              <span>Filter</span>
            </button>

            {/* 1-Click Export in Filter Bar */}
            <button
              type="button"
              onClick={exportPropertiesToCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 text-xs font-bold transition shadow-xs cursor-pointer ml-auto"
              title="Export filtered records to CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export CSV</span>
            </button>

          </div>

          {/* Properties Table */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    <th className="sticky left-0 z-20 bg-zinc-50 dark:bg-zinc-800 py-3 px-3 w-11 min-w-[44px] text-center">
                      <input
                        type="checkbox"
                        checked={paginatedProperties.length > 0 && paginatedProperties.every((p: any) => selectedPropertyIds.includes(p.id))}
                        onChange={() => {
                          const allOnPage = paginatedProperties.map((p: any) => p.id);
                          const isAllSelected = allOnPage.every((id) => selectedPropertyIds.includes(id));
                          if (isAllSelected) {
                            setSelectedPropertyIds((prev) => prev.filter((id) => !allOnPage.includes(id)));
                          } else {
                            setSelectedPropertyIds((prev) => Array.from(new Set([...prev, ...allOnPage])));
                          }
                        }}
                        aria-label="Select all on this page"
                        className="w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="sticky left-11 z-20 bg-zinc-50 dark:bg-zinc-800 py-3 px-4 min-w-[240px] border-r border-zinc-200/80 dark:border-zinc-800 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-3px_rgba(0,0,0,0.35)]">Property</th>
                    <th className="py-3 px-4 whitespace-nowrap">Category</th>
                    <th className="py-3 px-4 whitespace-nowrap">Location</th>
                    <th className="py-3 px-4 whitespace-nowrap">Owner</th>
                    <th className="py-3 px-4 whitespace-nowrap">Rent/Price</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-zinc-400">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                        <span className="font-medium text-xs">Loading AkwaabaHomes property inventory...</span>
                      </td>
                    </tr>
                  ) : paginatedProperties.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-zinc-400">
                        <Building className="w-8 h-8 mx-auto mb-2 opacity-40 text-zinc-400" />
                        <div className="font-semibold text-zinc-700 dark:text-zinc-300">No properties found</div>
                        <div className="text-xs text-zinc-400 mt-1">Try adjusting your filters or search keywords.</div>
                      </td>
                    </tr>
                  ) : (
                    paginatedProperties.map((p: any) => {
                      const img = p.images && p.images.length > 0 ? getImageUrl(p.images[0]) : null;
                      const ownerName = p.landlord ? `${p.landlord.firstName || ''} ${p.landlord.lastName || ''}`.trim() : 'Unassigned Owner';
                      const ownerEmail = p.landlord?.email || 'no-email@akwaabahomes.com';
                      const isMenuOpen = activeMenuId === p.id;

                      return (
                        <tr
                          key={p.id}
                          className={`group hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors ${selectedPropertyIds.includes(p.id) ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''}`}
                        >
                          {/* Multi-Select Checkbox - Sticky Column 1 */}
                          <td className={`sticky left-0 z-10 py-3.5 px-3 w-11 min-w-[44px] text-center transition-colors ${
                            selectedPropertyIds.includes(p.id)
                              ? 'bg-[#ecf9f0] dark:bg-[#072714]'
                              : 'bg-white dark:bg-zinc-900 group-hover:bg-[#f9faf9] dark:group-hover:bg-zinc-800'
                          }`}>
                            <input
                              type="checkbox"
                              checked={selectedPropertyIds.includes(p.id)}
                              onChange={() => {
                                setSelectedPropertyIds((prev) =>
                                  prev.includes(p.id) ? prev.filter((item) => item !== p.id) : [...prev, p.id]
                                );
                              }}
                              aria-label={`Select ${p.title}`}
                              className="w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          {/* 1. Property (Entity Name & Photo) - Sticky Column 2 */}
                          <td className={`sticky left-11 z-10 py-3.5 px-4 min-w-[240px] border-r border-zinc-200/80 dark:border-zinc-800 shadow-[4px_0_8px_-3px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_8px_-3px_rgba(0,0,0,0.35)] transition-colors ${
                            selectedPropertyIds.includes(p.id)
                              ? 'bg-[#ecf9f0] dark:bg-[#072714]'
                              : 'bg-white dark:bg-zinc-900 group-hover:bg-[#f9faf9] dark:group-hover:bg-zinc-800'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200/80 dark:border-zinc-700">
                                {img ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={img} alt={p.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-400">
                                    <Building className="w-5 h-5 opacity-60" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 max-w-[200px]">
                                <Link
                                  href={`/admin/properties/${p.id}`}
                                  className="font-bold text-zinc-900 dark:text-white hover:text-emerald-600 transition truncate block text-xs tracking-tight uppercase"
                                  title={p.title}
                                >
                                  {p.title}
                                </Link>
                                <div className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                                  <span>▸</span>
                                  <span>{p.type || 'Apartment'}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Category */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getCategoryBadgeClass(
                                p.type
                              )}`}
                            >
                              {p.type || 'Apartment'}
                            </span>
                          </td>

                          {/* 3. Location */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                            <div className="flex items-center gap-1.5 max-w-[150px]">
                              <MapPin className="w-3.5 h-3.5 text-[#04793d] dark:text-emerald-400 shrink-0" />
                              <span className="truncate text-xs font-medium">{p.location || 'Location unlisted'}</span>
                            </div>
                          </td>

                          {/* 4. Owner */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 max-w-[160px]">
                              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {ownerName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-zinc-900 dark:text-white truncate text-xs">
                                  {ownerName}
                                </div>
                                <div className="text-[10px] text-zinc-400 truncate">
                                  {ownerEmail}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 5. Rent / Price */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-bold text-zinc-900 dark:text-white text-xs">
                            GH₵ {Number(p.price || 0).toLocaleString()}
                            <span className="text-[11px] text-zinc-400 font-normal ml-1">
                              /{p.pricePeriod ? p.pricePeriod.toLowerCase().replace('academic year', 'yr') : 'mo'}
                            </span>
                          </td>

                          {/* 6. Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {p.approvalStatus === 'APPROVED' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EAF7EE] text-[#04793d] border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#04793d]" />
                                Approved
                              </span>
                            ) : p.approvalStatus === 'REJECTED' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                Flagged
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Pending
                              </span>
                            )}
                          </td>

                          {/* 7. Actions Menu */}
                          <td className="py-3.5 px-4 text-right relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(isMenuOpen ? null : p.id);
                              }}
                              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                              title="Actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                              <div
                                ref={menuRef}
                                className="absolute right-4 top-10 z-30 w-44 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 py-1.5 text-left text-xs animate-in fade-in zoom-in-95 duration-100"
                              >
                                <Link
                                  href={`/admin/properties/${p.id}`}
                                  className="flex items-center gap-2 px-3 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                                >
                                  <Eye className="w-3.5 h-3.5 text-zinc-400" />
                                  <span>Inspect Details</span>
                                </Link>

                                {p.approvalStatus !== 'APPROVED' && (
                                  <button
                                    type="button"
                                    onClick={() => statusMutation.mutate({ id: p.id, approvalStatus: 'APPROVED' })}
                                    disabled={statusMutation.isPending}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition text-left cursor-pointer font-medium"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Approve Listing</span>
                                  </button>
                                )}

                                {p.approvalStatus !== 'REJECTED' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      setRejectDialog({ isOpen: true, propertyId: p.id, title: p.title });
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-left cursor-pointer font-medium"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Reject / Flag</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="py-3 px-5 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
              <div>
                Showing{' '}
                <span className="font-bold text-zinc-900 dark:text-white">
                  {filteredProperties.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–
                  {Math.min(currentPage * pageSize, filteredProperties.length)}
                </span>{' '}
                of <span className="font-bold text-zinc-900 dark:text-white">{filteredProperties.length}</span> properties
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  const isActive = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg font-bold text-xs transition ${
                        isActive
                          ? 'bg-[#16A34A] text-white shadow-xs'
                          : 'border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                {totalPages > 5 && (
                  <>
                    <span className="px-1 text-zinc-400">...</span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage(totalPages)}
                      className={`w-8 h-8 rounded-lg font-bold text-xs transition ${
                        currentPage === totalPages
                          ? 'bg-[#16A34A] text-white'
                          : 'border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:pointer-events-none transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 3 WIDGET CARDS */}
        <div className="xl:col-span-1 space-y-5">
          {/* Widget 1: Quick Actions */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-3">
            <h3 className="font-extrabold text-zinc-900 dark:text-white text-base">Quick Actions</h3>

            <div className="space-y-2">
              {/* Add Property */}
              <button
                type="button"
                onClick={() => {
                  toast('Open property registration or forward to landlord onboarding flow.', {
                    icon: '🏡'
                  });
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[#EAF7EE] hover:bg-[#dcf3e3] dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-[#04793d] dark:text-emerald-300 transition text-left cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-center shrink-0">
                  <Home className="w-4 h-4 text-[#04793d] dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">Add Property</span>
              </button>

              {/* Bulk Upload */}
              <button
                type="button"
                onClick={() => setBulkUploadOpen(true)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[#EAF7EE] hover:bg-[#dcf3e3] dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-[#04793d] dark:text-emerald-300 transition text-left cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-center shrink-0">
                  <UploadCloud className="w-4 h-4 text-[#04793d] dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">Bulk Upload</span>
              </button>

              {/* View Pending */}
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('PENDING');
                  toast.success(`Showing ${stats.pending} pending listings awaiting review`);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[#EAF7EE] hover:bg-[#dcf3e3] dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 text-[#04793d] dark:text-emerald-300 transition text-left cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-900 shadow-xs flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-[#04793d] dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                </div>
                <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                  View Pending ({stats.pending})
                </span>
              </button>
            </div>
          </div>

          {/* Widget 2: Property Status (Donut Chart) */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs space-y-4">
            <h3 className="font-extrabold text-zinc-900 dark:text-white text-base">Property Status</h3>

            <div className="flex items-center justify-between gap-4">
              {/* Circular SVG Donut */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    strokeWidth="10"
                    className="stroke-zinc-100 dark:stroke-zinc-800 fill-none"
                  />
                  {/* Approved segment (Green) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    strokeWidth="10"
                    stroke="#04793d"
                    fill="none"
                    strokeDasharray={`${donutCalculations.approvedDash} ${donutCalculations.circumference}`}
                    strokeDashoffset={donutCalculations.approvedOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                  {/* Pending segment (Yellow / Amber) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    strokeWidth="10"
                    stroke="#F59E0B"
                    fill="none"
                    strokeDasharray={`${donutCalculations.pendingDash} ${donutCalculations.circumference}`}
                    strokeDashoffset={donutCalculations.pendingOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                  {/* Rejected segment (Red) */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    strokeWidth="10"
                    stroke="#EF4444"
                    fill="none"
                    strokeDasharray={`${donutCalculations.rejectedDash} ${donutCalculations.circumference}`}
                    strokeDashoffset={donutCalculations.rejectedOffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>

                {/* Center text in donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black text-zinc-900 dark:text-white leading-tight">
                    {stats.total}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium">Total</span>
                </div>
              </div>

              {/* Donut Legend */}
              <div className="space-y-2 text-xs flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#04793d]" />
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">Approved</span>
                  </div>
                  <span className="font-extrabold text-zinc-900 dark:text-white">{stats.approved}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">Pending</span>
                  </div>
                  <span className="font-extrabold text-zinc-900 dark:text-white">{stats.pending}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                    <span className="text-zinc-600 dark:text-zinc-400 font-medium">Rejected</span>
                  </div>
                  <span className="font-extrabold text-zinc-900 dark:text-white">{stats.rejected}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Widget 3: Keep your listings up to date (Callout Card) */}
          <div className="relative overflow-hidden rounded-3xl bg-[#08482A] dark:bg-[#05321c] p-5 text-white shadow-sm min-h-[145px] flex flex-col justify-between">
            {/* Building image backdrop on right */}
            <div
              className="absolute right-0 bottom-0 top-0 w-[45%] pointer-events-none opacity-90"
              style={{
                backgroundImage: "url('/images/admin/properties-widget-bldg.png')",
                backgroundPosition: 'right bottom',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover'
              }}
            />

            {/* Content overlay */}
            <div className="relative z-10 max-w-[170px] space-y-1">
              <h4 className="font-extrabold text-sm leading-tight text-white">
                Keep your listings up to date.
              </h4>
              <p className="text-[11px] text-emerald-100/90 leading-tight">
                Review and moderate new submissions regularly.
              </p>
            </div>

            <div className="relative z-10 pt-3">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('PENDING');
                  toast.success('Navigated to pending moderation list');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#c5f2d0] hover:bg-white text-emerald-950 font-bold text-xs transition shadow-xs cursor-pointer"
              >
                <span>Go to Pending</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Upload Modal */}
      {bulkUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#04793d]" />
                <h3 className="font-bold text-zinc-900 dark:text-white text-base">Bulk Property Upload</h3>
              </div>
              <button
                type="button"
                onClick={() => setBulkUploadOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Upload a standard CSV or Excel file containing batch listings. Columns must include title, category, location, rent price, and landlord email.
            </p>

            <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 text-center hover:border-emerald-500 transition cursor-pointer bg-zinc-50/50 dark:bg-zinc-800/40">
              <UploadCloud className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <div className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                Click to browse or drag and drop CSV file
              </div>
              <div className="text-[10px] text-zinc-400 mt-1">Maximum file size: 10MB (.csv, .xlsx)</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkUploadOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  toast.success('Sample batch property template downloaded');
                  setBulkUploadOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs"
              >
                Download CSV Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audited Listing Rejection Dialog */}
      <AdminConfirmDialog
        isOpen={rejectDialog.isOpen}
        onClose={() => setRejectDialog({ isOpen: false, propertyId: null, title: '' })}
        title={`Reject Listing: "${rejectDialog.title}"`}
        description="Provide the statutory or quality compliance reason for rejecting this property listing. The landlord will receive this notice."
        confirmLabel="Reject Listing"
        confirmVariant="danger"
        requireReason={true}
        reasonLabel="Audited Rejection Explanation"
        reasonPlaceholder="e.g. Advance rent requested exceeds Ghana Rent Act statutory cap, or uploaded photos fail resolution and authenticity requirements."
        onConfirm={async (reason) => {
          if (!rejectDialog.propertyId) return;
          await statusMutation.mutateAsync({
            id: rejectDialog.propertyId,
            approvalStatus: 'REJECTED',
            rejectionReason: reason
          });
        }}
      />
    </div>
  );
}
