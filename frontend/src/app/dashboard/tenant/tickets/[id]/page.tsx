'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  ArrowLeft,
  Wrench,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  MapPin,
  Calendar,
  MessageSquare,
  Phone,
  Send,
  Loader2,
  FileText,
  ShieldCheck,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function TicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const ticketId = params?.id as string;
  const [commentText, setCommentText] = useState('');

  const { data: ticketData, isLoading, error } = useQuery({
    queryKey: ['maintenanceTicket', ticketId],
    queryFn: async () => {
      try {
        const res = await api.get(`/tickets/${ticketId}`);
        return res.data?.ticket || null;
      } catch (err: any) {
        return null;
      }
    },
    enabled: Boolean(ticketId)
  });

  const { data: activeBookingData } = useQuery({
    queryKey: ['myActiveBooking'],
    queryFn: async () => {
      try {
        const res = await api.get('/bookings/my-active');
        return res.data?.booking || null;
      } catch {
        return null;
      }
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      const res = await api.post(`/tickets/${ticketId}/notes`, { note });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Follow-up note logged successfully.');
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['maintenanceTicket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tenant-tickets'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Could not post note. Please try again.');
    }
  });

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addNoteMutation.mutate(commentText);
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <p className="text-xs font-semibold text-zinc-500">Loading repair request details...</p>
      </div>
    );
  }

  if (!ticketData) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white">Ticket Not Found</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
          The requested maintenance request could not be located, or you may not have permission to view it.
        </p>
        <Link
          href="/dashboard/tenant/tickets"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#16A34A] text-white text-xs font-bold hover:bg-[#15803D] transition shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Repair Requests</span>
        </Link>
      </div>
    );
  }

  const ticket = ticketData;
  const statusType = ticket.status || 'OPEN';
  const isResolved = statusType === 'RESOLVED' || statusType === 'CLOSED';
  const isInProgress = statusType === 'IN_PROGRESS' || statusType === 'SCHEDULED';
  const propertyTitle = ticket.property?.title || activeBookingData?.property?.title || 'Residential Residence';
  const propertyLocation = ticket.property?.location || ticket.property?.address || activeBookingData?.property?.location || 'Accra, Ghana';
  const landlordName = ticket.property?.landlord
    ? `${ticket.property.landlord.firstName} ${ticket.property.landlord.lastName}`
    : 'Facility Helpdesk';
  const contactPhone =
    ticket.property?.landlord?.phoneNumber ||
    activeBookingData?.property?.landlord?.phoneNumber ||
    '+233 30 200 0000';

  const priorityColors: Record<string, string> = {
    LOW: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    MEDIUM: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    HIGH: 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    URGENT: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800'
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6 pb-24">
      {/* Back Button */}
      <div>
        <Link
          href="/dashboard/tenant/tickets"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Repair Requests</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white dark:bg-[#141A16] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#0B3B24] text-white dark:bg-[#16A34A]">
                {ticket.id?.slice(0, 16)}
              </span>
              <span
                className={clsx(
                  'px-3 py-1 rounded-full text-[11px] font-bold border',
                  priorityColors[ticket.priority?.toUpperCase()] || priorityColors.MEDIUM
                )}
              >
                {ticket.priority || 'MEDIUM'} Priority
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
              {ticket.title}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>{propertyTitle} • {propertyLocation}</span>
            </p>
          </div>

          <div className="shrink-0 flex sm:flex-col items-end gap-2">
            <span
              className={clsx(
                'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold',
                isResolved
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : isInProgress
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
              )}
            >
              {isResolved ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : isInProgress ? (
                <Clock className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{ticket.status || 'OPEN'}</span>
            </span>
            <span className="text-[11px] text-zinc-500 font-medium">
              Logged {new Date(ticket.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Details & Progress Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Description & Comments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Issue Description */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#16A34A]" />
              <span>Issue Description & Details</span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
              {ticket.description}
            </p>

            {ticket.imageUrl && (
              <div className="pt-2">
                <span className="text-xs font-bold text-zinc-500 block mb-2">Attached Photo / Proof:</span>
                <div className="relative w-full max-w-sm h-52 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                  <Image
                    src={ticket.imageUrl}
                    alt="Maintenance photo"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Progress Timeline */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#16A34A]" />
              <span>Resolution Progress</span>
            </h2>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200 dark:before:bg-zinc-800">
              <div className="relative">
                <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50 dark:ring-emerald-950/60" />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Ticket Logged</h4>
                <p className="text-[11px] text-zinc-500">Dispatch request received by estate management desk.</p>
              </div>

              <div className="relative">
                <span
                  className={clsx(
                    'absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ring-4',
                    isInProgress || isResolved
                      ? 'bg-emerald-500 ring-emerald-50 dark:ring-emerald-950/60'
                      : 'bg-zinc-300 ring-zinc-50 dark:ring-zinc-800'
                  )}
                />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Assigned to Facility Technician</h4>
                <p className="text-[11px] text-zinc-500">
                  Compound maintenance engineer assigned to inspect fittings.
                </p>
              </div>

              <div className="relative">
                <span
                  className={clsx(
                    'absolute -left-6 top-1 w-3.5 h-3.5 rounded-full ring-4',
                    isResolved
                      ? 'bg-emerald-500 ring-emerald-50 dark:ring-emerald-950/60'
                      : 'bg-zinc-300 ring-zinc-50 dark:ring-zinc-800'
                  )}
                />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Inspection & Resolution</h4>
                <p className="text-[11px] text-zinc-500">
                  {isResolved
                    ? 'Work inspected and marked resolved.'
                    : 'Awaiting completion of repairs.'}
                </p>
              </div>
            </div>
          </div>

          {/* Add Note / Message form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-3">
            <h2 className="text-sm font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#16A34A]" />
              <span>Leave a follow-up note</span>
            </h2>
            <form onSubmit={handleSendComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Add instructions or additional details for the technician..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={addNoteMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white outline-none focus:border-[#16A34A] disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={addNoteMutation.isPending || !commentText.trim()}
                className="px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                {addNoteMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{addNoteMutation.isPending ? 'Logging...' : 'Send'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right 1 Col: Caretaker Contact & Compound Rules */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Assigned Facility Contact
            </h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#EAF5EC] dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center font-bold text-sm">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-xs text-zinc-900 dark:text-white">{landlordName}</p>
                <p className="text-[11px] text-zinc-500">Akwaaba Resident Services</p>
              </div>
            </div>
            <a
              href={`tel:${contactPhone.replace(/\s+/g, '')}`}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition"
            >
              <Phone className="w-3.5 h-3.5 text-[#16A34A]" />
              <span>Call Estate Desk ({contactPhone})</span>
            </a>
          </div>

          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-3 text-xs text-zinc-600 dark:text-zinc-400">
            <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
              <span>Resident Repair Guarantee</span>
            </h4>
            <p className="leading-relaxed">
              Standard maintenance repairs are attended to within 24–48 working hours. For urgent water or electrical leaks, notify the facility manager immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
