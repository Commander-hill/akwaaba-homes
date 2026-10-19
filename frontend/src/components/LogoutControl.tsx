'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, LogOut, X } from 'lucide-react';

/**
 * Two-step sign out. Clicking the icon expands an inline pill with
 * confirm (check) and cancel (cross) buttons. Escape or an outside click cancels.
 */
export default function LogoutControl({
  onLogout,
  fullWidthLabel,
}: {
  onLogout: () => void;
  /** When set, the idle trigger shows this label next to the icon. */
  fullWidthLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div ref={ref} className="flex items-center shrink-0">
      {open ? (
        <div
          role="group"
          aria-label="Confirm sign out"
          className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-[#F1EFE8] dark:bg-[#1B211E] animate-in fade-in"
        >
          <span className="text-xs font-medium text-[#5E645E] dark:text-[#9EA69F] mr-1">Sign out?</span>
          <button
            ref={confirmRef}
            type="button"
            onClick={onLogout}
            aria-label="Yes, sign out"
            className="w-8 h-8 rounded-full bg-white dark:bg-[#141816] flex items-center justify-center text-[#9E2A2B] hover:bg-[#FCEEEE] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173D32]"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cancel, stay signed in"
            className="w-8 h-8 rounded-full bg-white dark:bg-[#141816] flex items-center justify-center text-[#173D32] dark:text-white hover:bg-[#E7E7DF] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173D32]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Sign out"
          aria-expanded={false}
          title="Sign out"
          className="flex items-center gap-2 p-2 rounded-lg text-[#6F756F] hover:text-[#9E2A2B] hover:bg-[#FCEEEE] dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          {fullWidthLabel && <span className="text-xs font-semibold">{fullWidthLabel}</span>}
        </button>
      )}
    </div>
  );
}
