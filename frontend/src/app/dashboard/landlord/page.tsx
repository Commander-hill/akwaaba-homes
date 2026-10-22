'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, Building2, CalendarCheck, CheckCircle2 } from 'lucide-react';
import api from '@/lib/axios';
import { Button, ErrorState, StatusBadge, formatCedis } from '@/components/tenant-ui/primitives';

interface Action {
  key: string;
  text: string;
  href: string;
  cta: string;
  tone: 'warning' | 'error' | 'info';
}

const isSubActive = (sub: any) =>
  !!sub && sub.isActive && sub.paymentStatus === 'COMPLETED' && new Date(sub.endDate) > new Date();

export default function LandlordDashboardPage() {
  const me = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => (await api.get('/auth/me')).data,
    staleTime: 60_000,
  });
  const props = useQuery({
    queryKey: ['landlord', 'properties'],
    queryFn: async () => (await api.get('/properties/landlord/mine')).data.data as any[],
  });
  const bookings = useQuery({
    queryKey: ['landlord', 'bookings'],
    queryFn: async () => (await api.get('/bookings/landlord')).data.bookings as any[],
  });

  const user = me.data?.user;
  const loading = me.isLoading || props.isLoading || bookings.isLoading;

  if (props.isError || bookings.isError) {
    return (
      <ErrorState
        message="We could not load your properties and bookings."
        onRetry={() => {
          props.refetch();
          bookings.refetch();
        }}
      />
    );
  }

  const properties = (props.data || []).filter((p) => p.approvalStatus !== 'DELETED');
  const allBookings = bookings.data || [];
  const pending = allBookings.filter((b) => b.status === 'PENDING');
  const awaitingPayment = allBookings.filter((b) => b.status === 'APPROVED');
  const pendingApproval = properties.filter((p) => p.approvalStatus === 'PENDING' && !isSubActive(p.subscription));
  const rejected = properties.filter((p) => p.approvalStatus === 'REJECTED');
  const needSub = properties.filter(
    (p) => (p.approvalStatus === 'APPROVED' || !p.approvalStatus) && !isSubActive(p.subscription)
  );
  const live = properties.filter(
    (p) => p.isAvailable && isSubActive(p.subscription)
  );
  const noRooms = properties.filter((p) => !p.rooms || p.rooms.length === 0);

  const actions: Action[] = [];
  const idStatus = user?.ghanaCardStatus;
  const deedStatus = user?.landlordVerificationStatus;
  if (user && (idStatus !== 'VERIFIED' || deedStatus !== 'VERIFIED')) {
    const wait = ['PENDING', 'UNDER_REVIEW'].includes(idStatus) || deedStatus === 'PENDING';
    actions.push({
      key: 'verify',
      text: wait
        ? 'Your identity and ownership documents are with our team for review.'
        : 'Complete identity and ownership verification so your listings can be approved.',
      href: '/dashboard/verification',
      cta: wait ? 'View status' : 'Continue verification',
      tone: wait ? 'info' : 'warning',
    });
  }
  if (pending.length)
    actions.push({
      key: 'pending',
      text: `${pending.length} booking request${pending.length > 1 ? 's' : ''} awaiting your decision.`,
      href: '/dashboard/landlord/bookings?status=PENDING',
      cta: 'Review requests',
      tone: 'warning',
    });
  if (needSub.length)
    actions.push({
      key: 'sub',
      text: `${needSub.length} approved propert${needSub.length > 1 ? 'ies need' : 'y needs'} an active subscription to be visible to tenants.`,
      href: '/dashboard/landlord/subscription',
      cta: 'Manage subscription',
      tone: 'error',
    });
  if (rejected.length)
    actions.push({
      key: 'rej',
      text: `${rejected.length} listing${rejected.length > 1 ? 's were' : ' was'} not approved. Edit and resubmit.`,
      href: '/dashboard/landlord/properties',
      cta: 'Open properties',
      tone: 'error',
    });
  if (noRooms.length)
    actions.push({
      key: 'rooms',
      text: `${noRooms.length} propert${noRooms.length > 1 ? 'ies have' : 'y has'} no rooms yet, so tenants cannot book.`,
      href: '/dashboard/landlord/properties',
      cta: 'Add rooms',
      tone: 'warning',
    });

  const metrics = [
    { label: 'Properties', value: properties.length },
    { label: 'Live listings', value: live.length },
    { label: 'Pending requests', value: pending.length },
    { label: 'Awaiting tenant payment', value: awaitingPayment.length },
  ];

  const recent = [...allBookings]
    .sort((a, b) => +new Date(b.updatedAt || b.createdAt) - +new Date(a.updatedAt || a.createdAt))
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-editorial text-3xl text-[#242925] dark:text-white">Property overview</h1>
          <p className="text-sm text-[#6F756F] mt-1">
            {user?.firstName ? `Welcome back, ${user.firstName}.` : 'Welcome back.'}
          </p>
        </div>
        <Link href="/dashboard/landlord/new">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Building2 className="w-4 h-4" />}
          >
            Add property
          </Button>
        </Link>
      </header>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-[#EFEDE5] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-2 lg:grid-cols-4 border border-[#E7E7DF] dark:border-[#262E2A] rounded-lg bg-white dark:bg-[#141816] divide-x divide-y lg:divide-y-0 divide-[#E7E7DF] dark:divide-[#262E2A] overflow-hidden">
            {metrics.map((m) => (
              <div key={m.label} className="p-4">
                <dt className="text-xs text-[#6F756F]">{m.label}</dt>
                <dd className="text-2xl font-semibold tabular-nums mt-1">{m.value}</dd>
              </div>
            ))}
          </dl>

          <section aria-labelledby="actions-h">
            <h2 id="actions-h" className="text-sm font-semibold mb-2">
              Needs your attention
            </h2>
            {actions.length === 0 ? (
              <div className="flex items-center gap-2.5 p-4 rounded-lg border border-[#E7E7DF] bg-white dark:bg-[#141816] text-sm text-[#557A67]">
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                {properties.length === 0
                  ? 'Nothing pending. Add your first property to get started.'
                  : 'Nothing needs action right now.'}
              </div>
            ) : (
              <ul className="rounded-lg border border-[#E7E7DF] dark:border-[#262E2A] bg-white dark:bg-[#141816] divide-y divide-[#E7E7DF] dark:divide-[#262E2A]">
                {actions.map((a) => (
                  <li key={a.key} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <AlertCircle
                        className={`w-4 h-4 mt-0.5 shrink-0 ${a.tone === 'error' ? 'text-[#9E2A2B]' : a.tone === 'info' ? 'text-[#557A67]' : 'text-[#C77B59]'}`}
                        aria-hidden="true"
                      />
                      <p className="text-sm">{a.text}</p>
                    </div>
                    <Link
                      href={a.href}
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline"
                    >
                      {a.cta} <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid lg:grid-cols-5 gap-8">
            <section aria-labelledby="props-h" className="lg:col-span-3">
              <div className="flex items-center justify-between mb-2">
                <h2 id="props-h" className="text-sm font-semibold">
                  Your properties
                </h2>
                <Link href="/dashboard/landlord/properties" className="text-xs font-semibold text-[#16A34A] hover:text-[#15803D] hover:underline">
                  View all
                </Link>
              </div>
              {properties.length === 0 ? (
                <div className="p-6 rounded-lg border border-dashed border-[#D8D8CE] dark:border-[#262E2A] text-center space-y-3">
                  <Building2 className="w-6 h-6 mx-auto text-[#557A67]" aria-hidden="true" />
                  <p className="text-sm">You have not listed a property yet.</p>
                  <div>
                    <Link href="/dashboard/landlord/new">
                      <Button variant="primary" size="sm" leftIcon={<Building2 className="w-3.5 h-3.5" />}>
                        Add your first property
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="rounded-lg border border-[#E7E7DF] dark:border-[#262E2A] bg-white dark:bg-[#141816] divide-y divide-[#E7E7DF] dark:divide-[#262E2A]">
                  {properties.slice(0, 5).map((p) => {
                    const subOk = isSubActive(p.subscription);
                    return (
                      <li key={p.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{p.title}</p>
                          <p className="text-xs text-[#6F756F] truncate">
                            {p.location} · {p.rooms?.length || 0} room type{(p.rooms?.length || 0) === 1 ? '' : 's'} · from{' '}
                            <span className="tabular-nums">{formatCedis(p.price)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge
                            tone={
                              p.approvalStatus === 'APPROVED'
                                ? subOk && p.isAvailable
                                  ? 'success'
                                  : 'warning'
                                : p.approvalStatus === 'REJECTED'
                                  ? 'error'
                                  : 'info'
                            }
                          >
                            {p.approvalStatus === 'APPROVED'
                              ? subOk && p.isAvailable
                                ? 'Live'
                                : 'Approved, not live'
                              : p.approvalStatus === 'REJECTED'
                                ? 'Not approved'
                                : 'Pending approval'}
                          </StatusBadge>
                          <Link
                            href={`/dashboard/landlord/properties/${p.id}/edit`}
                            className="text-xs font-semibold text-[#16A34A] hover:text-[#15803D] hover:underline"
                          >
                            Edit
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {pendingApproval.length > 0 && (
                <p className="text-xs text-[#6F756F] mt-2">
                  {pendingApproval.length} listing{pendingApproval.length > 1 ? 's are' : ' is'} awaiting administrator review.
                </p>
              )}
            </section>

            <section aria-labelledby="recent-h" className="lg:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <h2 id="recent-h" className="text-sm font-semibold">
                  Recent booking activity
                </h2>
                <Link href="/dashboard/landlord/bookings" className="text-xs font-semibold text-[#16A34A] hover:text-[#15803D] hover:underline">
                  All bookings
                </Link>
              </div>
              {recent.length === 0 ? (
                <div className="p-6 rounded-lg border border-dashed border-[#D8D8CE] text-center text-sm text-[#6F756F]">
                  <CalendarCheck className="w-5 h-5 mx-auto mb-2 text-[#557A67]" aria-hidden="true" />
                  No booking requests yet.
                </div>
              ) : (
                <ul className="rounded-lg border border-[#E7E7DF] dark:border-[#262E2A] bg-white dark:bg-[#141816] divide-y divide-[#E7E7DF] dark:divide-[#262E2A]">
                  {recent.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={`/dashboard/landlord/bookings/${b.id}`}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#F8F7F2] dark:hover:bg-[#1B211E]"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium truncate">
                            {b.tenant?.firstName} {b.tenant?.lastName?.[0] ? `${b.tenant.lastName[0]}.` : ''}
                          </span>
                          <span className="block text-xs text-[#6F756F] truncate">{b.property?.title}</span>
                        </span>
                        <StatusBadge status={b.status} size="xs" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
