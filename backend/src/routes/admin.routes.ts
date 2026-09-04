import { Router } from 'express';
import { 
  getSystemStats, 
  getPlatformAnalytics,
  getAllUsers, 
  toggleUserSuspension, 
  toggleUserProfileLock,
  getAllProperties, 
  updatePropertyApproval, 
  getAllBookings, 
  getAllSubscriptions,
  getAllTransactions,
  getAllReviews,
  deleteReview,
  resolveAppeal,
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
  broadcastNotification
} from '../controllers/admin.controller';
import { 
  getAllNotices, 
  createNotice, 
  updateNotice, 
  deleteNotice 
} from '../controllers/notice.controller';
import { checkExpirations } from '../controllers/subscription.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

import { 
  getAdminBreachReports, 
  resolveBreachReport, 
  getLandlordDeedAudits, 
  auditLandlordDeed 
} from '../controllers/adminBreach.controller';

const router = Router();

// Secure all admin routes
router.use(authenticate, authorizeRole(['ADMIN']));

// System Stats & Activity
router.get('/stats', getSystemStats);
router.get('/analytics', getPlatformAnalytics);
router.get('/activity', getSystemActivity);
router.get('/audit-logs', getAuditLogs);

// Users
router.get('/users', getAllUsers);
router.put('/users/:id/suspend', toggleUserSuspension);
router.put('/users/:id/lock', toggleUserProfileLock);
router.put('/verify-user/:id', verifyUserCard);
router.put('/verify-landlord/:id', verifyLandlord);

// Breach Disputes & Deed Audits
router.get('/breaches', getAdminBreachReports);
router.put('/breaches/:id/resolve', resolveBreachReport);
router.get('/landlord-deeds', getLandlordDeedAudits);
router.put('/landlord-deeds/:id/audit', auditLandlordDeed);

// Properties
router.get('/properties', getAllProperties);
router.put('/properties/:id/status', updatePropertyApproval);

// Bookings & Transactions
router.get('/bookings', getAllBookings);
router.get('/subscriptions', getAllSubscriptions);
router.get('/transactions', getAllTransactions);
router.put('/subscriptions/:id/activate', activateSubscription);
router.put('/subscriptions/:id/revoke', revokeSubscription);
router.get('/reviews', getAllReviews);
router.delete('/reviews/:id', deleteReview);
router.put('/reviews/:id/appeal', resolveAppeal);

// System maintenance & config
router.post('/check-expirations', checkExpirations);
router.get('/config', getConfig);
router.put('/config', updateConfig);

// Broadcast Notifications
router.post('/notifications/broadcast', broadcastNotification);

// Maintenance Tickets
router.get('/tickets', getAllTickets);
router.put('/tickets/:id/status', adminUpdateTicketStatus);

// Notices
router.get('/notices', getAllNotices);
router.post('/notices', createNotice);
router.put('/notices/:id', updateNotice);
router.delete('/notices/:id', deleteNotice);

export default router;
