import { Router } from 'express';
import { getSubscriptionStatus, verifyPayment, initializePayment } from '../controllers/subscription.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Only landlords can access subscription routes
router.use(authenticate);
router.use(authorizeRole(['LANDLORD']));

router.get('/status', getSubscriptionStatus);
router.post('/initialize', initializePayment);
router.post('/verify', verifyPayment);

export default router;
