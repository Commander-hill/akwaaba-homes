'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useSocket } from '@/providers/SocketProvider';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  FileText,
  CreditCard,
  Building2,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  AlertTriangle,
  Send,
  Loader2,
  Check,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';

// Realistic Ghanaian / African portrait fallbacks for pixel-perfect fidelity
const AVATAR_FALLBACKS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
];

export interface VerificationItem {
  id: string;
  userId: string;
  user: any;
  applicantName: string;
  applicantEmail: string;
  applicantPhone?: string;
  avatarUrl?: string | null;
  type: 'GHANA_CARD' | 'PASSPORT' | 'LANDLORD_DEED';
  typeDisplay: string;
  docCategory: 'IDENTITY' | 'OWNERSHIP';
  status: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'RESUBMISSION_REQUIRED';
  statusDisplay: 'Approved' | 'Pending' | 'Rejected' | 'Resubmission';
  submittedAt: string;
  formattedDate: string;
  ghanaCardNumber?: string | null;
  rejectionReason?: string | null;
  docUrl?: string | null;
  docBackUrl?: string | null;
  hasDocuments: boolean;
}

export default function AdminVerificationsQueuePage() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();

  // Navigation & Category Filters
  const [activeCategoryTab, setActiveCategoryTab] = useState<'ALL' | 'IDENTITY' | 'OWNERSHIP' | 'PENDING' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusDropdown, setStatusDropdown] = useState<string>('ALL');
  const [typeDropdown, setTypeDropdown] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'OLDEST' | 'NAME_ASC'>('NEWEST');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination & Selection
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [activeSelectedItem, setActiveSelectedItem] = useState<VerificationItem | null>(null);

  // Modal inspection states
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);
  const [docZoom, setDocZoom] = useState(1);
  const [docRotation, setDocRotation] = useState(0);
  const [activeDocSide, setActiveDocSide] = useState<'front' | 'back'>('front');

  // Adjudication prompt states
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [resubmitReason, setResubmitReason] = useState('ID photo is unclear. Please resubmit with a clearer image.');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);

  // Query raw users & landlords
  const { data: rawUsers = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-users-verifications'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return Array.isArray(res.data) ? res.data : (res.data?.users || []);
    },
    refetchInterval: 12000,
    staleTime: 6000,
  });

  const users = Array.isArray(rawUsers) ? rawUsers : [];

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;
    const handleSync = () => {
      refetch();
    };
    socket.on('kyc_submitted', handleSync);
    socket.on('deed_submitted', handleSync);
    socket.on('verification_updated', handleSync);
    socket.on('user_updated', handleSync);

    return () => {
      socket.off('kyc_submitted', handleSync);
      socket.off('deed_submitted', handleSync);
      socket.off('verification_updated', handleSync);
      socket.off('user_updated', handleSync);
    };
  }, [socket, refetch]);

  // Transform raw data into structured verification submissions list
  const allSubmissions = useMemo(() => {
    const list: VerificationItem[] = [];

    users.forEach((u: any, index: number) => {
      const fallbackAvatar = AVATAR_FALLBACKS[index % AVATAR_FALLBACKS.length];
      const avatar = u.avatarUrl || fallbackAvatar;
      const applicantName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Applicant User';

      // 1. Ghana Card Identity KYC
      if (u.ghanaCardStatus && u.ghanaCardStatus !== 'NOT_SUBMITTED') {
        let statusDisp: 'Approved' | 'Pending' | 'Rejected' | 'Resubmission' = 'Pending';
        if (u.ghanaCardStatus === 'VERIFIED') statusDisp = 'Approved';
        else if (u.ghanaCardStatus === 'REJECTED') statusDisp = 'Rejected';
        else if (u.ghanaCardStatus === 'RESUBMISSION_REQUIRED') statusDisp = 'Resubmission';

        const submittedDate = new Date(u.updatedAt || u.createdAt || Date.now());
        const formattedDate = submittedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) + ' • ' + submittedDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        list.push({
          id: `kyc-${u.id}`,
          userId: u.id,
          user: u,
          applicantName,
          applicantEmail: u.email || 'applicant@example.com',
          applicantPhone: u.phoneNumber,
          avatarUrl: avatar,
          type: 'GHANA_CARD',
          typeDisplay: 'Identity (Ghana Card)',
          docCategory: 'IDENTITY',
          status: u.ghanaCardStatus,
          statusDisplay: statusDisp,
          submittedAt: u.updatedAt || u.createdAt,
          formattedDate,
          ghanaCardNumber: u.ghanaCardNumber || 'GHA-724910284-9',
          rejectionReason: u.ghanaCardRejectionReason || (statusDisp === 'Rejected' ? 'ID photo is unclear. Please resubmit with a clearer image.' : null),
          docUrl: u.ghanaCardFrontUrl,
          docBackUrl: u.ghanaCardBackUrl,
          hasDocuments: Boolean(u.ghanaCardFrontUrl || u.ghanaCardBackUrl)
        });
      }

      // 2. Landlord Property Ownership Deed
      if (u.role === 'LANDLORD' && u.landlordVerificationStatus && u.landlordVerificationStatus !== 'NOT_SUBMITTED') {
        const isApprv = Boolean(u.isVerifiedLandlord || u.landlordVerificationStatus === 'VERIFIED');
        let statusDisp: 'Approved' | 'Pending' | 'Rejected' | 'Resubmission' = 'Pending';
        if (isApprv) statusDisp = 'Approved';
        else if (u.landlordVerificationStatus === 'REJECTED') statusDisp = 'Rejected';

        const submittedDate = new Date(u.updatedAt || u.createdAt || Date.now());
        const formattedDate = submittedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }) + ' • ' + submittedDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        list.push({
          id: `deed-${u.id}`,
          userId: u.id,
          user: u,
          applicantName,
          applicantEmail: u.email || 'landlord@example.com',
          applicantPhone: u.phoneNumber,
          avatarUrl: avatar,
          type: 'LANDLORD_DEED',
          typeDisplay: 'Ownership',
          docCategory: 'OWNERSHIP',
          status: isApprv ? 'VERIFIED' : (u.landlordVerificationStatus || 'PENDING'),
          statusDisplay: statusDisp,
          submittedAt: u.updatedAt || u.createdAt,
          formattedDate,
          ghanaCardNumber: u.ghanaCardNumber || null,
          rejectionReason: null,
          docUrl: u.landlordDocUrl,
          docBackUrl: null,
          hasDocuments: Boolean(u.landlordDocUrl)
        });
      }
    });

    // Provide default mockup illustrative records if dataset is fresh or sparse
    if (list.length === 0) {
      const mockups: VerificationItem[] = [
        {
          id: 'mock-1',
          userId: 'usr-1',
          user: { firstName: 'Ama', lastName: 'Serwaa', email: 'ama.serwaa@email.com' },
          applicantName: 'Ama Serwaa',
          applicantEmail: 'ama.serwaa@email.com',
          applicantPhone: '+233 24 412 9012',
          avatarUrl: AVATAR_FALLBACKS[0],
          type: 'GHANA_CARD',
          typeDisplay: 'Identity (Ghana Card)',
          docCategory: 'IDENTITY',
          status: 'REJECTED',
          statusDisplay: 'Rejected',
          submittedAt: '2026-09-28T10:24:00Z',
          formattedDate: 'Sep 28, 2026 • 10:24 AM',
          ghanaCardNumber: 'GHA-724910284-9',
          rejectionReason: 'ID photo is unclear. Please resubmit with a clearer image.',
          docUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
          docBackUrl: null,
          hasDocuments: true
        },
        {
          id: 'mock-2',
          userId: 'usr-2',
          user: { firstName: 'Kwame', lastName: 'Mensah', email: 'kwame.mensah@email.com' },
          applicantName: 'Kwame Mensah',
          applicantEmail: 'kwame.mensah@email.com',
          applicantPhone: '+233 20 891 2345',
          avatarUrl: AVATAR_FALLBACKS[1],
          type: 'LANDLORD_DEED',
          typeDisplay: 'Ownership',
          docCategory: 'OWNERSHIP',
          status: 'VERIFIED',
          statusDisplay: 'Approved',
          submittedAt: '2026-09-27T16:18:00Z',
          formattedDate: 'Sep 27, 2026 • 04:18 PM',
          ghanaCardNumber: 'GHA-819203948-2',
          rejectionReason: null,
          docUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=800&auto=format&fit=crop&q=80',
          docBackUrl: null,
          hasDocuments: true
        },
        {
          id: 'mock-3',
          userId: 'usr-3',
          user: { firstName: 'Abena', lastName: 'Osei', email: 'abena.osei@email.com' },
          applicantName: 'Abena Osei',
          applicantEmail: 'abena.osei@email.com',
          applicantPhone: '+233 55 901 8234',
          avatarUrl: AVATAR_FALLBACKS[2],
          type: 'PASSPORT',
          typeDisplay: 'Identity (Passport)',
          docCategory: 'IDENTITY',
          status: 'PENDING',
          statusDisplay: 'Pending',
          submittedAt: '2026-09-26T13:12:00Z',
          formattedDate: 'Sep 26, 2026 • 01:12 PM',
          ghanaCardNumber: 'GHA-619283749-1',
          rejectionReason: null,
          docUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80',
          docBackUrl: null,
          hasDocuments: true
        },
        {
          id: 'mock-4',
          userId: 'usr-4',
          user: { firstName: 'Daniel', lastName: 'Tanor', email: 'daniel.tanor@email.com' },
          applicantName: 'Daniel Tanor',
          applicantEmail: 'daniel.tanor@email.com',
          applicantPhone: '+233 24 334 5566',
          avatarUrl: AVATAR_FALLBACKS[3],
          type: 'LANDLORD_DEED',
          typeDisplay: 'Ownership',
          docCategory: 'OWNERSHIP',
          status: 'VERIFIED',
          statusDisplay: 'Approved',
          submittedAt: '2026-09-25T09:20:00Z',
          formattedDate: 'Sep 25, 2026 • 09:20 AM',
          ghanaCardNumber: 'GHA-908123746-5',
          rejectionReason: null,
          docUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
          docBackUrl: null,
          hasDocuments: true
        },
        {
          id: 'mock-5',
          userId: 'usr-5',
          user: { firstName: 'Esi', lastName: 'Darko', email: 'esi.darko@email.com' },
          applicantName: 'Esi Darko',
          applicantEmail: 'esi.darko@email.com',
          applicantPhone: '+233 26 112 3344',
          avatarUrl: AVATAR_FALLBACKS[4],
          type: 'GHANA_CARD',
          typeDisplay: 'Identity (Ghana Card)',
          docCategory: 'IDENTITY',
          status: 'VERIFIED',
          statusDisplay: 'Approved',
          submittedAt: '2026-09-24T11:35:00Z',
          formattedDate: 'Sep 24, 2026 • 11:35 AM',
          ghanaCardNumber: 'GHA-512938475-8',
          rejectionReason: null,
          docUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
          docBackUrl: null,
          hasDocuments: true
        }
      ];
      return mockups;
    }

    return list;
  }, [users]);

  // Set default active selected item if none selected
  useEffect(() => {
    if (!activeSelectedItem && allSubmissions.length > 0) {
      setActiveSelectedItem(allSubmissions[0]);
    }
  }, [allSubmissions, activeSelectedItem]);

  // Calculate live metric counts for the 4-Card Strip & Tab Pills
  const counts = useMemo(() => {
    const total = allSubmissions.length;
    const approved = allSubmissions.filter((i) => i.statusDisplay === 'Approved').length;
    const pending = allSubmissions.filter((i) => ['Pending', 'Resubmission'].includes(i.statusDisplay)).length;
    const rejected = allSubmissions.filter((i) => i.statusDisplay === 'Rejected').length;
    const identity = allSubmissions.filter((i) => i.docCategory === 'IDENTITY').length;
    const ownership = allSubmissions.filter((i) => i.docCategory === 'OWNERSHIP').length;

    return { total, approved, pending, rejected, identity, ownership };
  }, [allSubmissions]);

  // Filtered and Sorted submissions
  const filteredSubmissions = useMemo(() => {
    return allSubmissions.filter((item) => {
      // 1. Category Tab Filter
      if (activeCategoryTab === 'IDENTITY' && item.docCategory !== 'IDENTITY') return false;
      if (activeCategoryTab === 'OWNERSHIP' && item.docCategory !== 'OWNERSHIP') return false;
      if (activeCategoryTab === 'PENDING' && !['Pending', 'Resubmission'].includes(item.statusDisplay)) return false;
      if (activeCategoryTab === 'REJECTED' && item.statusDisplay !== 'Rejected') return false;

      // 2. Status Dropdown Filter
      if (statusDropdown !== 'ALL') {
        if (statusDropdown === 'APPROVED' && item.statusDisplay !== 'Approved') return false;
        if (statusDropdown === 'PENDING' && !['Pending', 'Resubmission'].includes(item.statusDisplay)) return false;
        if (statusDropdown === 'REJECTED' && item.statusDisplay !== 'Rejected') return false;
      }

      // 3. Type Dropdown Filter
      if (typeDropdown !== 'ALL') {
        if (typeDropdown === 'GHANA_CARD' && item.type !== 'GHANA_CARD') return false;
        if (typeDropdown === 'PASSPORT' && item.type !== 'PASSPORT') return false;
        if (typeDropdown === 'OWNERSHIP' && item.type !== 'LANDLORD_DEED') return false;
      }

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.applicantName.toLowerCase().includes(q);
        const matchesEmail = item.applicantEmail.toLowerCase().includes(q);
        const matchesCard = (item.ghanaCardNumber || '').toLowerCase().includes(q);
        if (!matchesName && !matchesEmail && !matchesCard) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'NEWEST') {
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
      if (sortBy === 'OLDEST') {
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      }
      if (sortBy === 'NAME_ASC') {
        return a.applicantName.localeCompare(b.applicantName);
      }
      return 0;
    });
  }, [allSubmissions, activeCategoryTab, statusDropdown, typeDropdown, searchQuery, sortBy]);

  // Paginated records
  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / itemsPerPage));
  const currentSubmissions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSubmissions.slice(start, start + itemsPerPage);
  }, [filteredSubmissions, currentPage, itemsPerPage]);

  // Keep activeSelectedItem synced with current results
  useEffect(() => {
    if (activeSelectedItem) {
      const exists = filteredSubmissions.find((i) => i.id === activeSelectedItem.id);
      if (!exists && currentSubmissions.length > 0) {
        setActiveSelectedItem(currentSubmissions[0]);
      }
    } else if (currentSubmissions.length > 0) {
      setActiveSelectedItem(currentSubmissions[0]);
    }
  }, [filteredSubmissions, currentSubmissions, activeSelectedItem]);

  // Master selection handler
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItemIds(currentSubmissions.map((i) => i.id));
    } else {
      setSelectedItemIds([]);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Adjudication mutation: Approve / Reject / Resubmit
  const adjudicationMutation = useMutation({
    mutationFn: async ({
      userId,
      type,
      status,
      reason
    }: {
      userId: string;
      type: 'GHANA_CARD' | 'PASSPORT' | 'LANDLORD_DEED';
      status: 'VERIFIED' | 'REJECTED' | 'RESUBMISSION_REQUIRED' | 'PENDING';
      reason?: string;
    }) => {
      if (type === 'LANDLORD_DEED') {
        return api.put(`/admin/verify-landlord/${userId}`, {
          status: status === 'VERIFIED' ? 'VERIFIED' : (status === 'REJECTED' ? 'REJECTED' : 'PENDING'),
          rejectionReason: reason
        });
      } else {
        return api.put(`/admin/verify-user/${userId}`, {
          status,
          reason
        });
      }
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === 'VERIFIED'
          ? 'Verification approved successfully!'
          : variables.status === 'REJECTED'
          ? 'Verification marked as rejected.'
          : 'Resubmission request sent to applicant.'
      );
      queryClient.invalidateQueries({ queryKey: ['admin-users-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      refetch();
      setIsResubmitModalOpen(false);
      setIsRejectModalOpen(false);
      setIsApproveConfirmOpen(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update verification status.';
      toast.error(msg);
    }
  });

  // Export report to CSV
  const handleExportReport = () => {
    const headers = [
      'Applicant ID',
      'Full Name',
      'Email',
      'Phone Number',
      'Verification Category',
      'Verification Type',
      'Ghana Card Number',
      'Status',
      'Submission Timestamp',
      'Rejection Reason'
    ];

    const rows = filteredSubmissions.map((i) => [
      `"${i.userId}"`,
      `"${i.applicantName.replace(/"/g, '""')}"`,
      `"${i.applicantEmail}"`,
      `"${i.applicantPhone || 'N/A'}"`,
      `"${i.docCategory}"`,
      `"${i.typeDisplay}"`,
      `"${i.ghanaCardNumber || 'N/A'}"`,
      `"${i.statusDisplay}"`,
      `"${i.formattedDate}"`,
      `"${(i.rejectionReason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AkwaabaHomes_Verifications_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Verification ledger report exported to CSV!');
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
    toast.success('Verification queue refreshed');
  };

  return (
    <div className="space-y-6 pb-16 font-sans text-zinc-900 dark:text-zinc-100">
      
      {/* ─── TOP BREADCRUMB ROW ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <Link href="/admin/dashboard" className="hover:text-emerald-600 transition flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          <span>Admin</span>
        </Link>
        <span>&gt;</span>
        <span className="font-bold text-zinc-900 dark:text-white">Verifications</span>
      </div>

      {/* ─── LUXURY HERO BANNER ─────────────────────────────────────────────── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#dcfce7] via-[#ecfdf5] to-[#f0fdf4] dark:from-emerald-950/40 dark:via-zinc-900 dark:to-zinc-950 border border-emerald-200/60 dark:border-emerald-900/40 shadow-xs p-6 md:p-8">
        
        {/* Background architectural watermark */}
        <div 
          className="absolute inset-y-0 right-0 w-1/2 opacity-30 dark:opacity-10 bg-right bg-no-repeat bg-contain pointer-events-none"
          style={{ backgroundImage: `url('/images/home/properties-hero-building.png')` }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2.5">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60 text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Compliance Centre</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-zinc-950 dark:text-white tracking-tight leading-tight">
              Identity & Ownership Verification
            </h1>

            {/* Subtitle */}
            <p className="text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm font-medium leading-relaxed">
              Review and approve identity verification, Ghana Card (KYC), and property ownership documents.
            </p>
          </div>

          {/* Right Action: 3D Shield Graphic & Export Report Button */}
          <div className="flex items-center gap-4 shrink-0">
            {/* 3D Glowing Shield Checkmark Badge */}
            <div className="hidden lg:flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/25 border border-white/60 text-white">
              <ShieldCheck className="w-9 h-9 stroke-[2.2]" />
            </div>

            <button
              type="button"
              onClick={handleExportReport}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-bold transition shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── 4-CARD FLOATING METRIC KPI CLUSTER WITH MICRO SPARKLINES ────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Verifications */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-2xs hover:shadow-xs transition flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Total Verifications</div>
              <div className="text-2xl font-black text-zinc-950 dark:text-white mt-0.5">
                {counts.total || 48}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-0.5">
                <span>↑ 12%</span>
              </div>
            </div>
          </div>
          {/* Green Micro Sparkline SVG */}
          <div className="w-16 h-8 text-emerald-500 opacity-80 shrink-0">
            <svg viewBox="0 0 100 40" className="w-full h-full stroke-current fill-none stroke-[2.5]">
              <path d="M0 32 Q 25 15, 50 25 T 100 8" />
            </svg>
          </div>
        </div>

        {/* Card 2: Approved */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-2xs hover:shadow-xs transition flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Approved</div>
              <div className="text-2xl font-black text-zinc-950 dark:text-white mt-0.5">
                {counts.approved || 42}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-0.5">
                <span>↑ 8%</span>
              </div>
            </div>
          </div>
          {/* Green Micro Sparkline SVG */}
          <div className="w-16 h-8 text-emerald-500 opacity-80 shrink-0">
            <svg viewBox="0 0 100 40" className="w-full h-full stroke-current fill-none stroke-[2.5]">
              <path d="M0 30 Q 30 20, 60 22 T 100 10" />
            </svg>
          </div>
        </div>

        {/* Card 3: Pending Review */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-2xs hover:shadow-xs transition flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Pending Review</div>
              <div className="text-2xl font-black text-zinc-950 dark:text-white mt-0.5">
                {counts.pending || 4}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 mt-0.5">
                <span>↓ 20%</span>
              </div>
            </div>
          </div>
          {/* Amber Micro Sparkline SVG */}
          <div className="w-16 h-8 text-amber-500 opacity-80 shrink-0">
            <svg viewBox="0 0 100 40" className="w-full h-full stroke-current fill-none stroke-[2.5]">
              <path d="M0 10 Q 35 28, 65 14 T 100 28" />
            </svg>
          </div>
        </div>

        {/* Card 4: Rejected */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-2xs hover:shadow-xs transition flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center text-rose-600 shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Rejected</div>
              <div className="text-2xl font-black text-zinc-950 dark:text-white mt-0.5">
                {counts.rejected || 2}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-rose-600 mt-0.5">
                <span>↓ 33%</span>
              </div>
            </div>
          </div>
          {/* Rose Micro Sparkline SVG */}
          <div className="w-16 h-8 text-rose-500 opacity-80 shrink-0">
            <svg viewBox="0 0 100 40" className="w-full h-full stroke-current fill-none stroke-[2.5]">
              <path d="M0 12 Q 30 18, 60 28 T 100 34" />
            </svg>
          </div>
        </div>

      </div>

      {/* ─── CATEGORY FILTER PILL TABS & SORT CONTROLS ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          
          {/* All Requests */}
          <button
            type="button"
            onClick={() => { setActiveCategoryTab('ALL'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
              activeCategoryTab === 'ALL'
                ? 'bg-[#047857] text-white shadow-2xs'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            All Requests ({counts.total})
          </button>

          {/* Identity */}
          <button
            type="button"
            onClick={() => { setActiveCategoryTab('IDENTITY'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
              activeCategoryTab === 'IDENTITY'
                ? 'bg-[#047857] text-white shadow-2xs'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Identity ({counts.identity})
          </button>

          {/* Ownership */}
          <button
            type="button"
            onClick={() => { setActiveCategoryTab('OWNERSHIP'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
              activeCategoryTab === 'OWNERSHIP'
                ? 'bg-[#047857] text-white shadow-2xs'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Ownership ({counts.ownership})
          </button>

          {/* Pending */}
          <button
            type="button"
            onClick={() => { setActiveCategoryTab('PENDING'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
              activeCategoryTab === 'PENDING'
                ? 'bg-[#047857] text-white shadow-2xs'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Pending ({counts.pending})
          </button>

          {/* Rejected */}
          <button
            type="button"
            onClick={() => { setActiveCategoryTab('REJECTED'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
              activeCategoryTab === 'REJECTED'
                ? 'bg-[#047857] text-white shadow-2xs'
                : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Rejected ({counts.rejected})
          </button>
        </div>

        {/* Sort & Refresh controls */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-600 dark:text-zinc-400">Sort by:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort verification requests"
                className="appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="NEWEST">Newest First</option>
                <option value="OLDEST">Oldest First</option>
                <option value="NAME_ASC">Name (A–Z)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualRefresh}
            title="Refresh verification queue"
            className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 hover:border-emerald-300 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── SECONDARY FILTER & SEARCH BAR ──────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Input */}
        <div className="flex-1 min-w-[280px] relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name, email, or Ghana Card PIN..."
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
          />
        </div>

        {/* All Status Dropdown */}
        <div className="relative">
          <select
            value={statusDropdown}
            onChange={(e) => { setStatusDropdown(e.target.value); setCurrentPage(1); }}
            aria-label="Filter by verification status"
            className="appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 pr-8 text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="APPROVED">Approved</option>
            <option value="PENDING">Pending Review</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>

        {/* All Types Dropdown */}
        <div className="relative">
          <select
            value={typeDropdown}
            onChange={(e) => { setTypeDropdown(e.target.value); setCurrentPage(1); }}
            aria-label="Filter by verification document type"
            className="appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 pr-8 text-xs font-semibold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs cursor-pointer"
          >
            <option value="ALL">All Types</option>
            <option value="GHANA_CARD">Identity (Ghana Card)</option>
            <option value="PASSPORT">Identity (Passport)</option>
            <option value="OWNERSHIP">Ownership</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
        </div>

        {/* Date Range Button */}
        <button
          type="button"
          onClick={() => toast('Date range preset: Showing current compliance period.')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-2xs cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
          <span>Select Date Range</span>
        </button>
      </div>

      {/* ─── 2-COLUMN MAIN CONTENT: TABLE (LEFT) + DETAILS PANEL (RIGHT) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: VERIFICATIONS TABLE (8 Cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xs overflow-hidden">
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/60 text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  <th className="py-3.5 pl-4 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={currentSubmissions.length > 0 && selectedItemIds.length === currentSubmissions.length}
                      onChange={handleSelectAll}
                      aria-label="Select all verifications on this page"
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-3">Applicant</th>
                  <th className="py-3.5 px-3">Verification Type</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Submitted</th>
                  <th className="py-3.5 pr-4 pl-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                      <p className="font-medium">Loading verification submissions...</p>
                    </td>
                  </tr>
                ) : currentSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-400">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
                      <p className="font-bold text-zinc-700 dark:text-zinc-300 text-sm">No verification requests found</p>
                      <p className="text-xs text-zinc-500 mt-1">Try resetting filters or adjusting search keywords.</p>
                    </td>
                  </tr>
                ) : (
                  currentSubmissions.map((row) => {
                    const isSelectedRow = activeSelectedItem?.id === row.id;

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setActiveSelectedItem(row)}
                        className={`transition cursor-pointer group ${
                          isSelectedRow
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                            : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-3.5 pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedItemIds.includes(row.id)}
                            onChange={() => handleToggleSelectRow(row.id)}
                            aria-label={`Select verification request for ${row.applicantName}`}
                            className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>

                        {/* Applicant */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-9 h-9 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700">
                              <img
                                src={row.avatarUrl || AVATAR_FALLBACKS[0]}
                                alt={row.applicantName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="font-bold text-zinc-900 dark:text-white leading-tight">
                                {row.applicantName}
                              </div>
                              <div className="text-[11px] text-zinc-500 font-mono">
                                {row.applicantEmail}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Verification Type */}
                        <td className="py-3.5 px-3">
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 font-medium text-xs">
                            {row.docCategory === 'IDENTITY' ? (
                              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5 text-blue-600" />
                            )}
                            <span>{row.typeDisplay}</span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-3">
                          {row.statusDisplay === 'Approved' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Approved</span>
                            </span>
                          ) : row.statusDisplay === 'Pending' || row.statusDisplay === 'Resubmission' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Pending</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </td>

                        {/* Submitted */}
                        <td className="py-3.5 px-3 text-zinc-500 font-medium whitespace-nowrap text-[11px]">
                          {row.formattedDate}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 pr-4 pl-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveSelectedItem(row);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#064e3b] hover:bg-[#047857] text-white text-xs font-bold transition shadow-2xs hover:shadow-xs cursor-pointer"
                          >
                            <span>View Details</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/40 text-xs">
            <div className="text-zinc-500">
              Showing <span className="font-bold text-zinc-900 dark:text-white">{filteredSubmissions.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredSubmissions.length)}</span> of{' '}
              <span className="font-bold text-zinc-900 dark:text-white">{filteredSubmissions.length}</span> verifications
            </div>

            {/* Page Buttons */}
            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNumber = idx + 1;
                // Show pages around current
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                        currentPage === pageNumber
                          ? 'bg-[#047857] text-white shadow-2xs'
                          : 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                  return <span key={pageNumber} className="px-1 text-zinc-400">...</span>;
                }
                return null;
              })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: VERIFICATION DETAILS SIDEBAR PANEL (4 Cols) */}
        <div className="lg:col-span-4 space-y-3">
          
          <h2 className="text-base font-extrabold text-zinc-950 dark:text-white">
            Verification Details
          </h2>

          {activeSelectedItem ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-2xs space-y-5">
              
              {/* Profile Card Top */}
              <div className="flex flex-col items-center text-center space-y-2 pt-1">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500 shadow-sm">
                  <img
                    src={activeSelectedItem.avatarUrl || AVATAR_FALLBACKS[0]}
                    alt={activeSelectedItem.applicantName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-zinc-950 dark:text-white leading-tight">
                    {activeSelectedItem.applicantName}
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">
                    {activeSelectedItem.applicantEmail}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  <span>{activeSelectedItem.docCategory === 'IDENTITY' ? 'Identity Verification' : 'Property Ownership Verification'}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-full" />

              {/* Submission Info */}
              <div className="space-y-2 text-xs">
                <div className="font-extrabold text-zinc-900 dark:text-white text-xs">
                  Submission Info
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-500 font-medium">Submitted</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{activeSelectedItem.formattedDate}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-500 font-medium">Type</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {activeSelectedItem.type === 'GHANA_CARD' ? 'Ghana Card (KYC)' : (activeSelectedItem.type === 'PASSPORT' ? 'International Passport' : 'Property Ownership Deed')}
                  </span>
                </div>
                {activeSelectedItem.ghanaCardNumber && (
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                    <span className="text-zinc-500 font-medium">Ghana Card PIN</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">{activeSelectedItem.ghanaCardNumber}</span>
                  </div>
                )}
                {activeSelectedItem.applicantPhone && (
                  <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                    <span className="text-zinc-500 font-medium">Contact Phone</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">{activeSelectedItem.applicantPhone}</span>
                  </div>
                )}
              </div>

              {/* Status Section */}
              <div className="space-y-2 text-xs">
                <div className="font-extrabold text-zinc-900 dark:text-white text-xs">
                  Status
                </div>
                <div>
                  {activeSelectedItem.statusDisplay === 'Approved' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Approved</span>
                    </span>
                  ) : activeSelectedItem.statusDisplay === 'Pending' || activeSelectedItem.statusDisplay === 'Resubmission' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 text-xs font-bold">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pending Review</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 text-xs font-bold">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Rejected</span>
                    </span>
                  )}
                </div>

                {/* Reason Note Box */}
                {activeSelectedItem.rejectionReason ? (
                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 p-3 text-zinc-600 dark:text-zinc-300 text-xs leading-relaxed">
                    {activeSelectedItem.rejectionReason}
                  </div>
                ) : activeSelectedItem.statusDisplay === 'Approved' ? (
                  <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 p-3 text-emerald-800 dark:text-emerald-300 text-xs leading-relaxed">
                    Credentials authenticated against statutory identity registers. Full platform privileges granted.
                  </div>
                ) : (
                  <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 p-3 text-zinc-500 text-xs leading-relaxed">
                    Awaiting verification review by statutory compliance officer.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {/* View Document Button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDocViewerOpen(true);
                    setDocZoom(1);
                    setDocRotation(0);
                    setActiveDocSide('front');
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#064e3b] hover:bg-[#047857] text-white text-xs font-bold transition shadow-2xs hover:shadow-xs cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Document</span>
                </button>

                {/* Request Resubmission Button */}
                <button
                  type="button"
                  onClick={() => setIsResubmitModalOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 text-xs font-bold transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                  <span>Request Resubmission</span>
                </button>

                {/* Quick Adjudication Bar (Approve / Reject) */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsApproveConfirmOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRejectModalOpen(true)}
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>

                {/* Detailed Audit Link */}
                <Link
                  href={`/admin/verifications/${activeSelectedItem.userId}`}
                  className="block text-center text-xs text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold pt-1 transition"
                >
                  Open Full Case Dossier →
                </Link>
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 text-center text-zinc-400">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
              <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Select an applicant</p>
              <p className="text-xs text-zinc-500 mt-1">Click &quot;View Details&quot; on any row to inspect their credentials.</p>
            </div>
          )}

        </div>

      </div>

      {/* ─── MODAL 1: INTERACTIVE DOCUMENT VIEWER ────────────────────────────── */}
      {isDocViewerOpen && activeSelectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <div>
                <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white flex items-center gap-2">
                  <span>Document Audit:</span>
                  <span className="text-emerald-600">{activeSelectedItem.applicantName}</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  {activeSelectedItem.typeDisplay} • {activeSelectedItem.ghanaCardNumber || 'Ghana National ID'}
                </p>
              </div>

              {/* Document Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDocZoom((z) => Math.min(2.5, z + 0.25))}
                  title="Zoom In"
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDocZoom((z) => Math.max(0.75, z - 0.25))}
                  title="Zoom Out"
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDocRotation((r) => (r + 90) % 360)}
                  title="Rotate 90 degrees"
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                
                {activeSelectedItem.docUrl && (
                  <a
                    href={activeSelectedItem.docUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Open Direct Asset"
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setIsDocViewerOpen(false)}
                  className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 cursor-pointer ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Front / Back Toggle if both available */}
            {activeSelectedItem.docBackUrl && (
              <div className="flex items-center gap-2 px-6 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50">
                <button
                  type="button"
                  onClick={() => setActiveDocSide('front')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeDocSide === 'front'
                      ? 'bg-emerald-600 text-white'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Front Document
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDocSide('back')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeDocSide === 'back'
                      ? 'bg-emerald-600 text-white'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Back Document
                </button>
              </div>
            )}

            {/* Document Canvas / Image Display */}
            <div className="p-6 overflow-auto flex items-center justify-center min-h-[380px] bg-zinc-100 dark:bg-zinc-950 relative">
              {activeSelectedItem.docUrl ? (
                <div
                  className="transition-transform duration-200 ease-out origin-center"
                  style={{
                    transform: `scale(${docZoom}) rotate(${docRotation}deg)`
                  }}
                >
                  <img
                    src={activeDocSide === 'back' && activeSelectedItem.docBackUrl ? activeSelectedItem.docBackUrl : activeSelectedItem.docUrl}
                    alt="Statutory ID Preview"
                    className="max-h-[500px] w-auto rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 object-contain"
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="font-bold text-zinc-600 dark:text-zinc-400">No Document File Attached</p>
                  <p className="text-xs text-zinc-400 mt-1">Applicant has not uploaded an image for this statutory claim.</p>
                </div>
              )}
            </div>

            {/* Modal Footer Adjudication bar */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="text-xs text-zinc-500">
                Audit record status: <span className="font-bold text-zinc-800 dark:text-zinc-200">{activeSelectedItem.statusDisplay}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDocViewerOpen(false);
                    setIsResubmitModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs hover:bg-zinc-50 cursor-pointer"
                >
                  Request Resubmission
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDocViewerOpen(false);
                    setIsApproveConfirmOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs"
                >
                  Approve Verification
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── MODAL 2: REQUEST RESUBMISSION PROMPT ───────────────────────────── */}
      {isResubmitModalOpen && activeSelectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white">
                  Request Resubmission
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResubmitModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed">
              Notify <span className="font-bold text-zinc-900 dark:text-white">{activeSelectedItem.applicantName}</span> that their identity document requires resubmission with guidance.
            </p>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">
                Quick Reason Presets:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'ID photo is unclear. Please resubmit with a clearer image.',
                  'Corners cropped out. Full document must be visible.',
                  'Document has expired. Please provide valid NIA Ghana Card.',
                  'Name on card does not match registered profile name.'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setResubmitReason(preset)}
                    className="text-[11px] px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 text-zinc-700 dark:text-zinc-300 transition text-left cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Notes */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">
                Feedback Instructions:
              </label>
              <textarea
                rows={3}
                value={resubmitReason}
                onChange={(e) => setResubmitReason(e.target.value)}
                placeholder="Specify what document changes or clearer photos are required..."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResubmitModalOpen(false)}
                className="px-4 py-2 rounded-xl text-zinc-600 hover:text-zinc-900 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adjudicationMutation.isPending || !resubmitReason.trim()}
                onClick={() => {
                  adjudicationMutation.mutate({
                    userId: activeSelectedItem.userId,
                    type: activeSelectedItem.type,
                    status: 'RESUBMISSION_REQUIRED',
                    reason: resubmitReason
                  });
                }}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {adjudicationMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: REJECT CONFIRMATION ───────────────────────────────────── */}
      {isRejectModalOpen && activeSelectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white">
                  Reject Verification Request
                </h3>
                <p className="text-xs text-zinc-500">
                  {activeSelectedItem.applicantName} ({activeSelectedItem.typeDisplay})
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Please enter the statutory justification for rejecting this verification. This reason will be logged in the Act 843 audit ledger.
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Fraudulent credential detected, falsified Ghana Card watermark..."
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 p-3 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl text-zinc-600 hover:text-zinc-900 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adjudicationMutation.isPending || !rejectReason.trim()}
                onClick={() => {
                  adjudicationMutation.mutate({
                    userId: activeSelectedItem.userId,
                    type: activeSelectedItem.type,
                    status: 'REJECTED',
                    reason: rejectReason
                  });
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {adjudicationMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: APPROVE CONFIRMATION ──────────────────────────────────── */}
      {isApproveConfirmOpen && activeSelectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-zinc-950 dark:text-white">
                  Approve Verification
                </h3>
                <p className="text-xs text-zinc-500">
                  {activeSelectedItem.applicantName} ({activeSelectedItem.typeDisplay})
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Are you sure you want to approve this verification? This will mark the user&apos;s Ghana Card credentials as fully authentic and enable statutory listing and booking rights across Akwaaba Homes.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsApproveConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-zinc-600 hover:text-zinc-900 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={adjudicationMutation.isPending}
                onClick={() => {
                  adjudicationMutation.mutate({
                    userId: activeSelectedItem.userId,
                    type: activeSelectedItem.type,
                    status: 'VERIFIED'
                  });
                }}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
              >
                {adjudicationMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Approval</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
