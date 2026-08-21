"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const agreement_controller_1 = require("../controllers/agreement.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/booking/:bookingId', agreement_controller_1.getAgreementByBooking);
router.post('/booking/:bookingId/sign', agreement_controller_1.signAgreement);
exports.default = router;
//# sourceMappingURL=agreement.routes.js.map