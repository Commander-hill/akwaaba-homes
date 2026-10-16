'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import AlertBanner from '@/components/AlertBanner';
import {
  ArrowLeft,
  ArrowRight,
  Building,
  Mail,
  CheckCircle2,
  Wrench,
  Megaphone,
  Loader2,
  Info,
  Key,
  Check,
  MapPin,
} from 'lucide-react';

interface RoleOption {
  id: string;
  title: string;
  shortTitle: string;
  badge: string;
  description: string;
  recommendedPermissions: {
    canManageTickets: boolean;
    canCheckInTenants: boolean;
    canPostNotices: boolean;
  };
}

const STAFF_ROLES: RoleOption[] = [
  {
    id: 'CARETAKER',
    title: 'Resident Caretaker / Facilities Custodian',
    shortTitle: 'Resident Caretaker',
    badge: 'Most Common',
    description:
      'Lives on or visits the premises regularly. Manages daily repairs, supervises artisans, conducts move-in inspections, and enforces compound cleanliness.',
    recommendedPermissions: {
      canManageTickets: true,
      canCheckInTenants: true,
      canPostNotices: true,
    },
  },
  {
    id: 'PORTER',
    title: 'Hostel Porter / Front Gatekeeper',
    shortTitle: 'Hostel Porter',
    badge: 'Hostels & Halls',
    description:
      'Monitors the main entrance gate, manages key handovers, verifies visitors, logs parcel deliveries, and assists students during move-in week.',
    recommendedPermissions: {
      canManageTickets: false,
      canCheckInTenants: true,
      canPostNotices: false,
    },
  },
  {
    id: 'PROPERTY_MANAGER',
    title: 'Executive Property Manager',
    shortTitle: 'Property Manager',
    badge: 'Multi-Unit Estates',
    description:
      'Professional estate manager overseeing multiple units, tenancy compliance, maintenance procurement, and high-level communications with residents.',
    recommendedPermissions: {
      canManageTickets: true,
      canCheckInTenants: true,
      canPostNotices: true,
    },
  },
];

export default function NewStaffAppointmentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const errorRef = useRef<HTMLDivElement>(null);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string>('CARETAKER');
  const [canManageTickets, setCanManageTickets] = useState<boolean>(true);
  const [canCheckInTenants, setCanCheckInTenants] = useState<boolean>(true);
  const [canPostNotices, setCanPostNotices] = useState<boolean>(true);
  const [formError, setFormError] = useState<string>('');

  // Fetch properties owned by landlord
  const { data: propertiesData, isLoading: isLoadingProps } = useQuery({
    queryKey: ['properties', 'landlord', 'mine'],
    queryFn: async () => {
      try {
        const res = await api.get('/properties/landlord/mine');
        return res.data?.data || [];
      } catch {
        return [];
      }
    },
  });

  const propertyList = (propertiesData || [])
    .map((p: any) => ({
      id: p.id || p.propertyId,
      title: p.title || p.propertyTitle || 'Property',
      location: p.location || p.propertyLocation || 'Ghana',
      type: p.type || 'Hostel / Apartment',
    }))
    .filter((p: any) => Boolean(p.id));

  // Auto-select first property
  useEffect(() => {
    if (!selectedPropertyId && propertyList.length > 0) {
      setSelectedPropertyId(propertyList[0].id);
    }
  }, [propertyList, selectedPropertyId]);

  const activeProperty = propertyList.find((p: any) => p.id === selectedPropertyId);
  const currentRole = STAFF_ROLES.find((r) => r.id === role) || STAFF_ROLES[0];

  const activePermissionsCount = [canCheckInTenants, canManageTickets, canPostNotices].filter(Boolean).length;

  const triggerError = (msg: string) => {
    setFormError(msg);
    toast.error(msg);
    setTimeout(() => {
      if (errorRef.current) {
        errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  const handleRoleChange = (roleId: string) => {
    setRole(roleId);
    const targetRole = STAFF_ROLES.find((r) => r.id === roleId);
    if (targetRole) {
      setCanManageTickets(targetRole.recommendedPermissions.canManageTickets);
      setCanCheckInTenants(targetRole.recommendedPermissions.canCheckInTenants);
      setCanPostNotices(targetRole.recommendedPermissions.canPostNotices);
    }
  };

  const validateStep = (step: number): boolean => {
    setFormError('');
    if (step === 1) {
      if (!selectedPropertyId) {
        triggerError('Please select a target property from your portfolio.');
        return false;
      }
    }
    if (step === 2) {
      const trimmed = email.trim();
      if (!trimmed || !trimmed.includes('@')) {
        triggerError('Please enter a valid registered email address for the staff member.');
        return false;
      }
    }
    if (step === 3) {
      if (!role) {
        triggerError('Please select an operational role designation.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep) && currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    setFormError('');
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const assignStaffMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/staff', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Staff member appointed successfully!');
      queryClient.invalidateQueries({ queryKey: ['propertyStaff', 'landlord'] });
      router.push('/dashboard/landlord?tab=staff');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to appoint staff member';
      triggerError(msg);
    },
  });

  const handleSubmit = () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    assignStaffMutation.mutate({
      propertyId: selectedPropertyId,
      email: email.trim().toLowerCase(),
      role,
      canManageTickets,
      canCheckInTenants,
      canPostNotices,
    });
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      {/* ── HEADER & 4-STEP SEGMENTED BAR ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard/landlord?tab=staff"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Staff Delegation
            </Link>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Appoint Caretaker or Facility Staff
            </h1>
          </div>
        </div>

        {/* 4-Step Segmented Bar (Matches List Property Page) */}
        <div className="grid grid-cols-4 gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
          {[
            { step: 1, label: '1. Target Property' },
            { step: 2, label: '2. Staff Identity' },
            { step: 3, label: '3. Role Designation' },
            { step: 4, label: '4. Access & Review' },
          ].map((s) => (
            <button
              key={s.step}
              type="button"
              onClick={() => {
                if (s.step < currentStep || validateStep(currentStep)) {
                  setCurrentStep(s.step as 1 | 2 | 3 | 4);
                }
              }}
              className={clsx(
                'py-2 text-center font-bold rounded-lg transition-all cursor-pointer truncate px-1',
                currentStep === s.step
                  ? 'bg-[#0F5132] text-white shadow-xs'
                  : currentStep > s.step
                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {formError && <AlertBanner ref={errorRef} type="error" message={formError} />}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 1: TARGET PROPERTY ASSIGNMENT
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                Step 1: Target Property Assignment
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Select which building or hostel from your portfolio this staff member will manage.
              </p>
            </div>
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {propertyList.length} {propertyList.length === 1 ? 'Property' : 'Properties'}
            </span>
          </div>

          <div>
            {isLoadingProps ? (
              <div className="py-10 flex items-center justify-center gap-2 text-zinc-400 text-xs font-bold">
                <Loader2 className="w-4 h-4 animate-spin text-[#0F5132]" /> Loading your properties...
              </div>
            ) : propertyList.length === 0 ? (
              <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs space-y-2">
                <p className="font-bold">No active properties found under your landlord account.</p>
                <Link
                  href="/dashboard/landlord/new"
                  className="inline-flex items-center gap-1.5 text-[#0F5132] dark:text-emerald-400 font-bold underline"
                >
                  Publish a property listing first
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {propertyList.map((prop: any) => {
                  const isSelected = selectedPropertyId === prop.id;
                  return (
                    <button
                      key={prop.id}
                      type="button"
                      onClick={() => setSelectedPropertyId(prop.id)}
                      className={clsx(
                        'text-left p-4 rounded-xl border-2 transition-all cursor-pointer relative',
                        isSelected
                          ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Building
                            className={clsx(
                              'w-4 h-4 shrink-0',
                              isSelected ? 'text-[#0F5132] dark:text-emerald-400' : 'text-zinc-400'
                            )}
                          />
                          <span className="font-bold text-xs text-zinc-950 dark:text-white uppercase tracking-wide truncate">
                            {prop.title}
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-2 pl-6 truncate">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{prop.location}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleNext}
              disabled={propertyList.length === 0}
              className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              <span>Next: Staff Identity</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 2: STAFF MEMBER ACCOUNT IDENTITY
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 2: Staff Member Account Identity
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Enter the registered email address of the caretaker, porter, or manager you wish to appoint.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Staff Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. caretaker.mensah@gmail.com"
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  required
                />
              </div>
              <p className="text-[11px] text-zinc-500 mt-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span>
                  The appointed individual must have an active Akwaaba Homes account registered under this email
                  address.
                </span>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-zinc-400 block uppercase">Assigning To Property</span>
                <span className="font-bold text-zinc-900 dark:text-white">
                  {activeProperty ? `${activeProperty.title} (${activeProperty.location})` : 'None selected'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs font-bold text-[#0F5132] dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Change
              </button>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-300 text-xs font-bold rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>Next: Role Designation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 3: OPERATIONAL ROLE DESIGNATION
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 3: Operational Role Designation
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select the official appointment role and operational capacity for this staff member.
            </p>
          </div>

          <div className="space-y-3">
            {STAFF_ROLES.map((r) => {
              const isSelected = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleChange(r.id)}
                  className={clsx(
                    'w-full p-4 rounded-xl border-2 text-left transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer',
                    isSelected
                      ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40'
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs text-zinc-950 dark:text-white">{r.title}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                        {r.badge}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">{r.description}</p>
                  </div>

                  <div className="shrink-0">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0F5132] text-white">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-zinc-400">Select Role</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-300 text-xs font-bold rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>Next: Access &amp; Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 4: PERMISSIONS, GOVERNANCE & APPOINTMENT REVIEW
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 4: Access Permissions &amp; Review
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Configure operational capabilities and review the appointment summary before confirming.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Granular Operational Permissions
              </label>

              <div className="space-y-3">
                {/* Permission 1: Check-in / Inspections */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-bold text-xs text-zinc-950 dark:text-white flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                      Room Move-In &amp; Move-Out Inspections
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Authorize staff to complete, audit, and sign room condition checklists with arriving or departing
                      residents.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={canCheckInTenants}
                      onChange={(e) => setCanCheckInTenants(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0F5132]" />
                  </label>
                </div>

                {/* Permission 2: Manage Tickets */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-bold text-xs text-zinc-950 dark:text-white flex items-center gap-2">
                      <Wrench className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                      Maintenance Ticket Arbitration &amp; Artisan Dispatch
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Authorize staff to inspect tenant maintenance tickets, coordinate local artisans, and mark repairs
                      resolved.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={canManageTickets}
                      onChange={(e) => setCanManageTickets(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0F5132]" />
                  </label>
                </div>

                {/* Permission 3: Post Notices */}
                <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="font-bold text-xs text-zinc-950 dark:text-white flex items-center gap-2">
                      <Megaphone className="w-3.5 h-3.5 text-[#0F5132] dark:text-emerald-400" />
                      Compound Announcements &amp; Emergency Bulletins
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Authorize staff to publish water, power, and gate access notices directly to resident boards.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={canPostNotices}
                      onChange={(e) => setCanPostNotices(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0F5132]" />
                  </label>
                </div>
              </div>
            </div>

            {/* Caretaker Governance Note */}
            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                Appointed staff must respect tenants&rsquo; quiet enjoyment and provide at least 24 hours&rsquo; prior
                notice before routine room inspections (except in verified emergencies). You can revoke staff access at
                any time from your dashboard.
              </div>
            </div>

            {/* Pre-Confirm Summary Box (Matches Publication Summary on List Property Page) */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                Appointment Summary
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Property</span>
                  <span className="font-bold text-zinc-900 dark:text-white truncate block">
                    {activeProperty ? activeProperty.title : 'Not selected'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Staff Account</span>
                  <span className="font-bold text-zinc-900 dark:text-white truncate block">
                    {email || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Designation</span>
                  <span className="font-bold text-[#0F5132] dark:text-emerald-400 truncate block">
                    {currentRole.shortTitle}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Access Scope</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {activePermissionsCount} of 3 Capabilities
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-300 text-xs font-bold rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={assignStaffMutation.isPending}
              className="px-6 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {assignStaffMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>Confirm Appointment</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
