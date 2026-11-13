'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, UserPlus, Pencil } from 'lucide-react';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export interface LandlordFormInitialData {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string | null;
  businessName?: string | null;
  primaryRegion?: string | null;
  hostEntityType?: string | null;
}

interface LandlordFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: LandlordFormInitialData | null;
  onClose: () => void;
  onSaved: () => void;
}

const REGION_OPTIONS = [
  'Greater Accra (Legon / East Legon)',
  'Kumasi (KNUST / Ayeduase)',
  'Cape Coast (UCC / Amamoma)',
  'Winneba (UEW)',
  'Takoradi / Sekondi',
  'Tamale / UDS',
  'Ho / UHAS',
  'Sunyani',
  'Koforidua',
];

const CATEGORY_OPTIONS = [
  { value: 'INDIVIDUAL_OWNER', label: 'Individual Owner' },
  { value: 'REGISTERED_HOSTEL_COMPANY', label: 'Registered Hostel Company' },
  { value: 'PROPERTY_MANAGER', label: 'Property Manager' },
];

export default function LandlordFormModal({
  isOpen,
  mode,
  initialData,
  onClose,
  onSaved,
}: LandlordFormModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [primaryRegion, setPrimaryRegion] = useState('');
  const [hostEntityType, setHostEntityType] = useState('INDIVIDUAL_OWNER');
  const [password, setPassword] = useState('');
  const [isVerifiedLandlord, setIsVerifiedLandlord] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && initialData) {
      setFirstName(initialData.firstName || '');
      setLastName(initialData.lastName || '');
      setEmail(initialData.email || '');
      setPhoneNumber(initialData.phoneNumber || '');
      setBusinessName(initialData.businessName || '');
      setPrimaryRegion(initialData.primaryRegion || '');
      setHostEntityType(initialData.hostEntityType || 'INDIVIDUAL_OWNER');
    } else {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhoneNumber('');
      setBusinessName('');
      setPrimaryRegion('');
      setHostEntityType('INDIVIDUAL_OWNER');
      setPassword('');
      setIsVerifiedLandlord(false);
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
        await api.post('/admin/landlords', {
          firstName,
          lastName,
          email,
          phoneNumber,
          businessName,
          primaryRegion,
          hostEntityType,
          password,
          isVerifiedLandlord,
        });
        toast.success('Landlord account added successfully');
      } else if (initialData?.id) {
        await api.put(`/admin/landlords/${initialData.id}`, {
          firstName,
          lastName,
          phoneNumber,
          businessName,
          primaryRegion,
          hostEntityType,
        });
        toast.success('Landlord profile updated');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not save landlord details');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs"
      onClick={() => !submitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="landlord-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-zinc-900 rounded-t-[28px] rounded-b-none sm:rounded-3xl sm:max-w-lg w-full p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EAF7EE] dark:bg-emerald-950/60 flex items-center justify-center text-[#04793d] dark:text-emerald-400">
              {mode === 'create' ? <UserPlus className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            </div>
            <div>
              <h2 id="landlord-modal-title" className="text-base font-extrabold text-zinc-900 dark:text-white">
                {mode === 'create' ? 'Add New Landlord' : 'Edit Landlord Details'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {mode === 'create'
                  ? 'Register a property owner or hostel company account.'
                  : 'Update contact details, business name, and operating region.'}
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
              <label htmlFor="ll-first-name" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                First Name *
              </label>
              <input
                id="ll-first-name"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Abena"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="ll-last-name" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Last Name *
              </label>
              <input
                id="ll-last-name"
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
              <label htmlFor="ll-email" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Email Address *
              </label>
              <input
                id="ll-email"
                type="email"
                required
                disabled={mode === 'edit'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="host@akwaaba.test"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="ll-phone" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Phone Number
              </label>
              <input
                id="ll-phone"
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
              <label htmlFor="ll-category" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Host Category
              </label>
              <select
                id="ll-category"
                value={hostEntityType}
                onChange={(e) => setHostEntityType(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ll-region" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Operating Area
              </label>
              <input
                id="ll-region"
                type="text"
                list="landlord-region-suggestions"
                value={primaryRegion}
                onChange={(e) => setPrimaryRegion(e.target.value)}
                placeholder="e.g. Greater Accra (Legon)"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <datalist id="landlord-region-suggestions">
                {REGION_OPTIONS.map((region) => (
                  <option key={region} value={region} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label htmlFor="ll-business" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Business / Hostel Name (Optional)
            </label>
            <input
              id="ll-business"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Golden Palm Hostels Ltd."
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {mode === 'create' && (
            <>
              <div>
                <label htmlFor="ll-password" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Temporary Password *
                </label>
                <input
                  id="ll-password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isVerifiedLandlord}
                  onChange={(e) => setIsVerifiedLandlord(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Mark landlord verification as Verified immediately</span>
              </label>
            </>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#04793d] hover:bg-[#036432] text-white text-xs font-bold transition shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{mode === 'create' ? 'Create Landlord' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
