'use client';

import { useState, useEffect } from 'react';
import { Download, X, ShieldCheck, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function AdminPwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('admin_pwa_prompt_dismissed');
    if (isDismissed) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('admin_pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-sm z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-2xl p-4 border border-purple-500/30 bg-[#0A0F1D] text-white shadow-2xl relative overflow-hidden space-y-3">
        {/* Ambient Glow */}
        <div className="absolute -right-10 -top-10 w-28 h-28 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 p-0.5 shadow-lg shrink-0">
              <div className="w-full h-full bg-[#0A0F1D] rounded-[10px] flex items-center justify-center overflow-hidden">
                <Image src="/logo.png" alt="Akwaaba Admin Logo" width={28} height={28} className="object-contain" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-xs text-white">Akwaaba Admin App</h4>
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-0.5 uppercase">
                  <ShieldCheck className="w-2.5 h-2.5" /> PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Install dedicated Admin Command Center</p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <button
            onClick={handleDismiss}
            className="flex-1 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            Later
          </button>
          <button
            onClick={handleInstallClick}
            className="flex-1 py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Install App
          </button>
        </div>
      </div>
    </div>
  );
}
