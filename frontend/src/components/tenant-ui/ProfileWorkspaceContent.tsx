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
import { getImageUrl } from '@/lib/utils';
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
  ShieldAlert,
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
  Building2,
  Wallet,
  Camera,
} from 'lucide-react';

export function ProfileWorkspaceContent({
  defaultTab = 'basic',
}: {
  defaultTab?: 'basic' | 'school' | 'security';
}) {
  const searchParams = useSearchParams();
  const rawTabParam = searchParams.get('tab');
  const effectiveTab =
    rawTabParam ||
    (defaultTab === 'security' ? 'security' : defaultTab === 'school' ? 'school' : 'basic');
  const queryClient = useQueryClient();
  const { confirm } = useDialog();

  const [activeSection, setActiveSection] = useState<
    'personal' | 'contact' | 'academic' | 'security'
  >(
    effectiveTab === 'security'
      ? 'security'
      : effectiveTab === 'school'
      ? 'academic'
      : 'personal'
  );

  const [isStudent, setIsStudent] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Interactive Modals
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [guardianModalOpen, setGuardianModalOpen] = useState(false);
  const [academicModalOpen, setAcademicModalOpen] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);

  // Section refs for smooth scrolling when clicking left sub-nav items
  const personalRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const academicRef = useRef<HTMLDivElement>(null);
  const securityRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
    // Landlord-specific fields
    hostEntityType: 'Individual Landlord',
    businessName: '',
    primaryRegion: 'Greater Accra Region',
    portfolioSize: '1 - 5 Properties',
    payoutMethod: 'Mobile Money (MoMo)',
    payoutProvider: 'MTN Mobile Money',
    payoutAccountNumber: '',
    tinNumber: '',
    businessRegistrationNumber: '',
  });

  const { data: session, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const res = await api.get('/auth/me');
      return res.data.user;
    },
  });

  const isLandlord = session?.role === 'LANDLORD';

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
    const roleIsLandlord = s.role === 'LANDLORD';
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
      campus: roleIsLandlord ? '' : s.campus || '',
      studentId: roleIsLandlord ? '' : s.studentId || '',
      dateOfAdmission: roleIsLandlord ? '' : s.dateOfAdmission || '',
      programmeOfStudy: roleIsLandlord ? '' : s.programmeOfStudy || '',
      yearOfStudy: roleIsLandlord ? '' : s.yearOfStudy || '',
      studentType: roleIsLandlord ? '' : s.studentType || 'Undergraduate',
      hostEntityType: s.hostEntityType || 'Individual Landlord',
      businessName:
        s.businessName ||
        (roleIsLandlord && (s.firstName || s.lastName)
          ? `${s.firstName || ''} ${s.lastName || ''} Properties`.trim()
          : ''),
      primaryRegion: s.primaryRegion || 'Greater Accra Region',
      portfolioSize: s.portfolioSize || '1 - 5 Properties',
      payoutMethod: s.payoutMethod || 'Mobile Money (MoMo)',
      payoutProvider: s.payoutProvider || 'MTN Mobile Money',
      payoutAccountNumber: s.payoutAccountNumber || s.phoneNumber || '',
      tinNumber: s.tinNumber || '',
      businessRegistrationNumber: s.businessRegistrationNumber || '',
    });
    setIsStudent(
      roleIsLandlord ? false : Boolean(s.campus || s.studentId || s.programmeOfStudy)
    );
  };

  useEffect(() => {
    if (session) {
      populateFromSession(session);
    }
  }, [session]);

  useEffect(() => {
    if (effectiveTab === 'security') {
      securityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else if (effectiveTab === 'school') {
      academicRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [effectiveTab]);

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

  const isIdentityVerified =
    session?.ghanaCardStatus === 'VERIFIED' || session?.ghanaCardStatus === 'APPROVED';
  const isHostDeedVerified =
    Boolean(session?.isVerifiedLandlord) ||
    session?.landlordVerificationStatus === 'VERIFIED' ||
    session?.landlordVerificationStatus === 'APPROVED';

  const fallbackAvatar = isLandlord
    ? '/images/avatars/landlord-avatar.png'
    : '/images/avatars/resident-stephen-darko.png';

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingAvatar(true);
      const uploadData = new FormData();
      uploadData.append('avatar', file);
      const res = await api.post('/upload/avatar', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = res.data?.avatarUrl || res.data?.url;
      if (uploadedUrl) {
        setFormData((prev) => ({ ...prev, avatarUrl: uploadedUrl }));
        toast.success('Profile photo uploaded');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload profile photo');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

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
    if (isLandlord || !isStudent) {
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

  const activeSessionsCount =
    sessions && sessions.length > 0 ? sessions.length : isLoadingSessions ? 1 : 1;
  const sessionLabel =
    activeSessionsCount === 1 ? '1 session' : `${activeSessionsCount} sessions`;
  const displayLevelShort = formData.yearOfStudy?.toLowerCase().includes('level')
    ? formData.yearOfStudy
    : formData.yearOfStudy
    ? `Level ${formData.yearOfStudy}`
    : 'Level 100';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white dark:bg-[#0E1210] text-[#14221A] dark:text-zinc-100 flex flex-col justify-between relative overflow-x-hidden font-sans">
      <div className="w-full max-w-[1380px] mx-auto px-4 sm:px-7 lg:px-10 pt-5 pb-6 flex-1 flex flex-col justify-between gap-4">
        {/* ── 1. HERO TITLE BANNER WITH BUILDING & TREES GRAPHIC ── */}
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between min-h-[88px]">
          <div className="relative z-10 max-w-2xl pr-4">
            <h1 className="text-[28px] sm:text-[34px] lg:text-[38px] font-extrabold text-[#0B3B24] dark:text-emerald-400 tracking-tight leading-[1.1]">
              Account settings
            </h1>
            <p className="text-xs sm:text-[13.5px] text-zinc-600 dark:text-zinc-400 mt-1.5 font-medium">
              {isLandlord
                ? 'Manage your landlord profile, property business credentials, payout settlement and account security.'
                : 'Manage your profile, academic information, trusted contacts and account security.'}
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
            <div className="absolute inset-y-0 left-0 w-28 bg-gradient-to-r from-white via-white/85 to-transparent dark:from-[#0E1210] dark:via-[#0E1210]/85" />
            <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white to-transparent dark:from-[#0E1210]" />
          </div>
        </div>

        {/* ── 2. ACCOUNT SUMMARY BANNER (ROLE-AWARE FOR LANDLORD VS TENANT) ── */}
        <div className="relative z-10 bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-xs">
          <div className="flex flex-wrap items-center gap-3.5 sm:gap-5">
            {/* Circular User Avatar with Optional Photo Upload Trigger */}
            <div className="relative group shrink-0">
              <div className="w-13 h-13 rounded-full bg-[#114A2E] text-white flex items-center justify-center overflow-hidden shadow-xs ring-2 ring-emerald-500/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img decoding="async"
                  src={formData.avatarUrl ? getImageUrl(formData.avatarUrl) : fallbackAvatar}
                  alt={`${formData.firstName || 'User'} ${formData.lastName || ''}`.trim()}
                  className="w-full h-full object-cover"
                />
              </div>
              {!isLocked && (
                <>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    title="Upload profile photo"
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#16A34A] hover:bg-[#15803D] text-white border-2 border-white dark:border-zinc-900 flex items-center justify-center shadow-xs transition cursor-pointer"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Camera className="w-3 h-3" />
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Account Title & Contact info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[16px] sm:text-[17px] font-extrabold text-[#14221A] dark:text-white">
                  {isLandlord ? 'Landlord & Host account' : 'Resident account'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100/90 dark:bg-emerald-950/60 text-[#0E5A2A] dark:text-emerald-300 text-[10.5px] font-extrabold uppercase tracking-wider border border-emerald-200 dark:border-emerald-800/60">
                  {session?.role || 'TENANT'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
                {formData.firstName || formData.lastName ? (
                  <span>
                    {`${formData.firstName} ${formData.lastName}`.trim()}
                    {formData.phoneNumber ? ` • ${formData.phoneNumber}` : formData.email ? ` • ${formData.email}` : ''}
                  </span>
                ) : formData.phoneNumber ? (
                  <span>{formData.phoneNumber}</span>
                ) : (
                  <span>{formData.email}</span>
                )}
              </div>
            </div>

            {/* Identity Verified & Role-Specific Status Pills */}
            <div className="flex flex-wrap items-center gap-2.5 sm:ml-3 pt-1 sm:pt-0">
              {isIdentityVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[#116932] dark:text-emerald-400 text-xs font-bold shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-[#15803D] dark:text-emerald-400" />
                  <span>Identity verified</span>
                </span>
              ) : session?.ghanaCardStatus === 'PENDING' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs font-bold shadow-2xs">
                  <Clock className="w-4 h-4 text-[#D97706]" />
                  <span>Verification pending</span>
                </span>
              ) : (
                <Link
                  href="/dashboard/verification"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 text-zinc-500" />
                  <span>Identity unverified</span>
                </Link>
              )}

              {isLandlord ? (
                isHostDeedVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[#116932] dark:text-emerald-400 text-xs font-bold shadow-2xs">
                    <Building2 className="w-4 h-4 text-[#15803D] dark:text-emerald-400" />
                    <span>Verified Property Host</span>
                  </span>
                ) : session?.landlordVerificationStatus === 'PENDING' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs font-bold shadow-2xs">
                    <Clock className="w-4 h-4 text-[#D97706]" />
                    <span>Deed verification pending</span>
                  </span>
                ) : (
                  <Link
                    href="/dashboard/verification"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 text-zinc-600 dark:text-zinc-300 text-xs font-bold transition shadow-2xs cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-zinc-500" />
                    <span>Verify property deed</span>
                  </Link>
                )
              ) : isStudent ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[#116932] dark:text-emerald-400 text-xs font-bold shadow-2xs">
                  <GraduationCap className="w-4 h-4 text-[#15803D] dark:text-emerald-400" />
                  <span>Student status cleared</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold shadow-2xs">
                  <User className="w-4 h-4 text-zinc-500" />
                  <span>Resident tenant</span>
                </span>
              )}
            </div>
          </div>

          {/* Right Action Button: Request profile changes or Editable Status */}
          {isLocked ? (
            !isUnlockRequested ? (
              <button
                type="button"
                onClick={() => setRequestModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-bold inline-flex items-center justify-center gap-2 shrink-0 shadow-2xs transition cursor-pointer self-start md:self-center"
              >
                <Lock className="w-3.5 h-3.5 text-[#0B3B24] dark:text-emerald-400" />
                <span>Request profile changes</span>
              </button>
            ) : null
          ) : (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[#0F5132] dark:text-emerald-400 text-xs font-bold inline-flex items-center gap-2 shrink-0 shadow-2xs self-start md:self-center">
              <Unlock className="w-3.5 h-3.5 text-[#2E7D32] dark:text-emerald-400" />
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
            <div className="w-full bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs">
              {/* Top 4 Navigation Items */}
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
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
                      ? 'bg-[#DCFCE7] dark:bg-emerald-950/60 before:content-[""] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-[#0B3B24] dark:before:bg-emerald-400'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <User className="w-5 h-5 text-[#0B3B24] dark:text-emerald-400 shrink-0 stroke-[2]" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold text-[#0B3B24] dark:text-emerald-300 truncate">
                        Personal profile
                      </p>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                        Your basic information
                      </p>
                    </div>
                  </div>
                </button>

                {/* Item 2: Contact & next of kin / guardian */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('contact');
                    contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                  className={clsx(
                    'w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition cursor-pointer relative',
                    activeSection === 'contact'
                      ? 'bg-[#DCFCE7] dark:bg-emerald-950/60 before:content-[""] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-[#0B3B24] dark:before:bg-emerald-400'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ShieldCheck
                      className={clsx(
                        'w-5 h-5 shrink-0 stroke-[1.9]',
                        activeSection === 'contact'
                          ? 'text-[#0B3B24] dark:text-emerald-400'
                          : 'text-zinc-700 dark:text-zinc-300'
                      )}
                    />
                    <div className="min-w-0">
                      <p
                        className={clsx(
                          'text-[13px] font-extrabold truncate',
                          activeSection === 'contact'
                            ? 'text-[#0B3B24] dark:text-emerald-300'
                            : 'text-[#14221A] dark:text-white'
                        )}
                      >
                        {isLandlord ? 'Contact & next of kin' : 'Contact & guardian'}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {formData.guardianName
                          ? isLandlord
                            ? '1 backup contact added'
                            : '1 contact added'
                          : isLandlord
                          ? 'No backup contact added'
                          : 'No guardian added'}
                      </p>
                    </div>
                  </div>
                  {formData.guardianName && (
                    <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </button>

                {/* Item 3: Business & payouts (Landlord) OR Academic details (Tenant) */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('academic');
                    academicRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                  className={clsx(
                    'w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition cursor-pointer relative',
                    activeSection === 'academic'
                      ? 'bg-[#DCFCE7] dark:bg-emerald-950/60 before:content-[""] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-[#0B3B24] dark:before:bg-emerald-400'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isLandlord ? (
                      <Building2
                        className={clsx(
                          'w-5 h-5 shrink-0 stroke-[1.9]',
                          activeSection === 'academic'
                            ? 'text-[#0B3B24] dark:text-emerald-400'
                            : 'text-zinc-700 dark:text-zinc-300'
                        )}
                      />
                    ) : (
                      <GraduationCap
                        className={clsx(
                          'w-5 h-5 shrink-0 stroke-[1.9]',
                          activeSection === 'academic'
                            ? 'text-[#0B3B24] dark:text-emerald-400'
                            : 'text-zinc-700 dark:text-zinc-300'
                        )}
                      />
                    )}
                    <div className="min-w-0">
                      <p
                        className={clsx(
                          'text-[13px] font-extrabold truncate',
                          activeSection === 'academic'
                            ? 'text-[#0B3B24] dark:text-emerald-300'
                            : 'text-[#14221A] dark:text-white'
                        )}
                      >
                        {isLandlord ? 'Business & payouts' : 'Academic details'}
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {isLandlord
                          ? `${formData.hostEntityType || 'Individual Host'} • ${formData.payoutProvider || 'MoMo / Bank'}`
                          : isStudent
                          ? `${formData.campus ? formData.campus.split(' ')[0] : 'Student'} • ${displayLevelShort}`
                          : 'General resident'}
                      </p>
                    </div>
                  </div>
                  {(isLandlord ? isHostDeedVerified || Boolean(formData.payoutAccountNumber) : isStudent) && (
                    <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}
                </button>

                {/* Item 4: Security & sessions */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection('security');
                    securityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                  className={clsx(
                    'w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left transition cursor-pointer relative',
                    activeSection === 'security'
                      ? 'bg-[#DCFCE7] dark:bg-emerald-950/60 before:content-[""] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-[#0B3B24] dark:before:bg-emerald-400'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Lock
                      className={clsx(
                        'w-5 h-5 shrink-0 stroke-[1.9]',
                        activeSection === 'security'
                          ? 'text-[#0B3B24] dark:text-emerald-400'
                          : 'text-zinc-700 dark:text-zinc-300'
                      )}
                    />
                    <div className="min-w-0">
                      <p
                        className={clsx(
                          'text-[13px] font-extrabold truncate',
                          activeSection === 'security'
                            ? 'text-[#0B3B24] dark:text-emerald-300'
                            : 'text-[#14221A] dark:text-white'
                        )}
                      >
                        Security &amp; sessions
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                        {twoFactorStatus?.twoFactorEnabled ? '2FA enabled' : '2FA disabled'}
                      </p>
                    </div>
                  </div>
                  {twoFactorStatus?.twoFactorEnabled ? (
                    <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="2FA recommended" />
                  )}
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
              CENTER COLUMN (6 COLS): Personal Info + Contact + Business/Academic
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 flex flex-col gap-4 justify-between">
            {/* ── Card 1: Personal information ── */}
            <div
              ref={personalRef}
              className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5"
            >
              <div className="pb-2.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-[#0B3B24] dark:text-emerald-400 stroke-[2.2]" />
                    <h2 className="text-[16px] font-extrabold text-[#14221A] dark:text-white">
                      Personal information
                    </h2>
                  </div>
                  <p className="text-xs text-[#516056] dark:text-zinc-400 mt-0.5">
                    {isLocked
                      ? isLandlord
                        ? 'Verified landlord identity credentials (Read-only).'
                        : 'Verified tenant identity credentials (Read-only).'
                      : 'Update your personal details when necessary.'}
                  </p>
                </div>
                {isLocked && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded-full shadow-2xs">
                    <Lock className="w-3 h-3 text-zinc-500 dark:text-zinc-400" /> Read-only
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-0.5">
                {/* First name */}
                <div>
                  <label className="block text-xs font-bold text-[#1E2E24] dark:text-zinc-200 mb-1">
                    First name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[13px] font-semibold text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 disabled:border-zinc-200 dark:disabled:border-zinc-700 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Other names */}
                <div>
                  <label className="block text-xs font-bold text-[#1E2E24] dark:text-zinc-200 mb-1">
                    Other names
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={formData.otherNames}
                    onChange={(e) => setFormData({ ...formData, otherNames: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[13px] font-semibold text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 disabled:border-zinc-200 dark:disabled:border-zinc-700 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Last name */}
                <div>
                  <label className="block text-xs font-bold text-[#1E2E24] dark:text-zinc-200 mb-1">
                    Last name <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[13px] font-semibold text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 disabled:border-zinc-200 dark:disabled:border-zinc-700 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-xs font-bold text-[#1E2E24] dark:text-zinc-200 mb-1">
                    Gender <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#4C5C52] dark:text-zinc-400 pointer-events-none font-bold">
                      ♂
                    </span>
                    <select
                      disabled={isLocked}
                      value={formData.gender || 'MALE'}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full h-10 pl-7 pr-8 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[13px] font-semibold text-zinc-900 dark:text-white appearance-none focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 disabled:border-zinc-200 dark:disabled:border-zinc-700 disabled:cursor-not-allowed"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#5A6A60] dark:text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Date of birth */}
                <div>
                  <label className="block text-xs font-bold text-[#1E2E24] dark:text-zinc-200 mb-1">
                    Date of birth <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-[#5A6A60] dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      disabled={isLocked}
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full h-10 pl-8 pr-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[13px] font-semibold text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 disabled:border-zinc-200 dark:disabled:border-zinc-700 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Nationality */}
                <div>
                  <label className="block text-xs font-bold text-[#1E2E24] dark:text-zinc-200 mb-1">
                    Nationality <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Globe className="w-3.5 h-3.5 text-[#5A6A60] dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      disabled={isLocked}
                      value={formData.nationality || 'Ghanaian'}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full h-10 pl-8 pr-8 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[13px] font-semibold text-zinc-900 dark:text-white appearance-none focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 disabled:border-zinc-200 dark:disabled:border-zinc-700 disabled:cursor-not-allowed"
                    >
                      <option value="Ghanaian">Ghanaian</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Nigerian">Nigerian</option>
                      <option value="Ivorian">Ivorian</option>
                      <option value="Togolese">Togolese</option>
                      <option value="International">International</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-[#5A6A60] dark:text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Card 2: Contact & emergency contact / Next of kin ── */}
            <div
              ref={contactRef}
              className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Left 8 cols: Contact inputs */}
                <div className="md:col-span-8 space-y-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-[#0B3B24] dark:text-emerald-400 stroke-[2.2]" />
                      <h2 className="text-[15.5px] font-extrabold text-[#14221A] dark:text-white">
                        {isLandlord ? 'Contact & next of kin' : 'Contact & emergency contact'}
                      </h2>
                    </div>
                    <p className="text-xs text-[#516056] dark:text-zinc-400 mt-0.5">
                      {isLandlord
                        ? 'Primary landlord phone, email, and backup property contact.'
                        : 'Keep your contact details up to date.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Phone number */}
                    <div>
                      <label className="block text-xs font-bold text-[#1E2E24] dark:text-zinc-200 mb-1">
                        Phone number <span className="text-rose-600">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-[#5A6A60] dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="tel"
                          disabled={isLocked}
                          value={formData.phoneNumber}
                          onChange={(e) =>
                            setFormData({ ...formData, phoneNumber: e.target.value })
                          }
                          className="w-full h-10 pl-8 pr-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[13px] font-semibold text-zinc-900 dark:text-white focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 disabled:border-zinc-200 dark:disabled:border-zinc-700 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Email address */}
                    <div>
                      <label className="block text-xs font-bold text-[#1E2E24] dark:text-zinc-200 mb-1">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-[#5A6A60] dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="email"
                          disabled
                          value={formData.email}
                          className="w-full h-10 pl-8 pr-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[13px] font-semibold text-zinc-900 dark:text-white disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 disabled:border-zinc-200 dark:disabled:border-zinc-700 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 4 cols: Mint-green Next of Kin / Guardian Card */}
                <div className="md:col-span-4">
                  <button
                    type="button"
                    onClick={() => setGuardianModalOpen(true)}
                    title={
                      isLocked
                        ? `View ${isLandlord ? 'next of kin' : 'guardian'} details (Read-only)`
                        : `Click to update ${isLandlord ? 'next of kin' : 'guardian'} details`
                    }
                    className="w-full text-left p-3.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-50 border border-emerald-200/80 dark:bg-emerald-950/20 dark:border-emerald-800/40 flex items-center gap-3 transition cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-[#15803D] dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 fill-[#15803D] dark:fill-emerald-400" />
                    </div>
                    <div className="min-w-0 space-y-0.5 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-extrabold text-[#14221A] dark:text-white">
                          {isLandlord ? 'Next of Kin' : 'Guardian'}
                        </p>
                        {isLocked && (
                          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-2xs">
                            <Lock className="w-2.5 h-2.5" /> Read-only
                          </span>
                        )}
                      </div>
                      <p className="text-[11.5px] text-zinc-700 dark:text-zinc-300 truncate">
                        Name:{' '}
                        {formData.guardianName ? (
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {formData.guardianName}
                          </span>
                        ) : (
                          <span className="text-zinc-400 italic">Not provided</span>
                        )}
                      </p>
                      <p className="text-[11.5px] text-zinc-700 dark:text-zinc-300 truncate">
                        Phone:{' '}
                        {formData.guardianPhone ? (
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {formData.guardianPhone}
                          </span>
                        ) : (
                          <span className="text-zinc-400 italic">Not provided</span>
                        )}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Card 3: Business, Tax & Payout Profile (Landlord) OR Academic Profile (Tenant) ── */}
            {isLandlord ? (
              <div
                ref={academicRef}
                className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#0B3B24] dark:text-emerald-400 stroke-[2.2]" />
                      <h2 className="text-[15.5px] font-extrabold text-[#14221A] dark:text-white">
                        Business, tax &amp; payout profile
                      </h2>
                    </div>
                    <p className="text-xs text-[#516056] dark:text-zinc-400 mt-0.5">
                      Your property management entity, GRA tax compliance, and rent payout account.
                    </p>
                  </div>
                  {isLocked && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded-full shadow-2xs">
                      <Lock className="w-3 h-3 text-zinc-500 dark:text-zinc-400" /> Read-only
                    </span>
                  )}
                </div>

                <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                  {/* Left: Host Icon + Entity Name & Region */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 shrink-0 shadow-2xs flex items-center justify-center text-[#0B3B24] dark:text-emerald-400">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold text-[#14221A] dark:text-white truncate">
                        {formData.businessName ||
                          `${formData.firstName || 'Landlord'} ${formData.lastName || ''} Properties`.trim()}
                      </p>
                      <p className="text-xs text-[#4A5A50] dark:text-zinc-400 font-medium truncate">
                        {`${formData.hostEntityType || 'Individual Landlord'} • ${formData.primaryRegion || 'Greater Accra Region'}`}
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:block h-8 w-px bg-zinc-200 dark:bg-zinc-800" />

                  {/* Middle: Payout Account */}
                  <div>
                    <p className="text-xs font-extrabold text-[#14221A] dark:text-white flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-[#15803D]" />
                      <span>{formData.payoutProvider || 'MTN Mobile Money'}</span>
                    </p>
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-mono mt-0.5">
                      {formData.payoutAccountNumber || formData.phoneNumber || 'Not configured'}
                    </p>
                  </div>

                  {/* Right: Edit Business & Payouts Pill Button */}
                  <button
                    type="button"
                    onClick={() => setAcademicModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-[#116932] dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-400"
                  >
                    <span className="w-4 h-4 rounded-full bg-[#16A34A] text-white inline-flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                    <span>{isLocked ? 'View business & payouts' : 'Manage business & payouts'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                ref={academicRef}
                className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-[#0B3B24] dark:text-emerald-400 stroke-[2.2]" />
                      <h2 className="text-[15.5px] font-extrabold text-[#14221A] dark:text-white">
                        Academic profile
                      </h2>
                    </div>
                    <p className="text-xs text-[#516056] dark:text-zinc-400 mt-0.5">
                      {isStudent
                        ? isLocked
                          ? 'Institutional tenancy verification (Read-only).'
                          : 'Your university and academic information.'
                        : 'General resident profile (no student affiliation).'}
                    </p>
                  </div>
                  {isLocked && isStudent && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded-full shadow-2xs">
                      <Lock className="w-3 h-3 text-zinc-500 dark:text-zinc-400" /> Read-only
                    </span>
                  )}
                </div>

                <div className="pt-1 flex flex-wrap items-center justify-between gap-3">
                  {/* Left: Crest / Icon + Campus & Programme */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 relative overflow-hidden shrink-0 shadow-2xs flex items-center justify-center">
                      {isStudent ? (
                        <Image
                          src="/images/settings/ucc-crest.png"
                          alt="University Crest"
                          fill
                          sizes="40px"
                          className="object-contain p-0.5"
                        />
                      ) : (
                        <User className="w-5 h-5 text-[#0B3B24] dark:text-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold text-[#14221A] dark:text-white truncate">
                        {isStudent
                          ? formData.campus || 'Institution not specified'
                          : 'General Resident Profile'}
                      </p>
                      <p className="text-xs text-[#4A5A50] dark:text-zinc-400 font-medium truncate">
                        {isStudent
                          ? `${formData.programmeOfStudy || 'Programme not specified'} • ${displayLevelShort}`
                          : 'Residential tenancy without institutional affiliation'}
                      </p>
                    </div>
                  </div>

                  <div className="hidden sm:block h-8 w-px bg-zinc-200 dark:bg-zinc-800" />

                  {/* Middle: Student ID */}
                  <div>
                    <p className="text-xs font-extrabold text-[#14221A] dark:text-white">Student ID</p>
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 font-mono mt-0.5">
                      {isStudent ? formData.studentId || 'Not provided' : 'N/A'}
                    </p>
                  </div>

                  {/* Right: Student status verified or general resident pill button */}
                  <button
                    type="button"
                    onClick={() => setAcademicModalOpen(true)}
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer border',
                      isStudent
                        ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-[#116932] dark:bg-emerald-950/30 dark:border-emerald-800/50 dark:text-emerald-400'
                        : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                    )}
                  >
                    <span
                      className={clsx(
                        'w-4 h-4 rounded-full text-white inline-flex items-center justify-center',
                        isStudent ? 'bg-[#16A34A]' : 'bg-zinc-400'
                      )}
                    >
                      {isStudent ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <User className="w-2.5 h-2.5" />}
                    </span>
                    <span>
                      {isStudent
                        ? isLocked
                          ? 'Student verified (Read-only)'
                          : 'Student status verified'
                        : 'Non-student profile'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT COLUMN (3 COLS): Identity protection + Account security
             ══════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-3 flex flex-col gap-4 justify-between">
            {/* ── Card 1: Identity protection + Role-Specific Bottom Row ── */}
            <div className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
              {/* Header Bar */}
              <div
                className={clsx(
                  'text-white px-4 py-3 flex items-center gap-2.5 transition-colors',
                  isLocked ? 'bg-[#16A34A]' : 'bg-[#15803D]'
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
              <div className="p-4 flex flex-col items-center text-center space-y-3 border-b border-zinc-200 dark:border-zinc-800">
                <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium leading-relaxed text-left w-full">
                  {isLocked
                    ? isLandlord
                      ? 'Your verified landlord identity details are locked for your security and property host integrity.'
                      : 'Your verified identity details are locked for your security and tenancy integrity.'
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
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center my-0.5 text-[#1B5E20] dark:text-emerald-400 shadow-2xs">
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
                      className="w-full py-2 px-3.5 rounded-full bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[#116932] dark:text-emerald-400 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Request edit access</span>
                    </button>
                  )
                ) : (
                  <div className="w-full py-2 px-3.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[#1B5E20] dark:text-emerald-400 text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32] dark:text-emerald-400" />
                    <span>Edit access active</span>
                  </div>
                )}
              </div>

              {/* Bottom Status Row: Host & Title Deed Status (Landlord) OR Student Status Toggle (Tenant) */}
              {isLandlord ? (
                <div className="p-4 flex items-start justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Building2 className="w-5 h-5 text-[#0B3B24] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold text-[#14221A] dark:text-white">
                        Host &amp; deed status
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                        {isHostDeedVerified
                          ? 'National ID and property title deed certified.'
                          : 'Submit your property deed in Verification to certify listings.'}
                      </p>
                    </div>
                  </div>

                  {isHostDeedVerified ? (
                    <span className="px-2.5 py-1 rounded-full bg-[#DCFCE7] text-[#15803D] text-[11px] font-bold shrink-0 inline-flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" />
                      Verified
                    </span>
                  ) : (
                    <Link
                      href="/dashboard/verification"
                      className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 transition"
                    >
                      Verify
                    </Link>
                  )}
                </div>
              ) : (
                <div className="p-4 flex items-start justify-between gap-3 bg-zinc-50/70 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <GraduationCap className="w-5 h-5 text-[#0B3B24] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold text-[#14221A] dark:text-white">
                        Student status
                      </p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
                        {isLocked
                          ? 'Student status verified and locked by institution.'
                          : 'Toggle whether you are registering as a tertiary student.'}
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
              )}
            </div>

            {/* ── Card 2: Account security ── */}
            <div
              ref={securityRef}
              className="bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-200 dark:border-zinc-800">
                <ShieldCheck className="w-5 h-5 text-[#0B3B24] dark:text-emerald-400 stroke-[2.2]" />
                <h2 className="text-[15.5px] font-extrabold text-[#14221A] dark:text-white">
                  Account security
                </h2>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                    <KeyRound className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
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
                  <span className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 font-semibold">
                    <Monitor className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    <span>Active Sessions</span>
                  </span>
                  <span className="font-extrabold text-zinc-900 dark:text-white">
                    {sessionLabel}
                  </span>
                </div>
              </div>

              <div className="pt-1 flex justify-center">
                <button
                  type="button"
                  onClick={() => setSecurityModalOpen(true)}
                  className="text-xs font-extrabold text-[#116932] dark:text-emerald-400 hover:text-[#0B3B24] dark:hover:text-emerald-300 inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>Manage security</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── 4. BOTTOM ACTION BAR: DISCARD CHANGES & SAVE CHANGES ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800 mt-2">
          {/* Status Note */}
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {isLocked ? (
              isUnlockRequested ? (
                <>
                  <Clock className="w-4 h-4 text-[#D97706] shrink-0 animate-pulse" />
                  <span>Unlock request submitted and awaiting admin approval.</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>Your profile is locked and read-only. Request edit access to make changes.</span>
                </>
              )
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
                className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs sm:text-[13px] font-bold inline-flex items-center gap-2 shadow-2xs transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                <span>Discard changes</span>
              </button>
            )}

            {!isLocked ? (
              <button
                type="button"
                onClick={() => handleSaveChanges()}
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-60 text-white text-xs sm:text-[13px] font-bold inline-flex items-center gap-2 shadow-sm transition cursor-pointer"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save changes</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : !isUnlockRequested ? (
              <button
                type="button"
                onClick={() => setRequestModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-[13px] font-bold inline-flex items-center gap-2 shadow-xs transition cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Request profile changes</span>
              </button>
            ) : null}
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
              {isLandlord
                ? 'Your verified landlord identity details are locked to protect property host records. Please state what information you need to update (for example, name correction, payout account, or next of kin).'
                : 'Your verified identity details are locked to protect your tenancy records. Please state what information you need to update (for example, name correction or emergency guardian contact).'}
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
                className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
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
          MODAL 2: NEXT OF KIN (LANDLORD) OR GUARDIAN (TENANT) EDIT MODAL
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
                  {isLandlord ? 'Next of Kin & Backup Contact' : 'Guardian & Emergency Contact'}
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
                    {isLandlord
                      ? "Backup contacts are linked to your landlord host agreement. Click 'Request profile changes' to modify."
                      : "Emergency contacts are linked to your tenancy agreement. Click 'Request profile changes' to modify."}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {isLandlord ? 'Next of Kin / Backup Contact Name' : 'Guardian / Next of Kin Name'}
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={formData.guardianName}
                  onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                  placeholder={isLandlord ? 'Enter next of kin full name' : 'Mr. Darko'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-300 text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  {isLandlord ? 'Next of Kin Phone Number' : 'Guardian Emergency Phone'}
                </label>
                <input
                  type="tel"
                  disabled={isLocked}
                  value={formData.guardianPhone}
                  onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                  placeholder="024xxxxxxx"
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
                  className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg cursor-pointer"
                >
                  {isLandlord ? 'Save Next of Kin' : 'Save Guardian Details'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 3: BUSINESS & PAYOUT MODAL (LANDLORD) OR ACADEMIC MODAL (TENANT)
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
                {isLandlord ? (
                  <Building2 className="w-5 h-5 text-[#15803D]" />
                ) : (
                  <GraduationCap className="w-5 h-5 text-[#15803D]" />
                )}
                <h3 className="text-base font-extrabold text-zinc-900">
                  {isLandlord
                    ? 'Business, Tax & Payout Settlement'
                    : 'Academic Profile & University Credentials'}
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
                  <p className="font-bold">
                    {isLandlord
                      ? 'Host & settlement records locked'
                      : 'Student records verified & locked'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#A15C07]">
                    {isLandlord
                      ? 'Your business and payout details are locked for financial security. Request profile changes to update.'
                      : 'Institution details are locked for student accommodation clearance. Contact an administrator to update.'}
                  </p>
                </div>
              </div>
            )}

            {isLandlord ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Business / Host Display Name
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g. Darko Estates & Properties"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 font-semibold text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Host Entity Type</label>
                  <select
                    disabled={isLocked}
                    value={formData.hostEntityType}
                    onChange={(e) => setFormData({ ...formData, hostEntityType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 font-semibold text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed"
                  >
                    <option value="Individual Landlord">Individual Landlord</option>
                    <option value="Registered Property Company">Registered Property Company</option>
                    <option value="Real Estate Agency">Real Estate Agency</option>
                    <option value="Hostel / Hall Management">Hostel / Hall Management</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Primary Operating Region
                  </label>
                  <select
                    disabled={isLocked}
                    value={formData.primaryRegion}
                    onChange={(e) => setFormData({ ...formData, primaryRegion: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 font-semibold text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed"
                  >
                    <option value="Greater Accra Region">Greater Accra Region</option>
                    <option value="Ashanti Region">Ashanti Region</option>
                    <option value="Central Region">Central Region</option>
                    <option value="Eastern Region">Eastern Region</option>
                    <option value="Western Region">Western Region</option>
                    <option value="Northern Region">Northern Region</option>
                    <option value="Volta Region">Volta Region</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">GRA TIN Number</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={formData.tinNumber}
                    onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                    placeholder="P00XXXXXXXX"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 font-mono font-semibold text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Payout Provider / Bank
                  </label>
                  <select
                    disabled={isLocked}
                    value={formData.payoutProvider}
                    onChange={(e) => setFormData({ ...formData, payoutProvider: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 font-semibold text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed"
                  >
                    <option value="MTN Mobile Money">MTN Mobile Money</option>
                    <option value="Telecel Cash">Telecel Cash</option>
                    <option value="AT Money">AT Money</option>
                    <option value="GCB Bank">GCB Bank</option>
                    <option value="Ecobank Ghana">Ecobank Ghana</option>
                    <option value="Fidelity Bank">Fidelity Bank</option>
                    <option value="Stanbic Bank">Stanbic Bank</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Payout Account / MoMo Number
                  </label>
                  <input
                    type="text"
                    disabled={isLocked}
                    value={formData.payoutAccountNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, payoutAccountNumber: e.target.value })
                    }
                    placeholder="024XXXXXXX"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-300 font-mono font-semibold text-zinc-900 disabled:bg-zinc-100 disabled:text-zinc-500 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            ) : (
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
            )}

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
                  className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg cursor-pointer"
                >
                  {isLandlord ? 'Save Business & Payouts' : 'Save Academic Profile'}
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
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                  {isLandlord
                    ? 'Protect your property listings, payouts, and landlord account with authenticator codes.'
                    : 'Protect your tenancy agreements and account with authenticator codes.'}
                </p>
              </div>
              <Link
                href="/dashboard/profile/security/2fa"
                className="px-3.5 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
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
                className="px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold cursor-pointer transition shadow-2xs"
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
