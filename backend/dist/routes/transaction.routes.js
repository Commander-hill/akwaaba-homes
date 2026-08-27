"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const transaction_controller_1 = require("../controllers/transaction.controller");
const router = (0, express_1.Router)();
// Unauthenticated public route (verified via HMAC SHA512 signature header)
router.post('/webhook', transaction_controller_1.handlePaystackWebhook);
router.get('/tenant', auth_middleware_1.authenticate, transaction_controller_1.getTenantTransactions);
router.get('/landlord', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD']), transaction_controller_1.getLandlordCashflows);
router.get('/landlord/report', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD']), transaction_controller_1.getLandlordEarningsReport);
router.get('/:id', auth_middleware_1.authenticate, transaction_controller_1.getTransactionById);
exports.default = router;
//# sourceMappingURL=transaction.routes.js.map