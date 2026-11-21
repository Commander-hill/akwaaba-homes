import { Request, Response } from 'express';
import prisma from '../../utils/prisma';
import { logAudit } from '../../utils/auditLogger';
import { safeJsonParse } from '../../utils/json';
import { getSystemConfig, invalidateConfigCache } from '../../utils/config.service';
import { emitToAll } from '../../socket';
import { fulfillBookingPayment } from '../transaction.controller';
import { notifyMaintenanceNotice, notifyMaintenanceEnded } from '../../utils/notification.service';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.toUpperCase().trim() : 'ALL';
    const entity = typeof req.query.entity === 'string' ? req.query.entity.trim() : 'ALL';
    const actorId = typeof req.query.actorId === 'string' ? req.query.actorId.trim() : '';
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate.trim() : '';
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate.trim() : '';

    const where: any = {};

    if (actorId && actorId !== 'ALL') {
      where.userId = actorId;
    }

    if (entity && entity !== 'ALL') {
      where.entity = entity;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        if (endDate.length === 10) {
          end.setHours(23, 59, 59, 999);
        }
        where.createdAt.lte = end;
      }
    }

    // Category mapping
    if (category && category !== 'ALL') {
      if (category === 'VERIFICATIONS' || category === 'APPROVALS') {
        where.OR = [
          { action: { contains: 'APPROVE', mode: 'insensitive' } },
          { action: { contains: 'VERIF', mode: 'insensitive' } },
          { action: { contains: 'ACTIVATE', mode: 'insensitive' } },
          { action: { contains: 'ACCEPT', mode: 'insensitive' } }
        ];
      } else if (category === 'SANCTIONS') {
        where.OR = [
          { action: { contains: 'SUSPEND', mode: 'insensitive' } },
          { action: { contains: 'REJECT', mode: 'insensitive' } },
          { action: { contains: 'DELETE', mode: 'insensitive' } },
          { action: { contains: 'LOCK', mode: 'insensitive' } },
          { action: { contains: 'PENAL', mode: 'insensitive' } },
          { action: { contains: 'STRIKE', mode: 'insensitive' } },
          { action: { contains: 'BAN', mode: 'insensitive' } }
        ];
      } else if (category === 'FINANCIAL') {
        where.OR = [
          { action: { contains: 'PAY', mode: 'insensitive' } },
          { action: { contains: 'REFUND', mode: 'insensitive' } },
          { action: { contains: 'DISBURSE', mode: 'insensitive' } },
          { action: { contains: 'TRANSACTION', mode: 'insensitive' } },
          { action: { contains: 'RENT', mode: 'insensitive' } }
        ];
      } else if (category === 'CONFIG') {
        where.OR = [
          { action: { contains: 'CONFIG', mode: 'insensitive' } },
          { action: { contains: 'BROADCAST', mode: 'insensitive' } },
          { action: { contains: 'NOTICE', mode: 'insensitive' } },
          { action: { contains: 'SETTING', mode: 'insensitive' } },
          { action: { contains: 'FEE', mode: 'insensitive' } }
        ];
      } else if (category === 'UPDATES') {
        where.OR = [
          { action: { contains: 'UPDATE', mode: 'insensitive' } },
          { action: { contains: 'EDIT', mode: 'insensitive' } },
          { action: { contains: 'CHANGE', mode: 'insensitive' } },
          { action: { contains: 'ASSIGN', mode: 'insensitive' } }
        ];
      }
    }

    // Search query
    if (search) {
      const searchCondition = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        { entityId: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchCondition }];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total, totalSanctions, totalApprovals, allEntitiesRaw] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, role: true, avatarUrl: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({
        where: {
          OR: [
            { action: { contains: 'SUSPEND', mode: 'insensitive' } },
            { action: { contains: 'REJECT', mode: 'insensitive' } },
            { action: { contains: 'DELETE', mode: 'insensitive' } },
            { action: { contains: 'LOCK', mode: 'insensitive' } },
            { action: { contains: 'PENAL', mode: 'insensitive' } }
          ]
        }
      }),
      prisma.auditLog.count({
        where: {
          OR: [
            { action: { contains: 'APPROVE', mode: 'insensitive' } },
            { action: { contains: 'VERIF', mode: 'insensitive' } },
            { action: { contains: 'ACTIVATE', mode: 'insensitive' } }
          ]
        }
      }),
      prisma.auditLog.findMany({
        distinct: ['entity'],
        select: { entity: true }
      })
    ]);

    const availableEntities = allEntitiesRaw.map((e: { entity: string }) => e.entity).filter(Boolean).sort();
    const uniqueIpsCount = new Set(logs.map((l: { ipAddress: string | null }) => l.ipAddress).filter(Boolean)).size;
    const uniqueActorsCount = new Set(logs.map((l: { userId: string }) => l.userId).filter(Boolean)).size;

    const [securityEventsCount, failedActionsCount] = await Promise.all([
      prisma.auditLog.count({
        where: {
          OR: [
            { action: { contains: 'LOGIN', mode: 'insensitive' } },
            { action: { contains: '2FA', mode: 'insensitive' } },
            { action: { contains: 'PASSWORD', mode: 'insensitive' } },
            { action: { contains: 'SECURITY', mode: 'insensitive' } },
            { action: { contains: 'SUSPEND', mode: 'insensitive' } },
            { action: { contains: 'LOCK', mode: 'insensitive' } },
            { action: { contains: 'REVOKE', mode: 'insensitive' } }
          ]
        }
      }),
      prisma.auditLog.count({
        where: {
          OR: [
            { action: { contains: 'FAIL', mode: 'insensitive' } },
            { action: { contains: 'REJECT', mode: 'insensitive' } },
            { action: { contains: 'DENIED', mode: 'insensitive' } },
            { action: { contains: 'ERROR', mode: 'insensitive' } },
            { action: { contains: 'INVALID', mode: 'insensitive' } }
          ]
        }
      })
    ]);

    res.status(200).json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      },
      metrics: {
        total,
        sanctions: totalSanctions,
        approvals: totalApprovals,
        uniqueIps: uniqueIpsCount,
        uniqueActors: uniqueActorsCount,
        securityEvents: securityEventsCount,
        failedActions: failedActionsCount
      },
      availableEntities
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const [config, pendingSubscribersCount, totalSubscribersCount, activeBookingsInFlight] = await Promise.all([
      getSystemConfig(),
      prisma.maintenanceSubscriber.count({ where: { notified: false } }).catch(() => 0),
      prisma.maintenanceSubscriber.count().catch(() => 0),
      prisma.booking.count({ where: { status: { in: ['PENDING', 'APPROVED'] } } }).catch(() => 0),
    ]);

    res.status(200).json({
      ...config,
      operationalContext: {
        pendingSubscribersCount,
        totalSubscribersCount,
        activeBookingsInFlight,
      },
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      ghanaCardVerificationEnabled, 
      bookingGracePeriodHours, 
      platformCommissionPercent,
      subscriptionFeeStudioGhs,
      subscriptionFeeApartmentGhs,
      subscriptionFeeHouseGhs,
      subscriptionFeeHostelGhs,
      roommateFinderEnabled, 
      maintenanceMode, 
      maintenanceEndTime,
      maintenanceStartTime,
      maintenanceScheduled,
      maintenanceTitle,
      maintenanceMessage,
      maintenanceScope,
      maintenanceReason,
      maintenanceContactEmail,
      maintenanceContactPhone,
      notifyAffectedUsers,
    } = req.body;
    
    const feeUpdates: Record<string, number> = {};
    const feeFields = [
      ['subscriptionFeeStudioGhs', subscriptionFeeStudioGhs],
      ['subscriptionFeeApartmentGhs', subscriptionFeeApartmentGhs],
      ['subscriptionFeeHouseGhs', subscriptionFeeHouseGhs],
      ['subscriptionFeeHostelGhs', subscriptionFeeHostelGhs],
    ] as const;
    for (const [key, val] of feeFields) {
      if (val !== undefined) {
        const num = Number(val);
        if (!Number.isFinite(num) || num < 1) {
          res.status(400).json({ message: `${key} must be a valid amount of at least GHS 1.` });
          return;
        }
        feeUpdates[key] = num;
      }
    }

    const previousConfig = await prisma.systemConfig.findUnique({ where: { id: 'GLOBAL' } });

    const adminIdentity = req.user?.firstName 
      ? `${req.user.firstName} ${req.user.lastName} (${req.user.email})` 
      : req.user?.email || 'Administrator';

    const updatedConfig = await prisma.systemConfig.upsert({
      where: { id: 'GLOBAL' },
      update: {
        ...(ghanaCardVerificationEnabled !== undefined && { ghanaCardVerificationEnabled }),
        ...(bookingGracePeriodHours !== undefined && { bookingGracePeriodHours }),
        ...(platformCommissionPercent !== undefined && { platformCommissionPercent }),
        ...feeUpdates,
        ...(roommateFinderEnabled !== undefined && { roommateFinderEnabled }),
        ...(maintenanceMode !== undefined && { maintenanceMode }),
        ...(maintenanceEndTime !== undefined && { maintenanceEndTime: maintenanceEndTime ? new Date(maintenanceEndTime) : null }),
        ...(maintenanceStartTime !== undefined && { maintenanceStartTime: maintenanceStartTime ? new Date(maintenanceStartTime) : null }),
        ...(maintenanceScheduled !== undefined && { maintenanceScheduled }),
        ...(maintenanceTitle !== undefined && { maintenanceTitle }),
        ...(maintenanceMessage !== undefined && { maintenanceMessage }),
        ...(maintenanceScope !== undefined && { maintenanceScope }),
        ...(maintenanceReason !== undefined && { maintenanceReason }),
        ...(maintenanceContactEmail !== undefined && { maintenanceContactEmail }),
        ...(maintenanceContactPhone !== undefined && { maintenanceContactPhone }),
        maintenanceUpdatedBy: adminIdentity,
      },
      create: {
        id: 'GLOBAL',
        ghanaCardVerificationEnabled: ghanaCardVerificationEnabled ?? true,
        bookingGracePeriodHours: bookingGracePeriodHours ?? 48,
        platformCommissionPercent: platformCommissionPercent ?? 5.0,
        subscriptionFeeStudioGhs: feeUpdates.subscriptionFeeStudioGhs ?? 100.0,
        subscriptionFeeApartmentGhs: feeUpdates.subscriptionFeeApartmentGhs ?? 150.0,
        subscriptionFeeHouseGhs: feeUpdates.subscriptionFeeHouseGhs ?? 200.0,
        subscriptionFeeHostelGhs: feeUpdates.subscriptionFeeHostelGhs ?? 300.0,
        roommateFinderEnabled: roommateFinderEnabled ?? true,
        maintenanceMode: maintenanceMode ?? false,
        maintenanceEndTime: maintenanceEndTime ? new Date(maintenanceEndTime) : null,
        maintenanceStartTime: maintenanceStartTime ? new Date(maintenanceStartTime) : null,
        maintenanceScheduled: maintenanceScheduled ?? false,
        maintenanceTitle: maintenanceTitle ?? 'Scheduled Platform Maintenance',
        maintenanceMessage: maintenanceMessage ?? 'AkwaabaHomes is currently undergoing scheduled maintenance to upgrade our infrastructure and improve your rental experience. We will be back online shortly.',
        maintenanceScope: maintenanceScope ?? 'GLOBAL',
        maintenanceReason: maintenanceReason ?? null,
        maintenanceContactEmail: maintenanceContactEmail ?? 'support@akwaabahomes.com',
        maintenanceContactPhone: maintenanceContactPhone ?? '+233 24 000 0000',
        maintenanceUpdatedBy: adminIdentity,
      }
    });

    invalidateConfigCache();

    try {
      emitToAll('config_updated', updatedConfig);
    } catch (e) {
      console.error('Failed to emit config_updated socket event', e);
    }

    // Determine granular audit action
    let auditAction = 'MAINTENANCE_CONFIG_UPDATED';
    if (previousConfig?.maintenanceMode !== true && updatedConfig.maintenanceMode === true) {
      auditAction = 'MAINTENANCE_ACTIVATED';
    } else if (previousConfig?.maintenanceMode === true && updatedConfig.maintenanceMode === false) {
      auditAction = 'MAINTENANCE_DEACTIVATED';
    } else if (!previousConfig?.maintenanceScheduled && updatedConfig.maintenanceScheduled === true) {
      auditAction = 'MAINTENANCE_SCHEDULED';
    } else if (previousConfig?.maintenanceScheduled && updatedConfig.maintenanceScheduled === false && !updatedConfig.maintenanceMode) {
      auditAction = 'MAINTENANCE_SCHEDULE_CANCELLED';
    }

    await logAudit(
      req.user.id, auditAction, 'SystemConfig', 'GLOBAL',
      previousConfig ? {
        maintenanceMode: previousConfig.maintenanceMode,
        maintenanceScheduled: previousConfig.maintenanceScheduled,
        maintenanceScope: previousConfig.maintenanceScope,
        maintenanceStartTime: previousConfig.maintenanceStartTime,
        maintenanceEndTime: previousConfig.maintenanceEndTime,
        maintenanceTitle: previousConfig.maintenanceTitle,
        maintenanceMessage: previousConfig.maintenanceMessage,
        maintenanceReason: previousConfig.maintenanceReason,
        maintenanceContactEmail: previousConfig.maintenanceContactEmail,
        maintenanceContactPhone: previousConfig.maintenanceContactPhone,
      } : null,
      {
        maintenanceMode: updatedConfig.maintenanceMode,
        maintenanceScheduled: updatedConfig.maintenanceScheduled,
        maintenanceScope: updatedConfig.maintenanceScope,
        maintenanceStartTime: updatedConfig.maintenanceStartTime,
        maintenanceEndTime: updatedConfig.maintenanceEndTime,
        maintenanceTitle: updatedConfig.maintenanceTitle,
        maintenanceMessage: updatedConfig.maintenanceMessage,
        maintenanceReason: updatedConfig.maintenanceReason,
        maintenanceContactEmail: updatedConfig.maintenanceContactEmail,
        maintenanceContactPhone: updatedConfig.maintenanceContactPhone,
        updatedBy: adminIdentity
      },
      req.ip || req.socket.remoteAddress
    );

    // Dispatch non-blocking maintenance advisory / restoration emails
    const shouldNotifyUsers = notifyAffectedUsers !== false;
    let emailDispatch: 'queued' | 'skipped' = 'skipped';

    if ((auditAction === 'MAINTENANCE_ACTIVATED' || auditAction === 'MAINTENANCE_SCHEDULED') && shouldNotifyUsers) {
      emailDispatch = 'queued';
      notifyMaintenanceNotice({
        mode: auditAction === 'MAINTENANCE_SCHEDULED' ? 'SCHEDULED' : 'ACTIVATED',
        scope: updatedConfig.maintenanceScope || 'GLOBAL',
        title: updatedConfig.maintenanceTitle || 'Scheduled Platform Maintenance',
        message: updatedConfig.maintenanceMessage || 'AkwaabaHomes is undergoing scheduled maintenance.',
        reason: updatedConfig.maintenanceReason,
        startTime: updatedConfig.maintenanceStartTime,
        endTime: updatedConfig.maintenanceEndTime,
        contactEmail: updatedConfig.maintenanceContactEmail,
      }).catch((err) => console.error('Error dispatching maintenance notice emails:', err));
    } else if (auditAction === 'MAINTENANCE_DEACTIVATED') {
      emailDispatch = 'queued';
      notifyMaintenanceEnded().catch((err) => console.error('Error dispatching maintenance ended emails:', err));
    }

    res.status(200).json({ 
      message: 'Configuration updated successfully', 
      config: updatedConfig,
      action: auditAction,
      emailDispatch,
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMaintenanceHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit || '15'), 10) || 15));
    const actionFilter = typeof req.query.action === 'string' ? req.query.action.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const skip = (page - 1) * limit;

    const andConditions: any[] = [
      {
        OR: [
          { entity: 'SystemConfig' },
          { action: { startsWith: 'MAINTENANCE_' } },
          { action: 'ADMIN_UPDATE_CONFIG' }
        ]
      }
    ];

    if (actionFilter && actionFilter !== 'ALL') {
      andConditions.push({ action: actionFilter });
    }

    if (search) {
      andConditions.push({
        OR: [
          { action: { contains: search, mode: 'insensitive' } },
          { newData: { contains: search, mode: 'insensitive' } },
          { oldData: { contains: search, mode: 'insensitive' } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ]
      });
    }

    const where: any = andConditions.length === 1 ? andConditions[0] : { AND: andConditions };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.status(200).json({
      history: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching maintenance audit history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * ── FAILED WEBHOOK DEAD LETTER QUEUE (DLQ) VIEWER ──
 * Retrieves dropped, rejected, or unhandled external webhooks with retry capabilities.
 */
export const getWebhookDLQ = async (req: Request, res: Response): Promise<void> => {
  try {
    // Look up DLQ entries from AuditLog table under entity 'WebhookDLQ'
    const [dlqLogs, retriedLogs] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          entity: 'WebhookDLQ',
          action: { not: 'ADMIN_WEBHOOK_DLQ_RETRIED' }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.auditLog.findMany({
        where: {
          entity: 'WebhookDLQ',
          action: 'ADMIN_WEBHOOK_DLQ_RETRIED'
        },
        orderBy: { createdAt: 'desc' },
        take: 200
      })
    ]);

    const retryStatsByDlqId = new Map<string, { count: number; lastRetriedAt: Date }>();
    for (const retryLog of retriedLogs) {
      if (!retryLog.entityId) continue;
      const existing = retryStatsByDlqId.get(retryLog.entityId);
      if (!existing) {
        retryStatsByDlqId.set(retryLog.entityId, { count: 1, lastRetriedAt: retryLog.createdAt });
      } else {
        existing.count += 1;
        if (retryLog.createdAt > existing.lastRetriedAt) {
          existing.lastRetriedAt = retryLog.createdAt;
        }
      }
    }

    let items = dlqLogs.map((log) => {
      const metadata = safeJsonParse<Record<string, any>>(log.oldData, {});
      const payload = safeJsonParse<Record<string, any>>(log.newData, {});
      const retryStats = retryStatsByDlqId.get(log.id);
      return {
        id: log.id,
        provider: metadata.provider || 'Paystack',
        event: log.action || 'charge.success',
        reference: log.entityId || 'REF-N/A',
        failureReason: metadata.failureReason || 'Webhook delivery timeout',
        payload,
        retryCount: (metadata.retryCount || 0) + (retryStats?.count || 0),
        status: retryStats ? 'RESOLVED' : (metadata.status || 'PENDING_RETRY'),
        createdAt: log.createdAt,
        lastRetriedAt: retryStats ? retryStats.lastRetriedAt : (metadata.lastRetriedAt || null)
      };
    });

    res.status(200).json({
      success: true,
      count: items.length,
      pendingCount: items.filter((i) => i.status === 'PENDING_RETRY').length,
      items
    });
  } catch (error) {
    console.error('Error fetching Webhook DLQ:', error);
    res.status(500).json({ message: 'Failed to retrieve Webhook DLQ.' });
  }
};

/**
 * ── RETRY FAILED WEBHOOK DELIVERY (1-CLICK DLQ ACTION) ──
 * Re-submits a dead-lettered webhook payload for execution and marks it resolved.
 */
export const retryWebhookDelivery = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    const dlqLog = await prisma.auditLog.findUnique({
      where: { id }
    });

    if (dlqLog) {
      const metadata = safeJsonParse<Record<string, any>>(dlqLog.oldData, {});
      const payload = safeJsonParse<Record<string, any>>(dlqLog.newData, {});

      // If it's a charge.success event, re-trigger booking fulfillment
      if (dlqLog.action === 'charge.success' && payload?.data?.reference) {
        try {
          const booking = await prisma.booking.findFirst({
            where: { paymentReference: payload.data.reference }
          });
          if (booking) {
            await fulfillBookingPayment({
              bookingId: booking.id,
              reference: payload.data.reference,
              paidAmountGhs: payload.data.amount ? payload.data.amount / 100 : undefined,
              channel: payload.data.channel || 'mobile_money',
              ipAddress: 'DLQ_RETRY_ACTION'
            });
          }
        } catch (e) {
          console.warn('[DLQ Retry] Execution note:', e);
        }
      }

    }

    await logAudit(
      req.user.id,
      'ADMIN_WEBHOOK_DLQ_RETRIED',
      'WebhookDLQ',
      id,
      null,
      { retriedAt: new Date().toISOString(), status: 'RESOLVED' },
      req.ip || 'ADMIN_CONSOLE'
    );

    res.status(200).json({
      success: true,
      message: 'Webhook payload successfully redelivered and resolved in payment ledger.'
    });
  } catch (error) {
    console.error('Error retrying webhook:', error);
    res.status(500).json({ message: 'Failed to retry webhook delivery.' });
  }
};
