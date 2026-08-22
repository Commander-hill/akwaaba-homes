'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, ArrowLeft, Upload, Star, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'basic' | 'school'>('basic');
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

  // Helper to calculate age if dateOfBirth is roughly formatted (e.g. FEB 03, 2003 or 2003-02-03)
  const calculateAge = (dob: string) => {
    if (!dob) return 'N/A';
    const birthYear = new Date(dob).getFullYear();
    if (isNaN(birthYear)) return 'N/A';
    return `${new Date().getFullYear() - birthYear} years`;
  };

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto min-h-screen pb-12 animate-in text-slate-800 dark:text-slate-200">
      
      {/* Header / Nav */}
      <div className="flex justify-between items-center mb-8">
        <Link href="/dashboard/tenant" className="flex items-center gap-2 text-xl font-bold hover:opacity-80 transition-opacity">
          <ArrowLeft className="w-6 h-6" /> Profile
        </Link>
        <button 
          onClick={handleSubmit} 
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-70 shadow-md"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-bold shadow-sm ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Profile Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-10 pl-2">
        <div className="relative shrink-0">
          <div className="w-32 h-32 rounded-3xl bg-white dark:bg-slate-800 shadow-md overflow-hidden border-4 border-white dark:border-slate-800">
            {formData.avatarUrl ? (
              <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-3xl font-bold text-slate-400">
                {formData.firstName?.[0] || 'U'}
              </div>
            )}
          </div>
          <button 
            onClick={handleSimulateAvatarUpload}
            className="absolute -bottom-2 -right-2 bg-pink-500 text-white p-2.5 rounded-full shadow-lg hover:bg-pink-600 transition-transform hover:scale-105"
            title="Upload Photo (Simulated)"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight">{formData.firstName} {formData.otherNames} {formData.lastName}</h1>
          <div className="text-[var(--muted-foreground)] font-medium flex items-center flex-wrap gap-2 text-[15px]">
            <span>{formData.email.toLowerCase()}</span>
            <span className="w-1 h-1 rounded-full bg-slate-400"></span>
            <span>{formData.phoneNumber || 'Add phone number'}</span>
          </div>
          <div className="flex items-center gap-3 pt-1 font-bold text-[15px]">
            <span>{formData.nationality || 'Ghana'}</span>
            <span className="w-1 h-1 rounded-full bg-slate-400"></span>
            <span className="text-pink-500">{calculateAge(formData.dateOfBirth)}</span>
            <div className="bg-[#2A294E] p-1.5 rounded-full ml-1">
              <Star className="w-3 h-3 text-white fill-current" />
            </div>
          </div>
        </div>
      </div>

      {/* Custom Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm mb-6 flex overflow-hidden border border-[var(--border)]">
        <button
          onClick={() => setActiveTab('basic')}
          className={clsx(
            "flex-1 py-4 text-center font-bold text-sm transition-colors",
            activeTab === 'basic' ? "bg-pink-50 dark:bg-pink-900/20 text-pink-500" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
          )}
        >
          Basic Information
        </button>
        {isStudent && (
          <button
            onClick={() => setActiveTab('school')}
            className={clsx(
              "flex-1 py-4 text-center font-bold text-sm transition-colors",
              activeTab === 'school' ? "bg-pink-50 dark:bg-pink-900/20 text-pink-500" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            School Information
          </button>
        )}
      </div>

      {/* Student Toggle for Tenants */}
      {session?.role === 'TENANT' && activeTab === 'basic' && (
        <div className="mb-6 flex items-center justify-between bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
          <div>
            <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300">University Student?</h3>
            <p className="text-xs text-indigo-700/70 dark:text-indigo-400/70">Enable this to add your school information</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer"
              checked={isStudent}
              onChange={(e) => {
                setIsStudent(e.target.checked);
              }}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      )}

      {/* Grids */}
      <form onSubmit={handleSubmit}>
        {activeTab === 'basic' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in">
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">First Name</label>
              <input type="text" className="w-full font-bold text-sm bg-transparent outline-none focus:text-indigo-600 uppercase" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} placeholder="FIRST NAME" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Other Name(S)</label>
              <input type="text" className="w-full font-bold text-sm bg-transparent outline-none focus:text-indigo-600 uppercase" value={formData.otherNames} onChange={(e) => setFormData({...formData, otherNames: e.target.value})} placeholder="OTHER NAMES" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Last Name</label>
              <input type="text" className="w-full font-bold text-sm bg-transparent outline-none focus:text-indigo-600 uppercase" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} placeholder="LAST NAME" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Mobile Number</label>
              <input type="tel" className="w-full font-bold text-sm bg-transparent outline-none focus:text-indigo-600 uppercase" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} placeholder="MOBILE NUMBER" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
              <input type="email" disabled className="w-full font-bold text-sm bg-transparent outline-none uppercase text-slate-500 truncate" value={formData.email} placeholder="EMAIL" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Gender</label>
              <select className="w-full font-bold text-sm bg-transparent outline-none focus:text-indigo-600 uppercase appearance-none cursor-pointer" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value})}>
                <option value="">SELECT GENDER</option>
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
              </select>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Date Of Birth</label>
              <input type="text" className="w-full font-bold text-sm bg-transparent outline-none focus:text-indigo-600 uppercase" value={formData.dateOfBirth} onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})} placeholder="FEB 03, 2003" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Country</label>
              <input type="text" className="w-full font-bold text-sm bg-transparent outline-none focus:text-indigo-600 uppercase" value={formData.nationality} onChange={(e) => setFormData({...formData, nationality: e.target.value})} placeholder="GHANA" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Guardian Name</label>
              <input type="text" className="w-full font-bold text-sm bg-transparent outline-none focus:text-indigo-600 uppercase" value={formData.guardianName} onChange={(e) => setFormData({...formData, guardianName: e.target.value})} placeholder="GUARDIAN NAME" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Guardian Phone Number</label>
              <input type="tel" className="w-full font-bold text-sm bg-transparent outline-none focus:text-indigo-600 uppercase" value={formData.guardianPhone} onChange={(e) => setFormData({...formData, guardianPhone: e.target.value})} placeholder="GUARDIAN PHONE" />
            </div>
            
          </div>
        )}

        {activeTab === 'school' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-in">
            
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Student ID</label>
              <input type="text" className="w-full font-bold text-sm bg-transparent outline-none focus:text-indigo-600 uppercase" value={formData.studentId} onChange={(e) => setFormData({...formData, studentId: e.target.value})} placeholder="NRIT/CR/..." />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Date Of Admission</label>
              <input type="text" className="w-full font-bold text-sm bg-transparent outline-none focus:text-indigo-600 uppercase" value={formData.dateOfAdmission} onChange={(e) => setFormData({...formData, dateOfAdmission: e.target.value})} placeholder="JAN 14, 2022" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Programme Of Study</label>
              <input type="text" className="w-full font-bold text-sm bg-transparent outline-none focus:text-indigo-600 uppercase truncate" value={formData.programmeOfStudy} onChange={(e) => setFormData({...formData, programmeOfStudy: e.target.value})} placeholder="BACHELOR OF SCIENCE..." />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Year Of Study</label>
              <input type="text" className="w-full font-bold text-sm bg-transparent outline-none focus:text-indigo-600 uppercase" value={formData.yearOfStudy} onChange={(e) => setFormData({...formData, yearOfStudy: e.target.value})} placeholder="300" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Student Type</label>
              <input type="text" className="w-full font-bold text-sm bg-transparent outline-none focus:text-indigo-600 uppercase" value={formData.studentType} onChange={(e) => setFormData({...formData, studentType: e.target.value})} placeholder="UNDERGRADUATE" />
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-[var(--border)]">
              <label className="block text-xs font-medium text-slate-500 mb-1">Campus</label>
              <input type="text" className="w-full font-bold text-sm bg-transparent outline-none focus:text-indigo-600 uppercase" value={formData.campus} onChange={(e) => setFormData({...formData, campus: e.target.value})} placeholder="UNIVERSITY OF CAPE COAST" />
            </div>
            
          </div>
        )}
      </form>
    </div>
  );
}
