'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import api from '@/lib/axios';
import { Button, ErrorState, StatusBadge, formatCedis } from '@/components/tenant-ui/primitives';

const fmt = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '-';
const fmtTime = (d?: string) => (d ? new Date(d).toLocaleString('en-GB') : '');

const NEXT: Record<string, { status: string; label: string; danger?: boolean; confirm: string }[]> = {
  PENDING: [
    { status: 'APPROVED', label: 'Approve request', confirm: 'Approve this request? The tenant will be asked to sign the agreement and pay.' },
    { status: 'REJECTED', label: 'Decline request', danger: true, confirm: 'Decline this request? This cannot be undone.' },
  ],
  APPROVED: [{ status: 'CANCELLED', label: 'Cancel approval', danger: true, confirm: 'Cancel this approved booking? The tenant will be notified.' }],
  CONFIRMED: [
    { status: 'CHECKED_IN', label: 'Mark as checked in', confirm: 'Confirm that the tenant has checked in?' },
    { status: 'CANCELLED', label: 'Cancel booking', danger: true, confirm: 'Cancel this confirmed booking?' },
  ],
  CHECKED_IN: [{ status: 'COMPLETED', label: 'Mark as completed', confirm: 'Mark this stay as completed?' }],
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [pendingAction, setPendingAction] = useState<null | { status: string; label: string; confirm: string; danger?: boolean }>(null);

  const { data: booking, isLoading, isError, refetch } = useQuery({
    queryKey: ['landlord', 'booking', id],
    queryFn: async () => {
      const res = await api.get(`/bookings/${id}`);
      return res.data.booking || res.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (status: string) => (await api.put(`/bookings/${id}/status`, { status })).data,
    onSuccess: () => {
      toast.success('Booking updated');
      setPendingAction(null);
      qc.invalidateQueries({ queryKey: ['landlord'] });
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Could not update this booking. Please try again.');
      setPendingAction(null);
      refetch();
    },
  });

  if (isError) return <ErrorState message="We could not load this booking." onRetry={() => refetch()} />;
  if (isLoading || !booking) return <div className="h-40 rounded bg-[#EFEDE5] animate-pulse" aria-busy="true" />;

  const t = booking.tenant || {};
  const actions = NEXT[booking.status] || [];
  const lease = booking.leaseAgreement;
  const tx = booking.transaction || booking.transactions?.[0];

  const timeline = [
    { label: 'Request submitted', at: booking.createdAt, done: true },
    { label: 'Approved by you', at: null, done: ['APPROVED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status) },
    { label: 'Tenant signed agreement', at: lease?.tenantSignedAt, done: !!lease?.tenantSignedAt },
    { label: 'You signed agreement', at: lease?.landlordSignedAt, done: !!lease?.landlordSignedAt },
    { label: 'Payment received', at: tx?.status === 'SUCCESS' ? tx.createdAt : null, done: tx?.status === 'SUCCESS' },
  ];

  const row = (k: string, v: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-[#6F756F]">{k}</dt>
      <dd className="text-right font-medium">{v || '-'}</dd>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/dashboard/landlord/bookings" className="inline-flex items-center gap-1.5 text-sm text-[#6F756F] hover:text-[#16A34A]">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Bookings
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-editorial text-3xl">
            {t.firstName} {t.lastName}
          </h1>
          <p className="text-sm text-[#6F756F] mt-1">{booking.property?.title}</p>
        </div>
        <StatusBadge status={booking.status} />
      </header>

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button key={a.status} variant={a.danger ? 'danger' : 'primary'} onClick={() => setPendingAction(a)}>
              {a.label}
            </Button>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <section className="rounded-lg border border-[#E7E7DF] bg-white dark:bg-[#141816] p-5">
          <h2 className="text-sm font-semibold mb-1">Stay</h2>
          <dl className="divide-y divide-[#E7E7DF]">
            {row('Check-in', fmt(booking.startDate))}
            {row('Check-out', fmt(booking.endDate))}
            {row('Room type', [booking.room?.blockName, booking.room?.roomType].filter(Boolean).join(' · '))}
            {row('Unit', booking.roomUnit?.unitNumber)}
            {row('Bed', booking.bed?.bedNumber)}
            {row('Rental period', booking.property?.pricePeriod)}
            {row('Rent', <span className="tabular-nums">{formatCedis(booking.price ?? booking.room?.price ?? booking.property?.price)}</span>)}
            {booking.property?.cautionDeposit
              ? row('Caution deposit', <span className="tabular-nums">{formatCedis(booking.property.cautionDeposit)}</span>)
              : null}
          </dl>
        </section>

        <section className="rounded-lg border border-[#E7E7DF] bg-white dark:bg-[#141816] p-5">
          <h2 className="text-sm font-semibold mb-1">Tenant</h2>
          <dl className="divide-y divide-[#E7E7DF]">
            {row('Gender', t.gender)}
            {row('Campus', t.campus)}
            {row('Programme', t.programmeOfStudy)}
            {row('Year of study', t.yearOfStudy)}
            {row('Identity', t.ghanaCardStatus === 'VERIFIED' ? 'Verified' : 'Not verified')}
            {['APPROVED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED'].includes(booking.status)
              ? row('Phone', t.phoneNumber)
              : null}
          </dl>
          {booking.status === 'PENDING' && (
            <p className="text-xs text-[#6F756F] mt-3">Contact details are shared once you approve the request.</p>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-[#E7E7DF] bg-white dark:bg-[#141816] p-5">
        <h2 className="text-sm font-semibold mb-3">Progress</h2>
        <ol className="space-y-3">
          {timeline.map((s) => (
            <li key={s.label} className="flex items-start gap-3 text-sm">
              <span
                aria-hidden="true"
                className={`mt-1 w-2.5 h-2.5 rounded-full ${s.done ? 'bg-[#173D32]' : 'border border-[#BFC4BD]'}`}
              />
              <span className={s.done ? '' : 'text-[#6F756F]'}>
                {s.label}
                {s.at && <span className="block text-xs text-[#6F756F]">{fmtTime(s.at)}</span>}
                <span className="sr-only">{s.done ? ' (done)' : ' (pending)'}</span>
              </span>
            </li>
          ))}
        </ol>
        {['REJECTED', 'CANCELLED'].includes(booking.status) && (
          <p className="text-sm text-[#9E2A2B] mt-4">This booking was {booking.status.toLowerCase()}.</p>
        )}
      </section>

      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-h">
          <div className="absolute inset-0 bg-black/50" onClick={() => !mutation.isPending && setPendingAction(null)} />
          <div className="relative bg-white dark:bg-[#141816] rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h2 id="confirm-h" className="font-semibold">
              {pendingAction.label}
            </h2>
            <p className="text-sm text-[#6F756F] mt-2">{pendingAction.confirm}</p>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" disabled={mutation.isPending} onClick={() => setPendingAction(null)}>
                Go back
              </Button>
              <Button
                variant={pendingAction.danger ? 'danger' : 'primary'}
                isLoading={mutation.isPending}
                onClick={() => mutation.mutate(pendingAction.status)}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
