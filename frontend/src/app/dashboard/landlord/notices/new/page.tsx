'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import AlertBanner from '@/components/AlertBanner';
import {
  Megaphone,
  ArrowLeft,
  ArrowRight,
  Building,
  Zap,
  Wrench,
  Lock,
  Calendar,
  CheckCircle2,
  Loader2,
  Info,
  Check,
  MapPin,
} from 'lucide-react';

interface NoticePreset {
  title: string;
  category: string;
  priority: string;
  message: string;
}

const GHANAIAN_NOTICE_PRESETS: NoticePreset[] = [
  {
    title: 'ECG Scheduled Maintenance & Standby Generator Schedule',
    category: 'UTILITY',
    priority: 'IMPORTANT',
    message:
      'Notice to all residents: ECG has scheduled power maintenance for our district tomorrow between 9:00 AM and 4:00 PM. The compound standby generator will run from 10:00 AM to 1:00 PM, and from 6:00 PM onwards if grid power is not yet restored. Please unplug sensitive electronics.',
  },
  {
    title: 'GWCL Water Tanker Refill & Overhead Polytank Cleaning',
    category: 'UTILITY',
    priority: 'NORMAL',
    message:
      'A 1,500-gallon water tanker has been delivered to replenish the compound polytanks. Water supply will be briefly isolated for 45 minutes while the caretaker flushes the distribution valve. Normal pressure will resume shortly.',
  },
  {
    title: 'Compound Fumigation & Pest Control (Corridors & Yard)',
    category: 'MAINTENANCE',
    priority: 'IMPORTANT',
    message:
      'General compound pest control and fumigation will take place this Saturday at 8:00 AM. Residents are advised to close all room windows and keep footwear inside during the spraying exercise. Compound gates will remain open for ventilation.',
  },
  {
    title: 'Main Entrance Gate Security & Late Night Curfew Protocol',
    category: 'SECURITY',
    priority: 'IMPORTANT',
    message:
      'For the safety and security of all residents, the main compound gate will be locked at 10:30 PM each night. If you expect to arrive past 10:30 PM, kindly inform the resident security guard or caretaker on WhatsApp in advance.',
  },
  {
    title: 'EMERGENCY: Compound Water Main Distribution Line Leak',
    category: 'MAINTENANCE',
    priority: 'EMERGENCY',
    message:
      'Urgent notice: A cracked PVC connector on the main borehole pumping line has been detected. Pumping has been paused immediately to avoid flooding. Plumber is on-site and repairs are estimated to take 2 hours.',
  },
  {
    title: 'End-of-Month Compound General Cleaning & Waste Disposal',
    category: 'GENERAL',
    priority: 'NORMAL',
    message:
      'Our monthly general sanitation exercise will be held this Saturday between 7:00 AM and 9:00 AM. Please ensure all personal trash bags are tied securely and placed inside the Zoomlion dumpsters.',
  },
];

const CATEGORIES = [
  { id: 'UTILITY', label: 'Utility & Power / Water', shortLabel: 'Utility & Water', icon: Zap },
  { id: 'MAINTENANCE', label: 'Repairs & Sanitation', shortLabel: 'Repairs', icon: Wrench },
  { id: 'SECURITY', label: 'Compound Security & Gate', shortLabel: 'Security', icon: Lock },
  { id: 'EVENT', label: 'Community Gathering / Event', shortLabel: 'Event', icon: Calendar },
  { id: 'GENERAL', label: 'General Housekeeping', shortLabel: 'General', icon: Info },
];

export default function NewCompoundNoticePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const errorRef = useRef<HTMLDivElement>(null);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [category, setCategory] = useState<string>('UTILITY');
  const [priority, setPriority] = useState<string>('NORMAL');

  // Default expiry: 7 days from now
  const [expiresAt, setExpiresAt] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [formError, setFormError] = useState<string>('');

  // Fetch properties owned by landlord
  const { data: propertiesData, isLoading: isLoadingProps } = useQuery({
    queryKey: ['properties', 'landlord', 'mine'],
    queryFn: async () => {
      try {
        const res = await api.get('/properties/landlord/mine');
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const propertyList = (propertiesData || [])
    .map((p: any) => ({
      id: p.id || p.propertyId,
      title: p.title || p.propertyTitle || 'Property',
      location: p.location || p.propertyLocation || 'Ghana',
      type: p.type || 'Hostel / Apartment',
    }))
    .filter((p: any) => Boolean(p.id));

  // Auto-select first property
  useEffect(() => {
    if (!selectedPropertyId && propertyList.length > 0) {
      setSelectedPropertyId(propertyList[0].id);
    }
  }, [propertyList, selectedPropertyId]);

  const activeProperty = propertyList.find((p: any) => p.id === selectedPropertyId);
  const activeCategoryObj = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  const triggerError = (msg: string) => {
    setFormError(msg);
    toast.error(msg);
    setTimeout(() => {
      if (errorRef.current) {
        errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  const applyPreset = (preset: NoticePreset) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setPriority(preset.priority);
    setMessage(preset.message);
    toast.success('Template applied! Proceeding to Notice Content...');
    setCurrentStep(3);
  };

  const validateStep = (step: number): boolean => {
    setFormError('');
    if (step === 1) {
      if (!selectedPropertyId) {
        triggerError('Please select a target property for this broadcast.');
        return false;
      }
    }
    if (step === 2) {
      if (!category || !priority) {
        triggerError('Please select a category and urgency level.');
        return false;
      }
    }
    if (step === 3) {
      if (!title.trim()) {
        triggerError('Notice headline / title cannot be empty.');
        return false;
      }
      if (!message.trim()) {
        triggerError('Announcement body cannot be empty.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setFormError('');
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const createNoticeMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/compound-notices', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Notice broadcasted to all residents!');
      queryClient.invalidateQueries({ queryKey: ['compoundNotices', 'landlord'] });
      router.push('/dashboard/landlord?tab=notices');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to post compound notice';
      triggerError(msg);
    },
  });

  const handleSubmit = () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    createNoticeMutation.mutate({
      propertyId: selectedPropertyId,
      title: title.trim(),
      message: message.trim(),
      category,
      priority,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      {/* ── HEADER & 4-STEP SEGMENTED BAR ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard/landlord?tab=notices"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Notices
            </Link>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Broadcast Compound Notice to Residents
            </h1>
          </div>
        </div>

        {/* 4-Step Segmented Bar (Matches List Property Page) */}
        <div className="grid grid-cols-4 gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
          {[
            { step: 1, label: '1. Target Property' },
            { step: 2, label: '2. Category & Priority' },
            { step: 3, label: '3. Notice Content' },
            { step: 4, label: '4. Schedule & Review' },
          ].map((s) => (
            <button
              key={s.step}
              type="button"
              onClick={() => {
                if (s.step < currentStep || validateStep(currentStep)) {
                  setCurrentStep(s.step as 1 | 2 | 3 | 4);
                }
              }}
              className={clsx(
                'py-2 text-center font-bold rounded-lg transition-all cursor-pointer truncate px-1',
                currentStep === s.step
                  ? 'bg-[#0F5132] text-white shadow-xs'
                  : currentStep > s.step
                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {formError && <AlertBanner ref={errorRef} type="error" message={formError} />}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 1: TARGET PROPERTY & RESIDENTS
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                Step 1: Target Property &amp; Residents
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select the hostel or apartment block that will receive this announcement.
              </p>
            </div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {propertyList.length} {propertyList.length === 1 ? 'Property' : 'Properties'}
            </span>
          </div>

          <div>
            {isLoadingProps ? (
              <div className="py-10 flex items-center justify-center gap-2 text-zinc-400 text-xs font-bold">
                <Loader2 className="w-4 h-4 animate-spin text-[#0F5132]" /> Loading your properties...
              </div>
            ) : propertyList.length === 0 ? (
              <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                <p className="font-bold">No active properties found under your landlord account.</p>
                <Link
                  href="/dashboard/landlord/new"
                  className="inline-flex items-center gap-1.5 text-[#0F5132] dark:text-emerald-400 font-bold underline"
                >
                  Publish a property listing first
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {propertyList.map((prop: any) => {
                  const isSelected = selectedPropertyId === prop.id;
                  return (
                    <button
                      key={prop.id}
                      type="button"
                      onClick={() => setSelectedPropertyId(prop.id)}
                      className={clsx(
                        'text-left p-4 rounded-xl border-2 transition-all cursor-pointer relative',
                        isSelected
                          ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Building
                            className={clsx(
                              'w-4 h-4 shrink-0',
                              isSelected ? 'text-[#0F5132] dark:text-emerald-400' : 'text-zinc-400'
                            )}
                          />
                          <span className="font-bold text-xs text-zinc-950 dark:text-white uppercase tracking-wide truncate">
                            {prop.title}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-2 pl-6 truncate">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{prop.location}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleNext}
              disabled={propertyList.length === 0}
              className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              <span>Next: Category &amp; Priority</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 2: CATEGORY, URGENCY & QUICK TEMPLATES
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 2: Category &amp; Urgency Classification
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select the alert priority level, topic category, or apply a ready-made Ghanaian notice template.
            </p>
          </div>

          <div className="space-y-5">
            {/* Priority Selector */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Alert Urgency / Priority Level *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'NORMAL',
                    label: 'NORMAL',
                    desc: 'Routine notice, general updates, non-disruptive events.',
                    activeClass: 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20',
                    badgeColor: 'text-[#0F5132] dark:text-emerald-400',
                    dotColor: 'bg-[#0F5132]',
                  },
                  {
                    id: 'IMPORTANT',
                    label: 'IMPORTANT',
                    desc: 'Service downtime, gate curfew, inspection schedules.',
                    activeClass: 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20',
                    badgeColor: 'text-amber-700 dark:text-amber-400',
                    dotColor: 'bg-amber-500',
                  },
                  {
                    id: 'EMERGENCY',
                    label: 'EMERGENCY',
                    desc: 'Immediate action needed (flood, pipe burst, security alert).',
                    activeClass: 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20',
                    badgeColor: 'text-rose-600 dark:text-rose-400',
                    dotColor: 'bg-rose-500',
                  },
                ].map((p) => {
                  const isSelected = priority === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPriority(p.id)}
                      className={clsx(
                        'p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer',
                        isSelected
                          ? p.activeClass
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={clsx('text-xs font-black tracking-wide', p.badgeColor)}>{p.label}</span>
                        {isSelected && <span className={clsx('w-2 h-2 rounded-full', p.dotColor)} />}
                      </div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Topic Category *
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={clsx(
                        'px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer',
                        isSelected
                          ? 'bg-[#0F5132] text-white border-[#0F5132] shadow-2xs'
                          : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick-Fill Templates */}
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Quick-Fill Ghanaian Notice Templates (Optional — Click to Apply)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {GHANAIAN_NOTICE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="text-left p-3 rounded-xl bg-zinc-50 hover:bg-emerald-50/50 dark:bg-zinc-900 dark:hover:bg-emerald-950/20 border border-zinc-200 dark:border-zinc-800 hover:border-[#0F5132]/40 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-all truncate cursor-pointer"
                  >
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-300 text-xs font-bold rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>Next: Notice Content</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 3: NOTICE HEADLINE & DETAILED ANNOUNCEMENT
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 3: Notice Headline &amp; Detailed Announcement
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Write clear instructions, affected times, and contact details for residents.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Notice Headline / Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. ECG Scheduled Power Maintenance Tomorrow (9:00 AM - 4:00 PM)"
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  Announcement Body *
                </label>
                <span className="text-[10px] font-semibold text-zinc-400">{message.length} characters</span>
              </div>
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write detailed instructions, times, affected blocks or rooms, and emergency contact phone number..."
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl p-3.5 text-xs font-medium text-zinc-900 dark:text-white outline-none focus:border-[#0F5132] leading-relaxed"
                required
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-300 text-xs font-bold rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>Next: Schedule &amp; Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 4: EXPIRATION SCHEDULE, PREVIEW & BROADCAST SUMMARY
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 4: Expiration Schedule &amp; Review
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Set the auto-archive date and review how your announcement will appear to residents before broadcasting.
            </p>
          </div>

          <div className="space-y-5">
            {/* Auto-Archive Date */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Auto-Archive / Expiration Date (Optional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full sm:w-64 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
              />
              <span className="text-[11px] text-zinc-500 mt-1.5 block">
                The notice will automatically archive from the active resident bulletin board after this date.
              </span>
            </div>

            {/* Resident Bulletin Preview */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                Resident Bulletin Preview
              </label>
              <div className="p-4 rounded-xl bg-zinc-900 text-white border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Akwaaba Homes • Resident Bulletin
                  </div>
                  <span className="uppercase text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-white/10 text-zinc-200">
                    {priority}
                  </span>
                </div>
                <div className="flex items-start gap-3 pt-1">
                  <div
                    className={clsx(
                      'p-2 rounded-lg shrink-0',
                      priority === 'EMERGENCY'
                        ? 'bg-rose-600 text-white'
                        : priority === 'IMPORTANT'
                        ? 'bg-amber-500 text-white'
                        : 'bg-[#0F5132] text-white'
                    )}
                  >
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="text-xs font-bold text-white">{title || 'Untitled Notice'}</div>
                    <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                      {message || 'No announcement message entered.'}
                    </p>
                    <div className="text-[10px] text-emerald-400 font-semibold pt-1">
                      {activeProperty?.title || 'Selected Property'} • All Active Residents
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Horizontal Broadcast Summary Box (Matches Publication Summary on List Property Page) */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                Broadcast Summary
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Property</span>
                  <span className="font-bold text-zinc-900 dark:text-white truncate block">
                    {activeProperty ? activeProperty.title : 'Not selected'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Category</span>
                  <span className="font-bold text-zinc-900 dark:text-white truncate block">
                    {activeCategoryObj.shortLabel}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Urgency Level</span>
                  <span
                    className={clsx(
                      'font-bold truncate block',
                      priority === 'EMERGENCY'
                        ? 'text-rose-600 dark:text-rose-400'
                        : priority === 'IMPORTANT'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-[#0F5132] dark:text-emerald-400'
                    )}
                  >
                    {priority}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Auto-Archive</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {expiresAt || 'Manual Archive'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-300 text-xs font-bold rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={createNoticeMutation.isPending}
              className="px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {createNoticeMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Broadcast Notice</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
