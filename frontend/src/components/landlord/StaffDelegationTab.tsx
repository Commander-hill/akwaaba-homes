'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import Link from 'next/link';
import { 
  UserCheck, Plus, Trash2, UserCog, Mail, Phone,
  Building, Loader2, CheckCircle2, Wrench, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useDialog } from '@/providers/DialogProvider';

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

export default function StaffDelegationTab({ properties = [] }: { properties?: any[] }) {
  const queryClient = useQueryClient();
  const { confirm } = useDialog();

  // Fallback query to guarantee live landlord properties list
  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'landlord', 'mine'],
    queryFn: async () => {
      try {
        const res = await api.get('/properties/landlord/mine');
        return res.data?.data || [];
      } catch {
        return [];
      }
    }
  });

  const rawProps = (propertiesData && propertiesData.length > 0) ? propertiesData : properties;
  const propertyList = rawProps.map((p: any) => ({
    id: p.id || p.propertyId,
    title: p.title || p.propertyTitle || 'Property',
    location: p.location || p.propertyLocation || ''
  })).filter((p: any) => Boolean(p.id));

  const { data, isLoading } = useQuery<{ staff: StaffAssignment[] }>({
    queryKey: ['propertyStaff', 'landlord'],
    queryFn: async () => {
      const res = await api.get('/staff');
      return res.data;
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
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Facility Caretaker &amp; Staff Delegation</h2>
            <p className="text-xs text-slate-500">Authorize property caretakers &amp; facility staff to handle daily tickets &amp; check-ins without financial access</p>
          </div>
        </div>

        <Link
          href="/dashboard/landlord/staff/new"
          className="px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Assign Staff Member
        </Link>
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
            Delegate daily property operations to on-site caretakers or facility managers by entering their registered email.
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
                  onClick={async () => {
                    const shouldRevoke = await confirm({
                      title: 'Revoke Operational Access',
                      message: `Are you sure you want to revoke staff and operational management access for ${assignment.user.firstName} ${assignment.user.lastName}?`,
                      confirmText: 'Revoke Access',
                      type: 'danger',
                    });
                    if (shouldRevoke) {
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


    </div>
  );
}
