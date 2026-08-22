import { Router } from 'express';
import { createBooking, getTenantBookings, getLandlordBookings, updateBookingStatus, payBooking } from '../controllers/booking.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Tenant routes
router.post('/', authenticate, authorizeRole(['TENANT', 'ADMIN']), createBooking);
router.get('/me', authenticate, authorizeRole(['TENANT', 'ADMIN']), getTenantBookings);
router.post('/:id/pay', authenticate, authorizeRole(['TENANT']), payBooking);

// Landlord routes
router.get('/landlord', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), getLandlordBookings);
router.put('/:id/status', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), updateBookingStatus);

export default router;
