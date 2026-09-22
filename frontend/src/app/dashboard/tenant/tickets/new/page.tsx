'use client';

import React, { useState, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Wrench,
  Droplets,
  Zap,
  Wind,
  Key,
  Hammer,
  Bug,
  Building,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Loader2,
  ArrowLeft,
  ChevronRight,
  ShieldAlert,
  Calendar,
  X,
  User,
  PhoneCall,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  {
    id: 'PLUMBING',
    label: 'Plumbing & Water',
    icon: Droplets,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
    suggestions: [
      'Leaking sink pipe in bathroom',
      'Toilet flush not refilling / running continuously',
      'Low water pressure in shower',
      'Blocked drain / water pooling in washroom',
      'Water heater malfunctioning / cold water only'
    ]
  },
  {
    id: 'ELECTRICAL',
    label: 'Electrical & Power',
    icon: Zap,
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
    suggestions: [
      'Wall socket / outlet sparking or dead',
      'Ceiling light flickering / burnt out',
      'Prepaid sub-meter tripping breaker repeatedly',
      'Ceiling fan regulator stuck or motor buzzing'
    ]
  },
  {
    id: 'AC_COOLING',
    label: 'AC & Ventilation',
    icon: Wind,
    color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-900',
    suggestions: [
      'AC unit blowing warm / unchilled air',
      'AC unit dripping water onto bedroom floor',
      'AC remote control unresponsive or erratic',
      'Loud vibration noise from AC condenser'
    ]
  },
  {
    id: 'LOCKS_SECURITY',
    label: 'Locks & Security',
    icon: Key,
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
    suggestions: [
      'Main entry door lock cylinder jammed',
      'Key broken / sticking inside lock',
      'Window burglar proof latch will not lock',
      'Deadbolt misaligned with door frame'
    ]
  },
  {
    id: 'FIXTURES',
    label: 'Furniture & Fixtures',
    icon: Hammer,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
    suggestions: [
      'Wardrobe door hinge loose or detached',
      'Bed frame joint broken or unstable',
      'Kitchen drawer off track',
      'Towel rail pulled out from tile wall'
    ]
  },
  {
    id: 'PEST_HYGIENE',
    label: 'Pest & Sanitation',
    icon: Bug,
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
    suggestions: [
      'Fumigation requested (ants / insect infestation)',
      'Hostel corridor waste bin area blocked',
      'Damp mold or mildew odor in washroom'
    ]
  },
  {
    id: 'GENERAL',
    label: 'Compound & General',
    icon: Building,
    color: 'text-zinc-500 bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700',
    suggestions: [
      'Compound security light out',
      'Overhead polytank water pump failure',
      'Cracked floor tile hazard in hallway',
      'Compound gate access buzzer failure'
    ]
  }
];

const LOCATIONS = [
  'Bathroom / Washroom',
  'Master Bedroom',
  'Kitchen / Kitchenette',
  'Living Area',
  'Balcony / Veranda',
  'Hallway / Corridor',
  'Compound / Gate Area'
];

const PRIORITIES = [
  {
    id: 'LOW',
    label: 'Low (Routine)',
    desc: 'Minor cosmetic wear, scheduled fix',
    sla: '48 – 72 hrs',
    activeBg: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
  },
  {
    id: 'MEDIUM',
    label: 'Medium (Standard)',
    desc: 'Noticeable inconvenience, standard priority',
    sla: '24 – 48 hrs',
    activeBg: 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
  },
  {
    id: 'HIGH',
    label: 'High (Urgent)',
    desc: 'Impairs living condition, lack of water or broken lock',
    sla: 'Within 24 hrs',
    activeBg: 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-300',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
  },
  {
    id: 'URGENT',
    label: 'Emergency (Hazard)',
    desc: 'Active electrical sparking, flooding, or safety danger',
    sla: 'Immediate Response',
    activeBg: 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-300',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
  }
];

const PREFERRED_TIMES = [
  'Morning (8:00 AM – 12:00 PM)',
  'Afternoon (12:00 PM – 4:00 PM)',
  'Evening (4:00 PM – 7:00 PM)',
  'Any Time / Immediate Caretaker Access'
];

function ReportIssueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const initialPropertyId = searchParams.get('propertyId') || '';

  const [selectedCategory, setSelectedCategory] = useState<string>('PLUMBING');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(initialPropertyId);
  const [title, setTitle] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Bathroom / Washroom');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [preferredTime, setPreferredTime] = useState('Morning (8:00 AM – 12:00 PM)');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch active bookings so tenant can choose property/unit
  const { data: bookingsData } = useQuery({
    queryKey: ['bookings', 'tenant'],
    queryFn: async () => {
      const res = await api.get('/bookings/my-bookings');
      return res.data;
    }
  });

  const activeBookings = (bookingsData?.bookings || []).filter((b: any) =>
    ['CONFIRMED', 'APPROVED', 'COMPLETED'].includes(b.status)
  );

  // Auto-select first booking if not provided
  React.useEffect(() => {
    if (!selectedPropertyId && activeBookings.length > 0) {
      setSelectedPropertyId(activeBookings[0].propertyId);
    }
  }, [activeBookings, selectedPropertyId]);

  const activeBooking = activeBookings.find((b: any) => b.propertyId === selectedPropertyId) || activeBookings[0];
  const activeProperty = activeBooking?.property;
  const currentCategoryObj = CATEGORIES.find(c => c.id === selectedCategory) || CATEGORIES[0];

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Photo size must be less than 10MB.');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/upload/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedUrl = res.data?.url;
      if (uploadedUrl) {
        setImageUrl(uploadedUrl);
        toast.success('Photo attached to ticket');
      }
    } catch {
      try {
        const formData = new FormData();
        formData.append('document', file);
        const res = await api.post('/upload/document', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const fallbackUrl = res.data?.url || res.data?.documentUrl;
        if (fallbackUrl) {
          setImageUrl(fallbackUrl);
          toast.success('Photo attached to ticket');
        }
      } catch {
        toast.error('Could not upload photo. You can still submit the ticket description.');
        setImagePreview(null);
        setImageUrl(null);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = () => {
    setImageUrl(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const createTicketMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/tickets', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Maintenance ticket submitted to your property manager and caretaker.');
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      router.push('/dashboard/tenant?tab=tickets');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to submit ticket. Please try again.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedPropertyId) {
      setFormError('Please select a rented property/room.');
      return;
    }

    if (!title.trim()) {
      setFormError('Please provide a short headline or summary for the issue.');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setFormError('Please provide at least 10 characters describing the fault.');
      return;
    }

    const compiledDescription = [
      `[Category: ${currentCategoryObj.label}]`,
      `[Location: ${selectedLocation}]`,
      `[Preferred Visit Time: ${preferredTime}]`,
      '',
      description.trim()
    ].join('\n');

    createTicketMutation.mutate({
      propertyId: selectedPropertyId,
      title: title.trim(),
      description: compiledDescription,
      priority,
      imageUrl: imageUrl || undefined
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 pb-20 pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ── Breadcrumbs & Header ── */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-zinc-400">
          <Link href="/dashboard/tenant" className="hover:text-emerald-600 transition">
            Dashboard
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href="/dashboard/tenant?tab=tickets" className="hover:text-emerald-600 transition">
            Maintenance
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-slate-900 dark:text-zinc-200">New Ticket</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Wrench className="w-6 h-6" />
              </span>
              Report a Maintenance Issue
            </h1>
            <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1">
              Dispatch an official work order directly to your property manager and hostel caretaker.
            </p>
          </div>

          <Link
            href="/dashboard/tenant?tab=tickets"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Cancel & Return
          </Link>
        </div>
      </div>

      {formError && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-center gap-3 text-xs font-bold text-red-600 dark:text-red-400">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* ── Main 2-Column Form ── */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Property Selector (if multiple bookings) */}
          {activeBookings.length > 1 && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Affected Rental Unit
              </label>
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {activeBookings.map((b: any) => (
                  <option key={b.propertyId} value={b.propertyId}>
                    {b.property?.title} ({b.property?.city || 'Accra'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category Selector */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-7 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
                1. Select Issue Category
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Categorizing ensures the right artisan (electrician, plumber, mason) is dispatched.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`p-3.5 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 ring-2 ring-emerald-500/30 shadow-xs'
                        : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-950/50 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-xl border ${cat.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                    </div>
                    <span className="text-xs font-bold leading-tight">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Suggestions for current category */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Common Problems in Ghana (Tap to fill):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentCategoryObj.suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTitle(suggestion)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition text-left cursor-pointer"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Details & Location */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-7 shadow-xs space-y-5">
            <h2 className="text-base font-extrabold text-slate-950 dark:text-white">
              2. Describe the Fault
            </h2>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Issue Summary / Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Bathroom sink pipe leaking onto floor"
                required
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder:text-slate-400"
              />
            </div>

            {/* Location in Unit */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                Location in Unit / Property
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Detailed Description */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Full Description & Circumstances
                </label>
                <span className="text-[10px] text-slate-400">Min. 10 characters</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe when the issue started, whether water is actively running, or what breaker tripped..."
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder:text-slate-400"
              />
            </div>

            {/* Photo Capture / Upload */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                Evidence Photo (Highly Recommended)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 max-h-60 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Fault Evidence" className="max-h-60 object-contain w-full" />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black text-white rounded-xl transition cursor-pointer"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Uploading image...
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer transition bg-slate-50/50 dark:bg-zinc-950/40 space-y-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Tap to take photo or choose file
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Camera capture or gallery image (JPG, PNG up to 10MB)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Urgency & Caretaker Rail (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Priority & Urgency */}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-950 dark:text-white">
                3. Urgency & Service Level
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Set priority based on safety and daily living impairment.
              </p>
            </div>

            <div className="space-y-2.5">
              {PRIORITIES.map((p) => {
                const isSelected = priority === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => setPriority(p.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? `${p.activeBg} ring-2 ring-emerald-500/20 shadow-xs`
                        : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-950/50 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{p.label}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${p.badge}`}>
                        {p.sla}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">{p.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Preferred Visit Time */}
            <div className="pt-2 space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                Preferred Artisan Visit Time
              </label>
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 cursor-pointer"
              >
                {PREFERRED_TIMES.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Residence Context & Contacts */}
          {activeProperty && (
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" /> Rented Property Context
              </h3>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800/80 space-y-2">
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {activeProperty.title}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {activeProperty.address || activeProperty.city}, Ghana
                </div>
                {activeBooking.roomNumber && (
                  <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Room / Unit: {activeBooking.roomNumber}
                  </div>
                )}
              </div>

              {activeProperty.landlord && (
                <div className="pt-2 text-xs text-slate-600 dark:text-zinc-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Manager: {activeProperty.landlord.firstName} {activeProperty.landlord.lastName}</span>
                  </div>
                  {activeProperty.landlord.phone && (
                    <div className="flex items-center gap-2 font-mono">
                      <PhoneCall className="w-3.5 h-3.5 text-slate-400" />
                      <span>{activeProperty.landlord.phone}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={createTicketMutation.isPending || isUploading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {createTicketMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Submitting Work Order...
                </>
              ) : (
                <>
                  <Wrench className="w-5 h-5" /> Submit Maintenance Ticket
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    }>
      <ReportIssueContent />
    </Suspense>
  );
}
