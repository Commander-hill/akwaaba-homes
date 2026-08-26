import { Router } from 'express';
import { authenticate, authorizeRole } from '../middleware/auth.middleware';
import { 
  getLandlordCashflows, 
  getTransactionById, 
  getTenantTransactions, 
  getLandlordEarningsReport,
  handlePaystackWebhook
} from '../controllers/transaction.controller';

const router = Router();

// Unauthenticated public route (verified via HMAC SHA512 signature header)
router.post('/webhook', handlePaystackWebhook);

router.get('/tenant', authenticate, getTenantTransactions);
router.get('/landlord', authenticate, authorizeRole(['LANDLORD']), getLandlordCashflows);
router.get('/landlord/report', authenticate, authorizeRole(['LANDLORD']), getLandlordEarningsReport);
router.get('/:id', authenticate, getTransactionById);

export default router;
