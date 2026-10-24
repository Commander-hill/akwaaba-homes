'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  Megaphone,
  Plus,
  Trash2,
  Users,
  AlertTriangle,
  Calendar,
  Building,
  Loader2,
  Info,
  BellRing,
  Search,
  Filter,
  CheckCircle2,
  Zap,
  Wrench,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useDialog } from '@/providers/DialogProvider';

interface NoticeItem {
  id: string;
  propertyId: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  property?: {
    id: string;
    title: string;
    location: string;
  };
}

export default function LandlordNoticesPage() {
  const queryClient = useQueryClient();
  const { confirm } = useDialog();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');

  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'landlord', 'mine'],
    queryFn: async () => {
      try {
        const res = await api.get('/properties/landlord/mine');
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const { data, isLoading } = useQuery<{ notices: NoticeItem[] }>({
    queryKey: ['compoundNotices', 'landlord'],
    queryFn: async () => {
      const res = await api.get('/compound-notices/landlord');
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/compound-notices/${id}`);
    },
    onSuccess: () => {
      toast.success('Resident announcement removed successfully.');
      queryClient.invalidateQueries({ queryKey: ['compoundNotices', 'landlord'] });
    },
    onError: () => {
      toast.error('Failed to delete notice. Please retry.');
    },
  });

  const handleDelete = async (id: string, title: string) => {
    const ok = await confirm({
      title: 'Delete Resident Announcement?',
      message: `Are you sure you want to retract "${title}"? Residents will no longer see this notice on their dashboard or gatehouse feed.`,
      confirmText: 'Retract Notice',
      cancelText: 'Keep',
      type: 'danger',
    });
    if (ok) {
      deleteMutation.mutate(id);
    }
  };

  const notices = data?.notices || [];

  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      if (selectedPropertyId !== 'ALL' && n.propertyId !== selectedPropertyId) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = (n.title || '').toLowerCase().includes(term);
        const matchMsg = (n.message || '').toLowerCase().includes(term);
        const matchProp = (n.property?.title || '').toLowerCase().includes(term);
        if (!matchTitle && !matchMsg && !matchProp) return false;
      }
      return true;
    });
  }, [notices, selectedPropertyId, searchTerm]);

  const properties = propertiesData || [];

  return (
    <div className="space-y-8 pb-16 animate-in fade-in">
      
      {/* ── HEADER BANNER ── */}
      <div className="p-6 md:p-8 rounded-3xl bg-zinc-950 text-white shadow-md relative overflow-hidden border border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#0F5132]/40 text-emerald-300 border border-emerald-500/30">
              <Megaphone className="w-3.5 h-3.5 text-emerald-400" />
              Resident Announcements &amp; Notices
            </span>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
              Compound Management
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
            <BellRing className="w-8 h-8 text-amber-400" />
            Resident Notices &amp; Announcements
          </h1>

          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
            Broadcast essential compound advisories directly to verified tenants—including ECG power outages, standby generator rosters, water tanker refills, fumigation dates, and gatehouse security rules.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10 w-full md:w-auto justify-end">
          <Link
            href="/dashboard/landlord/notices/new"
            className="flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] active:scale-95 text-white rounded-xl shadow-xs transition-all cursor-pointer w-full md:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Broadcast New Notice</span>
          </Link>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search announcements by title or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 pl-10 pr-3.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-zinc-950 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-[#0F5132]/20 focus:border-[#0F5132]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="h-10 px-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200 focus:outline-hidden"
          >
            <option value="ALL">All Properties ({properties.length})</option>
            {properties.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── NOTICES LIST ── */}
      {isLoading ? (
        <div className="min-h-[30vh] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-7 h-7 animate-spin text-[#0F5132] dark:text-emerald-400" />
          <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Loading published resident notices...
          </p>
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#12151D] border border-dashed border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center mx-auto">
            <Megaphone className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-zinc-950 dark:text-white">
              No Resident Notices Published Yet
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Keep your tenants informed of maintenance schedules, gatehouse rules, or water/power updates by broadcasting your first announcement.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard/landlord/notices/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Broadcast a Notice</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotices.map((notice) => (
            <div
              key={notice.id}
              className="p-5 rounded-3xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800/80 shadow-2xs space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      notice.priority === 'EMERGENCY'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : notice.priority === 'IMPORTANT'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    )}
                  >
                    {notice.priority}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {notice.category}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(notice.id, notice.title)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  title="Retract Notice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-zinc-950 dark:text-white leading-snug">
                  {notice.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line line-clamp-4">
                  {notice.message}
                </p>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                  <Building className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                  <span className="truncate font-semibold text-zinc-700 dark:text-zinc-300">
                    {notice.property?.title || 'Assigned Property'}
                  </span>
                </div>
                <span>
                  {new Date(notice.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
