'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Sparkles, Wrench, Wind, Droplets, Zap, Bug, Plus, 
  Calendar, Clock, CheckCircle2, AlertCircle, Loader2, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface ServiceBooking {
  id: string;
  propertyId: string;
  serviceType: string;
  preferredDate: string;
  timeSlot: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  estimatedCost: number | null;
  notes: string | null;
  technicianName: string | null;
  technicianPhone: string | null;
  createdAt: string;
  property: {
    id: string;
    title: string;
    location: string;
  };
}

const SERVICE_CATALOG = [
  {
    type: 'AC_SERVICING',
    title: 'AC Servicing & Gas Refill',
    icon: Wind,
    rate: 'GHS 250',
    desc: 'Filter cleaning, coil wash, gas pressure check & refrigerant recharge.'
  },
  {
    type: 'DEEP_CLEANING',
    title: 'Deep Home & Move-In Cleaning',
    icon: Sparkles,
    rate: 'GHS 350',
    desc: 'Thorough sanitization of bathrooms, kitchen grease degreasing & floor scrubbing.'
  },
  {
    type: 'PLUMBING',
    title: 'Plumbing Repair & Leak Fixing',
    icon: Droplets,
    rate: 'GHS 180',
    desc: 'Water heater repair, faucet leaks, pipe unclogging & pressure valve calibration.'
  },
  {
    type: 'ELECTRICAL',
    title: 'Electrical & Inverter Diagnostics',
    icon: Zap,
    rate: 'GHS 200',
    desc: 'Prepaid meter wiring, socket grounding, breaker troubleshooting & solar inverter check.'
  },
  {
    type: 'FUMIGATION',
    title: 'Fumigation & Pest Extermination',
    icon: Bug,
    rate: 'GHS 400',
    desc: 'Non-toxic indoor/outdoor pest treatment against mosquitoes, termites & rodents.'
  },
  {
    type: 'WATER_FILTER',
    title: 'Borehole & RO Filter Replacement',
    icon: Droplets,
    rate: 'GHS 220',
    desc: 'Sediment, carbon, and reverse osmosis cartridge replacement for clean running water.'
  }
];

export default function HomeServicesTab({ bookings = [] }: { bookings?: any[] }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('AC_SERVICING');

  // Form State
  const [propertyId, setPropertyId] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('MORNING (8AM - 12PM)');
  const [notes, setNotes] = useState('');

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

  const { data, isLoading } = useQuery<{ bookings: ServiceBooking[] }>({
    queryKey: ['serviceBookings', 'tenant'],
    queryFn: async () => {
      const res = await api.get('/service-bookings');
      return res.data;
    }
  });

  const bookServiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/service-bookings', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Home service appointment scheduled! A vetted pro has been assigned.');
      setModalOpen(false);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['serviceBookings', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to book service');
    }
  });

  const serviceBookings = data?.bookings || [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Home Services Concierge</h2>
            <p className="text-xs text-slate-500">Book vetted artisans for AC servicing, deep cleaning, electrical, & fumigation</p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition shadow-xs"
        >
          <Plus className="w-4 h-4" /> Book a Service
        </button>
      </div>

      {/* Catalog Grid */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">Available Concierge Services</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICE_CATALOG.map((svc) => {
            const Icon = svc.icon;
            return (
              <div
                key={svc.type}
                onClick={() => {
                  setSelectedService(svc.type);
                  setModalOpen(true);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 hover:border-[var(--primary)] transition-all cursor-pointer group shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-[var(--primary)] rounded-xl group-hover:scale-110 transition">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    Est. {svc.rate}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[var(--primary)] transition">
                    {svc.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{svc.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Existing Appointments */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">My Service Appointments</h3>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--primary)]" />
          </div>
        ) : serviceBookings.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
            No active home service requests. Click any service above to schedule an appointment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {serviceBookings.map((b) => (
              <div
                key={b.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className={clsx(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                      b.status === 'COMPLETED' && "bg-emerald-500/10 text-emerald-600",
                      b.status === 'IN_PROGRESS' && "bg-blue-500/10 text-blue-600",
                      b.status === 'CONFIRMED' && "bg-purple-500/10 text-purple-600",
                      b.status === 'PENDING' && "bg-amber-500/10 text-amber-600",
                      b.status === 'CANCELLED' && "bg-red-500/10 text-red-600"
                    )}>
                      {b.status}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white pt-1">{b.serviceType.replace('_', ' ')}</h4>
                    <p className="text-xs text-slate-400">{b.property?.title}</p>
                  </div>

                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    GHS {b.estimatedCost?.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Scheduled for: <strong className="text-slate-900 dark:text-white">{new Date(b.preferredDate).toLocaleDateString()}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Slot: {b.timeSlot}</span>
                  </div>
                  {b.notes && (
                    <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-200 dark:border-slate-700">
                      "{b.notes}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-500" /> Book Home Service
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Select Service</label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                >
                  {SERVICE_CATALOG.map((s) => (
                    <option key={s.type} value={s.type}>
                      {s.title} ({s.rate})
                    </option>
                  ))}
                </select>
              </div>

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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Preferred Date</label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Time Window</label>
                  <select
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                  >
                    <option value="MORNING (8AM - 12PM)">Morning (8AM - 12PM)</option>
                    <option value="AFTERNOON (12PM - 4PM)">Afternoon (12PM - 4PM)</option>
                    <option value="EVENING (4PM - 7PM)">Evening (4PM - 7PM)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Notes / Instructions for Technician</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Master bedroom AC is blowing warm air. Bring R410A gas."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                />
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
                    toast.error('Active tenancy required to book home services');
                    return;
                  }
                  if (!preferredDate) {
                    toast.error('Preferred appointment date is required');
                    return;
                  }
                  bookServiceMutation.mutate({
                    propertyId: targetPropertyId,
                    serviceType: selectedService,
                    preferredDate,
                    timeSlot,
                    notes
                  });
                }}
                disabled={bookServiceMutation.isPending}
                className="px-6 py-2 bg-[var(--primary)] text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:opacity-90 shadow-sm"
              >
                {bookServiceMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
