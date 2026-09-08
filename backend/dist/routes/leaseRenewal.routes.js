"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const leaseRenewal_controller_1 = require("../controllers/leaseRenewal.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', leaseRenewal_controller_1.requestLeaseRenewal);
router.get('/', leaseRenewal_controller_1.getTenantRenewals);
router.get('/landlord/mine', leaseRenewal_controller_1.getLandlordRenewals);
router.patch('/:id/respond', leaseRenewal_controller_1.respondLeaseRenewal);
exports.default = router;
//# sourceMappingURL=leaseRenewal.routes.js.map