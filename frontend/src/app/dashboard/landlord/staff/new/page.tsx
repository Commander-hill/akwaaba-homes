'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { 
  UserCheck, 
  ArrowLeft, 
  Building, 
  UserCog, 
  Mail, 
  ShieldCheck, 
  Wrench, 
  FileText, 
  Megaphone, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Info, 
  Key,
  Users,
  BadgeCheck,
  Phone
} from 'lucide-react';

interface RoleOption {
  id: string;
  title: string;
  subtitle: string;
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
    subtitle: 'Primary on-ground operational manager',
    badge: 'Most Common',
    description: 'Lives on or visits the premises regularly. Manages daily repairs, supervises artisans, conducts move-in inspections, and enforces compound cleanliness.',
    recommendedPermissions: {
      canManageTickets: true,
      canCheckInTenants: true,
      canPostNotices: true
    }
  },
  {
    id: 'PORTER',
    title: 'Hostel Porter / Front Gatekeeper',
    subtitle: 'Day-to-day access & resident logistics',
    badge: 'Hostels & Halls',
    description: 'Monitors the main entrance gate, manages key handovers, verifies visitors, logs parcel deliveries, and assists students during move-in week.',
    recommendedPermissions: {
      canManageTickets: false,
      canCheckInTenants: true,
      canPostNotices: false
    }
  },
  {
    id: 'PROPERTY_MANAGER',
    title: 'Executive Property Manager',
    subtitle: 'Full managerial supervision',
    badge: 'Multi-Unit Estates',
    description: 'Professional estate manager managing multiple units, tenancy compliance, maintenance procurement, and high-level communications with residents.',
    recommendedPermissions: {
      canManageTickets: true,
      canCheckInTenants: true,
      canPostNotices: true
    }
  }
];

export default function NewStaffAppointmentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

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
    }
  });

  const propertyList = (propertiesData || []).map((p: any) => ({
    id: p.id || p.propertyId,
    title: p.title || p.propertyTitle || 'Property',
    location: p.location || p.propertyLocation || 'Ghana',
    type: p.type || 'Hostel/Apartment'
  })).filter((p: any) => Boolean(p.id));

  // Auto-select first property
  useEffect(() => {
    if (!selectedPropertyId && propertyList.length > 0) {
      setSelectedPropertyId(propertyList[0].id);
    }
  }, [propertyList, selectedPropertyId]);

  const activeProperty = propertyList.find((p: any) => p.id === selectedPropertyId);
  const currentRole = STAFF_ROLES.find(r => r.id === role) || STAFF_ROLES[0];

  const handleRoleChange = (roleId: string) => {
    setRole(roleId);
    const targetRole = STAFF_ROLES.find(r => r.id === roleId);
    if (targetRole) {
      setCanManageTickets(targetRole.recommendedPermissions.canManageTickets);
      setCanCheckInTenants(targetRole.recommendedPermissions.canCheckInTenants);
      setCanPostNotices(targetRole.recommendedPermissions.canPostNotices);
    }
  };

  const assignStaffMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/staff', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Staff member assigned successfully!');
      queryClient.invalidateQueries({ queryKey: ['propertyStaff', 'landlord'] });
      router.push('/dashboard/landlord?tab=staff');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to appoint staff member';
      setFormError(msg);
      toast.error(msg);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedPropertyId) {
      setFormError('Please select a property from your portfolio.');
      toast.error('Property selection required.');
      return;
    }

    if (!email.trim()) {
      setFormError('Staff member email address is required.');
      toast.error('Email is required.');
      return;
    }

    assignStaffMutation.mutate({
      propertyId: selectedPropertyId,
      email: email.trim().toLowerCase(),
      role,
      canManageTickets,
      canCheckInTenants,
      canPostNotices
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Header & Breadcrumbs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/landlord?tab=staff"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Return to Staff Delegation"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <Link href="/dashboard/landlord" className="hover:underline">Dashboard</Link>
                <span>/</span>
                <Link href="/dashboard/landlord?tab=staff" className="hover:underline">Staff Delegation</Link>
                <span>/</span>
                <span className="text-slate-800 dark:text-slate-200 font-semibold">Appoint Staff Member</span>
              </div>
              <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Appoint Caretaker or Facility Staff
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Role-Based Governance
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left 2-Columns: Form Inputs */}
            <div className="lg:col-span-2 space-y-6">

              {/* Error Banner */}
              {formError && (
                <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="font-semibold">{formError}</div>
                </div>
              )}

              {/* 1. Target Property Selector */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 flex items-center justify-center font-bold">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                        1. Target Property Assignment
                      </h2>
                      <p className="text-xs text-slate-500">
                        Select which building or hostel this staff member will manage
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">
                    {propertyList.length} properties
                  </span>
                </div>

                {isLoadingProps ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading properties...
                  </div>
                ) : propertyList.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs">
                    No active properties found under your landlord account.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {propertyList.map((prop: any) => {
                      const isSelected = selectedPropertyId === prop.id;
                      return (
                        <button
                          key={prop.id}
                          type="button"
                          onClick={() => setSelectedPropertyId(prop.id)}
                          className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                            isSelected
                              ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                              {prop.title}
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                            📍 {prop.location}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Staff Member Account Lookup */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      2. Staff Member Account Identity
                    </h2>
                    <p className="text-xs text-slate-500">
                      Enter the registered email of the person you want to appoint
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5 uppercase tracking-wider">
                    Staff Email Address *
                  </label>
                  <div className="relative rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden focus-within:ring-2 focus-within:ring-[#0F5132]">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. caretaker.mensah@gmail.com"
                      className="w-full pl-10 pr-4 py-3 bg-transparent text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    The caretaker must have an active Akwaaba Homes account registered with this email.
                  </p>
                </div>
              </div>

              {/* 3. Role Specification */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold">
                    <UserCog className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      3. Operational Role Designation
                    </h2>
                    <p className="text-xs text-slate-500">
                      Select official appointment role and operational capacity
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {STAFF_ROLES.map((r) => {
                    const isSelected = role === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleRoleChange(r.id)}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {r.title}
                            </span>
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {r.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                            {r.description}
                          </p>
                        </div>
                        <div className="shrink-0">
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-black bg-[#0F5132] text-white">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-400">
                              Select Role
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Granular Permission Matrix */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                      4. Granular Operational Permissions
                    </h2>
                    <p className="text-xs text-slate-500">
                      Grant specific action capabilities to this staff member
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {/* Permission 1: Check-in / Inspections */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Key className="w-4 h-4 text-emerald-600" />
                        Room Move-In &amp; Move-Out Inspections
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Authorize staff to fill, audit, and sign room condition checklists with arriving or departing residents.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={canCheckInTenants}
                        onChange={(e) => setCanCheckInTenants(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F5132]" />
                    </label>
                  </div>

                  {/* Permission 2: Manage Tickets */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-amber-600" />
                        Maintenance Ticket Arbitration &amp; Artisan Dispatch
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Authorize staff to view tenant grievances, coordinate local artisans (plumbers/electricians), and mark issues resolved.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={canManageTickets}
                        onChange={(e) => setCanManageTickets(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F5132]" />
                    </label>
                  </div>

                  {/* Permission 3: Post Notices */}
                  <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-blue-600" />
                        Compound Announcements &amp; Emergency Bulletins
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Authorize staff to publish power, water tanker, and gate access notices directly to resident app boards.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={canPostNotices}
                        onChange={(e) => setCanPostNotices(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0F5132]" />
                    </label>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column: Appointment Summary &amp; Caretaker Responsibilities */}
            <div className="space-y-6">

              {/* Appointment Dossier Preview Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Appointment Dossier
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                    Draft Letter
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-slate-400 font-medium">Property:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-right truncate max-w-[180px]">
                      {activeProperty ? activeProperty.title : 'None selected'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Designation:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {currentRole.title.split('/')[0]}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-medium">Staff Email:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
                      {email || 'None specified'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Authorized Capabilities:
                    </span>
                    <ul className="space-y-1 text-[11px]">
                      <li className={canCheckInTenants ? 'text-emerald-600 font-bold' : 'text-slate-400 line-through'}>
                        ✓ Room Condition Audits
                      </li>
                      <li className={canManageTickets ? 'text-emerald-600 font-bold' : 'text-slate-400 line-through'}>
                        ✓ Maintenance Ticket Arbitration
                      </li>
                      <li className={canPostNotices ? 'text-emerald-600 font-bold' : 'text-slate-400 line-through'}>
                        ✓ Compound Bulletins &amp; Alerts
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Primary Submit Button */}
                <div className="space-y-2.5 pt-3">
                  <button
                    type="submit"
                    disabled={assignStaffMutation.isPending}
                    className="w-full py-3.5 bg-[#0F5132] hover:bg-[#146c43] text-white rounded-2xl font-black text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {assignStaffMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Authorizing Appointment...
                      </>
                    ) : (
                      <>
                        <BadgeCheck className="w-4 h-4" /> Confirm Appointment
                      </>
                    )}
                  </button>

                  <Link
                    href="/dashboard/landlord?tab=staff"
                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-xs transition-colors flex items-center justify-center"
                  >
                    Cancel &amp; Return
                  </Link>
                </div>
              </div>

              {/* Legal Governance Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-md space-y-3">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Info className="w-5 h-5 shrink-0" />
                  <h4 className="font-extrabold text-xs uppercase tracking-wider">
                    Caretaker Role Guidelines
                  </h4>
                </div>
                <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
                  <p>
                    Appointed caretakers represent the property management team on-site.
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[11px]">
                    <li>Caretakers must not infringe upon the tenant's quiet enjoyment of leased premises.</li>
                    <li>Room inspections require at least 24h prior notification except in verified emergency leaks or electrical hazards.</li>
                    <li>Revoking an appointment immediately severs caretaker access to tenant tickets and inspections.</li>
                  </ul>
                </div>
              </div>

            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
