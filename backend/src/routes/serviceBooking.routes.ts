import { Router } from 'express';
import { 
  createServiceBooking, 
  getTenantServiceBookings, 
  cancelServiceBooking,
  getPropertyServiceBookings,
  updateServiceBookingStatus 
} from '../controllers/serviceBooking.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', createServiceBooking);
router.get('/', getTenantServiceBookings);
router.get('/property', getPropertyServiceBookings);
router.get('/landlord', getPropertyServiceBookings);
router.get('/property/:propertyId', getPropertyServiceBookings);
router.patch('/:id/status', updateServiceBookingStatus);
router.patch('/:id/cancel', cancelServiceBooking);

export default router;
