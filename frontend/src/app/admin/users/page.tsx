'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { 
  Search, 
  SlidersHorizontal, 
  UserPlus, 
  Users, 
  CheckCircle, 
  CheckCircle2, 
  Clock, 
  Ban, 
  X, 
  Eye, 
  Pencil, 
  MoreHorizontal, 
  ArrowRight, 
  Download, 
  FileText, 
  Fingerprint, 
  ShieldCheck, 
  Shield, 
  Building2, 
  User as UserIcon, 
  Key, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  AlertCircle, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Zap, 
  Copy, 
  ExternalLink, 
  Mail, 
  Phone, 
  XCircle,
  Sparkles,
  BadgeCheck
} from 'lucide-react';
import clsx from 'clsx';
import { getImageUrl } from '@/lib/utils';

type RoleFilter = 'ALL' | 'TENANT' | 'LANDLORD' | 'CARETAKER' | 'ADMIN' | 'SUPER_ADMIN';
type KycStatusFilter = 'ALL' | 'VERIFIED' | 'PENDING' | 'UNDER_REVIEW' | 'RESUBMISSION_REQUIRED' | 'REJECTED' | 'NOT_SUBMITTED';
type AccountStatusFilter = 'ALL' | 'ACTIVE' | 'SUSPENDED' | 'LOCKED' | 'UNLOCK_REQUESTS';

function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return '—';
  const clean = phone.replace(/\s+/g, '');
  if (clean.startsWith('+233') && clean.length === 13) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`;
  }
  if (clean.startsWith('0') && clean.length === 10) {
    return `+233 ${clean.slice(1, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  }
  return phone;
}

function formatActivityTime(dateStr?: string | null): string {
  if (!dateStr) return '1h ago';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks}w ago`;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [kycFilter, setKycFilter] = useState<KycStatusFilter>('ALL');
  const [accountFilter, setAccountFilter] = useState<AccountStatusFilter>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Selection & Pagination
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Active Dropdowns & Modals
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedUserForDrawer, setSelectedUserForDrawer] = useState<any | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [suspensionTarget, setSuspensionTarget] = useState<{ user: any; action: 'suspend' | 'unsuspend' } | null>(null);
  const [unlockRequestUser, setUnlockRequestUser] = useState<any | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside to close action menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Users
  const { data: rawUsers, isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data;
    }
  });

  const users: any[] = useMemo(() => {
    if (!rawUsers) return [];
    if (Array.isArray(rawUsers)) return rawUsers;
    if (Array.isArray(rawUsers.users)) return rawUsers.users;
    return [];
  }, [rawUsers]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => !u.isSuspended).length;
    const pendingKyc = users.filter((u) => u.ghanaCardStatus === 'PENDING' || u.ghanaCardStatus === 'UNDER_REVIEW').length;
    const suspended = users.filter((u) => u.isSuspended).length;
    const verifiedKyc = users.filter((u) => u.ghanaCardStatus === 'VERIFIED').length;
    const unlockRequests = users.filter((u) => u.profileUnlockRequested).length;

    return { total, active, pendingKyc, suspended, verifiedKyc, unlockRequests };
  }, [users]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u: any) => {
      // Role filter
      if (roleFilter !== 'ALL') {
        if (roleFilter === 'SUPER_ADMIN' && u.role !== 'SUPER_ADMIN') return false;
        if (roleFilter === 'ADMIN' && u.role !== 'ADMIN') return false;
        if (roleFilter === 'TENANT' && u.role !== 'TENANT') return false;
        if (roleFilter === 'LANDLORD' && u.role !== 'LANDLORD') return false;
        if (roleFilter === 'CARETAKER' && u.role !== 'CARETAKER') return false;
      }

      // KYC Status filter
      if (kycFilter !== 'ALL') {
        if (kycFilter === 'VERIFIED' && u.ghanaCardStatus !== 'VERIFIED') return false;
        if (kycFilter === 'PENDING' && u.ghanaCardStatus !== 'PENDING') return false;
        if (kycFilter === 'UNDER_REVIEW' && u.ghanaCardStatus !== 'UNDER_REVIEW') return false;
        if (kycFilter === 'RESUBMISSION_REQUIRED' && u.ghanaCardStatus !== 'RESUBMISSION_REQUIRED') return false;
        if (kycFilter === 'REJECTED' && u.ghanaCardStatus !== 'REJECTED') return false;
        if (kycFilter === 'NOT_SUBMITTED' && (u.ghanaCardStatus && u.ghanaCardStatus !== 'NOT_SUBMITTED')) return false;
      }

      // Account Status filter
      if (accountFilter !== 'ALL') {
        if (accountFilter === 'ACTIVE' && u.isSuspended) return false;
        if (accountFilter === 'SUSPENDED' && !u.isSuspended) return false;
        if (accountFilter === 'LOCKED' && !u.isProfileLocked) return false;
        if (accountFilter === 'UNLOCK_REQUESTS' && !u.profileUnlockRequested) return false;
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        const email = (u.email || '').toLowerCase();
        const phone = (u.phoneNumber || '').toLowerCase();
        const cardNum = (u.ghanaCardNumber || '').toLowerCase();

        return fullName.includes(q) || email.includes(q) || phone.includes(q) || cardNum.includes(q);
      }

      return true;
    });
  }, [users, roleFilter, kycFilter, accountFilter, searchQuery]);

  // Pagination Slice
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, kycFilter, accountFilter]);

  // Mutations
  const suspendMutation = useMutation({
    mutationFn: async ({ id, isSuspended }: { id: string; isSuspended: boolean }) => {
      const res = await api.put(`/admin/users/${id}/suspend`, { isSuspended });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'User status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSuspensionTarget(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update user status');
    },
    onSettled: () => setProcessingId(null)
  });

  const lockMutation = useMutation({
    mutationFn: async ({ id, isProfileLocked }: { id: string; isProfileLocked: boolean }) => {
      const res = await api.put(`/admin/users/${id}/lock`, { isProfileLocked });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Profile access state updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUnlockRequestUser(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile lock state');
    },
    onSettled: () => setProcessingId(null)
  });

  const handleToggleLock = (user: any) => {
    const nextState = user.profileUnlockRequested ? false : !user.isProfileLocked;
    setProcessingId(user.id + 'lock');
    lockMutation.mutate({ id: user.id, isProfileLocked: nextState });
  };

  const executeSuspensionToggle = () => {
    if (!suspensionTarget) return;
    const { user, action } = suspensionTarget;
    const isSuspended = action === 'suspend';
    setProcessingId(user.id + 'suspend');
    suspendMutation.mutate({ id: user.id, isSuspended });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedUserIds(paginatedUsers.map((u) => u.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

    const exportUsersToCSV = () => {
    const listToExport = filteredUsers.length > 0 ? filteredUsers : users;
    if (!listToExport.length) {
      toast.error('No users available to export.');
      return;
    }

    const headers = [
      'User ID',
      'Legal First Name',
      'Legal Last Name',
      'Email Address',
      'Role',
      'Phone Number',
      'Ghana Card Number (NIN)',
      'KYC Verification Status',
      'GRA Tax Identification Number (TIN)',
      'ORC Business Reg No.',
      'Host Entity Type',
      'Disbursement Channel',
      'Settlement Provider',
      'Settlement Account',
      'Reputation Score',
      'Account Safety Status',
      'Profile Locked',
      '2FA Enabled',
      'Date Registered',
      'GRA Tenancy Taxpayer Ref'
    ];

    const rows = listToExport.map((u: any) => [
      `"${u.id}"`,
      `"${(u.firstName || '').replace(/"/g, '""')}"`,
      `"${(u.lastName || '').replace(/"/g, '""')}"`,
      `"${u.email || ''}"`,
      `"${u.role || ''}"`,
      `"'${u.phoneNumber || ''}"`,
      `"${u.ghanaCardNumber || 'N/A'}"`,
      `"${u.ghanaCardStatus || 'NOT_SUBMITTED'}"`,
      `"${u.tinNumber || 'N/A'}"`,
      `"${u.businessRegistrationNumber || 'N/A'}"`,
      `"${u.hostEntityType || 'INDIVIDUAL_OWNER'}"`,
      `"${u.payoutMethod || 'MOMO'}"`,
      `"${u.payoutProvider || 'MTN'}"`,
      `"'${u.payoutAccountNumber || u.phoneNumber || 'N/A'}"`,
      Number(u.reputationScore || 5.0).toFixed(1),
      `"${u.isSuspended ? 'SUSPENDED' : 'ACTIVE'}"`,
      u.isProfileLocked ? 'LOCKED' : 'UNLOCKED',
      u.twoFactorEnabled ? 'ACTIVE' : 'DISABLED',
      `"${new Date(u.createdAt).toISOString().split('T')[0]}"`,
      `"GRA-TXP-${(u.id || '').slice(0, 8).toUpperCase()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AkwaabaHomes_Users_Directory_GRA_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('User directory exported to CSV (GRA Tax Compliance Format).');
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-[#16A34A]" />
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Loading Users Directory &amp; Compliance Hub...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 animate-in">
      {/* ─── 1. HERO BANNER WITH LUXURY BUILDING & FLOATING STATS ──────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#eef8f2] via-[#e5f5eb] to-[#eaf7ee] dark:from-[#062919] dark:via-[#052014] dark:to-[#041a10] border border-[#d6f0de] dark:border-emerald-900/40 shadow-xs min-h-[160px] flex flex-col md:flex-row md:items-center justify-between p-6 sm:p-8 gap-6">
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

        {/* Hero left text content */}
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dcfce7] text-[#16a34a] dark:bg-emerald-900/50 dark:text-emerald-300 text-xs font-bold mb-3 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
            <span>User Management</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-zinc-950 dark:text-white tracking-tight">
            Users Directory &amp; Compliance Hub
          </h1>
          <p className="text-zinc-600 dark:text-zinc-300 text-xs sm:text-sm mt-2 leading-relaxed max-w-xl font-normal">
            Manage all users, verify identities, and ensure platform compliance with regulatory and data protection standards.
          </p>
        </div>

        {/* Hero right floating stat cards cluster */}
        <div className="relative z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl p-3 border border-white/90 dark:border-zinc-800 shadow-md flex items-center divide-x divide-zinc-100 dark:divide-zinc-800 shrink-0 self-start md:self-auto">
          {/* Total Users */}
          <div className="px-3 sm:px-4 py-1 text-center min-w-[70px] sm:min-w-[80px]">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center mx-auto mb-1">
              <Users className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white leading-tight">
              {stats.total}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
              Total Users
            </div>
          </div>

          {/* Active */}
          <div className="px-3 sm:px-4 py-1 text-center min-w-[70px] sm:min-w-[80px]">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-1">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white leading-tight">
              {stats.active}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
              Active
            </div>
          </div>

          {/* Pending KYC */}
          <div className="px-3 sm:px-4 py-1 text-center min-w-[70px] sm:min-w-[80px]">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-1">
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white leading-tight">
              {stats.pendingKyc}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
              Pending KYC
            </div>
          </div>

          {/* Suspended */}
          <div className="px-3 sm:px-4 py-1 text-center min-w-[70px] sm:min-w-[80px]">
            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-1">
              <Ban className="w-4 h-4" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white leading-tight">
              {stats.suspended}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
              Suspended
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. SEARCH, FILTER & INVITATION CONTROLS BAR ─────────────────── */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, phone, or Ghana Card PIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none focus:border-[#16A34A] focus:ring-1 focus:ring-[#16A34A] shadow-2xs transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Middle: Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter Dropdown */}
          <div className="relative">
            <select
              aria-label="Filter by user role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className="appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 pl-3.5 pr-8 py-2.5 outline-none cursor-pointer shadow-2xs transition"
            >
              <option value="ALL">All Roles</option>
              <option value="TENANT">Tenants</option>
              <option value="LANDLORD">Landlords</option>
              <option value="CARETAKER">Caretakers</option>
              <option value="ADMIN">Admins</option>
              <option value="SUPER_ADMIN">Super Admins</option>
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]">
              ▼
            </span>
          </div>

          {/* KYC Status Dropdown */}
          <div className="relative">
            <select
              aria-label="Filter by KYC verification status"
              value={kycFilter}
              onChange={(e) => setKycFilter(e.target.value as KycStatusFilter)}
              className="appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 pl-3.5 pr-8 py-2.5 outline-none cursor-pointer shadow-2xs transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="PENDING">Pending Review</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="RESUBMISSION_REQUIRED">Resubmission Req</option>
              <option value="REJECTED">Rejected</option>
              <option value="NOT_SUBMITTED">Not Submitted</option>
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]">
              ▼
            </span>
          </div>

          {/* Account Status Dropdown */}
          <div className="relative">
            <select
              aria-label="Filter by account security status"
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value as AccountStatusFilter)}
              className="appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-200 pl-3.5 pr-8 py-2.5 outline-none cursor-pointer shadow-2xs transition"
            >
              <option value="ALL">All Accounts</option>
              <option value="ACTIVE">Active Only</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="LOCKED">Locked Profiles</option>
              <option value="UNLOCK_REQUESTS">Unlock Requests</option>
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]">
              ▼
            </span>
          </div>

          {/* More Filters Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={clsx(
              "px-3.5 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer",
              showAdvancedFilters
                ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
            <span>More Filters</span>
          </button>

          {/* 1-Click Export CSV (GRA Tax & Tenancy Audit Format) */}
          <button
            type="button"
            onClick={exportUsersToCSV}
            className="px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:shadow transition cursor-pointer shrink-0"
            title="1-Click CSV Export for GRA Tax Compliance & Internal Audits"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
          </button>
          {/* Invite User Button */}
          <button
            type="button"
            onClick={() => setIsInviteModalOpen(true)}
            className="px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow transition cursor-pointer shrink-0 ml-auto xl:ml-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Invite User</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Sub-drawer (if toggled) */}
      {showAdvancedFilters && (
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in text-xs">
          <div>
            <label className="font-bold text-zinc-500 block mb-1">Quick Presets</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { setKycFilter('PENDING'); setRoleFilter('ALL'); setAccountFilter('ALL'); }}
                className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold border border-amber-200"
              >
                Pending Audits
              </button>
              <button
                onClick={() => { setAccountFilter('UNLOCK_REQUESTS'); }}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-200"
              >
                Unlock Requests
              </button>
              <button
                onClick={() => { setRoleFilter('LANDLORD'); setKycFilter('VERIFIED'); }}
                className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200"
              >
                Verified Landlords
              </button>
            </div>
          </div>
          <div>
            <label className="font-bold text-zinc-500 block mb-1">Active Filters</label>
            <p className="text-zinc-600 dark:text-zinc-300">
              Showing {filteredUsers.length} of {stats.total} total registered platform users.
            </p>
          </div>
          <div className="flex items-end justify-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
                setKycFilter('ALL');
                setAccountFilter('ALL');
                setShowAdvancedFilters(false);
              }}
              className="text-xs font-bold text-rose-600 hover:underline"
            >
              Reset all filters
            </button>
          </div>
        </div>
      )}

      {/* ─── 3. MAIN CONTENT: TABLE (LEFT) + SIDEBAR WIDGETS (RIGHT) ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT: TABLE SECTION (9 COLS) ── */}
        <div className="lg:col-span-9 bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#f8faf9] dark:bg-zinc-800/50 border-b border-zinc-200/70 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="w-10 px-4 py-3.5">
                    <input
                      type="checkbox"
                      aria-label="Select all users on current page"
                      onChange={handleSelectAll}
                      checked={
                        paginatedUsers.length > 0 &&
                        paginatedUsers.every((u) => selectedUserIds.includes(u.id))
                      }
                      className="rounded border-zinc-300 text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3.5 text-zinc-900 dark:text-zinc-100">User</th>
                  <th className="px-4 py-3.5 text-zinc-900 dark:text-zinc-100">Role</th>
                  <th className="px-4 py-3.5 text-zinc-900 dark:text-zinc-100">Contact Details</th>
                  <th className="px-4 py-3.5 text-zinc-900 dark:text-zinc-100">KYC Status</th>
                  <th className="px-4 py-3.5 text-zinc-900 dark:text-zinc-100">Account Status</th>
                  <th className="px-4 py-3.5 text-zinc-900 dark:text-zinc-100">Activity</th>
                  <th className="px-4 py-3.5 text-zinc-900 dark:text-zinc-100 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-14 text-center">
                      <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                      <p className="font-bold text-sm text-zinc-900 dark:text-white">No users match your search criteria</p>
                      <p className="text-zinc-500 text-xs mt-1">Try adjusting your filters, searching a different term, or clearing queries.</p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setRoleFilter('ALL');
                          setKycFilter('ALL');
                          setAccountFilter('ALL');
                        }}
                        className="mt-3 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user: any) => {
                    const initials = `${user.firstName?.[0] || 'U'}${user.lastName?.[0] || ''}`.toUpperCase();
                    const isSelected = selectedUserIds.includes(user.id);
                    const formattedPhone = formatPhoneNumber(user.phoneNumber);
                    const activityTime = formatActivityTime(user.updatedAt || user.createdAt);

                    // Pill Badge Styling by Role
                    const isSuperAdmin = user.role === 'SUPER_ADMIN';
                    const isAdmin = user.role === 'ADMIN';
                    const isLandlord = user.role === 'LANDLORD';
                    const isTenant = user.role === 'TENANT';

                    return (
                      <tr
                        key={user.id}
                        className={clsx(
                          "hover:bg-[#fbfcfb] dark:hover:bg-zinc-800/30 transition-colors",
                          isSelected && "bg-emerald-50/40 dark:bg-emerald-950/20"
                        )}
                      >
                        {/* Checkbox */}
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            aria-label={`Select user ${user.firstName || ''} ${user.lastName || ''}`}
                            checked={isSelected}
                            onChange={() => handleSelectRow(user.id)}
                            className="rounded border-zinc-300 text-[#16A34A] focus:ring-[#16A34A] cursor-pointer"
                          />
                        </td>

                        {/* User Identity */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden border border-zinc-200/80 dark:border-zinc-700">
                              {user.avatarUrl ? (
                                <img
                                  src={getImageUrl(user.avatarUrl)}
                                  alt={`${user.firstName} ${user.lastName}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{initials}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-zinc-950 dark:text-white truncate">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {isSuperAdmin && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F5F3FF] text-[#7C3AED] dark:bg-purple-950/50 dark:text-purple-300 border border-[#DDD6FE] dark:border-purple-800/50">
                              <ShieldCheck className="w-3 h-3 text-[#7C3AED]" />
                              <span>Super Admin</span>
                            </span>
                          )}
                          {isAdmin && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EEF2FF] text-[#4F46E5] dark:bg-indigo-950/50 dark:text-indigo-300 border border-[#C7D2FE] dark:border-indigo-800/50">
                              <Shield className="w-3 h-3 text-[#4F46E5]" />
                              <span>Admin</span>
                            </span>
                          )}
                          {isLandlord && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] dark:bg-blue-950/50 dark:text-blue-300 border border-[#BFDBFE] dark:border-blue-800/50">
                              <UserIcon className="w-3 h-3 text-[#2563EB]" />
                              <span>Landlord</span>
                            </span>
                          )}
                          {isTenant && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/50 dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800/50">
                              <UserIcon className="w-3 h-3 text-[#059669]" />
                              <span>Tenant</span>
                            </span>
                          )}
                          {!isSuperAdmin && !isAdmin && !isLandlord && !isTenant && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#D97706] dark:bg-amber-950/50 dark:text-amber-300 border border-[#FDE68A] dark:border-amber-800/50">
                              <Key className="w-3 h-3 text-[#D97706]" />
                              <span>{user.role}</span>
                            </span>
                          )}
                        </td>

                        {/* Contact Details */}
                        <td className="px-4 py-3.5 whitespace-nowrap font-medium text-zinc-700 dark:text-zinc-300">
                          {formattedPhone}
                        </td>

                        {/* KYC Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {user.ghanaCardStatus === 'VERIFIED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/50 dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800/50">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                              <span>Verified</span>
                            </span>
                          )}
                          {(user.ghanaCardStatus === 'PENDING' || user.ghanaCardStatus === 'UNDER_REVIEW') && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#D97706] dark:bg-amber-950/50 dark:text-amber-300 border border-[#FDE68A] dark:border-amber-800/50">
                              <Clock className="w-3.5 h-3.5 text-[#D97706]" />
                              <span>Pending</span>
                            </span>
                          )}
                          {user.ghanaCardStatus === 'RESUBMISSION_REQUIRED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF7ED] text-[#EA580C] dark:bg-orange-950/50 dark:text-orange-300 border border-[#FED7AA] dark:border-orange-800/50">
                              <AlertTriangle className="w-3.5 h-3.5 text-[#EA580C]" />
                              <span>Resubmit</span>
                            </span>
                          )}
                          {user.ghanaCardStatus === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF2F2] text-[#DC2626] dark:bg-rose-950/50 dark:text-rose-300 border border-[#FECACA] dark:border-rose-800/50">
                              <XCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                              <span>Rejected</span>
                            </span>
                          )}
                          {(!user.ghanaCardStatus || user.ghanaCardStatus === 'NOT_SUBMITTED') && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                              <span>Unverified</span>
                            </span>
                          )}
                        </td>

                        {/* Account Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {user.isSuspended ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF2F2] text-[#DC2626] dark:bg-rose-950/50 dark:text-rose-300 border border-[#FECACA] dark:border-rose-800/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                              <span>Suspended</span>
                            </span>
                          ) : user.isProfileLocked ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#D97706] dark:bg-amber-950/50 dark:text-amber-300 border border-[#FDE68A] dark:border-amber-800/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                              <span>Locked</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#059669] dark:bg-emerald-950/50 dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-800/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        {/* Activity */}
                        <td className="px-4 py-3.5 whitespace-nowrap text-zinc-500 dark:text-zinc-400 font-medium">
                          {activityTime}
                        </td>

                        {/* Actions (View, Edit, More) */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap relative">
                          <div className="flex items-center justify-end gap-1">
                            {/* Eye / View button */}
                            <button
                              type="button"
                              onClick={() => setSelectedUserForDrawer(user)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                              title="View User Dossier"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Edit / Quick Actions button */}
                            <button
                              type="button"
                              onClick={() => setSelectedUserForDrawer(user)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                              title="Edit User Credentials"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* More Options Menu button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveMenuId(activeMenuId === user.id ? null : user.id)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                title="More options"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {activeMenuId === user.id && (
                                <div
                                  ref={menuRef}
                                  className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1.5 z-50 text-left text-xs animate-in fade-in zoom-in-95"
                                >
                                  <button
                                    onClick={() => {
                                      setSelectedUserForDrawer(user);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-zinc-400" />
                                    <span>View Full Dossier</span>
                                  </button>

                                  <Link
                                    href={`/admin/verifications/${user.id}`}
                                    className="w-full px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                                  >
                                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Audit Ghana Card KYC</span>
                                  </Link>

                                  {user.role === 'LANDLORD' && (
                                    <Link
                                      href={`/admin/landlords/${user.id}`}
                                      className="w-full px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                                    >
                                      <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                      <span>Landlord Portfolio</span>
                                    </Link>
                                  )}

                                  {user.role === 'TENANT' && (
                                    <Link
                                      href={`/admin/tenants/${user.id}`}
                                      className="w-full px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                                    >
                                      <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Tenant Dossier</span>
                                    </Link>
                                  )}

                                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />

                                  <button
                                    onClick={() => {
                                      handleToggleLock(user);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-3.5 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-medium"
                                  >
                                    {user.isProfileLocked ? (
                                      <>
                                        <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Unlock Profile Editing</span>
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="w-3.5 h-3.5 text-zinc-400" />
                                        <span>Lock Profile Access</span>
                                      </>
                                    )}
                                  </button>

                                  {!isSuperAdmin && (
                                    <button
                                      onClick={() => {
                                        setSuspensionTarget({
                                          user,
                                          action: user.isSuspended ? 'unsuspend' : 'suspend'
                                        });
                                        setActiveMenuId(null);
                                      }}
                                      className={clsx(
                                        "w-full px-3.5 py-2 flex items-center gap-2 font-medium",
                                        user.isSuspended
                                          ? "text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                          : "text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                      )}
                                    >
                                      {user.isSuspended ? (
                                        <>
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Reinstate Account</span>
                                        </>
                                      ) : (
                                        <>
                                          <Ban className="w-3.5 h-3.5" />
                                          <span>Suspend Account</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(user.id);
                                      toast.success('User ID copied to clipboard');
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full px-3.5 py-2 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 font-mono text-[11px]"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>Copy User UUID</span>
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

          {/* Table Pagination Footer */}
          <div className="px-4 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 font-medium bg-[#fcfdfc] dark:bg-zinc-900/40">
            <div>
              Showing <span className="font-bold text-zinc-900 dark:text-white">{filteredUsers.length ? (currentPage - 1) * itemsPerPage + 1 : 0}</span>–
              <span className="font-bold text-zinc-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> of{' '}
              <span className="font-bold text-zinc-900 dark:text-white">{filteredUsers.length}</span> users
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
                        ? "bg-[#16A34A] text-white shadow-2xs"
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
          {/* Card 1: Quick Actions */}
          <div className="bg-[#f0fdf4] dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-4.5 space-y-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-zinc-950 dark:text-white font-black text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4 text-[#16A34A]" />
              <span>Quick Actions</span>
            </div>

            {/* Quick Action 1: Verify Pending KYC */}
            <button
              type="button"
              onClick={() => {
                setKycFilter('PENDING');
                toast.success('Filtered to Pending KYC submissions');
              }}
              className="w-full text-left p-3 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700 transition flex items-center gap-3 group cursor-pointer shadow-2xs"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <BadgeCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                  Verify Pending KYC
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  ({stats.pendingKyc} requests)
                </div>
              </div>
            </button>

            {/* Quick Action 2: Export Users */}
            <button
              type="button"
              onClick={exportUsersToCSV}
              className="w-full text-left p-3 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700 transition flex items-center gap-3 group cursor-pointer shadow-2xs"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Download className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                  Export Users
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  (Download CSV)
                </div>
              </div>
            </button>

            {/* Quick Action 3: View Audit Logs */}
            <Link
              href="/admin/audit"
              className="w-full text-left p-3 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700 transition flex items-center gap-3 group cursor-pointer shadow-2xs block"
            >
              <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                  View Audit Logs
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  (Act 843 compliance)
                </div>
              </div>
            </Link>
          </div>

          {/* Card 2: Stay Compliant Banner */}
          <div className="bg-gradient-to-br from-[#064e3b] via-[#043e30] to-[#022c22] text-white rounded-2xl p-5 relative overflow-hidden shadow-md border border-emerald-800/40">
            {/* Watermark Fingerprint SVG */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 opacity-15 pointer-events-none text-emerald-300">
              <Fingerprint className="w-full h-full" />
            </div>

            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center mb-3.5 text-emerald-300">
              <ShieldCheck className="w-5 h-5" />
            </div>

            <h3 className="text-sm font-extrabold text-white tracking-tight">
              Stay Compliant
            </h3>
            <p className="text-[11.5px] text-emerald-100/80 mt-1 leading-relaxed">
              Keep your user data secure and up to date.
            </p>

            <Link
              href="/admin/verifications"
              className="inline-flex items-center gap-1.5 mt-4 px-3.5 py-1.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs transition shadow-xs cursor-pointer"
            >
              <span>View Compliance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── MODAL: INVITE USER ─────────────────────────────────────────── */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-950 dark:text-white">Invite Platform User</h3>
                  <p className="text-xs text-zinc-500">Provide direct onboarding to tenant or landlord</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Registration Portal Link</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== 'undefined' ? `${window.location.origin}/register` : 'https://akwaabahomes.com/register'}
                    className="flex-1 p-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-mono text-zinc-600 dark:text-zinc-300 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        navigator.clipboard.writeText(`${window.location.origin}/register`);
                        toast.success('Registration link copied to clipboard');
                      }
                    }}
                    className="px-3.5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-[11.5px] text-emerald-900 dark:text-emerald-300 space-y-1">
                <p className="font-bold">✨ Fast-Track Onboarding</p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  New users can sign up immediately. To provision an administrator with elevated system access, please visit{' '}
                  <Link href="/admin/administrators" className="font-bold underline text-emerald-700 dark:text-emerald-300">
                    Administrator Governance
                  </Link>.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold hover:bg-zinc-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: USER QUICK DOSSIER DRAWER ───────────────────────────── */}
      {selectedUserForDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-sm text-zinc-700 dark:text-zinc-300 overflow-hidden border border-zinc-200">
                  {selectedUserForDrawer.avatarUrl ? (
                    <img
                      src={getImageUrl(selectedUserForDrawer.avatarUrl)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{`${selectedUserForDrawer.firstName?.[0] || 'U'}${selectedUserForDrawer.lastName?.[0] || ''}`}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-950 dark:text-white">
                    {selectedUserForDrawer.firstName} {selectedUserForDrawer.lastName}
                  </h3>
                  <p className="text-xs text-zinc-500 font-mono">{selectedUserForDrawer.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForDrawer(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Credentials & Compliance Details */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Role</span>
                  <p className="font-extrabold text-zinc-900 dark:text-white mt-0.5">{selectedUserForDrawer.role}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Phone</span>
                  <p className="font-extrabold text-zinc-900 dark:text-white mt-0.5">{formatPhoneNumber(selectedUserForDrawer.phoneNumber)}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Ghana Card PIN</span>
                  <p className="font-mono font-bold text-zinc-900 dark:text-white mt-0.5">{selectedUserForDrawer.ghanaCardNumber || 'Unsubmitted'}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Account Status</span>
                  <p className="font-extrabold text-zinc-900 dark:text-white mt-0.5">
                    {selectedUserForDrawer.isSuspended ? 'Suspended' : 'Active'}
                  </p>
                </div>
              </div>

              {/* Ghana Card Document Preview if exists */}
              {selectedUserForDrawer.ghanaCardFrontUrl && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">Ghana Card Document</span>
                    <button
                      type="button"
                      onClick={() => setZoomedImage({ url: getImageUrl(selectedUserForDrawer.ghanaCardFrontUrl), title: 'Ghana Card (Front)' })}
                      className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                    >
                      Fullscreen Zoom
                    </button>
                  </div>
                  <div className="max-h-40 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                    <img
                      src={getImageUrl(selectedUserForDrawer.ghanaCardFrontUrl)}
                      alt="Ghana Card Document"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Action Links */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <Link
                href={`/admin/verifications/${selectedUserForDrawer.id}`}
                className="px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>Open Verification Docket</span>
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleToggleLock(selectedUserForDrawer);
                    setSelectedUserForDrawer(null);
                  }}
                  className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  {selectedUserForDrawer.isProfileLocked ? 'Unlock Profile' : 'Lock Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserForDrawer(null)}
                  className="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: SUSPENSION CONFIRMATION ─────────────────────────────── */}
      {suspensionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className={clsx(
                "w-10 h-10 rounded-2xl flex items-center justify-center",
                suspensionTarget.action === 'suspend' ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
              )}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-zinc-950 dark:text-white">
                  {suspensionTarget.action === 'suspend' ? 'Confirm User Suspension' : 'Confirm Reinstatement'}
                </h3>
                <p className="text-xs text-zinc-500">Account Governance &amp; Security</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {suspensionTarget.action === 'suspend' ? (
                <>
                  Suspending <strong>{suspensionTarget.user.firstName} {suspensionTarget.user.lastName}</strong> will immediately terminate their active sessions, lock booking workflows, and hide listings.
                </>
              ) : (
                <>
                  Reinstating <strong>{suspensionTarget.user.firstName} {suspensionTarget.user.lastName}</strong> will restore access to their dashboard, saved rentals, and communication tools.
                </>
              )}
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setSuspensionTarget(null)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSuspensionToggle}
                disabled={processingId === suspensionTarget.user.id + 'suspend'}
                className={clsx(
                  "px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs cursor-pointer flex items-center gap-1.5",
                  suspensionTarget.action === 'suspend' ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                {processingId === suspensionTarget.user.id + 'suspend' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : suspensionTarget.action === 'suspend' ? (
                  'Confirm Suspension'
                ) : (
                  'Confirm Reinstatement'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: FULLSCREEN LIGHTBOX ZOOM ────────────────────────────── */}
      {zoomedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in">
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-3 text-white">
              <h3 className="font-extrabold text-sm">{zoomedImage.title}</h3>
              <button
                type="button"
                onClick={() => setZoomedImage(null)}
                className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold backdrop-blur-md cursor-pointer"
              >
                Close (Esc)
              </button>
            </div>
            <div className="border border-white/20 rounded-2xl overflow-hidden max-h-[80vh] bg-black">
              <img src={zoomedImage.url} alt={zoomedImage.title} className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
