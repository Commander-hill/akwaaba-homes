'use client';

import { useEffect } from 'react';
import api from '@/lib/axios';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      window.addEventListener('load', async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          console.log('Akwaaba Homes PWA Service Worker registered successfully:', reg.scope);

          // Request push notification subscription if user permits
          if (Notification.permission === 'granted') {
            subscribePushUser(reg);
          } else if (Notification.permission !== 'denied') {
            // Prompt permission softly after initial interaction
            setTimeout(async () => {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                subscribePushUser(reg);
              }
            }, 5000);
          }
        } catch (err) {
          console.error('PWA Service Worker registration failed:', err);
        }
      });
    }
  }, []);

  const subscribePushUser = async (registration: ServiceWorkerRegistration) => {
    try {
      const { data } = await api.get('/push/public-key');
      if (!data?.publicKey) return;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        });
      }

      await api.post('/push/subscribe', { subscription: subscription.toJSON() });
    } catch (err) {
      console.warn('Push subscription failed:', err);
    }
  };

  return null;
}
