'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Zap, Droplet, Calculator, Send, CheckCircle, Clock, AlertCircle,
  Loader2, RefreshCw, Copy, Check, Users, User, Building, DollarSign,
  Share2, ArrowRight, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useSocket } from '@/providers/SocketProvider';

interface Occupant {
  tenantId: string;
  name: string;
  phone: string | null;
  email: string;
}

interface RoomUnitMeter {
  unitId: string;
  unitNumber: string;
  floor: number;
  blockName: string;
  meterNumber: string;
  prevReading: number;
  currReading: number;
  occupants: Occupant[];
}

interface BillSplitItem {
  id: string;
  title: string;
  category: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  participants: Array<{
    id: string;
    userName: string;
    userPhone: string | null;
    shareAmount: number;
    isPaid: boolean;
  }>;
}

interface UtilitySubMeterTabProps {
  properties?: any[];
}

export default function UtilitySubMeterTab({ properties = [] }: UtilitySubMeterTabProps) {
  const queryClient = useQueryClient();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [utilityType, setUtilityType] = useState<'ELECTRICITY_ECG' | 'WATER_TANKER'>('ELECTRICITY_ECG');
  
  // Tariff Rates (GHS)
  const [unitRate, setUnitRate] = useState<number>(1.65); // Standard PURC residential ECG rate
  const [serviceLevy, setServiceLevy] = useState<number>(15.00); // Fixed compound pump/lighting levy
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  // Local meter readings state: { [unitId]: { prev: number, curr: number, meterNo: string } }
  const [meterReadings, setMeterReadings] = useState<Record<string, { prev: number; curr: number; meterNo: string }>>({});
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);

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

  // Fetch occupancy matrix to get room units & residents
  const { data: matrixData, isLoading: isLoadingMatrix, refetch: refetchMatrix } = useQuery({
    queryKey: ['occupancyMatrix', selectedPropertyId],
    queryFn: async () => {
      if (!selectedPropertyId) return null;
      const res = await api.get(`/occupancy/property/${selectedPropertyId}`);
      return res.data;
    },
    enabled: Boolean(selectedPropertyId)
  });

  // Fetch existing bill splits for this property
  const { data: billSplitsData, isLoading: isLoadingBills, refetch: refetchBills } = useQuery<{ billSplits: BillSplitItem[] }>({
    queryKey: ['propertyBillSplits', selectedPropertyId],
    queryFn: async () => {
      if (!selectedPropertyId) return { billSplits: [] };
      const res = await api.get(`/billsplits/property/${selectedPropertyId}`);
      return res.data;
    },
    enabled: Boolean(selectedPropertyId)
  });

  // Transform occupancy matrix into room unit meter list
  const roomUnits: RoomUnitMeter[] = useMemo(() => {
    if (!matrixData?.matrix) return [];
    const list: RoomUnitMeter[] = [];

    matrixData.matrix.forEach((group: any) => {
      group.units.forEach((unit: any) => {
        // Collect active occupants in this room
        const occupantsMap = new Map<string, Occupant>();
        unit.beds.forEach((bed: any) => {
          if (bed.occupant && bed.occupant.tenantId) {
            occupantsMap.set(bed.occupant.tenantId, {
              tenantId: bed.occupant.tenantId,
              name: bed.occupant.name,
              phone: bed.occupant.phone,
              email: bed.occupant.email
            });
          }
        });

        list.push({
          unitId: unit.unitId,
          unitNumber: unit.unitNumber,
          floor: unit.floor,
          blockName: group.blockName || 'Main Block',
          meterNumber: `ECG-${unit.unitNumber}`,
          prevReading: 1200,
          currReading: 1285,
          occupants: Array.from(occupantsMap.values())
        });
      });
    });

    return list;
  }, [matrixData]);

  // Dispatch bill split for a room unit mutation
  const dispatchBillMutation = useMutation({
    mutationFn: async ({ unit, totalAmount, perResident }: { unit: RoomUnitMeter; totalAmount: number; perResident: number }) => {
      const readings = meterReadings[unit.unitId] || { prev: unit.prevReading, curr: unit.currReading };
      const consumed = Math.max(0, readings.curr - readings.prev);
      const label = utilityType === 'ELECTRICITY_ECG' ? 'ECG Prepaid Electricity' : 'Water / Borehole Utility';
      
      const payload = {
        propertyId: selectedPropertyId,
        title: `${label} - ${unit.unitNumber} (${consumed} ${utilityType === 'ELECTRICITY_ECG' ? 'kWh' : 'm³'})`,
        category: utilityType,
        totalAmount,
        dueDate,
        notes: `Meter: ${readings.meterNo || unit.meterNumber} | Previous: ${readings.prev} | Current: ${readings.curr} | Consumed: ${consumed} units @ GHS ${unitRate}/unit + GHS ${serviceLevy} levy.`,
        participants: unit.occupants.map(occ => ({
          userId: occ.tenantId,
          userName: occ.name,
          userPhone: occ.phone,
          userEmail: occ.email,
          shareAmount: perResident,
          isPaid: false
        }))
      };

      const res = await api.post('/billsplits', payload);
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || 'Utility slip dispatched to residents! ⚡');
      queryClient.invalidateQueries({ queryKey: ['propertyBillSplits', selectedPropertyId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to dispatch utility slip');
    }
  });

  // Toggle participant payment status mutation
  const togglePaidMutation = useMutation({
    mutationFn: async ({ participantId, isPaid }: { participantId: string; isPaid: boolean }) => {
      const res = await api.patch(`/billsplits/participants/${participantId}/status`, { isPaid });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Payment status updated');
      queryClient.invalidateQueries({ queryKey: ['propertyBillSplits', selectedPropertyId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update payment');
    }
  });

  const handleReadingChange = (unitId: string, field: 'prev' | 'curr' | 'meterNo', value: any) => {
    setMeterReadings(prev => {
      const current = prev[unitId] || { prev: 1200, curr: 1285, meterNo: `MTR-${unitId.slice(0, 4)}` };
      return {
        ...prev,
        [unitId]: {
          ...current,
          [field]: field === 'meterNo' ? value : parseFloat(value) || 0
        }
      };
    });
  };

  const copyWhatsAppSlip = (unit: RoomUnitMeter, total: number, perResident: number) => {
    const readings = meterReadings[unit.unitId] || { prev: unit.prevReading, curr: unit.currReading, meterNo: unit.meterNumber };
    const consumed = Math.max(0, readings.curr - readings.prev);
    const label = utilityType === 'ELECTRICITY_ECG' ? '⚡ ECG PREPAID POWER' : '💧 WATER & PUMPING BILL';
    const unitName = utilityType === 'ELECTRICITY_ECG' ? 'kWh' : 'm³';

    const text = `*AKWAABA HOMES - ${label}*\n` +
      `🏢 Property: ${matrixData?.title || 'Residential Compound'}\n` +
      `🚪 Unit: ${unit.unitNumber} (${unit.blockName})\n` +
      `🔢 Meter No: ${readings.meterNo || unit.meterNumber}\n` +
      `📊 Opening Reading: ${readings.prev} ${unitName}\n` +
      `📊 Closing Reading: ${readings.curr} ${unitName}\n` +
      `⚡ Units Consumed: ${consumed} ${unitName}\n` +
      `💵 Rate: GHS ${unitRate.toFixed(2)} / ${unitName}\n` +
      `🛠️ Fixed Compound Levy: GHS ${serviceLevy.toFixed(2)}\n` +
      `💰 *TOTAL ROOM DUE: GHS ${total.toFixed(2)}*\n` +
      `👥 Resident Share (${unit.occupants.length} residents): *GHS ${perResident.toFixed(2)} each*\n` +
      `📅 Due Date: ${dueDate}\n` +
      `Please log in to your dashboard to settle your share via Mobile Money.`;

    navigator.clipboard.writeText(text);
    setCopiedRoomId(unit.unitId);
    toast.success('WhatsApp slip copied to clipboard! 📋');
    setTimeout(() => setCopiedRoomId(null), 3000);
  };

  // Preset tariff buttons
  const applyPresetTariff = (type: 'PURC_ECG' | 'PURC_WATER' | 'FLAT_SPLIT') => {
    if (type === 'PURC_ECG') {
      setUtilityType('ELECTRICITY_ECG');
      setUnitRate(1.65);
      setServiceLevy(15.00);
      toast.success('Applied Standard PURC ECG Residential Tariff (GHS 1.65/kWh)');
    } else if (type === 'PURC_WATER') {
      setUtilityType('WATER_TANKER');
      setUnitRate(8.50);
      setServiceLevy(20.00);
      toast.success('Applied GWCL Water / Pumping Tariff (GHS 8.50/m³)');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Property Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-xl">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">ECG &amp; Water Sub-Meter Utility Matrix</h2>
            <p className="text-xs text-slate-500">Unit-by-unit check-meter readings, PURC tariff calculation, and automated MoMo slips</p>
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
            onClick={() => {
              refetchMatrix();
              refetchBills();
            }}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Refresh utility matrix"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tariff Engine Configuration Bar */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Utility Type:</span>
            <button
              onClick={() => {
                setUtilityType('ELECTRICITY_ECG');
                setUnitRate(1.65);
              }}
              className={clsx(
                "px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                utilityType === 'ELECTRICITY_ECG'
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              )}
            >
              <Zap className="w-3.5 h-3.5" /> ECG Electricity (kWh)
            </button>
            <button
              onClick={() => {
                setUtilityType('WATER_TANKER');
                setUnitRate(8.50);
              }}
              className={clsx(
                "px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer",
                utilityType === 'WATER_TANKER'
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              )}
            >
              <Droplet className="w-3.5 h-3.5" /> GWCL / Borehole Water (m³)
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-slate-400">Presets:</span>
            <button
              onClick={() => applyPresetTariff('PURC_ECG')}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 cursor-pointer"
            >
              PURC ECG (GHS 1.65)
            </button>
            <button
              onClick={() => applyPresetTariff('PURC_WATER')}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-200 cursor-pointer"
            >
              GWCL Water (GHS 8.50)
            </button>
          </div>
        </div>

        {/* Tariff Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-bold">
              Tariff Rate (GHS per {utilityType === 'ELECTRICITY_ECG' ? 'kWh' : 'm³'})
            </label>
            <input
              type="number"
              step="0.01"
              value={unitRate}
              onChange={(e) => setUnitRate(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-bold">
              Fixed Compound Service Levy (GHS)
            </label>
            <input
              type="number"
              step="1"
              value={serviceLevy}
              onChange={(e) => setServiceLevy(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <span className="text-[10px] text-slate-400">Streetlights, security, borehole pump maintenance</span>
          </div>

          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-bold">
              Bill Payment Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
        </div>
      </div>

      {/* Sub-Meter Readings Grid */}
      {isLoadingMatrix ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
          <p className="text-sm font-medium">Loading room sub-meters and resident data...</p>
        </div>
      ) : roomUnits.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
          No room units configured for this property yet. Add room units in Property Settings.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-400" /> Active Room Sub-Meters ({roomUnits.length} units)
            </h3>
            <span className="text-xs text-slate-500">
              Formula: (Units × GHS {unitRate.toFixed(2)}) + GHS {serviceLevy.toFixed(2)} Levy
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {roomUnits.map((unit) => {
              const readings = meterReadings[unit.unitId] || {
                prev: unit.prevReading,
                curr: unit.currReading,
                meterNo: unit.meterNumber
              };
              const consumed = Math.max(0, readings.curr - readings.prev);
              const roomSubtotal = (consumed * unitRate) + serviceLevy;
              const occupantCount = Math.max(1, unit.occupants.length);
              const perResident = roomSubtotal / occupantCount;
              const isCopied = copiedRoomId === unit.unitId;

              return (
                <div
                  key={unit.unitId}
                  className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4"
                >
                  {/* Card Header: Unit Number & Block */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        {unit.unitNumber}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {unit.blockName} • Floor {unit.floor}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {unit.occupants.length} Resident(s)
                    </span>
                  </div>

                  {/* Meter Number & Readings Input */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                        Meter No.
                      </label>
                      <input
                        type="text"
                        value={readings.meterNo}
                        onChange={(e) => handleReadingChange(unit.unitId, 'meterNo', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                        Prev Reading
                      </label>
                      <input
                        type="number"
                        value={readings.prev}
                        onChange={(e) => handleReadingChange(unit.unitId, 'prev', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">
                        Curr Reading
                      </label>
                      <input
                        type="number"
                        value={readings.curr}
                        onChange={(e) => handleReadingChange(unit.unitId, 'curr', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none text-[var(--primary)]"
                      />
                    </div>
                  </div>

                  {/* Calculation Summary Bar */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Consumed:</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-mono">
                        {consumed} {utilityType === 'ELECTRICITY_ECG' ? 'kWh' : 'm³'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-500">
                      <span>Total Room Charge:</span>
                      <strong className="text-slate-900 dark:text-white font-extrabold text-sm">
                        GHS {roomSubtotal.toFixed(2)}
                      </strong>
                    </div>
                    {unit.occupants.length > 0 && (
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60 font-bold">
                        <span>Per Resident ({unit.occupants.length}):</span>
                        <span>GHS {perResident.toFixed(2)} each</span>
                      </div>
                    )}
                  </div>

                  {/* Residents List */}
                  {unit.occupants.length > 0 && (
                    <div className="text-xs text-slate-500 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Occupants:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {unit.occupants.map((occ) => (
                          <span
                            key={occ.tenantId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[11px]"
                          >
                            <User className="w-3 h-3 text-slate-400" />
                            {occ.name} {occ.phone ? `(${occ.phone})` : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => copyWhatsAppSlip(unit, roomSubtotal, perResident)}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {isCopied ? 'Copied Slip!' : 'Copy WhatsApp Slip'}
                    </button>

                    <button
                      onClick={() => dispatchBillMutation.mutate({ unit, totalAmount: roomSubtotal, perResident })}
                      disabled={dispatchBillMutation.isPending || unit.occupants.length === 0}
                      className="flex-1 py-2 px-3 bg-[#0F5132] hover:bg-[#0c4128] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      {dispatchBillMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      Dispatch to Room
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dispatched Utility Bill Records Table */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> Utility Bill Dispatches &amp; Settlement Log
          </h3>
          <span className="text-xs text-slate-500">Live MoMo collection status</span>
        </div>

        {isLoadingBills ? (
          <div className="p-8 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading settlement records...</p>
          </div>
        ) : (!billSplitsData?.billSplits || billSplitsData.billSplits.length === 0) ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No utility bills dispatched for this property yet.
          </div>
        ) : (
          <div className="space-y-3">
            {billSplitsData.billSplits.map((bill) => {
              const paidCount = bill.participants.filter(p => p.isPaid).length;
              const totalCount = bill.participants.length;
              const isSettled = bill.status === 'SETTLED' || (totalCount > 0 && paidCount === totalCount);

              return (
                <div
                  key={bill.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {bill.title}
                      </h4>
                      <span className="text-xs text-slate-500">
                        Dispatched: {new Date(bill.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-black text-slate-900 dark:text-white">
                          GHS {bill.totalAmount.toFixed(2)}
                        </div>
                        <span className={clsx(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full",
                          isSettled ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                        )}>
                          {isSettled ? 'Fully Settled ✅' : `${paidCount}/${totalCount} Paid ⏳`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Roommate Shares Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    {bill.participants.map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-200">{p.userName}</div>
                          <span className="text-[11px] text-slate-400 font-mono">GHS {p.shareAmount.toFixed(2)}</span>
                        </div>

                        <button
                          onClick={() => togglePaidMutation.mutate({ participantId: p.id, isPaid: !p.isPaid })}
                          disabled={togglePaidMutation.isPending}
                          className={clsx(
                            "px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1",
                            p.isPaid
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                          )}
                        >
                          {p.isPaid ? <Check className="w-3 h-3" /> : null}
                          {p.isPaid ? 'Paid' : 'Mark Paid'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
