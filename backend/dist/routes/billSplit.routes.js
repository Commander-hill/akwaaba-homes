"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const billSplit_controller_1 = require("../controllers/billSplit.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', billSplit_controller_1.createBillSplit);
router.get('/', billSplit_controller_1.getTenantBillSplits);
router.patch('/participants/:participantId/status', billSplit_controller_1.toggleParticipantPaidStatus);
exports.default = router;
//# sourceMappingURL=billSplit.routes.js.map