'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import Link from 'next/link';
import { 
  Megaphone, Plus, Trash2, Users, AlertTriangle, 
  Calendar, Building, Loader2, Info, BellRing
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { useDialog } from '@/providers/DialogProvider';

interface NoticeItem {
  id: string;
  propertyId: string;
  title: string;
  message: string;
  category: 'UTILITY' | 'EVENT' | 'MAINTENANCE' | 'SECURITY' | 'GENERAL' | string;
  priority: 'NORMAL' | 'IMPORTANT' | 'EMERGENCY' | string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  property: {
    id: string;
    title: string;
    location: string;
  };
}

export default function CompoundNoticeTab({ properties = [] }: { properties?: any[] }) {
  const queryClient = useQueryClient();
  const { confirm } = useDialog();

  // Fallback query to guarantee live landlord properties list
  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'landlord', 'mine'],
    queryFn: async () => {
      try {
        const res = await api.get('/properties/landlord/mine');
        return res.data?.data || [];
      } catch {
        return [];
      }
    }
  });

  const rawProps = (propertiesData && propertiesData.length > 0) ? propertiesData : properties;
  const propertyList = rawProps.map((p: any) => ({
    id: p.id || p.propertyId,
    title: p.title || p.propertyTitle || 'Property',
    location: p.location || p.propertyLocation || ''
  })).filter((p: any) => Boolean(p.id));

  const { data, isLoading } = useQuery<{ notices: NoticeItem[] }>({
    queryKey: ['compoundNotices', 'landlord'],
    queryFn: async () => {
      const res = await api.get('/compound-notices/landlord');
      return res.data;
    }
  });

  const deleteNoticeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/compound-notices/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Notice removed');
      queryClient.invalidateQueries({ queryKey: ['compoundNotices', 'landlord'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete notice');
    }
  });

  const notices = (data?.notices || []).filter(
    (n: any) => n && !n.title?.startsWith('__') && n.category !== 'ASSET_INVENTORY'
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Compound Notice Board</h2>
            <p className="text-xs text-slate-500">Broadcast building announcements & utility alerts directly to resident dashboards</p>
          </div>
        </div>

        <Link
          href="/dashboard/landlord/notices/new"
          className="px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Broadcast Announcement
        </Link>
      </div>

      {isLoading ? (
        <div className="p-16 flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : notices.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <BellRing className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No active compound announcements</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Publish maintenance advisories, power/water updates, or compound rules to alert all active tenants.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notices.map((notice) => {
            const isEmergency = notice.priority === 'EMERGENCY';
            const isImportant = notice.priority === 'IMPORTANT';

            return (
              <div
                key={notice.id}
                className={clsx(
                  "p-5 rounded-2xl border space-y-3 bg-white dark:bg-slate-900 shadow-xs transition relative",
                  isEmergency && "border-red-500/40 bg-red-500/5",
                  isImportant && "border-amber-500/40 bg-amber-500/5",
                  !isEmergency && !isImportant && "border-slate-200 dark:border-slate-800"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx(
                      "px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase",
                      isEmergency && "bg-red-500 text-white",
                      isImportant && "bg-amber-500 text-white",
                      !isEmergency && !isImportant && "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    )}>
                      {notice.priority}
                    </span>
                    <span className="px-2.5 py-0.5 bg-[var(--primary)]/10 text-[var(--primary)] text-[11px] font-bold rounded-full">
                      {notice.category}
                    </span>
                  </div>

                  <button
                    onClick={async () => {
                      const shouldDelete = await confirm({
                        title: 'Remove Compound Notice',
                        message: 'Are you sure you want to remove this notice? It will no longer be visible to tenants.',
                        confirmText: 'Remove Notice',
                        type: 'danger',
                      });
                      if (shouldDelete) {
                        deleteNoticeMutation.mutate(notice.id);
                      }
                    }}
                    disabled={deleteNoticeMutation.isPending}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Remove notice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-snug">{notice.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                    {notice.message}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Building className="w-3.5 h-3.5" /> {notice.property?.title}
                  </span>
                  <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}


    </div>
  );
}
