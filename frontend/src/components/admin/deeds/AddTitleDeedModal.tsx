'use client';

import React, { useState } from 'react';
import { 
  X, 
  UploadCloud, 
  FileCheck2, 
  Building2, 
  User, 
  FileText, 
  Check, 
  Loader2, 
  AlertCircle,
  Search,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';

interface LandlordOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  properties?: Array<{ id: string; title: string; location: string }>;
  landlordVerificationStatus?: string;
  landlordDocUrl?: string;
}

interface AddTitleDeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  landlords: LandlordOption[];
  initialLandlordId?: string;
  onSuccess: () => void;
}

const DOCUMENT_TYPES = [
  'Land Title Certificate (Act 1036)',
  'Indenture / Deed of Conveyance',
  'Sublease Agreement',
  'Deed of Assignment',
  'Cadastral Site Plan (Surveyor Stamped)',
  'Stool / Family Land Grant',
  'Other Statutory Ownership Proof'
];

export default function AddTitleDeedModal({
  isOpen,
  onClose,
  landlords,
  initialLandlordId,
  onSuccess
}: AddTitleDeedModalProps) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [landlordSearch, setLandlordSearch] = useState('');
  const [selectedLandlordId, setSelectedLandlordId] = useState<string>(initialLandlordId || '');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  
  // Metadata
  const [docType, setDocType] = useState(DOCUMENT_TYPES[0]);
  const [deedNumber, setDeedNumber] = useState('');
  const [registryOffice, setRegistryOffice] = useState('Lands Commission - Accra');
  const [initialStatus, setInitialStatus] = useState<'PENDING' | 'VERIFIED'>('PENDING');

  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const filteredLandlords = landlords.filter((l) => {
    const q = landlordSearch.toLowerCase();
    const fullName = `${l.firstName} ${l.lastName}`.toLowerCase();
    return fullName.includes(q) || l.email.toLowerCase().includes(q);
  });

  const selectedLandlord = landlords.find((l) => l.id === selectedLandlordId);

  const handleFileUpload = async (selectedFile: File) => {
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds the 5MB limit.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('document', selectedFile);

      const res = await api.post('/upload/document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploadedUrl(res.data.url);
      setFile(selectedFile);
      toast.success('Deed document uploaded successfully!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLandlordId) {
      toast.error('Please select a landlord.');
      return;
    }
    if (!uploadedUrl) {
      toast.error('Please upload a deed document file.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/admin/landlord-deeds/${selectedLandlordId}/attach`, {
        documentUrl: uploadedUrl,
        status: initialStatus
      });

      toast.success('Title deed record created successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-landlord-deeds'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to attach title deed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Administration Workspace
            </span>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Add Property Title Deed Record
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 pt-4 pb-2 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/30 dark:bg-zinc-900/30">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span className={step >= 1 ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}>
              1. Landlord
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
            <span className={step >= 2 ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}>
              2. Property
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
            <span className={step >= 3 ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}>
              3. Document & Details
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
            <span className={step >= 4 ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}>
              4. Review
            </span>
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* STEP 1: Select Landlord */}
          {step === 1 && (
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                Select Registered Landlord
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={landlordSearch}
                  onChange={(e) => setLandlordSearch(e.target.value)}
                  placeholder="Search by landlord name or email..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredLandlords.length > 0 ? (
                  filteredLandlords.map((l) => {
                    const isSelected = selectedLandlordId === l.id;
                    return (
                      <div
                        key={l.id}
                        onClick={() => setSelectedLandlordId(l.id)}
                        className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer text-xs transition ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500'
                            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-200 text-xs">
                            {l.firstName[0]}{l.lastName[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-white">
                              {l.firstName} {l.lastName}
                            </div>
                            <div className="text-[11px] text-zinc-500">{l.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-zinc-400">
                            {l.properties?.length || 0} properties
                          </div>
                          {l.landlordVerificationStatus && (
                            <AdminStatusBadge status={l.landlordVerificationStatus} size="sm" />
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="p-4 text-center text-xs text-zinc-400">No matching landlords found.</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Property Association */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                  Target Landlord
                </label>
                <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-xs flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {selectedLandlord?.firstName} {selectedLandlord?.lastName}
                  </span>
                  <span className="text-zinc-500">{selectedLandlord?.email}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-2">
                  Select Associated Property
                </label>
                {selectedLandlord?.properties && selectedLandlord.properties.length > 0 ? (
                  <div className="space-y-2">
                    {selectedLandlord.properties.map((p) => (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition ${
                          selectedPropertyId === p.id
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                            : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="property"
                            checked={selectedPropertyId === p.id}
                            onChange={() => setSelectedPropertyId(p.id)}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-white">{p.title}</div>
                            <div className="text-[11px] text-zinc-500">{p.location}</div>
                          </div>
                        </div>
                        <Building2 className="w-4 h-4 text-zinc-400" />
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500 space-y-1">
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">
                      No active listings registered yet
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      This deed will be associated directly with the landlord's primary ownership profile.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Document Details & File Upload */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                    Document Type
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {DOCUMENT_TYPES.map((dt) => (
                      <option key={dt} value={dt}>{dt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                    Deed / Certificate / Folio No.
                  </label>
                  <input
                    type="text"
                    value={deedNumber}
                    onChange={(e) => setDeedNumber(e.target.value)}
                    placeholder="e.g. GA-2023-0982-A"
                    className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                  Issuing Land Registry / Traditional Authority
                </label>
                <input
                  type="text"
                  value={registryOffice}
                  onChange={(e) => setRegistryOffice(e.target.value)}
                  placeholder="e.g. Lands Commission (Greater Accra / Ashanti)"
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Upload Zone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-1">
                  Upload Deed Document (PDF, JPEG, PNG, max 5MB)
                </label>
                <div className="relative border-2 border-dashed border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 rounded-2xl p-6 text-center transition bg-zinc-50/50 dark:bg-zinc-800/30">
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploading}
                  />
                  <div className="space-y-2">
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2 text-emerald-600">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-xs font-semibold">Encrypting & uploading document...</span>
                      </div>
                    ) : uploadedUrl ? (
                      <div className="flex flex-col items-center gap-2 text-emerald-600">
                        <FileCheck2 className="w-8 h-8" />
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {file?.name || 'Document Ready'}
                        </span>
                        <span className="text-[11px] text-emerald-600 font-bold">
                          Upload Complete (Click to replace)
                        </span>
                      </div>
                    ) : (
                      <>
                        <UploadCloud className="w-8 h-8 text-zinc-400 mx-auto" />
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                          Drag and drop or <span className="text-emerald-600 font-bold">browse</span>
                        </p>
                        <p className="text-[11px] text-zinc-400">PDF, PNG, JPG up to 5MB</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review & Initial Verification Decision */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-zinc-200/50 dark:border-zinc-700/50">
                  <span className="text-zinc-500">Registered Landlord:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {selectedLandlord?.firstName} {selectedLandlord?.lastName}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-200/50 dark:border-zinc-700/50">
                  <span className="text-zinc-500">Document Type:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">{docType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-200/50 dark:border-zinc-700/50">
                  <span className="text-zinc-500">Deed Ref / Folio:</span>
                  <span className="font-mono text-zinc-900 dark:text-white">{deedNumber || 'Pending entry'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-200/50 dark:border-zinc-700/50">
                  <span className="text-zinc-500">Registry Office:</span>
                  <span className="text-zinc-900 dark:text-white">{registryOffice}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Attached File:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {file?.name || 'Uploaded to Cloud'}
                  </span>
                </div>
              </div>

              {/* Status Decision */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 mb-2">
                  Initial Administrative Verification Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInitialStatus('PENDING')}
                    className={`p-3 rounded-xl border text-left text-xs transition ${
                      initialStatus === 'PENDING'
                        ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
                        : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="font-bold text-amber-700 dark:text-amber-400">Pending Review</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">Enters audit queue for administrative check</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInitialStatus('VERIFIED')}
                    className={`p-3 rounded-xl border text-left text-xs transition ${
                      initialStatus === 'VERIFIED'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                        : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verify Immediately</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">Grants Verified Landlord badge immediately</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as any)}
                className="px-3.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
              >
                Back
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
              >
                Cancel
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  disabled={
                    (step === 1 && !selectedLandlordId) ||
                    (step === 3 && !uploadedUrl)
                  }
                  onClick={() => setStep((s) => (s + 1) as any)}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Title Deed</span>
                </button>
              )}
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
