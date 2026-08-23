import { Router } from 'express';
import { 
  getSystemStats, 
  getAllUsers, 
  toggleUserSuspension, 
  getAllProperties, 
  updatePropertyApproval, 
  getAllBookings, 
  getAllSubscriptions,
  getAllReviews,
  deleteReview,
  resolveAppeal,
  getAuditLogs,
  getSystemActivity,
  verifyUserCard,
  activateSubscription,
  revokeSubscription
} from '../controllers/admin.controller';
import { 
  getAllNotices, 
  createNotice, 
  updateNotice, 
  deleteNotice 
} from '../controllers/notice.controller';
import { checkExpirations } from '../controllers/subscription.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Secure all admin routes
router.use(authenticate, authorizeRole(['ADMIN']));

// System Stats & Activity
router.get('/stats', getSystemStats);
router.get('/activity', getSystemActivity);
router.get('/audit-logs', getAuditLogs);

// Users
router.get('/users', getAllUsers);
router.put('/users/:id/suspend', toggleUserSuspension);
router.put('/verify-user/:id', verifyUserCard);

// Properties
router.get('/properties', getAllProperties);
router.put('/properties/:id/status', updatePropertyApproval);

// Bookings & Transactions
router.get('/bookings', getAllBookings);
router.get('/subscriptions', getAllSubscriptions);
router.put('/subscriptions/:id/activate', activateSubscription);
router.put('/subscriptions/:id/revoke', revokeSubscription);
router.get('/reviews', getAllReviews);
router.delete('/reviews/:id', deleteReview);
router.put('/reviews/:id/appeal', resolveAppeal);

// System maintenance
router.post('/check-expirations', checkExpirations);

// Notices
router.get('/notices', getAllNotices);
router.post('/notices', createNotice);
router.put('/notices/:id', updateNotice);
router.delete('/notices/:id', deleteNotice);

export default router;
