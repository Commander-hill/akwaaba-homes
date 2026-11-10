'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/axios';
import { getImageUrl } from '@/lib/utils';
import {
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  LogOut,
  Clock,
  Sparkles,
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
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const lastActiveRef = useRef<number>(Date.now());

  // Mask email for security display (e.g. k***@akwaabahomes.com)
  const maskedEmail = React.useMemo(() => {
    if (!user?.email) return '';
    const parts = user.email.split('@');
    if (parts.length < 2) return user.email;
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name.slice(0, 2)}***` : `${name.slice(0, 1)}***`;
    return `${maskedName}@${domain}`;
  }, [user?.email]);

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
      setUnlockError('Please enter your administrator password to unlock.');
      return;
    }

    setIsUnlocking(true);
    setUnlockError(null);

    try {
      await api.post('/auth/unlock', { password });
      toast.success('Workstation unlocked. Welcome back!', { icon: '🛡️' });
      unlockWorkstation();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Incorrect administrator password. Workstation remains secured.';
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
  const initials = `${user.firstName?.[0] || 'A'}${user.lastName?.[0] || ''}`.toUpperCase();
  const isSuperAdmin = user.role === 'SUPER_ADMIN';

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
                Admin workstation will lock in {secondsRemaining} seconds to protect sensitive Ghana Card and banking records.
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

      {/* ── HIGH-SECURITY WORKSTATION LOCK SCREEN (ACT 843 §20) ── */}
      {isLocked && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Admin Workstation Locked"
          className="fixed inset-0 z-[99999] bg-[#0A0D14]/92 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200 select-none"
        >
          {/* Subtle Ambient Glow Background */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative w-full max-w-md bg-white dark:bg-[#12151D] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 text-center space-y-6">
            {/* Top Institutional Compliance Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-[10.5px] font-bold tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Act 843 §20 Data Privacy Auto-Lock</span>
            </div>

            {/* Administrator Profile Card */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-[#0B7A46] text-white text-xl font-bold flex items-center justify-center overflow-hidden shadow-lg border-2 border-emerald-500/30">
                  {user?.avatarUrl ? (
                    <img decoding="async"
                      src={getImageUrl(user.avatarUrl)}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-amber-500 text-zinc-950 flex items-center justify-center shadow-md border-2 border-white dark:border-[#12151D]" title="Workstation Secured">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-white">
                  {fullName}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono mt-0.5">
                  {maskedEmail}
                </p>
                <div className="mt-1.5">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {isSuperAdmin ? 'SUPER ADMINISTRATOR' : 'ADMINISTRATOR'}
                  </span>
                </div>
              </div>
            </div>

            {/* Regulatory Description */}
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 text-left space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Station Idle for 15 Minutes</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                National ID data, tenant records, and landlord settlement details have been obscured to prevent unauthorized visual inspection. Please re-enter your administrator password to resume.
              </p>
            </div>

            {/* Password Unlock Form */}
            <form onSubmit={handleUnlockSubmit} className="space-y-4 text-left">
              <div>
                <label
                  htmlFor="admin-unlock-password"
                  className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Administrator Password
                </label>
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    id="admin-unlock-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (unlockError) setUnlockError(null);
                    }}
                    placeholder="Enter your login password..."
                    disabled={isUnlocking}
                    className="w-full px-4 py-2.5 pr-11 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white placeholder-zinc-400 text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-hidden transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {unlockError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="text-[11.5px] leading-tight">{unlockError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUnlocking}
                className="w-full py-2.5 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isUnlocking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Security Clearance...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Unlock Workstation</span>
                  </>
                )}
              </button>
            </form>

            {/* Bottom Sign-out or switch operator */}
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-[11px] text-zinc-400">
                Not {user.firstName || 'you'}?
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
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
