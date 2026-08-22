'use client';

import React, { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, FileSignature, CheckCircle, Printer, AlertTriangle } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import toast from 'react-hot-toast';

export default function AgreementPage() {
  const { id: bookingId } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sigCanvas = useRef<SignatureCanvas>(null);
  
  const [showSignModal, setShowSignModal] = useState(false);

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
    mutationFn: async (signatureData: string) => {
      await api.post(`/agreements/booking/${bookingId}/sign`, { signature: signatureData });
    },
    onSuccess: () => {
      setShowSignModal(false);
      queryClient.invalidateQueries({ queryKey: ['agreement', bookingId] });
      toast.success('Signature applied successfully!');
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

  const handleClearSignature = () => {
    sigCanvas.current?.clear();
  };

  const handleSaveSignature = () => {
    console.log('Confirm & Sign clicked!');
    if (!sigCanvas.current) {
      console.error('Signature canvas ref is null!');
      toast.error('System error: Canvas not initialized. Please refresh.');
      return;
    }
    if (sigCanvas.current.isEmpty()) {
      console.log('Signature is empty');
      toast.error("Please provide a signature first.");
      return;
    }
    
    try {
      const canvas = sigCanvas.current.getTrimmedCanvas();
      const dataURL = canvas.toDataURL('image/png');
      console.log('Generated signature dataURL length:', dataURL.length);
      
      if (dataURL) {
        signMutation.mutate(dataURL);
      }
    } catch (err) {
      console.error('Error generating signature:', err);
      toast.error('Failed to generate signature image.');
    }
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#2A2A2B] rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">Draw Your Signature</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">By signing, you agree to the terms outlined in the Tenancy Agreement.</p>
            
            <div className="border-2 border-dashed border-[var(--border)] rounded-xl bg-slate-50 dark:bg-slate-900/50 mb-4 overflow-hidden relative">
              <SignatureCanvas 
                ref={(ref) => { sigCanvas.current = ref; }}
                penColor="black"
                canvasProps={{ className: 'w-full h-48 signature-canvas' }}
              />
            </div>
            
            <div className="flex gap-3">
              <button 
                type="button"
                onClick={handleClearSignature}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-[var(--foreground)] rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Clear
              </button>
              <button 
                type="button"
                onClick={handleSaveSignature}
                disabled={signMutation.isPending}
                className="flex-[2] py-3 bg-[var(--primary)] text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                {signMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Sign'}
              </button>
            </div>
            <button 
              onClick={() => setShowSignModal(false)}
              className="w-full mt-4 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
