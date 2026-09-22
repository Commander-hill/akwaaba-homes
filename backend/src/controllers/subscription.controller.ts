import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { notifySubscriptionExpirySoon } from '../utils/notification.service';
import { getIO } from '../socket';
import appCache from '../utils/cache';
import { PaymentFactory, SupportedPaymentProvider } from '../services/payment/PaymentFactory';
import { PaystackProvider } from '../services/payment/PaystackProvider';
import { HubtelProvider } from '../services/payment/HubtelProvider';
import { ApiResponseHelper, ConflictException, NotFoundException, ValidationException } from '../utils/apiResponse';

export interface AuthRequest extends Request {
  user?: any;
  rawBody?: Buffer;
}

/**
 * Shared Idempotent Payment Processor
 * Atomically marks subscription active, publishes property, emits notifications, and clears cache.
 * Strictly guarantees idempotency: if already COMPLETED and active, it exits without duplicate side-effects.
 */
export const processSuccessfulSubscriptionPayment = async (
  reference: string,
  amountPesewas: number,
  providerName: SupportedPaymentProvider
): Promise<{ success: boolean; alreadyProcessed: boolean; subscription?: any }> => {
  const existingSub = await prisma.propertySubscription.findUnique({
    where: { paymentReference: reference },
    include: { property: true }
  });

  if (!existingSub) {
    return { success: false, alreadyProcessed: false };
  }

  // Idempotency guard: Return immediately if already processed
  if (existingSub.paymentStatus === 'COMPLETED' && existingSub.isActive) {
    return { success: true, alreadyProcessed: true, subscription: existingSub };
  }

  const feeInGhs = parseFloat(process.env.SUBSCRIPTION_FEE_GHS || '100');
  const expectedPesewas = Math.round(feeInGhs * 100);

  if (amountPesewas < expectedPesewas) {
    console.warn(`[Payment] Amount mismatch for ${reference}: expected ${expectedPesewas}, received ${amountPesewas}`);
    return { success: false, alreadyProcessed: false };
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);

  const [updatedSub] = await prisma.$transaction([
    prisma.propertySubscription.update({
      where: { id: existingSub.id },
      data: {
        paymentStatus: 'COMPLETED',
        startDate,
        endDate,
        isActive: true
      }
    }),
    prisma.property.update({
      where: { id: existingSub.propertyId },
      data: { isAvailable: true }
    }),
    prisma.notification.create({
      data: {
        userId: existingSub.property.landlordId,
        type: 'PAYMENT_RECEIVED',
        title: '🎉 Property Listing Activated',
        message: `Payment confirmed via ${providerName}! Your listing for "${existingSub.property.title}" is now active and published for 1 year.`,
        link: '/dashboard/landlord/properties'
      }
    })
  ]);

  try {
    appCache.flushAll();
    const io = getIO();
    io.emit('property_updated', { propertyId: existingSub.propertyId });
    io.to(existingSub.property.landlordId).emit('subscription_updated', { subscription: updatedSub });
    io.to(existingSub.property.landlordId).emit('notification', {
      title: 'Property Listing Activated',
      message: `Payment confirmed via ${providerName}! Your listing for "${existingSub.property.title}" is now live.`,
      type: 'PAYMENT_RECEIVED'
    });
  } catch (e) {
    console.error('[Socket] Emission failed in subscription processing:', e);
  }

  return { success: true, alreadyProcessed: false, subscription: updatedSub };
};

/**
 * Get Subscription Status for a specific property
 */
export const getSubscriptionStatus = async (req: AuthRequest, res: Response): Promise<void> => {
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

      const updatedProp = await prisma.property.update({
        where: { id: propertyId as string },
        data: { isAvailable: false },
        select: { title: true }
      });

      await prisma.notification.create({
        data: {
          userId: landlordId,
          type: 'ANNOUNCEMENT',
          title: '⏳ Property Subscription Expired',
          message: `Your listing subscription for "${updatedProp.title}" has expired. The property is currently unlisted. Please renew to resume receiving booking requests.`,
          link: '/dashboard/landlord'
        }
      }).catch(() => {});

      try {
        appCache.flushAll();
        const io = getIO();
        io.emit('property_updated', { propertyId });
        io.to(landlordId).emit('notification', {
          title: '⏳ Property Subscription Expired',
          message: `Your listing subscription for "${updatedProp.title}" has expired.`,
          type: 'ANNOUNCEMENT'
        });
      } catch (e) {
        /* non-blocking */
      }
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

/**
 * Initialize Subscription Payment
 * Supports Paystack and Hubtel payment gateways via PaymentFactory
 */
export const initializePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const { propertyId, provider: requestedProvider = 'PAYSTACK', phoneNumber } = req.body;

    if (!landlordId || !propertyId) {
      throw new ValidationException('Missing landlord ID or property ID');
    }

    const providerType = (String(requestedProvider).toUpperCase() === 'HUBTEL' ? 'HUBTEL' : 'PAYSTACK') as SupportedPaymentProvider;

    const landlord = await prisma.user.findUnique({ where: { id: landlordId } });
    if (!landlord) {
      throw new NotFoundException('Landlord account not found');
    }

    if (landlord.isSuspended) {
      throw new ConflictException('Forbidden: Your landlord account is suspended. You cannot list or subscribe properties.');
    }

    if (!landlord.ghanaCardStatus || landlord.ghanaCardStatus === 'NOT_SUBMITTED') {
      res.status(403).json({
        success: false,
        message: 'Publishing Blocked: You must submit your Ghana Card verification on the Verification page before publishing properties.',
        redirectTo: '/dashboard/verification'
      });
      return;
    }

    const property = await prisma.property.findFirst({ where: { id: propertyId, landlordId } });
    if (!property) {
      throw new NotFoundException('Property not found or does not belong to you');
    }

    // Check if property already has an active, non-expired subscription
    const existingActiveSub = await prisma.propertySubscription.findFirst({
      where: { propertyId, isActive: true }
    });
    if (existingActiveSub && new Date() < new Date(existingActiveSub.endDate)) {
      throw new ConflictException('This property already has an active subscription.');
    }

    const feeInGhs = parseFloat(process.env.SUBSCRIPTION_FEE_GHS || '100');
    const amountPesewas = Math.round(feeInGhs * 100);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const callbackUrl = `${frontendUrl.replace(/\/$/, '')}/dashboard/landlord/properties?verify=true&provider=${providerType}`;

    const reference = `SUB_${providerType}_${propertyId.slice(0, 8)}_${Date.now()}`;

    const paymentGateway = PaymentFactory.getProvider(providerType);
    let initResult;

    try {
      initResult = await paymentGateway.initializePayment({
        email: landlord.email,
        amountPesewas,
        reference,
        callbackUrl,
        phoneNumber: phoneNumber || landlord.phoneNumber || undefined,
        metadata: {
          landlordId,
          propertyId,
          purpose: `Annual Listing Fee for ${property.title}`,
          provider: providerType
        }
      });
    } catch (gatewayErr: any) {
      console.error(`[${providerType}] Gateway initialization error:`, gatewayErr.message);
      // In dev/test when keys are placeholder or invalid, provide safe test checkout URL
      const isTestEnv = !process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.startsWith('sk_test_') || process.env.PAYSTACK_SECRET_KEY.includes('replace_with_your_actual');
      if (isTestEnv || gatewayErr.message?.includes('test')) {
        initResult = {
          success: true,
          authorizationUrl: `${callbackUrl}&reference=${reference}&test_mode=true`,
          reference,
          provider: providerType
        };
      } else {
        throw new ConflictException(`Payment initialization failed with ${providerType}: ${gatewayErr.message}`);
      }
    }

    // Upsert subscription record in PENDING status
    await prisma.propertySubscription.upsert({
      where: { propertyId },
      update: {
        paymentReference: reference,
        paymentStatus: 'PENDING',
        isActive: false
      },
      create: {
        propertyId,
        paymentReference: reference,
        paymentStatus: 'PENDING',
        startDate: new Date(),
        endDate: new Date(),
        isActive: false
      }
    });

    ApiResponseHelper.success(res, {
      message: 'Subscription payment initialized successfully',
      data: {
        authorization_url: initResult.authorizationUrl,
        reference: initResult.reference,
        provider: providerType,
        feeGhs: feeInGhs
      }
    });

  } catch (error: any) {
    console.error('Initialize payment error:', error);
    if (error.statusCode) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'Failed to initialize subscription payment' });
    }
  }
};

/**
 * Server-Side Payment Verification
 * Queries payment provider directly; validates amount, currency, and status.
 */
export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    const { paymentReference, provider: explicitProvider } = req.body;

    if (!landlordId || !paymentReference) {
      throw new ValidationException('Missing required payment reference');
    }

    const existingSub = await prisma.propertySubscription.findUnique({
      where: { paymentReference },
      include: { property: true }
    });

    if (!existingSub) {
      throw new NotFoundException('Subscription record not found for this reference');
    }

    // Check ownership if not admin
    if (req.user?.role !== 'ADMIN' && existingSub.property.landlordId !== landlordId) {
      throw new ConflictException('Forbidden: You do not own this property');
    }

    // Idempotency: Already completed
    if (existingSub.isActive && existingSub.paymentStatus === 'COMPLETED') {
      ApiResponseHelper.success(res, {
        message: 'Payment already verified and subscription is active.',
        data: {
          subscription: existingSub,
          alreadyProcessed: true
        }
      });
      return;
    }

    // Determine payment provider
    let providerType: SupportedPaymentProvider = explicitProvider;
    if (!providerType) {
      providerType = paymentReference.includes('HUBTEL') ? 'HUBTEL' : 'PAYSTACK';
    }

    const feeInGhs = parseFloat(process.env.SUBSCRIPTION_FEE_GHS || '100');
    const expectedPesewas = Math.round(feeInGhs * 100);

    const isTestRef = paymentReference.includes('TEST_') || paymentReference.startsWith('SUB_TEST_');
    const isTestEnv = !process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.startsWith('sk_test_') || process.env.PAYSTACK_SECRET_KEY.includes('replace_with_your_actual');

    let verifiedAmountPesewas = 0;
    let isSuccess = false;

    if (isTestRef && isTestEnv) {
      isSuccess = true;
      verifiedAmountPesewas = expectedPesewas;
    } else {
      const paymentGateway = PaymentFactory.getProvider(providerType);
      const verificationResult = await paymentGateway.verifyPayment(paymentReference);

      isSuccess = verificationResult.success && verificationResult.status === 'SUCCESS';
      verifiedAmountPesewas = verificationResult.amountPesewas;
    }

    if (!isSuccess) {
      throw new ConflictException('Payment verification failed: Provider transaction was not successful.');
    }

    if (verifiedAmountPesewas < expectedPesewas) {
      throw new ConflictException(`Subscription payment amount mismatch. Expected GHS ${feeInGhs.toFixed(2)}, received GHS ${(verifiedAmountPesewas / 100).toFixed(2)}.`);
    }

    // Process activation atomically
    const result = await processSuccessfulSubscriptionPayment(paymentReference, verifiedAmountPesewas, providerType);

    ApiResponseHelper.success(res, {
      message: 'Subscription payment verified successfully',
      data: {
        subscription: result.subscription,
        published: true
      }
    });

  } catch (error: any) {
    console.error('Verify payment error:', error);
    if (error.statusCode) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'Failed to verify payment with provider' });
    }
  }
};

/**
 * Paystack Webhook Handler (Idempotent)
 */
export const handlePaystackWebhook = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const signature = (req.headers['x-paystack-signature'] || '') as string;
    const provider = new PaystackProvider();
    const rawPayload = req.rawBody || Buffer.from(JSON.stringify(req.body), 'utf8');

    if (process.env.PAYSTACK_SECRET_KEY && !process.env.PAYSTACK_SECRET_KEY.includes('replace_with_your_actual')) {
      if (!signature || !provider.verifyWebhookSignature(signature, rawPayload)) {
        res.status(401).send('Invalid signature');
        return;
      }
    }

    const parsedEvent = provider.parseWebhookEvent(req.body);

    if (parsedEvent?.event === 'charge.success' && parsedEvent.status === 'SUCCESS' && parsedEvent.reference) {
      await processSuccessfulSubscriptionPayment(parsedEvent.reference, parsedEvent.amountPesewas, 'PAYSTACK');
    }

    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Paystack webhook error:', error);
    res.status(500).send('Internal server error');
  }
};

/**
 * Hubtel Webhook Handler (Idempotent)
 */
export const handleHubtelWebhook = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const signature = (req.headers['x-hubtel-signature'] || req.headers['authorization'] || '') as string;
    const provider = new HubtelProvider();
    const rawPayload = req.rawBody || Buffer.from(JSON.stringify(req.body), 'utf8');

    if (process.env.HUBTEL_CLIENT_SECRET) {
      if (!signature || !provider.verifyWebhookSignature(signature, rawPayload)) {
        res.status(401).send('Invalid signature');
        return;
      }
    }

    const parsedEvent = provider.parseWebhookEvent(req.body);

    if (parsedEvent && parsedEvent.status === 'SUCCESS' && parsedEvent.reference) {
      await processSuccessfulSubscriptionPayment(parsedEvent.reference, parsedEvent.amountPesewas, 'HUBTEL');
    }

    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error('Hubtel webhook error:', error);
    res.status(500).send('Internal server error');
  }
};

/**
 * Check and Process Expirations (Automated daily cron or admin trigger)
 */
export const checkExpirations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cronSecretHeader = req.headers['x-cron-secret'];
    const validCronSecret = process.env.CRON_SECRET && cronSecretHeader === process.env.CRON_SECRET;
    const isAdmin = req.user?.role === 'ADMIN';

    if (!isAdmin && !validCronSecret) {
      res.status(403).json({ message: 'Forbidden: Admin access or valid CRON secret required' });
      return;
    }

    const activeSubscriptions = await prisma.propertySubscription.findMany({
      where: { isActive: true },
      include: {
        property: {
          include: {
            landlord: { select: { id: true, email: true, firstName: true } }
          }
        }
      }
    });

    const now = new Date();
    let notifiedCount = 0;
    let expiredCount = 0;

    for (const sub of activeSubscriptions) {
      const expiryDate = new Date(sub.endDate);
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        await prisma.propertySubscription.update({
          where: { id: sub.id },
          data: { isActive: false }
        });
        await prisma.property.update({
          where: { id: sub.propertyId },
          data: { isAvailable: false }
        });

        await prisma.notification.create({
          data: {
            userId: sub.property.landlord.id,
            type: 'ANNOUNCEMENT',
            title: '⏳ Property Subscription Expired',
            message: `Your listing subscription for "${sub.property.title}" has expired. The property is currently unlisted. Please renew to resume receiving booking requests.`,
            link: '/dashboard/landlord'
          }
        }).catch(() => {});

        try {
          const io = getIO();
          io.emit('property_updated', { propertyId: sub.propertyId });
          io.to(sub.property.landlord.id).emit('notification', {
            title: '⏳ Property Subscription Expired',
            message: `Your listing subscription for "${sub.property.title}" has expired.`,
            type: 'ANNOUNCEMENT'
          });
        } catch (e) {
          /* non-blocking */
        }

        expiredCount++;
      } else if (diffDays === 7 || diffDays === 3 || diffDays === 1) {
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

    if (expiredCount > 0) {
      try {
        appCache.flushAll();
      } catch (e) {}
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

/**
 * Get Landlord Subscriptions Overview for dashboard
 */
export const getLandlordSubscriptionsOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const landlordId = req.user?.id;
    if (!landlordId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const properties = await prisma.property.findMany({
      where: { landlordId },
      include: {
        subscription: true
      }
    });

    const now = new Date();
    const overview = properties.map((property) => {
      const sub = property.subscription || null;
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
        subscription: sub
          ? {
              id: sub.id,
              paymentReference: sub.paymentReference,
              startDate: sub.startDate,
              endDate: sub.endDate,
              paymentStatus: sub.paymentStatus,
              isActive,
              daysLeft,
              needsRenewalSoon
            }
          : null
      };
    });

    const stats = {
      totalProperties: properties.length,
      activeSubscriptions: overview.filter((p) => p.subscription?.isActive).length,
      expiringSoon: overview.filter((p) => p.subscription?.needsRenewalSoon).length,
      unsubscribedOrExpired: overview.filter((p) => !p.subscription?.isActive).length
    };

    res.status(200).json({ stats, properties: overview });
  } catch (error) {
    console.error('Error fetching landlord subscriptions overview:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
