'use client';

import React, { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  Star,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  Ban,
  CheckCircle2,
  Mail,
  Phone,
  Clock,
  ArrowRight,
  ExternalLink,
  Loader2,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

export default function AdminTenantDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const tenantId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'BOOKINGS' | 'DISPUTES' | 'AUDIT'>('OVERVIEW');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'SUSPEND' | 'UNSUSPEND' | 'LOCK' | 'UNLOCK';
  }>({
    isOpen: false,
    type: 'SUSPEND'
  });

  const { data: tenant, isLoading, refetch } = useQuery({
    queryKey: ['admin-tenant', tenantId],
    queryFn: async () => {
      const res = await api.get(`/admin/users/${tenantId}`);
      return res.data;
    }
  });

  const suspensionMutation = useMutation({
    mutationFn: async ({ isSuspended, reason }: { isSuspended: boolean; reason: string }) => {
      const res = await api.put(`/admin/users/${tenantId}/suspend`, { isSuspended, reason });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Tenant account status updated');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update account status');
    }
  });

  const lockMutation = useMutation({
    mutationFn: async ({ isProfileLocked }: { isProfileLocked: boolean }) => {
      const res = await api.put(`/admin/users/${tenantId}/lock`, { isProfileLocked });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Profile lock status updated');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update profile lock status');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        <p className="text-xs font-bold text-zinc-500">Loading resident credentials...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="p-12 text-center space-y-3 bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-zinc-950 dark:text-white">Resident Profile Not Found</h2>
        <p className="text-xs text-zinc-500">The requested tenant record does not exist or has been removed.</p>
        <Link
          href="/admin/tenants"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] text-white rounded-xl text-xs font-bold"
        >
          Return to Tenants Directory
        </Link>
      </div>
    );
  }

  const bookings: any[] = tenant.bookings || [];
  const breaches: any[] = tenant.tenantBreaches || [];
  const auditLogs: any[] = tenant.auditLogs || [];

  return (
    <div className="space-y-6 pb-12">
      <AdminPageHeader
        title={`${tenant.firstName} ${tenant.lastName}`}
        subtitle={`${tenant.campus ? `Student Resident (${tenant.campus})` : 'Resident Tenant'} · Member since ${new Date(tenant.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Tenants', href: '/admin/tenants' },
          { label: `${tenant.firstName} ${tenant.lastName}` }
        ]}
        badge={
          <div className="flex items-center gap-2">
            <AdminStatusBadge status={tenant.ghanaCardStatus || 'NOT_SUBMITTED'} />
            <AdminStatusBadge status={tenant.isSuspended ? 'SUSPENDED' : 'ACTIVE'} />
            {tenant.isProfileLocked && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Profile Locked</span>
              </span>
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {tenant.isProfileLocked ? (
              <button
                type="button"
                onClick={() => lockMutation.mutate({ isProfileLocked: false })}
                className="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Grant Edit Access</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => lockMutation.mutate({ isProfileLocked: true })}
                className="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Profile</span>
              </button>
            )}

            {tenant.isSuspended ? (
              <button
                type="button"
                onClick={() => setConfirmDialog({ isOpen: true, type: 'UNSUSPEND' })}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Reinstate Account</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDialog({ isOpen: true, type: 'SUSPEND' })}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Suspend Account</span>
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto">
        {(['OVERVIEW', 'BOOKINGS', 'DISPUTES', 'AUDIT'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition -mb-px shrink-0 cursor-pointer ${
              activeTab === tab
                ? 'border-[#0F5132] text-[#0F5132] dark:text-emerald-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {tab === 'OVERVIEW' && 'Resident Profile'}
            {tab === 'BOOKINGS' && `Tenancy Bookings (${bookings.length})`}
            {tab === 'DISPUTES' && `Breach Records (${breaches.length})`}
            {tab === 'AUDIT' && `Audit Trail (${auditLogs.length})`}
          </button>
        ))}
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Identity Info */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">
              Personal & Contact Information
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-zinc-400 font-semibold">Legal Name</div>
                <div className="font-bold text-zinc-900 dark:text-white text-sm">
                  {tenant.firstName} {tenant.lastName} {tenant.otherNames || ''}
                </div>
              </div>
              <div>
                <div className="text-zinc-400 font-semibold">Email Address</div>
                <div className="font-medium text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{tenant.email}</span>
                </div>
              </div>
              <div>
                <div className="text-zinc-400 font-semibold">Phone Number</div>
                <div className="font-medium text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{tenant.phoneNumber || 'Not provided'}</span>
                </div>
              </div>
              <div>
                <div className="text-zinc-400 font-semibold">Nationality & Gender</div>
                <div className="font-medium text-zinc-900 dark:text-white">
                  {tenant.nationality || 'Ghanaian'} · {tenant.gender || 'Not specified'}
                </div>
              </div>
              <div>
                <div className="text-zinc-400 font-semibold">Reputation Score</div>
                <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 pt-0.5">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm">{(tenant.reputationScore || 5.0).toFixed(1)} / 5.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Academic / Student Credentials */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">
              Academic School Information
            </h3>
            {tenant.campus ? (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-zinc-400 font-semibold">Tertiary Campus</div>
                  <div className="font-bold text-zinc-900 dark:text-white">{tenant.campus}</div>
                </div>
                <div>
                  <div className="text-zinc-400 font-semibold">Student ID Index</div>
                  <div className="font-mono font-bold text-zinc-900 dark:text-white">{tenant.studentId}</div>
                </div>
                <div>
                  <div className="text-zinc-400 font-semibold">Programme of Study</div>
                  <div className="font-medium text-zinc-900 dark:text-white">{tenant.programmeOfStudy || 'Undergraduate'}</div>
                </div>
                <div>
                  <div className="text-zinc-400 font-semibold">Emergency Guardian Contact</div>
                  <div className="font-medium text-zinc-900 dark:text-white">
                    {tenant.guardianName || 'Guardian'} ({tenant.guardianPhone || 'No contact'})
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-400 text-center">
                Registered as working resident / general non-student tenant.
              </div>
            )}
          </div>

          {/* National Identity Compliance */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">
              National ID (Ghana Card)
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-zinc-400 font-semibold">Verification Status</div>
                <div className="pt-1">
                  <AdminStatusBadge status={tenant.ghanaCardStatus || 'NOT_SUBMITTED'} size="md" />
                </div>
              </div>
              <div>
                <div className="text-zinc-400 font-semibold">Masked Card Number</div>
                <div className="font-mono font-bold text-zinc-900 dark:text-white pt-0.5">
                  {tenant.maskedGhanaCard || 'Not Submitted'}
                </div>
              </div>
              {tenant.ghanaCardFrontUrl && (
                <div className="pt-2">
                  <Link
                    href={`/admin/verifications/${tenant.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline"
                  >
                    <span>Open Full Document Audit Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: BOOKINGS ── */}
      {activeTab === 'BOOKINGS' && (
        <div className="space-y-4">
          <div className="text-xs text-zinc-500 font-semibold">
            {bookings.length} residential lease bookings made by this tenant.
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
            {bookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No bookings recorded for this tenant.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    <th className="py-3 px-4">Booking ID</th>
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4">Escrow Status</th>
                    <th className="py-3 px-4">Booking Date</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-200">
                  {bookings.map((booking: any) => (
                    <tr key={booking.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-zinc-950 dark:text-white">
                        #{booking.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-4 font-medium">{booking.property?.title || 'Property'}</td>
                      <td className="py-3 px-4">
                        <AdminStatusBadge status={booking.status} />
                      </td>
                      <td className="py-3 px-4 text-zinc-400 font-mono">
                        {new Date(booking.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: DISPUTES ── */}
      {activeTab === 'DISPUTES' && (
        <div className="space-y-4">
          <div className="text-xs text-zinc-500 font-semibold">
            {breaches.length} tenancy dispute or breach allegations filed against this resident.
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
            {breaches.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                Clean tenancy record: No breach allegations lodged against this tenant.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {breaches.map((b: any) => (
                  <div key={b.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AdminStatusBadge status={b.status} />
                        <span className="font-bold text-zinc-900 dark:text-white text-xs">{b.title}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500">{b.description}</p>
                    </div>
                    <Link
                      href={`/admin/disputes/${b.id}`}
                      className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-[#16A34A] text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:text-white transition"
                    >
                      Inspect Docket
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 4: AUDIT ── */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4 max-w-3xl">
          <div className="text-xs text-zinc-500 font-semibold">
            Administrative history and security events logged for this account.
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-hidden shadow-2xs">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No administrative actions recorded for this user.
              </div>
            ) : (
              auditLogs.map((log: any) => (
                <div key={log.id} className="p-4 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 dark:text-white uppercase font-mono text-[11px]">
                      {log.action}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {new Date(log.createdAt).toLocaleString('en-GB')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <AdminConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'SUSPEND' })}
        title={
          confirmDialog.type === 'SUSPEND'
            ? `Suspend Resident Account: ${tenant.firstName} ${tenant.lastName}`
            : `Reinstate Resident Account: ${tenant.firstName} ${tenant.lastName}`
        }
        description={
          confirmDialog.type === 'SUSPEND'
            ? 'Suspending this tenant revokes their active device sessions and bars booking creation.'
            : 'Reinstating this account restores standard tenant access.'
        }
        confirmLabel={confirmDialog.type === 'SUSPEND' ? 'Confirm Suspension' : 'Reinstate Access'}
        confirmVariant={confirmDialog.type === 'SUSPEND' ? 'danger' : 'primary'}
        requireReason={true}
        onConfirm={async (reason) => {
          if (confirmDialog.type === 'SUSPEND') {
            await suspensionMutation.mutateAsync({ isSuspended: true, reason });
          } else if (confirmDialog.type === 'UNSUSPEND') {
            await suspensionMutation.mutateAsync({ isSuspended: false, reason });
          }
        }}
      />
    </div>
  );
}
