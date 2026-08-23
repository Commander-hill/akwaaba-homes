import { Request, Response } from 'express';
import { getVapidPublicKey, saveSubscription, removeSubscription, sendPushToUser } from '../services/push.service';

export const getPublicKey = (req: Request, res: Response): void => {
  try {
    const key = getVapidPublicKey();
    res.status(200).json({ publicKey: key });
  } catch (error) {
    console.error('Error fetching VAPID public key:', error);
    res.status(500).json({ message: 'Failed to fetch public key' });
  }
};

export const subscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { subscription } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!subscription || !subscription.endpoint) {
      res.status(400).json({ message: 'Invalid subscription payload' });
      return;
    }

    await saveSubscription(userId, subscription);
    res.status(201).json({ message: 'Push subscription saved successfully' });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    res.status(500).json({ message: 'Failed to save push subscription' });
  }
};

export const unsubscribe = async (req: Request, res: Response): Promise<void> => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      res.status(400).json({ message: 'Endpoint required' });
      return;
    }

    await removeSubscription(endpoint);
    res.status(200).json({ message: 'Push subscription removed' });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({ message: 'Failed to remove push subscription' });
  }
};

export const sendTestPush = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    await sendPushToUser(userId, {
      title: 'Akwaaba Homes Notification',
      body: 'Web Push Notifications are active on this device!',
      url: '/dashboard'
    });

    res.status(200).json({ message: 'Test push notification sent' });
  } catch (error) {
    console.error('Error sending test push:', error);
    res.status(500).json({ message: 'Failed to send test push' });
  }
};
