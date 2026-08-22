// @ts-nocheck
import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { notifySubscriptionExpirySoon } from '../utils/notification.service';
import axios from 'axios';

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

    // Amount for annual property listing: GHS 100.00 = 10000 pesewas
    const amountInPesewas = 10000;

    // Check if user provided dummy Paystack key or if it's not set
    if (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.includes('replace_with_your_actual')) {
      res.status(400).json({ message: 'Paystack is not configured. Please add your PAYSTACK_SECRET_KEY to the backend .env file.' });
      return;
    }

    const callbackUrl = process.env.FRONTEND_URL
      ? `${process.env.FRONTEND_URL}/dashboard/landlord/properties?verify=true`
      : 'http://localhost:3000/dashboard/landlord/properties?verify=true';



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

    const existingSub = await prisma.propertySubscription.findUnique({ where: { propertyId } });
    if (existingSub) {
      await prisma.propertySubscription.update({
        where: { propertyId },
        data: { paymentReference: response.data.data.reference, paymentStatus: 'PENDING', isActive: false }
      });
    } else {
      await prisma.propertySubscription.create({
        data: {
          propertyId,
          paymentReference: response.data.data.reference,
          paymentStatus: 'PENDING',
          startDate: new Date(),
          endDate: new Date(),
          isActive: false
        }
      });
    }

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

export const checkExpirations = async (req: Request, res: Response): Promise<void> => {
  try {
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
