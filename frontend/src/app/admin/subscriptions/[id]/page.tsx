'use client';

import React, { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  CreditCard,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  User as UserIcon,
  Mail,
  Phone,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Calendar,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';

export default function AdminSubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const subscriptionId = resolvedParams.id;
  const queryClient = useQueryClient();

  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);

  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ['admin-subscription', subscriptionId],
    queryFn: async () => {
      const res = await api.get(`/admin/subscriptions/${subscriptionId}`);
      return res.data;
    }
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put(`/admin/subscriptions/${subscriptionId}/activate`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Listing license activated for 1 calendar year');
      queryClient.invalidateQueries({ queryKey: ['admin-subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to activate subscription');
    }
  });

  const revokeMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await api.put(`/admin/subscriptions/${subscriptionId}/revoke`, { reason });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Subscription revoked successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-subscription', subscriptionId] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to revoke subscription');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-semibold text-zinc-500">Loading subscription license docket...</p>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-zinc-900 dark:text-white">Subscription Not Found</h2>
        <p className="text-xs text-zinc-500 mt-1 mb-6">
          The requested property listing subscription record does not exist.
        </p>
        <Link
          href="/admin/subscriptions"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
        >
          Return to Subscriptions
        </Link>
      </div>
    );
  }

  const property = subscription.property;
  const landlord = property?.landlord;
  const daysRemaining = subscription.daysRemaining ?? 0;
  const isExp = daysRemaining <= 0 || !subscription.isActive;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`Subscription: ${property?.title || 'Listing'}`}
        subtitle={`Annual Listing License • Plan: ${subscription.plan || 'Standard'}`}
        badge={<AdminStatusBadge status={subscription.isActive ? 'ACTIVE' : 'EXPIRED'} />}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Subscriptions', href: '/admin/subscriptions' },
          { label: property?.title || 'License' }
        ]}
        backUrl="/admin/subscriptions"
        backLabel="Back to Subscriptions"
        actions={
          <div className="flex items-center gap-2">
            {property?.id && (
              <Link
                href={`/admin/properties/${property.id}`}
                className="px-3.5 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition flex items-center gap-1.5"
              >
                <Building className="w-3.5 h-3.5" /> Inspect Listing
              </Link>
            )}
          </div>
        }
      />

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: License Validity & Billing (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Validity & Countdown Card */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Listing License Term & Expiry
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  License Validity
                </span>
                <span className={`text-sm font-bold font-mono ${
                  isExp ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  {isExp ? 'EXPIRED' : `${daysRemaining} Days Left`}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  Activation Date
                </span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1 block">
                  {new Date(subscription.startDate).toLocaleDateString('en-GB')}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  Expiration Date
                </span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1 block">
                  {new Date(subscription.endDate).toLocaleDateString('en-GB')}
                </span>
              </div>
            </div>
          </div>

          {/* Billing & Settlement */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Payment & Invoicing Information
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500 font-medium">Payment Status</span>
                <AdminStatusBadge status={subscription.paymentStatus || 'PENDING'} />
              </div>

              <div className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500 font-medium">Paystack Gateway Reference</span>
                <code className="font-mono text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                  {subscription.paymentRef || 'N/A'}
                </code>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-500 font-medium">Plan Package</span>
                <span className="font-bold text-zinc-900 dark:text-white uppercase">
                  {subscription.plan || 'Standard Listing (1 Year)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Landlord Context & Action Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* License Control Panel */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Administrative License Controls
            </h3>

            <div className="space-y-2.5">
              {!subscription.isActive && (
                <button
                  type="button"
                  disabled={activateMutation.isPending}
                  onClick={() => activateMutation.mutate()}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {activateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Activate / Extend License (1 Year)
                </button>
              )}

              {subscription.isActive && (
                <button
                  type="button"
                  onClick={() => setRevokeDialogOpen(true)}
                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" /> Revoke Listing License
                </button>
              )}
            </div>
          </div>

          {/* Landlord Accreditation */}
          {landlord && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-emerald-600" />
                  Landlord / Host
                </h3>
                <Link
                  href={`/admin/landlords/${landlord.id}`}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  View Profile
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs">
                <div className="font-bold text-zinc-900 dark:text-white">
                  {landlord.firstName} {landlord.lastName}
                </div>
                <div className="space-y-1 text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{landlord.email}</span>
                  </div>
                  {landlord.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{landlord.phoneNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Audited Revoke Dialog */}
      <AdminConfirmDialog
        isOpen={revokeDialogOpen}
        onClose={() => setRevokeDialogOpen(false)}
        title="Revoke Property Subscription"
        description={`Provide the compliance or billing reason for revoking the listing license for "${property?.title}". The listing will immediately be unpublished.`}
        confirmLabel="Revoke License"
        confirmVariant="danger"
        requireReason={true}
        reasonLabel="Audited Revocation Explanation"
        reasonPlaceholder="e.g. Non-payment, chargeback notice from Paystack, or landlord account suspension."
        onConfirm={async (reason) => {
          await revokeMutation.mutateAsync(reason);
        }}
      />
    </div>
  );
}
