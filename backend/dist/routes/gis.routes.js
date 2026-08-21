"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gis_controller_1 = require("../controllers/gis.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Get commute information for a specific property relative to the tenant's campus
router.get('/commute/:propertyId', gis_controller_1.getCommuteInfo);
exports.default = router;
//# sourceMappingURL=gis.routes.js.map