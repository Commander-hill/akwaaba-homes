"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const payout_controller_1 = require("../controllers/payout.controller");
const router = (0, express_1.Router)();
// Public webhook — Paystack posts signed events here for transfer.success / transfer.failed
router.post('/webhook', payout_controller_1.handleTransferWebhook);
// Landlord-only routes
router.post('/request', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD']), payout_controller_1.requestPayout);
router.get('/history', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD']), payout_controller_1.getPayoutHistory);
exports.default = router;
//# sourceMappingURL=payout.routes.js.map