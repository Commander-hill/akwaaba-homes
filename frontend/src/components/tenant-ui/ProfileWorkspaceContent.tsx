'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { useDialog } from '@/providers/DialogProvider';
import {
  Loader2,
  Save,
  Laptop,
  Smartphone,
  Globe,
  LogOut,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  User,
  Check,
  GraduationCap,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
  Phone,
  Mail,
  Calendar,
  Pencil,
  RotateCcw,
  Users,
  Monitor,
  ChevronDown,
  X,
} from 'lucide-react';

export function ProfileWorkspaceContent({
  defaultTab = 'basic',
}: {
  defaultTab?: 'basic' | 'school' | 'security';
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const queryClient = useQueryClient();
  const { confirm } = useDialog();

  const [activeSection, setActiveSection] = useState<
    'personal' | 'contact' | 'academic' | 'security'
  >(tabParam === 'security' ? 'security' : tabParam === 'school' ? 'academic' : 'personal');

  const [isStudent, setIsStudent] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Interactive Modals
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [guardianModalOpen, setGuardianModalOpen] = useState(false);
  const [academicModalOpen, setAcademicModalOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(tabParam === 'security');

  // Section refs for smooth scrolling when clicking left sub-nav items
  const personalRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const academicRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    otherNames: '',
    phoneNumber: '',
    email: '',
    gender: 'MALE',
    dateOfBirth: '',
    nationality: 'Ghanaian',
    guardianName: '',
    guardianPhone: '',
    avatarUrl: '',
    campus: '',
    studentId: '',
    dateOfAdmission: '',
    programmeOfStudy: '',
    yearOfStudy: '',
    studentType: 'Undergraduate',
  });

  const { data: session, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
  });

  const { data: twoFactorStatus } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: async () => {
      try {
        const res = await api.get('/auth/2fa/status');
        return res.data;
      } catch {
        return { twoFactorEnabled: false, remainingRecoveryCodes: 0 };
      }
    },
  });

  const {
    data: sessions,
    isLoading: isLoadingSessions,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      try {
        const res = await api.get('/auth/sessions');
        return res.data.sessions || [];
      } catch {
        return [];
      }
    },
  });

  const populateFromSession = (s: any) => {
    if (!s) return;
    setFormData({
      firstName: s.firstName || '',
      lastName: s.lastName || '',
      otherNames: s.otherNames || '',
      phoneNumber: s.phoneNumber || '',
      email: s.email || '',
      gender: s.gender || 'MALE',
      dateOfBirth: s.dateOfBirth || '',
      nationality: s.nationality || 'Ghanaian',
      guardianName: s.guardianName || '',
      guardianPhone: s.guardianPhone || '',
      avatarUrl: s.avatarUrl || '',
      campus: s.campus || '',
      studentId: s.studentId || '',
      dateOfAdmission: s.dateOfAdmission || '',
      programmeOfStudy: s.programmeOfStudy || '',
      yearOfStudy: s.yearOfStudy || '',
      studentType: s.studentType || 'Undergraduate',
    });
    setIsStudent(
      s.campus !== undefined || s.studentId !== undefined
        ? Boolean(s.campus || s.studentId || s.studentType || true)
        : true
    );
  };

  useEffect(() => {
    if (session) {
      populateFromSession(session);
    }
  }, [session]);

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
    },
  });

  const revokeAllOthersMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete('/auth/sessions/others');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || 'Signed out of all other devices');
      refetchSessions();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to revoke other sessions');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.put('/auth/profile', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Account settings saved successfully');
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || 'Failed to update profile';
      toast.error(errMsg);
    },
    onSettled: () => {
      setIsSaving(false);
    },
  });

  const isLocked = !!session?.isProfileLocked && session?.role !== 'ADMIN';
  const isUnlockRequested = !!session?.profileUnlockRequested;

  const handleSaveChanges = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLocked) {
      toast.error('Your profile is locked and read-only. Submit an unlock request if changes are needed.');
      return;
    }
    setIsSaving(true);
    const payload: Record<string, any> = { ...formData };
    Object.keys(payload).forEach((key) => {
      if (typeof payload[key] === 'string' && payload[key].includes('*')) {
        delete payload[key];
      }
    });
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

  const handleDiscardChanges = () => {
    if (session) {
      populateFromSession(session);
    }
    toast.success('Changes discarded');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-7 h-7 animate-spin text-[#0B3B24]" />
      </div>
    );
  }

  const activeSessionsCount = sessions?.length && sessions.length > 0 ? sessions.length : 2;
  const displayLevelShort = formData.yearOfStudy?.toLowerCase().includes('level')
    ? formData.yearOfStudy
    : `Level ${formData.yearOfStudy || '400'}`;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F6F0] text-[#14221A] flex flex-col justify-between relative overflow-x-hidden font-sans">
      <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-7 lg:px-10 pt-5 pb-6 flex-1 flex flex-col justify-between gap-4">
        {/* ── 1. HERO TITLE BANNER WITH BUILDING & TREES GRAPHIC ── */}
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between min-h-[88px]">
          <div className="relative z-10 max-w-2xl pr-4">
            <h1 className="text-[28px] sm:text-[34px] lg:text-[38px] font-extrabold text-[#0B3B24] tracking-tight leading-[1.1]">
              Account settings
            </h1>
            <p className="text-xs sm:text-[13.5px] text-[#3B4B41] mt-1.5 font-medium">
              Manage your profile, academic information, trusted contacts and account security.
            </p>
          </div>

          {/* Right Building & Trees Graphic */}
          <div className="hidden lg:block absolute right-[-24px] top-[-12px] bottom-[-18px] w-[520px] pointer-events-none select-none overflow-hidden">
            <Image
              src="/images/settings/settings-header-building.jpg"
              alt="Akwaaba Homes Account Settings"
              fill
              priority
              sizes="520px"
              className="object-cover object-right"
            />
            <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-[#F7F6F0] via-[#F7F6F0]/85 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[#F7F6F0] to-transparent" />
          </div>
        </div>

        {/* ── 2. RESIDENT ACCOUNT SUMMARY BANNER ── */}
        <div className="relative z-10 bg-[#E7F2E7] border border-[#CFE2D0] rounded-2xl px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-[0_2px_10px_rgba(11,59,36,0.03)]">
          <div className="flex flex-wrap items-center gap-3.5 sm:gap-5">
            {/* Dark Green Circular User Avatar */}
            <div className="w-13 h-13 rounded-full bg-[#114A2E] text-white flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
              {formData.avatarUrl ? (
                <img
                  src={formData.avatarUrl}
                  alt={`${formData.firstName} ${formData.lastName}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-7 h-7 fill-white text-white" />
              )}
            </div>

            {/* Resident Account Title & Dots */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[16px] sm:text-[17px] font-extrabold text-[#14221A]">
                  Resident account
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#BCE3C5] text-[#0E5A2A] text-[10.5px] font-extrabold uppercase tracking-wider">
                  {session?.role || 'TENANT'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#4A5D50] font-bold tracking-widest">
                <span>•••••••••</span>
                <span className="text-[#B8CEBA] font-normal">|</span>
              </div>
            </div>

            {/* Identity Verified & Student Status Cleared Pills */}
            <div className="flex flex-wrap items-center gap-2.5 sm:ml-3 pt-1 sm:pt-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D7ECD9] border border-[#BEDBC1] text-[#116932] text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-[#15803D]" />
                <span>Identity verified</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D7ECD9] border border-[#BEDBC1] text-[#116932] text-xs font-bold">
                <GraduationCap className="w-4 h-4 text-[#15803D]" />
                <span>Student status cleared</span>
              </span>
            </div>
          </div>

          {/* Right Action Button: Request profile changes or Editable Status */}
          {isLocked ? (
            isUnlockRequested ? (
              <div className="px-3.5 py-2 rounded-xl bg-[#FEF3C7] border border-[#F59E0B]/40 text-[#92400E] text-xs font-bold inline-flex items-center gap-2 shrink-0 shadow-2xs self-start md:self-center">
                <Clock className="w-3.5 h-3.5 text-[#D97706] animate-pulse" />
                <span>Unlock request pending</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setRequestModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#F9FBF9] hover:bg-white border border-[#5B7062] text-[#14221A] text-xs font-bold inline-flex items-center justify-center gap-2 shrink-0 shadow-2xs transition cursor-pointer self-start md:self-center"
              >
                <Lock className="w-3.5 h-3.5 text-[#0B3B24]" />
                <span>Request profile changes</span>
              </button>
            )
          ) : (
            <div className="px-3.5 py-2 rounded-xl bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20] text-xs font-bold inline-flex items-center gap-2 shrink-0 shadow-2xs self-start md:self-center">
              <Unlock className="w-3.5 h-3.5 text-[#2E7D32]" />
              <span>Profile editable</span>
            </div>
          )}
        </div>

        {/* ── 3. MAIN 3-COLUMN SETTINGS GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* ══════════════════════════════════════════════════════════════════
              LEFT COLUMN (3 COLS): Sub-Navigation + Independence Arch Illustration
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-3 flex">
            <div className="w-full bg-[#FAF9F4] border border-[#E6E4DA] rounded-2xl overflow-hidden flex flex-col justify-between shadow-[0_2px_12px_rgba(11,59,36,0.03)]">
              {/* Top 4 Navigation Items */}
              <div className="divide-y divide-[#EAE8DF]">
                {/* Item 1: Personal profile */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('personal');
                    personalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                  className={clsx(
                    'w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition cursor-pointer relative',
                    activeSection === 'personal'
                      ? 'bg-[#DFEFE0] before:content-[""] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-[#0B3B24]'
                      : 'hover:bg-[#F2F5F0]'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <User className="w-5 h-5 text-[#0B3B24] shrink-0 stroke-[2]" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold text-[#14221A] truncate">
                        Personal profile
                      </p>
                      <p className="text-[11px] text-[#55665B] truncate">
                        Your basic information
                      </p>
                    </div>
                  </div>
                </button>

                {/* Item 2: Contact & guardian */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('contact');
                    contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                  className={clsx(
                    'w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition cursor-pointer relative',
                    activeSection === 'contact'
                      ? 'bg-[#DFEFE0] before:content-[""] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-[#0B3B24]'
                      : 'hover:bg-[#F2F5F0]'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ShieldCheck className="w-5 h-5 text-[#14221A] shrink-0 stroke-[1.9]" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold text-[#14221A] truncate">
                        Contact &amp; guardian
                      </p>
                      <p className="text-[11px] text-[#55665B] truncate">
                        1 contact added
                      </p>
                    </div>
                  </div>
                  <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                </button>

                {/* Item 3: Academic details */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('academic');
                    academicRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                  className={clsx(
                    'w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition cursor-pointer relative',
                    activeSection === 'academic'
                      ? 'bg-[#DFEFE0] before:content-[""] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-[#0B3B24]'
                      : 'hover:bg-[#F2F5F0]'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <GraduationCap className="w-5 h-5 text-[#14221A] shrink-0 stroke-[1.9]" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold text-[#14221A] truncate">
                        Academic details
                      </p>
                      <p className="text-[11px] text-[#55665B] truncate">
                        UCC • {displayLevelShort}
                      </p>
                    </div>
                  </div>
                  <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                </button>

                {/* Item 4: Security & sessions */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('security');
                    setSecurityModalOpen(true);
                  }}
                  className={clsx(
                    'w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition cursor-pointer relative',
                    activeSection === 'security'
                      ? 'bg-[#DFEFE0] before:content-[""] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-[#0B3B24]'
                      : 'hover:bg-[#F2F5F0]'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Lock className="w-5 h-5 text-[#14221A] shrink-0 stroke-[1.9]" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold text-[#14221A] truncate">
                        Security &amp; sessions
                      </p>
                      <p className="text-[11px] text-[#55665B] truncate">
                        2FA enabled
                      </p>
                    </div>
                  </div>
                  <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                </button>
              </div>

              {/* Bottom Ghana Independence Arch Illustration */}
              <div className="relative w-full h-[210px] mt-auto select-none pointer-events-none">
                <Image
                  src="/images/settings/settings-arch-illust.png"
                  alt="Ghana Independence Arch"
                  fill
                  sizes="280px"
                  className="object-cover object-bottom"
                />
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              CENTER COLUMN (6 COLS): Personal Info + Contact/Emergency + Academic Profile
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 flex flex-col gap-4 justify-between">
            {/* ── Card 1: Personal information ── */}
            <div
              ref={personalRef}
              className="bg-[#FDFCF9] border border-[#E6E4DA] rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(11,59,36,0.03)] space-y-3.5"
            >
              <div className="pb-2.5 border-b border-[#BCE0C3] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-[#0B3B24] stroke-[2.2]" />
                    <h2 className="text-[16px] font-extrabold text-[#14221A]">
                      Personal information
                    </h2>
                  </div>
                  <p className="text-xs text-[#516056] mt-0.5">
                    {isLocked
                      ? 'Verified tenant identity credentials (Read-only).'
                      : 'Update your personal details when necessary.'}
                  </p>
                </div>
                {isLocked && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4B6052] bg-[#E5ECE5] border border-[#C5D8C7] px-2.5 py-1 rounded-full shadow-2xs">
                    <Lock className="w-3 h-3 text-[#3B5042]" /> Read-only
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-0.5">
                {/* First name */}
                <div>
                  <label className="block text-xs font-bold text-[#1E2E24] mb-1">
                    First name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-[#F6F6F2] border border-[#DFDDD2] text-[13px] font-semibold text-[#14221A] focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-[#ECEAE2] disabled:text-[#526056] disabled:border-[#D5D3C8] disabled:cursor-not-allowed"
                  />
                </div>

                {/* Other names */}
                <div>
                  <label className="block text-xs font-bold text-[#1E2E24] mb-1">
                    Other names <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={formData.otherNames}
                    onChange={(e) => setFormData({ ...formData, otherNames: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-[#F6F6F2] border border-[#DFDDD2] text-[13px] font-semibold text-[#14221A] focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-[#ECEAE2] disabled:text-[#526056] disabled:border-[#D5D3C8] disabled:cursor-not-allowed"
                  />
                </div>

                {/* Last name */}
                <div>
                  <label className="block text-xs font-bold text-[#1E2E24] mb-1">
                    Last name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-[#F6F6F2] border border-[#DFDDD2] text-[13px] font-semibold text-[#14221A] focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-[#ECEAE2] disabled:text-[#526056] disabled:border-[#D5D3C8] disabled:cursor-not-allowed"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-[#1E2E24] mb-1">
                    Gender <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#4C5C52] pointer-events-none font-bold">
                      ♂
                    </span>
                    <select
                      disabled={isLocked}
                      value={formData.gender || 'MALE'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full h-10 pl-7 pr-8 rounded-xl bg-[#F6F6F2] border border-[#DFDDD2] text-[13px] font-semibold text-[#14221A] appearance-none focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-[#ECEAE2] disabled:text-[#526056] disabled:border-[#D5D3C8] disabled:cursor-not-allowed"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#5A6A60] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Date of birth */}
                <div>
                  <label className="block text-xs font-bold text-[#1E2E24] mb-1">
                    Date of birth <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-[#5A6A60] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      disabled={isLocked}
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full h-10 pl-8 pr-3 rounded-xl bg-[#F6F6F2] border border-[#DFDDD2] text-[13px] font-semibold text-[#14221A] focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-[#ECEAE2] disabled:text-[#526056] disabled:border-[#D5D3C8] disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Nationality */}
                <div>
                  <label className="block text-xs font-bold text-[#1E2E24] mb-1">
                    Nationality <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 text-[#5A6A60] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      disabled={isLocked}
                      value={formData.nationality || 'Ghanaian'}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full h-10 pl-8 pr-8 rounded-xl bg-[#F6F6F2] border border-[#DFDDD2] text-[13px] font-semibold text-[#14221A] appearance-none focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-[#ECEAE2] disabled:text-[#526056] disabled:border-[#D5D3C8] disabled:cursor-not-allowed"
                    >
                      <option value="Ghanaian">Ghanaian</option>
                      <option value="Nigerian">Nigerian</option>
                      <option value="Ivorian">Ivorian</option>
                      <option value="Togolese">Togolese</option>
                      <option value="International">International</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#5A6A60] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card 2: Contact & emergency contact ── */}
            <div
              ref={contactRef}
              className="bg-[#FDFCF9] border border-[#E6E4DA] rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(11,59,36,0.03)]"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Left 8 cols: Contact inputs */}
                <div className="md:col-span-8 space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-[#0B3B24] stroke-[2.2]" />
                      <h2 className="text-[15.5px] font-extrabold text-[#14221A]">
                        Contact &amp; emergency contact
                      </h2>
                    </div>
                    <p className="text-xs text-[#516056] mt-0.5">
                      Keep your contact details up to date.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Phone number */}
                    <div>
                      <label className="block text-xs font-bold text-[#1E2E24] mb-1">
                        Phone number <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-[#5A6A60] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="tel"
                          disabled={isLocked}
                          value={formData.phoneNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, phoneNumber: e.target.value })
                          }
                          className="w-full h-10 pl-8 pr-3 rounded-xl bg-[#F6F6F2] border border-[#DFDDD2] text-[13px] font-semibold text-[#14221A] focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-[#ECEAE2] disabled:text-[#526056] disabled:border-[#D5D3C8] disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Email address */}
                    <div>
                      <label className="block text-xs font-bold text-[#1E2E24] mb-1">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-[#5A6A60] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="email"
                          disabled
                          value={formData.email}
                          className="w-full h-10 pl-8 pr-3 rounded-xl bg-[#F6F6F2] border border-[#DFDDD2] text-[13px] font-semibold text-[#14221A] disabled:bg-[#ECEAE2] disabled:text-[#526056] disabled:border-[#D5D3C8] disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 4 cols: Mint-green Guardian Card */}
                <div className="md:col-span-4">
                  <button
                    type="button"
                    onClick={() => setGuardianModalOpen(true)}
                    title={isLocked ? "View guardian details (Read-only)" : "Click to update guardian details"}
                    className="w-full text-left p-3.5 rounded-xl bg-[#EBF6EC] hover:bg-[#E2F2E4] border border-[#CFE5D2] flex items-center gap-3 transition cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#D5ECD7] text-[#15803D] flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 fill-[#15803D]" />
                    </div>
                    <div className="min-w-0 space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-extrabold text-[#14221A]">Guardian</p>
                        {isLocked && (
                          <span className="text-[10px] font-bold text-[#4B6252] bg-[#D4E8D7] px-1.5 py-0.5 rounded flex items-center gap-1 shadow-2xs">
                            <Lock className="w-2.5 h-2.5" /> Read-only
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-[#2E3F34] truncate">
                        Name: <span className="font-semibold">{formData.guardianName || 'Mr. Darko'}</span>
                      </p>
                      <p className="text-[11.5px] text-[#2E3F34] truncate">
                        Phone: <span className="font-semibold">{formData.guardianPhone || '05*******21'}</span>
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Card 3: Academic profile ── */}
            <div
              ref={academicRef}
              className="bg-[#FDFCF9] border border-[#E6E4DA] rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(11,59,36,0.03)] space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-[#0B3B24] stroke-[2.2]" />
                    <h2 className="text-[15.5px] font-extrabold text-[#14221A]">
                      Academic profile
                    </h2>
                  </div>
                  <p className="text-xs text-[#516056] mt-0.5">
                    {isLocked ? 'Institutional tenancy verification (Read-only).' : 'Your university and academic information.'}
                  </p>
                </div>
                {isLocked && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4B6052] bg-[#E5ECE5] border border-[#C5D8C7] px-2.5 py-1 rounded-full shadow-2xs">
                    <Lock className="w-3 h-3 text-[#3B5042]" /> Read-only
                  </span>
                )}
              </div>

              <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                {/* Left: UCC Crest + Campus & Programme */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E3D8] relative overflow-hidden shrink-0 shadow-2xs">
                    <Image
                      src="/images/settings/ucc-crest.png"
                      alt="University Crest"
                      fill
                      sizes="40px"
                      className="object-contain p-0.5"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-extrabold text-[#14221A] truncate">
                      {formData.campus || 'University of Cape Coast (UCC)'}
                    </p>
                    <p className="text-xs text-[#4A5A50] font-medium truncate">
                      {formData.programmeOfStudy || 'BSc IT'} • {displayLevelShort}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:block h-8 w-px bg-[#E5E3D8]" />

                {/* Middle: Student ID */}
                <div>
                  <p className="text-xs font-extrabold text-[#14221A]">Student ID</p>
                  <p className="text-xs font-semibold text-[#3B4C41] font-mono mt-0.5">
                    {formData.studentId || 'NRIT/CR/17/22/0001'}
                  </p>
                </div>

                {/* Right: Student status verified pill button */}
                <button
                  type="button"
                  onClick={() => setAcademicModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E1F3E4] hover:bg-[#D4ECD8] text-[#116932] text-xs font-bold transition cursor-pointer"
                >
                  <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                  <span>{isLocked ? 'Student verified (Read-only)' : 'Student status verified'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT COLUMN (3 COLS): Identity protection + Account security
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-3 flex flex-col gap-4 justify-between">
            {/* ── Card 1: Identity protection + Student status ── */}
            <div className="bg-[#FDFCF9] border border-[#E6E4DA] rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(11,59,36,0.03)] flex flex-col justify-between">
              {/* Header Bar */}
              <div
                className={clsx(
                  'text-white px-4 py-3 flex items-center gap-2.5 transition-colors',
                  isLocked ? 'bg-[#0B3B24]' : 'bg-[#155E38]'
                )}
              >
                {isLocked ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-300 shrink-0" />
                ) : (
                  <Unlock className="w-5 h-5 text-emerald-300 shrink-0" />
                )}
                <h2 className="text-[15px] font-extrabold tracking-tight">
                  {isLocked ? 'Identity protection' : 'Profile editing active'}
                </h2>
              </div>

              {/* Body */}
              <div className="p-4 flex flex-col items-center text-center space-y-3 border-b border-[#EAE8DF]">
                <p className="text-xs text-[#2B3B31] font-medium leading-relaxed text-left w-full">
                  {isLocked
                    ? 'Your verified identity details are locked for your security and tenancy integrity.'
                    : 'Your profile is currently unlocked. You can update your details and save your changes below.'}
                </p>

                {/* Graphic: Lock illustration or Unlock badge */}
                {isLocked ? (
                  <div className="relative w-[150px] h-[64px] my-0.5 select-none pointer-events-none">
                    <Image
                      src="/images/settings/settings-lock-illust.png"
                      alt="Locked Identity Protection"
                      fill
                      sizes="150px"
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-[#E8F5E9] border border-[#A5D6A7] flex items-center justify-center my-0.5 text-[#1B5E20] shadow-2xs">
                    <Unlock className="w-8 h-8 stroke-[2.2]" />
                  </div>
                )}

                {/* Request edit access button or Unlocked Status Pill */}
                {isLocked ? (
                  isUnlockRequested ? (
                    <div className="w-full py-2 px-3.5 rounded-full bg-[#FEF3C7] border border-[#F59E0B]/40 text-[#92400E] text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-2xs">
                      <Clock className="w-3.5 h-3.5 text-[#D97706] animate-pulse" />
                      <span>Unlock request pending</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRequestModalOpen(true)}
                      className="w-full py-2 px-3.5 rounded-full bg-[#F7FAF7] hover:bg-[#EDF5EE] border border-[#B9D5BE] text-[#116932] text-xs font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Request edit access</span>
                    </button>
                  )
                ) : (
                  <div className="w-full py-2 px-3.5 rounded-full bg-[#E8F5E9] border border-[#A5D6A7] text-[#1B5E20] text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                    <span>Edit access active</span>
                  </div>
                )}
              </div>

              {/* Bottom Student Status Toggle Row */}
              <div className="p-4 flex items-start justify-between gap-3 bg-[#FAF9F4]">
                <div className="flex items-start gap-2.5 min-w-0">
                  <GraduationCap className="w-5 h-5 text-[#0B3B24] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-extrabold text-[#14221A]">
                      Student status
                    </p>
                    <p className="text-[11px] text-[#55665B] leading-snug mt-0.5">
                      {isLocked
                        ? 'Student status verified and locked by UCC.'
                        : 'Your student status is active and verified by UCC.'}
                    </p>
                  </div>
                </div>

                {/* Green Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={isStudent}
                  disabled={isLocked}
                  onClick={() => {
                    if (!isLocked) setIsStudent(!isStudent);
                  }}
                  className={clsx(
                    'w-11 h-6 rounded-full transition-colors relative shrink-0 mt-0.5',
                    isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                    isStudent ? 'bg-[#16A34A]' : 'bg-zinc-300'
                  )}
                  title={isLocked ? 'Student status is locked (Read-only)' : 'Toggle student status'}
                >
                  <span
                    className={clsx(
                      'w-5 h-5 rounded-full bg-white shadow-xs absolute top-0.5 transition-transform',
                      isStudent ? 'right-0.5' : 'left-0.5'
                    )}
                  />
                </button>
              </div>
            </div>

            {/* ── Card 2: Account security ── */}
            <div className="bg-[#FDFCF9] border border-[#E6E4DA] rounded-2xl p-4 sm:p-5 shadow-[0_2px_12px_rgba(11,59,36,0.03)] space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-[#EAE8DF]">
                <ShieldCheck className="w-5 h-5 text-[#0B3B24] stroke-[2.2]" />
                <h2 className="text-[15.5px] font-extrabold text-[#14221A]">
                  Account security
                </h2>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[#2B3B31] font-semibold">
                    <KeyRound className="w-4 h-4 text-[#4A5A50]" />
                    <span>Two-Factor Authentication</span>
                  </span>
                  <span
                    className={clsx(
                      'px-2.5 py-0.5 rounded-full text-[11px] font-bold',
                      twoFactorStatus?.twoFactorEnabled
                        ? 'bg-[#DCFCE7] text-[#15803D]'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
                    )}
                  >
                    {twoFactorStatus?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[#2B3B31] font-semibold">
                    <Monitor className="w-4 h-4 text-[#4A5A50]" />
                    <span>Active Sessions</span>
                  </span>
                  <span className="font-extrabold text-[#14221A]">
                    {activeSessionsCount} sessions
                  </span>
                </div>
              </div>

              <div className="pt-1 flex justify-center">
                <button
                  type="button"
                  onClick={() => setSecurityModalOpen(true)}
                  className="text-xs font-extrabold text-[#116932] hover:text-[#0B3B24] inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>Manage security</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. BOTTOM ACTION BAR: DISCARD CHANGES & SAVE CHANGES ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#E8E6DC] mt-2">
          {/* Status Note */}
          <div className="flex items-center gap-2 text-xs font-semibold text-[#55665B]">
            {isLocked ? (
              <>
                <Lock className="w-4 h-4 text-[#8A968E] shrink-0" />
                <span>Your profile is locked and read-only. Request edit access to make changes.</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span>You have edit permissions. Click Save changes after updating your details.</span>
              </>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 shrink-0">
            {!isLocked && (
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="px-5 py-2.5 rounded-xl bg-[#FDFCF9] hover:bg-white border border-[#D4D2C6] text-[#2B3B31] text-xs sm:text-[13px] font-bold inline-flex items-center gap-2 shadow-2xs transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-[#4A5A50]" />
                <span>Discard changes</span>
              </button>
            )}

            {isLocked ? (
              isUnlockRequested ? (
                <div className="px-5 py-2.5 rounded-xl bg-[#FEF3C7] border border-[#F59E0B]/40 text-[#92400E] text-xs sm:text-[13px] font-bold inline-flex items-center gap-2 shadow-2xs">
                  <Clock className="w-4 h-4 text-[#D97706] animate-pulse" />
                  <span>Unlock request pending</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#0B3B24] hover:bg-[#082C1B] text-white text-xs sm:text-[13px] font-bold inline-flex items-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Request profile changes</span>
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() => handleSaveChanges()}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-[#11823B] hover:bg-[#0E6E31] disabled:opacity-60 text-white text-xs sm:text-[13px] font-bold inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save changes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1: REQUEST PROFILE EDIT ACCESS MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {requestModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#15803D]" />
                <h3 className="text-base font-extrabold text-zinc-900">
                  Request Profile Edit Access
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Your verified identity details are locked to protect your tenancy records. Please state what information you need to update (for example, name correction or emergency guardian contact).
            </p>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                Reason for Modification <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Describe what needs to be updated..."
                className="w-full p-3 text-xs bg-zinc-50 rounded-xl border border-zinc-300 outline-none focus:ring-2 focus:ring-[#16A34A]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-700 border border-zinc-200 hover:bg-zinc-50 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!requestReason.trim() || requestUnlockMutation.isPending}
                onClick={() => requestUnlockMutation.mutate(requestReason)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#0B3B24] hover:bg-[#0E4B2E] rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
              >
                {requestUnlockMutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Submit Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: GUARDIAN & EMERGENCY CONTACT EDIT MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {guardianModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#15803D]" />
                <h3 className="text-base font-extrabold text-zinc-900">
                  Guardian &amp; Emergency Contact
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGuardianModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLocked && (
              <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#92400E]">
                <Lock className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Profile is locked and read-only</p>
                  <p className="mt-0.5 text-[11px] text-[#A15C07]">
                    Emergency contacts are linked to your tenancy agreement. Click &apos;Request profile changes&apos; to modify.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Guardian / Next of Kin Name
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.guardianName}
                  onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                  placeholder="Mr. Darko"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Guardian Emergency Phone
                </label>
                <input
                  type="tel"
                  disabled={isLocked}
                  value={formData.guardianPhone}
                  onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                  placeholder="05*******21"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGuardianModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-700 border border-zinc-200 hover:bg-zinc-50 rounded-lg cursor-pointer"
              >
                {isLocked ? 'Close' : 'Cancel'}
              </button>
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => {
                    setGuardianModalOpen(false);
                    handleSaveChanges();
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#11823B] hover:bg-[#0E6E31] rounded-lg cursor-pointer"
                >
                  Save Guardian Details
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 3: ACADEMIC PROFILE DETAILS MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {academicModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#15803D]" />
                <h3 className="text-base font-extrabold text-zinc-900">
                  Academic Profile &amp; University Credentials
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAcademicModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLocked && (
              <div className="bg-[#FEF3C7] border border-[#FDE68A] rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#92400E]">
                <Lock className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Student records verified &amp; locked</p>
                  <p className="mt-0.5 text-[11px] text-[#A15C07]">
                    Institution details are locked for student accommodation clearance. Contact an administrator to update.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Campus / University *</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.campus}
                  onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 font-semibold text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Student ID Number *</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 font-mono font-semibold text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Programme of Study</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.programmeOfStudy}
                  onChange={(e) => setFormData({ ...formData, programmeOfStudy: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 font-semibold text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Academic Level</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.yearOfStudy}
                  onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 font-semibold text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAcademicModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-700 border border-zinc-200 hover:bg-zinc-50 rounded-lg cursor-pointer"
              >
                {isLocked ? 'Close' : 'Cancel'}
              </button>
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => {
                    setAcademicModalOpen(false);
                    handleSaveChanges();
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#11823B] hover:bg-[#0E6E31] rounded-lg cursor-pointer"
                >
                  Save Academic Profile
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 4: SECURITY & ACTIVE SESSIONS MANAGEMENT MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {securityModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full border border-zinc-200 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#EAF5EC] text-[#15803D] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-zinc-900">
                    Account Security &amp; Active Sessions
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Manage Two-Factor Authentication (2FA), password recovery, and active devices.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSecurityModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Two-Factor Authentication Card */}
            <div className="p-4 rounded-xl bg-[#F7FAF7] border border-[#CFE5D2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#15803D]" />
                  <span className="text-xs font-extrabold text-zinc-900">
                    Two-Factor Authentication (2FA)
                  </span>
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-[10.5px] font-bold',
                      twoFactorStatus?.twoFactorEnabled === true
                        ? 'bg-[#DCFCE7] text-[#15803D]'
                        : 'bg-amber-100 text-amber-800'
                    )}
                  >
                    {twoFactorStatus?.twoFactorEnabled === true ? 'Enabled' : 'Recommended'}
                  </span>
                </div>
                <p className="text-xs text-zinc-600">
                  Protect your tenancy agreements and account with authenticator codes.
                </p>
              </div>
              <Link
                href="/dashboard/profile/security/2fa"
                className="px-3.5 py-2 rounded-lg bg-[#0B3B24] hover:bg-[#0E4B2E] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
              >
                <span>Configure 2FA</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Password Recovery Row */}
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-zinc-900">
                  Password &amp; Recovery Credentials
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Send a cryptographic password reset link to your registered email.
                </p>
              </div>
              <Link
                href="/forgot-password"
                className="px-3.5 py-2 rounded-lg border border-zinc-300 hover:bg-white text-xs font-bold text-zinc-800 shrink-0"
              >
                Reset Password via Email
              </Link>
            </div>

            {/* Active Sessions List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-zinc-900 uppercase tracking-wider">
                  Active Authenticated Sessions ({activeSessionsCount})
                </h4>
                {sessions && sessions.filter((s: any) => !s.isCurrentSession).length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      const shouldRevoke = await confirm({
                        title: 'Sign Out All Other Devices',
                        message:
                          'Are you sure you want to sign out all other active devices? You will remain signed in on this current browser.',
                        confirmText: 'Sign Out Other Devices',
                        type: 'warning',
                      });
                      if (shouldRevoke) {
                        revokeAllOthersMutation.mutate();
                      }
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out Other Devices</span>
                  </button>
                )}
              </div>

              {isLoadingSessions ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-[#0B3B24]" />
                </div>
              ) : sessions && sessions.length > 0 ? (
                <div className="space-y-2">
                  {sessions.map((s: any) => {
                    const isMobile =
                      s.deviceFamily?.toLowerCase().includes('phone') ||
                      s.deviceFamily?.toLowerCase().includes('mobile');
                    return (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/70 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center shrink-0">
                            {isMobile ? (
                              <Smartphone className="w-4 h-4 text-[#0B3B24]" />
                            ) : (
                              <Laptop className="w-4 h-4 text-[#0B3B24]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-zinc-900 truncate">
                              {s.userAgent || 'Browser Session'}
                            </p>
                            <p className="text-[11px] text-zinc-500 flex items-center gap-2">
                              <span>{s.ipAddress || '127.0.0.1'}</span>
                              <span>•</span>
                              <span>
                                {s.lastActive
                                  ? formatDistanceToNow(new Date(s.lastActive), { addSuffix: true })
                                  : 'Active now'}
                              </span>
                            </p>
                          </div>
                        </div>

                        {s.isCurrentSession ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] font-bold shrink-0">
                            Current Device
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => revokeSessionMutation.mutate(s.id)}
                            className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold shrink-0 cursor-pointer"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70 text-center text-xs text-zinc-500">
                  <p>No additional active sessions detected. You are securely signed in on this current browser.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSecurityModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#0B3B24] text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
