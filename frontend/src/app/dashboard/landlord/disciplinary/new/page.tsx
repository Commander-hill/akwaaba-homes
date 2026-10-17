'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import clsx from 'clsx';
import AlertBanner from '@/components/AlertBanner';
import {
  Building,
  Volume2,
  Users,
  Flame,
  Cigarette,
  Hammer,
  Swords,
  DoorClosed,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Check,
  MapPin,
  Info,
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
  description: string;
}> = [
  {
    id: 'NOISE_POLLUTION',
    label: 'Noise Curfew Violation',
    icon: Volume2,
    defaultFine: '0',
    description: 'Blaring music or loud disturbance during compound quiet hours (after 10:00 PM).',
  },
  {
    id: 'UNAUTHORIZED_GUEST',
    label: 'Unauthorized Overnight Guest',
    icon: Users,
    defaultFine: '100',
    description: 'Unregistered squatters or non-residents staying past compound gate curfew.',
  },
  {
    id: 'PROHIBITED_APPLIANCE',
    label: 'Prohibited Heating Appliance',
    icon: Flame,
    defaultFine: '150',
    description: 'Electric coil heaters, hotplates, or high-load elements causing breaker trips.',
  },
  {
    id: 'SMOKING_CONTRABAND',
    label: 'Smoking & Contraband',
    icon: Cigarette,
    defaultFine: '200',
    description: 'Smoking shisha, cigarettes, or prohibited substances inside rooms or corridors.',
  },
  {
    id: 'PROPERTY_DAMAGE',
    label: 'Fixture or Wall Destruction',
    icon: Hammer,
    defaultFine: '300',
    description: 'Damaged locks, broken louvre blades, damaged furniture, or defaced walls.',
  },
  {
    id: 'FIGHTING_HARASSMENT',
    label: 'Physical Altercation / Harassment',
    icon: Swords,
    defaultFine: '400',
    description: 'Physical altercation, threats, or harassment against residents or staff.',
  },
  {
    id: 'CURFEW_VIOLATION',
    label: 'Gate Curfew Breach',
    icon: DoorClosed,
    defaultFine: '50',
    description: 'Scaling perimeter walls or forcing gate access after lockdown hours.',
  },
];

function NewDisciplinaryIncidentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPropertyId = searchParams.get('propertyId') || '';
  const errorRef = useRef<HTMLDivElement>(null);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [propertyId, setPropertyId] = useState(initialPropertyId);
  const [residentName, setResidentName] = useState('');
  const [residentPhone, setResidentPhone] = useState('');
  const [roomUnit, setRoomUnit] = useState('RM 101');
  const [infraction, setInfraction] = useState<InfractionType>('NOISE_POLLUTION');
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [incidentTime, setIncidentTime] = useState('22:30');
  const [strikeLevel, setStrikeLevel] = useState<StrikeLevel>(1);
  const [fineAmount, setFineAmount] = useState('0');
  const [status, setStatus] = useState<IncidentStatus>('WARNING_ISSUED');
  const [reportedBy, setReportedBy] = useState('Hostel Caretaker / Porter On Duty');
  const [witnessStatement, setWitnessStatement] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch properties owned by landlord
  const { data: propertiesData, isLoading: loadingProperties } = useQuery({
    queryKey: ['properties', 'landlord', 'mine'],
    queryFn: async () => {
      try {
        const res = await api.get('/properties/landlord/mine');
        return res.data?.data || [];
      } catch {
        const fallback = await api.get('/properties/my-properties');
        return fallback.data?.properties || fallback.data?.data || [];
      }
    },
  });

  const properties = (propertiesData || [])
    .map((p: any) => ({
      id: p.id || p.propertyId,
      title: p.title || p.propertyTitle || 'Property',
      location: p.location || p.propertyLocation || 'Ghana',
    }))
    .filter((p: any) => Boolean(p.id));

  useEffect(() => {
    if (!propertyId && properties.length > 0) {
      setPropertyId(initialPropertyId || properties[0].id);
    }
  }, [properties, propertyId, initialPropertyId]);

  const selectedInfraction = INFRACTIONS.find((i) => i.id === infraction) || INFRACTIONS[0];
  const selectedProperty = properties.find((p: any) => p.id === propertyId);

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

  const handleInfractionChange = (newInfraction: InfractionType) => {
    setInfraction(newInfraction);
    const item = INFRACTIONS.find((i) => i.id === newInfraction);
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
      setFineAmount(selectedInfraction.defaultFine !== '0' ? selectedInfraction.defaultFine : '200');
      setStatus('FINE_PENDING');
    } else {
      setFineAmount('400');
      setStatus('EVICTION_PROCEEDINGS');
    }
  };

  const validateStep = (step: number): boolean => {
    setFormError('');
    if (step === 1) {
      if (!propertyId) {
        triggerError('Please select a target hostel or property.');
        return false;
      }
      if (!residentName.trim()) {
        triggerError('Please enter the resident full name.');
        return false;
      }
    }
    if (step === 2) {
      if (!infraction) {
        triggerError('Please select the infraction category.');
        return false;
      }
    }
    if (step === 3) {
      if (!description.trim()) {
        triggerError('Please provide a clear factual description of the incident.');
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

  const handleSubmit = () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

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
      witnessStatement: witnessStatement.trim() || undefined,
    };

    try {
      const storageKey = `akwaaba_disciplinary_incidents_${propertyId}`;
      const saved = localStorage.getItem(storageKey);
      const existing = saved ? JSON.parse(saved) : [];
      const updated = [newIncident, ...existing];
      localStorage.setItem(storageKey, JSON.stringify(updated));

      toast.success(`Disciplinary dossier ${refCode} logged successfully!`);
      router.push('/dashboard/landlord?tab=hostel');
    } catch {
      triggerError('Failed to save disciplinary record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      {/* ── HEADER & 4-STEP SEGMENTED BAR ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard/landlord?tab=hostel"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white mb-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Conduct &amp; Disciplinary
            </Link>
            <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
              Log Resident Disciplinary Incident
            </h1>
          </div>
        </div>

        {/* 4-Step Segmented Bar (Matches List Property Page) */}
        <div className="grid grid-cols-4 gap-2 bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
          {[
            { step: 1, label: '1. Property & Resident' },
            { step: 2, label: '2. Infraction & Strike' },
            { step: 3, label: '3. Incident Report' },
            { step: 4, label: '4. Sanction & Review' },
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
          STEP 1: PROPERTY & RESIDENT PARTICULARS
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 1: Property &amp; Resident Particulars
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select the hostel or compound and identify the resident involved in the incident.
            </p>
          </div>

          <div className="space-y-5">
            {loadingProperties ? (
              <div className="py-8 flex items-center justify-center gap-2 text-zinc-400 text-xs font-bold">
                <Loader2 className="w-4 h-4 animate-spin text-[#0F5132]" /> Loading properties...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {properties.map((prop: any) => {
                  const isSelected = propertyId === prop.id;
                  return (
                    <button
                      key={prop.id}
                      type="button"
                      onClick={() => setPropertyId(prop.id)}
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Resident Full Name *
                </label>
                <input
                  type="text"
                  value={residentName}
                  onChange={(e) => setResidentName(e.target.value)}
                  placeholder="e.g. Kwesi Mensah"
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Room / Unit Number *
                </label>
                <input
                  type="text"
                  value={roomUnit}
                  onChange={(e) => setRoomUnit(e.target.value)}
                  placeholder="e.g. RM 104 / Block B"
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Resident Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={residentPhone}
                  onChange={(e) => setResidentPhone(e.target.value)}
                  placeholder="e.g. 0244123456"
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>Next: Infraction &amp; Strike</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 2: INFRACTION CATEGORY & STRIKE LEVEL
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 2: Infraction Category &amp; Strike Level
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Classify the compound rule violation and assign the corresponding disciplinary strike tier.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Nature of Violation *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {INFRACTIONS.map((item) => {
                  const Icon = item.icon;
                  const isSelected = infraction === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleInfractionChange(item.id)}
                      className={clsx(
                        'p-3.5 rounded-xl border-2 text-left transition-all flex items-start gap-3 cursor-pointer',
                        isSelected
                          ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40'
                      )}
                    >
                      <div
                        className={clsx(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                          isSelected
                            ? 'bg-[#0F5132] text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-zinc-950 dark:text-white truncate">{item.label}</span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-[#0F5132] dark:text-emerald-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{item.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                Disciplinary Strike Tier *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    level: 1 as StrikeLevel,
                    title: 'Strike 1: Formal Warning',
                    desc: 'Written caution placed on file. No monetary fine.',
                  },
                  {
                    level: 2 as StrikeLevel,
                    title: 'Strike 2: Restitution Fine',
                    desc: 'Second violation or damage repair surcharge.',
                  },
                  {
                    level: 3 as StrikeLevel,
                    title: 'Strike 3: Final Notice',
                    desc: 'Severe breach; escalates to guardian & tenancy review.',
                  },
                ].map((s) => {
                  const isSelected = strikeLevel === s.level;
                  return (
                    <button
                      key={s.level}
                      type="button"
                      onClick={() => handleStrikeChange(s.level)}
                      className={clsx(
                        'p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer',
                        isSelected
                          ? 'border-[#0F5132] bg-emerald-50/40 dark:bg-emerald-950/20 shadow-2xs'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40'
                      )}
                    >
                      <div className="font-bold text-xs text-zinc-950 dark:text-white mb-1">{s.title}</div>
                      <p className="text-[11px] text-zinc-500 leading-relaxed">{s.desc}</p>
                    </button>
                  );
                })}
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
              onClick={handleNext}
              className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
            >
              <span>Next: Incident Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 3: INCIDENT DATE, STATEMENT & WITNESS REPORT
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 3: Factual Incident Report &amp; Witness Log
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Record the date, time, reporting officer, and objective description of what occurred.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Incident Date *
                </label>
                <input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Incident Time *
                </label>
                <input
                  type="time"
                  value={incidentTime}
                  onChange={(e) => setIncidentTime(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Reported By *
                </label>
                <input
                  type="text"
                  value={reportedBy}
                  onChange={(e) => setReportedBy(e.target.value)}
                  placeholder="e.g. Hostel Caretaker On Duty"
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Detailed Incident Description *
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide an objective, factual account of the violation, warnings given, and any property affected..."
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl p-3.5 text-xs font-medium text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                Corroborating Witness Statement (Optional)
              </label>
              <textarea
                rows={2}
                value={witnessStatement}
                onChange={(e) => setWitnessStatement(e.target.value)}
                placeholder="Name / room number of any co-tenant or security guard who witnessed the incident..."
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl p-3.5 text-xs font-medium text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
              />
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
              <span>Next: Sanction &amp; Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          STEP 4: SANCTION ASSESSMENT & DOSSIER REVIEW
         ══════════════════════════════════════════════════════════════════════════ */}
      {currentStep === 4 && (
        <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-6 animate-in">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
              Step 4: Sanction Assessment &amp; Review
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Confirm any restitution surcharge and review the disciplinary dossier before recording.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Restitution / Fine Amount (GH₵)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={fineAmount}
                  onChange={(e) => setFineAmount(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                  Dossier Resolution Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as IncidentStatus)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white outline-none focus:border-[#0F5132] cursor-pointer"
                >
                  <option value="WARNING_ISSUED">Formal Warning Issued</option>
                  <option value="FINE_PENDING">Restitution Fine Pending</option>
                  <option value="SETTLED">Resolved &amp; Settled</option>
                  <option value="EVICTION_PROCEEDINGS">Escalated to Tenancy Review</option>
                </select>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 leading-relaxed flex items-start gap-2.5">
              <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                Residents have the right to submit a formal written response or appeal from their Tenant Portal within 7
                days of a disciplinary citation.
              </div>
            </div>

            {/* Horizontal Summary Box (Matches Publication Summary on List Property Page) */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="text-xs font-bold text-zinc-950 dark:text-white uppercase tracking-wider">
                Disciplinary Citation Summary
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Property &amp; Unit</span>
                  <span className="font-bold text-zinc-900 dark:text-white truncate block">
                    {selectedProperty ? `${selectedProperty.title} (${roomUnit})` : roomUnit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Resident</span>
                  <span className="font-bold text-zinc-900 dark:text-white truncate block">
                    {residentName || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Violation &amp; Strike</span>
                  <span className="font-bold text-[#0F5132] dark:text-emerald-400 truncate block">
                    Strike {strikeLevel} • {selectedInfraction.label}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Restitution Fine</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    GH₵ {(parseFloat(fineAmount) || 0).toLocaleString('en-GH', { minimumFractionDigits: 2 })}
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
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Record Disciplinary Citation</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewDisciplinaryIncidentPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" />
        </div>
      }
    >
      <NewDisciplinaryIncidentContent />
    </Suspense>
  );
}
