'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
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
  ShieldCheck,
  Send,
  Loader2,
  ExternalLink,
  Globe,
  MapPin,
  Users,
  Smartphone,
  Monitor
} from 'lucide-react';
import toast from 'react-hot-toast';

const ICON_TYPES = [
  { id: 'INFO', label: 'General Info', icon: Info, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200' },
  { id: 'WARNING', label: 'Advisory / Caution', icon: AlertTriangle, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200' },
  { id: 'SUCCESS', label: 'Good News / Feature', icon: CheckCircle, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' },
  { id: 'URGENT', label: 'Urgent Emergency', icon: Flame, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200' }
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
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

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
      toast.success(editId ? 'Announcement updated successfully!' : 'Announcement broadcast published successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      router.push('/admin/notices');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to publish announcement notice');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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

  const selectedIcon = ICON_TYPES.find(i => i.id === iconType) || ICON_TYPES[0];
  const IconComponent = selectedIcon.icon;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Header / Breadcrumbs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Link href="/admin/notices" className="hover:text-primary flex items-center gap-1 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Announcements Console
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 dark:text-white font-bold">New Platform Broadcast</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Globe className="w-3.5 h-3.5" /> Nationwide Push Available
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Page Hero */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden mb-8">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
            <Megaphone className="w-72 h-72" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Bell className="w-3.5 h-3.5" /> System-Wide Announcement Desk
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Broadcast System Announcement
            </h1>
            <p className="text-purple-100 text-sm leading-relaxed">
              Publish banners across desktop and mobile dashboards. Inform Ghanaian tenants and landlords about Rent Control policy updates, planned server maintenance, or holiday schedules.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form Fields */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Urgency & Icon Preset */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-500" />
                Urgency Level &amp; Icon Theme
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ICON_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = iconType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setIconType(t.id)}
                      className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                        isSelected
                          ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20 ring-2 ring-purple-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${t.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Content Details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-purple-500" />
                Announcement Content
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Top Category Pill Label
                  </label>
                  <input
                    type="text"
                    value={topLabel}
                    onChange={(e) => setTopLabel(e.target.value)}
                    placeholder="e.g. RENT ACT NOTICE"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Display Priority Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={orderIndex}
                    onChange={(e) => setOrderIndex(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notice Headline / Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mandatory 6-Month Rent Advance Compliance Reminder"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Notice Narrative / Details *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write complete notice details, dates, relevant laws, and instructions for users..."
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Action Button Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="e.g. Read Act 220 Summary"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Action Destination Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={buttonLink}
                    onChange={(e) => setButtonLink(e.target.value)}
                    placeholder="e.g. /rent-act or https://..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 3. Targeting & Distribution */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-500" />
                Target Audience &amp; Regional Scope
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Geographic Region
                  </label>
                  <select
                    value={targetRegion}
                    onChange={(e) => setTargetRegion(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {GHANA_REGIONS.map((r, i) => (
                      <option key={i} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    User Role Segment
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {TARGET_ROLES.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Active &amp; Published Status
                  </span>
                  <span className="text-[11px] text-slate-400">
                    When enabled, banner will display immediately on targeted user dashboards.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Live Banner Preview & Actions */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 sticky top-24">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-purple-500" /> Live Visual Simulation
                </h3>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition ${
                      previewDevice === 'desktop' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-400'
                    }`}
                    title="Desktop Preview"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded-lg text-xs font-bold transition ${
                      previewDevice === 'mobile' ? 'bg-white dark:bg-slate-700 shadow-xs' : 'text-slate-400'
                    }`}
                    title="Mobile Push Preview"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Simulation Canvas */}
              {previewDevice === 'desktop' ? (
                <div className="bg-slate-900 text-white rounded-2xl p-4 border border-purple-500/30 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 text-[10px] text-slate-400 uppercase font-mono">
                    <span>Desktop Dashboard Header</span>
                    <span className="text-emerald-400 font-bold">{targetRegion.split(' ')[0]}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-white/10 text-purple-400 shrink-0">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300">
                        {topLabel || 'ANNOUNCEMENT'}
                      </span>
                      <h4 className="text-xs font-black text-white leading-snug">
                        {title || 'Announcement Headline Preview'}
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-3">
                        {description || 'Detailed announcement narrative will appear here for all users...'}
                      </p>
                      {buttonText && (
                        <div className="pt-2">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold rounded-lg transition">
                            {buttonText} <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-[280px] mx-auto bg-slate-900 text-white rounded-3xl p-4 border-2 border-slate-700 shadow-xl space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono">Akwaaba Push</span>
                    <span>Just now</span>
                  </div>
                  <div className="flex items-start gap-2 pt-1">
                    <div className="w-7 h-7 rounded-lg bg-purple-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                      A
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[11px] font-black text-white line-clamp-1">
                        {title || 'New System Notice'}
                      </div>
                      <div className="text-[10px] text-slate-300 line-clamp-2 leading-snug">
                        {description || 'Important update regarding your account or rentals.'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={saveNoticeMutation.isPending}
                  className="w-full py-3.5 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saveNoticeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Broadcasting Notice...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Publish Announcement
                    </>
                  )}
                </button>

                <Link
                  href="/admin/notices"
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center transition"
                >
                  Cancel & Return
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewAdminNoticePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      }
    >
      <NewAdminNoticeContent />
    </Suspense>
  );
}
