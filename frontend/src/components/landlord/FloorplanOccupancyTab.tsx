'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Building, Layers, Users, CheckCircle, Wrench, Clock, ShieldAlert,
  Loader2, Filter, AlertCircle, Phone, Mail, Calendar, Eye, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface OccupantInfo {
  tenantId: string;
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  email: string;
  startDate: string;
  endDate: string;
  bookingStatus: string;
  bookingId: string;
}

interface BedSlot {
  bedId: string;
  bedNumber: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'PENDING' | 'MAINTENANCE' | string;
  occupant: OccupantInfo | null;
}

interface RoomUnitItem {
  unitId: string;
  unitNumber: string;
  floor: number;
  genderLock: string;
  beds: BedSlot[];
}

interface RoomGroup {
  roomId: string;
  blockName: string;
  roomType: string;
  gender: string;
  price: number;
  units: RoomUnitItem[];
}

interface MatrixResponse {
  propertyId: string;
  title: string;
  location: string;
  stats: {
    totalBeds: number;
    occupiedBeds: number;
    reservedBeds: number;
    maintenanceBeds: number;
    availableBeds: number;
    occupancyRate: number;
  };
  matrix: RoomGroup[];
}

export default function FloorplanOccupancyTab({ properties = [] }: { properties?: any[] }) {
  const queryClient = useQueryClient();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [floorFilter, setFloorFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOccupant, setSelectedOccupant] = useState<OccupantInfo | null>(null);

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

  const { data, isLoading, refetch, isFetching } = useQuery<MatrixResponse>({
    queryKey: ['occupancyMatrix', selectedPropertyId],
    queryFn: async () => {
      if (!selectedPropertyId) return null as any;
      const res = await api.get(`/occupancy/property/${selectedPropertyId}`);
      return res.data;
    },
    enabled: Boolean(selectedPropertyId)
  });

  const toggleBedStatusMutation = useMutation({
    mutationFn: async ({ bedId, newStatus }: { bedId: string; newStatus: string }) => {
      const res = await api.patch(`/occupancy/beds/${bedId}/status`, { status: newStatus });
      return res.data;
    },
    onSuccess: (resData) => {
      toast.success(resData.message || 'Bed status updated');
      queryClient.invalidateQueries({ queryKey: ['occupancyMatrix', selectedPropertyId] });
      queryClient.invalidateQueries({ queryKey: ['bookings', 'landlord'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update bed status');
    }
  });

  if (propertyList.length === 0 && !isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
        <Building className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No properties listed yet</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
          Create a property listing first to view its visual floorplan and live bed occupancy matrix.
        </p>
      </div>
    );
  }

  const stats = data?.stats || {
    totalBeds: 0,
    occupiedBeds: 0,
    reservedBeds: 0,
    maintenanceBeds: 0,
    availableBeds: 0,
    occupancyRate: 0
  };

  return (
    <div className="space-y-6">
      {/* Property Selector & Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Floorplan & Bed Occupancy Matrix</h2>
            <p className="text-xs text-slate-500">Live visual inventory of wings, floors, rooms, and bed slots</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            title="Refresh floorplan"
          >
            <RefreshCw className={clsx("w-5 h-5", isFetching && "animate-spin text-[var(--primary)]")} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
          <p className="text-sm font-medium">Generating visual floorplan grid...</p>
        </div>
      ) : (
        <>
          {/* Occupancy KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <span className="text-xs font-semibold text-slate-500">Total Capacity</span>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.totalBeds}</div>
              <span className="text-[11px] text-slate-400">Total beds mapped</span>
            </div>

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Occupancy Rate</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.occupancyRate}%</div>
              <div className="w-full bg-emerald-200 dark:bg-emerald-950 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${stats.occupancyRate}%` }} />
              </div>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <span className="text-xs font-semibold text-red-600 dark:text-red-400">Occupied Beds</span>
              <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{stats.occupiedBeds}</div>
              <span className="text-[11px] text-red-500/80">Active residents</span>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Pending / Reserved</span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.reservedBeds}</div>
              <span className="text-[11px] text-amber-500/80">Awaiting check-in</span>
            </div>

            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">Available Beds</span>
              <div className="text-2xl font-black text-green-600 dark:text-green-400 mt-1">{stats.availableBeds}</div>
              <span className="text-[11px] text-green-500/80">Ready for booking</span>
            </div>

            <div className="p-4 bg-slate-500/10 border border-slate-500/20 rounded-2xl">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Under Repair</span>
              <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mt-1">{stats.maintenanceBeds}</div>
              <span className="text-[11px] text-slate-500">Maintenance mode</span>
            </div>
          </div>

          {/* Color Legend & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-4 flex-wrap text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-red-500" />
                <span>Occupied (Booked)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500" />
                <span>Pending Approval</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-slate-500" />
                <span>Under Maintenance</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-none"
              >
                <option value="ALL">All Bed Statuses</option>
                <option value="AVAILABLE">Available Only</option>
                <option value="OCCUPIED">Occupied Only</option>
                <option value="PENDING">Pending Only</option>
                <option value="MAINTENANCE">Maintenance Only</option>
              </select>
            </div>
          </div>

          {/* Wing / Block Sections */}
          <div className="space-y-6">
            {(!data?.matrix || data.matrix.length === 0) ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
                No room units or bed slots configured for this property yet.
              </div>
            ) : (
              data.matrix.map((roomGroup) => (
                <div
                  key={roomGroup.roomId}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-xs font-bold">
                        {roomGroup.blockName}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {roomGroup.roomType}
                      </h3>
                      <span className="text-xs text-slate-500">
                        • GHS {Number(roomGroup.price || 0).toLocaleString()} / slot
                      </span>
                    </div>

                    <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                      Gender Policy: {roomGroup.gender}
                    </span>
                  </div>

                  {/* Rooms & Bed Slots Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {roomGroup.units.map((unit) => (
                      <div
                        key={unit.unitId}
                        className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building className="w-4 h-4 text-slate-400" />
                            {unit.unitNumber}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500">
                            Floor {unit.floor}
                          </span>
                        </div>

                        {/* Beds within this room */}
                        <div className="grid grid-cols-2 gap-2">
                          {unit.beds
                            .filter((bed) => statusFilter === 'ALL' || bed.status === statusFilter)
                            .map((bed) => {
                              const isAvailable = bed.status === 'AVAILABLE';
                              const isOccupied = bed.status === 'OCCUPIED';
                              const isPending = bed.status === 'PENDING';
                              const isMaint = bed.status === 'MAINTENANCE';

                              return (
                                <div
                                  key={bed.bedId}
                                  onClick={() => {
                                    if (bed.occupant) {
                                      setSelectedOccupant(bed.occupant);
                                    }
                                  }}
                                  className={clsx(
                                    "p-2.5 rounded-lg border text-center transition-all cursor-pointer relative group",
                                    isAvailable && "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20",
                                    isOccupied && "bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-300 hover:bg-red-500/20",
                                    isPending && "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20",
                                    isMaint && "bg-slate-500/10 border-slate-500/40 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20"
                                  )}
                                >
                                  <div className="text-xs font-bold">{bed.bedNumber}</div>
                                  <div className="text-[10px] font-medium mt-0.5 capitalize truncate">
                                    {isOccupied && bed.occupant ? (bed.occupant.name || 'Resident').split(' ')[0] : bed.status.toLowerCase()}
                                  </div>

                                  {/* Hover status toggle for Available / Maintenance */}
                                  {!isOccupied && !isPending && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleBedStatusMutation.mutate({
                                          bedId: bed.bedId,
                                          newStatus: isMaint ? 'AVAILABLE' : 'MAINTENANCE'
                                        });
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition absolute inset-0 bg-black/75 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 p-1"
                                    >
                                      <Wrench className="w-3 h-3" />
                                      {isMaint ? 'Make Available' : 'Mark Repair'}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Occupant Details Modal */}
      {selectedOccupant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--primary)]" /> Resident Details
              </h3>
              <button
                onClick={() => setSelectedOccupant(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-black text-xl flex items-center justify-center mx-auto">
                {selectedOccupant.avatarUrl ? (
                  <img src={selectedOccupant.avatarUrl} alt={selectedOccupant.name || 'User'} className="w-full h-full rounded-full object-cover" />
                ) : (
                  (selectedOccupant.name || 'U').charAt(0)
                )}
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-base">{selectedOccupant.name}</h4>
              <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 text-xs font-semibold rounded-full">
                Active Booking
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{selectedOccupant.email}</span>
              </div>
              {selectedOccupant.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{selectedOccupant.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Lease: {new Date(selectedOccupant.startDate).toLocaleDateString()} - {new Date(selectedOccupant.endDate).toLocaleDateString()}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedOccupant(null)}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
