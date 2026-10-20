'use client';

import React, { useState, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  UserCheck,
  Building,
  CalendarCheck,
  CreditCard,
  Star,
  FileCheck,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Mail,
  Phone,
  Clock,
  ArrowRight,
  ExternalLink,
  Ban,
  CheckCircle2,
  XCircle,
  Loader2,
  IdCard,
  ZoomIn
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/lib/utils';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

export default function AdminLandlordDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const landlordId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PROPERTIES' | 'BOOKINGS' | 'DOCUMENTS' | 'AUDIT'>('OVERVIEW');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'SUSPEND' | 'UNSUSPEND' | 'VERIFY_DEED' | 'REJECT_DEED';
  }>({
    isOpen: false,
    type: 'SUSPEND'
  });

  const { data: landlord, isLoading, refetch } = useQuery({
    queryKey: ['admin-landlord', landlordId],
    queryFn: async () => {
      const res = await api.get(`/admin/users/${landlordId}`);
      return res.data;
    }
  });

  // Suspension Mutation
  const suspensionMutation = useMutation({
    mutationFn: async ({ isSuspended, reason }: { isSuspended: boolean; reason: string }) => {
      const res = await api.put(`/admin/users/${landlordId}/suspend`, { isSuspended, reason });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Landlord account status updated');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin-landlords'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update account status');
    }
  });

  // Deed Verification Mutation
  const deedMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      const res = await api.put(`/admin/verify-landlord/${landlordId}`, { status, reason });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Deed verification status updated');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['admin-landlords'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update deed verification');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        <p className="text-xs font-bold text-zinc-500">Loading landlord profile and compliance records...</p>
      </div>
    );
  }

  if (!landlord) {
    return (
      <div className="p-12 text-center space-y-3 bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-zinc-950 dark:text-white">Landlord Profile Not Found</h2>
        <p className="text-xs text-zinc-500">The requested landlord record does not exist or has been removed.</p>
        <Link
          href="/admin/landlords"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0F5132] text-white rounded-xl text-xs font-bold"
        >
          Return to Landlords Directory
        </Link>
      </div>
    );
  }

  const properties: any[] = landlord.properties || [];
  const bookings: any[] = landlord.bookings || [];
  const auditLogs: any[] = landlord.auditLogs || [];

  return (
    <div className="space-y-6 pb-12">
      <AdminPageHeader
        title={`${landlord.firstName} ${landlord.lastName}`}
        subtitle={`Registered Host & Landlord · Member since ${new Date(landlord.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Landlords', href: '/admin/landlords' },
          { label: `${landlord.firstName} ${landlord.lastName}` }
        ]}
        badge={
          <div className="flex items-center gap-2">
            {landlord.isVerifiedLandlord ? (
              <AdminStatusBadge status="VERIFIED" />
            ) : (
              <AdminStatusBadge status={landlord.landlordVerificationStatus || 'NOT_SUBMITTED'} />
            )}
            <AdminStatusBadge status={landlord.isSuspended ? 'SUSPENDED' : 'ACTIVE'} />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {!landlord.isVerifiedLandlord && (
              <button
                type="button"
                onClick={() => setConfirmDialog({ isOpen: true, type: 'VERIFY_DEED' })}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve Title Deed</span>
              </button>
            )}

            {landlord.isSuspended ? (
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

      {/* Tabs Navigation */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 overflow-x-auto">
        {(['OVERVIEW', 'PROPERTIES', 'BOOKINGS', 'DOCUMENTS', 'AUDIT'] as const).map((tab) => (
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
            {tab === 'OVERVIEW' && 'Executive Profile'}
            {tab === 'PROPERTIES' && `Managed Properties (${properties.length})`}
            {tab === 'BOOKINGS' && `Tenancy Escrow (${bookings.length})`}
            {tab === 'DOCUMENTS' && 'Ownership Proof & Deed'}
            {tab === 'AUDIT' && `Audit Trail (${auditLogs.length})`}
          </button>
        ))}
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Identity & Contact Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">
              Identity & Contact Summary
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-zinc-400 font-semibold">Full Legal Name</div>
                <div className="font-bold text-zinc-900 dark:text-white text-sm">
                  {landlord.firstName} {landlord.lastName} {landlord.otherNames || ''}
                </div>
              </div>
              <div>
                <div className="text-zinc-400 font-semibold">Email Address</div>
                <div className="font-medium text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{landlord.email}</span>
                </div>
              </div>
              <div>
                <div className="text-zinc-400 font-semibold">Phone Number</div>
                <div className="font-medium text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{landlord.phoneNumber || 'Not provided'}</span>
                </div>
              </div>
              <div>
                <div className="text-zinc-400 font-semibold">Account Identifier</div>
                <div className="font-mono text-zinc-500 text-[11px]">{landlord.id}</div>
              </div>
              <div>
                <div className="text-zinc-400 font-semibold">Reputation Score</div>
                <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400 pt-0.5">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm">{(landlord.reputationScore || 5.0).toFixed(1)} / 5.0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance & Ownership Status */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">
              Statutory Verification Status
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <div className="text-zinc-400 font-semibold">Landlord Deed Status</div>
                <div className="pt-1">
                  <AdminStatusBadge status={landlord.landlordVerificationStatus || 'NOT_SUBMITTED'} size="md" />
                </div>
              </div>
              <div>
                <div className="text-zinc-400 font-semibold">Ghana Card KYC Status</div>
                <div className="pt-1">
                  <AdminStatusBadge status={landlord.ghanaCardStatus || 'NOT_SUBMITTED'} size="md" />
                </div>
              </div>
              <div>
                <div className="text-zinc-400 font-semibold">Masked National ID</div>
                <div className="font-mono text-zinc-700 dark:text-zinc-300 font-bold pt-0.5">
                  {landlord.maskedGhanaCard || 'Not Submitted'}
                </div>
              </div>
              {landlord.landlordDocUrl ? (
                <div className="pt-2">
                  <a
                    href={landlord.landlordDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F5132] dark:text-emerald-400 hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Submitted Title Deed (Secure Link)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <div className="text-zinc-400 italic">No deed documents currently attached.</div>
              )}
            </div>
          </div>

          {/* Operational Metrics */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">
              Operational Footprint
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 dark:border-zinc-800/40">
                <span className="text-zinc-500">Properties Published</span>
                <span className="font-bold text-zinc-950 dark:text-white">{properties.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 dark:border-zinc-800/40">
                <span className="text-zinc-500">Total Tenancy Bookings</span>
                <span className="font-bold text-zinc-950 dark:text-white">{bookings.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs py-1 border-b border-zinc-100 dark:border-zinc-800/40">
                <span className="text-zinc-500">Account Safety Status</span>
                <AdminStatusBadge status={landlord.isSuspended ? 'SUSPENDED' : 'ACTIVE'} />
              </div>
              <div className="flex items-center justify-between text-xs py-1">
                <span className="text-zinc-500">Two-Factor Authentication</span>
                <span className="font-bold text-zinc-950 dark:text-white">
                  {landlord.twoFactorEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: PROPERTIES ── */}
      {activeTab === 'PROPERTIES' && (
        <div className="space-y-4">
          <div className="text-xs text-zinc-500 font-semibold">
            {properties.length} residential properties registered under this landlord account.
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
            {properties.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No properties registered by this landlord.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Floor Price</th>
                    <th className="py-3 px-4">Approval Status</th>
                    <th className="py-3 px-4 text-right">Review Listing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 text-zinc-700 dark:text-zinc-200">
                  {properties.map((prop: any) => (
                    <tr key={prop.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                      <td className="py-3 px-4 font-bold text-zinc-950 dark:text-white">
                        {prop.title}
                      </td>
                      <td className="py-3 px-4 text-zinc-500">{prop.location}</td>
                      <td className="py-3 px-4 font-mono font-bold">
                        GH₵ {prop.price ? prop.price.toLocaleString() : '0'}
                      </td>
                      <td className="py-3 px-4">
                        <AdminStatusBadge status={prop.approvalStatus} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/properties/${prop.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F5132] dark:text-emerald-400 hover:underline"
                        >
                          <span>Inspect</span>
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

      {/* ── TAB 3: BOOKINGS ── */}
      {activeTab === 'BOOKINGS' && (
        <div className="space-y-4">
          <div className="text-xs text-zinc-500 font-semibold">
            {bookings.length} historical and active tenancy bookings.
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs">
            {bookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No bookings recorded on this landlord&apos;s properties yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                    <th className="py-3 px-4">Booking ID</th>
                    <th className="py-3 px-4">Property</th>
                    <th className="py-3 px-4">Status</th>
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
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0F5132] dark:text-emerald-400 hover:underline"
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

      {/* ── TAB 4: DOCUMENTS ── */}
      {activeTab === 'DOCUMENTS' && (
        <div className="space-y-6 max-w-4xl">
          {/* Statutory Ghana Cards */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <IdCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-950 dark:text-white">
                  Ghana Card National Identity (KYC Proof)
                </h3>
              </div>
              <AdminStatusBadge status={landlord.ghanaCardStatus || 'NOT_SUBMITTED'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Front */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-500">Document 01: Front</div>
                {landlord.ghanaCardFrontUrl ? (
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950 p-2 flex flex-col items-center justify-center min-h-[180px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(landlord.ghanaCardFrontUrl)}
                      alt="Ghana Card Front"
                      className="max-h-48 object-contain rounded-lg w-full"
                    />
                    <a
                      href={getImageUrl(landlord.ghanaCardFrontUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Full Resolution
                    </a>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    No Ghana Card front uploaded
                  </div>
                )}
              </div>

              {/* Back */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-500">Document 02: Back</div>
                {landlord.ghanaCardBackUrl ? (
                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950 p-2 flex flex-col items-center justify-center min-h-[180px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(landlord.ghanaCardBackUrl)}
                      alt="Ghana Card Back"
                      className="max-h-48 object-contain rounded-lg w-full"
                    />
                    <a
                      href={getImageUrl(landlord.ghanaCardBackUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Full Resolution
                    </a>
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-zinc-400 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    No Ghana Card back uploaded
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ownership Title Deed */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-2xs">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-white border-b border-zinc-100 dark:border-zinc-800 pb-2">
              Ownership Title Proof Document
            </h3>
            {landlord.landlordDocUrl ? (
              <div className="space-y-4">
                <p className="text-xs text-zinc-500">
                  Official document proof submitted to substantiate property ownership under Ghanaian land administration guidelines.
                </p>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileCheck className="w-6 h-6 text-[#0F5132] dark:text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold text-zinc-900 dark:text-white">
                        Landlord_Ownership_Title
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        Encrypted Cloud Storage · Secure Time-Limited Access
                      </div>
                    </div>
                  </div>
                  <a
                    href={getImageUrl(landlord.landlordDocUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <span>Open Document</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-400 italic">
                No ownership deed document has been uploaded for this landlord account.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 5: AUDIT TRAIL ── */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4 max-w-3xl">
          <div className="text-xs text-zinc-500 font-semibold">
            Chronological log of administrative actions performed on this profile.
          </div>

          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800/60 overflow-hidden shadow-2xs">
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No administrative audit records logged for this user.
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
                  {log.newData && (
                    <div className="text-[11px] text-zinc-500 font-mono">
                      Payload: {typeof log.newData === 'string' ? log.newData : JSON.stringify(log.newData)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog with mandatory reason */}
      <AdminConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'SUSPEND' })}
        title={
          confirmDialog.type === 'SUSPEND'
            ? `Suspend Landlord Account: ${landlord.firstName} ${landlord.lastName}`
            : confirmDialog.type === 'UNSUSPEND'
            ? `Reinstate Landlord Account: ${landlord.firstName} ${landlord.lastName}`
            : confirmDialog.type === 'VERIFY_DEED'
            ? `Approve Ownership Deed: ${landlord.firstName} ${landlord.lastName}`
            : `Reject Ownership Deed: ${landlord.firstName} ${landlord.lastName}`
        }
        description={
          confirmDialog.type === 'SUSPEND'
            ? 'Suspending this landlord will instantly invalidate their active sessions and unpublish all associated properties from the public search index.'
            : confirmDialog.type === 'UNSUSPEND'
            ? 'Reinstating this account will allow the landlord to log in and manage properties.'
            : 'Substantiating this title deed certifies the landlord with Verified Landlord badge.'
        }
        confirmLabel={
          confirmDialog.type === 'SUSPEND'
            ? 'Confirm Suspension'
            : confirmDialog.type === 'UNSUSPEND'
            ? 'Confirm Reinstatement'
            : 'Approve Verified Status'
        }
        confirmVariant={confirmDialog.type === 'SUSPEND' ? 'danger' : 'primary'}
        requireReason={true}
        onConfirm={async (reason) => {
          if (confirmDialog.type === 'SUSPEND') {
            await suspensionMutation.mutateAsync({ isSuspended: true, reason });
          } else if (confirmDialog.type === 'UNSUSPEND') {
            await suspensionMutation.mutateAsync({ isSuspended: false, reason });
          } else if (confirmDialog.type === 'VERIFY_DEED') {
            await deedMutation.mutateAsync({ status: 'VERIFIED', reason });
          }
        }}
      />
    </div>
  );
}
