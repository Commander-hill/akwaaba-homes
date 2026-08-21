'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';

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
          className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold shadow-md transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Notice
        </button>
      </div>

      <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border)] uppercase text-[10px] tracking-wider font-bold text-slate-500">
            <tr>
              <th className="px-6 py-4 w-16 text-center">Order</th>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Icon</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-950 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-[var(--border)]">
            <div className="px-6 py-4 border-b border-[var(--border)] flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-lg">{editingNotice ? 'Edit Notice' : 'Create Notice'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Order Index (Number)</label>
                  <input type="number" name="orderIndex" defaultValue={editingNotice?.orderIndex || 0} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-900 border-[var(--border)] outline-none focus:border-[var(--primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Icon Type</label>
                  <select name="iconType" defaultValue={editingNotice?.iconType || ''} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-900 border-[var(--border)] outline-none focus:border-[var(--primary)]">
                    <option value="">None</option>
                    <option value="CAUTION">Caution</option>
                    <option value="PAYMENT">Payment</option>
                    <option value="INFO">Info</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Top Label (Optional small caps)</label>
                <input type="text" name="topLabel" defaultValue={editingNotice?.topLabel || ''} placeholder="e.g. ONLINE BOOKING" className="w-full px-3 py-2 border rounded-xl dark:bg-slate-900 border-[var(--border)] outline-none focus:border-[var(--primary)]" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input type="text" name="title" required defaultValue={editingNotice?.title} placeholder="e.g. Strict Prohibition on Bed Sales" className="w-full px-3 py-2 border rounded-xl dark:bg-slate-900 border-[var(--border)] outline-none focus:border-[var(--primary)]" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea name="description" required rows={3} defaultValue={editingNotice?.description} className="w-full px-3 py-2 border rounded-xl dark:bg-slate-900 border-[var(--border)] outline-none focus:border-[var(--primary)]"></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Button Text (Optional)</label>
                  <input type="text" name="buttonText" defaultValue={editingNotice?.buttonText || ''} placeholder="e.g. Checkout Rooms" className="w-full px-3 py-2 border rounded-xl dark:bg-slate-900 border-[var(--border)] outline-none focus:border-[var(--primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Button Link (Optional)</label>
                  <input type="text" name="buttonLink" defaultValue={editingNotice?.buttonLink || ''} placeholder="e.g. /properties" className="w-full px-3 py-2 border rounded-xl dark:bg-slate-900 border-[var(--border)] outline-none focus:border-[var(--primary)]" />
                </div>
              </div>

              <div className="flex items-center pt-2">
                <input type="checkbox" id="isActive" name="isActive" defaultChecked={editingNotice ? editingNotice.isActive : true} className="w-4 h-4 text-[var(--primary)] border-[var(--border)] rounded" />
                <label htmlFor="isActive" className="ml-2 text-sm font-medium text-[var(--foreground)]">Notice is Active (Visible to users)</label>
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-[var(--border)] text-[var(--foreground)] rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-900">
                  Cancel
                </button>
                <button type="submit" disabled={saveMutation.isPending} className="px-6 py-2 bg-[var(--primary)] text-white rounded-xl font-medium hover:opacity-90 flex items-center gap-2">
                  {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
