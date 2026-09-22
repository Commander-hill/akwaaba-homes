'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { 
  DollarSign, 
  ArrowLeft, 
  Building, 
  Fuel, 
  Droplet, 
  Wrench, 
  Receipt, 
  ShieldCheck, 
  Zap, 
  FileText, 
  Trash2, 
  Upload, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Info,
  Calendar,
  Sparkles,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

interface CategoryOption {
  id: string;
  label: string;
  shortLabel: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  suggestions: string[];
}

const EXPENSE_CATEGORIES: CategoryOption[] = [
  {
    id: 'GENERATOR_FUEL',
    label: 'Generator Fuel & Standby Plant',
    shortLabel: 'Generator Fuel',
    icon: Fuel,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    borderColor: 'border-amber-200 dark:border-amber-800',
    description: 'Diesel, petrol, engine oil, or scheduled servicing for backup generator.',
    suggestions: [
      '50 Liters Diesel for Perkins Generator',
      'Generator routine engine oil & filter service',
      'Standby fuel jerrycans emergency reserve'
    ]
  },
  {
    id: 'WATER_SUPPLY',
    label: 'Water Tanker & Borehole Servicing',
    shortLabel: 'Water Supply',
    icon: Droplet,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'Ghana Water tanker deliveries, polytank sanitation, or submersible pump repairs.',
    suggestions: [
      '1,500 Gallon Water Tanker Refill',
      'Overhead polytank chemical wash & disinfection',
      'Borehole submersible pump capacitor replacement'
    ]
  },
  {
    id: 'MAINTENANCE_REPAIR',
    label: 'Repairs, Plumbing & Electrical',
    shortLabel: 'Repairs & Servicing',
    icon: Wrench,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    description: 'Fixing worn compound fixtures, corridor lights, repainting, or plumbing leaks.',
    suggestions: [
      'Plumbing: Replaced burst compound distribution pipe',
      'Electrical: Replaced compound floodlight bulbs',
      'AC Servicing: Chemical wash for room air conditioning'
    ]
  },
  {
    id: 'CLEANING_WASTE',
    label: 'Compound Sanitation & Waste Fee',
    shortLabel: 'Waste & Sanitation',
    icon: Sparkles,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-950/40',
    borderColor: 'border-teal-200 dark:border-teal-800',
    description: 'Zoomlion / Assembly refuse collection levy, compound fumigation, or septic emptying.',
    suggestions: [
      'Zoomlion Monthly Waste Collection Levy',
      'Septic tank vacuum truck emptying (Cesspool dislodger)',
      'Quarterly compound pest fumigation'
    ]
  },
  {
    id: 'SECURITY',
    label: 'Security Guards & CCTV Systems',
    shortLabel: 'Security',
    icon: ShieldCheck,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    description: 'Private security gatekeeper stipend, electric fence maintenance, or CCTV maintenance.',
    suggestions: [
      'Compound security guard monthly stipend',
      'Electric security fence battery & energizer servicing',
      'CCTV DVR hard drive replacement'
    ]
  },
  {
    id: 'UTILITIES',
    label: 'Compound Meter Electricity (ECG)',
    shortLabel: 'ECG Compound Meter',
    icon: Zap,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/40',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    description: 'ECG prepaid tokens for shared water pumps, corridor lighting, and automated gates.',
    suggestions: [
      'ECG Prepaid Top-up for Common Area Pumping Meter',
      'Compound security floodlights power credit',
      'Automated gate motor meter credit'
    ]
  },
  {
    id: 'TAX_FEES',
    label: 'Municipal Assembly Rates & Ground Rent',
    shortLabel: 'Property Rates & Permits',
    icon: FileText,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    borderColor: 'border-purple-200 dark:border-purple-800',
    description: 'Metropolitan assembly property rates (KMA/AMA), ground rent, or building permits.',
    suggestions: [
      'Annual Municipal Assembly Property Rate Levy',
      'Lands Commission Annual Ground Rent',
      'Fire Service premises compliance certificate fee'
    ]
  },
  {
    id: 'OTHER',
    label: 'Miscellaneous Operating Overhead',
    shortLabel: 'Miscellaneous',
    icon: Receipt,
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-50 dark:bg-slate-900',
    borderColor: 'border-slate-200 dark:border-slate-800',
    description: 'Other verified operating expenses incurred for property management.',
    suggestions: [
      'Compound gardening & lawn mower servicing',
      'Caretaker monthly administrative allowance',
      'Emergency locksmith compound lock change'
    ]
  }
];

export default function NewExpensePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('GENERATOR_FUEL');
  const [title, setTitle] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
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
    }
  });

  const propertyList = (propertiesData || []).map((p: any) => ({
    id: p.id || p.propertyId,
    title: p.title || p.propertyTitle || 'Property',
    location: p.location || p.propertyLocation || 'Ghana',
    type: p.type || 'Hostel/Apartment'
  })).filter((p: any) => Boolean(p.id));

  // Auto-select first property if unselected
  useEffect(() => {
    if (!selectedPropertyId && propertyList.length > 0) {
      setSelectedPropertyId(propertyList[0].id);
    }
  }, [propertyList, selectedPropertyId]);

  const activeProperty = propertyList.find((p: any) => p.id === selectedPropertyId);
  const currentCategory = EXPENSE_CATEGORIES.find(c => c.id === selectedCategory) || EXPENSE_CATEGORIES[0];

  // Handle Receipt Upload
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
        headers: { 'Content-Type': 'multipart/form-data' }
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
          headers: { 'Content-Type': 'multipart/form-data' }
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
      setFormError(msg);
      toast.error(msg);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedPropertyId) {
      setFormError('Please select a property from your portfolio.');
      toast.error('Please select a property.');
      return;
    }

    if (!title.trim()) {
      setFormError('Please enter an expense title or item description.');
      toast.error('Expense title is required.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid expense amount in Ghana Cedis (GH₵).');
      toast.error('Valid positive amount is required.');
      return;
    }

    createExpenseMutation.mutate({
      propertyId: selectedPropertyId,
      category: selectedCategory,
      title: title.trim(),
      amount: parsedAmount,
      date,
      receiptUrl,
      notes: notes.trim() || null
    });
  };

  const parsedAmount = parseFloat(amount) || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/landlord?tab=expenses"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Return to Expenses Ledger"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Link href="/dashboard/landlord" className="hover:underline">Dashboard</Link>
                <span>/</span>
                <Link href="/dashboard/landlord?tab=expenses" className="hover:underline">Expenses & P&L</Link>
                <span>/</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">Log Expense</span>
              </div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Log Property Operating Expense
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-[#0F5132] dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              GRA Act 896 Tax Deductible
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2-Columns: Comprehensive Expense Form */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Form Error Banner */}
              {formError && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-start gap-3 animate-in">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="font-semibold">{formError}</div>
                </div>
              )}

              {/* 1. Property Portfolio Selection Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center font-bold">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        1. Select Rental Property
                      </h2>
                      <p className="text-xs text-slate-500">
                        Choose the hostel or residential building this expenditure applies to
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {propertyList.length} {propertyList.length === 1 ? 'property' : 'properties'} registered
                  </span>
                </div>

                {isLoadingProps ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading your properties...
                  </div>
                ) : propertyList.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                    <p className="font-bold">No active properties found under your landlord account.</p>
                    <p>Please register and publish a property first before logging operating expenses.</p>
                    <Link
                      href="/dashboard/landlord/properties/new"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition"
                    >
                      Add New Property
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {propertyList.map((prop: any) => {
                      const isSelected = selectedPropertyId === prop.id;
                      return (
                        <button
                          key={prop.id}
                          type="button"
                          onClick={() => setSelectedPropertyId(prop.id)}
                          className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                            isSelected
                              ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {prop.title}
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                            📍 {prop.location}
                          </div>
                          <div className="mt-2 inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {prop.type}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Expense Category Classification */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      2. Expense Classification
                    </h2>
                    <p className="text-xs text-slate-500">
                      Standard Ghanaian residential and hostel operating overhead categories
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    const IconComponent = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#0F5132] bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-[#0F5132]'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className={`p-2 rounded-xl ${cat.bgColor} ${cat.color}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-[#0F5132]" />}
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900 dark:text-white">
                            {cat.shortLabel}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {cat.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Suggestions chip row */}
                {currentCategory.suggestions.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      💡 Common {currentCategory.shortLabel} Entries (Click to auto-fill title):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {currentCategory.suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setTitle(suggestion)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors text-left"
                        >
                          + {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Financial & Item Details */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      3. Expenditure Specifics & Ledger Entry
                    </h2>
                    <p className="text-xs text-slate-500">
                      Amount, transaction date, and narrative details
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Amount (GHS) */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                      Amount Incurred (GH₵) *
                    </label>
                    <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-[#0F5132]">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
                        GH₵
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-14 pr-4 py-3 bg-transparent text-lg font-black text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                        required
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Include VAT / NHIL if itemized on the receipt
                    </span>
                  </div>

                  {/* Date Incurred */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                      Transaction Date *
                    </label>
                    <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-[#0F5132]">
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-3 bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none"
                        required
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      The date money was paid to vendor or merchant
                    </span>
                  </div>
                </div>

                {/* Title / Description */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                    Expense Title / Item Summary *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 50 Liters Diesel fuel for Perkins backup generator"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#0F5132]"
                    required
                  />
                </div>

                {/* Notes & Receipt Ref */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                    Vendor Info, Invoice # & Additional Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Purchased from Shell Airport Bypass. Invoice #GH-8829. Paid via MoMo to vendor 0244-xxx-xxx."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#0F5132]"
                  />
                </div>
              </div>

              {/* 4. Receipt Upload & Proof of Payment */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        4. Receipt or Invoice Attachment (Proof)
                      </h2>
                      <p className="text-xs text-slate-500">
                        Upload invoice scan, paper receipt photo, or MoMo SMS transaction screenshot
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Recommended for GRA Audit
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  className="hidden"
                  onChange={handleReceiptUpload}
                />

                {receiptPreview || receiptUrl ? (
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {receiptPreview ? (
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-200 dark:border-slate-700">
                          <img src={receiptPreview} alt="Receipt preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                          <FileText className="w-8 h-8" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Receipt Attached
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
                          {receiptUrl ? 'Uploaded to secure Akwaaba storage' : 'Ready to save with record'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptUrl(null);
                          setReceiptPreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Remove attached receipt"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#0F5132] dark:hover:border-emerald-500 rounded-3xl p-8 text-center cursor-pointer transition-all bg-slate-50/50 dark:bg-slate-900/50 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 shadow-xs flex items-center justify-center mx-auto mb-3 text-slate-400 group-hover:text-[#0F5132] group-hover:scale-110 transition-all">
                      {isUploadingReceipt ? (
                        <Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" />
                      ) : (
                        <Upload className="w-6 h-6" />
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {isUploadingReceipt ? 'Uploading receipt file...' : 'Tap or drop receipt photo / PDF here'}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Supports JPG, PNG, WebP, or PDF up to 15MB. Directly takes a picture on mobile.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Right Column: Financial Yield Impact, GRA Guidance & Submission Box */}
            <div className="space-y-6">

              {/* Live Entry Summary Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                    Ledger Entry Summary
                  </h3>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Draft
                  </span>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-400 font-medium">Target Property:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-right truncate max-w-[180px]">
                      {activeProperty ? activeProperty.title : 'None selected'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Category:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {currentCategory.shortLabel}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Posting Date:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Proof Document:</span>
                    <span className={`font-bold ${receiptUrl ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {receiptUrl ? '✓ Attached' : 'None'}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Total Expenditure Amount
                    </span>
                    <div className="text-3xl font-black text-red-600 dark:text-red-400 tracking-tight">
                      GH₵ {parsedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="space-y-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={createExpenseMutation.isPending || isUploadingReceipt}
                    className="w-full py-3.5 bg-[#0F5132] hover:bg-[#146c43] text-white rounded-2xl font-black text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {createExpenseMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Recording in Ledger...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Save Operating Expense
                      </>
                    )}
                  </button>

                  <Link
                    href="/dashboard/landlord?tab=expenses"
                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs transition-colors flex items-center justify-center"
                  >
                    Discard & Return
                  </Link>
                </div>
              </div>

              {/* Ghana Revenue Authority (GRA) Tax & Act 896 Advisory Card */}
              <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-emerald-900/50 shadow-md space-y-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Info className="w-5 h-5 shrink-0" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider">
                    GRA Tax Act 896 Compliance
                  </h4>
                </div>

                <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                  <p>
                    Under the <strong>Ghana Revenue Authority Income Tax Act (Act 896)</strong>, verifiable property operating expenditures are deductible against gross rental income.
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                    <li>Reduces your net taxable rental profit.</li>
                    <li>Always capture genuine merchant receipts with TIN/Ghana Card references where possible.</li>
                    <li>Akwaaba Homes automatically tabulates your year-end P&L statement for GRA filing.</li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-white/10 text-[11px] text-emerald-300 font-semibold flex items-center gap-1">
                  <span>💡 Tip:</span> You can export your full P&L ledger anytime via CSV or print statement.
                </div>
              </div>

            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
