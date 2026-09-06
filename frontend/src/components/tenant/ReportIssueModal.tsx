'use client';

import React, { useState, useRef } from 'react';
import { 
  X, Wrench, Droplets, Zap, Wind, Key, Hammer, Bug, Building, 
  Camera, AlertTriangle, CheckCircle2, Clock, 
  MapPin, Loader2, Info
} from 'lucide-react';
import clsx from 'clsx';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyTitle?: string;
  onSubmit: (ticketData: {
    propertyId: string;
    title: string;
    description: string;
    priority: string;
    imageUrl?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

const CATEGORIES = [
  {
    id: 'PLUMBING',
    label: 'Plumbing & Water',
    icon: Droplets,
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
    suggestions: [
      'Leaking sink pipe in bathroom',
      'Toilet flush not refilling',
      'Low water pressure in shower',
      'Blocked drain / water pooling',
      'Water heater not heating'
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
      'Circuit breaker tripping repeatedly',
      'Ceiling fan regulator stuck'
    ]
  },
  {
    id: 'AC_COOLING',
    label: 'AC & Ventilation',
    icon: Wind,
    color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-900',
    suggestions: [
      'AC unit not blowing cold air',
      'AC dripping water on bedroom floor',
      'AC remote control unresponsive',
      'Loud vibration noise from AC unit'
    ]
  },
  {
    id: 'LOCKS_SECURITY',
    label: 'Locks & Access',
    icon: Key,
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
    suggestions: [
      'Main entry door lock jammed',
      'Key broken / sticking inside cylinder',
      'Window latch will not secure',
      'Deadbolt alignment off'
    ]
  },
  {
    id: 'FIXTURES',
    label: 'Furniture & Fixtures',
    icon: Hammer,
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
    suggestions: [
      'Wardrobe door hinge detached',
      'Bed frame joint loose or broken',
      'Cabinet drawer off railing',
      'Towel rack pulled from wall'
    ]
  },
  {
    id: 'PEST_HYGIENE',
    label: 'Pest & Sanitation',
    icon: Bug,
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
    suggestions: [
      'Fumigation requested (ants / insects)',
      'Waste chute or bin area blocked',
      'Damp / mildew odor inspection'
    ]
  },
  {
    id: 'GENERAL',
    label: 'General / Facility',
    icon: Building,
    color: 'text-zinc-500 bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700',
    suggestions: [
      'Compound / corridor light out',
      'Overhead water tank empty / overflow',
      'Cracked floor tile hazard',
      'Exterior water seepage'
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
  'Compound / Gate'
];

const PRIORITIES = [
  {
    id: 'LOW',
    label: 'Low (Routine)',
    desc: 'Minor cosmetic wear, routine fix',
    badge: '48 – 72 hrs',
    borderColor: 'hover:border-emerald-400 border-zinc-200 dark:border-zinc-800',
    activeColor: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300',
    dotColor: 'bg-emerald-500'
  },
  {
    id: 'MEDIUM',
    label: 'Medium (Standard)',
    desc: 'Noticeable inconvenience, standard fix',
    badge: '24 – 48 hrs',
    borderColor: 'hover:border-amber-400 border-zinc-200 dark:border-zinc-800',
    activeColor: 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300',
    dotColor: 'bg-amber-500'
  },
  {
    id: 'HIGH',
    label: 'High (Urgent)',
    desc: 'Impairs daily living, no water / broken lock',
    badge: 'Within 24 hrs',
    borderColor: 'hover:border-orange-400 border-zinc-200 dark:border-zinc-800',
    activeColor: 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30 text-orange-900 dark:text-orange-300',
    dotColor: 'bg-orange-500'
  },
  {
    id: 'URGENT',
    label: 'Emergency (Hazard)',
    desc: 'Active flooding, sparking wires, safety risk',
    badge: 'Immediate',
    borderColor: 'hover:border-red-400 border-zinc-200 dark:border-zinc-800',
    activeColor: 'border-red-500 bg-red-50/60 dark:bg-red-950/40 text-red-900 dark:text-red-300',
    dotColor: 'bg-red-500 animate-ping'
  }
];

const PREFERRED_TIMES = [
  'Morning (8 AM – 12 PM)',
  'Afternoon (12 PM – 4 PM)',
  'Evening (4 PM – 7 PM)',
  'Any Time / Immediate Access'
];

export default function ReportIssueModal({
  isOpen,
  onClose,
  propertyId,
  propertyTitle,
  onSubmit,
  isSubmitting = false
}: ReportIssueModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('PLUMBING');
  const [title, setTitle] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Bathroom / Washroom');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [preferredTime, setPreferredTime] = useState('Morning (8 AM – 12 PM)');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [formError, setFormError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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

    // Set local preview immediately
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
    } catch (err: any) {
      console.warn('Media upload fallback to document upload:', err);
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
      } catch (err2: any) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim()) {
      setFormError('Please provide a short title for the issue.');
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setFormError('Please provide at least 10 characters describing the issue.');
      return;
    }

    // Format rich contextual description
    const compiledDescription = [
      `[Category: ${currentCategoryObj.label}]`,
      `[Location: ${selectedLocation}]`,
      `[Preferred Visit Time: ${preferredTime}]`,
      '',
      description.trim()
    ].join('\n');

    try {
      await onSubmit({
        propertyId,
        title: title.trim(),
        description: compiledDescription,
        priority,
        imageUrl: imageUrl || undefined
      });
      // Reset form
      setTitle('');
      setDescription('');
      setImageUrl(null);
      setImagePreview(null);
      setFormError('');
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit ticket. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl relative my-8 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0 bg-gradient-to-b from-zinc-50/80 to-white dark:from-zinc-900/60 dark:to-[#12151D]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-zinc-950 dark:text-white tracking-tight">
                    Report a Maintenance Issue
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300/40">
                    Active Tenancy
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {propertyTitle ? `Property: ${propertyTitle} • ` : ''}Your landlord and compound caretaker will be alerted immediately.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors shrink-0"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-zinc-800 dark:text-zinc-200">
          {formError && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Category Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              1. Issue Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                    }}
                    className={clsx(
                      "p-2.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer relative",
                      isSelected
                        ? "border-[#0F5132] bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-[#198754] ring-2 ring-emerald-500/20"
                        : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className={clsx("p-1.5 rounded-xl border", cat.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-[#198754]" />
                      )}
                    </div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Category Suggestion Pills */}
            <div className="pt-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                <Info className="w-3 h-3 text-emerald-500" />
                <span>Common issues in {currentCategoryObj.label} (click to auto-fill):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentCategoryObj.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setTitle(suggestion)}
                    className={clsx(
                      "text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer",
                      title === suggestion
                        ? "bg-[#0F5132] text-white border-[#0F5132] font-bold"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400"
                    )}
                  >
                    + {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Issue Title */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                2. What's the problem?
              </label>
              <span className="text-[11px] text-zinc-400">{title.length} / 100</span>
            </div>
            <input
              type="text"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master bathroom pipe leaking continuously"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0F5132] dark:focus:ring-[#198754] text-xs sm:text-sm font-medium transition-all"
              required
            />
          </div>

          {/* 3. Affected Area / Location */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              3. Affected Area / Location
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LOCATIONS.map((loc) => {
                const isSelected = selectedLocation === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setSelectedLocation(loc)}
                    className={clsx(
                      "text-xs px-3 py-1.5 rounded-xl border font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                      isSelected
                        ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-white shadow-xs"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                    )}
                  >
                    <MapPin className="w-3 h-3 text-emerald-500" />
                    <span>{loc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Priority Level */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              4. Priority & Urgency Level
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRIORITIES.map((p) => {
                const isSelected = priority === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={clsx(
                      "p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start justify-between gap-3",
                      isSelected ? p.activeColor : p.borderColor,
                      "bg-white dark:bg-zinc-900/60"
                    )}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={clsx("w-2 h-2 rounded-full", p.dotColor)} />
                        <span className="font-bold text-xs">{p.label}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                        {p.desc}
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0 border border-zinc-200/60 dark:border-zinc-700/60">
                      {p.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Emergency Warning Banner */}
            {priority === 'URGENT' && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5 animate-in">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Life & Property Safety Warning:</span>
                  <p className="mt-0.5 text-[11px] text-red-700 dark:text-red-300">
                    If this involves active electrical sparks, gas leaks, or uncontrollable water flooding, switch off the main breaker or shutoff valve and call your caretaker immediately. Ghana National Fire / Emergency: 112 or 192.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 5. Detailed Description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                5. Detailed Description
              </label>
              <span className="text-[11px] text-zinc-400">{description.length} / 500</span>
            </div>
            <textarea
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when the issue started, whether it's continuous or intermittent, and any other helpful details for the maintenance technician..."
              className="w-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0F5132] dark:focus:ring-[#198754] text-xs sm:text-sm font-medium transition-all"
              required
            />
          </div>

          {/* 6. Photo Proof Attachment */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              6. Photo Proof (Optional, highly recommended)
            </label>

            {imagePreview ? (
              <div className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-zinc-300 dark:border-zinc-700 shrink-0 bg-black">
                    <img 
                      src={imagePreview} 
                      alt="Issue preview" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Photo Attached</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                      Helps the caretaker bring exact replacement parts.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={removePhoto}
                  className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-900/40 transition-colors shrink-0 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-5 border-2 border-dashed border-zinc-300 dark:border-zinc-700/80 hover:border-emerald-500 dark:hover:border-emerald-500/80 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/30 transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                />
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform mb-2">
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5" />
                  )}
                </div>
                <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {isUploading ? 'Uploading photo proof...' : 'Click to take or upload a photo'}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  JPG, PNG, WebP up to 10MB
                </p>
              </div>
            )}
          </div>

          {/* 7. Preferred Caretaker Inspection Window */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
              7. Preferred Inspection Time
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {PREFERRED_TIMES.map((slot) => {
                const isSelected = preferredTime === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setPreferredTime(slot)}
                    className={clsx(
                      "text-xs px-3 py-2 rounded-xl border text-left font-medium transition-all cursor-pointer flex items-center justify-between",
                      isSelected
                        ? "border-[#0F5132] bg-emerald-50/50 dark:bg-emerald-950/30 font-bold text-[#0F5132] dark:text-[#198754]"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{slot}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#0F5132] dark:text-[#198754]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading || !title.trim() || !description.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Ticket...</span>
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4" />
                  <span>Submit Maintenance Ticket</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
