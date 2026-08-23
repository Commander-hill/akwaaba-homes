'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Plus, Edit2, Trash2, CheckCircle, XCircle, BellRing, Megaphone, X, Hash, Sparkles, Type, Heading2, AlignLeft, Link as LinkIcon, Check } from 'lucide-react';

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

export default function AdminNoticesPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

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
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/notices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
    }
  });

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingNotice(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    saveMutation.mutate({
      orderIndex: parseInt(formData.get('orderIndex') as string) || 0,
      topLabel: (formData.get('topLabel') as string) || null,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      buttonText: (formData.get('buttonText') as string) || null,
      buttonLink: (formData.get('buttonLink') as string) || null,
      iconType: (formData.get('iconType') as string) || null,
      isActive: formData.get('isActive') === 'on'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Dynamic Notices</h1>
          <p className="text-[var(--muted-foreground)] mt-2">Manage broadcasts and alerts displayed to users.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold shadow-lg shadow-indigo-500/25 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Add Notice
        </button>
      </div>

      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#E06D53] uppercase text-[10px] tracking-wider font-extrabold text-white shadow-md">
            <tr>
              <th className="px-6 py-4 w-16 text-center text-white font-extrabold">Order</th>
              <th className="px-6 py-4 text-white font-extrabold">Title</th>
              <th className="px-6 py-4 text-white font-extrabold">Icon</th>
              <th className="px-6 py-4 text-white font-extrabold">Status</th>
              <th className="px-6 py-4 text-right text-white font-extrabold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {notices?.map((notice) => (
              <tr key={notice.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20">
                <td className="px-6 py-4 text-center font-mono font-bold text-[var(--muted-foreground)]">
                  {notice.orderIndex.toString().padStart(2, '0')}
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-[var(--foreground)]">{notice.title}</div>
                  <div className="text-xs text-[var(--muted-foreground)] truncate max-w-xs">{notice.description}</div>
                </td>
                <td className="px-6 py-4">
                  {notice.iconType || '-'}
                </td>
                <td className="px-6 py-4">
                  {notice.isActive ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-xs font-bold">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded-md text-xs font-bold">
                      <XCircle className="w-3 h-3" /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button onClick={() => handleEdit(notice)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => {
                      if(window.confirm('Are you sure you want to delete this notice?')) {
                        deleteMutation.mutate(notice.id);
                      }
                    }} 
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors inline-flex"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {notices?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[var(--muted-foreground)]">
                  No notices found. Create one to broadcast to users.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">

            {/* ── Gradient Header ── */}
            <div className="relative px-6 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-sky-600 overflow-hidden">
              {/* decorative glow orbs */}
              <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -left-4 -bottom-6 w-24 h-24 bg-purple-300/20 rounded-full blur-xl pointer-events-none" />

              <div className="relative flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner ring-1 ring-white/30">
                    <Megaphone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xl tracking-tight text-white leading-tight">
                      {editingNotice ? 'Edit Broadcast Notice' : 'Create Broadcast Notice'}
                    </h3>
                    <p className="text-xs text-indigo-100/80 mt-0.5">
                      Configure dynamic alert banners shown to tenants &amp; landlords.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Form Body ── */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">

              {/* Section 1 – Meta */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">
                      <Hash className="w-3.5 h-3.5 text-indigo-500" /> Order Priority
                    </label>
                    <input
                      type="number"
                      name="orderIndex"
                      defaultValue={editingNotice?.orderIndex || 0}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[var(--foreground)] outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" /> Icon Theme
                    </label>
                    <select
                      name="iconType"
                      defaultValue={editingNotice?.iconType || ''}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[var(--foreground)] outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-500 transition-all"
                    >
                      <option value="">None (Standard)</option>
                      <option value="CAUTION">⚠️ Caution / Warning</option>
                      <option value="PAYMENT">💳 Payment &amp; Fees</option>
                      <option value="INFO">ℹ️ General Announcement</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">
                    <Type className="w-3.5 h-3.5 text-sky-500" /> Top Tagline <span className="text-slate-400 normal-case font-medium">(optional small caps)</span>
                  </label>
                  <input
                    type="text"
                    name="topLabel"
                    defaultValue={editingNotice?.topLabel || ''}
                    placeholder="e.g. ONLINE BOOKING NOTICE"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[var(--foreground)] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              {/* Section 2 – Content */}
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">
                    <Heading2 className="w-3.5 h-3.5 text-indigo-500" /> Notice Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    defaultValue={editingNotice?.title}
                    placeholder="e.g. Strict Prohibition on Bed & Hostel Slot Reselling"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-[var(--foreground)] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1.5">
                    <AlignLeft className="w-3.5 h-3.5 text-purple-500" /> Detailed Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="description"
                    required
                    rows={3}
                    defaultValue={editingNotice?.description}
                    placeholder="Describe the rules, guidelines, or notice details for tenants..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-[var(--foreground)] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-500 transition-all resize-none"
                  ></textarea>
                </div>
              </div>

              {/* Section 3 – CTA */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  <LinkIcon className="w-3.5 h-3.5 text-sky-500" /> Call-to-Action Button <span className="text-slate-400 normal-case font-medium">(optional)</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="buttonText"
                    defaultValue={editingNotice?.buttonText || ''}
                    placeholder="Button label (e.g. View Guidelines)"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[var(--foreground)] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-500 transition-all"
                  />
                  <input
                    type="text"
                    name="buttonLink"
                    defaultValue={editingNotice?.buttonLink || ''}
                    placeholder="URL (e.g. /properties)"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-[var(--foreground)] placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              {/* Section 4 – Visibility Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <label htmlFor="isActive" className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 dark:text-emerald-300 block">
                      Broadcast Visibility
                    </label>
                    <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70">Make this notice visible to users immediately on save.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  defaultChecked={editingNotice ? editingNotice.isActive : true}
                  className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                />
              </div>

              {/* ── Footer Buttons ── */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="px-7 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-60 cursor-pointer"
                >
                  {saveMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <BellRing className="w-4 h-4" />
                  }
                  {editingNotice ? 'Update Notice' : 'Save & Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
