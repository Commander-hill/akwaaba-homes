'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Megaphone,
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  Flame,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Send,
  Loader2,
  ExternalLink,
  Globe,
  Check,
  CreditCard,
  Scale,
  BadgeCheck,
  Wrench,
  Eye,
  Radio,
  ArrowRight,
  Sparkles,
  Layers,
  MapPin,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { ICON_MAP, GHANA_TEMPLATES } from '@/components/admin/notices/NoticeDrawer';

const GHANA_REGIONS = [
  'All Ghana (Nationwide Broadcast)',
  'Greater Accra (Accra, Tema, Madina, Legon)',
  'Ashanti Region (Kumasi, KNUST Corridor)',
  'Central Region (Cape Coast, UCC Corridor)',
  'Western Region (Takoradi, Tarkwa)',
  'Eastern & Volta Regions',
  'Northern Regions (Tamale)'
];

const TARGET_ROLES = [
  { id: 'ALL', label: 'All Platform Users (Tenants, Landlords, Caretakers)' },
  { id: 'TENANT', label: 'Tenants & University Students Only' },
  { id: 'LANDLORD', label: 'Property Owners & Hostel Operators Only' },
  { id: 'CARETAKER', label: 'Estate Staff & Gate Caretakers Only' }
];

function AdminNoticeComposerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Notice fields
  const [topLabel, setTopLabel] = useState('PLATFORM ADVISORY');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [buttonText, setButtonText] = useState('Learn More');
  const [buttonLink, setButtonLink] = useState('/help');
  const [iconType, setIconType] = useState('INFO');
  const [orderIndex, setOrderIndex] = useState(1);
  const [isActive, setIsActive] = useState(true);

  // Audience & Regional Metadata
  const [targetRegion, setTargetRegion] = useState(GHANA_REGIONS[0]);
  const [targetRole, setTargetRole] = useState('ALL');

  // Load existing notice for edit mode
  const { data: notices, isLoading: isLoadingNotices } = useQuery({
    queryKey: ['admin-notices'],
    queryFn: async () => {
      const res = await api.get('/admin/notices');
      return res.data;
    },
    enabled: Boolean(editId)
  });

  useEffect(() => {
    if (editId && Array.isArray(notices)) {
      const existing = notices.find((n: any) => n.id === editId);
      if (existing) {
        setTopLabel(existing.topLabel || '');
        setTitle(existing.title || '');
        setDescription(existing.description || '');
        setButtonText(existing.buttonText || '');
        setButtonLink(existing.buttonLink || '');
        setIconType(existing.iconType || 'INFO');
        setOrderIndex(existing.orderIndex || 1);
        setIsActive(Boolean(existing.isActive));
      }
    }
  }, [editId, notices]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        orderIndex: Number(orderIndex) || 0,
        topLabel: topLabel.trim() || null,
        title: title.trim(),
        description: description.trim(),
        buttonText: buttonText.trim() || null,
        buttonLink: buttonLink.trim() || null,
        iconType: iconType || 'INFO',
        isActive
      };

      if (editId) {
        return api.put(`/admin/notices/${editId}`, payload);
      }
      return api.post('/admin/notices', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      queryClient.invalidateQueries({ queryKey: ['active-notices'] });
      toast.success(editId ? 'Announcement updated successfully!' : 'Announcement broadcasted successfully!');
      router.push('/admin/notices');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save announcement.');
    }
  });

  const handleApplyTemplate = (tmpl: typeof GHANA_TEMPLATES[0]) => {
    setTopLabel(tmpl.topLabel);
    setTitle(tmpl.title);
    setDescription(tmpl.description);
    setButtonText(tmpl.buttonText);
    setButtonLink(tmpl.buttonLink);
    setIconType(tmpl.iconType);
    toast.success(`Template loaded: "${tmpl.name}"`);
  };

  const previewConfig = ICON_MAP[iconType] || ICON_MAP.INFO;
  const PreviewIcon = previewConfig.icon;

  if (editId && isLoadingNotices) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="text-xs font-semibold">Loading announcement data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      
      {/* Header */}
      <AdminPageHeader
        title={editId ? 'Edit Announcement' : 'Announcement Composer Wizard'}
        subtitle="Step-by-step administrative wizard for composing, targeting, previewing, and broadcasting platform notices across Akwaaba Homes."
        backUrl="/admin/notices"
        backLabel="Back to Notices"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Notices & Announcements', href: '/admin/notices' },
          { label: editId ? 'Edit Notice' : 'New Notice' }
        ]}
      />

      {/* Progress Steps Header */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 p-4 shadow-sm">
        <div className="flex items-center justify-between text-xs font-semibold">
          {[
            { num: 1, label: '1. Content & Copy' },
            { num: 2, label: '2. Icon & Action Link' },
            { num: 3, label: '3. Audience & Region' },
            { num: 4, label: '4. Preview & Publish' }
          ].map((item, idx) => (
            <React.Fragment key={item.num}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700 hidden sm:block" />}
              <button
                type="button"
                onClick={() => setStep(item.num as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition ${
                  step === item.num
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30'
                    : step > item.num
                    ? 'text-zinc-800 dark:text-zinc-200'
                    : 'text-zinc-400'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === item.num
                    ? 'bg-emerald-600 text-white'
                    : step > item.num
                    ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                }`}>
                  {step > item.num ? <Check className="w-3 h-3" /> : item.num}
                </span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Live Interactive Preview Box (Always Visible Across Steps) */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 p-5 space-y-2 shadow-sm">
        <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold mb-1">
          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-zinc-400">
            <Eye className="w-3.5 h-3.5 text-emerald-600" />
            Live Portal Preview
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            Renders on Tenant & Landlord Notice Boards
          </span>
        </div>

        {/* Live Banner */}
        <div className="relative w-full bg-gradient-to-br from-[#0F5132] via-[#0D4428] to-[#072718] rounded-2xl p-5 overflow-hidden shadow-sm border border-emerald-800/60 text-white">
          <div className="relative z-10 max-w-2xl">
            {topLabel && (
              <div className="text-emerald-200/90 text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>{topLabel}</span>
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
                <PreviewIcon className="w-4 h-4" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                {title || 'Announcement Headline Appears Here'}
              </h3>
            </div>

            <p className="text-emerald-100/90 text-xs leading-relaxed max-w-xl mb-3">
              {description || 'Your announcement body copy will display here to guide students, tenants, and property owners across Ghana...'}
            </p>

            {buttonText && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#0F5132] font-bold text-xs shadow-xs">
                <span>{buttonText}</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Step Form Body */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 p-6 space-y-6 shadow-sm">
        
        {/* STEP 1: Content & Copy */}
        {step === 1 && (
          <div className="space-y-4">
            {/* Quick Template Selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-2">
                Load Preset Template (Optional)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {GHANA_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-emerald-500 bg-zinc-50/50 dark:bg-zinc-800/40 text-left transition text-xs group"
                  >
                    <div className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 truncate">
                      {tmpl.name}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                      {tmpl.topLabel}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                  Top Category Label
                </label>
                <input
                  type="text"
                  value={topLabel}
                  onChange={(e) => setTopLabel(e.target.value)}
                  placeholder="e.g. PLATFORM ADVISORY, STATUTORY KYC"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                  Display Sequence Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(Number(e.target.value) || 1)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                Announcement Headline *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Standard Advance Rent Schedule (Act 220 Ceiling Guidelines)"
                required
                className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                Announcement Content Body *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write clear, comprehensive instructions or operational notices for platform users..."
                rows={4}
                required
                className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Icon & Action Link */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-2">
                Choose Semantic Icon Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(ICON_MAP).map(([key, config]) => {
                  const Icon = config.icon;
                  const isSelected = iconType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setIconType(key)}
                      className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition text-xs ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold shadow-xs'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg border ${config.bg} ${config.color} border-zinc-200/50 dark:border-zinc-700`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="truncate text-xs">{config.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                <span>Call to Action Button (Optional)</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                    Button Label
                  </label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="e.g. View Guidelines"
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                    Target Route / Deep Link
                  </label>
                  <input
                    type="text"
                    value={buttonLink}
                    onChange={(e) => setButtonLink(e.target.value)}
                    placeholder="e.g. /help or /dashboard/profile"
                    className="w-full text-xs p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Audience & Regional Targeting */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-2">
                Target User Audience
              </label>
              <div className="space-y-2">
                {TARGET_ROLES.map((role) => (
                  <label
                    key={role.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition ${
                      targetRole === role.id
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="targetRole"
                        checked={targetRole === role.id}
                        onChange={() => setTargetRole(role.id)}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>{role.label}</span>
                    </div>
                    <Users className="w-4 h-4 text-zinc-400" />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-2">
                Geographic / Regional Scope
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {GHANA_REGIONS.map((region) => (
                  <label
                    key={region}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs transition ${
                      targetRegion === region
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 font-semibold'
                        : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="targetRegion"
                      checked={targetRegion === region}
                      onChange={() => setTargetRegion(region)}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{region}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Publish */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-200/50 dark:border-zinc-700/50">
                <span className="text-zinc-500">Headline:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{title}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200/50 dark:border-zinc-700/50">
                <span className="text-zinc-500">Category Tag:</span>
                <span className="font-semibold text-emerald-600">{topLabel || 'General Notice'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200/50 dark:border-zinc-700/50">
                <span className="text-zinc-500">Target Role Audience:</span>
                <span className="text-zinc-900 dark:text-white">
                  {TARGET_ROLES.find((r) => r.id === targetRole)?.label}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-zinc-200/50 dark:border-zinc-700/50">
                <span className="text-zinc-500">Geographic Region:</span>
                <span className="text-zinc-900 dark:text-white">{targetRegion}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-zinc-500">Call to Action:</span>
                <span className="font-mono text-zinc-900 dark:text-white">
                  {buttonText ? `${buttonText} (${buttonLink})` : 'None'}
                </span>
              </div>
            </div>

            {/* Active Switch */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-zinc-900 dark:text-white">
                  Publish & Broadcast Live Immediately
                </div>
                <div className="text-[11px] text-zinc-500">
                  When enabled, this notice is active and visible on live portals right away.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/admin/notices')}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
            >
              Cancel
            </button>

            {step < 4 ? (
              <button
                type="button"
                disabled={step === 1 && (!title.trim() || !description.trim())}
                onClick={() => setStep((s) => (s + 1) as any)}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saveMutation.isPending || !title.trim() || !description.trim()}
                onClick={() => saveMutation.mutate()}
                className="inline-flex items-center gap-2 px-6 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition disabled:opacity-50"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{editId ? 'Save Changes' : 'Publish Announcement'}</span>
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

export default function AdminNoticeComposerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <span className="text-xs font-semibold">Loading Composer...</span>
      </div>
    }>
      <AdminNoticeComposerContent />
    </Suspense>
  );
}
