'use client';

import React, { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  User, 
  ExternalLink, 
  AlertTriangle, 
  Phone, 
  Mail, 
  MessageSquare, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  RotateCcw,
  Check, 
  MapPin, 
  IdCard, 
  Loader2, 
  FileText,
  Clock,
  X,
  ShieldCheck,
  Send,
  HelpCircle,
  FileQuestion,
  Calendar,
  Sparkles
} from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';

export default function AdminLandlordDeedAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Document canvas controls
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

  // Forms
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);
  const [rejectionNotes, setRejectionNotes] = useState<string>('');
  
  const [showReqDocsForm, setShowReqDocsForm] = useState<boolean>(false);
  const [requestedDocs, setRequestedDocs] = useState<string[]>([]);
  const [docInstructions, setDocInstructions] = useState<string>('');

  // Lands Commission Checklist State
  const [checklist, setChecklist] = useState({
    identityMatch: false,
    sitePlan: false,
    titleSearch: false,
    encumbranceFree: false
  });

  // Fetch deed details
  const { data: landlord, isLoading, refetch } = useQuery({
    queryKey: ['admin-landlord-deeds-single', id],
    queryFn: async () => {
      const res = await api.get('/admin/landlord-deeds');
      const found = (res.data?.landlords || []).find((l: any) => l.id === id);
      if (found) return found;

      // Fallback lookup via admin users
      try {
        const userRes = await api.get('/admin/users');
        return (userRes.data?.users || []).find((u: any) => u.id === id);
      } catch {
        return null;
      }
    }
  });

  // Audit decision mutation
  const auditMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: 'VERIFIED' | 'REJECTED'; notes?: string }) => {
      await api.put(`/admin/landlord-deeds/${id}/audit`, { status, notes });
    },
    onSuccess: (_, variables) => {
      if (variables.status === 'VERIFIED') {
        toast.success('Landlord property deed approved! Verified Landlord status granted.');
      } else {
        toast.success('Deed submission rejected. Compliance feedback dispatched.');
      }
      queryClient.invalidateQueries({ queryKey: ['admin-landlord-deeds'] });
      queryClient.invalidateQueries({ queryKey: ['admin-landlord-deeds-single', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      router.push('/admin/deeds');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update deed verification status.');
    }
  });

  // Request docs mutation
  const requestDocsMutation = useMutation({
    mutationFn: async () => {
      if (requestedDocs.length === 0 && !docInstructions.trim()) {
        throw new Error('Please select at least one document or provide instructions.');
      }
      await api.post(`/admin/landlord-deeds/${id}/request-docs`, {
        documentsRequested: requestedDocs,
        instructions: docInstructions
      });
    },
    onSuccess: () => {
      toast.success('Additional document request sent to landlord.');
      setShowReqDocsForm(false);
      setRequestedDocs([]);
      setDocInstructions('');
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to send document request.');
    }
  });

  const allChecksPassed = Object.values(checklist).every(Boolean);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-xs font-bold">Loading Title Deed Audit Workstation...</p>
      </div>
    );
  }

  if (!landlord) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
          Landlord Record Not Found
        </h2>
        <p className="text-xs text-zinc-500">
          The requested landlord record could not be found or has been removed.
        </p>
        <Link
          href="/admin/deeds"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Title Deeds</span>
        </Link>
      </div>
    );
  }

  const isPdf = landlord.landlordDocUrl?.toLowerCase().includes('.pdf');
  const cleanPhone = landlord.phoneNumber?.replace(/[^0-9]/g, '') || '';
  const whatsAppNumber = cleanPhone.startsWith('0') ? '233' + cleanPhone.substring(1) : cleanPhone;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <AdminPageHeader
        title={`Audit Workstation: ${landlord.firstName} ${landlord.lastName}`}
        subtitle="Examine property deed documents, inspect cadastral plans, verify Lands Commission Act 1036 compliance, and enforce statutory standards."
        backUrl="/admin/deeds"
        backLabel="Back to Title Deeds"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Title Deeds & Ownership', href: '/admin/deeds' },
          { label: `${landlord.firstName} ${landlord.lastName}` }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <AdminStatusBadge status={landlord.landlordVerificationStatus} />
          </div>
        }
      />

      {/* Main 2-Column Workstation Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Interactive Document Canvas (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden shadow-sm">
            
            {/* Canvas Toolbar */}
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                  Title Deed Inspection Canvas
                </span>
              </div>

              {landlord.landlordDocUrl && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono px-1.5 text-zinc-500">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 ml-1"
                    title="Rotate 90° Clockwise"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setZoomLevel(1);
                      setRotation(0);
                    }}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100"
                    title="Reset View"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setLightboxOpen(true)}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 ml-1"
                    title="Full Screen Lightbox"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <a
                    href={landlord.landlordDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100"
                    title="Open in New Tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>

            {/* Document Canvas Display */}
            <div className="relative min-h-[460px] bg-zinc-950 flex items-center justify-center p-4 overflow-hidden">
              {landlord.landlordDocUrl ? (
                isPdf ? (
                  <iframe
                    src={`${landlord.landlordDocUrl}#toolbar=0`}
                    className="w-full h-[600px] border-0 rounded"
                    title="Title Deed Document"
                  />
                ) : (
                  <div className="overflow-auto max-h-[600px] w-full flex items-center justify-center">
                    <img
                      src={landlord.landlordDocUrl}
                      alt="Submitted Title Deed Document"
                      style={{
                        transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease-out'
                      }}
                      className="max-h-[580px] object-contain rounded shadow-lg"
                    />
                  </div>
                )
              ) : (
                <div className="text-center space-y-3 p-12 text-zinc-400">
                  <FileQuestion className="w-12 h-12 text-amber-500 mx-auto" />
                  <h4 className="text-sm font-bold text-white">No Deed Document Uploaded</h4>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    The landlord has not submitted an ownership document, indenture, or certificate for this account.
                  </p>
                  <button
                    onClick={() => setShowReqDocsForm(true)}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition"
                  >
                    Dispatch Request for Title Deed
                  </button>
                </div>
              )}
            </div>

            {/* Canvas Footer Security Note */}
            <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>HMAC Encrypted signed link • Time-limited access token</span>
              </span>
              <span>Akwaaba Homes Legal Verification Pipeline</span>
            </div>

          </div>
        </div>

        {/* Right Column: Assessment, Checklist & Decision Deck (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Card 1: Landlord Profile & Identity Match */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <User className="w-4 h-4 text-zinc-400" />
                <span>Landlord Identity & Verification</span>
              </h3>
              <AdminStatusBadge status={landlord.landlordVerificationStatus} size="sm" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Full Legal Name:</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {landlord.firstName} {landlord.lastName}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Email Address:</span>
                <a href={`mailto:${landlord.email}`} className="text-emerald-600 hover:underline font-medium">
                  {landlord.email}
                </a>
              </div>

              {landlord.phoneNumber && (
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-500">Phone & WhatsApp:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900 dark:text-white">{landlord.phoneNumber}</span>
                    {whatsAppNumber && (
                      <a
                        href={`https://wa.me/${whatsAppNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-700 font-bold text-[11px] hover:underline"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-500">Ghana Card:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-zinc-900 dark:text-white">{landlord.ghanaCardNumber || 'N/A'}</span>
                  {landlord.ghanaCardStatus && (
                    <AdminStatusBadge status={landlord.ghanaCardStatus} size="sm" />
                  )}
                </div>
              </div>

              {landlord.ghanaCardFrontUrl && (
                <div className="pt-1">
                  <a
                    href={landlord.ghanaCardFrontUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Ghana Card Front Document</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Associated Properties */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 p-5 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-zinc-400" />
              <span>Registered Properties ({landlord.properties?.length || 0})</span>
            </h3>

            {landlord.properties && landlord.properties.length > 0 ? (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {landlord.properties.map((p: any) => (
                  <div key={p.id} className="p-3 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-zinc-900 dark:text-white">{p.title}</div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-zinc-400" />
                        <span>{p.location}</span>
                      </div>
                    </div>
                    <AdminStatusBadge status={p.approvalStatus} size="sm" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic">No properties registered under this landlord account yet.</p>
            )}
          </div>

          {/* Card 3: Lands Commission Act 1036 Statutory Checklist */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Ghana Lands Act (Act 1036) Checklist</span>
              </h3>
              <span className="text-[11px] font-bold text-zinc-400">
                {Object.values(checklist).filter(Boolean).length}/4 Verified
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={checklist.identityMatch}
                  onChange={(e) => setChecklist((c) => ({ ...c, identityMatch: e.target.checked }))}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <span className="text-zinc-700 dark:text-zinc-300 leading-snug">
                  <strong>Grantee Name Identity Match:</strong> Landlord legal name matches grantee/assignee on deed and Ghana Card ID.
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={checklist.sitePlan}
                  onChange={(e) => setChecklist((c) => ({ ...c, sitePlan: e.target.checked }))}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <span className="text-zinc-700 dark:text-zinc-300 leading-snug">
                  <strong>Licensed Cadastral Site Plan:</strong> Signed and stamped by a licensed surveyor & Director of Surveys.
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={checklist.titleSearch}
                  onChange={(e) => setChecklist((c) => ({ ...c, titleSearch: e.target.checked }))}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <span className="text-zinc-700 dark:text-zinc-300 leading-snug">
                  <strong>Section 18 Lands Commission Search:</strong> Official search report or Land Certificate matches property plot.
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={checklist.encumbranceFree}
                  onChange={(e) => setChecklist((c) => ({ ...c, encumbranceFree: e.target.checked }))}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <span className="text-zinc-700 dark:text-zinc-300 leading-snug">
                  <strong>Free of Conflicting Claims:</strong> No recorded lis pendens, stool chieftaincy injunctions, or family disputes.
                </span>
              </label>
            </div>
          </div>

          {/* Form: Rejection Reason (Mandatory) */}
          {showRejectForm && (
            <div className="border border-rose-200 dark:border-rose-900/60 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 p-5 space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Mandatory Rejection Notice</span>
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-400">
                Please state clearly why the deed document cannot be approved so the landlord can correct and resubmit:
              </p>
              <textarea
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="e.g. Document pages are blurry; grantee name does not match Ghana Card; missing cadastral survey stamp..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={auditMutation.isPending || !rejectionNotes.trim()}
                  onClick={() => auditMutation.mutate({ status: 'REJECTED', notes: rejectionNotes })}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {auditMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </div>
          )}

          {/* Form: Request Additional Documents */}
          {showReqDocsForm && (
            <div className="border border-blue-200 dark:border-blue-900/60 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 p-5 space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-4 h-4 text-blue-600" />
                <span>Request Additional Statutory Documents</span>
              </h4>
              <div className="space-y-1.5 text-xs">
                {[
                  'Cadastral Site Plan (Licensed Surveyor)',
                  'Lands Commission Section 18 Search Report',
                  'Indenture Endorsement & Stamp Duty Proof',
                  'Stool / Family Grant Consent Letter',
                  'Building Permit / Municipal Assembly Clearance'
                ].map((docName) => (
                  <label key={docName} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-900/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requestedDocs.includes(docName)}
                      onChange={() => {
                        setRequestedDocs((prev) =>
                          prev.includes(docName) ? prev.filter((d) => d !== docName) : [...prev, docName]
                        );
                      }}
                      className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-zinc-800 dark:text-zinc-200 font-medium">{docName}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={docInstructions}
                onChange={(e) => setDocInstructions(e.target.value)}
                placeholder="Specific instructions or notes for the landlord..."
                rows={2}
                className="w-full text-xs p-3 rounded-xl border border-blue-300 dark:border-blue-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReqDocsForm(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={requestDocsMutation.isPending}
                  onClick={() => requestDocsMutation.mutate()}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {requestDocsMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Dispatch Request</span>
                </button>
              </div>
            </div>
          )}

          {/* Card 4: Audit Decision Deck */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900 p-5 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Administrative Audit Decision
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowReqDocsForm(!showReqDocsForm);
                  setShowRejectForm(false);
                }}
                className="w-full sm:w-auto flex-1 px-3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                <span>Request Docs</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowRejectForm(true);
                  setShowReqDocsForm(false);
                }}
                className="w-full sm:w-auto flex-1 px-3 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject Deed</span>
              </button>

              <button
                type="button"
                disabled={auditMutation.isPending || !landlord.landlordDocUrl}
                onClick={() => auditMutation.mutate({ status: 'VERIFIED' })}
                className="w-full sm:w-auto flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {auditMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Approve Deed</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && landlord.landlordDocUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col p-4">
          <div className="flex items-center justify-between text-white p-2">
            <h3 className="text-sm font-bold">
              {landlord.firstName} {landlord.lastName} — Title Deed Document
            </h3>
            <button
              onClick={() => setLightboxOpen(false)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center overflow-auto p-4">
            {isPdf ? (
              <iframe
                src={landlord.landlordDocUrl}
                className="w-full h-full max-w-5xl rounded-lg"
                title="Fullscreen Deed Document"
              />
            ) : (
              <img
                src={landlord.landlordDocUrl}
                alt="Fullscreen Deed"
                className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
              />
            )}
          </div>
        </div>
      )}

    </div>
  );
}
