import { Router } from 'express';
import { getSubscriptionStatus, verifyPayment, initializePayment, handlePaystackWebhook, getLandlordSubscriptionsOverview } from '../controllers/subscription.controller';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';

const router = Router();

// Public webhook route (Protected via Paystack HMAC SHA512 signature check)
router.post('/webhook', handlePaystackWebhook);

// Only landlords can access protected subscription routes
router.use(authenticate);
router.use(authorizeRole(['LANDLORD']));

router.get('/status', getSubscriptionStatus);
router.get('/overview', getLandlordSubscriptionsOverview);
router.post('/initialize', initializePayment);
router.post('/verify', verifyPayment);

export default router;
