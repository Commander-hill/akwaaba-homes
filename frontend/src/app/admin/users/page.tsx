'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { Loader2, ShieldCheck, User as UserIcon, CheckCircle, XCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

// Helper to safely format image URLs (Cloudinary, S3, data URIs, or local backend paths)
const getImageUrl = (url: string | null | undefined) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return `${baseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [suspensionTarget, setSuspensionTarget] = useState<{ user: any; action: 'suspend' | 'unsuspend' } | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data;
    }
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const res = await api.put(`/admin/verify-user/${id}`, { status });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'KYC status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update KYC status');
    },
    onSettled: () => setProcessingId(null)
  });

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
      toast.success(data?.message || 'Profile lock state updated');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
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

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">User Management</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">Manage accounts, verify IDs, grant edit permissions, and suspend fraudulent users.</p>
        </div>
        <div className="p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
          <UserIcon className="w-8 h-8" />
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-white uppercase bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#E06D53] shadow-md">
              <tr>
                <th className="px-6 py-4 font-extrabold text-white">User</th>
                <th className="px-6 py-4 font-extrabold text-white">Role</th>
                <th className="px-6 py-4 font-extrabold text-white">Ghana Card (KYC)</th>
                <th className="px-6 py-4 font-extrabold text-white">Profile Lock & Edit Requests</th>
                <th className="px-6 py-4 font-extrabold text-white">Account Status</th>
                <th className="px-6 py-4 font-extrabold text-white text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users?.map((user: any) => (
                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="px-6 py-4 font-medium">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center font-bold">
                        {user.firstName[0]}{user.lastName[0]}
                      </div>
                      <div>
                        <div className="font-bold text-[var(--foreground)]">{user.firstName} {user.lastName}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' :
                      user.role === 'LANDLORD' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        user.ghanaCardStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' :
                        user.ghanaCardStatus === 'PENDING' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300' :
                        user.ghanaCardStatus === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {user.ghanaCardStatus}
                      </span>
                      {user.ghanaCardStatus === 'PENDING' && (
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
                        >
                          Review ID
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          user.isProfileLocked
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        }`}>
                          {user.isProfileLocked ? '🔒 Locked' : '🔓 Editable'}
                        </span>
                        
                        {user.profileUnlockRequested && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-red-500 text-white animate-pulse shadow-sm">
                            ⚠️ Edit Requested
                          </span>
                        )}
                      </div>
                      
                      {user.profileUnlockRequested && user.profileUnlockReason && (
                        <p className="text-xs italic text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-1.5 rounded-lg border border-amber-200 dark:border-amber-900/50">
                          &quot;{user.profileUnlockReason}&quot;
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      user.isSuspended ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                    }`}>
                      {user.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    {/* Grant / Revoke Profile Edit Access */}
                    <button
                      onClick={() => handleToggleLock(user)}
                      disabled={processingId === user.id + 'lock'}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm ${
                        user.profileUnlockRequested
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-bounce'
                          : user.isProfileLocked
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {processingId === user.id + 'lock' ? (
                        <Loader2 className="w-3 h-3 animate-spin inline" />
                      ) : user.profileUnlockRequested ? (
                        '✅ Approve Edit Access Request'
                      ) : user.isProfileLocked ? (
                        'Unlock Profile'
                      ) : (
                        'Lock Profile'
                      )}
                    </button>

                    {/* Verify Ghana Card Action */}
                    {user.ghanaCardStatus === 'PENDING' && (
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Verify ID
                      </button>
                    )}

                    {/* Suspend / Unsuspend Action */}
                    <button
                      onClick={() => setSuspensionTarget({ user, action: user.isSuspended ? 'unsuspend' : 'suspend' })}
                      disabled={processingId === user.id + 'suspend'}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        user.isSuspended ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {processingId === user.id + 'suspend' ? (
                        <Loader2 className="w-3 h-3 animate-spin inline" />
                      ) : user.isSuspended ? (
                        'Unsuspend'
                      ) : (
                        'Suspend'
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── CONFIRM SUSPENSION MODAL ─────────────────────────────────────────────── */}
      {suspensionTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[var(--border)] space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${suspensionTarget.action === 'suspend' ? 'bg-red-100 text-red-600 dark:bg-red-950/50' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50'}`}>
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-[var(--foreground)]">
                  {suspensionTarget.action === 'suspend' ? 'Confirm User Suspension' : 'Confirm Account Unsuspension'}
                </h3>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
               <button onClick={() => setSuspensionTarget(null)} className="px-4 py-2 text-xs font-bold text-slate-600">Cancel</button>
               <button onClick={executeSuspensionToggle} className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REVIEW ID MODAL (PREMIUM ULTRA DESIGN) ───────────────────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-indigo-100 dark:border-indigo-900/50 max-h-[92vh] flex flex-col">
            {/* Gradient Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 text-white flex justify-between items-center relative overflow-hidden shadow-md">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center gap-3.5 z-10">
                <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300 border border-white/10 shadow-inner">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Ghana Card Verification Audit
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
                    Review Identity: {selectedUser.firstName} {selectedUser.lastName}
                  </h2>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all backdrop-blur-sm z-10"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50 dark:bg-slate-950/50">
              {/* User Metadata Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-[var(--border)] shadow-sm">
                <div>
                  <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider block mb-1">
                    Full Name & Role
                  </span>
                  <p className="font-extrabold text-base text-[var(--foreground)]">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                  <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {selectedUser.role}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider block mb-1">
                    Contact & Gender
                  </span>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {selectedUser.email}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    Phone: {selectedUser.phoneNumber || 'N/A'} • Gender: {selectedUser.gender || 'Not specified'}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider block mb-1">
                    Submitted Ghana Card PIN
                  </span>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono font-extrabold text-indigo-600 dark:text-indigo-400 text-sm border border-indigo-200 dark:border-indigo-900/50">
                      {selectedUser.ghanaCardNumber || 'NOT PROVIDED'}
                    </code>
                  </div>
                </div>
              </div>

              {/* ID Document Images */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Front of ID */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      Document 01: Front Side
                    </h3>
                    {selectedUser.ghanaCardFrontUrl && (
                      <button
                        onClick={() => setZoomedImage({ url: getImageUrl(selectedUser.ghanaCardFrontUrl), title: 'Front of Ghana Card' })}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Enlarge / Fullscreen
                      </button>
                    )}
                  </div>

                  <div className="relative group border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-2xl overflow-hidden bg-slate-900/5 dark:bg-slate-900 min-h-[220px] flex items-center justify-center p-2 shadow-inner">
                    {selectedUser.ghanaCardFrontUrl ? (
                      <img
                        src={getImageUrl(selectedUser.ghanaCardFrontUrl)}
                        alt="Front side of Ghana Card"
                        className="w-full max-h-[280px] object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-center p-6 text-[var(--muted-foreground)]">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-xs font-bold">No Front ID Image Uploaded</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Back of ID */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-[var(--foreground)] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500" />
                      Document 02: Back Side
                    </h3>
                    {selectedUser.ghanaCardBackUrl && (
                      <button
                        onClick={() => setZoomedImage({ url: getImageUrl(selectedUser.ghanaCardBackUrl), title: 'Back of Ghana Card' })}
                        className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        Enlarge / Fullscreen
                      </button>
                    )}
                  </div>

                  <div className="relative group border-2 border-dashed border-purple-200 dark:border-purple-900/50 rounded-2xl overflow-hidden bg-slate-900/5 dark:bg-slate-900 min-h-[220px] flex items-center justify-center p-2 shadow-inner">
                    {selectedUser.ghanaCardBackUrl ? (
                      <img
                        src={getImageUrl(selectedUser.ghanaCardBackUrl)}
                        alt="Back side of Ghana Card"
                        className="w-full max-h-[280px] object-contain rounded-xl transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="text-center p-6 text-[var(--muted-foreground)]">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-xs font-bold">No Back ID Image Uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-5 bg-white dark:bg-slate-900 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-center gap-3">
              <p className="text-xs text-[var(--muted-foreground)]">
                Approving this verification will grant the user official <strong className="text-emerald-600">VERIFIED</strong> status.
              </p>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => handleVerify(selectedUser.id, 'REJECTED')}
                  disabled={processingId === selectedUser.id + 'verify'}
                  className="flex-1 sm:flex-none px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-900/50 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  {processingId === selectedUser.id + 'verify' ? 'Processing...' : 'Reject Application'}
                </button>

                <button
                  onClick={() => handleVerify(selectedUser.id, 'VERIFIED')}
                  disabled={processingId === selectedUser.id + 'verify'}
                  className="flex-1 sm:flex-none px-7 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {processingId === selectedUser.id + 'verify' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Approve & Verify Identity
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── FULLSCREEN LIGHTBOX ZOOM MODAL ───────────────────────────────────────── */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in">
          <div className="relative max-w-5xl w-full flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-3 text-white">
              <h3 className="font-extrabold text-lg">{zoomedImage.title}</h3>
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
