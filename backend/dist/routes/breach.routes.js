"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const breach_controller_1 = require("../controllers/breach.controller");
const router = (0, express_1.Router)();
// Landlords can report breaches
router.post('/report', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD']), breach_controller_1.reportBreach);
// Landlords can view their reported breaches, Tenants can view their own breaches
router.get('/', auth_middleware_1.authenticate, breach_controller_1.getBreachReports);
// Admins can verify/reject breaches
router.post('/:id/verify', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['ADMIN']), breach_controller_1.verifyBreach);
exports.default = router;
//# sourceMappingURL=breach.routes.js.map