'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Calendar, DollarSign, CheckCircle2, Clock, AlertTriangle, KeyRound, 
  Send, Phone, User, Building, Search, Filter, Loader2, RefreshCw,
  CreditCard, ShieldAlert, Check, Copy, ExternalLink, GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface BookingItem {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  propertyId: string;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string | null;
    campus?: string | null;
    studentId?: string | null;
  };
  property?: {
    id: string;
    title: string;
    location: string;
  };
  room?: {
    id: string;
    roomType: string;
    price: number;
  };
  roomUnit?: {
    id: string;
    unitNumber: string;
  };
  bed?: {
    id: string;
    bedNumber: string;
  };
  transaction?: {
    id: string;
    amount: number;
    status: string;
    reference: string;
  };
}

interface AcademicInstallmentTabProps {
  properties?: any[];
}

export default function AcademicInstallmentTab({ properties = [] }: AcademicInstallmentTabProps) {
  const queryClient = useQueryClient();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OVERDUE' | 'DUE_SOON' | 'CLEARED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [installmentRatio, setInstallmentRatio] = useState<number>(60); // 60% 1st Sem, 40% 2nd Sem standard
  const [secondSemDueDate, setSecondSemDueDate] = useState<string>('2026-01-15');
  const [keyClearanceMap, setKeyClearanceMap] = useState<Record<string, boolean>>({});

  // Fallback query to guarantee live landlord properties list
  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'landlord', 'mine'],
    queryFn: async () => {
      try {
        const res = await api.get('/properties/landlord/mine');
        return res.data?.data || [];
      } catch {
        return [];
      }
    }
  });

  const rawProps = (propertiesData && propertiesData.length > 0) ? propertiesData : properties;
  const propertyList = rawProps.map((p: any) => ({
    id: p.id || p.propertyId,
    title: p.title || p.propertyTitle || 'Property',
    location: p.location || p.propertyLocation || ''
  })).filter((p: any) => Boolean(p.id));

  React.useEffect(() => {
    if (!selectedPropertyId && propertyList.length > 0) {
      setSelectedPropertyId(propertyList[0].id);
    }
  }, [propertyList, selectedPropertyId]);

  // Fetch bookings for landlord
  const { data: bookingsResponse, isLoading, refetch, isFetching } = useQuery<{ bookings: BookingItem[] }>({
    queryKey: ['bookings', 'landlord'],
    queryFn: async () => {
      const res = await api.get('/bookings/landlord');
      return res.data;
    }
  });

  const allBookings: BookingItem[] = bookingsResponse?.bookings || [];

  // Filter bookings for this selected property & active tenancies
  const propertyBookings = useMemo(() => {
    return allBookings.filter((b) => {
      if (selectedPropertyId && (b.propertyId !== selectedPropertyId && b.property?.id !== selectedPropertyId)) {
        return false;
      }
      return ['COMPLETED', 'CONFIRMED', 'APPROVED', 'ACTIVE', 'CHECKED_IN', 'PAID'].includes(b.status);
    });
  }, [allBookings, selectedPropertyId]);

  // Enrich bookings with semester installment calculations
  const enrichedInstallments = useMemo(() => {
    const now = new Date();
    const dueDate = new Date(secondSemDueDate);

    return propertyBookings.map((booking) => {
      const totalAcademicFee = booking.room?.price || 4500;
      const firstSemRequired = Math.round((totalAcademicFee * (installmentRatio / 100)) * 100) / 100;
      const secondSemRequired = Math.round((totalAcademicFee - firstSemRequired) * 100) / 100;

      // Actual amount recorded in primary transaction
      const totalPaid = booking.transaction?.amount || firstSemRequired;
      const secondSemPaid = Math.max(0, totalPaid - firstSemRequired);
      const secondSemOutstanding = Math.max(0, secondSemRequired - secondSemPaid);
      const isFullyCleared = secondSemOutstanding <= 0;
      const isOverdue = !isFullyCleared && now > dueDate;

      // Key clearance is allowed if cleared or explicitly toggled by landlord
      const isKeyHandoverCleared = isFullyCleared || Boolean(keyClearanceMap[booking.id]);

      return {
        booking,
        totalAcademicFee,
        firstSemRequired,
        secondSemRequired,
        totalPaid,
        secondSemPaid,
        secondSemOutstanding,
        isFullyCleared,
        isOverdue,
        isKeyHandoverCleared
      };
    });
  }, [propertyBookings, installmentRatio, secondSemDueDate, keyClearanceMap]);

  // Filtered by sub-tab and search
  const filteredList = useMemo(() => {
    return enrichedInstallments.filter((item) => {
      if (filterStatus === 'OVERDUE' && !item.isOverdue) return false;
      if (filterStatus === 'DUE_SOON' && (item.isFullyCleared || item.isOverdue)) return false;
      if (filterStatus === 'CLEARED' && !item.isFullyCleared) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const tenantName = `${item.booking.tenant.firstName} ${item.booking.tenant.lastName}`.toLowerCase();
        const roomNo = item.booking.roomUnit?.unitNumber?.toLowerCase() || '';
        const studentId = item.booking.tenant.studentId?.toLowerCase() || '';
        return tenantName.includes(q) || roomNo.includes(q) || studentId.includes(q);
      }

      return true;
    });
  }, [enrichedInstallments, filterStatus, searchQuery]);

  // Statistics KPI
  const stats = useMemo(() => {
    let totalExpected = 0;
    let totalCollected = 0;
    let overdueCount = 0;
    let clearedCount = 0;

    enrichedInstallments.forEach((item) => {
      totalExpected += item.totalAcademicFee;
      totalCollected += item.totalPaid;
      if (item.isOverdue) overdueCount++;
      if (item.isFullyCleared) clearedCount++;
    });

    const pendingCollection = Math.max(0, totalExpected - totalCollected);
    const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 100;

    return { totalExpected, totalCollected, pendingCollection, collectionRate, overdueCount, clearedCount };
  }, [enrichedInstallments]);

  const sendMoMoReminder = (item: any) => {
    const phone = item.booking.tenant.phoneNumber;
    if (!phone) {
      toast.error('Student has no registered phone number');
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const text = `*AKWAABA HOMES - 2ND SEMESTER RENT NOTICE*\n` +
      `Hello ${item.booking.tenant.firstName},\n` +
      `This is a gentle reminder regarding your academic accommodation at ${item.booking.property?.title || 'the hostel'}.\n` +
      `Room: ${item.booking.roomUnit?.unitNumber || 'Assigned Room'}\n` +
      `2nd Semester Tranche: *GHS ${item.secondSemOutstanding.toFixed(2)}*\n` +
      `Due Date: ${secondSemDueDate}\n` +
      `Please log in to your dashboard to complete payment via Mobile Money before the semester resumption date to clear your room key handover.`;

    window.open(`https://wa.me/${cleanPhone.startsWith('0') ? '233' + cleanPhone.substring(1) : cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    toast.success('Dispatched WhatsApp MoMo reminder! 📲');
  };

  const toggleKeyClearance = (bookingId: string) => {
    setKeyClearanceMap(prev => ({
      ...prev,
      [bookingId]: !prev[bookingId]
    }));
    toast.success('Key handover authorization updated');
  };

  return (
    <div className="space-y-6">
      {/* Header & Property Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-xl">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Academic Installment &amp; Tranche Schedule</h2>
            <p className="text-xs text-slate-500">Semester rent milestone tracking, key retrieval clearance, and MoMo reminders</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--primary)] cursor-pointer"
          >
            {propertyList.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.title} {p.location ? `(${p.location})` : ''}
              </option>
            ))}
          </select>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Refresh schedule"
          >
            <RefreshCw className={clsx("w-5 h-5", isFetching && "animate-spin text-[var(--primary)]")} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Total Collected</span>
          <div className="text-2xl font-black text-emerald-800 dark:text-emerald-200 mt-1">
            GHS {stats.totalCollected.toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-600/80">{stats.collectionRate}% of total academic rent</span>
        </div>

        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Pending 2nd Tranche</span>
          <div className="text-2xl font-black text-amber-800 dark:text-amber-200 mt-1">
            GHS {stats.pendingCollection.toLocaleString()}
          </div>
          <span className="text-[11px] text-amber-600/80">Awaiting 2nd semester</span>
        </div>

        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-300">Overdue Residents</span>
          <div className="text-2xl font-black text-rose-800 dark:text-rose-200 mt-1">
            {stats.overdueCount}
          </div>
          <span className="text-[11px] text-rose-600/80">Key release blocked</span>
        </div>

        <div className="p-4 bg-slate-500/10 border border-slate-500/20 rounded-2xl">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Fully Cleared (100%)</span>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
            {stats.clearedCount}
          </div>
          <span className="text-[11px] text-slate-500">Both semesters paid</span>
        </div>
      </div>

      {/* Tranche Configuration Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">Split Ratio:</span>
            <select
              value={installmentRatio}
              onChange={(e) => setInstallmentRatio(parseInt(e.target.value, 10))}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value={50}>50% / 50% (Equal Tranches)</option>
              <option value={60}>60% / 40% (Standard Hostel)</option>
              <option value={70}>70% / 30% (Front-Loaded)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500">2nd Sem Due:</span>
            <input
              type="date"
              value={secondSemDueDate}
              onChange={(e) => setSecondSemDueDate(e.target.value)}
              className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="ALL">All Residents ({propertyBookings.length})</option>
            <option value="OVERDUE">Overdue Only ({stats.overdueCount})</option>
            <option value="DUE_SOON">Pending 2nd Tranche</option>
            <option value="CLEARED">Fully Cleared ({stats.clearedCount})</option>
          </select>

          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resident or room..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-none"
            />
          </div>
        </div>
      </div>

      {/* Resident Installment Records */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
          <p className="text-sm font-medium">Calculating academic semester balances...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
          No residents matching the selected tranche criteria.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((item) => (
            <div
              key={item.booking.id}
              className={clsx(
                "p-4 bg-white dark:bg-slate-900 border rounded-2xl transition-all shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4",
                item.isOverdue
                  ? "border-rose-500/50 bg-rose-50/5"
                  : item.isFullyCleared
                    ? "border-emerald-500/30"
                    : "border-slate-200 dark:border-slate-800"
              )}
            >
              {/* Resident & Room Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {item.booking.tenant.firstName} {item.booking.tenant.lastName}
                  </h4>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-extrabold text-xs">
                    {item.booking.roomUnit?.unitNumber || 'Room Unit'} {item.booking.bed ? `• ${item.booking.bed.bedNumber}` : ''}
                  </span>
                  {item.booking.tenant.studentId && (
                    <span className="text-[11px] font-mono text-slate-400">
                      ID: {item.booking.tenant.studentId}
                    </span>
                  )}
                  {item.isFullyCleared ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                      Academic Year Paid 🎓
                    </span>
                  ) : item.isOverdue ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 border border-rose-500/30">
                      2nd Sem Overdue ⚠️
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600">
                      1st Sem Paid • 2nd Sem Due ⏳
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                  <span>Room Type: <strong>{item.booking.room?.roomType || 'Hostel Room'}</strong></span>
                  <span>•</span>
                  <span>Academic Fee: <strong>GHS {item.totalAcademicFee.toLocaleString()}</strong></span>
                  {item.booking.tenant.phoneNumber && (
                    <>
                      <span>•</span>
                      <a href={`tel:${item.booking.tenant.phoneNumber}`} className="hover:underline text-[var(--primary)]">
                        {item.booking.tenant.phoneNumber}
                      </a>
                    </>
                  )}
                </div>
              </div>

              {/* Installment Breakdown Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
                {/* 1st Sem */}
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-0.5 min-w-[130px]">
                  <div className="text-[10px] uppercase font-bold text-slate-400">1st Semester ({installmentRatio}%)</div>
                  <div className="font-extrabold text-slate-900 dark:text-white">GHS {item.firstSemRequired.toLocaleString()}</div>
                  <span className="text-[10px] font-bold text-emerald-600">Cleared ✅</span>
                </div>

                {/* 2nd Sem */}
                <div className={clsx(
                  "p-2.5 rounded-xl space-y-0.5 min-w-[130px]",
                  item.isFullyCleared 
                    ? "bg-emerald-500/10 border border-emerald-500/20" 
                    : item.isOverdue 
                      ? "bg-rose-500/10 border border-rose-500/20" 
                      : "bg-amber-500/10 border border-amber-500/20"
                )}>
                  <div className="text-[10px] uppercase font-bold text-slate-400">2nd Semester ({100 - installmentRatio}%)</div>
                  <div className="font-extrabold text-slate-900 dark:text-white">
                    {item.isFullyCleared ? 'GHS 0.00' : `GHS ${item.secondSemOutstanding.toLocaleString()}`}
                  </div>
                  <span className={clsx(
                    "text-[10px] font-bold",
                    item.isFullyCleared ? "text-emerald-600" : item.isOverdue ? "text-rose-600" : "text-amber-600"
                  )}>
                    {item.isFullyCleared ? 'Paid in Full' : item.isOverdue ? 'Overdue!' : 'Due Resumption'}
                  </span>
                </div>

                {/* Key Retrieval Clearance Gate & MoMo Action */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleKeyClearance(item.booking.id)}
                    className={clsx(
                      "px-3 py-2 rounded-xl font-bold text-xs transition flex items-center gap-1.5 cursor-pointer",
                      item.isKeyHandoverCleared
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                    )}
                    title={item.isKeyHandoverCleared ? "Authorized for key retrieval" : "Key release withheld until payment"}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    {item.isKeyHandoverCleared ? 'Key Cleared 🔑' : 'Withhold Key 🔒'}
                  </button>

                  {!item.isFullyCleared && (
                    <button
                      onClick={() => sendMoMoReminder(item)}
                      className="px-3 py-2 bg-[#0F5132] hover:bg-[#0c4128] text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5" /> Send MoMo Notice
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
