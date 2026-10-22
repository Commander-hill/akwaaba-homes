'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  KeyRound,
  User,
  Phone,
  Building,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Copy,
  Check,
  QrCode,
  Car,
  Package,
  Wrench,
  HeartHandshake
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PropertyOption {
  id: string;
  title: string;
  location?: string;
}

const VISITOR_PRESETS = [
  {
    id: 'DELIVERY',
    label: 'Delivery Courier / Rider',
    icon: Package,
    defaultPurpose: 'Delivery / Courier (Food/Jumia/Bolt)',
    defaultDuration: '2',
    description: 'Bolt Food, Yango, Jumia Express, or parcel delivery.'
  },
  {
    id: 'RIDE_HAIL',
    label: 'Ride-Hail Driver (Uber/Bolt)',
    icon: Car,
    defaultPurpose: 'Ride-Hail Pickup / Dropoff',
    defaultDuration: '2',
    description: 'Entry clearance for cab pickup or drop-off inside compound.'
  },
  {
    id: 'GUEST',
    label: 'Friend / Personal Guest',
    icon: User,
    defaultPurpose: 'Guest / Friend Visit',
    defaultDuration: '12',
    description: 'Standard daytime social visit to your room or flat.'
  },
  {
    id: 'ARTISAN',
    label: 'Artisan / Technician',
    icon: Wrench,
    defaultPurpose: 'Artisan / Maintenance Contractor',
    defaultDuration: '6',
    description: 'AC technician, electrician, plumber, or appliance repair.'
  },
  {
    id: 'FAMILY',
    label: 'Family / Overnight Guest',
    icon: HeartHandshake,
    defaultPurpose: 'Family Member Visit',
    defaultDuration: '24',
    description: 'Parent, sibling, or approved overnight visitor.'
  }
];

const DURATION_OPTIONS = [
  { hours: '2', label: '2 Hours', badge: 'Quick Delivery / Drop-off' },
  { hours: '6', label: '6 Hours', badge: 'Daytime Contractor / Artisan' },
  { hours: '12', label: '12 Hours', badge: 'Standard Full Day Visit' },
  { hours: '24', label: '24 Hours', badge: 'Overnight Stay (Approved)' },
  { hours: '48', label: '48 Hours', badge: 'Weekend Visitor Pass' }
];

function NewVisitorPassContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPropertyId = searchParams.get('propertyId') || '';
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [purpose, setPurpose] = useState('Guest / Friend Visit');
  const [durationHours, setDurationHours] = useState('12');
  const [copiedCode, setCopiedCode] = useState(false);

  const { data: userData } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data?.user || res.data;
    }
  });

  const { data: bookingsData, isLoading: loadingProperties } = useQuery({
    queryKey: ['tenant', 'bookings'],
    queryFn: async () => {
      const res = await api.get('/bookings/me');
      return res.data;
    }
  });

  const propertyList: PropertyOption[] = (bookingsData?.bookings || [])
    .filter((b: any) => !['CANCELLED', 'REJECTED'].includes(b.status))
    .map((b: any) => ({
      id: b.propertyId || b.property?.id,
      title: b.property?.title || 'Booked Residence',
      location: b.property?.location || ''
    }))
    .filter((p: PropertyOption) => Boolean(p.id));

  useEffect(() => {
    if (!propertyId && propertyList.length > 0) {
      setPropertyId(initialPropertyId || propertyList[0].id);
    }
  }, [propertyList, propertyId, initialPropertyId]);

  const handleSelectPreset = (preset: (typeof VISITOR_PRESETS)[0]) => {
    setPurpose(preset.defaultPurpose);
    setDurationHours(preset.defaultDuration);
  };

  const createPassMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/visitor-passes', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Visitor gate pass generated! Security desk notified.');
      queryClient.invalidateQueries({ queryKey: ['visitorPasses', 'tenant'] });
      router.push('/dashboard/tenant?tab=living');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to generate gate pass');
    }
  });

  const handleNextStep = () => {
    if (step === 1 && !propertyId) {
      toast.error('Please select the destination compound');
      return;
    }
    if (step === 2 && !visitorName.trim()) {
      toast.error('Please enter the visitor or courier full name');
      return;
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      handleNextStep();
      return;
    }
    if (!propertyId || !visitorName.trim()) {
      toast.error('Please complete the visitor name and compound selection');
      return;
    }

    createPassMutation.mutate({
      propertyId,
      visitorName: visitorName.trim(),
      visitorPhone: visitorPhone.trim() || null,
      purpose,
      durationHours
    });
  };

  const selectedProperty = propertyList.find((p) => p.id === propertyId);
  const selectedDuration = DURATION_OPTIONS.find((d) => d.hours === durationHours) || DURATION_OPTIONS[2];

  const shareText = `*AkwaabaHomes Visitor Gate Pass*\nResidence: ${selectedProperty?.title || 'Residential Compound'}\nVisitor: ${visitorName || 'Guest'}\nPurpose: ${purpose}\nValid for: ${selectedDuration.label}\nHost: ${userData?.firstName || 'Resident'}\n*Present this pass at the security gate for entry.*`;

  const copyShareText = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedCode(true);
    toast.success('Pass details copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6 pb-24">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard/tenant?tab=living')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Living &amp; Amenities
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Generate Digital Gate Pass
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Pre-authorize couriers, ride-hailing drivers, friends, and family for fast compound security clearance.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 w-fit">
            Step {step} of 4
          </span>
        </div>
      </div>

      {/* 4-Step Segmented Bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { num: 1, label: '1. Compound & Preset' },
          { num: 2, label: '2. Visitor Identity' },
          { num: 3, label: '3. Validity Window' },
          { num: 4, label: '4. Review & Issue Pass' }
        ].map((s) => {
          const active = step === s.num;
          const completed = step > s.num;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num < step) setStep(s.num);
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                active
                  ? 'border-[#0F5132] bg-emerald-50/50 dark:bg-emerald-950/20 text-[#0F5132] dark:text-emerald-400'
                  : completed
                  ? 'border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-[#12151D] text-zinc-800 dark:text-zinc-200'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] text-zinc-400'
              }`}
            >
              <div className="text-[11px] font-bold truncate">{s.label}</div>
              <div className="h-1 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    active || completed ? 'w-full bg-[#0F5132] dark:bg-emerald-500' : 'w-0'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Compound & Preset */}
        {step === 1 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Destination Compound &amp; Visitor Category
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select your residential property and the type of visitor arriving at the gatehouse.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Destination Compound / Property *
              </label>
              {loadingProperties ? (
                <div className="h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                >
                  {propertyList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.location ? `· ${p.location}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2.5">
                Visitor Type Preset *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {VISITOR_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = purpose === preset.defaultPurpose;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#16A34A] bg-[#16A34A]/10 dark:bg-emerald-950/20 text-[#16A34A] dark:text-emerald-300 ring-2 ring-[#16A34A]/20'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[#0F5132] dark:text-emerald-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />}
                      </div>
                      <span className="text-xs font-bold leading-tight">{preset.label}</span>
                      <span className="text-[11px] text-zinc-500 leading-snug">{preset.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Visitor Identity */}
        {step === 2 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Visitor Identity &amp; Contact Particulars
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Provide the full name of the guest, courier rider, or contractor for the gatehouse logbook.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Visitor / Driver Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="e.g. Yaw Osei / Bolt Driver"
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Visitor Phone Number (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    placeholder="e.g. 0244123456"
                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-mono font-medium text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Purpose of Visit *
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Food Delivery / Family Visit"
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
              />
            </div>
          </div>
        )}

        {/* STEP 3: Validity Window */}
        {step === 3 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Pass Validity Duration
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select how long the gatehouse clearance remains active before automatic expiration.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DURATION_OPTIONS.map((opt) => {
                const active = durationHours === opt.hours;
                return (
                  <button
                    key={opt.hours}
                    type="button"
                    onClick={() => setDurationHours(opt.hours)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-[#16A34A] bg-[#16A34A]/10 dark:bg-emerald-950/20 text-[#16A34A] dark:text-emerald-300 ring-2 ring-[#16A34A]/20'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold">{opt.label}</span>
                      {active && <Check className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />}
                    </div>
                    <div className="text-[11px] text-zinc-500">{opt.badge}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: Review & Issue Pass */}
        {step === 4 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                  Gatehouse Pass Clearance Preview
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Verify the visitor pass below and optionally copy the WhatsApp summary before issuing.
                </p>
              </div>
              <button
                type="button"
                onClick={copyShareText}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy WhatsApp Pass Text
                  </>
                )}
              </button>
            </div>

            <div className="bg-zinc-900 text-white rounded-2xl p-6 space-y-4 border border-zinc-800 max-w-md mx-auto">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div>
                  <div className="text-xs font-black tracking-tight">AKWAABA HOMES</div>
                  <div className="text-[10px] text-emerald-400 uppercase tracking-widest">ESTATE GATE PASS</div>
                </div>
                <div className="p-1.5 bg-white rounded-lg text-zinc-900">
                  <QrCode className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-mono text-zinc-400 block">VISITOR</span>
                  <span className="font-bold text-white">{visitorName || 'Guest'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-zinc-400 block">VALIDITY</span>
                  <span className="font-bold text-emerald-400">{selectedDuration.label}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-zinc-400 block">PURPOSE</span>
                  <span className="text-zinc-300">{purpose}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-zinc-400 block">COMPOUND</span>
                  <span className="text-zinc-300 truncate block">{selectedProperty?.title || 'Compound'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Horizontal Summary Bar */}
        <div className="bg-zinc-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
              Gatehouse Clearance Summary
            </div>
            <div className="text-sm font-bold">
              {visitorName || 'Unnamed Visitor'} &bull; {purpose}
            </div>
          </div>
          <div className="text-xs text-zinc-400 font-mono">
            Valid for {selectedDuration.label}
          </div>
        </div>

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Step
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={createPassMutation.isPending}
              className="px-6 py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              {createPassMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Authorizing Pass...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Issue Gate Pass &amp; Clear Security
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function NewVisitorPassPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        </div>
      }
    >
      <NewVisitorPassContent />
    </Suspense>
  );
}
