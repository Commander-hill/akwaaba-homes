'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { 
  Loader2, 
  ShieldCheck, 
  User as UserIcon, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ShieldAlert,
  Search,
  Filter,
  Users,
  Building2,
  Lock,
  Unlock,
  FileText,
  Eye,
  Check,
  X,
  Mail,
  Phone,
  Clock,
  AlertCircle,
  BadgeCheck,
  Ban
} from 'lucide-react';

// Helper to safely format image URLs (Cloudinary, S3, data URIs, or local backend paths)
const getImageUrl = (url: string | null | undefined) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
};

type FilterRole = 'ALL' | 'LANDLORD' | 'TENANT' | 'CARETAKER' | 'ADMIN' | 'PENDING_KYC' | 'UNLOCK_REQUESTS' | 'SUSPENDED';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [unlockRequestUser, setUnlockRequestUser] = useState<any | null>(null);
  const [suspensionTarget, setSuspensionTarget] = useState<{ user: any; action: 'suspend' | 'unsuspend' } | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterRole>('ALL');

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data;
    }
  });

  // KPI Calculations
  const stats = useMemo(() => {
    if (!users || !Array.isArray(users)) {
      return { total: 0, landlords: 0, verifiedLandlords: 0, tenants: 0, pendingKyc: 0, unlockRequests: 0, suspended: 0 };
    }
    const total = users.length;
    const landlords = users.filter((u: any) => u.role === 'LANDLORD').length;
    const verifiedLandlords = users.filter((u: any) => u.role === 'LANDLORD' && u.isVerifiedLandlord).length;
    const tenants = users.filter((u: any) => u.role === 'TENANT').length;
    const pendingKyc = users.filter((u: any) => u.ghanaCardStatus === 'PENDING').length;
    const unlockRequests = users.filter((u: any) => u.profileUnlockRequested).length;
    const suspended = users.filter((u: any) => u.isSuspended).length;

    return { total, landlords, verifiedLandlords, tenants, pendingKyc, unlockRequests, suspended };
  }, [users]);

  // Filtered and Searched Users
  const filteredUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];

    return users.filter((u: any) => {
      // Role & status filter
      if (activeFilter === 'LANDLORD' && u.role !== 'LANDLORD') return false;
      if (activeFilter === 'TENANT' && u.role !== 'TENANT') return false;
      if (activeFilter === 'CARETAKER' && u.role !== 'CARETAKER') return false;
      if (activeFilter === 'ADMIN' && u.role !== 'ADMIN') return false;
      if (activeFilter === 'PENDING_KYC' && u.ghanaCardStatus !== 'PENDING') return false;
      if (activeFilter === 'UNLOCK_REQUESTS' && !u.profileUnlockRequested) return false;
      if (activeFilter === 'SUSPENDED' && !u.isSuspended) return false;

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        const email = (u.email || '').toLowerCase();
        const phone = (u.phoneNumber || '').toLowerCase();
        const cardNum = (u.ghanaCardNumber || '').toLowerCase();

        return fullName.includes(query) || email.includes(query) || phone.includes(query) || cardNum.includes(query);
      }

      return true;
    });
  }, [users, activeFilter, searchQuery]);

  // Mutations
  const verifyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await api.put(`/admin/verify-user/${id}`, { status });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Ghana Card KYC status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update KYC status');
    },
    onSettled: () => setProcessingId(null)
  });

  const verifyLandlordMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await api.put(`/admin/verify-landlord/${id}`, { status });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Landlord Act 220 verification updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to verify landlord');
    },
    onSettled: () => setProcessingId(null)
  });

  const handleVerifyLandlord = (id: string, status: string) => {
    setProcessingId(id + 'landlord');
    verifyLandlordMutation.mutate({ id, status });
  };

  const suspendMutation = useMutation({
    mutationFn: async ({ id, isSuspended }: { id: string, isSuspended: boolean }) => {
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
    mutationFn: async ({ id, isProfileLocked }: { id: string, isProfileLocked: boolean }) => {
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

  const handleVerify = (id: string, status: string) => {
    setProcessingId(id + 'verify');
    verifyMutation.mutate({ id, status });
  };

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-9 h-9 animate-spin text-[#0F5132]" />
        <p className="text-sm font-semibold text-slate-500">Loading statutory user directory...</p>
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
              Act 220 & NIA Directory
            </span>
            <span className="text-xs font-semibold text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {stats.total} Registered Accounts
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            User Directory & Compliance Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Institutional oversight of residential tenants, verified landlords, Ghana Card (NIA) biometric records, and profile security.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#0F5132]/10 text-[#0F5132] dark:bg-emerald-950/50 dark:text-emerald-400 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 shadow-xs">
            <UserIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ─── 4-CARD EXECUTIVE KPI STRIP ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div 
          onClick={() => setActiveFilter('ALL')}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Members</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 group-hover:bg-[#0F5132] group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {stats.total}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <span className="font-semibold text-blue-600 dark:text-blue-400">{stats.landlords} Landlords</span>
            <span>•</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{stats.tenants} Tenants</span>
          </div>
        </div>

        {/* Pending Ghana Card KYC */}
        <div 
          onClick={() => setActiveFilter('PENDING_KYC')}
          className={`cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all shadow-xs group ${
            stats.pendingKyc > 0 
              ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/10 hover:border-amber-400' 
              : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending KYC Audits</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              stats.pendingKyc > 0 ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.pendingKyc}
            </div>
            {stats.pendingKyc > 0 && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-white animate-pulse">
                Action Req
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.pendingKyc === 0 ? 'All Ghana Cards reviewed' : 'Awaiting admin identity audit'}
          </p>
        </div>

        {/* Verified Landlord Portfolios */}
        <div 
          onClick={() => setActiveFilter('LANDLORD')}
          className="cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 transition-all shadow-xs group"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Act 220 Landlords</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">
            {stats.verifiedLandlords} <span className="text-sm font-semibold text-slate-400">/ {stats.landlords}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Verified ownership deeds & indentures
          </p>
        </div>

        {/* Profile Unlock Requests */}
        <div 
          onClick={() => setActiveFilter('UNLOCK_REQUESTS')}
          className={`cursor-pointer bg-white dark:bg-slate-900 p-5 rounded-2xl border transition-all shadow-xs group ${
            stats.unlockRequests > 0 
              ? 'border-indigo-300 dark:border-indigo-700/60 bg-indigo-50/20 dark:bg-indigo-950/10 hover:border-indigo-400' 
              : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-400'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Edit Requests</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              stats.unlockRequests > 0 ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              <Unlock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats.unlockRequests}
            </div>
            {stats.unlockRequests > 0 && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-600 text-white animate-pulse">
                Pending
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {stats.unlockRequests === 0 ? 'No pending profile edit requests' : 'Users requested profile change access'}
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
              placeholder="Search by name, email, phone, or Ghana Card PIN..."
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

          {/* Quick status count note */}
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 self-center">
            <span>Showing</span>
            <span className="font-extrabold text-slate-800 dark:text-slate-200">{filteredUsers.length}</span>
            <span>of</span>
            <span className="font-extrabold text-slate-800 dark:text-slate-200">{stats.total} users</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeFilter === 'ALL'
                ? 'bg-[#0F5132] text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            All Accounts ({stats.total})
          </button>

          <button
            onClick={() => setActiveFilter('LANDLORD')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeFilter === 'LANDLORD'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Landlords ({stats.landlords})
          </button>

          <button
            onClick={() => setActiveFilter('TENANT')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeFilter === 'TENANT'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Tenants ({stats.tenants})
          </button>

          <button
            onClick={() => setActiveFilter('PENDING_KYC')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilter === 'PENDING_KYC'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Pending KYC ({stats.pendingKyc})
            {stats.pendingKyc > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveFilter('UNLOCK_REQUESTS')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilter === 'UNLOCK_REQUESTS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Unlock Requests ({stats.unlockRequests})
            {stats.unlockRequests > 0 && (
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveFilter('SUSPENDED')}
            className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeFilter === 'SUSPENDED'
                ? 'bg-red-700 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Suspended ({stats.suspended})
          </button>
        </div>
      </div>

      {/* ─── INSTITUTIONAL USERS TABLE ───────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-[#0F5132] text-white shadow-xs">
              <tr>
                <th className="px-6 py-4 font-black tracking-wider text-white">User & Contact</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Platform Role</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Ghana Card (NIA)</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Landlord Title Deed</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Profile Access</th>
                <th className="px-6 py-4 font-black tracking-wider text-white">Status</th>
                <th className="px-6 py-4 font-black tracking-wider text-white text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-bold text-sm">No accounts found matching your criteria.</p>
                    <button 
                      onClick={() => { setActiveFilter('ALL'); setSearchQuery(''); }}
                      className="mt-2 text-xs font-bold text-[#0F5132] hover:underline"
                    >
                      Clear search filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: any) => {
                  const isAdmin = user.role === 'ADMIN';
                  const initials = `${(user.firstName || 'U')[0]}${(user.lastName || '')[0] || ''}`.toUpperCase();

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      {/* User & Contact Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs ${
                            user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                            user.role === 'LANDLORD' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                            user.role === 'CARETAKER' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-extrabold text-slate-900 dark:text-white truncate">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{user.email}</span>
                            </div>
                            {user.phoneNumber && (
                              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{user.phoneNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Platform Role */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black ${
                          user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40' :
                          user.role === 'LANDLORD' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40' :
                          user.role === 'CARETAKER' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40' :
                          'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                        }`}>
                          {user.role === 'ADMIN' && <ShieldAlert className="w-3 h-3" />}
                          {user.role === 'LANDLORD' && <Building2 className="w-3 h-3" />}
                          {user.role === 'TENANT' && <UserIcon className="w-3 h-3" />}
                          {user.role}
                        </span>
                      </td>

                      {/* Ghana Card KYC */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            user.ghanaCardStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40' :
                            user.ghanaCardStatus === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40' :
                            user.ghanaCardStatus === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/40' :
                            'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {user.ghanaCardStatus === 'VERIFIED' && <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                            {user.ghanaCardStatus === 'PENDING' && <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-spin" />}
                            {user.ghanaCardStatus === 'REJECTED' && <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />}
                            {user.ghanaCardStatus === 'VERIFIED' ? 'Verified' :
                             user.ghanaCardStatus === 'PENDING' ? 'Pending Review' :
                             user.ghanaCardStatus === 'REJECTED' ? 'Rejected' : 'Not Submitted'}
                          </span>

                          {user.ghanaCardNumber && (
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {user.ghanaCardNumber}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Landlord Title Deed */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.role === 'LANDLORD' ? (
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              user.isVerifiedLandlord 
                                ? 'bg-blue-600 text-white shadow-xs' 
                                : user.landlordVerificationStatus === 'PENDING' 
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200' 
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {user.isVerifiedLandlord && <BadgeCheck className="w-3 h-3 text-white" />}
                              {user.isVerifiedLandlord ? 'Act 220 Verified 🛡️' : (user.landlordVerificationStatus || 'Unverified')}
                            </span>
                            {user.landlordDocUrl && (
                              <div>
                                <button
                                  onClick={() => setSelectedUser(user)}
                                  className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                >
                                  <FileText className="w-3 h-3" />
                                  Inspect Title Deed
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Profile Access & Edit Requests */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              user.isProfileLocked
                                ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/50'
                            }`}>
                              {user.isProfileLocked ? <Lock className="w-3 h-3 text-slate-500" /> : <Unlock className="w-3 h-3 text-emerald-600" />}
                              {user.isProfileLocked ? 'Locked' : 'Editable'}
                            </span>

                            {user.profileUnlockRequested && (
                              <button
                                onClick={() => setUnlockRequestUser(user)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs animate-pulse"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Edit Req
                              </button>
                            )}
                          </div>

                          {/* Subtle request preview */}
                          {user.profileUnlockRequested && user.profileUnlockReason && (
                            <div 
                              onClick={() => setUnlockRequestUser(user)}
                              className="cursor-pointer max-w-[200px] text-[11px] text-indigo-700 dark:text-indigo-300 font-medium truncate bg-indigo-50/60 dark:bg-indigo-950/30 px-2 py-1 rounded-lg border border-indigo-100 dark:border-indigo-900/40 hover:underline"
                            >
                              &quot;{user.profileUnlockReason}&quot;
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Account Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          user.isSuspended
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/40'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.isSuspended ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          {user.isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Review KYC button (if pending or deed exists) */}
                          {(user.ghanaCardStatus === 'PENDING' || (user.role === 'LANDLORD' && user.landlordDocUrl)) && (
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="px-2.5 py-1.5 bg-[#0F5132] hover:bg-[#146c43] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                              title="Audit submitted statutory documents"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Review
                            </button>
                          )}

                          {/* Quick Approve Edit Access (if requested) */}
                          {user.profileUnlockRequested && (
                            <button
                              onClick={() => handleToggleLock(user)}
                              disabled={processingId === user.id + 'lock'}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                              title="Grant Profile Edit Access"
                            >
                              {processingId === user.id + 'lock' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Unlock className="w-3.5 h-3.5" />
                                  Unlock
                                </>
                              )}
                            </button>
                          )}

                          {/* Lock / Unlock Toggle Button */}
                          {!user.profileUnlockRequested && (
                            <button
                              onClick={() => handleToggleLock(user)}
                              disabled={processingId === user.id + 'lock'}
                              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                              title={user.isProfileLocked ? 'Unlock Profile' : 'Lock Profile'}
                            >
                              {processingId === user.id + 'lock' ? (
                                <Loader2 className="w-4 h-4 animate-spin text-[#0F5132]" />
                              ) : user.isProfileLocked ? (
                                <Lock className="w-4 h-4 text-slate-500" />
                              ) : (
                                <Unlock className="w-4 h-4 text-emerald-600" />
                              )}
                            </button>
                          )}

                          {/* Suspend / Unsuspend (Disabled for Admin) */}
                          {!isAdmin ? (
                            <button
                              onClick={() => setSuspensionTarget({ user, action: user.isSuspended ? 'unsuspend' : 'suspend' })}
                              disabled={processingId === user.id + 'suspend'}
                              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 ${
                                user.isSuspended
                                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200'
                                  : 'bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 dark:bg-slate-800 dark:hover:bg-red-950/40 dark:text-slate-300 dark:hover:text-red-300 border border-slate-200 dark:border-slate-700'
                              }`}
                              title={user.isSuspended ? 'Unsuspend Account' : 'Suspend Account'}
                            >
                              {processingId === user.id + 'suspend' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : user.isSuspended ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  Unsuspend
                                </>
                              ) : (
                                <>
                                  <Ban className="w-3.5 h-3.5" />
                                  Suspend
                                </>
                              )}
                            </button>
                          ) : (
                            <span 
                              className="px-2 py-1 text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg cursor-not-allowed"
                              title="Administrator accounts cannot be suspended"
                            >
                              Protected
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL: PROFILE UNLOCK REQUEST DETAILS ──────────────────────── */}
      {unlockRequestUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                  <Unlock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    Profile Edit Request
                  </span>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {unlockRequestUser.firstName} {unlockRequestUser.lastName}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setUnlockRequestUser(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                User&apos;s Stated Rationale:
              </span>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 italic bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
                &quot;{unlockRequestUser.profileUnlockReason || 'No specific reason entered.'}&quot;
              </p>
              <div className="text-xs text-slate-400 pt-1 flex items-center justify-between">
                <span>Account Role: <strong className="text-slate-700 dark:text-slate-300">{unlockRequestUser.role}</strong></span>
                <span>Email: <strong className="text-slate-700 dark:text-slate-300">{unlockRequestUser.email}</strong></span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Granting edit access unlocks the account so the user can update their Ghana Card PIN, phone number, or residential details.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setUnlockRequestUser(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  handleToggleLock(unlockRequestUser);
                  setUnlockRequestUser(null);
                }}
                disabled={processingId === unlockRequestUser.id + 'lock'}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5"
              >
                {processingId === unlockRequestUser.id + 'lock' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    Approve & Unlock Profile
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONFIRM SUSPENSION ──────────────────────────────────── */}
      {suspensionTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 shadow-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${
                suspensionTarget.action === 'suspend' 
                  ? 'bg-red-100 text-red-600 dark:bg-red-950/50' 
                  : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50'
              }`}>
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Account Governance
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
                  {suspensionTarget.action === 'suspend' ? 'Confirm User Suspension' : 'Confirm Account Unsuspension'}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {suspensionTarget.action === 'suspend' ? (
                <>
                  Suspending <strong>{suspensionTarget.user.firstName} {suspensionTarget.user.lastName}</strong> will immediately terminate all active sessions, freeze their property listings, and block booking actions on Akwaaba Homes.
                </>
              ) : (
                <>
                  Unsuspending <strong>{suspensionTarget.user.firstName} {suspensionTarget.user.lastName}</strong> will restore full access to their dashboard, saved rentals, and booking communications.
                </>
              )}
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setSuspensionTarget(null)} 
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={executeSuspensionToggle} 
                disabled={processingId === suspensionTarget.user.id + 'suspend'}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 text-white ${
                  suspensionTarget.action === 'suspend' 
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' 
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                }`}
              >
                {processingId === suspensionTarget.user.id + 'suspend' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  suspensionTarget.action === 'suspend' ? 'Confirm Suspension' : 'Confirm Restore Access'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: STATUTORY KYC & GHANA CARD AUDIT ─────────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-emerald-900/30 max-h-[92vh] flex flex-col">
            {/* Gradient Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#0F5132] via-[#146c43] to-slate-900 text-white flex justify-between items-center relative overflow-hidden shadow-md">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-3.5 z-10">
                <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 border border-white/10 shadow-inner">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Act 220 & Ghana Card Audit
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
                    Statutory ID Verification: {selectedUser.firstName} {selectedUser.lastName}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all backdrop-blur-sm z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-slate-950/50">
              {/* User Metadata Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Account Identity
                  </span>
                  <p className="font-extrabold text-base text-slate-900 dark:text-white">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                  <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    selectedUser.role === 'LANDLORD' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {selectedUser.role}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Direct Contact
                  </span>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {selectedUser.email}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Phone: {selectedUser.phoneNumber || 'Not provided'}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Ghana Card PIN (NIA)
                  </span>
                  <div>
                    <code className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono font-black text-[#0F5132] dark:text-emerald-400 text-sm border border-emerald-200/60 dark:border-emerald-800/40 inline-block">
                      {selectedUser.ghanaCardNumber || 'NOT PROVIDED'}
                    </code>
                  </div>
                </div>
              </div>

              {/* ID Document Images (Front & Back) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Front of ID */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0F5132]" />
                      Document 01: Ghana Card Front
                    </h3>
                    {selectedUser.ghanaCardFrontUrl && (
                      <button
                        onClick={() => setZoomedImage({ url: getImageUrl(selectedUser.ghanaCardFrontUrl), title: 'Ghana Card (Front)' })}
                        className="text-xs font-bold text-[#0F5132] dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Enlarge
                      </button>
                    )}
                  </div>

                  <div className="relative group border-2 border-dashed border-emerald-200 dark:border-emerald-900/50 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 min-h-[220px] flex items-center justify-center p-2 shadow-xs">
                    {selectedUser.ghanaCardFrontUrl ? (
                      <img
                        src={getImageUrl(selectedUser.ghanaCardFrontUrl)}
                        alt="Front side of Ghana Card"
                        className="w-full max-h-[260px] object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-center p-6 text-slate-400">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-xs font-bold">No Front ID Image Uploaded</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Back of ID */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      Document 02: Ghana Card Back
                    </h3>
                    {selectedUser.ghanaCardBackUrl && (
                      <button
                        onClick={() => setZoomedImage({ url: getImageUrl(selectedUser.ghanaCardBackUrl), title: 'Ghana Card (Back)' })}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Enlarge
                      </button>
                    )}
                  </div>

                  <div className="relative group border-2 border-dashed border-emerald-200 dark:border-emerald-900/50 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 min-h-[220px] flex items-center justify-center p-2 shadow-xs">
                    {selectedUser.ghanaCardBackUrl ? (
                      <img
                        src={getImageUrl(selectedUser.ghanaCardBackUrl)}
                        alt="Back side of Ghana Card"
                        className="w-full max-h-[260px] object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-center p-6 text-slate-400">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-xs font-bold">No Back ID Image Uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Landlord Property Deed / Indenture Section */}
              {selectedUser.role === 'LANDLORD' && selectedUser.landlordDocUrl && (
                <div className="space-y-2 pt-4 border-t border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      Act 220 Landlord Document: Property Ownership Deed / Indenture 📄
                    </h3>
                    <button
                      onClick={() => setZoomedImage({ url: getImageUrl(selectedUser.landlordDocUrl), title: 'Property Ownership Deed / Indenture' })}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Enlarge Full Document
                    </button>
                  </div>

                  <div className="relative group border-2 border-dashed border-blue-200 dark:border-blue-900/50 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 min-h-[220px] flex items-center justify-center p-2 shadow-xs">
                    <img
                      src={getImageUrl(selectedUser.landlordDocUrl)}
                      alt="Property Deed"
                      className="w-full max-h-[280px] object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Approving assigns verified statutory credentials under Ghana Rent Act (Act 220) and NIA standards.
              </p>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                {selectedUser.role === 'LANDLORD' && (
                  <button
                    onClick={() => handleVerifyLandlord(selectedUser.id, 'VERIFIED')}
                    disabled={processingId === selectedUser.id + 'landlord'}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5"
                  >
                    {processingId === selectedUser.id + 'landlord' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Verify Landlord Deed 🛡️
                  </button>
                )}

                <button
                  onClick={() => handleVerify(selectedUser.id, 'REJECTED')}
                  disabled={processingId === selectedUser.id + 'verify'}
                  className="px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Reject ID
                </button>

                <button
                  onClick={() => handleVerify(selectedUser.id, 'VERIFIED')}
                  disabled={processingId === selectedUser.id + 'verify'}
                  className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#146c43] text-white rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
                >
                  {processingId === selectedUser.id + 'verify' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approve Ghana Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: FULLSCREEN LIGHTBOX ZOOM ────────────────────────────── */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in">
          <div className="relative max-w-5xl w-full flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-3 text-white">
              <h3 className="font-extrabold text-base">{zoomedImage.title}</h3>
              <button
                onClick={() => setZoomedImage(null)}
                className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold backdrop-blur-md"
              >
                Close Lightbox (Esc)
              </button>
            </div>
            <div className="border border-white/20 rounded-2xl overflow-hidden max-h-[85vh] bg-black">
              <img src={zoomedImage.url} alt={zoomedImage.title} className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
