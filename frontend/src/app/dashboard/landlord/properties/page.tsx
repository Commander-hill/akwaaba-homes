'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Building2, Search } from 'lucide-react';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import { Button, EmptyState, ErrorState, StatusBadge, formatCedis } from '@/components/tenant-ui/primitives';

const isSubActive = (sub: any) =>
  !!sub && sub.isActive && sub.paymentStatus === 'COMPLETED' && new Date(sub.endDate) > new Date();

type Lifecycle = 'LIVE' | 'NEEDS_SUBSCRIPTION' | 'PENDING' | 'REJECTED' | 'HIDDEN';

const lifecycle = (p: any): Lifecycle => {
  if (p.approvalStatus === 'REJECTED') return 'REJECTED';
  if (isSubActive(p.subscription)) {
    return p.isAvailable ? 'LIVE' : 'HIDDEN';
  }
  if (p.approvalStatus === 'PENDING') return 'PENDING';
  return 'NEEDS_SUBSCRIPTION';
};

const LABEL: Record<Lifecycle, { text: string; tone: 'success' | 'warning' | 'error' | 'info' | 'neutral' }> = {
  LIVE: { text: 'Live', tone: 'success' },
  NEEDS_SUBSCRIPTION: { text: 'Approved, needs subscription', tone: 'warning' },
  PENDING: { text: 'Pending approval', tone: 'info' },
  REJECTED: { text: 'Not approved', tone: 'error' },
  HIDDEN: { text: 'Approved, hidden', tone: 'neutral' },
};

const FILTERS: { key: 'ALL' | Lifecycle; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'LIVE', label: 'Live' },
  { key: 'NEEDS_SUBSCRIPTION', label: 'Needs subscription' },
  { key: 'PENDING', label: 'Pending approval' },
  { key: 'REJECTED', label: 'Not approved' },
];

function Inventory() {
  const router = useRouter();
  const sp = useSearchParams();
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'ALL' | Lifecycle>('ALL');
  const [sort, setSort] = useState<'newest' | 'title' | 'price'>('newest');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const PAGE = 8;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['landlord', 'properties'],
    queryFn: async () => (await api.get('/properties/landlord/mine')).data.data as any[],
  });

  // Subscription payment return: the backend verifies with the provider; the browser return alone activates nothing.
  const verify = useMutation({
    mutationFn: async ({ reference, provider }: { reference: string; provider?: string }) => {
      const { data } = await api.post('/subscriptions/verify', {
        paymentReference: reference,
        provider: provider || (reference.includes('HUBTEL') ? 'HUBTEL' : 'PAYSTACK'),
      });
      return data?.data || data;
    },
    onSuccess: () => {
      toast.success('Payment verified. Your subscription is active.');
      qc.invalidateQueries({ queryKey: ['landlord'] });
      router.replace('/dashboard/landlord/properties');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'We could not verify this payment yet. Check the Subscription page.');
      router.replace('/dashboard/landlord/properties');
    },
  });
  const verified = useRef(false);
  useEffect(() => {
    const reference = sp.get('reference') || sp.get('trxref') || sp.get('clientReference');
    if (sp.get('verify') === 'true' && reference && !verified.current) {
      verified.current = true;
      verify.mutate({ reference, provider: sp.get('provider') || undefined });
    }
  }, [sp, verify]);

  const del = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/properties/${id}`)).data,
    onSuccess: (d) => {
      toast.success(d?.message || 'Property removed');
      qc.invalidateQueries({ queryKey: ['landlord'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Could not remove this property.'),
    onSettled: () => setDeleteTarget(null),
  });

  const all = useMemo(() => (data || []).filter((p) => p.approvalStatus !== 'DELETED'), [data]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const out = all
      .filter((p) => filter === 'ALL' || lifecycle(p) === filter)
      .filter((p) => !term || `${p.title} ${p.location}`.toLowerCase().includes(term));
    out.sort((a, b) =>
      sort === 'title'
        ? String(a.title).localeCompare(String(b.title))
        : sort === 'price'
          ? Number(a.price) - Number(b.price)
          : +new Date(b.createdAt) - +new Date(a.createdAt)
    );
    return out;
  }, [all, q, filter, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const visible = rows.slice((page - 1) * PAGE, page * PAGE);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-editorial text-3xl">Properties</h1>
          <p className="text-sm text-[#6F756F] mt-1">
            A listing is visible to tenants only when it is approved and has an active subscription.
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

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6F756F]" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            aria-label="Search properties"
            placeholder="Search by name or location"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#E7E7DF] bg-white dark:bg-[#141816] text-sm"
          />
        </div>
        <select
          aria-label="Filter by status"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as any);
            setPage(1);
          }}
          className="h-10 px-3 rounded-lg border border-[#E7E7DF] bg-white dark:bg-[#141816] text-sm"
        >
          {FILTERS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as any)}
          className="h-10 px-3 rounded-lg border border-[#E7E7DF] bg-white dark:bg-[#141816] text-sm"
        >
          <option value="newest">Newest first</option>
          <option value="title">Name (A to Z)</option>
          <option value="price">Lowest price</option>
        </select>
      </div>

      {isError ? (
        <ErrorState message="We could not load your properties." onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-[#EFEDE5] animate-pulse" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add a property, set up its rooms and upload photos. It is reviewed before tenants can see it."
          actionLabel="Add property"
          actionHref="/dashboard/landlord/new"
        />
      ) : rows.length === 0 ? (
        <EmptyState icon={Search} title="No matching properties" description="Try a different search or filter." />
      ) : (
        <>
          <ul className="rounded-lg border border-[#E7E7DF] dark:border-[#262E2A] bg-white dark:bg-[#141816] divide-y divide-[#E7E7DF] dark:divide-[#262E2A]">
            {visible.map((p) => {
              const state = lifecycle(p);
              const imgs: string[] = Array.isArray(p.images) ? p.images : [];
              const roomCount = (p.rooms || []).reduce((n: number, r: any) => n + Number(r.numberOfRooms || 0), 0);
              return (
                <li key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="w-full sm:w-28 h-20 rounded-md bg-[#EFEDE5] overflow-hidden shrink-0">
                    {imgs[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getImageUrl(imgs[0])} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold truncate">{p.title}</h2>
                      <StatusBadge tone={LABEL[state].tone} size="xs">
                        {LABEL[state].text}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-[#6F756F] mt-0.5 truncate">
                      {p.type} · {p.location}
                    </p>
                    <p className="text-xs text-[#6F756F] mt-1">
                      <span className="tabular-nums">{(p.rooms || []).length}</span> room type
                      {(p.rooms || []).length === 1 ? '' : 's'} ·{' '}
                      <span className="tabular-nums">{roomCount}</span> room{roomCount === 1 ? '' : 's'} · from{' '}
                      <span className="tabular-nums">{formatCedis(p.price)}</span> per {p.pricePeriod || 'period'}
                    </p>
                    {state === 'REJECTED' && (
                      <p className="text-xs text-[#9E2A2B] mt-1">
                        This listing was not approved. Review the details and save changes to resubmit.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-semibold shrink-0">
                    {state === 'NEEDS_SUBSCRIPTION' && (
                      <Link
                        href={`/dashboard/landlord/properties/${p.id}/publish`}
                        className="h-8 px-3 inline-flex items-center rounded-lg bg-[#173D32] text-white"
                      >
                        Activate subscription
                      </Link>
                    )}
                    {state === 'LIVE' && (
                      <Link href={`/properties/${p.id}`} className="text-[#173D32] dark:text-emerald-400 hover:underline">
                        View public page
                      </Link>
                    )}
                    <Link
                      href={`/dashboard/landlord/properties/${p.id}/edit`}
                      className="text-[#173D32] dark:text-emerald-400 hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(p)}
                      className="text-[#9E2A2B] hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          {pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6F756F]">
                Page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="del-h">
          <div className="absolute inset-0 bg-black/50" onClick={() => !del.isPending && setDeleteTarget(null)} />
          <div className="relative bg-white dark:bg-[#141816] rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h2 id="del-h" className="font-semibold">
              Remove {deleteTarget.title}?
            </h2>
            <p className="text-sm text-[#6F756F] mt-2">
              The listing will no longer be visible to tenants. Properties with active tenancies cannot be removed.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" disabled={del.isPending} onClick={() => setDeleteTarget(null)}>
                Keep property
              </Button>
              <Button variant="danger" isLoading={del.isPending} onClick={() => del.mutate(deleteTarget.id)}>
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LandlordPropertiesPage() {
  return (
    <Suspense fallback={null}>
      <Inventory />
    </Suspense>
  );
}
