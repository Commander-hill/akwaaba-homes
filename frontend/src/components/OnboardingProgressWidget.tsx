'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, AlertCircle, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

interface UserSession {
  role?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  gender?: string;
  dateOfBirth?: string;
  nationality?: string;
  guardianName?: string;
  guardianPhone?: string;
  ghanaCardStatus?: string;
  campus?: string;
  studentId?: string;
}

interface OnboardingProgressWidgetProps {
  user: UserSession | null | undefined;
  hasProperty?: boolean;
}

export default function OnboardingProgressWidget({ user, hasProperty = false }: OnboardingProgressWidgetProps) {
  if (!user) return null;

  const isTenant = user.role === 'TENANT';

  // Profile check
  const requiredProfileFields = isTenant
    ? ['firstName', 'lastName', 'phoneNumber', 'gender', 'dateOfBirth', 'nationality', 'guardianName', 'guardianPhone', 'campus', 'studentId']
    : ['firstName', 'lastName', 'phoneNumber', 'gender', 'dateOfBirth', 'nationality', 'guardianName', 'guardianPhone'];

  const isProfileComplete = requiredProfileFields.every(
    field => user[field as keyof UserSession] && String(user[field as keyof UserSession]).trim() !== ''
  );

  // Verification check
  const isVerificationSubmitted = user.ghanaCardStatus && user.ghanaCardStatus !== 'NOT_SUBMITTED';
  const isVerificationVerified = user.ghanaCardStatus === 'VERIFIED';

  // Calculate percentage
  let completedSteps = 1; // Account created is step 1
  const totalSteps = isTenant ? 3 : 4;

  if (isProfileComplete) completedSteps += 1;
  if (isVerificationSubmitted) completedSteps += 1;
  if (!isTenant && hasProperty) completedSteps += 1;

  const percentage = Math.round((completedSteps / totalSteps) * 100);

  if (percentage === 100) return null; // Hide widget once 100% complete!

  return (
    <div className="glass-card rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-amber-50/20 dark:from-indigo-950/20 dark:via-purple-950/20 dark:to-amber-950/10 shadow-sm space-y-4 mb-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md">
            {percentage}%
          </div>
          <div>
            <h3 className="font-extrabold text-base text-[var(--foreground)] flex items-center gap-2">
              Setup & Verification Progress
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold">
                Action Required
              </span>
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Complete your account setup to unlock booking and listing features.
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full sm:w-48 bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${!isTenant ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 pt-2 border-t border-[var(--border)]`}>
        {/* Step 1: Account Created */}
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Account Created</span>
        </div>

        {/* Step 2: Profile & Gender */}
        {isProfileComplete ? (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Profile & Gender Completed</span>
          </div>
        ) : (
          <Link
            href="/dashboard/profile"
            className="flex items-center justify-between gap-2 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Complete Profile & Gender</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}

        {/* Step 3: Ghana Card */}
        {isVerificationSubmitted ? (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Identity Verification {isVerificationVerified ? 'Verified' : 'Submitted'}</span>
          </div>
        ) : (
          <Link
            href="/dashboard/verification"
            className="flex items-center justify-between gap-2 text-xs font-bold text-purple-800 dark:text-purple-300 bg-purple-50/90 dark:bg-purple-950/40 p-2.5 rounded-xl border border-purple-200 dark:border-purple-900/50 hover:bg-purple-100 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-purple-500 shrink-0" />
              <span>Submit Ghana Card</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}

        {/* Step 4: Publish First Listing (Landlords only) */}
        {!isTenant && (
          hasProperty ? (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>First Listing Published</span>
            </div>
          ) : (
            <Link
              href="/dashboard/landlord/new"
              className="flex items-center justify-between gap-2 text-xs font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-50/90 dark:bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-100 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Circle className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Publish First Listing</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )
        )}
      </div>
    </div>
  );
}
