"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inspection_controller_1 = require("../controllers/inspection.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', inspection_controller_1.createOrUpdateInspection);
router.get('/booking/:bookingId', inspection_controller_1.getBookingInspections);
// Property Master Asset Vault routes
router.get('/property/:propertyId/inventory', inspection_controller_1.getPropertyInventory);
router.post('/property/:propertyId/inventory', inspection_controller_1.savePropertyInventory);
// Property Utility Sub-Meter Readings routes
router.get('/property/:propertyId/meters', inspection_controller_1.getPropertyMeterReadings);
router.post('/property/:propertyId/meters', inspection_controller_1.savePropertyMeterReading);
exports.default = router;
//# sourceMappingURL=inspection.routes.js.map