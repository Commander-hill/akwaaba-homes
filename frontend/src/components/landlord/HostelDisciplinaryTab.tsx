'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, Scale, AlertOctagon, FileWarning, Gavel, 
  UserX, Flame, Volume2, Printer, Search, Filter, 
  Plus, CheckCircle, Clock, Send, FileText, Building, 
  Phone, Trash2, Edit3, Eye, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import api from '@/lib/axios';

export type InfractionType = 
  | 'NOISE_POLLUTION' 
  | 'PROHIBITED_APPLIANCE' 
  | 'UNAUTHORIZED_GUEST' 
  | 'CURFEW_BREACH' 
  | 'VANDALISM' 
  | 'SANITATION_NEGLECT' 
  | 'ALTERCATION';

export type StrikeLevel = 1 | 2 | 3;
export type IncidentStatus = 'INVESTIGATING' | 'WARNING_ISSUED' | 'FINE_PENDING' | 'FINE_SETTLED' | 'EVICTION_PROCEEDINGS' | 'RESOLVED';

export interface DisciplinaryIncident {
  id: string;
  propertyId: string;
  referenceCode: string; // e.g. "DISC-2026-001"
  residentName: string;
  residentPhone?: string;
  roomUnit: string;
  infractionType: InfractionType;
  incidentDate: string; // YYYY-MM-DD
  incidentTime: string; // HH:mm
  strikeLevel: StrikeLevel;
  fineAmountGHS: number;
  status: IncidentStatus;
  description: string;
  reportedBy: string; // e.g. "Head Porter Mensah"
  witnessStatement?: string;
  actionTakenNotes?: string;
  resolvedAt?: string;
}

interface HostelDisciplinaryTabProps {
  properties: any[];
  bookings?: any[];
}

const DEFAULT_SEEDED_INCIDENTS: Array<Omit<DisciplinaryIncident, 'id' | 'propertyId'>> = [
  {
    referenceCode: 'DISC-2026-084',
    residentName: 'Kofi Mensah',
    residentPhone: '+233 24 123 4567',
    roomUnit: 'RM 104',
    infractionType: 'PROHIBITED_APPLIANCE',
    incidentDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    incidentTime: '21:30',
    strikeLevel: 2,
    fineAmountGHS: 250,
    status: 'FINE_PENDING',
    description: 'Confiscated unauthorized 2000W immersion heating coil and electric dual-burner hotplate causing fuse trips on Block A sub-board.',
    reportedBy: 'Caretaker Kwesi Boateng',
    witnessStatement: 'Spotted by floor supervisor during routine electrical inspection; coil placed on wooden desk.',
    actionTakenNotes: 'Appliance impounded at porter desk; GH₵ 250 surcharge assessed.'
  },
  {
    referenceCode: 'DISC-2026-085',
    residentName: 'Abena Osei',
    residentPhone: '+233 50 987 6543',
    roomUnit: 'RM 202',
    infractionType: 'NOISE_POLLUTION',
    incidentDate: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
    incidentTime: '01:45',
    strikeLevel: 1,
    fineAmountGHS: 0,
    status: 'WARNING_ISSUED',
    description: 'High-bass Bluetooth subwoofer playing music past 01:00 AM quiet-hours curfew during mid-semester examination week.',
    reportedBy: 'Night Security Porter',
    witnessStatement: 'Three adjoining rooms lodged complaints to the security booth regarding disturbed study.',
    actionTakenNotes: 'Formal verbal caution logged; sound system volume capped.'
  },
  {
    referenceCode: 'DISC-2026-086',
    residentName: 'Emmanuel Addo',
    residentPhone: '+233 20 555 1212',
    roomUnit: 'RM 301',
    infractionType: 'UNAUTHORIZED_GUEST',
    incidentDate: new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0],
    incidentTime: '03:15',
    strikeLevel: 3,
    fineAmountGHS: 400,
    status: 'EVICTION_PROCEEDINGS',
    description: 'Harboring two unregistered non-student occupants overnight for over 5 consecutive days without gatepass clearance or host authorization.',
    reportedBy: 'Senior Hall Supervisor',
    witnessStatement: 'Gate logbook confirmed guests entered after 22:00 curfew without resident escort.',
    actionTakenNotes: 'Third strike triggered. Formal notice served for eviction hearing and Dean of Students notification.'
  }
];

export default function HostelDisciplinaryTab({ properties, bookings = [] }: HostelDisciplinaryTabProps) {
  // 1. Property Selection
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    properties?.[0]?.id || ''
  );

  const selectedProperty = useMemo(() => {
    return properties?.find(p => p.id === selectedPropertyId) || properties?.[0];
  }, [properties, selectedPropertyId]);

  // Extract resident options from bookings
  const residentOptions = useMemo(() => {
    const list: Array<{ name: string; phone: string; room: string }> = [];
    if (bookings && bookings.length > 0) {
      bookings
        .filter((b: any) => !selectedProperty?.id || b.propertyId === selectedProperty.id)
        .forEach((b: any) => {
          const name = `${b.tenant?.firstName || ''} ${b.tenant?.lastName || ''}`.trim() || 'Resident Student';
          const phone = b.tenant?.phoneNumber || '+233 24 000 0000';
          const room = b.roomUnit?.unitNumber || b.room?.title || 'Room Unit';
          list.push({ name, phone, room });
        });
    }
    if (list.length === 0) {
      list.push({ name: 'Kofi Mensah', phone: '+233 24 123 4567', room: 'RM 104' });
      list.push({ name: 'Abena Osei', phone: '+233 50 987 6543', room: 'RM 202' });
      list.push({ name: 'Emmanuel Addo', phone: '+233 20 555 1212', room: 'RM 301' });
      list.push({ name: 'Selorm Dotse', phone: '+233 55 432 1098', room: 'RM 102' });
    }
    return list;
  }, [bookings, selectedProperty?.id]);

  // 2. Incident State & Persistence
  const [incidents, setIncidents] = useState<DisciplinaryIncident[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [strikeFilter, setStrikeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    if (!selectedProperty?.id) return;
    let isMounted = true;
    const storageKey = `akwaaba_disciplinary_incidents_${selectedProperty.id}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        setIncidents(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse incidents', e);
      }
    }

    // Query backend breach reports
    const fetchBreaches = async () => {
      try {
        const res = await api.get('/breaches');
        const reports = res.data?.reports || [];
        const propReports = reports.filter((r: any) => !r.propertyId || r.propertyId === selectedProperty.id);
        if (propReports.length > 0 && isMounted) {
          const parsedBreaches: DisciplinaryIncident[] = propReports.map((r: any) => {
            let meta: any = {};
            try {
              meta = JSON.parse(r.description);
            } catch (e) {
              meta = { description: r.description };
            }
            return {
              id: r.id,
              propertyId: r.propertyId || selectedProperty.id,
              referenceCode: meta.referenceCode || `DISC-${r.id.substring(0, 6).toUpperCase()}`,
              residentName: meta.residentName || `${r.tenant?.firstName || ''} ${r.tenant?.lastName || ''}`.trim() || 'Resident',
              residentPhone: meta.residentPhone || '+233 24 000 0000',
              roomUnit: meta.roomUnit || 'Unit',
              infractionType: meta.infractionType || 'NOISE_POLLUTION',
              incidentDate: meta.incidentDate || (r.createdAt ? r.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
              incidentTime: meta.incidentTime || '12:00',
              strikeLevel: meta.strikeLevel || 1,
              fineAmountGHS: meta.fineAmountGHS || 0,
              status: meta.status || (r.status === 'VERIFIED' ? 'FINE_SETTLED' : 'WARNING_ISSUED'),
              description: meta.description || r.title,
              reportedBy: meta.reportedBy || (r.reporter ? `${r.reporter.firstName || ''} (${r.reporter.role || 'Staff'})` : 'Staff'),
              witnessStatement: meta.witnessStatement || ''
            };
          });
          setIncidents(parsedBreaches);
          localStorage.setItem(storageKey, JSON.stringify(parsedBreaches));
          return;
        }
      } catch (e) {}

      if (!stored && isMounted) {
        const initialSeed: DisciplinaryIncident[] = DEFAULT_SEEDED_INCIDENTS.map((item, idx) => ({
          ...item,
          id: `disc_${Date.now()}_${idx}`,
          propertyId: selectedProperty.id
        }));
        setIncidents(initialSeed);
        localStorage.setItem(storageKey, JSON.stringify(initialSeed));
      }
    };

    fetchBreaches();
    return () => { isMounted = false; };
  }, [selectedProperty?.id]);

  const saveIncidents = (updated: DisciplinaryIncident[]) => {
    setIncidents(updated);
    if (selectedProperty?.id) {
      localStorage.setItem(`akwaaba_disciplinary_incidents_${selectedProperty.id}`, JSON.stringify(updated));
    }
  };

  // 3. Modals State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [activeCitationIncident, setActiveCitationIncident] = useState<DisciplinaryIncident | null>(null);

  // Form State
  const [formResidentName, setFormResidentName] = useState(residentOptions[0]?.name || '');
  const [formResidentPhone, setFormResidentPhone] = useState(residentOptions[0]?.phone || '');
  const [formRoomUnit, setFormRoomUnit] = useState(residentOptions[0]?.room || 'RM 101');
  const [formInfraction, setFormInfraction] = useState<InfractionType>('NOISE_POLLUTION');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('22:00');
  const [formStrike, setFormStrike] = useState<StrikeLevel>(1);
  const [formFine, setFormFine] = useState('0');
  const [formStatus, setFormStatus] = useState<IncidentStatus>('WARNING_ISSUED');
  const [formDescription, setFormDescription] = useState('');
  const [formReportedBy, setFormReportedBy] = useState('Caretaker / Porter On Duty');
  const [formWitness, setFormWitness] = useState('');

  const openLogModal = () => {
    const resident = residentOptions[0];
    setFormResidentName(resident ? resident.name : '');
    setFormResidentPhone(resident ? resident.phone : '');
    setFormRoomUnit(resident ? resident.room : 'RM 101');
    setFormInfraction('NOISE_POLLUTION');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    setFormStrike(1);
    setFormFine('0');
    setFormStatus('WARNING_ISSUED');
    setFormDescription('');
    setFormReportedBy('Caretaker / Porter On Duty');
    setFormWitness('');
    setIsLogModalOpen(true);
  };

  const handleSelectResidentPreset = (residentName: string) => {
    const found = residentOptions.find(r => r.name === residentName);
    if (found) {
      setFormResidentName(found.name);
      setFormResidentPhone(found.phone);
      setFormRoomUnit(found.room);
      
      // Calculate previous strikes for this resident to auto-suggest next strike
      const prevIncidents = incidents.filter(i => i.residentName.toLowerCase() === found.name.toLowerCase());
      const nextStrike = Math.min(prevIncidents.length + 1, 3) as StrikeLevel;
      setFormStrike(nextStrike);
      if (nextStrike === 2) {
        setFormFine('200');
        setFormStatus('FINE_PENDING');
      } else if (nextStrike === 3) {
        setFormFine('400');
        setFormStatus('EVICTION_PROCEEDINGS');
      } else {
        setFormFine('0');
        setFormStatus('WARNING_ISSUED');
      }
    }
  };

  const handleCreateIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formResidentName.trim() || !formDescription.trim()) {
      toast.error('Please complete all required fields.');
      return;
    }

    const refCode = `DISC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newIncident: DisciplinaryIncident = {
      id: `disc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      propertyId: selectedProperty?.id || '',
      referenceCode: refCode,
      residentName: formResidentName.trim(),
      residentPhone: formResidentPhone.trim(),
      roomUnit: formRoomUnit.trim(),
      infractionType: formInfraction,
      incidentDate: formDate,
      incidentTime: formTime,
      strikeLevel: formStrike,
      fineAmountGHS: parseFloat(formFine) || 0,
      status: formStatus,
      description: formDescription.trim(),
      reportedBy: formReportedBy.trim(),
      witnessStatement: formWitness.trim()
    };

    const updated = [newIncident, ...incidents];
    saveIncidents(updated);

    // Sync with backend breach report
    const matchedBooking = bookings?.find((b: any) => {
      const name = `${b.tenant?.firstName || ''} ${b.tenant?.lastName || ''}`.trim().toLowerCase();
      return name === formResidentName.trim().toLowerCase();
    });
    const tenantId = matchedBooking?.tenantId || matchedBooking?.tenant?.id;

    if (tenantId && selectedProperty?.id) {
      api.post('/breaches/report', {
        tenantId,
        propertyId: selectedProperty.id,
        title: `${formInfraction} - Strike ${formStrike}`,
        description: JSON.stringify(newIncident)
      }).then(() => {
        toast.success(`Citation ${refCode} officially recorded & synced with database!`);
      }).catch(() => {
        toast.success(`Citation ${refCode} filed for ${newIncident.residentName} (Strike ${newIncident.strikeLevel})`);
      });
    } else {
      toast.success(`Citation ${refCode} filed for ${newIncident.residentName} (Strike ${newIncident.strikeLevel})`);
    }
    setIsLogModalOpen(false);
  };

  const handleToggleResolved = (id: string) => {
    const updated = incidents.map(i => {
      if (i.id === id) {
        const isResolved = i.status === 'RESOLVED';
        return {
          ...i,
          status: (isResolved ? 'WARNING_ISSUED' : 'RESOLVED') as IncidentStatus,
          resolvedAt: isResolved ? undefined : new Date().toISOString()
        };
      }
      return i;
    });
    saveIncidents(updated);
    toast.success('Incident status updated.');
  };

  const handleDeleteIncident = (id: string, code: string) => {
    if (confirm(`Permanently delete citation ${code}?`)) {
      const updated = incidents.filter(i => i.id !== id);
      saveIncidents(updated);
      toast.success(`Citation ${code} deleted.`);
    }
  };

  // 4. WhatsApp Citation Sender
  const handleSendWhatsAppCitation = (inc: DisciplinaryIncident) => {
    const targetPhone = inc.residentPhone ? inc.residentPhone.replace(/[^0-9]/g, '') : '';
    
    let msg = `⚖️ *AKWAABA HOMES - OFFICIAL DISCIPLINARY CITATION*\n`;
    msg += `📋 *Ref Code:* ${inc.referenceCode}\n`;
    msg += `🏢 *Property:* ${selectedProperty?.title || 'Hostel'}\n`;
    msg += `👤 *Resident:* ${inc.residentName} (${inc.roomUnit})\n`;
    msg += `📅 *Incident Date & Time:* ${inc.incidentDate} at ${inc.incidentTime}\n`;
    msg += `⚠️ *Infraction Category:* ${inc.infractionType.replace('_', ' ')}\n`;
    msg += `🚨 *Strike Assessment:* Strike ${inc.strikeLevel} of 3\n\n`;
    msg += `📝 *Incident Summary:*\n${inc.description}\n\n`;

    if (inc.fineAmountGHS > 0) {
      msg += `💰 *Disciplinary Surcharge:* GH₵ ${inc.fineAmountGHS.toFixed(2)} (Status: ${inc.status.replace('_', ' ')})\n`;
      msg += `_Please settle penalty via the hostel MoMo portal or caretaker desk within 48 hours._\n\n`;
    }

    if (inc.strikeLevel === 3) {
      msg += `🛑 *CRITICAL NOTICE:* This is your 3rd strike. Immediate referral has been forwarded to the Dean of Student Affairs / Guardian for tenancy termination.\n\n`;
    }

    msg += `_Issued by: ${inc.reportedBy} - Hostel Management Authority_`;

    const url = targetPhone 
      ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // 5. Filtered Incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(i => {
      if (typeFilter !== 'ALL' && i.infractionType !== typeFilter) return false;
      if (strikeFilter !== 'ALL' && i.strikeLevel.toString() !== strikeFilter) return false;
      if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = i.residentName.toLowerCase().includes(q);
        const matchesRoom = i.roomUnit.toLowerCase().includes(q);
        const matchesCode = i.referenceCode.toLowerCase().includes(q);
        const matchesDesc = i.description.toLowerCase().includes(q);
        if (!matchesName && !matchesRoom && !matchesCode && !matchesDesc) return false;
      }
      return true;
    });
  }, [incidents, typeFilter, strikeFilter, statusFilter, searchQuery]);

  // 6. Metrics Summary
  const metrics = useMemo(() => {
    const total = incidents.length;
    const strike1 = incidents.filter(i => i.strikeLevel === 1).length;
    const strike2 = incidents.filter(i => i.strikeLevel === 2).length;
    const strike3 = incidents.filter(i => i.strikeLevel === 3).length;
    const activeFines = incidents
      .filter(i => i.status === 'FINE_PENDING')
      .reduce((sum, i) => sum + i.fineAmountGHS, 0);
    const resolved = incidents.filter(i => i.status === 'RESOLVED').length;

    return { total, strike1, strike2, strike3, activeFines, resolved };
  }, [incidents]);

  return (
    <div className="space-y-6">
      {/* ─── HERO & ACTION BAR ─── */}
      <div className="bg-slate-900 rounded-3xl p-6 lg:p-8 text-white shadow-lg relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider border border-slate-700">
              <Scale className="w-3.5 h-3.5" />
              Conduct &amp; Incident Logbook
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white">
              Incident &amp; Disciplinary Logbook
            </h2>
            <p className="text-slate-300 text-sm max-w-xl">
              Track code-of-conduct infractions (noise pollution, unauthorized coils/hotplates, curfew breaches). 
              Automate 3-strike disciplinary warnings, fines, and formal Dean of Students referrals.
            </p>
          </div>

          {/* Property Selector & Action Button */}
          <div className="flex flex-wrap items-center gap-3">
            {properties && properties.length > 1 && (
              <select
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="bg-slate-800/90 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-all cursor-pointer"
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            )}

            <button
              onClick={openLogModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-black rounded-2xl shadow-lg shadow-red-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Log Incident / Citation</span>
            </button>
          </div>
        </div>

        {/* ─── LIVE METRICS STRIP ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3 border border-slate-700/50">
            <div className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Total Recorded</div>
            <div className="text-xl lg:text-2xl font-black text-white mt-1 flex items-baseline gap-2">
              {metrics.total}
              <span className="text-xs text-emerald-400 font-semibold">{metrics.resolved} Resolved</span>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3 border border-slate-700/50">
            <div className="text-amber-400 text-[11px] font-bold uppercase tracking-wider">Strike 1 (Caution)</div>
            <div className="text-xl lg:text-2xl font-black text-amber-300 mt-1">
              {metrics.strike1}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3 border border-slate-700/50">
            <div className="text-orange-400 text-[11px] font-bold uppercase tracking-wider">Strike 2 (Reprimand)</div>
            <div className="text-xl lg:text-2xl font-black text-orange-300 mt-1">
              {metrics.strike2}
            </div>
          </div>

          <div className="bg-red-950/40 backdrop-blur-sm rounded-2xl p-3 border border-red-800/40">
            <div className="text-red-400 text-[11px] font-bold uppercase tracking-wider">Strike 3 (Eviction / Dean)</div>
            <div className="text-xl lg:text-2xl font-black text-red-300 mt-1 flex items-baseline gap-1.5">
              {metrics.strike3}
              {metrics.activeFines > 0 && (
                <span className="text-xs font-semibold text-rose-300">
                  (GH₵ {metrics.activeFines} Fines)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── ESCALATION EXPLAINER BAR ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-xs shrink-0">1</span>
          <div>
            <div className="text-xs font-extrabold text-slate-900 dark:text-white">Strike 1: Digital Caution</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Formal notice sent to student WhatsApp. Zero fine, 14-day probation.</div>
          </div>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-3.5 flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-black text-xs shrink-0">2</span>
          <div>
            <div className="text-xs font-extrabold text-slate-900 dark:text-white">Strike 2: Surcharge &amp; Warning</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Disciplinary surcharge (GH₵ 100–300) + Caretaker office hearing.</div>
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3.5 flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center font-black text-xs shrink-0">3</span>
          <div>
            <div className="text-xs font-extrabold text-slate-900 dark:text-white">Strike 3: Expulsion / Dean Referral</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Termination of residency agreement &amp; formal letter to Dean of Students.</div>
          </div>
        </div>
      </div>

      {/* ─── CONTROL FILTER BAR ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by resident name, room number, ref code, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Infraction Category */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
          >
            <option value="ALL">All Infractions</option>
            <option value="NOISE_POLLUTION">Noise Pollution</option>
            <option value="PROHIBITED_APPLIANCE">Prohibited Appliance</option>
            <option value="UNAUTHORIZED_GUEST">Unauthorized Guest</option>
            <option value="CURFEW_BREACH">Curfew Breach</option>
            <option value="VANDALISM">Vandalism</option>
            <option value="SANITATION_NEGLECT">Sanitation Neglect</option>
            <option value="ALTERCATION">Altercation / Fighting</option>
          </select>

          {/* Strike Level */}
          <select
            value={strikeFilter}
            onChange={(e) => setStrikeFilter(e.target.value)}
            className="text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
          >
            <option value="ALL">All Strike Tiers</option>
            <option value="1">Strike 1 (Caution)</option>
            <option value="2">Strike 2 (Reprimand)</option>
            <option value="3">Strike 3 (Expulsion)</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="WARNING_ISSUED">Warning Issued</option>
            <option value="FINE_PENDING">Fine Pending</option>
            <option value="FINE_SETTLED">Fine Settled</option>
            <option value="EVICTION_PROCEEDINGS">Eviction Proceedings</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* ─── INCIDENTS DATA TABLE / CARDS ─── */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredIncidents.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No disciplinary infractions found
            </p>
            <p className="text-xs text-slate-400">
              Hostel rules are currently respected, or try adjusting your search filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3.5 px-4">Ref Code &amp; Date</th>
                  <th className="py-3.5 px-4">Resident &amp; Unit</th>
                  <th className="py-3.5 px-4">Infraction Category</th>
                  <th className="py-3.5 px-4">Strike Tier</th>
                  <th className="py-3.5 px-4">Penalty / Fine</th>
                  <th className="py-3.5 px-4">Summary &amp; Actions</th>
                  <th className="py-3.5 px-4 text-right">Citations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredIncidents.map((incident) => {
                  const isStrike3 = incident.strikeLevel === 3;
                  return (
                    <tr 
                      key={incident.id} 
                      className={clsx(
                        'hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors',
                        isStrike3 && 'bg-red-50/20 dark:bg-red-950/10'
                      )}
                    >
                      {/* Ref Code & Date */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {incident.referenceCode}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {incident.incidentDate} • {incident.incidentTime}
                        </div>
                      </td>

                      {/* Resident & Room */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {incident.residentName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {incident.roomUnit}
                          </span>
                          {incident.residentPhone && (
                            <span className="text-slate-400">{incident.residentPhone}</span>
                          )}
                        </div>
                      </td>

                      {/* Infraction Category */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 font-bold text-xs">
                          {incident.infractionType === 'NOISE_POLLUTION' && <Volume2 className="w-3.5 h-3.5 text-amber-500" />}
                          {incident.infractionType === 'PROHIBITED_APPLIANCE' && <Flame className="w-3.5 h-3.5 text-red-500" />}
                          {incident.infractionType === 'UNAUTHORIZED_GUEST' && <UserX className="w-3.5 h-3.5 text-purple-500" />}
                          {incident.infractionType === 'CURFEW_BREACH' && <Clock className="w-3.5 h-3.5 text-blue-500" />}
                          {incident.infractionType === 'VANDALISM' && <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />}
                          {incident.infractionType === 'SANITATION_NEGLECT' && <Scale className="w-3.5 h-3.5 text-emerald-500" />}
                          {incident.infractionType === 'ALTERCATION' && <Gavel className="w-3.5 h-3.5 text-red-600" />}
                          <span className="capitalize">{incident.infractionType.toLowerCase().replace('_', ' ')}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Rep: {incident.reportedBy}
                        </div>
                      </td>

                      {/* Strike Level Badge */}
                      <td className="py-3.5 px-4">
                        <span className={clsx(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black',
                          incident.strikeLevel === 1 && 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
                          incident.strikeLevel === 2 && 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
                          incident.strikeLevel === 3 && 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300'
                        )}>
                          Strike {incident.strikeLevel} of 3
                        </span>
                      </td>

                      {/* Fine Amount & Status */}
                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-white">
                          {incident.fineAmountGHS > 0 ? `GH₵ ${incident.fineAmountGHS.toFixed(2)}` : 'None'}
                        </div>
                        <div className={clsx(
                          'text-[10px] font-bold uppercase mt-0.5',
                          incident.status === 'RESOLVED' && 'text-emerald-600 dark:text-emerald-400',
                          incident.status === 'FINE_PENDING' && 'text-amber-600 dark:text-amber-400',
                          incident.status === 'EVICTION_PROCEEDINGS' && 'text-red-600 dark:text-red-400 font-black',
                          incident.status === 'WARNING_ISSUED' && 'text-blue-600 dark:text-blue-400'
                        )}>
                          {incident.status.replace('_', ' ')}
                        </div>
                      </td>

                      {/* Description & Action */}
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <p className="text-slate-700 dark:text-slate-300 line-clamp-2 text-[11px]">
                          {incident.description}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Official Formal Citation Letter Modal */}
                          <button
                            onClick={() => setActiveCitationIncident(incident)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                            title="Generate Formal Dean / Guardian Citation Letter"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* WhatsApp Citation */}
                          <button
                            onClick={() => handleSendWhatsAppCitation(incident)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-all"
                            title="Send citation via WhatsApp"
                          >
                            <Send className="w-4 h-4" />
                          </button>

                          {/* Toggle Resolved */}
                          <button
                            onClick={() => handleToggleResolved(incident.id)}
                            className={clsx(
                              'p-1.5 rounded-lg transition-all',
                              incident.status === 'RESOLVED'
                                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            )}
                            title={incident.status === 'RESOLVED' ? 'Mark as unresolved' : 'Mark as resolved'}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteIncident(incident.id, incident.referenceCode)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all"
                            title="Delete citation"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── LOG INCIDENT MODAL ─── */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl">
                  <FileWarning className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Log Disciplinary Infraction
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedProperty?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1.5"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="p-6 space-y-4 overflow-y-auto">
              {/* Resident Fast Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Resident Student *
                </label>
                <select
                  value={formResidentName}
                  onChange={(e) => handleSelectResidentPreset(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white font-bold"
                >
                  {residentOptions.map((r, i) => (
                    <option key={i} value={r.name}>
                      {r.name} ({r.room})
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Unit & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Room Unit
                  </label>
                  <input
                    type="text"
                    value={formRoomUnit}
                    onChange={(e) => setFormRoomUnit(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formResidentPhone}
                    onChange={(e) => setFormResidentPhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Infraction Category & Strike Tier */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Infraction Category *
                  </label>
                  <select
                    value={formInfraction}
                    onChange={(e) => setFormInfraction(e.target.value as InfractionType)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                  >
                    <option value="NOISE_POLLUTION">Noise Pollution</option>
                    <option value="PROHIBITED_APPLIANCE">Prohibited Hotplate / Coil</option>
                    <option value="UNAUTHORIZED_GUEST">Unauthorized Overnight Guest</option>
                    <option value="CURFEW_BREACH">Gate Curfew Breach</option>
                    <option value="VANDALISM">Property Vandalism</option>
                    <option value="SANITATION_NEGLECT">Sanitation / Refuse Neglect</option>
                    <option value="ALTERCATION">Altercation / Fighting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Strike Level Assessment
                  </label>
                  <select
                    value={formStrike}
                    onChange={(e) => setFormStrike(Number(e.target.value) as StrikeLevel)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white font-bold"
                  >
                    <option value="1">Strike 1: First Warning (No fine)</option>
                    <option value="2">Strike 2: Reprimand &amp; Fine</option>
                    <option value="3">Strike 3: Immediate Expulsion</option>
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Incident Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Incident Time
                  </label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Fine & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Fine Surcharge (GH₵)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formFine}
                    onChange={(e) => setFormFine(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Disciplinary Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as IncidentStatus)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                  >
                    <option value="WARNING_ISSUED">Warning Issued</option>
                    <option value="FINE_PENDING">Fine Pending</option>
                    <option value="FINE_SETTLED">Fine Settled</option>
                    <option value="EVICTION_PROCEEDINGS">Eviction Proceedings</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Incident Description &amp; Evidence *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="State the observed code-of-conduct breach, seized items, or witness statements..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                />
              </div>

              {/* Reported By */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reporting Official / Porter
                </label>
                <input
                  type="text"
                  value={formReportedBy}
                  onChange={(e) => setFormReportedBy(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-black rounded-xl shadow-md transition-all"
                >
                  File Disciplinary Citation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── FORMAL CITATION LETTER / DEAN OF STUDENTS PRINT VIEW ─── */}
      {activeCitationIncident && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-300 overflow-hidden animate-in max-h-[95vh] flex flex-col">
            {/* Action Toolbar */}
            <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                <span className="font-extrabold text-sm text-slate-800">
                  Official Disciplinary Notice ({activeCitationIncident.referenceCode})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Letterhead</span>
                </button>
                <button
                  onClick={() => setActiveCitationIncident(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Letterhead Body */}
            <div className="p-8 space-y-6 overflow-y-auto text-xs leading-relaxed print:p-0">
              {/* Header */}
              <div className="border-b-2 border-red-800 pb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                    {selectedProperty?.title || 'AKWAABA HOMES HOSTEL'}
                  </h1>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Office of the Hall Warden &amp; Hostel Operations Directorate
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Ghana Academic Hostels Network • Property ID: {selectedProperty?.id?.slice(0, 8)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black text-red-700">
                    CITATION REF: {activeCitationIncident.referenceCode}
                  </div>
                  <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                    Date: {activeCitationIncident.incidentDate}
                  </div>
                </div>
              </div>

              {/* Addressee */}
              <div className="space-y-1">
                <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">NOTICE ADDRESSED TO:</div>
                <div className="font-black text-sm text-slate-900">{activeCitationIncident.residentName}</div>
                <div className="font-semibold text-slate-700">Room Unit: {activeCitationIncident.roomUnit}</div>
                <div className="text-slate-500">Resident Phone: {activeCitationIncident.residentPhone || 'N/A'}</div>
              </div>

              {/* Subject */}
              <div className="bg-red-50 p-3 rounded-xl border-l-4 border-red-700">
                <div className="font-black text-red-950 text-xs uppercase">
                  SUBJECT: FORMAL DISCIPLINARY CITATION — STRIKE {activeCitationIncident.strikeLevel} OF 3
                </div>
                <div className="text-red-800 text-[11px] mt-0.5 font-semibold">
                  Infraction: {activeCitationIncident.infractionType.replace('_', ' ')}
                </div>
              </div>

              {/* Statement */}
              <div className="space-y-3 text-slate-800">
                <p>
                  This official citation serves as formal written notification regarding a documented breach of the
                  Hostel Code of Conduct and Tenancy Agreement within <strong>{selectedProperty?.title}</strong> on{' '}
                  <strong>{activeCitationIncident.incidentDate}</strong> at <strong>{activeCitationIncident.incidentTime}</strong>.
                </p>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-1">Documented Incident &amp; Findings:</span>
                  <p className="italic text-slate-700">{activeCitationIncident.description}</p>
                </div>

                {activeCitationIncident.fineAmountGHS > 0 && (
                  <p>
                    Pursuant to Section 8.4 of the Residential Tenancy Code, a disciplinary surcharge of{' '}
                    <strong className="text-red-700">GH₵ {activeCitationIncident.fineAmountGHS.toFixed(2)}</strong> has been assessed
                    against your tenancy record and must be satisfied within <strong>48 hours</strong> of citation delivery.
                  </p>
                )}

                {activeCitationIncident.strikeLevel === 3 ? (
                  <div className="p-3 bg-red-100 border border-red-300 rounded-xl text-red-900 font-bold">
                    ⚠️ FINAL NOTICE: Having accumulated Three (3) Disciplinary Strikes, this matter has been escalated
                    to the Office of the Dean of Student Affairs / Guardian for immediate termination of residence and vacation of room.
                  </div>
                ) : (
                  <p>
                    Please be advised that accumulation of three strikes constitutes grounds for summary eviction and forfeiture of caution deposit.
                  </p>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-2 gap-8 border-t border-slate-200">
                <div>
                  <div className="h-10 border-b border-slate-400"></div>
                  <div className="text-[11px] font-bold text-slate-800 mt-1">{activeCitationIncident.reportedBy}</div>
                  <div className="text-[10px] text-slate-500">Hall Warden / Porter Directorate</div>
                </div>

                <div>
                  <div className="h-10 border-b border-slate-400"></div>
                  <div className="text-[11px] font-bold text-slate-800 mt-1">{activeCitationIncident.residentName}</div>
                  <div className="text-[10px] text-slate-500">Resident Student Acknowledgement</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
