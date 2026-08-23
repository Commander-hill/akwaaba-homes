import prisma from '../utils/prisma';
import webpush from 'web-push';

// Configure Web Push VAPID keys
// Default fallback keys for instant local & production operation
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDnAJAw9inn2x8-6K9-1c9vF-2yD-wD71xW9zV8w420M';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '7xG92kF1_8xW-vM4kL9-2xV_8kF1_2xV_8kF1_2xV_8';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:support@akwaabahomes.com';

webpush.setVapidDetails(
  vapidSubject,
  vapidPublicKey,
  vapidPrivateKey
);

export const getVapidPublicKey = (): string => {
  return vapidPublicKey;
};

export const saveSubscription = async (userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) => {
  const { endpoint, keys } = subscription;
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    throw new Error('Invalid push subscription format');
  }

  return await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      userId,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    create: {
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });
};

export const removeSubscription = async (endpoint: string) => {
  return await prisma.pushSubscription.deleteMany({
    where: { endpoint },
  });
};

export const sendPushToUser = async (userId: string, payload: { title: string; body: string; icon?: string; url?: string }) => {
  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (!subscriptions || subscriptions.length === 0) {
      return;
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/logo.png',
      data: {
        url: payload.url || '/',
      },
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload
        );
      } catch (err: any) {
        // If subscription is expired/invalid (404/410), clean it up from DB
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error('Web Push delivery error:', err.message || err);
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
};
