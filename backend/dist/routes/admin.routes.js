"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const notice_controller_1 = require("../controllers/notice.controller");
const subscription_controller_1 = require("../controllers/subscription.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const adminBreach_controller_1 = require("../controllers/adminBreach.controller");
const router = (0, express_1.Router)();
// Secure all admin routes
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['ADMIN']));
// System Stats & Activity
router.get('/stats', admin_controller_1.getSystemStats);
router.get('/analytics', admin_controller_1.getPlatformAnalytics);
router.get('/activity', admin_controller_1.getSystemActivity);
router.get('/audit-logs', admin_controller_1.getAuditLogs);
// Users
router.get('/users', admin_controller_1.getAllUsers);
router.put('/users/:id/suspend', admin_controller_1.toggleUserSuspension);
router.put('/users/:id/lock', admin_controller_1.toggleUserProfileLock);
router.put('/verify-user/:id', admin_controller_1.verifyUserCard);
router.put('/verify-landlord/:id', admin_controller_1.verifyLandlord);
// Breach Disputes & Deed Audits
router.get('/breaches', adminBreach_controller_1.getAdminBreachReports);
router.put('/breaches/:id/resolve', adminBreach_controller_1.resolveBreachReport);
router.get('/landlord-deeds', adminBreach_controller_1.getLandlordDeedAudits);
router.put('/landlord-deeds/:id/audit', adminBreach_controller_1.auditLandlordDeed);
// Properties
router.get('/properties', admin_controller_1.getAllProperties);
router.put('/properties/:id/status', admin_controller_1.updatePropertyApproval);
// Bookings & Transactions
router.get('/bookings', admin_controller_1.getAllBookings);
router.get('/subscriptions', admin_controller_1.getAllSubscriptions);
router.put('/subscriptions/:id/activate', admin_controller_1.activateSubscription);
router.put('/subscriptions/:id/revoke', admin_controller_1.revokeSubscription);
router.get('/reviews', admin_controller_1.getAllReviews);
router.delete('/reviews/:id', admin_controller_1.deleteReview);
router.put('/reviews/:id/appeal', admin_controller_1.resolveAppeal);
// System maintenance & config
router.post('/check-expirations', subscription_controller_1.checkExpirations);
router.get('/config', admin_controller_1.getConfig);
router.put('/config', admin_controller_1.updateConfig);
// Broadcast Notifications
router.post('/notifications/broadcast', admin_controller_1.broadcastNotification);
// Maintenance Tickets
router.get('/tickets', admin_controller_1.getAllTickets);
router.put('/tickets/:id/status', admin_controller_1.adminUpdateTicketStatus);
// Notices
router.get('/notices', notice_controller_1.getAllNotices);
router.post('/notices', notice_controller_1.createNotice);
router.put('/notices/:id', notice_controller_1.updateNotice);
router.delete('/notices/:id', notice_controller_1.deleteNotice);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map