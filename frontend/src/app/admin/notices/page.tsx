'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  BellRing, 
  Megaphone, 
  X, 
  Hash, 
  Radio, 
  Type, 
  Heading2, 
  AlignLeft, 
  Link as LinkIcon, 
  Check, 
  Scale, 
  CreditCard, 
  AlertTriangle, 
  BadgeCheck, 
  Info, 
  Clock, 
  Eye, 
  Search, 
  Wrench,
  ExternalLink,
  ArrowRight,
  FileText
} from 'lucide-react';
import { useDialog } from '@/providers/DialogProvider';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface Notice {
  id: string;
  orderIndex: number;
  topLabel: string | null;
  title: string;
  description: string;
  buttonText: string | null;
  buttonLink: string | null;
  iconType: string | null;
  isActive: boolean;
}

const ICON_MAP: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  INFO: { label: 'Information', icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50' },
  PAYMENT: { label: 'Payment & Escrow', icon: CreditCard, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
  CAUTION: { label: 'Caution & Warning', icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50' },
  WARNING: { label: 'Urgent Alert', icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50' },
  LEGAL: { label: 'Statutory & Act 220', icon: Scale, color: 'text-[#D97706]', bg: 'bg-amber-50 dark:bg-amber-950/50' },
  SECURITY: { label: 'Security & Verification', icon: BadgeCheck, color: 'text-[#0F5132] dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50' },
  MAINTENANCE: { label: 'Maintenance & Repairs', icon: Wrench, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/50' },
  MEGAPHONE: { label: 'General Announcement', icon: Megaphone, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/50' }
};

const GHANA_TEMPLATES = [
  {
    name: 'Act 220 Rent Advance Cap',
    topLabel: 'GHANA RENT ACT (ACT 220) COMPLIANCE',
    title: 'Statutory 6-Month Maximum Rent Advance Enforced',
    description: 'Under Section 25 of the Ghana Rent Act, 1963 (Act 220), landlords are strictly prohibited from demanding or receiving rent advances exceeding six (6) months for monthly tenancies. All platform escrow contracts automatically enforce this ceiling.',
    buttonText: 'Read Act 220 Guidance',
    buttonLink: '/legal/rent-act',
    iconType: 'LEGAL'
  },
  {
    name: 'Ghana Card NIA Verification',
    topLabel: 'MANDATORY STATUTORY KYC',
    title: 'Verify Your National Identity Card (Ghana Card)',
    description: 'To maintain a secure and fraud-free housing marketplace, all tenants and landlords must link their verified NIA Ghana Card. Unverified profiles will have lease application and property listing capabilities paused.',
    buttonText: 'Complete Identity KYC',
    buttonLink: '/dashboard/profile',
    iconType: 'SECURITY'
  },
  {
    name: 'Landlord Listing License (GH₵ 100)',
    topLabel: 'ANNUAL LISTING PERMIT',
    title: 'Renew Annual Property Listing Licenses (GH₵ 100/yr)',
    description: 'Landlords are reminded that annual listing permit licenses must be active to maintain public property visibility across Greater Accra, Ashanti, and nationwide regions on Akwaaba Homes.',
    buttonText: 'Manage Licenses',
    buttonLink: '/dashboard/landlord/subscriptions',
    iconType: 'PAYMENT'
  },
  {
    name: 'Rent Control Division Hours',
    topLabel: 'OFFICIAL ARBITRATION NOTICE',
    title: 'Rent Control Department Mediation Channel',
    description: 'Akwaaba Homes provides pre-dispute mediation for tenancy grievances. Cases unresolved within 7 business days are formally transmitted to the Ministry of Works & Housing Rent Control Division.',
    buttonText: 'File Dispute Docket',
    buttonLink: '/dashboard/tenant/disputes',
    iconType: 'LEGAL'
  }
];

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

export default function AdminNoticesPage() {
  const queryClient = useQueryClient();
  const { confirm } = useDialog();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Form & Live Preview State
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

  const { data: notices, isLoading } = useQuery({
    queryKey: ['admin-notices'],
    queryFn: async () => {
      const res = await api.get('/admin/notices');
      return res.data as Notice[];
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Notice>) => {
      if (editingNotice) {
        return api.put(`/admin/notices/${editingNotice.id}`, data);
      }
      return api.post('/admin/notices', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      setIsModalOpen(false);
      setEditingNotice(null);
      toast.success(editingNotice ? 'Notice updated successfully!' : 'Notice published successfully!');
    },
    onError: () => {
      toast.error('Failed to save announcement notice.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/notices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      toast.success('Notice deleted successfully.');
    },
    onError: () => {
      toast.error('Failed to delete notice.');
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return api.put(`/admin/notices/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      toast.success('Notice status updated!');
    }
  });

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setFormData({
      orderIndex: notice.orderIndex,
      topLabel: notice.topLabel || '',
      title: decodeHtmlEntities(notice.title),
      description: decodeHtmlEntities(notice.description),
      buttonText: notice.buttonText || '',
      buttonLink: notice.buttonLink || '',
      iconType: notice.iconType || 'INFO',
      isActive: notice.isActive
    });
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingNotice(null);
    setFormData({
      orderIndex: (notices?.length || 0) + 1,
      topLabel: 'STATUTORY ANNOUNCEMENT',
      title: '',
      description: '',
      buttonText: '',
      buttonLink: '',
      iconType: 'LEGAL',
      isActive: true
    });
    setIsModalOpen(true);
  };

  const handleApplyTemplate = (tmpl: typeof GHANA_TEMPLATES[0]) => {
    setFormData(prev => ({
      ...prev,
      topLabel: tmpl.topLabel,
      title: tmpl.title,
      description: tmpl.description,
      buttonText: tmpl.buttonText,
      buttonLink: tmpl.buttonLink,
      iconType: tmpl.iconType
    }));
    toast.success(`Applied template: "${tmpl.name}"`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Title and description are required.');
      return;
    }

    saveMutation.mutate({
      orderIndex: Number(formData.orderIndex) || 0,
      topLabel: formData.topLabel.trim() || null,
      title: formData.title.trim(),
      description: formData.description.trim(),
      buttonText: formData.buttonText.trim() || null,
      buttonLink: formData.buttonLink.trim() || null,
      iconType: formData.iconType || 'INFO',
      isActive: formData.isActive
    });
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = notices?.length || 0;
    const active = notices?.filter(n => n.isActive).length || 0;
    const statutory = notices?.filter(n => {
      const str = `${n.topLabel || ''} ${n.title} ${n.description}`.toLowerCase();
      return str.includes('act 220') || str.includes('rent act') || str.includes('kyc') || str.includes('statutory');
    }).length || 0;
    const withCta = notices?.filter(n => !!n.buttonText && !!n.buttonLink).length || 0;

    return { total, active, statutory, withCta };
  }, [notices]);

  // Filtering
  const filteredNotices = useMemo(() => {
    return (notices || []).filter((notice) => {
      if (statusFilter === 'ACTIVE' && !notice.isActive) return false;
      if (statusFilter === 'INACTIVE' && notice.isActive) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = decodeHtmlEntities(notice.title).toLowerCase().includes(term);
        const matchDesc = decodeHtmlEntities(notice.description).toLowerCase().includes(term);
        const matchLabel = (notice.topLabel || '').toLowerCase().includes(term);
        if (!matchTitle && !matchDesc && !matchLabel) return false;
      }

      return true;
    });
  }, [notices, statusFilter, searchTerm]);

  // Icon preview helper
  const previewIconConfig = ICON_MAP[formData.iconType] || ICON_MAP.INFO;
  const PreviewIcon = previewIconConfig.icon;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in">
      
      {/* Sticky Header & Toolbar */}
      <div className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md pt-2 pb-4 -mx-8 px-8 border-b border-slate-200/60 dark:border-slate-800/60 space-y-4 mb-6 shadow-xs">
        
        {/* Executive Banner */}
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900 text-white shadow-md relative overflow-hidden border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="relative z-10 space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                <Megaphone className="w-3.5 h-3.5 text-amber-500" />
                Public Notices &amp; Announcements
              </span>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-200 border border-amber-500/30">
                Ghana Rent Act (Act 220) Policy Disclosures
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <BellRing className="w-8 h-8 text-amber-500" />
              Platform Notices &amp; Announcements
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Compose and broadcast global announcement banners, statutory tenancy policy notices, and alerts across tenant, landlord, and public portals.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0 relative z-10 w-full md:w-auto justify-end">
            <Link
              href="/admin/notices/new"
              className="flex items-center justify-center gap-2 px-5 py-3 text-xs font-black bg-[#D97706] hover:bg-amber-600 active:scale-95 text-white rounded-xl shadow-lg transition-all cursor-pointer w-full md:w-auto border border-amber-400/30"
            >
              <Plus className="w-4 h-4" />
              Compose New Notice
            </Link>
          </div>
        </div>

        {/* 4 Executive KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Configured Notices</span>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Hash className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">{metrics.total}</span>
              <span className="text-[10px] font-bold text-slate-500">In Database</span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Platform announcement inventory</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Active Live Banners</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F5132] dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[#0F5132] dark:text-emerald-400">{metrics.active}</span>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                Broadcasting <Radio className="w-3 h-3 animate-pulse" />
              </span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Currently visible on website</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Statutory Policy Notices</span>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-[#D97706] border border-amber-100 dark:border-amber-900/40">
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[#D97706]">{metrics.statutory}</span>
              <span className="text-[10px] font-bold text-[#D97706]">Act 220 &amp; KYC</span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Statutory disclosures active</p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted-foreground)]">Action-Linked Banners</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 border border-blue-100 dark:border-blue-900/40">
                <LinkIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-[var(--foreground)]">{metrics.withCta}</span>
              <span className="text-[10px] font-bold text-blue-600">With CTA Button</span>
            </div>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-2 font-medium">Directing users to actions</p>
          </div>

        </div>

        {/* Filter Toolbar & Search */}
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xs">
          
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search announcements by title or keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/30 text-[var(--foreground)]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full md:w-auto">
            {[
              { id: 'ALL', label: 'All Notices' },
              { id: 'ACTIVE', label: 'Active Live Banners' },
              { id: 'INACTIVE', label: 'Draft / Inactive' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={clsx(
                  "px-3.5 py-1.5 text-xs font-extrabold rounded-lg transition-all capitalize cursor-pointer",
                  statusFilter === tab.id
                    ? "bg-[#0F5132] text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-[var(--foreground)]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" />
            <span className="text-xs font-bold text-slate-500">Syncing announcements...</span>
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-4">
              <Megaphone className="w-7 h-7" />
            </div>
            <h4 className="font-extrabold text-base text-[var(--foreground)]">No Announcements Found</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              No notices match your selected filter criteria. Click "Compose New Notice" or reset filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#0F5132] text-white uppercase text-[10px] tracking-wider font-extrabold shadow-sm">
                <tr>
                  <th className="px-6 py-4 w-16 text-center text-white font-extrabold">Order</th>
                  <th className="px-6 py-4 text-white font-extrabold">Visual Icon</th>
                  <th className="px-6 py-4 text-white font-extrabold">Announcement &amp; Top Label</th>
                  <th className="px-6 py-4 text-white font-extrabold">Call-to-Action Link</th>
                  <th className="px-6 py-4 text-white font-extrabold">Broadcast Status</th>
                  <th className="px-6 py-4 text-right text-white font-extrabold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredNotices.map((notice) => {
                  const iconCfg = ICON_MAP[notice.iconType || ''] || ICON_MAP.MEGAPHONE;
                  const IconComp = iconCfg.icon;

                  return (
                    <tr 
                      key={notice.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Order */}
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="font-mono text-xs font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-md">
                          #{notice.orderIndex.toString().padStart(2, '0')}
                        </span>
                      </td>

                      {/* Icon */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center border", iconCfg.bg, iconCfg.color, "border-slate-200 dark:border-slate-800")}>
                          <IconComp className="w-4 h-4" />
                        </div>
                      </td>

                      {/* Title & Description */}
                      <td className="px-6 py-4 max-w-md">
                        {notice.topLabel && (
                          <span className="inline-block text-[9px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 mb-1">
                            {notice.topLabel}
                          </span>
                        )}
                        <div className="font-extrabold text-[var(--foreground)] text-xs mb-0.5">
                          {decodeHtmlEntities(notice.title)}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed">
                          {decodeHtmlEntities(notice.description)}
                        </div>
                      </td>

                      {/* CTA */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {notice.buttonText && notice.buttonLink ? (
                          <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                            <span className="px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50">
                              {notice.buttonText}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">({notice.buttonLink})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">— No Link —</span>
                        )}
                      </td>

                      {/* Active Toggle */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => toggleActiveMutation.mutate({ id: notice.id, isActive: !notice.isActive })}
                          className={clsx(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer border",
                            notice.isActive
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-2xs hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:bg-slate-200"
                          )}
                        >
                          {notice.isActive ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-slate-400" />}
                          {notice.isActive ? 'Active Live' : 'Draft / Off'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(notice)}
                            className="p-2 text-slate-600 hover:text-white hover:bg-[#0F5132] rounded-lg transition-all cursor-pointer"
                            title="Edit Notice"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              const confirmed = await confirm({
                                title: 'Delete Announcement Notice',
                                message: 'Are you sure you want to permanently delete this announcement banner? This action cannot be undone.'
                              });
                              if (confirmed) {
                                deleteMutation.mutate(notice.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-all cursor-pointer"
                            title="Delete Notice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
          <span>Global Announcement Broadcast Layer</span>
          <span>Showing {filteredNotices.length} configured notices</span>
        </div>
      </div>

    </div>
  );
}
