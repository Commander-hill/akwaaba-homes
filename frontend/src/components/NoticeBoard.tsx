'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { AlertTriangle, CreditCard, Loader2, Info } from 'lucide-react';
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
      <div className="w-full h-40 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl animate-pulse flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!notices || notices.length === 0) {
    return null;
  }

  const notice = notices[currentIndex];

  const getIcon = (type: string | null) => {
    switch (type) {
      case 'CAUTION':
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-xs">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case 'PAYMENT':
        return (
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-xs">
            <CreditCard className="w-5 h-5" />
          </div>
        );
      case 'INFO':
        return (
          <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center text-white shadow-xs">
            <Info className="w-5 h-5" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div id="tour-notice-board" className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" /> Official Platform Advisory
        </div>
      </div>
      
      <div className="relative w-full bg-gradient-to-br from-[#0F5132] via-[#0D4428] to-[#072718] rounded-2xl p-5 sm:p-6 overflow-hidden shadow-xs transition-all duration-300 border border-emerald-800/60 text-white">
        <div className="relative z-10 max-w-3xl">
          {/* Top Category Label */}
          {notice.topLabel && (
            <div className="text-emerald-200/90 text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
              <span>{notice.topLabel}</span>
            </div>
          )}
          
          {/* Title Row */}
          <div className="flex items-center gap-3 mb-2">
            {notice.iconType && (
              <div className="shrink-0">
                {getIcon(notice.iconType)}
              </div>
            )}
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {notice.title}
            </h3>
          </div>

          {/* Description */}
          <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed max-w-2xl font-medium mb-4">
            {notice.description}
          </p>

          {/* Call to Action Button */}
          {notice.buttonText && notice.buttonLink && (
            <Link 
              href={notice.buttonLink}
              className="inline-flex items-center justify-center px-4 py-2 bg-white hover:bg-emerald-50 text-[#0F5132] font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
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
                className={`h-1.5 rounded-full transition-all cursor-pointer ${idx === currentIndex ? 'bg-white w-5' : 'bg-white/30 w-1.5 hover:bg-white/50'}`}
                aria-label={`View notice ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
