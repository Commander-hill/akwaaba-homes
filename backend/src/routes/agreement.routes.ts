import { Router } from 'express';
import { getAgreementByBooking, signAgreement } from '../controllers/agreement.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/booking/:bookingId', getAgreementByBooking);
router.post('/booking/:bookingId/sign', signAgreement);

export default router;
