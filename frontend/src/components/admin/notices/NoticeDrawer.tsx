'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Info, 
  CreditCard, 
  AlertTriangle, 
  Scale, 
  BadgeCheck, 
  Wrench, 
  Megaphone, 
  Sparkles, 
  Check, 
  Loader2, 
  ExternalLink,
  Eye,
  Sliders,
  Radio,
  ArrowRight,
  ShieldAlert,
  Layers
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';

export interface Notice {
  id: string;
  orderIndex: number;
  topLabel: string | null;
  title: string;
  description: string;
  buttonText: string | null;
  buttonLink: string | null;
  iconType: string | null;
  isActive: boolean;
  createdAt?: string;
}

interface NoticeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notice: Notice | null;
  onSuccess?: () => void;
  existingNoticesCount?: number;
}

export const ICON_MAP: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  INFO: { label: 'Information', icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50' },
  PAYMENT: { label: 'Payments & Billing', icon: CreditCard, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
  CAUTION: { label: 'Caution & Warning', icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50' },
  WARNING: { label: 'Urgent Advisory', icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/50' },
  LEGAL: { label: 'Policy & Legal (Act 220)', icon: Scale, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50' },
  SECURITY: { label: 'Security & Ghana Card KYC', icon: BadgeCheck, color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
  MAINTENANCE: { label: 'Maintenance & Servicing', icon: Wrench, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/50' },
  MEGAPHONE: { label: 'General Announcement', icon: Megaphone, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/50' }
};

export const GHANA_TEMPLATES = [
  {
    name: 'Standard Advance Rent Schedule (Act 220)',
    topLabel: 'PLATFORM RENTAL POLICY',
    title: 'Standard Advance Rent Schedule',
    description: 'Landlords are encouraged to offer flexible advance rent terms with a standard 6-month advance ceiling for residential tenancies. All platform payment arrangements adhere to these principles.',
    buttonText: 'View Rental Policy',
    buttonLink: '/help',
    iconType: 'LEGAL'
  },
  {
    name: 'Mandatory Ghana Card NIA Verification',
    topLabel: 'MANDATORY STATUTORY KYC',
    title: 'Verify Your National Identity Card (Ghana Card)',
    description: 'To maintain a secure and fraud-free housing marketplace, all tenants and landlords must link their verified NIA Ghana Card. Unverified profiles will have lease application and property listing capabilities paused.',
    buttonText: 'Complete Identity KYC',
    buttonLink: '/dashboard/profile',
    iconType: 'SECURITY'
  },
  {
    name: 'Landlord Listing License (GH₵ 100/yr)',
    topLabel: 'ANNUAL LISTING PERMIT',
    title: 'Renew Annual Property Listing Licenses (GH₵ 100/yr)',
    description: 'Landlords are reminded that annual listing permit licenses must be active to maintain public property visibility across Greater Accra, Ashanti, and nationwide regions on Akwaaba Homes.',
    buttonText: 'Manage Licenses',
    buttonLink: '/dashboard/landlord/subscription',
    iconType: 'PAYMENT'
  },
  {
    name: 'Rent Control Division Mediation',
    topLabel: 'OFFICIAL ARBITRATION NOTICE',
    title: 'Rent Control Department Mediation Channel',
    description: 'Akwaaba Homes provides pre-dispute mediation for tenancy grievances. Cases unresolved within 7 business days are formally transmitted to the Ministry of Works & Housing Rent Control Division.',
    buttonText: 'File Dispute Docket',
    buttonLink: '/dashboard/tenant/disputes',
    iconType: 'LEGAL'
  },
  {
    name: 'Scheduled Banking & MoMo Gateway Maintenance',
    topLabel: 'SYSTEM MAINTENANCE',
    title: 'Scheduled Payment Gateway Maintenance (1:00 AM - 3:00 AM)',
    description: 'Routine banking settlement maintenance scheduled for Mobile Money and Paystack channels. Active tenancies and ongoing lease renewals remain secure.',
    buttonText: 'Status Page',
    buttonLink: '/maintenance',
    iconType: 'MAINTENANCE'
  }
];

export default function NoticeDrawer({
  isOpen,
  onClose,
  notice,
  onSuccess,
  existingNoticesCount = 0
}: NoticeDrawerProps) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    orderIndex: 1,
    topLabel: '',
    title: '',
    description: '',
    buttonText: '',
    buttonLink: '',
    iconType: 'INFO',
    isActive: true
  });

  useEffect(() => {
    if (notice) {
      setFormData({
        orderIndex: notice.orderIndex ?? 1,
        topLabel: notice.topLabel || '',
        title: notice.title || '',
        description: notice.description || '',
        buttonText: notice.buttonText || '',
        buttonLink: notice.buttonLink || '',
        iconType: notice.iconType || 'INFO',
        isActive: notice.isActive ?? true
      });
    } else {
      setFormData({
        orderIndex: existingNoticesCount + 1,
        topLabel: 'STATUTORY ANNOUNCEMENT',
        title: '',
        description: '',
        buttonText: '',
        buttonLink: '',
        iconType: 'INFO',
        isActive: true
      });
    }
  }, [notice, isOpen, existingNoticesCount]);

  if (!isOpen) return null;

  const handleApplyTemplate = (tmpl: typeof GHANA_TEMPLATES[0]) => {
    setFormData((prev) => ({
      ...prev,
      topLabel: tmpl.topLabel,
      title: tmpl.title,
      description: tmpl.description,
      buttonText: tmpl.buttonText,
      buttonLink: tmpl.buttonLink,
      iconType: tmpl.iconType
    }));
    toast.success(`Loaded template: "${tmpl.name}"`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Announcement headline is required.');
      return;
    }
    if (!formData.description.trim()) {
      toast.error('Announcement body content is required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        orderIndex: Number(formData.orderIndex) || 0,
        topLabel: formData.topLabel.trim() || null,
        title: formData.title.trim(),
        description: formData.description.trim(),
        buttonText: formData.buttonText.trim() || null,
        buttonLink: formData.buttonLink.trim() || null,
        iconType: formData.iconType || 'INFO',
        isActive: formData.isActive
      };

      if (notice) {
        await api.put(`/admin/notices/${notice.id}`, payload);
        toast.success('Notice updated successfully!');
      } else {
        await api.post('/admin/notices', payload);
        toast.success('Notice created and broadcasted!');
      }

      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      queryClient.invalidateQueries({ queryKey: ['active-notices'] });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const previewIconConfig = ICON_MAP[formData.iconType] || ICON_MAP.INFO;
  const PreviewIcon = previewIconConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col z-10 overflow-hidden border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              {notice ? 'Edit Announcement' : 'Compose New Announcement'}
            </span>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              {notice ? notice.title : 'New Platform Notice'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Real-time Interactive Banner Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-zinc-400">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                Live Banner Preview (Resident & Landlord Portals)
              </span>
              <span className="text-[10px] text-zinc-400">Updates live as you type</span>
            </div>

            {/* Banner Component Matching NoticeBoard.tsx */}
            <div className="relative w-full bg-gradient-to-br from-[#0F5132] via-[#0D4428] to-[#072718] rounded-2xl p-5 overflow-hidden shadow-sm border border-emerald-800/60 text-white">
              <div className="relative z-10 max-w-xl">
                {/* Top Category Label */}
                {formData.topLabel && (
                  <div className="text-emerald-200/90 text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{formData.topLabel}</span>
                  </div>
                )}
                
                {/* Title Row with Icon */}
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
                    <PreviewIcon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight leading-snug">
                    {formData.title || 'Your Announcement Headline Here'}
                  </h3>
                </div>

                {/* Description Body */}
                <p className="text-emerald-100/90 text-xs leading-relaxed max-w-lg mb-3">
                  {formData.description || 'Your announcement body content will display clearly to residents and property managers here...'}
                </p>

                {/* Action CTA Button */}
                {formData.buttonText && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#0F5132] font-bold text-xs shadow-xs">
                    <span>{formData.buttonText}</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ghanaian Marketplace Preset Templates */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Pre-built Templates (Ghana Rental Ecosystem)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GHANA_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-zinc-50/50 dark:bg-zinc-800/40 text-left transition text-xs group"
                >
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                    {tmpl.name}
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {tmpl.topLabel}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <form id="notice-drawer-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Top Label & Order */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                  Top Category Label
                </label>
                <input
                  type="text"
                  value={formData.topLabel}
                  onChange={(e) => setFormData((p) => ({ ...p, topLabel: e.target.value }))}
                  placeholder="e.g. PLATFORM MAINTENANCE, STATUTORY KYC"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.orderIndex}
                  onChange={(e) => setFormData((p) => ({ ...p, orderIndex: Number(e.target.value) || 1 }))}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Title / Headline */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                Announcement Headline *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Scheduled System Maintenance for Mobile Money Payments"
                required
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>

            {/* Description Body */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                Announcement Body *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Provide detailed, clear operational information for platform users..."
                rows={4}
                required
                className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>

            {/* Visual Icon & Category */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1.5">
                Category & Visual Icon
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(ICON_MAP).map(([key, config]) => {
                  const Icon = config.icon;
                  const isSelected = formData.iconType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, iconType: key }))}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition text-xs ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0 text-zinc-500" />
                      <span className="truncate text-[11px]">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA Link Fields */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                <span>Call to Action (Optional Button Link)</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                    Button Label
                  </label>
                  <input
                    type="text"
                    value={formData.buttonText}
                    onChange={(e) => setFormData((p) => ({ ...p, buttonText: e.target.value }))}
                    placeholder="e.g. View Rental Policy"
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                    Destination URL / Path
                  </label>
                  <input
                    type="text"
                    value={formData.buttonLink}
                    onChange={(e) => setFormData((p) => ({ ...p, buttonLink: e.target.value }))}
                    placeholder="e.g. /help or /dashboard/profile"
                    className="w-full text-xs p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Active Broadcast Status Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-zinc-900 dark:text-white">
                  Broadcast Immediately
                </div>
                <div className="text-[11px] text-zinc-500">
                  When enabled, this notice is instantly live across user dashboards.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>

          </form>

        </div>

        {/* Drawer Fixed Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="notice-drawer-form"
            disabled={submitting}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{notice ? 'Update Announcement' : 'Publish Announcement'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
