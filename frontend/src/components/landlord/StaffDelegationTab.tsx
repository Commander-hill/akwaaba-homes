'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  UserCheck, Plus, Trash2, Shield, UserCog, Mail, Phone,
  Building, Loader2, CheckCircle2, Wrench, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface StaffAssignment {
  id: string;
  propertyId: string;
  role: 'CARETAKER' | 'PORTER' | 'PROPERTY_MANAGER' | string;
  canManageTickets: boolean;
  canCheckInTenants: boolean;
  canPostNotices: boolean;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null;
    avatarUrl: string | null;
  };
  property: {
    id: string;
    title: string;
    location: string;
  };
}

export default function StaffDelegationTab({ properties }: { properties: any[] }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CARETAKER');
  const [canManageTickets, setCanManageTickets] = useState(true);
  const [canCheckInTenants, setCanCheckInTenants] = useState(true);
  const [canPostNotices, setCanPostNotices] = useState(true);

  const { data, isLoading } = useQuery<{ staff: StaffAssignment[] }>({
    queryKey: ['propertyStaff', 'landlord'],
    queryFn: async () => {
      const res = await api.get('/staff');
      return res.data;
    }
  });

  const assignStaffMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/staff', payload);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || 'Staff member assigned successfully!');
      setModalOpen(false);
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['propertyStaff', 'landlord'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to assign staff');
    }
  });

  const removeStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/staff/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Staff access revoked');
      queryClient.invalidateQueries({ queryKey: ['propertyStaff', 'landlord'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to revoke staff');
    }
  });

  const staffList = data?.staff || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Caretaker & Porter Staff Delegation</h2>
            <p className="text-xs text-slate-500">Authorize hostel porters & caretakers to handle daily tickets & check-ins without financial access</p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Assign Staff Member
        </button>
      </div>

      {isLoading ? (
        <div className="p-16 flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : staffList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <UserCheck className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No delegated staff members assigned</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Delegate daily hostel operations to on-site porters or caretakers by entering their registered email.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((assignment) => (
            <div
              key={assignment.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-black text-base flex items-center justify-center">
                    {assignment.user.avatarUrl ? (
                      <img src={assignment.user.avatarUrl} alt={assignment.user.firstName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      assignment.user.firstName.charAt(0)
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {assignment.user.firstName} {assignment.user.lastName}
                    </h4>
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 text-[10px] font-bold rounded-full">
                      {assignment.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Revoke operational access for ${assignment.user.firstName}?`)) {
                      removeStaffMutation.mutate(assignment.id);
                    }
                  }}
                  disabled={removeStaffMutation.isPending}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Revoke access"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{assignment.property?.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{assignment.user.email}</span>
                </div>
                {assignment.user.phoneNumber && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{assignment.user.phoneNumber}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Delegated Permissions</span>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {assignment.canManageTickets && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-md flex items-center gap-1 font-semibold">
                      <Wrench className="w-2.5 h-2.5" /> Maintenance Tickets
                    </span>
                  )}
                  {assignment.canCheckInTenants && (
                    <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 rounded-md flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Move-In Check-Ins
                    </span>
                  )}
                  {assignment.canPostNotices && (
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-md flex items-center gap-1 font-semibold">
                      <FileText className="w-2.5 h-2.5" /> Compound Notices
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UserCog className="w-5 h-5 text-blue-500" /> Assign Property Staff
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Property</label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Staff Member Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. caretaker@example.com"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                />
                <span className="text-[10px] text-slate-400">Must be an existing registered user on Akwaaba Homes.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                >
                  <option value="CARETAKER">Hostel Caretaker</option>
                  <option value="PORTER">Building Porter / Front Desk</option>
                  <option value="PROPERTY_MANAGER">On-Site Property Manager</option>
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Staff Permissions</label>
                
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canManageTickets}
                    onChange={(e) => setCanManageTickets(e.target.checked)}
                    className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span>Can view & resolve maintenance tickets</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canCheckInTenants}
                    onChange={(e) => setCanCheckInTenants(e.target.checked)}
                    className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span>Can perform Move-In & Move-Out inspections</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canPostNotices}
                    onChange={(e) => setCanPostNotices(e.target.checked)}
                    className="rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <span>Can publish compound broadcast notices</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!email) {
                    toast.error('Staff email is required');
                    return;
                  }
                  assignStaffMutation.mutate({
                    propertyId,
                    email,
                    role,
                    canManageTickets,
                    canCheckInTenants,
                    canPostNotices
                  });
                }}
                disabled={assignStaffMutation.isPending}
                className="px-6 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:opacity-90 shadow-sm"
              >
                {assignStaffMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Assign Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
