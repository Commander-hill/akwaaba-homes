'use client';

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { EmeraldToastItem } from './EmeraldToast';

export default function DeferredToaster() {
  useEffect(() => {
    window.alert = async (msg) => {
      const { toast } = await import('react-hot-toast');
      if (typeof msg === 'string') {
        const lower = msg.toLowerCase();
        if (lower.includes('success') || lower.includes('copied')) {
          toast.success(msg, { id: msg });
        } else if (
          lower.includes('error') ||
          lower.includes('fail') ||
          lower.includes('invalid') ||
          lower.includes('must') ||
          lower.includes('first')
        ) {
          toast.error(msg, { id: msg });
        } else {
          toast(msg, { id: msg });
        }
      } else {
        toast(String(msg));
      }
    };
  }, []);

  return (
    <Toaster
      position="top-center"
      gutter={8}
      containerStyle={{
        top: 20,
        zIndex: 99999,
      }}
      toastOptions={{
        duration: 2800,
      }}
    >
      {(t) => <EmeraldToastItem toast={t} />}
    </Toaster>
  );
}
