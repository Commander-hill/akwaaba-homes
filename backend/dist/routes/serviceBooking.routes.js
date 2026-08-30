"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const serviceBooking_controller_1 = require("../controllers/serviceBooking.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.post('/', serviceBooking_controller_1.createServiceBooking);
router.get('/', serviceBooking_controller_1.getTenantServiceBookings);
router.patch('/:id/cancel', serviceBooking_controller_1.cancelServiceBooking);
exports.default = router;
//# sourceMappingURL=serviceBooking.routes.js.map