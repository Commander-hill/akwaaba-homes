import { Router } from 'express';
import { createOrUpdateInspection, getBookingInspections } from '../controllers/inspection.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/', createOrUpdateInspection);
router.get('/booking/:bookingId', getBookingInspections);

export default router;
