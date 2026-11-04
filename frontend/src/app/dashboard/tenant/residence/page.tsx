'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Building2,
  MapPin,
  Calendar,
  Key,
  Wifi,
  Zap,
  Droplets,
  Phone,
  MessageSquare,
  Wrench,
  Receipt,
  FileText,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  Clock,
  Loader2,
  Users,
} from 'lucide-react';

export default function MyResidencePage() {
  const { data: activeBookingData, isLoading } = useQuery({
    queryKey: ['tenant-active-residence'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/bookings/my-active');
        return data.booking || null;
      } catch {
        // Fallback: check /bookings/me for active or checked in stay
        try {
          const { data: allBookings } = await api.get('/bookings/me');
          const found = (allBookings.bookings || []).find((b: any) =>
            ['ACTIVE', 'CHECKED_IN', 'CONFIRMED', 'APPROVED'].includes(b.status)
          );
          return found || null;
        } catch {
          return null;
        }
      }
    },
  });

  const booking = activeBookingData;
  const property = booking?.property;
  const room = booking?.room;
  const landlord = property?.landlord;

  const startDateStr = booking?.startDate
    ? new Date(booking.startDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';
  const endDateStr = booking?.endDate
    ? new Date(booking.endDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
          My Residence
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your current accommodation, view utilities & Wi-Fi access passes, and connect with compound staff.
        </p>
      </div>

      {isLoading ? (
        <div className="p-16 text-center space-y-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
          <Loader2 className="w-7 h-7 animate-spin text-[#16A34A] mx-auto" />
          <p className="text-xs text-zinc-400">Loading your residence details...</p>
        </div>
      ) : !booking ? (
        /* Empty State */
        <div className="p-12 sm:p-16 text-center space-y-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-zinc-950 dark:text-white">
              No Active Residence Yet
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
              You do not have an active stay or verified tenancy agreement right now. Once your booking reservation is confirmed, your room access, caretaker contact, and utility passes will show up right here.
            </p>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/properties"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition shadow-xs"
            >
              <span>Browse Accommodations</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/dashboard/tenant/bookings"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              <span>View Booking Requests</span>
            </Link>
          </div>
        </div>
      ) : (
        /* Active Residence Details */
        <div className="space-y-6">
          {/* ── Main Residence Hero Banner ── */}
          <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
              {/* Photo Left */}
              <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-[280px]">
                <Image
                  src={
                    property?.images?.[0] ||
                    '/images/resident/booking-glacier.jpg'
                  }
                  alt={property?.title || 'Residence'}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#16A34A] text-white text-xs font-bold shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Active Tenancy</span>
                </div>
              </div>

              {/* Info Right */}
              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                    <MapPin className="w-3.5 h-3.5 text-[#16A34A]" />
                    <span>{property?.location || 'Ghana'}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                    {property?.title || 'Glacier Studio'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    {room?.roomType || 'Standard Studio Suite'} • Unit #{booking.id.slice(0, 4).toUpperCase()}
                  </p>
                </div>

                {/* Key Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Move-in Date</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{startDateStr}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Lease Expiry</span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{endDateStr}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Monthly Rent</span>
                    <span className="font-black text-zinc-950 dark:text-white">
                      GH₵ {Number(room?.price || property?.price || 0).toLocaleString()}/mo
                    </span>
                  </div>
                </div>

                {/* Quick CTA Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Link
                    href="/dashboard/agreements"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold hover:opacity-90 transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Lease Agreement</span>
                  </Link>

                  <Link
                    href="/dashboard/invoice"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Payment Receipt</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ── Residence Utilities & Credentials ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Wi-Fi Credentials */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">High-Speed Wi-Fi</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#16A34A] flex items-center justify-center">
                  <Wifi className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-mono font-bold text-zinc-900 dark:text-white">
                  SSID: Akwaaba-{property?.title?.split(' ')[0] || 'Resident'}
                </p>
                <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                  Password: <span className="text-[#16A34A] font-bold">AkwaabaStay2026</span>
                </p>
              </div>
              <p className="text-[10px] text-zinc-400">Complimentary 100Mbps fiber across compound</p>
            </div>

            {/* Prepaid Electricity Sub-Meter */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Electricity Sub-Meter</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-mono font-bold text-zinc-900 dark:text-white">
                  Meter #: 142-990-482-1
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Type: ECG Prepaid Smart Sub-meter
                </p>
              </div>
              <p className="text-[10px] text-zinc-400">Top up via ECG PowerApp or caretaker office</p>
            </div>

            {/* Compound Water & Polytank */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">Water & Reservoir</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                  <Droplets className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-zinc-900 dark:text-white">
                  Supply: GWCL + 10,000L Overhead Tank
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Status: <span className="text-[#16A34A] font-bold">Operational (Full)</span>
                </p>
              </div>
              <p className="text-[10px] text-zinc-400">Pressurized water with automatic pump backup</p>
            </div>
          </div>

          {/* ── Caretaker Contact & Quick Actions ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Caretaker card (5 cols) */}
            <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-[#16A34A] flex items-center justify-center font-bold text-base shrink-0">
                  {landlord?.firstName?.[0] || 'C'}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-950 dark:text-white">
                    {landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Facility Manager'}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    On-duty Property Host & Compound Caretaker
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 space-y-1 text-xs">
                <p className="text-zinc-500 dark:text-zinc-400">Available Hours: <span className="font-bold text-zinc-900 dark:text-white">7:00 AM – 8:00 PM</span></p>
                <p className="text-zinc-500 dark:text-zinc-400">Gatehouse: <span className="font-bold text-zinc-900 dark:text-white">24/7 Security Desk</span></p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${landlord?.phoneNumber || '+233240000000'}`}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Caretaker</span>
                </a>
                <Link
                  href="/dashboard/messages"
                  className="py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </Link>
              </div>
            </div>

            {/* Quick Actions (7 cols) */}
            <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-2xs space-y-4">
              <h3 className="font-bold text-sm text-zinc-950 dark:text-white">
                Residence Management Shortcuts
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/dashboard/tenant/tickets/new"
                  className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-800 bg-zinc-50/50 dark:bg-zinc-800/40 transition group"
                >
                  <Wrench className="w-4 h-4 text-[#16A34A] mb-1.5" />
                  <p className="font-bold text-xs text-zinc-900 dark:text-white group-hover:text-[#16A34A]">
                    Report a Repair
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Log maintenance for plumbing, AC, electrical
                  </p>
                </Link>

                <Link
                  href="/dashboard/tenant/visitors/new"
                  className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-800 bg-zinc-50/50 dark:bg-zinc-800/40 transition group"
                >
                  <UserCheck className="w-4 h-4 text-[#16A34A] mb-1.5" />
                  <p className="font-bold text-xs text-zinc-900 dark:text-white group-hover:text-[#16A34A]">
                    Register a Visitor
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Generate gatehouse visitor access code
                  </p>
                </Link>

                <Link
                  href="/dashboard/tenant/bills/split/new"
                  className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-800 bg-zinc-50/50 dark:bg-zinc-800/40 transition group"
                >
                  <Users className="w-4 h-4 text-[#16A34A] mb-1.5" />
                  <p className="font-bold text-xs text-zinc-900 dark:text-white group-hover:text-[#16A34A]">
                    Split a Bill
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Share electricity or water bill with roommates
                  </p>
                </Link>

                <Link
                  href="/dashboard/invoice"
                  className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-800 bg-zinc-50/50 dark:bg-zinc-800/40 transition group"
                >
                  <Receipt className="w-4 h-4 text-[#16A34A] mb-1.5" />
                  <p className="font-bold text-xs text-zinc-900 dark:text-white group-hover:text-[#16A34A]">
                    Payment History
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Download receipts and caution deposit escrow
                  </p>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
