'use client';

import React, { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, FileSignature, CheckCircle, Printer, AlertTriangle, XCircle, PenTool } from 'lucide-react';
import SignaturePad from '@/components/SignaturePad';
import toast from 'react-hot-toast';

export default function AgreementPage() {
  const { id: bookingId } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [showSignModal, setShowSignModal] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  // Fetch agreement details
  const { data, isLoading, error } = useQuery({
    queryKey: ['agreement', bookingId],
    queryFn: async () => {
      const { data } = await api.get(`/agreements/booking/${bookingId}`);
      return data;
    },
  });

  // Fetch current user
  const { data: userResponse } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const { data } = await api.get('/auth/me');
      return data;
    },
  });

  const currentUser = userResponse?.user;

  const signMutation = useMutation({
    mutationFn: async (signature: string) => {
      await api.post(`/agreements/booking/${bookingId}/sign`, { signature });
    },
    onSuccess: () => {
      setShowSignModal(false);
      queryClient.invalidateQueries({ queryKey: ['agreement', bookingId] });
      toast.success('Digital signature attached & verified!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit signature');
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass-card rounded-2xl p-8 border border-red-500/20 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-[var(--foreground)]">Agreement Not Found</h2>
        <p className="text-[var(--muted-foreground)]">This agreement might not exist yet or you do not have permission to view it.</p>
      </div>
    );
  }

  const { agreement, landlord } = data;
  const { booking } = agreement;
  const { property, tenant } = booking;

  // Check signature status based on role
  const isTenant = currentUser?.role === 'TENANT';
  const isLandlord = currentUser?.role === 'LANDLORD';
  
  const hasTenantSigned = !!agreement.tenantSignature;
  const hasLandlordSigned = !!agreement.landlordSignature;

  const iHaveSigned = (isTenant && hasTenantSigned) || (isLandlord && hasLandlordSigned);
  const isFullySigned = hasTenantSigned && hasLandlordSigned;

  const handleSaveSignature = (base64: string) => {
    setSignatureData(base64);
  };

  const handleConfirmSignature = () => {
    if (!signatureData) {
      toast.error('Please sign the canvas pad first.');
      return;
    }
    signMutation.mutate(signatureData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in pb-12">
      
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">Tenancy Agreement</h1>
          <p className="text-[var(--muted-foreground)] mt-1 flex items-center gap-2">
            Status: 
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isFullySigned ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
              {isFullySigned ? 'COMPLETED' : 'PENDING SIGNATURES'}
            </span>
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-[var(--foreground)] rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print PDF
          </button>
          {!iHaveSigned && (
            <button 
              onClick={() => setShowSignModal(true)}
              className="flex items-center gap-2 px-6 py-2 bg-[var(--primary)] text-white rounded-xl font-bold shadow-[0_0_15px_rgba(91,76,255,0.3)] hover:shadow-[0_0_25px_rgba(91,76,255,0.5)] transition-all"
            >
              <FileSignature className="w-4 h-4" /> Sign Document
            </button>
          )}
        </div>
      </div>

      {/* Formal Document View */}
      <div className="bg-white dark:bg-[#FDFBF7] text-black rounded-xl p-8 sm:p-12 shadow-2xl border border-slate-200 print:shadow-none print:border-none">
        
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black uppercase tracking-widest border-b-2 border-black pb-4 inline-block">Tenancy Agreement</h2>
        </div>

        <div className="space-y-6 text-sm leading-relaxed font-serif text-slate-800">
          <p>
            THIS TENANCY AGREEMENT is made on this <strong>{new Date(agreement.createdAt).toLocaleDateString()}</strong>.
          </p>
          
          <p>
            <strong>BETWEEN:</strong><br />
            <strong>{landlord.firstName} {landlord.lastName}</strong> (hereinafter referred to as the "Landlord" which expression shall where the context so admits include his/her heirs, executors, administrators and assigns) of the one part.
          </p>
          
          <p>
            <strong>AND:</strong><br />
            <strong>{tenant.firstName} {tenant.lastName}</strong> (hereinafter referred to as the "Tenant" which expression shall where the context so admits include his/her heirs, executors, administrators and assigns) of the other part.
          </p>

          <h3 className="font-bold text-base mt-8 mb-2">1. PREMISES</h3>
          <p>
            The Landlord agrees to let and the Tenant agrees to take the premises described as <strong>{property.title}</strong>, situated at <strong>{property.location}</strong> (hereinafter referred to as "the Property").
          </p>

          <h3 className="font-bold text-base mt-6 mb-2">2. TERM</h3>
          <p>
            The tenancy shall be for a term commencing on <strong>{new Date(booking.startDate).toLocaleDateString()}</strong> and ending on <strong>{new Date(booking.endDate).toLocaleDateString()}</strong>.
          </p>

          <h3 className="font-bold text-base mt-6 mb-2">3. RENT</h3>
          <p>
            The rent for the Property shall be the sum of <strong>GHS {property.price}</strong>, which has been agreed upon by both parties prior to the commencement of this agreement.
          </p>

          <h3 className="font-bold text-base mt-6 mb-2">4. COVENANTS</h3>
          <p>The Tenant hereby covenants with the Landlord as follows:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>To pay the rent at the times and in the manner agreed.</li>
            <li>To keep the interior of the Property in good and tenantable repair and condition.</li>
            <li>Not to assign, sublet, or part with possession of the Property without the prior written consent of the Landlord.</li>
            <li>To permit the Landlord or his authorized agents at all reasonable times to enter and inspect the condition of the Property.</li>
          </ul>

          <p className="mt-10 mb-16 italic text-slate-600">
            IN WITNESS WHEREOF the parties hereto have set their hands the day and year first above written.
          </p>

          {/* Signatures Area */}
          <div className="grid grid-cols-2 gap-12 mt-12">
            <div>
              <div className="h-32 flex items-end justify-center border-b border-black relative">
                {agreement.tenantSignature ? (
                  <img src={agreement.tenantSignature} alt="Tenant Signature" className="max-h-24 object-contain" />
                ) : (
                  <span className="text-slate-300 italic mb-2 absolute">Pending Signature</span>
                )}
              </div>
              <p className="text-center font-bold mt-2">TENANT</p>
              <p className="text-center text-xs text-slate-500">{tenant.firstName} {tenant.lastName}</p>
            </div>
            
            <div>
              <div className="h-32 flex items-end justify-center border-b border-black relative">
                {agreement.landlordSignature ? (
                  <img src={agreement.landlordSignature} alt="Landlord Signature" className="max-h-24 object-contain" />
                ) : (
                  <span className="text-slate-300 italic mb-2 absolute">Pending Signature</span>
                )}
              </div>
              <p className="text-center font-bold mt-2">LANDLORD</p>
              <p className="text-center text-xs text-slate-500">{landlord.firstName} {landlord.lastName}</p>
            </div>
          </div>
        </div>

        {/* Digital Stamp */}
        {isFullySigned && (
          <div className="mt-16 text-center border-t-2 border-dashed border-slate-300 pt-8">
            <div className="inline-block border-4 border-green-600 text-green-600 p-3 rounded-full transform -rotate-12 opacity-80">
              <p className="font-black text-xl leading-none uppercase">VERIFIED & BINDING</p>
              <p className="text-[10px] tracking-widest font-bold">AKWAABAHOMES DIGITAL SIGNATURE</p>
            </div>
            <p className="text-xs text-slate-400 mt-4">Document ID: {agreement.id}</p>
          </div>
        )}

      </div>

      {/* Signature Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1A1A1B] rounded-[32px] w-full max-w-lg shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="px-8 py-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-[#1A1A1B]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <FileSignature className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-[var(--foreground)] tracking-tight">Sign Document</h3>
                  <p className="text-xs text-[var(--muted-foreground)] font-medium mt-0.5">Legally Binding Digital Signature</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSignModal(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-8 space-y-6">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                By signing below using mouse or touchscreen, you acknowledge and agree to the terms outlined in this <strong className="text-slate-900 dark:text-white">Tenancy Agreement</strong>.
              </p>
              
              <SignaturePad onSave={handleSaveSignature} label="Touchscreen / Mouse E-Signature" />
              
              {/* Footer Buttons */}
              <div className="mt-8 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowSignModal(false)}
                  className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-[var(--foreground)] rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleConfirmSignature}
                  disabled={signMutation.isPending || !signatureData}
                  className="flex-[2] py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-bold shadow-[0_8px_20px_-6px_rgba(79,70,229,0.5)] hover:shadow-[0_12px_25px_-6px_rgba(79,70,229,0.6)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {signMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <CheckCircle className="w-5 h-5" /> Submit Verified E-Signature
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
