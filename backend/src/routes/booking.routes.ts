import { Router } from 'express';
import { 
  createBooking, 
  getTenantBookings, 
  getLandlordBookings, 
  updateBookingStatus, 
  payBooking, 
  verifyPayment,
  getMyActiveBooking,
  cancelPendingBooking
} from '../controllers/booking.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Tenant routes
router.get('/my-active', authenticate, authorizeRole(['TENANT', 'ADMIN']), getMyActiveBooking);
router.post('/', authenticate, authorizeRole(['TENANT', 'ADMIN']), createBooking);
router.get('/me', authenticate, authorizeRole(['TENANT', 'ADMIN']), getTenantBookings);
router.post('/:id/pay', authenticate, authorizeRole(['TENANT']), payBooking);
router.post('/:id/verify-payment', authenticate, authorizeRole(['TENANT']), verifyPayment);
router.post('/:id/cancel', authenticate, authorizeRole(['TENANT', 'ADMIN']), cancelPendingBooking);

// Landlord routes
router.get('/landlord', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), getLandlordBookings);
router.put('/:id/status', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), updateBookingStatus);

export default router;
