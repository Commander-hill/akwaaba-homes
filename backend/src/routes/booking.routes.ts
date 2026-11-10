import { Router } from 'express';
import { 
  createBooking, 
  getTenantBookings, 
  getBookingById,
  getLandlordBookings, 
  updateBookingStatus, 
  payBooking, 
  verifyPayment,
  getMyActiveBooking,
  cancelPendingBooking,
  downloadAgreementPDF,
  deleteBooking
} from '../controllers/booking.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Static collection routes first (auto-routes Landlords vs Tenants so /bookings/me never 403s)
router.get('/my-active', authenticate, (req, res) => {
  if (req.user?.role === 'LANDLORD') {
    return getLandlordBookings(req, res);
  }
  return getMyActiveBooking(req, res);
});
router.get('/me', authenticate, (req, res) => {
  if (req.user?.role === 'LANDLORD') {
    return getLandlordBookings(req, res);
  }
  return getTenantBookings(req, res);
});
router.get('/my-bookings', authenticate, (req, res) => {
  if (req.user?.role === 'LANDLORD') {
    return getLandlordBookings(req, res);
  }
  return getTenantBookings(req, res);
});
router.get('/landlord', authenticate, authorizeRole(['LANDLORD', 'ADMIN']), getLandlordBookings);
router.post('/', authenticate, authorizeRole(['TENANT', 'ADMIN']), createBooking);

// Parameterized routes
router.get('/:id/pdf', authenticate, downloadAgreementPDF);
router.get('/:id', authenticate, authorizeRole(['TENANT', 'LANDLORD', 'CARETAKER', 'STAFF', 'ADMIN']), getBookingById);
router.post('/:id/pay', authenticate, authorizeRole(['TENANT', 'ADMIN']), payBooking);
router.post('/:id/verify-payment', authenticate, authorizeRole(['TENANT', 'ADMIN']), verifyPayment);
router.post('/:id/cancel', authenticate, authorizeRole(['TENANT', 'ADMIN']), cancelPendingBooking);
router.delete('/:id', authenticate, authorizeRole(['TENANT', 'ADMIN']), deleteBooking);
router.put('/:id/status', authenticate, authorizeRole(['LANDLORD', 'CARETAKER', 'STAFF', 'ADMIN']), updateBookingStatus);

export default router;
