import { Router } from 'express';
import { 
  getSystemStats, 
  getActionRequiredQueue,
  getPlatformAnalytics,
  getAllUsers, 
  getUserById,
  toggleUserSuspension, 
  toggleUserProfileLock,
  getAllProperties, 
  getPropertyById,
  updatePropertyApproval,
  bulkUpdatePropertyApproval, 
  getAllBookings, 
  getBookingById,
  getAllSubscriptions,
  getSubscriptionById,
  getAllTransactions,
  getTransactionById,
  getAllReviews,
  getReviewById,
  deleteReview,
  resolveAppeal,
  getDisputeById,
  getAuditLogs,
  getLiveHealthHeartbeat,
  getWebhookDLQ,
  retryWebhookDelivery,
  getSystemActivity,
  verifyUserCard,
  verifyLandlord,
  activateSubscription,
  revokeSubscription,
  getAllTickets,
  getTicketById,
  adminUpdateTicketStatus,
  getConfig,
  updateConfig,
  getMaintenanceHistory,
  broadcastNotification,
  getBroadcastHistory,
  searchEntities,
  getAdministrators,
  getAllPayouts,
  reconcileManualEscrow,
  updatePayoutStatus,
  togglePropertyPhysicalVerification,
  createAdministrator,
  toggleAdminStatus,
  createLandlord,
  updateLandlordProfile,
  updateLandlordSettlement
} from '../controllers/admin.controller';
import { 
  getAllNotices, 
  createNotice, 
  updateNotice, 
  deleteNotice,
  reorderNotices
} from '../controllers/notice.controller';
import { checkExpirations } from '../controllers/subscription.controller';
import { authenticate, authorizeRole, requireSuperAdmin, requireStepUpAuth } from '../middleware/auth.middleware';

import { 
  getAdminBreachReports, 
  resolveBreachReport, 
  getLandlordDeedAudits, 
  auditLandlordDeed,
  requestAdditionalDeedDocuments,
  attachLandlordDeed
} from '../controllers/adminBreach.controller';

const router = Router();

// Secure all admin routes
router.use(authenticate, authorizeRole(['ADMIN', 'SUPER_ADMIN']));

// System Stats, Telemetry & Operations Queue
router.get('/stats', getSystemStats);
router.get('/action-queue', getActionRequiredQueue);
router.get('/analytics', getPlatformAnalytics);
router.get('/activity', getSystemActivity);
router.get('/audit-logs', getAuditLogs);
router.get('/health-heartbeat', getLiveHealthHeartbeat);
router.get('/webhooks/dlq', getWebhookDLQ);
router.post('/webhooks/dlq/:id/retry', retryWebhookDelivery);
router.get('/search', searchEntities);

// Users (Landlords & Tenants)
router.get('/users', getAllUsers);
router.post('/landlords', createLandlord);
router.put('/landlords/:id', updateLandlordProfile);
router.get('/users/:id', getUserById);
router.put('/users/:id/suspend', toggleUserSuspension);
router.put('/users/:id/lock', toggleUserProfileLock);
router.put('/verify-user/:id', verifyUserCard);
router.put('/verify-landlord/:id', requireStepUpAuth, verifyLandlord);
router.put('/landlords/:id/settlement', requireStepUpAuth, updateLandlordSettlement);

// Breach Disputes & Deed Audits
router.get('/breaches', getAdminBreachReports);
router.get('/disputes/:id', getDisputeById);
router.put('/breaches/:id/resolve', resolveBreachReport);
router.get('/landlord-deeds', getLandlordDeedAudits);
router.put('/landlord-deeds/:id/audit', requireStepUpAuth, auditLandlordDeed);
router.post('/landlord-deeds/:id/request-docs', requestAdditionalDeedDocuments);
router.post('/landlord-deeds/:id/attach', attachLandlordDeed);

// Properties & Moderation
router.get('/properties', getAllProperties);
router.get('/properties/:id', getPropertyById);
router.put('/properties/bulk-status', bulkUpdatePropertyApproval);
router.put('/properties/:id/status', updatePropertyApproval);
router.put('/properties/:id/physical-verification', togglePropertyPhysicalVerification);

// Bookings & Transactions
router.get('/bookings', getAllBookings);
router.get('/bookings/:id', getBookingById);
router.get('/subscriptions', getAllSubscriptions);
router.get('/subscriptions/:id', getSubscriptionById);
router.put('/subscriptions/:id/activate', activateSubscription);
router.put('/subscriptions/:id/revoke', revokeSubscription);
router.get('/transactions', getAllTransactions);
router.get('/transactions/:id', getTransactionById);

// Landlord Payouts & Disbursements
router.get('/payouts', getAllPayouts);
router.post('/payouts/reconcile', requireSuperAdmin, reconcileManualEscrow);
router.put('/payouts/:id/status', requireSuperAdmin, requireStepUpAuth, updatePayoutStatus);

// Reviews & Reputation
router.get('/reviews', getAllReviews);
router.get('/reviews/:id', getReviewById);
router.delete('/reviews/:id', deleteReview);
router.put('/reviews/:id/appeal', resolveAppeal);

// Maintenance Tickets
router.get('/tickets', getAllTickets);
router.get('/tickets/:id', getTicketById);
router.put('/tickets/:id/status', adminUpdateTicketStatus);

// Notices
router.get('/notices', getAllNotices);
router.post('/notices', createNotice);
router.put('/notices/reorder', reorderNotices);
router.put('/notices/:id', updateNotice);
router.delete('/notices/:id', deleteNotice);

// ── SUPER ADMIN GOVERNANCE (STRICT ELEVATED ROLES) ──
router.get('/administrators', requireSuperAdmin, getAdministrators);
router.post('/administrators', requireSuperAdmin, createAdministrator);
router.put('/administrators/:id/status', requireSuperAdmin, toggleAdminStatus);
router.get('/config', getConfig);
router.put('/config', requireSuperAdmin, updateConfig);
router.get('/maintenance/history', getMaintenanceHistory);
router.post('/check-expirations', requireSuperAdmin, checkExpirations);
router.post('/notifications/broadcast', requireSuperAdmin, broadcastNotification);
router.get('/notifications/broadcasts/history', requireSuperAdmin, getBroadcastHistory);

export default router;
