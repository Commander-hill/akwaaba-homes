'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Loader2, ArrowLeft, Upload, Star, Save, Shield, Laptop, Smartphone, 
  Globe, LogOut, CheckCircle2, AlertTriangle, Clock, ShieldAlert, Lock, User, Check, Building2, GraduationCap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useDialog } from '@/providers/DialogProvider';

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const queryClient = useQueryClient();
  const { confirm } = useDialog();
  const [activeTab, setActiveTab] = useState<'basic' | 'school' | 'security'>(
    tabParam === 'security' ? 'security' : 'basic'
  );
  const [isStudent, setIsStudent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    otherNames: '',
    phoneNumber: '',
    email: '',
    gender: '',
    dateOfBirth: '',
    nationality: '',
    guardianName: '',
    guardianPhone: '',
    avatarUrl: '',
    campus: '',
    studentId: '',
    dateOfAdmission: '',
    programmeOfStudy: '',
    yearOfStudy: '',
    studentType: ''
  });

  const { data: session, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
  });

  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');

  const requestUnlockMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await api.post('/auth/request-unlock', { reason });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Unlock request submitted!');
      queryClient.invalidateQueries({ queryKey: ['session'] });
      setRequestModalOpen(false);
      setRequestReason('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    }
  });

  // Active Sessions Query & Mutations
  const { data: sessions, isLoading: isLoadingSessions, refetch: refetchSessions } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      const res = await api.get('/auth/sessions');
      return res.data.sessions;
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await api.delete(`/auth/sessions/${sessionId}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Session revoked successfully');
      refetchSessions();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to revoke session');
    }
  });

  const revokeAllOthersMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete('/auth/sessions/others');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Logged out all other devices!');
      refetchSessions();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to revoke other sessions');
    }
  });

  useEffect(() => {
    if (session) {
      setFormData({
        firstName: session.firstName || '',
        lastName: session.lastName || '',
        otherNames: session.otherNames || '',
        phoneNumber: session.phoneNumber || '',
        email: session.email || '',
        gender: session.gender || '',
        dateOfBirth: session.dateOfBirth || '',
        nationality: session.nationality || '',
        guardianName: session.guardianName || '',
        guardianPhone: session.guardianPhone || '',
        avatarUrl: session.avatarUrl || '',
        campus: session.campus || '',
        studentId: session.studentId || '',
        dateOfAdmission: session.dateOfAdmission || '',
        programmeOfStudy: session.programmeOfStudy || '',
        yearOfStudy: session.yearOfStudy || '',
        studentType: session.studentType || ''
      });
      setIsStudent(!!session.campus || !!session.studentId || !!session.studentType);
    }
  }, [session]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.put('/auth/profile', data);
      return res.data;
    },
    onSuccess: () => {
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (error: any) => {
      setMessage({ text: error.response?.data?.message || 'Failed to update profile', type: 'error' });
    },
    onSettled: () => {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    
    const payload = { ...formData };
    if (!isStudent) {
      payload.campus = '';
      payload.studentId = '';
      payload.dateOfAdmission = '';
      payload.programmeOfStudy = '';
      payload.yearOfStudy = '';
      payload.studentType = '';
    }
    
    updateMutation.mutate(payload);
  };

  const handleSimulateAvatarUpload = () => {
    const avatars = [
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Mia'
    ];
    const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
    setFormData({ ...formData, avatarUrl: randomAvatar });
  };

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthYear = new Date(dob).getFullYear();
    if (isNaN(birthYear)) return null;
    const age = new Date().getFullYear() - birthYear;
    return age > 0 ? `${age} yrs` : null;
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#0F5132]" /></div>;
  }

  const isLocked = !!session?.isProfileLocked && session?.role !== 'ADMIN';

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      
      {/* ── HEADER / NAV ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link 
            href="/dashboard/tenant" 
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
            Account Profile &amp; Credentials
          </h1>
        </div>

        {!isLocked ? (
          <button 
            onClick={handleSubmit} 
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0F5132] hover:bg-[#0A3D24] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-70 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Profile</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {session?.profileUnlockRequested ? (
              <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Edit Request Pending
              </span>
            ) : (
              <button
                onClick={() => setRequestModalOpen(true)}
                className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Request Edit Access
              </button>
            )}
            <div className="flex items-center gap-1.5 bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 text-xs font-bold px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <Lock className="w-3 h-3 text-zinc-400" />
              <span>Locked (Institutional KYC)</span>
            </div>
          </div>
        )}
      </div>

      {/* ── PROFILE HERO CARD ── */}
      <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center">
              {formData.avatarUrl ? (
                <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-center text-emerald-400 text-2xl font-black">
                  {formData.firstName?.[0] || 'U'}{formData.lastName?.[0] || ''}
                </div>
              )}
            </div>
            {!isLocked && (
              <button 
                onClick={handleSimulateAvatarUpload}
                className="absolute -bottom-1 -right-1 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 p-1.5 rounded-lg shadow-xs hover:scale-105 transition-transform"
                title="Change Avatar"
              >
                <Upload className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* User Details */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-black text-zinc-950 dark:text-white truncate">
                {formData.firstName} {formData.otherNames} {formData.lastName}
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-[#0F5132] dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                <Check className="w-3 h-3" /> Act 220 Verified
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{formData.email}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
              <span>{formData.phoneNumber || 'No phone number'}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
              <span>{formData.nationality || 'Ghana'}</span>
              {calculateAge(formData.dateOfBirth) && (
                <>
                  <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
                  <span>{calculateAge(formData.dateOfBirth)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Lock Status Bar */}
        {isLocked && (
          <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-start gap-2.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Lock className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              {session?.profileUnlockRequested ? (
                <>Your unlock request is currently under review: <em className="text-zinc-800 dark:text-zinc-200">"{session.profileUnlockReason}"</em>. An administrator will review your requested modifications.</>
              ) : (
                <>Identity fields are cryptographically locked for statutory compliance with Ghana Rent Act guidelines. To modify details, submit an edit access request above.</>
              )}
            </p>
          </div>
        )}
      </div>

      {message && (
        <div className={clsx(
          "p-3.5 rounded-xl text-xs font-bold border",
          message.type === 'success' ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
        )}>
          {message.text}
        </div>
      )}

      {/* ── WORKSPACE TABS ── */}
      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 w-fit">
        <button
          onClick={() => setActiveTab('basic')}
          className={clsx(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'basic' 
              ? "bg-[#0F5132] text-white shadow-xs" 
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          )}
        >
          <User className="w-3.5 h-3.5" />
          <span>Basic Identity</span>
        </button>

        {isStudent && (
          <button
            onClick={() => setActiveTab('school')}
            className={clsx(
              "px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2",
              activeTab === 'school' 
                ? "bg-[#0F5132] text-white shadow-xs" 
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Academic Details</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('security')}
          className={clsx(
            "px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'security' 
              ? "bg-[#0F5132] text-white shadow-xs" 
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          )}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Security &amp; Devices</span>
        </button>
      </div>

      {/* Student Toggle for Tenants */}
      {session?.role === 'TENANT' && activeTab === 'basic' && (
        <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white">Tertiary Student Registration</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Enable student identification for campus hostel allocations</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              disabled={isLocked}
              checked={isStudent}
              onChange={(e) => {
                if (!isLocked) setIsStudent(e.target.checked);
              }}
            />
            <div className="w-10 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-[#0F5132]"></div>
          </label>
        </div>
      )}

      {/* ── FORMS CONTAINER ── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {activeTab === 'basic' && (
          <>
            {/* Section 1: Legal Identity */}
            <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-3">
                1. Legal Identity &amp; Personal Info
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">First Name *</label>
                  <input 
                    type="text" 
                    disabled={isLocked} 
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white uppercase outline-none focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed" 
                    value={formData.firstName} 
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                    placeholder="FIRST NAME" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Other Name(s)</label>
                  <input 
                    type="text" 
                    disabled={isLocked} 
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white uppercase outline-none focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed" 
                    value={formData.otherNames} 
                    onChange={(e) => setFormData({...formData, otherNames: e.target.value})} 
                    placeholder="OTHER NAMES" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Last Name *</label>
                  <input 
                    type="text" 
                    disabled={isLocked} 
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white uppercase outline-none focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed" 
                    value={formData.lastName} 
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                    placeholder="LAST NAME" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Gender *</label>
                  <select 
                    disabled={isLocked} 
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white uppercase outline-none focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer" 
                    value={formData.gender} 
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="">SELECT GENDER</option>
                    <option value="MALE">MALE</option>
                    <option value="FEMALE">FEMALE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Date Of Birth *</label>
                  <input 
                    type="text" 
                    disabled={isLocked} 
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white uppercase outline-none focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed" 
                    value={formData.dateOfBirth} 
                    onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} 
                    placeholder="FEB 03, 2000" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Nationality *</label>
                  <input 
                    type="text" 
                    disabled={isLocked} 
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white uppercase outline-none focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed" 
                    value={formData.nationality} 
                    onChange={(e) => setFormData({...formData, nationality: e.target.value})} 
                    placeholder="GHANA" 
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Contact & Emergency */}
            <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-3">
                2. Contact &amp; Emergency Guardian
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Mobile Phone Number *</label>
                  <input 
                    type="tel" 
                    disabled={isLocked} 
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white uppercase outline-none focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed" 
                    value={formData.phoneNumber} 
                    onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} 
                    placeholder="024XXXXXXX" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Registered Email Address</label>
                  <input 
                    type="email" 
                    disabled 
                    className="w-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-500 uppercase outline-none truncate disabled:cursor-not-allowed" 
                    value={formData.email} 
                    placeholder="EMAIL" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Guardian / Next of Kin Name *</label>
                  <input 
                    type="text" 
                    disabled={isLocked} 
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white uppercase outline-none focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed" 
                    value={formData.guardianName} 
                    onChange={(e) => setFormData({...formData, guardianName: e.target.value})} 
                    placeholder="GUARDIAN FULL NAME" 
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Guardian Emergency Contact *</label>
                  <input 
                    type="tel" 
                    disabled={isLocked} 
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white uppercase outline-none focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed" 
                    value={formData.guardianPhone} 
                    onChange={(e) => setFormData({...formData, guardianPhone: e.target.value})} 
                    placeholder="GUARDIAN PHONE" 
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'school' && (
          <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-3">
              Campus Affiliation &amp; Academic Credentials
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Campus / University *</label>
                <input 
                  type="text" 
                  disabled={isLocked} 
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white uppercase outline-none focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed" 
                  value={formData.campus} 
                  onChange={(e) => setFormData({...formData, campus: e.target.value})} 
                  placeholder="KNUST, UG, UCC, ETC." 
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Student ID / Index No. *</label>
                <input 
                  type="text" 
                  disabled={isLocked} 
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white uppercase outline-none focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed" 
                  value={formData.studentId} 
                  onChange={(e) => setFormData({...formData, studentId: e.target.value})} 
                  placeholder="STUDENT ID" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Date Of Admission *</label>
                <input 
                  type="text" 
                  disabled={isLocked} 
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white uppercase outline-none focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed" 
                  value={formData.dateOfAdmission} 
                  onChange={(e) => setFormData({...formData, dateOfAdmission: e.target.value})} 
                  placeholder="JAN 14, 2022" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Programme Of Study *</label>
                <input 
                  type="text" 
                  disabled={isLocked} 
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white uppercase outline-none focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed" 
                  value={formData.programmeOfStudy} 
                  onChange={(e) => setFormData({...formData, programmeOfStudy: e.target.value})} 
                  placeholder="B.SC. COMPUTER SCIENCE" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Year / Academic Level *</label>
                <input 
                  type="text" 
                  disabled={isLocked} 
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white uppercase outline-none focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed" 
                  value={formData.yearOfStudy} 
                  onChange={(e) => setFormData({...formData, yearOfStudy: e.target.value})} 
                  placeholder="LEVEL 300" 
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Student Status *</label>
                <input 
                  type="text" 
                  disabled={isLocked} 
                  className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs font-bold text-zinc-900 dark:text-white uppercase outline-none focus:border-[#0F5132] disabled:opacity-60 disabled:cursor-not-allowed" 
                  value={formData.studentType} 
                  onChange={(e) => setFormData({...formData, studentType: e.target.value})} 
                  placeholder="REGULAR UNDERGRADUATE" 
                />
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Security & Active Devices Tab Panel */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Header Action Card */}
          <div className="bg-white dark:bg-[#12151D] rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-zinc-950 dark:text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#198754]" /> Active Authenticated Sessions
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Review all devices currently authorized to access your account. Revoke any unrecognized browser session immediately.
              </p>
            </div>
            
            <button
              onClick={async () => {
                const shouldRevoke = await confirm({
                  title: 'Log Out All Other Devices',
                  message: 'Are you sure you want to log out all other active devices? You will remain logged in on this current browser.',
                  confirmText: 'Log Out Devices',
                  type: 'warning',
                });
                if (shouldRevoke) {
                  revokeAllOthersMutation.mutate();
                }
              }}
              disabled={revokeAllOthersMutation.isPending || !sessions || sessions.filter((s: any) => !s.isCurrentSession).length === 0}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {revokeAllOthersMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              Log Out All Other Devices
            </button>
          </div>

          {/* Device Sessions List */}
          <div className="bg-white dark:bg-[#12151D] rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
            <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Authorized Devices ({sessions?.length || 0})
            </h4>

            {isLoadingSessions ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#0F5132]" />
              </div>
            ) : !sessions || sessions.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                No active remote sessions detected.
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s: any) => {
                  const isMobile = s.deviceFamily?.toLowerCase().includes('phone') || s.deviceFamily?.toLowerCase().includes('mobile');

                  return (
                    <div
                      key={s.id}
                      className={clsx(
                        "p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                        s.isCurrentSession 
                          ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60" 
                          : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                      )}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={clsx(
                          "p-2.5 rounded-xl shrink-0 border",
                          s.isCurrentSession 
                            ? "bg-[#0F5132] text-white border-emerald-700" 
                            : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700"
                        )}>
                          {isMobile ? <Smartphone className="w-4 h-4" /> : <Laptop className="w-4 h-4" />}
                        </div>
                        
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-bold text-xs text-zinc-950 dark:text-white truncate">
                              {s.userAgent || 'Unknown Device'}
                            </h5>
                            {s.isCurrentSession ? (
                              <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Current Session
                              </span>
                            ) : (
                              <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                Remote Device
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 flex-wrap">
                            <span className="flex items-center gap-1 font-mono">
                              <Globe className="w-3 h-3 text-zinc-400" /> {s.ipAddress || 'Unknown IP'}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-zinc-400" /> Active {formatDistanceToNow(new Date(s.lastActive), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!s.isCurrentSession && (
                        <button
                          onClick={() => revokeSessionMutation.mutate(s.id)}
                          disabled={revokeSessionMutation.isPending}
                          className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-white border border-rose-200 dark:border-rose-900/40 hover:bg-rose-600 rounded-lg transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                        >
                          {revokeSessionMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                          <span>Revoke Session</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Request Unlock Modal */}
      {requestModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in">
          <div className="bg-white dark:bg-[#12151D] rounded-2xl p-6 max-w-md w-full border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-sm text-zinc-950 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#198754]" /> Request Profile Edit Approval
              </h3>
              <button
                onClick={() => setRequestModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Your profile is verified and locked for statutory tenancy compliance. State your specific reason for modification (e.g. <em>"Corrected emergency guardian phone number"</em>).
            </p>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Reason for Modification *
              </label>
              <textarea
                rows={3}
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="State reason for editing locked credentials..."
                className="w-full p-3 text-xs bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 outline-none focus:border-[#0F5132]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!requestReason.trim() || requestUnlockMutation.isPending}
                onClick={() => requestUnlockMutation.mutate(requestReason)}
                className="px-5 py-2 text-xs font-bold text-white bg-[#0F5132] hover:bg-[#0A3D24] rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {requestUnlockMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
