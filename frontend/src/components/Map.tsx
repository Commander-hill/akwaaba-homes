'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import the MapComponent and disable Server-Side Rendering (SSR)
// This is critical because Leaflet relies on the `window` object, which doesn't exist on the server.
const MapComponent = dynamic(
  () => import('./MapComponent'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-[var(--border)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)] mb-2" />
        <span className="text-sm font-medium text-[var(--muted-foreground)] text-center px-4">
          Loading interactive map...<br/>
          <span className="text-xs">Connecting to OpenStreetMap</span>
        </span>
      </div>
    )
  }
);

export default MapComponent;
