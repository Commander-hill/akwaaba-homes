'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import {
  ShieldAlert,
  AlertTriangle,
  FileText,
  Building,
  User,
  Phone,
  Clock,
  Calendar,
  Volume2,
  Users,
  Flame,
  Cigarette,
  Hammer,
  Swords,
  DoorClosed,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Send,
  Loader2,
  Gavel,
  BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

type InfractionType = 
  | 'NOISE_POLLUTION' 
  | 'UNAUTHORIZED_GUEST' 
  | 'PROHIBITED_APPLIANCE' 
  | 'SMOKING_CONTRABAND' 
  | 'PROPERTY_DAMAGE' 
  | 'FIGHTING_HARASSMENT'
  | 'CURFEW_VIOLATION';

type StrikeLevel = 1 | 2 | 3;
type IncidentStatus = 'WARNING_ISSUED' | 'FINE_PENDING' | 'SETTLED' | 'EVICTION_PROCEEDINGS';

interface DisciplinaryIncident {
  id: string;
  propertyId: string;
  referenceCode: string;
  residentName: string;
  residentPhone: string;
  roomUnit: string;
  infractionType: InfractionType;
  incidentDate: string;
  incidentTime: string;
  strikeLevel: StrikeLevel;
  fineAmountGHS: number;
  status: IncidentStatus;
  description: string;
  reportedBy: string;
  witnessStatement?: string;
}

const INFRACTIONS: Array<{
  id: InfractionType;
  label: string;
  icon: any;
  defaultFine: string;
  color: string;
  description: string;
}> = [
  {
    id: 'NOISE_POLLUTION',
    label: 'Noise Curfew Violation',
    icon: Volume2,
    defaultFine: '0',
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    description: 'Blaring music, loud partying during quiet hours (post 10:00 PM).'
  },
  {
    id: 'UNAUTHORIZED_GUEST',
    label: 'Unauthorized Overnight Guest',
    icon: Users,
    defaultFine: '100',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    description: 'Unregistered squatters or non-residents staying past gate curfew.'
  },
  {
    id: 'PROHIBITED_APPLIANCE',
    label: 'Prohibited Heating Appliance',
    icon: Flame,
    defaultFine: '150',
    color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
    description: 'Electric coil heaters, hotplates, or high-draw elements causing breaker trips.'
  },
  {
    id: 'SMOKING_CONTRABAND',
    label: 'Smoking & Contraband',
    icon: Cigarette,
    defaultFine: '200',
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    description: 'Smoking shisha, cigarettes, or contraband inside rooms/corridors.'
  },
  {
    id: 'PROPERTY_DAMAGE',
    label: 'Fixture or Wall Destruction',
    icon: Hammer,
    defaultFine: '300',
    color: 'text-red-500 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800',
    description: 'Damaged locks, smashed louvre blades, broken beds, or defaced walls.'
  },
  {
    id: 'FIGHTING_HARASSMENT',
    label: 'Physical Altercation / Brawl',
    icon: Swords,
    defaultFine: '400',
    color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    description: 'Assault, fighting, threats, or harassment against residents or porter.'
  },
  {
    id: 'CURFEW_VIOLATION',
    label: 'Gate Curfew Breach',
    icon: DoorClosed,
    defaultFine: '50',
    color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800',
    description: 'Scaling perimeter fence or returning after lockdown hours.'
  }
];

function NewDisciplinaryIncidentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPropertyId = searchParams.get('propertyId') || '';

  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [residentName, setResidentName] = useState('');
  const [residentPhone, setResidentPhone] = useState('');
  const [roomUnit, setRoomUnit] = useState('RM 101');
  const [infraction, setInfraction] = useState<InfractionType>('NOISE_POLLUTION');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState('22:30');
  const [strikeLevel, setStrikeLevel] = useState<StrikeLevel>(1);
  const [fineAmount, setFineAmount] = useState('0');
  const [status, setStatus] = useState<IncidentStatus>('WARNING_ISSUED');
  const [reportedBy, setReportedBy] = useState('Hostel Caretaker / Porter On Duty');
  const [witnessStatement, setWitnessStatement] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch properties owned by landlord
  const { data: propertiesData, isLoading: loadingProperties } = useQuery({
    queryKey: ['properties', 'landlord'],
    queryFn: async () => {
      const res = await api.get('/properties/my-properties');
      return res.data;
    }
  });

  const properties = propertiesData?.properties || propertiesData?.data || [];

  useEffect(() => {
    if (!propertyId && properties.length > 0) {
      setPropertyId(initialPropertyId || properties[0].id);
    }
  }, [properties, propertyId, initialPropertyId]);

  const handleInfractionChange = (newInfraction: InfractionType) => {
    setInfraction(newInfraction);
    const item = INFRACTIONS.find(i => i.id === newInfraction);
    if (item && strikeLevel > 1) {
      setFineAmount(item.defaultFine);
    }
  };

  const handleStrikeChange = (level: StrikeLevel) => {
    setStrikeLevel(level);
    if (level === 1) {
      setFineAmount('0');
      setStatus('WARNING_ISSUED');
    } else if (level === 2) {
      setFineAmount('200');
      setStatus('FINE_PENDING');
    } else {
      setFineAmount('400');
      setStatus('EVICTION_PROCEEDINGS');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) {
      toast.error('Please select the hostel or rental property');
      return;
    }
    if (!residentName.trim()) {
      toast.error('Resident name is required');
      return;
    }
    if (!description.trim()) {
      toast.error('Please provide a detailed description of the violation');
      return;
    }

    setIsSubmitting(true);

    const refCode = `DISC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newIncident: DisciplinaryIncident = {
      id: `disc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      propertyId,
      referenceCode: refCode,
      residentName: residentName.trim(),
      residentPhone: residentPhone.trim(),
      roomUnit: roomUnit.trim(),
      infractionType: infraction,
      incidentDate,
      incidentTime,
      strikeLevel,
      fineAmountGHS: parseFloat(fineAmount) || 0,
      status,
      description: description.trim(),
      reportedBy: reportedBy.trim(),
      witnessStatement: witnessStatement.trim() || undefined
    };

    try {
      const storageKey = `akwaaba_disciplinary_incidents_${propertyId}`;
      const saved = localStorage.getItem(storageKey);
      const existing = saved ? JSON.parse(saved) : [];
      const updated = [newIncident, ...existing];
      localStorage.setItem(storageKey, JSON.stringify(updated));

      toast.success(`Disciplinary dossier ${refCode} logged successfully!`);
      router.push('/dashboard/landlord?tab=hostel');
    } catch (err) {
      toast.error('Failed to save disciplinary record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedInfraction = INFRACTIONS.find(i => i.id === infraction) || INFRACTIONS[0];
  const selectedProperty = properties.find((p: any) => p.id === propertyId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Top Header / Breadcrumb */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <Link href="/dashboard/landlord" className="hover:text-primary flex items-center gap-1 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Landlord Dashboard
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-slate-900 dark:text-white font-bold">Disciplinary Incident Workstation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Gavel className="w-3.5 h-3.5" /> Ghana Rent Act § 19 Enforceable
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Page Hero */}
        <div className="bg-gradient-to-r from-rose-700 via-red-600 to-amber-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden mb-8">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
            <ShieldAlert className="w-72 h-72" />
          </div>
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              <Gavel className="w-3.5 h-3.5" /> Student Hostel Code of Conduct
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Log Resident Disciplinary Incident
            </h1>
            <p className="text-rose-100 text-sm leading-relaxed">
              Formally document student misconduct, noise infractions, unauthorized occupants, or property damage. Records generate audit citations for parent notifications and Rent Control dispute filings.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Property Selection */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-rose-500" />
                Select Hostel or Compound
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Hostel / Residence Facility
                </label>
                {loadingProperties ? (
                  <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ) : (
                  <select
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {properties.length === 0 && (
                      <option value="">No properties registered</option>
                    )}
                    {properties.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.location ? `— ${p.location}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* 2. Infraction Category */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-500" />
                Select Violation Category
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INFRACTIONS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = infraction === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleInfractionChange(item.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 ring-2 ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${item.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.label}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                          {item.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Resident & Unit Info */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-rose-500" />
                Resident Identity & Room Assignment
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Student / Resident Name *
                  </label>
                  <input
                    type="text"
                    value={residentName}
                    onChange={(e) => setResidentName(e.target.value)}
                    placeholder="e.g. Emmanuel Osei"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={residentPhone}
                      onChange={(e) => setResidentPhone(e.target.value)}
                      placeholder="024 XXX XXXX"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Room / Unit Number *
                  </label>
                  <input
                    type="text"
                    value={roomUnit}
                    onChange={(e) => setRoomUnit(e.target.value)}
                    placeholder="e.g. Block C, Room 204"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date of Occurrence
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Time of Occurrence
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="time"
                      value={incidentTime}
                      onChange={(e) => setIncidentTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Reported By
                  </label>
                  <input
                    type="text"
                    value={reportedBy}
                    onChange={(e) => setReportedBy(e.target.value)}
                    placeholder="e.g. Caretaker / Porter"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* 4. Strike Escalation & Sanction */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Disciplinary Strike Level & Statutory Sanctions
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleStrikeChange(1)}
                  className={`p-4 rounded-xl border text-left transition ${
                    strikeLevel === 1
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 ring-2 ring-amber-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-extrabold text-amber-600">Strike 1</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">Written Warning</div>
                  <div className="text-[11px] text-slate-500 mt-1">Formal reprimand letter issued with 0 surcharge.</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleStrikeChange(2)}
                  className={`p-4 rounded-xl border text-left transition ${
                    strikeLevel === 2
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 ring-2 ring-orange-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-extrabold text-orange-600">Strike 2</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">Financial Surcharge</div>
                  <div className="text-[11px] text-slate-500 mt-1">GH₵ 200 fee + guardian notification dispatch.</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleStrikeChange(3)}
                  className={`p-4 rounded-xl border text-left transition ${
                    strikeLevel === 3
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30 ring-2 ring-rose-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-extrabold text-rose-600">Strike 3</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">Eviction Referral</div>
                  <div className="text-[11px] text-slate-500 mt-1">Rent Control referral & hostel expulsion notice.</div>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Disciplinary Fine / Damage Surcharge (GH₵)
                  </label>
                  <input
                    type="number"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sanction Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as IncidentStatus)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="WARNING_ISSUED">Warning Issued (Pending Acknowledgment)</option>
                    <option value="FINE_PENDING">Disciplinary Surcharge Pending Settlement</option>
                    <option value="SETTLED">Fine Settled / Case Closed</option>
                    <option value="EVICTION_PROCEEDINGS">Referred to Rent Control for Eviction</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 5. Violation Description */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-rose-500" />
                Incident Narrative & Witness Statements
              </h2>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Comprehensive Incident Description *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail what occurred, who was present, what items were confiscated or damaged, and resident response when confronted..."
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Witness Corroboration / Porter Statement (Optional)
                </label>
                <textarea
                  rows={2}
                  value={witnessStatement}
                  onChange={(e) => setWitnessStatement(e.target.value)}
                  placeholder="Witness statements from roommates, adjacent room occupants, or night security..."
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Legal Citation & Action Summary */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 sticky top-24">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-rose-500" /> Statutory Legal Advisory
              </h3>

              {/* Legal Reference Card */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2 text-xs text-amber-900 dark:text-amber-300">
                <div className="font-bold flex items-center gap-1 text-amber-700 dark:text-amber-400">
                  <ShieldCheck className="w-4 h-4" /> Ghana Rent Act, 1963 (Act 220) § 19
                </div>
                <p className="text-[11px] leading-relaxed">
                  Under Act 220 § 19, a landlord may apply to the Rent Magistrate for an order of recovery of possession if the tenant has been guilty of conduct causing a nuisance or annoyance to adjoining occupiers.
                </p>
              </div>

              <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Selected Offense:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedInfraction.label}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Assigned Strike:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">Strike Level {strikeLevel}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Disciplinary Surcharge:</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    GH₵ {parseFloat(fineAmount || '0').toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Target Facility:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                    {selectedProperty?.title || 'Selected Facility'}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Recording Incident...
                    </>
                  ) : (
                    <>
                      <Gavel className="w-4 h-4" /> Issue Citation & Log Record
                    </>
                  )}
                </button>

                <Link
                  href="/dashboard/landlord?tab=hostel"
                  className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center transition"
                >
                  Cancel & Return
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewDisciplinaryIncidentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        </div>
      }
    >
      <NewDisciplinaryIncidentContent />
    </Suspense>
  );
}
