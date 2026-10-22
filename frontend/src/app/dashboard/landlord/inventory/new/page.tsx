'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import AlertBanner from '@/components/AlertBanner';
import {
  Armchair,
  ArrowLeft,
  ArrowRight,
  Building,
  Zap,
  Key,
  CheckCircle2,
  Loader2,
  Info,
  DoorClosed,
  Wrench,
  Sparkles,
  Check,
  MapPin,
} from 'lucide-react';

export type AssetCondition = 'PRISTINE' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'MISSING';
export type AssetCategory =
  | 'ELECTRICAL'
  | 'FURNITURE'
  | 'DOORS_WINDOWS'
  | 'PLUMBING'
  | 'APPLIANCES'
  | 'KEYS_SECURITY';

interface PresetTemplate {
  name: string;
  category: AssetCategory;
  brandModel: string;
  condition: AssetCondition;
  replacementCostGHS: number;
  notes: string;
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    name: '56" Ceiling Fan (Orient/KDK)',
    category: 'ELECTRICAL',
    brandModel: 'KDK 3-Blade Regulator',
    condition: 'PRISTINE',
    replacementCostGHS: 650,
    notes: 'Smooth rotation, wall speed regulator functional.',
  },
  {
    name: 'Single Bed Frame & High-Density Mattress',
    category: 'FURNITURE',
    brandModel: 'Solid Hardwood 3x6 / Ashfoam 10"',
    condition: 'PRISTINE',
    replacementCostGHS: 1400,
    notes: 'Firm base, clean orthopedic fabric cover.',
  },
  {
    name: 'Study Desk & Ergonomic Swivel Chair',
    category: 'FURNITURE',
    brandModel: 'Laminate 120cm / Mesh Highback',
    condition: 'GOOD',
    replacementCostGHS: 850,
    notes: 'Sturdy legs, smooth chair castors and gas lift.',
  },
  {
    name: '2-Door Fitted Wardrobe with Lock & Key',
    category: 'FURNITURE',
    brandModel: 'MDF Laminated / Union Cylinder',
    condition: 'GOOD',
    replacementCostGHS: 1200,
    notes: 'Hinges aligned, 2 keys verified.',
  },
  {
    name: 'Inhemeter Din-Rail Pre-paid Submeter',
    category: 'ELECTRICAL',
    brandModel: 'Inhemeter DIN Pre-paid',
    condition: 'PRISTINE',
    replacementCostGHS: 950,
    notes: 'Calibrated, tamper seal intact with keypad.',
  },
  {
    name: 'Mortise Entrance Lockset + 2 Brass Keys',
    category: 'KEYS_SECURITY',
    brandModel: 'Union Brass Heavy-Duty Deadbolt',
    condition: 'PRISTINE',
    replacementCostGHS: 320,
    notes: 'Smooth cylinder latching, both original keys present.',
  },
  {
    name: 'Louver Window Blades (12 Blades + Mosquito Net)',
    category: 'DOORS_WINDOWS',
    brandModel: 'Anodized Aluminum Frame',
    condition: 'PRISTINE',
    replacementCostGHS: 420,
    notes: 'All 12 glass blades unbroken, wire mesh securely clamped.',
  },
  {
    name: 'Split Air Conditioner 1.5HP (Inverter)',
    category: 'APPLIANCES',
    brandModel: 'Midea / Nasco Inverter R410A',
    condition: 'PRISTINE',
    replacementCostGHS: 3850,
    notes: 'Condenser serviced, remote control functional.',
  },
];

const ASSET_CATEGORIES: Array<{ id: AssetCategory; label: string; icon: any }> = [
  { id: 'ELECTRICAL', label: 'Electrical & Metering', icon: Zap },
  { id: 'FURNITURE', label: 'Furniture & Bedding', icon: Armchair },
  { id: 'APPLIANCES', label: 'Appliances & HVAC', icon: Sparkles },
  { id: 'DOORS_WINDOWS', label: 'Doors, Glass & Louvers', icon: DoorClosed },
  { id: 'PLUMBING', label: 'Plumbing & Sanitary', icon: Wrench },
  { id: 'KEYS_SECURITY', label: 'Locks & Access Keys', icon: Key },
];

export default function NewInventoryAssetPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const errorRef = useRef<HTMLDivElement>(null);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [roomUnit, setRoomUnit] = useState<string>('RM 101');
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<AssetCategory>('ELECTRICAL');
  const [brandModel, setBrandModel] = useState<string>('');
  const [serialTag, setSerialTag] = useState<string>(`AST-${Math.floor(1000 + Math.random() * 9000)}`);
  const [condition, setCondition] = useState<AssetCondition>('PRISTINE');
  const [replacementCostGHS, setReplacementCostGHS] = useState<string>('650');
  const [notes, setNotes] = useState<string>('');
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
      rooms: p.rooms || [],
    }))
    .filter((p: any) => Boolean(p.id));

  useEffect(() => {
    if (!selectedPropertyId && propertyList.length > 0) {
      setSelectedPropertyId(propertyList[0].id);
    }
  }, [propertyList, selectedPropertyId]);

  const activeProperty = propertyList.find((p: any) => p.id === selectedPropertyId);

  const unitOptions = useMemo(() => {
    const list = ['RM 101', 'RM 102', 'RM 103', 'RM 201', 'RM 202', 'General Compound'];
    if (activeProperty?.rooms && Array.isArray(activeProperty.rooms)) {
      activeProperty.rooms.forEach((r: any) => {
        if (r.title && !list.includes(r.title)) list.unshift(r.title);
      });
    }
    return list;
  }, [activeProperty]);

  const costNumber = parseFloat(replacementCostGHS) || 0;

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

  const applyTemplate = (tmpl: PresetTemplate) => {
    setName(tmpl.name);
    setCategory(tmpl.category);
    setBrandModel(tmpl.brandModel);
    setCondition(tmpl.condition);
    setReplacementCostGHS(tmpl.replacementCostGHS.toString());
    setNotes(tmpl.notes);
    toast.success(`Template applied: ${tmpl.name}`);
  };

  const validateStep = (step: number): boolean => {
    setFormError('');
    if (step === 1) {
      if (!selectedPropertyId) {
        triggerError('Please select a target property.');
        return false;
      }
      if (!roomUnit.trim()) {
        triggerError('Please specify a room or unit identifier.');
        return false;
      }
    }
    if (step === 2) {
      if (!name.trim()) {
        triggerError('Fixture / appliance name is required.');
        return false;
      }
    }
    if (step === 3) {
      if (costNumber < 0) {
        triggerError('Replacement cost cannot be negative.');
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

  const saveAssetMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPropertyId) throw new Error('Property required');

      let existingItems: any[] = [];
      try {
        const res = await api.get(`/inspections/property/${selectedPropertyId}/inventory`);
        if (res.data?.items && Array.isArray(res.data.items)) {
          existingItems = res.data.items;
        }
      } catch {
        const cached = localStorage.getItem(`akwaaba_room_assets_${selectedPropertyId}`);
        if (cached) {
          try {
            existingItems = JSON.parse(cached);
          } catch {}
        }
      }

      const newItem = {
        id: `ast-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        propertyId: selectedPropertyId,
        roomUnit: roomUnit.trim() || 'General Room',
        name: name.trim(),
        category,
        brandModel: brandModel.trim() || undefined,
        serialTag: serialTag.trim() || undefined,
        condition,
        replacementCostGHS: parseFloat(replacementCostGHS) || 0,
        notes: notes.trim() || undefined,
        lastAuditedDate: new Date().toISOString(),
        deductFromCaution: ['DAMAGED', 'MISSING'].includes(condition),
      };

      const updated = [newItem, ...existingItems];

      localStorage.setItem(`akwaaba_room_assets_${selectedPropertyId}`, JSON.stringify(updated));
      await api.post(`/inspections/property/${selectedPropertyId}/inventory`, { items: updated });
      return newItem;
    },
    onSuccess: () => {
      toast.success('Room fixture registered in property vault!');
      queryClient.invalidateQueries({ queryKey: ['propertyInventory', selectedPropertyId] });
      router.push('/dashboard/landlord?tab=inventory');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to save fixture';
      triggerError(msg);
    },
  });

  const handleSubmit = () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;
    saveAssetMutation.mutate();
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      {/* ── HEADER & 4-STEP SEGMENTED BAR ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard/landlord?tab=inventory"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Room Asset Vault
            </Link>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Register Fixed Fixture or Room Appliance
            </h1>
          </div>
        </div>

        {/* 4-Step Segmented Bar (Matches List Property Page) */}
        <div className="grid grid-cols-4 gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
          {[
            { step: 1, label: '1. Property & Room' },
            { step: 2, label: '2. Fixture Identity' },
            { step: 3, label: '3. Condition & Value' },
            { step: 4, label: '4. Notes & Review' },
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
          STEP 1: PROPERTY & ROOM UNIT ASSIGNMENT
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                Step 1: Property &amp; Room Unit Assignment
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select the building and specify which room or common area houses this fixture.
              </p>
            </div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {propertyList.length} {propertyList.length === 1 ? 'Property' : 'Properties'}
            </span>
          </div>

          <div className="space-y-5">
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

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Room / Unit Identifier *
              </label>
              <input
                type="text"
                value={roomUnit}
                onChange={(e) => setRoomUnit(e.target.value)}
                placeholder="e.g. RM 101, Flat B2, or General Compound"
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                required
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {unitOptions.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setRoomUnit(u)}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer',
                      roomUnit === u
                        ? 'bg-[#0F5132] text-white border-[#0F5132]'
                        : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100'
                    )}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleNext}
              disabled={propertyList.length === 0}
              className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              <span>Next: Fixture Identity</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 2: FIXTURE IDENTITY, CATEGORY & QUICK TEMPLATES
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 2: Fixture Identity &amp; Specification
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select a quick-fill Ghanaian room fixture preset or enter the appliance details manually.
            </p>
          </div>

          <div className="space-y-5">
            {/* Quick-Fill Templates */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Quick-Fill Room Fixture Templates (Click to Apply)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplate(tmpl)}
                    className="text-left p-2.5 rounded-xl bg-zinc-50 hover:bg-emerald-50/50 dark:bg-zinc-900 dark:hover:bg-emerald-950/20 border border-zinc-200 dark:border-zinc-800 hover:border-[#0F5132]/40 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition-all flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="truncate">{tmpl.name}</span>
                    <span className="text-[10px] font-bold text-[#0F5132] dark:text-emerald-400 shrink-0">
                      GH₵ {tmpl.replacementCostGHS}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Fixture Category *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {ASSET_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={clsx(
                        'p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 cursor-pointer',
                        isSelected
                          ? 'bg-[#0F5132] text-white border-[#0F5132] shadow-2xs'
                          : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name & Brand */}
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Fixture / Appliance Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder='e.g. 56" Ceiling Fan (Orient/KDK)'
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Brand / Model Specification
                  </label>
                  <input
                    type="text"
                    value={brandModel}
                    onChange={(e) => setBrandModel(e.target.value)}
                    placeholder="e.g. KDK 3-Blade Regulator / Ashfoam 10in"
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    Asset Serial / Tag ID
                  </label>
                  <input
                    type="text"
                    value={serialTag}
                    onChange={(e) => setSerialTag(e.target.value)}
                    placeholder="e.g. AST-4821"
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  />
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
              onClick={handleNext}
              className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>Next: Condition &amp; Value</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 3: CONDITION STATE & REPLACEMENT VALUATION
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 3: Physical Condition &amp; Replacement Value
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Record the current physical state and replacement cost for move-in/move-out caution deposit audits.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Current Physical Condition *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {(
                  [
                    { id: 'PRISTINE', label: 'Pristine / New' },
                    { id: 'GOOD', label: 'Good Working' },
                    { id: 'FAIR', label: 'Fair Wear' },
                    { id: 'DAMAGED', label: 'Damaged' },
                    { id: 'MISSING', label: 'Missing' },
                  ] as Array<{ id: AssetCondition; label: string }>
                ).map((c) => {
                  const isSelected = condition === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCondition(c.id)}
                      className={clsx(
                        'py-2.5 px-3 rounded-xl border text-center text-xs font-bold transition-all cursor-pointer',
                        isSelected
                          ? 'bg-[#0F5132] text-white border-[#0F5132] shadow-2xs'
                          : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100'
                      )}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Estimated Replacement Cost (GH₵) *
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={replacementCostGHS}
                onChange={(e) => setReplacementCostGHS(e.target.value)}
                placeholder="e.g. 650"
                className="w-full sm:w-72 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                required
              />
              <span className="text-[11px] text-zinc-500 mt-1.5 block">
                Used as the benchmark replacement cost if the item is willfully damaged beyond fair wear and tear.
              </span>
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
              <span>Next: Notes &amp; Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 4: INSPECTION NOTES & ASSET SUMMARY
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 4: Inspection Notes &amp; Review
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Add any baseline condition notes and review the fixture details before saving to the Room Asset Vault.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Inspection &amp; Condition Notes (Optional)
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note any existing scratches, key count, regulator speed checks, or warranty details..."
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl p-3.5 text-xs font-medium text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                Registered room fixtures automatically appear on the tenant&rsquo;s digital Move-In and Move-Out
                Condition Checklists so both parties can verify room contents transparently.
              </div>
            </div>

            {/* Horizontal Asset Summary Box (Matches Publication Summary on List Property Page) */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                Fixture Registration Summary
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Property &amp; Unit</span>
                  <span className="font-bold text-zinc-900 dark:text-white truncate block">
                    {activeProperty ? `${activeProperty.title} (${roomUnit})` : roomUnit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Fixture</span>
                  <span className="font-bold text-zinc-900 dark:text-white truncate block">
                    {name || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Condition</span>
                  <span className="font-bold text-[#0F5132] dark:text-emerald-400">{condition}</span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Replacement Value</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    GH₵ {costNumber.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
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
              disabled={saveAssetMutation.isPending}
              className="px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {saveAssetMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Register Fixture</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
