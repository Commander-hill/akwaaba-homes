'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Users,
  Lock,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle,
  X,
  KeyRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminDataTable, { Column } from '@/components/admin/AdminDataTable';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

export default function AdminAdministratorsPage() {
  const queryClient = useQueryClient();

  const { data: authData } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data;
    }
  });
  const currentUser = authData?.user;

  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [suspendDialog, setSuspendDialog] = useState<{
    isOpen: boolean;
    adminId: string | null;
    adminName: string;
    isSuspended: boolean;
  }>({
    isOpen: false,
    adminId: null,
    adminName: '',
    isSuspended: false
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN'
  });

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['admin-administrators'],
    queryFn: async () => {
      const res = await api.get('/admin/administrators');
      return res.data;
    }
  });

  const provisionMutation = useMutation({
    mutationFn: async (payload: typeof formData) => {
      const res = await api.post('/admin/administrators', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Administrator provisioned successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-administrators'] });
      setIsProvisionOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
        role: 'ADMIN'
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to provision administrator');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isSuspended }: { id: string; isSuspended: boolean }) => {
      const res = await api.put(`/admin/administrators/${id}/status`, { isSuspended });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Administrator status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-administrators'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update administrator status');
    }
  });

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Administrator',
      render: (a) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300">
            {a.firstName[0]}{a.lastName[0]}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-zinc-900 dark:text-white flex items-center gap-1.5">
              <span>{a.firstName} {a.lastName}</span>
              {a.id === currentUser?.id && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  (You)
                </span>
              )}
            </div>
            <span className="text-[11px] text-zinc-400 block truncate">{a.email}</span>
          </div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Authority Level',
      render: (a) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
          a.role === 'SUPER_ADMIN'
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
        }`}>
          {a.role === 'SUPER_ADMIN' ? <ShieldAlert className="w-3 h-3 text-purple-600" /> : <ShieldCheck className="w-3 h-3 text-emerald-600" />}
          {a.role}
        </span>
      )
    },
    {
      key: 'security',
      header: 'Two-Factor MFA',
      render: (a) => (
        <span className={`text-xs font-semibold ${a.twoFactorEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'}`}>
          {a.twoFactorEnabled ? '✓ Enabled' : 'Not Configured'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <AdminStatusBadge status={a.isSuspended ? 'SUSPENDED' : 'ACTIVE'} />
    },
    {
      key: 'created',
      header: 'Provisioned',
      render: (a) => (
        <span className="text-xs text-zinc-400">
          {new Date(a.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Governance',
      align: 'right',
      render: (a) => {
        const isSelf = a.id === currentUser?.id;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {!isSelf && (
              <button
                type="button"
                onClick={() => setSuspendDialog({
                  isOpen: true,
                  adminId: a.id,
                  adminName: `${a.firstName} ${a.lastName}`,
                  isSuspended: !a.isSuspended
                })}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  a.isSuspended
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                }`}
              >
                {a.isSuspended ? 'Reinstate' : 'Suspend'}
              </button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Administrator Governance & Access Control"
        subtitle="Provision platform administrators, enforce two-factor authentication, and govern privileged system authority."
        badge={
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            Super Admin Restricted
          </span>
        }
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Governance', href: '/admin/administrators' },
          { label: 'Administrators' }
        ]}
        actions={
          <button
            type="button"
            onClick={() => setIsProvisionOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Provision Administrator
          </button>
        }
      />

      <AdminDataTable
        columns={columns}
        data={admins}
        keyExtractor={(a) => a.id}
        isLoading={isLoading}
        emptyTitle="No administrator accounts found"
        emptyDescription="Unable to load administrative users."
      />

      {/* Provisioning Drawer / Modal */}
      {isProvisionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="px-6 py-4 bg-zinc-900 text-white flex justify-between items-center border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Provision Administrator Account</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProvisionOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                provisionMutation.mutate(formData);
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  Phone Number (Ghana +233)
                </label>
                <input
                  type="tel"
                  placeholder="+233..."
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  Authority Level
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ADMIN">ADMIN (Operational Moderation)</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Platform Governance)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsProvisionOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provisionMutation.isPending}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {provisionMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Provision Administrator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Suspension */}
      <AdminConfirmDialog
        isOpen={suspendDialog.isOpen}
        onClose={() => setSuspendDialog({ isOpen: false, adminId: null, adminName: '', isSuspended: false })}
        title={`${suspendDialog.isSuspended ? 'Suspend' : 'Reinstate'} Administrator`}
        description={`Are you sure you want to ${suspendDialog.isSuspended ? 'suspend' : 'reinstate'} the administrative privileges for ${suspendDialog.adminName}?`}
        confirmLabel={suspendDialog.isSuspended ? 'Suspend Admin' : 'Reinstate Admin'}
        confirmVariant={suspendDialog.isSuspended ? 'danger' : 'primary'}
        requireReason={true}
        reasonLabel="Audited Governance Rationale"
        reasonPlaceholder="e.g. Security audit finding, staff departure, or credential reset."
        onConfirm={async () => {
          if (!suspendDialog.adminId) return;
          await toggleStatusMutation.mutateAsync({
            id: suspendDialog.adminId,
            isSuspended: suspendDialog.isSuspended
          });
        }}
      />
    </div>
  );
}
