'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  KeyRound,
  Shield,
  Clock,
  User,
  Phone,
  Building,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
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
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    description: 'Bolt Food, Yango, Jumia Express, or parcel delivery.'
  },
  {
    id: 'RIDE_HAIL',
    label: 'Ride-Hail Driver (Uber/Bolt)',
    icon: Car,
    defaultPurpose: 'Ride-Hail Pickup / Dropoff',
    defaultDuration: '2',
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    description: 'Entry clearance for cab pickup or drop-off inside compound.'
  },
  {
    id: 'GUEST',
    label: 'Friend / Personal Guest',
    icon: User,
    defaultPurpose: 'Guest / Friend Visit',
    defaultDuration: '12',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    description: 'Standard daytime social visit to your room or flat.'
  },
  {
    id: 'ARTISAN',
    label: 'Artisan / Technician',
    icon: Wrench,
    defaultPurpose: 'Artisan / Maintenance Contractor',
    defaultDuration: '6',
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    description: 'AC technician, electrician, plumber, or appliance repair.'
  },
  {
    id: 'FAMILY',
    label: 'Family / Overnight Guest',
    icon: HeartHandshake,
    defaultPurpose: 'Family Member Visit',
    defaultDuration: '24',
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
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
  const [unitNote, setUnitNote] = useState('');
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
      router.push('/dashboard/tenant');
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

  const shareText = `*Akwaaba Homes Visitor Gate Pass*\nResidence: ${selectedProperty?.title || 'Residential Compound'}\nVisitor: ${visitorName || 'Guest'}\nPurpose: ${purpose}\nValid for: ${selectedDuration.label}\nHost: ${userData?.firstName || 'Resident'}\n*Present this PIN at the security gate for entry.*`;

  const copyShareText = () => {
    navigator.clipboard.writeText(shareText);
    setCopiedCode(true);
    toast.success('Pass details copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Header / Breadcrumbs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Link href="/dashboard/tenant" className="hover:text-primary flex items-center gap-1 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Tenant Dashboard
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 dark:text-white font-bold">New Visitor & Gate Pass</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <ShieldCheck className="w-3.5 h-3.5" /> Security Desk Clearance
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Page Hero */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden mb-8">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
            <KeyRound className="w-72 h-72" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" /> Automated Security Clearance
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Generate Digital Gate Pass
            </h1>
            <p className="text-amber-100 text-sm leading-relaxed">
              Pre-authorize deliveries, ride-hailing drivers, friends, and family. The generated 6-digit access PIN and QR clearance are instantly synced with the estate security gate and caretaker log.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form Fields */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Property Selection */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-amber-500" />
                Select Residential Compound
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Destination Property
                </label>
                {loadingProperties ? (
                  <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ) : (
                  <select
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {propertyList.length === 0 && (
                      <option value="">No registered rental property found</option>
                    )}
                    {propertyList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.location ? `— ${p.location}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  Gate security at this property will receive real-time verification authorization.
                </p>
              </div>
            </div>

            {/* 2. Visitor Category Presets */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
                Select Visitor Type
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {VISITOR_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = purpose === preset.defaultPurpose;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl w-fit ${preset.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {preset.label}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                          {preset.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Visitor Details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-amber-500" />
                Visitor Credentials & Clearance Info
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Visitor / Courier Name *
                  </label>
                  <input
                    type="text"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="e.g. Kwame Mensah (Bolt Food Rider)"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Visitor Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={visitorPhone}
                      onChange={(e) => setVisitorPhone(e.target.value)}
                      placeholder="054 XXX XXXX"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Purpose of Visit
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="e.g. Guest / Friend Visit"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              {/* 4. Duration Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Access Duration Validity *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {DURATION_OPTIONS.map((opt) => {
                    const isSelected = durationHours === opt.hours;
                    return (
                      <button
                        key={opt.hours}
                        type="button"
                        onClick={() => setDurationHours(opt.hours)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500 text-white font-bold shadow-md shadow-amber-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="text-xs font-extrabold">{opt.label}</div>
                        <div className={`text-[10px] mt-0.5 truncate ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                          {opt.badge}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Arrival Instructions / Host Room Unit (Optional)
                </label>
                <input
                  type="text"
                  value={unitNote}
                  onChange={(e) => setUnitNote(e.target.value)}
                  placeholder="e.g. Flat 4B, 2nd Floor — Call on arrival"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Right Sidebar: Security Clearance Card Preview */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 sticky top-24">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" /> Digital Gate Pass Card
              </h3>

              {/* Holographic Security Pass Simulation */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 rounded-2xl border-2 border-amber-500/40 relative overflow-hidden shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center text-slate-900 font-black text-xs">
                      A
                    </div>
                    <span className="text-xs font-extrabold tracking-wider uppercase text-amber-400">
                      Akwaaba GatePass
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 uppercase tracking-widest">
                    Pre-Authorized
                  </span>
                </div>

                {/* PIN Code Box */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">
                    Security Gate Access Code
                  </span>
                  <div className="text-2xl font-black font-mono tracking-widest text-amber-400">
                    ######
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Generated upon form submission
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Visitor:</span>
                    <span className="font-bold text-white">{visitorName || 'Guest Name'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Purpose:</span>
                    <span className="font-bold text-amber-300">{purpose}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Validity:</span>
                    <span className="font-bold text-white">{selectedDuration.label} from issue</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Host Resident:</span>
                    <span className="font-bold text-white">
                      {userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}` : 'Resident'}
                    </span>
                  </div>
                  {unitNote && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Note:</span>
                      <span className="font-bold text-white truncate max-w-[150px]">{unitNote}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-mono">
                    <QrCode className="w-3.5 h-3.5 text-amber-400" /> Scannable at Guardhouse
                  </span>
                  <span className="text-emerald-400 font-bold">Encrypted PIN</span>
                </div>
              </div>

              {/* Quick WhatsApp Share Copy Button */}
              <button
                type="button"
                onClick={copyShareText}
                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? 'Copied Invitation Text!' : 'Copy WhatsApp Invitation'}
              </button>

              {/* Submit Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={createPassMutation.isPending}
                  className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {createPassMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Authorizing PIN...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" /> Issue Gate Clearance PIN
                    </>
                  )}
                </button>

                <Link
                  href="/dashboard/tenant"
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center transition"
                >
                  Cancel & Return
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewVisitorPassPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <NewVisitorPassContent />
    </Suspense>
  );
}
