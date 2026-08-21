'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Star, User, Home, Trash2, Flag, ShieldCheck, MessageSquare } from 'lucide-react';
import { useState } from 'react';

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [appealNote, setAppealNote] = useState('');
  const [appealTarget, setAppealTarget] = useState<string | null>(null);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const res = await api.get('/admin/reviews');
      return res.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/admin/reviews/${id}`); },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
  });

  const appealMutation = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: string }) => {
      await api.put(`/admin/reviews/${id}/appeal`, { decision, moderationNote: appealNote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      setAppealTarget(null);
      setAppealNote('');
    }
  });

  const flagMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.put(`/reviews/${id}/flag`, { reason: 'Flagged by admin' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;

  const flaggedReviews = reviews?.filter((r: any) => r.isFlagged || r.appealStatus === 'PENDING') || [];
  const normalReviews = reviews?.filter((r: any) => !r.isFlagged && r.appealStatus !== 'PENDING') || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Review Management</h1>
          <p className="mt-2 text-[var(--muted-foreground)]">Moderate reviews, resolve disputes, and manage appeals.</p>
        </div>
        <div className="p-3 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full">
          <Star className="w-8 h-8" />
        </div>
      </div>

      {/* Reputation Methodology Info */}
      <div className="glass-card p-6 rounded-2xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/10">
        <h3 className="font-bold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Reputation Scoring Methodology</h3>
        <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
          Reputation scores are calculated as the <strong>average of all verified, non-moderated ratings</strong> submitted for completed stays only. 
          Flagged or admin-moderated reviews are excluded from the calculation to prevent abuse. 
          Scores range from 1.0–5.0. Tenants begin with a default of 5.0 and scores are recalculated automatically after each new verified review or appeal resolution.
        </p>
      </div>

      {/* Flagged / Pending Appeals */}
      {flaggedReviews.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Flag className="w-5 h-5 text-red-500" /> Flagged / Pending Appeals ({flaggedReviews.length})</h2>
          <div className="space-y-4">
            {flaggedReviews.map((review: any) => (
              <div key={review.id} className="glass-card rounded-2xl border border-red-200 dark:border-red-900/30 p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold flex items-center gap-2"><User className="w-4 h-4 text-[var(--primary)]" />{review.author.firstName} {review.author.lastName}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{review.author.email}</div>
                  </div>
                  <div className="flex text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-amber-500' : 'text-slate-300 dark:text-slate-700'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mb-2 italic">"{review.comment}"</p>
                {review.moderationNote && <p className="text-xs text-red-600 dark:text-red-400 mb-2">Flag reason: {review.moderationNote}</p>}
                {review.appealNote && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl mb-3 text-sm border border-blue-100 dark:border-blue-900/30">
                    <span className="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1 mb-1"><MessageSquare className="w-4 h-4" /> Tenant Appeal:</span>
                    <p className="text-blue-600 dark:text-blue-400">{review.appealNote}</p>
                  </div>
                )}
                {review.appealStatus === 'PENDING' && (
                  <div className="space-y-2 mt-3 pt-3 border-t border-[var(--border)]">
                    {appealTarget === review.id ? (
                      <div className="space-y-2">
                        <textarea
                          placeholder="Admin note (optional)..."
                          value={appealNote}
                          onChange={(e) => setAppealNote(e.target.value)}
                          className="w-full text-sm p-3 border border-[var(--border)] rounded-xl bg-transparent resize-none h-20"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => appealMutation.mutate({ id: review.id, decision: 'ACCEPTED' })} className="flex-1 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">Accept Appeal</button>
                          <button onClick={() => appealMutation.mutate({ id: review.id, decision: 'REJECTED' })} className="flex-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold">Reject Appeal</button>
                          <button onClick={() => setAppealTarget(null)} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setAppealTarget(review.id)} className="text-xs font-bold text-blue-600 hover:underline">Resolve This Appeal →</button>
                    )}
                  </div>
                )}
                <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                  <button onClick={() => deleteMutation.mutate(review.id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold">Delete Review</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Reviews Table */}
      <div>
        <h2 className="text-lg font-bold mb-4">All Reviews</h2>
        <div className="glass-card rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-[var(--muted-foreground)] uppercase bg-slate-50 dark:bg-slate-900/80 border-b border-[var(--border)]">
                <tr>
                  <th className="px-6 py-4 font-medium">Reviewer</th>
                  <th className="px-6 py-4 font-medium">Property</th>
                  <th className="px-6 py-4 font-medium">Rating</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Comment</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {reviews?.map((review: any) => (
                  <tr key={review.id} className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors ${review.isFlagged ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-bold text-[var(--foreground)] flex items-center gap-2"><User className="w-3 h-3 text-[var(--primary)]" /> {review.author.firstName} {review.author.lastName}</div>
                      <div className="text-xs text-[var(--muted-foreground)] mt-1">{review.author.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-[var(--foreground)] flex items-center gap-1"><Home className="w-3 h-3 text-slate-500" /> {review.booking?.property?.title || 'Unknown Property'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-amber-500' : 'text-slate-300 dark:text-slate-700'}`} />
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {review.isFlagged ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-bold"><Flag className="w-3 h-3" />Flagged</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold"><ShieldCheck className="w-3 h-3" />Published</span>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-xs text-[var(--muted-foreground)]" title={review.comment}>{review.comment || 'No comment'}</td>
                    <td className="px-6 py-4 text-xs text-[var(--muted-foreground)]">{new Date(review.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {!review.isFlagged && (
                          <button onClick={() => flagMutation.mutate(review.id)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg" title="Flag Review"><Flag className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => { if (confirm('Delete this review?')) deleteMutation.mutate(review.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete Review"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {reviews?.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-[var(--muted-foreground)]">No reviews found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
