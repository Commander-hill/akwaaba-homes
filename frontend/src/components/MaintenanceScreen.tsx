'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Clock, ShieldCheck, ArrowRight, CheckCircle2, MessageSquare, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { useQueryClient } from '@tanstack/react-query';

interface MaintenanceScreenProps {
  estimatedEndTime?: Date;
  onAdminBypass?: () => void;
}

export default function MaintenanceScreen({ estimatedEndTime }: MaintenanceScreenProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const queryClient = useQueryClient();

  // Default estimated maintenance duration (e.g. 2 hours from now if no date provided)
  const targetTime = estimatedEndTime || new Date(Date.now() + 2 * 60 * 60 * 1000 + 45 * 60 * 1000);

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 2,
    minutes: 45,
    seconds: 0,
  });

  const [countdownExpired, setCountdownExpired] = useState(false);

  useEffect(() => {
    const computeDistance = () => {
      const now = new Date().getTime();
      return targetTime.getTime() - now;
    };

    // Already past the target time on first render
    if (computeDistance() <= 0) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setCountdownExpired(true);
      return;
    }

    const timer = setInterval(() => {
      const distance = computeDistance();

      if (distance <= 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setCountdownExpired(true);
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  // Once the countdown expires, aggressively poll the backend every 2s
  // until it confirms maintenanceMode: false (server-driven unblock)
  useEffect(() => {
    if (!countdownExpired) return;

    const pollTimer = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['public-config'] });
    }, 2000);

    // Stop polling after 3 minutes (server should have deactivated by then)
    const killTimer = setTimeout(() => clearInterval(pollTimer), 3 * 60 * 1000);

    return () => {
      clearInterval(pollTimer);
      clearTimeout(killTimer);
    };
  }, [countdownExpired, queryClient]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/config/subscribe-maintenance', { email: email.trim() });
      setSubscribed(true);
      toast.success(res.data.message || 'Subscribed! We will email you once maintenance completes.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to register email notification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#09090B] text-white flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-[#5B4CFF] selection:text-white">
      
      {/* Background Graphic Effects */}
      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-30 pointer-events-none filter brightness-50 contrast-125" style={{ backgroundImage: 'url(/images/sunset-bg.png)' }} />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#09090B]/90 via-[#09090B]/70 to-[#09090B] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl mx-auto text-center space-y-8 my-auto animate-in fade-in zoom-in-95 duration-700">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(91,76,255,0.4)] border border-white/20 ring-2 ring-white/10">
            <Image src="/logo.png" alt="Akwaaba Homes" width={64} height={64} className="w-full h-full object-cover" />
          </div>
          <span style={{ background: 'linear-gradient(90deg, #6366F1, #A855F7, #F97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} className="font-black text-2xl tracking-tight">
            AkwaabaHomes
          </span>
        </div>

        {/* Maintenance Main Title */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
            <Clock className="w-3.5 h-3.5 animate-pulse" /> Scheduled System Maintenance
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md uppercase">
            WEBSITE <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">MAINTENANCE</span>
          </h1>

          <p className="text-zinc-400 text-sm sm:text-base max-w-lg mx-auto font-medium leading-relaxed">
            We are performing scheduled system upgrades and infrastructure enhancements. We apologize for the inconvenience and will return online shortly.
          </p>
        </div>

        {/* Countdown Timer Block */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-lg mx-auto">
          {[
            { label: 'DAYS', value: timeLeft.days },
            { label: 'HOURS', value: timeLeft.hours },
            { label: 'MINUTES', value: timeLeft.minutes },
            { label: 'SECONDS', value: timeLeft.seconds },
          ].map((item, idx) => (
            <div key={idx} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 sm:p-4 text-center shadow-xl">
              <div className="text-2xl sm:text-4xl font-black text-emerald-400 tracking-tight font-mono">
                {String(item.value).padStart(2, '0')}
              </div>
              <div className="text-[10px] sm:text-xs font-bold text-zinc-500 tracking-wider mt-1">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* Email Notification Lead Form */}
        <div className="max-w-md mx-auto bg-white/5 backdrop-blur-xl border border-white/10 p-2 sm:p-2.5 rounded-2xl shadow-2xl">
          {!subscribed ? (
            <form onSubmit={handleNotifySubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="email"
                  required
                  placeholder="Enter email to get notified when live..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-3 py-2.5 bg-transparent text-xs sm:text-sm text-white placeholder-zinc-500 outline-none disabled:opacity-60"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#5B4CFF] hover:bg-[#4B3DEE] disabled:opacity-70 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all shrink-0 active:scale-95"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Notify Me <ArrowRight className="w-3.5 h-3.5" /></>}
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2 text-emerald-400 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" /> You're on the list! We will email you when online.
            </div>
          )}
        </div>

        {/* Footer Actions & Emergency Support */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs">
          <a
            href="https://wa.me/233000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors underline font-medium"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" /> Need urgent booking help? Chat Support
          </a>

          <span className="hidden sm:inline text-zinc-700">•</span>

          <Link
            href="/login"
            className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" /> Admin Access Login
          </Link>
        </div>

      </div>
    </div>
  );
}
