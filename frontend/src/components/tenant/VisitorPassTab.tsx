'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  KeyRound, Plus, Trash2, Clock, User, Phone, 
  Copy, Check, AlertCircle, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface VisitorPass {
  id: string;
  propertyId: string;
  visitorName: string;
  visitorPhone: string | null;
  purpose: string | null;
  accessCode: string;
  validFrom: string;
  validUntil: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED';
  checkInTime: string | null;
  createdAt: string;
  property: {
    id: string;
    title: string;
    location: string;
  };
}

export default function VisitorPassTab({ bookings = [] }: { bookings?: any[] }) {
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ passes: VisitorPass[] }>({
    queryKey: ['visitorPasses', 'tenant'],
    queryFn: async () => {
      const res = await api.get('/visitor-passes');
      return res.data;
    }
  });

  const revokePassMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/visitor-passes/${id}/revoke`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Visitor pass revoked');
      queryClient.invalidateQueries({ queryKey: ['visitorPasses', 'tenant'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to revoke pass');
    }
  });

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('Gate PIN copied to clipboard!');
    setTimeout(() => setCopiedId(null), 3000);
  };

  const passes = data?.passes || [];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Digital Visitor & Gate Passes</h2>
            <p className="text-xs text-slate-500">Generate 1-time gate clearance PINs for guests, Bolt/Uber drivers, & delivery couriers</p>
          </div>
        </div>

        <Link
          href="/dashboard/tenant/visitors/new"
          className="px-4 py-2.5 bg-[var(--primary)] text-white text-sm font-bold rounded-xl flex items-center gap-2 hover:opacity-90 transition shadow-xs w-fit"
        >
          <Plus className="w-4 h-4" /> Generate Gate Pass
        </Link>
      </div>

      {isLoading ? (
        <div className="p-16 flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
        </div>
      ) : passes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center">
          <KeyRound className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Visitor Passes Generated</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Pre-authorize visitors or delivery drivers by generating a secure gate PIN they can present at the security checkpoint.
          </p>
          <Link
            href="/dashboard/tenant/visitors/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-500 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Generate First Gate Pass
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {passes.map((pass) => {
            const isExpired = new Date() > new Date(pass.validUntil);
            const isUsed = pass.status === 'USED';
            const isRevoked = pass.status === 'REVOKED';
            const isActive = pass.status === 'ACTIVE' && !isExpired;

            return (
              <div
                key={pass.id}
                className={clsx(
                  "bg-white dark:bg-slate-900 border rounded-2xl p-5 space-y-4 shadow-xs transition-all",
                  isActive ? "border-amber-500/40 hover:border-amber-500" : "border-slate-200 dark:border-slate-800 opacity-80"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span className={clsx(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                      isActive && "bg-emerald-500/10 text-emerald-600",
                      isUsed && "bg-blue-500/10 text-blue-600",
                      (isExpired || isRevoked) && "bg-red-500/10 text-red-600"
                    )}>
                      {isRevoked ? 'REVOKED' : isUsed ? 'CHECKED IN' : isExpired ? 'EXPIRED' : 'ACTIVE PIN'}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white pt-1">{pass.visitorName}</h4>
                    <p className="text-xs text-slate-400">{pass.purpose || 'Guest'}</p>
                  </div>

                  {isActive && (
                    <button
                      onClick={() => revokePassMutation.mutate(pass.id)}
                      disabled={revokePassMutation.isPending}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs cursor-pointer"
                      title="Revoke pass"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* PIN Box */}
                <div className="bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest block">Security Gate PIN</span>
                    <div className="text-xl font-black text-slate-900 dark:text-white tracking-widest font-mono">
                      {pass.accessCode}
                    </div>
                  </div>

                  <button
                    onClick={() => handleCopyCode(pass.accessCode, pass.id)}
                    className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-amber-600 shadow-xs cursor-pointer"
                  >
                    {copiedId === pass.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedId === pass.id ? 'Copied' : 'Copy PIN'}
                  </button>
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Valid Until:</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {new Date(pass.validUntil).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  {pass.checkInTime && (
                    <div className="flex items-center justify-between text-emerald-600">
                      <span>Checked In At:</span>
                      <span className="font-bold">
                        {new Date(pass.checkInTime).toLocaleTimeString([], { timeStyle: 'short' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
