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
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['ADMIN', 'SUPER_ADMIN']));
// System Stats, Telemetry & Operations Queue
router.get('/stats', admin_controller_1.getSystemStats);
router.get('/action-queue', admin_controller_1.getActionRequiredQueue);
router.get('/analytics', admin_controller_1.getPlatformAnalytics);
router.get('/activity', admin_controller_1.getSystemActivity);
router.get('/audit-logs', admin_controller_1.getAuditLogs);
router.get('/search', admin_controller_1.searchEntities);
// Users (Landlords & Tenants)
router.get('/users', admin_controller_1.getAllUsers);
router.get('/users/:id', admin_controller_1.getUserById);
router.put('/users/:id/suspend', admin_controller_1.toggleUserSuspension);
router.put('/users/:id/lock', admin_controller_1.toggleUserProfileLock);
router.put('/verify-user/:id', admin_controller_1.verifyUserCard);
router.put('/verify-landlord/:id', admin_controller_1.verifyLandlord);
// Breach Disputes & Deed Audits
router.get('/breaches', adminBreach_controller_1.getAdminBreachReports);
router.get('/disputes/:id', admin_controller_1.getDisputeById);
router.put('/breaches/:id/resolve', adminBreach_controller_1.resolveBreachReport);
router.get('/landlord-deeds', adminBreach_controller_1.getLandlordDeedAudits);
router.put('/landlord-deeds/:id/audit', adminBreach_controller_1.auditLandlordDeed);
router.post('/landlord-deeds/:id/request-docs', adminBreach_controller_1.requestAdditionalDeedDocuments);
router.post('/landlord-deeds/:id/attach', adminBreach_controller_1.attachLandlordDeed);
// Properties & Moderation
router.get('/properties', admin_controller_1.getAllProperties);
router.get('/properties/:id', admin_controller_1.getPropertyById);
router.put('/properties/:id/status', admin_controller_1.updatePropertyApproval);
// Bookings & Transactions
router.get('/bookings', admin_controller_1.getAllBookings);
router.get('/bookings/:id', admin_controller_1.getBookingById);
router.get('/subscriptions', admin_controller_1.getAllSubscriptions);
router.get('/subscriptions/:id', admin_controller_1.getSubscriptionById);
router.put('/subscriptions/:id/activate', admin_controller_1.activateSubscription);
router.put('/subscriptions/:id/revoke', admin_controller_1.revokeSubscription);
router.get('/transactions', admin_controller_1.getAllTransactions);
router.get('/transactions/:id', admin_controller_1.getTransactionById);
// Reviews & Reputation
router.get('/reviews', admin_controller_1.getAllReviews);
router.get('/reviews/:id', admin_controller_1.getReviewById);
router.delete('/reviews/:id', admin_controller_1.deleteReview);
router.put('/reviews/:id/appeal', admin_controller_1.resolveAppeal);
// Maintenance Tickets
router.get('/tickets', admin_controller_1.getAllTickets);
router.put('/tickets/:id/status', admin_controller_1.adminUpdateTicketStatus);
// Notices
router.get('/notices', notice_controller_1.getAllNotices);
router.post('/notices', notice_controller_1.createNotice);
router.put('/notices/reorder', notice_controller_1.reorderNotices);
router.put('/notices/:id', notice_controller_1.updateNotice);
router.delete('/notices/:id', notice_controller_1.deleteNotice);
// ── SUPER ADMIN GOVERNANCE (STRICT ELEVATED ROLES) ──
router.get('/administrators', auth_middleware_1.requireSuperAdmin, admin_controller_1.getAdministrators);
router.post('/administrators', auth_middleware_1.requireSuperAdmin, admin_controller_1.createAdministrator);
router.put('/administrators/:id/status', auth_middleware_1.requireSuperAdmin, admin_controller_1.toggleAdminStatus);
router.get('/config', admin_controller_1.getConfig);
router.put('/config', auth_middleware_1.requireSuperAdmin, admin_controller_1.updateConfig);
router.get('/maintenance/history', admin_controller_1.getMaintenanceHistory);
router.post('/check-expirations', auth_middleware_1.requireSuperAdmin, subscription_controller_1.checkExpirations);
router.post('/notifications/broadcast', auth_middleware_1.requireSuperAdmin, admin_controller_1.broadcastNotification);
router.get('/notifications/broadcasts/history', auth_middleware_1.requireSuperAdmin, admin_controller_1.getBroadcastHistory);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map