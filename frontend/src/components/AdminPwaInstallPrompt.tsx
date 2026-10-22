'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';

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
      <div className="rounded-2xl p-4 border border-slate-700 bg-[#0A0F1D] text-white shadow-xl relative overflow-hidden space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#16A34A] p-0.5 shadow-md shrink-0 flex items-center justify-center">
              <Image src="/logo.png" alt="Akwaaba Admin Logo" width={28} height={28} className="object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-xs text-white">Akwaaba Admin App</h4>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5 uppercase">
                  <Download className="w-2.5 h-2.5" /> PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Install dedicated Admin Portal</p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-white/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="flex-1 text-slate-400 hover:text-white hover:bg-white/10"
          >
            Later
          </Button>
          <Button
            variant="emerald"
            size="sm"
            onClick={handleInstallClick}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="flex-1"
          >
            Install App
          </Button>
        </div>
      </div>
    </div>
  );
}
