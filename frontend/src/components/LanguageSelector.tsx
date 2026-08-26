'use client';

import React, { useState } from 'react';
import { useLanguage, LanguageCode } from '@/providers/LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  flag: string;
}

const languages: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'tw', label: 'Twi (Akan)', nativeLabel: 'Twi', flag: '🇬🇭' },
  { code: 'ga', label: 'Ga', nativeLabel: 'Ga', flag: '🇬🇭' },
  { code: 'ee', label: 'Ewe', nativeLabel: 'Ewègbe', flag: '🇬🇭' },
];

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <div className="relative z-50">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-slate-100/80 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
      >
        <span className="text-base leading-none">{currentLang.flag}</span>
        <span className="font-extrabold text-[var(--foreground)] uppercase">{currentLang.code}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-[var(--border)] shadow-xl p-1.5 z-50 space-y-0.5 animate-fadeIn">
            {languages.map((lang) => {
              const isSelected = lang.code === language;

              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{lang.flag}</span>
                    <div className="text-left">
                      <p className="leading-none">{lang.label}</p>
                      <span className="text-[10px] text-slate-400 font-normal">{lang.nativeLabel}</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-indigo-500" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
