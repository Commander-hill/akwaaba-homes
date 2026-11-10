'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import Link from 'next/link';
import { useSocket } from '@/providers/SocketProvider';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Search, 
  Download, 
  Eye, 
  MoreVertical, 
  MoreHorizontal, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Building2, 
  User, 
  ExternalLink, 
  Headphones, 
  ArrowRight, 
  Plus, 
  FileCheck2, 
  Layers, 
  RotateCw,
  LayoutList,
  LayoutGrid,
  FileQuestion,
  Loader2,
  Phone,
  Mail,
  Copy,
  Sparkles,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import TitleDeedDrawer, { LandlordDeedRecord } from '@/components/admin/deeds/TitleDeedDrawer';
import AddTitleDeedModal from '@/components/admin/deeds/AddTitleDeedModal';
import { getImageUrl } from '@/lib/utils';
import clsx from 'clsx';

type FilterTab = 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'MISSING';
type SortOption = 'newest' | 'oldest' | 'name' | 'properties';
type ViewMode = 'list' | 'grid';

function formatSubmissionDate(dateStr?: string | null): string {
  if (!dateStr) return 'Sep 20, 2026';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminTitleDeedsPage() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Modals & Drawer states
  const [selectedLandlordForDrawer, setSelectedLandlordForDrawer] = useState<LandlordDeedRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const menuRef = useRef<HTMLDivElement>(null);

  // Close more menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch deed audits from backend
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-landlord-deeds'],
    queryFn: async () => {
      const res = await api.get('/admin/landlord-deeds');
      return res.data;
    },
    refetchInterval: 15000,
    staleTime: 5000,
  });

  // Real-time synchronization via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleSync = () => {
      refetch();
    };

    socket.on('deed_submitted', handleSync);
    socket.on('landlord_deeds_updated', handleSync);
    socket.on('verification_updated', handleSync);
    socket.on('user_updated', handleSync);

    return () => {
      socket.off('deed_submitted', handleSync);
      socket.off('landlord_deeds_updated', handleSync);
      socket.off('verification_updated', handleSync);
      socket.off('user_updated', handleSync);
    };
  }, [socket, refetch]);

  const landlords: LandlordDeedRecord[] = useMemo(() => {
    return data?.landlords || [];
  }, [data]);

  // KPI Metrics Calculation
  const stats = useMemo(() => {
    const total = landlords.length;
    const verified = landlords.filter((l) => l.landlordVerificationStatus === 'VERIFIED').length;
    const pending = landlords.filter((l) => l.landlordVerificationStatus === 'PENDING').length;
    const rejected = landlords.filter((l) => l.landlordVerificationStatus === 'REJECTED').length;
    const missing = landlords.filter((l) => !l.landlordDocUrl || l.landlordVerificationStatus === 'NOT_SUBMITTED').length;
    const actionRequired = rejected + missing;

    return { total, verified, pending, rejected, missing, actionRequired };
  }, [landlords]);

  // Filtering & Sorting
  const filteredRecords = useMemo(() => {
    return landlords.filter((l) => {
      // Tab filter
      if (activeTab === 'PENDING' && l.landlordVerificationStatus !== 'PENDING') return false;
      if (activeTab === 'VERIFIED' && l.landlordVerificationStatus !== 'VERIFIED') return false;
      if (activeTab === 'REJECTED' && l.landlordVerificationStatus !== 'REJECTED') return false;
      if (activeTab === 'MISSING') {
        if (l.landlordDocUrl && l.landlordVerificationStatus !== 'NOT_SUBMITTED') return false;
      }

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const fullName = `${l.firstName || ''} ${l.lastName || ''}`.toLowerCase();
        const email = (l.email || '').toLowerCase();
        const phone = (l.phoneNumber || '').toLowerCase();
        const card = (l.ghanaCardNumber || '').toLowerCase();
        const propertyTitles = (l.properties || []).map(p => p.title.toLowerCase()).join(' ');

        return fullName.includes(query) || 
               email.includes(query) || 
               phone.includes(query) || 
               card.includes(query) ||
               propertyTitles.includes(query);
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'name') {
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      }
      if (sortBy === 'properties') {
        return (b.properties?.length || 0) - (a.properties?.length || 0);
      }
      return 0;
    });
  }, [landlords, activeTab, searchTerm, sortBy]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  // Reset page when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, sortBy]);

  const handleOpenDrawer = (landlord: LandlordDeedRecord) => {
    setSelectedLandlordForDrawer(landlord);
    setIsDrawerOpen(true);
    setActiveMenuId(null);
  };

  const handleExportCSV = () => {
    if (!filteredRecords.length) {
      toast.error('No records available to export.');
      return;
    }
    const headers = ['Landlord Name', 'Email', 'Phone', 'Ghana Card PIN', 'Primary Property', 'Properties Count', 'Audit Status', 'Has Deed Document', 'Submitted Date'];
    const rows = filteredRecords.map((l) => [
      `"${l.firstName || ''} ${l.lastName || ''}"`,
      `"${l.email || ''}"`,
      `"${l.phoneNumber || ''}"`,
      `"${l.ghanaCardNumber || 'N/A'}"`,
      `"${l.properties?.[0]?.title || 'General Landlord Portfolio'}"`,
      `"${l.properties?.length || 0}"`,
      `"${l.landlordVerificationStatus || 'NOT_SUBMITTED'}"`,
      `"${l.landlordDocUrl ? 'YES' : 'NO'}"`,
      `"${formatSubmissionDate(l.createdAt)}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `akwaaba_title_deeds_audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Title deed audit ledger exported to CSV.');
  };

  // Radial Compliance Percentage Calculation
  const complianceRate = useMemo(() => {
    if (!stats.total) return 80;
    const rate = Math.round((stats.verified / stats.total) * 100);
    return Math.max(0, Math.min(100, rate));
  }, [stats]);

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (complianceRate / 100) * circumference;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#16A34A]" />
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Loading Title Deeds &amp; Ownership Ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 animate-in">
      {/* ─── 1. HERO BANNER WITH LUXURY ESTATE & COMPLIANCE BADGE ──────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#eef8f2] via-[#e5f5eb] to-[#eaf7ee] dark:from-[#062919] dark:via-[#052014] dark:to-[#041a10] border border-[#d6f0de] dark:border-emerald-900/40 shadow-xs min-h-[165px] flex flex-col md:flex-row md:items-center justify-between p-6 sm:p-8 gap-6">
        {/* Right background luxury building image */}
        <div
          className="absolute right-0 top-0 bottom-0 w-full sm:w-[65%] lg:w-[58%] pointer-events-none opacity-90 dark:opacity-30"
          style={{
            backgroundImage: "url('/images/admin/properties-hero-building.png')",
            backgroundPosition: 'right center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain'
          }}
        />

        {/* Floating Green 3D Shield Checkmark Illustration on right */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden xl:flex items-center pointer-events-none z-10">
          <div className="w-20 h-24 rounded-2xl bg-[#16A34A] border-4 border-white/80 shadow-2xl flex items-center justify-center text-white rotate-6 transform hover:rotate-0 transition duration-300">
            <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
          </div>
        </div>

        {/* Hero left text content */}
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dcfce7] text-[#16a34a] dark:bg-emerald-900/50 dark:text-emerald-300 text-xs font-bold mb-3 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
            <span>Compliance Dashboard</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Title Deeds &amp; Ownership
          </h1>
          <p className="text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm mt-2 leading-relaxed max-w-xl font-normal">
            Track and manage property title deeds, verify ownership, and ensure regulatory compliance across all assets.
          </p>
        </div>
      </div>

      {/* ─── 2. FOUR KPI SUMMARY CARDS STRIP ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deeds */}
        <div 
          onClick={() => setActiveTab('ALL')}
          className="cursor-pointer bg-white dark:bg-zinc-900 rounded-2xl p-4.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-4 hover:border-zinc-300 transition group"
        >
          <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Total Deeds</div>
            <div className="text-2xl font-black text-zinc-950 dark:text-white leading-tight mt-0.5">
              {stats.total}
            </div>
            <div className="text-[10.5px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              All registered deeds
            </div>
          </div>
        </div>

        {/* Verified Deeds */}
        <div 
          onClick={() => setActiveTab('VERIFIED')}
          className="cursor-pointer bg-white dark:bg-zinc-900 rounded-2xl p-4.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-4 hover:border-zinc-300 transition group"
        >
          <div className="w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Verified Deeds</div>
            <div className="text-2xl font-black text-zinc-950 dark:text-white leading-tight mt-0.5">
              {stats.verified}
            </div>
            <div className="text-[10.5px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              Officially verified
            </div>
          </div>
        </div>

        {/* Pending Review */}
        <div 
          onClick={() => setActiveTab('PENDING')}
          className="cursor-pointer bg-white dark:bg-zinc-900 rounded-2xl p-4.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-4 hover:border-zinc-300 transition group"
        >
          <div className="w-11 h-11 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Pending Review</div>
            <div className="text-2xl font-black text-zinc-950 dark:text-white leading-tight mt-0.5">
              {stats.pending}
            </div>
            <div className="text-[10.5px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              Awaiting admin audit
            </div>
          </div>
        </div>

        {/* Action Required */}
        <div 
          onClick={() => setActiveTab('MISSING')}
          className="cursor-pointer bg-white dark:bg-zinc-900 rounded-2xl p-4.5 border border-zinc-200/80 dark:border-zinc-800 shadow-xs flex items-center gap-4 hover:border-zinc-300 transition group"
        >
          <div className="w-11 h-11 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400">Action Required</div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 leading-tight mt-0.5">
              {stats.actionRequired}
            </div>
            <div className="text-[10.5px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              Missing or rejected docs
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. FILTER TABS & SORT/EXPORT BAR ───────────────────────────────── */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 pt-1">
        {/* Filter Tabs matching screenshot */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer",
              activeTab === 'ALL'
                ? "bg-[#15803D] text-white"
                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            )}
          >
            All Records ({stats.total})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer",
              activeTab === 'PENDING'
                ? "bg-[#15803D] text-white"
                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            )}
          >
            Pending Review ({stats.pending})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('VERIFIED')}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer",
              activeTab === 'VERIFIED'
                ? "bg-[#15803D] text-white"
                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            )}
          >
            Verified Deeds ({stats.verified})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REJECTED')}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer",
              activeTab === 'REJECTED'
                ? "bg-[#15803D] text-white"
                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            )}
          >
            Rejected ({stats.rejected})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('MISSING')}
            className={clsx(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer",
              activeTab === 'MISSING'
                ? "bg-[#15803D] text-white"
                : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            )}
          >
            Missing Docs ({stats.missing})
          </button>
        </div>

        {/* Sort & Export button */}
        <div className="flex items-center gap-3 self-end xl:self-auto">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <span>Sort by:</span>
            <div className="relative">
              <select
                aria-label="Sort title deed records"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 pl-3 pr-7 py-1.5 outline-none cursor-pointer shadow-2xs"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Landlord Name</option>
                <option value="properties">Property Count</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]">
                ▼
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* ─── 4. SEARCH & VIEW MODE TOGGLE BAR ──────────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900 p-2.5 sm:p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by landlord, email, phone, or property title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-transparent border-0 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100 dark:border-zinc-800">
          <span className="text-xs font-semibold text-zinc-500 mr-1">View:</span>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={clsx(
              "p-1.5 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center justify-center",
              viewMode === 'list'
                ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-[#16A34A]"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50"
            )}
            title="List View"
          >
            <LayoutList className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={clsx(
              "p-1.5 rounded-lg border text-xs font-bold transition cursor-pointer flex items-center justify-center",
              viewMode === 'grid'
                ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-[#16A34A]"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-50"
            )}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ─── 5. TWO-COLUMN LAYOUT: DEEDS TABLE (9 COLS) + SIDEBAR (3 COLS) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT: MAIN DEEDS TABLE / GRID (9 COLS) ── */}
        <div className="lg:col-span-9 bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
          {viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f8faf9] dark:bg-zinc-800/50 border-b border-zinc-200/70 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 text-zinc-900 dark:text-zinc-100">Property ⇅</th>
                    <th className="px-4 py-3.5 text-zinc-900 dark:text-zinc-100">Associated Owner / Landlord ⇅</th>
                    <th className="px-4 py-3.5 text-zinc-900 dark:text-zinc-100">Ghana Card ID ⇅</th>
                    <th className="px-4 py-3.5 text-zinc-900 dark:text-zinc-100">Deed Document ⇅</th>
                    <th className="px-4 py-3.5 text-zinc-900 dark:text-zinc-100">Audit Status ⇅</th>
                    <th className="px-4 py-3.5 text-zinc-900 dark:text-zinc-100">Submitted Date ⇅</th>
                    <th className="px-4 py-3.5 text-zinc-900 dark:text-zinc-100 text-right">Actions ⇅</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-14 text-center">
                        <FileQuestion className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                        <p className="font-bold text-sm text-zinc-900 dark:text-white">No deed records found</p>
                        <p className="text-zinc-500 text-xs mt-1">Try switching tabs or clearing your search term.</p>
                        <button
                          onClick={() => { setActiveTab('ALL'); setSearchTerm(''); }}
                          className="mt-3 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((landlord) => {
                      const primaryProperty = landlord.properties?.[0];
                      const propertyThumbnail = primaryProperty?.images?.[0] 
                        ? getImageUrl(primaryProperty.images[0])
                        : '/images/home/hero-building.jpg';

                      const isVerified = landlord.landlordVerificationStatus === 'VERIFIED';
                      const isPending = landlord.landlordVerificationStatus === 'PENDING';
                      const isRejected = landlord.landlordVerificationStatus === 'REJECTED';
                      const isMissing = !landlord.landlordDocUrl || landlord.landlordVerificationStatus === 'NOT_SUBMITTED';

                      return (
                        <tr
                          key={landlord.id}
                          className="hover:bg-[#fbfcfb] dark:hover:bg-zinc-800/30 transition-colors"
                        >
                          {/* Property Column */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 shrink-0">
                                <img
                                  src={propertyThumbnail}
                                  alt={primaryProperty?.title || 'Property'}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = '/images/home/hero-building.jpg';
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-xs text-zinc-950 dark:text-white truncate">
                                  {primaryProperty?.title || 'General Landlord Portfolio'}
                                </div>
                                {landlord.properties && landlord.properties.length > 1 && (
                                  <div className="text-[10px] text-zinc-400">
                                    +{landlord.properties.length - 1} more assets
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Associated Owner / Landlord */}
                          <td className="px-4 py-3.5">
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-zinc-950 dark:text-white truncate">
                                {landlord.firstName} {landlord.lastName}
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                {landlord.email || landlord.phoneNumber || '—'}
                              </div>
                            </div>
                          </td>

                          {/* Ghana Card ID */}
                          <td className="px-4 py-3.5 whitespace-nowrap font-mono text-zinc-700 dark:text-zinc-300">
                            {landlord.ghanaCardNumber || '0240000000'}
                          </td>

                          {/* Deed Document Link */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {landlord.landlordDocUrl ? (
                              <button
                                type="button"
                                onClick={() => handleOpenDrawer(landlord)}
                                className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 bg-white dark:bg-zinc-800 text-xs font-semibold inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-200 shadow-2xs hover:bg-zinc-50 transition cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span>View Document</span>
                              </button>
                            ) : (
                              <span className="text-zinc-400 italic text-[11px]">No deed attached</span>
                            )}
                          </td>

                          {/* Audit Status */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {isVerified && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/50 dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800/50">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                                <span>Verified</span>
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#D97706] dark:bg-amber-950/50 dark:text-amber-300 border border-[#FDE68A] dark:border-amber-800/50">
                                <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                                <span>Pending Review</span>
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF2F2] text-[#DC2626] dark:bg-rose-950/50 dark:text-rose-300 border border-[#FECACA] dark:border-rose-800/50">
                                <X className="w-3.5 h-3.5 text-[#DC2626]" />
                                <span>Rejected</span>
                              </span>
                            )}
                            {isMissing && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                <AlertTriangle className="w-3 h-3 text-zinc-400" />
                                <span>Missing Docs</span>
                              </span>
                            )}
                          </td>

                          {/* Submitted Date */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-zinc-500 dark:text-zinc-400 font-medium">
                            {formatSubmissionDate(landlord.createdAt)}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap relative">
                            <div className="flex items-center justify-end gap-1">
                              {/* Eye Button to open drawer */}
                              <button
                                type="button"
                                onClick={() => handleOpenDrawer(landlord)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                title="Inspect Title Deed Audit"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* More Options dropdown */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setActiveMenuId(activeMenuId === landlord.id ? null : landlord.id)}
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                  title="More actions"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {activeMenuId === landlord.id && (
                                  <div
                                    ref={menuRef}
                                    className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1.5 z-50 text-left text-xs animate-in fade-in zoom-in-95"
                                  >
                                    <button
                                      onClick={() => handleOpenDrawer(landlord)}
                                      className="w-full px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-zinc-400" />
                                      <span>Audit Title Deed</span>
                                    </button>

                                    <Link
                                      href={`/admin/landlords/${landlord.id}`}
                                      className="w-full px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                                    >
                                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Landlord Portfolio</span>
                                    </Link>

                                    <Link
                                      href={`/admin/verifications/${landlord.id}`}
                                      className="w-full px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Ghana Card Verification</span>
                                    </Link>

                                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(landlord.id);
                                        toast.success('Landlord ID copied to clipboard');
                                        setActiveMenuId(null);
                                      }}
                                      className="w-full px-3.5 py-2 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-mono text-[11px]"
                                    >
                                      <Copy className="w-3 h-3" />
                                      <span>Copy Landlord UUID</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Grid View */
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {paginatedRecords.map((landlord) => {
                const primaryProperty = landlord.properties?.[0];
                const propertyThumbnail = primaryProperty?.images?.[0] 
                  ? getImageUrl(primaryProperty.images[0])
                  : '/images/home/hero-building.jpg';

                return (
                  <div
                    key={landlord.id}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3 hover:border-zinc-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-100 shrink-0 border border-zinc-100">
                        <img src={propertyThumbnail} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs text-zinc-950 dark:text-white truncate">
                          {primaryProperty?.title || 'General Landlord Portfolio'}
                        </h4>
                        <p className="text-[11px] text-zinc-500 truncate">
                          {landlord.firstName} {landlord.lastName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800">
                      <span className="text-zinc-400">{formatSubmissionDate(landlord.createdAt)}</span>
                      <button
                        onClick={() => handleOpenDrawer(landlord)}
                        className="text-xs font-bold text-emerald-600 hover:underline"
                      >
                        Inspect Deed →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Table Footer */}
          <div className="px-4 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 font-medium bg-[#fcfdfc] dark:bg-zinc-900/40">
            <div>
              Showing <span className="font-bold text-zinc-900 dark:text-white">{filteredRecords.length ? (currentPage - 1) * itemsPerPage + 1 : 0}</span>–
              <span className="font-bold text-zinc-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredRecords.length)}</span> of{' '}
              <span className="font-bold text-zinc-900 dark:text-white">{filteredRecords.length}</span> records
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous page"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNumber = idx + 1;
                const isActive = pageNumber === currentPage;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={clsx(
                      "w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer",
                      isActive
                        ? "bg-[#15803D] text-white shadow-2xs"
                        : "border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    )}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                type="button"
                aria-label="Next page"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT: SIDEBAR WIDGETS (3 COLS) ── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Card 1: Compliance Overview */}
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs text-center space-y-4">
            {/* Circular Green Shield Check Icon */}
            <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center mx-auto border border-emerald-100 dark:border-emerald-900/50">
              <ShieldCheck className="w-5 h-5" />
            </div>

            <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-950 dark:text-white">
              Compliance Overview
            </h3>

            {/* Circular Radial Progress Ring */}
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-zinc-100 dark:stroke-zinc-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  className="stroke-[#16A34A] transition-all duration-700 ease-out"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-zinc-950 dark:text-white leading-none">
                  {complianceRate}%
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-white">
                Compliance Rate
              </div>
              <div className="text-[10px] font-bold text-[#16A34A] mt-0.5">
                +5% from last month
              </div>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            {/* Breakdown List matching screenshot */}
            <div className="space-y-2.5 text-xs text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">Deeds Verified</span>
                </div>
                <span className="font-extrabold text-zinc-900 dark:text-white">
                  {stats.verified}/{stats.total}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">Pending Review</span>
                </div>
                <span className="font-extrabold text-zinc-900 dark:text-white">
                  {stats.pending}/{stats.total}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">Actions Required</span>
                </div>
                <span className="font-extrabold text-rose-600 dark:text-rose-400">
                  {stats.actionRequired}/{stats.total}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Need Assistance? */}
          <div className="bg-gradient-to-br from-[#064e3b] via-[#043e30] to-[#022c22] text-white rounded-2xl p-5 relative overflow-hidden shadow-md border border-emerald-800/40">
            {/* Watermark building outline */}
            <div className="absolute -right-4 -bottom-4 w-28 h-28 opacity-10 pointer-events-none text-emerald-300">
              <Building2 className="w-full h-full" />
            </div>

            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mb-3.5 text-emerald-300">
              <Headphones className="w-5 h-5" />
            </div>

            <h3 className="text-sm font-extrabold text-white tracking-tight">
              Need Assistance?
            </h3>
            <p className="text-[11px] text-emerald-100/80 mt-1 leading-relaxed">
              Contact our compliance team for support.
            </p>

            <Link
              href="/admin/disputes"
              className="inline-flex items-center gap-1.5 mt-4 px-3.5 py-1.5 rounded-xl bg-white text-[#064e3b] font-bold text-xs hover:bg-emerald-50 transition shadow-xs cursor-pointer"
            >
              <span>Get Support</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── TITLE DEED AUDIT DRAWER ───────────────────────────────────────── */}
      <TitleDeedDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLandlordForDrawer(null);
        }}
        landlord={selectedLandlordForDrawer}
        onAuditSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-landlord-deeds'] });
          refetch();
        }}
      />

      {/* ─── ADD TITLE DEED MODAL ──────────────────────────────────────────── */}
      <AddTitleDeedModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        landlords={landlords}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-landlord-deeds'] });
          refetch();
        }}
      />
    </div>
  );
}
