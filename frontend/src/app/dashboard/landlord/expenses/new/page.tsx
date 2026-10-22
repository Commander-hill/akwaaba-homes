'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import AlertBanner from '@/components/AlertBanner';
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Fuel,
  Droplet,
  Wrench,
  Receipt,
  CheckCircle2,
  Zap,
  FileText,
  Trash2,
  Upload,
  Loader2,
  Info,
  Sparkles,
  Check,
  MapPin,
} from 'lucide-react';

interface CategoryOption {
  id: string;
  label: string;
  shortLabel: string;
  icon: any;
  description: string;
  suggestions: string[];
}

const EXPENSE_CATEGORIES: CategoryOption[] = [
  {
    id: 'GENERATOR_FUEL',
    label: 'Generator Fuel & Standby Plant',
    shortLabel: 'Generator Fuel',
    icon: Fuel,
    description: 'Diesel, petrol, engine oil, or scheduled servicing for backup generator.',
    suggestions: [
      '50 Liters Diesel for Perkins Generator',
      'Generator routine engine oil & filter service',
      'Standby fuel jerrycans emergency reserve',
    ],
  },
  {
    id: 'WATER_SUPPLY',
    label: 'Water Tanker & Borehole Servicing',
    shortLabel: 'Water Supply',
    icon: Droplet,
    description: 'Ghana Water tanker deliveries, polytank sanitation, or submersible pump repairs.',
    suggestions: [
      '1,500 Gallon Water Tanker Refill',
      'Overhead polytank chemical wash & disinfection',
      'Borehole submersible pump capacitor replacement',
    ],
  },
  {
    id: 'MAINTENANCE_REPAIR',
    label: 'Repairs, Plumbing & Electrical',
    shortLabel: 'Repairs & Servicing',
    icon: Wrench,
    description: 'Fixing worn compound fixtures, corridor lights, repainting, or plumbing leaks.',
    suggestions: [
      'Plumbing: Replaced burst compound distribution pipe',
      'Electrical: Replaced compound floodlight bulbs',
      'AC Servicing: Chemical wash for room air conditioning',
    ],
  },
  {
    id: 'CLEANING_WASTE',
    label: 'Compound Sanitation & Waste Fee',
    shortLabel: 'Waste & Sanitation',
    icon: Sparkles,
    description: 'Zoomlion / Assembly refuse collection levy, compound fumigation, or septic emptying.',
    suggestions: [
      'Zoomlion Monthly Waste Collection Levy',
      'Septic tank vacuum truck emptying (Cesspool dislodger)',
      'Quarterly compound pest fumigation',
    ],
  },
  {
    id: 'SECURITY',
    label: 'Security Guards & CCTV Systems',
    shortLabel: 'Security',
    icon: CheckCircle2,
    description: 'Private security gatekeeper stipend, electric fence maintenance, or CCTV servicing.',
    suggestions: [
      'Compound security guard monthly stipend',
      'Electric security fence battery & energizer servicing',
      'CCTV DVR hard drive replacement',
    ],
  },
  {
    id: 'UTILITIES',
    label: 'Compound Meter Electricity (ECG)',
    shortLabel: 'ECG Compound Meter',
    icon: Zap,
    description: 'ECG prepaid tokens for shared water pumps, corridor lighting, and automated gates.',
    suggestions: [
      'ECG Prepaid Top-up for Common Area Pumping Meter',
      'Compound security floodlights power credit',
      'Automated gate motor meter credit',
    ],
  },
  {
    id: 'TAX_FEES',
    label: 'Municipal Assembly Rates & Ground Rent',
    shortLabel: 'Property Rates & Permits',
    icon: FileText,
    description: 'Metropolitan assembly property rates (KMA/AMA), ground rent, or building permits.',
    suggestions: [
      'Annual Municipal Assembly Property Rate Levy',
      'Lands Commission Annual Ground Rent',
      'Fire Service premises compliance certificate fee',
    ],
  },
  {
    id: 'OTHER',
    label: 'Miscellaneous Operating Overhead',
    shortLabel: 'Miscellaneous',
    icon: Receipt,
    description: 'Other verified operating expenses incurred for property management.',
    suggestions: [
      'Compound gardening & lawn mower servicing',
      'Caretaker monthly administrative allowance',
      'Emergency locksmith compound lock change',
    ],
  },
];

export default function NewExpensePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('GENERATOR_FUEL');
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
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

  useEffect(() => {
    if (!selectedPropertyId && propertyList.length > 0) {
      setSelectedPropertyId(propertyList[0].id);
    }
  }, [propertyList, selectedPropertyId]);

  const activeProperty = propertyList.find((p: any) => p.id === selectedPropertyId);
  const currentCategory = EXPENSE_CATEGORIES.find((c) => c.id === selectedCategory) || EXPENSE_CATEGORIES[0];
  const parsedAmount = parseFloat(amount) || 0;

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

  const validateStep = (step: number): boolean => {
    setFormError('');
    if (step === 1) {
      if (!selectedPropertyId) {
        triggerError('Please select a target property from your portfolio.');
        return false;
      }
    }
    if (step === 2) {
      if (!selectedCategory) {
        triggerError('Please select an expense category.');
        return false;
      }
    }
    if (step === 3) {
      if (!title.trim()) {
        triggerError('Please enter an expense title or item description.');
        return false;
      }
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        triggerError('Please enter a valid positive amount in Ghana Cedis (GH₵).');
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

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Please upload an image (JPG, PNG, WebP) or PDF invoice.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Receipt file size must be less than 15MB.');
      return;
    }

    if (file.type.startsWith('image/')) {
      const localUrl = URL.createObjectURL(file);
      setReceiptPreview(localUrl);
    } else {
      setReceiptPreview(null);
    }

    setIsUploadingReceipt(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/upload/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl = res.data?.url;
      if (uploadedUrl) {
        setReceiptUrl(uploadedUrl);
        toast.success('Receipt attached successfully!');
      }
    } catch {
      try {
        const fallbackForm = new FormData();
        fallbackForm.append('document', file);
        const res = await api.post('/upload/document', fallbackForm, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const fallbackUrl = res.data?.url || res.data?.documentUrl;
        if (fallbackUrl) {
          setReceiptUrl(fallbackUrl);
          toast.success('Receipt attached successfully!');
        }
      } catch {
        toast.error('Failed to upload receipt file. You can still save the expense details.');
      }
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const createExpenseMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/expenses', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Operating expense logged & ledger updated!');
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expensesAnalytics'] });
      router.push('/dashboard/landlord?tab=expenses');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to log operating expense';
      triggerError(msg);
    },
  });

  const handleSubmit = () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    createExpenseMutation.mutate({
      propertyId: selectedPropertyId,
      category: selectedCategory,
      title: title.trim(),
      amount: parsedAmount,
      date,
      receiptUrl,
      notes: notes.trim() || null,
    });
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      {/* ── HEADER & 4-STEP SEGMENTED BAR ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard/landlord?tab=expenses"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Expenses &amp; P&amp;L
            </Link>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Log Property Operating Expense
            </h1>
          </div>
        </div>

        {/* 4-Step Segmented Bar (Matches List Property Page) */}
        <div className="grid grid-cols-4 gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
          {[
            { step: 1, label: '1. Target Property' },
            { step: 2, label: '2. Expense Category' },
            { step: 3, label: '3. Amount & Details' },
            { step: 4, label: '4. Receipt & Review' },
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
          STEP 1: TARGET PROPERTY SELECTION
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                Step 1: Target Property Selection
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Choose the hostel or residential building this expenditure applies to.
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
                  className="inline-flex items-center gap-1.5 text-[#16A34A] hover:text-[#15803D] dark:text-emerald-400 font-bold underline"
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
              <span>Next: Expense Category</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 2: EXPENSE CATEGORY CLASSIFICATION
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 2: Expense Category Classification
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select the operating cost classification for P&amp;L and GRA Act 896 tax accounting.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EXPENSE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={clsx(
                    'text-left p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3',
                    isSelected
                      ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40'
                  )}
                >
                  <div
                    className={clsx(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                      isSelected
                        ? 'bg-[#0F5132] text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-zinc-950 dark:text-white truncate">{cat.label}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{cat.description}</p>
                  </div>
                </button>
              );
            })}
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
              <span>Next: Amount &amp; Details</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 3: EXPENSE TITLE, AMOUNT & DATE
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 3: Expense Particulars &amp; Amount
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Enter the voucher description, amount in Ghana Cedis (GH₵), and date incurred.
            </p>
          </div>

          <div className="space-y-4">
            {/* Quick-Fill Suggestions for Selected Category */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                Quick-Fill {currentCategory.shortLabel} Descriptions (Click to Apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {currentCategory.suggestions.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTitle(sug)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-50 hover:bg-emerald-50/50 dark:bg-zinc-900 dark:hover:bg-emerald-950/20 border border-zinc-200 dark:border-zinc-800 hover:border-[#0F5132]/40 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    + {sug}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Expense Title / Voucher Description *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 50 Liters Diesel for Perkins Standby Generator"
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Expenditure Amount (GH₵) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 450.00"
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Date Incurred *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Vendor / Artisan Reference Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Vendor name, MoMo transaction reference, artisan contact phone, or warranty notes..."
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl p-3.5 text-xs font-medium text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
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
              <span>Next: Receipt &amp; Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 4: RECEIPT EVIDENCE & EXPENSE SUMMARY
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 4: Receipt Evidence &amp; Review
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Attach an optional vendor receipt or invoice and review the voucher before posting to your P&amp;L ledger.
            </p>
          </div>

          <div className="space-y-4">
            {/* Receipt Upload */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                Supporting Receipt / VAT Invoice (Optional, Max 15MB)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleReceiptUpload}
                className="hidden"
              />

              {receiptUrl || receiptPreview ? (
                <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {receiptPreview ? (
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="w-14 h-14 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#0F5132] text-white flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                        Receipt Attached
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                        {receiptUrl || 'Local preview ready'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptUrl(null);
                      setReceiptPreview(null);
                    }}
                    className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingReceipt}
                  className="w-full border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-[#0F5132] rounded-xl p-6 text-center bg-zinc-50 dark:bg-zinc-800/30 transition-colors cursor-pointer flex flex-col items-center justify-center gap-1.5"
                >
                  {isUploadingReceipt ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-[#0F5132]" />
                      <span className="text-xs font-bold text-[#0F5132]">Uploading receipt document...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-zinc-400" />
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        Click to Upload Receipt Photo or PDF Invoice
                      </span>
                      <span className="text-[10px] text-zinc-400">Supports JPG, PNG, WebP, or PDF</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                Under the Ghana Income Tax Act, 2015 (Act 896), verified operating expenses incurred wholly and
                exclusively in maintaining rental premises are deductible from gross rental income.
              </div>
            </div>

            {/* Horizontal Voucher Summary Box (Matches Publication Summary on List Property Page) */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                Expense Voucher Summary
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
                    {currentCategory.shortLabel}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Amount</span>
                  <span className="font-bold text-[#0F5132] dark:text-emerald-400">
                    GH₵ {parsedAmount.toLocaleString('en-GH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Date Incurred</span>
                  <span className="font-bold text-zinc-900 dark:text-white">{date}</span>
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
              disabled={createExpenseMutation.isPending}
              className="px-6 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {createExpenseMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Post Expense Voucher</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
