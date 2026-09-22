'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { 
  Armchair, 
  ArrowLeft, 
  Building, 
  Layers, 
  Zap, 
  Key, 
  Wind, 
  Fan, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Info, 
  Plus, 
  Tag, 
  DollarSign,
  ShieldCheck,
  DoorClosed,
  Wrench,
  Sparkles
} from 'lucide-react';

export type AssetCondition = 'PRISTINE' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'MISSING';
export type AssetCategory = 'ELECTRICAL' | 'FURNITURE' | 'DOORS_WINDOWS' | 'PLUMBING' | 'APPLIANCES' | 'KEYS_SECURITY';

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
    notes: 'Smooth rotation, wall speed regulator functional.'
  },
  {
    name: 'Single Bed Frame & High-Density Mattress',
    category: 'FURNITURE',
    brandModel: 'Solid Hardwood 3x6 / Ashfoam 10"',
    condition: 'PRISTINE',
    replacementCostGHS: 1400,
    notes: 'Firm base, clean orthopedic fabric cover.'
  },
  {
    name: 'Study Desk & Ergonomic Swivel Chair',
    category: 'FURNITURE',
    brandModel: 'Laminate 120cm / Mesh Highback',
    condition: 'GOOD',
    replacementCostGHS: 850,
    notes: 'Sturdy legs, smooth chair castors and gas lift.'
  },
  {
    name: '2-Door Fitted Wardrobe with Lock & Key',
    category: 'FURNITURE',
    brandModel: 'MDF Laminated / Union Cylinder',
    condition: 'GOOD',
    replacementCostGHS: 1200,
    notes: 'Hinges aligned, 2 keys verified.'
  },
  {
    name: 'Inhemeter Din-Rail Pre-paid Submeter',
    category: 'ELECTRICAL',
    brandModel: 'Inhemeter DIN Pre-paid',
    condition: 'PRISTINE',
    replacementCostGHS: 950,
    notes: 'Calibrated, tamper seal intact with keypad.'
  },
  {
    name: 'Mortise Entrance Lockset + 2 Brass Keys',
    category: 'KEYS_SECURITY',
    brandModel: 'Union Brass Heavy-Duty Deadbolt',
    condition: 'PRISTINE',
    replacementCostGHS: 320,
    notes: 'Smooth cylinder latching, both original keys present.'
  },
  {
    name: 'Louver Window Blades (12 Blades + Mosquito Net)',
    category: 'DOORS_WINDOWS',
    brandModel: 'Anodized Aluminum Frame',
    condition: 'PRISTINE',
    replacementCostGHS: 420,
    notes: 'All 12 glass blades unbroken, wire mesh securely clamped.'
  },
  {
    name: 'Split Air Conditioner 1.5HP (Inverter)',
    category: 'APPLIANCES',
    brandModel: 'Midea / Nasco Inverter R410A',
    condition: 'PRISTINE',
    replacementCostGHS: 3850,
    notes: 'Condenser serviced, remote control functional.'
  }
];

export default function NewInventoryAssetPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

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
    }
  });

  const propertyList = (propertiesData || []).map((p: any) => ({
    id: p.id || p.propertyId,
    title: p.title || p.propertyTitle || 'Property',
    location: p.location || p.propertyLocation || 'Ghana',
    type: p.type || 'Hostel/Apartment',
    rooms: p.rooms || []
  })).filter((p: any) => Boolean(p.id));

  // Auto-select first property
  useEffect(() => {
    if (!selectedPropertyId && propertyList.length > 0) {
      setSelectedPropertyId(propertyList[0].id);
    }
  }, [propertyList, selectedPropertyId]);

  const activeProperty = propertyList.find((p: any) => p.id === selectedPropertyId);

  // Suggested unit numbers
  const unitOptions = useMemo(() => {
    const list = ['RM 101', 'RM 102', 'RM 103', 'RM 201', 'RM 202', 'General Compound'];
    if (activeProperty?.rooms && Array.isArray(activeProperty.rooms)) {
      activeProperty.rooms.forEach((r: any) => {
        if (r.title && !list.includes(r.title)) list.unshift(r.title);
      });
    }
    return list;
  }, [activeProperty]);

  const applyTemplate = (tmpl: PresetTemplate) => {
    setName(tmpl.name);
    setCategory(tmpl.category);
    setBrandModel(tmpl.brandModel);
    setCondition(tmpl.condition);
    setReplacementCostGHS(tmpl.replacementCostGHS.toString());
    setNotes(tmpl.notes);
    toast.success(`Template applied: ${tmpl.name}`);
  };

  const saveAssetMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPropertyId) throw new Error('Property required');

      // 1. Fetch current items from server or localStorage
      let existingItems: any[] = [];
      try {
        const res = await api.get(`/inspections/property/${selectedPropertyId}/inventory`);
        if (res.data?.items && Array.isArray(res.data.items)) {
          existingItems = res.data.items;
        }
      } catch {
        const cached = localStorage.getItem(`akwaaba_room_assets_${selectedPropertyId}`);
        if (cached) {
          try { existingItems = JSON.parse(cached); } catch {}
        }
      }

      // 2. Append new item
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
        deductFromCaution: ['DAMAGED', 'MISSING'].includes(condition)
      };

      const updated = [newItem, ...existingItems];

      // 3. Persist
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
      setFormError(msg);
      toast.error(msg);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedPropertyId) {
      setFormError('Please select a target property.');
      toast.error('Property selection required.');
      return;
    }

    if (!name.trim()) {
      setFormError('Fixture name is required.');
      toast.error('Asset name is required.');
      return;
    }

    saveAssetMutation.mutate();
  };

  const costNumber = parseFloat(replacementCostGHS) || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Header & Breadcrumbs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/landlord?tab=inventory"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Return to Inventory Vault"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Link href="/dashboard/landlord" className="hover:underline">Dashboard</Link>
                <span>/</span>
                <Link href="/dashboard/landlord?tab=inventory" className="hover:underline">Room Asset Vault</Link>
                <span>/</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">Register Fixture</span>
              </div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Register Fixed Fixture or Room Appliance
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              <Armchair className="w-3.5 h-3.5 text-teal-600" />
              Room Asset Vault
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left 2-Columns: Fixture Details Form */}
            <div className="lg:col-span-2 space-y-6">

              {/* Error Banner */}
              {formError && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="font-semibold">{formError}</div>
                </div>
              )}

              {/* 1. Property & Room Unit Assignment */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center font-bold">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        1. Property &amp; Room Assignment
                      </h2>
                      <p className="text-xs text-slate-500">
                        Specify which property and specific room unit this fixture belongs to
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                      Property *
                    </label>
                    <select
                      value={selectedPropertyId}
                      onChange={(e) => setSelectedPropertyId(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                    >
                      {propertyList.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.location})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                      Room Unit / Number *
                    </label>
                    <input
                      type="text"
                      value={roomUnit}
                      onChange={(e) => setRoomUnit(e.target.value)}
                      placeholder="e.g. RM 101, Master Suite, Compound"
                      list="unit-suggestions"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                      required
                    />
                    <datalist id="unit-suggestions">
                      {unitOptions.map((opt, i) => (
                        <option key={i} value={opt} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* 2. Quick Preset Templates */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      2. Common Ghanaian Fixture Templates
                    </h2>
                    <p className="text-xs text-slate-500">
                      Click any standard hostel item to auto-populate category, specifications &amp; replacement cost
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {PRESET_TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyTemplate(tmpl)}
                      className="text-left p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900 dark:text-white group-hover:text-teal-600">
                          {tmpl.name}
                        </span>
                        <span className="font-mono text-xs font-black text-slate-600 dark:text-slate-300">
                          GH₵ {tmpl.replacementCostGHS}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-1">
                        {tmpl.brandModel}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Physical Specs & Valuation */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      3. Asset Specifications &amp; Replacement Value
                    </h2>
                    <p className="text-xs text-slate-500">
                      Brand details, inventory serial tag, condition, and caution deposit value
                    </p>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                    Fixture / Appliance Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder='e.g. 56" Ceiling Fan, Orthopedic Bed & Mattress, Wardrobe'
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>

                {/* Category & Condition */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                      Asset Category *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as AssetCategory)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                    >
                      <option value="ELECTRICAL">⚡ Electrical (Fan, Pre-paid Submeter, Lighting)</option>
                      <option value="FURNITURE">🪑 Furniture (Bed Frame, Mattress, Desk, Chair, Wardrobe)</option>
                      <option value="DOORS_WINDOWS">🚪 Doors, Windows &amp; Louvers</option>
                      <option value="PLUMBING">🚰 Plumbing &amp; Sanitary Fixtures</option>
                      <option value="APPLIANCES">❄️ Appliances (Air Conditioner, Water Heater, Fridge)</option>
                      <option value="KEYS_SECURITY">🔑 Keys, Locksets &amp; Security</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                      Initial Condition Status *
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value as AssetCondition)}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                    >
                      <option value="PRISTINE">🟢 Brand New / Pristine Condition</option>
                      <option value="GOOD">🔵 Good (Normal minor signs of use)</option>
                      <option value="FAIR">🟡 Fair (Cosmetic wear, fully functional)</option>
                      <option value="DAMAGED">🔴 Damaged (Requires repair / deduction)</option>
                      <option value="MISSING">⚫ Missing (Requires replacement)</option>
                    </select>
                  </div>
                </div>

                {/* Brand & Serial Tag */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                      Brand / Model
                    </label>
                    <input
                      type="text"
                      value={brandModel}
                      onChange={(e) => setBrandModel(e.target.value)}
                      placeholder="e.g. KDK 3-Blade / Ashfoam Orthopedic"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                      Inventory Serial Tag #
                    </label>
                    <input
                      type="text"
                      value={serialTag}
                      onChange={(e) => setSerialTag(e.target.value)}
                      placeholder="e.g. AST-4820"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                {/* Replacement Cost */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                    Replacement Cost / Caution Valuation (GH₵) *
                  </label>
                  <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-teal-500 max-w-sm">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                      GH₵
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={replacementCostGHS}
                      onChange={(e) => setReplacementCostGHS(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-14 pr-4 py-3 bg-transparent text-lg font-black text-slate-900 dark:text-white outline-none"
                      required
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    The statutory amount charged if damaged or unreturned at checkout
                  </span>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                    Inspection Remarks &amp; Notes
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Specific fixture notes, warranty info, date installed, or pre-existing blemishes..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

            </div>

            {/* Right Column: Caution Deposit Impact & Summary */}
            <div className="space-y-6">

              {/* Dossier Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Fixture Audit Dossier
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-600">
                    Vault Item
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-400 font-medium">Property:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-right truncate max-w-[180px]">
                      {activeProperty ? activeProperty.title : 'None selected'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Room Unit:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {roomUnit || 'RM 101'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Serial Tag:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {serialTag}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Condition:</span>
                    <span className="font-bold text-emerald-600">
                      {condition}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Replacement Valuation
                    </span>
                    <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      GH₵ {costNumber.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Primary Button */}
                <div className="space-y-2.5 pt-3">
                  <button
                    type="submit"
                    disabled={saveAssetMutation.isPending}
                    className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-black text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {saveAssetMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving to Vault...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Save Fixture to Vault
                      </>
                    )}
                  </button>

                  <Link
                    href="/dashboard/landlord?tab=inventory"
                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs transition-colors flex items-center justify-center"
                  >
                    Cancel &amp; Return
                  </Link>
                </div>
              </div>

              {/* Act 220 Caution Deposit Protection Legal Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-md space-y-3">
                <div className="flex items-center gap-2 text-teal-400">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider">
                    Act 220 Caution Deposit Compliance
                  </h4>
                </div>
                <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
                  <p>
                    Under the <strong>Ghana Rent Act 1963 (Act 220 § 19)</strong>, landlords may only deduct verifiable fixture damages beyond normal fair wear and tear from a tenant's caution deposit.
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                    <li>Documenting initial fixture condition upon check-in protects your legal right to settlement.</li>
                    <li>Items logged here sync automatically to Move-In and Move-Out inspection checklists.</li>
                  </ul>
                </div>
              </div>

            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
