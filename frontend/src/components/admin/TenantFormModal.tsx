'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, UserPlus, Pencil } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export interface TenantFormInitialData {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string | null;
  campus?: string | null;
  studentId?: string | null;
  programmeOfStudy?: string | null;
  studentType?: string | null;
}

interface TenantFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: TenantFormInitialData | null;
  onClose: () => void;
  onSaved: () => void;
}

const CAMPUS_OPTIONS = [
  'University of Ghana (Legon)',
  'KNUST (Kumasi)',
  'UCC (Cape Coast)',
  'UPSA (Accra)',
  'UEW (Winneba)',
  'UDS (Tamale)',
  'UHAS (Ho)',
  'GIMPA',
  'Off-Campus / General Resident',
];

const RESIDENT_TYPES = [
  { value: 'CONTINUING', label: 'University Student' },
  { value: 'FRESHMAN', label: 'Incoming Freshman' },
  { value: 'GRADUATE', label: 'Postgraduate / NSS' },
  { value: 'RESIDENT', label: 'Working Resident' },
];

export default function TenantFormModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSaved,
}: TenantFormModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [campus, setCampus] = useState('');
  const [studentId, setStudentId] = useState('');
  const [programmeOfStudy, setProgrammeOfStudy] = useState('');
  const [studentType, setStudentType] = useState('CONTINUING');
  const [password, setPassword] = useState('');
  const [isKycVerified, setIsKycVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialData) {
      setFirstName(initialData.firstName || '');
      setLastName(initialData.lastName || '');
      setEmail(initialData.email || '');
      setPhoneNumber(initialData.phoneNumber || '');
      setCampus(initialData.campus || '');
      setStudentId(initialData.studentId || '');
      setProgrammeOfStudy(initialData.programmeOfStudy || '');
      setStudentType(initialData.studentType || 'CONTINUING');
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhoneNumber('');
      setCampus('');
      setStudentId('');
      setProgrammeOfStudy('');
      setStudentType('CONTINUING');
      setPassword('');
      setIsKycVerified(false);
    }
  }, [isOpen, mode, initialData]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'create') {
        await api.post('/admin/tenants', {
          firstName,
          lastName,
          email,
          phoneNumber,
          campus,
          studentId,
          programmeOfStudy,
          studentType,
          password,
          isKycVerified,
        });
        toast.success('Tenant account created successfully');
      } else if (initialData?.id) {
        await api.put(`/admin/tenants/${initialData.id}`, {
          firstName,
          lastName,
          phoneNumber,
          campus,
          studentId,
          programmeOfStudy,
          studentType,
        });
        toast.success('Tenant profile updated');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save tenant details');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={() => !submitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tenant-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAF7EE] dark:bg-emerald-950/60 flex items-center justify-center text-[#04793d] dark:text-emerald-400">
              {mode === 'create' ? <UserPlus className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            </div>
            <div>
              <h2 id="tenant-modal-title" className="text-base font-extrabold text-zinc-900 dark:text-white">
                {mode === 'create' ? 'Add New Tenant' : 'Edit Tenant Details'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {mode === 'create'
                  ? 'Register a student or residential tenant account.'
                  : 'Update contact info, campus affiliation, and student ID.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={() => !submitting && onClose()}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="tn-first-name" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                First Name *
              </label>
              <input
                id="tn-first-name"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Abena"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="tn-last-name" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Last Name *
              </label>
              <input
                id="tn-last-name"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Osei"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="tn-email" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Email Address *
              </label>
              <input
                id="tn-email"
                type="email"
                required
                disabled={mode === 'edit'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tenant@akwaaba.test"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="tn-phone" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Phone Number
              </label>
              <input
                id="tn-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+233 24 000 1111"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="tn-type" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Resident Type
              </label>
              <select
                id="tn-type"
                value={studentType}
                onChange={(e) => setStudentType(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {RESIDENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="tn-campus" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Campus / Institution
              </label>
              <select
                id="tn-campus"
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="">Select campus or area</option>
                {CAMPUS_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="tn-student-id" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Student ID
              </label>
              <input
                id="tn-student-id"
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. 10948271"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="tn-programme" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Programme / Occupation
              </label>
              <input
                id="tn-programme"
                type="text"
                value={programmeOfStudy}
                onChange={(e) => setProgrammeOfStudy(e.target.value)}
                placeholder="e.g. BSc Computer Science"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {mode === 'create' && (
            <>
              <div>
                <label htmlFor="tn-password" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Temporary Password *
                </label>
                <input
                  id="tn-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#EAF7EE]/70 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isKycVerified}
                  onChange={(e) => setIsKycVerified(e.target.checked)}
                  className="w-4 h-4 rounded border-emerald-400 text-[#04793d] focus:ring-emerald-500"
                />
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Mark Tenant KYC (Ghana Card) as verified immediately
                </span>
              </label>
            </>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#04793d] hover:bg-[#036432] text-white text-xs font-bold transition shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{mode === 'create' ? 'Create Tenant' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
