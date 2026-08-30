"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const delivery_controller_1 = require("../controllers/delivery.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', delivery_controller_1.logPackageDelivery);
router.get('/', delivery_controller_1.getTenantDeliveries);
router.patch('/:id/collect', delivery_controller_1.confirmParcelPickup);
exports.default = router;
//# sourceMappingURL=delivery.routes.js.map