'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const PwaRegister = dynamic(() => import('./PwaRegister'), { ssr: false });
const PwaInstallPrompt = dynamic(() => import('./PwaInstallPrompt'), { ssr: false });
const DeferredToaster = dynamic(() => import('./DeferredToaster'), { ssr: false });

/**
 * Defers toast container, PWA service-worker registration, and install banner hydration
 * until user interaction or well after initial LCP/TBT settlement.
 */
export default function PostLoadPwa() {
  const [toasterReady, setToasterReady] = useState(false);
  const [pwaReady, setPwaReady] = useState(false);

  useEffect(() => {
    const activateToaster = () => setToasterReady(true);
    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, activateToaster, { once: true, passive: true }));

    const toasterTimer = setTimeout(activateToaster, 4000);
    const pwaTimer = setTimeout(() => setPwaReady(true), 4000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, activateToaster));
      clearTimeout(toasterTimer);
      clearTimeout(pwaTimer);
    };
  }, []);

  return (
    <>
      {toasterReady && <DeferredToaster />}
      {pwaReady && (
        <>
          <PwaRegister />
          <PwaInstallPrompt />
        </>
      )}
    </>
  );
}
