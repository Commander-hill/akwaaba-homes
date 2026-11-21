'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  Send,
  Users,
  Home,
  Globe,
  AlertTriangle,
  CheckCircle2,
  BellRing,
  Scale,
  CreditCard,
  Wrench,
  BadgeCheck,
  Mail,
  Radio,
  Loader2,
  Eye,
  Megaphone,
  Tag,
  Info,
  Pencil,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Calendar,
  FileText,
  CloudRain,
  Wifi,
  Battery,
  Signal,
  Check,
  ArrowRight,
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';

export interface BroadcastPayload {
  target: 'ALL_TENANTS' | 'ALL_LANDLORDS' | 'ALL_USERS';
  title: string;
  message: string;
  category: string;
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  channels: ('IN_APP' | 'SOCKET' | 'EMAIL')[];
}

interface BroadcastComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<BroadcastPayload> | null;
  onSuccess?: () => void;
  audienceStats?: { tenants: number; landlords: number; total: number };
}

export const BROADCAST_CATEGORIES = [
  { id: 'STATUTORY_ALERT', label: 'Statutory / Legal', icon: Scale, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50' },
  { id: 'FINANCIAL_SETTLEMENT', label: 'Payments & Billing', icon: CreditCard, color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
  { id: 'MAINTENANCE_UPDATE', label: 'Repairs & SLA', icon: Wrench, color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/50' },
  { id: 'SECURITY_ADVISORY', label: 'Security & KYC', icon: BadgeCheck, color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50' },
  { id: 'GENERAL_ANNOUNCEMENT', label: 'General Alert', icon: BellRing, color: 'text-zinc-700 dark:text-zinc-300', bg: 'bg-zinc-100 dark:bg-zinc-800' },
];

export const GHANA_BROADCAST_PRESETS = [
  {
    name: 'Advance Rent Policy Advisory',
    icon: Scale,
    target: 'ALL_LANDLORDS' as const,
    title: 'Standard Advance Rent Schedule Guidance',
    message:
      'Platform policy recommends advance rent schedules up to 6 months for residential leases. All listing terms and payment requests should adhere to verified terms.',
    category: 'STATUTORY_ALERT',
  },
  {
    name: 'Mandatory Ghana Card KYC',
    icon: BadgeCheck,
    target: 'ALL_USERS' as const,
    title: 'National Identity Card (Ghana Card) Mandatory',
    message:
      'Under platform statutory compliance rules, all residents and property owners must link their NIA Ghana Card by the end of the current month to prevent lease freezes.',
    category: 'SECURITY_ADVISORY',
  },
  {
    name: 'Paystack & MoMo Gateway Maintenance',
    icon: CreditCard,
    target: 'ALL_USERS' as const,
    title: 'Scheduled Payment Gateway Maintenance (1:00 AM - 3:00 AM)',
    message:
      'Routine banking settlement maintenance scheduled for Mobile Money and Paystack channels. Active tenancies and lease renewals remain secure.',
    category: 'FINANCIAL_SETTLEMENT',
  },
  {
    name: 'Rainy Season & Drainage Safety Advisory',
    icon: CloudRain,
    target: 'ALL_TENANTS' as const,
    title: 'Rainy Season Compound Safety & Drainage Notice',
    message:
      'Tenants are advised to inspect perimeter drainage and report structural compound leaks immediately via the Maintenance Tickets portal.',
    category: 'MAINTENANCE_UPDATE',
  },
  {
    name: 'Annual Landlord Listing Permit Renewal',
    icon: FileText,
    target: 'ALL_LANDLORDS' as const,
    title: 'Annual Landlord Listing Permit Renewal Active (GH₵ 100)',
    message:
      'Ensure your GH₵ 100/yr property listing licenses are current to keep your residential listings visible to verified prospective tenants across Ghana.',
    category: 'FINANCIAL_SETTLEMENT',
  },
];

export default function BroadcastComposerModal({
  isOpen,
  onClose,
  initialData,
  onSuccess,
  audienceStats = { tenants: 0, landlords: 0, total: 0 },
}: BroadcastComposerModalProps) {
  const queryClient = useQueryClient();
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewTab, setPreviewTab] = useState<'IN_APP' | 'PUSH'>('IN_APP');
  const [activePresetName, setActivePresetName] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');

  // Form States
  const [target, setTarget] = useState<'ALL_TENANTS' | 'ALL_LANDLORDS' | 'ALL_USERS'>('ALL_TENANTS');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<string>('FINANCIAL_SETTLEMENT');
  const [priority, setPriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>('NORMAL');
  const [channels, setChannels] = useState<('IN_APP' | 'SOCKET' | 'EMAIL')[]>(['IN_APP', 'SOCKET']);

  useEffect(() => {
    if (initialData) {
      if (initialData.target) setTarget(initialData.target);
      if (initialData.title) setTitle(initialData.title);
      if (initialData.message) setMessage(initialData.message);
      if (initialData.category) setCategory(initialData.category);
      if (initialData.priority) setPriority(initialData.priority);
      if (initialData.channels) setChannels(initialData.channels);
    } else {
      setTarget('ALL_TENANTS');
      setTitle('');
      setMessage('');
      setCategory('FINANCIAL_SETTLEMENT');
      setPriority('NORMAL');
      setChannels(['IN_APP', 'SOCKET']);
    }
    setActivePresetName(null);
    setShowConfirm(false);
    setScheduleOpen(false);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const currentAudienceCount =
    target === 'ALL_TENANTS'
      ? audienceStats.tenants
      : target === 'ALL_LANDLORDS'
        ? audienceStats.landlords
        : audienceStats.total;

  const handleApplyPreset = (preset: (typeof GHANA_BROADCAST_PRESETS)[0]) => {
    setActivePresetName(preset.name);
    setTarget(preset.target);
    setTitle(preset.title.slice(0, 100));
    setMessage(preset.message.slice(0, 500));
    setCategory(preset.category);
    toast.success(`Loaded preset: "${preset.name}"`);
  };

  const toggleChannel = (ch: 'IN_APP' | 'SOCKET' | 'EMAIL') => {
    if (channels.includes(ch)) {
      if (channels.length === 1) {
        toast.error('At least one delivery channel must be selected.');
        return;
      }
      setChannels((prev) => prev.filter((c) => c !== ch));
      return;
    }
    setChannels((prev) => (prev.includes(ch) ? prev : [...prev, ch]));
  };

  const insertFormat = (prefix: string, suffix = '') => {
    const el = messageRef.current;
    if (!el) {
      setMessage((prev) => `${prev}${prefix}${suffix}`.slice(0, 500));
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = message.slice(start, end);
    const updated =
      message.slice(0, start) + prefix + (selected || 'text') + suffix + message.slice(end);
    setMessage(updated.slice(0, 500));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selected || 'text').length);
    }, 10);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Broadcast headline is required.');
      return;
    }
    if (!message.trim()) {
      toast.error('Broadcast message body is required.');
      return;
    }
    if (channels.length === 0) {
      toast.error('Select at least one delivery channel.');
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/admin/notifications/broadcast', {
        target,
        title: title.trim(),
        message: message.trim(),
        category,
        priority,
        channels,
      });

      toast.success(
        res.data?.message ||
          `Broadcast dispatched to ${res.data?.count || currentAudienceCount} users!`
      );
      queryClient.invalidateQueries({ queryKey: ['admin-broadcast-history'] });
      queryClient.invalidateQueries({ queryKey: ['admin-activity'] });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch mass broadcast.');
    } finally {
      setSubmitting(false);
    }
  };

  const currentCatObj =
    BROADCAST_CATEGORIES.find((c) => c.id === category) || BROADCAST_CATEGORIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!submitting) onClose();
        }}
      />

      {/* Wide Editorial Modal Dialog */}
      <div className="relative w-full sm:max-w-5xl bg-white dark:bg-[#12151D] rounded-t-[28px] rounded-b-none sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92dvh]">
        {/* ── 1. EDITORIAL HERO MODAL HEADER ── */}
        <div className="relative overflow-hidden px-5 sm:px-7 py-5 bg-gradient-to-r from-[#EBF7F0] via-[#F4FBF6] to-[#E2F4EA] dark:from-[#0C1F16] dark:via-[#10281D] dark:to-[#0C1E15] border-b border-emerald-200/70 dark:border-emerald-900/50 shrink-0">
          {/* Right Architectural Artwork */}
          <div className="hidden md:block absolute right-0 top-0 bottom-0 w-[42%] pointer-events-none select-none overflow-hidden">
            <Image
              src="/images/admin/notices-hero-banner.jpg"
              alt="Broadcast Skyline"
              fill
              sizes="420px"
              className="object-cover object-right opacity-95 dark:opacity-35 [mask-image:linear-gradient(to_left,black_65%,transparent_100%)]"
            />
          </div>

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#DFF4E7] dark:bg-emerald-950/80 border border-emerald-300/60 dark:border-emerald-800/70 flex items-center justify-center shrink-0 shadow-2xs">
                <Megaphone className="w-6 h-6 text-[#127337] dark:text-emerald-400 -rotate-12" />
              </div>

              <div className="hidden sm:block h-10 w-px bg-emerald-300/70 dark:bg-emerald-800/70 shrink-0" />

              <div className="min-w-0">
                <span className="text-[11px] font-extrabold text-[#127337] dark:text-emerald-400 tracking-wide block">
                  Communication Control Center
                </span>
                <h2 className="text-lg sm:text-xl font-black text-zinc-950 dark:text-white tracking-tight leading-tight">
                  Compose &amp; Dispatch Live Broadcast
                </h2>
                <p className="text-[11.5px] text-zinc-600 dark:text-emerald-100/75 mt-0.5 truncate">
                  Reach your users instantly with important updates and announcements.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Close modal"
              className="w-8 h-8 rounded-full bg-white/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center shadow-xs transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── 2. SCROLLABLE TWO-COLUMN BODY ── */}
        <form
          id="broadcast-composer-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto touch-scroll p-5 sm:p-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN (7 cols): Form Steps 1 - 4 */}
            <div className="lg:col-span-7 space-y-5">
              {/* Step 1: Quick Ghana Regulatory Presets */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#127337] text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="text-xs font-extrabold text-zinc-950 dark:text-white">
                    Quick Ghana Regulatory Presets
                  </span>
                  <Info className="w-3.5 h-3.5 text-zinc-400" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {GHANA_BROADCAST_PRESETS.map((p) => {
                    const PresetIcon = p.icon;
                    const isSelected = activePresetName === p.name;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className={clsx(
                          'px-3 py-2.5 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer',
                          isSelected
                            ? 'bg-[#127337] border-[#127337] text-white shadow-sm'
                            : 'bg-[#F8FAFC] dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30'
                        )}
                      >
                        <PresetIcon
                          className={clsx(
                            'w-4 h-4 shrink-0',
                            isSelected ? 'text-white' : 'text-[#127337] dark:text-emerald-400'
                          )}
                        />
                        <span className="text-[11px] font-bold leading-snug line-clamp-2 flex-1">
                          {p.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Target Audience Segment */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#127337] text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="text-xs font-extrabold text-zinc-950 dark:text-white">
                    Target Audience Segment
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'ALL_TENANTS' as const, label: 'All Tenants', count: audienceStats.tenants, icon: Users },
                    { id: 'ALL_LANDLORDS' as const, label: 'All Landlords', count: audienceStats.landlords, icon: Home },
                    { id: 'ALL_USERS' as const, label: 'Entire Network', count: audienceStats.total, icon: Globe },
                  ].map((aud) => {
                    const Icon = aud.icon;
                    const isSelected = target === aud.id;
                    return (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => setTarget(aud.id)}
                        className={clsx(
                          'p-3.5 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer',
                          isSelected
                            ? 'border-[#16A34A] bg-[#EAF7EF] dark:bg-emerald-950/40 text-[#127337] dark:text-emerald-200 font-bold shadow-2xs'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        )}
                      >
                        <Icon
                          className={clsx(
                            'w-4.5 h-4.5',
                            isSelected ? 'text-[#127337] dark:text-emerald-400' : 'text-zinc-500'
                          )}
                        />
                        <span className="text-xs font-bold">{aud.label}</span>
                        <span className="text-[10.5px] text-zinc-500 dark:text-zinc-400">
                          {aud.count.toLocaleString()} Addressable
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category & Topic + Urgency Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    <Tag className="w-3.5 h-3.5 text-[#127337] dark:text-emerald-400" />
                    <span>Category &amp; Topic</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white outline-none focus:border-[#127337]"
                  >
                    {BROADCAST_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    <AlertTriangle
                      className={clsx(
                        'w-3.5 h-3.5',
                        priority === 'URGENT' ? 'text-rose-600' : 'text-amber-500'
                      )}
                    />
                    <span>Urgency Priority</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className={clsx(
                      'w-full text-xs font-bold p-2.5 rounded-xl border outline-none transition',
                      priority === 'URGENT'
                        ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300'
                        : priority === 'IMPORTANT'
                          ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white'
                    )}
                  >
                    <option value="NORMAL">Normal Priority</option>
                    <option value="IMPORTANT">Important Notice</option>
                    <option value="URGENT">High Priority</option>
                  </select>
                </div>
              </div>

              {/* Step 3: Delivery Channels */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#127337] text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span className="text-xs font-extrabold text-zinc-950 dark:text-white">
                    Delivery Channels
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'IN_APP' as const, label: 'In-App Notification', desc: 'Saved in user bell inbox', icon: BellRing },
                    { id: 'SOCKET' as const, label: 'Real-Time Alert', desc: 'Instant device push', icon: Radio },
                    { id: 'EMAIL' as const, label: 'Official Email', desc: 'Nodemailer institutional email', icon: Mail },
                  ].map((ch) => {
                    const Icon = ch.icon;
                    const isChecked = channels.includes(ch.id);
                    return (
                      <label
                        key={ch.id}
                        className={clsx(
                          'p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5',
                          isChecked
                            ? 'border-[#16A34A] bg-[#EAF7EF]/60 dark:bg-emerald-950/30'
                            : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 opacity-70'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleChannel(ch.id)}
                          className="rounded border-zinc-300 text-[#127337] focus:ring-[#127337] mt-0.5 cursor-pointer"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-[#127337] dark:text-emerald-400 shrink-0" />
                            <span className="truncate">{ch.label}</span>
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">{ch.desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Step 4: Broadcast Content */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#127337] text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
                    4
                  </span>
                  <span className="text-xs font-extrabold text-zinc-950 dark:text-white">
                    Broadcast Content
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  {/* Headline */}
                  <div className="sm:col-span-5 space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Broadcast Headline <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-zinc-400 font-mono">{title.length}/100</span>
                    </div>
                    <div className="relative flex items-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 focus-within:border-[#127337]">
                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Mandatory National Identity Card (Ghana Card) Verification Notice"
                        className="w-full bg-transparent text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none pr-5 font-medium"
                      />
                      <Pencil className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    </div>
                  </div>

                  {/* Narrative */}
                  <div className="sm:col-span-7 space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Message Narrative <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-zinc-400 font-mono">{message.length}/500</span>
                    </div>
                    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden focus-within:border-[#127337]">
                      <textarea
                        ref={messageRef}
                        required
                        rows={3}
                        maxLength={500}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Provide precise operational guidelines, statutory timelines, or emergency instructions..."
                        className="w-full text-xs p-3 bg-transparent text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none leading-relaxed resize-none"
                      />
                      <div className="px-2.5 py-1.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1 text-zinc-500">
                        <button
                          type="button"
                          onClick={() => insertFormat('**', '**')}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                          title="Bold"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormat('_', '_')}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                          title="Italic"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormat('[Link](', ')')}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                          title="Insert Link"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormat('\n• ')}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                          title="Bullet List"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => insertFormat('\n1. ')}
                          className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                          title="Numbered List"
                        >
                          <ListOrdered className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirmation Box (when showConfirm is active) */}
              {showConfirm && (
                <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Confirm Mass Communication Dispatch</span>
                  </div>
                  <p className="text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed">
                    You are about to transmit this broadcast to{' '}
                    <strong>{currentAudienceCount.toLocaleString()} recipient(s)</strong> across channels:{' '}
                    <strong>{channels.join(', ')}</strong>. This action is permanently recorded in the immutable audit ledger.
                  </p>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN (5 cols): Live Mobile Preview & Reach Summary */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl bg-[#F7FAF8] dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800 p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-[#127337] dark:text-emerald-400" />
                    <span className="text-xs font-extrabold text-zinc-900 dark:text-white">
                      Live Preview
                    </span>
                  </div>

                  {/* In-App / Push Preview Toggle */}
                  <div className="inline-flex items-center p-0.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('IN_APP')}
                      className={clsx(
                        'px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer',
                        previewTab === 'IN_APP'
                          ? 'bg-[#127337] text-white'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                      )}
                    >
                      In-App
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('PUSH')}
                      className={clsx(
                        'px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer',
                        previewTab === 'PUSH'
                          ? 'bg-[#127337] text-white'
                          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                      )}
                    >
                      Push Preview
                    </button>
                  </div>
                </div>

                {/* iPhone Frame */}
                <div className="mx-auto max-w-[280px] rounded-[28px] border-[6px] border-zinc-900 bg-zinc-950 overflow-hidden shadow-xl">
                  {/* Status Bar */}
                  <div className="px-5 pt-2.5 pb-1.5 flex items-center justify-between text-[10px] font-bold text-white bg-[#0B2217]">
                    <span>9:41</span>
                    <div className="w-16 h-3.5 rounded-full bg-black" />
                    <div className="flex items-center gap-1">
                      <Signal className="w-2.5 h-2.5" />
                      <Wifi className="w-2.5 h-2.5" />
                      <Battery className="w-3 h-3" />
                    </div>
                  </div>

                  {/* Phone Screen Backdrop */}
                  <div className="relative bg-gradient-to-b from-[#0B291B] via-[#0F3322] to-[#081A11] p-3.5 min-h-[290px] flex flex-col justify-between">
                    <div className="space-y-3 relative z-10">
                      {/* App Header */}
                      <div className="flex items-center gap-2.5 pt-1">
                        <div className="w-8 h-8 rounded-lg bg-[#16A34A] flex items-center justify-center text-white shadow-xs shrink-0">
                          <Home className="w-4 h-4" />
                        </div>
                        <div className="text-white leading-tight">
                          <div className="text-xs font-extrabold">AkwaabaHomes</div>
                          <div className="text-[9.5px] text-emerald-200/80">Live &bull; Rent &bull; Belong</div>
                        </div>
                      </div>

                      {/* Floating Notification Card */}
                      <div className="rounded-2xl bg-white dark:bg-zinc-900 p-3.5 shadow-lg space-y-2 border border-white/60">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#EAF7EF] text-[#127337] flex items-center justify-center shrink-0">
                            <Megaphone className="w-4 h-4 -rotate-12" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-extrabold text-zinc-900 dark:text-white truncate">
                                {title.trim() ||
                                  (priority === 'URGENT'
                                    ? 'Urgent Alert'
                                    : priority === 'IMPORTANT'
                                      ? 'Important Update'
                                      : currentCatObj.label)}
                              </span>
                              <span className="text-[9.5px] text-zinc-400 shrink-0">
                                {previewTab === 'PUSH' ? 'now' : '2m ago'}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed mt-1 line-clamp-4 break-words">
                              {message.trim() ||
                                'The full broadcast narrative will render in user notification feeds and trigger instant push alerts.'}
                            </p>
                            <div className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-extrabold text-[#127337] dark:text-emerald-400">
                              <span>View Details</span>
                              <ArrowRight className="w-3 h-3" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Architecture Strip */}
                    <div className="mt-4 h-16 rounded-xl overflow-hidden relative opacity-85 border border-emerald-900/50">
                      <Image
                        src="/images/admin/notices-hero-banner.jpg"
                        alt="Preview backdrop"
                        fill
                        sizes="260px"
                        className="object-cover object-right"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Reach Summary Banner */}
              <div className="rounded-2xl bg-[#EAF7EF] dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 p-4 flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-full bg-[#127337] text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11.5px] font-semibold text-zinc-600 dark:text-emerald-200/80">
                    This broadcast will reach:
                  </p>
                  <p className="text-xl font-black text-[#127337] dark:text-emerald-300 leading-tight">
                    {currentAudienceCount.toLocaleString()} Users
                  </p>
                </div>
              </div>
            </div>
          </div>

          {scheduleOpen && (
            <div className="mt-4 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="font-bold text-zinc-700 dark:text-zinc-300">
                Optional Planned Window Note (logged with broadcast):
              </span>
              <input
                type="datetime-local"
                value={scheduledDateTime}
                onChange={(e) => setScheduledDateTime(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs"
              />
            </div>
          )}
        </form>

        {/* ── 3. MODAL FOOTER CONTROLS ── */}
        <div className="px-5 sm:px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            {showConfirm && (
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-3.5 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition cursor-pointer"
              >
                Back to Edit
              </button>
            )}

            <button
              type="button"
              onClick={() => setScheduleOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>Schedule for Later</span>
            </button>

            <button
              type="submit"
              form="broadcast-composer-form"
              disabled={submitting || !title.trim() || !message.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#127337] hover:bg-[#0E5E2C] text-white text-xs font-bold shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>
                {showConfirm
                  ? `Confirm & Transmit to ${currentAudienceCount.toLocaleString()} Users`
                  : `Review & Send (${currentAudienceCount.toLocaleString()} Users) →`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
