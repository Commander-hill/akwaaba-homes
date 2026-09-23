'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Wrench,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  Calendar,
  Camera,
  User,
  Phone,
  Mail,
  Building,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Check,
  ZoomIn
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getImageUrl } from '@/lib/utils';

export default function AdminTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; title: string } | null>(null);

  // Fetch all tickets to find this case file
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['admin-tickets'],
    queryFn: async () => {
      const res = await api.get('/admin/tickets');
      return res.data;
    }
  });

  const ticket = (tickets as any[]).find((t: any) => t.id === ticketId);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.put(`/admin/tickets/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Ticket status updated by platform arbitration');
      queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update ticket status');
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-semibold text-slate-500">Loading case arbitration file...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">Case File Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          The requested maintenance dispute file could not be located in the platform database.
        </p>
        <Link
          href="/admin/tickets"
          className="px-4 py-2 bg-[#0F5132] text-white rounded-xl text-xs font-bold transition"
        >
          Return to Tickets Queue
        </Link>
      </div>
    );
  }

  const landlordPhone = ticket.property?.landlord?.phoneNumber?.replace(/[^0-9]/g, '') || '';
  const whatsAppText = encodeURIComponent(
    `Hello ${ticket.property?.landlord?.firstName || 'Landlord'}, this is an urgent escalation from Akwaaba Homes management regarding maintenance ticket: "${ticket.title}" at ${ticket.property?.title}.`
  );

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-in">
      {/* ── Breadcrumbs & Navigation ── */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
          <Link href="/admin/dashboard" className="hover:text-emerald-600 transition">
            Admin Console
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/admin/tickets" className="hover:text-emerald-600 transition">
            Maintenance Tickets
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 dark:text-zinc-200">Arbitration Case #{ticket.id.slice(0, 8)}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Arbitration Case File
              </span>
              <span className="text-xs font-semibold text-slate-400">•</span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                ticket.priority === 'URGENT'
                  ? 'bg-red-500 text-white animate-pulse'
                  : ticket.priority === 'HIGH'
                  ? 'bg-orange-500 text-white'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              }`}>
                {ticket.priority} Priority
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
              {ticket.title}
            </h1>
          </div>

          <Link
            href="/admin/tickets"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Queue
          </Link>
        </div>
      </div>

      {/* ── Main 2-Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Case Details & Evidence (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Tenant Statement & Full Description */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-7 shadow-xs space-y-4">
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
              Tenant Work Order Description
            </h2>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 font-normal text-xs sm:text-sm text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Logged on: {new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
              {ticket.scheduledDate && (
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  Scheduled Visit: {new Date(ticket.scheduledDate).toLocaleDateString('en-GB')}
                </span>
              )}
            </div>
          </div>

          {/* Photographic Evidence */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" /> Photographic Evidence
              </h2>
              {ticket.imageUrl && (
                <button
                  type="button"
                  onClick={() => setZoomedPhoto({ url: getImageUrl(ticket.imageUrl), title: 'Tenant Uploaded Evidence' })}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ZoomIn className="w-3.5 h-3.5" /> Fullscreen View
                </button>
              )}
            </div>

            <div className="border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl p-2 bg-slate-50 dark:bg-zinc-950 min-h-[220px] flex items-center justify-center">
              {ticket.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getImageUrl(ticket.imageUrl)}
                  alt="Fault Evidence"
                  className="max-h-80 object-contain rounded-xl w-full"
                />
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <Camera className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  No photographic evidence uploaded with this ticket
                </div>
              )}
            </div>
          </div>

          {/* Resolution & Contractor Notes (if present) */}
          {(ticket.resolutionNotes || ticket.completionImageUrl) && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-emerald-200 dark:border-emerald-900/50 p-6 sm:p-7 shadow-xs space-y-4">
              <h2 className="text-base font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Resolution Audit Records
              </h2>

              {ticket.resolutionNotes && (
                <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 text-xs text-slate-800 dark:text-zinc-200">
                  <span className="font-bold block mb-1 text-emerald-800 dark:text-emerald-400">
                    Artisan / Landlord Completion Notes:
                  </span>
                  {ticket.resolutionNotes}
                </div>
              )}

              {ticket.completionImageUrl && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Post-Repair Proof Photo:
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImageUrl(ticket.completionImageUrl)}
                    alt="Completion Photo"
                    className="max-h-60 object-contain rounded-xl border border-slate-200 dark:border-zinc-800"
                  />
                </div>
              )}
            </div>
          )}

          {/* Maintenance and Repair Standard */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50 text-xs text-emerald-950 dark:text-emerald-300 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-black block mb-0.5">Property Maintenance &amp; Repair Standard:</strong>
              Landlords are required to maintain rental properties in tenantable repair and promptly resolve defects that affect hygiene, safety, or basic living conditions. Urgent hazards must be investigated and resolved swiftly.
            </div>
          </div>
        </div>

        {/* Right Column: Stakeholders & Arbitration Control (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Dispute Status & Override Actions */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
                Arbitration Status
              </h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                ticket.status === 'RESOLVED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : ticket.status === 'IN_PROGRESS'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : ticket.status === 'REJECTED'
                  ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {ticket.status}
              </span>
            </div>

            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Administrative Override Decision:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'PENDING', label: 'Mark Pending', color: 'hover:border-amber-400' },
                  { key: 'IN_PROGRESS', label: 'In Progress', color: 'hover:border-blue-400' },
                  { key: 'RESOLVED', label: 'Resolve Ticket', color: 'hover:border-emerald-400' },
                  { key: 'REJECTED', label: 'Dismiss / Reject', color: 'hover:border-red-400' }
                ].map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    disabled={updateStatusMutation.isPending || ticket.status === s.key}
                    onClick={() => updateStatusMutation.mutate({ id: ticket.id, status: s.key })}
                    className={`py-2.5 px-3 rounded-xl text-xs font-extrabold border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      ticket.status === s.key
                        ? 'bg-[#0F5132] text-white border-[#0F5132] shadow-xs'
                        : `bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 ${s.color}`
                    }`}
                  >
                    {updateStatusMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Landlord Contact & Urgent WhatsApp Action */}
          {ticket.property?.landlord && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600" /> Property Manager / Landlord
              </h3>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 space-y-2 text-xs">
                <div className="font-extrabold text-slate-900 dark:text-white">
                  {ticket.property.landlord.firstName} {ticket.property.landlord.lastName}
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{ticket.property.landlord.email}</span>
                </div>
                {ticket.property.landlord.phoneNumber && (
                  <div className="flex items-center gap-2 text-slate-500 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ticket.property.landlord.phoneNumber}</span>
                  </div>
                )}
              </div>

              {landlordPhone && (
                <a
                  href={`https://wa.me/${landlordPhone}?text=${whatsAppText}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" /> Escalate via WhatsApp
                </a>
              )}
            </div>
          )}

          {/* Tenant Contact Information */}
          {ticket.tenant && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" /> Affected Tenant
              </h3>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 space-y-2 text-xs">
                <div className="font-extrabold text-slate-900 dark:text-white">
                  {ticket.tenant.firstName} {ticket.tenant.lastName}
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{ticket.tenant.email}</span>
                </div>
                {ticket.tenant.phoneNumber && (
                  <div className="flex items-center gap-2 text-slate-500 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{ticket.tenant.phoneNumber}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Property Context */}
          {ticket.property && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Property Listing
                </span>
                <Link
                  href={`/properties/${ticket.property.id}`}
                  target="_blank"
                  className="text-emerald-600 hover:underline flex items-center gap-1 font-bold text-[11px]"
                >
                  <ExternalLink className="w-3 h-3" /> Public Page
                </Link>
              </div>
              <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                {ticket.property.title}
              </div>
              <p className="text-slate-500">{ticket.property.location || 'Ghana'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Zoom */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-5xl w-full flex flex-col items-center">
            <div className="flex justify-between items-center w-full mb-3 text-white">
              <h3 className="font-extrabold text-sm">{zoomedPhoto.title}</h3>
              <button
                type="button"
                onClick={() => setZoomedPhoto(null)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold"
              >
                Close (Esc)
              </button>
            </div>
            <div className="border border-white/20 rounded-2xl overflow-hidden max-h-[85vh] bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={zoomedPhoto.url} alt={zoomedPhoto.title} className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
