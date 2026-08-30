"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const visitorPass_controller_1 = require("../controllers/visitorPass.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', visitorPass_controller_1.createVisitorPass);
router.get('/', visitorPass_controller_1.getTenantVisitorPasses);
router.patch('/:id/revoke', visitorPass_controller_1.revokeVisitorPass);
router.post('/verify', visitorPass_controller_1.verifyGatePass);
exports.default = router;
//# sourceMappingURL=visitorPass.routes.js.map