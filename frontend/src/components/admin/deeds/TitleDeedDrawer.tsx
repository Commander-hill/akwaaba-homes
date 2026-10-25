'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  X, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Building2, 
  Phone, 
  Mail, 
  MessageSquare, 
  FileText, 
  IdCard, 
  Calendar, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Send,
  Loader2,
  HelpCircle,
  FileCheck2,
  FileQuestion,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import { useQueryClient } from '@tanstack/react-query';

export interface PropertySummary {
  id: string;
  title: string;
  location: string;
  approvalStatus: string;
}

export interface LandlordDeedRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  landlordDocUrl?: string;
  ghanaCardNumber?: string;
  ghanaCardStatus?: string;
  ghanaCardFrontUrl?: string;
  isVerifiedLandlord: boolean;
  landlordVerificationStatus: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  reputationScore: number;
  createdAt: string;
  properties?: PropertySummary[];
}

interface TitleDeedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  landlord: LandlordDeedRecord | null;
  onAuditSuccess?: () => void;
}

export default function TitleDeedDrawer({
  isOpen,
  onClose,
  landlord,
  onAuditSuccess
}: TitleDeedDrawerProps) {
  const queryClient = useQueryClient();

  // Audit form states
  const [isAuditing, setIsAuditing] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');

  // Request docs states
  const [reqDocMode, setReqDocMode] = useState(false);
  const [isSendingReq, setIsSendingReq] = useState(false);
  const [requestedDocs, setRequestedDocs] = useState<string[]>([]);
  const [docInstructions, setDocInstructions] = useState('');

  // Image viewer states
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Statutory Checklist states
  const [checklist, setChecklist] = useState({
    identityMatch: false,
    sitePlan: false,
    searchVerified: false,
    encumbranceFree: false
  });

  if (!isOpen || !landlord) return null;

  const isPdf = landlord.landlordDocUrl?.toLowerCase().includes('.pdf');
  const cleanPhone = landlord.phoneNumber?.replace(/[^0-9]/g, '') || '';
  const whatsAppNumber = cleanPhone.startsWith('0') ? '233' + cleanPhone.substring(1) : cleanPhone;

  const handleAudit = async (status: 'VERIFIED' | 'REJECTED') => {
    if (status === 'REJECTED' && !rejectionNotes.trim()) {
      toast.error('Please specify a rejection reason for the landlord.');
      return;
    }

    try {
      setIsAuditing(true);
      await api.put(`/admin/landlord-deeds/${landlord.id}/audit`, {
        status,
        notes: status === 'REJECTED' ? rejectionNotes : undefined
      });

      toast.success(
        status === 'VERIFIED'
          ? 'Landlord title deed approved! Status granted.'
          : 'Deed rejected and notification dispatched.'
      );

      queryClient.invalidateQueries({ queryKey: ['admin-landlord-deeds'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setRejectMode(false);
      setRejectionNotes('');
      onAuditSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update deed verification status');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleRequestDocs = async () => {
    if (requestedDocs.length === 0 && !docInstructions.trim()) {
      toast.error('Select at least one document or provide instructions.');
      return;
    }

    try {
      setIsSendingReq(true);
      await api.post(`/admin/landlord-deeds/${landlord.id}/request-docs`, {
        documentsRequested: requestedDocs,
        instructions: docInstructions
      });

      toast.success('Document request dispatched to landlord.');
      queryClient.invalidateQueries({ queryKey: ['admin-landlord-deeds'] });
      setReqDocMode(false);
      setRequestedDocs([]);
      setDocInstructions('');
      onAuditSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch document request');
    } finally {
      setIsSendingReq(false);
    }
  };

  const toggleReqDoc = (docName: string) => {
    setRequestedDocs((prev) =>
      prev.includes(docName) ? prev.filter((d) => d !== docName) : [...prev, docName]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col z-10 overflow-hidden border-l border-zinc-200 dark:border-zinc-800 animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                Deed Quick Review
              </span>
              <AdminStatusBadge status={landlord.landlordVerificationStatus} size="sm" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              {landlord.firstName} {landlord.lastName}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/deeds/${landlord.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition"
              title="Open full inspection workstation"
            >
              <span>Full Workstation</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Section: Landlord Identity & Contact */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/40 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Landlord & Identity Verification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                <a href={`mailto:${landlord.email}`} className="truncate hover:underline text-emerald-600 dark:text-emerald-400">
                  {landlord.email}
                </a>
              </div>
              {landlord.phoneNumber && (
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                  <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>{landlord.phoneNumber}</span>
                  {whatsAppNumber && (
                    <a
                      href={`https://wa.me/${whatsAppNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <IdCard className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>Ghana Card:</span>
                <span className="font-mono text-xs">{landlord.ghanaCardNumber || 'Not on file'}</span>
                {landlord.ghanaCardStatus && (
                  <AdminStatusBadge status={landlord.ghanaCardStatus} size="sm" />
                )}
              </div>
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>Registered: {new Date(landlord.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {landlord.ghanaCardFrontUrl && (
              <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                <a
                  href={landlord.ghanaCardFrontUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Verified Ghana Card ID File</span>
                </a>
              </div>
            )}
          </div>

          {/* Section: Associated Platform Properties */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-zinc-400" />
                <span>Associated Properties ({landlord.properties?.length || 0})</span>
              </h3>
            </div>
            {landlord.properties && landlord.properties.length > 0 ? (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {landlord.properties.map((prop) => (
                  <div key={prop.id} className="p-3 bg-white dark:bg-zinc-900 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-white">{prop.title}</div>
                      <div className="text-zinc-500 text-[11px]">{prop.location}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <AdminStatusBadge status={prop.approvalStatus} size="sm" />
                      <Link
                        href={`/admin/properties`}
                        className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 italic bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800">
                No active properties listed under this landlord account.
              </p>
            )}
          </div>

          {/* Section: Document Viewer / Lightbox preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-zinc-400" />
                <span>Submitted Title Deed Document</span>
              </h3>
              {landlord.landlordDocUrl && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                    className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 text-xs"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
                    className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 text-xs"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 text-xs"
                    title="Rotate"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={landlord.landlordDocUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 text-xs ml-1"
                    title="Open in new window"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {landlord.landlordDocUrl ? (
              <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 flex items-center justify-center min-h-[300px] max-h-[420px]">
                {isPdf ? (
                  <iframe
                    src={`${landlord.landlordDocUrl}#toolbar=0`}
                    className="w-full h-[400px] border-0"
                    title="Title Deed Document"
                  />
                ) : (
                  <div className="overflow-auto w-full h-[380px] flex items-center justify-center p-4">
                    <img
                      src={landlord.landlordDocUrl}
                      alt="Landlord Title Deed Document"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transition: 'transform 0.2s ease-out'
                      }}
                      className="max-h-full max-w-full object-contain rounded shadow"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-amber-300 dark:border-amber-700/50 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 text-center space-y-2">
                <FileQuestion className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                  No Deed Document on File
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-400 max-w-sm mx-auto">
                  This landlord has not submitted an ownership document, indenture, or land certificate.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setReqDocMode(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm transition"
                  >
                    Request Title Deed from Landlord
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section: Statutory Compliance Checklist (Ghana Lands Act 2020) */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Lands Act 2020 (Act 1036) Verification Checklist</span>
              </h3>
            </div>
            <div className="space-y-2 text-xs">
              <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.identityMatch}
                  onChange={(e) => setChecklist((c) => ({ ...c, identityMatch: e.target.checked }))}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <span className="text-zinc-700 dark:text-zinc-300 leading-snug">
                  <strong>Grantee / Assignee Identity Match:</strong> Landlord name matches grantee on deed & Ghana Card ID.
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.sitePlan}
                  onChange={(e) => setChecklist((c) => ({ ...c, sitePlan: e.target.checked }))}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <span className="text-zinc-700 dark:text-zinc-300 leading-snug">
                  <strong>Licensed Cadastral Site Plan:</strong> Signed and stamped by licensed surveyor & Director of Surveys.
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.searchVerified}
                  onChange={(e) => setChecklist((c) => ({ ...c, searchVerified: e.target.checked }))}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <span className="text-zinc-700 dark:text-zinc-300 leading-snug">
                  <strong>Section 18 Lands Commission Search:</strong> Official Yellow Search report or certificate verification record.
                </span>
              </label>

              <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.encumbranceFree}
                  onChange={(e) => setChecklist((c) => ({ ...c, encumbranceFree: e.target.checked }))}
                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 mt-0.5"
                />
                <span className="text-zinc-700 dark:text-zinc-300 leading-snug">
                  <strong>Free from Encumbrances:</strong> No pending stool litigation, registered mortgage liens, or rival claims reported.
                </span>
              </label>
            </div>
          </div>

          {/* Rejection Form Modal / Drawer Section */}
          {rejectMode && (
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Specify Mandatory Rejection Reason</span>
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-400">
                This notice will be recorded in the audit trail and sent directly to the landlord.
              </p>
              <textarea
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="e.g. Document image is blurry and illegible; name on deed does not match Ghana Card; missing cadastral survey stamp..."
                rows={3}
                className="w-full text-xs p-3 rounded-lg border border-rose-300 dark:border-rose-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectMode(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isAuditing || !rejectionNotes.trim()}
                  onClick={() => handleAudit('REJECTED')}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isAuditing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </div>
          )}

          {/* Request Documents Form Section */}
          {reqDocMode && (
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 space-y-3 animate-in fade-in">
              <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-4 h-4 text-blue-600" />
                <span>Request Additional Compliance Documents</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  'Cadastral Site Plan',
                  'Lands Commission Yellow Search',
                  'Indenture Endorsement Stamp',
                  'Stool / Family Consent Letter',
                  'Building Permit / Municipal Clearance'
                ].map((docName) => (
                  <label key={docName} className="flex items-center gap-2 p-1.5 rounded bg-white dark:bg-zinc-900 border border-blue-200/50 dark:border-blue-900/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requestedDocs.includes(docName)}
                      onChange={() => toggleReqDoc(docName)}
                      className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">{docName}</span>
                  </label>
                ))}
              </div>
              <textarea
                value={docInstructions}
                onChange={(e) => setDocInstructions(e.target.value)}
                placeholder="Custom administrative instructions for landlord..."
                rows={2}
                className="w-full text-xs p-3 rounded-lg border border-blue-300 dark:border-blue-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReqDocMode(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSendingReq}
                  onClick={handleRequestDocs}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSendingReq && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Dispatch Request</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Drawer Fixed Footer Actions */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setReqDocMode(!reqDocMode);
              setRejectMode(false);
            }}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
            <span>Request Docs</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isAuditing}
              onClick={() => {
                setRejectMode(true);
                setReqDocMode(false);
              }}
              className="px-3.5 py-2 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject Deed</span>
            </button>

            <button
              type="button"
              disabled={isAuditing || !landlord.landlordDocUrl}
              onClick={() => handleAudit('VERIFIED')}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {isAuditing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>Approve & Verify</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
