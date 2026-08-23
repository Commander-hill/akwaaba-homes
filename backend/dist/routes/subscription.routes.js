"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const subscription_controller_1 = require("../controllers/subscription.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public webhook route (Protected via Paystack HMAC SHA512 signature check)
router.post('/webhook', subscription_controller_1.handlePaystackWebhook);
// Only landlords can access protected subscription routes
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorizeRole)(['LANDLORD']));
router.get('/status', subscription_controller_1.getSubscriptionStatus);
router.get('/overview', subscription_controller_1.getLandlordSubscriptionsOverview);
router.post('/initialize', subscription_controller_1.initializePayment);
router.post('/verify', subscription_controller_1.verifyPayment);
exports.default = router;
//# sourceMappingURL=subscription.routes.js.map