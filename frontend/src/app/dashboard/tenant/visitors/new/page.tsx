'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  KeyRound,
  Lock,
  Clock,
  User,
  Phone,
  Building,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  Send,
  Loader2,
  Copy,
  Check,
  QrCode,
  Share2,
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
    badgeColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    description: 'Bolt Food, Yango, Jumia Express, or parcel delivery.'
  },
  {
    id: 'RIDE_HAIL',
    label: 'Ride-Hail Driver (Uber/Bolt)',
    icon: Car,
    defaultPurpose: 'Ride-Hail Pickup / Dropoff',
    defaultDuration: '2',
    badgeColor: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    description: 'Entry clearance for cab pickup or drop-off inside compound.'
  },
  {
    id: 'GUEST',
    label: 'Friend / Personal Guest',
    icon: User,
    defaultPurpose: 'Guest / Friend Visit',
    defaultDuration: '12',
    badgeColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    description: 'Standard daytime social visit to your room or flat.'
  },
  {
    id: 'ARTISAN',
    label: 'Artisan / Technician',
    icon: Wrench,
    defaultPurpose: 'Artisan / Maintenance Contractor',
    defaultDuration: '6',
    badgeColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
    description: 'AC technician, electrician, plumber, or appliance repair.'
  },
  {
    id: 'FAMILY',
    label: 'Family / Overnight Guest',
    icon: HeartHandshake,
    defaultPurpose: 'Family Member Visit',
    defaultDuration: '24',
    badgeColor: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
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

  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [purpose, setPurpose] = useState('Guest / Friend Visit');
  const [durationHours, setDurationHours] = useState('12');
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch logged in tenant
  const { data: userData } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data?.user || res.data;
    }
  });

  // Fetch available properties
  const { data: propertiesData, isLoading: loadingProperties } = useQuery({
    queryKey: ['properties', 'public-catalog'],
    queryFn: async () => {
      const res = await api.get('/properties');
      return res.data;
    }
  });

  const propertyList: PropertyOption[] = (propertiesData?.properties || propertiesData?.data || [])
    .map((p: any) => ({
      id: p.id,
      title: p.title || 'Residential Residence',
      location: p.location || ''
    }));

  useEffect(() => {
    if (!propertyId && propertyList.length > 0) {
      setPropertyId(initialPropertyId || propertyList[0].id);
    }
  }, [propertyList, propertyId, initialPropertyId]);

  const handleSelectPreset = (preset: typeof VISITOR_PRESETS[0]) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) {
      toast.error('Please select the rental property');
      return;
    }
    if (!visitorName.trim()) {
      toast.error('Please enter the visitor or driver full name');
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

  const selectedProperty = propertyList.find(p => p.id === propertyId);
  const selectedDuration = DURATION_OPTIONS.find(d => d.hours === durationHours) || DURATION_OPTIONS[2];

  const shareText = `*AkwaabaHomes Visitor Gate Pass*\nResidence: ${selectedProperty?.title || 'Residential Compound'}\nVisitor: ${visitorName || 'Guest'}\nPurpose: ${purpose}\nValid for: ${selectedDuration.label}\nHost: ${userData?.firstName || 'Resident'}\n*Present this PIN at the security gate for entry.*`;

  const copyShareText = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedCode(true);
    toast.success('Pass details copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#FBFBF9] dark:bg-[#0D0F12] pb-24 pt-4 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* ── Breadcrumbs & Header ── */}
      <div className="mb-6 space-y-3 pb-5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          <Link href="/dashboard/tenant" className="hover:text-[#0F5132] dark:hover:text-emerald-400 transition">
            Resident Portal
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <Link href="/dashboard/tenant?tab=living" className="hover:text-[#0F5132] dark:hover:text-emerald-400 transition">
            Living & Amenities
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-900 dark:text-zinc-200 font-bold">New Visitor Pass</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <KeyRound className="w-5 h-5" />
              </span>
              Generate Digital Gate Pass
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Pre-authorize couriers, ride-hailing drivers, friends, and family for fast compound security clearance.
            </p>
          </div>

          <Link
            href="/dashboard/tenant?tab=living"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#14181E] text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel & Return
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Form Fields */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Property Selection */}
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
              Destination Compound / Property
            </h2>
            <div>
              {loadingProperties ? (
                <div className="h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl animate-pulse" />
              ) : (
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F5132]/30 cursor-pointer"
                >
                  {propertyList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} {p.location ? `· ${p.location}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 2. Quick Presets */}
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Visitor Type Presets
              </span>
              <span className="text-[10px] text-zinc-400">Tap to auto-fill duration</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {VISITOR_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = purpose === preset.defaultPurpose;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 text-[#0F5132] dark:text-emerald-300 ring-2 ring-[#0F5132]/20'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-1.5 rounded-lg border ${preset.badgeColor}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />}
                    </div>
                    <span className="text-xs font-bold leading-tight">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Visitor Details */}
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Visitor Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Visitor Full Name *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="e.g. Yaw Osei / Bolt Driver"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F5132]/30"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Visitor Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3.5" />
                  <input
                    type="tel"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    placeholder="e.g. 0244123456"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-medium text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F5132]/30"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Purpose of Visit
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Food Delivery / Family Visit"
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F5132]/30"
              />
            </div>

            {/* Duration Selector */}
            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                Pass Validity Duration
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.hours}
                    type="button"
                    onClick={() => setDurationHours(opt.hours)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      durationHours === opt.hours
                        ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 text-[#0F5132] dark:text-emerald-300 ring-1 ring-[#0F5132]/30 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{opt.label}</div>
                    <div className="text-[10px] text-zinc-500 truncate">{opt.badge}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pass Preview & Clearance Card (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-[#14181E] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Live Gate Clearance Preview
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-3 h-3" /> Security Ready
              </span>
            </div>

            {/* Physical Gate Pass Card Mockup */}
            <div className="bg-zinc-900 text-white rounded-xl p-5 space-y-4 border border-zinc-800 shadow-md">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0F5132] text-white flex items-center justify-center font-black text-xs">
                    AH
                  </div>
                  <div>
                    <div className="text-xs font-black tracking-tight leading-none">AKWAABAHOMES</div>
                    <div className="text-[9px] text-zinc-400 uppercase tracking-widest mt-0.5">GATE PASS</div>
                  </div>
                </div>
                <div className="p-1 bg-white rounded-md text-zinc-900">
                  <QrCode className="w-5 h-5" />
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="text-[10px] uppercase font-mono text-zinc-400">VISITOR / COURIER</div>
                  <div className="text-sm font-bold truncate text-white">{visitorName || 'Guest / Driver'}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] uppercase font-mono text-zinc-400">VALIDITY</div>
                    <div className="font-semibold text-emerald-400">{selectedDuration.label}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-mono text-zinc-400">HOST RESIDENT</div>
                    <div className="font-semibold truncate">{userData?.firstName || 'Resident'}</div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-mono text-zinc-400">RESIDENCE</div>
                  <div className="text-xs font-medium text-zinc-300 truncate">
                    {selectedProperty?.title || 'Residential Compound'}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                <span>ESTATE SECURITY DESK</span>
                <span className="text-emerald-400 font-bold">PRE-APPROVED</span>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={copyShareText}
                className="w-full py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy WhatsApp / SMS Message</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <div>
            <button
              type="submit"
              disabled={createPassMutation.isPending}
              className="w-full py-3.5 bg-[#0F5132] hover:bg-[#0B3D26] disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {createPassMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Authorizing Pass...
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" /> Issue Gate Pass & Clear Security
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewVisitorPassPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
      </div>
    }>
      <NewVisitorPassContent />
    </Suspense>
  );
}
