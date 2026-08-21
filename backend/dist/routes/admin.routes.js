"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const notice_controller_1 = require("../controllers/notice.controller");
const subscription_controller_1 = require("../controllers/subscription.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Secure all admin routes
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['ADMIN']));
// System Stats & Activity
router.get('/stats', admin_controller_1.getSystemStats);
router.get('/activity', admin_controller_1.getSystemActivity);
router.get('/audit-logs', admin_controller_1.getAuditLogs);
// Users
router.get('/users', admin_controller_1.getAllUsers);
router.put('/users/:id/suspend', admin_controller_1.toggleUserSuspension);
router.put('/verify-user/:id', admin_controller_1.verifyUserCard);
// Properties
router.get('/properties', admin_controller_1.getAllProperties);
router.put('/properties/:id/status', admin_controller_1.updatePropertyApproval);
// Bookings & Transactions
router.get('/bookings', admin_controller_1.getAllBookings);
router.get('/subscriptions', admin_controller_1.getAllSubscriptions);
router.put('/subscriptions/:id/activate', admin_controller_1.activateSubscription);
router.get('/reviews', admin_controller_1.getAllReviews);
router.delete('/reviews/:id', admin_controller_1.deleteReview);
router.put('/reviews/:id/appeal', admin_controller_1.resolveAppeal);
// System maintenance
router.post('/check-expirations', subscription_controller_1.checkExpirations);
// Notices
router.get('/notices', notice_controller_1.getAllNotices);
router.post('/notices', notice_controller_1.createNotice);
router.put('/notices/:id', notice_controller_1.updateNotice);
router.delete('/notices/:id', notice_controller_1.deleteNotice);
exports.default = router;
//# sourceMappingURL=admin.routes.js.map