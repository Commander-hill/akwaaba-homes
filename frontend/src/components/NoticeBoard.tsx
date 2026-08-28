'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { AlertTriangle, Home, CreditCard, ExternalLink, Loader2, Info } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface Notice {
  id: string;
  orderIndex: number;
  topLabel: string | null;
  title: string;
  description: string;
  buttonText: string | null;
  buttonLink: string | null;
  iconType: string | null;
}

export default function NoticeBoard() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: notices, isLoading } = useQuery({
    queryKey: ['active-notices'],
    queryFn: async () => {
      const res = await api.get('/notices');
      return res.data as Notice[];
    }
  });

  // Auto-rotate notices every 8 seconds if there are multiple
  useEffect(() => {
    if (!notices || notices.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % notices.length);
    }, 8000);
    
    return () => clearInterval(interval);
  }, [notices]);

  if (isLoading) {
    return (
      <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!notices || notices.length === 0) {
    return null; // Don't render anything if no active notices
  }

  const notice = notices[currentIndex];

  const getIcon = (type: string | null) => {
    switch (type) {
      case 'CAUTION':
        return (
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case 'PAYMENT':
        return (
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CreditCard className="w-6 h-6" />
          </div>
        );
      case 'INFO':
        return (
          <div className="w-11 h-11 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
            <Info className="w-6 h-6" />
          </div>
        );
      default:
        return null;
    }
  };

  const formattedOrderIndex = notice.orderIndex.toString().padStart(2, '0');

  return (
    <div id="tour-notice-board" className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-pink-500 dark:text-pink-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping inline-block" /> System Announcement & Notice
        </h2>
      </div>
      
      <div className="relative w-full bg-[#0A1136] rounded-2xl p-5 sm:p-6 overflow-hidden shadow-xl transition-all duration-500 ease-in-out border border-indigo-900/50">
        {/* Giant background number */}
        <div className="absolute -bottom-6 -right-3 text-[8rem] font-black text-white/[0.04] leading-none pointer-events-none select-none font-sans">
          {formattedOrderIndex}
        </div>

        <div className="relative z-10 max-w-3xl">
          {/* Top Label */}
          {notice.topLabel && (
            <div className="text-pink-300 text-[10px] font-black uppercase tracking-widest mb-1.5">
              {notice.topLabel}
            </div>
          )}
          
          {/* Title Row */}
          <div className="flex items-center gap-3 mb-2">
            {notice.iconType && (
              <div className="flex-shrink-0">
                {getIcon(notice.iconType)}
              </div>
            )}
            <h3 className="text-xl sm:text-2xl font-black text-pink-400 tracking-tight">
              {notice.title}
            </h3>
          </div>

          {/* Description */}
          <p className="text-slate-200 text-xs sm:text-sm leading-relaxed max-w-2xl font-medium mb-4">
            {notice.description}
          </p>

          {/* Call to Action Button */}
          {notice.buttonText && notice.buttonLink && (
            <Link 
              href={notice.buttonLink}
              className="inline-flex items-center justify-center px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-pink-500/25 transition-all hover:scale-105"
            >
              {notice.buttonText}
            </Link>
          )}
        </div>
        
        {/* Pagination Dots */}
        {notices.length > 1 && (
          <div className="absolute bottom-3 right-4 flex gap-1.5 z-20">
            {notices.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-pink-400 w-6' : 'bg-white/30 w-2 hover:bg-white/50'}`}
                aria-label={`View notice ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
