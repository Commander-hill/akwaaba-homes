'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Users, 
  Building2, 
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
  Smartphone, 
  Loader2, 
  Eye, 
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';

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
  { id: 'GENERAL_ANNOUNCEMENT', label: 'General Alert', icon: BellRing, color: 'text-zinc-700 dark:text-zinc-300', bg: 'bg-zinc-100 dark:bg-zinc-800' }
];

export const GHANA_BROADCAST_PRESETS = [
  {
    name: 'Advance Rent Policy Advisory',
    target: 'ALL_LANDLORDS' as const,
    title: 'Standard Advance Rent Schedule Guidance',
    message: 'Platform policy recommends advance rent schedules up to 6 months for residential leases. All listing terms and payment requests should adhere to verified terms.',
    category: 'STATUTORY_ALERT'
  },
  {
    name: 'Mandatory Ghana Card KYC',
    target: 'ALL_USERS' as const,
    title: 'National Identity Card (Ghana Card) Mandatory',
    message: 'Under platform statutory compliance rules, all residents and property owners must link their NIA Ghana Card by the end of the current month to prevent lease freezes.',
    category: 'SECURITY_ADVISORY'
  },
  {
    name: 'Paystack & MoMo Gateway Maintenance',
    target: 'ALL_USERS' as const,
    title: 'Scheduled Payment Gateway Maintenance (1:00 AM - 3:00 AM)',
    message: 'Routine banking settlement maintenance scheduled for Mobile Money and Paystack channels. Active tenancies and lease renewals remain secure.',
    category: 'FINANCIAL_SETTLEMENT'
  },
  {
    name: 'Rainy Season & Drainage Safety Advisory',
    target: 'ALL_TENANTS' as const,
    title: 'Rainy Season Compound Safety & Drainage Notice',
    message: 'Tenants are advised to inspect perimeter drainage and report structural compound leaks immediately via the Maintenance Tickets portal.',
    category: 'MAINTENANCE_UPDATE'
  },
  {
    name: 'Annual Landlord Listing Permit Renewal',
    target: 'ALL_LANDLORDS' as const,
    title: 'Annual Landlord Listing Permit Renewal Active (GH₵ 100)',
    message: 'Ensure your GH₵ 100/yr property listing licenses are current to keep your residential listings visible to verified prospective tenants across Ghana.',
    category: 'FINANCIAL_SETTLEMENT'
  }
];

export default function BroadcastComposerModal({
  isOpen,
  onClose,
  initialData,
  onSuccess,
  audienceStats = { tenants: 0, landlords: 0, total: 0 }
}: BroadcastComposerModalProps) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Form States
  const [target, setTarget] = useState<'ALL_TENANTS' | 'ALL_LANDLORDS' | 'ALL_USERS'>('ALL_TENANTS');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<string>('STATUTORY_ALERT');
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
      setCategory('STATUTORY_ALERT');
      setPriority('NORMAL');
      setChannels(['IN_APP', 'SOCKET']);
    }
    setShowConfirm(false);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const currentAudienceCount = 
    target === 'ALL_TENANTS' ? audienceStats.tenants :
    target === 'ALL_LANDLORDS' ? audienceStats.landlords :
    audienceStats.total;

  const handleApplyPreset = (preset: typeof GHANA_BROADCAST_PRESETS[0]) => {
    setTarget(preset.target);
    setTitle(preset.title);
    setMessage(preset.message);
    setCategory(preset.category);
    toast.success(`Loaded preset: "${preset.name}"`);
  };

  const toggleChannel = (ch: 'IN_APP' | 'SOCKET' | 'EMAIL') => {
    setChannels((prev) => {
      if (prev.includes(ch)) {
        if (prev.length === 1) {
          toast.error('At least one delivery channel must be selected.');
          return prev;
        }
        return prev.filter((c) => c !== ch);
      }
      return [...prev, ch];
    });
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
        channels
      });

      toast.success(res.data?.message || `Broadcast dispatched to ${res.data?.count || currentAudienceCount} users!`);
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

  const currentCatObj = BROADCAST_CATEGORIES.find((c) => c.id === category) || BROADCAST_CATEGORIES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!submitting) onClose();
        }}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Communication Control Center
            </span>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Compose &amp; Dispatch Live Broadcast
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Preset Buttons */}
          <div className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
              Quick Ghana Regulatory Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {GHANA_BROADCAST_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 border border-zinc-200 dark:border-zinc-700 transition"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <form id="broadcast-composer-form" onSubmit={handleSubmit} className="space-y-5">
            
            {/* Section 1: Audience Targeting */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                1. Target Audience Segment
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'ALL_TENANTS' as const, label: 'All Tenants', count: audienceStats.tenants, icon: Users },
                  { id: 'ALL_LANDLORDS' as const, label: 'All Landlords', count: audienceStats.landlords, icon: Building2 },
                  { id: 'ALL_USERS' as const, label: 'Entire Network', count: audienceStats.total, icon: Globe }
                ].map((aud) => {
                  const Icon = aud.icon;
                  const isSelected = target === aud.id;
                  return (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() => setTarget(aud.id)}
                      className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold shadow-xs'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-zinc-500" />
                      <span className="text-xs">{aud.label}</span>
                      <span className="text-[10px] text-zinc-400">
                        {aud.count} Addressable
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Severity & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                  Category &amp; Topic
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {BROADCAST_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                  Urgency Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="NORMAL">Normal Priority</option>
                  <option value="IMPORTANT">Important Notice</option>
                  <option value="URGENT">Urgent Emergency</option>
                </select>
              </div>
            </div>

            {/* Section 3: Delivery Channels */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Delivery Channels
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'IN_APP' as const, label: 'In-App Notification', desc: 'Saved in user bell inbox', icon: BellRing },
                  { id: 'SOCKET' as const, label: 'Real-Time Alert', desc: 'Instant device push', icon: Radio },
                  { id: 'EMAIL' as const, label: 'Official Email', desc: 'Nodemailer institutional email', icon: Mail }
                ].map((ch) => {
                  const Icon = ch.icon;
                  const isChecked = channels.includes(ch.id);
                  return (
                    <label
                      key={ch.id}
                      onClick={() => toggleChannel(ch.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                        isChecked
                          ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                      />
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-zinc-900 dark:text-white flex items-center gap-1">
                          <Icon className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{ch.label}</span>
                        </div>
                        <div className="text-[10px] text-zinc-400">{ch.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Section 4: Title & Message Body */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                    Broadcast Headline *
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">{title.length}/100</span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mandatory National Identity Card (Ghana Card) Verification Notice"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                    Message Narrative *
                  </label>
                  <span className="text-[10px] text-zinc-400 font-mono">{message.length}/500</span>
                </div>
                <textarea
                  required
                  rows={4}
                  maxLength={500}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide precise operational guidelines, statutory timelines, or emergency instructions..."
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                />
              </div>
            </div>

            {/* Section 5: Live Recipient Notification Preview */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Recipient In-App Notification Preview</span>
              </span>
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      AkwaabaHomes Official
                    </span>
                    <span className="text-[10px] text-zinc-400">• Just Now</span>
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-400">
                    {currentCatObj.label}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  {title || 'Announcement Title Preview'}
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                  {message || 'The full broadcast narrative will render in user notification feeds and trigger push alerts...'}
                </p>
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
                  You are about to transmit this broadcast to <strong>{currentAudienceCount} recipient(s)</strong> across channels: <strong>{channels.join(', ')}</strong>. This action is permanently recorded in the immutable audit ledger.
                </p>
              </div>
            )}

          </form>

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {showConfirm && (
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
              >
                Back to Edit
              </button>
            )}

            <button
              type="submit"
              form="broadcast-composer-form"
              disabled={submitting || !title.trim() || !message.trim()}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>
                {showConfirm
                  ? `Confirm & Transmit to ${currentAudienceCount} Users`
                  : `Review & Send (${currentAudienceCount} Users)`}
              </span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
