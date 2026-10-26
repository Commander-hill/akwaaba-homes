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
  getSystemActivity,
  verifyUserCard,
  verifyLandlord,
  activateSubscription,
  revokeSubscription,
  getAllTickets,
  adminUpdateTicketStatus,
  getConfig,
  updateConfig,
  getMaintenanceHistory,
  broadcastNotification,
  getBroadcastHistory,
  searchEntities,
  getAdministrators,
  createAdministrator,
  toggleAdminStatus
} from '../controllers/admin.controller';
import { 
  getAllNotices, 
  createNotice, 
  updateNotice, 
  deleteNotice,
  reorderNotices
} from '../controllers/notice.controller';
import { checkExpirations } from '../controllers/subscription.controller';
import { authenticate, authorizeRole, requireSuperAdmin } from '../middleware/auth.middleware';

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
router.get('/search', searchEntities);

// Users (Landlords & Tenants)
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/suspend', toggleUserSuspension);
router.put('/users/:id/lock', toggleUserProfileLock);
router.put('/verify-user/:id', verifyUserCard);
router.put('/verify-landlord/:id', verifyLandlord);

// Breach Disputes & Deed Audits
router.get('/breaches', getAdminBreachReports);
router.get('/disputes/:id', getDisputeById);
router.put('/breaches/:id/resolve', resolveBreachReport);
router.get('/landlord-deeds', getLandlordDeedAudits);
router.put('/landlord-deeds/:id/audit', auditLandlordDeed);
router.post('/landlord-deeds/:id/request-docs', requestAdditionalDeedDocuments);
router.post('/landlord-deeds/:id/attach', attachLandlordDeed);

// Properties & Moderation
router.get('/properties', getAllProperties);
router.get('/properties/:id', getPropertyById);
router.put('/properties/:id/status', updatePropertyApproval);

// Bookings & Transactions
router.get('/bookings', getAllBookings);
router.get('/bookings/:id', getBookingById);
router.get('/subscriptions', getAllSubscriptions);
router.get('/subscriptions/:id', getSubscriptionById);
router.put('/subscriptions/:id/activate', activateSubscription);
router.put('/subscriptions/:id/revoke', revokeSubscription);
router.get('/transactions', getAllTransactions);
router.get('/transactions/:id', getTransactionById);

// Reviews & Reputation
router.get('/reviews', getAllReviews);
router.get('/reviews/:id', getReviewById);
router.delete('/reviews/:id', deleteReview);
router.put('/reviews/:id/appeal', resolveAppeal);

// Maintenance Tickets
router.get('/tickets', getAllTickets);
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
