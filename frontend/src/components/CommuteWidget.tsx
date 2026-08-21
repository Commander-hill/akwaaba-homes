'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Loader2, Navigation, Route, Footprints, Car, MapPin, Bus } from 'lucide-react';

interface CommuteWidgetProps {
  propertyId: string;
}

export default function CommuteWidget({ propertyId }: CommuteWidgetProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['commute', propertyId],
    queryFn: async () => {
      const res = await api.get(`/gis/commute/${propertyId}`);
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 animate-pulse">
        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error || !data || !data.available) {
    return null; // Silently fail or hide widget if campus not configured or not supported
  }

  return (
    <div className="mt-4 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10 rounded-xl p-4 border border-indigo-100/50 dark:border-indigo-800/50 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -right-6 -top-6 text-indigo-500/5 dark:text-indigo-400/5">
        <Navigation className="w-32 h-32 transform rotate-45" />
      </div>

      <div className="relative z-10">
        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-1.5">
          <Route className="w-3.5 h-3.5" /> Commute to {data.campus}
        </h4>
        
        <div className="grid grid-cols-3 gap-2">
          {/* Distance */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-lg p-2.5 flex flex-col justify-between border border-white/40 dark:border-slate-700/50">
            <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 mb-1" />
            <div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-200 leading-none">{data.distanceKm}</div>
              <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Kilometers</div>
            </div>
          </div>

          {/* Walking */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-lg p-2.5 flex flex-col justify-between border border-white/40 dark:border-slate-700/50">
            <Footprints className="w-4 h-4 text-emerald-500 mb-1" />
            <div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-200 leading-none">{data.walkingTimeMins}</div>
              <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Mins walk</div>
            </div>
          </div>

          {/* Driving / Trotro */}
          <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-lg p-2.5 flex flex-col justify-between border border-white/40 dark:border-slate-700/50">
            <Bus className="w-4 h-4 text-amber-500 mb-1" />
            <div>
              <div className="text-lg font-black text-slate-800 dark:text-slate-200 leading-none">{data.drivingTimeMins}</div>
              <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Mins drive</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
