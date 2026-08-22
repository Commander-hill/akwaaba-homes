// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { notifySubscriptionExpirySoon } from '../utils/notification.service';
import axios from 'axios';

export const getSubscriptionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;

    if (!landlordId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const landlord = await prisma.user.findUnique({
      where: { id: landlordId },
      select: { isSuspended: true }
    });

    const subscription = await prisma.subscription.findFirst({
      where: { landlordId },
      orderBy: { createdAt: 'desc' }
    });

    if (!subscription) {
      res.status(200).json({ isActive: false, message: 'No active subscription found.' });
      return;
    }

    // Check if subscription has expired
    const isExpired = new Date() > new Date(subscription.endDate);
    
    if (isExpired && subscription.isActive) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { isActive: false }
      });
      subscription.isActive = false;
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

    if (!landlordId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const landlord = await prisma.user.findUnique({ where: { id: landlordId } });
    if (!landlord) {
      res.status(404).json({ message: 'Landlord not found' });
      return;
    }

    // Prevent re-subscribing if already active
    const existingActiveSub = await prisma.subscription.findFirst({
      where: { landlordId, isActive: true }
    });
    if (existingActiveSub && new Date() < new Date(existingActiveSub.endDate)) {
      res.status(400).json({ message: 'You already have an active subscription. No payment needed.' });
      return;
    }

    // Amount for annual subscription: GHS 500.00 = 50000 pesewas
    const amountInPesewas = 50000;

    // Check if user provided dummy Paystack key or if it's not set
    if (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.includes('replace_with_your_actual')) {
      res.status(400).json({ message: 'Paystack is not configured. Please add your PAYSTACK_SECRET_KEY to the backend .env file.' });
      return;
    }

    const callbackUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/dashboard/landlord/subscription?verify=true`
      : 'http://localhost:3000/dashboard/landlord/subscription?verify=true';

    // === MOCK PAYMENT FLOW FOR TESTING ===
    if (process.env.PAYSTACK_SECRET_KEY === 'sk_test_akwaaba_mock_key') {
      const mockReference = `mock_tx_${Date.now()}`;
      
      await prisma.subscription.create({
        data: {
          landlordId,
          paymentReference: mockReference,
          paymentStatus: 'PENDING',
          startDate: new Date(),
          endDate: new Date(),
          isActive: false
        }
      });

      // Directly return the callback url as the auth url to simulate instant payment completion
      res.status(200).json({
        authorization_url: `${callbackUrl}&reference=${mockReference}`,
        reference: mockReference
      });
      return;
    }
    // =====================================

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: landlord.email,
        amount: amountInPesewas,
        currency: 'GHS',
        callback_url: callbackUrl,
        metadata: {
          landlordId,
          purpose: 'AkwaabaHomes Annual Subscription',
          custom_fields: [
            { display_name: 'Landlord Name', variable_name: 'landlord_name', value: `${landlord.firstName} ${landlord.lastName}` },
            { display_name: 'Platform', variable_name: 'platform', value: 'Akwaaba Homes' }
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

    // Create a pending subscription record to track it
    await prisma.subscription.create({
      data: {
        landlordId,
        paymentReference: response.data.data.reference,
        paymentStatus: 'PENDING',
        startDate: new Date(),
        endDate: new Date(),
        isActive: false
      }
    });

    res.status(200).json({
      authorization_url: response.data.data.authorization_url,
      reference: response.data.data.reference
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

    if (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.includes('replace_with_your_actual')) {
      res.status(400).json({ message: 'Paystack Secret Key is missing or invalid. Please update your backend/.env file.' });
      return;
    }

    // === MOCK PAYMENT FLOW FOR TESTING ===
    if (process.env.PAYSTACK_SECRET_KEY === 'sk_test_akwaaba_mock_key' && paymentReference.startsWith('mock_tx_')) {
      // Skip the real Paystack API call and pretend it succeeded!
    } else {
      // Call Paystack to verify the transaction
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${paymentReference}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
          }
        }
      );

      const data = response.data.data;

      if (data.status !== 'success') {
        res.status(400).json({ message: 'Payment verification failed: Transaction not successful' });
        return;
      }
    }
    // =====================================

    // Check if this reference was already processed as active
    const existingSub = await prisma.subscription.findUnique({
      where: { paymentReference }
    });

    if (existingSub && existingSub.isActive) {
      res.status(400).json({ message: 'Payment reference already processed' });
      return;
    }

    // Update the pending subscription to active (365 days)
    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    let subscription;
    
    if (existingSub) {
      subscription = await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          paymentStatus: 'COMPLETED',
          startDate,
          endDate,
          isActive: true
        }
      });
    } else {
      // Fallback if somehow it wasn't tracked
      subscription = await prisma.subscription.create({
        data: {
          landlordId,
          paymentReference,
          paymentStatus: 'COMPLETED',
          startDate,
          endDate,
          isActive: true
        }
      });
    }

    res.status(200).json({ message: 'Subscription activated successfully', subscription });

  } catch (error: any) {
    console.error('Verify payment error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to verify payment with Paystack' });
  }
};

export const checkExpirations = async (req: Request, res: Response): Promise<void> => {
  try {
    // In a real app, this would be triggered by a daily cron job
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { isActive: true },
      include: { landlord: { select: { id: true, email: true, firstName: true } } }
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
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { isActive: false }
        });
        expiredCount++;
      } else if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
        // Notify at 7, 3, and 1 days before expiry
        await notifySubscriptionExpirySoon({
          landlordId: sub.landlord.id,
          landlordEmail: sub.landlord.email,
          landlordName: sub.landlord.firstName,
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
