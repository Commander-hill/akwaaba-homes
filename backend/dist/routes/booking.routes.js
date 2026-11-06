"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const booking_controller_1 = require("../controllers/booking.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Static collection routes first
router.get('/my-active', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['TENANT', 'ADMIN']), booking_controller_1.getMyActiveBooking);
router.get('/me', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['TENANT', 'ADMIN']), booking_controller_1.getTenantBookings);
router.get('/my-bookings', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['TENANT', 'ADMIN']), booking_controller_1.getTenantBookings);
router.get('/landlord', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD', 'ADMIN']), booking_controller_1.getLandlordBookings);
router.post('/', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['TENANT', 'ADMIN']), booking_controller_1.createBooking);
// Parameterized routes
router.get('/:id/pdf', auth_middleware_1.authenticate, booking_controller_1.downloadAgreementPDF);
router.get('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['TENANT', 'LANDLORD', 'CARETAKER', 'STAFF', 'ADMIN']), booking_controller_1.getBookingById);
router.post('/:id/pay', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['TENANT', 'ADMIN']), booking_controller_1.payBooking);
router.post('/:id/verify-payment', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['TENANT', 'ADMIN']), booking_controller_1.verifyPayment);
router.post('/:id/cancel', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['TENANT', 'ADMIN']), booking_controller_1.cancelPendingBooking);
router.delete('/:id', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['TENANT', 'ADMIN']), booking_controller_1.deleteBooking);
router.put('/:id/status', auth_middleware_1.authenticate, (0, auth_middleware_1.authorizeRole)(['LANDLORD', 'CARETAKER', 'STAFF', 'ADMIN']), booking_controller_1.updateBookingStatus);
exports.default = router;
//# sourceMappingURL=booking.routes.js.map