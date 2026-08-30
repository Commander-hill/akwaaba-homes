'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Car, Plus, Trash2, ShieldCheck, ParkingCircle, AlertCircle, 
  Loader2, CheckCircle2, Hash
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface VehicleRegistration {
  id: string;
  propertyId: string;
  vehicleMake: string;
  vehicleModel: string;
  licensePlate: string;
  color: string | null;
  parkingSlotNumber: string | null;
  passType: 'RESIDENT' | 'VISITOR';
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
  property: {
    id: string;
    title: string;
    location: string;
  };
}

export default function VehicleParkingTab({ bookings = [] }: { bookings?: any[] }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [propertyId, setPropertyId] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [color, setColor] = useState('');
  const [parkingSlotNumber, setParkingSlotNumber] = useState('');
  const [passType, setPassType] = useState('RESIDENT');

  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'public-catalog'],
    queryFn: async () => {
      const res = await api.get('/properties');
      return res.data;
    }
  });

  const rawBookingProps = (bookings || [])
    .map((b: any) => ({
      id: b.propertyId || b.property?.id,
      title: b.property?.title || 'Residential Residence',
      location: b.property?.location || ''
    }))
    .filter((p: any) => Boolean(p.id));

  const fallbackProps = (propertiesData?.properties || propertiesData?.data || [])
    .map((p: any) => ({
      id: p.id,
      title: p.title || 'Residential Residence',
      location: p.location || ''
    }))
    .filter((p: any) => Boolean(p.id));

  const activeProperties = rawBookingProps.length > 0 ? rawBookingProps : fallbackProps;

  useEffect(() => {
    if (!propertyId && activeProperties.length > 0) {
      setPropertyId(activeProperties[0].id);
    }
  }, [activeProperties, propertyId]);

  const { data, isLoading } = useQuery<{ vehicles: VehicleRegistration[] }>({
    queryKey: ['vehicles', 'tenant'],
    queryFn: async () => {
      const res = await api.get('/vehicles');
      return res.data;
    }
  });

  const registerVehicleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/vehicles', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Vehicle registered for gate security clearance!');
      setModalOpen(false);
      setVehicleMake('');
      setVehicleModel('');
      setLicensePlate('');
      setColor('');
      setParkingSlotNumber('');
      queryClient.invalidateQueries({ queryKey: ['vehicles', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to register vehicle');
    }
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/vehicles/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Vehicle deregistered');
      queryClient.invalidateQueries({ queryKey: ['vehicles', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to remove vehicle');
    }
  });

  const vehicles = data?.vehicles || [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Vehicle & Parking Bay Registry</h2>
            <p className="text-xs text-slate-500">Register resident vehicles for automated gate clearance and view designated parking slots</p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition shadow-xs"
        >
          <Plus className="w-4 h-4" /> Register Vehicle
        </button>
      </div>

      {isLoading ? (
        <div className="p-16 flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <ParkingCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Vehicles Registered</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Add your car or motorcycle number plate so security personnel can recognize and admit your vehicle smoothly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600">
                    {v.passType} PERMIT
                  </span>
                  <h4 className="font-bold text-base text-slate-900 dark:text-white pt-1">
                    {v.vehicleMake} {v.vehicleModel}
                  </h4>
                  <p className="text-xs text-slate-400">{v.property?.title}</p>
                </div>

                <button
                  onClick={() => deleteVehicleMutation.mutate(v.id)}
                  disabled={deleteVehicleMutation.isPending}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs"
                  title="Deregister"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* License Plate Display */}
              <div className="p-3 bg-slate-950 text-white rounded-xl flex items-center justify-between border-2 border-yellow-500/60 shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-4 bg-red-600 rounded-xs flex items-center justify-center font-bold text-[8px] text-white">GH</div>
                  <span className="text-lg font-black tracking-widest font-mono text-yellow-400">{v.licensePlate}</span>
                </div>
                {v.color && <span className="text-xs text-slate-400 capitalize">{v.color}</span>}
              </div>

              {/* Parking Slot */}
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs">
                <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                  <ParkingCircle className="w-4 h-4 text-emerald-500" /> Assigned Bay:
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {v.parkingSlotNumber || 'Open Compound Bay'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Registration Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Car className="w-5 h-5 text-emerald-500" /> Register Vehicle & Parking Bay
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Residence</label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                >
                  {activeProperties.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.location ? `(${p.location})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Vehicle Make</label>
                  <input
                    type="text"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    placeholder="e.g. Toyota"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Vehicle Model</label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="e.g. Corolla"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">License Number Plate</label>
                  <input
                    type="text"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="e.g. GR-2489-24"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Vehicle Color</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="e.g. Silver, Black"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Parking Slot (Optional)</label>
                  <input
                    type="text"
                    value={parkingSlotNumber}
                    onChange={(e) => setParkingSlotNumber(e.target.value)}
                    placeholder="e.g. Bay B-04 / Garage 1"
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Permit Type</label>
                  <select
                    value={passType}
                    onChange={(e) => setPassType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="RESIDENT">Resident Primary Vehicle</option>
                    <option value="VISITOR">Frequent Visitor Permit</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const targetPropertyId = propertyId || activeProperties[0]?.id;
                  if (!targetPropertyId) {
                    toast.error('Active tenancy required to register a vehicle');
                    return;
                  }
                  if (!vehicleMake || !vehicleModel || !licensePlate) {
                    toast.error('Vehicle make, model, and license plate are required');
                    return;
                  }
                  registerVehicleMutation.mutate({
                    propertyId: targetPropertyId,
                    vehicleMake,
                    vehicleModel,
                    licensePlate,
                    color,
                    parkingSlotNumber,
                    passType
                  });
                }}
                disabled={registerVehicleMutation.isPending}
                className="px-6 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:opacity-90 shadow-sm"
              >
                {registerVehicleMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Vehicle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
