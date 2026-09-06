'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import clsx from 'clsx';

interface LiveGhanaClockProps {
  isCollapsed?: boolean;
  className?: string;
  variant?: 'sidebar' | 'pill';
}

export default function LiveGhanaClock({ isCollapsed = false, className, variant = 'sidebar' }: LiveGhanaClockProps) {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const updateTime = () => {
      const now = new Date();
      
      // 12-Hour format with seconds & AM/PM: e.g. 02:35:48 PM
      // Ghana observes Greenwich Mean Time (GMT / UTC+0) year-round
      const formattedTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Accra',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(now);

      const formattedDate = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Accra',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(now);

      setTimeStr(formattedTime);
      setDateStr(formattedDate);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Avoid Next.js hydration mismatch on initial server render
  if (!mounted) {
    if (variant === 'pill') {
      return (
        <div className="h-8 w-28 rounded-full bg-zinc-100 dark:bg-zinc-800/60 animate-pulse" />
      );
    }
    return (
      <div className={clsx("px-3 py-2", className)}>
        <div className={clsx("animate-pulse bg-zinc-900/60 rounded-xl", isCollapsed ? "h-10 w-10 mx-auto" : "h-14 w-full")} />
      </div>
    );
  }

  // Pill variant (for top navbar / header)
  if (variant === 'pill') {
    return (
      <div 
        title={`Ghana Standard Time (GMT) • ${dateStr}`}
        className={clsx(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100/90 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 text-xs shadow-xs",
          className
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-mono font-bold text-zinc-900 dark:text-emerald-400 tracking-tight">
          {timeStr}
        </span>
        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium border-l border-zinc-300 dark:border-zinc-700 pl-2">
          Accra GMT
        </span>
      </div>
    );
  }

  // Collapsed Sidebar mode
  if (isCollapsed) {
    return (
      <div className={clsx("px-2 py-2 flex justify-center", className)}>
        <div 
          title={`Accra, Ghana (GMT): ${timeStr} • ${dateStr}`}
          className="w-10 h-10 rounded-xl bg-zinc-900/90 border border-zinc-800/80 flex flex-col items-center justify-center text-center cursor-default group relative shadow-inner"
        >
          <span className="relative flex h-1.5 w-1.5 mb-0.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <Clock className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />

          {/* Floating Tooltip */}
          <div className="absolute left-full ml-3 px-3 py-2 bg-[#0B0D12] text-white text-xs font-semibold rounded-xl shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-zinc-800 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Accra, GH (GMT)</span>
            </div>
            <div className="font-mono font-extrabold text-sm text-emerald-400">{timeStr}</div>
            <div className="text-[10px] text-zinc-400 font-medium">{dateStr}</div>
          </div>
        </div>
      </div>
    );
  }

  // Expanded Sidebar mode: Institutional Terminal Card
  return (
    <div className={clsx("px-3 pt-1 pb-2", className)}>
      <div className="p-2.5 rounded-xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800/80 shadow-inner flex flex-col gap-1.5 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-zinc-300">Accra, GH • GMT</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-medium">{dateStr}</span>
        </div>

        <div className="flex items-baseline justify-between pt-0.5">
          <span className="font-mono font-extrabold text-sm tracking-widest text-emerald-400 tabular-nums">
            {timeStr}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/80 bg-emerald-950/50 border border-emerald-800/40 px-1.5 py-0.5 rounded">
            Live
          </span>
        </div>
      </div>
    </div>
  );
}
