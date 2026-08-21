"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const booking_controller_1 = require("../controllers/booking.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Tenant routes
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['TENANT', 'ADMIN']), booking_controller_1.createBooking);
router.get('/me', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['TENANT', 'ADMIN']), booking_controller_1.getTenantBookings);
// Landlord routes
router.get('/landlord', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD', 'ADMIN']), booking_controller_1.getLandlordBookings);
router.put('/:id/status', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD', 'ADMIN']), booking_controller_1.updateBookingStatus);
exports.default = router;
//# sourceMappingURL=booking.routes.js.map