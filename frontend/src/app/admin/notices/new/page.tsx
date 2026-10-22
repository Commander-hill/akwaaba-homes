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
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

const ICON_TYPES = [
  { id: 'INFO', label: 'General Info', icon: Info },
  { id: 'WARNING', label: 'Advisory / Caution', icon: AlertTriangle },
  { id: 'SUCCESS', label: 'Good News / Feature', icon: CheckCircle },
  { id: 'URGENT', label: 'Urgent Emergency', icon: Flame }
];

const GHANA_REGIONS = [
  'All Ghana (Nationwide)',
  'Greater Accra (Accra, Tema, Madina)',
  'Ashanti Region (Kumasi, KNUST Corridor)',
  'Central Region (Cape Coast, UCC Corridor)',
  'Western Region (Takoradi, Tarkwa)',
  'Eastern & Volta Regions',
  'Northern Regions (Tamale)'
];

const TARGET_ROLES = [
  { id: 'ALL', label: 'All Users (Tenants, Landlords, Caretakers)' },
  { id: 'TENANT', label: 'Tenants & University Students Only' },
  { id: 'LANDLORD', label: 'Property Owners & Hostel Operators Only' },
  { id: 'CARETAKER', label: 'Estate Staff & Caretakers Only' }
];

function NewAdminNoticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [topLabel, setTopLabel] = useState('PLATFORM UPDATE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [buttonText, setButtonText] = useState('Learn More');
  const [buttonLink, setButtonLink] = useState('/rent-act');
  const [iconType, setIconType] = useState('INFO');
  const [orderIndex, setOrderIndex] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [targetRegion, setTargetRegion] = useState(GHANA_REGIONS[0]);
  const [targetRole, setTargetRole] = useState('ALL');

  const { data: notices } = useQuery({
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

  const saveNoticeMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editId) {
        const res = await api.put(`/admin/notices/${editId}`, payload);
        return res.data;
      }
      const res = await api.post('/admin/notices', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success(editId ? 'Announcement updated!' : 'Announcement broadcast published!');
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      router.push('/admin/notices');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to publish announcement notice');
    }
  });

  const handleNextStep = () => {
    if (step === 2 && (!title.trim() || !description.trim())) {
      toast.error('Please enter both a notice headline and narrative description');
      return;
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      handleNextStep();
      return;
    }
    if (!title.trim() || !description.trim()) {
      toast.error('Notice title and description are required');
      return;
    }

    saveNoticeMutation.mutate({
      orderIndex: Number(orderIndex) || 1,
      topLabel: topLabel.trim() || 'BULLETIN',
      title: title.trim(),
      description: description.trim(),
      buttonText: buttonText.trim() || null,
      buttonLink: buttonLink.trim() || null,
      iconType,
      isActive
    });
  };

  const selectedIcon = ICON_TYPES.find((i) => i.id === iconType) || ICON_TYPES[0];
  const IconComponent = selectedIcon.icon;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-6 pb-24">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push('/admin/notices')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Announcements Console
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              {editId ? 'Update System Broadcast Notice' : 'Broadcast System Announcement'}
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Publish nationwide or regional banners across tenant, landlord, and caretaker dashboards.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 w-fit">
            Step {step} of 4
          </span>
        </div>
      </div>

      {/* 4-Step Segmented Bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { num: 1, label: '1. Classification' },
          { num: 2, label: '2. Notice Copy & CTA' },
          { num: 3, label: '3. Audience & Status' },
          { num: 4, label: '4. Preview & Publish' }
        ].map((s) => {
          const active = step === s.num;
          const completed = step > s.num;
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (s.num < step) setStep(s.num);
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                active
                  ? 'border-[#0F5132] bg-emerald-50/50 dark:bg-emerald-950/20 text-[#0F5132] dark:text-emerald-400'
                  : completed
                  ? 'border-emerald-200 dark:border-emerald-900/40 bg-white dark:bg-[#12151D] text-zinc-800 dark:text-zinc-200'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] text-zinc-400'
              }`}
            >
              <div className="text-[11px] font-bold truncate">{s.label}</div>
              <div className="h-1 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    active || completed ? 'w-full bg-[#0F5132] dark:bg-emerald-500' : 'w-0'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* STEP 1: Classification */}
        {step === 1 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Notice Classification &amp; Display Priority
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Choose the visual severity theme and banner display order.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ICON_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = iconType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setIconType(t.id)}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-[#0F5132]/20'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[#0F5132] dark:text-emerald-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />}
                    </div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">{t.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Top Category Pill Label *
                </label>
                <input
                  type="text"
                  value={topLabel}
                  onChange={(e) => setTopLabel(e.target.value)}
                  placeholder="e.g. POLICY ADVISORY"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Display Priority Order
                </label>
                <input
                  type="number"
                  min="1"
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Notice Copy & CTA */}
        {step === 2 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Announcement Headline &amp; Call-to-Action
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Draft the official announcement copy and optional link button.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Notice Headline / Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mandatory 6-Month Rent Advance Compliance Reminder"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Notice Narrative / Details *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write complete notice details, dates, relevant statutory guidelines, and instructions..."
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-zinc-900 dark:text-white outline-none focus:border-[#0F5132] leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Action Button Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="e.g. View Policy Guidelines"
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Action Destination Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={buttonLink}
                    onChange={(e) => setButtonLink(e.target.value)}
                    placeholder="e.g. /rent-act"
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Audience & Status */}
        {step === 3 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#0F5132] dark:text-emerald-400" />
                Target Audience &amp; Regional Scope
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Configure which user roles and Ghanaian regions receive this announcement banner.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Geographic Region
                </label>
                <select
                  value={targetRegion}
                  onChange={(e) => setTargetRegion(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                >
                  {GHANA_REGIONS.map((r, i) => (
                    <option key={i} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  User Role Segment
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                >
                  {TARGET_ROLES.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                  Immediate Active &amp; Published Status
                </span>
                <span className="text-[11px] text-zinc-500">
                  When enabled, the banner displays immediately on targeted user dashboards.
                </span>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 rounded text-[#0F5132] focus:ring-[#0F5132] border-zinc-300"
              />
            </div>
          </div>
        )}

        {/* STEP 4: Preview & Publish */}
        {step === 4 && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-white">
                Banner Simulation &amp; Final Confirmation
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Verify how the announcement banner will render across user dashboards.
              </p>
            </div>

            <div className="bg-zinc-900 text-white rounded-2xl p-5 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase font-mono">
                <span>Live Dashboard Banner Preview</span>
                <span className="text-emerald-400 font-bold">{targetRegion}</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-white/10 text-emerald-400 shrink-0">
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300">
                    {topLabel || 'ANNOUNCEMENT'}
                  </span>
                  <h4 className="text-sm font-black text-white leading-snug">
                    {title || 'Announcement Headline'}
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {description || 'Detailed announcement narrative...'}
                  </p>
                  {buttonText && (
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#0F5132] text-white text-xs font-bold rounded-lg">
                        {buttonText} <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Horizontal Summary Bar */}
        <div className="bg-zinc-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
              National Broadcast Summary
            </div>
            <div className="text-sm font-bold">
              {topLabel}: {title || 'Untitled Notice'}
            </div>
          </div>
          <div className="text-xs text-zinc-400 font-mono">
            {isActive ? 'Status: Active' : 'Status: Draft'} &bull; Order #{orderIndex}
          </div>
        </div>

        {/* Wizard Footer Navigation */}
        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={handlePrevStep}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#12151D] text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-1.5 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Previous Step
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="px-6 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={saveNoticeMutation.isPending}
              className="px-6 py-3 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              {saveNoticeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Broadcasting Notice...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> {editId ? 'Save Notice Changes' : 'Publish Announcement'}
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

export default function NewAdminNoticePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
        </div>
      }
    >
      <NewAdminNoticeContent />
    </Suspense>
  );
}
