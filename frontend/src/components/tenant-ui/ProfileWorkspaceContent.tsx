'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
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
  User,
  Check,
  GraduationCap,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useDialog } from '@/providers/DialogProvider';
import AlertBanner from '@/components/AlertBanner';
import { StatusBadge } from '@/components/tenant-ui/primitives';

export function ProfileWorkspaceContent({
  defaultTab = 'basic',
}: {
  defaultTab?: 'basic' | 'school' | 'security';
}) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const queryClient = useQueryClient();
  const { confirm } = useDialog();
  const [activeTab, setActiveTab] = useState<'basic' | 'school' | 'security'>(
    tabParam === 'security' ? 'security' : tabParam === 'school' ? 'school' : defaultTab
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
    studentType: '',
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

  const { data: twoFactorStatus } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: async () => {
      const res = await api.get('/auth/2fa/status');
      return res.data;
    },
  });

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

  const {
    data: sessions,
    isLoading: isLoadingSessions,
    refetch: refetchSessions,
  } = useQuery({
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
        studentType: session.studentType || '',
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
      setMessage({ text: 'Profile updated successfully.', type: 'success' });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || 'Failed to update profile';
      setMessage({ text: errMsg, type: 'error' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onSettled: () => {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 6000);
    },
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

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-7 h-7 animate-spin text-[#173D32]" />
      </div>
    );
  }

  const isLocked = !!session?.isProfileLocked && session?.role !== 'ADMIN';
  const inputClass =
    'w-full h-11 bg-white dark:bg-[#111513] border border-[#D4D6CE] dark:border-[#2E3832] rounded-[10px] px-3.5 text-sm text-[#242925] dark:text-white outline-none focus:border-[#173D32] focus:ring-2 focus:ring-[#173D32]/20 disabled:bg-[#F8F7F2] dark:disabled:bg-[#141916] disabled:opacity-75 disabled:cursor-not-allowed transition-colors';
  const labelClass =
    'block text-[13px] font-medium text-[#242925] dark:text-[#E5E7E4] mb-1.5';

  return (
    <div className="max-w-4xl mx-auto pb-16 space-y-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E7E7DF] dark:border-[#262E29]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#557A67] dark:text-[#86B59C] mb-1">
            Account &amp; Preferences
          </p>
          <h1 className="font-editorial text-2xl sm:text-3xl text-[#242925] dark:text-white">
            Profile &amp; Settings
          </h1>
          <p className="text-sm text-[#5E645E] dark:text-[#A0A8A2] mt-1">
            Manage your personal details, academic verification, and account security.
          </p>
        </div>

        {activeTab !== 'security' && (
          <>
            {!isLocked ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-medium rounded-[10px] shadow-xs transition-colors disabled:opacity-60 cursor-pointer self-start sm:self-auto"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Changes</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {session?.profileUnlockRequested ? (
                  <StatusBadge tone="warning">Edit Request Pending</StatusBadge>
                ) : (
                  <button
                    type="button"
                    onClick={() => setRequestModalOpen(true)}
                    className="bg-[#16A34A] hover:bg-[#15803D] text-white text-xs sm:text-sm font-medium px-4 py-2.5 rounded-[10px] transition-colors cursor-pointer"
                  >
                    Request Edit Access
                  </button>
                )}
                <StatusBadge tone="neutral">
                  <Lock className="w-3 h-3" />
                  <span>Locked (Verified Identity)</span>
                </StatusBadge>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── PROFILE SUMMARY CARD ── */}
      <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[#173D32] text-white flex items-center justify-center text-xl font-semibold shrink-0 overflow-hidden">
            {formData.avatarUrl ? (
              <img
                src={formData.avatarUrl}
                alt={`${formData.firstName} ${formData.lastName}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>
                {formData.firstName?.[0] || 'R'}
                {formData.lastName?.[0] || ''}
              </span>
            )}
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-editorial text-xl sm:text-2xl text-[#242925] dark:text-white truncate">
                {formData.firstName} {formData.otherNames} {formData.lastName}
              </h2>
              <StatusBadge tone="success">
                <Check className="w-3 h-3" />
                <span>{session?.role || 'TENANT'}</span>
              </StatusBadge>
            </div>

            <div className="flex items-center gap-3 text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2] flex-wrap">
              <span className="font-medium text-[#242925] dark:text-[#E5E7E4]">
                {formData.email}
              </span>
              <span>•</span>
              <span>{formData.phoneNumber || 'No phone number'}</span>
              <span>•</span>
              <span>{formData.nationality || 'Ghanaian'}</span>
            </div>
          </div>
        </div>

        {isLocked && (
          <div className="mt-5 pt-4 border-t border-[#E7E7DF] dark:border-[#262E29] flex items-start gap-2.5 text-xs text-[#5E645E] dark:text-[#A0A8A2]">
            <Lock className="w-4 h-4 text-[#557A67] mt-0.5 shrink-0" />
            <p className="leading-relaxed">
              {session?.profileUnlockRequested ? (
                <>
                  Your unlock request is currently under review:{' '}
                  <strong className="text-[#242925] dark:text-white">
                    &ldquo;{session.profileUnlockReason}&rdquo;
                  </strong>
                  . An administrator will review your requested modifications.
                </>
              ) : (
                <>
                  Verified identity details are locked to protect your tenancy records. To update locked fields, click &ldquo;Request Edit Access&rdquo; above.
                </>
              )}
            </p>
          </div>
        )}
      </div>

      {message && (
        <AlertBanner
          type={message.type}
          message={message.text}
          onClose={() => setMessage(null)}
        />
      )}

      {/* ── WORKSPACE TABS ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('basic')}
          className={clsx(
            'px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
            activeTab === 'basic'
              ? 'bg-[#173D32] text-white shadow-xs'
              : 'bg-white dark:bg-[#171C19] text-[#5E645E] dark:text-[#A0A8A2] border border-[#E7E7DF] dark:border-[#262E29] hover:text-[#242925] dark:hover:text-white'
          )}
        >
          <User className="w-4 h-4" />
          <span>Personal Information</span>
        </button>

        {isStudent && (
          <button
            type="button"
            onClick={() => setActiveTab('school')}
            className={clsx(
              'px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
              activeTab === 'school'
                ? 'bg-[#173D32] text-white shadow-xs'
                : 'bg-white dark:bg-[#171C19] text-[#5E645E] dark:text-[#A0A8A2] border border-[#E7E7DF] dark:border-[#262E29] hover:text-[#242925] dark:hover:text-white'
            )}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Academic Details</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={clsx(
            'px-4 py-2 text-xs sm:text-sm font-medium rounded-full transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap',
            activeTab === 'security'
              ? 'bg-[#173D32] text-white shadow-xs'
              : 'bg-white dark:bg-[#171C19] text-[#5E645E] dark:text-[#A0A8A2] border border-[#E7E7DF] dark:border-[#262E29] hover:text-[#242925] dark:hover:text-white'
          )}
        >
          <Lock className="w-4 h-4" />
          <span>Security &amp; Sessions</span>
        </button>
      </div>

      {/* Student Toggle for Tenants */}
      {session?.role === 'TENANT' && activeTab === 'basic' && (
        <div className="flex items-center justify-between bg-white dark:bg-[#171C19] p-4 sm:p-5 rounded-[16px] border border-[#E7E7DF] dark:border-[#262E29]">
          <div>
            <h3 className="text-sm font-semibold text-[#242925] dark:text-white">
              University / Tertiary Student Status
            </h3>
            <p className="text-xs text-[#5E645E] dark:text-[#A0A8A2] mt-0.5">
              Enable student identification for campus hostel allocations
            </p>
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
            <div className="w-11 h-6 bg-[#D4D6CE] peer-focus:outline-none rounded-full peer dark:bg-[#2E3832] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#173D32]" />
          </label>
        </div>
      )}

      {/* ── FORMS CONTAINER ── */}
      {activeTab !== 'security' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {activeTab === 'basic' && (
            <>
              <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-6 shadow-2xs space-y-4">
                <h3 className="font-editorial text-lg text-[#242925] dark:text-white border-b border-[#E7E7DF] dark:border-[#262E29] pb-3">
                  Personal Identity
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>First Name *</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      className={inputClass}
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="First name"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Other Name(s)</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      className={inputClass}
                      value={formData.otherNames}
                      onChange={(e) => setFormData({ ...formData, otherNames: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Last Name *</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      className={inputClass}
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="Last name"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Gender *</label>
                    <select
                      disabled={isLocked}
                      className={inputClass}
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="">Select gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Date of Birth *</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      className={inputClass}
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      placeholder="YYYY-MM-DD"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Nationality *</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      className={inputClass}
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      placeholder="Ghanaian"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-6 shadow-2xs space-y-4">
                <h3 className="font-editorial text-lg text-[#242925] dark:text-white border-b border-[#E7E7DF] dark:border-[#262E29] pb-3">
                  Contact &amp; Emergency Guardian
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Mobile Phone Number *</label>
                    <input
                      type="tel"
                      disabled={isLocked}
                      className={inputClass}
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      placeholder="024XXXXXXX"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Registered Email Address</label>
                    <input
                      type="email"
                      disabled
                      className={inputClass}
                      value={formData.email}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Guardian / Next of Kin Name</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      className={inputClass}
                      value={formData.guardianName}
                      onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Guardian Emergency Phone</label>
                    <input
                      type="tel"
                      disabled={isLocked}
                      className={inputClass}
                      value={formData.guardianPhone}
                      onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                      placeholder="024XXXXXXX"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'school' && (
            <div className="bg-white dark:bg-[#171C19] border border-[#E7E7DF] dark:border-[#262E29] rounded-[16px] p-6 shadow-2xs space-y-4">
              <h3 className="font-editorial text-lg text-[#242925] dark:text-white border-b border-[#E7E7DF] dark:border-[#262E29] pb-3">
                Campus Affiliation &amp; Academic Credentials
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Campus / University *</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    className={inputClass}
                    value={formData.campus}
                    onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                    placeholder="KNUST, UG, UCC, etc."
                  />
                </div>

                <div>
                  <label className={labelClass}>Student ID / Index No. *</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    className={inputClass}
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    placeholder="Student ID"
                  />
                </div>

                <div>
                  <label className={labelClass}>Date of Admission</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    className={inputClass}
                    value={formData.dateOfAdmission}
                    onChange={(e) =>
                      setFormData({ ...formData, dateOfAdmission: e.target.value })
                    }
                    placeholder="YYYY-MM-DD"
                  />
                </div>

                <div>
                  <label className={labelClass}>Programme of Study</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    className={inputClass}
                    value={formData.programmeOfStudy}
                    onChange={(e) =>
                      setFormData({ ...formData, programmeOfStudy: e.target.value })
                    }
                    placeholder="e.g. Computer Science"
                  />
                </div>

                <div>
                  <label className={labelClass}>Academic Level</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    className={inputClass}
                    value={formData.yearOfStudy}
                    onChange={(e) => setFormData({ ...formData, yearOfStudy: e.target.value })}
                    placeholder="Level 300"
                  />
                </div>

                <div>
                  <label className={labelClass}>Student Category</label>
                  <input
                    type="text"
                    disabled={isLocked}
                    className={inputClass}
                    value={formData.studentType}
                    onChange={(e) => setFormData({ ...formData, studentType: e.target.value })}
                    placeholder="Undergraduate / Postgraduate"
                  />
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Security & Active Devices Tab Panel */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Password Recovery & Update Card */}
          <div className="bg-white dark:bg-[#171C19] rounded-[16px] p-6 border border-[#E7E7DF] dark:border-[#262E29] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-editorial text-lg text-[#242925] dark:text-white">
                Password &amp; Recovery Credentials
              </h3>
              <p className="text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2]">
                Need to update your account password? Request a single-use cryptographic reset link to your registered email ({formData.email}).
              </p>
            </div>
            <Link
              href="/forgot-password"
              className="px-4 py-2.5 rounded-[10px] border border-[#D4D6CE] dark:border-[#2E3832] hover:bg-[#F1EFE7] dark:hover:bg-[#222925] text-xs sm:text-sm font-medium text-[#242925] dark:text-white shrink-0 transition-colors self-start sm:self-center"
            >
              Reset Password via Email
            </Link>
          </div>

          {/* Two-Factor Authentication Card */}
          <div className="bg-white dark:bg-[#171C19] rounded-[16px] p-6 border border-[#E7E7DF] dark:border-[#262E29] shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-3 rounded-[12px] shrink-0 border bg-[#ECFDF3] dark:bg-[#064E3B]/40 border-[#A7F3D0] dark:border-[#065F46] text-[#1F7A4C] dark:text-[#6EE7B7]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-editorial text-lg text-[#242925] dark:text-white">
                      Two-Factor Authentication (2FA)
                    </h3>
                    <StatusBadge
                      tone={twoFactorStatus?.twoFactorEnabled ? 'success' : 'warning'}
                    >
                      {twoFactorStatus?.twoFactorEnabled ? 'Enabled' : 'Recommended'}
                    </StatusBadge>
                  </div>
                  <p className="text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2] leading-relaxed max-w-2xl">
                    Protect your tenancy agreements and account with time-based one-time passwords (Google Authenticator, Authy, or 1Password).
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  href="/dashboard/profile/security/2fa"
                  className="bg-[#16A34A] hover:bg-[#15803D] text-white font-medium text-xs sm:text-sm px-4 py-2.5 rounded-[10px] transition-colors inline-flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>
                    {twoFactorStatus?.twoFactorEnabled ? 'Manage 2FA' : 'Configure 2FA'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {twoFactorStatus?.twoFactorEnabled && (
              <div className="pt-3 border-t border-[#E7E7DF] dark:border-[#262E29] flex items-center justify-between flex-wrap gap-2 text-xs text-[#5E645E] dark:text-[#A0A8A2]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#1F7A4C]" />
                  <span>
                    Emergency Recovery Codes remaining:{' '}
                    <strong className="text-[#242925] dark:text-white font-mono">
                      {twoFactorStatus.remainingRecoveryCodes}
                    </strong>{' '}
                    of 8
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Active Sessions List */}
          <div className="bg-white dark:bg-[#171C19] rounded-[16px] p-6 border border-[#E7E7DF] dark:border-[#262E29] shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E7DF] dark:border-[#262E29]">
              <div className="space-y-1">
                <h3 className="font-editorial text-lg text-[#242925] dark:text-white">
                  Active Authenticated Sessions ({sessions?.length || 0})
                </h3>
                <p className="text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2]">
                  Review all devices currently signed in to your account.
                </p>
              </div>

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
                disabled={
                  revokeAllOthersMutation.isPending ||
                  !sessions ||
                  sessions.filter((s: any) => !s.isCurrentSession).length === 0
                }
                className="px-4 py-2.5 rounded-[10px] border border-[#FECACA] dark:border-[#991B1B] text-[#B42318] dark:text-[#FCA5A5] hover:bg-[#FEF3F2] dark:hover:bg-[#450A0A]/40 text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer self-start sm:self-auto"
              >
                {revokeAllOthersMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                <span>Sign Out Other Devices</span>
              </button>
            </div>

            {isLoadingSessions ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#173D32]" />
              </div>
            ) : !sessions || sessions.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#5E645E]">
                No active sessions detected.
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((s: any) => {
                  const isMobile =
                    s.deviceFamily?.toLowerCase().includes('phone') ||
                    s.deviceFamily?.toLowerCase().includes('mobile');

                  return (
                    <div
                      key={s.id}
                      className={clsx(
                        'p-4 rounded-[12px] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                        s.isCurrentSession
                          ? 'bg-[#ECFDF3]/40 dark:bg-[#064E3B]/20 border-[#A7F3D0] dark:border-[#065F46]'
                          : 'bg-[#F8F7F2] dark:bg-[#111513] border-[#E7E7DF] dark:border-[#262E29]'
                      )}
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={clsx(
                            'p-2.5 rounded-[10px] shrink-0 border',
                            s.isCurrentSession
                              ? 'bg-[#173D32] text-white border-[#173D32]'
                              : 'bg-white dark:bg-[#171C19] text-[#5E645E] dark:text-[#A0A8A2] border-[#E7E7DF] dark:border-[#262E29]'
                          )}
                        >
                          {isMobile ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Laptop className="w-4 h-4" />
                          )}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-xs sm:text-sm text-[#242925] dark:text-white truncate">
                              {s.userAgent || 'Browser Session'}
                            </h4>
                            {s.isCurrentSession ? (
                              <StatusBadge tone="success">Current Device</StatusBadge>
                            ) : (
                              <StatusBadge tone="neutral">Remote Device</StatusBadge>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-[#5E645E] dark:text-[#A0A8A2] flex-wrap">
                            <span className="flex items-center gap-1 font-mono">
                              <Globe className="w-3.5 h-3.5" /> {s.ipAddress || 'Unknown IP'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Active{' '}
                              {formatDistanceToNow(new Date(s.lastActive), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!s.isCurrentSession && (
                        <button
                          type="button"
                          onClick={() => revokeSessionMutation.mutate(s.id)}
                          disabled={revokeSessionMutation.isPending}
                          className="px-3.5 py-2 text-xs font-medium text-[#B42318] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#991B1B] hover:bg-[#FEF3F2] dark:hover:bg-[#450A0A]/40 rounded-[8px] transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
                        >
                          {revokeSessionMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <LogOut className="w-3.5 h-3.5" />
                          )}
                          <span>Revoke</span>
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
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#171C19] rounded-[16px] p-6 max-w-md w-full border border-[#E7E7DF] dark:border-[#262E29] shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-editorial text-xl text-[#242925] dark:text-white">
                Request Profile Edit Access
              </h3>
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="text-[#5E645E] hover:text-[#242925] dark:hover:text-white text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[#5E645E] dark:text-[#A0A8A2] leading-relaxed">
              Your profile is locked to protect verified tenancy records. Please state what information you need to update (for example, emergency guardian phone number).
            </p>

            <div className="space-y-1.5">
              <label className={labelClass}>Reason for Modification *</label>
              <textarea
                rows={3}
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Describe what needs to be updated..."
                className="w-full p-3 text-sm bg-[#F8F7F2] dark:bg-[#111513] rounded-[10px] border border-[#D4D6CE] dark:border-[#2E3832] outline-none focus:border-[#173D32]"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-[#5E645E] dark:text-[#A0A8A2] hover:bg-[#F1EFE7] dark:hover:bg-[#222925] rounded-[10px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!requestReason.trim() || requestUnlockMutation.isPending}
                onClick={() => requestUnlockMutation.mutate(requestReason)}
                className="px-5 py-2 text-xs sm:text-sm font-medium text-white bg-[#16A34A] hover:bg-[#15803D] rounded-[10px] transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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
    </div>
  );
}
