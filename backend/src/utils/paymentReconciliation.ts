import axios from 'axios';
import prisma from './prisma';
import { fulfillBookingPayment } from '../controllers/transaction.controller';

/**
 * Background Payment Reconciliation Worker
 * Resolves Mobile Money (MoMo) webhook delays and network drops:
 * Automatically polls Paystack for pending bookings that have an initiated payment reference.
 */
export const reconcilePendingPayments = async (): Promise<{ checked: number; resolved: number }> => {
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackKey || paystackKey.includes('replace_with_your_actual')) {
    return { checked: 0, resolved: 0 };
  }

  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Find pending bookings that have an initiated payment reference
    const pendingBookings = await prisma.booking.findMany({
      where: {
        status: 'PENDING',
        paymentReference: {
          not: null
        },
        createdAt: {
          gte: thirtyMinutesAgo
        }
      },
      select: {
        id: true,
        paymentReference: true,
        createdAt: true
      },
      take: 20
    });

    if (pendingBookings.length === 0) {
      return { checked: 0, resolved: 0 };
    }

    let resolvedCount = 0;

    for (const bkg of pendingBookings) {
      if (!bkg.paymentReference || bkg.paymentReference.startsWith('BOOKING_TEST_')) {
        continue;
      }

      try {
        const res = await axios.get(`https://api.paystack.co/transaction/verify/${bkg.paymentReference}`, {
          headers: { Authorization: `Bearer ${paystackKey}` },
          timeout: 5000
        });

        const txData = res.data?.data;
        if (txData?.status === 'success') {
          console.log(`[PaymentReconciliation] Auto-fulfilling booking ${bkg.id} via Paystack ref ${bkg.paymentReference}`);
          const result = await fulfillBookingPayment({
            bookingId: bkg.id,
            reference: bkg.paymentReference,
            paidAmountGhs: txData.amount ? txData.amount / 100 : undefined,
            channel: txData.channel || 'mobile_money',
            ipAddress: 'PAYMENT_RECONCILIATION_CRON'
          });

          if (result.success) {
            resolvedCount += 1;
          }
        }
      } catch (err: any) {
        // Log gently without crashing loop
        console.warn(`[PaymentReconciliation] Ref ${bkg.paymentReference} check skipped: ${err.response?.data?.message || err.message}`);
      }
    }

    return { checked: pendingBookings.length, resolved: resolvedCount };
  } catch (error) {
    console.error('[PaymentReconciliation] Error running reconciliation loop:', error);
    return { checked: 0, resolved: 0 };
  }
};
