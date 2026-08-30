"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vehicle_controller_1 = require("../controllers/vehicle.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', vehicle_controller_1.registerVehicle);
router.get('/', vehicle_controller_1.getTenantVehicles);
router.delete('/:id', vehicle_controller_1.deleteVehicle);
exports.default = router;
//# sourceMappingURL=vehicle.routes.js.map