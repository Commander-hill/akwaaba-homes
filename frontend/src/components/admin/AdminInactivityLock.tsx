'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  LogOut,
  Clock,
  ArrowRight,
  Headphones,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AdminInactivityLockProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    avatarUrl?: string | null;
  };
  children: React.ReactNode;
}

// 15 Minutes Inactivity Window pursuant to Act 843 §20
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 900,000 ms
const WARNING_THRESHOLD_MS = 60 * 1000; // 60s countdown warning before locking
const STORAGE_KEY_LAST_ACTIVE = 'akwaaba_admin_last_interaction';
const STORAGE_KEY_LOCKED = 'akwaaba_admin_workstation_locked';

export default function AdminInactivityLock({ user, children }: AdminInactivityLockProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const lastActiveRef = useRef<number>(Date.now());

  const recordActivity = useCallback(() => {
    if (isLocked) return;
    const now = Date.now();
    // Throttle writing to localStorage to once every 5 seconds
    if (now - lastActiveRef.current > 5000) {
      lastActiveRef.current = now;
      try {
        localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, now.toString());
      } catch {}
    }
  }, [isLocked]);

  const lockWorkstation = useCallback(() => {
    setIsLocked(true);
    setSecondsRemaining(null);
    try {
      localStorage.setItem(STORAGE_KEY_LOCKED, 'true');
    } catch {}
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 150);
  }, []);

  const unlockWorkstation = useCallback(() => {
    setIsLocked(false);
    setPassword('');
    setUnlockError(null);
    setSecondsRemaining(null);
    const now = Date.now();
    lastActiveRef.current = now;
    try {
      localStorage.removeItem(STORAGE_KEY_LOCKED);
      localStorage.setItem(STORAGE_KEY_LAST_ACTIVE, now.toString());
    } catch {}
  }, []);

  // Initialize activity timestamp and handle initial locked state
  useEffect(() => {
    try {
      const storedLock = localStorage.getItem(STORAGE_KEY_LOCKED);
      if (storedLock === 'true') {
        setIsLocked(true);
      } else {
        const storedLastActive = localStorage.getItem(STORAGE_KEY_LAST_ACTIVE);
        const lastActiveTime = storedLastActive ? parseInt(storedLastActive, 10) : Date.now();
        if (Date.now() - lastActiveTime >= INACTIVITY_TIMEOUT_MS) {
          lockWorkstation();
        } else {
          lastActiveRef.current = lastActiveTime;
        }
      }
    } catch {}
  }, [lockWorkstation]);

  // Activity listeners across window
  useEffect(() => {
    if (isLocked) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleEvent = () => recordActivity();

    events.forEach((ev) => window.addEventListener(ev, handleEvent, { passive: true }));

    // Listen for manual lock custom event
    const handleManualLock = () => lockWorkstation();
    window.addEventListener('admin_lock_station', handleManualLock);

    // Cross-tab synchronization via localStorage
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_LOCKED) {
        if (e.newValue === 'true') {
          setIsLocked(true);
        } else if (e.newValue === null) {
          setIsLocked(false);
        }
      }
      if (e.key === STORAGE_KEY_LAST_ACTIVE && e.newValue) {
        lastActiveRef.current = parseInt(e.newValue, 10);
      }
    };
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleEvent));
      window.removeEventListener('admin_lock_station', handleManualLock);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [isLocked, recordActivity, lockWorkstation]);

  // Periodic interval checking for inactivity timeout and 60-second countdown warning
  useEffect(() => {
    if (isLocked) return;

    const interval = setInterval(() => {
      let lastActiveTime = lastActiveRef.current;
      try {
        const storedLast = localStorage.getItem(STORAGE_KEY_LAST_ACTIVE);
        if (storedLast) {
          lastActiveTime = Math.max(lastActiveTime, parseInt(storedLast, 10));
        }
      } catch {}

      const elapsed = Date.now() - lastActiveTime;
      const timeLeft = INACTIVITY_TIMEOUT_MS - elapsed;

      if (timeLeft <= 0) {
        lockWorkstation();
      } else if (timeLeft <= WARNING_THRESHOLD_MS) {
        setSecondsRemaining(Math.ceil(timeLeft / 1000));
      } else {
        setSecondsRemaining(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked, lockWorkstation]);

  // Handle password unlock submission
  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setUnlockError('Please enter your password to unlock.');
      return;
    }

    setIsUnlocking(true);
    setUnlockError(null);

    try {
      await api.post('/auth/unlock', { password });
      toast.success('Workstation unlocked. Welcome back!', { icon: '🛡️' });
      unlockWorkstation();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Incorrect password. Workstation remains secured.';
      setUnlockError(msg);
      toast.error(msg);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem(STORAGE_KEY_LOCKED);
    localStorage.removeItem(STORAGE_KEY_LAST_ACTIVE);
    window.location.href = '/admin/login';
  };

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Administrator';
  const initials = `${user.firstName?.[0] || 'S'}${user.lastName?.[0] || 'A'}`.toUpperCase();

  return (
    <>
      {/* Background Page Content */}
      <div className={isLocked ? 'pointer-events-none select-none filter blur-xs transition duration-300' : ''}>
        {children}
      </div>

      {/* ── 60-SECOND IMMINENT AUTO-LOCK WARNING BANNER ── */}
      {!isLocked && secondsRemaining !== null && secondsRemaining > 0 && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-6 right-6 z-50 max-w-md w-[calc(100vw-3rem)] p-4 rounded-2xl bg-amber-950/90 dark:bg-amber-950/95 border border-amber-500/40 text-amber-100 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-amber-200 tracking-wide uppercase">
                  Act 843 Inactivity Timeout
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-bold border border-amber-500/30">
                  {secondsRemaining}s
                </span>
              </div>
              <p className="text-xs text-amber-100/80 mt-1 leading-relaxed">
                Workstation will lock in {secondsRemaining} seconds to protect sensitive records.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    recordActivity();
                    setSecondsRemaining(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  I'm Active (Resume)
                </button>
                <button
                  type="button"
                  onClick={lockWorkstation}
                  className="px-3 py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-900 text-amber-200 text-xs font-medium transition cursor-pointer"
                >
                  Lock Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── HIGH-SECURITY 2-COLUMN WORKSTATION LOCK MODAL ── */}
      {isLocked && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Workstation Locked"
          className="fixed inset-0 z-[99999] bg-[#0A0D14]/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200 select-none"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Container */}
          <div className="relative w-full max-w-4xl bg-white dark:bg-[#12151D] border border-zinc-200/80 dark:border-zinc-800 rounded-[28px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden grid grid-cols-1 md:grid-cols-12 animate-in zoom-in-95 duration-200">
            {/* Top Right Close Button */}
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Close workstation lock"
              title="Sign out or close workstation"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 w-8 h-8 rounded-full bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* ── LEFT COLUMN: SECURE ACCESS & BRANDING ── */}
            <div className="md:col-span-5 relative overflow-hidden bg-gradient-to-br from-[#065F46] via-[#047857] to-[#024430] text-white p-7 sm:p-8 flex flex-col justify-between">
              {/* Background Building Image & Overlays */}
              <div className="absolute top-0 right-0 w-[85%] h-56 pointer-events-none select-none overflow-hidden opacity-55">
                <img
                  src="/images/resident/hero-building-clean.webp"
                  alt=""
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#065F46]/30 via-[#047857]/70 to-[#047857]" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#047857] via-transparent to-transparent" />
              </div>

              {/* Decorative wave graphic */}
              <svg
                className="absolute -bottom-10 -left-10 w-64 h-64 opacity-25 pointer-events-none"
                viewBox="0 0 200 200"
              >
                <path
                  fill="#34D399"
                  d="M44.7,-76.4C58.8,-69.2,71.8,-59.1,79.6,-45.8C87.4,-32.6,90,-16.3,88.5,-0.9C86.9,14.6,81.2,29.1,72.6,41.2C64,53.2,52.5,62.8,39.6,70.5C26.7,78.2,12.3,84,-1.8,87.1C-15.9,90.2,-31.8,90.6,-45.6,84C-59.4,77.4,-71.1,63.8,-79.8,48.6C-88.5,33.4,-94.2,16.7,-93.8,0.2C-93.5,-16.3,-87.1,-32.6,-77.4,-46.2C-67.7,-59.8,-54.7,-70.7,-40.4,-77.8C-26.1,-84.9,-10.5,-88.2,3.1,-93.5C16.7,-98.9,30.6,-83.6,44.7,-76.4Z"
                  transform="translate(100 100)"
                />
              </svg>

              {/* Top Logo */}
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  <Image
                    src="/images/auth/akwaaba-emblem.png"
                    alt="AkwaabaHomes"
                    width={32}
                    height={32}
                    className="w-full h-full object-contain drop-shadow"
                  />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-base font-black text-white tracking-tight">AkwaabaHomes</span>
                  <span className="text-[10px] text-emerald-200/90 font-medium">
                    Live Well. Feel at Home.
                  </span>
                </div>
              </div>

              {/* Middle Content */}
              <div className="relative z-10 my-6">
                {/* 3D Glowing Shield */}
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#34D399]/30 to-[#059669]/60 border-2 border-[#34D399]/60 shadow-[0_8px_20px_rgba(5,150,105,0.4)] backdrop-blur-md flex items-center justify-center mb-5">
                  <div className="absolute inset-1 rounded-xl bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                  <Lock className="w-8 h-8 text-white drop-shadow-md" />
                </div>

                <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
                  Secure Access<br />for Administrators
                </h2>
                <p className="text-xs text-emerald-100/90 leading-relaxed mt-2.5 max-w-[280px]">
                  Your platform administration starts here. Unlock to manage users, listings, payouts, and system operations.
                </p>

                {/* Features Checkmarks */}
                <div className="space-y-2.5 mt-5">
                  {[
                    'Manage Users & Properties',
                    'Oversee Payouts & Compliance',
                    'Monitor Live Operations',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 text-xs font-semibold text-white">
                      <div className="w-4 h-4 rounded-full bg-[#34D399] text-[#065F46] flex items-center justify-center shrink-0 font-black text-[10px]">
                        ✓
                      </div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Support Widget */}
              <div className="relative z-10 rounded-2xl border border-emerald-400/30 bg-emerald-950/40 p-3.5 flex items-center gap-3 backdrop-blur-xs">
                <div className="w-10 h-10 rounded-full bg-emerald-900/60 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-emerald-200/90 font-medium">Need Help?</div>
                  <Link
                    href="/support"
                    className="text-xs font-bold text-white hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <span>Contact Support</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* ── RIGHT COLUMN: AUTHENTICATION & UNLOCK FORM ── */}
            <div className="md:col-span-7 p-7 sm:p-9 flex flex-col justify-center space-y-5 bg-white dark:bg-[#12151D]">
              {/* Profile Card Header */}
              <div className="flex flex-col items-center space-y-2 text-center pt-2">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-[#0B7A46] text-white text-2xl font-black flex items-center justify-center overflow-hidden shadow-lg border-2 border-emerald-500/20">
                    {user?.avatarUrl ? (
                      <img
                        decoding="async"
                        src={getImageUrl(user.avatarUrl)}
                        alt={fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  {/* Verified Shield Badge */}
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-[#12151D] p-0.5 shadow-md flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-emerald-500 text-white flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-black text-zinc-950 dark:text-white tracking-tight">
                    Welcome Back!
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                    Sign in to your administrator account
                  </p>
                </div>
              </div>

              {/* Station Idle Notice Card */}
              <div className="rounded-2xl bg-[#E8F8EE] dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 p-3.5 flex items-start gap-3">
                <Clock className="w-4 h-4 text-[#059669] dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">
                    Station Idle for 15 Minutes
                  </div>
                  <p className="text-[11.5px] text-zinc-600 dark:text-zinc-400 leading-relaxed mt-0.5">
                    For your security, your session will expire after 15 minutes of inactivity.
                  </p>
                </div>
              </div>

              {/* Password Unlock Form */}
              <form onSubmit={handleUnlockSubmit} className="space-y-3.5 text-left">
                <div>
                  <label
                    htmlFor="admin-unlock-password"
                    className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-1.5"
                  >
                    Administrator Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={passwordInputRef}
                      id="admin-unlock-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (unlockError) setUnlockError(null);
                      }}
                      placeholder="Enter your password..."
                      disabled={isUnlocking}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>
                  <Link
                    href="/forgot-password"
                    className="font-semibold text-[#059669] dark:text-emerald-400 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                {unlockError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-[11.5px] leading-tight">{unlockError}</span>
                  </div>
                )}

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={isUnlocking}
                  className="w-full py-3 px-5 rounded-full bg-gradient-to-r from-[#10B981] via-[#059669] to-[#047857] hover:opacity-95 active:scale-[0.99] text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-60"
                >
                  {isUnlocking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Password...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>Unlock Workstation</span>
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="relative flex items-center justify-center my-0.5">
                <div className="border-t border-zinc-200 dark:border-zinc-800 w-full" />
                <span className="bg-white dark:bg-[#12151D] px-3 text-[11px] text-zinc-400 font-medium absolute">
                  or
                </span>
              </div>

              {/* Secondary Button: Sign Out Completely */}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2.5 px-4 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out Completely</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
