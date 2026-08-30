"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const occupancy_controller_1 = require("../controllers/occupancy.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/property/:propertyId', occupancy_controller_1.getPropertyOccupancyMatrix);
router.patch('/beds/:bedId/status', occupancy_controller_1.updateBedStatus);
exports.default = router;
//# sourceMappingURL=occupancy.routes.js.map