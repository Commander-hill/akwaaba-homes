import { Router } from 'express';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { requestPayout, requestPayoutOTP, getPayoutHistory, handleTransferWebhook, verifyMoMoAccountName } from '../controllers/payout.controller';

const router = Router();

// Public webhook — Paystack posts signed events here for transfer.success / transfer.failed
router.post('/webhook', handleTransferWebhook);

// Landlord-only routes
router.post('/otp', authenticate, authorizeRole(['LANDLORD']), requestPayoutOTP);
router.post('/request', authenticate, authorizeRole(['LANDLORD']), requestPayout);
router.post('/verify-account', authenticate, authorizeRole(['LANDLORD']), verifyMoMoAccountName);
router.get('/history', authenticate, authorizeRole(['LANDLORD']), getPayoutHistory);

export default router;
