'use client';

import { useState } from 'react';
import { ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import api from '@/lib/axios';
import { useQuery } from '@tanstack/react-query';

export default function VerificationPage() {
  const [ghanaCardNumber, setGhanaCardNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const { data: session, refetch } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
  });

  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // Basic Ghana Card format validation GHA-XXXXXXXXX-X
    const regex = /^GHA-\d{9}-\d$/;
    if (!regex.test(ghanaCardNumber.toUpperCase())) {
      setMessage({ text: 'Invalid format. Use GHA-XXXXXXXXX-X', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    if (!frontImage || !backImage) {
      setMessage({ text: 'Please upload both front and back images of your Ghana Card', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. Upload Front Image
      const frontFormData = new FormData();
      frontFormData.append('document', frontImage);
      const frontRes = await api.post('/upload/document', frontFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const ghanaCardFrontUrl = frontRes.data.url;

      // 2. Upload Back Image
      const backFormData = new FormData();
      backFormData.append('document', backImage);
      const backRes = await api.post('/upload/document', backFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const ghanaCardBackUrl = backRes.data.url;

      // 3. Submit Verification
      await api.post('/auth/ghana-card', { 
        ghanaCardNumber: ghanaCardNumber.toUpperCase(),
        ghanaCardFrontUrl,
        ghanaCardBackUrl
      });
      
      setMessage({ text: 'Ghana Card submitted successfully! Awaiting admin approval.', type: 'success' });
      refetch(); // Refresh session to get updated ghanaCardStatus
    } catch (error: any) {
      setMessage({ text: error.response?.data?.message || 'Failed to submit Ghana Card', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Identity Verification</h1>
        <p className="mt-2 text-[var(--muted-foreground)]">Verify your identity using your Ghana Card to unlock premium features and build trust.</p>
      </div>

      <div className="glass-card rounded-3xl p-8 max-w-2xl border border-[var(--border)] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck className="w-48 h-48 text-[var(--primary)]" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className={`p-3 rounded-full ${
              session.ghanaCardStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
              session.ghanaCardStatus === 'PENDING' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
              session.ghanaCardStatus === 'REJECTED' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
              'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">Ghana Card Status</h2>
              <p className={`font-medium ${
                session.ghanaCardStatus === 'VERIFIED' ? 'text-emerald-500' :
                session.ghanaCardStatus === 'PENDING' ? 'text-amber-500' :
                session.ghanaCardStatus === 'REJECTED' ? 'text-red-500' :
                'text-[var(--muted-foreground)]'
              }`}>
                {session.ghanaCardStatus.replace('_', ' ')}
              </p>
            </div>
          </div>

          {(session.ghanaCardStatus === 'NOT_SUBMITTED' || session.ghanaCardStatus === 'REJECTED') ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 text-xs sm:text-sm space-y-1">
                <div className="font-extrabold flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                  <span>🛡️</span> Security & Credentials Safety Warning
                </div>
                <p className="leading-relaxed">
                  Your identity documents are stored safely using bank-grade encryption.
                  <strong className="text-pink-600 dark:text-pink-400"> Warning:</strong> Please double-check your Ghana Card PIN and uploaded images before submitting. Once submitted, your verification submission will be locked and cannot be edited. Only an administrator can grant access to resubmit.
                </p>
              </div>

              {message && (
                <div className={`p-4 rounded-xl text-sm font-medium border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-900/50 dark:text-emerald-400' : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30 dark:border-red-900/50 dark:text-red-400'}`}>
                  {message.text}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Personal ID Number (PIN)</label>
                <input 
                  type="text" 
                  required 
                  placeholder="GHA-123456789-0" 
                  className="block w-full px-4 py-3 border border-[var(--border)] rounded-xl bg-transparent focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all uppercase" 
                  value={ghanaCardNumber} 
                  onChange={(e) => setGhanaCardNumber(e.target.value)} 
                />
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">Format: GHA-XXXXXXXXX-X</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Front of ID</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    required 
                    className="block w-full text-sm text-[var(--muted-foreground)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary)]/10 file:text-[var(--primary)] hover:file:bg-[var(--primary)]/20 transition-all cursor-pointer" 
                    onChange={(e) => setFrontImage(e.target.files?.[0] || null)} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Back of ID</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    required 
                    className="block w-full text-sm text-[var(--muted-foreground)] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--primary)]/10 file:text-[var(--primary)] hover:file:bg-[var(--primary)]/20 transition-all cursor-pointer" 
                    onChange={(e) => setBackImage(e.target.files?.[0] || null)} 
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)] transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Submit for Verification <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900/50 border border-[var(--border)] p-6 rounded-2xl">
              <h3 className="font-bold text-[var(--foreground)] mb-2">Thank you!</h3>
              <p className="text-[var(--muted-foreground)] text-sm">
                Your Ghana Card has been submitted and is currently being reviewed by our administrative team. This process usually takes 24-48 hours.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
