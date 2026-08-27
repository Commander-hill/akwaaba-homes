"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fraud_controller_1 = require("../controllers/fraud.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Only ADMIN can run AI Fraud scans and moderate risk flags
router.get('/scan', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['ADMIN']), fraud_controller_1.scanFraudRisk);
router.post('/resolve', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['ADMIN']), fraud_controller_1.resolveFraudAction);
exports.default = router;
//# sourceMappingURL=fraud.routes.js.map