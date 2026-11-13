'use client';

import React from 'react';

export default function BottomSheetHandle({ className = '' }: { className?: string }) {
  return (
    <div
      className={`sm:hidden flex justify-center pt-0.5 pb-3 -mt-2 select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      <span className="w-10 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
    </div>
  );
}
