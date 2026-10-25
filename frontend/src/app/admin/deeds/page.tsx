'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import Link from 'next/link';
import { useSocket } from '@/providers/SocketProvider';
import { 
  FileCheck2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Building2, 
  User, 
  ExternalLink, 
  AlertTriangle, 
  CreditCard, 
  Phone, 
  Mail, 
  MessageSquare, 
  Eye, 
  FileText, 
  Plus, 
  Download, 
  RefreshCw, 
  Filter, 
  X,
  FileQuestion,
  ShieldCheck,
  ChevronRight,
  MoreVertical,
  Clock,
  Sparkles,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import SkeletonTable from '@/components/SkeletonTable';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import TitleDeedDrawer, { LandlordDeedRecord } from '@/components/admin/deeds/TitleDeedDrawer';
import AddTitleDeedModal from '@/components/admin/deeds/AddTitleDeedModal';
import clsx from 'clsx';

type FilterTab = 'ALL' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'MISSING';
type SortOption = 'newest' | 'oldest' | 'name' | 'properties';

export default function AdminTitleDeedsPage() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Modals & Drawer states
  const [selectedLandlordForDrawer, setSelectedLandlordForDrawer] = useState<LandlordDeedRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch deed audits from backend
  const { data, isLoading, isRefetching, refetch } = useQuery({
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

    return { total, verified, pending, rejected, missing };
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
        const q = searchTerm.toLowerCase();
        const fullName = `${l.firstName} ${l.lastName}`.toLowerCase();
        const email = l.email.toLowerCase();
        const phone = (l.phoneNumber || '').toLowerCase();
        const hasMatchingProperty = l.properties?.some(
          (p) => p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)
        );

        return (
          fullName.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          Boolean(hasMatchingProperty)
        );
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
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'properties') {
        return (b.properties?.length || 0) - (a.properties?.length || 0);
      }
      return 0;
    });
  }, [landlords, activeTab, searchTerm, sortBy]);

  // Export handlers
  const handleExportCSV = () => {
    if (landlords.length === 0) {
      toast.error('No records available to export.');
      return;
    }

    const headers = [
      'Landlord ID',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Ghana Card Number',
      'Ghana Card Status',
      'Deed Status',
      'Deed Document Available',
      'Properties Count',
      'Properties List',
      'Registered Date'
    ];

    const rows = filteredRecords.map((l) => [
      `"${l.id}"`,
      `"${l.firstName}"`,
      `"${l.lastName}"`,
      `"${l.email}"`,
      `"${l.phoneNumber || ''}"`,
      `"${l.ghanaCardNumber || 'N/A'}"`,
      `"${l.ghanaCardStatus || 'N/A'}"`,
      `"${l.landlordVerificationStatus}"`,
      `"${l.landlordDocUrl ? 'YES' : 'NO'}"`,
      `"${l.properties?.length || 0}"`,
      `"${(l.properties || []).map((p) => p.title).join('; ')}"`,
      `"${new Date(l.createdAt).toISOString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `akwaaba_title_deeds_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportMenuOpen(false);
    toast.success('Title deed records exported to CSV.');
  };

  const handleExportJSON = () => {
    if (landlords.length === 0) {
      toast.error('No records available to export.');
      return;
    }

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(filteredRecords, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `akwaaba_title_deeds_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setIsExportMenuOpen(false);
    toast.success('Title deed records exported to JSON.');
  };

  const openDrawer = (landlord: LandlordDeedRecord) => {
    setSelectedLandlordForDrawer(landlord);
    setIsDrawerOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActiveTab('ALL');
    setSortBy('newest');
  };

  const hasActiveFilters = Boolean(searchTerm) || activeTab !== 'ALL' || sortBy !== 'newest';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Page Header */}
      <AdminPageHeader
        title="Title Deeds & Ownership"
        subtitle="Oversee landlord title deeds, examine statutory proof of ownership (Act 1036), review verification queues, and manage property authenticity records."
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Title Deeds & Ownership' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            {/* Live refetch button */}
            <button
              onClick={() => refetch()}
              className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
              title="Refresh Records"
            >
              <RefreshCw className={clsx('w-4 h-4', isRefetching && 'animate-spin text-emerald-600')} />
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition"
              >
                <Download className="w-4 h-4 text-zinc-400" />
                <span>Export</span>
              </button>

              {isExportMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsExportMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-44 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95">
                    <button
                      onClick={handleExportCSV}
                      className="w-full text-left px-4 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium"
                    >
                      Export CSV (.csv)
                    </button>
                    <button
                      onClick={handleExportJSON}
                      className="w-full text-left px-4 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium"
                    >
                      Export JSON (.json)
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Add Title Deed Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Title Deed</span>
            </button>
          </div>
        }
      />

      {/* KPI Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Records */}
        <button
          onClick={() => setActiveTab('ALL')}
          className={clsx(
            'p-4 rounded-2xl border text-left transition relative overflow-hidden group',
            activeTab === 'ALL'
              ? 'border-zinc-400 dark:border-zinc-600 bg-zinc-50/80 dark:bg-zinc-800/80 shadow-sm'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Total Deeds
            </span>
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-white">
            {stats.total}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <span>All registered landlords</span>
          </div>
        </button>

        {/* Card 2: Verified */}
        <button
          onClick={() => setActiveTab('VERIFIED')}
          className={clsx(
            'p-4 rounded-2xl border text-left transition relative overflow-hidden group',
            activeTab === 'VERIFIED'
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-sm'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-emerald-300 dark:hover:border-emerald-800'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Verified Deeds
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.verified}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <span>Official ownership verified</span>
          </div>
        </button>

        {/* Card 3: Pending Review */}
        <button
          onClick={() => setActiveTab('PENDING')}
          className={clsx(
            'p-4 rounded-2xl border text-left transition relative overflow-hidden group',
            activeTab === 'PENDING'
              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 shadow-sm'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-amber-300 dark:hover:border-amber-800'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pending Review
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.pending}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <span>Awaiting administrative audit</span>
          </div>
        </button>

        {/* Card 4: Action Required / Missing */}
        <button
          onClick={() => setActiveTab('MISSING')}
          className={clsx(
            'p-4 rounded-2xl border text-left transition relative overflow-hidden group',
            activeTab === 'MISSING'
              ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 shadow-sm'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-rose-300 dark:hover:border-rose-800'
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Action Required
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats.missing + stats.rejected}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <span>Missing or rejected documents</span>
          </div>
        </button>

      </div>

      {/* Review Queue Filter Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-px overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { id: 'ALL', label: 'All Records', count: stats.total },
            { id: 'PENDING', label: 'Pending Review', count: stats.pending },
            { id: 'VERIFIED', label: 'Verified Deeds', count: stats.verified },
            { id: 'REJECTED', label: 'Rejected', count: stats.rejected },
            { id: 'MISSING', label: 'Missing Deeds', count: stats.missing }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FilterTab)}
              className={clsx(
                'px-4 py-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-2',
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              )}
            >
              <span>{tab.label}</span>
              <span className={clsx(
                'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                activeTab === tab.id
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search landlord, email, phone, property title, or location..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort & Reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span>Sort:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-xs p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="newest">Newest Submitted</option>
            <option value="oldest">Oldest Submitted</option>
            <option value="name">Landlord Name (A-Z)</option>
            <option value="properties">Most Properties</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-rose-600 dark:text-rose-400 font-semibold hover:underline px-2 py-1"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Main Records Data Table */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={6} columns={7} />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <FileQuestion className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              No Title Deed Records Found
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'No records match your active search filters. Try clearing your search query or switching tabs.'
                : 'No title deeds or landlord ownership documents have been registered yet.'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/80 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Associated Property</th>
                  <th className="py-3 px-4">Registered Owner / Landlord</th>
                  <th className="py-3 px-4">Ghana Card Identity</th>
                  <th className="py-3 px-4">Deed Document</th>
                  <th className="py-3 px-4">Audit Status</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredRecords.map((landlord) => {
                  const hasProps = landlord.properties && landlord.properties.length > 0;
                  const firstProp = hasProps ? landlord.properties![0] : null;
                  const cleanPhone = landlord.phoneNumber?.replace(/[^0-9]/g, '') || '';
                  const whatsAppNumber = cleanPhone.startsWith('0') ? '233' + cleanPhone.substring(1) : cleanPhone;

                  return (
                    <tr
                      key={landlord.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition group"
                    >
                      {/* Property Column */}
                      <td className="py-3.5 px-4 align-top">
                        {firstProp ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                              <span className="truncate max-w-[200px]">{firstProp.title}</span>
                            </div>
                            <div className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                              {firstProp.location}
                            </div>
                            {landlord.properties!.length > 1 && (
                              <span className="inline-block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded">
                                +{landlord.properties!.length - 1} more properties
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="text-zinc-400 italic text-[11px]">
                            No properties linked
                          </div>
                        )}
                      </td>

                      {/* Landlord Column */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {landlord.firstName[0]}{landlord.lastName[0]}
                          </div>
                          <div className="space-y-0.5">
                            <div className="font-semibold text-zinc-900 dark:text-white">
                              {landlord.firstName} {landlord.lastName}
                            </div>
                            <div className="text-[11px] text-zinc-500">
                              <a href={`mailto:${landlord.email}`} className="hover:underline">
                                {landlord.email}
                              </a>
                            </div>
                            {landlord.phoneNumber && (
                              <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                                <span>{landlord.phoneNumber}</span>
                                {whatsAppNumber && (
                                  <a
                                    href={`https://wa.me/${whatsAppNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-600 hover:text-emerald-700 font-semibold"
                                    title="Contact via WhatsApp"
                                  >
                                    WA
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Ghana Card Column */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1">
                          <div className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                            {landlord.ghanaCardNumber || 'Not submitted'}
                          </div>
                          {landlord.ghanaCardStatus && (
                            <AdminStatusBadge status={landlord.ghanaCardStatus} size="sm" />
                          )}
                        </div>
                      </td>

                      {/* Deed Document Column */}
                      <td className="py-3.5 px-4 align-top">
                        {landlord.landlordDocUrl ? (
                          <div className="space-y-1">
                            <button
                              onClick={() => openDrawer(landlord)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition font-medium text-[11px]"
                            >
                              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Inspect Document</span>
                            </button>
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Signed secure URL
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Missing deed</span>
                          </span>
                        )}
                      </td>

                      {/* Verification Status */}
                      <td className="py-3.5 px-4 align-top">
                        <AdminStatusBadge
                          status={landlord.landlordVerificationStatus}
                          size="sm"
                        />
                      </td>

                      {/* Submitted Date */}
                      <td className="py-3.5 px-4 align-top text-zinc-500 text-[11px]">
                        {new Date(landlord.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Inspect Drawer Button */}
                          <button
                            onClick={() => openDrawer(landlord)}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition"
                            title="Quick Review Drawer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Full Audit Workstation Link */}
                          <Link
                            href={`/admin/deeds/${landlord.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[11px] font-bold hover:opacity-90 transition shadow-sm"
                            title="Open Full Audit Workstation"
                          >
                            <span>Audit</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Inspection Drawer */}
      <TitleDeedDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedLandlordForDrawer(null);
        }}
        landlord={selectedLandlordForDrawer}
        onAuditSuccess={() => refetch()}
      />

      {/* Add Title Deed Modal */}
      <AddTitleDeedModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        landlords={landlords}
        onSuccess={() => refetch()}
      />

    </div>
  );
}
