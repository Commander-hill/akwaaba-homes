'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { Loader2, ShieldCheck, User as UserIcon, CheckCircle, XCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [suspensionTarget, setSuspensionTarget] = useState<{ user: any; action: 'suspend' | 'unsuspend' } | null>(null);

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
      toast.error(err.response?.data?.message || 'Failed to update user suspension state');
    },
    onSettled: () => setProcessingId(null)
  });

  const handleVerify = (id: string, status: string) => {
    setProcessingId(id + 'verify');
    verifyMutation.mutate({ id, status });
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
          <p className="mt-2 text-[var(--muted-foreground)]">Manage accounts, verify IDs, and suspend fraudulent users.</p>
        </div>
        <div className="p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
          <UserIcon className="w-8 h-8" />
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[var(--muted-foreground)] uppercase bg-slate-50 dark:bg-slate-900/80 border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 font-medium">User</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Ghana Card (KYC)</th>
                <th className="px-6 py-4 font-medium">Account Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users?.map((user: any) => (
                <tr key={user.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${user.isSuspended ? 'opacity-70 grayscale bg-red-50/10' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <div className="font-bold text-[var(--foreground)]">{user.firstName} {user.lastName}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">{user.email}</div>
                        {user.role === 'TENANT' && <div className="text-[10px] mt-1 font-bold text-amber-500">Rep: {(user.reputationScore / 10).toFixed(1)}/5.0</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-mono text-[var(--muted-foreground)] text-xs mb-1">{user.ghanaCardNumber || 'No ID'}</div>
                    <span className={`px-2 py-1 flex items-center gap-1 w-fit rounded-full text-[10px] font-bold ${
                      user.ghanaCardStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      user.ghanaCardStatus === 'PENDING' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      user.ghanaCardStatus === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {user.ghanaCardStatus === 'VERIFIED' && <CheckCircle className="w-3 h-3" />}
                      {user.ghanaCardStatus ? user.ghanaCardStatus.replace('_', ' ') : 'NOT SUBMITTED'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.isSuspended ? (
                       <span className="flex items-center gap-1 text-red-500 font-bold text-xs"><AlertTriangle className="w-4 h-4"/> SUSPENDED</span>
                    ) : (
                       <span className="flex items-center gap-1 text-emerald-500 font-bold text-xs"><CheckCircle className="w-4 h-4"/> ACTIVE</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      {user.ghanaCardStatus === 'PENDING' && (
                        <button onClick={() => setSelectedUser(user)} className="px-3 py-1 bg-[var(--primary)] text-white rounded-md text-xs font-bold hover:opacity-90 transition-opacity w-fit">Review ID</button>
                      )}
                      {user.role !== 'ADMIN' && (
                        user.isSuspended ? (
                          <button 
                            onClick={() => setSuspensionTarget({ user, action: 'unsuspend' })} 
                            disabled={processingId === user.id + 'suspend'} 
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold w-fit inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            {processingId === user.id + 'suspend' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            Unsuspend Account
                          </button>
                        ) : (
                          <button 
                            onClick={() => setSuspensionTarget({ user, action: 'suspend' })} 
                            disabled={processingId === user.id + 'suspend'} 
                            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold w-fit inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            {processingId === user.id + 'suspend' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            Suspend Account
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── SUSPENSION CONFIRMATION MODAL ────────────────────────────────────────── */}
      {suspensionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 space-y-5 border border-[var(--border)] shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-500">
              <div className="p-3 bg-red-100 dark:bg-red-950/50 rounded-xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-[var(--foreground)]">
                  {suspensionTarget.action === 'suspend' ? 'Confirm User Suspension' : 'Confirm Account Unsuspension'}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {suspensionTarget.user.firstName} {suspensionTarget.user.lastName} ({suspensionTarget.user.email})
                </p>
              </div>
            </div>

            <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
              {suspensionTarget.action === 'suspend' ? (
                <>Are you sure you want to suspend this account? The user will be <strong>logged out immediately</strong> and blocked from logging in or booking properties.</>
              ) : (
                <>Are you sure you want to unsuspend this account? The user will regain full platform access.</>
              )}
            </p>

            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
              <button
                onClick={() => setSuspensionTarget(null)}
                disabled={suspendMutation.isPending}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={executeSuspensionToggle}
                disabled={suspendMutation.isPending}
                className={`px-5 py-2 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 shadow-md transition-all ${
                  suspensionTarget.action === 'suspend' 
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' 
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                }`}
              >
                {suspendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {suspensionTarget.action === 'suspend' ? 'Yes, Suspend Account' : 'Yes, Unsuspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REVIEW ID MODAL ────────────────────────────────────────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-[var(--border)] max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-slate-50 dark:bg-slate-900">
              <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-[var(--primary)]"/> Review ID: {selectedUser.firstName} {selectedUser.lastName}</h2>
              <button onClick={() => setSelectedUser(null)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                <XCircle className="w-6 h-6 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl flex justify-between items-center">
                <span className="text-sm font-semibold text-[var(--muted-foreground)]">Submitted PIN:</span>
                <span className="font-mono font-bold text-lg">{selectedUser.ghanaCardNumber}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-[var(--foreground)]">Front of ID</h3>
                  <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center aspect-[1.6]">
                    {selectedUser.ghanaCardFrontUrl ? (
                      <img src={`http://localhost:5000${selectedUser.ghanaCardFrontUrl}`} alt="Front ID" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[var(--muted-foreground)] text-sm font-bold">No Image Provided</span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-[var(--foreground)]">Back of ID</h3>
                  <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center aspect-[1.6]">
                    {selectedUser.ghanaCardBackUrl ? (
                      <img src={`http://localhost:5000${selectedUser.ghanaCardBackUrl}`} alt="Back ID" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[var(--muted-foreground)] text-sm font-bold">No Image Provided</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border)] bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
              <button onClick={() => handleVerify(selectedUser.id, 'REJECTED')} disabled={processingId === selectedUser.id+'verify'} className="px-6 py-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-xl font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">
                {processingId === selectedUser.id+'verify' ? 'Processing...' : 'Reject Application'}
              </button>
              <button onClick={() => handleVerify(selectedUser.id, 'VERIFIED')} disabled={processingId === selectedUser.id+'verify'} className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-md">
                {processingId === selectedUser.id+'verify' ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-5 h-5"/>}
                Approve & Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
