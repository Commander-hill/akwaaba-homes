'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  Lock,
  Sparkles,
  Wrench,
  ArrowRight,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';

interface AssetItem {
  id: string;
  category: 'Electrical' | 'Furniture' | 'Plumbing' | 'Structural';
  name: string;
  landlordCondition: 'EXCELLENT' | 'GOOD' | 'FAIR';
  tenantVerified: boolean;
  flaggedDefect: boolean;
  defectNotes?: string;
}

export default function TenantAssetInventoryTab({
  propertyId: propPropertyId,
  propertyTitle: propPropertyTitle,
  cautionDeposit: propCautionDeposit,
  bookings = [],
}: {
  propertyId?: string;
  propertyTitle?: string;
  cautionDeposit?: number;
  bookings?: any[];
}) {
  const activeBooking = bookings.find((b: any) => !['CANCELLED', 'REJECTED'].includes(b.status));
  const propertyId = propPropertyId || activeBooking?.propertyId || activeBooking?.property?.id;
  const propertyTitle = propPropertyTitle || activeBooking?.property?.title;
  const cautionDeposit = propCautionDeposit ?? activeBooking?.property?.cautionDeposit ?? 0;

  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [ledgerLocked, setLedgerLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newFixtureName, setNewFixtureName] = useState('');
  const [newFixtureCategory, setNewFixtureCategory] = useState<AssetItem['category']>('Furniture');

  const hasValidProperty = Boolean(propertyId && propertyId !== 'demo');

  useEffect(() => {
    if (!hasValidProperty) return;
    setIsLoading(true);
    api
      .get(`/inspections/property/${propertyId}`)
      .then((res) => {
        const inspections = res.data?.inspections || [];
        if (inspections.length > 0) {
          const latest = inspections[0];
          setInspectionId(latest.id);
          if (Array.isArray(latest.checklist) && latest.checklist.length > 0) {
            setAssets(latest.checklist);
          }
          if (latest.tenantSigned) {
            setLedgerLocked(true);
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [propertyId, hasValidProperty]);

  if (!hasValidProperty) {
    return (
      <div className="bg-white dark:bg-[#12151E] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-10 text-center space-y-4 shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
          <ClipboardCheck className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-base font-bold text-zinc-950 dark:text-white">
            Move-In Condition Inventory Unavailable
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Once you have an active or approved booking, you can record and sign off on your room&apos;s fixture conditions here to protect your refundable caution deposit.
          </p>
        </div>
        <Link
          href="/properties"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-colors"
        >
          <span>Explore Accommodations</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  const syncWithBackend = async (updatedAssets: AssetItem[], lock: boolean = ledgerLocked) => {
    try {
      if (inspectionId) {
        await api.put(`/inspections/${inspectionId}/sign`, {
          checklist: updatedAssets,
          overallNotes: lock
            ? 'Signed & locked by resident for caution deposit protection'
            : 'Draft update by resident',
        });
      } else {
        const res = await api.post('/inspections', {
          propertyId,
          type: 'MOVE_IN',
          checklist: updatedAssets,
          overallNotes: 'Initial move-in condition audit logged by resident',
        });
        if (res.data?.inspection?.id) {
          setInspectionId(res.data.inspection.id);
        }
      }
    } catch {
      // non-blocking
    }
  };

  const handleAddFixture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFixtureName.trim() || ledgerLocked) return;
    const item: AssetItem = {
      id: `item-${Date.now()}`,
      category: newFixtureCategory,
      name: newFixtureName.trim(),
      landlordCondition: 'GOOD',
      tenantVerified: true,
      flaggedDefect: false,
    };
    const updated = [...assets, item];
    setAssets(updated);
    setNewFixtureName('');
    syncWithBackend(updated);
    toast.success('Fixture added to move-in inspection checklist.');
  };

  const handleVerifyGood = (id: string) => {
    if (ledgerLocked) return;
    const updated = assets.map((a) =>
      a.id === id ? { ...a, tenantVerified: true, flaggedDefect: false, defectNotes: undefined } : a
    );
    setAssets(updated);
    syncWithBackend(updated);
    toast.success('Fixture condition confirmed');
  };

  const handleSaveDefect = (id: string) => {
    if (!noteDraft.trim()) {
      toast.error('Please describe the pre-existing defect.');
      return;
    }
    const updated = assets.map((a) =>
      a.id === id
        ? { ...a, tenantVerified: true, flaggedDefect: true, defectNotes: noteDraft.trim() }
        : a
    );
    setAssets(updated);
    setActiveNoteId(null);
    setNoteDraft('');
    syncWithBackend(updated);
    toast.success('Pre-existing defect recorded.');
  };

  const verifiedCount = assets.filter((a) => a.tenantVerified).length;
  const allVerified = assets.length > 0 && verifiedCount === assets.length;

  const handleLockLedger = async () => {
    if (!allVerified) {
      toast.error('Please verify or log notes for all listed room fixtures before signing.');
      return;
    }
    setLedgerLocked(true);
    await syncWithBackend(assets, true);
    toast.success('Move-in condition audit signed and locked.');
  };

  return (
    <div className="bg-white dark:bg-[#12151E] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-2xs">
      {/* Header */}
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold uppercase tracking-wider mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Move-In Condition Audit</span>
          </div>
          <h3 className="text-lg font-bold text-zinc-950 dark:text-white">
            {propertyTitle || 'Room & Fixture Condition Checklist'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Document the move-in state of your room fixtures so you are never charged for pre-existing wear at move-out.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shrink-0">
          <span className="text-[10px] font-mono uppercase text-zinc-400 block">Caution Deposit</span>
          <span className="text-sm font-mono font-extrabold text-zinc-950 dark:text-white">
            GH₵ {Number(cautionDeposit || 0).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Add Fixture Form (when not locked) */}
        {!ledgerLocked && (
          <form onSubmit={handleAddFixture} className="flex flex-col sm:flex-row gap-2.5">
            <select
              value={newFixtureCategory}
              onChange={(e) => setNewFixtureCategory(e.target.value as AssetItem['category'])}
              aria-label="Fixture Category"
              className="px-3 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-900 dark:text-white"
            >
              <option value="Furniture">Furniture</option>
              <option value="Electrical">Electrical</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Structural">Structural</option>
            </select>
            <input
              type="text"
              value={newFixtureName}
              onChange={(e) => setNewFixtureName(e.target.value)}
              placeholder="Add room item to inspect (e.g., Ceiling Fan, Wardrobe, Washbasin)..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-[#16A34A]"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </form>
        )}

        {isLoading ? (
          <div className="py-10 text-center text-xs text-zinc-500">Loading move-in inspection records...</div>
        ) : assets.length === 0 ? (
          <div className="p-8 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/80 dark:border-zinc-800 text-center space-y-2">
            <ClipboardCheck className="w-8 h-8 text-zinc-400 mx-auto" />
            <p className="text-xs font-bold text-zinc-900 dark:text-white">
              No inspection items recorded yet
            </p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Use the field above to record the condition of fixtures in your room during move-in, or wait for your caretaker to publish the move-in checklist.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className={`p-4 rounded-xl border transition-all ${
                  asset.flaggedDefect
                    ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                    : asset.tenantVerified
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/50'
                    : 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold uppercase">
                        {asset.category}
                      </span>
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{asset.name}</h4>
                    </div>
                    {asset.flaggedDefect && asset.defectNotes && (
                      <p className="text-xs text-amber-800 dark:text-amber-300 mt-1.5">
                        Note: &ldquo;{asset.defectNotes}&rdquo;
                      </p>
                    )}
                  </div>

                  {!ledgerLocked && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleVerifyGood(asset.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                          asset.tenantVerified && !asset.flaggedDefect
                            ? 'bg-[#16A34A] text-white'
                            : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Good Condition</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveNoteId(asset.id);
                          setNoteDraft(asset.defectNotes || '');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                          asset.flaggedDefect
                            ? 'bg-amber-600 text-white'
                            : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Log Defect</span>
                      </button>
                    </div>
                  )}
                </div>

                {activeNoteId === asset.id && !ledgerLocked && (
                  <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="Describe existing scratch, fault, or wear..."
                      className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-900 dark:text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveDefect(asset.id)}
                        className="px-3.5 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold cursor-pointer"
                      >
                        Save Note
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveNoteId(null)}
                        className="px-3 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Sign & Lock Footer */}
        {assets.length > 0 && (
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-zinc-500">
              {ledgerLocked
                ? 'Signed and locked for your current tenancy.'
                : `${verifiedCount} of ${assets.length} item(s) verified.`}
            </p>
            {ledgerLocked ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                <Lock className="w-3.5 h-3.5" />
                <span>Move-In Report Signed</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleLockLedger}
                disabled={!allVerified}
                className="px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Sign &amp; Lock Move-In Report</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
