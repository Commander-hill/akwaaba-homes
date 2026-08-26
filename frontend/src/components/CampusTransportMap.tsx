'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, Bus, Footprints, Car, Building2, GraduationCap, Stethoscope, BookOpen } from 'lucide-react';

interface CampusTransportMapProps {
  title?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}

interface Landmark {
  name: string;
  category: 'LECTURE' | 'LIBRARY' | 'CLINIC' | 'TROTRO';
  distanceMeters: number;
  walkMinutes: number;
  trotroFare: number;
  icon: React.ElementType;
}

export default function CampusTransportMap({ title, location, latitude = 5.1053, longitude = -1.2821 }: CampusTransportMapProps) {
  const [selectedMode, setSelectedMode] = useState<'WALK' | 'TROTRO' | 'TAXI'>('WALK');

  // Compute realistic nearby landmarks based on location string
  const locLower = (location || '').toLowerCase();
  const isUCC = locLower.includes('cape coast') || locLower.includes('ucc') || locLower.includes('amamoma') || locLower.includes('kwaprow') || locLower.includes('apewosika');
  const isKNUST = locLower.includes('kumasi') || locLower.includes('knust') || locLower.includes('ayeduase') || locLower.includes('kotei');
  const isUG = locLower.includes('legon') || locLower.includes('accra') || locLower.includes('ug') || locLower.includes('madina');

  const landmarks: Landmark[] = isUCC ? [
    { name: 'UCC Science Lecture Complex', category: 'LECTURE', distanceMeters: 450, walkMinutes: 6, trotroFare: 3.5, icon: GraduationCap },
    { name: 'Sam Jonah Central Library', category: 'LIBRARY', distanceMeters: 750, walkMinutes: 10, trotroFare: 3.5, icon: BookOpen },
    { name: 'UCC Health Services Clinic', category: 'CLINIC', distanceMeters: 900, walkMinutes: 12, trotroFare: 4.0, icon: Stethoscope },
    { name: 'Science / Amamoma Trotro & Taxi Rank', category: 'TROTRO', distanceMeters: 200, walkMinutes: 3, trotroFare: 3.5, icon: Bus }
  ] : isKNUST ? [
    { name: 'KNUST Tech Top Lecture Blocks', category: 'LECTURE', distanceMeters: 600, walkMinutes: 8, trotroFare: 4.0, icon: GraduationCap },
    { name: 'Prempeh II Central Library', category: 'LIBRARY', distanceMeters: 850, walkMinutes: 11, trotroFare: 4.0, icon: BookOpen },
    { name: 'KNUST Hospital & Clinic', category: 'CLINIC', distanceMeters: 1100, walkMinutes: 14, trotroFare: 5.0, icon: Stethoscope },
    { name: 'Ayeduase Gate Shuttle Rank', category: 'TROTRO', distanceMeters: 300, walkMinutes: 4, trotroFare: 4.0, icon: Bus }
  ] : [
    { name: 'Legon Central Campus & N-Block', category: 'LECTURE', distanceMeters: 800, walkMinutes: 10, trotroFare: 5.0, icon: GraduationCap },
    { name: 'Balme Main Library', category: 'LIBRARY', distanceMeters: 1000, walkMinutes: 13, trotroFare: 5.0, icon: BookOpen },
    { name: 'UG Hospital', category: 'CLINIC', distanceMeters: 1200, walkMinutes: 15, trotroFare: 6.0, icon: Stethoscope },
    { name: 'Okponglo / Madina Trotro Station', category: 'TROTRO', distanceMeters: 400, walkMinutes: 5, trotroFare: 5.0, icon: Bus }
  ];

  return (
    <div className="glass-card rounded-3xl border border-[var(--border)] p-6 space-y-6 shadow-lg bg-gradient-to-br from-white to-slate-50 dark:from-[#0A1128] dark:to-[#050B1A]">
      {/* Title & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
            <Navigation className="w-3.5 h-3.5" />
            Campus Mobility & Transport Map
          </div>
          <h3 className="text-xl font-black text-[var(--foreground)] mt-1.5">
            Hostel Location & Campus Routes
          </h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            Distance and estimated travel times to campus lecture halls, library, and trotro stations.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-[var(--border)] shrink-0">
          <button
            onClick={() => setSelectedMode('WALK')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedMode === 'WALK'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" /> Walking
          </button>
          <button
            onClick={() => setSelectedMode('TROTRO')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedMode === 'TROTRO'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bus className="w-3.5 h-3.5" /> Trotro / Shuttle
          </button>
          <button
            onClick={() => setSelectedMode('TAXI')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
              selectedMode === 'TAXI'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5" /> Taxi / Uber
          </button>
        </div>
      </div>

      {/* Visual Map Preview Frame */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-500/30 bg-slate-900 h-64 sm:h-72 shadow-inner group">
        {/* OpenStreetMap Static Tiles Background */}
        <iframe
          title="Hostel Map"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.008}%2C${latitude - 0.008}%2C${longitude + 0.008}%2C${latitude + 0.008}&layer=mapnik&marker=${latitude}%2C${longitude}`}
          className="w-full h-full opacity-90 transition-opacity group-hover:opacity-100"
        />

        {/* Overlay Hostel Badge Pin */}
        <div className="absolute top-4 left-4 z-10 bg-slate-950/85 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-indigo-500/40 text-white shadow-xl flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-indigo-500 animate-ping" />
          <div>
            <p className="text-xs font-black truncate max-w-[180px]">{title || 'Hostel Location'}</p>
            <p className="text-[10px] text-indigo-300 font-medium truncate">{location}</p>
          </div>
        </div>

        {/* GPS Coordinates Badge */}
        <div className="absolute bottom-4 right-4 z-10 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-700 text-[10px] font-mono text-slate-300">
          GPS: {latitude.toFixed(4)}, {longitude.toFixed(4)}
        </div>
      </div>

      {/* Landmark Proximity Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {landmarks.map((lm, idx) => {
          const IconComponent = lm.icon;

          return (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-[var(--border)] bg-white/70 dark:bg-slate-900/60 space-y-2 hover:border-indigo-500/50 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <IconComponent className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-[var(--foreground)] line-clamp-1">
                  {lm.name}
                </h4>
              </div>

              <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-xs font-bold">
                {selectedMode === 'WALK' && (
                  <>
                    <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                      <Footprints className="w-3.5 h-3.5" /> {lm.walkMinutes} min walk
                    </span>
                    <span className="text-[11px] text-[var(--muted-foreground)] font-mono">
                      {lm.distanceMeters}m
                    </span>
                  </>
                )}

                {selectedMode === 'TROTRO' && (
                  <>
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Bus className="w-3.5 h-3.5" /> {Math.max(2, Math.round(lm.walkMinutes / 3))} min ride
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                      GH₵ {lm.trotroFare.toFixed(2)}
                    </span>
                  </>
                )}

                {selectedMode === 'TAXI' && (
                  <>
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Car className="w-3.5 h-3.5" /> {Math.max(2, Math.round(lm.walkMinutes / 4))} min drive
                    </span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                      GH₵ {(lm.trotroFare * 3.5).toFixed(2)}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
