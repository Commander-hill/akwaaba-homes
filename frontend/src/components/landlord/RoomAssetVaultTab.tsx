'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Armchair, Search, Filter, Plus, Trash2, Edit3, Printer, 
  CheckCircle2, AlertTriangle, XCircle, Info, 
  Layers, Fan, Zap, Key, Wind, FileText, RefreshCw, 
  MessageSquare, SlidersHorizontal, DoorClosed
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import api from '@/lib/axios';

export type AssetCondition = 'PRISTINE' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'MISSING';
export type AssetCategory = 'ELECTRICAL' | 'FURNITURE' | 'DOORS_WINDOWS' | 'PLUMBING' | 'APPLIANCES' | 'KEYS_SECURITY';

export interface RoomAssetItem {
  id: string;
  propertyId: string;
  roomUnit: string; // e.g. "RM 101", "RM 102", "General"
  name: string;
  category: AssetCategory;
  brandModel?: string;
  serialTag?: string;
  condition: AssetCondition;
  replacementCostGHS: number;
  notes?: string;
  lastAuditedDate: string;
  deductFromCaution?: boolean;
}

interface RoomAssetVaultTabProps {
  properties: any[];
  bookings?: any[];
}

const DEFAULT_ASSET_TEMPLATES: Array<Omit<RoomAssetItem, 'id' | 'propertyId' | 'roomUnit' | 'lastAuditedDate'>> = [
  {
    name: '56" Ceiling Fan (Orient/KDK)',
    category: 'ELECTRICAL',
    brandModel: 'KDK 3-Blade Regulator',
    serialTag: 'CF-01',
    condition: 'PRISTINE',
    replacementCostGHS: 650,
    notes: 'Smooth rotation, wall speed regulator functional.'
  },
  {
    name: 'High-Density Orthopedic Mattress 3.5x6ft',
    category: 'FURNITURE',
    brandModel: 'Ashfoam Royal Orthopedic',
    serialTag: 'MAT-01',
    condition: 'PRISTINE',
    replacementCostGHS: 1200,
    notes: 'Clean waterproof cover fitted, zero tears.'
  },
  {
    name: 'Hardwood Study Desk with Lockable Drawer',
    category: 'FURNITURE',
    brandModel: 'Wawa Timber Modular',
    serialTag: 'DSK-01',
    condition: 'GOOD',
    replacementCostGHS: 850,
    notes: 'Desk surface clean, 1 drawer key present.'
  },
  {
    name: 'Ergonomic Student Mesh Chair',
    category: 'FURNITURE',
    brandModel: 'OfficePoint Comfort Mesh',
    serialTag: 'CHR-01',
    condition: 'GOOD',
    replacementCostGHS: 450,
    notes: 'Hydraulic lift functional, castors intact.'
  },
  {
    name: 'Louver Window Blades (12 Blades + Mosquito Net)',
    category: 'DOORS_WINDOWS',
    brandModel: 'Anodized Aluminum Frame',
    serialTag: 'LV-01',
    condition: 'PRISTINE',
    replacementCostGHS: 380,
    notes: 'All 12 glass blades unbroken, wire mesh securely clamped.'
  },
  {
    name: 'Mortise Entrance Lockset + 2 Brass Keys',
    category: 'KEYS_SECURITY',
    brandModel: 'Union Brass Deadbolt',
    serialTag: 'LCK-01',
    condition: 'PRISTINE',
    replacementCostGHS: 280,
    notes: 'Smooth cylinder latching, both original keys present.'
  },
  {
    name: 'Pre-paid Room Submeter & Circuit Breaker',
    category: 'ELECTRICAL',
    brandModel: 'Inhemeter Din-Rail Pre-paid',
    serialTag: 'MTR-01',
    condition: 'GOOD',
    replacementCostGHS: 900,
    notes: 'Calibrated, tamper seal unbroken.'
  }
];

export default function RoomAssetVaultTab({ properties, bookings = [] }: RoomAssetVaultTabProps) {
  // 1. Property Selection
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    properties?.[0]?.id || ''
  );

  const selectedProperty = useMemo(() => {
    return properties?.find(p => p.id === selectedPropertyId) || properties?.[0];
  }, [properties, selectedPropertyId]);

  // Extract room units from property rooms or bookings
  const roomUnitsList = useMemo(() => {
    if (!selectedProperty) return ['General Room'];
    const units = new Set<string>();
    
    // from rooms
    if (selectedProperty.rooms && Array.isArray(selectedProperty.rooms)) {
      selectedProperty.rooms.forEach((r: any) => {
        if (r.roomUnits && Array.isArray(r.roomUnits)) {
          r.roomUnits.forEach((u: any) => units.add(u.unitNumber));
        } else if (r.title) {
          units.add(r.title);
        }
      });
    }

    // from bookings
    const propBookings = bookings.filter((b: any) => b.propertyId === selectedProperty.id);
    propBookings.forEach((b: any) => {
      if (b.roomUnit?.unitNumber) units.add(b.roomUnit.unitNumber);
      else if (b.room?.title) units.add(b.room.title);
    });

    if (units.size === 0) {
      units.add('RM 101');
      units.add('RM 102');
      units.add('RM 103');
      units.add('RM 201');
    }

    return Array.from(units);
  }, [selectedProperty, bookings]);

  // 2. Filters & State
  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedCondition, setSelectedCondition] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 3. Asset storage
  const [assets, setAssets] = useState<RoomAssetItem[]>([]);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load from database with localStorage instant fallback
  useEffect(() => {
    if (!selectedProperty?.id) return;
    let isMounted = true;
    const storageKey = `akwaaba_room_assets_${selectedProperty.id}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setAssets(JSON.parse(stored));
        setIsLoaded(true);
      } catch (e) {
        console.error('Failed to parse saved assets', e);
      }
    }

    // Query backend for synchronized assets
    const fetchServerAssets = async () => {
      try {
        const res = await api.get(`/inspections/property/${selectedProperty.id}/inventory`);
        const serverItems = res.data?.items;
        if (Array.isArray(serverItems) && serverItems.length > 0 && isMounted) {
          setAssets(serverItems);
          localStorage.setItem(storageKey, JSON.stringify(serverItems));
          setIsLoaded(true);
          return;
        }
      } catch (err) {}

      // If neither server nor local storage has assets, generate initial seed and save to server
      if (!stored && isMounted) {
        const initialSeed: RoomAssetItem[] = [];
        roomUnitsList.forEach((unitName) => {
          DEFAULT_ASSET_TEMPLATES.forEach((tmpl, idx) => {
            initialSeed.push({
              ...tmpl,
              id: `seed_${unitName}_${idx}_${Date.now()}`,
              propertyId: selectedProperty.id,
              roomUnit: unitName,
              lastAuditedDate: new Date().toISOString().split('T')[0],
              serialTag: `${tmpl.serialTag}-${unitName.replace(/[^a-zA-Z0-9]/g, '')}`
            });
          });
        });
        setAssets(initialSeed);
        localStorage.setItem(storageKey, JSON.stringify(initialSeed));
        setIsLoaded(true);
        api.post(`/inspections/property/${selectedProperty.id}/inventory`, { items: initialSeed }).catch(() => {});
      }
    };

    fetchServerAssets();
    return () => { isMounted = false; };
  }, [selectedProperty?.id, roomUnitsList]);

  // Helper to persist to server and local cache
  const saveAssets = (updated: RoomAssetItem[]) => {
    setAssets(updated);
    if (selectedProperty?.id) {
      localStorage.setItem(`akwaaba_room_assets_${selectedProperty.id}`, JSON.stringify(updated));
      api.post(`/inspections/property/${selectedProperty.id}/inventory`, { items: updated }).catch((e) => {
        console.warn('Backend inventory sync failed, cached locally', e);
      });
    }
  };

  // 4. Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeEditingAsset, setActiveEditingAsset] = useState<RoomAssetItem | null>(null);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<AssetCategory>('ELECTRICAL');
  const [formUnit, setFormUnit] = useState(roomUnitsList[0] || 'RM 101');
  const [formBrand, setFormBrand] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formCondition, setFormCondition] = useState<AssetCondition>('PRISTINE');
  const [formCost, setFormCost] = useState('300');
  const [formNotes, setFormNotes] = useState('');

  const openAddModal = () => {
    setFormName('');
    setFormCategory('ELECTRICAL');
    setFormUnit(selectedUnit === 'ALL' ? (roomUnitsList[0] || 'RM 101') : selectedUnit);
    setFormBrand('');
    setFormSerial(`AST-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormCondition('PRISTINE');
    setFormCost('350');
    setFormNotes('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (asset: RoomAssetItem) => {
    setActiveEditingAsset(asset);
    setFormName(asset.name);
    setFormCategory(asset.category);
    setFormUnit(asset.roomUnit);
    setFormBrand(asset.brandModel || '');
    setFormSerial(asset.serialTag || '');
    setFormCondition(asset.condition);
    setFormCost(asset.replacementCostGHS.toString());
    setFormNotes(asset.notes || '');
    setIsEditModalOpen(true);
  };

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Please enter the asset name');
      return;
    }
    const newAsset: RoomAssetItem = {
      id: `asset_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      propertyId: selectedProperty?.id || '',
      roomUnit: formUnit,
      name: formName.trim(),
      category: formCategory,
      brandModel: formBrand.trim(),
      serialTag: formSerial.trim(),
      condition: formCondition,
      replacementCostGHS: parseFloat(formCost) || 0,
      notes: formNotes.trim(),
      lastAuditedDate: new Date().toISOString().split('T')[0],
      deductFromCaution: formCondition === 'DAMAGED' || formCondition === 'MISSING'
    };

    const updated = [newAsset, ...assets];
    saveAssets(updated);
    toast.success(`Asset "${newAsset.name}" registered to ${newAsset.roomUnit}!`);
    setIsAddModalOpen(false);
  };

  const handleUpdateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEditingAsset) return;
    const updatedList = assets.map(a => {
      if (a.id === activeEditingAsset.id) {
        return {
          ...a,
          name: formName.trim(),
          category: formCategory,
          roomUnit: formUnit,
          brandModel: formBrand.trim(),
          serialTag: formSerial.trim(),
          condition: formCondition,
          replacementCostGHS: parseFloat(formCost) || 0,
          notes: formNotes.trim(),
          lastAuditedDate: new Date().toISOString().split('T')[0],
          deductFromCaution: formCondition === 'DAMAGED' || formCondition === 'MISSING'
        };
      }
      return a;
    });
    saveAssets(updatedList);
    toast.success('Asset details updated successfully!');
    setIsEditModalOpen(false);
    setActiveEditingAsset(null);
  };

  const handleDeleteAsset = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from the inventory registry?`)) {
      const updated = assets.filter(a => a.id !== id);
      saveAssets(updated);
      toast.success(`Asset "${name}" deleted.`);
    }
  };

  const handleQuickConditionChange = (id: string, newCondition: AssetCondition) => {
    const updated = assets.map(a => {
      if (a.id === id) {
        return {
          ...a,
          condition: newCondition,
          deductFromCaution: newCondition === 'DAMAGED' || newCondition === 'MISSING',
          lastAuditedDate: new Date().toISOString().split('T')[0]
        };
      }
      return a;
    });
    saveAssets(updated);
    toast.success(`Status updated to ${newCondition}`);
  };

  // Seed default room assets for newly created units
  const handleSeedRoom = (unitName: string) => {
    const newItems: RoomAssetItem[] = DEFAULT_ASSET_TEMPLATES.map((tmpl, idx) => ({
      ...tmpl,
      id: `seed_${unitName}_${idx}_${Date.now()}`,
      propertyId: selectedProperty?.id || '',
      roomUnit: unitName,
      lastAuditedDate: new Date().toISOString().split('T')[0],
      serialTag: `${tmpl.serialTag}-${unitName.replace(/[^a-zA-Z0-9]/g, '')}`
    }));
    const updated = [...assets, ...newItems];
    saveAssets(updated);
    toast.success(`Standard inventory (7 items) added to ${unitName}!`);
  };

  // 5. Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      if (selectedUnit !== 'ALL' && a.roomUnit !== selectedUnit) return false;
      if (selectedCategory !== 'ALL' && a.category !== selectedCategory) return false;
      if (selectedCondition !== 'ALL' && a.condition !== selectedCondition) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = a.name.toLowerCase().includes(q);
        const matchesTag = (a.serialTag || '').toLowerCase().includes(q);
        const matchesBrand = (a.brandModel || '').toLowerCase().includes(q);
        const matchesUnit = a.roomUnit.toLowerCase().includes(q);
        if (!matchesName && !matchesTag && !matchesBrand && !matchesUnit) return false;
      }
      return true;
    });
  }, [assets, selectedUnit, selectedCategory, selectedCondition, searchQuery]);

  // 6. Metrics & Caution Summary
  const metrics = useMemo(() => {
    const total = assets.length;
    const pristine = assets.filter(a => a.condition === 'PRISTINE').length;
    const good = assets.filter(a => a.condition === 'GOOD').length;
    const fair = assets.filter(a => a.condition === 'FAIR').length;
    const damaged = assets.filter(a => a.condition === 'DAMAGED').length;
    const missing = assets.filter(a => a.condition === 'MISSING').length;

    const totalCautionDeductions = assets
      .filter(a => a.condition === 'DAMAGED' || a.condition === 'MISSING')
      .reduce((sum, a) => sum + (a.replacementCostGHS || 0), 0);

    const operationalRate = total > 0 ? Math.round(((pristine + good) / total) * 100) : 100;

    return { total, pristine, good, fair, damaged, missing, totalCautionDeductions, operationalRate };
  }, [assets]);

  // Helper for WhatsApp Handover Slip
  const handleSendWhatsAppSlip = (unit: string) => {
    const unitAssets = assets.filter(a => a.roomUnit === unit);
    if (unitAssets.length === 0) {
      toast.error(`No assets registered in ${unit}`);
      return;
    }
    const damagedItems = unitAssets.filter(a => a.condition === 'DAMAGED' || a.condition === 'MISSING');
    
    let text = `📋 *AKWAABA HOMES - ROOM INVENTORY & ASSET REGISTRY*\n`;
    text += `🏢 *Property:* ${selectedProperty?.title || 'Property'}\n`;
    text += `🚪 *Unit:* ${unit}\n`;
    text += `📅 *Audit Date:* ${new Date().toLocaleDateString('en-GB')}\n\n`;
    text += `*Registered Fixtures & Assets:*\n`;
    unitAssets.forEach((a, i) => {
      const emoji = a.condition === 'PRISTINE' ? '✅' : a.condition === 'GOOD' ? '👍' : a.condition === 'FAIR' ? '⚠️' : '❌';
      text += `${i + 1}. ${emoji} *${a.name}* (${a.condition})\n   Tag: ${a.serialTag || 'N/A'} | Repl. Value: GHS ${a.replacementCostGHS}\n`;
    });

    if (damagedItems.length > 0) {
      const damageTotal = damagedItems.reduce((s, d) => s + d.replacementCostGHS, 0);
      text += `\n⚠️ *Assessed Caution Deductions:* GHS ${damageTotal.toFixed(2)}\n`;
      damagedItems.forEach(d => {
        text += `- ${d.name}: GHS ${d.replacementCostGHS} (${d.notes || 'Damaged' })\n`;
      });
    } else {
      text += `\n✨ *Clean Bill of Health:* 100% fixtures pristine and in working order. Full caution deposit refundable.\n`;
    }

    text += `\n_Signed by Caretaker / Management - Akwaaba Homes Vault_`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Helper for Print
  const handlePrintHandover = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ─── HERO & ACTION BAR ─── */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-slate-950 rounded-3xl p-6 lg:p-8 text-white shadow-2xl relative overflow-hidden border border-teal-700/30">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider border border-teal-500/30">
              <Armchair className="w-3.5 h-3.5" />
              Room Asset & Appliance Registry
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
              Inventory Vault & Caution Tracker
            </h2>
            <p className="text-slate-300 text-sm max-w-xl">
              Catalog room furnishings, ceiling fans, locks, study desks, and appliances per unit. 
              Automatically assess condition differentials during checkout to protect caution deposits.
            </p>
          </div>

          {/* Property Selector & Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {properties && properties.length > 1 && (
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="bg-slate-800/90 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all cursor-pointer"
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            )}

            <button
              onClick={handlePrintHandover}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl border border-slate-700 transition-all shadow-sm"
              title="Print inventory certificate"
            >
              <Printer className="w-4 h-4 text-teal-400" />
              <span>Print Audit</span>
            </button>

            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Register Fixture</span>
            </button>
          </div>
        </div>

        {/* ─── LIVE METRICS STRIP ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3 border border-slate-700/50">
            <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Total Cataloged</div>
            <div className="text-xl lg:text-2xl font-black text-white mt-1 flex items-baseline gap-2">
              {metrics.total}
              <span className="text-xs text-teal-400 font-semibold">{metrics.operationalRate}% Functional</span>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3 border border-slate-700/50">
            <div className="text-emerald-400 text-[11px] font-bold uppercase tracking-wider">Pristine / Good</div>
            <div className="text-xl lg:text-2xl font-black text-emerald-300 mt-1">
              {metrics.pristine + metrics.good}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3 border border-slate-700/50">
            <div className="text-amber-400 text-[11px] font-bold uppercase tracking-wider">Fair / Wear & Tear</div>
            <div className="text-xl lg:text-2xl font-black text-amber-300 mt-1">
              {metrics.fair}
            </div>
          </div>

          <div className="bg-rose-950/40 backdrop-blur-sm rounded-2xl p-3 border border-rose-800/40">
            <div className="text-rose-400 text-[11px] font-bold uppercase tracking-wider">Damaged / Missing</div>
            <div className="text-xl lg:text-2xl font-black text-rose-300 mt-1 flex items-baseline gap-1.5">
              {metrics.damaged + metrics.missing}
              <span className="text-xs font-semibold text-rose-400">
                (GH₵ {metrics.totalCautionDeductions.toFixed(0)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CAUTION DEPOSIT DEDUCTIONS ACCORDION BANNER ─── */}
      {metrics.totalCautionDeductions > 0 && (
        <div className="bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-transparent border border-rose-500/20 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Caution Deposit Deductions Active: GH₵ {metrics.totalCautionDeductions.toFixed(2)}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {metrics.damaged + metrics.missing} items are flagged as damaged or missing. These amounts can be automatically debited against tenant caution deposits upon Move-Out clearance.
              </p>
            </div>
          </div>

          <button
            onClick={() => handleSendWhatsAppSlip(selectedUnit === 'ALL' ? (roomUnitsList[0] || 'Unit') : selectedUnit)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all self-start md:self-auto"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Send WhatsApp Audit</span>
          </button>
        </div>
      )}

      {/* ─── CONTROL FILTER BAR ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search fixtures by name, brand, serial code, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        {/* Room Unit Pill Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedUnit('ALL')}
            className={clsx(
              'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
              selectedUnit === 'ALL'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            )}
          >
            All Units ({assets.length})
          </button>

          {roomUnitsList.map(unit => {
            const count = assets.filter(a => a.roomUnit === unit).length;
            return (
              <button
                key={unit}
                onClick={() => setSelectedUnit(unit)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5',
                  selectedUnit === unit
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                )}
              >
                <DoorClosed className="w-3 h-3" />
                {unit}
                <span className="text-[10px] opacity-75 font-normal">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Condition Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
          >
            <option value="ALL">All Conditions</option>
            <option value="PRISTINE">Pristine</option>
            <option value="GOOD">Good</option>
            <option value="FAIR">Fair (Wear & Tear)</option>
            <option value="DAMAGED">Damaged</option>
            <option value="MISSING">Missing</option>
          </select>
        </div>
      </div>

      {/* ─── QUICK SEED FOR EMPTY ROOMS ─── */}
      {selectedUnit !== 'ALL' && assets.filter(a => a.roomUnit === selectedUnit).length === 0 && (
        <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
            <Armchair className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            No assets registered yet for {selectedUnit}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Quickly populate this room with the standard Ghanaian student hostel fixture checklist (Ceiling Fan, Orthopedic Mattress, Study Desk, Chair, Lockset, Louvers, Submeter).
          </p>
          <button
            onClick={() => handleSeedRoom(selectedUnit)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            Seed Standard 7-Item Fixture Pack
          </button>
        </div>
      )}

      {/* ─── ASSETS DATA TABLE / CARDS ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredAssets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Armchair className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No matching assets or fixtures found
            </p>
            <p className="text-xs text-slate-400">
              Try adjusting your search keywords, condition filter, or register a new fixture.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4">Fixture / Asset</th>
                  <th className="py-3.5 px-4">Room Unit</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Tag / Serial</th>
                  <th className="py-3.5 px-4">Condition Status</th>
                  <th className="py-3.5 px-4">Repl. Value</th>
                  <th className="py-3.5 px-4">Notes / Remarks</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredAssets.map((asset) => {
                  const isDamaged = asset.condition === 'DAMAGED' || asset.condition === 'MISSING';
                  return (
                    <tr 
                      key={asset.id} 
                      className={clsx(
                        'hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors',
                        isDamaged && 'bg-rose-50/30 dark:bg-rose-950/10'
                      )}
                    >
                      {/* Name & Brand */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {asset.name}
                        </div>
                        {asset.brandModel && (
                          <div className="text-[11px] text-slate-400 font-medium">
                            {asset.brandModel}
                          </div>
                        )}
                      </td>

                      {/* Room Unit */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                          <DoorClosed className="w-3 h-3 text-teal-500" />
                          {asset.roomUnit}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          {asset.category.replace('_', ' & ')}
                        </span>
                      </td>

                      {/* Tag / Serial */}
                      <td className="py-3.5 px-4">
                        <code className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded text-slate-700 dark:text-teal-300">
                          {asset.serialTag || 'N/A'}
                        </code>
                      </td>

                      {/* Condition Status Dropdown */}
                      <td className="py-3.5 px-4">
                        <select
                          value={asset.condition}
                          onChange={(e) => handleQuickConditionChange(asset.id, e.target.value as AssetCondition)}
                          className={clsx(
                            'text-[11px] font-bold px-2.5 py-1 rounded-xl border focus:outline-none transition-all cursor-pointer',
                            asset.condition === 'PRISTINE' && 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
                            asset.condition === 'GOOD' && 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
                            asset.condition === 'FAIR' && 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
                            asset.condition === 'DAMAGED' && 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
                            asset.condition === 'MISSING' && 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800'
                          )}
                        >
                          <option value="PRISTINE">✨ Pristine</option>
                          <option value="GOOD">👍 Good</option>
                          <option value="FAIR">⚠️ Fair (Wear)</option>
                          <option value="DAMAGED">❌ Damaged</option>
                          <option value="MISSING">❓ Missing</option>
                        </select>
                      </td>

                      {/* Repl. Cost */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          GH₵ {asset.replacementCostGHS.toFixed(2)}
                        </div>
                        {isDamaged && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 font-black">
                            Deductible
                          </div>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {asset.notes || '—'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(asset)}
                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 rounded-lg transition-all"
                            title="Edit fixture details"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id, asset.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                            title="Delete fixture"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── ADD / EDIT ASSET MODAL ─── */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {isAddModalOpen ? 'Register New Fixture' : 'Edit Fixture Details'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedProperty?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1.5"
              >
                ✕
              </button>
            </div>

            <form onSubmit={isAddModalOpen ? handleCreateAsset : handleUpdateAsset} className="p-6 space-y-4">
              {/* Asset Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Fixture / Asset Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder='e.g. 56" Ceiling Fan, Orthopedic Mattress, Study Desk'
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Room Unit & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Room Unit
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                  >
                    {roomUnitsList.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as AssetCategory)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                  >
                    <option value="ELECTRICAL">Electrical (Fan/Meter/Lights)</option>
                    <option value="FURNITURE">Furniture (Bed/Desk/Chair)</option>
                    <option value="DOORS_WINDOWS">Doors & Louvers</option>
                    <option value="PLUMBING">Plumbing & Sanitary</option>
                    <option value="APPLIANCES">Appliances (AC/Fridge)</option>
                    <option value="KEYS_SECURITY">Keys & Deadbolts</option>
                  </select>
                </div>
              </div>

              {/* Brand/Model & Serial Tag */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Brand / Spec
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KDK / Ashfoam"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Asset Tag / Serial
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CF-01, MAT-102"
                    value={formSerial}
                    onChange={(e) => setFormSerial(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Condition & Replacement Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Condition State
                  </label>
                  <select
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value as AssetCondition)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                  >
                    <option value="PRISTINE">✨ Pristine</option>
                    <option value="GOOD">👍 Good</option>
                    <option value="FAIR">⚠️ Fair (Wear & Tear)</option>
                    <option value="DAMAGED">❌ Damaged</option>
                    <option value="MISSING">❓ Missing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Replacement Cost (GH₵)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white font-bold"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Condition Notes / Handover Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Minor scratches on surface; fan regulator dial clicks smoothly; 2 keys handed over."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all"
                >
                  {isAddModalOpen ? 'Save to Registry' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
