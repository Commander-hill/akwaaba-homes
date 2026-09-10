'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Armchair, Search, CheckCircle2, AlertTriangle, FileText, 
  Printer, ShieldCheck, Check, DoorClosed, MessageSquare 
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface BookingData {
  id: string;
  property?: {
    id: string;
    title: string;
    location: string;
    cautionDeposit?: number;
    landlord?: {
      firstName: string;
      lastName: string;
      phoneNumber: string;
    };
  };
  roomUnit?: {
    unitNumber: string;
  };
  startDate: string;
  endDate: string;
  status: string;
}

interface TenantAssetInventoryTabProps {
  bookings: BookingData[];
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  serialTag?: string;
  condition: 'PRISTINE' | 'GOOD' | 'FAIR' | 'DAMAGED';
  replacementCostGHS: number;
  notes?: string;
  residentConfirmed?: boolean;
}

const DEFAULT_RESIDENTIAL_FIXTURES: InventoryItem[] = [
  {
    id: 'inv-1',
    name: '56" Heavy-Duty Ceiling Fan',
    category: 'Electrical',
    serialTag: 'CF-01',
    condition: 'PRISTINE',
    replacementCostGHS: 650,
    notes: 'Rotates smoothly, 5-speed wall regulator operational.'
  },
  {
    id: 'inv-2',
    name: 'High-Density Orthopedic Mattress 3.5x6ft',
    category: 'Furnishing',
    serialTag: 'MAT-01',
    condition: 'PRISTINE',
    replacementCostGHS: 1200,
    notes: 'Waterproof protective casing intact, zero stains.'
  },
  {
    id: 'inv-3',
    name: 'Study Desk & Ergonomic Chair',
    category: 'Furnishing',
    serialTag: 'DSK-01',
    condition: 'GOOD',
    replacementCostGHS: 950,
    notes: 'Hardwood surface clean; 1 drawer key supplied.'
  },
  {
    id: 'inv-4',
    name: 'Aluminum Louver Blades & Mosquito Mesh (12 Blades)',
    category: 'Windows & Doors',
    serialTag: 'LV-01',
    condition: 'PRISTINE',
    replacementCostGHS: 420,
    notes: 'All 12 glass blades intact, wire netting tight.'
  },
  {
    id: 'inv-5',
    name: 'Mortise Deadbolt Lockset & 2 Brass Keys',
    category: 'Keys & Security',
    serialTag: 'LCK-01',
    condition: 'PRISTINE',
    replacementCostGHS: 280,
    notes: 'Smooth cylinder action; both original keys tested.'
  },
  {
    id: 'inv-6',
    name: 'Bathroom Tap Mixer & Shower Head',
    category: 'Plumbing',
    serialTag: 'PLM-01',
    condition: 'GOOD',
    replacementCostGHS: 350,
    notes: 'Water pressure stable, zero dripping.'
  },
  {
    id: 'inv-7',
    name: 'Pre-paid Electricity Submeter Box',
    category: 'Electrical',
    serialTag: 'MTR-01',
    condition: 'GOOD',
    replacementCostGHS: 900,
    notes: 'Calibrated, tamper seal unbroken.'
  }
];

export default function TenantAssetInventoryTab({ bookings }: TenantAssetInventoryTabProps) {
  const activeBooking = bookings?.find(b => b.status === 'CONFIRMED' || b.status === 'ACTIVE') || bookings?.[0];
  const propertyId = activeBooking?.property?.id || 'demo';
  const unitNumber = activeBooking?.roomUnit?.unitNumber || 'Main Unit';
  const cautionDeposit = activeBooking?.property?.cautionDeposit || 500;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [residentNotes, setResidentNotes] = useState<string>('');
  const [isSigned, setIsSigned] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load from property inventory or defaults
  useEffect(() => {
    const landlordStorageKey = `akwaaba_room_assets_${propertyId}`;
    const savedLandlord = localStorage.getItem(landlordStorageKey);
    let loadedItems = DEFAULT_RESIDENTIAL_FIXTURES;

    if (savedLandlord) {
      try {
        const parsed = JSON.parse(savedLandlord);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const unitMatches = parsed.filter((a: any) => !a.roomUnit || a.roomUnit === unitNumber);
          if (unitMatches.length > 0) {
            loadedItems = unitMatches.map((a: any) => ({
              id: a.id,
              name: a.name,
              category: a.category || 'Fixtures',
              serialTag: a.serialTag,
              condition: a.condition || 'GOOD',
              replacementCostGHS: a.replacementCostGHS || 300,
              notes: a.notes,
              residentConfirmed: true
            }));
          }
        }
      } catch (e) {
        console.error('Failed to parse landlord assets', e);
      }
    }

    setItems(loadedItems);

    // Load signoff state
    const signoffKey = `tenant_inventory_signoff_${propertyId}_${unitNumber}`;
    const savedSignoff = localStorage.getItem(signoffKey);
    if (savedSignoff) {
      setIsSigned(true);
      setResidentNotes(savedSignoff);
    }
  }, [propertyId, unitNumber]);

  const handleDigitalSignoff = (e: React.FormEvent) => {
    e.preventDefault();
    const signoffKey = `tenant_inventory_signoff_${propertyId}_${unitNumber}`;
    localStorage.setItem(signoffKey, residentNotes || 'Verified & Confirmed');
    setIsSigned(true);
    toast.success('Move-In Fixture Inventory officially signed and verified!');
  };

  // WhatsApp verification slip
  const handleShareWhatsAppSignoff = () => {
    const landlordPhone = activeBooking?.property?.landlord?.phoneNumber || '+233240000000';
    let text = `📋 *MOVE-IN FIXTURE INVENTORY SIGN-OFF*\n`;
    text += `🏢 *Property:* ${activeBooking?.property?.title || 'Residential Unit'}\n`;
    text += `🚪 *Unit:* ${unitNumber}\n`;
    text += `📅 *Inspection Date:* ${new Date().toLocaleDateString('en-GB')}\n\n`;
    text += `*Verified Fixtures & Appliances:*\n`;
    items.forEach((item, idx) => {
      text += `${idx + 1}. ${item.name} (${item.condition}) - Tag: ${item.serialTag || 'N/A'}\n`;
    });
    if (residentNotes) {
      text += `\n📝 *Resident Observation Notes:*\n${residentNotes}\n`;
    }
    text += `\n✅ _Move-In condition verified and acknowledged by resident._`;

    const url = `https://wa.me/${landlordPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.serialTag || '').toLowerCase().includes(q)
      );
    });
  }, [items, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ─── HERO BANNER ─── */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-zinc-950 rounded-3xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden border border-teal-800/30">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider border border-teal-500/30">
              <Armchair className="w-3.5 h-3.5" />
              Move-In Fixture &amp; Asset Vault
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
              Unit Fixture Registry &amp; Caution Protection
            </h2>
            <p className="text-slate-300 text-sm max-w-xl">
              Verify all furniture, ceiling fans, ACs, mortise locksets, and utility submeters in <strong>{unitNumber}</strong>. 
              Digitally signing off on move-in day prevents unfair deductions from your caution deposit upon move-out.
            </p>
          </div>

          {/* Sign-off Status Pill */}
          <div className={clsx(
            'px-5 py-4 rounded-2xl border flex items-center gap-4 backdrop-blur-md shadow-lg',
            isSigned 
              ? 'bg-emerald-900/40 border-emerald-500/40 text-emerald-300' 
              : 'bg-amber-900/40 border-amber-500/40 text-amber-300'
          )}>
            <div className={clsx(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
              isSigned ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            )}>
              {isSigned ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-80">Checklist Standing</div>
              <div className="text-base font-black">
                {isSigned ? 'Move-In Signed & Protected ✅' : 'Awaiting Resident Sign-Off'}
              </div>
              <div className="text-[11px] opacity-75">
                {isSigned ? 'Caution deposit secured' : 'Confirm fixtures to protect deposit'}
              </div>
            </div>
          </div>
        </div>

        {/* ─── METRIC CARDS ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3 border border-slate-700/50">
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Cataloged Fixtures</div>
            <div className="text-lg lg:text-xl font-black text-white mt-1">
              {items.length} Items Listed
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3 border border-slate-700/50">
            <div className="text-teal-400 text-[10px] font-bold uppercase tracking-wider">Pristine / Good</div>
            <div className="text-lg lg:text-xl font-black text-teal-300 mt-1">
              {items.filter(i => i.condition === 'PRISTINE' || i.condition === 'GOOD').length} / {items.length}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3 border border-slate-700/50">
            <div className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">Caution Deposit Safeguarded</div>
            <div className="text-lg lg:text-xl font-black text-blue-300 mt-1">
              GH₵ {cautionDeposit.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* ─── CONTROLS & PRINT ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search fixtures, appliances, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => window.print()}
            className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Checklist</span>
          </button>

          <button
            onClick={handleShareWhatsAppSignoff}
            className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp Landlord</span>
          </button>
        </div>
      </div>

      {/* ─── FIXTURES TABLE ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-4">Fixture / Appliance</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Tag / Serial</th>
                <th className="py-3 px-4">Condition Status</th>
                <th className="py-3 px-4">Notes &amp; Observations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4">
                    <div className="font-extrabold text-slate-900 dark:text-white">
                      {item.name}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {item.category}
                  </td>
                  <td className="py-3.5 px-4">
                    <code className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-teal-300">
                      {item.serialTag || 'N/A'}
                    </code>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={clsx(
                      'inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border',
                      item.condition === 'PRISTINE' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
                      item.condition === 'GOOD' && 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
                      item.condition === 'FAIR' && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
                      item.condition === 'DAMAGED' && 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400'
                    )}>
                      {item.condition === 'PRISTINE' && '✨ Pristine'}
                      {item.condition === 'GOOD' && '👍 Good'}
                      {item.condition === 'FAIR' && '⚠️ Fair'}
                      {item.condition === 'DAMAGED' && '❌ Damaged'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 text-[11px]">
                    {item.notes || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── DIGITAL SIGN-OFF CARD ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
            Resident Move-In Inventory Sign-Off &amp; Pre-Existing Flaw Notes
          </h3>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Record any pre-existing scratches, paint chips, or observed wear &amp; tear below so you are never charged for prior tenant usage when your lease concludes.
        </p>

        <form onSubmit={handleDigitalSignoff} className="space-y-3">
          <textarea
            rows={3}
            placeholder="e.g. Verified 2 brass keys received; fan wall regulator operates normally; small scratch noted behind bedroom door."
            value={residentNotes}
            onChange={(e) => setResidentNotes(e.target.value)}
            disabled={isSigned}
            className="w-full text-xs p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-teal-500 text-slate-900 dark:text-white disabled:opacity-75"
          />

          <div className="flex items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400 font-medium">
              Signed by Resident • Timestamped locally for Move-Out comparison
            </span>

            <button
              type="submit"
              disabled={isSigned}
              className={clsx(
                'px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition cursor-pointer',
                isSigned 
                  ? 'bg-emerald-600 text-white cursor-default' 
                  : 'bg-teal-600 hover:bg-teal-700 text-white'
              )}
            >
              {isSigned ? (
                <>
                  <Check className="w-4 h-4" /> Move-In Sign-Off Completed
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Sign &amp; Lock Move-In Checklist
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
