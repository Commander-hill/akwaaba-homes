'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Wrench,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  Droplets,
  Zap,
  Wind,
  Key,
  Hammer,
  Bug,
  Building,
  Phone,
  Search,
  ChevronRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, any> = {
  PLUMBING: Droplets,
  ELECTRICAL: Zap,
  AC_COOLING: Wind,
  KEY_LOCK: Key,
  CARPENTRY_STRUCTURAL: Hammer,
  PEST_CONTROL: Bug,
  GENERAL_FACILITY: Building,
};

export default function TenantTicketsPage() {
  const [activeTab, setActiveTab] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['tenant-tickets'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/tickets/me');
        return data.tickets || [];
      } catch {
        return [];
      }
    },
  });

  const tickets = ticketsData || [];

  const openTickets = tickets.filter(
    (t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'PENDING'
  );
  const resolvedTickets = tickets.filter(
    (t: any) => t.status === 'RESOLVED' || t.status === 'CLOSED'
  );

  const filteredTickets = tickets.filter((ticket: any) => {
    const matchesTab =
      activeTab === 'ALL'
        ? true
        : activeTab === 'OPEN'
        ? ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS' || ticket.status === 'PENDING'
        : ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';

    const matchesSearch =
      searchQuery.trim() === '' ||
      ticket.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.property?.title?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
            Maintenance & Repairs
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Submit repair requests, track caretaker progress, and monitor facility escalations.
          </p>
        </div>

        <Link
          href="/dashboard/tenant/tickets/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Report an Issue</span>
        </Link>
      </div>

      {/* ── KPI Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Tickets */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Total Requests</span>
            <div className="w-8 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-zinc-950 dark:text-white">{tickets.length}</p>
        </div>

        {/* Active Issues */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Active / In Progress</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600">{openTickets.length}</p>
        </div>

        {/* Resolved Issues */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Resolved</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#16A34A]">{resolvedTickets.length}</p>
        </div>
      </div>

      {/* ── Emergency Hotline Banner ── */}
      <div className="p-4 rounded-2xl bg-[#FEF2F2] dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-rose-950 dark:text-rose-200">
              Facing an Urgent Facility Emergency?
            </h4>
            <p className="text-[11px] text-rose-700 dark:text-rose-400">
              For active water flooding, electrical sparks, or gas leaks, immediately contact compound security or emergency services.
            </p>
          </div>
        </div>
        <a
          href="tel:+233240000000"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shrink-0 cursor-pointer w-fit"
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Call 24/7 Security</span>
        </a>
      </div>

      {/* ── Tabs & Search ── */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            All Tickets ({tickets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('OPEN')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'OPEN'
                ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Open / In Progress ({openTickets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RESOLVED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'RESOLVED'
                ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-white shadow-2xs'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Resolved ({resolvedTickets.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-8 pr-3 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1.5 focus:ring-[#16A34A]"
          />
        </div>
      </div>

      {/* ── Ticket Cards List ── */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
            <Loader2 className="w-6 h-6 animate-spin text-[#16A34A] mx-auto" />
            <p className="text-xs text-zinc-400">Loading maintenance records...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center space-y-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-white">No maintenance tickets</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                Everything looks clean and operating properly in your residence. Need repairs? File a ticket anytime.
              </p>
            </div>
            <Link
              href="/dashboard/tenant/tickets/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16A34A] text-white text-xs font-bold hover:bg-[#15803D] transition"
            >
              <Plus className="w-4 h-4" />
              <span>Report an Issue</span>
            </Link>
          </div>
        ) : (
          filteredTickets.map((ticket: any) => {
            const Icon = CATEGORY_ICONS[ticket.category] || Wrench;
            const isOpen = ticket.status === 'OPEN' || ticket.status === 'PENDING';
            const isInProgress = ticket.status === 'IN_PROGRESS';
            const isResolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
            const isEmergency = ticket.priority === 'EMERGENCY' || ticket.priority === 'HIGH';

            return (
              <div
                key={ticket.id}
                className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-800 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-zinc-950 dark:text-white leading-tight">
                        {ticket.title}
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {ticket.property?.title || 'Residence'} • Reported on{' '}
                        {new Date(ticket.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2">
                    {/* Priority badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isEmergency
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}
                    >
                      {ticket.priority || 'MEDIUM'}
                    </span>

                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isResolved
                          ? 'bg-emerald-50 text-[#16A34A] border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/40'
                          : isInProgress
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-800/40'
                          : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/40'
                      }`}
                    >
                      {isResolved ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span>{ticket.status}</span>
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed pl-13">
                  {ticket.description}
                </p>

                {/* Ticket Image if uploaded */}
                {ticket.imageUrl && (
                  <div className="pl-13 pt-1">
                    <a
                      href={ticket.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-[11px] font-semibold text-[#16A34A] hover:underline"
                    >
                      View attached photo ↗
                    </a>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
