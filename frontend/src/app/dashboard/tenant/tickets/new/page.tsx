'use client';

import React, { useState, useRef, Suspense } from 'react';
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
  CheckCircle2,
  Loader2,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import AlertBanner from '@/components/AlertBanner';

const CATEGORIES = [
  {
    id: 'PLUMBING',
    label: 'Plumbing & Water',
    icon: Droplets,
    suggestions: [
      'Leaking sink pipe in bathroom',
      'Toilet flush not refilling / running continuously',
      'Low water pressure from overhead polytank',
      'Blocked shower drain / pooling water',
      'Water heater malfunctioning / cold water only'
    ]
  },
  {
    id: 'ELECTRICAL',
    label: 'Electrical & Power',
    icon: Zap,
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
    suggestions: [
      'AC unit blowing warm / unchilled air',
      'AC unit dripping water onto bedroom floor',
      'AC remote control unresponsive or erratic',
      'Loud vibration noise from outdoor condenser'
    ]
  },
  {
    id: 'LOCKS_SECURITY',
    label: 'Locks & Security',
    icon: Key,
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
    suggestions: [
      'Wardrobe door hinge loose or detached',
      'Bed frame joint broken or unstable',
      'Kitchen drawer off track',
      'Towel rail pulled out from wall'
    ]
  },
  {
    id: 'PEST_HYGIENE',
    label: 'Pest & Sanitation',
    icon: Bug,
    suggestions: [
      'Fumigation requested (ants / insect infestation)',
      'Corridor waste bin area blocked',
      'Damp mold or mildew odor in washroom'
    ]
  },
  {
    id: 'GENERAL',
    label: 'Compound & General',
    icon: Building,
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
    desc: 'Minor cosmetic wear, scheduled fix within 72 hrs',
    sla: '48 – 72 hrs'
  },
  {
    id: 'MEDIUM',
    label: 'Medium (Standard)',
    desc: 'Noticeable inconvenience, standard priority response',
    sla: '24 – 48 hrs'
  },
  {
    id: 'HIGH',
    label: 'High (Urgent)',
    desc: 'Impairs living condition, lack of water or broken lock',
    sla: 'Within 24 hrs'
  },
  {
    id: 'URGENT',
    label: 'Emergency (Hazard)',
    desc: 'Active electrical sparking, flooding, or security danger',
    sla: 'Immediate Response'
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

  const [step, setStep] = useState(1);
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

  const { data: bookingsData } = useQuery({
    queryKey: ['bookings', 'tenant'],
    queryFn: async () => {
      const res = await api.get('/bookings/me');
      return res.data;
    }
  });

  const activeBookings = (bookingsData?.bookings || []).filter((b: any) =>
    ['CONFIRMED', 'APPROVED', 'COMPLETED', 'ACTIVE', 'CHECKED_IN'].includes(b.status)
  );

  React.useEffect(() => {
    if (!selectedPropertyId && activeBookings.length > 0) {
      setSelectedPropertyId(activeBookings[0].propertyId);
    }
  }, [activeBookings, selectedPropertyId]);

  const activeBooking = activeBookings.find((b: any) => b.propertyId === selectedPropertyId) || activeBookings[0];
  const activeProperty = activeBooking?.property;
  const currentCategoryObj = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];
  const currentPriorityObj = PRIORITIES.find((p) => p.id === priority) || PRIORITIES[1];

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
      router.push('/dashboard/tenant?tab=maintenance');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.message || 'Failed to submit ticket. Please try again.');
    }
  });

  const handleNextStep = () => {
    setFormError('');
    if (step === 2) {
      if (!title.trim()) {
        toast.error('Please enter a short issue headline or select a fault suggestion');
        return;
      }
      if (!description.trim() || description.trim().length < 10) {
        toast.error('Please provide at least 10 characters describing the fault');
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setFormError('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      handleNextStep();
      return;
    }
    setFormError('');

    if (!selectedPropertyId) {
      setFormError('Please select a rented property/room.');
      return;
    }
    if (!title.trim() || !description.trim() || description.trim().length < 10) {
      setFormError('Please complete the issue headline and description.');
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
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6 pb-24">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/dashboard/tenant?tab=maintenance')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Repairs &amp; Maintenance
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Report a Maintenance Issue
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Dispatch an official repair work order directly to your landlord and compound caretaker.
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
          { num: 1, label: '1. Unit & Category' },
          { num: 2, label: '2. Fault & Photo' },
          { num: 3, label: '3. Urgency & Access' },
          { num: 4, label: '4. Review & Dispatch' }
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

      {formError && <AlertBanner type="error" message={formError} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Unit & Category */}
        {step === 1 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Select Affected Unit &amp; Artisan Trade
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Accurate categorization dispatches the right artisan (plumber, electrician, AC technician, or carpenter).
              </p>
            </div>

            {activeBookings.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                  Rented Residence / Unit *
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                >
                  {activeBookings.map((b: any) => (
                    <option key={b.propertyId} value={b.propertyId}>
                      {b.property?.title} ({b.property?.city || 'Accra'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2.5">
                Issue Category *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`p-4 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 text-[#0F5132] dark:text-emerald-300 ring-2 ring-[#0F5132]/20'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[#0F5132] dark:text-emerald-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />}
                      </div>
                      <span className="text-xs font-bold leading-tight">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Fault & Photo */}
        {step === 2 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Describe the Fault &amp; Attach Photo Evidence
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Tap a common fault below or type your own summary and attach a clear photo of the issue.
              </p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Common {currentCategoryObj.label} Faults (Tap to fill):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {currentCategoryObj.suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTitle(suggestion)}
                    className="text-xs px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-emerald-50 hover:text-[#0F5132] dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition text-left cursor-pointer border border-zinc-200/60 dark:border-zinc-700/60"
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Issue Summary / Headline *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Bathroom sink pipe leaking onto floor"
                  required
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Location in Unit / Compound *
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Full Description &amp; Circumstances *
                </label>
                <span className="text-[10px] text-zinc-400">Min. 10 characters</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe when the issue started, whether water is actively running, or what breaker tripped..."
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-[#0F5132] leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Evidence Photo (Optional)
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
                <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 max-h-56 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Fault Evidence" className="max-h-56 object-contain w-full" />
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute top-3 right-3 p-1.5 bg-black/70 hover:bg-black text-white rounded-lg transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> Uploading image...
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 hover:border-[#0F5132] rounded-2xl p-6 text-center cursor-pointer transition bg-zinc-50/50 dark:bg-zinc-900/40 space-y-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">
                    Tap to attach photo of fault
                  </div>
                  <div className="text-[11px] text-zinc-400">JPG, PNG, or WebP up to 10MB</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Urgency & Access */}
        {step === 3 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Urgency Level &amp; Artisan Access Window
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Set the response SLA based on severity and indicate when the caretaker or artisan may enter.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRIORITIES.map((p) => {
                const isSelected = priority === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-[#0F5132]/20'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white">{p.label}</span>
                      <span className="text-[10px] font-mono font-bold text-[#0F5132] dark:text-emerald-400">
                        {p.sla}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500">{p.desc}</p>
                  </button>
                );
              })}
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                Preferred Artisan Visit Time *
              </label>
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
              >
                {PREFERRED_TIMES.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Active Electrical or Fire Emergency?</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-relaxed">
                For active fires, gas leaks, or serious electrical danger, switch off the main breaker immediately and dial Ghana National Fire Service on <strong>192</strong>.
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Dispatch */}
        {step === 4 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Review Maintenance Work Order
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Confirm the fault details below before dispatching to your landlord and caretaker.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Trade &amp; Location</span>
                <div className="font-bold text-zinc-900 dark:text-white">{currentCategoryObj.label}</div>
                <div className="text-zinc-500">{selectedLocation} &bull; {activeProperty?.title || 'Rented Unit'}</div>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Priority &amp; Access Window</span>
                <div className="font-bold text-[#0F5132] dark:text-emerald-400">
                  {currentPriorityObj.label} ({currentPriorityObj.sla})
                </div>
                <div className="text-zinc-500">{preferredTime}</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                {title || 'Work Order Summary'}
              </span>
              <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed">
                {description}
              </p>
            </div>
          </div>
        )}

        {/* Horizontal Summary Bar */}
        <div className="bg-zinc-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
              Maintenance Work Order Summary
            </div>
            <div className="text-sm font-bold">
              {currentCategoryObj.label} &bull; {selectedLocation}
            </div>
          </div>
          <div className="text-xs text-zinc-400 font-mono">
            SLA: {currentPriorityObj.sla}
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
              className="px-6 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0B3D26] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={createTicketMutation.isPending || isUploading}
              className="px-6 py-3 rounded-xl bg-[#0F5132] hover:bg-[#0B3D26] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              {createTicketMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Submitting Work Order...
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4" /> Submit Maintenance Ticket
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function NewTicketPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        </div>
      }
    >
      <ReportIssueContent />
    </Suspense>
  );
}
