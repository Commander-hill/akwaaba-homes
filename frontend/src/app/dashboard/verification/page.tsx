'use client';

import { useState } from 'react';
import { ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import api from '@/lib/axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function VerificationPage() {
  const queryClient = useQueryClient();
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

  // Landlord verification state
  const [landlordDoc, setLandlordDoc] = useState<File | null>(null);
  const [isSubmittingLandlord, setIsSubmittingLandlord] = useState(false);
  const [landlordMsg, setLandlordMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const uploadDoc = async (file: File) => {
    const formData = new FormData();
    formData.append('document', file);
    const res = await api.post('/upload/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data.url;
  };

  const handleLandlordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingLandlord(true);
    setLandlordMsg(null);

    if (!landlordDoc) {
      setLandlordMsg({ text: 'Please select a Property Ownership Deed or Business Reg Document', type: 'error' });
      setIsSubmittingLandlord(false);
      return;
    }

    try {
      const landlordDocUrl = await uploadDoc(landlordDoc);
      const frontUrl = frontImage ? await uploadDoc(frontImage) : session?.ghanaCardFrontUrl;
      const backUrl = backImage ? await uploadDoc(backImage) : session?.ghanaCardBackUrl;

      await api.post('/auth/landlord-verification', {
        ghanaCardNumber: ghanaCardNumber || session?.ghanaCardNumber || 'GHA-000000000-0',
        ghanaCardFrontUrl: frontUrl || 'N/A',
        ghanaCardBackUrl: backUrl || 'N/A',
        landlordDocUrl
      });

      setLandlordMsg({ text: 'Landlord Verification submitted! Admin review in progress.', type: 'success' });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['session'] });
    } catch (err: any) {
      setLandlordMsg({ text: err.response?.data?.message || 'Failed to submit landlord verification', type: 'error' });
    } finally {
      setIsSubmittingLandlord(false);
    }
  };

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
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
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
                Your Ghana Card has been submitted and is currently being reviewed by our administrative team.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* LANDLORD VERIFIED BLUE BADGE SECTION */}
      {session.role === 'LANDLORD' && (
        <div className="glass-card rounded-3xl p-8 max-w-2xl border-2 border-blue-500/40 relative overflow-hidden bg-gradient-to-br from-blue-50/50 to-indigo-50/30 dark:from-slate-900 dark:to-indigo-950/40">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-md">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[var(--foreground)] flex items-center gap-2">
                  "Verified Landlord" Blue Badge 🛡️
                </h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Upload your Property Deed / Business Reg to earn a verified host badge across all your listings.
                </p>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              session.isVerifiedLandlord ? 'bg-blue-600 text-white' :
              session.landlordVerificationStatus === 'PENDING' ? 'bg-amber-500 text-white' :
              'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}>
              {session.isVerifiedLandlord ? 'VERIFIED HOST 🛡️' : session.landlordVerificationStatus || 'UNVERIFIED'}
            </div>
          </div>

          {session.isVerifiedLandlord ? (
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-blue-200 text-sm font-semibold flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                Congratulations! You hold a Verified Landlord Blue Badge 🛡️. Students see your verified trust badge on all your properties.
              </div>
            </div>
          ) : (
            <form onSubmit={handleLandlordSubmit} className="space-y-4">
              {landlordMsg && (
                <div className={`p-4 rounded-xl text-sm font-medium border ${landlordMsg.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {landlordMsg.text}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-[var(--foreground)] mb-2">
                  Property Ownership Document / Business Deed
                </label>
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  required 
                  className="block w-full text-sm text-[var(--muted-foreground)] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all cursor-pointer bg-white dark:bg-slate-900 p-2 rounded-xl border border-[var(--border)]" 
                  onChange={(e) => setLandlordDoc(e.target.files?.[0] || null)} 
                />
                <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                  Accepted formats: Images or PDF documents proving ownership or authorization.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmittingLandlord}
                className="flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmittingLandlord ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Request Verified Host Badge 🛡️ <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
