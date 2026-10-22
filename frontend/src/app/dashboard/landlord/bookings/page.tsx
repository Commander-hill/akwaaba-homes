'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Search } from 'lucide-react';
import api from '@/lib/axios';
import { EmptyState, ErrorState, StatusBadge, formatCedis } from '@/components/tenant-ui/primitives';

const TABS: { key: string; label: string; statuses: string[] | null }[] = [
  { key: 'ALL', label: 'All', statuses: null },
  { key: 'PENDING', label: 'Pending', statuses: ['PENDING'] },
  { key: 'APPROVED', label: 'Awaiting payment', statuses: ['APPROVED'] },
  { key: 'ACTIVE', label: 'Confirmed / active', statuses: ['CONFIRMED', 'CHECKED_IN', 'COMPLETED'] },
  { key: 'CLOSED', label: 'Rejected / cancelled', statuses: ['REJECTED', 'CANCELLED'] },
];

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

function Queue() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = TABS.find((t) => t.key === sp.get('status')) || TABS[0];
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const PAGE = 10;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['landlord', 'bookings'],
    queryFn: async () => (await api.get('/bookings/landlord')).data.bookings as any[],
  });

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    TABS.forEach((t) => {
      out[t.key] = (data || []).filter((b) => !t.statuses || t.statuses.includes(b.status)).length;
    });
    return out;
  }, [data]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data || [])
      .filter((b) => !tab.statuses || tab.statuses.includes(b.status))
      .filter(
        (b) =>
          !term ||
          `${b.tenant?.firstName} ${b.tenant?.lastName} ${b.property?.title}`.toLowerCase().includes(term)
      );
  }, [data, tab, q]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const visible = rows.slice((page - 1) * PAGE, page * PAGE);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-editorial text-3xl">Bookings</h1>
        <p className="text-sm text-[#6F756F] mt-1">
          Approve a request to let the tenant sign the agreement and pay. Rooms are held only after payment.
        </p>
      </header>

      <div role="tablist" aria-label="Booking status" className="flex gap-1 overflow-x-auto border-b border-[#E7E7DF]">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab.key === t.key}
            onClick={() => {
              setPage(1);
              router.replace(`/dashboard/landlord/bookings${t.key === 'ALL' ? '' : `?status=${t.key}`}`);
            }}
            className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px cursor-pointer ${
              tab.key === t.key
                ? 'border-[#16A34A] font-semibold text-[#16A34A] dark:text-emerald-400'
                : 'border-transparent text-[#6F756F] hover:text-[#242925]'
            }`}
          >
            {t.label} <span className="tabular-nums text-xs">({counts[t.key] ?? 0})</span>
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6F756F]" aria-hidden="true" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Search tenant or property"
          aria-label="Search bookings"
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E7E7DF] bg-white dark:bg-[#141816] text-sm"
        />
      </div>

      {isError ? (
        <ErrorState message="We could not load your bookings." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded bg-[#EFEDE5] animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No bookings here"
          description="Requests from tenants will appear in this queue."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-[#E7E7DF] dark:border-[#262E2A] bg-white dark:bg-[#141816]">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-[#6F756F] bg-[#F8F7F2] dark:bg-[#1B211E]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Tenant</th>
                  <th className="px-4 py-2.5 font-medium">Property and room</th>
                  <th className="px-4 py-2.5 font-medium">Period</th>
                  <th className="px-4 py-2.5 font-medium text-right">Price</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E7DF] dark:divide-[#262E2A]">
                {visible.map((b) => (
                  <tr key={b.id} className="hover:bg-[#F8F7F2] dark:hover:bg-[#1B211E]">
                    <td className="px-4 py-3 font-medium">
                      {b.tenant?.firstName} {b.tenant?.lastName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block">{b.property?.title}</span>
                      <span className="block text-xs text-[#6F756F]">
                        {[b.room?.blockName, b.room?.roomType, b.roomUnit?.unitNumber && `Unit ${b.roomUnit.unitNumber}`]
                          .filter(Boolean)
                          .join(' · ') || 'Room not assigned'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {fmtDate(b.startDate)} to {fmtDate(b.endDate)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                      {formatCedis(b.price)}
                      <span className="block text-[11px] text-[#6F756F]">{b.property?.pricePeriod}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} size="xs" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/landlord/bookings/${b.id}`}
                        className="text-xs font-semibold text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 hover:underline"
                      >
                        {b.status === 'PENDING' ? 'Review' : 'View'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6F756F]">
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  className="h-9 px-3 rounded-lg border border-[#E7E7DF] disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={page === pages}
                  onClick={() => setPage(page + 1)}
                  className="h-9 px-3 rounded-lg border border-[#E7E7DF] disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function LandlordBookingsPage() {
  return (
    <Suspense fallback={null}>
      <Queue />
    </Suspense>
  );
}
