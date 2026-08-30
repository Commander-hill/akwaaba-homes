import { Router } from 'express';
import { createServiceBooking, getTenantServiceBookings, cancelServiceBooking } from '../controllers/serviceBooking.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', createServiceBooking);
router.get('/', getTenantServiceBookings);
router.patch('/:id/cancel', cancelServiceBooking);

export default router;
