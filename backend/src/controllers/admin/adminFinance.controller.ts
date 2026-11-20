import { Request, Response } from 'express';
import { emitToAdmins, getIO } from '../../socket';
import prisma from '../../utils/prisma';
import axios from 'axios';
import { reconcilePendingPayments } from '../../utils/paymentReconciliation';
import { logAudit } from '../../utils/auditLogger';
import appCache from '../../utils/cache';
import { safeJsonParse } from '../../utils/json';

export const getAllSubscriptions = async (req: Request, res: Response): Promise<void> => {
  try {
    const subscriptions = await prisma.propertySubscription.findMany({
      take: 500,
      include: {
        property: {
          include: {
            landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true, isSuspended: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Enrich each subscription with days remaining
    const now = new Date();
    const enriched = subscriptions.map(sub => {
      const endDate = new Date(sub.endDate);
      const diffMs = endDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const rawImages = sub.property?.images;
      const parsedImages =
        typeof rawImages === 'string'
          ? safeJsonParse(rawImages, [])
          : Array.isArray(rawImages)
            ? rawImages
            : [];
      const propertyThumbnail = Array.isArray(parsedImages) ? (parsedImages[0] || null) : null;
      return { ...sub, daysRemaining, propertyThumbnail };
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSubscriptionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const subscription = await prisma.propertySubscription.findUnique({
      where: { id },
      include: {
        property: {
          include: {
            landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true, isSuspended: true } }
          }
        }
      }
    });

    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const diffMs = endDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    res.status(200).json({ ...subscription, daysRemaining });
  } catch (error) {
    console.error('Error fetching subscription by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const activateSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const subscription = await prisma.propertySubscription.findUnique({
      where: { id },
      include: { property: { include: { landlord: { select: { id: true, firstName: true } } } } }
    });

    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const updated = await prisma.propertySubscription.update({
      where: { id },
      data: { isActive: true, paymentStatus: 'COMPLETED', startDate, endDate }
    });

    await prisma.property.update({
      where: { id: subscription.propertyId },
      data: { isAvailable: true }
    });

    await logAudit(
      req.user.id, 'ACTIVATE_SUBSCRIPTION', 'PropertySubscription', id,
      { isActive: false }, { isActive: true },
      req.ip || req.socket.remoteAddress
    );

    try {
      appCache.flushAll();
      getIO().to(subscription.property.landlord.id).emit('notification', {
        title: 'Subscription Activated',
        message: `Your listing for "${subscription.property.title}" has been manually activated by an admin.`,
        type: 'subscription'
      });
    } catch (e) { /* socket optional */ }

    res.status(200).json({ message: 'Subscription activated successfully', subscription: updated });
  } catch (error) {
    console.error('Error activating subscription:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const revokeSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { reason } = req.body;

    const subscription = await prisma.propertySubscription.findUnique({
      where: { id },
      include: { property: { include: { landlord: { select: { id: true, firstName: true } } } } }
    });

    if (!subscription) {
      res.status(404).json({ message: 'Subscription not found' });
      return;
    }

    const updated = await prisma.propertySubscription.update({
      where: { id },
      data: { isActive: false, paymentStatus: 'FAILED' }
    });

    await prisma.property.update({
      where: { id: subscription.propertyId },
      data: { isAvailable: false }
    });

    await logAudit(
      req.user.id, 'REVOKE_SUBSCRIPTION', 'PropertySubscription', id,
      { isActive: true }, { isActive: false, reason: reason || 'Admin revocation' },
      req.ip || req.socket.remoteAddress
    );

    try {
      appCache.flushAll();
      getIO().to(subscription.property.landlord.id).emit('notification', {
        title: 'Listing Subscription Revoked',
        message: `Your listing for "${subscription.property.title}" has been suspended by an admin. Reason: ${reason || 'Terms of Service violation'}.`,
        type: 'subscription'
      });
    } catch (e) { /* socket optional */ }

    res.status(200).json({ message: 'Subscription revoked successfully', subscription: updated });
  } catch (error) {
    console.error('Error revoking subscription:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const transactions = await prisma.transaction.findMany({
      take: 500,
      include: {
        tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true } },
        landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true } },
        property: { select: { id: true, title: true, location: true, type: true, images: true } },
        booking: { select: { id: true, startDate: true, endDate: true, status: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.status(200).json(transactions);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTransactionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true } },
        landlord: { select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true } },
        property: { select: { id: true, title: true, location: true, type: true, images: true } },
        booking: {
          include: {
            leaseAgreement: { select: { id: true, status: true, cryptographicHash: true } }
          }
        }
      }
    });

    if (!transaction) {
      res.status(404).json({ message: 'Transaction not found' });
      return;
    }

    res.status(200).json(transaction);
  } catch (error) {
    console.error('Error fetching transaction by id:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ── ADMIN PAYOUTS & DISBURSEMENTS ──
 */
export const getAllPayouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const status = typeof req.query.status === 'string' ? req.query.status : 'ALL';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { accountName: { contains: search, mode: 'insensitive' } },
        { accountNumber: { contains: search, mode: 'insensitive' } },
        { transferReference: { contains: search, mode: 'insensitive' } },
        { bankOrNetwork: { contains: search, mode: 'insensitive' } },
        { landlord: { firstName: { contains: search, mode: 'insensitive' } } },
        { landlord: { lastName: { contains: search, mode: 'insensitive' } } },
        { landlord: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [payouts, total, statusCounts] = await Promise.all([
      prisma.payoutRequest.findMany({
        where,
        include: {
          landlord: {
            select: { id: true, firstName: true, lastName: true, email: true, phoneNumber: true, avatarUrl: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.payoutRequest.count({ where }),
      prisma.payoutRequest.groupBy({
        by: ['status'],
        _count: { _all: true },
        _sum: { amount: true }
      })
    ]);

    const stats = {
      totalCount: total,
      pendingCount: 0,
      pendingSum: 0,
      processingCount: 0,
      processingSum: 0,
      successCount: 0,
      successSum: 0,
      failedCount: 0,
      failedSum: 0
    };

    statusCounts.forEach((s) => {
      const amt = s._sum.amount || 0;
      const cnt = s._count._all || 0;
      if (s.status === 'PENDING') {
        stats.pendingCount = cnt;
        stats.pendingSum = amt;
      } else if (s.status === 'PROCESSING') {
        stats.processingCount = cnt;
        stats.processingSum = amt;
      } else if (s.status === 'SUCCESS') {
        stats.successCount = cnt;
        stats.successSum = amt;
      } else if (s.status === 'FAILED') {
        stats.failedCount = cnt;
        stats.failedSum = amt;
      }
    });

    // Cross-reference active breach disputes to enforce Dispute Holding Escrow Freeze
    const landlordIds = Array.from(new Set(payouts.map((p) => p.landlordId)));
    const activeDisputes = await prisma.breachReport.findMany({
      where: {
        property: { landlordId: { in: landlordIds } },
        status: { in: ['PENDING', 'UNDER_REVIEW', 'VERIFIED'] }
      },
      select: {
        id: true,
        title: true,
        status: true,
        property: { select: { landlordId: true, title: true } }
      }
    });

    const disputeMap = new Map();
    for (const d of activeDisputes) {
      const lId = d.property?.landlordId;
      if (lId && !disputeMap.has(lId)) {
        disputeMap.set(lId, {
          disputeId: d.id,
          title: d.title,
          propertyTitle: d.property?.title,
          status: d.status
        });
      }
    }

    const enrichedPayouts = payouts.map((p) => {
      const activeDisp = disputeMap.get(p.landlordId);
      return {
        ...p,
        disputeHold: !!activeDisp,
        activeDispute: activeDisp || null
      };
    });

    res.status(200).json({
      payouts: enrichedPayouts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching admin payouts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePayoutStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { status, failureReason } = req.body;

    if (!['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED'].includes(status)) {
      res.status(400).json({ message: 'Invalid payout status' });
      return;
    }

    const payout = await prisma.payoutRequest.findUnique({ where: { id } });
    if (!payout) {
      res.status(404).json({ message: 'Payout request not found' });
      return;
    }

    // Enforce Dispute Holding Escrow Freeze: Block release if landlord has active breach dispute
    if (status === 'SUCCESS') {
      const activeDispute = await prisma.breachReport.findFirst({
        where: {
          property: { landlordId: payout.landlordId },
          status: { in: ['PENDING', 'UNDER_REVIEW', 'VERIFIED'] }
        }
      });
      if (activeDispute) {
        res.status(403).json({
          message: `Dispute Holding Escrow Freeze Active: Host has an unresolved lease dispute ("${activeDispute.title}"). Escrow funds remain frozen until this dispute is resolved.`
        });
        return;
      }
    }

    const updated = await prisma.payoutRequest.update({
      where: { id },
      data: {
        status,
        failureReason: failureReason || null,
        processedAt: status === 'SUCCESS' ? new Date() : payout.processedAt
      }
    });

    await logAudit(
      req.user.id,
      'ADMIN_UPDATE_PAYOUT_STATUS',
      'PayoutRequest',
      id,
      { previousStatus: payout.status },
      { newStatus: status, failureReason },
      req.ip || 'ADMIN_CONSOLE'
    );

    res.status(200).json({ message: 'Payout status updated', payout: updated });
  } catch (error) {
    console.error('Error updating payout status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ── MANUAL ESCROW RECONCILIATION TRIGGER (PAYOUT RESILIENCE) ──
 * Allows financial officers to immediately force a status query to Paystack/Telcos
 * for stuck or pending MoMo/bank transfers and escrow deposits.
 */
export const reconcileManualEscrow = async (req: Request, res: Response): Promise<void> => {
  try {
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    const isMock = !paystackKey || paystackKey.includes('replace_with_your_actual');

    // 1. Fetch pending/processing payouts
    const pendingPayouts = await prisma.payoutRequest.findMany({
      where: {
        status: { in: ['PENDING', 'PROCESSING'] }
      },
      include: {
        landlord: { select: { id: true, firstName: true, lastName: true, email: true } }
      },
      take: 50
    });

    let payoutsResolved = 0;
    let payoutsFailed = 0;

    for (const payout of pendingPayouts) {
      if (payout.transferReference && !isMock) {
        try {
          const res = await axios.get(`https://api.paystack.co/transfer/verify/${payout.transferReference}`, {
            headers: { Authorization: `Bearer ${paystackKey}` },
            timeout: 6000
          });
          const transferData = res.data?.data;
          const transferStatus = transferData?.status?.toLowerCase();

          if (transferStatus === 'success') {
            await prisma.payoutRequest.update({
              where: { id: payout.id },
              data: {
                status: 'SUCCESS',
                processedAt: new Date(),
                failureReason: null
              }
            });
            payoutsResolved++;
          } else if (transferStatus === 'failed' || transferStatus === 'reversed') {
            await prisma.payoutRequest.update({
              where: { id: payout.id },
              data: {
                status: 'FAILED',
                failureReason: transferData?.gateway_response || 'Transfer failed at Telco gateway'
              }
            });
            payoutsFailed++;
          }
        } catch (err: any) {
          console.warn(`[ReconcileEscrow] Error verifying transfer ref ${payout.transferReference}:`, err.response?.data?.message || err.message);
        }
      }
    }

    // 2. Also run payment reconciliation for incoming tenant escrow deposits
    let paymentsChecked = 0;
    let paymentsResolved = 0;
    try {
      const paymentRecResult = await reconcilePendingPayments();
      paymentsChecked = paymentRecResult.checked;
      paymentsResolved = paymentRecResult.resolved;
    } catch (e) {}

    // Invalidate caches
    appCache.del('admin_stats');
    appCache.del('admin_payouts');

    // Log audit
    await logAudit(
      req.user.id,
      'ADMIN_MANUAL_ESCROW_RECONCILE',
      'PayoutRequest',
      'ESCROW_RECONCILIATION_BATCH',
      null,
      {
        payoutsChecked: pendingPayouts.length,
        payoutsResolved,
        payoutsFailed,
        paymentsChecked,
        paymentsResolved,
        isMock
      },
      req.ip || 'ADMIN_CONSOLE'
    );

    // Emit real-time socket events
    try {
      emitToAdmins('admin_action_required', { type: 'ESCROW_RECONCILED' });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: `Reconciliation completed: ${payoutsResolved} stuck payouts settled, ${payoutsFailed} failed transfers marked, ${paymentsResolved} incoming escrow deposits fulfilled.`,
      stats: {
        payoutsChecked: pendingPayouts.length,
        payoutsResolved,
        payoutsFailed,
        paymentsChecked,
        paymentsResolved
      }
    });
  } catch (error) {
    console.error('Error in reconcileManualEscrow:', error);
    res.status(500).json({ message: 'Failed to execute manual escrow reconciliation.' });
  }
};
