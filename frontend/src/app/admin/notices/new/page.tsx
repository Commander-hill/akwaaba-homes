'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import api from '@/lib/axios';
import {
  Megaphone,
  Send,
  Loader2,
  Check,
  Eye,
  Users,
  UserCheck,
  UserCog,
  UsersRound,
  Monitor,
  Smartphone,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  ImageIcon,
  MoreHorizontal,
  LayoutGrid,
  FileText,
  Settings,
  Calendar,
  Clock,
  AlertTriangle,
  Heart,
  CheckCircle2,
  Info,
  Save,
  Home,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { ICON_MAP, GHANA_TEMPLATES } from '@/components/admin/notices/NoticeDrawer';
import QueryErrorFallback from '@/components/ui/QueryErrorFallback';

const GHANA_REGIONS = [
  'All Ghana (Nationwide Broadcast)',
  'Greater Accra (Accra, Tema, Madina, Legon)',
  'Ashanti Region (Kumasi, KNUST Corridor)',
  'Central Region (Cape Coast, UCC Corridor)',
  'Western Region (Takoradi, Tarkwa)',
  'Eastern & Volta Regions',
  'Northern Regions (Tamale)',
];

type PriorityLevel = 'NORMAL' | 'IMPORTANT' | 'HIGH';

function AdminNoticeComposerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('editId');
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [previewMode, setPreviewMode] = useState<'DESKTOP' | 'MOBILE'>('DESKTOP');
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [showLinkInputs, setShowLinkInputs] = useState(false);

  // Notice fields
  const [topLabel, setTopLabel] = useState('PLATFORM ADVISORY');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [buttonText, setButtonText] = useState('Learn More');
  const [buttonLink, setButtonLink] = useState('/help');
  const [iconType, setIconType] = useState('INFO');
  const [orderIndex, setOrderIndex] = useState(1);

  // Targeting & Priority
  const [targetRole, setTargetRole] = useState<'ALL' | 'TENANT' | 'LANDLORD' | 'CARETAKER'>('ALL');
  const [targetRegion, setTargetRegion] = useState(GHANA_REGIONS[0]);
  const [priority, setPriority] = useState<PriorityLevel>('NORMAL');

  // Schedule & Publish
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // Load existing notice in edit mode
  const {
    data: notices,
    isLoading: isLoadingNotices,
    isError: isNoticesError,
    refetch: refetchNotices,
    isRefetching: isRefetchingNotices,
  } = useQuery({
    queryKey: ['admin-notices'],
    queryFn: async () => {
      const res = await api.get('/admin/notices');
      return res.data;
    },
    enabled: Boolean(editId),
  });

  useEffect(() => {
    if (editId && Array.isArray(notices)) {
      const existing = notices.find((n: any) => n.id === editId);
      if (existing) {
        setTopLabel(existing.topLabel || 'PLATFORM ADVISORY');
        setTitle(existing.title || '');
        setDescription(existing.description || '');
        setButtonText(existing.buttonText || '');
        setButtonLink(existing.buttonLink || '');
        setIconType(existing.iconType || 'INFO');
        setOrderIndex(existing.orderIndex || 1);
        setPublishImmediately(Boolean(existing.isActive));
        if (existing.targetAudience) setTargetRole(existing.targetAudience);
        if (existing.targetRegion) setTargetRegion(existing.targetRegion);
        if (existing.iconType === 'ALERT') setPriority('HIGH');
        else if (existing.iconType === 'BELL') setPriority('IMPORTANT');
        else setPriority('NORMAL');
      }
    }
  }, [editId, notices]);

  const saveMutation = useMutation({
    mutationFn: async (overrideActive?: boolean) => {
      const effectiveActive = overrideActive !== undefined ? overrideActive : publishImmediately;
      const payload = {
        orderIndex: Number(orderIndex) || 0,
        topLabel: topLabel.trim() || null,
        title: title.trim(),
        description: description.trim(),
        buttonText: buttonText.trim() || null,
        buttonLink: buttonLink.trim() || null,
        iconType: iconType || 'INFO',
        isActive: effectiveActive,
        targetAudience: targetRole,
        targetRegion,
      };

      if (editId) {
        return api.put(`/admin/notices/${editId}`, payload);
      }
      return api.post('/admin/notices', payload);
    },
    onSuccess: (_data, overrideActive) => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      queryClient.invalidateQueries({ queryKey: ['active-notices'] });
      const wasDraft = overrideActive === false || (!publishImmediately && overrideActive === undefined);
      toast.success(
        editId
          ? 'Announcement updated successfully!'
          : wasDraft
            ? 'Announcement saved as draft!'
            : 'Announcement published successfully!'
      );
      router.push('/admin/notices');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save announcement.');
    },
  });

  const handleApplyTemplate = (tmpl: (typeof GHANA_TEMPLATES)[0]) => {
    setTopLabel(tmpl.topLabel);
    setTitle(tmpl.title.slice(0, 100));
    setDescription(tmpl.description.slice(0, 1000));
    setButtonText(tmpl.buttonText);
    setButtonLink(tmpl.buttonLink);
    setIconType(tmpl.iconType);
    if (tmpl.iconType === 'ALERT') setPriority('HIGH');
    else if (tmpl.iconType === 'BELL') setPriority('IMPORTANT');
    else setPriority('NORMAL');
    setTemplateMenuOpen(false);
    toast.success(`Template loaded: "${tmpl.name}"`);
  };

  const insertFormat = (prefix: string, suffix = '') => {
    const el = textareaRef.current;
    if (!el) {
      setDescription((prev) => `${prev}${prefix}${suffix}`.slice(0, 1000));
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = description.slice(start, end);
    const updated =
      description.slice(0, start) + prefix + (selected || 'text') + suffix + description.slice(end);
    setDescription(updated.slice(0, 1000));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + (selected || 'text').length);
    }, 10);
  };

  const handlePriorityChange = (lvl: PriorityLevel) => {
    setPriority(lvl);
    if (lvl === 'HIGH') {
      setIconType('ALERT');
      setTopLabel('URGENT NOTICE');
    } else if (lvl === 'IMPORTANT') {
      setIconType('BELL');
      setTopLabel('IMPORTANT UPDATE');
    } else {
      setIconType('INFO');
      setTopLabel('PLATFORM ADVISORY');
    }
  };

  const handlePrimaryContinue = () => {
    if (step === 1) {
      if (!title.trim() || !description.trim()) {
        toast.error('Please enter both an Announcement Title and Message before continuing.');
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    if (!title.trim() || !description.trim()) {
      toast.error('Title and message are required.');
      return;
    }
    saveMutation.mutate(undefined);
  };

  const handleSaveDraft = () => {
    if (!title.trim() || !description.trim()) {
      toast.error('Please enter a title and message to save as draft.');
      return;
    }
    saveMutation.mutate(false);
  };

  const previewConfig = ICON_MAP[iconType] || ICON_MAP.INFO;
  const PreviewIcon = previewConfig.icon;

  const formattedPreviewDate = scheduledDate
    ? new Date(`${scheduledDate}T${scheduledTime || '10:30'}`).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  if (editId && isLoadingNotices) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#127337]" />
        <span className="text-xs font-semibold">Loading announcement data...</span>
      </div>
    );
  }

  if (editId && isNoticesError) {
    return (
      <div className="max-w-5xl mx-auto py-12">
        <QueryErrorFallback
          title="Unable to load announcement"
          onRetry={() => refetchNotices()}
          isRetrying={isRefetchingNotices}
        />
      </div>
    );
  }

  const audienceTiles = [
    { id: 'ALL' as const, label: 'All Users', sub: 'Everyone', icon: UsersRound },
    { id: 'TENANT' as const, label: 'Tenants', sub: 'Current Tenants', icon: Users },
    { id: 'LANDLORD' as const, label: 'Owners', sub: 'Property Owners', icon: UserCheck },
    { id: 'CARETAKER' as const, label: 'Specific Group', sub: 'Custom Selection', icon: UserCog },
  ];

  const steps = [
    { num: 1 as const, label: 'Content & Settings' },
    { num: 2 as const, label: 'Target Audience' },
    { num: 3 as const, label: 'Preview & Publish' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-20 text-zinc-900 dark:text-white animate-in">
      {/* ── 1. EDITORIAL HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#EBF7F0] via-[#F4FBF6] to-[#E3F4EA] dark:from-[#0C1F16] dark:via-[#10281D] dark:to-[#0C1E15] border border-emerald-200/70 dark:border-emerald-900/50 px-5 sm:px-8 py-6 sm:py-8 shadow-2xs">
        <div className="hidden md:block absolute inset-0 pointer-events-none select-none overflow-hidden">
          <Image
            src="/images/admin/notices-hero-banner.jpg"
            alt="Announcement Composer Illustration"
            fill
            sizes="100vw"
            priority
            className="object-cover object-center dark:opacity-35"
          />
        </div>

        <div className="relative z-10 flex items-center gap-4 sm:gap-5 md:pl-28 lg:pl-36 max-w-2xl">
          <div className="md:hidden w-12 h-12 rounded-2xl bg-[#DFF4E7] dark:bg-emerald-950/80 border border-emerald-300/60 dark:border-emerald-800/70 flex items-center justify-center shrink-0 shadow-2xs">
            <Megaphone className="w-6 h-6 text-[#127337] dark:text-emerald-400 -rotate-12" strokeWidth={2.1} />
          </div>

          <div className="min-w-0">
            <h1 className="text-xl sm:text-[26px] font-black text-zinc-950 dark:text-white tracking-tight leading-tight">
              {editId ? 'Edit Announcement' : 'Announcement Composer'}
            </h1>
            <p className="text-xs sm:text-[13.5px] text-zinc-600 dark:text-emerald-100/75 mt-1 leading-snug">
              Create and publish important notices for tenants and property owners across AkwaabaHomes.
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. CENTERED 3-STEP HORIZONTAL STEPPER ── */}
      <div className="flex items-center justify-center py-1">
        <div className="flex items-center w-full max-w-3xl gap-2 sm:gap-4 px-2">
          {steps.map((s, idx) => {
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <React.Fragment key={s.num}>
                {idx > 0 && (
                  <div
                    className={clsx(
                      'flex-1 h-px transition-colors',
                      step >= s.num ? 'bg-[#127337]/40' : 'bg-zinc-200 dark:bg-zinc-800'
                    )}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setStep(s.num)}
                  className="inline-flex items-center gap-2 text-xs sm:text-[13px] font-bold transition cursor-pointer shrink-0"
                >
                  <span
                    className={clsx(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold transition-colors',
                      isActive
                        ? 'bg-[#127337] text-white shadow-xs'
                        : isCompleted
                          ? 'bg-emerald-100 text-[#127337] dark:bg-emerald-950 dark:text-emerald-400'
                          : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    )}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </span>
                  <span
                    className={clsx(
                      isActive
                        ? 'text-[#127337] dark:text-emerald-400'
                        : isCompleted
                          ? 'text-zinc-800 dark:text-zinc-200'
                          : 'text-zinc-500 dark:text-zinc-400 font-semibold',
                      'hidden sm:inline'
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── 3. MAIN TOP WORKSPACE GRID (DETAILS / STEP CONTENT + LIVE PREVIEW) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT COLUMN (7 cols): Step-Specific Card */}
        <div className="lg:col-span-7 flex flex-col">
          {step === 1 && (
            <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs space-y-4 flex-1 flex flex-col">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#127337] dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-sm sm:text-base font-extrabold text-zinc-950 dark:text-white tracking-tight">
                  1. Announcement Details
                </h2>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Title <span className="text-rose-500">*</span>
                </label>
                <div className="relative flex items-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus-within:border-[#127337] focus-within:ring-2 focus-within:ring-emerald-500/15 transition">
                  <Megaphone className="w-4 h-4 text-zinc-400 ml-3.5 shrink-0 -rotate-12" />
                  <input
                    type="text"
                    maxLength={100}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a clear and concise title..."
                    className="w-full px-3 py-2.5 bg-transparent text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none"
                  />
                  <span className="text-[11px] font-medium text-zinc-400 pr-3.5 shrink-0 tabular-nums">
                    {title.length}/100
                  </span>
                </div>
              </div>

              {/* Message Editor */}
              <div className="space-y-1.5 flex-1 flex flex-col">
                <label className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Message <span className="text-rose-500">*</span>
                </label>

                <div className="relative rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-visible flex-1 flex flex-col focus-within:border-[#127337] focus-within:ring-2 focus-within:ring-emerald-500/15 transition">
                  {/* Formatting Toolbar */}
                  <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 bg-zinc-50/50 dark:bg-zinc-900/60 rounded-t-xl">
                    <div className="flex items-center gap-0.5 text-zinc-600 dark:text-zinc-300">
                      <button
                        type="button"
                        onClick={() => insertFormat('**', '**')}
                        title="Bold"
                        className="p-1.5 rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormat('_', '_')}
                        title="Italic"
                        className="p-1.5 rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormat('__', '__')}
                        title="Underline"
                        className="p-1.5 rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <Underline className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />

                      <button
                        type="button"
                        onClick={() => insertFormat('\n• ')}
                        title="Bulleted list"
                        className="p-1.5 rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => insertFormat('\n1. ')}
                        title="Numbered list"
                        className="p-1.5 rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <ListOrdered className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1 hidden sm:inline-block" />

                      <button
                        type="button"
                        onClick={() => toast.success('Left alignment active')}
                        title="Align left"
                        className="p-1.5 rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition cursor-pointer hidden sm:inline-flex"
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.success('Center alignment active')}
                        title="Align center"
                        className="p-1.5 rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition cursor-pointer hidden sm:inline-flex"
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toast.success('Right alignment active')}
                        title="Align right"
                        className="p-1.5 rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition cursor-pointer hidden sm:inline-flex"
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />

                      <button
                        type="button"
                        onClick={() => setShowLinkInputs((v) => !v)}
                        title="Attach Action Link / Button"
                        className={clsx(
                          'p-1.5 rounded-lg transition cursor-pointer',
                          showLinkInputs
                            ? 'bg-emerald-100 text-[#127337] dark:bg-emerald-950 dark:text-emerald-400'
                            : 'hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
                        )}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        title="Configure Icon & Region"
                        className="p-1.5 rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowLinkInputs((v) => !v)}
                        title="More options"
                        className="p-1.5 rounded-lg hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition cursor-pointer"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Use Template Button + Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setTemplateMenuOpen((v) => !v)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E9F7EF] hover:bg-[#D8F2E3] dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-[#127337] dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] font-bold transition cursor-pointer"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Use Template</span>
                      </button>

                      {templateMenuOpen && (
                        <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 shadow-xl z-30 p-2 space-y-1">
                          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            <span>Ghana Notice Templates</span>
                          </div>
                          {GHANA_TEMPLATES.map((tmpl) => (
                            <button
                              key={tmpl.name}
                              type="button"
                              onClick={() => handleApplyTemplate(tmpl)}
                              className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                            >
                              <div className="text-xs font-bold text-zinc-900 dark:text-white">
                                {tmpl.name}
                              </div>
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                {tmpl.title}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {showLinkInputs && (
                    <div className="px-3.5 py-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <input
                        type="text"
                        value={buttonText}
                        onChange={(e) => setButtonText(e.target.value)}
                        placeholder="CTA Button Label (e.g. Learn More)"
                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none"
                      />
                      <input
                        type="text"
                        value={buttonLink}
                        onChange={(e) => setButtonLink(e.target.value)}
                        placeholder="Link URL (e.g. /help)"
                        className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none font-mono"
                      />
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    rows={5}
                    maxLength={1000}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Write your announcement message here..."
                    className="w-full flex-1 p-3.5 bg-transparent text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 outline-none resize-none leading-relaxed"
                  />

                  <div className="px-3.5 pb-2.5 text-right text-[11px] font-medium text-zinc-400 tabular-nums">
                    {description.length}/1000
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs space-y-5 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#127337] dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-extrabold text-zinc-950 dark:text-white tracking-tight">
                    2. Regional Corridor &amp; Action Link Settings
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Back to Content
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-800 dark:text-zinc-200 block">
                    Target Region / University Corridor
                  </label>
                  <select
                    value={targetRegion}
                    onChange={(e) => setTargetRegion(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none focus:border-[#127337]"
                  >
                    {GHANA_REGIONS.map((reg) => (
                      <option key={reg} value={reg}>
                        {reg}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-800 dark:text-zinc-200 block">
                    Top Advisory Label
                  </label>
                  <input
                    type="text"
                    value={topLabel}
                    onChange={(e) => setTopLabel(e.target.value)}
                    placeholder="PLATFORM ADVISORY"
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none focus:border-[#127337] uppercase text-xs font-bold tracking-wider"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-800 dark:text-zinc-200 block">
                    CTA Button Label
                  </label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    placeholder="Learn More"
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none focus:border-[#127337]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-800 dark:text-zinc-200 block">
                    CTA Redirect Path / URL
                  </label>
                  <input
                    type="text"
                    value={buttonLink}
                    onChange={(e) => setButtonLink(e.target.value)}
                    placeholder="/help"
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 outline-none focus:border-[#127337] font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">
                  Banner Badge Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(ICON_MAP).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const active = iconType === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setIconType(key)}
                        className={clsx(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer',
                          active
                            ? 'bg-[#E9F7EF] border-[#16A34A] text-[#127337] dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 p-5 sm:p-6 shadow-2xs space-y-4 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#127337] dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-extrabold text-zinc-950 dark:text-white tracking-tight">
                    3. Final Broadcast Review
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Edit Targeting
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Target Audience
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-white mt-0.5 block">
                    {audienceTiles.find((a) => a.id === targetRole)?.label} ({audienceTiles.find((a) => a.id === targetRole)?.sub})
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Target Corridor
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-white mt-0.5 block truncate">
                    {targetRegion}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Display Priority
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-white mt-0.5 block">
                    {priority === 'HIGH' ? 'High Priority Alert' : priority === 'IMPORTANT' ? 'Important Notice' : 'Normal Advisory'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/70 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Publication Status
                  </span>
                  <span className="font-bold text-[#127337] dark:text-emerald-400 mt-0.5 block">
                    {publishImmediately ? 'Publish Immediately (Live)' : 'Scheduled / Draft Mode'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (5 cols): LIVE PREVIEW CARD */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xs space-y-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#127337] dark:text-emerald-400" />
                <h2 className="text-sm sm:text-base font-extrabold text-zinc-950 dark:text-white">
                  Live Preview
                </h2>
              </div>

              {/* Desktop / Mobile Segmented Switch */}
              <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPreviewMode('DESKTOP')}
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer',
                    previewMode === 'DESKTOP'
                      ? 'bg-[#127337] text-white shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  )}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('MOBILE')}
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer',
                    previewMode === 'MOBILE'
                      ? 'bg-[#127337] text-white shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  )}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            {/* Live Preview Card Container */}
            <div className="flex-1 flex items-center justify-center">
              <div
                className={clsx(
                  'rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-md transition-all duration-200',
                  previewMode === 'MOBILE' ? 'w-full max-w-[310px]' : 'w-full'
                )}
              >
                {/* Emerald Header Banner */}
                <div className="relative bg-gradient-to-br from-[#0F6332] via-[#127337] to-[#0A4723] px-5 py-5 text-white overflow-hidden">
                  <div className="flex items-center gap-3.5 relative z-10">
                    <div className="w-11 h-11 rounded-full bg-white text-[#127337] flex items-center justify-center shrink-0 shadow-sm">
                      <PreviewIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight leading-snug break-words">
                        {title.trim() || 'Your Announcement Title'}
                      </h3>
                      <p className="text-[11px] text-emerald-100/90 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{formattedPreviewDate}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* White Message Body */}
                <div className="p-5 bg-white dark:bg-zinc-950 space-y-3">
                  <div className="border-l-2 border-[#16A34A] pl-3.5">
                    <p className="text-xs sm:text-[13px] text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap break-words">
                      {description.trim() ||
                        'Your announcement message will appear here. This is a preview to help you see how it will look to users.'}
                    </p>
                  </div>
                  {buttonText.trim() && (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#127337] dark:text-emerald-400">
                        <span>{buttonText}</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Brand Strip */}
                <div className="px-5 py-3 bg-[#F6FAF7] dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1.5 font-extrabold text-zinc-900 dark:text-white">
                    <Home className="w-3.5 h-3.5 text-[#127337] dark:text-emerald-400" />
                    <span>AkwaabaHomes</span>
                  </span>
                  <span className="font-semibold text-zinc-500 dark:text-zinc-400">
                    Live &bull; Rent &bull; Belong
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. BOTTOM ROW: TARGETING + SCHEDULE + ACTION STACK ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Bottom Left (5 cols): 2. Display & Targeting Options */}
        <div className="lg:col-span-5 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#127337] dark:text-emerald-400" />
            <h2 className="text-sm font-extrabold text-zinc-950 dark:text-white">
              2. Display &amp; Targeting Options
            </h2>
          </div>

          {/* Select Target Audience */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
              <span>Select Target Audience</span>
              <Info className="w-3.5 h-3.5 text-zinc-400" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {audienceTiles.map((tile) => {
                const Icon = tile.icon;
                const active = targetRole === tile.id;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => setTargetRole(tile.id)}
                    className={clsx(
                      'p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition cursor-pointer',
                      active
                        ? 'bg-[#E9F7EF] dark:bg-emerald-950/50 border-[#16A34A] text-[#127337] dark:text-emerald-300 shadow-2xs'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-emerald-300'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-bold leading-tight">{tile.label}</span>
                    <span className="text-[9.5px] text-zinc-500 dark:text-zinc-400 leading-tight">
                      {tile.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Display Priority */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
              <span>Display Priority</span>
              <Info className="w-3.5 h-3.5 text-zinc-400" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePriorityChange('NORMAL')}
                className={clsx(
                  'py-2 px-2.5 rounded-xl border text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer',
                  priority === 'NORMAL'
                    ? 'bg-[#E9F7EF] border-[#16A34A] text-[#127337] dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Normal</span>
              </button>

              <button
                type="button"
                onClick={() => handlePriorityChange('IMPORTANT')}
                className={clsx(
                  'py-2 px-2.5 rounded-xl border text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer',
                  priority === 'IMPORTANT'
                    ? 'bg-amber-50 border-amber-400 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                )}
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Important</span>
              </button>

              <button
                type="button"
                onClick={() => handlePriorityChange('HIGH')}
                className={clsx(
                  'py-2 px-2.5 rounded-xl border text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer',
                  priority === 'HIGH'
                    ? 'bg-rose-100 border-rose-400 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/80 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 hover:bg-rose-100/70'
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>High Priority</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Center (4 cols): 3. Schedule & Publish */}
        <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#127337] dark:text-emerald-400" />
            <h2 className="text-sm font-extrabold text-zinc-950 dark:text-white">
              3. Schedule &amp; Publish
            </h2>
          </div>

          <div className="space-y-3">
            {/* Publish Immediately */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white">Publish Immediately</p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Make this notice visible right away
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={publishImmediately}
                onClick={() => setPublishImmediately(true)}
                className={clsx(
                  'w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer',
                  publishImmediately ? 'bg-[#127337]' : 'bg-zinc-300 dark:bg-zinc-700'
                )}
              >
                <span
                  className={clsx(
                    'absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform shadow-xs',
                    publishImmediately ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* OR Divider */}
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
              <span>OR</span>
              <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
            </div>

            {/* Schedule for Later */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-zinc-900 dark:text-white">Schedule for Later</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!publishImmediately}
                  onClick={() => setPublishImmediately(false)}
                  className={clsx(
                    'w-11 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer',
                    !publishImmediately ? 'bg-[#127337]' : 'bg-zinc-300 dark:bg-zinc-700'
                  )}
                >
                  <span
                    className={clsx(
                      'absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform shadow-xs',
                      !publishImmediately ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="relative flex items-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-2">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400 mr-1.5 shrink-0" />
                  <input
                    type="date"
                    disabled={publishImmediately}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    aria-label="Select date"
                    className="w-full bg-transparent text-[11px] text-zinc-700 dark:text-zinc-200 outline-none disabled:opacity-50"
                  />
                </div>
                <div className="relative flex items-center rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2.5 py-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-400 mr-1.5 shrink-0" />
                  <input
                    type="time"
                    disabled={publishImmediately}
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    aria-label="Select time"
                    className="w-full bg-transparent text-[11px] text-zinc-700 dark:text-zinc-200 outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Right (3 cols): Primary & Draft Action Buttons */}
        <div className="lg:col-span-3 flex flex-col justify-center gap-3">
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={handlePrimaryContinue}
            className="w-full py-3.5 px-5 rounded-xl bg-[#127337] hover:bg-[#0E5E2C] text-white text-xs sm:text-sm font-bold shadow-sm shadow-emerald-950/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>
              {step === 3
                ? editId
                  ? 'Save Announcement'
                  : 'Publish Announcement'
                : 'Preview & Continue →'}
            </span>
          </button>

          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={handleSaveDraft}
            className="w-full py-3 px-5 rounded-xl bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4 text-[#127337] dark:text-emerald-400" />
            <span>Save as Draft</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewAdminNoticePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#127337]" />
          <span className="text-xs font-semibold">Loading Notice Composer...</span>
        </div>
      }
    >
      <AdminNoticeComposerContent />
    </Suspense>
  );
}
