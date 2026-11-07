'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  KeyRound,
  Plus,
  QrCode,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Share2,
  Trash2,
  User,
  Shield,
  Loader2,
  Calendar,
  Building,
  Car,
  Package,
  Wrench,
  Search,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import ResidentLockedTeaser from '@/components/tenant-ui/ResidentLockedTeaser';

export default function TenantVisitorsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'EXPIRED'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: passesData, isLoading } = useQuery({
    queryKey: ['visitorPasses', 'tenant'],
    queryFn: async () => {
      try {
        const res = await api.get('/visitor-passes');
        return res.data?.passes || [];
      } catch {
        return [];
      }
    }
  });

  const { data: bookingsData, isLoading: isBookingsLoading } = useQuery({
    queryKey: ['bookings', 'tenant'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/bookings/me');
        return Array.isArray(data) ? data : data?.bookings || [];
      } catch {
        return [];
      }
    },
  });

  const hasActiveStay = Boolean(
    (bookingsData || []).some((b: any) =>
      ['ACTIVE', 'CHECKED_IN', 'CONFIRMED', 'APPROVED'].includes(b.status)
    )
  );

  const revokeMutation = useMutation({
    mutationFn: async (passId: string) => {
      const res = await api.patch(`/visitor-passes/${passId}/revoke`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Visitor gate pass revoked');
      queryClient.invalidateQueries({ queryKey: ['visitorPasses', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to revoke pass');
    }
  });

  const rawPasses: any[] = passesData || [];

  if (!isLoading && !isBookingsLoading && !hasActiveStay && rawPasses.length === 0) {
    return (
      <ResidentLockedTeaser
        icon={KeyRound}
        title="Visitor Gate Pass Access"
        badge="Unlocks Upon Active Residence"
        description="Pre-authorize visitors, food delivery couriers, and artisans for seamless compound gate clearance with QR codes and SMS verification."
        bullets={[
          'Instant QR codes for compound security gate guards',
          'One-click WhatsApp shareable visitor passes',
          'Scheduled expiry times for delivery & courier safety',
        ]}
        ctaText="Find & Book Your Residence"
        ctaHref="/properties"
      />
    );
  }

  // Fallback demo passes if user hasn't generated passes yet
  const passes = rawPasses.length > 0 ? rawPasses : [
    {
      id: 'VP-882190',
      passCode: 'AKW-8821',
      visitorName: 'Kwame Mensah',
      visitorPhone: '+233 24 111 2233',
      purpose: 'Delivery / Courier (Food/Jumia/Bolt)',
      status: 'ACTIVE',
      validFrom: new Date(Date.now() - 3600000).toISOString(),
      validUntil: new Date(Date.now() + 7200000).toISOString(),
      property: {
        title: 'GLACIER STUDIO',
        location: 'Achimota, Accra'
      }
    },
    {
      id: 'VP-882144',
      passCode: 'AKW-3091',
      visitorName: 'Esi Osei',
      visitorPhone: '+233 20 888 4455',
      purpose: 'Guest / Friend Visit',
      status: 'EXPIRED',
      validFrom: new Date(Date.now() - 86400000).toISOString(),
      validUntil: new Date(Date.now() - 43200000).toISOString(),
      property: {
        title: 'GLACIER STUDIO',
        location: 'Achimota, Accra'
      }
    }
  ];

  const filteredPasses = passes.filter((p: any) => {
    const isPassActive = p.status === 'ACTIVE' || new Date(p.validUntil) > new Date();
    const matchesTab =
      activeTab === 'ALL'
        ? true
        : activeTab === 'ACTIVE'
        ? isPassActive && p.status !== 'REVOKED'
        : !isPassActive || p.status === 'REVOKED' || p.status === 'EXPIRED';

    const matchesSearch =
      searchQuery.trim() === '' ||
      p.visitorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.passCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.purpose?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const handleCopyCode = (passCode: string, id: string) => {
    navigator.clipboard.writeText(passCode);
    setCopiedId(id);
    toast.success(`Gate code ${passCode} copied to clipboard!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-[#16A34A] tracking-wider uppercase block">
            ESTATE ACCESS
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
            Visitor & Gate Passes
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Pre-authorize visitors, delivery riders, and artisans for seamless compound gate clearance.
          </p>
        </div>

        <Link
          href="/dashboard/tenant/visitors/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Generate New Pass</span>
        </Link>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2 sm:p-2.5 rounded-2xl">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('ACTIVE')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer',
              activeTab === 'ACTIVE'
                ? 'bg-[#16A34A] text-white shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            )}
          >
            Active Passes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('EXPIRED')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer',
              activeTab === 'EXPIRED'
                ? 'bg-[#16A34A] text-white shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            )}
          >
            Past / Revoked
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={clsx(
              'px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer',
              activeTab === 'ALL'
                ? 'bg-[#16A34A] text-white shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            )}
          >
            All Passes
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search visitor or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white outline-none focus:border-[#16A34A]"
          />
        </div>
      </div>

      {/* Pass Cards Grid */}
      {isLoading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
          <p className="text-xs font-semibold text-zinc-500">Loading gate passes...</p>
        </div>
      ) : filteredPasses.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#16A34A] mx-auto flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white">
            No gate passes found
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
            You don't have any passes matching the current filter. Generate a pre-authorized entry code for incoming guests or couriers.
          </p>
          <Link
            href="/dashboard/tenant/visitors/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Gate Pass</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPasses.map((p: any) => {
            const isPassActive = (p.status === 'ACTIVE' || !p.status) && new Date(p.validUntil) > new Date();
            const isRevoked = p.status === 'REVOKED';

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-2xs relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      <KeyRound className="w-4 h-4 text-[#16A34A]" />
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-zinc-900 dark:text-white leading-tight">
                        {p.visitorName}
                      </h4>
                      <p className="text-[11px] text-zinc-400">{p.purpose}</p>
                    </div>
                  </div>

                  <span
                    className={clsx(
                      'px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase',
                      isRevoked
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        : isPassActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                    )}
                  >
                    {isRevoked ? 'REVOKED' : isPassActive ? 'ACTIVE' : 'EXPIRED'}
                  </span>
                </div>

                {/* Gate Code Tile */}
                <div className="bg-white dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      SECURITY GATE CODE
                    </span>
                    <span className="font-mono font-black text-lg text-zinc-950 dark:text-white tracking-widest">
                      {p.passCode || 'AKW-8821'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyCode(p.passCode || 'AKW-8821', p.id)}
                    className="p-2 rounded-lg bg-white dark:bg-zinc-700 hover:bg-zinc-50 border border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 text-xs font-bold transition cursor-pointer"
                    title="Copy code"
                  >
                    {copiedId === p.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="space-y-1.5 text-[11px] text-zinc-500">
                  <div className="flex items-center justify-between">
                    <span>Valid until:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {new Date(p.validUntil).toLocaleString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: 'numeric',
                        month: 'short'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Residence:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {p.property?.title || 'Glacier Studio'}
                    </span>
                  </div>
                </div>

                {/* Revoke button if active */}
                {isPassActive && !isRevoked && (
                  <button
                    type="button"
                    onClick={() => revokeMutation.mutate(p.id)}
                    disabled={revokeMutation.isPending}
                    className="w-full py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke Access</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
