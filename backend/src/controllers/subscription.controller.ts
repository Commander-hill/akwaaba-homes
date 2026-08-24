// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { notifySubscriptionExpirySoon } from '../utils/notification.service';
import axios from 'axios';
import crypto from 'crypto';
import { getIO } from '../socket';

export const getSubscriptionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const { propertyId } = req.query;

    if (!landlordId || !propertyId) {
      res.status(401).json({ message: 'Unauthorized or missing propertyId' });
      return;
    }

    const landlord = await prisma.user.findUnique({
      where: { id: landlordId },
      select: { isSuspended: true }
    });

    const subscription = await prisma.propertySubscription.findFirst({
      where: { propertyId: propertyId as string, property: { landlordId } },
      orderBy: { createdAt: 'desc' }
    });

    if (!subscription) {
      res.status(200).json({ isActive: false, message: 'No active subscription found for this property.' });
      return;
    }

    // Check if subscription has expired
    const isExpired = new Date() > new Date(subscription.endDate);
    
    if (isExpired && subscription.isActive) {
      await prisma.propertySubscription.update({
        where: { id: subscription.id },
        data: { isActive: false }
      });
      subscription.isActive = false;
      // Mark property unavailable
      await prisma.property.update({
        where: { id: propertyId as string },
        data: { isAvailable: false }
      });
    }

    res.status(200).json({ 
      isActive: subscription.isActive,
      paymentStatus: subscription.paymentStatus,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      accountStatus: landlord?.isSuspended ? 'Suspended' : 'Active',
      subscription
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const initializePayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const { propertyId } = req.body;

    if (!landlordId || !propertyId) {
      res.status(400).json({ message: 'Missing landlord ID or property ID' });
      return;
    }

    const landlord = await prisma.user.findUnique({ where: { id: landlordId } });
    if (!landlord) {
      res.status(404).json({ message: 'Landlord not found' });
      return;
    }

    if (landlord.ghanaCardStatus !== 'VERIFIED') {
      res.status(403).json({
        message: 'Publishing Blocked: Your Ghana Card verification is currently pending admin review. You will be able to publish your listing as soon as an administrator approves your identity verification.'
      });
      return;
    }

    const property = await prisma.property.findFirst({ where: { id: propertyId, landlordId } });
    if (!property) {
      res.status(404).json({ message: 'Property not found or does not belong to you' });
      return;
    }

    // Prevent re-subscribing if already active
    const existingActiveSub = await prisma.propertySubscription.findFirst({
      where: { propertyId, isActive: true }
    });
    if (existingActiveSub && new Date() < new Date(existingActiveSub.endDate)) {
      res.status(400).json({ message: 'This property already has an active subscription.' });
      return;
    }

    // Amount for annual property listing: derived from SUBSCRIPTION_FEE_GHS (defaults to 100 GHS = 10000 pesewas)
    const feeInGhs = parseFloat(process.env.SUBSCRIPTION_FEE_GHS || '100');
    const amountInPesewas = Math.round(feeInGhs * 100);

    const callbackUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/dashboard/landlord/properties?verify=true`
      : 'http://localhost:3000/dashboard/landlord/properties?verify=true';

    const isTestMode = !process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.startsWith('sk_test_') || process.env.PAYSTACK_SECRET_KEY.includes('replace_with_your_actual');

    const hasPaystackKey = !!process.env.PAYSTACK_SECRET_KEY && !process.env.PAYSTACK_SECRET_KEY.includes('replace_with_your_actual');

    let authUrl = '';
    let reference = `SUB_TEST_${Date.now()}`;

    if (hasPaystackKey) {
      try {
        const response = await axios.post(
          'https://api.paystack.co/transaction/initialize',
          {
            email: landlord.email,
            amount: amountInPesewas,
            currency: 'GHS',
            callback_url: callbackUrl,
            metadata: {
              landlordId,
              propertyId,
              purpose: `Listing Fee for ${property.title}`,
              custom_fields: [
                { display_name: 'Landlord Name', variable_name: 'landlord_name', value: `${landlord.firstName} ${landlord.lastName}` },
                { display_name: 'Property', variable_name: 'property_title', value: property.title }
              ]
            }
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        authUrl = response.data.data.authorization_url;
        reference = response.data.data.reference;
      } catch (paystackErr: any) {
        console.error('Paystack Initialization Error:', paystackErr.response?.data || paystackErr.message);
        if (isTestMode || paystackErr.response?.data?.message === 'Invalid key') {
          console.warn('Paystack key error or test key, using simulated test url:', paystackErr.message);
          authUrl = `${callbackUrl}&reference=${reference}&test_mode=true`;
        } else {
          res.status(400).json({ message: paystackErr.response?.data?.message || 'Paystack initialization failed' });
          return;
        }
      }
    } else {
      // Offline fallback only when no Paystack key is configured at all
      authUrl = `${callbackUrl}&reference=${reference}&test_mode=true`;
    }

    const existingSub = await prisma.propertySubscription.findUnique({ where: { propertyId } });
    if (existingSub) {
      await prisma.propertySubscription.update({
        where: { propertyId },
        data: { paymentReference: reference, paymentStatus: 'PENDING', isActive: false }
      });
    } else {
      await prisma.propertySubscription.create({
        data: {
          propertyId,
          paymentReference: reference,
          paymentStatus: 'PENDING',
          startDate: new Date(),
          endDate: new Date(),
          isActive: false
        }
      });
    }

    res.status(200).json({
      authorization_url: authUrl,
      reference: reference,
      isTestMode
    });

  } catch (error: any) {
    console.error('Initialize payment error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      res.status(500).json({ message: 'Invalid Paystack secret key. Please update your backend/.env file.' });
    } else {
      res.status(500).json({ message: 'Failed to initialize payment. Please try again.' });
    }
  }
};

export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const { paymentReference } = req.body;

    if (!landlordId || !paymentReference) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    const isTestRef = paymentReference.startsWith('SUB_TEST_') || paymentReference.includes('test');
    let isSuccess = false;

    if (isTestRef || !process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.startsWith('sk_test_')) {
      try {
        if (process.env.PAYSTACK_SECRET_KEY && !process.env.PAYSTACK_SECRET_KEY.includes('replace_with_your_actual') && !isTestRef) {
          const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${paymentReference}`,
            { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
          );
          isSuccess = response.data.data.status === 'success';
        } else {
          isSuccess = true; // Auto-verify test transactions
        }
      } catch (err) {
        if (isTestRef || process.env.PAYSTACK_SECRET_KEY?.startsWith('sk_test_')) {
          isSuccess = true;
        } else {
          res.status(400).json({ message: 'Paystack transaction verification failed' });
          return;
        }
      }
    } else {
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${paymentReference}`,
        { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
      );
      isSuccess = response.data.data.status === 'success';
    }

    if (!isSuccess) {
      res.status(400).json({ message: 'Payment verification failed: Transaction not successful' });
      return;
    }

    // Check if this reference was already processed as active
    const existingSub = await prisma.propertySubscription.findUnique({
      where: { paymentReference }
    });

    if (!existingSub) {
      res.status(404).json({ message: 'Subscription record not found for this reference' });
      return;
    }

    if (existingSub.isActive) {
      res.status(400).json({ message: 'Payment reference already processed' });
      return;
    }

    // Update the pending subscription to active (365 days)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const subscription = await prisma.propertySubscription.update({
      where: { id: existingSub.id },
      data: {
        paymentStatus: 'COMPLETED',
        startDate,
        endDate,
        isActive: true
      }
    });

    // Automatically make property available when subscription is paid
    await prisma.property.update({
      where: { id: existingSub.propertyId },
      data: { isAvailable: true }
    });

    res.status(200).json({ message: 'Property listed successfully', subscription });

  } catch (error: any) {
    console.error('Verify payment error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to verify payment with Paystack' });
  }
};

export const handlePaystackWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret || secret.includes('replace_with_your_actual')) {
      res.status(400).send('Paystack secret not configured');
      return;
    }

    // Verify Paystack HMAC SHA512 signature
    const signature = req.headers['x-paystack-signature'];
    const hash = crypto.createHmac('sha512', secret).update(JSON.stringify(req.body)).digest('hex');

    if (hash !== signature) {
      res.status(401).send('Invalid signature');
      return;
    }

    const event = req.body;

    // Handle charge.success event
    if (event.event === 'charge.success') {
      const data = event.data;
      const paymentReference = data.reference;

      const existingSub = await prisma.propertySubscription.findUnique({
        where: { paymentReference }
      });

      if (existingSub && !existingSub.isActive) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);

        const subscription = await prisma.propertySubscription.update({
          where: { id: existingSub.id },
          data: {
            paymentStatus: 'COMPLETED',
            startDate,
            endDate,
            isActive: true
          }
        });

        // Automatically make property available when subscription is paid
        await prisma.property.update({
          where: { id: existingSub.propertyId },
          data: { isAvailable: true }
        });

        // Emit real-time notification to landlord via Socket.io
        try {
          const property = await prisma.property.findUnique({ where: { id: existingSub.propertyId } });
          if (property) {
            getIO().to(property.landlordId).emit('notification', {
              title: 'Property Listing Activated',
              message: `Payment received! Your listing for "${property.title}" is now active.`,
              type: 'subscription'
            });
            getIO().to(property.landlordId).emit('property_updated', { propertyId: property.id });
          }
        } catch (e) {
          console.error('Socket emission failed in webhook:', e);
        }
      }
    }

    // Paystack requires a 200 OK response to confirm receipt
    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Paystack webhook error:', error);
    res.status(500).send('Internal server error');
  }
};

export const checkExpirations = async (req: Request, res: Response): Promise<void> => {
  try {
    // Security Check: Require Admin role or matching CRON_SECRET header
    const cronSecretHeader = req.headers['x-cron-secret'];
    const validCronSecret = process.env.CRON_SECRET && cronSecretHeader === process.env.CRON_SECRET;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isAdmin && !validCronSecret) {
      res.status(403).json({ message: 'Forbidden: Admin access or valid CRON secret required' });
      return;
    }
    // In a real app, this would be triggered by a daily cron job
    const activeSubscriptions = await prisma.propertySubscription.findMany({
      where: { isActive: true },
      include: { property: { include: { landlord: { select: { id: true, email: true, firstName: true } } } } }
    });

    const now = new Date();
    let notifiedCount = 0;
    let expiredCount = 0;

    for (const sub of activeSubscriptions) {
      const expiryDate = new Date(sub.endDate);
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        // Expired!
        await prisma.propertySubscription.update({
          where: { id: sub.id },
          data: { isActive: false }
        });
        await prisma.property.update({
          where: { id: sub.propertyId },
          data: { isAvailable: false }
        });
        expiredCount++;
      } else if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
        // Notify at 7, 3, and 1 days before expiry
        await notifySubscriptionExpirySoon({
          landlordId: sub.property.landlord.id,
          landlordEmail: sub.property.landlord.email,
          landlordName: sub.property.landlord.firstName,
          expiryDate: sub.endDate,
          daysLeft: diffDays
        });
        notifiedCount++;
      }
    }

    res.status(200).json({ 
      message: 'Expiration check completed', 
      processed: activeSubscriptions.length,
      notified: notifiedCount,
      expired: expiredCount
    });
  } catch (error) {
    console.error('Check expirations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getLandlordSubscriptionsOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user.id;

    // Fetch all properties belonging to landlord with their subscription
    const properties = await prisma.property.findMany({
      where: { landlordId },
      include: {
        subscription: true  // one-to-one relation: PropertySubscription?
      }
    });

    const now = new Date();
    const overview = properties.map(property => {
      const sub = property.subscription || null;  // singular, not array
      let daysLeft = 0;
      let isActive = false;
      let needsRenewalSoon = false;

      if (sub) {
        const endDate = new Date(sub.endDate);
        const diffTime = endDate.getTime() - now.getTime();
        daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        isActive = sub.isActive && endDate > now;
        needsRenewalSoon = isActive && daysLeft <= 7;
      }

      return {
        propertyId: property.id,
        propertyTitle: property.title,
        location: property.location,
        isAvailable: property.isAvailable,
        subscription: sub ? {
          id: sub.id,
          paymentReference: sub.paymentReference,
          startDate: sub.startDate,
          endDate: sub.endDate,
          paymentStatus: sub.paymentStatus,
          isActive,
          daysLeft,
          needsRenewalSoon
        } : null
      };
    });

    const stats = {
      totalProperties: properties.length,
      activeSubscriptions: overview.filter(p => p.subscription?.isActive).length,
      expiringSoon: overview.filter(p => p.subscription?.needsRenewalSoon).length,
      unsubscribedOrExpired: overview.filter(p => !p.subscription?.isActive).length
    };

    res.status(200).json({ stats, properties: overview });
  } catch (error) {
    console.error('Error fetching landlord subscriptions overview:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
