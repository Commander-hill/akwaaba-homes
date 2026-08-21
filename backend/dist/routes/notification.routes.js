"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_1 = require("../controllers/notification.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// User routes
router.get('/', notification_controller_1.getMyNotifications);
router.put('/:id/read', notification_controller_1.markAsRead);
router.put('/read-all/all', notification_controller_1.markAllAsRead);
// Admin-only broadcast
router.post('/broadcast', (0, auth_middleware_1.authorizeRole)(['ADMIN']), notification_controller_1.broadcastAnnouncement);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map